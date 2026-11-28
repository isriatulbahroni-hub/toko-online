# Marketplace multi-penjual

Toko ini sekarang mendukung banyak penjual. Pembeli yang sudah punya akun bisa membuka toko sendiri lewat menu **Saya, Mulai Jualan**. Toko langsung aktif. Pemilik platform memantau semua toko dari `/platform.html` dan hanya bertindak bila ada laporan.

## Prinsip

- Penjual berhak penuh atas tokonya: produk, kategori, ongkir, voucher, varian, foto, flash sale, beranda, warna, rekening, dan notifikasi Telegram. Semua data itu terkunci per toko oleh RLS di database.
- Admin platform tidak ikut mengurus toko sehari-hari. Ia bisa: menonaktifkan atau mengaktifkan toko (wajib beralasan), meninjau laporan, membuka isi toko (produk dan jumlah pesanan, tanpa data pembeli) **hanya selama ada laporan terbuka**, dan memblokir produk yang melanggar. Semua tindakan tercatat di `log_admin`.
- Identitas pembeli yang melapor tidak ditampilkan ke siapa pun.
- Komisi platform belum diputuskan. Kolom `sellers.komisi_persen` (default 0) sudah ada tetapi belum dipakai.

## Menjalankan migrasi

Jalankan di Supabase SQL Editor, berurutan, setelah 0001 sampai 0018:

1. `0016_perbaikan_audit.sql` bila belum pernah dijalankan (membuat `konfirmasi_diterima` dan penyelesaian otomatis 7 hari; tanpa ini pesanan tidak bisa menjadi selesai karena penjual tidak boleh menyelesaikannya sendiri).
2. `0019_marketplace.sql`.
3. Isi `platform_admin` dengan akun pemilik platform (jalankan sekali, ganti email):
   `insert into public.platform_admin(user_id) select id from auth.users where email = 'EMAIL_PEMILIK' on conflict do nothing;`
4. `0020_laporan_moderasi.sql`.
5. Jalankan query verifikasi di bagian bawah 0020.

Jangan menjalankan ulang 0019 setelah 0020 (0019 mengembalikan versi lama `atur_toko_aktif`). Bila terpaksa, jalankan 0020 lagi sesudahnya. Migrasi harus dijalankan **sebelum** kode etalase dan admin baru dideploy, karena kode baru memanggil fungsi dan kolom baru.

## Alur penjual baru

1. Pembeli masuk, buka Saya, tekan Mulai Jualan, isi nama toko, WhatsApp, dan rekening. Email harus sudah dikonfirmasi.
2. Fungsi `daftar_jualan` membuat toko aktif dan menautkannya ke akun (satu akun satu toko).
3. Menu Saya menampilkan Dasbor Penjual (`admin.html`) dengan nama dan status toko. Penjual mengisi ongkir, kategori, dan produk dari sana.
4. Pembeli bisa membeli dari beberapa toko sekaligus. Keranjang dipecah menjadi satu pesanan per toko, dengan ongkir dan rekening masing-masing.
5. Pesanan menjadi selesai lewat tombol Pesanan diterima milik pembeli atau otomatis 7 hari setelah dikirim.

## Catatan teknis

- `jualan.js` (dimuat paling akhir) membungkus fungsi etalase: toko, ongkir, kategori, checkout, pesanan saya, detail produk, dan menu Saya. Toko aktif tertua tetap menjadi toko utama untuk nama, beranda, dan kebijakan etalase.
- Ongkir untuk keranjang beberapa toko: hanya wilayah yang dilayani semua toko (yang punya tarif) yang tampil, dengan tarif berupa jumlah ongkir tiap toko. Server menghitung ulang per toko.
- Kategori dengan nama sama di beberapa toko digabung di etalase.
- Koin: pembeli memakai koin pada pesanan pertama dalam satu checkout (perilaku lama `koin.js`). Artinya toko pemilik pesanan itu menanggung potongannya. Keputusan kebijakan koin untuk marketplace belum dibuat.
- Pembayaran tetap transfer langsung ke rekening penjual. Platform tidak menahan dana dan tidak bisa me-refund; alat satu-satunya adalah menonaktifkan toko.
- `platform.html` bukan PWA terpisah, tidak di-cache `sw.js`, dan memakai CSP report-only seperti `admin.html`.

## Uji manual (daftar centang)

- [ ] Akun pembeli baru: Saya, Mulai Jualan, toko aktif otomatis, `admin.html` menampilkan toko kosong milik akun itu.
- [ ] Penjual B tidak bisa melihat pesanan, bukti bayar, foto, ongkir, voucher, varian, dan kategori milik penjual A (uji lewat klien Supabase dengan akun B).
- [ ] Keranjang berisi produk dua toko menghasilkan dua pesanan dengan ongkir dan rekening masing-masing.
- [ ] Akun biasa ditolak oleh fungsi platform (`ringkasan_platform`, `daftar_laporan`, `atur_toko_aktif`); akun platform_admin bisa menonaktifkan toko dan toko nonaktif hilang dari etalase.
- [ ] Toko lama (Galery Songket Sari Melati) tetap berjalan: pesanan, voucher, varian, koin, dan ulasan yang sudah ada.
- [ ] Pembeli melapor toko dari detail produk atau Pesanan saya; laporan muncul di tab Laporan platform; Lihat isi toko tercatat di Riwayat.
- [ ] Blokir produk: produk hilang dari etalase dan penjual tidak bisa menayangkannya lagi; admin tidak bisa memblokir bila toko tanpa laporan terbuka.
- [ ] Penjual tidak bisa mengubah `is_active`, `owner_id`, atau `komisi_persen` toko dari klien.
- [ ] Pesanan dikirim menjadi selesai lewat Pesanan diterima milik pembeli; penjual tidak bisa menandai selesai.

## Status uji (27 Nov 2026)

Migrasi 0016 (bagian yang belum terpasang), 0019, dan 0020 sudah diterapkan di proyek `garery-songket-sari-melati`. Uji lewat SQL (dibatalkan setelah selesai) lolos untuk: daftar_jualan satu akun satu toko, laporkan_toko, penolakan akun non-admin, penolakan update langsung `sellers`, detail toko terlapor, nonaktifkan toko beralasan, ringkasan platform, log admin, dan keranjang dua toko menjadi dua pesanan. Daftar centang di atas belum dijalankan lewat browser.
