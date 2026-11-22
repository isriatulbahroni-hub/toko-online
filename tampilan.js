// Tampilan beranda gaya marketplace: ikon kategori 2 baris, kartu koin/voucher/favorit, strip flash sale,
// dan placeholder pencarian. Dimuat setelah modul lain. Hanya mengubah tampilan beranda; logika lain tetap.
(()=>{
const IK=[['songket',129525],['kain',129525],['selendang',129507],['syal',129507],['busana',128087],['baju',128087],['gamis',128087],['wanita',128087],['aksesori',128141],['aksesoris',128141],['perhiasan',128141],['tas',128092],['sepatu',128095],['hijab',129493],['kerudung',129493],['elektronik',128268],['makanan',127836],['minuman',129380],['kecantikan',128132],['rumah',127968],['anak',129528],['pria',128084]];
const emoji=n=>{const s=String(n).toLowerCase();for(const k of IK)if(s.includes(k[0]))return '&#'+k[1]+';';return '&#128717;'};

ikon=function(wrap){
 const t=(href,e,nm)=>`<a href='${href}'><i>${e}</i>${esc(nm)}</a>`;
 return `<div class='box ikon${wrap?' wrap':''}'>`+t('#/semua','&#128717;','Semua')+KAT.map(k=>t('#/k/'+k.id,emoji(k.nama),k.nama)).join('')+`</div>`;
};

const _tn=terapkanNama;
terapkanNama=function(){_tn();const q=$('#q');if(q)q.placeholder='Cari di '+namaToko()};

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
 return `<div class='box fls-box'><div class='oh'><b class='fls-t'>&#9889; FLASH SALE</b><span class='cd' id='cd' data-t='${akhir}'></span></div><div class='fs-row'>${fl.map(p=>`<a href='#/p/${p.id}'>${img(p)}<b class='price'>${rp(hf(p))}</b><small class='fs-d'>-${p.flash_persen}%</small></a>`).join('')}</div></div>`;
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
 box.insertAdjacentHTML('afterend',`<div class='box dompet'><a href='#/koin'><b>&#129689; ${n}</b><small>Koin saya</small></a><a href='#/voucher'><b>&#127873;</b><small>Voucher</small></a><a href='#/favorit'><b>&#9825;</b><small>Favorit</small></a></div>`);
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
