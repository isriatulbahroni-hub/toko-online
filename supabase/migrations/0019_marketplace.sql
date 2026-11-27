-- 0019: marketplace multi-penjual.
-- Jalankan di Supabase SQL Editor SETELAH 0018 dan SEBELUM kode etalase/admin baru di-deploy.
-- Aman dijalankan ulang (IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE).
-- Kompatibel dengan kode etalase dan admin yang lama: situs lama tetap jalan sampai kode baru dipasang.
--
-- LANGKAH WAJIB SEBELUM MENJALANKAN:
--   1. Simpan definisi buat_pesanan yang aktif (cadangan, karena 0015b tidak ada di repo):
--        select pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);
--   2. Jalankan seluruh file ini.
--   3. Jadikan akun Ron admin platform (ganti EMAIL_RON dengan email login Ron, jangan ditaruh di repo):
--        insert into public.platform_admin(user_id)
--          select id from auth.users where email = 'EMAIL_RON' on conflict do nothing;
--   4. Jalankan query verifikasi di bagian paling bawah file ini.

-- 0. Pengaman: buat_pesanan yang aktif harus sudah memuat perbaikan 0015 (harga flash).
--    Jika tidak, database berbeda dari yang diperkirakan, jadi berhenti dan periksa dulu.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);
  if position('harga_flash' in d) = 0 then
    raise exception 'buat_pesanan aktif tidak memuat harga_flash. Periksa urutan migrasi 0010 sampai 0016 sebelum lanjut.';
  end if;
end $$;

-- 1. Buka marketplace: hapus kunci 1 penjual, satu akun satu toko, kolom komisi (disiapkan, belum dipakai).
drop index if exists public.hanya_satu_penjual_aktif;

do $$
begin
  create unique index if not exists sellers_owner_unik on public.sellers (owner_id) where owner_id is not null;
exception when unique_violation then
  raise notice 'Ada akun yang punya lebih dari satu toko. Rapikan dulu, lalu jalankan ulang 0019.';
end $$;

-- Komisi platform BELUM diputuskan: kolom ini disiapkan saja (default 0) dan tidak dipakai di mana pun.
alter table public.sellers add column if not exists komisi_persen numeric(5,2) not null default 0
  check (komisi_persen between 0 and 100);

alter table public.sellers drop constraint if exists sellers_nama_panjang;
alter table public.sellers add constraint sellers_nama_panjang
  check (char_length(trim(name)) between 2 and 100) not valid;

-- 2. Admin platform (pemilik marketplace). Tabel ini hanya bisa dibaca lewat fungsi.
create table if not exists public.platform_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admin enable row level security;
revoke all on public.platform_admin from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admin where user_id = auth.uid())
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- 3. Pengisi seller_id otomatis saat penjual menambah data (admin lama tidak perlu mengirim seller_id).
--    Penjual tetap tidak bisa menulis ke toko lain: policy WITH CHECK di bawah menolaknya.
create or replace function public.isi_seller_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.seller_id is null then
    select id into new.seller_id from sellers where owner_id = auth.uid() limit 1;
  end if;
  return new;
end $$;
revoke execute on function public.isi_seller_id() from public, anon, authenticated;

-- 4. Ongkir per toko. Data lama diisi ke toko yang sudah ada (yang aktif lebih dulu).
alter table public.ongkir add column if not exists seller_id uuid references public.sellers(id) on delete cascade;
update public.ongkir set seller_id = (select id from public.sellers order by is_active desc, created_at limit 1)
  where seller_id is null;
do $$
begin
  if not exists (select 1 from public.ongkir where seller_id is null) then
    alter table public.ongkir alter column seller_id set not null;
  else
    raise notice 'Ada baris ongkir tanpa toko (belum ada baris sellers?). seller_id belum dibuat wajib.';
  end if;
end $$;
alter table public.ongkir drop constraint if exists ongkir_wilayah_key;
create unique index if not exists ongkir_seller_wilayah_uq on public.ongkir (seller_id, wilayah);
drop trigger if exists ongkir_isi_seller on public.ongkir;
create trigger ongkir_isi_seller before insert on public.ongkir
  for each row execute function public.isi_seller_id();
