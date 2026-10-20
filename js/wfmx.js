// ================================================================ WFM TEAM: one page for the WFM analysts and the WFM manager
// Its tabs, in three groups. This month: Import, Review and Export (the month's build, for the WFM analysts) and Emails (the
// four daily brand emails, and the month's deduction, absences and incentive emails). Every day: Daily (the daily data) and
// Report builder (the analysts make the daily emails). Insight: Analytics (departments and months), Agents (every measure per
// agent) and Interactions (the interactions export). Each role sees its own tabs; the senior manager reads.
Object.assign(state, { agQ: '', agSort: 'adh', agDir: 'asc', agUnit: '', agSpv: '', agCols: 'core', wfmAt: '' });
const WFM_TABS = [['import', 'Import'], ['review', 'Review'], ['export', 'Export'], ['emails', 'Emails'], ['daily', 'Daily'], ['builder', 'Report builder'], ['analytics', 'Analytics'], ['agents', 'Agents'], ['inter', 'Interactions']];
const WFM_STEPS = ['import', 'review', 'export'];   // the month's build, shown on the WFM team page
const WFM_GROUPS = [['This month', ['import', 'review', 'export', 'emails']], ['Every day', ['daily', 'builder']], ['Insight', ['analytics', 'agents', 'inter']]];
/** every email the WFM team sends, in one place shared by the WFM manager and the WFM analysts: the four daily brand emails and
    the month's deduction and absences emails. Both can edit them and send them (the tool copies them or opens them in Outlook). */
