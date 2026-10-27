// Ported from the v5 prototype by tools/port-v5.mjs.
import { BARN, H, LIGHT, P, W } from '../data/world.js';
import { armsOf, familyKey } from '../sim/heraldry.js';
import { op } from '../sim/social.js';
import { LIVE, S, byJob, clamp, hourOf, household, hueOf, isAdult, placeShown, seasonOf, techBuilt, techOn } from '../sim/state.js';
import { armsSVG } from './portraits.js';
import { $, select } from './ui.js';
import { V } from './vstate.js';

// Light, doors and visibility, shared by the scene and the loop.
export function darkness(h){const [r,s]=LIGHT[seasonOf()];if(h<r-1.5||h>=s+2)return .55;if(h<r+.5)return .55*(r+.5-h)/2;if(h>=s)return .55*(h-s)/2;return 0;}
export function doorOf(p){const cx=p.x+p.w/2;return p.y+p.h<=13?[cx,p.y+p.h]:[cx,p.y];}
export function visibleA(a){return (!a.dead&&!(a.arrived&&a.act.type==='sleep'));}

export let G=null, follow=false;
export const cv3=$('map3d');
export function tw(x){return (x-W/2);}
export function tz(y){return (y-H/2);}
export function prism(w,d,h){
  const x=w/2,z=d/2,g=new THREE.BufferGeometry();
  const v=[-x,0,-z,-x,0,z,-x,h,0, x,0,z,x,0,-z,x,h,0, -x,0,z,x,0,z,x,h,0, -x,0,z,x,h,0,-x,h,0, x,0,-z,-x,0,-z,-x,h,0, x,0,-z,-x,h,0,x,h,0];
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;
}
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
export const SEASON_COL={ground:[0x7aa258,0x6f9a4c,0x93984e,0xdfe5e8],leaf:[[0x5d9a4a,0x6aa54f,0xd9a7b8],[0x3f6e3a,0x4f7d3c,0x5d8a45],[0xb8652a,0xd39b3a,0x8f7a35],[0x3d5544,0x4a5d4a,0x56665a]],
  crop:[0x7fae4c,0x6f9d3c,0xd2b450,0x8a7350],cropH:[.25,.8,1.05,.12]};
