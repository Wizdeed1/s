// How the incentive is counted (the 'count' section of the rules), Node only, synthetic values only.
// 1. The defaults count exactly as v33 did: test/ref holds the v33 modules word for word (git 156a4ae), and the new code must give
//    the same numbers for 10,000 random scores, the same scheduled and attended days for random months, and an incentive
//    workbook whose every file is byte for byte the same.
// 2. Other rules count as they say (the absence penalty that fits the old August file, missing KPIs, band edges, rounding).
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Kpi = require(js('kpi.js')), Writer2 = require(js('writer2.js')), WriterInc = require(js('writer_inc.js'));
/** a v33 module from test/ref, run against today's core.js and writer2.js */
function ref(file) {
  const src = fs.readFileSync(path.join(__dirname, 'ref', file), 'utf8'), module = { exports: {} };
  const req = p => ({ './core.js': Core, './writer2.js': Writer2 })[p] || require(p);
  new Function('module', 'exports', 'require', src)(module, module.exports, req);
  return module.exports;
}
const Old = { Kpi: ref('kpi_v33.js'), WriterInc: ref('writer_inc_v33.js'), X: require('./ref/extras_v33.js') };
let n = 0, failed = 0;
const tests = [];
const ok = (name, fn) => tests.push([name, fn]);
const rng = seed => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// ---------------------------------------------------------------- 1a. Kpi.score: the defaults give v33's numbers
const pick = (r, a) => a[Math.floor(r() * a.length)];
const SCORE_KEYS = ['finalRank', 'finalPct', 'sched', 'actual', 'daysPct', 'target', 'earned', 'missing', 'complete', 'weightsOk'];
const core = res => ({ ...Object.fromEntries(SCORE_KEYS.map(k => [k, res[k]])), rows: res.rows.map(x => [x.k.id, x.v, x.r, x.w]) });
function randomValue(r, k) {
  const b = (k.bands || []).filter(x => x != null && x !== ''), u = r();
  if (u < 0.18) return null;
  if (u < 0.5 && b.length) { const t = pick(r, b), e = pick(r, [0, 0, 1e-10, -1e-10, 1e-12, -1e-12, 1e-8, -1e-8]); return t + e; }
  if (k.unit === 'pct') return Math.round(r() * 1e6) / 1e6 * 0.5 + 0.5;
  if (k.unit === 'sec') return 100 + r() * 400;
  if (k.unit === 'min') return Math.floor(r() * 40);
  return Math.floor(r() * 10);   // days under target
}
ok('Kpi.score with the default rules gives v33\'s numbers (10,000 random people on every built-in scorecard)', () => {
  const r = rng(20261018), cards = Object.values(Kpi.DEFAULTS().teams);
  for (let i = 0; i < 10000; i++) {
    const card = pick(r, cards), vals = { file: {} };
    for (const k of card.kpis) { const v = randomValue(r, k); if (k.src === 'file') vals.file[k.id] = v; else vals[k.src] = v; }
    const sched = pick(r, [0, null, undefined, ...Array.from({ length: 31 }, (_, j) => j + 1)]);
    const att = r() < 0.05 ? null : { sched, actual: sched ? Math.floor(r() * (sched + 1)) : pick(r, [0, 3, null]) };
    const base = pick(r, [500, 1000, 1600, 1545, null, undefined]);
    const want = core(Old.Kpi.score(card, vals, att, base));
    assert.deepEqual(core(Kpi.score(card, vals, att, base)), want, `case ${i}`);
    assert.deepEqual(core(Kpi.score(card, vals, att, base, Kpi.COUNT0())), want, `case ${i} with COUNT0`);
    assert.deepEqual(core(Kpi.score(card, vals, att, base, Kpi.normCount({}))), want, `case ${i} with {}`);
    assert.deepEqual(core(Kpi.score(card, vals, att, base, { junk: 1, rankDp: 'x', money: 'nope' })), want, `case ${i} with junk`);
    if (att) {   // the new way callers pass the days (attended, absences, runs) changes nothing either while there is no penalty
      const a2 = { sched: att.sched, attended: att.actual, absent: Math.floor(r() * 4), runs: Math.floor(r() * 3) };
      assert.deepEqual(core(Kpi.score(card, vals, a2, base, Kpi.COUNT0())), want, `case ${i} with attended`);
    }
    for (const k of card.kpis) { const v = randomValue(r, k); assert.equal(Kpi.rank(k, v), Old.Kpi.rank(k, v)); assert.equal(Kpi.rank(k, v, 'in'), Old.Kpi.rank(k, v)); }
  }
});
ok('the band texts and targets read as before', () => {
  for (const c of Object.values(Kpi.DEFAULTS().teams)) for (const k of c.kpis) { assert.equal(Kpi.bandText(k), Old.Kpi.bandText(k)); assert.equal(Kpi.target(k), Old.Kpi.target(k)); }
});

