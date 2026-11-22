// ================= Legacy Console (Xbox) front end: pixel-font buttons, button prompts, container screens,
// Mini Games / Leaderboards menus, Dressing Room with a live skin preview and skin import =================
let GS=2; // console GUI scale (1 at 360p, 2 at 720p, 3 at 1080p)
function pxCanvas(t,S,col,shadow=true){t=String(t);
  if(FONT){const w=Math.max(1,bmpWidth(t,S)+(shadow?S:0)),h=8*S+(shadow?S:0);const c=mkCanvas(w,h),g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const passes=shadow?[[fontSheet(hexRGBs(col)),S],[fontSheet(col),0]]:[[fontSheet(col),0]];
    for(const [sh,o] of passes){let x=o;for(const ch of t){const s=FONT_MAP[ch]||ch;for(const cc of s){const k=cc.charCodeAt(0);if(k>=256){x+=6*S;continue;}g.drawImage(sh,(k%16)*8,Math.floor(k/16)*8,8,8,x,o,8*S,8*S);x+=FONT.widths[k]*S;}}}
    return c;}
  const fs=10*S,font=`${fs}px VT323, "Courier New", monospace`;const m=mkCanvas(1,1).getContext('2d');m.font=font;
  const w=Math.ceil(m.measureText(t).width)+S+1,h=Math.ceil(fs*.95)+S;const c=mkCanvas(w,h),g=c.getContext('2d');g.font=font;g.textBaseline='top';
  if(shadow){g.fillStyle=hexRGBs(col);g.fillText(t,S,S-fs*.12);}g.fillStyle=col;g.fillText(t,0,-fs*.12);return c;}
function pxSet(el,t,col,shadow=true,sc){el.textContent='';el.appendChild(pxCanvas(t,sc||GS,col,shadow));}
// buttons: pack widgets.png if loaded, otherwise a stone-textured console button
function procButton(sel){const c=mkCanvas(200,20),g=c.getContext('2d');const base=sel==='off'?[44,44,44]:sel?[150,155,214]:[111,111,111];
  for(let y=0;y<20;y++)for(let x=0;x<200;x++){const n=(hash2(x>>1,y>>1,sel?31:30)-.5)*18;g.fillStyle=`rgb(${base[0]+n|0},${base[1]+n|0},${base[2]+n|0})`;g.fillRect(x,y,1,1);}
  g.fillStyle=sel===true?'#c8ccf4':sel==='off'?'#505050':'#a8a8a8';g.fillRect(1,1,198,1);g.fillRect(1,1,1,17);g.fillStyle=sel===true?'#5b609e':sel==='off'?'#1c1c1c':'#4a4a4a';g.fillRect(1,17,198,2);g.fillRect(198,1,1,18);
  g.strokeStyle='#000';g.lineWidth=1;g.strokeRect(.5,.5,199,19);return c;}
