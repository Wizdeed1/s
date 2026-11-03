// A synthetic CT team incentive workbook (made-up people from test/fixture.js, made-up IDs) in the layout the CT team keeps:
// row 5 a date over each day's block of seven columns, row 6 ID, Name and for each day TKT, hours, other, hours, %, Comment and
// "Attendace" (sic); one row per agent (its ID column a short staff number, or empty, never the National ID); a column after the
// last day with the month's average %, no header; the hours, tickets per hour and cases per hour under the agents; then the code
// legend (Before, After) and the list of National IDs, names, brands and departments.
// A day worked has its tickets and hours on tickets, sometimes another task's hours, and a % of (ticket hours + other hours) / 7.
const path = require('node:path');
const Writer2 = require(path.join(__dirname, '..', 'js', 'writer2.js'));
require(path.join(__dirname, 'fixture.js'));

/** -> { bytes: Uint8Array, people: [{ name, nid, brand, days: [code per day], util }], y, m } */
async function ctBook({ y = 2026, m = 10, n = 6 } = {}) {
  const ND = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const off = d => [5, 6].includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay());   // Fri and Sat
  const R = globalThis.__FIX__.roster.filter(p => p.team === 'CT' && p.status !== 'Inactive').slice(0, n);
  const plan = [{ 12: 'AL', 13: 'AL', 14: 'AL', 15: 'AL' }, { 20: 'SL' }, { 7: 'Exam' }, { 21: 'Absent' }, {}, { 26: 'Unpaid', 27: 'Unpaid' }];
  const people = R.map((p, i) => {
    const days = Array.from({ length: ND }, (_, j) => { const d = j + 1, c = (plan[i] || {})[d]; return c || (off(d) ? 'OFF' : 'Attend'); });
    return { name: p.name, nid: String(p.nid), brand: p.brand, days };
  });
  const S = new Writer2.Styles(), dt = S.get({ numFmt: 'dd\\-mmm' }), pc = S.get({ numFmt: '0%' });
  const W = new Writer2.Sheet('CT'), B = 7, col0 = 3, last = col0 + ND * B;   // columns are 1-based: A ID, B Name, the first block from C
  W.set(6, 1, 'ID'); W.set(6, 2, 'Name');
  for (let d = 1; d <= ND; d++) {
    const c = col0 + (d - 1) * B;
    W.set(5, c, new Date(Date.UTC(y, m - 1, d)), dt); for (let k = 1; k < B; k++) W.set(5, c + k, null, dt); W.merge(5, c, 5, c + B - 1);
    ['TKT', 'hours', 'other', 'hours', '%', 'Comment', 'Attendace'].forEach((h, k) => W.set(6, c + k, h));
  }
  people.forEach((x, i) => {
    const r = 7 + i, pcts = [];
    if (i % 2 === 0) W.set(r, 1, 201 + i);   // a staff number on some rows, as the team writes it
    W.set(r, 2, x.name + (i === 1 ? ' ' : ''));   // a trailing space, as in the team's file
    x.days.forEach((code, j) => {
      const c = col0 + j * B, d = j + 1;
      if (code === 'Attend') {
        const hrs = d % 3 === 0 ? 6 : 7, other = d % 5 === 0 ? 1 : null, v = Math.round((hrs + (other || 0)) / 7 * 1e6) / 1e6;
        W.set(r, c, 90 + i * 5 + d); W.set(r, c + 1, hrs); if (other) { W.set(r, c + 2, 'CST handling task'); W.set(r, c + 3, other); }
        W.set(r, c + 4, v, pc); pcts.push(v);
      }
      W.set(r, c + 6, code);
    });
    x.util = pcts.reduce((a, v) => a + v, 0) / pcts.length;
    W.set(r, last, x.util, pc);   // the month's average, no header: the workbook's AVERAGE of each day's %
  });
  const p0 = 8 + people.length;
  [['hours', 6], ['TKT /hour', 15], ['cas/Hour', 105]].forEach(([l, v], k) => { W.set(p0 + k, 1, l); W.set(p0 + k, 2, v); });
  // five empty rows, then the legend (A, B) beside the list of IDs (E to H)
  const l0 = p0 + 8;
  W.set(l0, 2, 'Attendace'); ['ID', 'Name', 'Team', 'Dep'].forEach((h, k) => W.set(l0, 5 + k, h));
  const legend = [['Before', 'After'], ['attend', 'Attend'], ['Sick', 'SL'], ['Annual', 'AL'], ['exam', 'Exam'], ['absent', 'Absent'], ['DO.', 'OFF'], ['Unpaid', 'Unpaid']];
  const list = [...people, { name: 'Omar Q.', nid: '1000000999', brand: 'Virgin' }];   // someone on the list with no row of days
  for (let k = 0; k < Math.max(legend.length, list.length); k++) {
    const r = l0 + 1 + k;
    if (legend[k]) { W.set(r, 1, legend[k][0]); W.set(r, 2, legend[k][1]); }
    if (list[k]) { W.set(r, 5, Number(list[k].nid)); W.set(r, 6, list[k].name); W.set(r, 7, list[k].brand === 'Virgin' ? 'Virgin' : 'Friendi'); W.set(r, 8, 'CT'); }
  }
  const S1 = new Writer2.Sheet('Sheet1'); S1.set(16, 3, 0.947368, pc);
  return { bytes: await Writer2.pack([W, S1], S), people, y, m };
}
module.exports = { ctBook };
if (require.main === module) {   // node test/ctbook.cjs out.xlsx [yyyy-mm]: writes one
  const [file, ym] = process.argv.slice(2), [y, m] = (ym || '2026-10').split('-').map(Number);
  ctBook({ y, m }).then(b => { require('node:fs').writeFileSync(file, b.bytes); console.log(`${file}: ${b.people.length} agents, ${y}-${String(m).padStart(2, '0')}`); });
}
