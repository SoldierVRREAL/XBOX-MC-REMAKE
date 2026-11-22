// ================= Java Edition movement physics (fixed 20 TPS, values from 1.8 EntityLivingBase / Entity) =================
const TICK=1/20,STEP_HEIGHT=.6,FULLBOX=[[0,0,0,1,1,1]];
function blockBoxes(x,y,z){const b=getB(x,y,z);if(!b)return null;const D=BD[b];if(D.fence)return fenceBoxes(x,y,z,true);if(D.col)return D.col;return D.solid?FULLBOX:null;}
function collisionBoxes(a){
  const out=[];const x0=Math.floor(a[0]),x1=Math.floor(a[3]-1e-9),y0=Math.floor(a[1])-1,y1=Math.floor(a[4]-1e-9),z0=Math.floor(a[2]),z1=Math.floor(a[5]-1e-9);
  for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    let bx=blockBoxes(x,y,z);if(!bx&&mapInfo&&mapInfo.hub&&(x<0||z<0||x>=WX||z>=WZ))bx=FULLBOX;if(!bx)continue;
    for(const b of bx){const c=[x+b[0],y+b[1],z+b[2],x+b[3],y+b[4],z+b[5]];if(c[3]>a[0]&&c[0]<a[3]&&c[4]>a[1]&&c[1]<a[4]&&c[5]>a[2]&&c[2]<a[5])out.push(c);}}
  return out;
}
const expandBox=(a,x,y,z)=>[a[0]+Math.min(0,x),a[1]+Math.min(0,y),a[2]+Math.min(0,z),a[3]+Math.max(0,x),a[4]+Math.max(0,y),a[5]+Math.max(0,z)];
const offBox=(a,x,y,z)=>[a[0]+x,a[1]+y,a[2]+z,a[3]+x,a[4]+y,a[5]+z];
function offY(b,e,d){if(e[3]>b[0]&&e[0]<b[3]&&e[5]>b[2]&&e[2]<b[5]){if(d>0&&e[4]<=b[1])d=Math.min(d,b[1]-e[4]);else if(d<0&&e[1]>=b[4])d=Math.max(d,b[4]-e[1]);}return d;}
function offX(b,e,d){if(e[4]>b[1]&&e[1]<b[4]&&e[5]>b[2]&&e[2]<b[5]){if(d>0&&e[3]<=b[0])d=Math.min(d,b[0]-e[3]);else if(d<0&&e[0]>=b[3])d=Math.max(d,b[3]-e[0]);}return d;}
function offZ(b,e,d){if(e[3]>b[0]&&e[0]<b[3]&&e[4]>b[1]&&e[1]<b[4]){if(d>0&&e[5]<=b[2])d=Math.min(d,b[2]-e[5]);else if(d<0&&e[2]>=b[5])d=Math.max(d,b[5]-e[2]);}return d;}
const entAABB=e=>[e.pos[0]-HW,e.pos[1],e.pos[2]-HW,e.pos[0]+HW,e.pos[1]+EH,e.pos[2]+HW];
const blockUnder=e=>getB(Math.floor(e.pos[0]),Math.floor(e.pos[1]-.2),Math.floor(e.pos[2]));
function slipperiness(e){const b=getB(Math.floor(e.pos[0]),Math.floor(e.pos[1])-1,Math.floor(e.pos[2]));return b===B.ICE?.98:b===B.SLIME?.8:.6;}
function onLadder(e){const b=getB(Math.floor(e.pos[0]),Math.floor(e.pos[1]),Math.floor(e.pos[2]));return !!(b&&BD[b].ladder);}
function liquidIn(a,kind){for(let y=Math.floor(a[1]);y<=Math.floor(a[4]-1e-9);y++)for(let z=Math.floor(a[2]);z<=Math.floor(a[5]-1e-9);z++)for(let x=Math.floor(a[0]);x<=Math.floor(a[3]-1e-9);x++){const b=getB(x,y,z);if(b&&BD[b].liquid===kind)return true;}return false;}