function refreshLCE(){
  const fitS=clamp(Math.min(Math.round(innerHeight/360),Math.floor(innerWidth*.92/210)),1,4);const S=OPT.gui?clamp(Math.min(OPT.gui,Math.floor(innerWidth*.92/210)),1,4):fitS;GS=S;document.documentElement.style.setProperty('--S',S);
  const G=PACK.gui||{};document.documentElement.style.setProperty('--btn',`url(${(G.btn||procButton(false)).toDataURL()})`);document.documentElement.style.setProperty('--btnSel',`url(${(G.btn_hover||procButton(true)).toDataURL()})`);document.documentElement.style.setProperty('--btnOff',`url(${(G.btn_off||procButton('off')).toDataURL()})`);
  document.querySelectorAll('.lbtn').forEach(b=>{const t=b.dataset.t||(b.dataset.t=b.textContent.trim());b.textContent='';const n=pxCanvas(t,S,'#e0e0e0'),s=pxCanvas(t,S,'#ffffa0');n.className='n';s.className='s';b.append(n,s);b.setAttribute('aria-label',t);});
  document.querySelectorAll('.sbtn').forEach(b=>{const t=b.dataset.t||(b.dataset.t=b.textContent.trim());pxSet(b,t,'#404040',false);b.setAttribute('aria-label',t);});
  document.querySelectorAll('.lab[data-t],.lhead[data-t],.lnote[data-t]').forEach(el=>pxSet(el,el.dataset.t,'#404040',false));
  const sp=$('splash');sp.dataset.t=sp.dataset.t||sp.textContent;pxSet(sp,sp.dataset.t,'#ffff00',true,S*2);const cvs=sp.firstChild;const maxW=200*S;if(cvs.width>maxW){cvs.style.width=maxW+'px';cvs.style.height=Math.round(cvs.height*maxW/cvs.width)+'px';}
  pxSet($('verL'),$('verL').dataset.t,'#ffffff');pxSet($('verR'),$('verR').dataset.t,'#ffffff');
  menuPrompts();if(chestOpen)renderChest();if(!$('jOpt').classList.contains('hidden'))jRender();if(!$('lbPanel').classList.contains('hidden'))renderLB();if(!$('dressPanel').classList.contains('hidden'))renderDress();pxSet($('pvName'),myName||'Player','#ffffff');
}
addEventListener('resize',()=>{clearTimeout(refreshLCE.t);refreshLCE.t=setTimeout(refreshLCE,120);});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(!FONT)refreshLCE();});
// ---- bible verse splashes (King James Version) ----
const VERSES=['Jesus wept. -John 11:35','God is love. -1 John 4:8','Rejoice evermore! -1 Thess 5:16','Pray without ceasing! -1 Thess 5:17','Fear thou not! -Isaiah 41:10',
  'The LORD is my shepherd! -Ps 23:1','Let there be light! -Gen 1:3','Love one another! -John 13:34','Seek, and ye shall find! -Matt 7:7','Charity never faileth! -1 Cor 13:8',
  'Be still! -Psalm 46:10','Be of good courage! -Psalm 27:14','Watch and pray! -Matt 26:41','Be strong! -Joshua 1:9'];
$('splash').dataset.t=VERSES[Math.random()*VERSES.length|0];
// ---- button prompts (Xbox-style A/B/X/Y circles, bumpers, or keyboard keys) ----
function setPrompts(id,list){const el=$(id);if(!el)return;el.textContent='';const S=GS;
  for(const [k,label,fn] of list){const d=document.createElement('div');d.className='lp';const b=document.createElement('span');const col=PAD_COL[k];
    if(col){b.className='pb';b.style.setProperty('--c',col);b.appendChild(pxCanvas(k,S,'#ffffff'));}
    else if(k==='LB'||k==='RB'||k==='LT'||k==='RT'){b.className='pb bump';b.appendChild(pxCanvas(k,S,'#303030',false));}
    else{b.className='pb key';b.appendChild(pxCanvas(k,S,'#303030',false));}
    d.append(b,pxCanvas(label,S,'#ffffff'));if(fn){d.addEventListener('click',fn);d.setAttribute('role','button');d.setAttribute('aria-label',label);}el.appendChild(d);}}
let miniOpen=false;
function menuPrompts(){const list=[['A','Select',()=>{const b=MBTN()[mSel];b&&b.click();}]];if(miniOpen)list.push(['B','Back',menuBack]);list.push(['X','Choose User',openDress]);setPrompts('prompts',list);
  setPrompts('lbPrompts',[['B','Back',closeLB]]);setPrompts('dressPrompts',[['A','Select',()=>{}],['B','Back',closeDress],['X','Import Skin',()=>$('skinFile').click()]]);}
// ---- Mini Games submenu ----
function showMini(on){miniOpen=on;document.querySelectorAll('#menuList .lbtn').forEach(b=>b.classList.toggle('hidden',b.classList.contains('mini')!==on));setMSel(0);menuPrompts();}
function menuBack(){if(miniOpen){sfx('click');showMini(false);}}
$('miniBtn').addEventListener('click',()=>{sfx('click');showMini(true);});
const startMode=m=>{SET.mode=m;store('bb_set',JSON.stringify(SET));writeOptions();showMini(false);$('soloBtn').click();};
$('battleBtn').addEventListener('click',()=>startMode('battle'));$('brBtn').addEventListener('click',()=>startMode('br'));
// ---- Leaderboards (stats kept in this browser) ----
function loadStats(){try{return JSON.parse(store('bb_stats')||'{}')||{};}catch(e){return {};}}
function recordStats(w){if(!player||player.spectator)return;const st=loadStats();const m=MATCH.mode==='br'?'br':'battle';const r=st[m]||(st[m]={g:0,w:0,k:0,d:0,best:0});
  r.g++;if(w===player)r.w++;const k=player.kills||0;r.k+=k;r.best=Math.max(r.best,k);if(!player.alive)r.d++;store('bb_stats',JSON.stringify(st));}
