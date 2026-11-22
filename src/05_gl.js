// ================= WebGL =================
const cv=$('gl'),hud=$('hud'),hc=hud.getContext('2d');
const gl=cv.getContext('webgl',{antialias:false,alpha:false,preserveDrawingBuffer:false});
if(!gl){document.body.innerHTML='<p style="color:#fff;padding:20px;font-family:monospace">WebGL is not available in this browser.</p>';throw new Error('no webgl');}
function prog(vs,fs){const p=gl.createProgram();for(const [t,s] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},a={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const x=gl.getActiveUniform(p,i);u[x.name.replace('[0]','')]=gl.getUniformLocation(p,x.name);}
  const m=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<m;i++){const x=gl.getActiveAttrib(p,i);a[x.name]=gl.getAttribLocation(p,x.name);}return {p,u,a};}
const FOG_GLSL=`uniform vec3 fogC;uniform float fogN;uniform float fogF;`;
const PW=prog(`attribute vec3 p;attribute vec2 t;attribute float s;uniform mat4 vp;uniform vec3 cam;varying vec2 vt;varying float vs;varying float vd;
void main(){gl_Position=vp*vec4(p,1.);vt=t;vs=s;vd=length(p-cam);}`,
`precision mediump float;uniform sampler2D tex;${FOG_GLSL}uniform float alpha;varying vec2 vt;varying float vs;varying float vd;
void main(){vec4 c=texture2D(tex,vt);if(c.a<.4)discard;float f=clamp((vd-fogN)/(fogF-fogN),0.,1.);gl_FragColor=vec4(mix(c.rgb*vs,fogC,f),alpha<1.?c.a*alpha:1.);}`);
const PB=prog(`attribute vec3 p;attribute vec3 n;uniform mat4 vp;uniform mat4 m;uniform vec3 cam;varying float l;varying float vd;
void main(){vec4 w=m*vec4(p,1.);gl_Position=vp*w;vec3 nn=normalize((m*vec4(n,0.)).xyz);l=.6+.4*max(dot(nn,normalize(vec3(.4,1.,.3))),0.);vd=length(w.xyz-cam);}`,
`precision mediump float;uniform vec4 col;${FOG_GLSL}uniform float lit;varying float l;varying float vd;
void main(){float f=clamp((vd-fogN)/(fogF-fogN),0.,1.);vec3 c=col.rgb*mix(1.,l,lit);gl_FragColor=vec4(mix(c,fogC,f),col.a);}`);
// textured meshes: skins, armor, bats, extruded items
const PT=prog(`attribute vec3 p;attribute vec3 n;attribute vec2 t;uniform mat4 vp;uniform mat4 m;uniform vec3 cam;varying vec2 vt;varying float l;varying float vd;
void main(){vec4 w=m*vec4(p,1.);gl_Position=vp*w;vec3 nn=normalize((m*vec4(n,0.)).xyz);l=.55+.45*max(dot(nn,normalize(vec3(.4,1.,.3))),0.)+.1*nn.y;vd=length(w.xyz-cam);vt=t;}`,
`precision mediump float;uniform sampler2D tex;uniform vec4 tint;uniform float hurt;uniform float bright;${FOG_GLSL}varying vec2 vt;varying float l;varying float vd;
void main(){vec4 c=texture2D(tex,vt);if(c.a<.1)discard;c*=tint;vec3 rgb=mix(c.rgb*l*bright,vec3(1.,.15,.1),hurt*.55);float f=clamp((vd-fogN)/(fogF-fogN),0.,1.);gl_FragColor=vec4(mix(rgb,fogC,f),c.a);}`);
const PS=prog(`attribute vec3 p;uniform mat4 vp;varying vec3 d;void main(){d=p;vec4 q=vp*vec4(p,1.);gl_Position=q.xyww;}`,
`precision mediump float;uniform sampler2D tex;varying vec3 d;uniform float face;void main(){gl_FragColor=texture2D(tex,vec2(0.,0.));}`);
function mkTex(src,repeat){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
let atlasTex=mkTex(atlasCanvas);
function reuploadAtlas(){gl.deleteTexture(atlasTex);atlasTex=mkTex(atlasCanvas);}

// ---- world chunk meshes (opaque/cutout + translucent water) ----
let chunks=[];
const FSHADE=[.8,.8,1,.5,.65,.65],AOK=[.5,.66,.83,1];
const LB=[];for(let l=0;l<16;l++)LB[l]=.05+.95*Math.pow(.8,15-l);
function buildChunk(ci,cj){
  const out=[],wat=[];const x0=ci*16,z0=cj*16,x1=Math.min(WX,x0+16),z1=Math.min(WZ,z0+16);const AS=ACOLS*TILE;const skyMul=mapInfo&&mapInfo.dark?0:1;
  for(let y=0;y<WY;y++)for(let z=z0;z<z1;z++)for(let x=x0;x<x1;x++){
    const b=world[idx(x,y,z)];if(!b)continue;const D=BD[b];if(!D.render)continue;
    if(D.cross){const tx=(D.side%ACOLS)*TILE,ty=Math.floor(D.side/ACOLS)*TILE;const L=lightAt(x,y,z);const lv=Math.max(LB[(L>>4)&15]*skyMul,LB[L&15],.12)*.9;const j=(hash2(x,z,5)-.5)*.3;
      const u0=(tx+.02)/AS,u1=(tx+TILE-.02)/AS,v0=(ty+.02)/AS,v1=(ty+TILE-.02)/AS;
      for(const [ax,az,bx,bz] of [[.15,.15,.85,.85],[.15,.85,.85,.15]]){const q=[[x+ax+j,y+1,z+az,u0,v0],[x+bx+j,y+1,z+bz,u1,v0],[x+bx+j,y,z+bz,u1,v1],[x+ax+j,y,z+az,u0,v1]];
        for(const i of [0,1,2,0,2,3])out.push(q[i][0],q[i][1],q[i][2],q[i][3],q[i][4],lv);}continue;}
    if(D.shape){const Lo=lightAt(x,y,z),Lu=lightAt(x,y+1,z);const lvB=Math.max(LB[Math.max(Lo>>4,Lu>>4)&15]*skyMul,LB[Math.max(Lo&15,Lu&15)],mapInfo&&mapInfo.dark?.07:.12);
      for(const bx of D.shape)for(let f=0;f<6;f++){const d=f>>1,s=(f&1)?-1:1;const u=(d+1)%3,v=(d+2)%3;const lo=[bx[0],bx[1],bx[2]],hi=[bx[3],bx[4],bx[5]];
        const plane=s>0?hi[d]:lo[d];
        if((s>0&&plane>=1)||(s<0&&plane<=0)){const nx=x+(d==0?s:0),ny=y+(d==1?s:0),nz=z+(d==2?s:0);const nb=getB(nx,ny,nz);if(nb&&BD[nb].opaque&&!BD[nb].shape)continue;}
        const tile=bx[6]!=null?bx[6]:d==1?(s>0?D.top:D.bottom):(f==4?D.front:D.side);const tx=(tile%ACOLS)*TILE,ty=Math.floor(tile/ACOLS)*TILE;const vs=[];
        for(const [cu,cv2] of [[0,0],[1,0],[1,1],[0,1]]){const l=[0,0,0];l[d]=plane;l[u]=cu?hi[u]:lo[u];l[v]=cv2?hi[v]:lo[v];
          let tu,tv;if(d==1){tu=l[0];tv=l[2];}else if(d==0){tu=l[2];tv=1-l[1];}else{tu=l[0];tv=1-l[1];}
          vs.push([x+l[0],y+l[1],z+l[2],(tx+.02+tu*(TILE-.04))/AS,(ty+.02+tv*(TILE-.04))/AS,D.light?1:FSHADE[f]*lvB]);}
        for(const i of [0,1,2,0,2,3])out.push(...vs[i]);}
      continue;}
    for(let f=0;f<6;f++){
      const d=f>>1,s=(f&1)?-1:1;const nx=x+(d==0?s:0),ny=y+(d==1?s:0),nz=z+(d==2?s:0);
      const nb=getB(nx,ny,nz);
      if(D.liquid){if(nb===b||(nb&&BD[nb].opaque))continue;if(D.liquid==='water'&&nb&&BD[nb].solid&&BD[nb].opaque)continue;}
      else if(nb&&!BD[nb].cross&&!BD[nb].shape&&(BD[nb].opaque||nb===b)&&BD[nb].render)continue;
      if(!inB(nx,ny,nz)&&ny>=0&&D.opaque&&(nx<0||nz<0||nx>=WX||nz>=WZ))continue;
      const tile=d==1?(s>0?D.top:D.bottom):(f==4?D.front:D.side);
      const tx=(tile%ACOLS)*TILE,ty=Math.floor(tile/ACOLS)*TILE;
      const u=(d+1)%3,v=(d+2)%3;const F=[nx,ny,nz];
      const L=lightAt(nx,ny,nz);const lv=D.light?1:Math.max(LB[(L>>4)&15]*skyMul,LB[L&15]*1.05,mapInfo&&mapInfo.dark?.07:.12);
      const vs=[];const aos=[];
      for(const [cu,cv2] of [[0,0],[1,0],[1,1],[0,1]]){
        const l=[0,0,0];l[d]=s>0?1:0;l[u]=cu;l[v]=cv2;
        let ao=3;if(!D.light&&!D.liquid){const su=cu?1:-1,sv=cv2?1:-1;const a=F.slice(),c=F.slice(),e=F.slice();a[u]+=su;c[v]+=sv;e[u]+=su;e[v]+=sv;
          const s1=opaqueAt(a[0],a[1],a[2])?1:0,s2=opaqueAt(c[0],c[1],c[2])?1:0,cc=opaqueAt(e[0],e[1],e[2])?1:0;ao=(s1&&s2)?0:3-(s1+s2+cc);}
        aos.push(ao);
        let tu,tv;if(d==1){tu=l[0];tv=l[2];}else if(d==0){tu=l[2];tv=1-l[1];}else{tu=l[0];tv=1-l[1];}
        const yy=D.liquid&&l[1]===1&&getB(x,y+1,z)!==b?.875:l[1];
        vs.push([x+l[0],y+yy,z+l[2],(tx+.02+tu*(TILE-.04))/AS,(ty+.02+tv*(TILE-.04))/AS,(D.light?1:FSHADE[f]*AOK[ao])*lv]);
      }
      const order=(aos[0]+aos[2]<aos[1]+aos[3])?[1,2,3,1,3,0]:[0,1,2,0,2,3];
      const tgt=D.liquid==='water'?wat:out;for(const i of order)tgt.push(...vs[i]);
    }
  }
  const nc=Math.ceil(WX/16);let c=chunks[cj*nc+ci];if(!c){c={buf:gl.createBuffer(),wbuf:gl.createBuffer(),count:0,wcount:0,ci,cj};chunks[cj*nc+ci]=c;}
  let arr=new Float32Array(out);gl.bindBuffer(gl.ARRAY_BUFFER,c.buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);c.count=arr.length/6;
  arr=new Float32Array(wat);gl.bindBuffer(gl.ARRAY_BUFFER,c.wbuf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);c.wcount=arr.length/6;
}
function buildMesh(){for(const c of chunks)if(c){gl.deleteBuffer(c.buf);gl.deleteBuffer(c.wbuf);}chunks=[];const nc=Math.ceil(WX/16),nr=Math.ceil(WZ/16);for(let j=0;j<nr;j++)for(let i=0;i<nc;i++)buildChunk(i,j);}
function rebuildAt(x,z){const set=new Set();for(const dx of [-1,0,1])for(const dz of [-1,0,1]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=WX||zz>=WZ)continue;set.add((xx>>4)+','+(zz>>4));}for(const k of set){const [i,j]=k.split(',').map(Number);buildChunk(i,j);}}

