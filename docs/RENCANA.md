# Rencana toko-online

## Arah
Website dulu, aplikasi Flutter belakangan. Multi-penjual di struktur data, tetapi dikunci 1 penjual.

## Sudah ada
- Etalase gaya Shopee: beranda (banner, kategori, terlaris), pencarian, detail, keranjang, checkout.
- Akun pembeli (wajib untuk membeli), profil alamat, Pesanan Saya dengan pembatalan.
- Admin penjual: produk (foto, kategori, harga coret), pesanan, penanda pesanan baru.
- Stok kembali otomatis saat batal, pesanan tidak dibayar kedaluwarsa (butuh pg_cron).

## Berikutnya
- Multi-foto dan varian produk; pengelolaan kategori dan banner dari admin.
- Pembayaran (transfer manual dengan bukti bayar, lalu gateway) dan ongkir.
- Notifikasi pesanan baru ke WhatsApp/Telegram.
- Voucher, flash sale, favorit, ulasan.

## Tahap lanjut
- Aplikasi Flutter memakai database dan fungsi yang sama.
- Buka multi-penjual: hapus indeks `hanya_satu_penjual_aktif`, tambah pendaftaran dan verifikasi penjual, komisi.

## Belum diuji
- Alur diuji dengan Supabase tiruan (jsdom), belum dengan proyek Supabase sungguhan. Uji alur daftar, beli, batal, dan stok setelah migrasi dijalankan.
