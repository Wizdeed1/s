/* Reconcile: the old Excel of a month next to the tool. Finds what each old file is (the final result, the incentive data workbook,
   the deduction workbook, an attendance report) and which month it holds, and explains a difference by its cause: an own incentive
   base, an absence penalty the old process took off the days, days counted differently, a Final % the tool cannot reproduce, cells
   typed over a formula. Pure functions, no DOM: the Results page (compare.js) shows them and makes the fixes. */
'use strict';
const Recon = ((C, K, H) => {
const { normSpace, normName } = C;
const ymKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && normSpace(v) !== '' && Number.isFinite(+normSpace(v)) ? +normSpace(v) : null);

// ---------------------------------------------------------------- the measures an old table can have, and its values
const MEAS = [
  { k: 'fin', l: 'Final %', re: /^(final ?%|final percentage|final score|final result|kpi ?%|final|final % \(kpi\))$/i, t: 'pct' },
  { k: 'earned', l: 'Earned SR', re: /^(earned( sr)?|earned \(sr\)|earned incentive|incentive( sr| amount)?|amount( sr)?|total( sr)?|payout)$/i, t: 'int' },
  { k: 'adh', l: 'Adherence', re: /^(adherence( %| avr\.?| average)?|avg adherence|adherence avg)$/i, t: 'pct' },
  { k: 'aht', l: 'AHT', re: /^(aht( \(sec\))?|average handling time)$/i, t: 'sec' },
  { k: 'absent', l: 'Absent days', re: /^(absent( days)?|absence|absences)$/i, t: 'int' },
  { k: 'tardy', l: 'Tardy (min)', re: /^(tardy( \(min\)| minutes)?|tardiness)$/i, t: 'int' },
  { k: 'ka', l: 'Days attended', re: /^(actual days|days attended)$/i, t: 'int' },
  { k: 'ks', l: 'Scheduled days', re: /^(scheduled days|days scheduled)$/i, t: 'int' },
];
const meas = k => MEAS.find(m => m.k === k);
/** one cell of an old table in the measure's unit (a percentage as 0.95, AHT in seconds) */
function val(m, raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return m.t === 'sec' ? Math.round((raw.getTime() - Date.UTC(1899, 11, 30)) / 1000) : null;
  let s = raw, pctSign = false;
  if (typeof s === 'string') {
    s = normSpace(s); pctSign = /%$/.test(s);
    if (m.t === 'sec' && /^\d+:\d{2}(:\d{2})?$/.test(s)) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
    s = s.replace(/[%,\s]|SR/gi, ''); if (!s || !Number.isFinite(+s)) return null; s = +s;
  }
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  if (m.t === 'pct') return pctSign || s > 1.5 ? s / 100 : s;
  if (m.t === 'sec') return s < 1 ? Math.round(s * 86400) : s;
  return s;
}
const NAME_RE = /^(name|agent( name)?|employee( name)?|member care champions|full name)$/i, ID_RE = /^(id|national id|nid|iqama( no)?|id number|employee id)$/i;
/** an old table with an ID or Name column and measures next to it (the final result, or any results table) -> {rows:[{id, idRaw, name, v}], meas, sheet} */
function readTable(sheets) {
  let best = null;
  for (const S of sheets) {
    const R = S.rows || [];
    for (let i = 0; i < Math.min(R.length, 25); i++) {
      const Hd = Array.from(R[i] || [], v => normSpace(v));
      const ni = Hd.findIndex(v => NAME_RE.test(v)), ii = Hd.findIndex(v => ID_RE.test(v));
      if (ni < 0 && ii < 0) continue;
      const cols = MEAS.map(m => [m, Hd.findIndex(v => m.re.test(v))]).filter(([, j]) => j >= 0);
      if (!cols.length) continue;
      const rows = [];
      for (const r of R.slice(i + 1)) {
        if (!r) continue; const name = ni >= 0 ? normSpace(r[ni]) : '', idRaw = ii >= 0 ? normSpace(r[ii]) : '', id = ii >= 0 ? C.cleanId(r[ii]) || '' : '';
        if ((!name && !id) || /^(total|grand total|sum|average|all)$/i.test(name)) continue;
        const v = {}; for (const [m, j] of cols) v[m.k] = val(m, r[j]);
        if (Object.values(v).every(x => x == null)) continue;
        rows.push({ id, idRaw, name, v });
      }
      if (rows.length && (!best || rows.length > best.rows.length)) best = { rows, meas: cols.map(([m]) => m.k), sheet: S.name };
      break;
    }
  }
  return best;
}

// ---------------------------------------------------------------- which month a file holds: its title, its date headers, its name
const MW = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const MWORD = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const T1 = new RegExp(`(?:^|[^a-z])${MWORD}(?![a-z])[\\s,._/-]*(20\\d\\d)(?!\\d)`), T2 = new RegExp(`(?:^|\\D)(20\\d\\d)[\\s,._/-]*${MWORD}(?![a-z])`);
/** 'MC Monthly Deduction - Sep - 2026', 'August 2026', '2026 Aug' -> '2026-09' (or '') */
function titleMonth(s) {
  s = normSpace(s).toLowerCase(); if (!s) return '';
  let x = s.match(T1); if (x) return ymKey(+x[2], MW[x[1]]);
  x = s.match(T2); if (x) return ymKey(+x[1], MW[x[2]]);
  return '';
}
/** the month of a file name: 2026-08, Aug 2026, 2026_aug, or a month alone ('Final result for Aug': the latest such month not after today) */
function nameMonth(fileName, today) {
  const s = String(fileName || '').toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '');
  let x = s.match(/(20\d\d)[-_ .]?(0[1-9]|1[0-2])(?!\d)/); if (x) return ymKey(+x[1], +x[2]);
  const t = titleMonth(s.replace(/_/g, ' ')); if (t) return t;
  const w = s.split(/[^a-z]+/).find(z => MW[z]);
  if (!w) return '';
  const d = today || new Date(), m = MW[w], cy = d.getFullYear(), cm = d.getMonth() + 1;
  return ymKey(m <= cm ? cy : cy - 1, m);
}
/** the month most date headers are in (a row with seven dates or more in the first 25 rows of a sheet) */
function datesMonth(sheets) {
  const n = new Map();
  for (const S of sheets) {
    let best = null;
    for (const r of (S.rows || []).slice(0, 25)) {
      const c = new Map();
      for (const v of r || []) { if (v == null || v === '' || (typeof v === 'number' && !(v instanceof Date))) continue; const p = C.parseHeaderDate(v); if (p && p.y >= 2000) { const k = ymKey(p.y, p.m); c.set(k, (c.get(k) || 0) + 1); } }
      const top = [...c].sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 7 && (!best || top[1] > best[1])) best = top;
    }
    if (best) n.set(best[0], (n.get(best[0]) || 0) + best[1]);
  }
  const top = [...n].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : '';
}
/** -> { month, src: 'dates' | 'title' | 'name' | '', title, dates, name, conflict: {name, content} | null, inner: {title, dates} | null }.
    What the file holds (its dates, then its title) beats its name. */
