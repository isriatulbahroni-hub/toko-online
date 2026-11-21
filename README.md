# Garery Songket Sari Melati

Website toko online songket bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: etalase (daftar produk, detail, keranjang, checkout). Satu file, tanpa build.
- `admin.html`: panel penjual (login, tambah/ubah produk dengan foto, kelola status pesanan).
- `config.js`: nama toko, URL dan anon key Supabase, serta nomor WhatsApp penjual.
- `supabase/migrations/`: `0001_init.sql` (tabel, RLS, fungsi `buat_pesanan`) dan `0002_admin.sql` (hak akses penjual, penyimpanan foto).
- `docs/RENCANA.md`: rencana tahap.
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Proyek Supabase sudah dibuat dan kedua migrasi sudah diterapkan.
2. Buat akun admin di Supabase (Authentication, Users, Add user), lalu tautkan ke toko dengan perintah di akhir `0002_admin.sql`.
3. Isi `WA` di `config.js` (nomor penjual, format 628xxx).
4. Deploy repo ini ke Vercel atau GitHub Pages (situs statis, tanpa build). Admin ada di `/admin.html`.

## Belum ada

- Pembayaran online dan ongkir (sementara konfirmasi via WhatsApp).
- Stok tidak otomatis kembali saat pesanan dibatalkan.
