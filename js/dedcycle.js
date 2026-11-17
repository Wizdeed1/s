// ================================================================ THE DEDUCTION FILE'S PERIOD: the 13th of the month to the 12th of the next
// WFM team › Emails › Deduction and absences. The email's workbook (MC Monthly Deduction - <Mon> <Y>.xlsx) runs from the 13th of the
// month to the 12th of the next (October's: 13 Oct – 12 Nov), as payroll counts it. Its Attendance Report has the deduction brands'
// people (Settings: Virgin), every team; its Monthly Deduction the deduction scope (Virgin · CC), each day's Sched., Actual and Diff
// over the same days. The email's own tables (the deduction totals, the absences) stay the month's, as before.
// The month's days come from the month as before (the shared month, a dropped monthly report or this page). The next month's first
// twelve days come from, in this order: the corrections made for those days (Corrections after the review: a day like 5-Nov goes to
// November's corrections), the files dropped in the email page's "The days after <month>" box (the supervisors' attendance sheets;
// the Genesys Schedule and Agent Status Timeline for the minutes), the next month in the tool. What is dropped is kept with the shared
// data (dednext/<month>), so the final email, and another computer, have it too.
const DED_CUT = 13;   // a deduction file's first day; it ends on the day before, a month later
Object.assign(state, { dedNext: {}, dnBusy: false, dnMsg: '', dnGen: { k: '', sch: [], tl: [] } });
/** the file's days, in order: { y, m, d } from the 13th of the month to the 12th of the next, and the two months' keys */
function dedPeriod(y, m) {
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1, ND = Core.daysIn(y, m), days = [];
  for (let d = DED_CUT; d <= ND; d++) days.push({ y, m, d });
  for (let d = 1; d < DED_CUT; d++) days.push({ y: ny, m: nm, d });
  return { y, m, ny, nm, ND, k: ymKey(y, m), k2: ymKey(ny, nm), days, n: DED_CUT - 1, label: `${DED_CUT} ${MON[m - 1]} – ${DED_CUT - 1} ${MON[nm - 1]}` };
}
const dnMinutes = s => (s == null || s === '' ? null : String(s).split(',').map(v => (v === '' ? null : +v)));
const dnFit = (a, n) => (Array.isArray(a) ? Array.from({ length: n }, (_, i) => (a[i] === undefined ? null : a[i])) : null);
/** the exceptions' note of a person's corrections, for the days in the file only ("Exceptions: 22 Oct Excuse (30 min); …") */
function dnExcNote(k, pid, m, keep) {
  const E = attEditsOf(k), ed = E && pid ? E.get(pid) : null; if (!ed || !ed.days) return '';
  const days = Object.fromEntries(Object.entries(ed.days).filter(([d]) => keep(+d)));
  const X = excOfEdits({ days }, m); return X && X.note ? X.note : '';
}
// ---------------------------------------------------------------- the next month's first days, by person
/** { att, sch, act: Map pid -> [n] (day 1 to 12), notes: Map pid -> text, src: { att, ded, month, drop } } as the file shows them */
function dedNextData(P) {
  const n = P.n, ND2 = Core.daysIn(P.ny, P.nm), att = new Map(), sch = new Map(), act = new Map(), notes = new Map(), src = { att: false, ded: false, month: false, drop: false };
  // 3 · the next month in the tool (its rows already carry their corrections)
  if (monthData(P.k2)) for (const [pid, r] of rowsByPid(P.k2)) {
    const d = dnFit(daysOfRow(r, ND2), n); if (d.some(v => v != null)) { att.set(pid, d); src.month = src.att = true; }
    const s = dnFit(dnMinutes(r.ds), n), a = dnFit(dnMinutes(r.da), n);
    if (s && s.some(v => v != null)) { sch.set(pid, s); act.set(pid, a || Array(n).fill(null)); src.month = src.ded = true; }
  }
  // 2 · what was dropped here: a day it has wins over the month's
  const D = state.dedNext[P.k], E = (watchAttEdits(P.k2), attEditsOf(P.k2));
  if (D) {
    for (const [pid, v] of Object.entries(D.att || {})) { const cur = att.get(pid) || Array(n).fill(null), w = dnFit(v, n); att.set(pid, cur.map((x, i) => (w[i] != null ? w[i] : x))); src.att = src.drop = true; }
    for (const [pid, v] of Object.entries(D.sch || {})) {
      const s0 = sch.get(pid) || Array(n).fill(null), a0 = act.get(pid) || Array(n).fill(null), s = dnFit(v, n), a = dnFit((D.act || {})[pid], n) || Array(n).fill(null);
      const X = E ? excOfEdits(E.get(pid), P.nm) : null;   // an exception's minutes count as worked, as on the month's own days
      sch.set(pid, s0.map((x, i) => (s[i] != null ? s[i] : x))); act.set(pid, a0.map((x, i) => (s[i] != null ? (X ? excAct(s[i], a[i], X.exc[i]) : a[i]) : x)));
      src.ded = src.drop = true;
    }
  }
  // 1 · the corrections made for those days (after the review, a day like 5-Nov is November's)
  if (E) for (const [pid, ed] of E) {
    if (!ed || !ed.days) continue;
    const cur = att.get(pid) || Array(n).fill(null); let any = false;
    for (const [d, e] of Object.entries(ed.days)) { const i = +d - 1; if (i >= 0 && i < n && e) { cur[i] = editedDay(cur[i], e); any = true; } }
    if (any) { att.set(pid, cur); src.att = true; }
    const note = dnExcNote(P.k2, pid, P.nm, d => d < DED_CUT); if (note) notes.set(pid, note);
  }
  return { att, sch, act, notes, src };
}
/** a day of the file's next month for the Corrections box (Now): the dropped day with its correction; undefined when nothing was dropped for it */
function dnNow(pid, k, day) {
  if (!pid || day >= DED_CUT) return undefined;
  const { y, m } = mailMonth(), P = dedPeriod(y, m); if (k !== P.k2) return undefined;
  const D = state.dedNext[P.k], v = D && D.att && D.att[pid] ? D.att[pid][day - 1] : null; if (v == null) return undefined;
  const E = attEditsOf(k), e = E && E.get(pid) && E.get(pid).days ? E.get(pid).days[day] : null;
  return e ? editedDay(v, e) : v;
}
// ---------------------------------------------------------------- the workbook's data (Writer2.dedMail)
/** the people of the month by person: the shared month, a dropped monthly report, or this page. Map key -> { pid, who, days, tardy,
    sch, act, inDed, note }, key 'p:<pid>' (someone in the roster) or 'r:<id or name>' (a row nobody in the roster matches) */
