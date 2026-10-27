// Ported from the v5 prototype by tools/port-v5.mjs.
import { SAVEKEY } from '../data/world.js';
import { migrate } from '../sim/setup.js';
import { S } from '../sim/state.js';

export function encode(){const copy={...S,log:S.log.slice(-150)};return 'AF1:'+btoa(unescape(encodeURIComponent(JSON.stringify(copy))));}
export function decode(code){code=code.trim();if(!code.startsWith('AF1:'))throw new Error('That code does not start with AF1:, so it is not an Ashwood Fold save.');const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));if(!o.agents||!o.op)throw new Error('The code is incomplete. Copy the whole thing and try again.');return migrate(o);}
export function autosave(){try{localStorage.setItem(SAVEKEY,JSON.stringify(S));}catch(e){}}
