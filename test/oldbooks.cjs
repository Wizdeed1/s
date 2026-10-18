// Synthetic old-Excel workbooks for the reconcile tests (made-up people from test/fixture.js, made-up IDs): the August 2026
// incentive data workbook in the old layout, the August final result, and a deduction workbook named 2026-08 that holds September.
// They reproduce every pattern of a real old month: own bases (1600 for three, 1580, 1545, 1648), two absence cases the old process
// cut by 8 and 12 days, 'SL ' typed with a space (Excel's COUNTIF leaves it out), 'Al', Unpaid, '#N/A' and 'NA' IDs with two
// spellings of one name, an Adherence value typed over the daily average, and three Diff cells typed over with 0.
const path = require('node:path');
const Writer2 = require(path.join(__dirname, '..', 'js', 'writer2.js'));
require(path.join(__dirname, 'fixture.js'));

const Y = 2026, ND = 31;
const AUG = d => new Date(Date.UTC(Y, 7, d)), SEP = d => new Date(Date.UTC(Y, 8, d));
const weekend = d => [5, 6].includes(new Date(Date.UTC(Y, 7, d)).getUTCDay());   // Fri and Sat off: 22 working days in Aug 2026
/** 31 day cells: OFF on Fri/Sat, Attend otherwise, then the changes ({day: value}); extra: days worked on a weekend */
function month(changes = {}, extra = []) {
  return Array.from({ length: ND }, (_, i) => { const d = i + 1; if (changes[d] !== undefined) return changes[d]; return weekend(d) && !extra.includes(d) ? 'OFF' : 'Attend'; });
}
const range = (a, b, v) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, v]));
/** Excel's own columns: COUNTIF(range, "=AL") matches 'AL' and 'Al' (no case) but not 'SL ' (a space) */
function excelCounts(days) {
  const c = crit => days.filter(v => typeof v === 'string' && v.toLowerCase() === crit.toLowerCase()).length;
  const o = { al: c('AL'), sl: c('SL'), pat: c('Paternity'), exam: c('Exam'), nd: c('National Day'), unpaid: c('Unpaid'), absent: c('Absent'), attend: c('Attend') };
  o.ks = o.al + o.sl + o.pat + o.exam + o.nd + o.unpaid + o.absent + o.attend; o.ka = o.attend;
  return o;
}

