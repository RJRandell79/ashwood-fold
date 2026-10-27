// Ported from the v5 prototype by tools/port-v5.mjs.
import { IDEA } from '../data/ideas.js';
import { TINCT } from '../data/heraldry.js';
import { faceOf } from '../sim/faces.js';
import { blazon } from '../sim/heraldry.js';
import { clamp, hueOf, moodOf } from '../sim/state.js';

export const SKIN=['#f2d5bd','#ebc7a6','#ddb18c','#c99470','#a8724e','#7d5236'];
export const HAIR=['#2a1c13','#47301f','#6a4429','#8b5a2e','#a9773d','#c9a25e','#9e3b1f','#d6c07d'];
export const EYES=['#4a3324','#6e4c2c','#3e6e8e','#5d7c48','#7c8792'];
export const CLOTH={farmer:'#7b6a45',farmhand:'#857550',baker:'#7d5a44',miller:'#a89e88',labourer:'#6a6050',weaver:'#4f6684',smith:'#4a3a30',herbalist:'#5f7b52',reeve:'#26262e',carter:'#6e4b33',innkeeper:'#8a3b2e',millhand:'#56565e',pedlar:'#74557f',child:'#7f96ad'};
export let pid=0;
export function mixHex(a,b,t){const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
export function shade(hex,t){return (mixHex(hex,'#000000',t));}
export function portraitSVG(a,px){
  const f=faceOf(a),id='p'+(pid++),age=a.dead?a.dead.age:a.age,st=age<4?'infant':age<14?'child':'adult',female=a.sex==='f';
  const skin=SKIN[f.skin],dk=shade(skin,.28),grey=clamp((age-45)/30,0,1),hair=mixHex(HAIR[f.hair],'#d9d5cc',grey*.85);
  const m=a.dead?0:(moodOf(a)-.5)*2,sc=st==='infant'?1.18:st==='child'?1.07:1;
  const rx=19*f.fw,ry=23*f.fh*(st==='adult'?1:.95),cx=50,cy=st==='adult'?52:54;
  const jw=[.38,.55,.78][f.jaw]*(st==='adult'?1:.8)+(st==='adult'?0:.18);
  const head=`M${cx-rx},${cy} C${cx-rx},${cy-ry*1.35} ${cx+rx},${cy-ry*1.35} ${cx+rx},${cy} C${cx+rx},${cy+ry*.62} ${cx+rx*jw},${cy+ry} ${cx},${cy+ry*1.05} C${cx-rx*jw},${cy+ry} ${cx-rx},${cy+ry*.62} ${cx-rx},${cy} Z`;
  const hue=hueOf(a),cloth=CLOTH[a.job]||'#6a6050';
  let o=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${px}" height="${Math.round(px*1.2)}" role="img" aria-label="Portrait of ${a.name}" class="portrait${a.dead?' dead':''}"><defs><clipPath id="${id}"><ellipse cx="50" cy="60" rx="46" ry="56"/></clipPath><radialGradient id="${id}g" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="hsl(${hue} 30% 82%)"/><stop offset="1" stop-color="hsl(${hue} 26% 66%)"/></radialGradient></defs><g clip-path="url(#${id})"><rect width="100" height="120" fill="url(#${id}g)"/>`;
  o+=`<g transform="translate(50 ${st==='adult'?0:6}) scale(${sc}) translate(-50 0)">`;
  if(st!=='infant'&&female&&f.style!==0&&!f.curly)o+=`<path d="M${cx-rx-3},${cy-4} C${cx-rx-6},${cy+30} ${cx-rx+2},${cy+40} ${cx-rx+6},${cy+42} L${cx+rx-6},${cy+42} C${cx+rx-2},${cy+40} ${cx+rx+6},${cy+30} ${cx+rx+3},${cy-4} Z" fill="${shade(hair,.12)}"/>`;
  o+=`<path d="M6,124 C8,${cy+ry+16} 30,${cy+ry+8} 50,${cy+ry+8} C70,${cy+ry+8} 92,${cy+ry+16} 94,124 Z" fill="${cloth}"/>`;
  if(a.job==='baker'||a.job==='innkeeper')o+=`<path d="M38,124 L40,${cy+ry+14} L60,${cy+ry+14} L62,124 Z" fill="#efe9dc"/>`;
  if(a.job==='reeve'||(female&&st==='adult'&&f.hat!==2))o+=`<path d="M41,${cy+ry+7} L50,${cy+ry+15} L59,${cy+ry+7}" fill="#f2efe8" stroke="#ddd6c8" stroke-width=".6"/>`;
  if(a.job==='smith')o+=`<path d="M36,124 L37,${cy+ry+13} L63,${cy+ry+13} L64,124Z" fill="#6b4a33"/>`;
  o+=`<rect x="${cx-6}" y="${cy+ry*.7}" width="12" height="${(ry*.55+6).toFixed(1)}" fill="${dk}"/>`;
  for(const s of [-1,1])o+=`<ellipse cx="${(cx+s*rx*.98).toFixed(1)}" cy="${cy+3}" rx="${(3.4*f.ear).toFixed(1)}" ry="${(5*f.ear).toFixed(1)}" fill="${shade(skin,.1)}"/>`;
  o+=`<path d="${head}" fill="${skin}"/>`;
  const blush=(.12+a.tr.warmth*.25).toFixed(2);
  for(const s of [-1,1])o+=`<circle cx="${(cx+s*rx*.55).toFixed(1)}" cy="${cy+9}" r="4.5" fill="#e07a68" opacity="${blush}"/>`;
  if(f.freck)for(let i=0;i<8;i++){const s=i%2?1:-1;o+=`<circle cx="${(cx+s*(rx*.28+(i*2.3)%6)).toFixed(1)}" cy="${(cy+5+(i*1.7)%4).toFixed(1)}" r=".7" fill="${shade(skin,.35)}" opacity=".75"/>`;}
  const es=st==='adult'?1:1.25,ey=cy+(st==='adult'?0:1),ex=rx*.42;
  for(const s of [-1,1]){const x=(cx+s*ex).toFixed(1);
    o+=`<ellipse cx="${x}" cy="${ey}" rx="${3.6*es}" ry="${2.3*es}" fill="#f7f4ee"/><circle cx="${x}" cy="${ey+.2}" r="${1.7*es}" fill="${EYES[f.eye]}"/><circle cx="${x}" cy="${ey+.2}" r="${.8*es}" fill="#1a1410"/>`;
    if(age>55)o+=`<path d="M${(cx+s*(ex-3.8)).toFixed(1)},${ey-1.4} Q${x},${ey-3.4} ${(cx+s*(ex+3.8)).toFixed(1)},${ey-1.4}" fill="none" stroke="${dk}" stroke-width=".7"/>`;}
  if(st!=='infant'){const tilt=(a.tr.temper-.45)*4,by=ey-5.5-a.tr.warmth*1.2,bc=shade(hair,.1);
    for(const s of [-1,1])o+=`<path d="M${(cx+s*(ex-4.2)).toFixed(1)},${(by+tilt).toFixed(1)} L${(cx+s*(ex+4)).toFixed(1)},${(by-tilt*.4).toFixed(1)}" stroke="${bc}" stroke-width="${f.brow.toFixed(2)}" stroke-linecap="round"/>`;}
  const ny=cy+(st==='adult'?11:9);
  o+=[`<path d="M${cx-.5},${cy+3} Q${cx-2.8},${ny} ${cx},${ny+.6} Q${cx+2.2},${ny+.6} ${cx+2.6},${ny-.6}" fill="none" stroke="${dk}" stroke-width="1.1" stroke-linecap="round"/>`,
      `<path d="M${cx},${cy+1} L${cx-2.2},${ny+1} Q${cx},${ny+2.2} ${cx+2.4},${ny+.8}" fill="none" stroke="${dk}" stroke-width="1.1" stroke-linecap="round"/>`,
      `<path d="M${cx-1},${cy+4} Q${cx-4.5},${ny+1} ${cx},${ny+1.4} Q${cx+4.5},${ny+1} ${cx+1},${cy+4}" fill="${shade(skin,.08)}" stroke="${dk}" stroke-width="1"/>`][f.nose];
  const my=(cy+ry*.62).toFixed(1),mw=st==='adult'?6:4.5;
  o+=`<path d="M${cx-mw},${my} Q${cx},${(+my+m*4).toFixed(1)} ${cx+mw},${my}" fill="none" stroke="#8d4636" stroke-width="1.6" stroke-linecap="round"/>`;
  if(age>48){const k=clamp((age-48)/25,0,1).toFixed(2);
    for(const s of [-1,1])o+=`<path d="M${(cx+s*(ex+5)).toFixed(1)},${ey-1} l${s*2.5},-1.4 M${(cx+s*(ex+5)).toFixed(1)},${ey+1} l${s*2.5},1.2" stroke="${dk}" stroke-width=".6" opacity="${k}"/>`;
    if(age>58)o+=`<path d="M${cx-8},${(cy-ry*.55).toFixed(1)} q8,-1.5 16,0 M${cx-6},${(cy-ry*.45).toFixed(1)} q6,-1 12,0" fill="none" stroke="${dk}" stroke-width=".55" opacity="${k}"/>`;
    o+=`<path d="M${cx-mw-2},${+my-5} q-1,3 0,5 M${cx+mw+2},${+my-5} q1,3 0,5" fill="none" stroke="${dk}" stroke-width=".55" opacity="${k}"/>`;}
  if(!female&&age>=17&&f.beard){const bh=mixHex(hair,'#d9d5cc',grey*.3),y=+my;
    if(f.beard===1)o+=`<path d="M${cx-7},${y-2.5} Q${cx},${y-6} ${cx+7},${y-2.5} Q${cx},${y-3.5} ${cx-7},${y-2.5}Z" fill="${bh}"/>`;
    if(f.beard===2)for(const s of [-1,1])o+=`<path d="M${(cx+s*rx*.98).toFixed(1)},${cy+2} L${(cx+s*rx*.95).toFixed(1)},${(cy+ry*.55).toFixed(1)} Q${(cx+s*rx*.6).toFixed(1)},${(cy+ry*.8).toFixed(1)} ${(cx+s*rx*.55).toFixed(1)},${(cy+ry*.4).toFixed(1)} L${(cx+s*rx*.7).toFixed(1)},${cy+2}Z" fill="${bh}"/>`;
    if(f.beard===3)o+=`<path d="M${(cx-rx*.98).toFixed(1)},${cy+2} C${cx-rx},${(cy+ry*1.2).toFixed(1)} ${cx+rx},${(cy+ry*1.2).toFixed(1)} ${(cx+rx*.98).toFixed(1)},${cy+2} L${(cx+rx*.7).toFixed(1)},${cy+3} C${(cx+rx*.6).toFixed(1)},${y-2} ${cx+5},${y-1} ${cx},${y-3} C${cx-5},${y-1} ${(cx-rx*.6).toFixed(1)},${y-2} ${(cx-rx*.7).toFixed(1)},${cy+3}Z" fill="${bh}"/><path d="M${cx-mw+1},${y+.5} Q${cx},${(y+m*3+1).toFixed(1)} ${cx+mw-1},${y+.5}" fill="none" stroke="#6d3a2c" stroke-width="1.2"/>`;}
  if(st==='infant')o+=`<path d="M${cx-3},${(cy-ry).toFixed(1)} q3,-4 6,-1" fill="none" stroke="${hair}" stroke-width="1.6" stroke-linecap="round"/>`;
  else if(f.bald&&age>35)for(const s of [-1,1])o+=`<path d="M${(cx+s*rx*1.02).toFixed(1)},${cy+1} C${(cx+s*rx*1.05).toFixed(1)},${(cy-ry*.6).toFixed(1)} ${(cx+s*rx*.6).toFixed(1)},${(cy-ry*.75).toFixed(1)} ${(cx+s*rx*.45).toFixed(1)},${(cy-ry*.7).toFixed(1)} C${(cx+s*rx*.75).toFixed(1)},${(cy-ry*.4).toFixed(1)} ${(cx+s*rx*.85).toFixed(1)},${(cy-ry*.2).toFixed(1)} ${(cx+s*rx*.82).toFixed(1)},${cy+1}Z" fill="${hair}"/>`;
  else if(f.curly){for(let i=0;i<11;i++){const t=Math.PI*(1.05+i*.09);o+=`<circle cx="${(cx+Math.cos(t)*rx*.98).toFixed(1)}" cy="${(cy-4+Math.sin(t)*ry).toFixed(1)}" r="5.2" fill="${hair}"/>`;}
    if(female&&st==='adult')for(const s of [-1,1])o+=`<circle cx="${(cx+s*rx*1.05).toFixed(1)}" cy="${cy+8}" r="5" fill="${hair}"/><circle cx="${(cx+s*rx).toFixed(1)}" cy="${cy+16}" r="4.6" fill="${hair}"/>`;}
  else{
    const L=(v)=>v.toFixed(1);
    const top=female?`M${L(cx-rx-1.5)},${cy+4} C${L(cx-rx-2)},${L(cy-ry*1.5)} ${L(cx+rx+2)},${L(cy-ry*1.5)} ${L(cx+rx+1.5)},${cy+4} C${L(cx+rx*.9)},${L(cy-ry*.35)} ${cx+3},${L(cy-ry*.75)} ${cx},${L(cy-ry*.62)} C${cx-3},${L(cy-ry*.75)} ${L(cx-rx*.9)},${L(cy-ry*.35)} ${L(cx-rx-1.5)},${cy+4}Z`
      :f.style===1?`M${L(cx-rx-1)},${cy-1} C${L(cx-rx-1.5)},${L(cy-ry*1.5)} ${L(cx+rx+1.5)},${L(cy-ry*1.5)} ${L(cx+rx+1)},${cy-1} C${L(cx+rx*.85)},${L(cy-ry*.55)} ${L(cx-rx*.2)},${L(cy-ry*.85)} ${L(cx-rx*.55)},${L(cy-ry*.45)} C${L(cx-rx*.8)},${L(cy-ry*.3)} ${L(cx-rx*.9)},${L(cy-ry*.2)} ${L(cx-rx-1)},${cy-1}Z`
      :`M${L(cx-rx-1)},${cy-2} C${L(cx-rx-1.5)},${L(cy-ry*1.48)} ${L(cx+rx+1.5)},${L(cy-ry*1.48)} ${L(cx+rx+1)},${cy-2} C${L(cx+rx*.8)},${L(cy-ry*.6)} ${L(cx-rx*.8)},${L(cy-ry*.6)} ${L(cx-rx-1)},${cy-2}Z`;
    o+=`<path d="${top}" fill="${hair}"/>`;
    if(female&&f.style===2&&st==='adult')o+=`<circle cx="${cx}" cy="${L(cy-ry*1.12)}" r="6" fill="${shade(hair,.08)}"/>`;
  }
  if(st==='adult'){
    const L=(v)=>v.toFixed(1);
    if(a.job==='reeve')o+=`<rect x="${L(cx-rx*.85)}" y="${L(cy-ry*1.75)}" width="${L(rx*1.7)}" height="${L(ry*.8)}" rx="1.5" fill="#1e1e24"/><rect x="${L(cx-rx*1.25)}" y="${L(cy-ry)}" width="${L(rx*2.5)}" height="3" rx="1.5" fill="#1e1e24"/><rect x="${L(cx-rx*.85)}" y="${L(cy-ry*1.12)}" width="${L(rx*1.7)}" height="2" fill="#6b3a2e"/>`;
    else if(female&&f.hat===1)o+=`<path d="M${L(cx-rx-4)},${L(cy-ry*.45)} C${L(cx-rx-6)},${L(cy-ry*1.75)} ${L(cx+rx+6)},${L(cy-ry*1.75)} ${L(cx+rx+4)},${L(cy-ry*.45)} C${L(cx+rx)},${L(cy-ry*.75)} ${L(cx-rx)},${L(cy-ry*.75)} ${L(cx-rx-4)},${L(cy-ry*.45)}Z" fill="#f4f1ea" stroke="#d6cfc0" stroke-width=".8"/>`;
    else if(female&&f.hat===2)o+=`<path d="M${L(cx-rx-7)},${L(cy-ry*.1)} C${L(cx-rx-6)},${L(cy-ry*1.7)} ${L(cx+rx+6)},${L(cy-ry*1.7)} ${L(cx+rx+7)},${L(cy-ry*.1)} C${L(cx+rx+2)},${L(cy-ry*.9)} ${L(cx-rx-2)},${L(cy-ry*.9)} ${L(cx-rx-7)},${L(cy-ry*.1)}Z" fill="#d8b46a"/><path d="M${L(cx-rx-2)},${L(cy-ry*.55)} Q${cx},${L(cy-ry*.4)} ${L(cx+rx+2)},${L(cy-ry*.55)}" stroke="hsl(${hue} 50% 42%)" stroke-width="2" fill="none"/>`;
    else if(!female&&(f.hat===1||a.job==='millhand'||a.job==='carter'))o+=`<path d="M${L(cx-rx-2)},${L(cy-ry*.62)} C${L(cx-rx-1)},${L(cy-ry*1.55)} ${L(cx+rx+1)},${L(cy-ry*1.55)} ${L(cx+rx+3)},${L(cy-ry*.7)} L${L(cx+rx+8)},${L(cy-ry*.55)} C${L(cx+rx)},${L(cy-ry*.42)} ${L(cx-rx)},${L(cy-ry*.45)} ${L(cx-rx-2)},${L(cy-ry*.62)}Z" fill="${shade(cloth,.25)}"/>`;
  }
  o+=`</g></g><ellipse cx="50" cy="60" rx="46" ry="56" fill="none" stroke="#a8843c" stroke-width="2.6"/><ellipse cx="50" cy="60" rx="43.4" ry="53.4" fill="none" stroke="#e2c98a" stroke-width=".8" opacity=".8"/></svg>`;
  return o;
}
export function chargeSVG(kind,col,cx,cy,s){
  const g=d=>`<g transform="translate(${cx} ${cy}) scale(${s})">${d}</g>`,st=`stroke="${col}" fill="none" stroke-width="3" stroke-linecap="round"`;
  switch(kind){
    case 'garb':case 'garb2':return g(`<path d="M0,14 L0,-6 M0,14 L-6,-4 M0,14 L6,-4 M0,14 L-10,-1 M0,14 L10,-1" ${st}/><ellipse cx="0" cy="-10" rx="3" ry="6" fill="${col}"/><ellipse cx="-7" cy="-8" rx="2.6" ry="5.5" fill="${col}" transform="rotate(-25 -7 -8)"/><ellipse cx="7" cy="-8" rx="2.6" ry="5.5" fill="${col}" transform="rotate(25 7 -8)"/><ellipse cx="-11" cy="-3" rx="2.3" ry="5" fill="${col}" transform="rotate(-45 -11 -3)"/><ellipse cx="11" cy="-3" rx="2.3" ry="5" fill="${col}" transform="rotate(45 11 -3)"/><rect x="-7" y="3" width="14" height="3.5" fill="${col}"/>`);
    case 'millwheel':case 'cartwheel':case 'cog':{let d=`<circle r="12" ${st}/><circle r="3" fill="${col}"/>`;const n=kind==='cog'?10:8;
      for(let i=0;i<n;i++){const deg=i*360/n,a=deg*Math.PI/180;
        if(kind==='cog')d+=`<rect x="-2.6" y="-17" width="5.2" height="6" fill="${col}" transform="rotate(${deg})"/>`;
        else d+=`<line x1="0" y1="0" x2="${(Math.cos(a)*12).toFixed(1)}" y2="${(Math.sin(a)*12).toFixed(1)}" stroke="${col}" stroke-width="2"/>`;
        if(kind==='millwheel')d+=`<rect x="-2.2" y="-17" width="4.4" height="5.5" fill="${col}" transform="rotate(${deg})"/>`;}
      return g(d);}
    case 'millstone':return g(`<circle r="13" fill="${col}"/><circle r="3.5" fill="#000" opacity=".35"/><path d="M-9,-9 L-3,-3 M9,-9 L3,-3 M-9,9 L-3,3 M9,9 L3,3" stroke="#000" stroke-opacity=".3" stroke-width="1.4"/>`);
    case 'loaf':return g([[-8,-6],[8,-6],[0,7]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4.5" fill="${col}"/>`).join(''));
    case 'hammer':return g(`<rect x="-1.8" y="-6" width="3.6" height="20" fill="${col}"/><rect x="-10" y="-13" width="20" height="7" rx="1" fill="${col}"/>`);
    case 'shuttle':return g(`<path d="M-16,0 Q-8,-6 0,-6 Q8,-6 16,0 Q8,6 0,6 Q-8,6 -16,0Z" fill="${col}"/><rect x="-5" y="-1.5" width="10" height="3" fill="#000" opacity=".3"/>`);
    case 'tankard':return g(`<rect x="-8" y="-10" width="13" height="20" rx="2" fill="${col}"/><path d="M5,-5 q8,0 8,5 q0,5 -8,5" ${st}/><rect x="-9" y="-13" width="15" height="4" rx="1" fill="${col}"/>`);
    case 'key':return g(`<circle cx="0" cy="-9" r="5.5" ${st}/><line x1="0" y1="-3.5" x2="0" y2="14" stroke="${col}" stroke-width="3"/><rect x="0" y="7" width="6" height="3" fill="${col}"/><rect x="0" y="11.5" width="4.5" height="2.5" fill="${col}"/>`);
    case 'sprig':return g(`<path d="M0,14 Q-1,0 2,-14" ${st}/>`+[-8,-2,4,10].map((y,i)=>`<ellipse cx="${i%2?5:-4}" cy="${y-2}" rx="5" ry="2.4" fill="${col}" transform="rotate(${i%2?-30:30} ${i%2?5:-4} ${y-2})"/>`).join(''));
    case 'rose':{let d='';for(let i=0;i<5;i++){const a=(i*72-90)*Math.PI/180;d+=`<circle cx="${(Math.cos(a)*7).toFixed(1)}" cy="${(Math.sin(a)*7).toFixed(1)}" r="6" fill="${col}"/>`;}return g(d+`<circle r="4" fill="${col}" stroke="#000" stroke-opacity=".25" stroke-width="1"/>`);}
    case 'star':{let p='';for(let i=0;i<10;i++){const a=(i*36-90)*Math.PI/180,r=i%2?5.5:14;p+=`${(Math.cos(a)*r).toFixed(1)},${(Math.sin(a)*r).toFixed(1)} `;}return g(`<polygon points="${p}" fill="${col}"/>`);}
    case 'crescent':return g(`<path d="M-12,-3 A12,12 0 0 0 12,-3 A9,9 0 0 1 -12,-3Z" fill="${col}"/>`);
    case 'anchor':return g(`<circle cx="0" cy="-12" r="3.2" ${st}/><line x1="0" y1="-9" x2="0" y2="13" stroke="${col}" stroke-width="3"/><line x1="-7" y1="-5" x2="7" y2="-5" stroke="${col}" stroke-width="3"/><path d="M-12,4 Q-10,14 0,14 Q10,14 12,4" ${st}/><path d="M-14,6 L-12,2 L-9,6 M14,6 L12,2 L9,6" fill="${col}" stroke="${col}" stroke-width="1.5"/>`);
    case 'axe':return g(`<line x1="-6" y1="14" x2="6" y2="-13" stroke="${col}" stroke-width="3" stroke-linecap="round"/><path d="M1,-13 Q12,-17 15,-6 Q10,-2 4,-3 Z" fill="${col}"/>`);
    case 'bridge':return g(`<path d="M-17,6 L-17,-3 L17,-3 L17,6 L11,6 Q11,-3 0,-3.5 Q-11,-3 -11,6 Z" fill="${col}"/><line x1="-18" y1="-6" x2="18" y2="-6" stroke="${col}" stroke-width="2.4"/><path d="M-15,10 q3,-2 6,0 t6,0 t6,0 t6,0" fill="none" stroke="${col}" stroke-width="1.4"/>`);
    case 'wingedwheel':{let d=`<circle r="8" ${st}/><circle r="2.2" fill="${col}"/>`;for(let i=0;i<6;i++){const a=i*Math.PI/3;d+=`<line x1="0" y1="0" x2="${(Math.cos(a)*8).toFixed(1)}" y2="${(Math.sin(a)*8).toFixed(1)}" stroke="${col}" stroke-width="1.6"/>`;}for(const s of [-1,1])d+=`<path d="M${s*9},-2 Q${s*15},-12 ${s*19},-11 Q${s*16},-6 ${s*18},-4 Q${s*14},-1 ${s*16},2 Q${s*12},3 ${s*9},3 Z" fill="${col}"/>`;return g(d);}
    case 'book':return g(`<path d="M0,-8 Q-8,-12 -15,-9 L-15,9 Q-8,6 0,10 Q8,6 15,9 L15,-9 Q8,-12 0,-8Z" fill="${col}"/><line x1="0" y1="-8" x2="0" y2="10" stroke="#000" stroke-opacity=".3" stroke-width="1"/>`);
    case 'plough':return g(`<path d="M-14,6 L6,-2 L14,6 Z" fill="${col}"/><line x1="-4" y1="2" x2="-12" y2="-12" stroke="${col}" stroke-width="3"/>`);
    case 'spindle':{let d=`<circle r="10" ${st}/><circle r="2.5" fill="${col}"/>`;for(let i=0;i<6;i++){const a=i*Math.PI/3;d+=`<line x1="0" y1="0" x2="${(Math.cos(a)*10).toFixed(1)}" y2="${(Math.sin(a)*10).toFixed(1)}" stroke="${col}" stroke-width="1.6"/>`;}return g(d+`<line x1="-14" y1="14" x2="-4" y2="4" stroke="${col}" stroke-width="2.4"/>`);}
  }
  return '';
}
export function armsSVG(ar,px,label){
  const id='a'+(pid++),shield='M8,6 H92 V46 C92,76 72,92 50,102 C28,92 8,76 8,46 Z';
  const c1=TINCT[ar.c1][1],c2=TINCT[ar.c2][1],m=TINCT[ar.metal][1],chief=ar.aug.length>0;
  let f=`<rect width="100" height="110" fill="${c1}"/>`;
  switch(ar.div){
    case 'pale':f+=`<rect x="50" width="50" height="110" fill="${c2}"/>`;break;
    case 'fess':f+=`<rect y="52" width="100" height="60" fill="${c2}"/>`;break;
    case 'bend':f+=`<polygon points="0,0 100,110 0,110" fill="${c2}"/>`;break;
    case 'chevron':f+=`<polygon points="0,110 0,84 50,40 100,84 100,110" fill="${c2}"/>`;break;
    case 'quarterly':f+=`<rect x="50" width="50" height="52" fill="${c2}"/><rect y="52" width="50" height="60" fill="${c2}"/>`;break;
  }
  f+=chargeSVG(ar.charge,m,50,chief?60:50,chief?1.05:1.35);
  if(chief){f+=`<rect width="100" height="28" fill="${TINCT[ar.metal==='or'?'argent':'or'][1]}"/><line x1="0" y1="28" x2="100" y2="28" stroke="#000" stroke-opacity=".25"/>`;
    const n=ar.aug.length;ar.aug.forEach((t,i)=>{f+=chargeSVG(IDEA[t].emblem,TINCT.sable[1],(50+(i-(n-1)/2)*26).toFixed(1),16,.55);});}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 106" width="${px}" height="${Math.round(px*1.06)}" class="arms" role="img" aria-label="${(label?label+': ':'')+blazon(ar)}"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath><linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs><g clip-path="url(#${id})">${f}<rect width="100" height="110" fill="url(#${id}s)"/></g><path d="${shield}" fill="none" stroke="#3a3328" stroke-width="2.6" stroke-linejoin="round"/></svg>`;
}
