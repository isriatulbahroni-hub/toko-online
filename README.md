# Toko Online

Website marketplace umum (berbagai produk) bergaya Shopee. **Website multi-penjual: pembeli bisa membuka toko sendiri, pemilik platform memantau lewat `/platform.html`. Aplikasi (Flutter) menyusul.** Panduan lengkap marketplace ada di `docs/MARKETPLACE.md`.

## Isi repo

- `index.html`: kerangka halaman etalase. Tampilan di `style.css`, logika etalase (beranda, kategori, pencarian, detail, keranjang, checkout, pesanan, daftar/masuk) di `app.js`, dan halaman akun pembeli di `akun.js`. Tanpa build. Nama toko utama diambil dari database.
- Modul tambahan etalase (dimuat berurutan setelah `akun.js`, masing-masing membungkus fungsi sebelumnya): `ulasan.js` (ulasan dan rating), `voucher.js` (voucher di checkout), `varian.js` (varian produk), `foto.js` (foto profil), `koin.js` (koin), `header.js` dan `header.css` (header halaman Saya), `etalase.js` (urut, filter, flash sale, multi-foto, produk terkait, PWA), `terima.js` (tombol Pesanan diterima), dan `jualan.js` (marketplace: Mulai Jualan, Dasbor Penjual dan Platform, keranjang dan pesanan multi-toko, Lapor toko; dimuat paling akhir). Setiap script baru harus didaftarkan di `index.html` dan di `AKAR` pada `sw.js`.
- `akun.js`: menu Saya (ringkasan pesanan, Akun dan Keamanan, Alamat Saya, Favorit, Notifikasi, Pusat Bantuan, Kebijakan Privasi, Tentang, Keluar).
- `admin.html`: panel penjual untuk toko milik akun yang masuk (ringkasan, produk dengan foto, pesanan dengan bukti bayar dan resi, pelanggan, laporan penjualan, beranda, pengaturan toko, ongkir, kategori, notifikasi Telegram).
- `admin-toko.html`: kelola voucher, varian produk, foto produk, flash sale, dan warna toko.
- `platform.html`: dasbor pemilik platform (ringkasan, daftar toko dengan tombol Aktifkan/Nonaktifkan, laporan toko, blokir produk, riwayat tindakan). Hanya untuk akun di tabel `platform_admin`; hak akses dijaga fungsi di database. Tidak didaftarkan sebagai PWA dan tidak di-cache `sw.js`.
- `config.js`: URL dan anon key Supabase, nomor WhatsApp cadangan, nama toko cadangan, serta isi beranda (`BANNER`, `KEUNGGULAN`, `PENGUMUMAN`).
- `api/p.js`: halaman `/p/<id>` untuk pratinjau tautan dan mesin pencari (og:tag, JSON-LD Product), lalu mengarahkan pengunjung ke `/#/p/<id>`. `api/sitemap.js`: `/sitemap.xml` berisi beranda dan semua produk aktif.
- `vercel.json`: rewrite `/p/:id` dan `/sitemap.xml`, header keamanan, dan Content-Security-Policy mode **report-only** (lihat bagian Keamanan). `admin.html`, `admin-toko.html`, dan `platform.html` memakai CSP yang mengizinkan script inline.
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`), `0002_admin.sql` (hak akses penjual, penyimpanan foto), `0003_pembeli_dan_stok.sql` (akun pembeli, stok kembali saat batal, pengetatan hak akses), `0004_beranda_dan_pesanan.sql` (kategori, harga coret, jumlah terjual, pembatalan oleh pembeli), `0005_ongkir_bukti_resi.sql` (ongkir per wilayah, bukti bayar, resi, alur status, rekening dan kebijakan toko), `0006_jadwal_batal.sql` (pembatalan otomatis lewat pg_cron), `0007_akun_pembeli.sql` (alamat tersimpan dan favorit), `0008_admin_notif_beranda.sql` (pengaturan beranda dan notifikasi Telegram), `0008_profil_lengkap.sql` (tanggal lahir dan jenis kelamin), `0009_ulasan.sql`, `0010_voucher.sql`, `0011_varian.sql`, `0012_koin_foto.sql` (koin dan foto profil), `0013_sinkron_perbaikan.sql` (perbaikan hasil audit: total notifikasi Telegram, stok varian, voucher kembali saat batal, pengerasan hak akses), `0014_ulasan_moderasi.sql`, `0015_foto_flash_rating.sql` (multi-foto, flash sale, rating, indeks pencarian), `0016_perbaikan_audit.sql` (indeks, pembatalan pesanan ber-bukti yang tidak dikonfirmasi, selesai otomatis, konfirmasi diterima, anti-deadlock, voucher bigint), `0019_marketplace.sql` (multi-penjual: ongkir dan voucher per toko, platform admin, Mulai Jualan, kunci kolom `sellers`, perbaikan hak akses storage, Telegram per toko, `buat_pesanan` multi-toko), dan `0020_laporan_moderasi.sql` (kategori per toko, laporan toko, log admin, penonaktifan beralasan, blokir produk). Catatan penting soal migrasi ada di `docs/MIGRASI.md`.
- `docs/MARKETPLACE.md`: cara menjalankan 0019 dan 0020, mengisi `platform_admin`, alur penjual baru, aturan moderasi, dan daftar uji manual. `docs/RENCANA.md`: rencana tahap. `docs/MIGRASI.md`: urutan dan catatan migrasi.
- `scripts/cek.js`: pemeriksaan statis (sintaks JS, daftar cache service worker, nomor migrasi, kebocoran kunci rahasia).
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat. Untuk proyek baru, jalankan semua migrasi berurutan di SQL Editor (dua file berawalan 0008 bebas urutan) dan baca `docs/MIGRASI.md`. Untuk marketplace, ikuti urutan di `docs/MARKETPLACE.md`: 0016, 0019, isi `platform_admin`, 0020, lalu query verifikasi. Migrasi harus dijalankan sebelum kode etalase dan admin baru dideploy.
2. Isi pemilik platform (jalankan sekali, ganti email): `insert into public.platform_admin(user_id) select id from auth.users where email = 'EMAIL_PEMILIK' on conflict do nothing;`. Akun itu bisa membuka `/platform.html`.
3. Penjual baru tidak perlu diatur manual: pembeli yang sudah masuk membuka Saya, Mulai Jualan. Toko pertama (sebelum marketplace) tetap ditautkan dengan perintah di akhir `0002_admin.sql`.
4. Pembeli wajib daftar/masuk untuk membeli; pengunjung tanpa akun hanya bisa melihat produk. Biarkan pendaftaran (signup) tetap aktif di Authentication. Konfirmasi email wajib untuk membuka toko dan melapor toko, jadi aktifkan konfirmasi email di Authentication.
5. Pesanan yang belum dibayar dan belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam; pesanan yang sudah ada bukti bayar tetapi belum dikonfirmasi penjual dibatalkan setelah 72 jam (jadwal di `0006`, butuh extension `pg_cron`). Pesanan dikirim selesai otomatis setelah 7 hari jika pembeli tidak menekan Pesanan diterima. Penjual tidak bisa menandai pesanan selesai sendiri.
6. Isi `WA` di `config.js` (nomor cadangan, format 628xxx); nomor tiap toko diatur penjual dari tab Pengaturan di admin. Produk hanya tampil ke pembeli jika tokonya aktif (`sellers.is_active = true`). Untuk fitur lupa kata sandi, daftarkan alamat situs di Supabase: Authentication, URL Configuration (Site URL dan Redirect URLs).
7. Notifikasi Telegram: tiap penjual mengisi token bot dan Chat ID sendiri di admin, tab Pengaturan, lalu menekan Kirim tes. Laporan toko baru dan toko baru dikirim ke Telegram pemilik platform (tabel `notif_telegram`).
8. Deploy repo ini ke Vercel (situs statis, tanpa build; folder `api/` butuh Vercel). Admin penjual ada di `/admin.html`, voucher, varian, foto produk, flash sale, dan warna di `/admin-toko.html`, dasbor platform di `/platform.html`. Kirim `https://DOMAIN-ANDA/sitemap.xml` ke Google Search Console.

