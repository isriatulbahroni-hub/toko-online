# Rencana toko-online

## Arah
Website dulu, aplikasi Flutter belakangan. Multi-penjual di struktur data, tetapi dikunci 1 penjual.

## Tahap 1 - Website 1 penjual (kode sudah ada)
- Etalase statis (`index.html`) + Supabase (Postgres, RLS).
- Pesanan dibuat lewat fungsi `buat_pesanan`; konfirmasi lewat WhatsApp.
- Perlu dilakukan: buat proyek Supabase, jalankan migrasi, isi `config.js`, deploy.

## Tahap 2 - Operasional penjual
- Halaman admin (login penjual, tambah produk, kelola pesanan), upload foto.
- Pembayaran dan ongkir lokal.

## Tahap 3 - Aplikasi Flutter
- Memakai database dan fungsi yang sama.

## Tahap 4 - Buka multi-penjual
- Hapus indeks `hanya_satu_penjual_aktif`, tambah pendaftaran dan verifikasi penjual, komisi.
- Bila beban atau fitur marketplace melebihi kebutuhan, pertimbangkan pindah ke Mercur/Medusa (butuh server Postgres + Redis).

## Belum diuji
- Kode belum dijalankan terhadap Supabase sungguhan; uji alur pesan dari awal sampai akhir setelah proyek dibuat.
