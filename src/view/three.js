// The 3D view: the generated valley, the buildings the game placed, the lines, the weather
// and the villagers. Nothing here changes the simulation; it only reads S.
import { BUILDINGS } from '../data/buildings.js';
import { LIGHT } from '../data/world.js';
import { SEASON_CROP, SEASON_LEAF } from '../data/styles.js';
import { armsOf, familyKey } from '../sim/heraldry.js';
import { op } from '../sim/social.js';
import { byJob, clamp, hourOf, household, hueOf, isAdult, LIVE, P, S, seasonOf, techBuilt, techOn } from '../sim/state.js';
import { crossingEnds } from '../sim/placement.js';
import { valley } from '../sim/valley.js';
import { buildPlace, mat, roofMats } from './archetypes.js';
import { along, buildCanal, buildCrossing, buildRailway, buildTurnpike } from './lines.js';
const LINE_BUILDERS={canal:buildCanal,railway:buildRailway,turnpike:buildTurnpike};
import { armsSVG } from './portraits.js';
import { groundAt, leafMaterials, makeGround, makeTrees } from './terrain.js';
import { $, select } from './ui.js';
import { V } from './vstate.js';

// Light and visibility, shared by the scene and the loop.
export function darkness(h){const [r,s]=LIGHT[seasonOf()];if(h<r-1.5||h>=s+2)return .55;if(h<r+.5)return .55*(r+.5-h)/2;if(h>=s)return .55*(h-s)/2;return 0;}
export function visibleA(a){return (!a.dead&&!(a.arrived&&a.act.type==='sleep'));}

export let G=null, follow=false;
export const cv3=$('map3d');

export function makeLabel(text,o){
  o=Object.assign({size:44,color:'#1d2725',bg:'rgba(244,246,241,0.88)',weight:600,h:.62},o||{});
  const c=document.createElement('canvas'),x=c.getContext('2d'),font=`${o.weight} ${o.size}px "Alegreya Sans", "Gill Sans", sans-serif`;
  x.font=font;const w=Math.ceil(x.measureText(text).width+o.size*.9),hh=Math.ceil(o.size*1.5);c.width=w;c.height=hh;
  if(o.bg){const r=hh/2;x.fillStyle=o.bg;x.beginPath();x.moveTo(r,0);x.lineTo(w-r,0);x.arc(w-r,r,r,-Math.PI/2,Math.PI/2);x.lineTo(r,hh);x.arc(r,r,r,Math.PI/2,Math.PI*1.5);x.fill();}
  x.font=font;x.fillStyle=o.color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,hh/2+1);
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(o.h*w/hh,o.h,1);s.renderOrder=30;return s;
}
export const glyphTex={};
export function glyphMat(c,k){const key=c+k;if(!glyphTex[key]){const col={good:'#3f9a57',bad:'#c8402c',rumour:'#d9971c',muted:'#55605b'}[k]||'#55605b';
  const s=makeLabel(c,{size:64,color:'#fff',bg:col,weight:700,h:.8});glyphTex[key]=s.material;}return glyphTex[key];}

