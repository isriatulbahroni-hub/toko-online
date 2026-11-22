// Halaman produk untuk mesin pencari dan pratinjau tautan (WhatsApp, media sosial): /p/<id>.
// Berisi og:tag, data terstruktur Product (JSON-LD), dan isi produk sebagai teks biasa. Pengunjung biasa
// langsung diarahkan ke aplikasi di /#/p/<id>; crawler yang menjalankan JavaScript tidak diarahkan.
// Anon key memang publik; data yang dibaca hanya produk aktif milik penjual aktif (dijaga RLS).
const URL_DB='https://edbjjarwgnmwwwggecer.supabase.co';
const KUNCI='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYmpqYXJ3Z25td3d3Z2dlY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNjY5OTksImV4cCI6MjExMDg0Mjk5OX0.OyzInkZRPyL8cD12MG6lmoLs6x0Xq4HBciioXoSrXLs';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
function harga(p){
 const now=Date.now();
 if(p.flash_persen&&now>=Date.parse(p.flash_mulai)&&now<Date.parse(p.flash_selesai))return Math.max(1,Math.floor((p.price*(100-p.flash_persen)+50)/100));
 return p.price;
}
module.exports=async(req,res)=>{
 const id=String((req.query&&req.query.id)||'');
 const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 const host=req.headers['x-forwarded-host']||req.headers.host||'';
 const asal='https://'+host.replace(/[^a-z0-9.:-]/gi,'');
 let p=null,toko='Toko Online';
 if(valid){
  try{
   const h={apikey:KUNCI,Authorization:'Bearer '+KUNCI};
   const[a,b]=await Promise.all([
    fetch(URL_DB+'/rest/v1/products?id=eq.'+id+'&is_active=eq.true&select=name,description,price,stock,image_url,flash_persen,flash_mulai,flash_selesai&limit=1',{headers:h}).then(r=>r.json()),
    fetch(URL_DB+'/rest/v1/sellers?select=name&limit=1',{headers:h}).then(r=>r.json())
   ]);
   if(Array.isArray(a)&&a[0])p=a[0];
   if(Array.isArray(b)&&b[0]&&b[0].name)toko=b[0].name;
  }catch(e){}
 }
 const tujuan=valid?'/#/p/'+id:'/';
 const url=asal+(valid?'/p/'+id:'/');
 const hrg=p?harga(p):0;
 const judul=p?p.name+' - '+rp(hrg)+' | '+toko:toko;
 const desk=p?(String(p.description||'').slice(0,160)||('Beli '+p.name+' di '+toko)):('Belanja di '+toko);
 const gambar=p&&p.image_url&&/^https:\/\//.test(p.image_url)?p.image_url:'';
 let meta=`<link rel='canonical' href='${esc(url)}'><meta property='og:title' content='${esc(judul)}'><meta property='og:description' content='${esc(desk)}'><meta property='og:site_name' content='${esc(toko)}'><meta property='og:type' content='${p?'product':'website'}'><meta property='og:url' content='${esc(url)}'><meta name='twitter:card' content='${gambar?'summary_large_image':'summary'}'>`;
 if(gambar)meta+=`<meta property='og:image' content='${esc(gambar)}'>`;
 if(!p)meta+=`<meta name='robots' content='noindex'>`;
 let ld='';
 if(p){
  const data={'@context':'https://schema.org','@type':'Product',name:p.name,description:String(p.description||'').slice(0,500)||p.name,offers:{'@type':'Offer',priceCurrency:'IDR',price:hrg,availability:p.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',url}};
  if(gambar)data.image=[gambar];
  ld=`<script type='application/ld+json'>${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;
 }
 const isi=p
  ?`<main><h1>${esc(p.name)}</h1>${gambar?`<img src='${esc(gambar)}' alt='${esc(p.name)}' style='max-width:100%;height:auto'>`:''}<p><b>${rp(hrg)}</b>${p.stock>0?'':' (stok habis)'}</p><p>${esc(p.description||'')}</p><p><a href='${tujuan}'>Buka di ${esc(toko)}</a></p></main>`
  :`<main><p><a href='${tujuan}'>Buka ${esc(toko)}</a></p></main>`;
 const arah=`<script>if(!/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent))location.replace('${tujuan}')</script>`;
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 res.status(200).send(`<!doctype html><html lang='id'><head><meta charset='utf-8'><title>${esc(judul)}</title><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='description' content='${esc(desk)}'>${meta}${ld}</head><body>${isi}${arah}</body></html>`);
};
