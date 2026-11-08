// ================================================================ SHOWCASE: the tool tells its own story, for a meeting (admin only)
// One page the admin opens in front of the management team. It follows a messaging framework: the main message, the problem,
// the answer as a value proposition, the key messages with their proof, a message for every role (each with View, which opens
// that role's interface live through viewas.js), today's figures from the shared data (totals only, never a name), trust,
// what changes, the time back for Member Care (the hours each role gets back, as the team set them), and what comes next. It tells
// the idea and its benefits (never the WFM team's own daily reports),
// never how files go in or out. Present turns it into slides: full screen,
// one section at a time, the arrow keys, speaker notes on N. The line figures are hairline's (vendor/hairline.js), drawn only while
// the page is open. For the admin, anywhere in the tool: S a spotlight that follows the pointer, Z a zoom where it points, Esc off.
const showFig = () => (typeof Hairline !== 'undefined' ? Hairline : null);
Object.assign(state, { showAt: 0, showNotes: false });
let showOn = false, showIo = null;
const showFigs = new Map();
const shFig = (name, label) => `<div class="shfig" data-fig="${name}" data-label="${esc(label)}" aria-hidden="false"></div>`;
const shHead = (eyebrow, title, lead) => `<div class="shhead shrise"><div class="eyebrow">${esc(eyebrow)}</div><h2>${title}</h2>${lead ? `<p class="shlead">${lead}</p>` : ''}</div>`;
/** the sections, in the order they are told; each with what to say (the speaker notes, on N while presenting) */
const SHOW_SECTIONS = [
  { id: 'hero', name: 'Cadence', notes: 'Cadence is one idea: one shared place for Member Care\'s month. Every role works from the same numbers, every number is settled before it counts, and every result is explained to the person it touches. In the next minutes: the problem, the idea, what Member Care gets, every role, trust, and what comes next.' },
  { id: 'before', name: 'The challenge', notes: 'Month end used to run on people and spreadsheets: numbers from more than ten places, joined by hand, for seven roles waiting on one deadline. Skilled people spent their month assembling instead of improving service, a question about a bonus meant reopening the spreadsheets, and when one person was away the month waited.' },
  { id: 'idea', name: 'The idea', notes: 'The idea has four parts. One source of truth: everyone works from the same numbers, the same day. Right before it counts: questions are settled before a number reaches a payslip or an email. Every number explained: anyone can see how a result was reached. And a rhythm everyone sees: the close moves step by step, and everyone knows whose turn it is.' },
  { id: 'gets', name: 'What Member Care gets', notes: 'What Member Care gets: time back for people, fewer errors and fewer disputes, fairness everyone can see, the month at a glance for every manager, no single point of failure, and privacy by design. Each of these is something the team can feel in the first month.' },
  { id: 'roles', name: 'Every role', notes: 'Every role gets a better month, on its own page, seeing only what is theirs. Press View on a role to open its page live, on today\'s data. It is a preview: nothing is saved while you view, and Back to Admin returns here.' },
  { id: 'live', name: 'Today\'s data', notes: 'These are today\'s numbers from the shared data, the same cards the dashboard shows: totals only, never a name.' },
  { id: 'trust', name: 'Trust', notes: 'The data is the most sensitive Member Care has. It stays on our own computers, encrypted, and only accounts made in the tool can read it. Nothing is sent anywhere. A security review was done, its findings fixed and tested, and every change is tested before it ships.' },
  { id: 'change', name: 'What changes', notes: 'In one view, what changes: time moves from assembling to coaching, mistakes are settled before anything goes out, questions about pay are answered in a click, the whole month is visible to every role, and the month no longer rests on one person.' },
  { id: 'gives', name: 'What it gives back', notes: 'Time back for Member Care, role by role: the WFM analyst gets five hours back every working day and the WFM manager three; each QA, CT and TS supervisor and manager gets two hours a month. That is 188 hours a month: 2,256 hours, or 282 working days, a year, more than one full-time person, every month. If the room sees a number differently, change it here: the totals follow.' },
  { id: 'start', name: 'What\'s next', notes: 'Three steps: run the next month end in Cadence with the old way beside it for one month; measure what it gives back, hours, corrections and questions about pay, against the month before; then make it how Member Care closes every month. Thank you, and questions.' },
];
const SHOW_ROLES = [
  ['user', 'WFM analyst', 'Spent the month assembling numbers.', 'Spends it on analysis: the numbers come together and are checked for them.', 'i-up'],
  ['wfm', 'WFM manager', 'Waited on spreadsheets before sending anything.', 'Sends checked numbers on time and sees every trend in one place.', 'i-chart'],
  ['senior', 'Senior manager', 'Chased each step of the close by email.', 'Sees the whole close at a glance and decides with every number explained.', 'i-clock'],
  ['spv', 'Supervisor', 'Filled sheets instead of coaching.', 'Notes only what is different, and coaches from the month\'s own numbers.', 'i-team'],
  ['quality', 'Quality team', 'Sent scores separately, team by team.', 'Enters quality once; it counts the same everywhere.', 'i-star'],
  ['agent', 'Agent', 'Heard about results second-hand.', 'Sees their own results, understands them and can question them, in English or Arabic.', 'i-user'],
];
function showLiveHtml() {
  const months = wsMonths(), k = wsMonthNow();
  const counts = [[rosterRows().length, 'people on the roster'], [months.length, months.length === 1 ? 'month in the history' : 'months in the history'], [spvList().length, 'supervisors'], [state.forms.length, 'forms and one-to-ones kept']];
  const tiles = `<div class="shcounts shrise">${counts.filter(([n]) => +n > 0).map(([n, l]) => `<div><b>${esc(Number(n || 0).toLocaleString('en-US'))}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
  if (!k || !months.length) return `${tiles}<div class="card empty shrise"><b>No months yet</b>Build a month on WFM team › Import and its figures appear here.</div>`;
  let kp = ''; try { kp = dashKpisHtml(k, months.slice(-12)); } catch (e) { kp = ''; }
  return `${tiles}<div class="shkpis shrise"><div class="shmonth">${esc(ymLabel(k))}<span class="pill ${monthLocked(k) ? '' : 'info'}">${monthLocked(k) ? 'Final' : 'Draft'}</span></div><div class="kpis" role="list" aria-label="${esc(ymLabel(k))} at a glance">${kp}</div></div>`;
}
/** the hero's strip: the month shown, the people, the months kept */
function showStripHtml() {
  const k = wsMonthNow();
  return [k ? ymLabel(k) : '', `${rosterRows().length} people`, `${plural(wsMonths().length, 'month')} of history`, 'works offline'].filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('');
}
/** Time back for Member Care: the hours Cadence gives back, role by role, as the team set them. A presenter can change a number while
    presenting; it is kept only while the page is open, never saved. A month has 22 working days of 8 hours. */
