-- 0003: akun pembeli (wajib untuk membeli), stok kembali saat batal, pengetatan hak akses.
-- Jalankan di SQL Editor Supabase setelah 0001 dan 0002.

-- 1. Profil pembeli (nama, telepon, alamat tersimpan)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null default '' check (char_length(nama) <= 100),
  telp text not null default '' check (char_length(telp) <= 20),
  alamat text not null default '' check (char_length(alamat) <= 500),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profil_sendiri on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 2. Pesanan terhubung ke akun pembeli; pembeli hanya bisa membaca pesanannya sendiri
alter table orders add column if not exists buyer_id uuid references auth.users(id);
create policy pembeli_pesanan_baca on orders for select to authenticated
  using (buyer_id = auth.uid());
create policy pembeli_item_baca on order_items for select to authenticated
  using (order_id in (select id from orders where buyer_id = auth.uid()));

-- 3. Pengetatan hak akses. Pendaftaran pembeli dibuka, jadi "authenticated" tidak lagi
--    berarti penjual. Penjual hanya boleh mengubah nama/WA tokonya dan status pesanan.
drop policy if exists owner_penjual on sellers;
create policy owner_penjual_baca on sellers for select to authenticated
  using (owner_id = auth.uid());
create policy owner_penjual_ubah on sellers for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke insert, update, delete on sellers, products, orders, order_items from anon;
revoke insert, update, delete on sellers from authenticated;
grant update (name, wa) on sellers to authenticated;
revoke insert, update, delete on orders, order_items from authenticated;
grant update (status) on orders to authenticated;

-- 4. Pesanan hanya untuk pembeli yang sudah masuk, dengan batas dan validasi
create or replace function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb)
returns table(order_id uuid, total int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid; v_order uuid; v_total int := 0; it jsonb; pr products%rowtype; v_qty int;
begin
  if v_user is null then raise exception 'Masuk dulu untuk membeli'; end if;
  p_nama := trim(coalesce(p_nama, '')); p_telp := trim(coalesce(p_telp, '')); p_alamat := trim(coalesce(p_alamat, ''));
  if p_nama = '' or char_length(p_nama) > 100 then raise exception 'Nama wajib diisi (maks. 100 huruf)'; end if;
  if p_telp !~ '^[0-9+ -]{8,20}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if char_length(p_alamat) < 10 or char_length(p_alamat) > 500 then raise exception 'Alamat 10 sampai 500 huruf'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Terlalu banyak jenis produk dalam satu pesanan'; end if;
  if (select count(*) from orders where buyer_id = v_user and status = 'baru') >= 3 then
    raise exception 'Selesaikan dulu pesanan yang belum dibayar (maksimal 3)';
  end if;
  select p.seller_id into v_seller from products p
    join sellers s on s.id = p.seller_id and s.is_active
    where p.id = ((p_items->0)->>'id')::uuid and p.is_active;
  if v_seller is null then raise exception 'Produk tidak tersedia'; end if;
  insert into orders(seller_id, buyer_id, buyer_name, buyer_phone, address)
    values (v_seller, v_user, p_nama, p_telp, p_alamat) returning id into v_order;
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
  -- simpan data pengiriman terakhir untuk checkout berikutnya
  insert into profiles(id, nama, telp, alamat) values (v_user, p_nama, p_telp, p_alamat)
    on conflict (id) do update set nama = excluded.nama, telp = excluded.telp, alamat = excluded.alamat, updated_at = now();
  return query select v_order, v_total;
end $$;

revoke all on function public.buat_pesanan(text, text, text, jsonb) from public, anon;
grant execute on function public.buat_pesanan(text, text, text, jsonb) to authenticated;

-- 5. Stok kembali otomatis saat pesanan dibatalkan
create or replace function public.kembalikan_stok()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'batal' and new.status <> 'batal' then
    raise exception 'Pesanan yang sudah dibatalkan tidak bisa dibuka lagi';
  end if;
  if new.status = 'batal' and old.status <> 'batal' then
    if old.status in ('dikirim', 'selesai') then
      raise exception 'Pesanan yang sudah dikirim tidak bisa dibatalkan';
    end if;
    update products p set stock = p.stock + i.qty
      from order_items i where i.order_id = new.id and i.product_id = p.id;
  end if;
  return new;
end $$;

drop trigger if exists orders_kembalikan_stok on orders;
create trigger orders_kembalikan_stok before update of status on orders
  for each row execute function public.kembalikan_stok();

-- 6. Pesanan yang tidak dibayar otomatis dibatalkan (stok ikut kembali lewat trigger di atas)
create or replace function public.batalkan_pesanan_kedaluwarsa(p_jam int default 24)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update orders set status = 'batal'
    where status = 'baru' and created_at < now() - make_interval(hours => p_jam);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.batalkan_pesanan_kedaluwarsa(int) from public, anon, authenticated;

-- Jadwalkan tiap 30 menit (aktifkan dulu extension pg_cron: Database > Extensions):
-- select cron.schedule('batal-kedaluwarsa', '*/30 * * * *', 'select public.batalkan_pesanan_kedaluwarsa(24)');
