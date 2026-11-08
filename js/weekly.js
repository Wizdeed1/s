// ================================================================ WFM TEAM › WEEKLY COMMERCIAL: the Member Care Performance Review
// Every week the WFM team sends the VP the Weekly Commercial Presentation: a 7-slide PowerPoint (cover; Virgin Mobile, FRiENDi
// Mobile and FRiENDi Pay with their service level, daily and monthly trends, complaints, call reasons and complaint drivers;
// Postpaid; the outages of the last three months; thank you). The service level and the trends come from the brands' history the
// daily brand emails keep; the call reasons from the month-to-date Call history export; the complaints, resolved on time, still
// open and top tickets from the Complaint Management team's answer to "Weekly commercial meeting" (the .msg) or else the Tickets
// export; all dropped here, read in this browser and not kept; the outages from a list the team keeps here (config/outages). The deck is made here
// (WcDeck) and the email to the VP comes as an Outlook draft with the deck attached; the tool never sends anything itself.
Object.assign(state, { wcDate: '', wcCfg: null, outages: null, wcBusy: '', wcBuilt: '', deckLogos: null });
const WC = { calls: {}, tickets: {}, comb: {}, fpay: null, mail: null, files: [], loaded: null, boot: null, ready: false, saveT: 0, open: { paste: false, set: false }, pasteText: '' };
const WC0 = { presenter: '', title: '', to: '', cc: '', onTimeH: 72 };
const WC_BRAND = { virgin: 'Virgin', friendi: 'FRiENDi', fpay: 'FRiENDi Pay' };
const WC_MAXOUT = 500;
const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const canWeekly = () => hasRole('admin', 'wfm', 'user');
const wcPad = n => String(n).padStart(2, '0');
const wcToday = () => { const d = new Date(); return `${d.getFullYear()}-${wcPad(d.getMonth() + 1)}-${wcPad(d.getDate())}`; };
const wcIsDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const wcDateNow = () => (wcIsDay(state.wcDate) ? state.wcDate : wcToday());
const wcAddDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wcName = a => normSpace(String(a || '').replace(/<[^>]*>/g, '').replace(/"/g, ''));
const wcPerson = a => { const n = wcName(a); return /@/.test(n) ? '' : n; };   // the name in "Name <address>" (none for a bare address)
/** the settings: the presenter on the cover (the VP from the contacts unless typed here), their job title, who gets the email, and
    the hours within which a closed ticket counts as resolved on time */
function wcCfg() {
  const c = { ...WC0, ...(state.wcCfg || {}) }, K = contactsNow();
  c.to = normSpace(c.to) || K.vp || ''; c.cc = normSpace(c.cc) || K.form || '';
  c.presenter = normSpace(c.presenter) || wcPerson(splitAddr(c.to)[0]);
  const h = +c.onTimeH; c.onTimeH = Number.isFinite(h) && h > 0 && h <= 24 * 60 ? h : WC0.onTimeH;
  return c;
}
/** an outage as kept: its day, what it was, the brands it hit and a description (anything else is dropped) */
function wcOutageOk(x) {
  if (!x || typeof x !== 'object' || !wcIsDay(x.date)) return null;
  const s = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
  return { id: /^[a-z0-9]{4,24}$/i.test(String(x.id || '')) ? String(x.id) : wcId(), date: x.date, title: s(x.title, 200), brands: (Array.isArray(x.brands) ? x.brands : []).filter(k => Object.prototype.hasOwnProperty.call(WC_BRAND, k)).filter((k, i, L) => L.indexOf(k) === i), desc: s(x.desc, 600) };
}
const wcId = () => Math.random().toString(36).slice(2, 10);
const outagesNow = () => (Array.isArray(state.outages) ? state.outages : []);
/** the settings and the outages, from the shared data, once */
function wcLoad() {
  if (WC.loaded) return WC.loaded;
  WC.loaded = (async () => {
    if (!state.db) return;
    try { const s = await state.db.doc('config/weekly').get(); if (s.exists) { const d = s.data() || {}; state.wcCfg = { presenter: String(d.presenter || '').slice(0, 120), title: String(d.title || '').slice(0, 160), to: String(d.to || '').slice(0, 600), cc: String(d.cc || '').slice(0, 600), onTimeH: +d.onTimeH || WC0.onTimeH }; } } catch (e) { /* the defaults */ }
    try { const s = await state.db.doc('config/outages').get(); if (s.exists) { const d = s.data() || {}; if (Array.isArray(d.list)) state.outages = d.list.map(wcOutageOk).filter(Boolean); } } catch (e) { /* none yet */ }
    try { const s = await state.db.doc('config/decklogos').get(); if (s.exists) state.deckLogos = deckLogosOk(s.data()); } catch (e) { /* the tool's logo */ }
    try { const s = await state.db.doc('config/calldays').get(); if (s.exists) state.callDays = callDaysOk(s.data()); } catch (e) { /* none kept yet */ }
  })();
  return WC.loaded;
}
function wcSaveCfg() {
  if (!state.db) return;
  const body = { ...(state.wcCfg || {}), at: new Date().toISOString(), by: whoNow() };
  queueWrite('config/weekly', () => state.db.doc('config/weekly').set(body)).catch(e => toast(`The weekly settings were not saved (${(e && e.code) || 'error'}).`));
}
function wcSaveOutages(now) {
  clearTimeout(WC.saveT);
  const go = () => {
    if (!state.db) return;
    const list = outagesNow().slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(-WC_MAXOUT), body = { list, at: new Date().toISOString(), by: whoNow() };
    queueWrite('config/outages', () => state.db.doc('config/outages').set(body)).catch(e => toast(`The outages were not saved (${(e && e.code) || 'error'}).`));
  };
  if (now) go(); else WC.saveT = setTimeout(go, 600);
}
/** the logos taken from one of the team's decks (config/decklogos): PNG pictures the tool made itself, nothing else is kept */
const DECK_LOGOS = { mark: 'Beyond One mark', full: 'Beyond One', virgin: 'Virgin Mobile', friendi: 'FRiENDi Mobile', fpay: 'FRiENDi Pay' };
function deckLogosOk(d) {
  if (!d || typeof d !== 'object') return null; const out = {};
  for (const k of Object.keys(DECK_LOGOS)) { const x = d[k]; if (x && typeof x.dataUrl === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(x.dataUrl) && x.dataUrl.length < 400000 && +x.w > 0 && +x.h > 0) out[k] = { dataUrl: x.dataUrl, w: +x.w, h: +x.h }; }
  if (!Object.keys(out).length) return null;
  out.from = String(d.from || '').slice(0, 200); out.at = String(d.at || '').slice(0, 40); out.by = String(d.by || '').slice(0, 120);
  return out;
}
/** the decks' logos as pictures for the PowerPoint */
function wcDeckLogos() {
  const L = state.deckLogos, out = {}; if (!L) return out;
  for (const k of Object.keys(DECK_LOGOS)) if (L[k]) { const b = atob(L[k].dataUrl.split(',')[1]); out[k] = { png: Uint8Array.from(b, c => c.charCodeAt(0)), w: L[k].w, h: L[k].h }; }
  return out;
}
/** the report builder's modules and the brands' history (the shared copy first), once */
function wcBoot() {
  if (!WC.boot) { WC.boot = Promise.all([rbBoot(), wcLoad()]); WC.boot.catch(() => { WC.boot = null; }); }
  return WC.boot;
}
/** the exports' rows, combined (a row in two overlapping exports counted once), worked out again only when the files change */
function wcRows(kind) {
  const F = WC[kind], key = Object.keys(F).map(k => `${k}:${F[k].length}`).join('|'), C = WC.comb[kind];
  if (C && C.key === key) return C.rows;
  const rows = key ? rbCombine(F) : null; WC.comb[kind] = { key, rows }; return rows;
}
const wcCalls = () => wcRows('calls'), wcTickets = () => wcRows('tickets');
function wcModel(date) {
  const c = wcCfg();
  return WcDeck.model({ date: date || wcDateNow(), hist: rbHist(), calls: wcCalls(), tickets: wcTickets(), fpayTickets: WC.fpay ? WC.fpay.rows : null, outages: outagesNow(), onTimeH: c.onTimeH, reports: (window.Build || {}).REPORTS, complaints: WC.mail }, rbE());
}
/** an email's text: the .msg's text body, the .eml's text part (or its HTML as text), a saved .txt or .htm */
function wcMailText(name, u8) {
  if (/\.msg$/i.test(name)) return msgBodyText(u8);
  if (/\.eml$/i.test(name)) { const P = UpdParse.emlParts(u8); return P.text && WcDeck.complaintsOf(P.text) ? P.text : P.html ? prHtmlText(P.html) : P.text || ''; }
  const t = new TextDecoder().decode(u8); return /\.html?$/i.test(name) ? prHtmlText(t) : t;
}
/** the complaints email read (with the files: not kept), and its line in the list of files */
function wcTakeMail(name, r) {
  WC.mail = { name, ...r };
  return `Complaints email · ${r.periods.join(', ') || 'no month'} · ${Object.keys(r.brands).map(k => WC_BRAND[k]).join(', ')}`;
}
const WC_NOTMAIL = 'not the complaints email: drop the answer to "Weekly commercial meeting", with No. of Complaints for each brand';

// ---------------------------------------------------------------- the files: the month-to-date Crystal exports, FRiENDi Pay's tickets sheet
async function wcAddFiles(list) {
  if (!canWeekly()) return;
  state.wcBusy = 'read'; renderWeeklyWs();
  try { await wcBoot(); WC.ready = true; } catch (e) { state.wcBusy = ''; toast('The report builder could not open: ' + ((e && e.message) || e)); renderWeeklyWs(); return; }
  const E = rbE(), notes = [];
  for (const f of Array.from(list)) {
    try {
      if (/\.(msg|eml|txt|html?)$/i.test(f.name)) {   // the complaints email
        const r = WcDeck.complaintsOf(wcMailText(f.name, new Uint8Array(await f.arrayBuffer())));
        notes.push(r ? { name: f.name, label: wcTakeMail(f.name, r) } : { name: f.name, label: WC_NOTMAIL, bad: true });
        continue;
      }
      if (/\.xls$/i.test(f.name)) {
        const sheets = window.parseXls(await f.arrayBuffer()), rows = sheets[0] ? sheets[0].rows : [], c = E.classify(f.name, 'xls', { rows });
        if (c.type === 'history') { const p = E.historyRows(rows); WC.calls[f.name] = p; notes.push({ name: f.name, label: `Call history · ${E.fmtInt(p.length)} rows${wcSpan(p.map(r => E.rowDate(r[E.COL.date])))}` }); }
        else if (c.type === 'tickets') { const p = E.ticketRows(rows); WC.tickets[f.name] = p; notes.push({ name: f.name, label: `Tickets · ${E.fmtInt(p.length)} rows${wcSpan(p.map(r => E.ticketDate(r[E.TCOL.date]) || E.rowDate(r[E.TCOL.date])))}` }); }
        else notes.push({ name: f.name, label: 'not a Call history or Tickets export', bad: true });
        continue;
      }
      let rows = null;
      if (/\.xlsx$/i.test(f.name)) {
        const sheets = await window.parseXlsx(await f.arrayBuffer());
        for (const sh of sheets) { const pl = E.sheetPayload(sh.rows || []); if (E.isTicketSheet(pl)) { rows = E.parseTicketSheet(pl); break; } }
      } else if (/\.csv$/i.test(f.name)) {
        const pl = E.parseCsv(await f.text()); if (E.classify(f.name, 'csv', pl).type === 'fpayTickets') rows = E.parseTicketSheet(pl);
      }
      if (rows) { WC.fpay = { name: f.name, rows }; notes.push({ name: f.name, label: `FRiENDi Pay tickets · ${E.fmtInt(rows.reduce((a, r) => a + (+r.count || 0), 0))} tickets${wcSpan(rows.map(r => r.date))}` }); }
      else notes.push({ name: f.name, label: 'not recognised: drop the Call history, the complaints email, the Tickets export or FRiENDi Pay\'s tickets sheet', bad: true });
    } catch (err) { notes.push({ name: f.name, label: 'not readable (' + ((err && err.message) || err) + ')', bad: true }); }
  }
  WC.files = WC.files.filter(x => !notes.some(n => n.name === x.name)).concat(notes); WC.comb = {};
  state.wcBusy = ''; state.wcBuilt = ''; renderWeeklyWs();
  const bad = notes.filter(n => n.bad).length;
  toast(`${plural(notes.length - bad, 'file')} read${bad ? `, ${bad} not recognised` : ''}.`);
}
function wcSpan(dates) {
  const D = dates.filter(Boolean).sort(); if (!D.length) return '';
  const R = rbR(), a = D[0], b = D[D.length - 1];
  return ' · ' + (a === b ? R.dayLabel(a) : R.niceRange(a, b));
}
function wcClear() { WC.calls = {}; WC.tickets = {}; WC.comb = {}; WC.fpay = null; WC.mail = null; WC.files = []; state.wcBuilt = ''; renderWeeklyWs(); }

// ---------------------------------------------------------------- the outages: typed in, or pasted from Excel
const WC_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** a day from a pasted cell: 2026-10-02, 2/10/2026 (day first), 2-Oct, 2 Oct 2026, or an Excel date number; a day with no year
    takes the presentation's year (the year before when that would put it after the presentation) */
function wcParseDay(v, ref) {
  const s = normSpace(v); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return wcDayOk(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/))) return wcDayOk(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*\.?(?:[\s-,]+(\d{2,4}))?$/i)) && WC_MON[m[2].toLowerCase()]) {
    const mo = WC_MON[m[2].toLowerCase()], d = +m[1];
    if (m[3]) return wcDayOk(+m[3] < 100 ? 2000 + +m[3] : +m[3], mo, d);
    const y = +ref.slice(0, 4), a = wcDayOk(y, mo, d); return a && a > ref ? wcDayOk(y - 1, mo, d) : a;
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) { const n = Math.floor(+s); if (n > 20000 && n < 80000) return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10); }
  return null;
}
function wcDayOk(y, m, d) { if (!(y > 1990 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null; const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCMonth() === m - 1 ? t.toISOString().slice(0, 10) : null; }
function wcBrandsOf(s) {
  const t = String(s || '').toLowerCase(); if (/\ball\b/.test(t)) return ['virgin', 'friendi', 'fpay'];
  const L = []; if (/virgin/.test(t)) L.push('virgin'); if (/friendi(?!\s*pay)/.test(t.replace(/friendi\s*pay/g, ''))) L.push('friendi'); if (/f\s*pay|friendi\s*pay/.test(t)) L.push('fpay');
  return L;
}
/** rows pasted from Excel (Date, Outage and issue, Affected brand, Description): the lines with a day; a heading line is left out */
function wcPasteRows(text, ref) {
  return String(text || '').split(/\r?\n/).map(line => line.split('\t')).filter(c => c.some(x => normSpace(x))).map(c => {
    const d = wcParseDay(c[0], ref); if (!d) return null;
    return wcOutageOk({ date: d, title: normSpace(c[1]), brands: wcBrandsOf(c[2]), desc: normSpace(c.slice(3).join(' ')) });
  }).filter(Boolean);
}

// ---------------------------------------------------------------- the page
function renderWeeklyWs() {
  const body = $('wfmBody'); if (!body || state.ws !== 'wfm' || state.wfmTab !== 'weekly') return;
  const dp = body.querySelector('details.wcpaste'), ds = body.querySelector('details.wcset'); if (dp) WC.open.paste = dp.open; if (ds) WC.open.set = ds.open;   // as they are on the page now (a box opened just before is kept open)
  if (!canWeekly()) { $('wfmBar').innerHTML = '<div class="wsacts"></div>'; body.innerHTML = emptyCard('Only the WFM team', 'The WFM manager and the WFM analysts make the weekly presentation.'); return; }
  if (!WC.ready) {
    $('wfmBar').innerHTML = '<div class="wsacts"></div>';
    if (!body.querySelector('.wcload')) body.innerHTML = '<div class="rbload big wcload" role="status"><span class="spin"></span><span>Opening the brands\' history…</span></div>';
    wcBoot().then(() => { WC.ready = true; if (state.ws === 'wfm' && state.wfmTab === 'weekly') renderWeeklyWs(); }).catch(e => { if (state.ws === 'wfm' && state.wfmTab === 'weekly') body.innerHTML = emptyCard('The weekly presentation could not open', (e && e.message) || String(e)); });
    return;
  }
  const c = wcCfg(), date = wcDateNow(), m = wcModel(), R = rbR(), busy = state.wcBusy;
  const ref = m.ref, first = ref.slice(0, 8) + '01', want = []; for (let d = first; d <= ref; d = wcAddDays(d, 1)) want.push(d);
  const histRows = m.brands.concat([m.postpaid]).map(B => { const have = new Set(B.v.daily.map(r => r.date)), miss = want.filter(d => !have.has(d)); return { B, n: have.size, miss }; });
  const histOk = histRows.every(x => x.n && !x.miss.length), filesOk = !!(wcCalls() && (wcTickets() || WC.mail));
  const O = m.outages, outOk = O.list.length > 0, built = state.wcBuilt === date;
  const sts = stepStates([histOk, filesOk, outOk, built]);
  const span = want.length ? (want.length === 1 ? R.dayLabel(first) : R.niceRange(first, ref)) : '';
  $('wfmBar').innerHTML = `<label class="wsfield wcdate"><span>Presentation date</span><input type="date" class="cell" data-wcdate value="${esc(date)}" max="2199-12-31"></label><div class="wsacts">
    <button class="btn" data-wcdeck${busy ? ' disabled' : ''}>${busy === 'deck' ? '<span class="spin" aria-hidden="true"></span>Making the deck…' : '<svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>Download deck'}</button>
    <button class="btn primary" data-wcmail${busy ? ' disabled' : ''}>${busy === 'mail' ? '<span class="spin" aria-hidden="true"></span>Making the email…' : 'Email with the deck'}</button></div>`;
  const histHtml = `<div class="wchist">${histRows.map(({ B, n, miss }) => `<span class="pill ${n && !miss.length ? 'good' : n ? 'warn' : 'bad'}" title="${esc(miss.length ? 'Missing: ' + rbShortDays(miss) : 'Every day is in the history')}"><i class="wcdot" style="background:#${B.color}"></i>${esc(B.short)} · ${n}/${want.length} days</span>`).join('')}</div>
    ${histOk ? '' : `<p class="hint">${histRows.filter(x => x.miss.length).map(({ B, miss }) => `<b>${esc(B.short)}</b> has no ${esc(rbShortDays(miss))}`).join(' · ')}. Drop those days' exports on WFM team › Report builder, or import the brands' history on Emails › Daily brand emails.</p>`}`;
  const files = WC.files.length ? `<div class="rbfiles">${WC.files.map(f => `<div class="rbfile${f.bad ? ' bad' : ''}"><span class="fname" title="${esc(f.name)}">${esc(f.name)}</span><span class="ftag">${esc(f.label)}</span></div>`).join('')}</div><div class="rbmini"><button class="btn sm ghost" data-wcclear>Clear files</button></div>` : '<p class="hint">No files yet.</p>';
  const drop = `<div class="drop rbdrop" data-wcdrop role="button" tabindex="0" aria-label="Drop the month's exports, or choose them"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop the month-to-date files</strong><span>The Call history export from Crystal (.xls) and the complaints email (the answer to "Weekly commercial meeting", .msg or .eml); or the Tickets export (.xls) and FRiENDi Pay's tickets sheet (.xlsx or .csv). Or click to choose them</span></div><input type="file" multiple accept=".xls,.xlsx,.csv,.msg,.eml,.txt,.htm,.html" hidden data-wcpick>${files}`;
  const lo = O.from + '-01', inRange = x => x.date >= lo && x.date <= date;
  const L = outagesNow().slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), shown = L.filter(inRange), older = L.length - shown.length;
  const orow = x => `<tr data-oid="${esc(x.id)}"><td><input type="date" class="cell" data-of="date" value="${esc(x.date)}" aria-label="Day of the outage"></td><td><input class="cell" data-of="title" value="${esc(x.title)}" placeholder="Outage and issue" aria-label="Outage and issue" maxlength="200"></td>
    <td class="wcbr">${Object.entries(WC_BRAND).map(([k, n]) => `<label class="check"><input type="checkbox" data-ob="${k}"${x.brands.includes(k) ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</td>
    <td><input class="cell" data-of="desc" value="${esc(x.desc)}" placeholder="What members saw" aria-label="Description" maxlength="600"></td><td class="c"><button class="btn sm ghost" data-odel aria-label="Remove this outage">Remove</button></td></tr>`;
  const outHtml = `<div class="tablewrap wcout"><table><thead><tr><th>Date</th><th>Outage and issue</th><th>Affected brand</th><th>Description</th><th class="c"><span class="sr">Remove</span></th></tr></thead><tbody>${shown.length ? shown.map(orow).join('') : `<tr><td colspan="5" class="subtle">No outages in ${esc(O.span)} yet.</td></tr>`}</tbody></table></div>
    <div class="acts wcoacts"><button class="btn sm" data-oadd>Add an outage</button>${older ? `<span class="hint">${plural(older, 'older outage')} kept, not in this deck.</span>` : ''}</div>
    <details class="wcpaste"${WC.open.paste ? ' open' : ''}><summary>Paste rows from Excel</summary><p class="hint">Copy the rows (Date, Outage and issue, Affected brand, Description) and paste them here. A day like 6-Aug takes the presentation's year; a heading row is left out.</p><textarea class="cell rbta" data-opaste rows="4" placeholder="6-Aug&#9;Genesys outage&#9;Virgin, FRiENDi&#9;What happened">${esc(WC.pasteText)}</textarea><div class="acts"><button class="btn sm" data-opastego>Add these rows</button></div></details>`;
  const t = B => B.tickets, cell = v => `<td class="num">${esc(v)}</td>`;
  const top = v => `<td class="wctop" dir="auto"${v ? ` title="${esc(v)}"` : ''}>${esc(v || '–')}</td>`;   // a long label cut with …, whole on hover
  const pc = v => (v == null ? '–' : Math.round(v * 100) + '%'), nn = v => (v == null ? '–' : Math.round(v).toLocaleString('en-US'));
  const sum = `<div class="tablewrap wcsum"><table><thead><tr><th>Slide</th><th class="r">Service level</th><th class="r">Complaints logged</th><th class="r">Resolved on time</th><th class="r">Still open</th><th>Top call reason</th><th>Top TKT</th></tr></thead><tbody>
    ${m.brands.map(B => `<tr><td><i class="wcdot" style="background:#${B.color}"></i>${esc(B.name)}</td>${cell(pc(B.v.mtd && B.v.mtd.sl))}${cell(nn(t(B) && t(B).total))}${cell(pc(t(B) && t(B).onTime))}${cell(nn(t(B) && t(B).open))}${top((B.reasons && B.reasons.list[0] || {}).label)}${top((t(B) && t(B).drivers && t(B).drivers.list[0] || {}).label)}</tr>`).join('')}
    <tr><td><i class="wcdot" style="background:#${m.postpaid.color}"></i>Postpaid</td>${cell(pc(m.postpaid.v.mtd && m.postpaid.v.mtd.sl))}${cell(nn(m.postpaid.tickets && m.postpaid.tickets.base))}<td class="num">–</td><td class="num">–</td>${top((m.postpaid.reasons && m.postpaid.reasons.list[0] || {}).label)}${top((m.postpaid.tickets && m.postpaid.tickets.list[0] || {}).label)}</tr>
    <tr><td>Outages</td><td class="num" colspan="6">${plural(O.list.length, 'incident')} in ${esc(O.span)}${O.list.length ? `, ${plural(O.brands, 'brand')}` : ''}</td></tr></tbody></table></div>
    ${m.notes.length ? `<ul class="wcnotes">${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <p class="hint">The email goes to ${esc(splitAddr(c.to).map(wcName).join(', ') || 'nobody yet: type the address in the settings below')}${splitAddr(c.cc).length ? `, copy to ${esc(splitAddr(c.cc).map(wcName).join(', '))}` : ''}, with ${esc(WcDeck.fileName(date))} attached. It opens in Outlook as a draft to check and send.</p>
    <details class="wcset"${WC.open.set ? ' open' : ''}><summary>Settings: the cover and the email</summary><div class="grid2 tight">
      <label class="field"><span class="lbl">Presenter on the cover</span><input class="cell" data-wcset="presenter" value="${esc(c.presenter)}" maxlength="120"></label>
      <label class="field"><span class="lbl">Their job title</span><input class="cell" data-wcset="title" value="${esc(c.title)}" placeholder="As it shows under the name" maxlength="160"></label>
      <label class="field"><span class="lbl">To</span><input class="cell" data-wcset="to" value="${esc(c.to)}" maxlength="600"></label>
      <label class="field"><span class="lbl">Cc</span><input class="cell" data-wcset="cc" value="${esc(c.cc)}" maxlength="600"></label>
      <label class="field"><span class="lbl">Resolved on time: closed within (hours)</span><input class="cell" type="number" min="1" max="1440" step="1" data-wcset="onTimeH" value="${esc(c.onTimeH)}"></label></div>
      <p class="hint">Kept for the whole WFM team. Empty To and Cc take the VP and the final result form's contact from the senior manager's contacts.</p></details>`;
  const L4 = [
    { id: 'wcs-hist', title: 'The month in the brands\' history', short: 'History', cap: `The service level and the daily and monthly trends: ${esc(span)} (the month up to the day before the presentation), from the history the daily brand emails keep.`, body: histHtml },
    { id: 'wcs-files', title: 'Drop the month\'s exports', short: 'Exports', cap: 'Call history for the top call reasons; the complaints email for the complaints logged, resolved on time, still open and the top tickets (the Tickets export where the email has none). Read in this browser; nothing is kept.', body: drop },
    { id: 'wcs-out', title: 'Outages', short: 'Outages', cap: `The last 3 months (${esc(O.span)}) go in the deck. The list is kept for the whole WFM team: add each outage once.`, body: outHtml },
    { id: 'wcs-send', title: 'The deck and the email', short: 'Deck', cap: 'What the slides show. "–" where a file is missing.', body: sum, acts: `<button class="btn sm" data-wcdeck${busy ? ' disabled' : ''}>Download deck</button><button class="btn sm primary" data-wcmail${busy ? ' disabled' : ''}>Email with the deck</button>` },
  ];
  const focus = document.activeElement && body.contains(document.activeElement) ? document.activeElement : null, frow = focus && focus.closest('[data-oid]');
  const fsel = frow && (focus.dataset.of || focus.dataset.ob) ? `[data-oid="${frow.dataset.oid}"] ${focus.dataset.of ? `[data-of="${focus.dataset.of}"]` : `[data-ob="${focus.dataset.ob}"]`}` : null;
  body.innerHTML = `<div class="flow wcflow">${L4.map((x, i) => stepHtml(i + 1, { open: true, ...x, st: sts[i] })).join('')}</div>`;
  if (fsel) { const f = body.querySelector(fsel); if (f) f.focus(); }
}

// ---------------------------------------------------------------- the deck and the email
async function wcLogo() {
  try { const x = await xlLogo(); if (x && x.png && x.w && x.h) return { png: x.png, w: x.w, h: x.h }; } catch (e) { /* the next one */ }
  const bo = window.LOGOS && window.LOGOS.beyondone;
  if (typeof bo === 'string' && /^data:image\//.test(bo)) {
    try {
      const img = await loadImg(bo), w = img.naturalWidth || 0, h = img.naturalHeight || 0; if (!w || !h) return null;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0);
      return { png: new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/png'))).arrayBuffer()), w, h };
    } catch (e) { return null; }
  }
  return null;
}
async function wcDeckBytes() {
  await wcBoot();
  const c = wcCfg(), m = wcModel(), D = WcDeck.deck(m, { presenter: c.presenter, title: normSpace(c.title), org: 'Beyond One', logo: await wcLogo(), logos: wcDeckLogos() });
  return { m, bytes: await D.bytes(), name: WcDeck.fileName(m.date) };
}
async function wcMake(kind) {
  if (state.wcBusy || !canWeekly()) return;
  state.wcBusy = kind; renderWeeklyWs();
  try {
    const { m, bytes, name } = await wcDeckBytes();
    if (kind === 'deck') { if (await save(name, new Blob([bytes], { type: PPTX_TYPE }))) state.wcBuilt = m.date; }
    else {
      const c = wcCfg(), to = splitAddr(c.to), cc = splitAddr(c.cc), first = wcPerson(to[0]).split(' ')[0] || '';
      const text = `Hi${first ? ' ' + first : ''},\r\nKindly find the Weekly Commercial Presentation as attached.\r\nSincerely.`;
      const p = t => `<p class="MsoNormal" style="margin:0;font-family:Calibri,sans-serif;font-size:11pt">${t}</p>`;
      const html = p(`Hi${first ? ' ' + esc(first) : ''},`) + p('Kindly find the Weekly Commercial Presentation as attached.') + p('Sincerely.');
      if (await saveEml(`Weekly Commercial Presentation - ${WcDeck.longDate(m.date)}`, { to, cc, subject: 'Weekly Commercial Presentation', html, text, files: [{ name, bytes, type: PPTX_TYPE }] })) state.wcBuilt = m.date;
    }
  } catch (e) { toast('The deck could not be made: ' + ((e && e.message) || e)); }
  finally { state.wcBusy = ''; renderWeeklyWs(); }
}

// ---------------------------------------------------------------- what the page does
const wcOn = () => state.ws === 'wfm' && state.wfmTab === 'weekly' && canWeekly();
$('wfmBar').addEventListener('change', e => { if (!wcOn() || !e.target.matches('[data-wcdate]')) return; const v = e.target.value; state.wcDate = wcIsDay(v) ? v : ''; state.wcBuilt = ''; renderWeeklyWs(); });
document.addEventListener('click', e => {
  if (!wcOn()) return;
  const t = e.target.closest && e.target.closest('[data-wcdeck], [data-wcmail], [data-wcdrop], [data-wcclear], [data-oadd], [data-odel], [data-opastego]'); if (!t || !($('wfmBody').contains(t) || $('wfmBar').contains(t))) return;
  if (t.matches('[data-wcdeck]')) wcMake('deck');
  else if (t.matches('[data-wcmail]')) wcMake('mail');
  else if (t.matches('[data-wcdrop]')) { const p = $('wfmBody').querySelector('[data-wcpick]'); if (p) p.click(); }
  else if (t.matches('[data-wcclear]')) wcClear();
  else if (t.matches('[data-oadd]')) {
    const x = wcOutageOk({ date: wcAddDays(wcDateNow(), -1), title: '', brands: [], desc: '' }); state.outages = outagesNow().concat([x]); wcSaveOutages(); renderWeeklyWs();
    const f = $('wfmBody').querySelector(`[data-oid="${x.id}"] [data-of="title"]`); if (f) f.focus();
  } else if (t.matches('[data-odel]')) {
    const id = t.closest('[data-oid]').dataset.oid, old = outagesNow(), x = old.find(o => o.id === id); if (!x) return;
    state.outages = old.filter(o => o.id !== id); wcSaveOutages(true); renderWeeklyWs();
    toast(`Removed: ${x.title || 'the outage'} (${WcDeck.dShort(x.date)})`, { label: 'Undo', fn: () => { state.outages = outagesNow().concat([x]); wcSaveOutages(true); renderWeeklyWs(); } });
  } else if (t.matches('[data-opastego]')) {
    const ta = $('wfmBody').querySelector('[data-opaste]'), add = wcPasteRows(ta ? ta.value : '', wcDateNow());
    if (!add.length) { toast('No rows with a day: paste Date, Outage and issue, Affected brand and Description from Excel.'); return; }
    const key = x => `${x.date}|${normName(x.title)}`, have = new Set(outagesNow().map(key)), fresh = add.filter(x => !have.has(key(x)));
    WC.pasteText = ''; state.outages = outagesNow().concat(fresh); wcSaveOutages(true); renderWeeklyWs();
    toast(fresh.length ? `${plural(fresh.length, 'outage')} added${add.length > fresh.length ? `, ${add.length - fresh.length} already in the list` : ''}.` : 'Those outages are already in the list.');
  }
});
$('wfmBody').addEventListener('change', e => {
  if (!wcOn()) return;
  const t = e.target;
  if (t.matches('[data-wcpick]')) { if (t.files && t.files.length) wcAddFiles([...t.files]); t.value = ''; return; }
  if (t.matches('[data-wcset]')) {
    const k = t.dataset.wcset, v = k === 'onTimeH' ? Math.round(+t.value) : normSpace(t.value);
    if (k === 'onTimeH' && !(v > 0 && v <= 1440)) { toast('Type the hours: 1 to 1440.'); t.value = wcCfg().onTimeH; return; }
    if ((k === 'to' || k === 'cc') && v && !splitAddr(v).every(a => /@/.test(a))) { toast('Type addresses like Name <name@company.com>, separated by a semicolon.'); return; }
    state.wcCfg = { ...(state.wcCfg || {}), [k]: v }; wcSaveCfg(); state.wcBuilt = ''; renderWeeklyWs(); toast('Saved'); return;
  }
  const row = t.closest('[data-oid]'); if (!row) return;
  const x = outagesNow().find(o => o.id === row.dataset.oid); if (!x) return;
  if (t.matches('[data-ob]')) { const k = t.dataset.ob; x.brands = t.checked ? [...new Set(x.brands.concat([k]))] : x.brands.filter(b => b !== k); x.brands.sort((a, b) => Object.keys(WC_BRAND).indexOf(a) - Object.keys(WC_BRAND).indexOf(b)); }
  else if (t.dataset.of === 'date') { if (!wcIsDay(t.value)) { toast('Pick the day of the outage.'); t.value = x.date; return; } x.date = t.value; }
  else if (t.dataset.of === 'title') x.title = String(t.value).slice(0, 200);
  else if (t.dataset.of === 'desc') x.desc = String(t.value).slice(0, 600);
  else return;
  state.wcBuilt = ''; wcSaveOutages(); renderWeeklyWs();
});
$('wfmBody').addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details.wcpaste')) WC.open.paste = d.open; else if (d.matches && d.matches('details.wcset')) WC.open.set = d.open; }, true);   // open stays open when the page is drawn again
$('wfmBody').addEventListener('input', e => { if (e.target.matches && e.target.matches('[data-opaste]')) WC.pasteText = e.target.value; });
$('wfmBody').addEventListener('keydown', e => { const z = e.target.closest && e.target.closest('[data-wcdrop]'); if (z && wcOn() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const p = $('wfmBody').querySelector('[data-wcpick]'); if (p) p.click(); } });
['dragenter', 'dragover'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-wcdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-wcdrop]'); if (z) { e.preventDefault(); if (ev === 'drop') e.stopPropagation(); z.classList.remove('over'); if (ev === 'drop' && wcOn() && e.dataTransfer && e.dataTransfer.files.length) wcAddFiles([...e.dataTransfer.files]); } }));   // read once: the page's own drop handler does not see it