export function init3d(){
  if(G)return true;
  if(typeof THREE==='undefined')return false;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:cv3,antialias:true});}catch(e){return false;}
  if(!renderer.getContext())return false;
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc3d6);scene.fog=new THREE.Fog(0x9fc3d6,60,150);
  const camera=new THREE.PerspectiveCamera(38,1.5,.5,320);
  const hemi=new THREE.HemisphereLight(0xdfeeff,0x4a5a3a,.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1d6,1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-34,right:34,top:28,bottom:-28,near:1,far:160});sun.shadow.bias=-.0006;scene.add(sun);scene.add(sun.target);
  // sky and weather, from their own seeded dice so the simulation's are untouched
  let ts=91;const lr=()=>((ts=(Math.imul(ts,1664525)+1013904223)>>>0)/4294967296);
  const sg=new THREE.BufferGeometry(),sp=[];for(let i=0;i<400;i++){const th=lr()*Math.PI*2,ph=lr()*Math.PI*.45;sp.push(Math.sin(ph)*Math.cos(th)*200,Math.cos(ph)*200,Math.sin(ph)*Math.sin(th)*200);}
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.2,sizeAttenuation:false,transparent:true,opacity:0,fog:false}));scene.add(stars);
  const RN=900,rg=new THREE.BufferGeometry(),rp=new Float32Array(RN*6),rv=[];
  for(let i=0;i<RN;i++)rv.push([(lr()-.5)*60,lr()*16,(lr()-.5)*46]);
  rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xaac4d6,transparent:true,opacity:.55}));rain.visible=false;rain.frustumCulled=false;scene.add(rain);
  const snowG=new THREE.BufferGeometry(),snowP=new Float32Array(RN*3);snowG.setAttribute('position',new THREE.BufferAttribute(snowP,3));
  const snow=new THREE.Points(snowG,new THREE.PointsMaterial({color:0xffffff,size:.18,transparent:true,opacity:.9}));snow.visible=false;snow.frustumCulled=false;scene.add(snow);
  const thG=new THREE.BufferGeometry();thG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(60*6),3));thG.setAttribute('color',new THREE.BufferAttribute(new Float32Array(60*6),3));
  const threads=new THREE.LineSegments(thG,new THREE.LineBasicMaterial({vertexColors:true,depthTest:false,transparent:true,opacity:.85}));threads.renderOrder=25;threads.frustumCulled=false;scene.add(threads);
  const leafM=leafMaterials(),cropMat=new THREE.MeshLambertMaterial({color:SEASON_CROP.colour[0]}),greenMat=new THREE.MeshLambertMaterial({color:0x9cc177});
  G={renderer,scene,camera,sun,hemi,stars,rain,rv,snow,threads,leafM,cropMat,greenMat,trunkM:mat(0x5a4130),agents:{},world:null,
     theta:-.35,phi:.92,radius:46,target:new THREE.Vector3(0,0,0),time:0,ray:new THREE.Raycaster(),seasonSeen:-1};
  bind3dControls();size3d();G.radius=defR();new ResizeObserver(size3d).observe(cv3);
  return true;
}

// --- the world: rebuilt whenever the valley changes (a new village, a loaded save) ----------

function disposeWorld(){
  const W=G.world;if(!W)return;G.fly=null;if(G.marker)G.marker.visible=false;
  G.scene.remove(W.root);
  W.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  for(const c of W.puffs)G.scene.remove(c);
  G.world=null;
}
function buildWorld(){
  disposeWorld();
  const v=valley(S.valley.seed),O={x:v.hearth.x,y:v.hearth.y},root=new THREE.Group();
  const ground=makeGround(v,O);root.add(ground.mesh,ground.water);
  G.scene.add(root);
  G.world={seed:S.valley.seed,v,O,root,ground,places:{},lines:{},trees:null,treeSig:'',puffs:[],footT:-9};
  G.target.set(0,groundAt(v,O.x,O.y),0);G.seasonSeen=-1;
  syncPlaces();
}
function puffsFor(c){
  const arr=[];for(let i=0;i<(c.big?4:3);i++){const s=new THREE.Mesh(new THREE.SphereGeometry(c.big?.45:.22,8,6),new THREE.MeshLambertMaterial({color:c.big?0x5a5a5a:0xd8d8d8,transparent:true,opacity:.6}));s.visible=false;G.scene.add(s);arr.push(s);G.world.puffs.push(s);}
  return arr;
}
function addPlace3d(id){
  const W=G.world,p=P[id],def=BUILDINGS[p.def]||BUILDINGS.cottage;
  const b=buildPlace(p,def,{v:W.v,O:W.O,cropMat:G.cropMat,greenMat:G.greenMat});
  for(const c of b.chimneys){c.id=id;c.puffs=puffsFor(c);}
  let nm=p.name.replace(/^the /,'');if(p.home)nm=nm.replace(/ (Cottage|House|Farmhouse)( \w+)?$/,'');
  const lb=makeLabel(nm,{h:p.home?.7:.85});lb.position.set(p.x+p.w/2-W.O.x,b.top+.7,p.y+p.h/2-W.O.y);b.group.add(lb);b.label=lb;
  b.era=p.era;W.root.add(b.group);W.places[id]=b;
}
function removePlace3d(id){const W=G.world,b=W.places[id];W.root.remove(b.group);b.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  for(const c of b.chimneys)for(const s of c.puffs){G.scene.remove(s);}delete W.places[id];}
/** Brings the scene into line with S.places and S.lines: new buildings go up, lost ones come down. */
function syncPlaces(){
  const W=G.world;
  for(const id in W.places)if(P[id]&&W.places[id].era!==P[id].era)removePlace3d(id); // rebuilt in a newer style
  for(const id in P)if(!W.places[id])addPlace3d(id);
  const ck=S.crossing&&S.crossing.kind;
  if(ck&&(!W.crossing||W.crossing.kind!==ck)){if(W.crossing)W.root.remove(W.crossing.group);W.crossing=buildCrossing(crossingEnds(),ck,W.v,W.O);W.root.add(W.crossing.group);}
  for(const id in W.places)if(!P[id])removePlace3d(id);
  for(const id in (S.lines||{}))if(!W.lines[id]){const L=(LINE_BUILDERS[id]||buildTurnpike)(S.lines[id],W.v,W.O);W.root.add(L.group);W.lines[id]=L;}
  for(const id in W.lines)if(!(S.lines&&S.lines[id])){W.root.remove(W.lines[id].group);delete W.lines[id];}
  const sig=Object.keys(P).join(',')+'|'+Object.keys(W.lines).join(',')+'|'+Object.keys(S.cleared||{}).length+'|'+Object.keys(S.roads||{}).length;
  if(sig!==W.treeSig){
    W.treeSig=sig;if(W.trees)W.root.remove(W.trees);
    const v=W.v,blocked=new Uint8Array(v.W*v.H),mark=(x,y)=>{if(x>=0&&y>=0&&x<v.W&&y<v.H)blocked[y*v.W+x]=1;};
    for(const p of Object.values(P))for(let y=Math.floor(p.y)-1;y<Math.ceil(p.y+p.h)+1;y++)for(let x=Math.floor(p.x)-1;x<Math.ceil(p.x+p.w)+1;x++)mark(x,y);
    for(const ys of Object.values(S.lines||{}))ys.forEach((y,x)=>{for(let d=-1;d<=1;d++)mark(x,y+d);});
    for(const k in (S.foot||{}))if(S.foot[k]>6)blocked[k]=1;
    for(const k in (S.roads||{}))blocked[k]=1;
    for(const k in (S.cleared||{}))blocked[k]=1; // felled woodland stays open ground
    W.trees=makeTrees(v,W.O,blocked,G.leafM,G.trunkM);W.root.add(W.trees);
  }
}

