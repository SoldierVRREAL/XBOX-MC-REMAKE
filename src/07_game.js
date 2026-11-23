// ================= entities, physics, combat, hunger, effects =================
const HW=.3,EH=1.8,EYE=1.62,G=28;
const PLAYER_COLORS=['#e8e8e8','#5cd65c','#e04848','#4a8cf0','#f070c8','#f0d040','#f09030','#40d8d8','#a060f0','#8a5a3a','#60a0a0','#c0c0ff','#ff9090','#90ff90','#ffd090','#d0d0d0'];
const BOT_NAMES=['Cubert','PixelPete','Sir Blocksalot','LagSpike','Grassman','NoobSlayer99','Tofu','Bonk','xX_Sweaty_Xx','ChunkyMonkey','Gravelord','AFK_Andy','DiamondDave','Bread Enjoyer','SpleefQueen','NotABot','Mr. Chest','Sprinty','Ctrl+W','Pebble'];
class Ent{
  constructor(id,name,kind){Object.assign(this,{id,name,kind,pos:[0,0,0],vel:[0,0,0],yaw:0,pitch:0,onGround:false,health:20,food:20,sat:5,exh:0,alive:true,bat:false,
    inv:new Array(9).fill(null),armor:[null,null,null,null],sel:0,invuln:0,hurtT:0,atkCD:0,swing:0,walkT:0,lastHurt:99,regenT:0,starveT:0,fallStart:null,kills:0,dmgDealt:0,dmgTaken:0,wpn:null,
    useT:0,using:null,collidedH:false,mot:[0,0,0],prev:null,rpos:null,acc:0,in:null,jump:false,jumpTicks:0,fallDist:0,inWeb:false,sneak:false,lastAttacker:null,lastAttackT:99,place:0,effects:{},absorb:0,fire:0,fireT:0,inWater:false,inLava:false,skin:'gen:'+name,color:0,sprint:false,net:null,isLocal:false,ready:false,bodyYaw:0});}
}
let ents=[],player=null,projs=[],drops=[],particles=[],feed=[],msgs=[],chat=[];
const entById=id=>ents.find(e=>e.id===id);
const eyeH=e=>e.bat?0:e.sneak?1.54:EYE;
const eye=e=>[e.pos[0],e.pos[1]+eyeH(e),e.pos[2]];
const fwd=e=>[-Math.sin(e.yaw)*Math.cos(e.pitch),Math.sin(e.pitch),-Math.cos(e.yaw)*Math.cos(e.pitch)];
const owned=e=>e&&(e.isLocal||(e.kind==='bot'&&isHost()));
const maxHP=e=>20;

function fluidAt(x,y,z){const b=getB(Math.floor(x),Math.floor(y),Math.floor(z));return b?BD[b].liquid:false;}
function raycastBlock(o,d,maxD,ignoreFluid=true){
  let x=Math.floor(o[0]),y=Math.floor(o[1]),z=Math.floor(o[2]);const sx=Math.sign(d[0]),sy=Math.sign(d[1]),sz=Math.sign(d[2]);
  const tdx=sx?Math.abs(1/d[0]):1e9,tdy=sy?Math.abs(1/d[1]):1e9,tdz=sz?Math.abs(1/d[2]):1e9;
  let tx=sx>0?(x+1-o[0])*tdx:sx<0?(o[0]-x)*tdx:1e9,ty=sy>0?(y+1-o[1])*tdy:sy<0?(o[1]-y)*tdy:1e9,tz=sz>0?(z+1-o[2])*tdz:sz<0?(o[2]-z)*tdz:1e9;
  let t=0,px=x,py=y,pz=z;
  for(let i=0;i<300&&t<=maxD;i++){const b=getB(x,y,z);if(b&&BD[b].solid&&b!==B.BARRIER)return {x,y,z,b,t,px,py,pz};
    px=x;py=y;pz=z;if(tx<ty&&tx<tz){x+=sx;t=tx;tx+=tdx;}else if(ty<tz){y+=sy;t=ty;ty+=tdy;}else{z+=sz;t=tz;tz+=tdz;}}
  return null;
}
function los(a,b){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d);if(L<.01)return true;return !raycastBlock(a,[d[0]/L,d[1]/L,d[2]/L],L);}
function rayBox(o,d,mn,mx){let t0=0,t1=1e9;for(let i=0;i<3;i++){if(Math.abs(d[i])<1e-9){if(o[i]<mn[i]||o[i]>mx[i])return -1;continue;}let a=(mn[i]-o[i])/d[i],b=(mx[i]-o[i])/d[i];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return -1;}return t0;}
const entBox=(e,p=.1)=>[[e.pos[0]-HW-p,e.pos[1]-p,e.pos[2]-HW-p],[e.pos[0]+HW+p,e.pos[1]+EH+p,e.pos[2]+HW+p]];

