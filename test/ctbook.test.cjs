// The CT team's incentive workbook (Core.parseDayBlocks, the recogniser), Node only, with the synthetic workbook of test/ctbook.cjs
// (made-up people and IDs): read as an attendance sheet, never a roster or the IDs file; each agent's days from the Attendance
// column of each day's block; the National ID, brand and department from the list on the sheet; the month's Utilization as the
// average of each day's %, as the workbook's own formula has it; the month from the dates; the merge takes the days by ID.
const assert = require('node:assert/strict');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Recog = require(js('recog_core.js')), Att = require(js('attendance.js')), Kpi = require(js('kpi.js')), Writer2 = require(js('writer2.js'));
const { ctBook } = require('./ctbook.cjs');
const F = globalThis.__FIX__;
let n = 0; const tests = [];
const ok = (name, fn) => tests.push([name, fn]);
const NAME = 'CT - Incentive - October.xlsx';

ok('read as an attendance sheet, day by day, with nothing else taken from it', async () => {
  const B = await ctBook(), D = await Core.analyzeFile(NAME, B.bytes);
  assert.deepEqual(D.map(d => d.kind), ['attendance'], 'one attendance detection, no roster: ' + D.map(d => d.kind).join(', '));
  const x = D[0].data;
  assert.equal(x.layout, 'dayBlocks'); assert.equal(D[0].sheet, 'CT');
  assert.equal(x.dates.length, 31); assert.deepEqual([x.dates[0], x.dates[30]].map(d => [d.y, d.m, d.d]), [[2026, 10, 1], [2026, 10, 31]]);
  assert.deepEqual(x.people.map(p => p.name), B.people.map(p => p.name), 'the agents, in order: not the hours rows, the legend or the list');
});

ok('each agent: the days, the National ID, brand and department from the list, the month\'s Utilization', async () => {
  const B = await ctBook(), x = (await Core.analyzeFile(NAME, B.bytes))[0].data;
  x.people.forEach((p, i) => {
    const e = B.people[i];
    assert.deepEqual(p.cells.map(([, v]) => v), e.days, `${e.name}: every day's code`);
    assert.equal(p.id, e.nid, `${e.name}: the National ID from the list, not the staff number`);
    assert.equal(p.team, 'Virgin'); assert.equal(p.dep, 'CT');
    assert.ok(Math.abs(p.util - e.util) < 1e-6, `${e.name}: Utilization ${p.util} = ${e.util}`);
    assert.equal(p.utilDays, e.days.filter(v => v === 'Attend').length, 'the % of each day worked');
  });
  assert.ok(x.people[0].util < 1 && x.people[0].util > 0.85, 'a 6-hour day counts 6/7, another task\'s hour counts too');
});

ok('the recogniser: a supervisor\'s attendance sheet for October 2026, sure, not the IDs file', async () => {
  const B = await ctBook(), r = await Recog.run('recog', NAME, B.bytes, { today: new Date('2026-11-03T09:00:00Z') });
  assert.equal(r.rec.kind, 'attendance'); assert.equal(r.rec.level, 'sure');
  assert.deepEqual([r.rec.month.y, r.rec.month.m], [2026, 10]); assert.ok(r.rec.month.from.includes('dates'), 'the month from the dates: ' + r.rec.month.from.join(', '));
  assert.equal(r.rec.people.n, B.people.length); assert.equal(r.rec.people.withId, B.people.length);
  assert.ok(/Day by day on "CT"/.test(r.rec.reasons[0]) && /Utilization/.test(r.rec.reasons[0]), r.rec.reasons[0]);
});

ok('the attendance merge takes the days by National ID; Exam and Unpaid are leave, the 4 AL days are AL', async () => {
  const B = await ctBook(), D = (await Core.analyzeFile(NAME, B.bytes)).map(d => ({ ...d, file: NAME }));
  const roster = F.roster.map((p, i) => ({ ...p, _id: 'p' + i }));
  const R = Att.merge(D, roster, { y: 2026, m: 10 });
  assert.equal(R.files[0].used, true); assert.equal(R.files[0].filled, B.people.length);
  assert.equal(R.unmatched.length, 0, 'everyone matched');
  const pid = roster.find(p => String(p.nid) === B.people[0].nid)._id, days = R.byPerson.get(pid).days;
  assert.deepEqual(days.slice(11, 15), ['AL', 'AL', 'AL', 'AL']);
  const p2 = roster.find(p => String(p.nid) === B.people[2].nid)._id; assert.equal(R.byPerson.get(p2).days[6], 'Exam');
  assert.ok(Att.LEAVE.has('Exam') && Att.LEAVE.has('Unpaid'));
  assert.ok(!R.warns.some(w => w.kind === 'code'), 'no unknown codes');
});

ok('the Utilization reads as the CT card\'s KPI value', async () => {
  const B = await ctBook(), x = (await Core.analyzeFile(NAME, B.bytes))[0].data, util = Kpi.DEFAULTS().teams.CT.kpis.find(k => k.id === 'util');
  assert.ok(util, 'the CT card has Utilization');
  const v = Kpi.fileValue(util, { [Kpi.key('Utilization')]: x.people[0].util });
  assert.ok(Math.abs(v - B.people[0].util) < 1e-6, `${v}`);
});

ok('a sheet with day columns but no Attendance in them is not taken for this layout', async () => {
  const W = new Writer2.Sheet('CT'), S = new Writer2.Styles();
  W.set(5, 3, new Date(Date.UTC(2026, 9, 1))); W.set(6, 1, 'ID'); W.set(6, 2, 'Name');
  for (let d = 0; d < 10; d++) ['TKT', 'hours', '%'].forEach((h, k) => W.set(6, 3 + d * 3 + k, h));
  W.set(7, 2, 'Hassan P.'); W.set(7, 3, 100);
  const D = await Core.analyzeFile(NAME, await Writer2.pack([W], S));
  assert.ok(!D.some(d => d.data && d.data.layout === 'dayBlocks'), D.map(d => d.kind).join(', '));
});

(async () => {
  for (const [name, fn] of tests) { await fn(); n++; console.log('ok ' + name); }
  console.log(`${n} checks passed`);
})().catch(e => { console.error('✗', e); process.exit(1); });
