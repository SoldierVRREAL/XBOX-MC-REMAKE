// ================= Java Edition touches: F5 camera, F1 hide GUI, F3 debug screen, T chat, inverted crosshair,
// entity shadows, block selection box, sun and moon, distance-scaled name tags =================
let camMode=0,hideGui=false,showDebug=false,chatUI=false;
document.addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  if(e.code==='F5'){e.preventDefault();if(player&&MATCH.state!=='menu'){camMode=(camMode+1)%3;}return;}
  if(e.code==='F1'){e.preventDefault();hideGui=!hideGui;return;}
  if(e.code==='F3'){e.preventDefault();showDebug=!showDebug;return;}
  if((e.code==='KeyT'||e.code==='Slash')&&player&&(MATCH.state==='play'||MATCH.state==='lobby'||MATCH.state==='over')&&!chestOpen&&!chatUI&&(locked||padActive||touchActive)){e.preventDefault();openChat(e.code==='Slash'?'/':'');}
},true);
// ---- chat (T) ----
function openChat(prefix){chatUI=true;const el=$('chatIn');el.value=prefix||'';$('chatBar').classList.remove('hidden');for(const k in keys)keys[k]=false;
  document.exitPointerLock&&document.exitPointerLock();setTimeout(()=>el.focus(),0);}
function closeChat(relock){chatUI=false;$('chatBar').classList.add('hidden');$('chatIn').blur();if(relock&&player&&MATCH.state!=='menu')lockPointer();}
$('chatIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeChat(true);return;}
  if(e.key==='Enter'){e.preventDefault();const m=$('chatIn').value.trim().slice(0,100);if(m){chat.push({t:10,txt:`<${myName}> ${m}`,col:'#ffffff'});if(chat.length>8)chat.shift();netSend(N.CHAT,{p:1,n:myName,m});}closeChat(true);}});
// ---- crosshair (inverted like vanilla: drawn with a difference blend over the world) ----
function tickCrosshair(){const el=$('xhair');const on=!!player&&!hideGui&&camMode===0&&(MATCH.state==='play'||MATCH.state==='lobby'||MATCH.state==='over')&&(player.alive||spectate.mode==='bat')&&
  ['menu','chestUI','pause','results','lobbyPanel','jOpt','loading','dressPanel'].every(id=>{const x=$(id);return !x||x.classList.contains('hidden');});
  el.classList.toggle('hidden',!on);}
// ---- shadows, sun, moon textures ----
let SHADOW_TEX=null,SUN_TEX=null,MOON_TEX=null,quadMesh=null;
function procShadow(){const c=mkCanvas(32,32),g=c.getContext('2d');const gr=g.createRadialGradient(16,16,2,16,16,16);gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(.75,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);return c;}
function procSun(){const c=mkCanvas(32,32),g=c.getContext('2d');g.fillStyle='rgba(255,200,60,.35)';g.fillRect(4,4,24,24);g.fillStyle='rgba(255,230,120,.7)';g.fillRect(8,8,16,16);g.fillStyle='#fffbe6';g.fillRect(10,10,12,12);return c;}
function procMoon(){const c=mkCanvas(128,64),g=c.getContext('2d');g.fillStyle='#d8dbe6';g.fillRect(8,8,16,16);g.fillStyle='#b9bdcc';for(const [x,y,s] of [[11,11,3],[18,13,2],[13,18,4],[20,19,2]])g.fillRect(x,y,s,s);return c;}
function initSkyTextures(){for(const t of [SHADOW_TEX,SUN_TEX,MOON_TEX])if(t)gl.deleteTexture(t);
  SHADOW_TEX=mkTex(PACK.shadow||procShadow());SUN_TEX=mkTex(PACK.sun||procSun());MOON_TEX=mkTex(PACK.moon||procMoon());
  if(!quadMesh){const o=[];const v=[[-.5,0,-.5,0,0],[.5,0,-.5,1,0],[.5,0,.5,1,1],[-.5,0,.5,0,1]];for(const i of [0,1,2,0,2,3])o.push(v[i][0],0,v[i][2],0,1,0,v[i][3],v[i][4]);quadMesh=meshFrom(o);}}
