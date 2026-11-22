// Service worker sederhana: jaringan dulu, cadangan dari cache saat offline. Tidak menyentuh Supabase, admin, atau /api.
const V='toko-v1';
const AKAR=['./','index.html','style.css','header.css','etalase.css','app.js','akun.js','ulasan.js','voucher.js','varian.js','foto.js','koin.js','header.js','etalase.js','config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(AKAR)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/p/')||u.pathname.indexOf('admin')>=0)return;
 e.respondWith(fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(V).then(c=>c.put(r,k))}return x}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
});
