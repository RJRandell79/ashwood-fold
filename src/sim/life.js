// Ported from the v5 prototype by tools/port-v5.mjs.
import { effect, employerOf } from './effects.js';
import { raisePressure } from './signals.js';
import { setVia, wear } from './paths.js';
import { FARM, SPEED, TPD } from '../data/world.js';
import { bringCase, campaignRound } from './civic.js';
import { log } from './log.js';
import { addRumour, adj, avoid, glyph, interact, mem, op, pull, worstFoe } from './social.js';
import { byJob, dayOf, fairOn, hourOf, household, isAdult, isKin, isSunday, listNames, LIVE, N, P, pantryOf, pick, pointIn, rnd, S, seasonOf, stage, takePantry } from './state.js';

export function activeGathers(){return S.gathers.filter(g=>S.tick>=g.start&&S.tick<g.end);}
export function gatherPull(a,g){
  if(g.type==='wedding'){
    if(g.ids.includes(a.id))return 5;
    const [x,y]=g.ids.map(i=>S.agents[i]);const aff=Math.max(op(a,x),op(a,y)),kin=isKin(a,x)||isKin(a,y)||a.home===x.home||a.home===y.home;
    if(Math.min(op(a,x),op(a,y))<-30&&!kin)return null;
    if(kin&&Math.min(op(a,x),op(a,y))<-35)return null;
    return .55+aff/100*.6+a.tr.warmth*.2+(kin?.6:0);
  }
  if(g.type==='election'){if(a.age<18)return null;return S.election&&S.election.cands.includes(a.id)?5:.5+a.tr.gossip*.2+a.tr.diligence*.1;}
  if(g.type==='court'){if(g.cases.some(c=>c.accused===a.id||c.accuser===a.id)||g.jurors.includes(a.id))return 5;if(a.age<12)return null;return .2+a.tr.gossip*.4;}
  const d=S.agents[g.who],aff=op(a,d),kin=isKin(a,d)||a.spouse===d.id||a.home===d.home;
  if(aff<-20&&!kin)return null;
  return .5+aff/100*.7+(kin?.8:0);
}
export function plan(a){
  const h=hourOf(),night=h<6||h>=22,storm=S.storm>0,sun=isSunday(),st=stage(a),winter=seasonOf()===3,opts=[];
  const add=(type,place,u,target)=>{if(!P[place])return;if(storm&&!P[place].indoor)return;opts.push({type,place,u:u+rnd()*.15,target});};
  add('sleep',a.home,a.tired*1.3+(night?.75:0)-(h>=8&&h<20?.55:0)+(st==='infant'?.25:0)+(winter&&h>=18?.1:0));
  const pan=pantryOf(a);
  if(pan>=1)add('eat',a.home,a.hunger*1.5);
  if(st==='infant'){add('stroll',a.home,.2);}
  else{
    if(pan<1&&(isAdult(a)?a.coins>=1:(a.age>=6&&purseOf(a)>=1))&&S.stores.bread>=1&&h>=6&&h<20)add('buy','bakery',a.hunger*1.45+.03);
    if(isAdult(a)&&a.home!=='tavern'&&a.coins>=2&&S.stores.bread>=1&&h>=11&&h<23)add('meal','tavern',a.hunger*1.25+a.tr.warmth*.1-avoid(a,'tavern'));
    if(a.hunger>.72&&a.coins<1&&purseOf(a)<1&&pan<1&&S.stores.bread>=1&&h>=5)add('steal','bakery',a.hunger*(1.25-a.tr.scruple)+.1);
    if(st==='adult'&&a.work&&P[a.work]){ // no work until the workplace exists (a carter before there is a market)
      const workH=a.job==='innkeeper'?(h>=10&&h<23):(h>=7&&h<18);
      const elder=Math.max(0,a.age-62)*.02;
      add('work',a.work,(workH?.55:-.9)+a.tr.diligence*.45+(a.coins<3?.3:0)-a.tired*.45-(sun&&a.job!=='innkeeper'?.5:0)-avoid(a,a.work)*.5-elder-(winter&&!P[a.work].indoor?.15:0));
    }
    if(st==='child'){
      const day=h>=8&&h<19;
      if(day)for(const pl of ['square','garden','market'])add('play',pl,a.lonely*.9+.35+(pl==='square'?.1:0)-(winter?.2:0)+pull(a,pl)-avoid(a,pl));
      const school=effect('lessons');
      if(school&&!sun&&h>=8.5&&h<12.5)add('lessons',school,.8+a.tr.diligence*.2);
      const par=a.parents.map(i=>S.agents[i]).find(p=>!p.dead&&p.work);
      if(par&&h>=9&&h<17&&a.age>=8)add('help',par.work,.2+a.tr.diligence*.35);
    }
    if(st==='adult')for(const pl of ['tavern','square']){
      if(pl==='square'&&(h<8||h>=20))continue;
      if(pl==='tavern'&&h<11)continue;
      add('social',pl,a.lonely*1.1+a.tr.warmth*.2+(pl==='tavern'&&h>=17?.35:0)+(pl==='square'?(winter?-.25:.1):0)+(pl==='tavern'&&winter?.15:0)-avoid(a,pl)+pull(a,pl)-(pl==='tavern'&&a.coins<1&&a.home!=='tavern'?.3:0));
    }
    if(sun&&h>=8.5&&h<11)add('chapel','chapel',.8+a.tr.forgive*.2-avoid(a,'chapel')*.5);
    if(fairOn())add('fair','square',.55+a.tr.warmth*.4+a.lonely*.3);
    for(const g of activeGathers()){const u=gatherPull(a,g);if(u!=null)add('gather',g.place,u,g.id);}
    const foe=st==='adult'?worstFoe(a):null;
    if(foe&&!night&&op(a,foe)<-55&&a.tr.temper>.5&&foe.act.type!=='sleep'&&S.tick>(a.vented||0)&&!foe.dead)add('confront',foe.act.place,a.tr.temper*.5+(-op(a,foe)/100)*.45-a.tr.forgive*.3-Math.hypot(foe.x-a.x,foe.y-a.y)/60,foe.id);
    add('stroll',pick(['square','garden','market','chapel']),.15-(winter?.05:0));
  }
  if(!opts.length)opts.push({type:'stroll',place:a.home,u:0});
  let best=opts[0];for(const o of opts)if(o.u>best.u)best=o;
  setAct(a,best);
}
export function setAct(a,o){
  const g=o.type==='gather'?S.gathers.find(x=>x.id===o.target):null;
  const dur={sleep:999,eat:2,buy:1,meal:4,steal:1,work:20+rnd()*14,social:6+rnd()*8,play:6+rnd()*8,lessons:Math.max(2,(12.5-hourOf())*6),help:8+rnd()*8,
    chapel:Math.max(2,(11.5-hourOf())*6),fair:8+rnd()*6,gather:g?Math.max(1,g.end-S.tick):6,confront:2,stroll:2+rnd()*3}[o.type];
  a.act={type:o.type,place:o.place,target:o.target??null,left:Math.round(dur)};
  const pt=pointIn(P[o.place]);a.tx=pt[0];a.ty=pt[1];a.arrived=false;a.at=null;setVia(a);
}
export function purseOf(a){return household(a.home).filter(isAdult).reduce((m,x)=>Math.max(m,x.coins),0);}
export const SOCIAL_ACTS=['social','fair','chapel','meal','play','gather','lessons'];
export function step(a){
  const asleep=a.act.type==='sleep'&&a.arrived,st=stage(a),winter=seasonOf()===3;
  const hr=(asleep?.003:.0065)*(st==='infant'?.6:st==='child'?.85:1)*(winter?1.15:1);
  a.hunger=Math.min(1,a.hunger+hr);
  if(!asleep)a.tired=Math.min(1,a.tired+.0058*(st==='infant'?1.4:1));
  const soc=a.arrived&&SOCIAL_ACTS.includes(a.act.type);
  if(!soc&&!asleep)a.lonely=Math.min(1,a.lonely+.0035*(.6+a.tr.warmth));
  a.tipsy=Math.max(0,a.tipsy-.04);
  if(a.glyph&&a.glyph.until<S.tick)a.glyph=null;
  if(!a.arrived){
    const w=a.via&&a.via[0],gx=w?w[0]:a.tx,gy=w?w[1]:a.ty;
    const dx=gx-a.x,dy=gy-a.y,d=Math.hypot(dx,dy),sp=SPEED*(st==='infant'?.6:a.age>70?.75:1);
    if(d<=sp&&w){wear(a.x,a.y,gx,gy);a.x=gx;a.y=gy;a.via.shift();if(!a.via.length)delete a.via;}
    else if(d<=sp){a.x=a.tx;a.y=a.ty;a.arrived=true;a.at=a.act.place;onArrive(a);}
    else{const x0=a.x,y0=a.y;a.x+=dx/d*sp;a.y+=dy/d*sp;wear(x0,y0,a.x,a.y);}
    return;
  }
  perform(a);
  if(a.act.left<=0)plan(a);
}
export function perform(a){
  const h=hourOf(),t=a.act.type;
  if(t==='sleep'){
    a.tired=Math.max(0,a.tired-.022);
    const day=h>=5.5&&h<21;
    if((day&&a.tired<.08)||(h>=9.5&&h<21&&a.tired<.4)||a.hunger>.97)a.act.left=0;
    return;
  }
  if(t==='work'){produce(a);if((a.job!=='innkeeper'&&h>=19)||(S.storm>0&&!(P[a.work]&&P[a.work].indoor)))a.act.left=0;}
  if(SOCIAL_ACTS.includes(t))a.lonely=Math.max(0,a.lonely-.016);
  a.act.left--;
}
export function weaverWage(a){
  let w=.07;
  w=effect('weaverWage',a);
  return w;
}
export function produce(a){
  const st=S.stores,eff=.6+a.tr.diligence*.6-a.tired*.3-Math.max(0,a.age-62)*.015,season=seasonOf();
  switch(a.job){
    case 'farmer':case 'farmhand':{
      const g=.45*eff*FARM[season]*S.yearQ*effect('farmYield');
      const room=Math.max(0,effect('grainCap')-st.grain),add=Math.min(room,g);st.grain+=add;if(season===2)S.harvest+=g;
      if(g>0&&room<=0&&rnd()<.02)raisePressure('granaryFull');
      a.coins+=season===3?.04:.06;break;}
    case 'miller':case 'labourer':{
      const c=Math.min(st.grain,1*eff*effect('grindRate'),Math.max(0,100-st.flour));st.grain-=c;if(!(S.spoil>0))st.flour+=c;a.coins+=.06;break;}
    case 'baker':{const c=Math.min(st.flour,1.2*eff,Math.max(0,60-st.bread));st.flour-=c;st.bread+=c;
      const pay=c*.5;if(a.coins>=pay){a.coins-=pay;const mill=LIVE.filter(b=>b.work==='mill'),farm=LIVE.filter(b=>b.work==='fields');
        if(mill.length)pick(mill).coins+=pay*.5;if(farm.length)pick(farm).coins+=pay*.5;}break;}
    case 'innkeeper':break;
    case 'weaver':a.coins+=weaverWage(a);break;
    case 'millhand':{a.coins+=effect('millhandWage');const works=employerOf('millhand');if(works){const own=S.agents[S.tech[works.id].inventor];if(own&&!own.dead&&own!==a)own.coins+=effect('millOwnerCut');}break;}
    default:a.coins+=a.job==='carter'?effect('carterWage'):.07;
  }
}
export function onArrive(a){
  const t=a.act.type;
  if(t==='eat'){if(takePantry(a))a.hunger=Math.max(0,a.hunger-.6);else a.act.left=0;}
  else if(t==='buy'){
    const hs=household(a.home).length,payer=a.coins>=1?a:household(a.home).filter(isAdult).sort((x,y)=>y.coins-x.coins)[0]||a;
    const n=Math.min(1+hs,5,Math.floor(payer.coins),Math.floor(S.stores.bread));
    if(n<1){glyph(a,'?','bad');if(S.bareLogged!==dayOf()){S.bareLogged=dayOf();raisePressure('shelvesBare');log(`The shelves at the Bakehouse are bare. ${N(a)} goes away empty-handed.`,'bad');}a.act.left=0;return;}
    payer.coins-=n;S.stores.bread-=n;const baker=byJob('baker');if(baker&&baker!==payer)baker.coins+=n;
    a.hunger=Math.max(0,a.hunger-.6);if(a.home!=='tavern')S.pantry[a.home]=(S.pantry[a.home]||0)+n-1;
  }
  else if(t==='meal'){
    if(S.stores.bread>=1&&a.coins>=2){a.coins-=2;S.stores.bread-=1;const k=byJob('innkeeper'),bk=byJob('baker');if(k&&k!==a){k.coins+=1;if(bk)bk.coins+=1;}a.hunger=Math.max(0,a.hunger-.65);}
    else a.act.left=0;
  }
  else if(t==='steal')steal(a);
  else if(t==='social'&&a.act.place==='tavern'&&campaignRound(a)){}
  else if(t==='social'&&a.act.place==='tavern'&&a.coins>=30&&rnd()<.15&&S.tick>(a.roundAt||0)){a.roundAt=S.tick+TPD*4;
    const here=LIVE.filter(b=>b!==a&&b.at==='tavern'&&b.arrived&&b.act.type!=='sleep'&&isAdult(b));
    if(here.length>=2){a.coins-=here.length;const k=byJob('innkeeper');if(k&&k!==a)k.coins+=here.length;for(const b of here){adj(b,a,6);b.tipsy=1;b.lonely=Math.max(0,b.lonely-.2);}a.tipsy=1;glyph(a,'♥','good');
      if(rnd()<.25)log(`${N(a)} stands a round for everyone at The Plough.`,'good');}
  }
  else if(t==='social'&&a.act.place==='tavern'&&a.home!=='tavern'&&a.coins>=1&&isAdult(a)&&rnd()<.65){a.coins-=1;const k=byJob('innkeeper');if(k){k.coins+=.4;const f=LIVE.filter(b=>b.work==='fields'||b.work==='mill');if(f.length)pick(f).coins+=.6;}a.tipsy=1;}
  else if(t==='confront'){
    const b=S.agents[a.act.target];
    if(b&&!b.dead&&b.at===a.at&&b.arrived&&b.act.type!=='sleep')interact(a,b,.35,true);
    else glyph(a,'?','muted');
    a.act.left=0;
  }
  else if(t==='work'&&a.job==='baker'&&S.stores.missing>0)bakerNotices(a);
}
export function steal(a){
  const wit=LIVE.filter(b=>b!==a&&b.at==='bakery'&&b.arrived&&b.act.type!=='sleep'&&isAdult(b));
  S.stores.bread=Math.max(0,S.stores.bread-2);a.hunger=Math.max(0,a.hunger-.6);
  if(a.home!=='tavern')S.pantry[a.home]=(S.pantry[a.home]||0)+1;
  const kid=!isAdult(a);
  if(wit.length){
    for(const w of wit){adj(w,a,kid?-8:-24);mem(w,a,'caught stealing bread','bakery');}
    adj(a,wit[0],-6);glyph(a,'!','bad');
    log(kid?`Young ${N(a)} was caught slipping a loaf from the Bakehouse by ${listNames(wit)}.`:`${N(a)}, hungry and without a penny, was caught taking bread from the Bakehouse by ${listNames(wit)}.`,'bad','crime',{place:'bakery',ids:[a.id]});
    if(!kid){addRumour(a.id,'is a thief',wit[0]);bringCase(a,wit[0],'stealing bread from the Bakehouse',.75,true);}
  }else{
    S.stores.missing+=2;S.lastThief=a.id;mem(a,null,'took bread from the Bakehouse unseen','bakery');
    log(`Two loaves vanish from the Bakehouse. Nobody saw who took them.`,'event');
  }
  a.act.left=0;
}
export function bakerNotices(a){
  const n=Math.round(S.stores.missing);S.stores.missing=0;
  let sus=null,low=15;for(const b of LIVE)if(b!==a&&b.home!==a.home&&isAdult(b)&&op(a,b)<low){low=op(a,b);sus=b;}
  if(!sus){log(`${N(a)} finds ${n} loaves missing from the Bakehouse and cannot think who would do such a thing.`,'event');return;}
  adj(a,sus,-14);mem(a,sus,'probably took bread from the Bakehouse','bakery');
  const right=S.lastThief===sus.id;
  log(`${N(a)} counts the loaves, finds ${n} gone, and suspects ${N(sus)}${right?'. The suspicion happens to be right.':', who had nothing to do with it.'}`,'rumour','crime',{ids:[a.id,sus.id],place:'bakery'});
  addRumour(sus.id,'has been helping themselves at the Bakehouse',a);
  bringCase(sus,a,'stealing bread from the Bakehouse',.15,right);
}