-- Baca publik (policy ongkir_publik dari 0005 tetap), tulis hanya pemilik toko itu.
drop policy if exists ongkir_penjual on public.ongkir;
create policy ongkir_penjual on public.ongkir for all to authenticated
  using (seller_id in (select id from public.sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from public.sellers where owner_id = auth.uid()));

-- 5. Kategori milik platform: semua orang membaca (kategori_publik), hanya admin platform yang mengubah.
--    Penjual memilih kategori untuk produknya, tidak membuat kategori sendiri.
drop policy if exists kategori_penjual on public.categories;
drop policy if exists kategori_platform on public.categories;
create policy kategori_platform on public.categories for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- 6. Voucher per toko: kode unik per toko, penjual hanya mengelola voucher tokonya, dan
--    voucher hanya berlaku untuk pesanan toko pemiliknya.
alter table public.voucher add column if not exists seller_id uuid references public.sellers(id) on delete cascade;
update public.voucher set seller_id = (select id from public.sellers order by is_active desc, created_at limit 1)
  where seller_id is null;
do $$
begin
  if not exists (select 1 from public.voucher where seller_id is null) then
    alter table public.voucher alter column seller_id set not null;
  else
    raise notice 'Ada voucher tanpa toko. seller_id belum dibuat wajib.';
  end if;
end $$;
drop index if exists public.voucher_kode_uq;
create unique index if not exists voucher_seller_kode_uq on public.voucher (seller_id, upper(kode));
drop trigger if exists voucher_isi_seller on public.voucher;
create trigger voucher_isi_seller before insert on public.voucher
  for each row execute function public.isi_seller_id();
drop policy if exists voucher_penjual on public.voucher;
create policy voucher_penjual on public.voucher for all to authenticated
  using (seller_id in (select id from public.sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from public.sellers where owner_id = auth.uid()));
drop policy if exists voucher_pakai_penjual on public.voucher_pakai;
create policy voucher_pakai_penjual on public.voucher_pakai for select to authenticated
  using (voucher_id in (select id from public.voucher
    where seller_id in (select id from public.sellers where owner_id = auth.uid())));

-- 7. Penyimpanan: penjual hanya boleh membaca bukti bayar pesanan tokonya,
--    dan hanya mengunggah/menghapus foto di folder tokonya (nama berkas diawali seller_id).
drop policy if exists bukti_baca_penjual on storage.objects;
create policy bukti_baca_penjual on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and exists (
    select 1 from public.orders o join public.sellers s on s.id = o.seller_id
    where o.bukti_path = storage.objects.name and s.owner_id = auth.uid()));
create index if not exists orders_bukti_idx on public.orders (bukti_path) where bukti_path is not null;

drop policy if exists produk_foto_unggah on storage.objects;
create policy produk_foto_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'produk'
    and (storage.foldername(name))[1] in (select id::text from public.sellers where owner_id = auth.uid()));
drop policy if exists produk_foto_hapus on storage.objects;
create policy produk_foto_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'produk'
    and (storage.foldername(name))[1] in (select id::text from public.sellers where owner_id = auth.uid()));

-- 8. Notifikasi Telegram per toko. Sebelumnya hanya satu baris global: penjual mana pun bisa menimpa
--    token dan menerima data pesanan semua toko. Tabel lama (notif_telegram) tetap ada dan kini
--    hanya dipakai untuk pemberitahuan platform (mis. toko baru), diisi lewat SQL oleh pemilik platform.
create table if not exists public.notif_telegram_toko (
  seller_id uuid primary key references public.sellers(id) on delete cascade,
  bot_token text not null,
  chat_id text not null,
  aktif boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notif_telegram_toko enable row level security;
revoke all on public.notif_telegram_toko from anon, authenticated;

-- Pengaturan Telegram yang sudah ada dipindahkan ke toko tertua (toko Ron) supaya notifikasi tetap jalan.
insert into public.notif_telegram_toko (seller_id, bot_token, chat_id, aktif)
select s.id, n.bot_token, n.chat_id, n.aktif
from public.notif_telegram n,
  lateral (select id from public.sellers where owner_id is not null order by created_at limit 1) s
where n.id = 1 and n.bot_token <> ''
on conflict (seller_id) do nothing;

create or replace function public.kirim_telegram_toko(p_seller uuid, teks text) returns void
language plpgsql security definer set search_path = public as $$
declare n notif_telegram_toko;
begin
  select * into n from notif_telegram_toko where seller_id = p_seller and aktif;
  if not found or n.bot_token = '' then return; end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || n.bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', n.chat_id, 'text', teks)
  );
