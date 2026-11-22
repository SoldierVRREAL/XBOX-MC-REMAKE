// ================= blocks =================
const B={ICE:33,SLIME:34,SOUL:35,WEB:36,LADDER:37,SLAB:41,STAIRS:42,TGRASS:30,POPPY:31,DANDELION:32,AIR:0,GRASS:1,DIRT:2,STONE:3,LOG:4,LEAVES:5,PLANKS:6,SAND:7,CHEST:8,COBBLE:9,BRICK:10,GLASS:11,WOOL:12,GRAVEL:13,MOSSY:14,
  WATER:15,LAVA:16,GLOW:17,BONE:18,SANDSTONE:19,SBRICK:20,MSBRICK:21,CHISELED:22,GOLDB:23,DIAMONDB:24,EMERALDB:25,OBSIDIAN:26,NETHERRACK:27,BARRIER:28,BEACON:29};
const BD=[];
function def(id,top,side,bottom,o={}){BD[id]=Object.assign({top,side,bottom,front:side,solid:true,opaque:true,liquid:false,light:0,render:true},o);}
def(1,0,1,2);def(2,2,2,2);def(3,3,3,3);def(4,5,4,5);def(5,6,6,6,{opaque:false});def(6,7,7,7);def(7,8,8,8);
def(8,10,9,10,{front:11});def(9,12,12,12);def(10,13,13,13);def(11,14,14,14,{opaque:false});def(12,15,15,15);def(13,16,16,16);def(14,17,17,17);
def(15,18,18,18,{solid:false,opaque:false,liquid:'water'});def(16,19,19,19,{solid:false,opaque:false,liquid:'lava',light:15});
def(17,20,20,20,{light:15});def(18,22,21,22);def(19,24,23,33);def(20,25,25,25);def(21,26,26,26);def(22,27,27,27);
def(23,28,28,28);def(24,29,29,29);def(25,30,30,30);def(26,31,31,31);def(27,32,32,32);def(28,0,0,0,{opaque:false,render:false});
def(29,34,34,34,{opaque:false,light:15,shape:[[2/16,.002,2/16,14/16,3/16,14/16,31],[3/16,3/16,3/16,13/16,13/16,13/16,34],[0,0,0,1,1,1,14]]});
for(const [id,t] of [[30,35],[31,36],[32,37]])def(id,t,t,t,{solid:false,opaque:false,cross:true});
// movement blocks: ice, slime, soul sand, cobweb, ladders (4 facings), stone slab, cobblestone stairs (4 facings)
const sideBox=(k,t)=>[[0,0,0,1,1,t],[1-t,0,0,1,1,1],[0,0,1-t,1,1,1],[0,0,0,t,1,1]][k];
const stairTop=k=>[[0,.5,0,1,1,.5],[.5,.5,0,1,1,1],[0,.5,.5,1,1,1],[0,.5,0,.5,1,1]][k];
def(33,38,38,38,{opaque:false});def(34,39,39,39,{opaque:false});def(35,40,40,40,{col:[[0,0,0,1,.875,1]]});def(36,41,41,41,{solid:false,opaque:false,cross:true});
for(let k=0;k<4;k++)def(37+k,42,42,42,{opaque:false,ladder:true,shape:[sideBox(k,1/16)],col:[sideBox(k,.125)]});
def(41,44,43,44,{opaque:false,shape:[[0,0,0,1,.5,1]],col:[[0,0,0,1,.5,1]]});
for(let k=0;k<4;k++)def(42+k,12,12,12,{opaque:false,shape:[[0,0,0,1,.5,1],stairTop(k)],col:[[0,0,0,1,.5,1],stairTop(k)]});
def(8,10,9,10,{front:11,opaque:false,render:false,tileEnt:true,shape:[[1/16,0,1/16,15/16,14/16,15/16]],col:[[1/16,0,1/16,15/16,14/16,15/16]]});
const BLOCK_NAMES={1:'Grass Block',2:'Dirt',3:'Stone',4:'Oak Log',5:'Oak Leaves',6:'Oak Planks',7:'Sand',9:'Cobblestone',10:'Bricks',11:'Glass',12:'Red Wool',13:'Gravel',14:'Mossy Cobblestone',
  17:'Glowstone',18:'Bone Block',19:'Sandstone',20:'Stone Bricks',21:'Mossy Stone Bricks',22:'Chiseled Stone Bricks',23:'Block of Gold',24:'Block of Diamond',25:'Block of Emerald',26:'Obsidian',27:'Netherrack'};
