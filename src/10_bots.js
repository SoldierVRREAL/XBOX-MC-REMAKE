// ================= bots (run on the host) =================
const DIFF=[{acc:.45,react:.55,aggro:6,bow:.15,pot:.2},{acc:.65,react:.8,aggro:10,bow:.35,pot:.4},{acc:.8,react:1,aggro:14,bow:.55,pot:.6},{acc:.92,react:1.25,aggro:18,bow:.7,pot:.8}];
function newAI(){return {goal:null,target:null,think:Math.random()*.3,mode:'loot',stuckT:0,lastPos:[0,0,0],strafe:Math.random()<.5?1:-1,strafeT:0,lootT:0,wanderT:0,gatherT:0,chest:null,path:null,pathTo:null,pathT:0,skip:new Map(),ignore:new Map(),detour:null,hunt:null,dropDid:null,dropT0:0};}
const blockCount=e=>e.inv.reduce((n,s)=>n+(s&&ITEMS[s.id].type==='block'?s.count:0),0);
function nearestChest(b){let best=null,bd=1e9;const nb=blockCount(b);
  for(const c of chests.values()){if(!c.items.some(s=>s&&botWants(b,s.id)))continue;   // only chests with something it wants and has room forif(c.claim&&c.claim!==b&&c.claim.alive&&c.claimT>0)continue;if(c.skipFor===b&&c.skipT>MATCH.gameT)continue;
    const ground=surf(c.x,c.z);const need=c.y-ground-1;if(MATCH.mode==='br'){if(need>1&&nb<need)continue;if(!inZone([c.x,0,c.z],true,.9))continue;}else if(!c.center&&(c.y-b.pos[1]>2.5||b.pos[1]-c.y>6))continue; // no pathfinding: leave chests up on ledges/boardwalks to the players
    const d=dist(b.pos,[c.x+.5,c.y,c.z+.5]);if(d<bd){bd=d;best=c;}}
  return bd<(MATCH.mode==='br'?100:70)?best:null;}
function groundAhead(x,y,z,maxD=5){for(let i=0;i<maxD;i++){const b=getB(Math.floor(x),Math.floor(y)-1-i,Math.floor(z));if(b===B.LAVA)return false;if(b&&BD[b].solid)return true;if(b===B.WATER)return true;}return false;}
const wpnVal=id=>ITEMS[id].dmg+1.25*enchLvl(id,'sharpness');
function bestWeapon(b){let bd=0,best=-1;b.inv.forEach((s,i)=>{if(s&&ITEMS[s.id].type==='weapon'&&wpnVal(s.id)>bd){bd=wpnVal(s.id);best=i;}});return [best,bd];}
// a player keeps one good weapon, one bow, arrows, food and potions; bots throw away worse weapons and spare armour so they always have room to pick things up
function botTidy(b){const [best]=bestWeapon(b);let bow=-1,bv=-1;b.inv.forEach((s,i)=>{if(s&&ITEMS[s.id].type==='bow'&&enchScore(s.id)>bv){bv=enchScore(s.id);bow=i;}});
  for(let i=0;i<9;i++){const s=b.inv[i];if(!s)continue;const it=ITEMS[s.id];
    if(it.type==='weapon'&&i!==best)b.inv[i]=null;else if(it.type==='bow'&&i!==bow)b.inv[i]=null;else if(it.type==='block'&&MATCH.mode!=='br')b.inv[i]=null;
    else if(it.type==='armor'){const cur=b.armor[it.slot];if(!cur||ITEMS[cur].pts<it.pts||(ITEMS[cur].pts===it.pts&&enchScore(s.id)>enchScore(cur)))b.armor[it.slot]=s.id;b.inv[i]=null;}}}
