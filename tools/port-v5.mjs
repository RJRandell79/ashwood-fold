// One-off migration: splits the v5 single-file prototype into ES modules under src/.
// Kept in the repo as a record of how the port was made. After Phase 0 the modules
// under src/ are maintained by hand, so do not re-run this over edited sources.
//
//   node tools/port-v5.mjs            writes src/ (refuses if src/ exists)
//   node tools/port-v5.mjs --force    overwrites src/
import * as acorn from 'acorn';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_DIR = path.join(ROOT, 'prototype/v5/source');
const OUT = path.join(ROOT, 'src');
const FILES = ['b_core.js', 'c_life.js', 'd_world.js', 'g_faces.js', 'h_civic.js', 'e_ui.js', 'f_3d.js'];

// Where each top-level name goes. Anything not listed falls back to DEFAULTS by source file.
const PLACE = {
  'data/world.js': ['TPD', 'DAYS', 'SEASONS', 'LIGHT', 'FARM', 'P', 'BARN', 'JOBS', 'ESSENTIAL', 'HUES'],
  'data/folk.js': ['FOLK', 'STRANGERS', 'GIRLS', 'BOYS', 'SURNAMES', 'RUMOURS'],
  'data/ideas.js': ['TECH'],
  'data/eras.js': ['ERAS', 'ERA_LINES'],
  'data/heraldry.js': ['TINCT', 'COLOURS', 'CHARGE_BY_JOB', 'CHARGE_NAMES', 'AUG', 'DIVS', 'DIVNAME', 'VIRTUE', 'TRADEWORD'],
  'sim/setup.js': ['makeAgent', 'blankState', 'newTown', 'ensureState', 'migrate'],
  'sim/log.js': ['log'],
  'sim/social.js': ['op', 'adj', 'mem', 'glyph', 'canCourt', 'checkPair', 'worstFoe', 'avoid', 'pull',
    'encounters', 'interact', 'causeOf', 'quarrel', 'gossip', 'friendly', 'addRumour'],
  'sim/ideas.js': ['threatOf', 'pitch', 'techDay'],
  'sim/people.js': ['yr', 'freeHome', 'setHome', 'nameBaby', 'addAgent', 'birth', 'die', 'succeed', 'arrive',
    'comeOfAge', 'lifeDay', 'gatherTick'],
  'sim/seasons.js': ['seasonStart', 'weatherDay', 'stormHits', 'upkeepDay', 'spendDay', 'foodDay', 'collectDues'],
  'sim/clock.js': ['midnight', 'tick'],
  'sim/nudges.js': ['nudgeRumour', 'nudgeShort', 'nudgeStorm', 'nudgeStranger', 'nudgeFair', 'nudgePurse'],
  'save/codec.js': ['encode', 'decode', 'autosave'],
  'sim/faces.js': ['hashStr', 'lrng', 'rollFace', 'inheritFace', 'faceOf'],
  'sim/heraldry.js': ['familyKey', 'familyPlural', 'armsOf', 'blazon', 'familyCards'],
  'view/portraits.js': ['SKIN', 'HAIR', 'EYES', 'CLOTH', 'pid', 'mixHex', 'shade', 'portraitSVG', 'chargeSVG', 'armsSVG'],
  'sim/state.js': ['numberWord', 'moodOf'],
  'view/map2d.js': ['cv', 'cw', 'readColors', 'resize', 'darkness', 'doorOf', 'agentColor', 'visibleA', 'draw'],
  'view/annals.js': ['yearTitle', 'yearIntro', 'paragraphs', 'castEntry', 'snapshot', 'buildStory', 'storySpeed', 'closeStory'],
  'main.js': ['acc', 'frame', 'boot'],
};
const DEFAULTS = {
  'b_core.js': 'sim/state.js', 'c_life.js': 'sim/life.js', 'd_world.js': 'sim/state.js', 'g_faces.js': 'sim/faces.js',
  'h_civic.js': 'sim/civic.js', 'e_ui.js': 'view/ui.js', 'f_3d.js': 'view/three.js',
};
// Side-effect statements: matched by their opening text.
const STATEMENT_PLACE = [
  [/^new ResizeObserver\(resize\)/, 'view/map2d.js'],
  [/^cv\.addEventListener/, 'view/map2d.js'],
  [/^\$\('(openStory|closeStory|copyStory)'\)/, 'view/annals.js'],
  [/^document\.addEventListener\('keydown'/, 'view/annals.js'],
  [/^window\.claude/, 'main.js'],
];
// Mutable view state shared across modules moves onto one object.
const VSTATE = new Set(['sel', 'speed']);
const firstName = st => st.type === 'FunctionDeclaration' ? st.id.name : st.type === 'VariableDeclaration' ? st.declarations[0].id.name : null;

function patternNames(p, out) {
  if (!p) return;
  if (p.type === 'Identifier') out.add(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => patternNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => patternNames(e, out));
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  else if (p.type === 'RestElement') patternNames(p.argument, out);
}
function walk(node, parent, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node, fn));
    else if (v && typeof v.type === 'string') walk(v, node, fn);
  }
}
const isRef = (n, parent) => !(parent && ((parent.type === 'MemberExpression' && parent.property === n && !parent.computed) ||
  (parent.type === 'Property' && parent.key === n && !parent.computed && !parent.shorthand)));

