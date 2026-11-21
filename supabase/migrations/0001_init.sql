-- Skema toko online: multi-penjual, tetapi hanya 1 penjual boleh aktif (dikunci di database).
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wa text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
-- KUNCI 1 PENJUAL. Untuk membuka marketplace: drop index ini.
create unique index if not exists hanya_satu_penjual_aktif on sellers ((true)) where is_active;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),
  name text not null,
  description text not null default '',
  price int not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references sellers(id),
  buyer_name text not null,
  buyer_phone text not null,
  address text not null,
  total int not null default 0,
  status text not null default 'baru' check (status in ('baru','dibayar','dikirim','selesai','batal')),
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  name text not null,
  price int not null,
  qty int not null check (qty > 0)
);

alter table sellers enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy penjual_publik on sellers for select to anon, authenticated using (is_active);
create policy produk_publik on products for select to anon, authenticated
  using (is_active and exists (select 1 from sellers s where s.id = seller_id and s.is_active));
-- orders dan order_items: tanpa policy untuk anon. Pembeli hanya lewat fungsi buat_pesanan.

create or replace function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb)
returns table(order_id uuid, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_seller uuid; v_order uuid; v_total int := 0; it jsonb; pr products%rowtype; v_qty int;
begin
  if coalesce(trim(p_nama),'') = '' or coalesce(trim(p_telp),'') = '' or coalesce(trim(p_alamat),'') = '' then
    raise exception 'Data pemesan belum lengkap';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;
  select p.seller_id into v_seller from products p
    join sellers s on s.id = p.seller_id and s.is_active
    where p.id = ((p_items->0)->>'id')::uuid and p.is_active;
  if v_seller is null then raise exception 'Produk tidak tersedia'; end if;
  insert into orders(seller_id, buyer_name, buyer_phone, address)
    values (v_seller, trim(p_nama), trim(p_telp), trim(p_alamat)) returning id into v_order;
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
  update orders set total = v_total where id = v_order;
  return query select v_order, v_total;
end $$;

revoke all on function public.buat_pesanan(text, text, text, jsonb) from public;
grant execute on function public.buat_pesanan(text, text, text, jsonb) to anon, authenticated;

-- Contoh data awal (jalankan manual, ganti isinya):
-- insert into sellers(name, wa, is_active) values ('Toko Saya', '628123456789', true);
-- insert into products(seller_id, name, description, price, stock)
--   select id, 'Produk contoh', 'Deskripsi', 25000, 10 from sellers where is_active;
