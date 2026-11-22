# Catatan migrasi database

Migrasi ada di `supabase/migrations/` dan dijalankan berurutan di SQL Editor Supabase.

## Urutan

`0001` sampai `0016`. Dua file berawalan `0008` (`0008_admin_notif_beranda.sql` dan `0008_profil_lengkap.sql`) bebas urutan. Jangan ganti nama file yang sudah diterapkan.

## Perhatian

- **`0015b` sudah diterapkan di Supabase tetapi tidak ada di repo.** Isinya tidak bisa dipulihkan dari repo. Cara memulihkan: di SQL Editor jalankan `select pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);` lalu bandingkan dengan `0011`, `0015`, dan `0016`, atau jalankan `supabase db dump --schema public` (Supabase CLI) dan simpan hasilnya sebagai `supabase/schema.sql`. Setelah isinya diketahui, simpan sebagai `0015b_*.sql`.
- **`buat_pesanan` didefinisikan ulang di `0003`, `0005`, `0010`, `0011`.** `0015` dan `0016` menambalnya lewat `pg_get_functiondef` + `replace` supaya perubahan yang sudah ada di database tidak hilang. Karena itu, jangan menjalankan ulang `0010` atau `0011` pada database yang sudah di `0015` ke atas: fungsi akan kembali ke versi lama tanpa harga flash sale dan urutan kunci.
- Untuk database baru, jalankan semuanya berurutan sampai `0016`. Pastikan hasilnya dengan: `select pg_get_functiondef('public.buat_pesanan(text,text,text,jsonb,uuid,text)'::regprocedure);` harus memuat `harga_flash` dan `order by e->>'id'`.

## 0016 (22 Nov 2026)

- Indeks untuk tabel pesanan dan item pesanan.
- Pesanan `baru` yang sudah ada bukti bayar dibatalkan otomatis setelah 72 jam jika penjual belum mengonfirmasi (sebelumnya tidak pernah), sehingga stok tidak terkunci selamanya. Penjual dapat Telegram saat ini terjadi.
- Pesanan `dikirim` selesai otomatis setelah 7 hari (pg_cron, tiap jam). Pembeli juga bisa menekan Pesanan diterima (`konfirmasi_diterima`).
- `buat_pesanan` mengunci produk berurutan, dan `cek_voucher` memakai bigint untuk voucher persen.
