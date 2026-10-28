// ================================================================ SUPERVISORS: the senior manager's cycle for each month
// The one-to-one deadline, which supervisors have finished their team (with a notification when one does), the supervisors'
// scorecards, and the month's four emails as ready-to-send Outlook drafts: one-to-ones ready (to the supervisors), the
// deadline reminder (to those not finished), the results for review ("Hi All", the people on the incentive list who earned it)
// and the final result form (his own form: the title, the red header, each person's final %, the month's total and the table the
// VP, HR, Finance and the CEO sign). The incentive list (who is on those two) is kept here and can be changed by hand.
// No logo and no name under the emails: Outlook adds the company signature.
Object.assign(state, { cycleSeenPrev: null, scEdit: false, ctEdit: false, incList: null, incOpen: false });

// ---------------------------------------------------------------- notifications: a supervisor finished
const seenKey = () => `mc-cycle-seen:${(Auth.user() || {}).id || ''}`;
const seenAt = () => lsGet(seenKey()) || '';
let doneLoaded = false;
function notifyDone(before, after) {
  const first = !doneLoaded; doneLoaded = true;
  if (first || !canCycle()) { cycleBadge(); return; }
  for (const [id, d] of Object.entries(after)) if (!before[id] && d) toast(`${d.name || 'A supervisor'} finished the team for ${ymLabel(d.k)}: ${d.held}/${d.n} one-to-ones held.`, { label: 'Open', fn: () => { state.wsMonth = d.k; setWs('cycle'); } });
  cycleBadge();
}
function unseenDone() { const t = seenAt(); return Object.values(state.spvDone || {}).filter(d => d && d.at && d.at > t); }
function cycleBadge() {
  const b = $('wsSeg') && $('wsSeg').querySelector('[data-ws="cycle"]'); if (!b) return;
  const n = canCycle() && state.ws !== 'cycle' ? unseenDone().length : 0;
  let dot = b.querySelector('.wsdot'); if (!n) { if (dot) dot.remove(); return; }
  if (!dot) { dot = document.createElement('span'); dot.className = 'wsdot'; b.appendChild(dot); }
  dot.textContent = n; dot.setAttribute('aria-label', `${n} new`);
}

// ---------------------------------------------------------------- the month's cycle record (the senior manager writes it)
const cycleOf = k => state.cycles[k] || { k };
async function cycleUpdate(k, fn, what) {
  if (!state.db || !canCycle()) return;
  let cur = null; try { const s = await state.db.doc('cycle/' + k).get(); cur = s.exists ? s.data() : null; } catch (e) { cur = state.cycles[k] || null; }
  const next = JSON.parse(JSON.stringify(cur || { k })); fn(next); next.k = k; next.at = new Date().toISOString(); next.by = whoNow();
  state.cycles[k] = next;
  await queueWrite('cycle/' + k, () => state.db.doc('cycle/' + k).set(next));
  if (what) logCycle(k, what);
  renderWs();
}
/** supervisors with their progress for a month */
function cycleRows(k) {
  return spvList().map(s => {
    const team = teamOf(s.pid).filter(p => p.status !== 'Inactive'), st = team.map(p => oneStatus(p._id, k));
    const held = st.filter(x => x.st === 'held' || x.st === 'closed').length, signed = st.filter(x => x.o && sigState(x.o) === 'signed').length;
    const done = state.spvDone[`${k}_${s.pid}`] || null, sc = spvScore(s.pid, k), p = state.roster.find(x => x._id === s.pid);
    return { ...s, team, held, signed, done, sc, email: p ? normSpace(p.email) : '' };
  });
}

