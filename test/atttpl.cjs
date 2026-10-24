// The supervisors' attendance template and the emails' workbooks, Node only, synthetic people only.
// 1. AttTpl makes a department's template (How to fill, Attendance, Team, a hidden _mc); filled like a supervisor would, Core reads it
//    back as every day of the month: weekly days off (inside a leave too), ranges, late minutes, first days, someone not on the Team
//    sheet, a date of another month.
// 2. Att.merge takes the template like any attendance sheet.
// 3. Writer2.dedMail: only 'Attendance Report' and 'Monthly Deduction', values, laid out like the old Monthly Deduction file, no IDs.
// 4. The incentive email's workbook: no ID column; a dropped workbook has its ID columns emptied.
const assert = require('node:assert/strict');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Writer2 = require(js('writer2.js')), AttTpl = require(js('atttpl.js')), Att = require(js('attendance.js')), WriterInc = require(js('writer_inc.js'));
let n = 0, failed = 0; const tests = []; const ok = (name, fn) => tests.push([name, fn]);
const PEOPLE = [{ id: '1000000001', name: 'Lina A.', brand: 'Virgin', team: 'TS' }, { id: '1000000002', name: 'Omar B.', brand: 'Virgin', team: 'MG' }, { id: '', name: 'Sara C.', brand: 'Virgin', team: 'QA' }];
const D = (d, m = 9) => new Date(Date.UTC(2026, m - 1, d));
/** the template's tables, filled in: rows from row 5 of Attendance ([date, to, name, type, minutes]) and changes on the Team sheet */
async function filled(rows, team = {}) {
  const T = await Core.readXlsx(await AttTpl.build({ y: 2026, m: 9, dep: 'TS', depName: 'Tele-Sales', spv: 'Faisal M.', spvPid: 'p3', people: PEOPLE, at: '2026-10-24' }));
  const A = T.find(t => t.name === 'Attendance'), TE = T.find(t => t.name === 'Team');
  rows.forEach(([date, to, name, type, min], i) => { const r = A.rows[4 + i] = A.rows[4 + i] || []; Object.assign(r, { 0: date, 1: to, 2: name, 4: type, 5: min }); });
  for (const [i, o] of Object.entries(team)) Object.assign(TE.rows[4 + +i], o);
  return T;
}
const show = cells => cells.map(([, v]) => (v == null ? '.' : v === 'Attend' ? 'A' : v === 'OFF' ? 'o' : String(v)));