function renderLB(){const st=loadStats(),S=GS;const z={g:0,w:0,k:0,d:0,best:0};const a=st.battle||z,b=st.br||z;
  const rows=[['','Battle','Battle Royale'],['Games Played',a.g,b.g],['Wins',a.w,b.w],['Kills',a.k,b.k],['Deaths',a.d,b.d],['Most Kills in a Game',a.best,b.best],
    ['Win Rate',a.g?Math.round(a.w/a.g*100)+'%':'-',b.g?Math.round(b.w/b.g*100)+'%':'-'],['Rank',rankName(a),rankName(b)]];
  const t=$('lbTable');t.textContent='';for(const r of rows){const tr=document.createElement('tr');r.forEach((v,i)=>{const td=document.createElement('td');const cv0=pxCanvas(String(v),S,i?'#404040':'#2a2a2a',false);if(i)cv0.style.marginLeft='auto';td.appendChild(cv0);tr.appendChild(td);});t.appendChild(tr);}}
function rankName(r){const s=r.w*3+r.k;return s>=150?'Legend':s>=60?'Champion':s>=25?'Warrior':s>=8?'Fighter':r.g?'Rookie':'-';}
function openLB(){sfx('click');hide('menu');show('lbPanel');renderLB();}
function closeLB(){sfx('click');hide('lbPanel');show('menu');}
$('lbBtn').addEventListener('click',openLB);$('lbClose').addEventListener('click',closeLB);
// ---- custom skins: import 64x64 / legacy 64x32 PNGs, keep them in this browser, share them in online games ----
function skinFromImage(img){let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(w<64||(h!==w&&h*2!==w)||w>512)return null;
  const c=mkCanvas(w,w),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,0,0);
  if(h*2===w){const s=w/64;const cp=(sx,sy,sw,sh,dx,dy)=>{g.save();g.translate((dx+sw)*s,dy*s);g.scale(-1,1);g.drawImage(c,sx*s,sy*s,sw*s,sh*s,0,0,sw*s,sh*s);g.restore();};
    // legacy 64x32: left leg/arm mirror the right ones (as the game does)
    for(const [x,y,lx,ly] of [[0,16,16,48],[40,16,32,48]]){cp(x+4,y,4,4,lx+4,ly);cp(x+8,y,4,4,lx+8,ly);cp(x,y+4,4,12,lx+8,ly+4);cp(x+4,y+4,4,12,lx+4,ly+4);cp(x+8,y+4,4,12,lx,ly+4);cp(x+12,y+4,4,12,lx+12,ly+4);}}
  const d=g.getImageData(Math.round(54*w/64),Math.round(20*w/64),1,1).data;const slim=d[3]===0;return {img:c,slim};}
function addSkinData(k,url,save){return new Promise(res=>{if(SKIN_IMG[k])return res(true);const im=new Image();im.onload=()=>{const sk=skinFromImage(im);if(!sk)return res(false);SKIN_IMG[k]=sk;SKIN_DATA[k]=url;
    if(SKIN_TEX['?'+k]){gl.deleteTexture(SKIN_TEX['?'+k].tex);delete SKIN_TEX['?'+k];}delete SKIN_TEX[k];
    if(save&&!CUSTOM_SKINS.includes(k)){CUSTOM_SKINS.unshift(k);while(CUSTOM_SKINS.length>12){const o=CUSTOM_SKINS.pop();delete SKIN_DATA[o];}saveCustomSkins();}res(true);};im.onerror=()=>res(false);im.src=url;});}
