# Toko Online

Website toko online umum (berbagai produk) bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: kerangka halaman etalase. Tampilan di `style.css`, logika etalase (beranda, kategori, pencarian, detail, keranjang, checkout, pesanan, daftar/masuk) di `app.js`, dan halaman akun pembeli di `akun.js`. Tanpa build. Nama toko diambil dari database.
- Modul tambahan etalase (dimuat berurutan setelah `akun.js`, masing-masing membungkus fungsi sebelumnya): `ulasan.js` (ulasan dan rating), `voucher.js` (voucher di checkout), `varian.js` (varian produk), `foto.js` (foto profil), `koin.js` (koin), `header.js` dan `header.css` (header halaman Saya).
- `akun.js`: menu Saya (ringkasan pesanan, Akun dan Keamanan, Alamat Saya, Favorit, Notifikasi, Pusat Bantuan, Kebijakan Privasi, Tentang, Keluar).
- `admin.html`: panel penjual (ringkasan, produk dengan foto, pesanan dengan bukti bayar dan resi, pelanggan, laporan penjualan, beranda, pengaturan toko, ongkir, kategori, notifikasi Telegram).
- `admin-toko.html`: kelola voucher dan varian produk.
- `config.js`: URL dan anon key Supabase, nomor WhatsApp penjual, nama toko cadangan, serta isi beranda (`BANNER`, `KEUNGGULAN`, `PENGUMUMAN`).
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`), `0002_admin.sql` (hak akses penjual, penyimpanan foto), `0003_pembeli_dan_stok.sql` (akun pembeli, stok kembali saat batal, pengetatan hak akses), `0004_beranda_dan_pesanan.sql` (kategori, harga coret, jumlah terjual, pembatalan oleh pembeli), `0005_ongkir_bukti_resi.sql` (ongkir per wilayah, bukti bayar, resi, alur status, rekening dan kebijakan toko), `0006_jadwal_batal.sql` (pembatalan otomatis lewat pg_cron), `0007_akun_pembeli.sql` (alamat tersimpan dan favorit), `0008_admin_notif_beranda.sql` (pengaturan beranda dan notifikasi Telegram), `0008_profil_lengkap.sql` (tanggal lahir dan jenis kelamin), `0009_ulasan.sql`, `0010_voucher.sql`, `0011_varian.sql`, `0012_koin_foto.sql` (koin dan foto profil), dan `0013_sinkron_perbaikan.sql` (perbaikan hasil audit: total notifikasi Telegram, stok varian, voucher kembali saat batal, pengerasan hak akses).
- `docs/RENCANA.md`: rencana tahap.
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat dan migrasi 0001 sampai 0013 sudah diterapkan. Untuk proyek baru, jalankan semuanya berurutan di SQL Editor (dua file berawalan 0008 bebas urutan). Kategori, ongkir, rekening, kebijakan, dan beranda diatur dari admin.
2. Buat akun admin di Supabase (Authentication, Users, Add user), lalu tautkan ke toko dengan perintah di akhir `0002_admin.sql`.
3. Pembeli wajib daftar/masuk untuk membeli; pengunjung tanpa akun hanya bisa melihat produk. Biarkan pendaftaran (signup) tetap aktif di Authentication, dan atur apakah konfirmasi email diwajibkan.
4. Pesanan yang belum dibayar dan belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam (jadwal di `0006`, butuh extension `pg_cron`).
5. Isi `WA` di `config.js` (nomor penjual, format 628xxx). Nama toko diubah dari tab Pengaturan di admin. Produk hanya tampil ke pembeli jika baris penjualnya aktif (`sellers.is_active = true`). Untuk fitur lupa kata sandi, daftarkan alamat situs di Supabase: Authentication, URL Configuration (Site URL dan Redirect URLs).
6. Notifikasi Telegram: isi token bot dan Chat ID di admin, tab Pengaturan, lalu tekan Kirim tes.
7. Deploy repo ini ke Vercel atau GitHub Pages (situs statis, tanpa build). Admin ada di `/admin.html`, voucher dan varian di `/admin-toko.html`.

## Belum ada

- Payment gateway (sementara transfer manual dengan bukti bayar) dan ongkir otomatis dari kurir (sementara tarif per wilayah yang diisi penjual).
- Chat di dalam aplikasi (sementara lewat WhatsApp).
