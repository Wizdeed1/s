// ================================================================ INTERACTIONS: the Genesys interactions export, day by day
// The export lists every inbound interaction: who handled it, when, how long, which queue, who hung up and any error.
// It is read in a background worker and kept only as day totals, per queue and per agent; the callers' numbers (ANI) are
// used only inside the worker to count repeat calls and are never kept.
Object.assign(state, { inter: {}, interVer: 0, interK: '', interBusy: '', interSort: 'calls', interDir: 'desc', interQ: '' });

/** runs in a worker (or here): CSV text -> { days: { 'YYYY-MM-DD': day totals }, file: {...} } */
function interAgg(text, opt) {
  const SHORT = (opt && opt.short) || 10, AGSHORT = 30;
  // ---- CSV rows (quotes, doubled quotes, CRLF)
  const rows = [], L = text.length; let i = 0;
  while (i < L) {
    const row = [];
    for (;;) {
      if (text.charCodeAt(i) === 34) {   // a quoted field: "" inside is one quote
        let j = i + 1, s = '';
        for (;;) { const k = text.indexOf('"', j); if (k < 0) { s += text.slice(j); i = L; break; } if (text.charCodeAt(k + 1) === 34) { s += text.slice(j, k + 1); j = k + 2; continue; } s += text.slice(j, k); i = k + 1; break; }
        row.push(s);
      } else { let j = i; while (j < L) { const c = text.charCodeAt(j); if (c === 44 || c === 10 || c === 13) break; j++; } row.push(text.slice(i, j)); i = j; }
      const c = text.charCodeAt(i);
      if (c === 44) { i++; continue; }
      if (c === 13) { i++; if (text.charCodeAt(i) === 10) i++; }
      else if (c === 10) i++;
      break;
    }
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  if (!rows.length) return { error: 'empty file' };
  const H = rows[0].map(h => String(h).replace(/^﻿/, '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const col = (...n) => { for (const x of n) { const i = H.indexOf(x); if (i >= 0) return i; } return -1; };
  const cU = col('users', 'agent', 'agentname'), cD = col('date', 'starttime', 'conversationstart'), cDur = col('duration'), cDir = col('direction'), cQ = col('queue', 'queuename'),
    cA = col('ani'), cDT = col('disconnecttype'), cE = col('errorcode', 'errorcodes'), cM = col('mediatype'), cW = col('wrapup');
  if (cD < 0 || cU < 0 || cDur < 0) return { error: 'This is not the interactions export (it needs Date, Users and Duration).' };
  // ---- dates: M/D/YY h:mm AM (US export) or D/M/YY; the order is read from the file
  let md = 0, dm = 0;
  for (let i = 1; i < Math.min(rows.length, 3000); i++) { const m = /^(\d{1,2})\/(\d{1,2})\/\d{2,4}/.exec(String(rows[i][cD] || '').trim()); if (!m) continue; if (+m[1] > 12) dm++; if (+m[2] > 12) md++; }
  const dayFirst = dm > md;
  const parseT = s => {
    s = String(s || '').trim();
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i.exec(s);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; let h = +m[4]; const ap = (m[7] || '').toUpperCase(); if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0; const mo = dayFirst ? +m[2] : +m[1], d = dayFirst ? +m[1] : +m[2]; return { y, mo, d, h, mi: +m[5], t: Date.UTC(y, mo - 1, d, h, +m[5], +(m[6] || 0)) }; }
    m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
    if (m) return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) };
    return null;
  };
  const dur = s => { const m = /(\d+):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(String(s || '')); if (!m) { const n = parseFloat(s); return Number.isFinite(n) ? n : 0; } return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +('0.' + m[4]) : 0); };
  const pad = n => String(n).padStart(2, '0');
  const brandOf = qn => { const s = String(qn || '').toLowerCase(); if (!s) return ''; if (/friendi\s*pay|fpay/.test(s)) return 'Friendi Pay'; if (/friendi/.test(s)) return 'Friendi'; if (/postpaid/.test(s)) return 'Virgin Postpaid'; if (/virgin/.test(s)) return 'Virgin'; return 'Other'; };
  const days = {}, calls = [], callers = new Map();
  const dayOf = k => days[k] || (days[k] = { n: 0, hand: 0, ivr: 0, abd: 0, dur: 0, short: 0, agentDisc: 0, extDisc: 0, sysDisc: 0, drops: 0, xfer: 0, rep24: 0, rep72: 0, cb: 0, errs: {}, hours: new Array(24).fill(0), handH: new Array(24).fill(0), q: {}, b: {}, a: {} });
  let n = 0, bad = 0, outb = 0, min = null, max = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (!r || r.length < 3) continue;
    const dir = String(cDir >= 0 ? r[cDir] : 'Inbound');
    if (/^out/i.test(dir.trim())) { outb++; continue; }
    const T = parseT(r[cD]); if (!T) { bad++; continue; }
    n++;
    const dk = `${T.y}-${pad(T.mo)}-${pad(T.d)}`, D = dayOf(dk);
    if (!min || dk < min) min = dk; if (!max || dk > max) max = dk;
    const users = String(r[cU] || '').split(';').map(u => u.replace(/\s*\(.*?\)/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const qn = String(cQ >= 0 ? r[cQ] : '').split(';')[0].replace(/\s+/g, ' ').trim(), sec = dur(r[cDur]), dt = String(cDT >= 0 ? r[cDT] : '').trim(), err = String(cE >= 0 ? r[cE] : '').trim(), media = String(cM >= 0 ? r[cM] : '').trim().toLowerCase();
    D.n++; D.hours[T.h]++;
    if (media === 'callback') D.cb++;
    if (/inbound\/outbound/i.test(dir)) D.cb++;
    if (err) D.errs[err] = (D.errs[err] || 0) + 1;
    const Q = qn ? (D.q[qn] || (D.q[qn] = [0, 0, 0, 0])) : null; if (Q) Q[0]++;
    const bn = brandOf(qn) || (users.length ? '' : 'IVR'), B = bn ? (D.b[bn] || (D.b[bn] = [0, 0, 0, 0])) : null; if (B) B[0]++;
    const drop = /webrtc|dtlspeerdisconnect|iceidle|iceconsent|media\.endpoint\.idle/i.test(err);
    if (!users.length) { if (qn) { D.abd++; if (Q) Q[2]++; if (B) B[2]++; } else D.ivr++; continue; }
    D.hand++; D.handH[T.h]++; D.dur += sec; if (Q) { Q[1]++; Q[3] += sec; } if (B) { B[1]++; B[3] += sec; }
    if (dt === 'Agent') D.agentDisc++; else if (dt === 'External') D.extDisc++; else if (dt === 'System') D.sysDisc++;
    if (sec > 0 && sec < SHORT) D.short++;
    if (drop) D.drops++;
    if (users.length > 1) D.xfer++;
    const owner = users[0], A = D.a[owner] || (D.a[owner] = [0, 0, 0, 0, 0, 0, 0, 0]);   // calls, secs, short, agent hang-ups, drops, transferred, repeat in 72h, short agent hang-ups
    A[0]++; A[1] += sec; if (sec > 0 && sec < SHORT) A[2]++; if (dt === 'Agent') { A[3]++; if (sec < AGSHORT) A[7]++; } if (drop) A[4]++; if (users.length > 1) A[5]++;
    // repeat callers: the number only lives here, as a key
    const ani = String(cA >= 0 ? r[cA] : '').replace(/^(?:tel:|sip:)?\+?/i, '').split('@')[0].replace(/\D/g, '');
    if (ani.length >= 7) { const c = { t: T.t, dk, owner }; calls.push(c); const L = callers.get(ani); if (L) L.push(c); else callers.set(ani, [c]); }
  }
  const dist = { 1: 0, 2: 0, 3: 0, '4+': 0 };
  for (const L of callers.values()) {
    dist[L.length >= 4 ? '4+' : L.length]++;
    L.sort((a, b) => a.t - b.t);
    for (let j = 0; j + 1 < L.length; j++) {
      const gap = L[j + 1].t - L[j].t, D = days[L[j].dk];
      if (gap <= 24 * 3600000) D.rep24++;
      if (gap <= 72 * 3600000) { D.rep72++; const A = D.a[L[j].owner]; if (A) A[6]++; }
    }
  }
  for (const D of Object.values(days)) { D.dur = Math.round(D.dur); for (const x of Object.values(D.q)) x[3] = Math.round(x[3]); for (const x of Object.values(D.b)) x[3] = Math.round(x[3]); for (const x of Object.values(D.a)) x[1] = Math.round(x[1]); }   // whole seconds
  const months = {}; for (const k of Object.keys(days)) months[k.slice(0, 7)] = (months[k.slice(0, 7)] || 0) + days[k].n;
  return { days, file: { rows: n, bad, outb, from: min, to: max, callers: callers.size, dist, months, dayFirst, short: SHORT } };
}
let interWorkerUrl = '';
function interParse(file) {
  return new Promise((resolve, reject) => {
    const fallback = () => file.text().then(t => resolve(interAgg(t, {})), reject);
    try {
      if (!interWorkerUrl) interWorkerUrl = URL.createObjectURL(new Blob([`const interAgg = ${interAgg.toString()};\nself.onmessage = async e => { try { const t = await e.data.file.text(); self.postMessage({ ok: interAgg(t, e.data.opt || {}) }); } catch (err) { self.postMessage({ error: String((err && err.message) || err) }); } };`], { type: 'text/javascript' }));
      const w = new Worker(interWorkerUrl);
      w.onmessage = e => { w.terminate(); if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.ok); };
      w.onerror = e => { if (e && e.preventDefault) e.preventDefault(); w.terminate(); fallback(); };
      w.postMessage({ file, opt: {} });
    } catch (e) { fallback(); }
  });
}
/** does this file look like the interactions export? (only its first line is read) */
async function isInterFile(file) {
  if (!/\.csv$/i.test(file.name)) return false;
  try { const head = (await file.slice(0, 2048).text()).split(/\r?\n/)[0].toLowerCase(); return /users/.test(head) && /duration/.test(head) && /(disconnect type|ani|media type)/.test(head) && /date/.test(head); } catch (e) { return false; }
}
const canInter = () => hasRole('admin', 'wfm');   // the WFM manager adds it; the senior manager and the analysts read it
async function importInteractions(file) {
  if (!canInter()) { toast('The WFM manager adds the interactions export.'); return; }
  if (!state.db) { toast('Nothing can be saved in this view.'); return; }
  state.interBusy = `Reading ${file.name}…`; if (state.ws === 'wfm') renderWs();
  let res; try { res = await interParse(file); } catch (e) { state.interBusy = ''; toast(`Could not read ${file.name} (${(e && e.message) || e}).`); renderWs(); return; }
  if (!res || res.error) { state.interBusy = ''; toast(res ? res.error : 'Could not read the file.'); renderWs(); return; }
  const at = new Date().toISOString(), by = whoNow(), ks = new Set();
  let nd = 0;
  for (const [dk, D] of Object.entries(res.days)) {
    const k = dk.slice(0, 7); ks.add(k);
    const body = { ...D, date: dk, at, by, src: file.name };
    await queueWrite(`inter/${k}/days/${dk}`, () => state.db.doc(`inter/${k}/days/${dk}`).set(body));
    (state.inter[k] = state.inter[k] || { days: {}, files: [] }).days[dk] = body; nd++;
  }
  for (const k of ks) {
    const cur = state.inter[k], files = [...(cur.files || []).filter(f => f.name !== file.name), { name: file.name, at, by, from: res.file.from, to: res.file.to, rows: res.file.rows, callers: res.file.callers, dist: res.file.dist }].slice(-20);
    cur.files = files;
    await queueWrite(`inter/${k}`, () => state.db.doc(`inter/${k}`).set({ k, files, at, by }));
  }
  state.interVer++; state.interBusy = '';
  markFresh('inter', `${res.file.from ? `${res.file.from.slice(8)}–${res.file.to.slice(8)} ${MON[+res.file.to.slice(5, 7) - 1]}` : ''}, ${res.file.rows.toLocaleString('en-US')} interactions`);
  if (ks.size) state.interK = [...ks].sort().pop();
  toast(`${file.name}: ${res.file.rows.toLocaleString('en-US')} interactions over ${plural(nd, 'day')} saved as day totals (no phone numbers are kept).`);
  if (state.ws === 'wfm') { state.wfmTab = 'inter'; renderWs(); }
}
/** the interactions of the months on screen, kept live */
const interLoading = new Set();
function watchInter(db) {
  try { db.collection('inter').onSnapshot(sn => { sn.docs.forEach(d => { const x = d.data(); const cur = state.inter[d.id] = state.inter[d.id] || { days: {}, files: [] }; cur.files = x.files || []; cur.at = x.at; }); state.interVer++; if (state.ws === 'wfm') renderWs(); }, () => {}); } catch (e) { /* none */ }
}
function interMonth(k) {
  const cur = state.inter[k]; if (!cur || !state.db) return cur || null;
  if (!cur.loadedDays && !interLoading.has(k)) {
    interLoading.add(k);
    try { state.db.collection(`inter/${k}/days`).onSnapshot(sn => { cur.days = {}; sn.docs.forEach(d => { cur.days[d.id] = d.data(); }); cur.loadedDays = true; state.interVer++; if (state.ws === 'wfm' || state.ws === 'team') renderWs(); }, () => {}); } catch (e) { /* none */ }
  }
  return cur;
}
/** a month's totals from its days: the same fields, plus per agent and per queue */
const interMemo = new Map();
function interTotals(k) {
  const cur = interMonth(k); if (!cur || !cur.days || !Object.keys(cur.days).length) return null;
  const sig = `${state.interVer}|${Object.keys(cur.days).length}`, hit = interMemo.get(k); if (hit && hit.sig === sig) return hit.v;
  const T = { days: Object.keys(cur.days).sort(), n: 0, hand: 0, ivr: 0, abd: 0, dur: 0, short: 0, agentDisc: 0, extDisc: 0, sysDisc: 0, drops: 0, xfer: 0, rep24: 0, rep72: 0, cb: 0, errs: {}, hours: new Array(24).fill(0), handH: new Array(24).fill(0), wh: Array.from({ length: 7 }, () => new Array(24).fill(0)), whN: new Array(7).fill(0), q: {}, b: {}, a: {}, files: cur.files || [] };
  for (const dk of T.days) {
    const D = cur.days[dk];
    for (const f of ['n', 'hand', 'ivr', 'abd', 'dur', 'short', 'agentDisc', 'extDisc', 'sysDisc', 'drops', 'xfer', 'rep24', 'rep72', 'cb']) T[f] += D[f] || 0;
    for (const [e, c] of Object.entries(D.errs || {})) T.errs[e] = (T.errs[e] || 0) + c;
    const wd = new Date(dk + 'T12:00:00Z').getUTCDay(); T.whN[wd]++;
    (D.hours || []).forEach((v, h) => { T.hours[h] += v; T.wh[wd][h] += v; }); (D.handH || []).forEach((v, h) => { T.handH[h] += v; });
    for (const [qn, x] of Object.entries(D.q || {})) { const y = T.q[qn] || (T.q[qn] = [0, 0, 0, 0]); x.forEach((v, i) => { y[i] += v; }); }
    for (const [bn, x] of Object.entries(D.b || {})) { const y = T.b[bn] || (T.b[bn] = [0, 0, 0, 0]); x.forEach((v, i) => { y[i] += v; }); }
    for (const [an, x] of Object.entries(D.a || {})) { const y = T.a[an] || (T.a[an] = [0, 0, 0, 0, 0, 0, 0, 0]); x.forEach((v, i) => { y[i] += v || 0; }); }
  }
  interMemo.set(k, { sig, v: T }); return T;
}
/** who is who in a month's interactions: the Genesys name first, then the same matching as the quality EVAL (one person each) */
const interLinkMemo = new Map();
function interLinks(k) {
  const T = interTotals(k); if (!T) return null;
  const names = Object.keys(T.a), sig = `${state.interVer}|${state.ver}|${names.length}`, hit = interLinkMemo.get(k); if (hit && hit.sig === sig) return hit.map;
  const map = new Map(), byName = new Map(), rest = [];
  for (const p of rosterRows()) for (const n of [p.sys, p.name]) if (normSpace(n) && !byName.has(normName(n))) byName.set(normName(n), p._id);
  for (const an of names) { const pid = byName.get(normName(an)); if (pid && !map.has(pid)) map.set(pid, an); else rest.push(an); }
  if (rest.length) {
    try { const res = NameLink.link(rest.map(n => ({ name: n, kind: 'agent' })), linkPeople().filter(q => !map.has(q.id)), {}, {}); res.forEach((r, i) => { if (r.id && r.auto && !map.has(r.id)) map.set(r.id, rest[i]); }); } catch (e) { /* exact names only */ }
  }
  interLinkMemo.set(k, { sig, map }); return map;
}
/** one roster person's interaction totals for a month */
function interOf(k, p) {
  const T = interTotals(k); if (!T || !p) return null;
  const L = interLinks(k), an = L ? L.get(p._id) : null, x = an ? T.a[an] : null; if (!x) return null;
  return { calls: x[0], aht: x[0] ? x[1] / x[0] : null, short: x[2], agentDisc: x[3], drops: x[4], xfer: x[5], rep72: x[6], agShort: x[7] };
}

