// ================= console layer: Xbox controller (Legacy Console layout), loading screen, prompts, ambience =================
// Legacy Console controls: LS move, RS look, A jump, RT attack/mine, LT use/place/eat/open, LB/RB hotbar,
// LS click sprint, RS click sneak, B drop, Y inventory (chest), Start pause, Back lobby/scores
let padActive=false,padIn={fw:0,st:0,jump:false,sneak:false,sprint:false},padPrev={},padRepeat=0,chestCursor=0;
const PAD_LOOK=Math.PI*1.25; // max turn speed (rad/s) at full stick, eased like the console camera
function padButtons(gp){const b=i=>!!(gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>.5));return {a:b(0),b:b(1),x:b(2),y:b(3),lb:b(4),rb:b(5),lt:b(6),rt:b(7),back:b(8),start:b(9),ls:b(10),rs:b(11),up:b(12),down:b(13),left:b(14),right:b(15)};}
function dz(v){const d=.15;return Math.abs(v)<d?0:Math.sign(v)*(Math.abs(v)-d)/(1-d);}
function pollPad(dt){
  const gps=navigator.getGamepads?navigator.getGamepads():[];const gp=[...gps].find(g=>g&&g.connected);
  if(!gp){if(padActive){padActive=false;}return;}
  const B=padButtons(gp),E=k=>B[k]&&!padPrev[k];const lx=dz(gp.axes[0]||0),ly=dz(gp.axes[1]||0),rx=dz(gp.axes[2]||0),ry=dz(gp.axes[3]||0);
  if(!padActive&&(Object.values(B).some(Boolean)||Math.abs(lx)+Math.abs(ly)+Math.abs(rx)+Math.abs(ry)>.3)){padActive=true;if(locked)document.exitPointerLock();}
  if(!padActive){padPrev=B;return;}
  const menuOpen=!$('menu').classList.contains('hidden');
  const panel=['jOpt','optPanel','onlinePanel','packPanel','lobbyPanel','results','pause','lbPanel','dressPanel'].find(id=>!$(id).classList.contains('hidden'));
  padRepeat-=dt;const nav=ly<-.5||B.up?-1:ly>.5||B.down?1:0;const navX=lx<-.5||B.left?-1:lx>.5||B.right?1:0;
  if(menuOpen&&!panel){if(nav&&padRepeat<=0){setMSel(mSel+nav);sfx('click');padRepeat=.22;}if(!nav)padRepeat=0;if(E('a')){MBTN()[mSel].click();}if(E('b'))menuBack();if(E('x'))openDress();}
  else if(panel){if(E('b')){const back={jOpt:'jDoneHidden',lbPanel:'lbClose',dressPanel:'dressClose',optPanel:'optClose',onlinePanel:'onlineClose',packPanel:'packClose',lobbyPanel:'lobbyClose',results:'menuBtn',pause:'resumeBtn'}[panel];$(back).click();}
    if(panel==='pause'&&E('a'))$('resumeBtn').click();if(panel==='results'&&E('a')&&!$('nextBtn').classList.contains('hidden'))$('nextBtn').click();if(panel==='lobbyPanel'&&E('a'))$('lobbyReady').click();}
  else if(chestOpen){ // chest screen: stick/d-pad cursor, A take or put back, LB take everything, B exit
    if((nav||navX)&&padRepeat<=0){const total=CHEST_SLOTS+9,lo=chestOpen.inv?CHEST_SLOTS:0,n=total-lo;let c=chestCursor-lo;if(navX)c+=navX;if(nav)c+=nav*9;chestCursor=lo+((c%n)+n)%n;renderChest();sfx('click');padRepeat=.16;}if(!nav&&!navX)padRepeat=0;
    if(E('a')&&chestOpen.inv){const el=document.querySelector('#invGrid .slot.sel');if(el)el.click();}
    else if(E('a')){if(chestCursor<CHEST_SLOTS){if(chestOpen.items[chestCursor])chestOp('take',chestCursor);}else{const i=chestCursor-CHEST_SLOTS;const s=player.inv[i];if(s){player.inv[i]=null;chestOp('put',0,s);}}renderChest();}
    if((E('lb')||E('lt'))&&SET.takeAll&&!chestOpen.inv)chestOp('all');if(E('b')||E('y'))chestClose(false);}
  else if(player&&(MATCH.state==='play'||MATCH.state==='lobby'||MATCH.state==='over')){
    padIn.fw=-ly;padIn.st=lx;padIn.jump=B.a;if(E('rs'))padIn.sneak=!padIn.sneak;if(E('ls'))padIn.sprint=true;if(ly>-.6)padIn.sprint=false;
    // console-style camera: eased stick response
    const k=SENS*.6+.2,ks=k*k*k*8;const yawR=Math.sign(rx)*rx*rx*PAD_LOOK*ks,pitR=Math.sign(ry)*ry*ry*PAD_LOOK*.75*ks;
    if(player.alive||spectate.mode==='bat'){player.yaw-=yawR*dt;player.pitch=clamp(player.pitch-(INVY?-pitR:pitR)*dt,-Math.PI/2,Math.PI/2);}
    if(E('rt')){lmb=true;lmbEdge=true;}if(!B.rt&&padPrev.rt)lmb=false;
    if(E('lt')){rmb=true;rmbEdge=true;}if(!B.lt&&padPrev.lt)rmb=false;
    if(player.alive){if(E('lb')){player.sel=(player.sel+8)%9;player.using=null;selShow=2;sfx('click');}if(E('rb')){player.sel=(player.sel+1)%9;player.using=null;selShow=2;sfx('click');}
      if(E('b')&&MATCH.state!=='lobby'){const s=player.inv[player.sel];if(s){const d=fwd(player);requestDrop([player.pos[0],player.pos[1]+.4,player.pos[2]],s.id,1,[d[0]*6,d[1]*6+2,d[2]*6]);consume(player,player.sel);}}
      if(E('y')&&MATCH.state==='play'){if(!tryOpenChest())openInv();}}
    else{if(E('lb')){spectate.mode='follow';spectate.idx--;}if(E('rb')){spectate.mode='follow';spectate.idx++;}if(E('x'))spectate.mode='bat';if(E('rt')){sfx('squeak');netSend(N.SQUEAK,{id:player.id});}}
    if(E('start')){if(online){show('pause');}else{paused=true;show('pause');}}
    if(E('back')&&online&&MATCH.state==='lobby')openLobbyPanel();
    if(E('x')&&MATCH.state==='lobby')toggleReady();
  }
  padPrev=B;
}
window.addEventListener('gamepadconnected',()=>{chatMsg('Controller connected','#ffff55',false);});

