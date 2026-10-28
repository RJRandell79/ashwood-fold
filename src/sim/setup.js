// Ported from the v5 prototype by tools/port-v5.mjs.
import { FOLK, INDUSTRIAL_NAMES } from '../data/folk.js';
import { IDEAS } from '../data/ideas.js';
import { JOBS, TPD, YEAR_DAYS } from '../data/world.js';
import { armsOf, familyKey } from './heraldry.js';
import { recordFamilies } from './dynasties.js';
import { log } from './log.js';
import { checkPair } from './social.js';
import { currentAge, N, P, pointIn, refreshLive, rnd, S, setState, yearOf } from './state.js';
import { addPlace, buildCottage, placeFounding, routeLine } from './placement.js';
import { BUILDINGS } from '../data/buildings.js';
import { AGES, FIRST_AGE } from '../data/ages.js';

export function makeAgent(id,name,job,home,tr,o){
  o=o||{};const pt=pointIn(P[home]||P.tavern);
  return {id,name,first:name.split(' ')[0],job,home,work:JOBS[job]||null,hue:o.hue??(P[home]&&P[home].hue)??330,
    x:pt[0],y:pt[1],px:pt[0],py:pt[1],tx:pt[0],ty:pt[1],arrived:true,at:home,
    act:{type:'sleep',place:home,left:0,target:null},
    hunger:.25+rnd()*.25,tired:.12,lonely:.25+rnd()*.2,coins:job==='child'?0:4+Math.floor(rnd()*6),tipsy:0,
    tr,mem:[],knows:[],glyph:null,age:o.age??30,sex:o.sex||'f',spouse:-1,parents:o.parents||[],born:o.born??null,dead:null,prevJob:null};
}
export function blankState(seed,age=FIRST_AGE){
  const s={v:3,age,yearBase:AGES[age].startYear,seed,rng:seed|0,valley:{seed},places:{},lines:{},crossing:null,foot:{},cottages:0,tick:6*6,agents:[],op:[],pair:{},grudge:{},cool:{},
     stores:{grain:160,flour:30,bread:30,missing:0},pantry:{},storm:0,fair:null,rumours:[],rid:0,log:[],annals:[],lastThief:-1,bareLogged:0,spoil:0,
     tech:{},gathers:[],gid:0,vacant:[],built:{},years:{},arms:{},election:null,nextElection:(YEAR_DAYS+2)*TPD,cases:[],cid:0,verdicts:[],era:0,reeveSince:null,lastElection:null,brawls:{},harvest:0,yearQ:.8+(((seed>>>3)%40)/100)};
  for(const {id} of AGES[age].ideas)s.tech[id]={state:'none',pressure:0,backers:[],opponents:[],adopters:[]};
  return s;
}
export function newTown(seed,age=FIRST_AGE){
  setState(blankState(seed,age));
  placeFounding();
  foundCast(currentAge().cast);
}
/** Brings an age's founding cast into the valley: their homes, families, quarrels and friendships, and the
 *  lines that open the chronicle. Agents already in S.agents (an earlier age's people) are left as they are. */
