/* MC Monthly Report Builder - Beyond One's look for every deck the tool makes, after the Beyond One template the team's decks are
   made with (theme "Beyond": 080808 ink, 0D76BD blue and the pixel colours; Poppins). The logo moves as the company's own does (a
   GIF PowerPoint plays: the mosaic changes, the words stay). The cover is the template's title slide (the
   black panel with the white logo, the title in a box of colour among the pixel squares); every other slide has the logo at the
   top left, the deck's name in small capitals with a black square at the top right, CONFIDENTIAL and the slide's number at the
   foot; titles in capitals with the last word bold; key numbers in a flat box of colour (the template's "15%"); tables with a black
   heading; flat charts. Only how the slides look: what they say is the deck's own (wcdeck.js, prdeck.js). */
'use strict';
const BoDeck = ((L) => {
const C = { ink: '080808', white: 'FFFFFF', blue: '0D76BD', pink: 'F6ADCC', lav: '9693C8', orange: 'ED7D31', teal: '0C7B6C', tealBlue: '007FA2', red: 'ED1C24',
  lilac: 'BF9DCA', grey: '595959', soft: 'F4F4F5', line: 'E4E4E7', text: '262626', dim: 'BFBFBF', bar: 'D4D4D8' };
const HEAD = 'Poppins', LIGHT = 'Poppins Light', BODY = 'Calibri';   // the template's: Poppins on the slides, Calibri in its theme (tables, charts)
const CHART = ['0D76BD', 'ED7D31', '0C7B6C', '9693C8', 'ED1C24', '007FA2'];   // the template's colours, in its order
const logo = k => (L && L[k] ? L[k] : null);
/** a picture in a box, its proportions kept (centred in the box when asked) */
function img(s, G, x, y, w, h, o = {}) {
  if (!G || !G.png || !(G.w > 0) || !(G.h > 0)) return false;
  let pw = w, ph = w * G.h / G.w; if (ph > h) { ph = h; pw = h * G.w / G.h; }
  s.image(x + (o.center ? (w - pw) / 2 : 0), y + (o.middle ? (h - ph) / 2 : 0), pw, ph, G.png, { descr: o.descr || 'Beyond One', name: o.name || 'Logo' });
  return true;
}
const box = (s, x, y, w, h, c, o = {}) => s.text(x, y, w, h, c, { insetX: 0, insetY: 0, valign: 'middle', ...o });
/** a title as the template writes it: in capitals, the last word bold (the words themselves stay as written) */
function runs(t) {
  const w = String(t).trim().split(/\s+/), last = w.pop();
  return [[...(w.length ? [{ t: w.join(' ') + ' ', bold: false }] : []), { t: last, bold: true }]];
}
const pixels = (s, list) => list.forEach(([x, y, w, c]) => s.rect(x, y, w, w, { fill: c, name: 'Pixel' }));
/** the top of a slide: the logo at the top left, the deck's name in small capitals and a square at the top right */
function top(s, label, o = {}) {
  const ink = o.dark ? C.white : C.ink;
  img(s, logo(o.dark ? 'stackedWhiteAnim' : 'stackedBlackAnim') || logo(o.dark ? 'stackedWhite' : 'stackedBlack'), 0.40, 0.30, 0.42, 0.64, { descr: 'Beyond One', name: 'Logo' });
  if (label) box(s, 5.30, 0.30, 7.32, 0.22, label, { size: 7, font: HEAD, caps: true, spc: 1.4, color: ink, align: 'right', name: 'Section' });
  s.rect(12.76, 0.335, 0.15, 0.15, { fill: ink, name: 'Square' });
}
/** the foot of a slide: CONFIDENTIAL at the left, the slide's number at the right */
function foot(s, n, o = {}) {
  const c = o.dark ? C.dim : C.grey;
  box(s, 0.40, 7.10, 3.50, 0.22, 'Confidential', { size: 6.5, font: HEAD, caps: true, spc: 1.4, color: c, name: 'Confidential' });
  if (n != null) box(s, 11.91, 7.10, 1.00, 0.22, String(n), { size: 7, font: HEAD, color: c, align: 'right', name: 'Slide number' });
}
/** a slide's title (capitals, the last word bold) and the line under it */
function title(s, x, y, w, t, sub, o = {}) {
  box(s, x, y, w, 0.56, runs(t), { size: o.size || 26, font: HEAD, caps: true, color: o.color || C.ink, name: 'Title' });
  if (sub) box(s, x, y + 0.56, w, 0.32, sub, { size: o.subSize || 12.5, font: LIGHT, color: o.subColor || C.grey, name: 'Subtitle' });
}
/** a heading over a chart or a table */
const heading = (s, x, y, w, t, size = 11) => box(s, x, y, w, 0.28, t, { size, font: HEAD, bold: true, color: C.ink, valign: 'bottom' });
/** the key number in a flat box of colour, as the template's "15%  Pull out the key stats here" */
function stat(s, x, y, w, h, color, big, small) {
  s.rect(x, y, w, h, { fill: color, name: 'Callout' });
  box(s, x + 0.14, y + 0.06, w - 0.28, h * 0.56, big, { size: 28, font: HEAD, bold: true, color: C.white, valign: 'bottom' });
  box(s, x + 0.14, y + h * 0.62, w - 0.28, h * 0.32, small, { size: 9, font: HEAD, color: C.white, valign: 'top' });
}
/** a small figure on a pale ground, a pixel of the brand's colour at its corner */
function figure(s, x, y, w, h, big, lab, color) {
  s.rect(x, y, w, h, { fill: C.soft, name: 'Figure' });
  s.rect(x, y, 0.10, 0.10, { fill: color || C.blue, name: 'Pixel' });
  box(s, x, y + 0.08, w, h * 0.55, big, { size: 19, font: HEAD, bold: true, color: C.ink, align: 'center' });
  box(s, x + 0.06, y + h * 0.6, w - 0.12, h * 0.36, lab, { size: 8, font: HEAD, color: C.grey, align: 'center', valign: 'top' });
}
/** a table's look: the template's black heading, a hairline between rows */
const table = (o = {}) => ({ head: { fill: C.ink, color: C.white }, border: C.line, ink: C.text, font: BODY, ...o });
/** a chart's frame: no box, quiet grid and axes, the template's colours */
const frame = (o = {}) => ({ border: undefined, fill: undefined, gridColor: C.line, axisSize: 900, axisColor: C.grey, legendSize: 900, labelSize: 900, labelColor: C.text, titleColor: C.ink, ...o });
/** the cover: the template's title slide */
function cover(s, o = {}) {
  s.rect(0, 0, 4.25, 7.5, { fill: C.ink, name: 'Panel' });
  img(s, logo('stackedWhiteAnim') || logo('stackedWhite'), 1.30, 2.70, 1.65, 2.10, { center: true, middle: true, descr: 'Beyond One' });
  s.rect(5.05, 1.30, 5.70, 3.95, { fill: C.lav, name: 'Title box' });
  pixels(s, [[4.60, 0.88, 0.52, C.red], [9.10, 0.60, 0.26, C.pink], [4.52, 4.78, 0.86, C.tealBlue], [11.40, 5.70, 0.32, C.teal], [12.20, 1.62, 0.13, C.blue], [11.05, 4.98, 0.17, C.orange]]);
  s.rect(12.76, 0.335, 0.15, 0.15, { fill: C.ink, name: 'Square' });
  box(s, 5.42, 1.62, 5.00, 2.10, runs(o.title || 'Member Care'), { size: 30, font: HEAD, caps: true, color: C.white, valign: 'top', name: 'Title' });
  if (o.sub) box(s, 5.42, 3.95, 5.00, 1.05, o.sub, { size: 11, font: HEAD, color: C.white, valign: 'bottom', name: 'Subtitle' });
  if (o.date) box(s, 6.20, 6.18, 6.70, 0.32, o.date, { size: 12, font: HEAD, bold: true, color: C.ink, align: 'right', name: 'Date' });
  if (o.who && o.who.length) box(s, 6.20, 6.52, 6.70, 0.50, o.who.map((t, i) => [{ t, size: i ? 9.5 : 10.5, bold: !i, color: i ? C.grey : C.ink }]), { font: HEAD, align: 'right', valign: 'top', name: 'Presenter' });
  box(s, 0.40, 7.10, 3.40, 0.22, 'Confidential', { size: 6.5, font: HEAD, caps: true, spc: 1.4, color: C.dim, name: 'Confidential' });
}
/** the last slide: dark, the logo, the pixels, thank you */
function closing(s, o = {}) {
  img(s, logo('stackedWhiteAnim') || logo('stackedWhite'), 0.40, 0.30, 0.42, 0.64, { descr: 'Beyond One' });
  s.rect(12.76, 0.335, 0.15, 0.15, { fill: C.white, name: 'Square' });
  pixels(s, [[10.10, 1.20, 0.72, C.red], [11.30, 0.95, 0.32, C.pink], [10.95, 2.30, 0.46, C.tealBlue], [9.55, 4.55, 0.30, C.lav], [12.10, 3.45, 0.22, C.orange], [10.65, 5.55, 0.56, C.teal], [12.40, 5.95, 0.14, C.white]]);
  box(s, 0.90, 2.62, 8.40, 1.05, runs(o.title || 'Thank You'), { size: 44, font: HEAD, caps: true, color: C.white, name: 'Title' });
  if (o.sub) box(s, 0.90, 3.72, 8.40, 0.46, o.sub, { size: 14, font: LIGHT, color: C.dim, name: 'Subtitle' });
  if (o.who) box(s, 0.90, 6.40, 8.40, 0.34, o.who, { size: 10.5, font: HEAD, color: C.dim, name: 'Presenter' });
  box(s, 0.40, 7.10, 3.40, 0.22, 'Confidential', { size: 6.5, font: HEAD, caps: true, spc: 1.4, color: C.dim, name: 'Confidential' });
}
return { C, HEAD, LIGHT, BODY, CHART, logo, img, runs, pixels, top, foot, title, heading, stat, figure, table, frame, cover, closing };
})(typeof BoLogos !== 'undefined' ? BoLogos : (typeof require !== 'undefined' ? require('./bologos.js') : null));
if (typeof module !== 'undefined') module.exports = BoDeck;
