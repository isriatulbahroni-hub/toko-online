// Varian produk (tahap 3b). Memakai global dari app.js; dimuat setelah voucher.js.
// Kunci keranjang untuk produk bervarian: idProduk:idVarian.
const _rpc2=db.rpc.bind(db);
db.rpc=(fn,a,o)=>{
 if(fn==='buat_pesanan'&&a&&Array.isArray(a.p_items))a={...a,p_items:a.p_items.map(x=>{const k=String(x.id).split(':');return k[1]?{id:k[0],v:k[1],qty:x.qty}:x})};
 return _rpc2(fn,a,o);
};
const _dv=detail;
detail=async function(id){
 await _dv(id);
 const b=$('#add');
 if(!b||!location.hash.startsWith('#/p/'))return;
 const[v,p]=await Promise.all([db.from('varian').select('id,nama,harga,stok').eq('product_id',id).order('urut').order('nama'),db.from('products').select('name,price').eq('id',id).single()]);
 if(v.error||!v.data.length||p.error||!location.hash.startsWith('#/p/'))return;
 const nb=b.cloneNode(true);b.replaceWith(nb);
 let sel=null;
 const pr=app.querySelector('.price.big'),awal=pr?pr.innerHTML:'',st=[...app.querySelectorAll('.det p')].find(x=>/^Stok:/.test(x.textContent));
 nb.insertAdjacentHTML('beforebegin',`<p><small>Pilih varian:</small></p><div class='chips' id='vr'>${v.data.map(x=>`<button type='button' data-v='${esc(x.id)}'${x.stok<1?' disabled':''}>${esc(x.nama)}${x.stok<1?' (habis)':''}</button>`).join('')}</div>`);
 $('#vr').onclick=e=>{
  const t=e.target.closest('button[data-v]');if(!t)return;
  sel=v.data.find(x=>x.id===t.dataset.v);
  $('#vr').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===t));
  if(pr)pr.innerHTML=sel.harga?rp(sel.harga):awal;
  if(st)st.textContent='Stok: '+sel.stok;
  nb.textContent=user?'Tambah ke keranjang':'Masuk untuk membeli';
 };
 nb.onclick=()=>{
  if(!user){perluMasuk('#/p/'+id);return}
  if(!sel){alert('Pilih varian dulu');return}
  const c=cart.get(),k=id+':'+sel.id;
  c[k]={name:p.data.name+' ('+sel.nama+')',price:sel.harga||p.data.price,stock:sel.stok,qty:Math.min(((c[k]||{}).qty||0)+1,sel.stok)};
  cart.set(c);nb.textContent='Masuk keranjang';
 };
};
