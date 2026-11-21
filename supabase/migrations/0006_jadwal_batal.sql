-- 0006: batalkan pesanan tidak dibayar otomatis tiap 30 menit (butuh extension pg_cron).
create extension if not exists pg_cron;
select cron.schedule('batal-kedaluwarsa', '*/30 * * * *', 'select public.batalkan_pesanan_kedaluwarsa(24)');