// ---------------------------------------------------------------- the Interactions tab of the WFM page
const ERR_NAME = e => { const s = String(e); if (/dtlspeerdisconnect/i.test(s)) return 'Agent endpoint disconnected (WebRTC DTLS)'; if (/iceidle/i.test(s)) return 'Media went idle (WebRTC ICE)'; if (/iceconsent/i.test(s)) return 'Connection lost (WebRTC ICE consent)'; if (/media\.endpoint\.idle/i.test(s)) return 'Endpoint idle (media)'; if (/dialplan\.notfound/i.test(s)) return 'Number not found (dial plan)'; if (/session\.inactive/i.test(s)) return 'Session inactive'; if (/callflow/i.test(s)) return 'Call flow error'; return s.replace(/^error\.ininedgecontrol\./, ''); };
function renderInterWs() {
  const ks = Object.keys(state.inter).sort(), k = ks.includes(state.interK) ? state.interK : (ks.includes(wsMonthNow()) ? wsMonthNow() : ks[ks.length - 1] || '');
  state.interK = k;
  $('wfmBar').innerHTML = `${ks.length ? `<label class="wsfield"><span>Month</span><select class="cell" data-interk aria-label="Month">${ks.slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}</option>`).join('')}</select></label>` : ''}<div class="wsacts">${canInter() ? '<button class="btn sm primary" data-interpick><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Add the interactions export</button>' : ''}${k ? '<button class="btn sm" data-x="inter"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button>' : ''}</div>`;
  const body = $('wfmBody'), T = k ? interTotals(k) : null;
  const drop = canInter() ? `<div class="card qdrop" data-interdrop><svg width="22" height="22" aria-hidden="true"><use href="#i-up"/></svg><b>${esc(state.interBusy || 'Drop the Genesys interactions export (.csv) here')}</b><span>Every inbound interaction with Users, Date, Duration, Queue, Disconnect Type and Error Code. It is read here and kept only as totals: no phone numbers are saved.</span></div>` : '';
  if (!T) { body.innerHTML = (k && state.inter[k] && !state.inter[k].loadedDays ? '<p class="subtle"><span class="spin" aria-hidden="true"></span> Loading…</p>' : emptyCard('No interactions yet', canInter() ? 'Add the interactions export: volumes, answered and abandoned calls, who hung up, call drops and repeat callers show here and on every agent.' : 'The WFM manager has not added the interactions export yet.')) + drop; return; }
  const P = v => (T.n ? pct(v / T.n, 1) : '–'), PH = v => (T.hand ? pct(v / T.hand, 1) : '–');
  const tiles = tileW(T.n.toLocaleString('en-US'), 'inbound interactions', `${T.days.length} days · ${Math.round(T.n / T.days.length).toLocaleString('en-US')} a day`)
    + tileW(P(T.hand), 'handled by an agent', `${T.hand.toLocaleString('en-US')} calls`) + tileW(P(T.abd), 'not answered in queue', `${T.abd.toLocaleString('en-US')} calls`, T.abd / T.n > 0.1 ? 'alert' : '')
    + tileW(P(T.ivr), 'ended in the IVR', 'no queue, no agent') + tileW(T.hand ? mss(T.dur / T.hand) : '–', 'average duration', 'handled calls, talk to end')
    + tileW(PH(T.short), `shorter than ${10}s`, `${T.short.toLocaleString('en-US')} handled calls`, T.short / Math.max(1, T.hand) > 0.03 ? 'alert' : '')
    + tileW(PH(T.agentDisc), 'agent hung up', 'of handled calls') + tileW(T.drops.toLocaleString('en-US'), 'WebRTC call drops', 'at the agent\'s endpoint', T.drops ? 'alert' : '')
    + tileW(PH(T.xfer), 'transferred', 'more than one agent') + tileW(T.hand ? pct(T.rep72 / T.hand, 1) : '–', 'called again in 72h', `${T.rep24.toLocaleString('en-US')} within 24h · in the same file`);
  // by day
  const labels = T.days.map(d => `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`), cur = state.inter[k].days;
  const byDay = lineChart(labels, [{ name: 'Handled', values: T.days.map(d => cur[d].hand), cls: 's1' }, { name: 'Not answered in queue', values: T.days.map(d => cur[d].abd), cls: 's3' }, { name: 'IVR only', values: T.days.map(d => cur[d].ivr), cls: 's2', dash: true }], { k: 'calls', label: 'Calls', fmt: v => Math.round(v).toLocaleString('en-US'), total: 'sum' }, null, true);
  // weekday x hour
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], avg = T.wh.map((h, i) => h.map(v => (T.whN[i] ? v / T.whN[i] : 0))), mx = Math.max(1, ...avg.flat());
  const heat = `<div class="tablewrap heat hh"><table><thead><tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th class="r">${h}</th>`).join('')}</tr></thead><tbody>${[0, 1, 2, 3, 4, 5, 6].filter(i => T.whN[i]).map(i => `<tr><td>${WD[i]}</td>${avg[i].map((v, h) => `<td class="r num hc${v / mx > 0.55 ? ' hi' : ''}" style="--h:${(6 + (v / mx) * 66).toFixed(0)}%" data-tt="${WD[i]} ${h}:00–${h + 1}:00: ${Math.round(v)} interactions on average">${Math.round(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  // brands and queues
  const qt = (title, M) => { const L = Object.entries(M).sort((a, b) => b[1][0] - a[1][0]); return `<div class="card"><h2>${esc(title)}</h2><div class="tablewrap"><table class="teamtab"><thead><tr><th>${title === 'Brands' ? 'Brand' : 'Queue (first)'}</th><th class="r">Interactions</th><th class="r">Handled</th><th class="r">Not answered</th><th class="r">Avg duration</th></tr></thead><tbody>${L.slice(0, 40).map(([n, x]) => `<tr><td>${esc(n)}</td><td class="r num">${x[0].toLocaleString('en-US')}</td><td class="r num">${pct(x[1] / x[0], 1)}</td><td class="r num${x[2] / x[0] > 0.1 ? ' bad' : ''}">${pct(x[2] / x[0], 1)}</td><td class="r num">${x[1] ? mss(x[3] / x[1]) : '–'}</td></tr>`).join('')}</tbody></table></div></div>`; };
  // who hung up, errors
  const errs = Object.entries(T.errs).sort((a, b) => b[1] - a[1]);
  const disc = `<div class="card"><h2>How calls ended</h2><div class="cbars">${[['Customer hung up', T.extDisc], ['Agent hung up', T.agentDisc], ['System', T.sysDisc]].map(([l, v]) => `<div class="cb" data-tt="${esc(l)}: ${v.toLocaleString('en-US')}"><span class="nm">${esc(l)}</span><span class="track"><span class="fill" style="width:${T.hand ? Math.max(1, v / T.hand * 100) : 0}%"></span></span><span class="v">${PH(v)}</span></div>`).join('')}</div>
    <h3 class="sub">Errors</h3>${errs.length ? `<ul class="ilist">${errs.slice(0, 12).map(([e, c]) => `<li><span class="nm">${esc(ERR_NAME(e))}</span><span class="sp"></span><b class="num">${c.toLocaleString('en-US')}</b></li>`).join('')}</ul>` : '<p class="subtle">None.</p>'}</div>`;
  // agents
  const q = normName(state.interQ), R = rosterRows(), byName = new Map(); R.forEach(p => { [p.sys, p.name].forEach(n => { if (normSpace(n)) byName.set(normName(n), p); }); });
  const AG = Object.entries(T.a).map(([n, x]) => { const p = byName.get(normName(n)) || null; return { n, p, calls: x[0], aht: x[0] ? x[1] / x[0] : null, shortR: x[0] ? x[2] / x[0] : null, discR: x[0] ? x[3] / x[0] : null, agShort: x[7], drops: x[4], xferR: x[0] ? x[5] / x[0] : null, repR: x[0] ? x[6] / x[0] : null, spv: p ? supName(p.spv) : '' }; })
    .filter(a => !q || normName(`${a.n} ${a.spv}`).includes(q));
  const COLS = [['n', 'Agent'], ['spv', 'Supervisor'], ['calls', 'Calls'], ['aht', 'Avg duration'], ['shortR', 'Short calls'], ['discR', 'Agent hung up'], ['agShort', 'Hung up < 30s'], ['drops', 'WebRTC drops'], ['xferR', 'Transferred'], ['repR', 'Called again 72h']];
  const sc = state.interSort, dir = state.interDir === 'asc' ? 1 : -1;
  AG.sort((a, b) => { const x = a[sc], y = b[sc]; if (typeof x === 'string' || typeof y === 'string') return dir * String(x || '').localeCompare(String(y || '')); return (x == null) - (y == null) || dir * ((x || 0) - (y || 0)); });
  const med = f => { const v = AG.map(a => a[f]).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * 0.75)] : null; }, hi = { shortR: med('shortR'), discR: med('discR'), repR: med('repR') };
  const fmtC = (c, v) => (v == null ? '–' : ['shortR', 'discR', 'xferR', 'repR'].includes(c) ? pct(v, 1) : c === 'aht' ? mss(v) : typeof v === 'number' ? v.toLocaleString('en-US') : esc(v));
  const agentTab = `<div class="card"><div class="cardhead"><div><h2>Agents · ${plural(AG.length, 'agent')}</h2><p class="cap">Per handling agent (the first agent on the call). Red: in the worst quarter. "Called again 72h" counts callers who called back within three days, an indicator of first-call resolution.</p></div><div class="toolbar"><input type="search" data-interq value="${esc(state.interQ)}" placeholder="Search an agent or supervisor" aria-label="Search"></div></div>
    <div class="tablewrap restab"><table><thead><tr>${COLS.map(([c, l]) => `<th class="${['n', 'spv'].includes(c) ? '' : 'r'}"><button class="linkbtn" data-intersort="${c}">${esc(l)}${sc === c ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`).join('')}</tr></thead><tbody>
    ${AG.slice(0, 400).map(a => `<tr>${COLS.map(([c]) => c === 'n' ? `<td>${a.p ? `<button class="linkbtn nm" data-open="${esc(a.p._id)}" data-agent="${esc(a.p._id)}" dir="auto">${esc(a.n)}</button>` : `<span dir="auto">${esc(a.n)}</span> <span class="pill" title="Not in the roster">?</span>`}</td>` : c === 'spv' ? `<td>${esc(a.spv || '–')}</td>` : `<td class="r num${hi[c] != null && a[c] != null && a[c] > hi[c] && a.calls >= 20 ? ' bad' : ''}${c === 'drops' && a.drops >= 5 ? ' bad' : ''}">${fmtC(c, a[c])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${COLS.length}" class="empty">Nobody matches.</td></tr>`}</tbody></table></div></div>`;
  const files = (T.files || []).slice().reverse();
  const src = `<details class="card wslog"><summary>Files · ${files.length}</summary><ul class="ilist">${files.map(f => `<li><span class="nm">${esc(f.name)}</span><span class="sg">${esc(f.from || '')} to ${esc(f.to || '')} · ${(f.rows || 0).toLocaleString('en-US')} interactions · ${(f.callers || 0).toLocaleString('en-US')} callers${f.dist ? ` (${f.dist['2'] + f.dist['3'] + f.dist['4+']} called more than once)` : ''} · ${esc(f.by || '')} ${esc(fmtWhen(f.at))}</span></li>`).join('')}</ul></details>`;
  const keep = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-interq]') ? document.activeElement.selectionStart : null;
  body.innerHTML = `<div class="tiles wstiles">${tiles}</div><div class="card"><h2>By day · ${esc(ymLabel(k))}</h2>${byDay}</div><div class="card"><h2>When customers call</h2><p class="cap">Average interactions per hour, by day of the week.</p>${heat}</div><div class="grid2 top">${qt('Brands', T.b)}${disc}</div>${qt('Queues', T.q)}${agentTab}${drop}${src}`;
  if (keep != null) { const i = body.querySelector('[data-interq]'); if (i) { i.focus(); i.setSelectionRange(keep, keep); } }
  reveal(body);
}
async function exportInter() {
  const k = state.interK, T = k ? interTotals(k) : null; if (!T) return;
  const R = rosterRows(), byName = new Map(); R.forEach(p => { [p.sys, p.name].forEach(n => { if (normSpace(n)) byName.set(normName(n), p); }); });
  await xlBook(`Interactions - ${ymLabel(k)}.xlsx`, [
    { name: 'By day', title: `Interactions by day - ${ymLabel(k)}`, sub: `Inbound interactions · exported ${new Date().toLocaleString()}`, cols: [{ h: 'Day', t: 'text', w: 12 }, { h: 'Interactions', t: 'int' }, { h: 'Handled', t: 'int' }, { h: 'Not answered in queue', t: 'int' }, { h: 'IVR only', t: 'int' }, { h: 'Avg duration', t: 'time' }, { h: 'Short calls', t: 'int' }, { h: 'Agent hung up', t: 'int' }, { h: 'WebRTC drops', t: 'int' }, { h: 'Transferred', t: 'int' }, { h: 'Called again in 72h', t: 'int' }],
      rows: T.days.map(d => { const D = state.inter[k].days[d]; return [d, D.n, D.hand, D.abd, D.ivr, D.hand ? D.dur / D.hand : null, D.short, D.agentDisc, D.drops, D.xfer, D.rep72]; }), freezeCol: 1 },
    { name: 'Agents', title: `Interactions per agent - ${ymLabel(k)}`, sub: 'The first agent on each handled call', cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'Supervisor', t: 'text', w: 22 }, { h: 'Calls', t: 'int' }, { h: 'Avg duration', t: 'time' }, { h: 'Short calls', t: 'int' }, { h: 'Agent hung up', t: 'int' }, { h: 'Hung up under 30s', t: 'int' }, { h: 'WebRTC drops', t: 'int' }, { h: 'Transferred', t: 'int' }, { h: 'Called again in 72h', t: 'int' }],
      rows: Object.entries(T.a).sort((a, b) => b[1][0] - a[1][0]).map(([n, x]) => { const p = byName.get(normName(n)); return [n, p ? supName(p.spv) : '', x[0], x[0] ? x[1] / x[0] : null, x[2], x[3], x[7], x[4], x[5], x[6]]; }) },
    { name: 'Queues', title: `Queues - ${ymLabel(k)}`, sub: 'By the first queue of each interaction', cols: [{ h: 'Queue', t: 'text', w: 34 }, { h: 'Interactions', t: 'int' }, { h: 'Handled', t: 'int' }, { h: 'Not answered', t: 'int' }, { h: 'Avg duration', t: 'time' }], rows: Object.entries(T.q).sort((a, b) => b[1][0] - a[1][0]).map(([n, x]) => [n, x[0], x[1], x[2], x[1] ? x[3] / x[1] : null]) }]);
}
// events (the WFM page's bar and body)
const interPicker = Object.assign(document.createElement('input'), { type: 'file', accept: '.csv', hidden: true, id: 'interPicker' }); document.body.appendChild(interPicker);
interPicker.addEventListener('change', async () => { const f = interPicker.files[0]; interPicker.value = ''; if (!f) return; if (await isInterFile(f)) importInteractions(f); else toast(`${f.name} does not look like the interactions export (Users, Date, Duration, Disconnect Type…).`); });
