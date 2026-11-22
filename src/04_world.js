// ================= world storage, lighting, map generators =================
let WX=84,WY=48,WZ=84,CX=42,CZ=42;
let world=new Uint8Array(WX*WY*WZ),light=new Uint8Array(WX*WY*WZ),surfaceH=new Int16Array(WX*WZ);
let chests=new Map(),reserved=[],mapInfo=null;
function setDims(w,h,d){WX=w;WY=h;WZ=d;CX=w>>1;CZ=d>>1;world=new Uint8Array(WX*WY*WZ);light=new Uint8Array(WX*WY*WZ);surfaceH=new Int16Array(WX*WZ).fill(-1);chests=new Map();reserved=[];}
const idx=(x,y,z)=>(y*WZ+z)*WX+x;
const inB=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<WX&&y<WY&&z<WZ;
function getB(x,y,z){if(!inB(x,y,z))return 0;return world[idx(x,y,z)];}
function setB(x,y,z,b){if(!inB(x,y,z))return;world[idx(x,y,z)]=b;}
const solid=(x,y,z)=>{const b=getB(x,y,z);return b!==0&&BD[b].solid;};
const opaqueAt=(x,y,z)=>{const b=getB(x,y,z);return b!==0&&BD[b].opaque;};
const key=(x,y,z)=>x+','+y+','+z;
const surf=(x,z)=>(x<0||z<0||x>=WX||z>=WZ)?-1:surfaceH[z*WX+x];
function topSolid(x,z){for(let y=WY-1;y>=0;y--){const b=getB(x,y,z);if(b&&BD[b].solid&&b!==B.BARRIER)return y;}return -1;}
function fill(x0,y0,z0,x1,y1,z1,b){for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let z=Math.min(z0,z1);z<=Math.max(z0,z1);z++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)setB(x,y,z,b);}
function isFree(x,z,r){for(const p of reserved)if(Math.hypot(p[0]-x,p[1]-z)<p[2]+r)return false;return true;}
function placeChest(x,y,z,center,easter,face){setB(x,y,z,B.CHEST);chests.set(key(x,y,z),{x,y,z,rot:face==null?null:face,lid:0,lidPrev:0,center:!!center,easter:!!easter,items:easter?rollEaster():rollLoot(center)});}
function flatten(cx,cz,r,h,top,under,clear=14){
  for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){
    if(Math.hypot(x-cx,z-cz)>r+.5)continue;
    for(let y=h+1;y<h+clear;y++)setB(x,y,z,0);
    setB(x,h,z,top);
    for(let y=h-1;y>h-5;y--)if(!getB(x,y,z)||BD[getB(x,y,z)].liquid)setB(x,y,z,under||B.DIRT);
    for(let y=h-5;y>h-9;y--)if(!getB(x,y,z))setB(x,y,z,B.STONE);
    if(x>=0&&z>=0&&x<WX&&z<WZ)surfaceH[z*WX+x]=h;
  }
}
function tree(x,z,kind){
  const h=surf(x,z);if(h<0||getB(x,h,z)!==B.GRASS)return false;
  if(kind==='palm'){const th=sri(5,7);let ox=0;for(let y=1;y<=th;y++){if(y==4)ox=srand()<.5?1:0;setB(x+ox,h+y,z,B.LOG);}const tx=x+ox,ty=h+th;
    setB(tx,ty+1,z,B.LEAVES);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){for(let i=1;i<=3;i++)setB(tx+dx*i,ty+(i==3?-1:0),z+dz*i,B.LEAVES);}return true;}
  const big=kind==='jungle';const th=big?sri(7,10):sri(4,5);for(let y=1;y<=th;y++)setB(x,h+y,z,B.LOG);
  const R=big?3:2;
  for(let dy=th-(big?3:2);dy<=th+1;dy++){const r=dy>=th?R-1:R;for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
    if(Math.abs(dx)==r&&Math.abs(dz)==r&&(dy==th+1||srand()<.5))continue;if(!getB(x+dx,h+dy,z+dz))setB(x+dx,h+dy,z+dz,B.LEAVES);}}
  setB(x,h+th+1,z,B.LEAVES);return true;
}
function hut(cx,cz,mat,roof){
  const h=surf(cx,cz);if(h<0)return false;
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if(surf(cx+dx,cz+dz)<0||Math.abs(surf(cx+dx,cz+dz)-h)>3)return false;
  flatten(cx,cz,3,h,B.PLANKS,B.DIRT);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    const wall=Math.abs(dx)==2||Math.abs(dz)==2;
    for(let y=1;y<=3;y++){if(wall){const door=(dz==2&&dx==0&&y<3);const win=(dx==-2&&dz==0&&y==2)||(dx==2&&dz==0&&y==2);const corner=Math.abs(dx)==2&&Math.abs(dz)==2;
      if(door)continue;setB(cx+dx,h+y,cz+dz,win?B.GLASS:corner?B.LOG:mat);}}
    setB(cx+dx,h+4,cz+dz,roof||B.PLANKS);
  }
  placeChest(cx,h+1,cz-1,false);return true;
}
// center: 4 chests around a beacon, like the console Battle maps
function centerShrine(cx,cz,h,floor,edge){
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(Math.abs(dx)+Math.abs(dz)<=4)setB(cx+dx,h,cz+dz,(Math.abs(dx)+Math.abs(dz)<=1)?B.CHISELED:floor);else if(edge)setB(cx+dx,h,cz+dz,edge);}
  for(let y=h+1;y<h+30;y++)for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(getB(cx+dx,y,cz+dz)&&getB(cx+dx,y,cz+dz)!==B.BARRIER&&y<h+3)setB(cx+dx,y,cz+dz,0);}
  setB(cx,h+1,cz,B.BEACON);
  placeChest(cx+1,h+1,cz,true,false,-Math.PI/2);placeChest(cx-1,h+1,cz,true,false,Math.PI/2);placeChest(cx,h+1,cz+1,true,false,Math.PI);placeChest(cx,h+1,cz-1,true,false,0);
  reserved.push([cx,cz,7]);
  const sp=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=3.2;sp.push([cx+.5+Math.cos(a)*r,h+1,cz+.5+Math.sin(a)*r,Math.atan2(Math.cos(a),Math.sin(a))]);}
  return sp;
}
function ringSpawns(r,n){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;for(let rr=r;rr>4;rr--){const x=Math.round(CX+Math.cos(a)*rr),z=Math.round(CZ+Math.sin(a)*rr);const t=topSolid(x,z);
  if(t>0&&!solid(x,t+1,z)&&!solid(x,t+2,z)&&!BD[getB(x,t,z)].liquid&&getB(x,t,z)!==B.LAVA&&getB(x,t+1,z)!==B.WATER){out.push([x+.5,t+1,z+.5,Math.atan2(-(CX-x),-(CZ-z))]);break;}}}return out;}
