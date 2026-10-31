// The interlude as a moment to watch (decided 31 Oct). When an age closes, the game pauses and the
// valley holds still while the centuries pass: the year rolls on from the age's last year to the next
// age's first, the interlude's lines come one at a time (a family's arms beside its fate), the footprints
// of what has gone are outlined and named on the ground, and the new village rises over the old. It ends
// on a card of what carried on, then and now. The simulation has already done its work
// (src/sim/interlude.js); this only shows it, and changes nothing in the story.
import { AGES } from '../data/ages.js';
import { armsOf, familyPlural } from '../sim/heraldry.js';
import { P, S } from '../sim/state.js';
import { armsSVG } from './portraits.js';
import { defR, frameHooks, G, makeLabel } from './three.js';
import { groundAt } from './terrain.js';
import { V } from './vstate.js';

const LINE_SECONDS = 2.6;          // how long each line of the interlude stays
const RISE = [0.55, 0.9];          // when the new village rises, as shares of the scene
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
let lastS = null, seen = 0, sc = null;

/** Each frame: notice an age closing in this village (not a save loaded after one) and begin the scene. */
export function watchInterludes() {
  if (!S) return;
  const n = ((S.history && S.history.ages) || []).length;
  if (S !== lastS) { lastS = S; seen = n; return; }
  if (n > seen) { seen = n; begin(S.history.ages[n - 1]); }
}
export const sceneOn = () => !!sc;

function begin(rec) {
  const to = AGES[S.age], from = AGES[rec.id];
  const lines = S.annals.filter(e => e.c === 'interlude' && e.age === rec.id).map(e => e.h.replace(/<[^>]+>/g, ''));
  if (!lines.length || !G || !G.world) return;
  const families = rec.families || [];
  const armsFor = line => { const f = families.find(r => line.startsWith(`The ${familyPlural(r.name)} `)); return f ? f.name : null; };
  const fresh = Object.values(P).filter(p => p.record && p.record.age === S.age && p.record.year === to.startYear && !p.record.keptFrom).map(p => p.id);
  sc = { rec, lines, armsFor, fresh, from, to, t: 0, shown: -1, T: lines.length * LINE_SECONDS, speed: V.speed, done: false, reduce: matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches };
  V.speed = 0; syncSpeed();
  G.hour = 11;   // the centuries pass in daylight
  G.hideAgents = true;   // and with no one about: the new age's people walk in when it is over
  // the camera stands back over the heart of the village, and turns slowly while the years pass
  const W = G.world, sq = P.square;
  if (sq) { const x = sq.x + sq.w / 2, y = sq.y + sq.h / 2; G.target.set(x - W.O.x, groundAt(W.v, x, y), y - W.O.y); }
  G.radius = Math.max(G.radius, defR() * 0.75); G.phi = Math.min(G.phi, 0.95);
  sc.ghosts = ghosts(rec);
  G.scene.add(sc.ghosts);
  const box = document.querySelector('.mapbox');
  sc.el = document.createElement('div');
  sc.el.className = 'scene'; sc.el.setAttribute('role', 'dialog'); sc.el.setAttribute('aria-label', `${from.name} gives way to ${to.name}`);
  sc.el.innerHTML = `<div class="sc-year" aria-hidden="true">${rec.endYear}</div><div class="sc-line" aria-live="polite"></div><button type="button" class="sc-skip">Skip to ${to.startYear}</button>`;
  box.appendChild(sc.el);
  sc.el.querySelector('.sc-skip').onclick = finish;
  if (sc.reduce) finish();
}

/** The footprints of what has gone, outlined on the ground, with the names of the ones the new village stands over. */
function ghosts(rec) {
  const W = G.world, g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color: 0xe0a43a, transparent: true, opacity: 0, depthTest: false });
  const fill = new THREE.MeshBasicMaterial({ color: 0xf0c05a, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide });
  g.userData.mat = mat; g.userData.fill = fill; g.userData.labels = [];
  const over = new Set(Object.values(P).map(p => p.record && p.record.over).filter(Boolean));
  for (const f of [...(rec.places.gone || []), ...(rec.places.ruined || [])]) {
    if (f.x == null) continue;
    const pts = [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]].map(([x, y]) => new THREE.Vector3(x - W.O.x, groundAt(W.v, x, y) + 0.12, y - W.O.y));
    const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat); loop.renderOrder = 28; g.add(loop);
    // a wash of colour over the footprint, so it reads at a distance as well as close to
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), fill); pad.rotation.x = -Math.PI / 2;
    pad.position.set(f.x + f.w / 2 - W.O.x, pts.reduce((a, q) => a + q.y, 0) / 4, f.y + f.h / 2 - W.O.y); pad.renderOrder = 27; g.add(pad);
    if (f.name && over.has(f.name)) {
      const lb = makeLabel(f.name.replace(/^the /, ''), { color: '#5a3d0c', bg: 'rgba(250,236,200,0.92)', h: 0.85 });
      lb.position.set(f.x + f.w / 2 - W.O.x, groundAt(W.v, f.x + f.w / 2, f.y + f.h / 2) + 0.9, f.y + f.h / 2 - W.O.y);
      lb.material.opacity = 0; g.add(lb); g.userData.labels.push(lb);
    }
  }
  return g;
}