// ---------- inventory ----------
const armorPts=e=>e.armor.reduce((s,a)=>s+(a?ITEMS[a].pts:0),0);
const enchProt=e=>e.armor.reduce((s,a)=>s+enchLvl(a,'protection'),0);
function addItem(e,id,count){
  const it=ITEMS[id];if(!it)return 0;
  if(it.type==='armor'){const cur=e.armor[it.slot];if(!cur||ITEMS[cur].pts<it.pts||(ITEMS[cur].pts===it.pts&&enchScore(id)>enchScore(cur))){e.armor[it.slot]=id;if(cur)addItem(e,cur,1);return 0;}} // auto-equip from chests
  if(it.stack>1)for(const s of e.inv){if(s&&s.id===id&&s.count<it.stack){const m=Math.min(count,it.stack-s.count);s.count+=m;count-=m;if(!count)return 0;}}
  for(let i=0;i<9;i++)if(!e.inv[i]){const m=Math.min(count,it.stack);e.inv[i]={id,count:m};count-=m;if(!count)return 0;}
  return count;
}
const hasItem=(e,id)=>e.inv.findIndex(s=>s&&s.id===id);
function consume(e,i){const s=e.inv[i];if(!s)return;s.count--;if(s.count<=0)e.inv[i]=null;}
function weaponDmg(e){const s=e.inv[e.sel];let d=s&&ITEMS[s.id].type==='weapon'?ITEMS[s.id].dmg:1;const st=e.effects.strength,wk=e.effects.weakness;if(wk)d-=.5*(wk.amp+1);if(st)d*=1+1.3*(st.amp+1);if(s&&ITEMS[s.id].type==='weapon')d+=1.25*enchLvl(s.id,'sharpness');return Math.max(0,d);}

// ---------- effects ----------
function giveEffect(e,name,dur,amp){
  if(name==='heal'){e.health=Math.min(maxHP(e),e.health+(4<<amp));return;}
  if(name==='harm'){hurt(e,6<<amp,null,'magic',null,true,true);return;}
  if(name==='ignite'){if(!e.effects.fireres&&!e.inWater)e.fire=Math.max(e.fire||0,dur);return;}   // Fire Aspect / Flame
  const cur=e.effects[name];if(cur&&cur.amp>amp&&cur.t>dur)return;e.effects[name]={t:dur,amp,tick:0};
  if(name==='absorption')e.absorb=Math.max(e.absorb,4*(amp+1));if(name==='fireres')e.fire=0;
}
function tickEffects(e,dt){
  for(const k in e.effects){const f=e.effects[k];f.t-=dt;f.tick+=dt;
    if(k==='regen'){const iv=2.5/(1<<f.amp);if(f.tick>=iv){f.tick-=iv;e.health=Math.min(maxHP(e),e.health+1);}}
    if(k==='poison'){const iv=1.25/(1<<f.amp);if(f.tick>=iv){f.tick-=iv;if(e.health>1){e.health-=1;e.hurtT=.25;}}}
    if(f.t<=0){delete e.effects[k];if(k==='absorption')e.absorb=0;}}
}
function speedMul(e){let m=1;if(e.effects.speed)m*=1+.2*(e.effects.speed.amp+1);if(e.effects.slowness)m*=Math.max(.2,1-.15*(e.effects.slowness.amp+1));return m;}

