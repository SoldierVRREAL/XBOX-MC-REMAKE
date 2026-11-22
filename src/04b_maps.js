// ================= remade console Battle maps: Cove (pirate cove) and Crucible (lava colosseum) =================
// helpers shared by both maps
const dirTo=(dx,dz)=>Math.abs(dx)>=Math.abs(dz)?[Math.sign(dx)||1,0]:[0,Math.sign(dz)||1];
const ladderK=(dx,dz)=>dz>0?0:dz<0?2:dx>0?3:1;          // ladder in the cell at post+(dx,dz), stuck to the post
const stairK=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3;             // stair that you climb while walking along (dx,dz)
function floorAt(x,z,yMax){for(let y=yMax;y>0;y--){const b=getB(x,y,z);if(b&&BD[b].solid)return y;}return -1;}
function spawnRing(cx,cz,r,n,yMax){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;for(let rr=r;rr>2;rr-=.5){const x=Math.round(cx+Math.cos(a)*rr),z=Math.round(cz+Math.sin(a)*rr);const t=floorAt(x,z,yMax);
  if(t>0&&!solid(x,t+1,z)&&!solid(x,t+2,z)&&!BD[getB(x,t,z)].liquid&&!(BD[getB(x,t+1,z)]||{}).liquid){out.push([x+.5,t+1,z+.5,Math.atan2(-(cx-x),-(cz-z))]);break;}}}return out;}
function squareSpawns(cx,cz,half,y,n){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const k=half/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));
  const x=Math.round(cx+Math.cos(a)*k),z=Math.round(cz+Math.sin(a)*k);out.push([x+.5,y,z+.5,Math.atan2(-(cx-x),-(cz-z))]);}return out;}
function finishSurface(){for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++)surfaceH[z*WX+x]=topSolid(x,z);}
function chestAt(x,y,z,center,face){if(getB(x,y,z)&&getB(x,y,z)!==B.TORCH)return false;if(!solid(x,y-1,z))setB(x,y-1,z,B.PLANKS);placeChest(x,y,z,center,false,face);return true;}