// ---- unit cube for solid-colour boxes ----
const cubeBuf=gl.createBuffer();
{const v=[];const faces=[[[1,0,0],[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],[[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]],
 [[0,1,0],[[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]],
 [[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]]]];
 for(const [n,c] of faces)for(const i of [0,1,2,0,2,3])v.push(...c[i],...n);gl.bindBuffer(gl.ARRAY_BUFFER,cubeBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);}

// ---- textured box meshes using Minecraft's box-UV layout ----
// px units; box origin (x0,y0,z0) size (w,h,d); uv origin (u,v); texture size tw x th; inflate in px
function boxUV(out,x0,y0,z0,w,h,d,u,v,tw,th,inf=0,mirror=false){
  const X0=x0-inf,Y0=y0-inf,Z0=z0-inf,X1=x0+w+inf,Y1=y0+h+inf,Z1=z0+d+inf;
  const quad=(P,n,u0,v0,uw,vh)=>{ // P: 4 corners in order TL,TR,BR,BL as seen on texture
    let U=[u0,u0+uw,u0+uw,u0];if(mirror)U=[u0+uw,u0,u0,u0+uw];const V=[v0,v0,v0+vh,v0+vh];
    for(const i of [0,1,2,0,2,3])out.push(P[i][0]/16,P[i][1]/16,P[i][2]/16,n[0],n[1],n[2],U[i]/tw,V[i]/th);};
  const R=mirror?-1:1;
  // front (-z): texture left = +x
  quad([[X1,Y1,Z0],[X0,Y1,Z0],[X0,Y0,Z0],[X1,Y0,Z0]],[0,0,-1],u+d,v+d,w,h);
  // right side (+x): texture left = +z(back)
  quad(mirror?[[X0,Y1,Z1],[X0,Y1,Z0],[X0,Y0,Z0],[X0,Y0,Z1]]:[[X1,Y1,Z1],[X1,Y1,Z0],[X1,Y0,Z0],[X1,Y0,Z1]],[R,0,0],u,v+d,d,h);
  // left side (-x)
  quad(mirror?[[X1,Y1,Z0],[X1,Y1,Z1],[X1,Y0,Z1],[X1,Y0,Z0]]:[[X0,Y1,Z0],[X0,Y1,Z1],[X0,Y0,Z1],[X0,Y0,Z0]],[-R,0,0],u+d+w,v+d,d,h);
  // back (+z)
  quad([[X0,Y1,Z1],[X1,Y1,Z1],[X1,Y0,Z1],[X0,Y0,Z1]],[0,0,1],u+2*d+w,v+d,w,h);
  // top (+y)
  quad([[X1,Y1,Z1],[X0,Y1,Z1],[X0,Y1,Z0],[X1,Y1,Z0]],[0,1,0],u+d,v,w,d);
  // bottom (-y)
  quad([[X1,Y0,Z0],[X0,Y0,Z0],[X0,Y0,Z1],[X1,Y0,Z1]],[0,-1,0],u+d+w,v,w,d);
}
function meshFrom(arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);return {buf:b,count:arr.length/8};}
// player model parts (pivot in px, feet at y=0, facing -z)
function makePlayerModel(slim){
  const P={};const A=(name,fn)=>{const o=[];fn(o);P[name]=meshFrom(o);};const aw=slim?3:4;
  A('head',o=>boxUV(o,-4,0,-4,8,8,8,0,0,64,64));A('hat',o=>boxUV(o,-4,0,-4,8,8,8,32,0,64,64,.5));
  A('body',o=>boxUV(o,-4,-12,-2,8,12,4,16,16,64,64));A('jacket',o=>boxUV(o,-4,-12,-2,8,12,4,16,32,64,64,.25));
  A('rarm',o=>boxUV(o,-1,-10,-2,aw,12,4,40,16,64,64));A('rsleeve',o=>boxUV(o,-1,-10,-2,aw,12,4,40,32,64,64,.25));
  A('larm',o=>boxUV(o,-aw+1,-10,-2,aw,12,4,32,48,64,64));A('lsleeve',o=>boxUV(o,-aw+1,-10,-2,aw,12,4,48,48,64,64,.25));
  A('rleg',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,64));A('rpants',o=>boxUV(o,-2,-12,-2,4,12,4,0,32,64,64,.25));
  A('lleg',o=>boxUV(o,-2,-12,-2,4,12,4,16,48,64,64));A('lpants',o=>boxUV(o,-2,-12,-2,4,12,4,0,48,64,64,.25));
  return P;
}
function makeArmorModel(){const P={};const A=(name,fn)=>{const o=[];fn(o);P[name]=meshFrom(o);};
  A('head',o=>boxUV(o,-4,0,-4,8,8,8,0,0,64,32,1));A('body',o=>boxUV(o,-4,-12,-2,8,12,4,16,16,64,32,1));
  A('rarm',o=>boxUV(o,-1,-10,-2,4,12,4,40,16,64,32,1));A('larm',o=>boxUV(o,-3,-10,-2,4,12,4,40,16,64,32,1,true));
  A('rleg',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,32,1));A('lleg',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,32,1,true));
  A('body2',o=>boxUV(o,-4,-12,-2,8,12,4,16,16,64,32,.5));A('rleg2',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,32,.5));A('lleg2',o=>boxUV(o,-2,-12,-2,4,12,4,0,16,64,32,.5,true));
  return P;}