export const bannerTex={};
export function bannerTexture(fam){
  const ar=armsOf(fam),key=fam+':'+ar.aug.join(',');
  if(bannerTex[key])return bannerTex[key];
  const c=document.createElement('canvas');c.width=128;c.height=136;
  const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;bannerTex[key]=tex;
  const img=new Image();img.onload=()=>{try{c.getContext('2d').drawImage(img,0,0,128,136);tex.needsUpdate=true;}catch(e){}};
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(armsSVG(ar,128));
  return tex;
}
export function updateBanners(){
  for(const id in G.world.places){
    const sp=G.world.places[id].homeSpot;if(!sp)continue;
    const folk=household(id).filter(isAdult).sort((x,y)=>y.age-x.age);
    const keeper=id==='tavern'?byJob('innkeeper'):null;
    const fam=id==='tavern'?(keeper?familyKey(keeper):null):(folk[0]?familyKey(folk[0]):null);
    if(!sp.sprite){sp.sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true}));sp.sprite.scale.set(.72,.76,1);sp.sprite.position.set(sp.x,sp.y,sp.z);sp.parent.add(sp.sprite);}
    if(!fam){sp.sprite.visible=false;continue;}
    const tex=bannerTexture(fam);if(sp.sprite.material.map!==tex){sp.sprite.material.map=tex;sp.sprite.material.needsUpdate=true;}
    sp.sprite.visible=true;
  }
}
export function defR(){return 46*Math.pow(Math.max(1,1.5/(G.camera.aspect||1.5)),.85);}
export function size3d(){if(!G)return;const r=cv3.getBoundingClientRect();if(!r.width)return;G.renderer.setSize(r.width,r.height,false);G.camera.aspect=r.width/r.height;G.camera.updateProjectionMatrix();}
export function agentMesh(a){
  let m=G.agents[a.id];if(m)return m;
  const g=new THREE.Group();
  const bodyM=new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(hueOf(a)/360,.55,.48),transparent:true});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.24,.34,.8,10),bodyM);body.position.y=.4;body.castShadow=true;
  const headM=new THREE.MeshLambertMaterial({color:0xf0d0ab,transparent:true});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),headM);head.position.y=1.02;head.castShadow=true;
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(.2,.26,.12,10),bodyM);hat.position.y=1.2;
  body.userData.id=head.userData.id=a.id;
  const fig=new THREE.Group();fig.add(body,head,hat);g.add(fig);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.06,6,24),new THREE.MeshBasicMaterial({color:0xe0a43a,depthTest:false,transparent:true}));ring.rotation.x=Math.PI/2;ring.position.y=.05;ring.renderOrder=26;ring.visible=false;g.add(ring);
  const glyph=new THREE.Sprite(glyphMat('!','bad'));glyph.position.y=1.85;glyph.renderOrder=31;glyph.visible=false;g.add(glyph);
  const tag=makeLabel(a.first,{h:.5,bg:'rgba(29,39,37,0.85)',color:'#fff'});tag.position.y=2.45;tag.visible=false;g.add(tag);
  G.scene.add(g);
  m=G.agents[a.id]={g,fig,body,head,hat,ring,glyph,tag,mat:bodyM,mats:[bodyM,headM],pick:[body,head],hue:hueOf(a)};
  return m;
}
export function lerpC(a,b,t){return (new THREE.Color(a).lerp(new THREE.Color(b),clamp(t,0,1)));}
export function applySeason(s){
  G.seasonSeen=s;
  G.world.ground.colourise(s,S.foot,S.roads);G.world.footT=G.time;
  G.leafM.forEach((m,i)=>m.color.set(SEASON_LEAF[s][i]));
  G.cropMat.color.set(SEASON_CROP.colour[s]);
  G.greenMat.color.set(s===3?0xe8edf0:s===2?0xa9b46c:0x9cc177);
  for(const m of roofMats)m.color.copy(m.userData.base).lerp(new THREE.Color(0xf2f5f7),s===3?.65:0);
  const ch=SEASON_CROP.height[s];
  for(const id in G.world.places)for(const r of G.world.places[id].rows){r.scale.y=ch;r.position.y=r.userData.ground+.25*ch;}
}
export function draw3d(al,dt){
  if(!G)return;
  G.time+=dt;
  if(!G.world||G.world.seed!==S.valley.seed)buildWorld();
  const W=G.world,v=W.v,O=W.O;
  syncPlaces();
  const season=seasonOf();if(season!==G.seasonSeen)applySeason(season);
  if(G.time-W.footT>2){W.footT=G.time;W.ground.colourise(season,S.foot,S.roads);}
  const [rise,set]=LIGHT[season];
  const h=hourOf()+(V.speed?al/6:0),f=(h-rise+.5)/(set-rise+1),day=clamp(Math.sin(Math.PI*f),0,1)*(f>0&&f<1?1:0),storm=S.storm>0;
  const winterDim=season===3?.8:1,T=G.target;
  if(day>0){G.sun.position.set(T.x+Math.cos(Math.PI*f)*-34,T.y+6+Math.sin(Math.PI*f)*(season===3?22:season===1?38:32),T.z+14);G.sun.color.copy(lerpC(0xffa45c,0xfff3dc,day*1.6));G.sun.intensity=(.2+.6*Math.pow(day,.5))*(storm?.45:1)*winterDim;}
  else{G.sun.position.set(T.x-18,T.y+30,T.z-12);G.sun.color.set(0x8fa6dd);G.sun.intensity=.22;}
  G.sun.target.position.copy(T);
  G.hemi.intensity=(.25+.3*day)*(storm?.75:1)*(season===3?1.1:1);
  G.hemi.color.copy(lerpC(0x3a4a78,0xdfeeff,day*1.4));
  let sky=day<.35?lerpC(0x0b1430,0xe29a72,day/.35):lerpC(0xe29a72,season===3?0xb9c6cf:0x9fc3d6,(day-.35)/.3);
  if(storm)sky.lerp(new THREE.Color(0x4c565f),.65);
  if(S.era>=3)sky.lerp(new THREE.Color(0x8b8374),.2);
  G.scene.background.copy(sky);G.scene.fog.color.copy(sky);
  const dk=darkness(h)+(storm?.18:0);
  G.stars.material.opacity=storm?0:clamp((dk-.25)*2.5,0,.9);G.stars.position.copy(T);
  // buildings: lit windows, smoke, the parts that come with ideas, turning wheels
  const awake={};for(const a of LIVE)if(a.arrived&&a.at&&P[a.at]&&P[a.at].indoor&&a.act.type!=='sleep')awake[a.at]=(awake[a.at]||0)+1;
  const spin=dt*(V.speed?.8:0)*(S.spoil>0?.3:1);
  for(const id in W.places){
    const b=W.places[id];
    b.windows.color.set(awake[id]&&dk>.12?0xffc764:awake[id]?0x6a6253:0x2c3238);
    for(const t in b.tech)for(const part of b.tech[t])part.visible=techBuilt(t);
    for(const w of b.wheels)if(w.visible)w.rotation.z-=spin;
    for(const c of b.chimneys){
      const on=(!c.tech||techBuilt(c.tech))&&(c.works?techOn('cottonmill')&&hourOf()>6&&hourOf()<19:(!!awake[id]||(season===3&&id!=='school'&&household(id).length>0)));
      c.puffs.forEach((p,i)=>{p.visible=on&&!storm;if(!p.visible)return;const t=((G.time*.35+i/c.puffs.length)%1);p.position.set(c.x+t*(c.big?1.8:.9),c.y+t*(c.big?3.5:2.2),c.z+t*.3);p.scale.setScalar(.6+t*1.4);p.material.opacity=.55*(1-t);});
    }
  }
  if(G.time-(G.bannerT||-9)>1){G.bannerT=G.time;updateBanners();}
  for(const id in W.lines){
    const L=W.lines[id],back=id==='canal'||L.shuttle,t=(G.time*L.speed)%1,a=along(L.path,back?(t<.5?t*2:2-t*2):t);
    L.mover.position.set(a.x,a.y+(id==='canal'?.02:.12),a.z);L.mover.rotation.y=a.heading+(back&&t>=.5?Math.PI:0);
    if(L.funnel){if(!L.puffs)L.puffs=puffsFor({big:false});const fp=L.funnel.clone().applyMatrix4(L.mover.matrixWorld);
      L.puffs.forEach((p,i)=>{const k=((G.time*1.5+i/3)%1);p.visible=!storm;p.position.set(fp.x,fp.y+k*1.6,fp.z);p.scale.setScalar(.8+k*2);p.material.opacity=.6*(1-k);});}
  }
  // villagers
  const sa=S.agents[V.sel];
  for(const id in G.agents){const a=S.agents[id];if(!a||a.dead){G.agents[id].g.visible=false;}}
  for(const a of LIVE){
    const m=agentMesh(a),vis=visibleA(a);m.g.visible=vis;if(!vis)continue;
    const hu=hueOf(a);if(hu!==m.hue){m.hue=hu;m.mat.color.setHSL(hu/360,.55,.48);}
    const sc=a.age<4?.45:a.age<14?.5+a.age*.035:a.age>70?.94:1;m.fig.scale.setScalar(sc);
    m.glyph.position.y=1.85*sc+.2;m.tag.position.y=2.45*sc+.2;
    const x=a.px+(a.x-a.px)*al,y=a.py+(a.y-a.py)*al;
    const walking=!a.arrived&&V.speed>0;
    let gy=Math.max(groundAt(v,x,y),-.1);const X=W.crossing;
    if(X&&X.kind==='bridge'&&Math.abs(x-O.x-X.x)<1&&y-O.y>X.z0-.6&&y-O.y<X.z1+.6)gy=Math.max(gy,X.deck);
    m.g.position.set(x-O.x,gy+(walking?Math.abs(Math.sin(G.time*11+a.id))*.14:0),y-O.y);
    if(!a.arrived){const dx=a.tx-a.px,dz=a.ty-a.py;if(dx||dz)m.g.rotation.y=Math.atan2(dx,dz);}
    m.g.rotation.z=Math.sin(G.time*2.6+a.id)*.16*a.tipsy;
    m.fig.rotation.x=a.age>70?.18:0;
    const inside=a.arrived&&a.at&&P[a.at]&&P[a.at].indoor;
    for(const mt of m.mats){mt.depthTest=!inside;mt.opacity=inside?.72:1;}
    m.body.renderOrder=m.head.renderOrder=m.hat.renderOrder=inside?15:0;
    m.ring.visible=a.id===V.sel;m.tag.visible=a.id===V.sel;
    if(a.glyph){m.glyph.material=glyphMat(a.glyph.c,a.glyph.k);m.glyph.visible=true;}else m.glyph.visible=false;
  }
  const pos=G.threads.geometry.attributes.position,colA=G.threads.geometry.attributes.color;let n=0;
  if(sa&&!sa.dead&&G.agents[sa.id]&&G.agents[sa.id].g.visible){
    const sp=G.agents[sa.id].g.position;
    for(const b of LIVE){if(b===sa||n>=60)continue;const mb=G.agents[b.id];if(!mb||!mb.g.visible)continue;const o=op(sa,b);if(Math.abs(o)<40)continue;
      const bp=mb.g.position,c=o>0?[.3,.75,.4]:[.9,.3,.22],k=Math.abs(o)/100;
      pos.setXYZ(n*2,sp.x,sp.y+.9,sp.z);pos.setXYZ(n*2+1,bp.x,bp.y+.9,bp.z);colA.setXYZ(n*2,c[0]*k,c[1]*k,c[2]*k);colA.setXYZ(n*2+1,c[0]*k,c[1]*k,c[2]*k);n++;}
  }
  G.threads.geometry.setDrawRange(0,n*2);pos.needsUpdate=colA.needsUpdate=true;
  const snowing=season===3,raining=storm&&!snowing;
  G.rain.visible=raining;G.snow.visible=snowing;G.rain.position.copy(T);G.snow.position.copy(T);
  if(raining){const rp=G.rain.geometry.attributes.position;G.rv.forEach((d,i)=>{d[1]-=dt*16;if(d[1]<0)d[1]+=16;rp.setXYZ(i*2,d[0],d[1],d[2]);rp.setXYZ(i*2+1,d[0]-.08,d[1]-.6,d[2]);});rp.needsUpdate=true;}
  if(snowing){const sp2=G.snow.geometry.attributes.position,rate=storm?3.2:1.1,cnt=storm?G.rv.length:Math.floor(G.rv.length*.4);
    G.rv.forEach((d,i)=>{if(i>=cnt){sp2.setXYZ(i,0,-50,0);return;}d[1]-=dt*rate;if(d[1]<0)d[1]+=16;sp2.setXYZ(i,d[0]+Math.sin(G.time+i)*.3,d[1],d[2]);});sp2.needsUpdate=true;}
  if(follow&&sa&&!sa.dead&&G.agents[sa.id]&&G.agents[sa.id].g.visible){const p=G.agents[sa.id].g.position;T.x+=(p.x-T.x)*.06;T.z+=(p.z-T.z)*.06;}
  if(G.fly){const f=G.fly;f.t=Math.min(1,f.t+dt*1.4);const k=f.t*f.t*(3-2*f.t);T.lerpVectors(f.from,f.to,k);G.radius=f.r0+(f.r1-f.r0)*k;if(f.t>=1)G.fly=null;}
  if(G.marker&&G.marker.visible){const left=G.marker.userData.until-G.time;G.marker.visible=left>0;G.marker.material.opacity=Math.min(1,left)*(.6+.4*Math.sin(G.time*6));}
  T.y+=(groundAt(v,T.x+O.x,T.z+O.y)-T.y)*.1;
  const c=G.camera,sp=Math.sin(G.phi);
  c.position.set(T.x+G.radius*sp*Math.sin(G.theta),T.y+G.radius*Math.cos(G.phi),T.z+G.radius*sp*Math.cos(G.theta));
  c.lookAt(T);
  G.renderer.render(G.scene,c);
}
export function bind3dControls(){
  const pts=new Map();let downAt=0,moved=0,pinch=0,mid=null;
  cv3.addEventListener('pointerdown',e=>{cv3.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button});if(pts.size===1){downAt=performance.now();moved=0;}pinch=0;mid=null;});
  cv3.addEventListener('pointermove',e=>{
    const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
    if(pts.size===1){
      if(p.b===2||e.shiftKey)pan(dx,dy);
      else{G.theta-=dx*.008;G.phi=clamp(G.phi-dy*.006,.08,1.35);}
    }else if(pts.size===2){
      const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(pinch)G.radius=clamp(G.radius*pinch/d,10,110);
      if(mid)pan(m.x-mid.x,m.y-mid.y);
      pinch=d;mid=m;
    }
  });
  const up=e=>{const was=pts.size;pts.delete(e.pointerId);pinch=0;mid=null;
    if(was===1&&moved<7&&performance.now()-downAt<500)pick3d(e);};
  cv3.addEventListener('pointerup',up);cv3.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);});
  cv3.addEventListener('contextmenu',e=>e.preventDefault());
  cv3.addEventListener('wheel',e=>{e.preventDefault();G.radius=clamp(G.radius*Math.exp(e.deltaY*.0012),10,110);},{passive:false});
}
export function pan(dx,dy){if(!G.world)return;const k=G.radius*.0016,ct=Math.cos(G.theta),st=Math.sin(G.theta),{v,O}=G.world;follow=false;syncFollow();
  G.target.x=clamp(G.target.x-dx*k*ct-dy*k*st,-O.x,v.W-O.x);G.target.z=clamp(G.target.z+dx*k*st-dy*k*ct,-O.y,v.H-O.y);}