const canWfmMail = () => hasRole('admin', 'wfm', 'user');
Object.assign(state, { mailSub: '' });
function wfmTabsFor() { return WFM_TABS.filter(([t]) => (t === 'builder' || WFM_STEPS.includes(t) ? isBuilder() : t === 'emails' ? canWfmMail() : true)); }
/** the tab now on screen: a step of the month's build, or a WFM tab */
const wfmTabNow = () => (state.ws === 'build' ? (WFM_STEPS.includes(state.step) ? state.step : 'import') : state.wfmTab);
/** the WFM team page's header: the title, the tabs of the role (with what each needs), and the actions of the tab */
function renderWfmHead() {
  const head = $('wfmHead'); if (!head) return;
  const on = state.ws === 'wfm' || state.ws === 'build'; head.hidden = !on; if (!on) return;
  const tabs = wfmTabsFor(), have = new Set(tabs.map(x => x[0])), cur = wfmTabNow(), lab = Object.fromEntries(WFM_TABS);
  const unsent = canDailyMail() ? (dmUnsent()[0] || { left: [] }).left.length : 0;
  const badge = t => {
    if (t === 'import') { const n = nSlots(); return `<span class="cnt${n === 4 ? ' good' : ''}" aria-label="${n} of 4 Genesys exports">${n}/4</span>`; }
    if (t === 'review') { let n = 0; try { n = state.ctx ? checkNotes().filter(x => x.sev === 'decide' || x.sev === 'warn').length : 0; } catch (e) { /* the checks are drawn once the month is read */ } return n ? `<span class="cnt warn" aria-label="${plural(n, 'check')} to look at">${n}</span>` : ''; }
    if (t === 'export') return freshBuild() ? '<svg class="tick" width="13" height="13" aria-label="Built"><use href="#i-check"/></svg>' : '';
    if (t === 'emails') return unsent ? `<span class="cnt warn" aria-label="${plural(unsent, 'daily email')} to send">${unsent}</span>` : '';
    return '';
  };
  $('wfmTabs').innerHTML = WFM_GROUPS.map(([g, L]) => { const T = L.filter(t => have.has(t)); return T.length ? `<div class="wfmgrp"><small aria-hidden="true">${esc(g)}</small><div class="seg wftabs" role="group" aria-label="${esc(g)}">${T.map(t => `<button data-wt="${t}" aria-pressed="${t === cur}"${t === cur ? ' aria-current="page"' : ''}>${esc(lab[t])}${badge(t)}</button>`).join('')}</div></div>` : ''; }).join('');
  const r = roleNow(), cov = rolesNow().length > 1;
  $('wfmEyebrow').textContent = (ROLE_NAME[r] || 'Workforce') + (cov ? ` · covering for the ${ROLE_NAME[rolesNow()[1]] || 'team'}` : '');
  const build = state.ws === 'build';
  $('buildActs').hidden = !build; $('wfmBar').hidden = build;
  if (build) { $('wfmLead').hidden = true; $('wfmRo').hidden = true; }
  renderCoverNote();
  requestAnimationFrame(segThumbs);
}
/** a WFM team tab: a step of the build, or a WFM tab */
function wfmGo(t, focus) {
  if (WFM_STEPS.includes(t)) { state.wfmAt = 'build'; setStep(t); }
  else { const was = state.ws === 'wfm' && state.wfmTab === t; state.wfmAt = 'wfm'; state.wfmTab = t; if (state.ws !== 'wfm') setWs('wfm'); else { renderWs(); if (!was) animIn($('v-wfm')); } }
  if (focus) { const b = $('wfmTabs').querySelector(`[data-wt="${t}"]`); if (b) b.focus(); }
}
/** the sidebar's WFM team: back to the tab last used there (a builder starts on Import) */
function openWfmTeam() { const at = state.wfmAt || (isBuilder() ? 'build' : 'wfm'); if (at === 'build' && isBuilder()) setStep(WFM_STEPS.includes(state.step) ? state.step : 'import'); else setWs('wfm'); }
const WFM_LEAD = {
  analytics: 'Every department and month from the shared history: trends, comparisons, distributions and where the data comes from.',
  agents: 'Every measure for every agent in the month, with the best and the worst quarter marked, to see who needs what.',
  daily: 'Every day\'s numbers, kept for everyone: the brands day by day and each agent\'s day.',
  builder: 'Drop the day\'s exports: MC Leaders and the WFM Daily Review are made here, and the four brand emails go straight to the WFM manager.',
  emails: 'Every email the WFM team sends, in one place for the WFM manager and the analysts: the four daily brand emails and the month\'s deduction, absences and incentive emails. Edit them here and send them from Outlook; the tool never sends anything itself.',
  inter: 'The interactions export: when customers call, what happens to their calls, and each agent\'s calls.',
};
function renderWfmWs() {
  if (state.wfmTab === 'dmail' || state.wfmTab === 'mail') { state.mailSub = state.wfmTab === 'dmail' ? 'daily' : 'month'; state.wfmTab = 'emails'; }   // older links: the two email pages are one now
  const r = roleNow(), tabs = wfmTabsFor().filter(x => !WFM_STEPS.includes(x[0])), t = tabs.some(x => x[0] === state.wfmTab) ? state.wfmTab : (tabs[0] || ['analytics'])[0]; state.wfmTab = t;
  const unsent = canDailyMail() ? (dmUnsent()[0] || { left: [] }).left.length : 0;
  if (!['daily', 'month'].includes(state.mailSub)) state.mailSub = unsent || Object.keys(state.dmail || {}).length ? 'daily' : 'month';   // the daily emails first when there are some
  renderWfmHead();
  const ro = r === 'senior' ? 'View only: the WFM team keeps this page current; you see every number.' : !hasRole('admin', 'wfm') && t === 'inter' ? 'View only: the WFM manager adds the interactions export.' : '';
  const vo = $('wfmRo'); if (vo) { vo.hidden = !ro; const sp = vo.querySelector('span'); if (sp) sp.textContent = ro; }
  $('wfmLead').hidden = false;
  $('wfmLead').textContent = r === 'senior' && t === 'inter' ? 'The interactions export the WFM manager adds: when customers call, what happens to their calls, and each agent\'s calls.' : WFM_LEAD[t];
  const builder = t === 'builder', em = t === 'emails', dm = em && state.mailSub === 'daily', mm = em && !dm;
  $('wfmRb').hidden = !builder; $('wfmDm').hidden = !dm; $('wfmBody').hidden = builder || dm || mm;
  if (!mm) mountMail(false);
  if (t === 'analytics') renderWfm(); else if (t === 'agents') renderAgentsWs(); else if (t === 'daily') renderDailyWs(); else if (t === 'inter') renderInterWs(); else if (mm) renderMailWs();
  else if (builder) { $('wfmBar').innerHTML = '<div class="wsacts"></div>'; rbShow(); }
  else if (dm) { $('wfmBar').innerHTML = mailSubHtml(unsent) + '<div class="wsacts"></div>'; dmShow(); }
}
/** the two kinds of email on the Emails page */
function mailSubHtml(unsent) {
  return `<div class="seg mailsub" role="group" aria-label="Which emails"><button data-mailsub="daily" aria-pressed="${state.mailSub === 'daily'}">Daily brand emails${unsent ? ` <span class="cnt warn">${unsent}</span>` : ''}</button><button data-mailsub="month" aria-pressed="${state.mailSub === 'month'}">${isBuilder() ? 'Monthly emails' : 'Deduction and absences'}</button></div>`;
}
$('wfmBar').addEventListener('click', e => { const b = e.target.closest('[data-mailsub]'); if (!b) return; state.mailSub = b.dataset.mailsub; renderWs(); const n = $('wfmBar').querySelector(`[data-mailsub="${state.mailSub}"]`); if (n) n.focus(); });

