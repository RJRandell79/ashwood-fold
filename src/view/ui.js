// Ported from the v5 prototype by tools/port-v5.mjs.
import { STRANGERS } from '../data/folk.js';
import { IDEA, IDEAS } from '../data/ideas.js';
import { effect, eraName } from '../sim/effects.js';
import { MAXPOP, SEASONS, TPD } from '../data/world.js';
import { autosave, decode, encode } from '../save/codec.js';
import { favourite, voters } from '../sim/civic.js';
import { armsOf, blazon, familyCards, familyKey, familyPlural } from '../sim/heraldry.js';
import { requiresMet } from '../sim/ideas.js';
import { nudgeFair, nudgePurse, nudgeRumour, nudgeShort, nudgeStorm, nudgeStranger } from '../sim/nudges.js';
import { newTown } from '../sim/setup.js';
import { op } from '../sim/social.js';
import { byJob, childrenOf, clamp, dayInSeason, dayOf, fairOn, fmtTime, isAdult, isSunday, jobLabel, listNames, LIVE, moodOf, N, P, PN, refreshLive, S, seasonName, seasonOf, setState, surname, techBuilt, weekday } from '../sim/state.js';
import { armsSVG, portraitSVG } from './portraits.js';
import { G } from './three.js';
import { V } from './vstate.js';

