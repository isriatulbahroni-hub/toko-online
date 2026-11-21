-- 0005: ongkir per wilayah, bukti bayar, resi, alur status, info rekening dan kebijakan.
-- Jalankan di SQL Editor Supabase setelah 0004.

-- 1. Info pembayaran dan kebijakan toko (tampil ke pembeli)
alter table sellers add column if not exists rekening text not null default '' check (char_length(rekening) <= 300);
alter table sellers add column if not exists kebijakan text not null default '' check (char_length(kebijakan) <= 3000);
grant update (name, wa, rekening, kebijakan) on sellers to authenticated;

-- 2. Tarif ongkir per wilayah (dibaca publik, dikelola penjual)
create table if not exists ongkir (
  id uuid primary key default gen_random_uuid(),
  wilayah text not null unique check (char_length(wilayah) between 2 and 80),
  tarif int not null check (tarif >= 0),
  urut int not null default 0
);
alter table ongkir enable row level security;
create policy ongkir_publik on ongkir for select to anon, authenticated using (true);
create policy ongkir_penjual on ongkir for all to authenticated
  using (exists (select 1 from sellers where owner_id = auth.uid()))
  with check (exists (select 1 from sellers where owner_id = auth.uid()));
revoke insert, update, delete on ongkir from anon;

-- 3. Kolom pesanan: ongkir, tujuan, kurir, resi, bukti bayar
alter table orders add column if not exists ongkir int not null default 0;
alter table orders add column if not exists wilayah text;
alter table orders add column if not exists kurir text;
alter table orders add column if not exists resi text;
alter table orders add column if not exists bukti_path text;
alter table orders drop constraint if exists kurir_resi_valid;
alter table orders add constraint kurir_resi_valid check (
  (kurir is null or char_length(kurir) <= 40) and (resi is null or char_length(resi) <= 60));
grant update (status, kurir, resi) on orders to authenticated;

-- 4. Alur status yang diizinkan + stok kembali saat batal
create or replace function public.kembalikan_stok()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and (old.status, new.status) not in (
    ('baru','dibayar'), ('baru','batal'), ('dibayar','dikirim'), ('dibayar','batal'), ('dikirim','selesai')
  ) then
    raise exception 'Perubahan status % ke % tidak diizinkan', old.status, new.status;
  end if;
  if new.status = 'batal' and old.status <> 'batal' then
    update products p set stock = p.stock + i.qty
      from order_items i where i.order_id = new.id and i.product_id = p.id;
  end if;
  return new;
end $$;

-- 5. buat_pesanan dengan ongkir (dihitung di server dari tabel ongkir)
drop function if exists public.buat_pesanan(text, text, text, jsonb);
create or replace function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb, p_ongkir uuid default null)
returns table(order_id uuid, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid; v_order uuid; v_total int := 0; it jsonb; pr products%rowtype; v_qty int;
  v_ongkir int := 0; v_wilayah text;
begin
  if v_user is null then raise exception 'Masuk dulu untuk membeli'; end if;
  p_nama := trim(coalesce(p_nama, '')); p_telp := trim(coalesce(p_telp, '')); p_alamat := trim(coalesce(p_alamat, ''));
  if p_nama = '' or char_length(p_nama) > 100 then raise exception 'Nama wajib diisi (maks. 100 huruf)'; end if;
  if p_telp !~ '^[0-9+ -]{8,20}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if char_length(p_alamat) < 10 or char_length(p_alamat) > 500 then raise exception 'Alamat 10 sampai 500 huruf'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Terlalu banyak jenis produk dalam satu pesanan'; end if;
  if (select count(*) from orders where buyer_id = v_user and status = 'baru') >= 3 then
    raise exception 'Selesaikan dulu pesanan yang belum dibayar (maksimal 3)';
  end if;
  if exists (select 1 from ongkir) then
    if p_ongkir is null then raise exception 'Pilih tujuan pengiriman'; end if;
    select o.tarif, o.wilayah into v_ongkir, v_wilayah from ongkir o where o.id = p_ongkir;
    if not found then raise exception 'Tujuan pengiriman tidak valid'; end if;
  end if;
  select p.seller_id into v_seller from products p
    join sellers s on s.id = p.seller_id and s.is_active
    where p.id = ((p_items->0)->>'id')::uuid and p.is_active;
  if v_seller is null then raise exception 'Produk tidak tersedia'; end if;
  insert into orders(seller_id, buyer_id, buyer_name, buyer_phone, address, ongkir, wilayah)
    values (v_seller, v_user, p_nama, p_telp, p_alamat, v_ongkir, v_wilayah) returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Jumlah tidak valid'; end if;
    select * into pr from products where id = (it->>'id')::uuid and is_active and seller_id = v_seller for update;
    if not found then raise exception 'Produk tidak tersedia'; end if;
    if pr.stock < v_qty then raise exception 'Stok % tidak cukup', pr.name; end if;
    update products set stock = stock - v_qty where id = pr.id;
    insert into order_items(order_id, product_id, name, price, qty) values (v_order, pr.id, pr.name, pr.price, v_qty);
    v_total := v_total + pr.price * v_qty;
  end loop;
  update orders set total = v_total + v_ongkir where id = v_order;
  insert into profiles(id, nama, telp, alamat) values (v_user, p_nama, p_telp, p_alamat)
    on conflict (id) do update set nama = excluded.nama, telp = excluded.telp, alamat = excluded.alamat, updated_at = now();
  return query select v_order, v_total + v_ongkir;
end $$;
revoke all on function public.buat_pesanan(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.buat_pesanan(text, text, text, jsonb, uuid) to authenticated;

-- 6. Bukti bayar: bucket privat, pembeli unggah ke folder miliknya, penjual membaca
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti', 'bukti', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy bukti_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti' and (storage.foldername(name))[1] = auth.uid()::text);
create policy bukti_baca_pembeli on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and (storage.foldername(name))[1] = auth.uid()::text);
create policy bukti_baca_penjual on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and exists (select 1 from public.sellers where owner_id = auth.uid()));

create or replace function public.kirim_bukti(p_order uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_path is null or char_length(p_path) > 200 or split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'Berkas tidak valid';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'bukti' and name = p_path) then
    raise exception 'Berkas belum terunggah';
  end if;
  update orders set bukti_path = p_path where id = p_order and buyer_id = auth.uid() and status = 'baru';
  if not found then raise exception 'Pesanan tidak bisa diberi bukti bayar'; end if;
end $$;
revoke all on function public.kirim_bukti(uuid, text) from public, anon;
grant execute on function public.kirim_bukti(uuid, text) to authenticated;

-- 7. Pesanan dengan bukti bayar tidak ikut kedaluwarsa otomatis
create or replace function public.batalkan_pesanan_kedaluwarsa(p_jam int default 24)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update orders set status = 'batal'
    where status = 'baru' and bukti_path is null and created_at < now() - make_interval(hours => p_jam);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.batalkan_pesanan_kedaluwarsa(int) from public, anon, authenticated;