// sun and moon: fixed in the sky for each map (afternoon on day maps, full moon over Crucible), additive like vanilla
function drawSunMoon(){if(!mapInfo||!SUN_TEX)return;const sun=mapInfo.skyLight&&!mapInfo.dark,moon=!!mapInfo.stars;if(!sun&&!moon)return;
  const dir=sun?[-.55,.83,-.1]:[.5,.78,.38];const L=Math.hypot(...dir);const d=dir.map(v=>v/L);
  // basis: quad faces the camera along -d, one edge along world z
  const zA=[0,0,1];let xA=[zA[1]*d[2]-zA[2]*d[1],zA[2]*d[0]-zA[0]*d[2],zA[0]*d[1]-zA[1]*d[0]];const xl=Math.hypot(...xA)||1;xA=xA.map(v=>v/xl);const yA=d;const zB=[xA[1]*yA[2]-xA[2]*yA[1],xA[2]*yA[0]-xA[0]*yA[2],xA[0]*yA[1]-xA[1]*yA[0]];
  const R=new Float32Array([xA[0],xA[1],xA[2],0,yA[0],yA[1],yA[2],0,zB[0],zB[1],zB[2],0,0,0,0,1]);const S=sun?60:40;
  const m=chain(M4.tr(camPos[0]+d[0]*100,camPos[1]+d[1]*100,camPos[2]+d[2]*100),R,M4.sc(S,1,S));
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  useTex(VP,camPos);gl.uniform1f(PT.u.fogN,1e6);gl.uniform1f(PT.u.fogF,2e6);gl.uniform1f(PT.u.bright,1/1.06);
  if(sun)drawMesh(quadMesh,m,SUN_TEX);else{// full-moon frame of moon_phases (top-left of a 4x2 sheet)
    if(!quadMesh.moon){const o=[];const v=[[-.5,0,-.5,0,0],[.5,0,-.5,.25,0],[.5,0,.5,.25,.5],[-.5,0,.5,0,.5]];for(const i of [0,1,2,0,2,3])o.push(v[i][0],0,v[i][2],0,1,0,v[i][3],v[i][4]);quadMesh.moon=meshFrom(o);}
    drawMesh(quadMesh.moon,m,MOON_TEX);}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);}
// round shadows under players, bots and dropped items (Render.renderShadow): fades out as the entity rises
function drawShadows(){if(!SHADOW_TEX||!mapInfo)return;useTex(VP,camPos);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.uniform1f(PT.u.bright,1);
  const one=(pos,r)=>{if(dist(pos,camPos)>40)return;const x=Math.floor(pos[0]),z=Math.floor(pos[2]);let gy=-99;for(let y=Math.floor(pos[1]+.01);y>=Math.floor(pos[1])-2;y--){const b=getB(x,y,z);if(b&&BD[b].solid&&!BD[b].liquid){const bx=blockBoxes(x,y,z);gy=y+(bx?Math.max(...bx.map(q=>q[4])):1);break;}}
    if(gy<-50)return;const h=pos[1]-gy;if(h>2||h<-.1)return;const a=(1-h/2)*.5;gl.uniform4f(PT.u.tint,1,1,1,a);drawMesh(quadMesh,chain(M4.tr(pos[0],gy+.015,pos[2]),M4.sc(r*2,1,r*2)),SHADOW_TEX);};
  for(const e of ents){if(!e.alive||e.bat||e.effects.invis)continue;if(e===player&&camMode===0)continue;one(e.rpos||e.pos,.5);}
  for(const d of drops)one(d.pos,.15);
  gl.uniform4f(PT.u.tint,1,1,1,1);gl.depthMask(true);gl.disable(gl.BLEND);}
