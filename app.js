const C=window.CFG||{},$=s=>document.querySelector(s),app=$('#app');
const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').split(String.fromCharCode(34)).join('&quot;');
const db=(typeof supabase!=='undefined'&&C.SUPABASE_URL)?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
let user=null,KAT=[],PS=[],fp='semua',tm=null,SELLER={},ONG=[],tokoOk=false;
const ck=()=>user?'cart:'+user.id:null;
const cart={get(){try{return ck()?JSON.parse(localStorage.getItem(ck())||'{}'):{}}catch(e){return{}}},set(c){try{if(ck())localStorage.setItem(ck(),JSON.stringify(c))}catch(e){}upd()}};
function perluMasuk(back){try{sessionStorage.setItem('back',back)}catch(e){}location.hash='#/masuk'}
const galat=m=>({'Invalid login credentials':'Email atau kata sandi salah','Email not confirmed':'Cek email Anda dan klik tautan konfirmasi dulu','User already registered':'Email sudah terdaftar, silakan masuk'}[m]||m);
function upd(){const n=Object.values(cart.get()).reduce((s,x)=>s+x.qty,0);document.querySelectorAll('.kbd').forEach(e=>{e.textContent=n;e.hidden=!n})}
const STS={baru:['Menunggu pembayaran','#b9770e'],dibayar:['Dibayar','#1e8449'],dikirim:['Dikirim','#2471a3'],selesai:['Selesai','#555'],batal:['Dibatalkan','#c0392b']};

const namaToko=()=>SELLER.name||C.NAMA||'Toko Online';
const BR=()=>SELLER.beranda||{};
const aman=l=>(l&&(l.startsWith('#/')||l.startsWith('https://')))?l:'#/semua';
function terapkanNama(){
 const n=namaToko(),w=$('#wa');
 document.title=n;
 if(C.WA){w.href='https://wa.me/'+C.WA;w.target='_blank';w.rel='noopener'}
 $('#ft').innerHTML=esc(n)+`<br>&copy; ${new Date().getFullYear()}`;
}
const img=p=>p.image_url?`<img src='${esc(p.image_url)}' alt='${esc(p.name)}' loading='lazy'>`:`<div class='ph'></div>`;
const diskon=p=>p.harga_coret>p.price?Math.round((1-p.price/p.harga_coret)*100):0;
const kartu=p=>`<a class='card' href='#/p/${p.id}'><div class='im'>${img(p)}${diskon(p)?`<b class='dsk'>-${diskon(p)}%</b>`:''}${p.stock<1?`<span class='habis'>Habis</span>`:''}</div><div class='bd'><div class='nm'>${esc(p.name)}</div><div class='price'>${rp(p.price)}${diskon(p)?` <s>${rp(p.harga_coret)}</s>`:''}</div>${p.terjual?`<small>Terjual ${p.terjual}</small>`:''}</div></a>`;
const gridHtml=ps=>ps.length?`<div class='grid'>${ps.map(kartu).join('')}</div>`:`<p class='msg'>Belum ada produk.</p>`;
const namaKat=id=>(KAT.find(k=>k.id===id)||{}).nama||'';
async function muatKat(){if(KAT.length)return;const r=await db.from('categories').select('id,nama').order('urut');KAT=r.data||[]}
async function muatToko(){
 let r=await db.from('sellers').select('name,wa,rekening,kebijakan,beranda').limit(1).maybeSingle();
 if(r.error)r=await db.from('sellers').select('name,wa,rekening,kebijakan').limit(1).maybeSingle();
 SELLER=r.data||{};
 if(SELLER.wa){let d=String(SELLER.wa).replace(/[^0-9]/g,'');if(d.startsWith('0'))d='62'+d.slice(1);if(d)C.WA=d}
 const o=await db.from('ongkir').select('id,wilayah,tarif').order('urut').order('wilayah');ONG=o.data||[];
 terapkanNama();
}
function kecilkan(file){return new Promise((ok,gagal)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(u);cv.toBlob(b=>b?ok(b):gagal(new Error('Gagal memproses foto')),'image/jpeg',.85)};im.onerror=()=>gagal(new Error('Foto tidak bisa dibaca, coba format JPG atau PNG'));im.src=u})}
async function infoToko(){
 await muatToko();
 app.innerHTML=`<div class='box'><h2>${esc(namaToko())}</h2>`+(SELLER.kebijakan?`<p class='desk'>${esc(SELLER.kebijakan)}</p>`:`<p>Informasi kebijakan toko belum diisi.</p>`)+(SELLER.rekening?`<h3>Pembayaran</h3><p class='desk'>${esc(SELLER.rekening)}</p>`:'')+(C.WA?`<p><a class='btn' href='https://wa.me/${esc(C.WA)}'>Hubungi penjual via WhatsApp</a></p>`:'')+`</div>`;
}
function lupaView(){
 app.innerHTML=`<form id='lf' class='fm'><h2>Lupa kata sandi</h2><p>Masukkan email Anda. Kami kirim tautan untuk membuat kata sandi baru.</p><input name='e' type='email' placeholder='Email' required><button>Kirim tautan</button><p id='err'></p><p><a href='#/masuk'>Kembali masuk</a></p></form>`;
 $('#lf').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('button');btn.disabled=true;
  const r=await db.auth.resetPasswordForEmail(f.elements.e.value.trim(),{redirectTo:location.origin+location.pathname});
  if(r.error){$('#err').textContent=galat(r.error.message);btn.disabled=false;return}
  f.innerHTML=`<p class='ok'>Jika email terdaftar, tautan reset sudah dikirim. Cek kotak masuk Anda.</p>`};
}
function resetView(){
 if(!user){app.innerHTML=`<p class='msg'>Tautan reset tidak valid atau sudah kedaluwarsa. <a href='#/lupa'>Minta tautan baru</a></p>`;return}
 app.innerHTML=`<form id='rf' class='fm'><h2>Kata sandi baru</h2><input name='p' type='password' placeholder='Kata sandi baru (minimal 8 karakter)' minlength='8' required><button>Simpan</button><p id='err'></p></form>`;
 $('#rf').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('button');btn.disabled=true;
  const r=await db.auth.updateUser({password:f.elements.p.value});
  if(r.error){$('#err').textContent=galat(r.error.message);btn.disabled=false;return}
  f.innerHTML=`<p class='ok'>Kata sandi diperbarui. <a href='#/'>Lanjut belanja</a></p>`};
}

