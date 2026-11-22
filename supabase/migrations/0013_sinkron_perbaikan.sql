-- 0013: perbaikan hasil audit sinkron database, admin, dan etalase.

-- 1. Notifikasi Telegram pesanan baru memakai total yang benar.
--    Sebelumnya dikirim saat INSERT, padahal total baru diisi setelahnya (selalu Rp0).
--    buat_pesanan selalu mengisi voucher_kode pada UPDATE terakhirnya, jadi trigger ini menyala tepat sekali per pesanan.
create or replace function public.notif_pesanan_baru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform kirim_telegram(concat('Pesanan baru ', left(new.id::text, 8), E'\n', new.buyer_name, E'\nTotal Rp', new.total::bigint, E'\nStatus: menunggu pembayaran'));
  return null;
end $$;
drop trigger if exists notif_pesanan_ins on public.orders;
drop trigger if exists notif_pesanan_baru on public.orders;
create trigger notif_pesanan_baru after update of voucher_kode on public.orders
  for each row execute function public.notif_pesanan_baru();

-- 2. Stok produk yang punya varian selalu = jumlah stok varian, meski diubah dari form produk di admin.
create or replace function public.jaga_stok_varian() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from varian where product_id = new.id) then
    new.stock := (select coalesce(sum(stok), 0) from varian where product_id = new.id);
  end if;
  return new;
end $$;
drop trigger if exists products_jaga_stok on public.products;
create trigger products_jaga_stok before update of stock on public.products
  for each row execute function public.jaga_stok_varian();

-- 3. Pesanan dibatalkan: voucher juga dikembalikan (stok dan koin sudah dikembalikan sebelumnya).
create or replace function public.kembalikan_stok() returns trigger
language plpgsql security definer set search_path to 'public' as $f$
begin
  if new.status <> old.status and (old.status, new.status) not in (
    ('baru','dibayar'), ('baru','batal'), ('dibayar','dikirim'), ('dibayar','batal'), ('dikirim','selesai')
  ) then
    raise exception 'Perubahan status % ke % tidak diizinkan', old.status, new.status;
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

-- 4. Pengerasan hasil advisor keamanan.
alter function public.saldo_koin() set search_path = public;
revoke execute on function public.kembalikan_stok(), public.koin_status(), public.sinkron_stok_varian(),
  public.batasi_alamat(), public.notif_pesanan(), public.notif_pesanan_baru(), public.jaga_stok_varian()
  from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.produk_terjual from anon, authenticated;
