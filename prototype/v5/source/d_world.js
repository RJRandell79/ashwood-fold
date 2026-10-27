
// ---------- works and ideas ----------
function threatOf(b,id){
  const t=S.tech[id];
  if(id==='shuttle')return b.job==='weaver'&&b.id!==t.inventor?1:0;
  if(id==='cottonmill')return b.job==='weaver'&&b.id!==t.inventor?1:b.job==='carter'?.3:0;
  if(id==='plough')return b.job==='farmhand'?.35:0;
  if(id==='canal')return b.job==='carter'?.6:0;
  if(id==='steam')return b.job==='weaver'?1:b.job==='millhand'?.3:0;
  if(id==='railway')return b.job==='carter'?1:0;
  return 0;
}
function pitch(a,b){
  if(!isAdult(a)||!isAdult(b))return false;
  for(const id in S.tech){
    const t=S.tech[id];if(t.state!=='idea')continue;
    const stance=t.backers.includes(a.id)?1:t.opponents.includes(a.id)?-1:0;if(!stance)continue;
    if(t.backers.includes(b.id)||t.opponents.includes(b.id))continue;
    if(rnd()>.28)continue;
    const inv=S.agents[t.inventor],T=TECH[id],threat=threatOf(b,id);
    glyph(a,'…','rumour');
    if(stance>0){
      let sc=(op(b,inv)*.45+op(b,a)*.35)/100+(T.jobs.includes(b.job)?.2:0)+(b.tr.diligence-.5)*.4+rnd()*.5-.35-threat*.8-(b.coins<10?.15:0);
      if(op(b,inv)<-40)sc-=.5;
      if(sc>.12){t.backers.push(b.id);adj(b,inv,3);
        if(t.backers.length===T.need)log(`${N(inv)} has enough backers for the ${T.name.toLowerCase()}. Now for the money.`,'good','tech',{tech:id});
        else if(rnd()<.3)log(`${N(a)} talks ${N(b)} round to ${N(inv)}'s ${T.name.toLowerCase()}.`,'event');}
      else if(sc<-.2){t.opponents.push(b.id);
        if(threat>=1){mem(b,inv,'is taking my living');adj(b,inv,-8);log(`${N(b)} wants nothing to do with ${N(inv)}'s ${T.name.toLowerCase()}. It would cost ${N(b)} a living.`,'bad','tech',{tech:id,ids:[b.id]});}
        else if(op(b,inv)<-40)log(`${N(b)} won't back anything of ${N(inv)}'s, least of all a ${T.name.toLowerCase()}.`,'bad','tech',{tech:id,ids:[b.id]});}
    }else{
      const sc=op(b,a)/100*.6+threat*.6-op(b,inv)/100*.4+rnd()*.4-.3;
      if(sc>.15){t.opponents.push(b.id);if(rnd()<.35)log(`${N(a)} has turned ${N(b)} against the ${T.name.toLowerCase()}.`,'bad');}
    }
    return true;
  }
  return false;
}
function techDay(){
  const pop=LIVE.length,weavers=LIVE.filter(a=>a.job==='weaver');
  const bump=(id,v)=>{const t=S.tech[id];if(t.state==='none')t.pressure=Math.min(140,t.pressure+v);};
  const autumn=seasonOf()===2;
  bump('plough',.6+(S.stores.grain<pop*4?5:0));
  bump('millstone',.6+(S.stores.flour<10?4:0));
  bump('barn',.6+(autumn&&S.stores.grain>=grainCap()*.95?6:0));
  bump('shuttle',.6+(weavers.length&&weavers.reduce((s,w)=>s+w.coins,0)/weavers.length<8?3:0));
  bump('school',.6+(LIVE.filter(a=>a.age>=5&&a.age<14).length>=4?2:0));
  if(techBuilt('shuttle')&&techBuilt('millstone'))bump('cottonmill',1.5+(weavers.length?1:0));
  if(techBuilt('cottonmill'))bump('canal',1.4);if(techBuilt('canal'))bump('steam',1.5);if(techBuilt('steam'))bump('railway',1.2);
  for(const id in TECH){
    const t=S.tech[id],T=TECH[id];
    if(t.state==='none'&&t.pressure>=100&&T.req.every(techBuilt)){
      const cands=LIVE.filter(a=>isAdult(a)&&T.jobs.includes(a.job));
      if(!cands.length)continue;
      let inv=null,best=-9;for(const a of cands){const s=a.tr.diligence*.6+rnd()*.4+(id==='cottonmill'?(1-a.tr.warmth)*.25:0);if(s>best){best=s;inv=a;}}
      Object.assign(t,{state:'idea',inventor:inv.id,backers:[inv.id],opponents:[],since:S.tick,short:false});
      log(`${N(inv)} has an idea: a ${T.name.toLowerCase()} that ${T.what}. It will need ${T.need} backers and ${T.cost} pennies.`,'good','tech',{tech:id,ids:[inv.id],idea:1});
    }else if(t.state==='idea'){
      const inv=S.agents[t.inventor];
      t.backers=t.backers.filter(i=>!S.agents[i].dead);t.opponents=t.opponents.filter(i=>!S.agents[i].dead);
      if(inv.dead){t.state='none';t.pressure=50;log(`With ${N(inv)} gone, nobody takes up the ${T.name.toLowerCase()}.`,'event','tech',{tech:id});continue;}
      const reeve=byJob('reeve'),need=T.need+(reeve&&t.opponents.includes(reeve.id)?2:0);
      if(t.backers.length-t.opponents.length*.5>=need){
        const bk=t.backers.map(i=>S.agents[i]);let avail=bk.reduce((s,b)=>s+Math.floor(b.coins*.6),0);
        if(avail>=T.cost){
          let left=T.cost;for(const b of bk.sort((x,y)=>y.coins-x.coins)){const g=Math.min(Math.floor(b.coins*.6),Math.ceil(left));b.coins-=g;left-=g;if(left<=0)break;}
          if(T.build){for(const b of bk)if(b!==inv)adj(b,inv,6);startBuilding(id);continue;}
          t.state='built';t.builtAt=S.tick;
          for(const b of bk)if(b!==inv)adj(b,inv,6);
          for(const o of t.opponents.map(i=>S.agents[i]))adj(o,inv,-4);
          if(id==='shuttle')t.adopters=bk.filter(b=>b.job==='weaver').map(b=>b.id);
          log(`The ${T.name.toLowerCase()} is finished: ${N(inv)}'s idea, paid for by ${listNames(bk.filter(b=>b!==inv).slice(0,5))}${bk.length>6?' and others':''}.`,'good','tech',{tech:id,ids:[inv.id],built:1});
          if(id==='cottonmill')log(`A tall chimney now stands by the river. Some call it progress.`,'event');
          const fam=familyKey(inv),ar=armsOf(fam);
          if(ar.aug.length<3&&!ar.aug.includes(id)){ar.aug.push(id);log(`The ${fam} family add ${CHARGE_NAMES[AUG[id]]} to their arms, in honour of ${N(inv)}'s ${T.name.toLowerCase()}.`,'good','arms',{fam});}
        }else if(!t.short){t.short=true;log(`${N(inv)} has the backers for the ${T.name.toLowerCase()} but not yet the money.`,'event');}
      }
      if(t.state==='idea'&&S.tick-t.since>TPD*15){
        const opp=t.opponents.map(i=>S.agents[i]);
        log(`Nothing comes of ${N(inv)}'s ${T.name.toLowerCase()}. ${opp.length?`${listNames(opp.slice(0,3))} saw to that.`:'The village never quite took to it.'}`,'bad','tech',{tech:id,fizzle:1});
        Object.assign(t,{state:'none',pressure:40,backers:[],opponents:[]});
      }
    }else if(t.state==='built'&&t.brokenUntil&&t.brokenUntil<=S.tick){
      t.brokenUntil=0;const inv=S.agents[t.inventor];if(inv&&!inv.dead)inv.coins=Math.max(0,inv.coins-4);
      log(`The ${T.name.toLowerCase()} is mended and working again.`,'event');
    }
  }
  // the shuttle wins converts, or makes enemies
  if(techOn('shuttle')){const t=S.tech.shuttle,inv=S.agents[t.inventor];
    for(const w of weavers){if(t.adopters.includes(w.id))continue;
      const par=w.parents.find(p=>t.adopters.includes(p));
      if(par!=null||(op(w,inv)>-20&&w.coins>=4&&rnd()<.12)){t.adopters.push(w.id);if(par==null){w.coins-=4;log(`${N(w)} gives in and buys a flying shuttle.`,'event','tech',{tech:'shuttle',ids:[w.id]});}}
      else if(!inv.dead){adj(w,inv,-2);if(!w.mem.some(m=>m.t==='is taking my living'))mem(w,inv,'is taking my living');}}
  }
  // the mill takes on hands
  if(techOn('cottonmill')){const t=S.tech.cottonmill,own=S.agents[t.inventor];
    const hands=LIVE.filter(a=>a.job==='millhand').length;
    if(hands<(techOn('steam')?12:7)){for(const a of LIVE){
      const poorKid=a.job==='child'&&a.age>=12&&household(a.home).reduce((s,x)=>s+x.coins,0)<6;
      const thinFields=LIVE.filter(b=>b.work==='fields').length<4;
      if(!(poorKid||(isAdult(a)&&['weaver','labourer','carter','pedlar'].concat(thinFields?[]:['farmhand']).includes(a.job))))continue;
      if(own&&!own.dead&&op(a,own)<-35)continue;
      if(!poorKid&&a.coins>=5)continue;
      if(rnd()<.25){const prev=a.job;a.prevJob=prev;a.job='millhand';a.work='cottonmill';
        log(poorKid?`At ${Math.floor(a.age)}, ${N(a)} goes to work at the cotton mill. The family needs the pennies.`:`${N(a)} gives up ${prev} work and takes a place at ${own&&!own.dead?N(own)+"'s":'the'} cotton mill.`,'event','work',{ids:[a.id]});break;}}}
    if(own&&!own.dead)for(const w of weavers)adj(w,own,-1.5);
  }
  // machine breaking
  for(const id of ['shuttle','cottonmill','steam','railway']){
    if(!techOn(id)||rnd()>.5)continue;
    const t=S.tech[id],inv=S.agents[t.inventor];if(!inv||inv.dead)continue;
    if(S.tick-(t.lastWreck||-1e9)<TPD*SEASON_DAYS*(1+(t.wrecks||0)))continue;
    const angry=LIVE.filter(a=>isAdult(a)&&a!==inv&&op(a,inv)<-50&&a.tr.scruple<.65&&a.tr.temper>.4&&(threatOf(a,id)>0||op(a,inv)<-70)&&!(a.banned>S.tick));
    if(!angry.length)continue;
    const culprit=pick(angry);if(rnd()>.35)continue;
    t.brokenUntil=S.tick+TPD*2;t.lastWreck=S.tick;t.wrecks=(t.wrecks||0)+1;mem(culprit,inv,'smashed the machine');
    const place=id==='shuttle'?'weaving':id==='railway'?'wharf':'cottonmill';
    let sus=null,low=0;for(const b of LIVE)if(b!==inv&&isAdult(b)&&op(inv,b)<low){low=op(inv,b);sus=b;}
    let line=`In the night someone broke into ${PN(place)} and wrecked ${{shuttle:'the flying shuttle',cottonmill:'the spinning frames',steam:'the engine',railway:'a stretch of the line'}[id]}.`;
    if(sus){adj(inv,sus,-18);mem(inv,sus,'smashed the machine');addRumour(sus.id,'smashed the '+TECH[id].name.toLowerCase(),inv);
      line+=` ${N(inv)} blames ${N(sus)}${sus===culprit?', rightly.':`. It was ${N(culprit)}.`}`;
      bringCase(sus,inv,`wrecking the ${TECH[id].name.toLowerCase()}`,.25,sus===culprit);}
    else line+=` It was ${N(culprit)}, though nobody suspects it.`;
    log(line,'bad','crime',{tech:id,ids:[culprit.id],sabotage:1});
    break;
  }
}

