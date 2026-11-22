// ================= main loop =================
function update(dt){
  pollPad(dt);tickAmbience(dt);tickLCE(dt);
  if(MATCH.state==='menu'||!player)return;
  if(paused&&!online)return;
chestAcc+=dt;while(chestAcc>=TICK){chestAcc-=TICK;tickChestLids();}
  if(MATCH.state==='play'){
    if(MATCH.preT>0){const prev=Math.ceil(MATCH.preT);MATCH.preT-=dt;const now=Math.ceil(MATCH.preT);if(now!==prev&&now>0&&now<=5)sfx('tick');
      if(MATCH.preT<=0){MATCH.preT=0;sfx('go');if(MATCH.mode==='battle'){if(SET.grace>0)chatMsg(`Invulnerability wears off in ${SET.grace} seconds!`,'#fff',false);}else{chatMsg('Let the games begin!','#fff',false);announce('Let the games begin!','',2.5,false);}}}
    else MATCH.gameT+=dt;}
  for(const e of ents){
    e.invuln=Math.max(0,e.invuln-dt);e.hurtT=Math.max(0,e.hurtT-dt);e.atkCD-=dt;e.swing=Math.max(0,e.swing-dt*4);e.lastHurt+=dt;e.lastAttackT+=dt;
    if(e===player)updatePlayer(dt);
    else if(e.kind==='bot'&&isHost()){if(e.alive)updateBot(e,dt);}
    else interpRemote(e,dt);
    updateBodyYaw(e,dt);
  }
  if(isHost()){if(MATCH.state==='play')hostMatchTick(dt);else if(MATCH.state==='lobby'&&online)hostLobbyTick(dt);}
  for(const c of chests.values())if(c.claimT)c.claimT-=dt;
  updateProjs(dt);updateDrops(dt);updateParticles(dt);
  for(const f of feed)f.t-=dt;feed=feed.filter(f=>f.t>0);for(const m of msgs)m.t-=dt;msgs=msgs.filter(m=>m.t>0);for(const c of chat)c.t-=dt;chat=chat.filter(c=>c.t>0);
  selShow=Math.max(0,selShow-dt);
  sendMyState(dt);sendBots(dt);
}
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;perfT+=dt;dtFrame=dt;try{update(dt);render();}catch(err){console.error(err);}requestAnimationFrame(frame);}
rebuildIcons();rebuildItemAtlas();initEntityTextures();
generateMap('skyhold',1,false);buildMesh();refreshSkinPicker();
requestAnimationFrame(frame);
(async()=>{let n=await loadSavedPacks();
  if(location.protocol!=='file:')for(const name of ['pack.zip','resourcepack.zip','sounds.zip']){try{const r=await fetch(name);if(r.ok){const buf=await r.arrayBuffer();n+=await loadPackBuffer(buf,name)?1:0;}}catch(e){}}
  if(n){applyPack();refreshPackList();}})();
window.__bb={get state(){return MATCH.state;},get MATCH(){return MATCH;},get ents(){return ents;},get player(){return player;},get chests(){return chests;},get br(){return br;},get net(){return net;},SET,update,hostStartMatch,generateMap,loadPackBuffer,applyPack,PACK,get drops(){return drops;},getB,fluidAt,BD,topSolid,physics,mcTick,setB,B,enterLobby,hurt,doAttack,fireBow,bowCharge,get projs(){return projs;},update,sfx,packEvent,packGroup,get actx(){return actx;},initAudio,sndCache,get atlas(){return atlasCanvas;},get cam(){return [camPos,camYaw,camPitch];}};
