// ================= match flow: settings, start/end, lobby hub, phases, chests, MCBR timeline, net handlers =================
const SET={mode:'battle',roundLen:600,hunger:1,refill:120,grace:30,showdown:true,takeAll:true,central:true,bots:5,difficulty:1,
  maps:{temple:true,cavern:true,cove:true,crucible:true,skyhold:true},brLen:.2,brExtra:true,enchants:true,lobbyWait:45};
const MATCH={state:'menu',mode:'battle',map:null,seed:0,gameT:0,showdown:false,refillAt:0,mapIdx:0,lobbyCD:-1,winner:null,phaseT:0,graceAnn:false,edits:[],nextMap:null};
let suddenDeath=false,br=null,myName='Player',mySkin='gen:Player',online=false;
const inGrace=()=>MATCH.mode==='battle'&&SET.grace>0&&MATCH.gameT<SET.grace;
function enabledMaps(){const m=MAPS.filter(x=>SET.maps[x.id]!==false);   // a map added in an update starts switched on
return m.length?m:[MAPS[0]];}
function nextMapId(){if(SET.mode==='br')return 'br';const m=enabledMaps();return m[MATCH.mapIdx%m.length].id;}
function announce(t,sub,dur=3,bcast=true){msgs.push({t:dur,txt:t,sub:sub||''});if(bcast&&isHost())netSend(N.ANN,{t,s:sub,d:dur});}
function chatMsg(t,col='#fff',bcast=true){chat.push({t:10,txt:t,col});if(chat.length>8)chat.shift();if(bcast&&isHost())netSend(N.CHAT,{t,c:col});}

// ---------- starting a match (host) ----------
function hostStartMatch(){
  const mapId=nextMapId();const seed=(Math.random()*2**31)|0;
  generateMap(mapId,seed,SET.brExtra);
  const humans=net?net.list():[{id:'me',name:myName}];
  const list=[];let ci=0;
  for(const h of humans){const id=net?'p'+h.id:'p1';const ex=entById(id);list.push({id,name:h.name||'Player',kind:'player',skin:ex?ex.skin:(net&&h.id===net.myId?mySkin:'gen:'+h.name),color:ci++});}
  const nb=MATCH.mode==='br'||SET.mode==='br'?SET.bots:Math.max(0,Math.min(SET.bots,16-list.length));
  const names=BOT_NAMES.slice().sort(()=>Math.random()-.5);const skins=availableSkins();
  for(let i=0;i<nb;i++)list.push({id:'b'+i,name:names[i%names.length],kind:'bot',skin:skins.length?skins[i%skins.length]:'gen:'+names[i%names.length]+i,color:ci++});
  let sp=(SET.central&&SET.mode==='battle'?mapInfo.central:mapInfo.spawns).slice();if(!SET.central||SET.mode!=='battle')sp.sort(()=>Math.random()-.5);
  list.forEach((e,i)=>e.sp=sp[i%sp.length]);
  const payload={mode:SET.mode,map:mapId,seed,pre:SET.mode==='br'?5:4,set:JSON.parse(JSON.stringify(SET)),ents:list,chests:[...chests].map(([k,c])=>[k,c.items])};
  netSend(N.START,payload);applyStart(payload,null);
}
function applyStart(p,lateJoinId){
  Object.assign(SET,p.set);MATCH.mode=p.mode;MATCH.map=p.map;MATCH.seed=p.seed;MATCH.state='play';MATCH.gameT=p.gameT||0;MATCH.preT=p.pre||0;MATCH.showdown=!!p.showdown;MATCH.refillAt=p.refillAt||SET.refill;MATCH.winner=null;MATCH.graceAnn=MATCH.gameT>SET.grace;MATCH.edits=[];
  generateMap(p.map,p.seed,SET.brExtra);
  for(const [k,items] of p.chests){const c=chests.get(k);if(c)c.items=items;}
  if(p.edits)for(const [x,y,z,b] of p.edits){setB(x,y,z,b);relightColumn(x,z);MATCH.edits.push([x,y,z,b]);}
  buildMesh();if(p.map==='br')buildMinimap();
  ents=[];projs=[];drops=(p.drops||[]).map(d=>Object.assign({},d));particles=[];feed=[];msgs=[];chat=[];suddenDeath=!!p.sd;
  const myId=net?'p'+net.myId:'p1';
  for(const d of p.ents){const e=new Ent(d.id,d.name,d.kind);e.skin=d.skin;e.color=d.color;e.pos=[d.sp[0],d.sp[1],d.sp[2]];e.yaw=d.sp[3]||0;
    if(d.kind==='bot')e.ai=newAI();if(d.dead){e.alive=false;e.bat=d.kind==='player';}if(d.spectator){e.spectator=true;e.alive=false;e.bat=true;}ents.push(e);}
  player=entById(myId);
  if(!player){player=new Ent(myId,myName,'player');player.skin=mySkin;player.pos=mapInfo.spawns[0].slice(0,3);player.pos[1]+=4;player.alive=false;player.bat=true;player.spectator=true;ents.push(player);}
  player.isLocal=true;player.skin=mySkin;
  if(lateJoinId===myId||player.spectator){player.alive=false;player.bat=true;player.spectator=true;spectate.mode='bat';announce('Battle in progress','You joined as a bat. Squeak at the living!',4,false);}
  if(p.map==='br'){br=p.br?Object.assign({},p.br):{tf:SET.brLen,T:0,ev:0,border:{cx:CX,cz:CZ,from:511*BR_K,to:511*BR_K,t0:0,dur:0},lastCx:CX,lastCz:CZ};br.events=brEvents();}else br=null;
  spectate.mode='bat';spectate.idx=0;
  hideOverlays();lockPointer();
  sfx('click');
}
function snapshotFor(joinId){
  return {pre:MATCH.preT,mode:MATCH.mode,map:MATCH.map,seed:MATCH.seed,set:JSON.parse(JSON.stringify(SET)),gameT:MATCH.gameT,showdown:MATCH.showdown,refillAt:MATCH.refillAt,sd:suddenDeath,edits:MATCH.edits,
    ents:ents.map(e=>({id:e.id,name:e.name,kind:e.kind,skin:e.skin,color:e.color,sp:[e.pos[0],e.pos[1],e.pos[2],e.yaw],dead:!e.alive,spectator:e.spectator})).concat(entById(joinId)?[]:[{id:joinId,name:(net.list().find(m=>'p'+m.id===joinId)||{}).name||'Player',kind:'player',skin:'gen:'+joinId,color:ents.length,sp:[CX,WY-6,CZ,0],spectator:true}]),
    chests:[...chests].map(([k,c])=>[k,c.items]),drops:drops.map(d=>({did:d.did,pos:d.pos,vel:[0,0,0],id:d.id,count:d.count,age:1,spin:0})),br:br?{tf:br.tf,T:br.T,ev:br.ev,border:br.border,lastCx:br.lastCx,lastCz:br.lastCz}:null};
}

