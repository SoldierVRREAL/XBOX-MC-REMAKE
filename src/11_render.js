// ================= audio: pack sounds (1.8 and modern names) with Minecraft-like procedural fallback =================
let actx=null,clickBuf=null,noiseBuf=null;const sndCache={};
let masterOut=null;
function initAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(!masterOut){masterOut=actx.createGain();masterOut.gain.value=OPT.vol;masterOut.connect(actx.destination);}actx.resume&&actx.resume();if(PACK.click&&!clickBuf)decodeClick();
  if(!noiseBuf){noiseBuf=actx.createBuffer(1,actx.sampleRate,actx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}}catch(e){}}
function decodeClick(){if(!actx||!PACK.click)return;actx.decodeAudioData(PACK.click.slice().buffer).then(b=>clickBuf=b).catch(()=>{});}
const MAT_MOD={grass:'grass',stone:'stone',wood:'wood',sand:'sand',gravel:'gravel',cloth:'wool',glass:'glass',ladder:'ladder',slime:'slime_block',snow:'snow'};
function blockMat(b){if(!b)return 'stone';if([1,2,5,30,31,32,36,58].includes(b))return 'grass';if([4,6,8,37,38,39,40,46,47,48,49,50,51,52,53,64,72,73,74,75].includes(b))return 'wood';if(b===55||b===71)return 'cloth';if(b===7||b===35)return 'sand';if(b===13)return 'gravel';if(b===12)return 'cloth';if(b===11||b===33)return 'glass';if(b===34)return 'slime';return 'stone';}
const SND_NAMES={burn:['damage/hit','entity/player/hurt'],drown:['damage/hit','entity/player/hurt'],hit:['damage/hit','entity/player/hurt'],hurt:['damage/hit','entity/player/hurt'],death:['damage/hit','entity/player/hurt'],bow:['random/bow','entity/arrow/shoot'],arrowhit:['random/bowhit','entity/arrow/hit'],
  chest:['random/chestopen','block/chest/open'],chestclose:['random/chestclosed','block/chest/close'],eat:['random/eat','entity/generic/eat'],burp:['random/burp','entity/player/burp'],drink:['random/drink','entity/generic/drink'],
  pick:['random/pop','entity/item/pickup'],click:['random/click','ui/button/click'],glass:['random/glass','block/glass/break'],squeak:['mob/bat/idle','entity/bat/ambient'],batdeath:['mob/bat/death','entity/bat/death'],
  fall:['damage/fallsmall','entity/player/small_fall'],fallbig:['damage/fallbig','entity/player/big_fall'],splash:['liquid/splash','entity/player/splash'],swim:['liquid/swim','entity/player/swim'],
  fizz:['random/fizz','block/fire/extinguish'],fire:['fire/fire','block/fire/ambient'],win:['random/levelup','entity/player/levelup'],orb:['random/orb','entity/experience_orb/pickup'],slime:['mob/slime/big','block/slime_block/fall'],
  breath:['random/breath','entity/player/breath'],drown:['damage/hit','entity/player/hurt_drown']};
const SND_EVENTS={hit:['entity.player.hurt'],hurt:['entity.player.hurt'],death:['entity.player.death'],burn:['entity.generic.burn','entity.player.hurt_on_fire'],drown:['entity.player.hurt_drown'],
  bow:['entity.arrow.shoot'],arrowhit:['entity.arrow.hit'],chest:['block.chest.open'],chestclose:['block.chest.close'],eat:['entity.generic.eat'],burp:['entity.player.burp'],drink:['entity.generic.drink'],
  pick:['entity.item.pickup'],click:['ui.button.click'],glass:['entity.splash_potion.break','block.glass.break'],squeak:['entity.bat.ambient'],fall:['entity.player.small_fall'],fallbig:['entity.player.big_fall'],
  splash:['entity.player.splash'],swim:['entity.player.swim'],fizz:['block.fire.extinguish'],win:['entity.player.levelup'],orb:['entity.experience_orb.pickup'],slime:['block.slime_block.fall']};
function packEvent(evs){if(!PACK.events||!PACK.sounds)return null;for(const ev of evs){const l=PACK.events[ev];if(!l)continue;const ok=l.filter(x=>PACK.sounds[x.name]);if(!ok.length)continue;
  let tot=0;for(const x of ok)tot+=x.weight;let r=Math.random()*tot;for(const x of ok){r-=x.weight;if(r<=0)return x;}return ok[0];}return null;}
function packGroup(names){if(!PACK.sgroups)return null;for(const n of names){const g=PACK.sgroups[n];if(g&&g.length)return g;}return null;}
function playBytes(key,vol,pitch){const c=sndCache[key];const go=b=>{const s=actx.createBufferSource(),g=actx.createGain();s.buffer=b;s.playbackRate.value=pitch;g.gain.value=vol;s.connect(g);g.connect(masterOut||actx.destination);s.start();};
  if(c&&c.buf)return go(c.buf);if(c)return;sndCache[key]={};actx.decodeAudioData(PACK.sounds[key].slice().buffer).then(b=>{sndCache[key].buf=b;go(b);}).catch(()=>{});}
