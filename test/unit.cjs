// Checks that need only Node (no browser): the pure modules load, the incentive formula and the code tidying behave as the
// user guide says, and the built page (when `npm run build` made it) is one self-contained file. Synthetic values only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);

const Core = require(js('core.js'));
const Kpi = require(js('kpi.js'));
const Att = require(js('attendance.js'));
const History = require(js('history.js'));
const Writer2 = require(js('writer2.js'));
const WriterInc = require(js('writer_inc.js'));
const Glue = require(js('glue.js'));
const Forms = require(js('forms.js'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

ok('modules load', () => { for (const m of [Core, Kpi, Att, History, Writer2, WriterInc, Glue, Forms]) assert.equal(typeof m, 'object'); });

ok('built-in scorecards are valid', () => assert.deepEqual(Kpi.validate(Kpi.DEFAULTS()), []));

ok('earned = base x actual/scheduled x final %, rounded (guide: 22 / 18 at 87% -> 712)', () => {
  const card = { kpis: [
    { id: 'a', name: 'A', src: 'file', unit: 'pct', dir: 'high', weight: 0.35, bands: [0.95, 0.9, 0.85, 0.8] },
    { id: 'b', name: 'B', src: 'file', unit: 'pct', dir: 'high', weight: 0.65, bands: [0.95, 0.9, 0.85, 0.8] },
  ] };
  const r = Kpi.score(card, { file: { a: 0.97, b: 0.91 } }, { sched: 22, actual: 18 }, 1000);
  assert.equal(r.finalRank, 4.35);
  assert.ok(Math.abs(r.finalPct - 0.87) < 1e-12);
  assert.equal(r.earned, 712);
  assert.equal(r.target, 818);
});

ok('a KPI with no value is left out and the other weights scale up', () => {
  const card = Kpi.DEFAULTS().teams.CC;
  const r = Kpi.score(card, { adh: 0.97, aht: 140, tardy: 0, file: { csat: 0.9, qobs: 0.96 } }, { sched: 20, actual: 20 }, 1000);
  assert.equal(r.finalRank, 5);
  assert.deepEqual(r.missing.sort(), ['Call Reason & FCR Accuracy', 'Empowerment Utilization']);
});

ok('day codes are tidied whatever the spelling', () => {
  assert.equal(Att.normCode('SL ').v, 'SL');
  assert.equal(Att.normCode('Al').v, 'AL');
  assert.equal(Att.normCode('AL leave').v, 'AL');
  assert.equal(Att.normCode('SL leaves').v, 'SL');
});

ok('names compare without spaces or case', () => {
  assert.equal(Core.normName('  Lina  SALEH '), Core.normName('lina saleh'));
  assert.equal(Core.nameScore('Lina Ahmed Saleh', 'Lina Saleh') >= 0.86, true);
});

const built = path.join(__dirname, '..', 'out', 'mc.html');
if (fs.existsSync(built)) ok('the built page is one self-contained file', () => {
  const html = fs.readFileSync(built, 'utf8');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<i id="mcEnd" hidden></i>'));
  assert.ok(!/<script[^>]+src=/i.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href="https?:/i.test(html), 'no external stylesheets');
  assert.ok(Buffer.byteLength(html) < 16 * 1024 * 1024);
});

ok('joining dates: an Excel date or serial, 2026-01-18, 18/01/2026 (day first), 01/18/2026, 18-Jan-2026, 18 January 2026; nonsense is empty', () => {
  for (const v of [46040, '46040', '2026-01-18', '18/01/2026', '01/18/2026', '18-Jan-2026', '18 January 2026', 'Jan 18, 2026', new Date(Date.UTC(2026, 0, 18))]) assert.equal(Core.cleanDate(v), '2026-01-18', String(v));
  assert.equal(Core.cleanDate('05/03/2026'), '2026-03-05', 'day first when both could be a month');
  for (const v of ['', null, 'NA', '31/02/2026', '2026-13-01', 12, 'soon']) assert.equal(Core.cleanDate(v), '', String(v));
});
ok('a roster with a "Joining date" column gives each person their joining date (synthetic people)', () => {
  const rows = [['Name', 'National ID', 'Brand', 'Team', 'Joining date'], ['Lina A.', '1000000001', 'Virgin', 'CC', '18/01/2026'], ['Omar B.', '1000000002', 'Virgin', 'CC', 46100], ['Sara C.', '1000000003', 'Friendi', 'CC', '']];
  const sheets = [{ name: 'Roster', rows }], d = Core.analyzeTables ? Core.analyzeTables('roster.xlsx', sheets) : null;
  const R = (d || []).find(x => x.kind === 'roster');
  assert.ok(R, 'read as a roster');
  assert.deepEqual(R.data.map(x => [x.name, x.joined]), [['Lina A.', '2026-01-18'], ['Omar B.', '2026-03-19'], ['Sara C.', '']]);
});

ok('an attendance sheet with its legend under the names, and another table below: only the people are read (synthetic, Nov 2026)', () => {
  const days = Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(2026, 10, i + 1)));
  const row = (id, name, team, dep, f) => [id, name, team, dep, ...days.map((_, i) => f(i + 1))];
  const rows = [['ID', 'Name', 'Team', 'Dep', ...days],
    row('1000000001', 'Lina A.', 'Virgin', 'CC', d => (d === 3 ? 'SL' : [6, 7].includes(d) ? 'OFF' : 'Attend')),
    row('1000000002', 'Omar B.', 'Virgin', 'CC', d => (d === 4 ? 'Absent' : [6, 7].includes(d) ? 'OFF' : 'Attend')),
    row('1000000003', 'Sara C.', 'Friendi', 'CC', d => ([6, 7].includes(d) ? 'OFF' : 'Attend')),
    [],
    // the legend under the names, a second table beside it (its heading row, then its people in the day columns), as a supervisor's sheet had
    ['', 'Absent', '', '', '', '', 'Attend', 'Rami D.', 'Friendi', 'CT'],
    ['', 'After', '', '', '', '', 'ID', 'Name', 'Team', 'Dep'],
    ['', 'AL', '', '', '', '', 'Attend', 'Hadi E.', 'Friendi', 'CT'],
    ['', 'Attend', '', '', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
    ['', 'compassion leave', '', '', '', '', 'Attend', 'Muna F.', 'Virgin', 'CT'],
    ['', 'Exam'], ['', 'OFF'], ['', 'SL'], ['', 'Unpaid'], ['', 'Half AL'], ['', 'EID'], ['', 'Paternity leave']];
  const d = Core.analyzeTables('Attendance Nov 2026.xlsx', [{ name: 'Attendance', state: 'visible', rows }]), A = (d || []).find(x => x.kind === 'attendance');
  assert.ok(A, 'read as an attendance sheet');
  assert.deepEqual(A.data.people.map(p => p.name), ['Lina A.', 'Omar B.', 'Sara C.'], 'the legend and the other table are not people');
  for (const w of ['Absent', 'After', 'AL', 'Attend', 'compassion leave', 'Exam', 'OFF', 'SL', 'Unpaid', 'Name', 'Sun']) assert.ok(Core.notAPerson(w), w);
  for (const w of ['Lina A.', 'Eid Mohammed', 'Ali', 'Sami Al Examiner']) assert.ok(!Core.notAPerson(w), w);
  // a roster sheet with the same legend under its names
  const R = (Core.analyzeTables('roster.xlsx', [{ name: 'Roster', rows: [['Name', 'National ID', 'Brand', 'Team'], ['Lina A.', '1000000001', 'Virgin', 'CC'], ['OFF', '', '', ''], ['Attend', '', '', ''], ['compassion leave', '', '', '']] }]) || []).find(x => x.kind === 'roster');
  assert.deepEqual(R.data.map(x => x.name), ['Lina A.'], 'nor in a roster');
});

ok('the teams\' own layouts (synthetic): 1–13 Nov then 14–31 Oct with the codes under the names; a row of weekdays under the dates; two tables on one tab', () => {
  const D = (m, d) => new Date(Date.UTC(2026, m - 1, d)), nov = Array.from({ length: 13 }, (_, i) => D(11, i + 1)), oct = Array.from({ length: 18 }, (_, i) => D(10, 14 + i));
  const roster = [{ _id: 'a', name: 'Lina A.', nid: '1000000001', brand: 'Virgin', team: 'CC' }, { _id: 'b', name: 'Omar B.', nid: '1000000002', brand: 'Virgin', team: 'CC' }, { _id: 'c', name: 'Sara C.', nid: '1000000003', brand: 'Friendi', team: 'QA' }];
  const read = (rows, name = 'Sheet1') => (Core.analyzeTables('t.xlsx', [{ name, state: 'visible', rows }]) || []).find(x => x.kind === 'attendance');
  const nov13 = (A, pid) => Att.merge([{ file: 't.xlsx', sheet: 'x', data: A.data }], roster, { y: 2026, m: 11 }).byPerson.get(pid);
  // a supervisor's period sheet: its November days first, then October's from the 14th, then the code list under the names
  const T = read([[], ['ID', 'Name', 'Team', 'Dep', ...nov, ...oct, 'Tardy', 'AL leave'],
    ['1000000001', 'Lina A.', 'Virgin', 'CC', ...nov.map((_, i) => ([5, 6].includes(i) ? 'OFF' : 'Attend')), 'OFF'],
    ['', 'Omar B.', 'Virgin', 'CC', ...nov.map((_, i) => (i === 2 ? 10 : i === 3 ? 'SL leaves' : 'Attend')), 'OFF'], [], [],
    ...['OFF', 'Attend', 'AL', 'Absent', 'Unpaid', 'Half AL', 'Compassionate Leave', 'EID', 'Paternity leave', 'Exam', 'SL'].map(w => ['', w])], 'Attendance Report Template ');
  assert.deepEqual(T.data.people.map(p => p.name), ['Lina A.', 'Omar B.'], 'the people, not the codes');
  const o = nov13(T, 'b'); assert.equal(o.days.filter(v => v != null).length, 13, 'Omar: 1–13 Nov'); assert.equal(o.days[2], 10, 'late 10 min on the 3rd'); assert.equal(o.days[3], 'SL'); assert.equal(o.days[13], null, 'nothing past the 13th');
  // a name-only sheet with a row of weekdays under the dates, "Attend" in its name cell
  const M = read([['Name', ...nov.slice(0, 12)], ['Attend', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'], ['Lina A.', ...nov.slice(0, 12).map(() => 'Attend')]]);
  assert.deepEqual(M.data.people.map(p => p.name), ['Lina A.'], 'the weekdays row is not a person');
  // two tables on one tab, each with its heading row
  const Q = read([[], [], [], ['ID', 'Name', 'Team', 'Dep', ...nov], ['1000000001', 'Lina A.', 'Virgin', 'QA', ...nov.map(() => 'Attend')], [], [], [],
    ['ID', 'Name', 'Team', 'Dep', ...nov], ['1000000003', 'Sara C.', 'Friendi', 'QA', ...nov.map(() => 'OFF')]], 'Nov');
  assert.deepEqual(Q.data.people.map(p => p.name), ['Lina A.', 'Sara C.'], 'both tables\' people, not the second heading');
});

console.log(`${n} checks passed`);
