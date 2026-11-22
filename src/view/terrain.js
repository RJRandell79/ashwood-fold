// The valley floor, river, woods and worn paths, built from the same seeded terrain the
// simulation uses. Everything here is drawn from the valley's own numbers or from hashes of
// cell positions, never from the simulation's dice.
import { SEASON_GROUND, SEASON_LEAF } from '../data/styles.js';
import { heightAt, noise } from '../sim/valley.js';

/** Vertical scale: valley heights are in cells, which makes for steep hills in 3D. */
export const HS = 0.6;
const PAD = 40; // the ground carries on past the valley's edge into the fog

export const groundAt = (v, x, y) => heightAt(v, x, y) * HS;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hash = (x, y, s) => noise(x * 7.31 + 0.5, y * 7.31 + 0.5, s); // stable per-cell dice

/** Ground mesh, water and a function that recolours the ground for a season and the worn paths. */
export function makeGround(v, O) {
  const nx = v.W + PAD * 2, ny = v.H + PAD * 2;
  const geo = new THREE.PlaneGeometry(nx, ny, nx, ny);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cells = new Int32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const gx = pos.getX(i) + nx / 2 - PAD, gy = pos.getZ(i) + ny / 2 - PAD;
    pos.setY(i, groundAt(v, gx, gy));
    pos.setX(i, gx - O.x); pos.setZ(i, gy - O.y);
    // the four cells that meet at this corner, clamped to the valley
    let k = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const cx = clamp(Math.floor(gx) + dx, 0, v.W - 1), cy = clamp(Math.floor(gy) + dy, 0, v.H - 1);
      cells[i * 4 + k++] = cy * v.W + cx;
    }
  }
  geo.computeVertexNormals();
  const col = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  // Per-cell base mix, worked out once: how moorland, how lush, how close to the bank.
  const n = v.W * v.H, moor = new Float32Array(n), lush = new Float32Array(n), bank = new Float32Array(n), tone = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % v.W, y = (i / v.W) | 0;
    moor[i] = clamp((v.height[i] - 6) / 10, 0, 1) * (0.7 + 0.3 * hash(x * 0.3, y * 0.3, v.seed + 3));
    lush[i] = clamp(v.flood[i] * 1.5, 0, 1) * 0.7;
    bank[i] = v.water[i] ? 1 : clamp(1 - v.dist[i] / 1.6, 0, 1);
    tone[i] = 0.92 + 0.16 * hash(x, y, v.seed + 11);
  }
  const C = k => SEASON_GROUND[k].map(c => new THREE.Color(c));
  const pal = { grass: C('grass'), lush: C('lush'), moor: C('moor'), bank: C('bank'), path: C('path'), lane: C('lane') };
  const tmp = new THREE.Color(), pc = new THREE.Color();
  function colourise(season, foot, roads) {
    for (let i = 0; i < pos.count; i++) {
      let m = 0, l = 0, b = 0, t = 0, f = 0, r = 0;
      for (let k = 0; k < 4; k++) { const c = cells[i * 4 + k]; m += moor[c]; l += lush[c]; b += bank[c]; t += tone[c]; f += foot ? foot[c] || 0 : 0; r += roads && roads[c] ? 1 : 0; }
      m /= 4; l /= 4; b /= 4; t /= 4; f /= 4;
      tmp.copy(pal.grass[season]).lerp(pal.lush[season], l).lerp(pal.moor[season], m).lerp(pal.bank[season], b * 0.8);
      if (season !== 3) tmp.multiplyScalar(t);
      const worn = clamp((f - 2) / 30, 0, 0.85);
      if (worn > 0) tmp.lerp(pc.copy(pal.path[season]), worn);
      if (r) tmp.lerp(pc.copy(pal.lane[season]), 0.55 + r * 0.11);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.attributes.color.needsUpdate = true;
  }

  const water = new THREE.Mesh(new THREE.PlaneGeometry(nx, ny), new THREE.MeshLambertMaterial({ color: 0x6f97a8 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(v.W / 2 - O.x, -0.12, v.H / 2 - O.y);
  water.receiveShadow = true;
  return { mesh, water, colourise };
}

/** Woods from the valley's wood cells, plus a scatter of field trees, kept off buildings, lines and paths. */
// Trees as painted masses (docs/art-bible.md, section 7): each crown a few overlapping blobs that shade together as
// one shape, darker underneath, with a silhouette of its kind. Blobs are [x, y, z, radius, squash], crown-centred.
const OAK = [[0, 0, 0, 0.72, 0.78], [0.5, -0.1, 0.18, 0.52, 0.72], [-0.48, -0.05, -0.12, 0.55, 0.74], [0.08, 0.32, -0.34, 0.46, 0.78], [-0.14, 0.28, 0.4, 0.42, 0.78], [0.3, 0.38, 0.05, 0.36, 0.8]];
const ALDER = [[0, -0.4, 0, 0.58, 0.95], [0.1, 0.25, 0.06, 0.5, 1.05], [-0.16, -0.02, -0.12, 0.46, 0.92], [0.04, 0.8, -0.04, 0.32, 1.05]];
const THORN = [[0.15, -0.35, 0.05, 0.5, 0.7], [-0.32, -0.25, -0.1, 0.38, 0.65], [0.38, -0.05, -0.2, 0.32, 0.7]];
const HOLLY = [[0, -0.5, 0, 0.55, 0.9], [0, 0.05, 0, 0.42, 1.0], [0, 0.5, 0, 0.28, 1.1]];
const KINDS = [OAK, ALDER, THORN, HOLLY];
function clump(blobs) {
  const pos = [], nor = [], col = [];
  let top = -Infinity, bot = Infinity;
  for (const [, y, , r, sq] of blobs) { top = Math.max(top, y + r * sq); bot = Math.min(bot, y - r * sq); }
  for (const [x, y, z, r, sq] of blobs) {
    const g = new THREE.IcosahedronGeometry(r, 1).toNonIndexed();
    g.scale(1, sq, 1); g.translate(x, y, z);
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const px = p[i], py = p[i + 1], pz = p[i + 2];
      pos.push(px, py, pz);
      // the blob's own normal, pulled most of the way towards the crown's, so the crown shades as one mass
      let bx = px - x, by = (py - y) / sq, bz = pz - z, bl = Math.hypot(bx, by, bz) || 1;
      let cx = px, cy = py * 0.8, cz = pz, cl = Math.hypot(cx, cy, cz) || 1;
      const nx = bx / bl * 0.3 + cx / cl * 0.7, ny = by / bl * 0.3 + cy / cl * 0.7, nz = bz / bl * 0.3 + cz / cl * 0.7, nl = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / nl, ny / nl, nz / nl);
      // darker underneath: the crown's lower part and each blob's underside
      const t = (py - bot) / (top - bot || 1), k = 0.74 + 0.26 * Math.sqrt(t);
      col.push(k, k, k);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
const HOLLY_LEAF = 0x3f5a44;
const UP = new THREE.Vector3(0, 1, 0);
export function makeTrees(v, O, blocked, leafMats, trunkMat) {
  const spots = [];
  for (let y = 0; y < v.H; y++) for (let x = 0; x < v.W; x++) {
    const i = y * v.W + x;
    if (v.water[i] || blocked[i]) continue;
    const r = hash(x, y, v.seed + 71);
    const want = v.wood[i] ? 0.55 : v.dist[i] > 2 && v.height[i] < 12 ? 0.025 : 0;
    if (r >= want) continue;
    const jx = hash(x, y, v.seed + 72), jy = hash(x, y, v.seed + 73), s = (v.wood[i] ? 1.05 : 0.75) + hash(x, y, v.seed + 74) * 0.6;
    const kr = hash(x, y, v.seed + 75), wet = v.dist[i] < 4;
    const kind = v.wood[i] ? (kr < (wet ? 0.25 : 0.55) ? 0 : kr < 0.88 ? 1 : 3) : (kr < 0.35 ? 0 : kr < (wet ? 0.75 : 0.5) ? 1 : kr < 0.9 ? 2 : 3);
    spots.push({ x: x + 0.2 + jx * 0.6, y: y + 0.2 + jy * 0.6, s: kind === 2 ? s * 0.7 : s, wood: !!v.wood[i], kind, leaf: Math.floor(hash(x, y, v.seed + 76) * 3) % 3 });
  }
  const group = new THREE.Group();
  // painted clumps, not cones and balls (docs/art-bible.md, section 7): a tall shape (alder, ash) and a broad one (oak)
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), shapes = KINDS.map(clump);
  const holly = new THREE.MeshLambertMaterial({ color: HOLLY_LEAF, vertexColors: true });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, spots.length));
  trunks.count = spots.length;
  const lone = spots.filter(t => !t.wood);   // in a wood the crowns close over: no sticks showing
  trunks.count = lone.length;
  lone.forEach((t, k) => {
    const gy = groundAt(v, t.x, t.y);
    m4.compose(p.set(t.x - O.x, gy + 0.4 * t.s, t.y - O.y), q, sc.set(t.s, t.s, t.s));
    trunks.setMatrixAt(k, m4);
  });
  trunks.castShadow = true;
  group.add(trunks);
  for (let kind = 0; kind < KINDS.length; kind++) for (let leaf = 0; leaf < 3; leaf++) {
    const list = spots.filter(t => t.kind === kind && t.leaf === leaf);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(shapes[kind], kind === 3 ? holly : leafMats[leaf], list.length);
    list.forEach((t, k) => {
      const gy = groundAt(v, t.x, t.y);
      q.setFromAxisAngle(UP, (t.x * 7.3 + t.y * 3.1) % 6.28);   // each tree turned its own way
      m4.compose(p.set(t.x - O.x, gy + (t.wood ? 1.15 : t.kind === 2 ? 0.95 : 1.5) * t.s, t.y - O.y), q, sc.set(t.s * (t.wood ? 1.25 : 1), t.s, t.s * (t.wood ? 1.25 : 1)));
      im.setMatrixAt(k, m4);
    });
    im.castShadow = true;
    group.add(im);
  }
  q.identity();
  return group;
}

export function leafMaterials() {
  return SEASON_LEAF[0].map(c => new THREE.MeshLambertMaterial({ color: c, vertexColors: true }));
}