const GIVE_DAYS = 22, GIVE_FTE = GIVE_DAYS * 8;
const GIVE_ROLES = [['WFM analyst', 5, 'day'], ['WFM manager', 3, 'day'], ['QA supervisor', 2, 'month'], ['QA manager', 2, 'month'], ['CT supervisor', 2, 'month'], ['CT manager', 2, 'month'], ['TS supervisor', 2, 'month'], ['TS manager', 2, 'month']];
const giveVals = GIVE_ROLES.map(([, h]) => String(h));
const giveNum = x => (Math.round(x * 10) / 10).toLocaleString('en-US');
/** one role's hours back in a month, or null when its box is empty */
function giveMonthOf(i) { const v = giveVals[i]; return v === '' ? null : (+v) * (GIVE_ROLES[i][2] === 'day' ? GIVE_DAYS : 1); }
const giveMoText = i => { const m = giveMonthOf(i); return m == null ? '–' : `${giveNum(m)} h`; };
/** the hours back in a month with the hours as set (the benefits card says it before the section is reached) */
const giveSetMonth = () => GIVE_ROLES.reduce((a, [, h, per]) => a + h * (per === 'day' ? GIVE_DAYS : 1), 0);
function giveSum() {
  let month = 0, any = false;
  GIVE_ROLES.forEach((r, i) => { const m = giveMonthOf(i); if (m == null) return; any = true; month += m; });
  return any ? month : null;
}
function giveHtml() {
  const m = giveSum(), f = x => Math.round(x).toLocaleString('en-US');
  const tiles = [[m == null ? '–' : f(m), 'hours back a month'], [m == null ? '–' : f(m * 12), 'hours back a year'], [m == null ? '–' : f(m * 12 / 8), 'working days back a year']];
  return `<div class="shgtiles">${tiles.map(([n, l], i) => `<div${i === 2 ? ' class="hot"' : ''}><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <p class="shgnote">${m == null ? 'Type the hours each role gets back.' : `A month of ${GIVE_DAYS} working days; a working day of 8 hours. <b>${m >= GIVE_FTE ? `As many hours as ${(m / GIVE_FTE).toFixed(1)} full-time people` : `${Math.round(m / GIVE_FTE * 100)}% of a full-time person`}, every month, back to coaching and service.</b>`}</p>`;
}
function giveTableHtml() {
  return `<table class="shctab"><thead><tr><th scope="col">Role</th><th scope="col">Hours back</th><th scope="col">Per</th><th scope="col">A month</th></tr></thead>
    <tbody>${GIVE_ROLES.map(([r, , per], i) => `<tr><th scope="row">${esc(r)}</th><td><input type="number" inputmode="decimal" min="0" max="9999" step="any" data-give="${i}" value="${esc(giveVals[i])}" aria-label="${esc(r)}: hours back a ${per}"></td><td class="per">${per}</td><td class="mo" data-givemo="${i}">${giveMoText(i)}</td></tr>`).join('')}</tbody></table>`;
}
function showHtml() {
  const S = {
    hero: `<div class="shhero">
        <div class="shherotext shrise"><span class="bologo on-light shlogo" aria-hidden="true"></span><div class="eyebrow">Cadence · Member Care performance</div>
          <h2 class="shbig">Member Care's month, <b>in one place.</b></h2>
          <p class="shlead">One shared truth for the whole month: the numbers every role works from, settled before they count, and explained to the person they touch. Less time assembling, more time for people.</p>
          <div class="shcta"><button class="btn primary" data-showpresent>Present</button><button class="btn" data-showgo="roles">See every role</button></div>
          <ul class="shstrip" id="showStrip">${showStripHtml()}</ul></div>
        ${shFig('exploded', 'An app window taken apart into its layers: one place for the month')}</div>`,
    before: `${shHead('The challenge', 'Month end ran on <b>people and spreadsheets.</b>', '')}
        <div class="shnums shrise">${[['10+', 'sources of numbers, joined by hand'], ['7', 'roles waiting on the same numbers'], ['1', 'deadline for all of it']].map(([n, l], i) => `<div class="${i === 2 ? 'hot' : ''}"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
        <div class="shcards three shrise">${[['Hours spent assembling', 'Skilled people spent their month joining and checking numbers instead of improving service.'], ['Hard to explain, easy to dispute', 'A question about a bonus or a deduction meant reopening the spreadsheets to find the answer.'], ['The month lived with one person', 'When they were away, the month waited, and what they knew was nowhere else.']].map(([h, t]) => `<div class="shcard"><b>${h}</b><p>${t}</p></div>`).join('')}</div>`,
    idea: `${shHead('The idea', 'One shared truth, <b>a page for every role.</b>', 'Cadence brings the whole month to one place every role opens: the same numbers for everyone, settled before they count, explained to everyone, at a pace everyone can see.')}
        <ol class="shsteps pillars shrise">${[['One source of truth', 'Every role works from the same numbers, the same day. No versions to reconcile.', 'stack', 'Layers settling into one stack: one source of truth'], ['Right before it counts', 'Questions are settled before a number reaches a payslip or an email.', 'sieve', 'Sieves over a pan: settled before it counts'], ['Every number explained', 'Anyone can see how a result was reached, down to the rounding.', 'loupe', 'A magnifying glass: every number explained'], ['A rhythm everyone sees', 'The month close moves step by step, and everyone knows whose turn it is.', 'plot', 'A chart drawing itself: the month, seen by everyone']].map(([h, t, f, l]) => `<li class="shstep">${shFig(f, l)}<b>${h}</b><p>${t}</p></li>`).join('')}</ol>`,
    gets: `${shHead('What Member Care gets', 'What Member Care <b>gets.</b>', '')}
        <div class="shcards six shrise">${[['Time back for Member Care', 'Hours back every month, role by role, for coaching, quality and service.', `${giveSetMonth()} hours a month`], ['Fewer errors and disputes', 'Problems are settled before anything goes out, so fewer corrections follow the emails.', ''], ['Fairness people can see', 'Every bonus explains itself, the same rules apply to everyone, and agents see their own.', '94.96% → 95%'], ['The month at a glance', 'Managers see where the close stands, what is late and who is next, without chasing anyone.', ''], ['No single point of failure', 'The month is shared, saved and covered during holidays: it never rests on one person.', ''], ['Private by design', 'The data stays on our own computers, encrypted, and each role sees only what is theirs.', '0 web requests']].map(([h, t, big], i) => `<div class="shcard${big ? ' stat' : ''}">${big ? `<em>${esc(big)}</em>` : `<span class="shno">0${i + 1}</span>`}<b>${h}</b><p>${t}</p></div>`).join('')}</div>`,
    roles: `${shHead('Every role', 'A better month for <b>every role.</b>', 'Press View to open that page live, on today\'s data, exactly as its role sees it. Nothing is saved and National IDs are hidden while you view; Back to Admin returns here.')}
        <div class="shroles shrise">${SHOW_ROLES.map(([r, name, before, now, ico]) => { const R = VIEW_ROLES.find(x => x[0] === r), kind = R && R[3]; return `<div class="shrole"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#${ico}"/></svg></span><b>${esc(name)}</b></div>
            <p class="was"><span>Before</span>${esc(before)}</p><p class="now"><span>Now</span>${esc(now)}</p>
            <div class="shract">${kind ? `<span class="shpick" data-kind="${kind}">${viewPickHtml(kind)}</span>` : ''}<button class="btn sm primary" data-vago="${r}">View</button></div></div>`; }).join('')}
          <div class="shrole admin"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#i-lock"/></svg></span><b>Admin</b></div><p class="now"><span>Now</span>Accounts and roles, vacation cover, and this Showcase.</p><div class="shract"><span class="pill info">You are here</span></div></div>
          ${shFig('hub', 'A hub and its tiles: one set of data, a page for every role')}</div>`,
    live: `${shHead('Today\'s data', 'This is <b>today\'s data.</b>', 'The same cards the dashboard shows, straight from the shared data: totals only, never a name.')}<div id="showLive">${showLiveHtml()}</div>`,
    trust: `${shHead('Trust', 'Your data <b>stays yours.</b>', '')}
        <div class="shtrust shrise"><div class="shtiles">${[['0', 'web requests', 'Nothing is sent anywhere: the data stays on our own computers.'], ['AES-256', 'encrypted shared data', 'Only accounts made in the tool can read the shared data.'], ['No IDs', 'in email attachments', 'National IDs never leave the tool in an email.'], ['37', 'browser test suites', 'Every role, on a computer, light and dark, before each change ships.'], ['10,000', 'synthetic people', 'The counting rules checked against the previous engine, with the same results.'], ['Logged', 'every change', 'Results, rules and roles: who changed what, and when.']].map(([b, s, t], i) => `<div class="shtile${i ? '' : ' on'}"><b>${b}</b><span>${s}</span><p>${t}</p></div>`).join('')}</div>
          ${shFig('vault', 'A vault door: the shared data, encrypted')}</div>`,
    change: `${shHead('What it means', 'What changes for <b>Member Care.</b>', '')}
        <div class="shtable shrise"><table><thead><tr><th></th><th>Before</th><th class="hot">With Cadence</th></tr></thead><tbody>${[['Time', 'Spent assembling and re-checking numbers', 'Spent on coaching and service'], ['Accuracy', 'Mistakes found after the emails went out', 'Settled before anything goes out'], ['Questions about pay', 'Worked out again on request', 'Answered in a click, the same for everyone'], ['Visibility', 'Status gathered by email and calls', 'The whole month at a glance, for every role'], ['Continuity', 'The month lived in one person\'s files', 'Shared, saved and covered during holidays']].map(([a, b, c]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>`,
    gives: `${shHead('What it gives back', 'Time back for <b>Member Care.</b>', 'Hours back, role by role: every working day for the WFM team, every month for the QA, CT and TS supervisors and managers. What comes back is time for people.')}
        <div class="shcalc shrise"><div class="shcalctab">${giveTableHtml()}<button class="btn sm ghost" data-givereset>Reset the hours</button></div>
          <div class="shgive" id="showGive" aria-live="polite">${giveHtml()}</div></div>`,
    start: `<div class="shend">
        <div class="shendtext">${shHead('What\'s next', 'Ready for <b>the next close.</b>', '')}
          <ol class="shgo shrise">${[['Run the next month end in Cadence', 'Every role in one place, with the old way beside it for one month.'], ['Measure what it gives back', 'Hours, corrections and questions about pay, against the month before.'], ['Make it how we close', 'Every month, every role, one shared truth.']].map(([h, t], i) => `<li><span class="shn">${i + 1}</span><div><b>${h}</b><p>${t}</p></div></li>`).join('')}</ol>
          <p class="shthanks shrise">Thank <b>you.</b></p></div>
        ${shFig('laptop', 'A laptop, its lid opening: the next close')}</div>`,
  };
  const sec = (s, i) => `<section class="shsec sh-${s.id}" data-shsec="${i}" aria-label="${esc(s.name)}">${S[s.id]}<aside class="shnotes" aria-label="Speaker notes"><b>Speaker notes</b><p>${esc(s.notes)}</p></aside></section>`;
  return `<div class="shtop"><div><div class="eyebrow">Admin</div><h1 id="h-show">Showcase</h1><p>The tool's own story for a meeting: present it full screen, and open any role's interface live from it. Anywhere in the tool: <kbd>S</kbd> spotlight, <kbd>Z</kbd> zoom, <kbd>Esc</kbd> off.</p></div>
      <div class="wsacts"><button class="btn primary" data-showpresent><svg aria-hidden="true"><use href="#i-present"/></svg>Present</button></div></div>
    ${SHOW_SECTIONS.map(sec).join('')}
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
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(L => L.forEach(x => {
    if (!x.isIntersecting) return;
    if (x.target.classList.contains('shsec')) x.target.classList.add('in'); else mountFig(x.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;
  showIo = io;
  el.querySelectorAll('.shsec, .shfig').forEach(n => { if (io) io.observe(n); else { n.classList.add('in'); if (n.classList.contains('shfig')) mountFig(n); } });
  if (showOn) showGo(state.showAt, true);
}
/** leaving the page: the figures are taken down and the presentation ends */
function leaveShow() { if (showOn) showPresent(false); stopShowFigs(); const el = $('showBody'); if (el && el.firstChild) el.innerHTML = ''; }   // told afresh on the next visit
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
  S.forEach(s => s.classList.toggle('cur', s === cur)); cur.classList.add('in');
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
document.addEventListener('input', e => {
  const t = e.target.closest && e.target.closest('[data-give]'); if (!t) return;
  const i = +t.dataset.give, v = t.value.trim();
  giveVals[i] = v !== '' && Number.isFinite(+v) && +v >= 0 ? v : '';
  const mo = document.querySelector(`[data-givemo="${i}"]`); if (mo) mo.textContent = giveMoText(i);
  const g = $('showGive'); if (g) g.innerHTML = giveHtml();
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-givereset]')) return;
  GIVE_ROLES.forEach(([, h], i) => { giveVals[i] = String(h); });
  document.querySelectorAll('[data-give]').forEach(x => { x.value = giveVals[+x.dataset.give]; });
  document.querySelectorAll('[data-givemo]').forEach(x => { x.textContent = giveMoText(+x.dataset.givemo); });
  const g = $('showGive'); if (g) g.innerHTML = giveHtml();
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
