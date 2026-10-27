<script>
(()=>{
'use strict';
const TPD=144, W=40, H=26, SPEED=3.5, SAVEKEY='ashworth-fold-v1', SEASON_DAYS=5, YEAR_DAYS=20, MAXPOP=26;
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SEASONS=['Spring','Summer','Autumn','Winter'];
const LIGHT=[[6,20],[5,21.5],[6.5,19.5],[7.5,17.5]];
const FARM=[.45,.9,2.2,0];
const P={
  holt:{name:'Holt Cottage',x:3,y:3,w:4,h:3,indoor:true,home:true},
  pendle:{name:'Pendle Cottage',x:9,y:3,w:4,h:3,indoor:true,home:true},
  barrow:{name:'Barrow Cottage',x:3,y:9,w:4,h:3,indoor:true,home:true},
  fair:{name:'Fairclough Farmhouse',x:29,y:3,w:4,h:3,indoor:true,home:true},
  calder:{name:'Calder Cottage',x:34,y:3,w:4,h:3,indoor:true,home:true},
  greaves:{name:'Greaves House',x:34,y:9,w:4,h:3,indoor:true,home:true},
  plot1:{name:'Market Row Cottage',x:19,y:20.6,w:4,h:3,indoor:true,home:true,plot:true},
  plot2:{name:'Lane End Cottage',x:.2,y:14.2,w:2.5,h:3,indoor:true,home:true,plot:true},
  tavern:{name:'The Plough',x:16,y:3,w:6,h:4,indoor:true},
  bakery:{name:'the Bakehouse',x:24,y:4,w:4,h:3,indoor:true},
  hall:{name:'the Moot Hall',x:28,y:8,w:4,h:3,indoor:true},
  square:{name:'the Green',x:16,y:10,w:8,h:6,indoor:false},
  forge:{name:'the Forge',x:10,y:9,w:4,h:3,indoor:true},
  weaving:{name:'the Weaving Shed',x:26,y:12,w:5,h:4,indoor:true},
  chapel:{name:'the Chapel',x:3,y:14,w:4,h:4,indoor:true},
  garden:{name:'the Physic Garden',x:9,y:15,w:5,h:3,indoor:false},
  market:{name:'the Market Cross',x:16,y:17,w:6,h:3,indoor:false},
  mill:{name:'the Watermill',x:3,y:19,w:5,h:4,indoor:true},
  fields:{name:'the South Fields',x:24,y:18,w:12,h:5,indoor:false},
  wharf:{name:'the Canal Wharf',x:12.8,y:.9,w:4,h:2.1,indoor:false,tech:'canal'},
  school:{name:'the School',x:33,y:14,w:4,h:3,indoor:true,tech:'school'},
  cottonmill:{name:'the Cotton Mill',x:11.5,y:20.2,w:6,h:3.4,indoor:true,tech:'cottonmill'}
};
const BARN={x:36.4,y:18,w:3.3,h:4.2};
const JOBS={baker:'bakery',miller:'mill',labourer:'mill',weaver:'weaving',smith:'forge',farmhand:'fields',farmer:'fields',herbalist:'garden',reeve:'hall',carter:'market',innkeeper:'tavern',pedlar:'market',millhand:'cottonmill',navvy:'wharf',child:null};
const ESSENTIAL=['baker','miller','smith','innkeeper','reeve','herbalist'];
const HUES={holt:12,pendle:208,barrow:36,fair:128,calder:285,greaves:172,tavern:52,plot1:240,plot2:95,stranger:330};
const FOLK=[
 ['Ada Holt','baker','holt',{temper:.35,warmth:.6,diligence:.85,forgive:.5,gossip:.4,scruple:.8},34,'f'],
 ['Sam Holt','labourer','holt',{temper:.6,warmth:.45,diligence:.4,forgive:.4,gossip:.3,scruple:.35},37,'m'],
 ['Tom Pendle','miller','pendle',{temper:.75,warmth:.3,diligence:.7,forgive:.2,gossip:.35,scruple:.55},52,'m'],
 ['Martha Pendle','weaver','pendle',{temper:.4,warmth:.5,diligence:.6,forgive:.4,gossip:.85,scruple:.6},48,'f'],
 ['Eli Barrow','smith','barrow',{temper:.55,warmth:.4,diligence:.8,forgive:.6,gossip:.15,scruple:.75},46,'m'],
 ['Ned Barrow','farmhand','barrow',{temper:.3,warmth:.75,diligence:.35,forgive:.7,gossip:.5,scruple:.4},19,'m'],
 ['Jonas Fairclough','farmer','fair',{temper:.65,warmth:.35,diligence:.75,forgive:.25,gossip:.3,scruple:.7},51,'m'],
 ['Ruth Fairclough','farmer','fair',{temper:.3,warmth:.7,diligence:.65,forgive:.65,gossip:.55,scruple:.7},18,'f'],
 ['Bess Calder','weaver','calder',{temper:.5,warmth:.4,diligence:.7,forgive:.3,gossip:.7,scruple:.5},39,'f'],
 ['Agnes Calder','herbalist','calder',{temper:.15,warmth:.85,diligence:.55,forgive:.85,gossip:.25,scruple:.9},68,'f'],
 ['Walter Greaves','reeve','greaves',{temper:.45,warmth:.3,diligence:.6,forgive:.35,gossip:.45,scruple:.85},61,'m'],
 ['Silas Wren','carter','greaves',{temper:.4,warmth:.6,diligence:.45,forgive:.55,gossip:.65,scruple:.45},42,'m'],
 ['Nell Hesketh','innkeeper','tavern',{temper:.35,warmth:.7,diligence:.7,forgive:.5,gossip:.9,scruple:.6},45,'f'],
 ['Kit Holt','child','holt',{temper:.5,warmth:.6,diligence:.45,forgive:.5,gossip:.5,scruple:.5},9,'m'],
 ['Lottie Pendle','child','pendle',{temper:.55,warmth:.45,diligence:.7,forgive:.3,gossip:.6,scruple:.6},13.7,'f']
];
const STRANGERS=[['Mercy Ogden','f'],['Caleb Thorne','m'],['Ivo Lark','m'],['Hester Quayle','f'],['Abel Royle','m']];
const GIRLS=['Hannah','Alice','Mary','Jane','Ellen','Grace','Betty','Ann','Peggy','Lydia','Sarah','Esther','Nancy','Kitty','Rose','Dolly','Harriet','Molly','Susan','Martha'];
const BOYS=['John','William','James','Thomas','Joseph','Richard','Henry','George','Robert','Edward','Samuel','Peter','Isaac','Matthew','Daniel','Luke','Jacob','Edwin','Walter','Arthur'];
const SURNAMES=['Haworth','Entwistle','Birtwistle','Pilling','Cottam','Sumner','Gregson','Whiteside','Rigby','Duckworth','Ashcroft','Seddon'];
const RUMOURS=['has been watering the ale','was seen leaving the Bakehouse after dark with a full sack','owes money all over the village','has been speaking ill of the reeve','cheats with false weights at market','was heard cursing the chapel'];
const TECH={
  plough:{name:'Heavy plough',what:'turns the clay deeper so the South Fields yield more',jobs:['farmer','farmhand','smith'],need:5,cost:30,req:[],hint:'Talk of thin harvests'},
  millstone:{name:'Second millstone',what:'lets the Watermill grind twice the corn',jobs:['miller','labourer','smith'],need:5,cost:35,req:[],hint:'Grumbling about bare shelves'},
  barn:{name:'Tithe barn',what:'keeps a whole harvest dry through the winter',jobs:['farmer','reeve','carter'],need:6,cost:45,req:[],hint:'Worry about where to store the corn'},
  shuttle:{name:'Flying shuttle',what:'lets one weaver do the work of two',jobs:['weaver','smith'],need:3,cost:16,req:[],hint:'The cloth merchant wants more cloth'},
  school:{name:'Village school',what:'teaches the children their letters, and the village to question idle talk',jobs:['herbalist','reeve','innkeeper'],need:6,cost:40,req:[],hint:'Concern about idle talk and idle children'},
  canal:{name:'Canal',what:'links the valley to the towns, bringing coal and corn by boat',jobs:['carter','reeve','miller','smith'],need:9,cost:140,req:['cottonmill'],hint:'Talk of a canal cut through the next valley',build:10,navvies:3},
  steam:{name:'Steam engine',what:'drives the cotton mill with coal instead of the river',jobs:['smith','millhand','miller'],need:7,cost:120,req:['canal'],hint:'The mill wants more power than the river gives',build:3},
  railway:{name:'Railway',what:'puts Ashwood Fold an hour from Manchester',jobs:['reeve','smith','carter','miller'],need:10,cost:180,req:['steam'],hint:'Surveyors have been seen on the fells',build:10,navvies:4},
  cottonmill:{name:'Cotton mill',what:'spins thread by water power down by the river',jobs:['miller','weaver','smith'],need:8,cost:90,req:['shuttle','millstone'],hint:'Talk of the new mills in the next valley'}
};

let S=null, sel=-1, LIVE=[];

// ---------- RNG & time ----------
function rnd(){S.rng=(S.rng+0x6D2B79F5)|0;let t=S.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
const hourOf=(t=S.tick)=>(t%TPD)/6;
const dayOf=(t=S.tick)=>Math.floor(t/TPD)+1;
const yearOf=(t=S.tick)=>Math.floor((dayOf(t)-1)/YEAR_DAYS)+1;
const seasonOf=(t=S.tick)=>Math.floor(((dayOf(t)-1)%YEAR_DAYS)/SEASON_DAYS);
const dayInSeason=(t=S.tick)=>((dayOf(t)-1)%SEASON_DAYS)+1;
const seasonName=(t=S.tick)=>`${SEASONS[seasonOf(t)]}, Year ${yearOf(t)}`;
const weekday=(t=S.tick)=>DAYS[(dayOf(t)-1)%7];
const isSunday=()=>(dayOf()-1)%7===6;
const dayStart=(t=S.tick)=>t-(t%TPD);
function fmtTime(t){const m=(t%TPD)*10;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=arr=>arr[Math.floor(rnd()*arr.length)];
const N=a=>`<span class="who" data-id="${a.id}">${a.first}</span>`;
const PN=id=>P[id].name;
function listNames(arr){const n=arr.map(N);return n.length<2?n.join(''):n.slice(0,-1).join(', ')+' and '+n[n.length-1];}
function pointIn(p){return [p.x+0.7+rnd()*(p.w-1.4), p.y+0.7+rnd()*(p.h-1.4)];}
function refreshLive(){LIVE=S.agents.filter(a=>!a.dead);}
const isAdult=a=>a.age>=14;
const stage=a=>a.age<4?'infant':a.age<14?'child':'adult';
const surname=a=>a.name.split(' ').slice(1).join(' ');
const jobLabel=a=>a.dead?(a.job==='child'?'child':a.job):a.age<4?'baby':a.job;
const hueOf=a=>(a.home==='tavern'&&a.job!=='innkeeper')?a.hue:(HUES[a.home]??a.hue);
const techOn=id=>S.tech[id]&&S.tech[id].state==='built'&&!(S.tech[id].brokenUntil>S.tick);
const techBuilt=id=>S.tech[id]&&S.tech[id].state==='built';
const placeShown=id=>{const p=P[id];if(p.tech)return techBuilt(p.tech)||(S.tech[p.tech]&&S.tech[p.tech].state==='building');if(p.plot)return !!S.built[id];return true;};
const household=h=>LIVE.filter(a=>a.home===h);
const childrenOf=a=>S.agents.filter(c=>c.parents.includes(a.id));
function isKin(a,b){if(a.parents.includes(b.id)||b.parents.includes(a.id))return true;return a.parents.some(p=>b.parents.includes(p));}

// ---------- setup ----------
function makeAgent(id,name,job,home,tr,o){
  o=o||{};const pt=pointIn(P[home]||P.tavern);
  return {id,name,first:name.split(' ')[0],job,home,work:JOBS[job]||null,hue:o.hue??HUES[home]??330,
    x:pt[0],y:pt[1],px:pt[0],py:pt[1],tx:pt[0],ty:pt[1],arrived:true,at:home,
    act:{type:'sleep',place:home,left:0,target:null},
    hunger:.25+rnd()*.25,tired:.12,lonely:.25+rnd()*.2,coins:job==='child'?0:4+Math.floor(rnd()*6),tipsy:0,
    tr,mem:[],knows:[],glyph:null,age:o.age??30,sex:o.sex||'f',spouse:-1,parents:o.parents||[],born:o.born??null,dead:null,prevJob:null};
}
function blankState(seed){
  const s={v:2,seed,rng:seed|0,tick:6*6,agents:[],op:[],pair:{},grudge:{},cool:{},
     stores:{grain:160,flour:30,bread:30,missing:0},pantry:{},storm:0,fair:null,rumours:[],rid:0,log:[],annals:[],lastThief:-1,bareLogged:0,spoil:0,
     tech:{},gathers:[],gid:0,vacant:[],built:{},years:{},arms:{},election:null,nextElection:(YEAR_DAYS+2)*TPD,cases:[],cid:0,verdicts:[],era:0,reeveSince:null,lastElection:null,brawls:{},harvest:0,yearQ:.8+(((seed>>>3)%40)/100)};
  for(const id in TECH)s.tech[id]={state:'none',pressure:0,backers:[],opponents:[],adopters:[]};
  return s;
}
function newTown(seed){
  S=blankState(seed);
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
function ensureState(o){
  const fresh=blankState(o.seed||1);
  for(const k in fresh)if(o[k]===undefined)o[k]=fresh[k];
  for(const id in TECH)if(!o.tech[id])o.tech[id]={state:'none',pressure:0,backers:[],opponents:[],adopters:[]};
  if(o.nextElection<o.tick)o.nextElection=o.tick+3*TPD+TPD;
  return o;
}
function migrate(o){
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

// ---------- log ----------
function log(h,k,cat,extra){
  S.log.push({t:S.tick,k:k||'event',h});if(S.log.length>400)S.log.splice(0,S.log.length-400);
  if(cat){S.annals.push(Object.assign({t:S.tick,k:k||'event',h,c:cat},extra||{}));if(S.annals.length>2500)S.annals.splice(0,S.annals.length-2500);}
}

// ---------- relationships ----------
const op=(a,b)=>S.op[a.id][b.id];
function adj(a,b,d){if(a===b||a.dead||b.dead)return;S.op[a.id][b.id]=clamp(S.op[a.id][b.id]+d,-100,100);checkPair(a,b);}
function mem(a,b,text,place){a.mem.unshift({w:b?b.id:-1,t:text,d:dayOf(),p:place||null});if(a.mem.length>8)a.mem.length=8;}
function glyph(a,c,k){a.glyph={c,k,until:S.tick+5};}
function canCourt(x,y){return isAdult(x)&&isAdult(y)&&x.age>=16&&y.age>=16&&Math.abs(x.age-y.age)<=18&&x.spouse<0&&y.spouse<0&&!isKin(x,y)&&x.home!==y.home;}
function checkPair(a,b,quiet){
  const lo=Math.min(a.id,b.id),hi=Math.max(a.id,b.id),key=lo+'-'+hi;
  const x=S.agents[lo],y=S.agents[hi];if(x.dead||y.dead)return;
  const oxy=S.op[lo][hi],oyx=S.op[hi][lo],st=S.pair[key]||'none';
  const kids=!isAdult(x)||!isAdult(y);
  if(st!=='friends'&&oxy>60&&oyx>60){S.pair[key]='friends';if(!quiet&&x.home!==y.home&&!(kids&&rnd()<.6))log(pick([`${N(x)} and ${N(y)} have become fast friends.`,`It is plain to everyone that ${N(x)} and ${N(y)} are thick as thieves now.`,`${N(x)} and ${N(y)} are seldom seen apart these days.`]),'good',kids?null:'friend',{ids:[lo,hi]});}
  else if(st==='friends'&&oxy>85&&oyx>85&&!S.pair[key+'c']&&canCourt(x,y)){S.pair[key+'c']=1;if(!quiet)log(`${N(x)} and ${N(y)} have been seen walking out together along the river.`,'good','love',{ids:[lo,hi]});}
  else if(st==='friends'&&(oxy<15||oyx<15)){S.pair[key]='none';if(S.pair[key+'c']&&!S.pair[key+'w'])delete S.pair[key+'c'];if(!quiet)log(pick([`The friendship between ${N(x)} and ${N(y)} has gone sour.`,`${N(x)} and ${N(y)} were friends once. Not any more.`]),'bad',kids?null:'feud',{ids:[lo,hi]});}
  else if(st!=='feud'&&oxy<-50&&oyx<-50){S.pair[key]='feud';if(!quiet)log(pick([`Bad blood: ${N(x)} and ${N(y)} are openly at odds.`,`${N(x)} and ${N(y)} can no longer stand to be in the same room.`,`A feud has opened between ${N(x)} and ${N(y)}.`]),'bad','feud',{ids:[lo,hi],feud:1});}
  else if(st==='feud'&&oxy>-10&&oyx>-10){S.pair[key]='none';if(!quiet)log(pick([`${N(x)} and ${N(y)} have patched things up.`,`The feud between ${N(x)} and ${N(y)} is over, for now.`]),'good','feud',{ids:[lo,hi]});}
  for(const [p,q] of [[a,b],[b,a]]){
    const gk=p.id+'-'+q.id,o=S.op[p.id][q.id];
    if(!S.grudge[gk]&&o<-50){S.grudge[gk]=1;if(!quiet&&S.pair[key]!=='feud')log(`${N(p)} now holds a grudge against ${N(q)}.`,'bad');}
    else if(S.grudge[gk]&&o>-20){delete S.grudge[gk];if(!quiet&&rnd()<.6)log(`${N(p)} has let go of an old grievance with ${N(q)}.`,'good');}
  }
}
function worstFoe(a){let w=null,lo=-40;for(const b of LIVE)if(b!==a&&op(a,b)<lo){lo=op(a,b);w=b;}return w;}
function avoid(a,place){let s=0;for(const b of LIVE)if(b!==a&&b.act.place===place&&b.act.type!=='sleep'){const o=op(a,b);if(o<-40)s+=(-o/100)*.55*(1-a.tr.temper);}return s;}
function pull(a,place){let s=0;for(const b of LIVE)if(b!==a&&b.act.place===place&&b.act.type!=='sleep'&&op(a,b)>40)s+=.12;return Math.min(.35,s);}
const byJob=j=>LIVE.find(a=>a.job===j);
function pantryOf(a){return a.home==='tavern'?Math.floor(S.stores.bread):(S.pantry[a.home]||0);}
function takePantry(a){if(a.home==='tavern'){if(S.stores.bread>=1){S.stores.bread-=1;return true;}return false;}if((S.pantry[a.home]||0)>=1){S.pantry[a.home]--;return true;}return false;}
const fairOn=()=>S.fair&&S.tick>=S.fair.start&&S.tick<S.fair.end;
const grainCap=()=>techOn('barn')?750:400;
