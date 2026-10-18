// ================================================================ MOTION: a page that glides, and the few things that move
// Built in from vendor/ (no network): Lenis makes the mouse wheel glide on the page (touch keeps the phone's own scrolling;
// tables, drawers, menus and lists keep theirs). GSAP moves what follows a finger or plays once: a drawer or the More sheet
// swiped away on a phone, from where the finger let go; the dashboard's numbers counting up on the first visit. Everyday work
// stays still: nothing here runs on a keyboard action, and with reduced motion none of it runs at all.
const MOT = { lenis: null, drag: null };
const gsapOk = () => (window.gsap && !RM() ? window.gsap : null);

// ---- smooth wheel scrolling (a fine pointer only; stopped while a drawer, dialog, menu sheet or the lock is open)
const LENIS_SKIP = '.tablewrap, .drawer, .dlg, .menu, .find, .sheet-more, textarea, select, iframe, [data-lenis-prevent], .steps, .wftabs, .tabs, .rbpanel, .previewWrap, .secnav';
function lenisSync() {
  let fine = false; try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { fine = false; }
  const want = !!window.Lenis && !RM() && fine;
  if (want && !MOT.lenis) {
    try {
      MOT.lenis = new window.Lenis({ lerp: 0.16, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, prevent: n => !!(n && n.closest && n.closest(LENIS_SKIP)) });
      const tick = t => { if (!MOT.lenis) return; MOT.lenis.raf(t); requestAnimationFrame(tick); };
      requestAnimationFrame(tick); overlaySync();
    } catch (e) { MOT.lenis = null; }
  } else if (!want && MOT.lenis) { try { MOT.lenis.destroy(); } catch (e) { /* none */ } MOT.lenis = null; }
}
/** anything laid over the page stops the glide underneath it */
function overlaySync() {
  if (!MOT.lenis) return;
  const over = ['scrim', 'lock', 'moreSheet'].some(id => { const el = $(id); return el && !el.hidden; }) || !!document.querySelector('.dlg:not([hidden]), .find:not([hidden])');
  try { if (over) MOT.lenis.stop(); else MOT.lenis.start(); } catch (e) { /* none */ }
}
try { const mo = new MutationObserver(() => overlaySync()); ['scrim', 'lock', 'moreSheet', 'dBuild', 'dFinal', 'find'].forEach(id => { const el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] }); }); } catch (e) { /* none */ }
try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', lenisSync); } catch (e) { /* older browsers: decided at start */ }
lenisSync();

// ---- the header's edge appears only once the page has moved under it (no fixed line)
let scrolledOn = null;
const scrolledSync = () => { const on = window.scrollY > 4; if (on !== scrolledOn) { scrolledOn = on; document.body.classList.toggle('scrolled', on); } };
window.addEventListener('scroll', scrolledSync, { passive: true }); scrolledSync();

