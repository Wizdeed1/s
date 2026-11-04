/* MC Monthly Report Builder - the Weekly Commercial Presentation (Member Care Performance Review), every week for the commercial
   meeting. model(): each brand's numbers for the month to date - the service level and the daily and monthly trends from the
   brands' history (as the daily brand emails keep it), the top call reasons from the month's call history export, the complaints
   and tickets from the month's tickets export (FRiENDi Pay's from its tickets sheet when the export has none), and the outages the
   WFM team logs. deck(): the 7 slides of the presentation as a PowerPoint (cover, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay,
   Postpaid, outages, thank you); a number the files do not give shows "–". */
'use strict';
const WcDeck = ((P) => {
const BRANDS = [
  { k: 'virgin', name: 'Virgin Mobile', short: 'Virgin', color: 'D0021B', bar: 'C00000' },
  { k: 'friendi', name: 'FRiENDi Mobile', short: 'FRiENDi', color: '119DA4', bar: '009999' },
  { k: 'fpay', name: 'FRiENDi Pay', short: 'FRiENDi Pay', color: 'C8860D', bar: 'C8860D' },
];
const POSTPAID = { k: 'postpaid', name: 'Cross-Brand Postpaid', short: 'Postpaid', color: '3A5A8C', bar: '0070C0' };
// the template the team's decks are made with: Cambria headings, Calibri text, navy 1E2761
const NAVY = '1E2761', BAR = 'D9D9D9', INK = '2B2F42', MUTED = '6B7280', SOFT = 'F4F6FB', PALE = 'CADCFC', DIM = '9FB3DE', FOOT = '9AA3B2', RULE = '5470A8', SLINE = '002060', HEAD = 'Cambria', FRAME = 'A6A6A6';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DASH = '–';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const prevMonth = ym => { let y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1; if (!m) { m = 12; y--; } return `${y}-${pad(m)}`; };
const mShort = ym => `${MON[+ym.slice(5, 7) - 1]}-${ym.slice(2, 4)}`;                  // Jan-26
const mLong = ym => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;                   // Oct 2026
const mApos = ym => `${MON[+ym.slice(5, 7) - 1]} '${ym.slice(2, 4)}`;                  // Sep '26
const dShort = s => `${+s.slice(8, 10)}-${MON[+s.slice(5, 7) - 1]}`;                   // 6-Aug
const longDate = s => `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`; // 25 Oct 2026
const deckDate = s => `${s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;  // 06 Oct 2026, as the slides write it
const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const numOr = v => (v === null || v === undefined || v === '' || typeof v === 'boolean' || !Number.isFinite(+v) ? null : +v);
const mean = L => { const v = L.map(numOr).filter(x => x !== null); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; };
const int = v => (v === null || v === undefined ? DASH : Math.round(v).toLocaleString('en-US'));
const pct = v => (v === null || v === undefined ? DASH : Math.round(v * 100) + '%');
const norm = s => String(s ?? '').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
/** a table cell's text on one line: cut with … to what fits the column (8pt Calibri, about 20 characters an inch) */
const fit = (t, inches) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(), n = Math.max(8, Math.floor((inches - 0.12) * 20)); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

// ---------------------------------------------------------------- the numbers
/** a set of days' voice numbers as the brands' history keeps them: calls presented and handled a day on average, and the service
    level as the average of the days' service levels (as the daily brand emails show the month to date) */
function voiceOf(rows) {
  if (!rows.length) return null;
  return { presented: mean(rows.map(r => r.presented)), handled: mean(rows.map(r => r.handled)), sl: mean(rows.map(r => r.sl)), days: rows.length };
}
/** one brand's voice from the history: the month's days up to ref, the month to date, the months before (this year's, at least
    six) from the history's monthly rows (or its days when a month has no monthly row), and the month before */
function brandVoice(H, b, ref) {
  const V = (H && typeof H === 'object' && H[b] && H[b].voice) || {};
  const daily = (Array.isArray(V.daily) ? V.daily : []).filter(r => r && isDay(r.date));
  const monthly = (Array.isArray(V.monthly) ? V.monthly : []).filter(r => r && isDay(r.date));
  const ym = ref.slice(0, 7), start = ym + '-01';
  const days = daily.filter(r => r.date >= start && r.date <= ref).sort((a, c) => (a.date < c.date ? -1 : a.date > c.date ? 1 : 0));
  const seen = new Set(), uniq = days.filter(r => (seen.has(r.date) ? false : (seen.add(r.date), true)));
  const monthAvg = m => {
    const e = monthly.find(r => r.date.slice(0, 7) === m);
    if (e && (numOr(e.presented) !== null || numOr(e.sl) !== null)) return { presented: numOr(e.presented), handled: numOr(e.handled), sl: numOr(e.sl) };
    return voiceOf(daily.filter(r => r.date.slice(0, 7) === m));
  };
  const months = []; let m = prevMonth(ym);
  while (months.length < 24 && (m.slice(0, 4) === ym.slice(0, 4) || months.length < 6)) { months.unshift(m); m = prevMonth(m); }
  const trend = months.map(x => ({ m: x, label: mShort(x), v: monthAvg(x) }));
  while (trend.length && !trend[0].v) trend.shift();
  const mtd = voiceOf(uniq);
  trend.push({ m: ym, label: 'MTD', v: mtd });
  return { daily: uniq, mtd, trend, prev: monthAvg(prevMonth(ym)) };
}
/** the brand a ticket is for, from its type: FRiENDi Pay, FRiENDi, or Virgin (as the daily emails split them) */
function ticketBrand(type) {
  const t = String(type ?? '').trim(); if (!t) return null;
  if (/friendi\s*pay|\bf\s*pay\b/i.test(t)) return 'fpay';
  return /friendi/i.test(t) ? 'friendi' : 'virgin';
}
/** the rows of the month up to ref (rows with no date anywhere: all of them) */
function monthRows(rows, dateOf, ym, ref) {
  const L = (rows || []).map(r => [r, dateOf(r)]);
  if (!L.some(x => x[1])) return (rows || []).slice();
  return L.filter(x => x[1] && x[1].slice(0, 7) === ym && x[1] <= ref).map(x => x[0]);
}
/** the top lines by a column: count and share of all the rows */
function topBy(rows, get, n, skip = []) {
  const sk = new Set(skip.map(norm)), counts = new Map(), first = new Map();
  rows.forEach((r, i) => { const v = String(get(r) ?? '').trim(); if (!v) return; counts.set(v, (counts.get(v) || 0) + (numOr(r.count) ?? 1)); if (!first.has(v)) first.set(v, i); });
  const base = rows.reduce((a, r) => a + (numOr(r.count) ?? 1), 0), list = [];
  counts.forEach((c, v) => { if (!sk.has(norm(v))) list.push({ label: v, count: c, pct: base ? c / base : 0, at: first.get(v) }); });
  list.sort((a, c) => c.count - a.count || a.at - c.at);
  return { base, list: list.slice(0, n) };
}
/** a brand's tickets: how many were logged, how many of the closed ones were closed within onTimeH hours, how many are not closed,
    and the complaint types they were logged for */
function ticketStats(rows, E, onTimeH, skip) {
  const T = E.TCOL, st = r => String(r[T.status] ?? '').trim().toLowerCase();
  const hasSt = rows.some(r => st(r)), closed = rows.filter(r => st(r) === 'closed');
  const hours = closed.map(r => E.lifeCycleHours(r[T.lifeCycle])).filter(h => h !== null && h !== undefined && Number.isFinite(h));
  return {
    total: rows.length, open: hasSt ? rows.filter(r => st(r) !== 'closed').length : null, closed: closed.length,
    onTime: hours.length ? hours.filter(h => h <= onTimeH).length / hours.length : null, timed: hours.length,
    drivers: topBy(rows, r => r[T.sub], 5, skip || []),
  };
}
/**
 * The presentation's numbers.
 * input: { date (the presentation's day, yyyy-mm-dd), hist (the brands' history), calls (call history rows), tickets (tickets
 * export rows), fpayTickets ([{ date, category, sub, count }] from FRiENDi Pay's tickets sheet), outages ([{ date, title, brands,
 * desc }]), onTimeH (hours within which a closed ticket counts as on time), reports (the report builder's settings per brand) }
 * The month is the one of the day before the presentation: its days up to that day.
 */
function model(input, E) {
  const date = isDay(input.date) ? input.date : ymd(new Date()), ref = addDays(date, -1), ym = ref.slice(0, 7);
  const onTimeH = numOr(input.onTimeH) > 0 ? +input.onTimeH : 72, R = input.reports || {}, notes = [];
  const tDate = r => (E.ticketDate ? E.ticketDate(r[E.TCOL.date]) : null) || E.rowDate(r[E.TCOL.date]);
  const calls = Array.isArray(input.calls) && input.calls.length ? monthRows(input.calls, r => E.rowDate(r[E.COL.date]), ym, ref) : null;
  const tickets = Array.isArray(input.tickets) && input.tickets.length ? monthRows(input.tickets, tDate, ym, ref) : null;
  const sheet = Array.isArray(input.fpayTickets) && input.fpayTickets.length ? monthRows(input.fpayTickets, r => (isDay(r.date) ? r.date : null), ym, ref) : null;
  const supp = k => { const keep = ((R[k] || {}).keepReasons || (k === 'fpay' ? ['Follow Up'] : [])).map(norm); return (E.DEFAULT_SUPPRESSED || []).filter(s => !keep.includes(norm(s))); };
  const reasonsOf = k => {
    if (!calls) return null;
    const t = E.topReasons(E.sliceHistory(calls, k), supp(k), 5);
    return { base: t.base, list: t.list.map(x => ({ label: x.reason, count: x.count, pct: x.pct })) };
  };
  if (!calls) notes.push('No call history export: the top call reasons show –.');
  if (!tickets) notes.push('No tickets export: the complaints and tickets show –.');
  const brands = BRANDS.map(B => {
    const v = brandVoice(input.hist, B.k, ref), o = { ...B, v, reasons: reasonsOf(B.k), tickets: null, from: '' };
    if (!v.daily.length) notes.push(`${B.name}: no days of ${mLong(ym)} in the brands' history.`);
    const mine = tickets ? tickets.filter(r => ticketBrand(r[E.TCOL.type]) === B.k) : [];
    const skip = (R[B.k] || {}).ticketSkip || (B.k === 'virgin' ? ['Other'] : []);
    if (mine.length) { o.tickets = ticketStats(mine, E, onTimeH, skip); o.from = 'tickets'; }
    else if (B.k === 'fpay' && sheet) {
      const total = sheet.reduce((a, r) => a + (numOr(r.count) ?? 1), 0);
      o.tickets = { total, open: null, closed: null, onTime: null, timed: 0, drivers: topBy(sheet, r => (r.sub && norm(r.sub) !== norm(r.category) ? `${r.category} / ${r.sub}` : r.category || r.sub), 5) };
      o.from = 'sheet';
    } else if (tickets) notes.push(`${B.name}: no tickets in the tickets export${B.k === 'fpay' ? ' (drop FRiENDi Pay\'s tickets sheet)' : ''}.`);
    return o;
  });
  const pv = brandVoice(input.hist, 'postpaid', ref);
  const pt = tickets ? E.sliceTickets(tickets, 'postpaid') : null;
  const postpaid = { ...POSTPAID, v: pv, reasons: reasonsOf('postpaid'), tickets: pt ? topBy(pt, r => r[E.TCOL.sub], 5) : null };
  // the outages of the month and the two before, up to the presentation's day
  const from = prevMonth(prevMonth(ym)), lo = from + '-01';
  const out = (Array.isArray(input.outages) ? input.outages : []).filter(x => x && isDay(x.date) && x.date >= lo && x.date <= date)
    .slice().sort((a, c) => (a.date < c.date ? -1 : a.date > c.date ? 1 : 0));
  const hit = new Set(); out.forEach(x => (Array.isArray(x.brands) ? x.brands : []).forEach(k => hit.add(k)));
  return {
    date, ref, ym, month: mLong(ym), prev: mApos(prevMonth(ym)), onTimeH, brands, postpaid, notes,
    outages: { list: out, brands: hit.size, from, span: `${MON[+from.slice(5, 7) - 1]}–${mLong(ym)}` },
  };
}

