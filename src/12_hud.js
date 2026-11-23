// ================= HUD (console Battle layout) =================
// 9x9 HUD icons drawn in the Java Edition style (outline k, fill, highlight w, shade d)
const ICON9={heart:['.kk...kk.','kwrkkkrrk','kwrrrrrdk','krrrrrrdk','.krrrrdk.','..krrdk..','...kdk...','....k....','.........'],
  shank:['....kkkk.','...kmmmmk','..kmmmmmk','..kmmmmdk','..kmmmdk.','.kkkddk..','kbbk.k...','kbk......','.k.......'],
  armor:['kkkk.kkkk','kwwwkwwak','kwwwwwwak','.kwwwwak.','.kwwwwak.','.kwwwwak.','.kwwwwak.','.kkkkkkk.','.........']};
function icon9(pat,x,y,s,frac,pal,flip){
  const draw=(mode)=>pat.forEach((r,j)=>{for(let i=0;i<9;i++){const c=r[i];if(c==='.')continue;let col=c==='k'?'#000':mode==='empty'?pal.e:pal[c];if(!col)continue;hc.fillStyle=col;hc.fillRect(x+i*s,y+j*s,s,s);}});
  draw('empty');if(frac>0){hc.save();hc.beginPath();const w=9*s;if(flip)hc.rect(x+w*(1-frac),y,w*frac,9*s);else hc.rect(x,y,w*frac,9*s);hc.clip();draw('full');hc.restore();}
}
const HEART_PAL={e:'#2b2b2b',r:'#e2161b',d:'#a40e12',w:'#ffd0d0'},POISON_PAL={e:'#2b2b2b',r:'#8aa61e',d:'#5e7514',w:'#e0f0a0'},ABS_PAL={e:'#2b2b2b',r:'#e8c21c',d:'#b08a10',w:'#fff2a0'},
  FOOD_PAL={e:'#2b2b2b',m:'#b5592a',d:'#7a3416',b:'#e8e0c8'},ARMOR_PAL={e:'#2b2b2b',w:'#d8d8d8',a:'#8a8a8a'};
function spr(name,x,y,w,h){const im=PACK.gui[name];if(!im)return false;hc.drawImage(im,x,y,w,h);return true;}
const HFONT="'VT323','Courier New',monospace";
let FONT=null;
function initFont(){const img=PACK.font;const g=img.getContext('2d');const d=g.getImageData(0,0,128,128).data;const widths=[];
  for(let c=0;c<256;c++){const cx=(c%16)*8,cy=Math.floor(c/16)*8;let w=0;for(let x=7;x>=0&&!w;x--)for(let y=0;y<8;y++)if(d[((cy+y)*128+cx+x)*4+3]>0){w=x+1;break;}widths[c]=c===32?4:w?w+1:0;}
  FONT={img,widths,cache:{}};}
function fontSheet(col){if(FONT.cache[col])return FONT.cache[col];const c=mkCanvas(128,128),g=c.getContext('2d');g.drawImage(FONT.img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,128,128);return FONT.cache[col]=c;}
const FONT_MAP={'✓':'+','·':'-','±':'+-','—':'-','’':"'"};
function bmpWidth(t,sc){let w=0;for(const ch of t){const s=FONT_MAP[ch]||ch;for(const c of s){const k=c.charCodeAt(0);w+=(k<256?FONT.widths[k]:6)*sc;}}return w;}
function bmpText(t,x,y,size,col,align){const sc=Math.max(1,Math.round(size/9));const w=bmpWidth(t,sc);if(align==='center')x-=w/2;else if(align==='right')x-=w;x=Math.round(x);y=Math.round(y-7*sc);
  const sh=hexRGBs(col);const shadow=fontSheet(sh),main=fontSheet(col);for(const pass of [shadow,main]){let cx=x+(pass===shadow?sc:0),cy=y+(pass===shadow?sc:0);
    for(const ch of t){const s=FONT_MAP[ch]||ch;for(const c of s){const k=c.charCodeAt(0);if(k>=256){cx+=6*sc;continue;}hc.drawImage(pass,(k%16)*8,Math.floor(k/16)*8,8,8,cx,cy,8*sc,8*sc);cx+=FONT.widths[k]*sc;}}}}
