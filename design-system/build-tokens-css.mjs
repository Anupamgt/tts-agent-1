// Builds design-system/tokens.css from design-system/tokens.json (no dependencies).
// Run after changing tokens: node design-system/build-tokens-css.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8'));
const first = t.color.themes[0].id;
const val = (v, theme) => (typeof v === 'string' ? v : v[theme] ?? v[first]);
const ref = (v) => v.replace(/^\{(.+)\}$/, 'var(--$1)');

let css = `/* ${t.name} — generated from tokens.json */\n`;
for (const f of t.type.fonts) {
  css += `@font-face { font-family: "${f.family}"; src: url("${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style || 'normal'}; font-display: swap; }\n`;
}
t.color.themes.forEach((th, i) => {
  css += `${i === 0 ? ':root, ' : ''}[data-theme="${th.id}"] {\n`;
  for (const c of t.color.tokens) css += `  --${c.name}: ${ref(val(c.value, th.id))};\n`;
  for (const s of t.shadow?.tokens ?? []) css += `  --${s.name}: ${val(s.value, th.id)};\n`;
  css += '}\n';
});
css += ':root {\n';
for (const fam of ['spacing', 'radius', 'size']) for (const x of t[fam]?.tokens ?? []) css += `  --${x.name}: ${x.value};\n`;
for (const [k, v] of Object.entries(t.type.families)) css += `  --font-${k}: ${v};\n`;
css += '}\n';
for (const g of t.type.groups) {
  for (const s of g.styles) {
    const fam = s.family || g.family;
    css += `.${s.name} { font-family: var(--font-${fam}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing !== undefined ? ` letter-spacing: ${s.letterSpacing};` : ''} }\n`;
  }
}
fs.writeFileSync(path.join(dir, 'tokens.css'), css);
console.log('wrote tokens.css');
