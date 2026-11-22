// ================= bots (run on the host) =================
const DIFF=[{acc:.45,react:.55,aggro:6,bow:.15,pot:.2},{acc:.65,react:.8,aggro:10,bow:.35,pot:.4},{acc:.8,react:1,aggro:14,bow:.55,pot:.6},{acc:.92,react:1.25,aggro:18,bow:.7,pot:.8}];
function newAI(){return {goal:null,target:null,think:Math.random()*.3,mode:'loot',stuckT:0,lastPos:[0,0,0],strafe:Math.random()<.5?1:-1,strafeT:0,lootT:0,wanderT:0,gatherT:0,chest:null};}
const blockCount=e=>e.inv.reduce((n,s)=>n+(s&&ITEMS[s.id].type==='block'?s.count:0),0);
function nearestChest(b){let best=null,bd=1e9;const nb=blockCount(b);
  for(const c of chests.values()){if(!c.items.some(Boolean))continue;if(c.claim&&c.claim!==b&&c.claim.alive&&c.claimT>0)continue;if(c.skipFor===b&&c.skipT>MATCH.gameT)continue;
    const ground=surf(c.x,c.z);const need=c.y-ground-1;if(MATCH.mode==='br'){if(need>1&&nb<need)continue;if(!inZone([c.x,0,c.z],true,.9))continue;}else if(!c.center&&(c.y-b.pos[1]>2.5||b.pos[1]-c.y>6))continue; // no pathfinding: leave chests up on ledges/boardwalks to the players
    const d=dist(b.pos,[c.x+.5,c.y,c.z+.5]);if(d<bd){bd=d;best=c;}}
  return bd<(MATCH.mode==='br'?100:70)?best:null;}