function hexRGBs(col){const m=/^#([0-9a-f]{6})$/i.exec(col);if(!m)return '#3f3f3f';const n=parseInt(m[1],16);return `rgb(${((n>>16)&255)>>2},${((n>>8)&255)>>2},${(n&255)>>2})`;}
function txt(t,x,y,size,col='#fff',align='left'){if(FONT){bmpText(String(t),x,y,size*1.15,col.length===4?'#'+col[1]+col[1]+col[2]+col[2]+col[3]+col[3]:col,align);return;}size=Math.round(size*1.3);hc.font=`${size}px ${HFONT}`;hc.textAlign=align;const sh=Math.max(1,size/12|0);hc.fillStyle='rgba(40,40,40,.95)';hc.fillText(t,x+sh,y+sh);hc.fillStyle=col;hc.fillText(t,x,y);}
let mmCanvas=null;
function buildMinimap(){mmCanvas=mkCanvas(WX,WZ);const g=mmCanvas.getContext('2d');const im=g.createImageData(WX,WZ);
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){let y=WY-1;while(y>0&&(!getB(x,y,z)||getB(x,y,z)===B.BARRIER))y--;const b=getB(x,y,z);let col=[20,20,30];if(b){const c=hexRGB(BLOCK_COL[b]||'#888');const k=.65+y/WY*.7;col=[c[0]*255*k,c[1]*255*k,c[2]*255*k];}
    const i=(z*WX+x)*4;im.data[i]=col[0];im.data[i+1]=col[1];im.data[i+2]=col[2];im.data[i+3]=255;}g.putImageData(im,0,0);}
function project(p){const q=xform(VP,p);if(q[3]<=0)return null;return [(q[0]/q[3]*.5+.5)*W,(1-(q[1]/q[3]*.5+.5))*H];}
function nameTag(e,col){const p=project([e.pos[0],e.pos[1]+(e.bat?.6:2.05),e.pos[2]]);if(!p)return;hc.font="18px "+HFONT;const tw=hc.measureText(e.name).width;
  hc.fillStyle='rgba(0,0,0,.45)';hc.fillRect(p[0]-tw/2-4,p[1]-15,tw+8,18);hc.textAlign='center';hc.fillStyle=col||'#fff';hc.fillText(e.name,p[0],p[1]-2);}
