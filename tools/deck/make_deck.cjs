// The launch deck: Cadence introduced as a new product, for the management team. It tells the idea and what Member Care gets
// from it (the hook, the challenge, the idea, what Member Care gets: time back, right the first time, fairness people can see;
// every role, the coaching loop, continuity, trust, proof, what changes, and what comes next), with a messaging framework (the
// main message, the value proposition, key messages with their proof, a message for every role) and plain copy. It never
// explains how files go in or out: the room hears the idea and the benefits.
// On the Beyond One template the team's decks are made with (the decks the tool makes have the same look: js/bodeck.js): the cover
// is the template's title slide; every other slide has the moving logo at the top left, its section in small capitals beside a
// square at the top right, CONFIDENTIAL and its number at the foot, and its title in capitals with the words that matter in bold;
// Poppins; flat boxes in the template's colours; hairline's line figures (vendor/hairline.js) as illustrations; dark slides for
// the emails, for privacy and to close.
// The tool is shown large enough to read: close-ups of its screens, the dashboard with its parts pointed out, and the roles' own
// pages (tools/deck/shots.cjs and art.cjs, synthetic data only). Motion: every slide fades in and its parts rise in one after another.
// Usage: node tools/deck/make_deck.cjs artDir out.pptx   (needs pptxgenjs: npm i pptxgenjs)
const fs = require('node:fs'), path = require('node:path');
const Pptx = require('pptxgenjs');
const ROOT = path.join(__dirname, '..', '..');
const Core = require(path.join(ROOT, 'js', 'core.js'));
const [artDir, outFile] = process.argv.slice(2);
const A = n => path.join(artDir, n.endsWith('.png') ? n : n + '.png');
const LOGO = n => path.join(ROOT, 'assets', 'brand', `beyond-one-${n}.gif`);   // the template's stacked logo, moving as the company's own (a GIF PowerPoint plays)
const size = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

// the template's colours (its theme "Beyond") and its dark grey, with the greys the tool's pages use beside them
const C = { ink: '080808', char: '323131', edge: '4A4949', white: 'FFFFFF', ink2: '262626', muted: '595959', faint: '8C8C8C', line: 'E4E4E7', soft: 'F4F4F5', row: 'F8F8FA',
  dmuted: 'BFBFBF', blue: '0D76BD', btext: '0B65A3', bsoft: 'E7F1F9', pink: 'F6ADCC', lav: '9693C8', orange: 'ED7D31', teal: '0C7B6C', tealBlue: '007FA2', red: 'ED1C24', lilac: 'BF9DCA' };
const THEME = { name: 'Beyond', head: 'Poppins', body: 'Poppins',
  colors: { dk1: C.ink, lt1: C.white, dk2: C.blue, lt2: C.pink, accent1: C.lav, accent2: C.orange, accent3: C.teal, accent4: C.tealBlue, accent5: C.red, accent6: C.lilac, hlink: '00DFED', folHlink: '778DA5' } };
const W = 13.333, M = 0.45, R = W - M, FONT = 'Poppins', LIGHT = 'Poppins Light';
const pres = new Pptx(); pres.layout = 'LAYOUT_WIDE';
pres.title = 'Cadence'; pres.subject = 'Introducing Cadence: Member Care\'s month end, in one place'; pres.author = 'Member Care WFM team'; pres.company = 'Member Care';
pres.theme = { headFontFace: THEME.head, bodyFontFace: THEME.body };

// ---- layouts, as the template has them: light and dark content slides (the title in the same place on every one), a split slide
// with the black panel, the cover and the last slide. The logo, the square, CONFIDENTIAL and the number are on the layouts.
const logo = dark => ({ image: { x: 0.40, y: 0.30, w: 0.42, h: 0.64, path: LOGO(dark ? 'stacked-white' : 'stacked-black') } });
const square = dark => ({ rect: { x: 12.76, y: 0.335, w: 0.15, h: 0.15, fill: { color: dark ? C.white : C.ink } } });
const panel = w => ({ rect: { x: 0, y: 0, w, h: 7.5, fill: { color: C.ink } } });
const conf = c => ({ text: { text: 'CONFIDENTIAL', options: { x: 0.40, y: 7.10, w: 3.5, h: 0.22, fontSize: 7, color: c, fontFace: FONT, charSpacing: 1.4, margin: 0, valign: 'middle' } } });
const num = c => ({ x: 11.91, y: 7.10, w: 1.0, h: 0.22, fontSize: 7, color: c, fontFace: FONT, align: 'right' });
const titlePh = (dark, x = M, w = R - M, h = 0.62, size = 28) => ({ placeholder: { options: { name: 'title', type: 'title', x, y: 1.04, w, h, fontSize: size, bold: false, fontFace: FONT, color: dark ? C.white : C.ink, align: 'left', valign: 'top', margin: 0 }, text: '' } });
pres.defineSlideMaster({ title: 'LIGHT', background: { color: C.white }, objects: [logo(false), square(false), conf(C.muted), titlePh(false)], slideNumber: num(C.muted) });
pres.defineSlideMaster({ title: 'DARK', background: { color: C.char }, objects: [logo(true), square(true), conf(C.dmuted), titlePh(true)], slideNumber: num(C.dmuted) });
pres.defineSlideMaster({ title: 'SPLIT', background: { color: C.white }, objects: [panel(5.15), logo(true), square(false), conf(C.dmuted), titlePh(false, 6.0, R - 6.0, 1.3)], slideNumber: num(C.muted) });
pres.defineSlideMaster({ title: 'COVER', background: { color: C.white }, objects: [panel(4.25), { image: { x: 1.436, y: 2.70, w: 1.378, h: 2.10, path: LOGO('stacked-white') } }, square(false), conf(C.dmuted)] });
pres.defineSlideMaster({ title: 'END', background: { color: C.ink }, objects: [logo(true), square(true), conf(C.dmuted), titlePh(true, M, 6.6, 1.3, 36)] });