// is a dropped item worth walking to?
function botWants(b,id){const it=ITEMS[id];if(!it||!invRoom(b,id))return false;
  if(it.type==='weapon')return wpnVal(id)>bestWeapon(b)[1];
  if(it.type==='armor'){const cur=b.armor[it.slot];return !cur||ITEMS[cur].pts<it.pts||(ITEMS[cur].pts===it.pts&&enchScore(id)>enchScore(cur));}
  if(it.type==='bow')return !b.inv.some(s=>s&&ITEMS[s.id].type==='bow');
  if(it.type==='block')return MATCH.mode==='br'&&blockCount(b)<32;
  return true;}
// something is in the way: walk off somewhere else for a few seconds, then try again
// ---------- pathfinding: A* over the cells a player could stand in (walk, step up a block, drop up to 3, climb ladders) ----------
const pfColH=v=>{const D=BD[v];if(!D.col)return D.solid?1:0;let h=0;for(const c of D.col)h=Math.max(h,c[4]);return h;};
const pfPass=v=>!v||!BD[v].solid&&BD[v].liquid!=='lava'||BD[v].ladder||(!BD[v].fence&&pfColH(v)<=.2);   // can a body stand in this block?
const pfFloor=v=>!!v&&BD[v].solid&&!BD[v].fence&&!BD[v].ladder&&v!==B.BARRIER&&pfColH(v)>.2;           // can you stand on top of it?
function pfStand(x,y,z){if(x<0||z<0||x>=WX||z>=WZ||y<1||y>=WY-2)return false;const f=getB(x,y,z);if(!pfPass(f)||!pfPass(getB(x,y+1,z)))return false;
  if(f&&BD[f].ladder)return true;const u=getB(x,y-1,z);return pfFloor(u)||(!!u&&BD[u].liquid==='water');}
function pfStart(p){const x=Math.floor(p[0]),z=Math.floor(p[2]);let y=Math.floor(p[1]+.01);for(const dy of [0,1,-1,2])if(pfStand(x,y+dy,z))return [x,y+dy,z];return null;}
let PF=null;   // search scratch arrays, reused between searches (no garbage = no pauses on the host)
function findPath(from,to,maxN=3000,budgetMs=3){const tEnd=performance.now()+budgetMs;let cut=false;findPath.partial=false;
  const s=pfStart(from),t=pfStart(to)||[Math.floor(to[0]),Math.floor(to[1]+.01),Math.floor(to[2])];if(!s)return null;
  const NN=WX*WY*WZ;if(!PF||PF.n!==NN)PF={n:NN,gen:new Uint16Array(NN),g:new Float32Array(NN),came:new Int32Array(NN),st:0};if(++PF.st>65000){PF.gen.fill(0);PF.st=1;}
  const ST=PF.st,GEN=PF.gen,G=PF.g,CAME=PF.came,K=(x,y,z)=>(y*WZ+z)*WX+x,h=(x,y,z)=>Math.abs(x-t[0])+Math.abs(z-t[2])+Math.abs(y-t[1])*1.5,open=[];
  const push=nd=>{open.push(nd);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p].f<=nd.f)break;open[i]=open[p];i=p;}open[i]=nd;};
  const pop=()=>{const top=open[0],last=open.pop();if(open.length){let i=0;for(;;){let l=i*2+1,r=l+1,m=i;if(l<open.length&&open[l].f<open[m].f)m=l;if(r<open.length&&open[r].f<open[m].f)m=r;if(m===i)break;open[i]=open[m];i=m;}open[i]=last;}return top;};
  const sk=K(...s);GEN[sk]=ST;G[sk]=0;CAME[sk]=-1;push({x:s[0],y:s[1],z:s[2],g:0,f:h(...s)});let n=0,best=null,bh=1e9;
  while(open.length){if(n++>=maxN||((n&31)===0&&performance.now()>tEnd)){cut=true;break;}const c=pop();const ck=K(c.x,c.y,c.z);if(c.g>G[ck]+1e-6)continue;   // stale queue entry
    const hh=h(c.x,c.y,c.z);if(hh<bh){bh=hh;best=c;}
    if(Math.abs(c.x-t[0])<=1&&Math.abs(c.z-t[2])<=1&&Math.abs(c.y-t[1])<=1){best=c;bh=0;break;}
    const nb=[];const cb=getB(c.x,c.y,c.z),lad=!!cb&&!!BD[cb].ladder;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,z=c.z+dz;
      if(pfStand(x,c.y,z)){nb.push(x,c.y,z,1);continue;}
      if(pfStand(x,c.y+1,z)&&pfPass(getB(c.x,c.y+2,c.z))){nb.push(x,c.y+1,z,2);continue;}                  // step / jump up one
      if(pfPass(getB(x,c.y,z))&&pfPass(getB(x,c.y+1,z)))for(let d=1;d<=3;d++){if(pfStand(x,c.y-d,z)){nb.push(x,c.y-d,z,1+d*.6);break;}if(!pfPass(getB(x,c.y-d,z)))break;}}  // drop
    if(lad&&pfStand(c.x,c.y+1,c.z))nb.push(c.x,c.y+1,c.z,1.5);
    const bb=getB(c.x,c.y-1,c.z);if(bb&&BD[bb].ladder&&pfStand(c.x,c.y-1,c.z))nb.push(c.x,c.y-1,c.z,1.2);
    for(let q=0;q<nb.length;q+=4){const x=nb[q],y=nb[q+1],z=nb[q+2],k=K(x,y,z),ng=c.g+nb[q+3];if(GEN[k]!==ST||ng<G[k]){GEN[k]=ST;G[k]=ng;CAME[k]=ck;push({x,y,z,g:ng,f:ng+h(x,y,z)});}}}
  if(!best)return null;
  if(bh>2.5){if(!cut||bh>h(...s)-4)return null;findPath.partial=true;}   // ran out of time: a route that gets well on the way is still worth walking, then plan again
  const out=[];let k=K(best.x,best.y,best.z);while(k!==sk&&k>=0){const x=k%WX,r=(k-x)/WX,z=r%WZ,y=(r-z)/WZ;out.push([x,y,z]);k=CAME[k];}
  return out.reverse();}
