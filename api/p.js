// Pratinjau tautan produk untuk WhatsApp dan media sosial: /p/<id> memuat og:tag lalu diarahkan ke /#/p/<id>.
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
    fetch(URL_DB+'/rest/v1/products?id=eq.'+id+'&is_active=eq.true&select=name,description,price,image_url,flash_persen,flash_mulai,flash_selesai&limit=1',{headers:h}).then(r=>r.json()),
    fetch(URL_DB+'/rest/v1/sellers?select=name&limit=1',{headers:h}).then(r=>r.json())
   ]);
   if(Array.isArray(a)&&a[0])p=a[0];
   if(Array.isArray(b)&&b[0]&&b[0].name)toko=b[0].name;
  }catch(e){}
 }
 const tujuan=valid?'/#/p/'+id:'/';
 const judul=p?p.name+' - '+rp(harga(p))+' | '+toko:toko;
 const desk=p?(String(p.description||'').slice(0,160)||('Beli '+p.name+' di '+toko)):('Belanja di '+toko);
 let meta=`<meta property='og:title' content='${esc(judul)}'><meta property='og:description' content='${esc(desk)}'><meta property='og:site_name' content='${esc(toko)}'><meta property='og:type' content='${p?'product':'website'}'><meta property='og:url' content='${esc(asal+(valid?'/p/'+id:'/'))}'><meta name='twitter:card' content='${p&&p.image_url?'summary_large_image':'summary'}'>`;
 if(p&&p.image_url&&/^https:\/\//.test(p.image_url))meta+=`<meta property='og:image' content='${esc(p.image_url)}'>`;
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 res.status(200).send(`<!doctype html><html lang='id'><head><meta charset='utf-8'><title>${esc(judul)}</title><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='description' content='${esc(desk)}'>${meta}<meta http-equiv='refresh' content='0;url=${tujuan}'></head><body><script>location.replace('${tujuan}')</script><p><a href='${tujuan}'>Buka halaman produk</a></p></body></html>`);
};
