// ================================================================ UX: a quiet page, help on demand, keys, tools for the tables
// The main view keeps what someone acts on: titles, numbers, states, warnings and actions. What a page or a card is for, how a
// step works, what a chart shows: behind an ⓘ next to the title it belongs to (point at it, focus it, or click to pin it). Show
// guidance (the account menu, or the shortcuts sheet: ?) puts every explanation back on the page for someone learning the tool.
// Nothing here changes a number, a rule, a saved file or who may do what: it only changes how a page is read and worked.
// The few choices it remembers are per browser (mc-guide, mc-ux-open:*), like the appearance (mc-theme).

// ---------------------------------------------------------------- the ⓘ: one popover for every explanation
const UX = { n: 0, pop: null, cur: null, pinned: false, tShow: 0, tHide: 0, raf: 0 };
const uxText = el => normSpace(el ? el.textContent : '');
const uxGuide = () => document.documentElement.classList.contains('uxguide');
function uxPopEl() {
  if (UX.pop && UX.pop.isConnected) return UX.pop;
  const el = document.createElement('div'); el.id = 'uxPop'; el.className = 'uxpop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.hidden = true;
  el.addEventListener('mouseenter', () => clearTimeout(UX.tHide));
  el.addEventListener('mouseleave', () => { if (!UX.pinned) uxHideSoon(); });
  document.body.appendChild(el); UX.pop = el; return el;
}
const uxSrcOf = b => document.getElementById(b.getAttribute('aria-describedby') || '');
/** the explanation of an ⓘ, as a copy (ids taken off), next to the ⓘ; pin: it stays until a click elsewhere or Escape */
function uxShow(b, pin) {
  const src = uxSrcOf(b); if (!src || !uxText(src)) return;
  const el = uxPopEl(); clearTimeout(UX.tShow); clearTimeout(UX.tHide);
  if (UX.cur && UX.cur !== b) UX.cur.setAttribute('aria-expanded', 'false');
  const t = src.cloneNode(true); t.removeAttribute('id'); t.removeAttribute('hidden'); t.classList.remove('uxsrc'); t.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  el.replaceChildren(t); el.classList.toggle('pinned', !!pin); el.hidden = false;
  UX.cur = b; UX.pinned = !!pin; b.setAttribute('aria-expanded', 'true');
  uxPlace();
}
function uxPlace() {
  const b = UX.cur, el = UX.pop; if (!b || !el || el.hidden) return;
  if (!b.isConnected || !b.getClientRects().length) { uxHide(); return; }
  const r = b.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, m = 8, rtl = getComputedStyle(b).direction === 'rtl';
  let top = r.bottom + 6; if (top + h > innerHeight - m && r.top - 6 - h > m) top = r.top - 6 - h;
  let left = rtl ? r.right - w + 10 : r.left - 10; left = Math.max(m, Math.min(innerWidth - w - m, left));
  el.style.top = Math.round(top) + 'px'; el.style.left = Math.round(left) + 'px';
}
function uxHide(back) {
  clearTimeout(UX.tShow); clearTimeout(UX.tHide);
  const b = UX.cur; if (b) b.setAttribute('aria-expanded', 'false');
  UX.cur = null; UX.pinned = false; if (UX.pop) UX.pop.hidden = true;
  if (back && b && b.isConnected) b.focus();
}
function uxHideSoon() { clearTimeout(UX.tHide); UX.tHide = setTimeout(() => uxHide(), 160); }
document.addEventListener('mouseover', e => {
  const b = e.target.closest && e.target.closest('.uxi'); if (!b || UX.pinned) return;
  clearTimeout(UX.tHide); if (UX.cur === b) return;
  clearTimeout(UX.tShow); UX.tShow = setTimeout(() => uxShow(b, false), 220);
});
document.addEventListener('mouseout', e => {
  const b = e.target.closest && e.target.closest('.uxi'); if (!b) return;
  const to = e.relatedTarget; if (to && (b.contains(to) || (UX.pop && UX.pop.contains(to)))) return;
  clearTimeout(UX.tShow); if (!UX.pinned && UX.cur === b) uxHideSoon();
});
document.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('.uxi'); if (b && b.matches(':focus-visible') && !UX.pinned) uxShow(b, false); });
document.addEventListener('focusout', e => { const b = e.target.closest && e.target.closest('.uxi'); if (b && UX.cur === b && !UX.pinned) uxHideSoon(); });
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.uxi');
  if (b) { e.preventDefault(); e.stopPropagation(); if (UX.cur === b && UX.pinned) uxHide(); else uxShow(b, true); return; }
  if (UX.cur && !(UX.pop && UX.pop.contains(e.target))) uxHide();
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UX.cur) { e.preventDefault(); e.stopPropagation(); uxHide(UX.pinned); } }, true);
window.addEventListener('scroll', () => { if (!UX.cur) return; if (!UX.pinned) uxHide(); else if (!UX.raf) UX.raf = requestAnimationFrame(() => { UX.raf = 0; uxPlace(); }); }, { passive: true, capture: true });
window.addEventListener('resize', () => uxHide());