// Entity.moveEntity: sneak edge guard, Y-then-X-then-Z clipping, 0.6 step-up, landing, block collisions
function moveEntity(e,x,y,z){
  if(e.inWeb){e.inWeb=false;x*=.25;y*=.05;z*=.25;e.mot[0]=e.mot[1]=e.mot[2]=0;}
  let ox=x,oy=y,oz=z;let box=entAABB(e);
  if(e.onGround&&e.sneak){const s=.05;const free=(dx,dz)=>collisionBoxes(offBox(box,dx,-1,dz)).length===0;
    for(;x!==0&&free(x,0);ox=x)x=(x<s&&x>=-s)?0:x>0?x-s:x+s;
    for(;z!==0&&free(0,z);oz=z)z=(z<s&&z>=-s)?0:z>0?z-s:z+s;
    for(;x!==0&&z!==0&&free(x,z);ox=x,oz=z){x=(x<s&&x>=-s)?0:x>0?x-s:x+s;z=(z<s&&z>=-s)?0:z>0?z-s:z+s;}}
  const start=box;const list=collisionBoxes(expandBox(box,x,y,z));
  for(const b of list)y=offY(b,box,y);box=offBox(box,0,y,0);
  for(const b of list)x=offX(b,box,x);box=offBox(box,x,0,0);
  for(const b of list)z=offZ(b,box,z);box=offBox(box,0,0,z);
  const canStep=e.onGround||(oy!==y&&oy<0);
  if(canStep&&(ox!==x||oz!==z)){
    const sx=x,sy=y,sz=z,sbox=box;let bx=start;let y2=STEP_HEIGHT;const l2=collisionBoxes(expandBox(start,ox,STEP_HEIGHT,oz));
    for(const b of l2)y2=offY(b,bx,y2);bx=offBox(bx,0,y2,0);
    let x2=ox;for(const b of l2)x2=offX(b,bx,x2);bx=offBox(bx,x2,0,0);
    let z2=oz;for(const b of l2)z2=offZ(b,bx,z2);bx=offBox(bx,0,0,z2);
    let yd=-y2;for(const b of collisionBoxes(expandBox(bx,0,yd,0)))yd=offY(b,bx,yd);bx=offBox(bx,0,yd,0);
    if(sx*sx+sz*sz<x2*x2+z2*z2){x=x2;z=z2;y=y2+yd;box=bx;}else{x=sx;y=sy;z=sz;box=sbox;}
  }
  e.pos=[(box[0]+box[3])/2,box[1],(box[2]+box[5])/2];
  e.collidedH=ox!==x||oz!==z;const colV=oy!==y;e.onGround=colV&&oy<0;
  // fall distance and damage (EntityLivingBase.updateFallState / fall)
  if(e.onGround){if(e.fallDist>0){const u=blockUnder(e);if(!(u===B.SLIME&&!e.sneak)){const dmg=Math.ceil(e.fallDist-3);if(dmg>0&&owned(e))hurt(e,dmg,null,'fall',null,true);}e.fallDist=0;}}
  else if(y<0)e.fallDist-=y;
  if(ox!==x)e.mot[0]=0;if(oz!==z)e.mot[2]=0;
  if(oy!==y){const u=blockUnder(e);if(u===B.SLIME&&!e.sneak&&e.mot[1]<0)e.mot[1]=-e.mot[1];else e.mot[1]=0;}
  // blocks the entity walks on / stands in
  if(e.onGround&&!e.sneak&&blockUnder(e)===B.SLIME&&Math.abs(e.mot[1])<.1){const d=.4+Math.abs(e.mot[1])*.2;e.mot[0]*=d;e.mot[2]*=d;}
  const a=[box[0]+.001,box[1]+.001,box[2]+.001,box[3]-.001,box[4]-.001,box[5]-.001];
  for(let yy=Math.floor(a[1]);yy<=Math.floor(a[4]);yy++)for(let zz=Math.floor(a[2]);zz<=Math.floor(a[5]);zz++)for(let xx=Math.floor(a[0]);xx<=Math.floor(a[3]);xx++){
    const b=getB(xx,yy,zz);if(b===B.SOUL){e.mot[0]*=.4;e.mot[2]*=.4;}else if(b===B.WEB){e.inWeb=true;e.fallDist=0;}}
  return Math.hypot(x,z);
}
function moveFlying(e,wx,wz,fr){const m=wx*wx+wz*wz;if(m>=1e-4){let f=Math.sqrt(m);if(f<1)f=1;f=fr/f;e.mot[0]+=wx*f;e.mot[2]+=wz*f;}}
function mcJump(e){e.mot[1]=.42;if(e.sprint){const f=[-Math.sin(e.yaw),-Math.cos(e.yaw)];e.mot[0]+=f[0]*.2;e.mot[2]+=f[1]*.2;}exhaust(e,e.sprint?.8:.2);}
// one game tick (EntityLivingBase.onLivingUpdate + moveEntityWithHeading)
function mcTick(e){
  e.prev=e.pos.slice();const I=e.in||{wx:0,wz:0,jump:false,attr:.1};
  const box=entAABB(e);
  e.inWater=liquidIn([box[0]+.001,box[1]+.4,box[2]+.001,box[3]-.001,box[4]-.4,box[5]-.001],'water');
  e.inLava=liquidIn([box[0]+.1,box[1]+.4,box[2]+.1,box[3]-.1,box[4]-.4,box[5]-.1],'lava');
  if(e.inWater){e.fallDist=0;e.fire=0;}
  if(e.jumpTicks>0)e.jumpTicks--;
  for(let i=0;i<3;i++)if(Math.abs(e.mot[i])<.005)e.mot[i]=0;
  if(I.jump){if(e.inWater||e.inLava)e.mot[1]+=.04;else if(e.onGround&&e.jumpTicks===0){mcJump(e);e.jumpTicks=10;}}else e.jumpTicks=0;
  let moved=0;
  if(e.inWater||e.inLava){const y0=e.pos[1];moveFlying(e,I.wx,I.wz,.02);moved=moveEntity(e,e.mot[0],e.mot[1],e.mot[2]);const k=e.inWater?.8:.5;
    e.mot[0]*=k;e.mot[1]*=k;e.mot[2]*=k;e.mot[1]-=.02;
    if(e.collidedH){const t=offBox(entAABB(e),e.mot[0],e.mot[1]+.6-e.pos[1]+y0,e.mot[2]);if(!collisionBoxes(t).length&&!liquidIn(t,e.inWater?'water':'lava'))e.mot[1]=.3;}}
  else{
    const f4=e.onGround?slipperiness(e)*.91:.91;const f=.16277136/(f4*f4*f4);
    const accel=e.onGround?I.attr*(e.sprint?1.3:1)*f:(e.sprint?.026:.02);
    moveFlying(e,I.wx,I.wz,accel);
    const lad=onLadder(e);
    if(lad){const c=.15;e.mot[0]=clamp(e.mot[0],-c,c);e.mot[2]=clamp(e.mot[2],-c,c);e.fallDist=0;if(e.mot[1]<-.15)e.mot[1]=-.15;if(e.sneak&&e.mot[1]<0)e.mot[1]=0;}
    moved=moveEntity(e,e.mot[0],e.mot[1],e.mot[2]);
    if(e.collidedH&&lad)e.mot[1]=.2;
    e.mot[1]-=.08;e.mot[1]*=.98;e.mot[0]*=f4;e.mot[2]*=f4;
  }
  if(e.pos[1]<(mapInfo?mapInfo.voidY:-12)&&e.alive&&owned(e)){e.invuln=0;hurt(e,999,e.lastAttackT<8?e.lastAttacker:null,'void',null,true);}
  e.vel=[e.mot[0]*20,e.mot[1]*20,e.mot[2]*20];
  if(e.onGround)e.walkT+=Math.hypot(e.mot[0],e.mot[2])*20*TICK*.6;
  e.stepD=(e.stepD||0)+moved*.6;if(e.stepD>(e.nextStep||1)&&e.onGround&&!e.sneak){e.nextStep=Math.floor(e.stepD)+1;const u=blockUnder(e);sfx('step',{pos:e.pos,mat:onLadder(e)?'ladder':blockMat(u)});}
  if(e.inWater){e.swimD=(e.swimD||0)+Math.hypot(e.mot[0],e.mot[1],e.mot[2])*.35;if(e.swimD>(e.nextSwim||1)){e.nextSwim=Math.floor(e.swimD)+1;sfx('swim',{pos:e.pos});}}
  if(e.inWater&&!e.wasInWater&&e.mot[1]<-.1)sfx('splash',{pos:e.pos,vol:Math.min(1,-e.mot[1]*2)});e.wasInWater=e.inWater;
  return moved;
}
// frame wrapper: wx,wz = world-space movement input (|v|<=1), run whole ticks, interpolate for rendering
function physics(e,dt,wx,wz){
  if(!e.mot)e.mot=[0,0,0];if(!e.prev||dist(e.prev,e.pos)>8)e.prev=e.pos.slice();
  const k=.98*(e.sneak?.3:1)*(e.using?.2:1);
  e.in={wx:wx*k,wz:wz*k,jump:!!e.jump,attr:.1*speedMul(e)};
  e.acc=(e.acc||0)+dt;let moved=0,n=0;
  while(e.acc>=TICK&&n<5){e.acc-=TICK;moved+=mcTick(e);n++;}
  if(n===5)e.acc=0;
  const a=e.acc/TICK;e.rpos=[e.prev[0]+(e.pos[0]-e.prev[0])*a,e.prev[1]+(e.pos[1]-e.prev[1])*a,e.prev[2]+(e.pos[2]-e.prev[2])*a];
  return moved;
}
// EntityLivingBase.knockBack(entity, 0.4, x, z) + sprint/knockback bonus
function knockback(e,dx,dz,extra,fx,fz){if(!e.mot)e.mot=[0,0,0];const f=Math.hypot(dx,dz)||1;e.mot[0]/=2;e.mot[1]/=2;e.mot[2]/=2;e.mot[0]+=dx/f*.4;e.mot[1]+=.4;e.mot[2]+=dz/f*.4;if(e.mot[1]>.4)e.mot[1]=.4;
  if(extra){e.mot[0]+=(fx||dx/f)*.5*extra;e.mot[1]+=.1;e.mot[2]+=(fz||dz/f)*.5*extra;}e.onGround=false;e.vel=e.mot.map(v=>v*20);}