function saveCustomSkins(){try{store('bb_cskins',JSON.stringify(CUSTOM_SKINS.map(k=>[k,SKIN_DATA[k]]).filter(x=>x[1])));}catch(e){}}
(()=>{try{const l=JSON.parse(store('bb_cskins')||'[]');for(const [k,u] of l){CUSTOM_SKINS.push(k);addSkinData(k,u,false);}}catch(e){}})();
const skinAsk={};
function requestSkin(k){if(!net||skinAsk[k]>performance.now())return;skinAsk[k]=performance.now()+5000;netSend(N.SKIN,{req:k});}
function onSkinNet(d){if(!d)return;if(d.req){if(d.req===mySkin&&SKIN_DATA[mySkin]&&SKIN_DATA[mySkin].length<30000)netSend(N.SKIN,{k:mySkin,d:SKIN_DATA[mySkin]});return;}
  if(typeof d.k==='string'&&typeof d.d==='string'&&d.d.startsWith('data:image/png')&&d.d.length<30000&&d.k==='img:'+hashStr(d.d).toString(36))addSkinData(d.k,d.d,false);}
$('skinFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=async()=>{const raw=r.result;if(!String(raw).startsWith('data:image/png')){dressMsg('Skins must be PNG files.');return;}
    // normalise to a 64x64 PNG (legacy 64x32 converted, HD scaled) so it stays small enough to send to other players
    const url=await new Promise(res=>{const im=new Image();im.onload=()=>{const sk=skinFromImage(im);if(!sk)return res(null);const c=mkCanvas(64,64),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(sk.img,0,0,64,64);res(c.toDataURL('image/png'));};im.onerror=()=>res(null);im.src=raw;});
    if(!url){dressMsg('That image is not a 64x64 or 64x32 skin.');return;}
    const k='img:'+hashStr(url).toString(36);const ok=await addSkinData(k,url,true);if(!ok){dressMsg('That image is not a 64x64 or 64x32 skin.');return;}mySkin=k;store('bb_skin',k);sfx('pick');dressMsg('Skin imported!');renderDress();if(typeof refreshSkinPicker==='function')refreshSkinPicker();};r.readAsDataURL(f);});
// ---- Dressing Room ----
function dressSkins(){return CUSTOM_SKINS.concat(availableSkins().filter(k=>!k.startsWith('img:')),['gen:'+(myName||'Player'),'gen:Alpha','gen:Bravo','gen:Charlie','gen:Delta','gen:Echo','gen:Foxtrot']);}
function dressMsg(t){pxSet($('dressMsg'),t,'#404040',false);}
function renderDress(){const S=GS,row=$('dressGrid');row.textContent='';const list=dressSkins();
  for(const k of list){const c=mkCanvas(16,16),g=c.getContext('2d');g.imageSmoothingEnabled=false;const I=skinTex(k).img,s=I.width/64;g.drawImage(I,8*s,8*s,8*s,8*s,0,0,16,16);g.drawImage(I,40*s,8*s,8*s,8*s,0,0,16,16);
    const d=document.createElement('div');d.className='slot'+(k===mySkin?' sel':'');d.title=k.startsWith('img:')?'Imported skin':k.replace(/^(pack|gen):/,'');d.appendChild(c);
    d.addEventListener('click',()=>{mySkin=k;store('bb_skin',k);sfx('click');renderDress();});row.appendChild(d);}
  $('skinDel').classList.toggle('hidden',!mySkin.startsWith('img:'));pxSet($('pvName'),myName||'Player','#ffffff');}
function cycleSkin(n){const l=dressSkins();let i=l.indexOf(mySkin);i=(i+n+l.length)%l.length;mySkin=l[i];store('bb_skin',mySkin);sfx('click');renderDress();}
function openDress(){sfx('click');hide('menu');show('dressPanel');$('dressName').value=$('nameIn').value||myName||'';renderDress();dressMsg('');}
function closeDress(){const v=$('dressName').value.trim().slice(0,16);if(v&&v!==$('nameIn').value){$('nameIn').value=v;$('nameIn').dispatchEvent(new Event('change'));myName=v;store('bb_name',v);}
  sfx('click');hide('dressPanel');show('menu');pxSet($('pvName'),myName||v||'Player','#ffffff');}
