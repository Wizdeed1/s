// ================================================================ VIEW AS: the admin opens every role's interface
// The admin can see any interface on the shared data exactly as its role sees it: the WFM analyst's, the WFM manager's, the
// senior manager's, one supervisor's (their own team), the quality team's and one agent's own page. It is a preview: while it is
// on, the data store refuses every write (store.js, localDb) and queueWrite keeps nothing to try again, so a click during a
// meeting never changes the shared data. The account menu, the account checks and every record of who did what keep the admin's
// own account (auth.js). National IDs are hidden on the screen while it is on. Back to Admin ends it, on the page it started from.
const VIEW_ROLES = [
  ['user', 'WFM analyst', 'Builds the month: the exports, the checks, the workbook, the daily reports.'],
  ['wfm', 'WFM manager', 'Sends the emails; analytics, agents and interactions.'],
  ['senior', 'Senior manager', 'The month close in eight steps, the results and the final.'],
  ['spv', 'Supervisor', 'Their own team: attendance, one-to-ones, objections.', 'spv'],
  ['quality', 'Quality team', 'The Final EVAL, matched names and quality KPIs.'],
  ['agent', 'Agent', 'One agent\'s own page, in English or Arabic.', 'agent'],
];
Object.assign(state, { viewFrom: '', viewRefused: 0, viewPick: {} });
/** the admin is previewing another role (hoisted, and safe before Auth exists: queueWrite asks it) */
function viewing() { try { return !!(Auth.viewAs && Auth.viewAs()); } catch (e) { return false; } }
/** the WFM team's daily report (Daily, Report builder, the daily brand emails and their data) is for the real WFM accounts: a
    preview (View as, from the Showcase or the account menu) never shows it, whatever role it shows */