// ---------------- Cove ----------------
function genCove(){
  setDims(96,64,96);const s=4242;rs=s;const F=12;
  const bayD=(x,z,y)=>Math.hypot((x-CX)/36,(z-CZ)/40)+(fbm(x*.07,z*.07+y*.045,s+5)-.5)*.17;
  const rimTop=(x,z)=>44+Math.floor(fbm(x*.05,z*.05,s+1)*8);
  // cliff bowl with a sandy floor
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const top=rimTop(x,z);
    for(let y=0;y<=top;y++){const d=bayD(x,z,y);if(y>F&&d<=1)continue;let b=B.STONE;
      if(d>1){const above=bayD(x,z,y+1)>1&&y<top;if(y===top)b=B.GRASS;else if(y>top-4&&above)b=B.DIRT;else{const p=fbm(x*.13+y*.11,z*.13,s+3);if(p>.7)b=B.GRAVEL;else if(p<.22)b=B.COBBLE;else if(hash2(x*7+y,z,s+2)<.05)b=B.MOSSY;else if(p>.6&&p<.62)b=B.DIRT;}}
      else if(y>F-3)b=B.SAND;
      setB(x,y,z,b);}}
  // lagoon to the north and winding shallow channels
  const lagoon=(x,z)=>Math.hypot((x-CX)/15,(z-(CZ-17))/9)<1;
  for(let z=1;z<WZ-1;z++)for(let x=1;x<WX-1;x++){if(bayD(x,z,F+1)>.96||getB(x,F,z)!==B.SAND)continue;
    const ch=Math.abs(fbm(x*.055,z*.055,s+7)-.5)<.04&&Math.hypot(x-CX,z-CZ)>8;
    if(lagoon(x,z)||ch){setB(x,F,z,B.WATER);setB(x,F-1,z,B.WATER);setB(x,F-2,z,B.SAND);}
    else if(fbm(x*.09,z*.09,s+8)>.66&&Math.hypot(x-CX,z-CZ)>7)setB(x,F+1,z,B.SAND);}
  const rWall=(a,y)=>{for(let r=6;r<70;r+=.35){const x=Math.round(CX+Math.cos(a)*r),z=Math.round(CZ+Math.sin(a)*r);if(x<1||z<1||x>=WX-1||z>=WZ-1||bayD(x,z,y)>1)return r;}return 70;};
  const at=(a,r)=>[Math.round(CX+Math.cos(a)*r),Math.round(CZ+Math.sin(a)*r)];
  // waterfalls pouring down the cliffs into small pools
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.45;const r=rWall(a,F+10);const [fx,fz]=at(a,r-1);const top=Math.min(WY-2,topSolid(...at(a,r+1))-1);
    for(let y=F-1;y<=top;y++){const b=getB(fx,y,fz);if(!b||b===B.SAND)setB(fx,y,fz,B.WATER);}
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(getB(fx+dx,F,fz+dz)===B.SAND){setB(fx+dx,F,fz+dz,B.WATER);setB(fx+dx,F-1,fz+dz,B.WATER);}}
  // boardwalks hugging the cliff at three heights
  const levels=[F+6,F+12,F+18];const deckKeys=new Set();const deckLevel=new Map();
  const N=720;
  levels.forEach((L,li)=>{const gaps=[[li*2.1+.6,.32],[li*2.1+3.5,.26]];
    for(let i=0;i<N;i++){const a=i/N*Math.PI*2;if(gaps.some(([g,w])=>Math.abs(((a-g)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI)<w))continue;
      const rw=Math.min(rWall(a,L),rWall(a,L+1),rWall(a,L+2),rWall(a,L+3));
      for(let k=1;k<=4;k++){const [x,z]=at(a,rw-k);if(!getB(x,L,z)){setB(x,L,z,li===1?B.SPRUCE_PLANKS:B.PLANKS);deckKeys.add(x+','+L+','+z);deckLevel.set(x+','+z+','+li,1);}}}});
  // fences, posts, ladders and torches along the outer edge of each boardwalk
  const posts=[];
  for(const kk of deckKeys){const [x,L,z]=kk.split(',').map(Number);const toC=dirTo(CX-x,CZ-z);
    const open=!getB(x+toC[0],L,z+toC[1]);if(!open)continue;
    if(!getB(x,L+1,z)&&hash2(x,z,s+31)>.06)setB(x,L+1,z,B.FENCE);
    if(hash2(x,z,s+32)<.12){posts.push([x,L,z,toC]);}}
  posts.forEach(([x,L,z,toC],i)=>{for(let y=L-1;y>0&&!solid(x,y,z)&&getB(x,y,z)!==B.WATER;y--)setB(x,y,z,B.SPRUCE_LOG);
    if(getB(x,L+1,z)===B.FENCE&&i%3===0&&!getB(x,L+2,z))setB(x,L+2,z,B.TORCH);
    if(i%4===1){const lx=x+toC[0],lz=z+toC[1];let bottom=L;while(bottom>1&&!solid(lx,bottom-1,lz))bottom--;
      if(L-bottom>=3){for(let y=bottom;y<=L+1;y++)if(!getB(lx,y,lz)||getB(lx,y,lz)===B.WATER)setB(lx,y,lz,B.LADDER+ladderK(toC[0],toC[1]));if(getB(x,L+1,z)===B.FENCE)setB(x,L+1,z,0);if(getB(x,L+2,z)===B.TORCH)setB(x,L+2,z,0);}}});
  // wide stairs from the beach up to the first boardwalk at the four compass points
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const a=Math.atan2(dz,dx);const L=levels[0];const rw=Math.min(rWall(a,L),rWall(a,L+1),rWall(a,L+2));
    const px=-dz,pz=dx;// sideways
    for(let w=-1;w<=1;w++)for(let k=1;k<=4;k++){const x=Math.round(CX+dx*(rw-k))+px*w,z=Math.round(CZ+dz*(rw-k))+pz*w;if(!getB(x,L,z)||getB(x,L+1,z)===B.FENCE){setB(x,L,z,B.PLANKS);if(getB(x,L+1,z)===B.FENCE)setB(x,L+1,z,0);}}
    for(let j=1;j<=6;j++){const r=rw-5-(6-j);for(let w=-1;w<=1;w++){const x=Math.round(CX+dx*r)+px*w,z=Math.round(CZ+dz*r)+pz*w;
      for(let y=F+1;y<F+j;y++)if(!getB(x,y,z)||getB(x,y,z)===B.WATER)setB(x,y,z,B.PLANKS);setB(x,F+j,z,B.OAK_STAIRS+stairK(dx,dz));for(let y=F+j+1;y<=F+j+3;y++)if(getB(x,y,z)!==B.LADDER)setB(x,y,z,0);}}}
  // a hut on stilts: spruce frame, plank walls, stair roof, chest inside
  const hutAt=(cx,cz,fy,faceDx,faceDz)=>{
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const x=cx+dx,z=cz+dz;setB(x,fy,z,B.SPRUCE_PLANKS);
      const edge=Math.abs(dx)==2||Math.abs(dz)==2,corner=Math.abs(dx)==2&&Math.abs(dz)==2;
      for(let y=fy+1;y<=fy+4;y++){if(!edge){setB(x,y,z,0);continue;}
        const door=(faceDx&&dx==2*faceDx&&dz==0&&y<=fy+2)||(faceDz&&dz==2*faceDz&&dx==0&&y<=fy+2);const win=y==fy+2&&!corner&&((Math.abs(dx)==2&&dz==0)||(Math.abs(dz)==2&&dx==0))&&!door;
        setB(x,y,z,door?0:win?B.GLASS:corner?B.SPRUCE_LOG:B.PLANKS);}
      if(corner)for(let y=fy-1;y>0&&!solid(x,y,z);y--)setB(x,y,z,B.SPRUCE_LOG);}
    for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const r=Math.max(Math.abs(dx),Math.abs(dz));const x=cx+dx,z=cz+dz;
      if(r==3){const k=Math.abs(dx)>=Math.abs(dz)?(dx>0?3:1):(dz>0?0:2);setB(x,fy+5,z,B.SPRUCE_STAIRS+k);}else if(r==2)setB(x,fy+5,z,B.SPRUCE_PLANKS);else if(r==1)setB(x,fy+6,z,B.SPRUCE_SLAB||B.OAK_SLAB);else setB(x,fy+6,z,B.SPRUCE_PLANKS);}
    setB(cx,fy+5,cz,0);setB(cx,fy+4,cz,B.GLOW);
    chestAt(cx-(faceDx||0),fy+1,cz-(faceDz||0),false,Math.atan2(-(faceDx||0),-(faceDz||0)));
    reserved.push([cx,cz,4]);};
  // huts on the boardwalks
  [[.25,1],[1.3,0],[2.4,2],[3.3,1],[4.3,0],[5.4,2]].forEach(([a,li])=>{const L=levels[li];const rw=Math.min(rWall(a,L+1),rWall(a,L+3),rWall(a,L+5));const [cx,cz]=at(a,rw-3);const [fx,fz]=dirTo(CX-cx,CZ-cz);hutAt(cx,cz,L,fx,fz);
    for(let k=1;k<=3;k++){const x=cx+fx*(2+k),z=cz+fz*(2+k);if(!getB(x,L,z))setB(x,L,z,B.PLANKS);if(getB(x,L+1,z)===B.FENCE)setB(x,L+1,z,0);if(getB(x,L+2,z)===B.TORCH)setB(x,L+2,z,0);}});
  // a stone sea stack in the lagoon with a lookout hut and a rope bridge to the cliff
  {const px=CX,pz=CZ-17,L=levels[2];fill(px-2,1,pz-2,px+2,L-1,pz+2,B.STONE);for(let y=F+1;y<L-1;y++)for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])setB(px+dx,y,pz+dz,hash2(px+dx,y,s)<.5?B.MOSSY:B.COBBLE);
    hutAt(px,pz,L,0,1);setB(px,L+1,pz-2,0);setB(px,L+2,pz-2,0);const rw=rWall(-Math.PI/2,L+1);const endZ=Math.round(CZ-rw+2);
    for(let z=pz-3;z>=endZ;z--){for(let w=-1;w<=1;w++)setB(px+w,L,z,w?B.SPRUCE_PLANKS:B.PLANKS);setB(px-2,L+1,z,B.FENCE);setB(px+2,L+1,z,B.FENCE);for(let y=L+1;y<=L+3;y++)for(let w=-1;w<=1;w++)setB(px+w,y,z,0);}
    for(let z=pz+3;z<=pz+5;z++)for(let w=-1;w<=1;w++)setB(px+w,L,z,B.PLANKS);
    for(let y=F+1;y<=L+1;y++)setB(px,y,pz+6,B.LADDER+ladderK(0,1));setB(px,L,pz+5,B.PLANKS);
    for(let y=F-1;y<=L-1;y++)setB(px,y,pz+5,B.SPRUCE_LOG);}
  // the shipwreck run aground on the beach
  {const sx=CX+15,sz=CZ+13;const hw=dx=>{const a=Math.abs(dx);return a>7?Math.max(0,3-(a-7)):3;};
    for(let dx=-11;dx<=11;dx++){const w=hw(dx);for(let y=F;y<=F+4;y++){const ww=Math.max(0,w-(y===F?1:0));
      for(let dz=-ww-1;dz<=ww+1;dz++){const x=sx+dx,z=sz+dz;const wall=Math.abs(dz)===ww+1||(Math.abs(dx)===11);if(wall&&!(dx>9&&y<F+2&&Math.abs(dz)<=1&&dx<0))setB(x,y,z,B.SPRUCE_PLANKS);else if(y===F)setB(x,y,z,B.PLANKS);else setB(x,y,z,0);}}}
    for(let dx=-10;dx<=10;dx++){const w=hw(dx);for(let dz=-w;dz<=w;dz++){if(dx>=-1&&dx<=0&&dz===0)continue;setB(sx+dx,F+5,sz+dz,B.PLANKS);}setB(sx+dx,F+6,sz-w-1,B.FENCE);setB(sx+dx,F+6,sz+w+1,B.FENCE);}
    for(let y=F+1;y<=F+5;y++)setB(sx-1,y,sz,B.LADDER+ladderK(-1,0));setB(sx,F+5,sz,0);
    // raised bow and stern cabin
    for(let dx=7;dx<=10;dx++){const w=hw(dx);for(let dz=-w;dz<=w;dz++)setB(sx+dx,F+6,sz+dz,B.PLANKS);}
    for(let dx=-10;dx<=-6;dx++)for(let dz=-3;dz<=3;dz++){const edge=dx===-10||dx===-6||Math.abs(dz)===3;for(let y=F+6;y<=F+8;y++)setB(sx+dx,y,sz+dz,edge&&!(dx===-6&&dz===0&&y<F+8)?B.SPRUCE_PLANKS:0);setB(sx+dx,F+9,sz+dz,B.SPRUCE_SLAB||B.OAK_SLAB);}
    chestAt(sx-8,F+6,sz,false,-Math.PI/2);chestAt(sx+4,F+1,sz+1,false,Math.PI);chestAt(sx-4,F+1,sz-1,false,0);
    // mast, yard, sail and crow's nest
    for(let y=F+6;y<=F+19;y++)setB(sx+2,y,sz,B.SPRUCE_LOG);for(let dz=-4;dz<=4;dz++)setB(sx+2,F+15,sz+dz,B.SPRUCE_PLANKS);
    for(let y=F+9;y<=F+14;y++)for(let dz=-3;dz<=3;dz++)setB(sx+3,y,sz+dz,B.WOOL_W);
    for(let dx=1;dx<=3;dx++)for(let dz=-1;dz<=1;dz++){setB(sx+dx,F+19,sz+dz,B.SPRUCE_PLANKS);if(dx!==2||dz!==0)setB(sx+dx,F+20,sz+dz,(Math.abs(dz)==1||dx!==2)?B.FENCE:0);}
    setB(sx+2,F+20,sz,0);for(let y=F+6;y<=F+19;y++)setB(sx+1,y,sz,B.LADDER+ladderK(-1,0));setB(sx+1,F+19,sz,0);setB(sx+1,F+20,sz,0);
    chestAt(sx+2,F+20,sz,false,-Math.PI/2);reserved.push([sx,sz,13]);}
  // beach huts on stilts over the shallows
  for(const [a,r] of [[2.0,19],[3.9,21],[5.2,18]]){const [cx,cz]=at(a,r);const [fx,fz]=dirTo(CX-cx,CZ-cz);if(!isFree(cx,cz,4))continue;hutAt(cx,cz,F+3,fx,fz);
    const lx=cx+fx*3,lz=cz+fz*3;setB(lx,F+3,lz,B.PLANKS);for(let y=F+1;y<=F+3;y++)setB(lx+fx,y,lz+fz,B.LADDER+ladderK(fx,fz));}
  // the treasure: four chests around a campfire in the middle of the beach
  fill(CX-4,F+1,CZ-4,CX+4,F+3,CZ+4,0);fill(CX-4,F,CZ-4,CX+4,F,CZ+4,B.SAND);
  setB(CX,F+1,CZ,B.NETHERRACK);setB(CX,F+2,CZ,B.TORCH);
  placeChest(CX+2,F+1,CZ,true,false,-Math.PI/2);placeChest(CX-2,F+1,CZ,true,false,Math.PI/2);placeChest(CX,F+1,CZ+2,true,false,Math.PI);placeChest(CX,F+1,CZ-2,true,false,0);
  for(const [dx,dz] of [[2,2],[-2,2],[2,-2],[-2,-2]]){setB(CX+dx,F+1,CZ+dz,B.FENCE);setB(CX+dx,F+2,CZ+dz,B.TORCH);}
  reserved.push([CX,CZ,6]);
  // red X marks, mooring posts and loose chests on the sand
  for(let n=0,t=0;n<6&&t<200;t++){const x=sri(CX-24,CX+24),z=sri(CZ-26,CZ+26);if(getB(x,F,z)!==B.SAND||getB(x,F+1,z)||!isFree(x,z,3)||bayD(x,z,F+2)>.85)continue;
    for(let i=-1;i<=1;i++){for(const [ax,az] of [[i,i],[i,-i]])if(getB(x+ax,F,z+az)===B.SAND&&!getB(x+ax,F+1,z+az))setB(x+ax,F+1,z+az,B.CARPET);}reserved.push([x,z,3]);n++;}
  for(let n=0,t=0;n<30&&t<400;t++){const x=sri(CX-28,CX+28),z=sri(CZ-30,CZ+30);if(bayD(x,z,F+3)>.9||!isFree(x,z,2))continue;const g=getB(x,F,z);if(g!==B.SAND&&g!==B.WATER||getB(x,F+1,z))continue;
    const h=1+(hash2(x,z,s+40)<.35?1:0);for(let y=F+1;y<=F+h;y++)setB(x,y,z,B.SPRUCE_LOG);if(g===B.WATER)setB(x,F,z,B.SPRUCE_LOG);n++;}
  for(let n=0,t=0;n<5&&t<300;t++){const x=sri(CX-22,CX+22),z=sri(CZ-24,CZ+24);if(getB(x,F,z)!==B.SAND||getB(x,F+1,z)||!isFree(x,z,4))continue;if(chestAt(x,F+1,z,false)){reserved.push([x,z,4]);n++;}}
  // chests along the boardwalks, against the cliff
  levels.forEach((L,li)=>{for(let i=0;i<6;i++){const a=(i+li*.33)/6*Math.PI*2+.15;const rw=Math.min(rWall(a,L+1),rWall(a,L+2));const [x,z]=at(a,rw-1);
    if(getB(x,L,z)&&!getB(x,L+1,z)&&!getB(x,L+2,z)&&isFree(x,z,1))chestAt(x,L+1,z,false,Math.atan2(-(CX-x),-(CZ-z))+Math.PI);}});
  // jungle on the rim with leaves hanging over the edge
  finishSurface();
  for(let n=0,t=0;n<70&&t<1500;t++){const x=sri(3,WX-4),z=sri(3,WZ-4);const h=surf(x,z);if(h<40||getB(x,h,z)!==B.GRASS)continue;if(bayD(x,z,h)<1.03)continue;
    const th=sri(5,10);for(let y=1;y<=th;y++)setB(x,h+y,z,B.JLOG);const R=th>7?3:2;
    for(let dy=th-2;dy<=th+1;dy++){const r=dy>th?R-1:R;for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){if(Math.abs(dx)==r&&Math.abs(dz)==r&&hash2(x+dx,z+dz,dy)<.6)continue;if(!getB(x+dx,h+dy,z+dz))setB(x+dx,h+dy,z+dz,B.JLEAVES);}}
    // vines of leaves down the cliff face
    if(bayD(x,z,h)<1.12)for(let k=0;k<5;k++){const vx=x+sri(-2,2),vz=z+sri(-2,2);for(let y=h+th-2;y>h-sri(3,9);y--)if(!getB(vx,y,vz))setB(vx,y,vz,B.JLEAVES);else if(y<h)break;}n++;}
  for(let n=0,t=0;n<10&&t<300;t++){const x=sri(CX-26,CX+26),z=sri(CZ-28,CZ+28);if(getB(x,F,z)!==B.SAND||getB(x,F+1,z)||!isFree(x,z,3)||bayD(x,z,F+2)>.88)continue;
    const th=sri(5,7);let ox=0;for(let y=1;y<=th;y++){if(y==4)ox=hash2(x,z,s)<.5?1:0;setB(x+ox,F+y,z,B.JLOG);}const tx=x+ox,ty=F+th;setB(tx,ty+1,z,B.JLEAVES);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(let i=1;i<=3;i++)if(!getB(tx+dx*i,ty+(i==3?-1:0),z+dz*i))setB(tx+dx*i,ty+(i==3?-1:0),z+dz*i,B.JLEAVES);reserved.push([x,z,3]);n++;}
  barrierWalls();finishSurface();
  const central=squareSpawns(CX,CZ,4,F+1,16);
  return {sky:[.47,.65,1],fog:[.72,.83,.98],fogDist:120,skyLight:true,voidY:-12,central,spawns:spawnRing(CX,CZ,18,16,F+4),center:[CX,F+1,CZ],noBeam:true};
}