// ---------------------------------------------------------------- Emails: the deduction and absences emails, from the shared month
const mailHome = document.createComment('v-email');
$('v-email').before(mailHome);
/** the month's emails live on the WFM team page, under Emails › Monthly emails */
function mountMail(wfm) {
  const v = $('v-email');
  if (wfm) { if (v.parentNode !== $('wfmMail')) $('wfmMail').appendChild(v); mailSrcSync(); v.hidden = false; v.classList.add('inws'); }
  else if (v.parentNode === $('wfmMail')) { mailHome.after(v); state.mailSrc = ''; v.classList.remove('inws'); v.hidden = true; }
}
/** where the month's emails take their numbers: the shared month, with the supervisors' corrections (everyone), or the month
    being built or a dropped workbook (the WFM analysts: the incentive email always, the deduction email when they choose it) */
function mailSrcSync() {
  if (!isBuilder()) { state.mailSrc = 'shared'; state.mailKind = 'ded'; return; }
  const pick = state.mailKind === 'inc' ? 'build' : state.mailPick || (state.ctx || state.wb || !wsMonthNow() ? 'build' : 'shared');
  state.mailSrc = pick === 'shared' ? 'shared' : '';
}
function renderMailWs() {
  const k = wsMonthNow();
  const unsent = canDailyMail() ? (dmUnsent()[0] || { left: [] }).left.length : 0;
  mailSrcSync();
  $('wfmBar').innerHTML = `${mailSubHtml(unsent)}${mailShared() ? monthSelHtml(k, 'data-wsmonth') : ''}<div class="wsacts"></div>`;
  if (mailShared() && !k) { mountMail(false); $('wfmBody').hidden = false; $('wfmBody').innerHTML = emptyCard('No months yet', 'The emails use the month saved in the shared history.'); return; }
  mountMail(true); lastMailHtml = ''; renderEmail();
}