// ---------- hunger (1.8 exhaustion model, scaled by the Hunger Rate option) ----------
function exhaust(e,v){e.exh+=v*(SET.hunger||1);}
function tickHunger(e,dt,moved){
  if(e.sprint&&e.onGround)exhaust(e,.1*moved);else if(e.onGround)exhaust(e,.01*moved);
  if(e.inWater)exhaust(e,.015*moved);
  while(e.exh>=4){e.exh-=4;if(e.sat>0)e.sat=Math.max(0,e.sat-1);else e.food=Math.max(0,e.food-1);}
  if(e.food>=18&&e.health<maxHP(e)&&!(MATCH.mode==='br'&&suddenDeath)){e.regenT+=dt;if(e.regenT>=4){e.regenT=0;e.health=Math.min(maxHP(e),e.health+1);exhaust(e,3);}}else e.regenT=0;
  if(e.food<=0){e.starveT+=dt;if(e.starveT>=4){e.starveT=0;e.invuln=0;hurt(e,1,null,'starve',null,true);}}else e.starveT=0;
}
function eatFood(e,id){const it=ITEMS[id];e.food=Math.min(20,e.food+it.food);e.sat=Math.min(e.food,e.sat+it.sat);if(it.fx)for(const [n,d,a] of it.fx)giveEffect(e,n,d,a);}

// ---------- damage ----------
function hurt(e,amt,src,cause,kb,raw,ignoreInvuln){
  if(!e.alive)return false;
  if(MATCH.state!=='play'||MATCH.preT>0||(src&&src!==e&&inGrace()))return false;
  if(e.invuln>500)return false;
  let fresh=true;
  if(e.invuln>0&&!ignoreInvuln){if(amt<=(e.lastDmg||0))return false;const d=amt-(e.lastDmg||0);e.lastDmg=amt;amt=d;fresh=false;} // EntityLivingBase.attackEntityFrom
  else{e.lastDmg=amt;e.invuln=.5;e.hurtT=.5;}
  if(!raw&&e.using==='block'&&src)amt=(1+amt)*.5;                       // sword blocking
  if(!raw){amt*=1-Math.min(20,armorPts(e))*.04;const ep=enchProt(e);if(ep)amt*=1-Math.min(20,ep)*.04;}                            // armour: 4% per point
  if(e.absorb>0){const a2=Math.min(e.absorb,amt);e.absorb-=a2;amt-=a2;}
  e.health-=amt;e.lastHurt=0;exhaust(e,.3);
  creditTaken(e,amt);if(src&&src!==e){e.lastAttacker=src;e.lastAttackT=0;creditDamage(src,amt,cause);}
  if(fresh){
    if(kb)knockback(e,kb[0],kb[1],kb[2]||0,kb[3]||0,kb[4]||0);
    sfx(cause==='fall'?(amt>4?'fallbig':'fall'):cause==='fire'||cause==='lava'?'burn':cause==='drown'?'drown':'hurt',{pos:e.pos});
    if(cause==='fall'&&amt>0){const b=getB(Math.floor(e.pos[0]),Math.floor(e.pos[1]-.2),Math.floor(e.pos[2]));if(b)blockParticles(Math.floor(e.pos[0]),Math.floor(e.pos[1]-.2),Math.floor(e.pos[2]),b,Math.min(40,8+amt*4));}
  }
  if(e.health<=0)kill(e,src,cause);
  return true;
}
// scoreboard stats live on the host: damage dealt (and with what), damage received
function creditDamage(src,amt,cause){const s=src.inv&&src.inv[src.sel],sid=src.heldHint||(s&&s.id),it=sid&&ITEMS[sid];const w=cause==='shot'?'bow':cause==='magic'?'splash_harming':(it&&it.type==='weapon'?sid:'hand');
  if(isHost()){src.dmgDealt+=amt;addWpn(src,w,amt);}else netSend(N.DEALT,{a:src.id,d:amt,w});}
