// Sitemap untuk mesin pencari: beranda dan semua produk aktif. Diakses lewat /sitemap.xml (lihat vercel.json).
// Anon key memang publik; hanya produk aktif milik penjual aktif yang terbaca (dijaga RLS).
const URL_DB='https://edbjjarwgnmwwwggecer.supabase.co';
const KUNCI='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYmpqYXJ3Z25td3d3Z2dlY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNjY5OTksImV4cCI6MjExMDg0Mjk5OX0.OyzInkZRPyL8cD12MG6lmoLs6x0Xq4HBciioXoSrXLs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports=async(req,res)=>{
 const host=req.headers['x-forwarded-host']||req.headers.host||'';
 const asal='https://'+host.replace(/[^a-z0-9.:-]/gi,'');
 let ps=[];
 try{
  const r=await fetch(URL_DB+'/rest/v1/products?is_active=eq.true&select=id&order=created_at.desc&limit=5000',{headers:{apikey:KUNCI,Authorization:'Bearer '+KUNCI}});
  const j=await r.json();
  if(Array.isArray(j))ps=j.filter(p=>p&&UUID.test(String(p.id)));
 }catch(e){}
 const urls=['<url><loc>'+asal+'/</loc></url>'].concat(ps.map(p=>'<url><loc>'+asal+'/p/'+p.id+'</loc></url>'));
 res.setHeader('Content-Type','application/xml; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
 res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.join('')+'</urlset>');
};
