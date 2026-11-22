-- 0017: Pusat voucher (klaim) dan koin harian (check-in). Jalankan di Supabase SQL Editor.
-- Hadiah check-in hari ke-1..7: 5, 5, 10, 10, 15, 15, 50 koin (1 koin = Rp1), lalu mengulang.
-- Jika angka diubah, ubah juga konstanta HAR di pusat.js.

-- Voucher publik: tampil di Pusat Voucher dan bisa diklaim semua pembeli yang masuk.
alter table public.voucher add column if not exists publik boolean not null default false;

create table if not exists public.voucher_klaim(
 voucher_id uuid not null references public.voucher(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (voucher_id, user_id));
alter table public.voucher_klaim enable row level security;
create policy voucher_klaim_baca on public.voucher_klaim for select to authenticated using (user_id = auth.uid());
grant select on public.voucher_klaim to authenticated;

-- Daftar voucher publik. Kode hanya dikirim ke pembeli yang sudah mengklaimnya.
create or replace function public.voucher_pusat()
returns table(id uuid, kode text, jenis text, nilai int, min_belanja int, maks_potongan int, berlaku_sampai timestamptz, sisa int, diklaim boolean, dipakai boolean)
language sql stable security definer set search_path to 'public' as $f$
 select v.id,
  case when k.user_id is not null then v.kode end,
  v.jenis, v.nilai, v.min_belanja, v.maks_potongan, v.berlaku_sampai,
  case when v.kuota is null then null else greatest(v.kuota - v.terpakai, 0) end,
  (k.user_id is not null),
  (p.user_id is not null)
 from voucher v
 left join voucher_klaim k on k.voucher_id = v.id and k.user_id = auth.uid()
 left join voucher_pakai p on p.voucher_id = v.id and p.user_id = auth.uid()
 where v.aktif and v.publik
  and (v.berlaku_sampai is null or v.berlaku_sampai > now())
  and (v.kuota is null or v.terpakai < v.kuota)
 order by v.created_at desc
$f$;
revoke all on function public.voucher_pusat() from public, anon;
grant execute on function public.voucher_pusat() to authenticated;

create or replace function public.klaim_voucher(p_id uuid) returns text
language plpgsql security definer set search_path to 'public' as $f$
declare v voucher%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk klaim voucher'; end if;
  select * into v from voucher
    where id = p_id and aktif and publik
      and (berlaku_sampai is null or berlaku_sampai > now())
      and (kuota is null or terpakai < kuota);
  if not found then raise exception 'Voucher tidak tersedia'; end if;
  insert into voucher_klaim(voucher_id, user_id) values (v.id, auth.uid()) on conflict do nothing;
  return v.kode;
end $f$;
revoke all on function public.klaim_voucher(uuid) from public, anon;
grant execute on function public.klaim_voucher(uuid) to authenticated;

-- Koin harian
alter table public.koin_log drop constraint if exists koin_log_jenis_check;
alter table public.koin_log add constraint koin_log_jenis_check check (jenis in ('dapat','pakai','kembali','harian'));

create table if not exists public.koin_harian(
 user_id uuid not null references auth.users(id) on delete cascade,
 tanggal date not null,
 beruntun int not null check (beruntun > 0),
 jumlah int not null check (jumlah > 0),
 primary key (user_id, tanggal));
alter table public.koin_harian enable row level security;
create policy koin_harian_baca on public.koin_harian for select to authenticated using (user_id = auth.uid());
grant select on public.koin_harian to authenticated;

create or replace function public.checkin_koin() returns table(koin int, hari_ke int)
language plpgsql security definer set search_path to 'public' as $f$
declare hari date := (now() at time zone 'Asia/Jakarta')::date;
  prev int; urut int; n int;
  tabel int[] := array[5,5,10,10,15,15,50];
begin
  if auth.uid() is null then raise exception 'Masuk dulu'; end if;
  perform pg_advisory_xact_lock(hashtext('checkin' || auth.uid()::text));
  if exists (select 1 from koin_harian h where h.user_id = auth.uid() and h.tanggal = hari) then
    raise exception 'Hari ini sudah check-in, kembali lagi besok';
  end if;
  select h.beruntun into prev from koin_harian h where h.user_id = auth.uid() and h.tanggal = hari - 1;
  urut := coalesce(prev, 0) + 1;
  n := tabel[((urut - 1) % 7) + 1];
  insert into koin_harian(user_id, tanggal, beruntun, jumlah) values (auth.uid(), hari, urut, n);
  insert into koin_log(user_id, jenis, jumlah, ket) values (auth.uid(), 'harian', n, 'Check-in harian hari ke-' || urut);
  return query select n, urut;
end $f$;
revoke all on function public.checkin_koin() from public, anon;
grant execute on function public.checkin_koin() to authenticated;

create or replace function public.status_checkin() returns table(sudah boolean, hari_ke int, hadiah int)
language plpgsql stable security definer set search_path to 'public' as $f$
declare hari date := (now() at time zone 'Asia/Jakarta')::date;
  tabel int[] := array[5,5,10,10,15,15,50];
  skrg int; prev int; urut int;
begin
  if auth.uid() is null then raise exception 'Masuk dulu'; end if;
  select h.beruntun into skrg from koin_harian h where h.user_id = auth.uid() and h.tanggal = hari;
  if skrg is not null then
    return query select true, skrg, tabel[(skrg % 7) + 1];
    return;
  end if;
  select h.beruntun into prev from koin_harian h where h.user_id = auth.uid() and h.tanggal = hari - 1;
  urut := coalesce(prev, 0) + 1;
  return query select false, urut, tabel[((urut - 1) % 7) + 1];
end $f$;
revoke all on function public.status_checkin() from public, anon;
grant execute on function public.status_checkin() to authenticated;