// ---------------------------------------------------------------- Agents: every measure, every agent
const occOf = r => History.valOf(r, History.METRICS.find(m => m.k === 'occ'));
const AGC = [
  ['adh', 'Adherence', r => r.adh, v => pct(v, 1), 1, 'core'], ['adhUnder', 'Days under', r => r.adhUnder, v => String(v), -1, 'core'], ['conf', 'Conformance', r => r.conf, v => pct(v, 1), 1, 'core'],
  ['aht', 'AHT', r => r.aht, mss, -1, 'core'], ['ans', 'Answered', r => r.ans ?? null, n0, 0, 'core'], ['talk', 'Avg talk', r => r.talk ?? null, mss, 0, 'perf'], ['hold', 'Avg hold', r => r.hold ?? null, mss, -1, 'perf'], ['acw', 'Avg ACW', r => r.acw ?? null, mss, -1, 'perf'],
  ['heldR', 'Hold rate', r => pfVal(r, 'heldR'), pr1, -1, 'perf'], ['xferR', 'Transfer rate', r => pfVal(r, 'xferR'), pr1, -1, 'perf'], ['occ', 'Occupancy', occOf, pr1, 1, 'core'],
  ['wfExc', 'Exceptions', r => r.wfExc ?? null, v => String(v), -1, 'core'], ['wfAbs', 'No sign-on', r => r.wfAbs ?? null, v => String(v), -1, 'wf'], ['wfLate', 'Late sign-ons', r => r.wfLate ?? null, v => String(v), -1, 'wf'], ['wfShort', 'Short of shift', r => r.wfShort ?? null, v => String(v), -1, 'wf'],
  ['absent', 'Absent', r => r.absent ?? null, v => String(v), -1, 'core'], ['tardy', 'Tardy min', r => r.tardy ?? null, v => String(Math.round(v)), -1, 'core'], ['ded', 'Deduction', r => r.ded ?? null, v => String(Math.round(v)), -1, 'wf'],
  ['fin', 'Final %', r => r.fin ?? null, pct1, 1, 'core'], ['earned', 'Earned SR', r => r.earned ?? null, v => String(Math.round(v)), 0, 'core'],
  ['iCalls', 'Calls (interactions)', (r, I) => (I ? I.calls : null), n0, 0, 'inter'], ['iShort', 'Short calls', (r, I) => (I && I.calls ? I.short / I.calls : null), pr1, -1, 'inter'], ['iHang', 'Agent hung up', (r, I) => (I && I.calls ? I.agentDisc / I.calls : null), pr1, -1, 'inter'],
  ['iHang30', 'Hung up < 30s', (r, I) => (I ? I.agShort : null), n0, -1, 'inter'], ['iDrop', 'WebRTC drops', (r, I) => (I ? I.drops : null), n0, -1, 'inter'], ['iRep', 'Called again 72h', (r, I) => (I && I.calls ? I.rep72 / I.calls : null), pr1, -1, 'inter'],
];
const AG_SETS = [['core', 'Main'], ['perf', 'Calls'], ['wf', 'Shifts'], ['inter', 'Interactions'], ['all', 'Everything']];
function agentRowsWs(k) {
  const map = rowsByPid(k);
  return rosterRows().map(p => { const r = map.get(p._id); if (!r) return null; const pp = effP(p._id) || p; return { p, r, exp: gname(pp) || p.name, unit: unitOf(p), spv: supName(p.spv), I: interOf(k, p) }; }).filter(Boolean);
}
function renderAgentsWs() {
  const k = wsMonthNow(), set = state.settings;
  const L0 = k ? agentRowsWs(k) : [], units = [...new Set(L0.map(x => x.unit))].sort(sortUnits), S = spvList();
  $('wfmBar').innerHTML = `${monthSelHtml(k, 'data-wsmonth')}<div class="seg sm" role="group" aria-label="Columns">${AG_SETS.map(([v, l]) => `<button data-agcols="${v}" aria-pressed="${state.agCols === v}">${esc(l)}</button>`).join('')}</div>
    <div class="wsacts"><button class="btn sm" data-x="agents"${k ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button></div>`;
  const body = $('wfmBody');
  if (!k) { body.innerHTML = emptyCard('No months yet', 'The agents show here as soon as a month is saved.'); return; }
  const q = normName(state.agQ), L = L0.filter(x => (!state.agUnit || x.unit === state.agUnit) && (!state.agSpv || x.p.spv === state.agSpv) && (!q || normName(`${x.exp} ${x.p.name} ${x.spv}`).includes(q)));
  const hasInter = L.some(x => x.I), cols = AGC.filter(c => !(c[0] === 'earned' && srHidden()) && (state.agCols === 'all' || c[5] === state.agCols || (state.agCols === 'core' && c[5] === 'core')) && (c[5] !== 'inter' || hasInter) && L.some(x => c[2](x.r, x.I) != null));
  // quartiles: the best and worst quarter of each measure
  const qs = {}; for (const c of cols) { if (!c[4]) continue; const v = L.map(x => c[2](x.r, x.I)).filter(x => x != null).sort((a, b) => a - b); if (v.length >= 8) qs[c[0]] = [v[Math.floor(v.length * 0.25)], v[Math.floor(v.length * 0.75)]]; }
  const tag = (c, v) => { const Q = qs[c[0]]; if (!Q || v == null) return ''; const good = c[4] > 0 ? v >= Q[1] : v <= Q[0], bad = c[4] > 0 ? v <= Q[0] : v >= Q[1]; return good && !bad ? ' q1' : bad && !good ? ' q4' : ''; };
  const sc = cols.some(c => c[0] === state.agSort) || ['name', 'unit', 'spv'].includes(state.agSort) ? state.agSort : 'name', dir = state.agDir === 'desc' ? -1 : 1, C = cols.find(c => c[0] === sc);
  const val = x => sc === 'name' ? x.exp : sc === 'unit' ? x.unit : sc === 'spv' ? x.spv : C ? C[2](x.r, x.I) : null;
  L.sort((a, b) => { const x = val(a), y = val(b); if (typeof x === 'string' || typeof y === 'string') return dir * String(x ?? '').localeCompare(String(y ?? '')); return (x == null) - (y == null) || dir * ((x ?? 0) - (y ?? 0)) || byExp(a, b); });
  const A = aggRows(L.map(x => x.r)), ans = sum(L.map(x => x.r.ans)), occ = mean(L.map(x => occOf(x.r)));
  const tiles = tileW(String(L.length), 'agents', ymLabel(k)) + tileW(pct(A.adh, 1), 'adherence', `${A.below} under ${pct(set.target, 0)}`, A.adh != null && A.adh < set.target ? 'alert' : '') + tileW(mss(A.aht), 'AHT', 'average per agent')
    + tileW(ans == null ? '–' : Math.round(ans).toLocaleString('en-US'), 'answered', 'calls in the month') + tileW(pr1(occ), 'occupancy', 'handle time over time signed on') + tileW(A.exc == null ? '–' : String(A.exc), 'exceptions', `${A.absent ?? 0} absent days`, A.exc ? 'alert' : '') + tileW(pct1(A.fin), 'final % (KPI)', 'average of the scorecards');
  const th = (c, l, r) => `<th class="${r ? 'r' : ''}"><button class="linkbtn" data-agsort="${c}">${esc(l)}${sc === c ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  const keep = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-agq]') ? document.activeElement.selectionStart : null;
  body.innerHTML = `${statusBanner(k)}<div class="tiles wstiles">${tiles}</div><div class="card"><div class="cardhead"><div><h2>Every agent · ${esc(ymLabel(k))}</h2><p class="cap">Green: the best quarter of the month on that measure; red: the worst quarter. ${hasInter ? 'The interactions columns come from the interactions export.' : 'Add the interactions export (Interactions tab) for calls, hang-ups, drops and repeat callers per agent.'}</p></div>
    <div class="toolbar"><input type="search" data-agq value="${esc(state.agQ)}" placeholder="Search name or supervisor" aria-label="Search"><select class="cell" data-agunit aria-label="Team"><option value="">All teams</option>${units.map(u => `<option${u === state.agUnit ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select><select class="cell" data-agspv aria-label="Supervisor"><option value="">All supervisors</option>${S.map(a => `<option value="${esc(a.pid)}"${a.pid === state.agSpv ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div></div>
    <div class="tablewrap restab agtab"><table><thead><tr>${th('name', 'Agent')}${th('unit', 'Team')}${th('spv', 'Supervisor')}${cols.map(c => th(c[0], c[1], true)).join('')}</tr></thead><tbody>
    ${L.map(x => `<tr><td><button class="linkbtn nm" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" dir="auto">${esc(x.exp)}</button></td><td>${esc(x.unit)}</td><td>${esc(x.spv || '–')}</td>${cols.map(c => { const v = c[2](x.r, x.I); return `<td class="r num${tag(c, v)}">${v == null ? '–' : esc(c[3](v))}</td>`; }).join('')}</tr>`).join('') || `<tr><td colspan="${3 + cols.length}" class="empty">Nobody matches.</td></tr>`}
    </tbody></table></div></div>${scatterHtml(L, k)}`;
  if (keep != null) { const i = body.querySelector('[data-agq]'); if (i) { i.focus(); i.setSelectionRange(keep, keep); } }
  reveal(body);
}
/** adherence against AHT: who is fast and on time, who needs coaching on which */
function scatterHtml(L, k) {
  const P = L.filter(x => x.r.adh != null && x.r.aht != null); if (P.length < 6) return '';
  const set = state.settings, xs = P.map(x => x.r.aht), ys = P.map(x => x.r.adh);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys, set.target - 0.01), y1 = Math.min(1, Math.max(...ys) + 0.005);
  const W = 640, H = 300, l = 52, r = 16, t = 14, b = 34, X = v => l + ((v - x0) / Math.max(1, x1 - x0)) * (W - l - r), Y = v => t + (1 - (v - y0) / Math.max(1e-6, y1 - y0)) * (H - t - b);
  const mA = mean(xs);
  const dots = P.map(x => `<circle class="sd${x.r.adh < set.target ? ' low' : ''}" cx="${X(x.r.aht).toFixed(1)}" cy="${Y(x.r.adh).toFixed(1)}" r="4.5" data-tt="${esc(`${x.exp}: adherence ${pct(x.r.adh, 1)} · AHT ${mss(x.r.aht)}`)}" data-agent="${esc(x.p._id)}" data-open="${esc(x.p._id)}"></circle>`).join('');
  const grid = [0, 1, 2, 3].map(i => { const v = y0 + ((y1 - y0) * i) / 3; return `<line class="g" x1="${l}" x2="${W - r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="yl" x="${l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${pct(v, 0)}</text>`; }).join('')
    + [0, 1, 2, 3].map(i => { const v = x0 + ((x1 - x0) * i) / 3; return `<text class="xl" x="${X(v).toFixed(1)}" y="${H - 10}" text-anchor="middle">${mss(v)}</text>`; }).join('');
  return `<div class="card"><h2>Adherence against AHT · ${esc(ymLabel(k))}</h2><p class="cap">Each dot is an agent. Top left: on time and quick. The line across is the adherence target; the dashed line is the average AHT. Select a dot for the profile.</p>
    <figure class="trend wschart"><svg class="trendsvg scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Adherence against AHT for ${P.length} agents">${grid}<line class="tg" x1="${l}" x2="${W - r}" y1="${Y(set.target).toFixed(1)}" y2="${Y(set.target).toFixed(1)}"/><line class="tg dash" x1="${X(mA).toFixed(1)}" x2="${X(mA).toFixed(1)}" y1="${t}" y2="${H - b}"/>${dots}<text class="xl" x="${W - r}" y="${H - 22}" text-anchor="end">AHT →</text></svg></figure></div>`;
}
async function exportAgents() {
  const k = wsMonthNow(); if (!k) return; const L = agentRowsWs(k), hasI = L.some(x => x.I), cols = AGC.filter(c => !(c[0] === 'earned' && srHidden()) && (c[5] !== 'inter' || hasI) && L.some(x => c[2](x.r, x.I) != null));
  const t = c => (['adh', 'conf', 'fin', 'heldR', 'xferR', 'occ', 'iShort', 'iHang', 'iRep'].includes(c[0]) ? 'pct' : ['aht', 'talk', 'hold', 'acw'].includes(c[0]) ? 'time' : 'int');
  await xlBook(`Agents - ${ymLabel(k)}.xlsx`, [{ name: 'Agents', title: `Agents - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'National ID', t: 'text', w: 13 }, { h: 'Team', t: 'text', w: 16 }, { h: 'Supervisor', t: 'text', w: 22 }, ...cols.map(c => ({ h: c[1], t: t(c), bad: c[0] === 'adh' ? v => v < state.settings.target : undefined }))],
    rows: L.sort(byExp).map(x => [x.exp, Core.cleanId((effP(x.p._id) || x.p).nid) || '', x.unit, x.spv || '', ...cols.map(c => c[2](x.r, x.I))]) }]);
}

