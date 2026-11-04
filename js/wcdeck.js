/* MC Monthly Report Builder - the Weekly Commercial Presentation (Member Care Performance Review), every week for the commercial
   meeting. model(): each brand's numbers for the month to date - the service level and the daily and monthly trends from the
   brands' history (as the daily brand emails keep it), the top call reasons from the month's call history export, the complaints
   and tickets from the month's tickets export (FRiENDi Pay's from its tickets sheet when the export has none), and the outages the
   WFM team logs. deck(): the 7 slides of the presentation as a PowerPoint (cover, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay,
   Postpaid, outages, thank you); a number the files do not give shows "–". */
'use strict';
const WcDeck = ((P) => {
const BRANDS = [
  { k: 'virgin', name: 'Virgin Mobile', short: 'Virgin', color: 'C8102E' },
  { k: 'friendi', name: 'FRiENDi Mobile', short: 'FRiENDi', color: '0FA3A3' },
  { k: 'fpay', name: 'FRiENDi Pay', short: 'FRiENDi Pay', color: 'C9870A' },
];
const POSTPAID = { k: 'postpaid', name: 'Cross-Brand Postpaid', short: 'Postpaid', color: '3D5A8A' };
const NAVY = '1F2A5C', BAR = 'D9D9D9', INK = '262626', MUTED = '7F7F7F', SOFT = 'F3F4F7', PALE = 'CADCFC';
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

// ---------------------------------------------------------------- the slides
const BRAND_NAME = { virgin: 'Virgin', friendi: 'FRiENDi', fpay: 'FRiENDi Pay' };
/** the logo at the top left: the company's logo when the tool has one, else its name */
function logoAt(s, o, x, y, dark) {
  const L = o.logo;
  if (L && L.png && L.w && L.h) {
    const h = 0.5, w = Math.min(2.2, h * L.w / L.h);
    if (dark) s.rect(x - 0.08, y - 0.08, w + 0.16, h + 0.16, { fill: 'FFFFFF', radius: 0.12 });
    s.image(x, y, w, h, L.png, { descr: o.org || 'Logo', name: 'Logo' });
  } else s.text(x, y, 3, 0.4, (o.org || 'Beyond One').toUpperCase(), { size: 12, bold: true, font: 'Georgia', color: dark ? 'FFFFFF' : NAVY, valign: 'middle', name: 'Logo' });
}
/** the squares on the dark slides */
function squares(s, x, y) {
  [[0.75, 0, 0.35, '2F6B5E'], [0.55, 0.65, 0.8, '1E5BA8'], [1.35, 0.6, 0.55, '1F6F8C'], [0, 1.0, 0.42, '5B3A5E'], [1.2, 1.2, 0.62, '8E7FA6'], [1.85, 0.95, 0.4, '7A6A3E']]
    .forEach(([dx, dy, w, c]) => s.rect(x + dx, y + dy, w, w, { fill: c }));
}
function head(s, o, m, title, sub) {
  logoAt(s, o, 0.45, 0.3, false);
  s.text(8.2, 0.72, 4.65, 0.25, `${o.kicker || 'Weekly Commercial Presentation'}  ·  ${longDate(m.date)}`, { size: 9, color: MUTED, align: 'right' });
  s.text(0.5, 1.0, 9.5, 0.6, title, { size: 30, bold: true, font: 'Georgia', color: NAVY, name: 'Title' });
  s.text(0.5, 1.6, 9.5, 0.32, sub, { size: 12, italic: true, color: MUTED });
}
function foot(s, o, n) {
  s.text(0.5, 7.12, 5, 0.25, `${o.org || 'Beyond One'}  |  Member Care`, { size: 8, color: 'A6A6A6' });
  s.text(11.85, 7.12, 1, 0.25, String(n), { size: 8, color: 'A6A6A6', align: 'right' });
}
/** the big number at the top right: the month's service level, in the brand's colour */
function callout(s, x, y, w, h, color, big, small) {
  s.rect(x, y, w, h, { fill: color, radius: 0.08, name: 'Callout' });
  s.text(x, y + 0.1, w, h * 0.55, big, { size: 28, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
  s.text(x, y + h * 0.6, w, h * 0.3, small, { size: 9, color: 'FFFFFF', align: 'center', valign: 'top' });
}
function tile(s, x, y, w, h, big, label, color) {
  s.rect(x, y, w, h, { fill: SOFT, radius: 0.06 });
  s.text(x, y + 0.12, w, 0.42, big, { size: 18, bold: true, color, align: 'center', valign: 'middle' });
  s.text(x + 0.05, y + 0.55, w - 0.1, h - 0.6, label, { size: 8, color: '595959', align: 'center', valign: 'top' });
}
function label(s, x, y, w, t) { s.text(x, y, w, 0.25, t, { size: 11, bold: true, color: NAVY }); }
/** a table of the top lines: label, count and share (or label and share) */
function topTable(s, x, y, w, head0, top, withCount, o = {}) {
  const L = top && top.list && top.list.length ? top.list : null;
  const cols = withCount ? [w - 1.3, 0.65, 0.65] : [w - 0.7, 0.7];
  const rows = [withCount ? [head0, { t: 'Vol.', align: 'right' }, { t: '%', align: 'right' }] : [head0, { t: '%', align: 'right' }]];
  (L || [{ label: DASH, count: null, pct: null }]).forEach(r => rows.push(withCount ? [fit(r.label, cols[0]), { t: int(r.count), align: 'right' }, { t: pct(r.pct), align: 'right' }] : [fit(r.label, cols[0]), { t: pct(r.pct), align: 'right' }]));
  s.table(x, y, rows, { cols, rowH: o.rowH || 0.25, size: 8, head: { fill: NAVY, color: 'FFFFFF' }, border: 'D9D9D9' });
}
/** columns of calls presented and handled, and the service level as a line on its own axis */
function trendChart(s, x, y, w, h, cats, rows, color, o = {}) {
  s.chart(x, y, w, h, {
    cats, gap: o.gap ?? 60, overlap: -10, catRot: o.catRot, catSize: o.catSize || 800,
    bars: [{ name: 'Calls Presented', values: rows.map(r => (r ? r.presented : null)), color: BAR }, { name: 'Calls Handled', values: rows.map(r => (r ? r.handled : null)), color }],
    line: { name: 'Service Level', values: rows.map(r => (r ? r.sl : null)), color: NAVY, fmt: '0%', max: 1.2, min: 0, labelSize: o.labelSize || 800 },
  }, { name: o.name || 'Chart' });
}
function brandSlide(D, m, B, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), v = B.v, t = B.tickets;
  head(s, o, m, 'Performance Insights', `${B.name} — Contact Centre Voice Channel`);
  s.text(10.6, 0.3, 2.25, 0.32, B.name, { size: 11, bold: true, color: B.color, align: 'right', name: 'Brand' });
  callout(s, 10.6, 1.0, 2.25, 1.05, B.color, pct(v.mtd && v.mtd.sl), `Service Level · ${m.month}`);
  label(s, 0.5, 2.15, 7.8, `Daily Trend — ${m.month}`);
  trendChart(s, 0.45, 2.38, 7.9, 2.25, v.daily.map(r => dShort(r.date)), v.daily, B.color, { catRot: -45, catSize: 700, labelSize: 700, gap: 50, name: 'Daily trend' });
  label(s, 0.5, 4.72, 7.8, `Monthly Trend — ${(v.trend[0] || { m: m.ym }).m.slice(0, 4)} to Date`);
  trendChart(s, 0.45, 4.95, 7.9, 2.12, v.trend.map(x => x.label), v.trend.map(x => x.v), B.color, { name: 'Monthly trend' });
  const tiles = B.k === 'fpay'
    ? [[int(t && t.total), 'Complaints logged'], [int(t && t.open), 'Tickets still open'], [pct(v.prev && v.prev.sl), `Service level — ${m.prev}`]]
    : [[int(t && t.total), 'Complaints logged'], [pct(t && t.onTime), 'Closed tickets resolved on time'], [int(t && t.open), 'Tickets still open']];
  tiles.forEach(([big, lab], i) => tile(s, 8.65 + i * 1.42, 2.2, 1.32, 0.98, big, lab, B.color));
  label(s, 8.65, 3.38, 4.2, 'Top Call Reasons');
  topTable(s, 8.65, 3.62, 4.2, 'Reason', B.reasons, true, { rowH: 0.24 });
  label(s, 8.65, 5.2, 4.2, 'Top Complaint Drivers');
  topTable(s, 8.65, 5.44, 4.2, 'Complaint Type', t && t.drivers, false, { rowH: 0.24 });
  foot(s, o, n);
}
function postpaidSlide(D, m, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), B = m.postpaid, v = B.v;
  head(s, o, m, 'Postpaid Insights', `${B.name} — Contact Centre Voice Channel`);
  callout(s, 10.6, 1.0, 2.25, 1.05, B.color, pct(v.mtd && v.mtd.sl), `Service Level · ${m.month}`);
  label(s, 0.5, 2.15, 12.3, `Daily Trend — ${m.month}`);
  trendChart(s, 0.45, 2.38, 12.4, 2.95, v.daily.map(r => dShort(r.date)), v.daily, B.color, { catSize: 750, name: 'Daily trend' });
  label(s, 0.5, 5.48, 6, 'Top 5 Call Reasons');
  topTable(s, 0.5, 5.72, 6.0, 'Reason', B.reasons, true);
  label(s, 6.85, 5.48, 6, 'Top 5 Tickets');
  topTable(s, 6.85, 5.72, 6.0, 'Ticket Type', B.tickets, true);
  foot(s, o, n);
}
const OUT_ROWS = 17;
function outageSlides(D, m, n0, o) {
  const O = m.outages, L = O.list, pages = Math.max(1, Math.ceil(L.length / OUT_ROWS));
  for (let p = 0; p < pages; p++) {
    const s = D.slide({ bg: 'FFFFFF' });
    logoAt(s, o, 0.45, 0.3, false);
    s.text(8.2, 0.72, 4.65, 0.25, longDate(m.date), { size: 9, color: MUTED, align: 'right' });
    s.text(0.5, 1.0, 9.5, 0.6, p ? 'Outages Insights (continued)' : 'Outages Insights', { size: 30, bold: true, font: 'Georgia', color: NAVY, name: 'Title' });
    s.text(0.5, 1.6, 9.5, 0.32, `Service Incidents Logged — Last 3 Months (${O.span})`, { size: 12, italic: true, color: MUTED });
    callout(s, 10.6, 1.0, 2.25, 1.05, NAVY, String(L.length), `Incidents logged, ${O.brands === 1 ? '1 brand' : O.brands + ' brands'}`);
    const part = L.slice(p * OUT_ROWS, (p + 1) * OUT_ROWS);
    if (!part.length) s.text(0.5, 2.6, 12.3, 0.4, `No outages logged in ${O.span}.`, { size: 12, color: MUTED, italic: true });
    else {
      const rows = [['Date', 'Outage and Issue', 'Affected Brand', 'Description']]
        .concat(part.map(x => [dShort(x.date), fit(x.title, 2.7), fit((Array.isArray(x.brands) ? x.brands : []).map(k => BRAND_NAME[k] || k).join(', '), 1.95), fit(x.desc, 6.8)]));
      s.table(0.5, 2.35, rows, { cols: [0.9, 2.7, 1.95, 6.8], rowH: 0.25, size: 8, align: ['center', 'center', 'center', 'center'], head: { fill: NAVY, color: 'FFFFFF' }, border: 'D9D9D9' });
    }
    foot(s, o, n0 + p);
  }
  return pages;
}
function cover(D, m, o) {
  const s = D.slide({ bg: NAVY });
  logoAt(s, o, 0.55, 0.45, true);
  s.text(0.55, 2.7, 11, 0.75, 'Member Care Performance Review', { size: 36, bold: true, font: 'Georgia', color: 'FFFFFF', name: 'Title' });
  s.text(0.55, 3.5, 11, 0.35, o.coverSub || 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay  —  Weekly Commercial Presentation', { size: 13, color: PALE });
  s.rect(0.55, 4.22, 2.2, 0.02, { fill: '5B6BA8' });
  s.text(0.55, 4.45, 4, 0.3, longDate(m.date), { size: 10, color: PALE });
  if (o.presenter) s.text(0.55, 6.62, 7, 0.28, o.presenter, { size: 10, bold: true, color: 'FFFFFF' });
  if (o.title || o.org) s.text(0.55, 6.88, 7, 0.28, [o.title, o.org].filter(Boolean).join(' — '), { size: 9, color: PALE });
  squares(s, 10.7, 4.95);
}
function thanks(D, o) {
  const s = D.slide({ bg: NAVY });
  logoAt(s, o, 0.55, 0.45, true);
  s.text(0.5, 3.0, 12.33, 0.8, 'Thank You', { size: 40, bold: true, font: 'Georgia', color: 'FFFFFF', align: 'center', name: 'Title' });
  s.text(0.5, 3.85, 12.33, 0.35, o.thanksSub || 'Member Care Performance Review  —  Weekly Commercial Presentation', { size: 13, color: PALE, align: 'center' });
  const who = [o.presenter, o.title, o.org].filter(Boolean).join('  ·  ');
  if (who) s.text(0.5, 6.85, 12.33, 0.3, who, { size: 9, color: PALE, align: 'center' });
  squares(s, 10.7, 4.95);
}
/** the PowerPoint: o = { presenter, title (their job title), org (the company), logo: { png, w, h } } */
function deck(m, o = {}) {
  const D = P.create({ headFont: 'Georgia', bodyFont: 'Calibri' });
  cover(D, m, o);
  m.brands.forEach((B, i) => brandSlide(D, m, B, i + 2, o));
  postpaidSlide(D, m, 5, o);
  outageSlides(D, m, 6, o);
  thanks(D, o);
  return D;
}
const fileName = date => `Beyond_One_Member_Care_Review - ${longDate(date)}.pptx`;
return { model, deck, fileName, brandVoice, ticketBrand, longDate, dShort, BRANDS, POSTPAID,
  parts: { cover, thanks, brandSlide, postpaidSlide, logoAt, foot, callout, label, fit, int, pct, NAVY, MUTED, MON } };   // for the Performance Review deck (prdeck.js)
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'));
if (typeof module !== 'undefined') module.exports = WcDeck;
