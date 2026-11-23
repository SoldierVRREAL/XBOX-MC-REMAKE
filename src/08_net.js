// ================= networking: our own room relay (online) or BroadcastChannel (same-browser tabs) =================
const N={STATE:1,HIT:2,DEATH:3,CHESTREQ:4,CHEST:5,GIVE:6,DROPADD:7,DROPDEL:8,DROPREQ:9,PROJ:10,BOTS:11,PHASE:12,START:13,ANN:14,BLOCK:15,SQUEAK:16,LOBBY:17,READY:18,END:19,DEALT:20,PICK:21,CHAT:22,TOLOBBY:23,HELLO:24,BR:25,CHESTS:26,LEAVE:27,SKIN:28,DROPUPD:29};
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
    transport.onmessage=m=>{try{this.recv(m);}catch(e){}};transport.will={t:'bye',from:this.myId,will:1};   // the relay sends this for us if the connection dies
    transport.open(()=>{if(this.left)return;this.hb=setInterval(()=>this.beat(),opt.hb);this.beat();
      setTimeout(()=>{if(this.left)return;let mx=0;for(const m of this.members.values())if(m.id!==this.myId)mx=Math.max(mx,m.joined);
        const me=this.members.get(this.myId);if(mx&&me.joined<=mx)me.joined=mx+1;   // join after everyone already in the room, whatever our clock says
        this.ready=true;this._h=this.hostId();this.beat();this.onReady&&this.onReady();},opt.listen);},
      err=>{this.onFail&&this.onFail(err);});
  }
  post(o){if(!this.left)this.tr.post(o);}
  beat(){if(this.ready&&this.isHost()&&this.tr.advertise&&this.getAdvert&&(this.advN=(this.advN||0)+1)%3===1){const a=this.getAdvert();if(a)this.tr.advertise(Object.assign({t:'adv',ver:2,room:this.opt.room,from:this.myId},a));}
    const me=this.members.get(this.myId);this.post({t:'hb',from:this.myId,name:this.name,joined:me.joined,r:this.ready?1:0,pt:Math.round(performance.now())});const now=Date.now();
    for(const [id,m] of [...this.members]){if(id!==this.myId&&now-m.seen>this.opt.timeout){this.members.delete(id);if(m.r)this.onLeave&&this.onLeave(id);this.checkHost();}}}
  recv(m){if(m&&m.from===this.myId){if(m.t==='hb'&&m.pt)this.notePing(performance.now()-m.pt);return;}   // our own heartbeat coming back = round trip to the relay
    if(!m||typeof m.from!=='number')return;
    if(m.t==='hb'){const had=this.members.has(m.from);const ex=this.members.get(m.from)||{id:m.from};ex.seen=Date.now();ex.name=String(m.name||'Player').slice(0,16);ex.joined=+m.joined||Date.now();const wasR=ex.r;ex.r=!!m.r;this.members.set(m.from,ex);
      if(ex.r&&!wasR&&this.ready)this.onJoin&&this.onJoin(m.from,ex.name);if(!had||ex.r!==wasR)this.checkHost();return;}
    if(m.t==='bye'&&m.will){const ex=this.members.get(m.from);if(ex)ex.seen=Math.min(ex.seen,Date.now()-this.opt.timeout+3500);return;}   // dropped, not left: 3.5 s to reconnect before they count as gone
    if(m.t==='bye'){const ex=this.members.get(m.from);if(ex){this.members.delete(m.from);if(ex.r)this.onLeave&&this.onLeave(m.from);this.checkHost();}return;}
    if(m.t==='ev'){if(m.to&&!m.to.includes(this.myId))return;const ex=this.members.get(m.from);if(!ex)return;ex.seen=Date.now();this.onEvent&&this.onEvent(m.code,m.data,m.from);}}
  // only members that finished joining can be host, so a newcomer never steals the host role
  hostId(){let best=null;for(const m of this.members.values()){if(m.id!==this.myId&&!m.r)continue;if(!best||m.joined<best.joined||(m.joined===best.joined&&m.id<best.id))best=m;}return best?best.id:this.myId;}
  notePing(v){if(!(v>=0&&v<20000))return;this.ping=this.ping==null?v:this.ping*.7+v*.3;}
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
// where to find the room relay, in order: ?relay=... in the page URL, a server typed in Play Online, the server that is hosting
// this page (server/server.js serves the game and the relay together), then free public relays as a backup
const PUBLIC_RELAYS=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
function relayList(typed){const out=[];const add=(u,quick)=>{if(u&&/^wss?:\/\//.test(u)&&!out.some(o=>o.url===u))out.push({url:u,quick});};
  for(const u of (new URLSearchParams(location.search).get('relay')||'').split(','))add(u.trim(),false);
  if(typed){let t=typed.trim();if(t&&!/^wss?:\/\//.test(t))t=(location.protocol==='https:'||/^[^:]+\.[a-z]{2,}$/i.test(t)?'wss://':'ws://')+t;if(t&&!/\/mqtt$/.test(t))t=t.replace(/\/$/,'')+'/mqtt';add(t,false);}
  if(location.protocol==='http:'||location.protocol==='https:'){if(!/\.github\.io$/i.test(location.hostname))add((location.protocol==='https:'?'wss://':'ws://')+location.host+'/mqtt',true);}
  for(const u of PUBLIC_RELAYS)add(u,false);return out;}
// rooms announce themselves on a shared topic so the server browser can list them (hosts only, every few seconds)
const ADV_TOPIC='xmbbe/v2/_rooms';
function mqttTransport(room,brokers,opts={}){ // brokers: [{url,quick}]; opts.advOnly = just listen for room adverts (server browser)
  const enc=new TextEncoder(),dec=new TextDecoder();
  const str=s=>{const b=enc.encode(s);return [b.length>>8,b.length&255,...b];};
  const bin=b=>[b.length>>8,b.length&255,...b];
  const len=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d);}while(n>0);return o;};
  const pkt=(h,body)=>new Uint8Array([h,...len(body.length),...body]);
  const topic=opts.advOnly?ADV_TOPIC:'xmbbe/v2/'+String(room).toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40);
  const t={ws:null,buf:new Uint8Array(0),url:null,will:null,downSince:0,
    // one connection attempt: CONNECT (with a last-will "bye" so the room hears at once if we vanish), SUBSCRIBE, then ok()
    connect(br,ok,bad){let done=false,ws;const url=br.url;try{ws=new WebSocket(url,['mqtt']);}catch(e){bad();return;}ws.binaryType='arraybuffer';t.trying&&t.trying(url);let buf=new Uint8Array(0);
      const to=setTimeout(()=>{if(!done){done=true;try{ws.close();}catch(e){}bad();}},br.quick?2500:6000);
      ws.onopen=()=>{const cid='xmbbe'+Math.random().toString(36).slice(2,12);const w=t.will&&!opts.advOnly;
        ws.send(pkt(0x10,[...str('MQTT'),4,w?0x06:0x02,0,60,...str(cid),...(w?[...str(topic),...bin(enc.encode(JSON.stringify(t.will)))]:[])]));};
      ws.onmessage=e=>{const d=new Uint8Array(e.data);const nb=new Uint8Array(buf.length+d.length);nb.set(buf);nb.set(d,buf.length);buf=nb;
        for(;;){if(buf.length<2)break;let mult=1,rl=0,p=1,b;do{if(p>=buf.length)return;b=buf[p++];rl+=(b&127)*mult;mult*=128;}while(b&128);if(buf.length<p+rl)break;
          const type=buf[0]>>4,flags=buf[0]&15,body=buf.slice(p,p+rl);buf=buf.slice(p+rl);
          if(type===2){if(body[1]!==0){if(!done){done=true;clearTimeout(to);try{ws.close();}catch(e){}bad();}return;}
            ws.send(pkt(0x82,[0,1,...str(topic),0,...(opts.advOnly?[]:[...str(ADV_TOPIC),0])]));}
          else if(type===9){if(!done){done=true;clearTimeout(to);ok(ws);}}
          else if(type===3){const tl=(body[0]<<8)|body[1];const tp=dec.decode(body.slice(2,2+tl));let q=2+tl;if((flags>>1)&3)q+=2;let m;try{m=JSON.parse(dec.decode(body.slice(q)));}catch(e){continue;}
            if(tp===ADV_TOPIC){t.onadvert&&t.onadvert(m);if(opts.advOnly)continue;}else if(t.ws===ws)t.onmessage&&t.onmessage(m);}}};
      ws.onerror=()=>{};ws.onclose=()=>{if(!done){done=true;clearTimeout(to);bad();}else if(t.ws===ws&&!t.closed)t.dropped();};},
    use(ws,url){t.ws=ws;t.url=url;clearInterval(t.ping);t.ping=setInterval(()=>{try{ws.send(new Uint8Array([0xC0,0]));}catch(e){}},25000);},
    open(ok,fail){let i=0;const tryNext=()=>{if(t.closed)return;if(i>=brokers.length){fail('Could not reach a game server. Check the server address, or this network may block it (school/work Wi-Fi often does): try home Wi-Fi or a phone hotspot.');return;}
        const br=brokers[i++];t.connect(br,ws=>{t.br=br;t.use(ws,br.url);ok();},tryNext);};tryNext();},
    // the connection dropped: try the same relay again a few times before giving up (the game keeps running meanwhile)
    dropped(){t.ws=null;t.downSince=performance.now();let n=0;t.onreconnecting&&t.onreconnecting();
      const again=()=>{if(t.closed)return;if(++n>6){t.onlost&&t.onlost();return;}t.connect(Object.assign({},t.br,{quick:false}),ws=>{t.use(ws,t.br.url);const down=performance.now()-t.downSince;t.downSince=0;t.onreconnected&&t.onreconnected(down);},()=>setTimeout(again,Math.min(4000,400*n)));};
      setTimeout(again,250);},
    raw(o,tp){if(!t.ws||t.ws.readyState!==1)return;const body=enc.encode(JSON.stringify(o));const head=str(tp);const total=head.length+body.length;
      const out=new Uint8Array(1+len(total).length+total);out[0]=0x30;out.set(len(total),1);out.set(head,1+len(total).length);out.set(body,1+len(total).length+head.length);t.ws.send(out);},
    post(o){t.raw(o,topic);},advertise(o){t.raw(o,ADV_TOPIC);},
    close(){t.closed=true;clearInterval(t.ping);try{t.ws&&t.ws.send(new Uint8Array([0xE0,0]));t.ws&&t.ws.close();}catch(e){}}};
  return t;}
