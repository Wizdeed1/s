// The technical deck, for the Technology Operations and Cybersecurity teams: how Cadence is built and how it keeps pay data safe,
// in the overview deck's look (look.cjs: the Showcase in Present). Every fact is the code's and the October 2026 security review's
// (README, .claude/skills/mc-security-review): the stack, the architecture, the data and where it is, access, the key hierarchy,
// the no-network rule, the review's nine areas, the automated checks, how it is run, and what stays open with what would close it.
// Speaker notes on every slide. Tables and diagrams are PowerPoint's own shapes and text, so the team can edit them.
// Usage: node tools/deck/make_tech.cjs artDir out.pptx   (artDir: what showcase_shots.cjs made; needs pptxgenjs: npm i pptxgenjs)
const Pptx = require('pptxgenjs');
const [artDir, outFile] = process.argv.slice(2);
const { pres, C, X0, X1, CW, FONT, LIGHT, T, runs, eyebrow, lead, card, pic, pill, add, slides, write } = require('./look.cjs')(Pptx,
  { art: artDir, title: 'Cadence: technical overview', subject: 'Cadence: architecture, data, access, encryption and security checks' });

// ---- pieces of this deck
/** a title in the Showcase's way, from a string: '**' around the words in bold, '\n' where a new line starts */
const parts = str => str.split('\n').map(line => line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(p => ({ t: p.replace(/\*\*/g, ''), b: /^\*\*/.test(p) })));
const ttl = (s, str) => s.addText(runs(parts(str)), { placeholder: 'title' });
const below = str => 1.06 + str.split('\n').length * 0.47 + 0.18;   // the lead's place under a title of one or two lines
/** the label, the title and the lead; returns where the content may start */
function head(s, eb, t, ld, o = {}) {
  eyebrow(s, eb); ttl(s, t);
  if (!ld) return below(t) + 0.05;
  lead(s, ld, { y: below(t), w: o.w ?? 10.6, h: 0.5, size: 12.5 });
  return below(t) + 0.62;
}
/** a bulleted list */
function list(s, items, o) {
  T(s, items.map((t, i) => ({ text: t, options: { bullet: { indent: 11 }, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 5 } })),
    { x: o.x, y: o.y, w: o.w, h: o.h, fontSize: o.size ?? 11, color: o.color ?? C.ink2, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${o.t ?? 400}|list` });
}
/** a card with a heading and a list */
function panel(s, x, y, w, h, title, items, o = {}) {
  const d = o.t ?? 300;
  card(s, x, y, w, h, { t: d, fill: o.fill });
  T(s, title, { x: x + 0.26, y: y + 0.2, w: w - 0.52, h: 0.34, fontSize: o.hs ?? 13, bold: true, color: o.hc ?? C.ink, objectName: `up|${d}|h` });
  list(s, items, { x: x + 0.26, y: y + 0.64, w: w - 0.52, h: h - 0.8, size: o.size ?? 10.5, t: d + 60, gap: o.gap });
}
/** a number with what it counts */
function stat(s, x, y, w, h, big, label, sub, o = {}) {
  const d = o.t ?? 300;
  card(s, x, y, w, h, { t: d, fill: o.fill });
  T(s, big, { x: x + 0.26, y: y + 0.16, w: w - 0.52, h: 0.8, fontSize: o.bs ?? 36, bold: true, color: o.bc ?? C.ink, objectName: `up|${d}|n` });
  T(s, label, { x: x + 0.26, y: y + 0.98, w: w - 0.52, h: 0.32, fontSize: 12.5, bold: true, color: C.ink, objectName: `up|${d}|l` });
  T(s, sub, { x: x + 0.26, y: y + 1.32, w: w - 0.52, h: h - 1.42, fontSize: 10, color: C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${d}|s` });
}
/** a number beside what it counts, for a short tile */
function statRow(s, x, y, w, h, big, label, sub, o = {}) {
  const d = o.t ?? 300, nw = o.nw ?? 1.35;
  card(s, x, y, w, h, { t: d, fill: o.fill });
  T(s, big, { x: x + 0.22, y, w: nw, h, fontSize: o.bs ?? 30, bold: true, color: o.bc ?? C.ink, valign: 'middle', objectName: `up|${d}|n` });
  T(s, [{ text: label, options: { bold: true, color: C.ink, fontSize: 12.5, breakLine: true } }, { text: sub, options: { color: C.muted, fontSize: 10 } }],
    { x: x + 0.22 + nw, y, w: w - nw - 0.44, h, valign: 'middle', lineSpacingMultiple: 1.05, objectName: `up|${d}|l` });
}
/** an arrow between two points */
function arrow(s, x1, y1, x2, y2, d = 500) {
  const o = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), line: { color: C.faint, width: 1.5, endArrowType: 'triangle' }, objectName: `fade|${d}|arrow` };
  if (x2 < x1) o.flipH = true; if (y2 < y1) o.flipV = true;
  s.addShape(pres.shapes.LINE, o);
}
/** a small round label: a step's number */
function dot(s, x, y, n, d, fill = C.blue) {
  s.addShape(pres.shapes.OVAL, { x, y, w: 0.42, h: 0.42, fill: { color: fill }, line: { type: 'none' }, objectName: `up|${d}|dot` });
  T(s, String(n), { x, y, w: 0.42, h: 0.42, fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|dotn` });
}
/** a table in the deck's look: a light header, hairlines, Poppins */
function table(s, rows, o) {
  const hdr = rows[0].map(t => ({ text: t, options: { bold: true, color: C.ink, fill: { color: 'F2F5FA' }, fontSize: o.hs ?? 10 } }));
  const body = rows.slice(1).map((r, i) => r.map((c, j) => (typeof c === 'object' ? c : { text: c, options: { bold: j === 0, color: j === 0 ? C.ink : C.ink2, ...(o.fills && o.fills[i] ? { fill: { color: o.fills[i] } } : {}) } })));
  s.addTable([hdr, ...body], { x: o.x ?? X0, y: o.y, w: o.w ?? CW, colW: o.colW, fontFace: FONT, fontSize: o.size ?? 10, color: C.ink2, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line }, fill: { color: C.white }, margin: [3, 6, 3, 6], rowH: o.rowH, autoPage: false });
}
const sec = (name, notes) => ({ name, notes });

// =============================================================================================== 1. one file, no server, no network
{
  const s = add('HERO', sec('Cadence: technical overview', 'Cadence is the Member Care WFM team\'s tool for the monthly incentive, attendance and deductions. This deck is for the technical teams: how it is built, where the data is, who can see what, how it is encrypted, and the checks behind it. In one line: one HTML file in a shared folder, no server, and the browser refuses every web address, so no data can leave.'));
  pic(s, 'sc-logo', { x: X0, y: 0.95, h: 0.46 }, 'fade|0|logo', 'Beyond One');
  eyebrow(s, 'Cadence · technical overview', 1.66);
  ttl(s, 'One file,\nno server,\n**no network.**');
  lead(s, 'How Cadence is built and how it keeps pay data safe: architecture, data, access, encryption and the checks behind them.', { y: 4.05, w: 6.1, h: 0.8, t: 300, size: 13 });
  let x = X0; ['HTML · CSS · JavaScript', 'Works offline', 'AES-256-GCM', '31 security checks'].forEach((t, i) => { x += pill(s, t, x, 5.1, { t: 450 + i * 80, ...(i ? {} : { fill: C.bsoft, color: C.btext }) }) + 0.12; });
  pic(s, 'sc-fig-vault', { x: 7.7, y: 1.35, w: 4.6 }, 'up|350|fig', '');
}

// =============================================================================================== 2. at a glance
{
  const s = add('SHOW', sec('At a glance', 'Six numbers. One file, about 4.4 MB, that opens in Edge or Chrome. No server: the shared folder is the only place the data is. No web requests: the browser refuses every address. Seven roles, each with its own pages. A hundred people tested working at once on one folder. And 31 automated security checks, with 43 browser test suites, before every release.'));
  const y0 = head(s, 'At a glance', 'Cadence, **in six numbers.**');
  const w = (CW - 0.44) / 3, h = 2.0;
  [['1', 'file', 'Cadence.html, about 4.4 MB, opens in Microsoft Edge or Google Chrome and works offline.'],
   ['0', 'servers', 'No database service and no outside API: the shared MC Data folder is the only store.'],
   ['0', 'web requests', 'The browser is told to refuse every web address, so the page cannot send data anywhere.'],
   ['7', 'roles', 'Admin, WFM analyst, WFM manager, senior manager, supervisor, quality team, agent: each sees only its pages.'],
   ['100', 'people at once', 'Tested on one shared folder: every change reached everyone else, none was lost, no errors.'],
   ['31', 'security checks', 'Automated, before every release, with 43 browser test suites on made-up data.']].forEach(([n, l, t], i) =>
    stat(s, X0 + (i % 3) * (w + 0.22), y0 + 0.1 + Math.floor(i / 3) * (h + 0.22), w, h, n, l, t, { t: 300 + i * 90, ...(i === 5 ? { fill: C.bsoft, bc: C.btext } : {}) }));
}

// =============================================================================================== 3. architecture
{
  const s = add('SHOW', sec('Architecture', 'Everything runs in the browser of the person using it. Cadence.html sits in the team\'s common folder; next to it, the MC Data folder holds the data, one encrypted file per record. The browser reads and writes those files through the File System Access API. Each save also drops a small marker in _changes, so everyone who has the tool open picks the change up within seconds. There is no server, no database service and no outside API, and the browser refuses every web address.'));
  const y0 = head(s, 'Architecture', 'Everything runs in the browser.\n**The data stays in one folder.**');
  const top = y0 + 0.15, h = 2.6;
  panel(s, X0, top, 2.95, h, 'People', ['Each signs in with their own account', 'Microsoft Edge or Google Chrome, on their own computer', 'Seven roles, each with its own pages'], { t: 300 });
  panel(s, 4.55, top, 4.25, h, 'Cadence.html', ['One file in the common folder, read-only for all but its owner', 'Inside: the pages, the counting engine, the Excel, CSV and Outlook readers and writers', 'Web Crypto encrypts and decrypts in the browser'], { t: 450, fill: C.bsoft, hc: C.btext });
  panel(s, 9.65, top, 2.88, h, 'MC Data folder', ['One encrypted file per record', 'Accounts: nothing secret in clear', '_changes: a marker per save', 'Saved uploads and workbooks'], { t: 600 });
  arrow(s, X0 + 2.95 + 0.08, top + h / 2, 4.55 - 0.08, top + h / 2, 550);
  arrow(s, 8.8 + 0.08, top + h / 2 - 0.18, 9.65 - 0.08, top + h / 2 - 0.18, 700);
  arrow(s, 9.65 - 0.08, top + h / 2 + 0.18, 8.8 + 0.08, top + h / 2 + 0.18, 750);
  T(s, 'opens', { x: X0 + 2.95, y: top + h / 2 - 0.36, w: 1.6, h: 0.24, fontSize: 8.5, color: C.muted, align: 'center', objectName: 'fade|600|a1' });
  T(s, 'reads and writes', { x: 8.7, y: top + h / 2 - 0.62, w: 1.05, h: 0.4, fontSize: 8, color: C.muted, align: 'center', objectName: 'fade|750|a2' });
  const by = top + h + 0.3;
  card(s, X0, by, CW, 0.62, { t: 850, fill: 'F7F9FC' });
  T(s, [{ text: 'No server, no database service, no outside API.  ', options: { bold: true, color: C.ink } }, { text: 'A save reaches everyone who has the tool open within seconds, through the _changes markers in the folder.', options: { color: C.muted } }],
    { x: X0 + 0.26, y: by, w: CW - 0.52, h: 0.62, fontSize: 11, valign: 'middle', objectName: 'up|900|note' });
}

// =============================================================================================== 4. technology
{
  const s = add('SHOW', sec('Technology', 'It is written in HTML, CSS and JavaScript, not Java, with no framework. Everything it needs is a standard part of the browser: Web Crypto for the encryption, the File System Access API for the shared folder, IndexedDB to remember which folder, and Compression Streams. Inside the file are its own readers for Excel, CSV and Outlook files, its own Excel writer and its Outlook drafts. Two small libraries are carried inside the file and pinned by their SHA-256. Python and Node scripts only assemble the file; Playwright tests and GitHub Actions check it; none of that ships.'));
  const y0 = head(s, 'Technology', 'Web standards only, **nothing to install.**');
  const w = (CW - 0.44) / 3, h = 6.55 - y0 - 0.1;
  panel(s, X0, y0 + 0.1, w, h, 'In the browser', ['HTML, CSS and JavaScript: no framework, not Java', 'Web Crypto API: AES-GCM, RSA-OAEP, PBKDF2', 'File System Access API: the shared folder', 'IndexedDB: remembers which folder', 'Compression Streams: gzip before encryption'], { t: 300, size: 12, gap: 8 });
  panel(s, X0 + w + 0.22, y0 + 0.1, w, h, 'Inside the file', ['Its own readers: Excel (.xlsx, .xlsb, .xls), CSV, Outlook (.msg, .eml)', 'Its own Excel writer and Outlook drafts (.eml)', 'Charts and cards drawn on canvas', 'Two small libraries (animation, line drawings), pinned by SHA-256', 'Its fonts, embedded'], { t: 420, size: 12, gap: 8 });
  panel(s, X0 + 2 * (w + 0.22), y0 + 0.1, w, h, 'Build and test (not shipped)', ['Python and Node.js scripts assemble the one file', 'Playwright with Chromium: 43 browser test suites', 'Node unit tests', 'GitHub Actions on every push, with a read-only token', 'Nothing installed from npm at run time'], { t: 540, size: 12, gap: 8 });
}

// =============================================================================================== 5. data and storage
{
  const s = add('SHOW', sec('Data and storage', 'What Cadence keeps, and how each part is protected. Accounts are the only plain files, and they hold nothing secret in clear: a scrambled password and locked keys. The roster with names and National IDs, attendance, the figures, results and deductions are records encrypted with AES-256-GCM under the team\'s data key; each agent\'s own copy of their results is under that agent\'s own key. The files dropped to build a month are kept locked as they were dropped. Workbooks are kept locked in the tool; a plain copy in MC Reports is made only when someone chooses it, and it is off by default.'));
  const y0 = head(s, 'Data', 'What it keeps, **and how it is locked.**');
  table(s, [
    ['Data', 'Where', 'Protection'],
    ['Accounts', 'MC Data › accounts: name, username, scrambled password, locked keys', 'Plain files with nothing secret in clear; a file cannot give itself access'],
    ['Roster', 'A record per person: names, National IDs, teams', 'AES-256-GCM, the team\'s data key'],
    ['Attendance, figures, KPIs', 'Monthly records: attendance, Genesys and quality figures', 'AES-256-GCM, the team\'s data key'],
    ['Results and deductions', 'Monthly records; each agent\'s own copy for their page', 'The team\'s data key; the agent\'s copy under the agent\'s own key'],
    ['Files dropped in', 'Saved uploads: Genesys exports, supervisors\' sheets, as dropped', 'AES-256-GCM, kept as they were dropped'],
    ['Workbooks made', 'Saved workbooks; a plain copy in MC Reports only when chosen', 'Locked; the plain copy (off by default) relies on the folder\'s permissions'],
  ], { y: y0 + 0.1, colW: [2.35, 4.9, 4.48], rowH: 0.56, size: 10.5, hs: 10.5 });
}

// =============================================================================================== 6. data flow
{
  const s = add('SHOW', sec('Data flow', 'In from files, out as drafts. The team drops the month\'s files: the Genesys exports, the supervisors\' attendance sheets, the quality EVAL and the KPI file, each kept as a locked file. The tool matches every row to a person by National ID, then by name, and shows any clash to decide. The engine counts every KPI with the month\'s rules. The senior manager reviews and finalizes, and a final month is frozen. What comes out are Excel workbooks, Outlook drafts and pictures for Teams, which people send themselves: Cadence never sends anything.'));
  const y0 = head(s, 'Data flow', 'In from files, **out as drafts.**');
  const n = 5, gap = 0.3, w = (CW - (n - 1) * gap) / n, h = 3.35, top = y0 + 0.25;
  [['Import', 'Genesys exports, supervisors\' sheets, the quality EVAL and the KPI file, each kept as a locked file'],
   ['Check', 'Every row matched to a person by National ID, then by name; a clash is shown to decide'],
   ['Count', 'The engine ranks, weights and gates every KPI with the month\'s rules'],
   ['Review', 'The senior manager reviews and finalizes; a final month is frozen'],
   ['Out', 'Excel workbooks, Outlook drafts and pictures for Teams: people send them, Cadence sends nothing']].forEach(([h1, t], i) => {
    const x = X0 + i * (w + gap), d = 300 + i * 130;
    card(s, x, top, w, h, { t: d, ...(i === 4 ? { fill: C.bsoft } : {}) });
    dot(s, x + 0.24, top + 0.24, i + 1, d, i === 4 ? C.btext : C.blue);
    T(s, h1, { x: x + 0.24, y: top + 0.82, w: w - 0.48, h: 0.34, fontSize: 14, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.24, y: top + 1.22, w: w - 0.48, h: h - 1.36, fontSize: 10.5, color: C.muted, valign: 'top', lineSpacingMultiple: 1.06, objectName: `up|${d}|t` });
    if (i < n - 1) arrow(s, x + w + 0.04, top + h / 2, x + w + gap - 0.04, top + h / 2, d + 100);
  });
  T(s, 'Every step is local: the files are read in the browser, and what is kept is written to the shared folder, encrypted.', { x: X0, y: top + h + 0.25, w: CW, h: 0.35, fontSize: 11, color: C.muted, objectName: 'up|1000|note' });
}

// =============================================================================================== 7. access
{
  const s = add('SHOW', sec('Access', 'Everyone signs in with their own account. A new account waits until an admin gives it a role, and the keys follow the role. Each role sees only its pages: a supervisor only their own team, an agent only their own page. Passwords need at least 8 characters, with a strength meter; the tool locks after 15 minutes without activity, and each person can choose 5 to 60. The admin can preview any role, read-only, with National IDs hidden. Results, rules and roles keep who changed them and when. One thing to be clear about: the roles decide pages; under the hood all staff share the team\'s data key, and only agents have keys of their own.'));
  const y0 = head(s, 'Access', 'Everyone signs in.\n**Each role sees its own part.**');
  table(s, [
    ['Role', 'Sees'],
    ['Admin', 'Every page; accounts and roles'],
    ['WFM analyst', 'Builds the month: import, checks, workbook'],
    ['WFM manager', 'The emails and the analytics'],
    ['Senior manager', 'The month\'s close, the results, the final'],
    ['Supervisor', 'Their own team only'],
    ['Quality team', 'The quality scores'],
    ['Agent', 'Their own page only'],
  ], { x: X0, y: y0 + 0.08, w: 5.5, colW: [1.75, 3.75], rowH: 0.43, size: 10.5, hs: 10.5 });
  panel(s, 6.55, y0 + 0.08, X1 - 6.55, 6.6 - y0 - 0.14, 'How access works', [
    'A new account waits until an admin gives it a role; the keys follow the role',
    'Passwords: at least 8 characters, with a strength meter',
    'Locks after 15 minutes idle (5 to 60, each person\'s choice)',
    'View as: the admin previews any role, read-only, National IDs hidden',
    'Results, rules and roles keep who changed them and when',
    'Roles decide pages; all staff share the team\'s data key, and agents have keys of their own',
  ], { t: 500, size: 12, gap: 9 });
}

// =============================================================================================== 8. encryption
{
  const s = add('SHOW', sec('Encryption', 'All of it is the browser\'s own Web Crypto. A password goes through PBKDF2-SHA256, 600,000 rounds with a 16-byte salt, OWASP\'s figure. Half of what comes out checks the password; the other half is a key that unlocks the account\'s RSA-OAEP 2048 private key, which is stored locked with AES-GCM. That private key unwraps the team\'s data key, a 256-bit AES key, and an agent\'s own key for an agent. Every record is gzipped, then sealed with AES-256-GCM, a new 12-byte IV each time, and bound to its own path, so a file moved to another name will not open. Backups are locked the same way with their own password.'));
  const y0 = head(s, 'Encryption', 'Browser cryptography, **no key in clear.**');
  const x = X0, w = 6.9, bh = 0.74, g = 0.3;
  [['Password', 'Never stored: only what PBKDF2 makes of it'],
   ['PBKDF2-SHA256 · 600,000 rounds · 16-byte salt', '512 bits: 256 check the password, 256 unlock the account\'s key'],
   ['The account\'s RSA-OAEP 2048 key pair', 'The private key is stored locked with AES-GCM'],
   ['The team\'s data key: AES-256', 'Wrapped for each account with its RSA-OAEP public key; an agent\'s own key the same way'],
   ['Every record: AES-256-GCM', 'gzip first, a new 12-byte IV each save, bound to the record\'s path']].forEach(([a, b], i) => {
    const y = y0 + 0.08 + i * (bh + g), d = 300 + i * 140, last = i === 4;
    card(s, x, y, w, bh, { t: d, ...(last ? { fill: C.bsoft } : {}) });
    T(s, a, { x: x + 0.24, y: y + 0.07, w: w - 0.48, h: 0.32, fontSize: 12, bold: true, color: last ? C.btext : C.ink, objectName: `up|${d}|a` });
    T(s, b, { x: x + 0.24, y: y + 0.38, w: w - 0.48, h: 0.3, fontSize: 10, color: C.muted, objectName: `up|${d}|b` });
    if (i < 4) arrow(s, x + 0.5, y + bh + 0.03, x + 0.5, y + bh + g - 0.03, d + 70);
  });
  const rx = 8.0, rw = X1 - rx;
  panel(s, rx, y0 + 0.08, rw, 2.25, 'Backups', ['A .mcbak file locked with its own password: PBKDF2-SHA256, 600,000 rounds', 'A made-up round count is refused', 'A backup cannot replace accounts or keys'], { t: 900, size: 10.5 });
  panel(s, rx, y0 + 2.55, rw, 2.0, 'Accounts and sessions', ['Locks after 15 minutes without activity', 'An admin can turn an account off at once', 'A reset password must be changed at the next sign-in'], { t: 1000, size: 10.5 });
}

// =============================================================================================== 9. network isolation
{
  const s = add('SHOW', sec('Network isolation', 'When the file is opened, its very first script tells the browser this content security policy. It allows only what is inside the file: inline code, data and blob addresses. So a request to any web address is refused by the browser itself: a fetch, a socket, an image, a script, a form. Nothing is loaded from the web either: no telemetry, no CDN, no web fonts. A test tries a fetch and an image and checks both are refused, and opens every page as every role to check the tool itself never trips the rule.'));
  const y0 = head(s, 'Network', 'No data can leave,\n**by the browser\'s own rule.**');
  card(s, X0, y0 + 0.08, 7.6, 1.32, { t: 300, fill: '0F172A' });
  T(s, 'Content-Security-Policy', { x: X0 + 0.26, y: y0 + 0.2, w: 7.1, h: 0.28, fontSize: 9, bold: true, color: '93C5FD', charSpacing: 1, objectName: 'up|350|cspl' });
  T(s, "default-src 'unsafe-inline' data: blob:;\nform-action 'none'; base-uri 'none'", { x: X0 + 0.26, y: y0 + 0.5, w: 7.1, h: 0.8, fontSize: 13, fontFace: 'Consolas', color: 'F8FAFC', valign: 'top', objectName: 'up|400|csp' });
  list(s, ['Set by the file\'s first script, before anything else runs', 'Refuses every web address: fetch, WebSocket, images, scripts, forms', 'No telemetry, no CDN, no web fonts: the file carries everything', 'Tested: a fetch and an image are tried and refused; every page, every role, runs without one refusal'],
    { x: X0, y: y0 + 1.7, w: 7.6, h: 2.4, size: 11.5, t: 500, gap: 8 });
  stat(s, 8.75, y0 + 0.08, X1 - 8.75, 2.15, '0', 'web requests', 'Opened from the common folder, the page can use only what is inside it.', { t: 600, fill: C.bsoft, bc: C.btext, bs: 44 });
  pic(s, 'sc-fig-laptop', { x: 9.05, y: y0 + 2.45, w: 3.1 }, 'up|700|fig', '');
}

// =============================================================================================== 10. the security review
{
  const s = add('SHOW', sec('Security review', 'In October 2026 the tool had a security review, done the way an insider with access to the folder would attack it. Nine areas: six were hardened, one of them a high-severity fix: an account file in the shared folder could give itself the team\'s key and the admin role, and now it cannot. Backups are locked at 600,000 rounds, CSV exports cannot carry formulas, Outlook drafts cannot carry extra headers, the no-network rule is on, and the outside code is pinned. Three areas were checked and needed nothing. Each finding was first shown on a build with made-up data, then fixed, and its test stays.'));
  const y0 = head(s, 'Security review · October 2026', 'Nine areas reviewed, **six hardened.**');
  const fix = { text: 'Fixed (high)', options: { bold: true, color: C.red } }, ok = t => ({ text: t, options: { color: C.green, bold: true } });
  table(s, [
    ['Area', 'Result', 'What it means'],
    ['Accounts in the shared folder', fix, 'A planted account file can no longer give itself the team\'s key or the admin role'],
    ['Backups', 'Hardened', 'Locked at 600,000 rounds (PBKDF2-SHA256); a made-up round count is refused'],
    ['CSV exports', 'Hardened', 'A cell starting with = + - @ stays text, never runs as a formula'],
    ['Outlook drafts', 'Hardened', 'A line break in an address or a file name can never start a new header'],
    ['No network', 'Hardened', 'The browser refuses every web address, by rule'],
    ['Supply chain', 'Hardened', 'Outside code pinned by SHA-256; the CI token can only read'],
    ['Text from files and people', ok('Sound'), 'Escaped on every page, preview and email body'],
    ['Encryption', ok('Sound'), 'PBKDF2-SHA256 600,000 rounds, AES-256-GCM, RSA-OAEP 2048'],
    ['Limits', ok('Sound'), 'A backup cannot replace accounts or keys; record names cannot leave the folder'],
  ], { y: y0 + 0.05, colW: [3.0, 1.55, 7.18], rowH: 0.39, size: 10, hs: 10, fills: ['FDF3F2'] });
  T(s, 'Method: an adapted security-review skill (Claude Code Cybersecurity Skills, MIT). Each finding was shown on a build with made-up data, fixed, and its test kept.', { x: X0, y: 6.36, w: CW, h: 0.3, fontSize: 9, color: C.muted, objectName: 'up|900|note' });
}

// =============================================================================================== 11. testing
{
  const s = add('SHOW', sec('Testing', 'Before every release, 31 automated security checks run. Seven plant HTML in every name and file and open every page as each of the seven roles: nothing may run. Seven plant tampered account files: none may get access. Six try the backups with a wrong password and forged settings. Six check the outside code\'s fingerprints and the no-network rule. Five check the preview mode and the role limits. Around them, 43 browser test suites check the whole tool, always on made-up people; and a load test had 100 people working at once on one folder, with nothing lost.'));
  const y0 = head(s, 'Testing', 'Checked before **every release.**');
  const lw = 6.95, top = y0 + 0.08, h = 6.6 - top - 0.06;
  card(s, X0, top, lw, h, { t: 300 });
  T(s, '31', { x: X0 + 0.28, y: top + 0.18, w: 1.6, h: 0.85, fontSize: 44, bold: true, color: C.btext, objectName: 'up|350|n' });
  T(s, 'automated security checks', { x: X0 + 1.75, y: top + 0.42, w: 4.8, h: 0.4, fontSize: 14, bold: true, color: C.ink, objectName: 'up|350|l' });
  const rows = [['Planted code (XSS): every page, all 7 roles', 7], ['Tampered account files', 7], ['Backup encryption', 6], ['Outside code and the no-network rule', 6], ['Preview mode and role limits', 5]];
  rows.forEach(([t, n], i) => {
    const y = top + 1.25 + i * 0.66, d = 450 + i * 90, bw = 2.2 * n / 7;
    T(s, t, { x: X0 + 0.28, y, w: 3.9, h: 0.4, fontSize: 11, color: C.ink2, valign: 'middle', objectName: `up|${d}|t` });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X0 + 4.3, y: y + 0.13, w: 2.2, h: 0.14, rectRadius: 0.07, fill: { color: 'EEF2F7' }, line: { type: 'none' }, objectName: `up|${d}|tr` });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X0 + 4.3, y: y + 0.13, w: bw, h: 0.14, rectRadius: 0.07, fill: { color: C.blue }, line: { type: 'none' }, objectName: `up|${d}|b` });
    T(s, String(n), { x: X0 + 6.3, y, w: 0.4, h: 0.4, fontSize: 12, bold: true, color: C.ink, align: 'right', valign: 'middle', objectName: `up|${d}|n` });
  });
  const rx = X0 + lw + 0.25, rw = X1 - rx, sh = (h - 0.44) / 3;
  statRow(s, rx, top, rw, sh, '43', 'browser test suites', 'Playwright with Chromium, on made-up people only.', { t: 700 });
  statRow(s, rx, top + sh + 0.22, rw, sh, '100', 'people at once', 'One shared folder: every change reached everyone, none lost, no errors.', { t: 800 });
  statRow(s, rx, top + 2 * (sh + 0.22), rw, sh, '0', 'real data in tests', 'Every test person, ID and file is made up.', { t: 900 });
}

// =============================================================================================== 12. operations
{
  const s = add('SHOW', sec('Operations', 'Running it is simple: the file goes in the common folder, with MC Data next to it. An update is a new file in its place; the data stays. It needs Edge or Chrome and access to the folder, and there is nothing to patch on a server or to monitor. Backups come from WFM team › Data, as an encrypted .mcbak file, and an import brings the records back. What we ask of the folder\'s owners: keep Cadence.html read-only for everyone but its owner, because whoever can replace it controls every session; keep MC Data to the team; long passphrases for admins; backup passwords apart from sign-in passwords.'));
  const y0 = head(s, 'Operations', 'Simple to run, **simple to keep safe.**');
  const w = (CW - 0.25) / 2, h = 6.6 - y0 - 0.14;
  panel(s, X0, y0 + 0.08, w, h, 'Running it', [
    'Install: copy Cadence.html into the common folder; MC Data sits next to it',
    'Update: replace the one file; the data stays',
    'Needs: Microsoft Edge or Google Chrome, and access to the folder',
    'Backup: WFM team › Data makes an encrypted .mcbak; an import restores the records',
    'Nothing to patch on a server, nothing to monitor',
  ], { t: 300, size: 12.5, gap: 11 });
  panel(s, X0 + w + 0.25, y0 + 0.08, w, h, 'What we ask of the folder\'s owners', [
    'Keep Cadence.html read-only for everyone but its owner: whoever can replace it controls every session',
    'Keep MC Data to the team that uses it',
    'Admins use long passphrases',
    'Keep backup passwords apart from sign-in passwords',
    'Keep the .mcbak backups somewhere safe',
  ], { t: 450, size: 12.5, gap: 11, fill: C.bsoft, hc: C.btext });
}

// =============================================================================================== 13. what stays open
{
  const s = add('SHOW', sec('What stays open', 'Five things stay open by design, and the review lists what would close each. All staff share one data key, so staff roles are not enforced by cryptography: one key per area, or a server, would close it. The data key is never rotated: re-encrypting with a new key would. Account details in the plain files can be changed by anyone with the folder: signing them with the team\'s key would close it. Two account cases trust a key the first time: confirming fingerprints by hand would close those. And outside the tool, the file\'s own integrity rests on the folder\'s permissions. Questions?'));
  const y0 = head(s, 'Open by design', 'What stays open,\n**and what would close it.**');
  table(s, [
    ['Risk', 'Why it stays', 'What would close it'],
    ['Staff roles are not cryptographic', 'All staff share one data key', 'One key per area, or a server'],
    ['The data key is never rotated', 'Removing someone does not take back a key they once had', 'Re-encrypt with a new key and grant it again'],
    ['Account details in plain files can be changed', 'Names, usernames and lock times sit in files anyone with the folder can write', 'Sign the account files with the team\'s key'],
    ['Accounts moved from a browser are trusted on their first key', 'A key written into such a file before its owner signs in could be granted', 'The admin confirms each one, or the move records a fingerprint'],
    ['Reopened access trusts the account file\'s key', 'After a password reset, the data key is wrapped for the key the file holds', 'Show the key\'s fingerprint and confirm it with the person'],
  ], { y: y0 + 0.05, colW: [3.35, 4.4, 3.98], rowH: 0.5, size: 10, hs: 10 });
  T(s, [{ text: 'Outside the tool: ', options: { bold: true, color: C.ink } }, { text: 'the file\'s integrity rests on the folder\'s permissions.', options: { color: C.muted } }],
    { x: X0, y: 5.6, w: CW, h: 0.32, fontSize: 11, valign: 'middle', objectName: 'up|850|out' });
  T(s, [{ text: 'QUESTIONS? ', options: { fontFace: LIGHT, color: C.ink } }, { text: 'THANK YOU.', options: { bold: true, color: C.ink } }],
    { x: X0, y: 6.02, w: CW, h: 0.55, fontSize: 24, valign: 'middle', objectName: 'up|950|end' });
}

write(outFile);
