// Pemeriksaan statis tanpa dependensi. Jalankan: node scripts/cek.js
// Dipakai juga oleh GitHub Actions (.github/workflows/cek.yml) pada setiap push dan pull request.
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const akar=path.join(__dirname,'..');
let gagal=0;
const salah=m=>{console.error('GAGAL: '+m);gagal++};
const baca=f=>fs.readFileSync(path.join(akar,f),'utf8');
const ada=f=>fs.existsSync(path.join(akar,f));
const daftar=d=>fs.existsSync(path.join(akar,d))?fs.readdirSync(path.join(akar,d)):[];
const cekSintaks=(berkas,nama)=>{
 try{cp.execFileSync(process.execPath,['--check',berkas],{stdio:'pipe'})}
 catch(e){salah('sintaks '+nama+': '+String(e.stderr||e.message).split('\n').find(Boolean))}
};

// 1. Sintaks semua berkas JavaScript, termasuk script inline di halaman admin
const js=daftar('.').filter(f=>f.endsWith('.js'))
 .concat(daftar('api').filter(f=>f.endsWith('.js')).map(f=>'api/'+f))
 .concat(daftar('scripts').filter(f=>f.endsWith('.js')).map(f=>'scripts/'+f));
js.forEach(f=>cekSintaks(path.join(akar,f),f));
['admin.html','admin-toko.html'].forEach(f=>{
 if(!ada(f))return;
 [...baca(f).matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{
  const t=path.join(os.tmpdir(),'cek-'+f.replace(/\W/g,'_')+'-'+i+'.js');
  fs.writeFileSync(t,m[1]);
  cekSintaks(t,f+' (script inline #'+(i+1)+')');
  fs.unlinkSync(t);
 });
});

// 2. Semua script di index.html ada, dan masuk daftar cache sw.js; semua isi daftar cache ada
const idx=baca('index.html'),sw=baca('sw.js');
[...idx.matchAll(/<script src='([^']+)'/g)].map(m=>m[1]).filter(s=>!/^https?:/.test(s)).forEach(s=>{
 if(!ada(s))salah('index.html memuat '+s+' yang tidak ada');
 if(!sw.includes("'"+s+"'"))salah(s+' belum ada di AKAR sw.js');
});
const akarSw=sw.match(/AKAR=\[([^\]]*)\]/);
if(!akarSw)salah('AKAR tidak ditemukan di sw.js');
else akarSw[1].split(',').map(s=>s.trim().replace(/^'|'$/g,'')).filter(s=>s&&s!=='./').forEach(s=>{if(!ada(s))salah('sw.js menyimpan '+s+' yang tidak ada')});

// 3. Migrasi: pola nama dan nomor berurutan tanpa celah (dua file bernomor sama diizinkan)
const mig=daftar('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
mig.forEach(f=>{if(!/^\d{4}[a-z]?_[a-z0-9_]+\.sql$/.test(f))salah('nama migrasi tidak sesuai pola: '+f)});
const nomor=[...new Set(mig.map(f=>+f.slice(0,4)))];
for(let i=1;i<nomor.length;i++)if(nomor[i]!==nomor[i-1]+1)salah('nomor migrasi loncat dari '+nomor[i-1]+' ke '+nomor[i]);

// 4. Kunci rahasia tidak boleh ikut ke repo: hanya JWT dengan role anon yang boleh ada
const periksa=js.filter(f=>f!=='scripts/cek.js').concat(['index.html','admin.html','admin-toko.html','manifest.webmanifest']);
periksa.forEach(f=>{
 if(!ada(f))return;
 const t=baca(f);
 for(const m of t.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)){
  try{const p=JSON.parse(Buffer.from(m[1],'base64url').toString());if(p.role&&p.role!=='anon')salah('JWT dengan role '+p.role+' ada di '+f)}catch(e){}
 }
 if(/service_role|sb_secret_/.test(t))salah('kata service_role atau sb_secret_ ada di '+f);
});

if(gagal){console.error('\n'+gagal+' masalah ditemukan');process.exit(1)}
console.log('Semua pemeriksaan lolos ('+js.length+' berkas JS, '+mig.length+' migrasi).');
