// Ported from the v5 prototype by tools/port-v5.mjs.
import { S } from './state.js';

export function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function lrng(seed){let t=seed>>>0;return()=>{t=(t+0x6D2B79F5)|0;let r=Math.imul(t^t>>>15,t|1);r^=r+Math.imul(r^r>>>7,r|61);return((r^r>>>14)>>>0)/4294967296;};}
export function rollFace(r,sex,local){
  return {skin:local?Math.floor(r()*3):Math.floor(r()*6),hair:Math.floor(r()*8),eye:Math.floor(r()*5),fw:.86+r()*.22,fh:.93+r()*.14,jaw:Math.floor(r()*3),nose:Math.floor(r()*3),
    brow:1.2+r()*1.4,curly:r()<.2,freck:r()<.25,ear:.9+r()*.25,bald:sex==='m'&&r()<.35,beard:sex==='m'?Math.floor(r()*4):0,style:Math.floor(r()*3),hat:Math.floor(r()*3)};
}
export function inheritFace(ps,sex,r){
  const f={},base=rollFace(r,sex,false),pf=ps.map(faceOf);
  for(const k in base){
    if(k==='beard'||k==='style'||k==='hat'){f[k]=base[k];continue;}
    if(k==='bald'){const dad=ps.find(p=>p.sex==='m');f[k]=sex==='m'&&(dad?faceOf(dad).bald&&r()<.65:base.bald);continue;}
    if(r()<.08){f[k]=base[k];continue;}
    const src=pf[Math.floor(r()*pf.length)][k];
    f[k]=typeof src==='number'&&!Number.isInteger(src)?src+(r()-.5)*.06:src;
  }
  return f;
}
export function faceOf(a){
  if(a.face)return a.face;
  const r=lrng(hashStr(a.name+'#'+a.id)),ps=a.parents.map(i=>S.agents[i]).filter(Boolean);
  a.face=ps.length?inheritFace(ps,a.sex,r):rollFace(r,a.sex,a.arrivedAt==null&&a.hue!==330);
  return a.face;
}
