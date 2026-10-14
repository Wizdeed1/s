// ================================================================ THE SHELL (Option C): the sidebar, the header, the phone tab bar
// The workspaces sit in a near-black sidebar (a 72 px rail on laptops, remembered in this browser); the header carries the page
// title, Search, the bell, the reporting period, the theme and the account; Build has its own step bar. On a phone the
// workspaces move to a tab bar at the bottom (four items and More). A page the role cannot use is not in the navigation; opened
// by a link it says "Not one of your pages" with the way back. Nothing here reads or writes any data the role could not before.
const WS_LABEL = { dash: 'Dashboard', build: 'Build', team: 'Team', results: 'Results', cycle: 'Supervisors', wfm: 'WFM', quality: 'Quality', me: 'My page', wait: 'Waiting for access', blocked: 'Not one of your pages' };
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
$('sbSec').addEventListener('click', e => {
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

// ---------------------------------------------------------------- the header: the page title, the role, the period, the theme
function pageTitleNow() {
  const w = state.ws;
  if (w === 'build') return 'Build';
  if (w === 'dash') return 'Dashboard';
  const h = $('h-' + w); return (h && normSpace(h.textContent)) || WS_LABEL[w] || '';
}
function syncHead() {
  const t = pageTitleNow(), r = roleNow(), u = Auth.user();
  $('pageTitle').textContent = t;
  const tag = $('roleTag'); tag.hidden = !u || r === 'pending'; tag.textContent = ROLE_NAME[r] || '';
  document.title = t ? `${t} · MC Monthly Report Builder` : 'MC Monthly Report Builder';
  renderPeriod();
}
// ---- the reporting period (D13): every page except Build, where the month comes from the exports
function periodList() {
  const r = roleNow();
  if (r === 'agent') { const M = state.me; return M && M.months ? Object.keys(M.months).sort() : []; }
  if (state.ws === 'quality') return typeof qMonths === 'function' ? qMonths() : [];
  return wsMonths();
}
function periodNow() {
  const r = roleNow();
  if (r === 'agent') return state.meMonth || '';
  if (state.ws === 'quality') return typeof qMonthNow === 'function' ? qMonthNow() : '';
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
  else { if (wsMonths().includes(k)) state.wsMonth = k; if (typeof qMonths === 'function' && qMonths().includes(k)) state.qMonth = k; }
  renderWs();
}
// ---- menus in the header (period, theme): open below their button, arrows move, Escape closes and returns the focus
let menuOpen = null;
function openMenu(btn, menu, html) {
  closeMenus();
  if (html != null) menu.innerHTML = html;
  menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); menuOpen = { btn, menu };
  const on = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'); if (on) on.focus();
}
function closeMenus(back) {
  if (!menuOpen) return; const { btn, menu } = menuOpen; menuOpen = null;
  menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus();
}
document.addEventListener('click', e => { if (menuOpen && !e.target.closest('.hpop')) closeMenus(); });
for (const id of ['periodMenu', 'themeMenu']) $(id).addEventListener('keydown', e => {
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
// ---- the theme (D4): System, Light or Dark, for everyone, kept in this browser as before (mc-theme)
const THEME_ICON = { system: 'i-monitor', light: 'i-sun', dark: 'i-moon' };
function syncTheme() {
  const t = themeNow();
  $('themeIco').innerHTML = `<use href="#${THEME_ICON[t] || 'i-moon'}"/>`;
  $('themeBtn').setAttribute('aria-label', `Theme: ${t[0].toUpperCase() + t.slice(1)}`); $('themeBtn').title = `Theme: ${t[0].toUpperCase() + t.slice(1)}`;
  $('themeMenu').querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themeSet === t)));
  const a = $('acctTheme'); if (a) a.textContent = t[0].toUpperCase() + t.slice(1);
  if ($('theme')) setSeg($('theme'), t);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', '#0a0a0b');
}
function setTheme(t) { try { localStorage.setItem('mc-theme', t); } catch (e) { /* this browser only */ } applyTheme(t); syncTheme(); }
$('themeBtn').addEventListener('click', e => { e.stopPropagation(); if (menuOpen && menuOpen.menu === $('themeMenu')) { closeMenus(); return; } openMenu($('themeBtn'), $('themeMenu')); });
$('themeMenu').addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (!b) return; setTheme(b.dataset.themeSet); closeMenus(true); });
$('acctMenu').addEventListener('click', e => {
  if (!e.target.closest('[data-acct-theme]')) return;
  $('acctMenu').hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false');
  if (mqPhone.matches) { moreOpen('theme'); return; }
  setTimeout(() => openMenu($('themeBtn'), $('themeMenu')), 0);
});
// the theme that follows the device changes with it, live
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themeNow() === 'system') requestAnimationFrame(thumbs); }); } catch (e) { /* older browsers */ }

