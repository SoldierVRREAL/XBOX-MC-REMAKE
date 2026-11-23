// ================= UI, input, local player =================
let sprintTap=false,lastWUp=-1;const keys={};let lmb=false,rmb=false,rmbEdge=false,lmbEdge=false,locked=false,selShow=0,paused=false;
const OVERLAYS=['jOpt','lbPanel','dressPanel','menu','optPanel','onlinePanel','packPanel','chestUI','pause','lobbyPanel','results','clickResume'];
function show(id){$(id).classList.remove('hidden');}function hide(id){$(id).classList.add('hidden');}
function hideOverlays(){for(const id of OVERLAYS)hide(id);}
// raw mouse input (unadjustedMovement) skips OS acceleration, but on macOS it inflates movement while a mouse button is held,
// so Auto uses normal input on Macs and raw input elsewhere; Controls > Raw Mouse Input overrides it either way
const IS_MAC=/Mac|iPhone|iPad/i.test((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||'');
const rawMouse=()=>OPT.rawMouse==='on'||(OPT.rawMouse!=='off'&&!IS_MAC);
function lockPointer(){if(padActive||touchActive)return;try{let r=null;try{r=rawMouse()?cv.requestPointerLock({unadjustedMovement:true}):cv.requestPointerLock();}catch(e){r=null;}if(r&&r.catch)r.catch(()=>{try{const r2=cv.requestPointerLock();if(r2&&r2.catch)r2.catch(()=>{});}catch(e){}});else if(!r&&!document.pointerLockElement){}}catch(e){}}
let SENS=+(store('bb_sens')||.5),INVY=store('bb_invy')==='1';
function lookDelta(dx,dy){const f=SENS*.6+.2,k=f*f*f*8*.15*Math.PI/180;player.yaw-=dx*k;player.pitch=clamp(player.pitch-(INVY?-dy:dy)*k,-Math.PI/2,Math.PI/2);}
function setNetStatus(s){const el=$('status');if(el)el.textContent=s;}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;
  if(locked){hide('clickResume');hide('pause');paused=false;}
  else if((MATCH.state==='play'||MATCH.state==='lobby')&&!chestOpen&&!chatUI&&$('lobbyPanel').classList.contains('hidden')&&$('results').classList.contains('hidden')){if(!online)paused=true;show('pause');}});
cv.addEventListener('click',()=>{if((MATCH.state==='play'||MATCH.state==='lobby')&&!locked&&!chestOpen)lockPointer();});
$('clickResume').addEventListener('click',()=>lockPointer());
// ---- mouse look, with a fix for Mac browsers that over-report movement while a mouse button is held ----
// Depending on the browser this shows up as duplicated drag events or as bigger deltas. Repeats while held are dropped, and the
// held/free speed ratio is learned from how fast the mouse moves just before and just after each press and release (a hand does not
// suddenly double its speed at the instant it clicks); held movement is divided by that ratio. Starts at 2x on Macs, remembers what it learns.
const CLK={scale:+(store('bb_clickscale')||0)||(IS_MAC?2:1),samples:[],hist:[],last:null,prevHeld:false,pend:[]};
const clickFix=()=>OPT.clickFix==='on'||(OPT.clickFix!=='off'&&IS_MAC);
function clkSpeed(a,b){let s=0,n=0;for(const h of CLK.hist)if(h.t>=a&&h.t<b){s+=h.mag;n++;}return n>=3?s/(b-a):-1;}
function mouseLookFilter(dx,dy,held,t){
  if(held&&clickFix()&&CLK.last&&CLK.last.held&&t-CLK.last.t<4&&dx===CLK.last.dx&&dy===CLK.last.dy){CLK.last.t=t;return null;}   // the same drag movement again
  CLK.last={t,dx,dy,held};CLK.hist.push({t,mag:Math.abs(dx)+Math.abs(dy),held});while(CLK.hist.length&&t-CLK.hist[0].t>700)CLK.hist.shift();
  if(held!==CLK.prevHeld){CLK.pend.push({t,toHeld:held});CLK.prevHeld=held;}
  while(CLK.pend.length&&t>CLK.pend[0].t+130){const p=CLK.pend.shift();const pre=clkSpeed(p.t-130,p.t),post=clkSpeed(p.t,p.t+130);   // judge a press/release once 130 ms have passed
    if(pre>.08&&post>.08){CLK.samples.push(p.toHeld?post/pre:pre/post);if(CLK.samples.length>9)CLK.samples.shift();
      if(CLK.samples.length>=3){const sorted=CLK.samples.slice().sort((a,b)=>a-b),med=sorted[sorted.length>>1];const agree=CLK.samples.filter(v=>Math.abs(v-med)<=med*.4).length/CLK.samples.length;
        if(agree>=.6){CLK.scale=med>=1.45?Math.min(4,med):1;try{store('bb_clickscale',String(Math.round(CLK.scale*100)/100));}catch(e){}}}}}
  if(held&&clickFix()&&CLK.scale>1)return [dx/CLK.scale,dy/CLK.scale];
  return [dx,dy];}
document.addEventListener('mousemove',e=>{if(!locked||!player)return;if(!player.alive&&spectate.mode==='follow')return;const dx=e.movementX,dy=e.movementY;if(!dx&&!dy)return;
  if(Math.abs(dx)>350||Math.abs(dy)>350)return;const r=mouseLookFilter(dx,dy,e.buttons!==0,performance.now());if(r)lookDelta(r[0],r[1]);});
