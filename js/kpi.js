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

/** rank 1-5 for one value; null when there is no value */
function rank(k, v) {
  if (v == null || !Number.isFinite(v)) return null;
  const b = k.bands, levels = [5, 4, 3, 2];
  for (let i = 0; i < 4; i++) {
    const t = b[i]; if (t == null || t === '') continue;
    if (k.dir === 'low' ? v <= t + 1e-9 : v >= t - 1e-9) return levels[i];
  }
  return 1;
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
  if (k.unit === 'pct') return (v * 100).toFixed(v * 100 % 1 ? 2 : 0) + '%';
  if (k.unit === 'sec') return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
};
const bandText = k => {
  const f = v => (k.unit === 'pct' ? `${+(Math.floor(v * 100000) / 1000).toFixed(3)}%` : `${Math.floor(+v * 1000) / 1000}`);
  const b = k.bands, out = [];
  for (let i = 0; i < 4; i++) if (b[i] != null && b[i] !== '') out.push(`${5 - i}: ${k.dir === 'low' ? '≤' : '≥'} ${f(b[i])}`);
  out.push('1: otherwise'); return out.join(' · ');
};
const target = k => (k.bands[0] == null ? '' : (k.dir === 'low' ? '≤ ' : '≥ ') + (k.unit === 'pct' ? `${+(k.bands[0] * 100).toFixed(2)}%` : `${+(+k.bands[0]).toFixed(2)}`));

/** score one person. vals: {adh, adhUnder, aht, tardy, file: {kpiId: value}} ; att: {sched, actual} */
function score(card, vals, att, base) {
  const rows = card.kpis.map(k => {
    const v = k.src === 'file' ? (vals.file ? vals.file[k.id] ?? null : null) : (vals[k.src] ?? null);
    return { k, v, r: rank(k, v), w: +k.weight || 0 };
  });
  const have = rows.filter(x => x.r != null), wSum = rows.reduce((a, x) => a + x.w, 0), wHave = have.reduce((a, x) => a + x.w, 0);
  const missing = rows.filter(x => x.r == null).map(x => x.k.name);
  // missing KPIs: the final rank uses the KPIs that have a value, scaled to their weights
  const fr = wHave > 0 ? have.reduce((a, x) => a + x.r * x.w, 0) / wHave : null;
  const finalRank = fr == null ? null : Math.round(fr * 100) / 100;
  const finalPct = finalRank == null ? null : finalRank / 5;
  const sched = att ? att.sched : null, actual = att ? att.actual : null;
  const daysPct = sched ? actual / sched : null;
  const tgt = daysPct == null ? null : Math.round((base ?? 1000) * daysPct);
  // earned = base x actual-days % x final %, rounded (22 sched / 18 actual at 87% -> 712)
  const earned = daysPct == null || finalPct == null ? null : Math.round((base ?? 1000) * daysPct * finalPct + 1e-9);
  return { rows, finalRank, finalPct, sched, actual, daysPct, target: tgt, earned, missing, complete: !missing.length, weightsOk: Math.abs(wSum - 1) < 0.001 };
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
return { DEFAULTS: () => clone(DEFAULTS), SRC, rank, score, normValue, fmtVal, bandText, target, readFile, fileValue, key, validate };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Kpi;
