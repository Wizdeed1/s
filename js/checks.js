// ================================================================ BUILD (Option C): the import log, Review › Checks, readiness, the build dialog
// The checks are the bell's checks (computeNotes), shown as a tab in Review (D5) with five filter tiles. Each row expands to
// what happened, why it matters and what happens until someone acts; decisions are made in place. Only three things stop a
// build: an empty roster, files still being read, no export and no attendance file. Everything else is a warning that says
// what it leaves out. The import log lives in memory for this session only (D7): files are never stored.
Object.assign(state, { chkFilter: '', chkOpen: new Set(), chkAt: 0 });

// ---------------------------------------------------------------- the import log (this session only, never saved)
const IMP_LOG = [];
const hhmm = (d = new Date()) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
function impLogAdd(kind, text) { IMP_LOG.unshift({ at: new Date(), kind, text }); if (IMP_LOG.length > 60) IMP_LOG.length = 60; renderImpLog(); }
/** what the page holds before files are read, to say afterwards what each file did */
function impSnap() {
  return { slots: Object.fromEntries(Object.entries(state.slots).map(([k, v]) => [k, v && v.name])), att: state.attFiles.map(f => f.name), others: state.others.length,
    ids: state.idsFile ? state.idsFile.name : '', kpi: (state.kpiFiles[monthKey()] || {}).at || '', hist: Object.keys(state.history).length };
}
function impLogAfter(items, s0, notes) {
  // the "Reading" lines become what happened to each file
  for (let i = IMP_LOG.length - 1; i >= 0; i--) if (IMP_LOG[i].kind === 'wait' && items.some(it => IMP_LOG[i].text.startsWith(`Reading ${it.name} (`))) IMP_LOG.splice(i, 1);
  for (const it of items) {
    const slots = Object.entries(state.slots).filter(([, v]) => v && v.fid === it.fid);
    for (const [k, v] of slots) {
      const sv = slotView(k), meta = sv ? sv.kv.map(([a, b]) => `${a} ${b}`).join(', ') : '';
      const was = s0.slots[k];
      impLogAdd(was && was !== v.name ? 'replaced' : 'read', `${was && was !== v.name ? `Replaced ${KIND_BY[k].title}: ${was} → ` : `Read ${KIND_BY[k].title}: `}${v.name}${meta ? ` (${meta})` : ''}${sv && sv.warns.length ? `. Note: ${sv.warns[0]}` : ''}`);
    }
    if (!slots.length) {
      const att = state.attFiles.find(f => f.name === it.name), oth = state.others.filter(o => o.fid === it.fid);
      if (att) impLogAdd(s0.att.includes(it.name) ? 'replaced' : 'read', `${s0.att.includes(it.name) ? 'Replaced' : 'Read'} attendance sheet: ${it.name}`);
      else if (state.idsFile && state.idsFile.name === it.name && s0.ids !== it.name) impLogAdd('read', `Read the IDs file: ${it.name} (${plural(state.idsFile.rows.length, 'person', 'people')})`);
      else if (oth.some(o => o.kind === 'error' || o.kind === 'unknown')) impLogAdd('error', `Not recognised: ${it.name}. ${(oth[0] && oth[0].msg) || 'Its columns match none of the inputs.'}`);
      else if (oth.length) impLogAdd('info', `Kept as another file: ${it.name}`);
      else impLogAdd('read', `Read ${it.name}`);
    }
  }
  const hk = [...new Set(notes.filter(n => n.hist).map(n => n.hist))].sort();
  if (hk.length) impLogAdd('read', `Added ${hk.map(ymLabel).join(', ')} to the history`);
  const kk = notes.filter(n => n.kpi).map(n => n.kpi); if (kk.length) impLogAdd('read', `KPI file for ${MONTH_LONG[state.m - 1]}: ${kk.join('; ')}`);
  if (state.built && state.built.ver !== state.ver) impLogAdd('info', 'Export now reads "Changed since build": build again to include these files');
  state.chkAt = Date.now(); renderImpSide();
}
const IMP_ICON = { read: 'i-check', replaced: 'i-up', removed: 'i-x', error: 'i-alert', wait: 'i-clock', info: 'i-info' };
function renderImpLog() {
  const el = $('impLog'); if (!el) return;
  el.innerHTML = IMP_LOG.length ? IMP_LOG.slice(0, 14).map(x => `<li class="il ${x.kind}"><svg aria-hidden="true"><use href="#${IMP_ICON[x.kind] || 'i-info'}"/></svg><time>${esc(hhmm(x.at))}</time><span dir="auto">${esc(x.text)}</span></li>`).join('')
    : '<li class="il none"><span>Nothing read yet in this session.</span></li>';
}
// ---- Import's side: what the workbook needs, the log, and what to drop
function needItems() {
  const R = rosterRows(), n = nSlots();
  return [
    { ok: state.rosterReady && R.length > 0, block: true, t: !state.rosterReady ? 'Loading the roster…' : R.length ? `${plural(R.length, 'person', 'people')} on the roster` : 'The roster is empty', go: R.length ? '' : 'people', act: 'Add people' },
    { ok: !state.pending.length, block: true, t: state.pending.length ? `Reading ${plural(state.pending.length, 'file')}…` : 'No file is still being read' },
    { ok: allDets().length > 0 || state.attFiles.length > 0, block: true, t: allDets().length || state.attFiles.length ? 'At least one export or attendance file' : 'No export and no attendance file yet' },
    { ok: n === 4, block: false, t: n === 4 ? 'All four Genesys exports' : `${n} of 4 Genesys exports: ${KINDS.filter(k => !state.slots[k.kind]).map(k => k.title).join(', ')} missing, so ${n ? 'their sheets stay empty' : 'the sheets stay empty'}` },
    { ok: state.attFiles.length > 0 || !!(state.attRes && state.attRes.auto), block: false, t: state.attFiles.length ? plural(state.attFiles.length, 'attendance sheet') : state.attRes && state.attRes.auto ? 'Attendance counted from Genesys' : 'No attendance sheets: the Attendance sheet is an empty grid to fill in Excel' },
  ];
}
function renderImpSide() {
  const L = $('needList'); if (!L) return;
  L.innerHTML = needItems().map(x => `<li><span class="ck ${x.ok ? 'ok' : x.block ? 'no' : 'wa'}" aria-hidden="true"><svg width="12" height="12"><use href="#${x.ok ? 'i-check' : x.block ? 'i-dash' : 'i-bang'}"/></svg></span><span>${esc(x.t)}${!x.ok ? ` <small class="${x.block ? 'blk' : 'wrn'}">${x.block ? 'Blocks the build' : 'Warning'}</small>` : ''}${x.go ? ` <button class="linkbtn" data-go="${x.go}">${esc(x.act)}</button>` : ''}</span></li>`).join('');
  renderImpLog();
  const W = $('whatDropList'); if (W && !W.dataset.done) {
    W.dataset.done = '1';
    W.innerHTML = [...KINDS, ...XKINDS].map(k => `<dt>${esc(k.title)}${k.optional ? ' <small>optional</small>' : ''}</dt><dd>${esc(k.what)}. <span class="cols">${esc(k.cols)}</span>${GX && GX[k.kind] ? `<br><span class="gx">${esc(GX[k.kind])}</span>` : ''}</dd>`).join('')
      + '<dt>Supervisors\' attendance <small>optional</small></dt><dd>Each supervisor\'s sheet (.xlsx or .xlsb), as many as there are. The right month\'s tab is picked by its dates.</dd>'
      + '<dt>IDs file</dt><dd>National ID, Name, Team, Dep for everyone. Kept with the page and used every month until a newer one is dropped.</dd>'
      + '<dt>KPI file, past incentive files, Teams Distribution (.msg)</dt><dd>The KPI file goes to Review › KPI results; past files go to the history, each to its own month; the Teams Distribution email updates who leads whom (you see who moves before anything is saved).</dd>';
  }
}

