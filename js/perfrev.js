// ================================================================ WFM TEAM › PERFORMANCE REVIEW: the Member Care Performance Review deck
// The Control and Complaint team sends "MC performance Review": an email with tables by month (Rebooking TKTs, Network Issues TKTs,
// Web + App TKTs, Social Media issue TKTs, Vnet Complaints). Drop the email (.msg, or a saved .eml, or paste its text): PrDeck reads
// the tables and makes the deck in the weekly presentation's look (cover; Virgin, FRiENDi and Postpaid from the brands' history, as
// on Weekly commercial; two Complaints Insights slides; a slide for any other table; thank you). The email to the VP comes as an
// Outlook draft with the deck attached (the Weekly commercial settings: presenter, job title, To and Cc). The MC KPIs workbook the
// team's charts are linked to adds Rebooking by day, OTP calls and final termination calls; one of the team's decks dropped here
// gives its logos to both decks (config/decklogos). The Call history export from Crystal (the raw call reasons) gives the OTP calls and
// the final termination calls: counted by day (PrDeck.callsOf) and kept for everyone (config/calldays: the counts only), so the slide
// shows the last two months day by day and the year by month from the exports dropped over the weeks. The numbers the team's old
// deck (its OTP Count and Final termination Count charts) and the KPIs workbook already have are kept too (config/calldays.base) and
// shown as they are: the Call history only fills the days after them and completes a month they have part of. The email's and the
// workbook's other data stay in this browser; the tool sends nothing.
Object.assign(state, { prDate: '', prBusy: '', prBuilt: '', callDays: null });
const PR = { tables: null, from: '', notes: '', text: '', open: false, kpi: null, kpiFrom: '', calls: null, setOpen: false };
const PR_MAXDAYS = 800;   // the call days kept: a little over two years
const canPerf = () => canWeekly();
const prDateNow = () => (wcIsDay(state.prDate) ? state.prDate : wcToday());
const prRef = () => ({ y: +prDateNow().slice(0, 4), m: +prDateNow().slice(5, 7) });
const PR_NAMES = { rebooking: 'Rebooking TKTs', network: 'Network Issues TKTs', webapp: 'Web + App TKTs', social: 'Social Media issue TKTs', vnet: 'Vnet Complaints' };
/** an email's HTML as text: each table's rows tab-separated, a line for each block (nothing in it runs or loads) */
function prHtmlText(html) {
  if (typeof DOMParser === 'undefined') return htmlText(html);
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html'), out = [];
  const walk = n => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim()) out.push(t); return; }
    if (n.nodeType !== 1 || /^(script|style|head|title)$/i.test(n.tagName)) return;
    if (n.tagName === 'TABLE' && !n.querySelector('table')) { out.push('\n'); for (const tr of n.querySelectorAll('tr')) out.push([...tr.children].map(td => td.textContent.replace(/\s+/g, ' ').trim()).join('\t') + '\n'); return; }
    const block = /^(p|div|br|tr|li|h\d|table|tbody|blockquote)$/i.test(n.tagName);
    if (block) out.push('\n'); for (const c of n.childNodes) walk(c); if (block) out.push('\n');
  };
  walk(doc.body || doc.documentElement);
  return out.join('').replace(/[ \t]*\n[ \t]*/g, l => (l.includes('\t') ? l : '\n'));
}
/** what the tables say, from the email's text */
function prRead(text, from) {
  PR.text = String(text || ''); PR.from = from;
  const T = PrDeck.tablesOf(PR.text, prRef());
  PR.tables = T.length ? T : null;
  const miss = Object.keys(PR_NAMES).filter(k => !T.some(t => t.key === k));
  PR.notes = !T.length ? `No tables found in ${from}: drop the "MC performance Review" email (.msg), or paste its text with the tables.` : miss.length ? `Not in the email: ${miss.map(k => PR_NAMES[k]).join(', ')}. Their places say so on the slides.` : '';
  state.prBuilt = '';
}
/** one of the team's decks: its logos kept (as PNG pictures) for both decks, and its OTP and final termination calls, for everyone */
async function prDeckFile(f, u8) {
  const z = await Core.readZip(u8), L = await PrDeck.logosOf(z), out = {}, kept = [];
  for (const [k, v] of Object.entries(L)) {
    try {
      let b = ''; for (let i = 0; i < v.bytes.length; i += 32768) b += String.fromCharCode.apply(null, v.bytes.subarray(i, i + 32768));
      const img = await loadImg(`data:${v.type};base64,${btoa(b)}`), w = img.naturalWidth, h = img.naturalHeight; if (!w || !h || w > 2000 || h > 2000) continue;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0);
      out[k] = { dataUrl: cv.toDataURL('image/png'), w, h };
    } catch (e) { /* a picture the browser cannot draw: left out */ }
  }
  const keys = Object.keys(out), DC = await PrDeck.deckCallsOf(z);
  if (keys.length) {
    state.deckLogos = deckLogosOk({ ...(state.deckLogos || {}), ...out, from: f.name, at: new Date().toISOString(), by: whoNow() });
    if (state.db) { const body = { ...state.deckLogos }; queueWrite('config/decklogos', () => state.db.doc('config/decklogos').set(body)).catch(e => toast(`The logos were not saved (${(e && e.code) || 'error'}).`)); }
    kept.push(`logos (${keys.map(k => DECK_LOGOS[k]).join(', ')}), for both decks`);
  }
  if (DC.otp || DC.term) { prKeepBase(PrDeck.baseOf(DC), f.name); kept.push(prBaseText(PrDeck.baseOf(DC))); }
  if (!kept.length) { PR.notes = `${f.name}: no logos (the Beyond One logo top left, the brands' logos top right)${DC.own ? '' : ' and no OTP Count or Final termination Count chart'} found in it.`; return; }
  toast(`Kept from ${f.name}: ${kept.join('; ')}.`);
}
/** an export for the brands' slides (the month's Call history or Tickets), as on Weekly commercial: read in this browser, not kept */
function prMonthFile(name, label, month) { WC.files = WC.files.filter(x => x.name !== name).concat({ name, label }); WC.comb = {}; state.wcBuilt = ''; state.prBuilt = ''; month.push(label); }
/** a spreadsheet: the Call history export (its days go to got; its rows to the brands' slides), the Tickets export (the brands' slides)
    or the MC KPIs workbook (Rebooking by day, OTP calls, final termination calls) */
