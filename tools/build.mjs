// Builds dist/ashwood-fold.html: one self-contained page with the bundle and styles inlined.
// Three.js r128 stays a CDN script tag in index.html (the artifact host allows cdnjs).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const minify = process.argv.includes('--minify');

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify,
  write: false,
  logLevel: 'warning',
});
const js = result.outputFiles[0].text;
if (/<\/script/i.test(js)) throw new Error('bundle contains a closing script tag');
if (/window\.__(ash|v5)\b/.test(js)) throw new Error('bundle contains a test hook');
const css = fs.readFileSync(path.join(ROOT, 'src/view/styles.css'), 'utf8');
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const html = shell
  .replace('<!-- STYLES -->', () => `<style>\n${css}</style>`)
  .replace('<!-- SCRIPT -->', () => `<script>\n${js}</script>`);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist/ashwood-fold.html');
fs.writeFileSync(out, html);
console.log(`dist/ashwood-fold.html  ${(html.length / 1024).toFixed(1)} KB${minify ? ' (minified)' : ''}`);
