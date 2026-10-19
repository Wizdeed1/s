// ================================================================ MOTION: the few things that move (Apple HIG, motion.md)
// Built in from vendor/ (no network). GSAP moves what follows a finger or plays once: a drawer or the More sheet swiped away on a
// phone, from where the finger let go and at its speed; the dashboard's numbers counting up on the first visit; a progress bar that
// grows to its new value. Scrolling is the browser's own (motion on something done many times a day is left out), and with reduced
// motion none of this runs at all.
const MOT = { drag: null };
const gsapOk = () => (window.gsap && !RM() ? window.gsap : null);

// ---- the toolbar's edge and title appear once the page has moved under it (the large title scrolls into the toolbar)
let scrolledOn = null;
const scrolledSync = () => { const on = window.scrollY > 4; if (on !== scrolledOn) { scrolledOn = on; document.body.classList.toggle('scrolled', on); } };
window.addEventListener('scroll', scrolledSync, { passive: true }); scrolledSync();

// ---- swipe a drawer (to the right) or the More sheet (down) away on a phone, as far and as fast as the finger went
const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
/** where a flick of v px/s comes to rest, as a scroll slows down (Apple's projection, deceleration 0.998) */
const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
function swipeStart(e, el, axis) {
  if (e.pointerType === 'mouse' || MOT.drag || !e.isPrimary) return;
  const t = e.target;
  if (t.closest('input, textarea, select, button, a, [contenteditable="true"], .seg, iframe, .rbprev')) return;
  if (axis === 'y' && el.scrollTop > 0) return;   // the sheet scrolls first; only from its top does a pull close it
  for (let n = t; n && n !== el; n = n.parentElement) {   // something that scrolls sideways keeps the gesture
    if (axis === 'x' && n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return;
    if (axis === 'y' && n.scrollHeight > n.clientHeight + 2 && n.scrollTop > 0 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return;
  }
  MOT.drag = { el, axis, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, hist: [{ v: 0, t: e.timeStamp }], size: axis === 'x' ? el.offsetWidth + 16 : el.offsetHeight };   // a panel floats 8 px from the edge: it leaves all the way
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
  const a = D.hist[0], b = D.hist[D.hist.length - 1], pos = b.v;
  const v = e.timeStamp - b.t > 90 ? 0 : (b.v - a.v) / Math.max(1, b.t - a.t) * 1000;   // px per s at the release; a finger that stopped first has none
  // closes when the panel would come to rest past its middle: a slow pull past half, or a flick from anywhere
  const close = pos > 8 && pos + project(v) > D.size / 2, g = window.gsap, s = $('scrim'), prop = D.axis === 'x' ? 'x' : 'y';
  const done = () => { D.el.style.transform = ''; D.el.style.animation = ''; D.el.style.transition = ''; if (s) s.style.opacity = ''; };
  // the panel leaves at the finger's own speed: an ease-out starts at (slope × distance ÷ duration), power2 has slope 2, power3 slope 3
  if (close) {
    const fin = () => { D.el.dataset.swiped = '1'; if (D.el.id === 'moreSheet') moreClose(); else closeDrawer(); };
    if (g) g.fromTo(D.el, { [prop]: pos }, { [prop]: D.size, duration: v > 0 ? clamp(2 * (D.size - pos) / v, 0.14, 0.32) : 0.26, ease: 'power2.out', onComplete: fin, overwrite: true });
    else fin();
    if (s && g) g.to(s, { opacity: 0, duration: 0.18, ease: 'power2.out', overwrite: true });
  } else if (g) {
    g.fromTo(D.el, { [prop]: pos }, { [prop]: 0, duration: v < 0 && pos > 0 ? clamp(3 * pos / -v, 0.2, 0.42) : 0.3, ease: 'power3.out', overwrite: true, onComplete: () => { g.set(D.el, { clearProps: 'transform' }); done(); } });
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
try { const db = $('dashBody'); if (db) new MutationObserver(() => { if (db.classList.contains('intro') && !db.dataset.counted) { db.dataset.counted = '1'; countUp(db); fillBars(db.querySelector('.dclose-mini'), 'dash'); } else if (!db.classList.contains('intro')) delete db.dataset.counted; }).observe(db, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* none */ }

// ---- progress that moves only when it changes: the Supervisors card's bars (each month) and the dashboard's month close grow
// from where they were last shown (from empty the first time) to where they stand now; a redraw with the same numbers stays still.
// The bar is drawn at its real width and GSAP only plays the way there, so with reduced motion (or no GSAP) it is simply there.
// Transform (scaleX from the old share of the new width), never width.
const barsAt = new Map();   // the width each bar was last shown at, by month and supervisor
function fillBars(root, key) {
  if (!root || !root.getClientRects().length) return;
  const g = gsapOk(), L = [...root.querySelectorAll('.pbar i')].map((i, j) => { const li = i.closest('li'), b = li && li.querySelector('[data-spv]'); return { i, id: `${key}:${b ? b.dataset.spv : j}`, now: parseFloat(i.style.width) || 0 }; });
  const moves = L.filter(x => x.now > 0 && (barsAt.get(x.id) || 0) !== x.now).map(x => ({ ...x, was: barsAt.get(x.id) || 0 }));
  L.forEach(x => barsAt.set(x.id, x.now));
  if (g) moves.forEach((x, n) => g.fromTo(x.i, { scaleX: x.was / x.now }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.7, delay: n * 0.03, ease: 'power3.out', clearProps: 'transform' }));
}
try { const cb = $('cycleBody'); if (cb) new MutationObserver(() => { const c = $('spvDone'); if (c) fillBars(c, 'spv:' + wsMonthNow()); }).observe(cb, { childList: true }); } catch (e) { /* none */ }