// ---------------------------------------------------------------- the slides (the team's template: places, sizes and colours as in its decks)
const BRAND_NAME = { virgin: 'Virgin', friendi: 'FRiENDi', fpay: 'FRiENDi Pay' };
/** text in a box as the template has it: PowerPoint's margins (0.1 in, 0.05 in), in the middle of the box */
const tt = (s, x, y, w, h, c, o = {}) => s.text(x, y, w, h, c, { insetX: 0.1, insetY: 0.05, valign: 'middle', ...o });
/** a picture fitted in a box, its proportions kept; a wide one may run wider, up to maxW */
function pic(s, L, x, y, w, h, o = {}) {
  if (!L || !L.png || !(L.w > 0) || !(L.h > 0)) return false;
  let pw = w, ph = w * L.h / L.w;
  if (ph > h) { ph = h; pw = h * L.w / L.h; }
  if (o.maxW && L.w / L.h > w / h) { ph = h; pw = Math.min(o.maxW, h * L.w / L.h); ph = pw * L.h / L.w; }
  s.image(x + (o.center ? (w - pw) / 2 : 0), y + (o.middle ? (h - ph) / 2 : 0), pw, ph, L.png, { descr: o.descr || 'Logo', name: o.name || 'Logo' });
  return true;
}
const logos = o => o.logos || {};
/** the company's logo at the top left: the decks' own (the mark with the name under it), else the tool's logo, else the name */
function logoTop(s, o) {
  const G = logos(o);
  if (pic(s, G.full, 0.45, 0.36, 0.30, 0.46)) return;
  if (pic(s, G.mark || o.logo, 0.45, 0.36, 0.46, 0.46, { maxW: 1.6 })) return;
  tt(s, 0.45, 0.36, 3, 0.4, (o.org || 'Beyond One').toUpperCase(), { size: 12, bold: true, font: HEAD, color: NAVY, valign: 'middle', name: 'Logo' });
}
const SQ_COVER = [[11.30, 5.60, 0.80, '0976BC'], [12.08, 5.55, 0.55, '047B94'], [11.92, 6.28, 0.62, 'F5ACCC'], [10.75, 6.10, 0.42, '8C3A50'], [12.58, 6.02, 0.40, 'AD8A2E'], [11.45, 4.92, 0.36, '3E7A4E']];
const SQ_THANKS = [[-0.60, -0.60, 0.80, '0976BC'], [0.18, -0.65, 0.55, '047B94'], [0.02, 0.08, 0.62, 'F5ACCC'], [-1.15, -0.10, 0.42, '8C3A50'], [0.68, -0.18, 0.40, 'AD8A2E'], [-0.45, -1.28, 0.36, '3E7A4E'],
  [11.50, 5.90, 0.68, '0976BC'], [12.16, 5.86, 0.47, '047B94'], [12.03, 6.48, 0.53, 'F5ACCC'], [11.03, 6.33, 0.36, '8C3A50'], [12.59, 6.26, 0.34, 'AD8A2E'], [11.63, 5.32, 0.31, '3E7A4E']];
