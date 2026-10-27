// Runs the original v5 prototype (prototype/v5/source) under jsdom so the port can be
// checked against it. A test hook is injected into the in-memory copy only.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PARTS = ['a_head.html', 'b_core.js', 'c_life.js', 'd_world.js', 'g_faces.js', 'h_civic.js', 'e_ui.js', 'f_3d.js'];

let cached = null;
function loadV5() {
  if (cached) return cached;
  let html = PARTS.map(p => fs.readFileSync(path.join(ROOT, 'prototype/v5/source', p), 'utf8')).join('');
  html = html.replace(/<script src="[^"]*three[^"]*"><\/script>/, '');
  const hook = 'window.__v5={get S(){return S;},tick:()=>tick(),newTown:s=>{newTown(s);refreshLive();}};\n';
  if (!html.includes('window.claude?.hot?.snapshot')) throw new Error('v5 boot line not found');
  html = html.replace('window.claude?.hot?.snapshot', hook + 'window.claude?.hot?.snapshot');
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    url: 'https://v5.invalid/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.ResizeObserver = class { observe() {} };
      w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ width: 10 })), set: (t, k, v) => ((t[k] = v), true) });
      w.requestAnimationFrame = () => 0;
    },
  });
  if (!dom.window.__v5) throw new Error('v5 did not boot');
  cached = dom.window.__v5;
  return cached;
}

/** Same contract as harness/lib.mjs run(): fresh village, N ticks, returns a JSON snapshot of S. */
export function runV5(seed, { ticks }) {
  const v5 = loadV5();
  v5.newTown(seed);
  for (let i = 0; i < ticks; i++) v5.tick();
  return JSON.parse(JSON.stringify(v5.S));
}
