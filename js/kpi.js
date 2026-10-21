/* KPI scorecards: rank each KPI 1-5 from its bands, weight them, and turn the final % into the incentive. Pure functions. */
'use strict';
const Kpi = ((C) => {
const { normSpace, normName } = C;
// src: where the value comes from. adh = monthly adherence (Genesys), adhUnder = days under the adherence target,
// aht = AHT seconds (Genesys), tardy = tardy minutes (attendance), file = a column in the KPI file.
// unit: pct (0-1), sec, min, days. dir: high = higher is better (bands are minimums), low = lower is better (bands are maximums).
// bands: [rank5, rank4, rank3, rank2] thresholds; null = that rank is not used ("NIL"/"n/a"). Anything outside rank 2 (or 3) = 1.
const K = (id, name, src, unit, dir, weight, bands, aliases = []) => ({ id, name, src, unit, dir, weight, bands, aliases });
const PCT4 = [0.95, 0.90, 0.85, 0.80];
const DEFAULTS = {
  base: 1000,
  teams: {
    CC: { title: 'Member Care Champion', kpis: [
      K('csat', 'DRC-CSAT', 'file', 'pct', 'high', 0.25, [0.85, 0.80, 0.60, null], ['drc csat', 'csat', 'drccsat']),
      K('qobs', 'Quality Observations', 'file', 'pct', 'high', 0.25, PCT4, ['quality', 'quality observation', 'quality obs']),
      K('aht', 'AHT', 'aht', 'sec', 'low', 0.05, [150, 159.99, 170, null], ['average handling time', 'aht']),
      K('emp', 'Empowerment Utilization', 'file', 'pct', 'high', 0.15, PCT4, ['empowerment', 'empowerment utilisation']),
      K('fcr', 'Call Reason & FCR Accuracy', 'file', 'pct', 'high', 0.10, PCT4, ['call reason fcr accuracy', 'fcr accuracy', 'call reason', 'fcr']),
      K('adh', 'Adherence', 'adh', 'pct', 'high', 0.10, PCT4, ['adherance']),
      K('tardy', 'Tardiness', 'tardy', 'min', 'low', 0.10, [4, 10, 15, 20], ['tardy']),
    ] },
    SM: { title: 'Member Care Social Media', kpis: [
      K('qobs', 'Quality Observations', 'file', 'pct', 'high', 0.20, PCT4, ['quality', 'quality observation']),
      K('emp', 'Empowerment Utilization', 'file', 'pct', 'high', 0.10, PCT4, ['empowerment']),
      K('fcr', 'Call Reason & FCR Accuracy', 'file', 'pct', 'high', 0.15, PCT4, ['call reason fcr accuracy', 'fcr accuracy', 'fcr']),
      K('adh', 'Adherence', 'adh', 'pct', 'high', 0.20, PCT4, ['adherance']),
      K('aht', 'SM AHT', 'aht', 'sec', 'low', 0.25, [180, 239.99, 359.99, 479.99], ['sm average handling time', 'aht']),
      K('tardy', 'Tardiness', 'tardy', 'min', 'low', 0.10, [9, 14, 20, 29], ['tardy']),
    ] },
    CT: { title: 'Member Care Complaint Team Champion', kpis: [
      K('csat', 'DRC-CSAT', 'file', 'pct', 'high', 0.25, [0.85, 0.80, 0.60, null], ['drc csat', 'csat']),
      K('qow', 'Quality of Work', 'file', 'pct', 'high', 0.25, [0.98, 0.95, 0.90, null], ['quality', 'quality of work']),
      K('qa', 'QA Evaluation', 'file', 'pct', 'high', 0.20, PCT4, ['qa evaluation', 'qa']),
      K('util', 'Utilization', 'file', 'pct', 'high', 0.20, PCT4, ['utilisation']),
      K('adhd', 'Adherence (days under 95%)', 'adhUnder', 'days', 'low', 0.10, [2, 4, 6, null], []),
    ] },
    QA: { title: 'Member Care Quality Specialist', kpis: [
      K('csat', 'DRC-CSAT', 'file', 'pct', 'high', 0.25, [0.85, 0.80, 0.60, null], ['drc csat', 'csat']),
      K('fqos', 'Floor Quality of Service / Empowerment', 'file', 'pct', 'high', 0.25, PCT4, ['floor quality of service', 'floor quality', 'empowerment']),
      K('aht', 'AHT', 'aht', 'sec', 'low', 0.10, [150, 160, 170, 180], ['average handling time']),
      K('qow', 'Quality of Work', 'file', 'pct', 'high', 0.20, [0.98, 0.95, 0.90, null], ['quality', 'quality of work']),
      K('dev', 'Agent Development', 'file', 'pct', 'high', 0.20, PCT4, ['agent development', 'development']),
    ] },
    WF: { title: 'Member Care Support WF Specialist', kpis: [
      K('sl', 'Service Level', 'file', 'pct', 'high', 0.30, [0.85, 0.80, 0.75, 0.70], ['service level']),
      K('radh', 'Resources Adherence', 'file', 'pct', 'high', 0.25, PCT4, ['resources adherence', 'resource adherence', 'resources adherance']),
      K('qow', 'Quality of Work', 'file', 'pct', 'high', 0.40, PCT4, ['quality', 'quality of work']),   // the WF card ranks 95% as 5
      K('adhd', 'Adherence (days under 95%)', 'adhUnder', 'days', 'low', 0.05, [2, 4, 6, null], []),
    ] },
  },
};
const SRC = { adh: 'Adherence from Genesys', adhUnder: 'Days under the adherence target (Genesys)', aht: 'AHT from Genesys (seconds)', tardy: 'Tardy minutes from the attendance', file: 'KPI file column' };
const clone = o => JSON.parse(JSON.stringify(o));

/** rank 1-5 for one value; null when there is no value. edge 'out': a value exactly on a band edge does not reach it */
function rank(k, v, edge) {
  if (v == null || !Number.isFinite(v)) return null;
  const b = k.bands, levels = [5, 4, 3, 2], out = edge === 'out';
  for (let i = 0; i < 4; i++) {
    const t = b[i]; if (t == null || t === '') continue;
    if (out ? (k.dir === 'low' ? v < t - 1e-9 : v > t + 1e-9) : (k.dir === 'low' ? v <= t + 1e-9 : v >= t - 1e-9)) return levels[i];
  }
  return 1;
}

// ---------------------------------------------------------------- how it is counted: one section of every set of rules
// The day codes that can make a scheduled day (besides Attend and late days), with the incentive workbook's column header and
// COUNTIF criterion. The first eight are the tool's own columns, in their order; the other leaves count only when the rules tick them.
const DC = (code, head, crit, test) => ({ code, head, crit, test });
const same = code => v => normName(v) === normName(code);
const DAY_CODES = [
  DC('AL', 'AL leave', 'AL', v => v === 'AL'), DC('SL', 'SL leaves', 'SL', v => v === 'SL'), DC('National Day', 'National Day', 'National Day*', v => /^national day/i.test(v)),
  DC('Compassionate Leave', 'Compassionate Leave', 'Compassionate*', v => /^compassionate/i.test(v)), DC('Eid', 'EID', 'Eid', v => /^eid$/i.test(v)), DC('ML', 'ML', 'ML', v => v === 'ML'),
  DC('Unpaid', 'Unpaid', 'Unpaid', v => v === 'Unpaid'), DC('Absent', 'Absent', 'Absent', v => v === 'Absent'),
];
const MORE_CODES = [DC('Founding Day', 'Founding Day', 'Founding Day', same('Founding Day')), DC('Paternity', 'Paternity leave', 'Paternity', same('Paternity')),
  DC('Marriage', 'Marriage leave', 'Marriage', same('Marriage')), DC('Exam', 'Exam', 'Exam', same('Exam')), DC('Other leave', 'Other leave', 'Other leave', same('Other leave'))];
/** every code the rules can count as a scheduled day, in the workbook's column order */
const CODES = [...DAY_CODES, ...MORE_CODES].map(d => d.code);
/** a code's entry: the tool's own, a known leave, or any other leave counted by its name (the workbook column takes its name) */
const dayCode = code => DAY_CODES.find(d => d.code === code) || MORE_CODES.find(d => d.code === code) || DC(code, code, code, same(code));
// the defaults count as the tool always did, except that percent KPIs and the final % are rounded to a whole % (94.99% → 95%), as the
// old incentive files did. The days % is never rounded: the old files pay with the exact days. cv: 2 marks a section saved since then.
const CV = 2;
const COUNT0 = { sched: DAY_CODES.map(d => d.code), lateOver: 0, absentExtra: 0, absentPer: 'day', absentFlat: 0, countedMin: 0, eligDays: 'attended', missing: 'scale', edge: 'in',
  rankDp: 2, valDp: 0, pctOf: 'rank5', pctTable: [], pctDp: 2, daysPct: 'ratio', money: 'round', attitude: 'attitude|abuse|hr action', cv: CV };
const NORMED = new WeakSet();   // sections already made whole (they are never changed: an edit makes a new one)
/** a saved 'count' section made whole and safe: anything missing or out of range takes the default */
function normCount(c) {
  if (c && NORMED.has(c)) return c;
  const o = c && typeof c === 'object' ? c : {}, D = COUNT0;
  const num = (v, lo, hi, def) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? +v : NaN; return Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : def; };
  const one = (v, list, def) => (list.includes(v) ? v : def);
  const sched = Array.isArray(o.sched) ? [...new Set(o.sched.filter(x => typeof x === 'string').map(x => normSpace(x)).filter(x => x && !/^(attend|off)$/i.test(x)))] : D.sched.slice();
  sched.sort((a, b) => (CODES.indexOf(a) + 1 || 99) - (CODES.indexOf(b) + 1 || 99));
  const pctTable = (Array.isArray(o.pctTable) ? o.pctTable : []).map(x => ({ min: x && Number.isFinite(+x.min) ? Math.min(5, Math.max(0, +x.min)) : NaN, pct: x && Number.isFinite(+x.pct) ? Math.min(2, Math.max(0, +x.pct)) : NaN }))
    .filter(x => Number.isFinite(x.min) && Number.isFinite(x.pct)).sort((a, b) => b.min - a.min);
  let attitude = typeof o.attitude === 'string' ? o.attitude.trim() : D.attitude;
  try { new RegExp(attitude, 'i'); } catch (e) { attitude = D.attitude; }
  const n = { sched, lateOver: num(o.lateOver, 0, 1440, 0), absentExtra: num(o.absentExtra, 0, 31, 0), absentPer: one(o.absentPer, ['day', 'run'], 'day'), absentFlat: num(o.absentFlat, 0, 31, 0),
    countedMin: num(o.countedMin, 0, 31, 0), eligDays: one(o.eligDays, ['attended', 'counted'], 'attended'), missing: one(o.missing, ['scale', 'rank1', 'none'], 'scale'), edge: one(o.edge, ['in', 'out'], 'in'),
    rankDp: num(o.rankDp, -1, 4, 2), valDp: num(o.valDp, -1, 4, 0), pctOf: one(o.pctOf, ['rank5', 'table'], 'rank5'), pctTable, pctDp: num(o.pctDp, -1, 6, 2),
    daysPct: one(o.daysPct, ['ratio', 'full'], 'ratio'), money: one(o.money, ['round', 'floor', 'ceil'], 'round'), attitude, cv: CV };
  NORMED.add(n); return n;
}
/** a 'count' section as it was saved. One saved before the rounding defaults (no cv) had 'not rounded' as its default, so 'not
    rounded' there takes today's default; anything saved since stays as it is */
function fromSaved(c) {
  if (!c || typeof c !== 'object' || +c.cv >= CV) return c;
  return { ...c, cv: CV, ...(+c.valDp === -1 ? { valDp: COUNT0.valDp } : {}), ...(+c.pctDp === -1 ? { pctDp: COUNT0.pctDp } : {}) };
}
/** the fields of a 'count' section that differ from the defaults ({} when it counts with the defaults) */
function countDiff(cfg) { const c = normCount(cfg), out = {}; for (const f of Object.keys(COUNT0)) if (JSON.stringify(c[f]) !== JSON.stringify(COUNT0[f])) out[f] = c[f]; return out; }
/** which days count (the codes and the late limit): rows counted with other day rules are counted again */
const dayRulesKey = cfg => { const c = normCount(cfg); return JSON.stringify([c.sched, c.lateOver]); };
/** days taken off for absence, and the days that count for the incentive (never above the days attended, never below 0) */
function penalty(attended, absent, runs, cfg) {
  const c = normCount(cfg), extra = c.absentExtra * (c.absentPer === 'run' ? runs || 0 : absent || 0) + (absent > 0 ? c.absentFlat : 0);
  if (!extra || attended == null) return { extra: 0, counted: attended };
  return { extra, counted: Math.max(0, Math.min(attended, Math.max(c.countedMin, attended - extra))) };
}
/**
 * One person's month of days: day codes, late minutes (numbers), 'Attend', 'OFF', or blank.
 * attended = Attend + late days (a day late by more than lateOver minutes counts as Absent; its minutes still count as tardy);
 * sched = attended + every day whose code is in cfg.sched; runs = runs of Absent days (OFF and blank days do not break a run);
 * counted = attended less the absence penalty. With the defaults this is exactly the count of the incentive workbook.
 */
function countDays(days, cfg) {
  const c = normCount(cfg), tests = c.sched.map(dayCode);
  const byCode = {}, other = {}; c.sched.forEach(x => { byCode[x] = 0; });
  let attended = 0, attend = 0, late = 0, lateAbs = 0, tardy = 0, absent = 0, sched = 0, off = 0, runs = 0, inRun = false;
  for (const d of days || []) {
    let v = d;
    if (v == null || v === '') continue;
    if (typeof v === 'number') {
      if (v > 0) tardy += v;
      if (!(c.lateOver > 0 && v > c.lateOver)) { attended++; sched++; if (v > 0) late++; else attend++; inRun = false; continue; }
      lateAbs++; v = 'Absent';
    }
    if (v === 'Attend') { attended++; attend++; sched++; inRun = false; continue; }
    v = String(v);
    if (v === 'OFF') { off++; continue; }
    if (v === 'Absent') { absent++; if (!inRun) runs++; inRun = true; } else inRun = false;
    const j = tests.findIndex(t => t.test(v));
    if (j >= 0) { byCode[c.sched[j]]++; sched++; } else other[v] = (other[v] || 0) + 1;
  }
  const p = penalty(attended, absent, runs, c);
  return { byCode, other, attended, attend, late, lateAbs, tardy, absent, runs, sched, off, extra: p.extra, counted: p.counted };
}
const bandVal = (k, v) => (k.unit === 'pct' ? `${+(Math.floor(v * 100000) / 1000).toFixed(3)}%` : `${Math.floor(+v * 1000) / 1000}`);
/** the band a rank was given for, in words: '≥ 90%', '≤ 4', or below the last band */
function bandOf(k, r, edge) {
  if (r == null) return '';
  const out = edge === 'out', lo = k.dir === 'low', b = k.bands || [];
  if (r >= 2) { const t = b[5 - r]; return t == null || t === '' ? '' : `${lo ? (out ? '<' : '≤') : (out ? '>' : '≥')} ${bandVal(k, t)}`; }
  const used = b.filter(t => t != null && t !== ''), t = used[used.length - 1];
  return t == null ? 'no bands' : `${lo ? (out ? '≥' : '>') : (out ? '≤' : '<')} ${bandVal(k, t)}`;
}
/** turn a raw file value into the KPI's unit: percentages may come as 0.89, 89, "89%" or a 1-5 score (CSAT) */
function normValue(k, raw) {
  if (raw == null || raw === '') return null;
  let s = raw, pctSign = false;
  if (typeof s === 'string') { s = normSpace(s); pctSign = /%$/.test(s); s = s.replace(/[%,\s]/g, ''); if (!s || !Number.isFinite(+s)) return null; s = +s; }
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  if (k.unit === 'pct') {
    if (pctSign) return s / 100;
    if (k.id === 'csat' && s > 1 && s <= 5) return s / 5;      // a 1-5 satisfaction score
    if (s > 1.5) return s / 100;                                   // 89 -> 0.89
    return s;
  }
  return s;
}
const fmtVal = (k, v) => {
  if (v == null) return '–';
  if (k.unit === 'pct') { const p = Math.round(v * 10000) / 100; return p.toFixed(Number.isInteger(p) ? 0 : 2) + '%'; }   // 0.57 reads 57%, not 57.00%
  if (k.unit === 'sec') return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
};
const bandText = k => {
  const f = v => bandVal(k, v);
  const b = k.bands, out = [];
  for (let i = 0; i < 4; i++) if (b[i] != null && b[i] !== '') out.push(`${5 - i}: ${k.dir === 'low' ? '≤' : '≥'} ${f(b[i])}`);
  out.push('1: otherwise'); return out.join(' · ');
};
const target = k => (k.bands[0] == null ? '' : (k.dir === 'low' ? '≤ ' : '≥ ') + (k.unit === 'pct' ? `${+(k.bands[0] * 100).toFixed(2)}%` : `${+(+k.bands[0]).toFixed(2)}`));

const roundTo = (x, dp) => { const f = Math.pow(10, dp); return Math.round(x * f) / f; };
/** rounded half up as Excel shows it, on the 15 digits it keeps: 28.5% is 29%, though 0.285 × 100 is 28.499999999999996 */
const roundXl = (x, dp) => { const f = Math.pow(10, dp); return Math.round(+(x * f).toPrecision(15)) / f; };
/** the value a KPI was ranked with: rounded when the rules round percent KPIs */
const rankedVal = x => (x.vr !== undefined ? x.vr : x.v);
/**
 * score one person. vals: {adh, adhUnder, aht, tardy, file: {kpiId: value}} ; att: {sched, attended (or actual), absent, runs} ;
 * cfg: the month's 'count' rules (the defaults when left out). actual = the days counted (attended less any absence penalty),
 * worked out here only, so a penalty is never taken twice. how = every step, for "How this was counted".
 */
function score(card, vals, att, base, cfg) {
  const c = normCount(cfg);
  const rows = card.kpis.map(k => {
    const v = k.src === 'file' ? (vals.file ? vals.file[k.id] ?? null : null) : (vals[k.src] ?? null);
    const vr = c.valDp >= 0 && k.unit === 'pct' && v != null && Number.isFinite(v) ? roundXl(v * 100, c.valDp) / 100 : v;
    return vr === v ? { k, v, r: rank(k, v, c.edge), w: +k.weight || 0 } : { k, v, vr, r: rank(k, vr, c.edge), w: +k.weight || 0 };
  });
  const have = rows.filter(x => x.r != null), wSum = rows.reduce((a, x) => a + x.w, 0), wHave = have.reduce((a, x) => a + x.w, 0);
  const missing = rows.filter(x => x.r == null).map(x => x.k.name);
  // missing KPIs: the final rank uses the KPIs that have a value, scaled to their weights (or ranks them 1, or waits for them)
  const fr = c.missing === 'none' && missing.length ? null
    : c.missing === 'rank1' && missing.length ? (have.length && wSum > 0 ? rows.reduce((a, x) => a + (x.r ?? 1) * x.w, 0) / wSum : null)
    : wHave > 0 ? have.reduce((a, x) => a + x.r * x.w, 0) / wHave : null;
  const finalRank = fr == null ? null : c.rankDp >= 0 ? roundTo(fr, c.rankDp) : fr;
  let finalPct = finalRank == null ? null : finalRank / 5, tRow = null;
  if (finalRank != null && c.pctOf === 'table' && c.pctTable.length) { tRow = c.pctTable.find(x => finalRank >= x.min - 1e-9) || null; finalPct = tRow ? tRow.pct : 0; }
  if (finalPct != null && c.pctDp >= 0) finalPct = roundXl(finalPct, c.pctDp);
  const sched = att ? att.sched : null, attended = att ? (att.attended !== undefined ? att.attended : att.actual) : null;
  const absent = att && att.absent != null ? +att.absent || 0 : 0, runs = att && att.runs != null ? +att.runs || 0 : absent > 0 ? 1 : 0;
  const pen = penalty(attended, absent, runs, c), actual = pen.counted;
  const daysPct = sched ? (c.daysPct === 'full' ? 1 : actual / sched) : null;
  const B = base ?? 1000, M = c.money === 'floor' ? x => Math.floor(x + 1e-9) : c.money === 'ceil' ? x => Math.ceil(x - 1e-9) : null;
  const tgt = daysPct == null ? null : M ? M(B * daysPct) : Math.round(B * daysPct);
  // earned = base x actual-days % x final %, rounded (22 sched / 18 actual at 87% -> 712)
  const earned = daysPct == null || finalPct == null ? null : M ? M(B * daysPct * finalPct) : Math.round(B * daysPct * finalPct + 1e-9);
  // every step in short keys (kept on the month's rows as kx, without the KPIs, which the rows carry already)
  const how = { rr: fr, ws: wHave, wt: wSum, mm: c.missing, rd: c.rankDp, fr: finalRank, po: c.pctOf, tr: tRow ? { min: tRow.min, pct: tRow.pct } : null, pd: c.pctDp, fp: finalPct, vd: c.valDp, ed: c.edge,
    s: sched, a: attended, ab: absent, ru: runs, ex: pen.extra, pen: pen.extra ? { k: c.absentExtra, per: c.absentPer, flat: c.absentFlat, min: c.countedMin } : null, c: actual,
    df: c.daysPct, dp: daysPct, b: B, mo: c.money, t: tgt, e: earned,
    kpis: rows.map(x => ({ id: x.k.id, name: x.k.name, v: x.v, ...(x.vr !== undefined ? { vr: x.vr } : {}), band: bandOf(x.k, x.r, c.edge), r: x.r, w: x.w })) };
  return { rows, finalRank, finalPct, sched, actual, daysPct, target: tgt, earned, missing, complete: !missing.length, weightsOk: Math.abs(wSum - 1) < 0.001,
    attended, absent, runs, extra: pen.extra, how };
}

/** KPI file: any sheet with an ID or Name column plus KPI columns. Returns {rows:[{id, name, cols:{normHeader: raw}}], headers} */
function readFile(sheets, cards) {
  const known = new Set();
  for (const c of Object.values(cards.teams)) for (const k of c.kpis) if (k.src === 'file') [k.name, ...(k.aliases || [])].forEach(a => known.add(key(a)));
  const out = { rows: [], headers: new Set(), sheets: [] };
  for (const S of sheets) {
    const hi = S.rows.findIndex(r => r && r.some(v => /^(id|national id|name|agent name|employee name)$/i.test(normSpace(v))) && r.some(v => known.has(key(v))));
    if (hi < 0) continue;
    const H = S.rows[hi].map(v => normSpace(v));
    const idI = H.findIndex(v => /^(id|national id|nid)$/i.test(v)), nI = H.findIndex(v => /^(name|agent name|employee name|member care champions)$/i.test(v));
    const cols = H.map((h, i) => (known.has(key(h)) ? [key(h), i] : null)).filter(Boolean);
    cols.forEach(([h]) => out.headers.add(h));
    let n = 0;
    for (const r of S.rows.slice(hi + 1)) {
      if (!r) continue; const name = nI >= 0 ? normSpace(r[nI]) : '', id = idI >= 0 ? C.cleanId(r[idI]) : '';
      if (!name && !id) continue;
      const c = {}; for (const [h, i] of cols) if (r[i] != null && r[i] !== '') c[h] = r[i];
      if (!Object.keys(c).length) continue;
      out.rows.push({ id, name, cols: c, sheet: S.name }); n++;
    }
    out.sheets.push({ name: S.name, rows: n, cols: cols.map(c => H[c[1]]) });
  }
  out.headers = [...out.headers];
  return out;
}
const key = s => normName(String(s ?? '').replace(/&/g, ' ').replace(/[^\p{L}\p{N}%]+/gu, ' '));
/** the file value for one KPI of one person's card */
function fileValue(k, cols) {
  if (!cols) return null;
  for (const a of [k.name, ...(k.aliases || [])]) { const h = key(a); if (cols[h] != null) return normValue(k, cols[h]); }
  return null;
}
function validate(cards) {
  const issues = [];
  for (const [t, c] of Object.entries(cards.teams)) {
    const w = c.kpis.reduce((a, k) => a + (+k.weight || 0), 0);
    if (Math.abs(w - 1) > 0.001) issues.push(`${t}: weights add up to ${Math.round(w * 1000) / 10}%, not 100%`);
    for (const k of c.kpis) {
      const b = k.bands.filter(x => x != null && x !== '');
      for (let i = 1; i < b.length; i++) if (k.dir === 'low' ? b[i] < b[i - 1] : b[i] > b[i - 1]) { issues.push(`${t} · ${k.name}: the bands are out of order`); break; }
    }
  }
  return issues;
}
return { DEFAULTS: () => clone(DEFAULTS), SRC, rank, score, normValue, fmtVal, rankedVal, bandText, target, readFile, fileValue, key, validate,
  COUNT0: () => clone(COUNT0), normCount, fromSaved, countDiff, countDays, penalty, dayRulesKey, DAY_CODES, CODES, dayCode, bandOf, bandVal };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Kpi;