exception when others then
  null;
end $$;
revoke all on function public.kirim_telegram_toko(uuid, text) from public, anon, authenticated;

create or replace function public.notif_pesanan_baru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform kirim_telegram_toko(new.seller_id, concat('Pesanan baru ', left(new.id::text, 8), E'\n', new.buyer_name, E'\nTotal Rp', new.total::bigint, E'\nStatus: menunggu pembayaran'));
  return null;
end $$;
revoke execute on function public.notif_pesanan_baru() from public, anon, authenticated;

create or replace function public.notif_pesanan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.bukti_path is not null and old.bukti_path is distinct from new.bukti_path then
    perform kirim_telegram_toko(new.seller_id, concat('Bukti bayar masuk untuk pesanan ', left(new.id::text, 8), E'\n', new.buyer_name, E'\nTotal Rp', new.total::bigint));
  end if;
  return null;
end $$;
revoke execute on function public.notif_pesanan() from public, anon, authenticated;

create or replace function public.simpan_notif_telegram(p_token text, p_chat text, p_aktif boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare
  t text := coalesce(trim(p_token), '');
  c text := coalesce(trim(p_chat), '');
  v_seller uuid;
begin
  select id into v_seller from sellers where owner_id = auth.uid();
  if v_seller is null then raise exception 'Hanya penjual yang boleh mengubah ini'; end if;
  if c !~ '^-?[0-9]+$' then raise exception 'Chat ID harus berupa angka'; end if;
  if t <> '' and t !~ '^[0-9]+:[A-Za-z0-9_-]{20,}$' then raise exception 'Format token bot tidak valid'; end if;
  if t = '' and not exists (select 1 from notif_telegram_toko where seller_id = v_seller and bot_token <> '') then
    raise exception 'Token bot wajib diisi';
  end if;
  insert into notif_telegram_toko (seller_id, bot_token, chat_id, aktif)
  values (v_seller, t, c, p_aktif)
  on conflict (seller_id) do update set
    bot_token = case when t = '' then notif_telegram_toko.bot_token else t end,
    chat_id = c, aktif = p_aktif, updated_at = now();
end $$;

create or replace function public.status_notif_telegram() returns table (aktif boolean, chat_id text, token_akhir text)
language plpgsql security definer set search_path = public as $$
declare v_seller uuid;
begin
  select id into v_seller from sellers where owner_id = auth.uid();
  if v_seller is null then raise exception 'Hanya penjual yang boleh melihat ini'; end if;
  return query select n.aktif, n.chat_id, right(n.bot_token, 4) from notif_telegram_toko n where n.seller_id = v_seller;
end $$;

create or replace function public.tes_notif_telegram() returns void
language plpgsql security definer set search_path = public as $$
declare v_seller uuid;
begin
  select id into v_seller from sellers where owner_id = auth.uid();
  if v_seller is null then raise exception 'Hanya penjual yang boleh mengirim tes'; end if;
  perform kirim_telegram_toko(v_seller, 'Tes notifikasi dari admin toko. Jika pesan ini masuk, notifikasi pesanan sudah aktif.');
end $$;

revoke all on function public.simpan_notif_telegram(text, text, boolean) from public, anon;
revoke all on function public.status_notif_telegram() from public, anon;
revoke all on function public.tes_notif_telegram() from public, anon;
grant execute on function public.simpan_notif_telegram(text, text, boolean) to authenticated;
grant execute on function public.status_notif_telegram() to authenticated;
grant execute on function public.tes_notif_telegram() to authenticated;

-- Pembatalan otomatis: ringkasan Telegram dikirim ke toko yang bersangkutan.
create or replace function public.batalkan_pesanan_kedaluwarsa(p_jam int default 24)
returns int language plpgsql security definer set search_path = public as $$
declare n_tanpa int; n_bukti int := 0; r record;
begin
  update orders set status = 'batal'
    where status = 'baru' and bukti_path is null and created_at < now() - make_interval(hours => p_jam);
  get diagnostics n_tanpa = row_count;
  for r in
    with u as (
      update orders set status = 'batal'
        where status = 'baru' and bukti_path is not null and created_at < now() - make_interval(hours => p_jam * 3)
        returning seller_id)
    select seller_id, count(*)::int as c from u group by seller_id
  loop
    n_bukti := n_bukti + r.c;
    perform kirim_telegram_toko(r.seller_id, concat('Dibatalkan otomatis: ', r.c, ' pesanan yang sudah ada bukti bayar tetapi belum dikonfirmasi lebih dari ', p_jam * 3, ' jam.'));
  end loop;
  return n_tanpa + n_bukti;
end $$;
revoke all on function public.batalkan_pesanan_kedaluwarsa(int) from public, anon, authenticated;

-- 9. Hak akses tabel sellers. Klien tidak boleh mengubah is_active, owner_id, komisi_persen, dan
--    tidak boleh INSERT/DELETE langsung. Toko dibuat lewat daftar_jualan(), status lewat atur_toko_aktif().
revoke insert, update, delete on public.sellers from anon, authenticated;
grant update (name, wa, rekening, kebijakan, beranda, warna) on public.sellers to authenticated;
-- Admin platform boleh melihat semua toko (termasuk yang nonaktif).
drop policy if exists platform_baca_toko on public.sellers;
create policy platform_baca_toko on public.sellers for select to authenticated
  using (public.is_platform_admin());

-- 10. Daftar jadi penjual (toko langsung aktif, tanpa persetujuan). Satu akun satu toko.
create or replace function public.daftar_jualan(p_nama text, p_wa text, p_rekening text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_nama text := trim(coalesce(p_nama, ''));
  v_wa text := trim(coalesce(p_wa, ''));
  v_rek text := trim(coalesce(p_rekening, ''));
  v_id uuid;
begin
  if v_user is null then raise exception 'Masuk dulu untuk membuka toko'; end if;
  if not exists (select 1 from auth.users u where u.id = v_user and u.email_confirmed_at is not null) then
    raise exception 'Konfirmasi email Anda dulu sebelum membuka toko';
  end if;
  if exists (select 1 from sellers where owner_id = v_user) then
    raise exception 'Akun ini sudah punya toko';
  end if;
  if char_length(v_nama) < 3 or char_length(v_nama) > 60 or v_nama !~ '[A-Za-z0-9]' then
    raise exception 'Nama toko 3 sampai 60 karakter dan memuat huruf atau angka';
  end if;
  if v_wa !~ '^[0-9+ -]{8,20}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if char_length(v_rek) < 5 or char_length(v_rek) > 300 then
    raise exception 'Rekening pembayaran 5 sampai 300 karakter (bank, nomor, atas nama)';
  end if;
  if exists (select 1 from sellers where lower(name) = lower(v_nama)) then
    raise exception 'Nama toko sudah dipakai, pilih nama lain';
  end if;
  insert into sellers (name, wa, rekening, owner_id, is_active)
    values (v_nama, v_wa, v_rek, v_user, true) returning id into v_id;
  perform kirim_telegram('Toko baru dibuka: ' || v_nama);
  return v_id;
exception when unique_violation then
  raise exception 'Akun ini sudah punya toko';
end $$;
revoke all on function public.daftar_jualan(text, text, text) from public, anon;
grant execute on function public.daftar_jualan(text, text, text) to authenticated;

create or replace function public.atur_toko_aktif(p_seller uuid, p_aktif boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  update sellers set is_active = coalesce(p_aktif, false) where id = p_seller;
  if not found then raise exception 'Toko tidak ditemukan'; end if;
end $$;
revoke all on function public.atur_toko_aktif(uuid, boolean) from public, anon;
grant execute on function public.atur_toko_aktif(uuid, boolean) to authenticated;

-- Ringkasan platform (hanya admin platform). Hanya angka agregat, tanpa data pribadi pembeli.
create or replace function public.ringkasan_platform()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  return jsonb_build_object(
    'toko_aktif', (select count(*) from sellers where is_active),
    'toko_nonaktif', (select count(*) from sellers where not is_active),
    'pesanan_30h', (select count(*) from orders where created_at >= now() - interval '30 days'),
    'penjualan_30h', (select coalesce(sum(total), 0) from orders
      where status in ('dibayar', 'dikirim', 'selesai') and created_at >= now() - interval '30 days'),
    'toko', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.dibuat desc) from (
        select s.id, s.name as nama, s.is_active as aktif, s.created_at as dibuat,
          (select count(*) from orders o where o.seller_id = s.id) as pesanan,
          (select coalesce(sum(o.total), 0) from orders o
            where o.seller_id = s.id and o.status in ('dibayar', 'dikirim', 'selesai')) as penjualan,
          (select count(*) from orders o
            where o.seller_id = s.id and o.created_at >= now() - interval '30 days') as pesanan_30h,
          (select coalesce(sum(o.total), 0) from orders o
            where o.seller_id = s.id and o.status in ('dibayar', 'dikirim', 'selesai')
              and o.created_at >= now() - interval '30 days') as penjualan_30h
        from sellers s) t), '[]'::jsonb)
  );