// ---- pieces. An object's name says how it comes in and when: 'up|300|…' rises in 300 ms after the slide, 'fade|0|…' fades in
const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, ...o });
const ALT = { 'laptop-dark': 'The dashboard, in dark, on a laptop', 'hero-dash': 'The dashboard: shortcuts, the month at a glance, the month close and the bell',
  'z-import': 'Import: the four Genesys exports recognised and ready', 'z-checks': 'Checks: what needs a decision before anything counts', 'z-email': 'The deduction email for review, ready to copy into Outlook',
  'z-templates': 'Attendance templates: one for each department', 'z-how': 'How this was counted, for one agent: each KPI, its band, ranking and points', 'win-xlsx': 'An attendance template open on How to fill',
  'win-builder': 'WFM team, Report builder', 'win-team': 'A supervisor\'s own team', 'win-agent-ar': 'An agent\'s own page, in Arabic', 'paper-form': 'A one-to-one form on one A4 page' };
/** a picture whose visible part (inside `pad` transparent pixels kept for its shadow) is put at x, y with width w (or height h) */
function pic(s, n, b, pad, name) {
  const z = size(A(n)), vw = z.w - 2 * pad, vh = z.h - 2 * pad, k = b.w ? b.w / vw : b.h / vh;
  s.addImage({ path: A(n), x: b.x - pad * k, y: b.y - pad * k, w: z.w * k, h: z.h * k, objectName: name, altText: ALT[n] ?? '' });
  return { x: b.x, y: b.y, w: vw * k, h: vh * k, k };
}
/** a title as the template writes it: in capitals, the words between * * in bold (else the last word) */
function runs(t) {
  const up = String(t).toUpperCase();
  if (up.includes('*')) return up.split('*').map((text, i) => ({ text, options: { bold: i % 2 === 1 } })).filter(r => r.text);
  const w = up.trim().split(/\s+/), last = w.pop();
  return [...(w.length ? [{ text: w.join(' ') + ' ', options: { bold: false } }] : []), { text: last, options: { bold: true } }];
}
/** the slide's section, in small capitals at the top right, beside the template's square */
const eyebrow = (s, text, dark) => T(s, text.toUpperCase(), { x: 5.30, y: 0.30, w: 7.32, h: 0.22, fontSize: 7, color: dark ? C.white : C.ink, charSpacing: 1.4, align: 'right', valign: 'middle', objectName: 'fade|0|section' });
const title = (s, text) => s.addText(runs(text), { placeholder: 'title' });
const lead = (s, text, dark, o = {}) => T(s, text, { x: o.x ?? M, y: o.y ?? 1.78, w: o.w ?? 7.6, h: o.h ?? 0.62, fontSize: 15, fontFace: LIGHT, color: dark ? C.dmuted : C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${o.t ?? 180}|lead` });
/** the template's pixel squares: [x, y, side, colour] */
const pixels = (s, list, t = 0) => list.forEach(([x, y, w, c], i) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: w, fill: { color: c }, line: { type: 'none' }, objectName: `fade|${t + i * 60}|pixel` }));
/** a flat box, as the template's: pale grey on the light slides, black on the dark ones; a pixel of colour at its corner if asked */
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || (o.dark ? C.ink : C.soft) }, line: o.line ? { color: o.dark ? C.edge : C.line, width: 0.75 } : { type: 'none' }, objectName: o.name || `up|${o.t ?? 300}|card` });
  if (o.px) s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.12, h: 0.12, fill: { color: o.px }, line: { type: 'none' }, objectName: `up|${o.t ?? 300}|pixel` });
}
/** an icon in a square of colour, the template's pixel */
function dot(s, icon, x, y, d, bg, fg, t) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: d, h: d, fill: { color: bg }, line: { type: 'none' }, objectName: `up|${t}|dot-${icon}` });
  s.addImage({ path: A(`icon-${icon}-${fg}`), x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: `up|${t}|icon-${icon}`, altText: '' });
}
/** an icon in its square, a bold line and the words under it */
function point(s, [icon, head, text], x, y, w, o = {}) {
  const d = o.d ?? 0.56, t = o.t ?? 300, dark = !!o.dark;
  dot(s, icon, x, y, d, o.bg || C.ink, o.fg || 'white', t);
  T(s, head, { x: x + d + 0.24, y: y - 0.03, w: w - d - 0.24, h: 0.36, fontSize: o.hs ?? 16, bold: true, color: dark ? C.white : C.ink, objectName: `up|${t}|h` });
  T(s, text, { x: x + d + 0.24, y: y + 0.36, w: w - d - 0.24, h: o.th ?? 0.66, fontSize: o.ts ?? 13, color: dark ? C.dmuted : C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${t}|t` });
}
/** a numbered marker in the template's blue */
function marker(s, n, cx, cy, t, d = 0.4) {
  s.addShape(pres.shapes.RECTANGLE, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: C.blue }, line: { color: C.white, width: 1.5 }, objectName: `up|${t}|m${n}` });
  T(s, String(n), { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${t}|m${n}t` });
}
/** a word in a box; returns its width */
function chip(s, text, x, y, o = {}) {
  const w = (o.pad ?? 0.4) + text.length * (o.cw ?? 0.092);
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.4, fill: { color: o.fill || (o.dark ? C.ink : C.white) }, line: { color: o.dark ? C.edge : C.line, width: 0.75 }, objectName: `up|${o.t ?? 400}|chip` });
  T(s, text, { x, y, w, h: 0.4, fontSize: 12, color: o.color || (o.dark ? C.white : C.ink), align: 'center', valign: 'middle', objectName: `up|${o.t ?? 400}|chip-t` });
  return w;
}
const slides = [];
const add = (layout, sec, notes) => { const s = pres.addSlide({ masterName: layout, sectionTitle: sec }); s.addNotes(notes); slides.push(s); return s; };

/** one of hairline's line figures at rest (art.cjs renders them, light and dark), as a picture with no words of its own */
const fig = (s, name, b, dark, t) => pic(s, `fig-${name}-${dark ? 'dark' : 'light'}`, b, 0, `up|${t ?? 300}|fig-${name}`);

// =============================================================================================== 1. cover: the template's title slide
pres.addSection({ title: 'Launch' });
{
  const s = add('COVER', 'Launch', 'Introducing Cadence: Member Care\'s month, in one place. One shared place where every role works from the same numbers, every number is settled before it counts, and every result is explained to the person it touches. In the next minutes: the problem, the idea, what Member Care gets, every role, trust, and what comes next.');
  s.addShape(pres.shapes.RECTANGLE, { x: 5.05, y: 1.30, w: 5.70, h: 3.95, fill: { color: C.lav }, line: { type: 'none' }, objectName: 'fade|0|title-box' });
  pixels(s, [[4.60, 0.88, 0.52, C.red], [9.10, 0.60, 0.26, C.pink], [4.52, 4.78, 0.86, C.tealBlue], [11.40, 5.70, 0.32, C.teal], [12.20, 1.62, 0.13, C.blue], [11.05, 4.98, 0.17, C.orange]], 150);
  T(s, [{ text: 'INTRODUCING', options: { fontSize: 13, bold: true, charSpacing: 3, breakLine: true } }, { text: 'CADENCE', options: { fontSize: 50, bold: true, breakLine: true } }, { text: 'MEMBER CARE PERFORMANCE', options: { fontSize: 13, charSpacing: 2 } }], { x: 5.42, y: 1.62, w: 5.0, h: 2.2, color: C.white, valign: 'top', objectName: 'up|120|title' });
  T(s, 'Member Care\'s month, in one place.', { x: 5.42, y: 3.95, w: 5.0, h: 1.05, fontSize: 14, color: C.white, valign: 'bottom', objectName: 'up|260|sub' });
  T(s, 'November 2026', { x: 6.2, y: 6.18, w: 6.7, h: 0.32, fontSize: 12, bold: true, color: C.ink, align: 'right', objectName: 'fade|600|date' });
  T(s, 'Member Care · WFM team', { x: 6.2, y: 6.52, w: 6.7, h: 0.3, fontSize: 10, color: C.muted, align: 'right', objectName: 'fade|600|who' });
}

// =============================================================================================== 2. the idea in one line
{
  const s = add('LIGHT', 'Launch', 'The idea in one line: Member Care\'s month, in one place. One shared truth for the whole month: the numbers every role works from, settled before they count, and explained to the person they touch. Three promises: one truth for every role, right before it counts, and every number explained.');
  eyebrow(s, 'The idea');
  title(s, 'Member Care\'s month, *in one place*');
  lead(s, 'One shared truth for the whole month: the numbers every role works from, settled before they count, and explained to the person they touch.', false, { w: 5.7, h: 1.0 });
  [['team', 'One truth for every role', 'Seven roles on the same numbers, the same day.'], ['check', 'Right before it counts', 'Questions settled before anything goes out.'], ['eye', 'Every number explained', 'Anyone can see how a result was reached.']]
    .forEach((p, i) => point(s, p, M, 3.05 + i * 1.12, 5.7, { t: 400 + i * 150, th: 0.55, bg: i ? C.ink : C.blue }));
  pic(s, 'laptop-dark', { x: 6.6, y: 2.05, w: 6.1 }, 90, 'up|250|laptop');
  let x = M;
  for (const [i, c] of ['A page for every role', 'Works offline', 'Encrypted'].entries()) x += chip(s, c, x, 6.45, { t: 1000 + i * 100 }) + 0.12;
}

// =============================================================================================== 3. the challenge
{
  const s = add('SPLIT', 'Launch', 'Month end used to run on people and spreadsheets: numbers from more than ten places, joined by hand, for seven roles waiting on one deadline. Skilled people spent their month assembling instead of improving service; a question about a bonus meant reopening the spreadsheets; and when one person was away, the month waited.');
  pixels(s, [[4.93, 1.05, 0.44, C.red], [4.80, 5.85, 0.26, C.pink], [5.38, 6.45, 0.13, C.blue]], 100);
  [['10+', 'sources of numbers'], ['7', 'roles on the same numbers'], ['1', 'deadline for all of it']].forEach(([n, l], i) => {
    const y = 1.45 + i * 1.85, t = 200 + i * 160;
    T(s, n, { x: 0.85, y, w: 3.6, h: 1.05, fontSize: 64, bold: true, color: i === 2 ? C.pink : C.white, valign: 'top', objectName: `up|${t}|n${i}` });
    T(s, l, { x: 0.85, y: y + 1.08, w: 3.8, h: 0.4, fontSize: 15, fontFace: LIGHT, color: C.dmuted, objectName: `up|${t}|l${i}` });
  });
  eyebrow(s, 'The challenge');
  title(s, 'Month end ran on *people and spreadsheets*');
  [['clock', 'Hours spent assembling', 'Skilled people joined and checked numbers instead of improving service.'],
    ['help', 'Hard to explain, easy to dispute', 'A question about pay meant reopening the spreadsheets.'],
    ['user', 'The month lived with one person', 'When they were away, the month waited.']]
    .forEach((p, i) => point(s, p, 6.0, 2.75 + i * 1.32, R - 6.0, { t: 400 + i * 150 }));
}

// =============================================================================================== 4. the idea on screen: the dashboard, pointed out
{
  const s = add('LIGHT', 'Launch', 'This is the idea on screen: everyone opens the same month. One: what this person does next, one click away. Two: the month at a glance, each number against the month before. Three: the month close, step by step, and whose turn it is. Four: the bell keeps each person\'s deadlines, so nobody has to chase anyone.');
  eyebrow(s, 'The idea');
  title(s, 'Everyone on *the same month*');
  const H = JSON.parse(fs.readFileSync(path.join(artDir, 'hero.json'), 'utf8')), B = H.boxes, css = B.view.width;
  const win = pic(s, 'hero-dash', { x: M, y: 1.95, w: 7.55 }, H.pad, 'up|200|hero');
  const k = win.w / H.winW, X = x => win.x + x * (H.winW / css) * k, Y = y => win.y + (H.bar + y * (H.winW / css)) * k, cap = y => Math.min(y, B.view.height - 10);
  const out = (b, t, g = 0.03) => s.addShape(pres.shapes.RECTANGLE, { x: X(b.x) - g, y: Y(b.y) - g, w: X(b.x + b.w) - X(b.x) + 2 * g, h: Y(cap(b.y + b.h)) - Y(b.y) + 2 * g, fill: { type: 'none' }, line: { color: C.blue, width: 2 }, objectName: `fade|${t}|frame` });
  const pts = [[B.acts, 'Next, for your role', 'What this person does next, one click away.'], [B.kpis, 'The month at a glance', 'Every number with its trend.'],
    [B.close, 'The month close', 'Each step, done or due, and whose turn it is.'], [B.bell, 'Nobody chases', 'Each person\'s own deadlines, in the bell.']];
  pts.forEach(([b, h, t], i) => {
    const d = 700 + i * 260;
    if (b) { out(b, d, b === B.bell ? 0.04 : 0.03); if (b === B.bell) marker(s, i + 1, X(b.x) - 0.28, Y(b.y + b.h / 2), d, 0.34); else marker(s, i + 1, X(b.x) - 0.03, Y(b.y) - 0.03, d, 0.34); }
    const y = 2.05 + i * 1.12;
    marker(s, i + 1, 8.85, y + 0.17, d, 0.38);
    T(s, h, { x: 9.25, y: y - 0.02, w: R - 9.25, h: 0.36, fontSize: 16, bold: true, color: C.ink, objectName: `up|${d}|h${i}` });
    T(s, t, { x: 9.25, y: y + 0.36, w: R - 9.25, h: 0.62, fontSize: 13, color: C.muted, valign: 'top', objectName: `up|${d}|t${i}` });
  });
}

// =============================================================================================== 5. what Member Care gets
pres.addSection({ title: 'Benefits' });
{
  const s = add('LIGHT', 'Benefits', 'What Member Care gets, in six parts: time back for people; fewer errors and fewer disputes; fairness everyone can see; the month at a glance for every manager; no single point of failure; and privacy by design. Each is something the team can feel in the first month.');
  eyebrow(s, 'What Member Care gets');
  title(s, 'What Member Care *gets*');
  const L = [['clock', 'Time back for people', 'The hours that went into assembling numbers go back to coaching, quality and service.'],
    ['target', 'Fewer errors and disputes', 'Problems are settled before anything goes out, so fewer corrections follow.'],
    ['eye', 'Fairness people can see', 'Every bonus explains itself; the same rules for everyone; agents see their own.'],
    ['chart', 'The month at a glance', 'Managers see where the close stands, what is late and who is next.'],
    ['sync', 'No single point of failure', 'Shared, saved and covered during holidays: never one person\'s spreadsheet.'],
    ['shield', 'Private by design', 'The data stays on our own computers, encrypted; each role sees only its own.']];
  const cw = (R - M - 0.5) / 3, ch = 2.1;
  L.forEach(([icon, h, t], i) => {
    const x = M + (i % 3) * (cw + 0.25), y = 2.0 + Math.floor(i / 3) * (ch + 0.25), d = 300 + i * 120, on = i === 0;
    card(s, x, y, cw, ch, { t: d, fill: on ? C.blue : C.soft });
    dot(s, icon, x + 0.3, y + 0.3, 0.52, on ? C.white : C.ink, on ? 'blue' : 'white', d);
    T(s, h, { x: x + 0.3, y: y + 1.0, w: cw - 0.6, h: 0.38, fontSize: 17, bold: true, color: on ? C.white : C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.3, y: y + 1.4, w: cw - 0.6, h: 0.62, fontSize: 12.5, color: on ? C.white : C.muted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${d}|t` });
  });
}