function makeBatModel(){const P={};const A=(name,fn)=>{const o=[];fn(o);P[name]=meshFrom(o);};
  A('head',o=>boxUV(o,-3,-3,-3,6,6,6,0,0,64,64));A('rear',o=>boxUV(o,-4,-6,-2,3,4,1,24,0,64,64));A('lear',o=>boxUV(o,1,-6,-2,3,4,1,24,0,64,64,0,true));
  A('body',o=>boxUV(o,-3,4,-3,6,12,6,0,16,64,64));A('rwing',o=>boxUV(o,-12,1,1.5,10,16,1,42,0,64,64));A('rtip',o=>boxUV(o,-8,1,0,8,12,1,24,16,64,64));
  A('lwing',o=>boxUV(o,2,1,1.5,10,16,1,42,0,64,64,0,true));A('ltip',o=>boxUV(o,0,1,0,8,12,1,24,16,64,64,0,true));return P;}
function makeChestModel(){const P={};const A=(name,fn)=>{const o=[];fn(o);P[name]=meshFrom(o);};
  A('base',o=>boxUV(o,-7,0,-7,14,10,14,0,19,64,64));A('lid',o=>boxUV(o,-7,0,-14,14,5,14,0,0,64,64));A('knob',o=>boxUV(o,-1,-2,-15,2,4,1,0,0,64,64));return P;}
