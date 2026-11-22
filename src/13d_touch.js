// ================= mobile / touch controls =================
// floating joystick on the left, drag anywhere on the right to look, tap the world to attack, hold the world to use,
// plus buttons for jump, attack, use, sneak, sprint, inventory, drop and pause. Hotbar slots are tappable.
let touchActive=false;const touchIn={fw:0,st:0,jump:false,sneak:false,sprint:false};
function wantTouch(){if(OPT.mobile==='on')return true;if(OPT.mobile==='off')return false;return ('ontouchstart' in window||navigator.maxTouchPoints>0)&&matchMedia('(pointer: coarse)').matches;}
function applyTouchSetting(){touchActive=wantTouch();document.body.classList.toggle('touch',touchActive);if(touchActive&&document.pointerLockElement)document.exitPointerLock();}
const TUI=$('touchUI');
function tBtn(id,fn,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}fn(el);});
  const rel=e=>{el.classList.remove('on');if(up)up(el);};el.addEventListener('pointerup',rel);el.addEventListener('pointercancel',rel);}
const fakeKey=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));setTimeout(()=>document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true})),60);};
tBtn('tJump',()=>{touchIn.jump=true;},()=>{touchIn.jump=false;});
tBtn('tAttack',()=>{lmb=true;lmbEdge=true;},()=>{lmb=false;});
tBtn('tUse',()=>{rmb=true;rmbEdge=true;},()=>{rmb=false;});
tBtn('tSneak',el=>{touchIn.sneak=!touchIn.sneak;},el=>el.classList.toggle('lit',touchIn.sneak));
tBtn('tSprint',el=>{touchIn.sprint=!touchIn.sprint;},el=>el.classList.toggle('lit',touchIn.sprint));
tBtn('tInv',()=>{if(!player)return;if(chestOpen){chestClose(false);return;}if(!player.alive){spectate.mode='follow';spectate.idx++;return;}if(MATCH.state==='play'){if(!tryOpenChest())openInv();}});
tBtn('tDrop',()=>{if(player&&!player.alive){spectate.mode='bat';return;}fakeKey('KeyQ');});
tBtn('tReady',()=>fakeKey('KeyR'));tBtn('tList',()=>fakeKey('Tab'));
tBtn('tPause',()=>{if(!online)paused=true;show('pause');});
// joystick (left half): appears where the thumb lands
let stickId=null,stickO=[0,0];const SB=$('tStickBase'),SK=$('tStickKnob');
$('tStickZone').addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;stickO=[e.clientX,e.clientY];try{e.target.setPointerCapture(e.pointerId);}catch(_){}
  SB.style.left=(e.clientX)+'px';SB.style.top=(e.clientY)+'px';SB.classList.add('on');moveStick(e);});
function moveStick(e){const R=SB.offsetWidth*.42||50;let dx=e.clientX-stickO[0],dy=e.clientY-stickO[1];const m=Math.hypot(dx,dy);if(m>R){dx*=R/m;dy*=R/m;}
  SK.style.transform=`translate(${dx}px,${dy}px)`;touchIn.st=dx/R;touchIn.fw=-dy/R;if(Math.abs(touchIn.st)<.12)touchIn.st=0;if(Math.abs(touchIn.fw)<.12)touchIn.fw=0;
  if(touchIn.fw>.97&&Math.abs(touchIn.st)<.3)touchIn.sprint=true;}
$('tStickZone').addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});
const stickEnd=e=>{if(e.pointerId!==stickId)return;stickId=null;touchIn.fw=0;touchIn.st=0;SK.style.transform='';SB.classList.remove('on');if(!$('tSprint').classList.contains('lit'))touchIn.sprint=false;};
$('tStickZone').addEventListener('pointerup',stickEnd);$('tStickZone').addEventListener('pointercancel',stickEnd);
// look (right side): drag to turn; a quick tap attacks, a long still press uses the held item
const looks=new Map();
$('tLook').addEventListener('pointerdown',e=>{e.preventDefault();try{e.target.setPointerCapture(e.pointerId);}catch(_){}
  // tapping the hotbar selects a slot
  const G=hudGeom(),S=G.S,hx=G.hx,hy=G.hy;   // same layout the HUD draws
  if(player&&e.clientY>=hy-4&&e.clientY<=hy+S+4&&e.clientX>=hx&&e.clientX<=hx+S*9){player.sel=clamp(Math.floor((e.clientX-hx)/S),0,8);player.using=null;selShow=2;return;}
  const L={x:e.clientX,y:e.clientY,t:performance.now(),moved:0,held:false};L.timer=setTimeout(()=>{if(L.moved<10){L.held=true;rmb=true;rmbEdge=true;}},380);looks.set(e.pointerId,L);});
$('tLook').addEventListener('pointermove',e=>{const L=looks.get(e.pointerId);if(!L||!player)return;const dx=e.clientX-L.x,dy=e.clientY-L.y;L.x=e.clientX;L.y=e.clientY;L.moved+=Math.abs(dx)+Math.abs(dy);
  if(!player.alive&&spectate.mode==='follow')return;lookDelta(dx*1.5,dy*1.5);});
const lookEnd=e=>{const L=looks.get(e.pointerId);if(!L)return;clearTimeout(L.timer);looks.delete(e.pointerId);if(L.held){rmb=false;return;}
  if(L.moved<10&&performance.now()-L.t<300){lmb=true;lmbEdge=true;setTimeout(()=>{lmb=false;},60);}};
$('tLook').addEventListener('pointerup',lookEnd);$('tLook').addEventListener('pointercancel',lookEnd);
// show the controls only while actually playing
const TOUCH_BLOCK=['menu','chestUI','pause','results','lobbyPanel','jOpt','optPanel','onlinePanel','packPanel','dressPanel','lbPanel','loading'];
function tickTouch(){const on=touchActive&&player&&(MATCH.state==='play'||MATCH.state==='lobby'||MATCH.state==='over')&&!TOUCH_BLOCK.some(id=>{const el=$(id);return el&&!el.classList.contains('hidden');});
  TUI.classList.toggle('hidden',!on);if(!on)return;
  const alive=player.alive,lobby=MATCH.state==='lobby';
  for(const [id,v] of [['tAttack',true],['tUse',alive&&!lobby],['tSneak',alive],['tSprint',alive],['tInv',!lobby||!alive],['tDrop',alive&&!lobby||!alive],['tReady',lobby],['tList',lobby&&online]])$(id).classList.toggle('hidden',!v);
  $('tInv').firstChild.textContent=alive?'E':'▶';$('tDrop').firstChild.textContent=alive?'Q':'F';}
addEventListener('resize',applyTouchSetting);applyTouchSetting();
