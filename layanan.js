// Layanan digital (pulsa, data, PLN, tagihan, e-wallet, game) dan perapihan beranda.
// Beranda: satu baris ikon yang bisa digeser (Pulsa & Tagihan, Semua, lalu kategori) dalam satu kartu, seperti marketplace.
// Semua layanan digital muncul di halaman #/layanan.
// Tahap 1: tampilan dan halaman "segera hadir". Transaksi akan disambung ke Digiflazz lewat fungsi server di folder api/.
// Dimuat setelah pusat.js. Memakai global dari app.js dan akun.js.
(()=>{
const LAY=[
 ['pulsa','Pulsa','&#128241;','Isi pulsa semua operator'],
 ['data','Paket Data','&#127760;','Paket kuota internet semua operator'],
 ['pln','Token PLN','&#9889;','Token listrik prabayar'],
 ['listrik','Tagihan Listrik','&#128161;','Bayar listrik pascabayar'],
 ['pdam','PDAM','&#128167;','Bayar tagihan air'],
 ['bpjs','BPJS','&#127973;','Bayar iuran BPJS Kesehatan'],
 ['ewallet','E-Wallet','&#128179;','Top up dompet digital'],
 ['game','Voucher Game','&#127918;','Top up diamond dan voucher game'],
 ['internet','Internet & TV','&#128250;','Bayar tagihan internet dan TV kabel']
];
const ikn=l=>`<a href='#/layanan/${l[0]}'><i>${l[2]}</i>${esc(l[1])}</a>`;
const judul2=(t,h)=>`<h2 class='hd'><a href='${h||'#/'}' aria-label='Kembali'>&larr;</a>${t}</h2>`;

// Semua layanan, tampil setelah Pulsa & Tagihan ditekan.
function daftarView(){
 return judul2('Pulsa &amp; Tagihan')+`<div class='box'><div class='lay-g'>${LAY.map(ikn).join('')}</div></div>`;
}

function halaman(id){
 const l=LAY.find(x=>x[0]===id);
 if(!l)return `<p class='msg'>Layanan tidak ditemukan. <a href='#/layanan'>Lihat semua layanan</a></p>`;
 const wa=C.WA?`<a class='btn line' href='https://wa.me/${esc(C.WA)}?text=${encodeURIComponent('Halo, saya mau tanya layanan '+l[1])}'>Tanya via WhatsApp</a>`:'';
 return judul2(esc(l[1]),'#/layanan')+
  `<div class='box lay-soon'><i>${l[2]}</i><b>Segera hadir</b><p>${esc(l[3])} sedang kami siapkan. Nantikan ya.</p>${wa}</div>`+
  `<div class='box'><b>Layanan lainnya</b><div class='lay-g'>${LAY.filter(x=>x[0]!==id).map(ikn).join('')}</div></div>`;
}

const _r=AKUN.route.bind(AKUN);
AKUN.route=async function(h){
 if(h==='/layanan'){
  app.innerHTML=daftarView();
  document.title='Pulsa & Tagihan | '+namaToko();
  return true;
 }
 if(h.startsWith('/layanan/')){
  const id=h.slice(9),l=LAY.find(x=>x[0]===id);
  app.innerHTML=halaman(id);
  document.title=(l?l[1]+' | ':'')+namaToko();
  return true;
 }
 return _r(h);
};

// Satu baris menu: Pulsa & Tagihan di depan, lalu Semua dan kategori toko.
function menu(kt){
 const it=[`<a href='#/layanan'><i>&#128241;</i>Pulsa &amp; Tagihan</a>`].concat(Array.from(kt.children).map(a=>a.outerHTML));
 return `<div class='box mnu'><div class='mnu-r' id='mnur'>${it.join('')}</div><div class='mnu-b'><i id='mnui'></i></div></div>`;
}

// Penanda posisi geser di bawah baris ikon.
function bar(){
 const r=document.getElementById('mnur'),t=document.getElementById('mnui');
 if(!r||!t)return;
 const set=()=>{
  const m=r.scrollWidth-r.clientWidth,w=r.scrollWidth>0?Math.min(100,r.clientWidth/r.scrollWidth*100):100;
  t.style.width=w+'%';
  t.style.marginLeft=m>0?(r.scrollLeft/m*(100-w))+'%':'0';
  t.parentNode.style.visibility=m>0?'visible':'hidden';
 };
 r.addEventListener('scroll',set,{passive:true});
 set();
}

// Rapikan beranda: gabungkan kartu koin/voucher/favorit ke kartu sapaan, hapus strip keunggulan,
// dan sembunyikan kotak Terlaris/Terbaru selama produk masih sedikit (isinya hanya mengulang daftar di bawahnya).
function rapikan(){
 const k1=app.firstElementChild,dm=app.querySelector('.dompet');
 if(k1&&dm&&k1!==dm&&k1.querySelector('.stat')){dm.classList.remove('box');dm.classList.add('in');k1.appendChild(dm)}
 const u=app.querySelector('.ung');
 if(u)u.remove();
 const dua=app.querySelector('.dua');
 if(dua&&app.querySelectorAll('.grid .card').length<6)dua.remove();
}

// Tampilkan nama pembeli, bukan alamat email.
async function namaSapaan(){
 if(!user)return;
 const b=app.querySelector('.stat')&&app.querySelector('.oh b');
 if(!b||b.textContent.indexOf('@')<0)return;
 let nm='';
 try{
  const r=await db.from('profiles').select('nama').eq('id',user.id).maybeSingle();
  nm=(r.data&&r.data.nama)||'';
 }catch(e){}
 b.textContent='Halo, '+(nm||String(user.email||'').split('@')[0]);
}

// Ganti kotak kategori di beranda dengan baris menu tunggal.
const _bL=beranda;
beranda=async function(){
 await _bL();
 try{
  if((location.hash||'#/')!=='#/'||app.querySelector('.mnu'))return;
  const kt=app.querySelector('.ikon');
  if(!kt)return;
  const h=menu(kt);
  kt.insertAdjacentHTML('beforebegin',h);
  kt.remove();
  bar();
  rapikan();
  await namaSapaan();
 }catch(e){}
};
})();
