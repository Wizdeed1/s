/* MC Monthly Report Builder - the Member Care Performance Review: the deck made from the "MC performance Review" email the
   Control and Complaint team sends (its tables: Rebooking TKTs, Network Issues TKTs, Web + App TKTs, Social Media issue TKTs, Vnet
   Complaints, and any other one), with the brands' slides of the weekly presentation.
   tablesOf(): the email's tables from its text (an Outlook .msg keeps one cell a line; a table copied from Outlook comes
   tab-separated): a title ending with ":", its header, and a row per month ("Jan", "Jun-25", "1-Jan", "Oct-26"); the month to date
   ends with "to N" ("Nov to 3", "11/1/2026 to 3": until the 3rd).
   deck(): cover; Virgin, FRiENDi and Postpaid (WcDeck's slides); Complaints Insights (Web + App, Network, Social media);
   Complaints Insights (Rebooking by month, Vnet, the month so far); a slide for any other table; thank you. */
'use strict';
const PrDeck = ((P, WD) => {
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const pad = n => String(n).padStart(2, '0');
const sp = s => String(s ?? '').replace(/[​-‏‪-‮﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const monOf = w => MONS[String(w || '').toLowerCase().replace(/\.$/, '')] || 0;
const yy = y => (+y < 100 ? 2000 + +y : +y);

// ---------------------------------------------------------------- reading the email
/** the cells of the text in order: a tab-separated line gives its cells, any other line is one cell */
function cellsOf(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) { for (const p of line.includes('\t') ? line.split('\t') : [line]) { const c = sp(p); if (c) out.push(c); } }
  return out;
}
/** a row's month: { m, y (null when the label has none), until (the day the month runs to, for the month to date) } */
function monthOf(c) {
  let t = sp(c).toLowerCase(), until = null, x;
  if ((x = t.match(/^(.*\S)\s+(?:to|till|until|-|–)\s+(\d{1,2})(?:st|nd|rd|th)?$/))) { t = x[1]; until = +x[2]; }
  if ((x = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) { const a = +x[1], b = +x[2], m = b === 1 ? a : a === 1 && b > 12 ? b : a; return m >= 1 && m <= 12 ? { m, y: yy(x[3]), until } : null; }   // 11/1/2026: the month's first day, as Outlook writes it
  if ((x = t.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/))) { const m = +x[2]; return m >= 1 && m <= 12 ? { m, y: +x[1], until } : null; }
  if ((x = t.match(/^(\d{1,2})[-\s]([a-z]{3,9})\.?(?:[-\s](\d{2,4}))?$/)) && monOf(x[2])) return { m: monOf(x[2]), y: x[3] ? yy(x[3]) : +x[1] > 1 ? yy(x[1]) : null, until };   // 1-Jan (its first day), 26-Jan (the year first)
  if ((x = t.match(/^([a-z]{3,9})\.?[-\s'’]+(\d{2}|\d{4})$/)) && monOf(x[1])) return { m: monOf(x[1]), y: yy(x[2]), until };   // Jun-25, Oct 2026
  if ((x = t.match(/^([a-z]{3,9})\.?$/)) && monOf(x[1])) return { m: monOf(x[1]), y: null, until };   // Jan, March
  return null;
}
const isVal = c => /^[-–]$/.test(c) || /^\(?-?[\d,]+(?:\.\d+)?\)?\s*%?$/.test(c.replace(/\s/g, ''));
function valOf(c) { if (/^[-–]$/.test(c)) return null; const t = c.replace(/[\s,()]/g, ''), pc = t.endsWith('%'), n = parseFloat(t); return Number.isFinite(n) ? (pc ? n / 100 : n) : null; }
const KEYS = [[/rebook/i, 'rebooking'], [/network/i, 'network'], [/web\s*\+?\s*(?:and\s*)?app/i, 'webapp'], [/social/i, 'social'], [/vnet/i, 'vnet']];
const tidy = s => sp(s).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\(S\s*\+\s*C\)/i, '(Service Requests + Complaints)').replace(/\bAll Just complaints\b/i, 'All complaints').replace(/\s*-\s*/g, ' - ').replace(/\bMNP - Port\b/, 'MNP - Port');
/**
 * the tables in an email's text. ref: { y, m } the month a label with no year is nearest to (the presentation's month), unless a
 * month to date in the email names its year. Returns [{ key, title, first, cols, rows: [{ ym, until, label, vals }] }]
 */
function tablesOf(text, ref) {
  const C = cellsOf(text), T = []; let cur = null;
  for (let i = 0; i < C.length;) {
    const c = C[i];
    if (/:\s*$/.test(c) && c.length <= 80 && !isVal(c.replace(/:\s*$/, ''))) { cur = { title: sp(c.replace(/\s*:\s*$/, '')), head: [], rows: [] }; T.push(cur); i++; continue; }
    if (!cur) { i++; continue; }
    const L = cur.head.length || cur.rows.length ? monthOf(c) : null;
    if (L) {
      const vals = []; let j = i + 1;
      while (j < C.length && isVal(C[j])) { vals.push(valOf(C[j])); j++; }
      if (vals.length) { cur.rows.push({ raw: c, ...L, vals }); i = j; continue; }
    }
    if (!cur.rows.length && cur.head.length < 12) { cur.head.push(c); i++; continue; }
    cur = null; i++;   // text after the rows: the table has ended (a note, the signature)
  }
  // the month the email runs to: a month to date that names its year, else the presentation's month
  const dated = T.flatMap(t => t.rows).find(r => r.until && r.y);
  const R = dated ? { y: dated.y, m: dated.m } : ref;
  return T.filter(t => t.rows.length).map(t => {
    const n = Math.max(...t.rows.map(r => r.vals.length)), head = t.head.slice(), cols = head.splice(Math.max(0, head.length - n)).map(tidy);
    while (cols.length < n) cols.unshift(`Value ${n - cols.length}`);
    const rows = t.rows.map(r => {
      const y = r.y || (r.m > R.m ? R.y - 1 : R.y), ym = `${y}-${pad(r.m)}`;
      return { ym, until: r.until, label: r.until ? `Until ${pad(r.until)} ${MON[r.m - 1]}` : `${MON[r.m - 1]}-${String(y).slice(2)}`, vals: Array.from({ length: n }, (_, k) => r.vals[k] ?? null) };
    });
    return { key: (KEYS.find(([re]) => re.test(t.title)) || [, 'other'])[1], title: t.title, first: tidy(head.join(' ')) || 'Month', cols, rows };
  });
}

// ---------------------------------------------------------------- the slides
const COLORS = ['1F5F8B', 'ED7D31', '2E8B57', '35A7DC', 'A23B9C', '7F7F7F', 'C9870A'];
const isTotal = c => /^total$/i.test(c.trim());
const lastRow = t => t.rows[t.rows.length - 1];
/** a chart of a table: a column per series (the Total left out when there are others), a share (%) as a line on its own axis */
function chartOf(t, o = {}) {
  const rows = o.rows || t.rows, idx = t.cols.map((c, i) => i), pcs = idx.filter(i => rows.some(r => r.vals[i] != null && r.vals[i] <= 1.5) && /%|share|rate/i.test(t.cols[i]));
  let bars = idx.filter(i => !pcs.includes(i)); if (bars.length > 1) bars = bars.filter(i => !isTotal(t.cols[i]));
  const sums = bars.map(i => rows.reduce((a, r) => a + (r.vals[i] || 0), 0)), big = bars[sums.indexOf(Math.max(...sums))];
  const lab = o.labels || (bars.length <= 2 ? 'all' : 'big');
  return {
    cats: rows.map(r => r.label), gap: bars.length > 3 ? 40 : 60, overlap: -10, catRot: rows.length > 12 ? -45 : undefined, catSize: rows.length > 12 ? 700 : 800, barFmt: '#,##0',
    bars: bars.map((i, k) => ({ name: t.cols[i], values: rows.map(r => r.vals[i]), color: COLORS[k % COLORS.length], labels: lab === 'all' || (lab === 'big' && i === big) })),
    // the share's axis runs to about twice its highest value, so its line sits between the short and the tall columns
    line: pcs.length ? { name: o.lineName || t.cols[pcs[0]], values: rows.map(r => r.vals[pcs[0]]), color: '1F2A5C', fmt: '0%', max: Math.min(1, Math.max(0.5, Math.ceil(Math.max(...rows.map(r => r.vals[pcs[0]] || 0)) * 22) / 10)), min: 0, labelSize: 700 } : undefined,
  };
}
const since = t => { const r = lastRow(t); return r.until ? r.label : r.label.replace('-', ' 20'); };
function slideHead(D, m, o, title) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' });
  W.logoAt(s, o, 0.45, 0.3, false);
  s.text(8.2, 0.72, 4.65, 0.25, `${o.kicker}  ·  ${WD.longDate(m.date)}`, { size: 9, color: W.MUTED, align: 'right' });
  s.text(0.5, 0.95, 9.5, 0.6, title, { size: 30, bold: true, font: 'Georgia', color: W.NAVY, name: 'Title' });
  return s;
}
/** a table's chart in a place on a slide, with its title over it; "not in the email" when the email has no such table */
function place(s, t, x, y, w, h, name, o = {}) {
  const W = WD.parts;
  if (!t) { W.label(s, x + 0.05, y, w, `${name}`); s.rect(x, y + 0.27, w, h - 0.27, { fill: 'F7F8FA', line: 'E3E5EA', radius: 0.04 }); s.text(x, y + 0.27, w, h - 0.27, 'Not in the email', { size: 11, italic: true, color: W.MUTED, align: 'center', valign: 'middle' }); return; }
  W.label(s, x + 0.05, y, w, `${o.title || t.title} – ${since(t)}`);
  s.rect(x, y + 0.27, w, h - 0.27, { fill: 'FFFFFF', line: 'E3E5EA', radius: 0.03 });
  s.chart(x + 0.05, y + 0.32, w - 0.1, h - 0.37, chartOf(t, o), { name });
}
/** the month so far against the month before, for each table */
function soFar(s, tables, x, y, w, h) {
  const W = WD.parts, rows = [];
  const add = (name, t, i) => { const L = t.rows, a = L[L.length - 1], b = L.length > 1 ? L[L.length - 2] : null; rows.push([W.fit(name, w - 2.5), { t: W.int(a.vals[i]), align: 'right' }, { t: b ? W.int(b.vals[i]) : '–', align: 'right' }]); };
  const total = t => { const i = t.cols.findIndex(isTotal); return i >= 0 ? i : 0; };
  for (const t of tables) {
    if (t.key === 'rebooking') { t.cols.forEach((c, i) => { if (!isTotal(c)) add(`Rebooking · ${c}`, t, i); }); }
    else if (t.key === 'webapp') { t.cols.forEach((c, i) => { if (!/%/.test(c)) add(i ? 'All complaints' : 'Web + App TKTs', t, i); }); }
    else add(t.key === 'network' ? 'Network TKTs' : t.key === 'social' ? 'Social media TKTs' : t.key === 'vnet' ? 'Vnet complaints' : t.title, t, total(t));
  }
  const last = tables.length ? lastRow(tables[0]) : null, prev = tables.length && tables[0].rows.length > 1 ? tables[0].rows[tables[0].rows.length - 2] : null;
  W.label(s, x + 0.05, y, w, 'This Month So Far');
  const head = ['Tickets', { t: last ? last.label : 'This month', align: 'right' }, { t: prev ? prev.label : 'Before', align: 'right' }];
  const rh = Math.min(0.26, (h - 0.35) / Math.max(rows.length + 1, 1));
  s.table(x, y + 0.32, [head, ...rows.slice(0, 12)], { cols: [w - 2.4, 1.2, 1.2], rowH: rh, size: 8.5, head: { fill: W.NAVY, color: 'FFFFFF' }, border: 'D9D9D9' });
}
/**
 * the Performance Review: m = WcDeck.model() for the presentation's day (the brands' slides), tables = tablesOf() from the email,
 * o = { presenter, title, org, logo }
 */
function deck(m, tables, o0 = {}) {
  const W = WD.parts, o = { ...o0, kicker: 'Member Care Performance Review', coverSub: 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay', thanksSub: 'Member Care Performance Review' };
  const D = P.create({ headFont: 'Georgia', bodyFont: 'Calibri' }), by = k => tables.find(t => t.key === k) || null;
  let n = 2;
  W.cover(D, m, o);
  W.brandSlide(D, m, m.brands[0], n++, o);   // Virgin Mobile
  W.brandSlide(D, m, m.brands[1], n++, o);   // FRiENDi Mobile
  W.postpaidSlide(D, m, n++, o);
  // Complaints Insights: Web + App over the whole width, Network and Social media under it
  let s = slideHead(D, m, o, 'Complaints Insights');
  place(s, by('webapp'), 0.45, 1.62, 12.45, 2.7, 'Web + App TKTs', { lineName: 'Web + App share of all complaints', labels: 'all' });
  const net = by('network'), netRows = net ? (r => (r.length >= 6 ? r : net.rows.slice(-13)))(net.rows.filter(r => r.ym >= `${lastRow(net).ym.slice(0, 4)}-01`)) : null;
  place(s, net, 0.45, 4.45, 6.15, 2.62, 'Network TKTs', { rows: netRows || undefined, labels: 'big' });
  place(s, by('social'), 6.75, 4.45, 6.15, 2.62, 'Social Media issue TKTs', { labels: 'all' });
  W.foot(s, o, n++);
  // Complaints Insights: Rebooking by month over the whole width, Vnet and the month so far under it
  s = slideHead(D, m, o, 'Complaints Insights');
  place(s, by('rebooking'), 0.45, 1.62, 12.45, 2.7, 'Rebooking TKTs', { title: `${(by('rebooking') || {}).title || 'Rebooking TKTs'} (booking code reactivations)`, labels: 'all' });
  place(s, by('vnet'), 0.45, 4.45, 6.15, 2.62, 'Vnet Complaints', { labels: 'all' });
  soFar(s, ['rebooking', 'network', 'webapp', 'social', 'vnet'].map(by).filter(Boolean), 6.75, 4.45, 6.15, 2.62);
  W.foot(s, o, n++);
  // any other table in the email: two a slide
  const other = tables.filter(t => t.key === 'other');
  for (let i = 0; i < other.length; i += 2) {
    s = slideHead(D, m, o, 'More Insights');
    place(s, other[i], 0.45, 1.62, 12.45, 2.7, other[i].title, { rows: other[i].rows.slice(-14) });
    if (other[i + 1]) place(s, other[i + 1], 0.45, 4.45, 12.45, 2.62, other[i + 1].title, { rows: other[i + 1].rows.slice(-14) });
    W.foot(s, o, n++);
  }
  W.thanks(D, o);
  return D;
}
const fileName = date => `MC_Performance_Review - ${WD.longDate(date)}.pptx`;
return { tablesOf, cellsOf, monthOf, chartOf, deck, fileName };
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'), typeof WcDeck !== 'undefined' ? WcDeck : require('./wcdeck.js'));
if (typeof module !== 'undefined') module.exports = PrDeck;
