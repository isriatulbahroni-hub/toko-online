# Rencana toko-online

## Arah
Website dulu, aplikasi Flutter belakangan. Multi-penjual di struktur data, tetapi dikunci 1 penjual.

## Sudah ada
- Etalase gaya Shopee: beranda (banner, kategori, terlaris), pencarian, detail, keranjang, checkout.
- Akun pembeli (wajib untuk membeli), profil alamat, Pesanan Saya dengan pembatalan dan tombol Pesanan diterima.
- Admin penjual: produk (foto, kategori, harga coret), pesanan, penanda pesanan baru, pelanggan, laporan, ulasan.
- Stok kembali otomatis saat batal; pesanan tidak dibayar kedaluwarsa 24 jam, pesanan ber-bukti yang tidak dikonfirmasi 72 jam; pesanan dikirim selesai otomatis 7 hari (pg_cron).
- Ongkir per wilayah, rekening dan kebijakan toko, bukti bayar, resi, alur status (baru, dibayar, dikirim, selesai, batal), lupa kata sandi.
- Admin: pengaturan toko, ongkir, kategori, bunyi dan notifikasi pesanan baru, notifikasi Telegram.
- Voucher, varian, flash sale, multi-foto, favorit, ulasan, koin, PWA, pratinjau tautan, sitemap, dan data terstruktur produk.

## Berikutnya
- Payment gateway dan ongkir otomatis dari kurir.
- Notifikasi ke pembeli (email atau WhatsApp) saat status pesanan berubah.
- Alur refund dan retur untuk pesanan yang sudah dibayar.
- MFA untuk akun admin (butuh tampilan pendaftaran TOTP di admin).
- Ikon PNG 192 dan 512 (serta maskable dan apple-touch-icon) untuk PWA.
- Pencarian, pengurutan, dan paginasi katalog di sisi server (sekarang maksimal 200 produk dimuat di browser).
- Admin: hapus dan gandakan produk, harga modal untuk laporan laba, label dan faktur cetak.
- SRI untuk script Supabase di CDN, atau salin berkasnya ke repo.
- Ganti Content-Security-Policy dari report-only menjadi enforce setelah dicek di browser.
- Kebijakan privasi yang lebih lengkap dan proses hapus akun otomatis (UU PDP).

## Tahap lanjut
- Aplikasi Flutter memakai database dan fungsi yang sama.
- Buka multi-penjual: hapus indeks `hanya_satu_penjual_aktif`, tambah pendaftaran dan verifikasi penjual, komisi.

## Pengujian
- Migrasi 0001 sampai 0006 sudah diterapkan di Supabase sungguhan. Alur beli (dengan ongkir), tolak tanpa tujuan, batal, stok kembali, dan penolakan lompat status sudah diuji langsung di database (data uji dibatalkan).
- Tampilan etalase dan admin diuji dengan Supabase tiruan (jsdom). Belum diuji di browser dengan akun pembeli sungguhan: daftar, unggah bukti bayar, reset kata sandi.
- Migrasi 0016 dan tombol Pesanan diterima ditulis tanpa dijalankan di Supabase; jalankan 0016 lalu uji: pesanan dikirim lalu tekan Pesanan diterima, dan pesanan ber-bukti yang lewat 72 jam.
- `node scripts/cek.js`: pemeriksaan statis (sintaks JS termasuk script inline admin, daftar cache sw.js, nomor migrasi, kebocoran kunci).

### Workflow GitHub Actions (belum terpasang)
Simpan sebagai `.github/workflows/cek.yml`:

```yaml
name: cek
on:
  push:
    branches: [main]
  pull_request:
jobs:
  cek:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/cek.js
```
