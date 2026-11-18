// ================================================================ THE DEDUCTION PERIOD: the 14th of the month before to the 13th of the month
// WFM team › Emails › Deduction and absences. Payroll counts a month's deduction from the 14th of the month before to the 13th of the
// month, as the teams' own sheets run it (Settings › Deduction period: day 14 to day 13 by default, each day in one month's file; 1 to
// 31 is the calendar month). Everything the email sends follows
// it: November 2026's review and final emails, their own tables (the conformance deduction, the absenteeism) and their workbook (MC
// Monthly Deduction - Nov 2026.xlsx: the Attendance Report with the deduction brands' people, Virgin by default, every team; the
// Monthly Deduction with the deduction scope, Virgin · CC, each day's Sched., Actual and Diff) all run 14 Oct – 13 Nov.
// The month before's days come from that month in the tool, with its corrections; once that month is final, the corrections made
// after the deduction review are the deduction's own (dedfix/<month>): they count here, and the month's results stay as frozen. The
// month's own days come from, in this order: the corrections made for those days, the files dropped in the email page's box (the
// supervisors' attendance sheets; the Genesys Schedule and Agent Status Timeline for the minutes), the month in the tool. What is
// dropped is kept with the shared data (dednext/<month>), so the final email, and another computer, have it too.
// A row named after a day code or a heading ("Absent", "OFF": a sheet's legend once read as people) is never in it.
Object.assign(state, { dedNext: {}, dedFixBy: {}, dedFixVer: 0, dnBusy: false, dnMsg: '', dnGen: { k: '', sch: [], tl: [] } });
const dedPrevKey = k => { const y = +k.slice(0, 4), m = +k.slice(5); return m === 1 ? ymKey(y - 1, 12) : ymKey(y, m - 1); };
/** Settings › Deduction period: its first day (in the month before; 1 is the month's own 1st) and its last day (in the month) */
function dedDaysSet() {
  const s = state.settings || {}, f = Math.round(+s.dedFrom), t = Math.round(+s.dedTo);
  return { F: f >= 1 && f <= 31 ? f : 14, T: t >= 1 && t <= 31 ? t : 13 };   // by default the 14th of the month before to the 13th
}
/** the period of the month the email is named after: { y, m, k, days: [{ y, m, d }], segs: [{ y, m, k, from, to, n, i0, head }], tail
    (the month before's part, or null), head (the month's part), label "14 Oct – 13 Nov", closeK (the month being closed: the first
    day's), last } */
function dedPeriod(y, m) {
  const { F, T } = dedDaysSet(), py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1, NDp = Core.daysIn(py, pm), t = Math.min(T, Core.daysIn(y, m)), segs = [];
  if (F > 1 && F <= NDp) segs.push({ y: py, m: pm, k: ymKey(py, pm), from: F, to: NDp });
  segs.push({ y, m, k: ymKey(y, m), from: 1, to: t, head: true });
  let i0 = 0; for (const s of segs) { s.n = s.to - s.from + 1; s.i0 = i0; i0 += s.n; }
  const days = segs.flatMap(s => Array.from({ length: s.n }, (_, i) => ({ y: s.y, m: s.m, d: s.from + i }))), a = days[0], z = days[days.length - 1];
  const label = a.y === z.y ? `${a.d} ${MON[a.m - 1]} – ${z.d} ${MON[z.m - 1]}` : `${a.d} ${MON[a.m - 1]} ${a.y} – ${z.d} ${MON[z.m - 1]} ${z.y}`;
  return { y, m, k: ymKey(y, m), days, segs, head: segs[segs.length - 1], tail: segs.length > 1 ? segs[0] : null, n: days.length, label,
    labelY: a.y === z.y ? `${label} ${z.y}` : label, closeK: segs[0].k, last: z };
}
const segLabel = s => `${s.from}–${s.to} ${MON[s.m - 1]}`;   // "14–31 Oct", "1–13 Nov"
const dedNextKey = k => { const y = +k.slice(0, 4), m = +k.slice(5); return m === 12 ? ymKey(y + 1, 1) : ymKey(y, m + 1); };
/** the deduction email's months: every month in the shared history, and the one after the newest (its first days come in the box),
    up to this calendar month */
function dedMonths() {
  const L = wsMonths(), t = new Date(), now = ymKey(t.getFullYear(), t.getMonth() + 1), out = new Set(L);
  if (L.length) { const nx = dedNextKey(L[L.length - 1]); if (nx <= now) out.add(nx); }
  return [...out].sort();
}
/** the deduction email's month: the one chosen on its page, else the newest whose period has ended (November's from the 14th of
    November); the other pages keep theirs (the month being closed) */