function noiseHit(dur,f,q,vol,type='bandpass',pitchDrop){const t=actx.currentTime;const s=actx.createBufferSource();s.buffer=noiseBuf;s.playbackRate.value=.6+Math.random()*.8;const fl=actx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;
  const g=actx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(masterOut||actx.destination);s.start(t,Math.random()*.5);s.stop(t+dur+.02);
  if(pitchDrop){fl.frequency.setValueAtTime(f,t);fl.frequency.exponentialRampToValueAtTime(f*pitchDrop,t+dur);}}
function tone(type,f1,f2,dur,vol){const t=actx.currentTime;const o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(masterOut||actx.destination);o.type=type;o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.start(t);o.stop(t+dur+.02);}
const MAT_F={grass:[900,.9],stone:[2600,1.2],wood:[700,3],sand:[3500,.5],gravel:[1500,.8],cloth:[600,.6],glass:[3000,2],ladder:[800,3],slime:[300,2],snow:[2500,.5]};
function sfx(type,o={}){
  if(!actx)return;let vol=o.vol==null?1:o.vol;if(o.pos&&camPos){const d=dist(o.pos,camPos);if(d>16)return;vol*=1-d/16;}if(vol<=.01)return;
  if(type==='click'&&clickBuf){const s=actx.createBufferSource();s.buffer=clickBuf;s.connect(masterOut||actx.destination);s.start();return;}
  const mat=o.mat||'stone',mm=MAT_MOD[mat]||mat;
  let names=SND_NAMES[type];
  if(type==='step')names=['step/'+mat,'block/'+mm+'/step'];else if(type==='dig')names=['dig/'+(mat==='glass'?'stone':mat),'block/'+mm+'/break'];else if(type==='mine')names=['step/'+mat,'block/'+mm+'/hit'];
  if(type==='glass'&&o.breakBlock)names=['random/glass','block/glass/break'];
  const evs=type==='step'?['block.'+mm+'.step']:type==='dig'?['block.'+mm+'.break']:type==='mine'?['block.'+mm+'.hit']:(SND_EVENTS[type]||[]);
  const P0={step:[.15,1],dig:[1,.8],mine:[.25,.5],hit:[1,.9+Math.random()*.2],hurt:[1,.9+Math.random()*.2],death:[1,1],pick:[.2,1.4+Math.random()*.8],bow:[1,1/(Math.random()*.4+1.2)+.25],eat:[.5,1+(Math.random()-Math.random())*.2],swim:[.25,1+(Math.random()-Math.random())*.4],splash:[.6,1+(Math.random()-Math.random())*.4],arrowhit:[1,1.2/(Math.random()*.2+.9)]}[type]||[1,.9+Math.random()*.2];
  const ev=packEvent(evs);if(ev){playBytes(ev.name,P0[0]*ev.volume*vol,P0[1]*ev.pitch);return;}
  const grp=names&&packGroup(names);
  if(grp){const k=grp[Math.random()*grp.length|0];const P={step:[.15,1],dig:[1,.8],mine:[.25,.5],hit:[1,1],hurt:[1,1],pick:[.2,1.6+Math.random()*.6],bow:[1,1/(Math.random()*.4+1.2)+.25],eat:[.5,1+(Math.random()-Math.random())*.2]}[type]||[1,.9+Math.random()*.2];
    playBytes(k,P[0]*vol,P[1]);return;}
  // procedural stand-ins
  const F=MAT_F[mat]||MAT_F.stone;
  switch(type){
  case 'step':return noiseHit(.09,F[0],F[1],.12*vol);
  case 'mine':return noiseHit(.07,F[0]*.8,F[1],.1*vol);
  case 'dig':noiseHit(.22,F[0],F[1],.35*vol,'bandpass',.6);return;
  case 'hit':case 'hurt':case 'death':noiseHit(.12,700,1,.35*vol,'lowpass',.4);tone('sine',170,85,.16,.25*vol);return;
  case 'fall':case 'fallbig':noiseHit(.2,400,1,.4*vol,'lowpass');return;
  case 'splash':noiseHit(.45,1800,.5,.25*vol,'bandpass',.5);return;case 'swim':noiseHit(.25,1400,.6,.08*vol);return;
  case 'bow':noiseHit(.2,1600,4,.25*vol,'bandpass',.4);return;case 'arrowhit':noiseHit(.08,2000,2,.2*vol);return;
  case 'chest':case 'chestclose':noiseHit(.25,500,3,.3*vol,'bandpass',type==='chest'?1.6:.6);return;
  case 'eat':noiseHit(.08,1200,1.5,.25*vol);return;case 'burp':tone('sawtooth',140,90,.25,.08*vol);return;case 'drink':tone('sine',300,200,.1,.12*vol);return;
  case 'pick':tone('sine',900+Math.random()*400,1600,.07,.12*vol);return;case 'glass':noiseHit(.3,4000,2,.25*vol,'highpass');return;case 'fizz':noiseHit(.5,5000,.5,.15*vol,'highpass');return;
  case 'squeak':tone('square',2400,3200,.09,.04*vol);return;case 'click':tone('square',700,500,.04,.05*vol);return;
  case 'tick':tone('square',880,880,.06,.05);return;case 'go':tone('square',523,1046,.35,.08);return;
  case 'win':tone('triangle',523,1568,.9,.09);return;case 'orb':tone('sine',1200,1800,.1,.08*vol);return;case 'slime':noiseHit(.2,250,3,.3*vol,'lowpass');return;
  }
}
// ================= render =================
let crackTex=[];const crackCube=(()=>{const F=[[[1,0,0],[[.5,.5,.5],[.5,.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]]],[[-1,0,0],[[-.5,.5,-.5],[-.5,.5,.5],[-.5,-.5,.5],[-.5,-.5,-.5]]],[[0,1,0],[[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]]],
  [[0,-1,0],[[-.5,-.5,.5],[.5,-.5,.5],[.5,-.5,-.5],[-.5,-.5,-.5]]],[[0,0,1],[[-.5,.5,.5],[.5,.5,.5],[.5,-.5,.5],[-.5,-.5,.5]]],[[0,0,-1],[[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,-.5],[.5,-.5,-.5]]]];
  const o=[];const uv=[[0,0],[1,0],[1,1],[0,1]];for(const [n,c] of F)for(const i of [0,1,2,0,2,3])o.push(...c[i],...n,...uv[i]);return meshFrom(o);})();