// ---------------------------------------------------------------- Review › Checks
const checksShown = () => state.ws === 'build' && state.step === 'review' && state.tab === 'checks';
const CHK_GROUPS = [['decide', 'Needs your decision', 'i-bang'], ['warn', 'Please check', 'i-alert'], ['fixed', 'Fixed automatically', 'i-check'], ['info', 'For your information', 'i-info'], ['done', 'Decided by you', 'i-user']];
/** why a check matters, and what the tool does until someone acts: said in words, per kind */
function chkWhy(n) {
  const g = n.group || '';
  if (/^dup:/.test(n.id)) return DUP_WHY[n.id.split(':')[1]] || DUP_WHY.exp;
  if (/^expdup:/.test(n.id)) return ['Two Genesys users with one display name cannot be told apart in the exports.', 'Only the first row with that name is used.'];
  if (n.sev === 'decide') return ['Both values cannot be right, and the workbook and the incentive use one of them.', n.pick ? (n.pick.kind === 'tardy' ? 'The day cells are used.' : 'The value from the file where this person has the most days is used.') : 'Nothing is changed.'];
  if (n.sev === 'fixed') return ['The tool tidied this so the files match; it can be undone.', 'The fix stays in place.'];
  if (n.sev === 'done') return ['You chose this earlier; it can be changed.', 'Your choice is used.'];
  if (/^gen:/.test(n.id) || n.id === 'gen-unm') return ['A name the roster does not know is left out of every report and the incentive.', 'This person is left out of the workbook.'];
  if (/^unm:/.test(n.id)) return ['Attendance for someone not on the roster cannot be counted.', 'Their attendance is left out.'];
  if (n.id === 'cross') return ['The supervisors\' sheets and Genesys say different things about these days.', 'Nothing was changed; the attendance sheets are used.'];
  if (n.id === 'notl') return ['Without a status timeline the Actual is 0, so the deduction is 0 every day.', 'Their deduction shows as 0.'];
  if (n.id === 'noid') return ['The emails and the incentive file match people by National ID.', 'They are listed without an ID.'];
  if (/^IDs/.test(g)) return ['The IDs file and the roster disagree.', 'The roster is used.'];
  if (/^Attendance/.test(g)) return ['It changes the attendance and tardy minutes in the workbook.', 'The file\'s own value is used.'];
  return ['For information; nothing is wrong.', 'Nothing changes.'];
}
/** Genesys names not on the roster: one check each, so each one can be linked in place */
function checkNotes() {
  const N = state.notes.filter(n => n.id !== 'gen-unm'), gen = state.notes.find(n => n.id === 'gen-unm');
  if (gen) for (const x of state.issues) N.push({ id: 'gen:' + x.key, sev: 'warn', group: 'Genesys', title: `Not on the roster: ${x.name}`, body: `In the ${x.where.map(w => WHERE[w]).join(', ')} export${x.where.length > 1 ? 's' : ''}.${x.sugg ? (x.alias ? ` It is the roster name of ${x.sugg.name.replace(/\.$/, '')}, whose system name is another name.` : ` Looks like ${x.sugg.name.replace(/\.$/, '')}.`) : x.several ? ` Several people fit: ${x.several.map(p => p.name).join(', ')}.` : ' No close match on the roster.'}`, issue: x.key });
  return N;
}
function checkRowHtml(n, acts, list) {
  const open = state.chkOpen.has(n.id), [why, until] = chkWhy(n), id = 'ck-' + String(n.id).replace(/[^a-z0-9]/gi, '_').slice(0, 60);
  const G = CHK_GROUPS.find(g => g[0] === n.sev) || CHK_GROUPS[3];
  let a = acts;
  if (n.issue) { const x = state.issues.find(i => i.key === n.issue); a = `<div class="acts">${x && x.sugg ? `<button class="btn sm primary" data-ilink="${esc(x.key)}" data-to="${esc(x.sugg._id)}">Link to ${esc(x.sugg.name)}</button>` : ''}<button class="btn sm" data-linkp="${esc(n.issue)}">Link…</button><button class="btn sm ghost" data-iadd="${esc(n.issue)}">Add as new person</button></div>`; }
  return `<li class="chk ${n.sev}${open ? ' open' : ''}"><button class="chkhead" aria-expanded="${open}" aria-controls="${id}" data-chk="${esc(n.id)}"><span class="sev" aria-hidden="true"><svg><use href="#${G[2]}"/></svg></span><span class="ct"><span class="tag">${esc(n.group || '')}</span><b dir="auto">${esc(n.title)}</b></span><span class="sw">${esc(G[1])}</span><svg class="cv" aria-hidden="true"><use href="#i-chev"/></svg></button>
    <div class="chkbody" id="${id}"${open ? '' : ' hidden'}><dl><div><dt>What happened</dt><dd dir="auto">${esc(n.body || n.title)}${list}</dd></div><div><dt>Why it matters</dt><dd>${esc(why)}</dd></div><div><dt>Until you act</dt><dd>${esc(until)}</dd></div></dl>${a ? `<div class="na">${a}</div>` : ''}</div>
    ${n.sev === 'decide' && a && !open ? `<div class="na inplace">${a}</div>` : ''}</li>`;
}
function readinessHtml() {
  const items = needItems(), blk = items.filter(x => x.block && !x.ok), ready = canBuild(), wr = items.filter(x => !x.block && !x.ok);
  const left = state.issues.length;
  return `<h2 id="h-ready">Build readiness</h2>
    <p class="rstate ${ready ? 'ok' : 'no'}"><svg aria-hidden="true"><use href="#${ready ? 'i-check' : 'i-lock'}"/></svg><b>${ready ? 'Ready to build' : 'Cannot build yet'}</b></p>
    <p class="cap">${ready ? (wr.length || left ? 'The workbook can be built now; the warnings below say what it would leave out.' : 'Nothing is left out.') : esc(buildBlocker()) + '.'}</p>
    <h3>What would block it</h3><ul class="checklist">${items.filter(x => x.block).map(x => `<li><span class="ck ${x.ok ? 'ok' : 'no'}" aria-hidden="true"><svg width="12" height="12"><use href="#${x.ok ? 'i-check' : 'i-dash'}"/></svg></span><span>${esc(x.t)}</span></li>`).join('')}</ul>
    ${wr.length || left ? `<h3>What it would leave out</h3><ul class="checklist">${left ? `<li><span class="ck wa" aria-hidden="true"><svg width="12" height="12"><use href="#i-bang"/></svg></span><span>${plural(left, 'name')} in the exports not on the roster${isBuilder() ? ' <button class="linkbtn" data-go="match">Match names…</button>' : ''}</span></li>` : ''}${wr.map(x => `<li><span class="ck wa" aria-hidden="true"><svg width="12" height="12"><use href="#i-bang"/></svg></span><span>${esc(x.t)}</span></li>`).join('')}</ul>` : ''}
    <button class="btn primary" data-go="export"${ready ? '' : ' disabled'}>Continue to Export</button>`;
}
function renderChecks() {
  const N = checkNotes(), blocking = canBuild() ? 0 : 1, F = state.chkFilter;
  const cnt = sev => N.filter(n => n.sev === sev).length;
  const at = state.chkAt ? `Last checked ${hhmm(new Date(state.chkAt))}, after the last file.` : 'Checks rerun by themselves after every change.';
  $('checksSum').innerHTML = `<b>${blocking} blocking</b> · ${plural(N.length, 'check')} <span class="hint">${esc(at)}</span>`;
  $('checksTiles').innerHTML = CHK_GROUPS.map(([sev, label, ico]) => `<button class="ctile ${sev}" data-chkf="${sev}" aria-pressed="${F === sev}"><svg aria-hidden="true"><use href="#${ico}"/></svg><b>${cnt(sev)}</b><span>${esc(label)}</span></button>`).join('');
  const L = F ? N.filter(n => n.sev === F) : N;
  if (!N.length) $('checksBody').innerHTML = emptyCard('Nothing to report', state.ctx || state.attFiles.length ? 'Every check passed.' : 'Drop the exports and the attendance files on Import. Every file is checked, and anything to look at shows here.');
  else $('checksBody').innerHTML = CHK_GROUPS.filter(([sev]) => !F || F === sev).map(([sev, label]) => { const G = L.filter(n => n.sev === sev); return G.length ? `<section class="chkgrp" aria-label="${esc(label)}"><h3>${esc(label)} <span class="badge ${sev === 'decide' || sev === 'warn' ? 'n' : ''}">${G.length}</span></h3><ul class="chks">${G.map(n => noteItemHtml(n, { row: true })).join('')}</ul></section>` : ''; }).join('')
    + (F && !L.length ? '<p class="subtle">Nothing in this group.</p>' : '');
  $('readyCard').innerHTML = readinessHtml();
}
$('checksTiles').addEventListener('click', e => { const b = e.target.closest('[data-chkf]'); if (!b) return; state.chkFilter = state.chkFilter === b.dataset.chkf ? '' : b.dataset.chkf; renderChecks(); const t = $('checksTiles').querySelector(`[data-chkf="${b.dataset.chkf}"]`); if (t) t.focus(); });
$('checksBody').addEventListener('click', e => {
  const h = e.target.closest('[data-chk]');
  if (h) { const id = h.dataset.chk; if (state.chkOpen.has(id)) state.chkOpen.delete(id); else state.chkOpen.add(id); renderChecks(); const b = $('checksBody').querySelector(`[data-chk="${CSS.escape(id)}"]`); if (b) b.focus(); return; }
  const il = e.target.closest('[data-ilink]');
  if (il) { const x = state.issues.find(i => i.key === il.dataset.ilink), p = state.roster.find(q => q._id === il.dataset.to); if (x && p) linkIssue(x, p); return; }
  const lp = e.target.closest('[data-linkp]'); if (lp) { openLink(lp.dataset.linkp, lp); return; }
  const ad = e.target.closest('[data-iadd]'); if (ad) { const x = state.issues.find(i => i.key === ad.dataset.iadd); if (x) { const id = addPerson({ name: x.name }); toast(`Added ${x.name}. Set the brand, team and ID in People.`, { label: 'Undo', fn: () => removePeople([id]) }); } }
  const g = e.target.closest('[data-gonote]'); if (g) e.stopPropagation();
});
$('readyCard').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (!g) return; if (g.dataset.go === 'match') { e.stopPropagation(); openMatch(null, g); return; } setStep(g.dataset.go); });
function linkIssue(x, p) {
  const prev = p.sys; updatePerson(p._id, { sys: x.name });
  toast(`${x.name} linked to ${p.name}`, { label: 'Undo', fn: () => updatePerson(p._id, { sys: prev || '' }) });
}
// ---- Link…: a side panel with a search and the likely people
let linkKey = '';
function linkCands(x, q) {
  const qq = normName(q || ''), R = rosterRows();
  const scored = R.map(p => ({ p, s: Math.max(Core.nameScore(x.name, p.name), normSpace(p.sys) ? Core.nameScore(x.name, p.sys) : 0) }));
  const L = qq ? scored.filter(o => normName(`${o.p.name} ${o.p.sys || ''} ${o.p.nid || ''}`).includes(qq)) : scored.filter(o => o.s >= 0.45);
  return L.sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name)).slice(0, 12);
}
function renderLink(q) {
  const x = state.issues.find(i => i.key === linkKey); if (!x) { closeDrawer(); return; }
  $('linkSub').textContent = `"${x.name}" is in the ${x.where.map(w => WHERE[w]).join(', ')} export${x.where.length > 1 ? 's' : ''} but not on the roster.`;
  const C = linkCands(x, q), taken = id => { const m = state.byId.get(id); return m && m.any; };
  const list = C.length ? `<ul class="linklist">${C.map(o => `<li><button class="lcand" data-lto="${esc(o.p._id)}"><span class="av" aria-hidden="true"${avStyle(o.p.name)}>${esc(initials(o.p.name))}</span><span class="who"><b dir="auto">${esc(o.p.name)}</b><small>${esc(unitOf(o.p))}${o.p.sys ? ` · Genesys: ${esc(o.p.sys)}` : ''}${taken(o.p._id) ? ' · already matched in an export' : ''}</small></span><span class="pill${o.s >= 0.8 ? ' good' : ''}">${o.s >= 0.8 ? 'Likely' : o.s >= 0.6 ? 'Possible' : 'Match'}</span></button></li>`).join('')}</ul>` : `<p class="subtle">${q ? 'Nobody on the roster matches that.' : 'No close match on the roster. Search, or add them as a new person.'}</p>`;
  const body = $('linkBody');
  if (!body.querySelector('#linkQ')) body.innerHTML = `<div class="field"><label for="linkQ">Search the roster</label><input id="linkQ" type="search" placeholder="Name, Genesys name or National ID" autocomplete="off"></div><div id="linkList"></div><div class="linkfoot"><button class="btn" data-ladd>Add “${esc(x.name)}” as a new person</button></div>`;
  $('linkList').innerHTML = list;
}
function openLink(key, from) { linkKey = key; $('linkBody').innerHTML = ''; renderLink(''); openDrawer('dLink'); const q = $('linkQ'); if (q) q.focus(); }
$('linkBody').addEventListener('input', e => { if (e.target.id === 'linkQ') renderLink(e.target.value); });
$('linkBody').addEventListener('click', e => {
  const x = state.issues.find(i => i.key === linkKey); if (!x) return;
  const c = e.target.closest('[data-lto]'); if (c) { const p = state.roster.find(q => q._id === c.dataset.lto); if (p) { closeDrawer(); linkIssue(x, p); setTimeout(() => { const n = document.querySelector('#checksBody [data-linkp], #checksBody .chkhead') || $('t-checks'); if (n) n.focus(); }, 0); } return; }   // the row is gone: the next check gets the focus
  if (e.target.closest('[data-ladd]')) { closeDrawer(); const id = addPerson({ name: x.name }); toast(`Added ${x.name}. Set the brand, team and ID in People.`, { label: 'Undo', fn: () => removePeople([id]) }); }
});