// 1. Parse every part and record statements with their target module.
const stmts = [];
for (const f of FILES) {
  let src = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
  if (f === 'b_core.js') src = src.replace(/^<script>\n\(\(\)=>\{\n'use strict';/, '');
  if (f === 'f_3d.js') src = src.replace(/\}\)\(\);\n<\/script>\s*$/, '');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  for (const st of ast.body) {
    let mod = null;
    const nm = firstName(st);
    if (nm) for (const [m, names] of Object.entries(PLACE)) if (names.includes(nm)) mod = m;
    if (!mod && !nm) { const head = src.slice(st.start, st.start + 60); for (const [re, m] of STATEMENT_PLACE) if (re.test(head)) mod = m; }
    if (!mod) mod = DEFAULTS[f];
    stmts.push({ f, src, st, mod });
  }
}
// d_world defaults to state only for names not placed; flag any that slipped through.
for (const s of stmts) if (s.f === 'd_world.js' && s.mod === 'sim/state.js') console.warn('unplaced d_world name:', firstName(s.st));

// 2. Top-level name → module.
const owner = new Map();
for (const s of stmts) {
  if (s.st.type === 'FunctionDeclaration') owner.set(s.st.id.name, s.mod);
  if (s.st.type === 'VariableDeclaration') for (const d of s.st.declarations) if (!VSTATE.has(d.id.name)) owner.set(d.id.name, s.mod);
}

// 3. Rewrite each statement's text and gather references.
const mods = new Map();
for (const s of stmts) {
  const { src, st } = s;
  const edits = []; // [start, end, text]
  const refs = new Set(), locals = new Set();
  walk(st, null, (n, parent) => {
    if (n.type === 'VariableDeclarator') patternNames(n.id, locals);
    if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') {
      if (n.id) locals.add(n.id.name);
      n.params.forEach(p => patternNames(p, locals));
    }
    if (n.type === 'CatchClause' && n.param) patternNames(n.param, locals);
    if (n.type === 'Identifier' && isRef(n, parent)) {
      refs.add(n.name);
      if (VSTATE.has(n.name) && !(parent && parent.type === 'VariableDeclarator' && parent.id === n)) {
        if (parent && parent.type === 'Property' && parent.shorthand) { if (!edits.some(e => e[0] === parent.start)) edits.push([parent.start, parent.end, `${n.name}:V.${n.name}`]); }
        else edits.push([n.start, n.end, `V.${n.name}`]);
        refs.add('V');
      }
    }
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.left.name === 'S' && s.mod !== 'sim/state.js') {
      edits.push([n.start, n.right.start, 'setState(']);
      edits.push([n.end, n.end, ')']);
      refs.add('setState');
    }
  });
  // Top-level declarations: drop the shared view-state names, convert arrows to hoisted functions, export the rest.
  let text;
  if (st.type === 'VariableDeclaration') {
    const keep = st.declarations.filter(d => !VSTATE.has(d.id.name));
    const allArrows = keep.length && keep.every(d => d.init && d.init.type === 'ArrowFunctionExpression');
    const apply = (a, b) => { let out = '', pos = a; for (const [x, y, t] of edits.filter(e => e[0] >= a && e[1] <= b).sort((p, q) => p[0] - q[0] || p[1] - q[1])) { out += src.slice(pos, x) + t; pos = y; } return out + src.slice(pos, b); };
    if (!keep.length) text = '';
    else if (allArrows) {
      text = keep.map(d => {
        const fnode = d.init, params = fnode.params.length ? apply(fnode.params[0].start, fnode.params.at(-1).end) : '';
        const body = apply(fnode.body.start, fnode.body.end);
        return fnode.body.type === 'BlockStatement' ? `export function ${d.id.name}(${params})${body}` : `export function ${d.id.name}(${params}){return (${body});}`;
      }).join('\n');
    } else text = `export ${st.kind} ` + keep.map(d => apply(d.start, d.end)).join(', ') + ';';
    for (const d of st.declarations) locals.delete(d.id.name);
  } else {
    let out = '', pos = st.start;
    for (const [x, y, t] of edits.sort((p, q) => p[0] - q[0] || p[1] - q[1])) { out += src.slice(pos, x) + t; pos = y; }
    text = out + src.slice(pos, st.end);
    if (st.type === 'FunctionDeclaration') { text = 'export ' + text; locals.delete(st.id.name); }
  }
  if (!mods.has(s.mod)) mods.set(s.mod, { body: [], refs: new Set(), locals: new Set(), own: new Set() });
  const m = mods.get(s.mod);
  if (text) m.body.push(text);
  refs.forEach(r => m.refs.add(r)); locals.forEach(l => m.locals.add(l));
  if (st.type === 'FunctionDeclaration') m.own.add(st.id.name);
  if (st.type === 'VariableDeclaration') st.declarations.forEach(d => m.own.add(d.id.name));
}