// =============================================================================================== 6. time back
{
  const s = add('DARK', 'Benefits', 'Time back is the first thing the team will feel. The measure is simple: the people in a role, times the hours each gives month end today, minus the hours with Cadence. We measure it with the team\'s own numbers in the first month. Analysts move from assembling to analysis, supervisors from paperwork to coaching, managers from chasing to deciding.');
  eyebrow(s, 'Time back', true);
  title(s, 'Time back for *people*');
  lead(s, 'Measured with the team\'s own numbers in the first month.', true, { w: 7.0, h: 0.5 });
  card(s, M, 2.6, R - M, 1.25, { dark: true, fill: C.ink, t: 300 });
  T(s, [{ text: 'Hours back  =  ', options: { bold: true, color: C.white } }, { text: 'people  ×  ( hours today  −  hours with Cadence )', options: { color: C.dmuted } }], { x: M + 0.4, y: 2.6, w: R - M - 0.8, h: 1.25, fontSize: 24, valign: 'middle', objectName: 'up|300|formula' });
  const L = [['team', 'WFM analysts', 'From assembling', 'to analysis', 'The month\'s numbers come together and are checked for them.'],
    ['pen', 'Supervisors', 'From paperwork', 'to coaching', 'The one-to-one fills itself from the month\'s numbers.'],
    ['star', 'Managers', 'From chasing', 'to deciding', 'Where the close stands and who is next, at a glance.']];
  const cw = (R - M - 0.5) / 3;
  L.forEach(([icon, who, a, b, more], i) => {
    const x = M + i * (cw + 0.25), d = 500 + i * 160, on = i === 0;
    card(s, x, 4.15, cw, 2.55, { dark: true, fill: on ? C.blue : C.ink, t: d });
    dot(s, icon, x + 0.3, 4.45, 0.5, on ? C.white : C.edge, on ? 'blue' : 'white', d);
    T(s, who, { x: x + 0.3, y: 5.1, w: cw - 0.6, h: 0.4, fontSize: 18, bold: true, color: C.white, objectName: `up|${d}|w` });
    T(s, [{ text: a + ' ', options: { color: on ? C.white : C.dmuted } }, { text: b, options: { bold: true, color: C.white } }], { x: x + 0.3, y: 5.55, w: cw - 0.6, h: 0.4, fontSize: 16, valign: 'top', objectName: `up|${d}|t` });
    T(s, more, { x: x + 0.3, y: 6.02, w: cw - 0.6, h: 0.55, fontSize: 12.5, color: on ? C.white : C.dmuted, valign: 'top', lineSpacingMultiple: 1.05, objectName: `up|${d}|more` });
  });
}

