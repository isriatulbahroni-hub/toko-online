// Pembaruan Pusat Bantuan, Kebijakan Privasi, dan persetujuan saat daftar.
// Memakai global dari app.js dan akun.js; dimuat setelah terima.js.
// CATATAN: teks Kebijakan Privasi di sini adalah DRAF. Baca dan sesuaikan dengan praktik toko sebelum dipakai
// (terutama bagian Lama penyimpanan dan Hak Anda).
(()=>{
// Ganti isi FAQ dari akun.js (const FAQ tidak bisa ditimpa, tetapi isinya bisa diganti).
FAQ.splice(0,FAQ.length,
 ['Bagaimana cara memesan?','Masuk atau daftar, pilih produk lalu ketuk Tambah ke keranjang. Buka Keranjang, tekan Checkout, isi alamat, pilih tujuan pengiriman, lalu Buat pesanan.'],
 ['Bagaimana cara membayar?','Pembayaran lewat transfer ke rekening toko yang tampil setelah pesanan dibuat. Setelah transfer, buka Pesanan, pilih pesanan Anda, lalu Unggah bukti bayar. Penjual akan mengonfirmasi pembayaran.'],
 ['Kapan pesanan dibatalkan otomatis?','Pesanan yang belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam. Pesanan yang sudah ada bukti bayar tetapi belum dikonfirmasi penjual dibatalkan setelah 72 jam. Stok, voucher, dan koin yang dipakai ikut dikembalikan.'],
 ['Bagaimana membatalkan pesanan?','Selama statusnya Menunggu pembayaran, buka Pesanan lalu tekan Batalkan pesanan. Jika sudah dibayar, hubungi penjual lewat WhatsApp.'],
 ['Bagaimana ongkir dihitung?','Ongkir mengikuti tarif wilayah yang dipilih saat checkout. Jika toko belum menyediakan pilihan wilayah, ongkir dibicarakan lewat WhatsApp.'],
 ['Bagaimana melacak pengiriman?','Setelah pesanan dikirim, nama kurir dan nomor resi tampil di halaman Pesanan dan Notifikasi.'],
 ['Kapan pesanan dianggap selesai?','Setelah barang Anda terima, tekan Pesanan diterima di halaman Pesanan. Jika tidak ditekan, pesanan yang berstatus Dikirim selesai otomatis setelah 7 hari.'],
 ['Bagaimana memakai voucher?','Masukkan kode voucher saat checkout. Potongan dihitung otomatis dan voucher dikembalikan jika pesanan dibatalkan.'],
 ['Apa itu koin?','Anda mendapat koin saat pesanan selesai, 1 koin untuk setiap Rp1.000 total belanja. 1 koin senilai Rp1 dan bisa dipakai sebagai potongan untuk pesanan yang belum dibayar (tidak mengurangi ongkir). Koin dikembalikan jika pesanan dibatalkan.'],
 ['Bagaimana jika barang bermasalah atau saya ingin retur atau refund?','Hubungi penjual lewat WhatsApp dengan menyebut nomor pesanan dan melampirkan foto. Retur dan pengembalian dana diproses manual oleh penjual.'],
 ['Saya lupa kata sandi.','Di halaman Masuk, ketuk Lupa kata sandi, masukkan email, lalu ikuti tautan yang dikirim ke email Anda.'],
 ['Bagaimana mengubah alamat atau data akun?','Buka Saya, lalu Alamat Saya atau Akun dan Keamanan.'],
 ['Bagaimana menghapus akun saya?','Buka Saya, Akun dan Keamanan, lalu Ajukan penghapusan akun. Permohonan dikirim ke penjual lewat WhatsApp dan diproses oleh penjual.']
);

privasiView=function(){
 const wa=waLink('Halo, saya ingin bertanya soal data pribadi saya.');
 app.innerHTML=judul('Kebijakan Privasi')+`<div class='box'>
<h3>Data yang kami simpan</h3><p>Nama, email, nomor WhatsApp, alamat, tanggal lahir dan jenis kelamin (opsional), foto profil (opsional), riwayat pesanan, bukti bayar yang Anda unggah, favorit, ulasan, dan saldo koin.</p>
<h3>Kegunaan data</h3><p>Data dipakai untuk memproses, mengirim, dan mengonfirmasi pesanan Anda, serta menghubungi Anda soal pesanan. Kami tidak menjual data Anda.</p>
<h3>Siapa yang dapat melihat</h3><p>Data pesanan hanya dapat dilihat oleh Anda dan penjual toko ini. Penjual dapat menerima pemberitahuan pesanan baru lewat Telegram.</p>
<h3>Pihak pengolah data</h3><p>Data disimpan dan diproses lewat Supabase (basis data, akun, dan penyimpanan berkas). Situs ini dihosting di Vercel.</p>
<h3>Lama penyimpanan</h3><p>Data disimpan selama akun Anda aktif dan selama diperlukan untuk pencatatan transaksi. Setelah permohonan penghapusan akun disetujui, data pribadi dihapus atau dianonimkan, kecuali yang wajib disimpan untuk pencatatan transaksi.</p>
<h3>Hak Anda</h3><p>Anda dapat melihat dan mengubah profil dan alamat kapan saja di menu Saya. Anda juga dapat meminta penghapusan akun lewat Akun dan Keamanan, atau bertanya soal data Anda langsung ke penjual.</p>`+
 (wa?`<p><a class='btn sm' href='${wa}' target='_blank' rel='noopener'>Tanya penjual via WhatsApp</a></p>`:'')+
 `<p><a href='#/info'>Lihat kebijakan toko</a></p><p><small>Terakhir diperbarui: 22 November 2026</small></p></div>`;
};

// Pendaftaran: wajib setuju pada Kebijakan Privasi dan kebijakan toko.
const _au=authView;
authView=function(dft){
 _au(dft);
 if(!dft)return;
 const f=$('#af'),b=f&&f.querySelector('button');
 if(!b)return;
 b.insertAdjacentHTML('beforebegin',`<label style='display:block;font-size:.85em;margin:.5em 0'><input type='checkbox' name='s' required style='width:auto'> Saya setuju dengan <a href='#/privasi' target='_blank'>Kebijakan Privasi</a> dan <a href='#/info' target='_blank'>kebijakan toko</a>.</label>`);
};
})();