function addWpn(e,w,amt){if(!w)return;const m=e.wpn||(e.wpn={});m[w]=(m[w]||0)+amt;}
function creditTaken(e,amt){if(!(amt>0))return;if(isHost())e.dmgTaken=(e.dmgTaken||0)+amt;else netSend(N.DEALT,{tk:e.id,d:amt});}
// route damage to whoever owns the target
function damage(t,amt,src,cause,kb,raw,fx){
  if(owned(t)){const ok=hurt(t,amt,src,cause,kb,raw);if(fx&&(ok||amt===0))for(const f of fx)giveEffect(t,...f);return ok;}
  // you hit someone on another computer: show the red flash and sound now instead of waiting for their reply to come back
  if(src===player&&amt>0&&!inGrace()&&!(t.hurtT>0)&&MATCH.state==='play'){t.hurtT=.5;t.hitPred=performance.now();sfx('hurt',{pos:t.pos});}
  const hs=src&&src.inv&&src.inv[src.sel];netSend(N.HIT,{t:t.id,d:amt,a:src?src.id:null,c:cause,kb,r:raw?1:0,fx,w:hs?hs.id:null},null);return true;
}
function deathText(e,killer,cause){
  const nm=x=>x===player?'You':x.name;const was=x=>x===player?'You were':x.name+' was';
  if(cause==='void')return killer?`${was(e)} knocked into the void by ${nm(killer)}`:`${nm(e)} fell out of the world`;
  if(cause==='shot')return `${was(e)} shot by ${nm(killer)}`;
  if(cause==='border')return `${was(e)} killed by the world border`;
  if(cause==='fall')return killer?`${was(e)} doomed to fall by ${nm(killer)}`:`${nm(e)} fell from a high place`;
  if(cause==='lava')return killer?`${nm(e)} tried to swim in lava to escape ${nm(killer)}`:`${nm(e)} tried to swim in lava`;
  if(cause==='fire')return `${nm(e)} burned to death`;
  if(cause==='starve')return `${nm(e)} starved to death`;
  if(cause==='magic')return killer?`${was(e)} killed by ${nm(killer)} using magic`:`${was(e)} killed by magic`;
  return killer?`${was(e)} slain by ${nm(killer)}`:`${nm(e)} died`;
}
function kill(e,src,cause){
  let killer=src||(e.lastAttackT<8?e.lastAttacker:null);if(killer===e)killer=null;
  const msg={id:e.id,k:killer?killer.id:null,c:cause,inv:e.inv.filter(Boolean),armor:e.armor.filter(Boolean),pos:e.pos.slice()};
  netSend(N.DEATH,msg);onDeath(msg);
}
function onDeath(m){
  const e=entById(m.id);if(!e||!e.alive)return;const killer=m.k?entById(m.k):null;
  e.alive=false;e.health=0;e.using=null;e.effects={};e.absorb=0;e.fire=0;
  e.place=ents.filter(x=>x.alive&&!x.spectator).length+1;if(e!==player)sfx('death',{pos:e.pos});
  if(killer)killer.kills++;
  feed.unshift({t:7,txt:deathText(e,killer,m.c)});if(feed.length>6)feed.pop();
  if(isHost()){for(const s of m.inv)hostSpawnDrop(m.pos,s.id,s.count);for(const a of m.armor)hostSpawnDrop(m.pos,a,1);}
  e.inv=new Array(9).fill(null);e.armor=[null,null,null,null];
  spawnParticles(e.pos[0],e.pos[1]+.8,e.pos[2],20,[.85,.85,.85],1.2,'poof');
  if(e===player){sfx('death');chestClose(false);player.bat=true;player.pos[1]+=2.2;player.vel=[0,0,0];spectate.mode='bat';showDeathPanel(killer);}
  if(e.kind==='player'&&e!==player)e.bat=true;
}