function dailyShown() { return !viewing(); }
function realAdmin() { try { return ((Auth.realUser && Auth.realUser()) || {}).role === 'admin'; } catch (e) { return false; } }
function viewLabel(v = Auth.viewAs()) {
  if (!v) return '';
  const r = VIEW_ROLES.find(x => x[0] === v.role);
  return `${r ? r[1] : ROLE_NAME[v.role] || v.role}${v.name ? ' · ' + v.name : ''}`;
}
/** the label ending a sentence (a name like "Omar B." already ends with its own full stop) */
const viewSentence = () => { const t = viewLabel(); return /\.$/.test(t) ? t : t + '.'; };
let viewToldAt = 0;
/** a write refused during the preview: counted, and said (not more than once every few seconds) */
function viewRefused() {
  state.viewRefused = (state.viewRefused || 0) + 1;
  const now = Date.now(); if (now - viewToldAt < 4000) return; viewToldAt = now;
  toast(`Not saved: you are viewing as ${viewSentence()} Nothing changes while you view; Back to Admin to make changes.`);
}
/** the people to choose from: supervisors with their team's size, and everyone active on the roster (for an agent's page) */
function viewPeople(kind) {
  if (kind === 'spv') return spvList().filter(s => s.pid).sort((a, b) => (b.size || 0) - (a.size || 0) || String(a.name).localeCompare(String(b.name)));
  return rosterRows().filter(p => p.status !== 'Inactive').map(p => ({ pid: p._id, name: p.name, unit: unitOf(p) })).sort((a, b) => sortUnits(a.unit, b.unit) || String(a.name).localeCompare(String(b.name)));
}
function viewPickHtml(kind) {
  const L = viewPeople(kind); if (!L.length) return `<span class="hint">${kind === 'spv' ? 'No supervisor on the roster yet.' : 'Nobody on the roster yet.'}</span>`;
  const cur = L.some(x => x.pid === state.viewPick[kind]) ? state.viewPick[kind] : '';   // nobody shown until the admin chooses (a meeting sees the screen)
  const opt = x => `<option value="${esc(x.pid)}"${x.pid === cur ? ' selected' : ''}>${esc(x.name)}${kind === 'spv' && x.size ? ` (${x.size})` : ''}</option>`;
  const body = kind === 'spv' ? L.map(opt).join('') : [...new Set(L.map(x => x.unit))].map(u => `<optgroup label="${esc(u)}">${L.filter(x => x.unit === u).map(opt).join('')}</optgroup>`).join('');
  return `<label class="vapick"><span class="sr">${kind === 'spv' ? 'Which supervisor' : 'Which agent'}</span><select class="cell" data-vapick="${kind}" aria-label="${kind === 'spv' ? 'Which supervisor' : 'Which agent'}"><option value=""${cur ? '' : ' selected'}>${kind === 'spv' ? 'Choose a supervisor…' : 'Choose an agent…'}</option>${body}</select></label>`;
}
/** the choice of roles (account menu › View as another role, and the Showcase's role cards) */
function openViewAs() {
  if (!realAdmin()) return;
  const v = Auth.viewAs();
  $('viewAsBody').innerHTML = `<ul class="valist">${VIEW_ROLES.map(([r, name, what, kind]) => `<li class="varow${v && v.role === r ? ' on' : ''}">
      <span class="vaico" aria-hidden="true"><i></i></span><div class="vatext"><b>${esc(name)}</b><span>${esc(what)}</span>${kind ? viewPickHtml(kind) : ''}</div>
      <button class="btn sm${v && v.role === r ? '' : ' primary'}" data-vago="${r}">${v && v.role === r ? 'Viewing' : 'View'}</button></li>`).join('')}</ul>
    <p class="hint">A preview of the shared data as it is now: nothing you change while you view is saved. ${v ? '' : 'The banner at the top says whose interface you see, with the way back.'}</p>
    ${v ? '<div class="acts"><button class="btn" data-vaback>Back to Admin</button></div>' : ''}`;
  openDrawer('dViewAs');
}
/** wait for the admin's own saves to finish before the preview starts refusing writes */
async function viewSaveIdle() {
  const t0 = Date.now();
  while ((inflight > 0 || setTimer) && Date.now() - t0 < 6000) await new Promise(r => setTimeout(r, 100));
}
async function startViewAs(role, pid) {
  if (!realAdmin()) return;
  const R = VIEW_ROLES.find(x => x[0] === role); if (!R) return;
  let person = null;
  if (R[3]) {
    const L = viewPeople(R[3]); person = L.find(x => x.pid === (pid || state.viewPick[R[3]])) || null;
    if (!person) { toast(!L.length ? (R[3] === 'spv' ? 'No supervisor on the roster yet.' : 'Nobody on the roster yet.') : R[3] === 'spv' ? 'Choose the supervisor whose team to see, then View.' : 'Choose the agent whose page to see, then View.'); const sel = document.querySelector(`[data-vapick="${R[3]}"]`); if (sel) sel.focus(); return; }
    state.viewPick[R[3]] = person.pid;
  }
  if (!viewing()) { state.viewFrom = state.ws; state.viewRefused = 0; await viewSaveIdle(); }
  if (openId === 'dViewAs') closeDrawer();
  if (state.db && state.db.readOnly) state.db.readOnly(true, viewRefused);
  stopAgentData(); state.me = null;
  Auth.setViewAs({ role, pid: person ? person.pid : '', name: person ? person.name : '' });
  document.body.classList.add('viewing'); renderViewBar();
  applyRole();
  nidWatch(true);
  window.scrollTo({ top: 0 });
  toast(`Viewing as ${viewSentence()} Nothing is saved while you view.`);
}
function endViewAs() {
  if (!viewing()) return;
  const back = state.viewFrom, n = state.viewRefused || 0;
  stopAgentData(); state.me = null;
  nidWatch(false);
  Auth.setViewAs(null);
  if (state.db && state.db.readOnly) state.db.readOnly(false);
  document.body.classList.remove('viewing'); renderViewBar();
  if (openId === 'dViewAs') closeDrawer();
  applyRole(); if (back && wsOfNow().includes(back) && state.ws !== back) setWs(back);
  if (n && state.db && state.db.resync) state.db.resync();   // the watched data told again what the folder holds
  state.viewRefused = 0; state.viewFrom = '';
  if (n) toast(`Back to Admin. ${plural(n, 'change')} made while viewing ${n === 1 ? 'was' : 'were'} not saved; reload the page to be sure the screen shows only what is saved.`, { label: 'Reload', fn: () => location.reload() });
  else toast('Back to Admin');
}
/** National IDs hidden while the admin views as someone (a meeting may see the screen): every ten-digit ID drawn on the page, in
    the previews (the email documents) and in the tips shows as dots, as it is drawn; the ID fields show dots, their values stay */