// ---------------------------------------------------------------- explanations out of the main view
/** an ⓘ at the end of a title, for the text in src: the text stays where it was (hidden), so a screen reader hears it with the ⓘ
    and Show guidance puts it back. A title rewritten by its page gets its ⓘ again on the next pass. */
function uxTip(src, head) {
  if (!src || !head || src === head) return;
  if (!src.id) src.id = 'uxs' + (++UX.n);
  let b = head.querySelector(':scope > .uxi');
  const other = b && b.getAttribute('aria-describedby'), oe = other && other !== src.id ? document.getElementById(other) : null;
  if (oe && oe.isConnected) { delete src.dataset.uxh; uxTipHere(src); return; }   // that title explains something else already
  src.classList.add('uxsrc'); src.dataset.uxh = head.id || (head.id = 'uxh' + (++UX.n));
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.className = 'uxi'; b.innerHTML = '<svg aria-hidden="true" width="16" height="16"><use href="#i-info"/></svg>';
    b.setAttribute('aria-expanded', 'false'); head.appendChild(b);
  }
  if (b.getAttribute('aria-describedby') !== src.id) b.setAttribute('aria-describedby', src.id);
  const lab = `About ${uxText(head).replace(/^Step \d+:\s*/, '') || 'this'}`; if (b.getAttribute('aria-label') !== lab) b.setAttribute('aria-label', lab);
  const on = !src.hidden && !!uxText(src); if (b.hidden === on) b.hidden = !on;
}
/** an explanation with no title near it: its ⓘ goes where the text was */
function uxTipHere(src) {
  if (!src.id) src.id = 'uxs' + (++UX.n);
  src.classList.add('uxsrc');
  let b = src.previousElementSibling; if (!b || !b.classList.contains('uxi')) { b = document.createElement('button'); b.type = 'button'; b.className = 'uxi uxhere'; b.innerHTML = '<svg aria-hidden="true" width="16" height="16"><use href="#i-info"/></svg>'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'About this'); src.before(b); }
  if (b.getAttribute('aria-describedby') !== src.id) b.setAttribute('aria-describedby', src.id);
  const on = !src.hidden && !!uxText(src); if (b.hidden === on) b.hidden = !on;   // only when it changes: the drawers' observer watches `hidden`
}
/** the title an explanation belongs to: the heading just before it in its block, else its card's first heading */
function uxHeadFor(src) {
  for (let el = src.previousElementSibling; el; el = el.previousElementSibling) if (el.matches('h1, h2, h3, h4')) return el;
  const box = src.closest('.cardhead, .card, article, details, .drawer > header'); if (!box || box.matches('.view')) return null;   // its own card's title, never the page's
  const h = box.querySelector('h1, h2, h3, h4, summary'); return h && !h.contains(src) && !src.contains(h) ? h : null;
}
const uxWords = el => uxText(el).split(' ').filter(Boolean).length;
/** what is an explanation on a main page: a page's lead under its title; a card's caption (a long one: short lines are meta, like
    "Sep 2026 · 164 agents"); anything marked .uxhelp. Status, warnings and the lines marked .keep stay on the page. */