async function prSheet(f, buf, got, month) {
  let sheets;
  if (/\.xls$/i.test(f.name)) {
    await wcBoot(); sheets = window.parseXls(buf);
    const E = rbE(), rows = (sheets[0] && sheets[0].rows) || [], c = E.classify(f.name, 'xls', { rows });
    if (c.type === 'tickets') { const t = E.ticketRows(rows); WC.tickets[f.name] = t; prMonthFile(f.name, `Tickets · ${E.fmtInt(t.length)} rows${wcSpan(t.map(r => E.ticketDate(r[E.TCOL.date]) || E.rowDate(r[E.TCOL.date])))}`, month); return; }
    if (c.type === 'history') { const h = E.historyRows(rows); WC.calls[f.name] = h; prMonthFile(f.name, `Call history · ${E.fmtInt(h.length)} rows${wcSpan(h.map(r => E.rowDate(r[E.COL.date])))}`, month); }
  } else sheets = /\.xlsb$/i.test(f.name) ? await Core.readXlsb(buf) : await Core.readXlsx(buf);
  const C = PrDeck.callsOf(sheets);
  if (C) { if (C.rows) got.push({ name: f.name, ...C }); else PR.notes = `${f.name}: a Call history export with no calls in it.`; return; }
  const K = PrDeck.kpiOf(sheets);
  if (!K.byDay && !K.otp && !K.term && !K.byMonth) {
    const top = ((sheets[0] && sheets[0].rows) || []).slice(0, 2).map(r => (r || []).join(' ')).join(' ');
    PR.notes = /tickets\s*report/i.test(top) ? `${f.name} is the Tickets export: the OTP and final termination calls come from the Call history export (Crystal's "Call Center History Report").`
      : `${f.name}: not the Call history export (Crystal's "Call Center History Report") or the MC KPIs workbook (no "Reactivate the Booking code" or "OTP & Termination" sheet with its tables).`;
    return;
  }
  PR.kpi = K; PR.kpiFrom = f.name; state.prBuilt = '';
  if (K.otp || K.term) prKeepBase(PrDeck.baseOf(K), f.name);
}
/** the call days as kept: whole numbers by day (the latest PR_MAXDAYS days) and what counts; anything else is dropped */
function callDaysOk(d) {
  if (!d || typeof d !== 'object') return null;
  const src = d.days && typeof d.days === 'object' ? d.days : {}, days = {};
  for (const k of Object.keys(src).filter(wcIsDay).sort().slice(-PR_MAXDAYS)) {
    const x = src[k]; if (!x || typeof x !== 'object') continue;
    days[k] = Object.fromEntries(PrDeck.CALL_KEYS.map(f => { const v = +x[f]; return [f, Number.isInteger(v) && v >= 0 && v < 1e7 ? v : 0]; }));
  }
  const r = d.rule && typeof d.rule === 'object' ? d.rule : {}, B = d.base && typeof d.base === 'object' ? d.base : {}, bo = {}, bt = {};
  for (const k of Object.keys(B.otp && typeof B.otp === 'object' ? B.otp : {}).filter(wcIsDay).sort().slice(-PR_MAXDAYS)) { const v = +B.otp[k]; if (Number.isFinite(v) && v >= 0 && v < 1e7) bo[k] = v; }
  for (const k of Object.keys(B.term && typeof B.term === 'object' ? B.term : {}).filter(x => /^\d{4}-(0[1-9]|1[0-2])$/.test(x)).sort().slice(-120)) {
    const x = B.term[k], v = x && typeof x === 'object' ? +x.n : NaN; if (Number.isFinite(v) && v >= 0 && v < 1e8) bt[k] = { n: v, end: wcIsDay(x.end) && x.end.slice(0, 7) === k ? x.end : null };
  }
  const base = Object.keys(bo).length || Object.keys(bt).length ? { otp: bo, term: bt, from: String(B.from || '').slice(0, 300) } : null;
  return { days, rule: { ch: r.ch === 'call' ? 'call' : 'all', term: r.term === 'done' ? 'done' : 'all' }, base, from: String(d.from || '').slice(0, 300), at: String(d.at || '').slice(0, 40), by: String(d.by || '').slice(0, 120) };
}
const prRule = () => (state.callDays && state.callDays.rule) || { ch: 'all', term: 'all' };
/** the numbers kept from the old deck and the workbook (none: an empty set, so the slide shows only the Call history's) */
const prBase = () => (state.callDays && state.callDays.base) || { otp: {}, term: {} };
/** the fields a rule counts: OTP calls, final termination calls */
const prFields = r => ({ o: r.ch === 'call' ? 'otpCall' : 'otp', t: (r.term === 'done' ? 'done' : 'term') + (r.ch === 'call' ? 'Call' : '') });
/** a change to the call days: on this page at once, then made again on what the shared data has now (another computer may have added
    days since this page opened), in turn with the other saves of it, and saved. fn: the days kept (or null) → the days to keep (or null) */
