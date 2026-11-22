// The overview deck, told and drawn as the Showcase: its nine sections, one a slide, around the core idea (Cadence counts every
// bonus right). The words, the speaker notes and what moves Lina A.'s bonus come from the stand-alone Showcase itself
// (tools/deck/showcase_shots.cjs reads them from final/Cadence - Showcase.html, made-up data only), so the deck and the Showcase
// say the same; the parts that show the tool are its own drawings, taken from the Showcase: the ticket, the five steps, the
// scorecard of Try it, the receipt in English and in Arabic, the role icons and hairline's line figures.
// The look is the Showcase's in Present: each slide a white card with 20 px corners on the sky gradient, the black square at its top
// right and the strip of the logo's colours along its foot (one picture, on the layout); a label with a blue square, the title in
// capitals with the words that matter in bold, the lead in grey, and light cards with a hairline border. Poppins throughout.
// Every slide fades in and its parts rise in, one after another; CONFIDENTIAL and the number at the foot.
// Usage: node tools/deck/make_deck.cjs artDir out.pptx   (artDir: what showcase_shots.cjs made; needs pptxgenjs: npm i pptxgenjs)
const fs = require('node:fs'), path = require('node:path');
const Pptx = require('pptxgenjs');
const [artDir, outFile] = process.argv.slice(2);
const SC = JSON.parse(fs.readFileSync(path.join(artDir, 'showcase.json'), 'utf8')), SEC = id => SC.sections.find(x => x.id === id);
const { pres, C, W, X0, X1, CW, FONT, LIGHT, A, size, T, runs, eyebrow, lead, card, pic, pill, add, slides, write } = require('./look.cjs')(Pptx, { art: artDir, title: 'Cadence', subject: 'Cadence: every bonus, counted right' });
const title = (s, sec) => s.addText(runs(sec.lines), { placeholder: 'title' });
/** the lead, right under the title (two lines of title or one) */
const leadY = sec => 1.06 + Math.max(1, sec.lines.length) * 0.47 + 0.18;
const nf = n => Number(n).toLocaleString('en-US');

// =============================================================================================== 1. Cadence: every bonus, counted right
{
  const sec = SEC('hero'), s = add('HERO', sec);
  pic(s, 'sc-logo', { x: X0, y: 0.95, h: 0.46 }, 'fade|0|logo', 'Beyond One');
  eyebrow(s, sec.eyebrow, 1.66);
  title(s, sec);
  lead(s, sec.lead, { y: 3.72, w: 6.1, h: 0.95, t: 300 });
  let x = X0; (sec.strip || []).forEach((t, i) => { x += pill(s, t, x, 4.9, { t: 450 + i * 80, ...(i ? {} : { fill: C.bsoft, color: C.btext }) }) + 0.12; });
  pic(s, 'sc-ticket', { x: 7.35, y: 1.12, w: 5.0 }, 'up|350|ticket', 'Lina A., a made-up Member Care Champion, September 2026: final 84% (4.2 of 5 on 7 KPIs), 20 of 22 days, base 1,000 SR; bonus earned 764 SR; every gate met.');
}

// =============================================================================================== 2. the challenge: by hand
{
  const sec = SEC('before'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  const w = (CW - 0.5) / 3;
  sec.nums.forEach((n, i) => {
    const x = X0 + i * (w + 0.25), d = 300 + i * 120;
    card(s, x, 2.45, w, 1.9, { t: d });
    T(s, n.n, { x: x + 0.28, y: 2.62, w: w - 0.56, h: 0.82, fontSize: 46, bold: true, color: n.hot ? C.pink : C.ink, objectName: `up|${d}|n` });
    T(s, n.t, { x: x + 0.28, y: 3.5, w: w - 0.56, h: 0.72, fontSize: 11.5, color: C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|t` });
  });
  sec.cards.forEach((c, i) => {
    const x = X0 + i * (w + 0.25), d = 700 + i * 120;
    card(s, x, 4.6, w, 1.55, { t: d });
    T(s, c.b, { x: x + 0.28, y: 4.8, w: w - 0.56, h: 0.32, fontSize: 13, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, c.p, { x: x + 0.28, y: 5.16, w: w - 0.56, h: 0.82, fontSize: 11, color: C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|p` });
  });
}

// =============================================================================================== 3. how a bonus is counted: five steps
{
  const sec = SEC('count'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  lead(s, sec.lead, { y: leadY(sec), w: 10.2, h: 0.55 });
  const sz = size(A('sc-steps')), sh = 3.25, sw = sh * sz.w / sz.h;   // as tall as the room above the result and the foot allows
  const st = pic(s, 'sc-steps', { x: X0 + (CW - sw) / 2, y: 2.8, h: sh }, 'up|400|steps', 'The five steps for Lina A.: the month\'s numbers; each KPI ranked 1 to 5 against its bands; weighted into the final (4.2 of 5, 84%); the days that count (20 of 22, 91%); the gates, every one met.');
  const y = st.y + st.h + 0.13, r = sec.result;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X0, y, w: CW, h: 0.58, rectRadius: 0.1, fill: { color: C.blue }, line: { type: 'none' }, objectName: 'up|800|result' });
  T(s, [{ text: r.label.toUpperCase() + '   ', options: { fontSize: 8, bold: true, charSpacing: 1.4, color: 'D6E6F8' } }, { text: r.formula + '   ', options: { fontSize: 17, bold: true, color: C.white } }, { text: r.small, options: { fontSize: 9, color: 'D6E6F8' } }],
    { x: X0 + 0.3, y, w: CW - 0.6, h: 0.58, valign: 'middle', objectName: 'up|800|result-t' });
}

