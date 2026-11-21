// Isi dengan data proyek Supabase. Anon key memang publik; keamanan dijaga oleh RLS di supabase/migrations.
// WA: nomor WhatsApp penjual format internasional tanpa +, contoh 628123456789.
window.CFG = {
  NAMA: 'Garery Songket Sari Melati',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  WA: ''
};

// Terapkan nama toko ke judul tab dan header.
document.title = window.CFG.NAMA;
var _h = document.querySelector('header a');
if (_h) _h.textContent = window.CFG.NAMA;
