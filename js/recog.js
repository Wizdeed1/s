// ================================================================ RECOGNISE FILES: what a file is and where it goes, worked out on this computer
// Drop or choose anything: each file gets a verdict from its sheet names, its columns (English and Arabic, spelling slips allowed),
// its title rows, its dates and a look at its first values (js/recog_core.js, in the parse worker). WFM team › Import sends every sure
// file of the month to its place at once; the others, and anything dropped where nothing takes it, open the Recognise files panel:
// what the file looks like and why, the month (and when its name and its content disagree), who in it is on the roster, and "Use it
// for …" with the page that takes it. A choice made here is remembered by the shape of the columns only (never a name, an ID or a
// value), so a file with the same columns is recognised next time. Nothing leaves this computer.
Object.assign(state, { recog: [], recogLearned: null });
const RECOG_NOTE = 'Recognised on this computer from the sheet names, columns and dates. Nothing is uploaded or sent.';
const RC_LEVEL = { sure: ['Sure', 'good'], likely: ['Likely', 'warn'], unsure: ['Not sure', 'bad'] };
/** where a file can go: the words for the button, and who may send it there */
const RC_ROUTE = {
  import: { l: () => 'WFM team › Import (this month\'s files)', can: () => isBuilder() },
  attendance: { l: k => `${k ? ymLabel(k) : 'this month'}'s attendance (WFM team › Import)`, can: () => isBuilder() },
  ids: { l: () => 'the HR IDs file (WFM team › Import)', can: () => isBuilder() },
  history: { l: k => `the history${k ? ` of ${ymLabel(k)}` : ''} (replaces what is there)`, can: () => isBuilder() },
  compare: { l: k => `Results › Reconcile with the old Excel${k ? ` (${ymLabel(k)})` : ''}`, can: () => wsOfNow().includes('results'), who: 'the senior manager, the WFM manager or an admin compares it there' },
  email: { l: () => 'WFM team › Emails (the workbook to send)', can: () => isBuilder() },
  quality: { l: k => `Quality: the Final EVAL${k ? ` of ${ymLabel(k)}` : ''}`, can: () => canQuality() },
  kpi: { l: () => `the KPI file of ${ymLabel(monthKey())}`, can: () => isBuilder() },
  roster: { l: () => 'the roster (you see every change first)', can: () => isBuilder() },
  distribution: { l: () => 'the Teams Distribution (you see who moves first)', can: () => isBuilder() },
  inter: { l: () => 'WFM › Interactions', can: () => canInter() },
  rb: { l: () => 'WFM › Report builder', can: () => canDailyTool() },
  scorecards: { l: () => 'Settings › Scorecards (typed there: this file is not read)', can: () => isBuilder() },
  logo: { l: () => 'the logo on the forms and Excel files', can: () => isBuilder() },
  rbHistory: { l: () => 'the Report builder history (replaces it)', can: () => canDailyTool() },
};
const recogPicker = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: '.csv,.txt,.xlsx,.xlsm,.xlsb,.xls,.msg,.json,image/*', hidden: true, id: 'recogPicker' }); document.body.appendChild(recogPicker);
recogPicker.addEventListener('change', () => { const L = [...recogPicker.files]; recogPicker.value = ''; if (L.length) recogFiles(L, 'pick'); });
function recogPick() { recogPicker.click(); }