function initCracks(){for(const t of crackTex)gl.deleteTexture(t);crackTex=PACK.cracks.map(c=>mkTex(c));}
let cloudTex=null,cloudMesh=null,cloudScale=384;
function initClouds(){let c=mkCanvas(64,64),g=c.getContext('2d');for(let y=0;y<64;y++)for(let x=0;x<64;x++){const v=fbm(x*.18,y*.18,4242,3);if(v>.56){g.fillStyle='rgba(255,255,255,.82)';g.fillRect(x,y,1,1);}}
  if(PACK.clouds){c=mkCanvas(256,256);g=c.getContext('2d');g.globalAlpha=.8;g.drawImage(PACK.clouds,0,0);}const cell=PACK.clouds?256:64;cloudScale=cell*12/2;
  cloudTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,cloudTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const o=[];const q=[[-1,0,-1,0,0],[1,0,-1,2,0],[1,0,1,2,2],[-1,0,1,0,2]];for(const i of [0,1,2,0,2,3])o.push(q[i][0],0,q[i][2],0,-1,0,q[i][3],q[i][4]);cloudMesh=meshFrom(o);}
function drawClouds(){if(!cloudTex)initClouds();const y=Math.max(WY+14,60);const span=384;const off=(perfT*.6)%(span*2/8*12);
  const cx=Math.floor((camPos[0]+off)/(12*64/8))*0;useTex(VP,camPos);gl.uniform1f(PT.u.fogN,curFog.f*.9);gl.uniform1f(PT.u.fogF,curFog.f*2.6);gl.uniform1f(PT.u.bright,1.6);
  const P2=cloudScale*2;const sft=(perfT*.6)%P2;const m=chain(M4.tr(CX+sft-P2/2,y,CZ),M4.sc(P2,1,P2));drawMesh(cloudMesh,m,cloudTex);}
let fovMod=1,bobAmp=0,dtFrame=1/60,VP=null,camPos=[0,0,0],camYaw=0,camPitch=0,W=1,H=1,DPR=1,perfT=0,menuYaw=0;
const spectate={mode:'bat',idx:0,target:null};
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR|0;cv.height=H*DPR|0;hud.width=W*DPR|0;hud.height=H*DPR|0;}
addEventListener('resize',resize);resize();
// panorama (title screen) from a loaded pack
let panoTex=null;
function initPanorama(){if(!PACK.panorama)return;panoTex=PACK.panorama.map(img=>{const c=mkCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);return mkTex(c);});}
const panoMesh=(()=>{const faces=[ // 0 front(-z),1 right(+x),2 back(+z),3 left(-x),4 top,5 bottom
  [[-1,1,-1],[1,1,-1],[1,-1,-1],[-1,-1,-1]],[[1,1,-1],[1,1,1],[1,-1,1],[1,-1,-1]],[[1,1,1],[-1,1,1],[-1,-1,1],[1,-1,1]],[[-1,1,1],[-1,1,-1],[-1,-1,-1],[-1,-1,1]],
  [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]];
  return faces.map(c=>{const o=[];const uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of [0,1,2,0,2,3])o.push(...c[i],0,0,-1,...uv[i]);return meshFrom(o);});})();