// =============================================================================================== 7. right the first time
{
  const s = add('LIGHT', 'Benefits', 'Right the first time. Problems surface before anything counts: the questions that matter hold the month until someone decides, and every decision is kept with who made it and when. So fewer corrections follow the emails, and fewer surprises reach agents.');
  eyebrow(s, 'Right the first time');
  title(s, 'Settled *before it counts*');
  pic(s, 'z-checks', { x: M, y: 2.0, h: 4.75 }, 70, 'up|250|shot');
  T(s, 'Problems are settled before a number reaches a payslip or an email.', { x: 8.55, y: 2.0, w: R - 8.55, h: 1.3, fontSize: 20, bold: true, color: C.ink, valign: 'top', lineSpacingMultiple: 1.05, objectName: 'up|450|claim' });
  [['target', 'Decided first', 'Nothing counts until someone decides.'], ['user', 'Every decision kept', 'Who decided, and when.'], ['check', 'One version', 'The same month for everyone.']]
    .forEach((p, i) => point(s, p, 8.55, 3.75 + i * 1.02, R - 8.55, { t: 650 + i * 150, d: 0.5, hs: 15, ts: 12.5, th: 0.5, bg: i ? C.ink : C.blue }));
}

// =============================================================================================== 8. fairness people can see
{
  const s = add('LIGHT', 'Benefits', 'Fairness people can see. For any agent, every result explains itself: each KPI with its result, band, ranking and points, then the days and the amount. The same rules apply to everyone, kept by the senior manager with every change logged, and agents see their own results. A question about pay is answered in a click.');
  eyebrow(s, 'Fairness');
  title(s, 'Fairness people *can see*');
  pic(s, 'z-how', { x: M, y: 1.95, h: 4.95 }, 70, 'up|250|shot');
  card(s, 6.05, 2.0, R - 6.05, 1.58, { fill: C.blue, t: 400 });
  T(s, '94.96%  →  95%', { x: 6.4, y: 2.12, w: R - 6.75, h: 0.75, fontSize: 34, bold: true, color: C.white, objectName: 'up|400|stat' });
  T(s, 'The same rounding for everyone, shown in every result.', { x: 6.4, y: 2.86, w: R - 6.75, h: 0.5, fontSize: 13, color: C.white, objectName: 'up|400|stat-t' });
  [['star', 'One set of rules', 'Kept by the senior manager; every change logged.'],
    ['eye', 'Every person, step by step', 'Each KPI, band, ranking and points, then the days and the amount.'],
    ['user', 'Agents see their own', 'Their own results, explained, in English or Arabic.']]
    .forEach((p, i) => point(s, p, 6.05, 3.95 + i * 1.0, R - 6.05, { t: 600 + i * 150, th: 0.55 }));
}