end $$;
revoke all on function public.ringkasan_platform() from public, anon;
grant execute on function public.ringkasan_platform() to authenticated;

-- 11. Voucher: cek_voucher menerima toko (p_seller). Tanpa p_seller (kode lama) tetap jalan selama
--     kodenya hanya dipakai satu toko. Voucher persen dihitung dengan bigint (perbaikan 0016 dipertahankan).
drop function if exists public.cek_voucher(text, int);
create or replace function public.cek_voucher(p_kode text, p_subtotal int, p_seller uuid default null)
returns int language plpgsql security definer set search_path to 'public' as $f$
declare v voucher%rowtype; pot int; n int;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk memakai voucher'; end if;
  select count(*) into n from voucher x
    where upper(x.kode) = upper(trim(coalesce(p_kode, ''))) and x.aktif
      and (x.berlaku_sampai is null or x.berlaku_sampai > now())
      and (x.kuota is null or x.terpakai < x.kuota)
      and (p_seller is null or x.seller_id = p_seller)
      and exists (select 1 from sellers s where s.id = x.seller_id and s.is_active);
  if n = 0 then raise exception 'Voucher tidak valid atau sudah habis'; end if;
  if n > 1 then raise exception 'Kode voucher ini dipakai beberapa toko. Pakai lewat keranjang satu toko.'; end if;
  select x.* into v from voucher x
    where upper(x.kode) = upper(trim(coalesce(p_kode, ''))) and x.aktif
      and (x.berlaku_sampai is null or x.berlaku_sampai > now())
      and (x.kuota is null or x.terpakai < x.kuota)
      and (p_seller is null or x.seller_id = p_seller)
      and exists (select 1 from sellers s where s.id = x.seller_id and s.is_active);
  if exists (select 1 from voucher_pakai where voucher_id = v.id and user_id = auth.uid()) then
    raise exception 'Voucher ini sudah pernah Anda pakai'; end if;
  if p_subtotal < v.min_belanja then raise exception 'Minimal belanja Rp% untuk voucher ini', v.min_belanja; end if;
  pot := case v.jenis when 'persen' then (p_subtotal::bigint * v.nilai / 100)::int else v.nilai end;
  if v.maks_potongan is not null then pot := least(pot, v.maks_potongan); end if;
  return least(pot, p_subtotal);