function uxDeclutter() {
  const main = $('main'); if (!main) return;
  for (const p of main.querySelectorAll('.viewhead > div:first-child > p:not(.keep)')) uxTip(p, p.parentElement.querySelector(':scope > h1, :scope > h2'));
  for (const p of main.querySelectorAll('.cardhead p.cap:not(.keep), .card > p.cap:not(.keep)')) if (p.classList.contains('uxsrc') || uxWords(p) >= 7) uxTip(p, uxHeadFor(p));
  for (const p of main.querySelectorAll('.uxhelp:not(.keep)')) { const h = uxHeadFor(p); if (h) uxTip(p, h); else uxTipHere(p); }
  // a title rewritten by its page (textContent) lost its ⓘ: put it back; an explanation emptied or hidden by its page hides it
  for (const s of main.querySelectorAll('.uxsrc[data-uxh]')) { const h = document.getElementById(s.dataset.uxh); if (h) uxTip(s, h); }
  for (const b of main.querySelectorAll('.uxi')) { const s = uxSrcOf(b); if ((!s || !s.isConnected) && !b.hidden) b.hidden = true; }
}
// ---- the drawers and Settings: a field's help line behind an ⓘ on the field's label line; a drawer's own caption behind the ⓘ on its
// title. Status lines stay (the person panel's summary, Saved…); How to use, the shortcuts, How this was counted and the forms people fill
// in are left as they are.
const UX_DRAWER_SKIP = '#dHelp, #dKeys, #dHow, #dSign, #dForm, #dObj';
function uxFieldTip(sm) {
  const box = sm.closest('.cntrow, .field'); if (!box) return;
  const head = box.querySelector(':scope > .lbl, :scope > label');
  if (!head) { uxTipHere(sm); return; }
  if (head.tagName !== 'LABEL') { uxTip(sm, head); return; }   // a span: the ⓘ goes at its end
  if (!sm.id) sm.id = 'uxs' + (++UX.n);
  let b = box.querySelector(':scope > .uxi.uxfld');   // a <label> cannot hold a button: the ⓘ sits on its line, at the field's end
  const other = b && b.getAttribute('aria-describedby'), oe = other && other !== sm.id ? document.getElementById(other) : null;
  if (oe && oe.isConnected) { uxTipHere(sm); return; }
  sm.classList.add('uxsrc');
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'uxi uxfld'; b.innerHTML = '<svg aria-hidden="true" width="16" height="16"><use href="#i-info"/></svg>'; b.setAttribute('aria-expanded', 'false'); head.after(b); box.classList.add('uxhasfld'); }
  if (b.getAttribute('aria-describedby') !== sm.id) b.setAttribute('aria-describedby', sm.id);
  const lab = `About ${uxText(head) || 'this'}`; if (b.getAttribute('aria-label') !== lab) b.setAttribute('aria-label', lab);
  const on = !sm.hidden && !!uxText(sm); if (b.hidden === on) b.hidden = !on;   // only when it changes (see uxTipHere)
}
function uxDrawers() {
  for (const d of document.querySelectorAll('.drawer:not([hidden])')) {
    if (d.matches(UX_DRAWER_SKIP)) continue;
    for (const sm of d.querySelectorAll('.field > small:not(.keep), .cntrow .cntctl > small:not(.keep)')) uxFieldTip(sm);
    for (const p of d.querySelectorAll('.uxhelp:not(.keep)')) { const h = uxHeadFor(p); if (h) uxTip(p, h); else uxTipHere(p); }
    for (const sx of d.querySelectorAll('.uxsrc[data-uxh]')) { const h = document.getElementById(sx.dataset.uxh); if (h) uxTip(sx, h); }
  }
}
// after every change to the page, once per frame (the pages draw themselves; this only adds the ⓘ and the tools)
const uxObs = new MutationObserver(() => { if (UX.mo) return; UX.mo = requestAnimationFrame(() => { UX.mo = 0; try { uxDeclutter(); uxFlowBars(); uxEnhance(); uxLists(); uxDrawers(); uxRefocus(); } catch (e) { /* a page half drawn: the next pass */ } }); });
function uxStart() {
  const m = $('main'); if (m) uxObs.observe(m, { childList: true, subtree: true });
  document.querySelectorAll('.drawer').forEach(d => uxObs.observe(d, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }));   // a drawer opening, or drawing itself
  uxDeclutter(); uxFlowBars(); uxEnhance(); uxLists(); uxDrawers();
}

