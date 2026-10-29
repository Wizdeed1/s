/* The Weekly Commercial Presentation (WFM team › Weekly). The week is Sunday to Saturday and the deck is dated the Sunday after.
   Everything on it comes from the tool's own data or from what the WFM team types in:
   - the calls (presented, handled, service level), day by day and month by month: the Brands' history the daily emails keep;
   - the top call reasons: the week's ESKA call history export, counted as the daily emails count them (the same rows left out;
     Virgin Mobile without Postpaid's calls, which have their own slide);
   - the complaints (logged, resolved on time, still open, the top 5 drivers): the figures someone sends, pasted and checked;
   - Postpaid's top 5 tickets: the week's ESKA Tickets Report, as the daily Postpaid email counts them, or typed;
   - the outages: a running list (an earlier deck's Outages table can be read into it).
   Out of it: the Member Care Performance Review deck, made from its own design (wk/deck-template.pptx, built into the page), and
   the WFM team's KPI workbook with the week written into its cells. Pure: no page and no storage (js/weekly.js is the tab). */
'use strict';
const Weekly = ((C) => {
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BRANDS = [['virgin', 'Virgin Mobile'], ['friendi', 'FRiENDi Mobile'], ['fpay', 'FRiENDi Pay'], ['postpaid', 'Virgin Postpaid']];
const NAME = Object.fromEntries(BRANDS);
const COMPLAINT_BRANDS = ['virgin', 'friendi', 'fpay'];   // the complaint figures come for these three (Postpaid has its tickets)

// ---------------------------------------------------------------- dates: 'yyyy-mm-dd', counted in UTC
const p2 = n => String(n).padStart(2, '0');
const dOf = iso => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
const isoOf = d => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
const addDays = (iso, n) => { const d = dOf(iso); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); };
const wday = iso => dOf(iso).getUTCDay();   // 0 Sunday … 6 Saturday
const range = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };
const monthStart = iso => iso.slice(0, 7) + '-01';
const isIso = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && isoOf(dOf(s)) === s;
/** the report week holding this day: Sunday to Saturday, the deck dated the Sunday after */
function weekOf(iso) { const start = addDays(iso, -wday(iso)), end = addDays(start, 6); return { key: start, start, end, deck: addDays(end, 1), days: range(start, end) }; }
/** the last whole week before this day (a Saturday is not over yet) */
const lastWeek = today => weekOf(addDays(today, -(wday(today) + 1)));
const dayLong = iso => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;   // 25 Oct 2026
const monthLong = iso => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;                     // Oct 2026
const monthTick = iso => `${MON[+iso.slice(5, 7) - 1]} '${iso.slice(2, 4)}`;                     // Sep '26
const monthCat = iso => `${MON[+iso.slice(5, 7) - 1]}-${iso.slice(2, 4)}`;                       // Sep-26
const dayShort = iso => `${+iso.slice(8, 10)}-${MON[+iso.slice(5, 7) - 1]}`;                     // 6-Aug
/** 18–24 Oct 2026 · 27 Sep – 3 Oct 2026 · 28 Dec 2025 – 3 Jan 2026 */
function weekLabel(w) {
  const a = w.start, b = w.end, da = +a.slice(8, 10), db = +b.slice(8, 10);
  if (a.slice(0, 7) === b.slice(0, 7)) return `${da}–${db} ${monthLong(b)}`;
  if (a.slice(0, 4) === b.slice(0, 4)) return `${da} ${MON[+a.slice(5, 7) - 1]} – ${db} ${monthLong(b)}`;
  return `${dayLong(a)} – ${dayLong(b)}`;
}
const serial = iso => Math.round((dOf(iso) - Date.UTC(1899, 11, 30)) / 86400000);   // Excel's day number
const fromSerial = n => isoOf(new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000));