function monthOf(sheets, fileName, today) {
  let title = '';
  for (const S of sheets) { for (const r of (S.rows || []).slice(0, 6)) { for (const v of r || []) if (typeof v === 'string' && /\s/.test(normSpace(v))) { title = titleMonth(v); if (title) break; } if (title) break; } if (title) break; }
  const dates = datesMonth(sheets), name = nameMonth(fileName, today), content = dates || title;
  return { month: content || name, src: dates ? 'dates' : title ? 'title' : name ? 'name' : '', title, dates, name,
    conflict: name && content && name !== content ? { name, content } : null, inner: title && dates && title !== dates ? { title, dates } : null };
}

// ---------------------------------------------------------------- what a file is
/** the deduction sheet: a row of dates and under it Sched. / Actual / Diff (min) for each day */
function dedLayout(S) {
  const R = S.rows || [];
  for (let i = 0; i < Math.min(R.length, 25); i++) {
    const r = R[i] || [], dc = [];
    r.forEach((v, j) => { if (v == null || v === '' || typeof v === 'number') return; const p = C.parseHeaderDate(v); if (p) dc.push([j, p]); });
    if (dc.length < 7) continue;
    const sub = (R[i + 1] || []).map(v => normSpace(v));
    if (!sub.some(v => /^sched/i.test(v)) || !sub.some(v => /^diff/i.test(v))) return null;
    const Hd = r.map(v => normSpace(v)), last = dc[dc.length - 1][0];
    const days = dc.map(([j, p], x) => {
      const end = x + 1 < dc.length ? dc[x + 1][0] : last + 3, f = re => { for (let c = j; c < end; c++) if (re.test(sub[c] || '')) return c; return -1; };
      return { d: p.d, y: p.y, m: p.m, s: f(/^sched/i), a: f(/^actual/i), x: f(/^diff/i) };
    }).filter(o => o.s >= 0 && o.a >= 0 && o.x >= 0);
    return { h: i, days, id: Hd.findIndex(v => ID_RE.test(v)), name: Hd.findIndex(v => NAME_RE.test(v)), total: Hd.findIndex((v, c) => c > last && /^total/i.test(v)), notes: Hd.findIndex((v, c) => c > last && /review notes|notes|comment/i.test(v)) };
  }
  return null;
}
const findDed = sheets => sheets.find(S => dedLayout(S)) || null;
const findAtt = sheets => sheets.find(S => /^attendance report$/i.test(normSpace(S.name))) || null;
const KIND = { inc: 'Incentive data', final: 'Final result', ded: 'Deduction workbook', att: 'Attendance report', res: 'Results table' };
/** -> { kind: 'inc' | 'ded' | 'final' | 'att' | 'res' | '', sheet, label, ...monthOf } */
function classify(sheets, fileName, opts = {}) {
  const mo = monthOf(sheets, fileName, opts.today), names = sheets.map(s => s.name || '');
  let kind = '', sheet = '';
  if (H.isIncentive(names)) { kind = 'inc'; sheet = 'incentive data'; }
  else { const d = findDed(sheets); if (d) { kind = 'ded'; sheet = d.name; } }
  if (!kind) {
    const t = readTable(sheets), a = findAtt(sheets);
    if (t && t.meas.some(m => m === 'fin' || m === 'earned')) { kind = 'final'; sheet = t.sheet; }
    else if (a) { kind = 'att'; sheet = a.name; }
    else if (t) { kind = 'res'; sheet = t.sheet; }
  }
  return { kind, sheet, label: KIND[kind] || '', ...mo };
}

