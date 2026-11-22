// ================= resource packs (loaded at runtime from the player's own files; nothing is bundled) =================
const PACK={clouds:null,cracks:null,font:null,names:[],icons:null,gui:{},skins:[],armor:{},bat:null,panorama:null,click:null,chestTex:null};
// procedural skins/armor/bat so the game looks right without any pack
function procSkin(seed){
  rs=seed>>>0||1;const c=mkCanvas(64,64),g=c.getContext('2d');
  const pick=a=>a[Math.floor(srand()*a.length)];
  const skin=pick(['#e8b48a','#c68e64','#8d5a3b','#f2c9a0','#6b4430','#d9a27a']),hair=pick(['#3b2414','#1c1410','#7a4a1c','#d8b048','#8a1c10','#e8e0d0','#2a2a6a']),
    shirt=pick(['#3d7be0','#e0463d','#3dbf5a','#e0b43d','#9b3de0','#3dd2e0','#e07a3d','#e03d9b','#6f6f6f','#2f3a8f','#8f2f2f','#2f8f6f','#d0d0d0','#4a2f8f']),
    pants=pick(['#2c3e7a','#3b3b3b','#5a3d22','#1f5a3a','#6a6a6a']),shoes=pick(['#2a2a2a','#5a3a1a','#e8e8e8']),eye=pick(['#3a5ad8','#3a8a3a','#5a3a1a','#222']);
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  const noise=(x,y,w,h,col,k=.08)=>{R(x,y,w,h,col);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=hash2(x+i,y+j,seed)-.5;g.fillStyle=v>0?`rgba(255,255,255,${v*k})`:`rgba(0,0,0,${-v*k*1.5})`;g.fillRect(x+i,y+j,1,1);}};
  // head (0,0) 8x8x8
  noise(0,0,32,16,skin);noise(8,0,8,8,hair);noise(16,0,8,8,hair);noise(0,8,8,3,hair);noise(16,8,8,3,hair);noise(24,8,8,8,hair);noise(8,8,8,2,hair);
  R(8,8,1,4,hair);R(15,8,1,4,hair);R(9,12,2,1,'#fff');R(10,12,1,1,eye);R(13,12,2,1,'#fff');R(13,12,1,1,eye);R(11,14,2,1,shadeHex(skin,.75));R(10,15,4,1,shadeHex(skin,.6));
  // body (16,16)
  noise(16,16,24,16,shirt);R(20,20,8,1,shadeHex(shirt,.8));
  // arms (40,16) and left (32,48)
  noise(40,16,16,16,skin);noise(44,16,4,4,shirt);noise(40,20,16,5,shirt);noise(32,48,16,16,skin);noise(36,48,4,4,shirt);noise(32,52,16,5,shirt);
  // legs (0,16) and left (16,48)
  noise(0,16,16,16,pants);noise(0,29,16,3,shoes);noise(4,16,4,4,pants);noise(8,16,4,4,shoes);
  noise(16,48,16,16,pants);noise(16,61,16,3,shoes);noise(24,48,4,4,shoes);
  return c;
}
function procArmor(tier,layer){
  const c=mkCanvas(64,32),g=c.getContext('2d');const col=ARMOR_TIERS[tier][2];const R=(x,y,w,h,k=1)=>{g.fillStyle=shadeHex(col,k);g.fillRect(x,y,w,h);};
  const tex=(x,y,w,h)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=hash2(x+i,y+j,tier*7+layer);R(x+i,y+j,1,1,.8+v*.3);}};
  if(layer===1){tex(0,0,32,16);g.clearRect(8,8+4,8,4);g.clearRect(0,8+4,8,4);g.clearRect(16,8+4,8,4);g.clearRect(24,8+4,8,4);R(9,11,6,1,.5);
    tex(16,16,24,16);tex(40,16,16,16);g.clearRect(40,16+4+6,16,6);g.clearRect(44,16,8,4);
    tex(0,16,16,16);g.clearRect(0,20,16,8);g.clearRect(4,16,4,4);}
  else{tex(16,16,24,16);g.clearRect(16,16,24,4+6);g.clearRect(20,16,16,4);tex(0,16,16,16);g.clearRect(0,16+4+9,16,3);g.clearRect(8,16,4,4);}
  return c;
}
function procBat(){const c=mkCanvas(64,64),g=c.getContext('2d');g.fillStyle='#3a2a1e';g.fillRect(0,0,64,64);for(let i=0;i<300;i++){g.fillStyle=`rgba(0,0,0,${hash2(i,1,9)*.3})`;g.fillRect(hash2(i,2,9)*64|0,hash2(i,3,9)*64|0,1,1);}
  g.fillStyle='#211611';g.fillRect(42,0,22,17);g.fillRect(24,16,18,13);g.fillStyle='#e04040';g.fillRect(7,9,1,1);g.fillRect(10,9,1,1);return c;}
