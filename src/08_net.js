// ================= networking: Photon Realtime (online) or BroadcastChannel (same-browser tabs) =================
const N={STATE:1,HIT:2,DEATH:3,CHESTREQ:4,CHEST:5,GIVE:6,DROPADD:7,DROPDEL:8,DROPREQ:9,PROJ:10,BOTS:11,PHASE:12,START:13,ANN:14,BLOCK:15,SQUEAK:16,LOBBY:17,READY:18,END:19,DEALT:20,PICK:21,CHAT:22,TOLOBBY:23,HELLO:24,BR:25,CHESTS:26,LEAVE:27,SKIN:28};
let net=null;
function isHost(){return !net||net.isHost();}
function netSend(code,data,to){
  if(!net||!net.inRoom())return;
  try{if(to==='host'){if(net.isHost())return;net.send(code,data,[net.hostId()]);}else if(typeof to==='number')net.send(code,data,[to]);else net.send(code,data);}catch(e){console.warn('send failed',e);}
}
class LocalNet{
  constructor(room,name){
    this.kind='local';this.ch=new BroadcastChannel('blockbattle:'+room);this.myId=1+Math.floor(Math.random()*1e8);this.name=name;this.members=new Map();
    this.members.set(this.myId,{id:this.myId,name,seen:Date.now(),joined:Date.now()});this.ch.onmessage=e=>this.recv(e.data);
    this.hb=setInterval(()=>this.beat(),400);this.beat();this.ready=false;setTimeout(()=>{this.ready=true;this._h=this.hostId();this.onReady&&this.onReady();},1300);
  }
  beat(){const me=this.members.get(this.myId);this.ch.postMessage({t:'hb',from:this.myId,name:this.name,joined:me.joined});const now=Date.now();
    for(const [id,m] of [...this.members]){if(id!==this.myId&&now-m.seen>2500){this.members.delete(id);this.onLeave&&this.onLeave(id);this.checkHost();}}}
  recv(m){
    if(m.t==='hb'){const had=this.members.has(m.from);const ex=this.members.get(m.from)||{id:m.from};ex.seen=Date.now();ex.name=m.name;ex.joined=m.joined;this.members.set(m.from,ex);if(!had){this.onJoin&&this.onJoin(m.from,m.name);this.checkHost();}return;}
    if(m.t==='bye'){if(this.members.delete(m.from)){this.onLeave&&this.onLeave(m.from);this.checkHost();}return;}
    if(m.t==='ev'){if(m.to&&!m.to.includes(this.myId))return;if(!this.members.has(m.from))return;this.onEvent&&this.onEvent(m.code,m.data,m.from);}
  }
  hostId(){let best=null;for(const m of this.members.values())if(!best||m.joined<best.joined||(m.joined===best.joined&&m.id<best.id))best=m;return best.id;}
  isHost(){return this.ready&&this.hostId()===this.myId;}
  checkHost(){if(!this.ready)return;const h=this.hostId();if(this._h!==h){this._h=h;this.onHostChange&&this.onHostChange(h);}}
  inRoom(){return this.ready;}
  send(code,data,to){this.ch.postMessage({t:'ev',from:this.myId,code,data,to:to||null});}
  list(){return [...this.members.values()].map(m=>({id:m.id,name:m.name}));}
  leave(){clearInterval(this.hb);try{this.ch.postMessage({t:'bye',from:this.myId});this.ch.close();}catch(e){}}
}
class PhotonNet{
  constructor(appId,region,room,name,onReady,onFail){
    this.kind='photon';const LBC=Photon.LoadBalancing.LoadBalancingClient;this.LBC=LBC;
    const c=this.c=new LBC(Photon.ConnectionProtocol.Wss,appId,'blockbattle-1.0');this.room=room;this.joining=false;this.myId=-1;
    c.onStateChange=s=>{this.stateName=LBC.StateToName?LBC.StateToName(s):String(s);setNetStatus('Photon: '+this.stateName);
      if((s===LBC.State.JoinedLobby||s===LBC.State.ConnectedToMaster)&&!this.joining){this.joining=true;c.joinRoom(room,{createIfNotExists:true},{maxPlayers:16});}};
    c.onJoinRoom=()=>{this.myId=c.myActor().actorNr;this._h=this.hostId();onReady&&onReady();};
    c.onActorJoin=a=>{if(a.actorNr!==this.myId)this.onJoin&&this.onJoin(a.actorNr,a.name);this.checkHost();};
    c.onActorLeave=a=>{this.onLeave&&this.onLeave(a.actorNr);this.checkHost();};
    c.onEvent=(code,content,actorNr)=>{this.onEvent&&this.onEvent(code,content,actorNr);};
    c.onError=(code,msg)=>{onFail&&onFail('Photon error '+code+': '+msg);};
    try{c.myActor().setName(name);}catch(e){}
    c.connectToRegionMaster(region||'us');
  }
  hostId(){try{return this.c.myRoom().masterClientId;}catch(e){return -1;}}
  isHost(){return this.inRoom()&&this.hostId()===this.myId;}
  checkHost(){const h=this.hostId();if(this._h!==h){this._h=h;this.onHostChange&&this.onHostChange(h);}}
  inRoom(){try{return this.c.isJoinedToRoom();}catch(e){return false;}}
  send(code,data,to){const o={};if(to)o.targetActors=to;this.c.raiseEvent(code,data,o);}
  list(){const a=this.c.myRoomActors();return Object.keys(a).map(k=>({id:a[k].actorNr,name:a[k].name||('Player '+a[k].actorNr)}));}
  leave(){try{this.c.disconnect();}catch(e){}}
}
function loadScript(u){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
async function loadPhotonSDK(custom){
  if(window.Photon&&window.Photon.LoadBalancing)return true;
  const urls=[custom,'photon.min.js','photon.js','Photon-Javascript_SDK.min.js','Photon-Javascript_SDK.js','lib/photon.min.js',
    'https://cdn.jsdelivr.net/npm/photon-realtime@4.3.2/photon.min.js','https://cdn.jsdelivr.net/npm/photon-realtime@4.3.2/photon.js','https://cdn.jsdelivr.net/npm/photon-realtime@4.3.2/dist/photon.min.js',
    'https://cdn.jsdelivr.net/npm/photon-javascript-sdk@0.0.3/lib/Photon-Javascript_SDK.min.js'].filter(Boolean);
  for(const u of urls){try{await loadScript(u);if(window.Photon&&window.Photon.LoadBalancing)return true;}catch(e){}}
  return false;
}