function barrierWalls(){for(let y=0;y<WY;y++)for(let i=0;i<WX;i++){setB(i,y,0,B.BARRIER);setB(i,y,WZ-1,B.BARRIER);}for(let y=0;y<WY;y++)for(let i=0;i<WZ;i++){setB(0,y,i,B.BARRIER);setB(WX-1,y,i,B.BARRIER);}}

const MAPS=[
  {id:'temple',name:'Temple',desc:'A ruined temple deep in a jungle cave, ringed by a lily-pad moat with stepping stones, bridges and hanging vines.'},
  {id:'cavern',name:'Cavern',desc:'Underground arena under the bones of a giant beast. Lava, sand dunes, ledges.'},
  {id:'cove',name:'Cove',desc:'A pirate cove inside a cliff bowl: beach, lagoon, shipwreck, waterfalls and boardwalk huts.'},
  {id:'crucible',name:'Crucible',desc:'A lava colosseum at night under the bones of a giant beast, with a sandstone pyramid at its heart.'},
  {id:'skyhold',name:'Skyhold',desc:'A floating island with a temple. Knock people into the void.'},
];

function genSkyhold(){
  setDims(84,52,84);const s=1337;rs=s;const R=35;
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    const dx=x-CX,dz=z-CZ;const d=Math.hypot(dx,dz)/R;const en=fbm(x*.07,z*.07,s)*.35;if(d>.8+en)continue;
    const t=Math.max(0,1-d);const beach=d>.7+en*.5;
    let h=Math.floor(20+fbm(x*.05,z*.05,s+5)*8*Math.min(1,t*2.2)+t*3);let bot=Math.floor(20-t*16-fbm(x*.1,z*.1,s+9)*5);if(bot>h)bot=h;
    for(let y=Math.max(1,bot);y<=h;y++){let b=B.STONE;if(y==h)b=beach?B.SAND:B.GRASS;else if(y>h-3)b=beach?B.SAND:B.DIRT;if(b==B.STONE&&hash2(x,y*31+z,s)<.07)b=B.GRAVEL;setB(x,y,z,b);}
    surfaceH[z*WX+x]=h;
  }
  const H0=Math.max(surf(CX,CZ),22);flatten(CX,CZ,7,H0,B.COBBLE,B.STONE);
  for(let x=CX-7;x<=CX+7;x++)for(let z=CZ-7;z<=CZ+7;z++){const d=Math.hypot(x-CX,z-CZ);if(d<=4.5)setB(x,H0,z,B.BRICK);if(d>6&&d<=7.5&&hash2(x,z,s)<.5)setB(x,H0+1,z,B.MOSSY);}
  for(const [px,pz] of [[-4,-4],[4,-4],[-4,4],[4,4]])for(let y=1;y<=5;y++)setB(CX+px,H0+y,CZ+pz,B.BRICK);
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(Math.abs(x)==4||Math.abs(z)==4)setB(CX+x,H0+6,CZ+z,B.COBBLE);
  const central=centerShrine(CX,CZ,H0,B.BRICK);
  let huts=0;for(let t=0;t<80&&huts<5;t++){const x=CX+((srand()-.5)*50|0),z=CZ+((srand()-.5)*50|0);if(Math.hypot(x-CX,z-CZ)<12||!isFree(x,z,4))continue;if(hut(x,z,srand()<.3?B.COBBLE:B.PLANKS)){reserved.push([x,z,5]);huts++;}}
  let trees=0;for(let t=0;t<300&&trees<26;t++){const x=CX+((srand()-.5)*64|0),z=CZ+((srand()-.5)*64|0);if(!isFree(x,z,2))continue;if(tree(x,z)){reserved.push([x,z,2.5]);trees++;}}
  let lc=0;for(let t=0;t<200&&lc<10;t++){const x=CX+((srand()-.5)*56|0),z=CZ+((srand()-.5)*56|0);const h=surf(x,z);if(h<0||!isFree(x,z,2)||getB(x,h+1,z)||getB(x,h,z)!==B.GRASS)continue;placeChest(x,h+1,z,false);reserved.push([x,z,3]);lc++;}
  return {sky:[.47,.65,1],fog:[.74,.84,1],fogDist:110,skyLight:true,voidY:-12,central,spawns:ringSpawns(24,16),center:[CX,H0+1,CZ]};
}