// ---------------------------------------------------------------- the page: the month close, or the incentive email (two tabs)
function renderCycle() {
  const k = wsMonthNow(), C = cycleOf(k), can = canCycle(), mail = can && state.cycTab === 'mail';
  if (state.cycleSeenPrev == null) state.cycleSeenPrev = seenAt();
  const tabs = can ? `<div class="seg cyctabs" role="group" aria-label="Part of the page"><button data-cyctab="close" aria-pressed="${!mail}">Month close</button><button data-cyctab="mail" aria-pressed="${mail}">Incentive email</button></div>` : '';
  $('cycMail').hidden = !mail || !k; $('cycleBody').hidden = mail && !!k; $('cycLead').textContent = cycLeadText(roleNow(), mail);
  if (mail) {
    $('cycleBar').innerHTML = `${tabs}${monthSelHtml(k, 'data-wsmonth')}`;
    if (!k) { mountMail(false); $('cycleBody').innerHTML = emptyCard('No months yet', 'The incentive email is for a month the WFM team has built.'); return; }
    mountMail('cyc'); renderEmail(); return;
  }
  mountMail(false);
  $('cycleBar').innerHTML = `${tabs}${monthSelHtml(k, 'data-wsmonth')}${k ? `<label class="wsfield"><span>One-to-ones due</span><input type="date" class="cell" data-deadline value="${esc(C.deadline || '')}" ${can ? '' : 'disabled'} aria-label="Deadline for the one-to-ones"></label>` : ''}
    <div class="wsacts">${can && k ? '<button class="btn sm" data-cyc="publish" title="Copy each agent\'s latest numbers and forms to their own page">Update the agents\' pages</button>' : ''}<button class="btn sm" data-rulesopen title="KPIs, weights, bands, bases and who earns the incentive, in force from a month">Incentive rules</button><button class="btn sm" data-x="cycle"${k ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Supervisors Excel</button></div>`;
  const body = $('cycleBody');
  if (!k && stillReading()) { body.innerHTML = emptyCard('Reading the shared data…', 'The months appear here in a moment.'); return; }
  if (!k) { body.innerHTML = emptyCard('No months yet', 'The month appears here as soon as the WFM team starts building it.'); return; }
  const R = cycleRows(k), doneN = R.filter(r => r.done).length, prev = state.cycleSeenPrev;
  const dl = C.deadline, days = dl ? Math.ceil((new Date(dl + 'T23:59:59') - Date.now()) / 86400000) : null;
  // notifications
  const fresh = R.filter(r => r.done && r.done.at > prev), notYet = R.filter(r => !r.done);
  const notes = `<div class="card notecard"><div class="cardhead"><div><h2>Notifications</h2><p class="cap">${doneN} of ${R.length} supervisors finished their team for ${esc(ymLabel(k))}.${dl ? ` One-to-ones due ${esc(Forms.fmtDate(dl))}${days < 0 ? `, ${plural(-days, 'day')} ago` : days === 0 ? ', today' : `, in ${plural(days, 'day')}`}.` : ' No deadline set yet: choose one above.'}</p></div>${fresh.length ? '<button class="btn sm" data-cyc="seen">Mark as read</button>' : ''}</div>
    <ul class="ilist notes">${fresh.map(r => `<li class="new"><span class="nm">${esc(r.name)} finished the team</span><span class="sg">${esc(fmtWhen(r.done.at))} · ${r.done.held}/${r.done.n} one-to-ones · ${r.done.signed || 0} signed by the agent</span></li>`).join('')}
    ${R.filter(r => r.done && !(r.done.at > prev)).map(r => `<li><span class="nm">${esc(r.name)} finished the team</span><span class="sg">${esc(fmtWhen(r.done.at))} · ${r.done.held}/${r.done.n} one-to-ones</span></li>`).join('')}
    ${notYet.length ? `<li class="${dl && days < 0 ? 'late' : ''}"><span class="nm">Not finished yet: ${esc(notYet.map(r => r.name).join(', '))}</span><span class="sg">${dl && days < 0 ? 'past the deadline' : dl ? 'before the deadline' : ''}</span></li>` : ''}</ul></div>`;
  // progress and scorecards
  const card = spvCardNow(), its = card.items, base = +card.base || 0;
  const manual = its.filter(it => it.src === 'manual');
  const prog = `<div class="card"><div class="cardhead"><div><h2>Supervisor results · ${esc(ymLabel(k))}</h2><p class="cap">One-to-ones held and signed per team, whether the supervisor pressed Finish, and their scorecard.${manual.length && can ? ' Type the values of the items you score yourself.' : ''}</p></div></div>
    <div class="tablewrap restab"><table><thead><tr><th>Supervisor</th><th class="r">Agents</th><th class="r">One-to-ones</th><th class="r">Signed</th><th>Finished</th>${its.map(it => `<th class="r" title="${esc(it.name)} · ${+(it.weight * 100).toFixed(1)}%">${esc(it.name.length > 18 ? it.name.slice(0, 17) + '…' : it.name)}</th>`).join('')}<th class="r">Final</th>${base ? '<th class="r">Earned SR</th>' : ''}</tr></thead><tbody>
    ${R.map(r => `<tr><td><button class="linkbtn nm" data-cyc="team" data-spv="${esc(r.pid)}">${esc(r.name)}</button>${r.email ? '' : ' <span class="pill warn" title="No email in the roster">no email</span>'}</td><td class="r">${r.team.length}</td><td class="r">${progress(r.held, r.team.length)}</td><td class="r num">${r.signed}</td>
      <td>${r.done ? `<span class="pill good">${esc(fmtWhen(r.done.at))}</span>` : `<span class="pill${dl && days < 0 ? ' bad' : ''}">Not yet</span>`}</td>
      ${r.sc.items.map(x => `<td class="r">${x.it.src === 'manual' && can ? `<input class="cell man" data-man="${esc(r.pid)}" data-it="${esc(x.it.id)}" value="${x.v == null ? '' : spvItemUnit(x.it) === 'pct' ? +(x.v * 100).toFixed(2) : x.v}" inputmode="decimal" placeholder="–" aria-label="${esc(x.it.name)} for ${esc(r.name)}">` : `<span class="num">${esc(spvItemFmt(x.it, x.v))}</span>`} ${x.r != null ? rankChip(x.r) : ''}</td>`).join('')}
      <td class="r num"><b>${pct1(r.sc.finalPct)}</b></td>${base ? `<td class="r num">${r.sc.earned == null ? '–' : r.sc.earned.toLocaleString('en-US')}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${6 + its.length}" class="empty">No supervisors yet: fill the Supervisor column in the roster.</td></tr>`}
    </tbody></table></div></div>`;
  // the four emails
  const sent = C.sent || {}, sentTxt = x => (sent[x] ? `Prepared ${esc(fmtWhen(sent[x].at))}${sent[x].by ? ' by ' + esc(sent[x].by) : ''}` : 'Not prepared yet');
  const incSent = x => (sent[x] ? `${esc(sent[x].how || 'Prepared')} ${esc(fmtWhen(sent[x].at))}${sent[x].by ? ' by ' + esc(sent[x].by) : ''}` : 'not prepared yet');
  const mailCard = `<div class="card"><div class="cardhead"><div><h2>Emails for ${esc(ymLabel(k))}</h2><p class="cap">Each one downloads as an Outlook draft (.eml): open it, check it and press Send. Addresses come from the roster's Email column and the contacts below.</p></div></div>
    <div class="mailgrid4">
      <div class="m4"><b>Incentive data</b><span>To the champions: the incentive file the WFM analysts built (attendance, adherence and AHT, without National IDs) for review with its deadline, then the final after the review with what changed.</span><small>For review: ${incSent('incReview')} · Final: ${incSent('incFinal')}</small><button class="btn sm" data-cyctab="mail"${can ? '' : ' disabled'}>Open the email</button></div>
      <div class="m4"><b>One-to-ones are ready</b><span>To every supervisor, with the deadline and each team's numbers.</span><small>${sentTxt('ready')}</small><button class="btn sm primary" data-mail4="ready"${can ? '' : ' disabled'}>Make the email</button></div>
      <div class="m4"><b>Deadline reminder</b><span>To the ${plural(notYet.length, 'supervisor')} not finished yet.</span><small>${sentTxt('warn')}</small><button class="btn sm" data-mail4="warn"${can && notYet.length ? '' : ' disabled'}>Make the email</button></div>
      <div class="m4"><b>Results for review</b><span>To ${esc(splitAddr(contactsNow().vp).map(x => x.replace(/\s*<.*$/, '')).join(', ') || 'the VP')}: “Hi All”, with the ID, name, final % and earned SR of everyone on the incentive list who earned it, and the same table as an Excel file.</span><small>${sentTxt('review')}</small><button class="btn sm" data-mail4="review"${can ? '' : ' disabled'}>Make the email</button></div>
      <div class="m4"><b>Final result form</b><span>To ${esc(splitAddr(contactsNow().form).map(x => x.replace(/\s*<.*$/, '')).join(', ') || 'the WFM manager')}: everyone on the incentive list with their final % and earned SR, the month's total, the table the VP, HR, Finance and the CEO sign, and the same form as an Excel file.${monthLocked(k) ? '' : ' Finalize the month on Results first.'}</span><small>${sentTxt('final')}</small><button class="btn sm" data-mail4="final"${can ? '' : ' disabled'}>Make the email</button></div>
    </div></div>`;
  // scorecard editor and contacts
  const editor = can ? `<details class="card sced"${state.scEdit ? ' open' : ''} data-det="sc"><summary>Supervisor scorecard · ${plural(its.length, 'item')} · weights ${+(its.reduce((a, it) => a + (+it.weight || 0), 0) * 100).toFixed(1)}%</summary>${scEditorHtml(card)}</details>` : '';
  const C0 = contactsNow();
  const contacts = can ? `<details class="card"${state.ctEdit ? ' open' : ''} data-det="ct"><summary>Email addresses</summary><div class="grid2 tight">
    ${[['vp', 'VP (results for review)'], ['form', 'Final result form (to)'], ['senior', 'Senior manager (gets the supervisors\' "done" emails)'], ['mgmt', 'Management team (in copy)'], ['wfm', 'WFM (in copy of the supervisors\' emails)']].map(([f, l]) => `<div class="field"><span class="lbl">${esc(l)}</span><input class="cell" data-contact="${f}" value="${esc(C0[f] || '')}" spellcheck="false" placeholder="Name <name@company.com>"></div>`).join('')}
    <div class="field"><span class="lbl">Final result form: who signs (one per line: name | designation)</span><textarea class="cell" data-signers rows="4" spellcheck="false">${esc(signersNow().map(x => x.join(' | ')).join('\n'))}</textarea></div></div>
    <p class="hint">Supervisors' and agents' addresses come from the roster's Email column.</p></details>` : '';
  body.innerHTML = `${statusBanner(k)}${safeHtml(spvDoneHtml, k)}${notes}${safeHtml(objSeniorHtml, k)}${mailCard}${can ? safeHtml(incListHtml, k) : ''}${prog}${editor}${contacts}${safeHtml(calDaysHtml)}`;
  if (canCycle() && unseenDone().length && state.ws === 'cycle') { lsSet(seenKey(), new Date().toISOString()); cycleBadge(); }
  reveal(body);
}

// ---------------------------------------------------------------- the incentive email: the senior manager's, to the champions
// The incentive data email (for review, then final after the review) is sent from Supervisors › Incentive email with the incentive
// file the WFM analysts build (WFM team › Export › Build incentive file). Each build is kept with the shared data (Saved workbooks),
// so the month's newest file shows here by itself and is attached without the National IDs; a file dropped here is used instead.
// The email itself is the one the WFM team page had (#v-email), moved into this page.
Object.assign(state, { cycTab: 'close', incK: '' });
const INCS = { k: '', list: null, busy: false, err: '' };   // the incentive files the WFM team saved for the month on the page
/** the month's saved incentive files, the newest first; the newest is used unless a file was dropped for the email */
async function incSavedLoad(k) {
  if (!k) return;
  INCS.busy = true; INCS.err = '';
  try {
    const L = (await upListNow('rep')).filter(m => m && m.kind === 'incentive' && m.k === k).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    if (INCS.k !== k) return;   // the page moved on to another month meanwhile
    INCS.list = L;
    const m = L[0], w = state.incWb;
    if (m && (!w || w.saved) && !(w && w.saved.id === m.id)) {
      const bytes = await upBytes(m.id, 'rep'); if (!bytes) throw new Error(`${m.name} could not be read`);
      const rows = readIncentive(await parse(m.name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), true));
      if (rows.error) throw new Error(rows.error);
      if (INCS.k !== k) return;
      state.incWb = { name: m.name, size: m.size || bytes.length, bytes, rows, saved: { id: m.id, k, at: m.at, by: m.by } };
      state.mailSubjects = {}; state.mailDeadline = null;
    } else if (!m && w && w.saved) state.incWb = null;
  } catch (e) { INCS.err = errText(e); }
  finally { INCS.busy = false; }
  if (state.ws === 'cycle' && state.cycTab === 'mail') { lastMailHtml = ''; renderEmail(); }
}
/** the email moved into this page: the incentive email of the page's month (a new month: its saved file is read; the tab opened
    again: a newer file is looked for) */
