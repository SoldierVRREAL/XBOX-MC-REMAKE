// ================= networking: Photon Realtime (online) or BroadcastChannel (same-browser tabs) =================
const N={STATE:1,HIT:2,DEATH:3,CHESTREQ:4,CHEST:5,GIVE:6,DROPADD:7,DROPDEL:8,DROPREQ:9,PROJ:10,BOTS:11,PHASE:12,START:13,ANN:14,BLOCK:15,SQUEAK:16,LOBBY:17,READY:18,END:19,DEALT:20,PICK:21,CHAT:22,TOLOBBY:23,HELLO:24,BR:25,CHESTS:26,LEAVE:27,SKIN:28};
let net=null;
function isHost(){return !net||net.isHost();}
function netSend(code,data,to){
  if(!net||!net.inRoom())return;
  try{if(to==='host'){if(net.isHost())return;net.send(code,data,[net.hostId()]);}else if(typeof to==='number')net.send(code,data,[to]);else net.send(code,data);}catch(e){console.warn('send failed',e);}
}
// ---- mesh rooms: every member hears every message; the earliest member is the host (same rules for both transports) ----
class MeshNet{
  constructor(room,name,transport,opt){
    this.kind=opt.kind;this.tr=transport;this.myId=1+Math.floor(Math.random()*1e8);this.name=String(name).slice(0,16);this.members=new Map();this.opt=opt;
    this.members.set(this.myId,{id:this.myId,name:this.name,seen:Date.now(),joined:Date.now()});this.ready=false;this.left=false;
    transport.onmessage=m=>{try{this.recv(m);}catch(e){}};
    transport.open(()=>{if(this.left)return;this.hb=setInterval(()=>this.beat(),opt.hb);this.beat();
      setTimeout(()=>{if(this.left)return;let mx=0;for(const m of this.members.values())if(m.id!==this.myId)mx=Math.max(mx,m.joined);
        const me=this.members.get(this.myId);if(mx&&me.joined<=mx)me.joined=mx+1;   // join after everyone already in the room, whatever our clock says
        this.ready=true;this._h=this.hostId();this.beat();this.onReady&&this.onReady();},opt.listen);},
      err=>{this.onFail&&this.onFail(err);});
  }
  post(o){if(!this.left)this.tr.post(o);}
  beat(){const me=this.members.get(this.myId);this.post({t:'hb',from:this.myId,name:this.name,joined:me.joined,r:this.ready?1:0});const now=Date.now();
    for(const [id,m] of [...this.members]){if(id!==this.myId&&now-m.seen>this.opt.timeout){this.members.delete(id);if(m.r)this.onLeave&&this.onLeave(id);this.checkHost();}}}
  recv(m){if(!m||m.from===this.myId||typeof m.from!=='number')return;
    if(m.t==='hb'){const had=this.members.has(m.from);const ex=this.members.get(m.from)||{id:m.from};ex.seen=Date.now();ex.name=String(m.name||'Player').slice(0,16);ex.joined=+m.joined||Date.now();const wasR=ex.r;ex.r=!!m.r;this.members.set(m.from,ex);
      if(ex.r&&!wasR&&this.ready)this.onJoin&&this.onJoin(m.from,ex.name);if(!had||ex.r!==wasR)this.checkHost();return;}
    if(m.t==='bye'){const ex=this.members.get(m.from);if(ex){this.members.delete(m.from);if(ex.r)this.onLeave&&this.onLeave(m.from);this.checkHost();}return;}
    if(m.t==='ev'){if(m.to&&!m.to.includes(this.myId))return;const ex=this.members.get(m.from);if(!ex)return;ex.seen=Date.now();this.onEvent&&this.onEvent(m.code,m.data,m.from);}}
  // only members that finished joining can be host, so a newcomer never steals the host role
  hostId(){let best=null;for(const m of this.members.values()){if(m.id!==this.myId&&!m.r)continue;if(!best||m.joined<best.joined||(m.joined===best.joined&&m.id<best.id))best=m;}return best?best.id:this.myId;}
  isHost(){return this.ready&&this.hostId()===this.myId;}
  checkHost(){if(!this.ready)return;const h=this.hostId();if(this._h!==h){this._h=h;this.onHostChange&&this.onHostChange(h);}}
  inRoom(){return this.ready;}
  send(code,data,to){this.post({t:'ev',from:this.myId,code,data:data===undefined?null:data,to:to||null});}
  list(){return [...this.members.values()].filter(m=>m.id===this.myId||m.r).map(m=>({id:m.id,name:m.name}));}
  leave(){this.left=true;clearInterval(this.hb);try{this.tr.post({t:'bye',from:this.myId});}catch(e){}setTimeout(()=>{try{this.tr.close();}catch(e){}},150);}
}
// same-browser tabs
function bcTransport(room){const t={ch:null,open(ok){this.ch=new BroadcastChannel('blockbattle:'+room);this.ch.onmessage=e=>this.onmessage&&this.onmessage(e.data);ok();},post(o){this.ch&&this.ch.postMessage(o);},close(){this.ch&&this.ch.close();}};return t;}
class LocalNet extends MeshNet{constructor(room,name){super(room,name,bcTransport(room),{kind:'local',hb:400,timeout:2500,listen:1300});}}
// internet: our own tiny MQTT 3.1.1-over-WebSocket client talking to free public brokers (no account, no SDK, no setup)
// a page URL like ?relay=wss://my-broker:8084/mqtt tries your own MQTT broker first
const RELAY_BROKERS=(new URLSearchParams(location.search).get('relay')||'').split(',').filter(u=>/^wss?:\/\//.test(u)).concat(['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt']);
function mqttTransport(room,brokers){
  const enc=new TextEncoder(),dec=new TextDecoder();
  const str=s=>{const b=enc.encode(s);return [b.length>>8,b.length&255,...b];};
  const len=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d);}while(n>0);return o;};
  const pkt=(h,body)=>new Uint8Array([h,...len(body.length),...body]);
  const topic='xmbbe/v2/'+String(room).toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40);
  const t={ws:null,buf:new Uint8Array(0),url:null,
    open(ok,fail){let i=0;const tryNext=()=>{if(i>=brokers.length){fail('Could not reach any free relay server. This network may block it (school/work Wi-Fi often does).');return;}
        const url=brokers[i++];let done=false;let ws;try{ws=new WebSocket(url,['mqtt']);}catch(e){tryNext();return;}ws.binaryType='arraybuffer';
        const to=setTimeout(()=>{if(!done){done=true;try{ws.close();}catch(e){}tryNext();}},6000);
        ws.onopen=()=>{const cid='xmbbe'+Math.random().toString(36).slice(2,12);
          ws.send(pkt(0x10,[...str('MQTT'),4,0x02,0,60,...str(cid)]));};
        ws.onmessage=e=>{const d=new Uint8Array(e.data);const nb=new Uint8Array(t.buf.length+d.length);nb.set(t.buf);nb.set(d,t.buf.length);t.buf=nb;
          for(;;){if(t.buf.length<2)break;let mult=1,rl=0,p=1,b;do{if(p>=t.buf.length)return;b=t.buf[p++];rl+=(b&127)*mult;mult*=128;}while(b&128);if(t.buf.length<p+rl)break;
            const type=t.buf[0]>>4,flags=t.buf[0]&15,body=t.buf.slice(p,p+rl);t.buf=t.buf.slice(p+rl);
            if(type===2){if(body[1]!==0){if(!done){done=true;clearTimeout(to);try{ws.close();}catch(e){}tryNext();}return;}
              ws.send(pkt(0x82,[0,1,...str(topic),0]));}
            else if(type===9){if(!done){done=true;clearTimeout(to);t.ws=ws;t.url=url;t.ping=setInterval(()=>{try{ws.send(new Uint8Array([0xC0,0]));}catch(e){}},25000);ok();}}
            else if(type===3){const tl=(body[0]<<8)|body[1];let q=2+tl;if((flags>>1)&3)q+=2;try{t.onmessage&&t.onmessage(JSON.parse(dec.decode(body.slice(q))));}catch(e){}}}};
        ws.onerror=()=>{};ws.onclose=()=>{if(!done){done=true;clearTimeout(to);tryNext();}else if(t.ws===ws&&!t.closed){t.onlost&&t.onlost();}};};tryNext();},
    post(o){if(!t.ws||t.ws.readyState!==1)return;const body=enc.encode(JSON.stringify(o));const head=str(topic);const total=head.length+body.length;
      const out=new Uint8Array(1+len(total).length+total);out[0]=0x30;out.set(len(total),1);out.set(head,1+len(total).length);out.set(body,1+len(total).length+head.length);t.ws.send(out);},
    close(){t.closed=true;clearInterval(t.ping);try{t.ws&&t.ws.send(new Uint8Array([0xE0,0]));t.ws&&t.ws.close();}catch(e){}}};
  return t;}
