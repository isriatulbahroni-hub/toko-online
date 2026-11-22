create table if not exists public.voucher(
 id uuid primary key default gen_random_uuid(),
 kode text not null,
 jenis text not null check (jenis in ('persen','nominal')),
 nilai int not null check (nilai > 0),
 min_belanja int not null default 0 check (min_belanja >= 0),
 maks_potongan int check (maks_potongan > 0),
 kuota int check (kuota > 0),
 terpakai int not null default 0,
 berlaku_sampai timestamptz,
 aktif boolean not null default true,
 created_at timestamptz not null default now(),
 check (jenis <> 'persen' or nilai <= 100));
create unique index if not exists voucher_kode_uq on public.voucher (upper(kode));
create table if not exists public.voucher_pakai(
 voucher_id uuid not null references public.voucher(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid references public.orders(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key (voucher_id, user_id));
alter table public.voucher enable row level security;
alter table public.voucher_pakai enable row level security;
create policy voucher_penjual on public.voucher for all to authenticated
 using (exists (select 1 from public.sellers where sellers.owner_id = auth.uid()))
 with check (exists (select 1 from public.sellers where sellers.owner_id = auth.uid()));
create policy voucher_pakai_penjual on public.voucher_pakai for select to authenticated
 using (exists (select 1 from public.sellers where sellers.owner_id = auth.uid()));
grant select, insert, update, delete on public.voucher to authenticated;
grant select on public.voucher_pakai to authenticated;
alter table public.orders add column if not exists potongan int not null default 0;
alter table public.orders add column if not exists voucher_kode text;

create or replace function public.cek_voucher(p_kode text, p_subtotal int)
returns int language plpgsql security definer set search_path to 'public' as $f$
declare v voucher%rowtype; pot int;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk memakai voucher'; end if;
  select * into v from voucher
    where upper(kode) = upper(trim(coalesce(p_kode,''))) and aktif
      and (berlaku_sampai is null or berlaku_sampai > now())
      and (kuota is null or terpakai < kuota);
  if not found then raise exception 'Voucher tidak valid atau sudah habis'; end if;
  if exists (select 1 from voucher_pakai where voucher_id = v.id and user_id = auth.uid()) then
    raise exception 'Voucher ini sudah pernah Anda pakai'; end if;
  if p_subtotal < v.min_belanja then raise exception 'Minimal belanja Rp% untuk voucher ini', v.min_belanja; end if;
  pot := case v.jenis when 'persen' then p_subtotal * v.nilai / 100 else v.nilai end;
  if v.maks_potongan is not null then pot := least(pot, v.maks_potongan); end if;
  return least(pot, p_subtotal);
end $f$;
revoke all on function public.cek_voucher(text,int) from public, anon;
grant execute on function public.cek_voucher(text,int) to authenticated;

drop function if exists public.buat_pesanan(text,text,text,jsonb,uuid);
create function public.buat_pesanan(p_nama text, p_telp text, p_alamat text, p_items jsonb, p_ongkir uuid default null, p_voucher text default null)
returns table(order_id uuid, total integer)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user uuid := auth.uid();
  v_seller uuid; v_order uuid; v_total int := 0; it jsonb; pr products%rowtype; v_qty int;
  v_ongkir int := 0; v_wilayah text; v_pot int := 0; v_vid uuid; v_kode text := nullif(upper(trim(coalesce(p_voucher,''))),'');
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
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Jumlah tidak valid'; end if;
    select * into pr from products where id = (it->>'id')::uuid and is_active and seller_id = v_seller for update;
    if not found then raise exception 'Produk tidak tersedia'; end if;
    if pr.stock < v_qty then raise exception 'Stok % tidak cukup', pr.name; end if;
    update products set stock = stock - v_qty where id = pr.id;
    insert into order_items(order_id, product_id, name, price, qty) values (v_order, pr.id, pr.name, pr.price, v_qty);
    v_total := v_total + pr.price * v_qty;
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
