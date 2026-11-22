// Tambahan etalase: urut dan filter harga, muat lagi, flash sale, rating di kartu, multi-foto, produk terkait,
// bagikan, segarkan harga keranjang, dan PWA. Memakai global dari app.js; dimuat paling akhir.
// Dibungkus fungsi agar nama di sini tidak bentrok dengan modul lain.
(()=>{
const CACHE={};
let URUT='baru',MIN='',MAKS='',BATAS=24,LH='',LIST=[],ARG=[],TS=0;
const flashAktif=p=>!!(p&&p.flash_persen&&Date.now()>=Date.parse(p.flash_mulai)&&Date.now()<Date.parse(p.flash_selesai));
// Pembulatan sama dengan harga_flash() di database (setengah ke atas).
const hargaFlash=(h,p)=>flashAktif(p)?Math.max(1,Math.floor((h*(100-p.flash_persen)+50)/100)):h;
const hargaEf=p=>hargaFlash(p.price,p);
const tglFl=s=>new Date(s).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

ambilProduk=async function(f){
 let q=db.from('products').select('id,name,price,harga_coret,image_url,stock,category_id,flash_persen,flash_mulai,flash_selesai').eq('is_active',true).order('created_at',{ascending:false}).limit(200);
 if(f.kat)q=q.eq('category_id',f.kat);
 if(f.cari)q=q.ilike('name','%'+f.cari.replace(/[%_,()]/g,' ')+'%');
 const[p,t,r]=await Promise.all([q,db.from('produk_terjual').select('product_id,terjual'),db.from('produk_rating').select('product_id,rata,jumlah')]);
 if(p.error)throw p.error;
 const T={},R={};
 (t.data||[]).forEach(x=>{T[x.product_id]=x.terjual});
 (r.data||[]).forEach(x=>{R[x.product_id]=x});
 return p.data.map(x=>{const o={...x,terjual:T[x.id]||0,rata:R[x.id]?+R[x.id].rata:0,jumlah:R[x.id]?R[x.id].jumlah:0};CACHE[x.id]=o;return o});
};

// Harga flash, badge, dan rating pada kartu produk yang sudah tampil.
function hias(root){
 root.querySelectorAll('a.card').forEach(a=>{
  const id=(a.getAttribute('href')||'').slice(4),p=CACHE[id];
  if(!p||a.dataset.h)return;
  a.dataset.h='1';
  const pr=a.querySelector('.price'),im=a.querySelector('.im'),bd=a.querySelector('.bd');
  if(flashAktif(p)){
   if(pr)pr.innerHTML=`<b class='fls'>${rp(hargaFlash(p.price,p))}</b> <s>${rp(p.price)}</s>`;
   if(im)im.insertAdjacentHTML('beforeend',`<b class='dsk fl'>&#9889;-${p.flash_persen}%</b>`);
  }
  if(p.jumlah&&bd)bd.insertAdjacentHTML('beforeend',`<small class='rt'>&#9733; ${p.rata.toFixed(1)} (${p.jumlah})</small>`);
 });
}

const OPSI=[['baru','Terbaru'],['laris','Terlaris'],['rating','Rating tertinggi'],['murah','Harga terendah'],['mahal','Harga tertinggi']];
const URUTAN={baru:()=>0,laris:(a,b)=>b.terjual-a.terjual,rating:(a,b)=>(b.rata-a.rata)||(b.jumlah-a.jumlah),murah:(a,b)=>hargaEf(a)-hargaEf(b),mahal:(a,b)=>hargaEf(b)-hargaEf(a)};
const barHtml=()=>`<div class='box urut'><select id='srt' aria-label='Urutkan'>${OPSI.map(o=>`<option value='${o[0]}'${o[0]===URUT?' selected':''}>${o[1]}</option>`).join('')}</select><input id='hmin' type='number' min='0' inputmode='numeric' placeholder='Harga min' value='${esc(MIN)}'><input id='hmax' type='number' min='0' inputmode='numeric' placeholder='Harga maks' value='${esc(MAKS)}'><button id='trp' class='sm'>Terapkan</button></div>`;

function gambar(y){
 const judul=ARG[0],aktif=ARG[1];
 let ps=LIST.filter(x=>(MIN===''||hargaEf(x)>=+MIN)&&(MAKS===''||hargaEf(x)<=+MAKS));
 ps=ps.slice().sort(URUTAN[URUT]||URUTAN.baru);
 const tampil=ps.slice(0,BATAS),sisa=ps.length-tampil.length;
 app.innerHTML=chipKat(aktif)+`<h3>${esc(judul)}</h3>`+barHtml()+(tampil.length?gridHtml(tampil):`<p class='msg'>Produk tidak ditemukan.</p>`)+(sisa>0?`<p style='text-align:center'><button id='lagi' class='line'>Muat lagi (${sisa} produk)</button></p>`:'');
 hias(app);
 $('#srt').onchange=e=>{URUT=e.target.value;BATAS=24;gambar()};
 $('#trp').onclick=()=>{MIN=$('#hmin').value.trim();MAKS=$('#hmax').value.trim();BATAS=24;gambar()};
 const l=$('#lagi');
 if(l)l.onclick=()=>{BATAS+=24;gambar(scrollY)};
 if(y!=null)scrollTo(0,y);
}

daftar=async function(f,judul,aktif){
 if(location.hash!==LH){LH=location.hash;BATAS=24;URUT='baru';MIN='';MAKS=''}
 LIST=await ambilProduk(f);
 ARG=[judul,aktif];
 gambar();
};

const _bEt=beranda;
beranda=async function(){await _bEt();hias(app)};

async function lengkapiDetail(id){
 const[p,f,v]=await Promise.all([
  db.from('products').select('id,name,price,image_url,category_id,flash_persen,flash_mulai,flash_selesai').eq('id',id).single(),
  db.from('produk_foto').select('url').eq('product_id',id).order('urut').order('created_at'),
  db.from('varian').select('id,harga').eq('product_id',id)
 ]);
 if(p.error||!location.hash.startsWith('#/p/'+id))return;
 const P=p.data,V=v.data||[];
 document.title=P.name+' | '+namaToko();

 const urls=[P.image_url].concat((f.data||[]).map(x=>x.url)).filter((u,i,a)=>u&&a.indexOf(u)===i);
 const kiri=app.querySelector('.det>div');
 if(kiri&&urls.length>1){
  kiri.innerHTML=`<img id='gb' src='${esc(urls[0])}' alt='${esc(P.name)}'><div class='thumbs'>${urls.map((u,i)=>`<button type='button' class='${i?'':'on'}' data-u='${esc(u)}' aria-label='Foto ${i+1}'><img src='${esc(u)}' alt='' loading='lazy'></button>`).join('')}</div>`;
  kiri.querySelector('.thumbs').onclick=e=>{
   const b=e.target.closest('button[data-u]');if(!b)return;
   $('#gb').src=b.dataset.u;
   kiri.querySelectorAll('.thumbs button').forEach(x=>x.classList.toggle('on',x===b));
  };
 }

 const pr=app.querySelector('.price.big');
 if(flashAktif(P)&&pr){
  const hf=d=>`<b class='fls'>${rp(hargaFlash(d,P))}</b> <s>${rp(d)}</s> <b class='dsk fl' style='position:static'>&#9889; -${P.flash_persen}%</b>`;
  if(!V.length)pr.innerHTML=hf(P.price);
  pr.insertAdjacentHTML('afterend',`<p class='fl-info'><small>Flash sale berakhir ${tglFl(P.flash_selesai)}</small></p>`);
  const vr=$('#vr');
  if(vr&&V.length){
   vr.addEventListener('click',e=>{
    const t=e.target.closest('button[data-v]');if(!t)return;
    const x=V.find(y=>y.id===t.dataset.v);
    pr.innerHTML=hf(x&&x.harga?x.harga:P.price);
   });
  }
 }

 const kanan=app.querySelector('.det>div:last-child');
 if(kanan){
  kanan.insertAdjacentHTML('beforeend',` <button type='button' class='line' id='bagi'>Bagikan</button>`);
  $('#bagi').onclick=async()=>{
   const b=$('#bagi'),u=location.origin+'/p/'+id;
   try{
    if(navigator.share)await navigator.share({title:P.name,text:P.name+' - '+namaToko(),url:u});
    else{await navigator.clipboard.writeText(u);b.textContent='Tautan disalin'}
   }catch(e){}
  };
 }

 let rel=(await ambilProduk(P.category_id?{kat:P.category_id}:{})).filter(x=>x.id!==id);
 if(!rel.length&&P.category_id)rel=(await ambilProduk({})).filter(x=>x.id!==id);
 if(!rel.length||!location.hash.startsWith('#/p/'+id))return;
 app.insertAdjacentHTML('beforeend',`<h3 class='jd'>Produk terkait</h3>`+gridHtml(rel.slice(0,6)));
 hias(app);
}
const _dEt=detail;
detail=async function(id){
 await _dEt(id);
 if(!location.hash.startsWith('#/p/'))return;
 try{await lengkapiDetail(id)}catch(e){}
};
addEventListener('hashchange',()=>{if(!location.hash.startsWith('#/p/'))document.title=namaToko()});

// Harga dan stok keranjang disegarkan dari database (flash sale mulai atau berakhir, stok berubah, produk dihapus).
// Harga yang dibayar tetap dihitung server di buat_pesanan.
async function segarkan(paksa){
 if(!user)return;
 if(!paksa&&Date.now()-TS<15000)return;
 const c=cart.get(),ks=Object.keys(c);
 if(!ks.length)return;
 TS=Date.now();
 const ids=[...new Set(ks.map(k=>k.split(':')[0]))];
 const[p,v]=await Promise.all([
  db.from('products').select('id,price,stock,flash_persen,flash_mulai,flash_selesai').in('id',ids),
  db.from('varian').select('id,harga,stok').in('product_id',ids)
 ]);
 if(p.error||v.error)return;
 const P={},V={};
 p.data.forEach(x=>{P[x.id]=x});
 v.data.forEach(x=>{V[x.id]=x});
 let ubah=false;
 ks.forEach(k=>{
  const a=k.split(':'),x=P[a[0]],vv=a[1]?V[a[1]]:null;
  if(!x||(a[1]&&!vv)){delete c[k];ubah=true;return}
  const h=hargaFlash(vv&&vv.harga?vv.harga:x.price,x),s=vv?vv.stok:x.stock;
  if(c[k].price!==h||c[k].stock!==s){c[k].price=h;c[k].stock=s;if(c[k].qty>s)c[k].qty=s;ubah=true}
  if(c[k].qty<1){delete c[k];ubah=true}
 });
 if(ubah)cart.set(c);
}
const _cvEt=cartView;
cartView=async function(){try{await segarkan(false)}catch(e){}_cvEt()};
const _coEt=checkout;
checkout=async function(){try{await segarkan(true)}catch(e){}await _coEt()};

if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
})();