const NID_RE = /(^|\D)([12]\d{9})(?!\d)/g, NID_HIDE = '\u2022'.repeat(10), NID_ANY = /[12]\d{9}/;
const nidMask = t => t.replace(NID_RE, (m, a) => a + NID_HIDE);
function nidHide(root) {
  if (!root) return;
  if (root.nodeType === 3) { const v = root.nodeValue; if (v && NID_ANY.test(v)) { const m = nidMask(v); if (m !== v) root.nodeValue = m; } return; }
  if (root.nodeType !== 1) return;
  const doc = root.ownerDocument, w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const v = n.nodeValue; if (v.length >= 10 && NID_ANY.test(v)) { const m = nidMask(v); if (m !== v) n.nodeValue = m; } }
  for (const el of [root, ...root.querySelectorAll('[title], [aria-label], iframe')]) {
    for (const at of ['title', 'aria-label']) { const t = el.getAttribute && el.getAttribute(at); if (t && NID_ANY.test(t)) el.setAttribute(at, nidMask(t)); }
    if (el.tagName === 'IFRAME') nidFrame(el);
  }
}
function nidFrame(fr) {
  const go = () => { try { if (viewing() && fr.contentDocument && fr.contentDocument.body) nidHide(fr.contentDocument.body); } catch (e) { /* not the page's own */ } };
  if (!fr.dataset.nidw) { fr.dataset.nidw = '1'; fr.addEventListener('load', go); }
  go();
}
let nidObs = null;
function nidWatch(on) {
  if (nidObs) { nidObs.disconnect(); nidObs = null; }
  document.body.classList.toggle('nidhide', !!on);
  if (!on) return;
  nidHide(document.body);
  nidObs = new MutationObserver(L => {
    if (!viewing()) return;
    for (const m of L) {
      if (m.type === 'childList') m.addedNodes.forEach(nidHide);
      else if (m.type === 'characterData') nidHide(m.target);
      else if (m.attributeName === 'srcdoc' && m.target.tagName === 'IFRAME') nidFrame(m.target);
      else if (m.target.getAttribute) { const t = m.target.getAttribute(m.attributeName); if (t && NID_ANY.test(t)) m.target.setAttribute(m.attributeName, nidMask(t)); }
    }
  });
  nidObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'srcdoc'] });
}
/** the banner on every page while the admin views as someone else */
function renderViewBar() {
  const el = $('viewBar'); if (!el) return;
  const v = viewing() ? Auth.viewAs() : null; el.hidden = !v;
  if (!v) { el.innerHTML = ''; return; }
  el.innerHTML = `<span class="vbpx" aria-hidden="true"><i></i><i></i><i></i></span><div class="vbtext"><b>Viewing as ${esc(viewLabel(v))}</b><span>A preview of the shared data: nothing you change here is saved, and National IDs are hidden.</span></div>
    <div class="vbacts"><button class="btn sm" data-vbswitch>Switch</button><button class="btn sm primary" data-vbback>Back to Admin</button></div>`;
}
document.addEventListener('click', e => {
  const go = e.target.closest('[data-vago]');
  if (go) { const r = go.dataset.vago, R = VIEW_ROLES.find(x => x[0] === r), sel = R && R[3] ? (go.closest('.varow, .shrole') || document).querySelector(`[data-vapick="${R[3]}"]`) : null; startViewAs(r, sel ? sel.value : ''); return; }
  if (e.target.closest('[data-vbback], [data-vaback]')) { endViewAs(); return; }
  if (e.target.closest('[data-vbswitch]')) openViewAs();
});
document.addEventListener('change', e => { const s = e.target.closest('[data-vapick]'); if (s) { state.viewPick[s.dataset.vapick] = s.value; document.querySelectorAll(`[data-vapick="${s.dataset.vapick}"]`).forEach(x => { if (x !== s) x.value = s.value; }); } });
