// Ported from the v5 prototype by tools/port-v5.mjs.
import { BARN, H, LIGHT, P, W } from '../data/world.js';
import { op } from '../sim/social.js';
import { LIVE, S, clamp, hourOf, hueOf, placeShown, seasonOf, techBuilt } from '../sim/state.js';
import { select } from './ui.js';
import { V } from './vstate.js';

export const cv=document.getElementById('map');
export let cw=0, ch=0, dpr=1, C={}, colorStamp=0;
export function readColors(){
  const cs=getComputedStyle(document.documentElement);
  for(const k of ['grass','grass2','path','roof','roofhome','field','water','night','mapink','lamp','good','bad','accent','muted','bg','panel','ink'])C[k]=cs.getPropertyValue('--'+k).trim();
  C.L=cs.getPropertyValue('--agentL').trim()||'40%';C.dark=parseInt(C.L)>50;
}
export function resize(){const r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;cw=r.width;ch=r.width*H/W;cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
new ResizeObserver(resize).observe(cv);
export function darkness(h){const [r,s]=LIGHT[seasonOf()];if(h<r-1.5||h>=s+2)return .55;if(h<r+.5)return .55*(r+.5-h)/2;if(h>=s)return .55*(h-s)/2;return 0;}
export function doorOf(p){const cx=p.x+p.w/2;return p.y+p.h<=13?[cx,p.y+p.h]:[cx,p.y];}
export function agentColor(a){return `hsl(${hueOf(a)} 58% ${C.L})`;}
export function visibleA(a){return (!a.dead&&!(a.arrived&&a.act.type==='sleep'));}
export function draw(al){
  if(!cw)resize();if(!cw)return;
  if(performance.now()-colorStamp>1500){readColors();colorStamp=performance.now();}
  const ctx=cv.getContext('2d'),ts=cw/W,px=1/ts,season=seasonOf();
  ctx.setTransform(dpr*ts,0,0,dpr*ts,0,0);
  ctx.fillStyle=C.grass;ctx.fillRect(0,0,W,H);
  if(season===3){ctx.fillStyle=C.bg;ctx.globalAlpha=.55;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  else if(season===2){ctx.fillStyle=C.lamp;ctx.globalAlpha=.12;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  ctx.fillStyle=C.grass2;for(let i=0;i<40;i++){const x=(i*7.3)%W,y=(i*11.7)%23;ctx.fillRect(x,y,.25,.25);}
  ctx.fillStyle=C.water;ctx.fillRect(0,23.8,W,2.2);
  if(placeShown('wharf')){ctx.fillRect(0,.3,W,.5);}
  if(techBuilt('railway')){ctx.strokeStyle=C.mapink;ctx.globalAlpha=.7;ctx.lineWidth=.06;ctx.beginPath();ctx.moveTo(0,.06);ctx.lineTo(W,.06);ctx.moveTo(0,.2);ctx.lineTo(W,.2);ctx.stroke();for(let x=.3;x<W;x+=.7){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,.26);ctx.stroke();}ctx.globalAlpha=1;}
  ctx.strokeStyle=C.bg;ctx.globalAlpha=.35;ctx.lineWidth=.08;
  for(let i=0;i<8;i++){const x=(i*5.3+(S.tick*.15))%W;ctx.beginPath();ctx.moveTo(x,24.6+(i%3)*.5);ctx.lineTo(x+1.4,24.6+(i%3)*.5);ctx.stroke();}
  ctx.globalAlpha=1;
  ctx.strokeStyle=C.path;ctx.lineWidth=.75;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(0,13);ctx.lineTo(16,13);ctx.stroke();
  for(const id in P){if(id==='square'||!placeShown(id))continue;const p=P[id],d=doorOf(p);ctx.beginPath();ctx.moveTo(d[0],d[1]);ctx.lineTo(d[0],13);ctx.lineTo(clamp(d[0],16,24),13);ctx.stroke();}
  if(techBuilt('barn')){ctx.fillStyle=C.roof;ctx.fillRect(BARN.x,BARN.y,BARN.w,BARN.h);ctx.strokeStyle=C.mapink;ctx.globalAlpha=.35;ctx.lineWidth=.07;ctx.strokeRect(BARN.x,BARN.y,BARN.w,BARN.h);ctx.globalAlpha=1;}
  for(const id in P){
    const p=P[id];if(!placeShown(id))continue;
    if(p.indoor){
      ctx.fillStyle=p.home?C.roofhome:C.roof;ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.strokeStyle=C.mapink;ctx.globalAlpha=.35;ctx.lineWidth=.07;ctx.strokeRect(p.x,p.y,p.w,p.h);
      ctx.beginPath();ctx.moveTo(p.x+.3,p.y+p.h/2);ctx.lineTo(p.x+p.w-.3,p.y+p.h/2);ctx.stroke();ctx.globalAlpha=1;
      if(season===3){ctx.fillStyle=C.bg;ctx.globalAlpha=.45;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.globalAlpha=1;}
      if(id==='mill'){ctx.strokeStyle=C.mapink;ctx.lineWidth=.1;ctx.beginPath();ctx.arc(p.x+p.w+.6,p.y+p.h-.4,.8,0,Math.PI*2);ctx.stroke();
        if(techBuilt('millstone')){ctx.beginPath();ctx.arc(p.x+p.w+.6,p.y+p.h-2.2,.8,0,Math.PI*2);ctx.stroke();}}
      if(id==='cottonmill'){ctx.fillStyle=C.mapink;ctx.fillRect(p.x+p.w-1,p.y-.9,.5,1.2);}
      if(id==='chapel'){ctx.strokeStyle=C.mapink;ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(p.x+p.w/2,p.y-.9);ctx.lineTo(p.x+p.w/2,p.y+.1);ctx.moveTo(p.x+p.w/2-.35,p.y-.55);ctx.lineTo(p.x+p.w/2+.35,p.y-.55);ctx.stroke();}
    }else if(id==='fields'){
      ctx.fillStyle=C.field;ctx.globalAlpha=season===3?.4:1;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.globalAlpha=1;ctx.strokeStyle=C.mapink;ctx.globalAlpha=.15;ctx.lineWidth=.06;
      for(let x=p.x+.6;x<p.x+p.w;x+=.7){ctx.beginPath();ctx.moveTo(x,p.y+.2);ctx.lineTo(x,p.y+p.h-.2);ctx.stroke();}ctx.globalAlpha=1;
    }else if(id==='square'){
      ctx.fillStyle=C.grass2;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle=C.path;ctx.lineWidth=.2;ctx.strokeRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle=C.water;ctx.strokeStyle=C.mapink;ctx.lineWidth=.08;ctx.beginPath();ctx.arc(20,13,.55,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(id==='garden'){
      ctx.fillStyle=C.grass2;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=C.good;ctx.globalAlpha=season===3?.15:.45;
      for(let x=p.x+.5;x<p.x+p.w;x+=.8)for(let y=p.y+.5;y<p.y+p.h;y+=.8){ctx.beginPath();ctx.arc(x,y,.14,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    }else if(id==='wharf'){
      ctx.fillStyle=C.path;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=C.roof;for(let i=0;i<3;i++)ctx.fillRect(p.x+.5+i*1.1,p.y+.6,.7,.7);
    }else{
      ctx.fillStyle=C.path;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle=C.mapink;ctx.globalAlpha=.4;ctx.lineWidth=.1;
      ctx.beginPath();ctx.moveTo(p.x+p.w/2,p.y+.4);ctx.lineTo(p.x+p.w/2,p.y+p.h-.4);ctx.moveTo(p.x+p.w/2-.4,p.y+1);ctx.lineTo(p.x+p.w/2+.4,p.y+1);ctx.stroke();ctx.globalAlpha=1;
    }
  }
  const h=hourOf(),dk=darkness(h)+(S.storm>0?.18:0);
  if(dk>0){ctx.fillStyle=C.night;ctx.globalAlpha=Math.min(.7,dk);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(dk>.15){
    const lit={};for(const a of LIVE)if(a.arrived&&a.at&&P[a.at].indoor&&a.act.type!=='sleep')lit[a.at]=1;
    ctx.fillStyle=C.lamp;
    for(const id in lit){const p=P[id];ctx.globalAlpha=.9;ctx.fillRect(p.x+.6,p.y+p.h-1,.45,.45);ctx.fillRect(p.x+p.w-1.05,p.y+p.h-1,.45,.45);ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)*.6,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
  }
  const fs=Math.max(10,ts*.58)*px;
  ctx.font=`500 ${fs}px "Alegreya Sans", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const id in P){const p=P[id];if(!placeShown(id))continue;let name=p.name.replace(/^the /,'');if((ts<15&&p.home)||p.w<3)name=name.split(' ').slice(0,2).join(' ').replace(/ Cottage$/,'');
    const ly=p.indoor?p.y+p.h+fs*.75:p.y+fs*.75;
    ctx.fillStyle=C.mapink;ctx.globalAlpha=dk>.3?.85:.7;ctx.fillText(name,p.x+p.w/2,ly);}
  ctx.globalAlpha=1;
  if(S.storm>0||season===3){const snow=season===3;ctx.strokeStyle=snow?C.bg:C.water;ctx.fillStyle=C.bg;ctx.globalAlpha=snow?.8:.6;ctx.lineWidth=.06;const off=(performance.now()/(snow?160:40))%3;
    const n=S.storm>0?90:30;for(let i=0;i<n;i++){const x=(i*4.37+(snow?Math.sin(off+i)*.3:0))%W,y=((i*7.91)+off*3)%H;if(snow){ctx.beginPath();ctx.arc(x,y,.1,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-.25,y+.7);ctx.stroke();}}ctx.globalAlpha=1;}
  const s=S.agents[V.sel];
  const pos=a=>[a.px+(a.x-a.px)*al,a.py+(a.y-a.py)*al];
  if(s&&visibleA(s)){
    const sp=pos(s);
    for(const b of LIVE){if(b===s||!visibleA(b))continue;const o=op(s,b);if(Math.abs(o)<40)continue;
      const bp=pos(b);ctx.strokeStyle=o>0?C.good:C.bad;ctx.globalAlpha=Math.min(.85,Math.abs(o)/100);ctx.lineWidth=.12;ctx.setLineDash(o>0?[]:[.35,.25]);
      ctx.beginPath();ctx.moveTo(sp[0],sp[1]);ctx.lineTo(bp[0],bp[1]);ctx.stroke();}
    ctx.setLineDash([]);ctx.globalAlpha=1;
  }
  const R=Math.max(.42,5*px);
  for(const a of LIVE){
    if(!visibleA(a))continue;
    const [x,y]=pos(a),r=R*(a.age<4?.55:a.age<14?.75:1);
    ctx.fillStyle=agentColor(a);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=C.dark?C.bg:'#fff';ctx.lineWidth=Math.max(.06,1*px);ctx.stroke();
    if(a.id===V.sel){ctx.strokeStyle=C.lamp;ctx.lineWidth=Math.max(.12,2*px);ctx.beginPath();ctx.arc(x,y,r+.28,0,Math.PI*2);ctx.stroke();}
    if(ts>=18&&a.age>=14){ctx.fillStyle=C.dark?C.bg:'#fff';ctx.font=`700 ${r*1.2}px "Alegreya Sans", sans-serif`;ctx.fillText(a.first[0],x,y+r*.05);}
    if(a.glyph){const g=a.glyph;ctx.font=`700 ${Math.max(12,ts*.8)*px}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle=g.k==='good'?C.good:g.k==='bad'?C.bad:g.k==='rumour'?C.lamp:C.mapink;
      ctx.fillText(g.c,x,y-r-Math.max(.45,7*px));}
  }
}
cv.addEventListener('click',e=>{
  const rc=cv.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*W,y=(e.clientY-rc.top)/rc.height*H;
  let best=-1,bd=1.6;for(const a of LIVE){if(!visibleA(a))continue;const d=Math.hypot(a.x-x,a.y-y);if(d<bd){bd=d;best=a.id;}}
  if(best>=0)select(best);
});
