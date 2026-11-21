-- Fitur akun pembeli: alamat tersimpan (maks. 10) dan favorit.

create table if not exists alamat_saya (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default 'Rumah' check (char_length(label) between 1 and 30),
  nama text not null check (char_length(nama) between 1 and 100),
  telp text not null check (telp ~ '^[0-9+ -]{8,20}$'),
  alamat text not null check (char_length(alamat) between 10 and 500),
  utama boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists alamat_utama_unik on alamat_saya (user_id) where utama;
create index if not exists alamat_user_idx on alamat_saya (user_id);

alter table alamat_saya enable row level security;
drop policy if exists alamat_sendiri on alamat_saya;
create policy alamat_sendiri on alamat_saya for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on alamat_saya from anon;

create or replace function batasi_alamat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from alamat_saya where user_id = new.user_id) >= 10 then
    raise exception 'Maksimal 10 alamat tersimpan';
  end if;
  return new;
end $$;
drop trigger if exists batasi_alamat_trg on alamat_saya;
create trigger batasi_alamat_trg before insert on alamat_saya
  for each row execute function batasi_alamat();

create table if not exists favorit (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table favorit enable row level security;
drop policy if exists favorit_sendiri on favorit;
create policy favorit_sendiri on favorit for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on favorit from anon;
