// Halaman akun pembeli: Saya, Akun dan Keamanan, Alamat, Favorit, Notifikasi, Bantuan, Privasi, Tentang.
// Memakai variabel global dari app.js (db, user, esc, rp, C, dst).
const VERSI='1.0';
const FAQ=[
 ['Bagaimana cara memesan?','Masuk atau daftar, pilih produk lalu ketuk Tambah ke keranjang. Buka Keranjang, tekan Checkout, isi alamat, pilih tujuan pengiriman, lalu Buat pesanan.'],
 ['Bagaimana cara membayar?','Pembayaran lewat transfer ke rekening toko yang tampil setelah pesanan dibuat. Setelah transfer, buka Pesanan, pilih pesanan Anda, lalu Unggah bukti bayar. Penjual akan mengonfirmasi pembayaran.'],
 ['Kapan pesanan dibatalkan otomatis?','Pesanan yang belum dibayar dan belum ada bukti bayarnya dibatalkan otomatis setelah 24 jam.'],
 ['Bagaimana membatalkan pesanan?','Selama statusnya Menunggu pembayaran, buka Pesanan lalu tekan Batalkan pesanan. Jika sudah dibayar, hubungi penjual lewat WhatsApp.'],
 ['Bagaimana ongkir dihitung?','Ongkir mengikuti tarif wilayah yang dipilih saat checkout. Jika toko belum menyediakan pilihan wilayah, ongkir dibicarakan lewat WhatsApp.'],
 ['Bagaimana melacak pengiriman?','Setelah pesanan dikirim, nama kurir dan nomor resi tampil di halaman Pesanan dan Notifikasi.'],
 ['Saya lupa kata sandi.','Di halaman Masuk, ketuk Lupa kata sandi, masukkan email, lalu ikuti tautan yang dikirim ke email Anda.'],
 ['Bagaimana mengubah alamat atau data akun?','Buka Saya, lalu Alamat Saya atau Akun dan Keamanan.']
];
const kosongTabel=r=>!!r.error&&/does not exist|schema cache|42P01|PGRST205/.test((r.error.code||'')+' '+(r.error.message||''));
const migrasiMsg=`<p class='msg'>Fitur ini belum aktif. Jalankan <b>0007_akun_pembeli.sql</b> di Supabase (SQL Editor).</p>`;
const baris=(href,label,extra)=>`<a href='${href}'><span>${label}</span><span class='ek'>${extra||''}<i>&rsaquo;</i></span></a>`;
const judul=t=>`<h2 class='hd'><a href='#/saya' aria-label='Kembali'>&larr;</a>${t}</h2>`;
const waLink=teks=>C.WA?'https://wa.me/'+esc(C.WA)+(teks?'?text='+encodeURIComponent(teks):''):'';
const tglPendek=s=>new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});

function formH(id,fn){
 const f=$('#'+id);
 f.onsubmit=async e=>{
  e.preventDefault();
  const b=f.querySelector('button'),m=f.querySelector('.mg');
  b.disabled=true;m.className='mg';m.textContent='';
  try{m.textContent=(await fn(f.elements))||'Tersimpan';m.className='mg ok'}
  catch(x){m.textContent=galat(x.message);m.className='mg er'}
  b.disabled=false;
 };
}

const AKUN={
 async route(h){
  const peta={'/saya':hub,'/akun':akunView,'/alamat':alamatView,'/favorit':favoritView,'/notif':notifView,'/bantuan':bantuanView,'/privasi':privasiView,'/tentang':tentangView};
  const fn=peta[h];
  if(!fn)return false;
  if(['/akun','/alamat','/favorit','/notif'].includes(h)&&!user){perluMasuk('#'+h);return true}
  await fn();
  return true;
 }
};

