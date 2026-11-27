-- 0020: penjual mengelola tokonya sepenuhnya, admin platform hanya bertindak bila ada laporan.
-- Jalankan di Supabase SQL Editor SETELAH 0019. Aman dijalankan ulang.
-- JANGAN menjalankan ulang 0019 sesudah 0020: 0019 akan mengembalikan atur_toko_aktif versi 2 argumen
-- (tanpa alasan) dan kebijakan kategori milik platform. Jika 0019 terpaksa diulang, jalankan 0020 lagi sesudahnya.
--
-- Isi:
--   1. Kategori per toko (seperti ongkir), menggantikan kategori milik platform dari 0019.
--   2. Tabel laporan_toko: pembeli melapor, admin platform meninjau.
--   3. Tabel log_admin: catatan setiap tindakan admin platform (siapa, kapan, alasan).
--   4. atur_toko_aktif wajib beralasan saat menonaktifkan; alasan terlihat oleh pemilik toko.
--   5. Blokir produk yang melanggar tanpa menutup seluruh toko (hanya jika ada laporan terbuka untuk toko itu).
--   6. Admin hanya bisa melihat isi toko (produk, jumlah pesanan) selama ada laporan terbuka, tanpa data pembeli.

-- 1. Kategori per toko. Kategori lama diberikan ke toko pertama (toko yang sudah berjalan).
alter table public.categories add column if not exists seller_id uuid references public.sellers(id) on delete cascade;
update public.categories set seller_id = (select id from public.sellers order by is_active desc, created_at limit 1)
  where seller_id is null;
do $$
begin
  if not exists (select 1 from public.categories where seller_id is null) then
    alter table public.categories alter column seller_id set not null;
  else
    raise notice 'Ada kategori tanpa toko (belum ada baris sellers?). seller_id belum dibuat wajib.';
  end if;
end $$;
alter table public.categories drop constraint if exists categories_nama_key;
create unique index if not exists categories_seller_nama_uq on public.categories (seller_id, lower(nama));
drop trigger if exists categories_isi_seller on public.categories;
create trigger categories_isi_seller before insert on public.categories
  for each row execute function public.isi_seller_id();
-- Baca publik (kategori_publik dari 0004 tetap), tulis hanya pemilik toko itu.
drop policy if exists kategori_platform on public.categories;
drop policy if exists kategori_penjual on public.categories;
create policy kategori_penjual on public.categories for all to authenticated
  using (seller_id in (select id from public.sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from public.sellers where owner_id = auth.uid()));

-- Produk hanya boleh memakai kategori milik tokonya sendiri (diperiksa saat kategori diisi atau diganti).
create or replace function public.products_cek_kategori() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.category_id is not null and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) then
    if not exists (select 1 from categories c where c.id = new.category_id and c.seller_id = new.seller_id) then
      raise exception 'Kategori ini bukan milik toko Anda';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists products_cek_kategori on public.products;
create trigger products_cek_kategori before insert or update of category_id on public.products
  for each row execute function public.products_cek_kategori();

-- 2. Laporan toko. Hanya lewat fungsi; identitas pelapor tidak ditampilkan ke siapa pun.
create table if not exists public.laporan_toko (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  pelapor_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  alasan text not null check (char_length(alasan) between 10 and 1000),
  status text not null default 'terbuka' check (status in ('terbuka', 'ditindak', 'ditolak')),
  catatan_admin text check (catatan_admin is null or char_length(catatan_admin) <= 1000),
  dibuat timestamptz not null default now(),
  ditutup_at timestamptz
);
alter table public.laporan_toko enable row level security;
revoke all on public.laporan_toko from anon, authenticated;
-- Satu pembeli hanya boleh punya satu laporan terbuka per toko.
create unique index if not exists laporan_terbuka_uq on public.laporan_toko (seller_id, pelapor_id) where status = 'terbuka';
create index if not exists laporan_status_idx on public.laporan_toko (status, dibuat desc);

