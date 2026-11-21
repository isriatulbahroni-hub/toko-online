-- Admin penjual: login Supabase Auth, kelola produk, pesanan, dan foto.
alter table sellers add column if not exists owner_id uuid references auth.users(id);

create policy owner_penjual on sellers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy owner_produk on products for all to authenticated
  using (seller_id in (select id from sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from sellers where owner_id = auth.uid()));

create policy owner_pesanan_baca on orders for select to authenticated
  using (seller_id in (select id from sellers where owner_id = auth.uid()));
create policy owner_pesanan_ubah on orders for update to authenticated
  using (seller_id in (select id from sellers where owner_id = auth.uid()))
  with check (seller_id in (select id from sellers where owner_id = auth.uid()));

create policy owner_item_baca on order_items for select to authenticated
  using (order_id in (select o.id from orders o join sellers s on s.id = o.seller_id where s.owner_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('produk', 'produk', true) on conflict (id) do nothing;
create policy produk_foto_baca on storage.objects for select to anon, authenticated using (bucket_id = 'produk');
create policy produk_foto_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'produk' and exists (select 1 from public.sellers where owner_id = auth.uid()));
create policy produk_foto_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'produk' and exists (select 1 from public.sellers where owner_id = auth.uid()));

-- Tautkan akun login ke toko (jalankan sekali, ganti email):
-- update sellers set owner_id = (select id from auth.users where email = 'EMAIL_ADMIN') where is_active;