// ---------------------------------------------------------------- the deduction workbook: Diff = Sched. - Actual, never below 0, 0 when Actual is 0
const dedRule = (S, A) => (S == null || A == null ? null : A === 0 ? 0 : Math.max(0, S - A));
/** -> { sheet, month, people, cells, exceptions: [{id, name, day, S, A, D, rule}], byPerson: [{id, name, sheet, rule, bad}], sheetTotal, ruleTotal, notes }.
    An exception is a Diff cell that is not what the rule gives (a 0 typed over 345 minutes, for example). */
function dedCheck(S) {
  const L = dedLayout(S); if (!L) return null;
  const R = S.rows || [], ex = [], byPerson = []; let cells = 0, sheetTotal = 0, ruleTotal = 0, notes = 0;
  const cnt = new Map(); for (const d of L.days) { const k = ymKey(d.y, d.m); if (d.y) cnt.set(k, (cnt.get(k) || 0) + 1); }
  for (const r of R.slice(L.h + 2)) {
    if (!r) continue;
    const name = L.name >= 0 ? normSpace(r[L.name]) : '', idRaw = L.id >= 0 ? normSpace(r[L.id]) : '';
    if (!name && !idRaw) continue;
    let sum = 0, rule = 0, bad = 0;
    for (const d of L.days) {
      const s = num(r[d.s]), a = num(r[d.a]), x = num(r[d.x]), want = dedRule(s, a);
      if (s == null && a == null && x == null) continue;
      cells++; if (x != null) sum += x; if (want != null) rule += want;
      if (want == null ? x != null && x !== 0 : x == null || Math.abs(x - want) >= 0.5) { bad++; ex.push({ id: C.cleanId(idRaw) || idRaw, name, day: d.d, S: s, A: a, D: x, rule: want }); }
    }
    const tot = L.total >= 0 ? num(r[L.total]) : null, shown = tot != null ? tot : sum;
    if (L.notes >= 0 && normSpace(r[L.notes])) notes++;
    sheetTotal += shown; ruleTotal += rule;
    byPerson.push({ id: C.cleanId(idRaw) || idRaw, name, sheet: shown, rule, bad });
  }
  const top = [...cnt].sort((a, b) => b[1] - a[1])[0];
  return { sheet: S.name, month: top ? top[0] : '', people: byPerson.length, cells, exceptions: ex, byPerson, sheetTotal: Math.round(sheetTotal), ruleTotal: Math.round(ruleTotal), notes };
}

