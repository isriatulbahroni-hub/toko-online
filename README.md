# Garery Songket Sari Melati

Website toko online songket bergaya Shopee. **Tahap 1: website, 1 penjual. Aplikasi (Flutter) menyusul.**

Struktur data sudah multi-penjual, tetapi database mengunci hanya 1 penjual aktif (`hanya_satu_penjual_aktif`). Untuk membuka marketplace nanti, hapus indeks itu.

## Isi repo

- `index.html`: etalase (daftar produk, detail, keranjang, checkout). Satu file, tanpa build.
- `config.js`: nama toko, URL dan anon key Supabase, serta nomor WhatsApp penjual.
- `supabase/migrations/0001_init.sql`: tabel, RLS, dan fungsi `buat_pesanan` (harga dan stok dihitung di server).
- `docs/RENCANA.md`: rencana tahap.
- `docker-compose.yml`, `scripts/setup.sh`: untuk jalur Mercur (tahap marketplace besar), belum dipakai.

## Menjalankan

1. Buat proyek Supabase, jalankan isi `0001_init.sql` di SQL Editor.
2. Jalankan contoh data awal (bagian komentar di akhir file SQL).
3. Isi `config.js`.
4. Deploy repo ini ke Vercel atau GitHub Pages (situs statis, tanpa build).

## Belum ada

- Pembayaran online, ongkir, halaman admin (sementara kelola produk dan pesanan lewat Table Editor Supabase), upload foto (pakai URL gambar).