let SKIN_TEX={},ARMOR_TEX=[],BAT_TEX=null,CHEST_TEX=null;const SKIN_IMG={},SKIN_DATA={},CUSTOM_SKINS=[];
// fallback chest texture in the 1.8 entity/chest/normal.png layout
function procChest(){const c=mkCanvas(64,64),g=c.getContext('2d');const wood=(x,y,w,h,dark)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=hash2(x+i,y+j,71),grain=((y+j)%4===0)?-.12:0;const k=(dark?.55:1)*(0.85+v*.2+grain);
      g.fillStyle=`rgb(${160*k|0},${110*k|0},${52*k|0})`;g.fillRect(x+i,y+j,1,1);}g.strokeStyle='rgba(40,28,14,.95)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);};
  const boxT=(u,v,w,h,d,inner)=>{wood(u+d,v,w,d);if(inner){g.fillStyle='#000';g.fillRect(u+d+2,v+2,w-4,d-4);}wood(u+d+w,v,w,d,!inner);for(let k=0;k<4;k++)wood(u+[0,d,d+w,2*d+w][k],v+d,k%2?w:d,h);};
  boxT(0,0,14,5,14,false);boxT(0,19,14,10,14,true);g.fillStyle='#9a9a9a';g.fillRect(0,0,6,6);g.fillStyle='#d8d8d8';g.fillRect(1,1,2,4);g.fillStyle='#5a5a5a';g.fillRect(1,4,2,1);return c;}
const GEN_SKINS=32;
function skinTex(key){
  if(SKIN_TEX[key])return SKIN_TEX[key];
  let src=null,slim=false;
  if(key.startsWith('img:')){const c=SKIN_IMG[key];if(c){src=c.img;slim=c.slim;}else{if(typeof requestSkin==='function')requestSkin(key);const q='?'+key;if(!SKIN_TEX[q]){const im=procSkin(hashStr(key)%1000003+1);SKIN_TEX[q]={tex:mkTex(im),slim:false,img:im};}return SKIN_TEX[q];}}
  if(key.startsWith('pack:')){const s=PACK.skins.find(s=>s.name===key.slice(5));if(s){src=s.img;slim=s.slim;}}
  if(!src){src=procSkin(hashStr(key)%1000003+1);}
  return SKIN_TEX[key]={tex:mkTex(src),slim,img:src};
}
function initEntityTextures(){
  for(const k in SKIN_TEX)gl.deleteTexture(SKIN_TEX[k].tex);SKIN_TEX={};
  ARMOR_TEX=ARMOR_TIERS.map(([t,,col,mat],ti)=>{const p=PACK.armor[mat]||{};return {l1:mkTex(p.l1||procArmor(ti,1)),l2:mkTex(p.l2||procArmor(ti,2)),tint:mat==='leather'&&p.l1?hexRGB('#a06540'):null};});
  initSkyTextures();if(typeof initParticleTex==='function'&&PART_TEX)initParticleTex();BAT_TEX=mkTex(PACK.bat||procBat());CHEST_TEX=mkTex(PACK.chestTex||procChest());
}
function availableSkins(){return CUSTOM_SKINS.concat(PACK.skins.length?PACK.skins.map(s=>'pack:'+s.name):[]);}

