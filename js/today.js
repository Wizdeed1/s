// ================================================================ TODAY: what each person has to do now, at the top of their first page
// Built from what the tool already knows: the month-close steps that are theirs (late ones first), the one-to-ones still to
// hold, objections to answer or fix, agents waiting for approval, forms waiting for a signature, last month's actions to check,
// stale daily data, names to link, accounts waiting. Each line opens the place to do it. "Hide for today" folds it to one line.
function todayHome() { const L = WS_OF[roleNow()] || []; return L[0] || ''; }
/** a part of a page that must never stop the page: on an error it is left out (and the error is noted in the console) */
function safeHtml(fn, ...a) { try { return fn(...a) || ''; } catch (e) { try { console.error('[MC] ' + (fn.name || 'part') + ':', e); } catch (x) { /* none */ } return ''; } }
function todayHidden() { const u = Auth.user(); return !!u && lsGet('mc-today-hide:' + u.id) === todayIso(); }
/** [{cls: late|soon|todo|info, t, s, go, btn}] for the person signed in */
function todayItems() {
  const r = roleNow(), u = Auth.user() || {}, out = [], k = closeMonthNow(), haveK = !!(state.history[k] || state.finals[k]);
  const add = (cls, t, s, go, btn) => out.push({ cls, t, s: s || '', go: go || '', btn: btn || '' });
  if (r === 'agent') { todayAgent(add); return out; }
  // the month close: my steps that are late or due in the next two days
  if (wsMonths().length && r !== 'spv') for (const s of calSteps(k)) if (!s.done && s.roles.includes(r) && (s.st === 'late' || s.st === 'soon')) add(s.st, `${s.label} · ${ymLabel(k)}`, `${s.st === 'late' ? `${plural(-s.days, 'day')} late` : s.days === 0 ? 'due today' : s.days === 1 ? 'due tomorrow' : `due ${fmtDue(s.due)}`}${s.note ? ' · ' + s.note : ''}`, ((g => (g ? g + '@' + k : ''))(calCanGo(s.go, true) ? s.go : (WS_OF[r] || []).includes('cycle') ? 'cal' : '')));
  if (r === 'spv' && u.pid) {
    const team = teamOf(u.pid).filter(p => p.status !== 'Inactive');
    if (haveK && team.length) {
      const st = team.map(p => ({ p, os: oneStatus(p._id, k) })), none = st.filter(x => x.os.st === 'none'), planned = st.filter(x => x.os.st === 'planned');
      const todayL = planned.filter(x => x.os.o && x.os.o.plannedAt === todayIso());
      if (todayL.length) add('todo', `${plural(todayL.length, 'one-to-one')} arranged for today`, todayL.map(x => gname(effP(x.p._id) || x.p) || x.p.name).slice(0, 6).join(', '), 'board@' + k, 'Open');
      const due = calDue(k, 'done'), dd = dayDiff(due, todayIso()), fin = !!state.spvDone[`${k}_${u.pid}`], cls = fin ? 'info' : dd < 0 ? 'late' : dd <= 2 ? 'soon' : 'todo';
      if (none.length || planned.length) add(cls, `${plural(none.length + planned.length, 'one-to-one')} to hold for ${ymLabel(k)}`, `${none.length} not arranged · ${planned.length} arranged · ${st.length - none.length - planned.length} held · due ${fmtDue(due)}${dd < 0 ? ` (${plural(-dd, 'day')} late)` : ''}`, 'board@' + k, none.length ? 'Arrange' : 'Open');
      const nm = x => gname(effP(x.p._id) || x.p) || x.p.name, acct = x => agentHasAccount(x.p._id);
      // the agents' parts: to review and send back with the final; finals to send; finals waiting for the signature
      const rv = st.filter(x => (x.os.o && replyNew(x.os.o)) || (x.os.fin && replyNew(x.os.fin)));
      if (rv.length) add('todo', `${plural(rv.length, 'agent')} sent their part: review it and send the final`, rv.map(nm).slice(0, 5).join(', '), 'board@' + k, 'Review');
      const nofin = st.filter(x => x.os.o && x.os.st === 'held' && acct(x) && !x.os.o.verdict && !replyNew(x.os.o));
      if (nofin.length) add('todo', `${plural(nofin.length, 'one-to-one')} without your final`, `${nofin.map(nm).slice(0, 5).join(', ')} · they sign after you send it`, 'board@' + k, 'Open');
      const unsigned = st.filter(x => x.os.o && x.os.o.verdict && x.os.st !== 'closed' && acct(x) && sigState(x.os.o) !== 'signed');
      if (unsigned.length) add('info', `${plural(unsigned.length, 'final')} waiting for the agent's signature`, unsigned.map(nm).slice(0, 5).join(', '), 'board@' + k, 'See');
      const F = fuStats(u.pid, k); if (F.todo) add('todo', `${plural(F.todo, 'agent')} with last month's actions to check`, 'In each one-to-one: did they do what was agreed?', 'board@' + k, 'Open');
      const rd = teamReady(u.pid, k);
      if (rd.n && !rd.left.length && !state.spvDone[`${k}_${u.pid}`] && !monthLocked(k)) add('todo', 'Every one-to-one is done: finish your team', 'The senior manager is told straight away.', 'finish@' + k, 'Finish');
    }
    const ob = objList({ st: ['open'] }).filter(objIsMine), fx = objList({ st: ['accepted'], fix: 'spv' }).filter(objCanFix);
    const od = dayDiff(calDue(k, 'objections'), todayIso());
    if (ob.length) add(od < 0 ? 'late' : od <= 2 ? 'soon' : 'todo', `${plural(ob.length, 'objection')} to answer`, ob.slice(0, 4).map(o => `${o.name} · ${objLabel(o)}`).join(' | '), ob.length === 1 ? 'obj:' + ob[0].id : 'objcard@' + ob[0].k, 'Answer');
    if (fx.length) add('todo', `${plural(fx.length, 'accepted objection')} to correct`, fx.slice(0, 4).map(o => `${o.name} · ${objLabel(o)}`).join(' | '), fx.length === 1 ? 'obj:' + fx[0].id : 'objcard@' + fx[0].k, 'Fix');
    const w = waitingList(u.pid); if (w.length) add('todo', `${plural(w.length, 'agent')} waiting for your approval`, w.map(a => a.name).slice(0, 5).join(', '), 'approvals', 'Approve');
  }
  if (['senior', 'admin'].includes(r)) {
    const ex = objList({ st: ['escalated'] }), fx = objList({ st: ['accepted'], fix: 'senior' }).filter(objCanFix);
    if (ex.length) add('todo', `${plural(ex.length, 'objection')} sent to you`, ex.slice(0, 4).map(o => `${o.name} · ${objLabel(o)}`).join(' | '), ex.length === 1 ? 'obj:' + ex[0].id : 'ws:cycle@' + ex[0].k, 'Decide');
    if (fx.length) add('todo', `${plural(fx.length, 'accepted objection')} on the incentive to correct`, 'Change it on Results, then mark it fixed.', fx.length === 1 ? 'obj:' + fx[0].id : 'ws:cycle@' + fx[0].k, 'Fix');
    if (haveK && r === 'senior') {
      const R = spvList(), left = R.filter(s => !state.spvDone[`${k}_${s.pid}`]), dl = (state.cycles[k] || {}).deadline;
      if (left.length && dl && todayIso() > dl) add('late', `${plural(left.length, 'supervisor')} past the one-to-one deadline`, left.map(s => s.name).slice(0, 6).join(', '), 'ws:cycle@' + k, 'Remind');
      const fresh = unseenDone(); if (fresh.length) add('info', `${plural(fresh.length, 'supervisor')} finished the team`, fresh.map(d => d.name).slice(0, 5).join(', '), 'ws:cycle@' + k, 'See');
      if (!monthLocked(k)) { const ne = liveRows(k).filter(x => x._el && !x._el.ok && !(x._adj && x._adj.elig != null)).length; if (ne) add('info', `${plural(ne, 'agent')} not eligible by the rules · ${ymLabel(k)}`, 'Decide on Results if any should be.', 'ws:results@' + k, 'Results'); }
    }
  }
  if (['wfm', 'user', 'admin'].includes(r)) {
    const fx = objList({ st: ['accepted'], fix: 'wfm' }).filter(objCanFix);
    if (fx.length) add('todo', `${plural(fx.length, 'objection')} to fix`, fx.slice(0, 4).map(o => `${o.name} · ${objLabel(o)}`).join(' | '), fx.length === 1 ? 'obj:' + fx[0].id : 'wfm:analytics@' + fx[0].k, 'Fix');
    const D = state.fresh.dayagents, age = D ? (Date.now() - new Date(D.at).getTime()) / 86400000 : null;
    if (canDailyTool() && D && age > 1.5) add('todo', 'Build yesterday\'s WFM Daily Review', `The last agents' day kept: ${D.what || ''} (${ago(D.at)}). Building the WFM Daily Review in Report builder keeps it, and the agents' "this month so far".`, 'wfm:builder', 'Report builder');
    if (canDailyMail()) for (const o of dmUnsent().slice(0, 2)) add(dayDiff(todayIso(), o.x.end) <= 1 ? 'todo' : 'info', `${plural(o.left.length, 'daily email')} to send · ${rbDayLabel(o.x)}`, `${o.left.map(rbName).join(', ')} · made by ${o.x.by || 'the WFM analyst'} ${ago(o.x.at)}`, 'dmail:' + o.x.k, 'Daily emails');
    const I = state.fresh.inter, ia = I ? (Date.now() - new Date(I.at).getTime()) / 86400000 : null;
    if (canInter() && (!I || ia > 8)) add('info', 'Interactions export', I ? `Last one ${ago(I.at)}: drop this week's on WFM › Interactions.` : 'None yet: drop the interactions export on WFM › Interactions.', 'wfm:inter', 'Interactions');
  }
  if (r === 'admin') {
    const P = (state.people || []).filter(a => a.role === 'pending' && !a.disabled && a.kind !== 'agent');
    if (P.length) add('todo', `${plural(P.length, 'account')} waiting for a role`, P.map(a => a.name).slice(0, 5).join(', '), 'accounts', 'Accounts');
  }
  if (['admin', 'user'].includes(r) && state.ctx && (state.issues || []).length) add('info', `${plural(state.issues.length, 'name')} to check in this month's exports`, 'Link each unknown name to a person, or add them.', 'step:issues', 'Review');
  if (r === 'quality') {
    const qk = haveK ? k : qMonthNow(), Q = state.quality[qk];
    if (Q && (Q.unmatched || []).length) add('todo', `${plural(Q.unmatched.length, 'name')} in the ${ymLabel(qk)} EVAL to link`, 'The tool linked the rest; choose who these are.', 'qnames@' + qk, 'Link');
    if (Q && (Q.check || []).length) add('info', `${plural(Q.check.length, 'link')} to glance at`, 'Linked by the tool; say if one is wrong.', 'qnames@' + qk, 'Check');
    const fx = objList({ st: ['accepted'], fix: 'quality' }).filter(objCanFix);
    if (fx.length) add('todo', `${plural(fx.length, 'objection')} on quality to fix`, fx.slice(0, 4).map(o => `${o.name} · ${objLabel(o)}`).join(' | '), fx.length === 1 ? 'obj:' + fx[0].id : 'ws:quality@' + fx[0].k, 'Fix');
  }
  const rank = { late: 0, soon: 1, todo: 2, info: 3 };
  return out.sort((a, b) => rank[a.cls] - rank[b.cls]);
}
function todayAgent(add) {
  const M = state.me; if (!M || M.err || !M.months) return;
  const months = Object.keys(M.months).sort(), u = Auth.user() || {};
  if (meFormsReady()) for (const [id, f0] of Object.entries(M.forms || {})) {
    const f = { ...f0, id }, w = meFormWhere(f), sg = meSigState(f), what = `${T(FORM_TITLE[f.kind] || 'Form')} · ${ymLabelT(fkey(f))}`;
    if (sg === 'signed' || w === 'sent') continue;
    if (w === 'sign' || sg === 'changed') add('todo', T('Sign your one-to-one'), `${what} · ${T('Your supervisor sent the final; read it and sign it on screen.')}`, 'sign:' + id, T('Read and sign'));
    else add('todo', T('Fill in your one-to-one'), `${what} · ${T('Fill in your part and send it to your supervisor.')}`, 'sign:' + id, T('Fill in'));
  }
  const seen = lsGet('mc-objseen:' + u.id) || '';
  const ans = Object.values(M.objs || {}).map(o => ({ o, e: (o.log || []).filter(x => x.role !== 'agent').pop() })).filter(x => x.e && x.e.at > seen);
  ans.sort((a, b) => String(b.e.at).localeCompare(String(a.e.at)));
  if (ans.length === 1) add('info', T('Your objection was answered'), `${objLabelT(ans[0].o)} · ${ans[0].e.by || ''}`, 'meobj@' + ans[0].o.k, T('Open my objections'));
  else if (ans.length) add('info', T('{n} of your objections were answered', { n: ans.length }), ans.map(x => objLabelT(x.o)).slice(0, 3).join(' | '), 'meobj@' + ans[0].o.k, T('Open my objections'));
  for (const k of months) {
    const w = objWindow(M.months[k], k); if (!w.open || !w.until) continue;
    const d = dayDiff(w.until, todayIso()); if (d >= 0 && d <= 2) add('soon', T('Objections for {m} close {when}', { m: ymLabelT(k), when: d === 0 ? T('today') : d === 1 ? T('tomorrow') : T('in {n} days', { n: d }) }), T('Check your numbers and object if something is not right.'), 'meobj@' + k, T('Open'));
  }
  const k = months[months.length - 1], rec = k ? M.months[k] : null;
  if (rec && rec.mtd && rec.mtd.fin != null && rec.status !== 'final') add('info', T('This month so far: final {f}', { f: pct1(rec.mtd.fin) }), rec.mtd.weak ? T('weakest: {k}', { k: `${rec.mtd.weak.name} ${rec.mtd.weak.value}` }) : '', 'mtd@' + k, T('Open'));
}
// ---------------------------------------------------------------- the welcome line at the top: the person's name, the date and the time, live
function renderWelcome() {
  const el = $('welcome'); if (!el) return;
  const u = Auth.user(); el.hidden = !u || roleNow() === 'pending';
  if (el.hidden) return;
  const first = firstName(u.name || u.username || '');
  $('welName').textContent = first ? T('Welcome, {first}', { first }) : T('Welcome');
  tickWelcome();
}
function tickWelcome() {
  const el = $('welTime'), w = $('welcome'); if (!el || !w || w.hidden) return;
  const d = new Date(), ar = langNow() === 'ar', wd = Core.weekday(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const date = ar ? `${AR_DAY[wd] || ''} ${d.getDate()} ${AR_MON[d.getMonth()]} ${d.getFullYear()}` : `${{ Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }[wd] || wd} ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
  let time = ''; try { time = d.toLocaleTimeString(ar ? 'ar-u-nu-latn' : [], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { time = d.toTimeString().slice(0, 8); }
  el.textContent = `${date} · ${time}`; el.dateTime = d.toISOString();
}
setInterval(() => { if (!document.hidden) tickWelcome(); }, 1000);
function renderToday() { try { renderTodayNow(); } catch (e) { const el = $('today'); if (el) { el.hidden = true; el.innerHTML = ''; } try { console.error('[MC] Today:', e); } catch (x) { /* none */ } } }
function renderTodayNow() {
  const el = $('today'); if (!el) return;
  const u = Auth.user(), r = roleNow(), home = todayHome();
  const show = !!u && r !== 'pending' && state.ws === home && (home !== 'build' || state.step === 'import') && (r === 'agent' ? !!(state.me && state.me.months) : state.rosterReady);
  if (!show) { el.hidden = true; el.innerHTML = ''; return; }
  let L = []; try { L = todayItems(); } catch (e) { L = []; }
  langApply();
  const n = L.length, cnt = n === 1 ? T('1 thing') : T('{n} things', { n }), late = L.filter(x => x.cls === 'late').length;
  const d = new Date(), dt = langNow() === 'ar' ? `${AR_DAY[Core.weekday(d.getFullYear(), d.getMonth() + 1, d.getDate())] || ''} ${d.getDate()} ${AR_MON[d.getMonth()]}` : `${Core.weekday(d.getFullYear(), d.getMonth() + 1, d.getDate())} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
  el.hidden = false;
  if (todayHidden()) { el.innerHTML = `<div class="todaymini"><b>${esc(T('Today'))}</b><span>${esc(n ? cnt : T('Nothing for you today.'))}${late ? ` · <span class="bad">${late} late</span>` : ''}</span><button class="linkbtn" data-today="show">${esc(T('Show'))}</button></div>`; return; }
  el.innerHTML = `<section class="card todaycard" aria-labelledby="h-today"><div class="cardhead"><div><h2 id="h-today">${esc(T('Today'))} <span class="tdate">· ${esc(dt)}</span></h2><p class="cap">${esc(n ? cnt : T('Nothing for you today.'))}${late ? ` · <span class="bad">${late} late</span>` : ''}</p></div>${n ? `<button class="btn sm ghost" data-today="hide">${esc(T('Hide for today'))}</button>` : ''}</div>
    ${n ? `<ul class="tlist">${L.slice(0, 9).map(x => `<li class="${x.cls}"><span class="tdot" aria-hidden="true"></span><span class="tli"><b>${esc(x.t)}</b>${x.s ? `<small dir="auto">${esc(x.s)}</small>` : ''}</span>${x.go ? `<button class="btn sm${x.cls === 'late' ? ' primary' : ''}" data-tgo="${esc(x.go)}">${esc(x.btn || T('Open'))}</button>` : ''}</li>`).join('')}</ul>${n > 9 ? `<p class="hint">${n - 9} more…</p>` : ''}` : ''}</section>`;
  // once a day: a reminder of what is late
  if (late && u && lsGet('mc-today-toast:' + u.id) !== todayIso()) { lsSet('mc-today-toast:' + u.id, todayIso()); const f = L.find(x => x.cls === 'late'); setTimeout(() => toast(`${plural(late, 'thing')} late: ${f.t}`, f.go ? { label: 'Open', fn: () => todayGo(f.go) } : undefined), 600); }
}
const scrollTo_ = sel => setTimeout(() => { const el = document.querySelector(sel); if (el) { el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); if (el.animate && !RM()) el.animate([{ boxShadow: '0 0 0 3px var(--focus)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1400 }); } }, 120);
/** the month a line is about, chosen on the page before going there; true when it changed */
function todayMonth(k) {
  if (!k) return false;
  if (roleNow() === 'agent') { const M = state.me; if (!M || !M.months || !M.months[k] || state.meMonth === k) return false; state.meMonth = k; return true; }
  let ch = false;
  if (wsMonths().includes(k) && state.wsMonth !== k) { state.wsMonth = k; ch = true; }
  if (typeof qMonths === 'function' && qMonths().includes(k) && state.qMonth !== k) { state.qMonth = k; ch = true; }
  return ch;
}
function todayGo(go) {
  let g = String(go || ''); const at = g.indexOf('@'), mk = at < 0 ? '' : g.slice(at + 1); if (at >= 0) g = g.slice(0, at);
  const i = g.indexOf(':'), kind = i < 0 ? g : g.slice(0, i), x = i < 0 ? '' : g.slice(i + 1);
  const ch = todayMonth(mk), here = w => { if (state.ws !== w && (WS_OF[roleNow()] || []).includes(w)) setWs(w); else if (ch) renderWs(); };
  if (kind === 'ws') { if (state.ws !== x) setWs(x); else renderWs(); return; }
  if (kind === 'step') { setWs('build'); setStep(x); return; }
  if (kind === 'dmail') { state.wfmTab = 'dmail'; state.dmSel = x; setWs('wfm'); renderWs(); return; }
  if (kind === 'wfm') { state.wfmTab = x; if (x === 'mail' && mk) { state.mailKind = 'ded'; state.mailStage = 'final'; } setWs('wfm'); renderWs(); return; }
  if (kind === 'obj') { openObj(x); return; }
  if (kind === 'objcard') { here('team'); scrollTo_('#objCard'); return; }
  if (kind === 'board') { here('team'); scrollTo_('#teamBody .board'); return; }
  if (kind === 'approvals') { here('team'); scrollTo_('#teamBody .approvals'); return; }
  if (kind === 'finish') { here('team'); setTimeout(() => { const b = document.querySelector('#teamBar [data-spvdone]'); if (b) { b.focus(); b.scrollIntoView({ block: 'center' }); } }, 60); return; }
  if (kind === 'cal') { here('cycle'); scrollTo_('#calCard'); return; }
  if (kind === 'qnames') { here('quality'); scrollTo_('#qualityBody .qnames'); return; }
  if (kind === 'accounts') { Auth.openAccounts(); return; }
  if (kind === 'sign') { openSign(x); return; }
  if (kind === 'meobj') { const u = Auth.user(); if (u) lsSet('mc-objseen:' + u.id, new Date().toISOString()); if (ch) renderWs(); else renderToday(); scrollTo_('#meObj'); return; }
  if (kind === 'mtd') { if (ch) renderWs(); scrollTo_('#meMtd'); }
}
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const g = t.closest('[data-tgo]'); if (g) { todayGo(g.dataset.tgo); return; }
  const h = t.closest('[data-today]'); if (h) { const u = Auth.user(); if (u) lsSet('mc-today-hide:' + u.id, h.dataset.today === 'hide' ? todayIso() : ''); renderToday(); }
});