// black selection box around the targeted block (only where blocks can be broken: Battle Royale)
let edgeBuf=null;
function drawSelection(x,y,z){if(!edgeBuf){const o=[];const c=[[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]];
    for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])for(const i of [a,b])o.push(...c[i],0,1,0);
    edgeBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(o),gl.STATIC_DRAW);}
  const bx=blockBoxes(x,y,z)||FULLBOX;let x0=1,y0=1,z0=1,x1=0,y1=0,z1=0;for(const q of bx){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);z0=Math.min(z0,q[2]);x1=Math.max(x1,q[3]);y1=Math.max(y1,Math.min(1,q[4]));z1=Math.max(z1,q[5]);}
  const g=.002;useBox(VP,camPos);gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuf);gl.vertexAttribPointer(PB.a.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(PB.a.n,3,gl.FLOAT,false,24,12);
  gl.uniform1f(PB.u.lit,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.uniformMatrix4fv(PB.u.m,false,chain(M4.tr(x+x0-g,y+y0-g,z+z0-g),M4.sc(x1-x0+2*g,y1-y0+2*g,z1-z0+2*g)));gl.uniform4f(PB.u.col,0,0,0,.4);gl.drawArrays(gl.LINES,0,24);
  gl.depthMask(true);gl.disable(gl.BLEND);useBox(VP,camPos);}
// name tags (RenderLivingBase.renderLivingLabel): fixed size in the world, so they shrink with distance
function nameTagMC(e,col){const top=e.bat?.7:(e.sneak?1.55:1.8)+.5;const rp=e.rpos||e.pos;const p=project([rp[0],rp[1]+top,rp[2]]);if(!p)return;
  const d=Math.max(.5,dist(camPos,[rp[0],rp[1]+top,rp[2]]));const fov=OPT.fov*fovMod*Math.PI/180;const ppb=(H/2)/Math.tan(fov/2)/d;
  const px=.02666667*ppb;if(px<.35)return;const sc=Math.max(1,Math.round(px));const t=e.name;
  const w=FONT?bmpWidth(t,sc):t.length*6*sc;hc.globalAlpha=e.sneak?.5:1;hc.fillStyle='rgba(0,0,0,.25)';hc.fillRect(Math.round(p[0]-w/2-sc),Math.round(p[1]-9*sc),w+2*sc,9*sc);
  if(FONT)bmpText(t,p[0],p[1]-1*sc,sc*9,col||'#ffffff','center');else{hc.font=`${8*sc}px ${HFONT}`;hc.textAlign='center';hc.fillStyle=col||'#fff';hc.fillText(t,p[0],p[1]-sc);}hc.globalAlpha=1;}
// F3 debug screen
function drawDebug(){if(!player)return;const p=player.rpos||player.pos;const f=n=>n.toFixed(3);const R=180/Math.PI;
  let my=((180-player.yaw*R)%360+540)%360-180;const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);
  const facing=Math.abs(fx)>Math.abs(fz)?(fx>0?'east (Towards positive X)':'west (Towards negative X)'):(fz>0?'south (Towards positive Z)':'north (Towards negative Z)');
  const bx=Math.floor(p[0]),by=Math.floor(p[1]),bz=Math.floor(p[2]);const L=lightAt(bx,by,bz);
  const left=[`Minecraft 1.8 (Battle Browser Edition)`,`${Math.round(fpsS)} fps`+(clickFix()?` · click fix x${CLK.scale.toFixed(2)}`:'')+(net&&net.ping!=null?` · ping ${Math.round(net.ping)} ms`+(net.tr&&net.tr.url?' to '+net.tr.url.replace(/^wss?:\/\//,'').replace(/\/mqtt$/,''):''):''),'',`XYZ: ${f(p[0])} / ${f(p[1])} / ${f(p[2])}`,`Block: ${bx} ${by} ${bz}`,`Chunk: ${bx&15} ${by&15} ${bz&15} in ${bx>>4} ${by>>4} ${bz>>4}`,
    `Facing: ${facing} (${my.toFixed(1)} / ${(-player.pitch*R).toFixed(1)})`,`Light: ${Math.max(L&15,(L>>4)&15)} (${(L>>4)&15} sky, ${L&15} block)`,`Map: ${(MAPS.find(m=>m.id===mapInfo.id)||{name:mapInfo.id}).name}`,
    `Mode: ${MATCH.mode==='br'?'Battle Royale':'Battle'} (${MATCH.state})`,`E: ${ents.filter(e=>e.alive).length}/${ents.length}  Drops: ${drops.length}`,`Net: ${net?net.kind+(isHost()?' (host)':' (client)'):'offline'}`];
  const gli=gl.getExtension('WEBGL_debug_renderer_info');const rend=gli?gl.getParameter(gli.UNMASKED_RENDERER_WEBGL):'WebGL';
  const right=[`Browser: ${(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)||['Web'])[0]}`,`Display: ${W}x${H} (${String(rend).slice(0,40)})`,performance.memory?`Mem: ${Math.round(performance.memory.usedJSHeapSize/1048576)}MB`:'',`Settings: ${['Tiny','Short','Normal','Far'][OPT.rd]} ${OPT.fancy?'fancy':'fast'}`];
  const line=(t,x,y,al)=>{if(!t)return;const w=FONT?bmpWidth(t,2):t.length*12;const xx=al==='right'?x-w:x;hc.fillStyle='rgba(80,80,80,.56)';hc.fillRect(xx-2,y-15,w+3,18);txt(t,al==='right'?x:x,y,13,'#e0e0e0',al);};
  left.forEach((t,i)=>line(t,4,18+i*18,'left'));right.forEach((t,i)=>line(t,W-4,18+i*18,'right'));}

// running particles (Entity.createRunningParticles): chips of the block under a sprinting player's feet
function tickRunParticles(){if(MATCH.state!=='play'&&MATCH.state!=='lobby')return;for(const e of ents){if(!e.alive||!e.sprint||e.inWater||Math.random()>dtFrame*20*.6)continue;if(e.onGround===false)continue;
  const sp=Math.hypot(e.vel[0],e.vel[2]);if(sp<3)continue;const x=Math.floor(e.pos[0]),y=Math.floor(e.pos[1]-.2),z=Math.floor(e.pos[2]);const b=getB(x,y,z);if(!b||!BD[b].solid||BD[b].liquid)continue;
  if(dist(e.pos,camPos)>24)continue;particles.push({p:[e.pos[0]+(Math.random()-.5)*.6,e.pos[1]+.1,e.pos[2]+(Math.random()-.5)*.6],v:[-e.vel[0]*.2,1.5,-e.vel[2]*.2],t:.5,t0:.5,kind:b,sz:.1,q:Math.random()*4|0,g:16});}}