// ---------------------------------------------------------------- what it learned: the shape of the columns -> the kind chosen
function recogLearned() {
  if (state.recogLearned) return state.recogLearned;
  let o = {}; try { o = JSON.parse(localStorage.getItem('mc-recog') || '{}') || {}; } catch (e) { o = {}; }
  return (state.recogLearned = o);
}
async function loadRecogLearned() { if (!state.db || state.recogDb) return; state.recogDb = true; try { const s = await state.db.doc('config/recog').get(); if (s.exists) state.recogLearned = { ...recogLearned(), ...((s.data() || {}).fps || {}) }; } catch (e) { /* this browser's copy */ } }
function recogSaveLearned() {
  const L = state.recogLearned || {};
  try { localStorage.setItem('mc-recog', JSON.stringify(L)); } catch (e) { /* private window */ }
  if (state.db) queueWrite('config/recog', () => state.db.doc('config/recog').set({ fps: L, at: new Date().toISOString(), by: whoNow() })).catch(() => {});
}
function recogLearn(fp, kind) { if (!fp || !Recog.KINDS[kind]) return; const L = { ...recogLearned() }, cur = L[fp]; L[fp] = { kind, at: new Date().toISOString(), n: (cur && cur.kind === kind ? cur.n || 1 : 0) + 1 }; state.recogLearned = L; recogSaveLearned(); }
function recogForget() { const keep = recogLearned(); state.recogLearned = {}; recogSaveLearned(); renderRecog(); toast('The tool forgot what you taught it about files.', { label: 'Undo', fn: () => { state.recogLearned = keep; recogSaveLearned(); renderRecog(); } }); }
/** the KPI names a KPI file can have as columns (every scorecard of every set) */
const recogKpiNames = () => [...new Set(allTeamCards().flatMap(c => (c.kpis || []).filter(x => x.src === 'file').flatMap(x => [x.name, ...(x.aliases || [])])))].filter(Boolean);
const recogOpts = () => ({ today: new Date(), kpiNames: recogKpiNames(), learned: recogLearned() });

// ---------------------------------------------------------------- one file -> a verdict
/** the Report builder's own readers decide the daily exports (they stay the reference for those files) */
async function recogDaily(f) {
  try {
    await rbBoot(); const E = rbE(); if (!E) return null;
    if (/\.xls$/i.test(f.name)) { const sh = window.parseXls(await f.arrayBuffer()), c = E.classify(f.name, 'xls', { rows: sh[0] ? sh[0].rows : [] }); return c.type === 'history' ? { kind: 'dailyCalls', why: 'A Crystal call history export (.xls), as the Report builder reads it' } : c.type === 'tickets' ? { kind: 'tickets', why: 'A Crystal tickets export (.xls)' } : null; }
    if (/\.xlsx$/i.test(f.name)) { for (const sh of await window.parseXlsx(await f.arrayBuffer())) { const p = E.sheetPayload(sh.rows || []); if (E.isLeaderTickets(p) || E.isTicketSheet(p)) return { kind: 'tickets', why: 'A tickets sheet, as the Report builder reads it' }; } return null; }
    if (/\.(csv|txt)$/i.test(f.name)) {
      const text = await f.text(), wt = window.WFM ? window.WFM.table(text, f.name) : null, ws = wt ? window.WFM.detect(wt, f.name) : null;
      if (ws && window.WFM.isOwn(ws)) return { kind: 'wfmDaily', why: 'A day\'s export the WFM Daily Review reads' };
      const c = E.classify(f.name, 'csv', E.parseCsv(text));
      if (c.type === 'fpayTickets') return { kind: 'tickets', why: 'The FRiENDi Pay tickets export' };
      if (c.type !== 'unknown' && c.brand) return { kind: /queue/i.test(c.type) ? 'dailyQueue' : /call/i.test(c.type) ? 'dailyCalls' : 'dailySm', why: `A ${c.brand} ${c.type} export, as the Report builder reads it` };
    }
  } catch (e) { /* not one of them */ }
  return null;
}
async function recogOne(f) {
  const n = f.name;
  if (/\.msg$/i.test(n)) return Recog.verdictOf(n, 'distributionMsg', { reasons: ['An Outlook message (.msg): the tool reads the Teams Distribution email'] });
  if (/^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp)$/i.test(n)) return Recog.verdictOf(n, 'logo', { level: 'likely', confidence: 0.75, reasons: ['An image file'] });
  if (/\.json$/i.test(n)) return Recog.verdictOf(n, 'rbHistory', { level: 'likely', confidence: 0.7, reasons: ['A JSON file, as the Report builder saves its history'] });
  let v = null;
  if (!/\.xls$/i.test(n)) { try { const r = await parse(n, await f.arrayBuffer(), true, 'recog', recogOpts()); v = r && r.rec; } catch (e) { v = Recog.verdictOf(n, 'unknown', { level: 'unsure', confidence: 0, reasons: ['It could not be read. If it has a password, save a copy without one'], error: 'read' }); } }
  if (!v || v.kind === 'unknown' || (v.level !== 'sure' && /\.(csv|txt|xls)$/i.test(n))) {
    if (/\.(csv|txt)$/i.test(n) && await isInterFile(f)) return Recog.verdictOf(n, 'inter', { reasons: ['Users, durations and disconnect types: the Genesys interactions export'] });
    const d = await recogDaily(f); if (d) return Recog.verdictOf(n, d.kind, { level: 'sure', confidence: 0.92, reasons: [d.why] });
  }
  return v || Recog.verdictOf(n, 'unknown', { level: 'unsure', confidence: 0, reasons: [/\.xls$/i.test(n) ? 'An old .xls workbook that is not a Crystal export: save it as .xlsx in Excel' : 'Its columns match none of the files the tool reads'] });
}
/** the people in the file against the roster: by National ID, by name (exact, then a close spelling) */
function recogPeople(v) {
  const P = v && v.people; if (!P || !P.n || !state.roster.length) return null;
  const byNid = new Set(), byNm = new Set();
  for (const p of rosterRows()) { const id = Core.cleanId((effP(p._id) || p).nid); if (id) byNid.add(id); byNm.add(normName(p.name)); if (normSpace(p.sys)) byNm.add(normName(p.sys)); }
  const ids = [...new Set((P.ids || []).map(x => Core.cleanId(x)).filter(Boolean))], idOn = ids.filter(id => byNid.has(id)).length;
  const names = (P.names || []).slice(0, 3000), left = names.filter(nm => !byNm.has(normName(nm)));
  let fuzzy = 0; const unknown = [];
  if (left.length && left.length <= 400) NameLink.link(left.map(nm => ({ name: nm, id: '', kind: 'agent' })), linkPeople(), {}, {}).forEach((x, j) => { if (x.id) fuzzy++; else unknown.push(left[j]); }); else unknown.push(...left);
  return { n: P.n, ids: ids.length, idOn, names: names.length, exact: names.length - left.length, fuzzy, unknown };
}

