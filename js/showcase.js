// ================================================================ SHOWCASE: the tool tells its own story, for a meeting (admin only)
// One page the admin opens in front of the management team. It follows a messaging framework: the main message, the problem,
// the answer as a value proposition, the key messages with their proof, a message for every role (each with View, which opens
// that role's interface live through viewas.js), today's figures from the shared data (totals only, never a name), trust,
// what changes, what it gives back (the room's own hours, typed in), and how to start. Present turns it into slides: full screen,
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
  { id: 'hero', name: 'MC Monthly Report Builder', notes: 'One offline file that runs Member Care\'s month end, from the Genesys exports to the last email, with a page for every role. In the next minutes: what it replaces, how a month runs, every role, why it can be trusted, and how we start.' },
  { id: 'before', name: 'The challenge', notes: 'Before the tool, month end meant ten or more files from different places, joined by copy and paste, for seven roles who wait on the same numbers and one deadline. A bonus or a deduction was hard to check and harder to explain, and every email was put together by hand.' },
  { id: 'answer', name: 'The answer', notes: 'The tool is one HTML file in the common folder. The WFM analyst drops the month\'s files, the checks say what needs a decision, the workbook and the incentive data are built in one click, and the emails are ready for Outlook. Four steps, each saying what it still needs.' },
  { id: 'why', name: 'Why it works', notes: 'Five things change the month. Files are recognised by what is inside them. Nothing is built until the blocking checks are decided. Every bonus shows how it was counted, down to the rounding. The emails are ready but sent by people. And the data stays private.' },
  { id: 'roles', name: 'Every role', notes: 'Every role signs in to its own page and sees only what is theirs. Press View on a role to open its interface live, on today\'s data. It is a preview: nothing is saved while you view, and Back to Admin returns here.' },
  { id: 'live', name: 'Today\'s data', notes: 'These are today\'s numbers from the shared data, the same cards the dashboard shows: totals only, never a name.' },
  { id: 'trust', name: 'Trust', notes: 'The data is the most sensitive Member Care has. Opened as a file, the page refuses every web address. The shared data is encrypted and only accounts made in the tool can read it. Attachments carry no National IDs. A security review was done, its findings fixed and tested, and every change is tested in the browser before it ships.' },
  { id: 'change', name: 'What changes', notes: 'In one view, what changes for Member Care: one drop instead of files joined by hand, checks before anything is built, any bonus explained in a click, ready email drafts without National IDs, and a month that no longer lives in one person\'s spreadsheets.' },
  { id: 'gives', name: 'What it gives back', notes: 'Ask the room, role by role: how many people do month end work, and how many hours a month does it take each of them today? Type their answers. Then ask how many hours they expect with the tool, or use the hours measured in the first month. The totals are the room\'s own numbers, not ours.' },
  { id: 'start', name: 'How we start', notes: 'Three steps: put the HTML in the common folder next to MC Data, read-only for everyone but its owner; open it in Edge or Chrome on a computer; each person makes an account and the admin gives the roles. Thank you, and questions.' },
];
const SHOW_ROLES = [
  ['user', 'WFM analyst', 'Gathered and joined every file by hand.', 'Imports, checks, builds and writes the emails in four steps.', 'i-up'],
  ['wfm', 'WFM manager', 'Waited on spreadsheets before sending anything.', 'Sends checked emails from one place; analytics, agents and interactions.', 'i-chart'],
  ['senior', 'Senior manager', 'Chased each step of the close by email.', 'Sees the month close in eight steps and finalizes the results.', 'i-clock'],
  ['spv', 'Supervisor', 'Filled a sheet for every agent, every day.', 'Sees the team, writes only the exceptions, holds one-to-ones in the tool.', 'i-team'],
  ['quality', 'Quality team', 'Sent quality scores in separate files.', 'Drops the Final EVAL once; every scorecard uses it.', 'i-star'],
  ['agent', 'Agent', 'Heard about results second-hand.', 'Sees their own results and forms, in English or Arabic, and signs in the tool.', 'i-user'],
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
/** What it gives back: the room's own numbers, typed in while presenting (kept only while the page is open, never saved) */
const GIVE_ROLES = ['WFM analysts', 'WFM manager', 'Senior manager', 'Supervisors', 'Quality team'];
const giveVals = GIVE_ROLES.map(() => ({ n: '', a: '', b: '' }));
function giveSum() {
  let month = 0, any = false;
  for (const v of giveVals) { if (v.n === '' || v.a === '' || v.b === '') continue; any = true; month += (+v.n) * Math.max(0, (+v.a) - (+v.b)); }
  return any ? month : null;
}
function giveHtml() {
  const m = giveSum(), f = x => Math.round(x).toLocaleString('en-US');
  const tiles = [[m == null ? '–' : f(m), 'hours back a month'], [m == null ? '–' : f(m * 12), 'hours back a year'], [m == null ? '–' : f(m * 12 / 8), 'working days back a year']];
  return `<div class="shgtiles">${tiles.map(([n, l], i) => `<div${i === 2 ? ' class="hot"' : ''}><b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <p class="shgnote">${m == null ? 'Type the room\'s numbers: the people in a role, and the hours each gives month end in a month, today and with the tool.' : 'The room\'s own numbers: people × (hours today − hours with the tool), for 12 months, in 8-hour working days.'}</p>`;
}
function giveTableHtml() {
  const lab = { n: 'people', a: 'hours each a month, today', b: 'hours each a month, with the tool' };
  return `<table class="shctab"><thead><tr><th scope="col">Role</th><th scope="col">People</th><th scope="col">Hours each a month, today</th><th scope="col">Hours each, with the tool</th></tr></thead>
    <tbody>${GIVE_ROLES.map((r, i) => `<tr><th scope="row">${esc(r)}</th>${['n', 'a', 'b'].map(c => `<td><input type="number" inputmode="decimal" min="0" max="9999" step="any" data-give="${i}:${c}" value="${esc(giveVals[i][c])}" aria-label="${esc(r)}: ${lab[c]}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function showHtml() {
  const S = {
    hero: `<div class="shhero">
        <div class="shherotext shrise"><span class="bologo on-light shlogo" aria-hidden="true"></span><div class="eyebrow">MC Monthly Report Builder · Member Care</div>
          <h2 class="shbig">Member Care's month end, <b>in one place.</b></h2>
          <p class="shlead">One offline file turns the month's Genesys exports into the monthly workbook, the incentive data, the emails and the one-to-ones. Every number is checked before it is built, every bonus explains itself, and every role has its own page.</p>
          <div class="shcta"><button class="btn primary" data-showpresent>Present</button><button class="btn" data-showgo="roles">See every role</button></div>
          <ul class="shstrip" id="showStrip">${showStripHtml()}</ul></div>
        ${shFig('exploded', 'An app window taken apart into its layers: the tool')}</div>`,
    before: `${shHead('The challenge', 'Month end ran on <b>copy and paste.</b>', '')}
        <div class="shnums shrise">${[['10+', 'files joined by hand every month'], ['7', 'roles waiting on the same numbers'], ['1', 'deadline for all of it']].map(([n, l], i) => `<div class="${i === 2 ? 'hot' : ''}"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
        <div class="shcards three shrise">${[['Files gathered by hand', 'Four Genesys exports, every supervisor\'s attendance sheet and the quality files, joined by copy and paste.'], ['Hard to check, harder to explain', 'A rounding or a missed absence changed a bonus, and finding why meant opening the spreadsheets again.'], ['Emails built one by one', 'The deduction and incentive emails, their tables and attachments, put together by hand every month.']].map(([h, t]) => `<div class="shcard"><b>${h}</b><p>${t}</p></div>`).join('')}</div>`,
    answer: `${shHead('The answer', 'One file runs <b>the whole month.</b>', 'For Member Care\'s WFM team and managers, who close every month from scattered files, the MC Monthly Report Builder is one page in the common folder that takes the month from the Genesys exports to the last email. It checks every number before it builds anything, and it shows how every bonus was counted.')}
        <ol class="shsteps shrise">${[['Import', 'Drop every file of the month at once. Each is recognised by what is inside it.', 'riffle', 'A tray of cards: the month\'s files'], ['Review', 'The checks list what needs a decision before anything is built.', 'sieve', 'Sieves over a pan: the checks'], ['Export', 'The monthly workbook and the incentive data, built in one click.', 'format', 'Crooked lines snapping square: the workbook'], ['Emails', 'Deduction, absences and incentive emails, ready to send from Outlook.', 'relay', 'A hub lighting a path to a leaf: the emails']].map(([h, t, f, l], i) => `<li class="shstep"><span class="shn">${i + 1}</span>${shFig(f, l)}<b>${h}</b><p>${t}</p></li>`).join('')}</ol>`,
    why: `${shHead('Why it works', 'Five things that <b>change the month.</b>', '')}
        <div class="shcards five shrise">${[['One drop, every file recognised', 'By its columns, never its name: the Genesys exports, attendance templates, IDs and the quality EVAL.', ''], ['Checked before it is built', 'Blocking checks stop the build until someone decides, and every decision is kept with who made it.', ''], ['Every bonus explains itself', 'Each KPI with its band, ranking and points, then the days and the amount.', '94.96% → 95%'], ['Emails ready, sent by people', 'The tool writes them; people send them from Outlook. Attachments carry no National IDs.', ''], ['Private by design', 'Opened as a file, the page refuses every web address; the shared data is encrypted.', '0 web requests']].map(([h, t, big], i) => `<div class="shcard${big ? ' stat' : ''}">${big ? `<em>${esc(big)}</em>` : `<span class="shno">0${i + 1}</span>`}<b>${h}</b><p>${t}</p></div>`).join('')}</div>`,
    roles: `${shHead('Every role', 'A page for <b>every role.</b>', 'Press View to open that interface live, on today\'s data, exactly as its role sees it. Nothing is saved and National IDs are hidden while you view; Back to Admin returns here.')}
        <div class="shroles shrise">${SHOW_ROLES.map(([r, name, before, now, ico]) => { const R = VIEW_ROLES.find(x => x[0] === r), kind = R && R[3]; return `<div class="shrole"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#${ico}"/></svg></span><b>${esc(name)}</b></div>
            <p class="was"><span>Before</span>${esc(before)}</p><p class="now"><span>Now</span>${esc(now)}</p>
            <div class="shract">${kind ? `<span class="shpick" data-kind="${kind}">${viewPickHtml(kind)}</span>` : ''}<button class="btn sm primary" data-vago="${r}">View</button></div></div>`; }).join('')}
          <div class="shrole admin"><div class="shrtop"><span class="shrico" aria-hidden="true"><svg><use href="#i-lock"/></svg></span><b>Admin</b></div><p class="now"><span>Now</span>Accounts and roles, vacation cover, and this Showcase.</p><div class="shract"><span class="pill info">You are here</span></div></div>
          ${shFig('hub', 'A hub and its tiles: one set of data, a page for every role')}</div>`,
    live: `${shHead('Today\'s data', 'This is <b>today\'s data.</b>', 'The same cards the dashboard shows, straight from the shared data: totals only, never a name.')}<div id="showLive">${showLiveHtml()}</div>`,
    trust: `${shHead('Trust', 'Your data <b>stays yours.</b>', '')}
        <div class="shtrust shrise"><div class="shtiles">${[['0', 'web requests', 'Opened as a file, the browser itself refuses every web address.'], ['AES-256', 'encrypted shared data', 'Only accounts made in the tool can read the files in the folder.'], ['No IDs', 'in email attachments', 'National IDs never leave the tool in an email.'], ['36', 'browser test suites', 'Every role, on a computer, light and dark, before each change ships.'], ['10,000', 'synthetic people', 'The counting rules checked against the previous engine, with the same results.'], ['Logged', 'every change', 'Results, rules and roles: who changed what, and when.']].map(([b, s, t], i) => `<div class="shtile${i ? '' : ' on'}"><b>${b}</b><span>${s}</span><p>${t}</p></div>`).join('')}</div>
          ${shFig('vault', 'A vault door: the shared data, encrypted')}</div>`,
    change: `${shHead('What it means', 'What changes for <b>Member Care.</b>', '')}
        <div class="shtable shrise"><table><thead><tr><th></th><th>Before</th><th class="hot">With the tool</th></tr></thead><tbody>${[['Gathering the files', 'Each file found and joined by hand', 'One drop, each file recognised'], ['Checking', 'Mistakes found after the emails went out', 'Checks before anything is built'], ['Explaining a bonus', 'Worked out again on request', 'Every person\'s breakdown in one click'], ['Emails', 'Tables and attachments put together by hand', 'Ready drafts, no National IDs'], ['Continuity', 'The month lived in one person\'s files', 'Shared, locked, backed up, vacation cover']].map(([a, b, c]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>`,
    gives: `${shHead('What it gives back', 'Time back for <b>Member Care.</b>', 'The room\'s own numbers: how many people give month end their hours today, and how many hours it takes with the tool.')}
        <div class="shcalc shrise"><div class="shcalctab">${giveTableHtml()}<button class="btn sm ghost" data-giveclear>Clear the numbers</button></div>
          <div class="shgive" id="showGive" aria-live="polite">${giveHtml()}</div></div>`,
    start: `<div class="shend">
        <div class="shendtext">${shHead('Next steps', 'Ready for <b>the next close.</b>', '')}
          <ol class="shgo shrise">${[['Put the HTML in the common folder', 'Next to MC Data, read-only for everyone but its owner.'], ['Open it in Edge or Chrome', 'On a computer: nothing to install, no server.'], ['Everyone makes an account', 'The admin gives each person their role.']].map(([h, t], i) => `<li><span class="shn">${i + 1}</span><div><b>${h}</b><p>${t}</p></div></li>`).join('')}</ol>
          <p class="shthanks shrise">Thank <b>you.</b></p></div>
        ${shFig('laptop', 'A laptop, its lid opening: open the file and start')}</div>`,
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
  const [i, c] = t.dataset.give.split(':'), v = t.value.trim();
  giveVals[+i][c] = v !== '' && Number.isFinite(+v) && +v >= 0 ? v : '';
  const g = $('showGive'); if (g) g.innerHTML = giveHtml();
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-giveclear]')) return;
  giveVals.forEach(v => { v.n = ''; v.a = ''; v.b = ''; });
  document.querySelectorAll('[data-give]').forEach(x => { x.value = ''; });
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