function groundAhead(x,y,z,maxD=5){for(let i=0;i<maxD;i++){const b=getB(Math.floor(x),Math.floor(y)-1-i,Math.floor(z));if(b===B.LAVA)return false;if(b&&BD[b].solid)return true;if(b===B.WATER)return true;}return false;}
function bestWeapon(b){let bd=0,best=-1;b.inv.forEach((s,i)=>{if(s&&ITEMS[s.id].type==='weapon'&&ITEMS[s.id].dmg>bd){bd=ITEMS[s.id].dmg;best=i;}});return [best,bd];}
function botThink(b){
  const ai=b.ai,D=DIFF[SET.difficulty|0];const [best,bd]=bestWeapon(b);if(!b.using)b.sel=best>=0?best:b.sel;
  // heal: potions first, then food
  if(!b.using){
    if(b.health<9){const pi=b.inv.findIndex(s=>s&&(s.id==='potion_healing'||s.id==='potion_regeneration'));if(pi>=0&&Math.random()<D.pot+.3){b.sel=pi;b.using='drink';b.useT=0;return;}}
    const fi=b.inv.findIndex(s=>s&&ITEMS[s.id].type==='food');
    if(fi>=0&&(b.food<14||(b.health<12&&b.food<20))&&(!ai.target||!ai.target.alive||dist(b.pos,ai.target.pos)>6||b.health<5)){b.sel=fi;b.using='eat';b.useT=0;return;}
    for(const k of ['potion_swiftness','potion_strength','potion_fire_resistance'])if(!b.effects[k.split('_')[1]]){const pi=hasItem(b,k);if(pi>=0&&Math.random()<.3){b.sel=pi;b.using='drink';b.useT=0;return;}}
  }
  let enemy=null,ed=1e9;const range=(bd>0?D.aggro:D.aggro*.45)+(MATCH.showdown?14:0)+(suddenDeath?10:0)+armorPts(b)*.4;
  if(!inGrace())for(const o of ents){if(o===b||!o.alive)continue;const d=dist(b.pos,o.pos);const inv=o.effects.invis&&d>4;if(!inv&&d<ed&&d<range&&los(eye(b),eye(o))){ed=d;enemy=o;}}
  if(b.lastAttacker&&b.lastAttacker.alive&&b.lastAttackT<5&&dist(b.pos,b.lastAttacker.pos)<20){enemy=b.lastAttacker;ed=dist(b.pos,enemy.pos);}
  ai.target=enemy;
  const outside=MATCH.mode==='br'&&!inZone(b.pos,true,.85);
  if(outside&&(!enemy||ed>4)){const [zx,zz]=zoneCenter();const r=Math.min(3,zoneHalf()*.5);ai.mode='center';ai.goal=[zx+(Math.random()-.5)*2*r,0,zz+(Math.random()-.5)*2*r];return;}
  if(enemy){ai.mode='fight';ai.goal=enemy.pos;
    const bi=hasItem(b,'bow'),ar=hasItem(b,'arrow');if(bi>=0&&ar>=0&&ed>7&&ed<26&&!b.using&&Math.random()<D.bow){b.sel=bi;b.using='bow';b.useT=0;ai.bowT=.7+Math.random()*.4;return;}
    const si=b.inv.findIndex(s=>s&&ITEMS[s.id].type==='splash'&&s.id!=='splash_healing');if(si>=0&&ed>3&&ed<9&&Math.random()<D.pot*.5){b.sel=si;aimAt(b,enemy,10);throwSplash(b,b.inv[si].id);consume(b,si);b.swing=1;return;}
    return;}
  let dropT=null,dd=12;for(const d of drops){const x=dist(b.pos,d.pos);if(x<dd&&d.age>0&&!d.dead){dd=x;dropT=d;}}
  if(dropT){ai.mode='drop';ai.goal=dropT.pos;return;}
  const c=nearestChest(b);if(c){ai.mode='loot';ai.goal=[c.x+.5,c.y,c.z+.5];ai.chest=c;c.claim=b;c.claimT=3;return;}
  ai.mode='wander';
  if(!ai.goal||ai.wanderT<=0||hdist(b.pos,ai.goal)<2){const [zx,zz]=MATCH.mode==='br'?zoneCenter():[CX,CZ];const r=MATCH.mode==='br'?zoneHalf()*.7:18;ai.goal=[zx+(Math.random()*2-1)*r,0,zz+(Math.random()*2-1)*r];ai.wanderT=6;}
}
function aimAt(b,t,speed){const d=dist(b.pos,t.pos),ts=d/speed;const lead=[t.pos[0]+t.vel[0]*ts,t.pos[1]+1.2+.5*20*ts*ts,t.pos[2]+t.vel[2]*ts];
  const dx=lead[0]-b.pos[0],dy=lead[1]-(b.pos[1]+EYE),dz=lead[2]-b.pos[2];b.yaw=Math.atan2(-dx,-dz);b.pitch=Math.atan2(dy,Math.hypot(dx,dz));
  const err=(1-DIFF[SET.difficulty|0].acc)*.12;b.yaw+=(Math.random()-.5)*err;b.pitch+=(Math.random()-.5)*err;}