// ---------------------------------------------------------------- the panel
async function recogFiles(files, from) {
  const L = [...files].filter(Boolean); if (!L.length) return;
  await loadRecogLearned();
  if (L.length > 1 || L[0].size > 2e6) toast(`Recognising ${plural(L.length, 'file')} on this computer…`);
  const out = []; for (const f of L) out.push({ file: f, v: await recogOne(f) });
  recogOpen(out, from);
}
/** list: [{file, v}] (Import passes the verdicts it already has) */
function recogOpen(list, from) {
  if (!list.length) return;
  state.recog = list.map(x => ({ file: x.file, v: x.v, kind: x.v.kind, month: x.v.month ? ymKey(x.v.month.y, x.v.month.m) : '', people: recogPeople(x.v), done: '', from: from || '' }));
  for (const x of state.recog) impLogAdd(x.kind === 'unknown' ? 'error' : 'info', `Recognised ${x.file.name}: ${x.v.label} (${RC_LEVEL[x.v.level][0].toLowerCase()})`);
  renderRecog(); openDrawer('dRecog');
}
const rcMonthOf = x => (x.month ? x.month : '');
function recogCardHtml(x, i) {
  const v = x.v, K = Recog.KINDS[x.kind] || Recog.KINDS.unknown, chosen = x.kind !== v.kind, routes = (chosen ? K.routes : v.routes).filter(r => RC_ROUTE[r]), k = rcMonthOf(x);
  const [lvl, lcls] = chosen ? ['Your choice', 'info'] : RC_LEVEL[v.level], P = x.people, pp = v.people;
  const alt = v.month && v.month.fileName && ymKey(v.month.fileName.y, v.month.fileName.m) !== ymKey(v.month.y, v.month.m) ? ymKey(v.month.fileName.y, v.month.fileName.m) : '';
  const monthL = K.monthly && v.month ? `<p class="rmonth"><svg width="14" height="14" aria-hidden="true"><use href="#i-day"/></svg>Month: <b>${esc(ymLabel(k))}</b> <small class="subtle">(from ${esc((v.month.from || []).join(', ').replace('dates', 'its dates').replace('title', 'its title').replace('export', 'the export').replace('file name', 'its name'))})</small></p>` : K.monthly && !v.month ? '<p class="rmonth subtle">No month in it and none in its name: it goes to the month you are working on.</p>' : '';
  const conf = (v.conflicts || []).length ? `<div class="rconf" role="group" aria-label="Which month is it?"><p><svg width="14" height="14" aria-hidden="true"><use href="#i-alert"/></svg>${esc(v.conflicts[0])} Which month is it?</p>${alt ? `<div class="seg"><button type="button" data-rmonth="${i}|${esc(ymKey(v.month.y, v.month.m))}" aria-pressed="${k === ymKey(v.month.y, v.month.m)}">${esc(ymLabel(ymKey(v.month.y, v.month.m)))} (inside)</button><button type="button" data-rmonth="${i}|${esc(alt)}" aria-pressed="${k === alt}">${esc(ymLabel(alt))} (its name)</button></div>` : ''}</div>` : '';
  const lock = k && K.monthly ? [monthLocked(k) && `${ymLabel(k)} is final (${finalBy(k)}): ${routes.includes('history') ? 'adding this file to the history would replace its numbers, so it is not offered first' : 'it is only compared'}.`, !monthLocked(k) && state.history[k] && (state.history[k].tool || state.history[k].auto) && routes.includes('history') && `${ymLabel(k)} was built by the tool: the history keeps the tool's numbers unless you choose to replace them.`].filter(Boolean) : [];
  const ppl = pp && pp.n ? `<p class="rppl"><svg width="14" height="14" aria-hidden="true"><use href="#i-team"/></svg>${plural(pp.n, 'person', 'people')}${pp.withId ? ` · ${pp.withId} with a National ID` : ''}${pp.badIds && (pp.badIds.na || pp.badIds.naErr) ? ` (${[pp.badIds.na && `${pp.badIds.na} 'NA'`, pp.badIds.naErr && `${pp.badIds.naErr} '#N/A'`].filter(Boolean).join(', ')})` : ''}${P ? ` · on the roster: ${P.ids ? `${P.idOn} of ${P.ids} by ID` : ''}${P.ids && P.names ? ', ' : ''}${P.names ? `${P.exact + P.fuzzy} of ${P.names} by name${P.fuzzy ? ` (${P.fuzzy} spelt differently)` : ''}` : ''}` : ''}</p>${P && P.unknown.length ? `<p class="rppl subtle">Not on the roster: ${esc(P.unknown.slice(0, 6).join(', '))}${P.unknown.length > 6 ? ` and ${P.unknown.length - 6} more` : ''}</p>` : ''}` : '';
  const can = routes.filter(r => RC_ROUTE[r].can()), no = routes.filter(r => !RC_ROUTE[r].can());
  const order = x.kind === 'incentiveData' && k && (monthLocked(k) || (state.history[k] && (state.history[k].tool || state.history[k].auto))) ? ['compare', ...can.filter(r => r !== 'compare')].filter(r => can.includes(r)) : can;
  const btns = x.done ? `<p class="rdone"><svg width="14" height="14" aria-hidden="true"><use href="#i-check"/></svg>Sent to ${esc(RC_ROUTE[x.done].l(k))}</p>`
    : `${order.length ? order.map((r, j) => `<button class="btn sm${j ? '' : ' primary'}" data-ruse="${i}|${r}">${j ? '' : 'Use it for: '}${esc(RC_ROUTE[r].l(k))}</button>`).join('') : ''}${no.length && !order.length ? `<small class="subtle">${esc(RC_ROUTE[no[0]].l(k))} is not one of your pages${RC_ROUTE[no[0]].who ? `: ${esc(RC_ROUTE[no[0]].who)}` : ''}.</small>` : ''}`;
  const kinds = Object.entries(Recog.KINDS).filter(([kk]) => kk !== 'unknown');
  return `<article class="rcard${x.done ? ' done' : ''}" data-ri="${i}"><div class="rch"><svg width="18" height="18" aria-hidden="true"><use href="#i-file"/></svg><div class="rcn"><b dir="auto">${esc(x.file.name)}</b><small>${esc(fmtSize(x.file.size || 0))}${v.sheets && v.sheets.length ? ` · ${plural(v.sheets.filter(s => !s.hidden).length, 'sheet')}` : ''}</small></div><span class="pill ${lcls}">${esc(lvl)}</span></div>
    <p class="rlead">${x.kind === 'unknown' ? 'The tool does not know this file.' : `This looks like <b>${esc(K.label)}</b>.`}</p>
    ${!chosen && v.reasons.length ? `<ul class="rwhy">${v.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
    ${monthL}${conf}${lock.map(t => `<p class="rlock"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock"/></svg>${esc(t)}</p>`).join('')}${ppl}
    <div class="ractions">${btns}</div>
    ${x.done ? '' : `<label class="relse"><span>It's something else:</span><select class="cell" data-rkind="${i}" aria-label="What this file is"><option value="">Choose…</option>${kinds.map(([kk, o]) => `<option value="${kk}"${chosen && kk === x.kind ? ' selected' : ''}>${esc(o.label[0].toUpperCase() + o.label.slice(1))}</option>`).join('')}</select></label>`}</article>`;
}
function renderRecog() {
  const L = state.recog, el = $('recogBody'); if (!el) return;
  const left = L.filter(x => !x.done).length;
  $('recogSub').textContent = L.length ? `${plural(L.length, 'file')}${left && left < L.length ? ` · ${left} still to place` : ''}` : '';
  el.innerHTML = `${L.map(recogCardHtml).join('')}<p class="rnote"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock"/></svg>${esc(RECOG_NOTE)}${Object.keys(recogLearned()).length ? ` It remembers ${plural(Object.keys(recogLearned()).length, 'choice')} by the shape of the columns only. <button class="linkbtn" data-rforget>Forget what I taught it</button>` : ''}</p>`;
}
/** the file goes to the page that takes it (the handlers that already exist) */
async function recogUse(i, route) {
  const x = state.recog[i]; if (!x || !RC_ROUTE[route]) return;
  if (!RC_ROUTE[route].can()) { toast('Not one of your pages.'); return; }
  const f = x.file, k = rcMonthOf(x), v = x.v;
  if (x.kind !== v.kind && v.fp) recogLearn(v.fp, x.kind);
  x.done = route; renderRecog();
  impLogAdd('info', `${f.name}: ${(Recog.KINDS[x.kind] || Recog.KINDS.unknown).label} → ${RC_ROUTE[route].l(k)}`);
  if (state.recog.every(y => y.done)) closeDrawer();
  try {
    if (route === 'import' || route === 'ids' || route === 'attendance') { if (state.ws !== 'build') setWs('build'); if (state.step !== 'import') setStep('import'); await addFiles([f], { recog: { ...v, kind: route === 'attendance' ? 'attendance' : route === 'ids' ? 'ids' : v.kind }, force: true }); return; }
    if (route === 'history') { await addHistoryFiles([f]); return; }
    if (route === 'compare') { await cmpFiles([f], k || ''); return; }
    if (route === 'email') { if (state.ws !== 'build') setWs('build'); setStep('email'); await loadWorkbook(f); return; }
    if (route === 'quality') { const ok = await tryEvalFile({ name: f.name, file: f }, null, k || undefined); if (!ok) toast(`${f.name} could not be read as the Final EVAL.`); else if (wsOfNow().includes('quality') && state.ws !== 'quality') setWs('quality'); return; }
    if (route === 'kpi') { const notes = []; if (await tryKpiFile({ name: f.name, file: f }, notes)) { refresh(); toast(`KPI file for ${ymLabel(monthKey())}: ${notes[0].kpi}`); } else toast(`${f.name} could not be read as the KPI file.`); return; }
    if (route === 'roster') { await importRosterFile(f, { recog: x.kind }); return; }
    if (route === 'distribution') { if (/\.msg$/i.test(f.name)) await importDistributionMsg(f); else { const sheets = await parseRaw(f.name, await f.arrayBuffer()), rows = (sheets[0] && sheets[0].rows) || []; showDistribution(distributionPairs(rows), f.name); } return; }
    if (route === 'inter') { await importInteractions(f); return; }
    if (route === 'rb') { state.wfmTab = 'builder'; if (state.ws !== 'wfm') setWs('wfm'); else renderWs(); await rbAddFiles([f]); return; }
    if (route === 'scorecards') { renderScore(); openDrawer('dScore'); return; }
    if (route === 'logo') { await setLogoFile(f); return; }
    if (route === 'rbHistory') { await rbImportHistory(f); }
  } catch (e) { toast(`${f.name}: ${(e && e.message) || 'it could not be used there'}.`); }
}
$('recogBody').addEventListener('click', e => {
  const u = e.target.closest('[data-ruse]'); if (u) { const [i, r] = u.dataset.ruse.split('|'); recogUse(+i, r); return; }
  const m = e.target.closest('[data-rmonth]'); if (m) { const [i, k] = m.dataset.rmonth.split('|'), x = state.recog[+i]; if (x) { x.month = k; renderRecog(); const b = $('recogBody').querySelector(`[data-rmonth="${i}|${k}"]`); if (b) b.focus(); } return; }
  if (e.target.closest('[data-rforget]')) recogForget();
});
$('recogBody').addEventListener('change', e => {
  const s = e.target.closest('[data-rkind]'); if (!s || !s.value) return;
  const i = +s.dataset.rkind, x = state.recog[i]; if (!x) return;
  x.kind = s.value; renderRecog(); const n = $('recogBody').querySelector(`[data-rkind="${i}"]`); if (n) n.focus();
});
// Search: Recognise a file; Import's What to drop: Not sure?
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-recogpick]')) { e.preventDefault(); recogPick(); } });

// ---------------------------------------------------------------- dropping anywhere: one quiet layer says what will happen
const DROP_ZONES = '#drop, #wbDrop, [data-hdrop], [data-cmpdrop], [data-rbdrop], [data-interdrop], [data-qdropzone], [data-pdrop]';
let dropDepth = 0;
const dropShow = on => { const el = $('dropAll'); if (!el) return; if (on) { $('dropAllText').textContent = state.ws === 'build' && state.step === 'import' ? 'Drop all the month\'s files: each one is recognised and goes to its place' : 'Drop to recognise · nothing leaves this computer'; } el.hidden = !on; };
const dropOk = e => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files') && $('lock').hidden && Auth.user());
window.addEventListener('dragenter', e => { if (!dropOk(e)) return; dropDepth++; dropShow(!(e.target.closest && e.target.closest(DROP_ZONES))); });
window.addEventListener('dragover', e => { if (!dropOk(e)) return; const z = e.target.closest && e.target.closest(DROP_ZONES); dropShow(!z); });
window.addEventListener('dragleave', () => { dropDepth = Math.max(0, dropDepth - 1); if (!dropDepth) dropShow(false); });
window.addEventListener('drop', () => { dropDepth = 0; dropShow(false); }, true);
