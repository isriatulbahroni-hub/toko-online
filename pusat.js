// Pusat voucher (klaim) dan Koin harian (check-in). Rute #/voucher dan #/koin, plus menu di halaman Saya.
// Dimuat setelah akun.js dan butuh migrasi 0017. Memakai global dari app.js dan akun.js.
(()=>{
const HAR=[5,5,10,10,15,15,50]; // harus sama dengan tabel di checkin_koin() pada 0017
const belum=e=>!!e&&/does not exist|schema cache|42883|42P01|PGRST202|PGRST205/.test((e.code||'')+' '+(e.message||''));
const migrasi=`<p class='msg'>Fitur ini belum aktif. Jalankan <b>0017_voucher_pusat_koin_harian.sql</b> di Supabase (SQL Editor).</p>`;
const judul2=t=>`<h2 class='hd'><a href='#/' aria-label='Kembali'>&larr;</a>${t}</h2>`;
const tgl=s=>new Date(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});

async function voucherView(){
 if(!user){perluMasuk('#/voucher');return}
 const r=await db.rpc('voucher_pusat');
 if(r.error){app.innerHTML=judul2('Pusat Voucher')+(belum(r.error)?migrasi:`<p class='msg'>Gagal: ${esc(r.error.message)}</p>`);return}
 const L=r.data||[];
 const kartu=v=>{
  const nilai=v.jenis==='persen'?v.nilai+'%':rp(v.nilai);
  const info=[`Min. belanja ${rp(v.min_belanja)}`,v.maks_potongan?`Maks. potongan ${rp(v.maks_potongan)}`:'',v.berlaku_sampai?`Berlaku sampai ${tgl(v.berlaku_sampai)}`:'',v.sisa!=null?`Sisa kuota ${v.sisa}`:''].filter(Boolean).map(x=>`<small>${esc(x)}</small>`).join('');
  const aksi=v.dipakai?`<button class='sm' disabled>Terpakai</button>`:v.diklaim?`<button class='line sm' data-s='${esc(v.kode)}'>Salin</button>`:`<button class='sm' data-k='${v.id}'>Klaim</button>`;
  return `<div class='box vc'><div class='vl'><b>${esc(nilai)}</b><small>DISKON</small></div><div class='vr'><b>Diskon ${esc(nilai)}</b>${v.diklaim&&v.kode?`<code>${esc(v.kode)}</code>`:''}${info}</div><div class='va'>${aksi}</div></div>`;
 };
 app.innerHTML=judul2('Pusat Voucher')+(L.length?`<p><small>Klaim voucher, lalu masukkan kodenya di kolom voucher saat Checkout.</small></p>`+L.map(kartu).join(''):`<p class='msg'>Belum ada voucher yang tersedia. Cek lagi nanti.</p>`);
 app.querySelectorAll('[data-k]').forEach(b=>{
  b.onclick=async()=>{
   b.disabled=true;
   const z=await db.rpc('klaim_voucher',{p_id:b.dataset.k});
   if(z.error){alert(galat(z.error.message));b.disabled=false;return}
   voucherView();
  };
 });
 app.querySelectorAll('[data-s]').forEach(b=>{
  b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.s);b.textContent='Tersalin'}catch(e){b.textContent=b.dataset.s}};
 });
}

async function koinView(pesan){
 if(!user){perluMasuk('#/koin');return}
 const[s,st,lg]=await Promise.all([
  db.rpc('saldo_koin'),
  db.rpc('status_checkin'),
  db.from('koin_log').select('jenis,jumlah,ket,created_at').order('created_at',{ascending:false}).limit(20)
 ]);
 if(st.error){app.innerHTML=judul2('Koin Saya')+(belum(st.error)?migrasi:`<p class='msg'>Gagal: ${esc(st.error.message)}</p>`);return}
 const n=s.error?0:(s.data||0),d=(st.data&&st.data[0])||{sudah:false,hari_ke:1,hadiah:HAR[0]};
 const sel=d.sudah?((d.hari_ke-1)%7)+1:((d.hari_ke-1)%7);
 const strip=HAR.map((h,i)=>`<div class='${i<sel?'sel':''}${i===sel&&!d.sudah?' now':''}'><b>${i<sel?'&#10003;':'+'+h}</b>Hari ${i+1}</div>`).join('');
 const aksi=d.sudah?`<button class='blk' disabled>Sudah check-in hari ini. Besok +${d.hadiah} koin</button>`:`<button class='blk' id='ci'>Check-in hari ini (+${d.hadiah} koin)</button>`;
 const riwayat=(lg.data||[]).map(x=>`<div class='oi'><span>${esc(x.ket||x.jenis)}<br><small>${tgl(x.created_at)}</small></span><b style='color:${x.jumlah>0?'#1e8449':'#c0392b'}'>${x.jumlah>0?'+':''}${x.jumlah}</b></div>`).join('');
 app.innerHTML=judul2('Koin Saya')+
  `<div class='box saldo'><small>Saldo koin</small><b>&#129689; ${n}</b><small>1 koin = ${rp(1)} saat checkout</small></div>`+
  `<div class='box'><b>Check-in harian</b><div class='hari'>${strip}</div>${pesan?`<p class='ok'>${esc(pesan)}</p>`:''}${aksi}<small>Check-in tiap hari tanpa putus untuk hadiah lebih besar. Hari ke-7 dapat hadiah terbesar, lalu mengulang.</small></div>`+
  `<div class='box'><b>Riwayat koin</b>${riwayat||`<p class='msg'>Belum ada riwayat koin.</p>`}</div>`;
 const ci=$('#ci');
 if(ci)ci.onclick=async()=>{
  ci.disabled=true;
  const z=await db.rpc('checkin_koin');
  if(z.error){alert(galat(z.error.message));ci.disabled=false;return}
  const r=(z.data&&z.data[0])||{};
  koinView(r.koin?'Dapat +'+r.koin+' koin!':'Check-in berhasil');
 };
}

const _r=AKUN.route.bind(AKUN);
AKUN.route=async function(h){
 if(h==='/voucher'){await voucherView();return true}
 if(h==='/koin'){await koinView();return true}
 return _r(h);
};

// Menu di halaman Saya (hanya untuk pembeli yang sudah masuk).
const _h=hub;
hub=async function(){
 await _h();
 try{
  if(!user||location.hash!=='#/saya')return;
  const mn=app.querySelector('.box.mn');
  if(mn&&!mn.querySelector('[href="#/voucher"]'))mn.insertAdjacentHTML('afterbegin',`<a href='#/voucher'><span>Pusat Voucher</span><span class='ek'><i>&rsaquo;</i></span></a><a href='#/koin'><span>Koin &amp; Check-in Harian</span><span class='ek'><i>&rsaquo;</i></span></a>`);
 }catch(e){}
};
})();