function drawHUD(){
  hc.setTransform(DPR,0,0,DPR,0,0);hc.clearRect(0,0,W,H);hc.imageSmoothingEnabled=false;
  if(MATCH.state==='menu'||!player)return;
  if(hideGui||loadingUp()||!$('results').classList.contains('hidden'))return;   // the loading screen and scoreboard cover the HUD, as on console
  if(showDebug)drawDebug();else if(OPT.showFps)drawFps();
  // name tags: lobby shows everyone; in Battle they are hidden until Showdown reveals the survivors
  for(const e of ents){if(e===player||!e.alive)continue;
    if(MATCH.state==='lobby'){if(dist(camPos,e.pos)<64)nameTagMC(e,e.ready?'#77ff77':'#ffffff');}
    else if(MATCH.mode==='battle'&&MATCH.showdown)nameTagMC(e,PLAYER_COLORS[e.color%16]);
    else if(MATCH.mode==='battle'&&dist(camPos,e.pos)<6&&!e.effects.invis&&los(camPos,eye(e)))nameTag(e);}
  if(MATCH.state==='lobby')drawLobbyHud();
  else if(showDebug){}
  else if(MATCH.mode==='br')drawBRHud();
  else drawBattleTop();
  // kill feed
  // kill messages and chat share the console chat area: left side, just above the HUD, newest at the bottom
  {const G=hudGeom(),x0=Math.round(W*.05),lh=20,lines=[];for(let i=feed.length-1;i>=0;i--)lines.push([feed[i].txt,'#ffffff',Math.min(1,feed[i].t)]);
    for(const c of chat)lines.push([c.txt,c.col&&c.col.length>=4?c.col:'#ffffff',chatUI?1:Math.min(1,c.t)]);const by=chatUI?H-40:G.top;
    lines.forEach(([t,col,a],i)=>{if(a<=0)return;const y=by-(lines.length-1-i)*lh;hc.globalAlpha=a;if(chatUI){hc.fillStyle='rgba(0,0,0,.5)';hc.fillRect(x0-4,y-lh+4,Math.min(W*.6,640),lh);}txt(t,x0,y,14,col,'left');});hc.globalAlpha=1;}
  if(msgs.length){const m=msgs[msgs.length-1];hc.globalAlpha=Math.min(1,m.t);txt(m.txt,W/2,H/2-80,44,'#ffd54a','center');if(m.sub)txt(m.sub,W/2,H/2-48,18,'#fff','center');hc.globalAlpha=1;}
  drawPrompts();drawBlockHint();
  if(MATCH.state==='play'&&MATCH.preT>0&&MATCH.mode!=='battle'){const n=Math.ceil(MATCH.preT);txt(`Time to start: ${n} second${n===1?'':'s'}`,W/2,30,18,'#fff','center');}
  if(!player.alive){drawBatHud();return;}
  if(player.fire>0){const g=hc.createLinearGradient(0,H,0,H*.5);g.addColorStop(0,'rgba(255,120,0,.45)');g.addColorStop(1,'rgba(255,120,0,0)');hc.fillStyle=g;hc.fillRect(0,0,W,H);}
  if(fluidAt(camPos[0],camPos[1],camPos[2])==='water'){hc.fillStyle='rgba(30,60,200,.35)';hc.fillRect(0,0,W,H);}
  if(fluidAt(camPos[0],camPos[1],camPos[2])==='lava'){hc.fillStyle='rgba(255,90,0,.75)';hc.fillRect(0,0,W,H);}
  if(MATCH.state==='play'&&!inZone(player.pos,false)){const g=hc.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);g.addColorStop(0,'rgba(255,0,0,0)');g.addColorStop(1,'rgba(255,0,0,.45)');hc.fillStyle=g;hc.fillRect(0,0,W,H);}
  // crosshair
  // crosshair: DOM element #xhair (difference blend, like vanilla's inverted crosshair)
  if(MATCH.state==='play'&&locked&&!chestOpen&&lookChest())txt('[RMB] Open chest',W/2,H/2+34,14,'#fff','center');
  if(player.using&&player.using!=='block'){const pr=player.using==='bow'?bowCharge(player.useT):Math.min(1,player.useT/1.6);hc.fillStyle='rgba(0,0,0,.6)';hc.fillRect(W/2-30,H/2+14,60,6);hc.fillStyle=player.using==='bow'&&pr>=1?'#ffd54a':'#fff';hc.fillRect(W/2-30,H/2+14,60*pr,6);}
  drawHotbar();if(OPT.animChar===false)drawArmorDoll();drawEffects();   // the animated character (11_render.js) shows armour otherwise
}
// console HUD layout (TV safe zone): hotbar about 42% of a 16:9 screen wide, raised off the bottom edge, prompts underneath
function hudGeom(){const S=Math.round(Math.min(H*.084,(W-20)/9.5,76)),hx=Math.round(W/2-S*4.5),hy=Math.round(H*.87-S);const s=Math.max(2,Math.floor(S/16));
  const barH=Math.max(4,Math.round(S*.11)),barTop=hy-Math.round(S*.2)-barH,hy2=barTop-Math.round(S*.12)-9*s;return {S,hx,hy,s,barH,barTop,hy2,top:hy2-9*s-12};}
