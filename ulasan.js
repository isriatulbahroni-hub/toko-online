// Ulasan dan rating produk (tahap 2). Memakai global dari app.js dan akun.js; dimuat paling akhir.
const bintang=n=>'&#9733;'.repeat(n)+'&#9734;'.repeat(5-n);
let ITEMS=[];
async function belumDinilai(){
 if(!user)return[];
 const o=await db.from('orders').select('id,order_items(product_id,name)').eq('buyer_id',user.id).eq('status','selesai');
 const u=await db.from('ulasan').select('order_id,product_id').eq('user_id',user.id);
 if(o.error||u.error)return[];
 const sudah=new Set((u.data||[]).map(x=>x.order_id+'|'+x.product_id)),out=[];
 (o.data||[]).forEach(x=>x.order_items.forEach(i=>{if(i.product_id&&!sudah.has(x.id+'|'+i.product_id))out.push({o:x.id,p:i.product_id,n:i.name})}));
 return out;
}
function formUlasan(it){
 const ops=[[5,'Sangat baik'],[4,'Baik'],[3,'Cukup'],[2,'Kurang'],[1,'Buruk']].map(x=>`<option value='${x[0]}'>${bintang(x[0])} ${x[1]}</option>`).join('');
 app.innerHTML=`<form id='fu' class='box fm'><h2>Nilai produk</h2><p><b>${esc(it.n)}</b></p><select name='r' aria-label='Rating'>${ops}</select><textarea name='t' rows='4' maxlength='500' placeholder='Ceritakan pengalaman Anda dengan produk ini'></textarea><button>Kirim ulasan</button><p id='err'></p><p><a href='#/pesanan'>Batal</a></p></form>`;
 $('#fu').onsubmit=async e=>{
  e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
  const r=await db.from('ulasan').insert({product_id:it.p,order_id:it.o,user_id:user.id,nama:(user.user_metadata||{}).nama||user.email.split('@')[0],rating:+f.elements.r.value,isi:f.elements.t.value.trim()});
  if(r.error){$('#err').textContent=galat(r.error.message);b.disabled=false;return}
  try{await pesananSaya()}catch(x){app.innerHTML=`<p class='msg'>Gagal: ${esc(x.message)}</p>`}
 };
}
async function tampilNilai(){
 const L=await belumDinilai();
 if(!L.length||!location.hash.startsWith('#/pesanan')||app.querySelector('[data-nilai]'))return;
 ITEMS=L;
 app.insertAdjacentHTML('afterbegin',`<div class='box'><b>Menunggu dinilai</b>${L.map((x,i)=>`<div class='oi'><span>${esc(x.n)}</span><button class='line sm' data-nilai='${i}'>Nilai</button></div>`).join('')}</div>`);
}
const _pv=pesananView;
pesananView=function(){_pv();tampilNilai()};
const _dt=detail;
detail=async function(id){
 await _dt(id);
 const r=await db.from('ulasan').select('nama,rating,isi,created_at').eq('product_id',id).order('created_at',{ascending:false}).limit(20);
 if(r.error||!location.hash.startsWith('#/p/'))return;
 const L=r.data||[],avg=L.length?(L.reduce((s,x)=>s+x.rating,0)/L.length).toFixed(1):'';
 app.insertAdjacentHTML('beforeend',`<div class='box'><h3>Ulasan${L.length?` <small>${bintang(Math.round(avg))} ${avg} (${L.length})</small>`:''}</h3>`+(L.length?L.map(x=>`<div class='oi'><span><b>${esc(x.nama)}</b> <small>${bintang(x.rating)} ${tglPendek(x.created_at)}</small><br>${esc(x.isi||'')}</span></div>`).join(''):`<p class='msg'>Belum ada ulasan.</p>`)+`</div>`);
};
const _hub=hub;
hub=async function(){
 await _hub();
 if(!user)return;
 const L=await belumDinilai(),a=app.querySelector(".pil a[href='#/pesanan/selesai']");
 if(a&&location.hash==='#/saya')a.innerHTML=`<span class='ei'>&#11088;${L.length?`<i class='bdg'>${L.length}</i>`:''}</span>Untuk Dinilai`;
};
app.addEventListener('click',e=>{
 const b=e.target.closest('button[data-nilai]');
 if(b&&ITEMS[+b.dataset.nilai])formUlasan(ITEMS[+b.dataset.nilai]);
});
