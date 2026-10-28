// Ported from the v5 prototype by tools/port-v5.mjs.
import { IDEA } from '../data/ideas.js';
import { CHARGE_BY_JOB, CHARGE_NAMES, COLOURS, DIVNAME, DIVS, METALS, TINCT, TRADEWORD, VIRTUE } from '../data/heraldry.js';
import { hashStr, lrng } from './faces.js';
import { S, surname } from './state.js';

export function familyKey(a){return (surname(a)||a.first);}
export function familyPlural(f){return (/es$/.test(f)?f:/(s|x|sh|ch)$/.test(f)?f+'es':f+'s');}
export function armsOf(fam){
  if(!S.arms)S.arms={};
  if(S.arms[fam])return S.arms[fam];
  const founder=S.agents.filter(a=>familyKey(a)===fam).sort((x,y)=>(x.born??-1e9)-(y.born??-1e9)||y.age-x.age)[0];
  const r=lrng(hashStr('arms:'+fam));
  const div=DIVS[Math.floor(r()*DIVS.length)],c1=COLOURS[Math.floor(r()*5)];
  let c2=COLOURS[Math.floor(r()*5)];if(c2===c1)c2=COLOURS[(COLOURS.indexOf(c1)+2)%5];
  const metal=METALS[Math.floor(r()*2)],job=founder?(founder.job==='child'?'pedlar':founder.job):'pedlar';
  const charge=CHARGE_BY_JOB[job]||['rose','star','crescent'][Math.floor(r()*3)];
  const tr=founder?founder.tr:{},best=Object.keys(VIRTUE).sort((x,y)=>(tr[y]||0)-(tr[x]||0))[0];
  const motto=best==='diligence'?`${VIRTUE.diligence} ${TRADEWORD[job]||'and Patience'}`:VIRTUE[best];
  S.arms[fam]={div,c1,c2,metal,charge,motto,aug:[],founded:founder?founder.id:null};
  return S.arms[fam];
}
export function blazon(ar){
  const T=k=>TINCT[k][0];
  let s=ar.div==='plain'?T(ar.c1):`${DIVNAME[ar.div]} ${T(ar.c1)} and ${T(ar.c2)}`;
  s+=`, ${CHARGE_NAMES[ar.charge]} ${T(ar.metal)}`;
  if(ar.aug.length){const cm=ar.metal==='or'?'argent':'or';const names=ar.aug.map(t=>CHARGE_NAMES[IDEA[t].emblem]);
    s+=`; on a chief ${T(cm)}, ${names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:names[0]} Sable`;}
  return s;
}
export function familyCards(){
  const fams={};for(const a of S.agents){const k=familyKey(a);(fams[k]||(fams[k]=[])).push(a);}
  return Object.keys(fams).map(k=>({k,members:fams[k],live:fams[k].filter(a=>!a.dead)})).sort((x,y)=>y.live.length-x.live.length||(x.k>y.k?1:-1));
}