export function pick3d(e){
  const r=cv3.getBoundingClientRect(),v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  G.ray.setFromCamera(v,G.camera);
  const objs=[];for(const id in G.agents)if(G.agents[id].g.visible)objs.push(...G.agents[id].pick);
  const hit=G.ray.intersectObjects(objs,false)[0];
  if(hit)select(hit.object.userData.id);
  else{
    let best=-1,bd=28;const sv=new THREE.Vector3();
    for(const id in G.agents){const m=G.agents[id];if(!m.g.visible)continue;sv.setFromMatrixPosition(m.head.matrixWorld).project(G.camera);
      const px=(sv.x+1)/2*r.width,py=(1-sv.y)/2*r.height,d=Math.hypot(px-(e.clientX-r.left),py-(e.clientY-r.top));if(d<bd){bd=d;best=+id;}}
    if(best>=0)select(best);
  }
}
export function syncFollow(){$('vFollow').classList.toggle('on',follow);$('vFollow').setAttribute('aria-pressed',follow);}
/** Starts the 3D view. Without WebGL the village still runs; the chronicle and panels carry on. */
export function start3d(){
  if(!init3d()){cv3.parentElement.hidden=true;$('cam3d').hidden=true;$('viewNote').textContent='The view of the village needs WebGL, which this browser is not providing. The village carries on in the chronicle and the panels below.';return false;}
  cv3.hidden=false;$('cam3d').hidden=false;$('viewNote').textContent='Drag to turn. Pinch or scroll to zoom. Two fingers or right-drag to pan.';
  size3d();return true;
}
/** Moves the camera to a place named in the chronicle and marks it for a few seconds. */
export function flyTo(id){
  if(!G||!G.world)return false;
  const W=G.world;let x,y,r=3;
  if(id==='crossing'){const e=crossingEnds();if(!e)return false;x=e.x;y=(e.north.y+e.south.y)/2;}
  else{const p=P[id];if(!p)return false;x=p.x+p.w/2;y=p.y+p.h/2;r=Math.max(p.w,p.h)*.75+.6;}
  follow=false;syncFollow();
  G.fly={from:G.target.clone(),to:new THREE.Vector3(x-W.O.x,groundAt(W.v,x,y),y-W.O.y),t:0,r0:G.radius,r1:Math.min(G.radius,26)};
  if(!G.marker){G.marker=new THREE.Mesh(new THREE.RingGeometry(.86,1,48),new THREE.MeshBasicMaterial({color:0xe0a43a,transparent:true,depthTest:false,side:THREE.DoubleSide}));G.marker.rotation.x=-Math.PI/2;G.marker.renderOrder=27;G.scene.add(G.marker);}
  G.marker.scale.setScalar(r);G.marker.position.set(x-W.O.x,groundAt(W.v,x,y)+.15,y-W.O.y);G.marker.userData.until=G.time+4;G.marker.visible=true;
  return true;
}
const home=()=>{const W=G.world;G.target.set(0,W?groundAt(W.v,W.O.x,W.O.y):0,0);};
$('vReset').onclick=()=>{if(!G)return;Object.assign(G,{theta:-.35,phi:.92,radius:defR()});home();follow=false;syncFollow();};
$('vTop').onclick=()=>{if(!G)return;Object.assign(G,{theta:0,phi:.08,radius:defR()*.9});home();follow=false;syncFollow();};
$('vFollow').onclick=()=>{if(V.sel<0||!S.agents[V.sel]||S.agents[V.sel].dead){$('viewNote').textContent='Pick a villager first, then Follow keeps the camera on them.';return;}follow=!follow;if(follow&&G)G.radius=Math.min(G.radius,24);syncFollow();};