export function foundCast(cast){
  const base=S.agents.length,F=cast.folk;
  F.forEach((f,i)=>S.agents.push(makeAgent(base+i,f[0],f[1],f[2],{...f[3]},{age:f[4],sex:f[5]})));
  const A=i=>S.agents[base+i],fresh=S.agents.slice(base);
  for(const [i,j] of cast.spouses){A(i).spouse=base+j;A(j).spouse=base+i;}
  for(const [c,ps] of cast.parents)A(c).parents=ps.map(p=>base+p);
  const n=S.agents.length;
  for(const row of S.op)while(row.length<n)row.push(0);
  for(let i=base;i<n;i++){const row=[];for(let j=0;j<n;j++)row.push(j<base?0:i===j?0:Math.round((rnd()-.5)*16));S.op.push(row);}
  for(const a of fresh)for(const b of fresh)if(a!==b&&a.home===b.home)S.op[a.id][b.id]=45+Math.round(rnd()*15);
  Object.keys(P).filter(k=>P[k].home).forEach(k=>S.pantry[k]=3);
  const set=(i,j,v)=>{S.op[base+i][base+j]=v;};
  for(const [i,j,v] of cast.opinions)set(i,j,v);
  if(cast.midwife){const [m,min]=cast.midwife;for(let j=base;j<n;j++)if(j!==base+m)S.op[base+m][j]=Math.max(S.op[base+m][j],min);}
  for(const [i,j,v] of cast.later||[])set(i,j,v);
  for(const c of (cast.children||[]).map(A))for(const x of fresh)if(x!==c&&!c.parents.includes(x.id)&&x.home!==c.home){
    S.op[c.id][x.id]=Math.round(c.parents.reduce((s,p)=>s+S.op[p][x.id],0)/c.parents.length*.5);}
  S.years[yearOf()]={startPop:S.agents.filter(a=>!a.dead).length,births:0,deaths:0,weddings:0,era:S.era||0};
  refreshLive();
  for(const a of fresh)for(const b of fresh)if(a.id<b.id)checkPair(a,b,true);
  for(const a of fresh)for(const b of fresh)if(a!==b&&S.op[a.id][b.id]<-50)S.grudge[a.id+'-'+b.id]=1;
  for(const [i,j,v] of cast.pairs)S.pair[`${base+i}-${base+j}`]=v;
  for(const a of fresh)armsOf(familyKey(a));
  recordFamilies();
  for(const line of cast.prologue)log(line.replace(/\{(\d+)\}/g,(_,k)=>N(A(+k))),'event','prologue');
}
export function ensureState(o){
  const fresh=blankState(o.seed||1);
  for(const k in fresh)if(o[k]===undefined)o[k]=fresh[k];
  for(const {id} of IDEAS)if(!o.tech[id])o.tech[id]={state:'none',pressure:0,backers:[],opponents:[],adopters:[]};
  if(o.nextElection<o.tick)o.nextElection=o.tick+3*TPD+TPD;
  if(!Object.keys(o.places).length)layOutOldSave(o);
  o.v=3;
  return o;
}
/** Saves from before Phase 2 had fixed coordinates. Their village is laid out afresh in a valley
 *  grown from the save's seed, keeping everything that had been built. */
function layOutOldSave(o){
  const was=S;setState(o);
  placeFounding();
  for(const [plot,n] of [['plot1',0],['plot2',1]])if(o.built&&o.built[plot]){
    const id=buildCottage();if(id&&id!==plot){P[plot]={...P[id],id:plot};delete P[id];}o.cottages=Math.max(o.cottages,n+1);}
  for(const d of IDEAS){const t=o.tech[d.id];if(!t||(t.state!=='built'&&t.state!=='building'))continue;if(d.line)routeLine(d.line);for(const b of d.places||[])addPlace(b);}
  // Everyone stands where they were going.
  for(const a of o.agents){const p=P[a.at]||P[a.act&&a.act.place]||P[a.home]||P.tavern;const c=[p.x+p.w/2,p.y+p.h/2];a.x=a.px=a.tx=c[0];a.y=a.py=a.ty=c[1];}
  setState(was);
}
export function migrate(o){
  if(o.v>=2)return ensureState(o);
  const fresh=blankState(o.seed||1);
  for(const k in fresh)if(o[k]===undefined)o[k]=fresh[k];
  const byName={};FOLK.forEach(f=>byName[f[0]]=f);
  const sx={};INDUSTRIAL_NAMES.strangers.forEach(s=>sx[s[0]]=s[1]);
  for(const a of o.agents){
    const f=byName[a.name];
    a.age=f?f[4]+(Math.floor((o.tick||0)/TPD)/YEAR_DAYS):25+((a.id*7)%20);
    a.sex=f?f[5]:(sx[a.name]||'f');a.spouse=-1;a.parents=[];a.born=null;a.dead=null;a.prevJob=null;
  }
  const by=n=>o.agents.find(a=>a.name===n);
  const link=(x,y)=>{const a=by(x),b=by(y);if(a&&b){a.spouse=b.id;b.spouse=a.id;}};
  link('Ada Holt','Sam Holt');link('Tom Pendle','Martha Pendle');
  const par=(c,ps)=>{const a=by(c);if(a)a.parents=ps.map(by).filter(Boolean).map(p=>p.id);};
  par('Ned Barrow',['Eli Barrow']);par('Ruth Fairclough',['Jonas Fairclough']);
  o.annals=o.log.filter(e=>e.k!=='event').slice(-60).map(e=>({...e,c:'event'}));
  const y=Math.floor((Math.floor(o.tick/TPD))/YEAR_DAYS)+1;o.years[y]={startPop:o.agents.length,births:0,deaths:0,weddings:0};
  o.stores.grain=Math.max(o.stores.grain,120);
  o.v=2;if(!o.arms)o.arms={};return ensureState(o);
}