function incMailSync(opened) {
  const k = wsMonthNow();
  state.mailKind = 'inc'; state.mailSrc = ''; state.incK = k;
  if (INCS.k !== k) { INCS.k = k; INCS.list = null; INCS.err = ''; delete state.revWb.inc; if (state.incWb) { state.incWb = null; state.mailSubjects = {}; state.mailDeadline = null; } incSavedLoad(k); }
  else if (opened && !INCS.busy) incSavedLoad(k);
}
/** the Data card of the incentive email: the file the WFM team saved, a dropped one, or none yet */
function incSrcHtml(w) {
  const cnt = x => `${x.rows.y ? `${MONTH_LONG[x.rows.m - 1]} ${x.rows.y} · ` : ''}${plural(x.rows.att.length, 'person', 'people')} in the Attendance Report · ${x.rows.adh.length} in Adherence · ${x.rows.aht.length} in AHT`;
  const saved = INCS.k && INCS.k === state.incK && INCS.list && INCS.list[0], page = !!state.ctx && (!state.incK || state.incK === monthKey());
  if (w && w.saved) return `<div class="row"><span class="pill good">Saved by the WFM team</span><b style="overflow-wrap:anywhere">${esc(w.name)}</b></div><div class="hint">${esc(cnt(w))}. Built by ${esc(w.saved.by || 'the WFM team')}, ${esc(fmtWhen(w.saved.at))}. Drop an edited file to use it instead.</div><div><button class="linkbtn" data-increcheck>Look for a newer file</button></div>`;
  if (w) return `<div class="row"><span class="pill good">Workbook</span><b style="overflow-wrap:anywhere">${esc(w.name)}</b></div><div class="hint">${esc(cnt(w))}</div><div>${saved ? `<button class="linkbtn" data-incsaved>Use the file the WFM team saved instead</button>` : page ? '<button class="linkbtn" data-wbclear="inc">Use the data from this page instead</button>' : ''}</div>`;
  if (state.incK && INCS.busy) return '<div class="row"><span class="spin" aria-hidden="true"></span>Looking for the incentive file the WFM team saved…</div>';
  if (state.incK && !page) return `<div class="row"><span class="pill warn">No incentive file yet</span></div><div class="hint">${INCS.err ? `The saved file could not be read (${esc(INCS.err)}). ` : ''}The WFM analysts make it for ${esc(ymLabel(state.incK))} on WFM team › Export (Build incentive file). It is kept with the shared data and shows here by itself; or drop the file here.</div><div><button class="linkbtn" data-increcheck>Look again</button></div>`;
  return '<div class="row"><span class="pill info">This page</span>Exports and attendance files</div><div class="hint">The workbook is made from them when you send. Drop an edited incentive workbook to use it instead.</div>';
}
/** the incentive email was copied or downloaded: the month's emails on the Supervisors page say so, with who and when */
function incMailSent(k, stage, how) {
  if (!canCycle() || !k) return;
  const kind = stage === 'final' ? 'incFinal' : 'incReview';
  cycleUpdate(k, c => { c.sent = { ...(c.sent || {}), [kind]: { at: new Date().toISOString(), by: whoNow(), how: how || 'Copied' } }; }, `${how || 'Copied'} the incentive data email (${stage === 'final' ? 'final' : 'for review'})`);
}
/** Supervisors › Incentive email, from anywhere (a tile, the search, a dropped incentive file) */
function openIncMail(stage) {
  if (!canCycle()) { toast('The senior manager sends the incentive email.'); return; }
  if (stage) state.mailStage = stage;
  state.cycTab = 'mail'; if (state.ws !== 'cycle') setWs('cycle'); else renderWs();
}