// ---------------------------------------------------------------- numbers
const num = v => (v === null || v === undefined || v === '' || typeof v === 'boolean' || isNaN(v) ? null : +v);
const mean = a => { const v = a.filter(x => x !== null && x !== undefined && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
/** a whole percent, as Excel's 0% shows it */
const pct = v => (v === null || v === undefined || isNaN(v) ? '' : Math.round(v * 100 + 1e-9) + '%');
const norm = s => String(s || '').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
/** '16%', '16 %', '0.16', '16' (a percent column) -> 0.16; '' -> null */
function readPct(s) {
  const t = String(s ?? '').replace(/,/g, '').trim(); if (!t) return null;
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*%$/); if (m) return +m[1] / 100;
  const v = Number(t); if (!isFinite(v)) return null;
  return v > 1 ? v / 100 : v;
}
function readInt(s) { const t = String(s ?? '').replace(/[,\s]/g, ''); if (!/^-?\d+(\.\d+)?$/.test(t)) return null; return Math.round(+t); }

// ---------------------------------------------------------------- the calls, from the Brands' history (H[brand].voice: daily and monthly rows)
const voiceOf = (H, b) => { const v = (H && H[b] && H[b].voice) || {}; return { daily: Array.isArray(v.daily) ? v.daily : [], monthly: Array.isArray(v.monthly) ? v.monthly : [] }; };
const callsRow = (date, r) => ({ date, presented: num(r && r.presented), handled: num(r && r.handled), sl: num(r && r.sl) });
/** the daily chart: the Saturday's month up to the Saturday (and the week's days in the month before, when it began there) */
function dailyRows(H, b, w) {
  const from = monthStart(w.end) < w.start ? monthStart(w.end) : w.start, by = new Map(voiceOf(H, b).daily.map(r => [r.date, r]));
  return range(from, w.end).map(d => callsRow(d, by.get(d)));
}
/** month to date: the average day of the Saturday's month so far, as the daily emails and the workbook count it */
function mtdOf(rows, w) {
  const m = rows.filter(r => r.date >= monthStart(w.end) && r.date <= w.end);
  return { presented: mean(m.map(r => r.presented)), handled: mean(m.map(r => r.handled)), sl: mean(m.map(r => r.sl)), days: m.filter(r => r.presented !== null).length };
}
/** every closed month: the history's monthly rows, and the average day of any month it has only days for (as the daily emails) */
function closedMonths(H, b, w) {
  const V = voiceOf(H, b), cur = monthStart(w.end), have = new Set(V.monthly.map(r => r.date)), out = V.monthly.filter(r => r && r.date < cur).map(r => callsRow(r.date, r)), by = {};
  V.daily.forEach(r => { if (!r || !r.date) return; const mk = monthStart(r.date); if (mk >= cur || have.has(mk)) return; (by[mk] = by[mk] || []).push(r); });
  Object.keys(by).forEach(mk => out.push({ date: mk, presented: mean(by[mk].map(r => num(r.presented))), handled: mean(by[mk].map(r => num(r.handled))), sl: mean(by[mk].map(r => num(r.sl))) }));
  return out.sort((a, b2) => (a.date < b2.date ? -1 : 1));
}
/** the monthly chart: this year's closed months (the last 8 in January), then MTD */
function monthlyRows(H, b, w) {
  const closed = closedMonths(H, b, w), thisYear = closed.filter(r => r.date.slice(0, 4) === w.end.slice(0, 4));
  return thisYear.length ? thisYear : closed.slice(-8);
}

// ---------------------------------------------------------------- the top call reasons: the ESKA call history rows of the week
const KEEP = { fpay: ['Follow Up'] };   // FRiENDi Pay lists Follow Up, as its daily email does
/** E: the report builder's engine (Engine), rows: its historyRows -> per brand, every Sub Service and its rows in the week, the rows
    in all and the days they cover (Virgin Mobile without Postpaid's calls). Only these counts are kept (no customer's row), so a changed list of rows left out counts again. */
function countReasons(E, rows, w) {
  const out = {}, pp = new Set(E.sliceHistory(rows || [], 'postpaid', w.days));
  for (const [b] of BRANDS) {
    // Virgin Mobile's reasons leave Postpaid's calls out (they have their own slide), as the deck the WFM team sends does
    const slice = E.sliceHistory(rows || [], b, w.days).filter(r => b !== 'virgin' || !pp.has(r)), counts = new Map();
    slice.forEach(r => { const s = String(r[E.COL.sub] ?? '').trim(); if (s) counts.set(s, (counts.get(s) || 0) + 1); });
    out[b] = { base: slice.length, counts: Array.from(counts, ([r, n]) => ({ r, n })), days: Array.from(new Set(slice.map(r => E.rowDate(r[E.COL.date])).filter(Boolean))).sort() };
  }
  return out;
}
/** one brand's top 5 from its counts: the Sub Services left out still count in the total (as the daily emails, Engine.topReasons) */
function topOf(b, X, skip) {
  if (!X) return null;
  const keep = new Set((KEEP[b] || []).map(norm)), supp = new Set((skip || []).map(norm).filter(s => !keep.has(s)));
  const list = (X.counts || []).map((x, i) => ({ reason: x.r, count: x.n, i })).filter(x => !supp.has(norm(x.reason))).sort((x, y) => (y.count - x.count) || (x.i - y.i)).slice(0, 5).map(({ reason, count }) => ({ reason, count }));
  return { base: X.base, list, days: X.days || [] };
}
const reasonsFrom = (counted, skip) => (counted ? Object.fromEntries(BRANDS.map(([b]) => [b, topOf(b, counted[b], skip)])) : null);
const reasonsOf = (E, rows, w, skip) => reasonsFrom(countReasons(E, rows, w), skip || E.DEFAULT_SUPPRESSED);

/** the ESKA Tickets Report's rows (Engine.ticketRows) -> Postpaid's tickets of the week, as the daily Postpaid email counts them
    (Engine.sliceTickets: Virgin's Billing, End service and Migration tickets, like sub categories merged): all of them, the top 5 */
function postpaidTickets(E, rows, w) {
  const tk = E.sliceTickets(rows || [], 'postpaid', w.days);
  return { total: tk.length, list: E.tally(tk, E.TCOL.sub).slice(0, 5).map(x => ({ name: x.label, count: x.count })), days: Array.from(new Set(tk.map(r => E.rowDate(r[E.TCOL.date])).filter(Boolean))).sort() };
}

// ---------------------------------------------------------------- the complaint figures, pasted from the email (or the workbook) and checked
const BRAND_RE = [['fpay', /^(f\s*-?\s*pay|friendi\s*pay)\b/i], ['friendi', /^(friendi|fr)\b/i], ['virgin', /^(virgin|vm)\b/i]];
/** text -> { virgin: { complaints, onTime, open, drivers: [{ name, pct, count }] }, friendi, fpay } and the lines it could not place.
    The drivers' table may have a count and a percentage (Subcategories | Total | Percentage): the percentage is the one taken. */
function parseComplaints(text) {
  const out = {}, skipped = []; let brand = null, inDrivers = false, cols = null;
  const blank = () => ({ complaints: null, onTime: null, open: null, drivers: [] });
  const lines = String(text || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n');
  for (const raw of lines) {
    const cells = raw.split(/\t| {2,}|\s\|\s|\|/).map(s => s.trim()).filter(Boolean); if (!cells.length) continue;
    const head = cells[0], rest = cells.slice(1), firstNum = rest.map(readInt).find(v => v !== null), firstPct = rest.map(readPct).find(v => v !== null);
    const b = (BRAND_RE.find(([, re]) => re.test(head)) || [])[0];   // a brand's heading: its name and no figure (Virgin | Oct 2026, FPAY | 18 Oct – 24 Oct | Target, VM)
    if (b && firstPct === undefined && !/complaint|ticket|tkt|resol|open/i.test(head)) { brand = b; out[brand] = out[brand] || blank(); inDrivers = false; cols = null; continue; }
    if (/^top\s*\d*\s*(complaint|driver)/i.test(head) || /complaint (type|driver)s?$/i.test(head)) { inDrivers = true; continue; }
    // the drivers' own heading row: which column is the percentage, which the count
    if (/^(sub\s*-?\s*categor|categor|complaint\s*type|type|reason|driver)/i.test(head) && rest.some(c => /percent|%|total|count|vol/i.test(c)) && rest.every(c => readPct(c) === null)) {
      cols = { pct: rest.findIndex(c => /percent|%/i.test(c)), count: rest.findIndex(c => /total|count|vol|no\.?\s*of/i.test(c)) }; inDrivers = true; continue;
    }
    if (!brand) { skipped.push(raw.trim()); continue; }
    const B = out[brand];
    if (/no\.?\s*of\s*complaints|complaints?\s*logged|^complaints$/i.test(head)) { B.complaints = firstNum ?? B.complaints; inDrivers = false; continue; }
    if (/resol|on\s*time|closed/i.test(head)) { B.onTime = firstPct ?? B.onTime; inDrivers = false; continue; }
    if (/open/i.test(head) && /t(ic)?k(e)?t|remain|still/i.test(head)) { B.open = firstNum ?? B.open; inDrivers = false; continue; }
    if (inDrivers && firstPct !== undefined && firstPct !== null && B.drivers.length < 5) {
      // the percentage: its column when the heading named it, else a cell written with %, else the last of the numbers (a count comes first)
      const nums = rest.filter(c => readPct(c) !== null), marked = rest.find(c => /%\s*$/.test(c));
      const pctCell = cols && cols.pct >= 0 && rest[cols.pct] !== undefined ? rest[cols.pct] : marked !== undefined ? marked : nums[nums.length - 1];
      const countCell = cols && cols.count >= 0 ? rest[cols.count] : nums.length > 1 && !/%/.test(nums[0]) ? nums[0] : undefined;
      B.drivers.push({ name: head, pct: readPct(pctCell), count: countCell === undefined ? null : readInt(countCell) }); continue;
    }
    skipped.push(raw.trim());
  }
  return { brands: out, skipped };
}

// ---------------------------------------------------------------- outages: a running list; the slide shows the Saturday's month and the two before
const BRAND_WORDS = [['Virgin', /virgin|\bvm\b/i], ['FRiENDi', /friendi(?!\s*pay)|\bfr\b/i], ['Fpay', /f\s*-?\s*pay|friendi\s*pay/i]];
function outagesOf(list, w, max = 18) {
  const first = isoOf(new Date(Date.UTC(+w.end.slice(0, 4), +w.end.slice(5, 7) - 3, 1)));   // the 1st of the month two months before
  const rows = (list || []).filter(o => o && isIso(o.date) && o.date >= first && o.date <= w.end).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const shown = rows.slice(-max), brands = new Set();
  shown.forEach(o => BRAND_WORDS.forEach(([n, re]) => { if (re.test(o.brands || '')) brands.add(n); }));
  return { from: first, rows: shown, left: rows.length - shown.length, brands: brands.size, span: `${MON[+first.slice(5, 7) - 1]}–${monthLong(w.end)}` };
}

/** an earlier deck (its bytes) -> the outages in its Outages table: [{ date, issue, brands, desc }]. A row's day (6-Aug) takes the
    year of the deck's own date (25 Oct 2026), the year before for a month after it. */
async function outagesFromDeck(bytes) {
  const z = await C.readZip(bytes), out = [], plain = tc => (tc.match(/<a:p>[\s\S]*?<\/a:p>/g) || []).map(p => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => xmlUn(m[1])).join('')).join(' ').replace(/\s+/g, ' ').trim();
  const refOf = x => { const m = /\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})\b/.exec(x.replace(/<[^>]+>/g, ' ')); return m ? { y: +m[3], m: MON.indexOf(m[2]) + 1 } : null; };
  const names = z.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  let ref0 = null; for (const n of names) { ref0 = refOf(await z.text(n)); if (ref0) break; }
  for (const n of names) {
    const x = await z.text(n), ref = refOf(x) || ref0;
    for (const tbl of x.match(/<a:tbl>[\s\S]*?<\/a:tbl>/g) || []) {
      const rows = (tbl.match(/<a:tr [^>]*>[\s\S]*?<\/a:tr>/g) || []).map(tr => (tr.match(/<a:tc(?: [^>]*)?>[\s\S]*?<\/a:tc>/g) || []).map(plain));
      const h = (rows[0] || []).map(norm), iD = h.indexOf('date'), iO = h.findIndex(c => /outage|issue/.test(c)), iB = h.findIndex(c => /brand/.test(c)), iX = h.findIndex(c => /descr/.test(c));
      if (iD < 0 || iO < 0) continue;
      for (const r of rows.slice(1)) {
        const t = String(r[iD] || ''), a = /^(\d{1,2})[\s-]+([A-Za-z]{3})/.exec(t), b = /^(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/.exec(t);
        let d = null, m = null, y = null;
        if (a && MON.indexOf(a[2][0].toUpperCase() + a[2].slice(1).toLowerCase()) >= 0) { d = +a[1]; m = MON.indexOf(a[2][0].toUpperCase() + a[2].slice(1).toLowerCase()) + 1; }
        else if (b) { d = +b[1]; m = +b[2]; y = b[3] ? (+b[3] < 100 ? 2000 + +b[3] : +b[3]) : null; }
        if (!d || !m || !r[iO]) continue;
        if (!y) y = ref ? (m > ref.m ? ref.y - 1 : ref.y) : new Date().getUTCFullYear();
        const iso = `${y}-${p2(m)}-${p2(d)}`; if (!isIso(iso)) continue;
        out.push({ date: iso, issue: r[iO], brands: iB >= 0 ? r[iB] || '' : '', desc: iX >= 0 ? r[iX] || '' : '' });
      }
    }
  }
  return out;
}
/** the outages to add to the list: those not in it yet (the same day and the same outage) */
function newOutages(list, found) {
  const key = o => o.date + '|' + norm(o.issue), have = new Set((list || []).map(key)), seen = new Set();
  return (found || []).filter(o => { const k = key(o); if (have.has(k) || seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------- the week's model: what the deck and the workbook show
/**
 * o: { H (the Brands' history), w (weekOf), reasons (reasonsOf, or null), complaints ({ virgin, friendi, fpay }), tickets ({ total,
 *      list: [{ name, count }] }, Postpaid), outages (the running list), today }
 */
function model(o) {
  const w = o.w, brands = {};
  for (const [b, name] of BRANDS) {
    const daily = dailyRows(o.H, b, w), closed = closedMonths(o.H, b, w), last = closed.find(r => r.date === monthStart(addDays(monthStart(w.end), -1))) || null;
    brands[b] = { key: b, name, daily, mtd: mtdOf(daily, w), monthly: monthlyRows(o.H, b, w), closed, lastMonth: last, reasons: (o.reasons || {})[b] || null };
  }
  const c = o.complaints || {};
  COMPLAINT_BRANDS.forEach(b => { brands[b].complaints = c[b] || null; });
  return { w, brands, tickets: o.tickets || null, outages: outagesOf(o.outages, w), today: o.today || '' };
}

/** what to look at before sending: [{ sev: 'bad' | 'warn' | 'info', text }] */
function checks(M) {
  const out = [], w = M.w, add = (sev, text) => out.push({ sev, text });
  if (!BRANDS.some(([b]) => M.brands[b].reasons)) add('bad', 'No call reasons yet: drop the week\'s ESKA call history export.');
  if (M.today && w.end >= M.today) add('warn', `The week ${weekLabel(w)} is not over yet: its Saturday is ${M.today === w.end ? 'today' : 'still to come'}.`);
  for (const [b, name] of BRANDS) {
    const B = M.brands[b], miss = B.daily.filter(r => r.date >= w.start && r.presented === null).map(r => dayShort(r.date));
    if (miss.length === 7) add('bad', `${name}: the history has no calls for any day of the week. Make that week's daily emails (Report builder), or import the history.`);
    else if (miss.length) add('bad', `${name}: the history has no calls for ${miss.join(', ')}. The daily chart and the month to date leave ${miss.length === 1 ? 'it' : 'them'} out until that day's email is made.`);
    if (b !== 'postpaid' && !B.monthly.length) add('warn', `${name}: the history has no closed month for the monthly chart.`);
    const R = B.reasons;
    if (!R) { if (BRANDS.some(([x]) => M.brands[x].reasons)) add('bad', `${name}: no call reasons.`); }
    else if (!R.base) add('bad', `${name}: the export has no rows of this brand in the week.`);
    else { const gap = w.days.filter(d => !R.days.includes(d)).map(dayShort); if (gap.length) add('warn', `${name}: the export has no rows for ${gap.join(', ')}: the top reasons count ${7 - gap.length} of the 7 days.`); if (R.list.length < 5) add('warn', `${name}: only ${R.list.length} call reasons after the rows left out.`); }
  }
  for (const b of COMPLAINT_BRANDS) {
    const name = NAME[b], X = M.brands[b].complaints;
    if (!X) { add('bad', `${name}: no complaint figures yet. Paste them from the email.`); continue; }
    const need = b === 'fpay' ? [['complaints', 'complaints logged'], ['open', 'tickets still open']] : [['complaints', 'complaints logged'], ['onTime', 'resolved on time'], ['open', 'tickets still open']];
    const gone = need.filter(([k]) => X[k] === null || X[k] === undefined).map(x => x[1]);
    if (gone.length) add('bad', `${name}: no ${gone.join(', ')}.`);
    const d = (X.drivers || []).filter(x => x && x.name);
    if (d.length < 5) add('warn', `${name}: ${d.length} of the 5 complaint drivers.`);
    const sum = d.reduce((s, x) => s + (x.pct || 0), 0); if (sum > 1.005) add('bad', `${name}: the complaint drivers add up to ${pct(sum)}, more than 100%.`);
    if (X.onTime !== null && X.onTime !== undefined && (X.onTime < 0 || X.onTime > 1)) add('bad', `${name}: resolved on time is ${pct(X.onTime)}.`);
  }
  if (!M.brands.fpay.lastMonth || M.brands.fpay.lastMonth.sl === null) add('warn', `FRiENDi Pay: the history has no service level for ${monthTick(addDays(monthStart(w.end), -1))} (the slide's third box).`);
  const T = M.tickets, tl = T && Array.isArray(T.list) ? T.list.filter(x => x && x.name) : [];
  if (!tl.length) add('bad', 'Virgin Postpaid: type the top 5 tickets.');
  else { if (!(T.total > 0)) add('bad', 'Virgin Postpaid: type the total number of tickets (the % is out of it).'); else if (tl.reduce((s, x) => s + (x.count || 0), 0) > T.total) add('bad', 'Virgin Postpaid: the top 5 tickets are more than the total.'); if (tl.length < 5) add('warn', `Virgin Postpaid: ${tl.length} of the 5 tickets.`); }
  if (M.outages.left > 0) add('warn', `Outages: ${M.outages.left} older outage${M.outages.left === 1 ? ' is' : 's are'} left off the slide (it shows the latest ${M.outages.rows.length}).`);
  if (!M.outages.rows.some(o => o.date >= w.start && o.date <= w.end)) add('info', 'Outages: none added for this week. Add any before making the deck.');
  return out;
}

// ---------------------------------------------------------------- PowerPoint: the template's slides, filled (DrawingML strings)
const xesc = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** the shape (<p:sp>) or frame (<p:graphicFrame>) whose name this is: [start, end] */
function shapeAt(xml, name) {
  const m = new RegExp('<p:cNvPr id="\\d+" name="' + reEsc(name) + '"').exec(xml); if (!m) throw new Error(`the deck template has no "${name}"`);
  const a = Math.max(xml.lastIndexOf('<p:sp>', m.index), xml.lastIndexOf('<p:sp ', m.index), xml.lastIndexOf('<p:graphicFrame>', m.index), xml.lastIndexOf('<p:graphicFrame ', m.index));
  const tag = xml.startsWith('<p:graphicFrame', a) ? 'p:graphicFrame' : 'p:sp', b = xml.indexOf(`</${tag}>`, m.index) + tag.length + 3;
  return [a, b];
}
const onShape = (xml, name, fn) => { const [a, b] = shapeAt(xml, name); return xml.slice(0, a) + fn(xml.slice(a, b)) + xml.slice(b); };
/** a paragraph's text: its first run keeps its look and takes the text, the other runs go */
function paraText(p, text) {
  const runs = p.match(/<a:r>[\s\S]*?<\/a:r>/g) || [];
  let first = runs[0];
  if (!first) { const e = p.match(/<a:endParaRPr([^>]*?)(\/>|>([\s\S]*?)<\/a:endParaRPr>)/); first = e ? `<a:r><a:rPr${e[1]}${e[3] !== undefined ? '>' + e[3] + '</a:rPr>' : '/>'}<a:t></a:t></a:r>` : '<a:r><a:t></a:t></a:r>'; }
  const run = first.replace(/<a:t>[\s\S]*?<\/a:t>|<a:t\/>/, `<a:t>${xesc(text)}</a:t>`);
  let body = p.replace(/<a:r>[\s\S]*?<\/a:r>/g, '').replace(/<a:fld [\s\S]*?<\/a:fld>/g, '');
  const at = body.search(/<a:endParaRPr|<\/a:p>/);
  return body.slice(0, at) + run + body.slice(at);
}
/** a text box's paragraphs (those with text in the template), in order */
function boxText(sp, texts) {
  let i = 0;
  return sp.replace(/<a:p>[\s\S]*?<\/a:p>/g, p => (i < texts.length && /<a:r>/.test(p) ? paraText(p, texts[i++]) : p));
}
const cellText = (tc, text) => tc.replace(/<a:p>[\s\S]*?<\/a:p>/, p => paraText(p, text));
/** a table: the header row kept, a row per item made from the template's first row, and the frame as tall as its rows */
function tableRows(frame, rows, minRows = 0) {
  const trs = frame.match(/<a:tr [^>]*>[\s\S]*?<\/a:tr>/g) || []; if (trs.length < 2) throw new Error('a table of the deck template has no row to copy');
  const head = trs[0], tpl = trs.slice(1), all = rows.slice();
  while (all.length < minRows) all.push([]);
  const body = all.map(cells => { let k = 0; return tpl[0].replace(/<a:tc>[\s\S]*?<\/a:tc>|<a:tc [^>]*>[\s\S]*?<\/a:tc>/g, tc => cellText(tc, cells[k++] ?? '')); }).join('');
  const a = frame.indexOf(trs[0]), b = frame.indexOf('</a:tbl>');
  let out = frame.slice(0, a) + head + body + frame.slice(b);
  const h = [head].concat(all.map(() => tpl[0])).reduce((s, tr) => s + (+((tr.match(/<a:tr h="(\d+)"/) || [])[1] || 0)), 0);
  if (h) out = out.replace(/(<p:xfrm>[\s\S]*?<a:ext cx="\d+" cy=")\d+(")/, `$1${h}$2`);
  return out;
}
/** a chart's three series (presented, handled, service level): their points, the categories dates or labels */
function chartData(xml, cats, series, dates) {
  let s = 0;
  return xml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, ser => {
    const vals = series[s++] || [], n = cats.length;
    const pts = (arr, f) => arr.map((v, i) => (v === null || v === undefined || (typeof v === 'number' && isNaN(v)) ? '' : `<c:pt idx="${i}"><c:v>${xesc(f ? f(v) : v)}</c:v></c:pt>`)).join('');
    ser = ser.replace(/(<c:cat>[\s\S]*?)<c:ptCount val="\d+"\/>(?:<c:pt idx="\d+"[^>]*><c:v>[^<]*<\/c:v><\/c:pt>)*/, (m, pre) => `${pre}<c:ptCount val="${n}"/>${pts(cats, dates ? serial : null)}`);
    ser = ser.replace(/(<c:val>[\s\S]*?)<c:ptCount val="\d+"\/>(?:<c:pt idx="\d+"[^>]*><c:v>[^<]*<\/c:v><\/c:pt>)*/, (m, pre) => `${pre}<c:ptCount val="${n}"/>${pts(vals, v => +(+v).toFixed(10))}`);
    if (dates) ser = ser.replace(/(<c:f>'[^']+'!\$[A-Z]+\$2:\$[A-Z]+\$)\d+(<\/c:f>)/g, `$1${n + 1}$2`);
    return ser;
  });
}
const relsOf = x => Object.fromEntries([...x.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map(m => [m[1], m[2]]));
const relsOfAttr = x => { const out = {}; for (const m of x.matchAll(/<Relationship ([^>]*)\/?>/g)) { const id = (m[1].match(/Id="([^"]+)"/) || [])[1], t = (m[1].match(/Target="([^"]+)"/) || [])[1]; if (id && t) out[id] = t; } return out; };
/** the slide's charts in their order on the slide: the files they are in */
function slideCharts(slide, rels) {
  const R = relsOfAttr(rels);
  return [...slide.matchAll(/<c:chart [^>]*r:id="([^"]+)"/g)].map(m => 'ppt/' + (R[m[1]] || '').replace(/^\.\.\//, ''));
}
/** the deck: the template (bytes of wk/deck-template.pptx) filled with the week (model) -> the .pptx bytes */
async function deck(template, M) {
  const z = await C.readZip(template), names = z.names(), files = new Map();
  for (const n of names) files.set(n, /\.(xml|rels)$/i.test(n) ? await z.text(n) : await z.bytes(n));
  const w = M.w, date = dayLong(w.deck), month = monthLong(w.end), head = `Weekly Commercial Presentation  · ${date}`;
  const slide = n => `ppt/slides/slide${n}.xml`, put = (n, fn) => files.set(slide(n), fn(files.get(slide(n))));
  const charts = n => slideCharts(files.get(slide(n)), files.get(`ppt/slides/_rels/slide${n}.xml.rels`) || '');
  const daily = (file, B) => files.set(file, chartData(files.get(file), B.daily.map(r => r.date), [B.daily.map(r => r.presented), B.daily.map(r => r.handled), B.daily.map(r => r.sl)], true));
  const monthly = (file, B) => { const rows = B.monthly.concat([{ date: 'MTD', presented: B.mtd.presented, handled: B.mtd.handled, sl: B.mtd.sl }]); files.set(file, chartData(files.get(file), rows.map(r => (r.date === 'MTD' ? 'MTD' : monthCat(r.date))), [rows.map(r => r.presented), rows.map(r => r.handled), rows.map(r => r.sl)], false)); };
  const reasonRows = B => (B.reasons ? B.reasons.list.map(x => [x.reason, String(x.count), pct(B.reasons.base ? x.count / B.reasons.base : null)]) : []);
  const driverRows = X => (X && X.drivers ? X.drivers.filter(d => d && d.name).slice(0, 5).map(d => [d.name, pct(d.pct)]) : []);
  const int = v => (v === null || v === undefined || isNaN(v) ? '' : String(Math.round(v)));

  put(1, x => onShape(x, 'Text 10', sp => boxText(sp, [date])));
  [[2, 'virgin'], [3, 'friendi'], [4, 'fpay']].forEach(([n, b]) => {
    const B = M.brands[b], X = B.complaints || {};
    put(n, x => {
      x = onShape(x, 'Text 0', sp => boxText(sp, [head]));
      x = onShape(x, 'Text 4', sp => boxText(sp, [pct(B.mtd.sl), `Service Level · ${month}`]));
      x = onShape(x, 'Text 5', sp => boxText(sp, [`Daily Trend — ${month}`]));
      x = onShape(x, 'Text 9', sp => boxText(sp, [int(X.complaints)]));
      if (b === 'fpay') {
        const lm = monthStart(addDays(monthStart(w.end), -1));
        x = onShape(x, 'Text 13', sp => boxText(sp, [int(X.open)]));
        x = onShape(x, 'Text 17', sp => boxText(sp, [pct(B.lastMonth && B.lastMonth.sl)]));
        x = onShape(x, 'Text 18', sp => boxText(sp, [`Service level — ${monthTick(lm).replace(' ', '\u00a0')}`]));   // Sep '26 stays on one line
      } else {
        x = onShape(x, 'Text 13', sp => boxText(sp, [pct(X.onTime)]));
        x = onShape(x, 'Text 17', sp => boxText(sp, [int(X.open)]));
      }
      x = onShape(x, 'Table 0', fr => tableRows(fr, reasonRows(B), 5));
      x = onShape(x, 'Table 1', fr => tableRows(fr, driverRows(X), 5));
      return x;
    });
    const [cd, cm] = charts(n); daily(cd, B); monthly(cm, B);
  });
  { const B = M.brands.postpaid, T = M.tickets || { list: [] }, tl = (T.list || []).filter(x => x && x.name).slice(0, 5);
    put(5, x => {
      x = onShape(x, 'Text 0', sp => boxText(sp, [head]));
      x = onShape(x, 'Text 4', sp => boxText(sp, [pct(B.mtd.sl), `Service Level · ${month}`]));
      x = onShape(x, 'Text 5', sp => boxText(sp, [`Daily Trend — ${month}`]));
      x = onShape(x, 'Table 0', fr => tableRows(fr, reasonRows(B), 5));
      x = onShape(x, 'Table 1', fr => tableRows(fr, tl.map(t => [t.name, int(t.count), pct(T.total > 0 && t.count !== null ? t.count / T.total : null)]), 5));
      return x;
    });
    daily(charts(5)[0], B); }
  { const O = M.outages;
    put(6, x => {
      x = onShape(x, 'Text 0', sp => boxText(sp, [date]));
      x = onShape(x, 'Text 2', sp => boxText(sp, [`Service Incidents Logged —  Months (${O.span})`]));
      x = onShape(x, 'Text 4', sp => boxText(sp, [String(O.rows.length), `Incidents logged, ${O.brands} brand${O.brands === 1 ? '' : 's'}`]));
      x = onShape(x, 'Table 7', fr => tableRows(fr, O.rows.map(o => [dayShort(o.date), o.issue || '', o.brands || '', o.desc || '']), 1));
      return x;
    }); }
  const core = 'docProps/core.xml';
  if (files.has(core)) files.set(core, files.get(core).replace(/(<dcterms:modified[^>]*>)[^<]*(<\/dcterms:modified>)/, `$1${w.deck}T00:00:00Z$2`));
  return C.writeZip(names.map(n => ({ name: n, data: files.get(n) })));
}
const deckName = w => `Beyond_One_Member_Care_Review - ${dayLong(w.deck)}.pptx`;

// ---------------------------------------------------------------- the KPI workbook (BeyondOne_MC_KPIs): the week written into its cells
const colN = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
const colL = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
const splitRef = r => { const m = /^([A-Z]+)(\d+)$/.exec(r); return [m[1], +m[2]]; };
const xmlUn = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
/** one sheet's XML, read and written cell by cell (values only: formulas and styles stay) */
class Sheet {
  constructor(xml, sst) { this.xml = xml; this.sst = sst; }
  rowSpan(r) { const m = new RegExp(`<row r="${r}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`).exec(this.xml); return m ? [m.index, m.index + m[0].length, m[0]] : null; }
  cellSpan(ref) { const [, r] = splitRef(ref), row = this.rowSpan(r); if (!row) return null; const m = new RegExp(`<c r="${ref}"(?:[^>]*?/>|[^>]*>[\\s\\S]*?</c>)`).exec(row[2]); return m ? [row[0] + m.index, row[0] + m.index + m[0].length, m[0]] : null; }
  get(ref) {
    const c = this.cellSpan(ref); if (!c) return null; const x = c[2], t = (x.match(/^<c [^>]*\bt="([^"]+)"/) || [])[1], v = (x.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (t === 's') return v === undefined ? null : this.sst[+v] ?? null;
    if (t === 'inlineStr') return xmlUn(((x.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || '').replace(/<[^>]+>/g, ''));
    if (t === 'str') return v === undefined ? null : xmlUn(v);
    return v === undefined ? null : +v;
  }
  formula(ref) { const c = this.cellSpan(ref); return c ? ((c[2].match(/<f>([\s\S]*?)<\/f>/) || [])[1] || null) : null; }
  /** a number, a text or null (emptied); a formula cell is never written over */
  set(ref, v) {
    const [col, r] = splitRef(ref), c = this.cellSpan(ref);
    if (c && /<f[ >]/.test(c[2])) return false;
    const s = c ? (c[2].match(/^<c [^>]*?\b(s="\d+")/) || [])[1] : '';
    const open = `<c r="${ref}"${s ? ' ' + s : ''}`;
    const cell = v === null || v === undefined || v === '' ? `${open}/>` : typeof v === 'number' ? `${open}><v>${+v.toFixed(12)}</v></c>` : `${open} t="inlineStr"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
    if (c) { this.xml = this.xml.slice(0, c[0]) + cell + this.xml.slice(c[1]); return true; }
    if (v === null || v === undefined || v === '') return true;
    let row = this.rowSpan(r);
    if (!row) {   // a new row, in its place
      const after = [...this.xml.matchAll(/<row r="(\d+)"/g)].find(m => +m[1] > r), at = after ? after.index : this.xml.indexOf('</sheetData>');
      this.xml = this.xml.slice(0, at) + `<row r="${r}"></row>` + this.xml.slice(at); row = this.rowSpan(r);
    }
    let body = row[2].replace(/^(<row [^>]*?)\/>$/, '$1></row>');
    body = body.replace(/\sspans="[^"]*"/, '');
    const cells = [...body.matchAll(/<c r="([A-Z]+)\d+"/g)], next = cells.find(m => colN(m[1]) > colN(col));
    const at = next ? next.index : body.lastIndexOf('</row>');
    body = body.slice(0, at) + cell + body.slice(at);
    this.xml = this.xml.slice(0, row[0]) + body + this.xml.slice(row[1]);
    return true;
  }
  /** the rows of a column holding this text (trimmed, any case) */
  find(col, re) { const out = []; for (const m of this.xml.matchAll(new RegExp(`<c r="${col}(\\d+)"`, 'g'))) { const v = this.get(col + m[1]); if (typeof v === 'string' && re.test(v.trim())) out.push(+m[1]); } return out.sort((a, b) => a - b); }
}
async function sheetsOf(z) {
  const wb = await z.text('xl/workbook.xml'), rels = relsOfAttr(await z.text('xl/_rels/workbook.xml.rels') || ''), out = {};
  for (const m of wb.matchAll(/<sheet [^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g)) out[xmlUn(m[1]).trim()] = 'xl/' + (rels[m[2]] || '').replace(/^\/?xl\//, '');
  return out;
}
async function sharedStrings(z) {
  const x = await z.text('xl/sharedStrings.xml'); if (!x) return [];
  return [...x.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => xmlUn([...m[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
}
/** the month's days (a column of dates and three of numbers), the rest of the month emptied */
function writeDays(S, cols, rows, w) {
  const m0 = monthStart(w.end), y = +m0.slice(0, 4), mo = +m0.slice(5, 7), n = new Date(Date.UTC(y, mo, 0)).getUTCDate(), by = new Map(rows.map(r => [r.date, r]));
  for (let i = 0; i < 31; i++) {
    const d = i < n ? `${m0.slice(0, 8)}${p2(i + 1)}` : null, r = d && d <= w.end ? by.get(d) : null, rr = 2 + i;
    S.set(cols[0] + rr, d ? serial(d) : null);
    S.set(cols[1] + rr, r ? r.presented : null); S.set(cols[2] + rr, r ? r.handled : null); S.set(cols[3] + rr, r ? r.sl : null);
  }
}
/** a reasons table: the name and count columns from its first row, the total where its % formula divides */
function writeReasons(S, headRow, cols, R, notes, label) {
  const [cName, cCount, cPct, cCopy] = cols, first = headRow + 1, f = S.formula(cPct + first) || '';
  const base = (f.match(/\/\s*\$?([A-Z]+)\$?(\d+)/) || []);
  const list = R ? R.list : [];
  for (let i = 0; i < 5; i++) { const x = list[i]; S.set(cName + (first + i), x ? x.reason : null); S.set(cCount + (first + i), x ? x.count : null); if (cCopy) S.set(cCopy + (first + i), x ? x.count : null); }
  if (base[1]) S.set(base[1] + base[2], R ? R.base : null); else notes.push(`${label}: the total was not written (no % formula found in ${cPct}${first}).`);
}
/**
 * the KPI workbook's bytes -> { bytes, notes }: Weekly Data (each brand's days, month to date, the closed months it lists, the top call
 * reasons and the complaint figures) and Postpaid Data (its days, call reasons and tickets). Everything else is kept as it is.
 */
async function fillWorkbook(bytes, M) {
  const z = await C.readZip(bytes), names = z.names(), map = await sheetsOf(z), sst = await sharedStrings(z), notes = [];
  const pathOf = n => map[n] || map[Object.keys(map).find(k => k.toLowerCase() === n.toLowerCase())];
  const wkP = pathOf('Weekly Data'), ppP = pathOf('Postpaid Data');
  if (!wkP) throw new Error('this workbook has no "Weekly Data" sheet');
  const W = new Sheet(await z.text(wkP), sst), w = M.w, B = M.brands;
  writeDays(W, ['A', 'B', 'C', 'D'], B.virgin.daily, w); writeDays(W, ['F', 'G', 'H', 'I'], B.friendi.daily, w); writeDays(W, ['K', 'L', 'M', 'N'], B.fpay.daily, w);
  // the monthly blocks: VM, FR, FPay down column P, each ending with its MTD row
  const mtd = W.find('P', /^mtd$/i), order = ['virgin', 'friendi', 'fpay'];
  if (mtd.length < 3) notes.push('Weekly Data: the three MTD rows (column P) were not all found; the month to date was not written.');
  let from = 1;
  order.forEach((b, i) => {
    const r = mtd[i]; if (!r) return;
    const X = B[b], have = new Map(X.closed.map(m => [m.date, m])), listed = new Set();
    W.set('Q' + r, X.mtd.presented); W.set('R' + r, X.mtd.handled); W.set('S' + r, X.mtd.sl);
    for (let rr = from; rr < r; rr++) {
      const v = W.get('P' + rr); if (typeof v !== 'number' || v < 20000) continue;
      const mk = monthStart(fromSerial(v)); listed.add(mk); const m = have.get(mk); if (!m) continue;
      W.set('Q' + rr, m.presented); W.set('R' + rr, m.handled); W.set('S' + rr, m.sl);
    }
    const gone = X.monthly.filter(m => !listed.has(m.date)).map(m => monthCat(m.date));
    if (gone.length) notes.push(`Weekly Data: ${NAME[b]} has no row for ${gone.join(', ')} above its MTD row (row ${r}); add ${gone.length === 1 ? 'it' : 'them'} in Excel for the workbook's monthly charts.`);
    from = r + 1;
  });
  const heads = W.find('L', /^top call reasons$/i);
  order.forEach((b, i) => { if (heads[i]) writeReasons(W, heads[i], ['L', 'M', 'N'], B[b].reasons, notes, `Weekly Data ${NAME[b]}`); else notes.push(`Weekly Data: no Top Call Reasons table for ${NAME[b]}.`); });
  const counts = W.find('P', /^no\.?\s*of\s*complaints$/i), tops = W.find('P', /^top\s*5\s*complaints$/i);
  order.forEach((b, i) => {
    const X = B[b].complaints, r = counts[i]; if (!r) { notes.push(`Weekly Data: no complaints block for ${NAME[b]}.`); return; }
    if (!X) return;
    W.set('Q' + r, X.complaints);
    for (let rr = r + 1; rr <= r + 3; rr++) { const l = String(W.get('P' + rr) || ''); if (/resol/i.test(l)) W.set('Q' + rr, X.onTime); else if (/open/i.test(l)) W.set('Q' + rr, X.open); }
    const t = tops.find(x => x > r);
    if (t) for (let k = 0; k < 5; k++) { const d = (X.drivers || [])[k]; W.set('P' + (t + 1 + k), d ? d.name : null); W.set('Q' + (t + 1 + k), d ? d.pct : null); }
  });
  const out = new Map([[wkP, W.xml]]);
  if (ppP) {
    const P = new Sheet(await z.text(ppP), sst); writeDays(P, ['A', 'B', 'C', 'D'], B.postpaid.daily, w);
    const rh = P.find('H', /^top 5 call reasons$/i)[0]; if (rh) writeReasons(P, rh, ['H', 'I', 'J', 'L'], B.postpaid.reasons, notes, 'Postpaid Data'); else notes.push('Postpaid Data: no Top 5 Call Reasons table.');
    const th = P.find('P', /^top 5 t(ic)?k(e)?t/i)[0], T = M.tickets;
    if (th && T) { const tl = (T.list || []).filter(x => x && x.name); for (let k = 0; k < 5; k++) { const x = tl[k]; P.set('P' + (th + 1 + k), x ? x.name : null); P.set('Q' + (th + 1 + k), x ? x.count : null); P.set('T' + (th + 1 + k), x ? x.count : null); } const f = P.formula('R' + (th + 1)) || '', base = f.match(/\/\s*\$?([A-Z]+)\$?(\d+)/); if (base) P.set(base[1] + base[2], T.total || null); }
    else if (!th) notes.push('Postpaid Data: no Top 5 TKT table.');
    out.set(ppP, P.xml);
  } else notes.push('This workbook has no "Postpaid Data" sheet: the Postpaid numbers were not written.');
  let wbx = await z.text('xl/workbook.xml');
  wbx = /<calcPr\b[^>]*\bfullCalcOnLoad=/.test(wbx) ? wbx : wbx.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
  out.set('xl/workbook.xml', wbx);
  const files = [];
  for (const n of names) files.push({ name: n, data: out.has(n) ? out.get(n) : await z.bytes(n) });
  return { bytes: await C.writeZip(files), notes };
}

// ---------------------------------------------------------------- the email
function email(M, to, cc) {
  const first = String(to || '').split(/[;,]/)[0].replace(/<[^>]*>/g, '').trim().split(/\s+/)[0] || '';
  return { to, cc, subject: 'Weekly Commercial Presentation', html: `<p>Hi ${xesc(first)},</p><p>Kindly find the Weekly Commercial Presentation as attached.</p><p>Sincerely.</p>`, attach: deckName(M.w) };
}

return { BRANDS, NAME, COMPLAINT_BRANDS, weekOf, lastWeek, weekLabel, dayLong, monthLong, monthTick, monthCat, dayShort, addDays, isIso, serial, fromSerial, pct, readPct, readInt,
  dailyRows, mtdOf, closedMonths, monthlyRows, countReasons, topOf, reasonsFrom, reasonsOf, postpaidTickets, parseComplaints, outagesOf, outagesFromDeck, newOutages, model, checks, deck, deckName, fillWorkbook, email, Sheet, _x: { paraText, boxText, tableRows, chartData, shapeAt } };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Weekly;
