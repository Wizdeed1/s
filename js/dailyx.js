// ================================================================ DAILY: the daily data kept for everyone, and the Daily dashboard on the WFM page
// The WFM analysts make the daily emails in WFM team › Report builder (rbx.js); the WFM manager sends the four brand emails from
// WFM team › Daily emails. Each day the builder reads is kept in the shared data, not only in one browser: the brands' daily numbers
// (its history), and, when the WFM Daily Review is built, each agent's day. The month is then shown from the stored days on
// every page, without waiting for the monthly exports (a month built from the monthly exports always takes over).
Object.assign(state, { dhist: null, dhistAt: '', dhistBy: '', daily: {}, dailyVer: 0, dailyK: '' });

// ---------------------------------------------------------------- who does what with the daily data
/** the WFM analysts make the day's emails (the admin can stand in) */
const canDailyTool = () => hasRole('admin', 'user');
/** the WFM manager sends the four brand emails (the admin can stand in) */
const canDailyMail = () => hasRole('admin', 'wfm', 'user');   // the WFM manager and the analysts share the daily emails: both edit and send them
/** who writes the daily data: the analysts building, the manager choosing an ASA */
const canDailySave = () => hasRole('admin', 'user', 'wfm');

// ---------------------------------------------------------------- the brands' history: shared (dailytool/history); each builder keeps a copy in its browser too
const DH_KEY = 'mc.history.v1';
const lsRaw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsPut = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
/** rows by date in every brand / section / list; rows of `add` win when the same day differs */
function mergeDailyHist(base, add) {
  const out = JSON.parse(JSON.stringify(base || {})); let changed = false;
  for (const [b, secs] of Object.entries(add || {})) {
    if (!secs || typeof secs !== 'object') continue; const ob = out[b] = out[b] || {};
    for (const [s, lists] of Object.entries(secs)) {
      if (!lists || typeof lists !== 'object') continue; const os = ob[s] = ob[s] || {};
      for (const [l, rows] of Object.entries(lists)) {
        if (!Array.isArray(rows)) continue; const L = os[l] = Array.isArray(os[l]) ? os[l] : [];
        const at = new Map(L.map((r, i) => [r && r.date, i]));
        for (const r of rows) { if (!r || !r.date) continue; const i = at.get(r.date); if (i == null) { L.push(r); at.set(r.date, L.length - 1); changed = true; } else if (JSON.stringify(L[i]) !== JSON.stringify(r)) { L[i] = r; changed = true; } }
        L.sort((a, b2) => (a.date < b2.date ? -1 : a.date > b2.date ? 1 : 0));
      }
    }
  }
  return { out, changed };
}
let dhWatching = false, dhReadyFn = null;
/** the shared daily history has come in once (or could not): the builder starts from it, so a day saved elsewhere is never lost */
const dhReady = new Promise(r => { dhReadyFn = r; });
function watchDaily(db) {
  if (dhWatching) return; dhWatching = true;
  try {
    db.collection('dailytool').onSnapshot(sn => {
      const d = sn.docs.find(x => x.id === 'history'), x = d ? d.data() : null;
      if (x && x.hist) { state.dhist = x.hist; state.dhistAt = x.at || ''; state.dhistBy = x.by || ''; rbHistIn(x.hist); }
      rbPrefsIn(sn.docs); dhReadyFn();
      state.dailyVer++;
      if (state.ws === 'wfm' && state.wfmTab === 'daily') renderWs();
      if (rbVisible('dmail') || rbVisible('builder')) dmHistRender();   // the Brands' history box (Emails › Daily brand emails, Report builder): what the history holds now
    }, () => { dhWatching = false; dhReadyFn(); });
  } catch (e) { dhWatching = false; dhReadyFn(); }
  watchDailyMail(db);
}
/** outside the shared folder (the claude.ai page keeps each saved record under 256 KB) the shared copy keeps the latest days;
    every browser that ran the tool still keeps all of its own */
