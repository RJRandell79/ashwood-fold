// Building shapes. Every place in src/data/buildings.js names one of these archetypes and a
// few features; the archetype gives the massing, the era style (src/data/styles.js) gives the
// materials (the era it was built or last rebuilt in), and the plot gives the size, ground height and facing.
//
// A builder returns { group, top, windows, chimneys, homeSpot, wheels, tech, rows }:
//   group     everything for the place, in world coordinates
//   top       height of the highest point, for the label
//   windows   one material per place, lit when someone is inside after dark
//   chimneys  smoke sources { x, y, z, big, tech }
//   homeSpot  where the household's banner hangs
//   wheels    waterwheels to turn; tech parts are shown once their idea is built
import { AGES, FIRST_AGE } from '../data/ages.js';
import { groundAt } from './terrain.js';

const mats = new Map();
/** Shared Lambert material per colour (the season code recolours some of these). */
export function mat(c) {
  if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c }));
  return mats.get(c);
}
export const roofMats = [];
let building = null;   // the place being built, so its roofs can be let go when it comes down
function roofMat(c) {
  const m = new THREE.MeshLambertMaterial({ color: c });
  m.userData.base = new THREE.Color(c);
  roofMats.push(m);
  if (building) building.roofMats.push(m);
  return m;
}
/** Lets go of a place's roof materials when it is taken down (they are recoloured each season). */
export function releaseRoofs(out) {
  for (const m of out.roofMats || []) { const i = roofMats.indexOf(m); if (i >= 0) roofMats.splice(i, 1); m.dispose(); }
}

