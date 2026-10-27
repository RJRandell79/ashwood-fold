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

  const water = new THREE.Mesh(new THREE.PlaneGeometry(nx, ny), new THREE.MeshPhongMaterial({ color: 0x4d84a0, shininess: 20, specular: 0x263840 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(v.W / 2 - O.x, -0.12, v.H / 2 - O.y);
  water.receiveShadow = true;
  return { mesh, water, colourise };
}

/** Woods from the valley's wood cells, plus a scatter of field trees, kept off buildings, lines and paths. */
export function makeTrees(v, O, blocked, leafMats, trunkMat) {
  const spots = [];
  for (let y = 0; y < v.H; y++) for (let x = 0; x < v.W; x++) {
    const i = y * v.W + x;
    if (v.water[i] || blocked[i]) continue;
    const r = hash(x, y, v.seed + 71);
    const want = v.wood[i] ? 0.55 : v.dist[i] > 2 && v.height[i] < 12 ? 0.025 : 0;
    if (r >= want) continue;
    const jx = hash(x, y, v.seed + 72), jy = hash(x, y, v.seed + 73), s = 0.7 + hash(x, y, v.seed + 74) * 0.7;
    spots.push({ x: x + 0.2 + jx * 0.6, y: y + 0.2 + jy * 0.6, s, kind: hash(x, y, v.seed + 75) < 0.45 ? 0 : 1, leaf: Math.floor(hash(x, y, v.seed + 76) * 3) % 3 });
  }
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), cone = new THREE.ConeGeometry(0.75, 1.9, 7), round = new THREE.IcosahedronGeometry(0.85, 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, spots.length));
  trunks.count = spots.length;
  spots.forEach((t, k) => {
    const gy = groundAt(v, t.x, t.y);
    m4.compose(p.set(t.x - O.x, gy + 0.4 * t.s, t.y - O.y), q, sc.set(t.s, t.s, t.s));
    trunks.setMatrixAt(k, m4);
  });
  trunks.castShadow = true;
  group.add(trunks);
  for (let kind = 0; kind < 2; kind++) for (let leaf = 0; leaf < 3; leaf++) {
    const list = spots.filter(t => t.kind === kind && t.leaf === leaf);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(kind ? round : cone, leafMats[leaf], list.length);
    list.forEach((t, k) => {
      const gy = groundAt(v, t.x, t.y);
      m4.compose(p.set(t.x - O.x, gy + 1.65 * t.s, t.y - O.y), q, sc.set(t.s, t.s, t.s));
      im.setMatrixAt(k, m4);
    });
    im.castShadow = true;
    group.add(im);
  }
  return group;
}

export function leafMaterials() {
  return SEASON_LEAF[0].map(c => new THREE.MeshLambertMaterial({ color: c }));
}
