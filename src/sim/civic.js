// Ported from the v5 prototype by tools/port-v5.mjs.
import { SURNAMES } from '../data/folk.js';
import { IDEA, IDEAS } from '../data/ideas.js';
import { currentEra, effect, invalidateEffects } from './effects.js';
import { easeRivals, honourInventor, raiseBuildings } from './ideas.js';
import { noteIdea } from './crossroads.js';
import { JOBS, MAXPOP, TPD, YEAR_DAYS } from '../data/world.js';
import { familyKey } from './heraldry.js';
import { log } from './log.js';
import { addAgent, nameBaby, succeed } from './people.js';
import { makeAgent } from './setup.js';
import { adj, glyph, mem, op } from './social.js';
import { byJob, currentAge, dayStart, isAdult, isKin, listNames, LIVE, N, numberWord, P, pick, PN, pointIn, refreshLive, rnd, S, weekday, entryPoint } from './state.js';

export function standing(a){const v=LIVE.filter(b=>b!==a&&isAdult(b));return v.reduce((s,b)=>s+op(b,a),0)/Math.max(1,v.length);}
export function ambition(a){return a.tr.diligence*.4+(1-a.tr.warmth)*.25+a.tr.temper*.15+(a.coins>40?.15:0);}
export function voters(){return (LIVE.filter(a=>a.age>=18));}
export function voteScore(v,c,noise){
  if(v===c)return 999;
  let s=op(v,c);
  if(familyKey(v)===familyKey(c))s+=25;
  if(isKin(v,c)||v.spouse===c.id)s+=30;
  if(c.job==='reeve'){
    if(v.mem.some(m=>m.w===c.id&&m.t==='demanded dues I could not pay'))s-=20;
    if(v.mem.some(m=>m.w===c.id&&m.t==='put me in the stocks'))s-=40;
  }
  const L=S.election&&S.election.lean[v.id];if(L&&L[c.id])s+=L[c.id];
  if(noise)s+=(rnd()-.5)*12;
  return s;
}
export function favourite(v,noise){
  const e=S.election;if(!e)return null;let best=null,bs=-1e9;
  for(const id of e.cands){const c=S.agents[id];if(c.dead)continue;const s=voteScore(v,c,noise);if(s>bs){bs=s;best=id;}}
  return best;
}
export function callElection(days,by){
  if(S.election)return;
  if(voters().length<3)return;
  const inc=byJob('reeve');
  const ess=['baker','miller','smith','innkeeper','herbalist'];
  const pool=LIVE.filter(a=>a.age>=21&&a.age<72&&a!==inc&&!(ess.includes(a.job)&&LIVE.filter(b=>b.job===a.job).length<2));
  const scored=pool.map(a=>({a,s:standing(a)/100+ambition(a)+rnd()*.3})).sort((x,y)=>y.s-x.s);
  const cands=[];if(inc&&inc.age<74)cands.push(inc.id);
  for(const c of scored){if(cands.length>=3)break;if(c.s>.55||cands.length<2)cands.push(c.a.id);}
  if(!cands.length)return;
  const vote=dayStart()+days*TPD+78;
  S.election={cands,vote,lean:{},by:!!by};
  S.gathers.push({id:S.gid++,type:'election',place:'hall',start:vote,end:vote+18});
  const names=cands.map(i=>S.agents[i]);
  log(`${by?'With no reeve, Ashwood Fold must choose one.':`${inc?N(inc)+"'s":"The reeve's"} term is up.`} ${names.length>1?`${listNames(names)} will stand`:`${N(names[0])} stands unopposed`}. The vote is in ${days} days at the Moot Hall.`,'nudge','politics',{ids:cands});
}
export function canvass(a,b){
  const e=S.election;if(!e||a.age<18||b.age<18)return false;
  const isCand=e.cands.includes(a.id);
  if(rnd()>(isCand?.55:.22))return false;
  const fav=favourite(a,false);if(fav==null||b.id===fav||e.cands.includes(b.id))return false;
  const c=S.agents[fav],trust=(op(b,a)+100)/200,L=(e.lean[b.id]||(e.lean[b.id]={}));
  L[fav]=(L[fav]||0)+(isCand?9:6)*trust*effect('canvassWeight');
  glyph(a,'…','rumour');
  if(isCand&&rnd()<.12)log(`${N(a)} asks ${N(b)} for a vote at ${PN(a.at)}.`,'event');
  else if(!isCand&&rnd()<.05)log(`${N(a)} has been telling ${N(b)} to vote for ${N(c)}.`,'event');
  return true;
}
export function campaignRound(a){
  const e=S.election;if(!e||!e.cands.includes(a.id)||a.coins<12||S.tick<=(a.roundAt||0)||rnd()>.4)return false;
  const here=LIVE.filter(b=>b!==a&&b.at==='tavern'&&b.arrived&&b.act.type!=='sleep'&&b.age>=18);if(here.length<2)return false;
  a.roundAt=S.tick+TPD;a.coins-=here.length;const k=byJob('innkeeper');if(k&&k!==a)k.coins+=here.length;
  for(const b of here){const L=(e.lean[b.id]||(e.lean[b.id]={}));L[a.id]=(L[a.id]||0)+5;b.tipsy=1;}
  log(`${N(a)} stands a round at The Plough and reminds everyone when the vote is.`,'event');return true;
}
export function tallyElection(){
  const e=S.election;S.election=null;S.nextElection=S.tick+2*YEAR_DAYS*TPD;
  const cands=e.cands.map(i=>S.agents[i]).filter(c=>!c.dead);if(!cands.length)return;
  const inc=byJob('reeve');
  const votes={};for(const c of cands)votes[c.id]=0;
  const ballots=[];
  if(cands.length>1){S.election=e;for(const v of voters()){const f=favourite(v,true);if(f!=null&&votes[f]!=null){votes[f]++;ballots.push([v,S.agents[f]]);mem(v,S.agents[f],'voted for');}}S.election=null;}
  const order=[...cands].sort((x,y)=>votes[y.id]-votes[x.id]||y.age-x.age),win=order[0];
  if(inc&&inc!==win){inc.job=inc.prevJob&&inc.prevJob!=='reeve'?inc.prevJob:'labourer';inc.work=JOBS[inc.job];}
  if(win.job!=='reeve'){win.prevJob=win.job;win.job='reeve';win.work='hall';}
  S.reeveSince=S.tick;S.lastElection={t:S.tick,res:order.map(c=>[c.id,votes[c.id]])};
  for(const [v,c] of ballots)if(c===win)adj(win,v,3);
  for(const l of order.slice(1)){adj(l,win,-8*(.5+l.tr.temper));if(l.tr.temper>.6&&rnd()<.5)mem(l,win,'stole the election from me');}
  let line;
  if(cands.length===1)line=`${N(win)} is confirmed as reeve, unopposed.`;
  else{
    line=`Election day at the Moot Hall. ${N(win)} is chosen as reeve with ${votes[win.id]} votes${order.slice(1).map(c=>`, ${N(c)} ${votes[c.id]}`).join('')}.`;
    if(inc&&inc!==win)line+=` ${N(inc)} goes back to ${inc.job} work.`;
    else if(inc===win)line+=` ${N(win)} keeps the office.`;
    if(order[1]&&votes[order[1].id]===votes[win.id])line+=` The vote is tied, and the office goes to the elder.`;
    const turn=ballots.find(([v,c])=>c===win&&!e.cands.includes(v.id)&&order.slice(1).some(l=>(isKin(v,l)||v.spouse===l.id||v.home===l.home)));
    if(turn)line+=` Even ${N(turn[0])} voted against family.`;
  }
  log(line,'nudge','politics',{ids:order.map(c=>c.id),election:1});
}
export function bringCase(accused,accuser,charge,evidence,truth){
  if(!accused||accused.dead||!isAdult(accused))return;
  const kind=charge.split(' at ')[0];
  if(S.cases.some(c=>c.accused===accused.id&&c.charge.split(' at ')[0]===kind))return;
  S.cases.push({id:S.cid++,accused:accused.id,accuser:accuser?accuser.id:null,charge,evidence,truth:!!truth,filed:S.tick});
}
export function scheduleCourt(){
  S.cases=S.cases.filter(c=>!S.agents[c.accused].dead);
  if(!S.cases.length||!byJob('reeve')||S.gathers.some(g=>g.type==='court'))return;
  const cases=S.cases.splice(0,3);
  const parties=new Set();for(const c of cases){parties.add(c.accused);if(c.accuser!=null)parties.add(c.accuser);}
  const close=a=>[...parties].some(i=>{const p=S.agents[i];return isKin(a,p)||a.spouse===p.id||a.home===p.home;});
  const pool=LIVE.filter(a=>a.age>=18&&!parties.has(a.id)&&a.job!=='reeve'&&!close(a));if(pool.length<3){S.cases.unshift(...cases);return;}
  const jurors=[];while(jurors.length<Math.min(5,pool.length)){const j=pick(pool);if(!jurors.includes(j.id))jurors.push(j.id);}
  S.gathers.push({id:S.gid++,type:'court',place:'hall',start:dayStart()+84,end:dayStart()+100,cases,jurors});
  log(`The court will sit at the Moot Hall this afternoon. ${cases.map(c=>`${N(S.agents[c.accused])} is accused of ${c.charge}`).join('; ')}.`,'nudge');
}
export function decideCase(c,jurors){
  const acc=S.agents[c.accused],plf=c.accuser!=null?S.agents[c.accuser]:null,reeve=byJob('reeve');
  if(acc.dead)return;
  const juryBias=effect('juryBias');
  let confessed=false;
  if(c.truth&&acc.tr.scruple>.7&&rnd()<.35)confessed=true;
  const votes=jurors.map(j=>{
    let p=c.evidence;const bias=((plf&&!plf.dead?op(j,plf):0)-op(j,acc))/100*juryBias;p+=bias;
    if(S.rumours.some(r=>r.subject===acc.id&&j.knows.includes(r.id)))p+=.15;
    if(reeve&&reeve!==j)p+=((plf?op(reeve,plf):0)-op(reeve,acc))/100*.15;
    if(isKin(j,acc)||j.home===acc.home||j.spouse===acc.id)p-=.5;
    if(plf&&(isKin(j,plf)||j.home===plf.home||j.spouse===plf.id))p+=.3;
    p+=(rnd()-.5)*.3;
    return {j,g:confessed||p>.5,bias};
  });
  const g=votes.filter(v=>v.g).length,guilty=g*2>votes.length;
  for(const v of votes)mem(acc,v.j,v.g?'voted me guilty':'spoke for me at court');
  let line=`At the Moot Hall, ${N(acc)} stood accused${plf?` by ${N(plf)}`:''} of ${c.charge}.`;
  line+=confessed?` ${N(acc)} confessed before the jury had a chance to speak.`:` The jury of ${listNames(votes.map(v=>v.j))} found ${N(acc)} ${guilty?'guilty':'not guilty'}, ${guilty?g:votes.length-g} to ${guilty?votes.length-g:g}.`;
  let sentence='';
  if(guilty){
    acc.convictions=(acc.convictions||0)+1;
    const prior=acc.convictions-1,serious=/^wrecking/.test(c.charge),fight=/fight/.test(c.charge);
    if(!fight&&((serious&&prior>=1)||prior>=2)){
      sentence=`Having stood before the court ${prior===1?'once':numberWord(prior)+' times'} before, ${N(acc)} is banished from Ashwood Fold.`;
      exile(acc,'banished by the court');
    }else{
      const fine=serious?15:/purse/.test(c.charge)?5:/fight/.test(c.charge)?2:3,paid=Math.min(acc.coins,fine);acc.coins-=paid;if(plf&&!plf.dead)plf.coins+=paid;
      sentence=`${reeve?N(reeve):'The court'} fines ${N(acc)} ${fine} pennies`;
      if(serious||/purse/.test(c.charge)||(fight&&prior>=2)){sentence+=' and sets them in the stocks on the Green';for(const b of LIVE)if(b!==acc&&!isKin(b,acc))adj(b,acc,-5);if(reeve){mem(acc,reeve,'put me in the stocks');adj(acc,reeve,-20);}}
      sentence+='.';
    }
    if(plf)adj(acc,plf,-15);
    if(!c.truth)sentence+=` ${N(acc)} was innocent.`;
  }else{
    if(plf){adj(acc,plf,-18);adj(plf,acc,-5);}
    if(c.truth)sentence=`${N(acc)} was guilty all the same.`;
  }
  const swayed=votes.filter(v=>!confessed&&Math.abs(v.bias)>.3&&v.g===(v.bias>0)).sort((x,y)=>Math.abs(y.bias)-Math.abs(x.bias))[0];
  if(swayed)line+=` ${N(swayed.j)}, who ${swayed.bias>0?'has no love for':'is fond of'} ${N(acc)}, voted ${swayed.g?'guilty':'to acquit'}.`;
  log(line+(sentence?' '+sentence:''),guilty?'bad':'good','court',{ids:[acc.id],guilty,place:'hall'});
  S.verdicts.unshift({t:S.tick,acc:acc.id,plf:plf?plf.id:null,charge:c.charge,guilty,score:[g,votes.length-g],truth:c.truth});
  if(S.verdicts.length>12)S.verdicts.length=12;
}
export function exile(a,reason){
  a.dead={t:S.tick,cause:reason,age:a.age,exiled:true};refreshLive();
  // Banishment or desertion ends a marriage: the one left behind is free to marry again.
  const sp=a.spouse>=0?S.agents[a.spouse]:null;
  if(sp&&!sp.dead&&sp.spouse===a.id){sp.spouse=-1;sp.formerSpouse=a.id;
    log(`With ${N(a)} gone, ${N(sp)} is no longer bound by the marriage and is free to wed again.`,'event','family',{ids:[sp.id,a.id]});}
  for(const id in S.tech){const t=S.tech[id];t.backers=t.backers.filter(i=>i!==a.id);t.opponents=t.opponents.filter(i=>i!==a.id);}
  if(S.election)S.election.cands=S.election.cands.filter(i=>i!==a.id);
  const kin=LIVE.filter(b=>op(b,a)>50);for(const b of kin){b.lonely=Math.min(1,b.lonely+.25);mem(b,a,'misses');}
  succeed(a);
}
export function eraOf(){return currentEra();}
export function eraDay(){
  const e=eraOf();
  if(e!==S.era){
    // the idea that opened the era may give it its own name (the Turnpike Years rather than the Canal Years)
    const by=IDEAS.filter(d=>d.opensEra===e&&S.tech[d.id].state==='built').sort((a,b)=>S.tech[b.id].builtAt-S.tech[a.id].builtAt)[0];
    if(by&&by.eraTitle)(S.eraTitles||(S.eraTitles={}))[e]=by.eraTitle;
    S.era=e;log((by&&by.eraLine)||currentAge().eraLines[e],'nudge','era',{era:e,age:S.age});}
}
export function startBuilding(id){
  const t=S.tech[id],T=IDEA[id];
  t.state='building';t.doneAt=dayStart()+TPD*T.buildDays+60;t.navvies=[];raiseBuildings(T);
  const inv=S.agents[t.inventor];
  log(`Work begins on the ${T.name.toLowerCase()}, ${N(inv)}'s great scheme. It will take ${T.buildDays} days.`,'good','tech',{tech:id});
  for(let i=0;i<(T.navvies||0);i++){
    if(LIVE.length>=MAXPOP)break;
    const sex=rnd()<.85?'m':'f',name=nameBaby(sex,pick(SURNAMES));
    const tr={temper:.5+rnd()*.4,warmth:.3+rnd()*.5,diligence:.5+rnd()*.4,forgive:.2+rnd()*.5,gossip:.3+rnd()*.5,scruple:.2+rnd()*.45};
    const nid=S.agents.length,n=addAgent(makeAgent(nid,name,'navvy','tavern',tr,{age:19+rnd()*16,sex,hue:20}));
    n.work=(T.places&&T.places[0])||n.work;n.coins=6;n.navvy=true;n.arrivedAt=S.tick;[n.x,n.y]=entryPoint();n.px=n.x;n.py=n.y;n.arrived=false;n.act={type:'stroll',place:'tavern',left:2,target:null};const q=pointIn(P.tavern);n.tx=q[0];n.ty=q[1];
    for(const a of LIVE)if(a!==n){S.op[a.id][nid]=Math.round(-18+a.tr.warmth*20+(rnd()-.5)*10);S.op[nid][a.id]=Math.round((rnd()-.5)*14);}
    t.navvies.push(nid);
  }
  if(t.navvies.length)log(`${listNames(t.navvies.map(i=>S.agents[i]))} arrive with the navvy gang and take rooms at The Plough. Some of the village are not glad to see them.`,'event','arrival',{ids:t.navvies});
}
export function finishBuilding(id){
  const t=S.tech[id],T=IDEA[id];
  t.state='built';t.builtAt=S.tick;invalidateEffects();
  const inv=S.agents[t.inventor];
  log(`The ${T.name.toLowerCase()} is finished: ${N(inv)}'s great scheme, ${T.what}.`,'good','tech',{tech:id,ids:[inv.id],built:1});
  for(const line of T.builtLines||[])log(line,'event','tech',{tech:id});
  easeRivals(T);noteIdea(id,'built');honourInventor(T,inv);
  const stay=[],go=[];
  for(const nid of t.navvies||[]){const n=S.agents[nid];if(n.dead)continue;
    if(n.spouse>=0||LIVE.filter(b=>b!==n).reduce((s,b)=>s+op(b,n),0)/LIVE.length>25){stay.push(n);n.job='labourer';n.work='mill';n.navvy=false;}
    else{go.push(n);a_leave(n,'moved on with the navvy gang');}}
  if(go.length)log(`The navvies move on. ${stay.length?`${listNames(stay)} ${stay.length>1?'stay':'stays'} behind to make a life here.`:'Nobody is sorry to see the back of them.'}`,'event','departure');
}
export function a_leave(a,why){exile(a,why);}
export function emigrationDay(){
  if(!effect('emigration'))return;
  for(const a of [...LIVE]){
    if(a.age<17||a.age>32||a.spouse>=0||a.navvy)continue;
    const push=(a.coins<8?.5:0)+(a.lonely>.6?.3:0)+(a.mem.some(m=>/stocks|guilty/.test(m.t))?.4:0)+.2;
    if(rnd()<.004*push*3){
      const kin=LIVE.filter(b=>b!==a&&(isKin(b,a)||op(b,a)>60));
      exile(a,'left on the train for Manchester');
      log(`${N(a)} takes the train to Manchester to look for work.${kin[0]?` ${N(kin[0])} waves from the platform.`:''}`,'life','departure',{ids:[a.id]});
    }
  }
  for(const g of S.agents.filter(x=>x.dead&&/Manchester/.test(x.dead.cause))){
    if(S.tick-g.dead.t>TPD*YEAR_DAYS*3)continue;
    const kin=LIVE.find(b=>isKin(b,g));if(kin&&rnd()<.01)log(`A letter comes from ${N(g)} in Manchester. ${pick(['The work is hard and the air is black','There is money to be made, if you can stand the noise','It ends by asking after everyone at home','It asks for a few pennies to tide them over'])}.`,'event','letter',{ids:[g.id]});
  }
}
export function civicDay(){
  if(!S.election&&S.tick>=S.nextElection-3*TPD)callElection(3,false);
  if(weekday()==='Saturday')scheduleCourt();
  eraDay();
  emigrationDay();
  for(const id in S.tech){const t=S.tech[id];if(t.state==='building'&&S.tick>=t.doneAt-60)finishBuilding(id);}
}