function fitHist(H, max) {
  let s = JSON.stringify(H || {}); if (s.length <= max) return H;
  const dates = new Set();
  for (const secs of Object.values(H || {})) for (const lists of Object.values(secs || {})) for (const rows of Object.values(lists || {})) if (Array.isArray(rows)) for (const r of rows) if (r && r.date) dates.add(r.date);
  const ds = [...dates].sort(); let lo = 0, out = H;
  while (s.length > max && lo < ds.length - 1) {
    lo = Math.min(ds.length - 1, lo + Math.max(1, Math.ceil((ds.length - lo) * 0.1)));   // the oldest tenth of the days at a time
    const cut = ds[lo]; out = {};
    for (const [b, secs] of Object.entries(H)) {
      const ob = out[b] = {};
      for (const [sec, lists] of Object.entries(secs || {})) { const os = ob[sec] = {}; for (const [l, rows] of Object.entries(lists || {})) os[l] = Array.isArray(rows) ? rows.filter(r => !r || !r.date || r.date >= cut) : rows; }
    }
    s = JSON.stringify(out);
  }
  return out;
}
function lastDailyDate(H) { let last = ''; for (const secs of Object.values(H || {})) for (const lists of Object.values(secs || {})) for (const r of (lists && lists.daily) || []) if (r.date > last) last = r.date; return last; }

// ---------------------------------------------------------------- each agent's day, from the WFM Daily Review (Report builder)
const numOr = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
function cleanDay(d) {
  return { date: d.date, dept: d.dept && typeof d.dept === 'object' ? Object.fromEntries(Object.entries(d.dept).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) : {},
    agents: (d.agents || []).filter(a => a && typeof a.n === 'string' && a.n.trim()).slice(0, 2000).map(a => ({ n: normSpace(a.n).slice(0, 80), t: String(a.t || '').slice(0, 30), adh: typeof a.adh === 'number' ? Math.round(a.adh * 100) / 10000 : null, conf: typeof a.conf === 'number' ? Math.round(a.conf * 100) / 10000 : null,
      sch: numOr(a.sch), log: numOr(a.log), ans: numOr(a.ans), hnd: numOr(a.hnd), th: numOr(a.th), tt: numOr(a.tt), tho: numOr(a.tho), ta: numOr(a.ta), held: numOr(a.held), xfer: numOr(a.xfer), out: numOr(a.out), rona: numOr(a.rona), short: numOr(a.short),
      lv: String(a.lv || '').slice(0, 40), abs: !!a.abs, late: numOr(a.late), xc: !!a.xc, sm: numOr(a.sm), brk: numOr(a.brk), exc: numOr(a.exc), trn: !!a.trn, off: !!a.off })) };
}
let dayMonthT = 0;
async function storeDay(d) {
  if (!state.db || !canDailySave()) return;
  const D = cleanDay(d); if (!/^\d{4}-\d{2}-\d{2}$/.test(D.date) || !D.agents.length) return;
  const k = D.date.slice(0, 7), body = { ...D, at: new Date().toISOString(), by: whoNow() };
  try { await queueWrite(`daily/${k}/days/${D.date}`, () => state.db.doc(`daily/${k}/days/${D.date}`).set(body)); }
  catch (e) { toast(`The agents' day was not saved (${(e && e.code) || 'error'}).`); return; }
  const M = state.daily[k] = state.daily[k] || { days: {} }; M.days[D.date] = body; state.dailyVer++;
  const idx = { k, days: Object.keys(M.days).sort(), at: body.at, by: body.by };
  queueWrite(`daily/${k}`, () => state.db.doc(`daily/${k}`).set(idx)).catch(() => {});
  markFresh('dayagents', `${+D.date.slice(8)} ${MON[+D.date.slice(5, 7) - 1]}, ${plural(D.agents.length, 'agent')}`);
  toast(`${D.agents.length} agents' day for ${Forms.fmtDate(D.date)} is saved for everyone.`);
  clearTimeout(dayMonthT); dayMonthT = setTimeout(() => dailyToMonth(k, true), 2500);
}

