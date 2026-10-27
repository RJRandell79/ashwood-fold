
// ---------- decision making ----------
function activeGathers(){return S.gathers.filter(g=>S.tick>=g.start&&S.tick<g.end);}
function gatherPull(a,g){
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
function plan(a){
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
    if(st==='adult'&&a.work){
      const workH=a.job==='innkeeper'?(h>=10&&h<23):(h>=7&&h<18);
      const elder=Math.max(0,a.age-62)*.02;
      add('work',a.work,(workH?.55:-.9)+a.tr.diligence*.45+(a.coins<3?.3:0)-a.tired*.45-(sun&&a.job!=='innkeeper'?.5:0)-avoid(a,a.work)*.5-elder-(winter&&!P[a.work].indoor?.15:0));
    }
    if(st==='child'){
      const day=h>=8&&h<19;
      if(day)for(const pl of ['square','garden','market'])add('play',pl,a.lonely*.9+.35+(pl==='square'?.1:0)-(winter?.2:0)+pull(a,pl)-avoid(a,pl));
      if(techBuilt('school')&&!sun&&h>=8.5&&h<12.5)add('lessons','school',.8+a.tr.diligence*.2);
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
    if(foe&&!night&&op(a,foe)<-55&&a.tr.temper>.5&&foe.act.type!=='sleep'&&S.tick>(a.vented||0)&&!foe.dead)add('confront',foe.act.place,a.tr.temper*.5+(-op(a,foe)/100)*.45-a.tr.forgive*.3,foe.id);
    add('stroll',pick(['square','garden','market','chapel']),.15-(winter?.05:0));
  }
  if(!opts.length)opts.push({type:'stroll',place:a.home,u:0});
  let best=opts[0];for(const o of opts)if(o.u>best.u)best=o;
  setAct(a,best);
}
function setAct(a,o){
  const g=o.type==='gather'?S.gathers.find(x=>x.id===o.target):null;
  const dur={sleep:999,eat:2,buy:1,meal:4,steal:1,work:20+rnd()*14,social:6+rnd()*8,play:6+rnd()*8,lessons:Math.max(2,(12.5-hourOf())*6),help:8+rnd()*8,
    chapel:Math.max(2,(11.5-hourOf())*6),fair:8+rnd()*6,gather:g?Math.max(1,g.end-S.tick):6,confront:2,stroll:2+rnd()*3}[o.type];
  a.act={type:o.type,place:o.place,target:o.target??null,left:Math.round(dur)};
  const pt=pointIn(P[o.place]);a.tx=pt[0];a.ty=pt[1];a.arrived=false;a.at=null;
}

function purseOf(a){return household(a.home).filter(isAdult).reduce((m,x)=>Math.max(m,x.coins),0);}
// ---------- per-tick life ----------
const SOCIAL_ACTS=['social','fair','chapel','meal','play','gather','lessons'];
function step(a){
  const asleep=a.act.type==='sleep'&&a.arrived,st=stage(a),winter=seasonOf()===3;
  const hr=(asleep?.003:.0065)*(st==='infant'?.6:st==='child'?.85:1)*(winter?1.15:1);
  a.hunger=Math.min(1,a.hunger+hr);
  if(!asleep)a.tired=Math.min(1,a.tired+.0058*(st==='infant'?1.4:1));
  const soc=a.arrived&&SOCIAL_ACTS.includes(a.act.type);
  if(!soc&&!asleep)a.lonely=Math.min(1,a.lonely+.0035*(.6+a.tr.warmth));
  a.tipsy=Math.max(0,a.tipsy-.04);
  if(a.glyph&&a.glyph.until<S.tick)a.glyph=null;
  if(!a.arrived){
    const dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy),sp=SPEED*(st==='infant'?.6:a.age>70?.75:1);
    if(d<=sp){a.x=a.tx;a.y=a.ty;a.arrived=true;a.at=a.act.place;onArrive(a);}
    else{a.x+=dx/d*sp;a.y+=dy/d*sp;}
    return;
  }
  perform(a);
  if(a.act.left<=0)plan(a);
}
function perform(a){
  const h=hourOf(),t=a.act.type;
  if(t==='sleep'){
    a.tired=Math.max(0,a.tired-.022);
    const day=h>=5.5&&h<21;
    if((day&&a.tired<.08)||(h>=9.5&&h<21&&a.tired<.4)||a.hunger>.97)a.act.left=0;
    return;
  }
  if(t==='work'){produce(a);if((a.job!=='innkeeper'&&h>=19)||(S.storm>0&&!P[a.work].indoor))a.act.left=0;}
  if(SOCIAL_ACTS.includes(t))a.lonely=Math.max(0,a.lonely-.016);
  a.act.left--;
}
function weaverWage(a){
  let w=.07;
  if(techOn('shuttle'))w=S.tech.shuttle.adopters.includes(a.id)?.11:.035;
  if(techOn('cottonmill'))w*=.55;
  if(techOn('steam'))w*=.6;
  if(techOn('canal'))w*=1.1;
  return w;
}
function produce(a){
  const st=S.stores,eff=.6+a.tr.diligence*.6-a.tired*.3-Math.max(0,a.age-62)*.015,season=seasonOf();
  switch(a.job){
    case 'farmer':case 'farmhand':{
      const g=.45*eff*FARM[season]*S.yearQ*(techOn('plough')?1.45:1);
      const room=Math.max(0,grainCap()-st.grain),add=Math.min(room,g);st.grain+=add;if(season===2)S.harvest+=g;
      if(g>0&&room<=0&&rnd()<.02)S.tech.barn.pressure+=3;
      a.coins+=season===3?.04:.06;break;}
    case 'miller':case 'labourer':{
      const c=Math.min(st.grain,1*eff*(techOn('millstone')?1.7:1),Math.max(0,100-st.flour));st.grain-=c;if(!(S.spoil>0))st.flour+=c;a.coins+=.06;break;}
    case 'baker':{const c=Math.min(st.flour,1.2*eff,Math.max(0,60-st.bread));st.flour-=c;st.bread+=c;
      const pay=c*.5;if(a.coins>=pay){a.coins-=pay;const mill=LIVE.filter(b=>b.work==='mill'),farm=LIVE.filter(b=>b.work==='fields');
        if(mill.length)pick(mill).coins+=pay*.5;if(farm.length)pick(farm).coins+=pay*.5;}break;}
    case 'innkeeper':break;
    case 'weaver':a.coins+=weaverWage(a);break;
    case 'millhand':{if(techOn('cottonmill')){const st=techOn('steam');a.coins+=st?.11:.1;const own=S.agents[S.tech.cottonmill.inventor];if(own&&!own.dead&&own!==a)own.coins+=st?.07:.05;}else a.coins+=.015;break;}
    default:a.coins+=a.job==='carter'?(techOn('railway')?.025:techOn('canal')?.045:.07):.07;
  }
}
function onArrive(a){
  const t=a.act.type;
  if(t==='eat'){if(takePantry(a))a.hunger=Math.max(0,a.hunger-.6);else a.act.left=0;}
  else if(t==='buy'){
    const hs=household(a.home).length,payer=a.coins>=1?a:household(a.home).filter(isAdult).sort((x,y)=>y.coins-x.coins)[0]||a;
    const n=Math.min(1+hs,5,Math.floor(payer.coins),Math.floor(S.stores.bread));
    if(n<1){glyph(a,'?','bad');if(S.bareLogged!==dayOf()){S.bareLogged=dayOf();S.tech.millstone.pressure+=30;log(`The shelves at the Bakehouse are bare. ${N(a)} goes away empty-handed.`,'bad');}a.act.left=0;return;}
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
function steal(a){
  const wit=LIVE.filter(b=>b!==a&&b.at==='bakery'&&b.arrived&&b.act.type!=='sleep'&&isAdult(b));
  S.stores.bread=Math.max(0,S.stores.bread-2);a.hunger=Math.max(0,a.hunger-.6);
  if(a.home!=='tavern')S.pantry[a.home]=(S.pantry[a.home]||0)+1;
  const kid=!isAdult(a);
  if(wit.length){
    for(const w of wit){adj(w,a,kid?-8:-24);mem(w,a,'caught stealing bread','bakery');}
    adj(a,wit[0],-6);glyph(a,'!','bad');
    log(kid?`Young ${N(a)} was caught slipping a loaf from the Bakehouse by ${listNames(wit)}.`:`${N(a)}, hungry and without a penny, was caught taking bread from the Bakehouse by ${listNames(wit)}.`,'bad','crime',{ids:[a.id]});
    if(!kid){addRumour(a.id,'is a thief',wit[0]);bringCase(a,wit[0],'stealing bread from the Bakehouse',.75,true);}
  }else{
    S.stores.missing+=2;S.lastThief=a.id;mem(a,null,'took bread from the Bakehouse unseen','bakery');
    log(`Two loaves vanish from the Bakehouse. Nobody saw who took them.`,'event');
  }
  a.act.left=0;
}
function bakerNotices(a){
  const n=Math.round(S.stores.missing);S.stores.missing=0;
  let sus=null,low=15;for(const b of LIVE)if(b!==a&&b.home!==a.home&&isAdult(b)&&op(a,b)<low){low=op(a,b);sus=b;}
  if(!sus){log(`${N(a)} finds ${n} loaves missing from the Bakehouse and cannot think who would do such a thing.`,'event');return;}
  adj(a,sus,-14);mem(a,sus,'probably took bread from the Bakehouse','bakery');
  const right=S.lastThief===sus.id;
  log(`${N(a)} counts the loaves, finds ${n} gone, and suspects ${N(sus)}${right?'. The suspicion happens to be right.':', who had nothing to do with it.'}`,'rumour','crime',{ids:[a.id,sus.id]});
  addRumour(sus.id,'has been helping themselves at the Bakehouse',a);
  bringCase(sus,a,'stealing bread from the Bakehouse',.15,right);
}
function addRumour(subject,text,seeder){const r={id:S.rid++,subject,text,reach:1,doubt:0,born:S.tick};S.rumours.push(r);seeder.knows.push(r.id);return r;}

// ---------- encounters ----------
function encounters(){
  const by={};
  for(const a of LIVE)if(a.arrived&&a.at&&a.act.type!=='sleep'&&a.age>=3)(by[a.at]||(by[a.at]=[])).push(a);
  for(const place in by){
    const list=by[place];if(list.length<2)continue;
    const busy=list.length>6?.7:1;
    for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
      const a=list[i],b=list[j],key=Math.min(a.id,b.id)+'-'+Math.max(a.id,b.id);
      if((S.cool[key]||0)>S.tick)continue;
      const p=.06*busy*(.5+(a.tr.warmth+b.tr.warmth)/2)*(a.act.type==='work'?.6:1);
      if(rnd()<p){
        const first=rnd()<.5+(a.lonely-b.lonely)*.5?a:b;
        interact(first,first===a?b:a,0,false);
        S.cool[key]=Math.max(S.cool[key]||0,S.tick+10);
      }
    }
  }
}
function interact(a,b,bonus,confront){
  const place=a.at,o=op(a,b),mood=1-(a.hunger*.6+a.tired*.4),kids=!isAdult(a)||!isAdult(b);
  let host=(-o/100)*.6+a.tr.temper*.35+(1-mood)*.4+a.tipsy*.18+rnd()*.45+bonus+(S.storm>0&&P[place].indoor?.06:0)-(kids?.12:0);
  if(place==='chapel')host-=.25;
  if(fairOn()&&place==='square')host-=.12;
  if(a.act.type==='gather')host-=.2;
  if(host>.85)return quarrel(a,b,host,place,confront);
  if(canvass(a,b)||pitch(a,b))return;
  if(rnd()<a.tr.gossip*.7&&gossip(a,b,place))return;
  friendly(a,b,place);
}
function causeOf(a,b){
  if(a.hunger>.7)return 'short-tempered with hunger';
  if(a.tipsy>.5)return 'with the ale talking';
  if(a.tired>.75)return 'worn out and touchy';
  const m=a.mem.find(m=>m.w===b.id);
  if(m&&op(a,b)<-20){const why={'argued with':'still sore from their last argument','came to blows with':'still smarting from their last fight','caught stealing bread':'over the stolen bread','probably took bread from the Bakehouse':'over the missing loaves','took my purse':'over the lost purse','spread talk about me':'over the talk going round','could not pay their dues to':'over the unpaid dues','demanded dues I could not pay':'over the dues','is taking my living':'over the new machine','smashed the machine':'over the wrecked machine'}[m.t];if(why)return why;}
  const fam=a.parents.map(i=>S.agents[i]).find(p=>op(p,b)<-45);
  if(fam&&op(a,b)<-20)return `carrying on ${N(fam)}'s old quarrel`;
  if(op(a,b)<-40)return 'over old bad blood';
  return pick(['over nothing much','over a borrowed tool','about whose turn it was','over a careless word']);
}
function quarrel(a,b,host,place,confront){
  const adults=isAdult(a)&&isAdult(b);
  const brawl=adults&&host>1.12&&b.tr.temper>.45&&op(b,a)<-35;
  const before=op(b,a),cause=causeOf(a,b);
  adj(a,b,-(5+rnd()*7));
  adj(b,a,-(8+rnd()*10)*(brawl?2:1)*(1.3-b.tr.forgive*.6));
  mem(a,b,brawl?'came to blows with':'argued with',place);
  mem(b,a,brawl?'came to blows with':'argued with',place);
  glyph(a,'!','bad');glyph(b,'!','bad');
  const wit=LIVE.filter(w=>w!==a&&w!==b&&w.at===place&&w.arrived&&w.act.type!=='sleep');
  for(const w of wit){adj(w,a,brawl?-6:-2);if(brawl)adj(w,b,-4);}
  const pk=Math.min(a.id,b.id)+'-'+Math.max(a.id,b.id);
  S.cool[pk]=S.tick+(brawl?72:30);a.vented=S.tick+TPD;if(brawl)b.vented=S.tick+TPD/2;
  const again=brawl&&S.brawls[pk]&&S.tick-S.brawls[pk]<TPD*3;if(brawl)S.brawls[pk]=S.tick;
  if(brawl){
    a.tired=Math.min(1,a.tired+.2);b.tired=Math.min(1,b.tired+.2);
    let line=again?`${N(a)} and ${N(b)} are at it again, fists flying at ${PN(place)}.`:`${N(a)} and ${N(b)} came to blows at ${PN(place)}, ${cause}.`;
    const reeve=wit.find(w=>w.job==='reeve');
    if(reeve){a.coins=Math.max(0,a.coins-2);b.coins=Math.max(0,b.coins-2);line+=` ${N(reeve)} fined them both two pennies.`;}
    else if(wit.length)line+=` ${listNames(wit.slice(0,3))} pulled them apart.`;
    S.fightCase=S.fightCase||{};
    if(!reeve&&op(b,a)<-60&&S.tick-(S.fightCase[pk]||-1e9)>TPD*12&&rnd()<.3&&(S.fightCase[pk]=S.tick))bringCase(a,b,`starting a fight at ${PN(place)}`,.5,true);
    log(line,'bad',again?null:'fight',{ids:[a.id,b.id]});
  }else if(!adults){
    if(rnd()<.15)log(`${N(a)} and ${N(b)} squabbled at ${PN(place)}, ${cause}.`,'event');
  }else if(confront){
    log(`${N(a)} sought out ${N(b)} at ${PN(place)} to have it out, ${cause}.`,'bad');
  }else if(before>35){
    log(`${N(a)} and ${N(b)}, usually on good terms, had sharp words at ${PN(place)}, ${cause}.`,'bad');
  }else if(rnd()<(cause.startsWith('with the ale')?.1:.3)){
    log(`${N(a)} and ${N(b)} had words at ${PN(place)}, ${cause}.`,'event');
  }
}
function gossip(a,b,place){
  const r=S.rumours.find(r=>a.knows.includes(r.id)&&!b.knows.includes(r.id)&&r.subject!==a.id&&!S.agents[r.subject].dead);
  if(r&&rnd()<.75){
    b.knows.push(r.id);const subj=S.agents[r.subject];glyph(a,'…','rumour');
    if(b.id===r.subject){
      adj(b,a,-25);mem(b,a,'spread talk about me',place);glyph(b,'!','bad');
      log(`${N(b)} hears from ${N(a)} what folk have been saying: that ${N(b)} ${r.text}. ${N(b)} is not pleased.`,'rumour','rumour',{ids:[a.id,b.id]});
    }else{
      const school=techOn('school');
      const trust=(op(b,a)+100)/200*(school?.6:1);
      if((op(b,subj)>50&&rnd()<.6)||(school&&rnd()<.25)){
        adj(b,a,-4);r.doubt++;
        if(r.doubt===1)log(`${N(b)} won't hear a word of it when ${N(a)} repeats that ${N(subj)} ${r.text}.`,'good');
      }else{
        r.reach++;adj(b,subj,-(8+18*trust));mem(b,subj,`was said to have ${r.text.replace(/^is /,'been ').replace(/^has /,'')}`.replace('have been been','have been'),place);
        if(r.reach===2)log(`${N(a)} passes it on to ${N(b)}: ${N(subj)} ${r.text}.`,'rumour');
        else if(r.reach===5||r.reach===9){log(`By now ${r.reach} people have heard that ${N(subj)} ${r.text}.`,'rumour',r.reach===5?'rumour':null,{ids:[subj.id]});if(r.reach===5)S.tech.school.pressure+=20;}
      }
    }
    return true;
  }
  const cands=LIVE.filter(c=>c!==a&&c!==b&&Math.abs(op(a,c))>35);
  if(!cands.length)return false;
  const c=pick(cands),trust=(op(b,a)+100)/200,shift=(op(a,c)-op(b,c))*.2*trust;
  adj(b,c,shift);a.lonely=Math.max(0,a.lonely-.12);b.lonely=Math.max(0,b.lonely-.12);glyph(a,'…','muted');
  if(Math.abs(shift)>7&&rnd()<.25)log(`${N(a)} has been telling ${N(b)} ${op(a,c)>0?'good things':'unflattering things'} about ${N(c)}.`,'event');
  return true;
}
function friendly(a,b,place){
  const d=1+a.tr.warmth*3+rnd()*1.5;
  adj(a,b,d*.7);adj(b,a,d);
  a.lonely=Math.max(0,a.lonely-.25);b.lonely=Math.max(0,b.lonely-.25);
  if(b.hunger>.65&&pantryOf(a)>=1&&a.tr.warmth>.45&&rnd()<.6){
    const before=op(b,a);takePantry(a);b.hunger=Math.max(0,b.hunger-.5);adj(b,a,16);mem(b,a,'shared bread with me',place);
    glyph(a,'♥','good');glyph(b,'♥','good');
    if(before<30||rnd()<.4)log(`${N(a)} saw that ${N(b)} was hungry and shared a loaf.`,'good');
    return;
  }
  if(isAdult(b)&&b.coins<1&&a.coins>6&&a.tr.warmth>.5&&rnd()<.5){
    a.coins-=2;b.coins+=2;adj(b,a,12);mem(b,a,'lent me two pennies',place);glyph(b,'♥','good');
    if(rnd()<.5)log(`${N(a)} pressed two pennies into ${N(b)}'s hand at ${PN(place)}.`,'good');
    return;
  }
  glyph(a,d>3.6?'♥':'·',d>3.6?'good':'muted');
}