-- 3. Log tindakan admin platform.
create table if not exists public.log_admin (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  aksi text not null,
  seller_id uuid references public.sellers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  laporan_id uuid references public.laporan_toko(id) on delete set null,
  alasan text,
  dibuat timestamptz not null default now()
);
alter table public.log_admin enable row level security;
revoke all on public.log_admin from anon, authenticated;

-- 4. Penonaktifan toko wajib beralasan; alasan terlihat oleh pemilik toko (baris tokonya sendiri).
alter table public.sellers add column if not exists alasan_nonaktif text;
grant select (alasan_nonaktif) on public.sellers to authenticated;

drop function if exists public.atur_toko_aktif(uuid, boolean);
create or replace function public.atur_toko_aktif(p_seller uuid, p_aktif boolean, p_alasan text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_aktif boolean := coalesce(p_aktif, false);
  v_alasan text := nullif(trim(coalesce(p_alasan, '')), '');
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  if not v_aktif and (v_alasan is null or char_length(v_alasan) < 5) then
    raise exception 'Alasan penonaktifan wajib diisi (minimal 5 huruf)';
  end if;
  update sellers set is_active = v_aktif, alasan_nonaktif = case when v_aktif then null else v_alasan end
    where id = p_seller;
  if not found then raise exception 'Toko tidak ditemukan'; end if;
  insert into log_admin (admin_id, aksi, seller_id, alasan)
    values (auth.uid(), case when v_aktif then 'aktifkan_toko' else 'nonaktifkan_toko' end, p_seller, v_alasan);
end $$;
revoke all on function public.atur_toko_aktif(uuid, boolean, text) from public, anon;
grant execute on function public.atur_toko_aktif(uuid, boolean, text) to authenticated;

-- Pembeli melapor. Syarat: login, email terkonfirmasi, bukan toko sendiri, maksimal 10 laporan per 24 jam.
create or replace function public.laporkan_toko(p_seller uuid, p_alasan text, p_order uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_alasan text := trim(coalesce(p_alasan, ''));
  v_id uuid;
  v_nama text;
begin
  if v_user is null then raise exception 'Masuk dulu untuk melapor'; end if;
  if not exists (select 1 from auth.users u where u.id = v_user and u.email_confirmed_at is not null) then
    raise exception 'Konfirmasi email Anda dulu sebelum melapor';
  end if;
  select name into v_nama from sellers where id = p_seller;
  if not found then raise exception 'Toko tidak ditemukan'; end if;
  if exists (select 1 from sellers where id = p_seller and owner_id = v_user) then
    raise exception 'Anda tidak bisa melaporkan toko sendiri';
  end if;
  if char_length(v_alasan) < 10 or char_length(v_alasan) > 1000 then
    raise exception 'Isi laporan 10 sampai 1000 huruf';
  end if;
  if p_order is not null and not exists (
    select 1 from orders o where o.id = p_order and o.buyer_id = v_user and o.seller_id = p_seller
  ) then
    raise exception 'Pesanan tidak ditemukan untuk toko ini';
  end if;
  if (select count(*) from laporan_toko l where l.pelapor_id = v_user and l.dibuat > now() - interval '24 hours') >= 10 then
    raise exception 'Terlalu banyak laporan hari ini, coba lagi besok';
  end if;
  insert into laporan_toko (seller_id, pelapor_id, order_id, alasan)
    values (p_seller, v_user, p_order, v_alasan) returning id into v_id;
  perform kirim_telegram('Laporan toko baru: ' || v_nama);
  return v_id;
exception when unique_violation then
  raise exception 'Anda sudah punya laporan yang masih ditinjau untuk toko ini';
end $$;
revoke all on function public.laporkan_toko(uuid, text, uuid) from public, anon;
grant execute on function public.laporkan_toko(uuid, text, uuid) to authenticated;

-- Daftar laporan untuk admin platform. Identitas pelapor sengaja tidak disertakan.
create or replace function public.daftar_laporan(p_status text default 'terbuka')
returns table(id uuid, seller_id uuid, toko text, toko_aktif boolean, alasan text, status text,
              order_id uuid, catatan_admin text, dibuat timestamptz, laporan_terbuka_toko int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  if p_status not in ('terbuka', 'ditindak', 'ditolak', 'semua') then raise exception 'Status tidak dikenal'; end if;
  return query
    select l.id, l.seller_id, s.name, s.is_active, l.alasan, l.status, l.order_id, l.catatan_admin, l.dibuat,
           (select count(*)::int from laporan_toko x where x.seller_id = l.seller_id and x.status = 'terbuka')
      from laporan_toko l join sellers s on s.id = l.seller_id
      where p_status = 'semua' or l.status = p_status
      order by l.dibuat desc
      limit 200;
end $$;
revoke all on function public.daftar_laporan(text) from public, anon;
grant execute on function public.daftar_laporan(text) to authenticated;

-- Menutup laporan: ditindak (laporan benar) atau ditolak (tidak terbukti), dengan catatan.
create or replace function public.tutup_laporan(p_laporan uuid, p_status text, p_catatan text)
returns void language plpgsql security definer set search_path = public as $$
declare v_catatan text := nullif(trim(coalesce(p_catatan, '')), ''); v_seller uuid;
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  if p_status not in ('ditindak', 'ditolak') then raise exception 'Status harus ditindak atau ditolak'; end if;
  if v_catatan is null or char_length(v_catatan) < 5 then raise exception 'Catatan wajib diisi (minimal 5 huruf)'; end if;
  update laporan_toko set status = p_status, catatan_admin = v_catatan, ditutup_at = now()
    where id = p_laporan and status = 'terbuka' returning seller_id into v_seller;
  if not found then raise exception 'Laporan tidak ditemukan atau sudah ditutup'; end if;
  insert into log_admin (admin_id, aksi, seller_id, laporan_id, alasan)
    values (auth.uid(), 'tutup_laporan_' || p_status, v_seller, p_laporan, v_catatan);
end $$;
revoke all on function public.tutup_laporan(uuid, text, text) from public, anon;
grant execute on function public.tutup_laporan(uuid, text, text) to authenticated;

-- 5. Blokir produk yang melanggar. Produk diblokir otomatis nonaktif dan penjual tidak bisa mengaktifkannya lagi.
alter table public.products add column if not exists diblokir boolean not null default false;
alter table public.products add column if not exists alasan_blokir text;
grant select (diblokir, alasan_blokir) on public.products to authenticated;

create or replace function public.products_jaga_blokir() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.diblokir := false; new.alasan_blokir := null;
  else
    if (new.diblokir is distinct from old.diblokir or new.alasan_blokir is distinct from old.alasan_blokir)
       and not public.is_platform_admin() then
      new.diblokir := old.diblokir; new.alasan_blokir := old.alasan_blokir;
    end if;
    if new.diblokir then new.is_active := false; end if;
  end if;
  return new;
end $$;
drop trigger if exists products_jaga_blokir on public.products;
create trigger products_jaga_blokir before insert or update on public.products
  for each row execute function public.products_jaga_blokir();

-- Memblokir hanya boleh bila toko pemilik produk punya laporan terbuka. Membuka blokir boleh kapan saja
-- (produk tetap nonaktif sampai penjual mengaktifkannya sendiri).
create or replace function public.blokir_produk(p_product uuid, p_blokir boolean, p_alasan text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_blokir boolean := coalesce(p_blokir, false);
  v_alasan text := nullif(trim(coalesce(p_alasan, '')), '');
  v_seller uuid;
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  if v_alasan is null or char_length(v_alasan) < 5 then raise exception 'Alasan wajib diisi (minimal 5 huruf)'; end if;
  select seller_id into v_seller from products where id = p_product;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  if v_blokir and not exists (select 1 from laporan_toko l where l.seller_id = v_seller and l.status = 'terbuka') then
    raise exception 'Produk hanya bisa diblokir bila toko punya laporan terbuka';
  end if;
  update products set diblokir = v_blokir, alasan_blokir = case when v_blokir then v_alasan else null end
    where id = p_product;
  insert into log_admin (admin_id, aksi, seller_id, product_id, alasan)
    values (auth.uid(), case when v_blokir then 'blokir_produk' else 'buka_blokir_produk' end, v_seller, p_product, v_alasan);
end $$;
revoke all on function public.blokir_produk(uuid, boolean, text) from public, anon;
grant execute on function public.blokir_produk(uuid, boolean, text) to authenticated;

-- 6. Isi toko untuk admin: hanya saat ada laporan terbuka, tanpa data pembeli (hanya jumlah pesanan per status).
--    Setiap pembukaan dicatat di log_admin.
create or replace function public.detail_toko_terlapor(p_seller uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  if not exists (select 1 from laporan_toko l where l.seller_id = p_seller and l.status = 'terbuka') then
    raise exception 'Tidak ada laporan terbuka untuk toko ini';
  end if;
  insert into log_admin (admin_id, aksi, seller_id) values (auth.uid(), 'lihat_toko_terlapor', p_seller);
  return jsonb_build_object(
    'toko', (select to_jsonb(t) from (
      select s.id, s.name as nama, s.wa, s.is_active as aktif, s.alasan_nonaktif, s.created_at as dibuat
      from sellers s where s.id = p_seller) t),
    'pesanan', (select coalesce(jsonb_object_agg(x.status, x.n), '{}'::jsonb) from (
      select o.status, count(*) as n from orders o where o.seller_id = p_seller group by o.status) x),
    'produk', coalesce((select jsonb_agg(to_jsonb(p) order by p.dibuat desc) from (
      select pr.id, pr.name as nama, pr.price as harga, pr.stock as stok, pr.is_active as aktif,
             pr.diblokir, pr.alasan_blokir, pr.image_url as foto, pr.created_at as dibuat
      from products pr where pr.seller_id = p_seller) p), '[]'::jsonb)
  );
end $$;
revoke all on function public.detail_toko_terlapor(uuid) from public, anon;
grant execute on function public.detail_toko_terlapor(uuid) to authenticated;

-- Riwayat tindakan admin (hanya admin platform).
create or replace function public.log_admin_baca(p_batas int default 50)
returns table(id bigint, dibuat timestamptz, aksi text, toko text, produk text, alasan text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Hanya admin platform'; end if;
  return query
    select g.id, g.dibuat, g.aksi, s.name, p.name, g.alasan
      from log_admin g
      left join sellers s on s.id = g.seller_id
      left join products p on p.id = g.product_id
      order by g.dibuat desc
      limit least(greatest(coalesce(p_batas, 50), 1), 200);
end $$;
revoke all on function public.log_admin_baca(int) from public, anon;
grant execute on function public.log_admin_baca(int) to authenticated;

-- ========================================================================
-- VERIFIKASI (jalankan setelah 0020, hasil yang diharapkan ada di komentar)
-- ========================================================================
-- select
--   (select count(*) from public.categories where seller_id is null)                                   as kategori_tanpa_toko,   -- 0
--   (select count(*) from pg_policies where policyname = 'kategori_platform')                          as policy_platform_lama,  -- 0
--   (select count(*) from pg_proc where proname in ('laporkan_toko','daftar_laporan','tutup_laporan','blokir_produk','detail_toko_terlapor','log_admin_baca','products_jaga_blokir','products_cek_kategori')) as fungsi_baru, -- 8
--   (select count(*) from pg_proc where proname = 'atur_toko_aktif')                                   as atur_toko_aktif,       -- 1 (hanya versi 3 argumen)
--   (select count(*) from pg_trigger where tgname in ('products_jaga_blokir','products_cek_kategori','categories_isi_seller') and not tgisinternal) as trigger_baru, -- 3
--   (select count(*) from information_schema.tables where table_name in ('laporan_toko','log_admin') and table_schema = 'public') as tabel_baru; -- 2