// in-game tooltips (console "In-Game Tooltips"): look at a block for a moment and a panel in the top right names it, once per block type per session
const BLOCK_TIPS={1:'A block of dirt with grass growing on top.',2:'Common soil found under the grass.',3:'Solid rock found all over the world.',4:'A section of an oak tree trunk.',
  5:'Leaves from an oak tree.',6:'Wooden boards cut from oak logs.',7:'Fine sand from beaches and deserts.',8:['Chest','Holds items. Battle chests are stocked with gear and get refilled during the round.'],
  9:'Rough, broken stone.',10:'Fired clay bricks stacked into a sturdy block.',11:'A clear block you can see straight through.',12:'Soft dyed wool.',13:'Loose stones and grit.',
  14:'Cobblestone overgrown with moss.',17:'A glowing block that lights up everything around it.',18:'A block of packed bones.',19:'Sand pressed into solid stone.',20:'Stone cut into neat bricks.',
  21:'Old stone bricks covered in moss.',22:'Stone bricks carved with a decorative pattern.',23:'A solid block of shiny gold.',24:'A solid block of diamonds. Nice to look at, but it stays here.',
  25:'A solid block of emeralds.',26:'Dark volcanic glass, one of the toughest blocks there is.',27:'Crumbly red rock from the Nether.',
  33:['Ice','Slippery frozen water. You slide further when you run across it.'],34:['Slime Block','A bouncy block: land on it to spring back up, unless you are sneaking.'],
  35:['Soul Sand','Grainy sand that slows down anything walking over it.'],36:['Cobweb','Sticky web that slows you right down while you are inside it.'],
  41:['Slab','Half a block tall, so you can step up onto it.'],42:['Stairs','Walk up a level without jumping.'],46:'Walk up a level without jumping.',50:'Half a block tall, so you can step up onto it.',
  51:'A section of a spruce tree trunk.',52:'Wooden boards cut from spruce logs.',53:'A barrier you can see over but cannot jump.',56:'Metal bars that block the way but let you see through.',
  57:'Smooth white quartz.',58:'Leaves from a jungle tree.',59:'Coal packed into a solid block.',60:'Stone bricks that have cracked with age.',61:'Sandstone carved with a pattern.',
  62:'Sandstone polished smooth.',63:'A block that gives off a constant redstone signal.',64:'A section of a jungle tree trunk.',65:'Half a block of sandstone.',66:'Half a block of stone bricks.',
  67:'Stone brick steps.',71:'Soft white wool.',72:'Spruce wood steps.',76:'Leafy vines hanging from the cave roof. You can walk straight through them.',77:'Floats on the water. Light enough to step across, if you are careful.'};
const HINT_SEEN=new Set();let hintCur=null,hintLook=null,hintLookT=0;
function wrapText(s,maxW,size){const meas=t=>{if(FONT)return bmpWidth(t,Math.max(1,Math.round(size*1.15/9)));hc.font=`${Math.round(size*1.3)}px ${HFONT}`;return hc.measureText(t).width;};
  const out=[];let cur='';for(const w of String(s).split(' ')){const t=cur?cur+' '+w:w;if(meas(t)>maxW&&cur){out.push(cur);cur=w;}else cur=t;}if(cur)out.push(cur);return out;}