// =============================================================================================== 9. every role
pres.addSection({ title: 'Everyone' });
{
  const s = add('LIGHT', 'Everyone', 'Every role gets a better month, on its own page, seeing only what is theirs. WFM analysts spend their time on analysis; the WFM manager sends checked numbers on time; the senior manager sees the whole close and decides with every number explained; supervisors coach from the month\'s own numbers; the quality team enters quality once; agents see and understand their own results; and the admin gives each person their role.');
  eyebrow(s, 'Every role');
  title(s, 'A better month for *every role*');
  const roles = [['up', 'WFM analyst', 'Time for analysis, not assembling'], ['mail', 'WFM manager', 'Checked numbers, sent on time'],
    ['star', 'Senior manager', 'The whole close, every number explained'], ['team', 'Supervisor', 'More coaching, less paperwork'],
    ['check', 'Quality team', 'Quality entered once, counted everywhere'], ['user', 'Agent', 'Own results, understood, English or Arabic'], ['lock', 'Admin', 'Each person in their role']];
  roles.forEach(([icon, h, t], i) => {
    const y = 1.95 + i * 0.67, d = 300 + i * 90, cw = 6.7;
    card(s, M, y, cw, 0.58, { t: d });
    dot(s, icon, M + 0.09, y + 0.09, 0.4, i === 0 ? C.blue : C.ink, 'white', d);
    T(s, h, { x: M + 0.72, y, w: 1.9, h: 0.58, fontSize: 15, bold: true, color: C.ink, valign: 'middle', objectName: `up|${d}|h` });
    T(s, t, { x: M + 2.65, y, w: cw - 2.8, h: 0.58, fontSize: 13, color: C.muted, valign: 'middle', objectName: `up|${d}|t` });
  });
  pic(s, 'win-team', { x: 7.55, y: 1.95, w: 4.6 }, 90, 'up|450|team');
  pic(s, 'win-agent-ar', { x: R - 4.6, y: 3.6, w: 4.6 }, 90, 'up|650|agent');
}