const BLOCK_COL={1:'#5f9f35',2:'#866043',3:'#7f7f7f',4:'#665032',5:'#3a8228',6:'#a2824e',7:'#dbcfa3',8:'#9c6c2c',9:'#7a7a7a',10:'#964a3a',11:'#d8f0f5',12:'#cc3430',13:'#8c8682',14:'#62784a',
  15:'#3f6fe0',16:'#e8701a',17:'#f2d07a',18:'#e6e0cc',19:'#d8cb94',20:'#7c7c7c',21:'#6c7a5a',22:'#7a7a7a',23:'#f5d43a',24:'#5fe3d6',25:'#3fd46a',26:'#1c1426',27:'#7a2e2e',29:'#7fe9e0'};
// pack texture names for each atlas tile
const TILE_PACK=['grass_block_top','grass_block_side','dirt','stone','oak_log','oak_log_top','oak_leaves','oak_planks','sand','~chest_side','~chest_top','~chest_front','cobblestone','bricks','glass','red_wool',
  'gravel','mossy_cobblestone','water_still','lava_still','glowstone','bone_block_side','bone_block_top','sandstone','sandstone_top','stone_bricks','mossy_stone_bricks','chiseled_stone_bricks','gold_block','diamond_block','emerald_block','obsidian',
  'netherrack','sandstone_bottom','beacon','short_grass','poppy','dandelion','ice','slime_block','soul_sand','cobweb','ladder','smooth_stone_slab_side','smooth_stone'];
let TILE=16;const ACOLS=8;
let atlasCanvas=null;
// vanilla-style 16x16 tiles: small palettes + clustered noise, drawn from scratch
const PAL=s=>s.split(' ').map(h=>{const n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255];});
const P={grass:PAL('4f7d29 5e9132 6aa03a 77ad42 84ba4b'),dirt:PAL('593d26 6b4a30 7a573a 8b6645 9b7651'),stone:PAL('686868 747474 7f7f7f 898989 959595'),
  bark:PAL('3a2b19 4a3720 5a4429 6b5332'),ring:PAL('9a7442 ac8550 bd965f'),leaf:PAL('2a5418 346421 3f752a 4b8533 579540'),plank:PAL('6a512f 7d6039 8f6e42 a07c4b b08a55'),
  sand:PAL('cdbf86 d6c992 ddd29d e4daa8'),brick:PAL('7d3326 8f3f2f 9f4a37 b05a42'),wool:PAL('8e2420 9c2a25 a8302b b6392f'),gravel:PAL('5c5654 6e6865 827c78 958f8b a9a39e 7a6d68'),
  moss:PAL('3f5f2a 4d7134 5b833e'),water:PAL('2c55c8 3361d4 3a6ddd 4479e6'),lava:PAL('b83a08 d4540c e8701a f39a2a fbc84a'),glow:PAL('8a5a22 b98130 e2b54a f5d77a fff0b0'),
  bone:PAL('cfc8b0 dcd6c0 e6e0cc efeadb'),sst:PAL('cbb97c d5c48a ddcd96 e4d6a2'),sbr:PAL('6a6a6a 767676 828282 8d8d8d'),gold:PAL('c9a21c e2bd2a f5d43a fbe86a fff5b0'),
  dia:PAL('1c9e96 2fbdb4 4fd8cf 7ae8e0 c8fff8'),eme:PAL('0e7a32 17a043 2bc25a 5ee088 b6ffd0'),obs:PAL('0d0a14 150f20 1d1530 2a1e45 3d2a66'),nr:PAL('5a1e1e 6e2626 7e2d2d 8e3434 a04040'),
  tg:PAL('3c6a20 4b7d29 5c9132 6fa63e')};
