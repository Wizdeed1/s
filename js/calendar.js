// ================================================================ MONTH CLOSE: who does what, by which day of the next month
// Each month closes in the first days of the next one: the exports (day 2), the KPI file and the EVAL (day 3), the results on
// the agents' pages and the ready email (day 5), the objections answered (day 8), the one-to-ones and the review (day 9), the
// final (day 10). Every step has an owner and a due day the senior manager can change. Most steps tick themselves when the
// tool sees them done; the others are ticked by hand. Late steps show in red, the next two days in amber, on the Supervisors
// page and in each owner's Today list.
Object.assign(state, { calCfg: null, calMarks: {}, calDaysOpen: false });
const CAL_STEPS = [
  { id: 'built', label: 'Month built from the Genesys exports', who: 'WFM analysts', roles: ['user', 'admin'], day: 2, go: 'step:import' },
  { id: 'kpi', label: 'KPI file in', who: 'WFM analysts', roles: ['user', 'admin'], day: 3, go: 'step:import' },
  { id: 'eval', label: 'Final EVAL in, every name linked', who: 'Quality team', roles: ['quality', 'admin'], day: 3, go: 'ws:quality' },
  { id: 'shared', label: 'Results on the agents\' pages', who: 'Senior manager', roles: ['senior', 'admin'], day: 5, go: 'ws:cycle' },
  { id: 'ready', label: '"One-to-ones are ready" email to the supervisors', who: 'Senior manager', roles: ['senior', 'admin'], day: 5, go: 'ws:cycle' },
  { id: 'objections', label: 'Agents\' objections answered', who: 'Supervisors', roles: ['spv'], day: 8, go: 'ws:team' },
  { id: 'done', label: 'One-to-ones held, every team finished', who: 'Supervisors', roles: ['spv'], day: 9, go: 'ws:team' },
  { id: 'review', label: 'Results for review sent to the VP', who: 'Senior manager', roles: ['senior', 'admin'], day: 9, go: 'ws:cycle' },
  { id: 'final', label: 'Month finalized', who: 'Senior manager', roles: ['senior'], day: 10, go: 'ws:results' },
  { id: 'finalmail', label: 'Final result form sent', who: 'Senior manager', roles: ['senior', 'admin'], day: 10, go: 'ws:cycle' },
  { id: 'deduction', label: 'Final deduction and absences email', who: 'WFM manager', roles: ['wfm', 'user', 'admin'], day: 10, go: 'wfm:mail' },
];
/** the month being closed now: the one before this calendar month */
function closeMonthNow() { const t = new Date(); return t.getMonth() === 0 ? ymKey(t.getFullYear() - 1, 12) : ymKey(t.getFullYear(), t.getMonth()); }
const calDays = () => ({ ...Object.fromEntries(CAL_STEPS.map(s => [s.id, s.day])), ...((state.calCfg && state.calCfg.days) || {}) });
function calDue(k, id) {
  if (id === 'done') { const C = state.cycles[k]; if (C && C.deadline) return C.deadline; }
  const [y, m] = k.split('-').map(Number), ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const d = Math.min(Core.daysIn(ny, nm), Math.max(1, Math.round(+calDays()[id] || 10)));
  return `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const fmtDue = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${Core.weekday(y, m, d).slice(0, 3)} ${d} ${MON[m - 1]}`; };
