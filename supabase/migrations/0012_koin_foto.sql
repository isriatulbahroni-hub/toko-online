alter table public.profiles add column if not exists foto_path text;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
 values ('avatar', 'avatar', true, 2097152, array['image/jpeg']) on conflict (id) do nothing;
create policy avatar_tulis on storage.objects for insert to authenticated
 with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatar_hapus on storage.objects for delete to authenticated
 using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.koin_log(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid references public.orders(id) on delete set null,
 jenis text not null check (jenis in ('dapat','pakai','kembali')),
 jumlah int not null check (jumlah <> 0),
 ket text,
 created_at timestamptz not null default now());
create unique index if not exists koin_log_order_jenis on public.koin_log(order_id, jenis) where order_id is not null;
alter table public.koin_log enable row level security;
create policy koin_baca_sendiri on public.koin_log for select to authenticated using (user_id = auth.uid());
grant select on public.koin_log to authenticated;
alter table public.orders add column if not exists koin_pakai int not null default 0;

create or replace function public.saldo_koin() returns int language sql stable as
$f$ select coalesce(sum(jumlah), 0)::int from public.koin_log where user_id = auth.uid() $f$;
revoke all on function public.saldo_koin() from public, anon;
grant execute on function public.saldo_koin() to authenticated;

create or replace function public.pakai_koin(p_order uuid, p_jumlah int) returns int
language plpgsql security definer set search_path to 'public' as $f$
declare o orders%rowtype; saldo int; pakai int;
begin
  if auth.uid() is null then raise exception 'Masuk dulu'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into o from orders where id = p_order and buyer_id = auth.uid() and status = 'baru' and koin_pakai = 0 for update;
  if not found then raise exception 'Pesanan tidak valid untuk memakai koin'; end if;
  select coalesce(sum(jumlah), 0) into saldo from koin_log where user_id = auth.uid();
  pakai := least(coalesce(p_jumlah, 0), saldo, o.total - o.ongkir);
  if pakai <= 0 then raise exception 'Koin tidak cukup'; end if;
  insert into koin_log(user_id, order_id, jenis, jumlah, ket) values (auth.uid(), p_order, 'pakai', -pakai, 'Dipakai untuk pesanan');
  update orders set total = total - pakai, koin_pakai = pakai where id = p_order;
  return pakai;
end $f$;
revoke all on function public.pakai_koin(uuid,int) from public, anon;
grant execute on function public.pakai_koin(uuid,int) to authenticated;

create or replace function public.koin_status() returns trigger
language plpgsql security definer set search_path to 'public' as $f$
begin
  if new.status = 'selesai' and old.status <> 'selesai' and new.buyer_id is not null and new.total / 1000 > 0 then
    insert into koin_log(user_id, order_id, jenis, jumlah, ket)
      values (new.buyer_id, new.id, 'dapat', new.total / 1000, 'Belanja selesai') on conflict do nothing;
  elsif new.status = 'batal' and old.status <> 'batal' and new.koin_pakai > 0 then
    insert into koin_log(user_id, order_id, jenis, jumlah, ket)
      values (new.buyer_id, new.id, 'kembali', new.koin_pakai, 'Pesanan dibatalkan') on conflict do nothing;
  end if;
  return null;
end $f$;
drop trigger if exists orders_koin on public.orders;
create trigger orders_koin after update of status on public.orders for each row execute function public.koin_status();