// ---------- life and death ----------
function yr(){const y=yearOf();return S.years[y]||(S.years[y]={startPop:LIVE.length,births:0,deaths:0,weddings:0});}
function freeHome(){
  const homes=Object.keys(P).filter(k=>P[k].home);
  const empty=homes.filter(k=>household(k).length===0);
  return empty.find(k=>!P[k].plot||S.built[k])||empty[0]||null;
}
function setHome(a,home){
  a.home=home;
  if(P[home].plot&&!S.built[home]){S.built[home]=true;log(`A new cottage goes up: ${PN(home)}.`,'event','work');}
}
function nameBaby(sex,sur){
  const pool=sex==='f'?GIRLS:BOYS,taken=new Set(LIVE.map(a=>a.first));
  const free=pool.filter(n=>!taken.has(n));return (free.length?pick(free):pick(pool))+' '+sur;
}
function addAgent(a,warmFrom){
  const id=a.id;S.op.forEach(r=>r.push(0));S.op.push(new Array(id+1).fill(0));S.agents.push(a);refreshLive();
  return a;
}
function birth(mother,father){
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
function die(a,cause){
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
function succeed(dead){
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
function arrive(job,reason){
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
function comeOfAge(a){
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
function lifeDay(){
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
function gatherTick(){
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

// ---------- seasons ----------
function seasonStart(){
  const s=seasonOf(),y=yearOf(),pop=LIVE.length;
  if(s===0){
    S.years[y]={startPop:pop,births:0,deaths:0,weddings:0,era:S.era};S.yearQ=.65+rnd()*.6;
    log(`Spring comes to Ashwood Fold. Year ${y} begins with ${pop} souls in the village.`,'event','season',{season:0});
    if(LIVE.filter(isAdult).length<12)arrive(pick(['labourer','farmhand','weaver']),'looking for work');
    const extra=techOn('railway')?2:techOn('steam')?1:0;
    for(let i=0;i<extra&&LIVE.length<MAXPOP-2;i++)arrive(techOn('cottonmill')?'millhand':'labourer',techOn('railway')?'on the train, looking for work':'looking for work at the mill');
  }else if(s===1)log(`Summer. The corn stands green in the South Fields.`,'event');
  else if(s===2){S.harvest=0;log(`Autumn, and the harvest begins.`,'event');}
  else{
    const ratio=S.harvest/Math.max(1,pop*22),verdict=ratio<.8?'thin':ratio<1.15?'fair':'fine';
    S.years[y].harvest=verdict;
    if(verdict==='thin'){S.tech.plough.pressure+=50;}
    log(`Winter sets in. The harvest was ${verdict}: ${Math.round(S.harvest)} sheaves brought in for ${pop} mouths${verdict==='thin'?'. It will be a hungry winter.':'.'}`,verdict==='thin'?'bad':'event','season',{season:3,harvest:verdict});
  }
}
function weatherDay(){
  if(S.storm>0)return;
  const s=seasonOf(),p=[.04,.05,.12,.09][s];
  if(rnd()<p){S.storm=60+Math.floor(rnd()*36);stormHits(true);}
}
function stormHits(natural){
  const s=seasonOf();
  if(s===3)log(natural?'A blizzard sweeps down off the fells. The lanes fill with snow.':'Snow and wind lash Ashwood Fold.','event',natural?'season':null);
  else if(natural)log('Black clouds roll in over the fells and a storm breaks over Ashwood Fold.','event');
  if(s===2&&!techOn('barn')&&S.stores.grain>20){const lost=Math.round(S.stores.grain*.08);S.stores.grain-=lost;S.harvest=Math.max(0,S.harvest-lost);S.tech.barn.pressure+=30;
    log(`The rain lays the standing corn flat. ${lost} sheaves are spoiled in the field.`,'bad','season');}
  for(const a of LIVE)if(!P[a.act.place].indoor)plan(a);
}

// ---------- the day turns ----------
function midnight(){
  refreshLive();
  for(const a of LIVE)for(const b of S.agents){if(a===b)continue;const o=S.op[a.id][b.id];
    if(o<0)S.op[a.id][b.id]=Math.min(0,o+(.5+a.tr.forgive*2.5)*(1-a.tr.temper*.5));
    else if(o>25&&!b.dead)S.op[a.id][b.id]=o-.6;}
  // children take on their parents' loves and hates
  const school=techOn('school');
  for(const c of LIVE){if(c.age>=18||!c.parents.length)continue;const ps=c.parents.map(i=>S.agents[i]);
    for(const x of LIVE){if(x===c||ps.includes(x))continue;const tgt=ps.reduce((s,p)=>s+S.op[p.id][x.id],0)/ps.length*(school?.35:.6);
      S.op[c.id][x.id]+=(tgt-S.op[c.id][x.id])*.06;}}
  for(const a of LIVE)for(const b of LIVE)if(a.id<b.id)checkPair(a,b);
  if((dayOf()-1)%7===0)collectDues();
  spendDay();
  upkeepDay();
  const hungry=LIVE.filter(a=>a.hunger>.85);
  if(hungry.length)log(`${listNames(hungry)} went to bed hungry.`,'bad');
  lifeDay();
  foodDay();
  techDay();
  civicDay();
  if(dayInSeason()===1)seasonStart();
  if(seasonOf()===2&&dayInSeason()===5&&!S.fair){S.fair={start:dayStart()+72,end:dayStart()+126,harvest:true};}
  weatherDay();
  for(const k in S.cool)if(S.cool[k]<S.tick)delete S.cool[k];
  refreshLive();
}
function upkeepDay(){
  const cost=seasonOf()===3?(techOn('canal')?.8:1):.7;
  for(const h of new Set(LIVE.map(a=>a.home))){
    const folk=household(h),adults=folk.filter(isAdult);if(!adults.length)continue;
    for(const a of adults)if(a.coins>10)a.coins-=(a.coins-10)*.012;
    if(h==='tavern'){for(const a of adults)a.coins=Math.max(0,a.coins-cost);continue;}
    let bill=cost*adults.length+cost*.5*(folk.length-adults.length);
    for(const a of adults.sort((x,y)=>y.coins-x.coins)){const p=Math.min(a.coins,bill);a.coins-=p;bill-=p;if(bill<=0)break;}
  }
}
function spendDay(){
  const adults=LIVE.filter(isAdult);if(adults.length<2)return;
  const med=[...adults].sort((x,y)=>x.coins-y.coins)[Math.floor(adults.length/2)].coins;
  const poor=adults.filter(a=>a.coins<=Math.max(10,med));
  for(const a of adults){if(a.coins<=30)continue;
    const spend=(a.coins-30)*.12;a.coins-=spend;
    const per=spend/Math.min(3,poor.length);
    for(let i=0;i<Math.min(3,poor.length);i++){const b=pick(poor);b.coins+=per;if(per>=1.5&&b!==a)adj(b,a,1.5);}
    if(spend>4&&rnd()<.08){const b=pick(poor);if(b!==a)log(`${N(a)} pays ${N(b)} to ${pick(['mend a roof','dig a drain','fetch coal from the next valley','whitewash a wall','mind the cellar'])}.`,'event');}}
}
function foodDay(){
  const pop=LIVE.length,food=S.stores.grain+S.stores.flour+S.stores.bread,season=seasonOf();
  // hands turn to the fields when the fields are short of them
  const field=LIVE.filter(a=>a.work==='fields').length;
  if(season!==3&&(field<3||food<pop*8)&&field<6){
    const c=LIVE.filter(a=>isAdult(a)&&a.age<60&&['labourer','carter','pedlar','millhand','weaver'].includes(a.job)&&S.tick-(a.switched||-1e9)>TPD*YEAR_DAYS).sort((x,y)=>x.coins-y.coins)[0];
    if(c&&rnd()<.35){c.switched=S.tick;c.prevJob=c.job;c.job='farmhand';c.work='fields';log(`${N(c)} leaves ${c.prevJob} work for the South Fields. There are too few hands at the harvest.`,'event','work',{ids:[c.id]});}
  }
  // a cartload of corn from the next valley, if anyone will pay for it
  const canal=techOn('canal'),cost=canal?15:35;
  if(S.stores.grain+S.stores.flour<pop*(canal?7:4)&&S.tick-(S.lastCart||-1e9)>TPD*2){
    const rich=LIVE.filter(a=>isAdult(a)&&a.coins>=cost).sort((x,y)=>y.coins*y.tr.warmth-x.coins*x.tr.warmth);
    const buyer=rich.find(a=>rnd()<.25+a.tr.warmth*.6);
    if(buyer){buyer.coins-=cost;S.stores.grain+=70;S.lastCart=S.tick;for(const b of LIVE)if(b!==buyer)adj(b,buyer,4);
      log(canal?`${N(buyer)} pays for a boatload of corn to come up the canal.`:`${N(buyer)} pays for a cartload of corn from the next valley. There will be bread a while longer.`,'good','work',{ids:[buyer.id],cart:1});}
    else if(rich.length&&!S.cartRefused){S.cartRefused=dayOf();const r=rich[0];for(const b of LIVE)if(b!==r&&b.hunger>.6)adj(b,r,-6);
      log(`The granary is nearly empty. ${N(r)} has the money for corn from the next valley, and keeps it.`,'bad','crime',{ids:[r.id]});}
  }
  if(S.cartRefused&&dayOf()-S.cartRefused>5)S.cartRefused=0;
}
function collectDues(){
  const reeve=byJob('reeve');if(!reeve)return;const short=[];
  const homes=[...new Set(LIVE.map(a=>a.home))].filter(h=>h!=='tavern'&&h!==reeve.home);
  for(const h of homes){const adults=household(h).filter(isAdult).sort((x,y)=>y.coins-x.coins);if(!adults.length)continue;const payer=adults[0];
    const due=2+Math.max(0,payer.coins-20)*.05;if(payer.coins>=2){payer.coins-=due;reeve.coins+=Math.min(2,due);}
    else{short.push(payer);adj(reeve,payer,-10);adj(payer,reeve,-12);mem(payer,reeve,'demanded dues I could not pay');mem(reeve,payer,'could not pay their dues to');}}
  if(short.length)log(`Dues day. ${listNames(short)} could not pay ${N(reeve)} the two pennies owed to the manor.`,'bad');
  else log(`Dues day. Every household paid ${N(reeve)} in full, with varying grace.`,'event');
}
function tick(){
  S.tick++;
  refreshLive();
  if(S.tick%TPD===0)midnight();
  if(S.spoil>0){S.spoil--;if(S.spoil===0)log('The weevils are finally smoked out of the Watermill. Good flour again.','event');}
  if(S.storm>0){S.storm--;if(S.storm===0)log(seasonOf()===3?'The snow stops falling. Children are out on the Green within the hour.':'The storm blows itself out. The lanes steam in the sun.','event');}
  if(S.fair){
    if(S.tick===S.fair.start)log(S.fair.harvest?'Harvest Home on the Green: the last sheaf is carried in, and the fiddler strikes up.':'The fair opens on the Green: ribbons, a fiddler, and a pie stall.','good',S.fair.harvest?null:'event');
    if(S.tick===S.fair.end){log(S.fair.harvest?'Harvest Home is over for another year.':'The fair packs up for another year.','event');S.fair=null;}
  }
  gatherTick();
  for(const a of LIVE){a.px=a.x;a.py=a.y;step(a);}
  encounters();
  if(S.tick%36===0)autosave();
}

// ---------- nudges ----------
function nudgeRumour(){
  const id=+document.getElementById('rumourSubject').value,subj=S.agents[id];if(!subj||subj.dead)return;
  let seeder=null;for(const a of LIVE)if(a!==subj&&isAdult(a)&&(!seeder||a.tr.gossip>seeder.tr.gossip))seeder=a;
  const text=pick(RUMOURS);addRumour(subj.id,text,seeder);adj(seeder,subj,-8);
  log(`A whisper starts with ${N(seeder)}: that ${N(subj)} ${text}.`,'nudge','rumour',{ids:[subj.id]});render(true);
}
function nudgeShort(){S.stores.flour=0;S.spoil=TPD*2;log('Weevils have got into the granary at the Watermill. The flour is spoiled, and whatever is milled in the next two days will be too.','nudge','event');render(true);}
function nudgeStorm(){S.storm=96;if(seasonOf()!==3)log('Black clouds roll in over the fells and a storm breaks over Ashwood Fold.','nudge');stormHits(false);render(true);}
function nudgeStranger(){
  const used=new Set(S.agents.map(a=>a.name)),st=STRANGERS.find(n=>!used.has(n[0]));if(!st||LIVE.length>=MAXPOP)return;
  const tr={temper:.2+rnd()*.6,warmth:.2+rnd()*.7,diligence:.3+rnd()*.6,forgive:.2+rnd()*.7,gossip:.2+rnd()*.7,scruple:.25+rnd()*.7};
  const id=S.agents.length,s=addAgent(makeAgent(id,st[0],'pedlar','tavern',tr,{age:24+rnd()*20,sex:st[1],hue:330}));
  s.coins=10;s.hunger=.5;s.arrivedAt=S.tick;
  s.x=s.px=.5;s.y=s.py=13;s.arrived=false;s.act={type:'stroll',place:'tavern',left:2,target:null};const q=pointIn(P.tavern);s.tx=q[0];s.ty=q[1];
  for(const a of LIVE)if(a!==s){S.op[a.id][id]=Math.round(-12+a.tr.warmth*22+(rnd()-.5)*10);S.op[id][a.id]=Math.round((rnd()-.4)*14);}
  log(`A stranger walks in along the carters' road. ${N(s)}, a pedlar, takes a room at The Plough.`,'nudge','arrival',{ids:[id]});buildRoster();render(true);
}
function nudgeFair(){
  if(S.fair)return;
  const h=hourOf(),start=h<9?dayStart()+60:dayStart()+TPD+60;
  S.fair={start,end:start+60};
  log(`The reeve's crier announces a fair on the Green ${h<9?'this morning':'tomorrow'}.`,'nudge');render(true);
}
function nudgePurse(){
  const pool=LIVE.filter(a=>a.coins>=3);if(!pool.length){log('Nobody in Ashwood Fold has enough in their purse to lose.','nudge');render(true);return;}
  const owner=pool.reduce((m,a)=>a.coins>m.coins?a:m),loss=Math.max(2,Math.floor(owner.coins*.7));
  owner.coins-=loss;const finder=pick(LIVE.filter(a=>a!==owner&&a.age>=6));
  if(rnd()<finder.tr.scruple*.9){
    owner.coins+=loss;adj(owner,finder,20);mem(owner,finder,'returned my lost purse');
    log(`${N(owner)} drops a purse of ${loss} pennies near the well. ${N(finder)} finds it and hands it straight back.`,'nudge','event',{ids:[owner.id,finder.id]});
  }else{
    finder.coins+=loss;mem(finder,null,'kept a purse found by the well');
    let sus=null,low=100;for(const b of LIVE)if(b!==owner&&isAdult(b)&&op(owner,b)<low){low=op(owner,b);sus=b;}
    adj(owner,sus,-20);mem(owner,sus,'took my purse');bringCase(sus,owner,`taking a purse of ${loss} pennies`,.15,sus===finder);
    log(`${N(owner)} has lost a purse of ${loss} pennies and blames ${N(sus)}.${sus===finder?' Rightly, as it happens.':` In fact ${N(finder)} found it and kept quiet.`}`,'nudge','crime',{ids:[owner.id,sus.id]});
  }
  render(true);
}

// ---------- save ----------
function encode(){const copy={...S,log:S.log.slice(-150)};return 'AF1:'+btoa(unescape(encodeURIComponent(JSON.stringify(copy))));}
function decode(code){code=code.trim();if(!code.startsWith('AF1:'))throw new Error('That code does not start with AF1:, so it is not an Ashwood Fold save.');const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));if(!o.agents||!o.op)throw new Error('The code is incomplete. Copy the whole thing and try again.');return migrate(o);}
function autosave(){try{localStorage.setItem(SAVEKEY,JSON.stringify(S));}catch(e){}}
