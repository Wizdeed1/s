// The stand-alone Showcase (tools/showcase/make_showcase.cjs): the bonus story of js/showstory.js on its own page, with made-up numbers
// only. No data, no account, no network: it counts its made-up champion with the tool's own engine (Kpi), as the month's default rules
// do. Present turns it into slides (full screen, one section at a time, the arrow keys, N for the speaker notes, Esc to stop); S a
// spotlight that follows the pointer, Z a zoom where it points; Light or Dark is kept with the tool's own choice (mc-theme).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  // the month's default rules, as the tool starts them (js/kpi.js DEFAULTS, js/rules.js ELIG0, js/extras.js BASES0 for Virgin)
  const D = Kpi.DEFAULTS(), H = typeof Hairline !== 'undefined' ? Hairline : null;
  const env = { esc, card: D.teams.CC, cfg: Kpi.normCount(null), elig: { minFinal: 0.8, minDays: 5, minMonths: 6 }, base: 1000, cards: Object.keys(D.teams).length, people: null,
    strip: ['A made-up example', 'Counted by the tool itself', 'Works offline'], month: 'September 2026',
    fig: (name, label) => `<div class="shfig" data-fig="${esc(name)}" data-label="${esc(label)}" aria-hidden="false"></div>` };
  const root = $('showBody'), S = ShowStory.sections(env);
  root.innerHTML = `${S.map((s, i) => `<section class="shsec sh-${s.id}" data-shsec="${i}" aria-label="${esc(s.name)}">${s.html}<aside class="shnotes" aria-label="Speaker notes"><b>Speaker notes</b><p>${esc(s.notes)}</p></aside></section>`).join('')}
    <p class="shfoot">Cadence · Member Care. Every name and number on this page is made up; the bonus is counted by the tool's own engine.</p><div class="shctl" id="showCtl" hidden></div>`;
  ShowStory.bind(root, env); ShowStory.paint(root, env);
  // ---- the line figures, drawn as they come into view; each section's numbers count up as it arrives
  const figs = new Map();
  const mountFig = box => { if (!H || box.dataset.on) return; const f = H[box.dataset.fig]; if (typeof f !== 'function') return; try { figs.set(box, f(box, { play: true, intensity: 0.55, label: box.dataset.label || undefined })); box.dataset.on = '1'; } catch (e) { /* its place stays empty */ } };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(L => L.forEach(x => { if (!x.isIntersecting) return; if (x.target.classList.contains('shsec')) { x.target.classList.add('in'); ShowStory.arrive(x.target); } else mountFig(x.target); }), { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;
  root.querySelectorAll('.shsec, .shfig').forEach(n => { if (io) io.observe(n); else { n.classList.add('in'); if (n.classList.contains('shfig')) mountFig(n); else ShowStory.arrive(n); } });
  // ---- Light or Dark (kept as the tool keeps it)
  const themeBtn = $('shTheme');
  const themeSync = () => { const dark = document.documentElement.getAttribute('data-theme') === 'dark'; themeBtn.setAttribute('aria-pressed', String(dark)); themeBtn.querySelector('.t').textContent = dark ? 'Light' : 'Dark'; themeBtn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon'); themeBtn.setAttribute('aria-label', dark ? 'Light' : 'Dark'); };
  themeBtn.addEventListener('click', () => { const dark = document.documentElement.getAttribute('data-theme') !== 'dark'; document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); try { localStorage.setItem('mc-theme', dark ? 'dark' : 'light'); } catch (e) { /* this browser only */ } themeSync(); });
  themeSync();
  // ---- Present: full screen, one section at a time
  let on = false, at = 0, notes = false;
  const secs = () => [...root.querySelectorAll('.shsec')];
  function ctl() {
    const c = $('showCtl'); c.hidden = !on; document.body.classList.toggle('shownotes', on && notes);
    if (!on) { c.innerHTML = ''; return; }
    const n = S.length;
    c.innerHTML = `<button class="btn sm ghost" data-shprev aria-label="Previous"${at ? '' : ' disabled'}><svg aria-hidden="true"><use href="#i-chevl"/></svg></button>
      <span class="shpos"><b>${at + 1}</b> / ${n} · ${esc(S[at].name)}</span><span class="shdots" aria-hidden="true">${S.map((s, j) => `<i class="${j === at ? 'on' : ''}"></i>`).join('')}</span>
      <button class="btn sm ghost" data-shnext aria-label="Next"${at < n - 1 ? '' : ' disabled'}><svg aria-hidden="true"><use href="#i-chevr"/></svg></button>
      <button class="btn sm ghost" data-shnotes aria-pressed="${notes}">Notes</button><button class="btn sm" data-shexit>Exit</button>`;
  }
  function go(i, instant) {
    const L = secs(); if (!L.length) return;
    at = Math.max(0, Math.min(L.length - 1, i)); const cur = L[at];
    if (!on) { cur.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); return; }
    L.forEach(s => s.classList.toggle('cur', s === cur)); cur.classList.add('in'); ShowStory.arrive(cur); cur.querySelectorAll('.shfig').forEach(mountFig); ctl();
    if (!instant && !RM() && typeof gsap !== 'undefined') { try { gsap.fromTo(cur.querySelectorAll('.shrise'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', clearProps: 'transform,opacity' }); } catch (e) { /* still there */ } }
  }
  function present(v) {
    on = !!v; document.body.classList.toggle('presenting', on);
    if (on) { try { const r = document.documentElement.requestFullscreen && !document.fullscreenElement ? document.documentElement.requestFullscreen() : null; if (r && r.catch) r.catch(() => {}); } catch (e) { /* the window then */ } go(at, true); }
    else { if (document.fullscreenElement && document.exitFullscreen) { try { const r = document.exitFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* none */ } } secs().forEach(s => s.classList.remove('cur')); }
    ctl();
  }
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-showpresent]')) { at = 0; present(true); return; }
    const g = t.closest('[data-showgo]'); if (g) { const i = S.findIndex(s => s.id === g.dataset.showgo); if (i >= 0) go(i); return; }
    if (t.closest('[data-shnext]')) { go(at + 1); return; }
    if (t.closest('[data-shprev]')) { go(at - 1); return; }
    if (t.closest('[data-shnotes]')) { notes = !notes; ctl(); return; }
    if (t.closest('[data-shexit]')) present(false);
  });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable]')) return;
    const k = e.key;
    if (on) {
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); go(at + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); go(at - 1); }
      else if (k === 'Home') { e.preventDefault(); go(0); }
      else if (k === 'End') { e.preventDefault(); go(S.length - 1); }
      else if (k === 'n' || k === 'N') { notes = !notes; ctl(); }
      else if (k === 'Escape' && !spot && !zoom) { e.preventDefault(); present(false); }
    }
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && on) present(false); });
  // ---- the presenter's keys: S a spotlight that follows the pointer, Z a zoom where it points, + and - for its size, Esc off
  let spot = null, spotR = 170, zoom = 0, base0 = { x: 0, y: 0 }, ptr = { x: innerWidth / 2, y: innerHeight / 2 }, raf = 0;
  const spotDraw = () => { if (!spot) return; spot.style.setProperty('--sx', ptr.x + 'px'); spot.style.setProperty('--sy', ptr.y + 'px'); spot.style.setProperty('--sr', spotR + 'px'); };
  const spotSet = v => { if (v && !spot) { if (zoom) zoomSet(0); spot = document.createElement('div'); spot.className = 'mcspot'; spot.setAttribute('aria-hidden', 'true'); document.documentElement.appendChild(spot); spotDraw(); } else if (!v && spot) { spot.remove(); spot = null; } };
  const zoomAt = () => { if (zoom) document.body.style.transformOrigin = `${ptr.x - base0.x}px ${ptr.y - base0.y}px`; };
  function zoomSet(z) { const b = document.body; if (z && !zoom) { if (spot) spotSet(false); const r = b.getBoundingClientRect(); base0 = { x: r.left, y: r.top }; } zoom = z || 0; document.documentElement.classList.toggle('mczoom', !!zoom); b.style.transform = zoom ? `scale(${zoom})` : ''; if (zoom) zoomAt(); else b.style.transformOrigin = ''; }
  window.addEventListener('pointermove', e => { ptr = { x: e.clientX, y: e.clientY }; if ((spot || zoom) && !raf) raf = requestAnimationFrame(() => { raf = 0; spotDraw(); zoomAt(); }); }, { passive: true });
  window.addEventListener('resize', () => { if (zoom) zoomSet(0); });
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && t.closest && t.closest('input, select, textarea, [contenteditable]')) return;
    const k = e.key, active = !!(spot || zoom);
    if (k === 's' || k === 'S') { e.preventDefault(); spotSet(!spot); }
    else if (k === 'z' || k === 'Z') { e.preventDefault(); zoomSet(zoom ? 0 : 1.8); }
    else if (active && (k === '+' || k === '=')) { e.preventDefault(); if (spot) { spotR = Math.min(420, spotR + 30); spotDraw(); } else zoomSet(Math.min(3, Math.round((zoom + 0.3) * 10) / 10)); }
    else if (active && (k === '-' || k === '_')) { e.preventDefault(); if (spot) { spotR = Math.max(80, spotR - 30); spotDraw(); } else zoomSet(Math.max(1.2, Math.round((zoom - 0.3) * 10) / 10)); }
    else if (active && k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); spotSet(false); zoomSet(0); }
  }, true);
  window.__showcase = { env, sections: S, present, go, at: () => at, on: () => on };   // for the tests
})();