// --- wear (src/sim/placement.js): 0 sound, 1 worn and patched, 2 falling down -----------------------
/** How worn a place looks. */
export function wearStage(p) {
  const w = p.wear || 0;
  return p.decay || w >= 1 ? 2 : w >= 0.55 ? 1 : 0;
}
const WEATHERED = new THREE.Color(0x46432f), GRIME = new THREE.Color(0x645d4e);   // moss and soot
/** A colour dulled by weather: roofs darken and lose their colour, walls take on grime. */
function weathered(c, stage, roof) {
  if (!stage) return c;
  return new THREE.Color(c).lerp(roof ? WEATHERED : GRIME, (roof ? [0, 0.35, 0.65] : [0, 0.15, 0.32])[stage]).getHex();
}
/** The visual dice for one place: its look never touches the simulation's dice. */
function placeDice(id) {
  let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export function prism(w, d, h) {
  const x = w / 2, z = d / 2, g = new THREE.BufferGeometry();
  const v = [-x, 0, -z, -x, 0, z, -x, h, 0, x, 0, z, x, 0, -z, x, h, 0, -x, 0, z, x, 0, z, x, h, 0, -x, 0, z, x, h, 0, -x, h, 0, x, 0, -z, -x, 0, -z, -x, h, 0, x, 0, -z, -x, h, 0, x, h, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c);
const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };

/** A flat-topped patch laid over the ground (greens, fields, yards). */
function drape(v, O, x, y, w, h, colour, lift = 0.04) {
  const g = new THREE.PlaneGeometry(w, h, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const gx = x + w / 2 + p.getX(i), gy = y + h / 2 + p.getZ(i);
    p.setXYZ(i, gx - O.x, groundAt(v, gx, gy) + lift, gy - O.y);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, typeof colour === 'number' ? mat(colour) : colour);
  m.receiveShadow = true;
  return m;
}

/** The level pad a building stands on, its facing (towards the middle of the settlement) and a local frame. */
function site(p, ctx, out) {
  const { v, O } = ctx;
  let hi = -Infinity, lo = Infinity;
  for (let y = p.y; y <= p.y + p.h + 1e-6; y += p.h / 3) for (let x = p.x; x <= p.x + p.w + 1e-6; x += p.w / 3) { const g = groundAt(v, x, y); hi = Math.max(hi, g); lo = Math.min(lo, g); }
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, dx = O.x - cx, dy = O.y - cy;
  let rot, lw, ld;
  if (Math.abs(dx) > Math.abs(dy) * 1.3) { rot = dx > 0 ? Math.PI / 2 : -Math.PI / 2; lw = p.h; ld = p.w; }
  else { rot = dy > 0 ? 0 : Math.PI; lw = p.w; ld = p.h; }
  const frame = new THREE.Group();
  frame.position.set(cx - O.x, hi, cy - O.y);
  frame.rotation.y = rot;
  const group = new THREE.Group();
  group.add(frame);
  if (hi - lo > 0.08) { // a stone plinth where the ground falls away
    const plinth = shade(box(p.w - 0.3, hi - lo + 0.1, p.h - 0.3, 0x8f897c));
    plinth.position.set(cx - O.x, lo + (hi - lo) / 2 - 0.05, cy - O.y);
    group.add(plinth);
  }
  out.group.add(group);
  return { group, frame, base: hi, lw, ld, cx, cy, style: ctx.style, wear: ctx.wear || 0, dice: ctx.dice };
}
/** Turns a point in a building's local frame into world coordinates. */
function toWorld(s, x, y, z) {
  const c = Math.cos(s.frame.rotation.y), n = Math.sin(s.frame.rotation.y);
  return { x: s.frame.position.x + x * c + z * n, y: s.base + y, z: s.frame.position.z - x * n + z * c };
}

function walls(s, w, h, d, colour) {
  const m = shade(box(w, h, d, weathered(colour, s.wear, false))); m.position.y = h / 2; s.frame.add(m);
  if (s.wear >= 2) { // fallen stones and a slipped timber at the foot of a wall
    for (let i = 0; i < 3; i++) { const st = shade(box(0.22, 0.14, 0.18, 0x8a8478)); st.position.set((s.dice() - 0.5) * w, 0.07, d / 2 + 0.2 + s.dice() * 0.25); st.rotation.y = s.dice() * 3; s.frame.add(st); }
    const beam = shade(box(0.1, 0.1, Math.min(1.6, h * 0.9), 0x4a3a2c)); beam.position.set(w / 2 + 0.12, h * 0.4, d * 0.2); beam.rotation.x = 0.5; s.frame.add(beam);
  }
  if (s.style && s.style.timber) { // a timber frame shows on the faces: posts and a rail
    for (const z of [d / 2 + 0.015, -d / 2 - 0.015]) {
      for (const x of [-w / 2 + 0.06, -w / 6, w / 6, w / 2 - 0.06]) { const post = new THREE.Mesh(new THREE.PlaneGeometry(0.12, h), mat(s.style.trim)); post.position.set(x, h / 2, z); if (z < 0) post.rotation.y = Math.PI; s.frame.add(post); }
      const rail = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), mat(s.style.trim)); rail.position.set(0, h * 0.55, z); if (z < 0) rail.rotation.y = Math.PI; s.frame.add(rail);
    }
  }
  return m;
}
function gable(s, w, d, y, pitch, colour, alongX = w >= d) {
  const L = (alongX ? w : d) + 0.35, D = (alongX ? d : w) + 0.35, H = Math.min(w, d) * pitch;
  const g = new THREE.Group();
  g.add(shade(new THREE.Mesh(prism(L, D, H), roofMat(weathered(colour, s.wear, true)))));
  if (s.wear) {
    // patches of newer thatch or odd slates on a worn roof; dark holes and a sag on one falling down
    const tilt = Math.atan2(D / 2, H);
    const spot = (u, side, size, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.7), mat(c));
      m.rotation.order = 'YXZ'; m.rotation.y = side > 0 ? 0 : Math.PI; m.rotation.x = -tilt;
      const t = 0.35 + s.dice() * 0.3;   // how far down the slope, from ridge (0) to eaves (1)
      m.position.set(u, H * (1 - t) + 0.03, side * (D / 2 * t + 0.03));
      g.add(m);
    };
    const fresh = new THREE.Color(colour).lerp(new THREE.Color(0xd8c38a), 0.35).getHex();
    for (let i = 0; i < 2; i++) spot((s.dice() - 0.5) * L * 0.7, i ? -1 : 1, 0.6 + s.dice() * 0.3, fresh);
    if (s.wear >= 2) {
      for (let i = 0; i < 3; i++) spot((s.dice() - 0.5) * L * 0.6, i % 2 ? -1 : 1, 0.6 + s.dice() * 0.35, 0x1d1a17);
      g.scale.y = 0.75; g.rotation.z = (s.dice() < 0.5 ? -1 : 1) * (0.05 + s.dice() * 0.04);
    }
  }
  g.position.y = y;
  if (!alongX) g.rotation.y = Math.PI / 2;
  s.frame.add(g);
  return H * (s.wear >= 2 ? 0.75 : 1);
}
/** Thatch (docs/art-bible.md, section 6): deep, with eaves that come down low over the walls, a thick edge and a
 *  rounded ridge. Returns its height above the wall top. */