// ---- Show guidance: every explanation back on the page (per browser), from the account menu, the shortcuts sheet or Shift+H
function uxSetGuide(on, quiet) {
  document.documentElement.classList.toggle('uxguide', !!on); lsSet2('mc-guide', on ? '1' : ''); uxHide(); uxSyncGuide();
  if (!quiet) toast(on ? 'Guidance shown: every explanation is on the page.' : 'Guidance hidden: point at ⓘ for an explanation.');
}
function uxSyncGuide() { const on = uxGuide(); document.querySelectorAll('[data-uxguide]').forEach(b => { b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); }); }
if (lsGet3('mc-guide') === '1') document.documentElement.classList.add('uxguide');
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-uxguide]'); if (b) { e.preventDefault(); uxSetGuide(!uxGuide()); } });

// ---------------------------------------------------------------- keys: ? the sheet, g then a letter a page, [ and ] the month
const UX_GO = [['d', 'dash', 'Dashboard'], ['w', 'wfm', 'WFM team'], ['i', 'import', 'Import (WFM team)'], ['e', 'export', 'Export (WFM team)'], ['q', 'quality', 'Quality'], ['c', 'cycle', 'Supervisors (month close)'], ['t', 'team', 'Team'], ['r', 'results', 'Results'], ['m', 'me', 'My page']];
function uxGoTo(w) {
  if (w === 'import' || w === 'export') { if (typeof isBuilder === 'function' && isBuilder()) { wfmGo(w); return true; } return false; }
  if (!navList().includes(w)) return false; goWs(w); return true;
}
function uxMonth(d) {
  const L = periodList(), k = periodNow(), i = L.indexOf(k); if (i < 0 || $('periodBtn').hidden) return false;
  const j = i + d; if (j < 0 || j >= L.length) { toast(d < 0 ? 'This is the first month there is.' : 'This is the newest month.'); return true; }
  setPeriod(L[j]); toast(`Showing ${periodLabel(L[j])}`); return true;
}
function uxKeysHtml() {
  const kb = s => s.split(' ').map(k => `<kbd>${esc(k)}</kbd>`).join(' ');
  const gos = UX_GO.filter(([, w]) => (w === 'import' || w === 'export' ? typeof isBuilder === 'function' && isBuilder() : navList().includes(w)));
  const row = (k, t) => `<li><span>${esc(t)}</span><span class="keys">${kb(k)}</span></li>`;
  return `<section class="uxkeys"><h3>Anywhere</h3><ul>${row('Ctrl K', 'Search: a person, a measure, a page')}${row('/', 'Search, too')}${row('?', 'This sheet')}${row('Shift H', 'Show or hide the guidance on the pages')}${periodList().length > 1 ? row('[', 'The month before') + row(']', 'The month after') : ''}${row('Esc', 'Close a panel, a menu or an ⓘ')}</ul></section>
    ${gos.length ? `<section class="uxkeys"><h3>Go to a page: g, then a letter</h3><ul>${gos.map(([k, , t]) => row(`g ${k}`, t)).join('')}</ul></section>` : ''}
    <section class="uxkeys"><h3>In a table</h3><ul>${row('Enter', 'Save a typed value and go down one row')}${row('↑ ↓', 'Up or down a row in a column of boxes')}${row('Esc', 'Put a typed value back')}${row('Ctrl V', 'Paste a column from Excel down the boxes')}</ul></section>
    <div class="uxguiderow"><span><b>Guidance on the pages</b><small>What each page and step is for, shown under its title instead of behind ⓘ.</small></span><button type="button" class="btn sm" data-uxguide aria-pressed="${uxGuide()}">${uxGuide() ? 'Hide guidance' : 'Show guidance'}</button></div>`;
}
function uxOpenKeys() { $('keysBody').innerHTML = uxKeysHtml(); openDrawer('dKeys'); }
document.addEventListener('click', e => {
  if (!(e.target.closest && e.target.closest('[data-uxkeys]'))) return;
  e.preventDefault(); const m = $('acctMenu'); if (m && !m.hidden) { m.hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false'); }
  uxOpenKeys();
});
document.addEventListener('mc-uxguide', () => { if (!$('dKeys').hidden) $('keysBody').innerHTML = uxKeysHtml(); });
let uxG = 0;
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  const t = e.target; if (t && t.closest && t.closest('input, select, textarea, [contenteditable], .dlg:not([hidden])')) return;
  if (openId && openId !== 'dKeys') return;
  if (!Auth.user() && !window.__NOLOCK__) return;
  const k = e.key;
  if (uxG && Date.now() - uxG < 1500) {
    uxG = 0; const g = UX_GO.find(x => x[0] === k.toLowerCase());
    if (g) { e.preventDefault(); e.stopImmediatePropagation(); if (openId) closeDrawer(); if (!uxGoTo(g[1])) toast(`${g[2]} is not one of your pages.`); }
    return;
  }
  if (k === '?') { e.preventDefault(); if (openId === 'dKeys') closeDrawer(); else uxOpenKeys(); return; }
  if (openId) return;
  if (k === 'g') { uxG = Date.now(); return; }
  if (k === 'H' && e.shiftKey) { e.preventDefault(); uxSetGuide(!uxGuide()); document.dispatchEvent(new Event('mc-uxguide')); return; }
  if ((k === '[' || k === ']') && uxMonth(k === '[' ? -1 : 1)) e.preventDefault();
});

