// ================================================================ OBJECTIONS: an agent questions a number, the supervisor answers, the senior manager decides
// An agent raises an objection on their own page (a day of attendance or adherence, a KPI, the AHT, the quality result, the
// incentive, or anything else) until the month's objection window closes. Their supervisor accepts it (and corrects the day,
// for attendance), says why not, or sends it to the senior manager; an agent whose objection was not accepted can ask the
// senior manager to look, once. An accepted objection that needs the WFM team, the quality team or the senior manager waits
// on their list until they mark it fixed. Every step is logged; the dispute rate per team is on the Supervisors page.
// Objections live in the agent's own place (agent/<pid>/obj), so in the shared folder only the agent and the staff can read them.
Object.assign(state, { objs: new Map(), objVer: 0, objEdit: null, objDoneOpen: false });
const OBJ_KINDS = [['att', 'A day of my attendance'], ['adh', 'A day of my adherence'], ['kpi', 'A KPI result'], ['aht', 'My AHT'], ['quality', 'My quality result'], ['inc', 'My incentive or eligibility'], ['other', 'Something else']];
const OBJ_KIND_SHORT = { att: 'Attendance', adh: 'Adherence', kpi: 'KPI', aht: 'AHT', quality: 'Quality', inc: 'Incentive', other: 'Other' };
const OBJ_ST = { open: 'Waiting for the supervisor', escalated: 'With the senior manager', accepted: 'Accepted · being fixed', fixed: 'Accepted and fixed', rejected: 'Not accepted' };
const OBJ_ST_CLS = { open: 'warn', escalated: 'info', accepted: 'good', fixed: 'good', rejected: 'bad' };
const OBJ_FIXER = { spv: 'the supervisor', wfm: 'the WFM team', quality: 'the quality team', senior: 'the senior manager' };
const ATT_WANT = [['Attend', 'Present'], ['AL', 'Annual leave'], ['SL', 'Sick leave'], ['OFF', 'Day off'], ['Other leave', 'Another leave']];
const attWord = v => (v == null ? T('blank') : typeof v === 'number' ? T('late {n} min', { n: v }) : T(({ Attend: 'Present', AL: 'Annual leave', SL: 'Sick leave', OFF: 'Day off', Absent: 'Absent', 'Other leave': 'Another leave' })[v] || v));

