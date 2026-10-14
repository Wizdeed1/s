/* Incentive history: reads the monthly "MC_all_team_incentive _data" workbooks (any month, old or new layout) into one row per person. */
'use strict';
const History = ((C, A) => {
const { normSpace, normName } = C;
const isIncentive = names => names.some(n => /^attendance report$/i.test(normSpace(n))) && names.some(n => /^aht$/i.test(normSpace(n)));
const ukey = (id, name) => (/^\d{6,}$/.test(String(id || '')) ? String(id) : 'N:' + normName(name));
const strip = s => normSpace(String(s ?? '').replace(/^[⛔⚠]️?\s*/, ''));
const idOf = v => { if (v == null || v === '') return ''; if (typeof v === 'number') return String(Math.round(v)); const id = C.cleanId(v); return id && String(v).replace(/\D/g, '') === id ? id : normSpace(v); };
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : (v != null && v !== '' && Number.isFinite(+v) ? +v : null));
// one letter per day: A attend, O off, L annual leave, S sick leave, X absent, V other leave, - blank
const STD_DAY = new Set(['Attend', 'OFF', 'AL', 'SL', 'Absent']);
const DAY = v => (v == null ? '-' : typeof v === 'number' ? 'A' : v === 'Attend' ? 'A' : v === 'OFF' ? 'O' : v === 'AL' ? 'L' : v === 'SL' ? 'S' : v === 'Absent' ? 'X' : 'V');
const DAY_NAME = { A: 'Attend', O: 'OFF', L: 'AL', S: 'SL', X: 'Absent', V: 'Other leave', '-': 'blank' };

function headRow(S) { return S.rows.findIndex(r => r && r.some(v => normName(v) === 'id') && r.some(v => /^(name|member care champions)$/i.test(normSpace(v)))); }
const col = (H, re) => H.findIndex(v => typeof v === 'string' && re.test(normSpace(v)));

/** sheets: Core.readXlsx output. Returns { y, m, rows:[{k,id,n,brand,team,adh,adhUnder,adhDays,aht,worked,absent,al,sl,off,leave,tardy,d}] } */
function read(sheets, opts = {}) {
  const target = opts.target ?? 0.95, floor = opts.floor ?? 0.5;
  const by = re => sheets.find(s => re.test(normSpace(s.name)));
  const AR = by(/^attendance report$/i), DT = by(/^adherence\s*-?\s*in detail$/i), AD = by(/^adherence$/i), AH = by(/^aht$/i);
  const people = new Map(), byName = new Map();
  const get = (id, name) => {
    const k = ukey(id, name), nk = normName(name);
    let p = people.get(k) || (byName.has(nk) ? people.get(byName.get(nk)) : null);
    if (!p) { p = { k, id: /^\d{6,}$/.test(id) ? id : '', n: name, brand: '', team: '' }; people.set(k, p); }
    if (!p.id && /^\d{6,}$/.test(id)) p.id = id;
    if (!byName.has(nk)) byName.set(nk, p.k);
    return p;
  };
  let y = null, m = null;
  if (AR) {
    const h = headRow(AR), H = AR.rows[h] || [], dc = [];
    H.forEach((v, i) => { if (v instanceof Date) dc.push(i); });
    if (dc.length) { y = H[dc[0]].getUTCFullYear(); m = H[dc[0]].getUTCMonth() + 1; }
    const ni = col(H, /^name$/i), ti = col(H, /^team$/i), di = col(H, /^dep$/i), tri = col(H, /^tardy$/i);
    for (const r of AR.rows.slice(h + 1)) {
      const n = strip(r && r[ni]); if (!n) continue;
      const p = get(idOf(r[0]), n);
      p.brand = normSpace(r[ti]) || p.brand; p.team = normSpace(r[di]) || p.team;
      const days = dc.map(i => { const x = A.normCode(r[i]); return x.v == null ? null : x.v; });
      const c = A.counts(days, null);
      Object.assign(p, { worked: c.worked, absent: c.absent, al: c.al, sl: c.sl, off: c.off, leave: c.other, tardy: num(r[tri]) ?? c.tardyMin, d: days.map(DAY).join('') });
    }
  }
  if (DT) {
    const h = headRow(DT), H = DT.rows[h] || [], dc = [];
    H.forEach((v, i) => { if (v instanceof Date) dc.push(i); });
    const ni = col(H, /^(name|member care champions)$/i);
    for (const r of DT.rows.slice(h + 1)) {
      const n = strip(r && r[ni]); if (!n) continue;
      const vals = dc.map(i => num(r[i])).filter(v => v != null && v >= floor);
      if (!vals.length) continue;
      const p = get(idOf(r[0]), n);
      p.adhDays = vals.length; p.adhUnder = vals.filter(v => v < target).length;
      if (p.adh == null) p.adh = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  if (AD) {
    const h = headRow(AD), H = AD.rows[h] || [], ni = col(H, /^(name|member care champions)$/i), vi = col(H, /adherence/i);
    for (const r of AD.rows.slice(h + 1)) {
      const n = strip(r && r[ni]); const v = num(r && r[vi]); if (!n || v == null) continue;
      const p = get(idOf(r[0]), n); p.adh = v;
    }
  }
  if (AH) {
    const h = headRow(AH), H = AH.rows[h] || [], ni = col(H, /^name$/i), vi = col(H, /^aht$/i);
    for (const r of AH.rows.slice(h + 1)) {
      const n = strip(r && r[ni]); let v = r && r[vi]; if (!n) continue;
      if (v instanceof Date) v = (v.getTime() - Date.UTC(1899, 11, 30)) / 1000;   // a time cell
      v = num(v); if (v == null) continue;
      if (v < 1) v = v * 86400;   // a fraction of a day
      const p = get(idOf(r[0]), n); p.aht = Math.round(v * 1000) / 1000;
    }
  }
  if ((!y || !m) && opts.name) { const x = String(opts.name).match(/(20\d\d)[-_ .]?(0[1-9]|1[0-2])/); if (x) { y = +x[1]; m = +x[2]; } }
  const rows = [...people.values()].map(p => { const o = {}; for (const [k, v] of Object.entries(p)) if (v !== '' && v != null) o[k] = typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v; return o; });
  return { y, m, rows };
}

/** the same row shape from this page's own data (incentive model + attendance) */
function fromModel(md, att) {
  const rows = new Map();
  const get = r => { const k = ukey(r.id, r.name); if (!rows.has(k)) rows.set(k, { k, id: /^\d{6,}$/.test(r.id) ? r.id : '', n: r.name, brand: r.brand, team: r.team }); return rows.get(k); };
  for (const r of md.att) {
    const p = get(r), a = att && att.get(r.pid), days = a ? a.days : r.days.map(v => v || null);
    const c = A.counts(days, a ? a.tardyFile : null);
    const dx = {}; days.forEach((v, i) => { if (v != null && (typeof v === 'number' || !STD_DAY.has(v))) dx[i + 1] = v; });   // tardy minutes and named leaves, which the letters do not keep
    Object.assign(p, { worked: c.worked, absent: c.absent, al: c.al, sl: c.sl, off: c.off, leave: c.other, tardy: r.tardy || 0, d: days.map(DAY).join(''), ...(Object.keys(dx).length ? { dx } : {}) });
  }
  for (const r of md.det) { const p = get(r); p.adh = typeof r.avg === 'number' ? r.avg : undefined; p.adhUnder = r.under; p.adhDays = r.counted; }
  for (const r of md.adh) { const p = get(r); if (typeof r.avg === 'number') p.adh = r.avg; }
  for (const r of md.aht) { const p = get(r); p.aht = r.sec; }
  return { y: md.y, m: md.m, rows: [...rows.values()].map(p => { const o = {}; for (const [k, v] of Object.entries(p)) if (v !== '' && v != null) o[k] = v; return o; }) };
}

// ---- Genesys exports of past months (AHT, Monthly Adherence, Schedule, Agent Status Timeline) -> history rows
const dayKeyOf = t => { const d = new Date(t); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
const nextDayKey = k => { const d = new Date(Date.UTC(Math.floor(k / 10000), Math.floor(k / 100) % 100 - 1, k % 100) + 86400000); return dayKeyOf(d.getTime()); };
const MONTHS_RE = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** which months a detection holds data for: [{y, m, days?:[first,last]}] */
function detMonths(d, fileName) {
  if (d.kind === 'aht' || d.kind === 'timeline') return d.data.month ? [{ y: d.data.month.y, m: d.data.month.m }] : [];
  if (d.kind === 'perf') return (d.data.months || []).map(x => ({ y: x.y, m: x.m }));
  if (d.kind === 'schedule') {
    const by = new Map();
    for (const x of d.data.segs) { const t = new Date(x.s), k = t.getUTCFullYear() * 100 + t.getUTCMonth() + 1; by.set(k, (by.get(k) || 0) + 1); }
    return [...by.keys()].sort().map(k => ({ y: Math.floor(k / 100), m: k % 100 }));
  }
  if (d.kind === 'adhGenesys' && d.data.multi) return (d.data.months || []).map(x => ({ y: x.y, m: x.m }));
  if (d.kind === 'adhGenesys') {   // the export has no dates: read the month from the file name
    const s = String(fileName || '').toLowerCase();
    let x = s.match(/(20\d\d)[-_ .]?(0[1-9]|1[0-2])(?!\d)/); if (x) return [{ y: +x[1], m: +x[2] }];
    x = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s_.-]*(20\d\d)/); if (x) return [{ y: +x[2], m: MONTHS_RE.indexOf(x[1]) + 1 }];
    x = s.match(/(20\d\d)[\s_.-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/); if (x) return [{ y: +x[1], m: MONTHS_RE.indexOf(x[2]) + 1 }];
    return [];
  }
  return [];
}
/** One month from Genesys exports. dets: detections touching this month. Returns {rows, have:{aht,adh,ded}, notes:[]}.
    Deduction uses the report's rules (Sched. minus Actual per day, never below 0, 0 when Actual is 0) and is only kept for
    agents whose schedule files cover the whole month. */
function fromExports(dets, y, m, opts = {}) {
  const target = opts.target ?? 0.95, floor = opts.floor ?? 0.5, ND = C.daysIn(y, m), first = y * 10000 + m * 100 + 1, last = y * 10000 + m * 100 + ND;
  const rows = new Map(), notes = [], have = { aht: false, adh: false, ded: false, perf: false, wf: false }; let pmedia = '';
  const clean = n => normSpace(String(n || '').replace(/\s*\((inactive|deleted)\)\s*$/i, ''));   // Genesys marks people who left
  const get = n => { n = clean(n); const k = normName(n); if (!rows.has(k)) rows.set(k, { k: 'N:' + k, n }); return rows.get(k); };
  const of = k => dets.filter(d => d.kind === k);
  // AHT: voice first, one row per agent
  for (const d of of('aht')) {
    const L = [...d.data.people].sort((a, b) => (b.media === 'voice') - (a.media === 'voice'));
    const seen = new Set();
    for (const r of L) { const k = normName(r.name); if (seen.has(k) || r.sec == null) continue; seen.add(k); get(r.name).aht = Math.round(r.sec * 1000) / 1000; have.aht = true; }
  }
  // Agent Performance Summary: answered, handled, handle/talk/hold/ACW times, held, transferred, outbound
  for (const d of of('perf')) {
    const mm = (d.data.months || []).find(x => x.y === y && x.m === m); if (!mm) continue;
    if (!mm.full) { notes.push('the performance export covers only part of the month, so no performance'); continue; }
    for (const r of C.perfMonth(d.data, y, m)) {
      const p = get(r.name); if (PERF_F.some(k => p[k] != null)) continue;
      for (const k of PERF_F) if (r[k] != null) p[k] = r[k];
      have.perf = true;
    }
    pmedia = pmedia || d.data.media || '';
  }
  // Monthly Adherence
  for (const d of of('adhGenesys')) {
    if (d.data.multi) { const mm = (d.data.months || []).find(x => x.y === y && x.m === m); if (!mm) continue; if (mm.days < ND) { notes.push(`the adherence export has only ${mm.days} of the ${ND} days, so no adherence`); continue; } }
    for (const r of d.data.people) {
    const vals = [];
    for (const [day, v] of (d.data.multi ? r.byMonth[y + '-' + m] || [] : r.days)) { if (day > ND) continue; const x = C.adhVal(v); if (x != null && x >= floor) vals.push(x); }
    if (!vals.length) continue;
    const p = get(r.name); if (p.adh != null) continue;
    p.adh = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 1e6) / 1e6; p.adhDays = vals.length; p.adhUnder = vals.filter(v => v < target).length; have.adh = true;
    }
  }
  // Schedule + Agent Status Timeline -> deduction minutes and conformance
  const S = of('schedule'), T = of('timeline').filter(d => d.data.month && d.data.month.y === y && d.data.month.m === m);
  if (S.length && T.length) {
    const seen = new Set(), segs = [], cover = new Map();   // agent -> [[from,to]] of the files they are in
    for (const d of S) {
      const days = d.data.segs.map(x => dayKeyOf(x.s)); const lo = Math.min(...days), hi = Math.max(...days);
      for (const x of d.data.segs) {
        const key = `${normName(x.name)}|${x.code}|${x.s}|${x.e}|${x.full ? 1 : 0}`; if (seen.has(key)) continue; seen.add(key); segs.push(x);
      }
      for (const a of new Set(d.data.segs.map(x => normName(x.name)))) { if (!cover.has(a)) cover.set(a, []); cover.get(a).push([lo, hi]); }
    }
    const covered = a => { const R = (cover.get(a) || []).slice().sort((p, q) => p[0] - q[0]); let reach = first - 1; for (const [lo, hi] of R) { if (lo > nextDayKey(reach)) break; reach = Math.max(reach, hi); } return reach >= last; };
    const daily = C.computeDaily([{ data: { segs } }], T, y, m);
    let skipped = 0;
    for (const [k, sc] of daily.sched) {
      if (!sc.days.some(v => v != null)) continue;
      if (!covered(k)) { skipped++; continue; }
      const ac = daily.actual.get(k); let ded = 0, base = 0;
      sc.days.forEach((sv, i) => { const av = ac ? ac.days[i] : null; if (sv == null || av == null || av === 0) return; ded += Math.max(0, sv - av); base += sv; });
      const p = get(sc.name); p.ded = ded; if (base > 0) p.conf = Math.round((1 - ded / base) * 1e4) / 1e4; have.ded = true;
    }
    // the daily review's measures for the month: no sign-on, late sign-on, short of shift, break changes, time signed on, exceptions
    const adhDay = new Map();
    for (const d of of('adhGenesys')) for (const r of d.data.people) {
      const pairs = d.data.multi ? r.byMonth[y + '-' + m] || [] : r.days, k = normName(clean(r.name)); if (adhDay.has(k)) continue;
      adhDay.set(k, new Map(pairs.map(([day, v]) => [day, C.adhVal(v)])));
    }
    const TH = { ...REVIEW_T, adhTarget: target };
    for (const [k, rv] of C.computeDayReview([{ data: { segs } }], T, y, m)) {
      if (!covered(k) || !rv.days.length) continue;
      const A = adhDay.get(k), p = get(rv.name);
      const sm = C.reviewMonth(rv.days.map(o => C.judgeDay(o, A ? A.get(o.day) ?? null : null, TH)), TH, { aht: p.aht, ans: p.ans, hnd: p.hnd, tHold: p.tHold, rona: p.rona });
      if (!sm.shifts) continue;
      Object.assign(p, wfFields(sm)); have.wf = true;
    }
    if (skipped) notes.push(`${skipped} agent${skipped > 1 ? 's' : ''} without a schedule for the whole month, so no deduction for them`);
  } else if (S.length) notes.push('a schedule but no Agent Status Timeline, so no deduction');
  else if (T.length) notes.push('an Agent Status Timeline but no schedule, so no deduction');
  return { y, m, rows: [...rows.values()], have, notes, pmedia };
}
/** the daily review's thresholds: late after 0 min, no sign-on after 180 min, short of shift from 15 min, AHT ceiling 2:30, high hold 45 s, at least 5 calls */
const REVIEW_T = { tardyAfter: 0, absentAfter: 180, shortfall: 15, adhTarget: 0.95, ahtCeil: 150, holdMax: 45, minCalls: 5, absentWeight: 5 };
const WF_F = ['wfShift', 'wfWorked', 'wfAbs', 'wfLate', 'wfLateMin', 'wfShort', 'wfShortMin', 'wfBrk', 'wfLogged', 'wfLow', 'wfExc'];
const wfFields = s => ({ wfShift: s.shifts, wfWorked: s.worked, wfAbs: s.absent, wfLate: s.late, wfLateMin: s.lateMin, wfShort: s.short, wfShortMin: s.shortMin, wfBrk: s.brk, wfLogged: Math.round(s.logged), wfLow: s.lowAdh, wfExc: s.exc });
const PERF_F = ['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'held', 'xfer', 'out', 'tTalk', 'tHold', 'tAcw', 'rona'];   // the totals keep team averages exact
const G_FIELDS = ['aht', 'adh', 'adhUnder', 'adhDays', 'ded', 'conf', ...PERF_F, ...WF_F];
/** Merge Genesys rows into a month record. Values from the incentive file are kept; Genesys fills the gaps (marked in r.g) and adds deduction and conformance.
    who(name) -> {id, n, brand, team} | null maps a Genesys name to a roster person. */
function mergeExports(rec, add, who) {
  const out = rec ? { ...rec, rows: rec.rows.map(r => ({ ...r })) } : { y: add.y, m: add.m, rows: [], src: 'Genesys exports' };
  const byId = new Map(), byName = new Map();
  out.rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  const fuzzy = n => { let best = null, bs = 0, second = 0; for (const r of out.rows) { const s = C.nameScore(n, r.n); if (s > bs) { second = bs; bs = s; best = r; } else if (s > second) second = s; } return best && bs >= 0.86 && bs - second >= 0.08 ? best : null; };
  let matched = 0, added = 0, skipped = 0;
  for (const g of add.rows) {
    const w = who ? who(g.n) : null;
    let r = (w && w.id && byId.get(w.id)) || byName.get(normName(g.n)) || (w && byName.get(normName(w.n))) || fuzzy(g.n);
    if (!r && !w && !G_FIELDS.some(f => g[f] != null && !PERF_F.includes(f))) { skipped++; continue; }   // only performance, and not on the roster or in the month: someone from another team
    if (!r) {
      r = { k: w && w.id ? w.id : g.k, n: w ? w.n : g.n }; if (w && w.id) r.id = w.id; if (w && w.brand) r.brand = w.brand; if (w && w.team) r.team = w.team;
      out.rows.push(r); if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); added++;
    } else matched++;
    const mine = new Set(String(r.g || '').split(',').filter(Boolean));
    for (const f of G_FIELDS) {
      if (g[f] == null) continue;
      if (r[f] != null && !mine.has(f)) continue;   // the incentive file's value stays
      r[f] = g[f]; mine.add(f);
    }
    if (mine.size) r.g = [...mine].join(',');
  }
  if (add.pmedia) out.pmedia = add.pmedia;
  return { rec: out, matched, added, skipped };
}

const METRICS = [
  { k: 'adh', label: 'Adherence', fmt: v => (v * 100).toFixed(2) + '%', good: (v, t) => v >= t, total: 'avg' },
  { k: 'adhUnder', label: 'Days under target', fmt: v => String(v), good: v => v === 0, total: 'sum' },
  { k: 'aht', label: 'AHT', fmt: v => { const t = Math.round(v); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }, total: 'avg' },
  { k: 'worked', label: 'Worked days', fmt: v => String(v), total: 'sum' },
  { k: 'absent', label: 'Absent', fmt: v => String(v), good: v => v === 0, total: 'sum' },
  { k: 'tardy', label: 'Tardy (min)', fmt: v => String(Math.round(v)), good: v => v === 0, total: 'sum' },
  { k: 'leave2', label: 'AL + SL', get: r => (r.d != null ? (r.al || 0) + (r.sl || 0) : null), fmt: v => String(v), total: 'sum' },
  { k: 'ded', label: 'Deduction (min)', fmt: v => String(Math.round(v)), good: v => v === 0, total: 'sum' },
  { k: 'conf', label: 'Conformance', fmt: v => (v * 100).toFixed(2) + '%', total: 'avg' },
  { k: 'fin', label: 'Final %', fmt: v => `${+(v * 100).toFixed(1)}%`, total: 'avg' },
  { k: 'earned', label: 'Earned SR', fmt: v => String(Math.round(v)), total: 'sum' },
  // from the Agent Performance Summary (perf: shown only where a month has it; time: seconds shown as m:ss)
  { k: 'ans', label: 'Answered', fmt: v => Math.round(v).toLocaleString('en-US'), total: 'sum', perf: true },
  { k: 'hnd', label: 'Handled', fmt: v => Math.round(v).toLocaleString('en-US'), total: 'sum', perf: true },
  { k: 'pAht', label: 'Avg handle', fmt: v => mss(v), total: 'avg', perf: true, time: true },
  { k: 'talk', label: 'Avg talk', fmt: v => mss(v), total: 'avg', perf: true, time: true },
  { k: 'hold', label: 'Avg hold', fmt: v => mss(v), total: 'avg', perf: true, time: true },
  { k: 'acw', label: 'Avg ACW', fmt: v => mss(v), total: 'avg', perf: true, time: true },
  { k: 'heldR', label: 'Hold rate', get: r => (r.hnd ? (r.held || 0) / r.hnd : null), fmt: v => (v * 100).toFixed(1) + '%', total: 'avg', perf: true, pct: true },
  { k: 'xferR', label: 'Transfer rate', get: r => (r.hnd ? (r.xfer || 0) / r.hnd : null), fmt: v => (v * 100).toFixed(1) + '%', total: 'avg', perf: true, pct: true },
  { k: 'xfer', label: 'Transferred', fmt: v => Math.round(v).toLocaleString('en-US'), total: 'sum', perf: true },
  { k: 'out', label: 'Outbound', fmt: v => Math.round(v).toLocaleString('en-US'), total: 'sum', perf: true },
  // the daily review's measures added up for the month (wf: shown only where a month has them)
  { k: 'wfExc', label: 'Exceptions', fmt: v => String(v), good: v => v === 0, total: 'sum', wf: true },
  { k: 'wfAbs', label: 'No sign-on', fmt: v => String(v), good: v => v === 0, total: 'sum', wf: true },
  { k: 'wfLate', label: 'Late sign-ons', fmt: v => String(v), good: v => v === 0, total: 'sum', wf: true },
  { k: 'wfLateMin', label: 'Late (min)', fmt: v => String(Math.round(v)), good: v => v === 0, total: 'sum', wf: true },
  { k: 'wfShort', label: 'Short of shift', fmt: v => String(v), good: v => v === 0, total: 'sum', wf: true },
  { k: 'wfBrk', label: 'Break changes', fmt: v => String(v), total: 'sum', wf: true },
  { k: 'occ', label: 'Occupancy', get: r => (r.wfLogged && r.hnd && r.pAht != null ? r.pAht * r.hnd / (r.wfLogged * 60) : null), fmt: v => (v * 100).toFixed(1) + '%', total: 'avg', wf: true, pct: true },
];
function mss(v) { const t = Math.round(v), h = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), s = t % 60; return h ? `${h}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`; }
const valOf = (r, mt) => (!r ? null : mt.get ? mt.get(r) : (r[mt.k] ?? null));
return { isIncentive, read, fromModel, ukey, METRICS, valOf, DAY_NAME, detMonths, fromExports, mergeExports, PERF_F, WF_F, REVIEW_T, wfFields };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Att !== 'undefined' ? Att : require('./attendance.js'));
if (typeof module !== 'undefined') module.exports = History;