end $f$;
revoke all on function public.cek_voucher(text, int, uuid) from public, anon;
grant execute on function public.cek_voucher(text, int, uuid) to authenticated;

-- Pusat Voucher: hanya voucher toko aktif, dengan nama toko (kolom seller_id dan toko ditambahkan di akhir).
drop function if exists public.voucher_pusat();
create function public.voucher_pusat()
returns table(id uuid, kode text, jenis text, nilai int, min_belanja int, maks_potongan int, berlaku_sampai timestamptz, sisa int, diklaim boolean, dipakai boolean, seller_id uuid, toko text)
language sql stable security definer set search_path to 'public' as $f$
 select v.id,
  case when k.user_id is not null then v.kode end,
  v.jenis, v.nilai, v.min_belanja, v.maks_potongan, v.berlaku_sampai,
  case when v.kuota is null then null else greatest(v.kuota - v.terpakai, 0) end,
  (k.user_id is not null),
  (p.user_id is not null),
  v.seller_id,
  s.name
 from voucher v
 join sellers s on s.id = v.seller_id and s.is_active
 left join voucher_klaim k on k.voucher_id = v.id and k.user_id = auth.uid()
 left join voucher_pakai p on p.voucher_id = v.id and p.user_id = auth.uid()
 where v.aktif and v.publik
  and (v.berlaku_sampai is null or v.berlaku_sampai > now())
  and (v.kuota is null or v.terpakai < v.kuota)
 order by v.created_at desc