function drawPanorama(P,yaw,pitch){gl.disable(gl.DEPTH_TEST);const V=chain(M4.rx(-pitch),M4.ry(-yaw));useTex(M4.mul(P,V),[0,0,0]);gl.uniform1f(PT.u.bright,1/.55);gl.uniform1f(PT.u.fogF,1e9);gl.uniform1f(PT.u.fogN,1e8);
  for(let i=0;i<6;i++)drawMesh(panoMesh[i],M4.sc(10,10,10),panoTex[i]);gl.enable(gl.DEPTH_TEST);}

function camera(){
  if(MATCH.state==='menu'||!player){menuYaw+=.0012;if(mapInfo){camPos=[CX+Math.sin(menuYaw)*48,40,CZ+Math.cos(menuYaw)*48];}camYaw=menuYaw;camPitch=-.25;return;}
  if(!player.alive&&spectate.mode==='follow'){const alive=aliveList().filter(e=>e!==player);if(alive.length){const t=alive[((spectate.idx%alive.length)+alive.length)%alive.length];spectate.target=t;
      const back=[Math.sin(t.yaw)*4,0,Math.cos(t.yaw)*4];let cp=[t.pos[0]+back[0],t.pos[1]+2.6,t.pos[2]+back[2]];const e=[t.pos[0],t.pos[1]+1.6,t.pos[2]];const d=[cp[0]-e[0],cp[1]-e[1],cp[2]-e[2]],L=Math.hypot(...d);
      const h=raycastBlock(e,[d[0]/L,d[1]/L,d[2]/L],L);if(h){const k=Math.max(.3,h.t-.3)/L;cp=[e[0]+d[0]*k,e[1]+d[1]*k,e[2]+d[2]*k];}camPos=cp;camYaw=t.yaw;camPitch=-.3;return;}spectate.mode='bat';}
  spectate.target=null;const rp=(player.alive&&player.rpos)||player.pos;camPos=[rp[0],rp[1]+eyeH(player),rp[2]];camYaw=player.yaw;camPitch=player.pitch;
}
let skyCol=[.53,.74,.96];
function render(){
  gl.viewport(0,0,cv.width,cv.height);const wantBlur=MATCH.state==='menu'?'blur(3px) brightness(.95)':'';if(cv.style.filter!==wantBlur)cv.style.filter=wantBlur;
  camera();
  const info=mapInfo||{sky:[.53,.74,.96],fog:[.53,.74,.96],fogDist:110};skyCol=info.sky;
  const fogF=MATCH.state==='menu'?150:info.fogDist*[.45,.7,1,1.35][OPT.rd];curFog={c:info.fog,n:fogF*.55,f:fogF};
  gl.clearColor(...info.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  // EntityRenderer: smoothed FOV modifier (sprint/speed, bow zoom), view bobbing, hurt camera roll
  let tf=1;if(player&&player.alive){tf=(1+(player.sprint?1.3:1)*speedMul(player))/2;if(player.using==='bow'){let f=Math.min(1,player.useT);f=f*f;tf*=1-f*.15;}if(player.inWater)tf*=.85;}
  fovMod+=((OPT.dynfov===false?1:tf)-fovMod)*Math.min(1,dtFrame*10);const fov=OPT.fov*fovMod*Math.PI/180;const P=M4.persp(fov,W/H,.05,400);
  if(MATCH.state==='menu'&&panoTex){drawPanorama(P,camYaw,camPitch*.3);drawHUD();return;}
  let pre=M4.id();
  if(player&&player.alive&&spectate.mode!=='follow'&&MATCH.state!=='menu'){const sp=player.onGround?Math.min(.1,Math.hypot(player.mot?player.mot[0]:0,player.mot?player.mot[2]:0)):0;bobAmp+=(sp-bobAmp)*Math.min(1,dtFrame*8);
    const f1=-player.walkT/1.0,a=OPT.bob?bobAmp:0;const ht=player.hurtT>0?Math.sin(Math.pow(player.hurtT/.5,4)*Math.PI)*14*Math.PI/180:0;
    pre=chain(M4.rz(-ht),M4.tr(Math.sin(f1*Math.PI)*a*.5,-Math.abs(Math.cos(f1*Math.PI)*a),0),M4.rz(Math.sin(f1*Math.PI)*a*3*Math.PI/180),M4.rx(Math.abs(Math.cos(f1*Math.PI-.2)*a)*5*Math.PI/180));}
  const V=chain(pre,M4.rx(-camPitch),M4.ry(-camYaw),M4.tr(-camPos[0],-camPos[1],-camPos[2]));VP=M4.mul(P,V);
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  if(!mapInfo){drawHUD();return;}
  // sky: horizon uses the fog colour, a sky-coloured plane above the camera fades into it (RenderGlobal.renderSky)
  if(mapInfo.skyLight&&!mapInfo.dark){gl.clearColor(...info.fog,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);useBox(VP,camPos);gl.uniform1f(PB.u.lit,0);
    gl.uniform1f(PB.u.fogN,0);gl.uniform1f(PB.u.fogF,fogF*1.6);box(chain(M4.tr(camPos[0],camPos[1]+16,camPos[2]),M4.sc(1400,.01,1400)),info.sky);
    gl.uniform3fv(PB.u.fogC,info.fog);box(chain(M4.tr(camPos[0],camPos[1]-24,camPos[2]),M4.sc(1400,.01,1400)),[info.fog[0]*.55,info.fog[1]*.6,info.fog[2]*.75]);
    gl.uniform1f(PB.u.lit,1);gl.enable(gl.DEPTH_TEST);}
  // world (opaque + cutout)
  gl.useProgram(PW.p);gl.uniformMatrix4fv(PW.u.vp,false,VP);gl.uniform3fv(PW.u.cam,camPos);gl.uniform3fv(PW.u.fogC,curFog.c);gl.uniform1f(PW.u.fogN,curFog.n);gl.uniform1f(PW.u.fogF,curFog.f);gl.uniform1f(PW.u.alpha,1);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.uniform1i(PW.u.tex,0);
  const bindW=buf=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(PW.a.p);gl.vertexAttribPointer(PW.a.p,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(PW.a.t);gl.vertexAttribPointer(PW.a.t,2,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(PW.a.s);gl.vertexAttribPointer(PW.a.s,1,gl.FLOAT,false,24,20);};
  const vis=c=>c&&Math.hypot(c.ci*16+8-camPos[0],c.cj*16+8-camPos[2])<=fogF+24;
  for(const c of chunks){if(!vis(c)||!c.count)continue;bindW(c.buf);gl.drawArrays(gl.TRIANGLES,0,c.count);}
  gl.disableVertexAttribArray(PW.a.t);gl.disableVertexAttribArray(PW.a.s);
  // entities
  useTex(VP,camPos);
  for(const e of ents){if(e===player&&player.alive&&spectate.mode!=='follow')continue;if(e===player&&!player.alive&&spectate.mode==='bat')continue;
    if(e.bat&&!e.alive){drawBat(e);continue;}if(!e.alive)continue;drawHumanoid(e);}
  // chests are tile-entity models (TileEntityChestRenderer), lid animated
  for(const c of chests.values()){if(getB(c.x,c.y,c.z)!==B.CHEST)continue;if(Math.hypot(c.x+.5-camPos[0],c.z+.5-camPos[2])>fogF+8)continue;
    if(c.rot==null)c.rot=chestFacing(c);const lid=c.lidPrev+(c.lid-c.lidPrev)*tickAlpha();const f=1-Math.pow(1-lid,3);
    setEntLight([c.x+.5,c.y+.5,c.z+.5]);const base=chain(M4.tr(c.x+.5,c.y,c.z+.5),M4.ry(c.rot));const M=MODELS.chest;
    drawMesh(M.base,base,CHEST_TEX);const lm=chain(base,M4.tr(0,9/16,7/16),M4.rx(f*Math.PI/2));drawMesh(M.lid,lm,CHEST_TEX);drawMesh(M.knob,lm,CHEST_TEX);}
  // dropped items and projectiles
  for(const d of drops){const m=chain(M4.tr(d.pos[0],d.pos[1]+Math.sin(d.spin*1.5)*.08+.12,d.pos[2]),M4.ry(d.spin),M4.sc(.45,.45,.45));setEntLight(d.pos);drawMesh(getItemMesh(d.id),m,itemTex);}
  for(const a of projs){if(a.kind==='splash'){setEntLight(a.pos);drawMesh(getItemMesh(a.pot),chain(M4.tr(...a.pos),M4.ry(perfT*8),M4.sc(.4,.4,.4)),itemTex);continue;}
    const l=Math.hypot(...a.vel)||1;const yw=Math.atan2(-a.vel[0],-a.vel[2]),pt=Math.asin(clamp(a.vel[1]/l,-1,1));setEntLight(a.pos);
    drawMesh(getItemMesh('arrow'),chain(M4.tr(...a.pos),M4.ry(yw),M4.rx(pt),M4.ry(Math.PI/2),M4.rz(-Math.PI/4),M4.sc(.7,.7,.7)),itemTex);}
  // particles, highlights, beacon beam, borders (solid colour)
  useBox(VP,camPos);
  for(const p of particles)box(chain(M4.tr(...p.p),M4.sc(.08,.08,.08)),p.col);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(PB.u.lit,0);
  if(MATCH.mode==='br'&&MATCH.state==='play'&&player&&player.alive&&locked&&!chestOpen){const h=raycastBlock(eye(player),fwd(player),4.5);
    if(h){const pr=mining&&mining.x===h.x&&mining.y===h.y&&mining.z===h.z?mining.t/MINE_T[mining.b]:0;
      if(crackTex.length&&pr>0){useTex(VP,camPos);gl.uniform1f(PT.u.bright,1);drawMesh(crackCube,chain(M4.tr(h.x+.5,h.y+.5,h.z+.5),M4.sc(1.004,1.004,1.004)),crackTex[Math.min(9,Math.floor(pr*10))]);useBox(VP,camPos);gl.uniform1f(PB.u.lit,0);}
      else box(chain(M4.tr(h.x+.5,h.y+.5,h.z+.5),M4.sc(1.006,1.006,1.006)),[0,0,0],.08+pr*.55);}}
  // water (translucent) after opaque things
  gl.depthMask(false);gl.useProgram(PW.p);gl.uniform1f(PW.u.alpha,.99);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTex);if(!window.__noWater)for(const c of chunks){if(!vis(c)||!c.wcount)continue;bindW(c.wbuf);gl.drawArrays(gl.TRIANGLES,0,c.wcount);}
  gl.disableVertexAttribArray(PW.a.t);gl.disableVertexAttribArray(PW.a.s);
  useBox(VP,camPos);gl.uniform1f(PB.u.lit,0);
  if(mapInfo.skyLight&&!mapInfo.dark){gl.uniform1f(PB.u.lit,0);if(OPT.clouds)drawClouds();useBox(VP,camPos);gl.uniform1f(PB.u.lit,0);}
  if(mapInfo.stars)drawStars();
  if(mapInfo.center&&!mapInfo.noBeam&&MATCH.state!=='lobby'){const [bx,by,bz]=mapInfo.center;const a=.35+.08*Math.sin(perfT*3);box(chain(M4.tr(bx+.5,by+60,bz+.5),M4.ry(perfT*.6),M4.sc(.5,120,.5)),[.75,1,1],a);box(chain(M4.tr(bx+.5,by+60,bz+.5),M4.ry(-perfT*.4),M4.sc(.8,120,.8)),[.6,.95,1],a*.35);}
  if(MATCH.mode==='br'&&br&&br.border&&br.border.cx<1e6&&MATCH.state!=='lobby'){const h=brSize()/2,cx=br.border.cx,cz=br.border.cz,a=.2+.06*Math.sin(perfT*2.5);const col=br.border.to<brSize()-.01?[1,.35,.25]:[.25,.6,1];
    box(chain(M4.tr(cx,28,cz-h),M4.sc(h*2,80,.05)),col,a);box(chain(M4.tr(cx,28,cz+h),M4.sc(h*2,80,.05)),col,a);box(chain(M4.tr(cx-h,28,cz),M4.sc(.05,80,h*2)),col,a);box(chain(M4.tr(cx+h,28,cz),M4.sc(.05,80,h*2)),col,a);}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(PB.u.lit,1);
  // first-person hand
  if(player&&player.alive&&MATCH.state!=='menu'){gl.clear(gl.DEPTH_BUFFER_BIT);drawHand(M4.persp(70*Math.PI/180,W/H,.01,10));}
  // underwater / lava tint
  drawHUD();
}
function setEntLight(p){const x=Math.floor(p[0]),z=Math.floor(p[2]),y=Math.floor(p[1]+.5);const a=lightAt(x,y,z),b=lightAt(x,y+1,z);const L=Math.max(a>>4,b>>4)<<4|Math.max(a&15,b&15);const v=Math.max(LB[(L>>4)&15]*(mapInfo&&mapInfo.dark?(mapInfo.skyMul||0):1),LB[L&15],mapInfo&&mapInfo.dark?.12:.2);gl.uniform1f(PT.u.bright,v);}
function drawHumanoid(e){
  const invis=e.effects.invis;const S=skinTex(e.skin);const M=S.slim?MODELS.slim:MODELS.wide;
  const rp=e.rpos||e.pos;const by=e.bodyYaw==null?e.yaw:e.bodyYaw;const base=chain(M4.tr(rp[0],rp[1]-(e.sneak?.12:0),rp[2]),M4.ry(by),M4.sc(.9/1,.9,.9));const headTurn=e.yaw-by;
  const sp=Math.min(1,Math.hypot(e.vel[0],e.vel[2])/4.3);const sw=Math.sin(e.walkT*2.2)*.75*sp;
  const atk=e.swing>0?-Math.sin(e.swing*Math.PI)*1.6:0;const aim=e.using==='bow'?-Math.PI/2-e.pitch:0;const eat=(e.using==='eat'||e.using==='drink')?-1.2+Math.sin(e.useT*20)*.15:e.using==='block'?-.95:0;
  const rA=aim||eat||(-sw+atk),lA=aim?aim:sw;
  const idle=Math.sin(perfT*1.3+e.pos[0])*.05;const parts={head:chain(base,M4.tr(0,1.5,0),M4.ry(headTurn),M4.rx(-e.pitch)),body:chain(base,M4.tr(0,1.5,0)),rarm:chain(base,M4.tr(5/16,22/16,0),M4.rx(rA+idle*.5),M4.rz(aim?0:.05+idle)),larm:chain(base,M4.tr(-5/16,22/16,0),M4.rx(lA-idle*.5),M4.rz(-.05-idle)),
    rleg:chain(base,M4.tr(1.9/16,.75,0),M4.rx(sw)),lleg:chain(base,M4.tr(-1.9/16,.75,0),M4.rx(-sw))};
  setEntLight(e.pos);gl.uniform1f(PT.u.hurt,e.hurtT>0?1:0);
  if(!invis){for(const [m,ov] of [['head','hat'],['body','jacket'],['rarm','rsleeve'],['larm','lsleeve'],['rleg','rpants'],['lleg','lpants']]){drawMesh(M[m],parts[m],S.tex);drawMesh(M[ov],parts[m],S.tex);}}
  // armor layers
  const A=MODELS.armor;e.armor.forEach((a,i)=>{if(!a||!ITEMS[a])return;const it=ITEMS[a];const T=ARMOR_TEX[it.tier];if(!T)return;if(T.tint)gl.uniform4f(PT.u.tint,...T.tint,1);
    if(i===0)drawMesh(A.head,parts.head,T.l1);
    if(i===1){drawMesh(A.body,parts.body,T.l1);drawMesh(A.rarm,parts.rarm,T.l1);drawMesh(A.larm,parts.larm,T.l1);}
    if(i===2){drawMesh(A.body2,parts.body,T.l2);drawMesh(A.rleg2,parts.rleg,T.l2);drawMesh(A.lleg2,parts.lleg,T.l2);}
    if(i===3){drawMesh(A.rleg,parts.rleg,T.l1);drawMesh(A.lleg,parts.lleg,T.l1);}
    gl.uniform4f(PT.u.tint,1,1,1,1);});
  // held item
  const s=e.inv[e.sel];if(s){const it=ITEMS[s.id];const tool=it.type==='weapon'||it.type==='bow';
    const m=chain(parts.rarm,M4.tr(-.03,-.62,-.12),M4.rx(tool?-Math.PI/2+.4:-Math.PI/2),M4.ry(Math.PI/2),M4.rz(tool?-Math.PI/4:0),M4.sc(tool?.7:.45,tool?.7:.45,tool?.7:.45));drawMesh(getItemMesh(s.id),m,itemTex);}
  gl.uniform1f(PT.u.hurt,0);
  if(e.fire>0){useBox(VP,camPos);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.uniform1f(PB.u.lit,0);for(let i=0;i<3;i++)box(chain(M4.tr(e.pos[0],e.pos[1]+.9+Math.sin(perfT*9+i)*.2,e.pos[2]),M4.ry(perfT*2+i*2),M4.sc(.7,1.6,.7)),[1,.5+.2*i,.1],.18);gl.disable(gl.BLEND);useTex(VP,camPos);}
}
// chests face the open side, preferring the direction toward the middle of the map
function chestFacing(c){const dirs=[[0,-1],[1,0],[0,1],[-1,0]];const tx=CX-c.x-.5,tz=CZ-c.z-.5;let best=null,bs=-1e9;
  for(const [dx,dz] of dirs){const nb=getB(c.x+dx,c.y,c.z+dz);const open=!nb||!BD[nb].solid||!BD[nb].opaque;const sc=(open?100:0)+(dx*tx+dz*tz)/(Math.hypot(tx,tz)||1);if(sc>bs){bs=sc;best=[dx,dz];}}
  return Math.atan2(-best[0],-best[1]);}
// 20 TPS lid animation (TileEntityChest: +/-0.1 per tick)
let chestAcc=0;const tickAlpha=()=>clamp(chestAcc/TICK,0,1);
function tickChestLids(){for(const [k,c] of chests){c.lidPrev=c.lid;if(c.botOpen>0)c.botOpen-=.05;
    const open=chestOpen===c||(c.botOpen>0)||ents.some(e=>!e.isLocal&&e.alive&&e.openChest===k);
    if(open&&c.lid===0&&chestOpen!==c&&c.rot!=null)sfx('chest',{pos:[c.x+.5,c.y+.5,c.z+.5]});
    const was=c.lid;c.lid=clamp(c.lid+(open?.1:-.1),0,1);if(!open&&was>=.5&&c.lid<.5&&chestOpen!==c&&c.rot!=null&&!c.selfClose)sfx('chestclose',{pos:[c.x+.5,c.y+.5,c.z+.5]});if(c.lid===0)c.selfClose=false;}}
// night sky over Crucible: fixed star field far away (not fogged)
let STARS=null;
function drawStars(){if(!STARS){STARS=[];let r=12345;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};for(let i=0;i<420;i++){const u=rnd()*2-1,t=rnd()*Math.PI*2;const y=Math.abs(u)*.92+.08;const q=Math.sqrt(1-y*y);STARS.push([Math.cos(t)*q,y,Math.sin(t)*q,.5+rnd()*1.1,.55+rnd()*.45]);}}
  gl.uniform1f(PB.u.lit,0);gl.uniform1f(PB.u.fogN,1e6);gl.uniform1f(PB.u.fogF,2e6);
  for(const [x,y,z,sz,b] of STARS){const tw=b*(.85+.15*Math.sin(perfT*2+x*40));box(chain(M4.tr(camPos[0]+x*300,camPos[1]+y*300,camPos[2]+z*300),M4.sc(sz,sz,sz)),[tw,tw,tw*1.05]);}
  gl.uniform1f(PB.u.fogN,curFog.n);gl.uniform1f(PB.u.fogF,curFog.f);}