// ---------- melee ----------
function meleeTarget(e,range){
  const o=eye(e),d=fwd(e);const bh=raycastBlock(o,d,range);const maxT=bh?bh.t:range;let best=null,bt=maxT;
  for(const t of ents){if(t===e||!t.alive)continue;const b=entBox(t,.15);const tt=rayBox(o,d,b[0],b[1]);if(tt>=0&&tt<bt){bt=tt;best=t;}}
  return best;
}
function doAttack(e,target){
  if(e.atkCD>0)return;e.atkCD=e.isLocal?0:.12;e.swing=1;
  const t=target!==undefined?target:meleeTarget(e,3);if(!t)return;exhaust(e,.3);
  let dmg=weaponDmg(e);const crit=(e.fallDist||0)>0&&!e.onGround&&!onLadder(e)&&!e.inWater;if(crit){dmg*=1.5;spawnParticles(t.pos[0],t.pos[1]+1.2,t.pos[2],14,[1,1,1],4,'crit');}
  const held=e.inv[e.sel],hid=held&&held.id;const extra=(e.sprint?1:0)+enchLvl(hid,'knockback'),fa=enchLvl(hid,'fire_aspect');if(e.sprint){e.sprint=false;if(e.mot){e.mot[0]*=.6;e.mot[2]*=.6;}}
  if(e.effects.invis)delete e.effects.invis;
  damage(t,dmg,e,'melee',[t.pos[0]-e.pos[0],t.pos[2]-e.pos[2],extra,-Math.sin(e.yaw),-Math.cos(e.yaw)],false,fa?[['ignite',4*fa,0]]:undefined);
}

// ---------- projectiles (arrows, splash potions) ----------
function spawnProj(kind,pos,vel,owner,dmg,pot,net=true){projs.push({kind,pos,vel,owner,dmg,pot,age:0,stuck:false});if(net&&owner&&owned(owner))netSend(N.PROJ,{k:kind,p:pos,v:vel,o:owner.id,d:dmg,pot});}
const bowCharge=sec=>{const t=sec;return Math.min(1,(t*t+2*t)/3);};
function fireBow(e,f){if(f<.1)return;const ai=hasItem(e,'arrow');if(ai<0)return;const bs=e.inv[e.sel],inf=enchLvl(bs&&bs.id,'infinity');if(!inf)consume(e,ai);const d=fwd(e),o=eye(e);const g=()=>(Math.random()+Math.random()+Math.random()-1.5)*.0075*1.2;
  const v=[d[0]+g(),d[1]+g(),d[2]+g()];const L=Math.hypot(...v);const sp=f*3;
  spawnProj('arrow',[o[0]-Math.cos(e.yaw)*.16,o[1]-.1,o[2]+Math.sin(e.yaw)*.16],[v[0]/L*sp,v[1]/L*sp,v[2]/L*sp],e,f>=1?1:0);{const pr=projs[projs.length-1],bi=bs&&ITEMS[bs.id];if(bi&&bi.ench)pr.en=bi.ench;if(inf)pr.noPick=true;}sfx('bow',{pos:e.pos});}