$f$;
revoke all on function public.voucher_pusat() from public, anon;
grant execute on function public.voucher_pusat() to authenticated;

-- 12. Alur status (versi 0013) + penjaga baru: penjual tidak bisa menandai pesanannya sendiri "selesai".
--     Selesai hanya lewat konfirmasi pembeli (konfirmasi_diterima) atau otomatis 7 hari setelah dikirim.
--     Ini menutup celah penjual membuat akun pembeli palsu untuk menciptakan koin, ulasan, dan omzet palsu.
create or replace function public.kembalikan_stok() returns trigger
language plpgsql security definer set search_path to 'public' as $f$
begin
  if new.status <> old.status and (old.status, new.status) not in (
    ('baru','dibayar'), ('baru','batal'), ('dibayar','dikirim'), ('dibayar','batal'), ('dikirim','selesai')
  ) then
    raise exception 'Perubahan status % ke % tidak diizinkan', old.status, new.status;
  end if;
  if new.status = 'selesai' and old.status <> 'selesai' and auth.uid() is not null
     and exists (select 1 from sellers where id = new.seller_id and owner_id = auth.uid()) then
    raise exception 'Pesanan selesai setelah pembeli menekan Pesanan diterima, atau otomatis 7 hari setelah dikirim';
  end if;
  if new.status = 'batal' and old.status <> 'batal' then
    update products p set stock = p.stock + s.q
      from (select product_id, sum(qty) q from order_items where order_id = new.id and varian_id is null group by product_id) s
      where s.product_id = p.id;
    update varian v set stok = v.stok + s.q
      from (select varian_id, sum(qty) q from order_items where order_id = new.id and varian_id is not null group by varian_id) s
      where s.varian_id = v.id;
    update voucher v set terpakai = greatest(v.terpakai - 1, 0)
      where v.id in (select voucher_id from voucher_pakai where order_id = new.id);
    delete from voucher_pakai where order_id = new.id;
  end if;
  return new;
end $f$;
revoke execute on function public.kembalikan_stok() from public, anon, authenticated;

-- 13. buat_pesanan multi-toko. Ditulis ulang penuh dari versi 0011 + harga flash (0015) + urutan kunci (0016).
--     Tanda tangan dan bentuk hasil tetap sama (order_id, total), tetapi kini satu baris per toko:
--       - keranjang berisi produk beberapa toko dipecah jadi satu pesanan per toko (semua atau tidak sama sekali),
--       - ongkir diambil dari tabel ongkir toko itu, dicocokkan lewat nama wilayah yang dipilih,
--       - voucher dipakai di pesanan toko pemilik voucher (kode bisa sama di toko berbeda),
--       - pembeli tidak bisa membeli dari tokonya sendiri,
--       - batas pesanan belum dibayar naik dari 3 ke 10 karena satu checkout bisa membuat beberapa pesanan,
--       - kunci baris dipegang berurutan (toko, lalu produk dan varian) agar tidak deadlock.
create or replace function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb, p_ongkir uuid default null, p_voucher text default null)
returns table(order_id uuid, total integer)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  g record; it jsonb; pr products%rowtype; vr varian%rowtype;
  v_order uuid; v_qty int; v_var uuid; v_price int; v_total int;
  v_ongkir int; v_wil text; v_wil_pilih text; v_pot int; v_vid uuid; v_toko text; v_n int;
  v_kode text := nullif(upper(trim(coalesce(p_voucher, ''))), '');
  v_vpakai boolean := false; v_ini boolean;