// ---------------- Crucible ----------------
function genCrucible(){
  setDims(100,64,100);const s=9001;rs=s;const F=14;
  const pol=(x,z)=>[Math.hypot(x-CX,z-CZ),Math.atan2(z-CZ,x-CX)];
  const arc=(a,step)=>{const t=((a%step)+step)%step;return Math.min(t,step-t);}; // distance to the nearest multiple of step (radians)
  const brick=(x,y,z)=>{const h=hash2(x*3+y,z,s);return h<.12?B.CRACKED:h<.2?B.MSBRICK:B.SBRICK;};
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const [r,a]=pol(x,z);const rr=r+(fbm(x*.08,z*.08,s)-.5)*1.6;
    for(let y=1;y<=F-3;y++)setB(x,y,z,hash2(x,y*5+z,s)<.3?B.NETHERRACK:B.STONE);
    if(rr<21.5){fill(x,F-2,z,x,F,z,B.SAND);const d=fbm(x*.11,z*.11,s+3);if(r>9&&d>.62){setB(x,F+1,z,B.SAND);if(d>.74)setB(x,F+2,z,B.SAND);}}
    else if(r<26){setB(x,F-2,z,B.NETHERRACK);setB(x,F-1,z,B.LAVA);}
    else if(r<27.5){fill(x,F-2,z,x,F,z,B.NETHERRACK);}
    else if(r<33){fill(x,F-2,z,x,F,z,brick(x,F,z));}                                   // ground walkway
    else if(r<34.5){fill(x,F-2,z,x,F+9,z,0);for(let y=F-2;y<=F+9;y++)setB(x,y,z,brick(x,y,z));
      if(arc(a,Math.PI/12)*r<1.6)for(let y=F+1;y<=F+5;y++)setB(x,y,z,0);else if(arc(a,Math.PI/12)*r<2.4)setB(x,F+6,z,B.CHISELED);}  // arcade
    else if(r<38.5){fill(x,F-2,z,x,F,z,brick(x,F,z));setB(x,F+9,z,brick(x,F+9,z));}      // lower corridor
    else if(r<40){for(let y=F-2;y<=F+9;y++)setB(x,y,z,brick(x,y,z));}
    else if(r<43.5){for(let y=F-2;y<=F+9;y++)setB(x,y,z,hash2(x,y,z)<.5?B.STONE:B.COAL);}
    else{for(let y=F-2;y<=F+18;y++)setB(x,y,z,hash2(x,y,z+7)<.5?B.STONE:B.COAL);}
    // upper tiers
    if(r>=31&&r<40)setB(x,F+9,z,brick(x,F+9,z));
    if(r>=31&&r<31.9&&hash2(x,z,s+9)>.25)setB(x,F+10,z,B.SBR_SLAB);
    if(r>=38&&r<39.5){for(let y=F+10;y<=F+18;y++)setB(x,y,z,brick(x,y,z));if(arc(a,Math.PI/14)*r<1.6)for(let y=F+10;y<=F+14;y++)setB(x,y,z,0);}
    if(r>=39.5&&r<43.5){setB(x,F+9,z,brick(x,F+9,z));setB(x,F+18,z,brick(x,F+18,z));}
    if(r>=43.5&&r<45){for(let y=F+10;y<=F+18;y++)setB(x,y,z,brick(x,y,z));}
    if(r>=36&&r<45)setB(x,F+18,z,brick(x,F+18,z));
    if(r>=45&&r<47.5){for(let y=F+10;y<=F+24;y++)setB(x,y,z,brick(x,y,z));if((x+z)%2===0)setB(x,F+25,z,brick(x,F+25,z));}
    if(r>=47.5){for(let y=F+10;y<=F+22;y++)setB(x,y,z,hash2(x,y,z+9)<.6?B.STONE:B.COAL);}
  }
  // tall columns in front of the stands, joined by a ring beam, with torches on top
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2;const x=Math.round(CX+Math.cos(a)*29.5),z=Math.round(CZ+Math.sin(a)*29.5);
    for(let y=F+1;y<=F+19;y++)setB(x,y,z,y===F+1||y===F+19?B.CHISELED:B.QUARTZ);setB(x,F+21,z,B.TORCH);}
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const r=Math.hypot(x-CX,z-CZ);if(r>=28.8&&r<30.4)setB(x,F+20,z,B.SBRICK);}
  // lava falls down the arcade, running across the walkway into the moat
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/24;for(let y=F+1;y<=F+8;y++){const [x,z]=[Math.round(CX+Math.cos(a)*32.6),Math.round(CZ+Math.sin(a)*32.6)];setB(x,y,z,B.LAVA);}
    for(let r=26;r<=32.6;r+=.4){const x=Math.round(CX+Math.cos(a)*r),z=Math.round(CZ+Math.sin(a)*r);setB(x,F,z,B.LAVA);setB(x,F-1,z,B.NETHERRACK);}}
  // bridges over the moat
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const px=-dz,pz=dx;for(let r=20;r<=28;r++)for(let w=-1;w<=1;w++){const x=CX+dx*r+px*w,z=CZ+dz*r+pz*w;setB(x,F,z,B.SBRICK);setB(x,F+1,z,0);}
    for(let r=20;r<=28;r+=2)for(const w of [-2,2])setB(CX+dx*r+px*w,F+1,CZ+dz*r+pz*w,B.SBR_SLAB);}
  // staircases: walkway -> lower stands (diagonals), lower stands -> upper stands (compass points)
  const stair=(x0,z0,dx,dz,y0,n,wide)=>{const px=-dz,pz=dx;for(let j=1;j<=n;j++)for(let w=0;w<wide;w++){const x=x0+dx*j+px*w,z=z0+dz*j+pz*w;
    for(let y=y0;y<y0+j-1;y++)setB(x,y+1,z,B.SBRICK);setB(x,y0+j,z,B.SBR_STAIRS+stairK(dx,dz));for(let y=y0+j+1;y<=y0+j+3;y++)setB(x,y,z,0);}};
  stair(CX+18,CZ+20,1,0,F,9,2);stair(CX-18,CZ+20,-1,0,F,9,2);stair(CX-18,CZ-21,-1,0,F,9,2);stair(CX+18,CZ-21,1,0,F,9,2);
  stair(CX+30,CZ-1,1,0,F+9,9,2);stair(CX-30,CZ,-1,0,F+9,9,2);stair(CX,CZ+30,0,1,F+9,9,2);stair(CX-1,CZ-30,0,-1,F+9,9,2);
  // corridors: chests in alcoves, torches, iron bar gates and redstone
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+Math.PI/12;const cx=Math.round(CX+Math.cos(a)*37.6),cz=Math.round(CZ+Math.sin(a)*37.6);chestAt(cx,F+1,cz,false,Math.atan2(-(CX-cx),-(CZ-cz))+Math.PI);
    const ux=Math.round(CX+Math.cos(a+Math.PI/12)*42.6),uz=Math.round(CZ+Math.sin(a+Math.PI/12)*42.6);chestAt(ux,F+10,uz,false,Math.atan2(-(CX-ux),-(CZ-uz))+Math.PI);
    const tx=Math.round(CX+Math.cos(a+Math.PI/24)*38),tz=Math.round(CZ+Math.sin(a+Math.PI/24)*38);if(!getB(tx,F+1,tz))setB(tx,F+1,tz,B.TORCH);
    const t2x=Math.round(CX+Math.cos(a-Math.PI/24)*43),t2z=Math.round(CZ+Math.sin(a-Math.PI/24)*43);if(!getB(t2x,F+10,t2z))setB(t2x,F+10,t2z,B.TORCH);
    const rx=Math.round(CX+Math.cos(a+Math.PI/12)*39.3),rz=Math.round(CZ+Math.sin(a+Math.PI/12)*39.3);setB(rx,F+4,rz,B.REDSTONE);setB(rx,F+5,rz,B.REDSTONE);
    if(i%3===0){const ga=a+Math.PI/12;for(let r=34.6;r<38.4;r+=.3){const x=Math.round(CX+Math.cos(ga)*r),z=Math.round(CZ+Math.sin(ga)*r);for(let y=F+3;y<=F+8;y++)if(!getB(x,y,z))setB(x,y,z,B.IRON_BARS);}}}
  // stepped sandstone pyramid in the middle, chests on top
  for(let k=0;k<5;k++){const h=6-k;for(let dx=-h;dx<=h;dx++)for(let dz=-h;dz<=h;dz++){const edge=Math.abs(dx)===h||Math.abs(dz)===h;setB(CX+dx,F+1+k,CZ+dz,edge&&k%2?B.SSANDSTONE:k===4&&!edge?B.CSANDSTONE:B.SANDSTONE);}}
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let y=F+6;y<=F+9;y++)setB(CX+dx,y,CZ+dz,0);
  setB(CX,F+6,CZ,B.GOLDB);placeChest(CX+1,F+6,CZ,true,false,-Math.PI/2);placeChest(CX-1,F+6,CZ,true,false,Math.PI/2);placeChest(CX,F+6,CZ+1,true,false,Math.PI);placeChest(CX,F+6,CZ-1,true,false,0);
  for(const [dx,dz] of [[2,2],[-2,2],[2,-2],[-2,-2]]){setB(CX+dx,F+6,CZ+dz,B.CSANDSTONE);setB(CX+dx,F+7,CZ+dz,B.TORCH);}
  reserved.push([CX,CZ,9]);
  // glowing braziers and a few chests out on the sand
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const x=Math.round(CX+Math.cos(a)*12),z=Math.round(CZ+Math.sin(a)*12);for(let y=F+1;y<=F+3;y++)setB(x,y,z,0);setB(x,F,z,B.GLOW);setB(x,F+1,z,B.NETHERRACK);setB(x,F+2,z,B.TORCH);reserved.push([x,z,2]);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const x=Math.round(CX+Math.cos(a)*16.5),z=Math.round(CZ+Math.sin(a)*16.5);for(let y=F+1;y<=F+3;y++)setB(x,y,z,0);setB(x,F,z,B.CSANDSTONE);chestAt(x,F+1,z,false,Math.atan2(-(CX-x),-(CZ-z))+Math.PI);}
  // the bones of a giant beast arching over the arena, its skull resting on the stands
  const spineY=x=>F+24+Math.round(13*(1-Math.pow((x-CX+3)/37,2)));
  for(let x=CX-40;x<=CX+33;x++){const y=spineY(x);for(let dy=0;dy<=1;dy++)for(let dz=0;dz<=1;dz++)setB(x,y+dy,CZ+dz,B.BONE);if((x-CX)%2===0)setB(x,y+2,CZ,B.BONE);
    if((x-CX)%4===0&&x>CX-30&&x<CX+28){const len=13-Math.round(Math.abs(x-CX)/5);for(const sg of [-1,1])for(let k=1;k<=len;k++){const z=sg<0?CZ-k:CZ+1+k;const yy=y-Math.round(k*k*.085);if(yy<F+8)break;setB(x,yy,z,B.BONE);if(k>3)setB(x,yy-1,z,B.BONE);}}}
  {const x0=CX+33,y0=spineY(CX+33)-4;for(let dx=0;dx<9;dx++)for(let dy=0;dy<9;dy++)for(let dz=-4;dz<=5;dz++){const shell=dx===0||dx===8||dy===0||dy===8||dz===-4||dz===5;if(!shell)continue;
      const eye=dx===0&&dy>=4&&dy<=5&&((dz>=-3&&dz<=-2)||(dz>=3&&dz<=4));const nose=dx===0&&dy===2&&dz>=0&&dz<=1;const mouth=dx===0&&dy===0&&(dz%2===0);if(eye||nose)setB(x0+dx,y0+dy,CZ+dz,B.COAL);else if(!mouth)setB(x0+dx,y0+dy,CZ+dz,B.BONE);}
    for(let dz=-3;dz<=4;dz++)setB(x0+1,y0+4,CZ+dz,B.GLOW);}
  for(let x=CX-46;x<CX-40;x++){const y=spineY(CX-40)-(CX-40-x)*2;setB(x,y,CZ,B.BONE);setB(x,y+1,CZ,B.BONE);}
  finishSurface();
  const central=squareSpawns(CX,CZ,5,F+3,16);
  return {sky:[.012,.012,.035],fog:[.02,.018,.04],fogDist:100,skyLight:true,skyMul:.45,dark:true,stars:true,noBeam:true,voidY:-12,central,spawns:spawnRing(CX,CZ,15,16,F+4),center:[CX,F+6,CZ]};
}

