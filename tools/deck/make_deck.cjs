// The stakeholder deck: what the MC Monthly Report Builder does and what it brings, in the tool's own look (the Daylight grey and
// white, Beyond One orange for the one thing that matters on a slide, dark slides to open and close), with the tool's screenshots
// in device frames (tools/deck/shots.cjs and art.cjs, synthetic data only) and motion: every slide fades in and its parts rise in
// one after another. Usage: node tools/deck/make_deck.cjs artDir out.pptx   (needs pptxgenjs: npm i pptxgenjs)
const fs = require('node:fs'), path = require('node:path');
const Pptx = require('pptxgenjs');
const Core = require(path.join(__dirname, '..', '..', 'js', 'core.js'));
const [artDir, outFile] = process.argv.slice(2);
const A = n => path.join(artDir, n.endsWith('.png') ? n : n + '.png');
const size = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const C = { ink: '1D1D1F', ink2: '3A3A3C', muted: '5C5C61', faint: '8E8E93', bg: 'F2F2F7', white: 'FFFFFF', line: 'E5E5EA', pill: 'E5E5EA',
  dark: '0B0B0C', card: '1C1C1E', card2: '2C2C2E', dink: 'F5F5F7', dmuted: 'A8A8AD', orange: 'F26722', fill: 'C4511A', otext: 'B3441A', good: '34C759' };
const THEME = { name: 'MC Daylight', head: 'Arial', body: 'Arial',
  colors: { dk1: C.ink, lt1: C.white, dk2: C.dark, lt2: C.bg, accent1: C.orange, accent2: C.fill, accent3: C.good, accent4: '007AFF', accent5: 'FF9500', accent6: C.faint, hlink: C.otext, folHlink: '8E44C9' } };
const W = 13.333, M = 0.6, FONT = 'Arial';
const pres = new Pptx(); pres.layout = 'LAYOUT_WIDE';
pres.title = 'MC Monthly Report Builder'; pres.subject = 'What the tool does and what it brings to Member Care'; pres.author = 'Member Care WFM team'; pres.company = 'Member Care';
pres.theme = { headFontFace: THEME.head, bodyFontFace: THEME.body };
const foot = dark => [{ text: { text: 'MC Monthly Report Builder', options: { x: M, y: 7.02, w: 5, h: 0.28, fontSize: 9, color: dark ? '6E6E73' : C.faint, fontFace: FONT, margin: 0 } } }];
const titlePh = dark => ({ placeholder: { options: { name: 'title', type: 'title', x: M, y: 0.98, w: 7.2, h: 1.32, fontSize: 34, fontFace: FONT, color: dark ? C.dink : C.ink, align: 'left', valign: 'top', margin: 0 }, text: '' } });
pres.defineSlideMaster({ title: 'LIGHT', background: { color: C.bg }, objects: [...foot(false), titlePh(false)], slideNumber: { x: 12.13, y: 7.02, w: 0.6, h: 0.28, fontSize: 9, color: C.faint, fontFace: FONT, align: 'right' } });
pres.defineSlideMaster({ title: 'DARK', background: { color: C.dark }, objects: [...foot(true), titlePh(true)], slideNumber: { x: 12.13, y: 7.02, w: 0.6, h: 0.28, fontSize: 9, color: '6E6E73', fontFace: FONT, align: 'right' } });
pres.defineSlideMaster({ title: 'COVER', background: { color: C.dark } });

// ---- pieces. An object's name starts with how it comes in and when: 'up|300|…' rises in 300 ms after the slide, 'fade|0|…' fades in
const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, ...o });
/** what each picture shows, for screen readers (the screenshots come from the synthetic test data) */
const ALT = { 'laptop-dark-tilt': 'The dashboard, in dark, on a laptop', 'laptop-dark': 'The dashboard, in dark, on a laptop', 'laptop-light': 'The dashboard on a laptop',
  'win-import': 'WFM team, Import: the four Genesys exports read', 'win-checks': 'Review, Checks', 'win-export': 'Export: the monthly workbook', 'win-emails': 'Emails: the deduction email for review',
  'win-templates': 'Attendance templates, one for each department', 'win-xlsx': 'An attendance template open on How to fill', 'win-how': 'Results, How this was counted for one agent',
  'win-builder': 'WFM team, Report builder', 'phones-fan': 'A supervisor\'s team and an agent\'s page in English and Arabic, on phones', 'paper-form': 'A one-to-one form on one page', glow: '' };
