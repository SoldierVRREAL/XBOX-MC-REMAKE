// ================= items (values follow the 1.8-era combat the console Battle used) =================
const ITEMS={};
function item(id,o){ITEMS[id]=Object.assign({stack:1},o);}
const TOOL_TIERS=[['wood','Wooden','wooden','#9a7440',0],['golden','Golden','golden','#f2d33a',0],['stone','Stone','stone','#8d8d8d',1],['iron','Iron','iron','#e8e8e8',2],['diamond','Diamond','diamond','#4ee6d8',3]];
TOOL_TIERS.forEach(([k,N,p,c,lv])=>{
  item(k+'_sword',{name:N+' Sword',type:'weapon',tool:'sword',dmg:5+lv,color:c,tex:'item/'+p+'_sword'});
  item(k+'_axe',{name:N+' Axe',type:'weapon',tool:'axe',dmg:4+lv,color:c,tex:'item/'+p+'_axe'});
  item(k+'_pickaxe',{name:N+' Pickaxe',type:'weapon',tool:'pickaxe',dmg:3+lv,color:c,tex:'item/'+p+'_pickaxe'});
});
item('bow',{name:'Bow',type:'bow',color:'#7a5530',tex:'item/bow'});
item('arrow',{name:'Arrow',type:'ammo',stack:64,color:'#cfcfcf',tex:'item/arrow'});
const FOODS=[['apple','Apple',4,2.4,'#d8261c'],['bread','Bread',5,6,'#c99a4a'],['cooked_beef','Steak',8,12.8,'#8a4a2a'],['cooked_porkchop','Cooked Porkchop',8,12.8,'#c98a6a'],
  ['cooked_chicken','Cooked Chicken',6,7.2,'#c8904a'],['carrot','Carrot',3,3.6,'#f08a1a'],['baked_potato','Baked Potato',5,6,'#c8a050'],['cookie','Cookie',2,.4,'#b0702a'],
  ['melon_slice','Melon',2,1.2,'#e04a3a'],['pumpkin_pie','Pumpkin Pie',8,4.8,'#d88a2a'],['golden_apple','Golden Apple',4,9.6,'#f5c518']];
FOODS.forEach(([id,n,f,s,c])=>item(id,{name:n,type:'food',food:f,sat:s,stack:64,color:c,tex:'item/'+id}));
ITEMS.golden_apple.fx=[['regen',5,1],['absorption',120,0]];ITEMS.golden_apple.always=true;
const ARMOR_TIERS=[['leather','Leather','#8b5a2b','leather'],['golden','Golden','#f2d33a','gold'],['chainmail','Chain','#7d7d86','chainmail'],['iron','Iron','#d8d8d8','iron'],['diamond','Diamond','#46dccf','diamond']];
const ARMOR_SLOTS=[['helmet','Helmet','Cap'],['chestplate','Chestplate','Tunic'],['leggings','Leggings','Pants'],['boots','Boots','Boots']];
const ARMOR_PTS=[[1,3,2,1],[2,5,3,1],[2,5,4,1],[2,6,5,2],[3,8,6,3]];
ARMOR_TIERS.forEach(([t,N,c,mat],ti)=>ARMOR_SLOTS.forEach(([s,SN,LN],si)=>item(t+'_'+s,{name:(t==='leather'?'Leather '+LN:N+' '+SN),type:'armor',slot:si,pts:ARMOR_PTS[ti][si],color:c,tier:ti,mat,tex:'item/'+(t==='golden'?'golden':t)+'_'+s})));
// potions (drinkable) and splash potions
const POTIONS=[['healing','Healing','#f82423',[['heal',0,0]]],['regeneration','Regeneration','#cd5cab',[['regen',45,0]]],['swiftness','Swiftness','#7cafc6',[['speed',180,0]]],
  ['strength','Strength','#932423',[['strength',180,0]]],['fire_resistance','Fire Resistance','#e49a3a',[['fireres',180,0]]],['invisibility','Invisibility','#7f8392',[['invis',180,0]]]];
