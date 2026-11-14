// ================================================================ GLASS: the floating bar, the spheres, the light on the glass
// The look is ui6/98_glass.css; this is the little it cannot do alone. Nothing here reads or writes any data.
// - The bar: the sidebar's pages lie across the top with the toolbar's buttons at their right end. The buttons' width is measured
//   (--tools-w) so the pages keep clear of them; when the pages do not fit, Search shrinks to its icon (tight), then the pages go
//   to icons with the name of the page you are on (compact); a blue pill slides to the page you are on.
// - Less transparency (the account menu, or the computer's own setting): solid panels and still spheres, kept in this browser as
//   mc-glass ('solid' or 'glass'; nothing kept follows the computer). The page carries it as data-glass="solid".
// - Where the pointer is: a soft light on the panel under it, the spheres drift a little with it (depth), a ripple where you click.
// With reduced motion nothing drifts, slides or ripples.
const GLASS_SEL = '.card, .kpi, .qa, .tile, .tablewrap, .board, .fbar, .buildbar, .kpicard, .ctile, .chks, .atile, .rcard, .rgroup, .slot, .shsec, .lockcard, .dhero, .flowstep, .wfmhead, .view > .viewhead';
const glassFine = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };

// ---------------------------------------------------------------- less transparency
const glassMq = (() => { try { return matchMedia('(prefers-reduced-transparency: reduce)'); } catch (e) { return { matches: false }; } })();
/** 'solid' or 'glass' as chosen here, else what the computer asks for */
function glassNow() { const t = lsGet('mc-glass'); return t === 'solid' || t === 'glass' ? t : (glassMq.matches ? 'solid' : 'glass'); }
function applyGlass() {
  const solid = glassNow() === 'solid';
  if (solid) document.documentElement.setAttribute('data-glass', 'solid'); else document.documentElement.removeAttribute('data-glass');
  document.querySelectorAll('[data-glassless]').forEach(b => { b.setAttribute('aria-checked', String(solid)); b.setAttribute('aria-pressed', String(solid)); });
}
function setGlass(solid) { lsSet('mc-glass', solid ? 'solid' : 'glass'); applyGlass(); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-glassless]'); if (b) { e.preventDefault(); setGlass(glassNow() !== 'solid'); } });
try { glassMq.addEventListener('change', applyGlass); } catch (e) { /* older browsers */ }

// ---------------------------------------------------------------- the bar: room for the buttons, tight or compact when the pages do not fit, the pill
function glassBar() {
  const side = $('sidebar'), seg = $('wsSeg'), tools = document.querySelector('.appbar .tools'); if (!side || !seg) return;
  if (mqPhone.matches) { side.classList.remove('tight', 'compact'); return; }
  if (tools) document.documentElement.style.setProperty('--tools-w', Math.ceil(tools.getBoundingClientRect().width) + 'px');
  side.classList.remove('tight', 'compact');   // the pages with their names; then Search as an icon; then the pages as icons
  if (seg.scrollWidth > seg.clientWidth + 1) side.classList.add('tight');
  if (seg.scrollWidth > seg.clientWidth + 1) { side.classList.remove('tight'); side.classList.add('compact'); }
  let ind = seg.querySelector(':scope > .navind');
  if (!ind) { ind = document.createElement('span'); ind.className = 'navind still'; ind.setAttribute('aria-hidden', 'true'); seg.prepend(ind); }
  const cur = seg.querySelector('button[aria-current="page"]:not([hidden])');
  if (!cur) { ind.style.opacity = '0'; return; }
  const first = ind.style.opacity !== '1';
  if (first || RM()) ind.classList.add('still');
  ind.style.opacity = '1'; ind.style.width = cur.offsetWidth + 'px'; ind.style.transform = `translateX(${cur.offsetLeft}px)`;
  if (first && !RM()) requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.remove('still')));
  if (cur.offsetLeft < seg.scrollLeft || cur.offsetLeft + cur.offsetWidth > seg.scrollLeft + seg.clientWidth) seg.scrollLeft = Math.max(0, cur.offsetLeft - 24);
}
let glassBarT = 0;
const glassBarSoon = () => { cancelAnimationFrame(glassBarT); glassBarT = requestAnimationFrame(glassBar); };
document.documentElement.classList.add('navjs');
try { const ro = new ResizeObserver(glassBarSoon); [document.querySelector('.appbar .tools'), $('sidebar')].forEach(el => el && ro.observe(el)); } catch (e) { window.addEventListener('resize', glassBarSoon); }
try { document.fonts.ready.then(glassBarSoon); } catch (e) { /* none */ }
// the bar follows the navigation: after every change of page, role or month
const syncNavGlass0 = syncNav;
syncNav = function () { syncNavGlass0(); glassBar(); glassBarSoon(); };
// a tab of the WFM team page nudges the spheres (its place among the role's tabs)
const renderWfmHeadGlass0 = renderWfmHead;
renderWfmHead = function () {
  renderWfmHeadGlass0();
  try { const on = state.ws === 'wfm' || state.ws === 'build', i = on ? Math.max(0, wfmTabsFor().findIndex(x => x[0] === wfmTabNow())) : 0; document.body.style.setProperty('--ti', String(i % 6)); } catch (e) { /* the page has not started */ }
};

// ---------------------------------------------------------------- the pointer: light on the panel under it, the spheres drift with it, a ripple on a click
(() => {
  let raf = 0, ev = null, lit = null;
  const orbs = $('orbs');
  const step = () => {
    raf = 0; if (!ev) return;
    if (orbs && glassNow() !== 'solid') { orbs.style.setProperty('--px', (ev.clientX / innerWidth - 0.5).toFixed(3)); orbs.style.setProperty('--py', (ev.clientY / innerHeight - 0.5).toFixed(3)); }
    const g = ev.target && ev.target.closest ? ev.target.closest(GLASS_SEL) : null;
    if (lit && lit !== g) { lit.style.removeProperty('--mx'); lit.style.removeProperty('--my'); }
    lit = g;
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', Math.round(ev.clientX - r.left) + 'px'); g.style.setProperty('--my', Math.round(ev.clientY - r.top) + 'px'); }
  };
  window.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || RM() || !glassFine()) return; ev = e; if (!raf) raf = requestAnimationFrame(step); }, { passive: true });
  document.addEventListener('pointerleave', () => { if (lit) { lit.style.removeProperty('--mx'); lit.style.removeProperty('--my'); lit = null; } });
  // a ripple where the button was pressed (not the bell: its count sits outside it)
  document.addEventListener('pointerdown', e => {
    if (RM() || e.button > 0) return;
    const el = e.target.closest && e.target.closest('.btn:not(.bell):not(.linkbtn):not(.acctbtn), .sbnav button, .tabbar button, .qa, .dhcta, .dhtab');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'ripple'; s.setAttribute('aria-hidden', 'true'); s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    el.classList.add('rip'); el.appendChild(s); setTimeout(() => s.remove(), 700);
  }, { passive: true });
})();

applyGlass(); glassBarSoon();
