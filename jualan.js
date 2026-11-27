// Marketplace multi-penjual: Mulai Jualan, Dasbor Penjual/Platform, keranjang dan pesanan multi-toko, lapor toko.
// Memakai global dari app.js dan akun.js (db, user, cart, esc, rp, SELLER, ONG, KAT, PS, baris, judul, formH, dst).
// Dimuat paling akhir (setelah layanan.js) supaya membungkus fungsi yang sudah dibungkus skrip lain.
// Toko pertama yang aktif tetap menjadi "toko utama" untuk nama, beranda, dan kebijakan etalase (SELLER).
(()=>{
if(!db)return;
let SEL={},ONGSEMUA=[],TIDAK_COCOK=false;
const KATIDS={};
const nomorWA=t=>{let d=String(t||'').replace(/[^0-9]/g,'');if(d.startsWith('0'))d='62'+d.slice(1);return d};
const kunciProduk=k=>String(k).split(':')[0];

/* ---------- Toko di keranjang dan ongkir ---------- */
// Kunci keranjang: idProduk atau idProduk:idVarian. Mengembalikan peta idProduk ke idToko.
async function tokoKeranjang(){
 if(!user)return{};
 const c=cart.get(),ids=[...new Set(Object.keys(c).map(kunciProduk))];
 if(!ids.length)return{};
 const r=await db.from('products').select('id,seller_id').in('id',ids);
 const m={};(r.data||[]).forEach(p=>{m[p.id]=p.seller_id});
 return m;
}
// ONG dipakai checkout.js dan voucher.js: {id,wilayah,tarif}. Untuk keranjang beberapa toko, hanya wilayah yang dilayani
// semua toko (yang punya tarif) yang tampil, dan tarifnya adalah jumlah ongkir tiap toko. Server menghitung ulang per toko.
function hitungOng(sellerIds){
 TIDAK_COCOK=false;
 const per={};
 ONGSEMUA.forEach(x=>{(per[x.seller_id]=per[x.seller_id]||[]).push(x)});
 const ids=sellerIds.length?sellerIds:[SELLER.id].filter(Boolean);
 const R=ids.filter(s=>per[s]&&per[s].length);
 if(!R.length)return[];
 const hasil=[];
 per[R[0]].forEach(x=>{
  const nama=String(x.wilayah).trim().toLowerCase();
  let tarif=Number(x.tarif),ok=true;
  for(let i=1;i<R.length;i++){
   const y=per[R[i]].find(z=>String(z.wilayah).trim().toLowerCase()===nama);
   if(!y){ok=false;break}
   tarif+=Number(y.tarif);
  }
  if(ok)hasil.push({id:x.id,wilayah:x.wilayah,tarif});
 });
 if(!hasil.length)TIDAK_COCOK=true;
 return hasil;
}
muatToko=async function(){
 let r=await db.from('sellers').select('id,name,wa,rekening,kebijakan,beranda').eq('is_active',true).order('created_at').limit(1).maybeSingle();
 if(r.error)r=await db.from('sellers').select('id,name,wa,rekening,kebijakan').eq('is_active',true).order('created_at').limit(1).maybeSingle();
 SELLER=r.data||{};
 if(SELLER.wa){const d=nomorWA(SELLER.wa);if(d)C.WA=d}
 const[s,o,tk]=await Promise.all([
  db.from('sellers').select('id,name,wa,rekening'),
  db.from('ongkir').select('id,seller_id,wilayah,tarif').order('urut').order('wilayah'),
  tokoKeranjang()
 ]);
 SEL={};(s.data||[]).forEach(x=>{SEL[x.id]=x});
 ONGSEMUA=o.data||[];
 ONG=hitungOng([...new Set(Object.values(tk))]);
 terapkanNama();
};

/* ---------- Kategori: nama sama di beberapa toko digabung ---------- */
const _mk=muatKat;
muatKat=async function(){
 if(KAT.length)return;
 await _mk();
 const g={};
 KAT=KAT.filter(k=>{
  const n=String(k.nama).trim().toLowerCase();
  if(g[n]){g[n].push(k.id);return false}
  g[n]=[k.id];KATIDS[k.id]=g[n];return true;
 });
};
const _ap=ambilProduk;
ambilProduk=async function(f){
 const ids=f&&f.kat&&KATIDS[f.kat];
 if(!ids||ids.length<2)return _ap(f);
 const L=await Promise.all(ids.map(id=>_ap({...f,kat:id})));
 const seen={};
 return L.flat().filter(p=>seen[p.id]?false:(seen[p.id]=1));
};

/* ---------- Checkout multi-toko ---------- */
const _co4=checkout;
checkout=async function(){
 await _co4();
 const f=$('#f');
 if(!f||location.hash!=='#/checkout'||!TIDAK_COCOK)return;
 const b=f.querySelector("button:not([type='button'])");
 if(!b)return;
 b.disabled=true;
 b.insertAdjacentHTML('beforebegin',"<p class='msg'>Toko-toko di keranjang ini tidak punya tujuan pengiriman yang sama. Pesan dari satu toko dulu, lalu lanjutkan toko lain.</p>");
};
// Setelah buat_pesanan berhasil: bila pesanan lebih dari satu atau bukan dari toko utama,
// tampilkan rekening dan total per toko (menggantikan layar sukses bawaan checkout).
async function hasil(idPertama,c0){
 if(location.hash!=='#/checkout'||!user)return;
 const a=await db.from('orders').select('id,created_at').eq('id',idPertama).maybeSingle();
 if(!a.data)return;
 const b=await db.from('orders').select('id,seller_id,total').eq('buyer_id',user.id).eq('created_at',a.data.created_at);
 const os=b.data||[];
 if(!os.length||(os.length<2&&os[0].seller_id===SELLER.id))return;
 const ids=[...new Set(Object.keys(c0).map(kunciProduk))];
 const pr=await db.from('products').select('id,seller_id').in('id',ids);
 const sp={};(pr.data||[]).forEach(p=>{sp[p.id]=p.seller_id});
 const per={};
 Object.keys(c0).forEach(k=>{const s=sp[kunciProduk(k)];(per[s]=per[s]||[]).push(c0[k].qty+'x '+c0[k].name)});
 const nl=String.fromCharCode(10);
 if(location.hash!=='#/checkout')return;
 app.innerHTML=`<div class='box'><h3>${os.length>1?os.length+' pesanan dibuat':'Pesanan dibuat'}</h3>`+(os.length>1?`<p>Keranjang Anda berisi produk dari ${os.length} toko, jadi dibuat satu pesanan per toko. Bayar ke rekening masing-masing toko.</p>`:'')+`</div>`+os.map(o=>{
  const s=SEL[o.seller_id]||{},wa=nomorWA(s.wa);
  const txt=['Pesanan '+String(o.id).slice(0,8)].concat(per[o.seller_id]||[],['Total '+rp(o.total)]).join(nl);
  return `<div class='box'><b>${esc(s.name||'Toko')}</b><div>Pesanan ${esc(String(o.id).slice(0,8))} &middot; Total ${rp(o.total)}</div>`+(s.rekening?`<p><b>Transfer ke:</b></p><p class='desk'>${esc(s.rekening)}</p>`:`<p>Konfirmasikan pembayaran lewat WhatsApp toko.</p>`)+(wa?`<p><a class='btn line' href='https://wa.me/${wa}?text=${encodeURIComponent(txt)}'>Konfirmasi via WhatsApp</a></p>`:'')+`</div>`;
 }).join('')+`<p>Setelah transfer, unggah bukti bayar di <a href='#/pesanan'>Pesanan saya</a>.</p>`;
}
const _rpc5=db.rpc.bind(db);
db.rpc=async(fn,a,o)=>{
 const c0=fn==='buat_pesanan'?JSON.parse(JSON.stringify(cart.get())):null;
 const r=await _rpc5(fn,a,o);
 if(c0&&!r.error&&r.data&&r.data[0]){const id=r.data[0].order_id;setTimeout(()=>{hasil(id,c0).catch(()=>{})},0)}
 return r;
};

/* ---------- Pesanan saya: rekening dan WhatsApp mengikuti toko pesanan ---------- */
const _ps=pesananSaya;
pesananSaya=async function(){
 await _ps();
 const r=await db.from('orders').select('id,seller_id').eq('buyer_id',user.id);
 const m={};(r.data||[]).forEach(x=>{m[x.id]=x.seller_id});
 (PS||[]).forEach(o=>{o.seller_id=m[o.id]});
 pesananView();
};
const _pv3=pesananView;
pesananView=function(){
 _pv3();
 (PS||[]).forEach(o=>{
  const bx=[...app.querySelectorAll('.box')].find(x=>x.textContent.indexOf('Pesanan '+String(o.id).slice(0,8))>=0);
  if(!bx||bx.querySelector('[data-lapor]'))return;
  const s=SEL[o.seller_id],oh=bx.querySelector('.oh');
  if(s&&oh)oh.insertAdjacentHTML('afterend',`<p><small>Toko: <b>${esc(s.name)}</b></small></p>`);
  if(s&&o.seller_id!==SELLER.id){
   const d=bx.querySelector('.desk');if(d&&o.status==='baru')d.textContent=s.rekening||'';
   const w=bx.querySelector("a[href^='https://wa.me/']");
   if(w){const wa=nomorWA(s.wa);if(wa)w.href=w.href.replace(/wa\.me\/[0-9]+/,'wa.me/'+wa);else w.remove()}
  }
  if(o.seller_id)bx.insertAdjacentHTML('beforeend',`<p><button class='line sm' data-lapor='${esc(o.seller_id)}' data-order='${esc(o.id)}'>Lapor toko</button></p>`);
 });
};

/* ---------- Detail produk: nama toko dan Lapor toko ---------- */
const _d4=detail;
detail=async function(id){
 await _d4(id);
 if(!location.hash.startsWith('#/p/'))return;
 const r=await db.from('products').select('seller_id').eq('id',id).maybeSingle();
 const sid=r.data&&r.data.seller_id,s=SEL[sid],h=app.querySelector('.det h2');
 if(!s||!h||app.querySelector('[data-lapor]'))return;
 h.insertAdjacentHTML('afterend',`<p><small>Toko: <b>${esc(s.name)}</b></small>${user?` <button class='line sm' data-lapor='${esc(sid)}'>Lapor toko</button>`:''}</p>`);
};
app.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-lapor]');
 if(!b)return;
 if(!user){perluMasuk(location.hash);return}
 const t=prompt('Ceritakan masalah dengan toko ini (minimal 10 huruf). Laporan ditinjau admin platform dan identitas Anda tidak ditampilkan ke penjual.');
 if(t===null)return;
 if(t.trim().length<10){alert('Isi laporan minimal 10 huruf');return}
 b.disabled=true;
 const r=await db.rpc('laporkan_toko',{p_seller:b.dataset.lapor,p_alasan:t.trim(),p_order:b.dataset.order||null});
 if(r.error){alert(galat(r.error.message));b.disabled=false;return}
 b.textContent='Laporan terkirim';
});