POTIONS.forEach(([k,N,c,fx])=>item('potion_'+k,{name:'Potion of '+N,type:'potion',color:c,fx,tex:'item/potion'}));
const SPLASH=[['healing','Healing','#f82423',[['heal',0,0]]],['harming','Harming','#430a09',[['harm',0,0]]],['poison','Poison','#4e9331',[['poison',33,0]]],
  ['slowness','Slowness','#5a6c81',[['slowness',67,0]]],['weakness','Weakness','#484d48',[['weakness',67,0]]]];
SPLASH.forEach(([k,N,c,fx])=>item('splash_'+k,{name:'Splash Potion of '+N,type:'splash',color:c,fx,tex:'item/splash_potion'}));
const EFFECT_NAMES={regen:'Regeneration',speed:'Speed',strength:'Strength',fireres:'Fire Resistance',invis:'Invisibility',absorption:'Absorption',poison:'Poison',slowness:'Slowness',weakness:'Weakness'};
const EFFECT_COL={regen:'#cd5cab',speed:'#7cafc6',strength:'#932423',fireres:'#e49a3a',invis:'#7f8392',absorption:'#2552a5',poison:'#4e9331',slowness:'#5a6c81',weakness:'#484d48'};
for(const id in BLOCK_NAMES)item('b'+id,{name:BLOCK_NAMES[id],type:'block',block:+id,stack:64,color:BLOCK_COL[id]});
const MINE_T={1:.6,2:.5,3:2.2,4:1.4,5:.25,6:1.4,7:.5,9:2.6,10:2.6,11:.4,12:.9,13:.6,14:2.6,17:.6,18:2,19:1.2,20:2.4,21:2.4,22:2.4};
const MINE_DROP={1:'b2',2:'b2',3:'b9',4:'b4',5:null,6:'b6',7:'b7',9:'b9',10:'b10',11:null,12:'b12',13:'b13',14:'b14',17:'b17',18:'b18',19:'b19',20:'b20',21:'b21',22:'b22'};