// ---------------------------------------------------------------- earned SR, own bases, absence penalties
/** the earned SR the tool gives (the same steps as Kpi.score): base × counted days ÷ scheduled days × final %, rounded as the rules say */
function earnedOf(o, cfg) {
  if (!o || !(o.sched > 0) || o.fin == null || o.attended == null) return null;
  const c = K.normCount(cfg), absent = +o.absent || 0, runs = o.runs != null ? +o.runs || 0 : absent > 0 ? 1 : 0;
  const pen = K.penalty(o.attended, absent, runs, c), dp = c.daysPct === 'full' ? 1 : pen.counted / o.sched, x = (o.base ?? 1000) * dp * o.fin;
  return c.money === 'floor' ? Math.floor(x + 1e-9) : c.money === 'ceil' ? Math.ceil(x - 1e-9) : Math.round(x + 1e-9);
}
/** the Final % values a typed 2-decimal Final % can stand for: multiples of 0.002 (a final ranking to 2 decimals ÷ 5) that round to it */
function finRange(F) {
  const t = Math.round(F * 1000);
  if (Math.abs(F * 100 - Math.round(F * 100)) > 1e-7) return [F];
  const out = []; for (let x = t - 5; x <= t + 4; x++) if (x % 2 === 0 && x > 0 && (F > 1 || x <= 1000)) out.push(x / 1000);
  return out.length ? out : [F];
}
/** the base that gives the old earned SR with the old Final % and the days: { lo, hi (the range with the Final % as typed), loAny, hiAny
    (with any Final % it can stand for), ints: whole bases that give exactly E } or null */
function inferBase(o) {
  const { E, F, ks, ka } = o || {};
  if (!(ks > 0) || !(ka > 0) || !(F > 0) || E == null || !(E > 0)) return null;
  const r = ka / ks, lo = (E - 0.5) / (r * F), hi = (E + 0.5) / (r * F), fs = finRange(F), loAny = (E - 0.5) / (r * Math.max(...fs)), hiAny = (E + 0.5) / (r * Math.min(...fs));
  const ints = []; for (let b = Math.ceil(loAny - 1e-9); b <= Math.floor(hiAny + 1e-9) && ints.length < 50; b++) if (Math.round(b * r * F + 1e-9) === E) ints.push(b);
  return { lo, hi, loAny, hiAny, ints };
}
/** one base each, preferring a base several people share (1600 for six people rather than 1601 for one) -> Map(key -> base) */
function pickBases(list) {
  const freq = new Map(); for (const x of list) for (const b of (x.ints || [])) freq.set(b, (freq.get(b) || 0) + 1);
  const out = new Map();
  for (const x of list) {
    if (!x.ints || !x.ints.length) continue;
    const mid = x.lo != null && x.hi != null ? (x.lo + x.hi) / 2 : x.ints[0];
    out.set(x.key, [...x.ints].sort((a, b) => (freq.get(b) - freq.get(a)) || ((b % 10 === 0) - (a % 10 === 0)) || (Math.abs(a - mid) - Math.abs(b - mid)))[0]);
  }
  return out;
}
/** the whole days the old process took off the days attended to give E: the P with base × (attended - P) ÷ scheduled × final % = E, or null */
function penaltyDays(o) {
  const { E, F, ks, ka } = o || {}, B = (o && o.base) ?? 1000;
  if (!(ks > 0) || !(ka > 0) || F == null || E == null) return null;
  if (Math.abs(B * ka / ks * F - E) < 0.5) return null;   // nothing was taken off
  for (let P = 1; P <= ka; P++) if (Math.abs(B * (ka - P) / ks * F - E) < 0.5) return P;
  return null;
}
/** runs of absent days in a month of days (as the rules count them: days off between them do not break a run) */
const runs = days => K.countDays(days || []).runs;
const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
/** a penalty in words, as the rules drawer says it */
function ruleText(p) {
  const bits = [];
  if (p.absentExtra) bits.push(`${plural(p.absentExtra, 'more day')} off per ${p.absentPer === 'run' ? 'run of absent days' : 'absent day'}`);
  if (p.absentFlat) bits.push(`${plural(p.absentFlat, 'day')} off once when there is any absence`);
  if (p.countedMin) bits.push(`never below ${plural(p.countedMin, 'counted day')}`);
  return bits.join(', ') || 'none';
}
/**
 * The absence penalties the rules can say (more days off per absent day or per run of absent days, days off once when there is any
 * absence, never below a number of counted days) that give every case its old earned SR. cases: [{absent, runs, ka (attended), ks, F,
 * base, E}]; cfg: the month's other rules. -> { fits: [{params, nParams, text}], least (the fewest settings that fit), decided, one, two, three }.
 * Only fits where every setting matters are kept. With as many cases as settings any rule fits, so that is never 'decided'.
 */