const dayDiff = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
/** every step of a month's close: due date, done (when, by whom), how late, and a note */
function calSteps(k) {
  const today = todayIso(), H = state.history[k], C = state.cycles[k] || {}, sent = C.sent || {}, Q = state.quality[k], F = state.finals[k], marks = ((state.calMarks[k] || {}).marks) || {};
  const past = k < closeMonthNow();   // a month closed before: what the tool did not see is "not recorded", not late
  const pages = Object.values(state.cycleLog || {}).filter(x => x && x.k === k && / own pages$/.test(x.what || '')).sort((a, b) => String(a.at).localeCompare(String(b.at))).pop();
  const R = spvList(), doneL = R.map(s => state.spvDone[`${k}_${s.pid}`]).filter(Boolean);
  return CAL_STEPS.map(s => {
    const due = calDue(k, s.id); let done = null, note = '';
    if (s.id === 'built') { if (H && !H.daily) done = { at: H.at, by: H.by || '' }; else if (H) note = 'only the daily data so far'; }
    if (s.id === 'kpi' && state.kpiFiles[k]) done = { at: state.kpiFiles[k].at, by: state.kpiFiles[k].by || '' };
    if (s.id === 'eval' && Q) { const n = (Q.unmatched || []).length; if (n) note = `${plural(n, 'name')} still to link`; else done = { at: Q.at, by: Q.by || '' }; }
    if ((s.id === 'ready' || s.id === 'review') && sent[s.id]) done = sent[s.id];
    if (s.id === 'shared' && pages) done = { at: pages.at, by: pages.by || '' };   // "Update the agents' pages" (also from before the month close came in)
    if (s.id === 'finalmail' && sent.final) done = sent.final;
    if (s.id === 'final' && monthLocked(k)) done = { at: F.at, by: F.byName || '' };
    if (s.id === 'done' && R.length) { if (doneL.length === R.length) done = { at: doneL.map(d => d.at).sort().pop(), by: '' }; else note = `${doneL.length} of ${R.length} supervisors finished`; }
    if (s.id === 'objections') { const n = objOpen(k).length; if (n) note = `${plural(n, 'objection')} waiting for an answer`; else if (today > due) done = { at: '', by: '', why: 'none waiting' }; else note = `agents can object until ${fmtDue(due)}`; }
    if (!done && marks[s.id]) done = { ...marks[s.id], hand: !marks[s.id].auto };
    const days = dayDiff(due, today), st = done ? 'done' : past ? 'past' : days < 0 ? 'late' : days <= 2 ? 'soon' : 'open';
    return { ...s, due, days, done, note, st, can: !done || !!done.hand };
  });
}
const calMine = s => s.roles.some(r => rolesNow().includes(r));
/** a step ticked (or unticked) by hand: read the record again first, so two people ticking at once both count */
async function calMark(k, id, on) {
  if (!state.db || !k) return;
  let cur = state.calMarks[k] || null; try { const s = await state.db.doc('steps/' + k).get(); if (s.exists) cur = s.data(); } catch (e) { /* the copy here */ }
  const next = { k, marks: { ...((cur && cur.marks) || {}) } }, s = CAL_STEPS.find(x => x.id === id);
  if (on) next.marks[id] = { at: new Date().toISOString(), by: whoNow(), ...(on === 'auto' ? { auto: true } : {}) }; else delete next.marks[id];
  state.calMarks[k] = next;
  try { await queueWrite('steps/' + k, () => state.db.doc('steps/' + k).set(next)); } catch (e) { toast(`Not saved (${(e && e.code) || 'error'}).`); }
  if (s && on !== 'auto') logCycle(k, `${on ? 'Ticked' : 'Unticked'} "${s.label}" by hand`);
  if (state.ws !== 'build') renderWs(); renderToday();   // the page, and the bell's list when it is open
}
/** a step the tool sees done somewhere it does not keep (the agents' pages updated, the final deduction email saved) */
function calAuto(k, id) { if (!k || !state.db || ((state.calMarks[k] || {}).marks || {})[id]) return; calMark(k, id, 'auto').catch(() => {}); }
async function calSaveDays(days) {
  if (!canCycle() || !state.db) return;
  state.calCfg = { days, at: new Date().toISOString(), by: whoNow() };
  try { await queueWrite('config/calendar', () => state.db.doc('config/calendar').set(state.calCfg)); toast('Saved: every month closes on these days.'); } catch (e) { toast(`Not saved (${(e && e.code) || 'error'}).`); }
  renderWs();
}
function calStateText(s) {
  if (s.done) return s.done.why ? 'Done · none waiting' : `Done${s.done.at ? ' ' + fmtWhen(s.done.at) : ''}${s.done.by ? ' · ' + s.done.by : ''}${s.done.hand ? ' (ticked by hand)' : ''}`;
  if (s.st === 'past') return 'Not recorded';
  if (s.st === 'late') return `${plural(-s.days, 'day')} late`;
  return s.days === 0 ? 'Due today' : s.days === 1 ? 'Due tomorrow' : `In ${s.days} days`;
}
/** the top of the Supervisors page: each supervisor and how many of their agents are finished (the one-to-one done, as Finish my
    team counts it), and nothing else */
