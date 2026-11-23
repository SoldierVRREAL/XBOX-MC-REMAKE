#!/usr/bin/env node
// Xbox Minecraft Battle Mode Browser Edition - game server
// One small Node.js program, no npm packages needed:
//   * serves the game (index.html, pack.zip, sounds.zip, logo.png ...) from the folder above this one
//   * runs the multiplayer room relay on /mqtt (a tiny MQTT 3.1.1 broker over WebSocket, QoS 0)
// Start it with:  node server/server.js        (PORT=8080 by default, or set the PORT environment variable)
'use strict';
const http=require('http'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const PORT=+process.env.PORT||8080;
const ROOT=path.resolve(process.env.GAME_DIR||path.join(__dirname,'..'));
const MAX_PACKET=1024*1024;          // biggest message a client may send
const MAX_RATE=400;                  // messages per client per second before it is cut off
const MAX_TOPICS=4,MAX_PER_ROOM=24,IDLE_MS=90000;

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.zip':'application/zip','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.txt':'text/plain; charset=utf-8'};

// ---------- static files ----------
const server=http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname);}catch(e){res.writeHead(400);res.end();return;}
  if(p==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size,players:clients.size}));return;}
  if(p==='/rooms'){const now=Date.now(),list=[];for(const [k,a] of adverts){if(now-a.seen>10000)adverts.delete(k);else list.push(a.info);}res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(list));return;}
  if(p.endsWith('/'))p+='index.html';
  const file=path.resolve(ROOT,'.'+p);
  if(!file.startsWith(ROOT+path.sep)&&file!==ROOT){res.writeHead(403);res.end();return;}
  if(/(^|[\\/])(\.|server([\\/]|$)|node_modules)/.test(path.relative(ROOT,file))){res.writeHead(404);res.end('Not found');return;}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':st.size,'Cache-Control':'no-cache'});
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);});
});

// ---------- WebSocket + MQTT relay ----------
const rooms=new Map();   // topic -> Set(client)
const clients=new Set();
const adverts=new Map(); // open rooms announced by their hosts (for the server browser and /rooms)
const encLen=n=>{const o=[];do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;o.push(d);}while(n>0);return o;};
const publishPkt=(topic,payload)=>{const t=Buffer.from(topic),body=Buffer.concat([Buffer.from([t.length>>8,t.length&255]),t,payload]);return Buffer.concat([Buffer.from([0x30,...encLen(body.length)]),body]);};
function wsSend(c,data){if(c.closed)return;const n=data.length;let h;
  if(n<126)h=Buffer.from([0x82,n]);else if(n<65536){h=Buffer.alloc(4);h[0]=0x82;h[1]=126;h.writeUInt16BE(n,2);}else{h=Buffer.alloc(10);h[0]=0x82;h[1]=127;h.writeBigUInt64BE(BigInt(n),2);}
  try{c.sock.write(Buffer.concat([h,data]));}catch(e){}}
function drop(c){if(c.closed)return;c.closed=true;clients.delete(c);
  // connection died without a clean goodbye: send its last will (a 'bye') to its room so the others know straight away
  if(!c.clean&&c.will&&c.topics.has(c.will.topic)){const r=rooms.get(c.will.topic);if(r){const out=publishPkt(c.will.topic,c.will.msg);for(const o of r)if(o!==c)wsSend(o,out);}}for(const t of c.topics){const r=rooms.get(t);if(r){r.delete(c);if(!r.size)rooms.delete(t);}}try{c.sock.destroy();}catch(e){}}