// ---------------------------------------------------------------- the stored days of a month
const dailyLoading = new Set();
function dailyMonth(k) {
  if (!k || !state.db) return state.daily[k] || null;
  const M = state.daily[k] = state.daily[k] || { days: {} };
  if (!M.loaded && !dailyLoading.has(k)) {
    dailyLoading.add(k);
    try { state.db.collection(`daily/${k}/days`).onSnapshot(sn => { M.days = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.date) M.days[d.id] = x; }); M.loaded = true; state.dailyVer++; if (state.ws === 'wfm') renderWs(); }, () => { M.loaded = true; }); } catch (e) { M.loaded = true; }
  }
  return M;
}
/** months that have stored days (from the index docs) */
let dailyIdxLoaded = false;
function dailyMonths() {
  if (!dailyIdxLoaded && state.db) { dailyIdxLoaded = true; try { state.db.collection('daily').onSnapshot(sn => { sn.docs.forEach(d => { const x = d.data(); if (x && x.k) { const M = state.daily[x.k] = state.daily[x.k] || { days: {} }; M.idx = x; } }); state.dailyVer++; if (state.ws === 'wfm' && state.wfmTab === 'daily') renderWs(); }, () => {}); } catch (e) { /* none */ } }
  return Object.keys(state.daily).filter(k => (state.daily[k].idx && state.daily[k].idx.days && state.daily[k].idx.days.length) || Object.keys(state.daily[k].days || {}).length).sort();
}
/** a month record (like the monthly exports give) from the stored days */
function monthFromDays(k) {
  const M = state.daily[k]; if (!M) return null;
  const dates = Object.keys(M.days).sort(); if (!dates.length) return null;
  const y = +k.slice(0, 4), m = +k.slice(5), ND = Core.daysIn(y, m), target = state.settings.target;
  const R = rosterRows(), byName = new Map(); R.forEach(p => { [p.sys, p.name].forEach(n => { if (normSpace(n)) byName.set(normName(n), p); }); });
  const P = new Map();
  for (const dk of dates) {
    const D = M.days[dk], di = +dk.slice(8) - 1;
    for (const a of D.agents) {
      const key = normName(a.n); let x = P.get(key);
      if (!x) P.set(key, x = { n: a.n, t: a.t, days: new Array(ND).fill(null), seen: new Set(), ad: new Array(ND).fill(null), adhW: 0, adhS: 0, confW: 0, confS: 0, under: 0, adhDays: 0, ans: 0, hnd: 0, th: 0, tt: 0, tho: 0, ta: 0, held: 0, xfer: 0, out: 0, rona: 0, log: 0, shift: 0, worked: 0, abs: 0, late: 0, lateMin: 0, short: 0, shortMin: 0, brk: 0, low: 0 });
      x.seen.add(di); if (a.t) x.t = a.t;
      const sched = a.sch > 0 && !a.lv;
      x.days[di] = a.lv ? leaveCode(a.lv) : a.abs ? 'Absent' : a.late > 0 ? a.late : sched || a.log > 0 ? 'Attend' : 'OFF';
      if (sched) { x.shift++; if (!a.abs) x.worked++; else x.abs++; }
      if (a.late > 0) { x.late++; x.lateMin += a.late; } if (a.sm > 0) { x.short++; x.shortMin += a.sm; }
      if (a.adh != null && a.sch > 0 && !a.lv) { x.adhS += a.adh * a.sch; x.adhW += a.sch; x.adhDays++; x.ad[di] = a.adh; if (a.adh < target) { x.under++; x.low++; } }
      if (a.conf != null && a.sch > 0 && !a.lv) { x.confS += a.conf * a.sch; x.confW += a.sch; }
      for (const f of ['ans', 'hnd', 'th', 'tt', 'tho', 'ta', 'held', 'xfer', 'out', 'rona', 'brk']) x[f] += a[f] || 0;
      x.log += a.log || 0;
    }
  }
  const stored = new Set(dates.map(d => +d.slice(8) - 1)), rows = [];
  for (const x of P.values()) {
    for (const di of stored) if (x.days[di] == null) x.days[di] = 'OFF';   // a stored day without this agent: not scheduled
    const p = byName.get(normName(x.n)) || null, t = attTotals(x.days, k), dx = {};
    x.days.forEach((v, i) => { if (v != null && (typeof v === 'number' || !['Attend', 'OFF', 'AL', 'SL', 'Absent'].includes(v))) dx[i + 1] = v; });
    const r = { k: p && Core.cleanId(p.nid) ? Core.cleanId(p.nid) : 'N:' + normName(x.n), n: p ? gname(p) || p.name : x.n, brand: p ? p.brand : normBrand(x.t), team: p ? p.team : '',
      worked: t.worked, absent: t.absent, al: t.al, sl: t.sl, off: t.off, leave: t.leave, tardy: t.tardy, d: x.days.map(DAYCH).join(''), ks: t.sched, ka: t.attend, ...keptCount(t, k) };
    if (p && Core.cleanId(p.nid)) r.id = Core.cleanId(p.nid);
    if (Object.keys(dx).length) r.dx = dx;
    if (x.adhW) { r.adh = Math.round(x.adhS / x.adhW * 1e4) / 1e4; r.adhUnder = x.under; r.adhDays = x.adhDays; r.ad = x.ad.map(v => (v == null ? '' : Math.round(v * 10000))).join(','); }
    if (x.confW) r.conf = Math.round(x.confS / x.confW * 1e4) / 1e4;
    if (x.ans) { r.ans = x.ans; r.hnd = x.ans; r.pAht = Math.round(x.th / x.ans); r.aht = r.pAht; r.talk = Math.round(x.tt / x.ans); r.acw = Math.round(x.ta / x.ans); r.tTalk = x.tt; r.tAcw = x.ta; r.tHold = x.tho; }
    if (x.held) { r.held = x.held; r.hold = Math.round(x.tho / x.held); }
    if (x.xfer) r.xfer = x.xfer; if (x.out) r.out = x.out; if (x.rona) r.rona = x.rona;
    Object.assign(r, { wfShift: x.shift, wfWorked: x.worked, wfAbs: x.abs, wfLate: x.late, wfLateMin: Math.round(x.lateMin), wfShort: x.short, wfShortMin: Math.round(x.shortMin), wfBrk: x.brk, wfLogged: Math.round(x.log), wfLow: x.low, wfExc: x.abs + x.late + x.short + x.low });
    rows.push(r);
  }
  return { y, m, rows, src: `Daily data (${plural(dates.length, 'day')}, up to ${+dates[dates.length - 1].slice(8)} ${MON[m - 1]})`, daily: true, days: dates, at: new Date().toISOString(), by: whoNow() };
}
/** the month in the shared history, from the stored days, unless a month built from the monthly exports is there */
async function dailyToMonth(k, quiet) {
  if (!state.db || !canDailySave()) return false;
  const H = state.history[k];
  if (H && !H.daily) { if (!quiet) toast(`${ymLabel(k)} in the history comes from ${H.auto || H.tool ? 'the monthly exports' : H.src || 'a file'}, so it stays as it is.`); return false; }
  if (monthLocked(k)) { if (!quiet) toast(`${ymLabel(k)} is final.`); return false; }
  const M = dailyMonth(k); if (M && !M.loaded) await new Promise(r => setTimeout(r, 1500));
  const rec = monthFromDays(k); if (!rec || !rec.rows.length) { if (!quiet) toast('No agents\' days are stored for this month yet.'); return false; }
  putHistory(rec); markFresh('month', `${ymLabel(k)} from the daily data, ${plural(rec.days.length, 'day')}`);
  mtdPublishSoon(k);   // each agent's "this month so far" follows
  if (!quiet) toast(`${ymLabel(k)} is now in the history from ${plural(rec.days.length, 'stored day')}: every page shows it.`);
  return true;
}

