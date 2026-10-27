
// ---------- drawing ----------
const cv=document.getElementById('map');let cw=0,ch=0,dpr=1,C={},colorStamp=0;
function readColors(){
  const cs=getComputedStyle(document.documentElement);
  for(const k of ['grass','grass2','path','roof','roofhome','field','water','night','mapink','lamp','good','bad','accent','muted','bg','panel','ink'])C[k]=cs.getPropertyValue('--'+k).trim();
  C.L=cs.getPropertyValue('--agentL').trim()||'40%';C.dark=parseInt(C.L)>50;
}
function resize(){const r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;cw=r.width;ch=r.width*H/W;cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);}
new ResizeObserver(resize).observe(cv);
function darkness(h){const [r,s]=LIGHT[seasonOf()];if(h<r-1.5||h>=s+2)return .55;if(h<r+.5)return .55*(r+.5-h)/2;if(h>=s)return .55*(h-s)/2;return 0;}
function doorOf(p){const cx=p.x+p.w/2;return p.y+p.h<=13?[cx,p.y+p.h]:[cx,p.y];}
function agentColor(a){return `hsl(${hueOf(a)} 58% ${C.L})`;}
const visibleA=a=>!a.dead&&!(a.arrived&&a.act.type==='sleep');
function draw(al){
  if(!cw)resize();if(!cw)return;
  if(performance.now()-colorStamp>1500){readColors();colorStamp=performance.now();}
  const ctx=cv.getContext('2d'),ts=cw/W,px=1/ts,season=seasonOf();
  ctx.setTransform(dpr*ts,0,0,dpr*ts,0,0);
  ctx.fillStyle=C.grass;ctx.fillRect(0,0,W,H);
  if(season===3){ctx.fillStyle=C.bg;ctx.globalAlpha=.55;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  else if(season===2){ctx.fillStyle=C.lamp;ctx.globalAlpha=.12;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  ctx.fillStyle=C.grass2;for(let i=0;i<40;i++){const x=(i*7.3)%W,y=(i*11.7)%23;ctx.fillRect(x,y,.25,.25);}
  ctx.fillStyle=C.water;ctx.fillRect(0,23.8,W,2.2);
  if(placeShown('wharf')){ctx.fillRect(0,.3,W,.5);}
  if(techBuilt('railway')){ctx.strokeStyle=C.mapink;ctx.globalAlpha=.7;ctx.lineWidth=.06;ctx.beginPath();ctx.moveTo(0,.06);ctx.lineTo(W,.06);ctx.moveTo(0,.2);ctx.lineTo(W,.2);ctx.stroke();for(let x=.3;x<W;x+=.7){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,.26);ctx.stroke();}ctx.globalAlpha=1;}
  ctx.strokeStyle=C.bg;ctx.globalAlpha=.35;ctx.lineWidth=.08;
  for(let i=0;i<8;i++){const x=(i*5.3+(S.tick*.15))%W;ctx.beginPath();ctx.moveTo(x,24.6+(i%3)*.5);ctx.lineTo(x+1.4,24.6+(i%3)*.5);ctx.stroke();}
  ctx.globalAlpha=1;
  ctx.strokeStyle=C.path;ctx.lineWidth=.75;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(0,13);ctx.lineTo(16,13);ctx.stroke();
  for(const id in P){if(id==='square'||!placeShown(id))continue;const p=P[id],d=doorOf(p);ctx.beginPath();ctx.moveTo(d[0],d[1]);ctx.lineTo(d[0],13);ctx.lineTo(clamp(d[0],16,24),13);ctx.stroke();}
  if(techBuilt('barn')){ctx.fillStyle=C.roof;ctx.fillRect(BARN.x,BARN.y,BARN.w,BARN.h);ctx.strokeStyle=C.mapink;ctx.globalAlpha=.35;ctx.lineWidth=.07;ctx.strokeRect(BARN.x,BARN.y,BARN.w,BARN.h);ctx.globalAlpha=1;}
  for(const id in P){
    const p=P[id];if(!placeShown(id))continue;
    if(p.indoor){
      ctx.fillStyle=p.home?C.roofhome:C.roof;ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.strokeStyle=C.mapink;ctx.globalAlpha=.35;ctx.lineWidth=.07;ctx.strokeRect(p.x,p.y,p.w,p.h);
      ctx.beginPath();ctx.moveTo(p.x+.3,p.y+p.h/2);ctx.lineTo(p.x+p.w-.3,p.y+p.h/2);ctx.stroke();ctx.globalAlpha=1;
      if(season===3){ctx.fillStyle=C.bg;ctx.globalAlpha=.45;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.globalAlpha=1;}
      if(id==='mill'){ctx.strokeStyle=C.mapink;ctx.lineWidth=.1;ctx.beginPath();ctx.arc(p.x+p.w+.6,p.y+p.h-.4,.8,0,Math.PI*2);ctx.stroke();
        if(techBuilt('millstone')){ctx.beginPath();ctx.arc(p.x+p.w+.6,p.y+p.h-2.2,.8,0,Math.PI*2);ctx.stroke();}}
      if(id==='cottonmill'){ctx.fillStyle=C.mapink;ctx.fillRect(p.x+p.w-1,p.y-.9,.5,1.2);}
      if(id==='chapel'){ctx.strokeStyle=C.mapink;ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(p.x+p.w/2,p.y-.9);ctx.lineTo(p.x+p.w/2,p.y+.1);ctx.moveTo(p.x+p.w/2-.35,p.y-.55);ctx.lineTo(p.x+p.w/2+.35,p.y-.55);ctx.stroke();}
    }else if(id==='fields'){
      ctx.fillStyle=C.field;ctx.globalAlpha=season===3?.4:1;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.globalAlpha=1;ctx.strokeStyle=C.mapink;ctx.globalAlpha=.15;ctx.lineWidth=.06;
      for(let x=p.x+.6;x<p.x+p.w;x+=.7){ctx.beginPath();ctx.moveTo(x,p.y+.2);ctx.lineTo(x,p.y+p.h-.2);ctx.stroke();}ctx.globalAlpha=1;
    }else if(id==='square'){
      ctx.fillStyle=C.grass2;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle=C.path;ctx.lineWidth=.2;ctx.strokeRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle=C.water;ctx.strokeStyle=C.mapink;ctx.lineWidth=.08;ctx.beginPath();ctx.arc(20,13,.55,0,Math.PI*2);ctx.fill();ctx.stroke();
    }else if(id==='garden'){
      ctx.fillStyle=C.grass2;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=C.good;ctx.globalAlpha=season===3?.15:.45;
      for(let x=p.x+.5;x<p.x+p.w;x+=.8)for(let y=p.y+.5;y<p.y+p.h;y+=.8){ctx.beginPath();ctx.arc(x,y,.14,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    }else if(id==='wharf'){
      ctx.fillStyle=C.path;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=C.roof;for(let i=0;i<3;i++)ctx.fillRect(p.x+.5+i*1.1,p.y+.6,.7,.7);
    }else{
      ctx.fillStyle=C.path;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle=C.mapink;ctx.globalAlpha=.4;ctx.lineWidth=.1;
      ctx.beginPath();ctx.moveTo(p.x+p.w/2,p.y+.4);ctx.lineTo(p.x+p.w/2,p.y+p.h-.4);ctx.moveTo(p.x+p.w/2-.4,p.y+1);ctx.lineTo(p.x+p.w/2+.4,p.y+1);ctx.stroke();ctx.globalAlpha=1;
    }
  }
  const h=hourOf(),dk=darkness(h)+(S.storm>0?.18:0);
  if(dk>0){ctx.fillStyle=C.night;ctx.globalAlpha=Math.min(.7,dk);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(dk>.15){
    const lit={};for(const a of LIVE)if(a.arrived&&a.at&&P[a.at].indoor&&a.act.type!=='sleep')lit[a.at]=1;
    ctx.fillStyle=C.lamp;
    for(const id in lit){const p=P[id];ctx.globalAlpha=.9;ctx.fillRect(p.x+.6,p.y+p.h-1,.45,.45);ctx.fillRect(p.x+p.w-1.05,p.y+p.h-1,.45,.45);ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)*.6,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
  }
  const fs=Math.max(10,ts*.58)*px;
  ctx.font=`500 ${fs}px "Alegreya Sans", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const id in P){const p=P[id];if(!placeShown(id))continue;let name=p.name.replace(/^the /,'');if((ts<15&&p.home)||p.w<3)name=name.split(' ').slice(0,2).join(' ').replace(/ Cottage$/,'');
    const ly=p.indoor?p.y+p.h+fs*.75:p.y+fs*.75;
    ctx.fillStyle=C.mapink;ctx.globalAlpha=dk>.3?.85:.7;ctx.fillText(name,p.x+p.w/2,ly);}
  ctx.globalAlpha=1;
  if(S.storm>0||season===3){const snow=season===3;ctx.strokeStyle=snow?C.bg:C.water;ctx.fillStyle=C.bg;ctx.globalAlpha=snow?.8:.6;ctx.lineWidth=.06;const off=(performance.now()/(snow?160:40))%3;
    const n=S.storm>0?90:30;for(let i=0;i<n;i++){const x=(i*4.37+(snow?Math.sin(off+i)*.3:0))%W,y=((i*7.91)+off*3)%H;if(snow){ctx.beginPath();ctx.arc(x,y,.1,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-.25,y+.7);ctx.stroke();}}ctx.globalAlpha=1;}
  const s=S.agents[sel];
  const pos=a=>[a.px+(a.x-a.px)*al,a.py+(a.y-a.py)*al];
  if(s&&visibleA(s)){
    const sp=pos(s);
    for(const b of LIVE){if(b===s||!visibleA(b))continue;const o=op(s,b);if(Math.abs(o)<40)continue;
      const bp=pos(b);ctx.strokeStyle=o>0?C.good:C.bad;ctx.globalAlpha=Math.min(.85,Math.abs(o)/100);ctx.lineWidth=.12;ctx.setLineDash(o>0?[]:[.35,.25]);
      ctx.beginPath();ctx.moveTo(sp[0],sp[1]);ctx.lineTo(bp[0],bp[1]);ctx.stroke();}
    ctx.setLineDash([]);ctx.globalAlpha=1;
  }
  const R=Math.max(.42,5*px);
  for(const a of LIVE){
    if(!visibleA(a))continue;
    const [x,y]=pos(a),r=R*(a.age<4?.55:a.age<14?.75:1);
    ctx.fillStyle=agentColor(a);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=C.dark?C.bg:'#fff';ctx.lineWidth=Math.max(.06,1*px);ctx.stroke();
    if(a.id===sel){ctx.strokeStyle=C.lamp;ctx.lineWidth=Math.max(.12,2*px);ctx.beginPath();ctx.arc(x,y,r+.28,0,Math.PI*2);ctx.stroke();}
    if(ts>=18&&a.age>=14){ctx.fillStyle=C.dark?C.bg:'#fff';ctx.font=`700 ${r*1.2}px "Alegreya Sans", sans-serif`;ctx.fillText(a.first[0],x,y+r*.05);}
    if(a.glyph){const g=a.glyph;ctx.font=`700 ${Math.max(12,ts*.8)*px}px "Alegreya Sans", sans-serif`;
      ctx.fillStyle=g.k==='good'?C.good:g.k==='bad'?C.bad:g.k==='rumour'?C.lamp:C.mapink;
      ctx.fillText(g.c,x,y-r-Math.max(.45,7*px));}
  }
}
cv.addEventListener('click',e=>{
  const rc=cv.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*W,y=(e.clientY-rc.top)/rc.height*H;
  let best=-1,bd=1.6;for(const a of LIVE){if(!visibleA(a))continue;const d=Math.hypot(a.x-x,a.y-y);if(d<bd){bd=d;best=a.id;}}
  if(best>=0)select(best);
});

// ---------- interface ----------
const $=id=>document.getElementById(id);
const cap=s=>s[0].toUpperCase()+s.slice(1);
function describe(a){
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
    case 'gather':{const g=S.gathers.find(x=>x.id===a.act.target);return g?({wedding:'at a wedding',funeral:'at a funeral',election:'voting at the Moot Hall',court:(g.cases.some(c=>c.accused===a.id)?'on trial at the Moot Hall':g.jurors.includes(a.id)?'sitting on the jury':'watching the court')}[g.type]):'at the Chapel';}
    case 'confront':return 'spoiling for a row';
    default:return a.age<4?'at home':`wandering about ${p}`;
  }
}
const moodOf=a=>clamp(1-(a.hunger*.45+a.tired*.3+a.lonely*.25),0,1);
const moodColor=m=>m>.6?'var(--good)':m>.35?'var(--lamp)':'var(--bad)';
let rosterEls={},rosterSig='';
function buildRoster(){
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
function traitWords(t){
  const w=[];
  if(t.temper>.6)w.push('quick-tempered');else if(t.temper<.3)w.push('even-tempered');
  if(t.warmth>.65)w.push('warm-hearted');else if(t.warmth<.35)w.push('reserved');
  if(t.diligence>.7)w.push('hard-working');else if(t.diligence<.4)w.push('idle');
  if(t.forgive>.65)w.push('forgiving');else if(t.forgive<.3)w.push('holds grudges');
  if(t.gossip>.65)w.push('loose-tongued');
  if(t.scruple<.45)w.push('light-fingered');else if(t.scruple>.8)w.push('scrupulous');
  return w.length?w:['unremarkable'];
}
function familyLine(a){
  const parts=[];
  if(a.spouse>=0){const s=S.agents[a.spouse];parts.push(`${a.sex==='f'?'Wife':'Husband'} of ${N(s)}${s.dead?' (late)':''}`);}
  else if(a.widowOf!=null)parts.push(`${a.sex==='f'?'Widow':'Widower'} of ${N(S.agents[a.widowOf])}`);
  if(a.parents.length)parts.push(`${a.sex==='f'?'Daughter':'Son'} of ${listNames(a.parents.map(i=>S.agents[i]))}`);
  const kids=childrenOf(a);if(kids.length)parts.push(`${a.sex==='f'?'Mother':'Father'} of ${listNames(kids)}`);
  return parts.join(' · ');
}
function renderDetail(){
  const d=$('detail'),a=S.agents[sel];
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
function renderTechs(){
  const html=Object.keys(TECH).map(id=>{
    const T=TECH[id],t=S.tech[id],locked=!T.req.every(techBuilt)&&t.state==='none';
    let tag,line,extra='';
    if(t.state==='building'){const pct=clamp(100-(t.doneAt-S.tick)/(TPD*T.build)*100,0,100);return `<div class="tech st-idea"><div class="tn"><b>${T.name}</b><span>Being built</span></div><div class="ts">${N(S.agents[t.inventor])}'s scheme. Finished in ${Math.max(1,Math.ceil((t.doneAt-S.tick)/TPD))} days.</div><div class="pm"><span style="width:${pct}%"></span></div></div>`;}
    if(t.state==='built'){const broken=t.brokenUntil>S.tick;tag=broken?'Wrecked':'Built';
      line=broken?`Smashed in the night. Repairs in ${Math.ceil((t.brokenUntil-S.tick)/TPD)} day${t.brokenUntil-S.tick>TPD?'s':''}.`:`Built ${seasonName(t.builtAt)}. ${N(S.agents[t.inventor])}'s idea. It ${T.what}.`;
      return `<div class="tech ${broken?'st-broken':'st-built'}"><div class="tn"><b>${T.name}</b><span>${tag}</span></div><div class="ts">${line}</div></div>`;}
    if(t.state==='idea'){const inv=S.agents[t.inventor],bk=t.backers.map(i=>S.agents[i]).filter(b=>b!==inv),opp=t.opponents.map(i=>S.agents[i]);
      line=`${N(inv)}'s idea. Backers ${t.backers.length} of ${T.need}${bk.length?` (${listNames(bk.slice(0,4))}${bk.length>4?' and more':''})`:''}${opp.length?`. Against: ${listNames(opp.slice(0,4))}`:''}. Costs ${T.cost} pennies.`;
      return `<div class="tech st-idea"><div class="tn"><b>${T.name}</b><span>Being argued over</span></div><div class="ts">${line}</div></div>`;}
    if(locked)return `<div class="tech st-locked"><div class="tn"><b>${T.name}</b><span>Unthought of</span></div><div class="ts">Nobody will think of it until the village has the ${T.req.map(r=>TECH[r].name.toLowerCase()).join(' and the ')}.</div></div>`;
    const pr=clamp(t.pressure,0,100);
    line=pr<25?'Nobody is talking about it.':pr<75?`${T.hint}.`:`${T.hint}. Someone is bound to think of it soon.`;
    return `<div class="tech"><div class="tn"><b>${T.name}</b><span>Unthought of</span></div><div class="ts">${line}</div><div class="pm" aria-hidden="true"><span style="width:${pr}%"></span></div></div>`;
  }).join('');
  if(html!==renderTechs.last){$('techs').innerHTML=html;renderTechs.last=html;}
}
function renderCivic(){
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
function renderFamilies(){
  const html=familyCards().map(({k,members,live})=>{
    const ar=armsOf(k),dead=members.length-live.length,faces=(live.length?live:members).sort((x,y)=>y.age-x.age).slice(0,8);
    return `<div class="famcard${live.length?'':' gone'}">${armsSVG(ar,62,'Arms of the '+familyPlural(k))}<div style="min-width:0"><h3>The ${familyPlural(k)}</h3><p class="motto">“${ar.motto}”</p><p class="blz">${blazon(ar)}</p><div class="faces">${faces.map(a=>`<button class="who" data-id="${a.id}" aria-label="${a.name}">${portraitSVG(a,26)}</button>`).join('')}</div><div class="count">${live.length?`${live.length} living`:'No one left'}${dead?` · ${dead} in the chapel yard`:''}</div></div></div>`;
  }).join('');
  const sig=familyCards().map(c=>c.k+c.live.map(a=>a.id+':'+Math.floor(a.age)+a.job).join(',')+armsOf(c.k).aug.join('')).join('|');
  if(sig!==renderFamilies.sig){renderFamilies.sig=sig;$('fams').innerHTML=html;}
}
let logLen=-1,logFirst=null;
function renderLog(){
  if(S.log.length===logLen&&S.log[0]===logFirst)return;logLen=S.log.length;logFirst=S.log[0];
  let html='',day=-1;
  for(let i=S.log.length-1;i>=Math.max(0,S.log.length-220);i--){const e=S.log[i],d=dayOf(e.t);
    if(d!==day){day=d;html+=`<h3 class="dayhead">${weekday(e.t)}, day ${dayInSeason(e.t)} of ${seasonName(e.t)}</h3>`;}
    html+=`<div class="entry k-${e.k}"><time>${fmtTime(e.t)}</time><i></i><p>${e.h}</p></div>`;}
  $('log').innerHTML=html||'<p class="empty">Nothing has happened yet.</p>';
}
function render(force){
  if(!S)return;
  $('when').innerHTML=`${seasonName()}<small>${weekday()}, day ${dayInSeason()} of ${SEASONS[seasonOf()].toLowerCase()} · ${fmtTime(S.tick)}</small>`;
  const chips=[`<span class="chip era">${ERAS[S.era]}</span>`];
  if(S.election)chips.push(`<span class="chip fair">Election ${dayOf(S.election.vote)===dayOf()?'today':weekday(S.election.vote)}</span>`);
  if(S.storm>0)chips.push(`<span class="chip storm">${seasonOf()===3?'Blizzard':'Storm'} · ${Math.ceil(S.storm/6)}h left</span>`);
  if(S.fair)chips.push(`<span class="chip fair">${S.fair.harvest?'Harvest Home':fairOn()?'Fair on the Green':'Fair '+(dayOf(S.fair.start)===dayOf()?'at 10:00':'tomorrow')}</span>`);
  for(const g of S.gathers)if(g.type!=='election')chips.push(`<span class="chip ${g.type==='wedding'?'fair':''}">${{wedding:'Wedding',funeral:'Funeral',court:'Court'}[g.type]} ${S.tick>=g.start?'now':dayOf(g.start)===dayOf()?'today':'tomorrow'}</span>`);
  const live=S.rumours.filter(r=>S.tick-r.born<TPD*4).length;if(live)chips.push(`<span class="chip rumour">${live} rumour${live>1?'s':''} about</span>`);
  if(S.spoil>0)chips.push(`<span class="chip rumour">Flour spoiled · ${Math.ceil(S.spoil/6)}h</span>`);
  if(isSunday())chips.push('<span class="chip">Sunday</span>');
  $('chips').innerHTML=chips.join('');
  const st=S.stores,kids=LIVE.filter(a=>a.age<14).length;
  $('stores').innerHTML=`<span>Souls <b>${LIVE.length}</b>${kids?` (${kids} children)`:''}</span><span>Granary <b>${Math.floor(st.grain)}</b> of ${grainCap()}</span><span>Flour <b>${Math.floor(st.flour)}</b></span><span>Loaves <b>${Math.floor(st.bread)}</b></span>`;
  const sig=LIVE.map(a=>a.id).join(',')+'|'+S.agents.length;
  if(sig!==rosterSig||force)buildRoster();
  for(const a of LIVE){const el=rosterEls[a.id];if(!el)continue;el.querySelector('.doing').textContent=describe(a);const m=moodOf(a),ms=el.querySelector('.mood span');ms.style.width=Math.round(m*100)+'%';ms.style.background=moodColor(m);el.classList.toggle('sel',a.id===sel);}
  if(force||render.n++%2===0){renderDetail();renderTechs();}
  if(force||render.n%6===1)renderFamilies();
  if(force||render.n%3===1)renderCivic();
  renderLog();
  $('nFair').disabled=!!S.fair;
}
render.n=0;
function select(id){sel=id;render(true);}
document.addEventListener('click',e=>{const w=e.target.closest('.who,.res');if(w&&w.dataset.id!=null&&!w.closest('.story'))select(+w.dataset.id);});
let speed=1;const TPS={0:0,1:3,3:9,10:30,30:90};
document.querySelectorAll('.speed button').forEach(b=>b.addEventListener('click',()=>{speed=+b.dataset.speed;document.querySelectorAll('.speed button').forEach(x=>x.classList.toggle('on',x===b));}));
$('nRumour').onclick=nudgeRumour;$('nShort').onclick=nudgeShort;$('nStorm').onclick=nudgeStorm;$('nStranger').onclick=nudgeStranger;$('nFair').onclick=nudgeFair;$('nPurse').onclick=nudgePurse;
const msg=t=>{$('saveMsg').textContent=t;};
$('copySave').onclick=()=>{const code=encode();
  const fallback=()=>{$('loadArea').hidden=false;$('saveText').value=code;$('saveText').select();msg('Select all the text below and copy it.');};
  try{navigator.clipboard.writeText(code).then(()=>msg('Save code copied. Paste it somewhere safe.'),fallback);}catch(e){fallback();}};
$('showLoad').onclick=()=>{$('loadArea').hidden=false;$('saveText').value='';$('saveText').focus();msg('');};
$('cancelLoad').onclick=()=>{$('loadArea').hidden=true;msg('');};
function resetViews(){sel=-1;logLen=-1;rosterSig='';renderTechs.last='';renderFamilies.sig='';if(G){for(const id in G.agents){G.scene.remove(G.agents[id].g);}G.agents={};}}
$('loadSave').onclick=()=>{try{S=decode($('saveText').value);refreshLive();resetViews();render(true);$('loadArea').hidden=true;msg(`Loaded. ${seasonName()}, ${fmtTime(S.tick)}.`);autosave();}catch(e){msg(e.message||'That save code could not be read.');}};
let confirmNew=0;
$('newTown').onclick=()=>{if(Date.now()-confirmNew>4000){confirmNew=Date.now();$('newTown').textContent='Tap again to start over';msg('This replaces the current village.');return;}
  confirmNew=0;$('newTown').textContent='Start a new village';newTown((Math.random()*2**31)|0);resetViews();render(true);msg('A new village, same faces, fresh fortunes.');};

// ---------- the annals ----------
function yearTitle(y,ents){
  const built=ents.find(e=>e.built);if(built)return `The Year of the ${TECH[built.tech].name.replace(/\b\w/g,c=>c.toUpperCase())}`;
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
function numberWord(n){return ['no','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'][n]||String(n);}
function yearIntro(y){
  const r=S.years[y]||{startPop:0,births:0,deaths:0,weddings:0},cur=y===yearOf();
  const endPop=cur?LIVE.length:r.startPop+r.births-r.deaths;
  const bits=[];
  bits.push(`${cur?'This year began':`Year ${y} began`} with ${numberWord(r.startPop)} souls in Ashwood Fold${cur?` and there are ${numberWord(LIVE.length)} now`:` and ended with ${numberWord(Math.max(0,endPop))}`}.`);
  const ev=[];if(r.births)ev.push(`${numberWord(r.births)} ${r.births>1?'births':'birth'}`);if(r.deaths)ev.push(`${numberWord(r.deaths)} ${r.deaths>1?'deaths':'death'}`);if(r.weddings)ev.push(`${numberWord(r.weddings)} ${r.weddings>1?'weddings':'wedding'}`);
  bits.push(ev.length?`There ${r.births+r.deaths+r.weddings>1?'were':'was'} ${ev.join(', ').replace(/, ([^,]*)$/,' and $1')}.`:'Nobody was born, married or buried.');
  if(r.harvest)bits.push(`The harvest was ${r.harvest}.`);
  return bits.join(' ');
}
function paragraphs(ents){const out=[];let cur=[];for(const e of ents){cur.push(e.h);if(cur.length>=4){out.push(cur.join(' '));cur=[];}}if(cur.length)out.push(cur.join(' '));return out.map(p=>`<p>${p}</p>`).join('');}
function castEntry(a){
  const life=a.born!=null?`born ${seasonName(a.born)}`:a.arrivedAt!=null?`came to the village ${seasonName(a.arrivedAt)}`:`aged ${Math.floor(a.dead?a.dead.age-(a.dead.t-36)/TPD/YEAR_DAYS:a.age-(S.tick-36)/TPD/YEAR_DAYS)} when this chronicle begins`;
  const end=a.dead?(a.dead.exiled?`; ${a.dead.cause}, ${seasonName(a.dead.t)}`:`; died ${seasonName(a.dead.t)}, ${a.dead.cause}, aged ${Math.floor(a.dead.age)}`):`; ${Math.floor(a.age)} years old now`;
  const others=S.agents.filter(b=>b!==a);
  const best=others.filter(b=>op(a,b)>50).sort((x,y)=>op(a,y)-op(a,x))[0],worst=others.filter(b=>op(a,b)<-40).sort((x,y)=>op(a,x)-op(a,y))[0];
  const fam=familyLine(a);
  const bits=[];if(best)bits.push(`Closest to ${N(best)}.`);if(worst)bits.push(`Never got on with ${N(worst)}.`);
  const tr=traitWords(a.tr).slice(0,2).join(' and ');
  return `<div>${portraitSVG(a,64)}<span><b>${a.name}</b><em>${cap(a.job==='child'&&a.dead?'child':a.job==='child'?(a.age<4?'baby':'child'):a.job)}, ${life}${end}</em>${fam?fam+'. ':''}${cap(tr)}. ${bits.join(' ')}</span></div>`;
}
function snapshot(){
  try{
    if(view==='3d'&&G){draw3d(1,0);return cv3.toDataURL('image/jpeg',.85);}
    if(!cw)resize();if(!cw)return null;draw(1);return cv.toDataURL('image/jpeg',.85);
  }catch(e){return null;}
}
function buildStory(){
  const img=snapshot(),y0=yearOf(S.annals.length?S.annals[0].t:S.tick),y1=yearOf();
  let html=`<h1>The Annals of Ashwood Fold</h1><p class="sub">A true account of the village, from Spring of Year 1 to ${seasonName()}</p>`;
  if(img)html+=`<figure><img src="${img}" alt="Ashwood Fold in ${SEASONS[seasonOf()].toLowerCase()}, as it stands today"><figcaption>Ashwood Fold as it stands, ${seasonName()}</figcaption></figure>`;
  const prologue=S.annals.filter(e=>e.c==='prologue');
  if(prologue.length)html+=`<p class="intro">${prologue.map(e=>e.h).join(' ')}</p><p class="orn">· · ·</p>`;
  let prevEra=-1;const roman=['I','II','III','IV','V'];
  for(let y=Math.min(y0,1);y<=y1;y++){
    const era=S.years[y]&&S.years[y].era!=null?S.years[y].era:Math.max(prevEra,0);
    if(era!==prevEra){prevEra=era;html+=`<div class="bookhead"><span class="num">Book ${roman[era]}</span><h2>${ERAS[era]}</h2></div>`;}
    const ents=S.annals.filter(e=>yearOf(e.t)===y&&e.c!=='prologue');
    if(!ents.length&&!S.years[y])continue;
    html+=`<section class="chapter"><span class="num">Chapter ${y}</span><h2>${yearTitle(y,ents)}</h2><p class="intro">${yearIntro(y)}</p>`;
    for(let s=0;s<4;s++){
      const capN={friend:1,fight:2,feud:2,rumour:2,crime:3,court:3,politics:3,letter:1,departure:3},seen={};
      const se=ents.filter(e=>seasonOf(e.t)===s&&!(e.c==='season'&&e.season===0)&&!/Now for the money|talks .* round to/.test(e.h)).filter(e=>{const c=capN[e.c];if(!c)return true;seen[e.c]=(seen[e.c]||0)+1;return seen[e.c]<=c;});
      if(!se.length)continue;
      html+=`<h3>${SEASONS[s]}</h3>${paragraphs(se)}`;
    }
    html+=`</section>`;
  }
  const cast=[...S.agents].sort((a,b)=>(a.born??-1e9)-(b.born??-1e9)||b.age-a.age);
  const fams=familyCards();
  html+=`<section class="chapter"><span class="num">Appendix</span><h2>The Arms of the Families</h2><div class="armorial">${fams.map(({k,live,members})=>{const ar=armsOf(k);return `<div>${armsSVG(ar,96,'Arms of the '+familyPlural(k))}<b>${familyPlural(k)}</b><span>“${ar.motto}”</span><i>${blazon(ar)}</i><i>${live.length?`${live.length} living, ${members.length-live.length} departed`:'The line has ended'}</i></div>`;}).join('')}</div></section>`;
  html+=`<section class="chapter"><span class="num">Appendix</span><h2>The Folk of Ashwood Fold</h2><div class="cast">${cast.map(castEntry).join('')}</div></section><p class="orn">· · ·</p>`;
  $('book').innerHTML=html;
  $('storyMeta').textContent=`${S.annals.length} entries · ${S.agents.length} lives`;
}
let storySpeed=1;
$('openStory').onclick=()=>{buildStory();$('story').hidden=false;$('story').scrollTop=0;document.body.style.overflow='hidden';storySpeed=speed;speed=0;$('closeStory').focus();};
function closeStory(){$('story').hidden=true;document.body.style.overflow='';speed=storySpeed;$('openStory').focus();}
$('closeStory').onclick=closeStory;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('story').hidden)closeStory();});
$('copyStory').onclick=()=>{
  const book=$('book').cloneNode(true);book.querySelectorAll('figure').forEach(f=>f.remove());
  const text=[...book.querySelectorAll('h1,.sub,h2,.num,h3,p,.cast div')].map(el=>el.matches('h1,h2')?'\n'+el.textContent.toUpperCase():el.matches('h3')?'\n'+el.textContent:el.textContent).join('\n');
  const done=()=>{$('copyStory').textContent='Copied';setTimeout(()=>$('copyStory').textContent='Copy as text',1800);};
  try{navigator.clipboard.writeText(text).then(done,()=>{$('copyStory').textContent='Copy failed: select the text instead';});}catch(e){$('copyStory').textContent='Copy failed: select the text instead';}
};
