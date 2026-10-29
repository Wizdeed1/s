// ================================================================ WEEKLY: the Weekly Commercial Presentation (WFM team › Weekly)
// For the WFM analysts, the WFM manager and admins. The week is Sunday to Saturday; the deck is dated the Sunday after. The calls
// come from the Brands' history (the daily emails keep it), the top call reasons from the week's ESKA call history export (only its
// counts are kept), the complaint figures are pasted from the email they come in, Postpaid's top 5 tickets are counted from the
// ESKA Tickets Report (or typed), and the outages are a running list (it starts with the 25 Oct 2026 deck's; an earlier deck dropped
// on the tab brings its own in). Out: the Member Care Performance Review deck (wk/deck-template.pptx filled by Weekly.deck), the KPI
// workbook filled in (Weekly.fillWorkbook), and the email with the deck as an Outlook draft. Shared records: weekly/w_<Sunday>
// (the week), weekly/outages, weekly/settings.
Object.assign(state, { wk: { key: '', loaded: '', doc: null, out: null, set: null, busy: '', bookNotes: null, paste: '', loadT: 0 } });
const canWeekly = () => hasRole('admin', 'wfm', 'user');
const WK = { tpl: null, opening: null };
const WK_BRANDS = () => Weekly.BRANDS;
const wkWeek = () => Weekly.weekOf(state.wk.key || Weekly.lastWeek(todayIso()).key);
const wkDoc = () => (state.wk.doc = state.wk.doc || {});
const wkSkip = () => (state.wk.set && Array.isArray(state.wk.set.skip) ? state.wk.set.skip : (window.Engine ? window.Engine.DEFAULT_SUPPRESSED : []));
const wkTo = () => (state.wk.set && typeof state.wk.set.to === 'string' ? state.wk.set.to : contactsNow().vp);
const wkCc = () => (state.wk.set && typeof state.wk.set.cc === 'string' ? state.wk.set.cc : contactsNow().form);
const WK_OUT_BRANDS = ['Virgin', 'FRiENDi', 'Fpay', 'Virgin,FRiENDi', 'Virgin,FRiENDi,Fpay'];
const WK_OUTAGES_START = [   // the outages on the deck of 25 Oct 2026, put in the list once (weekly/settings: outStart)
  ["2026-08-06","Genesys Outage","Virgin,FRiENDi,Fpay","Genesys is stopped working for all member care team"],
  ["2026-08-11","Charged activity blocked","Virgin","postpaid numbers are currently experiencing service blocks('Charged activity blocked'"],
  ["2026-08-17","Packages activation issue","FRiENDi","customers are currently unable to activate internet packages through the self-service code"],
  ["2026-08-25","App Issue","Virgin,FRiENDi","the app is not working"],
  ["2026-08-27","Internet connection Issue","Virgin,FRiENDi","issue in the internet connection"],
  ["2026-09-13","Weak Coverage Issue","Virgin,FRiENDi","A weak coverage issue"],
  ["2026-09-15","BCRM Termination issue","FRiENDi","An issue when sending the OTP to perform termination through BCRM"],
  ["2026-09-15","Friendi Pay OTP issue","Fpay","customers are unable to receive OTP while Refund/Remittance/Top-up/login"],
  ["2026-10-02","Plan Issue","FRiENDi","issue while activating plans both from the CRM and the customer side"],
  ["2026-10-09","Plan activation issue","FRiENDi","customers are complaining that they can not activate a package through the app nor USSD"],
  ["2026-10-11","Support Tools issue","Virgin","we are unable to access customers’ profile who are using Aman plans"],
  ["2026-10-12","Support Tools issue - Aman customers only","Virgin","unable to access customers’ profile who are using Aman plans"],
  ["2026-10-13","Virgin EOC annoying SMS","Virgin","enormous number of SMS's from Virgin EOC"],
  ["2026-10-18","Service Adjustment issue on BCRM","Virgin,FRiENDi","BCRM is running very slowly and shown the attached error"],
  ["2026-10-19","Dashboard not working","Fpay","Dashboard is not working"],
];