export function $(id){return (document.getElementById(id));}
export function cap(s){return (s[0].toUpperCase()+s.slice(1));}
export function describe(a){
  if(a.dead)return `died ${seasonName(a.dead.t)}`;
  if(!a.arrived){const verb={sleep:'heading home to bed',eat:'heading home to eat',work:`off to work at ${PN(a.act.place)}`,lessons:'off to school',gather:'on the way to a gathering',confront:`looking for ${S.agents[a.act.target]?S.agents[a.act.target].first:'someone'}`}[a.act.type];return verb||`walking to ${PN(a.act.place)}`;}
  const p=PN(a.act.place);
  switch(a.act.type){
    case 'sleep':return 'asleep';
    case 'eat':return a.age<4?'being fed':'eating at home';
    case 'buy':return 'buying bread';
    case 'meal':return 'eating supper at The Plough';
    case 'steal':return 'lingering at the Bakehouse';
    case 'work':return a.job==='innkeeper'?'serving at The Plough':`working at ${p}`;
    case 'social':return a.tipsy>.3?`drinking at ${p}`:`passing the time at ${p}`;
    case 'play':return `playing on ${p}`;
    case 'lessons':return 'at lessons in the School';
    case 'help':return `helping out at ${p}`;
    case 'chapel':return 'at chapel';
    case 'fair':return S.fair&&S.fair.harvest?'at the Harvest Home':'enjoying the fair';
    case 'gather':{const g=S.gathers.find(x=>x.id===a.act.target);return g?({wedding:'at a wedding',funeral:'at a funeral',election:'voting at the Moot Hall',court:((g.cases||[]).some(c=>c.accused===a.id)?'on trial at the Moot Hall':(g.jurors||[]).includes(a.id)?'sitting on the jury':'watching the court')}[g.type]):'at the Chapel';}
    case 'confront':return 'spoiling for a row';
    default:return a.age<4?'at home':`wandering about ${p}`;
  }
}
export function moodColor(m){return (m>.6?'var(--good)':m>.35?'var(--lamp)':'var(--bad)');}
export let rosterEls={}, rosterSig='';
export function buildRoster(){
  const sig=LIVE.map(a=>a.id).join(',')+'|'+S.agents.length;
  rosterSig=sig;
  const r=$('roster');r.innerHTML='';rosterEls={};
  const order=[...LIVE].sort((x,y)=>(x.home>y.home?1:x.home<y.home?-1:0)||y.age-x.age);
  for(const a of order){
    const b=document.createElement('button');b.className='res';b.dataset.id=a.id;
    b.innerHTML=`<span class="thumb">${portraitSVG(a,30)}</span><span><span class="nm">${a.first}<small>${jobLabel(a)} · ${Math.floor(a.age)}</small></span><span class="doing"></span></span><span class="mood"><span></span></span>`;
    r.appendChild(b);rosterEls[a.id]=b;
  }
  const dead=S.agents.filter(a=>a.dead).sort((x,y)=>y.dead.t-x.dead.t);
  $('yardBox').hidden=!dead.length;$('yardSum').textContent=`The chapel yard and the departed (${dead.length})`;
  $('yard').innerHTML=dead.map(a=>`<button class="res" data-id="${a.id}"><span class="thumb">${portraitSVG(a,30)}</span><span><span class="nm">${a.name}<small>${Math.floor(a.dead.age)} · ${jobLabel(a)}</small></span><span class="doing">${a.dead.exiled?cap(a.dead.cause):'Died'}, ${seasonName(a.dead.t)}</span></span></button>`).join('');
  const selEl=$('rumourSubject');const cur=selEl.value;
  selEl.innerHTML=LIVE.filter(isAdult).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  if(cur!==''&&LIVE.some(a=>String(a.id)===cur))selEl.value=cur;
  $('nStranger').disabled=!STRANGERS.some(n=>!S.agents.some(a=>a.name===n[0]))||LIVE.length>=MAXPOP;
}
export function traitWords(t){
  const w=[];
  if(t.temper>.6)w.push('quick-tempered');else if(t.temper<.3)w.push('even-tempered');
  if(t.warmth>.65)w.push('warm-hearted');else if(t.warmth<.35)w.push('reserved');
  if(t.diligence>.7)w.push('hard-working');else if(t.diligence<.4)w.push('idle');
  if(t.forgive>.65)w.push('forgiving');else if(t.forgive<.3)w.push('holds grudges');
  if(t.gossip>.65)w.push('loose-tongued');
  if(t.scruple<.45)w.push('light-fingered');else if(t.scruple>.8)w.push('scrupulous');
  return w.length?w:['unremarkable'];
}
export function familyLine(a){
  const parts=[];
  if(a.spouse>=0){const s=S.agents[a.spouse];parts.push(`${a.sex==='f'?'Wife':'Husband'} of ${N(s)}${s.dead?' (late)':''}`);}
  else if(a.widowOf!=null)parts.push(`${a.sex==='f'?'Widow':'Widower'} of ${N(S.agents[a.widowOf])}`);
  else if(a.formerSpouse!=null)parts.push(`Once married to ${N(S.agents[a.formerSpouse])}`);
  if(a.parents.length)parts.push(`${a.sex==='f'?'Daughter':'Son'} of ${listNames(a.parents.map(i=>S.agents[i]))}`);
  const kids=childrenOf(a);if(kids.length)parts.push(`${a.sex==='f'?'Mother':'Father'} of ${listNames(kids)}`);
  return parts.join(' · ');
}
export function renderDetail(){
  const d=$('detail'),a=S.agents[V.sel];
  if(!a){d.innerHTML='<p class="empty">Tap a villager on the map or in the list to follow them. Their friendships show as solid green threads on the map, grudges as dashed red.</p>';return;}
  const bar=(label,v)=>`<span>${label}</span><span class="bar"><span style="width:${Math.round(v*100)}%;background:${v>.7?'var(--bad)':v>.45?'var(--lamp)':'var(--good)'}"></span></span><em>${Math.round(v*100)}</em>`;
  const others=LIVE.filter(b=>b!==a).map(b=>({b,o:op(a,b)})).sort((x,y)=>y.o-x.o);
  const rel=r=>{const o=Math.round(r.o),w=Math.abs(o)/2;return `<span class="who" data-id="${r.b.id}">${r.b.first}</span><span class="bar"><span style="${o>=0?`left:50%;width:${w}%;background:var(--good)`:`right:50%;width:${w}%;background:var(--bad)`}"></span></span><em>${o>0?'+':''}${o}</em>`;};
  const friends=others.filter(r=>r.o>20).slice(0,3),foes=others.filter(r=>r.o<-15).reverse().slice(0,3);
  const mems=a.mem.map(m=>{const who=m.w>=0?S.agents[m.w]:null;const txt=who?(/ me$/.test(m.t)||/^(is|was|smashed|mourns)/.test(m.t)?(m.t==='mourns'?`mourns ${N(who)}`:`${N(who)} ${m.t}`):`${m.t} ${N(who)}`):m.t;return `<li><time>Day ${m.d}</time>${txt}${m.p?` at ${PN(m.p)}`:''}</li>`;}).join('');
  const rum=S.rumours.filter(r=>a.knows.includes(r.id)).slice(-4).map(r=>`<li>that ${r.subject===a.id?'they themselves':N(S.agents[r.subject])} ${r.text}</li>`).join('');
  const fam=familyLine(a);
  const role=a.dead?(a.dead.exiled?`${cap(jobLabel(a))} · ${a.dead.cause}, ${seasonName(a.dead.t)}`:`${cap(jobLabel(a))} · died ${seasonName(a.dead.t)}, aged ${Math.floor(a.dead.age)}, ${a.dead.cause}`):`${cap(jobLabel(a))} · ${Math.floor(a.age)} years old · ${P[a.home].name}${isAdult(a)?` · ${Math.floor(a.coins)} pennies`:''}`;
  const fk=familyKey(a);
  d.innerHTML=`<div class="dhead"><div class="dport">${portraitSVG(a,88)}</div><div><div class="dname"><h3>${a.name}</h3>${armsSVG(armsOf(fk),30,'Arms of the '+familyPlural(fk))}</div><p class="role">${role}</p></div></div>${fam?`<p class="fam">${fam}</p>`:''}
   ${a.dead?'':`<p class="now">${cap(describe(a))}</p><div class="meters">${bar('Hunger',a.hunger)}${bar('Tiredness',a.tired)}${bar('Loneliness',a.lonely)}</div>`}
   <div class="lbl">Temperament</div><div class="traits">${traitWords(a.tr).map(w=>`<span>${w}</span>`).join('')}</div>
   ${a.dead?'':`<div class="lbl">Thinks well of</div>${friends.length?`<div class="rels">${friends.map(rel).join('')}</div>`:'<p class="empty">Nobody in particular.</p>'}
   <div class="lbl">Thinks ill of</div>${foes.length?`<div class="rels">${foes.map(rel).join('')}</div>`:'<p class="empty">Nobody, yet.</p>'}`}
   <div class="lbl">Remembers</div>${mems?`<ul class="mems">${mems}</ul>`:'<p class="empty">Nothing worth telling.</p>'}
   ${rum&&!a.dead?`<div class="lbl">Has heard</div><ul class="mems">${rum}</ul>`:''}`;
}
export function renderTechs(){
  const html=IDEAS.map(T=>{
    const id=T.id,t=S.tech[id],locked=!requiresMet(T)&&t.state==='none';
    let tag,line,extra='';
    if(t.state==='building'){const pct=clamp(100-(t.doneAt-S.tick)/(TPD*T.buildDays)*100,0,100);return `<div class="tech st-idea"><div class="tn"><b>${T.name}</b><span>Being built</span></div><div class="ts">${N(S.agents[t.inventor])}'s scheme. Finished in ${Math.max(1,Math.ceil((t.doneAt-S.tick)/TPD))} days.</div><div class="pm"><span style="width:${pct}%"></span></div></div>`;}
    if(t.state==='built'){const broken=t.brokenUntil>S.tick;tag=broken?'Wrecked':'Built';
      line=broken?`Smashed in the night. Repairs in ${Math.ceil((t.brokenUntil-S.tick)/TPD)} day${t.brokenUntil-S.tick>TPD?'s':''}.`:`Built ${seasonName(t.builtAt)}. ${N(S.agents[t.inventor])}'s idea. It ${T.what}.`;
      return `<div class="tech ${broken?'st-broken':'st-built'}"><div class="tn"><b>${T.name}</b><span>${tag}</span></div><div class="ts">${line}</div></div>`;}
    if(t.state==='idea'){const inv=S.agents[t.inventor],bk=t.backers.map(i=>S.agents[i]).filter(b=>b!==inv),opp=t.opponents.map(i=>S.agents[i]);
      line=`${N(inv)}'s idea. Backers ${t.backers.length} of ${T.backers}${bk.length?` (${listNames(bk.slice(0,4))}${bk.length>4?' and more':''})`:''}${opp.length?`. Against: ${listNames(opp.slice(0,4))}`:''}. Costs ${T.cost} pennies.`;
      return `<div class="tech st-idea"><div class="tn"><b>${T.name}</b><span>Being argued over</span></div><div class="ts">${line}</div></div>`;}
    if(locked)return `<div class="tech st-locked"><div class="tn"><b>${T.name}</b><span>Unthought of</span></div><div class="ts">Nobody will think of it until the village has the ${T.requires.map(r=>(Array.isArray(r)?r:[r]).map(x=>IDEA[x].name.toLowerCase()).join(' or the ')).join(' and the ')}.</div></div>`;
    if(t.state==='abandoned')return `<div class="tech st-locked"><div class="tn"><b>${T.name}</b><span>Set aside</span></div><div class="ts">Twice argued over and twice dropped. Nobody will raise it again until times change, or ten years have passed.</div></div>`;
    const pr=clamp(t.pressure,0,100);
    line=pr<25?'Nobody is talking about it.':pr<75?`${T.hint}.`:`${T.hint}. Someone is bound to think of it soon.`;
    return `<div class="tech"><div class="tn"><b>${T.name}</b><span>Unthought of</span></div><div class="ts">${line}</div><div class="pm" aria-hidden="true"><span style="width:${pr}%"></span></div></div>`;
  }).join('');
  if(html!==renderTechs.last){$('techs').innerHTML=html;renderTechs.last=html;}
}
export function renderCivic(){
  const r=byJob('reeve'),e=S.election;
  let h=`<div class="hallbox"><div class="lbl" style="margin:0">The reeve</div>`;
  h+=r?`<div class="cand one"><span class="thumb">${portraitSVG(r,30)}</span><span>${N(r)} ${surname(r)} <small>${S.reeveSince!=null?'elected '+seasonName(S.reeveSince):'appointed by the manor'}</small></span></div>`:`<p class="empty">Nobody holds the office.</p>`;
  if(e){
    const vs=voters(),count={};for(const id of e.cands)count[id]=0;for(const v of vs){const f=favourite(v,false);if(f!=null)count[f]++;}
    h+=`<div class="lbl" style="margin:4px 0 0">Election ${dayOf(e.vote)===dayOf()?'today':'on '+weekday(e.vote)} · support if the vote were now</div>`;
    h+=e.cands.filter(id=>!S.agents[id].dead).map(id=>{const c=S.agents[id];return `<div class="cand"><span class="thumb">${portraitSVG(c,30)}</span><span>${N(c)}${c.job==='reeve'?' <small>reeve</small>':` <small>${c.job}</small>`}</span><span class="vbar"><span style="width:${Math.round(count[id]/Math.max(1,vs.length)*100)}%"></span></span><em>${count[id]}</em></div>`;}).join('');
  }else h+=`<p class="note2">Next election: ${seasonName(S.nextElection)}.${S.lastElection?` Last time: ${S.lastElection.res.map(([id,v])=>`${S.agents[id].first} ${v}`).join(', ')}.`:''}</p>`;
  h+='</div>';
  const pend=S.cases.concat(...S.gathers.filter(g=>g.type==='court').map(g=>g.cases));
  let c=`<div class="hallbox"><div class="lbl" style="margin:0">The court</div>`;
  c+=pend.length?`<p class="note2">Waiting to be heard: ${pend.slice(0,3).map(x=>`${N(S.agents[x.accused])}, for ${x.charge}`).join('; ')}${pend.length>3?' and more':''}.</p>`:'<p class="note2">No cases waiting. The court sits on Saturdays when there is business.</p>';
  c+=S.verdicts.slice(0,4).map(v=>`<div class="verd"><span class="pill ${v.guilty?'bad':'good'}">${v.guilty?'Guilty':'Acquitted'} ${v.guilty?v.score[0]+'–'+v.score[1]:v.score[1]+'–'+v.score[0]}</span><span>${N(S.agents[v.acc])}, ${v.charge}</span></div>`).join('');
  c+='</div>';
  $('civic').innerHTML=h+c;
}
export function renderFamilies(){
  const html=familyCards().map(({k,members,live})=>{
    const ar=armsOf(k),dead=members.length-live.length,faces=(live.length?live:members).sort((x,y)=>y.age-x.age).slice(0,8);
    return `<div class="famcard${live.length?'':' gone'}">${armsSVG(ar,62,'Arms of the '+familyPlural(k))}<div style="min-width:0"><h3>The ${familyPlural(k)}</h3><p class="motto">“${ar.motto}”</p><p class="blz">${blazon(ar)}</p><div class="faces">${faces.map(a=>`<button class="who" data-id="${a.id}" aria-label="${a.name}">${portraitSVG(a,26)}</button>`).join('')}</div><div class="count">${live.length?`${live.length} living`:'No one left'}${dead?` · ${dead} in the chapel yard`:''}</div></div></div>`;
  }).join('');
  const sig=familyCards().map(c=>c.k+c.live.map(a=>a.id+':'+Math.floor(a.age)+a.job).join(',')+armsOf(c.k).aug.join('')).join('|');
  if(sig!==renderFamilies.sig){renderFamilies.sig=sig;$('fams').innerHTML=html;}
}
export let logLen=-1, logFirst=null;
/** A small button after a chronicle entry that shows where it happened. */
export function showBtn(id){const nm=id==='crossing'?'the river crossing':(P[id]?P[id].name:'');return nm?` <button class="show" data-place="${id}" aria-label="Show ${nm} in the valley" title="Show ${nm}">Show</button>`:'';}
export function renderLog(){
  if(S.log.length===logLen&&S.log[0]===logFirst)return;logLen=S.log.length;logFirst=S.log[0];
  let html='',day=-1;
  for(let i=S.log.length-1;i>=Math.max(0,S.log.length-220);i--){const e=S.log[i],d=dayOf(e.t);
    if(d!==day){day=d;html+=`<h3 class="dayhead">${weekday(e.t)}, day ${dayInSeason(e.t)} of ${seasonName(e.t)}</h3>`;}
    html+=`<div class="entry k-${e.k}"><time>${fmtTime(e.t)}</time><i></i><p>${e.h}${e.p?showBtn(e.p):''}</p></div>`;}
  $('log').innerHTML=html||'<p class="empty">Nothing has happened yet.</p>';
}
export function render(force){
  if(!S)return;
  $('when').innerHTML=`${seasonName()}<small>${weekday()}, day ${dayInSeason()} of ${SEASONS[seasonOf()].toLowerCase()} · ${fmtTime(S.tick)}</small>`;
  const chips=[`<span class="chip era">${eraName(S.era)}</span>`];
  if(S.election)chips.push(`<span class="chip fair">Election ${dayOf(S.election.vote)===dayOf()?'today':weekday(S.election.vote)}</span>`);
  if(S.storm>0)chips.push(`<span class="chip storm">${seasonOf()===3?'Blizzard':'Storm'} · ${Math.ceil(S.storm/6)}h left</span>`);
  if(S.fair)chips.push(`<span class="chip fair">${S.fair.harvest?'Harvest Home':fairOn()?'Fair on the Green':'Fair '+(dayOf(S.fair.start)===dayOf()?'at 10:00':'tomorrow')}</span>`);
  for(const g of S.gathers)if(g.type!=='election')chips.push(`<span class="chip ${g.type==='wedding'?'fair':''}">${{wedding:'Wedding',funeral:'Funeral',court:'Court'}[g.type]} ${S.tick>=g.start?'now':dayOf(g.start)===dayOf()?'today':'tomorrow'}</span>`);
  const live=S.rumours.filter(r=>S.tick-r.born<TPD*4).length;if(live)chips.push(`<span class="chip rumour">${live} rumour${live>1?'s':''} about</span>`);
  if(S.spoil>0)chips.push(`<span class="chip rumour">Flour spoiled · ${Math.ceil(S.spoil/6)}h</span>`);
  if(isSunday())chips.push('<span class="chip">Sunday</span>');
  $('chips').innerHTML=chips.join('');
  const st=S.stores,kids=LIVE.filter(a=>a.age<14).length;
  $('stores').innerHTML=`<span>Souls <b>${LIVE.length}</b>${kids?` (${kids} children)`:''}</span><span>Granary <b>${Math.floor(st.grain)}</b> of ${effect('grainCap')}</span><span>Flour <b>${Math.floor(st.flour)}</b></span><span>Loaves <b>${Math.floor(st.bread)}</b></span>`;
  const sig=LIVE.map(a=>a.id).join(',')+'|'+S.agents.length;
  if(sig!==rosterSig||force)buildRoster();
  for(const a of LIVE){const el=rosterEls[a.id];if(!el)continue;el.querySelector('.doing').textContent=describe(a);const m=moodOf(a),ms=el.querySelector('.mood span');ms.style.width=Math.round(m*100)+'%';ms.style.background=moodColor(m);el.classList.toggle('sel',a.id===V.sel);}
  if(force||render.n++%2===0){renderDetail();renderTechs();}
  if(force||render.n%6===1)renderFamilies();
  if(force||render.n%3===1)renderCivic();
  renderLog();
  $('nFair').disabled=!!S.fair;
}
render.n=0;
export function select(id){V.sel=id;render(true);}
document.addEventListener('click',e=>{const w=e.target.closest('.who,.res');if(w&&w.dataset.id!=null&&!w.closest('.story'))select(+w.dataset.id);});
export const TPS={0:0,1:3,3:9,10:30,30:90};
document.querySelectorAll('.speed button').forEach(b=>b.addEventListener('click',()=>{V.speed=+b.dataset.speed;document.querySelectorAll('.speed button').forEach(x=>x.classList.toggle('on',x===b));}));
$('nRumour').onclick=()=>nudgeRumour(+$('rumourSubject').value);
$('nShort').onclick=nudgeShort;
$('nStorm').onclick=nudgeStorm;
$('nStranger').onclick=nudgeStranger;
$('nFair').onclick=nudgeFair;
$('nPurse').onclick=nudgePurse;
export function msg(t){$('saveMsg').textContent=t;}
$('copySave').onclick=()=>{const code=encode();
  const fallback=()=>{$('loadArea').hidden=false;$('saveText').value=code;$('saveText').select();msg('Select all the text below and copy it.');};
  try{navigator.clipboard.writeText(code).then(()=>msg('Save code copied. Paste it somewhere safe.'),fallback);}catch(e){fallback();}};
$('showLoad').onclick=()=>{$('loadArea').hidden=false;$('saveText').value='';$('saveText').focus();msg('');};
$('cancelLoad').onclick=()=>{$('loadArea').hidden=true;msg('');};
export function resetViews(){V.sel=-1;logLen=-1;rosterSig='';renderTechs.last='';renderFamilies.sig='';if(G){for(const id in G.agents){G.scene.remove(G.agents[id].g);}G.agents={};}}
$('loadSave').onclick=()=>{try{setState(decode($('saveText').value));refreshLive();resetViews();render(true);$('loadArea').hidden=true;msg(`Loaded. ${seasonName()}, ${fmtTime(S.tick)}.`);autosave();}catch(e){msg(e.message||'That save code could not be read.');}};
export let confirmNew=0;
$('newTown').onclick=()=>{if(Date.now()-confirmNew>4000){confirmNew=Date.now();$('newTown').textContent='Tap again to start over';msg('This replaces the current village.');return;}
  confirmNew=0;$('newTown').textContent='Start a new village';newTown((Math.random()*2**31)|0);resetViews();render(true);msg('A new village, same faces, fresh fortunes.');};