export function init3d(){
  if(G)return true;
  if(typeof THREE==='undefined')return false;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:cv3,antialias:true});}catch(e){return false;}
  if(!renderer.getContext())return false;
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc3d6);scene.fog=new THREE.Fog(0x9fc3d6,50,125);
  const camera=new THREE.PerspectiveCamera(38,1.5,.5,260);
  const hemi=new THREE.HemisphereLight(0xdfeeff,0x4a5a3a,.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1d6,1);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-28,right:28,top:22,bottom:-22,near:1,far:120});sun.shadow.bias=-.0006;scene.add(sun);scene.add(sun.target);
  const lam=c=>new THREE.MeshLambertMaterial({color:c});
  const roofMats=[];const roofLam=c=>{const m=lam(c);m.userData.base=new THREE.Color(c);roofMats.push(m);return m;};
  const add=(m,cast,recv,parent)=>{if(cast)m.castShadow=true;if(recv!==false)m.receiveShadow=true;(parent||scene).add(m);return m;};
  const groundMat=lam(SEASON_COL.ground[0]);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(W+160,H+160),groundMat);ground.rotation.x=-Math.PI/2;add(ground);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(W+160,2.3),new THREE.MeshPhongMaterial({color:0x4d84a0,shininess:90,specular:0xaaccdd}));
  water.rotation.x=-Math.PI/2;water.position.set(0,.035,tz(24.9));add(water);
  const bank=lam(0x6f8f4f);for(const y of [23.65,26.15]){const b=new THREE.Mesh(new THREE.BoxGeometry(W+160,.12,.3),bank);b.position.set(0,.06,tz(y));add(b);}
  const laneMat=lam(0xcdb991);
  const lane=(x1,y1,x2,y2,parent)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2-x1)+.8,.04,Math.abs(y2-y1)+.8),laneMat);m.position.set(tw((x1+x2)/2),.02,tz((y1+y2)/2));add(m,false,true,parent);};
  lane(-60,13,16,13);
  const win={},chimneys=[],labels={},rows=[],groups={},homeSpots={};let boat=null,train=null,trainPuffs=[];let wheel=null,wheel2=null;
  const groupFor=id=>{const p=P[id];if(!p.tech&&!p.plot)return scene;const g=new THREE.Group();scene.add(g);groups[id]=g;return g;};
  const building=(id,p,parent)=>{
    const cx=tw(p.x+p.w/2),cz=tz(p.y+p.h/2),bw=p.w-.5,bd=p.h-.5;
    const wh={tavern:2.1,mill:2.2,hall:2,chapel:2.5,weaving:1.8,cottonmill:4.2,school:1.9}[id]||1.5;
    const wallC=p.home?0xe8dcc2:{forge:0x8f877b,mill:0xd6cbb0,chapel:0xcfcabf,tavern:0xe2d2b0,hall:0xc9bba0,cottonmill:0xa4553e,school:0xd9cdb0}[id]||0xddd1b8;
    add(new THREE.Mesh(new THREE.BoxGeometry(bw,wh,bd),lam(wallC)),true,true,parent).position.set(cx,wh/2,cz);
    const along=bw>=bd,rh=Math.min(bw,bd)*(id==='cottonmill'?.3:.48);
    const roof=new THREE.Mesh(prism((along?bw:bd)+.35,(along?bd:bw)+.35,rh),roofLam(id==='chapel'||id==='cottonmill'?0x56616b:p.home?0x7c4b36:id==='forge'?0x4f4a45:0x6a4535));
    roof.position.set(cx,wh,cz);if(!along)roof.rotation.y=Math.PI/2;add(roof,true,true,parent);
    const front=p.y+p.h<=13?1:-1,fz=cz+front*(bd/2+.02);
    if(p.home||id==='tavern')homeSpots[id]={x:cx+(id==='tavern'?-bw*.18:bw*.22),y:Math.min(wh*.8,1.35),z:fz+front*.14,parent};
    const door=new THREE.Mesh(new THREE.PlaneGeometry(.55,.95),lam(0x4a3326));door.position.set(cx,.48,fz);if(front<0)door.rotation.y=Math.PI;parent.add(door);
    const wm=new THREE.MeshBasicMaterial({color:0x2c3238});win[id]=wm;
    const floors=id==='cottonmill'?3:1;
    for(let f=0;f<floors;f++)for(const dx of (id==='cottonmill'?[-.38,-.13,.13,.38]:[-.32,.32])){const w=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),wm);w.position.set(cx+dx*bw,floors>1?1+f*1.2:wh*.58,fz);if(front<0)w.rotation.y=Math.PI;parent.add(w);}
    if(p.home||['bakery','forge','tavern','school'].includes(id)||id==='cottonmill'){
      const tall=id==='cottonmill';
      const ch=new THREE.Mesh(new THREE.BoxGeometry(tall?.7:.38,tall?5:.9,tall?.7:.38),lam(tall?0x7a3a2a:0x7d6a5c));
      const chx=tall?cx+bw/2+.6:cx+(along?bw*.3:0),chz=tall?cz:cz+(along?0:bd*.3),chy=tall?2.5:wh+rh*.65;
      ch.position.set(chx,chy,chz);add(ch,true,true,parent);
      const puffs=[];for(let i=0;i<3;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(tall?.4:.22,8,6),new THREE.MeshLambertMaterial({color:tall?0x9a9a9a:0xd8d8d8,transparent:true,opacity:.6}));s.visible=false;scene.add(s);puffs.push(s);}
      chimneys.push({id,x:chx,y:chy+(tall?2.5:.45),z:chz,puffs,big:tall});
    }
    if(id==='chapel'){const sp=new THREE.Mesh(new THREE.ConeGeometry(.55,2.2,4),roofLam(0x56616b));sp.position.set(cx,wh+rh+.9,cz-bd*.25);sp.rotation.y=Math.PI/4;add(sp,true,true,parent);}
    if(id==='mill'){
      const mk=()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.TorusGeometry(1.1,.12,6,18),lam(0x5d4532)));
        for(let i=0;i<8;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.14,2.2,.3),lam(0x6b4f39));sp.rotation.z=i*Math.PI/8;g.add(sp);}
        g.rotation.y=Math.PI/2;g.traverse(m=>m.castShadow=true);return g;};
      wheel=mk();wheel.position.set(cx+bw/2+.35,1.05,cz+bd*.15);scene.add(wheel);
      wheel2=mk();wheel2.position.set(cx+bw/2+.35,1.05,cz-bd*.35);wheel2.visible=false;scene.add(wheel2);
    }
    if(id==='tavern'){const post=new THREE.Mesh(new THREE.BoxGeometry(.12,1.6,.12),lam(0x4a3326));post.position.set(cx+bw/2+.3,.8,fz+.3*front);add(post,true,true,parent);
      const sign=new THREE.Mesh(new THREE.BoxGeometry(.06,.5,.7),lam(0xb07b2c));sign.position.set(cx+bw/2+.3,1.35,fz+.3*front);add(sign,true,true,parent);}
    if(id==='school'){const bell=new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.5),roofLam(0x6a4535));bell.position.set(cx,wh+rh+.2,cz);add(bell,true,true,parent);}
    return wh+rh+(id==='chapel'?1.9:0);
  };
  for(const id in P){
    const p=P[id],cx=tw(p.x+p.w/2),cz=tz(p.y+p.h/2),parent=groupFor(id);
    if(id!=='square'){const d=doorOf(p);lane(d[0],d[1],d[0],13,parent);lane(d[0],13,clamp(d[0],16,24),13,parent);}
    let top=.4;
    if(p.indoor)top=building(id,p,parent);
    else if(id==='fields'){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),lam(0x9c8248));pl.rotation.x=-Math.PI/2;pl.position.set(cx,.03,cz);add(pl);
      const cm=lam(SEASON_COL.crop[0]);for(let y=p.y+.5;y<p.y+p.h-.2;y+=.75){const r=new THREE.Mesh(new THREE.BoxGeometry(p.w-.6,.5,.32),cm);r.position.set(cx,0,tz(y));add(r,true);rows.push(r);}
      G_cropMat=cm;
    }else if(id==='square'){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),lam(0x9cc177));pl.rotation.x=-Math.PI/2;pl.position.set(cx,.03,cz);add(pl);G_greenMat=pl.material;
      const well=new THREE.Mesh(new THREE.CylinderGeometry(.6,.65,.6,12),lam(0x9a958a));well.position.set(cx,.3,cz);add(well,true);
      const wr=new THREE.Mesh(prism(1.6,1.4,.5),roofLam(0x6a4535));wr.position.set(cx,1.35,cz);add(wr,true);
      for(const dx of [-.6,.6]){const pst=new THREE.Mesh(new THREE.BoxGeometry(.1,1.1,.1),lam(0x4a3326));pst.position.set(cx+dx,.85,cz);add(pst,true);}
      top=1.9;
    }else if(id==='garden'){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),lam(0x6f9550));pl.rotation.x=-Math.PI/2;pl.position.set(cx,.03,cz);add(pl);
      let k=0;for(let x=p.x+.6;x<p.x+p.w-.3;x+=.8)for(let y=p.y+.6;y<p.y+p.h-.3;y+=.8){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),lam([0x4e8a45,0x8c6bb1,0x5f9a4a,0xc9a33b][k++%4]));b.position.set(tw(x),.25,tz(y));add(b,true);}
    }else if(id==='wharf'){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),lam(0x9e9584));pl.rotation.x=-Math.PI/2;pl.position.set(cx,.04,cz);add(pl,false,true,parent);
      for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.6),lam(i%2?0x7a5a40:0x6b4c34));c.position.set(cx-1.2+i*.75,.3+(i===2?.6:0),cz+.2);add(c,true,true,parent);}
      const post=new THREE.Mesh(new THREE.BoxGeometry(.18,2.4,.18),lam(0x4a3326));post.position.set(cx+1.5,1.2,cz-.5);add(post,true,true,parent);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(1.8,.14,.14),lam(0x4a3326));arm.position.set(cx+1,2.3,cz-.5);add(arm,true,true,parent);
      top=2.6;
    }else{
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),lam(0xb8ab90));pl.rotation.x=-Math.PI/2;pl.position.set(cx,.03,cz);add(pl);
      const st=new THREE.Mesh(new THREE.BoxGeometry(.25,2,.25),lam(0x8d877c));st.position.set(cx,1,cz);add(st,true);
      const ar=new THREE.Mesh(new THREE.BoxGeometry(1,.22,.25),lam(0x8d877c));ar.position.set(cx,1.5,cz);add(ar,true);
      for(const dx of [-1.8,1.8]){const stall=new THREE.Mesh(prism(1.4,1,.5),roofLam(dx<0?0xb2503a:0x3f6f8a));stall.position.set(cx+dx,1.1,cz+.2);add(stall,true);
        const tb=new THREE.Mesh(new THREE.BoxGeometry(1.2,.7,.8),lam(0x7a5a40));tb.position.set(cx+dx,.35,cz+.2);add(tb,true);}
      top=2.2;
    }
    let nm=p.name.replace(/^the /,'');if(p.home)nm=nm.split(' ')[0];
    const lb=makeLabel(nm,{h:p.home?.7:.85});lb.position.set(cx,top+.7,cz);(parent===scene?scene:parent).add(lb);labels[id]=lb;
  }
  // works that appear when built
  const techG={};
  const tg=id=>{const g=new THREE.Group();g.visible=false;scene.add(g);techG[id]=g;return g;};
  {const g=tg('barn'),cx=tw(BARN.x+BARN.w/2),cz=tz(BARN.y+BARN.h/2);
    add(new THREE.Mesh(new THREE.BoxGeometry(BARN.w-.3,2.2,BARN.h-.3),lam(0x8a5a3c)),true,true,g).position.set(cx,1.1,cz);
    const r=new THREE.Mesh(prism(BARN.h,BARN.w,1.5),roofLam(0x5b3a28));r.rotation.y=Math.PI/2;r.position.set(cx,2.2,cz);add(r,true,true,g);
    const d=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.6),lam(0x4a3326));d.position.set(cx-(BARN.w-.3)/2-.02,.8,cz);d.rotation.y=-Math.PI/2;g.add(d);}
  {const g=tg('plough'),p=P.fields,cx=tw(p.x+1.2),cz=tz(p.y-.6);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.6,.15,.15),lam(0x6b4f39)),true,true,g).position.set(cx,.5,cz);
    const sh=new THREE.Mesh(new THREE.ConeGeometry(.25,.6,4),lam(0x6a6a70));sh.rotation.z=Math.PI/2;sh.position.set(cx+.9,.3,cz);add(sh,true,true,g);
    for(const dz of [-.25,.25]){const h=new THREE.Mesh(new THREE.BoxGeometry(.7,.08,.08),lam(0x6b4f39));h.position.set(cx-1,.75,cz+dz);h.rotation.z=-.5;add(h,true,true,g);}}
  {const g=tg('shuttle'),p=P.weaving,cx=tw(p.x+p.w+.6),cz=tz(p.y+p.h/2);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.3,1.4,2.6),lam(0xd9cdb5)),true,true,g).position.set(cx,.7,cz);
    const r=new THREE.Mesh(prism(2.8,1.5,.6),roofLam(0x6a4535));r.rotation.y=Math.PI/2;r.position.set(cx,1.4,cz);add(r,true,true,g);}
  {const g=tg('canal'),zc=tz(.2);
    const w=new THREE.Mesh(new THREE.PlaneGeometry(W+160,1.4),new THREE.MeshPhongMaterial({color:0x3f6f7e,shininess:80,specular:0x99bbcc}));w.rotation.x=-Math.PI/2;w.position.set(0,.045,zc);g.add(w);
    for(const dz of [-.75,.75]){const b=new THREE.Mesh(new THREE.BoxGeometry(W+160,.25,.18),lam(0x8d8578));b.position.set(0,.12,zc+dz);add(b,false,true,g);}
    for(const x of [tw(30),tw(31)]){const gate=new THREE.Mesh(new THREE.BoxGeometry(.15,.5,1.4),lam(0x5b4330));gate.position.set(x,.2,zc);add(gate,true,true,g);}
    boat=new THREE.Group();const hull=new THREE.Mesh(new THREE.BoxGeometry(3.4,.35,.7),lam(0x2f4a3a));hull.position.y=.18;boat.add(hull);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.2,.5,.6),lam(0x9a3b2a));cab.position.set(-1,.55,0);boat.add(cab);
    const load=new THREE.Mesh(new THREE.BoxGeometry(1.8,.25,.55),lam(0x2a2622));load.position.set(.6,.42,0);boat.add(load);
    boat.position.set(0,0,zc);boat.traverse(m=>m.castShadow=true);g.add(boat);}
  {const g=tg('railway'),zr=tz(-2.6);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(W+160,.18,1.8),lam(0x7a6e60));bed.position.set(0,.09,zr);add(bed,false,true,g);
    for(const dz of [-.36,.36]){const r=new THREE.Mesh(new THREE.BoxGeometry(W+160,.08,.08),lam(0x55555c));r.position.set(0,.24,zr+dz);g.add(r);}
    const slM=lam(0x4a3a2c);for(let x=-W/2-30;x<W/2+30;x+=1.1){const s=new THREE.Mesh(new THREE.BoxGeometry(.25,.06,1.2),slM);s.position.set(x,.2,zr);g.add(s);}
    const st=new THREE.Mesh(new THREE.BoxGeometry(4,1.8,1.6),lam(0xb7a789));st.position.set(tw(14.8),.9,zr-2);add(st,true,true,g);
    const sr=new THREE.Mesh(prism(4.4,2,.7),roofLam(0x56616b));sr.position.set(tw(14.8),1.8,zr-2);add(sr,true,true,g);
    const plat=new THREE.Mesh(new THREE.BoxGeometry(7,.35,.8),lam(0x9a958a));plat.position.set(tw(14.8),.18,zr-1.1);add(plat,false,true,g);
    train=new THREE.Group();
    const boiler=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,2.2,12),lam(0x2b4a33));boiler.rotation.z=Math.PI/2;boiler.position.y=.75;train.add(boiler);
    const cabE=new THREE.Mesh(new THREE.BoxGeometry(.9,1,.9),lam(0x2b4a33));cabE.position.set(-1.3,.85,0);train.add(cabE);
    const funnel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.6,8),lam(0x1d1d1d));funnel.position.set(.8,1.3,0);train.add(funnel);
    const base=new THREE.Mesh(new THREE.BoxGeometry(3,.25,.9),lam(0x1d1d1d));base.position.y=.38;train.add(base);
    for(let i=1;i<=3;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(2.6,.9,.95),lam(i%2?0x7a2c24:0x6a2620));c.position.set(-i*3,.75,0);train.add(c);}
    train.traverse(m=>m.castShadow=true);train.position.set(0,0,zr);g.add(train);
    for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshLambertMaterial({color:0xe8e8e8,transparent:true,opacity:.6}));g.add(s);trainPuffs.push(s);}}
  {const g=tg('steam'),p=P.cottonmill,x=tw(p.x-.4),z=tz(p.y+1);
    const ch=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,7,10),lam(0x6e3326));ch.position.set(x,3.5,z);add(ch,true,true,g);
    const eh=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.6,1.6),lam(0x8a4a36));eh.position.set(x+.1,.8,z+1.3);add(eh,true,true,g);
    const puffs=[];for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.45,8,6),new THREE.MeshLambertMaterial({color:0x5a5a5a,transparent:true,opacity:.6}));s.visible=false;scene.add(s);puffs.push(s);}
    chimneys.push({id:'cottonmill',x,y:7,z,puffs,big:true,tech:'steam'});}
  // trees from their own seed, so the simulation's dice are untouched
  let ts=91;const lr=()=>((ts=(Math.imul(ts,1664525)+1013904223)>>>0)/4294967296);
  const trunkM=lam(0x5a4130),leafM=[lam(0x3f6e3a),lam(0x4f7d3c),lam(0x5d8a45)];
  const free=(x,y)=>{if(y>23.2&&y<26.8)return false;if(y<1.4&&y>-6)return false;if(Math.abs(y-13)<1.3&&x<25)return false;
    if(x>BARN.x-1&&x<BARN.x+BARN.w+1&&y>BARN.y-1&&y<BARN.y+BARN.h+1)return false;if(x>P.fields.x-1&&x<P.fields.x+3&&y>P.fields.y-1.6&&y<P.fields.y)return false;
    if(x>P.weaving.x+P.weaving.w-.5&&x<P.weaving.x+P.weaving.w+2&&y>P.weaving.y-1&&y<P.weaving.y+P.weaving.h+1)return false;
    for(const id in P){const p=P[id];if(x>p.x-1.2&&x<p.x+p.w+1.2&&y>p.y-1.4&&y<p.y+p.h+1.2)return false;const d=doorOf(p);if(Math.abs(x-d[0])<1&&((y-d[1])*(13-y)>=0))return false;}return true;};
  let placed=0;for(let i=0;i<600&&placed<70;i++){const x=-9+lr()*(W+18),y=-7+lr()*(H+14);if(!free(x,y))continue;placed++;
    const s=.7+lr()*.6,tr=new THREE.Mesh(new THREE.CylinderGeometry(.12*s,.16*s,.8*s,6),trunkM);tr.position.set(tw(x),.4*s,tz(y));add(tr,true);
    const lf=new THREE.Mesh(lr()<.5?new THREE.ConeGeometry(.75*s,1.9*s,7):new THREE.IcosahedronGeometry(.85*s,0),leafM[Math.floor(lr()*3)]);lf.position.set(tw(x),(.8+.85)*s,tz(y));add(lf,true);}
  const sg=new THREE.BufferGeometry(),sp=[];for(let i=0;i<400;i++){const th=lr()*Math.PI*2,ph=lr()*Math.PI*.45;sp.push(Math.sin(ph)*Math.cos(th)*150,Math.cos(ph)*150,Math.sin(ph)*Math.sin(th)*150);}
  sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.2,sizeAttenuation:false,transparent:true,opacity:0,fog:false}));scene.add(stars);
  const RN=700,rg=new THREE.BufferGeometry(),rp=new Float32Array(RN*6),rv=[];
  for(let i=0;i<RN;i++){const x=(lr()-.5)*(W+10),y=lr()*14,z=(lr()-.5)*(H+10);rv.push([x,y,z]);}
  rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const rain=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0xaac4d6,transparent:true,opacity:.55}));rain.visible=false;rain.frustumCulled=false;scene.add(rain);
  const snowG=new THREE.BufferGeometry(),snowP=new Float32Array(RN*3);snowG.setAttribute('position',new THREE.BufferAttribute(snowP,3));
  const snow=new THREE.Points(snowG,new THREE.PointsMaterial({color:0xffffff,size:.18,transparent:true,opacity:.9}));snow.visible=false;snow.frustumCulled=false;scene.add(snow);
  const thG=new THREE.BufferGeometry();thG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(60*6),3));thG.setAttribute('color',new THREE.BufferAttribute(new Float32Array(60*6),3));
  const threads=new THREE.LineSegments(thG,new THREE.LineBasicMaterial({vertexColors:true,depthTest:false,transparent:true,opacity:.85}));threads.renderOrder=25;threads.frustumCulled=false;scene.add(threads);
  G={renderer,scene,camera,sun,hemi,water,win,chimneys,labels,rows,wheel,wheel2,stars,rain,rv,snow,threads,agents:{},groups,techG,homeSpots,boat,train,trainPuffs,groundMat,leafM,roofMats,cropMat:G_cropMat,greenMat:G_greenMat,
     theta:-.35,phi:.92,radius:46,target:new THREE.Vector3(0,0,1.5),time:0,ray:new THREE.Raycaster(),seasonSeen:-1};
  bind3dControls();size3d();G.radius=defR();new ResizeObserver(size3d).observe(cv3);
  return true;
}
export let G_cropMat=null, G_greenMat=null;
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
  for(const id in G.homeSpots){
    const sp=G.homeSpots[id],folk=household(id).filter(isAdult).sort((x,y)=>y.age-x.age);
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
  const mat=new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(hueOf(a)/360,.55,.48),transparent:true});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.24,.34,.8,10),mat);body.position.y=.4;body.castShadow=true;
  const headM=new THREE.MeshLambertMaterial({color:0xf0d0ab,transparent:true});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),headM);head.position.y=1.02;head.castShadow=true;
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(.2,.26,.12,10),mat);hat.position.y=1.2;
  body.userData.id=head.userData.id=a.id;
  const fig=new THREE.Group();fig.add(body,head,hat);g.add(fig);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.06,6,24),new THREE.MeshBasicMaterial({color:0xe0a43a,depthTest:false,transparent:true}));ring.rotation.x=Math.PI/2;ring.position.y=.05;ring.renderOrder=26;ring.visible=false;g.add(ring);
  const glyph=new THREE.Sprite(glyphMat('!','bad'));glyph.position.y=1.85;glyph.renderOrder=31;glyph.visible=false;g.add(glyph);
  const tag=makeLabel(a.first,{h:.5,bg:'rgba(29,39,37,0.85)',color:'#fff'});tag.position.y=2.45;tag.visible=false;g.add(tag);
  G.scene.add(g);
  m=G.agents[a.id]={g,fig,body,head,hat,ring,glyph,tag,mat,mats:[mat,headM],pick:[body,head],hue:hueOf(a)};
  return m;
}
export function lerpC(a,b,t){return (new THREE.Color(a).lerp(new THREE.Color(b),clamp(t,0,1)));}
export function applySeason(s){
  G.seasonSeen=s;
  G.groundMat.color.set(SEASON_COL.ground[s]);
  G.leafM.forEach((m,i)=>m.color.set(SEASON_COL.leaf[s][i]));
  if(G.cropMat)G.cropMat.color.set(SEASON_COL.crop[s]);
  if(G.greenMat)G.greenMat.color.set(s===3?0xe8edf0:s===2?0xa9b46c:0x9cc177);
  for(const m of G.roofMats)m.color.copy(m.userData.base).lerp(new THREE.Color(0xf2f5f7),s===3?.65:0);
  const ch=SEASON_COL.cropH[s];for(const r of G.rows){r.scale.y=ch;r.position.y=.25*ch;}
}
export function draw3d(al,dt){
  if(!G)return;
  G.time+=dt;
  const season=seasonOf();if(season!==G.seasonSeen)applySeason(season);
  const [rise,set]=LIGHT[season];
  const h=hourOf()+(V.speed?al/6:0),f=(h-rise+.5)/(set-rise+1),day=clamp(Math.sin(Math.PI*f),0,1)*(f>0&&f<1?1:0),storm=S.storm>0;
  const winterDim=season===3?.8:1;
  if(day>0){G.sun.position.set(Math.cos(Math.PI*f)*-34,6+Math.sin(Math.PI*f)*(season===3?22:season===1?38:32),14);G.sun.color.copy(lerpC(0xffa45c,0xfff3dc,day*1.6));G.sun.intensity=(.2+.6*Math.pow(day,.5))*(storm?.45:1)*winterDim;}
  else{G.sun.position.set(-18,30,-12);G.sun.color.set(0x8fa6dd);G.sun.intensity=.22;}
  G.hemi.intensity=(.25+.3*day)*(storm?.75:1)*(season===3?1.1:1);
  G.hemi.color.copy(lerpC(0x3a4a78,0xdfeeff,day*1.4));
  let sky=day<.35?lerpC(0x0b1430,0xe29a72,day/.35):lerpC(0xe29a72,season===3?0xb9c6cf:0x9fc3d6,(day-.35)/.3);
  if(storm)sky.lerp(new THREE.Color(0x4c565f),.65);
  if(S.era>=3)sky.lerp(new THREE.Color(0x8b8374),.2);
  G.scene.background.copy(sky);G.scene.fog.color.copy(sky);
  const dk=darkness(h)+(storm?.18:0);
  G.stars.material.opacity=storm?0:clamp((dk-.25)*2.5,0,.9);
  // works and new cottages
  for(const id in G.groups)G.groups[id].visible=placeShown(id);
  for(const id in G.techG)G.techG[id].visible=techBuilt(id);
  if(G.wheel2)G.wheel2.visible=techBuilt('millstone');
  const awake={};for(const a of LIVE)if(a.arrived&&a.at&&P[a.at].indoor&&a.act.type!=='sleep')awake[a.at]=(awake[a.at]||0)+1;
  for(const id in G.win)G.win[id].color.set(awake[id]&&dk>.12?0xffc764:awake[id]?0x6a6253:0x2c3238);
  for(const c of G.chimneys){
    const shown=placeShown(c.id)&&(!c.tech||techBuilt(c.tech)),on=shown&&(!!awake[c.id]||(c.big&&techOn('cottonmill')&&hourOf()>6&&hourOf()<19)||(season===3&&c.id!=='school'&&household(c.id).length>0));
    c.puffs.forEach((p,i)=>{p.visible=on&&!storm;if(!p.visible)return;const t=((G.time*.35+i/3)%1);p.position.set(c.x+t*(c.big?1.8:.9),c.y+t*(c.big?3.5:2.2),c.z+t*.3);p.scale.setScalar(.6+t*1.4);p.material.opacity=.55*(1-t);});
  }
  if(G.time-(G.bannerT||-9)>1){G.bannerT=G.time;updateBanners();}
  if(G.boat&&G.techG.canal.visible)G.boat.position.x=((G.time*1.1)%(W+60))-(W/2+30);
  if(G.train&&G.techG.railway.visible){const t=(G.time%60)/60;G.train.position.x=-W/2-45+t*(W+90);
    G.trainPuffs.forEach((p,i)=>{const k=((G.time*1.5+i/4)%1);p.position.set(G.train.position.x+.8-k*2.5,1.6+k*1.6,G.train.position.z);p.scale.setScalar(.6+k*1.5);p.material.opacity=.6*(1-k);});}
  const spin=dt*(V.speed?.8:0)*(S.spoil>0?.3:1);if(G.wheel)G.wheel.rotation.x+=spin;if(G.wheel2)G.wheel2.rotation.x+=spin;
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
    m.g.position.set(tw(x),walking?Math.abs(Math.sin(G.time*11+a.id))*.14:0,tz(y));
    if(!a.arrived){const dx=a.tx-a.px,dz=a.ty-a.py;if(dx||dz)m.g.rotation.y=Math.atan2(dx,dz);}
    m.g.rotation.z=Math.sin(G.time*2.6+a.id)*.16*a.tipsy;
    m.fig.rotation.x=a.age>70?.18:0;
    const inside=a.arrived&&a.at&&P[a.at].indoor;
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
      pos.setXYZ(n*2,sp.x,.9,sp.z);pos.setXYZ(n*2+1,bp.x,.9,bp.z);colA.setXYZ(n*2,c[0]*k,c[1]*k,c[2]*k);colA.setXYZ(n*2+1,c[0]*k,c[1]*k,c[2]*k);n++;}
  }
  G.threads.geometry.setDrawRange(0,n*2);pos.needsUpdate=colA.needsUpdate=true;
  const snowing=season===3,raining=storm&&!snowing;
  G.rain.visible=raining;G.snow.visible=snowing;
  if(raining){const rp=G.rain.geometry.attributes.position;G.rv.forEach((d,i)=>{d[1]-=dt*16;if(d[1]<0)d[1]+=14;rp.setXYZ(i*2,d[0],d[1],d[2]);rp.setXYZ(i*2+1,d[0]-.08,d[1]-.6,d[2]);});rp.needsUpdate=true;}
  if(snowing){const sp2=G.snow.geometry.attributes.position,rate=storm?3.2:1.1,cnt=storm?G.rv.length:Math.floor(G.rv.length*.4);
    G.rv.forEach((d,i)=>{if(i>=cnt){sp2.setXYZ(i,0,-50,0);return;}d[1]-=dt*rate;if(d[1]<0)d[1]+=14;sp2.setXYZ(i,d[0]+Math.sin(G.time+i)*.3,d[1],d[2]);});sp2.needsUpdate=true;}
  if(follow&&sa&&!sa.dead&&G.agents[sa.id]&&G.agents[sa.id].g.visible){const p=G.agents[sa.id].g.position;G.target.x+=(p.x-G.target.x)*.06;G.target.z+=(p.z-G.target.z)*.06;}
  const c=G.camera,sp=Math.sin(G.phi);
  c.position.set(G.target.x+G.radius*sp*Math.sin(G.theta),G.radius*Math.cos(G.phi),G.target.z+G.radius*sp*Math.cos(G.theta));
  c.lookAt(G.target);
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
      if(pinch)G.radius=clamp(G.radius*pinch/d,10,85);
      if(mid)pan(m.x-mid.x,m.y-mid.y);
      pinch=d;mid=m;
    }
  });
  const up=e=>{const was=pts.size;pts.delete(e.pointerId);pinch=0;mid=null;
    if(was===1&&moved<7&&performance.now()-downAt<500)pick3d(e);};
  cv3.addEventListener('pointerup',up);cv3.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);});
  cv3.addEventListener('contextmenu',e=>e.preventDefault());
  cv3.addEventListener('wheel',e=>{e.preventDefault();G.radius=clamp(G.radius*Math.exp(e.deltaY*.0012),10,85);},{passive:false});
}
export function pan(dx,dy){const k=G.radius*.0016,ct=Math.cos(G.theta),st=Math.sin(G.theta);follow=false;syncFollow();
  G.target.x=clamp(G.target.x-dx*k*ct-dy*k*st,-W/2,W/2);G.target.z=clamp(G.target.z+dx*k*st-dy*k*ct,-H/2,H/2);}
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
$('vReset').onclick=()=>{if(!G)return;Object.assign(G,{theta:-.35,phi:.92,radius:defR()});G.target.set(0,0,1.5);follow=false;syncFollow();};
$('vTop').onclick=()=>{if(!G)return;Object.assign(G,{theta:0,phi:.08,radius:defR()*.9});G.target.set(0,0,0);follow=false;syncFollow();};
$('vFollow').onclick=()=>{if(V.sel<0||!S.agents[V.sel]||S.agents[V.sel].dead){$('viewNote').textContent='Pick a villager first, then Follow keeps the camera on them.';return;}follow=!follow;if(follow&&G)G.radius=Math.min(G.radius,24);syncFollow();};