// ---------------------------------------------------------------- the step bar: the steps-done ring, and the step change moment
function renderRing() {
  const done = [...document.querySelectorAll('#stepsNav .step.done')].length, f = $('bbRingF');
  if (f) { f.setAttribute('stroke-dasharray', `${done * 25} 100`); f.style.opacity = done ? '1' : '0'; }
  $('bbRingN').textContent = `${done}/4`; $('bbRing').setAttribute('aria-label', `${done} of 4 steps done`);
}
/** Build, one step to the next (about 0.9 s): the underline moves, the ring fills, the new step's number glows once, the page slides
    in from its side, the first eight checks rise 40 ms apart. Counts are final from the first frame. Reduced motion: a fade. */
function stepMoment(from, to) {
  const v = $('v-' + to); if (!v) return;
  if (RM()) { animIn(v); return; }
  const fwd = STEPS.indexOf(to) > STEPS.indexOf(from);
  v.classList.remove('stepin', 'back'); void v.offsetWidth; v.classList.add('stepin'); if (!fwd) v.classList.add('back');
  const n = document.querySelector(`#stepsNav .step[data-step="${to}"] .n`); if (n) { n.classList.remove('glow'); void n.offsetWidth; n.classList.add('glow'); }
  $('bbRing').classList.remove('pulse'); void $('bbRing').offsetWidth; $('bbRing').classList.add('pulse');
  if (to === 'review') requestAnimationFrame(() => { [...v.querySelectorAll('#checksBody .chk')].slice(0, 8).forEach((el, i) => { el.style.setProperty('--i', i); el.classList.add('rise'); }); });
  setTimeout(() => { v.classList.remove('stepin', 'back'); v.querySelectorAll('.rise').forEach(el => el.classList.remove('rise')); }, 900);
}