function fitAbsence(cases, cfg) {
  const base = K.normCount(cfg), L = (cases || []).filter(c => c && c.ks > 0 && c.ka != null && c.F != null && c.E != null);
  if (!L.length) return { fits: [], least: null, decided: false, one: [], two: [], three: [], cases: 0 };
  const top = Math.min(31, Math.max(12, ...L.map(c => c.ka))), minTop = Math.min(10, Math.min(...L.map(c => c.ka)));
  const all = p => L.every(c => earnedOf({ base: c.base, sched: c.ks, attended: c.ka, absent: c.absent, runs: c.runs, fin: c.F }, { ...base, ...p }) === c.E);
  const fits = [];
  for (const per of ['day', 'run']) for (let k = 0; k <= top; k++) for (let flat = 0; flat <= top; flat++) for (let min = 0; min <= minTop; min++) {
    if (!k && !flat) continue;
    if (!k && per === 'run') continue;   // without days per absence, per day and per run are the same rule
    const p = { absentExtra: k, absentPer: per, absentFlat: flat, countedMin: min };
    if (!all(p)) continue;
    const needed = (!k || !all({ ...p, absentExtra: 0, absentPer: 'day' })) && (!flat || !all({ ...p, absentFlat: 0 })) && (!min || !all({ ...p, countedMin: 0 }));
    if (needed) fits.push({ params: p, nParams: (k ? 1 : 0) + (flat ? 1 : 0) + (min ? 1 : 0), text: ruleText(p) });
  }
  fits.sort((a, b) => a.nParams - b.nParams || (a.params.absentPer === 'day' ? 0 : 1) - (b.params.absentPer === 'day' ? 0 : 1) || a.params.absentExtra - b.params.absentExtra);
  const by = n => fits.filter(f => f.nParams === n), least = [1, 2, 3].find(n => by(n).length) ?? null;
  return { fits, least, decided: least != null && by(least).length === 1 && L.length > least, one: by(1), two: by(2), three: by(3), cases: L.length };
}

// ---------------------------------------------------------------- one person: why the old Excel and the tool differ
/** the decimals a column of old Final % values has (2 when they are whole percentages) */
function finalPrecision(values) {
  let dp = 2;
  for (const v of values) { if (v == null || !Number.isFinite(v)) continue; let d = 2; while (d < 6 && Math.abs(v * Math.pow(10, d) - Math.round(v * Math.pow(10, d))) > 1e-6) d++; dp = Math.max(dp, d); }
  return dp;
}
const sameAt = (a, b, dp) => Math.round(a * Math.pow(10, dp) + 1e-7) === Math.round(b * Math.pow(10, dp) + 1e-7);
const TOL = { pct: 0.0005, int: 0.5, sec: 0.5 };
/** one person's measures, old against the tool: [{m, old, tool, d}] for a difference and [{m, old, tool: null, missing: true}] when the tool
    has no value (never 'the same'). Final % is compared at the old file's decimals (dp). */
function cellsOf(oldV, toolV, list, dp = 2) {
  const out = [];
  for (const m of list) {
    const a = oldV[m], b = toolV[m]; if (a == null) continue;
    if (b == null) { out.push({ m, old: a, tool: null, missing: true }); continue; }
    const same = m === 'fin' ? sameAt(a, b, dp) : Math.abs(b - a) < TOL[meas(m).t];
    out.push(same ? { m, old: a, tool: b, same: true } : { m, old: a, tool: b, d: b - a });
  }
  return out;
}
/** 'diff' when a measure differs, 'noTool' when the tool has no value for one (and none differs), 'same' when every measure agrees */
const statusOf = cells => (cells.some(c => c.d != null) ? 'diff' : cells.some(c => c.missing) ? 'noTool' : cells.length ? 'same' : 'none');
/**
 * o: the old numbers for one person {fin, earned, ks, ka, issues (cells typed with spaces)}; t: the tool's {fin, earned, ks, ka (days
 * attended), absent, runs, base, card (false: the team has no scorecard), team, scored (false: a month from an incentive file), missing
 * (KPIs with no value), valDp (the rounding of percent KPIs that gives the old Final %)}; ctx: {cfg (the month's rules), dp}.
 * -> { causes: [{kind, ...}], ref: the earned SR the tool gives with the old Final % }. Causes in order: noCard, noTool, days, fin, then
 * for the earned SR: absence (whole days taken off), base (an own base), rounding (1 SR), other.
 */
