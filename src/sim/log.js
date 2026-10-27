// Ported from the v5 prototype by tools/port-v5.mjs.
import { S } from './state.js';

export function log(h,k,cat,extra){
  S.log.push({t:S.tick,k:k||'event',h});if(S.log.length>400)S.log.splice(0,S.log.length-400);
  if(cat){S.annals.push(Object.assign({t:S.tick,k:k||'event',h,c:cat},extra||{}));if(S.annals.length>2500)S.annals.splice(0,S.annals.length-2500);}
}