async function ambilProduk(f){
 let q=db.from('products').select('id,name,price,harga_coret,image_url,stock,category_id').eq('is_active',true).order('created_at',{ascending:false}).limit(120);
 if(f.kat)q=q.eq('category_id',f.kat);
 if(f.cari)q=q.ilike('name','%'+f.cari.replace(/[%_,()]/g,' ')+'%');
 const[p,t]=await Promise.all([q,db.from('produk_terjual').select('product_id,terjual')]);
 if(p.error)throw p.error;
 const T={};(t.data||[]).forEach(x=>{T[x.product_id]=x.terjual});
 return p.data.map(x=>({...x,terjual:T[x.id]||0}));
}

const WR=['#ee4d2d','#2d9cee','#27ae60','#8e44ad','#f39c12','#16a085'];
function ikon(wrap){
 return `<div class='box ikon${wrap?' wrap':''}'><a href='#/semua'><i style='background:${WR[0]}'>&#9733;</i>Semua</a>${KAT.map((k,i)=>`<a href='#/k/${k.id}'><i style='background:${WR[(i+1)%6]}'>${esc(k.nama.charAt(0).toUpperCase())}</i>${esc(k.nama)}</a>`).join('')}</div>`;
}
const chipKat=a=>`<div class='chips'><a class='${a==='semua'?'on':''}' href='#/semua'>Semua</a>${KAT.map(k=>`<a class='${a===k.id?'on':''}' href='#/k/${k.id}'>${esc(k.nama)}</a>`).join('')}</div>`;
function banner(){
 const bn=BR().banner,B=bn&&bn.length?bn:(C.BANNER&&C.BANNER.length?C.BANNER:[{judul:namaToko(),sub:'',tombol:'Lihat produk',link:'#/semua'}]);
 return `<div class='ban' id='ban'>${B.map(b=>`<div class='sl'><h2>${esc(b.judul)}</h2><p>${esc(b.sub||'')}</p><a class='btn sm' href='${esc(aman(b.link))}'>${esc(b.tombol||'Lihat produk')}</a></div>`).join('')}</div>`;
}
function putarBanner(){
 const el=$('#ban');if(!el||el.children.length<2||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 let n=0;tm=setInterval(()=>{n=(n+1)%el.children.length;el.scrollTo({left:n*el.clientWidth,behavior:'smooth'})},5000);
}
async function statUser(){
 const nama=esc((user.user_metadata||{}).nama||user.email);
 const r=await db.from('orders').select('status').eq('buyer_id',user.id),c={};
 (r.data||[]).forEach(o=>{c[o.status]=(c[o.status]||0)+1});
 const s=(k,l)=>`<a href='#/pesanan/${k}'><b>${c[k]||0}</b><small>${l}</small></a>`;
 return `<div class='box'><div class='oh'><b>Halo, ${nama}</b><a href='#/pesanan'>Pesanan saya &rsaquo;</a></div><div class='stat'>${s('baru','Belum bayar')}${s('dibayar','Diproses')}${s('dikirim','Dikirim')}${s('selesai','Selesai')}</div></div>`;
}
const sapa=()=>`<div class='box oh'><span><b>${esc(namaToko())}</b><br><small>Masuk untuk belanja dan memantau pesanan</small></span><span class='sapa'><a class='btn sm' href='#/masuk'>Masuk</a><a class='btn line sm' href='#/daftar'>Daftar</a></span></div>`;
const mini=ps=>ps.slice(0,2).map(p=>`<a href='#/p/${p.id}'>${img(p)}<small class='price'>${rp(p.price)}</small></a>`).join('');

async function beranda(){
 const[ps,st]=await Promise.all([ambilProduk({}),user?statUser():sapa()]);
 const laris=ps.filter(x=>x.terjual>0).sort((a,b)=>b.terjual-a.terjual);
 const kg=BR().keunggulan&&BR().keunggulan.length?BR().keunggulan:(C.KEUNGGULAN||[]);
 const pg=BR().pengumuman&&BR().pengumuman.length?BR().pengumuman:(C.PENGUMUMAN||[]);
 const ung=kg.map(u=>`<div><b>${esc(u[0])}</b><br><small>${esc(u[1]||'')}</small></div>`).join('');
 const info=pg.map(x=>`<li>${esc(x.judul)}${x.tgl?` <small>${esc(x.tgl)}</small>`:''}</li>`).join('');
 app.innerHTML=st+ikon()+banner()+(ps.length?`<div class='dua'><div class='box'><a class='tt' href='#/semua'>Terlaris &rsaquo;</a><div class='pv'>${mini(laris.length?laris:ps.slice(2))}</div></div><div class='box'><a class='tt' href='#/semua'>Terbaru &rsaquo;</a><div class='pv'>${mini(ps)}</div></div></div>`:'')+(ung?`<div class='box ung'>${ung}</div>`:'')+(info?`<div class='box'><b>Pengumuman</b><ul class='info'>${info}</ul></div>`:'')+`<h3 class='jd'>Produk untuk Anda</h3>`+gridHtml(ps);
 putarBanner();
}
async function daftar(f,judul,aktif){
 const ps=await ambilProduk(f);
 app.innerHTML=chipKat(aktif)+`<h3>${esc(judul)}</h3>`+(ps.length?gridHtml(ps):`<p class='msg'>Produk tidak ditemukan.</p>`);
}
function kategoriView(){app.innerHTML=`<h3>Kategori</h3>`+ikon(true)}
async function detail(id){
 const{data:p,error}=await db.from('products').select('*').eq('id',id).single();
 if(error)throw error;
 const t=await db.from('produk_terjual').select('terjual').eq('product_id',id).maybeSingle();
 const sold=(t.data||{}).terjual||0,d=diskon(p),kn=namaKat(p.category_id);
 app.innerHTML=`<p><a href='#/'>Beranda</a>${kn?` / <a href='#/k/${p.category_id}'>${esc(kn)}</a>`:''}</p><div class='det'><div>${img(p)}</div><div><h2>${esc(p.name)}</h2><p class='price big'>${rp(p.price)}${d?` <s>${rp(p.harga_coret)}</s> <b class='dsk'>-${d}%</b>`:''}</p>${sold?`<p>Terjual ${sold}</p>`:''}<p>Stok: ${p.stock}</p><p class='desk'>${esc(p.description)}</p>`+(p.stock>0?`<button id='add'>${user?'Tambah ke keranjang':'Masuk untuk membeli'}</button>`:`<p><b>Stok habis</b></p>`)+(user?` <button id='fav' class='line'>&#9825; Favorit</button>`:'')+`</div></div>`;
 const b=$('#add');
 if(b)b.onclick=()=>{if(!user){perluMasuk('#/p/'+p.id);return}const c=cart.get();c[p.id]={name:p.name,price:p.price,stock:p.stock,qty:Math.min(((c[p.id]||{}).qty||0)+1,p.stock)};cart.set(c);b.textContent='Masuk keranjang'};
 const fv=$('#fav');
 if(fv){
  let on=false;
  const tampil=()=>{fv.innerHTML=on?'&#10084; Difavoritkan':'&#9825; Favorit'};
  db.from('favorit').select('product_id').eq('product_id',p.id).maybeSingle().then(r=>{on=!!r.data;tampil()});
  fv.onclick=async()=>{
   fv.disabled=true;
   const r=on?await db.from('favorit').delete().eq('product_id',p.id).eq('user_id',user.id):await db.from('favorit').insert({user_id:user.id,product_id:p.id});
   if(r.error)alert(r.error.message);else{on=!on;tampil()}
   fv.disabled=false;
  };
 }
}
function cartView(){
 const c=cart.get(),ids=Object.keys(c);
 if(!ids.length){app.innerHTML=`<p class='msg'>Keranjang kosong. <a href='#/'>Mulai belanja</a></p>`;return}
 const total=ids.reduce((s,i)=>s+c[i].price*c[i].qty,0);
 app.innerHTML=`<h2>Keranjang</h2>`+ids.map(i=>`<div class='row'><span>${esc(c[i].name)}<br><small>${rp(c[i].price)}</small></span><span><button data-a='-' data-i='${i}'>-</button> ${c[i].qty} <button data-a='+' data-i='${i}'>+</button></span></div>`).join('')+`<p class='price'>Total: ${rp(total)}</p><a class='btn' href='#/checkout'>Checkout</a>`;
}
function authView(dft){
 app.innerHTML=`<form id='af' class='fm'><h2>${dft?'Daftar':'Masuk'}</h2>`+(dft?`<input name='n' placeholder='Nama lengkap' maxlength='100' required>`:'')+`<input name='e' type='email' placeholder='Email' required><input name='p' type='password' placeholder='Kata sandi (minimal 8 karakter)' minlength='8' required><button>${dft?'Daftar':'Masuk'}</button><p id='err'></p><p>${dft?`Sudah punya akun? <a href='#/masuk'>Masuk</a>`:`Belum punya akun? <a href='#/daftar'>Daftar</a>`}</p>${dft?'':`<p><a href='#/lupa'>Lupa kata sandi?</a></p>`}</form>`;
 $('#af').onsubmit=async e=>{
  e.preventDefault();const f=e.target,btn=f.querySelector('button');btn.disabled=true;$('#err').textContent='';
  const cred={email:f.elements.e.value.trim(),password:f.elements.p.value};
  const r=dft?await db.auth.signUp({...cred,options:{data:{nama:f.elements.n.value.trim()}}}):await db.auth.signInWithPassword(cred);
  if(r.error){$('#err').textContent=galat(r.error.message);btn.disabled=false;return}
  if(!r.data.session){f.innerHTML=`<p class='ok'>Pendaftaran berhasil. Cek email Anda dan klik tautan konfirmasi, lalu <a href='#/masuk'>masuk</a>.</p>`;return}
  user=r.data.session.user;upd();
  let back='#/';try{back=sessionStorage.getItem('back')||'#/';sessionStorage.removeItem('back')}catch(x){}
  location.hash=back;
 };
}
async function checkout(){
 const c=cart.get(),ids=Object.keys(c);
 if(!ids.length){location.hash='#/keranjang';return}
 await muatToko();
 const pr=(await db.from('profiles').select('nama,telp,alamat').eq('id',user.id).maybeSingle()).data||{};
 const al=await db.from('alamat_saya').select('id,label,nama,telp,alamat,utama').order('utama',{ascending:false}).order('created_at');
 const AL2=al.error?[]:(al.data||[]),u=AL2[0]&&AL2[0].utama?AL2[0]:null;
 const sub=ids.reduce((s,i)=>s+c[i].price*c[i].qty,0);
 const opt=ONG.length?`<select name='o' required aria-label='Tujuan pengiriman'><option value=''>Pilih tujuan pengiriman</option>${ONG.map(x=>`<option value='${x.id}'>${esc(x.wilayah)} (${rp(x.tarif)})</option>`).join('')}</select>`:'';
 const pil=AL2.length?`<select name='s' aria-label='Alamat tersimpan'><option value=''>Pilih alamat tersimpan</option>${AL2.map(x=>`<option value='${x.id}'>${esc(x.label)}${x.utama?' (utama)':''}</option>`).join('')}</select>`:'';
 app.innerHTML=`<form id='f' class='fm'><h2>Checkout</h2>${pil}<input name='n' placeholder='Nama' maxlength='100' value='${esc(u?u.nama:(pr.nama||(user.user_metadata||{}).nama||''))}' required><input name='t' type='tel' placeholder='No. WhatsApp' pattern='[0-9+ -]{8,20}' value='${esc(u?u.telp:pr.telp)}' required><textarea name='a' rows='3' placeholder='Alamat lengkap' minlength='10' maxlength='500' required>${esc(u?u.alamat:pr.alamat)}</textarea>${opt}<p>Subtotal: ${rp(sub)}<br>Ongkir: <span id='ong'>${ONG.length?'pilih tujuan':'dibicarakan via WhatsApp'}</span><br><b>Total: <span id='tot'>${rp(sub)}</span></b></p><button>Buat pesanan</button><p id='err'></p></form>`;
 const so=$('#f').elements.o,sa=$('#f').elements.s;
 if(sa)sa.onchange=()=>{const a=AL2.find(y=>y.id===sa.value);if(a){const fe=$('#f').elements;fe.n.value=a.nama;fe.t.value=a.telp;fe.a.value=a.alamat}};
 if(so)so.onchange=()=>{const x=ONG.find(y=>y.id===so.value);$('#ong').textContent=x?rp(x.tarif):'pilih tujuan';$('#tot').textContent=rp(sub+(x?x.tarif:0))};
 $('#f').onsubmit=async e=>{
  e.preventDefault();const f=e.target,btn=f.querySelector('button');btn.disabled=true;
  const{data,error}=await db.rpc('buat_pesanan',{p_nama:f.elements.n.value,p_telp:f.elements.t.value,p_alamat:f.elements.a.value,p_items:ids.map(i=>({id:i,qty:c[i].qty})),p_ongkir:so&&so.value?so.value:null});
  if(error){$('#err').textContent=error.message;btn.disabled=false;return}
  const o=data[0],nl=String.fromCharCode(10),x=so?ONG.find(y=>y.id===so.value):null;
  const txt=['Pesanan '+String(o.order_id).slice(0,8)].concat(ids.map(i=>c[i].qty+'x '+c[i].name),x?['Ongkir '+x.wilayah+': '+rp(x.tarif)]:[],['Total '+rp(o.total),'Nama: '+f.elements.n.value,'Telp: '+f.elements.t.value,'Alamat: '+f.elements.a.value]).join(nl);
  cart.set({});
  app.innerHTML=`<div class='box'><h3>Pesanan dibuat</h3><p>Total ${rp(o.total)}.</p>`+(SELLER.rekening?`<p><b>Transfer ke:</b></p><p class='desk'>${esc(SELLER.rekening)}</p><p>Setelah transfer, unggah bukti bayar di <a href='#/pesanan'>Pesanan saya</a>.</p>`:`<p>Konfirmasikan pembayaran lewat WhatsApp.</p>`)+(C.WA?`<p><a class='btn' href='https://wa.me/${esc(C.WA)}?text=${encodeURIComponent(txt)}'>Konfirmasi via WhatsApp</a></p>`:'')+`<p><a href='#/pesanan'>Lihat pesanan saya</a></p></div>`;
 };
}
function pesananView(){
 const daf=PS.filter(o=>fp==='semua'||o.status===fp);
 const chips=['semua','baru','dibayar','dikirim','selesai','batal'].map(s=>`<button data-f='${s}' class='${s===fp?'on':''}'>${s==='semua'?'Semua':STS[s][0]}</button>`).join('');
 app.innerHTML=`<h2>Pesanan saya</h2><div class='chips'>${chips}</div>`+(daf.length?daf.map(o=>{
  const[lb,wr]=STS[o.status]||[o.status,'#555'],id8=String(o.id).slice(0,8);
  const tgl=new Date(o.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  const wa=C.WA?`<a class='btn line' href='https://wa.me/${esc(C.WA)}?text=${encodeURIComponent('Halo, saya mau konfirmasi pesanan '+id8+' (total '+rp(o.total)+')')}'>Konfirmasi via WhatsApp</a>`:'';
  const ong=o.ongkir>0?`<div class='oi'><span>Ongkir${o.wilayah?' ('+esc(o.wilayah)+')':''}</span><span>${rp(o.ongkir)}</span></div>`:'';
  const kirim=o.resi?`<p>Pengiriman: ${esc(o.kurir||'Kurir')}, resi <b>${esc(o.resi)}</b></p>`:'';
  let aksi='';
  if(o.status==='baru')aksi=(o.bukti_path?`<p class='ok'>Bukti bayar terkirim. Menunggu konfirmasi penjual.</p>`:`<p>${SELLER.rekening?`<b>Transfer ke:</b><br><span class='desk'>${esc(SELLER.rekening)}</span><br>`:''}<label class='btn'>Unggah bukti bayar<input type='file' accept='image/*' data-bukti='${o.id}' hidden></label></p>`)+`<p>${wa} <button class='line' data-batal='${o.id}'>Batalkan pesanan</button></p>`;
  return `<div class='box'><div class='oh'><span>Pesanan ${id8} <small>${tgl}</small></span><b style='color:${wr}'>${lb}</b></div>${o.order_items.map(i=>`<div class='oi'><span>${esc(i.name)} <small>x${i.qty}</small></span><span>${rp(i.price*i.qty)}</span></div>`).join('')}${ong}<div class='oi'><span>Total</span><b class='price'>${rp(o.total)}</b></div>${kirim}${aksi}</div>`;
 }).join(''):`<p class='msg'>${PS.length?'Tidak ada pesanan dengan status ini.':`Belum ada pesanan. <a href='#/'>Mulai belanja</a>`}</p>`);
}
async function pesananSaya(){
 await muatToko();
 const r=await db.from('orders').select('id,status,total,created_at,ongkir,wilayah,kurir,resi,bukti_path,order_items(name,qty,price)').eq('buyer_id',user.id).order('created_at',{ascending:false});
 if(r.error)throw r.error;
 PS=r.data;pesananView();
}

app.onclick=async e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.a){const c=cart.get(),i=d.i;c[i].qty=Math.min(c[i].qty+(d.a==='+'?1:-1),c[i].stock||99);if(c[i].qty<1)delete c[i];cart.set(c);cartView()}
 else if(d.f){fp=d.f;pesananView()}
 else if(d.batal){
  if(!confirm('Batalkan pesanan ini?'))return;
  b.disabled=true;const r=await db.rpc('batalkan_pesanan_saya',{p_order:d.batal});
  if(r.error){alert(r.error.message);b.disabled=false;return}
  try{await pesananSaya()}catch(x){app.innerHTML=`<p class='msg'>Gagal: ${esc(x.message)}</p>`}
 }
};
app.onchange=async e=>{
 const inp=e.target.closest('input[data-bukti]');if(!inp||!inp.files[0])return;
 const id=inp.dataset.bukti,lb=inp.closest('label');lb.firstChild.textContent='Mengunggah...';
 try{
  const blob=await kecilkan(inp.files[0]),path=user.id+'/'+id+'-'+Date.now()+'.jpg';
  const up=await db.storage.from('bukti').upload(path,blob,{contentType:'image/jpeg'});if(up.error)throw up.error;
  const r=await db.rpc('kirim_bukti',{p_order:id,p_path:path});if(r.error)throw r.error;
 }catch(x){alert(x.message)}
 try{await pesananSaya()}catch(x){app.innerHTML=`<p class='msg'>Gagal: ${esc(x.message)}</p>`}
};
$('#cari').onsubmit=e=>{e.preventDefault();const q=$('#q').value.trim();location.hash=q?'#/cari/'+encodeURIComponent(q):'#/semua'};