function explain(o, t, ctx = {}) {
  const cfg = K.normCount(ctx.cfg), dp = ctx.dp ?? 2, out = [], has = m => o[m] != null;
  if (t.card === false && (has('fin') || has('earned'))) out.push({ kind: 'noCard', team: t.team || '' });
  const noF = has('fin') && t.fin == null, noE = has('earned') && t.earned == null;
  if ((noF || noE) && t.card !== false) out.push({ kind: 'noTool', fin: noF, earned: noE, why: t.scored === false ? 'incentive' : (t.missing || []).length ? 'kpi' : 'none' });
  const daysDiff = o.ks != null && t.ks != null && (o.ks !== t.ks || (o.ka != null && t.ka != null && o.ka !== t.ka));
  if (daysDiff) out.push({ kind: 'days', old: { ks: o.ks, ka: o.ka }, tool: { ks: t.ks, ka: t.ka }, issues: o.issues || 0 });
  if (has('fin') && t.fin != null && !sameAt(o.fin, t.fin, dp)) out.push({ kind: 'fin', old: o.fin, tool: t.fin, missing: t.missing || [], valDp: t.valDp ?? null });
  let ref = null;
  if (has('earned') && has('fin') && t.ks > 0 && t.ka != null) {
    ref = earnedOf({ base: t.base, sched: t.ks, attended: t.ka, absent: t.absent, runs: t.runs, fin: o.fin }, cfg);
    const old = daysDiff && o.ks > 0 && o.ka != null ? earnedOf({ base: t.base, sched: o.ks, attended: o.ka, absent: t.absent, runs: t.runs, fin: o.fin }, cfg) : null;
    if (ref != null && Math.abs(o.earned - ref) >= 0.5 && !(old != null && Math.abs(o.earned - old) < 0.5)) {
      let done = false;
      if (t.absent > 0) { const P = penaltyDays({ E: o.earned, F: o.fin, ks: t.ks, ka: t.ka, base: t.base }); if (P) { out.push({ kind: 'absence', P, absent: t.absent, runs: t.runs, ref }); done = true; } }
      if (!done) { const b = inferBase({ E: o.earned, F: o.fin, ks: t.ks, ka: t.ka }); if (b && b.ints.length && !b.ints.includes(t.base)) { out.push({ kind: 'base', ...b, ref, toolBase: t.base }); done = true; } }
      if (!done) out.push(Math.abs(o.earned - ref) <= 1 ? { kind: 'rounding', ref } : { kind: 'other', ref });
    }
  }
  return { causes: out, ref };
}

// ---------------------------------------------------------------- the incentive workbook's own data-entry problems
/** from History.read rows: day cells typed with spaces that Excel did not count, people split in two rows, a typed Adherence value,
    IDs that are not numbers */
function entryProblems(rows) {
  const spaces = [], split = [], typed = [], badId = [];
  for (const r of rows || []) {
    if (r.codeIssues && r.codeIssues.length) spaces.push({ n: r.n, id: r.id || '', cells: r.codeIssues.length, raws: [...new Set(r.codeIssues.map(x => x.raw))], days: r.codeIssues.map(x => x.day), old: r.xl || null, tool: { ks: r.ks, ka: r.kat ?? r.ka } });
    if (r.split) split.push({ n: r.n, other: r.split, badId: r.badId || '' });
    if (r.adhDt != null && r.adh != null) typed.push({ n: r.n, id: r.id || '', adh: r.adh, daily: r.adhDt });
    if (r.badId && !r.id) badId.push({ n: r.n, badId: r.badId });
  }
  return { spaces, split, typed, badId, cells: spaces.reduce((a, x) => a + x.cells, 0), counted: spaces.filter(x => x.old && x.old.ks != null && x.old.ks !== x.tool.ks).length };
}

return { MEAS, meas, val, readTable, titleMonth, nameMonth, datesMonth, monthOf, classify, KIND, dedLayout, dedCheck, dedRule, earnedOf, finRange, inferBase, pickBases,
  penaltyDays, runs, ruleText, fitAbsence, finalPrecision, sameAt, cellsOf, statusOf, explain, entryProblems, ymKey };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Kpi !== 'undefined' ? Kpi : require('./kpi.js'), typeof History !== 'undefined' ? History : require('./history.js'));
if (typeof module !== 'undefined') module.exports = Recon;