// follow the current path: returns the point to walk at (and sets jump / ladder climbing), or null to walk straight at the goal
function botWaypoint(b){const ai=b.ai;if(!ai.path||!ai.path.length)return null;
  const fy=Math.floor(b.pos[1]+.01);let wp=ai.path[0];
  while(wp&&Math.hypot(wp[0]+.5-b.pos[0],wp[2]+.5-b.pos[2])<.5&&Math.abs(wp[1]-fy)<=1&&!(wp[1]>fy&&onLadder(b))){ai.path.shift();wp=ai.path[0];}
  if(wp&&wp[1]===fy+1&&onLadder(b)&&Math.hypot(wp[0]+.5-b.pos[0],wp[2]+.5-b.pos[2])<.6&&b.pos[1]-fy>.6){ai.path.shift();wp=ai.path[0];}
  if(!wp){ai.path=null;return null;}
  if(wp[1]>fy){if(onLadder(b)){for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=getB(Math.floor(b.pos[0])+dx,fy,Math.floor(b.pos[2])+dz);if(v&&BD[v].solid&&!BD[v].ladder)return [b.pos[0]+dx,0,b.pos[2]+dz];}}   // push into the wall behind the ladder to climb
    else if(Math.hypot(wp[0]+.5-b.pos[0],wp[2]+.5-b.pos[2])<1.4&&b.onGround)b.jump=true;}
  return [wp[0]+.5,wp[1],wp[2]+.5];}
