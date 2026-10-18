// v33 reference (git 156a4ae, js/extras.js lines 74-102), copied word for word so the golden tests can prove that the new
// counting gives the same numbers with the default rules. Not loaded by the tool.
'use strict';
const LET = { A: 'Attend', O: 'OFF', L: 'AL', S: 'SL', X: 'Absent', V: 'Other leave' };
/** a saved row's days as full values (codes, or tardy minutes) */
function daysOfRow(r, ND) {
  const d = String(r.d || ''), dx = r.dx || {};
  return Array.from({ length: ND }, (_, i) => { const x = dx[i + 1]; if (x != null) return x; const c = d[i]; return !c || c === '-' ? null : LET[c] || null; });
}
const COUNTED = v => ['AL', 'SL', 'Absent', 'Unpaid', 'ML'].includes(v) || /^(national day|compassionate|eid)/i.test(String(v));
/** the totals a row should have once the corrections are in: worked, absent, tardy, scheduled and actual days for the incentive */
function attTotals(days) {
  let attend = 0, sched = 0, absent = 0, tardy = 0, al = 0, sl = 0, off = 0, other = 0, worked = 0;
  for (const v of days) {
    if (v == null) continue;
    if (typeof v === 'number') { worked++; attend++; sched++; if (v > 0) tardy += v; continue; }
    if (v === 'Attend') { worked++; attend++; sched++; continue; }
    if (v === 'OFF') { off++; continue; }
    if (v === 'Absent') absent++; else if (v === 'AL') al++; else if (v === 'SL') sl++; else other++;
    if (COUNTED(v)) sched++;
  }
  return { attend, sched, absent, tardy, al, sl, off, leave: other, worked };
}
const DAYCH = v => (v == null ? '-' : typeof v === 'number' || v === 'Attend' ? 'A' : v === 'OFF' ? 'O' : v === 'AL' ? 'L' : v === 'SL' ? 'S' : v === 'Absent' ? 'X' : 'V');
/** a saved row with the supervisor's corrections applied (draft months only) */
function withEdits(r, edits, ND) {
  if (!edits || !edits.days || !Object.keys(edits.days).length) return r;
  const days = daysOfRow(r, ND);
  for (const [d, e] of Object.entries(edits.days)) { const i = +d - 1; if (i >= 0 && i < ND) days[i] = e.v === '' ? null : e.v; }
  const t = attTotals(days), dx = {};
  days.forEach((v, i) => { if (v != null && (typeof v === 'number' || !['Attend', 'OFF', 'AL', 'SL', 'Absent'].includes(v))) dx[i + 1] = v; });
  return { ...r, d: days.map(DAYCH).join(''), dx, worked: t.worked, absent: t.absent, al: t.al, sl: t.sl, off: t.off, leave: t.leave, tardy: t.tardy, ks: t.sched, ka: t.attend, _edited: Object.keys(edits.days).length };
}
module.exports = { daysOfRow, COUNTED, attTotals, DAYCH, withEdits };