function dedMonthNow() {
  const L = dedMonths(); if (!L.length) return '';
  if (state.dedMonth && L.includes(state.dedMonth)) return state.dedMonth;
  const today = todayIso(), ended = L.filter(k => dedDayKey(dedPeriod(+k.slice(0, 4), +k.slice(5)).last) < today);
  return ended.length ? ended[ended.length - 1] : L[L.length - 1];
}
/** the deduction email's month picker: each month with its period ("Nov 2026 · 14 Oct – 13 Nov") */
const dedMonthSelHtml = k => { const L = dedMonths(); return L.length ? `<label class="wsfield"><span>Month</span><select class="cell" data-dedmonth aria-label="Month">${L.slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(`${ymLabel(x)} · ${dedPeriod(+x.slice(0, 4), +x.slice(5)).label}`)}</option>`).join('')}</select></label>` : ''; };
/** a day of the period as the email keeps it (2026-10-12) and shows it (12-Oct) */
const dedDayKey = x => `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;
const dedDayLabel = key => { const [, mm, dd] = String(key).split('-').map(Number); return mm ? `${dd}-${MON[mm - 1]}` : String(key); };
/** how a month's period meets the next one's, in words for Settings: each day in one file, two files, or none */
function dedJoinText() {
  const { F, T } = dedDaysSet(), o = ordinal;
  if (F === 1) return T >= 28 ? 'The calendar month: each day is in one month\'s file.' : `Days after the ${o(T)} are in no month's file.`;
  if (T >= F) return `The ${T > F ? `${o(F)} to the ${o(T)}` : o(F)} of each month ${T > F ? 'are' : 'is'} in two months' files (this one and the next), so ${T > F ? 'they are' : 'it is'} counted twice. A first day of ${T + 1} counts each day once.`;
  if (F > T + 1) return `The ${F - 1 > T + 1 ? `${o(T + 1)} to the ${o(F - 1)}` : o(T + 1)} of each month ${F - 1 > T + 1 ? 'are' : 'is'} in no month's file. A first day of ${T + 1} counts each day once.`;
  return 'Each day is in one month\'s file.';
}
const dnMinutes = s => (s == null || s === '' ? null : String(s).split(',').map(v => (v === '' ? null : +v)));
const dnFit = (a, n) => (Array.isArray(a) ? Array.from({ length: n }, (_, i) => (a[i] === undefined ? null : a[i])) : null);
const isLegend = n => !!normSpace(n) && Core.notAPerson(n);
/** the exceptions' note of a person's corrections, for some days only ("Exceptions: 22 Oct Excuse (30 min); …") */
function dnExcNote(E, pid, m, keep) {
  const ed = E && pid ? E.get(pid) : null; if (!ed || !ed.days) return '';
  const days = Object.fromEntries(Object.entries(ed.days).filter(([d]) => keep(+d)));
  const X = excOfEdits({ days }, m); return X && X.note ? X.note : '';
}
// ---------------------------------------------------------------- the deduction's own corrections, for a month that is final
/** dedfix/<month>/edits/<person>: corrections after the deduction review for the days of a month already final. They count in the
    deduction email and its workbook only; the month's results stay as they were frozen. */
function watchDedFix(k) {
  if (!k || !state.db || state.dedFixBy[k] !== undefined) return;
  state.dedFixBy[k] = new Map();
  const take = sn => { const M = new Map(); sn.docs.forEach(d => M.set(d.id, d.data())); state.dedFixBy[k] = M; state.dedFixVer++; if (state.mailKind === 'ded' && !$('v-email').hidden) renderEmail(); };
  try {
    const c = state.db.collection(`dedfix/${k}/edits`);
    if (typeof c.onSnapshot === 'function') c.onSnapshot(take, () => {}); else c.get().then(take, () => {});
  } catch (e) { /* none */ }
}
const dedFixOf = k => { watchDedFix(k); const M = state.dedFixBy[k]; return M && M.size ? M : null; };
/** a month's corrections as the deduction counts them: the deduction's own once the month is final, the month's before */
const dedEditsOf = k => (monthLocked(k) ? dedFixOf(k) : attEditsOf(k));
// ---------------------------------------------------------------- one month's part of the period, by person
/** Map key -> { pid, who, days: [n], byDay, tardyTot, sch: [n] | null, act: [n] | null, inDed } over the month's days in the period,
    from that month in the tool (the shared history, with its corrections; a final month with the deduction's own), or the month on
    this page or a dropped monthly report when the email reads them. null when nothing has the month. Key 'p:<pid>' (someone in the
    roster) or 'r:<id or name>' (a row nobody in the roster matches). */
