// A synthetic quality Final EVAL in the quality team's own template, for the tests: Virgin CC (whole percentages), FRiENDi CC
// (two decimals as text, "Annual leave" and "Left" rows), SM with a second table ("Call QA Score (SM)", "Ticket QA Score", "CR"),
// CT ("Evaluation score", "*30") and FRiENDi Pay (CR "NA"). People come from test/fixture.js (made up, first name + initial).
const path = require('node:path');
const Writer2 = require(path.join(__dirname, '..', 'js', 'writer2.js'));
require(path.join(__dirname, 'fixture.js'));

const MAIN = ['Agent Name', 'Call QA', 'Ticket QA / Empowerment Utilization', 'Call Reason & FCR Accuracy', 'Final Score (Average of Call QA, Ticket QA & CR)', 'Critical Error', 'Number of Critical Errors'];
const SM2 = ['Agent Name', 'Call QA Score (SM)', 'Ticket QA Score', 'CR', 'Final Score (Average of Call QA, Ticket QA & CR)', 'Critical Error', 'Number of Critical Errors'];
const CT = ['Agent Name', 'Evaluation score', '*30', 'Final Score (Average of Call QA, Ticket QA & CR)', 'Critical Error', 'Number of Critical Errors'];

/** -> { bytes: Uint8Array, expect: { [name]: {qobs, final, emp, fcr, qa, status, crit} } }. Quality Observations (qobs) is the Call QA;
    the Final Score is kept beside it and does not count (CT has no Call QA: there it is the Final Score). */
async function evalBook() {
  const R = globalThis.__FIX__.roster.filter(p => p.status !== 'Inactive' && p.team !== 'OP');
  const of = (b, t, n) => R.filter(p => p.brand === b && p.team === t).slice(0, n);
  const expect = {}, sheets = [], S = new Writer2.Styles();
  const table = (sh, r0, head, rows) => { head.forEach((h, i) => sh.set(r0, i + 1, h)); rows.forEach((row, j) => row.forEach((v, i) => sh.set(r0 + 1 + j, i + 1, v))); return r0 + rows.length + 1; };

  const v = new Writer2.Sheet('Virgin'), vc = of('Virgin', 'CC', 5);
  table(v, 1, MAIN, [
    [vc[0].name, 0.97, 1, 1, 0.99, '', ''],
    [vc[1].name, 0.80, 0.91, 1, 0.90, '(2)Wrong info/Action', 2],
    [vc[2].name, 0.98, 0.86, 0, 0.61, '', ''],
    [vc[3].name, 0.88, 0.91, 1, 0.93, 'Attitude/Abuse/HR Action', 1],
    [vc[4].name, 1, 0.95, 1, null, '', ''],   // no Final Score: the average of the three
  ]);
  expect[vc[0].name] = { qobs: 0.97, final: 0.99, emp: 1, fcr: 1 };
  expect[vc[1].name] = { qobs: 0.80, final: 0.90, emp: 0.91, fcr: 1, crit: 2 };
  expect[vc[2].name] = { qobs: 0.98, final: 0.61, emp: 0.86, fcr: 0 };
  expect[vc[3].name] = { qobs: 0.88, final: 0.93, emp: 0.91, fcr: 1, attitude: true };
  expect[vc[4].name] = { qobs: 1, final: (1 + 0.95 + 1) / 3, emp: 0.95, fcr: 1 };
  sheets.push(v);

  const f = new Writer2.Sheet('FRiENDi'), fc = of('Friendi', 'CC', 4);
  table(f, 1, MAIN, [
    [fc[0].name, '94.80%', '100.00%', '100.00%', '98.27%', '', ''],
    [fc[1].name, 'Annual leave', '', '', '', '', ''],
    [fc[2].name, '73.16%', '95.00%', '100.00%', '89.39%', 'Attitude/Abuse/HR Action', 1],
    [fc[3].name, 'Left', '', '', '', '', ''],
  ]);
  f.merge(3, 2, 3, 7); f.merge(5, 2, 5, 7);
  expect[fc[0].name] = { qobs: 0.948, final: 0.9827, emp: 1, fcr: 1 };
  expect[fc[1].name] = { status: 'Annual leave' };
  expect[fc[2].name] = { qobs: 0.7316, final: 0.8939, emp: 0.95, fcr: 1, attitude: true };
  expect[fc[3].name] = { status: 'Left' };
  sheets.push(f);

  const s = new Writer2.Sheet('SM'), sm = of('Virgin', 'SM', 4);
  const next = table(s, 1, MAIN, [[sm[0].name, 0.98, 1, 1, 0.99, '', ''], [sm[1].name, 0.85, 0.95, 1, 0.93, '(1)Wrong info/Action', 1]]);
  table(s, next + 6, SM2, [[sm[2].name, 0.99, 0.90, 1, 0.9633, '', ''], [sm[3].name, 0.98, 1, 0, 0.66, '', '']]);
  expect[sm[0].name] = { qobs: 0.98, final: 0.99, emp: 1, fcr: 1 };
  expect[sm[1].name] = { qobs: 0.85, final: 0.93, emp: 0.95, fcr: 1, crit: 1 };
  expect[sm[2].name] = { qobs: 0.99, final: 0.9633, emp: 0.90, fcr: 1 };
  expect[sm[3].name] = { qobs: 0.98, final: 0.66, emp: 1, fcr: 0 };
  sheets.push(s);

  const c = new Writer2.Sheet('CT'), ct = of('Virgin', 'CT', 3);
  table(c, 1, CT, [[ct[0].name, 0.97, 29.1, 0.97, '', ''], [ct[1].name, 0.94, 28.2, 0.94, '', ''], [ct[2].name, 'Annual leave', '', '', '', '']]);
  c.merge(4, 2, 4, 6);
  expect[ct[0].name] = { qobs: 0.97, final: 0.97, qa: 0.97 };   // no Call QA: the Final Score
  expect[ct[1].name] = { qobs: 0.94, final: 0.94, qa: 0.94 };
  expect[ct[2].name] = { status: 'Annual leave' };
  sheets.push(c);

  const p = new Writer2.Sheet('FPay'), fp = of('Friendi Pay', 'CC', 2);
  table(p, 1, MAIN, [[fp[0].name, 0.96, 1, 'NA', 0.98, '', ''], [fp[1].name, 0.98, 1, 'NA', null, '', '']]);
  expect[fp[0].name] = { qobs: 0.96, final: 0.98, emp: 1, fcr: null };
  expect[fp[1].name] = { qobs: 0.98, final: 0.99, emp: 1, fcr: null };   // the Final Score: the average of the two scores there are
  sheets.push(p);

  return { bytes: await Writer2.pack(sheets, S), expect };
}
module.exports = { evalBook };