const MODELS={wide:makePlayerModel(false),slim:makePlayerModel(true),armor:makeArmorModel(),bat:makeBatModel(),chest:makeChestModel()};

// ---- extruded item meshes (like held items in Minecraft) built from 32x32 icons, stored in an item atlas ----
const ITEM_CELL=32,ITEM_COLS=16;let itemAtlas=mkCanvas(ITEM_CELL*ITEM_COLS,ITEM_CELL*ITEM_COLS),itemTex=null,itemMesh={},itemSlot={};
function rebuildItemAtlas(){
  const g=itemAtlas.getContext('2d');g.clearRect(0,0,itemAtlas.width,itemAtlas.height);g.imageSmoothingEnabled=false;let i=0;itemSlot={};
  for(const k in ITEMS){const cx=(i%ITEM_COLS)*ITEM_CELL,cy=Math.floor(i/ITEM_COLS)*ITEM_CELL;g.drawImage(ICONS[k],cx,cy,ITEM_CELL,ITEM_CELL);itemSlot[k]=[cx,cy];i++;}
  if(itemTex)gl.deleteTexture(itemTex);itemTex=mkTex(itemAtlas);for(const k in itemMesh)gl.deleteBuffer(itemMesh[k].buf);itemMesh={};
}
function getItemMesh(id){
  if(itemMesh[id])return itemMesh[id];const [cx,cy]=itemSlot[id];const data=itemAtlas.getContext('2d').getImageData(cx,cy,ITEM_CELL,ITEM_CELL).data;
  const N=ITEM_CELL,A=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&data[(y*N+x)*4+3]>40;const o=[];const W=itemAtlas.width,H=itemAtlas.height;const th=1/N;const S=1/N;
  const push=(p,n,uv)=>o.push(p[0],p[1],p[2],n[0],n[1],n[2],uv[0],uv[1]);
  const q=(a,b,c,d,n,ua,ub,uc,ud)=>{for(const [p,uv] of [[a,ua],[b,ub],[c,uc],[a,ua],[c,uc],[d,ud]])push(p,n,uv);};
  const U=x=>(cx+.02+x*(N-.04)/N)/W,V=y=>(cy+.02+y*(N-.04)/N)/H;
  q([-.5,.5,th],[.5,.5,th],[.5,-.5,th],[-.5,-.5,th],[0,0,1],[U(0),V(0)],[U(N),V(0)],[U(N),V(N)],[U(0),V(N)]);
  q([.5,.5,-th],[-.5,.5,-th],[-.5,-.5,-th],[.5,-.5,-th],[0,0,-1],[U(N),V(0)],[U(0),V(0)],[U(0),V(N)],[U(N),V(N)]);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!A(x,y))continue;const X0=-.5+x*S,X1=X0+S,Y1=.5-y*S,Y0=Y1-S;const uv=[U(x+.5),V(y+.5)];
    if(!A(x-1,y))q([X0,Y1,-th],[X0,Y1,th],[X0,Y0,th],[X0,Y0,-th],[-1,0,0],uv,uv,uv,uv);
    if(!A(x+1,y))q([X1,Y1,th],[X1,Y1,-th],[X1,Y0,-th],[X1,Y0,th],[1,0,0],uv,uv,uv,uv);
    if(!A(x,y-1))q([X0,Y1,-th],[X1,Y1,-th],[X1,Y1,th],[X0,Y1,th],[0,1,0],uv,uv,uv,uv);
    if(!A(x,y+1))q([X0,Y0,th],[X1,Y0,th],[X1,Y0,-th],[X0,Y0,-th],[0,-1,0],uv,uv,uv,uv);}
  return itemMesh[id]=meshFrom(o);
}