// =============================================================================================== 4. try it: what moves her bonus
{
  const sec = SEC('try'), s = add('SHOW', sec), WI = SC.whatIf;
  eyebrow(s, sec.eyebrow); title(s, sec);
  lead(s, sec.lead, { y: leadY(sec), w: 10.2, h: 0.55 });
  pic(s, 'sc-try', { x: X0, y: 2.9, w: 7.45 }, 'up|400|scorecard', 'Lina A.\'s scorecard as Try it shows it: each KPI with its weight, her number and its rank; days attended, absent days and months in the job; the final, the days, the gates and the bonus (764 SR).');
  const x = X0 + 7.75, w = X1 - x, rh = 0.5, y0 = 2.9;
  card(s, x, y0, w, 0.62 + WI.rows.length * rh + 0.12, { t: 600 });
  T(s, `What moves ${WI.name}'s bonus`, { x: x + 0.24, y: y0 + 0.16, w: w - 0.48, h: 0.26, fontSize: 12.5, bold: true, color: C.ink, objectName: 'up|600|wi-h' });
  T(s, 'counted by the same engine', { x: x + 0.24, y: y0 + 0.4, w: w - 0.48, h: 0.2, fontSize: 9, color: C.faint, objectName: 'up|600|wi-s' });
  WI.rows.forEach((r, i) => {
    const y = y0 + 0.68 + i * rh, d = 700 + i * 90, zero = !r.earned;
    if (i) s.addShape(pres.shapes.LINE, { x: x + 0.24, y: y - 0.04, w: w - 0.48, h: 0, line: { color: C.line, width: 0.75 }, objectName: `up|${d}|wi-line` });
    T(s, [{ text: r.t, options: { breakLine: !!r.why } }, ...(r.why ? [{ text: `Stopped by: ${r.why.toLowerCase()}`, options: { fontSize: 8.5, color: C.red } }] : [])], { x: x + 0.24, y, w: w - 1.5, h: rh - 0.08, fontSize: 10.5, color: C.ink2, valign: 'middle', objectName: `up|${d}|wi-t` });
    T(s, `${nf(r.earned)} SR`, { x: x + w - 1.2, y, w: 0.96, h: rh - 0.08, fontSize: 14, bold: true, color: zero ? C.red : i === 0 ? C.btext : C.ink, align: 'right', valign: 'middle', objectName: `up|${d}|wi-v` });
  });
}