function throwSplash(e,id){const p=e.pitch+20*Math.PI/180;const d=[-Math.sin(e.yaw)*Math.cos(p),Math.sin(p),-Math.cos(e.yaw)*Math.cos(p)],o=eye(e),sp=.5;spawnProj('splash',[o[0],o[1]-.1,o[2]],[d[0]*sp,d[1]*sp,d[2]*sp],e,0,id);sfx('bow',{pos:e.pos});}
function splashImpact(p){
  const it=ITEMS[p.pot];spawnParticles(p.pos[0],p.pos[1],p.pos[2],30,hexRGB(it.color),4);sfx('glass',{pos:p.pos});
  if(!owned(p.owner))return;
  for(const e of ents){if(!e.alive)continue;const d=dist(p.pos,[e.pos[0],e.pos[1]+1,e.pos[2]]);if(d>4.1)continue;const k=1-d/4.1*.75;
    const fx=it.fx.map(([n,dur,amp])=>n==='harm'?null:[n,Math.round(dur*k),amp]).filter(Boolean);
    const harm=it.fx.find(f=>f[0]==='harm');
    if(harm)damage(e,(6<<harm[2])*k,p.owner,'magic',null,true,fx);else damage(e,0,p.owner,'magic',null,true,fx);}
}
function updateProjs(dt){
  for(const a of projs){a.age+=dt;
    if(a.stuck){if(a.kind==='arrow'&&a.age>.5&&!a.noPick)for(const e of ents){if(!e.alive||!owned(e))continue;if(dist([e.pos[0],e.pos[1]+.9,e.pos[2]],a.pos)<1.4&&invRoom(e,'arrow')){addItem(e,'arrow',1);a.dead=true;if(e===player)sfx('pick');break;}}continue;}
    a.tacc=(a.tacc||0)+dt;if(a.en&&a.en.flame&&a.kind==='arrow'&&Math.random()<.6)spawnParticles(a.pos[0],a.pos[1],a.pos[2],1,[1,.5,.1],.5);
    while(a.tacc>=TICK&&!a.dead&&!a.stuck){a.tacc-=TICK;
      const sp=Math.hypot(...a.vel);const n=Math.max(1,Math.ceil(sp/.25));
      for(let i=0;i<n&&!a.dead;i++){
        for(let k=0;k<3;k++)a.pos[k]+=a.vel[k]/n;
        const b=getB(Math.floor(a.pos[0]),Math.floor(a.pos[1]),Math.floor(a.pos[2]));
        if(b&&BD[b].solid){if(a.kind==='splash'){splashImpact(a);a.dead=true;}else{a.stuck=true;a.age=0;sfx('arrowhit',{pos:a.pos});}break;}
        for(const e of ents){if(!e.alive||(e===a.owner&&a.age<.25))continue;const bb=entBox(e,.15);
          if(a.pos[0]>bb[0][0]&&a.pos[0]<bb[1][0]&&a.pos[1]>bb[0][1]&&a.pos[1]<bb[1][1]&&a.pos[2]>bb[0][2]&&a.pos[2]<bb[1][2]){
            if(a.kind==='splash')splashImpact(a);
            else if(owned(a.owner)){let dmg=Math.ceil(sp*2);if(a.dmg)dmg+=Math.floor(Math.random()*(dmg/2+2));const en=a.en||{};if(en.power)dmg+=en.power*.5+.5;
              const src=a.owner;damage(e,dmg,src,'shot',[a.vel[0],a.vel[2],en.punch||0,0,0],false,en.flame?[['ignite',5,0]]:undefined);sfx('arrowhit',{pos:a.pos});}
            a.dead=true;break;}}
      }
      if(a.dead||a.stuck)break;
      const inW=getB(Math.floor(a.pos[0]),Math.floor(a.pos[1]),Math.floor(a.pos[2]))===B.WATER;const drag=inW?(a.kind==='arrow'?.6:.8):.99;
      for(let k=0;k<3;k++)a.vel[k]*=drag;a.vel[1]-=a.kind==='arrow'?.05:.05;
    }}
  projs=projs.filter(a=>!a.dead&&a.age<60&&a.pos[1]>-20);
}
// ---------- dropped items (host is authoritative) ----------
var dropSeq=1;
function hostSpawnDrop(p,id,count,vel,by,rid){const d={did:dropSeq++,by,rid,pos:[p[0],p[1]+1,p[2]],vel:vel||[(Math.random()-.5)*4,4+Math.random()*2,(Math.random()-.5)*4],id,count,age:0,spin:Math.random()*6};drops.push(d);netSend(N.DROPADD,d);return d;}
let dropRid=0;
function requestDrop(p,id,count,vel){if(isHost()){hostSpawnDrop(p,id,count,vel);return;}const rid=++dropRid;
  drops.push({did:-rid,ghost:4,pos:[p[0],p[1]+1,p[2]],vel:vel?vel.slice():[(Math.random()-.5)*4,4+Math.random()*2,(Math.random()-.5)*4],id,count,age:0,spin:Math.random()*6,pending:99});   // stand-in until the host's copy arrives
  netSend(N.DROPREQ,{p,id,c:count,v:vel,rid},'host');}
