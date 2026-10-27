// Ported from the v5 prototype by tools/port-v5.mjs.
import { DAYS, HUES, P, SEASONS, SEASON_DAYS, TPD, YEAR_DAYS } from '../data/world.js';

export let S=null, LIVE=[];
export function rnd(){S.rng=(S.rng+0x6D2B79F5)|0;let t=S.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export function hourOf(t=S.tick){return ((t%TPD)/6);}
export function dayOf(t=S.tick){return (Math.floor(t/TPD)+1);}
export function yearOf(t=S.tick){return (Math.floor((dayOf(t)-1)/YEAR_DAYS)+1);}
export function seasonOf(t=S.tick){return (Math.floor(((dayOf(t)-1)%YEAR_DAYS)/SEASON_DAYS));}
export function dayInSeason(t=S.tick){return (((dayOf(t)-1)%SEASON_DAYS)+1);}
export function seasonName(t=S.tick){return (`${SEASONS[seasonOf(t)]}, Year ${yearOf(t)}`);}
export function weekday(t=S.tick){return (DAYS[(dayOf(t)-1)%7]);}
export function isSunday(){return ((dayOf()-1)%7===6);}
export function dayStart(t=S.tick){return (t-(t%TPD));}
export function fmtTime(t){const m=(t%TPD)*10;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
export function clamp(v,a,b){return (Math.max(a,Math.min(b,v)));}
export function pick(arr){return (arr[Math.floor(rnd()*arr.length)]);}
export function N(a){return (`<span class="who" data-id="${a.id}">${a.first}</span>`);}
export function PN(id){return (P[id].name);}
export function listNames(arr){const n=arr.map(N);return n.length<2?n.join(''):n.slice(0,-1).join(', ')+' and '+n[n.length-1];}
export function pointIn(p){return [p.x+0.7+rnd()*(p.w-1.4), p.y+0.7+rnd()*(p.h-1.4)];}
export function refreshLive(){LIVE=S.agents.filter(a=>!a.dead);}
export function isAdult(a){return (a.age>=14);}
export function stage(a){return (a.age<4?'infant':a.age<14?'child':'adult');}
export function surname(a){return (a.name.split(' ').slice(1).join(' '));}
export function jobLabel(a){return (a.dead?(a.job==='child'?'child':a.job):a.age<4?'baby':a.job);}
export function hueOf(a){return ((a.home==='tavern'&&a.job!=='innkeeper')?a.hue:(HUES[a.home]??a.hue));}
export function techOn(id){return (S.tech[id]&&S.tech[id].state==='built'&&!(S.tech[id].brokenUntil>S.tick));}
export function techBuilt(id){return (S.tech[id]&&S.tech[id].state==='built');}
export function placeShown(id){const p=P[id];if(p.tech)return techBuilt(p.tech)||(S.tech[p.tech]&&S.tech[p.tech].state==='building');if(p.plot)return !!S.built[id];return true;}
export function household(h){return (LIVE.filter(a=>a.home===h));}
export function childrenOf(a){return (S.agents.filter(c=>c.parents.includes(a.id)));}
export function isKin(a,b){if(a.parents.includes(b.id)||b.parents.includes(a.id))return true;return a.parents.some(p=>b.parents.includes(p));}
export function byJob(j){return (LIVE.find(a=>a.job===j));}
export function pantryOf(a){return a.home==='tavern'?Math.floor(S.stores.bread):(S.pantry[a.home]||0);}
export function takePantry(a){if(a.home==='tavern'){if(S.stores.bread>=1){S.stores.bread-=1;return true;}return false;}if((S.pantry[a.home]||0)>=1){S.pantry[a.home]--;return true;}return false;}
export function fairOn(){return (S.fair&&S.tick>=S.fair.start&&S.tick<S.fair.end);}
export function grainCap(){return (techOn('barn')?750:400);}
export function moodOf(a){return (clamp(1-(a.hunger*.45+a.tired*.3+a.lonely*.25),0,1));}
export function numberWord(n){return ['no','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'][n]||String(n);}

export function setState(v){S=v;return v;}
