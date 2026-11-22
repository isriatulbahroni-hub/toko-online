// Tampilan mirip Shopee: ikon garis, bar cari dengan lup, strip pesanan/koin/favorit di beranda, ikon kategori
// dua baris, Flash Sale beranda dengan hitung mundur, tab bawah. Memakai global dari app.js; dimuat paling akhir.
(()=>{
const sv=d=>`<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>${d}</svg>`;
const IC={
 lup:sv(`<circle cx='11' cy='11' r='7'/><path d='M20 20l-3.5-3.5'/>`),
 rumah:sv(`<path d='M3 11l9-8 9 8'/><path d='M5 9.5V20h5v-6h4v6h5V9.5'/>`),
 grid:sv(`<rect x='4' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='4' y='13.5' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5'/>`),
 keranjang:sv(`<circle cx='9' cy='20' r='1.5'/><circle cx='18' cy='20' r='1.5'/><path d='M2 3h3l2.7 11.4a1.5 1.5 0 0 0 1.5 1.1h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7H6'/>`),
 chat:sv(`<path d='M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'/><path d='M8.5 12h.01M12 12h.01M15.5 12h.01' stroke-width='2.6'/>`),
 pesanan:sv(`<path d='M21 8l-9-5-9 5v8l9 5 9-5z'/><path d='M3 8l9 5 9-5M12 13v8'/>`),
 user:sv(`<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7'/>`),
 hati:sv(`<path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/>`)
};

// Header: lup di bar cari, ikon keranjang dan chat bergaya garis (badge keranjang tetap memakai .kbd).
const hd=document.querySelector('body>header');
if(hd){
 const c=$('#cari');
 if(c&&!c.querySelector('.lup'))c.insertAdjacentHTML('afterbegin',`<span class='lup'>${IC.lup}</span>`);
 const k=hd.querySelector("a[href='#/keranjang']");
 if(k)k.innerHTML=IC.keranjang+"<i class='bdg kbd' hidden></i>";
 const w=$('#wa');
 if(w)w.innerHTML=IC.chat;
}

// Tab bawah
const TAB={b:IC.rumah,k:IC.grid,c:IC.keranjang,p:IC.pesanan,s:IC.user};
document.querySelectorAll('#tab a').forEach(a=>{
 const b=a.querySelector('b');
 if(b&&TAB[a.dataset.t])b.innerHTML=TAB[a.dataset.t];
});

// Header halaman Saya (header.js): keranjang dan chat ikut bergaya garis.
const _ih=isiHs;
isiHs=function(){
 _ih();
 const k=HS.querySelector("a[href='#/keranjang']");
 if(k)k.innerHTML=IC.keranjang+"<i class='bdg kbd' hidden></i>";
 const c=HS.querySelector("a[aria-label='Chat penjual']");
 if(c)c.innerHTML=IC.chat;
 upd();
};

// Strip pesanan, koin, favorit (pengganti ringkasan Halo di beranda)
statUser=async function(){
 const[o,s]=await Promise.all([
  db.from('orders').select('status').eq('buyer_id',user.id),
  db.rpc('saldo_koin')
 ]);
 const baru=(o.data||[]).filter(x=>x.status==='baru').length,n=s.error?0:(+s.data||0);
 return `<div class='box wal'><a href='#/pesanan'>${IC.pesanan}<span><b>Pesanan</b><small>${baru?baru+' belum bayar':'Riwayat'}</small></span></a><a href='#/saya'><i class='koin'>K</i><span><b>${n}</b><small>Koin Saya</small></span></a><a href='#/favorit'>${IC.hati}<span><b>Favorit</b><small>Produk disukai</small></span></a></div>`;
};

// Ikon kategori: emoji menurut kata kunci nama kategori, huruf pertama jika tidak cocok.
const EM=[
 [/kain|songket|tenun|batik|bahan/i,'\u{1F9F5}'],
 [/selendang|syal|scarf|hijab|kerudung/i,'\u{1F9E3}'],
 [/busana|baju|pakaian|gamis|dress|fashion/i,'\u{1F457}'],
 [/aksesori|aksesoris|perhiasan|gelang|kalung/i,'\u{1F45C}'],
 [/sepatu|sandal/i,'\u{1F45F}'],
 [/\btas\b/i,'\u{1F45C}'],
 [/elektronik|gadget|\bhp\b|ponsel/i,'\u{1F4F1}'],
 [/makanan|snack|kue/i,'\u{1F35C}'],
 [/minuman/i,'\u{1F964}'],
 [/kecantikan|kosmetik|skincare/i,'\u{1F484}'],
 [/rumah|dapur|perabot/i,'\u{1F3E0}'],
 [/mainan|anak|bayi/i,'\u{1F9F8}'],
 [/buku|alat tulis/i,'\u{1F4DA}'],
 [/olahraga/i,'\u26BD'],
 [/otomotif|motor|mobil/i,'\u{1F697}'],
 [/kesehatan|obat/i,'\u{1F48A}']
];
const glyph=(k,i)=>{
 const e=EM.find(x=>x[0].test(k.nama));
 return e?e[1]:`<span style='color:${WR[(i+1)%6]};font:700 18px system-ui'>${esc(k.nama.charAt(0).toUpperCase())}</span>`;
};
ikon=function(wrap){
 const it=[`<a href='#/semua'><i><span style='color:${WR[0]};font-size:22px'>&#9733;</span></i>Semua</a>`]
  .concat(KAT.map((k,i)=>`<a href='#/k/${k.id}'><i>${glyph(k,i)}</i>${esc(k.nama)}</a>`));
 if(wrap)return `<div class='box ikon wrap'>${it.join('')}</div>`;
 return `<div class='box ikw'><div class='ikon sh${it.length>5?' dua-b':''}'>${it.join('')}</div><div class='gl'><i></i></div></div>`;
};

// Penanda geser di bawah ikon kategori
function aturIkon(){
 const s=app.querySelector('.ikon.sh'),g=app.querySelector('.gl');
 if(!s||!g)return;
 const t=g.firstElementChild;
 const up=()=>{
  const lebar=s.scrollWidth-s.clientWidth;
  if(lebar<=2){g.hidden=true;return}
  g.hidden=false;
  const r=s.clientWidth/s.scrollWidth;
  t.style.width=(r*100)+'%';
  t.style.left=((s.scrollLeft/lebar)*(100-r*100))+'%';
 };
 s.addEventListener('scroll',up,{passive:true});
 up();
}

// Flash Sale beranda: produk yang flash sale-nya sedang berjalan, dengan hitung mundur ke yang paling cepat berakhir.
async function flash(){
 const t=new Date().toISOString();
 const r=await db.from('products').select('id,name,price,image_url,flash_persen,flash_selesai').eq('is_active',true).gt('flash_persen',0).lte('flash_mulai',t).gt('flash_selesai',t).order('flash_persen',{ascending:false}).limit(12);
 if(r.error||!r.data||!r.data.length)return;
 if(!$('#ban')||$('#fs')||(location.hash&&location.hash!=='#/'))return;
 const ps=r.data,akhir=Math.min(...ps.map(p=>Date.parse(p.flash_selesai)));
 const hrg=p=>Math.max(1,Math.floor((p.price*(100-p.flash_persen)+50)/100));
 const html=`<div class='box fs' id='fs'><div class='oh'><span class='fh'><b class='fj'>&#9889; FLASH SALE</b><span class='cd' id='cd'></span></span><a href='#/semua'>Semua produk &rsaquo;</a></div><div class='fr'>${ps.map(p=>`<a href='#/p/${p.id}'><div class='im'>${img(p)}<b class='dsk'>-${p.flash_persen}%</b></div><b class='fp'>${rp(hrg(p))}</b><small><s>${rp(p.price)}</s></small></a>`).join('')}</div></div>`;
 const dua=app.querySelector('.dua');
 if(dua)dua.insertAdjacentHTML('beforebegin',html);
 else $('#ban').insertAdjacentHTML('afterend',html);
 const tik=()=>{
  const e=$('#cd');
  if(!e){clearInterval(id);return}
  const d=Math.floor((akhir-Date.now())/1000);
  if(d<=0){clearInterval(id);const f=$('#fs');if(f)f.remove();return}
  const h=Math.floor(d/3600),m=Math.floor(d%3600/60),s=d%60;
  e.innerHTML=[h,m,s].map(x=>`<i>${String(x).padStart(2,'0')}</i>`).join(':');
 };
 const id=setInterval(tik,1000);
 tik();
}

const _bs=beranda;
beranda=async function(){
 await _bs();
 aturIkon();
 flash().catch(()=>{});
};
})();