// =============================================================================================== 10. the coaching loop
{
  const s = add('LIGHT', 'Everyone', 'The coaching loop is closed in one place. Results reach each agent\'s own page; the one-to-one is filled from the month\'s numbers and fits on one A4 page; the agent comments and signs after the supervisor; and if an agent disagrees with a number, the supervisor answers first and the senior manager decides. Better conversations, on the same facts.');
  eyebrow(s, 'Coaching');
  title(s, 'The coaching loop, *closed*');
  pic(s, 'paper-form', { x: 0.75, y: 2.15, h: 4.6 }, 110, 'up|250|form');
  const nodes = [['chart', 'Results shared', 'Each agent sees the month on their own page.'], ['pen', 'One-to-one', 'Filled from the numbers, on one A4 page.'],
    ['check', 'Signed together', 'The agent comments and signs after the supervisor.'], ['handshake', 'Questions answered', 'Supervisor first; the senior manager decides.']];
  const nx = [5.2, 9.5], ny = [2.05, 4.6], nw = 3.3, nh = 2.1, pos = [[0, 0], [1, 0], [1, 1], [0, 1]];
  nodes.forEach(([icon, h, t], i) => {
    const x = nx[pos[i][0]], y = ny[pos[i][1]], d = 450 + i * 220;
    card(s, x, y, nw, nh, { t: d });
    marker(s, i + 1, x + 0.42, y + 0.45, d, 0.42);
    dot(s, icon, x + nw - 0.8, y + 0.22, 0.5, C.ink, 'white', d);
    T(s, h, { x: x + 0.3, y: y + 0.9, w: nw - 0.6, h: 0.38, fontSize: 16, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.3, y: y + 1.3, w: nw - 0.6, h: 0.65, fontSize: 13, color: C.muted, valign: 'top', objectName: `up|${d}|t` });
  });
  const ln = (x, y, w, h, o, d) => s.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: C.blue, width: 2.25, endArrowType: 'triangle' }, ...o, objectName: `fade|${d}|arrow` });
  ln(nx[0] + nw + 0.06, ny[0] + nh / 2, nx[1] - nx[0] - nw - 0.12, 0, {}, 650);
  ln(nx[1] + nw / 2, ny[0] + nh + 0.06, 0, ny[1] - ny[0] - nh - 0.12, {}, 870);
  ln(nx[0] + nw + 0.06, ny[1] + nh / 2, nx[1] - nx[0] - nw - 0.12, 0, { flipH: true }, 1090);
  ln(nx[0] + nw / 2, ny[0] + nh + 0.06, 0, ny[1] - ny[0] - nh - 0.12, { flipV: true }, 1310);
}