document.addEventListener('mousedown',e=>{if(!locked)return;if(e.button===0){lmb=true;lmbEdge=true;}if(e.button===2){rmb=true;rmbEdge=true;}});
document.addEventListener('mouseup',e=>{if(e.button===0)lmb=false;if(e.button===2)rmb=false;});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('wheel',e=>{if(!locked||!player)return;if(!player.alive){spectate.mode='follow';spectate.idx+=e.deltaY>0?1:-1;return;}player.sel=(player.sel+(e.deltaY>0?1:8))%9;player.using=null;selShow=2;},{passive:true});
document.addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;if(e.code==='KeyW'&&!keys.KeyW&&performance.now()-lastWUp<300)sprintTap=true;keys[e.code]=true;if(e.ctrlKey&&e.code==='KeyW')e.preventDefault();
  if(e.code==='Space'||e.code.startsWith('Arrow')||e.code==='Tab')e.preventDefault();
  if(!player||MATCH.state==='menu')return;
  if(e.code.startsWith('Digit')){const n=+e.code.slice(5);if(n>=1&&n<=9&&player.alive){player.sel=n-1;player.using=null;selShow=2;if(chestOpen)renderChest();}}
  if(e.code==='KeyE'){if(chestOpen)chestClose(true);else if(player.alive&&MATCH.state==='play'){if(!tryOpenChest())openInv();}else if(!player.alive){spectate.mode='follow';spectate.idx++;}}
  if(e.code==='KeyQ'){if(!player.alive){spectate.mode='follow';spectate.idx--;}else if((locked||touchActive||padActive)&&MATCH.state!=='lobby'){const s=player.inv[player.sel];if(s){const d=fwd(player);requestDrop([player.pos[0],player.pos[1]+.4,player.pos[2]],s.id,1,[d[0]*6,d[1]*6+2,d[2]*6]);consume(player,player.sel);}}}
  if(e.code==='KeyF'&&!player.alive)spectate.mode='bat';
  if(e.code==='Space'&&chestOpen&&SET.takeAll)chestOp('all');
  if(e.code==='KeyR'&&MATCH.state==='lobby'){toggleReady();}
  if(e.code==='Tab'&&online&&MATCH.state==='lobby'){if($('lobbyPanel').classList.contains('hidden')){openLobbyPanel();}else{hide('lobbyPanel');lockPointer();}}
});
document.addEventListener('keyup',e=>{if(e.code==='KeyW')lastWUp=performance.now();keys[e.code]=false;});
function toggleReady(){player.ready=!player.ready;netSend(N.READY,{r:player.ready});sfx('click');}

// ---------- local player ----------
function updatePlayer(dt){
  const p=player;if(!p)return;
  const canMove=!chestOpen&&(locked||padActive||touchActive)&&!(MATCH.state==='play'&&MATCH.preT>0);
  if(!p.alive){ // bat spectator: free flight
    if(spectate.mode==='bat'){const f=fwd(p),r=[Math.cos(p.yaw),0,-Math.sin(p.yaw)];let v=[0,0,0];const sp=8;
      if(canMove){if(keys.KeyW)v=v.map((x,i)=>x+f[i]);if(keys.KeyS)v=v.map((x,i)=>x-f[i]);if(keys.KeyD)v=v.map((x,i)=>x+r[i]);if(keys.KeyA)v=v.map((x,i)=>x-r[i]);if(keys.Space)v[1]+=1;if(keys.ShiftLeft)v[1]-=1;
        if(touchActive){v=v.map((x,i)=>x+f[i]*touchIn.fw+r[i]*touchIn.st);if(touchIn.jump)v[1]+=1;if(touchIn.sneak)v[1]-=1;}}
      const L=Math.hypot(...v)||1;for(let i=0;i<3;i++){p.vel[i]+=(v[i]/L*sp-p.vel[i])*Math.min(1,dt*6);p.pos[i]+=p.vel[i]*dt;}
      p.pos[0]=clamp(p.pos[0],1,WX-1);p.pos[2]=clamp(p.pos[2],1,WZ-1);p.pos[1]=clamp(p.pos[1],(mapInfo?mapInfo.voidY:0)+4,WY+20);}
    if(lmbEdge&&(locked||padActive||touchActive)){lmbEdge=false;sfx('squeak');netSend(N.SQUEAK,{id:p.id});spawnParticles(p.pos[0],p.pos[1],p.pos[2],4,[.3,.2,.15],1.5);}
    return;
  }
  // Java controls: WASD, Space jump/swim/climb-out, Shift sneak, Ctrl or double-tap W sprint
  let fw=0,st=0;if(canMove){if(keys.KeyW||keys.ArrowUp)fw+=1;if(keys.KeyS||keys.ArrowDown)fw-=1;if(keys.KeyD||keys.ArrowRight)st+=1;if(keys.KeyA||keys.ArrowLeft)st-=1;}
  if(padActive&&canMove){fw+=padIn.fw;st+=padIn.st;}if(touchActive&&canMove){fw+=touchIn.fw;st+=touchIn.st;}{const m=Math.hypot(fw,st);if(m>1){fw/=m;st/=m;}}
  const f=[-Math.sin(p.yaw),-Math.cos(p.yaw)],r=[Math.cos(p.yaw),-Math.sin(p.yaw)];const wx=f[0]*fw+r[0]*st,wz=f[1]*fw+r[1]*st;
  p.sneak=canMove&&!!(keys.ShiftLeft||keys.ShiftRight||(padActive&&padIn.sneak)||(touchActive&&touchIn.sneak));
  const canSprint=fw>0&&!p.sneak&&!p.using&&p.food>6&&!p.effects.blind;
  if(!canSprint||p.collidedH)p.sprint=false;else if((keys.ControlLeft||keys.ControlRight||sprintTap||(padActive&&padIn.sprint&&fw>.8)||(touchActive&&touchIn.sprint&&fw>.8))&&canSprint)p.sprint=true;
  if(!p.sprint)sprintTap=false;
  p.jump=canMove&&!!(keys.Space||(padActive&&padIn.jump)||(touchActive&&touchIn.jump));
  const moved=physics(p,dt,wx,wz);
  if(MATCH.state==='play'||MATCH.state==='over')tickOwned(p,dt,moved);
  if(!p.alive)return;
  if(MATCH.state!=='play'||!(locked||padActive||touchActive)||MATCH.preT>0){rmbEdge=false;lmbEdge=false;if(p.using&&!rmb)p.using=null;return;}
  // left mouse: attack, or mine blocks in Battle Royale
  if(lmb&&!p.using){const tgt=meleeTarget(p,3.2);
    if(tgt||MATCH.mode!=='br'){mining=null;if(lmbEdge)doAttack(p,tgt||null);}
    else{const h=raycastBlock(eye(p),fwd(p),4.5);
      if(h&&h.b!==B.CHEST&&MINE_T[h.b]){if(!mining||mining.x!==h.x||mining.y!==h.y||mining.z!==h.z)mining={x:h.x,y:h.y,z:h.z,b:h.b,t:0};mining.t+=dt;if(p.swing<=0)p.swing=1;
        if(((mining.t*5)|0)!==(((mining.t-dt)*5)|0))sfx('mine',{pos:[h.x,h.y,h.z],mat:blockMat(h.b)});if(mining.t>=MINE_T[h.b]){breakBlock(h.x,h.y,h.z,p);mining=null;}}else mining=null;}}
  else mining=null;lmbEdge=false;
  const s=p.inv[p.sel],it=s&&ITEMS[s.id];
  if(rmbEdge){rmbEdge=false;
    if(!tryOpenChest()){
      if(it&&it.type==='block'&&MATCH.mode==='br'){const h=raycastBlock(eye(p),fwd(p),4.5);if(h&&placeBlock(h.px,h.py,h.pz,it.block)){consume(p,p.sel);p.swing=1;}}
      else if(it&&it.type==='armor'){const cur=p.armor[it.slot];p.armor[it.slot]=s.id;p.inv[p.sel]=cur?{id:cur,count:1}:null;sfx('pick');}
      else if(it&&it.type==='food'&&(p.food<20||it.always)){p.using='eat';p.useT=0;}
      else if(it&&it.type==='potion'){p.using='drink';p.useT=0;}
      else if(it&&it.type==='splash'){throwSplash(p,s.id);consume(p,p.sel);p.swing=1;}
      else if(it&&it.type==='bow'&&hasItem(p,'arrow')>=0){p.using='bow';p.useT=0;}
      else if(it&&it.tool==='sword'){p.using='block';p.useT=0;}
    }}
  if(p.using==='eat'||p.using==='drink'){if(!rmb||!it||(p.using==='eat'&&it.type!=='food')||(p.using==='drink'&&it.type!=='potion'))p.using=null;
    else{p.useT+=dt;if(p.useT>.35&&((p.useT*5)|0)!==(((p.useT-dt)*5)|0))sfx(p.using==='eat'?'eat':'drink');if(p.useT>=1.6){if(p.using==='eat')sfx('burp',{vol:.5});if(it.type==='food')eatFood(p,s.id);else for(const fx of it.fx)giveEffect(p,...fx);consume(p,p.sel);p.using=null;}}}
  if(p.using==='block'&&(!rmb||!it||it.tool!=='sword'))p.using=null;
  if(p.using==='bow'){if(!it||it.type!=='bow')p.using=null;else{p.useT+=dt;if(!rmb){fireBow(p,bowCharge(p.useT));p.using=null;}}}
}

