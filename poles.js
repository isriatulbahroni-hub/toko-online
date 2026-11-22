// Poles beranda: banner paling atas, lalu kategori, judul bagian "Koleksi terbaru", dan kotak pengumuman bergaris emas.
// Dimuat paling akhir. Hanya mengubah susunan dan teks beranda; logika lain tetap.
(()=>{
const _tp=terapkanNama;
terapkanNama=function(){_tp();const q=$('#q');if(q)q.placeholder='Cari songket atau busana'};

const _bP=beranda;
beranda=async function(){
 await _bP();
 try{
  if((location.hash||'#/')!=='#/')return;
  const ban=$('#ban'),mnu=app.querySelector('.mnu'),fls=app.querySelector('.fls-box');
  const urut=[ban,mnu,fls].filter(Boolean);
  if(urut.length)app.prepend(...urut);
  const jd=app.querySelector('h3.jd');
  if(jd)jd.textContent='Koleksi terbaru';
  const u=app.querySelector('ul.info');
  if(u&&u.parentElement)u.parentElement.classList.add('umum');
 }catch(e){}
};
})();