// ---------------------------------------------------------------- the supervisor scorecard editor
function scEditorHtml(card) {
  const KI = [...KPI_INDEX().values()], MT = History.METRICS.filter(m => !m.wf || ['wfExc', 'occ'].includes(m.k));
  const keyOpts = it => it.src === 'team' ? MT.map(m => `<option value="${m.k}"${m.k === it.key ? ' selected' : ''}>${esc(m.label)}</option>`).join('')
    : it.src === 'kpi' ? KI.map(k => `<option value="${esc(k.id)}"${k.id === it.key ? ' selected' : ''}>${esc(k.name)}</option>`).join('')
      : it.src === 'lead' ? LEADER_ITEMS.map(([id, l]) => `<option value="${id}"${id === it.key ? ' selected' : ''}>${esc(l)}</option>`).join('')
        : it.src === 'follow' ? FOLLOW_ITEMS.map(([id, l]) => `<option value="${id}"${id === (it.key || 'done') ? ' selected' : ''}>${esc(l)}</option>`).join('') : '';
  const unit = it => spvItemUnit(it), bv = (it, v) => (v == null || v === '' ? '' : unit(it) === 'pct' ? +(v * 100).toFixed(3) : v);
  const rows = card.items.map((it, i) => `<tr data-sci="${i}"><td><input class="cell" data-scf="name" value="${esc(it.name)}" aria-label="Item name"></td>
    <td><select class="cell" data-scf="src" aria-label="Where the value comes from">${SPV_SRC.map(([v, l]) => `<option value="${v}"${v === it.src ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${keyOpts(it) ? `<select class="cell" data-scf="key" aria-label="Which">${keyOpts(it)}</select>` : ''}</td>
    <td class="r"><input class="cell w" data-scf="weight" value="${+(it.weight * 100).toFixed(2)}" inputmode="decimal" aria-label="Weight %"></td>
    <td>${it.src === 'lead' ? `<span class="hint">Full marks at</span> <input class="cell w" data-scf="max" value="${+((it.max || 0) * 100).toFixed(2)}" inputmode="decimal" aria-label="Full marks %">%` : `<select class="cell" data-scf="dir" aria-label="Better when">${[['high', 'Higher is better'], ['low', 'Lower is better']].map(([v, l]) => `<option value="${v}"${(it.dir || 'high') === v ? ' selected' : ''}>${l}</option>`).join('')}</select> ${[0, 1, 2, 3].map(j => `<input class="cell b" data-scb="${j}" value="${esc(bv(it, (it.bands || [])[j]))}" inputmode="decimal" placeholder="–" aria-label="Rank ${5 - j}" title="Rank ${5 - j}${unit(it) === 'pct' ? ' (%)' : unit(it) === 'sec' ? ' (seconds)' : ''}">`).join('')}`}</td>
    <td><button class="btn sm ghost danger-text" data-scdel aria-label="Remove ${esc(it.name)}">Remove</button></td></tr>`).join('');
  const w = card.items.reduce((a, it) => a + (+it.weight || 0), 0);
  return `<p class="cap">Each item is ranked 1 to 5 from its bands (5 = the first band), like the agents' KPIs; a leader item counts the share of its full marks the lead earned. The final is the weighted average of the items that have a value.</p>
    <div class="tablewrap formtab sctab"><table><thead><tr><th>Item</th><th>Value</th><th class="r">Weight %</th><th>Bands: rank 5, 4, 3, 2</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="formbtns"><button class="btn sm" data-scadd>Add an item</button><button class="btn sm ghost" data-screset>Back to the default</button><label class="wsfield"><span>Incentive base (SR, 0 = none)</span><input class="cell w" data-scbase value="${+card.base || 0}" inputmode="numeric"></label><span class="${Math.abs(w - 1) > 0.001 ? 'bad' : 'hint'}">Weights add up to ${+(w * 100).toFixed(1)}%${Math.abs(w - 1) > 0.001 ? ', not 100%' : ''}.</span></div>`;
}
let scTimer = 0;
function saveSpvCard(card, what) {
  state.spvCard = card;
  clearTimeout(scTimer);
  scTimer = setTimeout(() => { if (state.db) queueWrite('config/spvcard', () => state.db.doc('config/spvcard').set({ ...card, at: new Date().toISOString(), by: whoNow() })).catch(() => {}); if (what) logCycle(wsMonthNow(), what); }, 500);
  renderWs();
}
const scClone = () => JSON.parse(JSON.stringify(spvCardNow()));

// ---------------------------------------------------------------- the four emails
const supEmails = L => L.map(r => (r.email ? `${r.name} <${r.email}>` : '')).filter(Boolean);
function resultsList(k, onlyEligible) {
  const map = rowsByPid(k), out = [], used = new Set();
  for (const p of rosterRows()) { const r = map.get(p._id); if (!r) continue; used.add(rowKey(r)); out.push({ p, r }); }
  for (const r of liveRows(k)) if (!used.has(rowKey(r))) out.push({ p: null, r });
  return out.filter(x => x.r.fin != null || x.r.earned != null).filter(x => !onlyEligible || (x.r._el ? x.r._el.ok : true) && (x.r.earned || 0) > 0)
    .map(x => ({ id: Core.cleanId(x.p ? (effP(x.p._id) || x.p).nid : x.r.id) || idText(x.r.id), name: x.p ? normSpace(x.p.name) : x.r.n, brand: x.p ? x.p.brand : x.r.brand, team: x.p ? x.p.team : x.r.team, spv: x.p ? supName(x.p.spv) : '', fin: x.r.fin, earned: x.r.earned, el: x.r._el || null, adj: x.r._adj || null }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
async function mail4(kind) {
  const k = wsMonthNow(); if (!k || !canCycle()) return;
  const C = cycleOf(k), dl = C.deadline, R = cycleRows(k), con = contactsNow(), me = whoNow(), M = ymLabel(k);
  const sign = mP('Thanks and regards,');   // the name and the logo come with the Outlook signature
  let ok = false;
  if (kind === 'ready') {
    if (!dl) { toast('Set the deadline first (One-to-ones due, above).'); $('cycleBar').querySelector('[data-deadline]').focus(); return; }
    const to = supEmails(R); if (!to.length) toast('No supervisor has an email in the roster yet: the draft has no recipient.');
    const rows = R.map(r => { const map = rowsByPid(k), L = r.team.map(p => map.get(p._id)).filter(Boolean); return [esc(r.name), String(r.team.length), pct1(mean(L.map(x => x.fin))), pct(mean(L.map(x => x.adh)), 1)]; });
    const html = mP('Dear Team Leaders,') + mP(`The <b>${esc(M)}</b> results are ready in the MC tool. Please hold the one-to-one with each of your agents and record it in the tool by <b>${esc(Forms.fmtDate(dl))}</b>. Agents with an account read and sign their form on their own page.`)
      + mP('When your whole team is done, press <b>Finish my team</b> on your Team page; I am told straight away.') + mTable(['Team leader', 'Agents', 'Team final %', 'Team adherence'], rows, ['', 'r', 'r', 'r']) + sign;
    ok = await saveEml(`One-to-ones ready - ${M}`, { to, cc: splitAddr(con.wfm), subject: `MC ${M} | One-to-ones are ready (deadline ${Forms.fmtDate(dl)})`, html });
  }
  if (kind === 'warn') {
    const L = R.filter(r => !r.done); if (!L.length) { toast('Every supervisor has finished.'); return; }
    const to = supEmails(L); if (!to.length) toast('These supervisors have no email in the roster: the draft has no recipient.');
    const days = dl ? Math.ceil((new Date(dl + 'T23:59:59') - Date.now()) / 86400000) : null;
    const html = mP('Dear Team Leaders,') + mP(`A reminder that the <b>${esc(M)}</b> one-to-ones are ${dl ? (days < 0 ? `<b>overdue since ${esc(Forms.fmtDate(dl))}</b>` : `due on <b>${esc(Forms.fmtDate(dl))}</b>${days <= 1 ? ' (tomorrow at the latest)' : ''}`) : 'due'}. Your team is not finished in the MC tool yet:`)
      + mTable(['Team leader', 'One-to-ones held', 'Signed by the agent'], L.map(r => [esc(r.name), `${r.held} of ${r.team.length}`, String(r.signed)]), ['', 'r', 'r'])
      + mP('Please finish them and press <b>Finish my team</b> on your Team page.') + sign;
    ok = await saveEml(`Deadline reminder - ${M}`, { to, cc: splitAddr(con.wfm), subject: `Reminder | ${M} one-to-ones ${dl ? (days < 0 ? 'overdue' : `due ${Forms.fmtDate(dl)}`) : 'due'}`, html });
  }
  if (kind === 'final') {
    const L = incRows(k).filter(x => x.pid); if (!L.length) { toast('The incentive list is empty: add the people below.'); return; }
    if (!monthLocked(k)) toast(`${M} is not final yet: these are today's numbers. Finalize it on Results so they cannot change.`);
    const none = L.filter(x => !x.has); if (none.length) setTimeout(() => toast(`No result in ${M} for ${none.slice(0, 4).map(x => x.name).join(', ')}${none.length > 4 ? '…' : ''}: their row is empty. Remove them from the incentive list if they should not be on the form.`), 2600);
    const tot = L.reduce((a, x) => a + (finalEarned(x) || 0), 0), title = finalTitle(k), signers = signersNow();   // the total is the column's sum
    let bytes = null; try { bytes = await finalFormXlsx(title, L, tot, signers); } catch (e) { toast('Could not make the Excel file: ' + (e && e.message ? e.message : e)); }
    const to = splitAddr(con.form); if (!to.length) toast('No address for the final result form yet (Email addresses, below): the draft has no recipient.');
    ok = await saveEml(title, { to, cc: [], subject: title, html: finalFormHtml(title, L, tot, signers), files: bytes ? [{ name: `${fileSafe(title)}.xlsx`, bytes }] : [] });
  }
  if (kind === 'review') {   // as the senior manager writes it: "Hi All", the people on the incentive list who earned it
    const L = incRows(k).filter(x => x.pid && (finalEarned(x) || 0) > 0); if (!L.length) { toast(`Nobody on the incentive list has an earned SR for ${M} yet.`); return; }
    const [y, m] = k.split('-').map(Number), label = `${MON[m - 1]} ${y}`;
    let bytes = null; try { bytes = await reviewXlsx(L); } catch (e) { toast('Could not make the Excel file: ' + (e && e.message ? e.message : e)); }
    ok = await saveEml(`Results for review - ${M}`, { to: splitAddr(con.vp), cc: splitAddr(con.mgmt), subject: `MC Incentive ${M} | For review`, html: reviewMailHtml(label, L), files: bytes ? [{ name: `MC Incentive - ${M} - for review.xlsx`, bytes }] : [] });
  }
  if (ok) cycleUpdate(k, c => { c.sent = { ...(c.sent || {}), [kind]: { at: new Date().toISOString(), by: me } }; }, `Prepared the "${{ ready: 'one-to-ones ready', warn: 'deadline reminder', review: 'results for review', final: 'final result form' }[kind]}" email`);
}

// ---------------------------------------------------------------- the incentive list: who is on the results email and the final result form
// The usual list, as on the senior manager's own form; each name is found in the roster and shown as the tool has it (the
// system name). People can be added and removed by hand; once changed, the list is kept in the shared data.
const INC_NAMES0 = ['Abdulaziz Abdulqader Henawi', 'Areej Sebaih', 'Ashraf Abdulrahman Tahir Fallatah', 'Asma Yousef Altwaim', 'Abdulrahman Alasmari', 'Arwa Alamri', 'Sarah Almaddani', 'Saud Alghamdi',
  'Tala Alsharif', 'Ibrahim Almabaadi', 'Basil Mulla', 'Rajwa Ghaith', "Dia'a Hamed Banjar", 'Nawaf AlSulaimani', 'Saleh Al Thubyani', 'Thamer AlQabsani', 'Shaima Alaslani', 'Hadeel Hakami', 'Haneen Fageera',
  'Lamiaa Abdulrahman Battekh', 'Joud Alrefaei', 'Wasan Alalasi', 'Mazen Mohammad Malayo', 'Mazen Naser Mohammed Alskait', 'Nawaf Al Harbi', 'Musab Mohammed Ghazi Al-Otaibi', 'Musab Mubarak',
  'Ohoud Bassam Hussain Abdulmuhsen', 'Omniah Abu Alkhair', 'Rawabi Ahmed', 'Abdullah Alamri', 'Dhari Bin Jarallah', 'Ayman Al Juhani', 'Fahad Khawaji', 'Khaled Zein Aldeen', 'Riaal Basrawi',
  'Subhia Alsubail', 'Tawfiq Hussain Dakel Alobaidi', 'Turki Alshehri', 'Ziyad Abdulaziz Ali Alghamdi'];
const lev1 = (a, b) => { if (a === b) return 0; if (Math.abs(a.length - b.length) > 1) return 2; let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) ? 1 : 2; };
/** first names alike, and the family name found in the other name (spellings differ: Sarah / Sara, Sebaih / Subah) */
function looseScore(a, b) {
  const A = nameToks(a), B = nameToks(b); if (A.length < 2 || B.length < 2 || A[0][0] !== B[0][0]) return 0;
  const near = (x, y) => x === y || (x.length >= 2 && y.length >= 2 && lev1(x, y) <= 1);
  if (!near(nameSkel(A[0]), nameSkel(B[0]))) return 0;
  const lasts = [A[A.length - 1], A.length >= 3 ? A[A.length - 2] + A[A.length - 1] : null].filter(Boolean).map(nameSkel), rest = [];
  for (let i = 1; i < B.length; i++) { rest.push(nameSkel(B[i])); if (i + 1 < B.length) rest.push(nameSkel(B[i] + B[i + 1])); }
  return lasts.some(x => rest.some(y => (x === y ? x.length >= 2 : x.length >= 3 && near(x, y)))) ? 0.8 : 0;
}
function incScore(n, p) {
  const L = [p.name, p.sys].filter(x => normSpace(x));
  if (L.some(x => normName(x) === normName(n))) return 1.01;
  return Math.max(0, ...L.map(x => Math.max(Core.nameScore(n, x), distScore(n, x), looseScore(n, x))));
}
/** a typed name -> the roster person (none when two are equally close: then it is chosen by hand) */
function incMatch(n, R) {
  let best = null, bs = 0, sec = 0;
  for (const p of R) { const sc = incScore(n, p); if (sc > bs) { sec = bs; bs = sc; best = p; } else if (sc > sec) sec = sc; }
  return best && bs >= 0.78 && bs - sec >= 0.05 ? best : null;
}
let incMemo = { sig: '', L: [] };
/** [{ pid, n }]: the people on the list, in order (n: the name as it was typed; pid '' when it is not found yet) */
function incListNow() {
  const S = state.incList; if (S && Array.isArray(S.items)) return S.items.filter(it => it && (it.pid || it.n));
  const sig = `${state.roster.length}|${state.ver}`; if (incMemo.sig === sig) return incMemo.L;
  const R = rosterRows(), used = new Set();
  const L = INC_NAMES0.map(n => { const p = incMatch(n, R.filter(x => !used.has(x._id))); if (p) used.add(p._id); return { pid: p ? p._id : '', n }; });
  incMemo = { sig, L }; return L;
}
function saveIncList(items, what) {
  state.incList = items ? { items, at: new Date().toISOString(), by: whoNow() } : null; incMemo.sig = '';
  if (state.db) queueWrite('config/inclist', () => (items ? state.db.doc('config/inclist').set(state.incList) : state.db.doc('config/inclist').delete())).catch(() => {});
  if (what) logCycle(wsMonthNow(), what);
  renderWs();
}
/** the list's people with their month: ID, name (the system name), final %, earned SR, eligibility */
function incRows(k) {
  const map = k ? rowsByPid(k) : new Map();
  return incListNow().map(it => {
    const p = it.pid ? state.roster.find(x => x._id === it.pid) || null : null, pp = p ? effP(p._id) || p : null, r = p ? map.get(p._id) || null : null;
    return { pid: p ? p._id : '', n: it.n || '', id: pp ? Core.cleanId(pp.nid) || idText(pp.nid) : '', name: pp ? gname(pp) || p.name : it.n || '', brand: p ? p.brand : '', fin: r ? r.fin ?? null : null, earned: r ? r.earned ?? null : null, el: r ? r._el || null : null, has: !!r };
  });
}
function incListHtml(k) {
  const L = incListNow(), map = k ? rowsByPid(k) : new Map(), R = rosterRows(), on = new Set(L.map(x => x.pid).filter(Boolean));
  const nm = p => gname(effP(p._id) || p) || p.name, byNm = (a, b) => nm(a).localeCompare(nm(b));
  const opts = (ph, filt) => `<option value="">${esc(ph)}</option>${R.filter(q => !on.has(q._id) && filt(q)).sort(byNm).map(q => `<option value="${esc(q._id)}">${esc(nm(q))} · ${esc(unitOf(q))}</option>`).join('')}`;
  const rows = L.map((it, i) => {
    const p = it.pid ? state.roster.find(x => x._id === it.pid) : null;
    if (!p) return `<li class="miss" data-inci="${i}"><span class="ix">${i + 1}</span><span class="nm" dir="auto">${esc(it.n || '?')}</span><span class="sg bad">not found in the roster</span><span class="sp"></span><span class="acts"><select class="cell" data-incpick aria-label="Who ${esc(it.n)} is">${opts('Choose who it is…', () => true)}</select><button class="btn sm ghost danger-text" data-incdel>Remove</button></span></li>`;
    const pp = effP(p._id) || p, r = map.get(p._id), x = r ? { el: r._el, earned: r.earned } : null;
    return `<li data-inci="${i}"><span class="ix">${i + 1}</span><span class="nm" dir="auto">${esc(nm(p))}</span><span class="sg">${esc(Core.cleanId(pp.nid) || 'no ID')} · ${esc(unitOf(p))}${k ? ` · ${r ? `${pct(r.fin, 0)} · ${finalEarned(x) == null ? '–' : finalEarned(x).toLocaleString('en-US')} SR` : '<span class="bad">no result this month</span>'}` : ''}</span><span class="sp"></span><span class="acts"><button class="btn sm ghost danger-text" data-incdel aria-label="Remove ${esc(nm(p))}">Remove</button></span></li>`;
  }).join('');
  const miss = L.filter(it => !it.pid).length, n = L.length - miss;
  return `<details class="card inclist"${state.incOpen ? ' open' : ''} data-det="inc"><summary>Incentive list · ${plural(n, 'person', 'people')}${miss ? ` · <span class="bad">${miss} not found</span>` : ''}${state.incList ? ' · changed by hand' : ''}</summary>
    <p class="cap">Who is on the results email (those who earned an incentive) and on the final result form, in this order, with their names as the tool has them (the system names). Add or remove people here.</p>
    <ol class="ilist incl">${rows || '<li class="subtle">Nobody yet.</li>'}</ol>
    <div class="formbtns"><select class="cell" data-incadd aria-label="Add a person">${opts('Add a person…', q => q.status !== 'Inactive')}</select>${state.incList ? '<button class="btn sm ghost" data-increset>Back to the usual list</button>' : ''}</div></details>`;
}
/** the results for review, as the senior manager writes it: "Hi All", the month, the red-header table */
function reviewMailHtml(label, L) {
  const P = t => `<p class="MsoNormal" style="margin:0 0 10.0pt;font-family:Calibri,sans-serif;font-size:11.0pt">${t}</p>`;
  const W = [91.2, 242.65, 134.65, 71.0], B = 'solid windowtext 1.0pt', px = pt => Math.round(pt * 4 / 3);
  const cell = (i, inner, o = {}) => `<td width="${px(W[i])}" nowrap valign="bottom" style="width:${W[i]}pt;border-top:${o.top ? B : 'none'};border-left:${i === 0 ? B : 'none'};border-bottom:${B};border-right:${B};${o.bg ? `background:${o.bg};` : ''}padding:0in 5.4pt 0in 5.4pt;height:${o.h || '.2in'}"><p class="MsoNormal"${o.c ? ' align="center" style="margin:0;text-align:center"' : ' style="margin:0"'}>${inner}</p></td>`;
  const sp = (t, sz, col, b) => `${b ? '<b>' : ''}<span style="font-size:${sz}.0pt;font-family:&quot;Calibri&quot;,sans-serif;color:${col}">${t}</span>${b ? '</b>' : ''}`;
  const head = `<tr style="height:15.6pt">${['ID', 'Name', 'Final %', 'Earned SR'].map((t, i) => cell(i, sp(t, 12, 'white', true), { c: true, bg: '#C00000', h: '15.6pt', top: true })).join('')}</tr>`;
  const rows = L.map(x => `<tr style="height:.2in">${cell(0, sp(esc(x.id), 11, 'black'))}${cell(1, sp(esc(x.name), 11, 'black'))}${cell(2, sp(x.fin == null ? '&nbsp;' : Math.round(x.fin * 100) + '%', 11, 'black'), { c: true })}${cell(3, sp(String(finalEarned(x)), 11, 'black'), { c: true })}</tr>`).join('');
  return P('Hi All,') + P('Hope this email finds you well') + P(`Kindly find attached and below incentive results for all Member Care Staff for <b>${esc(label)} :</b>`)
    + `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="${px(539.5)}" style="width:539.5pt;border-collapse:collapse">${head}${rows}</table><p class="MsoNormal">&nbsp;</p>`;
}
/** the same table as an Excel file */
async function reviewXlsx(L) {
  const S = new Writer2.Styles(), W = new Writer2.Sheet('Sheet1'), K = 'FF000000', box = { l: K, r: K, t: K, b: K };
  const cal = (sz, b, color = K) => ({ name: 'Calibri', sz, b, color });
  const sHead = S.get({ font: cal(12, true, 'FFFFFFFF'), fill: 'FFC00000', border: box, align: { h: 'center' } }), sTxt = S.get({ font: cal(11, false), border: box, align: { h: 'left' } });
  const sPct = S.get({ font: cal(11, false), border: box, align: { h: 'center' }, numFmt: '0%' }), sNum = S.get({ font: cal(11, false), border: box, align: { h: 'center' } });
  [12.43, 36.43, 23, 12.43].forEach((w, i) => W.width(i + 1, w)); W.grid = true;
  ['ID', 'Name', 'Final %', 'Earned SR'].forEach((h, i) => W.set(1, i + 1, h, sHead)); W.heights[1] = 16.5;
  L.forEach((x, j) => { const r = j + 2; W.set(r, 1, finalId(x.id), sTxt); W.set(r, 2, x.name, sTxt); W.set(r, 3, x.fin, sPct); W.set(r, 4, finalEarned(x), sNum); });
  return Writer2.pack([W], S, {}, {});
}

