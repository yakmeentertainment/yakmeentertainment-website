/* =====================================================================
   YAKME shared site script: header, footer, project cards, player.
   Each page sets <body data-page="home|games|animations|apps">.
   ===================================================================== */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const PAGE=document.body.dataset.page||'home';
let player,pstage,lastFocus=null;
const SECTIONS={
  games:{file:'games.html',name:'Games',one:'game',many:'games',blurb:'Arcade fun you can play right here or download for Android.'},
  animations:{file:'animations.html',name:'Animations',one:'animation',many:'animations',blurb:'Short animated pieces from YakMe.'},
  apps:{file:'apps.html',name:'Apps',one:'app',many:'apps',blurb:'Handy tools that run in your browser or on your phone.'}
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ICON_PLAY='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const ICON_DL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>';
const ICON_ARROW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

/* ---------- header + footer ---------- */
const site=$('site');
const header=document.createElement('header');header.className='topbar';
header.innerHTML=`<a class="logo" href="index.html"><img src="assets/face.webp" alt=""><b>YAKME<small> ENTERTAINMENT</small></b></a>
  <nav class="nav" aria-label="Pages">
    <a href="index.html"${PAGE==='home'?' class="active" aria-current="page"':''}>Home</a>
    ${Object.entries(SECTIONS).map(([k,v])=>`<a href="${v.file}"${PAGE===k?' class="active" aria-current="page"':''}>${v.name}</a>`).join('')}
  </nav>`;
site.prepend(header);
const footer=document.createElement('footer');
footer.innerHTML=`<b>YAKME ENTERTAINMENT</b><br>© ${new Date().getFullYear()} YakMe Entertainment. All rights reserved.`;
const st=document.createElement('style');st.textContent='.logo b small{font-size:.6em;letter-spacing:.18em;color:var(--glow)}@media(max-width:600px){.logo b{font-size:20px}}';document.head.append(st);
site.append(footer);

/* ---------- home: three tiles ---------- */
if(PAGE==='home'){
  const wrap=$('tiles');
  for(const [k,v] of Object.entries(SECTIONS)){
    const list=PROJECTS.filter(p=>p.section===k);
    const pics=list.slice(0,3).map(p=>`<img src="${esc(p.thumb)}" alt=""${p.thumbTop?' class="top"':''}>`).join('');
    const a=document.createElement('a');a.className='tile tile-'+k;a.href=v.file;
    a.innerHTML=`<div class="tile-art">${pics||'<span class="tile-soon">Coming soon</span>'}</div>
      <div class="tile-body">
        <h2><span class="yk">YakMe</span> ${v.name}</h2>
        <p>${list.length?`${list.length} ${list.length===1?v.one:v.many}`:'Coming soon'}</p>
        <span class="tile-go" aria-hidden="true">${ICON_ARROW}</span>
      </div>`;
    wrap.appendChild(a);
  }
}

/* ---------- section page: cards ---------- */
if(SECTIONS[PAGE]){
  const v=SECTIONS[PAGE],list=PROJECTS.filter(p=>p.section===PAGE),grid=$('grid');
  document.title=`YakMe ${v.name}`;
  $('page-title').innerHTML=`<span class="yk">YakMe</span> ${v.name}`;
  $('page-sub').textContent=v.blurb;
  if(!list.length){grid.innerHTML=`<div class="soon" style="grid-column:1/-1"><b>Coming soon</b>New ${v.many} are on the way.</div>`;}
  list.forEach(p=>{
    const i=PROJECTS.indexOf(p),card=document.createElement('article');card.className='card';
    const apkBtn=p.apk
      ?`<a class="btn apk" href="${esc(p.apk)}" download>${ICON_DL}Download APK</a>`
      :`<a class="btn apk" aria-disabled="true" role="link" data-soon="1">${ICON_DL}APK coming soon</a>`;
    card.innerHTML=`
      <button class="thumb${p.thumbTop?' top':''}" type="button" data-play="${i}" aria-label="Play ${esc(p.title)}" ${p.play?'':'disabled'}>
        <img src="${esc(p.thumb)}" alt="" loading="lazy">${p.play?`<span class="playbadge">${ICON_PLAY}</span>`:''}
      </button>
      <div class="body">
        <h3>${esc(p.title)}</h3>
        <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
        <p>${esc(p.blurb)}</p>
        <div class="actions">
          ${p.play?`<button class="btn play" type="button" data-play="${i}">${ICON_PLAY}${PAGE==='apps'?'Open':'Play'}</button>`:''}
          ${apkBtn}
        </div>
      </div>`;
    grid.appendChild(card);
  });
  addPlayer();
  /* direct link: games.html#play-tony-el-barracho opens the player */
  const m=location.hash.match(/^#play-(.+)$/);
  if(m){const i=PROJECTS.findIndex(p=>slug(p.title)===m[1]&&p.section===PAGE);if(i>=0)openPlayer(i,true);}
}

/* ---------- player ---------- */
function addPlayer(){
  const d=document.createElement('div');
  d.innerHTML=`<div id="player" hidden role="dialog" aria-modal="true" aria-labelledby="ptitle">
    <div class="pbar">
      <h4 id="ptitle"></h4>
      <a class="pbtn" id="papk" href="#" download>${ICON_DL}<span class="lbl">APK</span></a>
      <button class="pbtn" id="pfull" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span class="lbl">Full screen</span></button>
      <button class="pbtn x" id="pclose" type="button" aria-label="Close">✕</button>
    </div>
    <div class="pstage" id="pstage"></div>
  </div><div id="toast" role="status" aria-live="polite"></div>`;
  document.body.append(...d.children);
  player=$('player');pstage=$('pstage');
  $('pclose').onclick=()=>closePlayer(false);
  $('pfull').onclick=()=>{const f=pstage.querySelector('iframe');if(!f)return;
    const req=f.requestFullscreen||f.webkitRequestFullscreen;
    if(req)Promise.resolve(req.call(f)).catch(()=>{});};
  addEventListener('popstate',()=>{if(!location.hash.startsWith('#play-'))closePlayer(true);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!player.hidden&&!document.fullscreenElement)closePlayer(false);});
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-play]');if(b){openPlayer(+b.dataset.play);return;}
    const s=e.target.closest('[data-soon]');if(s){e.preventDefault();toast('The Android download is coming soon. Play it in your browser for now!');}
  });
}
function openPlayer(i,fromLink){
  const p=PROJECTS[i];if(!p||!p.play)return;lastFocus=document.activeElement;
  $('ptitle').textContent=p.title;
  const apk=$('papk');if(p.apk){apk.hidden=false;apk.href=p.apk;}else apk.hidden=true;
  pstage.className='pstage'+(p.shape==='portrait'?' portrait':'');
  pstage.innerHTML='';const f=document.createElement('iframe');f.className='pframe';f.src=p.play;f.title=p.title;
  f.allow='fullscreen; autoplay; accelerometer; gyroscope; screen-wake-lock';f.setAttribute('allowfullscreen','');pstage.appendChild(f);
  player.hidden=false;document.body.classList.add('locked');
  if(!fromLink)history.pushState({player:i},'','#play-'+slug(p.title));
  setTimeout(()=>f.focus(),50);
}
function closePlayer(fromPop){
  if(!player||player.hidden)return;
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  player.hidden=true;pstage.innerHTML='';document.body.classList.remove('locked');
  if(!fromPop){
    if(history.state&&history.state.player!==undefined)history.back();
    else history.replaceState(null,'',location.pathname+location.search);
  }
  if(lastFocus)lastFocus.focus({preventScroll:true});
}
let tt=0;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600);}
})();
