/* MC Monthly Report Builder - the Member Care Performance Review: the deck made from the "MC performance Review" email the
   Control and Complaint team sends (its tables: Rebooking TKTs, Network Issues TKTs, Web + App TKTs, Social Media issue TKTs, Vnet
   Complaints, and any other one), with the brands' slides of the weekly presentation.
   tablesOf(): the email's tables from its text (an Outlook .msg keeps one cell a line; a table copied from Outlook comes
   tab-separated): a title ending with ":", its header, and a row per month ("Jan", "Jun-25", "1-Jan", "Oct-26"); the month to date
   ends with "to N" ("Nov to 3", "11/1/2026 to 3": until the 3rd).
   deck(): cover; Virgin, FRiENDi and Postpaid (WcDeck's slides); Complaints Insights (Web + App, Network, Social media);
   Complaints Insights (Rebooking by month, Vnet, the month so far); OTP calls and final termination calls (from the Call history
   export, callsOf(), and the MC KPIs workbook); a slide for any other table; thank you. */
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
// ---------------------------------------------------------------- the Call history export: OTP calls and final termination calls by day
/** a Call history row's day: an Excel date-time number (the day it falls on), a Date, or "03-11-2026 23:59" / "2026-11-03 23:59" */
function callDay(v) {
  if (typeof v === 'number') return v > 20000 && v < 80000 ? new Date(Date.UTC(1899, 11, 30) + Math.floor(v + 1e-7) * 86400000).toISOString().slice(0, 10) : null;
  if (v instanceof Date) return isNaN(v) ? null : `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const t = sp(v); let x;
  if ((x = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${x[1]}-${x[2]}-${x[3]}`;
  if ((x = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)) && +x[1] >= 1 && +x[1] <= 31 && +x[2] >= 1 && +x[2] <= 12) return `${x[3]}-${pad(+x[2])}-${pad(+x[1])}`;
  return null;
}
/** a day's counts: its rows; the OTP calls; the final termination calls; of those the terminations done (each: every channel, calls only) */
const CALL_KEYS = ['calls', 'otp', 'otpCall', 'term', 'termCall', 'done', 'doneCall'];
const call0 = () => Object.fromEntries(CALL_KEYS.map(k => [k, 0]));
/**
 * The Call history export from Crystal ("Call Center History Report": a row a contact, with its Call Date, Type, Service, Sub Service
 * and Contact Type), counted by day: the OTP calls (a Service or Sub Service that names OTP: "OTP is not received", "App OTP isn't
 * Received"), the final termination calls (Type "Virgin Final Deactivation", "FRiENDi Final Deactivation") and of those the
 * terminations done (Sub Service "Termination Done"); each for every channel and for calls only (Contact Type CALL). Only the days the
 * export has rows on are counted. sheets: [{ name, rows }]. Returns { days, rows, labels: { otp, term } } (what was counted, by
 * name), or null when it is not a Call history.
 */