// ---------------------------------------------------------------- 1b. countDays: the defaults count like the v33 workbook and the v33 corrections
const VOCAB = ['Attend', 'Attend', 'Attend', 'Attend', 'OFF', 'OFF', 'AL', 'SL', 'Absent', 'National Day', 'Founding Day', 'Eid', 'Unpaid', 'Paternity', 'Compassionate Leave', 'Marriage', 'Exam', 'ML',
  'Other leave', null, null, '', 'SL ', 'Eid Al Adha holiday', 'eid', 'EID', 'National Day off', 'compassionate leave', 'Absent', 'Attend ', 'off', 0];
const randomDays = (r, nd = 31) => Array.from({ length: nd }, () => (r() < 0.12 ? 1 + Math.floor(r() * 300) : pick(r, VOCAB)));
/** v33 WriterInc.model's count for one person (writer_inc.js:20-33 at git 156a4ae) */
function oldModelCount(raw) {
  const days = raw.map(v => (v == null || v === '' ? '' : typeof v === 'number' ? 'Attend' : String(v)));
  const counts = Old.WriterInc.COUNTS.map(([, , t]) => days.filter(v => v && t(v)).length), attend = days.filter(v => v === 'Attend').length;
  return { counts, attend, sched: counts.reduce((a, b) => a + b, 0) + attend };
}
const eidText = v => typeof v === 'string' && /^eid/i.test(v) && !/^eid$/i.test(v);
ok('countDays with the default rules counts like the v33 incentive workbook (20,000 random months)', () => {
  const r = rng(7);
  for (let i = 0; i < 20000; i++) {
    const days = randomDays(r), o = oldModelCount(days), c = Kpi.countDays(days, Kpi.COUNT0());
    assert.equal(c.sched, o.sched, `sched ${i}`); assert.equal(c.attended, o.attend, `attended ${i}`); assert.equal(c.counted, o.attend, `counted ${i}`);
    assert.deepEqual(Kpi.COUNT0().sched.map(x => c.byCode[x]), o.counts, `columns ${i}`);
    assert.deepEqual(Kpi.countDays(days), c); assert.deepEqual(Kpi.countDays(days, {}), c);
  }
});
ok('countDays with the default rules counts like the v33 corrections (attTotals), except raw text that starts with "eid", which follows the workbook', () => {
  const r = rng(11);
  for (let i = 0; i < 20000; i++) {
    const days = randomDays(r), o = Old.X.attTotals(days), c = Kpi.countDays(days, Kpi.COUNT0()), eid = days.filter(eidText).length;
    assert.equal(c.attended, o.attend, `attended ${i}`); assert.equal(c.absent, o.absent, `absent ${i}`); assert.equal(c.tardy, o.tardy, `tardy ${i}`); assert.equal(c.off, o.off, `off ${i}`);
    assert.equal(c.sched, o.sched - eid, `sched ${i}: v33 also counted ${eid} "eid…" text day(s)`);
  }
  assert.equal(Old.X.attTotals(['Eid Al Adha holiday', 'Attend']).sched, 2); assert.equal(Kpi.countDays(['Eid Al Adha holiday', 'Attend']).sched, 1);
});

