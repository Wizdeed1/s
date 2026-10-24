/* The supervisors' attendance template, for the departments that send their attendance (CC and SM come from Genesys). The tool
   makes it for one month and one supervisor's team; the supervisor writes one row per exception (late, absent, a leave, a day off)
   and the file is dropped on Import, where Core.parseAttTemplate reads it: every other day of the month is a working day. */
'use strict';
const AttTpl = ((C, W) => {
const TYPES = ['Late', 'Absent', 'Day off', 'AL leave', 'SL leave', 'Unpaid leave', 'Compassionate leave', 'Paternity leave', 'Marriage leave', 'Exam leave', 'Maternity leave', 'Eid', 'National Day', 'Founding Day'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fileName = (y, m, spv) => `Attendance - ${C.MON[m - 1]} ${y} - ${String(spv || 'Team').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()}.xlsx`;
/**
 * o: { y, m, spv (the supervisor's name), spvPid, people: [{ id, name, brand, team }], offDays ('Fri, Sat'), rows (rows to fill),
 *      extra (empty Team rows for new people), at, by, logo } -> xlsx bytes
 */
async function build(o) {
  const Y = o.y, M = o.m, ND = C.daysIn(Y, M), MONTH = `${MONTHS[M - 1]} ${Y}`, people = o.people || [];
  const S = new W.Styles(), NAVY = 'FF1F3864', WHITE = 'FFFFFFFF', GRID = 'FFBFBFBF', INP = 'FFFFF2CC', INK = 'FF000000';
  const title = S.get({ font: { sz: 15, b: true, color: NAVY } }), help = S.get({ font: { sz: 10, color: 'FF404040' }, align: { h: 'left', v: 'top', wrap: true } });
  const hdr = S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true } });
  const inp = (h, numFmt) => S.get({ font: { sz: 11, color: INK }, fill: INP, border: GRID, align: { h }, ...(numFmt ? { numFmt } : {}) });
  const iL = inp('left'), iC = inp('center'), iD = inp('center', 'dd-mmm-yyyy'), iN = inp('center', '0');
  const cL = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'left' } }), cC = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'center' } });
  const cId = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'center' }, numFmt: '0' });
  const auto = S.get({ font: { sz: 10, i: true, color: 'FF595959' }, fill: 'FFF2F2F2', border: GRID, align: { h: 'center' }, numFmt: '0' });
  const first = String(C.ymdSerial(Y, M, 1)), last = String(C.ymdSerial(Y, M, ND)), inMonth = { errorTitle: 'Not in the month', error: `Type a day of ${MONTH}.` };
  const T0 = 5, TL = T0 + people.length + (o.extra ?? 15) - 1;
  const idCell = x => { const s = String(x ?? '').trim(); return /^\d{6,}$/.test(s) ? +s : s; };

  // ---- Attendance: one row per exception
  const A = new W.Sheet('Attendance'); A.tab = NAVY;
  A.set(1, 1, `Attendance · ${MONTH} · ${o.spv || 'Team'}`, title); A.heights[1] = 28;
  A.set(2, 1, `One row for each day someone was late, absent, on leave, or off on a day that is not one of their weekly days off (those are on the Team sheet). Every other day of ${MONTH} counts as a working day. A leave of several days: the first day in Date, the last in To.`, help);
  A.merge(2, 1, 2, 7); A.heights[2] = 46;
  A.set(3, 1, 'Late: type the minutes late. Pick the name from the list and the ID fills in by itself. When the month is done, send the file to the WFM team (or drop it on the tool\'s Import).', help);
  A.merge(3, 1, 3, 7); A.heights[3] = 32;
  [['Date', 14], ['To (several days)', 14], ['Name', 32], ['ID', 14], ['Type', 20], ['Minutes late', 12], ['Note', 34]].forEach(([h, w], j) => { A.set(4, j + 1, h, hdr); A.width(j + 1, w); });
  A.heights[4] = 30;
  const R0 = 5, RL = R0 + (o.rows ?? 300) - 1, teamName = `Team!$B$${T0}:$B$${TL}`, teamId = `Team!$A$${T0}:$A$${TL}`;
  for (let r = R0; r <= RL; r++) {
    A.set(r, 1, null, iD); A.set(r, 2, null, iD); A.set(r, 3, null, iL);
    A.set(r, 4, '', auto, `IF(C${r}="","",IFERROR(INDEX(${teamId},MATCH(C${r},${teamName},0)),""))`);
    A.set(r, 5, null, iL); A.set(r, 6, null, iN); A.set(r, 7, null, iL);
  }
  A.dv.push({ type: 'date', sqref: `A${R0}:B${RL}`, f1: first, f2: last, ...inMonth });
  A.dv.push({ sqref: `C${R0}:C${RL}`, list: teamName, error: 'Pick a name from the Team sheet (add a new person there first).' });
  A.dv.push({ sqref: `E${R0}:E${RL}`, list: `"${TYPES.join(',')}"`, error: 'Pick a type from the list.' });
  A.dv.push({ type: 'whole', sqref: `F${R0}:F${RL}`, f1: '1', f2: '720', error: 'Minutes late: a whole number from 1 to 720.' });
  A.freeze = [R0, 1];

  // ---- Team: who the month counts, and their weekly days off
  const TE = new W.Sheet('Team'); TE.tab = 'FF2F5597';
  TE.set(1, 1, `Team · ${o.spv || ''} · ${MONTH}`, title); TE.heights[1] = 28;
  TE.set(2, 1, 'Weekly days off: the weekdays each person is off every week (for example Fri, Sat). Leave it empty when the days off change from week to week, and write each day off on the Attendance sheet instead. First day and Last day: only for someone who joined or left during the month. Add a new person in an empty row.', help);
  TE.merge(2, 1, 2, 7); TE.heights[2] = 58;
  [['ID', 14], ['Name', 32], ['Brand', 12], ['Dep', 8], ['Weekly days off', 16], ['First day', 13], ['Last day', 13]].forEach(([h, w], j) => { TE.set(4, j + 1, h, hdr); TE.width(j + 1, w); });
  TE.heights[4] = 30;
  people.forEach((p, i) => {
    const r = T0 + i;
    TE.set(r, 1, idCell(p.id), cId); TE.set(r, 2, p.name, cL); TE.set(r, 3, p.brand || '', cC); TE.set(r, 4, p.team || '', cC);
    TE.set(r, 5, o.offDays ?? 'Fri, Sat', iC); TE.set(r, 6, null, iD); TE.set(r, 7, null, iD);
  });
  for (let r = T0 + people.length; r <= TL; r++) [iN, iL, iC, iC, iC, iD, iD].forEach((s, j) => TE.set(r, j + 1, null, s));
  TE.dv.push({ type: 'date', sqref: `F${T0}:G${TL}`, f1: first, f2: last, ...inMonth });
  TE.freeze = [T0, 1];

  // ---- what the file is (hidden): the tool knows the month and the team when it comes back
  const X = new W.Sheet('_mc'); X.hidden = true;
  [[C.ATT_TPL_MARK, 1], ['month', `${Y}-${String(M).padStart(2, '0')}`], ['supervisor', o.spv || ''], ['pid', o.spvPid || ''], ['made', o.at || ''], ['by', o.by || '']]
    .forEach(([k, v], i) => { X.set(i + 1, 1, k); X.set(i + 1, 2, v); });
  return W.pack([A, TE, X], S, {}, o.logo ? { logo: o.logo } : {});
}
return { build, fileName, TYPES };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Writer2 !== 'undefined' ? Writer2 : require('./writer2.js'));
if (typeof module !== 'undefined') module.exports = AttTpl;