class RelayNet extends MeshNet{constructor(room,name,brokers){const tr=mqttTransport(room,brokers||RELAY_BROKERS);super(room,name,tr,{kind:'relay',hb:1000,timeout:7000,listen:2600});tr.onlost=()=>this.onFail&&this.onFail('Lost the connection to the relay server.');}}
// Photon payloads go through a JSON round trip so the binary protocol never sees undefined/NaN/typed arrays
const netClean=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
function photonHelp(code,msg){const m=`Photon error ${code}${msg?': '+msg:''}. `;
  if(code>=2001&&code<=2004)return m+'The game server dropped the connection. Usual causes: the AppId is not a Realtime/PUN app (Fusion, Chat and Voice AppIds do not work here; create a "Realtime" app in the Photon dashboard), the free 20-player (CCU) limit is full, or this network blocks Photon (school/work Wi-Fi often does).';
  if(code===1101||code===3101||code===4101||code===32767)return m+'Photon rejected the AppId. Check it is copied exactly and that custom authentication is off for that app.';
  if(code>=4001&&code<=4004)return m+'Could not reach Photon\'s name server. The network may block it, or the region is wrong.';
  if(code>=1001&&code<=1004)return m+'Could not reach the Photon master server. Try another region or network.';
  return m;}
class PhotonNet{
  constructor(appId,region,room,name,onReady,onFail){this.kind='photon';this.room=room;this.myId=-1;this.retries=0;this.left=false;this.joined=false;this.cfg={appId,region,room,name,onReady,onFail};this.connect();}
  connect(){const {appId,region,room,name,onReady,onFail}=this.cfg;const LBC=Photon.LoadBalancing.LoadBalancingClient;this.LBC=LBC;
    const c=this.c=new LBC(Photon.ConnectionProtocol.Wss,appId,'blockbattle-1.0');this.joining=false;
    c.onStateChange=s=>{if(c!==this.c)return;this.stateName=LBC.StateToName?LBC.StateToName(s):String(s);setNetStatus('Photon: '+this.stateName);
      if((s===LBC.State.JoinedLobby||s===LBC.State.ConnectedToMaster)&&!this.joining&&!this.joined){this.joining=true;c.joinRoom(room,{createIfNotExists:true},{maxPlayers:16,isVisible:true,isOpen:true});}};
    c.onJoinRoom=()=>{if(c!==this.c)return;this.joined=true;this.retries=0;this.myId=c.myActor().actorNr;this._h=this.hostId();setNetStatus('Photon: joined room '+room);onReady&&onReady();};
    c.onActorJoin=a=>{if(a.actorNr!==this.myId)this.onJoin&&this.onJoin(a.actorNr,a.name);this.checkHost();};
    c.onActorLeave=a=>{this.onLeave&&this.onLeave(a.actorNr);this.checkHost();};
    c.onEvent=(code,content,actorNr)=>{this.onEvent&&this.onEvent(code,content,actorNr);};
    c.onError=(code,msg)=>{if(c!==this.c||this.left)return;
      // a dropped game-server connection before we got into the room: try again a couple of times
      if(!this.joined&&code>=2001&&code<=2004&&this.retries<2){this.retries++;setNetStatus(`Photon: game server dropped the connection, retrying (${this.retries}/2)...`);try{c.disconnect();}catch(e){}setTimeout(()=>{if(!this.left)this.connect();},1500);return;}
      onFail&&onFail(photonHelp(code,msg)+(PHOTON_SDK_URL?' [SDK loaded from: '+PHOTON_SDK_URL+']':''));};
    try{c.myActor().setName(String(name||'Player').slice(0,16));}catch(e){}
    try{c.connectToRegionMaster(region||'us');}catch(e){onFail&&onFail('Photon failed to start: '+e.message);}
  }
  hostId(){try{return this.c.myRoom().masterClientId;}catch(e){return -1;}}
  isHost(){return this.inRoom()&&this.hostId()===this.myId;}
  checkHost(){const h=this.hostId();if(this._h!==h){this._h=h;this.onHostChange&&this.onHostChange(h);}}
  inRoom(){try{return this.c.isJoinedToRoom();}catch(e){return false;}}
  send(code,data,to){const o={};if(to)o.targetActors=to;this.c.raiseEvent(code,netClean(data),o);}
  list(){const a=this.c.myRoomActors();return Object.keys(a).map(k=>({id:a[k].actorNr,name:a[k].name||('Player '+a[k].actorNr)}));}
  leave(){this.left=true;try{this.c.disconnect();}catch(e){}}
}
function loadScript(u){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
// Photon JavaScript SDK: prefer the official SDK file next to the page (lib/photon.min.js from the Realtime JavaScript SDK download).
// The old 2017 npm copy is no longer tried: an outdated SDK gets past the master server and is then dropped by the game server (error 2003).
let PHOTON_SDK_URL=null;
async function loadPhotonSDK(custom){
  if(window.Photon&&window.Photon.LoadBalancing)return true;
  const local=[custom,'photon.min.js','photon.js','lib/photon.min.js','Photon-Javascript_SDK.min.js','Photon-Javascript_SDK.js'].filter(Boolean);
  for(const u of local){try{await loadScript(u);if(window.Photon&&window.Photon.LoadBalancing){PHOTON_SDK_URL=u;return true;}}catch(e){}}
  // npm build of the current SDK, written for require(): give it a CommonJS shim and pick up its exports
  for(const u of ['https://cdn.jsdelivr.net/npm/photon-realtime@4/photon.min.js','https://cdn.jsdelivr.net/npm/photon-realtime@4/photon.js','https://cdn.jsdelivr.net/npm/photon-realtime@4']){
    const hadM='module' in window,hadE='exports' in window;window.module={exports:{}};window.exports=window.module.exports;
    try{await loadScript(u);const ex=window.module.exports;if(!window.Photon&&ex&&(ex.LoadBalancing||(ex.Photon&&ex.Photon.LoadBalancing)))window.Photon=ex.LoadBalancing?ex:ex.Photon;}catch(e){}
    if(!hadM)delete window.module;if(!hadE)delete window.exports;
    if(window.Photon&&window.Photon.LoadBalancing){PHOTON_SDK_URL=u;return true;}}
  return false;
}