function spvDoneHtml(k) {
  if (!k) return '';
  const L = spvList().map(s => ({ s, ...teamReady(s.pid, k) })), n = L.reduce((a, x) => a + x.n, 0), d = L.reduce((a, x) => a + x.done, 0);
  return `<div class="card spvdone" id="spvDone"><div class="cardhead"><div><h2>Supervisors · ${esc(ymLabel(k))}</h2><p class="cap">How many of each supervisor's agents are finished: their one-to-one done.</p></div>
    <div class="calsum"><b>${d}</b>/${n} agents finished</div></div>
    ${L.length ? `<ul class="sdlist">${L.map(x => `<li${x.n && x.done === x.n ? ' class="all"' : ''}><button class="linkbtn nm" data-cyc="team" data-spv="${esc(x.s.pid)}">${esc(x.s.name)}</button><span class="pbar" aria-hidden="true"><i style="width:${x.n ? Math.round(x.done / x.n * 100) : 0}%"></i></span><span class="sdn"><b>${x.done}</b> of ${plural(x.n, 'agent')} finished</span></li>`).join('')}</ul>`
      : '<p class="hint">No supervisors yet: fill the Supervisor column in the roster.</p>'}</div>`;
}
/** the day of the next month each month-close step is due (the bell's deadlines): a settings card on the Supervisors page */
function calDaysHtml() {
  if (!canCycle()) return '';
  const D = calDays();
  return `<details class="card caldays" data-det="caldays"${state.calDaysOpen ? ' open' : ''}><summary>Due days</summary><p class="hint">The day of the next month each month-close step is due, for every month. Each step's deadline shows in the bell of the people who do it. The one-to-ones are due on the deadline set above when there is one.</p>
    <div class="basegrid caldaygrid">${CAL_STEPS.map(s => `<label><span>${esc(s.label)}</span><input type="number" min="1" max="28" step="1" data-calday="${s.id}" value="${D[s.id]}" aria-label="Due day: ${esc(s.label)}"></label>`).join('')}</div></details>`;
}
function calCanGo(go, any) {
  const [kind, x] = String(go || '').split(':'), W = wsOfNow();
  if (kind === 'ws') return W.includes(x) && (any || state.ws !== x);
  if (kind === 'step') return W.includes('build');
  if (kind === 'wfm') return W.includes('wfm');
  return false;
}
// events: Mark done on a step's line in the bell (the close month), and the due days
document.addEventListener('click', e => {
  const m = e.target.closest && e.target.closest('[data-calmark]'); if (!m) return;
  const k = m.closest('#today, #notesTodo') ? closeMonthNow() : wsMonthNow(), id = m.dataset.calmark, on = !!m.dataset.on, s = CAL_STEPS.find(x => x.id === id);
  calMark(k, id, on);
  if (on && s && state.db) toast(`Marked done: ${s.label}`, { label: 'Undo', fn: () => calMark(k, id, false) });   // the line leaves the bell: a tick by mistake is undone here
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.matches || !t.matches('[data-calday]')) return;
  const v = Math.round(+t.value); if (!(v >= 1 && v <= 28)) { toast('Type a day from 1 to 28.'); renderWs(); return; }
  calSaveDays({ ...((state.calCfg && state.calCfg.days) || {}), [t.dataset.calday]: v });
});
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-det="caldays"]')) state.calDaysOpen = d.open; }, true);