// 4. Imports, with a report of anything that looks like shadowing or sim→view coupling.
if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.error('src/ exists; pass --force to overwrite'); process.exit(1); }
const rel = (from, to) => { let r = path.relative(path.dirname(from), to); if (!r.startsWith('.')) r = './' + r; return r; };
const report = [];
for (const [mod, m] of mods) {
  const imports = new Map();
  const needV = m.refs.has('V');
  for (const r of m.refs) {
    if (m.own.has(r)) continue;
    const o = r === 'setState' ? 'sim/state.js' : owner.get(r);
    if (!o || o === mod) continue;
    if (m.locals.has(r)) { report.push(`shadow? ${mod} declares a local '${r}' that is also top-level in ${o} — import skipped`); continue; }
    if (mod.startsWith('sim/') && (o.startsWith('view/') || o === 'main.js' || o.startsWith('save/'))) report.push(`coupling: ${mod} uses ${r} from ${o}`);
    if (!imports.has(o)) imports.set(o, new Set());
    imports.get(o).add(r);
  }
  if (needV) imports.set('view/vstate.js', new Set(['V']));
  const head = [...imports].sort().map(([o, names]) => `import { ${[...names].sort().join(', ')} } from '${rel(mod, o)}';`).join('\n');
  const file = path.join(OUT, mod);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `// Ported from the v5 prototype by tools/port-v5.mjs.\n${head}\n\n${m.body.join('\n')}\n`);
}
// Hand fixups: the simulation reaches the view only through sim/hooks.js.
const FIXUPS = {
  'sim/nudges.js': [
    ["import { buildRoster, render } from '../view/ui.js';", "import { hooks } from './hooks.js';"],
    ["export function nudgeRumour(){\n  const id=+document.getElementById('rumourSubject').value,subj=S.agents[id];", "export function nudgeRumour(id){\n  const subj=S.agents[id];"],
    [/buildRoster\(\);render\(true\);/g, 'hooks.changed();'],
    [/render\(true\);/g, 'hooks.changed();'],
  ],
  'sim/clock.js': [
    ["import { autosave } from '../save/codec.js';", "import { hooks } from './hooks.js';"],
    ['if(S.tick%36===0)autosave();', 'if(S.tick%36===0)hooks.autosave();'],
  ],
  'view/ui.js': [["$('nRumour').onclick=nudgeRumour;", "$('nRumour').onclick=()=>nudgeRumour(+$('rumourSubject').value);"]],
  'main.js': [
    ["import { tick } from './sim/clock.js';", "import { tick } from './sim/clock.js';\nimport { hooks } from './sim/hooks.js';\nimport { autosave } from './save/codec.js';\nimport './view/annals.js'; // wires the annals buttons; nothing else imports it"],
    ['export function boot(data){\n', 'export function boot(data){\n  hooks.changed=()=>render(true);\n  hooks.autosave=autosave;\n'],
  ],
};
for (const [mod, list] of Object.entries(FIXUPS)) {
  const file = path.join(OUT, mod); let t = fs.readFileSync(file, 'utf8');
  for (const [a, b] of list) { if (typeof a === 'string' ? !t.includes(a) : !a.test(t)) throw new Error(`fixup not found in ${mod}: ${a}`); t = t.replace(a, b); }
  fs.writeFileSync(file, t);
}
fs.writeFileSync(path.join(OUT, 'sim/hooks.js'), `// The simulation never calls the view directly. The game loop (main.js) fills these in;
// in the headless harness they stay as no-ops.
export const hooks = {
  changed() {},   // state changed outside a tick (a nudge); the view should redraw
  autosave() {},  // a good moment to save (every 36 ticks)
};
`);
// setState for modules that replace the whole game state.
const statePath = path.join(OUT, 'sim/state.js');
fs.appendFileSync(statePath, '\nexport function setState(v){S=v;return v;}\n');
fs.writeFileSync(path.join(OUT, 'view/vstate.js'), '// View state shared by the UI, 3D view, annals and game loop.\nexport const V = { sel: -1, speed: 1 };\n');
console.log(report.join('\n') || 'no issues');
console.log([...mods.keys()].sort().map(k => `${k}: ${mods.get(k).body.length} statements`).join('\n'));