// ---------- lobby hub (online) ----------
function enterLobby(){
  MATCH.state='lobby';generateMap('hub',1,false);buildMesh();br=null;suddenDeath=false;
  projs=[];drops=[];particles=[];msgs=[];
  const keep=ents.filter(e=>e.kind==='player');ents=keep;
  for(const e of ents){e.alive=true;e.bat=false;e.spectator=false;e.health=20;e.food=20;e.sat=5;e.effects={};e.absorb=0;e.fire=0;e.inv=new Array(9).fill(null);e.armor=[null,null,null,null];e.kills=0;e.dmgDealt=0;e.ready=false;
    const s=mapInfo.spawns[Math.floor(Math.random()*mapInfo.spawns.length)];e.pos=[s[0]+(Math.random()-.5)*2,s[1],s[2]+(Math.random()-.5)*2];e.vel=[0,0,0];e.mot=[0,0,0];e.prev=null;e.fallDist=0;e.yaw=s[3];}
  if(!player||!ents.includes(player)){player=new Ent(net?'p'+net.myId:'p1',myName,'player');player.isLocal=true;player.skin=mySkin;const s=mapInfo.spawns[0];player.pos=s.slice(0,3);ents.push(player);}
  MATCH.lobbyCD=-1;hideOverlays();lockPointer();
}
function hostLobbyTick(dt){
  const humans=net?net.list().length:1;const ready=ents.filter(e=>e.kind==='player'&&e.ready).length;
  if(humans>=2||SET.bots>0){if(MATCH.lobbyCD<0)MATCH.lobbyCD=SET.lobbyWait;if(ready>=humans&&humans>0)MATCH.lobbyCD=Math.min(MATCH.lobbyCD,5);MATCH.lobbyCD-=dt;if(MATCH.lobbyCD<=0){MATCH.lobbyCD=-1;hostStartMatch();return;}}
  else MATCH.lobbyCD=-1;
  MATCH.phaseT-=dt;if(MATCH.phaseT<=0){MATCH.phaseT=1;netSend(N.LOBBY,{cd:MATCH.lobbyCD,next:nextMapId(),mode:SET.mode,ready:ents.filter(e=>e.ready).map(e=>e.id),set:SET});}
}