// ---------------------------------------------------------------- shared records
async function wkGet(path) {
  if (!state.db) return null;
  try { const s = await state.db.doc(path).get(); const x = s.exists ? s.data() : null; return x && x.v !== undefined ? x.v : null; } catch (e) { return null; }
}
function wkPut(path, v) {
  if (!state.db) return;
  const body = { v: JSON.parse(JSON.stringify(v)), at: new Date().toISOString(), by: whoNow() };
  queueWrite(path, () => state.db.doc(path).set(body)).catch(e => toast(`The weekly presentation was not saved (${(e && e.code) || 'error'}).`));
}
const wkSaveDoc = () => wkPut('weekly/w_' + wkWeek().key, wkDoc());
const wkSaveOut = () => wkPut('weekly/outages', { list: state.wk.out || [] });
const wkSaveSet = () => wkPut('weekly/settings', state.wk.set || {});
/** the week's records (and, once, the outages and the settings), after the report builder's engine and the shared history */
function wkOpen(key) {
  if (WK.opening && WK.opening.key === key) return WK.opening.p;
  const p = (async () => {
    await rbBoot();
    if (state.wk.out === null) { const o = await wkGet('weekly/outages'); state.wk.out = o && Array.isArray(o.list) ? o.list : []; }
    if (state.wk.set === null) state.wk.set = (await wkGet('weekly/settings')) || {};
    if (!state.wk.set.outStart) {   // once: the outages the last deck had, so the list starts where the slide was
      const add = Weekly.newOutages(state.wk.out, WK_OUTAGES_START.map(([date, issue, brands, desc]) => ({ date, issue, brands, desc })));
      state.wk.out = state.wk.out.concat(add.map((o, i) => Object.assign({ id: 'o0' + i, at: '', by: 'the deck of 25 Oct 2026' }, o)));
      state.wk.set = Object.assign({}, state.wk.set, { outStart: true });
      if (add.length) wkSaveOut(); wkSaveSet();
    }
    const d = await wkGet('weekly/w_' + key);
    if (wkWeek().key !== key) return;   // another week was chosen meanwhile
    state.wk.doc = d || {}; state.wk.loaded = key; state.wk.bookNotes = null;
  })();
  WK.opening = { key, p };
  p.catch(e => toast('The weekly presentation could not open: ' + errText(e))).finally(() => { if (WK.opening && WK.opening.p === p) WK.opening = null; if (rbVisible('weekly')) renderWeeklyWs(); });
  return p;
}
/** the week as the deck shows it */
function wkModel() {
  const w = wkWeek(), D = state.wk.doc || {};
  return Weekly.model({ H: rbHist(), w, reasons: Weekly.reasonsFrom(D.counted || null, wkSkip()), complaints: D.complaints || {}, tickets: D.tickets || null, outages: state.wk.out || [], today: todayIso() });
}