// ---------------------------------------------------------------- events
$('wfmTabs').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if (b) wfmGo(b.dataset.wt); });
$('wfmTabs').addEventListener('keydown', e => {   // the arrows go along all the tabs, across the groups
  const b = e.target.closest('[data-wt]'); if (!b || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
  const L = [...$('wfmTabs').querySelectorAll('[data-wt]')], i = L.indexOf(b), rtl = getComputedStyle(b).direction === 'rtl';
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? L.length - 1 : (i + ((e.key === 'ArrowRight') !== rtl ? 1 : L.length - 1)) % L.length;
  e.preventDefault(); L[j].focus();
});
$('wfmBar').addEventListener('click', e => {
  const t = e.target;
  const ac = t.closest('[data-agcols]'); if (ac) { state.agCols = ac.dataset.agcols; renderWs(); return; }
  const go = t.closest('[data-wtgo]'); if (go) { wfmGo(go.dataset.wtgo); return; }
  if (t.closest('[data-dmonth]')) { dailyToMonth(state.dailyK); return; }
  if (t.closest('[data-interpick]')) { interPicker.click(); return; }
});
$('wfmBar').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-dailyk]')) { state.dailyK = t.value; state.dailyKPicked = true; renderWs(); }
  if (t.matches('[data-interk]')) { state.interK = t.value; renderWs(); }
});
$('wfmBody').addEventListener('input', e => {
  if (e.target.matches('[data-agq]')) { state.agQ = e.target.value; renderWs(); }
  if (e.target.matches('[data-interq]')) { state.interQ = e.target.value; renderWs(); }
});
$('wfmBody').addEventListener('change', e => { const t = e.target; if (t.matches('[data-agunit]')) { state.agUnit = t.value; renderWs(); } if (t.matches('[data-agspv]')) { state.agSpv = t.value; renderWs(); } });
$('wfmBody').addEventListener('click', e => {
  const t = e.target;
  const s = t.closest('[data-agsort]'); if (s) { const c = s.dataset.agsort; if (state.agSort === c) state.agDir = state.agDir === 'asc' ? 'desc' : 'asc'; else { state.agSort = c; const col = AGC.find(x => x[0] === c); state.agDir = ['name', 'unit', 'spv'].includes(c) ? 'asc' : col && col[4] > 0 ? 'asc' : 'desc'; } renderWs(); const b = $('wfmBody').querySelector(`[data-agsort="${c}"]`); if (b) b.focus(); return; }
  const is = t.closest('[data-intersort]'); if (is) { const c = is.dataset.intersort; if (state.interSort === c) state.interDir = state.interDir === 'asc' ? 'desc' : 'asc'; else { state.interSort = c; state.interDir = ['n', 'spv'].includes(c) ? 'asc' : 'desc'; } renderWs(); return; }
  if (t.closest('[data-interdrop]')) { interPicker.click(); return; }
});
['dragenter', 'dragover'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-interdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-interdrop]'); if (z) z.classList.remove('over'); }));
/** files dropped on a workspace page (not Build): the page that wants them takes them (the Report builder tab every daily export,
    Results the old Excel, Quality the Final EVAL); anything else is recognised and the Recognise files panel says where it goes */
