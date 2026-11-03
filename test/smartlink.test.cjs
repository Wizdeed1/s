// The Smart-Link attendance workbook (Writer2.smartLink), Node only, made-up people: Smart-Link's own layout (the sheet's name,
// row 2's headings, a row per agent), each day's code with a late day as Attend and its minutes under Tardy, the counts as
// Smart-Link's formulas with their values, and the look: the frozen ID and Name, the filter, an ID written twice coloured.
const assert = require('node:assert/strict');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Writer2 = require(js('writer2.js'));
let n = 0; const tests = [];
const ok = (name, fn) => tests.push([name, fn]);
const days = ch => Array.from({ length: 30 }, (_, i) => (ch[i + 1] !== undefined ? ch[i + 1] : (i + 1) % 7 === 4 ? 'OFF' : 'Attend'));
const ROWS = [
  { id: '1000000001', name: 'Hassan P.', brand: 'Friendi', team: 'CC', days: days({ 3: 'SL', 10: 15, 12: 'AL', 13: 'AL' }), tardy: 15 },
  { id: '1000000002', name: 'Rana A.', brand: 'Friendi Pay', team: 'CC', days: days({ 5: 'Absent', 23: 'National Day', 9: 'Exam' }), tardy: 0 },
  { id: '1000000003', name: 'Afnan E.', brand: 'Friendi', team: 'SM', days: days({ 7: 'Unpaid', 8: 'Eid', 2: null }), tardy: 3 },
  { id: '1000000003', name: 'Afnan E. (again)', brand: 'Friendi', team: 'SM', days: days({}), tardy: 0 },
];
const HEAD = ['ID', 'Name', 'Team', 'Dep'], TAIL = ['Tardy', 'AL leave', 'SL leaves', 'Exam', 'National Day', 'EID', 'Unpaid', 'Absent', 'Attend', 'Scheduled days', 'Actual days'];
const book = async () => { const u8 = await Writer2.smartLink({ y: 2026, m: 9, rows: ROWS }); return { u8, T: await Core.readXlsx(u8), z: await Core.readZip(u8) }; };

ok('the file and sheet are named as Smart-Link\'s', async () => {
  assert.equal(Writer2.slFileName(2026, 9), 'Smart-Link Attendance -Sep 2026.xlsx');
  const { T } = await book(); assert.deepEqual(T.map(t => t.name), ['SmartLink-Attendance Sep-2026']);
});

ok('row 2: ID, Name, Team, Dep, every day of the month, then the counts', async () => {
  const { T } = await book(), h = T[0].rows[1];
  assert.deepEqual(h.slice(0, 4), HEAD); assert.deepEqual(h.slice(34, 45), TAIL); assert.equal(h.length, 45);
  const ds = h.slice(4, 34); assert.ok(ds.every(v => v instanceof Date), 'the days are dates');
  assert.deepEqual([ds[0], ds[29]].map(d => d.toISOString().slice(0, 10)), ['2026-09-01', '2026-09-30']);
  assert.ok(!(T[0].rows[0] || []).some(v => v != null && v !== ''), 'row 1 is empty, as Smart-Link\'s');
});

ok('each agent: the ID as a number, the days (a late day is Attend), the counts and their totals', async () => {
  const { T } = await book(), R = T[0].rows;
  const r = R[2]; assert.equal(r[0], 1000000001); assert.deepEqual(r.slice(1, 4), ['Hassan P.', 'Friendi', 'CC']);
  assert.equal(r[4 + 9], 'Attend', 'the late day'); assert.equal(r[4 + 2], 'SL');
  assert.deepEqual(r.slice(34, 45), [15, 2, 1, 0, 0, 0, 0, 0, 23, 26, 23]);
  assert.deepEqual(R[3].slice(34, 45), [0, 0, 0, 1, 1, 0, 0, 1, 23, 26, 23], 'Exam, National Day and an absence count as scheduled');
  assert.deepEqual(R[4].slice(34, 45), [3, 0, 0, 0, 0, 1, 1, 0, 23, 25, 23], 'Unpaid and Eid count as scheduled; a blank day counts nothing');
  assert.equal(R[4][5], null, 'a day with nothing stays empty');
});

ok('the counts are Smart-Link\'s formulas, each with its value', async () => {
  const { z } = await book(), x = await z.text('xl/worksheets/sheet1.xml');
  const f = c => (x.match(new RegExp(`<c r="${c}3"[^>]*><f>([^<]*)</f>`)) || [])[1];
  assert.equal(f('AJ'), 'COUNTIF(E3:AH3,&quot;=AL&quot;)'); assert.equal(f('AN'), 'COUNTIF(E3:AH3,&quot;=Eid&quot;)'); assert.equal(f('AQ'), 'COUNTIF(E3:AH3,&quot;Attend&quot;)');
  assert.equal(f('AR'), 'AP3+AK3+AJ3+AQ3+AO3+AN3+AL3+AM3'); assert.equal(f('AS'), 'AR3-AP3-AO3-AL3-AN3-AK3-AJ3-AM3');
  assert.ok(/<c r="AR3"[^>]*><f>[^<]*<\/f><v>26<\/v>/.test(x), 'the value is in the file');
});

ok('frozen at C3, a filter over the table, an ID written twice coloured', async () => {
  const { z } = await book(), x = await z.text('xl/worksheets/sheet1.xml');
  assert.ok(/<pane xSplit="2" ySplit="2" topLeftCell="C3"/.test(x)); assert.ok(/<autoFilter ref="A2:AS6"\/>/.test(x));
  assert.ok(/<conditionalFormatting sqref="A3:A6"><cfRule type="duplicateValues"/.test(x));
  const st = await z.text('xl/styles.xml'); assert.ok(/FF073673/.test(st) && /FFFF0000/.test(st) && /FFC6EFCE/.test(st), 'the navy headings, the red Actual days, the green AL');
});

(async () => {
  for (const [name, fn] of tests) { await fn(); n++; console.log('ok ' + name); }
  console.log(`${n} checks passed`);
})().catch(e => { console.error('✗', e); process.exit(1); });
