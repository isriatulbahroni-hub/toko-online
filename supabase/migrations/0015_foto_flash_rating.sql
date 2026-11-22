-- 0015: multi-foto produk, flash sale, ringkasan rating, indeks pencarian, pengerasan hak akses.
-- Sudah diterapkan di Supabase (0015 dan 0015b). Aman dijalankan ulang.

-- 1. Multi-foto produk (foto utama tetap di products.image_url)
create table if not exists produk_foto (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null check (char_length(url) <= 500 and url like 'https://%'),
  urut int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists produk_foto_product_idx on produk_foto(product_id, urut);
alter table produk_foto enable row level security;

drop policy if exists pf_baca on produk_foto;
create policy pf_baca on produk_foto for select
  using (exists (select 1 from products p where p.id = product_id));

drop policy if exists pf_penjual on produk_foto;
create policy pf_penjual on produk_foto for all to authenticated
  using (exists (select 1 from products p join sellers s on s.id = p.seller_id where p.id = product_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from products p join sellers s on s.id = p.seller_id where p.id = product_id and s.owner_id = auth.uid()));

create or replace function batasi_foto_produk() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from produk_foto where product_id = new.product_id) >= 8 then
    raise exception 'Maksimal 8 foto tambahan per produk';
  end if;
  return new;
end $$;
drop trigger if exists produk_foto_batas on produk_foto;
create trigger produk_foto_batas before insert on produk_foto
  for each row execute function batasi_foto_produk();

-- 2. Flash sale: potongan persen pada rentang waktu, berlaku juga untuk harga varian
alter table products
  add column if not exists flash_persen int,
  add column if not exists flash_mulai timestamptz,
  add column if not exists flash_selesai timestamptz;
alter table products drop constraint if exists products_flash_valid;
alter table products add constraint products_flash_valid check (
  (flash_persen is null and flash_mulai is null and flash_selesai is null)
  or (flash_persen between 1 and 90 and flash_mulai is not null and flash_selesai is not null and flash_selesai > flash_mulai)
);

create or replace function harga_flash(p_dasar int, p products) returns int
language sql stable set search_path = public as $$
  select case
    when p.flash_persen is not null and now() >= p.flash_mulai and now() < p.flash_selesai
    then greatest(1, round(p_dasar * (100 - p.flash_persen) / 100.0)::int)
    else p_dasar end
$$;

-- buat_pesanan memakai harga_flash (harga dihitung di server, tidak percaya harga dari browser)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);
  if position('harga_flash' in d) = 0 then
    d := replace(d, 'v_price := coalesce(vr.harga, pr.price);', 'v_price := harga_flash(coalesce(vr.harga, pr.price), pr);');
    d := replace(d, 'v_price := pr.price;', 'v_price := harga_flash(pr.price, pr);');
    execute d;
  end if;
end $$;

-- 3. Ringkasan rating per produk (mengikuti RLS pemanggil)
create or replace view produk_rating with (security_invoker = true) as
  select product_id, round(avg(rating)::numeric, 1) as rata, count(*)::int as jumlah
  from ulasan group by product_id;
revoke all on public.produk_rating from anon, authenticated;
grant select on public.produk_rating to anon, authenticated;

-- 4. Pencarian nama produk lebih cepat
create extension if not exists pg_trgm with schema extensions;
create index if not exists products_name_trgm on products using gin (name extensions.gin_trgm_ops);

-- 5. Pengerasan: peran anon/authenticated tidak perlu TRUNCATE, REFERENCES, TRIGGER
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