// =============================================================================================== 11. no single point of failure
{
  const s = add('LIGHT', 'Everyone', 'The month never waits on one person. Every role shares the same month, it is saved as the work happens, and when someone is on holiday a colleague covers their pages until they are back. Everyone sees where the close stands, so nobody has to chase anyone.');
  eyebrow(s, 'Continuity');
  title(s, 'A month that never waits *on one person*');
  [['team', 'Shared by every role', 'One month, one set of numbers, for everyone who needs it.'], ['database', 'Saved as the work happens', 'Nothing lives in one person\'s spreadsheet; the history builds itself.'],
    ['sync', 'Covered during holidays', 'A colleague takes over a role\'s pages until they are back.'], ['bell', 'Nobody chases', 'Everyone sees the close and their own deadlines.']]
    .forEach((p, i) => point(s, p, M, 2.1 + i * 1.18, 6.2, { t: 300 + i * 150, th: 0.6, bg: i ? C.ink : C.blue }));
  fig(s, 'hub', { x: 7.4, y: 2.2, w: R - 7.4 }, false, 500);
}

// =============================================================================================== 12. private by design
pres.addSection({ title: 'Trust' });
{
  const s = add('DARK', 'Trust', 'The data is the most sensitive Member Care has: names, National IDs, results and money. It stays on our own computers and is sent nowhere. The shared data is encrypted with AES-256 and only accounts made in the tool can read it. Attachments carry no National IDs. Each role sees only what is theirs, a security review was done, and every change is logged.');
  eyebrow(s, 'Private by design', true);
  title(s, 'Your data *stays yours*');
  const tiles = [['0', 'web requests', 'Nothing is sent anywhere: the data stays on our own computers.'], ['AES-256', 'encrypted shared data', 'Only accounts made in the tool can read it.'],
    ['No IDs', 'in email attachments', 'National IDs never leave the tool in an email.'], ['By role', 'what each person sees', 'An agent sees only their own page; a supervisor, only their team.'],
    ['Reviewed', 'for security', 'Every finding fixed and covered by tests.'], ['Logged', 'every change', 'Results, rules and roles: who changed what, and when.']];
  const tw = (R - M - 0.4) / 3;
  tiles.forEach(([big, small, t], i) => {
    const x = M + (i % 3) * (tw + 0.2), y = 1.95 + Math.floor(i / 3) * 2.45, d = 300 + i * 140;
    card(s, x, y, tw, 2.25, { dark: true, t: d, fill: i === 0 ? C.blue : C.ink });
    T(s, big, { x: x + 0.35, y: y + 0.24, w: tw - 0.7, h: 0.78, fontSize: 36, bold: true, color: C.white, valign: 'top', objectName: `up|${d}|big` });
    T(s, small, { x: x + 0.35, y: y + 1.0, w: tw - 0.7, h: 0.32, fontSize: 14, bold: true, color: C.white, objectName: `up|${d}|small` });
    T(s, t, { x: x + 0.35, y: y + 1.36, w: tw - 0.7, h: 0.7, fontSize: 13, color: i === 0 ? C.white : C.dmuted, valign: 'top', objectName: `up|${d}|t` });
  });
}

// =============================================================================================== 13. proof
{
  const s = add('LIGHT', 'Trust', 'It is tested like a product. Every counting rule runs over ten thousand synthetic people with the expected results. Thirty-seven automated browser test suites run before every change ships. Every role\'s pages are checked, in light and dark.');
  eyebrow(s, 'Built to be right');
  title(s, 'Tested like a *product*');
  const stats = [['10,000', 'synthetic people', 'run through every counting rule, with the expected results'], ['37', 'browser test suites', 'run before every change ships'], ['7', 'roles', 'every page checked,\nin light and dark']];
  const cw = (R - M - 0.7) / 3;
  stats.forEach(([n, h, t], i) => {
    const x = M + i * (cw + 0.35), d = 300 + i * 200, on = i === 0;
    card(s, x, 2.15, cw, 3.55, { t: d, fill: on ? C.blue : C.soft, px: on ? undefined : C.blue });
    T(s, n, { x: x + 0.4, y: 2.5, w: cw - 0.8, h: 1.2, fontSize: 60, bold: true, color: on ? C.white : C.ink, objectName: `up|${d}|n` });
    T(s, h, { x: x + 0.4, y: 3.85, w: cw - 0.8, h: 0.4, fontSize: 17, bold: true, color: on ? C.white : C.ink, objectName: `up|${d}|h` });
    T(s, t, { x: x + 0.4, y: 4.3, w: cw - 0.8, h: 1.0, fontSize: 13, color: on ? C.white : C.muted, valign: 'top', objectName: `up|${d}|t` });
  });
  dot(s, 'shield', M, 6.08, 0.5, C.ink, 'white', 900);
  T(s, 'Every calculation, email and permission is covered by tests that run before each change ships.', { x: M + 0.7, y: 6.1, w: 10.5, h: 0.46, fontSize: 14, color: C.ink2, valign: 'middle', objectName: 'up|900|same' });
}

