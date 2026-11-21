# Rencana toko-online

## Arah
Website dulu, aplikasi Flutter belakangan. Multi-penjual di struktur data, tetapi dikunci 1 penjual.

## Sudah ada
- Etalase gaya Shopee: beranda (banner, kategori, terlaris), pencarian, detail, keranjang, checkout.
- Akun pembeli (wajib untuk membeli), profil alamat, Pesanan Saya dengan pembatalan.
- Admin penjual: produk (foto, kategori, harga coret), pesanan, penanda pesanan baru.
- Stok kembali otomatis saat batal, pesanan tidak dibayar kedaluwarsa (pg_cron aktif).
- Ongkir per wilayah, rekening dan kebijakan toko, bukti bayar, resi, alur status (baru, dibayar, dikirim, selesai, batal), lupa kata sandi.
- Admin: pengaturan toko, ongkir, kategori, bunyi dan notifikasi pesanan baru.

## Berikutnya
- Multi-foto dan varian produk; pengelolaan banner dari admin.
- Payment gateway dan ongkir otomatis dari kurir.
- Notifikasi pesanan baru ke WhatsApp/Telegram (butuh token bot).
- Voucher, flash sale, favorit, ulasan.

## Tahap lanjut
- Aplikasi Flutter memakai database dan fungsi yang sama.
- Buka multi-penjual: hapus indeks `hanya_satu_penjual_aktif`, tambah pendaftaran dan verifikasi penjual, komisi.

## Pengujian
- Migrasi 0001 sampai 0006 sudah diterapkan di Supabase sungguhan. Alur beli (dengan ongkir), tolak tanpa tujuan, batal, stok kembali, dan penolakan lompat status sudah diuji langsung di database (data uji dibatalkan).
- Tampilan etalase dan admin diuji dengan Supabase tiruan (jsdom). Belum diuji di browser dengan akun pembeli sungguhan: daftar, unggah bukti bayar, reset kata sandi.