// ---------- chest UI (27 slots + 9 hotbar, like the console screen) ----------
let chestOpen=null;
function lookChest(){if(!player||!player.alive)return null;const h=raycastBlock(eye(player),fwd(player),4.5);if(h&&h.b===B.CHEST)return chests.get(key(h.x,h.y,h.z));return null;}
function tryOpenChest(){if(!player.alive||MATCH.state!=='play')return false;const c=lookChest();if(!c)return false;chestOpen=c;sfx('chest');document.exitPointerLock&&document.exitPointerLock();
  show('chestUI');renderChest();return true;}
function chestClose(relock){if(!chestOpen)return;if(!chestOpen.inv)sfx('chestclose');else sfx('click');chestOpen.selfClose=true;chestOpen=null;hide('chestUI');if(relock&&player&&player.alive)lockPointer();}
const INV_SCREEN={inv:true,items:[]};let invHover=null;
function openInv(){if(!player||!player.alive||MATCH.state!=='play'||chestOpen)return false;chestOpen=INV_SCREEN;chestCursor=CHEST_SLOTS+player.sel;sfx('click');document.exitPointerLock&&document.exitPointerLock();show('chestUI');renderChest();return true;}
function slotHTML(s,i,kind,sel){const id=s?(typeof s==='string'?s:s.id):null;return `<div class="slot${sel?' sel':''}" data-k="${kind}" data-i="${i}" data-n="${id&&ITEMS[id]?ITEMS[id].name:''}" data-e="${id&&ITEMS[id]?itemTipLines(id).join('|'):''}" data-a="${id&&ITEMS[id]&&ITEMS[id].ench?1:0}" title="${id&&ITEMS[id]?ITEMS[id].name:''}"></div>`;}
function slotCanvas(id,count){const S=GS,px=18*S,c=mkCanvas(px,px),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(ICONS[id],S,S,16*S,16*S);
  if(count>1){const t=pxCanvas(String(count),S,'#ffffff');g.drawImage(t,px-t.width,px-t.height+S);}return c;}