// ---- swipe a drawer (to the right) or the More sheet (down) away on a phone, as far and as fast as the finger went
const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
function swipeStart(e, el, axis) {
  if (e.pointerType === 'mouse' || MOT.drag || !e.isPrimary) return;
  const t = e.target;
  if (t.closest('input, textarea, select, button, a, [contenteditable="true"], .seg, iframe, .rbprev')) return;
  if (axis === 'y' && el.scrollTop > 0) return;   // the sheet scrolls first; only from its top does a pull close it
  for (let n = t; n && n !== el; n = n.parentElement) {   // something that scrolls sideways keeps the gesture
    if (axis === 'x' && n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return;
    if (axis === 'y' && n.scrollHeight > n.clientHeight + 2 && n.scrollTop > 0 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return;
  }
  MOT.drag = { el, axis, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, hist: [{ v: 0, t: e.timeStamp }], size: axis === 'x' ? el.offsetWidth : el.offsetHeight };
}
function swipeMove(e) {
  const D = MOT.drag; if (!D || e.pointerId !== D.id) return;
  const dx = e.clientX - D.x0, dy = e.clientY - D.y0, main = D.axis === 'x' ? dx : dy, cross = D.axis === 'x' ? dy : dx;
  if (!D.on) {
    if (Math.abs(main) < 10 && Math.abs(cross) < 10) return;
    if (Math.abs(main) < Math.abs(cross) * 1.2) { MOT.drag = null; return; }   // the other direction: a scroll, not a swipe
    D.on = true; try { D.el.setPointerCapture(e.pointerId); } catch (x) { /* none */ }
    D.el.style.animation = 'none'; D.el.style.transition = 'none';
  }
  const v = main > 0 ? main : -rubber(-main, D.size);   // the wrong way: resistance, never a hard stop
  D.el.style.transform = D.axis === 'x' ? `translateX(${v}px)` : `translateY(${v}px)`;
  const s = $('scrim'); if (s && !s.hidden) s.style.opacity = String(Math.max(0, 1 - Math.max(0, v) / D.size));
  D.hist.push({ v, t: e.timeStamp }); if (D.hist.length > 6) D.hist.shift();
  e.preventDefault();
}
function swipeEnd(e) {
  const D = MOT.drag; if (!D || e.pointerId !== D.id) return; MOT.drag = null;
  if (!D.on) return;
  const a = D.hist[0], b = D.hist[D.hist.length - 1], vel = (b.v - a.v) / Math.max(1, b.t - a.t), pos = b.v;   // px per ms
  const close = pos > D.size * 0.3 || (vel > 0.11 && pos > 8), g = window.gsap, s = $('scrim'), prop = D.axis === 'x' ? 'x' : 'y';
  const done = () => { D.el.style.transform = ''; D.el.style.animation = ''; D.el.style.transition = ''; if (s) s.style.opacity = ''; };
  if (close) {
    const fin = () => { D.el.dataset.swiped = '1'; if (D.el.id === 'moreSheet') moreClose(); else closeDrawer(); };
    if (g) g.fromTo(D.el, { [prop]: pos }, { [prop]: D.size, duration: Math.min(0.24, Math.max(0.12, (D.size - pos) / Math.max(1.2, vel * 1000) )), ease: 'power2.out', onComplete: fin, overwrite: true });
    else fin();
    if (s && g) g.to(s, { opacity: 0, duration: 0.18, ease: 'power2.out', overwrite: true });
  } else if (g) {
    g.fromTo(D.el, { [prop]: pos }, { [prop]: 0, duration: 0.28, ease: 'power3.out', overwrite: true, onComplete: () => { g.set(D.el, { clearProps: 'transform' }); done(); } });
    if (s) g.to(s, { opacity: 1, duration: 0.2, overwrite: true, onComplete: () => { s.style.opacity = ''; } });
  } else done();
}
document.querySelectorAll('.drawer').forEach(el => {
  el.addEventListener('pointerdown', e => swipeStart(e, el, 'x'));
  el.addEventListener('pointermove', swipeMove, { passive: false });
  el.addEventListener('pointerup', swipeEnd); el.addEventListener('pointercancel', swipeEnd);
});
{ const ms = $('moreSheet'); if (ms) { ms.addEventListener('pointerdown', e => swipeStart(e, ms, 'y')); ms.addEventListener('pointermove', swipeMove, { passive: false }); ms.addEventListener('pointerup', swipeEnd); ms.addEventListener('pointercancel', swipeEnd); } }
// the More sheet pulls down to close when it has nothing to scroll; with more than fits, it scrolls and closes from its top
try { const ms = $('moreSheet'); if (ms) new MutationObserver(() => { if (!ms.hidden) requestAnimationFrame(() => { ms.style.touchAction = ms.scrollHeight > ms.clientHeight + 2 ? 'pan-y' : 'none'; }); }).observe(ms, { attributes: true, attributeFilter: ['hidden'] }); } catch (e) { /* none */ }
// a swiped-away panel leaves no trace for the next time it opens
try {
  const clean = new MutationObserver(L => L.forEach(m => { const el = m.target; if (el.hidden && el.dataset.swiped) { delete el.dataset.swiped; if (window.gsap) window.gsap.set(el, { clearProps: 'transform' }); el.style.transform = ''; el.style.animation = ''; el.style.transition = ''; const s = $('scrim'); if (s) s.style.opacity = ''; } }));
  document.querySelectorAll('.drawer, #moreSheet').forEach(el => clean.observe(el, { attributes: true, attributeFilter: ['hidden'] }));
} catch (e) { /* none */ }

// ---- the dashboard's moment: its six numbers count up once a visit (the first load only; never on a return or a redraw)
const countParts = s => { const m = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(String(s).trim()); if (!m) return null; const dec = (m[2].split('.')[1] || '').length; return { pre: m[1], n: +m[2].replace(/,/g, ''), dec, post: m[3], comma: m[2].includes(',') || +m[2].replace(/,/g, '') >= 1000 }; };
const countFmt = (p, v) => p.pre + (p.comma ? v.toLocaleString('en-US', { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec }) : v.toFixed(p.dec)) + p.post;
function countUp(root) {
  const g = gsapOk(); if (!g || !root) return;
  root.querySelectorAll('.kpi .kval').forEach((el, i) => {
    const txt = el.textContent, mm = /^(\d+):(\d{2})$/.exec(txt.trim());
    if (mm) { const tot = +mm[1] * 60 + +mm[2], o = { v: 0 }; g.to(o, { v: tot, duration: 0.9, delay: i * 0.04, ease: 'power3.out', onUpdate: () => { const s = Math.round(o.v); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, onComplete: () => { el.textContent = txt; } }); return; }
    const p = countParts(txt); if (!p || !Number.isFinite(p.n) || p.n === 0) return;
    const o = { v: 0 }; el.textContent = countFmt(p, 0);
    g.to(o, { v: p.n, duration: 0.9, delay: i * 0.04, ease: 'power3.out', onUpdate: () => { el.textContent = countFmt(p, o.v); }, onComplete: () => { el.textContent = txt; } });
  });
}
try { const db = $('dashBody'); if (db) new MutationObserver(() => { if (db.classList.contains('intro') && !db.dataset.counted) { db.dataset.counted = '1'; countUp(db); } else if (!db.classList.contains('intro')) delete db.dataset.counted; }).observe(db, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* none */ }

// ---- a soft light that follows the pointer on the dashboard's cards (a fine pointer only; decoration, nothing more)
let spotEl = null, spotRaf = 0, spotXY = [0, 0];
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || RM()) return;
  const el = e.target.closest && e.target.closest('#dashBody .kpi, #dashBody .qa, .spot'); if (spotEl && spotEl !== el) { spotEl.classList.remove('lit'); spotEl = null; }
  if (!el) return; spotEl = el; spotXY = [e.clientX, e.clientY];
  if (!spotRaf) spotRaf = requestAnimationFrame(() => { spotRaf = 0; if (!spotEl) return; const r = spotEl.getBoundingClientRect(); spotEl.style.setProperty('--mx', `${spotXY[0] - r.left}px`); spotEl.style.setProperty('--my', `${spotXY[1] - r.top}px`); spotEl.classList.add('lit'); });
}, { passive: true });
document.addEventListener('pointerleave', () => { if (spotEl) { spotEl.classList.remove('lit'); spotEl = null; } });
