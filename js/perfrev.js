// ================================================================ WFM TEAM › PERFORMANCE REVIEW: the Member Care Performance Review deck
// The Control and Complaint team sends "MC performance Review": an email with tables by month (Rebooking TKTs, Network Issues TKTs,
// Web + App TKTs, Social Media issue TKTs, Vnet Complaints). Drop the email (.msg, or a saved .eml, or paste its text): PrDeck reads
// the tables and makes the deck in the weekly presentation's look (cover; Virgin, FRiENDi and Postpaid from the brands' history, as
// on Weekly commercial; two Complaints Insights slides; a slide for any other table; thank you). The email to the VP comes as an
// Outlook draft with the deck attached (the Weekly commercial settings: presenter, job title, To and Cc). The MC KPIs workbook the
// team's charts are linked to adds Rebooking by day, OTP calls and final termination calls; one of the team's decks dropped here
// gives its logos to both decks (config/decklogos). The email's and the workbook's data stay in this browser; the tool sends nothing.
Object.assign(state, { prDate: '', prBusy: '', prBuilt: '' });
const PR = { tables: null, from: '', notes: '', text: '', open: false, kpi: null, kpiFrom: '' };
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
/** one of the team's decks: its logos kept (as PNG pictures) for both decks, for everyone */
async function prLogos(f, u8) {
  const L = await PrDeck.logosOf(await Core.readZip(u8)), out = {};
  for (const [k, v] of Object.entries(L)) {
    try {
      let b = ''; for (let i = 0; i < v.bytes.length; i += 32768) b += String.fromCharCode.apply(null, v.bytes.subarray(i, i + 32768));
      const img = await loadImg(`data:${v.type};base64,${btoa(b)}`), w = img.naturalWidth, h = img.naturalHeight; if (!w || !h || w > 2000 || h > 2000) continue;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0);
      out[k] = { dataUrl: cv.toDataURL('image/png'), w, h };
    } catch (e) { /* a picture the browser cannot draw: left out */ }
  }
  const keys = Object.keys(out);
  if (!keys.length) { PR.notes = `${f.name}: no logos found in it (the Beyond One logo top left, the brands' logos top right).`; return; }
  state.deckLogos = deckLogosOk({ ...(state.deckLogos || {}), ...out, from: f.name, at: new Date().toISOString(), by: whoNow() });
  if (state.db) { const body = { ...state.deckLogos }; queueWrite('config/decklogos', () => state.db.doc('config/decklogos').set(body)).catch(e => toast(`The logos were not saved (${(e && e.code) || 'error'}).`)); }
  toast(`Logos kept from ${f.name}: ${keys.map(k => DECK_LOGOS[k]).join(', ')}. Both decks use them.`);
}
/** the MC KPIs workbook: Rebooking by day, OTP calls, final termination calls */
async function prKpi(f, buf) {
  const sheets = /\.xlsb$/i.test(f.name) ? await Core.readXlsb(buf) : await Core.readXlsx(buf), K = PrDeck.kpiOf(sheets);
  if (!K.byDay && !K.otp && !K.term && !K.byMonth) { PR.notes = `${f.name}: not the MC KPIs workbook (no "Reactivate the Booking code" or "OTP & Termination" sheet with its tables).`; return; }
  PR.kpi = K; PR.kpiFrom = f.name; state.prBuilt = '';
}
async function prFiles(list) {
  if (!canPerf()) return;
  const F = [...list]; if (!F.length) return;
  state.prBusy = 'read'; PR.notes = ''; renderPerfWs();
  for (const f of F) {
    try {
      const buf = await f.arrayBuffer(), u8 = new Uint8Array(buf);
      if (/\.msg$/i.test(f.name)) prRead(msgBodyText(u8), f.name);
      else if (/\.eml$/i.test(f.name)) { const P = UpdParse.emlParts(u8); const a = P.text ? PrDeck.tablesOf(P.text, prRef()) : []; prRead(a.length || !P.html ? P.text : prHtmlText(P.html), f.name); }
      else if (/\.(txt|html?)$/i.test(f.name)) { const t = new TextDecoder().decode(u8); prRead(/\.html?$/i.test(f.name) ? prHtmlText(t) : t, f.name); }
      else if (/\.(xlsx|xlsm|xlsb)$/i.test(f.name)) await prKpi(f, buf);
      else if (/\.pptx$/i.test(f.name)) await prLogos(f, u8);
      else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(f.name)) PR.notes = `${f.name} is a picture, and the tool cannot read pictures: drop the email itself (save it from Outlook as .msg), or copy its text and paste it below.`;
      else PR.notes = `${f.name}: drop the "MC performance Review" email (.msg or .eml), the MC KPIs workbook (.xlsx) or one of your decks (.pptx, for its logos).`;
    } catch (e) { PR.notes = `${f.name}: ${(e && e.message) || 'could not be read'}.`; }
  }
  state.prBusy = ''; renderPerfWs();
  const mail = F.find(f => /\.(msg|eml|txt|html?)$/i.test(f.name));
  if (mail && PR.tables && PR.from === mail.name) toast(`${mail.name}: ${plural(PR.tables.length, 'table')} read.`);
}
function renderPerfWs() {
  const body = $('wfmBody'); if (!body || state.ws !== 'wfm' || state.wfmTab !== 'perf') return;
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
  const K = PR.kpi, dmy = d => `${+d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`, kd = [];
  if (K && K.byDay) kd.push(`Rebooking by day ${dmy(K.byDay[Math.max(0, K.byDay.length - 22)].date)} → ${dmy(K.byDay[K.byDay.length - 1].date)}`);
  if (K && K.otp) kd.push(`OTP calls ${plural(Math.min(52, K.otp.length), 'day')} to ${dmy(K.otp[K.otp.length - 1].date)}`);
  if (K && K.term) kd.push(`Final termination calls ${plural(K.term.length, 'month')}`);
  const kpiLine = K ? `<p class="hint">MC KPIs workbook (${esc(PR.kpiFrom)}): ${esc(kd.join(' · ') || 'Rebooking by month')}.</p>` : '<p class="hint">For Rebooking by day, OTP calls and Final termination calls, also drop the <b>MC KPIs workbook</b> (.xlsx) the team\'s charts are linked to; without it the deck leaves those charts out.</p>';
  const drop = `<div class="drop rbdrop" data-prdrop role="button" tabindex="0" aria-label="Drop the MC performance Review email and the MC KPIs workbook, or choose them"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop the "MC performance Review" email and the MC KPIs workbook</strong><span>The .msg from Outlook (or a saved .eml) and the .xlsx, or click to choose them. One of your decks (.pptx) dropped here gives its logos to both decks.</span></div><input type="file" hidden multiple accept=".msg,.eml,.txt,.html,.htm,.xlsx,.xlsm,.xlsb,.pptx,.png,.jpg,.jpeg" data-prpick>
    ${PR.notes ? `<p class="hint warnline">${esc(PR.notes)}</p>` : ''}${read}${kpiLine}
    <details class="wcpaste"${PR.open ? ' open' : ''} data-prpaste><summary>Or paste the email's text</summary><p class="hint">In Outlook, select the email's text with its tables (Ctrl+A), copy it and paste it here.</p><textarea class="cell rbta" rows="5" data-prtext spellcheck="false" placeholder="Rebooking TKTs:&#10;Months&#9;Virgin&#9;FRiENDi&#9;Total&#10;Jan&#9;…"></textarea><div class="acts"><button class="btn sm" data-prread>Read the text</button></div></details>`;
  // 2. the brands' slides
  const ref = m.ref, first = ref.slice(0, 8) + '01', want = []; for (let d = first; d <= ref; d = wcAddDays(d, 1)) want.push(d);
  const B = [m.brands[0], m.brands[1], m.postpaid].map(b => { const have = new Set(b.v.daily.map(r => r.date)); return { b, n: have.size, miss: want.filter(d => !have.has(d)) }; });
  const histOk = B.every(x => x.n && !x.miss.length);
  const pills = `<div class="wchist">${B.map(({ b, n, miss }) => `<span class="pill ${n && !miss.length ? 'good' : n ? 'warn' : 'bad'}" title="${esc(miss.length ? 'Missing: ' + rbShortDays(miss) : 'Every day is in the history')}"><i class="wcdot" style="background:#${b.color}"></i>${esc(b.short)} · ${n}/${want.length} days</span>`).join('')}</div>`;
  const span = want.length ? (want.length === 1 ? R.dayLabel(first) : R.niceRange(first, ref)) : '';
  const brand = `${pills}<p class="hint">The month to date (${esc(span)}) and the months before, from the history the daily brand emails keep. The call reasons and complaints on these slides come from the month's exports when they were dropped on <b>Weekly commercial</b> in this browser; else they show "–".</p>`;
  // 3. the deck and the email
  const slides = ['Cover', 'Virgin Mobile', 'FRiENDi Mobile', 'Postpaid', 'Complaints Insights: Web + App, Network, Social media', `Complaints Insights: Rebooking ${K && K.byDay ? 'by day and by month' : 'by month'}`]
    .concat(K && (K.otp || K.term) ? ['OTP calls and Final termination calls'] : [], T ? T.filter(t => t.key === 'other').map(t => `More Insights: ${t.title}`) : [], ['Thank you']);
  const G = state.deckLogos, logoLine = G ? `<div class="prlogos"><span class="hint">Logos from ${esc(G.from || 'a deck')}:</span>${Object.keys(DECK_LOGOS).filter(k => G[k]).map(k => `<img src="${esc(G[k].dataUrl)}" alt="${esc(DECK_LOGOS[k])}" title="${esc(DECK_LOGOS[k])}">`).join('')}<button class="btn sm ghost" data-prlogosrm>Remove</button></div>`
    : '<p class="hint">Logos: the tool\'s logo and the brands\' names. Drop one of your decks (.pptx) in step 1 once, and both decks show its Beyond One, Virgin, FRiENDi and FRiENDi Pay logos.</p>';
  const send = `<ol class="prslides">${slides.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${logoLine}
    <p class="hint">The email goes to ${esc(splitAddr(c.to).map(wcName).join(', ') || 'nobody yet')}${splitAddr(c.cc).length ? `, copy to ${esc(splitAddr(c.cc).map(wcName).join(', '))}` : ''}, with ${esc(PrDeck.fileName(date))} attached; it opens in Outlook as a draft to check and send. The presenter, the job title and who gets it are the <b>Weekly commercial</b> settings.</p>`;
  const sts = stepStates([!!T, histOk, state.prBuilt === date]);
  const L3 = [
    { id: 'prs-mail', title: 'Drop the email', short: 'Email', cap: 'The "MC performance Review" email with its tables: Rebooking, Network issues, Web + App, Social media and Vnet. Read in this browser; nothing is kept.', body: drop },
    { id: 'prs-brand', title: 'The brands\' slides', short: 'Brands', cap: 'Virgin Mobile, FRiENDi Mobile and Postpaid, as on the weekly presentation.', body: brand },
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
    const c = wcCfg(), date = prDateNow(), m = wcModel(date), D = PrDeck.deck(m, PR.tables, { presenter: c.presenter, title: normSpace(c.title), org: 'Beyond One', logo: await wcLogo(), logos: wcDeckLogos(), kpi: PR.kpi || undefined });
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
  const t = e.target.closest && e.target.closest('[data-prdeck], [data-prmail], [data-prdrop], [data-prread], [data-prlogosrm]'); if (!t || !($('wfmBody').contains(t) || $('wfmBar').contains(t))) return;
  if (t.matches('[data-prlogosrm]')) { const old = state.deckLogos; state.deckLogos = null; if (state.db) queueWrite('config/decklogos', () => state.db.doc('config/decklogos').delete()).catch(() => {}); renderPerfWs(); toast('Logos removed: the tool\'s logo and the brands\' names again.', { label: 'Undo', fn: () => { state.deckLogos = old; if (state.db && old) queueWrite('config/decklogos', () => state.db.doc('config/decklogos').set(old)).catch(() => {}); renderPerfWs(); } }); return; }
  if (t.matches('[data-prdeck]')) prMake('deck');
  else if (t.matches('[data-prmail]')) prMake('mail');
  else if (t.matches('[data-prdrop]')) { const p = $('wfmBody').querySelector('[data-prpick]'); if (p) p.click(); }
  else if (t.matches('[data-prread]')) { const ta = $('wfmBody').querySelector('[data-prtext]'); PR.pasted = ta ? ta.value : ''; if (!normSpace(PR.pasted)) { PR.notes = 'Paste the email\'s text first.'; renderPerfWs(); return; } prRead(PR.pasted, 'the pasted text'); renderPerfWs(); if (PR.tables) toast(`${plural(PR.tables.length, 'table')} read from the pasted text.`); }
});
$('wfmBody').addEventListener('change', e => { if (!prOn()) return; const t = e.target; if (t.matches('[data-prpick]')) { if (t.files && t.files.length) prFiles([...t.files]); t.value = ''; } });
$('wfmBody').addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details[data-prpaste]')) PR.open = d.open; }, true);
$('wfmBody').addEventListener('input', e => { if (e.target.matches && e.target.matches('[data-prtext]')) PR.pasted = e.target.value; });
$('wfmBody').addEventListener('keydown', e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z && prOn() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const p = $('wfmBody').querySelector('[data-prpick]'); if (p) p.click(); } });
['dragenter', 'dragover'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmBody').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-prdrop]'); if (z) { e.preventDefault(); if (ev === 'drop') e.stopPropagation(); z.classList.remove('over'); if (ev === 'drop' && prOn() && e.dataTransfer && e.dataTransfer.files.length) prFiles([...e.dataTransfer.files]); } }));   // read once: the page's own drop handler does not see it