function drawBat(e){
  const flap=Math.sin(perfT*18+e.pos[0])*1.1;const base=chain(M4.tr(e.pos[0],e.pos[1]+Math.sin(perfT*3)*.1,e.pos[2]),M4.ry(e.yaw),M4.rz(Math.PI),M4.sc(.35,.35,.35));const M=MODELS.bat;setEntLight(e.pos);
  for(const k of ['head','rear','lear','body'])drawMesh(M[k],base,BAT_TEX);
  drawMesh(M.rwing,chain(base,M4.ry(flap)),BAT_TEX);drawMesh(M.lwing,chain(base,M4.ry(-flap)),BAT_TEX);
}
function drawHand(proj){
  const p=player;const s=p.inv[p.sel],it=s&&ITEMS[s.id];
  const bob=0;const sw=0;
  // ItemRenderer (1.8): equip progress and swing curves
  const held=s?s.id:null;if(held!==p.lastHeld){p.lastHeld=held;p.equip=0;}p.equip=Math.min(1,(p.equip==null?1:p.equip)+dtFrame*8);const eq=1-p.equip;
  const sp=p.swing>0?1-p.swing:0;const r1=Math.sin(Math.sqrt(sp)*Math.PI),r2=Math.sin(sp*sp*Math.PI),r3=Math.sin(Math.sqrt(sp)*Math.PI*2),r4=Math.sin(sp*Math.PI);
  let base=chain(M4.tr(.56-.4*r1*.5,-.6+.2*r3*.5-eq*.6,-.9-.2*r4*.5),M4.ry(-r2*20*Math.PI/180),M4.rz(-r1*20*Math.PI/180),M4.rx(-r1*70*Math.PI/180));
  if(p.using==='eat'||p.using==='drink')base=chain(M4.tr(.2,-.38+Math.sin(p.useT*20)*.03,-.55),M4.ry(.7));
  if(p.using==='block')base=chain(M4.tr(.34,-.42,-.66),M4.ry(.75),M4.rz(.45),M4.rx(-.2));
  if(p.using==='bow'){const pw=bowCharge(p.useT);base=chain(M4.tr(.18,-.32,-.6+pw*.1),M4.rz(-.2+Math.random()*.01*pw));}
  useTex(proj,[0,0,0]);gl.uniform1f(PT.u.fogF,1e9);gl.uniform1f(PT.u.fogN,1e8);setEntLight(p.pos);
  const S=skinTex(p.skin);const M=S.slim?MODELS.slim:MODELS.wide;
  if(!it){ // vanilla-style empty hand: the right arm rises from the bottom-right corner, leaning in toward the crosshair
    const walk=Math.min(1,Math.hypot(p.vel[0],p.vel[2])/4);const bx=Math.sin(p.walkT*2.2)*.03*walk,by=-Math.abs(Math.cos(p.walkT*2.2))*.03*walk;
    const d=[-.2,.92,-.36];const L=Math.hypot(...d);for(let i=0;i<3;i++)d[i]/=L;
    const Y=[-d[0],-d[1],-d[2]];let X=[Y[1]*1-Y[2]*0,Y[2]*0-Y[0]*1,0];const lx=Math.hypot(...X);X=X.map(v=>v/lx);const Z=[X[1]*Y[2]-X[2]*Y[1],X[2]*Y[0]-X[0]*Y[2],X[0]*Y[1]-X[1]*Y[0]];
    const R=new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,0,0,0,1]);
    const m=chain(M4.tr(.44-.3*r1*.6,-.34+.4*r3*.4-eq*.6,-.95-.4*r4*.4),M4.ry(r1*55*Math.PI/180),M4.rz(-r2*20*Math.PI/180),R,M4.ry(-.35),M4.sc(.92,.92,.92),M4.tr(0,10/16,0));
    drawMesh(M.rarm,m,S.tex);drawMesh(M.rsleeve,m,S.tex);
    if(p.armor[1]){const T=ARMOR_TEX[ITEMS[p.armor[1]].tier];drawMesh(MODELS.armor.rarm,m,T.l1);}return;}
  const tool=it.type==='weapon';
  if(it.type==='bow')drawMesh(getItemMesh(s.id),chain(base,M4.ry(-Math.PI/2+.3),M4.rz(-.2),M4.sc(.65,.65,.65)),itemTex);
  else if(tool)drawMesh(getItemMesh(s.id),chain(base,M4.tr(.02,.16,-.08),M4.ry(-Math.PI/2+.75),M4.rz(.2),M4.sc(-.5,.5,.5)),itemTex);
  else drawMesh(getItemMesh(s.id),chain(base,M4.tr(-.04,.05,0),M4.ry(-.4),M4.sc(.42,.42,.42)),itemTex);
}