function updateDrops(dt){
  for(const d of drops){
    d.age+=dt;d.spin+=dt*2;d.vel[1]-=G*.7*dt;const ny=d.pos[1]+d.vel[1]*dt;
    if(d.vel[1]<0&&solid(Math.floor(d.pos[0]),Math.floor(ny-.15),Math.floor(d.pos[2]))){d.pos[1]=Math.floor(ny-.15)+1.15;d.vel[1]=0;d.vel[0]*=.5;d.vel[2]*=.5;}else d.pos[1]=ny;
    if(fluidAt(d.pos[0],d.pos[1],d.pos[2])==='lava'&&isHost()){d.dead=true;netSend(N.DROPDEL,{did:d.did});}
    for(const k of [0,2]){const nx=d.pos[k]+d.vel[k]*dt;const t=d.pos.slice();t[k]=nx;if(!solid(Math.floor(t[0]),Math.floor(t[1]),Math.floor(t[2])))d.pos[k]=nx;else d.vel[k]=0;d.vel[k]*=Math.exp(-2*dt);}
    if(d.age>.6&&!d.pending&&!d.dead)for(const e of ents){if(!e.alive||!owned(e))continue;if(hdist(e.pos,d.pos)<1.3&&Math.abs(e.pos[1]+.8-d.pos[1])<1.6){
      if(isHost()){const left=addItem(e,d.id,d.count);if(left<d.count){if(e===player)sfx('pick');d.count=left;if(!left){d.dead=true;netSend(N.DROPDEL,{did:d.did});break;}}}
      else if(e===player&&d.did>0&&invRoom(e,d.id)){const left=addItem(e,d.id,d.count),took=d.count-left;if(took>0){sfx('pick');netSend(N.PICK,{did:d.did,id:d.id,n:took},'host');d.count=left;if(!left)d.dead=true;else d.pending=1;}}}}   // picked up at once; the host confirms or takes it back
    if(d.pending){d.pending-=dt;if(d.pending<=0)d.pending=0;}
    if(d.ghost){d.ghost-=dt;if(d.ghost<=0)d.dead=true;}
  }
  drops=drops.filter(d=>!d.dead&&d.pos[1]>-20&&d.age<300);
}
function invRoom(e,id){const it=ITEMS[id];if(it.type==='armor')return true;if(e.inv.some(s=>!s))return true;return it.stack>1&&e.inv.some(s=>s&&s.id===id&&s.count<it.stack);}

// ---------- particles ----------
// particles are textured billboards like vanilla: kind 'poof' (generic smoke), 'crit', 'magic', or a block id (digging chips); others are tinted generic
function spawnParticles(x,y,z,n,col,sp,kind){n=Math.ceil(n*[.2,.5,1][OPT.particles]);for(let i=0;i<n;i++){const life=kind==='crit'||kind==='magic'?.6+Math.random()*.4:typeof kind==='number'?.5+Math.random()*1:.4+Math.random()*.5;
    particles.push({p:[x,y,z],v:[(Math.random()-.5)*sp,Math.random()*sp,(Math.random()-.5)*sp],t:life,t0:life,col,kind,sz:typeof kind==='number'?.1+Math.random()*.08:kind==='crit'||kind==='magic'?.12:.12+Math.random()*.1,q:Math.random()*4|0,
      g:typeof kind==='number'?16:kind==='crit'||kind==='magic'?2:kind==='poof'?-1.5:9});}
  if(particles.length>700)particles.splice(0,particles.length-700);}
function blockParticles(x,y,z,b,n){if(!b||!BD[b])return;n=Math.ceil(n*[.2,.5,1][OPT.particles]);for(let i=0;i<n;i++){const life=.5+Math.random();
  particles.push({p:[x+Math.random(),y+Math.random(),z+Math.random()],v:[(Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3],t:life,t0:life,kind:b,sz:.1+Math.random()*.06,q:Math.random()*4|0,g:16});}}
function updateParticles(dt){for(const p of particles){p.t-=dt;p.v[1]-=p.g*dt;const drag=Math.pow(.98,dt*20);for(let k=0;k<3;k++){p.v[k]*=drag;p.p[k]+=p.v[k]*dt;}
    if(typeof p.kind==='number'){const b=getB(Math.floor(p.p[0]),Math.floor(p.p[1]),Math.floor(p.p[2]));if(b&&BD[b].solid){p.p[1]=Math.floor(p.p[1])+1.01;p.v[1]=0;p.v[0]*=.7;p.v[2]*=.7;}}}
  particles=particles.filter(p=>p.t>0);}