function fillIcons(el,list){[...el.children].forEach((d,i)=>{const s=list[i];if(!s)return;const id=typeof s==='string'?s:s.id;if(!ICONS[id])return;d.prepend(slotCanvas(id,typeof s==='string'?1:s.count));});}
function renderChest(){if(!chestOpen)return;const inv=!!chestOpen.inv;const cg=$('chestGrid'),ig=$('invGrid'),ag=$('armorGrid');$('chestSub').classList.toggle('hidden',inv);$('armorSub').classList.toggle('hidden',!inv);
  $('invHead').classList.toggle('hidden',!inv);pxSet($('invHead'),myName||'Inventory','#404040',false);$('invTip').classList.add('hidden');
  const P=padActive?(inv?[['A','Equip / Select'],['B','Exit',()=>chestClose(true)]]:[['A','Take'],['B','Exit',()=>chestClose(true)]].concat(SET.takeAll?[['LT','Take Everything',()=>chestOp('all')]]:[]))
    :(inv?[['Click','Equip / Select'],['E','Exit',()=>chestClose(true)]]:[['Click','Take'],['E','Exit',()=>chestClose(true)]].concat(SET.takeAll?[['Space','Take Everything',()=>chestOp('all')]]:[]));setPrompts('invPrompts',P);
  if(!inv){cg.innerHTML=chestOpen.items.map((s,i)=>slotHTML(s,i,'c',padActive&&chestCursor===i)).join('');fillIcons(cg,chestOpen.items);}
  ig.innerHTML=player.inv.map((s,i)=>slotHTML(s,i,'p',padActive?chestCursor===CHEST_SLOTS+i:i===player.sel)).join('');fillIcons(ig,player.inv);
  ag.innerHTML=player.armor.map((a,i)=>slotHTML(a?{id:a,count:1}:null,i,'a')).join('');fillIcons(ag,player.armor);}
$('chestUI').addEventListener('click',e=>{const d=e.target.closest('.slot');if(!d||!chestOpen)return;const i=+d.dataset.i,k=d.dataset.k;
  if(chestOpen.inv){const p=player;if(k==='p'){const s=p.inv[i];const it=s&&ITEMS[s.id];if(it&&it.type==='armor'){const cur=p.armor[it.slot];p.armor[it.slot]=s.id;p.inv[i]=cur?{id:cur,count:1}:null;sfx('pick');}else{p.sel=i;p.using=null;sfx('click');}}
    else if(k==='a'){const a=p.armor[i];const f=p.inv.findIndex(x=>!x);if(a&&f>=0){p.inv[f]={id:a,count:1};p.armor[i]=null;sfx('pick');}}renderChest();return;}
  if(k==='c'){if(chestOpen.items[i])chestOp('take',i);}
  else if(k==='p'){const s=player.inv[i];if(!s)return;player.inv[i]=null;chestOp('put',0,s);}
  else if(k==='a'){const a=player.armor[i];if(!a)return;player.armor[i]=null;chestOp('put',0,{id:a,count:1});}
  renderChest();});
$('chestUI').addEventListener('mousemove',e=>{const d=e.target.closest('.slot');const n=d&&d.dataset.n||null,en=d&&d.dataset.e||'';const tk=n?n+'|'+en:null;const tip=$('invTip');if(tk!==invHover){invHover=tk;if(n){pxSet(tip,n,d.dataset.a==='1'?'#55ffff':'#ffffff');if(en)for(const l of en.split('|'))tip.appendChild(l[0]==='~'?pxCanvas(l.slice(1),GS,'#7f9fff'):l[0]==='!'?pxCanvas(l.slice(1),GS,'#ff6060'):pxCanvas(l,GS,'#aaaaaa'));}}tip.classList.toggle('hidden',!n);if(n){tip.style.left=(e.clientX+12*GS/2+6)+'px';tip.style.top=(e.clientY-12*GS)+'px';}});
$('takeAll').addEventListener('click',()=>chestOp('all'));$('closeChest').addEventListener('click',()=>chestClose(true));

// ---------- menus ----------
function readOptions(){SENS=clamp(+$('o_sens').value/200,0,1);INVY=$('o_invy').checked;store('bb_sens',SENS);store('bb_invy',INVY?'1':'0');SET.mode=$('o_mode').value;SET.roundLen=+$('o_round').value;SET.hunger=+$('o_hunger').value;SET.refill=+$('o_refill').value;SET.grace=+$('o_grace').value;
  SET.showdown=$('o_show').checked;SET.takeAll=$('o_take').checked;SET.central=$('o_central').checked;SET.bots=clamp(+$('o_bots').value|0,0,15);SET.difficulty=+$('o_diff').value;SET.brLen=+$('o_brlen').value;SET.brExtra=$('o_brx').checked;SET.enchants=$('o_ench').checked;
  for(const m of MAPS)SET.maps[m.id]=$('map_'+m.id).checked;store('bb_set',JSON.stringify(SET));}
function writeOptions(){$('o_sens').value=Math.round(SENS*200);$('o_invy').checked=INVY;$('o_mode').value=SET.mode;$('o_round').value=SET.roundLen;$('o_hunger').value=SET.hunger;$('o_refill').value=SET.refill;$('o_grace').value=SET.grace;$('o_show').checked=SET.showdown;$('o_take').checked=SET.takeAll;
  $('o_central').checked=SET.central;$('o_bots').value=SET.bots;$('o_diff').value=SET.difficulty;$('o_brlen').value=SET.brLen;$('o_brx').checked=SET.brExtra;$('o_ench').checked=SET.enchants!==false;for(const m of MAPS)$('map_'+m.id).checked=SET.maps[m.id]!==false;}