const pk=(pal,v)=>pal[Math.min(pal.length-1,Math.max(0,Math.floor(v*pal.length)))];
const cl=(x,y,s,sc=4)=>fbm(x/sc,y/sc,s,2)*.65+hash2(x,y,s+99)*.35; // clustered noise 0..1
function cobbleAt(x,y,seed){ // voronoi stones with dark outlines
  let d1=9,d2=9,id=0;for(let i=0;i<9;i++){const cx=hash2(i,1,seed)*16,cy=hash2(i,2,seed)*16;for(const ox of [-16,0,16])for(const oy of [-16,0,16]){const d=Math.hypot(x+.5-cx-ox,y+.5-cy-oy);if(d<d1){d2=d1;d1=d;id=i;}else if(d<d2)d2=d;}}
  return {edge:d2-d1<1.1,id,d1};
}
function procTile(t,x,y){
  const h=hash2;
  switch(t){
  case 0:return pk(P.grass,cl(x,y,1,3));
  case 1:{const fr=3+(h(x,0,2)<.5?1:0)+(h(x,1,2)<.25?1:0);if(y<fr)return pk(P.grass,cl(x,y,1,3));return pk(P.dirt,cl(x,y,4,3));}
  case 2:return pk(P.dirt,cl(x,y,4,3));
  case 3:return pk(P.stone,cl(x,y,6,2.5));
  case 4:{const col=Math.floor((x+h(Math.floor(y/5),x>>2,7)*2));const v=h(col,Math.floor(y/(3+h(col,0,8)*5)),9);return pk(P.bark,(x%3==0?.1:.5)+v*.5);}
  case 5:{if(x==0||y==0||x==15||y==15)return pk(P.bark,h(x,y,10)*.8);const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));return pk(P.ring,((d|0)%2?.15:.75)+h(x,y,11)*.25);}
  case 6:{const v=cl(x,y,12,2);if(h(x,y,13)<.18&&v<.55)return [0,0,0,0];return pk(P.leaf,v);}
  case 7:{const row=y>>2;const seam=y%4==3;const end=(x+(row*5)%16)%16==0;if(seam)return pk(P.plank,0);if(end)return pk(P.plank,.15);
    const nail=(y%4==1)&&((x+(row*5))%16==2||(x+(row*5))%16==13);if(nail)return pk(P.plank,.1);return pk(P.plank,.35+cl(x*3,row,14,4)*.65);}
  case 8:return pk(P.sand,cl(x,y,15,2));
  case 9:case 10:case 11:{const ch=PAL('3c2a12 5e3f18 7a5420 94672a a97a35');const b=x==0||y==0||x==15||y==15;const band=t!=10&&(y==5||y==6);
    if(t==11&&x>=7&&x<=8&&y>=4&&y<=7)return y==4||y==7?[60,60,60]:[200,200,200];if(t==11&&x>=6&&x<=9&&y>=4&&y<=8)return [40,40,40];
    if(b)return ch[0];if(band)return ch[1];return pk(ch,.45+h(x,y>>1,16)*.55);}
  case 12:case 17:{const c=cobbleAt(x,y,17);if(c.edge)return [52,52,52];if(t==17&&cl(x,y,18,2)<.45)return pk(P.moss,h(x,y,19));return pk(P.stone,.2+h(c.id,0,20)*.5+(c.d1<2?.25:0)-(c.d1>3.5?.15:0));}
  case 13:{const row=y>>2,off=(row%2)*4;const mortar=y%4==3||((x+off)%8==7);if(mortar)return [168,164,152];return pk(P.brick,.3+h((x+off)>>3,row,21)*.4+(y%4==0?.3:0));}
  case 14:{const b=x==0||y==0||x==15||y==15;if(b)return[215,238,244,255];if((x==y-1||x==y-2)&&x>1&&x<7)return[255,255,255,220];if(x==12&&y==3)return[255,255,255,220];return[0,0,0,0];}
  case 15:return pk(P.wool,.3+cl(x,y,22,1.5)*.7);
  case 16:return pk(P.gravel,h(x>>1<<1,y>>1<<1,23)*.7+h(x,y,24)*.3);
  case 18:{const v=Math.sin((x*.9+y*.35))*.5+.5;const p=pk(P.water,v*.6+h(x,y,25)*.4);return [p[0],p[1],p[2],185];}
  case 19:return pk(P.lava,fbm(x*.22,y*.22,26,2)*.8+h(x,y,27)*.25);
  case 20:{const c=cobbleAt(x,y,28);return c.edge?pk(P.glow,.1):pk(P.glow,.45+h(c.id,1,29)*.4+(c.d1<1.5?.2:0));}
  case 21:return pk(P.bone,(x%4==0||x%4==3)?.15:.6+h(x,y,30)*.4);
  case 22:{const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5));return pk(P.bone,d>6.5?.1:(d|0)%3==0?.3:.85);}
  case 23:{const band=y==3||y==4||y==10||y==11;return pk(P.sst,band?.1:y<3||y>12?.7:.45+h(x,y,31)*.3);}
  case 24:return pk(P.sst,.4+cl(x,y,32,3)*.6);
  case 33:return pk(P.sst,.2+cl(x,y,33,3)*.5);
  case 25:case 26:case 27:{const row=y>>3,off=(row%2)*8;const m=y%8==7||((x+off)%16==15);
    if(t==27){const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5))|0;return pk(P.sbr,d==7?0:d==6?.9:d==4?.1:d==2?.9:.5);}
    if(m)return pk(P.sbr,0);if(t==26&&cl(x,y,34,2)<.42)return pk(P.moss,h(x,y,35));return pk(P.sbr,.3+cl(x,y,36,3)*.6+(y%8==0?.2:0));}
  case 28:case 29:case 30:{const pal=t==28?P.gold:t==29?P.dia:P.eme;const b=x==0||y==0||x==15||y==15,b2=x==1||y==1||x==14||y==14;
    if(b)return pk(pal,x==0||y==0?.75:.05);if(b2)return pk(pal,.3);if(t==30&&(x%4==0||y%4==0))return pk(pal,.25);return pk(pal,.45+h(x,y,37)*.35+((x+y)%7==0?.2:0));}
  case 31:return pk(P.obs,h(x,y,38)<.08?.95:cl(x,y,39,2)*.75);
  case 32:return pk(P.nr,cl(x,y,40,1.6));
  case 34:{const b=x==0||y==0||x==15||y==15;if(b)return[200,245,245,255];if(x>=4&&x<12&&y>=4&&y<12)return (x==4||y==4||x==11||y==11)?[60,180,175,255]:[120,250,240,255];return [0,0,0,0];}
  case 35:{const bl=[2,5,8,11,13];for(const bx of bl){const top=4+((bx*7)%6);const lean=Math.round((y-15)*.12*((bx%2)?1:-1));if(x===bx+lean&&y>=top)return pk(P.tg,.2+y/20);}return [0,0,0,0];}
  case 36:{if(x>=7&&x<=8&&y>=7)return [62,110,30];if(y>=9&&y<=10&&(x==6||x==9))return [62,110,30];const d=Math.hypot(x-7.5,y-5);if(d<3)return d<1.1?[60,20,10]:[200,30,30];return [0,0,0,0];}
  case 38:{const v=h(x>>1,y>>1,41);const streak=(x+y*2)%11===0;return streak?[220,235,255,230]:[120+v*30|0,160+v*30|0,235,200];}
  case 39:{const b=x==0||y==0||x==15||y==15||((x==3||x==12)&&y>2&&y<13)||((y==3||y==12)&&x>2&&x<13);return b?[80,160,60,230]:[110+h(x,y,42)*30|0,200,95,190];}
  case 40:{const v=cl(x,y,43,2);const face=(x%6==2||x%6==3)&&(y%5==2);return face?[40,28,20]:[80+v*35|0,60+v*25|0,45+v*20|0];}
  case 41:{const d=Math.abs(x-y)<=0||Math.abs(x+y-15)<=0||y==8||x==8||Math.abs(Math.hypot(x-7.5,y-7.5)-5)<.5;return d&&h(x,y,44)>.1?[225,225,225,220]:[0,0,0,0];}
  case 42:{const rail=x==2||x==3||x==12||x==13;const rung=(y%4==1)&&x>3&&x<12;return rail||rung?pk(P.plank,rail?.35+h(x,y,45)*.3:.7):[0,0,0,0];}
  case 43:return pk(P.stone,y==0||y==15?.85:y==7||y==8?.1:.55+h(x,y,46)*.2);
  case 44:return pk(P.stone,x==0||y==0||x==15||y==15?.2:.6+h(x,y,47)*.15);
  case 37:{if(x>=7&&x<=8&&y>=8)return [62,110,30];if(y==11&&(x==6||x==9))return [62,110,30];const d=Math.hypot(x-7.5,y-5.5);if(d<2.8)return d<1.1?[240,170,20]:[250,225,40];return [0,0,0,0];}
  }
  return [255,0,255];
}
function makeProcAtlas(){
  const c=mkCanvas(ACOLS*16,ACOLS*16);const g=c.getContext('2d');const img=g.createImageData(c.width,c.height);
  for(let t=0;t<TILE_PACK.length;t++){const tx=(t%ACOLS)*16,ty=Math.floor(t/ACOLS)*16;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){const p=procTile(t,x,y);const i=((ty+y)*c.width+tx+x)*4;img.data[i]=p[0];img.data[i+1]=p[1];img.data[i+2]=p[2];img.data[i+3]=p[3]===undefined?255:p[3];}}
  g.putImageData(img,0,0);return c;
}
atlasCanvas=makeProcAtlas();
