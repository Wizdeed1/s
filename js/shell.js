// ================================================================ THE SHELL (Option A): the sidebar, the toolbar, the phone tab bar
// The workspaces sit in a frosted sidebar (a 72 px rail on laptops, remembered in this browser); the toolbar carries the page
// title once the large title has scrolled away, the reporting period, the bell, help, settings and the account; Build has its own
// step bar. Light and dark follow the computer. On a phone the workspaces move to a tab bar at the bottom: every page when they
// fit (five or fewer), else four and More (Apple: avoid overflow tabs). A page the role cannot use is not in the navigation; opened
// by a link it says "Not one of your pages" with the way back. Nothing here reads or writes any data the role could not before.
const WS_LABEL = { dash: 'Dashboard', build: 'WFM team', team: 'Team', results: 'Results', cycle: 'Supervisors', wfm: 'WFM team', quality: 'Quality', me: 'My page', wait: 'Waiting for access', blocked: 'Not one of your pages' };
const WS_ICON = { dash: 'i-home', build: 'i-up', team: 'i-team', results: 'i-check', cycle: 'i-clock', wfm: 'i-chart', quality: 'i-star', me: 'i-user' };
const STEP_LABEL = { import: 'Import', review: 'Review', export: 'Export', email: 'Email' };
const mqPhone = matchMedia('(max-width: 767.98px)'), mqLaptop = matchMedia('(max-width: 1279.98px)');
const lsGet3 = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };

