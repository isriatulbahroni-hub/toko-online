# toko-online

Toko online / marketplace bergaya Shopee, dibangun di atas **Mercur** (marketplace multi-vendor di atas Medusa, lisensi MIT).

**Tahap awal:** arsitektur multi-penjual, tetapi dikunci khusus untuk **1 penjual** (pemilik toko). Nanti bisa dibuka untuk banyak penjual tanpa bongkar struktur.

## Status

- [x] Repo dibuat, rencana dan kerangka awal
- [ ] Generate aplikasi Mercur (`bun create mercur-app@latest`)
- [ ] Database + Redis berjalan
- [ ] Akun penjual tunggal + pendaftaran penjual dikunci
- [ ] Katalog produk, checkout, pembayaran lokal
- [ ] Aplikasi Flutter (klien) di atas API

Detail langkah ada di [docs/RENCANA.md](docs/RENCANA.md).

## Kebutuhan

| Komponen | Versi | Keterangan |
|---|---|---|
| Node.js | 20+ (LTS) | runtime |
| Bun | 1.3+ | package manager yang disarankan Mercur |
| PostgreSQL | 14+ | database utama |
| Redis | terbaru | antrean/cache (disarankan) |

## Mulai cepat

```bash
cp .env.example .env
docker compose up -d          # Postgres + Redis (di VPS/laptop)
bash scripts/setup.sh         # cek prasyarat dan tampilkan langkah berikut
```

Lalu generate aplikasinya:

```bash
bun create mercur-app@latest app
cd app && bun dev
```

## Catatan

- Docker tidak tersedia di Termux. Di HP, pakai paket Postgres/Redis Termux, atau database di cloud, atau jalankan dari VPS/Codespaces.
- Kompatibilitas Bun di Termux belum diverifikasi.