ok('a department\'s template: How to fill first, Attendance (the exceptions), Team (everyone, with Fri, Sat off), and a hidden _mc that names it, its month and department', async () => {
  const bytes = await AttTpl.build({ y: 2026, m: 9, dep: 'TS', depName: 'Tele-Sales', spv: 'Faisal M.', spvPid: 'p3', people: PEOPLE });
  const T = await Core.readXlsx(bytes);
  assert.deepEqual(T.map(t => [t.name, t.state]), [['How to fill', 'visible'], ['Attendance', 'visible'], ['Team', 'visible'], ['_mc', 'hidden']]);
  const HF = T[0], A = T[1], TE = T[2], X = T[3];
  assert.equal(HF.rows[0][0], 'How to fill the attendance template'); assert.equal(HF.rows[1][0], 'TS – Tele-Sales · Faisal M. · September 2026');
  assert.ok(HF.rows.some(r => r && /^Several days in a row/.test(r[1] || '')), 'the steps say how to write a leave of several days');
  assert.equal(A.rows[0][0], 'Attendance · September 2026 · TS – Tele-Sales · Faisal M.');
  // the tips on the cells, and the checks that turn a cell amber or red
  const sh = await (await Core.readZip(bytes)).text('xl/worksheets/sheet2.xml');
  assert.match(sh, /promptTitle="To \(several days\)" prompt="Only for several days in a row: the last day\./);
  assert.ok(sh.includes('<formula>AND($E5=&quot;Late&quot;,$F5=&quot;&quot;)</formula>'), 'Late without minutes turns the cell amber');
  assert.deepEqual(A.rows[3].slice(0, 7), ['Date', 'To (several days)', 'Name', 'ID', 'Type', 'Minutes late', 'Note']);
  assert.deepEqual(TE.rows[3].slice(0, 7), ['ID', 'Name', 'Brand', 'Dep', 'Weekly days off', 'First day', 'Last day']);
  assert.deepEqual(TE.rows.slice(4, 7).map(r => [r[0] ?? '', r[1], r[3], r[4]]), [[1000000001, 'Lina A.', 'TS', 'Fri, Sat'], [1000000002, 'Omar B.', 'MG', 'Fri, Sat'], ['', 'Sara C.', 'QA', 'Fri, Sat']]);
  assert.deepEqual(X.rows.slice(0, 4).map(r => r.slice(0, 2)), [[Core.ATT_TPL_MARK, 1], ['month', '2026-09'], ['dep', 'TS'], ['supervisor', 'Faisal M.']]);
  assert.equal(AttTpl.fileName(2026, 9, 'TS'), 'Attendance - Sep 2026 - TS.xlsx');
  assert.equal(AttTpl.fileName(2026, 9, 'CT', 'Ghada S.'), 'Attendance - Sep 2026 - CT - Ghada S..xlsx', 'one supervisor\'s part of a department');
  // an empty template is everyone attending every working day
  const d = Core.parseAttTemplate(T);
  assert.equal(d.kind, 'attendance'); assert.equal(d.data.dates.length, 30); assert.equal(d.data.people.length, 3); assert.equal(d.data.template.dep, 'TS');
  assert.equal(show(d.data.people[0].cells).join(''), 'AAAooAAAAAooAAAAAooAAAAAooAAAA', 'Sep 2026 starts on a Tuesday: Fri 4 and Sat 5 are off');
});
ok('filled in: an absence, a leave over several days, late minutes, a later first day with Saturdays off only, someone new, a date of another month', async () => {
  const T = await filled([[D(3), null, 'Lina A.', 'Absent'], [D(7), D(10), 'Omar B.', 'AL leave'], [D(8), null, 'Lina A.', 'Late', 25], [D(2, 10), null, 'Sara C.', 'SL leave'],
    [D(15), null, 'Nada Z.', 'Day off'], [D(16), null, 'Lina A.', 'Late'], ['', '', '', '', ''], [D(24), D(28), 'Lina A.', 'SL leave']], { 2: { 4: 'Sat', 5: D(14) } });
  const d = Core.parseAttTemplate(T), P = Object.fromEntries(d.data.people.map(p => [p.name, show(p.cells)]));
  assert.equal(P['Lina A.'][2], 'Absent'); assert.equal(P['Lina A.'][7], '25'); assert.equal(P['Lina A.'][15], 'A', 'Late with no minutes counts as attended');
  assert.deepEqual(P['Omar B.'].slice(6, 10), ['AL', 'AL', 'AL', 'AL']);
  assert.deepEqual(P['Lina A.'].slice(23, 28), ['SL', 'o', 'o', 'SL', 'SL'], 'a leave from Thu 24 to Mon 28: Fri 25 and Sat 26 stay weekly days off');
  assert.deepEqual(P['Sara C.'].slice(0, 13), Array(13).fill('.'), 'nothing before the first day'); assert.equal(P['Sara C.'][18], 'o'); assert.equal(P['Sara C.'][17], 'A', 'Friday 18 is a working day for her');
  assert.equal(P['Nada Z.'][14], 'OFF'.replace('OFF', 'o')); assert.equal(P['Nada Z.'][3], 'o', 'someone new takes the usual days off');
  assert.equal(d.data.template.entries, 6);
  assert.ok(d.data.template.warns.some(w => /Row 8 \(Sara C\.\): the date is not in Sep 2026/.test(w)), d.data.template.warns.join(' | '));
  assert.ok(d.data.template.warns.some(w => /Nada Z\. is not on the Team sheet/.test(w)));
  assert.ok(d.data.template.warns.some(w => /Late with no minutes/.test(w)));
  // the engine reads the workbook as the template, and Att.merge takes it like any attendance sheet
  const dets = Core.analyzeTables('Attendance - Sep 2026 - Faisal M..xlsx', T);
  assert.deepEqual(dets.map(x => [x.kind, x.sheet]), [['attendance', 'Attendance (template)']]);
  const roster = PEOPLE.map((p, i) => ({ _id: 'p' + i, name: p.name, nid: p.id, brand: p.brand, team: p.team, status: 'Active' }));
  const R = Att.merge(dets.map(x => ({ ...x, file: 'Attendance - Sep 2026 - Faisal M..xlsx' })), roster, { y: 2026, m: 9 });
  assert.equal(R.byPerson.get('p0').days[2], 'Absent'); assert.equal(R.byPerson.get('p0').dayTardy, 25); assert.equal(R.byPerson.get('p1').days[6], 'AL');
  assert.deepEqual(R.unmatched.map(u => u.name), ['Nada Z.']);
});
ok('a template whose Team or Attendance sheet was deleted says so; a workbook without the mark is not the template', async () => {
  const T = await filled([]);
  assert.equal(Core.parseAttTemplate(T.filter(t => t.name !== 'Team')).kind, 'error');
  assert.equal(Core.parseAttTemplate(T.filter(t => t.name !== '_mc')), null);
});
ok('the deduction email\'s workbook: only Attendance Report and Monthly Deduction, values, with the counts and each day\'s Diff', async () => {
  const days = Array.from({ length: 30 }, (_, k) => ([3, 4, 10, 11].includes(k) ? 'OFF' : k === 1 ? 'Absent' : k === 2 ? 'SL' : k === 5 ? 'AL' : k === 6 ? 15 : k === 22 ? 'National Day' : 'Attend'));
  const att = [{ id: '1000000001', name: 'Lina A.', brand: 'Virgin', team: 'CC', days, tardy: 15, sched: 26, actual: 21 }];
  const ded = [{ id: '1000000001', name: 'Lina A.', brand: 'Virgin', team: 'CC', sched: days.map(v => (v === 'OFF' ? null : 480)), act: days.map(v => (v === 'OFF' ? null : v === 'Absent' || v === 'SL' ? 0 : 470)), total: 0 },
    { id: '1000000003', name: 'Sara C.', brand: 'Virgin', team: 'CC', sched: null, act: null, total: 35 }];
  const T = await Core.readXlsx(await Writer2.dedMail({ y: 2026, m: 9, att, ded }));
  assert.deepEqual(T.map(t => t.name), ['Attendance Report', 'Monthly Deduction']);
  const A = T[0].rows, M = T[1].rows;
  assert.equal(A[0][0], 'MC Monthly Attendance - Sep - 2026');
  const H = A[1]; assert.deepEqual(H.slice(0, 3), ['Name', 'Team', 'Dep'], 'no ID column: the agents\' privacy'); assert.ok(H[3] instanceof Date);
  assert.deepEqual(H.slice(33, 46), ['Tardy', 'AL leave', 'SL leaves', 'Paternity leave', 'Compassionate Leave', 'EID / National Day', 'ML', 'Unpaid', 'Absent', 'Attend', 'Scheduled days', 'Actual days', 'Review Notes']);
  assert.deepEqual(A[2].slice(3, 10), ['Attend', 'Absent', 'SL leaves', 'OFF', 'OFF', 'AL leave', 'Attend'], 'late minutes show as Attend; the minutes go in Tardy');
  assert.deepEqual(A[2].slice(33, 45), [15, 1, 1, 0, 0, 1, 0, 0, 1, 22, 26, 21]);
  assert.ok(!A.flat().concat(M.flat()).some(v => /^100000000\d$/.test(String(v ?? ''))), 'no National ID anywhere in the workbook');
  assert.equal(M[0][0], 'MC Monthly Deduction - Sep - 2026');
  assert.deepEqual(M[3].slice(0, 3), ['Name', 'Team', 'Dep']);
  assert.deepEqual([M[4][3], M[4][4], M[4][5]], ['Sched.', 'Actual', 'Diff (min)']);
  assert.deepEqual(M[5].slice(3, 9), [480, 470, 10, 480, 0, 0], 'Diff = Sched. - Actual, 0 when Actual is 0');
  const tot = M[3].findIndex(v => v === 'Total (min)'); assert.equal(M[5][tot], 24 * 10, '24 days at 470 of 480; the absent and sick days count 0'); assert.equal(M[6][tot], 35, 'a month saved before the daily minutes: its total');
  assert.match(M[1][0], /1 person has only a total/);
});
ok('the incentive email\'s workbook has no ID column (Build\'s keeps it); a dropped workbook has its ID columns emptied', async () => {
  const days = Array.from({ length: 30 }, (_, k) => ([3, 4].includes(k) ? 'OFF' : 'Attend'));
  const md = { y: 2026, m: 9, nd: 30, count: null,
    att: [{ id: '1000000001', name: 'Lina A.', mark: '', brand: 'Virgin', team: 'CC', days, tardy: 0, counts: [0, 0, 0, 0, 0, 0, 0, 0], attend: 28, sched: 28, counted: 28 }],
    det: [{ id: '1000000001', name: 'Lina A.', mark: '', brand: 'Virgin', vals: days.map(() => 0.96), avg: 0.96 }],
    adh: [{ id: '1000000001', name: 'Lina A.', mark: '', brand: 'Virgin', avg: 0.96 }], aht: [{ id: '1000000001', name: 'Lina A.', mark: '', brand: 'Virgin', sec: 140, dup: '' }] };
  const full = await Core.readXlsx(await WriterInc.build({}, { model: md })), mail = await Core.readXlsx(await WriterInc.build({}, { model: md, noIds: true }));
  assert.deepEqual(full.find(t => t.name === 'Adherence').rows[3].slice(0, 4), ['ID', 'Name', 'Team', 'Adherence']);
  assert.deepEqual(mail.find(t => t.name === 'Adherence').rows[3].slice(0, 3), ['Name', 'Team', 'Adherence']);
  assert.deepEqual(mail.find(t => t.name === 'Attendance Report').rows[1].slice(0, 3), ['Name', 'Team', 'Dep']);
  assert.deepEqual(mail.find(t => t.name === 'AHT').rows[4].slice(0, 2), ['Lina A.', 140]);
  for (const t of mail) assert.ok(!t.rows.flat().some(v => String(v ?? '') === '1000000001'), `no ID in ${t.name}`);
  const z = await Core.readZip(await WriterInc.build({}, { model: md, noIds: true }));
  assert.match(await z.text('xl/worksheets/sheet3.xml'), /MATCH\(A5,'Adherence -In Detail'!\$A:\$A,0\)/, 'the Adherence sheet still finds each name in the detail sheet');
  // a workbook made elsewhere: the columns headed ID emptied, everything else as it was
  const dropped = await Core.readXlsx(await Writer2.withoutIds(await WriterInc.build({}, { model: md })));
  const adh = dropped.find(t => t.name === 'Adherence').rows;
  assert.deepEqual(adh[3].slice(1, 4), ['Name', 'Team', 'Adherence']); assert.ok(adh[3][0] == null && adh[4][0] == null, 'the ID heading and values are gone');
  for (const t of dropped) assert.ok(!t.rows.flat().some(v => String(v ?? '') === '1000000001'), `no ID left in ${t.name}`);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('ok', name); } catch (e) { failed++; console.log('FAIL', name, '\n ', e && e.message ? e.message.split('\n').slice(0, 12).join('\n  ') : e); }
  }
  console.log(`${n} checks passed${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exit(1);
})();
