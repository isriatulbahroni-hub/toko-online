create table if not exists public.ulasan(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 nama text not null default 'Pembeli',
 rating int not null check (rating between 1 and 5),
 isi text check (char_length(isi)<=500),
 created_at timestamptz not null default now(),
 unique(order_id,product_id));
create index if not exists ulasan_product_idx on public.ulasan(product_id,created_at desc);
alter table public.ulasan enable row level security;
create policy ulasan_baca on public.ulasan for select using (true);
create policy ulasan_tulis on public.ulasan for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id where o.id=ulasan.order_id and o.buyer_id=auth.uid() and o.status='selesai' and i.product_id=ulasan.product_id));
create policy ulasan_hapus on public.ulasan for delete to authenticated using (user_id=auth.uid());
grant select on public.ulasan to anon, authenticated;
grant insert, delete on public.ulasan to authenticated;