// ---------------- Temple: a ruined temple deep in a jungle cave (after the Battle key art) ----------------
// stepped stone-brick temple with a redstone block over the door, a lily-pad moat crossed by bridges and glowstone
// stepping stones, a jungle floor with trees and ruins, a gallery round the cave wall, wooden beams and hanging vines
function genTemple(){
  setDims(96,52,96);const s=7171;rs=s;const F=12,R=44,T0=F+1;
  const brick=(x,y,z)=>{const h=hash2(x*3+y,z,s);return h<.15?B.MSBRICK:h<.23?B.CRACKED:B.SBRICK;};
  const rock=(x,y,z)=>{const h=hash2(x,y*3+z,s+1);return h<.12?B.MOSSY:h<.3?B.COBBLE:h<.33?B.GRAVEL:B.STONE;};
  const ceil=(x,z)=>{const r=Math.hypot(x-CX,z-CZ)/R;return Math.min(WY-3,F+34-Math.floor(r*r*14+fbm(x*.08,z*.08,s+2)*5));};
  const m=(x,z)=>Math.max(Math.abs(x-CX),Math.abs(z-CZ));
  // the cave: solid rock hollowed into a dome
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const r=Math.hypot(x-CX,z-CZ);const wall=r+(fbm(x*.06,z*.06,s+3)-.5)*4;const top=ceil(x,z);
    for(let y=1;y<WY-1;y++)setB(x,y,z,rock(x,y,z));if(wall>=41.5)continue;
    for(let y=F+1;y<top;y++)setB(x,y,z,0);
    const n=fbm(x*.1,z*.1,s+4);
    if(r<11){setB(x,F,z,n<.32?B.MSBRICK:hash2(x,z,s+5)<.1?B.CRACKED:B.SBRICK);}                                  // temple island paving
    else if(r<19.5){setB(x,F,z,B.WATER);setB(x,F-1,z,B.WATER);setB(x,F-2,z,hash2(x,z,s+6)<.5?B.SAND:B.GRAVEL);}  // moat
    else if(r<21){setB(x,F,z,brick(x,F,z));}                                                                      // kerb
    else if(r<36){setB(x,F,z,n>.64?B.MOSSY:n>.52?B.DIRT:B.GRASS);setB(x,F-1,z,B.DIRT);
      if(n>.7&&r>23&&r<33){setB(x,F,z,B.DIRT);setB(x,F+1,z,B.GRASS);}}                                           // jungle floor, a few low mounds
    else{for(let y=F;y<=F+6;y++)setB(x,y,z,brick(x,y,z));}                                                        // gallery round the wall
  }
  // bridges over the moat (north/south/east/west) with slab kerbs
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const px=-dz,pz=dx;for(let r=10;r<=21;r++)for(let w=-1;w<=1;w++){const x=CX+dx*r+px*w,z=CZ+dz*r+pz*w;setB(x,F,z,brick(x,F,z));setB(x,F-1,z,B.STONE);setB(x,F+1,z,0);}
    for(let r=12;r<=19;r+=2)for(const w of [-2,2]){const x=CX+dx*r+px*w,z=CZ+dz*r+pz*w;if(r===14||r===18){setB(x,F,z,B.SBRICK);setB(x,F-1,z,B.STONE);setB(x,F+1,z,B.CHISELED);setB(x,F+2,z,B.TORCH);}else setB(x,F+1,z,B.SBR_SLAB);}}
  // big stepping stones on the diagonals: chiseled ring round a glowstone heart, flush with the water
  for(const [sx,sz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){const cx=CX+Math.round(sx*10.6),cz=CZ+Math.round(sz*10.6);
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const x=cx+dx,z=cz+dz,e=Math.max(Math.abs(dx),Math.abs(dz));if(Math.hypot(x-CX,z-CZ)<11)continue;
      setB(x,F,z,e===0?B.GLOW:e===1?(hash2(x,z,s+8)<.4?B.MSBRICK:B.SBRICK):B.CHISELED);setB(x,F-1,z,B.STONE);setB(x,F+1,z,0);}}
  // small mossy stepping stones dotted round the moat, and lily pads on the open water
  for(let i=0;i<40;i++){const a=srand()*Math.PI*2,r=12.5+srand()*6;const x=Math.round(CX+Math.cos(a)*r),z=Math.round(CZ+Math.sin(a)*r);if(getB(x,F,z)===B.WATER&&getB(x,F+1,z)===0){setB(x,F,z,srand()<.6?B.MSBRICK:B.MOSSY);setB(x,F-1,z,B.STONE);}}
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){if(getB(x,F,z)===B.WATER&&getB(x,F+1,z)===0&&hash2(x,z,s+7)<.09)setB(x,F+1,z,B.LILY);if(getB(x,F-1,z)===B.WATER&&(x*7+z*3)%9===0)setB(x,F-2,z,B.GLOW);}
  // ---- the temple ----
  for(let dx=-7;dx<=7;dx++)for(let dz=-7;dz<=7;dz++){const x=CX+dx,z=CZ+dz,e=Math.max(Math.abs(dx),Math.abs(dz));
    setB(x,T0,z,e===7?B.SBR_SLAB:brick(x,T0,z));if(e<=6)setB(x,T0+1,z,e===6?B.SBR_SLAB:brick(x,T0+1,z));}   // two half-block steps up to the floor
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){const x=CX+dx,z=CZ+dz,e=Math.max(Math.abs(dx),Math.abs(dz));
    for(let y=T0+2;y<=T0+10;y++)setB(x,y,z,e===5?((Math.abs(dx)===5&&Math.abs(dz)===5)?B.CHISELED:brick(x,y,z)):0);
    setB(x,T0+11,z,e===5?B.CHISELED:brick(x,T0+11,z));}
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){const px=-dz,pz=dx;   // doorways with chiseled frames
    for(let w=-1;w<=1;w++)for(let y=T0+2;y<=T0+5;y++)setB(CX+dx*5+px*w,y,CZ+dz*5+pz*w,0);
    for(let y=T0+2;y<=T0+6;y++)for(const w of [-2,2])setB(CX+dx*5+px*w,y,CZ+dz*5+pz*w,B.CHISELED);for(let w=-2;w<=2;w++)setB(CX+dx*5+px*w,T0+6,CZ+dz*5+pz*w,B.CHISELED);
    for(let w=-1;w<=1;w++)for(let y=T0+7;y<=T0+9;y++)setB(CX+dx*5+px*w,y,CZ+dz*5+pz*w,w===0&&y===T0+8?B.REDSTONE:B.CHISELED);
    for(const w of [-4,4])for(const y of [T0+3,T0+8])setB(CX+dx*5+px*w,y,CZ+dz*5+pz*w,B.GLOW);for(const w of [-2,2])setB(CX+dx*3+px*w,T0+16,CZ+dz*3+pz*w,B.GLOW);}   // the red block over each door
  setB(CX,T0+1,CZ,B.GLOW);for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]])placeChest(CX+dx,T0+2,CZ+dz,true,false,Math.atan2(-dx,-dz)+Math.PI);   // centre chests
  for(const [dx,dz] of [[3,3],[-3,3],[3,-3],[-3,-3]])setB(CX+dx,T0+2,CZ+dz,B.TORCH);
  for(let y=T0+2;y<=T0+10;y++)setB(CX+2,y,CZ-4,B.LADDER+ladderK(0,1));setB(CX+2,T0+11,CZ-4,0);   // ladder up to the roof
  for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=5;dz++){const e=Math.max(Math.abs(dx),Math.abs(dz));if(e===5&&(dx+dz)%2===0)setB(CX+dx,T0+12,CZ+dz,brick(CX+dx,T0+12,CZ+dz));}   // battlements
  for(const [dx,dz] of [[5,5],[-5,5],[5,-5],[-5,-5]]){setB(CX+dx,T0+12,CZ+dz,B.NETHERRACK);setB(CX+dx,T0+13,CZ+dz,B.TORCH);}   // braziers on the corners
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const x=CX+dx,z=CZ+dz,e=Math.max(Math.abs(dx),Math.abs(dz)),corner=Math.abs(dx)===3&&Math.abs(dz)===3;   // upper shrine
    for(let y=T0+12;y<=T0+18;y++)setB(x,y,z,e===3?(corner?B.CHISELED:brick(x,y,z)):0);setB(x,T0+19,z,brick(x,T0+19,z));if(e<=2)setB(x,T0+20,z,e===2?B.CHISELED:brick(x,T0+20,z));if(e<=1)setB(x,T0+21,z,e===0?B.GLOW:B.SBRICK);}
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]])for(let y=T0+12;y<=T0+14;y++)setB(CX+dx*3,y,CZ+dz*3,0);
  placeChest(CX,T0+12,CZ,true,false,0);for(const [dx,dz] of [[3,3],[-3,3],[3,-3],[-3,-3]])setB(CX+dx,T0+20,CZ+dz,B.TORCH);
  for(let i=0;i<70;i++){const dx=Math.round((srand()*2-1)*6),dz=Math.round((srand()*2-1)*6);const e=Math.max(Math.abs(dx),Math.abs(dz));if(e!==6&&e!==4)continue;if(Math.min(Math.abs(dx),Math.abs(dz))<=1)continue;   // keep the doors and red blocks clear   // vines down the walls
    const top=e===6?T0+10:T0+18,len=2+(srand()*5|0);for(let k=0;k<len;k++){const y=top-k;if(getB(CX+dx,y,CZ+dz)!==0||y<=T0+2)break;setB(CX+dx,y,CZ+dz,B.VINE);}}
  reserved.push([CX,CZ,12]);
  // ---- jungle floor: trees, ruined walls, lamp posts, chests ----
  const nearRoute=(x,z)=>Math.min(Math.abs(x-CX),Math.abs(z-CZ))<4;
  let trees=0;for(let t=0;t<400&&trees<11;t++){const a=srand()*Math.PI*2,r=24+srand()*9;const x=Math.round(CX+Math.cos(a)*r),z=Math.round(CZ+Math.sin(a)*r);if(nearRoute(x,z)||reserved.some(([rx,rz,rr])=>Math.hypot(rx-x,rz-z)<rr+3))continue;
    const g=floorAt(x,z,F+3),h=6+(srand()*3|0);for(let y=g+1;y<=g+h;y++)setB(x,y,z,B.JLOG);
    for(let dy=-2;dy<=1;dy++){const rad=dy===1?1:2.6;for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(Math.hypot(dx,dz)>rad||!(getB(x+dx,g+h+dy,z+dz)===0))continue;setB(x+dx,g+h+dy,z+dz,B.JLEAVES);
      if(dy===-2&&srand()<.3)for(let k=1;k<=1+(srand()*4|0);k++){if(getB(x+dx,g+h+dy-k,z+dz)!==0)break;setB(x+dx,g+h+dy-k,z+dz,B.VINE);}}}
    reserved.push([x,z,3]);trees++;}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const x=Math.round(CX+Math.cos(a)*27),z=Math.round(CZ+Math.sin(a)*27);   // ruins with a chest each
    const tx=Math.abs(Math.cos(a))>Math.abs(Math.sin(a))?0:1;for(let k=-3;k<=3;k++){const wx=x+(tx?k:0)-(tx?0:2*Math.sign(Math.cos(a))),wz=z+(tx?0:k)-(tx?2*Math.sign(Math.sin(a)):0);const g=floorAt(wx,wz,F+3);const hh=1+(hash2(wx,wz,s+9)*3|0);
      for(let y=g+1;y<=g+hh;y++)setB(wx,y,wz,brick(wx,y,wz));if(srand()<.35&&getB(wx,g+hh+1,wz)===0)setB(wx,g+hh+1,wz,B.SBR_SLAB);}
    const g=floorAt(x,z,F+3);for(let y=g+1;y<=g+3;y++)setB(x,y,z,0);chestAt(x,g+1,z,false,Math.atan2(-(CX-x),-(CZ-z))+Math.PI);reserved.push([x,z,3]);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+Math.PI/12;const x=Math.round(CX+Math.cos(a)*21.6),z=Math.round(CZ+Math.sin(a)*21.6);if(nearRoute(x,z))continue;   // lamp posts round the moat
    const g=floorAt(x,z,F+3);setB(x,g+1,z,B.FENCE);setB(x,g+2,z,B.FENCE);setB(x,g+3,z,B.TORCH);}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;const x=Math.round(CX+Math.cos(a)*9.6),z=Math.round(CZ+Math.sin(a)*9.6);setB(x,F,z,B.GLOW);}   // glowing paving at the island corners
  // ---- gallery round the cave wall: stairs up, railings, alcove chests below, chests and torches on top ----
  const stair=(x0,z0,dx,dz,y0,n,wide)=>{const px=-dz,pz=dx;for(let j=1;j<=n;j++)for(let w=0;w<wide;w++){const x=x0+dx*j+px*w,z=z0+dz*j+pz*w;
    for(let y=y0;y<y0+j-1;y++)setB(x,y+1,z,B.SBRICK);setB(x,y0+j,z,B.SBR_STAIRS+stairK(dx,dz));for(let y=y0+j+1;y<=y0+j+3;y++)setB(x,y,z,0);}};
  stair(CX+29,CZ-1,1,0,F,6,3);stair(CX-29,CZ+1,-1,0,F,6,3);stair(CX+1,CZ+29,0,1,F,6,3);stair(CX-1,CZ-29,0,-1,F,6,3);
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const r=Math.hypot(x-CX,z-CZ);if(r>=36&&r<36.9&&getB(x,F+7,z)===0&&!nearRoute(x,z)&&getB(x,F+6,z)&&BD[getB(x,F+6,z)].solid)setB(x,F+7,z,B.FENCE);}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const ax=Math.round(CX+Math.cos(a)*36.5),az=Math.round(CZ+Math.sin(a)*36.5);   // alcoves in the gallery face
    for(let k=-1;k<=1;k++)for(const d of [0,1])for(let y=F+1;y<=F+3;y++){const t=Math.abs(Math.cos(a))>Math.abs(Math.sin(a));const x=ax+(t?Math.sign(Math.cos(a))*d:k),z=az+(t?k:Math.sign(Math.sin(a))*d);setB(x,y,z,0);}
    const bx=ax+Math.round(Math.cos(a)),bz=az+Math.round(Math.sin(a));chestAt(bx,F+1,bz,false,Math.atan2(-(CX-bx),-(CZ-bz))+Math.PI);setB(ax,F+3,az,B.TORCH);setB(ax,F+1,az,0);
    const ux=Math.round(CX+Math.cos(a+Math.PI/8)*39.5),uz=Math.round(CZ+Math.sin(a+Math.PI/8)*39.5);if(i%2===0)chestAt(ux,F+7,uz,false,Math.atan2(-(CX-ux),-(CZ-uz))+Math.PI);
    const tx=Math.round(CX+Math.cos(a)*40),tz=Math.round(CZ+Math.sin(a)*40);if(getB(tx,F+7,tz)===0)setB(tx,F+7,tz,B.TORCH);}
  // ---- overhead: dark wooden beams across the cave, glowstone in the rock, vines hanging everywhere ----
  for(const o of [-15,14])for(let t=-41;t<=41;t++)for(let a=0;a<=1;a++)for(let b=0;b<=1;b++){for(const [x,z] of [[CX+t,CZ+o+a],[CX+o+a,CZ+t]]){const y=F+19+b;if(getB(x,y,z)===0)setB(x,y,z,B.SPRUCE_LOG);}}
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const r=Math.hypot(x-CX,z-CZ);if(r>41)continue;let y=WY-2;while(y>F&&getB(x,y,z)!==0)y--;if(y<=F+8)continue;   // y = top air cell under the roof
    const above=getB(x,y+1,z);if(hash2(x,z,s+11)<.04&&above&&above!==B.SPRUCE_LOG)setB(x,y+1,z,B.GLOW);
    if(hash2(x,z,s+12)<.07){const len=2+(hash2(x,z,s+13)*7|0);for(let k=0;k<len;k++){if(getB(x,y-k,z)!==0||y-k<=F+8)break;setB(x,y-k,z,B.VINE);}}}
  for(const o of [-16,16])for(let t=-38;t<=38;t+=3)for(const [x,z] of [[CX+t,CZ+o],[CX+o,CZ+t]])if(hash2(x,z,s+14)<.45){const len=1+(hash2(x,z,s+15)*5|0);for(let k=0;k<len;k++){const y=F+18-k;if(getB(x,y,z)!==0)break;setB(x,y,z,B.VINE);}}
  for(const o of [-15,14])for(let t=-36;t<=36;t+=9)for(const [x,z] of [[CX+t,CZ+o],[CX+o,CZ+t]])if(getB(x,F+18,z)===0&&Math.abs(t)>8){setB(x,F+18,z,B.FENCE);setB(x,F+17,z,B.GLOW);}   // hanging lamps
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const x=Math.round(CX+Math.cos(a)*40),z=Math.round(CZ+Math.sin(a)*40);if(getB(x,F+7,z)===0)setB(x,F+7,z,B.TORCH);}   // gallery torches
  barrierWalls();finishSurface();
  const central=spawnRing(CX,CZ,10,16,F+3),spawns=spawnRing(CX,CZ,28,16,F+4);
  return {sky:[.035,.045,.035],fog:[.05,.065,.05],fogDist:88,skyLight:false,dark:true,ambient:.2,noBeam:true,voidY:-12,central,spawns,center:[CX,T0+2,CZ]};
}
