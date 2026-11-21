// Anon key memang publik; keamanan dijaga oleh RLS di supabase/migrations.
// WA: nomor WhatsApp penjual format internasional tanpa +.
window.CFG = {
  NAMA: 'Garery Songket Sari Melati',
  SUPABASE_URL: 'https://edbjjarwgnmwwwggecer.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYmpqYXJ3Z25td3d3Z2dlY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNjY5OTksImV4cCI6MjExMDg0Mjk5OX0.OyzInkZRPyL8cD12MG6lmoLs6x0Xq4HBciioXoSrXLs',
  WA: '6281703564978',
  // Konten beranda (edit sesuka hati). link: '#/semua' atau '#/k/ID-KATEGORI'.
  BANNER: [
    { judul: 'Songket pilihan untuk acara Anda', sub: 'Kain songket, selendang, dan busana tenun.', tombol: 'Lihat produk', link: '#/semua' }
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

// Terapkan nama toko ke judul tab dan header.
document.title = window.CFG.NAMA;
var _h = document.querySelector('header a');
if (_h) _h.textContent = window.CFG.NAMA;
