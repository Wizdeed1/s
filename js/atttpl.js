/* The supervisors' attendance template, for the departments that send their attendance (CC and SM come from Genesys). The tool
   makes it for one month and one department (one supervisor's part of it when the department has several); the supervisor writes
   one row per exception (late, absent, a leave, a day off) and the file is dropped on Import, where Core.parseAttTemplate reads it:
   every other day of the month is a working day. It looks like the tool's other workbooks: the title (and the logo) in row 1, a
   line under it, navy headings in row 4, yellow cells to fill, and a How to fill sheet first. */
'use strict';
const AttTpl = ((C, W) => {
const TYPES = ['Late', 'Absent', 'Day off', 'AL leave', 'SL leave', 'Unpaid leave', 'Compassionate leave', 'Paternity leave', 'Marriage leave', 'Exam leave', 'Maternity leave', 'Eid', 'National Day', 'Founding Day'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const safe = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Attendance - Oct 2026 - TS.xlsx, or - CT - Ghada S..xlsx for one supervisor's part of a department */
const fileName = (y, m, dep, spv) => `Attendance - ${C.MON[m - 1]} ${y} - ${[safe(dep), safe(spv)].filter(Boolean).join(' - ') || 'Team'}.xlsx`;
/** what each type is for (the How to fill sheet) */
const USE = [['Late', 'Came late. Write the minutes late (1 to 720). Always one day: leave To empty.'], ['Absent', 'Did not come, with no approved leave.'],
  ['Day off', 'Off on a day that is not one of their weekly days off (a swapped day, for example).'], ['AL leave', 'Annual leave.'], ['SL leave', 'Sick leave.'],
  ['Unpaid leave', 'Unpaid leave.'], ['Compassionate leave', 'Compassionate leave.'], ['Paternity, marriage, exam or maternity leave', 'That leave: Paternity leave, Marriage leave, Exam leave or Maternity leave in the list.'],
  ['Eid · National Day · Founding Day', 'Off for the public holiday.']];
/**
 * o: { y, m, dep (the department code), depName, spv (the supervisor's name, or ''), spvPid, people: [{ id, name, brand, team }],
 *      offDays ('Fri, Sat'), rows (rows to fill), extra (empty Team rows for new people), at, by, logo } -> xlsx bytes
 */
async function build(o) {
  const Y = o.y, M = o.m, ND = C.daysIn(Y, M), MONTH = `${MONTHS[M - 1]} ${Y}`, MON = C.MON[M - 1], people = o.people || [];
  const DEP = [o.dep, o.depName].filter(Boolean).join(' – '), WHO = [DEP, o.spv].filter(Boolean).join(' · ') || 'Team', OFF = o.offDays ?? 'Fri, Sat';
  const S = new W.Styles(), NAVY = 'FF1F3864', WHITE = 'FFFFFFFF', GRID = 'FFD9D9D9', INP = 'FFFFF2CC', INK = 'FF262626';
  const title = S.get({ font: { sz: 16, b: true, color: NAVY } }), sub = S.get({ font: { sz: 9, i: true, color: 'FF7F7F7F' } });
  const hdr = S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true } });
  const hdrL = S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'left', wrap: true } });
  const inp = (h, numFmt) => S.get({ font: { name: 'Calibri', sz: 11, color: 'FF000000' }, fill: INP, border: GRID, align: { h }, ...(numFmt ? { numFmt } : {}) });
  const iL = inp('left'), iC = inp('center'), iD = inp('center', 'dd-mmm-yyyy'), iN = inp('center', '0');
  const cL = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'left' } }), cC = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'center' } });
  const cId = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'center' }, numFmt: '0' });
  const auto = S.get({ font: { sz: 10, i: true, color: 'FF808080' }, fill: 'FFF2F2F2', border: GRID, align: { h: 'center' }, numFmt: '0' });
  const first = String(C.ymdSerial(Y, M, 1)), last = String(C.ymdSerial(Y, M, ND)), inMonth = { errorTitle: 'Not in the month', error: `Type a day of ${MONTH}.` };
  const T0 = 5, TL = T0 + people.length + (o.extra ?? 15) - 1;
  const idCell = x => { const s = String(x ?? '').trim(); return /^\d{6,}$/.test(s) ? +s : s; };
  const frame = (sh, t, s) => { sh.set(1, 1, t, title); sh.set(2, 1, s, sub); Object.assign(sh.heights, { 1: 30, 2: 18, 3: 6, 4: 30 }); };

  // ---- How to fill: the first sheet the supervisor sees
  const H = new W.Sheet('How to fill'); H.tab = 'FFC65911'; H.print = { landscape: true };
  frame(H, 'How to fill the attendance template', `${WHO} · ${MONTH}`);
  [4, 26, 16, 22, 20, 13, 40].forEach((w, j) => H.width(j + 1, w));
  const sec = (r, t) => { H.set(r, 1, t, hdrL); for (let c = 2; c <= 7; c++) H.set(r, c, null, hdrL); H.merge(r, 1, r, 7); H.heights[r] = 22; };
  const num = S.get({ font: { sz: 12, b: true, color: NAVY }, align: { h: 'center', v: 'top' } }), step = S.get({ font: { sz: 11, color: INK }, align: { h: 'left', v: 'top', wrap: true } });
  const steps = [
    `Write a row only for a day that was not a normal working day: late, absent, a leave, or a day off that is not one of the person's weekly days off.`,
    `Every other day of ${MONTH} counts as a working day by itself. Do not write the normal days, and do not write the weekly days off: they are on the Team sheet (${OFF} unless changed there).`,
    'Several days in a row (a leave): the first day in Date and the last day in To (several days). The weekly days off inside stay days off. One day: leave To empty.',
    'Late: choose Late and write the minutes in Minutes late. Late is always one day.',
    'Pick the name and the type from the lists; the ID fills in by itself. Someone new: add them on the Team sheet first.',
    'Different weekly days off, or someone who joined or left this month: change it on the Team sheet (Weekly days off, First day, Last day).',
    'When the month is done, save the file and send it to the WFM team.',
  ];
  sec(4, 'In short');
  steps.forEach((t, i) => { const r = 5 + i; H.set(r, 1, i + 1, num); H.set(r, 2, t, step); H.merge(r, 2, r, 7); H.heights[r] = 16 * Math.ceil(t.length / 140) + 3; });
  let r = 5 + steps.length + 1;
  sec(r, 'Examples'); r++;
  ['Date', 'To (several days)', 'Name', 'Type', 'Minutes late', 'What it means'].forEach((h, j) => H.set(r, j + 2, h, hdr)); H.heights[r] = 30; r++;
  const exS = numFmt => S.get({ font: { sz: 11, color: INK }, fill: 'FFFFF8E1', border: GRID, align: { h: 'center' }, numFmt }), ex = exS('dd-mmm-yyyy'), exN = exS('0');
  const exL = S.get({ font: { sz: 11, color: INK }, fill: 'FFFFF8E1', border: GRID, align: { h: 'left' } });
  const means = S.get({ font: { sz: 10, i: true, color: 'FF595959' }, border: GRID, align: { h: 'left', wrap: true } });
  const D = d => C.ymdSerial(Y, M, d);
  [[D(15), null, 'Late', 15, `15 minutes late on 15 ${MON}.`], [D(3), null, 'Absent', null, `Absent on 3 ${MON}.`], [D(7), D(10), 'AL leave', null, `Annual leave from 7 to 10 ${MON}.`],
    [D(20), D(22), 'SL leave', null, `Sick leave from 20 to 22 ${MON}.`], [D(12), null, 'Day off', null, `Off on 12 ${MON} instead of a usual day off.`]]
    .forEach(([a, b, t, mn, w]) => { H.set(r, 2, a, ex); H.set(r, 3, b, ex); H.set(r, 4, 'The person\'s name', exL); H.set(r, 5, t, exL); H.set(r, 6, mn, exN); H.set(r, 7, w, means); r++; });
  r++;
  sec(r, 'Types'); r++;
  H.set(r, 2, 'Type', hdr); H.set(r, 3, 'Use it for', hdrL); for (let c = 4; c <= 7; c++) H.set(r, c, null, hdrL); H.merge(r, 3, r, 7); r++;
  const tyS = S.get({ font: { sz: 11, b: true, color: INK }, border: GRID, align: { h: 'left', wrap: true } }), useS = S.get({ font: { sz: 11, color: INK }, border: GRID, align: { h: 'left', wrap: true } });
  USE.forEach(([t, u]) => { H.set(r, 2, t, tyS); H.set(r, 3, u, useS); for (let c = 4; c <= 7; c++) H.set(r, c, null, useS); H.merge(r, 3, r, 7); H.heights[r] = t.length > 30 ? 32 : 18; r++; });
  r++;
  sec(r, 'Good to know'); r++;
  [`Dates must be days of ${MONTH}: Excel refuses any other date.`, 'Two rows for the same person and day: the lower row counts.',
    'A yellow cell turns amber or red when something is missing: Late without minutes, a To date before the Date.',
    'Do not rename the sheets or delete rows above the headings: the tool reads them when the file comes back.']
    .forEach(t => { H.set(r, 1, '•', num); H.set(r, 2, t, step); H.merge(r, 2, r, 7); H.heights[r] = 18; r++; });

  // ---- Attendance: one row per exception
  const A = new W.Sheet('Attendance'); A.tab = NAVY; A.print = { landscape: true };
  frame(A, `Attendance · ${MONTH} · ${WHO}`, 'Only the exceptions: late, absent, a leave or a day off. Every other day counts as a working day. How to fill: the first sheet.');
  [['Date', 14], ['To (several days)', 14], ['Name', 32], ['ID', 14], ['Type', 20], ['Minutes late', 12], ['Note', 34]].forEach(([h, w], j) => { A.set(4, j + 1, h, hdr); A.width(j + 1, w); });
  const R0 = 5, RL = R0 + (o.rows ?? 300) - 1, teamName = `Team!$B$${T0}:$B$${TL}`, teamId = `Team!$A$${T0}:$A$${TL}`;
  for (let i = R0; i <= RL; i++) {
    A.set(i, 1, null, iD); A.set(i, 2, null, iD); A.set(i, 3, null, iL);
    A.set(i, 4, '', auto, `IF(C${i}="","",IFERROR(INDEX(${teamId},MATCH(C${i},${teamName},0)),""))`);
    A.set(i, 5, null, iL); A.set(i, 6, null, iN); A.set(i, 7, null, iL);
  }
  A.dv.push({ type: 'date', sqref: `A${R0}:A${RL}`, f1: first, f2: last, ...inMonth, promptTitle: 'Date', prompt: `The day, or the first day of a leave of several days. A day of ${MONTH}.` });
  A.dv.push({ type: 'date', sqref: `B${R0}:B${RL}`, f1: first, f2: last, ...inMonth, promptTitle: 'To (several days)', prompt: 'Only for several days in a row: the last day. Leave it empty for one day, and for Late.' });
  A.dv.push({ sqref: `C${R0}:C${RL}`, list: teamName, error: 'Pick a name from the Team sheet (add a new person there first).', promptTitle: 'Name', prompt: 'Pick the name from the list. Someone new: add them on the Team sheet first.' });
  A.dv.push({ sqref: `E${R0}:E${RL}`, list: `"${TYPES.join(',')}"`, error: 'Pick a type from the list.', promptTitle: 'Type', prompt: 'Late, Absent, Day off, or the leave. What each one is for: the How to fill sheet.' });
  A.dv.push({ type: 'whole', sqref: `F${R0}:F${RL}`, f1: '1', f2: '720', error: 'Minutes late: a whole number from 1 to 720.', promptTitle: 'Minutes late', prompt: 'Only for Late: the minutes late, from 1 to 720.' });
  const amber = S.dxf({ color: 'FF9C5700', fill: 'FFFFEB9C' }), red = S.dxf({ color: 'FF9C0006', fill: 'FFFFC7CE' });
  A.addCF(`F${R0}:F${RL}`, `AND($E${R0}="Late",$F${R0}="")`, amber);
  A.addCF(`B${R0}:B${RL}`, `AND($B${R0}<>"",$A${R0}<>"",$B${R0}<$A${R0})`, red);
  A.addCF(`B${R0}:B${RL}`, `AND($E${R0}="Late",$B${R0}<>"")`, amber);
  A.addCF(`F${R0}:F${RL}`, `AND($F${R0}<>"",$E${R0}<>"Late")`, amber);
  A.freeze = [R0, 1];

  // ---- Team: who the month counts, and their weekly days off
  const TE = new W.Sheet('Team'); TE.tab = 'FF2F5597'; TE.print = { landscape: false };
  frame(TE, `Team · ${WHO} · ${MONTH}`, 'Weekly days off: the weekdays each person is off every week (empty when they change every week: then write each day off on the Attendance sheet). First day and Last day: only for someone who joined or left this month. Add a new person in an empty row.');
  [['ID', 14], ['Name', 32], ['Brand', 12], ['Dep', 8], ['Weekly days off', 16], ['First day', 13], ['Last day', 13]].forEach(([h, w], j) => { TE.set(4, j + 1, h, hdr); TE.width(j + 1, w); });
  people.forEach((p, i) => {
    const row = T0 + i;
    TE.set(row, 1, idCell(p.id), cId); TE.set(row, 2, p.name, cL); TE.set(row, 3, p.brand || '', cC); TE.set(row, 4, p.team || o.dep || '', cC);
    TE.set(row, 5, OFF, iC); TE.set(row, 6, null, iD); TE.set(row, 7, null, iD);
  });
  for (let i = T0 + people.length; i <= TL; i++) [iN, iL, iC, iC, iC, iD, iD].forEach((s, j) => TE.set(i, j + 1, null, s));
  TE.dv.push({ type: 'date', sqref: `F${T0}:G${TL}`, f1: first, f2: last, ...inMonth, promptTitle: 'First day / Last day', prompt: 'Only for someone who joined or left during the month. Days before the first day or after the last day are not counted.' });
  TE.freeze = [T0, 1];

  // ---- what the file is (hidden): the tool knows the month and the team when it comes back
  const X = new W.Sheet('_mc'); X.hidden = true;
  [[C.ATT_TPL_MARK, 1], ['month', `${Y}-${String(M).padStart(2, '0')}`], ['dep', o.dep || ''], ['supervisor', o.spv || ''], ['pid', o.spvPid || ''], ['made', o.at || ''], ['by', o.by || '']]
    .forEach(([k, v], i) => { X.set(i + 1, 1, k); X.set(i + 1, 2, v); });
  if (o.logo) for (const sh of [H, A, TE]) sh.titleLogo();
  return W.pack([H, A, TE, X], S, {}, o.logo ? { logo: o.logo } : {});
}
return { build, fileName, TYPES };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Writer2 !== 'undefined' ? Writer2 : require('./writer2.js'));
if (typeof module !== 'undefined') module.exports = AttTpl;