function drawBlockHint(){
  const able=OPT.tips!==false&&player&&player.alive&&!chestOpen&&(MATCH.state==='play'&&!(MATCH.preT>0)||MATCH.state==='lobby')&&(locked||padActive||touchActive);
  if(!able)hintLook=null;
  else{const h=raycastBlock(eye(player),fwd(player),5);const b=h?h.b:0;
    if(b&&BLOCK_TIPS[b]&&!HINT_SEEN.has(b)){if(hintLook===b)hintLookT+=dtFrame;else{hintLook=b;hintLookT=0;}if(hintLookT>.6){HINT_SEEN.add(b);hintCur={b,t:5};hintLook=null;}}else hintLook=null;}
  if(!hintCur)return;hintCur.t-=dtFrame;if(hintCur.t<=0){hintCur=null;return;}
  const tip=BLOCK_TIPS[hintCur.b],name=Array.isArray(tip)?tip[0]:(BLOCK_NAMES[hintCur.b]||''),desc=Array.isArray(tip)?tip[1]:tip;
  const w=Math.round(Math.min(W*.4,500)),x=Math.round(W*.955-w),y=Math.round(H*.065),pad=12,sz=14;const lines=wrapText(desc,w-pad*2,sz-1);
  const ic=ICONS['b'+hintCur.b],iconS=ic?Math.round(H*.05):0;const h=pad*2+24+lines.length*20+(ic?iconS+16:0);
  hc.globalAlpha=Math.min(1,hintCur.t*2);hc.fillStyle='rgba(24,38,42,.86)';hc.fillRect(x,y,w,h);hc.strokeStyle='rgba(200,218,222,.9)';hc.lineWidth=2;hc.strokeRect(x+1,y+1,w-2,h-2);
  txt(name,x+pad,y+pad+14,sz,'#ffffff');lines.forEach((l,i)=>txt(l,x+pad,y+pad+38+i*20,sz-1,'#e8e8e8'));
  if(ic){const iy=y+h-pad-iconS,ix=Math.round(x+w/2-iconS/2);hc.fillStyle='rgba(225,232,234,.95)';hc.fillRect(ix-4,iy-4,iconS+8,iconS+8);hc.strokeStyle='#555';hc.lineWidth=1;hc.strokeRect(ix-3.5,iy-3.5,iconS+7,iconS+7);hc.drawImage(ic,ix,iy,iconS,iconS);}
  hc.globalAlpha=1;}