/* ---------- Mulai Jualan, Dasbor Penjual, Dasbor Platform ---------- */
const _h2=hub;
hub=async function(){
 await _h2();
 if(!user||location.hash!=='#/saya')return;
 const[s,p]=await Promise.all([
  db.from('sellers').select('id,name,is_active,alasan_nonaktif').eq('owner_id',user.id).maybeSingle(),
  db.rpc('is_platform_admin')
 ]);
 const sok=[...app.querySelectorAll('.sec')].find(x=>x.textContent.trim()==='Sokongan');
 if(!sok||app.querySelector('#jl'))return;
 const t=s.data;
 let h='';
 if(t){
  h+=`<div class='sec'>Toko Saya</div><div class='box mn'>${baris('admin.html','Dasbor Penjual',`<small>${esc(t.name)} &middot; ${t.is_active?'Aktif':'Dinonaktifkan'}</small>`)}</div>`;
  if(!t.is_active)h+=`<div class='box'><small>Toko Anda dinonaktifkan oleh admin platform.${t.alasan_nonaktif?' Alasan: '+esc(t.alasan_nonaktif):''}</small></div>`;
 }else{
  h+=`<div class='box oh'><span><b>Mulai Jualan</b><br><small>Buka toko Anda sendiri, gratis dan langsung aktif</small></span><a class='btn sm' href='#/mulai-jualan'>Mulai</a></div>`;
 }
 if(p.data===true)h+=`<div class='box mn'>${baris('platform.html','Dasbor Platform')}</div>`;
 sok.insertAdjacentHTML('beforebegin',`<div id='jl'>${h}</div>`);
};
async function mulaiView(){
 document.querySelectorAll('#tab a').forEach(a=>a.classList.toggle('on',a.dataset.t==='s'));
 const s=await db.from('sellers').select('id,name').eq('owner_id',user.id).maybeSingle();
 if(s.data){
  app.innerHTML=judul('Mulai Jualan')+`<div class='box'><p>Akun ini sudah punya toko <b>${esc(s.data.name)}</b>.</p><a class='btn' href='admin.html'>Buka Dasbor Penjual</a></div>`;
  return;
 }
 app.innerHTML=judul('Mulai Jualan')+`<form id='fj' class='box fm'><p>Buka toko Anda sendiri. Toko langsung aktif dan produk bisa ditambah dari Dasbor Penjual. Pembayaran pembeli masuk langsung ke rekening Anda.</p><input name='n' placeholder='Nama toko' minlength='3' maxlength='60' required><input name='w' type='tel' placeholder='No. WhatsApp toko' pattern='[0-9+ -]{8,20}' required><textarea name='r' rows='3' placeholder='Rekening pembayaran (bank, nomor, atas nama)' minlength='5' maxlength='300' required></textarea><button>Buka toko</button><small class='mg'></small></form>`;
 formH('fj',async el=>{
  const r=await db.rpc('daftar_jualan',{p_nama:el.n.value,p_wa:el.w.value,p_rekening:el.r.value});
  if(r.error)throw r.error;
  location.href='admin.html';
  return 'Toko dibuka, membuka Dasbor Penjual...';
 });
}
const _ar=AKUN.route;
AKUN.route=async h=>{
 if(h==='/mulai-jualan'){
  if(!user){perluMasuk('#/mulai-jualan');return true}
  await mulaiView();
  return true;
 }
 return _ar(h);
};
})();
