// Lists every ${…} inside a template literal that builds HTML (its text has a tag) and is not wrapped in esc(…) or T(…),
// so a reviewer reads only the interpolations that could carry data into the page unescaped.
// Usage: node .claude/skills/mc-security-review/scripts/unescaped.cjs js/*.js dt/*.js [--names]
//   --names: only the ones that look like text from data (name, note, title, file, email, …), the place to start
// It is a reading aid, not a verdict: numbers, booleans, the tool's own constants and helpers that return escaped HTML show
// up too; a hit is a place to read, and a miss is not proof (HTML built with + or across functions is not followed).
const fs = require('node:fs');
const args = process.argv.slice(2), names = args.includes('--names'), files = args.filter(a => a !== '--names');
const SAFE = /^(esc|T)\(|^\d+$/;
const DATA = /name|nm\b|who|spv|sup\b|note|text|comment|title|file|sheet|reason|label|msg|mail|desc|subj|code|why|what|hint|query|word|raw|cell|by\b|user|addr/i;
let total = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'), n = src.length, lineAt = p => src.slice(0, p).split('\n').length;
  const modes = ['code'], braces = [0], open = [], done = [];
  let i = 0, prev = '';
  while (i < n) {
    const c = src[i];
    if (modes[modes.length - 1] === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { modes.pop(); const t = open.pop(); t.end = i; done.push(t); i++; prev = 'x'; continue; }
      if (c === '$' && src[i + 1] === '{') { modes.push('code'); braces.push(0); open[open.length - 1].exprs.push({ start: i + 2 }); i += 2; prev = '{'; continue; }
      i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } i = j + 1; prev = 'x'; continue; }
    if (c === '/' && (!prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {   // a regular expression literal
      let j = i + 1, cls = false; while (j < n && src[j] !== '\n') { const d = src[j]; if (d === '\\') { j += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; j++; }
      if (src[j] === '/') { j++; while (/[a-z]/i.test(src[j])) j++; i = j; prev = 'x'; continue; }
    }
    if (c === '`') { modes.push('tpl'); open.push({ start: i, exprs: [] }); i++; continue; }
    if (c === '{') braces[braces.length - 1]++;
    if (c === '}') {
      if (braces[braces.length - 1] === 0 && modes.length > 1) { modes.pop(); braces.pop(); const t = open[open.length - 1]; t.exprs[t.exprs.length - 1].end = i; i++; continue; }
      braces[braces.length - 1]--;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  for (const t of done) {
    let text = '', p = t.start + 1;
    for (const e of t.exprs) { text += src.slice(p, e.start - 2); p = (e.end ?? e.start) + 1; }
    text += src.slice(p, t.end);
    if (!/<[a-z!/]/i.test(text)) continue;
    for (const e of t.exprs) {
      const ex = src.slice(e.start, e.end).trim().replace(/\s+/g, ' ');
      if (SAFE.test(ex) || ex.startsWith('`') || (names && !DATA.test(ex))) continue;
      total++; console.log(`${f}:${lineAt(e.start)}: ${ex.slice(0, 160)}`);
    }
  }
}
console.error(`${total} interpolation(s) to read`);
