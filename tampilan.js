// Tampilan beranda gaya marketplace: ikon kategori 2 baris, kartu koin/voucher/favorit, strip flash sale,
// dan placeholder pencarian. Dimuat setelah modul lain. Hanya mengubah tampilan beranda; logika lain tetap.
// Ikon memakai set garis dari tema.js; warna utama diatur admin (tema.js).
(()=>{
const IK=[['pulsa','pulsa'],['tagihan','pulsa'],['songket','baju'],['kain','baju'],['selendang','baju'],['syal','baju'],['busana','baju'],['baju','baju'],['gamis','baju'],['fashion','baju'],['pakaian','baju'],['wanita','baju'],['pria','baju'],['hijab','baju'],['kerudung','baju'],['aksesori','cantik'],['aksesoris','cantik'],['perhiasan','cantik'],['kecantikan','cantik'],['tas','tas'],['sepatu','sepatu'],['elektronik','elektronik'],['gadget','elektronik'],['makanan','makanan'],['minuman','makanan'],['rumah','rumah'],['dapur','rumah'],['anak','anak'],['bayi','anak']];
const ik=n=>{const s=String(n).toLowerCase();for(const k of IK)if(s.includes(k[0]))return TEMA.svg(k[1]);return TEMA.svg('tag')};

ikon=function(wrap){
 const t=(href,s,nm)=>`<a href='${href}'><i>${s}</i>${esc(nm)}</a>`;
 return `<div class='box ikon${wrap?' wrap':''}'>`+t('#/semua',TEMA.svg('semua'),'Semua')+KAT.map(k=>t('#/k/'+k.id,ik(k.nama),k.nama)).join('')+`</div>`;
};

const _tn=terapkanNama;
terapkanNama=function(){_tn();const q=$('#q');if(q)q.placeholder='Cari di '+namaToko();if(window.TEMA)TEMA.muat()};

// Simpan daftar produk beranda untuk strip flash sale (tanpa permintaan tambahan ke database).
let LAST=[],CD=0;
const _ap=ambilProduk;
ambilProduk=async function(f){const r=await _ap(f);if(!f||(!f.kat&&!f.cari))LAST=r;return r};

const aktif=p=>!!(p.flash_persen&&Date.now()>=Date.parse(p.flash_mulai)&&Date.now()<Date.parse(p.flash_selesai));
// Pembulatan sama dengan harga_flash() di database.
const hf=p=>Math.max(1,Math.floor((p.price*(100-p.flash_persen)+50)/100));

function flashHtml(){
 const fl=LAST.filter(aktif).slice(0,10);
 if(!fl.length)return '';
 const akhir=Math.min(...fl.map(p=>Date.parse(p.flash_selesai)));
 return `<div class='box fls-box'><div class='oh'><b class='fls-t'>${TEMA.svg('petir')} Flash Sale</b><span class='cd' id='cd' data-t='${akhir}'></span></div><div class='fs-row'>${fl.map(p=>`<a href='#/p/${p.id}'>${img(p)}<b class='price'>${rp(hf(p))}</b><small class='fs-d'>-${p.flash_persen}%</small></a>`).join('')}</div></div>`;
}

function jam(){
 const e=document.getElementById('cd');
 if(!e){clearInterval(CD);CD=0;return}
 const s=Math.max(0,Math.floor((+e.dataset.t-Date.now())/1000)),p=n=>String(n).padStart(2,'0');
 e.textContent=p(Math.floor(s/3600))+':'+p(Math.floor(s%3600/60))+':'+p(s%60);
}

async function dompet(){
 const s=await db.rpc('saldo_koin'),n=s.error?0:(s.data||0);
 if((location.hash||'#/')!=='#/'||app.querySelector('.dompet'))return;
 const box=app.querySelector('.box');
 if(!box)return;
 box.insertAdjacentHTML('afterend',`<div class='box dompet'><a href='#/koin'><b class='koin'><i></i>${n}</b><small>Koin saya</small></a><a href='#/voucher'><b>${TEMA.svg('gift')}</b><small>Voucher</small></a><a href='#/favorit'><b>${TEMA.svg('hati')}</b><small>Favorit</small></a></div>`);
}

const _bT=beranda;
beranda=async function(){
 await _bT();
 try{
  if((location.hash||'#/')!=='#/')return;
  const ban=$('#ban'),fh=flashHtml();
  if(ban&&fh&&!app.querySelector('.fls-box')){ban.insertAdjacentHTML('afterend',fh);clearInterval(CD);jam();CD=setInterval(jam,1000)}
  const kt=app.querySelector('.ikon');
  if(kt&&kt.children.length<=5)kt.classList.add('satu');
  if(user)await dompet();
 }catch(e){}
};
})();