/** -> { inc, final, ded: Uint8Array, names: {...}, expect: {...} } */
async function oldBooks() {
  const R = globalThis.__FIX__.roster.map((p, i) => ({ ...p, _id: 'p' + i })), act = R.filter(p => p.status !== 'Inactive');
  const of = (b, t, n) => act.filter(p => p.brand === b && p.team === t).slice(0, n);
  const [op1, op2, op3] = of('Virgin', 'OP', 3), [ct1, ct2] = of('Virgin', 'CT', 2), [sm1] = of('Virgin', 'SM', 1), cc = of('Virgin', 'CC', 12), fr = of('Friendi', 'CC', 3);
  // people in the final result: [person, team, days, Final %, base the old process used, earned]
  const P = [
    { p: op1, dep: 'OP', days: month(), F: 0.95, base: 1600 },                                   // 22 / 22 -> 1520
    { p: op2, dep: 'OP', days: month({ 2: 'AL', 3: 'AL' }), F: 0.93, base: 1600 },               // 20 / 22 -> 1353
    { p: op3, dep: 'OP', days: month({ 2: 'AL', 3: 'AL', 4: 'Al', 5: 'Al', 6: 'AL' }), F: 0.98, base: 1600 },   // 17 / 22 -> 1212 ('Al' counted by both)
    { p: ct1, dep: 'CT', days: month({ 10: 'AL', 11: 'AL' }), F: 1, base: 1580 },                 // 20 / 22 -> 1436
    { p: ct2, dep: 'CT', days: month({ 12: 'SL' }), F: 1, base: 1545 },                           // 21 / 22 -> 1475
    { p: sm1, dep: 'SM', days: month({ 13: 'SL' }), F: 0.93, base: 1648 },                        // 21 / 22 -> 1463
    { p: cc[0], dep: 'CC', days: month({ 17: 'SL', 20: 'Absent', 24: 'Absent' }, [1]), F: 0.91, base: 1000, cut: 8 },            // 23 sched, 20 attended, 2 absent -> 475 (the tool: 791)
    { p: cc[1], dep: 'CC', days: month({ ...range(2, 5, 'AL'), 30: 'AL', 31: 'AL', ...range(9, 11, 'Absent'), 25: 'Absent' }, [1]), F: 0.92, base: 1000, cut: 12, tardy: 71 },   // 23 / 13, 4 absent -> 40 (520)
    { p: cc[2], dep: 'CC', days: month(), F: 0.96, base: 1000 },
    { p: cc[3], dep: 'CC', days: month({ 16: 'AL' }), F: 0.9, base: 1000 },
    { p: cc[4], dep: 'CC', days: month({ 18: 'SL', 19: 'SL' }), F: 0.88, base: 1000 },
    { p: cc[5], dep: 'CC', days: month(), F: 0.84, base: 1000 },
  ];
  for (const x of P) {
    const c = excelCounts(x.days); x.ks = c.ks; x.ka = c.ka;
    x.E = Math.round(x.base * (x.ka - (x.cut || 0)) / x.ks * x.F + 1e-9);
  }
  // people only in the incentive data: 'SL ' with a space, Unpaid, two spellings of one name with '#N/A' / 'NA', a typed Adherence value
  const slA = { p: cc[6], dep: 'CC', days: month({ 9: 'SL ', 10: 'SL ' }, [1]) };     // Excel 21 / 21, the tool 21 / 23
  const slB = { p: fr[0], dep: 'CC', brand: 'Friendi', days: month({ 16: 'SL ' }) };    // Excel 21 / 21, the tool 21 / 22
  const unp = { p: cc[7], dep: 'CC', days: month(Object.fromEntries(Array.from({ length: 31 }, (_, i) => i + 1).filter(d => d >= 12 && !weekend(d)).map(d => [d, 'Unpaid']))) };
  const typed = { p: cc[8], dep: 'CC', days: month() };
  const split = { name: 'Laylai Testname', gname: 'Layali Testname', dep: 'CC', days: month({ 23: 'AL' }) };
  const ATT = [...P, slA, slB, unp, typed, { p: { name: split.name, nid: '' }, dep: 'CC', days: split.days, idText: 'NA' }];

  // ---- the incentive data workbook, old layout ('Attendance Report ' with a trailing space, header in row 4)
  const S = new Writer2.Styles(), dateSt = S.get({ numFmt: 'dd\\-mmm' });
  const AR = new Writer2.Sheet('Attendance Report ');
  const HEAD = ['ID', 'Name', 'Team', 'Dep'], TAIL = ['Tardy', 'AL leave', 'SL leaves', 'Paternity', 'Exam', 'National Day', 'Unpaid', 'Absent', 'Attend', 'Scheduled days', 'Actual days'];
  HEAD.forEach((h, j) => AR.set(4, j + 1, h)); for (let d = 1; d <= ND; d++) AR.set(4, 4 + d, AUG(d), dateSt); TAIL.forEach((h, j) => AR.set(4, 5 + ND + j, h));
  ATT.forEach((x, i) => {
    const r = 5 + i, c = excelCounts(x.days);
    AR.set(r, 1, x.idText || Number(x.p.nid)); AR.set(r, 2, x.p.name + (i === 2 ? ' ' : '')); AR.set(r, 3, x.brand || 'Virgin'); AR.set(r, 4, x.dep);
    x.days.forEach((v, j) => AR.set(r, 5 + j, v));
    [x.tardy || 0, c.al, c.sl, c.pat, c.exam, c.nd, c.unpaid, c.absent, c.attend, c.ks, c.ka].forEach((v, j) => AR.set(r, 5 + ND + j, v));
  });
  // Adherence -In Detail (Genesys names, 'Member Care champions'), Adherence (typed values), AHT
  const adhPeople = [...P.slice(6), slA, typed, { p: { name: split.gname, nid: '' }, idText: '#N/A', dep: 'CC' }];
  const daily = (x, i) => Array.from({ length: ND }, (_, j) => (weekend(j + 1) ? 'NA' : Math.round((0.95 + ((i * 7 + j * 3) % 5) / 100) * 1e4) / 1e4));
  const DT = new Writer2.Sheet('Adherence -In Detail'), AD = new Writer2.Sheet('Adherence'), AH = new Writer2.Sheet('AHT');
  DT.set(2, 3, `MC Monthly Adherence - Aug - ${Y}`); AD.set(2, 3, `MC Monthly Adherence - Aug - ${Y}`);
  ['ID', 'Member Care champions', 'NA'].forEach((h, j) => DT.set(4, j + 1, h)); for (let d = 1; d <= ND; d++) DT.set(4, 3 + d, AUG(d), dateSt); DT.set(4, 4 + ND, 'Avr.');
  ['ID', 'Member Care champions', 'Team', 'Adherence'].forEach((h, j) => AD.set(4, j + 1, h));
  ['ID', 'Name', 'Team', 'AHT'].forEach((h, j) => AH.set(1, j + 1, h));
  const expectAdh = {};
  adhPeople.forEach((x, i) => {
    const r = 6 + i, vals = daily(x, i), nums = vals.filter(v => typeof v === 'number'), avg = nums.reduce((a, b) => a + b, 0) / nums.length, id = x.idText || Number(x.p.nid);
    DT.set(r, 1, id); DT.set(r, 2, x.p.name); DT.set(r, 3, x.dep); vals.forEach((v, j) => DT.set(r, 4 + j, v)); DT.set(r, 4 + ND, avg);
    const tab = x === typed ? Math.round((avg - 0.0218) * 1e6) / 1e6 : avg;   // typed over the daily average
    AD.set(r - 1, 1, id); AD.set(r - 1, 2, x.p.name); AD.set(r - 1, 3, x.dep); AD.set(r - 1, 4, tab);
    AH.set(2 + i, 1, id); AH.set(2 + i, 2, x.p.name); AH.set(2 + i, 3, x.dep); AH.set(2 + i, 4, 140 + i);
    expectAdh[x.p.name] = { avg, tab };
  });
  const inc = await Writer2.pack([AR, DT, AD, AH], S);

  // ---- the final result (ID, Name, Final %, Earned SR with a trailing space): Virgin only
  const FS = new Writer2.Styles(), F = new Writer2.Sheet('Sheet1'), pc = FS.get({ numFmt: '0%' });
  ['ID', 'Name', 'Final %', 'Earned SR '].forEach((h, j) => F.set(1, j + 1, h));
  P.forEach((x, i) => { F.set(2 + i, 1, Number(x.p.nid)); F.set(2 + i, 2, x.p.name + (i % 4 === 1 ? ' ' : '')); F.set(2 + i, 3, x.F, pc); F.set(2 + i, 4, x.E); });
  const final = await Writer2.pack([F], FS);

  // ---- the deduction workbook: named 2026-08, but its titles and dates are September 2026; 3 Diff cells typed over with 0
  const DS = new Writer2.Styles(), dSt = DS.get({ numFmt: 'dd\\-mmm' }), SD = 30, sepOff = d => [5, 6].includes(new Date(Date.UTC(Y, 8, d)).getUTCDay());
  const AT = new Writer2.Sheet('Attendance Report'), MD = new Writer2.Sheet('Monthly Deduction');
  AT.set(1, 1, `MC Monthly Attendance - Sep - ${Y}`); HEAD.forEach((h, j) => AT.set(2, j + 1, h)); for (let d = 1; d <= SD; d++) AT.set(2, 4 + d, SEP(d), dSt);
  ['Tardy', 'AL leave', 'SL leaves', 'Absent', 'Attend', 'Scheduled days', 'Actual days', 'Review Notes'].forEach((h, j) => AT.set(2, 5 + SD + j, h));
  const dedPeople = cc.slice(0, 4);
  dedPeople.forEach((p, i) => { AT.set(3 + i, 1, String(p.nid)); AT.set(3 + i, 2, p.name); AT.set(3 + i, 3, 'Virgin'); AT.set(3 + i, 4, 'CC'); for (let d = 1; d <= SD; d++) AT.set(3 + i, 4 + d, sepOff(d) ? 'OFF' : 'Attend'); });
  MD.set(1, 1, `MC Monthly Deduction - Sep - ${Y}`);
  HEAD.forEach((h, j) => MD.set(4, j + 1, h));
  for (let d = 1; d <= SD; d++) { const c = 5 + (d - 1) * 3; MD.set(4, c, SEP(d), dSt); MD.set(5, c, 'Sched.'); MD.set(5, c + 1, 'Actual'); MD.set(5, c + 2, 'Diff (min)'); }
  const TOT = 5 + SD * 3; MD.set(4, TOT, 'Total (min)'); MD.set(4, TOT + 1, 'Review Notes');
  const typedOver = [[0, 16, 480, 135], [0, 23, 480, 295], [1, 3, 480, 187]];   // [person, day, Sched., Actual]: the rule gives 345, 185 and 293
  let ruleTotal = 0, sheetTotal = 0;
  dedPeople.forEach((p, i) => {
    const r = 6 + i; let tot = 0;
    MD.set(r, 1, String(p.nid)); MD.set(r, 2, p.name); MD.set(r, 3, 'Virgin'); MD.set(r, 4, 'CC');
    for (let d = 1; d <= SD; d++) {
      const c = 5 + (d - 1) * 3, off = sepOff(d);
      if (off) { MD.set(r, c, ''); MD.set(r, c + 1, ''); MD.set(r, c + 2, ''); continue; }
      const t = typedOver.find(x => x[0] === i && x[1] === d), s = t ? t[2] : 480, a = t ? t[3] : d % 9 === 0 ? 0 : 480 - ((i * 5 + d) % 11);
      const rule = a === 0 ? 0 : Math.max(0, s - a), D = t ? 0 : rule;
      MD.set(r, c, s); MD.set(r, c + 1, a); MD.set(r, c + 2, D); tot += D; ruleTotal += rule;
    }
    MD.set(r, TOT, tot); sheetTotal += tot;
  });
  const ded = await Writer2.pack([AT, MD], DS);

  const people = P.map(x => ({ pid: x.p._id, name: x.p.name, nid: x.p.nid, dep: x.dep, ks: x.ks, ka: x.ka, F: x.F, base: x.base, E: x.E, cut: x.cut || 0 }));
  return {
    inc, final, ded,
    names: { inc: `MC_all_team_incentive _data -${Y}-08.xlsx`, final: 'Final_result_for_Aug.xlsx', ded: `Monthly_Deduction_${Y}-08.xlsx` },
    expect: { people, slA: { pid: slA.p._id, name: slA.p.name }, slB: { pid: slB.p._id, name: slB.p.name }, unpaid: { pid: unp.p._id, name: unp.p.name }, typed: { pid: typed.p._id, name: typed.p.name, ...expectAdh[typed.p.name] },
      split, typedOver: typedOver.map(([i, d, s, a]) => ({ name: dedPeople[i].name, day: d, S: s, A: a, rule: s - a })), ruleTotal, sheetTotal, attRows: ATT.length },
  };
}
module.exports = { oldBooks, excelCounts };
