'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hash2(x,y,s){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s,o=4){let t=0,a=1,f=1,n=0;for(let i=0;i<o;i++){t+=vnoise(x*f,y*f,s+i*17)*a;n+=a;a*=.5;f*=2;}return t/n;}
let rs=1;const srand=()=>{rs=(Math.imul(rs,1664525)+1013904223)>>>0;return rs/4294967296;};
const sri=(a,b)=>a+Math.floor(srand()*(b-a+1));
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const M4={
  id(){const o=new Float32Array(16);o[0]=o[5]=o[10]=o[15]=1;return o;},
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  persp(f,a,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o;},
  tr(x,y,z){const o=M4.id();o[12]=x;o[13]=y;o[14]=z;return o;},
  sc(x,y,z){const o=M4.id();o[0]=x;o[5]=y;o[10]=z;return o;},
  rx(a){const c=Math.cos(a),s=Math.sin(a),o=M4.id();o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;},
  ry(a){const c=Math.cos(a),s=Math.sin(a),o=M4.id();o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;},
  rz(a){const c=Math.cos(a),s=Math.sin(a),o=M4.id();o[0]=c;o[1]=s;o[4]=-s;o[5]=c;return o;},
};
const chain=(...m)=>m.reduce((a,b)=>M4.mul(a,b));
function xform(m,p){const x=p[0],y=p[1],z=p[2];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];}
const hexRGB=h=>{const n=parseInt(h.slice(1),16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const hdist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const fmtTime=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
// player settings (Options screens)
const OPT=Object.assign({fov:70,rd:2,clouds:true,bob:true,smooth:true,fancy:true,particles:2,fps:0,bright:0,vol:1,music:.6,gui:0,mobile:'auto',full:false},(()=>{try{return JSON.parse(store('bb_opt')||'{}')||{};}catch(e){return {};}})());
function saveOpt(){store('bb_opt',JSON.stringify(OPT));}

// ---------- minimal zip/jar reader (stored + deflate via DecompressionStream) ----------
async function readZip(buf){
  const dv=new DataView(buf);let eocd=-1;
  for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65600);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error('That file is not a .zip or .jar');
  const n=dv.getUint16(eocd+10,true),cd=dv.getUint32(eocd+16,true);const files=new Map();let p=cd;const td=new TextDecoder();
  for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
    files.set(td.decode(new Uint8Array(buf,p+46,nl)),{method,csize,lho});p+=46+nl+el+cl;}
  return {files,async get(name){const f=files.get(name);if(!f)return null;const l=f.lho;const nl=dv.getUint16(l+26,true),el=dv.getUint16(l+28,true);
    const data=new Uint8Array(buf,l+30+nl+el,f.csize);if(f.method===0)return data;
    if(f.method===8){const ds=new DecompressionStream('deflate-raw');return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer());}return null;}};
}
