// Header halaman Saya (mirip Shopee): bar cari diganti profil, pengaturan, keranjang, dan chat. Dimuat paling akhir.
const HS=$('#hs');
let avHs='';
function isiHs(){
 const nama=(user.user_metadata||{}).nama||user.email;
 const wa=C.WA?`href='https://wa.me/${esc(C.WA)}' target='_blank' rel='noopener'`:`href='#/info'`;
 HS.innerHTML=`<a href='#/akun' aria-label='Ubah profil'><span class='av'>${avHs||esc(nama.charAt(0).toUpperCase())}</span></a><div class='hn'><b>${esc(nama)}</b>${nama!==user.email?`<small>${esc(user.email)}</small>`:''}<a href='#/akun'>Ubah profil &rsaquo;</a></div><a href='#/pengaturan' aria-label='Pengaturan'>${TEMA.svg('gear')}</a><a href='#/keranjang' aria-label='Keranjang'>${TEMA.svg('keranjang')}<i class='bdg kbd' hidden></i></a><a ${wa} aria-label='Chat penjual'>${TEMA.svg('chat')}</a>`;
 upd();
}
function sinkronHs(){
 if(!user)avHs='';
 const on=!!user&&location.hash==='#/saya';
 document.body.classList.toggle('saya',on);
 if(on)isiHs();
}
addEventListener('hashchange',sinkronHs);
const _hh=hub;
hub=async function(){
 sinkronHs();
 await _hh();
 if(location.hash!=='#/saya')return;
 const p=app.querySelector('.prof');
 if(!p)return;
 const av=p.querySelector('.av');
 avHs=av?av.innerHTML:'';
 p.remove();
 const h=HS.querySelector('.av');
 if(h&&avHs)h.innerHTML=avHs;
};