function prCallsChange(fn) {
  state.callDays = fn(state.callDays); state.prBuilt = '';
  if (!state.db) return;
  const D = () => state.db.doc('config/calldays');
  queueWrite('config/calldays', async () => {
    let cur = state.callDays;
    try { const s = await D().get(); cur = fn(s.exists ? callDaysOk(s.data()) : null); } catch (e) { /* this page's copy */ }
    const moved = JSON.stringify(cur) !== JSON.stringify(state.callDays);   // another computer changed them meanwhile
    state.callDays = cur;
    await (cur ? D().set({ ...cur }) : D().delete());
    return moved;
  }).then(moved => { if (moved && prOn()) renderPerfWs(); }, e => toast(`The OTP and termination calls were not saved (${(e && e.code) || 'error'}).`));
}
const prStamp = () => ({ at: new Date().toISOString(), by: whoNow() });
/** the numbers a deck or the KPIs workbook gives, kept with those kept before (a day: the newer one; a month: the one that covers more) */
function prKeepBase(b, name) {
  const rule = prRule(), st = prStamp();
  prCallsChange(cd => {
    const old = cd && cd.base, from = [...new Set(String((old && old.from) || '').split(', ').filter(Boolean).concat(name))].join(', ');
    return callDaysOk({ days: {}, rule, ...(cd || {}), base: { ...PrDeck.baseMerge(old, b), from }, ...st });
  });
}
/** the numbers kept from a deck or the workbook, in words */
function prBaseText(B) {
  const D = Object.keys(B.otp || {}).sort(), M = Object.keys(B.term || {}).sort(), monL = ym => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`, L = [];
  if (D.length) L.push(`OTP calls on ${plural(D.length, 'day')} (${prRuns(D)})`);
  if (M.length) { const ly = M[M.length - 1], z = B.term[ly], part = z && z.end && wcAddDays(z.end, 1).slice(0, 7) === ly; L.push(`final termination calls ${M.length > 1 ? `${monL(M[0])} → ${monL(ly)}` : monL(ly)}${part ? `, ${monL(ly).split(' ')[0]} until ${prDmy(z.end)}` : ''}`); }
  return L.join(' and ');
}
/** the Call history exports of one drop: a day in two of them counted once (the fuller one); then kept with the days before */
function prKeepCalls(got) {
  let add = {}; for (const g of got) add = PrDeck.callsMerge(add, g.days);
  const rule = prRule(), from = got.map(g => g.name).join(', '), st = prStamp(), sum = L => { const o = {}; for (const g of got) for (const [k, n] of Object.entries(g.labels[L])) o[k] = (o[k] || 0) + n; return o; };
  PR.calls = { files: got.map(g => g.name), days: add, rows: got.reduce((a, g) => a + g.rows, 0), labels: { otp: sum('otp'), term: sum('term') } };
  prCallsChange(cd => callDaysOk({ rule, ...(cd || {}), days: PrDeck.callsMerge(cd ? cd.days : {}, add), from, ...st }));
}
async function prFiles(list) {
  if (!canPerf()) return;
  const F = [...list], got = [], month = []; if (!F.length) return;
  state.prBusy = 'read'; PR.notes = ''; renderPerfWs();
  for (const f of F) {
    try {
      const buf = await f.arrayBuffer(), u8 = new Uint8Array(buf);
      if (/\.msg$/i.test(f.name)) prRead(msgBodyText(u8), f.name);
      else if (/\.eml$/i.test(f.name)) { const P = UpdParse.emlParts(u8); const a = P.text ? PrDeck.tablesOf(P.text, prRef()) : []; prRead(a.length || !P.html ? P.text : prHtmlText(P.html), f.name); }
      else if (/\.(txt|html?)$/i.test(f.name)) { const t = new TextDecoder().decode(u8); prRead(/\.html?$/i.test(f.name) ? prHtmlText(t) : t, f.name); }
      else if (/\.(xls|xlsx|xlsm|xlsb)$/i.test(f.name)) await prSheet(f, buf, got, month);
      else if (/\.pptx$/i.test(f.name)) await prDeckFile(f, u8);
      else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(f.name)) PR.notes = `${f.name} is a picture, and the tool cannot read pictures: drop the email itself (save it from Outlook as .msg), or copy its text and paste it below.`;
      else PR.notes = `${f.name}: drop the "MC performance Review" email (.msg or .eml), the Call history export (.xls), the MC KPIs workbook (.xlsx) or one of your decks (.pptx, for its logos and its OTP and final termination calls).`;
    } catch (e) { PR.notes = `${f.name}: ${(e && e.message) || 'could not be read'}.`; }
  }
  if (got.length) prKeepCalls(got);
  state.prBusy = ''; renderPerfWs();
  const msg = [], ch = month.some(l => /^Call history/.test(l)), tk = month.some(l => /^Tickets/.test(l));
  if (got.length) { const c = PR.calls, k = prFields(prRule()), n = f => Object.values(c.days).reduce((a, x) => a + x[f], 0), w = (v, a) => `${v.toLocaleString('en-US')} ${a}${v === 1 ? '' : 's'}`; msg.push(`${plural(Object.keys(c.days).length, 'day')} of call history read: ${w(n(k.o), 'OTP call')}, ${w(n(k.t), 'final termination call')}`); }
  if (ch || tk) msg.push(`for the brands' slides: ${[ch ? 'the call reasons' : '', tk ? 'the complaints and tickets' : ''].filter(Boolean).join(' and ')}`);
  if (msg.length) toast(msg.join('; ') + '.');
  const mail = F.find(f => /\.(msg|eml|txt|html?)$/i.test(f.name));
  if (mail && PR.tables && PR.from === mail.name) toast(`${mail.name}: ${plural(PR.tables.length, 'table')} read.`);
}
const prDmy = d => `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`;
/** days as runs of days: "1–3 Nov", "30 Oct – 2 Nov", "5 Nov" (a long list: its first and last runs) */
function prRuns(days) {
  const out = [], lab = (x, y) => (x === y ? prDmy(x) : x.slice(0, 7) === y.slice(0, 7) ? `${+x.slice(8)}–${prDmy(y)}` : `${prDmy(x)} – ${prDmy(y)}`);
  let a = null, b = null;
  for (const d of days) { if (b && wcAddDays(b, 1) === d) { b = d; continue; } if (a) out.push(lab(a, b)); a = b = d; }
  if (a) out.push(lab(a, b));
  return (out.length > 6 ? out.slice(0, 3).concat('…', out.slice(-2)) : out).join(', ');
}
function renderPerfWs() {
  const body = $('wfmBody'); if (!body || state.ws !== 'wfm' || state.wfmTab !== 'perf') return;
  const ds = body.querySelector('details[data-prset]'), dp = body.querySelector('details[data-prpaste]'); if (ds) PR.setOpen = ds.open; if (dp) PR.open = dp.open;   // as they are on the page now
  if (!canPerf()) { $('wfmBar').innerHTML = '<div class="wsacts"></div>'; body.innerHTML = emptyCard('Only the WFM team', 'The WFM manager and the WFM analysts make the performance review.'); return; }
  if (!WC.ready) {
    $('wfmBar').innerHTML = '<div class="wsacts"></div>';
    if (!body.querySelector('.wcload')) body.innerHTML = '<div class="rbload big wcload" role="status"><span class="spin"></span><span>Opening the brands\' history…</span></div>';
    wcBoot().then(() => { WC.ready = true; if (state.ws === 'wfm' && state.wfmTab === 'perf') renderPerfWs(); }).catch(e => { if (state.ws === 'wfm' && state.wfmTab === 'perf') body.innerHTML = emptyCard('The performance review could not open', (e && e.message) || String(e)); });
    return;
  }
  const date = prDateNow(), c = wcCfg(), busy = state.prBusy, T = PR.tables, m = wcModel(date), R = rbR();
  $('wfmBar').innerHTML = `<label class="wsfield wcdate"><span>Presentation date</span><input type="date" class="cell" data-prdate value="${esc(date)}" max="2199-12-31"></label><div class="wsacts">
    <button class="btn" data-prdeck${busy || !T ? ' disabled' : ''}>${busy === 'deck' ? '<span class="spin" aria-hidden="true"></span>Making the deck…' : '<svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>Download deck'}</button>
    <button class="btn primary" data-prmail${busy || !T ? ' disabled' : ''}>${busy === 'mail' ? '<span class="spin" aria-hidden="true"></span>Making the email…' : 'Email with the deck'}</button></div>`;
  // 1. the email
  const rows = T ? T.map(t => { const a = t.rows[0], z = t.rows[t.rows.length - 1]; return `<tr><td dir="auto">${esc(t.title)}</td><td>${esc(a.label)} → ${esc(z.label)}</td><td class="num">${t.rows.length}</td><td dir="auto">${esc(t.cols.join(' · '))}</td><td class="num">${esc(z.vals.map(v => (v == null ? '–' : v > 0 && v < 1.5 && !Number.isInteger(v) ? Math.round(v * 1000) / 10 + '%' : Math.round(v).toLocaleString('en-US'))).join(' · '))}</td><td>${t.key === 'other' ? '<span class="pill info">its own slide</span>' : ''}</td></tr>`; }).join('') : '';
  const read = T ? `<div class="tablewrap prtab"><table><thead><tr><th>Table</th><th>Months</th><th class="r">Rows</th><th>Columns</th><th class="r">The last row</th><th><span class="sr">Slide</span></th></tr></thead><tbody>${rows}</tbody></table></div><p class="hint">Read from ${esc(PR.from)}.</p>` : '';
  const K = PR.kpi, dmy = prDmy, kd = [];
  if (K && K.byDay) kd.push(`Rebooking by day ${dmy(K.byDay[Math.max(0, K.byDay.length - 22)].date)} → ${dmy(K.byDay[K.byDay.length - 1].date)}`);
  if (K && K.otp) kd.push(`OTP calls ${plural(K.otp.length, 'day')} to ${dmy(K.otp[K.otp.length - 1].date)}`);
  if (K && K.term) kd.push(`Final termination calls ${plural(K.term.length, 'month')}`);
  const kpiLine = K ? `<p class="hint">MC KPIs workbook (${esc(PR.kpiFrom)}): ${esc(kd.join(' · ') || 'Rebooking by month')}.</p>` : '<p class="hint">For Rebooking by day, also drop the <b>MC KPIs workbook</b> (.xlsx) the team\'s charts are linked to; without it the deck shows Rebooking by month only. The OTP and final termination calls come from the Call history export, in step 3.</p>';
  const reading = busy === 'read' ? '<p class="hint" role="status"><span class="spin" aria-hidden="true"></span> Reading the files…</p>' : '';
  const drop = `<div class="drop rbdrop" data-prdrop role="button" tabindex="0" aria-label="Drop the MC performance Review email and the MC KPIs workbook, or choose them"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop the "MC performance Review" email and the MC KPIs workbook</strong><span>The .msg from Outlook (or a saved .eml) and the .xlsx, or click to choose them. The Call history export (.xls) can go here too; your old deck (.pptx) gives its logos to both decks and its OTP and final termination calls.</span></div><input type="file" hidden multiple accept=".msg,.eml,.txt,.html,.htm,.xls,.xlsx,.xlsm,.xlsb,.pptx,.png,.jpg,.jpeg" data-prpick>
    ${reading}${PR.notes ? `<p class="hint warnline">${esc(PR.notes)}</p>` : ''}${read}${kpiLine}
    <details class="wcpaste"${PR.open ? ' open' : ''} data-prpaste><summary>Or paste the email's text</summary><p class="hint">In Outlook, select the email's text with its tables (Ctrl+A), copy it and paste it here.</p><textarea class="cell rbta" rows="5" data-prtext spellcheck="false" placeholder="Rebooking TKTs:&#10;Months&#9;Virgin&#9;FRiENDi&#9;Total&#10;Jan&#9;…"></textarea><div class="acts"><button class="btn sm" data-prread>Read the text</button></div></details>`;
  // 2. the brands' slides
  const ref = m.ref, first = ref.slice(0, 8) + '01', want = []; for (let d = first; d <= ref; d = wcAddDays(d, 1)) want.push(d);
  const B = [m.brands[0], m.brands[1], m.postpaid].map(b => { const have = new Set(b.v.daily.map(r => r.date)); return { b, n: have.size, miss: want.filter(d => !have.has(d)) }; });
  const histOk = B.every(x => x.n && !x.miss.length), E2 = rbE(), inMtd = (L, dOf) => (L || []).filter(r => { const d = dOf(r); return d && d.slice(0, 7) === m.ym && d <= m.ref; }).length;
  const nC = inMtd(wcCalls(), r => E2.rowDate(r[E2.COL.date])), nT = inMtd(wcTickets(), r => E2.ticketDate(r[E2.TCOL.date]) || E2.rowDate(r[E2.TCOL.date])), hasC = Object.keys(WC.calls).length > 0, hasT = Object.keys(WC.tickets).length > 0;
  const pills = `<div class="wchist">${B.map(({ b, n, miss }) => `<span class="pill ${n && !miss.length ? 'good' : n ? 'warn' : 'bad'}" title="${esc(miss.length ? 'Missing: ' + rbShortDays(miss) : 'Every day is in the history')}"><i class="wcdot" style="background:#${b.color}"></i>${esc(b.short)} · ${n}/${want.length} days</span>`).join('')}</div>`;
  const span = want.length ? (want.length === 1 ? R.dayLabel(first) : R.niceRange(first, ref)) : '';
  const mFiles = WC.files.filter(x => !x.bad), mWarn = [];
  if (!hasC) mWarn.push('No Call history for the month yet: the Top Call Reasons show "–".'); else if (!nC) mWarn.push(`The Call history dropped has no calls in ${span}: the Top Call Reasons show "–". Drop this month's.`);
  if (!hasT) mWarn.push('No Tickets export for the month yet: Complaints logged, Closed tickets resolved on time, Tickets still open and the Top Complaint Drivers show "–".'); else if (!nT) mWarn.push(`The Tickets export dropped has no tickets in ${span}: the complaints and tickets show "–". Drop this month's.`);
  const brand = `${pills}<p class="hint">The service level and the trends: the month to date (${esc(span)}) and the months before, from the history the daily brand emails keep.</p>
    <div class="drop rbdrop" data-prdrop="month" role="button" tabindex="0" aria-label="Drop the month's Call history and Tickets exports, or choose them"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop the month's Call history and Tickets exports</strong><span>From Crystal (.xls), the month to date, or click to choose them: the Top Call Reasons, the complaints, the tickets and the Top Complaint Drivers. Read in this browser and not kept, so drop them again another day; they count on Weekly commercial too.</span></div><input type="file" hidden multiple accept=".xls" data-prpick="month">
    ${reading}${mFiles.length ? `<div class="rbfiles">${mFiles.map(x => `<div class="rbfile"><span class="fname" title="${esc(x.name)}">${esc(x.name)}</span><span class="ftag">${esc(x.label)}</span></div>`).join('')}</div><div class="rbmini"><button class="btn sm ghost" data-prmonthclear>Clear files</button></div>` : ''}
    ${mWarn.map(t => `<p class="hint warnline">${esc(t)}</p>`).join('')}`;
  // 3. OTP and final termination calls: the old deck's and the workbook's numbers as they are, the Call history's days after them
  const CD = state.callDays, rule = prRule(), F = prFields(rule), OT = PrDeck.otpTerm(prBase(), CD && CD.days, rule), own = CD ? Object.keys(CD.days).sort() : [], BS = CD && CD.base;
  const fmt = v => Math.round(v).toLocaleString('en-US'), C = PR.calls, cd = C ? Object.keys(C.days).sort() : [], tot = f => cd.reduce((a, d) => a + C.days[d][f], 0);
  const labs = L => Object.entries(L).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmt(v)}`).join(', ') || 'none';
  const nb = (v, one, many) => `<b>${fmt(v)}</b> ${v === 1 ? one : many}`;
  const readLine = C ? `<p class="hint">Read from ${esc(C.files.join(', '))}: ${esc(prRuns(cd))} · ${fmt(C.rows)} ${C.rows === 1 ? 'contact' : 'contacts'} · ${nb(tot(F.o), 'OTP call', 'OTP calls')} · ${nb(tot(F.t), 'final termination call', 'final termination calls')}.</p><p class="hint">In the export, every channel: ${esc(labs(C.labels.otp))}; ${esc(labs(C.labels.term))}.</p>` : '';
  const span2 = []; if (OT.otpEnd) for (let d = wcAddDays(PrDeck.monthsBack(OT.otpEnd, 2), 1); d <= OT.otpEnd; d = wcAddDays(d, 1)) span2.push(d);
  const have = new Set((OT.otp || []).filter(r => r.n != null).map(r => r.date)), monL = ym => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const by = CD && CD.at ? ` Last changed ${ago(CD.at)}${CD.by ? ' by ' + CD.by : ''}` : '', stamp = esc(by + (by && !/\.$/.test(by) ? '.' : '')), clear = BS || own.length ? ' <button class="btn sm ghost" data-prcallsrm>Clear</button>' : '';
  const baseLine = BS ? `<p class="hint">Kept as they are, from ${esc(BS.from || 'a deck')}: ${esc(prBaseText(BS))}.</p>` : '<p class="hint">Drop your old deck (.pptx) or the MC KPIs workbook once, and its OTP and final termination calls are kept as they are; the Call history then only adds the days after them.</p>';
  const keptLine = own.length || BS ? `<p class="hint">${own.length ? `From the Call history: the counts of ${plural(own.length, 'day')} (${esc(prRuns(own))}).` : 'No Call history kept yet.'}${stamp}${clear}</p>` : '';
  const slideLine = OT.otp || OT.term ? `<p class="hint">On the slide: OTP calls ${OT.otp ? `day by day, ${esc(dmy(OT.otp[0].date))} → ${esc(dmy(OT.otpEnd))} (${have.size} of the ${span2.length} days of the two months)` : '–'}; final termination calls ${OT.term ? `by month, ${esc(OT.term.length > 1 ? `${monL(OT.term[0].ym)} → ${monL(OT.term[OT.term.length - 1].ym)}` : monL(OT.term[0].ym))}${OT.termEnd ? `, until ${esc(dmy(OT.termEnd))}` : ''}` : '–'}.</p>${OT.miss.length ? `<p class="hint warnline">No data yet for ${esc(prRuns(OT.miss))}: drop those days' Call history to complete the slide.</p>` : ''}`
    : '<p class="hint">Nothing yet: drop the Call history export (Crystal\'s "Call Center History Report", .xls), and your old deck or the MC KPIs workbook for the days and months before. Without them the deck leaves the OTP and final termination slide out.</p>';
  const opt = (v, cur, t) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`;
  const setBox = `<details class="wcset" data-prset${PR.setOpen ? ' open' : ''}><summary>What counts</summary><div class="grid2">
    <label class="wsfield"><span>Channels</span><select class="cell" data-prrule="ch">${opt('all', rule.ch, 'Every channel: calls, WhatsApp, email, social media')}${opt('call', rule.ch, 'Calls only')}</select></label>
    <label class="wsfield"><span>Final termination calls</span><select class="cell" data-prrule="term">${opt('all', rule.term, 'Every Final Deactivation contact')}${opt('done', rule.term, 'Only the terminations done')}</select></label></div>
    <p class="hint">OTP calls: the contacts whose Service or Sub Service names OTP ("OTP is not received", "App OTP isn't Received"). Final termination calls: the Virgin and FRiENDi Final Deactivation contacts, or only those with the Sub Service "Termination Done". The days kept hold each way of counting, so a change here needs no new drop; the old deck's and the MC KPIs workbook's numbers stay as they are.</p></details>`;
  const calls = `<div class="drop rbdrop" data-prdrop="calls" role="button" tabindex="0" aria-label="Drop the Call history export, or choose it"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop the Call history export</strong><span>Crystal's "Call Center History Report" (.xls), one or more, or click to choose them. Whole days, up to yesterday; a day dropped again keeps its fuller export. Your old deck (.pptx) or the MC KPIs workbook can go here too.</span></div><input type="file" hidden multiple accept=".xls,.xlsx,.xlsb,.pptx" data-prpick="calls">
    ${reading}${readLine}${baseLine}${keptLine}${slideLine}${setBox}`;
  // 4. the deck and the email
  const slides = ['Cover', 'Virgin Mobile', 'FRiENDi Mobile', 'Postpaid', 'Complaints Insights: Web + App, Network, Social media', `Complaints Insights: Rebooking ${K && K.byDay ? 'by day and by month' : 'by month'}`]
    .concat(OT.otp || OT.term ? ['OTP calls and Final termination calls'] : [], T ? T.filter(t => t.key === 'other').map(t => `More Insights: ${t.title}`) : [], ['Thank you']);
  const G = state.deckLogos, logoLine = G ? `<div class="prlogos"><span class="hint">Logos from ${esc(G.from || 'a deck')}:</span>${Object.keys(DECK_LOGOS).filter(k => G[k]).map(k => `<img src="${esc(G[k].dataUrl)}" alt="${esc(DECK_LOGOS[k])}" title="${esc(DECK_LOGOS[k])}">`).join('')}<button class="btn sm ghost" data-prlogosrm>Remove</button></div>`
    : '<p class="hint">Logos: the tool\'s logo and the brands\' names. Drop one of your decks (.pptx) in step 1 once, and both decks show its Beyond One, Virgin, FRiENDi and FRiENDi Pay logos.</p>';
  const send = `<ol class="prslides">${slides.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${logoLine}
    <p class="hint">The email goes to ${esc(splitAddr(c.to).map(wcName).join(', ') || 'nobody yet')}${splitAddr(c.cc).length ? `, copy to ${esc(splitAddr(c.cc).map(wcName).join(', '))}` : ''}, with ${esc(PrDeck.fileName(date))} attached; it opens in Outlook as a draft to check and send. The presenter, the job title and who gets it are the <b>Weekly commercial</b> settings.</p>`;
  const sts = stepStates([!!T, histOk && nC > 0 && nT > 0, !!(OT.otp && OT.term), state.prBuilt === date]);
  const L3 = [
    { id: 'prs-mail', title: 'Drop the email', short: 'Email', cap: 'The "MC performance Review" email with its tables: Rebooking, Network issues, Web + App, Social media and Vnet. Read in this browser; nothing is kept.', body: drop },
    { id: 'prs-brand', title: 'The brands\' slides', short: 'Brands', cap: 'Virgin Mobile, FRiENDi Mobile and Postpaid, as on the weekly presentation: the brands\' history, and the month\'s Call history and Tickets exports.', body: brand },
    { id: 'prs-calls', title: 'OTP and final termination calls', short: 'OTP', cap: 'From the Call history export (the raw call reasons): the OTP calls of the last two months, day by day, and the final termination calls by month. Read in this browser; only the counts by day are kept.', body: calls },
    { id: 'prs-send', title: 'The deck and the email', short: 'Deck', cap: 'The slides, in the weekly presentation\'s look.', body: send, acts: `<button class="btn sm" data-prdeck${busy || !T ? ' disabled' : ''}>Download deck</button><button class="btn sm primary" data-prmail${busy || !T ? ' disabled' : ''}>Email with the deck</button>` },
  ];
  body.innerHTML = `<div class="flow wcflow prflow">${L3.map((x, i) => stepHtml(i + 1, { ...x, st: sts[i] })).join('')}</div>`;
  const ta = body.querySelector('[data-prtext]'); if (ta && PR.open) ta.value = PR.pasted || '';
}
async function prMake(kind) {
  if (state.prBusy || !canPerf() || !PR.tables) return;
  state.prBusy = kind; renderPerfWs();
  try {
    await wcBoot();
    const c = wcCfg(), date = prDateNow(), m = wcModel(date), D = PrDeck.deck(m, PR.tables, { presenter: c.presenter, title: normSpace(c.title), org: 'Beyond One', logo: await wcLogo(), logos: wcDeckLogos(), kpi: PR.kpi || undefined, base: prBase(), calls: state.callDays ? state.callDays.days : undefined, callRule: prRule() });
    const bytes = await D.bytes(), name = PrDeck.fileName(date);
    if (kind === 'deck') { if (await save(name, new Blob([bytes], { type: PPTX_TYPE }))) state.prBuilt = date; }
    else {
      const to = splitAddr(c.to), cc = splitAddr(c.cc), first = wcPerson(to[0]).split(' ')[0] || '';
      const text = `Hi${first ? ' ' + first : ''},\r\nKindly find the MC Performance Review as attached.\r\nSincerely.`;
      const p = t => `<p class="MsoNormal" style="margin:0;font-family:Calibri,sans-serif;font-size:11pt">${t}</p>`;
      const html = p(`Hi${first ? ' ' + esc(first) : ''},`) + p('Kindly find the MC Performance Review as attached.') + p('Sincerely.');
      if (await saveEml(`MC Performance Review - ${WcDeck.longDate(date)}`, { to, cc, subject: 'MC Performance Review', html, text, files: [{ name, bytes, type: PPTX_TYPE }] })) state.prBuilt = date;
    }
  } catch (e) { toast('The deck could not be made: ' + ((e && e.message) || e)); }
  finally { state.prBusy = ''; renderPerfWs(); }
}
const prOn = () => state.ws === 'wfm' && state.wfmTab === 'perf' && canPerf();
$('wfmBar').addEventListener('change', e => { if (!prOn() || !e.target.matches('[data-prdate]')) return; const v = e.target.value; state.prDate = wcIsDay(v) ? v : ''; if (PR.text) prRead(PR.text, PR.from); state.prBuilt = ''; renderPerfWs(); });
document.addEventListener('click', e => {
  if (!prOn()) return;
  const t = e.target.closest && e.target.closest('[data-prdeck], [data-prmail], [data-prdrop], [data-prread], [data-prlogosrm], [data-prcallsrm], [data-prmonthclear]'); if (!t || !($('wfmBody').contains(t) || $('wfmBar').contains(t))) return;
  if (t.matches('[data-prmonthclear]')) { wcClear(); state.prBuilt = ''; renderPerfWs(); return; }
  if (t.matches('[data-prcallsrm]')) {
    const old = state.callDays, oc = PR.calls, st = prStamp(); PR.calls = null;
    prCallsChange(cd => (cd ? { ...cd, days: {}, base: null, ...st } : null)); renderPerfWs();
    toast('The OTP and final termination calls kept are cleared (the old deck\'s and the Call history\'s).', { label: 'Undo', fn: () => { PR.calls = oc; prCallsChange(() => old); renderPerfWs(); } });
    return;
  }
  if (t.matches('[data-prlogosrm]')) { const old = state.deckLogos; state.deckLogos = null; if (state.db) queueWrite('config/decklogos', () => state.db.doc('config/decklogos').delete()).catch(() => {}); renderPerfWs(); toast('Logos removed: the tool\'s logo and the brands\' names again.', { label: 'Undo', fn: () => { state.deckLogos = old; if (state.db && old) queueWrite('config/decklogos', () => state.db.doc('config/decklogos').set(old)).catch(() => {}); renderPerfWs(); } }); return; }
  if (t.matches('[data-prdeck]')) prMake('deck');
  else if (t.matches('[data-prmail]')) prMake('mail');
  else if (t.matches('[data-prdrop]')) prPick(t);
  else if (t.matches('[data-prread]')) { const ta = $('wfmBody').querySelector('[data-prtext]'); PR.pasted = ta ? ta.value : ''; if (!normSpace(PR.pasted)) { PR.notes = 'Paste the email\'s text first.'; renderPerfWs(); return; } prRead(PR.pasted, 'the pasted text'); renderPerfWs(); if (PR.tables) toast(`${plural(PR.tables.length, 'table')} read from the pasted text.`); }
});
/** a drop zone clicked: its own file picker (the email's, or the Call history's) */
function prPick(z) { const k = z.dataset.prdrop, p = $('wfmBody').querySelector(k ? `[data-prpick="${k}"]` : '[data-prpick]:not([data-prpick="calls"]):not([data-prpick="month"])'); if (p) p.click(); }
$('wfmBody').addEventListener('change', e => {
  if (!prOn()) return; const t = e.target;
  if (t.matches('[data-prpick]')) { if (t.files && t.files.length) prFiles([...t.files]); t.value = ''; }
  else if (t.matches('[data-prrule]')) { const k = t.dataset.prrule, v = t.value, st = prStamp(); prCallsChange(cd => callDaysOk({ days: {}, ...(cd || {}), rule: { ...((cd && cd.rule) || {}), [k]: v }, ...st })); renderPerfWs(); }
});
$('wfmBody').addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-prpaste]')) PR.open = d.open; else if (d.matches && d.matches('details[data-prset]')) PR.setOpen = d.open; }, true);
$('wfmBody').addEventListener('input', e => { if (e.target.matches && e.target.matches('[data-prtext]')) PR.pasted = e.target.value; });
$('wfmBody').addEventListener('keydown', e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z && prOn() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); prPick(z); } });
['dragenter', 'dragover'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z) { e.preventDefault(); if (ev === 'drop') e.stopPropagation(); z.classList.remove('over'); if (ev === 'drop' && prOn() && e.dataTransfer && e.dataTransfer.files.length) prFiles([...e.dataTransfer.files]); } }));   // read once: the page's own drop handler does not see it
