// ================= Java-style Options screens (Options / Video Settings / Music & Sounds / Controls / Game Rules / Maps) =================
let jPage='main',jReturn='menu';
const JPAGES={};
function jLabel(b){const t=typeof b._label==='function'?b._label():b._label;b.textContent='';const off=b.classList.contains('off');
  const n=pxCanvas(t,GS,off?'#a0a0a0':'#e0e0e0'),s=pxCanvas(t,GS,off?'#a0a0a0':'#ffffa0');n.className='n';s.className='s';if(b._knob)b.appendChild(b._knob);b.append(n,s);b.setAttribute('aria-label',t);}
function jBtn(label,fn,cls){const b=document.createElement('button');b.className='jb'+(cls?' '+cls:'');b._label=label;
  b.addEventListener('click',()=>{if(b.classList.contains('off'))return;sfx('click');fn&&fn(b);if(document.body.contains(b))jLabel(b);});jLabel(b);return b;}
function jSlider(label,get,set,steps,onEnd){const b=document.createElement('div');b.className='jb jslider';b.tabIndex=0;b.setAttribute('role','slider');b._label=label;
  const k=document.createElement('span');k.className='knob';b._knob=k;const place=()=>{k.style.left=`calc(${get()} * (100% - var(--S) * 8px))`;b.setAttribute('aria-valuenow',Math.round(get()*100));};
  const fromX=x=>{const r=b.getBoundingClientRect();const kw=8*GS;let v=clamp((x-r.left-kw/2)/(r.width-kw),0,1);if(steps)v=Math.round(v*steps)/steps;set(v);place();jLabel(b);};
  let drag=false;b.addEventListener('pointerdown',e=>{drag=true;try{b.setPointerCapture(e.pointerId);}catch(_){}fromX(e.clientX);});
  b.addEventListener('pointermove',e=>{if(drag)fromX(e.clientX);});
  const end=()=>{if(drag){drag=false;sfx('click');saveOpt();onEnd&&onEnd();}};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
  b.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='ArrowRight'){set(clamp(get()+(e.code==='ArrowLeft'?-1:1)/(steps||20),0,1));place();jLabel(b);saveOpt();onEnd&&onEnd();e.preventDefault();e.stopPropagation();}});
  place();jLabel(b);return b;}
const onOff=v=>v?'ON':'OFF';
const remesh=()=>{if(mapInfo)buildMesh();};
// cycle a hidden game-option <select>/checkbox/number and apply it with readOptions()
function ruleBtn(id,name){const el=$(id);const text=()=>{if(el.type==='checkbox')return onOff(el.checked);if(el.type==='number')return String(el.value);const o=el.options[el.selectedIndex];return o?o.text.replace(/\s*\(.*\)\s*/,'').trim():'';};
  return jBtn(()=>`${name}: ${text()}`,()=>{if(el.type==='checkbox')el.checked=!el.checked;else if(el.type==='number')el.value=(+el.value+1)%((+el.max||15)+1);else el.selectedIndex=(el.selectedIndex+1)%el.options.length;readOptions();});}
JPAGES.main=()=>({title:'Options',items:[
  jSlider(()=>OPT.fov===70?'FOV: Normal':OPT.fov>=110?'FOV: Quake Pro':'FOV: '+OPT.fov,()=>(OPT.fov-30)/80,v=>{OPT.fov=Math.round(30+v*80);},80),
  ruleBtn('o_diff','Bot Difficulty'),
  jBtn('Music & Sounds...',()=>jOpen('sound')),jBtn('Video Settings...',()=>jOpen('video')),
  jBtn('Controls...',()=>jOpen('controls')),jBtn(()=>'Mobile Controls: '+({auto:'Auto',on:'ON',off:'OFF'})[OPT.mobile],()=>{OPT.mobile=({auto:'on',on:'off',off:'auto'})[OPT.mobile];saveOpt();applyTouchSetting();}),
  jBtn('Game Rules...',()=>jOpen('rules')),jBtn('Maps...',()=>jOpen('maps')),
  jBtn('Skin & Name...',()=>{jClose(true);openDress();}),jBtn('Texture Packs...',()=>{jClose(true);hide('menu');show('packPanel');refreshPackList();})]});
JPAGES.video=()=>({title:'Video Settings',items:[
  jBtn(()=>'Graphics: '+(OPT.fancy?'Fancy':'Fast'),()=>{OPT.fancy=!OPT.fancy;saveOpt();reuploadAtlas();}),
  jBtn(()=>'Render Distance: '+['Tiny','Short','Normal','Far'][OPT.rd],()=>{OPT.rd=(OPT.rd+1)%4;saveOpt();}),
  jBtn(()=>'Smooth Lighting: '+onOff(OPT.smooth),()=>{OPT.smooth=!OPT.smooth;saveOpt();remesh();}),
  jBtn(()=>'Performance: '+['Max FPS','Balanced','Power Saver'][OPT.fps],()=>{OPT.fps=(OPT.fps+1)%3;saveOpt();}),
  jBtn(()=>'Fullscreen: '+onOff(!!document.fullscreenElement),()=>{try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});}catch(e){}setTimeout(()=>jRender(),400);}),
  jBtn(()=>'View Bobbing: '+onOff(OPT.bob),()=>{OPT.bob=!OPT.bob;saveOpt();}),
  jBtn(()=>'GUI Scale: '+['Auto','Small','Normal','Large'][OPT.gui],()=>{OPT.gui=(OPT.gui+1)%4;saveOpt();refreshLCE();jRender();}),
  jBtn(()=>'Dynamic FOV: '+onOff(OPT.dynfov!==false),()=>{OPT.dynfov=OPT.dynfov===false;saveOpt();}),
  jSlider(()=>OPT.bright<=0?'Brightness: Moody':OPT.bright>=1?'Brightness: Bright':'Brightness: +'+Math.round(OPT.bright*100)+'%',()=>OPT.bright,v=>{OPT.bright=v;},20,()=>{rebuildLB();remesh();}),
  jBtn(()=>'Clouds: '+onOff(OPT.clouds),()=>{OPT.clouds=!OPT.clouds;saveOpt();}),
  jBtn(()=>'Particles: '+['Minimal','Decreased','All'][OPT.particles],()=>{OPT.particles=(OPT.particles+2)%3;saveOpt();}),
  jBtn(()=>'Show FPS: '+onOff(OPT.showFps),()=>{OPT.showFps=!OPT.showFps;saveOpt();}),
  jBtn(()=>'In-Game Tooltips: '+onOff(OPT.tips!==false),()=>{OPT.tips=OPT.tips===false;saveOpt();}),
  jBtn(()=>'Animated Character: '+onOff(OPT.animChar!==false),()=>{OPT.animChar=OPT.animChar===false;saveOpt();})]});