async function hub(){
 let c={},nf=0,na=0,nn=0;
 if(user){
  const[o,f,a]=await Promise.all([
   db.from('orders').select('status,bukti_path').eq('buyer_id',user.id),
   db.from('favorit').select('product_id',{count:'exact',head:true}),
   db.from('alamat_saya').select('id',{count:'exact',head:true})
  ]);
  (o.data||[]).forEach(x=>{c[x.status]=(c[x.status]||0)+1;if((x.status==='baru'&&!x.bukti_path)||x.status==='dikirim')nn++});
  nf=f.count||0;na=a.count||0;
 }
 const nama=user?((user.user_metadata||{}).nama||user.email):'';
 const ik=(k,e,l)=>`<a href='#/pesanan/${k}'><span class='ei'>${e}${c[k]?`<i class='bdg'>${c[k]}</i>`:''}</span>${l}</a>`;
 const atas=user?
  `<div class='box prof'><span class='av'>${esc(nama.charAt(0).toUpperCase())}</span><span><b>${esc(nama)}</b><br><small>${esc(user.email)}</small></span><a class='btn line sm' href='#/akun'>Ubah profil</a></div>`+
  `<div class='box'><div class='oh'><b>Pesanan Saya</b><a href='#/pesanan'>Lihat riwayat &rsaquo;</a></div><div class='pil'>${ik('baru','&#128179;','Belum bayar')}${ik('dibayar','&#128230;','Diproses')}${ik('dikirim','&#128666;','Dikirim')}${ik('selesai','&#9989;','Selesai')}${ik('batal','&#10060;','Batal')}</div></div>`+
  `<div class='sec'>Akun Saya</div><div class='box mn'>${baris('#/akun','Akun &amp; Keamanan')}${baris('#/alamat','Alamat Saya',na?na+' alamat':'')}${baris('#/favorit','Favorit Saya',nf?String(nf):'')}${baris('#/notif','Notifikasi',nn?`<b class='pill'>${nn}</b>`:'')}</div>`:
  `<div class='box oh'><span><b>Selamat datang</b><br><small>Masuk untuk membeli dan memantau pesanan</small></span><span class='sapa'><a class='btn sm' href='#/masuk'>Masuk</a><a class='btn line sm' href='#/daftar'>Daftar</a></span></div>`;
 const wa=waLink('')?`<a href='${waLink('')}' target='_blank' rel='noopener'><span>Hubungi Penjual</span><span class='ek'><i>&rsaquo;</i></span></a>`:'';
 app.innerHTML=atas+`<div class='sec'>Sokongan</div><div class='box mn'>${baris('#/bantuan','Pusat Bantuan')}${baris('#/info','Kebijakan Toko')}${baris('#/privasi','Kebijakan Privasi')}${wa}${baris('#/tentang','Tentang')}</div>`+(user?`<a class='btn line blk' href='#/keluar'>Keluar</a>`:'')+`<p class='ver'>${esc(namaToko())} v${VERSI}</p>`;
}

async function akunView(){
 const pr=(await db.from('profiles').select('nama,telp').eq('id',user.id).maybeSingle()).data||{};
 app.innerHTML=judul('Akun &amp; Keamanan')+
 `<form id='fp' class='box fm'><h3>Profil</h3><input name='n' placeholder='Nama lengkap' maxlength='100' value='${esc(pr.nama||(user.user_metadata||{}).nama||'')}' required><input name='t' type='tel' placeholder='No. WhatsApp' pattern='[0-9+ -]{8,20}' value='${esc(pr.telp||'')}'><button class='sm'>Simpan profil</button><small class='mg'></small></form>`+
 `<form id='fe' class='box fm'><h3>Email</h3><input name='e' type='email' value='${esc(user.email)}' required><button class='sm'>Ubah email</button><small class='mg'></small><p><small>Perubahan berlaku setelah Anda mengonfirmasi lewat tautan yang dikirim ke email.</small></p></form>`+
 `<form id='fs' class='box fm'><h3>Kata sandi</h3><input name='p' type='password' placeholder='Kata sandi baru (minimal 8 karakter)' minlength='8' required><input name='p2' type='password' placeholder='Ulangi kata sandi baru' minlength='8' required><button class='sm'>Ubah kata sandi</button><small class='mg'></small></form>`+
 `<div class='box'><h3>Keamanan</h3><p><small>Keluar dari akun ini di semua perangkat, misalnya jika HP hilang.</small></p><button id='gl' class='line sm'>Keluar dari semua perangkat</button></div>`+
 `<div class='box'><h3>Permohonan Penghapusan Akun</h3><p><small>Permohonan dikirim ke penjual lewat WhatsApp dan diproses oleh penjual.</small></p><button id='hp' class='line sm'>Ajukan penghapusan akun</button></div>`;
 formH('fp',async el=>{
  const n=el.n.value.trim(),t=el.t.value.trim();
  const r=await db.from('profiles').upsert({id:user.id,nama:n,telp:t,updated_at:new Date().toISOString()});
  if(r.error)throw r.error;
  await db.auth.updateUser({data:{nama:n}});
  return 'Profil disimpan';
 });
 formH('fe',async el=>{
  const e=el.e.value.trim();
  if(e===user.email)throw new Error('Email belum diubah');
  const r=await db.auth.updateUser({email:e});
  if(r.error)throw r.error;
  return 'Cek email Anda untuk mengonfirmasi perubahan';
 });
 formH('fs',async el=>{
  if(el.p.value!==el.p2.value)throw new Error('Kata sandi tidak sama');
  const r=await db.auth.updateUser({password:el.p.value});
  if(r.error)throw r.error;
  el.p.value='';el.p2.value='';
  return 'Kata sandi diperbarui';
 });
 $('#gl').onclick=async()=>{
  if(!confirm('Keluar dari semua perangkat?'))return;
  await db.auth.signOut({scope:'global'});
  user=null;upd();location.hash='#/';
 };
 $('#hp').onclick=()=>{
  const u=waLink('Halo, saya mohon penghapusan akun saya dengan email '+user.email+'.');
  if(!u){alert('Nomor WhatsApp penjual belum diisi di toko ini.');return}
  if(confirm('Buka WhatsApp untuk mengirim permohonan penghapusan akun ke penjual?'))window.open(u,'_blank','noopener');
 };
}