function tandaiTab(h){
 const S=['/saya','/akun','/alamat','/favorit','/notif','/bantuan','/privasi','/tentang','/masuk','/daftar'];
 const t=h==='/'?'b':(h==='/semua'||h==='/kategori'||h.startsWith('/k/'))?'k':(h==='/keranjang'||h==='/checkout')?'c':h.startsWith('/pesanan')?'p':S.includes(h)?'s':'';
 document.querySelectorAll('#tab a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));
}
async function route(){
 clearInterval(tm);
 const h=location.hash.slice(1)||'/';
 tandaiTab(h);upd();
 if(!db){app.innerHTML=`<p class='msg'>Isi config.js dengan URL dan anon key Supabase.</p>`;return}
 app.innerHTML=`<p class='msg'>Memuat...</p>`;scrollTo(0,0);
 if(h.indexOf('access_token')>=0||h.indexOf('type=recovery')>=0)return;
 try{
  await muatKat();
  if(!tokoOk){await muatToko();tokoOk=true}
  if(!h.startsWith('/cari/'))$('#q').value='';
  if(h==='/')await beranda();
  else if(h==='/semua')await daftar({},'Semua produk','semua');
  else if(h==='/kategori')kategoriView();
  else if(h.startsWith('/k/')){const id=h.slice(3);await daftar({kat:id},namaKat(id)||'Kategori',id)}
  else if(h.startsWith('/cari/')){const q=decodeURIComponent(h.slice(6));$('#q').value=q;await daftar({cari:q},'Hasil pencarian: '+q,'')}
  else if(h.startsWith('/p/'))await detail(h.slice(3));
  else if(h==='/masuk'||h==='/daftar'){if(user)location.hash='#/';else authView(h==='/daftar')}
  else if(h==='/keluar'){await db.auth.signOut();user=null;upd();location.hash='#/'}
  else if(h==='/info')await infoToko();
  else if(h==='/lupa')lupaView();
  else if(h==='/reset')resetView();
  else if(h==='/keranjang'||h==='/checkout'||h.startsWith('/pesanan')){
   if(!user)perluMasuk('#'+h);
   else if(h==='/keranjang')cartView();
   else if(h==='/checkout')await checkout();
   else{const s=h.split('/')[2];fp=STS[s]?s:'semua';await pesananSaya()}
  }
  else if(window.AKUN&&await AKUN.route(h)){}
  else app.innerHTML=`<p class='msg'>Halaman tidak ditemukan.</p>`;
 }catch(e){app.innerHTML=`<p class='msg'>Gagal: ${esc(e.message)}</p>`}
}
addEventListener('DOMContentLoaded',()=>{(async()=>{
 if(db){const r=await db.auth.getSession();user=r.data.session?r.data.session.user:null}
 if(db)db.auth.onAuthStateChange((ev,ses)=>{user=ses?ses.user:null;upd();if(ev==='PASSWORD_RECOVERY')location.hash='#/reset'});
 terapkanNama();
 upd();addEventListener('hashchange',route);route();
})()});