// ---------------------------------------------------------------- the page
const wkN = v => (v === null || v === undefined || isNaN(v) ? '–' : Math.round(v).toLocaleString('en-US'));
const wkP = v => Weekly.pct(v) || '–';
function wkStep(n, title, cap, inner, cls = '') {
  return `<section class="card rbcard wkcard ${cls}"><div class="rbstep"><span class="n" aria-hidden="true">${n}</span><div><h2>${esc(title)}</h2>${cap ? `<p class="cap">${cap}</p>` : ''}</div></div>${inner}</section>`;
}
function renderWeeklyWs() {
  const body = $('wfmBody'); if (!body || state.ws !== 'wfm' || state.wfmTab !== 'weekly') return;
  if (!canWeekly()) { $('wfmBar').innerHTML = '<div class="wsacts"></div>'; body.innerHTML = emptyCard('Only the WFM team', 'The WFM analysts and the WFM manager make the weekly presentation.'); return; }
  if (!state.wk.key) state.wk.key = Weekly.lastWeek(todayIso()).key;
  const w = wkWeek();
  $('wfmBar').innerHTML = `<div class="wkweek" role="group" aria-label="The report week"><button class="btn sm ghost" data-wkweek="-7" aria-label="The week before">‹</button><span class="wkwho"><b>${esc(Weekly.weekLabel(w))}</b><small>Sunday to Saturday · the deck is dated ${esc(Weekly.dayLong(w.deck))}</small></span><button class="btn sm ghost" data-wkweek="7" aria-label="The week after">›</button>${w.key !== Weekly.lastWeek(todayIso()).key ? '<button class="btn sm ghost" data-wkweek="0">Last week</button>' : ''}</div><div class="wsacts"><button class="btn sm primary" data-wkdeck${state.wk.busy ? ' disabled' : ''}><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Download the deck</button></div>`;
  if (state.wk.loaded !== w.key) { body.innerHTML = '<div class="rbload big" role="status"><span class="spin"></span><span>Opening the week…</span></div>'; wkOpen(w.key); return; }
  const M = wkModel(), C = Weekly.checks(M), D = state.wk.doc || {}, keep = wkKeepFocus(body);
  const bad = C.filter(c => c.sev === 'bad').length, warn = C.filter(c => c.sev === 'warn').length;

  const calls = `<div class="tablewrap"><table class="wktab"><thead><tr><th>Brand</th><th class="r" title="Days of the week in the history">Days</th><th class="r" title="Calls presented, the average day">Presented</th><th class="r" title="Calls handled, the average day">Handled</th><th class="r" title="Service level, month to date">SL</th><th class="r" title="Last month's service level">SL ${esc(Weekly.monthTick(Weekly.addDays(w.end.slice(0, 7) + '-01', -1)))}</th></tr></thead><tbody>${WK_BRANDS().map(([b, name]) => {
    const B = M.brands[b], have = B.daily.filter(r => r.date >= w.start && r.presented !== null).length;
    return `<tr><td>${esc(name)}</td><td class="r num${have < 7 ? ' bad' : ''}">${have}/7</td><td class="r num">${wkN(B.mtd.presented)}</td><td class="r num">${wkN(B.mtd.handled)}</td><td class="r num">${wkP(B.mtd.sl)}</td><td class="r num">${wkP(B.lastMonth && B.lastMonth.sl)}</td></tr>`;
  }).join('')}</tbody></table></div><p class="hint">Month to date: the average day of ${esc(Weekly.monthLong(w.end))} up to ${esc(Weekly.dayLong(w.end))}. A missing day comes in when that day's brand emails are made on <button class="linkbtn" data-wtgo="builder">Report builder</button>.</p>`;

  const R = M.brands, from = D.from;
  const reasons = `${from ? `<p class="wkfrom"><svg class="tick" width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg><span><b dir="auto">${esc(from.names.join(', '))}</b> · ${plural(from.rows, 'call')} in the week (the file covers ${esc(from.span || '–')}) · read ${esc(fmtWhen(from.at))}${from.by ? ' by ' + esc(from.by) : ''}</span></p>` : ''}
    <div class="drop small rbdrop" data-wkdrop tabindex="0" role="button"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>${from ? 'Drop another export for this week' : 'Drop the week\'s ESKA exports'}</strong><span>The Call Center History of ${esc(Weekly.weekLabel(w))} (all the brands in one file, or one file a brand) for the call reasons, and the Tickets Report for Postpaid's tickets. Only how many each reason or ticket type had is kept.</span></div>
    ${D.counted ? `<div class="wkbrands">${WK_BRANDS().map(([b, name]) => { const X = R[b].reasons; return `<div class="wkbr"><h3>${esc(name)} <small>${X ? plural(X.base, 'call') : '–'}</small></h3>${X && X.list.length ? `<ol class="wklist">${X.list.map(x => `<li><span dir="auto">${esc(x.reason)}</span><b class="num">${x.count.toLocaleString('en-US')}</b><small class="num">${wkP(X.base ? x.count / X.base : null)}</small></li>`).join('')}</ol>` : '<p class="subtle">No calls of this brand in the export.</p>'}</div>`; }).join('')}</div>` : ''}
    <details class="wkdet" data-wkdet="skip"${state.wk.skipOpen ? ' open' : ''}><summary>Reasons left out of the top 5 <span class="pill">${wkSkip().length}</span></summary><p class="hint">They still count in each brand's total, as on the daily emails. One a line. FRiENDi Pay always lists Follow Up.</p><textarea class="cell" id="wkSkip" rows="8" spellcheck="false">${esc(wkSkip().join('\n'))}</textarea><div class="acts"><button class="btn sm ghost" data-wkskipdef>The daily emails' list</button><button class="btn sm" data-wkskipsave>Save the list</button></div></details>`;

  const cf = (b, k, v, label, kind) => `<label class="field"><span class="lbl">${esc(label)}</span><input class="cell num" data-wkc="${b}.${k}" inputmode="decimal" value="${esc(v === null || v === undefined ? '' : kind === 'pct' ? String(Math.round(v * 10000) / 100) + '%' : String(v))}"></label>`;
  const comp = `<label class="field"><span class="lbl">Paste the figures as they came (the email's table, or the workbook's block)</span><textarea class="cell" id="wkPaste" rows="5" spellcheck="false" placeholder="Virgin&#9;%&#10;No. of Complaints&#9;1007&#10;Resolution Time of Closed TKT&#9;100%&#10;The Remaining Open TKT&#9;241&#10;Top 5 complaints&#9;Percentage&#10;SM is not working&#9;16%&#10;…">${esc(state.wk.paste)}</textarea></label>
    <div class="acts"><button class="btn sm" data-wkread>Read the figures</button></div>
    <div class="wkcomp">${Weekly.COMPLAINT_BRANDS.map(b => { const X = (D.complaints || {})[b] || {}, d = X.drivers || []; return `<fieldset class="wkbr"><legend>${esc(Weekly.NAME[b])}</legend><div class="wk3">${cf(b, 'complaints', X.complaints, 'Complaints')}${b === 'fpay' ? '' : cf(b, 'onTime', X.onTime, 'On time', 'pct')}${cf(b, 'open', X.open, 'Still open')}</div>
      <div class="wkdrv">${[0, 1, 2, 3, 4].map(i => `<input class="cell" data-wkc="${b}.d${i}.name" aria-label="${esc(Weekly.NAME[b])} complaint driver ${i + 1}" placeholder="Driver ${i + 1}" dir="auto" value="${esc((d[i] && d[i].name) || '')}"><input class="cell num" data-wkc="${b}.d${i}.pct" aria-label="${esc(Weekly.NAME[b])} driver ${i + 1} %" placeholder="%" inputmode="decimal" value="${d[i] && d[i].pct !== null && d[i].pct !== undefined ? esc(String(Math.round(d[i].pct * 10000) / 100) + '%') : ''}">`).join('')}</div></fieldset>`; }).join('')}</div>`;

  const T = D.tickets || {}, tl = T.list || [], tf = D.ticketsFrom;
  const tickets = `${tf ? `<p class="wkfrom"><svg class="tick" width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg><span><b dir="auto">${esc(tf.names.join(', '))}</b> · ${plural(T.total || 0, 'Postpaid ticket')} in the week · read ${esc(fmtWhen(tf.at))}${tf.by ? ' by ' + esc(tf.by) : ''}. A changed figure below is kept.</span></p>` : ''}<div class="wktk">${[0, 1, 2, 3, 4].map(i => `<input class="cell" data-wkt="${i}.name" aria-label="Ticket type ${i + 1}" placeholder="Ticket type ${i + 1}" dir="auto" value="${esc((tl[i] && tl[i].name) || '')}"><input class="cell num" data-wkt="${i}.count" aria-label="Tickets of type ${i + 1}" placeholder="Tickets" inputmode="numeric" value="${tl[i] && tl[i].count !== null && tl[i].count !== undefined ? esc(String(tl[i].count)) : ''}"><small class="num">${wkP(T.total > 0 && tl[i] && tl[i].count ? tl[i].count / T.total : null)}</small>`).join('')}</div>
    <label class="field wktot"><span class="lbl">All Postpaid tickets (the % is out of these)</span><input class="cell num" data-wkt="total" inputmode="numeric" value="${T.total ? esc(String(T.total)) : ''}"></label>
    <div class="acts"><button class="btn sm" data-wkdrop-tk><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Count them from the Tickets Report…</button></div>`;

  const O = M.outages, all = (state.wk.out || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const outages = `<div class="tablewrap"><table class="wktab"><thead><tr><th>Date</th><th>Outage and issue</th><th>Brand</th><th>Description</th><th class="r"><span class="sr">Remove</span></th></tr></thead><tbody>${O.rows.length ? O.rows.slice().reverse().map(o => `<tr${o.date >= w.start ? ' class="wknew"' : ''}><td>${esc(Weekly.dayShort(o.date))}</td><td dir="auto">${esc(o.issue)}</td><td>${esc(o.brands)}</td><td dir="auto">${esc(o.desc)}</td><td class="r"><button class="btn sm ghost" data-wkodel="${esc(o.id)}" aria-label="Remove ${esc(o.issue)}">×</button></td></tr>`).join('') : '<tr><td colspan="5" class="subtle">No outages in these months yet.</td></tr>'}</tbody></table></div>
    <p class="hint">The slide shows ${esc(O.span)}: ${plural(O.rows.length, 'outage')}, ${plural(O.brands, 'brand')}.${all.length > O.rows.length ? ` ${plural(all.length - O.rows.length, 'older outage')} ${all.length - O.rows.length === 1 ? 'is' : 'are'} kept in the list.` : ''}</p>
    <div class="wkadd"><label class="field"><span class="lbl">Date</span><input class="cell" type="date" id="wkODate" value="${esc(state.wk.oDate || w.end)}"></label><label class="field"><span class="lbl">Outage and issue</span><input class="cell" id="wkOIssue" dir="auto"></label><label class="field"><span class="lbl">Brand</span><input class="cell" id="wkOBrand" list="wkOBrands" placeholder="Virgin,FRiENDi"></label><label class="field"><span class="lbl">Description</span><input class="cell" id="wkODesc" dir="auto"></label><datalist id="wkOBrands">${WK_OUT_BRANDS.map(x => `<option value="${esc(x)}">`).join('')}</datalist><div class="acts"><button class="btn sm" data-wkoadd>Add the outage</button><button class="btn sm ghost" data-wkodeck><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Bring in an earlier deck's outages…</button></div></div>`;

  const sevIco = s => (s === 'bad' ? '<small class="blk">Fix</small>' : s === 'warn' ? '<small class="wrn">Look</small>' : '<small class="pill info">Note</small>');
  const book = state.wk.bookNotes;
  const send = `<ul class="checklist">${C.length ? C.map(c => `<li>${sevIco(c.sev)}<span>${esc(c.text)}</span></li>`).join('') : '<li><svg class="tick" width="16" height="16" aria-hidden="true"><use href="#i-check"/></svg><span>Everything is in: the deck is ready.</span></li>'}</ul>
    <div class="acts wkacts"><button class="btn primary" data-wkdeck${state.wk.busy ? ' disabled' : ''}>${state.wk.busy === 'deck' ? '<span class="spin" aria-hidden="true"></span>Making the deck…' : '<svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>Download the deck (.pptx)'}</button><button class="btn" data-wkbook${state.wk.busy ? ' disabled' : ''}>${state.wk.busy === 'book' ? '<span class="spin" aria-hidden="true"></span>Filling the workbook…' : '<svg width="16" height="16" aria-hidden="true"><use href="#i-file"/></svg>Fill the KPI workbook…'}</button></div>
    ${book ? `<div class="note ${book.length ? 'warn' : 'fixed'}"><b>The workbook is filled.</b>${book.length ? `<ul>${book.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ' Every value of the week is in it.'}</div>` : ''}
    <div class="wkmail"><label class="field"><span class="lbl">To</span><input class="cell" id="wkTo" value="${esc(wkTo())}"></label><label class="field"><span class="lbl">Cc</span><input class="cell" id="wkCc" value="${esc(wkCc())}"></label></div>
    <div class="acts"><button class="btn" data-wkeml${state.wk.busy ? ' disabled' : ''}><svg width="16" height="16" aria-hidden="true"><use href="#i-mail"/></svg>Email with the deck (.eml)</button></div>
    <p class="hint">"Weekly Commercial Presentation", the deck attached. It opens in Outlook as a new message: the tool sends nothing itself.</p>`;

  body.innerHTML = `<div class="wkgrid">
    ${wkStep(1, 'Calls', 'From the Brands\' history: the numbers the daily brand emails keep, day by day and month by month.', calls)}
    ${wkStep(2, 'Top call reasons', 'Counted as the daily emails count them: the week\'s calls of each brand, without the reasons left out below.', reasons)}
    ${wkStep(3, 'Complaints', 'As they are sent to you: paste, then check each figure. Virgin Mobile and FRiENDi Mobile have three; FRiENDi Pay has complaints and open tickets (its third box is last month\'s service level).', comp, 'wkspan')}
    ${wkStep(4, 'Virgin Postpaid tickets', 'The top 5 ticket types of the week and all the Postpaid tickets: counted from the ESKA Tickets Report as the daily Postpaid email counts them (Billing, End service and Migration), or typed.', tickets)}
    ${wkStep(5, 'Outages', 'One list that runs on: add the week\'s outages; the slide shows this month and the two before.', outages)}
    ${wkStep(6, bad ? `Check and send · ${plural(bad, 'thing')} to fix` : warn ? `Check and send · ${plural(warn, 'thing')} to look at` : 'Check and send', 'The deck is made from the Member Care Performance Review design with the numbers above. The KPI workbook: choose this month\'s BeyondOne_MC_KPIs and a filled copy downloads.', send, 'wkspan')}
  </div><input type="file" id="wkFile" accept=".xls,.xlsx,.pptx" multiple hidden><input type="file" id="wkBookFile" accept=".xlsx" hidden>`;
  keep();
}
/** a re-render keeps the field being typed in */
function wkKeepFocus(root) {
  const a = document.activeElement, id = a && root.contains(a) ? (a.id ? '#' + a.id : a.dataset && (a.dataset.wkc ? `[data-wkc="${a.dataset.wkc}"]` : a.dataset.wkt ? `[data-wkt="${a.dataset.wkt}"]` : '')) : '';
  const s = id && a.selectionStart !== undefined ? [a.selectionStart, a.selectionEnd] : null;
  return () => { if (!id) return; const b = root.querySelector(id); if (!b) return; b.focus(); try { if (s) b.setSelectionRange(s[0], s[1]); } catch (e) { /* not a text field */ } };
}

// ---------------------------------------------------------------- files: the ESKA call history export, or the KPI workbook
async function wkFiles(list) {
  if (!canWeekly()) return;
  await rbBoot(); const E = rbE(), w = wkWeek();
  let rows = [], names = [], book = null, trows = [], tnames = []; const bad = [], decks = [];
  for (const f of Array.from(list)) {
    try {
      if (/\.pptx$/i.test(f.name)) { decks.push(f); continue; }
      const buf = await f.arrayBuffer();
      let sheets = null;
      if (/\.xlsx$/i.test(f.name)) { sheets = await window.parseXlsx(buf); if (sheets.some(s => /^weekly data$/i.test(String(s.name).trim()))) { book = f; continue; } }
      else if (/\.xls$/i.test(f.name)) sheets = window.parseXls(buf);
      else { bad.push(`${f.name}: not an Excel file`); continue; }
      let took = '';
      for (const sh of sheets || []) {
        const c = E.classify(f.name, 'xls', { rows: sh.rows || [] });
        if (c.type === 'history') { rows = rows.concat(E.historyRows(sh.rows)); took = 'h'; }
        else if (c.type === 'tickets') { trows = trows.concat(E.ticketRows(sh.rows)); took = 't'; }
      }
      if (took === 'h') names.push(f.name); else if (took === 't') tnames.push(f.name); else bad.push(`${f.name}: not a Call Center History or a Tickets Report export`);
    } catch (e) { bad.push(`${f.name}: ${errText(e)}`); }
  }
  if (bad.length) toast(bad.join(' · '));
  for (const f of decks) await wkDeckOutages(f);
  if (book) await wkFillBook(book);
  if (tnames.length) {
    const T = Weekly.postpaidTickets(E, trows, w);
    if (!T.total) toast(`${tnames.join(', ')} has no Postpaid tickets in ${Weekly.weekLabel(w)}.`);
    else { const D = wkDoc(); D.tickets = { total: T.total, list: T.list }; D.ticketsFrom = { names: tnames, at: new Date().toISOString(), by: whoNow() }; wkSaveDoc(); renderWeeklyWs(); toast(`Counted ${plural(T.total, 'Postpaid ticket')} of ${Weekly.weekLabel(w)}.`); }
  }
  if (!names.length) return;
  const counted = Weekly.countReasons(E, rows, w), inWeek = Weekly.BRANDS.reduce((s, [b]) => s + (b === 'postpaid' ? 0 : counted[b].base), 0);
  const ds = Array.from(new Set(rows.map(r => E.rowDate(r[E.COL.date])).filter(Boolean))).sort();
  if (!inWeek) { toast(`${names.join(', ')} has no calls in ${Weekly.weekLabel(w)}${ds.length ? ` (it covers ${Weekly.dayShort(ds[0])} to ${Weekly.dayShort(ds[ds.length - 1])})` : ''}.`); return; }
  const D = wkDoc(), prev = D.counted, merge = prev && D.from && Date.now() - Date.parse(D.from.at || 0) < 6 * 3600000 && !names.some(n => D.from.names.includes(n));
  if (merge) {   // one file a brand: the files dropped one after the other add up (a brand found again in a new file takes the new count)
    Weekly.BRANDS.forEach(([b]) => { if (counted[b].base) prev[b] = counted[b]; });
    D.from = { names: D.from.names.concat(names), rows: D.from.rows + rows.length, span: D.from.span, at: new Date().toISOString(), by: whoNow() };
  } else { D.counted = counted; D.from = { names, rows: rows.length, span: ds.length ? `${Weekly.dayShort(ds[0])} to ${Weekly.dayShort(ds[ds.length - 1])}` : '', at: new Date().toISOString(), by: whoNow() }; }
  wkSaveDoc(); renderWeeklyWs();
  toast(`Counted the call reasons of ${Weekly.weekLabel(w)}.`);
}
/** an earlier deck: the outages in its Outages table that the list does not have yet */
async function wkDeckOutages(file) {
  try {
    const found = await Weekly.outagesFromDeck(new Uint8Array(await file.arrayBuffer()));
    if (!found.length) { toast(`${file.name} has no Outages table.`); return; }
    const add = Weekly.newOutages(state.wk.out || [], found), at = new Date().toISOString();
    state.wk.out = (state.wk.out || []).concat(add.map((o, i) => Object.assign({ id: 'o' + Date.now().toString(36) + i, at, by: whoNow() }, o)));
    if (add.length) wkSaveOut();
    renderWeeklyWs();
    toast(add.length ? `Added ${plural(add.length, 'outage')} from ${file.name}${found.length > add.length ? ` (${found.length - add.length} were in the list already)` : ''}.` : `The ${plural(found.length, 'outage')} of ${file.name} ${found.length === 1 ? 'is' : 'are'} in the list already.`);
  } catch (e) { toast(`Could not read ${file.name}: ${errText(e)}`); }
}
async function wkFillBook(file) {
  state.wk.busy = 'book'; renderWeeklyWs();
  try {
    const r = await Weekly.fillWorkbook(new Uint8Array(await file.arrayBuffer()), wkModel());
    state.wk.bookNotes = r.notes;
    const name = file.name.replace(/\.xlsx$/i, '') + ` - ${Weekly.dayLong(wkWeek().deck)}.xlsx`;
    await save(name, new Blob([r.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } catch (e) { toast('Could not fill the workbook: ' + errText(e)); }
  finally { state.wk.busy = ''; renderWeeklyWs(); }
}
async function wkTemplate() {
  if (WK.tpl) return WK.tpl;
  const el = document.getElementById('wk-tpl'); if (!el) throw new Error('the deck design is not in this copy of the tool');
  const bin = atob(el.textContent.replace(/\s+/g, '')), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return (WK.tpl = u);
}
async function wkDeckBytes() { return Weekly.deck(await wkTemplate(), wkModel()); }
async function wkDownloadDeck() {
  state.wk.busy = 'deck'; renderWeeklyWs();
  try {
    const bad = Weekly.checks(wkModel()).filter(c => c.sev === 'bad').length;
    await save(Weekly.deckName(wkWeek()), new Blob([await wkDeckBytes()], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
    if (bad) setTimeout(() => toast(`The deck was made with ${plural(bad, 'thing')} still to fix (Check and send).`), 1800);
  } catch (e) { toast('Could not make the deck: ' + errText(e)); }
  finally { state.wk.busy = ''; renderWeeklyWs(); }
}
async function wkEmail() {
  state.wk.busy = 'deck'; renderWeeklyWs();
  try {
    const M = wkModel(), m = Weekly.email(M, wkTo(), wkCc());
    await saveEml(`Weekly Commercial Presentation - ${Weekly.dayLong(M.w.deck)}`, { to: splitAddr(m.to), cc: splitAddr(m.cc), subject: m.subject, html: m.html, files: [{ name: m.attach, bytes: await wkDeckBytes() }] });
  } catch (e) { toast('Could not make the email: ' + errText(e)); }
  finally { state.wk.busy = ''; renderWeeklyWs(); }
}

// ---------------------------------------------------------------- what is typed
function wkSetComplaint(path, raw) {
  const D = wkDoc(), C = D.complaints = D.complaints || {}, [b, k, f] = path.split('.'), X = C[b] = C[b] || { complaints: null, onTime: null, open: null, drivers: [] };
  if (/^d\d$/.test(k)) {
    const i = +k.slice(1); X.drivers = X.drivers || []; while (X.drivers.length <= i) X.drivers.push({ name: '', pct: null });
    if (f === 'name') X.drivers[i].name = normSpace(raw); else X.drivers[i].pct = Weekly.readPct(raw);
    while (X.drivers.length && !X.drivers[X.drivers.length - 1].name && X.drivers[X.drivers.length - 1].pct === null) X.drivers.pop();
  } else X[k] = k === 'onTime' ? Weekly.readPct(raw) : Weekly.readInt(raw);
  wkSaveDoc();
}
function wkSetTicket(path, raw) {
  const D = wkDoc(), T = D.tickets = D.tickets || { total: null, list: [] }, [i, f] = path.split('.');
  if (i === 'total') T.total = Weekly.readInt(raw);
  else { const n = +i; T.list = T.list || []; while (T.list.length <= n) T.list.push({ name: '', count: null }); if (f === 'name') T.list[n].name = normSpace(raw); else T.list[n].count = Weekly.readInt(raw); while (T.list.length && !T.list[T.list.length - 1].name && T.list[T.list.length - 1].count === null) T.list.pop(); }
  wkSaveDoc();
}
function wkRead() {
  const t = $('wkPaste'); state.wk.paste = t ? t.value : state.wk.paste;
  const r = Weekly.parseComplaints(state.wk.paste), got = Object.keys(r.brands);
  if (!got.length) { toast('No brand found in the text: each brand\'s figures start with its name (Virgin, Friendi, FPAY).'); return; }
  const D = wkDoc(); D.complaints = Object.assign({}, D.complaints || {}, r.brands); wkSaveDoc(); renderWeeklyWs();
  toast(`Read ${got.map(b => Weekly.NAME[b]).join(', ')}.${r.skipped.length ? ` ${plural(r.skipped.length, 'line')} not used: ${r.skipped.slice(0, 2).join(' · ')}` : ''} Check each figure below.`);
}
function wkAddOutage() {
  const date = $('wkODate').value, issue = normSpace($('wkOIssue').value), brands = normSpace($('wkOBrand').value), desc = normSpace($('wkODesc').value);
  if (!Weekly.isIso(date)) { toast('Choose the date of the outage.'); $('wkODate').focus(); return; }
  if (!issue) { toast('Write what the outage was.'); $('wkOIssue').focus(); return; }
  state.wk.out = (state.wk.out || []).concat([{ id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date, issue, brands, desc, at: new Date().toISOString(), by: whoNow() }]);
  state.wk.oDate = date; wkSaveOut(); renderWeeklyWs();
  const f = $('wkOIssue'); if (f) f.focus();
}
function wkDelOutage(id) {
  const L = state.wk.out || [], i = L.findIndex(o => o.id === id); if (i < 0) return;
  const gone = L[i]; state.wk.out = L.filter(o => o.id !== id); wkSaveOut(); renderWeeklyWs();
  toast(`Removed ${gone.issue}.`, { label: 'Undo', fn: () => { state.wk.out = (state.wk.out || []).concat([gone]); wkSaveOut(); renderWeeklyWs(); } });
}

$('wfmBar').addEventListener('click', e => {
  const b = e.target.closest('[data-wkweek]'); if (b && canWeekly()) { const n = +b.dataset.wkweek; state.wk.key = n ? Weekly.addDays(wkWeek().key, n) : Weekly.lastWeek(todayIso()).key; state.wk.paste = ''; renderWeeklyWs(); return; }
  if (e.target.closest('[data-wkdeck]') && canWeekly()) wkDownloadDeck();
});
$('wfmBody').addEventListener('click', e => {
  if (state.wfmTab !== 'weekly' || !canWeekly()) return;
  const t = e.target;
  if (t.closest('[data-wkdrop]') || t.closest('[data-wkdrop-tk]') || t.closest('[data-wkodeck]')) { $('wkFile').click(); return; }
  if (t.closest('[data-wkdeck]')) { wkDownloadDeck(); return; }
  if (t.closest('[data-wkbook]')) { $('wkBookFile').click(); return; }
  if (t.closest('[data-wkeml]')) { wkEmail(); return; }
  if (t.closest('[data-wkread]')) { wkRead(); return; }
  if (t.closest('[data-wkoadd]')) { wkAddOutage(); return; }
  const d = t.closest('[data-wkodel]'); if (d) { wkDelOutage(d.dataset.wkodel); return; }
  if (t.closest('[data-wkskipdef]')) { $('wkSkip').value = rbE().DEFAULT_SUPPRESSED.join('\n'); return; }
  if (t.closest('[data-wkskipsave]')) { state.wk.set = Object.assign({}, state.wk.set, { skip: $('wkSkip').value.split('\n').map(normSpace).filter(Boolean) }); wkSaveSet(); renderWeeklyWs(); toast('Saved: the top 5 are counted again without these.'); return; }
  if (t.closest('[data-wtgo]')) { wfmGo(t.closest('[data-wtgo]').dataset.wtgo); }
});
$('wfmBody').addEventListener('keydown', e => { if (state.wfmTab === 'weekly' && (e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-wkdrop]')) { e.preventDefault(); $('wkFile').click(); } });
$('wfmBody').addEventListener('change', e => {
  if (state.wfmTab !== 'weekly' || !canWeekly()) return;
  const t = e.target;
  if (t.id === 'wkFile') { const L = [...(t.files || [])]; t.value = ''; if (L.length) wkFiles(L); return; }
  if (t.id === 'wkBookFile') { const f = t.files && t.files[0]; t.value = ''; if (f) wkFillBook(f); return; }
  if (t.dataset.wkc) { wkSetComplaint(t.dataset.wkc, t.value); renderWeeklyWs(); return; }
  if (t.dataset.wkt) { wkSetTicket(t.dataset.wkt, t.value); renderWeeklyWs(); return; }
  if (t.id === 'wkTo' || t.id === 'wkCc') { state.wk.set = Object.assign({}, state.wk.set, { [t.id === 'wkTo' ? 'to' : 'cc']: t.value }); wkSaveSet(); }
});
$('wfmBody').addEventListener('input', e => { if (state.wfmTab === 'weekly' && e.target.id === 'wkPaste') state.wk.paste = e.target.value; });
$('wfmBody').addEventListener('toggle', e => { if (e.target.matches && e.target.matches('[data-wkdet="skip"]')) state.wk.skipOpen = e.target.open; }, true);
['dragenter', 'dragover'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-wkdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-wkdrop]'); if (z) z.classList.remove('over'); }));