// ---------- in-match host logic ----------
function aliveList(){return ents.filter(e=>e.alive&&!e.spectator);}
function hostMatchTick(dt){
  if(MATCH.preT>0){MATCH.phaseT-=dt;if(MATCH.phaseT<=0){MATCH.phaseT=1;netSend(N.PHASE,{pre:MATCH.preT,t:MATCH.gameT,sd:MATCH.showdown,r:MATCH.refillAt,bs:suddenDeath});}return;}
  if(MATCH.mode==='battle'){
    if(!MATCH.graceAnn&&SET.grace>0&&MATCH.gameT>=SET.grace){MATCH.graceAnn=true;}   // the HUD shows 'Invulnerability has worn off! Fight!' at the top
    if(SET.refill>0&&MATCH.gameT>=MATCH.refillAt){MATCH.refillAt+=SET.refill;for(const c of chests.values())c.items=rollLoot(c.center);netSend(N.CHESTS,[...chests].map(([k,c])=>[k,c.items]));chatMsg('The chests have been refilled!','#ffff55');sfx('chest');if(chestOpen)renderChest();}
    const alive=aliveList().length,total=ents.filter(e=>!e.spectator).length;
    if(SET.showdown&&!MATCH.showdown&&total>2&&(alive<=(total>=6?3:2)||(SET.roundLen>0&&SET.roundLen-MATCH.gameT<=60))){MATCH.showdown=true;announce('Showdown!','The remaining players have been revealed',3.5);sfx('go');}
  }else if(br)brUpdate(dt);
  MATCH.phaseT-=dt;if(MATCH.phaseT<=0){MATCH.phaseT=1;netSend(N.PHASE,{pre:MATCH.preT,t:MATCH.gameT,sd:MATCH.showdown,r:MATCH.refillAt,bs:suddenDeath});if(br)netSend(N.BR,{T:br.T,ev:br.ev,border:br.border,lastCx:br.lastCx,lastCz:br.lastCz});}
  const alive=aliveList();
  if(alive.length<=1&&ents.filter(e=>!e.spectator).length>1){hostEndMatch(alive[0]||null);return;}
  if(MATCH.mode==='battle'&&SET.roundLen>0&&MATCH.gameT>=SET.roundLen){let w=null;for(const e of alive)if(!w||e.dmgDealt>w.dmgDealt)w=e;chatMsg('Time is up! Most damage dealt wins.','#ffff55');hostEndMatch(w);}
}
function hostEndMatch(w){
  if(MATCH.state!=='play')return;
  const alive=aliveList();alive.sort((a,b)=>b.dmgDealt-a.dmgDealt);let pl=1;if(w)w.place=1;for(const e of alive)if(e!==w)e.place=++pl;
  const list=ents.filter(e=>!e.spectator),aw=assignAwards(list);
  const res=list.map(e=>({id:e.id,name:e.name,k:e.kills,p:e.place||1,d:Math.round(e.dmgDealt),r:Math.round(e.dmgTaken||0),fw:favWeapon(e),aw:aw.get(e)||'contender'}));
  const m={w:w?w.id:null,res,t:Math.round(MATCH.gameT)};netSend(N.END,m);applyEnd(m);
  MATCH.mapIdx++;
  if(online)setTimeout(()=>{if(isHost()&&MATCH.state==='over'){netSend(N.TOLOBBY,{});enterLobby();}},10000);
}
// end-of-round scoreboard: favourite weapon = the one that did the most damage; every player gets one award
function favWeapon(e){let best=null,bv=0;for(const [k,v] of Object.entries(e.wpn||{}))if(k!=='hand'&&v>bv){bv=v;best=k;}return best;}
function assignAwards(list){const out=new Map();const sum=(e,f)=>Object.entries(e.wpn||{}).reduce((s,[k,v])=>s+(f(k)?v:0),0);
  const tests=[['slayer',e=>e.kills],['sharp',e=>sum(e,k=>ITEMS[k]&&ITEMS[k].type==='bow')],['brawler',e=>e.dmgDealt],['potion',e=>sum(e,k=>k.startsWith('splash_'))],['tank',e=>e.dmgTaken||0],['survivor',e=>100-(e.place||99)]];
  for(const [k,f] of tests){let best=null,bv=0;for(const e of list){if(out.has(e))continue;const v=f(e);if(v>bv){bv=v;best=e;}}if(best)out.set(best,k);}return out;}
function applyEnd(m){
  MATCH.state='over';const w=m.w?entById(m.w):null;MATCH.winner=w;if(w)w.invuln=999;
  for(const r of m.res){const e=entById(r.id);if(e){e.place=r.p;e.kills=r.k;e.dmgDealt=r.d;}}
  try{recordStats(w);}catch(e){}
  const name=w?(w===player?'You':w.name):'Nobody';announce(w===player?'You win!':name+' won the round!','',5,false);sfx(w===player?'win':'orb');
  if(MATCH.mode==='br')chatMsg(name+' won the battle royale!','#ffff55',false);
  setTimeout(()=>showResults(m),3000);
}