// ---------- procedural 32x32 icons (replaced by pack textures when one is loaded) ----------
function shadeHex(hex,k){const n=parseInt(hex.slice(1),16);const r=clamp(((n>>16)&255)*k,0,255)|0,g=clamp(((n>>8)&255)*k,0,255)|0,b=clamp((n&255)*k,0,255)|0;return `rgb(${r},${g},${b})`;}
function procIcon(id){
  const c=mkCanvas(32,32);const g=c.getContext('2d');const it=ITEMS[id];
  const line=(x1,y1,x2,y2,w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.lineCap='square';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  if(it.type==='block'){const D=BD[it.block];const t1=D.top,t2=D.side;g.imageSmoothingEnabled=false;
    R(4,6,24,22,'#000');g.drawImage(atlasCanvas,(t2%ACOLS)*TILE,Math.floor(t2/ACOLS)*TILE,TILE,TILE,5,9,22,18);
    g.drawImage(atlasCanvas,(t1%ACOLS)*TILE,Math.floor(t1/ACOLS)*TILE,TILE,TILE/4,5,6,22,4);R(16,9,11,18,'rgba(0,0,0,.25)');}
  else if(it.tool==='sword'){line(26,5,12,19,6,shadeHex(it.color,.6));line(26,5,12,19,3,it.color);line(25,6,15,16,1,shadeHex(it.color,1.3));line(7,15,16,24,4,'#3b2a14');line(11,20,6,25,4,'#6b4a22');R(3,26,4,4,'#3b2a14');}
  else if(it.tool==='axe'){line(8,26,22,8,3,'#6b4a22');g.fillStyle=shadeHex(it.color,.6);g.beginPath();g.moveTo(17,5);g.lineTo(27,9);g.lineTo(25,17);g.lineTo(19,13);g.fill();g.fillStyle=it.color;g.beginPath();g.moveTo(18,7);g.lineTo(25,10);g.lineTo(24,15);g.lineTo(20,12);g.fill();}
  else if(it.tool==='pickaxe'){line(8,26,22,10,3,'#6b4a22');g.strokeStyle=shadeHex(it.color,.6);g.lineWidth=5;g.beginPath();g.arc(16,18,13,-2.2,-.3);g.stroke();g.strokeStyle=it.color;g.lineWidth=2.5;g.beginPath();g.arc(16,18,13,-2.15,-.35);g.stroke();}
  else if(id==='bow'){g.strokeStyle='#6b4520';g.lineWidth=4;g.beginPath();g.arc(4,28,24,-Math.PI/2+.12,-.12);g.stroke();const a1=-Math.PI/2+.12,a2=-.12;line(4+24*Math.cos(a1),28+24*Math.sin(a1),4+24*Math.cos(a2),28+24*Math.sin(a2),1,'#eee');}
  else if(id==='arrow'){line(7,25,24,8,2,'#8a6a3a');g.fillStyle='#bbb';g.beginPath();g.moveTo(28,4);g.lineTo(20,8);g.lineTo(24,12);g.fill();line(4,24,8,28,3,'#f2f2f2');line(6,22,10,26,3,'#f2f2f2');}
  else if(it.type==='food'){
    if(id==='apple'||id==='golden_apple'){g.fillStyle=shadeHex(it.color,.7);g.beginPath();g.arc(16,19,10,0,7);g.fill();g.fillStyle=it.color;g.beginPath();g.arc(15,18,8.5,0,7);g.fill();R(11,13,3,3,'rgba(255,255,255,.7)');line(16,10,18,5,2,'#5a3a1a');R(19,5,5,3,'#3c9a2c');}
    else if(id==='carrot'){g.fillStyle=it.color;g.beginPath();g.moveTo(6,27);g.lineTo(22,9);g.lineTo(26,13);g.fill();R(22,4,3,7,'#3c9a2c');R(25,6,4,3,'#3c9a2c');}
    else if(id==='cookie'){g.fillStyle=it.color;g.beginPath();g.arc(16,16,11,0,7);g.fill();for(const [x,y] of [[11,12],[19,14],[14,20],[20,21]])R(x,y,3,3,'#4a2a10');}
    else if(id==='melon_slice'){g.fillStyle='#3c9a2c';g.beginPath();g.moveTo(4,10);g.lineTo(28,10);g.lineTo(16,28);g.fill();g.fillStyle=it.color;g.beginPath();g.moveTo(7,12);g.lineTo(25,12);g.lineTo(16,25);g.fill();R(12,15,2,2,'#111');R(18,15,2,2,'#111');}
    else{g.fillStyle=shadeHex(it.color,.65);g.beginPath();g.ellipse(16,18,13,8,-.3,0,7);g.fill();g.fillStyle=it.color;g.beginPath();g.ellipse(15,16,12,6.5,-.3,0,7);g.fill();line(10,15,12,19,1.5,shadeHex(it.color,.65));line(16,13,18,17,1.5,shadeHex(it.color,.65));}
  }
  else if(it.type==='potion'||it.type==='splash'){
    g.fillStyle='rgba(220,240,255,.9)';g.fillRect(13,4,6,7);g.fillStyle='#8a6a3a';g.fillRect(13,2,6,3);
    g.fillStyle='rgba(220,240,255,.9)';g.beginPath();g.arc(16,20,9,0,7);g.fill();g.fillStyle=it.color;g.beginPath();g.arc(16,21,7.5,0,7);g.fill();R(12,16,3,3,'rgba(255,255,255,.6)');
    if(it.type==='splash'){line(19,6,25,3,2,'#ddd');}
  }
  else if(it.type==='armor'){const c1=it.color,c2=shadeHex(it.color,.6);
    if(it.slot===0){R(6,8,20,8,c2);R(8,9,16,6,c1);R(6,16,5,8,c2);R(21,16,5,8,c2);R(7,16,3,6,c1);R(22,16,3,6,c1);}
    else if(it.slot===1){R(4,6,24,22,c2);g.clearRect(12,6,8,5);R(5,7,6,6,c1);R(21,7,6,6,c1);R(9,11,14,16,c1);}
    else if(it.slot===2){R(7,5,18,7,c2);R(7,12,7,16,c2);R(18,12,7,16,c2);R(8,6,16,5,c1);R(8,12,5,15,c1);R(19,12,5,15,c1);}
    else{R(4,14,8,12,c2);R(4,22,11,6,c2);R(19,14,8,12,c2);R(19,22,11,6,c2);R(5,15,6,10,c1);R(20,15,6,10,c1);}}
  return c;
}
const ICONS={};
function rebuildIcons(){for(const k in ITEMS)ICONS[k]=(PACK.icons&&PACK.icons[k])||procIcon(k);}

// ---------- loot ----------
const LOOT_EDGE=[['wood_sword',7],['stone_sword',5],['iron_sword',1.4],['golden_sword',2],['wood_axe',5],['stone_axe',4],['iron_axe',1.5],['stone_pickaxe',3],['iron_pickaxe',1.2],
 ['bow',3],['arrow',6,3,8],['apple',6,1,3],['bread',5,1,3],['cooked_beef',3,1,2],['cooked_porkchop',3,1,2],['cooked_chicken',3,1,2],['carrot',4,1,4],['baked_potato',4,1,3],['cookie',3,2,6],['melon_slice',4,2,5],['pumpkin_pie',2,1,1],['golden_apple',.5],
 ['leather_helmet',4],['leather_chestplate',3],['leather_leggings',3],['leather_boots',4],['golden_helmet',2],['golden_chestplate',1.5],['golden_leggings',1.5],['golden_boots',2],
 ['chainmail_helmet',1.6],['chainmail_chestplate',1.2],['chainmail_leggings',1.3],['chainmail_boots',1.6],['iron_helmet',.8],['iron_chestplate',.4],['iron_leggings',.5],['iron_boots',.8],
 ['potion_healing',1.5],['potion_regeneration',1],['potion_swiftness',1.2],['potion_fire_resistance',.8],['splash_poison',1],['splash_slowness',1],['splash_weakness',.8],['splash_harming',.6],['splash_healing',.8]];
const LOOT_CENTER=[['stone_sword',5],['iron_sword',5],['diamond_sword',1.5],['iron_axe',4],['diamond_axe',1.5],['bow',5],['arrow',8,6,16],['golden_apple',2.5],['cooked_beef',5,2,4],['bread',4,2,4],
 ['chainmail_chestplate',3],['chainmail_leggings',3],['iron_helmet',3],['iron_chestplate',2],['iron_leggings',2],['iron_boots',3],['diamond_helmet',.8],['diamond_chestplate',.5],['diamond_leggings',.6],['diamond_boots',.8],
 ['potion_healing',2],['potion_strength',1.5],['potion_regeneration',1.5],['potion_invisibility',.8],['splash_harming',1.5],['splash_poison',1.2]];
const CHEST_SLOTS=27;
function rollLoot(center){
  const T=center?LOOT_CENTER:LOOT_EDGE,tot=T.reduce((s,e)=>s+e[1],0);const items=new Array(CHEST_SLOTS).fill(null);
  const n=(center?4:3)+(Math.random()*3|0);
  for(let i=0;i<n;i++){let r=Math.random()*tot,e=T[0];for(const t of T){r-=t[1];if(r<=0){e=t;break;}}
    const cnt=e[2]?e[2]+(Math.random()*(e[3]-e[2]+1)|0):1;let s;do{s=Math.random()*CHEST_SLOTS|0;}while(items[s]);items[s]={id:e[0],count:cnt};}
  return items;
}
function rollEaster(){ // MCBR easter.json
  const items=new Array(CHEST_SLOTS).fill(null);const put=it=>{let s;do{s=Math.random()*CHEST_SLOTS|0;}while(items[s]);items[s]=it;};
  const r=Math.random()*6;put({id:r<3?'iron_sword':r<5?'golden_sword':'diamond_sword',count:1});
  put({id:'arrow',count:4+(Math.random()*13|0)});if(Math.random()<.4)put({id:'bow',count:1});return items;
}
