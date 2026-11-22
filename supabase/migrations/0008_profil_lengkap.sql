alter table public.profiles add column if not exists tgl_lahir date;
alter table public.profiles add column if not exists gender text check (gender in ('pria','wanita','lainnya'));
