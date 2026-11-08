/* Cadence - the Weekly Commercial Presentation (Member Care Performance Review), every week for the commercial
   meeting. model(): each brand's numbers for the month to date - the service level and the daily and monthly trends from the
   brands' history (as the daily brand emails keep it), the top call reasons from the month's call history export, the complaints
   and tickets from the complaints email (complaintsOf(): the Complaint Management team's answer to "Weekly commercial meeting")
   or else the month's tickets export (FRiENDi Pay's from its tickets sheet when the export has none), and the outages the WFM team
   logs. deck(): the 7 slides of the presentation as a PowerPoint (cover, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay,
   Postpaid, outages, thank you); a number the files do not give shows "–". */
'use strict';
const WcDeck = ((P, K) => {
const BRANDS = [
  { k: 'virgin', name: 'Virgin Mobile', short: 'Virgin', color: 'E10A0A', bar: 'E10A0A' },
  { k: 'friendi', name: 'FRiENDi Mobile', short: 'FRiENDi', color: '1E9AA3', bar: '1E9AA3' },
  { k: 'fpay', name: 'FRiENDi Pay', short: 'FRiENDi Pay', color: '0B6E78', bar: '0B6E78' },
];
const POSTPAID = { k: 'postpaid', name: 'Cross-Brand Postpaid', short: 'Postpaid', color: '0D76BD', bar: '0D76BD' };
// the Beyond One template (bodeck.js): the brands in their logos' colours, the rest in the template's ink, greys and Poppins
const NAVY = K.C.ink, BAR = K.C.bar, INK = K.C.text, MUTED = K.C.grey, SLINE = K.C.ink, HEAD = K.HEAD, FRAME = K.C.line;
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
// ---------------------------------------------------------------- the complaints email
/* The Complaint Management team's answer to "Weekly commercial meeting": a block per brand (Virgin, FRiENDi, FPAY) with its month
   ("Oct 2026", "Nov-26"), No. of Complaints, Resolution Time of Closed TKT (a share), The Remaining Open TKT, and Top Complaints
   (Subcategories, Total, Percentage). An Outlook .msg keeps one table cell a line; copied from Outlook a row comes tab-separated.
   The first block of each brand with a number wins: the request quoted under the answer has the same headings and no numbers. */
const CM_BRAND = [[/^(virgin|virgin mobile|vm)$/, 'virgin'], [/^(friendi|friendi mobile|fr)$/, 'friendi'], [/^(fpay|f pay|f-pay|friendi pay|friendipay)$/, 'fpay']];
const CM_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const CM_FIELD = [
  ['total', /^(no\.?|number)\s*of\s*complaints?$|^complaints?\s*(logged|count)$|^total\s*complaints?$/],
  ['onTime', /^resolution\s*(time|rate)\s*of\s*closed\s*(tkts?|tickets?)$|^(closed\s*(tkts?|tickets?)\s*)?resolved\s*on\s*time$/],
  ['open', /^(the\s*)?remaining\s*open\s*(tkts?|tickets?)$|^(tkts?|tickets?)\s*still\s*open$|^still\s*open$|^open\s*(tkts?|tickets?)$/],
];
const CM_TOP = /^top\s*(\d+\s*)?(complaints?|tkts?|tickets?)\s*:?$/;
const CM_HEAD = /^(sub\s*-?\s*categor(y|ies)|categor(y|ies)|complaint\s*types?|types?|total|count|volume|vol\.?|percentage|share|%)$/;
const cmCell = s => String(s ?? '').replace(/[​-‏‪-‮﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const cmKey = s => cmCell(s).toLowerCase().replace(/\s*:$/, '');
const cmInt = s => (/^\d{1,3}(,\d{3})+$|^\d+$/.test(cmCell(s)) ? +cmCell(s).replace(/,/g, '') : null);
const cmPct = s => { const x = cmCell(s).match(/^(\d+(?:\.\d+)?)\s*%$/); return x ? +x[1] / 100 : null; };
const cmBrand = s => { const k = cmKey(s); const b = CM_BRAND.find(([re]) => re.test(k)); return b ? b[1] : null; };
const cmMonth = s => { const x = cmKey(s).match(/^([a-z]{3,9})\.?[\s\-\/']*(\d{2}|\d{4})$/); const m = x && CM_MON[x[1].slice(0, x[1] === 'sept' ? 4 : 3)]; if (!m) return null; const y = x[2].length === 2 ? 2000 + +x[2] : +x[2]; return { ym: `${y}-${pad(m)}`, label: `${MON[m - 1]} ${y}` }; };
const cmField = s => { const k = cmKey(s); const f = CM_FIELD.find(([, re]) => re.test(k)); return f ? f[0] : null; };
/**
 * The complaints email's numbers: { brands: { virgin|friendi|fpay: { period: { ym, label }, total, onTime (a share), open, drivers:
 * { base, list: [{ label, count, pct }] } } }, periods: [labels] } (null when the text has no brand block with a number).
 */
function complaintsOf(text) {
  const cells = [];
  for (const line of String(text || '').split(/\r?\n/)) for (const p of line.includes('\t') ? line.split('\t') : [line]) { const c = cmCell(p); if (c) cells.push(c); }
  const isMark = c => !!(cmBrand(c) || cmField(c) || CM_TOP.test(cmKey(c)));
  const out = {}; let cur = null;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i], b = cmBrand(c);
    if (b) {   // a block starts with the brand and, within four cells, its month or one of the headings
      const near = cells.slice(i + 1, i + 5);
      if (near.some(x => cmMonth(x) || cmField(x))) { cur = out[b] && out[b].filled ? null : (out[b] = { k: b, period: null, total: null, onTime: null, open: null, list: [], filled: false }); continue; }
    }
    if (!cur) continue;
    if (!cur.period && cmMonth(c)) { cur.period = cmMonth(c); continue; }
    const f = cmField(c);
    if (f) {   // the value is the first cell after the heading that is one, before the next heading
      for (let j = i + 1; j < Math.min(cells.length, i + 4) && !isMark(cells[j]); j++) {
        const v = f === 'onTime' ? cmPct(cells[j]) : cmInt(cells[j]);
        if (v !== null) { if (cur[f] === null) { cur[f] = v; cur.filled = true; } break; }
      }
      continue;
    }
    if (CM_TOP.test(cmKey(c))) {   // the table: its headings, then rows of a subcategory, its total and (often) its share
      let j = i + 1; while (j < cells.length && CM_HEAD.test(cmKey(cells[j]))) j++;
      while (j + 1 < cells.length && cur.list.length < 5) {
        const lab = cells[j], n = cmInt(cells[j + 1]);
        if (isMark(lab) || cmInt(lab) !== null || cmPct(lab) !== null || n === null) break;
        const p = j + 2 < cells.length ? cmPct(cells[j + 2]) : null;
        cur.list.push({ label: lab, count: n, pct: p }); j += p === null ? 2 : 3; cur.filled = true;
      }
      i = j - 1;
    }
  }
  const brands = {};
  for (const [k, x] of Object.entries(out)) {
    if (!x.filled) continue;
    const base = x.total ?? (x.list.length ? x.list.reduce((a, r) => a + r.count, 0) : null);
    brands[k] = { period: x.period, total: x.total, onTime: x.onTime, open: x.open,
      drivers: x.list.length ? { base, list: x.list.map(r => ({ label: r.label, count: r.count, pct: r.pct ?? (base ? r.count / base : null) })) } : null };
  }
  if (!Object.keys(brands).length) return null;
  return { brands, periods: [...new Set(Object.values(brands).map(x => x.period && x.period.label).filter(Boolean))] };
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
 * desc }]), onTimeH (hours within which a closed ticket counts as on time), reports (the report builder's settings per brand),
 * complaints (complaintsOf() of the complaints email: its numbers come before the tickets export's, one by one) }
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
  const CM = input.complaints && input.complaints.brands ? input.complaints.brands : null;
  if (!tickets && !CM) notes.push('No tickets export or complaints email: the complaints and tickets show –.');
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
    } else if (tickets && !(CM && CM[B.k])) notes.push(`${B.name}: no tickets in the tickets export${B.k === 'fpay' ? ' (drop FRiENDi Pay\'s tickets sheet)' : ''}.`);
    const e = CM && CM[B.k];
    if (e) {   // the complaints email's numbers first; what it leaves out comes from the export, if any
      const t0 = o.tickets || {}, has = v => v !== null && v !== undefined;
      o.tickets = { total: has(e.total) ? e.total : t0.total ?? null, open: has(e.open) ? e.open : t0.open ?? null, closed: t0.closed ?? null, onTime: has(e.onTime) ? e.onTime : t0.onTime ?? null,
        timed: t0.timed || 0, drivers: e.drivers && e.drivers.list.length ? e.drivers : t0.drivers || null };
      o.from = 'email'; o.period = e.period && e.period.ym !== ym ? e.period : null;   // said on the slide when it is not the deck's month
    } else if (CM && !o.tickets) notes.push(`${B.name}: not in the complaints email${tickets ? '' : ' and no tickets export'}: its complaints show –.`);
    return o;
  });
  const other = [...new Set(brands.filter(b => b.period).map(b => b.period.label))];
  if (other.length) notes.push(`The complaints email is for ${other.join(' and ')}, not ${mLong(ym)}: the slides say so beside its numbers.`);
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
/** the brands' logos: the official ones built in (assets/brand), else the ones taken from one of the team's decks */
const logos = o => { const G = { ...(o.logos || {}) }; for (const k of ['virgin', 'friendi', 'fpay']) if (K.logo(k)) G[k] = K.logo(k); if (G.virgin) G.postpaid = G.virgin; return G; };
/** Beyond One's logo at the top left, as the template has it */
function logoTop(s) { K.img(s, K.logo('stackedBlackAnim') || K.logo('stackedBlack'), 0.40, 0.30, 0.42, 0.64, { descr: 'Beyond One', name: 'Logo' }); }
function head(s, o, m, title, sub) {
  K.top(s, `${o.kicker || 'Weekly Commercial Presentation'}  ·  ${deckDate(m.date)}`);
  K.title(s, 0.45, 1.04, 8.10, title, sub);
}
function foot(s, o, n) { K.foot(s, n); }
/** the big number at the top right: the month's service level, in a flat box of the brand's colour (the template's "15%") */
function callout(s, x, y, w, h, color, big, small) { K.stat(s, x, y, w, h, color, big, small); }
function tile(s, x, y, big, lab, color) { K.figure(s, x, y, 1.37, 0.92, big, lab, color); }
/** a chart's heading and a table's, in Poppins */
function label(s, x, y, w, t, size = 12.5) { K.heading(s, x, y, w, t, size - 1.5); }
/** a table of the top lines: label, count and share (or label and share), in the template's table style */
function topTable(s, x, y, w, head0, top, withCount, o = {}) {
  const L = top && top.list && top.list.length ? top.list : null;
  const cols = withCount ? [w - 1.40, 0.75, 0.65] : [w - 0.75, 0.75];
  const rows = [withCount ? [head0, { t: 'Vol.', align: 'center' }, { t: '%', align: 'center' }] : [head0, { t: '%', align: 'center' }]];
  (L || [{ label: DASH, count: null, pct: null }]).forEach(r => rows.push(withCount ? [fit(r.label, cols[0] * 1.1), int(r.count), pct(r.pct)] : [fit(r.label, cols[0] * 1.1), pct(r.pct)]));
  s.table(x, y, rows, K.table({ cols, rowH: o.rowH || 0.27, size: 9 }));
}
/** columns of calls presented and handled, and the service level as a line on its own axis (0–120%), framed */
function trendChart(s, x, y, w, h, cats, rows, color, o = {}) {
  s.chart(x, y, w, h, {
    ...K.frame(), cats, gap: 219, overlap: 0, catRot: cats.length > 12 ? -45 : undefined, catSize: cats.length > 12 ? 800 : 900,
    bars: [{ name: 'Calls Presented', values: rows.map(r => (r ? r.presented : null)), color: BAR }, { name: 'Calls Handled', values: rows.map(r => (r ? r.handled : null)), color }],
    line: { name: 'Service Level', values: rows.map(r => (r ? r.sl : null)), color: SLINE, w: 2.25, fmt: '0%', max: null, min: null, labelSize: 900, labelBold: true, labelColor: INK },
  }, { name: o.name || 'Chart' });
}
function brandSlide(D, m, B, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), v = B.v, t = B.tickets;
  head(s, o, m, 'Performance Insights', `${B.name} — Contact Centre Voice Channel`);
  foot(s, o, n);   // under the charts, as in the template
  if (!pic(s, logos(o)[B.k], 8.82, 0.98, 1.80, 1.06, { center: true, middle: true, descr: B.name, name: 'Brand' })) tt(s, 8.82, 0.98, 1.80, 1.06, B.name, { size: 11, bold: true, font: HEAD, color: B.color, align: 'center', name: 'Brand' });
  callout(s, 10.85, 0.95, 2.03, 1.12, B.color, pct(v.mtd && v.mtd.sl), `Service Level · ${m.month}`);
  label(s, 0.45, 2.10, 7.85, `Daily Trend — ${m.month}`);
  trendChart(s, 0.43, 2.42, 7.35, 2.27, v.daily.map(r => dShort(r.date)), v.daily, B.bar, { name: 'Daily trend' });
  label(s, 0.45, 4.66, 7.85, o.monthlyLabel || `Monthly Trend — ${(v.trend[0] || { m: m.ym }).m.slice(0, 4)} to Date`);
  trendChart(s, 0.43, 4.91, 7.35, 2.15, v.trend.map(x => x.label), v.trend.map(x => x.v), B.bar, { name: 'Monthly trend' });   // ends above the foot (7.10)
  const at = B.period ? ` · ${B.period.label}` : '';   // the complaints email's month, when it is not the deck's
  const tiles = B.k === 'fpay'
    ? [[int(t && t.total), `Complaints logged${at}`], [int(t && t.open), `Tickets still open${at}`], [pct(v.prev && v.prev.sl), `Service level — ${m.prev}`]]
    : [[int(t && t.total), `Complaints logged${at}`], [pct(t && t.onTime), at ? `Resolved on time${at}` : 'Closed tickets resolved on time'], [int(t && t.open), `Tickets still open${at}`]];
  tiles.forEach(([big, lab], i) => tile(s, [8.62, 10.07, 11.53][i], 2.10, big, lab, B.color));
  label(s, 8.62, 3.27, 4.28, 'Top Call Reasons', 11.5);
  topTable(s, 8.62, 3.55, 4.28, 'Reason', B.reasons, true, { rowH: 0.25 });
  label(s, 8.62, 5.22, 4.28, `Top Complaint Drivers${at}`, 11.5);
  topTable(s, 8.62, 5.50, 4.28, 'Complaint Type', t && t.drivers, false, { rowH: 0.25 });   // six rows end at 7.00, above the foot
}
function postpaidSlide(D, m, n, o) {
  const s = D.slide({ bg: 'FFFFFF' }), B = m.postpaid, v = B.v;
  head(s, o, m, 'Postpaid Insights', `${B.name} — Contact Centre Voice Channel`);
  foot(s, o, n);
  pic(s, logos(o).postpaid, 8.82, 0.98, 1.80, 1.06, { center: true, middle: true, descr: 'Virgin Mobile', name: 'Brand' });
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
    K.top(s, `${o.kicker || 'Weekly Commercial Presentation'}  ·  ${deckDate(m.date)}`);
    K.title(s, 0.45, 1.04, 8.10, p ? 'Outages Insights (continued)' : 'Outages Insights', `Service Incidents Logged — Last 3 Months (${O.span})`);
    callout(s, 10.85, 0.95, 2.03, 1.12, NAVY, String(L.length), `Incidents logged, ${O.brands === 1 ? '1 brand' : O.brands + ' brands'}`);
    const part = L.slice(p * OUT_ROWS, (p + 1) * OUT_ROWS);
    if (!part.length) tt(s, 0.45, 2.6, 12.3, 0.4, `No outages logged in ${O.span}.`, { size: 12, color: MUTED, italic: true });
    else {
      const rows = [['Date', 'Outage and Issue', 'Affected Brand', 'Description']]
        .concat(part.map(x => [dShort(x.date), fit(x.title, 2.7), fit((Array.isArray(x.brands) ? x.brands : []).map(k => BRAND_NAME[k] || k).join(', '), 1.95), fit(x.desc, 6.8)]));
      s.table(0.45, 2.35, rows, K.table({ cols: [0.9, 2.7, 1.95, 6.85], rowH: 0.25, size: 8.5, align: ['center', 'center', 'center', 'center'] }));
    }
    foot(s, o, n0 + p);
  }
  return pages;
}
function cover(D, m, o) {
  const s = D.slide({ bg: 'FFFFFF' });
  K.cover(s, { title: 'Member Care Performance Review', sub: o.coverSub || 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay  —  Weekly Commercial Presentation', date: deckDate(m.date),
    who: [o.presenter, [o.title, o.org].filter(Boolean).join(' — ')].filter(Boolean) });
}
function thanks(D, o) {
  const s = D.slide({ bg: K.C.ink });
  K.closing(s, { title: 'Thank You', sub: o.thanksSub || 'Member Care Performance Review  —  Weekly Commercial Presentation', who: [o.presenter, o.title, o.org].filter(Boolean).join('  ·  ') });
}
/** the PowerPoint, on the Beyond One template: o = { presenter, title (their job title), org (the company), logos (pictures taken
    from one of the team's decks; the official brand logos built in come first) } */
function deck(m, o = {}) {
  const D = P.create({ headFont: K.HEAD, bodyFont: K.BODY });
  cover(D, m, o);
  m.brands.forEach((B, i) => brandSlide(D, m, B, i + 2, o));
  postpaidSlide(D, m, 5, o);
  outageSlides(D, m, 6, o);
  thanks(D, o);
  return D;
}
const fileName = date => `Beyond_One_Member_Care_Review - ${longDate(date)}.pptx`;
return { model, deck, fileName, brandVoice, ticketBrand, complaintsOf, longDate, dShort, BRANDS, POSTPAID,
  parts: { cover, thanks, brandSlide, postpaidSlide, logoTop, pic, tt, foot, callout, label, fit, int, pct, deckDate, logos, NAVY, MUTED, INK, HEAD, FRAME, MON, K } };   // for the Performance Review deck (prdeck.js)
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'), typeof BoDeck !== 'undefined' ? BoDeck : require('./bodeck.js'));
if (typeof module !== 'undefined') module.exports = WcDeck;