function updateBot(b,dt){
  const ai=b.ai,D=DIFF[SET.difficulty|0];ai.think-=dt;ai.wanderT-=dt;ai.strafeT-=dt;
  if(ai.think<=0&&MATCH.state==='play'&&!(MATCH.preT>0)){ai.think=.25+Math.random()*.2/D.react;botThink(b);}
  let wx=0,wz=0,speed=4.3*speedMul(b);b.sprint=false;b.jump=false;
  if(MATCH.state==='play'&&!(MATCH.preT>0)){
    const t=ai.target;
    if(b.using==='eat'||b.using==='drink'){b.useT+=dt;const s=b.inv[b.sel];const it=s&&ITEMS[s.id];
      if(!it||(b.using==='eat'&&it.type!=='food')||(b.using==='drink'&&it.type!=='potion'))b.using=null;
      else if(b.useT>=1.6){if(it.type==='food')eatFood(b,s.id);else for(const f of it.fx)giveEffect(b,...f);consume(b,b.sel);b.using=null;}
      if(t&&t.alive){const dx=b.pos[0]-t.pos[0],dz=b.pos[2]-t.pos[2],l=Math.hypot(dx,dz)||1;wx=dx/l;wz=dz/l;}}
    else if(b.using==='bow'){b.useT+=dt;if(!t||!t.alive)b.using=null;else{aimAt(b,t,58);if(b.useT>=ai.bowT){fireBow(b,bowCharge(b.useT));b.using=null;ai.think=.4;}}}
    else if(ai.goal){
      const g=ai.goal;let dx=g[0]-b.pos[0],dz=g[2]-b.pos[2];const hd=Math.hypot(dx,dz);const want=Math.atan2(-dx,-dz);
      if(ai.mode==='fight'&&t&&t.alive){
        const d3=dist(b.pos,t.pos);b.pitch=Math.atan2(t.pos[1]-b.pos[1],hd);
        if(hd>2.2){wx=dx/hd;wz=dz/hd;b.sprint=hd>4&&b.food>6;speed*=b.sprint?1.3:1;}
        else{if(ai.strafeT<=0){ai.strafe=Math.random()<.5?1:-1;ai.strafeT=.6+Math.random();}const r=[Math.cos(b.yaw),-Math.sin(b.yaw)];wx=r[0]*ai.strafe*.7+(hd<1.4?-dx/hd*.6:0);wz=r[1]*ai.strafe*.7+(hd<1.4?-dz/hd*.6:0);}
        if(d3<3.1&&b.atkCD<=0&&Math.random()<D.react*dt*9){if(Math.random()<D.acc&&los(eye(b),[t.pos[0],t.pos[1]+1,t.pos[2]]))doAttack(b,t);else{b.atkCD=.25;b.swing=1;}
          if(t.onGround===false&&Math.random()<.3&&b.onGround)b.jump=true;}
        if((SET.difficulty|0)>=2&&b.onGround&&hd<3.5&&hd>1.5&&Math.random()<dt*1.5)b.jump=true;
      }else if(hd>.9){wx=dx/hd;wz=dz/hd;b.sprint=hd>10&&b.food>6;speed*=b.sprint?1.3:1;b.pitch*=.9;}
      let dy=want-b.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;b.yaw+=dy*Math.min(1,dt*10);
      if(ai.mode==='loot'&&ai.chest&&hd<2.5&&ai.chest.y-b.pos[1]>1.2&&MATCH.mode==='br'&&blockCount(b)>0){wx=0;wz=0;if(b.onGround)b.jump=true;
        else{const fx=Math.floor(b.pos[0]),fz=Math.floor(b.pos[2]),fy=Math.floor(b.pos[1]);if(b.pos[1]-fy<.45&&b.vel[1]<3.5&&!getB(fx,fy-1,fz)){const bi=b.inv.findIndex(x=>x&&ITEMS[x.id].type==='block');if(bi>=0&&placeBlock(fx,fy-1,fz,ITEMS[b.inv[bi].id].block)){consume(b,bi);b.swing=1;}}}ai.stuckT=0;}
      if(ai.mode==='loot'&&ai.chest&&dist(b.pos,ai.goal)<2.6){ai.lootT+=dt;ai.chest.botOpen=1.2;if(ai.lootT>.7){ai.lootT=0;hostChestOp(key(ai.chest.x,ai.chest.y,ai.chest.z),'all',0,b);ai.goal=null;ai.think=0;}}
    }
    if(MATCH.mode==='br'&&(ai.mode==='wander'||ai.mode==='loot')){ai.gatherT+=dt;if(ai.gatherT>2.5){ai.gatherT=0;if(blockCount(b)<20)addItem(b,'b2',1);}}
    if(b.onGround&&(wx||wz)){const ax=b.pos[0]+wx*.8,az=b.pos[2]+wz*.8;if(!groundAhead(ax,b.pos[1]+.5,az,MATCH.mode==='br'?(b.health>12?9:5):5)){wx=0;wz=0;if(ai.mode==='wander'||ai.mode==='loot'||ai.mode==='drop'){ai.goal=null;ai.wanderT=0;ai.think=0;if(ai.chest)ai.chest.claim=null;}}}
    if((b.collidedH&&(wx||wz))||b.inWater||b.inLava)b.jump=true;
    ai.stuckT+=dt;if(ai.stuckT>2.5){if(hdist(b.pos,ai.lastPos)<.8&&(wx||wz)){ai.goal=null;ai.wanderT=0;ai.think=0;if(ai.chest){ai.chest.claim=null;ai.chest.skipFor=b;ai.chest.skipT=MATCH.gameT+20;}}ai.stuckT=0;ai.lastPos=b.pos.slice();}
    if(b.using)speed=1.4;
  }
  const moved=physics(b,dt,wx,wz);
  tickOwned(b,dt,moved);
}