// ---------- chests (host authoritative) ----------
function hostChestOp(k,op,slot,who,item){
  const c=chests.get(k);if(!c)return;const local=owned(who);
  if(op==='take'||op==='all'){
    const slots=op==='all'?c.items.map((s,i)=>i):[slot];const give=[];
    for(const i of slots){const s=c.items[i];if(!s)continue;if(local){const left=addItem(who,s.id,s.count);c.items[i]=left?{id:s.id,count:left}:null;}else{give.push(s);c.items[i]=null;}}
    if(give.length)netSend(N.GIVE,{to:who.id,items:give,k},+who.id.slice(1));
  }else if(op==='put'&&item){const j=c.items.indexOf(null);if(j>=0)c.items[j]=item;else hostSpawnDrop([c.x+.5,c.y,c.z+.5],item.id,item.count);}
  netSend(N.CHEST,{k,items:c.items});if(chestOpen===c)renderChest();
}
function chestOp(op,slot,item){if(!chestOpen)return;const k=key(chestOpen.x,chestOpen.y,chestOpen.z);if(isHost())hostChestOp(k,op,slot,player,item);else netSend(N.CHESTREQ,{k,op,slot,item},'host');sfx('pick');}

// ---------- blocks (Battle Royale building) ----------
function applyBlock(x,y,z,b){const was=getB(x,y,z);if(was&&!b)blockParticles(x,y,z,was,40);setB(x,y,z,b);relightColumn(x,z);rebuildAt(x,z);if(isHost())MATCH.edits.push([x,y,z,b]);}
function setBlockNet(x,y,z,b){applyBlock(x,y,z,b);netSend(N.BLOCK,[x,y,z,b]);}
let mining=null;
function breakBlock(x,y,z,who){const b=getB(x,y,z);if(!b||b===B.CHEST||b===B.BARRIER||b===B.BEACON)return;setBlockNet(x,y,z,0);sfx('dig',{pos:[x,y,z],mat:blockMat(b)});
  const d=MINE_DROP[b];if(d){const left=addItem(who,d,1);if(left)requestDrop([x+.5,y-.5,z+.5],d,left);}if(b===B.LEAVES&&Math.random()<.05)requestDrop([x+.5,y-.5,z+.5],'apple',1);}
function placeBlock(x,y,z,id){if(x<1||z<1||y<1||x>=WX-1||z>=WZ-1||y>=WY)return false;const cur=getB(x,y,z);if(cur&&!BD[cur].liquid&&!BD[cur].cross)return false;
  for(const e of ents){if(!e.alive)continue;if(e.pos[0]+HW>x&&e.pos[0]-HW<x+1&&e.pos[2]+HW>z&&e.pos[2]-HW<z+1&&e.pos[1]+EH>y&&e.pos[1]<y+1)return false;}setBlockNet(x,y,z,id);sfx('step',{pos:[x,y,z],mat:blockMat(id),vol:6});return true;}

// ---------- MCBR datapack timeline (initialize.mcfunction / main.mcfunction), scaled ----------
const BRT={BEGIN:0,W0:10800,C0:12000,C0E:15600,W1:21400,C1:21600,C1E:24600,W2:28000,C2:28200,C2E:30300,W3:32500,C3:32700,C3E:34500,W4:36400,C4:36600,C4E:37800,W5:39400,C5:39600,C5E:40500,W6:41800,C6:42000,C6E:42600,WSD:43600,SD:43800};
const BR_BARS=[['start',0,BRT.C0,1,[.33,.85,.33],'Grace period'],['c0',BRT.C0,BRT.C0E,1,[.3,.55,1],'Safezone shrinking'],['d1',BRT.C0E,BRT.C1,-1,[.92,.92,.92],'Next shrink'],['c1',BRT.C1,BRT.C1E,1,[.3,.55,1],'Safezone shrinking'],
 ['d2',BRT.C1E,BRT.C2,-1,[.92,.92,.92],'Next shrink'],['c2',BRT.C2,BRT.C2E,1,[.3,.55,1],'Safezone shrinking'],['d3',BRT.C2E,BRT.C3,-1,[.92,.92,.92],'Next shrink'],['c3',BRT.C3,BRT.C3E,1,[.3,.55,1],'Safezone shrinking'],
 ['d4',BRT.C3E,BRT.C4,-1,[.92,.92,.92],'Next shrink'],['c4',BRT.C4,BRT.C4E,1,[.3,.55,1],'Safezone shrinking'],['d5',BRT.C4E,BRT.C5,-1,[.92,.92,.92],'Next shrink'],['c5',BRT.C5,BRT.C5E,1,[.3,.55,1],'Safezone shrinking'],
 ['d6',BRT.C5E,BRT.C6,-1,[.92,.92,.92],'Next shrink'],['c6',BRT.C6,BRT.C6E,1,[.3,.55,1],'Safezone shrinking']];
