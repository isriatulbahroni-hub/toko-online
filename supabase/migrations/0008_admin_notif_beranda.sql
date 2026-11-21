-- Pengaturan beranda dari admin dan notifikasi Telegram untuk penjual.

alter table sellers add column if not exists beranda jsonb not null default '{}'::jsonb;
alter table sellers drop constraint if exists beranda_ukuran;
alter table sellers add constraint beranda_ukuran check (pg_column_size(beranda) < 20000);
grant select (beranda) on sellers to anon, authenticated;
grant update (beranda) on sellers to authenticated;

create extension if not exists pg_net;

create table if not exists notif_telegram (
  id int primary key default 1 check (id = 1),
  bot_token text not null,
  chat_id text not null,
  aktif boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table notif_telegram enable row level security;
revoke all on notif_telegram from anon, authenticated;

create or replace function kirim_telegram(teks text) returns void
language plpgsql security definer set search_path = public as $$
declare n notif_telegram;
begin
  select * into n from notif_telegram where id = 1 and aktif;
  if not found or n.bot_token = '' then return; end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || n.bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', n.chat_id, 'text', teks)
  );
exception when others then
  null;
end $$;
revoke all on function kirim_telegram(text) from public, anon, authenticated;

create or replace function notif_pesanan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform kirim_telegram(concat('Pesanan baru ', left(new.id::text, 8), E'\n', new.buyer_name, E'\nTotal Rp', new.total::bigint, E'\nStatus: menunggu pembayaran'));
  elsif new.bukti_path is not null and old.bukti_path is distinct from new.bukti_path then
    perform kirim_telegram(concat('Bukti bayar masuk untuk pesanan ', left(new.id::text, 8), E'\n', new.buyer_name, E'\nTotal Rp', new.total::bigint));
  end if;
  return null;
end $$;
revoke all on function notif_pesanan() from public, anon, authenticated;

drop trigger if exists notif_pesanan_ins on orders;
create trigger notif_pesanan_ins after insert on orders
  for each row execute function notif_pesanan();
drop trigger if exists notif_pesanan_bukti on orders;
create trigger notif_pesanan_bukti after update of bukti_path on orders
  for each row execute function notif_pesanan();

create or replace function simpan_notif_telegram(p_token text, p_chat text, p_aktif boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare t text := coalesce(trim(p_token), '');
declare c text := coalesce(trim(p_chat), '');
begin
  if not exists (select 1 from sellers where owner_id = auth.uid()) then
    raise exception 'Hanya penjual yang boleh mengubah ini';
  end if;
  if c !~ '^-?[0-9]+$' then
    raise exception 'Chat ID harus berupa angka';
  end if;
  if t <> '' and t !~ '^[0-9]+:[A-Za-z0-9_-]{20,}$' then
    raise exception 'Format token bot tidak valid';
  end if;
  if t = '' and not exists (select 1 from notif_telegram where bot_token <> '') then
    raise exception 'Token bot wajib diisi';
  end if;
  insert into notif_telegram (id, bot_token, chat_id, aktif)
  values (1, t, c, p_aktif)
  on conflict (id) do update set
    bot_token = case when t = '' then notif_telegram.bot_token else t end,
    chat_id = c, aktif = p_aktif, updated_at = now();
end $$;

create or replace function status_notif_telegram() returns table (aktif boolean, chat_id text, token_akhir text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sellers where owner_id = auth.uid()) then
    raise exception 'Hanya penjual yang boleh melihat ini';
  end if;
  return query select n.aktif, n.chat_id, right(n.bot_token, 4) from notif_telegram n where n.id = 1;
end $$;

create or replace function tes_notif_telegram() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sellers where owner_id = auth.uid()) then
    raise exception 'Hanya penjual yang boleh mengirim tes';
  end if;
  perform kirim_telegram('Tes notifikasi dari admin toko. Jika pesan ini masuk, notifikasi pesanan sudah aktif.');
end $$;

revoke all on function simpan_notif_telegram(text, text, boolean) from public, anon;
revoke all on function status_notif_telegram() from public, anon;
revoke all on function tes_notif_telegram() from public, anon;
grant execute on function simpan_notif_telegram(text, text, boolean) to authenticated;
grant execute on function status_notif_telegram() to authenticated;
grant execute on function tes_notif_telegram() to authenticated;
