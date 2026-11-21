# Garery Songket Sari Melati

Website toko online songket bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: etalase (daftar produk, detail, keranjang, checkout). Satu file, tanpa build.
- `admin.html`: panel penjual (login, tambah/ubah produk dengan foto, kelola status pesanan).
- `config.js`: nama toko, URL dan anon key Supabase, serta nomor WhatsApp penjual.
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`), `0002_admin.sql` (hak akses penjual, penyimpanan foto), dan `0003_pembeli_dan_stok.sql` (akun pembeli, stok kembali saat batal, pengetatan hak akses).
- `docs/RENCANA.md`: rencana tahap.
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat. Jalankan `0003_pembeli_dan_stok.sql` di SQL Editor (0001 dan 0002 sudah diterapkan).
2. Buat akun admin di Supabase (Authentication, Users, Add user), lalu tautkan ke toko dengan perintah di akhir `0002_admin.sql`.
3. Pembeli wajib daftar/masuk untuk membeli; pengunjung tanpa akun hanya bisa melihat produk. Biarkan pendaftaran (signup) tetap aktif di Authentication, dan atur apakah konfirmasi email diwajibkan.
4. Untuk membatalkan otomatis pesanan yang tidak dibayar, aktifkan extension `pg_cron` lalu jalankan perintah `cron.schedule` di akhir `0003`.
5. Isi `WA` di `config.js` (nomor penjual, format 628xxx).
6. Deploy repo ini ke Vercel atau GitHub Pages (situs statis, tanpa build). Admin ada di `/admin.html`.

## Belum ada

- Pembayaran online dan ongkir (sementara konfirmasi via WhatsApp).
- Notifikasi pesanan baru ke WhatsApp/Telegram (sementara: penanda "N baru" di tab Pesanan admin, dicek tiap 30 detik).
