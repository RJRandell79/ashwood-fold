// Ported from the v5 prototype by tools/port-v5.mjs.
import { eraName } from '../sim/effects.js';
import { AGES } from '../data/ages.js';
import { interludeFor } from '../data/interludes.js';
import { IDEA } from '../data/ideas.js';
import { SEASONS, TPD, YEAR_DAYS } from '../data/world.js';
import { armsOf, blazon, familyCards, familyPlural } from '../sim/heraldry.js';
import { op } from '../sim/social.js';
import { LIVE, N, S, numberWord, seasonName, seasonOf, yearOf } from '../sim/state.js';
import { armsSVG, portraitSVG } from './portraits.js';
import { G, cv3, draw3d, flyTo } from './three.js';
import { $, cap, familyLine, showBtn, traitWords } from './ui.js';
import { V } from './vstate.js';

/** The calendar year of game year y. */
export const yearName=y=>(S.years[y]&&S.years[y].cal)??(S.yearBase??1750)+y-1;
export function yearTitle(y,ents){
  const built=ents.find(e=>e.built);if(built)return `The Year of the ${IDEA[built.tech].name.replace(/\b\w/g,c=>c.toUpperCase())}`;
  const ban=ents.find(e=>e.c==='court'&&/banished/.test(e.h));if(ban)return `The Year ${S.agents[ban.ids[0]].first} Was Banished`;
  const el=ents.find(e=>e.election);if(el&&el.ids.length>1&&ents.filter(e=>e.c==='death').length===0)return `The Year ${S.agents[el.ids[0]].first} Was Elected`;
  const deaths=ents.filter(e=>e.c==='death');
  if(deaths.length){const d=S.agents[deaths[0].ids[0]];return deaths.length>2?'The Year of Many Funerals':`The Year ${d.name} Was Buried`;}
  const wed=ents.find(e=>e.c==='wedding');if(wed){const [x,y2]=wed.ids.map(i=>S.agents[i]);return `The Year ${x.first} Married ${y2.first}`;}
  const births=ents.filter(e=>e.c==='birth');if(births.length)return births.length>1?`The Year of ${births.length} Christenings`:`The Year ${S.agents[births[0].ids[0]].first} Was Born`;
  const sab=ents.find(e=>e.sabotage);if(sab)return 'The Year of the Machine Breakers';
  const thin=ents.find(e=>e.harvest==='thin');if(thin)return 'The Hungry Year';
  if(ents.some(e=>e.feud))return 'The Year of Bad Blood';
  if(ents.some(e=>e.idea))return 'The Year of New Ideas';
  return 'A Quiet Year';
}
export function yearIntro(y){
  const r=S.years[y]||{startPop:0,births:0,deaths:0,weddings:0},cur=y===yearOf();
  const endPop=cur?LIVE.length:r.startPop+r.births-r.deaths;
  const bits=[];
  bits.push(`${cur?'This year began':`${yearName(y)} began`} with ${numberWord(r.startPop)} souls in Ashwood Fold${cur?` and there are ${numberWord(LIVE.length)} now`:` and ended with ${numberWord(Math.max(0,endPop))}`}.`);
  const ev=[];if(r.births)ev.push(`${numberWord(r.births)} ${r.births>1?'births':'birth'}`);if(r.deaths)ev.push(`${numberWord(r.deaths)} ${r.deaths>1?'deaths':'death'}`);if(r.weddings)ev.push(`${numberWord(r.weddings)} ${r.weddings>1?'weddings':'wedding'}`);
  bits.push(ev.length?`There ${r.births+r.deaths+r.weddings>1?'were':'was'} ${ev.join(', ').replace(/, ([^,]*)$/,' and $1')}.`:'Nobody was born, married or buried.');
  if(r.harvest)bits.push(`The harvest was ${r.harvest}.`);
  return bits.join(' ');
}
export function paragraphs(ents){const out=[];let cur=[];for(const e of ents){cur.push(e.h+(e.place?showBtn(e.place):''));if(cur.length>=4){out.push(cur.join(' '));cur=[];}}if(cur.length)out.push(cur.join(' '));return out.map(p=>`<p>${p}</p>`).join('');}
export function castEntry(a){
  const life=a.born!=null?`born ${seasonName(a.born)}`:a.arrivedAt!=null?`came to the village ${seasonName(a.arrivedAt)}`:`aged ${Math.floor(a.dead?a.dead.age-(a.dead.t-36)/TPD/YEAR_DAYS:a.age-(S.tick-36)/TPD/YEAR_DAYS)} when this chronicle begins`;
  const end=a.dead?(a.dead.longAgo?`; lived in the days of ${a.dead.ageName.replace(/^The /,'the ')}`:a.dead.exiled?`; ${a.dead.cause}, ${seasonName(a.dead.t)}`:`; died ${seasonName(a.dead.t)}, ${a.dead.cause}, aged ${Math.floor(a.dead.age)}`):`; ${Math.floor(a.age)} years old now`;
  const others=S.agents.filter(b=>b!==a);
  const best=others.filter(b=>op(a,b)>50).sort((x,y)=>op(a,y)-op(a,x))[0],worst=others.filter(b=>op(a,b)<-40).sort((x,y)=>op(a,x)-op(a,y))[0];
  const fam=familyLine(a);
  const bits=[];if(best)bits.push(`Closest to ${N(best)}.`);if(worst)bits.push(`Never got on with ${N(worst)}.`);
  const tr=traitWords(a.tr).slice(0,2).join(' and ');
  return `<div>${portraitSVG(a,64)}<span><b>${a.name}</b><em>${cap(a.job==='child'&&a.dead?'child':a.job==='child'?(a.age<4?'baby':'child'):a.job)}, ${life}${end}</em>${fam?fam+'. ':''}${cap(tr)}. ${bits.join(' ')}</span></div>`;
}
export function snapshot(){
  try{
    if(!G)return null;draw3d(1,0);return cv3.toDataURL('image/jpeg',.85);
  }catch(e){return null;}
}
/** The title of the interlude that closed an age. */
function interludeTitle(age){const a=AGES[age];const I=a&&a.next?interludeFor(age,a.next):null;return I?I.title:'The Years Between';}
export function buildStory(){
  const img=snapshot(),y0=yearOf(S.annals.length?S.annals[0].t:S.tick),y1=yearOf();
  let html=`<h1>The Annals of Ashwood Fold</h1><p class="sub">A true account of the village, from the spring of ${yearName(1)} to ${seasonName().replace(/^\w/,c=>c.toLowerCase())}</p>`;
  if(img)html+=`<figure><img src="${img}" alt="Ashwood Fold in ${SEASONS[seasonOf()].toLowerCase()}, as it stands today"><figcaption>Ashwood Fold as it stands, ${seasonName()}</figcaption></figure>`;
  const first=y0,prologue=S.annals.filter(e=>e.c==='prologue'&&yearOf(e.t)===first);
  if(prologue.length)html+=`<p class="intro">${prologue.map(e=>e.h).join(' ')}</p><p class="orn">· · ·</p>`;
  let prev=null,book=0;const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  for(let y=Math.min(y0,1);y<=y1;y++){
    const rec=S.years[y],era=rec&&rec.era!=null?rec.era:(prev?prev.era:0),age=(rec&&rec.age)||(prev?prev.age:S.age);
    if(!prev||era!==prev.era||age!==prev.age){prev={era,age};html+=`<div class="bookhead"><span class="num">Book ${roman[book++]||book}</span><h2>${eraName(era,age)}</h2></div>`;}
    const all=S.annals.filter(e=>yearOf(e.t)===y&&!(e.c==='prologue'&&y===first));
    const between=all.filter(e=>e.c==='interlude'),ents=all.filter(e=>e.c!=='interlude');
    if(ents.length||S.years[y]){
    html+=`<section class="chapter"><span class="num">${yearName(y)}</span><h2>${yearTitle(y,ents)}</h2><p class="intro">${yearIntro(y)}</p>`;
    for(let s=0;s<4;s++){
      const capN={friend:1,fight:2,feud:2,rumour:2,crime:3,court:3,politics:3,letter:1,departure:3},seen={};
      const se=ents.filter(e=>seasonOf(e.t)===s&&!(e.c==='season'&&e.season===0)&&!/Now for the money|talks .* round to/.test(e.h)).filter(e=>{const c=capN[e.c];if(!c)return true;seen[e.c]=(seen[e.c]||0)+1;return seen[e.c]<=c;});
      if(!se.length)continue;
      html+=`<h3>${SEASONS[s]}</h3>${paragraphs(se)}`;
    }
    html+=`</section>`;
    }
    // the centuries between two ages: one chapter of their own
    if(between.length){const nx=S.years[y+1];html+=`<section class="chapter interlude"><span class="num">${yearName(y)}–${nx&&nx.cal?nx.cal:''}</span><h2>${interludeTitle(rec&&rec.age)}</h2>${between.map(e=>`<p>${e.h}${e.place?showBtn(e.place):''}</p>`).join('')}</section><p class="orn">· · ·</p>`;}
  }
  const cast=[...S.agents].sort((a,b)=>(a.born??-1e9)-(b.born??-1e9)||b.age-a.age);
  const fams=familyCards();
  html+=`<section class="chapter"><span class="num">Appendix</span><h2>The Arms of the Families</h2><div class="armorial">${fams.map(({k,live,members})=>{const ar=armsOf(k);return `<div>${armsSVG(ar,96,'Arms of the '+familyPlural(k))}<b>${familyPlural(k)}</b><span>“${ar.motto}”</span><i>${blazon(ar)}</i><i>${live.length?`${live.length} living, ${members.length-live.length} departed`:'The line has ended'}</i></div>`;}).join('')}</div></section>`;
  html+=`<section class="chapter"><span class="num">Appendix</span><h2>The Folk of Ashwood Fold</h2><div class="cast">${cast.map(castEntry).join('')}</div></section><p class="orn">· · ·</p>`;
  $('book').innerHTML=html;
  $('storyMeta').textContent=`${S.annals.length} entries · ${S.agents.length} lives`;
}
export let storySpeed=1;
$('openStory').onclick=()=>{buildStory();$('story').hidden=false;$('story').scrollTop=0;document.body.style.overflow='hidden';storySpeed=V.speed;V.speed=0;$('closeStory').focus();};
export function closeStory(){$('story').hidden=true;document.body.style.overflow='';V.speed=storySpeed;$('openStory').focus();}
$('closeStory').onclick=closeStory;
// "Show" on a chronicle or annals entry: close the book if it is open, then go to the place in the valley.
document.addEventListener('click',e=>{const b=e.target.closest('.show');if(!b)return;e.preventDefault();
  if(!$('story').hidden)closeStory();
  if(flyTo(b.dataset.place))cv3.scrollIntoView({behavior:'smooth',block:'center'});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('story').hidden)closeStory();});
$('copyStory').onclick=()=>{
  const book=$('book').cloneNode(true);book.querySelectorAll('figure').forEach(f=>f.remove());
  const text=[...book.querySelectorAll('h1,.sub,h2,.num,h3,p,.cast div')].map(el=>el.matches('h1,h2')?'\n'+el.textContent.toUpperCase():el.matches('h3')?'\n'+el.textContent:el.textContent).join('\n');
  const done=()=>{$('copyStory').textContent='Copied';setTimeout(()=>$('copyStory').textContent='Copy as text',1800);};
  try{navigator.clipboard.writeText(text).then(done,()=>{$('copyStory').textContent='Copy failed: select the text instead';});}catch(e){$('copyStory').textContent='Copy failed: select the text instead';}
};
