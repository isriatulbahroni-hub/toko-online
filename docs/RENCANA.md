# Rencana toko-online

## Tujuan
Marketplace bergaya Shopee. Struktur multi-penjual dari awal, tetapi tahap pertama hanya **1 penjual** (pemilik toko).

## Fondasi
- **Mercur 2.x** (MIT) di atas **Medusa**: storefront, panel penjual, panel admin, komisi, ulasan, permintaan.
- Backend Node.js + PostgreSQL (+ Redis).
- Klien mobile: **Flutter** memanggil API Medusa/Mercur.

## Fase

### Fase 0 - Kerangka (selesai)
Repo, README, `.env.example`, `docker-compose.yml`, `scripts/setup.sh`.

### Fase 1 - Backend berjalan
1. Siapkan Postgres 14+ dan Redis.
2. `bun create mercur-app@latest app`, lalu `bun dev`.
3. Pastikan admin, panel penjual, dan API hidup.
4. Ganti semua kredensial seed bawaan.

### Fase 2 - Kunci ke 1 penjual
1. Buat satu akun penjual (pemilik toko).
2. Cegah penjual baru aktif: nonaktifkan pendaftaran penjual atau wajibkan persetujuan admin. **Mekanisme persisnya perlu dicek di dokumentasi Mercur sebelum dipakai.**
3. Semua produk dimiliki akun penjual itu.
4. Catat cara membuka kembali untuk banyak penjual.

### Fase 3 - Katalog dan transaksi
- Produk, varian, stok, foto.
- Keranjang dan checkout.
- Pembayaran lokal Indonesia (belum dipilih), ongkir.

### Fase 4 - Klien Flutter
- Daftar produk, detail, keranjang, checkout, pesanan.

### Fase 5 - Buka untuk banyak penjual
- Hidupkan pendaftaran penjual, verifikasi, komisi, penarikan dana.

## Risiko dan hal belum pasti
- Bun di Termux/Android belum diverifikasi. Cadangan: VPS, Codespaces, atau proot-distro.
- Mercur 2.x relatif baru, versi Medusa yang dipakai perlu dicek saat generate.
- Pembayaran dan pengiriman lokal perlu integrasi sendiri.