function genCavern(){
  setDims(84,48,84);const s=777;rs=s;fill(0,0,0,WX-1,WY-1,WZ-1,B.STONE);
  const floorH=new Int16Array(WX*WZ);
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    const r=Math.hypot(x-CX,z-CZ);const d=r/38+fbm(x*.08,z*.08,s)*.18-.09;if(d>=1)continue;
    let fl=9+Math.floor(fbm(x*.06,z*.06,s+1)*4);if(r<11)fl=Math.max(fl,9+Math.floor((11-r)/2.4));
    const ceil=Math.min(44,Math.floor(fl+9+(1-d*d)*22+fbm(x*.1,z*.1,s+2)*5));
    for(let y=fl+1;y<=ceil;y++)setB(x,y,z,0);
    const dune=r<16||fbm(x*.09,z*.09,s+3)>.6;
    setB(x,fl,z,dune?B.SAND:hash2(x,z,s)<.15?B.GRAVEL:B.STONE);if(dune)setB(x,fl-1,z,B.SAND);
    const rv=fbm(x*.045,z*.045,s+4);if(r>13&&Math.abs(rv-.5)<.032){setB(x,fl,z,B.LAVA);setB(x,fl-1,z,B.LAVA);for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]])if(getB(x+ax,fl,z+az)===B.STONE||getB(x+ax,fl,z+az)===B.SAND)setB(x+ax,fl,z+az,B.NETHERRACK);}
    floorH[z*WX+x]=fl;surfaceH[z*WX+x]=fl;
  }
  const fh=(x,z)=>floorH[z*WX+x];
  // stepped sand pyramid at the centre
  const base=fh(CX,CZ)-2;for(let k=0;k<4;k++){const hs=8-k*2;fill(CX-hs,base,CZ-hs,CX+hs,base+k,CZ+hs,k==3?B.SANDSTONE:B.SAND);}
  for(let x=CX-8;x<=CX+8;x++)for(let z=CZ-8;z<=CZ+8;z++)surfaceH[z*WX+x]=topSolid(x,z);
  const central=centerShrine(CX,CZ,base+3,B.SANDSTONE);
  // pillars
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3,px=Math.round(CX+Math.cos(a)*20),pz=Math.round(CZ+Math.sin(a)*20);for(let y=fh(px,pz)+1;y<WY-2;y++){if(getB(px,y,pz)===B.STONE&&y>fh(px,pz)+8)break;fill(px,y,pz,px+1,y,pz+1,(y%5==0)?B.CHISELED:B.SBRICK);}reserved.push([px,pz,3]);}
  // ledges along the walls with chests (upper and outer ridges) + block staircases
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;let r=33;let lx,lz;while(r>22){lx=Math.round(CX+Math.cos(a)*r);lz=Math.round(CZ+Math.sin(a)*r);if(!solid(lx,fh(lx,lz)+3,lz)&&fh(lx,lz)>0)break;r--;}
    const ly=fh(lx,lz)+6;fill(lx-2,ly,lz-2,lx+2,ly,lz+2,B.SBRICK);for(let y=ly+1;y<ly+5;y++)fill(lx-2,y,lz-2,lx+2,y,lz+2,0);
    setB(lx,ly+1,lz,B.CHEST);chests.set(key(lx,ly+1,lz),{x:lx,y:ly+1,z:lz,center:false,items:rollLoot(false)});setB(lx+2,ly+1,lz+2,B.GLOW);
    const dx=Math.cos(a+Math.PI),dz=Math.sin(a+Math.PI);for(let st=1;st<=7;st++){const sx=Math.round(lx+dx*(2+st)),sz=Math.round(lz+dz*(2+st)),sy=ly-st+1;if(sy<=fh(sx,sz))break;
      fill(sx,fh(sx,sz)+1,sz,sx,sy-1,sz,B.SANDSTONE);setB(sx,sy,sz,B.SBRICK);setB(sx,sy+1,sz,0);setB(sx,sy+2,sz,0);}reserved.push([lx,lz,4]);}
  // giant skeleton overhead (decoration)
  const sz0=CZ+9;for(let x=CX-26;x<=CX+24;x++){const y=31+Math.round(Math.sin((x-CX)*.09)*2);if(getB(x,y,sz0)===0)fill(x,y,sz0,x,y+1,sz0,B.BONE);
    if((x-CX)%4===0&&x>CX-24&&x<CX+20){for(let k=1;k<=7;k++){const yy=y-Math.round(k*k*.18);for(const sgn of [-1,1]){const zz=sz0+sgn*k;if(getB(x,yy,zz)===0)setB(x,yy,zz,B.BONE);}}}}
  const sx=CX+25,sy=30;for(let x=sx;x<sx+6;x++)for(let y=sy;y<sy+5;y++)for(let z=sz0-2;z<=sz0+2;z++){if(getB(x,y,z)!==0)continue;const eye=(y==sy+3&&(z==sz0-1||z==sz0+1)&&x==sx+5);if(!eye)setB(x,y,z,B.BONE);}
  // glowstone on the ceiling
  for(let i=0;i<70;i++){const x=sri(6,WX-7),z=sri(6,WZ-7);let y=WY-2;while(y>2&&solid(x,y,z))y--;if(y<=fh(x,z)+4)continue;setB(x,y+1,z,B.GLOW);if(srand()<.5)setB(x+1,y+1,z,B.GLOW);if(srand()<.5)setB(x,y,z,B.GLOW);}
  // loose chests on dunes
  let lc=0;for(let t=0;t<200&&lc<8;t++){const x=sri(10,WX-11),z=sri(10,WZ-11);const h=fh(x,z);if(!h||getB(x,h,z)!==B.SAND||getB(x,h+1,z)||!isFree(x,z,3))continue;placeChest(x,h+1,z,false);reserved.push([x,z,3]);lc++;}
  return {sky:[.04,.035,.05],fog:[.05,.045,.06],fogDist:72,skyLight:false,voidY:-12,central,spawns:ringSpawns(22,16),center:[CX,base+4,CZ],dark:true};
}

