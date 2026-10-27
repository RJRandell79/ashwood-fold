// Ported from the v5 prototype by tools/port-v5.mjs.
import { SAVEKEY } from './data/world.js';
import { tick } from './sim/clock.js';
import { hooks } from './sim/hooks.js';
import { autosave } from './save/codec.js';
import './view/annals.js'; // wires the annals buttons; nothing else imports it
import { migrate, newTown } from './sim/setup.js';
import { S, refreshLive, setState } from './sim/state.js';
import { G, draw3d, start3d } from './view/three.js';
import { TPS, render } from './view/ui.js';
import { V } from './view/vstate.js';

export let acc=0, last=performance.now(), lastUI=0;
export function frame(now){
  const dt=Math.min(.25,(now-last)/1000);last=now;acc+=dt*TPS[V.speed];let n=0;
  while(acc>=1&&n<60){tick();acc-=1;n++;}if(n>=60)acc=0;
  if(G)draw3d(V.speed?acc:1,dt);
  if(now-lastUI>450){render();lastUI=now;}
  requestAnimationFrame(frame);
}
export function boot(data){
  hooks.changed=()=>render(true);
  hooks.autosave=autosave;
  if(data&&data.state)setState(migrate(data.state));
  else{try{const raw=localStorage.getItem(SAVEKEY);if(raw){const o=JSON.parse(raw);if(o&&o.agents&&o.op)setState(migrate(o));}}catch(e){setState(null);}}
  if(!S)newTown(20261023);
  refreshLive();
  if(data&&typeof data.sel==='number')V.sel=data.sel;
  render(true);
  start3d();requestAnimationFrame(frame);
}
window.claude?.hot?.snapshot?.(()=>({state:S,sel:V.sel}));
window.claude?.hot?.ready?window.claude.hot.ready(boot):boot(window.claude?.hot?.data??{});