function brDur(ticks){const sec=Math.round(ticks/20*br.tf);if(sec>=60&&sec%60===0)return sec===60?'1 minute':(sec/60)+' minutes';return sec+(sec===1?' second':' seconds');}
const brSize=()=>{const b=br&&br.border;if(!b)return 1e9;const k=b.dur>0?clamp((MATCH.gameT-b.t0)/b.dur,0,1):1;return b.from+(b.to-b.from)*k;};
function setBorder(size,secs){br.border.from=brSize();br.border.to=size;br.border.t0=MATCH.gameT;br.border.dur=(secs||0)*br.tf;if(!secs)br.border.from=size;}
function brCircle(size,secs){setBorder(Math.max(1,size*BR_K),secs);chatMsg('Safezone shrinking!','#ff5555');sfx('go');}
function brEvents(){const half=n=>'±'+Math.floor(n*BR_K/2);return [
  [BRT.BEGIN,()=>{}],
  [BRT.W0,()=>chatMsg(`Safezone shrinking to ${half(511)} in ${brDur(1200)}!`,'#55ffff')],
  [BRT.C0,()=>{const r=Math.min(255*BR_K,40);br.border.cx=CX+(Math.random()*2-1)*r;br.border.cz=CZ+(Math.random()*2-1)*r;setBorder(1023*BR_K,0);setBorder(511*BR_K,180);chatMsg('Safezone shrinking!','#ff5555');sfx('go');}],
  [BRT.W1,()=>chatMsg(`Safezone shrinking to ${half(255)} in ${brDur(200)}!`,'#55ffff')],[BRT.C1,()=>brCircle(255,150)],
  [BRT.W2,()=>chatMsg(`Safezone shrinking to ${half(127)} in ${brDur(200)}!`,'#55ffff')],[BRT.C2,()=>brCircle(127,105)],
  [BRT.W3,()=>chatMsg(`Safezone shrinking to ${half(63)} in ${brDur(200)}!`,'#55ffff')],[BRT.C3,()=>brCircle(63,90)],
  [BRT.W4,()=>chatMsg(`Safezone shrinking to ${half(31)} in ${brDur(200)}!`,'#55ffff')],[BRT.C4,()=>brCircle(31,60)],
  [BRT.W5,()=>chatMsg(`Safezone shrinking to ${half(15)} in ${brDur(200)}!`,'#55ffff')],[BRT.C5,()=>brCircle(15,45)],
  [BRT.W6,()=>chatMsg(`Safezone shrinking to one block in ${brDur(200)}!`,'#55ffff')],[BRT.C6,()=>{setBorder(1,30);chatMsg('Safezone shrinking!','#ff5555');sfx('go');}],
  [BRT.WSD,()=>chatMsg(`Sudden death in ${brDur(200)}!`,'#55ffff')],
  [BRT.SD,()=>{br.lastCx=br.border.cx;br.lastCz=br.border.cz;br.border.cx=1e7;br.border.cz=1e7;suddenDeath=true;announce('SUDDEN DEATH','',3);sfx('death');}]];}
function brUpdate(dt){br.T+=dt*20/br.tf;while(br.ev<br.events.length&&br.events[br.ev][0]<=br.T){br.events[br.ev][1]();br.ev++;}}
function inZone(p,target,margin=1){if(MATCH.mode!=='br'||!br||!br.border)return true;const h=(target?br.border.to:brSize())/2*margin;return Math.abs(p[0]-br.border.cx)<=Math.max(h,.5)&&Math.abs(p[2]-br.border.cz)<=Math.max(h,.5);}
function zoneCenter(){if(MATCH.mode==='br'&&br&&br.border){if(br.border.cx>1e6)return [br.lastCx,br.lastCz];return [br.border.cx,br.border.cz];}return [CX,CZ];}
function zoneHalf(){if(MATCH.mode==='br'&&br&&br.border)return Math.min(br.border.to,brSize())/2;return 22;}

// ---------- per-entity tick for entities this client owns ----------
function tickOwned(e,dt,moved){
  tickEffects(e,dt);tickHunger(e,dt,moved);
  if(MATCH.state!=='play')return;
  const fr=e.effects.fireres;
  if(e.inLava&&!fr){e.fire=15;hurt(e,4,null,'lava');}
  if(e.inWater)e.fire=0;
  if(e.fire>0){e.fire-=dt;e.fireT+=dt;if(Math.random()<.4)spawnParticles(e.pos[0],e.pos[1]+.5+Math.random(),e.pos[2],1,[1,.55,.1],1);if(e.fireT>=1){e.fireT=0;if(!fr)hurt(e,1,null,'fire');}}
  // drowning: 300 ticks of air, then 2 damage every second
  const eb=getB(Math.floor(e.pos[0]),Math.floor(e.pos[1]+eyeH(e)),Math.floor(e.pos[2]));if(eb===B.WATER){e.air=(e.air==null?300:e.air)-dt*20;if(e.air<=-20){e.air=0;hurt(e,2,null,'drown',null,true);}}else e.air=300;
  if(MATCH.mode==='br'&&!inZone(e.pos,false))hurt(e,1,null,'border',null,true);
}

