-- 0004: kategori, harga coret, jumlah terjual, dan pembatalan pesanan oleh pembeli.
-- Jalankan di SQL Editor Supabase setelah 0003, SEBELUM situs baru dipasang.

-- 1. Kategori (dibaca publik, dikelola penjual)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique check (char_length(nama) <= 60),
  urut int not null default 0
);
alter table categories enable row level security;
create policy kategori_publik on categories for select to anon, authenticated using (true);
create policy kategori_penjual on categories for all to authenticated
  using (exists (select 1 from sellers where owner_id = auth.uid()))
  with check (exists (select 1 from sellers where owner_id = auth.uid()));
revoke insert, update, delete on categories from anon;

insert into categories(nama, urut) values
  ('Kain Songket', 1), ('Selendang dan Syal', 2), ('Busana', 3), ('Aksesori', 4), ('Lainnya', 5)
on conflict (nama) do nothing;

-- 2. Produk: kategori dan harga coret (harga sebelum diskon, opsional)
alter table products add column if not exists category_id uuid references categories(id) on delete set null;
alter table products add column if not exists harga_coret int;
alter table products drop constraint if exists harga_coret_valid;
alter table products add constraint harga_coret_valid check (harga_coret is null or harga_coret > price);

-- 3. Jumlah terjual per produk aktif (hanya pesanan dibayar, dikirim, selesai).
--    View ini dimiliki pemilik skema sehingga bisa menghitung pesanan tanpa membuka data pembeli.
create or replace view public.produk_terjual as
select p.id as product_id,
       coalesce(sum(i.qty) filter (where o.status in ('dibayar', 'dikirim', 'selesai')), 0)::int as terjual
from products p
join sellers s on s.id = p.seller_id and s.is_active
left join order_items i on i.product_id = p.id
left join orders o on o.id = i.order_id
where p.is_active
group by p.id;
grant select on public.produk_terjual to anon, authenticated;

-- 4. Pembeli membatalkan pesanannya sendiri selama masih 'baru' (stok kembali lewat trigger 0003)
create or replace function public.batalkan_pesanan_saya(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'batal'
    where id = p_order and buyer_id = auth.uid() and status = 'baru';
  if not found then raise exception 'Pesanan tidak bisa dibatalkan'; end if;
end $$;
revoke all on function public.batalkan_pesanan_saya(uuid) from public, anon;
grant execute on function public.batalkan_pesanan_saya(uuid) to authenticated;
