-- 0016: perbaikan hasil audit repo (22 Nov 2026). Aman dijalankan ulang.
-- Jalankan di SQL Editor Supabase setelah 0015.
-- Isi: (1) indeks, (2) pesanan dengan bukti bayar tidak lagi mengunci stok selamanya,
-- (3) pesanan dikirim selesai otomatis dan pembeli bisa konfirmasi diterima,
-- (4) urutan kunci produk di buat_pesanan (cegah deadlock), (5) voucher persen tidak overflow.

-- 1. Indeks untuk beranda, daftar pesanan, view produk_terjual, dan penjadwalan
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_buyer_status_idx on public.orders(buyer_id, status);
create index if not exists orders_seller_created_idx on public.orders(seller_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at);

-- 2. Pesanan 'baru' yang sudah ada bukti bayar tetapi tidak dikonfirmasi penjual
--    ikut dibatalkan setelah 3x batas p_jam (24 jam jadi 72 jam). Stok ikut kembali lewat trigger.
--    Ubah pengali 3 di bawah jika penjual biasanya butuh waktu lebih lama.
create or replace function public.batalkan_pesanan_kedaluwarsa(p_jam int default 24)
returns int language plpgsql security definer set search_path = public as $$
declare n_tanpa int; n_bukti int;
begin
  update orders set status = 'batal'
    where status = 'baru' and bukti_path is null and created_at < now() - make_interval(hours => p_jam);
  get diagnostics n_tanpa = row_count;
  update orders set status = 'batal'
    where status = 'baru' and bukti_path is not null and created_at < now() - make_interval(hours => p_jam * 3);
  get diagnostics n_bukti = row_count;
  if n_bukti > 0 then
    perform kirim_telegram(concat('Dibatalkan otomatis: ', n_bukti, ' pesanan yang sudah ada bukti bayar tetapi belum dikonfirmasi lebih dari ', p_jam * 3, ' jam.'));
  end if;
  return n_tanpa + n_bukti;
end $$;
revoke all on function public.batalkan_pesanan_kedaluwarsa(int) from public, anon, authenticated;

-- 3. Pesanan dikirim: catat waktunya, selesai otomatis setelah 7 hari, atau pembeli konfirmasi diterima
alter table public.orders add column if not exists dikirim_at timestamptz;
update public.orders set dikirim_at = now() where status = 'dikirim' and dikirim_at is null;

create or replace function public.catat_dikirim() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'dikirim' and old.status is distinct from 'dikirim' then
    new.dikirim_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.catat_dikirim() from public, anon, authenticated;
drop trigger if exists orders_catat_dikirim on public.orders;
create trigger orders_catat_dikirim before update of status on public.orders
  for each row execute function public.catat_dikirim();

create or replace function public.selesaikan_pesanan_otomatis(p_hari int default 7)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update orders set status = 'selesai'
    where status = 'dikirim' and dikirim_at is not null and dikirim_at < now() - make_interval(days => p_hari);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.selesaikan_pesanan_otomatis(int) from public, anon, authenticated;

create or replace function public.konfirmasi_diterima(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'selesai'
    where id = p_order and buyer_id = auth.uid() and status = 'dikirim';
  if not found then raise exception 'Pesanan belum bisa dikonfirmasi diterima'; end if;
end $$;
revoke all on function public.konfirmasi_diterima(uuid) from public, anon;
grant execute on function public.konfirmasi_diterima(uuid) to authenticated;

-- Jadwal tiap jam (butuh extension pg_cron, sudah dipakai untuk pembatalan kedaluwarsa)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('selesai-otomatis', '15 * * * *', 'select public.selesaikan_pesanan_otomatis(7)');
  else
    raise notice 'pg_cron belum aktif: jadwalkan sendiri select public.selesaikan_pesanan_otomatis(7)';
  end if;
end $$;

-- 4. buat_pesanan: kunci baris produk selalu dalam urutan yang sama (cegah deadlock antar pesanan bersamaan).
--    Ditambal lewat definisi yang sedang aktif di database supaya perubahan lain (mis. 0015b) tidak hilang.
do $$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);
  d2 := replace(d, 'for it in select * from jsonb_array_elements(p_items) loop',
    'for it in select e from jsonb_array_elements(p_items) as e order by e->>''id'', coalesce(e->>''v'','''') loop');
  if d2 <> d then
    execute d2;
  else
    raise notice 'buat_pesanan: baris loop tidak ditemukan atau sudah ditambal, dilewati';
  end if;
exception when others then
  raise notice 'Patch buat_pesanan dilewati: %', sqlerrm;
end $$;

-- 5. Voucher persen: hitung dengan bigint agar subtotal besar tidak overflow int
do $$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.cek_voucher(text,int)'::regprocedure);
  d2 := replace(d, 'p_subtotal * v.nilai / 100', '(p_subtotal::bigint * v.nilai / 100)::int');
  if d2 <> d then
    execute d2;
  else
    raise notice 'cek_voucher: rumus tidak ditemukan atau sudah ditambal, dilewati';
  end if;
exception when others then
  raise notice 'Patch cek_voucher dilewati: %', sqlerrm;
end $$;