// ---------------------------------------------------------------- the Daily tab
const DH_BRANDS = [['virgin', 'Virgin'], ['postpaid', 'Virgin Postpaid'], ['friendi', 'FRiENDi'], ['fpay', 'FRiENDi Pay']];
function renderDailyWs() {
  const tool = canDailyTool();
  const H = state.dhist || {}, dM = dailyMonths(), hk = new Set();
  for (const secs of Object.values(H)) for (const r of ((secs.voice || {}).daily || [])) hk.add(r.date.slice(0, 7));
  const ks = [...new Set([...dM, ...hk])].sort(), k = state.dailyKPicked && ks.includes(state.dailyK) ? state.dailyK : ks[ks.length - 1] || '';   // the newest month, unless one was picked
  state.dailyK = k;
  $('wfmBar').innerHTML = `${ks.length ? `<label class="wsfield"><span>Month</span><select class="cell" data-dailyk aria-label="Month">${ks.slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}</option>`).join('')}</select></label>` : ''}
    <div class="wsacts">${tool ? '<button class="btn sm" data-wtgo="builder"><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Report builder</button>' : ''}${canDailyMail() ? '<button class="btn sm" data-wtgo="dmail"><svg width="14" height="14" aria-hidden="true"><use href="#i-mail"/></svg>Daily emails</button>' : ''}${k && canDailyMail() && (state.daily[k] && (Object.keys(state.daily[k].days || {}).length || (state.daily[k].idx && state.daily[k].idx.days.length))) ? `<button class="btn sm" data-dmonth title="Show this month on every page from the stored days">Save ${esc(ymLabel(k))} to the history</button>` : ''}</div>`;
  const body = $('wfmBody');
  if (!k) { body.innerHTML = emptyCard('No daily data yet', tool ? 'Drop the day\'s exports in Report builder: every day you build is kept here for everyone.' : 'The WFM analysts have not saved any day yet: it shows here as soon as they build the daily emails.'); return; }
  // brands, day by day
  const days = new Set(); for (const [b] of DH_BRANDS) for (const r of (((H[b] || {}).voice || {}).daily || [])) if (r.date.startsWith(k)) days.add(r.date);
  const D = [...days].sort(), rowOf2 = (b, d) => ((((H[b] || {}).voice || {}).daily || []).find(r => r.date === d)) || null;
  const mtd = b => { const L = D.map(d => rowOf2(b, d)).filter(Boolean); if (!L.length) return null; const s = f => L.reduce((a, r) => a + (r[f] || 0), 0), w = (f, by) => { const t = L.reduce((a, r) => a + (r[by] || 0), 0); return t ? L.reduce((a, r) => a + (r[f] || 0) * (r[by] || 0), 0) / t : null; };
    return { presented: s('presented'), handled: s('handled'), ansPct: s('presented') ? s('handled') / s('presented') : null, abPct: s('presented') ? s('abandoned') / s('presented') : null, sl: w('sl', 'presented'), aht: w('aht', 'handled'), asa: w('asa', 'handled'), days: L.length }; };
  const brandTiles = DH_BRANDS.map(([b, l]) => { const x = mtd(b); return x ? `<div class="card bkpi"><h3>${esc(l)}</h3><div class="minis"><div><b>${x.presented.toLocaleString('en-US')}</b><span>Calls offered</span></div><div><b>${pct(x.ansPct, 1)}</b><span>Answered</span></div><div class="${x.sl != null && x.sl < 0.8 ? 'bad' : ''}"><b>${pct(x.sl, 1)}</b><span>Service level</span></div><div><b>${x.aht == null ? '–' : mss(x.aht)}</b><span>AHT</span></div><div><b>${x.asa == null ? '–' : mss(x.asa)}</b><span>ASA</span></div><div class="${x.abPct != null && x.abPct > 0.05 ? 'bad' : ''}"><b>${pct(x.abPct, 1)}</b><span>Abandoned</span></div></div><p class="hint">Month to date, ${plural(x.days, 'day')}.</p></div>` : ''; }).join('');
  const chart = D.length ? `<div class="card"><h2>Service level by day · ${esc(ymLabel(k))}</h2>${lineChart(D.map(d => `${+d.slice(8)}`), DH_BRANDS.map(([b, l], j) => ({ name: l, values: D.map(d => { const r = rowOf2(b, d); return r ? r.sl : null; }), cls: ['b-virgin', 's4', 'b-friendi', 'b-fpay'][j] })), { k: 'sl', label: 'Service level', pct: true, fmt: v => pct(v, 1), total: 'avg' }, 0.8, true)}</div>` : '';
  const brandTab = D.length ? `<div class="card"><h2>Brands day by day</h2><div class="tablewrap heat"><table><thead><tr><th>Day</th>${DH_BRANDS.map(([, l]) => `<th class="r">${esc(l)} offered</th><th class="r">SL</th><th class="r">AHT</th>`).join('')}</tr></thead><tbody>${D.slice().reverse().map(d => `<tr><td>${esc(Forms.fmtDate(d))}</td>${DH_BRANDS.map(([b]) => { const r = rowOf2(b, d); return r ? `<td class="r num">${Math.round(r.presented || 0).toLocaleString('en-US')}</td><td class="r num${r.sl != null && r.sl < 0.8 ? ' bad' : ''}">${pct(r.sl, 1)}</td><td class="r num">${r.aht == null ? '–' : mss(r.aht)}</td>` : '<td class="r subtle">–</td><td></td><td></td>'; }).join('')}</tr>`).join('')}</tbody></table></div>${state.dhistAt ? `<p class="hint">Last saved ${esc(ago(state.dhistAt))}${state.dhistBy ? ' by ' + esc(state.dhistBy) : ''}.</p>` : ''}</div>` : '';
  // agents, day by day
  const AM = dailyMonth(k), ad = AM ? Object.keys(AM.days).sort() : [];
  let agents = '';
  if (AM && !AM.loaded) agents = '<p class="subtle"><span class="spin" aria-hidden="true"></span> Loading the agents\' days…</p>';
  else if (ad.length) {
    const rec = monthFromDays(k), set = state.settings;
    const dayRows = ad.map(dk => { const X = AM.days[dk], L = X.agents, sch = L.filter(a => a.sch > 0 && !a.lv); const adh = mean(sch.map(a => a.adh)); return `<tr><td>${esc(Forms.fmtDate(dk))}</td><td class="r num">${sch.length}</td><td class="r num">${sch.filter(a => !a.abs).length}</td><td class="r num${sch.some(a => a.abs) ? ' bad' : ''}">${sch.filter(a => a.abs).length}</td><td class="r num">${L.filter(a => a.lv).length}</td><td class="r num">${L.filter(a => a.late > 0).length}</td><td class="r num${adh != null && adh < set.target ? ' bad' : ''}">${pct(adh, 1)}</td><td class="r num">${L.reduce((s, a) => s + (a.ans || 0), 0).toLocaleString('en-US')}</td><td class="sg">${esc(X.by || '')}</td></tr>`; }).join('');
    const top = rec ? rec.rows.filter(r => r.adh != null).sort((a, b) => a.adh - b.adh).slice(0, 12) : [];
    agents = `<div class="card"><div class="cardhead"><div><h2>Agents day by day · ${plural(ad.length, 'day')} stored</h2><p class="cap">From the WFM Daily Review built in Report builder. ${state.history[k] && !state.history[k].daily ? `${esc(ymLabel(k))} in the history comes from the monthly exports, which take over.` : state.history[k] && state.history[k].daily ? `${esc(ymLabel(k))} in the history comes from these days.` : `Save ${esc(ymLabel(k))} to the history to show it on every page.`}</p></div></div>
      <div class="tablewrap heat"><table><thead><tr><th>Day</th><th class="r">Scheduled</th><th class="r">Worked</th><th class="r">Absent</th><th class="r">On leave</th><th class="r">Late</th><th class="r">Adherence</th><th class="r">Answered</th><th>Saved by</th></tr></thead><tbody>${dayRows}</tbody></table></div>
      ${top.length ? `<h3 class="sub">Lowest adherence, month to date</h3><ol class="toplist">${top.map(r => `<li><span dir="auto">${esc(r.n)}</span><span class="chip">${esc(r.brand || '')}</span><b>${pct(r.adh, 1)}</b></li>`).join('')}</ol>` : ''}</div>`;
  } else agents = `<div class="card empty"><b>No agents' days yet for ${esc(ymLabel(k))}</b>${canDailyTool() ? 'Build the WFM Daily Review in Report builder: each agent\'s day is then saved here.' : 'The WFM analysts save them when they build the WFM Daily Review.'}</div>`;
  body.innerHTML = `<div class="bkpis">${brandTiles}</div>${chart}${agents}${brandTab}`;
  reveal(body);
}
