// Koin (tahap 3c): 1 koin per Rp1.000 saat pesanan selesai; 1 koin = Rp1 saat checkout. Dimuat paling akhir.
let KOIN=0;
const _rpc3=db.rpc.bind(db);
db.rpc=async(fn,a,o)=>{
 const r=await _rpc3(fn,a,o);
 if(fn==='buat_pesanan'&&!r.error&&KOIN>0&&r.data&&r.data[0]){
  const k=await _rpc3('pakai_koin',{p_order:r.data[0].order_id,p_jumlah:KOIN});
  if(k.error)alert('Koin tidak bisa dipakai: '+k.error.message);
  else r.data=[{...r.data[0],total:r.data[0].total-k.data}];
  KOIN=0;
 }
 return r;
};
const _co2=checkout;
checkout=async function(){
 KOIN=0;
 await _co2();
 const f=$('#f');
 if(!f||!user||location.hash!=='#/checkout')return;
 const s=await db.rpc('saldo_koin'),saldo=s.error?0:(s.data||0);
 if(saldo<1||location.hash!=='#/checkout'||!$('#f'))return;
 const c=cart.get(),sub=Object.keys(c).reduce((t,i)=>t+c[i].price*c[i].qty,0);
 const ong=()=>{const x=f.elements.o?ONG.find(y=>y.id===f.elements.o.value):null;return x?x.tarif:0};
 [...f.querySelectorAll('p')].find(x=>!x.id).insertAdjacentHTML('beforebegin',`<label><input type='checkbox' id='kk' style='width:auto'> Pakai koin (saldo ${saldo} koin = ${rp(saldo)})</label><p id='ki'></p>`);
 const hitung=()=>{const base=sub-(VCH?VCH.pot:0),k=$('#kk').checked?Math.min(saldo,base):0;KOIN=k;$('#ki').textContent=k?`Koin dipakai: -${rp(k)}. Total akhir: ${rp(base-k+ong())}`:''};
 $('#kk').onchange=hitung;
 new MutationObserver(hitung).observe($('#tot'),{childList:true,characterData:true,subtree:true});
};
const _hk=hub;
hub=async function(){
 await _hk();
 if(!user||location.hash!=='#/saya')return;
 const s=await db.rpc('saldo_koin'),b=app.querySelector('.prof');
 if(s.error||!b||app.querySelector('#kb'))return;
 const n=s.data||0;
 b.insertAdjacentHTML('afterend',`<div class='box oh' id='kb'><span><b>&#129689; Koin Saya</b><br><small>Dapat 1 koin tiap Rp1.000 saat pesanan selesai</small></span><b>${n} koin (${rp(n)})</b></div>`);
};