begin
  if v_user is null then raise exception 'Masuk dulu untuk membeli'; end if;
  p_nama := trim(coalesce(p_nama, '')); p_telp := trim(coalesce(p_telp, '')); p_alamat := trim(coalesce(p_alamat, ''));
  if p_nama = '' or char_length(p_nama) > 100 then raise exception 'Nama wajib diisi (maks. 100 huruf)'; end if;
  if p_telp !~ '^[0-9+ -]{8,20}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if char_length(p_alamat) < 10 or char_length(p_alamat) > 500 then raise exception 'Alamat 10 sampai 500 huruf'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Terlalu banyak jenis produk dalam satu pesanan'; end if;
  if (select count(*) from orders where buyer_id = v_user and status = 'baru') >= 10 then
    raise exception 'Selesaikan dulu pesanan yang belum dibayar (maksimal 10)';
  end if;

  -- Semua produk harus aktif dan milik toko aktif.
  select count(*) into v_n
    from jsonb_array_elements(p_items) as e
    join products p on p.id = (e->>'id')::uuid and p.is_active
    join sellers s on s.id = p.seller_id and s.is_active;
  if v_n <> jsonb_array_length(p_items) then raise exception 'Produk tidak tersedia'; end if;

  -- Wilayah tujuan yang dipilih pembeli (id baris ongkir salah satu toko); tiap toko dicocokkan lewat nama wilayah.
  if p_ongkir is not null then
    select o.wilayah into v_wil_pilih from ongkir o where o.id = p_ongkir;
    if not found then raise exception 'Tujuan pengiriman tidak valid'; end if;
  end if;

  -- Voucher harus milik salah satu toko di keranjang.
  if v_kode is not null and not exists (
    select 1 from voucher vc
    where upper(vc.kode) = v_kode
      and vc.seller_id in (select p.seller_id from jsonb_array_elements(p_items) as e join products p on p.id = (e->>'id')::uuid)
  ) then
    raise exception 'Voucher tidak berlaku untuk toko di keranjang';
  end if;

  for g in
    select distinct p.seller_id
      from jsonb_array_elements(p_items) as e
      join products p on p.id = (e->>'id')::uuid
      order by p.seller_id
  loop
    if exists (select 1 from sellers where id = g.seller_id and owner_id = v_user) then
      raise exception 'Anda tidak bisa membeli produk dari toko Anda sendiri';
    end if;
    select name into v_toko from sellers where id = g.seller_id;

    v_ongkir := 0; v_wil := null;
    if exists (select 1 from ongkir where seller_id = g.seller_id) then
      if v_wil_pilih is null then raise exception 'Pilih tujuan pengiriman'; end if;
      select o.tarif, o.wilayah into v_ongkir, v_wil from ongkir o
        where o.seller_id = g.seller_id and lower(o.wilayah) = lower(v_wil_pilih) limit 1;
      if not found then raise exception 'Toko % belum melayani pengiriman ke %', v_toko, v_wil_pilih; end if;
    end if;

    insert into orders(seller_id, buyer_id, buyer_name, buyer_phone, address, ongkir, wilayah)
      values (g.seller_id, v_user, p_nama, p_telp, p_alamat, v_ongkir, v_wil) returning id into v_order;
    v_total := 0;

    for it in
      select e from jsonb_array_elements(p_items) as e
        join products p on p.id = (e->>'id')::uuid
        where p.seller_id = g.seller_id
        order by e->>'id', coalesce(e->>'v', '')
    loop
      v_qty := (it->>'qty')::int;
      v_var := nullif(it->>'v', '')::uuid;
      if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Jumlah tidak valid'; end if;
      select * into pr from products where id = (it->>'id')::uuid and is_active and seller_id = g.seller_id for update;
      if not found then raise exception 'Produk tidak tersedia'; end if;
      if exists (select 1 from varian where product_id = pr.id) then
        if v_var is null then raise exception 'Pilih varian untuk %', pr.name; end if;
        select * into vr from varian where id = v_var and product_id = pr.id for update;
        if not found then raise exception 'Varian tidak tersedia'; end if;
        if vr.stok < v_qty then raise exception 'Stok % (%) tidak cukup', pr.name, vr.nama; end if;
        update varian set stok = stok - v_qty where id = vr.id;
        v_price := harga_flash(coalesce(vr.harga, pr.price), pr);
        insert into order_items(order_id, product_id, varian_id, name, price, qty)
          values (v_order, pr.id, vr.id, pr.name || ' (' || vr.nama || ')', v_price, v_qty);
      else
        if pr.stock < v_qty then raise exception 'Stok % tidak cukup', pr.name; end if;
        update products set stock = stock - v_qty where id = pr.id;
        v_price := harga_flash(pr.price, pr);
        insert into order_items(order_id, product_id, name, price, qty) values (v_order, pr.id, pr.name, v_price, v_qty);
      end if;
      v_total := v_total + v_price * v_qty;
    end loop;

    v_pot := 0; v_vid := null; v_ini := false;
    if v_kode is not null and not v_vpakai
       and exists (select 1 from voucher vc where vc.seller_id = g.seller_id and upper(vc.kode) = v_kode) then
      v_pot := cek_voucher(v_kode, v_total, g.seller_id);
      update voucher set terpakai = terpakai + 1
        where seller_id = g.seller_id and upper(kode) = v_kode and (kuota is null or terpakai < kuota)
        returning id into v_vid;
      if v_vid is null then raise exception 'Voucher tidak valid atau sudah habis'; end if;
      insert into voucher_pakai(voucher_id, user_id, order_id) values (v_vid, v_user, v_order);
      v_vpakai := true; v_ini := true;
    end if;

    -- voucher_kode selalu ikut di UPDATE ini: trigger notifikasi Telegram menyala tepat sekali per pesanan (0013).
    update orders set total = v_total - v_pot + v_ongkir, potongan = v_pot,
      voucher_kode = case when v_ini then v_kode else null end
      where id = v_order;
    return query select v_order, v_total - v_pot + v_ongkir;
  end loop;

  insert into profiles(id, nama, telp, alamat) values (v_user, p_nama, p_telp, p_alamat)
    on conflict (id) do update set nama = excluded.nama, telp = excluded.telp, alamat = excluded.alamat, updated_at = now();