// ---------------------------------------------------------------- the phone tab bar and its More sheet
function navList() { return (WS_OF[roleNow()] || []).filter(w => WS_LABEL[w]); }
function tabBarHtml() {
  const L = navList(), main = L.length > 5 ? L.slice(0, 4) : L, more = L.length > 5;
  const dot = w => { const d = $('wsSeg').querySelector(`[data-ws="${w}"] .wsdot`); return d ? `<span class="wsdot">${esc(d.textContent)}</span>` : ''; };
  const inMore = more && !main.includes(state.ws) && L.includes(state.ws);
  return main.map(w => `<button data-ws="${w}"${w === state.ws ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="#${WS_ICON[w]}"/></svg><span>${esc(WS_LABEL[w])}</span>${dot(w)}</button>`).join('')
    + `<button data-tabmore${inMore ? ' aria-current="page"' : ''} aria-haspopup="dialog" aria-controls="moreSheet"><svg aria-hidden="true"><use href="#i-more"/></svg><span>More</span></button>`;
}
function renderTabBar() {
  const bar = $('tabBar'), L = navList();
  bar.hidden = !L.length;
  bar.innerHTML = L.length ? tabBarHtml() : '';
}
function moreHtml(focus) {
  const L = navList(), main = L.length > 5 ? L.slice(0, 4) : L, rest = L.filter(w => !main.includes(w)), u = Auth.user(), t = themeNow();
  const ws = rest.map(w => `<button class="msitem" data-ws="${w}"${w === state.ws ? ' aria-current="page"' : ''}><svg aria-hidden="true"><use href="#${WS_ICON[w]}"/></svg><span>${esc(WS_LABEL[w])}</span></button>`).join('');
  return `${ws ? `<div class="msgrp"><small>Workspaces</small>${ws}</div>` : ''}
    <div class="msgrp"><small>Tools</small><button class="msitem" data-mact="find"><svg aria-hidden="true"><use href="#i-search"/></svg><span>Search</span></button><button class="msitem" data-mact="help"><svg aria-hidden="true"><use href="#i-help"/></svg><span>How to use</span></button>${isBuilder() ? '<button class="msitem" data-mact="settings"><svg aria-hidden="true"><use href="#i-gear"/></svg><span>Settings</span></button>' : ''}</div>
    <div class="msgrp" id="msTheme"><small>Theme</small><div class="seg mstheme" role="group" aria-label="Theme">${['system', 'light', 'dark'].map(x => `<button data-theme-set="${x}" aria-pressed="${x === t}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div></div>
    ${u ? `<div class="msgrp"><small>${esc(u.name || u.username || 'Account')}</small>${Auth.isAdmin() ? '<button class="msitem" data-mact="accounts"><svg aria-hidden="true"><use href="#i-user"/></svg><span>Manage accounts</span></button>' : ''}<button class="msitem" data-mact="pw"><svg aria-hidden="true"><use href="#i-lock"/></svg><span>Change password</span></button><button class="msitem" data-mact="lock"><svg aria-hidden="true"><use href="#i-lock"/></svg><span>Lock now</span></button><button class="msitem" data-mact="out"><svg aria-hidden="true"><use href="#i-x"/></svg><span>Sign out</span></button></div>` : ''}`;
}
let moreFocus = null;
function moreOpen(focus) {
  moreFocus = document.activeElement;
  $('moreBody').innerHTML = moreHtml(); $('moreSheet').hidden = false; $('scrim').hidden = false; $('scrim').dataset.more = '1';
  const f = focus === 'theme' ? $('moreBody').querySelector('#msTheme button[aria-pressed="true"]') : $('moreBody').querySelector('button'); if (f) f.focus();
}
function moreClose() {
  if ($('moreSheet').hidden) return;
  $('moreSheet').hidden = true; if ($('scrim').dataset.more) { delete $('scrim').dataset.more; if (!openId) $('scrim').hidden = true; }
  if (moreFocus && moreFocus.isConnected) moreFocus.focus();
}
$('tabBar').addEventListener('click', e => {
  const m = e.target.closest('[data-tabmore]'); if (m) { moreOpen(); return; }
  const b = e.target.closest('[data-ws]'); if (b) setWs(b.dataset.ws);
});
$('moreSheet').addEventListener('click', e => {
  if (e.target.closest('[data-moreclose]')) { moreClose(); return; }
  const w = e.target.closest('[data-ws]'); if (w) { moreClose(); setWs(w.dataset.ws); return; }
  const t = e.target.closest('[data-theme-set]'); if (t) { setTheme(t.dataset.themeSet); setSeg($('moreBody').querySelector('.mstheme'), ''); $('moreBody').querySelectorAll('.mstheme button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.themeSet === t.dataset.themeSet))); return; }
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
function syncNav() {
  const w = state.ws, L = WS_OF[roleNow()] || [];
  $('wsSeg').querySelectorAll('[data-ws]').forEach(b => {
    const on = b.dataset.ws === w; b.hidden = !L.includes(b.dataset.ws);
    b.setAttribute('aria-pressed', String(on)); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('wsSeg').hidden = !L.length;
  const set = $('sbSec').querySelector('[data-sb="settings"]'); if (set) set.hidden = !isBuilder();
  $('buildBar').hidden = w !== 'build';
  document.body.dataset.ws = w;
  renderTabBar(); syncHead();
}
// ---- links to a workspace (#/team): the page a role cannot use says so, with the way back
const hashWs = () => { const m = /^#\/([a-z]+)/.exec(location.hash || ''); return m ? m[1] : ''; };
function putHash(w) { if (!WS_LABEL[w] || w === 'wait' || w === 'blocked') return; const h = '#/' + w; if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { /* a file preview */ } } }
function showBlocked(w) {
  const L = WS_OF[roleNow()] || [];
  state.ws = 'blocked'; hidePop(); showWsView('blocked');
  $('blockedSub').textContent = `${WS_LABEL[w] || 'This page'} belongs to another role, so it is not in your navigation. Your pages are ${L.map(x => WS_LABEL[x]).join(', ') || 'not open yet'}.`;
  $('blockedBack').textContent = L.length ? `Go to ${WS_LABEL[L[0]]}` : 'Back';
  syncNav();
}
$('blockedBack').addEventListener('click', () => { const L = WS_OF[roleNow()] || []; if (L.length) setWs(L[0]); });
window.addEventListener('hashchange', () => {
  const w = hashWs(); if (!w || w === state.ws || !Auth.user() && !window.__NOLOCK__) return;
  const L = WS_OF[roleNow()] || []; if (!L.length) return;
  if (L.includes(w)) setWs(w); else if (WS_LABEL[w]) showBlocked(w);
});
// ---- leaving the page while a file is read or a save is in flight (D14): the browser asks first, only then
window.addEventListener('beforeunload', e => { if (state.pending.length || inflight > 0) { e.preventDefault(); e.returnValue = ''; } });
// ---- the header's shadow once the page scrolls under it, and the skip link lands on the page
$('skipLink').addEventListener('click', e => { e.preventDefault(); const m = $('main'); m.focus({ preventScroll: true }); m.scrollIntoView({ block: 'start' }); });
applyRail(); syncTheme();