function genCoveOld(){
  setDims(84,40,84);const s=4242;rs=s;const WL=12;
  const islets=[[CX+24,CZ-18,8],[CX-25,CZ+14,7],[CX+18,CZ+26,6],[CX-20,CZ-24,7]];
  for(let z=1;z<WZ-1;z++)for(let x=1;x<WX-1;x++){
    let land=Math.hypot(x-CX,z-CZ)/22+fbm(x*.08,z*.08,s)*.3-.15;
    for(const [ix,iz,ir] of islets)land=Math.min(land,Math.hypot(x-ix,z-iz)/ir+fbm(x*.1,z*.1,s+7)*.3-.15);
    let h;if(land<1){const t=1-land;h=WL+1+Math.floor(t*t*9*fbm(x*.06,z*.06,s+2)+t*2);}else h=Math.floor(4+fbm(x*.05,z*.05,s+3)*4);
    for(let y=1;y<=h;y++){let b=B.STONE;if(y>h-3)b=(h<=WL+1)?B.SAND:B.DIRT;if(y==h)b=h<=WL+1?(h<WL&&hash2(x,z,s)<.3?B.GRAVEL:B.SAND):B.GRASS;setB(x,y,z,b);}
    for(let y=h+1;y<=WL;y++)setB(x,y,z,B.WATER);surfaceH[z*WX+x]=h;
  }
  barrierWalls();
  // centre temple on the main hill
  const H0=Math.max(surf(CX,CZ),WL+3);flatten(CX,CZ,6,H0,B.SANDSTONE,B.SAND);
  for(const [px,pz] of [[-4,-4],[4,-4],[-4,4],[4,4]])for(let y=1;y<=5;y++)setB(CX+px,H0+y,CZ+pz,y==5?B.CHISELED:B.SANDSTONE);
  for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++)if(Math.abs(x)>=4||Math.abs(z)>=4)if(Math.abs(x)<=5&&Math.abs(z)<=5)setB(CX+x,H0+6,CZ+z,B.SANDSTONE);
  const central=centerShrine(CX,CZ,H0,B.SANDSTONE);
  // docks from the main island to each islet
  for(const [ix,iz] of islets){const n=Math.ceil(Math.hypot(ix-CX,iz-CZ));for(let i=6;i<n-4;i++){const x=Math.round(CX+(ix-CX)*i/n),z=Math.round(CZ+(iz-CZ)*i/n);
    for(const [ax,az] of [[0,0],[1,0],[0,1]]){if(getB(x+ax,WL+1,z+az)===0){setB(x+ax,WL+1,z+az,B.PLANKS);if(i%5==0)fill(x+ax,surf(x+ax,z+az)+1,z+az,x+ax,WL,z+az,B.LOG);}}}}
  // shipwreck on islet 0
  {const [ix,iz]=islets[0];const h=WL;for(let dx=-6;dx<=6;dx++)for(let dz=-2;dz<=2;dz++){const edge=Math.abs(dz)==2||Math.abs(dx)==6;const y0=h-1+(Math.abs(dz)==2?1:0);
      if(edge)fill(ix+dx,y0,iz+dz,ix+dx,h+2,iz+dz,B.PLANKS);else{setB(ix+dx,h-1,iz+dz,B.LOG);setB(ix+dx,h,iz+dz,B.PLANKS);for(let y=h+1;y<h+4;y++)setB(ix+dx,y,iz+dz,0);}}
    for(let y=h+1;y<h+9;y++)setB(ix,y,iz,B.LOG);for(let dz=-3;dz<=3;dz++)setB(ix,h+7,iz+dz,B.WOOL);
    setB(ix-3,h+1,iz,B.CHEST);chests.set(key(ix-3,h+1,iz),{x:ix-3,y:h+1,z:iz,items:rollLoot(false)});setB(ix+4,h+1,iz,B.CHEST);chests.set(key(ix+4,h+1,iz),{x:ix+4,y:h+1,z:iz,items:rollLoot(false)});
    for(let dx=-6;dx<=6;dx++)for(let dz=-2;dz<=2;dz++)surfaceH[(iz+dz)*WX+ix+dx]=topSolid(ix+dx,iz+dz);reserved.push([ix,iz,8]);}
  // lighthouse on islet 1 with a staircase inside
  {const [ix,iz]=islets[1];const h=Math.max(surf(ix,iz),WL+1);flatten(ix,iz,3,h,B.COBBLE,B.STONE,18);const top=h+14;
    for(let y=h+1;y<=top;y++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const wall=Math.abs(dx)==2||Math.abs(dz)==2;if(wall&&!(Math.abs(dx)==2&&Math.abs(dz)==2))setB(ix+dx,y,iz+dz,((y-h)>>1)%2?B.WOOL:B.SANDSTONE);}
    setB(ix,h+1,iz+2,0);setB(ix,h+2,iz+2,0);
    const ring=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];for(let i=0;i<top-h-1;i++){const [dx,dz]=ring[i%8];setB(ix+dx,h+1+i,iz+dz,B.PLANKS);}
    fill(ix-2,top+1,iz-2,ix+2,top+1,iz+2,B.SBRICK);setB(ix,top+1,iz,0);setB(ix,top+1,iz+1,0);
    for(let y=top+2;y<top+5;y++)for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])setB(ix+dx,y,iz+dz,B.SANDSTONE);fill(ix-2,top+5,iz-2,ix+2,top+5,iz+2,B.SANDSTONE);setB(ix,top+5,iz,B.GLOW);
    setB(ix-1,top+2,iz-1,B.CHEST);chests.set(key(ix-1,top+2,iz-1),{x:ix-1,y:top+2,z:iz-1,items:rollLoot(true)});reserved.push([ix,iz,6]);}
  let huts=0;for(let t=0;t<120&&huts<4;t++){const x=CX+((srand()-.5)*34|0),z=CZ+((srand()-.5)*34|0);if(Math.hypot(x-CX,z-CZ)<10||!isFree(x,z,4)||surf(x,z)<=WL+1)continue;if(hut(x,z,B.PLANKS,B.LOG)){reserved.push([x,z,5]);huts++;}}
  for(const [ix,iz] of islets.slice(2)){let ok=false;for(let t=0;t<40&&!ok;t++){const x=ix+sri(-3,3),z=iz+sri(-3,3);const h=surf(x,z);if(h>WL&&getB(x,h+1,z)===0&&isFree(x,z,1)){placeChest(x,h+1,z,false);reserved.push([x,z,2]);ok=true;}}}
  let trees=0;for(let t=0;t<400&&trees<22;t++){const x=sri(4,WX-5),z=sri(4,WZ-5);if(!isFree(x,z,2)||surf(x,z)<=WL+1)continue;if(tree(x,z,'palm')){reserved.push([x,z,2]);trees++;}}
  return {sky:[.47,.65,1],fog:[.74,.84,1],fogDist:110,skyLight:true,voidY:-12,central,spawns:ringSpawns(20,16),center:[CX,H0+1,CZ]};
}