async function wsDrop(files) {
  const L = [...files], rb = [], old = [], what = [];
  for (const f of L) {
    if (state.ws === 'wfm' && state.wfmTab === 'builder' && canDailyTool() && /\.(csv|xls|xlsx)$/i.test(f.name)) { rb.push(f); continue; }   // on its own tab every export goes to Report builder
    if (/\.msg$/i.test(f.name) && isBuilder()) { importDistributionMsg(f); continue; }
    const v = await recogOne(f), K = Recog.KINDS[v.kind] || Recog.KINDS.unknown;
    if (v.kind === 'inter' && canInter()) { importInteractions(f); continue; }
    if (K.route === 'rb' && canDailyTool() && v.level === 'sure') { rb.push(f); continue; }
    if (state.ws === 'results' && K.old) { old.push(f); continue; }
    if (state.ws === 'quality' && v.kind === 'evalBook' && canQuality()) { const ok = await tryEvalFile({ name: f.name, file: f }, null, qMonthNow()); if (ok) continue; }
    what.push({ file: f, v });
  }
  if (rb.length) { if (state.wfmTab !== 'builder') { state.wfmTab = 'builder'; renderWs(); } rbAddFiles(rb); }
  if (old.length) cmpFiles(old);   // the old Excel files of a month together, on Results › Reconcile
  if (what.length) recogOpen(what, 'drop');
}
