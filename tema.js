// Warna utama toko (bisa diganti dari admin) dan set ikon garis. Dimuat di <head> supaya warna langsung benar saat halaman tampil.
// Memasang variabel CSS: --o (utama), --od (gelap), --ot (tint), --ob (tepi tint). Aksen emas tetap.
(()=>{
const DEF='#6b1d3a',KEY='tema_warna2';
const ok=h=>typeof h==='string'&&/^#[0-9a-f]{6}$/i.test(h);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*t))};
const lum=h=>{const c=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const kontras=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};

// Gelapkan seperlunya agar teks putih di atas warna utama tetap terbaca (minimal 4,5:1).
function aman(h){
 h=ok(h)?h.toLowerCase():DEF;
 let c=h,t=0;
 while(kontras(c,'#ffffff')<4.5&&t<.9){t+=.05;c=mix(h,'#000000',t)}
 return c;
}
function turunan(h){const o=aman(h);return{o,od:mix(o,'#000000',.38),ot:mix(o,'#ffffff',.92),ob:mix(o,'#ffffff',.78)}}
function pasang(h,simpan){
 const t=turunan(h),s=document.documentElement.style;
 s.setProperty('--o',t.o);s.setProperty('--od',t.od);s.setProperty('--ot',t.ot);s.setProperty('--ob',t.ob);
 const m=document.getElementById('tc');if(m)m.setAttribute('content',t.o);
 if(simpan){try{localStorage.setItem(KEY,ok(h)?h.toLowerCase():DEF)}catch(e){}}
}

// Ambil warna dari database sekali per muat halaman. Jika kolom belum ada (migrasi 0018 belum dijalankan), tetap pakai warna bawaan.
let sudah=false;
async function muat(){
 if(sudah||typeof db==='undefined'||!db)return;
 sudah=true;
 try{
  const r=await db.from('sellers').select('warna').limit(1).maybeSingle();
  if(r.error)return;
  pasang(r.data&&ok(r.data.warna)?r.data.warna:DEF,true);
 }catch(e){}
}

// Ikon garis 24px, satu gaya untuk seluruh etalase.
const P={
 pulsa:`<rect x='7' y='2.5' width='10' height='19' rx='2'/><path d='M11 18.5h2'/>`,
 semua:`<rect x='4' y='4' width='6.5' height='6.5' rx='1'/><rect x='13.5' y='4' width='6.5' height='6.5' rx='1'/><rect x='4' y='13.5' width='6.5' height='6.5' rx='1'/><rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1'/>`,
 songket:`<rect x='4' y='4' width='16' height='16' rx='1.5'/><path d='M4 20l2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4'/><path d='M12 6.5l2.8 3-2.8 3-2.8-3z'/>`,
 selendang:`<path d='M4 6c3-2.5 5 2.5 8 0s5-2.5 8 0v7c-3-2.5-5 2.5-8 0s-5-2.5-8 0z'/><path d='M6 15.5v4M9 15v4.5M12 15.5v4M15 15v4.5M18 15.5v4'/>`,
 busana:`<path d='M9 3l3 2.8L15 3l2.5 4.2-2 3.3L19 21H5l3.5-10.5L6.5 7.2z'/>`,
 baju:`<path d='M8 3 3 6l2 4 3-1v11h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z'/>`,
 tas:`<path d='M5 8h14l-1 12H6z'/><path d='M9 8V6a3 3 0 0 1 6 0v2'/>`,
 sepatu:`<path d='M3 17v-3c0-1.5 1-2.5 2.5-2.5H8l3-3.5 3.5 2.5c1.5 1 4.5 1 6 2.5V17z'/><path d='M3 20h18'/>`,
 elektronik:`<rect x='4' y='5' width='16' height='11' rx='1.5'/><path d='M2 19h20'/>`,
 rumah:`<path d='M3 11l9-8 9 8'/><path d='M5 10v10h14V10'/>`,
 cantik:`<path d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'/>`,
 makanan:`<path d='M5 4h14l-1.5 16h-11z'/><path d='M5.5 9h13'/>`,
 anak:`<circle cx='12' cy='12' r='9'/><path d='M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01'/>`,
 lainnya:`<circle cx='6' cy='12' r='1.6'/><circle cx='12' cy='12' r='1.6'/><circle cx='18' cy='12' r='1.6'/>`,
 tag:`<path d='M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z'/><circle cx='7.5' cy='7.5' r='1.5'/>`,
 data:`<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'/>`,
 petir:`<path d='M13 2 4 14h7l-1 8 9-12h-7z'/>`,
 bohlam:`<path d='M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'/>`,
 air:`<path d='M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'/>`,
 bpjs:`<path d='M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'/><path d='M12 9v5M9.5 11.5h5'/>`,
 dompet:`<rect x='3' y='6' width='18' height='14' rx='2'/><path d='M3 10h18M16 15h2'/>`,
 game:`<rect x='2.5' y='7' width='19' height='11' rx='4'/><path d='M7 10.5v4M5 12.5h4M16 11.5h.01M18 13.5h.01'/>`,
 tv:`<rect x='3' y='5' width='18' height='12' rx='2'/><path d='M8 21h8M12 17v4'/>`,
 keranjang:`<circle cx='9' cy='20' r='1.5'/><circle cx='18' cy='20' r='1.5'/><path d='M2 3h3l2.5 12h11L21 7H6'/>`,
 chat:`<path d='M4 5h16v11H9l-5 4z'/>`,
 gift:`<rect x='3' y='8' width='18' height='13' rx='2'/><path d='M12 8v13M3 12h18'/><path d='M12 8c-3 0-4-4-1.5-4.5S12 8 12 8zM12 8c3 0 4-4 1.5-4.5S12 8 12 8z'/>`,
 hati:`<path d='M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'/>`,
 gear:`<circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'/>`
};
const svg=(n,c)=>`<svg class='ic${c?' '+c:''}' viewBox='0 0 24 24' aria-hidden='true'>${P[n]||P.tag}</svg>`;

// Pakai warna tersimpan di perangkat dulu agar tidak berkedip, lalu muat() menyamakan dengan database.
try{const c=localStorage.getItem(KEY);if(ok(c))pasang(c)}catch(e){}
window.TEMA={DEF,ok,aman,turunan,pasang,muat,kontras,svg};
})();