function genCrucibleOld(){
  setDims(84,52,84);const s=9001;rs=s;const R=38;
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    const d=Math.hypot(x-CX,z-CZ)/R+fbm(x*.07,z*.07,s)*.25-.12;if(d>1)continue;const t=1-d;
    const h=Math.floor(20+fbm(x*.045,z*.045,s+5)*9*Math.min(1,t*3));const bot=Math.floor(20-t*14-fbm(x*.1,z*.1,s+9)*5);
    for(let y=Math.max(1,Math.min(bot,h));y<=h;y++){let b=B.STONE;if(y==h)b=B.GRASS;else if(y>h-3)b=B.DIRT;setB(x,y,z,b);}
    if(Math.abs(fbm(x*.05,z*.05,s+11)-.5)<.025&&d<.9)setB(x,h,z,hash2(x,z,s)<.5?B.MOSSY:B.GRAVEL);
    surfaceH[z*WX+x]=h;
  }
  // stepped temple
  const H0=Math.max(surf(CX,CZ),22);
  for(let k=0;k<4;k++){const hs=9-k*2;for(let y=H0-3+k*2;y<=H0-2+k*2;y++)fill(CX-hs,y,CZ-hs,CX+hs,y,CZ+hs,k%2?B.MSBRICK:B.SBRICK);}
  for(let x=CX-9;x<=CX+9;x++)for(let z=CZ-9;z<=CZ+9;z++){for(let y=H0+5;y<H0+20;y++)if(getB(x,y,z)&&getB(x,y,z)!==B.LOG)setB(x,y,z,0);}
  const top=H0+4;for(let k=0;k<8;k++){for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){const sx=CX+dx*(9-k),sz=CZ+dz*(9-k),sy=H0-3+k;const ox=dz?1:0,oz=dx?1:0;for(let w=-1;w<=1;w++)setB(sx+ox*w,sy,sz+oz*w,B.SBRICK);}}
  for(let x=CX-9;x<=CX+9;x++)for(let z=CZ-9;z<=CZ+9;z++)surfaceH[z*WX+x]=topSolid(x,z);
  const central=centerShrine(CX,CZ,top,B.SBRICK,B.CHISELED);
  for(const [px,pz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){for(let y=1;y<=3;y++)setB(CX+px,top+y,CZ+pz,B.CHISELED);setB(CX+px,top+4,CZ+pz,B.GLOW);}
  // shrines
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.round(CX+Math.cos(a)*23),z=Math.round(CZ+Math.sin(a)*23);const h=surf(x,z);if(h<0)continue;flatten(x,z,3,h,B.SBRICK,B.DIRT);
    for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){const hh=sri(2,4);for(let y=1;y<=hh;y++)setB(x+dx,h+y,z+dz,srand()<.5?B.MSBRICK:B.SBRICK);}
    setB(x,h+1,z,B.CHEST);chests.set(key(x,h+1,z),{x,y:h+1,z,items:rollLoot(false)});reserved.push([x,z,5]);}
  // the crucible: lava pit with an obsidian rim and a bridge to a chest island
  {const a=Math.PI*1.1,x=Math.round(CX+Math.cos(a)*22),z=Math.round(CZ+Math.sin(a)*22);const h=surf(x,z);
    for(let dx=-6;dx<=6;dx++)for(let dz=-6;dz<=6;dz++){const r=Math.hypot(dx,dz);if(r>6.5)continue;const xx=x+dx,zz=z+dz;const sh=surf(xx,zz);if(sh<0)continue;
      for(let y=h-3;y<=h+8;y++)setB(xx,y,zz,0);if(r>5.2){fill(xx,h-4,zz,xx,h,zz,B.OBSIDIAN);}else{fill(xx,h-5,zz,xx,h-4,zz,B.OBSIDIAN);fill(xx,h-3,zz,xx,h-2,zz,B.LAVA);}surfaceH[zz*WX+xx]=h;}
    fill(x,h-3,z,x,h,z,B.OBSIDIAN);setB(x,h+1,z,B.CHEST);chests.set(key(x,h+1,z),{x,y:h+1,z,items:rollLoot(true)});for(let dx=-6;dx<=-1;dx++)setB(x+dx,h,z,B.PLANKS);reserved.push([x,z,8]);}
  // towers with chests on top
  for(const a of [Math.PI*.15,Math.PI*1.6]){const x=Math.round(CX+Math.cos(a)*27),z=Math.round(CZ+Math.sin(a)*27);const h=surf(x,z);if(h<0)continue;flatten(x,z,3,h,B.SBRICK,B.STONE,20);const tp=h+12;
    for(let y=h+1;y<=tp;y++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){if((Math.abs(dx)==2||Math.abs(dz)==2)&&srand()>.08)setB(x+dx,y,z+dz,srand()<.4?B.MSBRICK:B.SBRICK);}
    setB(x,h+1,z+2,0);setB(x,h+2,z+2,0);const ring=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];for(let i=0;i<tp-h-1;i++){const [dx,dz]=ring[i%8];setB(x+dx,h+1+i,z+dz,B.SBRICK);}
    fill(x-2,tp+1,z-2,x+2,tp+1,z+2,B.SBRICK);setB(x,tp+1,z,0);setB(x,tp+1,z+1,0);setB(x+1,tp+2,z+1,B.CHEST);chests.set(key(x+1,tp+2,z+1),{x:x+1,y:tp+2,z:z+1,items:rollLoot(true)});reserved.push([x,z,5]);}
  let trees=0;for(let t=0;t<500&&trees<30;t++){const x=CX+((srand()-.5)*68|0),z=CZ+((srand()-.5)*68|0);if(!isFree(x,z,3))continue;if(tree(x,z,srand()<.6?'jungle':'oak')){reserved.push([x,z,3]);trees++;}}
  let lc=0;for(let t=0;t<200&&lc<7;t++){const x=CX+((srand()-.5)*60|0),z=CZ+((srand()-.5)*60|0);const h=surf(x,z);if(h<0||!isFree(x,z,2)||getB(x,h+1,z)||getB(x,h,z)!==B.GRASS)continue;placeChest(x,h+1,z,false);reserved.push([x,z,3]);lc++;}
  return {sky:[.47,.65,1],fog:[.72,.82,.95],fogDist:100,skyLight:true,voidY:-12,central,spawns:ringSpawns(26,16),center:[CX,top+1,CZ]};
}

