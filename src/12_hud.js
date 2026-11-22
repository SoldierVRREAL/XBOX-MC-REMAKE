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
  // name tags: lobby shows everyone; in Battle they are hidden until Showdown reveals the survivors
  for(const e of ents){if(e===player||!e.alive)continue;
    if(MATCH.state==='lobby'){if(dist(camPos,e.pos)<30)nameTag(e,e.ready?'#7f7':'#fff');}
    else if(MATCH.mode==='battle'&&MATCH.showdown)nameTag(e,PLAYER_COLORS[e.color%16]);
    else if(MATCH.mode==='battle'&&dist(camPos,e.pos)<6&&!e.effects.invis&&los(camPos,eye(e)))nameTag(e);}
  if(MATCH.state==='lobby')drawLobbyHud();
  else if(MATCH.mode==='br')drawBRHud();
  else drawBattleTop();
  // kill feed
  const fy=MATCH.mode==='br'?190:56;feed.forEach((f,i)=>{hc.globalAlpha=Math.min(1,f.t);txt(f.txt,W-14,fy+i*22,14,'#fff','right');});hc.globalAlpha=1;
  // chat (bottom left)
  hc.font="20px "+HFONT;chat.forEach((c,i)=>{const y=H-130-(chat.length-1-i)*20;hc.globalAlpha=Math.min(1,c.t);hc.fillStyle='rgba(0,0,0,.45)';hc.fillRect(8,y-15,Math.min(W*.6,hc.measureText(c.txt).width+12),20);hc.textAlign='left';hc.fillStyle=c.col;hc.fillText(c.txt,14,y);});hc.globalAlpha=1;
  if(msgs.length){const m=msgs[msgs.length-1];hc.globalAlpha=Math.min(1,m.t);txt(m.txt,W/2,H/2-80,44,'#ffd54a','center');if(m.sub)txt(m.sub,W/2,H/2-48,18,'#fff','center');hc.globalAlpha=1;}
  drawPrompts();
  if(MATCH.state==='play'&&MATCH.preT>0){const n=Math.ceil(MATCH.preT);txt(`Time to start: ${n} second${n===1?'':'s'}`,W/2,30,18,'#fff','center');}
  if(!player.alive){drawBatHud();return;}
  if(player.hurtT>0){hc.fillStyle=`rgba(255,0,0,${player.hurtT*.45})`;hc.fillRect(0,0,W,H);}
  if(player.fire>0){const g=hc.createLinearGradient(0,H,0,H*.5);g.addColorStop(0,'rgba(255,120,0,.45)');g.addColorStop(1,'rgba(255,120,0,0)');hc.fillStyle=g;hc.fillRect(0,0,W,H);}
  if(fluidAt(camPos[0],camPos[1],camPos[2])==='water'){hc.fillStyle='rgba(30,60,200,.35)';hc.fillRect(0,0,W,H);}
  if(fluidAt(camPos[0],camPos[1],camPos[2])==='lava'){hc.fillStyle='rgba(255,90,0,.75)';hc.fillRect(0,0,W,H);}
  if(MATCH.state==='play'&&!inZone(player.pos,false)){const g=hc.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);g.addColorStop(0,'rgba(255,0,0,0)');g.addColorStop(1,'rgba(255,0,0,.45)');hc.fillStyle=g;hc.fillRect(0,0,W,H);}
  // crosshair
  if(!spr('crosshair',W/2-9,H/2-9,18,18)){hc.fillStyle='rgba(255,255,255,.9)';hc.fillRect(W/2-9,H/2-1,18,2);hc.fillRect(W/2-1,H/2-9,2,18);}
  if(MATCH.state==='play'&&locked&&!chestOpen&&lookChest())txt('[RMB] Open chest',W/2,H/2+34,14,'#fff','center');
  if(player.using&&player.using!=='block'){const pr=player.using==='bow'?bowCharge(player.useT):Math.min(1,player.useT/1.6);hc.fillStyle='rgba(0,0,0,.6)';hc.fillRect(W/2-30,H/2+14,60,6);hc.fillStyle=player.using==='bow'&&pr>=1?'#ffd54a':'#fff';hc.fillRect(W/2-30,H/2+14,60*pr,6);}
  drawHotbar();drawArmorDoll();drawEffects();
}
function drawHotbar(){
  const p=player;const S=Math.min(46,(W-20)/9.5),hx=Math.round(W/2-S*4.5),hy=Math.round(H-S-12);
  if(PACK.gui.hotbar){hc.drawImage(PACK.gui.hotbar,hx-S*.05,hy-S*.05,S*9+S*.1,S*1.1);}
  else{const u=S/20;hc.fillStyle='rgba(0,0,0,.55)';hc.fillRect(hx-u,hy-u,S*9+2*u,S+2*u);
    for(let i=0;i<9;i++){const x=hx+i*S;hc.fillStyle='rgba(139,139,139,.42)';hc.fillRect(x+u,hy+u,S-2*u,S-2*u);hc.fillStyle='rgba(55,55,55,.75)';hc.fillRect(x+u,hy+u,S-2*u,u);hc.fillRect(x+u,hy+u,u,S-2*u);
      hc.fillStyle='rgba(200,200,200,.45)';hc.fillRect(x+u,hy+S-2*u,S-2*u,u);hc.fillRect(x+S-2*u,hy+u,u,S-2*u);}}
  for(let i=0;i<9;i++){const x=hx+i*S;const s=p.inv[i];if(s){hc.drawImage(ICONS[s.id],x+S*.14,hy+S*.14,S*.72,S*.72);if(s.count>1)txt(String(s.count),x+S-4,hy+S-5,13,'#fff','right');}}
  const sx=hx+p.sel*S;if(PACK.gui.hotbar_sel)hc.drawImage(PACK.gui.hotbar_sel,sx-S*.08,hy-S*.1,S*1.16,S*1.2);else{const u=S/20;hc.strokeStyle='#000';hc.lineWidth=u;hc.strokeRect(sx-1.5*u,hy-1.5*u,S+3*u,S+3*u);hc.strokeStyle='#e6e6e6';hc.lineWidth=2*u;hc.strokeRect(sx,hy,S,S);hc.strokeStyle='#8a8a8a';hc.lineWidth=u;hc.strokeRect(sx+1.5*u,hy+1.5*u,S-3*u,S-3*u);const it=p.inv[p.sel];if(it){hc.drawImage(ICONS[it.id],sx+S*.14,hy+S*.14,S*.72,S*.72);if(it.count>1)txt(String(it.count),sx+S-4,hy+S-5,13,'#fff','right');}}
  const s=Math.max(2,Math.floor(S/16)),step=8*s;const left=hx,right=hx+S*9;
  // player pills (one per player in the round; dim when out)
  if(MATCH.state==='play'||MATCH.state==='over'){const list=ents.filter(e=>!e.spectator).slice(0,16);const pw=Math.min(36,(S*9)/list.length-4);let x=W/2-list.length*(pw+4)/2;
    for(const e of list){hc.fillStyle='#000';hc.fillRect(x-1,hy-14-1,pw+2,7);hc.fillStyle=e.alive?PLAYER_COLORS[e.color%16]:'#333';hc.globalAlpha=e.alive?1:.6;hc.fillRect(x,hy-14,pw,5);hc.globalAlpha=1;if(e===p){hc.fillStyle='#fff';hc.fillRect(x,hy-9,pw,1);}x+=pw+4;}}
  const hy2=hy-14-10-8*s;
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
  if(selShow>0){const it=p.inv[p.sel];if(it){hc.globalAlpha=Math.min(1,selShow);txt(ITEMS[it.id].name,W/2,hy2-(ap?20*s:10*s)-10,16,'#fff','center');hc.globalAlpha=1;}}
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
  const alive=aliveList().length,tot=ents.filter(e=>!e.spectator).length;
  txt(`${alive}/${tot} alive`,14,26,17);txt(`Kills: ${player.kills}`,14,48,15,'#ffd54a');
  if(MATCH.state==='play'&&!(MATCH.preT>0)){
    if(inGrace())txt(`Invulnerability wears off in ${Math.ceil(SET.grace-MATCH.gameT)} seconds!`,W/2,30,18,'#fff','center');
    else if(SET.roundLen>0)txt('Time left '+fmtTime(SET.roundLen-MATCH.gameT),W/2,30,16,SET.roundLen-MATCH.gameT<=60?'#ff6a5a':'#fff','center');
    if(MATCH.showdown)txt('SHOWDOWN',W/2,52,16,'#ff5a4a','center');
    if(SET.refill>0&&MATCH.refillAt-MATCH.gameT<=10&&MATCH.refillAt-MATCH.gameT>0)txt('Chests refill in '+Math.ceil(MATCH.refillAt-MATCH.gameT),W/2,72,14,'#ffff88','center');
  }
}
function drawLobbyHud(){
  const humans=ents.filter(e=>e.kind==='player').length;const name=MATCH.nextMap?(MATCH.nextMap==='br'?'Battle Royale':(MAPS.find(m=>m.id===MATCH.nextMap)||{}).name):'';
  if(!online){txt('Practice  -  Esc for menu',W/2,30,18,'#fff','center');return;}
  if(MATCH.lobbyCD>=0)txt(`Time to game change: ${Math.ceil(MATCH.lobbyCD)} seconds`,W/2,30,18,'#fff','center');else txt(humans<2&&!SET.bots?'Waiting for players...':'Waiting...',W/2,30,18,'#fff','center');
  if(name)txt('Next map: '+name,W/2,52,15,'#ffd54a','center');

  let y=80;txt('Players',14,y,15,'#ffd54a');for(const e of ents.filter(e=>e.kind==='player')){y+=20;txt(`${e.ready?'✓':'·'} ${e.name}${net&&e.id==='p'+net.hostId()?' (host)':''}`,14,y,14,e.ready?'#7f7':'#fff');}
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
