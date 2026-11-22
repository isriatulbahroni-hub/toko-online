-- Warna utama toko, bisa diganti dari admin (admin-toko.html, tab Warna toko).
-- Format wajib #rrggbb. Kosong (null) berarti memakai warna bawaan etalase.

alter table sellers add column if not exists warna text;
alter table sellers drop constraint if exists warna_format;
alter table sellers add constraint warna_format check (warna is null or warna ~ '^#[0-9a-fA-F]{6}$');
grant select (warna) on sellers to anon, authenticated;
grant update (warna) on sellers to authenticated;