let AL=[];
async function alamatView(){
 const r=await db.from('alamat_saya').select('*').order('utama',{ascending:false}).order('created_at');
 if(kosongTabel(r)){app.innerHTML=judul('Alamat Saya')+migrasiMsg;return}
 if(r.error)throw r.error;
 AL=r.data||[];
 app.innerHTML=judul('Alamat Saya')+(AL.length?AL.map(a=>`<div class='box'><b>${esc(a.label)}</b>${a.utama?` <small class='pill'>Utama</small>`:''}<div>${esc(a.nama)} | ${esc(a.telp)}</div><div class='desk'><small>${esc(a.alamat)}</small></div><p><button class='line sm' data-ea='u' data-i='${a.id}'${a.utama?' hidden':''}>Jadikan utama</button> <button class='line sm' data-ea='e' data-i='${a.id}'>Ubah</button> <button class='line sm' data-ea='h' data-i='${a.id}'>Hapus</button></p></div>`).join(''):`<p class='msg'>Belum ada alamat tersimpan.</p>`)+`<button class='blk' id='ta'>+ Tambah alamat</button>`;
 $('#ta').onclick=()=>formAlamat();
 app.querySelectorAll('[data-ea]').forEach(b=>{
  b.onclick=async()=>{
   const i=b.dataset.i,a=AL.find(x=>x.id===i);
   if(b.dataset.ea==='e'){formAlamat(a);return}
   b.disabled=true;
   let z;
   if(b.dataset.ea==='h'){
    if(!confirm('Hapus alamat ini?')){b.disabled=false;return}
    z=await db.from('alamat_saya').delete().eq('id',i);
   }else{
    z=await db.from('alamat_saya').update({utama:false}).eq('user_id',user.id);
    if(!z.error)z=await db.from('alamat_saya').update({utama:true}).eq('id',i);
   }
   if(z.error){alert(z.error.message);b.disabled=false;return}
   alamatView();
  };
 });
}
function formAlamat(a){
 a=a||{};
 app.innerHTML=judul(a.id?'Ubah Alamat':'Tambah Alamat')+`<form id='fa' class='box fm'><input name='l' placeholder='Label (mis. Rumah, Kantor)' maxlength='30' value='${esc(a.label||'')}' required><input name='n' placeholder='Nama penerima' maxlength='100' value='${esc(a.nama||(user.user_metadata||{}).nama||'')}' required><input name='t' type='tel' placeholder='No. WhatsApp' pattern='[0-9+ -]{8,20}' value='${esc(a.telp||'')}' required><textarea name='a' rows='4' placeholder='Alamat lengkap (jalan, RT/RW, kelurahan, kecamatan, kota, kode pos)' minlength='10' maxlength='500' required>${esc(a.alamat||'')}</textarea><label><input type='checkbox' name='u' style='width:auto'${a.utama||!AL.length?' checked':''}> Jadikan alamat utama</label><p><button>Simpan</button><small class='mg'></small></p></form>`;
 $('#fa').onsubmit=async e=>{
  e.preventDefault();
  const f=e.target,el=f.elements,b=f.querySelector('button'),m=f.querySelector('.mg');
  b.disabled=true;
  const row={label:el.l.value.trim(),nama:el.n.value.trim(),telp:el.t.value.trim(),alamat:el.a.value.trim(),utama:el.u.checked};
  try{
   if(row.utama){const z=await db.from('alamat_saya').update({utama:false}).eq('user_id',user.id);if(z.error)throw z.error}
   const r=a.id?await db.from('alamat_saya').update(row).eq('id',a.id):await db.from('alamat_saya').insert({...row,user_id:user.id});
   if(r.error)throw r.error;
   alamatView();
  }catch(x){m.textContent=x.message;m.className='mg er';b.disabled=false}
 };
}