// ---------- network event handlers ----------
function onNetEvent(code,d,from){
  const fromHost=net&&from===net.hostId();
  switch(code){
  case N.SKIN:onSkinNet(d);break;
  case N.STATE:{if(!d||!d.id)return;let e=entById(d.id);
    if(!e){if(MATCH.state==='menu')return;e=new Ent(d.id,d.n,'player');e.skin=d.sk||'gen:'+d.n;e.color=ents.length;ents.push(e);e.pos=d.p.slice();if(MATCH.state==='play'&&!d.al){e.alive=false;e.bat=true;e.spectator=!!d.sp;}}
    if(e.isLocal)return;const hp0=e.health;pushSnap(e,d.p,d.v,d.y,d.pi,d.ts,d.g);e.name=String(d.n||e.name).slice(0,16);if(d.sk)e.skin=d.sk;
    e.inv=new Array(9).fill(null);e.sel=0;if(d.h)e.inv[0]={id:d.h,count:1};e.armor=d.a||[null,null,null,null];e.health=d.hp;e.food=d.f;if(d.sw)e.swing=Math.max(e.swing,d.sw);e.using=d.u||null;e.useT=d.ut||0;
    e.fire=d.fi||0;if(d.hp<hp0-.4){e.hurtT=.5;sfx('hurt',{pos:e.pos});}e.effects=d.ef?Object.fromEntries(d.ef.map(n=>[n,{t:9,amp:0,tick:0}])):{};e.sprint=!!d.sr;e.sneak=!!d.sn;e.openChest=d.oc||null;e.ready=!!d.r;e.bat=!!d.b;
    if(MATCH.state==='lobby'){e.alive=true;e.bat=false;}
    break;}
  case N.HIT:{const t=entById(d.t);if(!t||!owned(t))return;const a=d.a?entById(d.a):null;if(a)a.heldHint=typeof d.w==='string'&&ITEMS[d.w]?d.w:null;const ok=hurt(t,d.d,a,d.c,d.kb,!!d.r);if(a)a.heldHint=null;if(d.fx&&(ok||d.d===0))for(const f of d.fx)giveEffect(t,...f);break;}
  case N.DEATH:onDeath(d);break;
  case N.DEALT:{if(!isHost())return;if(d.tk){const t=entById(d.tk);if(t)t.dmgTaken=(t.dmgTaken||0)+d.d;break;}const a=entById(d.a);if(a){a.dmgDealt+=d.d;addWpn(a,typeof d.w==='string'&&(ITEMS[d.w]||d.w==='hand')?d.w:null,d.d);}break;}
  case N.CHESTREQ:{if(!isHost())return;const who=entById('p'+from);if(who)hostChestOp(d.k,d.op,d.slot,who,d.item);break;}
  case N.CHEST:{const c=chests.get(d.k);if(c){c.items=d.items;if(chestOpen===c)renderChest();}break;}
  case N.CHESTS:for(const [k,items] of d){const c=chests.get(k);if(c)c.items=items;}if(chestOpen)renderChest();break;
  case N.GIVE:{if(!player||d.to!==player.id)return;for(const s of d.items){const left=addItem(player,s.id,s.count);if(left){if(d.k)netSend(N.CHESTREQ,{k:d.k,op:'put',item:{id:s.id,count:left}},'host');else requestDrop(player.pos,s.id,left);}}sfx('pick');if(chestOpen)renderChest();break;}
  case N.DROPADD:if(!drops.some(x=>x.did===d.did))drops.push(Object.assign({},d,{pos:d.pos.slice(),vel:d.vel.slice()}));break;
  case N.DROPDEL:{const x=drops.find(x=>x.did===d.did);if(x)x.dead=true;break;}
  case N.DROPREQ:if(isHost())hostSpawnDrop(d.p,d.id,d.c,d.v);break;
  case N.PICK:{if(!isHost())return;const x=drops.find(x=>x.did===d.did&&!x.dead);if(!x)return;x.dead=true;netSend(N.DROPDEL,{did:x.did});netSend(N.GIVE,{to:'p'+from,items:[{id:x.id,count:x.count}]},from);break;}
  case N.PROJ:{const o=entById(d.o);spawnProj(d.k,d.p,d.v,o,d.d,d.pot,false);break;}
  case N.BOTS:for(const b of d){const e=entById(b[0]);if(!e)continue;pushSnap(e,[b[1],b[2],b[3]],[b[4],b[5],b[6]],b[7],b[8],b[17]);if(b[9]<e.health-.4){e.hurtT=.5;sfx('hurt',{pos:e.pos});}e.health=b[9];
      e.inv=new Array(9).fill(null);e.sel=0;if(b[10])e.inv[0]={id:b[10],count:1};e.armor=b[11];e.using=b[12];e.useT=b[13];if(b[14])e.swing=Math.max(e.swing,b[14]);e.fire=b[15];e.effects=b[16]?{invis:{t:9,amp:0}}:{};}break;
  case N.PHASE:if(!fromHost)return;if(d.pre!=null&&Math.abs((MATCH.preT||0)-d.pre)>.5)MATCH.preT=d.pre;if(Math.abs(MATCH.gameT-d.t)>.5)MATCH.gameT=d.t;MATCH.showdown=d.sd;MATCH.refillAt=d.r;suddenDeath=d.bs;break;
  case N.BR:if(!br)return;br.T=d.T;br.ev=d.ev;br.border=d.border;br.lastCx=d.lastCx;br.lastCz=d.lastCz;break;
  case N.START:if(!fromHost)return;applyStart(d,d.join||null);showLoading(d.join?'Joining game':'Loading level',null);break;
  case N.ANN:msgs.push({t:d.d,txt:d.t,sub:d.s||''});break;
  case N.CHAT:if(d&&d.p){chat.push({t:10,txt:`<${String(d.n||'Player').slice(0,16)}> ${String(d.m||'').slice(0,100)}`,col:'#ffffff'});if(chat.length>8)chat.shift();sfx('click');break;}chat.push({t:10,txt:String(d.t||'').slice(0,120),col:/^#[0-9a-f]{3,6}$/i.test(d.c)?d.c:'#fff'});if(chat.length>8)chat.shift();break;
  case N.BLOCK:applyBlock(d[0],d[1],d[2],d[3]);break;
  case N.SQUEAK:{const e=entById(d.id);if(e){spawnParticles(e.pos[0],e.pos[1],e.pos[2],4,[.3,.2,.15],1.5);if(player&&dist(e.pos,player.pos)<24)sfx('squeak');}break;}
  case N.LOBBY:if(!fromHost)return;if(MATCH.state!=='lobby')enterLobby();MATCH.lobbyCD=d.cd;MATCH.nextMap=d.next;Object.assign(SET,d.set);for(const e of ents)e.ready=d.ready.includes(e.id);break;
  case N.READY:{const e=entById('p'+from);if(e)e.ready=d.r;break;}
  case N.END:if(!fromHost)return;applyEnd(d);break;
  case N.TOLOBBY:if(!fromHost)return;enterLobby();break;
  case N.HELLO:{if(!isHost())return;const jid='p'+from;
    if(MATCH.state==='play'){const snap=snapshotFor(jid);snap.join=jid;netSend(N.START,snap,from);}
    else if(MATCH.state==='lobby'){netSend(N.TOLOBBY,{},from);MATCH.phaseT=0;}
    else if(MATCH.state==='over'){netSend(N.TOLOBBY,{},from);}
    break;}
  case N.LEAVE:break;
  }
}
function onMemberLeave(id){
  const e=entById('p'+id);if(!e)return;
  if(MATCH.state==='play'&&e.alive&&isHost()){const m={id:e.id,k:null,c:'left',inv:e.inv.filter(Boolean),armor:e.armor.filter(Boolean),pos:e.pos.slice()};netSend(N.DEATH,m);onDeath(m);feed[0]={t:6,txt:e.name+' left the game'};}
  ents=ents.filter(x=>x!==e);
}
function onHostChanged(){
  if(!net)return;chatMsg(net.isHost()?'You are now the host.':'The host changed.','#ffff55',false);
  if(net.isHost()&&MATCH.state!=='lobby'){netSend(N.TOLOBBY,{});enterLobby();}
}
// state broadcast for my player
let stateT=0;
function sendMyState(dt){
  if(!net||!player)return;stateT-=dt;if(stateT>0)return;stateT=.05;const p=player;const h=p.inv[p.sel];
  netSend(N.STATE,{ts:Math.round(performance.now()),g:p.onGround?1:0,id:p.id,n:myName,sk:mySkin,p:p.pos.map(v=>Math.round(v*100)/100),v:p.vel.map(v=>Math.round(v*100)/100),y:+p.yaw.toFixed(3),pi:+p.pitch.toFixed(3),h:h?h.id:null,a:p.armor,hp:Math.round(p.health*10)/10,f:p.food,
    sw:p.swing>.5?p.swing:0,u:p.using,ut:p.useT,fi:p.fire>0?1:0,ef:Object.keys(p.effects).filter(k=>k==='invis'),sr:p.sprint?1:0,sn:p.sneak?1:0,r:p.ready?1:0,b:p.bat?1:0,al:p.alive?1:0,sp:p.spectator?1:0,oc:chestOpen&&!chestOpen.inv?key(chestOpen.x,chestOpen.y,chestOpen.z):0});
}
let botsT=0;
function sendBots(dt){if(!net||!isHost())return;botsT-=dt;if(botsT>0)return;botsT=.08;const arr=ents.filter(e=>e.kind==='bot'&&e.alive).map(e=>{const h=e.inv[e.sel];
  return [e.id,+e.pos[0].toFixed(2),+e.pos[1].toFixed(2),+e.pos[2].toFixed(2),+e.vel[0].toFixed(2),+e.vel[1].toFixed(2),+e.vel[2].toFixed(2),+e.yaw.toFixed(3),+e.pitch.toFixed(3),Math.round(e.health*10)/10,h?h.id:null,e.armor,e.using,e.useT,e.swing>.5?e.swing:0,e.fire>0?1:0,e.effects.invis?1:0,Math.round(performance.now())];});
  if(arr.length)netSend(N.BOTS,arr);}
// ---- remote player / bot smoothing ----
// Snapshots are stamped with the sender's clock and kept in a short buffer. We draw everyone slightly in the past
// (about 2 packets) and interpolate between two real snapshots, so late or uneven packets no longer make people stutter.
function lerpAng(a,b,f){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*f;}
function pushSnap(e,p,v,yaw,pitch,ts,g){
  const now=performance.now();let n=e.net;if(!n||!n.buf)n=e.net={buf:[],off:null,iv:60,dev:0};
  let t=now;
  if(typeof ts==='number'){const s=now-ts;if(n.off==null||s<n.off)n.off=s;else n.off+=(s-n.off)*.02;t=ts+n.off;n.dev+=(Math.max(0,s-n.off)-n.dev)*.1;}   // sender clock -> our clock (tracks the fastest packets)
  const b=n.buf,last=b[b.length-1];
  if(last){if(t<=last.t){if(typeof ts==='number')return;t=last.t+1;}const gap=t-last.t;if(gap<400)n.iv+=(gap-n.iv)*.1;
    if(Math.hypot(p[0]-last.p[0],p[1]-last.p[1],p[2]-last.p[2])>6){b.length=0;n.snap=true;}}   // teleport / respawn: don't glide across the map
  b.push({t,p:p.slice(),v:v.slice(),y:yaw,pi:pitch,g});if(b.length>12)b.shift();
}
function interpRemote(e,dt){
  const n=e.net;if(!n||!n.buf||!n.buf.length)return;const b=n.buf,first=b[0],last=b[b.length-1];
  const rt=performance.now()-Math.min(200,Math.max(55,n.iv*1.2+n.dev*2+8));
  let p,v,yaw,pitch,g;
  if(b.length===1||rt<=first.t){p=first.p;v=first.v;yaw=first.y;pitch=first.pi;g=first.g;}
  else if(rt>=last.t){   // ran out of snapshots: coast briefly. Grounded players report a small downward speed from gravity, so only coast vertically while airborne
    const ex=Math.min(.15,(rt-last.t)/1000);const air=last.g===0||(last.g===undefined&&Math.abs(last.v[1])>2);
    p=[last.p[0]+last.v[0]*ex,last.p[1]+(air&&last.v[1]>0?last.v[1]*Math.min(ex,.05):0),last.p[2]+last.v[2]*ex];v=last.v;yaw=last.y;pitch=last.pi;g=last.g;}
  else{let i=b.length-2;while(i>0&&b[i].t>rt)i--;const a=b[i],c=b[i+1],f=Math.max(0,Math.min(1,(rt-a.t)/(c.t-a.t)));
    p=[a.p[0]+(c.p[0]-a.p[0])*f,a.p[1]+(c.p[1]-a.p[1])*f,a.p[2]+(c.p[2]-a.p[2])*f];v=[a.v[0]+(c.v[0]-a.v[0])*f,a.v[1]+(c.v[1]-a.v[1])*f,a.v[2]+(c.v[2]-a.v[2])*f];
    yaw=lerpAng(a.y,c.y,f);pitch=a.pi+(c.pi-a.pi)*f;g=c.g;}
  if(n.snap||dist(p,e.pos)>6){n.snap=false;e.pos=p.slice();}else{const k=Math.min(1,dt*50);for(let i=0;i<3;i++)e.pos[i]+=(p[i]-e.pos[i])*k;}
  if(e.alive!==false){const fb=[e.pos[0]-HW+.05,e.pos[1]+.03,e.pos[2]-HW+.05,e.pos[0]+HW-.05,e.pos[1]+.35,e.pos[2]+HW-.05];let top=-1e9;for(const c of collisionBoxes(fb))if(c[4]-e.pos[1]<=.6)top=Math.max(top,c[4]);if(top>e.pos[1])e.pos[1]=top;}
  e.vel=v.slice();e.yaw=yaw;e.pitch=pitch;if(e.onGround!==false)e.walkT+=dt*Math.hypot(e.vel[0],e.vel[2]);
  e.onGround=g!==undefined?!!g:Math.abs(v[1])<2;e.rpos=e.pos;}
