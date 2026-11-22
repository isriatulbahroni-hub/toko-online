// Foto profil (tahap 3c). Memakai global dari app.js dan akun.js; dimuat setelah akun.js.
const fotoUrl=p=>db.storage.from('avatar').getPublicUrl(p).data.publicUrl;
const fotoImg=p=>`<img src='${esc(fotoUrl(p))}' alt='Foto profil' style='border-radius:50%;object-fit:cover;width:100%;height:100%'>`;
const _av=akunView;
akunView=async function(){
 await _av();
 const f=$('#fp');
 if(!f||!user||!location.hash.startsWith('#/akun'))return;
 const pr=await db.from('profiles').select('foto_path').eq('id',user.id).maybeSingle();
 if(pr.error)return;
 let ada=pr.data&&pr.data.foto_path;
 const nama=(user.user_metadata||{}).nama||user.email;
 f.insertAdjacentHTML('afterbegin',`<div class='prof'><span class='av' id='fav'>${ada?fotoImg(ada):esc(nama.charAt(0).toUpperCase())}</span><label class='btn line sm'>Ganti foto<input type='file' accept='image/*' id='ff' hidden></label><small id='fm'></small></div>`);
 $('#ff').onchange=async e=>{
  const file=e.target.files[0],fm=$('#fm');
  if(!file)return;
  fm.textContent='Mengunggah...';
  try{
   const blob=await kecilkan(file),path=user.id+'/'+Date.now()+'.jpg';
   const up=await db.storage.from('avatar').upload(path,blob,{contentType:'image/jpeg'});
   if(up.error)throw up.error;
   let w=await db.from('profiles').update({foto_path:path}).eq('id',user.id).select('id');
   if(!w.error&&!w.data.length)w=await db.from('profiles').insert({id:user.id,nama:nama.slice(0,100),foto_path:path});
   if(w.error)throw w.error;
   if(ada)db.storage.from('avatar').remove([ada]);
   ada=path;$('#fav').innerHTML=fotoImg(path);fm.textContent='Foto diperbarui';
  }catch(x){fm.textContent=x.message}
 };
};
const _hf=hub;
hub=async function(){
 await _hf();
 if(!user||location.hash!=='#/saya')return;
 const pr=await db.from('profiles').select('foto_path').eq('id',user.id).maybeSingle(),av=app.querySelector('.prof .av');
 if(av&&pr.data&&pr.data.foto_path)av.innerHTML=fotoImg(pr.data.foto_path);
};
