create table if not exists public.varian(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 nama text not null check (char_length(nama) between 1 and 60),
 harga int check (harga > 0),
 stok int not null default 0 check (stok >= 0),
 urut int not null default 0,
 created_at timestamptz not null default now(),
 unique (product_id, nama));
create index if not exists varian_product_idx on public.varian(product_id, urut);
alter table public.varian enable row level security;
create policy varian_publik on public.varian for select to anon, authenticated
 using (exists (select 1 from public.products p join public.sellers s on s.id = p.seller_id and s.is_active where p.id = varian.product_id and p.is_active));
create policy varian_penjual on public.varian for all to authenticated
 using (exists (select 1 from public.products p where p.id = varian.product_id and p.seller_id in (select id from public.sellers where owner_id = auth.uid())))
 with check (exists (select 1 from public.products p where p.id = varian.product_id and p.seller_id in (select id from public.sellers where owner_id = auth.uid())));
grant select on public.varian to anon, authenticated;
grant insert, update, delete on public.varian to authenticated;
alter table public.order_items add column if not exists varian_id uuid references public.varian(id) on delete set null;

create or replace function public.sinkron_stok_varian() returns trigger
language plpgsql security definer set search_path to 'public' as $f$
declare pid uuid := case tg_op when 'DELETE' then old.product_id else new.product_id end;
begin
  update products set stock = (select coalesce(sum(stok), 0) from varian where product_id = pid) where id = pid;
  return null;
end $f$;
drop trigger if exists varian_sinkron on public.varian;
create trigger varian_sinkron after insert or update of stok, product_id or delete on public.varian
  for each row execute function public.sinkron_stok_varian();

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
  end if;
  return new;
end $f$;

drop function if exists public.buat_pesanan(text,text,text,jsonb,uuid,text);
create function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb, p_ongkir uuid default null, p_voucher text default null)
returns table(order_id uuid, total integer)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_seller uuid; v_order uuid; v_total int := 0; it jsonb; pr products%rowtype; v_qty int;
  v_ongkir int := 0; v_wilayah text; v_pot int := 0; v_vid uuid; v_kode text := nullif(upper(trim(coalesce(p_voucher,''))),'');
  v_var uuid; vr varian%rowtype; v_price int;
begin
  if v_user is null then raise exception 'Masuk dulu untuk membeli'; end if;
  p_nama := trim(coalesce(p_nama, '')); p_telp := trim(coalesce(p_telp, '')); p_alamat := trim(coalesce(p_alamat, ''));
  if p_nama = '' or char_length(p_nama) > 100 then raise exception 'Nama wajib diisi (maks. 100 huruf)'; end if;
  if p_telp !~ '^[0-9+ -]{8,20}$' then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if char_length(p_alamat) < 10 or char_length(p_alamat) > 500 then raise exception 'Alamat 10 sampai 500 huruf'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'Terlalu banyak jenis produk dalam satu pesanan'; end if;
  if (select count(*) from orders where buyer_id = v_user and status = 'baru') >= 3 then
    raise exception 'Selesaikan dulu pesanan yang belum dibayar (maksimal 3)';
  end if;
  if exists (select 1 from ongkir) then
    if p_ongkir is null then raise exception 'Pilih tujuan pengiriman'; end if;
    select o.tarif, o.wilayah into v_ongkir, v_wilayah from ongkir o where o.id = p_ongkir;
    if not found then raise exception 'Tujuan pengiriman tidak valid'; end if;
  end if;
  select p.seller_id into v_seller from products p
    join sellers s on s.id = p.seller_id and s.is_active
    where p.id = ((p_items->0)->>'id')::uuid and p.is_active;
  if v_seller is null then raise exception 'Produk tidak tersedia'; end if;
  insert into orders(seller_id, buyer_id, buyer_name, buyer_phone, address, ongkir, wilayah)
    values (v_seller, v_user, p_nama, p_telp, p_alamat, v_ongkir, v_wilayah) returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'qty')::int;
    v_var := nullif(it->>'v','')::uuid;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Jumlah tidak valid'; end if;
    select * into pr from products where id = (it->>'id')::uuid and is_active and seller_id = v_seller for update;
    if not found then raise exception 'Produk tidak tersedia'; end if;
    if exists (select 1 from varian where product_id = pr.id) then
      if v_var is null then raise exception 'Pilih varian untuk %', pr.name; end if;
      select * into vr from varian where id = v_var and product_id = pr.id for update;
      if not found then raise exception 'Varian tidak tersedia'; end if;
      if vr.stok < v_qty then raise exception 'Stok % (%) tidak cukup', pr.name, vr.nama; end if;
      update varian set stok = stok - v_qty where id = vr.id;
      v_price := coalesce(vr.harga, pr.price);
      insert into order_items(order_id, product_id, varian_id, name, price, qty)
        values (v_order, pr.id, vr.id, pr.name || ' (' || vr.nama || ')', v_price, v_qty);
    else
      if pr.stock < v_qty then raise exception 'Stok % tidak cukup', pr.name; end if;
      update products set stock = stock - v_qty where id = pr.id;
      v_price := pr.price;
      insert into order_items(order_id, product_id, name, price, qty) values (v_order, pr.id, pr.name, v_price, v_qty);
    end if;
    v_total := v_total + v_price * v_qty;
  end loop;
  if v_kode is not null then
    v_pot := cek_voucher(v_kode, v_total);
    update voucher set terpakai = terpakai + 1
      where upper(kode) = v_kode and (kuota is null or terpakai < kuota) returning id into v_vid;
    if v_vid is null then raise exception 'Voucher tidak valid atau sudah habis'; end if;
    insert into voucher_pakai(voucher_id, user_id, order_id) values (v_vid, v_user, v_order);
  end if;
  update orders set total = v_total - v_pot + v_ongkir, potongan = v_pot, voucher_kode = v_kode where id = v_order;
  insert into profiles(id, nama, telp, alamat) values (v_user, p_nama, p_telp, p_alamat)
    on conflict (id) do update set nama = excluded.nama, telp = excluded.telp, alamat = excluded.alamat, updated_at = now();
  return query select v_order, v_total - v_pot + v_ongkir;
end $function$;
revoke all on function public.buat_pesanan(text,text,text,jsonb,uuid,text) from public, anon;
grant execute on function public.buat_pesanan(text,text,text,jsonb,uuid,text) to authenticated;