$('mapChecks').innerHTML=MAPS.map(m=>`<label title="${m.desc}"><input type="checkbox" id="map_${m.id}" checked> ${m.name}</label>`).join('');
try{const s=JSON.parse(store('bb_set')||'null');if(s)Object.assign(SET,s,{maps:Object.assign({},SET.maps,s.maps||{})});}catch(e){}
writeOptions();
let optReturn='menu';
$('optBtn').addEventListener('click',()=>{sfx('click');optReturn='menu';openOptions('menu');});
$('practiceBtn').addEventListener('click',()=>{initAudio();sfx('click');readName();online=false;MATCH.offlineLobby=false;if(net){net.leave();net=null;}player=null;ents=[];enterLobby();chatMsg('Movement playground to the east: ice, slime, soul sand,','#ffff55',false);chatMsg('cobwebs, ladder, slabs, stairs and a pool.','#ffff55',false);});
// console-style menu navigation
const MBTN=()=>[...document.querySelectorAll('#menuList .lbtn')].filter(b=>!b.classList.contains('hidden'));let mSel=0;
function setMSel(i){const b=MBTN();mSel=(i+b.length)%b.length;b.forEach((x,j)=>x.classList.toggle('sel',j===mSel));}
document.querySelectorAll('#menuList .lbtn').forEach(b=>b.addEventListener('mouseenter',()=>{const i=MBTN().indexOf(b);if(i>=0&&mSel!==i){setMSel(i);sfx('click');}}));setMSel(0);
document.addEventListener('keydown',e=>{if($('menu').classList.contains('hidden'))return;if(e.target&&e.target.tagName==='INPUT')return;
  if(e.code==='ArrowDown'||e.code==='KeyS'){setMSel(mSel+1);sfx('click');e.preventDefault();}else if(e.code==='ArrowUp'||e.code==='KeyW'){setMSel(mSel-1);sfx('click');e.preventDefault();}
  else if(e.code==='Enter'||e.code==='Space'){MBTN()[mSel].click();e.preventDefault();}});