function thatch(s, w, d, y, pitch, colour) {
  const alongX = w >= d, drop = 0.3, H = gable(s, w + 0.25, d + 0.75, y - drop, pitch * 0.95, colour, alongX);
  const under = new THREE.Color(colour).multiplyScalar(0.62).getHex();
  gable({ ...s, wear: 0 }, w + 0.2, d + 0.7, y - drop - 0.16, pitch * 0.95, under, alongX);   // the thickness of the eaves
  const L = (alongX ? w : d) + 0.4, ridge = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, L, 8), mat(new THREE.Color(colour).multiplyScalar(0.85).getHex())));
  ridge.rotation.z = Math.PI / 2; if (!alongX) ridge.rotation.y = Math.PI / 2;
  ridge.position.y = y - drop + H - 0.05; s.frame.add(ridge);
  return H - drop;
}
const thatched = st => /thatch/.test(st.material || '');
/** The roof of the style of the day: thatch where the style is thatched, else a pitched roof of flags or slate. */
function roof(s, w, d, y, pitch, colour) { return thatched(s.style) ? thatch(s, w, d, y, pitch, colour) : gable(s, w, d, y, pitch, colour); }
function hipped(s, w, d, y, h, colour) {
  const r = shade(new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.2, h, 4), roofMat(weathered(colour, s.wear, true))));
  r.rotation.y = Math.PI / 4;
  r.scale.set(w / Math.hypot(w, d) * 1.414, s.wear >= 2 ? 0.85 : 1, d / Math.hypot(w, d) * 1.414);
  r.position.y = y + h / 2;
  s.frame.add(r);
  return h;
}
function door(s, d, x = 0, colour = 0x4a3326, w = 0.55, h = 0.95) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(colour));
  m.position.set(x, h / 2, d / 2 + 0.02);
  s.frame.add(m);
}
function windowRow(s, out, d, xs, y, size = 0.42, tall = 1) {
  for (const x of xs) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * tall), out.windows); m.position.set(x, y, d / 2 + 0.02); s.frame.add(m); }
}
function chimney(s, out, x, z, y, big = false, colour = 0x7d6a5c, tech = null) {
  const h = big ? 6 : 0.9, w = big ? 0.7 : 0.38;
  const c = shade(box(w, h, w, colour));
  c.position.set(x, y + h / 2 - (big ? 0 : 0.3), z);
  s.frame.add(c);
  const top = toWorld(s, x, y + h - (big ? 0 : 0.3) + 0.15, z);
  out.chimneys.push({ ...top, big, tech });
  return c;
}
function sign(s, w, d, colour) {
  const post = shade(box(0.12, 1.6, 0.12, 0x4a3326)); post.position.set(w / 2 + 0.3, 0.8, d / 2 + 0.3); s.frame.add(post);
  const b = shade(box(0.06, 0.5, 0.7, colour)); b.position.set(w / 2 + 0.3, 1.35, d / 2 + 0.3); s.frame.add(b);
}
function wheelAt(ctx, out, x, y, z, tech = null) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 18), mat(0x5d4532)));
  for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.3), mat(0x6b4f39)); sp.rotation.z = i * Math.PI / 8; g.add(sp); }
  g.traverse(m => { m.castShadow = true; });
  g.position.set(x, y, z);
  out.wheels.push(g);
  if (tech) (out.tech[tech] || (out.tech[tech] = [])).push(g);
  return g;
}