// server browser: listen to room adverts on the same relays the game would use
function browseRooms(typed,onUpdate){const rooms=new Map();const tr=mqttTransport('',relayList(typed),{advOnly:true});let tick=null;
  const emit=()=>{const now=Date.now();for(const [k,r] of rooms)if(now-r.seen>9000)rooms.delete(k);onUpdate([...rooms.values()].sort((a,b)=>(a.state==='lobby'?0:1)-(b.state==='lobby'?0:1)||b.n-a.n),tr.url);};
  tr.onadvert=m=>{if(!m||m.t!=='adv'||typeof m.room!=='string'||m.ver!==2)return;rooms.set(m.room.toLowerCase(),Object.assign({},m,{seen:Date.now()}));emit();};
  tr.open(()=>{emit();tick=setInterval(emit,2000);},err=>onUpdate(null,null,err));
  return {close(){clearInterval(tick);tr.close();}};}
class RelayNet extends MeshNet{constructor(room,name,typed){const tr=mqttTransport(room,relayList(typed));super(room,name,tr,{kind:'relay',hb:1000,timeout:7000,listen:2600,room});
  tr.onlost=()=>this.onFail&&this.onFail('Lost the connection to the game server.');tr.onreconnecting=()=>this.onReconnecting&&this.onReconnecting();
  tr.onreconnected=down=>{const me=this.members.get(this.myId);if(down>4000&&!this.isHost()){let mx=0;for(const m of this.members.values())if(m.id!==this.myId)mx=Math.max(mx,m.joined);me.joined=Math.max(me.joined,mx+1);}
    this.beat();this.onReconnected&&this.onReconnected(down);};}}