// =============================================================================================== 5. checked before it counts
{
  const sec = SEC('checks'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  lead(s, sec.lead, { y: leadY(sec), w: 8.2, h: 0.55 });
  const w = 3.72, h = 1.72;
  sec.cards.forEach((c, i) => {
    const x = X0 + (i % 2) * (w + 0.22), y = 2.95 + Math.floor(i / 2) * (h + 0.22), d = 300 + i * 120;
    card(s, x, y, w, h, { t: d });
    T(s, String(i + 1).padStart(2, '0'), { x: x + 0.26, y: y + 0.2, w: 1, h: 0.2, fontSize: 9, bold: true, color: C.blue, charSpacing: 1.4, objectName: `up|${d}|n` });
    T(s, c.b, { x: x + 0.26, y: y + 0.44, w: w - 0.52, h: 0.32, fontSize: 13, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, c.p, { x: x + 0.26, y: y + 0.8, w: w - 0.52, h: 0.8, fontSize: 10.5, color: C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|p` });
  });
  const px = X0 + 2 * w + 0.6, pw = X1 - px;
  T(s, sec.proof.n, { x: px, y: 2.95, w: pw, h: 0.95, fontSize: 60, bold: true, color: C.btext, align: 'center', objectName: 'up|800|proof-n' });
  T(s, sec.proof.t, { x: px + 0.3, y: 3.95, w: pw - 0.6, h: 0.78, fontSize: 11, color: C.muted, align: 'center', valign: 'top', lineSpacingMultiple: 1.08, objectName: 'up|850|proof-t' });
  pic(s, 'sc-fig-sieve', { x: px + (pw - 2.0) / 2, y: 4.85, w: 2.0 }, 'up|950|fig', '');
}

// =============================================================================================== 6. every bonus explained, in English and in Arabic
{
  const sec = SEC('explain'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  lead(s, sec.lead, { y: leadY(sec), w: 10.2, h: 0.55 });
  const z = size(A('sc-receipt-en')), h = 3.85, w = h * z.w / z.h, gap = 0.4, x = X0 + (CW - 2 * w - gap) / 2;   // as tall as the room above the foot
  pic(s, 'sc-receipt-en', { x, y: 2.85, h }, 'up|400|receipt-en', 'How the bonus was counted, in English: each KPI with its value, rank and weight; the final, the days, the base, the gates and the bonus, 764 SR.');
  pic(s, 'sc-receipt-ar', { x: x + w + gap, y: 2.85, h }, 'up|600|receipt-ar', 'The same receipt in Arabic, right to left.');
}

// =============================================================================================== 7. every role has its own interface
// as the Showcase lays it out: the hub beside the title, the roles in two rows of four (a long name takes two lines beside its icon)
{
  const sec = SEC('roles'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  lead(s, sec.lead, { y: leadY(sec), w: 9.4, h: 0.62 });
  pic(s, 'sc-fig-hub', { x: X1 - 1.75, y: 0.78, w: 1.75 }, 'up|900|fig', '');
  const n = 4, gap = 0.22, w = (CW - (n - 1) * gap) / n, h = 1.95, top = 2.45;
  sec.roles.forEach((r, i) => {
    const x = X0 + (i % n) * (w + gap), y = top + Math.floor(i / n) * (h + gap), d = 300 + i * 90;
    card(s, x, y, w, h, { t: d });
    pic(s, `sc-role-${i}`, { x: x + 0.24, y: y + 0.28, w: 0.34 }, `up|${d}|icon`, '');
    T(s, r.name, { x: x + 0.7, y: y + 0.2, w: w - 0.9, h: 0.5, fontSize: 12, bold: true, color: C.ink, valign: 'middle', lineSpacingMultiple: 0.95, objectName: `up|${d}|h` });
    T(s, r.label.toUpperCase(), { x: x + 0.24, y: y + 0.84, w: w - 0.48, h: 0.18, fontSize: 7.5, bold: true, color: C.blue, charSpacing: 1.4, objectName: `up|${d}|l` });
    T(s, r.part, { x: x + 0.24, y: y + 1.06, w: w - 0.48, h: 0.8, fontSize: 10, color: C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|p` });
  });
}

// =============================================================================================== 8. trust: pay data stays ours
{
  const sec = SEC('trust'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  const area = 8.55, h = 1.95;
  sec.tiles.forEach((t, i) => {
    const top = i < 3, n = top ? 3 : 2, w = (area - (n - 1) * 0.22) / n, x = X0 + (top ? i : i - 3) * (w + 0.22), y = top ? 2.2 : 2.2 + h + 0.22, d = 300 + i * 120, on = i === 0;
    card(s, x, y, w, h, { t: d, ...(on ? { fill: C.blue } : {}) });
    T(s, t.b, { x: x + 0.28, y: y + 0.22, w: w - 0.56, h: 0.62, fontSize: 30, bold: true, color: on ? C.white : C.ink, objectName: `up|${d}|b` });
    T(s, t.s, { x: x + 0.28, y: y + 0.86, w: w - 0.56, h: 0.26, fontSize: 11.5, bold: true, color: on ? C.white : C.ink2, objectName: `up|${d}|s` });
    T(s, t.p, { x: x + 0.28, y: y + 1.14, w: w - 0.56, h: 0.7, fontSize: 10.5, color: on ? 'E3EEFB' : C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|p` });
  });
  pic(s, 'sc-fig-vault', { x: X0 + area + 0.55, y: 2.45, w: X1 - (X0 + area + 0.55) }, 'up|900|fig', '');
}

// =============================================================================================== 9. what's next: ready for the next bonus
{
  const sec = SEC('start'), s = add('SHOW', sec);
  eyebrow(s, sec.eyebrow); title(s, sec);
  sec.steps.forEach((st, i) => {
    const y = 2.3 + i * 0.98, d = 300 + i * 150;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X0, y: y + 0.02, w: 0.4, h: 0.4, rectRadius: 0.06, fill: { color: i ? C.ink : C.blue }, line: { type: 'none' }, objectName: `up|${d}|n` });
    T(s, String(i + 1), { x: X0, y: y + 0.02, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', objectName: `up|${d}|nt` });
    T(s, st.b, { x: X0 + 0.62, y: y - 0.02, w: 6.6, h: 0.34, fontSize: 14, bold: true, color: C.ink, objectName: `up|${d}|h` });
    T(s, st.p, { x: X0 + 0.62, y: y + 0.32, w: 6.6, h: 0.5, fontSize: 11, color: C.muted, valign: 'top', lineSpacingMultiple: 1.08, objectName: `up|${d}|p` });
  });
  T(s, runs([sec.thanks]), { x: X0, y: 5.45, w: 6, h: 0.75, fontSize: 30, color: C.ink, objectName: 'up|900|thanks' });
  pic(s, 'sc-fig-laptop', { x: 8.25, y: 1.7, w: 4.1 }, 'up|700|fig', '');
}

write(outFile);
