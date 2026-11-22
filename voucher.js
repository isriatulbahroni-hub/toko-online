// Voucher di checkout (tahap 3). Memakai global dari app.js; dimuat paling akhir.
let VCH=null;
const _rpc=db.rpc.bind(db);
db.rpc=(fn,a,o)=>fn==='buat_pesanan'&&VCH?_rpc(fn,{...a,p_voucher:VCH.kode},o):_rpc(fn,a,o);
const _co=checkout;
checkout=async function(){
 VCH=null;
 await _co();
 const f=$('#f');
 if(!f||location.hash!=='#/checkout')return;
 const c=cart.get(),sub=Object.keys(c).reduce((s,i)=>s+c[i].price*c[i].qty,0),so=f.elements.o;
 const hitung=()=>{const x=so?ONG.find(y=>y.id===so.value):null;$('#tot').textContent=rp(sub-(VCH?VCH.pot:0)+(x?x.tarif:0))};
 if(so){const lama=so.onchange;so.onchange=e=>{lama(e);hitung()}}
 f.querySelector('p').insertAdjacentHTML('beforebegin',`<div class='oi'><input id='vk' placeholder='Kode voucher' maxlength='30' autocapitalize='characters'><button type='button' id='vp' class='line sm'>Pakai</button></div><p id='vi'></p>`);
 $('#vk').oninput=()=>{VCH=null;$('#vi').textContent='';hitung()};
 $('#vp').onclick=async()=>{
  const k=$('#vk').value.trim(),vi=$('#vi');
  if(!k){VCH=null;vi.textContent='';hitung();return}
  const r=await db.rpc('cek_voucher',{p_kode:k,p_subtotal:sub});
  if(r.error){VCH=null;vi.textContent=r.error.message;vi.className='er'}
  else{VCH={kode:k,pot:r.data};vi.textContent='Voucher dipakai, hemat '+rp(r.data);vi.className='ok'}
  hitung();
 };
};