// ---------------------------------------------------------------- dialogs: the title says the action, the body the consequence, Cancel has the focus
let dlgOpen = null;
function openDlg(id, opener) {
  closeDlg(true); const d = $(id); dlgOpen = { id, opener: opener || document.activeElement };
  d.hidden = false; d.classList.remove('out'); hidePop();
  const c = d.querySelector('.dlgfoot .btn:not(.primary)'); if (c) c.focus();
}
function closeDlg(now, back = true) {
  if (!dlgOpen) return; const { id, opener } = dlgOpen, d = $(id); dlgOpen = null;
  const done = () => { d.hidden = true; d.classList.remove('out'); };
  if (now || RM()) done(); else { d.classList.add('out'); setTimeout(done, 190); }
  if (back && opener && opener.isConnected) opener.focus();
}
document.querySelectorAll('.dlg').forEach(d => d.addEventListener('mousedown', e => { if (e.target === d) closeDlg(); }));
document.addEventListener('keydown', e => {
  if (!dlgOpen) return; const d = $(dlgOpen.id);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDlg(); return; }
  if (e.key === 'Tab') { const f = [...d.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
}, true);
// ---- Build the workbook: confirmation, then the build, then what happened
function askBuild(btn) {
  if (state.building) return;
  if (!canBuild()) { toast(buildBlocker() + '.'); return; }
  const shown = (state.model || []).filter(m => m.shown).length, n = nSlots(), stale = state.built && state.built.ver !== state.ver;
  $('h-build').textContent = state.built ? 'Build the workbook again?' : 'Build the monthly workbook?';
  $('buildDlgBody').innerHTML = `<p>This writes <b>${esc(fileNameOut())}</b> on this computer: nine sheets, formula-driven, for ${plural(shown || rosterRows().length, 'person', 'people')} from ${plural(n, 'export')}${state.attFiles.length ? ` and ${plural(state.attFiles.length, 'attendance sheet')}` : ''}.</p>
    <p class="hint">Nothing is sent or uploaded. ${state.built ? (stale ? 'The earlier file stays as it was; this makes a new one with your latest changes.' : 'The earlier file stays as it was; this makes a new one.') : 'Your browser asks where to save it, or saves it to Downloads.'}</p>
    ${state.issues.length ? `<p class="warnline"><svg class="sti" aria-hidden="true"><use href="#i-alert"/></svg>${plural(state.issues.length, 'name')} in the exports ${state.issues.length === 1 ? 'is' : 'are'} not on the roster and will be left out.</p>` : ''}`;
  openDlg('dBuild', btn);
}
$('buildCancel').addEventListener('click', () => closeDlg());
$('buildGo').addEventListener('click', () => { closeDlg(false, false); build().then(() => { const s = $('success'); if (s && !s.hidden) { const b = s.querySelector('#buildAgain'); if (b) b.focus({ preventScroll: true }); } }); });
// ---- Finalize a month (Results): the dialog says what locks
let finalK = '';
function askFinalize(k, btn) {
  if (!k) return; finalK = k;
  $('h-final').textContent = `Finalize ${ymLabel(k)}?`;
  $('finalDlgBody').innerHTML = `<p>${esc(ymLabel(k))} becomes final: its results, eligibility and one-to-ones lock for everyone else, and every agent with an account sees the final numbers on their own page.</p><ul class="dlglist"><li>Only you can change its results afterwards; each change is logged.</li><li>A build can never write over a final month.</li><li><b>Reopen ${esc(ymLabel(k))}</b> on this page takes it back.</li></ul>`;
  $('finalGo').textContent = `Finalize ${ymLabel(k)}`;
  openDlg('dFinal', btn);
}
$('finalCancel').addEventListener('click', () => closeDlg());
$('finalGo').addEventListener('click', () => { closeDlg(false); finalizeMonth(finalK); });
renderImpSide();
