// Ported from the v5 prototype by tools/port-v5.mjs.
import { FOLK, STRANGERS } from '../data/folk.js';
import { IDEAS } from '../data/ideas.js';
import { JOBS, TPD, YEAR_DAYS } from '../data/world.js';
import { armsOf, familyKey } from './heraldry.js';
import { log } from './log.js';
import { checkPair } from './social.js';
import { N, P, pointIn, refreshLive, rnd, S, setState } from './state.js';
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
export function blankState(seed){
  const s={v:3,age:FIRST_AGE,yearBase:AGES[FIRST_AGE].startYear,seed,rng:seed|0,valley:{seed},places:{},lines:{},crossing:null,foot:{},cottages:0,tick:6*6,agents:[],op:[],pair:{},grudge:{},cool:{},
     stores:{grain:160,flour:30,bread:30,missing:0},pantry:{},storm:0,fair:null,rumours:[],rid:0,log:[],annals:[],lastThief:-1,bareLogged:0,spoil:0,
     tech:{},gathers:[],gid:0,vacant:[],built:{},years:{},arms:{},election:null,nextElection:(YEAR_DAYS+2)*TPD,cases:[],cid:0,verdicts:[],era:0,reeveSince:null,lastElection:null,brawls:{},harvest:0,yearQ:.8+(((seed>>>3)%40)/100)};
  for(const {id} of IDEAS)s.tech[id]={state:'none',pressure:0,backers:[],opponents:[],adopters:[]};
  return s;
}
export function newTown(seed){
  setState(blankState(seed));
  placeFounding();
  FOLK.forEach((f,i)=>S.agents.push(makeAgent(i,f[0],f[1],f[2],{...f[3]},{age:f[4],sex:f[5]})));
  const A=i=>S.agents[i];
  A(0).spouse=1;A(1).spouse=0;A(2).spouse=3;A(3).spouse=2;
  A(5).parents=[4];A(7).parents=[6];A(13).parents=[0,1];A(14).parents=[2,3];
  const n=S.agents.length;
  for(let i=0;i<n;i++){S.op.push([]);for(let j=0;j<n;j++)S.op[i].push(i===j?0:Math.round((rnd()-.5)*16));}
  for(const a of S.agents)for(const b of S.agents)if(a!==b&&a.home===b.home)S.op[a.id][b.id]=45+Math.round(rnd()*15);
  Object.keys(P).filter(k=>P[k].home).forEach(k=>S.pantry[k]=3);
  const set=(i,j,v)=>{S.op[i][j]=v;};
  set(2,6,-48);set(6,2,-52);           // Tom the miller and Jonas the farmer: grain prices
  set(3,8,-32);set(8,3,-38);           // Martha and Bess, rival weavers
  set(5,7,66);set(7,5,64);             // Ned and Ruth, sweethearts
  set(11,12,58);set(12,11,60);         // Silas and Nell, old friends
  for(let j=0;j<n;j++)if(j!==9)S.op[9][j]=Math.max(S.op[9][j],20);
  set(1,10,-30);                       // Sam resents the reeve
  for(const c of [A(13),A(14)])for(const x of S.agents)if(x!==c&&!c.parents.includes(x.id)&&x.home!==c.home){
    S.op[c.id][x.id]=Math.round(c.parents.reduce((s,p)=>s+S.op[p][x.id],0)/c.parents.length*.5);}
  S.years[1]={startPop:n,births:0,deaths:0,weddings:0,era:0};
  refreshLive();
  for(const a of S.agents)for(const b of S.agents)if(a.id<b.id)checkPair(a,b,true);
  for(const a of S.agents)for(const b of S.agents)if(a!==b&&S.op[a.id][b.id]<-50)S.grudge[a.id+'-'+b.id]=1;
  S.pair['5-7']='friends';S.pair['11-12']='friends';S.pair['2-6']='feud';
  for(const a of S.agents)armsOf(familyKey(a));
  log(`Spring, and the first year of this chronicle. ${N(A(2))} the miller and ${N(A(6))} the farmer have not spoken civilly since the argument over grain prices last harvest.`,'event','prologue');
  log(`${N(A(3))} and ${N(A(8))} both weave for the same cloth merchant, and neither forgets it.`,'event','prologue');
  log(`Everyone knows ${N(A(5))} is sweet on ${N(A(7))}. Nobody has said so to ${N(A(6))}.`,'event','prologue');
  log(`Old ${N(A(9))} has delivered most of the children in Ashwood Fold. ${N(A(14))} will be fourteen soon and wants a trade.`,'event','prologue');
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
  const sx={};STRANGERS.forEach(s=>sx[s[0]]=s[1]);
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