function dedMonthPeople(y, m) {
  const k = ymKey(y, m), ND = Core.daysIn(y, m), set = state.settings, r = state.wb && state.wb.report, out = new Map();
  const inDed = x => set.dedBrands.includes(normSpace(x.brand)) && set.dedTeams.includes(normSpace(x.team));
  const keyOf = (pid, id, name) => (pid ? 'p:' + pid : 'r:' + (Core.cleanId(id) || 'N:' + normName(name)));
  const pidFor = (id, name) => { const c = Core.cleanId(id), nm = normName(name); const p = rosterRows().find(q => (c && Core.cleanId((effP(q._id) || q).nid) === c) || normName(q.name) === nm || (normSpace(q.sys) && normName(q.sys) === nm)); return p ? p._id : ''; };
  if (mailShared()) {
    const pidOf = new Map([...rowsByPid(k)].map(([pid, x]) => [x, pid]));
    for (const x of liveRows(k)) {
      const pid = pidOf.get(x) || '', who = { id: idText(x.id), name: x.n, brand: normSpace(x.brand), team: normSpace(x.team) };
      out.set(keyOf(pid, x.id, x.n), { pid, who, days: daysOfRow(x, ND), tardy: x.tardy, sch: dnMinutes(x.ds), act: dnMinutes(x.da), inDed: inDed(x) && x.ded != null });
    }
  } else if (r) {
    for (const a of r.att.filter(a => a.shown && a.vals)) { const pid = pidFor(a.id, a.name); out.set(keyOf(pid, a.id, a.name), { pid, who: { id: a.id, name: a.name, brand: normSpace(a.brand), team: normSpace(a.team) }, days: dnFit(a.vals, ND), inDed: false }); }
    for (const x of r.ded) {
      const pid = pidFor(x.id, x.name), key = keyOf(pid, x.id, x.name), cur = out.get(key) || { pid, who: { id: x.id, name: x.name, brand: normSpace(x.brand), team: normSpace(x.team) }, days: null };
      out.set(key, { ...cur, sch: x.sched || null, act: x.act || null, inDed: true });
    }
  } else if (state.model) {
    const A = state.ctx && state.ctx.attendance;
    for (const x of state.model) {
      if (!x.shown) continue;
      const pid = x.p._id, a = A ? A.get(pid) : null;
      out.set(keyOf(pid), { pid, who: { id: idText(x.p.nid), name: x.exp, brand: normSpace(x.p.brand), team: normSpace(x.p.team) }, days: a ? a.days : null, tardy: a ? a.tardyFile : null, sch: x.sch, act: x.actX || x.act, inDed: !!x.inDed });
    }
  } else return null;
  return out;
}
/** the deduction email's workbook: { y, m, days, label, att, ded } for Writer2.dedMail, over the file's period */
function dedPeriodData() {
  const { y, m } = mailMonth(), k = ymKey(y, m), cfg = countFor(k), set = state.settings, P = dedPeriod(y, m), c0 = DED_CUT - 1;
  const M = dedMonthPeople(y, m); if (!M) return null;
  const N = dedNextData(P), brandOk = w => set.dedBrands.includes(normSpace(w.brand)), scopeOk = w => brandOk(w) && set.dedTeams.includes(normSpace(w.team));
  // someone with days only in the next month (a joiner): from the roster
  for (const pid of new Set([...N.att.keys(), ...N.sch.keys()])) {
    if (M.has('p:' + pid)) continue;
    const p = effP(pid); if (!p) continue;
    M.set('p:' + pid, { pid, who: { id: idText(p.nid), name: p.name, brand: normSpace(p.brand), team: normSpace(p.team) }, days: null, sch: null, act: null, inDed: false });
  }
  const pad = (a, from, to) => (a ? dnFit(a.slice(from, to), to - from) : Array(to - from).fill(null));
  const att = [], ded = [];
  for (const x of M.values()) {
    const days = [...pad(x.days, c0, P.ND), ...(x.pid && N.att.get(x.pid) ? N.att.get(x.pid) : Array(P.n).fill(null))];
    if (brandOk(x.who) && days.some(v => v != null)) {
      const c = Kpi.countDays(days, cfg), byDay = (x.days || []).some(v => typeof v === 'number'), tot = +x.tardy || 0;
      att.push({ ...x.who, days, tardy: c.tardy || 0, sched: c.sched, actual: c.counted,
        note: !byDay && tot > 0 ? `${MON[m - 1]} late minutes came as one total (${tot} min), not by day, so they are not in Tardy` : '' });
    }
    const nS = x.pid ? N.sch.get(x.pid) : null;
    if (scopeOk(x.who) && (x.inDed || nS)) {
      const sched = [...pad(x.sch, c0, P.ND), ...(nS || Array(P.n).fill(null))], act = [...pad(x.act, c0, P.ND), ...(x.pid && N.act.get(x.pid) ? N.act.get(x.pid) : Array(P.n).fill(null))];
      const any = sched.some((s, i) => s != null && act[i] != null), notes = [x.pid ? dnExcNote(k, x.pid, m, d => d >= DED_CUT) : '', x.pid ? N.notes.get(x.pid) || '' : ''].filter(Boolean);
      if (!any && x.inDed) notes.push(`No minutes by day for ${MON[m - 1]}: the month was saved before each day's minutes were kept`);
      ded.push({ ...x.who, sched: any ? sched : null, act: any ? act : null, total: null, note: notes.join(' · ').replace(/ · Exceptions: /g, '; ') });
    }
  }
  const order = w => (DEP_ORDER.indexOf(w.team) + 1 || 99), byDep = (a, b) => order(a) - order(b) || a.name.localeCompare(b.name);
  return { y, m, days: P.days, label: P.label, att: att.sort(byDep), ded: ded.sort(byDep), next: N.src };
}
/** what the email page says about the file's period: warnings when the next month's days are not in yet */
function dedPeriodWarns(y, m) {
  const P = dedPeriod(y, m), N = dedNextData(P), nm = MON[P.nm - 1], w = [];
  if (!N.src.att) w.push(`The workbook runs ${P.label}: no attendance for 1–${P.n} ${nm} yet, so those days are empty in its Attendance Report. Drop the supervisors' ${MONTH_LONG[P.nm - 1]} sheets in The days after ${MONTH_LONG[m - 1]}.`);
  if (!N.src.ded) w.push(`No deduction minutes for 1–${P.n} ${nm} yet: the workbook's Monthly Deduction counts ${DED_CUT}–${P.ND} ${MON[m - 1]} only. Drop ${MONTH_LONG[P.nm - 1]}'s Schedule and Agent Status Timeline in The days after ${MONTH_LONG[m - 1]}.`);
  return w;
}
// ---------------------------------------------------------------- the box on the email page: The days after <month>
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
  const { y, m } = mailMonth(), P = dedPeriod(y, m), N = dedNextData(P), D = state.dedNext[P.k], nm = MON[P.nm - 1], NM = MONTH_LONG[P.nm - 1], set = state.settings;
  const files = D && D.files ? D.files : [], kinds = t => files.filter(f => f.kind === t).length;
  const attTxt = N.src.drop && D && Object.keys(D.att || {}).length ? `${plural(Object.keys(D.att).length, 'person', 'people')} from ${plural(kinds('attendance'), 'sheet')} dropped here${N.src.month ? `; ${NM} in the tool for the rest` : ''}`
    : N.src.att ? (N.src.month ? `From ${NM} in the tool` : 'From the corrections made for those days') : `Not in yet: drop the supervisors' ${NM} attendance sheets below`;
  const dedTxt = D && Object.keys(D.sch || {}).length ? `${plural(Object.keys(D.sch).length, 'person', 'people')} from the Schedule and Agent Status Timeline dropped here`
    : N.src.ded ? `From ${NM} in the tool` : `Not in yet: drop ${NM}'s Schedule and Agent Status Timeline (to the ${ordinal(P.n)}) below`;
  const li = (ok, b, t) => `<li class="${ok ? 'ok' : 'warn'}"><span class="dnmark" aria-hidden="true"><svg width="12" height="12"><use href="#i-${ok ? 'check' : 'dash'}"/></svg></span><b>${esc(b)}</b> <span>${esc(t)}</span></li>`;   // the space: read as two parts
  const un = D && D.unmatched && D.unmatched.length ? `<p class="hint">Not found in the roster: ${esc(D.unmatched.slice(0, 12).join(', '))}${D.unmatched.length > 12 ? ` and ${D.unmatched.length - 12} more` : ''}.</p>` : '';
  el.innerHTML = `<h2 id="dnH">The days after ${esc(MONTH_LONG[m - 1])}</h2>
    <p class="hint">The workbook runs <b>${esc(P.label)}</b>: its Attendance Report has ${esc(set.dedBrands.join(', ') || 'no brand')}, every team; its Monthly Deduction ${esc(set.dedBrands.join(', ') || '–')} · ${esc(set.dedTeams.join(', ') || '–')}. The email itself keeps ${esc(MONTH_LONG[m - 1])}'s totals.</p>
    <ul class="dnlist">${li(true, `${DED_CUT}–${P.ND} ${MON[m - 1]}`, `From ${MONTH_LONG[m - 1]}${mailShared() ? ' in the tool' : state.wb && state.wb.report ? ` (${state.wb.name})` : ' (this page)'}`)}${li(N.src.att, `1–${P.n} ${nm} · attendance`, attTxt)}${li(N.src.ded, `1–${P.n} ${nm} · deduction minutes`, dedTxt)}</ul>
    ${dnCan() ? `<div class="drop small" data-ddrop role="button" tabindex="0" aria-describedby="dnHelp"${state.dnBusy ? ' aria-busy="true"' : ''}>
      <strong>${state.dnBusy ? 'Reading…' : `Drop ${esc(NM)}'s sheets`}</strong><span id="dnHelp">The supervisors' attendance sheets (Excel), and for the minutes the Schedule and the Agent Status Timeline. Only 1–${P.n} ${esc(nm)} is read.</span></div>` : ''}
    ${D && files.length ? `<p class="hint dnfiles">${esc(files.map(f => f.name).join(', '))} · ${esc(D.by || '')}${D.at ? `, ${esc(fmtWhen(D.at))}` : ''}</p>${un}${dnCan() ? '<button type="button" class="linkbtn" data-dnclear>Clear what was dropped here</button>' : ''}` : ''}
    ${state.dnMsg ? `<p class="hint dnmsg" role="status">${esc(state.dnMsg)}</p>` : ''}`;
}
/** the dropped files: the supervisors' sheets give the next month's first days (merged as Import merges a month's sheets), the Schedule
    and the Agent Status Timeline their minutes (both are needed: Actual is what was signed on inside the schedule) */
async function dnRead(files) {
  if (!files.length || state.dnBusy || !dnCan()) return;
  const { y, m } = mailMonth(), P = dedPeriod(y, m), n = P.n, NM = MONTH_LONG[P.nm - 1];
  state.dnBusy = true; state.dnMsg = ''; renderDedNext();
  try {
    const gen = state.dnGen.k === P.k ? state.dnGen : (state.dnGen = { k: P.k, sch: [], tl: [] }), att = [], took = [], bad = [];
    for (const f of files) {
      let dets = null; try { dets = await parse(f.name, await f.arrayBuffer()); } catch (e) { dets = null; }
      const of = kind => (dets || []).filter(d => d.kind === kind && d.data), a = of('attendance'), s = of('schedule'), t = of('timeline');
      if (!a.length && !s.length && !t.length) { bad.push(f.name); continue; }
      a.forEach(d => att.push({ ...d, file: f.name })); if (s.length) gen.sch = s; if (t.length) gen.tl = t;
      took.push({ name: f.name, kind: a.length ? 'attendance' : s.length ? 'schedule' : 'timeline' });
    }
    const prev = state.dedNext[P.k] || {}, out = { k: P.k, at: new Date().toISOString(), by: whoNow(), files: [...(prev.files || []).filter(f => !took.some(x => x.name === f.name)), ...took],
      att: { ...(prev.att || {}) }, sch: { ...(prev.sch || {}) }, act: { ...(prev.act || {}) }, unmatched: [...(prev.unmatched || [])] };
    const said = [], done = [];   // what went wrong stays on the box; what was read is said once
    if (att.length) {
      const R = Att.merge(att, rosterRows(), { y: P.ny, m: P.nm, links: state.attLinks });
      let people = 0;
      for (const [pid, a] of R.byPerson) { const v = dnFit(a.days, n); if (!v.some(x => x != null)) continue; const old = out.att[pid] || Array(n).fill(null); out.att[pid] = v.map((x, i) => (x != null ? x : old[i])); people++; }
      out.unmatched = [...new Set([...out.unmatched, ...R.unmatched.map(u => normSpace(u.name || u.idRaw)).filter(Boolean)])].slice(0, 200);
      const used = R.files.filter(f => f.used);
      if (used.length) done.push(`1–${n} ${MON[P.nm - 1]} for ${plural(people, 'person', 'people')}`); else said.push(`No days of ${NM} in the sheets (${R.files.map(f => f.reason).filter(Boolean)[0] || 'no dates'})`);
    }
    if (gen.sch.length && gen.tl.length) {
      const D = Core.computeDaily(gen.sch, gen.tl, P.ny, P.nm); let people = 0;
      for (const p of rosterRows()) {
        const ek = normName(normSpace(p.sys) ? p.sys : p.name), s = D.sched.get(ek), t = D.actual.get(ek); if (!s) continue;
        const sv = dnFit(s.days, n); if (!sv.some(x => x != null)) continue;
        out.sch[p._id] = sv; out.act[p._id] = dnFit(t ? t.days : null, n) || Array(n).fill(null); people++;
      }
      done.push(`the minutes of ${plural(people, 'person', 'people')}`);
    } else if (gen.sch.length || gen.tl.length) said.push(`The ${gen.sch.length ? 'Schedule' : 'Agent Status Timeline'} is in: drop the ${gen.sch.length ? 'Agent Status Timeline' : 'Schedule'} too for the minutes`);
    if (bad.length) said.push(`${bad.join(', ')}: not an attendance sheet, a Schedule or an Agent Status Timeline, so not read`);
    if (took.length) {
      state.dedNext = { ...state.dedNext, [P.k]: out };
      await queueWrite('dednext/' + P.k, () => state.db.doc('dednext/' + P.k).set(out)).catch(e => { said.push(`Not saved (${(e && e.code) || 'error'})`); });
    }
    state.dnMsg = said.length ? said.join('. ') + '.' : '';
    if (done.length) toast(`Read ${plural(took.length, 'file')}: ${done.join(', ')}.`);
  } finally { state.dnBusy = false; renderEmail(); }
}
function dnClear() {
  if (!dnCan()) return;
  const { y, m } = mailMonth(), k = ymKey(y, m), prev = state.dedNext[k]; if (!prev) return;
  const o = { ...state.dedNext }; delete o[k]; state.dedNext = o; state.dnMsg = ''; state.dnGen = { k: '', sch: [], tl: [] };
  queueWrite('dednext/' + k, () => state.db.doc('dednext/' + k).delete()).catch(() => {});
  renderEmail();
  toast(`What was dropped for ${MONTH_LONG[m - 1]}'s workbook is cleared.`, { label: 'Undo', fn: () => { state.dedNext = { ...state.dedNext, [k]: prev }; queueWrite('dednext/' + k, () => state.db.doc('dednext/' + k).set(prev)).catch(() => {}); renderEmail(); } });
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
