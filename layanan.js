// Layanan digital (pulsa, data, PLN, tagihan, e-wallet, game) di beranda.
// Tahap 1: tampilan strip ikon dan halaman "segera hadir". Transaksi akan disambung ke Digiflazz lewat fungsi server di folder api/.
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

const strip=()=>`<div class='box lay'><div class='lay-r' id='layr'>${LAY.map(ikn).join('')}</div><div class='lay-b'><i id='layi'></i></div></div>`;

// Penanda posisi geser di bawah baris ikon.
function bar(){
 const r=document.getElementById('layr'),t=document.getElementById('layi');
 if(!r||!t)return;
 const set=()=>{
  const m=r.scrollWidth-r.clientWidth,w=r.scrollWidth>0?Math.min(100,r.clientWidth/r.scrollWidth*100):100;
  t.style.width=w+'%';
  t.style.marginLeft=m>0?(r.scrollLeft/m*(100-w))+'%':'0';
 };
 r.addEventListener('scroll',set,{passive:true});
 set();
}

const judul2=t=>`<h2 class='hd'><a href='#/' aria-label='Kembali'>&larr;</a>${t}</h2>`;

function halaman(id){
 const l=LAY.find(x=>x[0]===id);
 if(!l)return `<p class='msg'>Layanan tidak ditemukan. <a href='#/'>Kembali ke beranda</a></p>`;
 const wa=C.WA?`<a class='btn line' href='https://wa.me/${esc(C.WA)}?text=${encodeURIComponent('Halo, saya mau tanya layanan '+l[1])}'>Tanya via WhatsApp</a>`:'';
 return judul2(esc(l[1]))+
  `<div class='box lay-soon'><i>${l[2]}</i><b>Segera hadir</b><p>${esc(l[3])} sedang kami siapkan. Nantikan ya.</p>${wa}</div>`+
  `<div class='box'><b>Layanan lainnya</b><div class='lay-g'>${LAY.filter(x=>x[0]!==id).map(ikn).join('')}</div></div>`;
}

const _r=AKUN.route.bind(AKUN);
AKUN.route=async function(h){
 if(h.startsWith('/layanan/')){
  const id=h.slice(9),l=LAY.find(x=>x[0]===id);
  app.innerHTML=halaman(id);
  document.title=(l?l[1]+' | ':'')+namaToko();
  return true;
 }
 return _r(h);
};

// Sisipkan strip layanan di atas ikon kategori (setelah kartu koin/voucher bila pembeli sudah masuk).
const _bL=beranda;
beranda=async function(){
 await _bL();
 try{
  if((location.hash||'#/')!=='#/'||app.querySelector('.lay'))return;
  const kt=app.querySelector('.ikon');
  if(!kt)return;
  kt.insertAdjacentHTML('beforebegin',strip());
  bar();
 }catch(e){}
};
})();
