// Traces of the past drawn on the land: pegs and string where an idea was staked out and given up,
// and the old names a gone family left on a field, a wood or a lane. Each is tappable; its card asks the
// question and the annals answer it (src/sim/traces.js keeps the records). Reads S only.
import { IDEA, IDEAS } from '../data/ideas.js';
import { calYear, P, S } from '../sim/state.js';
import { familyKey, familyPlural } from '../sim/heraldry.js';
import { groundAt } from './terrain.js';

const PEG = 0x8a6a45, STRING = 0xe8dcc0;
const lower = s => s.replace(/^the /i, '');
const article = s => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s.toLowerCase();

/** A built works standing still: 'shut' for good, 'idle' while a slump lasts, or '' if working. */
export function worksState(p) {
  for (const d of IDEAS) {
    if (!(d.places || []).includes(p.id)) continue;
    const t = S.tech && S.tech[d.id];
    if (!t || t.state !== 'built') continue;
    if (t.closed) return 'shut';
    if (t.idleUntil > S.tick) return 'idle';
  }
  return '';
}
/** The idea behind a works, for its card. */
function worksIdea(p) { return IDEAS.find(d => (d.places || []).includes(p.id) && S.tech && S.tech[d.id]); }

/** What the traces depend on, so the scene rebuilds them only when they change. */
export function tracesKey() {
  const st = (S.stakes || []).map(s => `${s.idea}@${s.x},${s.y}`).join(';');
  const lm = ((S.history && S.history.landmarks) || []).filter(l => l.to === S.age && l.x != null).map(l => `${l.name}@${l.x},${l.y}`).join(';');
  return `${S.valley.seed}|${st}|${lm}`;
}

/** The traces as one group: pegs, string and a small label for each staked plot; a ground label for each old name. */
export function buildTraces(THREE, v, O, makeLabel) {
  const g = new THREE.Group(), pegGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 5), pegMat = new THREE.MeshLambertMaterial({ color: PEG });
  const y = (x, z) => Math.max(groundAt(v, x, z), -0.1);
  (S.stakes || []).forEach((s, i) => {
    const sg = new THREE.Group(); sg.userData.trace = { kind: 'stake', i };
    const corners = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]];
    const pts = [];
    for (const [x, z] of corners) {
      const peg = new THREE.Mesh(pegGeo, pegMat); peg.position.set(x - O.x, y(x, z) + 0.27, z - O.y); peg.rotation.z = 0.08; sg.add(peg);
      pts.push(new THREE.Vector3(x - O.x, y(x, z) + 0.42, z - O.y));
    }
    sg.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: STRING })));
    // a hit area over the plot, unseen, so the pegs are easy to tap
    const pad = new THREE.Mesh(new THREE.BoxGeometry(s.w, 0.6, s.h), new THREE.MeshBasicMaterial({ visible: false }));
    pad.position.set(s.x + s.w / 2 - O.x, y(s.x + s.w / 2, s.y + s.h / 2) + 0.3, s.y + s.h / 2 - O.y); sg.add(pad);
    for (const [x, z] of s.route || []) { const peg = new THREE.Mesh(pegGeo, pegMat); peg.scale.set(0.8, 0.7, 0.8); peg.position.set(x - O.x, y(x, z) + 0.2, z - O.y); sg.add(peg); }
    const lb = makeLabel(`staked out, ${s.year}`, { h: 0.6, weight: 500, color: '#4a3b2a', bg: 'rgba(240,232,214,0.82)' });
    lb.position.set(s.x + s.w / 2 - O.x, y(s.x + s.w / 2, s.y + s.h / 2) + 1.3, s.y + s.h / 2 - O.y); sg.add(lb);
    g.add(sg);
  });
  for (const l of (S.history && S.history.landmarks) || []) {
    if (l.to !== S.age || l.x == null) continue;
    const lb = makeLabel(l.name, { h: 0.62, weight: 500, color: '#3d4a3a', bg: 'rgba(236,240,228,0.7)' });
    lb.position.set(l.x - O.x, y(l.x, l.y) + 0.9, l.y - O.y); lb.userData.trace = { kind: 'name', name: l.name };
    g.add(lb);
  }
  return g;
}

// --- the cards: a question, and the way into the annals ---

const has = n => n && S.annals.some(e => e.n === n);
const link = (n, text) => (has(n) ? ` <a href="#" class="toannals" data-n="${n}">${text}</a>` : '');

/** Card lines for a works standing still, or a house that keeps an old family's name. */
export function placeTraceLines(p) {
  const out = [], state = worksState(p), d = state && worksIdea(p), t = d && S.tech[d.id];
  if (state === 'shut') out.push(`It has stood shut since ${calYear(t.closed)}. The wheel does not turn and the windows are boarded.${link(t.closedN, 'The annals tell why.')}`);
  else if (state === 'idle') out.push(`It has stood idle since ${calYear(t.idleAt ?? S.tick)}, and the hands have gone home.${link(t.idleN, 'The annals tell why.')}`);
  const l = ((S.history && S.history.landmarks) || []).find(o => o.house && o.name === p.name);
  if (l) out.push(`The name is older than the house: ${l.name} was the ${familyPlural(l.family)}' holding before the village was rebuilt.${link(l.n, 'Who were they?')}`);
  return out;
}

/** The card for a staked plot or an old name, as { title, lines }. */
export function traceCard(tr) {
  if (tr.kind === 'stake') {
    const s = (S.stakes || [])[tr.i]; if (!s) return null;
    const d = IDEA[s.idea], what = lower(d ? d.name : s.name);
    const line = s.route && s.route.length ? `, and pegged its line along the valley side` : '';
    return { title: 'Pegs and string', lines: [`Someone staked out this plot in ${s.year}, for ${article(what)}${line}. ${s.givenUp ? `It was given up in ${s.givenUp}, and nothing was ever built here.` : 'Nothing has come of it yet.'}${link(s.n, 'Why not?')}`] };
  }
  const l = ((S.history && S.history.landmarks) || []).find(o => o.name === tr.name); if (!l) return null;
  const now = S.agents.some(a => !a.dead && familyKey(a) === l.family);
  return { title: l.name, lines: [`Named for the ${familyPlural(l.family)}, a family of the old village.${now ? ' Some of the name still live here.' : ' None of them are left.'}${link(l.n, 'Who were they?')}`] };
}