function callsOf(sheets) {
  const out = { days: {}, rows: 0, labels: { otp: {}, term: {} } }; let found = false;
  const add = (L, k) => { L[k] = (L[k] || 0) + 1; };
  for (const sh of sheets || []) {
    const R = sh.rows || []; let h = -1, C = null;
    for (let r = 0; r < Math.min(R.length, 8) && h < 0; r++) {
      const row = R[r] || [], col = re => row.findIndex(c => re.test(cellText(c)));
      const c = { date: col(/^call\s*date$/i), type: col(/^type$/i), service: col(/^service$/i), sub: col(/^sub[\s-]*service$/i), contact: col(/^contact\s*type$/i) };
      if (c.date >= 0 && c.type >= 0 && c.sub >= 0) { h = r; C = c; }
    }
    if (h < 0) continue;
    found = true;
    for (let r = h + 1; r < R.length; r++) {
      const q = R[r] || [], d = callDay(q[C.date]), type = cellText(q[C.type]); if (!d || !type) continue;
      const service = C.service >= 0 ? cellText(q[C.service]) : '', sub = cellText(q[C.sub]), call = C.contact < 0 || /^call$/i.test(cellText(q[C.contact]));
      const D = out.days[d] || (out.days[d] = call0()); D.calls++; out.rows++;
      if (/\botp\b/i.test(`${service} ${sub}`)) { D.otp++; if (call) D.otpCall++; add(out.labels.otp, sub || service); }
      if (/final\s*(deactivation|termination)/i.test(type)) {
        D.term++; if (call) D.termCall++; add(out.labels.term, type);
        if (/^termination\s*done$/i.test(sub)) { D.done++; if (call) D.doneCall++; }
      }
    }
  }
  return found ? out : null;
}
/** the days of two Call history exports (or the days kept and a new export): a day in both keeps the one with more rows (the whole day) */
function callsMerge(a, b) {
  const out = { ...(a || {}) };
  for (const [d, x] of Object.entries(b || {})) if (x && (!out[d] || (+x.calls || 0) >= (+out[d].calls || 0))) out[d] = x;
  return out;
}
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
const daysIn = ym => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
const nextDay = d => new Date(Date.parse(d + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
/** the same day k months before (the 31st of a shorter month: its last day) */
function monthsBack(d, k) {
  const m0 = +d.slice(0, 4) * 12 + (+d.slice(5, 7) - 1) - k, ym = `${Math.floor(m0 / 12)}-${pad((m0 % 12) + 1)}`;
  return `${ym}-${pad(Math.min(+d.slice(8, 10), daysIn(ym)))}`;
}
// ---------------------------------------------------------------- the numbers a deck or the KPIs workbook already has, kept as they are
const unxml = t => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
/** a chart's series from the values PowerPoint keeps in it: { name, num (the categories are numbers: Excel dates), fmt, cats, vals } */
function chartSeries(xml) {
  const out = [], pts = x => { const L = []; for (const p of x.matchAll(/<c:pt idx="(\d+)"[^>]*>\s*<c:v>([^<]*)<\/c:v>/g)) L[+p[1]] = unxml(p[2]); return L; };
  for (const m of String(xml || '').matchAll(/<c:ser>([\s\S]*?)<\/c:ser>/g)) {
    const S = m[1], tx = (S.match(/<c:tx>([\s\S]*?)<\/c:tx>/) || [])[1] || '', cat = (S.match(/<c:cat>([\s\S]*?)<\/c:cat>/) || [])[1] || '', val = (S.match(/<c:val>([\s\S]*?)<\/c:val>/) || [])[1] || '';
    out.push({ name: sp(unxml((tx.match(/<c:v>([^<]*)<\/c:v>/) || tx.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || '')), num: /<c:num(?:Cache|Lit)>/.test(cat), fmt: unxml((cat.match(/<c:formatCode>([^<]*)<\/c:formatCode>/) || [])[1] || ''), cats: pts(cat), vals: pts(val) });
  }
  return out;
}
/**
 * The OTP calls by day and the final termination calls by month one of the team's decks shows: the values kept in its "OTP Count"
 * and "Final termination Count" charts (the days as Excel dates, d-mmm-yy, or as labels, 5-Sep-26; the months as Excel dates,
 * mmm-yy, or labels, Jan-26). A deck the tool made is not read for them (its numbers are the ones the tool keeps). z: a zip.
 * Returns { otp, term } as kpiOf() has them (either null), and own: true for a deck the tool made.
 */
async function deckCallsOf(z) {
  const out = { otp: null, term: null };
  if (/<Application>MC Monthly Report Builder<\/Application>/.test((await z.text('docProps/app.xml')) || '')) return { ...out, own: true };
  const charts = z.names().filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml$/)[1] - +b.match(/(\d+)\.xml$/)[1]);
  for (const n of charts) {
    for (const S of chartSeries(await z.text(n))) {
      const isOtp = /\botp\b/i.test(S.name), isTerm = /terminat/i.test(S.name), daily = S.num ? /d/i.test(S.fmt.replace(/\[[^\]]*\]|"[^"]*"/g, '')) : null;
      if ((!isOtp && !isTerm) || (isOtp ? out.otp : out.term)) continue;
      const L = [];
      for (let i = 0; i < S.cats.length; i++) {
        const c = S.cats[i], v = S.vals[i] == null || S.vals[i] === '' ? NaN : +S.vals[i]; if (c == null || !Number.isFinite(v)) continue;
        if (isOtp) { const d = S.num ? (daily ? SERIAL(+c) : null) : dayOf(c); if (d) L.push({ date: d, n: v }); }
        else { const M = S.num ? (daily === false && SERIAL(+c) ? { y: +SERIAL(+c).slice(0, 4), m: +SERIAL(+c).slice(5, 7) } : null) : monthOf(c); if (M && M.y) L.push({ ym: `${M.y}-${pad(M.m)}`, n: v }); }
      }
      if (L.length) out[isOtp ? 'otp' : 'term'] = L.sort((a, b) => ((a.date || a.ym) < (b.date || b.ym) ? -1 : 1));
    }
  }
  return out;
}
/** what a deck or the KPIs workbook gives ({ otp: [{ date, n }], term: [{ ym, n }] }), to keep: { otp: { day: n }, term: { ym: { n, end } } };
    each month is whole but the last, which ends on the last OTP day when that falls in it */
function baseOf(src) {
  const out = { otp: {}, term: {} }; if (!src) return out;
  for (const r of src.otp || []) if (r && isDay(r.date) && Number.isFinite(r.n)) out.otp[r.date] = r.n;
  const T = (src.term || []).filter(r => r && /^\d{4}-\d{2}$/.test(r.ym) && Number.isFinite(r.n)).sort((a, b) => (a.ym < b.ym ? -1 : 1)), D = Object.keys(out.otp).sort(), lastD = D[D.length - 1] || '';
  T.forEach((r, i) => { out.term[r.ym] = { n: r.n, end: i === T.length - 1 && lastD.slice(0, 7) === r.ym ? lastD : `${r.ym}-${pad(daysIn(r.ym))}` }; });
  return out;
}
/** two of them kept together: a day in both takes the newer one's number, a month the one that covers more of it */
function baseMerge(a, b) {
  const out = { otp: { ...((a && a.otp) || {}) }, term: { ...((a && a.term) || {}) } };
  for (const [d, n] of Object.entries((b && b.otp) || {})) out.otp[d] = n;
  for (const [ym, x] of Object.entries((b && b.term) || {})) if (!out.term[ym] || String(x.end || '9') >= String(out.term[ym].end || '9')) out.term[ym] = x;
  return out;
}
/**
 * What the OTP and final termination slide shows. B: the numbers kept from the team's deck and the MC KPIs workbook (baseOf()),
 * shown as they are; days: callsOf().days (the Call history's days kept), for the days after them; rule: { ch: 'all' | 'call',
 * term: 'all' | 'done' } (every channel or calls only; every final termination call or the terminations done). OTP calls: the two
 * months to the last day, day by day (a day with no data left blank); final termination calls: by month from January of the last
 * month's year, a month the deck or the workbook has only part of completed with the Call history's days after it. miss: the days
 * the slide still lacks (in the two months, and in the months it shows). Returns { otp, term: [{ ym, n, end }], otpEnd, termEnd, miss }.
 */
function otpTerm(B, days, rule) {
  B = B || {}; days = days || {}; rule = rule || {};
  const ch = rule.ch === 'call' ? 'Call' : '', fo = 'otp' + ch, ft = (rule.term === 'done' ? 'done' : 'term') + ch;
  const own = Object.keys(days).filter(d => isDay(d) && days[d] && typeof days[d] === 'object').sort(), ownS = new Set(own);
  const BO = B.otp && typeof B.otp === 'object' ? B.otp : {}, BT = B.term && typeof B.term === 'object' ? B.term : {}, miss = new Set();
  const byDay = new Map();
  for (const d of own) if (Number.isFinite(+days[d][fo])) byDay.set(d, +days[d][fo]);
  for (const d of Object.keys(BO)) if (isDay(d) && Number.isFinite(BO[d])) byDay.set(d, BO[d]);   // the deck's and the workbook's days as they are
  let otp = null, otpEnd = null;
  if (byDay.size) {
    const D = [...byDay.keys()].sort(), from = monthsBack(D[D.length - 1], 2); otpEnd = D[D.length - 1]; otp = [];
    for (let d = nextDay(from); d <= otpEnd; d = nextDay(d)) if (!byDay.has(d)) miss.add(d);
    for (let d = D.find(x => x > from); d <= otpEnd; d = nextDay(d)) otp.push({ date: d, n: byDay.has(d) ? byDay.get(d) : null });
  }
  const mon = new Map();
  for (const ym of Object.keys(BT).sort()) { const x = BT[ym]; if (/^\d{4}-\d{2}$/.test(ym) && x && Number.isFinite(x.n)) mon.set(ym, { n: x.n, end: isDay(x.end) && x.end.slice(0, 7) === ym ? x.end : `${ym}-${pad(daysIn(ym))}`, from: `${ym}-01` }); }
  for (const d of own) { const ym = d.slice(0, 7), v = +days[d][ft] || 0, x = mon.get(ym); if (!x) mon.set(ym, { n: v, end: d, from: d, own: true }); else if (d > x.end) { x.n += v; x.end = d; } }
  let term = null, termEnd = null;
  if (mon.size) {
    const Y = [...mon.keys()].sort(), ly = Y[Y.length - 1], first = Y.find(ym => ym >= `${ly.slice(0, 4)}-01`);
    term = Y.filter(ym => ym >= first).map(ym => ({ ym, n: mon.get(ym).n, end: mon.get(ym).end }));
    termEnd = mon.get(ly).end;
    // the days the months shown lack: before the Call history's first day in a month it alone gives, after the deck's end, a month not there
    for (let ym = first; ym <= ly; ym = `${monthsBack(`${ym}-15`, -1).slice(0, 7)}`) {
      const x = mon.get(ym), stop = ym === ly ? termEnd : `${ym}-${pad(daysIn(ym))}`;
      for (let d = `${ym}-01`; d <= stop; d = nextDay(d)) if (!x || (x.own ? !ownS.has(d) : d > x.end && !ownS.has(d))) miss.add(d);
    }
  }
  return { otp, term, otpEnd, termEnd, miss: [...miss].sort() };
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
const THEME = WD.parts.K.CHART;   // the Beyond One template's colours, in its order
const isTotal = c => /^total$/i.test(c.trim());
const lastRow = t => t.rows[t.rows.length - 1];
/** a chart of a table: a column per series (the Total and any share left out); labels on all, or on the biggest series */
function chartOf(t, o = {}) {
  const rows = o.rows || t.rows, idx = t.cols.map((c, i) => i).filter(i => !/%|share|rate/i.test(t.cols[i]));
  let bars = idx; if (bars.length > 1) bars = bars.filter(i => !isTotal(t.cols[i]));
  const sums = bars.map(i => rows.reduce((a, r) => a + (r.vals[i] || 0), 0)), big = bars[sums.indexOf(Math.max(...sums))];
  const lab = o.labels || (bars.length <= 2 ? 'all' : 'big');
  return {
    ...WD.parts.K.frame(), cats: rows.map(r => (o.yearFirst ? r.label2 || r.label : r.label)), gap: o.gap ?? 150, overlap: o.overlap, catRot: rows.length > 12 ? -45 : undefined, catSize: 900, barFmt: '#,##0',
    bars: bars.map((i, k) => ({ name: t.cols[i], values: rows.map(r => r.vals[i]), color: THEME[k % THEME.length], labels: lab === 'all' || (lab === 'first' && k === 0) || (lab === 'big' && i === big) })),
  };
}
const since = t => lastRow(t).until ? lastRow(t).label : `To ${lastRow(t).label}`;
/** the top of a slide (the template's: the logo, the deck's name in small capitals, the square), its title, a chart's heading */
const kick = (s, m) => WD.parts.K.top(s, `MC Service Level Stabilization  ·  ${WD.parts.deckDate(m.date)}`);
const title = (s, x, y, t, size = 26) => WD.parts.K.title(s, x, y, 8.10, t, null, { size });
const sub = (s, x, y, t, w = 7.85) => WD.parts.K.heading(s, x, y, w, t, 11);
/** a place a table the email lacks */
function missing(s, x, y, w, h, name) {
  s.rect(x, y, w, h, { fill: WD.parts.K.C.soft, line: WD.parts.K.C.line });
  s.text(x, y, w, h, `${name}: not in the email`, { size: 11, italic: true, color: WD.parts.MUTED, align: 'center', valign: 'middle' });
}
function complaints(D, m, o, by, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' });
  kick(s, m); title(s, 0.45, 1.04, 'Complaints Insights');
  const at = (t, name, lx, ly, x, y, w, h, c) => { if (!t) { sub(s, lx, ly, name); missing(s, x, y, w, h, name); return; } sub(s, lx, ly, `${name} – ${since(t)}`); s.chart(x, y, w, h, chartOf(t, c), { name }); };
  const net = by('network'), netRows = net ? (r => (r.length >= 6 ? r : net.rows.slice(-13)))(net.rows.filter(r => r.ym >= `${lastRow(net).ym.slice(0, 4)}-01`)) : null;
  at(by('webapp'), 'Web + App TKTs', 0.45, 1.66, 0.43, 1.98, 12.45, 2.40, { labels: 'all' });
  at(net, 'Network TKT', 0.45, 4.44, 0.43, 4.76, 6.04, 2.24, { rows: netRows || undefined, labels: 'big', yearFirst: true });
  at(by('social'), 'Social Media issue TKTs', 6.69, 4.44, 6.67, 4.76, 6.22, 2.24, { labels: 'all', yearFirst: true });
  W.foot(s, o, n);
}
const dd = d => `${d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`, dm = d => `${+d.slice(8, 10)}-${MON[+d.slice(5, 7) - 1]}`;
function rebooking(D, m, o, t, K, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' }), day = K.byDay && K.byDay.length ? K.byDay.slice(-22) : null;
  kick(s, m); title(s, 0.45, 1.04, 'Complaints Insights');
  sub(s, 0.45, 1.62, day ? `Rebooking TKTs – From ${dm(day[0].date)} To ${dd(day[day.length - 1].date)}` : t ? `Rebooking TKTs – ${since(t)}` : 'Rebooking TKTs', 9.00);
  const frame = W.K.frame({ titleSize: 1400 });
  if (day) {
    s.chart(1.75, 1.98, 9.84, 2.48, { ...frame, title: 'Booking Code Reactivations by Day', yTitle: 'Requests', y2Title: 'Avg Time to Close (hh:mm)', cats: day.map(r => dm(r.date)), gap: 219, overlap: -27, catSize: 800,
      bars: [{ name: 'Virgin', values: day.map(r => r.virgin), color: THEME[0], labels: true }, { name: 'Friendi', values: day.map(r => r.friendi), color: THEME[1] }],
      line: day.some(r => r.avg != null) ? { name: 'Avg Time to Close', values: day.map(r => r.avg), color: THEME[2], w: 2.5, fmt: '[h]:mm', max: null, min: 0, labels: false, smooth: false, marker: { symbol: 'circle', size: 6, color: THEME[2] } } : undefined }, { name: 'Rebooking by day' });
  }
  const T = t || (K.byMonth ? { cols: ['Virgin', 'FRiENDi'], rows: K.byMonth.map(([c, v, f]) => { const L = monthOf(c); return { label: c, label2: c, vals: [v, f], until: L && L.until }; }) } : null);
  const [x, y, w, h] = day ? [1.75, 4.52, 9.84, 2.48] : [1.75, 1.98, 9.84, 5.02];
  if (T) {
    const vi = T.cols.findIndex(c => /virgin/i.test(c)), fi = T.cols.findIndex(c => /friendi/i.test(c));
    s.chart(x, y, w, h, { ...frame, title: 'Booking Code Reactivations by Month', cats: T.rows.map(r => r.label2 || r.label), gap: 219, overlap: -27,
      bars: [{ name: 'Virgin', values: T.rows.map(r => r.vals[vi >= 0 ? vi : 0]), color: THEME[0], labels: true }, { name: 'FRiENDi', values: T.rows.map(r => r.vals[fi >= 0 ? fi : 1]), color: THEME[1] }] }, { name: 'Rebooking by month' });
  } else missing(s, x, y, w, h, 'Rebooking TKTs');
  W.foot(s, o, n);
}
/** OTP calls by day and final termination calls by month: T = otpTerm() */
function otpSlide(D, m, o, T, n) {
  const W = WD.parts, s = D.slide({ bg: 'FFFFFF' }), { otp, term } = T, end = T.otpEnd || m.ref, few = L => L.filter(r => r.n != null).length < 3;   // a trend needs a few points
  const frame = W.K.frame({ legend: false });
  kick(s, m);
  title(s, 0.45, 1.04, 'OTP Calls', 22); sub(s, 3.10, 1.18, `Until ${dd(end)}`, 6.67);
  if (otp) s.chart(1.31, 1.62, 10.98, 2.62, { ...frame, cats: otp.map(r => `${dm(r.date)}-${r.date.slice(2, 4)}`), gap: 100, overlap: -24, catRot: -45, catSize: 800,
    bars: [{ name: 'OTP Count', values: otp.map(r => r.n), color: THEME[0], trend: few(otp) ? [] : [{ type: 'exp', dash: 'sysDash' }, { type: 'linear', dash: 'sysDash' }] }] }, { name: 'OTP calls' });
  else missing(s, 1.31, 1.62, 10.98, 2.62, 'OTP calls');
  W.K.title(s, 0.45, 4.28, 6.67, 'Final termination calls', null, { size: 22 }); sub(s, 5.55, 4.42, `Until ${dd(T.termEnd || end)}`, 6.67);
  if (term) s.chart(1.31, 4.86, 10.98, 2.14, { ...frame, cats: term.map(r => `${MON[+r.ym.slice(5) - 1]}-${r.ym.slice(2, 4)}`), gap: 150,
    bars: [{ name: 'Final termination Count', values: term.map(r => r.n), color: THEME[0], labels: true, trend: few(term) ? [] : [{ type: 'exp', dash: 'sysDot' }] }] }, { name: 'Final termination calls' });
  else missing(s, 1.31, 4.86, 10.98, 2.14, 'Final termination calls');
  W.foot(s, o, n);
}
/**
 * the Performance Review, as the team's deck: m = WcDeck.model() for the presentation's day (the brands' slides), tables =
 * tablesOf() from the email, o = { presenter, title, org, logo, logos, kpi: kpiOf() of the MC KPIs workbook, base: the numbers kept
 * from the team's deck and the workbook (baseOf(); else the workbook's), calls: the Call history's days (callsOf().days, kept),
 * callRule: what counts (otpTerm()) }
 */
function deck(m, tables, o0 = {}) {
  const W = WD.parts, o = { ...o0, kicker: 'Weekly Commercial Presentation', coverSub: 'Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay', monthlyLabel: 'Monthly Trend', ppLabel: false };
  const D = P.create({ headFont: W.K.HEAD, bodyFont: W.K.BODY }), by = k => tables.find(t => t.key === k) || null, K = o0.kpi || {};
  let n = 2;
  W.cover(D, m, o);
  W.brandSlide(D, m, m.brands[0], n++, o);   // Virgin Mobile
  W.brandSlide(D, m, m.brands[1], n++, o);   // FRiENDi Mobile
  W.postpaidSlide(D, m, n++, o);
  complaints(D, m, o, by, n++);
  rebooking(D, m, o, by('rebooking'), K, n++);
  const OT = otpTerm(o0.base || baseOf(K), o0.calls, o0.callRule);
  if (OT.otp || OT.term) otpSlide(D, m, o, OT, n++);
  // a table the deck does not know (a new one in the email): two a slide
  const other = tables.filter(t => t.key === 'other');
  for (let i = 0; i < other.length; i += 2) {
    const s = D.slide({ bg: 'FFFFFF' });
    kick(s, m); title(s, 0.45, 1.04, 'More Insights');
    [[other[i], 1.66, 1.98, 2.40], [other[i + 1], 4.44, 4.76, 2.24]].forEach(([t, ly, y, h]) => { if (!t) return; sub(s, 0.45, ly, `${t.title} – ${since(t)}`); s.chart(0.43, y, 12.45, h, chartOf(t, { rows: t.rows.slice(-14) }), { name: t.title }); });
    W.foot(s, o, n++);
  }
  W.thanks(D, o);
  return D;
}
const fileName = date => `MC_Performance_Review - ${WD.longDate(date)}.pptx`;
return { tablesOf, cellsOf, monthOf, chartOf, kpiOf, logosOf, dayOf, callDay, callsOf, callsMerge, chartSeries, deckCallsOf, baseOf, baseMerge, otpTerm, monthsBack, CALL_KEYS, deck, fileName };
})(typeof Pptx !== 'undefined' ? Pptx : require('./pptx.js'), typeof WcDeck !== 'undefined' ? WcDeck : require('./wcdeck.js'));
if (typeof module !== 'undefined') module.exports = PrDeck;
