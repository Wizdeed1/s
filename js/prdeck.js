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
  if ((x = t.match(/^until\s+(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?$/)) && monOf(x[2])) return { m: monOf(x[2]), y: null, until: +x[1] };   // Until 05 Oct
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
      const until = r.until ? `Until ${pad(r.until)} ${MON[r.m - 1]}` : '';
      return { ym, until: r.until, label: until || `${MON[r.m - 1]}-${String(y).slice(2)}`, label2: until || `${String(y).slice(2)}-${MON[r.m - 1]}`, vals: Array.from({ length: n }, (_, k) => r.vals[k] ?? null) };
    });
    return { key: (KEYS.find(([re]) => re.test(t.title)) || [, 'other'])[1], title: t.title, first: tidy(head.join(' ')) || 'Month', cols, rows };
  });
}

// ---------------------------------------------------------------- the MC KPIs workbook and the decks' own logos
const SERIAL = v => (typeof v === 'number' && v > 20000 && v < 80000 ? new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10) : null);
/** a cell that is a day: an Excel date number, a Date, or 2026-10-05 / 5/10/2026 / 5-Oct-26 */
function dayOf(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const d = SERIAL(v); if (d) return d;
  const t = sp(v).toLowerCase(); let x;
  if ((x = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${x[1]}-${x[2]}-${x[3]}`;
  if ((x = t.match(/^(\d{1,2})[-\s]([a-z]{3,9})[-\s](\d{2,4})$/)) && monOf(x[2])) return `${yy(x[3])}-${pad(monOf(x[2]))}-${pad(+x[1])}`;
  if ((x = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${x[3]}-${pad(+x[2])}-${pad(+x[1])}`;
  return null;
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^-?[\d,.]+$/.test(v.trim()) ? parseFloat(v.replace(/,/g, '')) : null);
const cellText = v => sp(v == null ? '' : v instanceof Date ? '' : String(v));
/**
 * The MC KPIs workbook the team's charts are linked to: its "Reactivate the Booking code" sheet (the requests by day, Virgin and
 * Friendi, with the average time to close; and by month) and its "OTP & Termination" sheet (OTP calls by day; final termination
 * calls by month). sheets: [{ name, rows }] (rows of cells, dates as Excel numbers). Each part is found by its heading.
 */
function kpiOf(sheets) {
  const out = {};
  const rb = (sheets || []).find(x => /reactivat|booking\s*code|rebook/i.test(x.name));
  if (rb) {
    const R = rb.rows || [];
    for (let r = 0; r < R.length; r++) {
      const row = R[r] || [], vi = row.findIndex(c => /^virgin$/i.test(cellText(c))), fi = row.findIndex(c => /^friendi$/i.test(cellText(c)));
      if (vi < 0 || fi < 0) continue;
      const dc = Math.min(vi, fi) - 1, ac = row.findIndex(c => /avg|time to close/i.test(cellText(c))), first = (R[r + 1] || [])[dc];
      if (dc < 0) continue;
      if (dayOf(first) && !out.byDay) {
        out.byDay = [];
        for (let k = r + 1; k < R.length; k++) { const q = R[k] || [], d = dayOf(q[dc]); if (!d) break; out.byDay.push({ date: d, virgin: num(q[vi]), friendi: num(q[fi]), avg: ac >= 0 ? num(q[ac]) : null }); }
      } else if (monthOf(cellText(first)) && !out.byMonth) {
        const L = [];
        for (let k = r + 1; k < R.length; k++) { const q = R[k] || [], c = cellText(q[dc]); if (!monthOf(c)) break; L.push([c, num(q[vi]), num(q[fi])]); }
        if (L.length) out.byMonth = L;
      }
    }
  }
  const ot = (sheets || []).find(x => /otp|terminat/i.test(x.name));
  if (ot) {
    const R = ot.rows || [], at = re => { for (let r = 0; r < R.length; r++) { const c = (R[r] || []).findIndex(v => re.test(cellText(v))); if (c >= 0) return [r, c]; } return null; };
    const series = (pos, asMonth) => {
      if (!pos || pos[1] < 1) return null; const [r0, c] = pos, L = [];
      for (let k = r0 + 1; k < R.length; k++) { const q = R[k] || [], d = dayOf(q[c - 1]), v = num(q[c]); if (d && v != null) L.push(asMonth ? { ym: d.slice(0, 7), n: v } : { date: d, n: v }); }
      return L.length ? L : null;
    };
    out.otp = series(at(/^otp\s*count/i), false);
    out.term = series(at(/termination\s*count|^final\s*termination/i), true);
  }
  return out;
}
/** the logos in one of the team's decks: the Beyond One mark (the dark slides), the mark with the name (the other slides) and the
    brands' logos (top right of their slides); by the pictures' own names, else by where they sit. z: a zip ({ names, text, bytes }) */
async function logosOf(z) {
  const out = {}, slides = z.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
  for (const sn of slides) {
    const xml = (await z.text(sn)) || '', rels = (await z.text(sn.replace('slides/', 'slides/_rels/') + '.rels')) || '';
    const rel = {}; for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) { const id = (m[0].match(/Id="([^"]+)"/) || [])[1], t = (m[0].match(/Target="([^"]+)"/) || [])[1]; if (id && t) rel[id] = t; }
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join(' '), dark = /<p:bg>[\s\S]*?srgbClr val="1E2761"/i.test(xml) || /Thank You/.test(text);
    const brand = /FRiENDi Pay\s+—/.test(text) ? 'fpay' : /FRiENDi Mobile\s+—/.test(text) ? 'friendi' : /Virgin Mobile\s+—/.test(text) ? 'virgin' : null;
    for (const m of xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
      const b = m[1], descr = ((b.match(/descr="([^"]*)"/) || [])[1] || '').toLowerCase(), id = (b.match(/r:embed="([^"]+)"/) || [])[1], off = b.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
      const t = id && rel[id]; if (!t || !/\.(png|jpe?g|gif)$/i.test(t)) continue;
      const x = off ? +off[1] / 914400 : 0, y = off ? +off[2] / 914400 : 0;
      const key = /mark/.test(descr) ? 'mark' : /full|beyond/.test(descr) ? 'full' : /friendi.?pay|fpay/.test(descr) ? 'fpay' : /friendi/.test(descr) ? 'friendi' : /virgin/.test(descr) ? 'virgin'
        : x > 11 && y < 1 && brand ? brand : x < 1.2 && y < 1.2 ? (dark ? 'mark' : 'full') : dark && y < 3 ? 'mark' : null;
      if (!key || out[key]) continue;
      const path = 'ppt/' + t.replace(/^\.\.\//, '').replace(/^\/?ppt\//, ''), bytes = await z.bytes(path);
      if (bytes && bytes.length) out[key] = { bytes, type: /\.png$/i.test(t) ? 'image/png' : /\.gif$/i.test(t) ? 'image/gif' : 'image/jpeg' };
    }
  }
  return out;
}

// ---------------------------------------------------------------- the slides (as the team's deck has them)
const THEME = ['156082', 'E97132', '196B24', '0F9ED5', 'A02B93', '4EA72E'];   // the deck's chart colours
const isTotal = c => /^total$/i.test(c.trim());
const lastRow = t => t.rows[t.rows.length - 1];
/** a chart of a table: a column per series (the Total and any share left out); labels on all, or on the biggest series */
function chartOf(t, o = {}) {
  const rows = o.rows || t.rows, idx = t.cols.map((c, i) => i).filter(i => !/%|share|rate/i.test(t.cols[i]));
  let bars = idx; if (bars.length > 1) bars = bars.filter(i => !isTotal(t.cols[i]));
  const sums = bars.map(i => rows.reduce((a, r) => a + (r.vals[i] || 0), 0)), big = bars[sums.indexOf(Math.max(...sums))];
  const lab = o.labels || (bars.length <= 2 ? 'all' : 'big');
  return {
    cats: rows.map(r => (o.yearFirst ? r.label2 || r.label : r.label)), d3: !!o.d3, gap: o.gap ?? 150, overlap: o.overlap, catRot: rows.length > 12 ? -45 : undefined, catSize: 900, axisSize: 900, axisColor: '0E2841',
    border: WD.parts.FRAME, gridColor: 'D9D9D9', legendSize: 900, labelSize: 900, labelColor: '0E2841', barFmt: '#,##0',
    bars: bars.map((i, k) => ({ name: t.cols[i], values: rows.map(r => r.vals[i]), color: THEME[k % THEME.length], grad: o.grad !== false, labels: lab === 'all' || (lab === 'first' && k === 0) || (lab === 'big' && i === big) })),
  };
}
const since = t => lastRow(t).until ? lastRow(t).label : `To ${lastRow(t).label}`;
const kick = (s, m, o) => WD.parts.tt(s, 8.42, 0.11, 4.55, 0.22, `MC Service Level Stabilization  ·  ${WD.parts.deckDate(m.date)}`, { size: 9.5, color: WD.parts.MUTED, align: 'right' });
const title = (s, x, y, t, size = 30) => WD.parts.tt(s, x, y, 8.10, 0.55, t, { size, bold: true, font: WD.parts.HEAD, color: WD.parts.NAVY, name: 'Title' });
const sub = (s, x, y, t, w = 7.85) => WD.parts.tt(s, x, y, w, 0.28, t, { size: 12.5, bold: true, color: WD.parts.NAVY });
/** a place a table the email lacks */
function missing(s, x, y, w, h, name) {
  s.rect(x, y, w, h, { fill: 'F7F8FA', line: 'E3E5EA', radius: 0.03 });
  s.text(x, y, w, h, `${name}: not in the email`, { size: 11, italic: true, color: WD.parts.MUTED, align: 'center', valign: 'middle' });
}
function complaints(D, m, o, by, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' });
  W.logoTop(s, o); kick(s, m, o); title(s, 0.45, 1.02, 'Complaints Insights');
  const at = (t, name, lx, ly, x, y, w, h, c) => { if (!t) { sub(s, lx, ly, name); missing(s, x, y, w, h, name); return; } sub(s, lx, ly, `${name} – ${since(t)}`); s.chart(x, y, w, h, chartOf(t, { d3: true, ...c }), { name }); };
  const net = by('network'), netRows = net ? (r => (r.length >= 6 ? r : net.rows.slice(-13)))(net.rows.filter(r => r.ym >= `${lastRow(net).ym.slice(0, 4)}-01`)) : null;
  at(by('webapp'), 'Web + App TKTs', 5.12, 1.51, 0.43, 1.88, 12.45, 2.63, { labels: 'all' });
  at(net, 'Network TKT', 0.45, 4.56, 0.43, 4.85, 6.04, 2.54, { rows: netRows || undefined, labels: 'big', yearFirst: true });
  at(by('social'), 'Social Media issue TKTs', 7.16, 4.57, 6.67, 4.84, 6.22, 2.53, { labels: 'all', yearFirst: true });
  W.foot(s, o, n);
}
const dd = d => `${d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`, dm = d => `${+d.slice(8, 10)}-${MON[+d.slice(5, 7) - 1]}`;
function rebooking(D, m, o, t, K, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' }), day = K.byDay && K.byDay.length ? K.byDay.slice(-22) : null;
  title(s, 0.43, 0.47, 'Complaints Insights');
  sub(s, 0.43, 1.16, day ? `Rebooking TKTs – From ${dm(day[0].date)} To ${dd(day[day.length - 1].date)}` : t ? `Rebooking TKTs – ${since(t)}` : 'Rebooking TKTs');
  const frame = { border: W.FRAME, gridColor: 'D9D9D9', axisSize: 900, axisColor: '0E2841', legendSize: 900, labelSize: 900, labelColor: '0E2841', titleSize: 1600 };
  if (day) {
    s.chart(2.16, 1.58, 9.79, 2.74, { ...frame, title: 'Booking Code Reactivations by Day', yTitle: 'Requests', y2Title: 'Avg Time to Close (hh:mm)', cats: day.map(r => dm(r.date)), gap: 219, overlap: -27, catSize: 800,
      bars: [{ name: 'Virgin', values: day.map(r => r.virgin), color: THEME[0], grad: true, labels: true }, { name: 'Friendi', values: day.map(r => r.friendi), color: THEME[1], grad: true }],
      line: day.some(r => r.avg != null) ? { name: 'Avg Time to Close', values: day.map(r => r.avg), color: THEME[2], w: 2.5, fmt: '[h]:mm', max: null, min: 0, labels: false, smooth: false, marker: { symbol: 'circle', size: 6, color: THEME[2] } } : undefined }, { name: 'Rebooking by day' });
  }
  const T = t || (K.byMonth ? { cols: ['Virgin', 'FRiENDi'], rows: K.byMonth.map(([c, v, f]) => { const L = monthOf(c); return { label: c, label2: c, vals: [v, f], until: L && L.until }; }) } : null);
  const [x, y, w, h] = day ? [2.11, 4.42, 9.84, 2.99] : [1.75, 1.62, 9.84, 5.45];
  if (T) {
    const vi = T.cols.findIndex(c => /virgin/i.test(c)), fi = T.cols.findIndex(c => /friendi/i.test(c));
    s.chart(x, y, w, h, { ...frame, title: 'Booking Code Reactivations by Month', cats: T.rows.map(r => r.label2 || r.label), gap: 219, overlap: -27,
      bars: [{ name: 'Virgin', values: T.rows.map(r => r.vals[vi >= 0 ? vi : 0]), color: THEME[0], labels: true }, { name: 'FRiENDi', values: T.rows.map(r => r.vals[fi >= 0 ? fi : 1]), color: THEME[1] }] }, { name: 'Rebooking by month' });
  } else missing(s, x, y, w, h, 'Rebooking TKTs');
}
function otpSlide(D, m, o, K, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' }), otp = K.otp ? K.otp.slice(-52) : null, term = K.term ? K.term.filter(r => r.ym >= `${K.term[K.term.length - 1].ym.slice(0, 4)}-01`) : null;
  const end = otp ? otp[otp.length - 1].date : m.ref, frame = { border: W.FRAME, gridColor: 'D9D9D9', axisSize: 900, axisColor: '0E2841', labelSize: 900, labelColor: '000000', legend: false };
  W.logoTop(s, o); kick(s, m, o);
  title(s, 0.45, 0.83, 'OTP Calls', 24); sub(s, 2.17, 1.03, `Until ${dd(end)}`, 6.67);
  if (otp) s.chart(1.31, 1.34, 10.98, 2.97, { ...frame, cats: otp.map(r => `${dm(r.date)}-${r.date.slice(2, 4)}`), gap: 100, overlap: -24, catRot: -45, catSize: 800,
    bars: [{ name: 'OTP Count', values: otp.map(r => r.n), color: THEME[0], grad: true, trend: [{ type: 'exp', dash: 'sysDash' }, { type: 'linear', dash: 'sysDash' }] }] }, { name: 'OTP calls' });
  else missing(s, 1.31, 1.34, 10.98, 2.97, 'OTP calls');
  W.tt(s, 0.19, 4.24, 6.67, 0.50, 'Final termination calls', { size: 24, bold: true, font: W.HEAD, color: W.NAVY }); sub(s, 3.94, 4.37, `Until ${dd(end)}`, 6.67);
  if (term) s.chart(1.31, 4.68, 10.98, 2.55, { ...frame, cats: term.map(r => `${MON[+r.ym.slice(5) - 1]}-${r.ym.slice(2, 4)}`), gap: 150,
    bars: [{ name: 'Final termination Count', values: term.map(r => r.n), color: THEME[0], labels: true, trend: [{ type: 'exp', dash: 'sysDot' }] }] }, { name: 'Final termination calls' });
  else missing(s, 1.31, 4.68, 10.98, 2.55, 'Final termination calls');
  W.foot(s, o, n);
}
/**
 * the Performance Review, as the team's deck: m = WcDeck.model() for the presentation's day (the brands' slides), tables =
 * tablesOf() from the email, o = { presenter, title, org, logo, logos, kpi: kpiOf() of the MC KPIs workbook }
 */
function deck(m, tables, o0 = {}) {
  const W = WD.parts, o = { ...o0, kicker: 'Weekly Commercial Presentation', coverSub: 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay', monthlyLabel: 'Monthly Trend', ppLabel: false };
  const D = P.create({ headFont: W.HEAD, bodyFont: 'Calibri' }), by = k => tables.find(t => t.key === k) || null, K = o0.kpi || {};
  let n = 2;
  W.cover(D, m, o);
  W.brandSlide(D, m, m.brands[0], n++, o);   // Virgin Mobile
  W.brandSlide(D, m, m.brands[1], n++, o);   // FRiENDi Mobile
  W.postpaidSlide(D, m, n++, o);
  complaints(D, m, o, by, n++);
  rebooking(D, m, o, by('rebooking'), K, n++);
  if (K.otp || K.term) otpSlide(D, m, o, K, n++);
  // a table the deck does not know (a new one in the email): two a slide
  const other = tables.filter(t => t.key === 'other');
  for (let i = 0; i < other.length; i += 2) {
    const s = D.slide({ bg: 'FFFFFF' });
    W.logoTop(s, o); kick(s, m, o); title(s, 0.45, 1.02, 'More Insights');
    [[other[i], 1.51, 1.88, 2.63], [other[i + 1], 4.56, 4.85, 2.54]].forEach(([t, ly, y, h]) => { if (!t) return; sub(s, 0.45, ly, `${t.title} – ${since(t)}`); s.chart(0.43, y, 12.45, h, chartOf(t, { rows: t.rows.slice(-14) }), { name: t.title }); });
    W.foot(s, o, n++);
  }
  W.thanks(D, o);
  return D;
}
const fileName = date => `MC_Performance_Review - ${WD.longDate(date)}.pptx`;
return { tablesOf, cellsOf, monthOf, chartOf, kpiOf, logosOf, dayOf, deck, fileName };
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'), typeof WcDeck !== 'undefined' ? WcDeck : require('./wcdeck.js'));
if (typeof module !== 'undefined') module.exports = PrDeck;
