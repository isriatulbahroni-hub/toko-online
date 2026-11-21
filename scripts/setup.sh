#!/usr/bin/env bash
# Cek prasyarat untuk toko-online (Mercur).
set -u

ok=1
check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "[ok]    $1 -> $($1 --version 2>/dev/null | head -n1)"
  else
    echo "[belum] $1 tidak ditemukan"
    ok=0
  fi
}

check node
check bun
check git
check psql
check redis-server

if [ "$ok" -eq 1 ]; then
  echo
  echo "Semua prasyarat ada. Langkah berikut:"
else
  echo
  echo "Ada prasyarat yang belum terpasang. Lihat README.md bagian Kebutuhan."
  echo "Setelah lengkap:"
fi

echo "  cp .env.example .env"
echo "  bun create mercur-app@latest app"
echo "  cd app && bun dev"