function drawHotbar(){
  const p=player;const G=hudGeom(),S=G.S,hx=G.hx,hy=G.hy;
  if(PACK.gui.hotbar){hc.drawImage(PACK.gui.hotbar,hx-S*.05,hy-S*.05,S*9+S*.1,S*1.1);}
  else{const u=S/20;hc.fillStyle='rgba(0,0,0,.55)';hc.fillRect(hx-u,hy-u,S*9+2*u,S+2*u);
    for(let i=0;i<9;i++){const x=hx+i*S;hc.fillStyle='rgba(139,139,139,.42)';hc.fillRect(x+u,hy+u,S-2*u,S-2*u);hc.fillStyle='rgba(55,55,55,.75)';hc.fillRect(x+u,hy+u,S-2*u,u);hc.fillRect(x+u,hy+u,u,S-2*u);
      hc.fillStyle='rgba(200,200,200,.45)';hc.fillRect(x+u,hy+S-2*u,S-2*u,u);hc.fillRect(x+S-2*u,hy+u,u,S-2*u);}}
  for(let i=0;i<9;i++){const x=hx+i*S;const s=p.inv[i];if(s){hc.drawImage(ICONS[s.id],x+S*.14,hy+S*.14,S*.72,S*.72);if(s.count>1)txt(String(s.count),x+S-4,hy+S-5,13,'#fff','right');}}
  const sx=hx+p.sel*S;if(PACK.gui.hotbar_sel)hc.drawImage(PACK.gui.hotbar_sel,sx-S*.08,hy-S*.1,S*1.16,S*1.2);else{const u=S/20;hc.strokeStyle='#000';hc.lineWidth=u;hc.strokeRect(sx-1.5*u,hy-1.5*u,S+3*u,S+3*u);hc.strokeStyle='#e6e6e6';hc.lineWidth=2*u;hc.strokeRect(sx,hy,S,S);hc.strokeStyle='#8a8a8a';hc.lineWidth=u;hc.strokeRect(sx+1.5*u,hy+1.5*u,S-3*u,S-3*u);const it=p.inv[p.sel];if(it){hc.drawImage(ICONS[it.id],sx+S*.14,hy+S*.14,S*.72,S*.72);if(it.count>1)txt(String(it.count),sx+S-4,hy+S-5,13,'#fff','right');}}
  const s=G.s,step=8*s;const left=hx,right=hx+S*9;
  // player pills (one per player in the round; dim when out)
  // player strip: one slot per player across the full hotbar width (8 slots, more when there are more players); out = dim, empty = dark
  {const lob=MATCH.state==='lobby';const list=(lob?ents.filter(e=>e.kind==='player'):ents.filter(e=>!e.spectator)).slice(0,16);const n=Math.max(8,list.length),slot=S*9/n,pw=Math.round(slot*.82),bh=G.barH,by=G.barTop;
    for(let i=0;i<n;i++){const e=list[i],x=Math.round(hx+i*slot+(slot-pw)/2);hc.fillStyle='rgba(0,0,0,.7)';hc.fillRect(x-1,by-1,pw+2,bh+2);
      if(e){const on=lob||e.alive;hc.fillStyle=on?PLAYER_COLORS[e.color%16]:'#3a3a3a';hc.fillRect(x,by,pw,bh);if(on){hc.fillStyle='rgba(255,255,255,.35)';hc.fillRect(x,by,pw,Math.max(1,bh/3|0));}}
      else{hc.fillStyle='rgba(70,70,70,.5)';hc.fillRect(x,by,pw,bh);}}}
  if(MATCH.state==='lobby')return;   // the lobby HUD is just the player strip and the hotbar
  const hy2=G.hy2;
  // hearts (left) with absorption + poison
  const pois=!!p.effects.poison;for(let i=0;i<10;i++){const v=clamp(p.health-i*2,0,2)/2;const x=left+i*step,y=hy2+(p.health<=4?(Math.random()-.5)*3:0);
    if(PACK.gui.heart_full){spr('heart_container',x,y,9*s,9*s);if(v>0)spr(pois?(v>=1?'heart_poison_full':'heart_poison_half'):(v>=1?'heart_full':'heart_half'),x,y,9*s,9*s);}
    else icon9(ICON9.heart,x,y,s,v,pois?POISON_PAL:HEART_PAL);}
  if(p.absorb>0)for(let i=0;i<Math.ceil(p.absorb/2);i++){const v=clamp(p.absorb-i*2,0,2)/2,x=left+i*step,y=hy2-9*s-2;if(PACK.gui.heart_abs_full)spr(v>=1?'heart_abs_full':'heart_abs_half',x,y,9*s,9*s);else icon9(ICON9.heart,x,y,s,v,ABS_PAL);}
  // hunger (right, fills from the right)
  for(let i=0;i<10;i++){const v=clamp(p.food-i*2,0,2)/2;const x=right-(i+1)*step+1,y=hy2+(p.sat<=0&&p.food<=6&&Math.random()<.1?(Math.random()-.5)*3:0);
    if(PACK.gui.food_full){spr('food_empty',x,y,9*s,9*s);if(v>0)spr(v>=1?'food_full':'food_half',x,y,9*s,9*s);}else icon9(ICON9.shank,x,y,s,v,FOOD_PAL,true);}
  // air bubbles above hunger while underwater
  if(p.air!=null&&p.air<300){const nb=Math.ceil((p.air-2)*10/300),part=Math.ceil(p.air*10/300)-nb;for(let i=0;i<10;i++){const x=right-(i+1)*step+1,y=hy2-9*s-4;if(i<nb){hc.fillStyle='#000';hc.beginPath();hc.arc(x+4.5*s,y+4.5*s,4*s,0,7);hc.fill();hc.fillStyle='#4a8ae8';hc.beginPath();hc.arc(x+4.5*s,y+4.5*s,3*s,0,7);hc.fill();hc.fillStyle='#fff';hc.fillRect(x+3*s,y+2.5*s,s,s);}else if(i<nb+part){hc.strokeStyle='#fff';hc.lineWidth=s;hc.beginPath();hc.arc(x+4.5*s,y+4.5*s,3*s,0,7);hc.stroke();}}}
  // armor bar above hearts
  const ap=armorPts(p);if(ap>0){const y=hy2-9*s-4-(p.absorb>0?9*s+2:0);for(let i=0;i<10;i++){const v=clamp(ap-i*2,0,2)/2,x=left+i*step;if(PACK.gui.armor_full){spr(v>=1?'armor_full':v>0?'armor_half':'armor_empty',x,y,9*s,9*s);}else icon9(ICON9.armor,x,y,s,v,ARMOR_PAL);}}
  if(selShow>0){const it=p.inv[p.sel];if(it){hc.globalAlpha=Math.min(1,selShow);txt(ITEMS[it.id].name,W/2,hy2-(ap?20*s:10*s)-10,16,ITEMS[it.id].ench?'#55ffff':'#fff','center');hc.globalAlpha=1;}}
}
function drawArmorDoll(){ // small figure on the left showing equipped armour, like the console HUD
  const p=player;if(!p.armor.some(Boolean))return;const x=18,y=H/2-60,s=4;const col=i=>p.armor[i]?ITEMS[p.armor[i]].color:'rgba(255,255,255,.15)';
  hc.fillStyle=col(0);hc.fillRect(x+2*s,y,4*s,4*s);hc.fillStyle=col(1);hc.fillRect(x,y+4.5*s,8*s,6*s);hc.fillStyle=col(2);hc.fillRect(x+1*s,y+11*s,2.6*s,5*s);hc.fillRect(x+4.4*s,y+11*s,2.6*s,5*s);
  hc.fillStyle=col(3);hc.fillRect(x+.6*s,y+16.5*s,3*s,2*s);hc.fillRect(x+4.4*s,y+16.5*s,3*s,2*s);
}
function drawEffects(){const ef=Object.entries(player.effects);if(!ef.length)return;let y=MATCH.mode==='br'?190:20;const x=W-14;
  for(const [k,f] of ef){if(k==='heal'||k==='harm')continue;hc.fillStyle='rgba(0,0,0,.45)';hc.fillRect(x-170,y-14,170,20);hc.fillStyle=EFFECT_COL[k]||'#fff';hc.fillRect(x-168,y-12,6,16);
    txt(`${EFFECT_NAMES[k]||k}${f.amp?' II':''} ${fmtTime(f.t)}`,x-6,y+1,13,'#fff','right');y+=22;}}