// ---------------------------------------------------------------- the objections the staff can see, kept live
const objSubs = new Map(), objLoaded = new Set(); let objPollT = 0;
function objApply(pid, sn) {
  const before = new Map([...state.objs].filter(([, o]) => o.pid === pid).map(([id, o]) => [id, o.status]));
  for (const id of before.keys()) state.objs.delete(id);
  sn.docs.forEach(d => { const o = d.data(); if (o && o.k) state.objs.set(d.id, { ...o, id: d.id, pid }); });
  const first = !objLoaded.has(pid); objLoaded.add(pid); state.objVer++;
  if (!first) objNotify(before, pid);
  if (state.ws !== 'build') renderWs(); else renderToday();
  if (state.objEdit && state.objEdit.mode === 'decide' && !$('dObj').hidden) renderObjDecide();
}
function watchObjs() {
  if (!state.db || !Auth.user() || !Auth.STAFF.has(roleNow())) return;
  const spv = roleNow() === 'spv', mine = spv ? new Set(myTeam().map(p => p._id)) : null, live = !!(state.db.folder || state.db.local);
  const want = (state.people || []).filter(a => a.role === 'agent' && a.pid && !a.disabled && (!mine || mine.has(a.pid))).map(a => a.pid);
  for (const pid of want) {
    if (objSubs.has(pid)) continue;
    if (live) { try { objSubs.set(pid, state.db.collection(`agent/${pid}/obj`).onSnapshot(sn => objApply(pid, sn), () => {})); } catch (e) { /* none */ } }
    else objSubs.set(pid, 'poll');   // the online page: a look every minute, so the page keeps its few live views for the shared data
  }
  if (!live && !objPollT && objSubs.size) { objPollT = setInterval(() => { if (!document.hidden) objPoll(); }, 60000); objPoll(); }
}
async function objPoll() { for (const [pid, v] of objSubs) if (v === 'poll') { try { objApply(pid, await state.db.collection(`agent/${pid}/obj`).get()); } catch (e) { /* next time */ } } }
/** a toast for what concerns me: a new objection in my team, one sent to the senior manager, one accepted for my team to fix */
function objNotify(before, pid) {
  const r = roleNow();
  for (const o of state.objs.values()) {
    if (o.pid !== pid || before.get(o.id) === o.status) continue;
    const mine = (o.status === 'open' && r === 'spv' && objIsMine(o)) || (o.status === 'escalated' && ['senior', 'admin'].includes(r)) || (o.status === 'accepted' && objCanFix(o));
    if (mine) toast(`${o.name}: ${o.status === 'open' ? 'a new objection' : o.status === 'escalated' ? 'an objection for the senior manager' : 'an objection to fix'} (${objLabel(o)})`, { label: 'Open', fn: () => openObj(o.id) });
  }
}
function objList(f = {}) {
  return [...state.objs.values()].filter(o => (!f.k || o.k === f.k) && (!f.pid || o.pid === f.pid) && (!f.st || f.st.includes(o.status)) && (!f.fix || o.fixBy === f.fix) && (!f.spv || objSpvOf(o) === f.spv) && (!f.mine || objIsMine(o)))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
const objOpen = k => objList({ k, st: ['open', 'escalated'] });
const objSpvOf = o => { const p = state.roster.find(x => x._id === o.pid); return (p && p.spv) || o.spv || ''; };
const objIsMine = o => roleNow() !== 'spv' || objSpvOf(o) === (Auth.user() || {}).pid;
/** who corrects it once it is accepted */
function objFixer(o) {
  const it = o.item || {};
  if (it.kind === 'adh' || it.kind === 'aht') return 'wfm';
  if (it.kind === 'quality') return 'quality';
  if (it.kind === 'inc') return 'senior';
  if (it.kind === 'kpi') { const k = [...KPI_INDEX().values()].find(x => normName(x.name) === normName(it.key || '')); return k && ownerOf(k) === 'quality' ? 'quality' : 'wfm'; }
  return 'spv';
}
function objCanFix(o) {
  const r = roleNow(); if (o.status !== 'accepted') return false;
  return r === 'admin' || (o.fixBy === 'spv' && r === 'spv' && objIsMine(o)) || (o.fixBy === 'wfm' && r === 'wfm') || (o.fixBy === 'quality' && r === 'quality') || (o.fixBy === 'senior' && r === 'senior');
}
const objCanAnswer = o => o.status === 'open' && ((roleNow() === 'spv' && objIsMine(o)) || ['senior', 'admin'].includes(roleNow()));
const objCanDecide = o => o.status === 'escalated' && ['senior', 'admin'].includes(roleNow());
/** "Attendance · 3 Sep: Absent" */
function objLabel(o) {
  const it = o.item || {}, mo = MON[+String(o.k).slice(5) - 1];
  return `${OBJ_KIND_SHORT[it.kind] || 'Other'}${it.day ? ` · ${it.day} ${mo}` : ''}${it.kind === 'kpi' && it.key ? ` · ${it.key}` : ''}${it.value != null && it.value !== '' ? `: ${it.value}` : ''}`;
}
const objWantText = o => (o.item && o.item.kind === 'att' && o.want ? attWordEn(o.want) : o.want || '');
const attWordEn = v => (v == null || v === '' ? 'blank' : typeof v === 'number' ? `late ${v} min` : ({ Attend: 'Present', AL: 'Annual leave', SL: 'Sick leave', OFF: 'Day off', Absent: 'Absent', 'Other leave': 'Another leave' })[v] || String(v));

// ---------------------------------------------------------------- answering (the staff's drawer)
function openObj(id) { if (!state.objs.has(id)) return; state.objEdit = { mode: 'decide', id }; renderObjDecide(); openDrawer('dObj'); }
function renderObjDecide() {
  const o = state.objs.get(state.objEdit.id); if (!o) { closeDrawer(); return; }
  $('dObj').dir = 'ltr';
  $('h-obj').textContent = `${o.name || 'Agent'} · ${OBJ_KIND_SHORT[(o.item || {}).kind] || 'Objection'}`;
  $('objSub').textContent = `${ymLabel(o.k)} · raised ${fmtWhen(o.at)}${objSpvOf(o) ? ' · supervisor ' + supName(objSpvOf(o)) : ''}`;
  const it = o.item || {}, att = it.kind === 'att', p = state.roster.find(x => x._id === o.pid);
  const r = p ? rowOf(o.pid, o.k) : null, now = r ? objNowStaff(r, o) : '';
  const box = (l, t, cls = '') => `<div class="rbox ${cls}"><span>${esc(l)}</span><p dir="auto">${t ? esc(t).replace(/\n/g, '<br>') : '<i class="subtle">–</i>'}</p></div>`;
  let h = `<div class="objhead"><span class="pill ${OBJ_ST_CLS[o.status] || ''}">${esc(OBJ_ST[o.status] || o.status)}</span>${o.fixBy && ['accepted', 'fixed'].includes(o.status) ? `<span class="hint">${o.status === 'fixed' ? 'Fixed by' : 'To fix:'} ${esc(OBJ_FIXER[o.fixBy] || o.fixBy)}</span>` : ''}</div>`
    + `<div class="pfacts rgrid"><div><span>What</span><b>${esc(objLabel(o))}</b></div><div><span>In the tool now</span><b>${esc(now || '–')}</b></div><div><span>They say it should be</span><b dir="auto">${esc(objWantText(o) || '–')}</b></div></div>`
    + box('Their explanation', o.text);
  h += `<section class="sec"><h3>What happened</h3><ul class="ilist objlog">${(o.log || []).map(e => `<li><span class="nm">${esc(e.what)}</span><span class="sg">${esc(e.by || '')}${e.role ? ` (${esc(ROLE_NAME[e.role] || e.role)})` : ''} · ${esc(fmtWhen(e.at))}</span></li>`).join('')}</ul></section>`;
  const answer = objCanAnswer(o), decide = objCanDecide(o), fix = objCanFix(o), locked = monthLocked(o.k);
  let acts = '';
  if (locked && (answer || decide || fix)) h += `<div class="banner info">${esc(ymLabel(o.k))} is final: what is decided here no longer changes its results; the senior manager can still change them on Results.</div>`;
  if (answer) acts = `${att && roleNow() === 'spv' && o.want ? `<button class="btn primary" data-objact="fixatt">Accept and correct the day to ${esc(attWordEn(o.want))}</button>` : `<button class="btn primary" data-objact="accept">Accept</button>`}<button class="btn" data-objact="reject">Not accepted</button>${roleNow() === 'spv' ? '<button class="btn ghost" data-objact="escalate">Send to the senior manager</button>' : ''}`;
  if (decide) acts = `${att ? '<button class="btn primary" data-objact="accept" title="The supervisor then corrects the day">Accept</button>' : '<button class="btn primary" data-objact="accept">Accept</button>'}<button class="btn" data-objact="reject">Not accepted</button>`;
  if (fix) acts = `${att && o.fixBy === 'spv' && roleNow() === 'spv' && o.want ? `<button class="btn primary" data-objact="fixatt">Correct the day to ${esc(attWordEn(o.want))} and mark fixed</button>` : ''}<button class="btn${att && o.want && roleNow() === 'spv' ? '' : ' primary'}" data-objact="fixed">Mark fixed</button>`;
  if (acts) h += `<section class="sec"><h3>${answer ? 'Your answer' : decide ? 'Your decision' : 'Fixed?'}</h3><div class="field"><span class="lbl">${answer || decide ? 'Note to the agent (needed when not accepted)' : 'What was corrected (optional)'}</span><textarea id="objNote" rows="3" placeholder="${answer || decide ? 'For example: the sign-on shows 09:42; the shift started at 09:00.' : 'For example: the AHT was recalculated without the test calls.'}"></textarea></div></section>`;
  if (!acts && o.decided && o.decided.note) h += box('Last note', o.decided.note);
  $('objBody').innerHTML = h;
  $('objFoot').innerHTML = `<span class="spacer"></span>${acts || '<button class="btn" data-close>Close</button>'}`;
}
/** the value in the tool now, as the staff see it */
function objNowStaff(r, o) {
  const it = o.item || {}, k = o.k, ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
  if (it.kind === 'att' && it.day) return attWordEn(daysOfRow(r, ND)[it.day - 1] ?? null) || 'blank';
  if (it.kind === 'adh' && it.day) { const a = adOf(r), v = a ? a[it.day - 1] : null; return v == null ? 'NA' : pct(v); }
  if (it.kind === 'kpi') { const x = (r.kpi || []).find(z => normName(z[0]) === normName(it.key || '')); return x ? x[3] : ''; }
  if (it.kind === 'aht') return mss(r.aht);
  if (it.kind === 'quality') { const q = qRow(k, o.pid); return q && q.kpi && q.kpi.qobs != null ? pct(q.kpi.qobs, 1) : ''; }
  if (it.kind === 'inc') return r._el ? (r._el.ok ? 'eligible' : `not eligible: ${(r._el.why || []).join(', ')}`) : '';
  return '';
}
async function objDecide(id, act) {
  const o0 = state.objs.get(id); if (!o0 || !state.db) return;
  const note = normSpace(($('objNote') || {}).value || '').slice(0, 800);
  if (act === 'reject' && !note) { toast('Write why it is not accepted, so the agent understands.'); $('objNote').focus(); return; }
  const ref = state.db.doc(`agent/${o0.pid}/obj/${id}`);
  let cur = o0; try { const s = await ref.get(); if (s.exists) cur = { ...s.data(), id, pid: o0.pid }; } catch (e) { /* the copy here */ }
  if (cur.status !== o0.status) { toast('Someone answered it a moment ago: here it is as it is now.'); state.objs.set(id, cur); renderObjDecide(); return; }
  const at = new Date().toISOString(), by = whoNow(), role = roleNow(), next = { ...cur, log: [...(cur.log || [])] };
  let what = '';
  if (act === 'fixatt') {
    const v = cur.want, day = +(cur.item || {}).day;
    if (!v || !day || !editAttDay(cur.pid, cur.k, day, v, `Objection accepted${note ? ': ' + note : ''}`)) return;
    Object.assign(next, { status: 'fixed', fixBy: 'spv', fixed: { at, by, note } }); what = `Accepted: corrected ${day} ${MON[+cur.k.slice(5) - 1]} to ${attWordEn(v)}${note ? ' · ' + note : ''}`;
  } else if (act === 'accept') { next.status = 'accepted'; next.fixBy = objFixer(cur); what = `Accepted${note ? ': ' + note : ''} · to fix: ${OBJ_FIXER[next.fixBy]}`; }
  else if (act === 'reject') { next.status = 'rejected'; what = `Not accepted: ${note}`; }
  else if (act === 'escalate') { next.status = 'escalated'; next.escalatedBy = role; what = `Sent to the senior manager${note ? ': ' + note : ''}`; }
  else if (act === 'fixed') { next.status = 'fixed'; next.fixed = { at, by, note }; what = `Fixed${note ? ': ' + note : ''}`; }
  else return;
  next.decided = { at, by, role, note }; next.log.push({ at, by, role, what });
  const body = { ...next }; delete body.pid;
  try { await queueWrite(`agent/${o0.pid}/obj/${id}`, () => ref.set(body)); }
  catch (e) { toast(`Not saved (${(e && e.code) || 'error'}).`); return; }
  state.objs.set(id, { ...body, id, pid: o0.pid }); state.objVer++;
  logCycle(cur.k, `${cur.name}'s objection (${objLabel(cur)}): ${what}`);
  toast({ fixatt: 'Accepted, and the day is corrected. The agent sees it on their page.', accept: `Accepted. ${next.fixBy === 'spv' ? 'Correct it, then mark it fixed.' : `It waits for ${OBJ_FIXER[next.fixBy]} to fix it.`}`, reject: 'Answered. The agent sees your note.', escalate: 'Sent to the senior manager.', fixed: 'Marked fixed. The agent sees it.' }[act]);
  closeDrawer(); renderWs();
}

// ---------------------------------------------------------------- the staff's lists
function objRowHtml(o, opts = {}) {
  return `<li class="objrow"><button class="linkbtn nm" data-objopen="${esc(o.id)}" dir="auto">${esc(o.name || 'Agent')}</button><span class="sg">${esc(objLabel(o))}${o.want ? ` → <b>${esc(objWantText(o))}</b>` : ''} · ${esc(ago(o.at) || fmtWhen(o.at))}${opts.spv ? ` · ${esc(supName(objSpvOf(o)) || 'no supervisor')}` : ''}</span><span class="sp"></span><span class="pill ${OBJ_ST_CLS[o.status] || ''}">${esc(o.status === 'accepted' ? `To fix: ${OBJ_FIXER[o.fixBy] || ''}` : OBJ_ST[o.status] || o.status)}</span><button class="btn sm" data-objopen="${esc(o.id)}">${objCanAnswer(o) || objCanDecide(o) ? 'Answer' : objCanFix(o) ? 'Fix' : 'Open'}</button></li>`;
}
/** the supervisor's card (the Team page): her team's objections for the month */
function objTeamHtml(k, spvPid) {
  const all = objList({ k }).filter(o => !spvPid || objSpvOf(o) === spvPid); if (!all.length) return '';
  const act = all.filter(o => objCanAnswer(o) || objCanFix(o) || objCanDecide(o)), rest = all.filter(o => !act.includes(o));
  const due = calDue(k, 'objections'), days = dayDiff(due, todayIso());
  return `<div class="card objcard" id="objCard"><div class="cardhead"><div><h2>Objections · ${esc(ymLabel(k))}${act.length ? ` · ${act.length} for you` : ''}</h2><p class="cap">What agents questioned on their own page. Accept (attendance is corrected straight away), say why not, or send it to the senior manager. Answers are due ${esc(fmtDue(due))}${days < 0 ? ` (${plural(-days, 'day')} ago)` : ''}.</p></div></div>
    ${act.length ? `<ul class="ilist">${act.map(o => objRowHtml(o)).join('')}</ul>` : '<p class="subtle">Nothing waiting for you.</p>'}
    ${rest.length ? `<details class="objdone" data-det="objdone"${state.objDoneOpen ? ' open' : ''}><summary>Answered · ${rest.length}</summary><ul class="ilist">${rest.map(o => objRowHtml(o)).join('')}</ul></details>` : ''}</div>`;
}
/** a list of the objections someone has to fix (the WFM page, the Quality page) */
function objFixHtml(fix) {
  const L = objList({ st: ['accepted'], fix }).filter(objCanFix); if (!L.length) return '';
  return `<div class="card objcard"><div class="cardhead"><div><h2>Objections to fix · ${L.length}</h2><p class="cap">Accepted by a supervisor or the senior manager; the correction is yours. Fix the number, then mark it fixed: the agent sees it on their page.</p></div></div><ul class="ilist">${L.map(o => objRowHtml(o, { spv: true })).join('')}</ul></div>`;
}
/** the senior manager's card (the Supervisors page): what is sent to him, and the dispute rate of each team */
function objSeniorHtml(k) {
  const all = objList({ k }), esc2 = all.filter(o => objCanDecide(o) || (o.status === 'accepted' && o.fixBy === 'senior' && objCanFix(o)));
  const S = spvList(); if (!all.length && !S.length) return '';
  const rows = S.map(s => { const L = all.filter(o => objSpvOf(o) === s.pid), team = teamOf(s.pid).filter(p => p.status !== 'Inactive').length, dec = L.filter(o => ['accepted', 'fixed', 'rejected'].includes(o.status)), acc = dec.filter(o => o.status !== 'rejected').length;
    return { s, n: L.length, team, open: L.filter(o => o.status === 'open').length, esc: L.filter(o => o.status === 'escalated').length, acc, rej: dec.length - acc, rate: team ? L.length / team : null }; });
  const tot = all.length;
  if (!tot) return `<div class="card objcard"><div class="cardhead"><div><h2>Objections · ${esc(ymLabel(k))}</h2><p class="cap">None yet. Agents can object on their own page until ${esc(fmtDue(calDue(k, 'objections')))}; what they raise, and how each team answers, shows here.</p></div></div></div>`;
  return `<div class="card objcard"><div class="cardhead"><div><h2>Objections · ${esc(ymLabel(k))}</h2><p class="cap">Agents' objections and how each team answered them. A high rate means the numbers or the one-to-ones need a closer look in that team.</p></div><div class="calsum"><b>${tot}</b> raised${esc2.length ? ` · <span class="warnt">${esc2.length} for you</span>` : ''}</div></div>
    ${esc2.length ? `<h3 class="sub">For you</h3><ul class="ilist">${esc2.map(o => objRowHtml(o, { spv: true })).join('')}</ul>` : ''}
    <div class="tablewrap restab"><table><thead><tr><th>Supervisor</th><th class="r">Agents</th><th class="r">Objections</th><th class="r">Waiting</th><th class="r">With you</th><th class="r">Accepted</th><th class="r">Not accepted</th><th class="r">Dispute rate</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td>${esc(x.s.name)}</td><td class="r num">${x.team}</td><td class="r num">${x.n}</td><td class="r num${x.open ? ' bad' : ''}">${x.open}</td><td class="r num">${x.esc}</td><td class="r num">${x.acc}</td><td class="r num">${x.rej}</td><td class="r num">${x.rate == null ? '–' : pct(x.rate, 1)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No supervisors yet.</td></tr>'}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- the agent: raise one, see the answers, ask the senior manager once
/** can the agent still object to this month? (until the day the senior manager set for answers, and never after the final) */
function objWindow(rec, k) {
  if (!rec) return { open: false, until: '' };
  const until = rec.objUntil || (k ? calDue(k, 'objections') : '');   // pages shared before the month close came in: the usual day
  if (rec.status === 'final') return { open: false, until, why: T('{m} is final.', { m: ymLabelT(k) }) };
  if (until && todayIso() > until) return { open: false, until, why: T('Objections for {m} closed on {d}.', { m: ymLabelT(k), d: fmtDueT(until) }) };
  return { open: true, until };
}
function openObjNew(preset = {}) {
  const M = state.me, k = state.meMonth, rec = M && M.months[k]; if (!rec) return;
  const w = objWindow(rec, k); if (!w.open) { toast(w.why || T('Objections are closed for this month.')); return; }
  state.objEdit = { mode: 'new', k, kind: preset.kind || '', day: preset.day || '', key: preset.key || '' };
  renderObjNew(); openDrawer('dObj');
}
function renderObjNew() {
  const E = state.objEdit, M = state.me, rec = M.months[E.k], r = (rec && rec.row) || {}, ND = Core.daysIn(+E.k.slice(0, 4), +E.k.slice(5)), y = +E.k.slice(0, 4), m = +E.k.slice(5);
  $('dObj').dir = langNow() === 'ar' ? 'rtl' : 'ltr';
  $('h-obj').textContent = T('Raise an objection'); $('objSub').textContent = `${ymLabelT(E.k)} · ${T('your supervisor answers it')}`;
  const sel = (id, opts, cur, ph) => `<select class="cell" id="${id}">${ph ? `<option value="">${esc(ph)}</option>` : ''}${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const days = r.d || r.dx ? daysOfRow(r, ND) : null, ad = adOf(r);
  let h = `<div class="field"><span class="lbl">${esc(T('What is not right?'))}</span>${sel('objKind', OBJ_KINDS.filter(([v]) => v !== 'kpi' || (r.kpi || []).length).map(([v, l]) => [v, T(l)]), E.kind, T('Choose…'))}</div>`;
  if (E.kind === 'att' || E.kind === 'adh') h += `<div class="field"><span class="lbl">${esc(T('Which day?'))}</span>${sel('objDay', Array.from({ length: ND }, (_, i) => [i + 1, `${i + 1} ${MONT(m)} (${dayNameT(y, m, i + 1)}) · ${E.kind === 'att' ? (days ? attWord(days[i] ?? null) : '–') : ad && ad[i] != null ? pct(ad[i]) : 'NA'}`]), E.day, T('Choose…'))}</div>`;
  if (E.kind === 'kpi') h += `<div class="field"><span class="lbl">${esc(T('Which KPI?'))}</span>${sel('objKey', (r.kpi || []).map(z => [z[0], `${z[0]} · ${z[3]}`]), E.key, T('Choose…'))}</div>`;
  const now = E.kind ? objNowAgent(r, E) : '';
  if (now) h += `<p class="hint">${esc(T('In the tool now'))}: <b>${esc(now)}</b></p>`;
  if (E.kind === 'att') h += `<div class="field"><span class="lbl">${esc(T('What should it be?'))}</span>${sel('objWant', ATT_WANT.map(([v, l]) => [v, T(l)]), E.want || '', T('Choose…'))}</div>`;
  else if (E.kind) h += `<div class="field"><span class="lbl">${esc(T('What should it be? (optional)'))}</span><input class="cell" id="objWantT" maxlength="80" dir="auto" value="${esc(E.wantT || '')}" placeholder="${esc(T('For example: 95%'))}"></div>`;
  if (E.kind) h += `<div class="field"><span class="lbl">${esc(T('Why?'))}</span><textarea id="objText" rows="4" maxlength="1200" dir="auto" placeholder="${esc(T('Anything that helps: the time you signed in, a ticket number, who you spoke to.'))}">${esc(E.text || '')}</textarea><small>${esc(T('Your supervisor sees this, and the senior manager if it goes to him.'))}</small></div>`;
  $('objBody').innerHTML = h;
  $('objFoot').innerHTML = `<button class="btn" data-close>${esc(T('Cancel'))}</button><span class="spacer"></span><button class="btn primary" id="objSend"${E.kind ? '' : ' disabled'}>${esc(T('Send to my supervisor'))}</button>`;
}
function objNowAgent(r, E) {
  const k = E.k, ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
  if (E.kind === 'att' && E.day) return attWord(daysOfRow(r, ND)[E.day - 1] ?? null);
  if (E.kind === 'adh' && E.day) { const a = adOf(r), v = a ? a[E.day - 1] : null; return v == null ? 'NA' : pct(v); }
  if (E.kind === 'kpi' && E.key) { const x = (r.kpi || []).find(z => z[0] === E.key); return x ? x[3] : ''; }
  if (E.kind === 'aht') return mss(r.aht);
  if (E.kind === 'quality') return r.q && r.q.qobs != null ? pct(r.q.qobs, 1) : '';
  if (E.kind === 'inc') { const el = r.el || r._el; return el ? (el.ok ? T('eligible') : T('not eligible')) : ''; }
  return '';
}
function objReadNew() {
  const E = state.objEdit; if (!E || E.mode !== 'new') return;
  const v = id => ($(id) ? $(id).value : undefined);
  if (v('objKind') !== undefined) E.kind = v('objKind');
  if (v('objDay') !== undefined) E.day = v('objDay');
  if (v('objKey') !== undefined) E.key = v('objKey');
  if (v('objWant') !== undefined) E.want = v('objWant');
  if (v('objWantT') !== undefined) E.wantT = v('objWantT');
  if (v('objText') !== undefined) E.text = v('objText');
}
async function objSend() {
  objReadNew();
  const E = state.objEdit, M = state.me; if (!E || !M || !state.db) return;
  const rec = M.months[E.k], r = (rec && rec.row) || {}, P = M.prof || {};
  if ((E.kind === 'att' || E.kind === 'adh') && !E.day) { toast(T('Choose the day.')); return; }
  if (E.kind === 'kpi' && !E.key) { toast(T('Choose the KPI.')); return; }
  if (E.kind === 'att' && !E.want) { toast(T('Choose what the day should be.')); return; }
  const text = normSpace(E.text || ''); if (text.length < 10) { toast(T('Explain why in a few words.')); const t = $('objText'); if (t) t.focus(); return; }
  const at = new Date().toISOString(), id = `${E.k}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name = P.name || '';
  const value = objNowAgentEn(r, E);
  const body = { id, k: E.k, at, name, by: name, spv: P.spv || '', spvName: P.spvName || '', item: { kind: E.kind, ...(E.day ? { day: +E.day } : {}), ...(E.key ? { key: E.key } : {}), value },
    want: E.kind === 'att' ? E.want : normSpace(E.wantT || '').slice(0, 80), text: text.slice(0, 1200), status: 'open', log: [{ at, by: name, role: 'agent', what: 'Raised the objection' }] };
  $('objSend').disabled = true;
  try { await state.db.doc(`agent/${M.pid}/obj/${id}`).set(body); }
  catch (e) { toast(`${T('Not sent')} (${(e && e.code) || 'error'}).`); $('objSend').disabled = false; return; }
  M.objs = { ...(M.objs || {}), [id]: body };
  toast(T('Sent to {spv}. The answer shows on your page.', { spv: P.spvName || T('your supervisor') }));
  closeDrawer(); renderAll();
}
/** the value as it is kept in the objection (in English, for the staff) */
function objNowAgentEn(r, E) {
  const k = E.k, ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
  if (E.kind === 'att' && E.day) return attWordEn(daysOfRow(r, ND)[E.day - 1] ?? null);
  if (E.kind === 'adh' && E.day) { const a = adOf(r), v = a ? a[E.day - 1] : null; return v == null ? 'NA' : pct(v); }
  if (E.kind === 'kpi' && E.key) { const x = (r.kpi || []).find(z => z[0] === E.key); return x ? x[3] : ''; }
  if (E.kind === 'aht') return mss(r.aht);
  if (E.kind === 'quality') return r.q && r.q.qobs != null ? pct(r.q.qobs, 1) : '';
  if (E.kind === 'inc') { const el = r.el || r._el; return el ? (el.ok ? 'eligible' : 'not eligible') : ''; }
  return '';
}
/** the agent asks the senior manager to look at an objection the supervisor did not accept (once) */
async function objAskSenior(id) {
  const M = state.me, o = M && M.objs && M.objs[id]; if (!o || !state.db) return;
  if (!(o.status === 'rejected' && !o.escalatedBy && o.decided && o.decided.role === 'spv')) return;
  const at = new Date().toISOString(), name = (M.prof && M.prof.name) || o.name, next = { ...o, status: 'escalated', escalatedBy: 'agent', log: [...(o.log || []), { at, by: name, role: 'agent', what: 'Asked the senior manager to look' }] };
  try { await state.db.doc(`agent/${M.pid}/obj/${id}`).set(next); M.objs[id] = next; toast(T('Sent to the senior manager.')); renderAll(); }
  catch (e) { toast(`${T('Not sent')} (${(e && e.code) || 'error'}).`); }
}
/** the agent's own objections for the month, with the answers */
function meObjHtml(k, rec) {
  const M = state.me, L = Object.values(M.objs || {}).filter(o => o.k === k).sort((a, b) => String(b.at).localeCompare(String(a.at))), w = objWindow(rec, k);
  const st = o => ({ open: T('Waiting for your supervisor'), escalated: T('With the senior manager'), accepted: T('Accepted · being fixed by {who}', { who: T(OBJ_FIXER[o.fixBy] || 'the team') }), fixed: T('Accepted and fixed'), rejected: T('Not accepted') })[o.status] || o.status;
  const last = o => { const e = (o.log || []).filter(x => x.role !== 'agent').pop(); return e ? e : null; };
  return `<div class="card meobj" id="meObj"><div class="cardhead"><div><h2>${esc(T('My objections'))}</h2><p class="cap">${esc(w.open ? (w.until ? T('Something not right? You can object until {d}; your supervisor answers.', { d: fmtDueT(w.until) }) : T('Something not right? Object here; your supervisor answers.')) : w.why || '')}</p></div>${w.open ? `<button class="btn sm primary" data-objnew>${esc(T('Raise an objection'))}</button>` : ''}</div>
    ${L.length ? `<ul class="ilist">${L.map(o => { const e = last(o); return `<li><span class="nm">${esc(objLabelT(o))}</span><span class="pill ${OBJ_ST_CLS[o.status] || ''}">${esc(st(o))}</span><span class="sp"></span>${o.status === 'rejected' && !o.escalatedBy && o.decided && o.decided.role === 'spv' && rec.status !== 'final' ? `<button class="btn sm" data-objesc="${esc(o.id)}">${esc(T('Ask the senior manager to look'))}</button>` : ''}
      ${objAnswerT(o) ? `<span class="objans" dir="auto">${esc((e && e.by) || '')}${e && e.by ? ': ' : ''}${esc(objAnswerT(o))}</span>` : ''}</li>`; }).join('')}</ul>` : `<p class="subtle">${esc(T('None for this month.'))}</p>`}</div>`;
}
const objLabelT = o => { const it = o.item || {}; return `${T(OBJ_KIND_SHORT[it.kind] || 'Other')}${it.day ? ` · ${it.day} ${MONT(+String(o.k).slice(5))}` : ''}${it.kind === 'kpi' && it.key ? ` · ${it.key}` : ''}${it.value ? `: ${T(it.value)}` : ''}`; };
/** the answer under an objection: the note as the staff wrote it, or what was corrected (nothing when the status says it all) */
const objAnswerT = o => { if (o.decided && o.decided.note) return o.decided.note; const it = o.item || {}; return o.status === 'fixed' && it.kind === 'att' && o.want ? T('Corrected to {v}', { v: attWord(o.want) }) : ''; };

// ---------------------------------------------------------------- events
$('dObj').addEventListener('change', e => { if (state.objEdit && state.objEdit.mode === 'new' && e.target.matches('#objKind, #objDay, #objKey, #objWant')) { const kind = state.objEdit.kind; objReadNew(); if (e.target.id === 'objKind' && kind !== state.objEdit.kind) { state.objEdit.day = ''; state.objEdit.key = ''; state.objEdit.want = ''; } renderObjNew(); } });
$('dObj').addEventListener('input', e => { if (e.target.matches('#objText, #objWantT')) objReadNew(); });
$('dObj').addEventListener('click', e => {
  if (e.target.closest('#objSend')) { objSend(); return; }
  const a = e.target.closest('[data-objact]'); if (a && state.objEdit) objDecide(state.objEdit.id, a.dataset.objact);
});
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const o = t.closest('[data-objopen]'); if (o) { openObj(o.dataset.objopen); return; }
  const n = t.closest('[data-objnew]'); if (n) { openObjNew(); return; }
  const m = t.closest('[data-meobj]'); if (m) { const [kind, x] = m.dataset.meobj.split('|'); openObjNew(kind === 'kpi' ? { kind, key: x } : { kind, day: +x || '' }); return; }
  const s = t.closest('[data-objesc]'); if (s) { if (!s.dataset.confirm) { s.dataset.confirm = '1'; s.textContent = T('Click again to send'); return; } objAskSenior(s.dataset.objesc); }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-det="objdone"]')) state.objDoneOpen = d.open; }, true);
