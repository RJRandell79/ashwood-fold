// Ported from the v5 prototype by tools/port-v5.mjs.
import { effect } from './effects.js';
import { raisePressure } from './signals.js';
import { P, TPD } from '../data/world.js';
import { bringCase, canvass } from './civic.js';
import { pitch } from './ideas.js';
import { log } from './log.js';
import { LIVE, N, PN, S, clamp, dayOf, fairOn, isAdult, isKin, listNames, pantryOf, pick, rnd, takePantry } from './state.js';

export function op(a,b){return (S.op[a.id][b.id]);}
export function adj(a,b,d){if(a===b||a.dead||b.dead)return;S.op[a.id][b.id]=clamp(S.op[a.id][b.id]+d,-100,100);checkPair(a,b);}
export function mem(a,b,text,place){a.mem.unshift({w:b?b.id:-1,t:text,d:dayOf(),p:place||null});if(a.mem.length>8)a.mem.length=8;}
export function glyph(a,c,k){a.glyph={c,k,until:S.tick+5};}
export function canCourt(x,y){return isAdult(x)&&isAdult(y)&&x.age>=16&&y.age>=16&&Math.abs(x.age-y.age)<=18&&x.spouse<0&&y.spouse<0&&!isKin(x,y)&&x.home!==y.home;}
export function checkPair(a,b,quiet){
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
export function worstFoe(a){let w=null,lo=-40;for(const b of LIVE)if(b!==a&&op(a,b)<lo){lo=op(a,b);w=b;}return w;}
export function avoid(a,place){let s=0;for(const b of LIVE)if(b!==a&&b.act.place===place&&b.act.type!=='sleep'){const o=op(a,b);if(o<-40)s+=(-o/100)*.55*(1-a.tr.temper);}return s;}
export function pull(a,place){let s=0;for(const b of LIVE)if(b!==a&&b.act.place===place&&b.act.type!=='sleep'&&op(a,b)>40)s+=.12;return Math.min(.35,s);}
export function addRumour(subject,text,seeder){const r={id:S.rid++,subject,text,reach:1,doubt:0,born:S.tick};S.rumours.push(r);seeder.knows.push(r.id);return r;}
export function encounters(){
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
export function interact(a,b,bonus,confront){
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
export function causeOf(a,b){
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
export function quarrel(a,b,host,place,confront){
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
export function gossip(a,b,place){
  const r=S.rumours.find(r=>a.knows.includes(r.id)&&!b.knows.includes(r.id)&&r.subject!==a.id&&!S.agents[r.subject].dead);
  if(r&&rnd()<.75){
    b.knows.push(r.id);const subj=S.agents[r.subject];glyph(a,'…','rumour');
    if(b.id===r.subject){
      adj(b,a,-25);mem(b,a,'spread talk about me',place);glyph(b,'!','bad');
      log(`${N(b)} hears from ${N(a)} what folk have been saying: that ${N(b)} ${r.text}. ${N(b)} is not pleased.`,'rumour','rumour',{ids:[a.id,b.id]});
    }else{
      const trust=(op(b,a)+100)/200*effect('rumourTrust'),doubt=effect('rumourDoubtChance');
      if((op(b,subj)>50&&rnd()<.6)||(doubt>0&&rnd()<doubt)){
        adj(b,a,-4);r.doubt++;
        if(r.doubt===1)log(`${N(b)} won't hear a word of it when ${N(a)} repeats that ${N(subj)} ${r.text}.`,'good');
      }else{
        r.reach++;adj(b,subj,-(8+18*trust));mem(b,subj,`was said to have ${r.text.replace(/^is /,'been ').replace(/^has /,'')}`.replace('have been been','have been'),place);
        if(r.reach===2)log(`${N(a)} passes it on to ${N(b)}: ${N(subj)} ${r.text}.`,'rumour');
        else if(r.reach===5||r.reach===9){log(`By now ${r.reach} people have heard that ${N(subj)} ${r.text}.`,'rumour',r.reach===5?'rumour':null,{ids:[subj.id]});if(r.reach===5)raisePressure('rumourSpread');}
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
export function friendly(a,b,place){
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