// ---------- loading screen between menu and match (console-style) ----------
const TIPS=['Armour you take from a chest is equipped automatically.','Sprint-hitting knocks players back further.','Hold a sword up to block and take less damage.',
  'Chests refill during the round, so check them again.','Hunger still matters in Battle: eat before you run out.','Bats can watch other players: switch with LB and RB.',
  'Falling while you attack lands a critical hit.','When only a few players are left, Showdown reveals where they are.','Splash potions affect everyone close to where they land.'];
function loadingUp(){const el=$('loading');return !!el&&!el.classList.contains('hidden');}
function loadLogo(){const im=$('loadLogo');if(!im)return;try{im.src=$('logo').toDataURL();im.style.display='';}catch(e){im.style.display='none';}}
// a Battle round starts behind the loading screen: it stays up through the short pre-round wait, then you spawn straight into the invulnerability countdown
function loadHold(){return MATCH.state==='play'&&MATCH.mode==='battle'&&MATCH.preT>0;}
let holdShown=false,holdT0=1;
function tickLoadHold(){const el=$('loading');if(loadHold()){if(!holdShown){holdShown=true;holdT0=Math.max(MATCH.preT,.01);$('loadTitle').textContent=isHost()?'Building terrain':'Downloading terrain';
      if(el.classList.contains('hidden')){$('loadTip').textContent=TIPS[Math.random()*TIPS.length|0];loadLogo();el.classList.remove('hidden');}}
    $('loadBar').style.width=Math.round(100*(1-MATCH.preT/holdT0))+'%';}
  else if(holdShown){holdShown=false;el.classList.add('hidden');}}
function showLoading(title,then){const el=$('loading');$('loadTitle').textContent=title;$('loadTip').textContent=TIPS[Math.random()*TIPS.length|0];loadLogo();el.classList.remove('hidden');
  const bar=$('loadBar');bar.style.width='0%';let p=0;const step=()=>{p=Math.min(100,p+8+Math.random()*14);bar.style.width=p+'%';if(p<100)setTimeout(step,60);else setTimeout(()=>{try{then&&then();}finally{if(!loadHold())el.classList.add('hidden');}},120);};setTimeout(step,80);}