// ---------------------------------------------------------------- the sidebar and its rail
/** 'rail' when the person narrowed it, 'open' when they pinned it open on a laptop, '' for the automatic choice */
function railPref() { return lsGet3('mc-rail'); }
function railNow() { const p = railPref(); return mqLaptop.matches ? p !== 'open' : p === 'rail'; }
function applyRail() {
  const on = railNow(), b = $('railBtn');
  document.documentElement.classList.toggle('rail', on);
  if (b) {
    b.setAttribute('aria-pressed', String(!on)); b.dataset.tip = on ? 'Expand the sidebar' : 'Collapse the sidebar';
    b.setAttribute('aria-label', on ? 'Expand the sidebar' : 'Collapse the sidebar');
    b.querySelector('span').textContent = on ? 'Expand' : 'Collapse';
  }
}
mqLaptop.addEventListener('change', applyRail);
$('railBtn').addEventListener('click', () => { const on = railNow(); lsSet2('mc-rail', on ? (mqLaptop.matches ? 'open' : '') : (mqLaptop.matches ? '' : 'rail')); applyRail(); requestAnimationFrame(thumbs); });
$('sidebar').addEventListener('click', e => {   // Search at the top, How to use and Settings at the bottom
  const b = e.target.closest('[data-sb]'); if (!b) return;
  if (b.dataset.sb === 'find') findOpen(); else if (b.dataset.sb === 'help') openDrawer('dHelp'); else if (b.dataset.sb === 'settings') openDrawer('dSettings');
});
// the rail's labels: a tooltip on hover, at once on focus
(() => {
  let tip = null;
  const show = b => {
    if (!document.documentElement.classList.contains('rail') || mqPhone.matches || !b.dataset.tip) return;
    tip = tip || Object.assign(document.createElement('div'), { className: 'railtip', role: 'tooltip', id: 'railTip' }); document.body.appendChild(tip);
    tip.textContent = b.dataset.tip; const r = b.getBoundingClientRect(); tip.style.top = Math.round(r.top + r.height / 2) + 'px'; tip.hidden = false; b.setAttribute('aria-describedby', 'railTip');
  };
  const hide = () => { if (tip) tip.hidden = true; };
  const side = $('sidebar');
  side.addEventListener('mouseover', e => { const b = e.target.closest('button[data-tip]'); if (b) show(b); else hide(); });
  side.addEventListener('mouseleave', hide);
  side.addEventListener('focusin', e => { const b = e.target.closest('button[data-tip]'); if (b && b.matches(':focus-visible')) show(b); });
  side.addEventListener('focusout', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();

// ---------------------------------------------------------------- the toolbar: the page title, the role, the period
function pageTitleNow() {
  const w = state.ws;
  if (w === 'build') return 'WFM team';
  if (w === 'dash') return 'Dashboard';
  const h = $('h-' + w); return (h && normSpace(h.textContent)) || WS_LABEL[w] || '';
}
function syncHead() {
  try { renderDeptGuide(); } catch (e) { /* the guide is drawn once the page has started */ }
  const t = pageTitleNow(), r = roleNow(), u = Auth.user();
  $('pageTitle').textContent = t;
  const tag = $('roleTag'); tag.hidden = !u || r === 'pending'; tag.textContent = ROLE_NAME[r] || '';
  document.title = t ? `${t} · MC Monthly Report Builder` : 'MC Monthly Report Builder';
  renderPeriod();
}
// ---- the reporting period (D13): every page except Build, where the month comes from the exports
/** WFM team › Interactions and WFM team › Daily keep their own months (the months that have those files) */
const wfmOwnTab = () => (state.ws === 'wfm' && (state.wfmTab === 'inter' || state.wfmTab === 'daily') ? state.wfmTab : '');
function dailyKs() { try { const H = state.dhist || {}, hk = new Set(); for (const secs of Object.values(H)) for (const r of ((secs.voice || {}).daily || [])) hk.add(r.date.slice(0, 7)); return [...new Set([...dailyMonths(), ...hk])].sort(); } catch (e) { return []; } }
function periodList() {
  const r = roleNow(), own = wfmOwnTab();
  if (r === 'agent') { const M = state.me; return M && M.months ? Object.keys(M.months).sort() : []; }
  if (state.ws === 'quality') return typeof qMonths === 'function' ? qMonths() : [];
  if (own === 'inter') return Object.keys(state.inter || {}).sort();
  if (own === 'daily') return dailyKs();
  return wsMonths();
}
function periodNow() {
  const r = roleNow(), own = wfmOwnTab();
  if (r === 'agent') return state.meMonth || '';
  if (state.ws === 'quality') return typeof qMonthNow === 'function' ? qMonthNow() : '';
  if (own === 'inter') return state.interK || '';
  if (own === 'daily') return state.dailyK || '';
  return wsMonthNow();
}
function periodFinal(k) { if (roleNow() === 'agent') { const M = state.me, x = M && M.months && M.months[k]; return !!(x && x.status === 'final'); } return monthLocked(k); }
const periodLabel = k => (roleNow() === 'agent' && typeof ymLabelT === 'function' ? ymLabelT(k) : ymLabel(k));
function renderPeriod() {
  const b = $('periodBtn'); if (!b) return;
  const w = state.ws, L = periodList(), k = periodNow();
  b.hidden = !L.length || !k || w === 'build' || w === 'wait' || w === 'blocked';
  if (b.hidden) { $('periodMenu').hidden = true; return; }
  const fin = periodFinal(k);
  $('periodLbl').textContent = periodLabel(k);
  $('periodSt').innerHTML = fin ? '<svg aria-hidden="true"><use href="#i-lock"/></svg>Final' : 'Open';
  $('periodSt').className = 'pst' + (fin ? ' fin' : '');
  b.setAttribute('aria-label', `Reporting period: ${periodLabel(k)}, ${fin ? 'final, read-only' : 'open'}. Choose another month.`);
}
function periodMenuHtml() {
  const L = periodList().slice().reverse(), k = periodNow();
  return `<div class="mhead">Reporting period</div>${L.map(x => { const f = periodFinal(x); return `<button role="menuitemradio" aria-checked="${x === k}" data-period="${esc(x)}"><span>${esc(periodLabel(x))}</span><span class="pst${f ? ' fin' : ''}">${f ? '<svg aria-hidden="true"><use href="#i-lock"/></svg>Final' : 'Open'}</span></button>`; }).join('')}
    <p class="mfoot">Final months are read-only; only the senior manager changes them.</p>`;
}
function setPeriod(k) {
  const r = roleNow();
  if (r === 'agent') state.meMonth = k;
  else {
    if (wsMonths().includes(k)) state.wsMonth = k; if (typeof qMonths === 'function' && qMonths().includes(k)) state.qMonth = k;
    if (Object.keys(state.inter || {}).includes(k)) state.interK = k;   // the same month on every page that has it
    if (dailyKs().includes(k)) { state.dailyK = k; state.dailyKPicked = true; }
  }
  renderWs();
}
// ---- menus in the toolbar (the period): open below their button, arrows move, Escape closes and returns the focus
let menuOpen = null;
function openMenu(btn, menu, html) {
  closeMenus();
  const am = $('acctMenu'); if (am && !am.hidden) { am.hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false'); }   // one menu at a time
  if (html != null) menu.innerHTML = html;
  menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); menuOpen = { btn, menu };
  const on = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'); if (on) on.focus();
}
function closeMenus(back) {
  if (!menuOpen) return; const { btn, menu } = menuOpen; menuOpen = null;
  menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus();
}
document.addEventListener('click', e => { if (menuOpen && !e.target.closest('.hpop')) closeMenus(); });
for (const id of ['periodMenu']) $(id).addEventListener('keydown', e => {
  const items = [...$(id).querySelectorAll('button')], i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); closeMenus(true); }
  if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
  if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
  if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  if (e.key === 'Tab') closeMenus();
});
$('periodBtn').addEventListener('click', e => { e.stopPropagation(); if (menuOpen && menuOpen.menu === $('periodMenu')) { closeMenus(); return; } openMenu($('periodBtn'), $('periodMenu'), periodMenuHtml()); });
$('periodMenu').addEventListener('click', e => { const b = e.target.closest('[data-period]'); if (!b) return; closeMenus(true); setPeriod(b.dataset.period); });
// ---- the appearance in the account menu (System, Light, Dark): the menu stays open, so the change shows at once; left and right
// move between the three. The sliding thumbs of the segmented controls are measured again when the page turns light or dark.
$('acctMenu').addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (b) setTheme(b.dataset.themeSet); });
$('acctMenu').addEventListener('keydown', e => {
  const b = e.target.closest && e.target.closest('.appearseg button'); if (!b || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const L = [...b.parentElement.querySelectorAll('button')], i = L.indexOf(b), rtl = getComputedStyle(b).direction === 'rtl';
  e.preventDefault(); L[(i + ((e.key === 'ArrowRight') !== rtl ? 1 : L.length - 1)) % L.length].focus();
});
document.addEventListener('mc-theme', () => requestAnimationFrame(thumbs));

// ---------------------------------------------------------------- the phone tab bar and its More sheet
/** the pages in the navigation: the month's build is part of the WFM team page, so it has no entry of its own */
function navList() { return wsOfNow().filter(w => WS_LABEL[w] && w !== 'build'); }
const navOn = w => w === state.ws || (w === 'wfm' && state.ws === 'build');
function tabBarHtml() {
  const L = navList(), more = L.length > 5, main = more ? L.slice(0, 4) : L;   // every page when five or fewer; else four and More (no overflow tab when it fits)
  const dot = w => { const d = $('wsSeg').querySelector(`[data-ws="${w}"] .wsdot`); return d ? `<span class="wsdot">${esc(d.textContent)}</span>` : ''; };
  const inMore = more && !main.some(navOn) && L.some(navOn);
  return main.map(w => `<button data-ws="${w}"${navOn(w) ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="#${WS_ICON[w]}"/></svg><span>${esc(WS_LABEL[w])}</span>${dot(w)}</button>`).join('')
    + (more ? `<button data-tabmore${inMore ? ' aria-current="page"' : ''} aria-haspopup="dialog" aria-controls="moreSheet"><svg aria-hidden="true"><use href="#i-more"/></svg><span>More</span></button>` : '');
}
function renderTabBar() {
  const bar = $('tabBar'), L = navList(), on = L.length > 1;   // one page needs no tab bar (tab-bars.md): the agent's own page, the quality team's
  bar.hidden = !on; document.documentElement.classList.toggle('notabs', !on);
  bar.innerHTML = on ? tabBarHtml() : '';
}
function moreHtml(focus) {
  const L = navList(), main = L.length > 5 ? L.slice(0, 4) : L, rest = L.filter(w => !main.includes(w)), u = Auth.user();
  const ws = rest.map(w => `<button class="msitem" data-ws="${w}"${navOn(w) ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="#${WS_ICON[w]}"/></svg><span>${esc(WS_LABEL[w])}</span></button>`).join('');
  return `${ws ? `<div class="msgrp"><small>Workspaces</small>${ws}</div>` : ''}
    <div class="msgrp"><small>Tools</small><button class="msitem" data-mact="find"><svg aria-hidden="true"><use href="#i-search"/></svg><span>Search</span></button><button class="msitem" data-mact="help"><svg aria-hidden="true"><use href="#i-help"/></svg><span>How to use</span></button>${isBuilder() ? '<button class="msitem" data-mact="settings"><svg aria-hidden="true"><use href="#i-gear"/></svg><span>Settings</span></button>' : ''}</div>
    ${u ? `<div class="msgrp"><small>${esc(u.name || u.username || 'Account')}</small>${Auth.isAdmin() ? '<button class="msitem" data-mact="accounts"><svg aria-hidden="true"><use href="#i-user"/></svg><span>Manage accounts</span></button>' : ''}<button class="msitem" data-mact="pw"><svg aria-hidden="true"><use href="#i-lock"/></svg><span>Change password</span></button><button class="msitem" data-mact="lock"><svg aria-hidden="true"><use href="#i-lock"/></svg><span>Lock now</span></button><button class="msitem" data-mact="out"><svg aria-hidden="true"><use href="#i-x"/></svg><span>Sign out</span></button></div>` : ''}`;
}
let moreFocus = null;
function moreOpen(focus) {
  moreFocus = document.activeElement;
  $('moreBody').innerHTML = moreHtml(); $('moreSheet').hidden = false; $('scrim').hidden = false; $('scrim').dataset.more = '1';
  const f = $('moreBody').querySelector('button'); if (f) f.focus();
}
function moreClose() {
  if ($('moreSheet').hidden) return;
  $('moreSheet').hidden = true; if ($('scrim').dataset.more) { delete $('scrim').dataset.more; if (!openId) $('scrim').hidden = true; }
  if (moreFocus && moreFocus.isConnected) moreFocus.focus();
}
$('tabBar').addEventListener('click', e => {
  const m = e.target.closest('[data-tabmore]'); if (m) { moreOpen(); return; }
  const b = e.target.closest('button[data-ws]'); if (b) goWs(b.dataset.ws);
});
$('moreSheet').addEventListener('click', e => {
  if (e.target.closest('[data-moreclose]')) { moreClose(); return; }
  const w = e.target.closest('button[data-ws]'); if (w) { moreClose(); goWs(w.dataset.ws); return; }
  const a = e.target.closest('[data-mact]'); if (!a) return; const act = a.dataset.mact; moreClose();
  if (act === 'find') findOpen(); else if (act === 'help') openDrawer('dHelp'); else if (act === 'settings') openDrawer('dSettings');
  else if (act === 'accounts') Auth.openAccounts(); else if (act === 'pw') Auth.change(); else if (act === 'lock') Auth.lock(); else if (act === 'out') Auth.signOut();
});
$('scrim').addEventListener('click', () => { if ($('scrim').dataset.more) moreClose(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('moreSheet').hidden) { e.preventDefault(); moreClose(); }
  if (e.key === 'Tab' && !$('moreSheet').hidden) {
    const f = [...$('moreSheet').querySelectorAll('button')].filter(x => x.offsetParent !== null); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

// ---------------------------------------------------------------- the navigation follows the workspace (sidebar, tab bar, header)
/** a page from the navigation: the WFM team page opens on the tab last used there */
function goWs(w) { if (w === 'wfm') openWfmTeam(); else setWs(w); }
function syncNav() {
  const w = state.ws, L = navList();
  $('wsSeg').querySelectorAll('[data-ws]').forEach(b => {
    const on = navOn(b.dataset.ws); b.hidden = !L.includes(b.dataset.ws);
    b.setAttribute('aria-pressed', String(on)); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  L.forEach(x => { const b = $('wsSeg').querySelector(`:scope > [data-ws="${x}"]`); if (b) $('wsSeg').appendChild(b); });   // the role's own order, the same as its tab bar
  $('wsSeg').hidden = !L.length;
  const set = $('sbSec').querySelector('[data-sb="settings"]'); if (set) set.hidden = !isBuilder();
  $('buildBar').hidden = true;   // the month's steps are the WFM team page's tabs now
  document.body.dataset.ws = w;
  renderTabBar(); syncHead(); renderWfmHead();
}
// ---- links to a workspace (#/team): the page a role cannot use says so, with the way back
const hashWs = () => { const m = /^#\/([a-z]+)/.exec(location.hash || ''); return m ? m[1] : ''; };
function putHash(w) { if (!WS_LABEL[w] || w === 'wait' || w === 'blocked') return; const h = '#/' + w; if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* a file preview */ } } }
function showBlocked(w) {
  const L = navList();
  state.ws = 'blocked'; hidePop(); showWsView('blocked');
  $('blockedSub').textContent = `${WS_LABEL[w] || 'This page'} belongs to another role, so it is not in your navigation. Your pages are ${L.map(x => WS_LABEL[x]).join(', ') || 'not open yet'}.`;
  $('blockedBack').textContent = L.length ? `Go to ${WS_LABEL[L[0]]}` : 'Back';
  syncNav();
}
$('blockedBack').addEventListener('click', () => { const L = wsOfNow(); if (!L.length) return; setWs(L[0]); const h = $('h-' + L[0]) || $('pageTitle'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } else $('main').focus(); });   // the button went with the page: the focus goes to the new one
window.addEventListener('hashchange', () => {
  const w = hashWs(); if (!w || w === state.ws || !Auth.user() && !window.__NOLOCK__) return;
  const L = wsOfNow(); if (!L.length) return;
  if (L.includes(w)) setWs(w); else if (WS_LABEL[w]) showBlocked(w);
});
// ---- leaving the page while a file is read or a save is in flight (D14): the browser asks first, only then
window.addEventListener('beforeunload', e => { if (state.pending.length || inflight > 0) { e.preventDefault(); e.returnValue = ''; } });
// ---- the header's shadow once the page scrolls under it, and the skip link lands on the page
$('skipLink').addEventListener('click', e => { e.preventDefault(); const m = $('main'); m.focus({ preventScroll: true }); m.scrollIntoView({ block: 'start' }); });
applyRail();
// ---- a long page (Supervisors) gets a local list of its sections, so each one is a click away
function sectionNav(bodyId) {
  const body = $(bodyId); if (!body) return;
  const old = body.querySelector(':scope > .secnav'); if (old) old.remove();
  const S = [...body.children].filter(el => el.matches('.card, details.card')).map((el, i) => {
    const h = el.matches('details') ? el.querySelector(':scope > summary') : el.querySelector('h2'); if (!h) return null;
    const t = normSpace(h.textContent).replace(/\s*·.*$/, ''); if (!t) return null;
    if (!el.id) el.id = `${bodyId}-s${i}`; return { id: el.id, t };
  }).filter(Boolean);
  if (S.length < 4) return;
  const nav = document.createElement('nav'); nav.className = 'secnav'; nav.setAttribute('aria-label', 'On this page');
  nav.innerHTML = `<span class="snl">On this page</span>${S.map(x => `<button data-sec="${esc(x.id)}">${esc(x.t)}</button>`).join('')}`;
  body.prepend(nav);
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.secnav [data-sec]'); if (!b) return;
  const el = $(b.dataset.sec); if (!el) return;
  if (el.matches('details') && !el.open) el.open = true;
  el.scrollIntoView({ block: 'start', behavior: RM() ? 'auto' : 'smooth' });
  const f = el.querySelector('h2, summary'); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
});

// ---------------------------------------------------------------- How to use: each department's steps, the signed-in role first
const DEPT = [
  ['user', 'WFM analyst', [
    'Every morning, <b>WFM team › Report builder</b>: drop yesterday\'s exports (on a Sunday, Thursday to Saturday). MC Leaders and the WFM Daily Review are made here, and the four brand emails go to <b>WFM team › Emails</b>.',
    '<b>WFM team › Emails</b> is shared with the WFM manager: the four daily brand emails and the month\'s deduction and absences emails. Edit them (SLA insight, subject, greeting, or the text right in the preview), then <b>Copy for Outlook</b> or <b>Download .eml</b> and send them from Outlook. Mark each one sent. The tool never sends anything itself.',
    'At month end, <b>WFM team › Import</b>: drop every file of the month at once: the four Genesys exports, the supervisors\' attendance sheets, the IDs file, the KPI file and the quality Final EVAL. The tool recognises each file on this computer and sends it where it belongs; anything it is not sure about, it asks.',
    'Type the month\'s <b>DRC-CSAT</b> once (on Import or on Review › KPI results): it counts for every agent.',
    '<b>Review › People</b>: use <b>Match system names</b> to apply every Genesys name at once, and <b>Duplicates</b> to combine people entered twice. <b>Checks</b> lists what the tool needs you to decide.',
    '<b>Export</b>: <b>Build Excel</b> makes the deduction workbook, kept locked in <b>Saved workbooks</b> to download again (a plain copy in MC Data › MC Reports only if you choose it); the incentive data workbook is made too. People with no schedule in the month are left out of every sheet (Settings; Review › Checks names them).',
    '<b>Emails › Monthly emails</b>: send the deduction for review, then the final after the review deadline (it lists what changed); the incentive email comes from the build.',
    'What you drop is kept (<b>Import › Saved uploads</b>): sign out and in, and the month is back. When the WFM manager is on vacation, tick it under Vacation cover on the WFM team page and you have their pages until they are back.',
    'The <b>bell</b> holds your deadlines and the checks; nothing takes space on the pages.']],
  ['wfm', 'WFM manager', [
    'Every morning, <b>WFM team › Emails › Daily brand emails</b>: the four emails the analysts made (Virgin Postpaid, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay). Write the SLA insight, check the warnings, <b>Copy for Outlook</b>, send, then <b>Mark as sent</b>. The analysts can do the same, so whoever is in sends them.',
    '<b>WFM team › Interactions</b>: add the week\'s interactions export.',
    '<b>WFM team › Emails › Deduction and absences</b>: the review and final emails for the month, from the shared month with the supervisors\' corrections. Edit any field, or the text in the preview, before you copy it.',
    'When a WFM analyst is on vacation, tick their name under <b>Vacation cover</b> on the WFM team page: you then have their tabs (Import, Review, Export, Report builder) until you untick it.',
    '<b>Team › Objections</b>: fix the accepted objections on adherence and AHT.',
    'The <b>Dashboard</b> and <b>WFM team › Analytics</b> show the month against the months before. The <b>bell</b> lists what is due.']],
  ['senior', 'Senior manager', [
    '<b>Supervisors</b>: set the one-to-ones deadline and the month close days, and keep the <b>incentive rules</b>: the scorecards, the bases, who is eligible and how the days and KPIs are counted. Percent KPIs and the Final % are rounded to a whole % before they count (94.99% → 95%); the days % is never rounded.',
    '<b>Results</b>: decide on eligibility where the rules say otherwise, adjust a result where needed (every change is logged), and <b>Finalize</b> the month.',
    '<b>Results › Reconcile with the old Excel</b>: drop the old final result (and the incentive or deduction workbook). The tool lines up every person and says why each number differs: an own base, an absence rule, a typing error in the old file. Each has a fix.',
    'Send the four emails from Supervisors: one-to-ones are ready, results for review to the VP, and the final result form.',
    'The <b>bell</b> lists what is late or due soon.']],
  ['spv', 'Supervisor', [
    '<b>Team</b> shows your own agents with their numbers for the month; the header\'s month picker changes the month.',
    '<b>One-to-ones</b>: hold each one, fill in the form and send it to the agent; they add their part and sign the final.',
    '<b>Attendance</b>: correct a day when Genesys is wrong (only an agent\'s supervisor can).',
    '<b>Objections</b>: answer your agents\' objections before the deadline, and correct the accepted ones.',
    '<b>Waiting for approval</b>: approve new agent accounts and link each one to their name.',
    'When every one-to-one is done, <b>Finish your team</b>: the senior manager is told straight away. The <b>bell</b> lists what is due.']],
  ['quality', 'Quality team', [
    '<b>Quality</b>: drop the month\'s Final EVAL in your template: Agent Name, Call QA, Ticket QA / Empowerment Utilization, Call Reason &amp; FCR Accuracy, Final Score, Critical Error and Number of Critical Errors (CT: Evaluation score). The analysts can also drop it on WFM team › Import with everything else.',
    'Ticket QA counts as Empowerment Utilization, CR as Call Reason &amp; FCR Accuracy and the Final Score as Quality Observations (CT\'s Evaluation score as QA Evaluation).',
    'Check the names the tool linked and link the ones left; the answers are remembered next month.',
    'Type <b>DRC-CSAT</b> once for the month: it counts for every agent.',
    'Correct any score in the table (logged). An Attitude critical error stops the incentive.',
    '<b>EVAL template with IDs</b> gives you a workbook in your template with every agent\'s National ID, so each row links by its ID.']],
  ['agent', 'Agent', [
    '<b>My page</b> shows your adherence, KPI results, attendance and one-to-ones. Change the month with the <b>month box</b> at the top (the arrows, or the list).',
    'One-to-ones: fill in your part and send it to your supervisor; sign the final when it arrives.',
    'If a number is not right, <b>object</b> within the window shown on the page.',
    'The <b>bell</b> tells you what you need to do (sign, answer).',
    'The <b>العربية</b> button shows your page in Arabic.'], [
    '<b>صفحتي</b> تعرض التزامك بالجدول ونتائج مؤشرات الأداء والحضور والاجتماعات الفردية. غيّر الشهر من <b>مربع الشهر</b> في الأعلى (الأسهم أو القائمة).',
    'الاجتماعات الفردية: املأ جزأك وأرسله إلى مشرفك، ثم وقّع على القرار النهائي عند وصوله.',
    'إذا كان هناك رقم غير صحيح، <b>اعترض</b> خلال المدة الظاهرة في الصفحة.',
    '<b>الجرس</b> يخبرك بما عليك فعله (توقيع أو رد).',
    'زر <b>English</b> يعرض صفحتك بالإنجليزية.']],
  ['admin', 'Admin', [
    '<b>Manage accounts</b> (the account menu): give each person a role, link supervisors to their names and choose their agents, reset passwords and open access again.',
    '<b>Settings</b>: targets, the deduction scope, the logo, the sign-in lock time, and the scorecards.',
    'Admins can do everything the analysts do on the WFM team page and see every page.',
    'Keep the HTML in the common folder next to the <b>MC Data</b> folder; everyone opens it from there in Edge or Chrome.']],
];
let deptSel = '', deptRole = '';
function renderDeptGuide(force) {
  const tabs = $('deptTabs'), body = $('deptBody'); if (!tabs || !body) return;
  const r = roleNow(); if (!force && deptRole === r && tabs.childElementCount) return;
  if (deptRole !== r) { deptRole = r; deptSel = DEPT.some(d => d[0] === r) ? r : 'user'; }
  const D = DEPT.find(d => d[0] === deptSel) || DEPT[0], ar = deptSel === 'agent' && langNow() === 'ar' && D[3];
  tabs.innerHTML = DEPT.map(([id, l]) => `<button type="button" role="tab" data-dept="${id}" aria-selected="${id === deptSel}" aria-pressed="${id === deptSel}"${id === deptSel ? '' : ' tabindex="-1"'}>${esc(l)}${id === r ? ' <small>you</small>' : ''}</button>`).join('');
  body.innerHTML = `<ol class="deptsteps"${ar ? ' dir="rtl" lang="ar"' : ''}>${(ar ? D[3] : D[2]).map(t => `<li>${t}</li>`).join('')}</ol>${D[3] && !ar ? `<details class="deptar"><summary>بالعربية</summary><ol class="deptsteps" dir="rtl" lang="ar">${D[3].map(t => `<li>${t}</li>`).join('')}</ol></details>` : ''}`;
}
$('deptTabs').addEventListener('click', e => { const b = e.target.closest('[data-dept]'); if (!b) return; deptSel = b.dataset.dept; renderDeptGuide(true); const n = $('deptTabs').querySelector(`[data-dept="${deptSel}"]`); if (n) n.focus(); });
$('deptTabs').addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return; e.preventDefault();
  const i = DEPT.findIndex(d => d[0] === deptSel), n = DEPT.length, j = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
  deptSel = DEPT[j][0]; renderDeptGuide(true); const b = $('deptTabs').querySelector(`[data-dept="${deptSel}"]`); if (b) b.focus();
});
renderDeptGuide(true);