// =============================================================================================== 14. what changes
pres.addSection({ title: 'Launch plan' });
{
  const s = add('LIGHT', 'Launch plan', 'What changes for Member Care, in one view: time moves from assembling to coaching; mistakes are settled before anything goes out; questions about pay are answered in a click; the whole month is visible to every role; and the month no longer rests on one person.');
  eyebrow(s, 'What changes');
  title(s, 'What changes for *Member Care*');
  const hd = (t, o = {}) => ({ text: t, options: { bold: true, color: C.white, fill: { color: o.fill || C.ink }, fontSize: 13, fontFace: FONT, valign: 'middle', margin: [0.08, 0.2, 0.08, 0.2] } });
  const c = (t, o = {}) => ({ text: t, options: { color: o.color || C.ink2, bold: !!o.bold, fontSize: 13, fontFace: FONT, fill: { color: o.fill || C.white }, valign: 'middle', margin: [0.08, 0.2, 0.08, 0.2] } });
  const rows = [['Time', 'Assembling and checking by hand', 'Spent on coaching and service'], ['Accuracy', 'Mistakes found after the emails', 'Settled before anything goes out'],
    ['Questions about pay', 'Worked out again on request', 'Answered in a click'], ['Visibility', 'Status gathered by email and calls', 'The whole month at a glance'],
    ['Continuity', 'The month in one person\'s files', 'Shared, saved and covered']];
  s.addTable([[hd(''), hd('Before'), hd('With Cadence', { fill: C.blue })], ...rows.map((r, i) => [c(r[0], { bold: true, color: C.ink, fill: i % 2 ? C.white : C.row }), c(r[1], { color: C.muted, fill: i % 2 ? C.white : C.row }), c(r[2], { bold: true, color: C.ink, fill: i % 2 ? C.white : C.row })])],
    { x: M, y: 2.05, w: 8.6, colW: [2.3, 3.05, 3.25], rowH: [0.55, 0.78, 0.78, 0.78, 0.78, 0.78], border: { type: 'solid', color: C.line, pt: 0.75 }, objectName: 'up|300|table' });
  card(s, 9.35, 2.05, R - 9.35, 4.45, { fill: C.blue, t: 600 });
  dot(s, 'sparkle', 9.7, 2.4, 0.52, C.white, 'blue', 600);
  T(s, 'Same team, same rules: a better month.', { x: 9.7, y: 3.2, w: R - 10.05, h: 1.6, fontSize: 24, bold: true, color: C.white, valign: 'top', lineSpacingMultiple: 1.02, objectName: 'up|600|sum' });
  T(s, 'Month end runs on one shared truth instead of people and spreadsheets.', { x: 9.7, y: 4.95, w: R - 10.05, h: 1.1, fontSize: 13, color: C.white, valign: 'top', lineSpacingMultiple: 1.05, objectName: 'up|600|sum-t' });
}

// =============================================================================================== 15. what comes next
{
  const s = add('END', 'Launch plan', 'What comes next, in three steps: run the next month end in Cadence, with the old way beside it for one month; measure what it gives back, hours, corrections and questions about pay, against the month before; then make it how Member Care closes every month. Next: opening it from anywhere, phones included. Thank you, and questions.');
  pixels(s, [[11.95, 1.08, 0.40, C.red], [12.55, 1.72, 0.16, C.pink], [6.80, 5.98, 0.28, C.lav], [12.32, 5.84, 0.22, C.orange], [7.08, 1.38, 0.14, C.blue]], 120);
  pic(s, 'laptop-dark', { x: 7.0, y: 1.95, w: 5.6 }, 90, 'up|250|laptop');
  eyebrow(s, 'What comes next', true);
  title(s, 'Ready for *the next close*');
  [['Run the next month end in Cadence', 'every role in one place, the old way beside it for one month.'], ['Measure what it gives back', 'hours, corrections and questions about pay, against the month before.'], ['Make it how we close', 'every month, every role, one shared truth.']].forEach(([h, t], i) => {
    const y = 2.9 + i * 0.98, d = 300 + i * 160;
    s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: 0.52, h: 0.52, fill: { color: i === 0 ? C.blue : C.edge }, line: { type: 'none' }, objectName: `up|${d}|n${i}` });
    T(s, String(i + 1), { x: M, y, w: 0.52, h: 0.52, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|n${i}t` });
    T(s, h, { x: M + 0.75, y: y - 0.04, w: 5.6, h: 0.34, fontSize: 16, bold: true, color: C.white, objectName: `up|${d}|h${i}` });
    T(s, t, { x: M + 0.75, y: y + 0.3, w: 5.6, h: 0.32, fontSize: 13, color: C.dmuted, objectName: `up|${d}|t${i}` });
  });
  dot(s, 'globe', M + 0.06, 5.8, 0.4, C.edge, 'white', 800);
  T(s, [{ text: 'Next: ', options: { bold: true, color: C.white } }, { text: 'open it from anywhere, phones included.', options: { color: C.dmuted } }], { x: M + 0.75, y: 5.8, w: 5.4, h: 0.4, fontSize: 13, valign: 'middle', objectName: 'up|800|next' });
  T(s, runs('Thank *you*'), { x: M, y: 6.42, w: 4, h: 0.5, fontSize: 22, color: C.white, objectName: 'fade|950|thanks' });
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
  xml = xml.replace(/ descr="[^"]*\.png"/g, ' descr=""');   // a decorative picture (an icon) has no description, never its file's path
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
/** the logo on the layouts is described as the logo, not by its file's name */
const layout = xml => xml.replace(/ descr="[^"]*beyond-one-[^"]*\.(png|gif)"/g, ' descr="Beyond One"');
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
    else if (/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)) files.push({ name: n, data: layout(await z.text(n)) });
    else if (/^ppt\/theme\/theme\d+\.xml$/.test(n)) files.push({ name: n, data: theme(await z.text(n)) });
    else files.push({ name: n, data: await z.bytes(n) });
  }
  fs.writeFileSync(outFile, await Core.writeZip(files)); fs.unlinkSync(tmp);
  console.log(`✓ ${outFile}: ${slides.length} slides`);
})();