/** the see-through squares of the dark slides */
const squares = (s, L) => L.forEach(([x, y, w, c]) => s.rect(x, y, w, w, { fill: c, alpha: 0.55 }));
function head(s, o, m, title, sub) {
  logoTop(s, o);
  tt(s, 8.30, 0.74, 4.55, 0.22, `${o.kicker || 'Weekly Commercial Presentation'}  ·  ${deckDate(m.date)}`, { size: 9.5, color: MUTED, align: 'right' });
  tt(s, 0.45, 1.02, 8.10, 0.55, title, { size: 30, bold: true, font: HEAD, color: NAVY, name: 'Title' });
  tt(s, 0.45, 1.56, 8.10, 0.32, sub, { size: 13.5, italic: true, color: MUTED });
}
function foot(s, o, n) {
  tt(s, 0.45, 7.14, 4.00, 0.28, `${o.org || 'Beyond One'}  |  Member Care`, { size: 8.5, color: FOOT });
  tt(s, 12.43, 7.14, 0.45, 0.28, String(n), { size: 8.5, color: FOOT, align: 'right' });
}
/** the big number at the top right: the month's service level, in the brand's colour, with its shadow */
function callout(s, x, y, w, h, color, big, small) {
  s.rect(x, y, w, h, { fill: color, radius: 0.08, shadow: true, name: 'Callout' });
  tt(s, x, y + 0.03, w, h - 0.06, [[{ t: big, size: 30, bold: true }], [{ t: small, size: 10 }]], { color: 'FFFFFF', align: 'center', valign: 'middle' });
}
function tile(s, x, y, big, lab, color) {
  s.rect(x, y, 1.37, 0.92, { fill: SOFT, radius: 0.06 });
  s.rect(x, y, 0.06, 0.92, { fill: 'FFFFFF', radius: 0.5 });
  tt(s, x, y + 0.08, 1.37, 0.51, big, { size: 19, bold: true, font: HEAD, color, align: 'center', valign: 'middle' });
  tt(s, x + 0.05, y + 0.55, 1.27, 0.35, lab, { size: 8.5, color: MUTED, align: 'center', valign: 'top', insetY: 0.02 });
}
/** a chart's heading (12.5pt) and a table's (11.5pt), navy */
function label(s, x, y, w, t, size = 12.5) { tt(s, x, y, w, 0.28, t, { size, bold: true, color: NAVY }); }
/** a table of the top lines: label, count and share (or label and share), in the template's table style */
function topTable(s, x, y, w, head0, top, withCount, o = {}) {
  const L = top && top.list && top.list.length ? top.list : null;
  const cols = withCount ? [w - 1.40, 0.75, 0.65] : [w - 0.75, 0.75];
  const rows = [withCount ? [head0, { t: 'Vol.', align: 'center' }, { t: '%', align: 'center' }] : [head0, { t: '%', align: 'center' }]];
  (L || [{ label: DASH, count: null, pct: null }]).forEach(r => rows.push(withCount ? [fit(r.label, cols[0] * 1.1), int(r.count), pct(r.pct)] : [fit(r.label, cols[0] * 1.1), pct(r.pct)]));
  s.table(x, y, rows, { cols, rowH: o.rowH || 0.27, size: 9, head: { fill: NAVY, color: 'FFFFFF' }, border: 'E2E6EF', ink: INK });
}
/** columns of calls presented and handled, and the service level as a line on its own axis (0–120%), framed */
function trendChart(s, x, y, w, h, cats, rows, color, o = {}) {
  s.chart(x, y, w, h, {
    cats, gap: 219, overlap: 0, catRot: cats.length > 12 ? -45 : undefined, catSize: cats.length > 12 ? 800 : 900, axisSize: 900, border: 'BFBFBF', fill: 'FFFFFF', gridColor: 'D9D9D9', legendSize: 900,
    bars: [{ name: 'Calls Presented', values: rows.map(r => (r ? r.presented : null)), color: BAR }, { name: 'Calls Handled', values: rows.map(r => (r ? r.handled : null)), color }],
    line: { name: 'Service Level', values: rows.map(r => (r ? r.sl : null)), color: SLINE, w: 2.25, fmt: '0%', max: null, min: null, labelSize: 900, labelBold: true, labelColor: '404040' },
  }, { name: o.name || 'Chart' });
}
function brandSlide(D, m, B, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), v = B.v, t = B.tickets;
  head(s, o, m, 'Performance Insights', `${B.name} — Contact Centre Voice Channel`);
  foot(s, o, n);   // under the charts, as in the template
  if (!pic(s, logos(o)[B.k], 12.45, 0.30, 0.40, 0.40, { center: true, middle: true, descr: B.name, name: 'Brand' })) tt(s, 10.6, 0.3, 2.25, 0.32, B.name, { size: 11, bold: true, color: B.color, align: 'right', name: 'Brand' });
  callout(s, 10.85, 0.95, 2.03, 1.12, B.color, pct(v.mtd && v.mtd.sl), `Service Level · ${m.month}`);
  label(s, 0.45, 2.10, 7.85, `Daily Trend — ${m.month}`);
  trendChart(s, 0.43, 2.42, 7.35, 2.27, v.daily.map(r => dShort(r.date)), v.daily, B.bar, { name: 'Daily trend' });
  label(s, 0.45, 4.66, 7.85, o.monthlyLabel || `Monthly Trend — ${(v.trend[0] || { m: m.ym }).m.slice(0, 4)} to Date`);
  trendChart(s, 0.43, 4.91, 7.35, 2.51, v.trend.map(x => x.label), v.trend.map(x => x.v), B.bar, { name: 'Monthly trend' });
  const tiles = B.k === 'fpay'
    ? [[int(t && t.total), 'Complaints logged'], [int(t && t.open), 'Tickets still open'], [pct(v.prev && v.prev.sl), `Service level — ${m.prev}`]]
    : [[int(t && t.total), 'Complaints logged'], [pct(t && t.onTime), 'Closed tickets resolved on time'], [int(t && t.open), 'Tickets still open']];
  tiles.forEach(([big, lab], i) => tile(s, [8.62, 10.07, 11.53][i], 2.10, big, lab, B.color));
  label(s, 8.62, 3.27, 4.28, 'Top Call Reasons', 11.5);
  topTable(s, 8.62, 3.55, 4.28, 'Reason', B.reasons, true);
  label(s, 8.62, 5.37, 4.28, 'Top Complaint Drivers', 11.5);
  topTable(s, 8.62, 5.65, 4.28, 'Complaint Type', t && t.drivers, false);
}
function postpaidSlide(D, m, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), B = m.postpaid, v = B.v;
  head(s, o, m, 'Postpaid Insights', `${B.name} — Contact Centre Voice Channel`);
  foot(s, o, n);
  callout(s, 10.85, 0.95, 2.03, 1.12, B.color, pct(v.mtd && v.mtd.sl), `Service Level · ${m.month}`);
  if (o.ppLabel === false) trendChart(s, 0.45, 2.18, 12.40, 3.26, v.daily.map(r => dShort(r.date)), v.daily, B.bar, { name: 'Daily trend' });   // the review's: the chart without its heading
  else { label(s, 0.45, 1.93, 12.43, `Daily Trend — ${m.month}`); trendChart(s, 0.45, 2.21, 12.40, 3.18, v.daily.map(r => dShort(r.date)), v.daily, B.bar, { name: 'Daily trend' }); }
  label(s, 0.45, 5.44, 6.05, 'Top 5 Call Reasons', 11.5);
  topTable(s, 0.45, 5.72, 6.05, 'Reason', B.reasons, true, { rowH: 0.225 });
  label(s, 6.83, 5.44, 6.05, 'Top 5 Tickets', 11.5);
  topTable(s, 6.83, 5.72, 6.05, 'Top 5 TKT', B.tickets, true, { rowH: 0.225 });
}
const OUT_ROWS = 17;
function outageSlides(D, m, n0, o) {
  const O = m.outages, L = O.list, pages = Math.max(1, Math.ceil(L.length / OUT_ROWS));
  for (let p = 0; p < pages; p++) {
    const s = D.slide({ bg: 'FFFFFF' });
    logoTop(s, o);
    tt(s, 8.30, 0.74, 4.55, 0.22, deckDate(m.date), { size: 9.5, color: MUTED, align: 'right' });
    tt(s, 0.45, 1.02, 8.10, 0.55, p ? 'Outages Insights (continued)' : 'Outages Insights', { size: 30, bold: true, font: HEAD, color: NAVY, name: 'Title' });
    tt(s, 0.45, 1.56, 8.10, 0.32, `Service Incidents Logged — Last 3 Months (${O.span})`, { size: 13.5, italic: true, color: MUTED });
    callout(s, 10.85, 0.95, 2.03, 1.12, NAVY, String(L.length), `Incidents logged, ${O.brands === 1 ? '1 brand' : O.brands + ' brands'}`);
    const part = L.slice(p * OUT_ROWS, (p + 1) * OUT_ROWS);
    if (!part.length) tt(s, 0.45, 2.6, 12.3, 0.4, `No outages logged in ${O.span}.`, { size: 12, color: MUTED, italic: true });
    else {
      const rows = [['Date', 'Outage and Issue', 'Affected Brand', 'Description']]
        .concat(part.map(x => [dShort(x.date), fit(x.title, 2.7), fit((Array.isArray(x.brands) ? x.brands : []).map(k => BRAND_NAME[k] || k).join(', '), 1.95), fit(x.desc, 6.8)]));
      s.table(0.45, 2.35, rows, { cols: [0.9, 2.7, 1.95, 6.85], rowH: 0.25, size: 8.5, align: ['center', 'center', 'center', 'center'], head: { fill: NAVY, color: 'FFFFFF' }, border: 'E2E6EF', ink: INK });
    }
    foot(s, o, n0 + p);
  }
  return pages;
}
function cover(D, m, o) {
  const s = D.slide({ bg: NAVY }), G = logos(o);
  squares(s, SQ_COVER);
  const mark = pic(s, G.mark || o.logo, 0.55, 0.50, 0.48, 0.48, { maxW: 1.5 });
  tt(s, mark ? 1.13 : 0.55, 0.63, 3.00, 0.40, (o.org || 'Beyond One').toUpperCase(), { size: 17, bold: true, font: HEAD, color: 'FFFFFF', spc: 2 });
  tt(s, 0.55, 2.65, 11.50, 0.90, 'Member Care Performance Review', { size: 40, bold: true, font: HEAD, color: 'FFFFFF', name: 'Title' });
  tt(s, 0.55, 3.55, 10.50, 0.45, o.coverSub || 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay  —  Weekly Commercial Presentation', { size: 16, color: PALE });
  s.line(0.58, 4.25, 2.78, 4.25, { color: RULE, w: 1 });
  tt(s, 0.55, 4.42, 4.00, 0.35, deckDate(m.date), { size: 13, color: DIM });
  const who = [o.presenter ? [{ t: o.presenter, size: 12.5, bold: true, color: 'FFFFFF' }] : null, o.title || o.org ? [{ t: [o.title, o.org].filter(Boolean).join(' — '), size: 11.5, color: DIM }] : null].filter(Boolean);
  if (who.length) tt(s, 0.55, 6.55, 6.00, 0.60, who, {});
}
function thanks(D, o) {
  const s = D.slide({ bg: NAVY }), G = logos(o);
  squares(s, SQ_THANKS);
  pic(s, G.mark || o.logo, 6.39, 2.15, 0.56, 0.56, { center: true, middle: true, maxW: 1.5 });
  tt(s, 0, 3.05, 13.33, 1.00, 'Thank You', { size: 44, bold: true, font: HEAD, color: 'FFFFFF', align: 'center', name: 'Title' });
  tt(s, 0, 3.95, 13.33, 0.40, o.thanksSub || 'Member Care Performance Review  —  Weekly Commercial Presentation', { size: 14, color: PALE, align: 'center' });
  const who = [o.presenter, o.title, o.org].filter(Boolean).join('  ·  ');
  if (who) tt(s, 0, 6.85, 13.33, 0.35, who, { size: 11, color: DIM, align: 'center' });
}
/** the PowerPoint: o = { presenter, title (their job title), org (the company), logo (the tool's: { png, w, h }), logos (the decks'
    own pictures: mark, full, virgin, friendi, fpay) } */
function deck(m, o = {}) {
  const D = P.create({ headFont: HEAD, bodyFont: 'Calibri' });
  cover(D, m, o);
  m.brands.forEach((B, i) => brandSlide(D, m, B, i + 2, o));
  postpaidSlide(D, m, 5, o);
  outageSlides(D, m, 6, o);
  thanks(D, o);
  return D;
}
const fileName = date => `Beyond_One_Member_Care_Review - ${longDate(date)}.pptx`;
return { model, deck, fileName, brandVoice, ticketBrand, longDate, dShort, BRANDS, POSTPAID,
  parts: { cover, thanks, brandSlide, postpaidSlide, logoTop, pic, tt, foot, callout, label, fit, int, pct, deckDate, logos, NAVY, MUTED, INK, HEAD, FRAME, MON } };   // for the Performance Review deck (prdeck.js)
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'));
if (typeof module !== 'undefined') module.exports = WcDeck;