## Pemeriksaan

Jalankan `node scripts/cek.js` sebelum push. Untuk menjalankannya otomatis di GitHub, tambahkan workflow yang memanggil perintah itu (contoh di `docs/RENCANA.md`). Daftar uji manual marketplace ada di `docs/MARKETPLACE.md`.

## Keamanan

- Anon key di `config.js` dan `api/*.js` memang publik; keamanan dijaga RLS di `supabase/migrations`. Jangan pernah memasukkan service role key ke repo (`scripts/cek.js` akan menolaknya).
- Tabel `sellers` tidak bisa diubah langsung oleh klien kecuali kolom info toko (nama, WhatsApp, rekening, kebijakan, beranda, warna). Pembuatan toko hanya lewat `daftar_jualan`; status aktif hanya lewat `atur_toko_aktif` (admin platform, wajib alasan).
- `vercel.json` memasang `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan Content-Security-Policy dalam mode report-only. Buka situs, admin, dan platform dengan konsol browser terbuka; jika tidak ada pelanggaran CSP, ganti kunci `Content-Security-Policy-Report-Only` menjadi `Content-Security-Policy` di `vercel.json`.

## Belum ada

- Komisi platform (kolom `sellers.komisi_persen` sudah disiapkan, belum dipakai) dan kebijakan koin untuk marketplace (sementara potongan koin ditanggung toko pemilik pesanan pertama).
- Payment gateway (sementara transfer manual dengan bukti bayar langsung ke penjual, platform tidak menahan dana) dan ongkir otomatis dari kurir (sementara tarif per wilayah yang diisi penjual).
- Chat di dalam aplikasi (sementara lewat WhatsApp).
- Notifikasi ke pembeli (email atau WhatsApp), alur refund dan retur, MFA untuk admin, ikon PNG untuk PWA, dan pencarian, pengurutan, serta paginasi katalog di sisi server (sementara maksimal 200 produk dimuat).