function dedSegPeople(seg) {
  const k = seg.k, ND = Core.daysIn(seg.y, seg.m), set = state.settings, r = state.wb && state.wb.report, out = new Map(), a = seg.from - 1, n = seg.n;
  const cut = v => (Array.isArray(v) ? dnFit(v.slice(a, a + n), n) : null);
  const inDed = x => set.dedBrands.includes(normSpace(x.brand)) && set.dedTeams.includes(normSpace(x.team));
  const keyOf = (pid, id, name) => (pid ? 'p:' + pid : 'r:' + (Core.cleanId(id) || 'N:' + normName(name)));
  const pidFor = (id, name) => { const c = Core.cleanId(id), nm = normName(name); const p = rosterRows().find(q => (c && Core.cleanId((effP(q._id) || q).nid) === c) || normName(q.name) === nm || (normSpace(q.sys) && normName(q.sys) === nm)); return p ? p._id : ''; };
  const put = (key, o) => { if (!isLegend(o.who.name)) out.set(key, o); };
  const byDay = d => (d || []).some(v => typeof v === 'number');
  if (!mailShared() && r && r.y === seg.y && r.m === seg.m) {   // a monthly report dropped on the page
    for (const x of r.att.filter(x => x.shown && x.vals)) { const pid = pidFor(x.id, x.name), d = dnFit(x.vals, ND); put(keyOf(pid, x.id, x.name), { pid, who: { id: x.id, name: x.name, brand: normSpace(x.brand), team: normSpace(x.team) }, days: cut(d), byDay: byDay(d), inDed: false }); }
    for (const x of r.ded) {
      const pid = pidFor(x.id, x.name), key = keyOf(pid, x.id, x.name), cur = out.get(key) || { pid, who: { id: x.id, name: x.name, brand: normSpace(x.brand), team: normSpace(x.team) }, days: null, byDay: false };
      put(key, { ...cur, sch: cut(x.sched), act: cut(x.act), inDed: true });
    }
  } else if (!mailShared() && state.model && state.y === seg.y && state.m === seg.m) {   // the month built on this page
    const A = state.ctx && state.ctx.attendance;
    for (const x of state.model) {
      if (!x.shown) continue;
      const pid = x.p._id, at = A ? A.get(pid) : null;
      put(keyOf(pid), { pid, who: { id: idText(x.p.nid), name: x.exp, brand: normSpace(x.p.brand), team: normSpace(x.p.team) }, days: at ? cut(at.days) : null, byDay: at ? byDay(at.days) : false, tardyTot: at ? at.tardyFile : null, sch: cut(x.sch), act: cut(x.actX || x.act), inDed: !!x.inDed });
    }
  } else if (monthData(k)) {   // the shared history
    const pidOf = new Map([...rowsByPid(k)].map(([pid, x]) => [x, pid])), F = monthLocked(k) ? dedFixOf(k) : null;
    for (const x0 of liveRows(k)) {
      const pid = pidOf.get(x0) || '', fx = F && pid ? F.get(pid) : null, x = fx ? withEdits(x0, fx, ND, k) : x0, d = daysOfRow(x, ND);
      put(keyOf(pid, x.id, x.n), { pid, who: { id: idText(x.id), name: x.n, brand: normSpace(x.brand), team: normSpace(x.team) }, days: cut(d), byDay: byDay(d), tardyTot: x.tardy, sch: cut(dnMinutes(x.ds)), act: cut(dnMinutes(x.da)), inDed: inDed(x) && x.ded != null });
    }
  } else return null;
  return out;
}
// ---------------------------------------------------------------- the month's own days: the box, then the corrections
/** the box's record for a month's first days: dednext/<month>, or the one the 13th-to-12th version kept under the month before */
function dnDoc(k) { const a = state.dedNext[k]; if (a && a.dm === k) return a; const b = state.dedNext[dedPrevKey(k)]; return b && !b.dm ? b : null; }
/** { att, sch, act: Map pid -> [n] (days 1 to n of the month, what wins over the month in the tool), notes, src } */
function dedHeadData(P) {
  const H = P.head, n = H.n, att = new Map(), sch = new Map(), act = new Map(), notes = new Map(), src = { att: false, ded: false, drop: false, corr: false };
  const D = dnDoc(H.k), E = monthLocked(H.k) ? dedFixOf(H.k) : (watchAttEdits(H.k), attEditsOf(H.k));
  if (D) {
    for (const [pid, v] of Object.entries(D.att || {})) { const w = dnFit(v, n); if (w.some(x => x != null)) { att.set(pid, w); src.att = src.drop = true; } }
    for (const [pid, v] of Object.entries(D.sch || {})) {
      const s = dnFit(v, n), a = dnFit((D.act || {})[pid], n) || Array(n).fill(null), X = E ? excOfEdits(E.get(pid), H.m) : null;   // an exception's minutes count as worked
      sch.set(pid, s); act.set(pid, s.map((x, i) => (x != null ? (X ? excAct(x, a[i], X.exc[i]) : a[i]) : null))); src.ded = src.drop = true;
    }
  }
  if (E) for (const [pid, ed] of E) {
    if (!ed || !ed.days) continue;
    const cur = att.get(pid) || Array(n).fill(null); let any = false;
    for (const [d, e] of Object.entries(ed.days)) { const i = +d - 1; if (i >= 0 && i < n && e) { cur[i] = editedDay(cur[i], e); any = true; } }
    if (any) { att.set(pid, cur); src.att = src.corr = true; }
    const note = dnExcNote(E, pid, H.m, d => d <= n); if (note) notes.set(pid, note);
  }
  return { att, sch, act, notes, src };
}
// ---------------------------------------------------------------- everyone over the period
/** [{ key, pid, who, days: [P.n], sch, act, inDed, notes: { att: [], ded: [] }, noMin: [month] }], with the period's sources */
function dedPeriodPeople(P) {
  const parts = P.segs.map(s => ({ s, M: dedSegPeople(s) })), H = dedHeadData(P), keys = new Map();
  for (const { M } of parts) if (M) for (const [key, x] of M) keys.set(key, { pid: x.pid, who: x.who });   // the latest month's brand and team
  for (const pid of new Set([...H.att.keys(), ...H.sch.keys()])) {   // someone with days only in the box (a joiner): from the roster
    const key = 'p:' + pid; if (keys.has(key)) continue;
    const p = effP(pid); if (!p || isLegend(p.name)) continue;
    keys.set(key, { pid, who: { id: idText(p.nid), name: p.name, brand: normSpace(p.brand), team: normSpace(p.team) } });
  }
  const out = [];
  for (const [key, base] of keys) {
    const days = [], sch = [], act = [], notes = { att: [], ded: [] }, noMin = []; let inDed = false;
    for (const { s, M } of parts) {
      const x = M ? M.get(key) : null, pid = base.pid, nul = () => Array(s.n).fill(null);
      let d = x && x.days ? x.days.slice() : nul(), sc = x && x.sch ? x.sch.slice() : nul(), ac = x && x.act ? x.act.slice() : nul();
      if (s.head && pid) {
        const o = H.att.get(pid), os = H.sch.get(pid), oa = H.act.get(pid);
        if (o) d = d.map((v, i) => (o[i] != null ? o[i] : v));
        if (os) { sc = sc.map((v, i) => (os[i] != null ? os[i] : v)); ac = ac.map((v, i) => (os[i] != null ? oa[i] : v)); inDed = true; }   // the scope is checked after
        if (H.notes.get(pid)) notes.ded.push(H.notes.get(pid));
      } else if (x && pid) { const nt = dnExcNote(dedEditsOf(s.k), pid, s.m, dd => dd >= s.from && dd <= s.to); if (nt) notes.ded.push(nt); }
      if (x && x.inDed) inDed = true;
      if (x && !x.byDay && +x.tardyTot > 0) notes.att.push(`${MON[s.m - 1]} late minutes came as one total (${x.tardyTot} min), not by day, so they are not in Tardy`);
      if (x && x.inDed && !(x.sch && x.sch.some(v => v != null))) noMin.push(MON[s.m - 1]);
      days.push(...d); sch.push(...sc); act.push(...ac);
    }
    out.push({ key, pid: base.pid, who: base.who, days, sch, act, inDed, notes, noMin });
  }
  return out;
}
/** a person's deduction over the period, as the workbook's Total (min): each day's Sched. - Actual (0 when Actual is 0); null with no minutes */
function dedTotal(x) {
  let tot = 0, any = false;
  (x.sch || []).forEach((sv, i) => { const av = (x.act || [])[i]; if (sv == null || av == null) return; any = true; if (av !== 0) tot += Math.max(0, sv - av); });
  return any ? Math.round(tot) : null;
}
// ---------------------------------------------------------------- the workbook's data (Writer2.dedMail) and the email's tables
/** the deduction email's workbook: { y, m, days, label, att, ded, P, people } over the period */
function dedPeriodData(P0) {
  const { y, m } = mailMonth(), P = P0 || dedPeriod(y, m), cfg = countFor(P.k), set = state.settings, L = dedPeriodPeople(P);
  const brandOk = w => set.dedBrands.includes(normSpace(w.brand)), scopeOk = w => brandOk(w) && set.dedTeams.includes(normSpace(w.team));
  const att = [], ded = [];
  for (const x of L) {
    if (brandOk(x.who) && x.days.some(v => v != null)) {
      const c = Kpi.countDays(x.days, cfg);
      att.push({ ...x.who, days: x.days, tardy: c.tardy || 0, sched: c.sched, actual: c.counted, note: x.notes.att.join(' · ') });
    }
    if (scopeOk(x.who) && x.inDed) {
      const any = x.sch.some((s, i) => s != null && x.act[i] != null), notes = [...x.notes.ded];
      if (x.noMin.length) notes.push(`No minutes by day for ${x.noMin.join(' and ')}: the month was saved before each day's minutes were kept`);
      ded.push({ ...x.who, sched: any ? x.sch : null, act: any ? x.act : null, total: null, note: notes.join(' · ').replace(/ · Exceptions: /g, '; ') });
    }
  }
  const order = w => (DEP_ORDER.indexOf(w.team) + 1 || 99), byDep = (a, b) => order(a) - order(b) || a.name.localeCompare(b.name);
  return { y: P.y, m: P.m, days: P.days, label: P.label, att: att.sort(byDep), ded: ded.sort(byDep), P, people: L };
}
/** the email's own tables over the period: { P, ded: [{ id, name, total }], abs: { rows, dates: [day keys] }, noMin: [names], legend: [names] } */
function dedPeriodMail() {
  const { y, m } = mailMonth(), P = dedPeriod(y, m), D = dedPeriodData(P), keys = P.days.map(dedDayKey);
  const ded = D.ded.map(x => ({ id: idText(x.id), name: x.name, total: dedTotal({ sch: x.sched, act: x.act }) ?? 0 })).sort((a, b) => a.name.localeCompare(b.name));
  const rows = D.people.map(x => ({ id: idText(x.who.id), name: x.who.name, brand: x.who.brand, team: x.who.team, onRoster: !!x.pid, shown: true, filled: x.days.some(v => v != null),
    days: x.days.map((v, i) => (v === 'Absent' ? keys[i] : null)).filter(Boolean) })).filter(a => a.days.length && absScopeOk(a)).sort((a, b) => a.name.localeCompare(b.name));
  const legend = [...new Set(P.segs.flatMap(s => { const M = monthData(s.k); return M ? M.rows.filter(r => isLegend(r.n)).map(r => normSpace(r.n)) : []; }))];
  return { P, ded, abs: { rows, dates: [...new Set(rows.flatMap(a => a.days))].sort() }, noMin: D.ded.filter(x => /No minutes by day/.test(x.note || '')).map(x => x.name), legend, filled: D.people.some(x => x.days.some(v => v != null)) };
}
/** what the email page says about the period: what is not in yet, and what was left out (M: the email's tables, dedPeriodMail) */
function dedPeriodWarns(y, m, M = dedPeriodMail()) {
  const P = dedPeriod(y, m), H = dedHeadData(P), w = [], hm = MONTH_LONG[P.head.m - 1], today = todayIso(), last = dedDayKey(P.last);
  if (P.tail) {
    const T = dedSegPeople(P.tail), tm = MONTH_LONG[P.tail.m - 1];
    if (!T) w.push(`The period runs ${P.label}: ${tm} ${P.tail.y} is not in the shared history, so ${segLabel(P.tail)} are empty in the email and its workbook.`);
    else if (![...T.values()].some(x => x.days && x.days.some(v => v != null))) w.push(`No attendance in ${tm} ${P.tail.y} yet, so ${segLabel(P.tail)} are empty.`);
  }
  const hp = dedSegPeople(P.head), hAtt = H.src.att || (hp && [...hp.values()].some(x => x.days && x.days.some(v => v != null)));
  const hMin = H.src.ded || (hp && [...hp.values()].some(x => x.sch && x.sch.some(v => v != null)));
  if (!hAtt) w.push(`The period runs ${P.label}: no attendance for ${segLabel(P.head)} yet, so those days are empty. Drop the supervisors' ${hm} sheets in the box below.`);
  if (!hMin) w.push(`No deduction minutes for ${segLabel(P.head)} yet: drop ${hm}'s Schedule and Agent Status Timeline in the box below.`);
  if (today <= last) w.push(`The period ends on ${P.last.d} ${MON[P.last.m - 1]}: what is not in yet shows empty until then.`);
  if (M.noMin.length) w.push(`No minutes by day for ${plural(M.noMin.length, 'person', 'people')} in a month of the period (saved before each day's minutes were kept): their deduction counts only the days with minutes (${M.noMin.slice(0, 6).join(', ')}${M.noMin.length > 6 ? ' and more' : ''}).`);
  if (M.legend.length) w.push(`Left out, not people: ${M.legend.slice(0, 10).map(n => `"${n}"`).join(', ')} (day codes or headings from an attendance sheet). Remove them from the roster in People.`);
  return w;
}
// ---------------------------------------------------------------- the box on the email page: the period and the month's first days
let dnWatching = false;
function watchDedNext() {
  if (dnWatching || !state.db) return; dnWatching = true;
  const take = sn => { const o = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.k) o[x.k] = x; }); state.dedNext = o; if (dnShown()) renderEmail(); };
  try {
    const c = state.db.collection('dednext');
    if (typeof c.onSnapshot === 'function') c.onSnapshot(take, () => { dnWatching = false; });
    else c.get().then(take, () => { dnWatching = false; });
  } catch (e) { dnWatching = false; }
}
const dnShown = () => state.mailKind === 'ded' && !$('v-email').hidden;
const dnCan = () => canWfmMail() && !viewing() && !!state.db;
function renderDedNext() {
  const el = $('dnCard'); if (!el) return;
  const show = state.mailKind === 'ded'; el.hidden = !show; if (!show) return;
  watchDedNext();
  const { y, m } = mailMonth(), P = dedPeriod(y, m), H = dedHeadData(P), D = dnDoc(P.head.k), NM = MONTH_LONG[P.head.m - 1], set = state.settings;
  const hp = dedSegPeople(P.head), hpAtt = !!hp && [...hp.values()].some(x => x.days && x.days.some(v => v != null)), hpMin = !!hp && [...hp.values()].some(x => x.sch && x.sch.some(v => v != null));
  const files = D && D.files ? D.files : [], kinds = t => files.filter(f => f.kind === t).length;
  const li = (ok, b, t) => `<li class="${ok ? 'ok' : 'warn'}"><span class="dnmark" aria-hidden="true"><svg width="12" height="12"><use href="#i-${ok ? 'check' : 'dash'}"/></svg></span><b>${esc(b)}</b> <span>${esc(t)}</span></li>`;   // the space: read as two parts
  let tailLi = '';
  if (P.tail) {
    const T = dedSegPeople(P.tail), TM = MONTH_LONG[P.tail.m - 1], src = mailShared() || !(state.wb && state.wb.report && state.wb.report.m === P.tail.m) ? ' in the tool' : ` (${state.wb.name})`;
    tailLi = li(!!T, segLabel(P.tail), T ? `From ${TM}${src}${monthLocked(P.tail.k) ? `; ${TM} is final, so corrections for these days count for the deduction only` : ''}` : `${TM} ${P.tail.y} is not in the shared history`);
  }
  const attTxt = H.src.drop && D && Object.keys(D.att || {}).length ? `${plural(Object.keys(D.att).length, 'person', 'people')} from ${plural(kinds('attendance'), 'sheet')} dropped here${hpAtt ? `; ${NM} in the tool for the rest` : ''}`
    : hpAtt ? `From ${NM} in the tool` : H.src.corr ? 'From the corrections made for those days' : `Not in yet: drop the supervisors' ${NM} attendance sheets below`;
  const dedTxt = D && Object.keys(D.sch || {}).length ? `${plural(Object.keys(D.sch).length, 'person', 'people')} from the Schedule and Agent Status Timeline dropped here`
    : hpMin ? `From ${NM} in the tool` : `Not in yet: drop ${NM}'s Schedule and Agent Status Timeline (to the ${ordinal(P.head.n)}) below`;
  const un = D && D.unmatched && D.unmatched.length ? `<p class="hint">Not found in the roster: ${esc(D.unmatched.slice(0, 12).join(', '))}${D.unmatched.length > 12 ? ` and ${D.unmatched.length - 12} more` : ''}.</p>` : '';
  el.innerHTML = `<h2 id="dnH">The period: ${esc(P.label)}</h2>
    <p class="hint">${esc(MONTH_LONG[m - 1])}'s email and its workbook run <b>${esc(P.label)}</b> (Settings › Deduction period: from the ${esc(ordinal(dedDaysSet().F))} of the month before to the ${esc(ordinal(dedDaysSet().T))}). The workbook's Attendance Report has ${esc(set.dedBrands.join(', ') || 'no brand')}, every team; its Monthly Deduction ${esc(set.dedBrands.join(', ') || '–')} · ${esc(set.dedTeams.join(', ') || '–')}.</p>
    <ul class="dnlist">${tailLi}${li(hpAtt || H.src.att, `${segLabel(P.head)} · attendance`, attTxt)}${li(hpMin || H.src.ded, `${segLabel(P.head)} · deduction minutes`, dedTxt)}</ul>
    ${dnCan() ? `<div class="drop small" data-ddrop role="button" tabindex="0" aria-describedby="dnHelp"${state.dnBusy ? ' aria-busy="true"' : ''}>
      <strong>${state.dnBusy ? 'Reading…' : `Drop ${esc(NM)}'s sheets`}</strong><span id="dnHelp">The supervisors' attendance sheets (Excel), and for the minutes the Schedule and the Agent Status Timeline. Only ${esc(segLabel(P.head))} is read.</span></div>` : ''}
    ${D && files.length ? `<p class="hint dnfiles">${esc(files.map(f => f.name).join(', '))} · ${esc(D.by || '')}${D.at ? `, ${esc(fmtWhen(D.at))}` : ''}</p>${un}${dnCan() ? '<button type="button" class="linkbtn" data-dnclear>Clear what was dropped here</button>' : ''}` : ''}
    ${state.dnMsg ? `<p class="hint dnmsg" role="status">${esc(state.dnMsg)}</p>` : ''}`;
}
/** a day of the month's first days for the Corrections box (Now): the dropped day with its correction; undefined when nothing was dropped */
function dnNow(pid, k, day) {
  if (!pid) return undefined;
  const { y, m } = mailMonth(), P = dedPeriod(y, m); if (k !== P.head.k || day > P.head.n) return undefined;
  const D = dnDoc(k), v = D && D.att && D.att[pid] ? D.att[pid][day - 1] : null; if (v == null) return undefined;
  const E = attEditsOf(k), e = E && E.get(pid) && E.get(pid).days ? E.get(pid).days[day] : null;
  return e ? editedDay(v, e) : v;
}
/** the dropped files: the supervisors' sheets give the month's first days (merged as Import merges a month's sheets), the Schedule
    and the Agent Status Timeline their minutes (both are needed: Actual is what was signed on inside the schedule) */
async function dnRead(files) {
  if (!files.length || state.dnBusy || !dnCan()) return;
  const { y, m } = mailMonth(), P = dedPeriod(y, m), Hd = P.head, n = Hd.n, NM = MONTH_LONG[Hd.m - 1];
  state.dnBusy = true; state.dnMsg = ''; renderDedNext();
  try {
    const gen = state.dnGen.k === Hd.k ? state.dnGen : (state.dnGen = { k: Hd.k, sch: [], tl: [] }), att = [], took = [], bad = [];
    for (const f of files) {
      let dets = null; try { dets = await parse(f.name, await f.arrayBuffer()); } catch (e) { dets = null; }
      const of = kind => (dets || []).filter(d => d.kind === kind && d.data), a = of('attendance'), s = of('schedule'), t = of('timeline');
      if (!a.length && !s.length && !t.length) { bad.push(f.name); continue; }
      a.forEach(d => att.push({ ...d, file: f.name })); if (s.length) gen.sch = s; if (t.length) gen.tl = t;
      took.push({ name: f.name, kind: a.length ? 'attendance' : s.length ? 'schedule' : 'timeline' });
    }
    const prev = dnDoc(Hd.k) || {}, out = { k: Hd.k, dm: Hd.k, at: new Date().toISOString(), by: whoNow(), files: [...(prev.files || []).filter(f => !took.some(x => x.name === f.name)), ...took],
      att: { ...(prev.att || {}) }, sch: { ...(prev.sch || {}) }, act: { ...(prev.act || {}) }, unmatched: [...(prev.unmatched || [])] };
    const said = [], done = [];   // what went wrong stays on the box; what was read is said once
    if (att.length) {
      const R = Att.merge(att, rosterRows(), { y: Hd.y, m: Hd.m, links: state.attLinks });
      let people = 0;
      for (const [pid, a] of R.byPerson) { const v = dnFit(a.days, n); if (!v.some(x => x != null)) continue; const old = dnFit(out.att[pid], n) || Array(n).fill(null); out.att[pid] = v.map((x, i) => (x != null ? x : old[i])); people++; }
      out.unmatched = [...new Set([...out.unmatched, ...R.unmatched.map(u => normSpace(u.name || u.idRaw)).filter(x => x && !isLegend(x))])].slice(0, 200);
      const used = R.files.filter(f => f.used);
      if (used.length) done.push(`1–${n} ${MON[Hd.m - 1]} for ${plural(people, 'person', 'people')}`); else said.push(`No days of ${NM} in the sheets (${R.files.map(f => f.reason).filter(Boolean)[0] || 'no dates'})`);
    }
    if (gen.sch.length && gen.tl.length) {
      const D = Core.computeDaily(gen.sch, gen.tl, Hd.y, Hd.m); let people = 0;
      for (const p of rosterRows()) {
        const ek = normName(normSpace(p.sys) ? p.sys : p.name), s = D.sched.get(ek), t = D.actual.get(ek); if (!s) continue;
        const sv = dnFit(s.days, n); if (!sv.some(x => x != null)) continue;
        out.sch[p._id] = sv; out.act[p._id] = dnFit(t ? t.days : null, n) || Array(n).fill(null); people++;
      }
      done.push(`the minutes of ${plural(people, 'person', 'people')}`);
    } else if (gen.sch.length || gen.tl.length) said.push(`The ${gen.sch.length ? 'Schedule' : 'Agent Status Timeline'} is in: drop the ${gen.sch.length ? 'Agent Status Timeline' : 'Schedule'} too for the minutes`);
    if (bad.length) said.push(`${bad.join(', ')}: not an attendance sheet, a Schedule or an Agent Status Timeline, so not read`);
    if (took.length) {
      state.dedNext = { ...state.dedNext, [Hd.k]: out };
      await queueWrite('dednext/' + Hd.k, () => state.db.doc('dednext/' + Hd.k).set(out)).catch(e => { said.push(`Not saved (${(e && e.code) || 'error'})`); });
    }
    state.dnMsg = said.length ? said.join('. ') + '.' : '';
    if (done.length) toast(`Read ${plural(took.length, 'file')}: ${done.join(', ')}.`);
  } finally { state.dnBusy = false; renderEmail(); }
}
function dnClear() {
  if (!dnCan()) return;
  const { y, m } = mailMonth(), P = dedPeriod(y, m), prev = dnDoc(P.head.k); if (!prev) return;
  const id = prev.k, o = { ...state.dedNext }; delete o[id]; state.dedNext = o; state.dnMsg = ''; state.dnGen = { k: '', sch: [], tl: [] };
  queueWrite('dednext/' + id, () => state.db.doc('dednext/' + id).delete()).catch(() => {});
  renderEmail();
  toast(`What was dropped for ${MONTH_LONG[P.head.m - 1]}'s first days is cleared.`, { label: 'Undo', fn: () => { state.dedNext = { ...state.dedNext, [id]: prev }; queueWrite('dednext/' + id, () => state.db.doc('dednext/' + id).set(prev)).catch(() => {}); renderEmail(); } });
}
(() => {
  const card = $('dnCard'), pick = $('dnPicker'); if (!card || !pick) return;
  const zone = e => e.target.closest && e.target.closest('[data-ddrop]');
  card.addEventListener('click', e => { if (zone(e)) pick.click(); else if (e.target.closest('[data-dnclear]')) dnClear(); });
  card.addEventListener('keydown', e => { if (zone(e) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick.click(); } });
  pick.addEventListener('change', () => { const f = [...pick.files]; pick.value = ''; dnRead(f); });
  ['dragenter', 'dragover'].forEach(t => card.addEventListener(t, e => { const z = zone(e); if (z) { e.preventDefault(); z.classList.add('over'); } }));
  card.addEventListener('dragleave', e => { const z = zone(e); if (z && !z.contains(e.relatedTarget)) z.classList.remove('over'); });
  card.addEventListener('drop', e => { const z = zone(e); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); dnRead([...(e.dataTransfer ? e.dataTransfer.files : [])]); });
})();