// (re)plan towards a point now and then; a failed plan just means walking straight at it like before
function botPlan(b,to){const ai=b.ai,now=MATCH.gameT;if(hdist(b.pos,to)<2.2&&Math.abs(to[1]-b.pos[1])<1.5){ai.path=null;return;}
  if(ai.pathTo&&now<ai.pathT&&hdist(ai.pathTo,to)<2.5&&Math.abs(ai.pathTo[1]-to[1])<1.5)return;   // also remembers a failed search for a while
  if(botPlan.frame===now)return;botPlan.frame=now;   // at most one search per game frame, so bots never hold up the host
  ai.path=findPath(b.pos,to);ai.pathTo=[to[0],to[1],to[2]];ai.pathT=now+(ai.path?(findPath.partial?.7:1.5):3)+Math.random()*.5;}
// how far can it walk in direction a without hitting a wall it can't step over or a drop it won't take (no pathfinding, so it feels its way like this)
// (returns the distance, and whether a wall rather than a drop stopped it)
function walkLen(b,a,maxD){const sol=v=>v&&(BD[v].solid||v===B.BARRIER);const drop=MATCH.mode==='br'?(b.health>12?9:5):5;let y=Math.floor(b.pos[1]+.01),n=0;
  for(let i=1;i<=maxD;i++){const fx=Math.floor(b.pos[0]+Math.cos(a)*i),fz=Math.floor(b.pos[2]+Math.sin(a)*i);
    if(sol(getB(fx,y+1,fz))||sol(getB(fx,y+2,fz))){walkLen.wall=true;return n;}if(sol(getB(fx,y,fz))){y++;n=i;continue;}
    let k=0;while(k<drop&&!sol(getB(fx,y-1,fz))){const v=getB(fx,y-1,fz);if(v===B.LAVA||v===B.WATER)break;y--;k++;}if(k>=drop||getB(fx,y-1,fz)===B.LAVA){walkLen.wall=false;return n;}n=i;}
  walkLen.wall=false;return n;}
// pick an open direction (leaning towards whoever it is hunting) and walk that way for a few seconds
function botDetour(b){const ai=b.ai;const aim=ai.hunt&&ai.hunt.who&&ai.hunt.who.alive?ai.hunt.who.pos:null;let best=null,bs=-1e9,walls=0;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+Math.random()*.3,L=walkLen(b,a,10);if(walkLen.wall)walls++;if(L<3)continue;const end=[b.pos[0]+Math.cos(a)*L,0,b.pos[2]+Math.sin(a)*L];
    const sc=L+Math.random()*4-(aim?hdist(end,aim)*.25:0);if(sc>bs){bs=sc;best=end;}}
  if(!best){const a=Math.random()*Math.PI*2;best=[b.pos[0]+Math.cos(a)*4,0,b.pos[2]+Math.sin(a)*4];if(MATCH.mode==='br'&&blockCount(b)>0&&walls>=9)ai.escape=MATCH.gameT+2.5;}   // walled in on (nearly) every side: tower up out of the hole
  ai.detour={until:MATCH.gameT+2.5+Math.random()*1.5,at:best};}