JPAGES.sound=()=>({title:'Music & Sound Options',items:[
  jSlider(()=>'Master Volume: '+(OPT.vol>0?Math.round(OPT.vol*100)+'%':'OFF'),()=>OPT.vol,v=>{OPT.vol=v;if(masterOut)masterOut.gain.value=v;},20),
  jSlider(()=>'Music: '+(OPT.music>0?Math.round(OPT.music*100)+'%':'OFF'),()=>OPT.music,v=>{OPT.music=v;if(musicGain)musicGain.gain.value=.35*v;},20)]});
JPAGES.controls=()=>{const keys=[['Attack','Left Click'],['Use Item','Right Click'],['Forward / Back','W / S'],['Left / Right','A / D'],['Jump','Space'],['Sneak','Shift'],['Sprint','Ctrl or W W'],['Inventory','E'],['Drop Item','Q'],['Hotbar','1-9, Wheel'],['Ready (lobby)','R'],['Player List','Tab']];
  return {title:'Controls',items:[
  jSlider(()=>SENS<=0?'Sensitivity: *yawn*':SENS>=1?'Sensitivity: HYPERSPEED!!!':'Sensitivity: '+Math.round(SENS*200)+'%',()=>SENS,v=>{SENS=v;store('bb_sens',SENS);if($('o_sens'))$('o_sens').value=Math.round(SENS*200);},40),
  jBtn(()=>'Invert Mouse: '+onOff(INVY),()=>{INVY=!INVY;store('bb_invy',INVY?'1':'0');if($('o_invy'))$('o_invy').checked=INVY;})].concat(keys.map(([a,k])=>jBtn(`${a}: ${k}`,null,'off')))};};
JPAGES.rules=()=>({title:'Game Rules',items:[ruleBtn('o_mode','Mode'),ruleBtn('o_round','Round Length'),ruleBtn('o_hunger','Hunger Rate'),ruleBtn('o_refill','Item Respawn'),ruleBtn('o_grace','Grace Period'),
  ruleBtn('o_show','Showdown'),ruleBtn('o_take','Take Everything'),ruleBtn('o_central','Central Spawn'),ruleBtn('o_bots','Bots'),ruleBtn('o_diff','Bot Difficulty'),ruleBtn('o_brlen','Battle Royale Length'),ruleBtn('o_brx','BR Extra Loot'),ruleBtn('o_ench','Enchanted Loot')]});
JPAGES.maps=()=>({title:'Maps',items:MAPS.map(m=>jBtn(()=>`${m.name}: ${onOff($('map_'+m.id).checked)}`,()=>{const el=$('map_'+m.id);el.checked=!el.checked;if(!MAPS.some(q=>$('map_'+q.id).checked))el.checked=true;readOptions();}))});
function jRender(){const P=JPAGES[jPage]();pxSet($('jTitle'),P.title,'#ffffff');const g=$('jGrid');g.textContent='';for(const it of P.items)g.appendChild(it);
  if(P.items.length%2)P.items[P.items.length-1].classList.add('full');
  const f=$('jFoot');f.textContent='';f.appendChild(jBtn('Done',jBack,'wide'));const hb=document.createElement('button');hb.id='jDoneHidden';hb.className='hidden';hb.addEventListener('click',jBack);f.appendChild(hb);const first=g.querySelector('.jb:not(.off)');}
function jOpen(page){jPage=page;jRender();}
function jBack(){if(jPage==='main'||(jPage==='rules'&&jReturn==='lobbyPanel'))jClose();else jOpen('main');}
function jClose(silent){hide('jOpt');if(!silent)show(jReturn);}
function openOptions(ret,page){jReturn=ret||'menu';['menu','pause','lobbyPanel'].forEach(hide);show('jOpt');jOpen(page||'main');}
$('pauseOpts').addEventListener('click',()=>{sfx('click');openOptions('pause');});
document.addEventListener('keydown',e=>{if($('jOpt').classList.contains('hidden'))return;if(e.target&&e.target.tagName==='INPUT')return;if(e.code==='Escape'||e.code==='Backspace'){jBack();e.preventDefault();}},true);
// FPS counter
let fpsS=60;function drawFps(){fpsS+=(1/Math.max(1e-3,dtFrame)-fpsS)*.05;txt(Math.round(fpsS)+' fps',W-14,20,14,'#ffffff','right');}