end $function$;
revoke all on function public.buat_pesanan(text, text, text, jsonb, uuid, text) from public, anon;
grant execute on function public.buat_pesanan(text, text, text, jsonb, uuid, text) to authenticated;

-- ========================================================================
-- VERIFIKASI (jalankan setelah 0019, hasil yang diharapkan ada di komentar)
-- ========================================================================
-- select
--   (select count(*) from pg_indexes where indexname = 'hanya_satu_penjual_aktif')           as index_kunci_masih_ada,  -- 0
--   (select count(*) from pg_indexes where indexname in ('sellers_owner_unik','ongkir_seller_wilayah_uq','voucher_seller_kode_uq')) as index_baru, -- 3
--   (select count(*) from pg_policies where policyname in ('bukti_baca_penjual','produk_foto_unggah','produk_foto_hapus','ongkir_penjual','voucher_penjual','kategori_platform','platform_baca_toko')) as policy_baru, -- 7
--   (select count(*) from pg_proc where proname in ('is_platform_admin','daftar_jualan','atur_toko_aktif','ringkasan_platform','kirim_telegram_toko','isi_seller_id')) as fungsi_baru, -- 6
--   (select position('v_vpakai' in pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure)) > 0) as buat_pesanan_baru, -- true
--   (select count(*) from public.ongkir where seller_id is null)   as ongkir_tanpa_toko,    -- 0
--   (select count(*) from public.voucher where seller_id is null)  as voucher_tanpa_toko,   -- 0
--   (select count(*) from public.platform_admin)                   as jumlah_admin_platform; -- 1 setelah langkah 3