// ---------------------------------------------------------------- the final result form, as the senior manager sends it
// A range pasted from his Excel: "Final result For Aug. 2026 Incentive", the red header (ID, Name, Final %, Earned SR), one row a
// Virgin person with the final % and the earned SR, the month's total in red, then the table the VP, HR, Finance and the CEO sign.
// The same form goes with it as an Excel file (same columns, widths, colours and borders).
const SIGNERS0 = [['Rasha Mogaddam', 'VP-Group Member Care'], ['Ahmed Alremali', 'HR Director'], ['Islam Aref', 'Finance Director'], ['Yaarob AlSayegh', 'CEO']];
function signersNow() { const L = String(contactsNow().signers || '').split('\n').map(l => l.split('|').map(normSpace)).filter(x => x[0]); return L.length ? L.map(x => [x[0], x[1] || '']) : SIGNERS0; }
const signRows = i => (i < 2 ? 2 : 3);   // as in his form: two rows for the first two, three for the others
function finalTitle(k) { const [y, m] = k.split('-').map(Number), mo = MON[m - 1] + (MON[m - 1] !== MONTH_LONG[m - 1] ? '.' : ''); return `Final result For ${mo} ${y} Incentive`; }
/** a person's earned SR on the form: 0 when not eligible, empty when the tool has none */
const finalEarned = x => (x.el && !x.el.ok ? 0 : x.earned == null ? null : Math.round(x.earned));
const finalId = id => (/^[1-9]\d{0,14}$/.test(String(id || '')) ? Number(id) : String(id || ''));
function finalFormHtml(title, L, tot, signers) {
  const W = [91.2, 242.65, 134.65, 71.0, 27.3], B = 'solid windowtext 1.0pt', RED = '#C00000', NB = '&nbsp;', px = pt => Math.round(pt * 4 / 3);
  const cell = (i, inner, o = {}) => {
    const n = o.cs || 1, w = +W.slice(i, i + n).reduce((a, b) => a + b, 0).toFixed(2);
    return `<td width="${px(w)}" nowrap${n > 1 ? ` colspan="${n}"` : ''}${o.rs > 1 ? ` rowspan="${o.rs}"` : ''}${o.va ? '' : ' valign="bottom"'} style="width:${w}pt;border-top:none;border-left:${i === 0 ? B : 'none'};border-bottom:${B};border-right:${B};${o.bg ? `background:${o.bg};` : ''}padding:0in 5.4pt 0in 5.4pt;height:${o.h || '.2in'}"><p class="MsoNormal"${o.c ? ' align="center" style="margin:0;text-align:center"' : ' style="margin:0"'}>${inner}</p></td>`;
  };
  const sp = (t, ff, sz, col, b) => `${b ? '<b>' : ''}<span style="font-size:${sz}.0pt;font-family:&quot;${ff}&quot;,sans-serif;color:${col}">${t}</span>${b ? '</b>' : ''}`;
  const cal = (t, sz = 11, col = 'black', b = false) => sp(t, 'Calibri', sz, col, b), ver = (t, sz, col = 'black', b = false) => sp(t, 'Verdana', sz, col, b);
  const gap = h => `<td width="1" style="width:.75pt;padding:0in 0in 0in 0in;height:${h}"></td>`;   // the narrow column Excel adds when it is pasted
  const R = [];
  R.push(`<tr style="height:18.75pt"><td width="${px(566.8)}" nowrap colspan="5" valign="bottom" style="width:566.8pt;background:white;padding:0in 5.4pt 0in 5.4pt;height:18.75pt"><p class="MsoNormal" align="center" style="margin:0;text-align:center">${cal(esc(title), 14, 'black', true)}</p></td>${gap('18.75pt')}</tr>`);
  R.push(`<tr style="height:15.6pt">${['ID', 'Name', 'Final %', 'Earned SR', ''].map((t, i) => cell(i, cal(t ? esc(t) : NB, 12, 'white', true), { c: true, bg: RED, h: '15.6pt' })).join('')}${gap('15.6pt')}</tr>`);
  for (const x of L) R.push(`<tr style="height:.2in">${cell(0, ver(esc(x.id), 10), { c: true })}${cell(1, cal(esc(x.name)), { bg: 'white' })}${cell(2, cal(x.fin == null ? NB : Math.round(x.fin * 100) + '%'), { c: true })}${cell(3, cal(finalEarned(x) == null ? NB : String(finalEarned(x))), { c: true })}${cell(4, cal(NB), { c: true })}${gap('.2in')}</tr>`);
  R.push(`<tr style="height:15.6pt">${cell(0, cal(NB, 12, 'white', true), { cs: 3, c: true, bg: RED, h: '15.6pt' })}${cell(3, cal(Math.round(tot).toLocaleString('en-US'), 12, 'white', true), { c: true, bg: RED, h: '15.6pt' })}${cell(4, cal(NB), { h: '15.6pt' })}${gap('15.6pt')}</tr>`);
  R.push(`<tr style="height:.2in">${[0, 1, 2, 3, 4].map(i => cell(i, cal(NB), { c: true })).join('')}${gap('.2in')}</tr>`);
  R.push(`<tr style="height:.2in">${cell(0, ver(NB, 8, 'white', true), { cs: 2, c: true, bg: RED })}${cell(2, ver('Designation', 8, 'white', true), { bg: RED })}${cell(3, ver('Signature', 8, 'white', true), { c: true, bg: RED })}${cell(4, ver('Date', 8, 'white', true), { c: true, bg: RED })}${gap('.2in')}</tr>`);
  signers.forEach(([n, d], i) => {
    const rs = signRows(i);
    R.push(`<tr style="height:.2in">${cell(0, ver(esc(n), 8, 'black', true), { cs: 2, rs, c: true, va: 1 })}${cell(2, ver(esc(d), 8, 'black', true), { rs, c: true, va: 1 })}${cell(3, ver(NB, 8), { rs, c: true })}${cell(4, ver(NB, 8), { rs, c: true })}${gap('.2in')}</tr>`);
    for (let j = 1; j < rs; j++) R.push(`<tr style="height:.2in">${gap('.2in')}</tr>`);
  });
  return `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="${px(567.35)}" style="width:567.35pt;border-collapse:collapse">${R.join('')}</table><p class="MsoNormal">&nbsp;</p><p class="MsoNormal">&nbsp;</p>`;
}
/** the same form as an Excel file: Sheet1, A1:E1 title, red header, the people, the total, the signature table */
async function finalFormXlsx(title, L, tot, signers) {
  const S = new Writer2.Styles(), W = new Writer2.Sheet('Sheet1'), K = 'FF000000', RED = 'FFC00000', WH = 'FFFFFFFF', box = { l: K, r: K, t: K, b: K };
  const st = (font, o = {}) => S.get({ font, bstyle: 'medium', border: box, align: { h: 'center' }, ...o });
  const cal = (sz, b, color = K) => ({ name: 'Calibri', sz, b, color }), ver = (sz, b, color = K) => ({ name: 'Verdana', sz, b, color });
  const sTitle = S.get({ font: cal(14, true), fill: WH, align: { h: 'center' } }), sHead = st(cal(12, true, WH), { fill: RED }), sId = st(ver(10, false));
  const sName = st(cal(11, false), { fill: WH, align: {} }), sPct = st(cal(11, false), { numFmt: '0%' }), sCell = st(cal(11, false));
  const sTot = st(cal(12, true, WH), { fill: RED, numFmt: '#,##0' }), sSigHead = st(ver(8, true, WH), { fill: RED }), sSigHeadL = st(ver(8, true, WH), { fill: RED, align: {} });
  const sSig = st(ver(8, true)), sSigBox = st(ver(8, false));
  [12.42578125, 36.42578125, 23, 12.42578125, 5.28515625].forEach((w, i) => W.width(i + 1, w));
  W.grid = true; W.heights[1] = 18.75;
  W.set(1, 1, title, sTitle); for (let c = 2; c <= 5; c++) W.set(1, c, null, sTitle); W.merge(1, 1, 1, 5);
  ['ID', 'Name', 'Final %', 'Earned SR', null].forEach((h, i) => W.set(2, i + 1, h, sHead)); W.heights[2] = 16.5;
  let r = 3;
  for (const x of L) { W.set(r, 1, finalId(x.id), sId); W.set(r, 2, x.name, sName); W.set(r, 3, x.fin, sPct); W.set(r, 4, finalEarned(x), sCell); W.set(r, 5, null, sCell); W.heights[r] = 16.5; r++; }
  for (let c = 1; c <= 3; c++) W.set(r, c, null, sHead); W.merge(r, 1, r, 3); W.set(r, 4, Math.round(tot), sTot); W.set(r, 5, null, sCell); W.heights[r] = 16.5; r++;
  for (let c = 1; c <= 5; c++) W.set(r, c, null, sCell); W.heights[r] = 16.5; r++;
  W.set(r, 1, null, sSigHead); W.set(r, 2, null, sSigHead); W.merge(r, 1, r, 2); W.set(r, 3, 'Designation', sSigHeadL); W.set(r, 4, 'Signature', sSigHead); W.set(r, 5, 'Date', sSigHead); W.heights[r] = 16.5; r++;
  signers.forEach(([n, d], i) => {
    const rs = signRows(i), r2 = r + rs - 1;
    for (let rr = r; rr <= r2; rr++) { for (let c = 1; c <= 3; c++) W.set(rr, c, rr === r && c !== 2 ? (c === 1 ? n : d) : null, sSig); W.set(rr, 4, null, sSigBox); W.set(rr, 5, null, sSigBox); W.heights[rr] = 15.75; }
    W.merge(r, 1, r2, 2); W.merge(r, 3, r2, 3); W.merge(r, 4, r2, 4); W.merge(r, 5, r2, 5);
    r = r2 + 1;
  });
  return Writer2.pack([W], S, {}, {});
}
async function exportCycle() {
  const k = wsMonthNow(); if (!k) return; const R = cycleRows(k), its = spvCardNow().items;
  await xlBook(`Supervisors - ${ymLabel(k)}.xlsx`, [{ name: 'Supervisors', title: `Supervisors - ${ymLabel(k)}`, sub: stamp(k),
    cols: [{ h: 'Supervisor', t: 'text', w: 26 }, { h: 'Agents', t: 'int' }, { h: 'One-to-ones held', t: 'int' }, { h: 'Signed by the agent', t: 'int' }, { h: 'Finished', t: 'text', w: 18 }, ...its.map(it => ({ h: it.name, t: spvItemUnit(it) === 'pct' ? 'pct' : spvItemUnit(it) === 'sec' ? 'time' : 'num' })), { h: 'Final %', t: 'pct' }],
    rows: R.map(r => [r.name, r.team.length, r.held, r.signed, r.done ? fmtWhen(r.done.at) : 'Not yet', ...r.sc.items.map(x => x.v), r.sc.finalPct]), freezeCol: 1 }]);
}

