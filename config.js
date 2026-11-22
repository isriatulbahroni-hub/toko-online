// Anon key memang publik; keamanan dijaga oleh RLS di supabase/migrations.
// WA: nomor WhatsApp penjual format internasional tanpa +.
// NAMA hanya cadangan jika nama toko di database kosong. Nama yang tampil diambil dari
// database (admin, tab Pengaturan), jadi tidak perlu diubah di sini.
window.CFG = {
  NAMA: 'Toko Online',
  SUPABASE_URL: 'https://edbjjarwgnmwwwggecer.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYmpqYXJ3Z25td3d3Z2dlY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNjY5OTksImV4cCI6MjExMDg0Mjk5OX0.OyzInkZRPyL8cD12MG6lmoLs6x0Xq4HBciioXoSrXLs',
  WA: '6281703564978',
  // Konten beranda (edit sesuka hati). link: '#/semua' atau '#/k/ID-KATEGORI'.
  BANNER: [
    { judul: 'Belanja mudah, pesanan terpantau', sub: 'Berbagai produk pilihan langsung dari toko kami.', tombol: 'Lihat produk', link: '#/semua' }
  ],
  KEUNGGULAN: [
    ['Stok terlihat langsung', 'Lihat ketersediaan sebelum memesan'],
    ['Konfirmasi via WhatsApp', 'Tanya dan konfirmasi langsung ke penjual'],
    ['Pantau pesanan', 'Cek status pesanan dari akun Anda']
  ],
  PENGUMUMAN: [
    { judul: 'Selamat datang di toko kami' }
  ]
};
