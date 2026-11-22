-- 0014: penjual boleh menghapus ulasan pada produk tokonya (moderasi dari admin).
drop policy if exists ulasan_hapus_penjual on public.ulasan;
create policy ulasan_hapus_penjual on public.ulasan for delete to authenticated
  using (exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = ulasan.product_id and s.owner_id = auth.uid()));
revoke insert, update, delete, truncate, references, trigger on public.ulasan from anon;
