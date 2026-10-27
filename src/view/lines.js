// The canal and the railway, drawn along the routes the simulation chose (S.lines).
import { groundAt } from './terrain.js';
import { mat } from './archetypes.js';

/** The route as a smooth world-space path: [{x, y, z}] one point per cell column. */
export function linePath(ys, v, O, level) {
  const n = ys.length, sm = [];
  for (let x = 0; x < n; x++) { let s = 0, k = 0; for (let d = -3; d <= 3; d++) { const j = x + d; if (j >= 0 && j < n) { s += ys[j]; k++; } } sm.push(s / k + 0.5); }
  const pts = sm.map((y, x) => ({ x: x + 0.5 - O.x, z: y - O.y, y: groundAt(v, x + 0.5, y) }));
  // canals stay level in long pounds; railways ease over the ground
  const win = level ? 9 : 4;
  return pts.map((p, i) => { let s = 0, k = 0; for (let d = -win; d <= win; d++) { const q = pts[i + d]; if (q) { s += q.y; k++; } } return { ...p, y: Math.max(p.y, s / k) }; });
}

/** A flat strip of the given width laid along a path. */
function ribbon(path, width, lift, offset = 0) {
  const pos = [], idx = [];
  path.forEach((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx;
    for (const side of [-1, 1]) { const o = offset + side * width / 2; pos.push(p.x + nx * o, p.y + lift, p.z + nz * o); }
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const strip = (path, w, lift, colour, off = 0) => { const m = new THREE.Mesh(ribbon(path, w, lift, off), typeof colour === 'number' ? mat(colour) : colour); m.receiveShadow = true; return m; };

/** Position and heading at distance t (0..1) along a path. */
export function along(path, t) {
  const f = Math.max(0, Math.min(path.length - 1.001, t * (path.length - 1))), i = Math.floor(f), k = f - i;
  const a = path[i], b = path[i + 1];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, heading: Math.atan2(b.x - a.x, b.z - a.z) };
}

const waterMat = () => new THREE.MeshPhongMaterial({ color: 0x3f6f7e, shininess: 40, specular: 0x4a6470, polygonOffset: true, polygonOffsetFactor: -2 });

export function buildCanal(ys, v, O) {
  const path = linePath(ys, v, O, true), group = new THREE.Group();
  group.add(strip(path, 2.1, 0.06, 0x8d8578));
  group.add(strip(path, 1.3, 0.1, waterMat()));
  for (const s of [-1, 1]) group.add(strip(path, 0.25, 0.2, 0x8d8578, s * 0.78));
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 3.4), mat(0x2f4a3a)); hull.position.y = 0.25; boat.add(hull);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.2), mat(0x9a3b2a)); cab.position.set(0, 0.6, -1); boat.add(cab);
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 1.8), mat(0x2a2622)); load.position.set(0, 0.48, 0.6); boat.add(load);
  boat.traverse(m => { m.castShadow = true; });
  group.add(boat);
  return { group, path, mover: boat, speed: 1 / 110 };
}

export function buildRailway(ys, v, O) {
  const path = linePath(ys, v, O, false), group = new THREE.Group();
  group.add(strip(path, 1.8, 0.12, 0x7a6e60));
  for (const s of [-1, 1]) group.add(strip(path, 0.09, 0.22, 0x55555c, s * 0.36));
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.06, 0.25), mat(0x4a3a2c), path.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let k = 0;
  for (let t = 0; t < 1; t += 1 / (path.length * 2)) { const a = along(path, t); q.setFromAxisAngle(up, a.heading); m4.compose(p.set(a.x, a.y + 0.17, a.z), q, sc); sleepers.setMatrixAt(k++, m4); }
  sleepers.count = k;
  group.add(sleepers);
  const train = new THREE.Group();
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 12), mat(0x2b4a33)); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 0.75, 0.5); train.add(boiler);
  const cabE = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9), mat(0x2b4a33)); cabE.position.set(0, 0.85, -0.8); train.add(cabE);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.6, 8), mat(0x1d1d1d)); funnel.position.set(0, 1.3, 1.3); train.add(funnel);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 3), mat(0x1d1d1d)); base.position.set(0, 0.38, 0.2); train.add(base);
  for (let i = 1; i <= 3; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 2.6), mat(i % 2 ? 0x7a2c24 : 0x6a2620)); c.position.set(0, 0.75, -i * 2.9); train.add(c); }
  train.traverse(m => { m.castShadow = true; });
  group.add(train);
  return { group, path, mover: train, speed: 1 / 45, funnel: new THREE.Vector3(0, 1.6, 1.3) };
}