// ---------------------------------------------------------------- steps: one line each, the next one open, a progress bar above
/** the ⓘ of a text a template already hid (a step's or a phase's caption) */
const uxTipBtn = (id, label) => `<button type="button" class="uxi" aria-expanded="false" aria-describedby="${esc(id)}" aria-label="About ${esc(label)}"><svg aria-hidden="true" width="16" height="16"><use href="#i-info"/></svg></button>`;
/** a step's own cards: open when it is next, unless the person chose otherwise for that step (this browser) */
function uxStepOpen(key, dflt) { const v = lsGet3('mc-ux-open:' + key); return v === '1' ? true : v === '0' ? false : dflt; }
function uxStepSet(step, open, keep) {
  const b = step.querySelector(':scope > .stepbody > .stephd .stog'), d = step.querySelector(':scope > .stepbody > .stepdet'); if (!b || !d) return;
  d.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.title = open ? 'Hide the details' : 'Show the details';
  step.classList.toggle('open', open); step.classList.toggle('shut', !open);
  if (keep) lsSet2('mc-ux-open:' + b.dataset.stog, open ? '1' : '0');
  if (open) { try { reveal(d); } catch (e) { /* motion is optional */ } }
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-stog], .flowstep.open > .stepbody > .stephd h2, .flowstep.shut > .stepbody > .stephd h2');
  if (!t || e.target.closest('.uxi')) return;
  const step = t.closest('.flowstep'); uxStepSet(step, step.classList.contains('shut'), true);
});
/** above a flow of three steps or more: how many are done, the next one with a button to it, and Open all / Close all */
function uxFlowBars() {
  for (const f of document.querySelectorAll('#main .flow')) {
    const S = [...f.querySelectorAll(':scope > .flowstep')]; let bar = f.previousElementSibling;
    if (!bar || !bar.classList.contains('flowbar')) { if (S.length < 3) continue; bar = document.createElement('div'); bar.className = 'flowbar'; f.before(bar); }
    if (S.length < 3) { bar.remove(); continue; }
    const done = S.filter(x => x.classList.contains('done')).length, nx = S.find(x => x.classList.contains('next')), det = S.filter(x => x.querySelector(':scope > .stepbody > .stepdet'));
    const allOpen = det.length && det.every(x => x.classList.contains('open'));
    const sig = `${done}|${S.length}|${nx ? nx.dataset.short : ''}|${det.length}|${allOpen}`; if (bar.dataset.sig === sig) continue; bar.dataset.sig = sig;
    if (nx && !nx.id) nx.id = 'fs-' + (++UX.n);
    bar.innerHTML = `<div class="fbcount"><b>${done}</b> of ${S.length} done</div><div class="fbtrack" role="progressbar" aria-label="Steps done" aria-valuemin="0" aria-valuemax="${S.length}" aria-valuenow="${done}"><span style="width:${Math.round(done / S.length * 100)}%"></span></div>
      ${nx ? `<div class="fbnext"><span>Next: <b>${esc(nx.dataset.n)} · ${esc(nx.dataset.short)}</b></span><button type="button" class="btn sm" data-flowgo="${esc(nx.id)}">Go to step</button></div>` : done === S.length ? '<div class="fbnext"><span class="good">Every step is done.</span></div>' : ''}
      ${det.length > 1 ? `<button type="button" class="linkbtn fball" data-flowall="${allOpen ? 'close' : 'open'}">${allOpen ? 'Close all' : 'Open all'}</button>` : ''}`;
  }
}
document.addEventListener('click', e => {
  const g = e.target.closest && e.target.closest('[data-flowgo]');
  if (g) { const st = $(g.dataset.flowgo); if (!st) return; if (st.classList.contains('shut')) uxStepSet(st, true, false); st.scrollIntoView({ block: 'start', behavior: RM() ? 'auto' : 'smooth' }); const h = st.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } return; }
  const a = e.target.closest && e.target.closest('[data-flowall]');
  if (a) { const f = a.closest('.flowbar').nextElementSibling; if (!f) return; const open = a.dataset.flowall === 'open'; f.querySelectorAll(':scope > .flowstep').forEach(st => uxStepSet(st, open, true)); uxFlowBars(); }
});

