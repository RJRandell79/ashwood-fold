// Renders the art bible's fixed review shots (docs/art-bible.md, "Review shots"), so every change to how the
// valley looks can be judged on the same frames. Each shot is a seed played headlessly for a set number of
// years, loaded into a debug build of the game, and photographed from a fixed camera at a fixed hour.
//
//   node tools/review-shots.mjs [--out review/current] [--only manor-wide,mill-map] [--scale 2]
//
// The debug build exposes the scene to the browser and is written outside dist/, so the published page
// never carries the hook. Three.js r128 comes from node_modules (a dev dependency pinned to the page's version).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../harness/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(ROOT + '/');
const esbuild = require('esbuild'), { chromium } = require('playwright');

/** The review shots. Keep in step with the table in docs/art-bible.md. */
export const SHOTS = [
  { id: 'manor-wide',  seed: 9, years: 10, hour: 10.5, phi: 0.95, theta: 0.7, radius: 46, about: 'The manor village whole, morning light.' },
  { id: 'manor-close', seed: 9, years: 10, hour: 15,   phi: 1.12, theta: 1.2, radius: 20, about: 'Close on the green and church: materials, people, ink at near range.' },
  { id: 'manor-map',   seed: 9, years: 10, hour: 12,   phi: 0.06, theta: 0,   radius: 70, about: 'Straight down: the estate-map reading.' },
  { id: 'mill-wide',   seed: 6, years: 90, hour: 10.5, phi: 0.95, theta: 2.2, radius: 52, about: 'The mill village whole, two ages of building side by side.' },
  { id: 'mill-dusk',   seed: 6, years: 90, hour: 19.5, phi: 0.9,  theta: 2.2, radius: 40, about: 'Dusk: lamplight, smoke, the shut mill.' },
  { id: 'mill-map',    seed: 6, years: 90, hour: 12,   phi: 0.06, theta: 0,   radius: 70, about: 'Straight down after the interlude: old names and new streets.' },
];

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(ROOT, arg('--out', 'review/current'));
const only = arg('--only', '') ? arg('--only').split(',') : null;
const scale = +arg('--scale', 2);

async function debugPage(dir) {
  const r = await esbuild.build({
    stdin: { contents: `import './src/main.js';import {G} from './src/view/three.js';window.__review={G:()=>G};`, resolveDir: ROOT },
    bundle: true, format: 'iife', target: 'es2020', write: false, logLevel: 'warning',
  });
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace('<!-- STYLES -->', () => `<style>${fs.readFileSync(path.join(ROOT, 'src/view/styles.css'), 'utf8')}</style>`)
    .replace('<!-- SCRIPT -->', () => `<script>${r.outputFiles[0].text}</script>`);
  const file = path.join(dir, 'review.html'); fs.writeFileSync(file, html); return file;
}

const shots = SHOTS.filter(s => !only || only.includes(s.id));
fs.mkdirSync(out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'af-review-'));
const page = await debugPage(tmp), saves = {};
for (const s of shots) { const k = `${s.seed}:${s.years}`; if (!saves[k]) saves[k] = JSON.stringify(run(s.seed, { years: s.years })); }

const three = fs.readFileSync(path.join(ROOT, 'node_modules/three/build/three.min.js'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const s of shots) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: scale });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/three.min.js', r => r.fulfill({ body: three, contentType: 'text/javascript' }));
  await p.route('**/fonts.g*/**', r => r.abort());
  await p.addInitScript(x => { try { localStorage.setItem('ashworth-fold-v1', x); } catch (e) {} }, saves[`${s.seed}:${s.years}`]);
  await p.goto('file://' + page); await p.waitForTimeout(2500);
  await p.click('text=Pause');
  const box = await p.evaluate(s => {
    const G = __review.G(), S = JSON.parse(localStorage.getItem('ashworth-fold-v1'));
    const ps = Object.values(S.places).filter(q => q.kind !== 'field' && q.def !== 'ruin');
    const cx = ps.reduce((a, q) => a + q.x + q.w / 2, 0) / ps.length, cy = ps.reduce((a, q) => a + q.y + q.h / 2, 0) / ps.length;
    const O = G.world.O; G.target.set(cx - O.x, 0, cy - O.y);
    Object.assign(G, { hour: s.hour, phi: s.phi, theta: s.theta, radius: s.radius });
    const card = document.getElementById('placeCard'); if (card) card.hidden = true;
    const r = document.getElementById('map3d').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, s);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(out, `${s.id}.png`), clip: box, timeout: 150000 });
  console.log(`${s.id}${errs.length ? '  ERRORS: ' + errs.join(' | ') : ''}`);
  await p.close();
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${shots.length} shots in ${path.relative(ROOT, out)}/`);
