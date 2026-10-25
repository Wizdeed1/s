// The stakeholder deck: what the MC Monthly Report Builder does for Member Care, for the management team. It tells one story (the
// month end before, the tool, a month step by step, every role, why it can be trusted, what changes, how to start), in the tool's
// own look (Daylight grey and white, the orange for what matters, dark slides to open, for the emails, for privacy and to close).
// The tool is shown large enough to read: close-ups of its screens and the dashboard with its parts pointed out (tools/deck/
// shots.cjs and art.cjs, synthetic data only). Motion: every slide fades in and its parts rise in one after another.
// Usage: node tools/deck/make_deck.cjs artDir out.pptx   (needs pptxgenjs: npm i pptxgenjs)
const fs = require('node:fs'), path = require('node:path');
const Pptx = require('pptxgenjs');
const Core = require(path.join(__dirname, '..', '..', 'js', 'core.js'));
const [artDir, outFile] = process.argv.slice(2);
const A = n => path.join(artDir, n.endsWith('.png') ? n : n + '.png');
const size = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const C = { ink: '1D1D1F', ink2: '3A3A3C', muted: '58585D', faint: '8E8E93', bg: 'F2F2F7', white: 'FFFFFF', line: 'E5E5EA', soft: 'E9E9EE',
  dark: '0B0B0C', card: '1C1C1E', card2: '2C2C2E', dink: 'F5F5F7', dmuted: 'AEAEB2', orange: 'F26722', fill: 'C4511A', otext: 'B3441A', tint: 'FDEEE6' };
const THEME = { name: 'MC Daylight', head: 'Arial', body: 'Arial',
  colors: { dk1: C.ink, lt1: C.white, dk2: C.dark, lt2: C.bg, accent1: C.orange, accent2: C.fill, accent3: '34C759', accent4: '007AFF', accent5: 'FF9500', accent6: C.faint, hlink: C.otext, folHlink: '8E44C9' } };
const W = 13.333, M = 0.6, R = W - M, FONT = 'Arial';
const pres = new Pptx(); pres.layout = 'LAYOUT_WIDE';
pres.title = 'MC Monthly Report Builder'; pres.subject = 'What the tool does for Member Care, for the management team'; pres.author = 'Member Care WFM team'; pres.company = 'Member Care';
pres.theme = { headFontFace: THEME.head, bodyFontFace: THEME.body };

// ---- layouts: light and dark content slides (the title in the same place on every one), a split slide, the cover
const foot = dark => ({ text: { text: 'MC Monthly Report Builder', options: { x: M, y: 7.0, w: 5, h: 0.28, fontSize: 9, color: dark ? '6E6E73' : C.faint, fontFace: FONT, margin: 0 } } });
const titlePh = (dark, x = M, w = R - M, h = 0.8) => ({ placeholder: { options: { name: 'title', type: 'title', x, y: 0.92, w, h, fontSize: 36, bold: true, fontFace: FONT, color: dark ? C.white : C.ink, align: 'left', valign: 'top', margin: 0 }, text: '' } });
const num = dark => ({ x: 12.13, y: 7.0, w: 0.6, h: 0.28, fontSize: 9, color: dark ? '6E6E73' : C.faint, fontFace: FONT, align: 'right' });
pres.defineSlideMaster({ title: 'LIGHT', background: { color: C.bg }, objects: [foot(false), titlePh(false)], slideNumber: num(false) });
pres.defineSlideMaster({ title: 'DARK', background: { color: C.dark }, objects: [foot(true), titlePh(true)], slideNumber: num(true) });
pres.defineSlideMaster({ title: 'SPLIT', background: { color: C.bg }, objects: [titlePh(false, 6.0, R - 6.0, 1.4)], slideNumber: num(false) });
pres.defineSlideMaster({ title: 'COVER', background: { color: C.dark } });

// ---- pieces. An object's name says how it comes in and when: 'up|300|…' rises in 300 ms after the slide, 'fade|0|…' fades in
const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, ...o });
const ALT = { 'laptop-dark-tilt': 'The dashboard, in dark, on a laptop', 'laptop-dark': 'The dashboard, in dark, on a laptop', 'hero-dash': 'The dashboard: shortcuts, the month at a glance, the month close and the bell',
  'z-import': 'Import: the four Genesys exports recognised and ready', 'z-checks': 'Review, Checks: what needs a decision before the build', 'z-email': 'The deduction email for review, ready to copy into Outlook',
  'z-templates': 'Attendance templates: one for each department', 'z-how': 'How this was counted, for one agent: each KPI, its band, ranking and points', 'win-xlsx': 'An attendance template open on How to fill',
  'win-builder': 'WFM team, Report builder', 'phones-fan': 'A supervisor\'s team and an agent\'s page in English and Arabic, on phones', 'paper-form': 'A one-to-one form on one A4 page', glow: '' };