// stone-letter logo
function drawLogo(){const c=$('logo'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
  const F={B:['11110','10001','10001','11110','10001','10001','11110'],L:['10000','10000','10000','10000','10000','10000','11111'],O:['01110','10001','10001','10001','10001','10001','01110'],
    C:['01111','10000','10000','10000','10000','10000','01111'],K:['10001','10010','10100','11000','10100','10010','10001'],A:['01110','10001','10001','11111','10001','10001','10001'],
    T:['11111','00100','00100','00100','00100','00100','00100'],E:['11111','10000','10000','11110','10000','10000','11111'],' ':['000','000','000','000','000','000','000']};
  const text='BLOCK BATTLE';let cols=0;for(const ch of text)cols+=F[ch][0].length+1;const cs=Math.floor((c.width-30)/cols),dep=Math.max(3,cs*.45|0);let x0=Math.floor((c.width-cols*cs)/2),y0=18;
  const cells=[];let x=x0;for(const ch of text){const gl=F[ch];for(let r=0;r<7;r++)for(let q=0;q<gl[r].length;q++)if(gl[r][q]==='1')cells.push([x+q*cs,y0+r*cs+(r>=0?0:0)]);x+=(gl[0].length+1)*cs;}
  for(let d=dep;d>0;d--)for(const [cx,cy] of cells){g.fillStyle=d>dep*.5?'#2b2b2b':'#4a4a4a';g.fillRect(cx+d,cy+d,cs,cs);}
  for(const [cx,cy] of cells){for(let py=0;py<cs;py+=Math.max(2,cs/4|0))for(let px=0;px<cs;px+=Math.max(2,cs/4|0)){const v=hash2(cx+px,cy+py,7);g.fillStyle=v<.2?'#8a8a8a':v<.6?'#a9a9a9':v<.85?'#bdbdbd':'#cfcfcf';g.fillRect(cx+px,cy+py,Math.max(2,cs/4|0),Math.max(2,cs/4|0));}
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(cx,cy,cs,2);g.fillRect(cx,cy,2,cs);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(cx,cy+cs-2,cs,2);g.fillRect(cx+cs-2,cy,2,cs);}}
drawLogo();
// custom title logo: logo.png beside the page, or one picked in Resource Packs (kept in this browser)
function setLogoImage(img){const c=$('logo');const w=Math.min(1024,img.naturalWidth||img.width),h=Math.round(w*(img.naturalHeight||img.height)/(img.naturalWidth||img.width));
  c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.clearRect(0,0,w,h);g.drawImage(img,0,0,w,h);
  // logos saved without transparency: clear the plain white/black backdrop by flood-filling from the edges
  try{const d=g.getImageData(0,0,w,h),D=d.data;const at=(x,y)=>(y*w+x)*4;const c0=at(0,0);
    if(D[c0+3]===255){const bg=[D[c0],D[c0+1],D[c0+2]];const near=i=>D[i+3]>0&&Math.abs(D[i]-bg[0])+Math.abs(D[i+1]-bg[1])+Math.abs(D[i+2]-bg[2])<60;const seen=new Uint8Array(w*h),st=[];
      for(let x=0;x<w;x++){st.push(x,0,x,h-1);}for(let y=0;y<h;y++){st.push(0,y,w-1,y);}
      while(st.length){const y=st.pop(),x=st.pop();const k=y*w+x;if(seen[k])continue;seen[k]=1;const i=k*4;if(!near(i))continue;D[i+3]=0;if(x>0)st.push(x-1,y);if(x<w-1)st.push(x+1,y);if(y>0)st.push(x,y-1);if(y<h-1)st.push(x,y+1);}
      g.putImageData(d,0,0);}}catch(e){}c.style.imageRendering='auto';$('edition').classList.add('hidden');$('splash').classList.add('onlogo');}
function loadLogoURL(url,save){return new Promise(res=>{const im=new Image();im.onload=()=>{setLogoImage(im);if(save)try{store('bb_logo',url);}catch(e){}res(true);};im.onerror=()=>res(false);im.src=url;});}
(async()=>{const saved=store('bb_logo');if(saved&&await loadLogoURL(saved,false))return;if(location.protocol!=='file:')for(const n of ['logo.png','logo.webp','logo.jpg'])if(await loadLogoURL(n,false))return;})();
$('logoFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>loadLogoURL(r.result,true).then(ok=>{$('packList').textContent=ok?'Title logo set.':'Could not read that image.';});r.readAsDataURL(f);});
$('logoClear').addEventListener('click',()=>{store('bb_logo','');const c=$('logo');c.width=760;c.height=150;c.style.imageRendering='';drawLogo();$('edition').classList.remove('hidden');$('splash').classList.remove('onlogo');$('packList').textContent='Title logo reset.';});
const SPLASHES=['Now with our own servers!','Spam click!','Last one standing!','Bats can squeak!','100% procedural!','Grace period!','Showdown!','Not Herobrine!','Also try BR mode!','Sprint jump!'];

$('optClose').addEventListener('click',()=>{readOptions();hide('optPanel');show(optReturn);sfx('click');});
$('soloBtn').addEventListener('click',()=>{initAudio();sfx('click');readName();online=false;if(net){net.leave();net=null;}MATCH.mapIdx=MATCH.mapIdx||0;hide('menu');showLoading('Loading level',()=>{player=null;ents=[];hostStartMatch();});});
// ---- server browser: rooms announce themselves; pick one to join ----
let browser=null;
function stopBrowse(){if(browser){browser.close();browser=null;}}
function startBrowse(){stopBrowse();const box=$('roomList');if($('n_kind').value!=='relay'){box.innerHTML='<div class="rnote">Room list works with Internet connections.</div>';return;}
  box.innerHTML='<div class="rnote">Looking for games...</div>';$('browseWhere').textContent='';
  browser=browseRooms($('n_server').value,(list,url,err)=>{if(!$('onlinePanel').classList.contains('hidden')||true){
    if(err){box.innerHTML='<div class="rnote"></div>';box.firstChild.textContent=err;return;}
    $('browseWhere').textContent=url?'on '+url.replace(/^wss?:\/\//,'').replace(/\/mqtt$/,''):'';
    if(!list.length){box.innerHTML='<div class="rnote">No open games right now. Type a room code and press Connect to start one.</div>';return;}
    box.textContent='';for(const r of list){const b=document.createElement('button');b.className='room';b.type='button';
      const nm=document.createElement('span');nm.className='rn';nm.textContent=r.room+(r.host?'  ·  '+r.host:'');
      const st=document.createElement('span');st.className='rs';const mp=(MAPS.find(m=>m.id===r.map)||{}).name||(r.map==='br'?'Battle Royale':r.map||'');st.textContent=(r.mode==='br'?'Battle Royale':'Battle')+(mp&&r.mode!=='br'?' · '+mp:'')+' · '+(r.state==='lobby'?'In lobby':'In game '+fmtTime(r.gt||0));
      const pp=document.createElement('span');pp.className='rp';pp.textContent=(r.n||0)+'/'+(r.max||16);
      b.append(nm,st,pp);b.addEventListener('click',()=>{$('n_room').value=r.room;sfx('click');$('connectBtn').click();});box.appendChild(b);}}});}
$('browseRefresh').addEventListener('click',()=>{sfx('click');startBrowse();});
$('n_server').addEventListener('change',()=>{if(!$('onlinePanel').classList.contains('hidden'))startBrowse();});
$('n_kind').addEventListener('change',()=>{if(!$('onlinePanel').classList.contains('hidden'))startBrowse();});
$('onlineBtn').addEventListener('click',()=>{initAudio();sfx('click');readName();hide('menu');show('onlinePanel');startBrowse();});
$('onlineClose').addEventListener('click',()=>{stopBrowse();hide('onlinePanel');show('menu');});
// leaving the page: say goodbye so the room doesn't wait for a timeout
addEventListener('pagehide',()=>{try{if(net)net.leave();}catch(e){}});addEventListener('beforeunload',()=>{try{if(net&&online)net.post({t:'bye',from:net.myId});}catch(e){}});
$('packBtn').addEventListener('click',()=>{sfx('click');hide('menu');show('packPanel');refreshPackList();});
$('packClose').addEventListener('click',()=>{hide('packPanel');show('menu');});
$('packClear').addEventListener('click',()=>clearPacks());
$('packFile').addEventListener('change',async e=>{for(const f of e.target.files){$('packList').textContent='Loading '+f.name+'...';try{const buf=await f.arrayBuffer();const n=await loadPackBuffer(buf,f.name);await savePack(f.name,buf);$('packList').textContent=`${f.name}: ${n} textures/sounds used.`;}catch(err){$('packList').textContent=f.name+': '+err.message;}}
  applyPack();refreshPackList();e.target.value='';});
function refreshPackList(){const el=$('packList');if(!PACK.names.length){el.textContent='No packs loaded. Using built-in procedural art.';return;}el.innerHTML='Loaded (bottom wins): '+PACK.names.map(n=>'<br>• '+n.replace(/</g,'&lt;')).join('')+
  `<br>Skins: ${PACK.skins.length} · HUD sprites: ${Object.keys(PACK.gui).length} · Panorama: ${PACK.panorama?'yes':'no'} · Bat: ${PACK.bat?'yes':'no'}`;}
function readName(){myName=($('nameIn').value||'').trim().slice(0,16)||('Player'+(Math.random()*900+100|0));store('bb_name',myName);if(!mySkin||mySkin==='gen:Player')mySkin='gen:'+myName;store('bb_skin',mySkin);}
$('nameIn').value=store('bb_name')||'';mySkin=store('bb_skin')||'gen:'+($('nameIn').value||'Player');
function refreshSkinPicker(){const row=$('skinRow');const opts=availableSkins().concat(['gen:'+($('nameIn').value||'Player'),'gen:Alpha','gen:Bravo','gen:Charlie','gen:Delta']);row.innerHTML='';
  for(const k of opts){const c=mkCanvas(16,16);const g=c.getContext('2d');g.imageSmoothingEnabled=false;const S=skinTex(k).img;g.drawImage(S,8,8,8,8,0,0,16,16);g.drawImage(S,40,8,8,8,0,0,16,16);c.title=k.replace(/^(pack|gen):/,'');if(k===mySkin)c.classList.add('on');
    c.addEventListener('click',()=>{mySkin=k;store('bb_skin',k);refreshSkinPicker();sfx('click');});row.appendChild(c);}}
$('nameIn').addEventListener('change',()=>{if(mySkin.startsWith('gen:'))mySkin='gen:'+($('nameIn').value||'Player');refreshSkinPicker();});
$('n_server').value=store('bb_server')||'';$('n_kind').value=store('bb_nkind3')||'relay';$('n_room').value=store('bb_room')||'battle';
$('connectBtn').addEventListener('click',async()=>{
  const kind=$('n_kind').value,room=($('n_room').value||'battle').trim();store('bb_nkind3',kind);store('bb_server',$('n_server').value.trim());store('bb_room',room);
  if(net){net.leave();net=null;}readOptions();
  const ready=()=>{stopBrowse();online=true;setNetStatus('Connected. '+(net.isHost()?'You are the host.':'Joining host...'));hide('onlinePanel');player=null;ents=[];
    if(net.isHost())enterLobby();else{enterLobby();netSend(N.HELLO,{},'host');}};
  const wire=()=>{net.onEvent=onNetEvent;net.onJoin=()=>{if(isHost()&&MATCH.state==='lobby')MATCH.phaseT=0;};net.onLeave=onMemberLeave;net.onHostChange=onHostChanged;};
  if(kind==='local'){setNetStatus('Joining room "'+room+'" in this browser...');net=new LocalNet(room,myName);wire();net.onReady=ready;return;}
  if(kind==='relay'){setNetStatus('Connecting to the relay...');const n=new RelayNet(room,myName,$('n_server').value);net=n;wire();
    n.getAdvert=()=>$('n_public').checked?{host:myName,n:n.list().length,max:16,mode:SET.mode,map:MATCH.state==='play'||MATCH.state==='over'?MATCH.map:nextMapId(),state:MATCH.state==='lobby'?'lobby':'game',gt:Math.round(MATCH.gameT||0)}:null;
    n.onReconnecting=()=>{if(net===n)chatMsg('Connection lost. Reconnecting...','#ffaa00',false);};
    n.onReconnected=down=>{if(net!==n)return;chatMsg('Reconnected.','#55ff55',false);if(down>6500&&!n.isHost())netSend(N.HELLO,{},'host');};   // gone long enough to have missed things: ask the host to catch us upn.tr.trying=url=>{if(net===n&&!n.ready)setNetStatus('Connecting to '+url.replace(/^wss?:\/\//,'').replace(/\/mqtt$/,'')+'...');};
    n.onReady=()=>{if(net!==n)return;setNetStatus('Connected to '+(n.tr.url||'relay').replace(/^wss?:\/\//,'').replace(/\/mqtt$/,''));ready();};
    n.onFail=msg=>{if(net!==n)return;const wasOnline=online;net=null;n.leave();if(wasOnline){toMenu();hide('menu');show('onlinePanel');startBrowse();}setNetStatus(msg);};return;}
  setNetStatus('Pick a connection type.');
});
$('resumeBtn').addEventListener('click',()=>{paused=false;hide('pause');lockPointer();});
$('leaveBtn').addEventListener('click',()=>toMenu());
$('menuBtn').addEventListener('click',()=>toMenu());
// back to the lobby after a round (online: the host takes everyone there; solo: a lobby that counts down to the next round)
function backToLobby(){hide('results');if(online){if(isHost()){netSend(N.TOLOBBY,{});enterLobby();}else if(MATCH.state!=='lobby')enterLobby();}else{MATCH.offlineLobby=true;enterLobby();}}
$('lobbyBtn').addEventListener('click',backToLobby);
$('nextBtn').addEventListener('click',()=>{hide('results');if(!online){showLoading('Loading level',()=>{player=null;ents=[];hostStartMatch();});}});
function toMenu(){if(net){net.leave();net=null;}online=false;MATCH.offlineLobby=false;MATCH.state='menu';player=null;ents=[];document.exitPointerLock&&document.exitPointerLock();hideOverlays();show('menu');setMSel(0);generateMap('skyhold',1,false);buildMesh();refreshSkinPicker();}
function openLobbyPanel(){document.exitPointerLock&&document.exitPointerLock();show('lobbyPanel');const host=isHost();
  $('lobbyInfo').innerHTML=`<div class="note">Room: <b>${($('n_room').value||'').replace(/</g,'&lt;')}</b> · ${net?net.kind:''}${net&&net.tr&&net.tr.url?' via '+net.tr.url.replace(/^wss?:\/\//,'').replace(/\/mqtt$/,'').replace(/</g,'&lt;'):''}${net&&net.ping!=null?' · ping '+Math.round(net.ping)+' ms':''} · ${host?'You are the host':'Host decides the options'}<br>Mode: ${SET.mode==='br'?'Battle Royale':'Battle'} · Round ${SET.roundLen?SET.roundLen/60+' min':'unlimited'} · Grace ${SET.grace||'off'} · Hunger ${({0.5:'slow',1:'normal',2:'fast'})[SET.hunger]} · Bots ${SET.bots}<br>Players: ${ents.filter(e=>e.kind==='player').map(e=>(e.ready?'✓ ':'')+e.name.replace(/</g,'&lt;')+(e===player?(net&&net.ping!=null?' ('+Math.round(net.ping)+' ms)':''):(e.ping!=null?' ('+e.ping+' ms)':''))).join(', ')}</div>`;
  $('lobbyStart').classList.toggle('hidden',!host);$('lobbyOpts').classList.toggle('hidden',!host);}
$('lobbyReady').addEventListener('click',()=>{toggleReady();openLobbyPanel();});
$('lobbyStart').addEventListener('click',()=>{if(isHost()){hide('lobbyPanel');hostStartMatch();}});
$('lobbyOpts').addEventListener('click',()=>{optReturn='lobbyPanel';openOptions('lobbyPanel','rules');});
$('lobbyClose').addEventListener('click',()=>{hide('lobbyPanel');lockPointer();});
function showDeathPanel(killer){announce(killer?'Slain by '+killer.name:'You died!','You are now a bat. Squeak at the living!',3.5,false);}
// end-of-round scoreboard (console style): players with kills and an award on the left, the selected player's stats on the right
const AWARDS={slayer:['Slayer','diamond_sword'],sharp:['Sharpshooter','bow'],brawler:['Brawler','iron_axe'],potion:['Alchemist','splash_harming'],tank:['Punching Bag','leather_chestplate'],survivor:['Survivor','golden_apple'],contender:['Contender','wood_sword']};
function iconCanvas(id,px){const c=mkCanvas(32,32),g=c.getContext('2d');g.imageSmoothingEnabled=false;if(id&&ICONS[id])g.drawImage(ICONS[id],0,0,32,32);c.style.width=c.style.height=(px||28)+'px';return c;}
function pxPic(rows,pal,px){const c=mkCanvas(rows[0].length,rows.length),g=c.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(pal[ch]){g.fillStyle=pal[ch];g.fillRect(x,y,1,1);}}));c.style.width=(px||28)+'px';c.style.height=Math.round((px||28)*rows.length/rows[0].length)+'px';return c;}
const HEART_PX=['.kk...kk.','kwck.kcck','kccccccck','kccccccbk','.kccccbk.','..kccbk..','...kbk...','....k....'];
const heartPic=(c,b)=>pxPic(HEART_PX,{k:'#000',c,b,w:'rgba(255,255,255,.75)'});
const medalPic=()=>pxPic(['k.....k','rk...kb','.rk.kb.','..kyk..','.kyyyk.','kyywyyk','kyyyyyk','.kyyyk.','..kkk..'],{k:'#000',r:'#d83030',b:'#3060d8',y:'#f0c020',w:'#fff8a0'},26);
const fmtClock=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
let resPick=null,resSel=0,resN=0,lastResults=null;
function showResults(m){
  if(MATCH.state!=='over')return;document.exitPointerLock&&document.exitPointerLock();hide('pause');hide('chestUI');
  const rows=m.res.slice().sort((a,b)=>a.p-b.p);const me=player&&player.id;
  $('sbKillIco').replaceChildren(iconCanvas('iron_sword',26));$('sbAwIco').replaceChildren(medalPic());
  const box=$('sbRows');box.textContent='';
  resPick=i=>{resSel=i;[...box.children].forEach((d,j)=>d.classList.toggle('sel',j===i));const r=rows[i];if(!r)return;const aw=AWARDS[r.aw]||AWARDS.contender;
    $('sbAward').replaceChildren(iconCanvas(aw[1]),document.createTextNode(aw[0]));
    $('sbFav').replaceChildren(iconCanvas(r.fw&&ICONS[r.fw]?r.fw:null),document.createTextNode(r.fw&&ITEMS[r.fw]?'Favorite weapon':'No favorite weapon'));
    if(r.fw&&ITEMS[r.fw])$('sbFav').title=ITEMS[r.fw].name;
    $('sbDealt').replaceChildren(heartPic('#e8261c','#8a0f0a'),document.createTextNode(Math.round(r.d||0)+' inflicted'));
    $('sbTaken').replaceChildren(heartPic('#3e3e3e','#1e1e1e'),document.createTextNode(Math.round(r.r||0)+' received'));
    $('sbWinner').textContent=r.id===m.w?'Winner':ordinal(r.p||rows.length)+' place';};
  rows.forEach((r,i)=>{const e=entById(r.id);const d=document.createElement('div');d.className='sbRow'+(r.id===me?' me':'');
    const dot=document.createElement('span');dot.className='dot';dot.style.background=e?PLAYER_COLORS[e.color%16]:'#888';
    const nm=document.createElement('span');nm.className='nm';nm.textContent=String((e&&e.name)||r.name||'Player').slice(0,16);
    const k=document.createElement('span');k.className='k';k.textContent=r.k||0;const aw=document.createElement('span');aw.className='sbIco';aw.appendChild(iconCanvas((AWARDS[r.aw]||AWARDS.contender)[1],26));
    d.append(dot,nm,k,aw);d.addEventListener('mouseenter',()=>resPick(i));d.addEventListener('click',()=>resPick(i));box.appendChild(d);});
  resN=rows.length;let sel=rows.findIndex(r=>r.id===me);resPick(sel<0?0:sel);$('sbTime').textContent=fmtClock(m.t!=null?m.t:MATCH.gameT);
  $('resNote').textContent=online?'Returning to the lobby in a few seconds.':'Back to the lobby in a few seconds, or pick Next map.';$('nextBtn').classList.toggle('hidden',online);$('menuBtn').textContent=online?'Leave Game':'Menu';show('results');
  const ends=m;setTimeout(()=>{if(MATCH.state==='over'&&!$('results').classList.contains('hidden')&&lastResults===ends)backToLobby();},online?9500:15000);lastResults=ends;
}
document.addEventListener('keydown',e=>{if($('results').classList.contains('hidden')||!resPick||!resN)return;if(e.code==='ArrowDown'||e.code==='KeyS'){resPick((resSel+1)%resN);e.preventDefault();}else if(e.code==='ArrowUp'||e.code==='KeyW'){resPick((resSel+resN-1)%resN);e.preventDefault();}});