// -------- loading --------
// 1.8-era file names for the same tiles (blocks/ folder)
const TILE_ALT={vine:'vine',lily_pad:'waterlily',grass_block_top:'grass_top',grass_block_side:'grass_side',oak_log:'log_oak',oak_log_top:'log_oak_top',oak_leaves:'leaves_oak',oak_planks:'planks_oak',bricks:'brick',red_wool:'wool_colored_red',
  mossy_cobblestone:'cobblestone_mossy',sandstone:'sandstone_normal',stone_bricks:'stonebrick',mossy_stone_bricks:'stonebrick_mossy',chiseled_stone_bricks:'stonebrick_carved',short_grass:'tallgrass',poppy:'flower_rose',dandelion:'flower_dandelion',slime_block:'slime',cobweb:'web',smooth_stone:'stone_slab_top',smooth_stone_slab_side:'stone_slab_side',
  spruce_log:'log_spruce',spruce_log_top:'log_spruce_top',spruce_planks:'planks_spruce',torch:'torch_on',quartz_block_side:'quartz_block_side',quartz_block_top:'quartz_block_top',jungle_leaves:'leaves_jungle',
  cracked_stone_bricks:'stonebrick_cracked',chiseled_sandstone:'sandstone_carved',cut_sandstone:'sandstone_smooth',jungle_log:'log_jungle',white_wool:'wool_colored_white',bone_block_side:'quartz_block_side',bone_block_top:'quartz_block_top'};