/** a picture whose visible part (inside `pad` transparent pixels kept for its shadow) is put at x, y with width w (or height h) */
function pic(s, n, b, pad, name) {
  const z = size(A(n)), vw = z.w - 2 * pad, vh = z.h - 2 * pad, k = b.w ? b.w / vw : b.h / vh;
  s.addImage({ path: A(n), x: b.x - pad * k, y: b.y - pad * k, w: z.w * k, h: z.h * k, objectName: name, altText: ALT[n] ?? '' });
  return { x: b.x, y: b.y, w: vw * k, h: vh * k, k };
}
const eyebrow = (s, text, dark, x = M) => T(s, text.toUpperCase(), { x, y: 0.5, w: 6, h: 0.3, fontSize: 11, bold: true, color: dark ? C.orange : C.otext, charSpacing: 2, objectName: 'fade|0|eyebrow' });
const title = (s, text) => s.addText(text, { placeholder: 'title' });
const lead = (s, text, dark, o = {}) => T(s, text, { x: o.x ?? M, y: o.y ?? 1.78, w: o.w ?? 7.6, h: o.h ?? 0.62, fontSize: 16, color: dark ? C.dmuted : C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${o.t ?? 180}|lead` });
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.14, fill: { color: o.fill || (o.dark ? C.card : C.white) }, line: o.line === false ? { type: 'none' } : { color: o.dark ? C.card2 : C.line, width: 0.75 },
    ...(o.dark || o.flat ? {} : { shadow: { type: 'outer', color: '000000', opacity: 0.08, blur: 16, offset: 3, angle: 90 } }), objectName: o.name || `up|${o.t ?? 300}|card` });
}
function dot(s, icon, x, y, d, bg, fg, t) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { type: 'none' }, objectName: `up|${t}|dot-${icon}` });
  s.addImage({ path: A(`icon-${icon}-${fg}`), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52, objectName: `up|${t}|icon-${icon}`, altText: '' });
}
/** an icon in a circle, a bold line and the words under it */
function point(s, [icon, head, text], x, y, w, o = {}) {
  const d = o.d ?? 0.56, t = o.t ?? 300, dark = !!o.dark;
  dot(s, icon, x, y, d, o.bg || (dark ? C.card2 : C.ink), o.fg || 'white', t);
  T(s, head, { x: x + d + 0.24, y: y - 0.03, w: w - d - 0.24, h: 0.36, fontSize: o.hs ?? 17, bold: true, color: dark ? C.white : C.ink, objectName: `up|${t}|h` });
  T(s, text, { x: x + d + 0.24, y: y + 0.36, w: w - d - 0.24, h: o.th ?? 0.66, fontSize: o.ts ?? 14, color: dark ? C.dmuted : C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${t}|t` });
}
/** a numbered marker in the tool's orange */
function marker(s, n, cx, cy, t, d = 0.4) {
  s.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: C.fill }, line: { color: C.white, width: 2 }, objectName: `up|${t}|m${n}` });
  T(s, String(n), { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${t}|m${n}t` });
}
/** a pill with a word in it; returns its width */
function chip(s, text, x, y, o = {}) {
  const w = (o.pad ?? 0.44) + text.length * (o.cw ?? 0.088);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.42, rectRadius: 0.21, fill: { color: o.fill || (o.dark ? C.card : C.white) }, line: { color: o.dark ? C.card2 : C.line, width: 0.75 }, objectName: `up|${o.t ?? 400}|chip` });
  T(s, text, { x, y, w, h: 0.42, fontSize: 13, color: o.color || (o.dark ? C.dink : C.ink), align: 'center', valign: 'middle', objectName: `up|${o.t ?? 400}|chip-t` });
  return w;
}
const slides = [];
const add = (layout, sec, notes) => { const s = pres.addSlide({ masterName: layout, sectionTitle: sec }); s.addNotes(notes); slides.push(s); return s; };

// =============================================================================================== 1. cover
pres.addSection({ title: 'Opening' });
{
  const s = add('COVER', 'Opening', 'The MC Monthly Report Builder: one offline file that runs Member Care\'s month end, from the Genesys exports to the emails and the one-to-ones, with a page for every role. In the next fifteen minutes: what it replaces, how a month runs in it, why it can be trusted, and how we start.');
  s.addImage({ path: A('glow'), x: 5.4, y: -0.6, w: 8.2, h: 8.2, objectName: 'fade|0|glow', altText: '' });
  pic(s, 'laptop-dark-tilt', { x: 5.95, y: 1.15, w: 6.9 }, 160, 'up|250|laptop');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.85, y: 1.55, w: 0.72, h: 0.72, rectRadius: 0.16, fill: { color: C.fill }, line: { type: 'none' }, objectName: 'fade|0|mark' });
  T(s, 'WF', { x: 0.85, y: 1.55, w: 0.72, h: 0.72, fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: 'fade|0|mark-text' });
  T(s, [{ text: 'MC Monthly', options: { breakLine: true } }, { text: 'Report Builder' }], { x: 0.85, y: 2.55, w: 5.4, h: 1.9, fontSize: 52, bold: true, color: C.white, valign: 'top', lineSpacingMultiple: 0.9, objectName: 'up|120|name' });
  T(s, 'Member Care\'s month end, from the Genesys exports to the last email, in one offline file.', { x: 0.85, y: 4.6, w: 4.9, h: 1.0, fontSize: 18, color: C.dmuted, valign: 'top', lineSpacingMultiple: 1.12, objectName: 'up|260|sub' });
  T(s, 'Member Care · WFM team · October 2026', { x: 0.85, y: 6.75, w: 5, h: 0.3, fontSize: 11, color: '8E8E93', objectName: 'fade|600|date' });
}

// =============================================================================================== 2. the month end before
{
  const s = add('SPLIT', 'Opening', 'Before the tool, month end meant ten or more files from different places, joined by copy and paste, for seven roles who all wait on the same numbers and one deadline. The numbers behind a bonus or a deduction were hard to check and harder to explain, and every email was assembled by hand.');
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.15, h: 7.5, fill: { color: C.dark }, line: { type: 'none' }, objectName: 'fade|0|panel' });
  [['10+', 'files joined by hand every month'], ['7', 'roles waiting on the same numbers'], ['1', 'deadline for all of it']].forEach(([n, l], i) => {
    const y = 1.05 + i * 1.95, t = 200 + i * 160;
    T(s, n, { x: 0.85, y, w: 4, h: 1.05, fontSize: 66, bold: true, color: i === 2 ? C.orange : C.white, valign: 'top', objectName: `up|${t}|n${i}` });
    T(s, l, { x: 0.85, y: y + 1.08, w: 3.9, h: 0.4, fontSize: 16, color: C.dmuted, objectName: `up|${t}|l${i}` });
  });
  eyebrow(s, 'The challenge', false, 6.0);
  title(s, 'Month end ran on copy and paste');
  [['file', 'Files gathered by hand', 'Four Genesys exports, every supervisor\'s attendance sheet, the KPI and quality files, joined by copy and paste.'],
    ['chart', 'Hard to check, harder to explain', 'A rounding or a missed absence changed a bonus; finding why meant opening the spreadsheets again.'],
    ['mail', 'Emails built one by one', 'The deduction and incentive emails, their tables and attachments, put together by hand every month.']]
    .forEach((p, i) => point(s, p, 6.0, 2.75 + i * 1.32, R - 6.0, { t: 400 + i * 150 }));
}

// =============================================================================================== 3. the answer: the dashboard, pointed out
pres.addSection({ title: 'The tool' });
{
  const s = add('LIGHT', 'The tool', 'This is the answer: one HTML file in the common folder, opened in Edge or Chrome. Everyone signs in and sees the same month. One: shortcuts to what this role does next. Two: the month at a glance, each number against last month. Three: the month close, whose step is due. Four: the bell holds each person\'s deadlines and checks, so nothing takes space on the pages.');
  eyebrow(s, 'The tool');
  title(s, 'One file runs the whole month');
  const H = JSON.parse(fs.readFileSync(path.join(artDir, 'hero.json'), 'utf8')), B = H.boxes, css = B.view.width;
  const win = pic(s, 'hero-dash', { x: M, y: 1.95, w: 7.55 }, H.pad, 'up|200|hero');
  const k = win.w / H.winW, X = x => win.x + x * (H.winW / css) * k, Y = y => win.y + (H.bar + y * (H.winW / css)) * k, cap = y => Math.min(y, B.view.height - 10);
  const out = (b, t, r = 0.06) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X(b.x) - 0.03, y: Y(b.y) - 0.03, w: X(b.x + b.w) - X(b.x) + 0.06, h: Y(cap(b.y + b.h)) - Y(b.y) + 0.06, rectRadius: r, fill: { type: 'none' }, line: { color: C.orange, width: 2 }, objectName: `fade|${t}|frame` });
  const pts = [[B.acts, 'Shortcuts for your role', 'What this person does next, one click away.'], [B.kpis, 'The month at a glance', 'Every number against last month, with its trend.'],
    [B.close, 'The month close', 'Each step of the close, done or due, and whose turn it is.'], [B.bell, 'The bell', 'Each person\'s deadlines and checks, in one place.']];
  pts.forEach(([b, h, t], i) => {
    const d = 700 + i * 260;
    if (b !== B.bell) out(b, d); else s.addShape(pres.shapes.OVAL, { x: X(b.x) - 0.04, y: Y(b.y) - 0.04, w: X(b.x + b.w) - X(b.x) + 0.08, h: Y(b.y + b.h) - Y(b.y) + 0.08, fill: { type: 'none' }, line: { color: C.orange, width: 2 }, objectName: `fade|${d}|frame` });
    if (b === B.bell) marker(s, i + 1, X(b.x) - 0.28, Y(b.y + b.h / 2), d, 0.34); else marker(s, i + 1, X(b.x) - 0.03, Y(b.y) - 0.03, d, 0.34);
    const y = 2.05 + i * 1.12;
    marker(s, i + 1, 8.85, y + 0.17, d, 0.38);
    T(s, h, { x: 9.25, y: y - 0.02, w: R - 9.25, h: 0.36, fontSize: 17, bold: true, color: C.ink, objectName: `up|${d}|h${i}` });
    T(s, t, { x: 9.25, y: y + 0.36, w: R - 9.25, h: 0.62, fontSize: 14, color: C.muted, valign: 'top', objectName: `up|${d}|t${i}` });
  });
  let x = 8.66;
  for (const [i, c] of ['Works offline', 'Shared folder', 'Locked'].entries()) x += chip(s, c, x, 6.5, { t: 1900 + i * 100, cw: 0.082 }) + 0.12;
}

// =============================================================================================== 4. a month in four steps
{
  const s = add('LIGHT', 'The tool', 'A month runs in four steps on the WFM team page. Import: every file of the month at once. Review: the checks list what needs a decision. Export: the monthly workbook and the incentive data. Emails: the deduction, absences and incentive emails, for review and then final. Each step says what it still needs, and the month stays saved between sign-ins.');
  eyebrow(s, 'How a month runs');
  title(s, 'A month in four steps');
  lead(s, 'The WFM team page walks the month from the exports to the emails. Each step says what it still needs, and nothing is lost between sign-ins.', false, { w: 10.5 });
  const steps = [['up', 'Import', 'Drop every file of the month at once. Each is recognised by what is inside it, not by its name.'],
    ['check', 'Review', 'The checks list what needs a decision: names not on the roster, duplicates, people with no schedule.'],
    ['table', 'Export', 'The monthly workbook and the incentive data, built in one click and kept locked with the shared data.'],
    ['mail', 'Emails', 'Deduction, absences and incentive emails, for review and then final, ready to send from Outlook.']];
  const cw = 2.78, gap = (R - M - 4 * cw) / 3;
  steps.forEach(([icon, h, t], i) => {
    const x = M + i * (cw + gap), d = 350 + i * 220;
    card(s, x, 2.85, cw, 3.75, { t: d });
    T(s, String(i + 1), { x: x + 0.3, y: 3.05, w: 1, h: 0.9, fontSize: 48, bold: true, color: C.orange, objectName: `up|${d}|n` });
    dot(s, icon, x + cw - 0.86, 3.18, 0.56, C.ink, 'white', d);
    T(s, h, { x: x + 0.3, y: 4.1, w: cw - 0.6, h: 0.45, fontSize: 22, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.3, y: 4.62, w: cw - 0.6, h: 1.8, fontSize: 14, color: C.muted, valign: 'top', lineSpacingMultiple: 1.06, objectName: `up|${d}|t` });
    if (i < 3) s.addShape(pres.shapes.CHEVRON, { x: x + cw + gap / 2 - 0.09, y: 4.6, w: 0.18, h: 0.26, fill: { color: C.orange }, line: { type: 'none' }, objectName: `fade|${d + 160}|arrow` });
  });
}

// =============================================================================================== 5. import
pres.addSection({ title: 'A month' });
{
  const s = add('LIGHT', 'A month', 'Import takes every file of the month in one drop. The tool reads each one on this computer and recognises it by its columns: the four Genesys exports, the attendance templates, the IDs, the KPI and the quality files each go where they belong. Every upload is kept, locked, and is back at the next sign-in.');
  eyebrow(s, 'Step 1 · Import');
  title(s, 'Drop everything at once');
  [['sparkle', 'Recognised by what is inside', 'Each file goes where it belongs by its columns, whatever its name.'],
    ['layers', 'One drop for the whole month', 'The four Genesys exports, attendance templates, IDs, KPI and quality files together.'],
    ['folder', 'Kept for the next sign-in', 'Every upload is kept, locked with the shared data, and comes back by itself.']]
    .forEach((p, i) => point(s, p, M, 2.2 + i * 1.42, 4.6, { t: 300 + i * 150, th: 0.7 }));
  pic(s, 'z-import', { x: 5.55, y: 2.0, w: R - 5.55 }, 70, 'up|250|shot');
}

// =============================================================================================== 6. checks
{
  const s = add('LIGHT', 'A month', 'Review is where problems surface before anything is built. Blocking checks stop the build until someone decides; the rest are listed to look at, such as names in the exports that are not on the roster, or people with no schedule this month. Every decision is recorded with who made it.');
  eyebrow(s, 'Step 2 · Review');
  title(s, 'Problems surface before anything is built');
  pic(s, 'z-checks', { x: M, y: 2.0, w: 7.7 }, 70, 'up|250|shot');
  T(s, 'Nothing is built until every blocking check is decided.', { x: 8.75, y: 2.15, w: R - 8.75, h: 1.7, fontSize: 24, bold: true, color: C.ink, valign: 'top', lineSpacingMultiple: 1.05, objectName: 'up|450|claim' });
  T(s, 'The workbook, the incentive data and the emails all come from the month that passed its checks.', { x: 8.75, y: 3.85, w: R - 8.75, h: 1.0, fontSize: 14, color: C.muted, valign: 'top', objectName: 'up|550|claim-t' });
  [['bell', 'Blocking', 'stops the build'], ['help', 'Please check', 'names, schedules'], ['user', 'Decided by you', 'every choice kept']].forEach(([icon, h, t], i) => {
    const x = M + i * 2.6, d = 700 + i * 140;
    card(s, x, 5.95, 2.5, 0.85, { t: d, flat: true });
    dot(s, icon, x + 0.16, 6.14, 0.46, C.tint, 'orange', d);
    T(s, h, { x: x + 0.76, y: 6.05, w: 1.68, h: 0.3, fontSize: 14, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.76, y: 6.36, w: 1.68, h: 0.3, fontSize: 13, color: C.muted, objectName: `up|${d}|t` });
  });
}

// =============================================================================================== 7. attendance, before and now
{
  const s = add('LIGHT', 'A month', 'Attendance no longer needs a day-by-day sheet from every supervisor. CC and SM are counted from the Schedule and the Agent Status Timeline in Genesys. The other departments get one template a month from the tool: supervisors write only the exceptions, late, absent, leave and days off, and every other day counts as worked. Each file opens on its own instructions.');
  eyebrow(s, 'Attendance');
  title(s, 'Attendance without the chase');
  card(s, M, 2.05, 5.3, 1.55, { fill: C.soft, flat: true, line: false, t: 250 });
  T(s, 'BEFORE', { x: M + 0.35, y: 2.27, w: 2, h: 0.28, fontSize: 11, bold: true, color: C.muted, charSpacing: 2, objectName: 'up|250|b-l' });
  T(s, 'Every supervisor filled a sheet for every agent, every day of the month.', { x: M + 0.35, y: 2.6, w: 4.6, h: 0.8, fontSize: 16, color: C.ink2, valign: 'top', objectName: 'up|250|b-t' });
  s.addShape(pres.shapes.DOWN_ARROW, { x: M + 2.5, y: 3.72, w: 0.3, h: 0.34, fill: { color: C.orange }, line: { type: 'none' }, objectName: 'fade|450|arrow' });
  card(s, M, 4.18, 5.3, 2.62, { t: 600 });
  T(s, 'NOW', { x: M + 0.35, y: 4.4, w: 2, h: 0.28, fontSize: 11, bold: true, color: C.otext, charSpacing: 2, objectName: 'up|600|n-l' });
  point(s, ['sync', 'CC and SM: automatic', 'Counted from the Genesys exports.'], M + 0.35, 4.85, 4.75, { t: 700, d: 0.5, hs: 16, th: 0.5 });
  point(s, ['sheet', 'Other departments: exceptions only', 'One template a month: late, absent, leave, days off.'], M + 0.35, 5.78, 4.75, { t: 820, d: 0.5, hs: 16, th: 0.5 });
  pic(s, 'win-xlsx', { x: 6.45, y: 2.05, w: 4.75 }, 90, 'up|350|xlsx');
  pic(s, 'z-templates', { x: 9.45, y: 2.95, h: 3.9 }, 70, 'up|550|tpl');
}

// =============================================================================================== 8. incentive explained
{
  const s = add('LIGHT', 'A month', 'Every bonus explains itself. For any agent, How this was counted shows each KPI with its result, the band reached, the ranking and the points, then the days and the amount. Percent KPIs are rounded to a whole percent before they count, exactly as the old workbook did. And Reconcile lines up the old Excel against the tool, with the reason and a fix for every difference.');
  eyebrow(s, 'Incentive');
  title(s, 'Every bonus explains itself');
  pic(s, 'z-how', { x: M, y: 1.95, h: 4.95 }, 70, 'up|250|shot');
  card(s, 6.05, 2.0, R - 6.05, 1.58, { fill: C.tint, flat: true, line: false, t: 400 });
  T(s, [{ text: '94.96%', options: { color: C.ink } }, { text: '  →  ', options: { color: C.orange } }, { text: '95%', options: { color: C.otext } }], { x: 6.4, y: 2.12, w: R - 6.75, h: 0.75, fontSize: 36, bold: true, objectName: 'up|400|stat' });
  T(s, 'Percent KPIs are rounded to a whole % before they count, exactly as the old workbook did.', { x: 6.4, y: 2.86, w: R - 6.75, h: 0.5, fontSize: 14, color: C.ink2, objectName: 'up|400|stat-t' });
  [['star', 'One set of rules', 'Scorecards, bases and who is eligible, kept by the senior manager; every change logged.'],
    ['eye', 'Every person, step by step', 'Each KPI\'s result, band, ranking and points, then the days and the amount.'],
    ['link', 'Reconcile with the old Excel', 'Every difference with the old file is lined up with its reason and a fix.']]
    .forEach((p, i) => point(s, p, 6.05, 3.95 + i * 1.0, R - 6.05, { t: 600 + i * 150, th: 0.55 }));
}

// =============================================================================================== 9. emails
{
  const s = add('DARK', 'A month', 'The emails are written by the tool and sent by people, from Outlook: the tool never sends anything itself. Every month, the deduction email for review and then final, which lists what changed, plus the absences and incentive emails. Every day, the four brand emails, MC Leaders and the WFM Daily Review. The attachments never carry National IDs.');
  eyebrow(s, 'Emails', true);
  title(s, 'Emails ready to send');
  lead(s, 'The tool writes them; people send them from Outlook. It never sends anything itself.', true, { w: 5.0, h: 0.66 });
  s.addImage({ path: A('glow'), x: 6.2, y: 0.4, w: 7.0, h: 7.0, objectName: 'fade|0|glow', altText: '' });
  const grp = (label, items, y, t) => {
    T(s, label.toUpperCase(), { x: M, y, w: 5, h: 0.28, fontSize: 11, bold: true, color: C.dmuted, charSpacing: 2, objectName: `up|${t}|g` });
    let x = M, yy = y + 0.38;
    items.forEach((c, i) => { const w = 0.4 + c.length * 0.078; if (x + w > 5.8) { x = M; yy += 0.52; } chip(s, c, x, yy, { dark: true, t: t + 60 * i, cw: 0.078, pad: 0.4 }); x += w + 0.12; });
    return yy + 0.42;
  };
  let y = grp('Every month', ['Deduction: review, then final', 'Absences', 'Incentive'], 2.7, 350);
  y = grp('Every day', ['Virgin Postpaid', 'Virgin Mobile', 'FRiENDi Mobile', 'FRiENDi Pay', 'MC Leaders', 'WFM Daily Review'], y + 0.38, 600);
  point(s, ['lock', 'No National IDs in attachments', 'Names only: the agents\' privacy, by default.'], M, y + 0.48, 5.2, { dark: true, bg: C.fill, t: 1000, th: 0.5 });
  pic(s, 'z-email', { x: 6.25, y: 1.95, w: R - 6.25 }, 70, 'up|250|shot');
}

// =============================================================================================== 10. every role
pres.addSection({ title: 'Everyone' });
{
  const s = add('LIGHT', 'Everyone', 'Every role signs in to its own page and sees only what is theirs. The WFM analysts build the month and the daily emails; the WFM manager sends them; the senior manager keeps the rules and finalizes the month; supervisors see their team and their one-to-ones; the quality team brings the Final EVAL; agents see their own results and forms, in English or Arabic, on a phone too.');
  eyebrow(s, 'Every role');
  title(s, 'A page for every role');
  const roles = [['up', 'WFM analyst', 'Builds the month and the daily emails'], ['mail', 'WFM manager', 'Sends the emails; sees the analytics'],
    ['star', 'Senior manager', 'Keeps the rules; finalizes the month'], ['team', 'Supervisor', 'The team, attendance, one-to-ones'],
    ['check', 'Quality team', 'The Final EVAL and critical errors'], ['user', 'Agent', 'Own results, in English or Arabic'], ['lock', 'Admin', 'Accounts and roles']];
  // one row per role, the phones beside them
  roles.forEach(([icon, h, t], i) => {
    const y = 1.95 + i * 0.67, d = 300 + i * 90, cw = 6.55;
    card(s, M, y, cw, 0.58, { t: d, flat: true, r: 0.1 });
    dot(s, icon, M + 0.14, y + 0.09, 0.4, i === 0 ? C.fill : C.ink, 'white', d);
    T(s, h, { x: M + 0.72, y, w: 1.85, h: 0.58, fontSize: 16, bold: true, color: C.ink, valign: 'middle', objectName: `up|${d}|h` });
    T(s, t, { x: M + 2.6, y, w: cw - 2.75, h: 0.58, fontSize: 14, color: C.muted, valign: 'middle', objectName: `up|${d}|t` });
  });
  const fz = size(A('phones-fan')), fw = R - 7.55, fh = fw * (fz.h - 240) / (fz.w - 240);
  pic(s, 'phones-fan', { x: 7.55, y: 1.95 + (4.6 - fh) / 2, w: fw }, 120, 'up|450|phones');
}

// =============================================================================================== 11. the coaching loop
{
  const s = add('LIGHT', 'Everyone', 'The coaching loop is closed inside the tool. Results go to each agent\'s own page. The one-to-one form is filled from the month\'s numbers and fits on one A4 page. The agent adds comments and signs in the tool, after the supervisor. If an agent disagrees with a number, the objection goes to the supervisor and, if needed, to the senior manager, and the answer comes back on the agent\'s page.');
  eyebrow(s, 'Coaching');
  title(s, 'The coaching loop, closed');
  pic(s, 'paper-form', { x: 0.75, y: 2.15, h: 4.6 }, 110, 'up|250|form');
  const nodes = [['chart', 'Results published', 'Each agent sees the month on their own page.'], ['pen', 'One-to-one', 'Filled from the numbers, on one A4 page.'],
    ['check', 'Signed in the tool', 'The agent comments and signs after the supervisor.'], ['handshake', 'Objections answered', 'Supervisor first; the senior manager decides.']];
  const nx = [5.2, 9.43], ny = [2.05, 4.6], nw = 3.3, nh = 2.1, pos = [[0, 0], [1, 0], [1, 1], [0, 1]];
  nodes.forEach(([icon, h, t], i) => {
    const x = nx[pos[i][0]], y = ny[pos[i][1]], d = 450 + i * 220;
    card(s, x, y, nw, nh, { t: d });
    marker(s, i + 1, x + 0.42, y + 0.45, d, 0.42);
    dot(s, icon, x + nw - 0.8, y + 0.22, 0.5, C.ink, 'white', d);
    T(s, h, { x: x + 0.3, y: y + 0.9, w: nw - 0.6, h: 0.38, fontSize: 17, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.3, y: y + 1.3, w: nw - 0.6, h: 0.65, fontSize: 14, color: C.muted, valign: 'top', objectName: `up|${d}|t` });
  });
  const ln = (x, y, w, h, o, d) => s.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: C.orange, width: 2.25, endArrowType: 'triangle' }, ...o, objectName: `fade|${d}|arrow` });
  ln(nx[0] + nw + 0.06, ny[0] + nh / 2, nx[1] - nx[0] - nw - 0.12, 0, {}, 650);
  ln(nx[1] + nw / 2, ny[0] + nh + 0.06, 0, ny[1] - ny[0] - nh - 0.12, {}, 870);
  ln(nx[0] + nw + 0.06, ny[1] + nh / 2, nx[1] - nx[0] - nw - 0.12, 0, { flipH: true }, 1090);
  ln(nx[0] + nw / 2, ny[0] + nh + 0.06, 0, ny[1] - ny[0] - nh - 0.12, { flipV: true }, 1310);
}

// =============================================================================================== 12. every day
{
  const s = add('LIGHT', 'Everyone', 'Daily reporting is built in. Each morning a WFM analyst drops yesterday\'s exports; MC Leaders and the WFM Daily Review are made in the tool, and the four brand emails go straight to the WFM manager, checked and ready for Outlook. Each day is kept in the shared history, so the month to date and the monthly tables fill themselves, and the history can be exported or imported as a file.');
  eyebrow(s, 'Every day');
  title(s, 'Daily reporting, built in');
  const steps = [['up', 'Drop yesterday\'s exports', 'MC Leaders and the WFM Daily Review are made in the tool.'],
    ['mail', 'Four brand emails to send', 'Virgin Postpaid, Virgin Mobile, FRiENDi Mobile and FRiENDi Pay, checked and ready for Outlook.'],
    ['database', 'A history that builds itself', 'Every day kept for the month to date and the monthly tables; out to a file and back.']];
  s.addShape(pres.shapes.LINE, { x: M + 0.28, y: 2.55, w: 0, h: 3.0, line: { color: C.line, width: 2 }, objectName: 'fade|300|rail' });
  steps.forEach((p, i) => point(s, p, M, 2.1 + i * 1.5, 5.0, { t: 350 + i * 180, bg: i === 0 ? C.fill : C.ink, th: 0.8 }));
  pic(s, 'win-builder', { x: 6.0, y: 2.0, w: R - 6.0 }, 90, 'up|250|shot');
}

// =============================================================================================== 13. private by design
pres.addSection({ title: 'Trust' });
{
  const s = add('DARK', 'Trust', 'The data is the most sensitive Member Care has: names, National IDs, results and money. Opened as a file, the page tells the browser to refuse every web address, so nothing can leave by accident. The shared data is encrypted with AES-256 and only accounts made in the tool can open it. Email attachments never carry National IDs. And in October 2026 the tool had a security review: the issues found were fixed and are now covered by tests.');
  eyebrow(s, 'Private by design', true);
  title(s, 'Your data stays yours');
  const tiles = [['0', 'web requests', 'Opened as a file, the browser itself refuses every web address.'], ['AES-256', 'encrypted shared data', 'Only accounts made in the tool can open the files in the folder.'],
    ['No IDs', 'in email attachments', 'National IDs never leave the tool in an email.'], ['Reviewed', 'October 2026', 'A security review: the issues found were fixed and are tested.']];
  tiles.forEach(([big, small, t], i) => {
    const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.3, d = 300 + i * 180;
    card(s, x, y, 5.98, 2.12, { dark: true, t: d });
    T(s, big, { x: x + 0.4, y: y + 0.24, w: 5.2, h: 0.78, fontSize: 44, bold: true, color: i === 0 ? C.orange : C.white, valign: 'top', objectName: `up|${d}|big` });
    T(s, small, { x: x + 0.4, y: y + 1.02, w: 5.2, h: 0.32, fontSize: 15, bold: true, color: C.dink, objectName: `up|${d}|small` });
    T(s, t, { x: x + 0.4, y: y + 1.36, w: 5.2, h: 0.55, fontSize: 14, color: C.dmuted, valign: 'top', objectName: `up|${d}|t` });
  });
  T(s, 'Every change to results, rules and roles is logged with a name and a time.', { x: M, y: 6.55, w: 9, h: 0.3, fontSize: 14, color: C.dmuted, objectName: 'fade|1100|log' });
}

// =============================================================================================== 14. tested
{
  const s = add('LIGHT', 'Trust', 'The tool is tested like a product. The counting rules were checked on ten thousand synthetic people against the previous engine, with the same results. Twenty-four automated browser test suites run on every change. Every role is checked on desktop and phone, light and dark. By default every calculation, email and permission is the same as before unless a setting is changed.');
  eyebrow(s, 'Built to be right');
  title(s, 'Tested like a product');
  const stats = [['10,000', 'synthetic people', 'checked against the previous engine, with the same results'], ['24', 'browser test suites', 'run on every change before it ships'], ['7', 'roles', 'checked on desktop and phone, light and dark']];
  const cw = (R - M - 0.7) / 3;
  stats.forEach(([n, h, t], i) => {
    const x = M + i * (cw + 0.35), d = 300 + i * 200;
    card(s, x, 2.15, cw, 3.55, { t: d });
    T(s, n, { x: x + 0.4, y: 2.5, w: cw - 0.8, h: 1.2, fontSize: 66, bold: true, color: i === 0 ? C.otext : C.ink, objectName: `up|${d}|n` });
    T(s, h, { x: x + 0.4, y: 3.85, w: cw - 0.8, h: 0.4, fontSize: 18, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.4, y: 4.3, w: cw - 0.8, h: 1.0, fontSize: 14, color: C.muted, valign: 'top', objectName: `up|${d}|t` });
  });
  dot(s, 'shield', M, 6.08, 0.5, C.ink, 'white', 900);
  T(s, 'Every calculation, email template and permission is the same as before, unless a setting is changed.', { x: M + 0.7, y: 6.1, w: 10.5, h: 0.46, fontSize: 15, color: C.ink2, valign: 'middle', objectName: 'up|900|same' });
}

// =============================================================================================== 15. what changes
pres.addSection({ title: 'Close' });
{
  const s = add('LIGHT', 'Close', 'In one view, what changes for Member Care: files are gathered in one drop instead of by hand; problems are caught before anything is built; any bonus can be explained in a click; emails arrive as ready drafts without National IDs; and the month no longer lives in one person\'s spreadsheets: it is shared, locked, backed up, and covered when someone is on vacation.');
  eyebrow(s, 'What it means');
  title(s, 'What changes for Member Care');
  const hd = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: o.fill || C.ink }, fontSize: 14, fontFace: FONT, valign: 'middle', margin: [0.08, 0.2, 0.08, 0.2] } });
  const c = (t, o = {}) => ({ text: t, options: { color: o.color || C.ink2, bold: !!o.bold, fontSize: 14, fontFace: FONT, fill: { color: o.fill || C.white }, valign: 'middle', margin: [0.08, 0.2, 0.08, 0.2] } });
  const rows = [['Gathering the files', 'Each file found and joined by hand', 'One drop, each file recognised'], ['Checking', 'Mistakes found after the emails went out', 'Checks before anything is built'],
    ['Explaining a bonus', 'Worked out again on request', 'Every person\'s breakdown in one click'], ['Emails', 'Tables and attachments put together by hand', 'Ready drafts, no National IDs'],
    ['Continuity', 'The month lived in one person\'s files', 'Shared, locked, backed up, vacation cover']];
  s.addTable([[hd(''), hd('Before'), hd('With the tool', { fill: C.fill })], ...rows.map((r, i) => [c(r[0], { bold: true, color: C.ink, fill: i % 2 ? C.white : 'F8F8FA' }), c(r[1], { color: C.muted, fill: i % 2 ? C.white : 'F8F8FA' }), c(r[2], { bold: true, color: C.ink, fill: i % 2 ? C.white : 'F8F8FA' })])],
    { x: M, y: 2.05, w: R - M, colW: [2.9, 4.5, R - M - 7.4], rowH: [0.55, 0.78, 0.78, 0.78, 0.78, 0.78], border: { type: 'solid', color: C.line, pt: 0.75 }, objectName: 'up|300|table' });
}

// =============================================================================================== 16. how we start
{
  const s = add('COVER', 'Close', 'The tool is ready for the October close. Three steps: put the HTML in the common folder next to MC Data, read-only for everyone but its owner; open it in Edge or Chrome; each person makes an account and the admin gives the roles. Thank you, and questions.');
  s.addImage({ path: A('glow'), x: 5.6, y: -0.2, w: 7.8, h: 7.8, objectName: 'fade|0|glow', altText: '' });
  pic(s, 'laptop-dark', { x: 7.0, y: 1.6, w: 5.6 }, 90, 'up|250|laptop');
  T(s, 'NEXT STEPS', { x: 0.85, y: 0.95, w: 5, h: 0.3, fontSize: 11, bold: true, color: C.orange, charSpacing: 2, objectName: 'fade|0|eyebrow' });
  T(s, [{ text: 'Ready for the', options: { breakLine: true } }, { text: 'October close' }], { x: 0.85, y: 1.35, w: 5.9, h: 1.6, fontSize: 44, bold: true, color: C.white, valign: 'top', lineSpacingMultiple: 0.92, objectName: 'up|100|title' });
  [['Put the HTML in the common folder', 'next to MC Data, read-only for everyone but its owner.'], ['Open it in Edge or Chrome', 'nothing to install, no server.'], ['Everyone makes an account', 'the admin gives each person their role.']].forEach(([h, t], i) => {
    const y = 3.4 + i * 1.02, d = 300 + i * 160;
    s.addShape(pres.shapes.OVAL, { x: 0.85, y, w: 0.52, h: 0.52, fill: { color: i === 0 ? C.fill : C.card2 }, line: { type: 'none' }, objectName: `up|${d}|n${i}` });
    T(s, String(i + 1), { x: 0.85, y, w: 0.52, h: 0.52, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|n${i}t` });
    T(s, h, { x: 1.6, y: y - 0.04, w: 5.0, h: 0.34, fontSize: 17, bold: true, color: C.white, objectName: `up|${d}|h${i}` });
    T(s, t, { x: 1.6, y: y + 0.3, w: 5.0, h: 0.32, fontSize: 14, color: C.dmuted, objectName: `up|${d}|t${i}` });
  });
  T(s, 'Thank you', { x: 0.85, y: 6.65, w: 4, h: 0.4, fontSize: 16, bold: true, color: C.orange, objectName: 'fade|900|thanks' });
}

// ---- write, then the theme, the transitions and the motion (pptxgenjs writes neither)
const tn = { n: 0 }, nid = () => ++tn.n;
const set = (spid) => `<p:set><p:cBhvr><p:cTn id="${nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
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
    list.push({ spid: id, fx, delay: +delay }); if (/<p:nvSpPr>\s*$/.test(src.slice(Math.max(0, at - 40), at))) sps.push(id);   // a shape (not a picture or a table) gets its build entry
    return `<p:cNvPr id="${id}" name="${name}"`;
  });
  list.sort((a, b) => a.delay - b.delay);
  const trans = '<p:transition spd="med"><p:fade/></p:transition>';
  return xml.replace('</p:sld>', `${trans}${list.length ? timing(list, [...new Set(sps)]) : ''}</p:sld>`);
}
function theme(xml) {
  const c = THEME.colors;
  xml = xml.replace(/<a:clrScheme name="[^"]*">[\s\S]*?<\/a:clrScheme>/, `<a:clrScheme name="${THEME.name}"><a:dk1><a:srgbClr val="${c.dk1}"/></a:dk1><a:lt1><a:srgbClr val="${c.lt1}"/></a:lt1>${['dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(k => `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`).join('')}</a:clrScheme>`);
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