// ---------------------------------------------------------------- 1c. the incentive workbook is byte for byte the same with the default rules
function synthCtx(seed) {
  const r = rng(seed), year = 2026, month = 9, ND = 30, roster = [], attendance = new Map(), rawAdh = [], rawAht = [], rawSched = [], rawActual = [];
  const UNITS = [['Virgin', 'CC'], ['Virgin', 'SM'], ['Virgin', 'CT'], ['Friendi', 'CC'], ['Friendi Pay', 'CC'], ['Virgin', 'QA'], ['Virgin', 'WF']];
  for (let i = 0; i < 48; i++) {
    const [brand, team] = UNITS[i % UNITS.length], name = `Test Person ${String.fromCharCode(65 + (i % 26))}${i}`;
    const nid = i === 17 ? '1000000005' : i % 11 === 3 ? '' : String(1000000001 + i);   // 17 and 4 share an ID (one attendance row)
    roster.push({ _id: 'p' + i, name, sys: i % 6 === 0 ? `${name} Sys` : '', nid, brand, team, status: i % 13 === 7 ? 'Inactive' : 'Active', email: `p${i}@example.com` });
    if (i % 9 !== 8) attendance.set('p' + i, { days: randomDays(r, ND), tardyFile: i % 10 === 0 ? 45 : null });
    const exp = i % 6 === 0 ? `${name} Sys` : name;
    if (i % 5 !== 4) rawAdh.push({ name: exp, days: Array.from({ length: ND }, () => (r() < 0.25 ? null : Math.round((0.4 + r() * 0.6) * 1e4) / 1e4)) });
    if (i % 7 !== 6) rawAht.push({ name: exp, sec: Math.round((120 + r() * 120) * 1000) / 1000, alt: i % 8 === 0 ? [{ sec: 150, media: 'voice' }, { sec: 170, media: 'chat' }] : [] });
    rawSched.push({ name: exp }); rawActual.push({ name: exp });
  }
  return { year, month, settings: { target: 0.95, floor: 0.5, inactiveMin: 6, dedBrands: ['Virgin'], dedTeams: ['CC'], incFullAdhTeams: ['CT'] }, roster, attendance, rawAdh, rawAht, rawSched, rawActual, logo: null };
}
async function files(bytes) { const z = await Core.readZip(bytes), out = {}; for (const f of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/worksheets/sheet4.xml', 'xl/styles.xml', 'xl/workbook.xml', '[Content_Types].xml']) out[f] = await z.text(f); return out; }
ok('the incentive workbook is the same file with the default rules (every sheet, the styles and the workbook)', async () => {
  for (const seed of [3, 5, 8]) {
    const ctx = synthCtx(seed), want = await files(await Old.WriterInc.build(ctx));
    assert.deepEqual(await files(await WriterInc.build(ctx)), want, `seed ${seed}`);
    assert.deepEqual(await files(await WriterInc.build(ctx, { count: Kpi.COUNT0() })), want, `seed ${seed} with COUNT0`);
    assert.deepEqual(await files(await WriterInc.build(ctx, { model: WriterInc.model(ctx, { count: {} }) })), want, `seed ${seed} with a model`);
    const om = Old.WriterInc.model(ctx), nm = WriterInc.model(ctx, { count: Kpi.COUNT0() });
    assert.deepEqual(nm.att.map(x => [x.pid, x.days, x.counts, x.attend, x.sched, x.has, x.tardy]), om.att.map(x => [x.pid, x.days, x.counts, x.attend, x.sched, x.has, x.tardy]));
    assert.deepEqual(nm.det, om.det); assert.deepEqual(nm.adh, om.adh); assert.deepEqual(nm.aht, om.aht);
    assert.ok(nm.att.every(x => x.attended === x.attend && x.counted === x.attend));
  }
});

// ---------------------------------------------------------------- 2. other rules count as they say
const card55 = { kpis: [   // a card that gives a final ranking of 4.55 (91%) or 4.60 (92%)
  { id: 'a', name: 'A', src: 'file', unit: 'pct', dir: 'high', weight: 0.55, bands: [0.95, 0.9, 0.85, 0.8] },
  { id: 'b', name: 'B', src: 'file', unit: 'pct', dir: 'high', weight: 0.45, bands: [0.95, 0.9, 0.85, 0.8] }] };
const card60 = { kpis: [{ ...card55.kpis[0], weight: 0.6 }, { ...card55.kpis[1], weight: 0.4 }] };
const pen = Kpi.normCount({ absentExtra: 4, countedMin: 1 });
ok('absence penalty (4 more days off per absent day, never below 1 counted day): 23 / 20 / 2 absent at 91% earns 475; 23 / 13 / 4 absent at 92% earns 40', () => {
  const a = Kpi.score(card55, { file: { a: 0.97, b: 0.91 } }, { sched: 23, attended: 20, absent: 2, runs: 2 }, 1000, pen);
  assert.ok(Math.abs(a.finalPct - 0.91) < 1e-12); assert.equal(a.attended, 20); assert.equal(a.extra, 8); assert.equal(a.actual, 12); assert.equal(a.earned, 475);
  assert.equal(a.target, Math.round(1000 * 12 / 23));
  const b = Kpi.score(card60, { file: { a: 0.97, b: 0.91 } }, { sched: 23, attended: 13, absent: 4, runs: 2 }, 1000, pen);
  assert.ok(Math.abs(b.finalPct - 0.92) < 1e-12); assert.equal(b.extra, 16); assert.equal(b.actual, 1); assert.equal(b.earned, 40); assert.equal(b.attended, 13);
  // the same without the rule: the tool's old numbers
  assert.equal(Kpi.score(card55, { file: { a: 0.97, b: 0.91 } }, { sched: 23, attended: 20, absent: 2 }, 1000).earned, 791);
  assert.equal(Kpi.score(card60, { file: { a: 0.97, b: 0.91 } }, { sched: 23, attended: 13, absent: 4 }, 1000).earned, 520);
});
ok('countDays: the absence penalty per day or per run of absent days (OFF does not break a run), the late limit, extra codes', () => {
  const d = ['Attend', 'Absent', 'OFF', 'Absent', 'Attend', 'Absent', 'SL', 'Absent', 30, 200, 'Exam', 'Attend'];
  const c0 = Kpi.countDays(d);
  assert.deepEqual([c0.attended, c0.absent, c0.runs, c0.sched, c0.tardy, c0.counted], [5, 4, 3, 10, 230, 5]);
  const day = Kpi.countDays(d, { absentExtra: 1 }), run = Kpi.countDays(d, { absentExtra: 1, absentPer: 'run' }), flat = Kpi.countDays(d, { absentFlat: 2 });
  assert.deepEqual([day.extra, day.counted, run.extra, run.counted, flat.extra, flat.counted], [4, 1, 3, 2, 2, 3]);
  const late = Kpi.countDays(d, { lateOver: 120 });
  assert.deepEqual([late.attended, late.absent, late.lateAbs, late.runs, late.tardy, late.sched], [4, 5, 1, 4, 230, 10]);
  const exam = Kpi.countDays(d, { sched: [...Kpi.COUNT0().sched, 'Exam'] });
  assert.equal(exam.sched, c0.sched + 1); assert.equal(exam.byCode.Exam, 1);
  const noAbs = Kpi.countDays(d, { sched: ['AL', 'SL'] });
  assert.equal(noAbs.sched, 6); assert.equal(noAbs.absent, 4);
  assert.equal(Kpi.countDays(['Absent', 'Absent'], { absentExtra: 4, countedMin: 1 }).counted, 0, 'never more than the days attended');
});
ok('missing KPIs: scaled out (default), ranked 1, or no final % until every KPI has a value', () => {
  const card = Kpi.DEFAULTS().teams.CC, vals = { adh: 0.97, aht: 140, tardy: 0, file: { csat: 0.9, qobs: 0.96 } }, att = { sched: 20, actual: 20 };
  assert.equal(Kpi.score(card, vals, att, 1000).finalRank, 5);
  const r1 = Kpi.score(card, vals, att, 1000, { missing: 'rank1' });
  assert.equal(r1.finalRank, Math.round((5 * 0.75 + 1 * 0.25) * 100) / 100); assert.deepEqual(r1.missing.length, 2);
  const none = Kpi.score(card, vals, att, 1000, { missing: 'none' });
  assert.equal(none.finalRank, null); assert.equal(none.earned, null); assert.equal(none.target, 1000);
});
ok('band edges, value and ranking decimals, the final % table and its decimals, full days and money rounding', () => {
  const k = { id: 'x', name: 'X', src: 'file', unit: 'pct', dir: 'high', weight: 1, bands: [0.95, 0.9, 0.85, 0.8] };
  assert.equal(Kpi.rank(k, 0.95), 5); assert.equal(Kpi.rank(k, 0.95, 'out'), 4); assert.equal(Kpi.rank(k, 0.9501, 'out'), 5);
  const lo = { ...k, unit: 'min', dir: 'low', bands: [4, 10, 15, 20] };
  assert.equal(Kpi.rank(lo, 4), 5); assert.equal(Kpi.rank(lo, 4, 'out'), 4);
  const c = { kpis: [k] };
  assert.equal(Kpi.score(c, { file: { x: 0.949946 } }, null, 1000).finalRank, 4);
  assert.equal(Kpi.score(c, { file: { x: 0.949946 } }, null, 1000, { valDp: 0 }).finalRank, 5, '94.9946% rounds to 95% before ranking');
  assert.equal(Kpi.score(c, { file: { x: 0.949946 } }, null, 1000, { valDp: 2 }).finalRank, 4);
  const three = { kpis: [{ ...k, id: 'a', weight: 1 / 3 }, { ...k, id: 'b', weight: 1 / 3 }, { ...k, id: 'c', weight: 1 / 3 }] }, v3 = { file: { a: 0.97, b: 0.97, c: 0.91 } };
  assert.equal(Kpi.score(three, v3, null, 1000).finalRank, 4.67);
  assert.equal(Kpi.score(three, v3, null, 1000, { rankDp: 1 }).finalRank, 4.7);
  assert.ok(Math.abs(Kpi.score(three, v3, null, 1000, { rankDp: -1 }).finalRank - 14 / 3) < 1e-12);
  const tab = { pctOf: 'table', pctTable: [{ min: 4.5, pct: 1 }, { min: 4, pct: 0.9 }, { min: 0, pct: 0.5 }] };
  assert.equal(Kpi.score(three, v3, null, 1000, tab).finalPct, 1);
  assert.equal(Kpi.score(three, { file: { a: 0.91, b: 0.91, c: 0.97 } }, null, 1000, tab).finalPct, 0.9);
  assert.equal(Kpi.score(three, v3, null, 1000, { pctDp: 2 }).finalPct, 0.93);
  const att = { sched: 23, attended: 20 };
  assert.equal(Kpi.score(three, v3, att, 1000, { daysPct: 'full' }).target, 1000);
  assert.equal(Kpi.score(three, v3, att, 1000).earned, Math.round(1000 * 20 / 23 * 0.934 + 1e-9));
  assert.equal(Kpi.score(three, v3, att, 1000, { money: 'floor' }).earned, Math.floor(1000 * 20 / 23 * 0.934));
  assert.equal(Kpi.score(three, v3, att, 1000, { money: 'ceil' }).earned, Math.ceil(1000 * 20 / 23 * 0.934));
});
ok('how: every step of a score is there to explain it', () => {
  const r = Kpi.score(card55, { file: { a: 0.97, b: 0.91 } }, { sched: 23, attended: 20, absent: 2, runs: 2 }, 1000, pen), h = r.how;
  assert.deepEqual([h.fr, +h.fp.toFixed(12), h.s, h.a, h.ab, h.ex, h.c, h.b, h.e], [4.55, 0.91, 23, 20, 2, 8, 12, 1000, 475]);
  assert.deepEqual(h.kpis.map(x => [x.id, x.r, x.band]), [['a', 5, '≥ 95%'], ['b', 4, '≥ 90%']]);
  assert.deepEqual(h.pen, { k: 4, per: 'day', flat: 0, min: 1 });
  assert.equal(Kpi.bandOf(card55.kpis[0], 1), '< 80%'); assert.equal(Kpi.bandOf(card55.kpis[0], 1, 'out'), '≤ 80%');
});
ok('normCount keeps a saved section safe: unknown values take the default, numbers are clamped, codes are tidied and ordered', () => {
  const c = Kpi.normCount({ sched: ['Exam', ' SL ', 'Attend', 'AL', 'AL', 7, 'OFF'], lateOver: '-5', absentExtra: 99, absentPer: 'week', rankDp: 9, pctTable: [{ min: 4, pct: 0.9 }, { min: 'x' }, { min: 4.5, pct: 1 }], attitude: '(' });
  assert.deepEqual(c.sched, ['AL', 'SL', 'Exam']); assert.equal(c.lateOver, 0); assert.equal(c.absentExtra, 31); assert.equal(c.absentPer, 'day'); assert.equal(c.rankDp, 4);
  assert.deepEqual(c.pctTable, [{ min: 4.5, pct: 1 }, { min: 4, pct: 0.9 }]); assert.equal(c.attitude, Kpi.COUNT0().attitude);
  assert.deepEqual(Kpi.countDiff(null), {}); assert.deepEqual(Kpi.countDiff({ absentExtra: 4 }), { absentExtra: 4 });
  assert.equal(Kpi.dayRulesKey(null), Kpi.dayRulesKey(Kpi.COUNT0())); assert.notEqual(Kpi.dayRulesKey({ lateOver: 30 }), Kpi.dayRulesKey(null));
  assert.equal(Kpi.normCount(c), c);
});
ok('the incentive workbook follows the rules: extra code columns, and Actual days less the absence penalty', async () => {
  const ctx = synthCtx(5), cfg = { sched: [...Kpi.COUNT0().sched, 'Exam', 'Paternity'], absentExtra: 4, countedMin: 1 };
  const md = WriterInc.model(ctx, { count: cfg }), f = await files(await WriterInc.build(ctx, { model: md })), x = f['xl/worksheets/sheet1.xml'];
  assert.ok(x.includes('>Exam<') || x.includes('Exam'), 'an Exam column'); assert.ok(x.includes('Paternity leave'), 'a Paternity leave column');
  assert.match(x, /MIN\([A-Z]+3,MAX\(1,[A-Z]+3-\(4\*[A-Z]+3\)\)\)/, 'Actual days = MIN(Attend, MAX(1, Attend - 4 x Absent))');
  const someone = md.att.find(a => a.absent > 0 && a.attended > 0);
  assert.equal(someone.counted, Math.max(0, Math.min(someone.attended, Math.max(1, someone.attended - 4 * someone.absent))));
  assert.ok(md.att.every(a => a.counts.length === 10));
  const run = await files(await WriterInc.build(ctx, { model: WriterInc.model(ctx, { count: { absentExtra: 2, absentPer: 'run' } }) }));
  assert.match(run['xl/worksheets/sheet1.xml'], /MIN\([A-Z]+3,MAX\(0,[A-Z]+3-\(\d+\)\)\)/, 'per run: the days off as a number');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('ok', name); } catch (e) { failed++; console.log('FAIL', name, '\n ', e && e.message ? e.message.split('\n').slice(0, 12).join('\n  ') : e); }
  }
  console.log(`${n} checks passed${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exit(1);
})();