// --- archetypes -------------------------------------------------------------------------

function house(p, def, ctx, out) {
  // each house its own (docs/art-bible.md, section 6), from its own visual dice: proportions, roof, openings, chimneys
  const s = site(p, ctx, out), st = ctx.style, r = placeDice(p.id + ':form');
  const medieval = !!st.timber, brick = /brick/.test(st.material), stone = !medieval && !thatched(st) && !brick;
  const tall = st.storeys > 0 || stone;
  const w = s.lw - 0.6, d = (s.ld - 0.6) * (medieval ? 0.8 + r() * 0.12 : 1);
  const wh = medieval ? 1.15 + r() * 0.25 : tall ? 2.3 + r() * 0.35 : 1.45 + r() * 0.2;
  walls(s, w, wh, d, r() < 0.5 ? st.wall : st.wallAlt);
  const rh = roof(s, w, d, wh, st.pitch * (0.9 + r() * 0.2), r() < 0.5 ? st.roof : st.roofAlt);
  const dx = (r() - 0.5) * w * 0.4;
  if (medieval) {   // small dark openings: a low door and a shuttered hole
    door(s, d, dx, 0x2f261f, 0.5, 0.85);
    windowRow(s, out, d, [dx + (dx > 0 ? -1 : 1) * w * 0.28], wh * 0.62, 0.28);
  } else {
    door(s, d, dx, st.trim);
    windowRow(s, out, d, [dx + (dx > 0 ? -1 : 1) * w * 0.25], wh * (tall ? 0.3 : 0.55), 0.38);
    if (tall && stone) {   // the weavers' lights: a long row of small windows on the loom floor
      const n = Math.max(3, Math.floor(w / 0.55)), xs = [];
      for (let k = 0; k < n; k++) xs.push(-w / 2 + 0.4 + k * (w - 0.8) / (n - 1));
      windowRow(s, out, d, xs, wh * 0.78, 0.3, 1.2);
    } else if (tall) windowRow(s, out, d, [-w * 0.24, w * 0.24], wh * 0.78, 0.4, 1.15);
  }
  if (!medieval && r() < 0.35 && !tall) {   // a lean-to on one end, under the same roof
    const side = r() < 0.5 ? -1 : 1, lw = 0.9 + r() * 0.4, lean = new THREE.Group();
    const lwall = shade(box(lw, wh * 0.75, d * 0.8, weathered(st.wallAlt, s.wear, false))); lwall.position.y = wh * 0.375; lean.add(lwall);
    const lr = shade(new THREE.Mesh(prism(d * 0.9, lw * 2, 0.55), roofMat(weathered(st.roofAlt, s.wear, true)))); lr.rotation.y = Math.PI / 2; lr.position.set(-lw / 2, wh * 0.72, 0); lean.add(lr);
    lean.position.x = side * (w / 2 + lw / 2); if (side < 0) lean.rotation.y = Math.PI; s.frame.add(lean);
  }
  if (!medieval && (def.features?.includes('chimney') || tall)) {   // stone and brick houses have their chimneys: gable ends, or a stack on the ridge
    const cc = brick ? 0x8f5a48 : 0x9c917c;
    if (brick) chimney(s, out, (r() - 0.5) * w * 0.3, 0, wh + rh * 0.55, false, cc);
    else { chimney(s, out, w / 2 - 0.25, 0, wh + rh * 0.45, false, cc); if (r() < 0.45) chimney(s, out, -w / 2 + 0.25, 0, wh + rh * 0.45, false, cc); }
  } else if (medieval && def.features?.includes('chimney') && r() < 0.5) chimney(s, out, w / 2 - 0.5, 0, wh + rh * 0.4, false, 0x8a7d68);
  out.homeSpot = toWorld(s, w * 0.28, Math.min(wh * 0.8, 1.35) + (tall ? 0.6 : 0), d / 2 + 0.14);
  out.homeSpot.parent = out.group;
  return s.base + wh + rh;
}
function long(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.5, d = s.ld - 0.5, barn = p.def === 'barn';
  const wh = barn ? 2.2 : 2 + (st.storeys && p.def !== 'tavern' ? 0.6 : 0);
  walls(s, w, wh, d, barn ? 0x8a5a3c : st.wall);
  const rh = barn && !thatched(st) ? gable(s, w, d, wh, 0.6, 0x5b3a28) : roof(s, w, d, wh, barn ? 0.7 : st.pitch, barn ? 0x9a7c4c : st.roof);
  if (barn) door(s, d, 0, 0x4a3326, 1.4, 1.6);
  else { door(s, d, 0, st.trim); windowRow(s, out, d, [-w * 0.32, -w * 0.15, w * 0.15, w * 0.32].filter(x => Math.abs(x) * 2 < w), wh * 0.58); }
  if (def.features?.includes('chimney')) chimney(s, out, -w / 2 + 0.5, 0, wh + rh * 0.3);
  if (def.features?.includes('sign')) sign(s, w, d, 0xb07b2c);
  if (p.def === 'tavern') { out.homeSpot = toWorld(s, -w * 0.25, 1.35, d / 2 + 0.14); out.homeSpot.parent = out.group; }
  if (p.def === 'weaving') { // the shuttle's loom shop, a lean-to added when the idea is built
    const lean = new THREE.Group();
    const lw = shade(box(1.3, 1.4, d - 0.3, 0xd9cdb5)); lw.position.set(w / 2 + 0.7, 0.7, 0); lean.add(lw);
    const lr = shade(new THREE.Mesh(prism(d, 1.5, 0.6), roofMat(st.roof))); lr.rotation.y = Math.PI / 2; lr.position.set(w / 2 + 0.7, 1.4, 0); lean.add(lr);
    s.frame.add(lean); (out.tech.shuttle || (out.tech.shuttle = [])).push(lean);
  }
  return s.base + wh + rh;
}
function workshop(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.5, d = s.ld - 0.5, wh = p.def === 'mill' ? 2.2 : 1.7;
  walls(s, w, wh, d, p.def === 'forge' ? 0x8f877b : st.wall);
  const rh = p.def === 'forge' ? gable(s, w, d, wh, st.pitch, 0x6f6a62) : roof(s, w, d, wh, st.pitch, st.roof);
  door(s, d, -w * 0.2, st.trim, p.def === 'forge' ? 1 : 0.55);
  windowRow(s, out, d, [w * 0.25], wh * 0.58);
  if (def.features?.includes('chimney')) chimney(s, out, w / 2 - 0.4, -d * 0.2, wh + rh * 0.2);
  if (def.features?.includes('waterwheel')) {
    // on the river side of the mill, its foot in the water
    const wx = p.x + p.w * 0.35 - ctx.O.x, wz = p.y + p.h + 0.35 - ctx.O.y, wy = Math.max(-0.1, groundAt(ctx.v, p.x + p.w / 2, p.y + p.h + 0.6)) + 0.9;
    out.group.add(wheelAt(ctx, out, wx, wy, wz));
    out.group.add(wheelAt(ctx, out, wx + p.w * 0.4, wy, wz, 'millstone'));
  }
  return s.base + wh + rh;
}
function sacred(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.6, d = s.ld - 0.6, wh = 2.5;
  const early = p.age === 'medieval', roof = early ? 0x8e8a7f : 0x56616b;   // grit stone under stone slate before Welsh slate
  if (early) s.style = Object.assign({}, s.style, { timber: false });
  walls(s, w * 0.7, wh, d, 0xcfcabf);
  const rh = gable(s, w * 0.7, d, wh, 0.5, roof, false);
  const tw = Math.min(1.3, w * 0.3);
  const tower = shade(box(tw, wh + 1.2, tw, 0xc4bfb3)); tower.position.set(w * 0.35 + tw / 2 - 0.2, (wh + 1.2) / 2, 0); s.frame.add(tower);
  let top = wh + 1.2;
  if (def.features?.includes('spire') && !early) { const sp = shade(new THREE.Mesh(new THREE.ConeGeometry(tw * 0.62, 2.2, 4), roofMat(0x56616b))); sp.rotation.y = Math.PI / 4; sp.position.set(w * 0.35 + tw / 2 - 0.2, top + 1.1, 0); s.frame.add(sp); top += 2.2; }
  door(s, d, -w * 0.1, st.trim);
  windowRow(s, out, d, [-w * 0.28], wh * 0.6);
  return s.base + Math.max(top, wh + rh);
}
function civic(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.5, d = s.ld - 0.5, wh = 2 + st.storeys * 0.5;
  walls(s, w, wh, d, p.def === 'hall' ? 0xc9bba0 : st.wall);
  const rh = hipped(s, w, d, wh, 1, st.roof);
  door(s, d, 0, st.trim, 0.7, 1.1);
  windowRow(s, out, d, [-w * 0.3, w * 0.3], wh * 0.55);
  if (def.features?.includes('chimney')) chimney(s, out, -w / 2 + 0.4, 0, wh + 0.3);
  if (def.features?.includes('bell')) { const b = shade(box(0.5, 0.7, 0.5, st.roof)); b.position.set(0, wh + rh + 0.1, 0); s.frame.add(b); return s.base + wh + rh + 0.5; }
  return s.base + wh + rh;
}
function industrial(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.4, d = s.ld - 0.4, wh = 4.2;
  walls(s, w, wh, d, 0xa4553e);
  const rh = gable(s, w, d, wh, 0.3, 0x56616b);
  door(s, d, 0, st.trim, 0.9, 1.2);
  for (let f = 0; f < 3; f++) windowRow(s, out, d, [-0.38, -0.13, 0.13, 0.38].map(k => k * w), 1 + f * 1.2);
  chimney(s, out, w / 2 + 0.5, 0, 0, false, 0x7a3a2a);
  // steam's engine house and tall stack
  const steam = new THREE.Group();
  const eh = shade(box(1.4, 1.6, 1.6, 0x8a4a36)); eh.position.set(-w / 2 - 0.9, 0.8, 0); steam.add(eh);
  const stack = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 10), mat(0x6e3326))); stack.position.set(-w / 2 - 0.9, 3.5, -d * 0.3); steam.add(stack);
  s.frame.add(steam);
  out.tech.steam = [steam];
  out.chimneys.push({ ...toWorld(s, -w / 2 - 0.9, 7.1, -d * 0.3), big: true, tech: 'steam', works: true });
  return s.base + Math.max(wh + rh, 7);
}
function green(p, def, ctx, out) {
  const { v, O } = ctx;
  const pl = drape(v, O, p.x, p.y, p.w, p.h, ctx.greenMat, 0.05);
  out.group.add(pl);
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, gy = groundAt(v, cx, cy);
  const well = new THREE.Group();
  const ring = shade(box(1.2, 0.6, 1.2, 0x9a958a)); ring.position.y = 0.3; well.add(ring);
  const wr = shade(new THREE.Mesh(prism(1.6, 1.4, 0.5), roofMat(0x6a4535))); wr.position.y = 1.35; well.add(wr);
  for (const dx of [-0.6, 0.6]) { const pst = shade(box(0.1, 1.1, 0.1, 0x4a3326)); pst.position.set(dx, 0.85, 0); well.add(pst); }
  well.position.set(cx - O.x, gy, cy - O.y);
  out.group.add(well);
  return gy + 1.9;
}
function market(p, def, ctx, out) {
  const { v, O } = ctx;
  out.group.add(drape(v, O, p.x, p.y, p.w, p.h, 0xb8ab90, 0.05));
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, gy = groundAt(v, cx, cy), g = new THREE.Group();
  const st = shade(box(0.25, 2, 0.25, 0x8d877c)); st.position.y = 1; g.add(st);
  const ar = shade(box(1, 0.22, 0.25, 0x8d877c)); ar.position.y = 1.5; g.add(ar);
  for (const dx of [-1.8, 1.8]) {
    const stall = shade(new THREE.Mesh(prism(1.4, 1, 0.5), roofMat(dx < 0 ? 0xa0705a : 0x6f8590))); stall.position.set(dx, 1.1, 0.2); g.add(stall);
    const tb = shade(box(1.2, 0.7, 0.8, 0x7a5a40)); tb.position.set(dx, 0.35, 0.2); g.add(tb);
  }
  g.position.set(cx - O.x, gy, cy - O.y);
  out.group.add(g);
  return gy + 2.2;
}
function field(p, def, ctx, out) {
  const { v, O } = ctx;
  out.group.add(drape(v, O, p.x, p.y, p.w, p.h, 0x9c8248, 0.05));
  for (let y = p.y + 0.5; y < p.y + p.h - 0.2; y += 0.75) for (let x = p.x + 0.4; x < p.x + p.w - 0.4; x += 2) {
    const len = Math.min(2, p.x + p.w - 0.3 - x), r = shade(box(len, 0.5, 0.32, ctx.cropMat));
    r.position.set(x + len / 2 - O.x, groundAt(v, x + len / 2, y), y - O.y);
    r.userData.ground = r.position.y;
    out.rows.push(r); out.group.add(r);
  }
  // the heavy plough, left at the field's corner once the idea is built
  const pg = new THREE.Group(), px = p.x + 1.2, py = p.y - 0.7, gy = groundAt(v, px, py);
  const beam = shade(box(1.6, 0.15, 0.15, 0x6b4f39)); beam.position.y = 0.5; pg.add(beam);
  const sh = shade(new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 4), mat(0x6a6a70))); sh.rotation.z = Math.PI / 2; sh.position.set(0.9, 0.3, 0); pg.add(sh);
  pg.position.set(px - O.x, gy, py - O.y);
  out.group.add(pg); out.tech.plough = [pg];
  return groundAt(v, p.x + p.w / 2, p.y + p.h / 2) + 0.6;
}
function garden(p, def, ctx, out) {
  const { v, O } = ctx;
  out.group.add(drape(v, O, p.x, p.y, p.w, p.h, 0x6f9550, 0.05));
  let k = 0;
  for (let x = p.x + 0.6; x < p.x + p.w - 0.3; x += 0.8) for (let y = p.y + 0.6; y < p.y + p.h - 0.3; y += 0.8) {
    const b = shade(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 7), mat([0x6d8a55, 0x8f8199, 0x7b9460, 0xb8a46a][k++ % 4])));
    b.scale.y = 0.6; b.position.set(x - O.x, groundAt(v, x, y) + 0.14, y - O.y);
    out.group.add(b);
  }
  return groundAt(v, p.x + p.w / 2, p.y + p.h / 2) + 0.6;
}
function wharf(p, def, ctx, out) {
  const { v, O } = ctx;
  out.group.add(drape(v, O, p.x, p.y, p.w, p.h, 0x9e9584, 0.06));
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, gy = groundAt(v, cx, cy), g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = shade(box(0.6, 0.6, 0.6, i % 2 ? 0x7a5a40 : 0x6b4c34)); c.position.set(-1.2 + i * 0.75, 0.3 + (i === 2 ? 0.6 : 0), 0.2); g.add(c); }
  const post = shade(box(0.18, 2.4, 0.18, 0x4a3326)); post.position.set(1.5, 1.2, -0.3); g.add(post);
  const arm = shade(box(1.8, 0.14, 0.14, 0x4a3326)); arm.position.set(1, 2.3, -0.3); g.add(arm);
  g.position.set(cx - O.x, gy, cy - O.y);
  out.group.add(g);
  return gy + 2.6;
}
function station(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style, w = s.lw - 0.4, d = s.ld - 0.6;
  walls(s, w * 0.7, 1.8, d * 0.7, 0xb7a789);
  const rh = gable(s, w * 0.7, d * 0.7, 1.8, 0.35, 0x56616b);
  const plat = shade(box(w + 0.4, 0.35, 0.8, 0x9a958a)); plat.position.set(0, 0.18, d / 2 - 0.2); s.frame.add(plat);
  const canopy = shade(box(w, 0.08, 1.1, st.roof)); canopy.position.set(0, 1.9, d / 2 - 0.3); s.frame.add(canopy);
  door(s, d * 0.7, 0, st.trim);
  windowRow(s, out, d * 0.7, [-w * 0.2, w * 0.2], 1);
  return s.base + 1.8 + rh;
}