$('dressBtn').addEventListener('click',openDress);$('dressClose').addEventListener('click',closeDress);$('skinImport').addEventListener('click',()=>$('skinFile').click());
$('skinDel').addEventListener('click',()=>{const k=mySkin;const i=CUSTOM_SKINS.indexOf(k);if(i<0)return;CUSTOM_SKINS.splice(i,1);saveCustomSkins();mySkin='gen:'+(myName||'Player');store('bb_skin',mySkin);renderDress();dressMsg('Skin removed.');});
$('dressName').addEventListener('input',()=>pxSet($('pvName'),$('dressName').value||'Player','#ffffff'));
// ---- live skin preview (software-rendered so the blurred menu background doesn't blur it) ----
const PV={shade:{},geo:{},mx:innerWidth*.5,my:innerHeight*.4};
addEventListener('mousemove',e=>{PV.mx=e.clientX;PV.my=e.clientY;});
function pvGeom(slim){if(PV.geo[slim])return PV.geo[slim];const P={};const A=(n,fn)=>{const o=[];fn(o);P[n]=o;};const aw=slim?3:4;
  A('head',o=>boxUV(o,-4,0,-4,8,8,8,0,0,64,64));A('hat',o=>boxUV(o,-4,0,-4,8,8,8,32,0,64,64,.5));A('body',o=>boxUV(o,-4,-12,-2,8,12,4,16,16,64,64));A('jacket',o=>boxUV(o,-4,-12,-2,8,12,4,16,32,64,64,.25));
  A('rarm',o=>boxUV(o,-1,-10,-2,aw,12,4,40,16,64,64));A('rsleeve',o=>boxUV(o,-1,-10,-2,aw,12,4,40,32,64,64,.25));A('larm',o=>boxUV(o,-aw+1,-10,-2,aw,12,4,32,48,64,64));A('lsleeve',o=>boxUV(o,-aw+1,-10,-2,aw,12,4,48,48,64,64,.25));
  A('rleg',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,64));A('rpants',o=>boxUV(o,-2,-12,-2,4,12,4,0,32,64,64,.25));A('lleg',o=>boxUV(o,-2,-12,-2,4,12,4,16,48,64,64));A('lpants',o=>boxUV(o,-2,-12,-2,4,12,4,0,48,64,64,.25));
  return PV.geo[slim]=P;}
function shadedSkin(key){const S0=skinTex(key);let c=PV.shade[key];if(c&&c.src===S0.img)return c;
  const mk=f=>{const cc=mkCanvas(S0.img.width,S0.img.height),g=cc.getContext('2d');g.drawImage(S0.img,0,0);if(f<1){g.globalCompositeOperation='source-atop';g.fillStyle=`rgba(0,0,0,${1-f})`;g.fillRect(0,0,cc.width,cc.height);}return cc;};
  return PV.shade[key]={src:S0.img,slim:S0.slim,l:[mk(1),mk(.8),mk(.6),mk(.5)]};}