// ---- drawing helpers ----
let curVP=null,curCam=[0,0,0],curFog={c:[.5,.7,.9],n:60,f:110};
function useBox(vp,cam){gl.useProgram(PB.p);gl.bindBuffer(gl.ARRAY_BUFFER,cubeBuf);gl.enableVertexAttribArray(PB.a.p);gl.vertexAttribPointer(PB.a.p,3,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(PB.a.n);gl.vertexAttribPointer(PB.a.n,3,gl.FLOAT,false,24,12);
  gl.uniformMatrix4fv(PB.u.vp,false,vp);gl.uniform3fv(PB.u.cam,cam);gl.uniform3fv(PB.u.fogC,curFog.c);gl.uniform1f(PB.u.fogN,curFog.n);gl.uniform1f(PB.u.fogF,curFog.f);gl.uniform1f(PB.u.lit,1);}
function box(m,col,a=1){gl.uniformMatrix4fv(PB.u.m,false,m);gl.uniform4f(PB.u.col,col[0],col[1],col[2],a);gl.drawArrays(gl.TRIANGLES,0,36);}
function useTex(vp,cam){gl.useProgram(PT.p);gl.uniformMatrix4fv(PT.u.vp,false,vp);gl.uniform3fv(PT.u.cam,cam);gl.uniform3fv(PT.u.fogC,curFog.c);gl.uniform1f(PT.u.fogN,curFog.n);gl.uniform1f(PT.u.fogF,curFog.f);
  gl.uniform4f(PT.u.tint,1,1,1,1);gl.uniform1f(PT.u.hurt,0);gl.uniform1f(PT.u.bright,1);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(PT.u.tex,0);}
function drawMesh(mesh,m,tex){gl.bindTexture(gl.TEXTURE_2D,tex);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buf);
  gl.enableVertexAttribArray(PT.a.p);gl.vertexAttribPointer(PT.a.p,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(PT.a.n);gl.vertexAttribPointer(PT.a.n,3,gl.FLOAT,false,32,12);
  gl.enableVertexAttribArray(PT.a.t);gl.vertexAttribPointer(PT.a.t,2,gl.FLOAT,false,32,24);gl.uniformMatrix4fv(PT.u.m,false,m);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