/** A mill on the hill: a tapering tower, a cap, and sails that turn with the wheels. */
function windmill(p, def, ctx, out) {
  const s = site(p, ctx, out), st = ctx.style;
  const tower = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 3, 10), mat(st.timber ? st.wall : 0xcfc6ae))); tower.position.y = 1.5; s.frame.add(tower);
  const cap = shade(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.9, 10), roofMat(st.roof))); cap.position.y = 3.45; s.frame.add(cap);
  door(s, 1.9, 0, st.trim, 0.5, 0.9);
  const sails = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.08), mat(0x4a3326)); stock.position.y = 1.3; arm.add(stock);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.9, 0.03), mat(0xe9e1cf)); cloth.position.set(0.3, 1.55, 0); arm.add(cloth);
    sails.add(arm);
  }
  sails.position.set(0, 2.9, 1.0); sails.traverse(m => { m.castShadow = true; });
  s.frame.add(sails); out.wheels.push(sails);
  return s.base + 4.2;
}

/** What is left of a building no longer used: broken walls in the grass, no roof. */
function ruin(p, def, ctx, out) {
  const s = site(p, ctx, out), w = s.lw - 0.6, d = s.ld - 0.6, stone = 0x9a9384;
  const seg = (x, z, len, along, h) => { const m = shade(box(along ? len : 0.3, h, along ? 0.3 : len, stone)); m.position.set(x, h / 2, z); s.frame.add(m); };
  // each wall stands to a different height, as if robbed for stone
  seg(-w / 4, d / 2, w / 2, true, 0.9); seg(w / 3, d / 2, w / 3, true, 0.35);
  seg(0, -d / 2, w, true, 0.6);
  seg(-w / 2, 0, d, false, 1.3); seg(w / 2, -d / 4, d / 2, false, 0.5);
  return s.base + 1.4;
}

const BUILD = { house, long, workshop, sacred, civic, industrial, green, market, field, garden, wharf, station, ruin, windmill };

/** Builds the 3D form of one place. */
export function buildPlace(p, def, ctx) {
  const out = { group: new THREE.Group(), windows: new THREE.MeshBasicMaterial({ color: 0x2c3238 }), chimneys: [], wheels: [], tech: {}, rows: [], homeSpot: null, roofMats: [] };
  const fn = BUILD[def.archetype] || house;
  const styles = (AGES[p.age] || AGES[FIRST_AGE]).styles, style = styles[Math.max(0, Math.min(styles.length - 1, p.era || 0))];
  building = out;
  try { out.top = fn(p, def, { ...ctx, style, wear: wearStage(p), dice: placeDice(p.id) }, out); } finally { building = null; }
  return out;
}
