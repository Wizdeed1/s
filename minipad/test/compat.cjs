// Checks that the browser code only uses what Safari 12 (iOS 12.5) supports:
// ES2017 syntax, no newer web APIs, no flex `gap`, and only emoji that iOS 12 can draw.
// Run: node minipad/test/compat.cjs   (needs `npm i --no-save acorn` once)
const fs = require('fs');
const path = require('path');

let acorn;
try { acorn = require('acorn'); } catch (e) {
  const alt = process.env.ACORN_PATH;
  acorn = alt ? require(alt) : null;
}
if (!acorn) { console.error('acorn is missing: npm i --no-save acorn (or set ACORN_PATH)'); process.exit(2); }

const ROOT = path.join(__dirname, '..');
const browserJs = ['js/core.js', 'sw.js', 'vendor/NoSleep.min.js']
  .concat(fs.readdirSync(path.join(ROOT, 'apps')).filter((f) => f.endsWith('.js')).map((f) => 'apps/' + f));
const problems = [];

// 1. Syntax: must parse as ES2017.
for (const f of browserJs) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try { acorn.parse(src, { ecmaVersion: 2017, sourceType: 'script' }); } catch (e) { problems.push(`${f}: not ES2017 (${e.message})`); }
}

// 2. Web APIs and built-ins that Safari 12 lacks (our own code only; the vendored file is checked for syntax above).
const BANNED = [
  [/\?\./, 'optional chaining'], [/\?\?/, 'nullish coalescing'], [/\.replaceAll\(/, 'String.replaceAll'],
  [/Object\.fromEntries/, 'Object.fromEntries'], [/Promise\.(allSettled|any)\b/, 'Promise.allSettled/any'],
  [/\bglobalThis\b/, 'globalThis'], [/\bResizeObserver\b/, 'ResizeObserver'], [/\bstructuredClone\b/, 'structuredClone'],
  [/navigator\.clipboard/, 'navigator.clipboard'], [/\bpointer(down|up|move)\b|PointerEvent/, 'pointer events'],
  [/\.showModal\(/, '<dialog>'], [/Intl\.(RelativeTimeFormat|DisplayNames|ListFormat)/, 'newer Intl APIs'],
  [/\.matchAll\(/, 'String.matchAll'], [/\bqueueMicrotask\b/, 'queueMicrotask'], [/\.flatMap\(|\.flat\(/, 'Array.flat'],
  [/\bAbortController\b/, 'AbortController (iOS 12.2+ only)'], [/\bnew\s+AudioContext\b/, 'unprefixed AudioContext'],
  [/createStereoPanner/, 'StereoPanner'], [/\.copyToChannel\(/, 'copyToChannel'], [/\bwakeLock\b/, 'Wake Lock API'],
  [/\.at\(-?\d/, 'Array.at'], [/\.toSorted\(|\.findLast\(/, 'newer array methods'], [/\bdateStyle\b|\btimeStyle\b/, 'Intl dateStyle']
];
for (const f of browserJs.filter((x) => !x.startsWith('vendor/'))) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const [re, what] of BANNED) if (re.test(src)) problems.push(`${f}: uses ${what}`);
}

// 3. CSS: flex `gap`, aspect-ratio, inset, :is/:where, clamp(), dvh, color-mix are not in Safari 12.
const css = fs.readFileSync(path.join(ROOT, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
css.split('}').forEach((rule) => {
  if (/(^|[;{\s])gap\s*:/.test(rule) && !/grid/.test(rule)) problems.push('css: `gap` outside a grid rule: ' + rule.trim().slice(0, 80));
});
[[/aspect-ratio\s*:/, 'aspect-ratio'], [/(^|[;{\s])inset\s*:/, 'inset'], [/:is\(|:where\(/, ':is/:where'], [/clamp\(/, 'clamp()'],
  [/\d+dvh/, 'dvh units'], [/color-mix\(/, 'color-mix()'], [/prefers-color-scheme/, 'prefers-color-scheme (iOS 13+)']]
  .forEach(([re, what]) => { if (re.test(css)) problems.push('css: uses ' + what); });

// 4. Emoji added after Emoji 11 (iOS 12.1) show as empty boxes on this iPad.
const NEW_EMOJI = [[0x1FA70, 0x1FAFF], [0x1F7E0, 0x1F7EB], [0x1F90C, 0x1F90F], [0x1F93F, 0x1F93F], [0x1F971, 0x1F972],
  [0x1F977, 0x1F979], [0x1F97B, 0x1F97B], [0x1F9A3, 0x1F9AF], [0x1F9BA, 0x1F9BF], [0x1F9C3, 0x1F9CB], [0x1F9CD, 0x1F9CF],
  [0x1F6D5, 0x1F6D7], [0x1F6DD, 0x1F6DF], [0x1F6FA, 0x1F6FC], [0x1F7F0, 0x1F7F0]];
for (const f of browserJs.filter((x) => !x.startsWith('vendor/')).concat(['index.html'])) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const ch of src) {
    const cp = ch.codePointAt(0);
    if (NEW_EMOJI.some(([a, b]) => cp >= a && cp <= b)) problems.push(`${f}: emoji U+${cp.toString(16).toUpperCase()} is too new for iOS 12`);
  }
}

// 5. Every app in the catalogue has a file, and the offline list covers every file.
const core = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
const ids = [...core.matchAll(/\{ id: '([a-z]+)', title:/g)].map((m) => m[1]).filter((id) => !['home', 'learn', 'play', 'tools', 'help'].includes(id));
for (const id of ids) if (!fs.existsSync(path.join(ROOT, 'apps', id + '.js'))) problems.push(`apps/${id}.js is missing`);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
for (const id of ids) if (!sw.includes(`'apps/${id}.js'`)) problems.push(`sw.js does not cache apps/${id}.js (run: node test/stamp.cjs)`);

if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
console.log(`ok: ${browserJs.length} scripts are ES2017, no Safari-12-incompatible APIs, CSS or emoji; ${ids.length} apps present and cached`);
