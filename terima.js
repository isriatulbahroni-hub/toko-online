// Tombol "Pesanan diterima" untuk pesanan berstatus dikirim (memanggil konfirmasi_diterima, migrasi 0016).
// Tanpa konfirmasi pembeli, pesanan dikirim selesai otomatis setelah 7 hari. Memakai global dari app.js; dimuat paling akhir.
(()=>{
const _pv=pesananView;
pesananView=function(){
 _pv();
 const daf=(PS||[]).filter(o=>o.status==='dikirim');
 if(!daf.length)return;
 app.querySelectorAll('.box').forEach(bx=>{
  const o=daf.find(x=>bx.textContent.indexOf('Pesanan '+String(x.id).slice(0,8))>=0);
  if(!o||bx.querySelector('[data-terima]'))return;
  bx.insertAdjacentHTML('beforeend',`<p><button class='line' data-terima='${esc(o.id)}'>Pesanan diterima</button></p>`);
 });
};
app.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-terima]');
 if(!b)return;
 if(!confirm('Pesanan sudah Anda terima dengan baik?'))return;
 b.disabled=true;
 const r=await db.rpc('konfirmasi_diterima',{p_order:b.dataset.terima});
 if(r.error){alert(galat(r.error.message));b.disabled=false;return}
 try{await pesananSaya()}catch(x){app.innerHTML=`<p class='msg'>Gagal: ${esc(x.message)}</p>`}
});
})();