const ITEM_ALT={bow:['bow_standby'],cooked_beef:['beef_cooked'],cooked_porkchop:['porkchop_cooked'],cooked_chicken:['chicken_cooked'],baked_potato:['potato_baked'],melon_slice:['melon'],golden_apple:['apple_golden']};
function itemCandidates(k,it){const base=it.tex.replace(/^item\//,'');const out=['textures/item/'+base+'.png','textures/items/'+base+'.png'];
  const alt=(ITEM_ALT[k]||[]).concat([base.replace(/^wooden_/,'wood_').replace(/^golden_/,'gold_')]);if(it.type==='potion')alt.push('potion_bottle_drinkable');if(it.type==='splash')alt.push('potion_bottle_splash');
  for(const a of alt)out.push('textures/items/'+a+'.png','textures/item/'+a+'.png');return out;}
function isGray(img){const c=mkCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,Math.min(16,img.width),Math.min(16,img.height)).data;let sat=0,n=0;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<20)continue;sat+=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);n++;}return n&&sat/n<12;}
async function blobImage(bytes){const bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));return bmp;}
function imgToCanvas(img,w,h,sx=0,sy=0,sw,sh){const c=mkCanvas(w,h),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,sx,sy,sw||img.width,sh||img.width*(h/w),0,0,w,h);return c;}
function tintCanvas(c,hex){const g=c.getContext('2d');const d=g.getImageData(0,0,c.width,c.height);const t=hexRGB(hex);for(let i=0;i<d.data.length;i+=4){d.data[i]*=t[0];d.data[i+1]*=t[1];d.data[i+2]*=t[2];}g.putImageData(d,0,0);return c;}
async function loadPackBuffer(buf,label){
  const zip=await readZip(buf);
  // map "assets/minecraft/<rest>" -> zip path, preferring the shallowest copy (base pack over edition sub-folders)
  const map=new Map();for(const name of zip.files.keys()){const m=/(^|\/)minecraft\/(textures\/|sounds\/|models\/|blockstates\/|lang\/|optifine\/|sounds\.json$)/.exec(name);if(!m)continue;const i=m.index+(m[1]?1:0);const rest=name.slice(i+10);if(!map.has(rest)||map.get(rest).length>name.length)map.set(rest,name);}
  const get=async rest=>{const p=map.get(rest);if(!p)return null;const bytes=await zip.get(p);if(!bytes)return null;try{return await blobImage(bytes);}catch(e){return null;}};
  let found=0;
  // block textures (newer "block/", older "blocks/")
  const tiles={};
  for(let t=0;t<TILE_PACK.length;t++){const n=TILE_PACK[t];if(n[0]==='~')continue;const img=await get('textures/block/'+n+'.png')||await get('textures/blocks/'+n+'.png')||(TILE_ALT[n]?await get('textures/blocks/'+TILE_ALT[n]+'.png'):null);if(img){tiles[t]=img;found++;}}
  const chest=await get('textures/entity/chest/normal.png');if(chest)PACK.chestTex=imgToCanvas(chest,64,64,0,0,chest.width,chest.height);
  const grassOv=await get('textures/block/grass_block_side_overlay.png')||await get('textures/blocks/grass_side_overlay.png');
  if(Object.keys(tiles).length||chest){
    let maxRes=TILE;for(const t in tiles)maxRes=Math.max(maxRes,Math.min(64,tiles[t].width));
    const nc=mkCanvas(ACOLS*maxRes,ACOLS*maxRes),g=nc.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(atlasCanvas,0,0,nc.width,nc.height);
    for(const t in tiles){const img=tiles[t];const tx=(t%ACOLS)*maxRes,ty=Math.floor(t/ACOLS)*maxRes;g.clearRect(tx,ty,maxRes,maxRes);
      const cell=imgToCanvas(img,maxRes,maxRes,0,0,img.width,img.width);const n=TILE_PACK[t];
      const gray=isGray(img);if(gray&&(n==='grass_block_top'||n==='short_grass'))tintCanvas(cell,'#79c05a');if(gray&&n==='oak_leaves')tintCanvas(cell,'#59ae30');if(gray&&n==='jungle_leaves')tintCanvas(cell,'#30bb0b');if(gray&&n==='vine')tintCanvas(cell,'#48b518');if(gray&&n==='lily_pad')tintCanvas(cell,'#208030');if(gray&&n==='water_still')tintCanvas(cell,'#3f76e4');
      if(n==='grass_block_side'&&grassOv&&isGray(grassOv)){const ov=tintCanvas(imgToCanvas(grassOv,maxRes,maxRes),'#79c05a');cell.getContext('2d').drawImage(ov,0,0);}
      if(n==='water_still'){const cg=cell.getContext('2d');const d=cg.getImageData(0,0,maxRes,maxRes);for(let i=3;i<d.data.length;i+=4)d.data[i]=Math.min(d.data[i],180);cg.putImageData(d,0,0);}
      g.drawImage(cell,tx,ty);}
    if(chest){const s=chest.width/64,S=maxRes;const part=(t,regs)=>{const tx=(t%ACOLS)*S,ty=Math.floor(t/ACOLS)*S;g.clearRect(tx,ty,S,S);let y=0;const tot=regs.reduce((a,r)=>a+r[3],0);
        for(const [x0,y0,w,h] of regs){const hh=Math.round(S*h/tot);g.save();g.translate(tx,ty+y+hh);g.scale(1,-1);g.drawImage(chest,x0*s,y0*s,w*s,h*s,0,0,S,hh);g.restore();y+=hh;}};
      part(9,[[0,14,14,5],[0,33,14,10]]);part(10,[[14,0,14,14]]);part(11,[[14,14,14,5],[14,33,14,10]]);
      const tx=(11%ACOLS)*S,ty=Math.floor(11/ACOLS)*S;g.drawImage(chest,1*s,1*s,2*s,4*s,tx+S*.43,ty+S*.18,S*.14,S*.28);found++;}
    atlasCanvas=nc;TILE=maxRes;
  }
  // items
  const icons=PACK.icons||{};
  for(const k in ITEMS){const it=ITEMS[k];if(!it.tex)continue;let img=null;for(const c of itemCandidates(k,it)){img=await get(c);if(img)break;}if(!img)continue;
    const c=imgToCanvas(img,32,32,0,0,img.width,img.width);found++;
    if(it.type==='potion'||it.type==='splash'){const ov=await get('textures/item/potion_overlay.png')||await get('textures/items/potion_overlay.png');if(ov){const o=tintCanvas(imgToCanvas(ov,32,32),it.color);const g2=mkCanvas(32,32).getContext('2d');g2.drawImage(o,0,0);g2.drawImage(c,0,0);icons[k]=g2.canvas;continue;}}
    if(it.mat==='leather'){tintCanvas(c,'#a06540');const ov=await get('textures/'+it.tex+'_overlay.png')||await get('textures/items/'+it.tex.replace(/^item\//,'')+'_overlay.png');if(ov)c.getContext('2d').drawImage(imgToCanvas(ov,32,32),0,0);}
    icons[k]=c;}
  PACK.icons=icons;
  // HUD sprites (1.20.2+ sprites, or legacy icons.png / widgets.png)
  const gs=async n=>await get('textures/gui/sprites/'+n+'.png');
  const G=PACK.gui;const spr={heart_container:'hud/heart/container',heart_full:'hud/heart/full',heart_half:'hud/heart/half',heart_abs_full:'hud/heart/absorbing_full',heart_abs_half:'hud/heart/absorbing_half',
    heart_poison_full:'hud/heart/poisoned_full',heart_poison_half:'hud/heart/poisoned_half',food_empty:'hud/food_empty',food_full:'hud/food_full',food_half:'hud/food_half',armor_empty:'hud/armor_empty',armor_full:'hud/armor_full',armor_half:'hud/armor_half',
    hotbar:'hud/hotbar',hotbar_sel:'hud/hotbar_selection',crosshair:'hud/crosshair'};
  for(const k in spr){const img=await gs(spr[k]);if(img){G[k]=img;found++;}}
  const icons2=await get('textures/gui/icons.png');if(icons2&&!G.heart_full){const s=icons2.width/256;const cut=(x,y,w,h)=>imgToCanvas(icons2,w,h,x*s,y*s,w*s,h*s);
    Object.assign(G,{heart_container:cut(16,0,9,9),heart_full:cut(52,0,9,9),heart_half:cut(61,0,9,9),heart_poison_full:cut(88,0,9,9),heart_poison_half:cut(97,0,9,9),heart_abs_full:cut(160,0,9,9),heart_abs_half:cut(169,0,9,9),
      armor_empty:cut(16,9,9,9),armor_half:cut(25,9,9,9),armor_full:cut(34,9,9,9),food_empty:cut(16,27,9,9),food_half:cut(61,27,9,9),food_full:cut(52,27,9,9),crosshair:cut(0,0,15,15)});found++;}
  const btnM=await get('textures/gui/sprites/widget/button.png'),btnH=await get('textures/gui/sprites/widget/button_highlighted.png');if(btnM)G.btn=imgToCanvas(btnM,200,20,0,0,btnM.width,btnM.height);if(btnH)G.btn_hover=imgToCanvas(btnH,200,20,0,0,btnH.width,btnH.height);
  const widgets=await get('textures/gui/widgets.png');if(widgets&&!G.btn){const s=widgets.width/256;G.btn=imgToCanvas(widgets,200,20,0,66*s,200*s,20*s);G.btn_hover=imgToCanvas(widgets,200,20,0,86*s,200*s,20*s);G.btn_off=imgToCanvas(widgets,200,20,0,46*s,200*s,20*s);}
  {const bd=await get('textures/gui/sprites/widget/button_disabled.png');if(bd)G.btn_off=imgToCanvas(bd,200,20,0,0,bd.width,bd.height);}if(widgets&&!G.hotbar){const s=widgets.width/256;G.hotbar=imgToCanvas(widgets,182,22,0,0,182*s,22*s);G.hotbar_sel=imgToCanvas(widgets,24,24,0,22*s,24*s,24*s);found++;}
  // skins (1.21 ships nine default skins)
  for(const variant of ['wide','slim'])for(const n of ['steve','alex','ari','efe','kai','makena','noor','sunny','zuri']){const img=await get(`textures/entity/player/${variant}/${n}.png`);
    if(img&&!PACK.skins.some(s=>s.name===n)){PACK.skins.push({name:n,slim:variant==='slim',img:imgToCanvas(img,64,64,0,0,img.width,img.height)});found++;}}
  for(const n of ['steve','alex']){const img=await get(`textures/entity/${n}.png`);if(img&&!PACK.skins.some(s=>s.name===n)){const c=mkCanvas(64,64);const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    if(img.height*2===img.width){g.drawImage(img,0,0,64,32);g.save();g.translate(64,0);g.scale(-1,1);g.drawImage(c,0,16,16,16,64-16-16,48,16,16);g.drawImage(c,40,16,16,16,64-32-16,48,16,16);g.restore();}else g.drawImage(img,0,0,64,64);
    PACK.skins.push({name:n,slim:n==='alex',img:c});found++;}}
  // armor (1.21.2+ equipment layers, or classic models/armor)
  for(const [,,,mat] of ARMOR_TIERS){const l1=await get(`textures/entity/equipment/humanoid/${mat}.png`)||await get(`textures/models/armor/${mat}_layer_1.png`);
    const l2=await get(`textures/entity/equipment/humanoid_leggings/${mat}.png`)||await get(`textures/models/armor/${mat}_layer_2.png`);
    if(l1||l2){PACK.armor[mat]={l1:l1?imgToCanvas(l1,64,32,0,0,l1.width,l1.height):null,l2:l2?imgToCanvas(l2,64,32,0,0,l2.width,l2.height):null};found++;}}
  for(const [k,pth] of [['sun','textures/environment/sun.png'],['moon','textures/environment/moon_phases.png'],['shadow','textures/misc/shadow.png'],['particles','textures/particle/particles.png']]){const im=await get(pth);if(im){PACK[k]=imgToCanvas(im,im.width,im.height,0,0,im.width,im.height);found++;}}
  const bat=await get('textures/entity/bat.png');if(bat){PACK.bat=imgToCanvas(bat,64,64,0,0,bat.width,bat.height);found++;}
  const clouds=await get('textures/environment/clouds.png');if(clouds){PACK.clouds=imgToCanvas(clouds,256,256,0,0,clouds.width,clouds.height);found++;}
  const cracks=[];for(let i=0;i<10;i++){const im=await get(`textures/block/destroy_stage_${i}.png`)||await get(`textures/blocks/destroy_stage_${i}.png`);if(im)cracks.push(imgToCanvas(im,16,16,0,0,im.width,im.width));}
  if(cracks.length===10){PACK.cracks=cracks;found++;}
  const font=await get('textures/font/ascii.png');if(font){PACK.font=imgToCanvas(font,128,128,0,0,font.width,font.height);found++;}
  // title panorama
  const pano=[];for(let i=0;i<6;i++){const img=await get(`textures/gui/title/background/panorama_${i}.png`);if(img)pano.push(img);}
  if(pano.length===6){PACK.panorama=pano;found++;}
  PACK.sounds=PACK.sounds||{};let ns=0;for(const [rest,full] of map){if(!rest.startsWith('sounds/')||!rest.endsWith('.ogg'))continue;try{const b=await zip.get(full);if(b){PACK.sounds[rest.slice(7,-4)]=b;ns++;}}catch(e){}}
  // sounds.json: event name -> sound files (with per-sound volume/pitch/weight), later packs override earlier ones
  const sj=map.get('sounds.json');if(sj){try{const txt=new TextDecoder().decode(await zip.get(sj));const j=JSON.parse(txt);PACK.events=PACK.events||{};
    for(const ev in j){const list=(j[ev].sounds||[]).map(x=>typeof x==='string'?{name:x}:x).filter(x=>x&&x.type!=='event'&&x.name).map(x=>({name:x.name.replace(/^minecraft:/,''),volume:x.volume==null?1:x.volume,pitch:x.pitch==null?1:x.pitch,weight:x.weight||1}));
      if(list.length)PACK.events[ev]=list;}found++;}catch(e){}}
  if(ns){PACK.sgroups={};for(const k in PACK.sounds){const g=k.replace(/\d+$/,'');(PACK.sgroups[g]=PACK.sgroups[g]||[]).push(k);}for(const k in PACK.sounds)(PACK.sgroups[k]=PACK.sgroups[k]||[]).includes(k)||PACK.sgroups[k].push(k);found+=ns;}
  const click=map.get('sounds/random/click_stereo.ogg')||map.get('sounds/random/click.ogg');if(click){try{const b=await zip.get(click);PACK.click=b;found++;}catch(e){}}
  PACK.names.push(label);return found;
}
function applyPack(){
  reuploadAtlas();if(PACK.clouds&&cloudTex){gl.deleteTexture(cloudTex);cloudTex=null;}if(PACK.cracks)initCracks();if(PACK.font)initFont();if(typeof refreshLCE==='function')setTimeout(refreshLCE,0);rebuildIcons();rebuildItemAtlas();initEntityTextures();initPanorama();if(PACK.click&&actx)decodeClick();
  if(mapInfo){buildMesh();}refreshSkinPicker&&refreshSkinPicker();
}
// persistence in this browser only (IndexedDB)
function idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('blockbattle-packs',1);r.onupgradeneeded=()=>r.result.createObjectStore('packs');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function savePack(name,buf){try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction('packs','readwrite');t.objectStore('packs').put(buf,Date.now()+'|'+name);t.oncomplete=res;t.onerror=()=>rej(t.error);});}catch(e){}}
async function loadSavedPacks(){try{const db=await idb();const all=await new Promise((res,rej)=>{const out=[];const t=db.transaction('packs','readonly');const c=t.objectStore('packs').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out.push([cur.key,cur.value]);cur.continue();}else res(out);};c.onerror=()=>rej(c.error);});
  all.sort((a,b)=>a[0]<b[0]?-1:1);for(const [k,buf] of all)await loadPackBuffer(buf,k.split('|').slice(1).join('|'));return all.length;}catch(e){return 0;}}
async function clearPacks(){try{const db=await idb();await new Promise(res=>{const t=db.transaction('packs','readwrite');t.objectStore('packs').clear();t.oncomplete=res;});}catch(e){}location.reload();}
