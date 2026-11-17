// ================================================================ SHOWCASE: the tool tells its own story, for a meeting (admin only)
// One page the admin opens in front of the management team, told around the core idea: Cadence counts every bonus. The story is
// js/showstory.js (also the stand-alone Showcase file): a made-up champion counted by the tool's own engine, the five steps, Try it,
// the checks, the bonus explained (English or Arabic), every role's part (each with View, which opens that role's interface live
// through viewas.js), this month's bonus from the shared data (totals only, never a name), the time back, trust and what comes
// next. Never the WFM team's own daily or weekly reports, never how files go in or out. Present turns it into slides: full screen,
// one section at a time, the arrow keys, speaker notes on N. The line figures are hairline's (vendor/hairline.js), drawn only while
// the page is open. For the admin, anywhere in the tool: S a spotlight that follows the pointer, Z a zoom where it points, Esc off.
const showFig = () => (typeof Hairline !== 'undefined' ? Hairline : null);
Object.assign(state, { showAt: 0, showNotes: false });
let showOn = false, showIo = null, SHOW_SECTIONS = [], showEnvNow = null;
const showFigs = new Map();
const shFig = (name, label) => `<div class="shfig" data-fig="${name}" data-label="${esc(label)}" aria-hidden="false"></div>`;
/** this month's bonus from the shared data: who was scored, who earns it, the average final and the bonuses. Totals only, never a name */
function showLiveHtml() {
  const months = wsMonths(), k = wsMonthNow();
  if (!k || !months.length) return '<div class="card empty shrise"><b>No months yet</b>Build a month on WFM team › Import and its bonus appears here.</div>';
  let rows = []; try { rows = liveRows(k).filter(r => r && r.kc); } catch (e) { rows = []; }
  const earn = rows.filter(r => +r.earned > 0), fins = rows.map(r => r.fin).filter(v => typeof v === 'number' && Number.isFinite(v));
  const sum = earn.reduce((a, r) => a + (+r.earned || 0), 0), avg = fins.length ? fins.reduce((a, v) => a + v, 0) / fins.length : null;
  const tiles = [[rows.length, 'people scored'], [earn.length, 'earn a bonus'], [avg == null ? '–' : `${Math.round(avg * 1000) / 10}%`, 'average final'], [sum, 'riyals in bonuses']];
  return `<div class="shmonth shrise">${esc(ymLabel(k))}<span class="pill ${monthLocked(k) ? '' : 'info'}">${monthLocked(k) ? 'Final' : 'Draft'}</span></div>
    <div class="shcounts shbonus shrise">${tiles.map(([n, l], i) => `<div${i === 3 ? ' class="hot"' : ''}><b>${esc(typeof n === 'number' ? n.toLocaleString('en-US') : n)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
}
/** the hero's strip: the month shown, the people, the months kept */
function showStripItems() {
  const k = wsMonthNow();
  return [k ? ymLabel(k) : '', `${rosterRows().length} people`, `${plural(wsMonths().length, 'month')} of history`, 'works offline'].filter(Boolean);
}
const showStripHtml = () => showStripItems().map(x => `<li>${esc(x)}</li>`).join('');
/** View for a role: that role's page, live (a supervisor or an agent chosen first) */
function showRoleAct(r) { const R = VIEW_ROLES.find(x => x[0] === r), kind = R && R[3]; return `<div class="shract">${kind ? `<span class="shpick" data-kind="${kind}">${viewPickHtml(kind)}</span>` : ''}<button class="btn sm primary" data-vago="${r}">View</button></div>`; }
/** what the story needs from the tool: the month's rules (the champion's scorecard, how it is counted, who earns it, the brand's base),
    today's figures and View for every role (js/showstory.js) */
function showEnv() {
  const k = wsMonthNow() || monthKey(), R = rulesFor(k), C = R.cards && R.cards.teams ? R.cards : Kpi.DEFAULTS(), card = (C.teams && C.teams.CC) || Kpi.DEFAULTS().teams.CC;
  let base = 1000; try { const B = basesNow(k); base = B.Virgin != null ? +B.Virgin : +(C.base || 1000); } catch (e) { base = +(C.base || 1000); }
  const y = +k.slice(0, 4), m = +k.slice(5);
  return { esc, card, cfg: R.count, elig: R.elig, base, cards: Object.keys(C.teams || {}).length, people: rosterRows().length, strip: showStripItems(),
    month: m ? `${MONTH_LONG[m - 1]} ${y}` : 'This month', live: showLiveHtml, roleAct: showRoleAct, fig: shFig };
}
function showHtml() {
  const env = showEnvNow = showEnv(), S = ShowStory.sections(env); SHOW_SECTIONS = S;
  const sec = (s, i) => `<section class="shsec sh-${s.id}" data-shsec="${i}" aria-label="${esc(s.name)}">${s.html}<aside class="shnotes" aria-label="Speaker notes"><b>Speaker notes</b><p>${esc(s.notes)}</p></aside></section>`;
  return `<div class="shtop"><div><div class="eyebrow">Admin</div><h1 id="h-show">Showcase</h1><p>How Cadence counts every bonus, told for a meeting: present it full screen, try a bonus with the room, and open any role's page live from it. Anywhere in the tool: <kbd>S</kbd> spotlight, <kbd>Z</kbd> zoom, <kbd>Esc</kbd> off.</p></div>
      <div class="wsacts"><button class="btn primary" data-showpresent><svg aria-hidden="true"><use href="#i-present"/></svg>Present</button></div></div>
    ${S.map(sec).join('')}
    <div class="shctl" id="showCtl" hidden></div>`;
}
/** the figures: drawn as they come into view, all taken down when the page closes */
function mountFig(box) {
  const H = showFig(); if (!H || box.dataset.on) return;
  const f = H[box.dataset.fig]; if (typeof f !== 'function') return;
  try { const inst = f(box, { play: true, intensity: 0.55, label: box.dataset.label || undefined }); box.dataset.on = '1'; showFigs.set(box, inst); } catch (e) { /* a figure that cannot draw: its place stays empty */ }
}
function stopShowFigs() {
  for (const [box, f] of showFigs) { try { if (f && f.destroy) f.destroy(); } catch (e) { /* none */ } delete box.dataset.on; }
  showFigs.clear(); if (showIo) { showIo.disconnect(); showIo = null; }
}
function renderShow() {
  const el = $('showBody'); if (!el) return;
  if (el.querySelector('.shsec')) {   // already told: the shared data changed, so only the live parts are drawn again (the figures and the slide stay)
    const L = $('showLive'), S = $('showStrip'); if (L) L.innerHTML = showLiveHtml(); if (S) S.innerHTML = showStripHtml();
    el.querySelectorAll('.shpick[data-kind]').forEach(x => { if (!x.contains(document.activeElement)) x.innerHTML = viewPickHtml(x.dataset.kind); });
    if (showOn) showGo(state.showAt, true);
    return;
  }
  stopShowFigs();
  el.innerHTML = showHtml();
  ShowStory.bind(el, showEnvNow); ShowStory.paint(el, showEnvNow);   // Try it, the receipt's language, the time back
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(L => L.forEach(x => {
    if (!x.isIntersecting) return;
    if (x.target.classList.contains('shsec')) { x.target.classList.add('in'); ShowStory.arrive(x.target); } else mountFig(x.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;
  showIo = io;
  el.querySelectorAll('.shsec, .shfig').forEach(n => { if (io) io.observe(n); else { n.classList.add('in'); if (n.classList.contains('shfig')) mountFig(n); else ShowStory.arrive(n); } });
  if (showOn) showGo(state.showAt, true);
}
/** leaving the page: the figures are taken down and the presentation ends */
function leaveShow() { if (showOn) showPresent(false); stopShowFigs(); const el = $('showBody'); if (el && el.firstChild) { el.innerHTML = ''; delete el.dataset.storyBound; } }   // told afresh on the next visit
function showPresent(on) {
  showOn = !!on; document.body.classList.toggle('presenting', showOn);
  const root = document.documentElement;
  if (showOn) {
    try { const r = root.requestFullscreen && !document.fullscreenElement ? root.requestFullscreen() : null; if (r && r.catch) r.catch(() => {}); } catch (e) { /* the window then */ }
    showGo(state.showAt || 0, true);
  } else {
    if (document.fullscreenElement && document.exitFullscreen) { try { const r = document.exitFullscreen(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* none */ } }
    const b = $('showBody'); if (b) b.querySelectorAll('.shsec.cur').forEach(s => s.classList.remove('cur'));
  }
  renderShowCtl();
}
function showGo(i, instant) {
  const b = $('showBody'); if (!b) return;
  const S = [...b.querySelectorAll('.shsec')]; if (!S.length) return;
  state.showAt = Math.max(0, Math.min(S.length - 1, i));
  const cur = S[state.showAt];
  if (!showOn) { cur.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); return; }
  S.forEach(s => s.classList.toggle('cur', s === cur)); cur.classList.add('in'); ShowStory.arrive(cur);
  cur.querySelectorAll('.shfig').forEach(mountFig);
  renderShowCtl();
  if (!instant && !RM() && typeof gsap !== 'undefined') { try { gsap.fromTo(cur.querySelectorAll('.shrise'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', clearProps: 'transform,opacity' }); } catch (e) { /* still there */ } }
}
function renderShowCtl() {
  const c = $('showCtl'); if (!c) return;
  c.hidden = !showOn; document.body.classList.toggle('shownotes', showOn && state.showNotes);
  if (!showOn) { c.innerHTML = ''; return; }
  const n = SHOW_SECTIONS.length, i = state.showAt;
  c.innerHTML = `<button class="btn sm ghost" data-shprev aria-label="Previous"${i ? '' : ' disabled'}><svg aria-hidden="true"><use href="#i-chevl"/></svg></button>
    <span class="shpos"><b>${i + 1}</b> / ${n} · ${esc(SHOW_SECTIONS[i].name)}</span>
    <span class="shdots" aria-hidden="true">${SHOW_SECTIONS.map((s, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>
    <button class="btn sm ghost" data-shnext aria-label="Next"${i < n - 1 ? '' : ' disabled'}><svg aria-hidden="true"><use href="#i-chevr"/></svg></button>
    <button class="btn sm ghost" data-shnotes aria-pressed="${state.showNotes}">Notes</button>
    <button class="btn sm" data-shexit>Exit</button>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-showpresent]')) { state.showAt = 0; showPresent(true); return; }
  const g = e.target.closest('[data-showgo]'); if (g) { const i = SHOW_SECTIONS.findIndex(s => s.id === g.dataset.showgo); if (i >= 0) showGo(i); return; }
  if (e.target.closest('[data-shnext]')) { showGo(state.showAt + 1); return; }
  if (e.target.closest('[data-shprev]')) { showGo(state.showAt - 1); return; }
  if (e.target.closest('[data-shnotes]')) { state.showNotes = !state.showNotes; renderShowCtl(); return; }
  if (e.target.closest('[data-shexit]')) { showPresent(false); return; }
  if (showOn && e.target.closest('[data-vago]')) showPresent(false);   // a role's interface opens out of the presentation
});
document.addEventListener('keydown', e => {
  if (!showOn || state.ws !== 'show' || e.altKey || e.ctrlKey || e.metaKey || (openId && !$(openId).hidden)) return;
  if (e.target.closest && e.target.closest('input, select, textarea, [contenteditable]')) return;
  const k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); showGo(state.showAt + 1); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); showGo(state.showAt - 1); }
  else if (k === 'Home') { e.preventDefault(); showGo(0); }
  else if (k === 'End') { e.preventDefault(); showGo(SHOW_SECTIONS.length - 1); }
  else if (k === 'n' || k === 'N') { state.showNotes = !state.showNotes; renderShowCtl(); }
  else if (k === 'Escape') { e.preventDefault(); showPresent(false); }
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && showOn) showPresent(false); });

// ---- the presenter's keys, for the admin on any page (also while viewing as someone): S a spotlight that follows the pointer,
// Z a zoom where the pointer is (moving the pointer moves across the page), + and - for its size, Esc off. Nothing else changes.
let spotEl = null, spotR = 170, zoomS = 0, zoomBase = { x: 0, y: 0 }, ptr = { x: innerWidth / 2, y: innerHeight / 2 }, ptrRaf = 0;
const presKeys = () => typeof realAdmin === 'function' && realAdmin();
function spotDraw() { if (!spotEl) return; spotEl.style.setProperty('--sx', ptr.x + 'px'); spotEl.style.setProperty('--sy', ptr.y + 'px'); spotEl.style.setProperty('--sr', spotR + 'px'); }
function spotSet(on) {
  if (on && !spotEl) { if (zoomS) zoomSet(0); spotEl = document.createElement('div'); spotEl.className = 'mcspot'; spotEl.setAttribute('aria-hidden', 'true'); document.documentElement.appendChild(spotEl); spotDraw(); }
  else if (!on && spotEl) { spotEl.remove(); spotEl = null; }
}
function zoomAt() { if (zoomS) document.body.style.transformOrigin = `${ptr.x - zoomBase.x}px ${ptr.y - zoomBase.y}px`; }
function zoomSet(z) {
  const b = document.body;
  if (z && !zoomS) { if (spotEl) spotSet(false); const r = b.getBoundingClientRect(); zoomBase = { x: r.left, y: r.top }; }
  zoomS = z || 0;
  document.documentElement.classList.toggle('mczoom', !!zoomS);
  b.style.transform = zoomS ? `scale(${zoomS})` : '';
  if (zoomS) zoomAt(); else b.style.transformOrigin = '';
}
window.addEventListener('pointermove', e => {
  ptr = { x: e.clientX, y: e.clientY };
  if ((spotEl || zoomS) && !ptrRaf) ptrRaf = requestAnimationFrame(() => { ptrRaf = 0; spotDraw(); zoomAt(); });
}, { passive: true });
window.addEventListener('resize', () => { if (zoomS) zoomSet(0); });
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || !presKeys()) return;
  const t = e.target; if (t && t.closest && t.closest('input, select, textarea, [contenteditable]')) return;
  const k = e.key, on = !!(spotEl || zoomS);
  if (k === 's' || k === 'S') { e.preventDefault(); spotSet(!spotEl); }
  else if (k === 'z' || k === 'Z') { e.preventDefault(); zoomSet(zoomS ? 0 : 1.8); }
  else if (on && (k === '+' || k === '=')) { e.preventDefault(); if (spotEl) { spotR = Math.min(420, spotR + 30); spotDraw(); } else zoomSet(Math.min(3, Math.round((zoomS + 0.3) * 10) / 10)); }
  else if (on && (k === '-' || k === '_')) { e.preventDefault(); if (spotEl) { spotR = Math.max(80, spotR - 30); spotDraw(); } else zoomSet(Math.max(1.2, Math.round((zoomS - 0.3) * 10) / 10)); }
  else if (on && k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); spotSet(false); zoomSet(0); }
}, true);