function drawBattleTop(){
  if(MATCH.state==='play'&&!(MATCH.preT>0)){const since=MATCH.gameT-SET.grace;
    if(inGrace())txt(`Invulnerability wears off in ${Math.ceil(SET.grace-MATCH.gameT)} seconds!`,W/2,30,18,'#fff','center');
    else if(SET.grace>0&&since>=0&&since<4){hc.globalAlpha=Math.min(1,4-since);txt('Invulnerability has worn off! Fight!',W/2,30,18,'#fff','center');hc.globalAlpha=1;}
    else if(SET.roundLen>0&&SET.roundLen-MATCH.gameT<=60)txt('Time left '+fmtTime(SET.roundLen-MATCH.gameT),W/2,30,16,'#ff6a5a','center');   // only a last-minute warning
    if(MATCH.showdown)txt('SHOWDOWN',W/2,52,16,'#ff5a4a','center');
    if(SET.refill>0&&MATCH.refillAt-MATCH.gameT<=10&&MATCH.refillAt-MATCH.gameT>0)txt('Chests refill in '+Math.ceil(MATCH.refillAt-MATCH.gameT),W/2,72,14,'#ffff88','center');
  }
}
function drawLobbyHud(){
  const humans=ents.filter(e=>e.kind==='player').length;const name=MATCH.nextMap?(MATCH.nextMap==='br'?'Battle Royale':(MAPS.find(m=>m.id===MATCH.nextMap)||{}).name):'';
  if(!online&&!MATCH.offlineLobby){txt('Practice  -  Esc for menu',W/2,30,18,'#fff','center');return;}
  if(MATCH.lobbyCD>=0)txt(`Time to game change: ${Math.ceil(MATCH.lobbyCD)} seconds`,W/2,30,18,'#fff','center');else txt(humans<2&&!SET.bots?'Waiting for players...':'Waiting...',W/2,30,18,'#fff','center');
  // next map and the player list are on the Tab lobby panel
}
function drawBatHud(){
  txt('You are a bat',W/2,H-70,20,'#ffd54a','center');
  txt(spectate.mode==='follow'&&spectate.target?`Watching ${spectate.target.name}`:'Fly with WASD, Space and Shift',W/2,H-46,15,'#fff','center');

}
function drawBRHud(){
  const alive=aliveList().length;const bar=br?BR_BARS.find(b=>br.T>=b[1]&&br.T<b[2]):null;
  if(bar&&MATCH.state==='play'){const bw=Math.min(364,W-40),x=W/2-bw/2,y=30;const f=clamp((br.T-bar[1])/(bar[2]-bar[1]),0,1);const v=bar[3]>0?f:1-f;
    txt(bar[5],W/2,y-8,14,'#fff','center');hc.fillStyle='#000';hc.fillRect(x-1,y-1,bw+2,12);hc.fillStyle='rgba(255,255,255,.18)';hc.fillRect(x,y,bw,10);
    hc.fillStyle=`rgb(${bar[4].map(c=>c*255|0).join(',')})`;hc.fillRect(x,y,bw*v,10);for(let i=1;i<6;i++){hc.fillStyle='rgba(0,0,0,.35)';hc.fillRect(x+bw*i/6,y,1,10);}}
  else if(MATCH.state==='play'&&suddenDeath)txt('SUDDEN DEATH',W/2,32,18,'#ff5555','center');
  const sx=W-150,sy=H/2-30;hc.fillStyle='rgba(0,0,0,.4)';hc.fillRect(sx,sy,140,40);hc.fillStyle='rgba(0,0,0,.25)';hc.fillRect(sx,sy,140,18);
  hc.font='18px '+HFONT;hc.textAlign='center';hc.fillStyle='#fff';hc.fillText('Info',sx+70,sy+14);hc.textAlign='left';hc.fillStyle='#ccc';hc.fillText('Alive',sx+6,sy+34);hc.textAlign='right';hc.fillStyle='#ff5555';hc.fillText(String(alive),sx+134,sy+34);
  if(mmCanvas&&br){const S=150,mx=W-S-12,my=12,k=S/WX;hc.globalAlpha=.85;hc.drawImage(mmCanvas,mx,my,S,S);hc.globalAlpha=1;hc.strokeStyle='#000';hc.lineWidth=2;hc.strokeRect(mx,my,S,S);
    hc.save();hc.beginPath();hc.rect(mx,my,S,S);hc.clip();
    if(br.border.cx<1e6){const h=brSize()/2;hc.strokeStyle='#fff';hc.lineWidth=2;hc.strokeRect(mx+(br.border.cx-h)*k,my+(br.border.cz-h)*k,h*2*k,h*2*k);
      const t=br.border.to/2;if(t<h-.01){hc.setLineDash([4,3]);hc.strokeStyle='#55ffff';hc.strokeRect(mx+(br.border.cx-t)*k,my+(br.border.cz-t)*k,t*2*k,t*2*k);hc.setLineDash([]);}}
    const p=player.alive?player:spectate.target;if(p){const px=mx+p.pos[0]*k,pz=my+p.pos[2]*k;hc.save();hc.translate(px,pz);hc.rotate(-p.yaw);hc.fillStyle='#ffd54a';hc.beginPath();hc.moveTo(0,-6);hc.lineTo(4,5);hc.lineTo(-4,5);hc.fill();hc.restore();}
    hc.restore();txt('Kills: '+player.kills,mx,my+S+18,14,'#ffd54a');}
}