function botThink(b){
  const ai=b.ai,D=DIFF[SET.difficulty|0];if(!b.using)botTidy(b);const [best,bd]=bestWeapon(b);if(!b.using)b.sel=best>=0?best:b.sel;const now=MATCH.gameT;
  // heal: potions first, then food
  if(!b.using){
    if(b.health<9){const pi=b.inv.findIndex(s=>s&&(s.id==='potion_healing'||s.id==='potion_regeneration'));if(pi>=0&&Math.random()<D.pot+.3){b.sel=pi;b.using='drink';b.useT=0;return;}}
    const fi=b.inv.findIndex(s=>s&&ITEMS[s.id].type==='food');
    if(fi>=0&&(b.food<14||(b.health<12&&b.food<20))&&(!ai.target||!ai.target.alive||dist(b.pos,ai.target.pos)>6||b.health<5)){b.sel=fi;b.using='eat';b.useT=0;return;}
    for(const k of ['potion_swiftness','potion_strength','potion_fire_resistance'])if(!b.effects[k.split('_')[1]]){const pi=hasItem(b,k);if(pi>=0&&Math.random()<.3){b.sel=pi;b.using='drink';b.useT=0;return;}}
  }
  let enemy=null,ed=1e9;const range=(bd>0?D.aggro:D.aggro*.45)+(MATCH.showdown?14:0)+(suddenDeath?10:0)+armorPts(b)*.4;
  if(!inGrace())for(const o of ents){if(o===b||!o.alive||(ai.ignore.get(o)||0)>now)continue;const d=dist(b.pos,o.pos);const inv=o.effects.invis&&d>4;if(!inv&&d<ed&&d<range&&los(eye(b),eye(o))){ed=d;enemy=o;}}
  if(b.lastAttacker&&b.lastAttacker.alive&&b.lastAttackT<5&&dist(b.pos,b.lastAttacker.pos)<((ai.ignore.get(b.lastAttacker)||0)>now?4:20)){enemy=b.lastAttacker;ed=dist(b.pos,enemy.pos);}
  ai.target=enemy;
  const outside=MATCH.mode==='br'&&!inZone(b.pos,true,.85);
  if(!enemy&&ai.detour&&now<ai.detour.until){ai.mode='wander';ai.goal=ai.detour.at;return;}   // finish walking round whatever blocked it first
  if(outside&&(!enemy||ed>4)){const [zx,zz]=zoneCenter();const r=Math.min(3,zoneHalf()*.5);ai.mode='center';ai.goal=[zx+(Math.random()-.5)*2*r,0,zz+(Math.random()-.5)*2*r];return;}
  if(enemy){ai.mode='fight';ai.goal=enemy.pos;
    const bi=b.inv.findIndex(s=>s&&ITEMS[s.id].type==='bow'),ar=hasItem(b,'arrow');
    if(ai.ledgeT&&now-ai.ledgeT<1&&ed>3){if(bi>=0&&ar>=0&&ed<30&&!b.using){b.sel=bi;b.using='bow';b.useT=0;ai.bowT=.7+Math.random()*.4;return;}
      ai.ignore.set(enemy,now+6);ai.target=null;botDetour(b);ai.mode='wander';ai.goal=ai.detour.at;return;}
    const high=Math.abs(enemy.pos[1]-b.pos[1])>2.5&&ed>4;   // up on a ledge / down below: shoot rather than run at the wall
    if(bi>=0&&ar>=0&&!b.using&&((high&&ed<28)||(ed>7&&ed<26&&Math.random()<D.bow))){b.sel=bi;b.using='bow';b.useT=0;ai.bowT=.7+Math.random()*.4;return;}
    const si=b.inv.findIndex(s=>s&&ITEMS[s.id].type==='splash'&&s.id!=='splash_healing');if(si>=0&&ed>3&&ed<9&&Math.random()<D.pot*.5){b.sel=si;aimAt(b,enemy,10);throwSplash(b,b.inv[si].id);consume(b,si);b.swing=1;return;}
    return;}
  // dropped items: only ones it wants and has room for, at about its own height; give up after a few seconds
  let dropT=null,dd=12;for(const d of drops){if(d.dead||!(d.age>0)||(ai.skip.get(d.did)||0)>now||Math.abs(d.pos[1]-b.pos[1])>2.5||!botWants(b,d.id))continue;const x=dist(b.pos,d.pos);if(x<dd){dd=x;dropT=d;}}
  if(dropT){if(ai.dropDid!==dropT.did){ai.dropDid=dropT.did;ai.dropT0=now;}
    if(now-ai.dropT0<6){ai.mode='drop';ai.goal=dropT.pos;return;}ai.skip.set(dropT.did,now+30);ai.dropDid=null;}
  // once it has a weapon and some armour it goes hunting instead of trekking to far-off chests (still grabs ones close by)
  const geared=bd>=6&&armorPts(b)>=5&&!inGrace();
  const c=nearestChest(b);if(c&&(!geared||dist(b.pos,[c.x+.5,c.y,c.z+.5])<10)){if(ai.chest!==c)ai.lootT=0;ai.mode='loot';ai.goal=[c.x+.5,c.y,c.z+.5];ai.chest=c;c.claim=b;c.claimT=3;return;}
  if(!inGrace()){let prey=null,pd=1e9;for(const o of ents){if(o===b||!o.alive||o.spectator||(ai.ignore.get(o)||0)>now)continue;if(MATCH.mode==='br'&&!inZone(o.pos,false))continue;const d=dist(b.pos,o.pos);if(d<pd){pd=d;prey=o;}}
    if(prey){if(!ai.hunt||ai.hunt.who!==prey||now>ai.hunt.until){const j=Math.min(4,pd*.15);ai.hunt={who:prey,until:now+2+Math.random()*1.5,at:[prey.pos[0]+(Math.random()*2-1)*j,prey.pos[1],prey.pos[2]+(Math.random()*2-1)*j]};}
      ai.mode='hunt';ai.goal=ai.hunt.at;return;}}   // heads for roughly where they are and refreshes every few seconds; the fight starts once it can see them
  ai.mode='wander';
  if(!ai.goal||ai.wanderT<=0||hdist(b.pos,ai.goal)<2){const [zx,zz]=MATCH.mode==='br'?zoneCenter():[CX,CZ];const r=MATCH.mode==='br'?zoneHalf()*.7:18;ai.goal=[zx+(Math.random()*2-1)*r,0,zz+(Math.random()*2-1)*r];ai.wanderT=6;}
}
function aimAt(b,t,speed){const d=dist(b.pos,t.pos),ts=d/speed;const lead=[t.pos[0]+t.vel[0]*ts,t.pos[1]+1.2+.5*20*ts*ts,t.pos[2]+t.vel[2]*ts];
  const dx=lead[0]-b.pos[0],dy=lead[1]-(b.pos[1]+EYE),dz=lead[2]-b.pos[2];b.yaw=Math.atan2(-dx,-dz);b.pitch=Math.atan2(dy,Math.hypot(dx,dz));
  const err=(1-DIFF[SET.difficulty|0].acc)*.12;b.yaw+=(Math.random()-.5)*err;b.pitch+=(Math.random()-.5)*err;}