// ---------------------------------------------------------------- events
$('cycleBar').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-deadline]')) { const k = wsMonthNow(), v = t.value; cycleUpdate(k, c => { c.deadline = v; }, v ? `Set the one-to-one deadline to ${Forms.fmtDate(v)}` : 'Removed the deadline'); }
});
$('cycleBar').addEventListener('click', async e => {
  const tb = e.target.closest('[data-cyctab]'); if (tb) { cycTabGo(tb.dataset.cyctab); return; }
  const b = e.target.closest('[data-cyc="publish"]');
  if (b) { const k = wsMonthNow(); b.disabled = true; const n = await publishMonthToAgents(k).catch(() => 0); b.disabled = false; toast(n ? `${plural(n, 'agent')} now see their latest ${ymLabel(k)} numbers and forms.` : 'No agent has an account yet.'); if (n) logCycle(k, `Updated ${plural(n, 'agent')}'s own pages`); }
});
/** the Supervisors page's tabs: the month close, or the incentive email */
function cycTabGo(t) {
  if (state.cycTab === t) return; state.cycTab = t; renderWs(); window.scrollTo({ top: 0 });
  const b = $('cycleBar').querySelector(`[data-cyctab="${t}"]`); if (b) b.focus();
}
$('cycMail').addEventListener('click', e => {
  if (e.target.closest('[data-increcheck]')) { incSavedLoad(state.incK); renderEmail(); return; }
  if (e.target.closest('[data-incsaved]')) { state.incWb = null; state.mailSubjects = {}; state.mailDeadline = null; incSavedLoad(state.incK); renderEmail(); }
});
$('cycleBody').addEventListener('click', e => {
  const t = e.target;
  const ct = t.closest('[data-cyctab]'); if (ct) { cycTabGo(ct.dataset.cyctab); return; }
  const m4 = t.closest('[data-mail4]'); if (m4) { mail4(m4.dataset.mail4); return; }
  if (t.closest('[data-cyc="seen"]')) { lsSet(seenKey(), new Date().toISOString()); state.cycleSeenPrev = seenAt(); renderWs(); return; }
  const tm = t.closest('[data-cyc="team"]'); if (tm) { state.wsSpv = tm.dataset.spv; setWs('team'); return; }
  if (t.closest('[data-scadd]')) { const c = scClone(); c.items.push({ id: 'i' + Date.now().toString(36), name: 'New item', src: 'manual', key: '', dir: 'high', weight: 0, bands: [0.95, 0.9, 0.85, 0.8] }); saveSpvCard(c, 'Added a scorecard item'); return; }
  if (t.closest('[data-screset]')) { if (!t.dataset.confirm) { t.dataset.confirm = '1'; t.textContent = 'Click again to reset'; return; } saveSpvCard(SPVCARD0(), 'Reset the supervisor scorecard to the default'); return; }
  const del = t.closest('[data-scdel]'); if (del) { const i = +del.closest('[data-sci]').dataset.sci, c = scClone(), it = c.items[i]; c.items.splice(i, 1); saveSpvCard(c, `Removed "${it ? it.name : ''}" from the scorecard`); }
});
$('cycleBody').addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details[data-det]'); if (!d) return; if (d.dataset.det === 'sc') state.scEdit = d.open; if (d.dataset.det === 'ct') state.ctEdit = d.open; if (d.dataset.det === 'inc') state.incOpen = d.open; }, true);
// the incentive list: add, choose, remove, back to the usual list
$('cycleBody').addEventListener('click', e => {
  const t = e.target, L = () => incListNow().map(x => ({ ...x }));
  const del = t.closest('[data-incdel]'); if (del) { const i = +del.closest('[data-inci]').dataset.inci, it = L(), x = it[i]; if (!x) return; it.splice(i, 1); const p = x.pid ? state.roster.find(q => q._id === x.pid) : null; saveIncList(it, `Removed ${p ? gname(effP(p._id) || p) || p.name : x.n} from the incentive list`); toast('Removed from the incentive list', { label: 'Undo', fn: () => { const b = L(); b.splice(i, 0, x); saveIncList(b, 'Undid a removal from the incentive list'); } }); return; }
  if (t.closest('[data-increset]')) { if (!t.dataset.confirm) { t.dataset.confirm = '1'; t.textContent = 'Click again: back to the usual list'; return; } saveIncList(null, 'The incentive list is back to the usual one'); toast('The incentive list is the usual one again.'); }
});
$('cycleBody').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-incadd]') && t.value) { const p = state.roster.find(q => q._id === t.value); if (!p) return; const it = incListNow().map(x => ({ ...x })); it.push({ pid: p._id, n: '' }); saveIncList(it, `Added ${gname(effP(p._id) || p) || p.name} to the incentive list`); toast(`${gname(effP(p._id) || p) || p.name} is on the incentive list`); return; }
  if (t.matches('[data-incpick]') && t.value) { const i = +t.closest('[data-inci]').dataset.inci, it = incListNow().map(x => ({ ...x })); if (!it[i]) return; it[i].pid = t.value; const p = state.roster.find(q => q._id === t.value); saveIncList(it, `"${it[i].n}" on the incentive list is ${p ? gname(effP(p._id) || p) || p.name : t.value}`); }
});
$('cycleBody').addEventListener('change', e => {
  const t = e.target, k = wsMonthNow();
  const row = t.closest('[data-sci]');
  if (row && (t.matches('[data-scf]') || t.matches('[data-scb]'))) {
    const c = scClone(), it = c.items[+row.dataset.sci]; if (!it) return;
    const f = t.dataset.scf, u = spvItemUnit(it), num = v => { const x = parseFloat(String(v).replace('%', '')); return Number.isFinite(x) ? x : null; };
    if (f === 'name') it.name = normSpace(t.value) || it.name;
    else if (f === 'src') { it.src = t.value; it.key = t.value === 'team' ? 'adh' : t.value === 'kpi' ? ([...KPI_INDEX().keys()][0] || '') : t.value === 'lead' ? LEADER_ITEMS[0][0] : t.value === 'follow' ? 'done' : ''; if (t.value === 'lead') { it.max = (LEADER_ITEMS.find(x => x[0] === it.key) || [, , 0.05])[2]; delete it.bands; } else if (!it.bands) it.bands = [0.95, 0.9, 0.85, 0.8]; }
    else if (f === 'key') { it.key = t.value; if (it.src === 'lead') it.max = (LEADER_ITEMS.find(x => x[0] === it.key) || [, , it.max])[2]; }
    else if (f === 'weight') { const v = num(t.value); if (v == null || v < 0) { toast('Type a weight in %.'); return; } it.weight = Math.round(v * 10) / 1000; }
    else if (f === 'max') { const v = num(t.value); if (!(v > 0)) { toast('Type the full marks in %.'); return; } it.max = v / 100; }
    else if (f === 'dir') it.dir = t.value;
    else if (t.matches('[data-scb]')) { const j = +t.dataset.scb, v = normSpace(t.value) === '' ? null : num(t.value); it.bands = (it.bands || [null, null, null, null]).slice(); it.bands[j] = v == null ? null : u === 'pct' ? v / 100 : v; }
    saveSpvCard(c, `Changed the scorecard item "${it.name}"`); return;
  }
  if (t.matches('[data-scbase]')) { const c = scClone(), v = Math.round(+t.value || 0); c.base = v > 0 ? v : 0; saveSpvCard(c, `Supervisor incentive base: ${c.base ? c.base + ' SR' : 'none'}`); return; }
  if (t.matches('[data-man]')) {
    const it = spvCardNow().items.find(x => x.id === t.dataset.it); if (!it) return;
    const raw = normSpace(t.value), v = raw === '' ? null : parseFloat(raw.replace('%', '')); if (raw !== '' && !Number.isFinite(v)) { toast('Type a number.'); return; }
    const val = v == null ? null : spvItemUnit(it) === 'pct' ? v / 100 : v, pid = t.dataset.man;
    cycleUpdate(k, c => { c.manual = c.manual || {}; c.manual[pid] = { ...(c.manual[pid] || {}) }; if (val == null) delete c.manual[pid][it.id]; else c.manual[pid][it.id] = val; }, `${it.name} for ${supName(pid)}: ${raw || 'empty'}`); return;
  }
  if (t.matches('[data-signers]')) {
    const v = String(t.value || '').split('\n').map(l => l.split('|').map(normSpace).filter(Boolean).slice(0, 2).join(' | ')).filter(Boolean).join('\n');
    state.contacts = { ...(state.contacts || {}), signers: v };
    if (state.db) queueWrite('config/contacts', () => state.db.doc('config/contacts').set({ ...contactsNow(), at: new Date().toISOString(), by: whoNow() })).catch(() => {});
    toast(v ? 'Saved: the final result form shows these people.' : 'Back to the usual four: VP, HR Director, Finance Director and CEO.'); renderWs(); return;
  }
  if (t.matches('[data-contact]')) {
    const f = t.dataset.contact, v = splitAddr(t.value).join('; ');
    if (v && !splitAddr(v).every(a => /@/.test(a))) { toast('Type addresses like Name <name@company.com>, separated by a semicolon.'); return; }
    state.contacts = { ...(state.contacts || {}), [f]: v };
    if (state.db) queueWrite('config/contacts', () => state.db.doc('config/contacts').set({ ...contactsNow(), at: new Date().toISOString(), by: whoNow() })).catch(() => {});
    toast('Saved');
  }
});