async function favoritView(){
 const r=await db.from('favorit').select('created_at,products(id,name,price,harga_coret,image_url,stock,category_id)').order('created_at',{ascending:false});
 if(kosongTabel(r)){app.innerHTML=judul('Favorit Saya')+migrasiMsg;return}
 if(r.error)throw r.error;
 const ps=(r.data||[]).map(x=>x.products).filter(Boolean).map(p=>({...p,terjual:0}));
 app.innerHTML=judul('Favorit Saya')+(ps.length?gridHtml(ps):`<p class='msg'>Belum ada produk favorit. Ketuk &#9825; Favorit di halaman produk.</p>`);
}

async function notifView(){
 const r=await db.from('orders').select('id,status,total,created_at,kurir,resi,bukti_path').eq('buyer_id',user.id).order('created_at',{ascending:false}).limit(30);
 if(r.error)throw r.error;
 const pesan=o=>({
  baru:o.bukti_path?['Bukti bayar terkirim','Menunggu konfirmasi penjual.']:['Menunggu pembayaran','Transfer lalu unggah bukti bayar. Pesanan dibatalkan otomatis jika belum ada bukti dalam 24 jam.'],
  dibayar:['Pembayaran dikonfirmasi','Pesanan sedang disiapkan penjual.'],
  dikirim:['Pesanan dikirim',(o.kurir||'Kurir')+(o.resi?', resi '+o.resi:'')],
  selesai:['Pesanan selesai','Terima kasih sudah berbelanja.'],
  batal:['Pesanan dibatalkan','Pesanan ini sudah tidak aktif.']
 }[o.status]||[o.status,'']);
 app.innerHTML=judul('Notifikasi')+(r.data.length?r.data.map(o=>{
  const[t,d]=pesan(o);
  return `<a class='box nt' href='#/pesanan/${esc(o.status)}'><b>${esc(t)}</b><br>${esc(d)}<br><small>Pesanan ${esc(String(o.id).slice(0,8))} &middot; ${tglPendek(o.created_at)} &middot; ${rp(o.total)}</small></a>`;
 }).join(''):`<p class='msg'>Belum ada notifikasi.</p>`);
}

function bantuanView(){
 app.innerHTML=judul('Pusat Bantuan')+FAQ.map(x=>`<details class='box'><summary>${esc(x[0])}</summary><p>${esc(x[1])}</p></details>`).join('')+(waLink('')?`<a class='btn blk' href='${waLink('')}' target='_blank' rel='noopener'>Hubungi penjual via WhatsApp</a>`:'');
}
function privasiView(){
 app.innerHTML=judul('Kebijakan Privasi')+`<div class='box'><p>Kami menyimpan data yang Anda isi: nama, email, nomor WhatsApp, alamat, riwayat pesanan, dan bukti bayar yang Anda unggah.</p><p>Data dipakai untuk memproses, mengirim, dan mengonfirmasi pesanan Anda. Data pesanan hanya dapat dilihat oleh Anda dan penjual toko ini.</p><p>Anda dapat mengubah profil dan alamat kapan saja di menu Saya. Untuk menghapus akun, gunakan Permohonan Penghapusan Akun di Akun dan Keamanan.</p><p><a href='#/info'>Lihat kebijakan toko</a></p></div>`;
}
function tentangView(){
 app.innerHTML=judul('Tentang')+`<div class='box'><h3>${esc(namaToko())}</h3><p>Toko online dengan stok yang terlihat langsung dan pesanan yang bisa dipantau dari akun Anda.</p><p><small>Versi ${VERSI}</small></p>${waLink('')?`<p><a class='btn sm' href='${waLink('')}' target='_blank' rel='noopener'>Hubungi penjual</a></p>`:''}<p><a href='#/info'>Kebijakan dan info toko</a></p></div>`;
}