// ---------- contextual button prompts (bottom left, like the console HUD) ----------
function promptLabels(){
  const p=player;if(!p||MATCH.state==='menu')return [];const out=[];const pad=padActive;const K=(m,g)=>pad?g:m;
  if(!p.alive){out.push([K('LMB','RT'),'Squeak'],[K('Q/E','LB/RB'),'Previous/Next'],[K('F','X'),'Fly']);return out;}
  if(MATCH.state==='lobby'){out.push([K('R','X'),p.ready?'Not Ready':'Ready'],[K('E','Y'),'Inventory']);if(online)out.push([K('Tab','Back'),'Lobby']);return out;}
  const s=p.inv[p.sel],it=s&&ITEMS[s.id];if(MATCH.state==='play'){if(p.inWater)out.push([K('Space','A'),'Swim Up']);out.push([K('E','Y'),'Inventory']);}
  if(lookChest())out.push([K('RMB','LT'),'Open']);
  else if(it){if(it.type==='food'&&(p.food<20||it.always))out.push([K('RMB','LT'),'Eat']);else if(it.type==='potion')out.push([K('RMB','LT'),'Drink']);else if(it.type==='splash')out.push([K('RMB','LT'),'Throw']);
    else if(it.type==='bow')out.push([K('RMB','LT'),p.using==='bow'?'Release':'Draw']);else if(it.tool==='sword')out.push([K('RMB','LT'),'Block']);else if(it.type==='armor')out.push([K('RMB','LT'),'Equip']);else if(it.type==='block'&&MATCH.mode==='br')out.push([K('RMB','LT'),'Place']);
    out.push([K('Q','B'),'Drop']);}
  return out;
}
const PAD_COL={A:'#5cb85c',B:'#d9534f',X:'#428bca',Y:'#f0ad4e'};
function drawPrompts(){if(chestOpen||touchActive)return;const list=promptLabels();let x=Math.round(W*.05);const y=Math.round(H*.94);
  for(const [k,label] of list){const col=PAD_COL[k];hc.font="18px "+HFONT;const kw=Math.max(22,hc.measureText(k).width+12);
    if(col){hc.fillStyle=col;hc.beginPath();hc.arc(x+11,y-6,11,0,7);hc.fill();hc.fillStyle='#fff';hc.textAlign='center';hc.fillText(k,x+11,y);x+=26;}
    else{hc.fillStyle='rgba(230,230,230,.95)';hc.fillRect(x,y-17,kw,22);hc.fillStyle='#333';hc.textAlign='center';hc.fillText(k,x+kw/2,y);x+=kw+6;}
    txt(label,x,y,14,'#fff');hc.font="18px "+HFONT;x+=(FONT?bmpWidth(label,2):hc.measureText(label).width)+24;}}

// ---------- ambience: cave sounds in dark maps, music from a loaded pack ----------
let ambT=30+Math.random()*60,musicT=10,musicSrc=null,musicGain=null;
function tickAmbience(dt){
  if(!actx)return;
  if(mapInfo&&mapInfo.dark&&MATCH.state==='play'){ambT-=dt;if(ambT<=0){ambT=40+Math.random()*80;const g=packGroup(['ambient/cave/cave'])||packEventList('ambient.cave');if(g){playBytes(g[Math.random()*g.length|0],.6,.8+Math.random()*.2);}}}
  musicT-=dt;if(musicT<=0&&!musicSrc){musicT=60+Math.random()*120;const grp=MATCH.state==='menu'?(packGroup(['music/menu/menu'])||packGroup(['music/menu'])):(packGroup(['music/game/calm','music/game/hal','music/game/nuance','music/game/piano'])||packGroup(['music/game']));
    if(grp){const k=grp[Math.random()*grp.length|0];actx.decodeAudioData(PACK.sounds[k].slice().buffer).then(b=>{const s=actx.createBufferSource(),g=actx.createGain();s.buffer=b;g.gain.value=.35*OPT.music;s.connect(g);g.connect(masterOut||actx.destination);musicGain=g;s.onended=()=>{musicSrc=null;};musicSrc=s;s.start();}).catch(()=>{});}}
}
function packEventList(ev){if(!PACK.events||!PACK.events[ev])return null;const l=PACK.events[ev].map(x=>x.name).filter(n=>PACK.sounds[n]);return l.length?l:null;}

// ---------- body yaw that lags behind the head, like the Java/Legacy player model ----------
function updateBodyYaw(e,dt){
  if(e.bodyYaw==null)e.bodyYaw=e.yaw;const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
  const sp=Math.hypot(e.vel[0],e.vel[2]);let target=e.bodyYaw;
  if(sp>.5){let mv=Math.atan2(-e.vel[0],-e.vel[2]);if(Math.abs(wrap(mv-e.yaw))>Math.PI/2+.1)mv+=Math.PI;target=mv;}
  e.bodyYaw+=wrap(target-e.bodyYaw)*Math.min(1,dt*(sp>.5?8:3));
  const d=wrap(e.yaw-e.bodyYaw),lim=sp>.5?Math.PI*75/180:Math.PI*50/180;if(d>lim)e.bodyYaw=e.yaw-lim;else if(d<-lim)e.bodyYaw=e.yaw+lim;
  if(e.swing>0)e.bodyYaw+=wrap(e.yaw-e.bodyYaw)*Math.min(1,dt*10);
}