function mqttPacket(c,type,flags,body,raw){
  if(type===1){ // CONNECT -> CONNACK; remember the last will so the room hears at once if this connection dies
    try{let q=0;q+=2+body.readUInt16BE(q);q+=1;const fl=body[q];q+=1;q+=2;q+=2+body.readUInt16BE(q);
      if(fl&4){const tl=body.readUInt16BE(q);const wt=body.slice(q+2,q+2+tl).toString();q+=2+tl;const ml=body.readUInt16BE(q);if(ml<=4096)c.will={topic:wt,msg:Buffer.from(body.slice(q+2,q+2+ml))};}}catch(e){}
    c.connected=true;wsSend(c,Buffer.from([0x20,2,0,0]));return;}
  if(!c.connected){drop(c);return;}
  if(type===8){ // SUBSCRIBE -> SUBACK
    const id=body.slice(0,2);let q=2;const codes=[];
    while(q+2<=body.length){const l=body.readUInt16BE(q);const t=body.slice(q+2,q+2+l).toString();q+=3+l;
      const room=rooms.get(t)||new Set();
      const cap=t.endsWith('/_rooms')?5000:MAX_PER_ROOM;   // the room list topic is shared by everyone
      if(c.topics.size>=MAX_TOPICS||room.size>=cap||!t||/[#+]/.test(t)){codes.push(0x80);continue;}
      room.add(c);rooms.set(t,room);c.topics.add(t);codes.push(0);}
    wsSend(c,Buffer.from([0x90,2+codes.length,id[0],id[1],...codes]));return;}
  if(type===10){ // UNSUBSCRIBE -> UNSUBACK
    const id=body.slice(0,2);let q=2;while(q+2<=body.length){const l=body.readUInt16BE(q);const t=body.slice(q+2,q+2+l).toString();q+=2+l;c.topics.delete(t);const r=rooms.get(t);if(r){r.delete(c);if(!r.size)rooms.delete(t);}}
    wsSend(c,Buffer.from([0xB0,2,id[0],id[1]]));return;}
  if(type===3){ // PUBLISH (QoS 0) -> everyone in that room, including the sender (clients ignore their own)
    const l=body.readUInt16BE(0);const t=body.slice(2,2+l).toString();const r=rooms.get(t);if(!r||!c.topics.has(t))return;
    let out=raw;if(flags&6){const pay=body.slice(4+l);out=publishPkt(t,pay);}   // QoS 1/2 sent as QoS 0 (drop the packet id)
    if(t.endsWith('/_rooms')){try{const a=JSON.parse(body.slice((flags&6)?4+l:2+l).toString());if(a&&a.t==='adv'&&typeof a.room==='string')adverts.set(a.room.toLowerCase(),{seen:Date.now(),info:{room:a.room.slice(0,24),host:String(a.host||'').slice(0,16),n:+a.n||0,max:+a.max||16,mode:a.mode,map:a.map,state:a.state,gt:+a.gt||0}});}catch(e){}}
    for(const o of r)wsSend(o,out);return;}
  if(type===12){wsSend(c,Buffer.from([0xD0,0]));return;}
  if(type===14){c.clean=true;drop(c);return;}
}
server.on('upgrade',(req,sock)=>{
  const key=req.headers['sec-websocket-key'];if(!key){sock.destroy();return;}
  const protos=String(req.headers['sec-websocket-protocol']||'').split(',').map(s=>s.trim());
  const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n'+(protos.includes('mqtt')?'Sec-WebSocket-Protocol: mqtt\r\n':'')+'\r\n');
  sock.setNoDelay(true);
  const c={sock,topics:new Set(),connected:false,closed:false,wbuf:Buffer.alloc(0),mbuf:Buffer.alloc(0),frag:[],count:0,tick:Date.now(),last:Date.now()};clients.add(c);
  sock.on('data',d=>{c.last=Date.now();c.wbuf=Buffer.concat([c.wbuf,d]);if(c.wbuf.length>MAX_PACKET*2){drop(c);return;}
    for(;;){const w=c.wbuf;if(w.length<2)return;const fin=w[0]&128,op=w[0]&15;let len=w[1]&127,off=2;
      if(len===126){if(w.length<4)return;len=w.readUInt16BE(2);off=4;}else if(len===127){if(w.length<10)return;len=Number(w.readBigUInt64BE(2));off=10;}
      if(len>MAX_PACKET){drop(c);return;}const masked=w[1]&128;const mk=masked?w.slice(off,off+4):null;if(masked)off+=4;if(w.length<off+len)return;
      let pl=Buffer.from(w.slice(off,off+len));if(masked)for(let i=0;i<pl.length;i++)pl[i]^=mk[i&3];c.wbuf=w.slice(off+len);
      if(op===8){drop(c);return;}
      if(op===9){try{sock.write(Buffer.concat([Buffer.from([0x8A,pl.length]),pl]));}catch(e){}continue;}
      if(op===10)continue;
      c.frag.push(pl);if(!fin)continue;const msg=Buffer.concat(c.frag);c.frag=[];
      c.mbuf=Buffer.concat([c.mbuf,msg]);
      for(;;){const m=c.mbuf;if(m.length<2)break;let mult=1,rl=0,p=1,b;do{if(p>=m.length)return;b=m[p++];rl+=(b&127)*mult;mult*=128;}while(b&128);if(rl>MAX_PACKET){drop(c);return;}if(m.length<p+rl)break;
        const raw=m.slice(0,p+rl);c.mbuf=m.slice(p+rl);
        const now=Date.now();if(now-c.tick>1000){c.tick=now;c.count=0;}if(++c.count>MAX_RATE){drop(c);return;}
        try{mqttPacket(c,raw[0]>>4,raw[0]&15,raw.slice(p),raw);}catch(e){drop(c);return;}if(c.closed)return;}}});
  sock.on('close',()=>drop(c));sock.on('error',()=>drop(c));
});
setInterval(()=>{const now=Date.now();for(const c of clients)if(now-c.last>IDLE_MS)drop(c);},15000);
server.listen(PORT,()=>{console.log(`Battle server running: http://localhost:${PORT}  (game files from ${ROOT})`);console.log('Multiplayer relay: ws://localhost:'+PORT+'/mqtt');});
