// Ported from the v5 prototype by tools/port-v5.mjs.
import { BOYS, GIRLS, SURNAMES } from '../data/folk.js';
import { ESSENTIAL, JOBS, MAXPOP, P, TPD, YEAR_DAYS } from '../data/world.js';
import { callElection, decideCase, tallyElection } from './civic.js';
import { faceOf } from './faces.js';
import { plan } from './life.js';
import { log } from './log.js';
import { makeAgent } from './setup.js';
import { adj, mem, op } from './social.js';
import { LIVE, N, PN, S, byJob, childrenOf, clamp, dayStart, household, isAdult, isKin, listNames, pick, pointIn, refreshLive, rnd, seasonOf, surname, techOn, yearOf } from './state.js';

export function yr(){const y=yearOf();return S.years[y]||(S.years[y]={startPop:LIVE.length,births:0,deaths:0,weddings:0});}
export function freeHome(){
  const homes=Object.keys(P).filter(k=>P[k].home);
  const empty=homes.filter(k=>household(k).length===0);
  return empty.find(k=>!P[k].plot||S.built[k])||empty[0]||null;
}
export function setHome(a,home){
  a.home=home;
  if(P[home].plot&&!S.built[home]){S.built[home]=true;log(`A new cottage goes up: ${PN(home)}.`,'event','work');}
}
export function nameBaby(sex,sur){
  const pool=sex==='f'?GIRLS:BOYS,taken=new Set(LIVE.map(a=>a.first));
  const free=pool.filter(n=>!taken.has(n));return (free.length?pick(free):pick(pool))+' '+sur;
}
export function addAgent(a,warmFrom){
  const id=a.id;S.op.forEach(r=>r.push(0));S.op.push(new Array(id+1).fill(0));S.agents.push(a);refreshLive();
  return a;
}
export function birth(mother,father){
  const sex=rnd()<.5?'f':'m',sur=surname(father)||surname(mother);
  const tr={};for(const k of ['temper','warmth','diligence','forgive','gossip','scruple'])tr[k]=clamp((mother.tr[k]+father.tr[k])/2+(rnd()-.5)*.35,.05,.95);
  const id=S.agents.length;
  const b=addAgent(makeAgent(id,nameBaby(sex,sur),'child',mother.home,tr,{age:0,sex,parents:[mother.id,father.id],born:S.tick}));
  b.hunger=.2;b.coins=0;
  for(const x of LIVE){if(x===b)continue;
    const fam=b.parents.includes(x.id)?75:x.home===b.home?45:Math.round((op(x,mother)+op(x,father))*.25);
    S.op[x.id][id]=fam;}
  mother.lastBirth=S.tick;yr().births++;faceOf(b);
  const mid=LIVE.find(a=>a.job==='herbalist'&&a!==mother);
  log(`${N(mother)} and ${N(father)} have a ${sex==='f'?'daughter':'son'}, ${N(b)}.${mid?` ${N(mid)} saw ${sex==='f'?'her':'him'} safely into the world.`:''}`,'life','birth',{ids:[b.id,mother.id,father.id]});
}
export function die(a,cause){
  cause=cause.replace('their',a.sex==='f'?'her':'his');
  a.dead={t:S.tick,cause,age:a.age};yr().deaths++;
  refreshLive();
  const sp=a.spouse>=0?S.agents[a.spouse]:null;
  if(sp&&!sp.dead){sp.spouse=-1;sp.widowOf=a.id;}
  // inheritance
  const heirs=sp&&!sp.dead?[sp]:childrenOf(a).filter(c=>!c.dead);
  const fallback=household(a.home);const to=heirs.length?heirs:fallback.length?fallback:[byJob('reeve')].filter(Boolean);
  if(to.length&&a.coins>0){const share=a.coins/to.length;for(const h of to)h.coins+=share;}a.coins=0;
  // mourning
  const mourners=LIVE.filter(b=>op(b,a)>40).sort((x,y)=>op(y,a)-op(x,a));
  for(const b of mourners){b.lonely=Math.min(1,b.lonely+.35);mem(b,a,'mourns');}
  const glad=LIVE.filter(b=>isAdult(b)&&op(b,a)<-55);
  const ageTxt=a.age<1?'in infancy':a.age<14?`aged only ${Math.floor(a.age)}`:`at the age of ${Math.floor(a.age)}`;
  let line=`${N(a)} the ${a.job==='child'?'child':a.job} died ${cause} ${ageTxt}.`;
  if(mourners[0])line+=` ${N(mourners[0])} is heartbroken.`;
  if(glad[0])line+=` ${N(glad[0])} sheds no tears.`;
  log(line,'life','death',{ids:[a.id]});
  // funeral tomorrow
  S.gathers.push({id:S.gid++,type:'funeral',who:a.id,place:'chapel',start:dayStart()+TPD+66,end:dayStart()+TPD+84});
  // rumours and ideas move on
  for(const id in S.tech){const t=S.tech[id];t.backers=t.backers.filter(i=>i!==a.id);t.opponents=t.opponents.filter(i=>i!==a.id);}
  succeed(a);
}
export function succeed(dead){
  const job=dead.job;if(!ESSENTIAL.includes(job))return;
  if(LIVE.some(a=>a.job===job))return;
  if(job==='reeve'){callElection(2,true);return;}
  const fieldsThin=LIVE.filter(a=>a.work==='fields').length<4;
  const kin=LIVE.filter(a=>isAdult(a)&&(a.parents.includes(dead.id)||a.home===dead.home)&&!ESSENTIAL.includes(a.job)&&!(fieldsThin&&a.work==='fields'));
  const loose=LIVE.filter(a=>isAdult(a)&&['labourer','farmhand','carter','pedlar','millhand'].includes(a.job));
  const heir=kin.sort((x,y)=>(y.parents.includes(dead.id)-x.parents.includes(dead.id))||(y.tr.diligence-x.tr.diligence))[0]||(rnd()<.6?loose.sort((x,y)=>y.tr.diligence-x.tr.diligence)[0]:null);
  if(heir){heir.prevJob=heir.job;heir.job=job;heir.work=JOBS[job];
    log(`${N(heir)} takes on ${PN(JOBS[job])} after ${N(dead)}.`,'event','work',{ids:[heir.id]});}
  else{S.vacant.push({job,since:S.tick});log(`With ${N(dead)} gone, nobody in the village can take on ${PN(JOBS[job])}.`,'bad','work');}
}
export function arrive(job,reason){
  if(LIVE.length>=MAXPOP)return null;
  const sex=rnd()<.5?'f':'m',name=nameBaby(sex,pick(SURNAMES));
  const tr={temper:.2+rnd()*.6,warmth:.2+rnd()*.7,diligence:.35+rnd()*.6,forgive:.2+rnd()*.7,gossip:.2+rnd()*.7,scruple:.3+rnd()*.65};
  const home=job==='innkeeper'?'tavern':(freeHome()||'tavern');
  const id=S.agents.length;
  const s=addAgent(makeAgent(id,name,job,'tavern',tr,{age:20+rnd()*22,sex,hue:330}));
  setHome(s,home);s.coins=8;s.arrivedAt=S.tick;
  s.x=s.px=.5;s.y=s.py=13;s.arrived=false;s.act={type:'stroll',place:home,left:2,target:null};const q=pointIn(P[home]);s.tx=q[0];s.ty=q[1];
  for(const a of LIVE)if(a!==s){S.op[a.id][id]=Math.round(-10+a.tr.warmth*20+(rnd()-.5)*10);S.op[id][a.id]=Math.round((rnd()-.4)*14);}
  log(`${N(s)} arrives along the carters' road ${reason}, and settles at ${PN(home)}.`,'event','arrival',{ids:[id]});
  return s;
}
export function comeOfAge(a){
  const pars=a.parents.map(i=>S.agents[i]);
  const crafts=['baker','miller','smith','innkeeper','weaver','farmer','herbalist','carter'];
  const par=pars.filter(p=>crafts.includes(p.job)).sort((x,y)=>LIVE.filter(b=>b.job===x.job).length-LIVE.filter(b=>b.job===y.job).length)[0];
  let job;
  if(techOn('cottonmill')&&household(a.home).reduce((s,x)=>s+x.coins,0)<8&&rnd()<.6)job='millhand';
  else if(par)job=par.job==='farmer'?'farmer':par.job;
  else job=pick(['labourer','farmhand','carter']);
  a.job=job;a.work=JOBS[job];a.coins=2;
  if(job==='weaver'&&par&&S.tech.shuttle.adopters.includes(par.id))S.tech.shuttle.adopters.push(a.id);
  log(`${N(a)} turns fourteen and starts work as a ${job}${par&&job===par.job?`, alongside ${par.dead?'the memory of ':''}${N(par)}`:''}.`,'event','work',{ids:[a.id]});
}
export function lifeDay(){
  const winter=seasonOf()===3;
  for(const a of [...LIVE]){
    const before=a.age;a.age+=1/YEAR_DAYS;
    if(before<14&&a.age>=14&&a.job==='child')comeOfAge(a);
    if(techOn('steam')){const ex=a.job==='millhand'?.0012*(1+Math.max(0,a.age-30)/20):.00025;if(rnd()<ex){die(a,'of the mill cough');continue;}}
    let hz=.004+Math.pow(Math.max(0,a.age-58),2)*.0025;if(winter&&a.age>60)hz*=1.6;
    let p=hz/YEAR_DAYS,cause=winter&&a.age>55?'of the winter cold':a.age>75?'peacefully in their sleep':pick(['after a short illness','of a fever','in their sleep']);
    a.starve=a.hunger>=.98?(a.starve||0)+1:0;
    if(a.starve>=2){p+=(a.age<5||a.age>60?.012:.005)*a.starve;cause='of want';}
    if(rnd()<p)die(a,cause);
  }
  // births
  if(LIVE.length<MAXPOP)for(const m of LIVE){
    if(m.sex!=='f'||m.age<18||m.age>42||m.spouse<0)continue;
    const f=S.agents[m.spouse];if(f.dead||f.sex!=='m')continue;
    if(S.tick-(m.lastBirth||-1e9)<TPD*YEAR_DAYS)continue;
    if(household(m.home).length>=6)continue;
    if(rnd()<.03*(op(m,f)>40?1:.4))birth(m,f);
  }
  // weddings
  for(const k in S.pair){
    if(!k.endsWith('c')||S.pair[k.slice(0,-1)+'w'])continue;
    const [i,j]=k.slice(0,-1).split('-').map(Number),x=S.agents[i],y=S.agents[j];
    if(!x||!y||x.dead||y.dead||x.spouse>=0||y.spouse>=0){delete S.pair[k];continue;}
    if(op(x,y)>70&&op(y,x)>70&&rnd()<.18){
      S.pair[k.slice(0,-1)+'w']=1;
      S.gathers.push({id:S.gid++,type:'wedding',ids:[i,j],place:'chapel',start:dayStart()+TPD+66,end:dayStart()+TPD+84});
      log(`The banns are read: ${N(x)} and ${N(y)} will marry at the Chapel tomorrow.`,'good');
    }
  }
  // vacancies and newcomers
  for(const v of [...S.vacant]){
    if(LIVE.some(a=>a.job===v.job)){S.vacant.splice(S.vacant.indexOf(v),1);continue;}
    if(S.tick-v.since>=TPD*2&&arrive(v.job,`to take on ${PN(JOBS[v.job])}`))S.vacant.splice(S.vacant.indexOf(v),1);
  }
}
export function gatherTick(){
  for(const g of [...S.gathers]){
    if(S.tick===g.start){
      if(g.type==='wedding'){const [x,y]=g.ids.map(i=>S.agents[i]);if(x.dead||y.dead){S.gathers.splice(S.gathers.indexOf(g),1);continue;}log(`The chapel bell rings for ${N(x)} and ${N(y)}.`,'good');}
      else if(g.type==='funeral')log(`The chapel bell tolls for ${N(S.agents[g.who])}.`,'life');
      else if(g.type==='court')log('The court is in session at the Moot Hall.','event');
      else log('The doors of the Moot Hall open for the vote.','event');
      for(const a of LIVE)if(!(a.act.type==='sleep'&&a.arrived)&&a.act.type!=='gather')plan(a);
    }
    if(S.tick===g.end){
      const came=LIVE.filter(a=>a.act.type==='gather'&&a.act.target===g.id);
      if(g.type==='wedding'){
        const [x,y]=g.ids.map(i=>S.agents[i]);
        if(!x.dead&&!y.dead){
          x.spouse=y.id;y.spouse=x.id;adj(x,y,10);adj(y,x,10);yr().weddings++;
          const fh=freeHome(),xs=household(x.home).length,ys=household(y.home).length;
          let home;
          if((x.home==='tavern'||y.home==='tavern'||Math.min(xs,ys)>=3)&&fh)home=fh;
          else home=xs<=ys?x.home:y.home;
          if(home==='tavern'&&fh)home=fh;
          setHome(x,home);setHome(y,home);
          const away=LIVE.filter(a=>isAdult(a)&&!came.includes(a)&&(isKin(a,x)||isKin(a,y)||Math.min(op(a,x),op(a,y))<-35)).slice(0,3);
          log(`${N(x)} and ${N(y)} were married at the Chapel, with ${came.length>LIVE.length*.6?'most of the village':came.length>3?`${came.length} people`:'only a handful'} looking on.${away.length?` ${listNames(away)} stayed away.`:''} They will live at ${PN(home)}.`,'good','wedding',{ids:[x.id,y.id]});
        }
      }else if(g.type==='election'){tallyElection();
      }else if(g.type==='court'){const js=g.jurors.map(i=>S.agents[i]).filter(j=>!j.dead);for(const c of g.cases)decideCase(c,js);
      }else{
        const d=S.agents[g.who];
        const away=LIVE.filter(a=>isAdult(a)&&!came.includes(a)&&(isKin(a,d)||op(a,d)<-40)).slice(0,3);
        log(`${N(d)} was buried in the chapel yard. ${came.length>LIVE.length*.6?'Nearly the whole village came.':came.length>2?`${came.length} mourners stood at the graveside.`:'Few came.'}${away.length?` ${listNames(away)} did not.`:''}`,'life','funeral',{ids:[d.id]});
      }
      S.gathers.splice(S.gathers.indexOf(g),1);
    }
  }
}