const pic = (s, n, x, y, w, name) => { const z = size(A(n)), h = w * z.h / z.w; s.addImage({ path: A(n), x, y, w, h, objectName: name, altText: ALT[n] ?? '' }); return h; };
const picH = (s, n, x, y, h, name) => { const z = size(A(n)), w = h * z.w / z.h; s.addImage({ path: A(n), x, y, w, h, objectName: name, altText: ALT[n] ?? '' }); return w; };
function eyebrow(s, text, dark, t = 0) {
  const w = 0.34 + text.length * 0.088;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 0.52, w, h: 0.3, rectRadius: 0.15, fill: { color: dark ? C.card2 : C.pill }, line: { type: 'none' }, objectName: `fade|${t}|eyebrow-pill` });
  T(s, text.toUpperCase(), { x: M, y: 0.52, w, h: 0.3, fontSize: 9, bold: true, color: dark ? C.dmuted : C.muted, align: 'center', valign: 'middle', charSpacing: 1.6, objectName: `fade|${t}|eyebrow` });
}
const title = (s, a, b, dark) => s.addText([{ text: a, options: { bold: true, breakLine: true } }, { text: b, options: { color: C.faint } }], { placeholder: 'title' });
function card(s, x, y, w, h, dark, name, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.16, fill: { color: fill || (dark ? C.card : C.white) }, line: { color: dark ? C.card2 : C.line, width: 0.75 },
    ...(dark || fill ? {} : { shadow: { type: 'outer', color: '000000', opacity: 0.07, blur: 14, offset: 3, angle: 90 } }), objectName: name });
}
function dot(s, icon, x, y, d, bg, fg, t) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { type: 'none' }, objectName: `up|${t}|dot-${icon}` });
  s.addImage({ path: A(`icon-${icon}-${fg}`), x: x + d * 0.23, y: y + d * 0.23, w: d * 0.54, h: d * 0.54, objectName: `up|${t}|icon-${icon}`, altText: '' });
}
/** an icon, a bold line and the words under it: [icon, head, text] at (x, y) */
function point(s, [icon, head, text], x, y, w, dark, t, o = {}) {
  const d = o.d || 0.52;
  dot(s, icon, x, y, d, o.bg || (dark ? C.card2 : C.ink), o.fg || 'white', t);
  T(s, head, { x: x + d + 0.22, y: y - 0.02, w: w - d - 0.22, h: 0.34, fontSize: o.hs || 15, bold: true, color: dark ? C.dink : C.ink, objectName: `up|${t}|h` });
  T(s, text, { x: x + d + 0.22, y: y + 0.32, w: w - d - 0.22, h: o.th || 0.62, fontSize: o.ts || 12.5, color: dark ? C.dmuted : C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${t}|t` });
}
const notes = (s, t) => s.addNotes(t);
const slides = [];
const add = (layout, sec) => { const s = pres.addSlide({ masterName: layout, sectionTitle: sec }); slides.push(s); return s; };

// ---- 1. cover
pres.addSection({ title: 'Opening' });
{
  const s = add('COVER', 'Opening');
  s.addImage({ path: A('glow'), x: 5.9, y: -0.4, w: 7.4, h: 7.4, objectName: 'fade|0|glow', altText: '' });
  picH(s, 'laptop-dark-tilt', 5.2, 0.75, 5.8, 'up|250|laptop');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.85, y: 1.75, w: 0.7, h: 0.7, rectRadius: 0.16, fill: { color: C.fill }, line: { type: 'none' }, objectName: 'fade|0|mark' });
  T(s, 'WF', { x: 0.85, y: 1.75, w: 0.7, h: 0.7, fontSize: 19, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: 'fade|0|mark-text' });
  T(s, [{ text: 'MC Monthly', options: { breakLine: true } }, { text: 'Report Builder' }], { x: 0.85, y: 2.7, w: 5.6, h: 1.75, fontSize: 46, bold: true, color: C.white, valign: 'top', lineSpacingMultiple: 0.92, objectName: 'up|120|name' });
  T(s, 'Workforce management for Member Care: from the month\'s Genesys exports to the final emails, in one offline file.', { x: 0.85, y: 4.55, w: 5.1, h: 0.9, fontSize: 16, color: C.dmuted, valign: 'top', lineSpacingMultiple: 1.1, objectName: 'up|260|sub' });
  let x = 0.85;
  for (const [i, c] of ['One file', 'Every role', 'Nothing leaves the company'].entries()) {
    const w = 0.42 + c.length * 0.094;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.72, w, h: 0.4, rectRadius: 0.2, fill: { color: C.card }, line: { color: C.card2, width: 0.75 }, objectName: `up|${420 + i * 90}|chip${i}` });
    T(s, c, { x, y: 5.72, w, h: 0.4, fontSize: 11.5, color: C.dink, align: 'center', valign: 'middle', objectName: `up|${420 + i * 90}|chip${i}-t` }); x += w + 0.14;
  }
  T(s, 'Member Care · WFM team · October 2026', { x: 0.85, y: 6.85, w: 5, h: 0.3, fontSize: 10, color: '6E6E73', objectName: 'fade|600|date' });
  notes(s, 'MC Monthly Report Builder: one offline file that turns the month\'s Genesys exports and the supervisors\' attendance into the monthly workbook, the incentive data and the emails, with a page for every role.');
}

// ---- 2. the challenge
pres.addSection({ title: 'Why' });
{
  const s = add('LIGHT', 'Why'); eyebrow(s, 'The challenge', false); title(s, 'Month end was', 'a manual marathon', false);
  [['file', 'Files gathered by hand', 'Four Genesys exports, every supervisor\'s attendance sheet, the KPI and quality files, joined by copy and paste.'],
    ['chart', 'Numbers hard to explain', 'Bonus and deduction worked out in spreadsheets: a rounding or a missed absence was hard to find, and harder to explain.'],
    ['mail', 'Emails built one by one', 'The deduction and incentive emails, their tables and attachments, put together by hand every month.']]
    .forEach((p, i) => point(s, p, M, 2.75 + i * 1.28, 6.0, false, 300 + i * 150));
  s.addShape(pres.shapes.RECTANGLE, { x: 7.35, y: 0, w: W - 7.35, h: 7.5, fill: { color: C.dark }, line: { type: 'none' }, objectName: 'fade|0|panel' });
  T(s, [{ text: 'Ten files.', options: { breakLine: true, color: C.white } }, { text: 'Seven roles.', options: { breakLine: true, color: C.white } }, { text: 'One deadline.', options: { color: C.orange } }], { x: 7.95, y: 0.9, w: 4.8, h: 2.0, fontSize: 32, bold: true, valign: 'top', lineSpacingMultiple: 0.98, objectName: 'up|200|quote' });
  const files = ['Monthly Adherence.csv', 'Schedule activities.csv', 'Agent Status Timeline.csv', 'Agents Performance Summary.csv', 'Attendance - CT.xlsx', 'KPI results.xlsx', 'Final EVAL.xlsx', 'Incentive data.xlsx'];
  files.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 7.95 + col * 2.5 + (row % 2) * 0.22, y = 3.35 + row * 0.82, w = 2.36;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.56, rectRadius: 0.12, fill: { color: C.card }, line: { color: C.card2, width: 0.75 }, objectName: `up|${450 + i * 70}|file${i}` });
    s.addImage({ path: A(`icon-${/csv/.test(f) ? 'table' : 'sheet'}-orange`), x: x + 0.14, y: y + 0.13, w: 0.3, h: 0.3, objectName: `up|${450 + i * 70}|file${i}-i`, altText: '' });
    T(s, f, { x: x + 0.52, y, w: w - 0.6, h: 0.56, fontSize: 9.5, color: C.dink, valign: 'middle', objectName: `up|${450 + i * 70}|file${i}-t` });
  });
  notes(s, 'Before the tool, month end meant collecting ten or more files and joining them by hand. The numbers behind the bonus and the deduction were hard to check and hard to explain, and every email was built by hand.');
}

// ---- 3. the tool
pres.addSection({ title: 'The tool' });
{
  const s = add('LIGHT', 'The tool'); eyebrow(s, 'The tool', false); title(s, 'One file.', 'Your month in one place', false);
  [['offline', 'Works offline', 'Opens in Edge or Chrome: nothing to install, no server.'], ['folder', 'Shared', 'Everyone works on the same data folder, next to the HTML.'],
    ['lock', 'Locked', 'The data files are encrypted: only accounts made in the tool read them.'], ['team', 'For every role', 'WFM, supervisors, the senior manager, quality and agents.']]
    .forEach((p, i) => { const y = 2.5 + i * 1.1; card(s, M, y, 5.0, 0.98, false, `up|${300 + i * 120}|card${i}`); point(s, p, M + 0.22, y + 0.22, 4.65, false, 300 + i * 120, { d: 0.5, hs: 13.5, ts: 11, th: 0.45 }); });
  pic(s, 'laptop-light', 6.2, 1.35, 6.85, 'up|200|laptop');
  notes(s, 'The tool is a single HTML file kept in the common folder next to the MC Data folder. It works offline, the data is shared and locked, and every role signs in to its own page.');
}

// ---- 4. how a month runs
{
  const s = add('LIGHT', 'The tool'); eyebrow(s, 'How a month runs', false); title(s, 'From the exports', 'to the final emails', false);
  const steps = [['win-import', 'Import', 'Drop the month\'s files at once: each one is recognised by its columns.'], ['win-checks', 'Review', 'Checks list what needs a decision: names, duplicates, attendance.'],
    ['win-export', 'Export', 'The monthly workbook and the incentive data, kept with the shared data.'], ['win-emails', 'Emails', 'Deduction and incentive emails, for review and final, ready for Outlook.']];
  const cw = (W - 2 * M - 3 * 0.25) / 4;
  steps.forEach(([img, h, t], i) => {
    const x = M + i * (cw + 0.25), y = 2.6, d = 300 + i * 160;
    card(s, x, y, cw, 4.1, false, `up|${d}|step${i}`);
    pic(s, img, x + 0.06, y + 0.1, cw - 0.12, `up|${d}|shot${i}`);
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 2.2, w: 0.42, h: 0.42, fill: { color: i === 0 ? C.fill : C.ink }, line: { type: 'none' }, objectName: `up|${d}|n${i}` });
    T(s, String(i + 1), { x: x + 0.25, y: y + 2.2, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|n${i}t` });
    T(s, h, { x: x + 0.82, y: y + 2.2, w: cw - 1, h: 0.42, fontSize: 16, bold: true, color: C.ink, valign: 'middle', objectName: `up|${d}|h${i}` });
    T(s, t, { x: x + 0.25, y: y + 2.8, w: cw - 0.5, h: 1.1, fontSize: 12, color: C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${d}|t${i}` });
  });
  notes(s, 'A month runs in four steps on the WFM team page: Import the files, Review what the checks found, Export the workbooks, and send the emails. Each step says what it still needs.');
}

// ---- 5. built to be right
{
  const s = add('DARK', 'The tool'); eyebrow(s, 'Built to be right', true); title(s, 'Checked', 'at every step', true);
  const tiles = [['1', 'file to open: no install, no server', 'monitor'], ['4', 'Genesys exports read in one drop', 'up'], ['7', 'roles, each with its own page', 'team'],
    ['10,000', 'synthetic people checked against the previous engine', 'check'], ['21', 'automated browser test suites', 'shield'], ['0', 'network calls: no data leaves the computer', 'offline']];
  const tw = (W - 2 * M - 2 * 0.3) / 3, th = 2.05;
  tiles.forEach(([n, t, ic], i) => {
    const x = M + (i % 3) * (tw + 0.3), y = 2.5 + Math.floor(i / 3) * (th + 0.25), d = 300 + i * 110;
    card(s, x, y, tw, th, true, `up|${d}|tile${i}`);
    dot(s, ic, x + 0.3, y + 0.28, 0.5, i === 3 ? C.fill : C.card2, i === 3 ? 'white' : 'orange', d);
    T(s, n, { x: x + 0.3, y: y + 0.84, w: tw - 0.6, h: 0.6, fontSize: 32, bold: true, color: C.white, objectName: `up|${d}|n${i}` });
    T(s, t, { x: x + 0.3, y: y + 1.44, w: tw - 0.6, h: 0.52, fontSize: 12, color: C.dmuted, valign: 'top', objectName: `up|${d}|t${i}` });
  });
  notes(s, 'The counting is checked against the previous engine on ten thousand synthetic people, and the pages are covered by automated browser tests. The tool makes no network call: the data never leaves the computer and the shared folder.');
}

// ---- 6. attendance
pres.addSection({ title: 'What it does' });
{
  const s = add('LIGHT', 'What it does'); eyebrow(s, 'Attendance', false); title(s, 'Attendance', 'without the chase', false);
  [['sync', 'CC and SM: automatic', 'Counted from the Schedule and the Agent Status Timeline, the way their supervisors already did in Genesys. Supervisors only correct sick days.'],
    ['sheet', 'TS, MG, CT, QA, DE, WF: one template', 'One file a month for each department, made by the tool. Supervisors write only the late, absent, leave and off days: every other day counts as worked.'],
    ['help', 'Opens on How to fill', 'Examples, the types and tips on the cells, in the same look as the tool\'s workbooks.']]
    .forEach((p, i) => point(s, p, M, 2.65 + i * 1.35, 5.0, false, 300 + i * 150, { th: 0.85 }));
  pic(s, 'win-templates', 6.75, 0.8, 6.2, 'up|250|templates');
  pic(s, 'win-xlsx', 5.85, 3.6, 4.5, 'up|500|xlsx');
  notes(s, 'CC and SM attendance comes from Genesys by itself. The other departments get one template a month, per department: only the exceptions are written, every other day counts as worked, and each file opens on its own instructions.');
}

// ---- 7. incentive
{
  const s = add('LIGHT', 'What it does'); eyebrow(s, 'Incentive', false); title(s, 'Every bonus,', 'explained', false);
  pic(s, 'win-how', 0.35, 2.35, 6.9, 'up|250|how');
  [['star', 'One set of rules', 'Scorecards, bases and who is eligible, in force from a month; every change logged.'],
    ['target', 'Counted as the old files did', 'Percent KPIs and the Final % rounded to a whole %: 94.99% counts as 95%.'],
    ['eye', 'How this was counted', 'For every person: each KPI\'s value, band, ranking and points, the days, and why they earn it or not.'],
    ['link', 'Reconcile with the old Excel', 'Drop the old workbook: every difference is lined up with its cause and a fix.']]
    .forEach((p, i) => point(s, p, 7.55, 2.45 + i * 1.12, 5.2, false, 400 + i * 140, { th: 0.62 }));
  notes(s, 'The incentive is counted from one set of rules, the same way for everyone, and the panel How this was counted shows every step for every person. The old Excel can be dropped in to explain any difference.');
}

// ---- 8. emails
{
  const s = add('DARK', 'What it does'); eyebrow(s, 'Emails', true); title(s, 'Month-end emails,', 'ready to send', true);
  s.addImage({ path: A('glow'), x: -0.8, y: 1.4, w: 7.4, h: 7.4, objectName: 'fade|0|glow', altText: '' });
  pic(s, 'win-emails', 0.45, 2.35, 7.15, 'up|250|emails');
  [['mail', 'Deduction and incentive', 'For review and final, from the shared month or this build.'], ['check', 'What changed, listed', 'The final email lists every change since the review.'],
    ['lock', 'A private attachment', 'One workbook with the Attendance Report and the Monthly Deduction, without National IDs.'], ['send', 'Sent from Outlook', 'Copy for Outlook or download the .eml: the tool never sends anything itself.']]
    .forEach((p, i) => point(s, p, 8.0, 2.45 + i * 1.12, 4.75, true, 400 + i * 140, { bg: C.card2, fg: 'orange', th: 0.62 }));
  notes(s, 'The deduction and incentive emails are made by the tool for review and final. The attachment is built automatically and carries no National IDs. The tool never sends anything: the WFM team sends from Outlook.');
}

// ---- 9. every role
{
  const s = add('LIGHT', 'What it does'); eyebrow(s, 'Every role', false); title(s, 'One tool,', 'a page for every role', false);
  picH(s, 'phones-fan', 6.6, 0.75, 6.0, 'up|250|phones');
  const roles = [['chart', 'WFM analysts', 'Build the month and the daily reports'], ['mail', 'WFM manager', 'Emails, interactions and analytics'], ['star', 'Senior manager', 'Rules, results, the month\'s four emails'],
    ['team', 'Supervisors', 'Their team, one-to-ones, attendance'], ['check', 'Quality team', 'The Final EVAL and critical errors'], ['user', 'Agents', 'Their results and forms, in English or Arabic']];
  roles.forEach((r, i) => { const x = M + (i % 2) * 3.2, y = 2.75 + Math.floor(i / 2) * 1.32; point(s, r, x, y, 3.05, false, 350 + i * 100, { d: 0.46, hs: 13.5, ts: 11, th: 0.6 }); });
  notes(s, 'Each role signs in to its own pages: the WFM team builds the month, the senior manager decides and finalizes, supervisors run their team and one-to-ones, the quality team keeps the evaluations, and agents see their own results, in English or Arabic.');
}

// ---- 10. one-to-ones
{
  const s = add('LIGHT', 'What it does'); eyebrow(s, 'Coaching', false); title(s, 'One-to-ones', 'on one page', false);
  picH(s, 'paper-form', 0.45, 2.25, 4.8, 'up|250|form');
  [['table', 'Ready from the month\'s numbers', 'The results, the days under target and last month\'s actions are filled in.'], ['pen', 'Agent and supervisor, in turn', 'The agent adds their part and signs on screen after the supervisor\'s final.'],
    ['sync', 'Follow-up that sticks', 'Next month\'s form starts with what was agreed.'], ['bell', 'Deadlines in the bell', 'Everyone sees what is theirs to do; the senior manager sees who finished.']]
    .forEach((p, i) => point(s, p, 4.95, 2.45 + i * 1.12, 7.8, false, 400 + i * 140, { th: 0.62 }));
  notes(s, 'The one-to-one form is prepared from the month\'s numbers and fits on one page. The agent fills in their part and signs on screen; next month\'s form starts with the actions agreed.');
}

// ---- 11. private by design
{
  const s = add('DARK', 'What it does'); eyebrow(s, 'Private by design', true); title(s, 'Your data', 'stays yours', true);
  const tiles = [['lock', 'Locked files', 'Encrypted in the shared folder (AES-GCM): unreadable outside the tool.'], ['user', 'Sign-in and roles', 'Passwords, roles and approvals; an agent sees only their own page.'],
    ['offline', 'No network', 'The tool sends nothing and calls no server.'], ['eye', 'No IDs in emails', 'Email attachments carry names only, never National IDs.'],
    ['database', 'A locked backup', 'The WFM team exports everything to one file locked with a password.'], ['clock', 'Every change logged', 'Adjustments, rules and ticks keep who made them and when.']];
  const tw = (W - 2 * M - 2 * 0.3) / 3, th = 2.05;
  tiles.forEach(([ic, h, t], i) => {
    const x = M + (i % 3) * (tw + 0.3), y = 2.5 + Math.floor(i / 3) * (th + 0.25), d = 300 + i * 110;
    card(s, x, y, tw, th, true, `up|${d}|tile${i}`);
    dot(s, ic, x + 0.3, y + 0.28, 0.5, C.card2, 'orange', d);
    T(s, h, { x: x + 0.3, y: y + 0.9, w: tw - 0.6, h: 0.36, fontSize: 15, bold: true, color: C.white, objectName: `up|${d}|h${i}` });
    T(s, t, { x: x + 0.3, y: y + 1.27, w: tw - 0.6, h: 0.7, fontSize: 12, color: C.dmuted, valign: 'top', objectName: `up|${d}|t${i}` });
  });
  notes(s, 'Privacy is built in: the shared files are encrypted, each person signs in with their own role, nothing is sent over the network, email attachments carry no National IDs, and only the WFM team can export the data, locked with a password.');
}

// ---- 12. every day
{
  const s = add('LIGHT', 'What it does'); eyebrow(s, 'Every day', false); title(s, 'Daily reporting,', 'built in', false);
  [['up', 'Drop yesterday\'s exports', 'MC Leaders and the WFM Daily Review are made in the tool.'], ['mail', 'Four brand emails', 'Virgin Postpaid, Virgin Mobile, FRiENDi Mobile and FRiENDi Pay go straight to the WFM manager to send.'],
    ['day', 'A history that builds itself', 'Each day is kept, so the month can be followed day by day.']]
    .forEach((p, i) => point(s, p, M, 2.65 + i * 1.32, 5.4, false, 300 + i * 150, { th: 0.8 }));
  pic(s, 'win-builder', 6.3, 1.25, 6.75, 'up|250|builder');
  notes(s, 'Every morning the WFM analysts drop the day\'s exports: the daily review and the four brand emails are made in the tool and go to the WFM manager to send.');
}

// ---- 13. what it means
pres.addSection({ title: 'Benefits' });
{
  const s = add('LIGHT', 'Benefits'); eyebrow(s, 'What it means', false); title(s, 'What changes', 'for Member Care', false);
  const B = [['target', 'Accuracy', 'The same rules every month, tested against the previous engine.'], ['zap', 'Speed', 'The month\'s files read in one drop; the workbooks and emails built in a click.'],
    ['eye', 'Transparency', 'Every number explained, every change logged.'], ['handshake', 'Fairness', 'The bonus counted the same way for everyone, from one set of rules.'],
    ['bell', 'Accountability', 'Deadlines and the month close in each person\'s bell.'], ['layers', 'Continuity', 'Vacation cover, saved uploads and a locked backup: nothing rests on one person.']];
  const tw = (W - 2 * M - 2 * 0.3) / 3, th = 2.05;
  B.forEach(([ic, h, t], i) => {
    const x = M + (i % 3) * (tw + 0.3), y = 2.5 + Math.floor(i / 3) * (th + 0.25), d = 300 + i * 110, hi = i === 2;
    card(s, x, y, tw, th, false, `up|${d}|card${i}`, hi ? C.ink : undefined);
    dot(s, ic, x + 0.3, y + 0.28, 0.5, hi ? C.orange : C.ink, 'white', d);
    T(s, h, { x: x + 0.3, y: y + 0.9, w: tw - 0.6, h: 0.36, fontSize: 15, bold: true, color: hi ? C.white : C.ink, objectName: `up|${d}|h${i}` });
    T(s, t, { x: x + 0.3, y: y + 1.27, w: tw - 0.6, h: 0.7, fontSize: 12, color: hi ? C.dmuted : C.muted, valign: 'top', objectName: `up|${d}|t${i}` });
  });
  notes(s, 'For Member Care this means numbers that are right and explained, a faster month close, the same rules for everyone, clear deadlines, and a process that does not depend on one person.');
}

// ---- 14. ready today
{
  const s = add('COVER', 'Benefits');
  s.addImage({ path: A('glow'), x: 6.3, y: -0.4, w: 7.4, h: 7.4, objectName: 'fade|0|glow', altText: '' });
  pic(s, 'laptop-dark', 6.55, 1.25, 6.45, 'up|250|laptop');
  T(s, [{ text: 'Ready today', options: { breakLine: true, color: C.white } }, { text: 'Thank you', options: { color: C.faint } }], { x: 0.85, y: 0.95, w: 5.6, h: 1.7, fontSize: 40, bold: true, valign: 'top', lineSpacingMultiple: 0.95, objectName: 'up|100|title' });
  [['Put the HTML in the common folder, next to the MC Data folder.'], ['Open it in Microsoft Edge or Google Chrome.'], ['Each person makes an account; the admin gives the roles.']].forEach(([t], i) => {
    const y = 3.15 + i * 0.95, d = 300 + i * 150;
    s.addShape(pres.shapes.OVAL, { x: 0.85, y, w: 0.5, h: 0.5, fill: { color: i === 0 ? C.fill : C.card2 }, line: { type: 'none' }, objectName: `up|${d}|n${i}` });
    T(s, String(i + 1), { x: 0.85, y, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|n${i}t` });
    T(s, t, { x: 1.6, y: y - 0.02, w: 4.6, h: 0.56, fontSize: 15, color: C.dink, valign: 'middle', objectName: `up|${d}|t${i}` });
  });
  T(s, 'MC Monthly Report Builder · Member Care WFM team', { x: 0.85, y: 6.85, w: 6, h: 0.3, fontSize: 10, color: '6E6E73', objectName: 'fade|700|foot' });
  notes(s, 'The tool is ready today: put the HTML next to the MC Data folder in the common folder, open it in Edge or Chrome, and each person makes an account.');
}