function updateBot(b,dt){
  const ai=b.ai,D=DIFF[SET.difficulty|0];ai.think-=dt;ai.wanderT-=dt;ai.strafeT-=dt;
  if(ai.think<=0&&MATCH.state==='play'&&!(MATCH.preT>0)){ai.think=.25+Math.random()*.2/D.react;botThink(b);
    // route-finding for anything it is heading to (a fight only once it is out of reach in a straight line)
    const T=ai.target;if(ai.goal&&ai.mode!=='wander'&&!(ai.mode==='fight'&&T&&Math.abs(T.pos[1]-b.pos[1])<1.5&&hdist(b.pos,T.pos)<8))botPlan(b,ai.mode==='fight'&&T?T.pos:(ai.goal[1]?ai.goal:[ai.goal[0],b.pos[1],ai.goal[2]]));else ai.path=null;}
  let wx=0,wz=0,speed=4.3*speedMul(b);b.sprint=false;b.jump=false;
  if(MATCH.state==='play'&&!(MATCH.preT>0)){
    const t=ai.target;
    if(b.using==='eat'||b.using==='drink'){b.useT+=dt;const s=b.inv[b.sel];const it=s&&ITEMS[s.id];
      if(!it||(b.using==='eat'&&it.type!=='food')||(b.using==='drink'&&it.type!=='potion'))b.using=null;
      else if(b.useT>=1.6){if(it.type==='food')eatFood(b,s.id);else for(const f of it.fx)giveEffect(b,...f);consume(b,b.sel);b.using=null;}
      if(t&&t.alive){const dx=b.pos[0]-t.pos[0],dz=b.pos[2]-t.pos[2],l=Math.hypot(dx,dz)||1;wx=dx/l;wz=dz/l;}}
    else if(b.using==='bow'){b.useT+=dt;if(!t||!t.alive)b.using=null;else{aimAt(b,t,58);if(b.useT>=ai.bowT){fireBow(b,bowCharge(b.useT));b.using=null;ai.think=.4;}}}
    else if(ai.escape&&MATCH.gameT<ai.escape&&blockCount(b)>0){b.yaw+=dt;if(b.onGround)b.jump=true;
      else{const fx=Math.floor(b.pos[0]),fz=Math.floor(b.pos[2]),fy=Math.floor(b.pos[1]);if(b.pos[1]-fy<.45&&b.vel[1]<3.5&&!getB(fx,fy-1,fz)){const bi=b.inv.findIndex(x=>x&&ITEMS[x.id].type==='block');if(bi>=0&&placeBlock(fx,fy-1,fz,ITEMS[b.inv[bi].id].block)){consume(b,bi);b.swing=1;}}}
      ai.stuckT=0;ai.lastPos=b.pos.slice();}
    else if(ai.goal){
      const wp=botWaypoint(b),g=wp||ai.goal;let dx=g[0]-b.pos[0],dz=g[2]-b.pos[2];const hd=Math.hypot(dx,dz);const want=Math.atan2(-dx,-dz);
      if(ai.mode==='fight'&&t&&t.alive&&!wp){
        const d3=dist(b.pos,t.pos);b.pitch=Math.atan2(t.pos[1]-b.pos[1],hd);
        if(hd>2.2){wx=dx/hd;wz=dz/hd;b.sprint=hd>4&&b.food>6;speed*=b.sprint?1.3:1;}
        else{if(ai.strafeT<=0){ai.strafe=Math.random()<.5?1:-1;ai.strafeT=.6+Math.random();}const r=[Math.cos(b.yaw),-Math.sin(b.yaw)];wx=r[0]*ai.strafe*.7+(hd<1.4?-dx/hd*.6:0);wz=r[1]*ai.strafe*.7+(hd<1.4?-dz/hd*.6:0);}
        if(d3<3.1&&b.atkCD<=0&&Math.random()<D.react*dt*9){if(Math.random()<D.acc&&los(eye(b),[t.pos[0],t.pos[1]+1,t.pos[2]]))doAttack(b,t);else{b.atkCD=.25;b.swing=1;}
          if(t.onGround===false&&Math.random()<.3&&b.onGround)b.jump=true;}
        if((SET.difficulty|0)>=2&&b.onGround&&hd<3.5&&hd>1.5&&Math.random()<dt*1.5)b.jump=true;
      }else if(hd>(wp?.15:.9)){wx=dx/hd;wz=dz/hd;b.sprint=(wp?ai.path&&ai.path.length>6:hd>10)&&b.food>6;speed*=b.sprint?1.3:1;b.pitch*=.9;}
      if(wp&&ai.mode==='fight'&&t&&t.alive){const d3=dist(b.pos,t.pos);if(d3<3.1&&b.atkCD<=0&&Math.random()<D.react*dt*9&&los(eye(b),[t.pos[0],t.pos[1]+1,t.pos[2]]))doAttack(b,t);}
      let dy=want-b.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;b.yaw+=dy*Math.min(1,dt*10);
      if(ai.mode==='loot'&&ai.chest&&hd<2.5&&ai.chest.y-b.pos[1]>1.2&&MATCH.mode==='br'&&blockCount(b)>0){wx=0;wz=0;if(b.onGround)b.jump=true;
        else{const fx=Math.floor(b.pos[0]),fz=Math.floor(b.pos[2]),fy=Math.floor(b.pos[1]);if(b.pos[1]-fy<.45&&b.vel[1]<3.5&&!getB(fx,fy-1,fz)){const bi=b.inv.findIndex(x=>x&&ITEMS[x.id].type==='block');if(bi>=0&&placeBlock(fx,fy-1,fz,ITEMS[b.inv[bi].id].block)){consume(b,bi);b.swing=1;}}}
        // pillaring up to a chest: fine while it is gaining height, give up after 3s without progress
        const nowT=MATCH.gameT;if(ai.pillarC!==ai.chest||b.pos[1]>ai.pillarY+.5){ai.pillarC=ai.chest;ai.pillarY=b.pos[1];ai.pillarT=nowT;}
        if(nowT-ai.pillarT>3){ai.chest.claim=null;ai.chest.skipFor=b;ai.chest.skipT=nowT+25;ai.pillarC=null;ai.goal=null;ai.think=0;botDetour(b);}else ai.stuckT=0;}
      if(ai.mode==='loot'&&ai.chest&&ai.goal&&dist(b.pos,ai.goal)<2.6){ai.lootT+=dt;ai.chest.botOpen=1.2;if(ai.lootT>.7){ai.lootT=0;hostChestOp(key(ai.chest.x,ai.chest.y,ai.chest.z),'all',0,b);botTidy(b);if(ai.chest.items.some(Boolean)){ai.chest.skipFor=b;ai.chest.skipT=MATCH.gameT+30;}ai.chest.claim=null;ai.goal=null;ai.think=0;}}
    }
    if(MATCH.mode==='br'&&(ai.mode==='wander'||ai.mode==='loot')){ai.gatherT+=dt;if(ai.gatherT>2.5){ai.gatherT=0;if(blockCount(b)<20)addItem(b,'b2',1);}}
    if(b.onGround&&(wx||wz)&&!(ai.path&&ai.path.length)){const ax=b.pos[0]+wx*.8,az=b.pos[2]+wz*.8;if(!groundAhead(ax,b.pos[1]+.5,az,MATCH.mode==='br'?(b.health>12?9:5):5)){wx=0;wz=0;if(ai.mode==='fight')ai.ledgeT=MATCH.gameT;else{if(ai.mode==='drop'&&ai.dropDid)ai.skip.set(ai.dropDid,MATCH.gameT+30);if(ai.mode==='loot'&&ai.chest){ai.chest.claim=null;ai.chest.skipFor=b;ai.chest.skipT=MATCH.gameT+20;}ai.goal=null;ai.wanderT=0;ai.think=0;botDetour(b);}}}
    if((b.collidedH&&(wx||wz))||b.inWater||b.inLava)b.jump=true;
    ai.stuckT+=dt;if(ai.stuckT>2.5){const busy=b.using||(ai.mode==='fight'&&t&&t.alive&&dist(b.pos,t.pos)<3.5)||(ai.mode==='loot'&&ai.goal&&dist(b.pos,ai.goal)<2.6);
      if(hdist(b.pos,ai.lastPos)<.8&&!busy){const now=MATCH.gameT;
        if(ai.chest&&ai.mode==='loot'){ai.chest.claim=null;ai.chest.skipFor=b;ai.chest.skipT=now+20;}
        if(ai.mode==='drop'&&ai.dropDid){ai.skip.set(ai.dropDid,now+30);ai.dropDid=null;}
        if((ai.mode==='fight'||ai.mode==='hunt')&&(t||ai.hunt)){const who=t||ai.hunt.who;if(!(b.lastAttacker===who&&b.lastAttackT<2))ai.ignore.set(who,now+6);ai.hunt=null;}   // can't reach them from here
        ai.goal=null;ai.path=null;ai.wanderT=0;ai.think=0;botDetour(b);}
      ai.stuckT=0;ai.lastPos=b.pos.slice();}
    if(b.using)speed=1.4;
  }
  const moved=physics(b,dt,wx,wz);
  tickOwned(b,dt,moved);
}
