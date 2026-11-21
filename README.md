# Toko Online

Website toko online umum (berbagai produk) bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: etalase bergaya Shopee (beranda, kategori, pencarian, detail, keranjang, checkout, pesanan saya, daftar/masuk). Satu file, tanpa build. Nama toko di header, judul tab, dan footer diambil dari database.
- `admin.html`: panel penjual (login, produk dengan foto, pesanan dengan bukti bayar dan resi, pengaturan toko, ongkir, kategori).
- `config.js`: URL dan anon key Supabase, nomor WhatsApp penjual, nama toko cadangan, serta isi beranda (`BANNER`, `KEUNGGULAN`, `PENGUMUMAN`).
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`), `0002_admin.sql` (hak akses penjual, penyimpanan foto), `0003_pembeli_dan_stok.sql` (akun pembeli, stok kembali saat batal, pengetatan hak akses), `0004_beranda_dan_pesanan.sql` (kategori, harga coret, jumlah terjual, pembatalan oleh pembeli), `0005_ongkir_bukti_resi.sql` (ongkir per wilayah, bukti bayar, resi, alur status, rekening dan kebijakan toko), dan `0006_jadwal_batal.sql` (pembatalan otomatis lewat pg_cron).
- `docs/RENCANA.md`: rencana tahap.
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat dan migrasi 0001 sampai 0006 sudah diterapkan. Untuk proyek baru, jalankan semuanya berurutan di SQL Editor. Kategori, ongkir, rekening, dan kebijakan diatur dari tab Pengaturan di admin.
2. Buat akun admin di Supabase (Authentication, Users, Add user), lalu tautkan ke toko dengan perintah di akhir `0002_admin.sql`.
3. Pembeli wajib daftar/masuk untuk membeli; pengunjung tanpa akun hanya bisa melihat produk. Biarkan pendaftaran (signup) tetap aktif di Authentication, dan atur apakah konfirmasi email diwajibkan.
4. Pesanan yang belum dibayar dan belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam (jadwal di `0006`, butuh extension `pg_cron`).
5. Isi `WA` di `config.js` (nomor penjual, format 628xxx). Nama toko diubah dari tab Pengaturan di admin. Produk hanya tampil ke pembeli jika baris penjualnya aktif (`sellers.is_active = true`). Untuk fitur lupa kata sandi, daftarkan alamat situs di Supabase: Authentication, URL Configuration (Site URL dan Redirect URLs).
6. Deploy repo ini ke Vercel atau GitHub Pages (situs statis, tanpa build). Admin ada di `/admin.html`.

## Belum ada

- Payment gateway (sementara transfer manual dengan bukti bayar) dan ongkir otomatis dari kurir (sementara tarif per wilayah yang diisi penjual).
- Notifikasi pesanan baru ke WhatsApp/Telegram (sementara: bunyi, notifikasi browser, dan penanda "N baru" di admin, dicek tiap 30 detik).
- Multi-foto dan varian produk, voucher, favorit, ulasan.