function genHub(){
  setDims(56,32,56);rs=55;const G=10;
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){fill(x,1,z,x,G-1,z,B.DIRT);setB(x,0,z,B.STONE);setB(x,G,z,B.GRASS);surfaceH[z*WX+x]=G;}
  barrierWalls();
  for(let x=0;x<WX;x++)for(let z=0;z<WZ;z++){const r=Math.hypot(x-CX,z-CZ);if(r<11)setB(x,G,z,r<10?(hash2(x,z,3)<.2?B.MOSSY:B.COBBLE):B.SBRICK);
    if(Math.abs(x-CX)<=1&&r<26||Math.abs(z-CZ)<=1&&r<26)if(r>=11)setB(x,G,z,B.GRAVEL);}
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){const r=Math.hypot(x,z);if(r<=3.5&&r>2.5)setB(CX+x,G+1,CZ+z,B.SBRICK);else if(r<=2.5)setB(CX+x,G,CZ+z,B.WATER);}
  fill(CX,G,CZ,CX,G+3,CZ,B.CHISELED);setB(CX,G+4,CZ,B.GLOW);
  for(const [hx,hz] of [[-15,-15],[15,-15],[-15,15],[15,15],[0,-19],[-19,0]]){const x=CX+hx,z=CZ+hz;
    for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const wall=Math.abs(dx)==3||Math.abs(dz)==3,corner=Math.abs(dx)==3&&Math.abs(dz)==3;
      for(let y=1;y<=4;y++){if(!wall)continue;const door=(Math.sign(-hx)==Math.sign(dx)&&dz==0&&Math.abs(dx)==3||Math.sign(-hz)==Math.sign(dz)&&dx==0&&Math.abs(dz)==3)&&y<3;const win=y==2&&((Math.abs(dx)==3&&Math.abs(dz)==1)||(Math.abs(dz)==3&&Math.abs(dx)==1));
        if(door)continue;setB(x+dx,G+y,z+dz,corner?B.LOG:win?B.GLASS:(y==1?B.COBBLE:B.PLANKS));}
      setB(x+dx,G,z+dz,B.PLANKS);}
    for(let k=0;k<4;k++)fill(x-4+k,G+5+k,z-4+k,x+4-k,G+5+k,z+4-k,B.BRICK);setB(x,G+1,z,B.GLOW);}
  for(const [lx,lz] of [[-8,-8],[8,-8],[-8,8],[8,8]]){fill(CX+lx,G+1,CZ+lz,CX+lx,G+3,CZ+lz,B.LOG);setB(CX+lx,G+4,CZ+lz,B.GLOW);}
  // movement playground (east side): ice rink, slime pads, soul sand, cobwebs, ladder tower, slab and stair steps, swimming pool
  {const X0=CX+13,Z0=CZ-6;fill(X0,G,Z0,X0+13,G,Z0+13,B.SBRICK);for(let y=G+1;y<G+12;y++)fill(X0,y,Z0,X0+13,y,Z0+13,0);
    fill(X0+1,G,Z0+1,X0+7,G,Z0+4,B.ICE);
    fill(X0+9,G,Z0+1,X0+11,G,Z0+3,B.SLIME);
    fill(X0+1,G,Z0+6,X0+6,G,Z0+7,B.SOUL);
    for(const [dx,dz] of [[9,6],[10,6],[9,7],[11,7]])setB(X0+dx,G+1,Z0+dz,B.WEB);
    fill(X0+1,G+1,Z0+10,X0+3,G+8,Z0+12,B.SBRICK);for(let y=G+1;y<=G+9;y++)setB(X0+2,y,Z0+9,B.LADDER+2);fill(X0+1,G+9,Z0+10,X0+3,G+9,Z0+12,B.SLAB);
    for(let i=0;i<4;i++){setB(X0+5+i,G+1+(i>>1),Z0+11,(i%2==0)?B.SLAB:B.SBRICK);}
    for(let i=0;i<4;i++){fill(X0+10+i,G+1,Z0+10,X0+10+i,G+i,Z0+10,B.COBBLE);setB(X0+10+i,G+1+i,Z0+10,B.STAIRS+1);}
    for(let x=X0+9;x<=X0+13;x++)for(let z=Z0+12;z<=Z0+13;z++){fill(x,G-2,z,x,G,z,B.WATER);setB(x,G-3,z,B.SAND);}
  }
  for(let i=0;i<18;i++){const x=sri(3,WX-4),z=sri(3,WZ-4);if(Math.hypot(x-CX,z-CZ)<13)continue;if(getB(x,G+1,z)===0&&getB(x+1,G+1,z)===0)tree(x,z);}
  const sp=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2;sp.push([CX+.5+Math.cos(a)*6,G+1,CZ+.5+Math.sin(a)*6,Math.atan2(Math.cos(a),Math.sin(a))]);}
  return {sky:[.47,.65,1],fog:[.74,.84,1],fogDist:90,skyLight:true,voidY:-12,central:sp,spawns:sp,center:null,hub:true};
}