/** Each frame while the scene plays: the year, the lines, the footprints, the new village rising. */
function sceneFrame(dt) {
  if (!sc || !G || !G.world) return;
  if (!sc.done) {
    V.speed = 0;   // the village waits while the centuries pass
    sc.t += dt; G.theta += dt * 0.035;
    const p = Math.min(1, sc.t / sc.T), i = Math.min(sc.lines.length - 1, Math.floor(sc.t / LINE_SECONDS));
    if (i !== sc.shown) { sc.shown = i; showLine(sc.lines[i]); }
    // the year rolls on, and never runs behind a year the annals name
    // (not the new age's own year, which family lines mention: "by 1750 the name was spelt Holt")
    const named = sc.lines.slice(0, i + 1).map(l => (l.match(/\b(1[0-9]{3})\b/g) || []).map(Number)).flat().filter(y => y > sc.rec.endYear && y < sc.to.startYear);
    const year = Math.max(Math.round(sc.rec.endYear + (sc.to.startYear - sc.rec.endYear) * ease(p)), ...named, sc.rec.endYear);
    sc.el.querySelector('.sc-year').textContent = year;
    const fade = Math.min(ease(p / 0.25), 1 - ease((p - 0.9) / 0.1));
    sc.ghosts.userData.mat.opacity = 0.9 * fade; sc.ghosts.userData.fill.opacity = 0.3 * fade;
    for (const lb of sc.ghosts.userData.labels) lb.material.opacity = fade;
    rise(ease((p - RISE[0]) / (RISE[1] - RISE[0])));
    if (p >= 1) finish();
  }
}
function rise(k) {
  for (const id of sc.fresh) { const b = G.world.places[id]; if (b) b.group.scale.y = Math.max(0.001, k); }
}

function showLine(text) {
  const el = sc.el.querySelector('.sc-line'), fam = sc.armsFor(text);
  el.classList.remove('in'); void el.offsetWidth;
  el.innerHTML = `${fam ? armsSVG(armsOf(fam), 30, `Arms of the ${familyPlural(fam)}`) : ''}<span>${esc(text)}</span>`;
  el.classList.add('in');
}

/** The end: what carried on across the centuries, then and now. */
function finish() {
  if (!sc || sc.done) return;
  sc.done = true;
  rise(1);
  sc.ghosts.userData.mat.opacity = 0.5; sc.ghosts.userData.fill.opacity = 0.15;
  for (const lb of sc.ghosts.userData.labels) lb.material.opacity = 0.9;
  const rec = sc.rec, rows = [];
  // what endured first, then what the new village built over the old, then what was rebuilt, then the ruins
  for (const f of rec.places.stood || []) if (P[f.id] && P[f.id].def !== 'ruin') rows.push([P[f.id].name, 'still there']);
  const rebuilt = (rec.places.rebuilt || []).filter(f => P[f.id] && f.name).map(f => [f.name, f.name === P[f.id].name ? 'rebuilt on its footings' : P[f.id].name]);
  // a new building over an old one of its kind: a cottage on a croft, fields on fields, a garden on a garth
  const sites = (S.history && S.history.sites) || [];
  for (const p of Object.values(P)) {
    if (!(p.record && p.record.over && p.record.age === S.age && p.record.year === sc.to.startYear)) continue;
    const s = sites.find(x => x.name === p.record.over);
    if (s && (s.def === p.def || (s.home && p.home) || (s.kind && s.kind === p.kind))) rows.push([p.record.over, p.name]);
  }
  rows.push(...rebuilt);
  for (const f of rec.places.ruined || []) if (f.name) rows.push([f.name, 'in ruins']);
  const kept = (rec.families || []).filter(f => f.kept), lost = (rec.families || []).filter(f => !f.kept);
  sc.el.querySelector('.sc-year').textContent = sc.to.startYear;
  sc.el.querySelector('.sc-line').remove();
  sc.el.querySelector('.sc-skip').remove();
  const card = document.createElement('div');
  card.className = 'sc-card';
  card.innerHTML = `<h3>${rec.endYear} and ${sc.to.startYear}</h3>
    <p class="sc-sub">What carried on from ${esc(sc.from.name.replace(/^The /, 'the '))}.</p>
    <table><thead><tr><th>Then</th><th>Now</th></tr></thead><tbody>${rows.slice(0, 14).map(([a, b]) => `<tr><td>${esc(cap(a))}</td><td>${esc(cap(b))}</td></tr>`).join('')}</tbody></table>
    ${kept.length ? `<p>Came through: ${kept.map(f => `${armsSVG(armsOf(f.name), 20, '')} the ${esc(familyPlural(f.later || f.name))}`).join(', ')}.</p>` : ''}
    ${lost.length ? `<p class="sc-lost">Lost: the ${lost.map(f => esc(familyPlural(f.name))).join(', the ')}.</p>` : ''}
    <button type="button" class="sc-go">Carry on in ${sc.to.startYear}</button>`;
  sc.el.appendChild(card);
  card.querySelector('.sc-go').onclick = close;
  card.querySelector('.sc-go').focus({ preventScroll: true }); card.scrollTop = 0;
}
function close() {
  if (!sc) return;
  rise(1);
  G.scene.remove(sc.ghosts);
  sc.ghosts.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
  sc.el.remove();
  V.speed = sc.speed || 1; syncSpeed();
  delete G.hour; delete G.hideAgents;
  sc = null;
}
function syncSpeed() { document.querySelectorAll('.speed button').forEach(b => b.classList.toggle('on', +b.dataset.speed === V.speed)); }

frameHooks.push(sceneFrame);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sc) { if (sc.done) close(); else finish(); } });