function drawPreview(){
  const vis=(!$('menu').classList.contains('hidden')||!$('dressPanel').classList.contains('hidden'))&&innerWidth>=640;const wrap=$('pvWrap');wrap.classList.toggle('hidden',!vis);if(!vis)return;
  const c=$('pvCanvas');const dpr=Math.min(2,devicePixelRatio||1);const cw=Math.round(c.clientWidth*dpr),ch=Math.round(c.clientHeight*dpr);if(!cw||!ch)return;if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cw,ch);g.imageSmoothingEnabled=false;
  const T=shadedSkin(mySkin),G=pvGeom(T.slim),tw=T.src.width,th=T.src.height;const k=ch/2.05,ox=cw/2,oy=ch*.985;
  const r=c.getBoundingClientRect();const mx=clamp((PV.mx-(r.left+r.width/2))/Math.max(300,innerWidth*.4),-1,1),my=clamp((PV.my-(r.top+r.height*.15))/Math.max(300,innerHeight*.5),-1,1);
  const t=perfT,by=-.4+Math.sin(t*.4)*.06,ht=clamp(-mx*1.1-by,-1.1,1.1),pit=clamp(-my*.9,-.8,.8),idle=Math.sin(t*1.3)*.05,sw=Math.sin(t*1.3)*.04;
  const base=M4.ry(by);const parts={head:chain(base,M4.tr(0,1.5,0),M4.ry(ht),M4.rx(-pit)),body:chain(base,M4.tr(0,1.5,0)),rarm:chain(base,M4.tr(5/16,22/16,0),M4.rx(sw),M4.rz(.05+idle)),
    larm:chain(base,M4.tr(-5/16,22/16,0),M4.rx(-sw),M4.rz(-.05-idle)),rleg:chain(base,M4.tr(1.9/16,.75,0)),lleg:chain(base,M4.tr(-1.9/16,.75,0))};
  const quads=[];
  for(const [pn,ov] of [['head','hat'],['body','jacket'],['rarm','rsleeve'],['larm','lsleeve'],['rleg','rpants'],['lleg','lpants']]){const m=parts[pn];const o0=xform(m,[0,0,0]);
    for(const name of [pn,ov]){const V=G[name];for(let q=0;q<V.length;q+=48){const vi=[0,1,2,5].map(j=>q+j*8);
      const P=vi.map(i=>{const p=xform(m,[V[i],V[i+1],V[i+2]]);return [ox-p[0]*k,oy-p[1]*k,p[2],V[i+6]*tw,V[i+7]*th];});
      const n=xform(m,[V[vi[0]+3],V[vi[0]+4],V[vi[0]+5]]);const nx=n[0]-o0[0],ny=n[1]-o0[1],nz=n[2]-o0[2];if(nz>=-1e-4)continue;
      const li=ny>.5?0:ny<-.5?3:Math.abs(nz)>=Math.abs(nx)?1:2;quads.push({P,li,z:(P[0][2]+P[1][2]+P[2][2]+P[3][2])/4});}}}
  quads.sort((a,b)=>b.z-a.z);
  for(const {P,li} of quads){const [A,B,C,D]=P;const du=B[3]-A[3],dv=D[4]-A[4];if(!du||!dv)continue;
    const a=(B[0]-A[0])/du,b=(B[1]-A[1])/du,cc=(D[0]-A[0])/dv,d=(D[1]-A[1])/dv;const e=A[0]-a*A[3]-cc*A[4],f=A[1]-b*A[3]-d*A[4];
    const mxp=(A[0]+B[0]+C[0]+D[0])/4,myp=(A[1]+B[1]+C[1]+D[1])/4;const grow=p=>{const vx=p[0]-mxp,vy=p[1]-myp,l=Math.hypot(vx,vy)||1;return [p[0]+vx/l*.6,p[1]+vy/l*.6];};
    g.save();g.beginPath();const pts=[A,B,C,D].map(grow);g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<4;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.clip();
    g.setTransform(a,b,cc,d,e,f);const u0=Math.min(A[3],B[3]),v0=Math.min(A[4],D[4]);g.drawImage(T.l[li],u0,v0,Math.abs(du),Math.abs(dv),u0,v0,Math.abs(du),Math.abs(dv));g.restore();g.setTransform(1,0,0,1,0,0);}}
// ---- per-frame hook ----
let lceLastPad=null;
function tickLCE(dt){tickTouch();if(lceLastPad!==padActive){lceLastPad=padActive;if(chestOpen)renderChest();}drawPreview();}
// keyboard: Escape/Backspace go back, X opens the Dressing Room, arrows cycle skins in the Dressing Room
document.addEventListener('keydown',e=>{const inInput=e.target&&e.target.tagName==='INPUT';
  if(!$('dressPanel').classList.contains('hidden')){if(e.code==='Escape'||(e.code==='Enter'&&inInput)){closeDress();e.preventDefault();}else if(!inInput&&(e.code==='ArrowLeft'||e.code==='ArrowRight')){cycleSkin(e.code==='ArrowLeft'?-1:1);e.preventDefault();}else if(!inInput&&e.code==='KeyX')$('skinFile').click();return;}
  if(inInput)return;
  if(!$('lbPanel').classList.contains('hidden')&&(e.code==='Escape'||e.code==='Backspace'||e.code==='Enter')){closeLB();return;}
  if(!$('menu').classList.contains('hidden')){if(e.code==='Escape'||e.code==='Backspace')menuBack();else if(e.code==='KeyX')openDress();}});
refreshLCE();