// ---- MCBR datapack port (battleroyale + battleroyale_structure) ----
const MOAI='000c 100s 200c 010s 110s 210c 020c 120c 220s 030c 130c 230s 040c 140c 240s 050s 150s 250c 060c 160s 260s 070s 170s 270c 080s 180s 280c 090c 190s 290s 0a0s 1a0c 2a0s 001s 101g 201c 011s 111c 211c 021c 121s 221c 031g 131g 231s 041s 141s 241c 051c 151s 251s 061c 161s 261s 071c 171s 271c 081c 181c 281s 091c 191c 291s 0a1s 1a1s 2a1s 002c 102g 202g 012g 112g 212g 022g 122c 222c 032c 132g 232c 042c 142c 242s 052s 152c 252c 062s 162s 262s 072c 172c 272s 082s 182c 282c 192s 0a2s 1a2s 2a2c 183s 1b1C 173t 193t'
  .split(' ').map(s=>[+s[0],parseInt(s[1],16),+s[2],s[3]]);
const BR_K=128/511;
function spreadPoints(n,cx,cz,minD,maxR,okFn){const pts=[];let d=minD;
  for(let tries=0;pts.length<n&&tries<6000;tries++){if(tries%400===399)d*=.8;const x=Math.round(cx+(srand()*2-1)*maxR),z=Math.round(cz+(srand()*2-1)*maxR);
    if(!okFn(x,z))continue;if(pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<d))continue;pts.push([x,z]);}return pts;}