// ---- write, then the theme, the transitions and the motion (pptxgenjs writes neither)
const tn = { n: 0 }, nid = () => ++tn.n;
const set = (spid, d) => `<p:set><p:cBhvr><p:cTn id="${nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
const fadeB = (spid, dur) => `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
const anim = (spid, dur, attr, from, to) => `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;
/** one effect: fade (Fade, preset 10) or up (Float In, preset 42: a fade while it rises a little) */
function effect({ spid, fx, delay }, first) {
  const id = nid(), up = fx === 'up', dur = up ? 650 : 500;
  const body = set(spid) + fadeB(spid, dur) + (up ? anim(spid, dur, 'ppt_x', '#ppt_x', '#ppt_x') + anim(spid, dur, 'ppt_y', '#ppt_y+.05', '#ppt_y') : '');
  return `<p:par><p:cTn id="${id}" presetID="${up ? 42 : 10}" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="${first ? 'afterEffect' : 'withEffect'}"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${body}</p:childTnLst></p:cTn></p:par>`;
}
function timing(list, sps) {
  tn.n = 0;
  const root = nid(), seq = nid(), click = nid(), grp = nid();
  const effects = list.map((e, i) => effect(e, i === 0)).join('');
  return `<p:timing><p:tnLst><p:par><p:cTn id="${root}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${seq}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
    `<p:par><p:cTn id="${click}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="${seq}"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="${grp}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>` +
    `<p:bldLst>${sps.map(id => `<p:bldP spid="${id}" grpId="0" animBg="1"/>`).join('')}</p:bldLst></p:timing>`;
}
function motion(xml) {
  const list = [], sps = [];
  xml = xml.replace(/ descr="[^"]*\.png"/g, ' descr=""');   // a decorative picture (an icon, the glow) has no description, never its file's path
  // the title placeholder rises in first, then every named part at its time
  xml = xml.replace(/<p:sp>((?:(?!<\/p:sp>)[\s\S])*?)<\/p:sp>/g, (all, inner) => {
    const m = inner.match(/<p:cNvPr id="(\d+)" name="([^"]*)"/); if (!m) return all;
    if (/<p:ph type="title"/.test(inner) && /<a:t>/.test(inner)) { list.push({ spid: m[1], fx: 'up', delay: 100 }); sps.push(m[1]); }
    return all;
  });
  xml = xml.replace(/<p:cNvPr id="(\d+)" name="(fade|up)\|(\d+)\|([^"]*)"/g, (all, id, fx, delay, name, at, src) => {
    list.push({ spid: id, fx, delay: +delay }); if (/<p:nvSpPr>\s*$/.test(src.slice(Math.max(0, at - 40), at))) sps.push(id);   // a shape (not a picture) gets its build entry
    return `<p:cNvPr id="${id}" name="${name}"`;
  });
  list.sort((a, b) => a.delay - b.delay);
  const trans = '<p:transition spd="med"><p:fade/></p:transition>';
  return xml.replace('</p:sld>', `${trans}${list.length ? timing(list, [...new Set(sps)]) : ''}</p:sld>`);
}
function theme(xml) {
  const c = THEME.colors, clr = k => `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`;
  xml = xml.replace(/<a:clrScheme name="[^"]*">[\s\S]*?<\/a:clrScheme>/, `<a:clrScheme name="${THEME.name}"><a:dk1><a:srgbClr val="${c.dk1}"/></a:dk1><a:lt1><a:srgbClr val="${c.lt1}"/></a:lt1>${['dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(clr).join('')}</a:clrScheme>`);
  xml = xml.replace(/(<a:majorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.head}"`).replace(/(<a:minorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.body}"`);
  return xml.replace(/<a:theme ([^>]*)name="[^"]*"/, `<a:theme $1name="${THEME.name}"`);
}
(async () => {
  const tmp = outFile + '.tmp.pptx';
  await pres.writeFile({ fileName: tmp });
  const z = await Core.readZip(fs.readFileSync(tmp)), files = [];
  for (const n of z.names()) {
    if (n.endsWith('/')) continue;
    if (/^ppt\/slides\/slide\d+\.xml$/.test(n)) files.push({ name: n, data: motion(await z.text(n)) });
    else if (/^ppt\/theme\/theme\d+\.xml$/.test(n)) files.push({ name: n, data: theme(await z.text(n)) });
    else files.push({ name: n, data: await z.bytes(n) });
  }
  fs.writeFileSync(outFile, await Core.writeZip(files)); fs.unlinkSync(tmp);
  console.log(`✓ ${outFile}: ${slides.length} slides`);
})();