// ---------------------------------------------------------------- tools for the tables: copy, filter the rows, copy an ID
// A card with one data table gets two small buttons at the end of its header: Copy (the rows on screen, with the headings, as a
// table Excel and Outlook paste as one) and, for a long table with no search of its own, Filter (a box that hides the rows without
// the words typed; it stays while the page redraws). Text marked .cpy (a National ID) is copied with a click.
const UXF = new Map();   // the filter typed per table (by its card's title), kept while the page redraws
const uxCardKey = card => { const h = card.querySelector('h2, h3, summary'); return (card.closest('.view, section[id]') || {}).id + '|' + (h ? uxText(h).replace(/\s*·.*$/, '') : ''); };
const uxCellText = td => { const f = td.querySelector('input:not([type=checkbox]), select, textarea'); if (f) return f.tagName === 'SELECT' ? uxText(f.options[f.selectedIndex]) : String(f.value || '').trim(); return normSpace((td.innerText || td.textContent || '').replace(/\n+/g, ' ')); };
function uxTableOf(card) { const T = [...card.querySelectorAll('table')].filter(t => !t.closest('.uxpop') && t.tHead && t.tBodies[0]); return T.length === 1 ? T[0] : null; }
function uxRows(t) { return [...t.tBodies[0].rows].filter(r => !r.hidden && r.style.display !== 'none' && !r.classList.contains('uxfoff') && !r.querySelector('td.empty')); }
async function uxCopyTable(card) {
  const t = uxTableOf(card); if (!t) return;
  const cols = [...t.tHead.rows[t.tHead.rows.length - 1].cells].map((c, i) => ({ i, h: uxText(c) || '', skip: !!c.querySelector('input[type=checkbox]') || c.classList.contains('uxsel') }));
  const use = cols.filter(c => !c.skip), rows = uxRows(t);
  const data = rows.map(r => { const cells = [...r.cells]; return use.map(c => (cells[c.i] ? uxCellText(cells[c.i]) : '')); });
  const tsv = [use.map(c => c.h), ...data].map(r => r.map(v => String(v).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\r\n');
  const th = 'style="border:1px solid #c8c8c8;padding:4px 8px;background:#f2f2f2;text-align:left"', td = 'style="border:1px solid #c8c8c8;padding:4px 8px"';
  const html = `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt"><tr>${use.map(c => `<th ${th}>${esc(c.h)}</th>`).join('')}</tr>${data.map(r => `<tr>${r.map(v => `<td ${td}>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>`;
  const ok = await copyRich(html, tsv);
  toast(ok ? `Copied ${plural(rows.length, 'row')}: paste into Excel or Outlook` : 'Copy is blocked here. Select the table and press Ctrl+C.');
}
function uxFilterRows(card, q) {
  const t = uxTableOf(card); if (!t) return;
  const w = fwords(q || ''), all = [...t.tBodies[0].rows].filter(r => !r.querySelector('td.empty'));
  let n = 0;
  for (const r of all) { const on = !w.length || w.every(x => fnorm(r.textContent).includes(x)); r.classList.toggle('uxfoff', !on); if (on) n++; }
  const c = card.querySelector('.uxfcount'); if (c) c.textContent = w.length ? `${n} of ${all.length}` : '';
}
function uxEnhance() {
  const main = $('main'); if (!main) return;
  for (const c of main.querySelectorAll('input[type=checkbox][data-mixed]')) c.indeterminate = true;
  for (const card of main.querySelectorAll('.card')) {
    if (card.closest('.uxpop') || card.dataset.uxt === 'off') continue;
    const head = card.querySelector(':scope > .cardhead'), h2 = !head && card.querySelector(':scope > h2'), t = (head || h2) && uxTableOf(card);
    let box = head ? head.querySelector(':scope > .uxtacts') : card.querySelector(':scope > .uxtacts.abs');
    if (!t || t.tBodies[0].rows.length < 2 || t.closest('.card') !== card) { if (box) box.remove(); continue; }
    const key = uxCardKey(card), long = t.tBodies[0].rows.length >= 12, own = !!card.querySelector('input[type=search], input[placeholder^="Search"], input[placeholder*="search" i], [data-tq]');
    if (!box) {
      box = document.createElement('div'); box.className = 'uxtacts';
      box.innerHTML = `${long && !own ? '<span class="uxf" hidden><input type="search" class="uxfq" placeholder="Filter rows" aria-label="Filter the rows of this table" spellcheck="false"><small class="uxfcount" aria-live="polite"></small></span><button type="button" class="btn ghost icon sm" data-uxt="filter" aria-label="Filter the rows" title="Filter the rows" aria-expanded="false"><svg aria-hidden="true" width="16" height="16"><use href="#i-search"/></svg></button>' : ''}<button type="button" class="btn ghost icon sm" data-uxt="copy" aria-label="Copy this table for Excel or Outlook" title="Copy the table (Excel, Outlook)"><svg aria-hidden="true" width="16" height="16"><use href="#i-copy"/></svg></button>`;
      if (head) head.appendChild(box); else { box.classList.add('abs'); card.appendChild(box); }
    }
    const q = UXF.get(key) || '', f = box.querySelector('.uxf');
    if (f && q) { f.hidden = false; const i = f.querySelector('input'); if (i.value !== q) i.value = q; box.querySelector('[data-uxt="filter"]').setAttribute('aria-expanded', 'true'); }
    if (q) uxFilterRows(card, q);
  }
}
// a long list to read (more than 15 lines, nothing to choose or type in it): its first 10, then Show all (kept while the page redraws)
const UXL = new Set();
function uxLists() {
  for (const ul of document.querySelectorAll('#main ul.ilist')) {
    if (ul.closest('details, .uxpop')) continue;
    const L = [...ul.children].filter(li => li.tagName === 'LI'); let b = ul.nextElementSibling;
    const own = b && b.classList.contains('uxmore');
    if (L.length <= 15 || ul.querySelector('select, input, textarea, .btn')) { if (own) b.remove(); L.forEach(li => li.classList.remove('uxmoreoff')); continue; }
    const key = uxCardKey(ul.closest('.card') || ul.parentElement), all = UXL.has(key);
    L.forEach((li, i) => li.classList.toggle('uxmoreoff', !all && i >= 10));
    if (!own) { b = document.createElement('button'); b.type = 'button'; b.className = 'linkbtn uxmore'; ul.after(b); }
    const t = all ? 'Show fewer' : `Show all ${L.length}`; if (b.textContent !== t) b.textContent = t;
    b.dataset.key = key; b.setAttribute('aria-expanded', String(all));
  }
}
document.addEventListener('click', e => {
  const m = e.target.closest && e.target.closest('.uxmore'); if (!m) return;
  if (UXL.has(m.dataset.key)) UXL.delete(m.dataset.key); else UXL.add(m.dataset.key); uxLists();
});
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-uxt]'); if (!b) return;
  const card = b.closest('.card'); if (!card) return;
  if (b.dataset.uxt === 'copy') { uxCopyTable(card); return; }
  if (b.dataset.uxt === 'filter') {
    const f = card.querySelector('.uxf'), open = f.hidden; f.hidden = !open; b.setAttribute('aria-expanded', String(open));
    const i = f.querySelector('input'); if (open) i.focus(); else { i.value = ''; UXF.delete(uxCardKey(card)); uxFilterRows(card, ''); }
  }
});
document.addEventListener('input', e => { const i = e.target.closest && e.target.closest('.uxfq'); if (!i) return; const card = i.closest('.card'); UXF.set(uxCardKey(card), i.value); uxFilterRows(card, i.value); });
document.addEventListener('keydown', e => {
  const i = e.target.closest && e.target.closest('.uxfq'); if (!i || e.key !== 'Escape') return;
  e.preventDefault(); e.stopPropagation(); const card = i.closest('.card'), b = card.querySelector('[data-uxt="filter"]'); if (b) b.click(); if (b) b.focus();
}, true);
// a National ID (or anything marked .cpy): a click copies it, and nothing else happens (the row under it does not open)
document.addEventListener('click', async e => {
  const c = e.target.closest && e.target.closest('.cpy'); if (!c || e.target.closest('a, button:not(.cpy), input, select, textarea')) return;
  e.preventDefault(); e.stopPropagation();
  const v = uxText(c); if (!v) return;
  toast(await copyRich(null, v) ? `Copied ${v}` : 'Copy is blocked here. Select it and press Ctrl+C.');
}, true);

uxSyncGuide();
uxStart();

// ---------------------------------------------------------------- typing in a table: the cursor stays, Enter goes down, Esc undoes
// A value typed in a table is saved and the page redraws itself: the box the person was in (or the one Enter, ↑ or ↓ moved to)
// gets the cursor back after the redraw, so a column is filled without the mouse. Esc puts back what the box had.
const UXK = { el: null, sel: '', at: 0, want: '', orig: '' };
/** a box found again after a redraw: its tag and its data-* attributes (they name the person and the field) */
function uxSel(el) {
  if (!el || !el.matches || !el.matches('input, select, textarea')) return '';
  const a = [...el.attributes].filter(x => x.name.startsWith('data-') && !/^data-ux/.test(x.name)).map(x => `[${x.name}="${CSS.escape(x.value)}"]`).join('');
  return a ? el.tagName.toLowerCase() + a : el.id ? '#' + CSS.escape(el.id) : '';
}
const uxGridBox = el => !!(el && el.matches && el.matches('td input.cell:not([type=checkbox]):not([type=date]):not([type=number]), td input.adj, td input.qv, td input.qc') && el.closest('#main'));
document.addEventListener('focusin', e => {
  const el = e.target; if (!el.closest || !el.closest('#main') || !el.matches('input, select, textarea')) return;
  UXK.el = el; UXK.sel = uxSel(el); UXK.at = Date.now(); if (uxGridBox(el)) UXK.orig = el.value;
});
/** after a redraw: the box that had the cursor is gone and nothing has it now: give it to the new box (or to the one asked for) */
function uxRefocus() {
  const gone = UXK.el && !UXK.el.isConnected, idle = !document.activeElement || document.activeElement === document.body;
  if (!gone || !idle || Date.now() - UXK.at > 4000) { if (gone && !idle) UXK.want = ''; return; }
  const sel = UXK.want || UXK.sel; UXK.want = ''; if (!sel) return;
  let n = null; try { n = document.querySelector('#main ' + sel); } catch (e) { n = null; }
  if (!n || n.disabled) return;
  n.focus({ preventScroll: true }); if (n.select && n.matches('input:not([type=checkbox])')) n.select();
}
/** the same column's box in the row below (d = 1) or above (d = -1), skipping rows without one */
function uxBoxNext(el, d) {
  const td = el.closest('td'), tr = td && td.parentElement; if (!tr) return null; const i = td.cellIndex;
  for (let r = d > 0 ? tr.nextElementSibling : tr.previousElementSibling; r; r = d > 0 ? r.nextElementSibling : r.previousElementSibling) {
    if (r.hidden || r.classList.contains('uxfoff')) continue;
    const c = r.cells[i], b = c && c.querySelector('input.cell, input.adj, input.qv, input.qc, select.cell'); if (b && !b.disabled) return b;
  }
  return null;
}
document.addEventListener('keydown', e => {
  const el = e.target; if (!uxGridBox(el) || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
  if (e.key === 'Escape') { if (el.value !== UXK.orig) { e.preventDefault(); e.stopPropagation(); el.value = UXK.orig; el.select(); } return; }
  const d = e.key === 'Enter' ? (e.shiftKey ? -1 : 1) : e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
  e.preventDefault();
  const n = uxBoxNext(el, d);
  if (!n) { el.blur(); el.focus(); return; }   // the last row: the value is saved, the cursor stays
  UXK.want = uxSel(n); n.focus({ preventScroll: false }); if (n.select && n.tagName === 'INPUT') n.select();
}, true);
