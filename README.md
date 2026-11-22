# Toko Online

Website toko online umum (berbagai produk) bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: kerangka halaman etalase. Tampilan di `style.css`, logika etalase (beranda, kategori, pencarian, detail, keranjang, checkout, pesanan, daftar/masuk) di `app.js`, dan halaman akun pembeli di `akun.js`. Tanpa build. Nama toko diambil dari database.
- Modul tambahan etalase (dimuat berurutan setelah `akun.js`, masing-masing membungkus fungsi sebelumnya): `ulasan.js` (ulasan dan rating), `voucher.js` (voucher di checkout), `varian.js` (varian produk), `foto.js` (foto profil), `koin.js` (koin), `header.js` dan `header.css` (header halaman Saya), `etalase.js` (urut, filter, flash sale, multi-foto, produk terkait, PWA), dan `terima.js` (tombol Pesanan diterima). Setiap script baru harus didaftarkan di `index.html` dan di `AKAR` pada `sw.js`.
- `akun.js`: menu Saya (ringkasan pesanan, Akun dan Keamanan, Alamat Saya, Favorit, Notifikasi, Pusat Bantuan, Kebijakan Privasi, Tentang, Keluar).
- `admin.html`: panel penjual (ringkasan, produk dengan foto, pesanan dengan bukti bayar dan resi, pelanggan, laporan penjualan, beranda, pengaturan toko, ongkir, kategori, notifikasi Telegram).
- `admin-toko.html`: kelola voucher, varian produk, foto produk, dan flash sale.
- `config.js`: URL dan anon key Supabase, nomor WhatsApp penjual, nama toko cadangan, serta isi beranda (`BANNER`, `KEUNGGULAN`, `PENGUMUMAN`).
- `api/p.js`: halaman `/p/<id>` untuk pratinjau tautan dan mesin pencari (og:tag, JSON-LD Product), lalu mengarahkan pengunjung ke `/#/p/<id>`. `api/sitemap.js`: `/sitemap.xml` berisi beranda dan semua produk aktif.
- `vercel.json`: rewrite `/p/:id` dan `/sitemap.xml`, header keamanan, dan Content-Security-Policy mode **report-only** (lihat bagian Keamanan).
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`), `0002_admin.sql` (hak akses penjual, penyimpanan foto), `0003_pembeli_dan_stok.sql` (akun pembeli, stok kembali saat batal, pengetatan hak akses), `0004_beranda_dan_pesanan.sql` (kategori, harga coret, jumlah terjual, pembatalan oleh pembeli), `0005_ongkir_bukti_resi.sql` (ongkir per wilayah, bukti bayar, resi, alur status, rekening dan kebijakan toko), `0006_jadwal_batal.sql` (pembatalan otomatis lewat pg_cron), `0007_akun_pembeli.sql` (alamat tersimpan dan favorit), `0008_admin_notif_beranda.sql` (pengaturan beranda dan notifikasi Telegram), `0008_profil_lengkap.sql` (tanggal lahir dan jenis kelamin), `0009_ulasan.sql`, `0010_voucher.sql`, `0011_varian.sql`, `0012_koin_foto.sql` (koin dan foto profil), `0013_sinkron_perbaikan.sql` (perbaikan hasil audit: total notifikasi Telegram, stok varian, voucher kembali saat batal, pengerasan hak akses), `0014_ulasan_moderasi.sql`, `0015_foto_flash_rating.sql` (multi-foto, flash sale, rating, indeks pencarian), dan `0016_perbaikan_audit.sql` (indeks, pembatalan pesanan ber-bukti yang tidak dikonfirmasi, selesai otomatis, konfirmasi diterima, anti-deadlock, voucher bigint). Catatan penting soal migrasi ada di `docs/MIGRASI.md`.
- `docs/RENCANA.md`: rencana tahap. `docs/MIGRASI.md`: urutan dan catatan migrasi.
- `scripts/cek.js`: pemeriksaan statis (sintaks JS, daftar cache service worker, nomor migrasi, kebocoran kunci rahasia).
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat dan migrasi 0001 sampai 0016 sudah diterapkan (0016 perlu dijalankan sebelum `terima.js` dipakai). Untuk proyek baru, jalankan semuanya berurutan di SQL Editor (dua file berawalan 0008 bebas urutan) dan baca `docs/MIGRASI.md`. Kategori, ongkir, rekening, kebijakan, dan beranda diatur dari admin.
2. Buat akun admin di Supabase (Authentication, Users, Add user), lalu tautkan ke toko dengan perintah di akhir `0002_admin.sql`.
3. Pembeli wajib daftar/masuk untuk membeli; pengunjung tanpa akun hanya bisa melihat produk. Biarkan pendaftaran (signup) tetap aktif di Authentication, dan atur apakah konfirmasi email diwajibkan.
4. Pesanan yang belum dibayar dan belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam; pesanan yang sudah ada bukti bayar tetapi belum dikonfirmasi penjual dibatalkan setelah 72 jam (jadwal di `0006`, butuh extension `pg_cron`). Pesanan dikirim selesai otomatis setelah 7 hari jika pembeli tidak menekan Pesanan diterima.
5. Isi `WA` di `config.js` (nomor penjual, format 628xxx). Nama toko diubah dari tab Pengaturan di admin. Produk hanya tampil ke pembeli jika baris penjualnya aktif (`sellers.is_active = true`). Untuk fitur lupa kata sandi, daftarkan alamat situs di Supabase: Authentication, URL Configuration (Site URL dan Redirect URLs).
6. Notifikasi Telegram: isi token bot dan Chat ID di admin, tab Pengaturan, lalu tekan Kirim tes.
7. Deploy repo ini ke Vercel (situs statis, tanpa build; folder `api/` butuh Vercel). Admin ada di `/admin.html`, voucher, varian, foto produk, dan flash sale di `/admin-toko.html`. Kirim `https://DOMAIN-ANDA/sitemap.xml` ke Google Search Console.

## Pemeriksaan

Jalankan `node scripts/cek.js` sebelum push. Untuk menjalankannya otomatis di GitHub, tambahkan workflow yang memanggil perintah itu (contoh di `docs/RENCANA.md`).

## Keamanan

- Anon key di `config.js` dan `api/*.js` memang publik; keamanan dijaga RLS di `supabase/migrations`. Jangan pernah memasukkan service role key ke repo (`scripts/cek.js` akan menolaknya).
- `vercel.json` memasang `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan Content-Security-Policy dalam mode report-only. Buka situs dan admin dengan konsol browser terbuka; jika tidak ada pelanggaran CSP, ganti kunci `Content-Security-Policy-Report-Only` menjadi `Content-Security-Policy` di `vercel.json`.

## Belum ada

- Payment gateway (sementara transfer manual dengan bukti bayar) dan ongkir otomatis dari kurir (sementara tarif per wilayah yang diisi penjual).
- Chat di dalam aplikasi (sementara lewat WhatsApp).
- Notifikasi ke pembeli (email atau WhatsApp), alur refund dan retur, MFA untuk admin, ikon PNG untuk PWA, dan pencarian, pengurutan, serta paginasi katalog di sisi server (sementara maksimal 200 produk dimuat).
