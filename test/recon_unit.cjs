// Reconciling the old Excel with the tool, Node only, on synthetic workbooks (test/oldbooks.cjs: made-up people and IDs).
// The incentive data reader keeps what the old month needs (days as the tool counts them and as Excel counted them, cells typed with
// spaces, Unpaid, the Genesys spelling, a person split in two, a typed Adherence value), and js/recon.js finds each file's month and
// kind and explains each difference: own bases, the absence penalty, days, a missing value in the tool, typed-over Diff cells.
const assert = require('node:assert/strict');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Kpi = require(js('kpi.js')), History = require(js('history.js')), Recon = require(js('recon.js'));
const { oldBooks, excelCounts } = require('./oldbooks.cjs');
const TODAY = new Date(Date.UTC(2026, 9, 18));
let n = 0, failed = 0;
const tests = [], ok = (name, fn) => tests.push([name, fn]);

(async () => {
  const B = await oldBooks(), X = B.expect;
  const inc = await Core.readXlsx(B.inc), fin = await Core.readXlsx(B.final), ded = await Core.readXlsx(B.ded);
  const R = History.read(inc, { name: B.names.inc }), byN = nm => R.rows.find(r => Core.normName(r.n) === Core.normName(nm));

  ok('History.read: one row per person (the split person joined), the month from the date headers', () => {
    assert.equal(R.y, 2026); assert.equal(R.m, 8);
    assert.equal(R.rows.length, X.attRows, 'every attendance row once, the Genesys-only spelling joined to it');
  });
  ok('History.read: ks/ka/kat as the tool counts them, xl as Excel counted them; only the cells typed with a space differ', () => {
    for (const p of X.people) {
      const r = byN(p.name); assert.ok(r, p.name);
      assert.equal(r.ks, p.ks, `${p.name} scheduled`); assert.equal(r.kat, p.ka, `${p.name} attended`); assert.equal(r.ka, p.ka, `${p.name} counted (no penalty by default)`);
      assert.deepEqual([r.xl.ks, r.xl.ka], [p.ks, p.ka], `${p.name} Excel's own columns`);
      assert.equal(r.codeIssues, undefined);
    }
    const a = byN(X.slA.name), b = byN(X.slB.name);
    assert.deepEqual([a.ks, a.kat, a.xl.ks, a.xl.ka], [23, 21, 21, 21], "two 'SL ' cells: the tool counts them, Excel does not");
    assert.deepEqual(a.codeIssues.map(x => [x.day, x.raw, x.v]), [[9, 'SL ', 'SL'], [10, 'SL ', 'SL']]);
    assert.deepEqual([b.ks, b.xl.ks, b.codeIssues.length], [22, 21, 1]);
    assert.equal(byN(X.people[2].name).al, 5, "'Al' is annual leave for both");
  });
  ok('History.read: Unpaid stays (dx) and counts as scheduled, as the workbook counts it', () => {
    const u = byN(X.unpaid.name), unpaid = Object.values(u.dx || {}).filter(v => v === 'Unpaid').length;
    assert.ok(unpaid > 10, 'Unpaid days kept'); assert.equal(u.ks, u.xl.ks); assert.equal(u.kat, u.xl.ka);
    assert.equal(u.ks, u.kat + unpaid);
  });
  ok("History.read: the person split in two ('NA' / '#N/A', two spellings) is one row with the Genesys spelling", () => {
    const s = byN(X.split.name);
    assert.ok(s && s.d && s.adh != null && s.aht != null, 'attendance, adherence and AHT in one row');
    assert.equal(s.split, X.split.gname); assert.equal(s.gn, X.split.gname); assert.equal(s.badId, 'NA / #N/A'); assert.ok(!s.id, 'no ID');
    assert.equal(byN(X.split.gname), undefined);
    assert.equal(R.rows.filter(r => r.gn).length, 1, 'nobody else has another spelling');
  });
  ok('History.read: an Adherence value typed over the daily average keeps both', () => {
    const t = byN(X.typed.name);
    assert.ok(Math.abs(t.adh - X.typed.tab) < 1e-6); assert.ok(Math.abs(t.adhDt - X.typed.avg) < 1e-6);
    assert.equal(R.rows.filter(r => r.adhDt != null).length, 1);
  });
  ok('History.read with the month\'s rules: counted days less the penalty, attended kept apart', () => {
    const R2 = History.read(inc, { count: { absentExtra: 4, countedMin: 1 } }), c0 = R2.rows.find(r => r.n === X.people[6].name);
    assert.deepEqual([c0.ks, c0.kat, c0.ka], [23, 20, 12]);
  });
  ok('History.fromModel: the adherence and AHT rows of a person with no ID join their attendance row and keep the Genesys spelling', () => {
    const md = { y: 2026, m: 8, att: [{ pid: 'p1', id: '', name: 'Roster Name', brand: 'Virgin', team: 'CC', days: ['Attend', 'OFF'], tardy: 0 }],
      det: [{ pid: 'p1', id: '', name: 'Genesys Name', avg: 0.97, under: 0, counted: 1 }], adh: [{ pid: 'p1', id: '', name: 'Genesys Name', avg: 0.97 }], aht: [{ pid: 'p1', id: '', name: 'Genesys Name', sec: 150 }] };
    const out = History.fromModel(md, null);
    assert.equal(out.rows.length, 1); assert.deepEqual([out.rows[0].n, out.rows[0].gn, out.rows[0].adh, out.rows[0].aht], ['Roster Name', 'Genesys Name', 0.97, 150]);
  });

  ok('classify and monthOf: the kind and month of each file; the deduction workbook named 2026-08 holds Sep 2026', () => {
    const a = Recon.classify(inc, B.names.inc, { today: TODAY }), f = Recon.classify(fin, B.names.final, { today: TODAY }), d = Recon.classify(ded, B.names.ded, { today: TODAY });
    assert.deepEqual([a.kind, a.month, a.src, a.conflict], ['inc', '2026-08', 'dates', null]);
    assert.deepEqual([f.kind, f.month, f.src, f.conflict], ['final', '2026-08', 'name', null]);
    assert.deepEqual([d.kind, d.month, d.src, d.title, d.dates, d.name], ['ded', '2026-09', 'dates', '2026-09', '2026-09', '2026-08']);
    assert.deepEqual(d.conflict, { name: '2026-08', content: '2026-09' });
  });
  ok('nameMonth and titleMonth: numbers, words, a month alone (the latest not after today)', () => {
    assert.equal(Recon.nameMonth('Final_result_for_Aug.xlsx', TODAY), '2026-08');
    assert.equal(Recon.nameMonth('Final_result_for_Aug.xlsx', new Date(Date.UTC(2026, 2, 1))), '2025-08');
    assert.equal(Recon.nameMonth('Adherence August 2026.xlsx', TODAY), '2026-08');
    assert.equal(Recon.nameMonth('x_2026-09.xlsx', TODAY), '2026-09');
    assert.equal(Recon.nameMonth('Deduction.xlsx', TODAY), '');
    assert.equal(Recon.titleMonth('MC Monthly Deduction - Sep - 2026'), '2026-09');
    assert.equal(Recon.titleMonth('2026 - Dec'), '2026-12');
    assert.equal(Recon.titleMonth('Final %'), '');
  });

  ok('inferBase: whole bases that give the old earned SR, and the ranges', () => {
    const b = Recon.inferBase({ E: 1520, F: 0.95, ks: 22, ka: 22 });
    assert.deepEqual(b.ints, [1600]); assert.ok(Math.abs(b.lo - 1599.474) < 0.01 && Math.abs(b.hi - 1600.526) < 0.01);
    assert.ok(Math.abs(b.loAny - 1592.77) < 0.01 && Math.abs(b.hiAny - 1607.29) < 0.01, `${b.loAny} ${b.hiAny}`);
    const want = { 1600: 3, 1580: 1, 1545: 1, 1648: 1 }, got = {}, list = [];
    for (const p of X.people.filter(x => x.base !== 1000)) { const r = Recon.inferBase({ E: p.E, F: p.F, ks: p.ks, ka: p.ka }); assert.ok(r.ints.includes(p.base), `${p.name}: ${r.ints}`); list.push({ key: p.pid, ...r }); }
    for (const b2 of Recon.pickBases(list).values()) got[b2] = (got[b2] || 0) + 1;
    assert.deepEqual(got, want);
    assert.equal(Recon.pickBases([{ key: 'a', ints: [1600] }, { key: 'b', ints: [1600, 1601] }, { key: 'c', ints: [1599, 1600] }]).get('b'), 1600);
    assert.equal(Recon.inferBase({ E: 0, F: 0.9, ks: 22, ka: 20 }), null);
  });
  ok('penaltyDays: the old process took 8 and 12 days off; nobody else lost days', () => {
    const [n1, n2] = X.people.filter(p => p.cut);
    assert.equal(Recon.penaltyDays({ E: n1.E, F: n1.F, ks: n1.ks, ka: n1.ka, base: 1000 }), 8);
    assert.equal(Recon.penaltyDays({ E: n2.E, F: n2.F, ks: n2.ks, ka: n2.ka, base: 1000 }), 12);
    for (const p of X.people.filter(x => !x.cut)) assert.equal(Recon.penaltyDays({ E: p.E, F: p.F, ks: p.ks, ka: p.ka, base: p.base }), null, p.name);
  });
  ok('fitAbsence: no rule with one setting fits both cases; two rules with two settings do, so the two cases cannot decide', () => {
    const cases = X.people.filter(p => p.cut).map(p => { const r = byN(p.name); return { absent: r.absent, runs: r.kr, ka: r.kat, ks: r.ks, F: p.F, base: 1000, E: p.E }; });
    assert.deepEqual(cases.map(c => [c.absent, c.runs]), [[2, 2], [4, 2]]);
    const f = Recon.fitAbsence(cases);
    assert.equal(f.one.length, 0, 'no one-setting rule'); assert.equal(f.least, 2); assert.equal(f.decided, false);
    assert.deepEqual(f.two.map(x => x.params), [{ absentExtra: 2, absentPer: 'day', absentFlat: 4, countedMin: 0 }, { absentExtra: 4, absentPer: 'day', absentFlat: 0, countedMin: 1 }]);
    assert.equal(f.two[1].text, '4 more days off per absent day, never below 1 counted day');
    for (const fit of f.fits) for (const c of cases) assert.equal(Recon.earnedOf({ base: 1000, sched: c.ks, attended: c.ka, absent: c.absent, runs: c.runs, fin: c.F }, fit.params), c.E);
    const one = Recon.fitAbsence([{ ...cases[0] }, { absent: 1, runs: 1, ka: 21, ks: 22, F: 0.9, base: 1000, E: Recon.earnedOf({ base: 1000, sched: 22, attended: 21, absent: 1, runs: 1, fin: 0.9 }, { absentExtra: 4 }) }, { absent: 3, runs: 1, ka: 19, ks: 22, F: 1, base: 1000, E: Recon.earnedOf({ base: 1000, sched: 22, attended: 19, absent: 3, runs: 1, fin: 1 }, { absentExtra: 4 }) }]);
    assert.deepEqual(one.one.map(x => x.params), [{ absentExtra: 4, absentPer: 'day', absentFlat: 0, countedMin: 0 }]); assert.equal(one.decided, true, 'three cases decide a one-setting rule');
  });
  ok('dedCheck: three Diff cells typed over with 0, and the totals by the rule', () => {
    const S = ded.find(s => s.name === 'Monthly Deduction'), d = Recon.dedCheck(S);
    assert.equal(d.month, '2026-09'); assert.equal(d.people, 4);
    assert.deepEqual(d.exceptions.map(x => [x.name, x.day, x.S, x.A, x.D, x.rule]), X.typedOver.map(t => [t.name, t.day, t.S, t.A, 0, t.rule]));
    assert.equal(d.sheetTotal, X.sheetTotal); assert.equal(d.ruleTotal, X.ruleTotal); assert.equal(d.ruleTotal - d.sheetTotal, 345 + 185 + 293);
    assert.equal(Recon.dedRule(480, 0), 0); assert.equal(Recon.dedRule(480, 500), 0); assert.equal(Recon.dedRule(null, 400), null);
  });
  ok('cellsOf and statusOf: a missing tool value is never the same; Final % at the old file\'s decimals', () => {
    const c = Recon.cellsOf({ fin: 0.95, earned: 1520 }, { fin: null, earned: null }, ['fin', 'earned'], 2);
    assert.deepEqual(c.map(x => x.missing), [true, true]); assert.equal(Recon.statusOf(c), 'noTool');
    assert.equal(Recon.statusOf(Recon.cellsOf({ fin: 0.95 }, { fin: 0.946 }, ['fin'], 2)), 'same');
    assert.equal(Recon.statusOf(Recon.cellsOf({ fin: 0.95 }, { fin: 0.946 }, ['fin'], 3)), 'diff');
    assert.equal(Recon.statusOf(Recon.cellsOf({ fin: 0.95, earned: 900 }, { fin: null, earned: 905 }, ['fin', 'earned'])), 'diff');
    assert.equal(Recon.finalPrecision([0.95, 1, 0.83]), 2); assert.equal(Recon.finalPrecision([0.95, 0.955]), 3);
  });
  ok('explain: no scorecard and an own base; the absence penalty; days counted differently; nothing to explain', () => {
    const p0 = X.people[0], e0 = Recon.explain({ fin: p0.F, earned: p0.E }, { fin: null, earned: null, card: false, team: 'OP', ks: p0.ks, ka: p0.ka, base: 1000, scored: false });
    assert.deepEqual(e0.causes.map(c => c.kind), ['noCard', 'base']); assert.deepEqual(e0.causes[1].ints, [1600]); assert.equal(e0.ref, 950);
    const n1 = X.people[6], r1 = byN(n1.name), e1 = Recon.explain({ fin: n1.F, earned: n1.E }, { fin: null, earned: null, card: true, ks: r1.ks, ka: r1.kat, absent: r1.absent, runs: r1.kr, base: 1000, scored: false });
    assert.deepEqual(e1.causes.map(c => [c.kind, c.P]), [['noTool', undefined], ['absence', 8]]); assert.equal(e1.causes[0].why, 'incentive'); assert.equal(e1.ref, 791);
    const n2 = X.people[7], r2 = byN(n2.name), e2 = Recon.explain({ fin: n2.F, earned: n2.E }, { fin: 0.92, earned: 520, card: true, ks: r2.ks, ka: r2.kat, absent: r2.absent, runs: r2.kr, base: 1000 });
    assert.deepEqual(e2.causes.map(c => [c.kind, c.P]), [['absence', 12]]); assert.equal(e2.ref, 520);
    const ok2 = X.people[8], e3 = Recon.explain({ fin: ok2.F, earned: ok2.E }, { fin: ok2.F, earned: ok2.E, card: true, ks: ok2.ks, ka: ok2.ka, base: 1000 });
    assert.deepEqual(e3.causes, []);
    const a = byN(X.slA.name), e4 = Recon.explain({ ks: a.xl.ks, ka: a.xl.ka, issues: 2 }, { ks: a.ks, ka: a.kat, card: true });
    assert.deepEqual(e4.causes.map(c => [c.kind, c.old.ks, c.tool.ks, c.issues]), [['days', 21, 23, 2]]);
    const e5 = Recon.explain({ fin: 0.92 }, { fin: 0.9, card: true, missing: [], valDp: 0 });
    assert.deepEqual(e5.causes.map(c => [c.kind, c.valDp]), [['fin', 0]]);
  });
  ok("entryProblems: 'SL ' people and cells, the split person, the typed value, IDs that are not numbers", () => {
    const e = Recon.entryProblems(R.rows);
    assert.deepEqual(e.spaces.map(x => [x.n, x.cells]).sort(), [[X.slA.name, 2], [X.slB.name, 1]].sort()); assert.equal(e.cells, 3); assert.equal(e.counted, 2);
    assert.deepEqual(e.split.map(x => [x.n, x.other]), [[X.split.name, X.split.gname]]);
    assert.deepEqual(e.typed.map(x => x.n), [X.typed.name]); assert.deepEqual(e.badId.map(x => x.badId), ['NA / #N/A']);
  });
  ok('the old Excel counts days like excelCounts (the synthetic books are what they claim)', () => {
    assert.deepEqual(excelCounts(['SL ', 'SL', 'Al', 'AL', 'Attend', 'OFF']), { al: 2, sl: 1, pat: 0, exam: 0, nd: 0, unpaid: 0, absent: 0, attend: 1, ks: 4, ka: 1 });
    assert.equal(Kpi.countDays(['SL ', 'SL', 'Al', 'AL', 'Attend', 'OFF'].map(v => { const x = require(js('attendance.js')).normCode(v); return x.v; })).sched, 5);
  });

  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('ok', name); } catch (e) { failed++; console.log('FAIL', name, '\n ', e && e.message ? e.message.split('\n').slice(0, 14).join('\n  ') : e); }
  }
  console.log(`${n} checks passed${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