function genBR(seed,extra){
  setDims(128,56,128);const s=seed%1000000;rs=(seed>>>0)||9;
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    const m=fbm(x*.018,z*.018,s+2),hills=fbm(x*.045,z*.045,s+5);const mount=Math.max(0,m-.55)*55;const h=Math.floor(16+hills*10+mount);const low=h<19;
    for(let y=1;y<=h;y++){let b=B.STONE;if(y==h)b=low?B.SAND:mount>6?B.STONE:B.GRASS;else if(y>h-3)b=low?B.SAND:mount>6?B.STONE:B.DIRT;if(b==B.STONE&&hash2(x,y*31+z,s)<.05)b=B.GRAVEL;setB(x,y,z,b);}
    surfaceH[z*WX+x]=h;}
  const inMap=(x,z,m)=>x>=m&&z>=m&&x<WX-m&&z<WZ-m;
  const st=spreadPoints(10,CX,CZ,100*BR_K,Math.min(255*BR_K,58),(x,z)=>inMap(x,z,4)&&getB(x,surf(x,z),z)!==B.LOG&&getB(x,surf(x,z),z)!==B.LEAVES);
  for(const [mx,mz] of st){const my=surf(mx,mz)+1,ox=mx-1,oy=my-5,oz=mz-1;
    for(const [x,y,z,t] of MOAI){const b=t==='c'||t==='t'?B.COBBLE:t==='s'?B.STONE:t==='g'?B.GRAVEL:B.CHEST;
      if(b===B.CHEST){setB(ox+x,oy+y,oz+z,B.CHEST);chests.set(key(ox+x,oy+y,oz+z),{x:ox+x,y:oy+y,z:oz+z,easter:true,items:rollEaster()});}else setB(ox+x,oy+y,oz+z,b);}
    reserved.push([mx,mz,4]);}
  if(extra){let huts=0;for(let t=0;t<200&&huts<9;t++){const x=4+(srand()*(WX-8)|0),z=4+(srand()*(WZ-8)|0);if(!isFree(x,z,5))continue;if(getB(x,surf(x,z),z)===B.STONE)continue;if(hut(x,z,srand()<.4?B.COBBLE:B.PLANKS)){reserved.push([x,z,6]);huts++;}}
    let lc=0;for(let t=0;t<400&&lc<16;t++){const x=3+(srand()*(WX-6)|0),z=3+(srand()*(WZ-6)|0);const h=surf(x,z);if(!isFree(x,z,2)||getB(x,h+1,z)||getB(x,h,z)!==B.GRASS)continue;placeChest(x,h+1,z,false);reserved.push([x,z,3]);lc++;}}
  let trees=0;for(let t=0;t<900&&trees<150;t++){const x=2+(srand()*(WX-4)|0),z=2+(srand()*(WZ-4)|0);if(!isFree(x,z,1.5))continue;if(tree(x,z)){reserved.push([x,z,2]);trees++;}}
  const sp=spreadPoints(16,CX,CZ,128*BR_K,Math.min(255*BR_K,58),(x,z)=>inMap(x,z,3)&&isFree(x,z,1)&&!solid(x,surf(x,z)+1,z)).map(([x,z])=>[x+.5,surf(x,z)+1,z+.5,srand()*6.28]);
  return {sky:[.47,.65,1],fog:[.74,.84,1],fogDist:110,skyLight:true,voidY:-12,central:sp,spawns:sp,center:null};
}
function generateMap(id,seed,extra){
  let info;if(id==='hub')info=genHub();else if(id==='cavern')info=genCavern();else if(id==='cove')info=genCove();else if(id==='crucible')info=genCrucible();else if(id==='temple')info=genTemple();else if(id==='br')info=genBR(seed,extra);else info=genSkyhold();
  if(id!=='cavern'){rs=(seed|0)+77||77;for(let z=1;z<WZ-1;z++)for(let x=1;x<WX-1;x++){const t=topSolid(x,z);if(t<0||getB(x,t,z)!==B.GRASS||getB(x,t+1,z))continue;
    if([...chests.values()].some(c=>Math.abs(c.x-x)<2&&Math.abs(c.z-z)<2))continue;const r=srand();if(r<.16)setB(x,t+1,z,B.TGRASS);else if(r<.175)setB(x,t+1,z,B.POPPY);else if(r<.19)setB(x,t+1,z,B.DANDELION);}}
  info.id=id;mapInfo=info;computeLight();return info;
}

// ---- lighting: sky light (column + flood) and block light (flood from emitters), 4 bits each ----
function computeLight(){
  light=new Uint8Array(WX*WY*WZ);const N=WX*WY*WZ;const q=new Int32Array(N);
  const pass=(shift,seed)=>{let qh=0,qt=0;
    for(let i=0;i<N;i++){const v=seed(i);if(v){light[i]|=v<<shift;q[qt++]=i;}}
    while(qh<qt){const i=q[qh++];const l=(light[i]>>shift)&15;if(l<=1)continue;const x=i%WX,z=((i/WX)|0)%WZ,y=(i/(WX*WZ))|0;
      for(let f=0;f<6;f++){const nx=x+(f==0)-(f==1),ny=y+(f==2)-(f==3),nz=z+(f==4)-(f==5);if(!inB(nx,ny,nz))continue;const j=idx(nx,ny,nz);const b=world[j];if(b&&BD[b].opaque)continue;
        const nl=l-1-(b===B.LEAVES||b===B.WATER?1:0);if(((light[j]>>shift)&15)<nl){light[j]=(light[j]&~(15<<shift))|(nl<<shift);if(qt<N)q[qt++]=j;}}}};
  if(mapInfo.skyLight){const top=new Int16Array(WX*WZ);for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){let y=WY-1;while(y>=0&&!(world[idx(x,y,z)]&&BD[world[idx(x,y,z)]].opaque))y--;top[z*WX+x]=y;}
    pass(4,i=>{const x=i%WX,z=((i/WX)|0)%WZ,y=(i/(WX*WZ))|0;return y>top[z*WX+x]?15:0;});}
  pass(0,i=>BD[world[i]]?BD[world[i]].light:0);
}
function relightColumn(x,z){if(!mapInfo.skyLight)return;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=WX||zz>=WZ)continue;let lit=true;
  for(let y=WY-1;y>=0;y--){const i=idx(xx,y,zz);const b=world[i];if(b&&BD[b].opaque)lit=false;const cur=light[i]>>4;const v=lit?15:Math.max(0,Math.min(cur,dx||dz?cur:9));light[i]=(light[i]&15)|(v<<4);}}}
const lightAt=(x,y,z)=>{if(y>=WY)return 15<<4;if(!inB(x,y,z))return mapInfo&&mapInfo.skyLight?15<<4:0;return light[idx(x,y,z)];};
