(() => {
'use strict';
const $ = id => document.getElementById(id);
const SRC = (() => {   // the page's own source, for the team copy
  try {
    const me = document.currentScript && document.currentScript.textContent.includes('const Auth = (() =>') ? document.currentScript : [...document.scripts].find(x => x.textContent.includes('const Auth = (() =>'));
    const style = [...document.querySelectorAll('style')].find(x => x.textContent.includes('.lockcard'));
    const head = [document.querySelector('title'), ...document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]'), style].filter(Boolean).map(e => e.outerHTML).join('\n');
    const body = [...document.querySelectorAll('svg, #lock, a#skipLink, nav#sidebar, header.appbar, main#main, footer.sitefoot, nav#tabBar, #moreSheet, #scrim, div.dlg, aside.drawer, #toast, #tt, #pop, script#rb-data, script#rb-code, script#brand-assets')]
      .filter(e => (e.tagName.toLowerCase() !== 'svg' || e.querySelector('symbol#i-up')) && !(e.parentElement && e.parentElement.closest('#lock, nav#sidebar, header.appbar, main#main, aside.drawer, div.dlg, #moreSheet')))
      .map(e => e.outerHTML).join('\n');
    const eng = document.getElementById('engine-src'), wg = [...document.scripts].find(x => x.textContent.includes('const Writer2'));
    const scripts = [eng, wg, me].map(x => (x ? x.textContent : ''));
    return { head, body, scripts, ok: !!style && scripts.every(Boolean) && body.includes('id="lock"') && body.includes('id="dAccounts"') };
  } catch (e) { return { ok: false }; }
})();
function teamCopyHtml(team) {
  const E = '<' + '/script>', json = JSON.stringify(team).replace(/</g, '\\u003c');
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + SRC.head + '\n</head>\n<body>\n' + SRC.body +
    '\n<script type="application/json" id="team-config">' + json + E + '\n<script id="engine-src">' + SRC.scripts[0] + E + '\n<script>' + SRC.scripts[1] + E + '\n<script>' + SRC.scripts[2] + E + '\n</body>\n</html>\n';
}
document.querySelectorAll('link[media="print"][href*="fonts.googleapis"]').forEach(l => { l.media = 'all'; });   // fonts load without blocking the page
const BRAND = (() => { try { const b = JSON.parse(document.getElementById('brand-assets').textContent); return b && b.light ? b : null; } catch (e) { return null; } })();   // the company logo, built in
const BUILTIN_LOGO = BRAND ? { dataUrl: BRAND.light, w: BRAND.w, h: BRAND.h, builtin: true } : null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { normSpace, normName, MON, DEP_ORDER, DEP_NAMES } = Core;
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BRANDS = ['Virgin', 'Friendi', 'Friendi Pay'];
const KINDS = [
  { kind: 'adhGenesys', title: 'Monthly Adherence', short: 'Adh', what: 'Daily adherence % per agent', cols: 'Agent Name, 01 | %PCT - Adherence …' },
  { kind: 'aht', title: 'Agent Performance Summary', short: 'AHT', what: 'Average handle time per agent', cols: 'Interval Start, Media Type, Agent Name, Avg Handle' },
  { kind: 'schedule', title: 'Schedule', short: 'Sch', what: 'One row per activity segment', cols: 'Agent Name, Activity Code Name, Start, End, Length In Minutes' },
  { kind: 'timeline', title: 'Agent Status Timeline', short: 'TL', what: 'One row per status change', cols: 'Agent Name, Start Time, Primary Status, Duration' },
];
// optional inputs: not needed for the workbook, they add to Preview and the history
const XKINDS = [
  { kind: 'perf', title: 'Agent Performance (all columns)', short: 'Perf', optional: true, what: 'Optional. The same Genesys view with every column, for the employee performance in Preview', cols: 'Interval Start, Agent Name, Answered, Handle, Avg Handle, Avg Talk, Avg Hold, Avg ACW, Held, Transferred' },
];
const KIND_BY = Object.fromEntries([...KINDS, ...XKINDS].map(k => [k.kind, k]));
const ROLE_NAME = { admin: 'Admin', user: 'WFM analyst', wfm: 'WFM manager', senior: 'Senior manager', spv: 'Supervisor', quality: 'Quality team', agent: 'Agent', pending: 'Waiting for access' };
const STEPS = ['import', 'review', 'export', 'email'];
const REVIEW_TABS = ['checks', 'people', 'issues', 'preview', 'kpi', 'history'];
const DEFAULTS = { target: 0.95, floor: 0.5, inactiveMin: 6, dedBrands: ['Virgin'], dedTeams: ['CC'], incFullAdhTeams: ['CT'], manager: 'Mohammed Alshubily', managerTitle: 'Member Care Senior Manager' };
const prevMonth = (() => { const t = new Date(); return t.getMonth() === 0 ? { y: t.getFullYear() - 1, m: 12 } : { y: t.getFullYear(), m: t.getMonth() }; })();
const state = {
  step: 'import', tab: 'checks',
  slots: {}, others: [], pending: [],
  roster: [], rosterReady: false, rosterMsg: 'Loading the roster…', db: null,
  y: prevMonth.y, m: prevMonth.m, monthManual: false,
  settings: clone(DEFAULTS),
  rq: '', rf: 'all', sel: new Set(), ignored: new Set(),
  ctx: null, model: null, byId: new Map(), issues: [], ver: 0, built: null, building: false,
  wb: null, wbBusy: false, mail: null, mailSubjects: {}, mailDeadline: null, mailDone: {},
  attFiles: [], attUndo: new Set(), attPicks: new Map(), attLinks: new Map(), attRes: null, fixText: new Map(), notes: [],
  incModelCache: null, incWb: null, incBuilt: null, incBuilding: false, mailKind: 'ded', mailStage: 'review', mailChanges: true, mailLogo: false,   // no logo in the emails: Outlook adds the company signature
  revWb: {}, snaps: {}, logo: BUILTIN_LOGO, forms: [], form: null,
  idsFile: null, idSync: null, idsUndo: new Set(), idsLog: [], idsAuto: false,
  history: {}, histVer: 0, histMetric: 'adh', histTeam: '', histQ: '', histSort: 'name',
  cards: Kpi.DEFAULTS(), kpiFiles: {}, kpi: new Map(), kpiTeam: '', kpiQ: '', kpiSort: 'desc', scoreTeam: 'CC',
};
function clone(o) { return JSON.parse(JSON.stringify(o)); }
const pct = (v, d = 2) => (v == null ? '–' : (v * 100).toFixed(d) + '%');
const mss = s => { if (s == null) return '–'; const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
const monthLabel = () => `${MON[state.m - 1]} ${state.y}`;
const fileNameOut = () => `MC Monthly Report - ${monthLabel()}.xlsx`;
const fmtSize = b => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const dd = t => { const d = new Date(t); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const fmtDay = (t, withYear) => { const x = dd(t); return `${x.d} ${MON[x.m - 1]}${withYear ? ' ' + x.y : ''}`; };

// ---------------------------------------------------------------- engine: memoised daily Sched/Actual
let uid = 0;
const rawDaily = Core.computeDaily; let dailyMemo = null;
Core.computeDaily = (s, t, Y, M) => {
  const key = s.map(d => d._uid).join(',') + '|' + t.map(d => d._uid).join(',') + '|' + Y + '-' + M;
  if (dailyMemo && dailyMemo.key === key) return dailyMemo.val;
  const val = rawDaily(s, t, Y, M); dailyMemo = { key, val }; return val;
};

// ---------------------------------------------------------------- parsing in a Web Worker
let worker = null, wseq = 0; const waiting = new Map();
function getWorker() {
  if (worker !== null) return worker;
  try {
    const src = $('engine-src').textContent + '\nself.onmessage = async e => { const { id, name, buf, raw, op, opts } = e.data; try { const u8 = new Uint8Array(buf); const dets = op ? await Recog.run(op, name, u8, opts || {}) : raw ? await Core.readXlsx(u8) : await Core.analyzeFile(name, u8); self.postMessage({ id, dets }); } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); } };';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); if (e.data.error) w.reject(new Error(e.data.error)); else w.resolve(e.data.dets); };
    worker.onerror = e => { if (e && e.preventDefault) e.preventDefault(); const list = [...waiting.values()]; waiting.clear(); try { worker.terminate(); } catch (_) {} worker = false; list.forEach(w => w.fallback()); };
  } catch (e) { worker = false; }
  return worker;
}
/** op 'recog': {dets, rec} in one read (the detections and the recogniser's verdict); op 'tables': every sheet as it is */
function parse(name, buf, raw, op, opts) {
  const onMain = () => (op ? Recog.run(op, name, new Uint8Array(buf), opts || {}) : raw ? Core.readXlsx(new Uint8Array(buf)) : Core.analyzeFile(name, new Uint8Array(buf)));
  const w = getWorker();
  if (!w) return onMain();
  return new Promise((resolve, reject) => {
    const id = ++wseq;
    waiting.set(id, { resolve, reject, fallback: () => onMain().then(resolve, reject) });
    try { w.postMessage({ id, name, buf, raw: !!raw, op: op || '', opts: opts || null }); } catch (e) { waiting.delete(id); onMain().then(resolve, reject); }
  });
}
/** the sheets of a file as they are, whatever it is: a CSV or text file, an .xlsb, else an .xlsx -> [{name, rows}] */
function parseRaw(name, buf) { return parse(name, buf, true, 'tables'); }

// ---------------------------------------------------------------- storage: roster + settings (saved with the page)
const chains = new Map(); let inflight = 0, active = 0, lastErr = null; const slotsQ = [];
function limited(fn) {
  return new Promise((res, rej) => {
    const run = () => { active++; Promise.resolve().then(fn).then(res, rej).finally(() => { active--; const n = slotsQ.shift(); if (n) n(); }); };
    if (active < 6) run(); else slotsQ.push(run);
  });
}
const failedW = new Map();   // writes that failed, by record: Try again sends the latest of each once more
function queueWrite(key, fn) {
  const p = (chains.get(key) || Promise.resolve()).then(() => limited(fn));
  chains.set(key, p.catch(() => {}));
  inflight++; lastErr = null; setSave();
  p.then(() => { inflight--; failedW.delete(key); setSave(); }, e => { inflight--; lastErr = (e && e.code) || 'error'; failedW.set(key, fn); setSave(); });
  return p;
}
function retrySaves() { const L = [...failedW.entries()]; failedW.clear(); lastErr = null; L.forEach(([k, fn]) => queueWrite(k, fn).catch(() => {})); setSave(); }
function setSave() {
  const el = $('saveState'); if (!state.db) { el.textContent = state.rosterReady ? 'Test roster - changes are not saved' : ''; return; }
  if (state.db.local && state.db.persistent === false) { el.textContent = 'This browser blocks saving - changes last until you close the page'; return; }
  el.classList.toggle('bad', !!lastErr);
  if (lastErr && failedW.size) { el.innerHTML = `Not saved (${esc(lastErr)}). Check your connection. <button class="linkbtn" data-retry>Try again</button>`; return; }
  el.textContent = lastErr ? `Not saved (${lastErr}). Check your connection and try again.` : inflight ? 'Saving…' : 'All changes saved';
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-retry]')) retrySaves(); });
// ---- the start: each wait has a time limit, and the start guard in the page head says what is being waited for
const bootStep = (what, folder) => { const B = window.__mcBoot; if (B) { B.step = what; if (folder != null) B.folder = folder; } };
const withTimeout = (p, ms, late) => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(() => r(late), ms))]);
const errText = e => (e && ((e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e.message || ''))) || String(e || 'error');
async function initStorage() {
  const inClaude = !!(window.claude && typeof window.claude.use === 'function');
  if (!inClaude && Array.isArray(window.__ROSTER__)) {   // test harness: in-memory roster
    state.roster = window.__ROSTER__.map((r, i) => ({ _id: 'p' + i, order: i, ...r })); state.rosterReady = true;
    Auth.start(window.__NOLOCK__ ? null : localDb());
    refresh(); return;
  }
  if (inClaude) {
    bootStep('the saved data', false);
    let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
    Auth.start(db);
    if (!db) { state.rosterMsg = 'The saved roster is not available in this view.'; state.rosterReady = true; refresh(); return; }
    return loadData(db);
  }
  if (FolderStore.supported() && !window.__NOFOLDER__ && storePref() !== 'local') return folderStart();
  bootStep('the data saved in this browser', false);
  startLocal();
}
// ---- where the data lives: a shared folder (the common folder's data folder), or this browser only
const PREF = 'mc-store';
const storePref = () => { try { return sessionStorage.getItem(PREF) || ''; } catch (e) { return ''; } };
function startLocal() { const db = localDb(); state.folder = null; Auth.start(db); loadData(db); }
let folderOn = null, folderNow = null, folderReady = false;
async function folderStart() {
  let h = null, chosen = null;
  bootStep('the browser to find the shared data folder', true);
  try { h = await withTimeout(FolderStore.remembered(), 4000, null); } catch (e) { h = null; }
  if (h && typeof h.queryPermission !== 'function') h = null;   // not a folder (left by something else)
  const on = folderOn = async kind => {
    if (kind === 'local') { try { sessionStorage.setItem(PREF, 'local'); } catch (e) { /* none */ } startLocal(); return; }
    if (kind === 'again') { const f = folderNow || h; if (f && await FolderStore.permission(f, true)) openFolder(f); else Auth.connect({ state: f ? 'again' : 'new', name: f ? f.name : '', on, msg: f ? 'The browser did not allow the folder. Try again and choose Allow (or "Allow on every visit").' : '' }); return; }
    if (kind === 'pick') {
      let d; try { d = await FolderStore.pick(); } catch (e) { if (e && e.name === 'AbortError') return; Auth.connect({ state: 'new', on, msg: 'This browser could not open the folder (' + ((e && e.message) || e) + ').' }); return; }
      let what = await FolderStore.inspect(d);
      if (what.kind !== 'store') { try { const sub = await d.getDirectoryHandle('MC Data'); const w2 = await FolderStore.inspect(sub); if (w2.kind === 'store') { d = sub; what = w2; } } catch (e) { /* no data folder inside */ } }
      if (what.kind === 'store') { await withTimeout(FolderStore.remember(d), 3000); openFolder(d); return; }
      chosen = d; Auth.connect({ state: what.kind, name: d.name, on }); return;
    }
    if (kind === 'create' || kind === 'makesub') {
      if (!chosen) return;
      try {
        const dir = kind === 'makesub' ? await chosen.getDirectoryHandle('MC Data', { create: true }) : chosen;
        await FolderStore.createStore(dir, ''); await withTimeout(FolderStore.remember(dir), 3000); openFolder(dir);
      } catch (e) { Auth.connect({ state: 'new', on, msg: 'Could not set up the folder (' + ((e && e.message) || e) + '). Check that you may write to it.' }); }
    }
  };
  if (h) {
    bootStep('the browser to allow the shared data folder', true);
    if (await withTimeout(FolderStore.permission(h, false), 4000, false)) { openFolder(h); return; }
    Auth.connect({ state: 'again', name: h.name, on }); return;
  }
  Auth.connect({ state: 'new', on });
}
/** "Choose the data folder again" on the start guard: forget the remembered folder, start over */
window.__mcRepick = async () => { try { await withTimeout(FolderStore.forget(), 2500); } catch (e) { /* none */ } location.reload(); };
function openFolder(h) {
  if (state.db && state.db.folder && state.db.stop) { try { state.db.stop(); } catch (e) { /* none */ } }
  const db = FolderStore.folderDb(h);
  state.folder = { name: h.name }; state.db = db; folderNow = h;
  if (folderOn) Auth.setConnect({ state: 'again', name: h.name, on: folderOn });   // "Change the data folder" on the sign-in screen
  if (!folderReady) {
    folderReady = true;
    Auth.onReady(info => {
      const db = state.db;
      try { db.collection('accounts').onSnapshot(() => Auth.refreshMe(), () => {}); } catch (e) { /* none */ }
      if (info.staff) { loadData(db); setTimeout(() => Auth.autoGrants().catch(() => {}), 1500); }
      else if (info.role === 'agent') loadAgentData(db, info.pid || info.agentPids[0]);
      else { state.rosterReady = true; render(); }
    });
  }
  // the folder must answer before the sign-in: a folder out of reach says so (and is never taken for an empty one)
  bootStep(`the shared data folder (${h.name})`, true);
  const fail = msg => { if (Auth.mode() === 'loading' || Auth.mode() === 'connect') Auth.connect({ state: 'again', name: h.name, on: folderOn || (() => location.reload()), msg }); };
  const away = `The data folder ${h.name} is not answering. Check that you can open it in File Explorer (network or VPN), then press Open the shared data.`;
  (async () => {
    const st = await withTimeout(FolderStore.check(h), 20000, 'timeout');
    if (state.db !== db) return;   // another folder was opened meanwhile
    if (st === 'timeout') { fail(away); return; }
    if (st === 'notstore') { FolderStore.forget().catch(() => {}); Auth.connect({ state: 'new', on: folderOn, msg: `${h.name} does not hold the tool's data. Choose the data folder (MC Data) in the common folder.` }); return; }
    if (st !== 'ok') { fail(`Could not read the data folder ${h.name} (${st.replace(/^error: /, '')}). Check that you can open it in File Explorer, then press Open the shared data.`); return; }
    const r = await withTimeout(Auth.start(db).then(() => 'ok', e => 'error: ' + errText(e)), 45000, 'timeout');
    if (state.db !== db) return;
    if (r === 'timeout') fail(away);
    else if (r !== 'ok') fail(`Could not read the accounts in ${h.name} (${r.replace(/^error: /, '')}). Check that you can open the folder in File Explorer, then press Open the shared data.`);
  })();
}
/** the shared data: settings, roster, history, forms… (straight away outside the shared folder; after sign-in inside it) */
async function loadData(db) {
  state.db = db;
  try {
    const snap = await db.doc('config/settings').get();
    if (snap.exists) { applySettings(snap.data()); refresh(); }
  } catch (e) { /* defaults stay */ }
  try {
    const snap = await db.doc('config/email').get();
    if (snap.exists) { const d = snap.data() || {}; for (const k of Object.keys(MAIL_DEFAULTS)) if (typeof d[k] === typeof MAIL_DEFAULTS[k]) state.mail[k] = d[k]; if (state.step === 'email') renderEmail(); }
  } catch (e) { /* defaults stay */ }
  try {
    const snap = await db.doc('config/email-inc').get();
    if (snap.exists) { const d = snap.data() || {}; for (const k of Object.keys(INC_DEFAULTS)) if (typeof d[k] === typeof INC_DEFAULTS[k]) state.incMail[k] = d[k]; if (state.step === 'email') renderEmail(); }
  } catch (e) { /* defaults stay */ }
  try { const snap = await db.doc('config/logo').get(); if (snap.exists) { const d = snap.data() || {}; if (typeof d.dataUrl === 'string' && d.dataUrl.startsWith('data:image/')) { state.logo = { dataUrl: d.dataUrl, w: d.w, h: d.h }; logoPx = null; renderBrand(); render(); } } } catch (e) { /* none */ }
  try { const snap = await db.doc('config/attLinks').get(); if (snap.exists) { const d = snap.data() || {}; state.attLinks = new Map((d.links || []).filter(x => x && x.n && x.pid).map(x => [x.n, x.pid])); if (state.attFiles.length) refresh(); } } catch (e) { /* none */ }
  try { const snap = await db.doc('config/nameLinks').get(); if (snap.exists) { loadNameMemo(snap.data()); refresh(); } } catch (e) { /* none */ }
  try { const snap = await db.doc('config/ids').get(); if (snap.exists) { const d = snap.data() || {}; if (Array.isArray(d.rows)) { state.idsFile = { name: d.name || 'IDs file', at: d.at || '', rows: d.rows, keep: Array.isArray(d.keep) ? d.keep : [] }; state.idsAuto = true; refresh(); } } } catch (e) { /* none */ }
  if (!state.logo && Auth.team() && Auth.team().logo) { state.logo = Auth.team().logo; render(); }
  watchShared(db);   // history, final results and accounts stay live, so every role sees the same data
  try { const snap = await db.doc('config/scorecards').get(); if (snap.exists) { const d = snap.data() || {}; if (d.teams && typeof d.teams === 'object') { migrateCards(d.teams); state.cards = { base: typeof d.base === 'number' ? d.base : 1000, bases: d.bases && typeof d.bases === 'object' ? d.bases : undefined, teams: d.teams, ...(d.elig && typeof d.elig === 'object' ? { elig: d.elig } : {}), ...(d.count && typeof d.count === 'object' ? { count: d.count } : {}), ...(d.people && typeof d.people === 'object' ? { people: d.people } : {}), ...(Array.isArray(d.log) ? { log: d.log } : {}) }; state.rulesVer++; state.incModelCache = null; refresh(); } } } catch (e) { /* defaults stay */ }
  try { const sn = await db.collection('kpi').get(); sn.docs.forEach(d => { const x = d.data(); if (x && Array.isArray(x.rows)) state.kpiFiles[d.id] = x; }); if (sn.docs.length) refresh(); } catch (e) { /* none */ }
  loadSnaps(); loadAttState();
  try { db.collection('forms').onSnapshot(sn => { state.forms = sn.docs.map(d => ({ ...d.data(), id: d.id })); if (!$('dPerson').hidden) renderPerson(); if (state.ws !== 'build') renderWs(); }, () => {}); } catch (e) { /* none */ }
  db.collection('roster').onSnapshot(snap => {
    state.roster = snap.docs.map(d => ({ _id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
    state.rosterReady = true; state.rosterMsg = state.roster.length ? '' : 'Import a workbook that has a Roster sheet (a report made by this tool works), or add people one by one.';
    const ids = new Set(state.roster.map(p => p._id)); for (const id of [...state.sel]) if (!ids.has(id)) state.sel.delete(id);
    if (tableHasFocus()) { state.pendingRender = true; refresh({ table: false }); }
    else refresh();
  }, e => { state.rosterMsg = 'The saved roster could not be loaded (' + ((e && e.code) || 'error') + '). Reload the page to try again.'; state.rosterReady = true; refresh(); });
}
function applySettings(d) {
  if (!d) return; const s = state.settings;
  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  if (num(d.target, 0, 1) != null) s.target = d.target;
  if (num(d.floor, 0, 1) != null) s.floor = d.floor;
  if (num(d.inactiveMin, 0, 31) != null) s.inactiveMin = Math.round(d.inactiveMin);
  if (Array.isArray(d.dedBrands)) s.dedBrands = d.dedBrands.filter(x => typeof x === 'string');
  if (Array.isArray(d.dedTeams)) s.dedTeams = d.dedTeams.filter(x => typeof x === 'string');
  if (Array.isArray(d.incFullAdhTeams)) s.incFullAdhTeams = d.incFullAdhTeams.filter(x => typeof x === 'string');
  if (typeof d.manager === 'string' && d.manager.trim()) s.manager = d.manager;
  if (typeof d.managerTitle === 'string' && d.managerTitle.trim()) s.managerTitle = d.managerTitle;
  if (Array.isArray(d.noAutoLink)) s.noAutoLink = d.noAutoLink.filter(x => typeof x === 'string');
}
let setTimer = null;
function persistSettings() {
  $('setSaved').textContent = state.db ? 'Saving…' : 'Not saved in this view';
  if (!state.db) return;
  clearTimeout(setTimer);
  setTimer = setTimeout(() => {
    const body = clone(state.settings);
    queueWrite('config/settings', () => state.db.doc('config/settings').set(body))
      .then(() => { $('setSaved').textContent = savedWhere(); }, e => { $('setSaved').textContent = 'Not saved (' + ((e && e.code) || 'error') + ')'; });
  }, 600);
}
function updatePerson(id, patch, opts = {}) {
  if (!isBuilder()) return;
  const p = state.roster.find(x => x._id === id); if (!p) return;
  const prev = {}; for (const k of Object.keys(patch)) prev[k] = p[k];
  Object.assign(p, patch);
  if (state.db) queueWrite('roster/' + id, () => state.db.doc('roster/' + id).update(patch));
  if (!opts.quiet) refresh({ table: opts.table ?? false, row: id });
  return prev;
}
function addPerson(body = {}, opts = {}) {
  const order = state.roster.reduce((a, p) => Math.min(a, p.order ?? 0), 0) - 1;
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const doc = { name: '', nid: '', brand: 'Virgin', team: 'CC', sys: '', status: 'Active', order, ...body };
  state.roster.unshift({ _id: id, ...doc });
  if (state.db) queueWrite('roster/' + id, () => state.db.doc('roster/' + id).set(doc));
  if (!opts.quiet) refresh();
  return id;
}
function removePeople(ids) {
  const gone = state.roster.filter(p => ids.includes(p._id));
  state.roster = state.roster.filter(p => !ids.includes(p._id));
  ids.forEach(id => state.sel.delete(id));
  if (state.db) for (const id of ids) queueWrite('roster/' + id, () => state.db.doc('roster/' + id).delete());
  refresh();
  return gone;
}
function restorePeople(list) {
  for (const p of list) {
    const { _id, ...doc } = p; state.roster.push(p);
    if (state.db) queueWrite('roster/' + _id, () => state.db.doc('roster/' + _id).set(doc));
  }
  state.roster.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
  refresh();
}
const rosterRows = () => state.roster.filter(p => normSpace(p.name));
const savedWhere = () => (state.db && state.db.local ? 'Saved in this browser on this computer' : 'Saved with this page');

// ---------------------------------------------------------------- local storage stand-in for the page database (HTML file opened outside Claude)
function localDb() {
  const KEY = 'wf-db'; let data = {}, persistent = true;
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { persistent = false; }
  const listeners = new Map();
  const copy = v => JSON.parse(JSON.stringify(v));
  const save = () => { if (!persistent) return; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { throw { code: 'resource_exhausted', message: 'Browser storage is full' }; } };
  const snapDoc = (id, body) => ({ id, exists: body !== undefined, data: () => (body === undefined ? undefined : copy(body)) });
  const qsnap = c => { const docs = Object.keys(data).filter(k => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/')).map(k => snapDoc(k.slice(c.length + 1), data[k])); return { docs, size: docs.length, empty: !docs.length }; };
  const emit = path => { const s = path.split('/'), cs = new Set([s[0], s.slice(0, -1).join('/')]); for (const c of cs) (listeners.get(c) || []).forEach(f => setTimeout(() => f(qsnap(c)), 0)); };   // the record's own collection (a sub-collection too) and its top one
  return {
    local: true, persistent,
    doc: path => ({
      id: path.split('/').pop(), path,
      get: async () => snapDoc(path.split('/').pop(), data[path]),
      set: async body => { data[path] = copy(body); save(); emit(path); },
      update: async patch => { if (!(path in data)) throw { code: 'invalid_argument' }; Object.assign(data[path], copy(patch)); save(); emit(path); },
      delete: async () => { delete data[path]; save(); emit(path); },
    }),
    collection: c => ({
      get: async () => qsnap(c),
      onSnapshot: cb => { if (!listeners.has(c)) listeners.set(c, []); listeners.get(c).push(cb); setTimeout(() => cb(qsnap(c)), 0); return () => { listeners.set(c, (listeners.get(c) || []).filter(f => f !== cb)); }; },
    }),
  };
}

/*@@STORE@@*/
/*@@AUTH@@*/

// ---------------------------------------------------------------- files
let fseq = 0;
async function addFiles(list) {
  const rest = [];
  for (const f of list) {
    if (/\.msg$/i.test(f.name)) { importDistributionMsg(f); continue; }
    if (await isInterFile(f)) { importInteractions(f); continue; }
    rest.push(f);
  }
  list = rest;
  const items = [...list].map(f => ({ fid: ++fseq, name: f.name, size: f.size, file: f, t0: Date.now() }));
  if (!items.length) return;
  const snap0 = impSnap(); items.forEach(it => impLogAdd('wait', `Reading ${it.name} (${fmtSize(it.size)})`));
  state.pending.push(...items); renderPending(); renderSteps(); renderImpSide();
  const notes = [];
  const parsed = await Promise.all(items.map(async it => {
    let dets;
    try { dets = await parse(it.name, await it.file.arrayBuffer()); }
    catch (e) { dets = [{ kind: 'error', sheet: it.name, msg: 'Could not read this file. Save it as .csv or .xlsx and try again.' }]; }
    state.pending = state.pending.filter(p => p.fid !== it.fid); renderPending();
    return { it, dets, inc: History.isIncentive(dets.map(d => d.sheet || '')) };
  }));
  const route = routeHistory(parsed);   // Genesys exports of other months go to the history, not to this month's slots
  for (const x of parsed) {
    const { it } = x;
    if (x.inc) { await addHistoryFile(it, notes); continue; }
    if (x.routed && !x.dets.length) continue;
    if (/\.(xlsx|xlsm)$/i.test(it.name) && !x.dets.some(d => KIND_BY[d.kind] || (d.kind === 'attendance' && d.data)) && await tryEvalFile(it, notes)) continue;
    if (/\.(xlsx|xlsm|csv)$/i.test(it.name) && !x.dets.some(d => KIND_BY[d.kind] || (d.kind === 'attendance' && d.data)) && await tryKpiFile(it, notes)) continue;
    place(it, x.dets, notes);
    if (!state.monthManual) { const g = Core.guessMonth(allDets()); state.y = g.y; state.m = g.m; }
  }
  const gh = route.hist.length ? applyGenesysHistory(route.hist, route.W) : null;
  refresh(); impLogAfter(items, snap0, notes);
  const bad = notes.filter(n => n.bad).length, replaced = notes.filter(n => n.replaced).map(n => n.replaced), sum = notesSummary();
  const kpiN = notes.filter(n => n.kpi).map(n => n.kpi), idsN = notes.filter(n => n.ids).length, histK = [...new Set(notes.filter(n => n.hist).map(n => n.hist))].sort();
  const head = (replaced.length ? `Replaced ${replaced.join(', ')}` : bad ? `${plural(items.length - bad, 'file')} read, ${bad} not recognised` : `${plural(items.length, 'file')} read`) + (idsN && state.idsLog.length ? `. ${plural(state.idsLog.length, 'National ID')} added to the roster from the IDs file` : '') + (histK.length ? `. Added ${histK.map(ymLabel).join(', ')} to the history (Review › History)` : '') + (gh ? '. ' + ghistText(gh) : '') + (kpiN.length ? `. KPI file for ${MONTH_LONG[state.m - 1]}: ${kpiN.join('; ')}` : '');
  toast(sum ? `${head}. Checked: ${sum}.` : `${head}.`, sum ? { label: 'Open', fn: openNotes } : null);
}
function place(it, dets, notes) {
  const mine = {};
  if (placeAttendance(it, dets)) { dets = dets.filter(d => d.kind !== 'attendance' || !d.data); state.others = state.others.filter(o => o.name !== it.name); if (!dets.length) return; }
  const idd = dets.find(d => d.kind === 'roster' && d.data && looksLikeIds(d));
  if (idd && !dets.some(d => KIND_BY[d.kind])) { placeIds(it, idd); notes.push({ ids: it.name }); state.others = state.others.filter(o => o.name !== it.name); return; }
  for (const d of dets) {
    if (KIND_BY[d.kind] && d.data) {
      d._uid = ++uid;
      if (mine[d.kind]) { mine[d.kind].dets.push(d); continue; }
      const old = state.slots[d.kind];
      if (old) notes.push({ replaced: `${KIND_BY[d.kind].title} (${old.name})` });
      mine[d.kind] = state.slots[d.kind] = { fid: it.fid, name: it.name, size: it.size, dets: [d] };
    } else {
      const bad = d.kind === 'error' || d.kind === 'unknown';
      if (bad) notes.push({ bad: true });
      state.others.push({ fid: it.fid, name: it.name, kind: d.kind, sheet: d.sheet, msg: d.msg || '', det: d });
    }
  }
  for (const k of Object.keys(mine)) mine[k].info = slotScan(k, mine[k].dets);
  // a file that now fills a slot replaces any earlier "other" entry with the same name
  if (Object.keys(mine).length) state.others = state.others.filter(o => o.fid === it.fid || o.name !== it.name);
}
function slotScan(kind, dets) {
  const months = new Map(); let lo = Infinity, hi = -Infinity, rows = 0; const agents = new Set();
  const bump = t => { const x = dd(t); const k = x.y * 100 + x.m; months.set(k, (months.get(k) || 0) + 1); if (t < lo) lo = t; if (t > hi) hi = t; };
  let days = [], withVal = 0, withAht = 0, month = null;
  for (const d of dets) {
    const D = d.data;
    if (kind === 'schedule' || kind === 'timeline') { rows += D.segs.length; D.segs.forEach(x => { agents.add(normName(x.name)); bump(x.s); }); if (D.month) month = D.month; }
    if (kind === 'adhGenesys') { rows += D.people.length; D.people.forEach(p => { agents.add(normName(p.name)); p.days.forEach(([day, v]) => { if (Core.adhVal(v) != null) withVal++; }); }); if (D.people[0]) days = D.people[0].days.map(x => x[0]); }
    if (kind === 'aht') { rows += D.people.length; D.people.forEach(p => { agents.add(normName(p.name)); if (p.sec != null) withAht++; }); if (D.month) month = D.month; }
    if (kind === 'perf') { rows += D.rows.length; D.rows.forEach(p => agents.add(normName(p.name))); if (D.month) month = D.month; }
  }
  return { rows, agents: agents.size, months, lo, hi, days, withVal, withAht, month };
}
const allDets = () => [...KINDS, ...XKINDS].flatMap(k => (state.slots[k.kind] ? state.slots[k.kind].dets : []));
function slotView(kind) {
  const s = state.slots[kind]; if (!s) return null;
  const I = s.info, Y = state.y, M = state.m, ND = Core.daysIn(Y, M), mk = Y * 100 + M, ML = MONTH_LONG[M - 1];
  const warns = [], kv = []; let bad = false;
  kv.push([I.agents, 'agents']);
  if (kind === 'adhGenesys') {
    const D0 = s.dets[0] && s.dets[0].data;
    if (D0 && D0.multi) {   // several months in one export: the selected month is used
      const key = Y + '-' + M, ms = D0.months || [];
      I.days = D0.people.length ? (D0.people[0].byMonth[key] || []).map(x => x[0]) : [];
      I.withVal = D0.people.reduce((t, p) => t + (p.byMonth[key] || []).filter(([, v]) => Core.adhVal(v) != null).length, 0);
      if (ms.length > 1) warns.push(`Covers ${MON[ms[0].m - 1]} ${ms[0].y} – ${MON[ms[ms.length - 1].m - 1]} ${ms[ms.length - 1].y}; only ${ML} is used here. The other full months go to the history.`);
      if (!ms.some(x => x.y === Y && x.m === M)) { warns.push(`No ${ML} ${Y} in this export.`); bad = true; }
    }
    const mx = I.days.length ? Math.max(...I.days) : 0, mn = I.days.length ? Math.min(...I.days) : 0;
    kv.push([I.rows, 'rows'], [I.days.length ? `${mn}–${mx}` : '–', 'days']);
    if (mx > ND) warns.push(`Has ${mx} day columns but ${ML} has ${ND} days. Days after ${ND} are not used.`);
    else if (mx && mx < ND) warns.push(`Has ${mx} day columns but ${ML} has ${ND} days. The other days show as NA.`);
    if (!I.withVal) { warns.push('No adherence values found.'); bad = true; }
  } else if (kind === 'aht') {
    kv.push([I.rows, 'rows'], [I.month ? `${MON[I.month.m - 1]} ${I.month.y}` : '–', 'month']);
    if (I.month && (I.month.y !== Y || I.month.m !== M)) warns.push(`The report is for ${MONTH_LONG[I.month.m - 1]} ${I.month.y}, but the selected month is ${ML} ${Y}.`);
    if (!I.withAht) { warns.push('No Avg Handle values found.'); bad = true; }
  } else if (kind === 'perf') {
    const D0 = s.dets[0].data, mm = (D0.months || []).find(x => x.y === Y && x.m === M), rows = mm ? Core.perfMonth(D0, Y, M) : [];
    const on = new Set(rosterRows().map(p => normName(normSpace(p.sys) ? p.sys : p.name))), matched = rows.filter(r => on.has(normName(r.name))).length;
    kv.length = 0; kv.push([rows.length, 'agents'], [matched, 'matched'], [I.month ? `${MON[I.month.m - 1]} ${I.month.y}` : '–', 'month']);
    if (!mm) { warns.push(`No ${ML} ${Y} in this export${I.month ? ` (it is for ${MONTH_LONG[I.month.m - 1]} ${I.month.y})` : ''}. Other months go to the history.`); bad = true; }
    else if (!mm.full) warns.push(`Covers only part of ${ML}. The numbers are for the days in the export.`);
    if (D0.months.length > 1) warns.push(`Has ${plural(D0.months.length, 'month')}; only ${ML} is used here. The other full months go to the history.`);
    if (D0.skipped) warns.push(`${plural(D0.skipped, 'row')} cover more than one month and cannot be split, so they are left out.`);
  } else {
    const inMonth = I.months.get(mk) || 0, yr = dd(I.lo).y !== dd(I.hi).y;
    kv.push([I.rows.toLocaleString('en-US'), 'rows'], [I.rows ? `${fmtDay(I.lo, yr)} – ${fmtDay(I.hi, yr)}` : '–', 'dates']);
    if (!inMonth) { warns.push(`No rows in ${ML} ${Y}. Check the month in Settings.`); bad = true; }
    else if (I.months.size > 1) warns.push(`Covers ${fmtDay(I.lo, yr)} – ${fmtDay(I.hi, yr)}; only ${ML} is used (${inMonth.toLocaleString('en-US')} rows).`);
    if (kind === 'timeline' && I.month && (I.month.y !== Y || I.month.m !== M)) warns.push(`The report interval starts in ${MONTH_LONG[I.month.m - 1]} ${I.month.y}, but the selected month is ${ML} ${Y}.`);
  }
  return { s, warns, kv, bad };
}

// ---------------------------------------------------------------- derived data
function refresh(o = {}) {
  const dets = allDets(), ad = attDets(), ros = rosterRows();
  loadAttState();
  state.ctx = dets.length || ad.length ? Glue.makeContext(dets, ros, state.settings, state.y, state.m) : null;
  state.attRes = null; state.incModelCache = null;
  if (state.ctx && ad.length) {
    const nm = list => new Map(list.map(x => [normName(x.name), x.days]));
    state.attRes = Att.merge(ad, ros, { y: state.y, m: state.m, undo: state.attUndo, picks: state.attPicks, links: state.attLinks, adh: nm(state.ctx.rawAdh), sched: nm(state.ctx.rawSched), floor: state.settings.floor });
    const fills = new Map(state.attRes.idFills.map(f => [f.pid, f.id]));
    if (fills.size) state.ctx.roster = state.ctx.roster.map(p => (fills.has(p._id) ? { ...p, nid: fills.get(p._id) } : p));
    overlayAttEdits(state.attRes.byPerson);
    state.ctx.attendance = state.attRes.byPerson;
  } else if (state.ctx) {   // no sheets from the supervisors: attendance from Genesys, with their corrections
    watchAttEdits(monthKey());
    const A = autoAttendance(state.ctx);
    if (A) { state.attRes = A; state.ctx.attendance = A.byPerson; }
  }
  state.perf = perfNow();
  state.model = state.ctx ? computeModel(state.ctx) : null;
  state.review = attachReview();
  state.byId = new Map((state.model || []).map(x => [x.p._id, x]));
  state.kpi = computeKpi();
  state.issues = computeIssues();
  if (!o.noAuto && autoLinkNames()) { refresh({ ...o, noAuto: true }); toast(`${plural(state.autoLinks.length, 'roster name')} matched to the Genesys name automatically`, { label: 'See', fn: openNotes }); return; }
  state.idSync = state.rosterReady ? idSync() : null;
  if (state.idSync && state.idsAuto && rosterRows().length) { state.idsAuto = false; if (applyIdFills(state.idSync)) { setTimeout(() => refresh(), 0); } }
  state.dups = dupGroups(); state.dupIds = new Set(state.dups.flatMap(g => g.pids));
  state.notes = computeNotes();
  state.ver++;
  render(o);
  scheduleAutoSave();
  publishSupervisors();
  notify();
  if (!$('dNotes').hidden) renderNotes();
}
/** the Daily WFM & Performance Review's measures for each employee, added up over the month (needs Schedule and Agent Status Timeline) */
const WF_T = () => ({ ...History.REVIEW_T, adhTarget: state.settings.target });
let reviewMemo = null;
function attachReview() {
  const S = state.slots.schedule, TL = state.slots.timeline;
  if (!state.model) return null;
  for (const m of state.model) { m.wf = null; m.wfDays = null; }
  if (!S || !TL) return null;
  const key = S.dets.map(d => d._uid).join(',') + '|' + TL.dets.map(d => d._uid).join(',') + '|' + state.y + '-' + state.m;
  if (!reviewMemo || reviewMemo.key !== key) reviewMemo = { key, R: Core.computeDayReview(S.dets, TL.dets, state.y, state.m) };
  const R = reviewMemo.R, TH = WF_T(), raw = new Map(state.ctx.rawAdh.map(x => [normName(x.name), x.days]));
  let n = 0;
  for (const m of state.model) {
    const rv = R.get(m.ek); if (!rv) continue;
    const ad = raw.get(m.ek), pf = m.pf || {};
    m.wfDays = rv.days.map(o => Core.judgeDay(o, ad ? ad[o.day - 1] ?? null : null, TH));
    m.wf = Core.reviewMonth(m.wfDays, TH, { aht: m.aht, ans: pf.ans ?? null, hnd: pf.hnd ?? null, tHold: pf.tHold ?? null, rona: pf.rona ?? null });
    if (!m.wf.shifts) { m.wf = null; continue; }
    const handle = pf.pAht != null && pf.hnd ? pf.pAht * pf.hnd : null;
    m.wf.occ = handle != null && m.wf.logged > 0 ? handle / (m.wf.logged * 60) : null;
    if (m.sch && m.act) { let ded = 0, base = 0; m.sch.forEach((sv, i) => { const av = m.act[i]; if (sv == null || av == null || av === 0) return; ded += Math.max(0, sv - av); base += sv; }); m.wf.conf = base > 0 ? 1 - ded / base : null; }
    n++;
  }
  return n ? { n, T: TH } : null;
}
/** this month's performance per agent: the Performance export on Import, else what the history holds for this month */
function perfNow() {
  const s = state.slots.perf, Y = state.y, M = state.m;
  if (s) {
    const D = s.dets[0].data, mm = (D.months || []).find(x => x.y === Y && x.m === M);
    if (mm) { const rows = s.dets.flatMap(d => Core.perfMonth(d.data, Y, M)); return { src: s.name, media: D.media || '', full: mm.full, rows, byName: new Map(rows.map(r => [normName(r.name), r])), byId: new Map() }; }
  }
  const rec = state.history[ymKey(Y, M)];
  const rows = rec ? rec.rows.filter(r => r.hnd != null || r.ans != null) : [];
  if (!rows.length) return null;
  return { src: 'the history', media: rec.pmedia || '', full: true, rows, byName: new Map(rows.map(r => [normName(r.n), r])), byId: new Map(rows.filter(r => r.id).map(r => [r.id, r])) };
}
function computeModel(ctx) {
  const set = ctx.settings, ND = Core.daysIn(ctx.year, ctx.month);
  const first = list => { const m = new Map(); for (const x of list) { const k = normName(x.name); if (!m.has(k)) m.set(k, x); } return m; };
  const A = first(ctx.rawAdh), H = first(ctx.rawAht), S = first(ctx.rawSched), T = first(ctx.rawActual);
  const tl = new Set((state.slots.timeline ? state.slots.timeline.dets : []).flatMap(d => d.data.agents.map(normName)));
  const anyAdh = !!state.slots.adhGenesys, anyAht = !!state.slots.aht, anySch = !!state.slots.schedule, anyTl = !!state.slots.timeline, PF = state.perf;
  return ctx.roster.map(p => {
    const exp = normSpace(normSpace(p.sys) ? p.sys : p.name), ek = normName(exp);
    const a = A.get(ek), h = H.get(ek), s = S.get(ek), t = T.get(ek);
    const adh = a ? a.days.map(v => (typeof v === 'number' && v >= set.floor ? v : null)) : null;
    const valid = adh ? adh.filter(v => v != null) : [];
    const avg = valid.length ? valid.reduce((x, y) => x + y, 0) / valid.length : null;
    const status = p.status === 'Inactive' ? 'Inactive' : 'Active';
    const at = ctx.attendance && ctx.attendance.get(p._id), attC = at && at.filled ? Att.counts(at.days, at.tardyFile) : null;
    const attended = attC ? attC.worked : valid.length;
    const shown = status !== 'Inactive' || attended >= set.inactiveMin;
    const inDed = shown && set.dedBrands.includes(normSpace(p.brand)) && set.dedTeams.includes(normSpace(p.team));
    const sch = s ? s.days : null, act = t ? t.days : null;
    const diff = Array.from({ length: ND }, (_, i) => { const sv = sch ? sch[i] : null, av = act ? act[i] : null; return sv == null || av == null ? null : av === 0 ? 0 : Math.max(0, sv - av); });
    const ded = inDed ? diff.reduce((x, y) => x + (y || 0), 0) : null;
    const found = { adh: !!a, aht: !!h, sch: !!s, tl: tl.has(ek) };
    const pid = Core.cleanId(p.nid), pf = PF ? PF.byName.get(ek) || (pid && PF.byId.get(pid)) || PF.byName.get(normName(p.name)) || null : null;
    return { p, exp, ek, adh, avg, days: valid.length, status, attended, shown, inDed, sch, act, diff, ded, aht: h ? h.sec : null, found, pf,
      any: found.adh || found.aht || found.sch || found.tl, files: { adh: anyAdh, aht: anyAht, sch: anySch, tl: anyTl } };
  });
}
function suggestFor(name, where) {
  const k = normName(name), own = (state.model || []).find(m => normName(m.p.name) === k && normSpace(m.p.sys) && normName(m.p.sys) !== k);
  if (own) return { p: own.p, alias: true };   // the export name is this person's roster name: their system name points elsewhere
  let best = null, bs = 0, second = null, ss = 0;
  for (const m of state.model || []) {
    if (where.some(w => m.found[w])) continue;    // already matched in that export
    const s = Math.max(Core.nameScore(name, m.p.name), normSpace(m.p.sys) ? Core.nameScore(name, m.p.sys) : 0);
    if (s > bs) { second = best; ss = bs; bs = s; best = m.p; } else if (s > ss) { ss = s; second = m.p; }
  }
  if (bs < 0.6) return null;
  return bs - ss > 0.04 ? { p: best } : { several: [best, second].filter(Boolean) };   // two people fit (almost) as well: no one-click link
}
function computeIssues() {
  const c = state.ctx; if (!c) return [];
  const g = new Map();
  const add = (list, w) => { for (const n of list) { const k = normName(n); if (state.ignored.has(k)) continue; if (!g.has(k)) g.set(k, { name: n, key: k, where: [] }); if (!g.get(k).where.includes(w)) g.get(k).where.push(w); } };
  add(c.checks.adh, 'adh'); add(c.checks.aht, 'aht'); add(c.checks.sched, 'sch');
  const list = [...g.values()].sort((a, b) => a.name.localeCompare(b.name));
  list.forEach(x => { const g = suggestFor(x.name, x.where); x.sugg = g && g.p ? g.p : null; x.alias = !!(g && g.alias); x.several = g && g.several ? g.several : null; });
  return list;
}

// ---------------------------------------------------------------- render
const tableHasFocus = () => !!(document.activeElement && $('roster').contains(document.activeElement));
function render(o = {}) {
  if (state.ws !== 'build') { renderWs(); if (!$('dPerson').hidden && state.personId) renderPerson(); return; }
  renderHeader(); renderSteps();
  if (state.step === 'import') renderImport();
  if (state.step === 'review') {
    renderBadges();
    if (state.tab === 'people') {
      if (state.rf === 'dup') renderDupPanel();
      else if (state.pview === 'cards') renderPeopleCards();
      else if (o.table === false && o.row) renderRow(o.row); else if (o.table !== false && !tableHasFocus()) renderRoster(); else if (o.table !== false) state.pendingRender = true;
      renderPeopleFilters(); renderPeopleMeta();
    }
    if (state.tab === 'checks') renderChecks();
    if (state.tab === 'issues') renderIssues();
    if (state.tab === 'preview') renderPreview();
    if (state.tab === 'history') renderHistory();
    if (state.tab === 'kpi') renderKpiTab();
  }
  if (state.step === 'export') renderExport();
  if (state.step === 'email') renderEmail();
  if (!$('dPerson').hidden && state.personId) renderPerson();
  setSave(); renderToday(); renderCsat();
}
function renderHeader() {
  $('monthBtn').textContent = monthLabel();
  $('monthBtn').setAttribute('aria-label', `Month: ${MONTH_LONG[state.m - 1]} ${state.y}. Open settings to change it.`);
  const ready = canBuild();
  $('buildTop').disabled = !ready || state.building;
  $('buildTop').title = ready ? `Build ${fileNameOut()}` : buildBlocker();
}
const nSlots = () => KINDS.filter(k => state.slots[k.kind]).length;
const freshBuild = () => state.built && state.built.ver === state.ver;
function renderSteps() {
  const n = nSlots(), iss = state.issues.length;
  $('sub-import').textContent = state.pending.length ? `Reading ${plural(state.pending.length, 'file')}…` : state.attFiles.length ? `${n}/4 exports · ${state.attFiles.length} attendance` : `${n} of 4 exports`;
  $('sub-review').textContent = !state.ctx ? `${plural(rosterRows().length, 'person', 'people')}` : iss ? `${plural(iss, 'name issue')}` : 'Names match';
  $('sub-export').textContent = state.built ? (freshBuild() ? 'Downloaded' : 'Changed since build') : canBuild() ? 'Ready to build' : 'Needs files';
  const md = state.mailDone[`${state.mailKind}-${state.mailStage}`];   // the tool never sends: the step says what was done, and when
  $('sub-email').textContent = md ? `${md.how || 'Copied'} ${md.at || ''} · ${state.mailKind === 'inc' ? 'incentive' : 'deduction'} ${state.mailStage === 'final' ? 'final' : 'review'}`.replace(/\s+·/, ' ·') : `${state.mailKind === 'inc' ? 'Incentive' : 'Deduction'} ${state.mailStage === 'final' ? 'final' : 'review'}`;
  document.querySelectorAll('.step').forEach(b => {
    const s = b.dataset.step;
    const done = s === 'import' ? n === 4 : s === 'review' ? !!state.ctx && !iss : s === 'export' ? !!freshBuild() : !!state.mailDone[`${state.mailKind}-${state.mailStage}`];
    b.classList.toggle('done', done);
    b.querySelector('.n').innerHTML = done ? '<svg aria-hidden="true"><use href="#i-check"/></svg><span class="sr">done</span>' : String(STEPS.indexOf(s) + 1);
    if (s === state.step) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  renderRing();
  moveThumb(document.querySelector('.steps'), '.step[aria-current="page"]');
}
function renderBadges() {
  const ck = checkNotes().filter(n => n.sev === 'decide' || n.sev === 'warn').length, bc = $('bChecks'); bc.textContent = ck; bc.classList.toggle('n', ck > 0); bc.setAttribute('aria-label', plural(ck, 'check') + ' to look at');
  $('bPeople').textContent = rosterRows().length; $('bHist').textContent = Object.keys(state.history).length; $('bKpi').textContent = state.kpi.size;
  const b = $('bIssues'); b.textContent = state.issues.length; b.classList.toggle('n', state.issues.length > 0);
  b.setAttribute('aria-label', plural(state.issues.length, 'issue'));
}

// ---- import
function renderImport() { renderPending(); renderSlots(); renderAttCard(); renderIdsCard(); renderKpiCard(); renderOthers(); renderImportNote(); renderImpSide(); }
function renderPending() {
  $('pending').innerHTML = state.pending.map(p => `<li><div class="row"><b>${esc(p.name)}</b><span>${fmtSize(p.size)}</span></div><div class="progress" role="progressbar" aria-label="Reading ${esc(p.name)}"><i></i></div><div class="hint">Reading and recognising the columns…</div></li>`).join('');
}
function renderSlots() {
  $('slots').innerHTML = [...KINDS, ...XKINDS].map(k => {
    const v = slotView(k.kind);
    if (!v) return `<article class="slot${k.optional ? ' opt' : ''}" aria-label="${esc(k.title)}: ${k.optional ? 'optional' : 'waiting'}">
      <div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-file"/></svg></span><h3>${esc(k.title)}</h3></div><span class="pill">${k.optional ? 'Optional' : 'Waiting'}</span></div>
      <div class="hint">${esc(k.what)}. Expected columns:</div><div class="cols">${esc(k.cols)}</div>
      <div class="acts"><button class="btn sm" data-pick>Choose file</button></div></article>`;
    const pill = v.bad ? '<span class="pill bad">Check</span>' : v.warns.length ? `<span class="pill warn">${plural(v.warns.length, 'note')}</span>` : '<span class="pill good">Ready</span>';
    const sheets = v.s.dets.map(d => d.sheet).filter(s => s && s !== v.s.name);
    return `<article class="slot ${v.bad ? 'error' : 'ready'}" aria-label="${esc(k.title)}: ${v.bad ? 'needs a check' : 'ready'}">
      <div class="top"><div class="ttl"><span class="ico"><svg><use href="#${v.bad ? 'i-alert' : 'i-check'}"/></svg></span><h3>${esc(k.title)}</h3></div>${pill}</div>
      <div><div class="fname">${esc(v.s.name)}</div><div class="meta">${fmtSize(v.s.size)}${sheets.length ? ' · sheet ' + esc(sheets.join(', ')) : ''}</div></div>
      <div class="kv">${v.kv.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>
      ${v.warns.length ? `<ul class="warns">${v.warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <div class="acts"><button class="btn sm" data-pick>Replace</button><button class="btn sm ghost" data-unslot="${k.kind}">Remove</button></div></article>`;
  }).join('');
}
const OTHER = { roster: 'Roster sheet', attendance: 'Attendance grid', adhGrid: 'Adherence grid', ignored: 'Not used', unknown: 'Not recognised', error: 'Could not read' };
function renderOthers() {
  $('othersWrap').hidden = !state.others.length;
  $('others').innerHTML = state.others.map((o, i) => {
    const cls = o.kind === 'error' || o.kind === 'unknown' ? 'bad' : o.kind === 'roster' ? 'info' : 'warn';
    const msg = o.kind === 'roster' ? 'Has a Roster sheet. Load it into the roster instead of an export.'
      : o.kind === 'attendance' ? 'Looks like attendance, but no day columns with dates were found.'
      : o.kind === 'adhGrid' ? 'Looks like a finished adherence sheet. Drop the Genesys Monthly Adherence export instead.'
      : o.kind === 'unknown' ? 'The columns do not match any of the four Genesys exports.' : o.msg;
    return `<li><b>${esc(o.name)}</b><span class="pill ${cls}">${esc(OTHER[o.kind] || o.kind)}</span><span class="subtle">${esc(msg)}</span><span class="spacer"></span>
      ${o.kind === 'roster' ? `<button class="btn sm" data-roster-other="${i}">Import as roster</button>` : ''}<button class="btn sm ghost" data-unother="${i}">Remove</button></li>`;
  }).join('');
}
function renderImportNote() {
  const miss = KINDS.filter(k => !state.slots[k.kind]).map(k => k.title);
  $('importNote').textContent = !miss.length ? `All four exports are in. Month: ${MONTH_LONG[state.m - 1]} ${state.y}.`
    : miss.length === 4 ? 'Nothing dropped yet. You can still review the roster.'
    : `Missing: ${miss.join(', ')}. You can continue; ${miss.length === 1 ? 'its sheet' : 'their sheets'} will be empty.`;
}

// ---- people
const opts = (vals, cur, titles) => vals.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}${titles ? ` title="${esc(titles[v] || '')}"` : ''}>${esc(v)}</option>`).join('') + (cur && !vals.includes(cur) ? `<option selected>${esc(cur)}</option>` : '');
function statusCell(p) {
  const m = state.byId.get(p._id), on = p.status !== 'Inactive', nm = normSpace(p.name) || 'new person';
  const hid = m && !m.shown ? `<span class="pill warn ico" role="img" title="Hidden: inactive with ${m.attended} attended days (limit ${state.settings.inactiveMin}), so left out of the reports" aria-label="Hidden from the reports"><svg aria-hidden="true"><use href="#i-eyeoff"/></svg></span>` : '';
  return `<span class="stcell"><button class="sw" role="switch" aria-checked="${on}" data-sw aria-label="Status of ${esc(nm)}"><i></i>${on ? 'Active' : 'Inactive'}</button>${hid}</span>`;
}
function badgesCell(p) {
  const m = state.byId.get(p._id);
  return `<span class="mb">${KINDS.map(k => { const w = { adhGenesys: 'adh', aht: 'aht', schedule: 'sch', timeline: 'tl' }[k.kind]; const on = m && m.found[w]; return `<span class="${on ? 'on' : ''}" title="${on ? 'Found in' : 'Not found in'} ${esc(k.title)}">${k.short}</span>`; }).join('')}</span>`;
}
const rowCls = p => [p.status === 'Inactive' ? 'inactive' : '', state.dupIds && state.dupIds.has(p._id) ? 'dup' : ''].filter(Boolean).join(' ');
function rowHtml(p) {
  const nm = normSpace(p.name) || 'new person';
  return `<tr data-id="${esc(p._id)}" class="${rowCls(p)}">
    <td class="chk"><input type="checkbox" data-sel ${state.sel.has(p._id) ? 'checked' : ''} aria-label="Select ${esc(nm)}"></td>
    <td><input class="cell" data-f="name" value="${esc(p.name)}" dir="auto" placeholder="Full name" aria-label="Name"${akaOf(p).length ? ` title="Also written: ${esc(akaOf(p).join(', '))}"` : ''}></td>
    <td><input class="cell w-id" data-f="nid" value="${esc(p.nid)}" placeholder="10 digits or NA" aria-label="National ID of ${esc(nm)}"></td>
    <td><select class="cell" data-f="brand" aria-label="Brand of ${esc(nm)}">${opts(BRANDS, p.brand)}</select></td>
    <td><select class="cell" data-f="team" aria-label="Team of ${esc(nm)}" title="${esc(DEP_NAMES[p.team] || '')}">${opts(DEP_ORDER, p.team, DEP_NAMES)}</select></td>
    <td><input class="cell" data-f="sys" value="${esc(p.sys)}" dir="auto" list="sysNames" autocomplete="off" placeholder="Same as name" aria-label="System name of ${esc(nm)}"></td>
    <td><input class="cell w-sup" data-f="spvName" list="supNames" value="${esc(supName(p.spv))}" dir="auto" placeholder="–" aria-label="Supervisor of ${esc(nm)}"></td>
    <td data-c="status">${statusCell(p)}</td>
    <td data-c="badges">${badgesCell(p)}${dupMark(p)}</td>
    <td class="acts"><button class="rowbtn icon" data-open data-agent="${esc(p._id)}" aria-label="Details of ${esc(nm)}" title="Details"><svg aria-hidden="true"><use href="#i-user"/></svg></button><button class="rowbtn icon danger" data-del aria-label="Remove ${esc(nm)}" title="Remove"><svg aria-hidden="true"><use href="#i-x"/></svg></button></td></tr>`;
}
const ROWH = 48, VTHRESH = 150;   // the rows are var(--row) tall
function renderRoster() {
  state.pendingRender = false;
  const tb = $('roster');
  if (!state.rosterReady) { tb.innerHTML = `<tr><td colspan="10" class="empty">${esc(state.rosterMsg)}</td></tr>`; state.vrows = null; return; }
  const rows = filtered(); state.vrows = rows; state.vrange = null;
  const dl = $('supNames'), names = [...new Set(rosterRows().map(p => gname(effP(p._id) || p) || p.name))].sort(), sig = names.join('|');
  if (dl && dl.dataset.sig !== sig) { dl.innerHTML = names.map(n => `<option value="${esc(n)}">`).join(''); dl.dataset.sig = sig; }
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="10" class="empty">${state.roster.length ? (state.rf === 'nomatch' && !state.ctx ? '<b>No exports yet</b>Drop the exports on Import to see who is not found.' : '<b>Nobody matches</b>Try another search or filter.')
      : `<b>The roster is empty</b>${esc(state.rosterMsg || 'Add people one by one, or import a workbook that has a Roster sheet.')}`}</td></tr>`;
  } else if (rows.length <= VTHRESH) tb.innerHTML = rows.map(rowHtml).join('');
  else renderWindow(true);
  syncSel();
}
function renderWindow(force) {
  const rows = state.vrows; if (!rows || rows.length <= VTHRESH) return;
  const wrap = $('rwrap'), top = Math.max(0, wrap.scrollTop - 34), h = wrap.clientHeight || 600;
  const s = Math.max(0, Math.floor(top / ROWH) - 12), e = Math.min(rows.length, Math.ceil((top + h) / ROWH) + 12);
  if (!force && state.vrange && state.vrange[0] === s && state.vrange[1] === e) return;
  state.vrange = [s, e];
  $('roster').innerHTML = (s ? `<tr class="vspace" style="height:${s * ROWH}px" aria-hidden="true"><td colspan="10"></td></tr>` : '') + rows.slice(s, e).map(rowHtml).join('') +
    (e < rows.length ? `<tr class="vspace" style="height:${(rows.length - e) * ROWH}px" aria-hidden="true"><td colspan="10"></td></tr>` : '');
}
function renderRow(id) {
  const tr = $('roster').querySelector(`tr[data-id="${CSS.escape(id)}"]`); const p = state.roster.find(x => x._id === id);
  if (!tr || !p) return;
  tr.className = rowCls(p);
  const hadFocus = tr.querySelector('[data-c="status"]').contains(document.activeElement);
  tr.querySelector('[data-c="status"]').innerHTML = statusCell(p);
  tr.querySelector('[data-c="badges"]').innerHTML = badgesCell(p) + dupMark(p);
  const t = tr.querySelector('select[data-f="team"]'); if (t) t.title = DEP_NAMES[p.team] || '';
  if (hadFocus) tr.querySelector('[data-sw]').focus();
}
function renderPeopleMeta() {
  const R = rosterRows(), inact = R.filter(p => p.status === 'Inactive').length, sys = R.filter(p => normSpace(p.sys)).length;
  const hidden = (state.model || []).filter(m => !m.shown).length;
  $('rosterState').textContent = state.rosterReady && state.roster.length
    ? `${plural(R.length, 'person', 'people')} · ${inact} inactive${state.ctx ? ` (${hidden} hidden from the reports)` : ''} · ${sys} with a system name. ${state.db ? savedWhere() + ', so changes carry over to next month.' : ''}`
    : '';
  const b = $('bulk'); b.hidden = !state.sel.size || state.pview === 'cards' || state.rf === 'dup'; $('bulkN').textContent = `${state.sel.size} selected`;
  renderMatchBadge();
}
function syncSel() {
  const vis = (state.vrows || []).map(p => p._id), n = vis.filter(id => state.sel.has(id)).length;
  const a = $('selAll'); a.checked = !!vis.length && n === vis.length; a.indeterminate = n > 0 && n < vis.length;
  renderPeopleMeta();
}
/** what was typed in a Supervisor box -> { spv } (a roster person), or null when nobody has that name */
function supPatch(v) {
  const t = normName(v); if (!t) return { spv: '' };
  const hit = rosterRows().find(p => normName(gname(effP(p._id) || p) || p.name) === t || normName(p.name) === t || normName(p.sys || '') === t) || rosterRows().find(p => akaOf(p).some(a => normName(a) === t));
  return hit ? { spv: hit._id } : null;
}
function commitSup(id, v, el) {
  const pa = supPatch(v); const p = state.roster.find(x => x._id === id);
  if (!pa) { toast(`Nobody called "${v}" in the roster. Pick a name from the list.`); if (el && p) el.value = supName(p.spv); return; }
  if (pa.spv === id) { toast('A person cannot be their own supervisor.'); if (el && p) el.value = supName(p.spv); return; }
  if (p && (p.spv || '') !== pa.spv) updatePerson(id, pa, { quiet: true });
}
function commitActive() {
  const el = document.activeElement; if (!el || !$('roster').contains(el)) return;
  const f = el.getAttribute('data-f'), tr = el.closest('tr[data-id]'); if (!f || !tr) return;
  const p = state.roster.find(x => x._id === tr.dataset.id); if (!p) return;
  const v = f === 'brand' || f === 'team' ? el.value : normSpace(el.value);
  if (f === 'spvName') { commitSup(p._id, v, el); el.blur(); return; }
  if ((p[f] ?? '') !== v) updatePerson(p._id, { [f]: v }, { quiet: true });
  el.blur();
}

// ---- issues
const WHERE = { adh: 'Adherence', aht: 'AHT', sch: 'Schedule' };
function renderIssues() {
  const el = $('issues');
  if (!state.ctx) { el.innerHTML = emptyCard('No exports yet', 'Drop the exports on Import. Names in them that are not on the roster show up here, with a suggested match.'); return; }
  const list = state.issues, R = rosterRows().slice().sort((a, b) => a.name.localeCompare(b.name));
  const free = R.filter(p => { const m = state.byId.get(p._id); return !m || !m.any; }), taken = R.filter(p => { const m = state.byId.get(p._id); return m && m.any; });
  const optList = L => L.map(p => `<option value="${esc(p._id)}">${esc(p.name)}</option>`).join('');
  const linkSel = (x) => `<select class="cell" data-linkto="${esc(x.key)}" aria-label="Link ${esc(x.name)} to a person"><option value="">Link to another person…</option>${free.length ? `<optgroup label="Not found in any export">${optList(free)}</optgroup>` : ''}<optgroup label="Already matched (their own name would become unmatched)">${optList(taken)}</optgroup></select>`;
  const unmatched = `<div class="card issue"><h3><span class="badge ${list.length ? 'n' : ''}">${list.length}</span>Names in the exports that are not on the roster${list.length && isBuilder() ? '<span class="spacer"></span><button class="btn sm" data-matchall>Match all…</button>' : ''}</h3>
    <p>People are matched by their system name, or their name when it is empty. Unmatched names are left out of the reports.</p>
    ${list.length ? `<ul class="ilist">${list.map(x => `<li data-key="${esc(x.key)}">
      <span class="nm" dir="auto">${esc(x.name)}</span>
      <span class="mb">${['adh', 'aht', 'sch'].map(w => `<span class="${x.where.includes(w) ? 'on' : ''}" title="${x.where.includes(w) ? 'In' : 'Not in'} the ${WHERE[w]} export">${w === 'adh' ? 'Adh' : w === 'aht' ? 'AHT' : 'Sch'}</span>`).join('')}</span>
      ${x.sugg ? `<span class="sg">${x.alias ? 'The roster name of' : 'Looks like'} <b dir="auto">${esc(x.sugg.name)}</b>${x.alias ? ', whose system name is another name' : ''}</span>` : x.several ? `<span class="sg">Several people fit: ${x.several.map(p => `<b dir="auto">${esc(p.name)}</b>`).join(', ')}</span>` : '<span class="sg">No close match on the roster</span>'}
      <span class="sp"></span>
      <span class="acts">${x.sugg ? `<button class="btn sm primary" data-link="${esc(x.sugg._id)}">Link as system name</button>` : ''}${linkSel(x)}
      <button class="btn sm" data-addnew>Add as new person</button><button class="btn sm ghost" data-ignore title="Hide this name until the page is reloaded">Not needed</button></span></li>`).join('')}</ul>`
      : '<p class="subtle" style="margin:0">Every name in the exports matches someone on the roster.</p>'}</div>`;
  const nt = state.ctx.checks.noTimeline;
  const note = state.slots.schedule && state.slots.timeline ? `<div class="card issue"><h3><span class="badge">${nt.length}</span>Scheduled agents with no status timeline</h3>
    <p>Their Actual is 0, so their Diff is 0 every day. Check that the timeline export covers all agents.</p>
    ${nt.length ? `<ul class="ilist">${nt.map(n => `<li><span class="nm" dir="auto">${esc(n)}</span></li>`).join('')}</ul>` : '<p class="subtle" style="margin:0">Every scheduled agent has timeline data.</p>'}</div>` : '';
  const ign = state.ignored.size ? `<p class="hint">${plural(state.ignored.size, 'name')} marked as not needed. <button class="linkbtn" id="unignore">Show again</button></p>` : '';
  el.innerHTML = unmatched + note + ign;
}
function emptyCard(t, s) { return `<div class="card empty"><b>${esc(t)}</b>${esc(s)}</div>`; }

// ---- preview
function teamRows(shown) {
  const groups = [...DEP_ORDER, ...new Set(shown.map(m => m.p.team).filter(t => !DEP_ORDER.includes(t)))];
  const row = (label, title, L) => {
    const avgs = L.map(m => m.avg).filter(v => v != null), ahts = L.map(m => m.aht).filter(v => v != null), deds = L.filter(m => m.inDed);
    const a = avgs.length ? avgs.reduce((x, y) => x + y, 0) / avgs.length : null, below = avgs.filter(v => v < state.settings.target).length;
    return `<tr><td title="${esc(title)}">${esc(label)}</td><td class="r num">${L.length}</td><td class="r num ${a != null && a < state.settings.target ? 'bad' : ''}">${pct(a)}</td><td class="r num ${below ? 'bad' : ''}">${below}</td><td class="r num">${mss(ahts.length ? ahts.reduce((x, y) => x + y, 0) / ahts.length : null)}</td><td class="r num">${deds.length ? deds.reduce((x, m) => x + m.ded, 0).toLocaleString('en-US') : '–'}</td></tr>`;
  };
  return groups.map(g => [g, shown.filter(m => m.p.team === g)]).filter(([, L]) => L.length).map(([g, L]) => row(g, DEP_NAMES[g] || g, L)).join('') + row('All', 'Everyone in the reports', shown);
}
const BINS = [[0, 0.9, 'Under 90%'], [0.9, 0.95, '90–95%'], [0.95, 0.97, '95–97%'], [0.97, 0.99, '97–99%'], [0.99, 9, '99% and up']];
function renderPreview() {
  const el = $('preview');
  if (!state.ctx) { el.innerHTML = emptyCard('Nothing to preview yet', 'Drop the exports on Import to see adherence, AHT and deduction minutes here before you build.'); return; }
  const M = state.model, shown = M.filter(m => m.shown), hidden = M.filter(m => !m.shown), set = state.settings;
  const avgs = shown.map(m => m.avg).filter(v => v != null), mean = avgs.length ? avgs.reduce((x, y) => x + y, 0) / avgs.length : null;
  const below = avgs.filter(v => v < set.target).length, dedP = shown.filter(m => m.inDed), dedSum = dedP.reduce((x, m) => x + m.ded, 0);
  const hasDed = !!(state.slots.schedule && state.slots.timeline);
  const scope = `${set.dedBrands.join(', ') || 'no brand'} · ${set.dedTeams.join(', ') || 'no team'}`;
  const tiles = [
    [shown.length, 'people in the reports', `of ${rosterRows().length} on the roster`, false],
    [pct(mean), 'average adherence', `target ${pct(set.target, 0)}`, mean != null && mean < set.target],
    [below, 'below target', 'people with Avr. under target', below > 0],
    [hasDed ? dedSum.toLocaleString('en-US') : '–', 'deduction minutes', hasDed ? `${plural(dedP.length, 'person', 'people')} in ${scope}` : 'needs Schedule and Timeline', false],
    [hidden.length, 'hidden inactive', `Inactive under ${set.inactiveMin} days`, false],
  ];
  const counts = BINS.map(([lo, hi]) => avgs.filter(v => v >= lo && v < hi).length), mx = Math.max(1, ...counts);
  const hist = `<div class="hist" role="img" aria-label="Adherence distribution: ${BINS.map(([, , l], i) => `${l}: ${counts[i]}`).join(', ')}">${BINS.map(([lo, hi, l], i) =>
    `<div class="hcol" data-tt="${esc(l)}: ${plural(counts[i], 'person', 'people')}"><div class="hbar" style="height:${counts[i] ? Math.max(2, counts[i] / mx * 100) : 0}%"><em>${counts[i]}</em></div></div>`).join('')}</div>
    <div class="hlab">${BINS.map(([lo, hi, l]) => `<span class="${hi <= set.target + 1e-9 ? 'under' : ''}">${esc(l)}</span>`).join('')}</div>`;
  const top = dedP.filter(m => m.ded > 0).sort((a, b) => b.ded - a.ded).slice(0, 10), tmx = Math.max(1, ...top.map(m => m.ded));
  const topHtml = !hasDed ? '<p class="subtle">Add the Schedule and Agent Status Timeline exports to see deductions.</p>'
    : !top.length ? `<p class="subtle">No deduction minutes for ${esc(scope)} this month.</p>`
    : `<div class="hbars">${top.map(m => `<button class="hb" data-open="${esc(m.p._id)}" data-agent="${esc(m.p._id)}"><span class="nm" dir="auto">${esc(m.exp)}</span><span class="track"><span class="fill" style="display:block;width:${m.ded / tmx * 100}%"></span></span><span class="v">${m.ded}</span></button>`).join('')}</div>`;
  el.innerHTML = `
    <div class="tiles">${tiles.map(([b, l, s, alert]) => `<div class="tile ${alert ? 'alert' : ''}"><span class="tl">${esc(l)}</span><b>${esc(b)}</b><span class="ts">${esc(s)}</span></div>`).join('')}</div>
    <div class="banner info">${state.attRes ? `Attendance from ${plural(state.attFiles.length, 'file')} is in: attended days come from it, and it fills the Attendance sheet and the incentive file.` : 'No attendance files yet, so attended days come from adherence. Drop the supervisors\' attendance files on Import to fill the Attendance sheet.'}</div>
    <div class="grid2">
      <div class="card"><h2>By team</h2><p class="cap">People in the reports. Same totals as the Overview sheet.</p>
        <div style="overflow-x:auto"><table class="teamtab"><thead><tr><th>Team</th><th class="r">People</th><th class="r">Avg adherence</th><th class="r">Below target</th><th class="r">Avg AHT</th><th class="r">Deduction (min)</th></tr></thead><tbody>${teamRows(shown)}</tbody></table></div></div>
      <div class="card"><div class="sechead"><h2>Adherence distribution</h2><span class="spacer"></span>${avgs.length ? '<button class="btn sm" data-adhall><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Daily adherence, everyone</button>' : ''}</div><p class="cap">Monthly Avr. per person. Red labels are under the ${pct(set.target, 0)} target.</p>${avgs.length ? hist : '<p class="subtle">Add the Monthly Adherence export to see this.</p>'}</div>
    </div>
    <div class="grid2 top">
      <div class="card"><h2>Most deduction minutes</h2><p class="cap">Top ${top.length || 10} in ${esc(scope)}. Select a name for the day-by-day view.</p>${topHtml}</div>
      <div class="card"><h2>Hidden from the reports</h2><p class="cap">Inactive with fewer than ${set.inactiveMin} attended days. They stay in the Roster sheet.</p>
        ${hidden.length ? `<ul class="ilist">${hidden.map(m => `<li><button class="linkbtn nm" data-open="${esc(m.p._id)}" data-agent="${esc(m.p._id)}" dir="auto">${esc(m.exp)}</button><span class="sg">${esc(m.p.team || '')} · ${plural(m.attended, 'day')}</span></li>`).join('')}</ul>` : '<p class="subtle">Nobody is hidden.</p>'}</div>
    </div>
    ${perfCardHtml(shown)}
    ${wfCardHtml(shown)}
    ${employeesHtml()}`;
  reveal(el);
}

// ---- person drawer
function renderPerson() {
  const p = state.roster.find(x => x._id === state.personId);
  if (!p) { closeDrawer(); return; }
  if (state.ws !== 'build' || !isBuilder()) { renderPersonWs(p); return; }
  const m = state.byId.get(p._id), set = state.settings, Y = state.y, Mo = state.m, ND = Core.daysIn(Y, Mo);
  const pp = effP(p._id) || p, exp = gname(pp) || 'New person';
  $('h-person').textContent = exp;
  $('personSub').textContent = [`National ID ${Core.cleanId(pp.nid) || 'missing'}`, p.brand, p.team ? `${p.team} (${DEP_NAMES[p.team] || p.team})` : ''].filter(Boolean).join(' · ');
  // keep the focus where it was across the re-render
  const ae = document.activeElement, keep = ae && $('personBody').contains(ae) ? ['pf', 'phm', 'psw'].map(k => (ae.dataset && ae.dataset[k] != null ? `[data-${k}${k === 'psw' ? '' : `="${ae.dataset[k]}"`}]` : null)).find(Boolean) : null;
  const put = html => { $('personBody').innerHTML = html; if (keep) { const el = $('personBody').querySelector(keep); if (el) el.focus({ preventScroll: true }); } };
  let h = profileHtml(p);
  if (!m) { put(h + `<div class="banner info">${state.ctx ? (normSpace(p.name) ? 'Not found in this month\'s exports. Check the Genesys name above.' : 'Type a name first, so this person can be matched.') : 'Drop the exports on Import to see this month\'s numbers.'}</div>` + (normSpace(p.name) ? agentHistoryHtml(p) + formsListHtml(p._id) : '')); return; }
  h += `<div class="pexp">${badgesCell(p)}<span class="hint">Found in these exports</span></div>`;
  if (!m.shown) h += `<div class="banner">Left out of the reports: Inactive with ${plural(m.attended, 'attended day')} (limit ${set.inactiveMin}). Attendance typed in Excel can bring them back.</div>`;
  h += `<div class="minis"><div><b>${pct(m.avg)}</b><span>Adherence Avr.</span></div><div><b>${m.adh ? m.days : '–'}</b><span>Days counted</span></div><div><b>${mss(m.aht)}</b><span>AHT (m:ss)</span></div><div><b>${m.inDed ? m.ded : '–'}</b><span>${m.inDed ? 'Deduction (min)' : 'Not in deduction scope'}</span></div></div>`;
  h += kpiCardHtml(p._id) + perfSectionHtml(m) + wfSectionHtml(m) + agentHistoryHtml(p) + formsListHtml(p._id);
  const wd = d => Core.weekday(Y, Mo, d);
  const rawRow = m.adh ? (state.ctx.rawAdh.find(x => normName(x.name) === m.ek) || { days: [] }).days : [];
  h += `<section class="sec"><div class="sechead"><h3>Daily adherence</h3><span class="spacer"></span>${m.adh || m.sch || m.wfDays ? '<button class="btn sm" data-adhexport><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Export day by day</button>' : ''}</div>${m.adh ? `<div class="strip">${Array.from({ length: ND }, (_, i) => { const v = m.adh[i]; const raw = rawRow[i];
      return `<div class="${v == null ? 'na' : v < set.target ? 'low' : 'ok'}" title="${wd(i + 1)} ${i + 1} ${MON[Mo - 1]}: ${v == null ? (raw == null ? 'blank' : pct(raw) + ' (under the NA cut-off)') + ', NA' : pct(v)}"><small>${i + 1}</small><b>${v == null ? 'NA' : v >= 0.99995 ? '100' : (v * 100).toFixed(2)}</b></div>`; }).join('')}</div>`
    : `<p class="subtle">${m.files.adh ? 'Not found in the Monthly Adherence export. Check the Genesys name above.' : 'Add the Monthly Adherence export to see this.'}</p>`}</section>`;
  const dedNote = !m.files.sch || !m.files.tl ? `Add the Schedule and Agent Status Timeline exports to see this. ${GX.schedule} ${GX.timeline}`
    : !m.found.sch ? `Not found in the Schedule export. ${schedCover()} ${GX.schedule}` : '';
  h += `<section class="sec"><h3>Sched. / Actual / Diff (min)</h3>${!m.inDed ? `<p class="subtle" style="margin:0 0 8px">${m.shown ? `Not in the deduction scope (${esc(set.dedBrands.join(', ') || 'no brand')} · ${esc(set.dedTeams.join(', ') || 'no team')}), so not in the Deduction sheet.` : 'Hidden, so not in the Deduction sheet.'}</p>` : ''}${dedNote ? `<p class="subtle">${esc(dedNote)}</p>` : `<div class="dedtab"><table><thead><tr><th></th>${Array.from({ length: ND }, (_, i) => `<th title="${wd(i + 1)}">${i + 1}<br><span class="subtle" style="font-weight:400">${wd(i + 1).slice(0, 2)}</span></th>`).join('')}<th>Total</th></tr></thead><tbody>
      <tr><td>Sched.</td>${Array.from({ length: ND }, (_, i) => `<td class="num">${m.sch && m.sch[i] != null ? m.sch[i] : ''}</td>`).join('')}<td></td></tr>
      <tr><td>Actual</td>${Array.from({ length: ND }, (_, i) => `<td class="num">${m.act && m.act[i] != null ? m.act[i] : ''}</td>`).join('')}<td></td></tr>
      <tr><td><b>Diff</b></td>${m.diff.map(v => `<td class="num ${v > 0 ? 'hot' : ''}">${v == null ? '' : v}</td>`).join('')}<td class="num"><b>${m.diff.reduce((x, y) => x + (y || 0), 0)}</b></td></tr></tbody></table></div>`}</section>`;
  h += attStripHtml(p._id);
  put(h);
}

// ---- export
function canBuild() { return state.rosterReady && rosterRows().length > 0 && (allDets().length > 0 || state.attFiles.length > 0) && !state.pending.length; }
function buildBlocker() { return !state.rosterReady ? 'Waiting for the roster' : !rosterRows().length ? 'The roster is empty' : state.pending.length ? 'Still reading files' : 'Drop at least one export first'; }
function sheetList() {
  const has = k => !!state.slots[k], M = state.model || [], shown = M.filter(m => m.shown);
  return [
    ['Monthly Summary', 'Adherence, AHT, attendance totals and deduction per person', true, shown.length],
    ['Overview', 'Totals per team, hidden people and data checks', true, null],
    ['Attendance', state.attRes ? 'Month grid filled from the attendance files, with tardy minutes' : 'Empty month grid with the roster names, for you to fill in Excel', true, rosterRows().length],
    ['Adherence Detail', 'Daily adherence with Status, NA under the cut-off, and Avr.', has('adhGenesys'), shown.filter(m => m.adh).length],
    ['Average Adherence', 'Name, Dep and monthly adherence, red under target', has('adhGenesys'), shown.filter(m => m.adh).length],
    ['AHT', 'Average handle time per agent (m:ss)', has('aht'), shown.filter(m => m.aht != null).length],
    ['Deduction', 'Book22 layout: Sched. / Actual / Diff per day, Total, Review Notes', has('schedule') && has('timeline'), shown.filter(m => m.inDed).length],
    ['Roster', 'Same layout as before. Change a Status here and the tables follow', true, rosterRows().length],
    ['Settings and raw data', 'Settings, Raw Adherence, Raw AHT, Raw Schedule, Raw Actual', true, null],
  ];
}
const sheetsHtml = withCounts => sheetList().map(([n, d, on, c]) => `<div class="sheet ${on ? '' : 'off'}"><b>${esc(n)}${withCounts && on && c != null ? ` <span class="pill">${plural(c, 'row')}</span>` : ''}</b><span>${esc(on ? d : 'Empty: needs its export')}</span></div>`).join('');
function renderExport() {
  const R = rosterRows(), n = nSlots(), miss = KINDS.filter(k => !state.slots[k.kind]).map(k => k.title), iss = state.issues.length;
  const warnSlots = KINDS.filter(k => { const v = slotView(k.kind); return v && (v.bad || v.warns.length); });
  const item = (cls, mark, html) => `<li><span class="ck ${cls}" aria-hidden="true">${mark}</span><span>${html}</span></li>`;
  const ok = (h) => item('ok', '<svg width="12" height="12"><use href="#i-check"/></svg>', h), wa = (h) => item('wa', '<svg width="12" height="12"><use href="#i-bang"/></svg>', h), no = (h) => item('no', '<svg width="12" height="12"><use href="#i-dash"/></svg>', h);
  $('checklist').innerHTML = [
    !state.rosterReady ? no('Loading the roster…') : R.length ? ok(`<b>${plural(R.length, 'person', 'people')}</b> on the roster`) : wa('The roster is empty. <button class="linkbtn" data-go="review">Add people</button>'),
    n === 4 ? ok('All <b>4 exports</b> loaded') : n ? wa(`<b>${n} of 4</b> exports loaded. Missing: ${esc(miss.join(', '))}. <button class="linkbtn" data-go="import">Add files</button>`) : no('No exports yet. <button class="linkbtn" data-go="import">Go to Import</button>'),
    !state.ctx ? no('Names are checked after the exports are loaded') : iss ? wa(`<b>${plural(iss, 'name')}</b> in the exports ${iss === 1 ? 'is' : 'are'} not on the roster and will be left out. <button class="linkbtn" data-go="issues">Review</button>`) : ok('Every export name matches the roster'),
    warnSlots.length ? wa(`Notes on ${esc(warnSlots.map(k => k.title).join(', '))}. <button class="linkbtn" data-go="import">See Import</button>`) : n ? ok('No warnings on the files') : '',
    ok(`Month: <b>${MONTH_LONG[state.m - 1]} ${state.y}</b> ${state.monthManual ? '(set by you)' : n ? '(from the exports)' : ''} <button class="linkbtn" data-go="settings">Change</button>`),
  ].join('');
  $('fileName').textContent = fileNameOut();
  const ready = canBuild();
  $('build').disabled = !ready || state.building;
  $('buildNote').textContent = ready ? 'The file is saved to your computer after you confirm.' : buildBlocker() + '.';
  $('sheets').innerHTML = sheetsHtml(!!state.ctx);
  renderIncExport();
  $('sheets').closest('.card').hidden = !!freshBuild();
  const sc = $('success');
  sc.classList.remove('success', 'building', 'failed', 'sweep');
  if (state.building) {   // honest progress: no percentage the tool cannot measure; the words say what is happening
    sc.hidden = false; sc.classList.add('building');
    sc.innerHTML = `<div class="bstate"><h2>Building ${esc(fileNameOut())}…</h2><p class="hint">Writing the nine sheets and their formulas on this computer. Nothing is sent or uploaded.</p></div><div class="progress ind" role="progressbar" aria-label="Building the workbook" aria-busy="true"><i></i></div>`;
  } else if (state.buildErr && !state.built) {
    sc.hidden = false; sc.classList.add('failed');
    sc.innerHTML = `<div class="bstate"><h2><svg class="sti" aria-hidden="true"><use href="#i-alert"/></svg>Not saved</h2><p class="hint">${esc(state.buildErr)} Nothing was sent or uploaded.</p></div><button class="btn" id="buildAgain">Try again</button>`;
  } else if (state.built) {
    const b = state.built, stale = b.ver !== state.ver;
    sc.hidden = false; sc.classList.toggle('success', !stale); if (state.builtNew && !stale) { sc.classList.add('sweep'); state.builtNew = false; }
    sc.innerHTML = `<div class="bsrow"><div class="bstate">${stale ? '<h2><svg class="sti" aria-hidden="true"><use href="#i-alert"/></svg>Changed since build</h2>' : '<h2><svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Workbook saved</h2>'}<p class="hint">${stale ? `${esc(b.filename)} was saved at ${esc(b.at)}, before your latest changes. Build again to include them.` : `Saved ${esc(b.filename)} at ${esc(b.at)}. Nothing was sent or uploaded.`}</p></div><div class="bsact"><button class="btn ${stale ? 'primary' : ''}" id="buildAgain">Build again</button><small>Makes a new file with the page as it is now.</small></div></div>
      ${stale ? '' : `<div class="sheets" style="margin-top:12px">${b.sheets}</div><p class="hint" style="margin-top:10px">Next: open it in Excel and paste the attendance into the Attendance sheet. The steps are below.</p>`}`;
  } else sc.hidden = true;
}

// ---------------------------------------------------------------- build + save
async function build() {
  if (!canBuild() || state.building) return;
  state.building = true; state.buildErr = ''; renderHeader(); if (state.step !== 'export') setStep('export'); else renderExport();
  const btns = [$('build'), $('buildTop')]; const labels = btns.map(b => b.innerHTML);
  btns.forEach(b => { b.innerHTML = '<span class="spin" aria-hidden="true"></span>Building…'; });
  try {
    await new Promise(r => setTimeout(r, 30));
    const ctx = state.ctx || Glue.makeContext(allDets(), rosterRows(), state.settings, state.y, state.m);
    ctx.logo = await xlLogo();
    const bytes = await Writer2.build(ctx);
    const filename = fileNameOut();
    const c = await saveRaw(filename, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    if (c === 'ok') {
      state.built = { ver: state.ver, filename, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), sheets: sheetsHtml(true) }; state.builtNew = true;
      toast(`Saved ${filename}. Nothing was sent or uploaded.`);
    } else { state.buildErr = saveMsg(c, filename); toast(state.buildErr); }
  } catch (e) { state.buildErr = 'Could not build the file: ' + (e && e.message ? e.message : e); toast(state.buildErr); }
  finally {
    state.building = false; btns.forEach((b, i) => { b.innerHTML = labels[i]; });
    if (state.step !== 'export') setStep('export'); else render();
  }
}
let downloadsP = null;
async function saveRaw(filename, blob) {
  if (window.claude && typeof window.claude.use === 'function') {
    downloadsP = downloadsP || window.claude.use('downloads');
    let dl = null; try { dl = await downloadsP; } catch (e) { dl = null; }
    if (!dl) return 'unavailable';
    try { await dl.save({ filename, data: blob }); return 'ok'; } catch (e) { return (e && e.code) || 'error'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return 'ok';
}
function saveMsg(c, filename) {
  return c === 'ok' ? `Saved ${filename}` : c === 'declined' ? 'Save cancelled.' : c === 'rate_limited' ? 'A save prompt is already open.' : c === 'unavailable' ? 'Saving files is not available in this view.' : 'The file could not be saved (' + c + ').';
}
async function save(filename, blob) { const c = await saveRaw(filename, blob); toast(saveMsg(c, filename)); return c === 'ok'; }

// ---------------------------------------------------------------- roster import / export
function rosterCsv() {
  const cell = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['Name', 'National ID', 'Brand', 'Team', 'System name', 'Status', 'Supervisor', 'Email', 'Incentive base'], ...rosterRows().map(p => [p.name, p.nid, p.brand, p.team, p.sys, p.status || 'Active', supName(p.spv) || '', p.email || '', p.base || ''])];
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
async function importRosterFile(file) {
  toast(`Reading ${file.name}…`);
  let dets;
  try { dets = await parse(file.name, await file.arrayBuffer()); } catch (e) { toast(`Could not read ${file.name}.`); return; }
  const r = dets.find(d => d.kind === 'roster');
  if (!r || !r.data.length) { toast(`No roster found in ${file.name}. It needs a header row with Name and National ID.`); return; }
  prepareMerge(r.data, file.name);
}
let mergePlan = null;
function prepareMerge(rows, src) {
  $('h-confirm').textContent = 'Import roster';
  const byId = new Map(), byName = new Map();
  for (const p of state.roster) { const id = Core.cleanId(p.nid); if (id) byId.set(id, p); for (const n of [p.name, p.sys]) if (normSpace(n) && !byName.has(normName(n))) byName.set(normName(n), p); }
  for (const p of state.roster) for (const n of akaOf(p)) if (!byName.has(normName(n))) byName.set(normName(n), p);
  const plan = { adds: [], updates: [], same: 0, src };
  const seen = new Set();
  for (const x of rows) {
    const name = normSpace(x.name); if (!name) continue;
    const inc = { name, nid: x.id || '', brand: x.team || '', team: x.dep || '', sys: normSpace(x.sys), status: x.status || '', email: x.email || '', base: x.base || null, spvName: x.spvName || '' };
    const cur = (inc.nid && byId.get(inc.nid)) || byName.get(normName(name)) || (inc.sys && byName.get(normName(inc.sys)));
    if (cur && seen.has(cur._id)) continue;
    if (!cur) { const { spvName, ...rest } = inc; plan.adds.push({ ...rest, brand: inc.brand || 'Virgin', team: inc.team || 'CC', status: inc.status || 'Active', ...(inc.base ? {} : { base: undefined }) }); if (spvName) (plan.sup = plan.sup || []).push([name, spvName]); continue; }
    seen.add(cur._id);
    const patch = {};
    for (const f of ['name', 'nid', 'brand', 'team', 'sys', 'status', 'email']) if (inc[f] && normSpace(cur[f]) !== inc[f] && !(f === 'nid' && Core.cleanId(cur.nid) === inc.nid)) patch[f] = inc[f];
    if (inc.base && +cur.base !== inc.base) patch.base = inc.base;
    if (inc.spvName && normName(supName(cur.spv)) !== normName(inc.spvName)) (plan.sup = plan.sup || []).push([cur.name, inc.spvName]);
    if (Object.keys(patch).length) plan.updates.push({ id: cur._id, name: cur.name, patch }); else if (!(inc.spvName && normName(supName(cur.spv)) !== normName(inc.spvName))) plan.same++;
  }
  mergePlan = plan;
  const total = plan.adds.length + plan.updates.length + (plan.sup ? plan.sup.length : 0);
  const lim = (list, f) => list.slice(0, 8).map(f).join('') + (list.length > 8 ? `<li class="subtle">and ${list.length - 8} more</li>` : '');
  $('confirmBody').innerHTML = `<p style="margin:0">From <b>${esc(src)}</b>: ${plural(rows.length, 'person', 'people')}.</p>
    <div class="minis"><div><b>${plan.adds.length}</b><span>new</span></div><div><b>${plan.updates.length}</b><span>updated</span></div><div><b>${plan.same}</b><span>unchanged</span></div><div><b>${rosterRows().length}</b><span>on the roster now</span></div></div>
    ${plan.adds.length ? `<section class="sec"><h3>New</h3><ul class="ilist">${lim(plan.adds, a => `<li><span class="nm" dir="auto">${esc(a.name)}</span><span class="sg">${esc(a.brand)} · ${esc(a.team)}</span></li>`)}</ul></section>` : ''}
    ${plan.updates.length ? `<section class="sec"><h3>Updated</h3><ul class="ilist">${lim(plan.updates, u => `<li><span class="nm" dir="auto">${esc(u.name)}</span><span class="sg">${esc(Object.entries(u.patch).map(([k, v]) => `${{ nid: 'ID', sys: 'system name' }[k] || k}: ${v}`).join(', '))}</span></li>`)}</ul></section>` : ''}
    <p class="hint">People on the roster who are not in the file stay as they are. Empty cells in the file do not clear anything. Tip: use Export roster first to keep a backup.</p>`;
  $('confirmOk').disabled = !total; $('confirmOk').textContent = total ? `Import ${plural(total, 'change')}` : 'Nothing to import';
  openDrawer('dConfirm');
}
function applyMerge() {
  const plan = mergePlan; if (!plan) return;
  if (plan.dist) { const n = applyDistribution(plan.dist.plan); mergePlan = null; closeDrawer(); $('h-confirm').textContent = 'Import roster'; toast(`Supervisors updated for ${plural(n, 'person', 'people')} from ${plan.src}`); return; }
  for (const u of plan.updates) updatePerson(u.id, u.patch, { quiet: true });
  let order = state.roster.reduce((a, p) => Math.max(a, p.order ?? 0), 0);
  for (const a of plan.adds) { const { base, ...rest } = a; addPerson({ ...rest, ...(base ? { base } : {}), order: ++order }, { quiet: true }); }
  if (plan.sup && plan.sup.length) { const d = planDistribution(plan.sup); for (const x of d.plan) if (x.was !== x.spv) updatePerson(x.pid, { spv: x.spv }, { quiet: true }); }
  state.roster.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
  if (!state.db && !state.rosterReady) state.rosterReady = true;
  state.rosterMsg = '';
  mergePlan = null; closeDrawer(); refresh();
  toast(`Roster updated: ${plan.adds.length} new, ${plan.updates.length} updated`);
}



// ================================================================ STAGE 1: attendance files, notifications, incentive, final emails, logo, forms
// ---------------------------------------------------------------- attendance files (supervisors' sheets)
const attDets = () => state.attFiles.flatMap(f => f.dets);
const monthKey = () => `${state.y}-${String(state.m).padStart(2, '0')}`;
let attLoadedFor = null;
async function loadAttState() {
  if (!state.db) return;
  const k = monthKey(); if (attLoadedFor === k) return; attLoadedFor = k;
  state.attUndo = new Set(); state.attPicks = new Map();
  try {
    const s = await state.db.doc('att/' + k).get();
    if (s.exists && attLoadedFor === k) {
      const d = s.data() || {};
      state.attUndo = new Set(Array.isArray(d.undo) ? d.undo.filter(x => typeof x === 'string') : []);
      state.attPicks = new Map((Array.isArray(d.picks) ? d.picks : []).filter(x => x && typeof x.k === 'string').map(x => [x.k, x.v]));
      if (state.attFiles.length) refresh();
    }
  } catch (e) { /* defaults stay */ }
}
function persistAtt() {
  if (!state.db) return;
  const k = monthKey(), body = { undo: [...state.attUndo], picks: [...state.attPicks].map(([a, b]) => ({ k: a, v: b })) };
  queueWrite('att/' + k, () => state.db.doc('att/' + k).set(body));
}
function persistLinks() {
  if (!state.db) return;
  const body = { links: [...state.attLinks].map(([n, pid]) => ({ n, pid })) };
  queueWrite('config/attLinks', () => state.db.doc('config/attLinks').set(body));
}
function placeAttendance(it, dets) {
  const list = dets.filter(d => d.kind === 'attendance' && d.data).map(d => ({ ...d, file: it.name, _uid: ++uid }));
  if (!list.length) return false;
  state.attFiles = state.attFiles.filter(f => f.name !== it.name);
  state.attFiles.push({ fid: it.fid, name: it.name, size: it.size, dets: list });
  return true;
}
const attOf = pid => (state.attRes && state.attRes.byPerson.get(pid)) || null;
function effRoster() { return state.ctx ? state.ctx.roster : rosterRows(); }


// ---------------------------------------------------------------- IDs file: keeps the roster's National IDs, brands and teams in line with HR's list
function idsRowsOf(det) {
  return (det.data || []).map(r => ({ id: Core.cleanId(r.id) || '', name: normSpace(r.name), brand: normSpace(r.team), team: normSpace(r.dep) })).filter(r => r.name);
}
const looksLikeIds = det => { const rows = idsRowsOf(det); return rows.length >= 3 && rows.filter(r => r.id.length >= 8).length >= rows.length * 0.6 && !(det.data || []).some(r => normSpace(r.status) || normSpace(r.sys)); };   // a full roster (with Status or system names) is imported as a roster instead
function placeIds(it, det) {
  const rows = idsRowsOf(det);
  state.idsFile = { name: it.name, at: new Date().toISOString(), rows, keep: state.idsFile && state.idsFile.name === it.name ? state.idsFile.keep || [] : [] };
  state.idsAuto = true; persistIds();
}
function persistIds() { if (!state.db) return; const F = state.idsFile; queueWrite('config/ids', () => (F ? state.db.doc('config/ids').set(F) : state.db.doc('config/ids').delete())); }
function idSync() {
  const F = state.idsFile; if (!F) return null;
  const R = rosterRows(), byId = new Map(), byName = new Map(), keep = new Set(F.keep || []);
  R.forEach(p => { const id = Core.cleanId(p.nid); if (id && !byId.has(id)) byId.set(id, p); [p.name, p.sys].forEach(n => { const k = normName(n); if (k && !byName.has(k)) byName.set(k, p); }); });
  R.forEach(p => akaOf(p).forEach(n => { const k = normName(n); if (k && !byName.has(k)) byName.set(k, p); }));   // a name the person had before still finds them
  const out = { match: 0, fills: [], fuzzy: [], clashes: [], diffs: [], notOn: [], missing: [] }, seen = new Set();
  for (const r of F.rows) {
    let p = r.id && byId.get(r.id), how = 'id';
    if (!p) { p = byName.get(normName(r.name)); how = 'name'; }
    if (!p) {
      let best = null, bs = 0, second = 0;
      for (const q of R) { if (seen.has(q._id)) continue; const sc = Math.max(Core.nameScore(r.name, q.name), q.sys ? Core.nameScore(r.name, q.sys) : 0, ...akaOf(q).map(a => Core.nameScore(r.name, a))); if (sc > bs) { second = bs; bs = sc; best = q; } else if (sc > second) second = sc; }
      if (best && bs >= 0.8 && bs - second >= 0.1 && !Core.cleanId(best.nid)) { p = best; how = 'fuzzy'; }
    }
    if (!p) { out.notOn.push(r); continue; }
    seen.add(p._id);
    const pid = Core.cleanId(p.nid);
    if (how === 'id') out.match++;
    else if (how === 'fuzzy') { if (!keep.has(`fuzzy:${p._id}:${r.id}`)) out.fuzzy.push({ p, r }); }
    else if (!pid && r.id) out.fills.push({ p, r });
    else if (r.id && pid !== r.id && !keep.has(`clash:${p._id}:${r.id}`)) out.clashes.push({ p, r, rosterId: pid });
    else out.match++;
    const fb = BRANDS.includes(r.brand) ? r.brand : '', ft = DEP_ORDER.includes(r.team) ? r.team : '';
    const db = fb && fb !== normSpace(p.brand), dt = ft && ft !== normSpace(p.team);
    if ((db || dt) && !keep.has(`diff:${p._id}:${fb}|${ft}`)) out.diffs.push({ p, r, brand: fb || p.brand, team: ft || p.team, key: `diff:${p._id}:${fb}|${ft}` });
  }
  out.missing = R.filter(p => p.status !== 'Inactive' && !seen.has(p._id));
  return out;
}
/** safe fixes, made once when the IDs file arrives: an empty National ID on the roster takes the ID from the file (same name) */
function applyIdFills(sync) {
  const keep = new Set(state.idsFile.keep || []), list = sync.fills.filter(f => !state.idsUndo.has(f.p._id) && !keep.has('nofill:' + f.p._id));
  if (!list.length) return 0;
  for (const f of list) {
    const prev = f.p.nid || '';
    updatePerson(f.p._id, { nid: f.r.id }, { quiet: true });
    state.idsLog.push({ key: 'idfill:' + f.p._id, pid: f.p._id, prev, text: `${f.p.name}: National ID ${f.r.id} added from ${state.idsFile.name}` });
  }
  return list.length;
}
function keepIds(key) { const F = state.idsFile; if (!F) return; F.keep = [...new Set([...(F.keep || []), key])]; persistIds(); }
function renderIdsCard() {
  const el = $('idsCard'), F = state.idsFile, S = state.idSync;
  el.hidden = !F; if (!F) return;
  const open = S ? S.fuzzy.length + S.clashes.length + S.diffs.length + S.notOn.length : 0;
  el.innerHTML = `<div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-check"/></svg></span><h3>IDs file</h3></div>${open ? `<span class="pill warn">${plural(open, 'item')} to check</span>` : '<span class="pill good">Roster in line</span>'}</div>
    <div class="fname" dir="auto">${esc(F.name)}</div><div class="meta">${plural(F.rows.length, 'person', 'people')} · kept with the page, so it is used every month until you drop a newer one</div>
    <div class="kv"><div><b>${S ? S.match : 0}</b><span>match the roster</span></div><div><b>${state.idsLog.length}</b><span>IDs added</span></div><div><b>${open}</b><span>to check</span></div><div><b>${S ? S.missing.length : 0}</b><span>on the roster, not in the file</span></div></div>
    <div class="acts"><button class="btn sm ${open ? 'primary' : ''}" id="idsNotes">Open the checks</button><button class="btn sm ghost" id="idsRemove">Remove</button></div>`;
}

// ---------------------------------------------------------------- notifications (the bell)
function fixLabel(id) { return state.fixText.get(id) || id.replace(/^[a-z]+:/, ''); }
function computeNotes() {
  const out = [], R = state.attRes, c = state.ctx, set = state.settings, Ml = MON[state.m - 1];
  const add = n => out.push(n);
  if (R) {
    for (const f of R.fixes) state.fixText.set(f.id, f.text);
    for (const cl of R.clashes) {
      const tardy = cl.kind === 'tardy';
      add({ id: 'pick:' + cl.key, sev: cl.chosen !== undefined ? 'done' : 'decide', group: 'Attendance',
        title: tardy ? `${cl.name}: which tardy total?` : `${cl.name}, ${cl.day} ${Ml}: the files disagree`,
        body: tardy ? `${cl.text}. Day cells are used until you choose.` : 'Until you choose, the value from the file where this person has the most days is used.', pick: cl });
    }
    for (const f of R.fixes) add({ id: 'fix:' + f.id, sev: 'fixed', group: f.kind === 'tabs' || f.kind === 'dates' ? 'Attendance files' : 'Attendance', title: f.text + (f.count > 1 ? ` (${f.count.toLocaleString('en-US')} cells)` : ''), undo: f.undoable ? f.id : null });
    for (const fid of state.attUndo) if (!R.fixes.some(f => f.id === fid)) add({ id: 'undone:' + fid, sev: 'info', group: 'Attendance', title: `Undone: ${fixLabel(fid)}`, redo: fid });
    R.unmatched.forEach((u, i) => add({ id: 'unm:' + normName(u.name), sev: 'warn', group: 'Attendance', title: `Not on the roster: ${u.name}`,
      body: `${u.idRaw ? 'ID ' + u.idRaw + ' · ' : ''}${u.src} · ${plural(u.filled, 'day')} filled. This attendance is left out until you add or link the person.`, unm: i }));
    for (const w of R.warns) add({ id: 'w:' + w.text, sev: 'warn', group: 'Attendance', title: w.text });
    if (R.cross.length) add({ id: 'cross', sev: 'warn', group: 'Attendance vs Genesys', title: `${plural(R.cross.length, 'day')} where the attendance and Genesys disagree`, body: 'Check these with the supervisors. Nothing was changed.', list: R.cross.map(x => x.text) });
    if (R.missing.length) add({ id: 'missing', sev: 'info', group: 'Attendance', title: `${plural(R.missing.length, 'active person', 'active people')} with no attendance in any file`, body: 'They show with ⚠ in the incentive Attendance Report. Drop their supervisor\'s file, or fill them in Excel.', list: R.missing.map(p => `${p.name} (${p.team || '–'})`) });
    if (R.partial.length) add({ id: 'partial', sev: 'info', group: 'Attendance', title: `${plural(R.partial.length, 'person', 'people')} with blank days`, list: R.partial.map(p => `${p.name}: ${plural(p.blank, 'blank day')}`) });
    const skipped = R.files.filter(f => !f.used);
    if (skipped.length) add({ id: 'skipped', sev: 'info', group: 'Attendance files', title: `${plural(skipped.length, 'tab')} skipped because the dates are not ${MONTH_LONG[state.m - 1]} ${state.y}`, list: skipped.map(f => `${f.file} · ${f.sheet}: ${f.reason}`) });
  }
  const S = state.idSync, Fi = state.idsFile;
  if (S && Fi) {
    for (const l of state.idsLog) add({ id: 'ids:' + l.key, sev: 'fixed', group: 'IDs file', title: l.text, idsUndo: l.pid });
    for (const f of S.fuzzy) add({ id: `ids:fuzzy:${f.p._id}`, sev: 'decide', group: 'IDs file', title: `Same person? "${f.r.name}" (ID ${f.r.id}) in the IDs file looks like "${f.p.name}" on the roster`, body: 'Yes adds the ID to the roster.', idsAct: [['fuzzyyes', f.p._id, f.r.id, 'Yes, same person'], ['keep', `fuzzy:${f.p._id}:${f.r.id}`, '', 'No']] });
    for (const x of S.clashes) add({ id: `ids:clash:${x.p._id}`, sev: 'decide', group: 'IDs file', title: `${x.p.name}: two National IDs`, body: `The roster says ${x.rosterId}; ${Fi.name} says ${x.r.id}.`, idsAct: [['useid', x.p._id, x.r.id, `Use ${x.r.id} (IDs file)`], ['keep', `clash:${x.p._id}:${x.r.id}`, '', `Keep ${x.rosterId} (roster)`]] });
    for (const x of S.diffs) add({ id: `ids:${x.key}`, sev: 'decide', group: 'IDs file', title: `${x.p.name}: brand or team differs`, body: `Roster: ${x.p.brand || '–'} · ${x.p.team || '–'}. IDs file: ${x.brand} · ${x.team}.`, idsAct: [['usebt', x.p._id, `${x.brand}|${x.team}`, 'Use the IDs file'], ['keep', x.key, '', 'Keep the roster']] });
    S.notOn.forEach((r, i) => add({ id: `ids:noton:${r.id || normName(r.name)}`, sev: 'warn', group: 'IDs file', title: `In the IDs file but not on the roster: ${r.name}`, body: `ID ${r.id || '–'} · ${r.brand || '–'} · ${r.team || '–'}`, idsAct: [['addrow', String(i), '', 'Add to the roster']] }));
    if (S.missing.length) add({ id: 'ids:missing', sev: 'info', group: 'IDs file', title: `${plural(S.missing.length, 'active person', 'active people')} on the roster but not in the IDs file`, body: 'Often managers and support teams. Nothing was changed.', list: S.missing.map(p => `${p.name} (${p.team || '–'})`) });
  }
  const hk = Object.keys(state.history).sort();
  if (hk.length) {
    const noAdh = hk.filter(k => !state.history[k].rows.some(r => r.adh != null));
    add({ id: 'hist', sev: 'info', group: 'History', title: `${plural(hk.length, 'month')} in the history: ${ymLabel(hk[0])} to ${ymLabel(hk[hk.length - 1])}`, body: noAdh.length ? `The ${noAdh.map(ymLabel).join(', ')} file${noAdh.length > 1 ? 's have' : ' has'} no adherence values (the tabs are empty), so those months show attendance and AHT only.` : 'See Review › History, or a person\'s page.', go: 'history' });
  }
  if (state.ghistNotes && state.ghistNotes.length) add({ id: 'ghist', sev: 'info', group: 'History', title: 'Genesys exports added to the history', body: 'Deduction is only kept for agents whose schedule covers the whole month.', list: state.ghistNotes, go: 'history' });
  kpiNotes(add);
  dupNotes(add);   // the same person twice, two people on one Genesys name or National ID: with or without exports
  if (c) {
    for (const a of state.autoLinks) add({ id: 'alink:' + a.pid, sev: 'fixed', group: 'Genesys', title: `${a.roster} is "${a.name}" in Genesys`, body: 'Saved as the system name, so the exports match.', unlink: a.pid });
    sysLinkNotes(add);
    if (state.issues.length) add({ id: 'gen-unm', sev: 'warn', group: 'Genesys', title: `${plural(state.issues.length, 'name')} in the Genesys exports ${state.issues.length === 1 ? 'is' : 'are'} not on the roster`, body: 'They are left out of the reports.', go: 'issues', list: state.issues.map(x => x.name + (x.sugg ? ` – looks like ${x.sugg.name}` : x.several ? ' – several people fit' : '')) });
    if (state.slots.schedule && state.slots.timeline && c.checks.noTimeline.length) add({ id: 'notl', sev: 'warn', group: 'Genesys', title: `${plural(c.checks.noTimeline.length, 'scheduled agent')} with no status timeline`, body: 'Their Actual is 0, so their deduction is 0 every day.', list: c.checks.noTimeline });
    const multi = c.rawAht.filter(x => (x.alt || []).length > 1);
    if (multi.length) add({ id: 'ahtmulti', sev: 'info', group: 'Genesys', title: `${plural(multi.length, 'agent')} with more than one AHT row (one per media type)`, body: 'The voice AHT is used. They are marked in the incentive AHT tab.', list: multi.map(x => `${x.name}: ${x.alt.map(a => `${a.media || '?'} ${mss(a.sec)}`).join(', ')}`) });
    expDupNotes(c, add);   // one display name twice inside an export
    const inc = incModel();
    if (inc && inc.full.length) add({ id: 'incfull', sev: 'info', group: 'Incentive', title: `${plural(inc.full.length, 'person', 'people')} in the incentive Adherence tab at 100%`, body: `Team${set.incFullAdhTeams.length > 1 ? 's' : ''} ${set.incFullAdhTeams.join(', ')} ${set.incFullAdhTeams.length > 1 ? 'have' : 'has'} no Genesys adherence. Change this in Settings.`, list: inc.full.map(r => r.name) });
    const noId = inc ? inc.att.filter(r => !/^\d{6,}$/.test(r.id)).map(r => r.name) : [];
    if (noId.length) add({ id: 'noid', sev: 'warn', group: 'Roster', title: `${plural(noId.length, 'person', 'people')} in the reports without a National ID`, body: 'Add it in People. The emails and the incentive file need it.', list: noId });
  }
  return out;
}
let notesPrimed = false, lastNoteIds = new Set();
function notify() {
  const N = checkNotes(), open = N.filter(n => n.sev === 'decide' || n.sev === 'warn');   // counted as Review › Checks counts them
  const b = $('bellN'); b.textContent = open.length; b.hidden = !open.length;
  $('bell').setAttribute('aria-label', open.length ? `Notifications: ${plural(open.length, 'item')} to check` : 'Notifications');
  const fresh = open.filter(n => !lastNoteIds.has(n.id));
  lastNoteIds = new Set(N.map(n => n.id));
  if (notesPrimed && fresh.length) { $('bell').classList.remove('ping'); void $('bell').offsetWidth; $('bell').classList.add('ping'); }
  notesPrimed = true;
}
/** after files are read: one pop-up with what the checks found */
function notesSummary() {
  const N = checkNotes(), nd = N.filter(n => n.sev === 'decide').length, nw = N.filter(n => n.sev === 'warn').length;
  const nf = state.attRes ? state.attRes.fixes.reduce((t, f) => t + (f.undoable === false ? 0 : f.count), 0) : 0;
  const parts = [nf && `${nf.toLocaleString('en-US')} attendance ${nf === 1 ? 'cell' : 'cells'} fixed`, nd && `${nd} to decide`, nw && `${plural(nw, 'thing')} to check`].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}
function openNotes() { renderNotes(); openDrawer('dNotes'); }
const optLabel = (v, tardy) => (tardy ? `${v} min` : typeof v === 'number' ? `${v} min late` : String(v));
function renderNotes() {
  if ($('dNotes').hidden && openId !== 'dNotes' && !state.notesForce) { /* rendered on open */ }
  const N = state.notes, R = state.attRes;
  const groups = [['decide', 'Needs your decision'], ['warn', 'Please check'], ['fixed', 'Fixed automatically'], ['info', 'For your information'], ['done', 'Decided by you']];
  const open = N.filter(n => n.sev === 'decide' || n.sev === 'warn').length;
  $('notesSub').textContent = N.length ? `${plural(open, 'item')} to look at · ${plural(N.filter(n => n.sev === 'fixed').length, 'automatic fix', 'automatic fixes')}` : '';
  if (!N.length) { $('notesBody').innerHTML = emptyCard('Nothing to report', state.ctx || state.attFiles.length ? 'Every check passed.' : 'Drop the exports and the attendance files on Import. Every file is checked, and anything odd shows up here.'); if (checksShown()) renderChecks(); return; }
  const item = n => noteItemHtml(n);
  $('notesBody').innerHTML = groups.map(([sev, label]) => { const L = N.filter(n => n.sev === sev); return L.length ? `<section class="sec"><h3>${esc(label)} <span class="badge ${sev === 'decide' || sev === 'warn' ? 'n' : ''}">${L.length}</span></h3><ul class="notes">${L.map(item).join('')}</ul></section>` : ''; }).join('');
  if (checksShown()) renderChecks();
}
let freeMemo = null;
/** one check, with its actions: the same in the bell's drawer and in Review › Checks */
function noteItemHtml(n, opts = {}) {
  const R = state.attRes;
  if (!freeMemo || freeMemo.v !== state.ver || freeMemo.n !== state.roster.length) freeMemo = { v: state.ver, n: state.roster.length, L: rosterRows().slice().sort((a, b) => a.name.localeCompare(b.name)) };
  const free = freeMemo.L;
  {
    let acts = '';
    if (n.pick) {
      const cl = n.pick, tardy = cl.kind === 'tardy';
      acts = `<div class="picks" role="group" aria-label="Choose the value">${cl.options.map(o => { const on = String(o.v) === String(cl.current); return `<button class="btn sm ${on ? 'primary' : ''}" aria-pressed="${on}" data-pick="${esc(cl.key)}" data-v="${esc(JSON.stringify(o.v))}"><b>${esc(optLabel(o.v, tardy))}</b><span class="subtle">${esc(o.src)}</span></button>`; }).join('')}${cl.chosen !== undefined ? `<button class="linkbtn" data-unpick="${esc(cl.key)}">Change</button>` : ''}</div>`;
    }
    if (n.undo) acts = `<button class="btn sm ghost" data-undo="${esc(n.undo)}">Undo</button>`;
    if (n.redo) acts = `<button class="btn sm ghost" data-redo="${esc(n.redo)}">Redo the fix</button>`;
    if (n.unm != null && R) {
      const u = R.unmatched[n.unm];
      acts = `<div class="acts"><button class="btn sm" data-attadd="${n.unm}">Add to the roster</button><select class="cell" data-attlink="${n.unm}" aria-label="Link ${esc(u.name)} to a person"><option value="">Same person as…</option>${free.map(p => `<option value="${esc(p._id)}">${esc(p.name)}</option>`).join('')}</select></div>`;
    }
    if (n.go) acts = `<button class="btn sm" data-gonote="${esc(n.go)}">${n.go === 'history' ? 'Open the history' : n.go === 'kpi' ? 'Open the KPI results' : n.go === 'dups' ? 'Review duplicates' : 'Review'}</button>`;
    if (n.unlink) acts = `<button class="btn sm ghost" data-unlink="${esc(n.unlink)}">Undo</button>`;
    if (n.idsUndo) acts = `<button class="btn sm ghost" data-idsundo="${esc(n.idsUndo)}">Undo</button>`;
    if (n.idsAct) acts = `<div class="acts">${n.idsAct.map(([a, x, v, l], i) => `<button class="btn sm ${i ? 'ghost' : ''}" data-ida="${a}" data-idx="${esc(x)}" data-idv="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    const list = n.list && n.list.length ? `<details><summary>${plural(n.list.length, 'line')}</summary><ul>${n.list.slice(0, 200).map(t => `<li dir="auto">${esc(t)}</li>`).join('')}${n.list.length > 200 ? `<li class="subtle">and ${n.list.length - 200} more</li>` : ''}</ul></details>` : '';
    if (opts.row) return checkRowHtml(n, acts, list);
    return `<li class="note ${n.sev}"><div class="nt"><span class="tag">${esc(n.group || '')}</span><b dir="auto">${esc(n.title)}</b>${n.body ? `<span class="hint">${esc(n.body)}</span>` : ''}${list}</div>${acts ? `<div class="na">${acts}</div>` : ''}</li>`;
  }
}


function renderAttCard() {
  const el = $('attCard'), F = state.attFiles, R = state.attRes;
  if (!F.length && R && R.auto) {
    const ed = [...R.byPerson.values()].reduce((t, a) => t + (a.edited || 0), 0);
    el.classList.add('ready');
    el.innerHTML = `<div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-check"/></svg></span><h3>Attendance</h3></div><span class="pill good">From Genesys</span></div>
      <p class="hint">Counted from the Schedule and the Agent Status Timeline: a scheduled day with a sign-on is Attend (or the late minutes), no sign-on is Absent, a leave in the schedule is that leave, no shift is OFF. Days after ${R.last} ${MON[state.m - 1]} stay empty until the next export. Supervisors correct their own team's days in their Team page; sick leave, which the schedule does not have, is corrected there.</p>
      <div class="kv"><div><b>${R.stats.people}</b><span>people counted</span></div><div><b>${ed}</b><span>days corrected by supervisors</span></div><div><b>${(R.stats.tardy || 0).toLocaleString('en-US')}</b><span>late minutes</span></div><div><b>${R.last || '–'}</b><span>last day with data</span></div></div>
      <div class="acts"><button class="btn sm" id="attPick">Use supervisors' sheets instead</button></div>`;
    return;
  }
  if (!F.length) { el.innerHTML = `<div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-file"/></svg></span><h3>Supervisors' attendance</h3></div><span class="pill">Optional</span></div>
    <p class="hint">Drop each supervisor's attendance sheet (.xlsx or .xlsb), as many as you have. The right month's tab is picked by its dates, names and IDs are matched to the roster, and tardy minutes are counted from the day cells or the Tardy column. Everything goes into the Attendance sheet and the incentive file.</p>
    <div class="acts"><button class="btn sm" id="attPick">Choose files</button></div>`; el.classList.remove('ready'); return; }
  el.classList.add('ready');
  const open = state.notes.filter(n => (n.sev === 'decide' || n.sev === 'warn') && /^Attendance/.test(n.group || '')).length;
  const fixes = R ? R.fixes.reduce((t, f) => t + (f.undoable === false ? 0 : f.count), 0) : 0;
  const rows = F.map(f => {
    const info = R ? R.files.filter(x => x.file === f.name) : [], used = info.filter(x => x.used);
    return `<li><div class="fname" dir="auto">${esc(f.name)}</div><div class="meta">${fmtSize(f.size)} · ${used.length ? `used ${esc(used.map(x => `${normSpace(x.sheet)} (${x.filled} people)`).join(', '))}` : 'no tab for this month'}${info.length > used.length ? ` · ${plural(info.length - used.length, 'tab')} for other months skipped` : ''}</div><button class="btn sm ghost" data-unatt="${esc(f.name)}">Remove</button></li>`;
  }).join('');
  el.innerHTML = `<div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-check"/></svg></span><h3>Supervisors' attendance</h3></div>${open ? `<span class="pill warn">${plural(open, 'item')} to check</span>` : '<span class="pill good">Ready</span>'}</div>
    <div class="kv"><div><b>${F.length}</b><span>files</span></div><div><b>${R ? R.stats.people : 0}</b><span>people found</span></div><div><b>${(R ? R.stats.tardy : 0).toLocaleString('en-US')}</b><span>tardy minutes</span></div><div><b>${fixes.toLocaleString('en-US')}</b><span>cells fixed</span></div></div>
    <ul class="attfiles">${rows}</ul>
    <div class="acts"><button class="btn sm" id="attPick">Add files</button><button class="btn sm ${open ? 'primary' : ''}" id="attNotes">Open the checks</button></div>`;
}
function renderIncExport() {
  const md = state.ctx ? incModel() : null, el = $('incCard');
  $('incName').textContent = WriterInc.fileName(state.y, state.m);
  $('buildInc').disabled = !md || state.incBuilding;
  $('buildInc').innerHTML = state.incBuilding ? '<span class="spin" aria-hidden="true"></span>Building…' : '<svg width="18" height="18" aria-hidden="true"><use href="#i-down"/></svg>Build incentive file';
  $('histAdd').disabled = !md; $('histAdd').textContent = md && state.history[ymKey(state.y, state.m)] ? `Update ${MON[state.m - 1]} ${state.y} in the history` : `Add ${MON[state.m - 1]} ${state.y} to the history`;
  $('incNote').textContent = !md ? 'Drop the exports and the attendance files first.' : state.incBuilt && state.incBuilt.ver === state.ver ? `Saved ${state.incBuilt.fn} at ${state.incBuilt.at}.` : 'Same four tabs as the file sent to the champions. The Email step attaches it for you.';
  $('incSheets').innerHTML = [['Attendance Report', 'Everyone in the reports: day codes, Tardy, leave counts, Scheduled and Actual days', md ? md.att.length : null],
    ['Adherence -In Detail', 'Daily adherence, NA under the cut-off, Avr.', md ? md.det.length : null],
    ['Adherence', `Monthly average per person${state.settings.incFullAdhTeams.length ? `; ${state.settings.incFullAdhTeams.join(', ')} at 100%` : ''}`, md ? md.adh.length : null],
    ['AHT', 'AHT in seconds with a duplicate check', md ? md.aht.length : null]]
    .map(([n, d, c]) => `<div class="sheet ${md ? '' : 'off'}"><b>${esc(n)}${c != null ? ` <span class="pill">${plural(c, 'row')}</span>` : ''}</b><span>${esc(d)}</span></div>`).join('');
}


// ---------------------------------------------------------------- history: past months from the incentive files, plus months saved from this page
const ymKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const ymLabel = k => { const [y, m] = k.split('-').map(Number); return `${MON[m - 1]} ${y}`; };
async function addHistoryFile(it, notes) {
  try {
    const sheets = await parseRaw(it.name, await it.file.arrayBuffer());
    const rec = History.read(sheets, { name: it.name, target: state.settings.target, floor: state.settings.floor });
    if (!rec.y || !rec.m || !rec.rows.length) { notes.push({ bad: true }); state.others.push({ fid: it.fid, name: it.name, kind: 'error', msg: 'An incentive file, but its month or rows could not be read.' }); return; }
    putHistory({ ...rec, src: it.name, at: new Date().toISOString() });
    notes.push({ hist: ymKey(rec.y, rec.m) });
  } catch (e) { notes.push({ bad: true }); state.others.push({ fid: it.fid, name: it.name, kind: 'error', msg: 'Could not read this incentive file.' }); }
}
function putHistory(rec) {
  const k = ymKey(rec.y, rec.m), old = state.history[k];
  if (old && old !== rec) rec = keepGenesys(old, rec);
  state.history[k] = rec; state.histVer++;
  if (state.db) queueWrite('history/' + k, () => state.db.doc('history/' + k).set(rec));
}
// ---- Genesys exports of past months: AHT, Monthly Adherence, Schedule and Agent Status Timeline fill the history
const GEN_KINDS = ['aht', 'timeline', 'schedule', 'adhGenesys', 'perf'];
const mkey = (y, m) => y * 100 + m, keyLabel = k => ymLabel(ymKey(Math.floor(k / 100), k % 100));
const calKey = () => { const t = new Date(); return mkey(t.getFullYear(), t.getMonth() + 1); };
/** a new month's values must not wipe what Genesys exports added before (deduction, conformance, gaps filled) */
function keepGenesys(old, rec) {
  const rows = rec.rows.map(r => ({ ...r })), byId = new Map(), byName = new Map();
  rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  let changed = false;
  for (const o of old.rows) {
    const g = String(o.g || '').split(',').filter(Boolean); if (!g.length) continue;
    let r = (o.id && byId.get(o.id)) || byName.get(normName(o.n));
    if (!r) { r = { ...o }; rows.push(r); changed = true; continue; }
    const mine = new Set(String(r.g || '').split(',').filter(Boolean));
    for (const f of g) if (r[f] == null && o[f] != null) { r[f] = o[f]; mine.add(f); changed = true; }
    if (mine.size) r.g = [...mine].join(',');
  }
  return changed ? { ...rec, rows, gsrc: old.gsrc || rec.gsrc } : rec;
}
/** roster person for a Genesys name: system name first, then the name */
function whoGenesys() {
  const idx = new Map();
  for (const p of effRoster()) { if (!normSpace(p.name)) continue; const v = { id: Core.cleanId(p.nid) || '', n: normSpace(p.name), brand: p.brand || '', team: p.team || '' }; for (const n of [p.sys, p.name]) if (normSpace(n) && !idx.has(normName(n))) idx.set(normName(n), v); }
  return n => idx.get(normName(String(n || '').replace(/\s*\((inactive|deleted)\)\s*$/i, ''))) || null;
}
/** Which dropped Genesys exports belong to another month than the one being worked on. A single-month drop is the usual import;
    a drop with several months keeps the working month in the slots and sends the others to the history. */
function routeHistory(parsed) {
  const cand = parsed.filter(x => !x.inc), months = new Set();
  cand.forEach(({ it, dets }) => dets.forEach(d => { if (d.kind === 'aht' || d.kind === 'timeline' || d.kind === 'perf' || (d.kind === 'adhGenesys' && d.data.multi)) History.detMonths(d, it.name).forEach(mm => months.add(mkey(mm.y, mm.m))); }));
  if (!months.size) return { hist: [] };
  const hasCtx = !!Object.keys(state.slots).length || state.monthManual, cur = mkey(state.y, state.m);
  let W;
  if (months.size === 1) { const m1 = [...months][0]; if (!hasCtx || m1 >= cur) return { hist: [] }; W = cur; }
  else W = hasCtx ? cur : (months.has(mkey(prevMonth.y, prevMonth.m)) ? mkey(prevMonth.y, prevMonth.m) : null);
  const hist = [];
  for (const x of cand) {
    const keep = [];
    for (const d of x.dets) {
      if (!GEN_KINDS.includes(d.kind)) { keep.push(d); continue; }
      const ms = History.detMonths(d, x.it.name).map(mm => mkey(mm.y, mm.m));
      if (d.kind === 'adhGenesys' && !ms.length) { keep.push(d); continue; }   // no month in its name: the usual import
      const forW = W != null && ms.includes(W), spans = d.kind === 'schedule' || (d.kind === 'adhGenesys' && d.data.multi) || (d.kind === 'perf' && ms.length > 1);
      if (forW) keep.push(d);
      if (!forW || (spans && ms.some(k => k !== W))) hist.push({ d, name: x.it.name });
    }
    if (keep.length < x.dets.length) x.routed = true;
    x.dets = keep;
  }
  return { hist, W };
}
/** group the exports by month and merge each month into the history. Months still running are left out. */
function applyGenesysHistory(list, skipKey) {
  const byMonth = new Map(), single = new Set();
  list.forEach(({ d, name }) => { if (d.kind === 'aht' || d.kind === 'timeline' || (d.kind === 'perf' && d.data.months.length === 1)) History.detMonths(d, name).forEach(mm => single.add(mkey(mm.y, mm.m))); });
  const noMonth = [];
  for (const { d, name } of list) {
    let ms = History.detMonths(d, name).map(mm => mkey(mm.y, mm.m));
    if (!ms.length && d.kind === 'adhGenesys') { if (single.size === 1) ms = [...single]; else { noMonth.push(name); continue; } }
    for (const k of ms) { if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(d); }
  }
  const cur = calKey(), who = whoGenesys(), done = [], running = [], notes = [];
  for (const k of [...byMonth.keys()].sort()) {
    const dets = byMonth.get(k), y = Math.floor(k / 100), m = k % 100;
    if (k === skipKey || !dets.some(d => d.kind !== 'schedule')) continue;   // the month being worked on, or only the edge of a schedule file
    if (k >= cur) { running.push(k); continue; }
    const g = History.fromExports(dets, y, m, { target: state.settings.target, floor: state.settings.floor });
    if (g.notes.length) notes.push(`${keyLabel(k)}: ${g.notes.join('; ')}`);
    if (!g.rows.length) continue;
    const key = ymKey(y, m), r = History.mergeExports(state.history[key] || null, g, who);
    if (!r.rec.rows.length) continue;
    const kinds = [...new Set(dets.map(d => d.kind))].map(x => ({ aht: 'AHT', timeline: 'Agent Status Timeline', schedule: 'Schedule', adhGenesys: 'Monthly Adherence', perf: 'Agent Performance' }[x]));
    r.rec.gsrc = [...new Set([...(state.history[key] && state.history[key].gsrc || []), ...kinds])]; r.rec.at = new Date().toISOString();
    putHistory(r.rec);
    done.push({ k, have: g.have, added: r.added });
  }
  state.ghistNotes = notes;
  return { done, running, notes, noMonth };
}
const rangeText = ks => { if (!ks.length) return ''; const L = ks.map(keyLabel); return L.length > 2 ? `${L[0]} to ${L[L.length - 1]}` : L.join(' and '); };
function ghistText(r) {
  const out = [];
  if (r.done.length) {
    const aht = r.done.filter(x => x.have.aht).map(x => x.k), ded = r.done.filter(x => x.have.ded).map(x => x.k), adh = r.done.filter(x => x.have.adh).map(x => x.k), perf = r.done.filter(x => x.have.perf).map(x => x.k);
    out.push(`History updated from the Genesys exports: ${[aht.length && `AHT for ${rangeText(aht)}`, adh.length && `adherence for ${rangeText(adh)}`, ded.length && `deduction, conformance${r.done.some(x => x.have.wf) ? ', no sign-on, late sign-on, short of shift and exceptions' : ''} for ${rangeText(ded)}`, perf.length && `performance for ${rangeText(perf)}`].filter(Boolean).join(', ')}`);
  }
  if (r.running.length) out.push(`${rangeText(r.running)} ${r.running.length > 1 ? 'are' : 'is'} still running, so ${r.running.length > 1 ? 'they were' : 'it was'} left out`);
  if (r.noMonth.length) out.push(`no month found for ${r.noMonth.join(', ')} (put the month in the file name, like "Adherence Aug 2026")`);
  return out.join('. ') || 'Nothing new for the history in these files';
}
/** files dropped on a history drop zone: incentive files and Genesys exports of any month go to the history */
async function addHistoryFiles(list) {
  const items = [...list].map(f => ({ fid: ++fseq, name: f.name, size: f.size, file: f })); if (!items.length) return;
  toast(`Reading ${plural(items.length, 'file')} for the history…`);
  const notes = [], hist = [], other = [];
  await Promise.all(items.map(async it => {
    let dets; try { dets = await parse(it.name, await it.file.arrayBuffer()); } catch (e) { other.push(it.name); return; }
    if (History.isIncentive(dets.map(d => d.sheet || ''))) { await addHistoryFile(it, notes); return; }
    const g = dets.filter(d => GEN_KINDS.includes(d.kind));
    if (!g.length) { other.push(it.name); return; }
    g.forEach(d => hist.push({ d, name: it.name }));
  }));
  const r = hist.length ? applyGenesysHistory(hist) : null;
  refresh();
  const histK = [...new Set(notes.filter(n => n.hist).map(n => n.hist))].sort();
  const parts = [histK.length && `Added ${histK.map(ymLabel).join(', ')} from the incentive files`, r && ghistText(r), other.length && `${plural(other.length, 'file')} not used here (${other.slice(0, 3).join(', ')}${other.length > 3 ? '…' : ''}): drop this month's files on Import`].filter(Boolean);
  toast(parts.join('. ') + '.', r && r.notes.length ? { label: 'Details', fn: () => toast(r.notes.join(' · ')) } : null);
}
function dropHistory(k) {
  const old = state.history[k]; delete state.history[k]; state.histVer++;
  if (state.db) queueWrite('history/' + k, () => state.db.doc('history/' + k).delete());
  return old;
}
/** this month from the page (not saved yet), so it shows next to the saved months */
function pageHistRec() {
  const md = state.ctx ? incModel() : null; if (!md || !md.att.length) return null;
  const k = ymKey(md.y, md.m); if (state.history[k]) return null;
  return enrichRec({ ...History.fromModel(md, state.attRes ? state.attRes.byPerson : null), src: 'this page (not saved yet)', page: true });
}
/** deduction minutes and conformance per person from this month's Schedule and Timeline (same rules as the Deduction sheet) */
function addModelDed(rec) {
  if (!state.model || !state.slots.schedule || !state.slots.timeline || rec.y !== state.y || rec.m !== state.m) return rec;
  const byId = new Map(), byName = new Map(); rec.rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  for (const m of state.model) {
    if (!m.found.sch || !m.act) continue;
    let ded = 0, base = 0; m.sch.forEach((sv, i) => { const av = m.act[i]; if (sv == null || av == null || av === 0) return; ded += Math.max(0, sv - av); base += sv; });
    const id = Core.cleanId((effP(m.p._id) || m.p).nid), r = (id && byId.get(id)) || byName.get(normName(m.p.name)) || byName.get(m.ek); if (!r) continue;
    r.ded = ded; if (base > 0) r.conf = Math.round((1 - ded / base) * 1e4) / 1e4;
  }
  return rec;
}
/** this month's daily-review measures per person */
function addModelWf(rec) {
  if (!state.model || !state.review || rec.y !== state.y || rec.m !== state.m) return rec;
  const byId = new Map(), byName = new Map(); rec.rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  for (const m of state.model) {
    if (!m.wf) continue;
    const id = Core.cleanId((effP(m.p._id) || m.p).nid), r = (id && byId.get(id)) || byName.get(normName(m.p.name)) || byName.get(m.ek); if (!r) continue;
    Object.assign(r, History.wfFields(m.wf));
  }
  return rec;
}
/** this month's performance per person from the Performance export on Import */
function addModelPerf(rec) {
  const PF = state.perf; if (!state.model || !PF || PF.src === 'the history' || rec.y !== state.y || rec.m !== state.m) return rec;
  const byId = new Map(), byName = new Map(); rec.rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  let n = 0;
  for (const m of state.model) {
    if (!m.pf) continue;
    const id = Core.cleanId((effP(m.p._id) || m.p).nid), r = (id && byId.get(id)) || byName.get(normName(m.p.name)) || byName.get(m.ek); if (!r) continue;
    for (const k of History.PERF_F) if (m.pf[k] != null) r[k] = m.pf[k];
    n++;
  }
  if (n && PF.media) rec.pmedia = PF.media;
  return rec;
}
function histAll() {   // [{key, rec}] oldest first, saved months plus this page's month
  const out = Object.keys(state.history).sort().map(k => ({ key: k, rec: state.history[k] }));
  const pg = pageHistRec(); if (pg) out.push({ key: ymKey(pg.y, pg.m), rec: pg }); out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}
/** one identity per person across months: the National ID when any month (or the roster) has it, else the name.
    Same full name with another ID = the same person (ID typo); a name without an ID joins its closest spelling. */
function histPeople(months) {
  const nameToId = new Map(), idName = new Map();
  for (const { rec } of months) for (const r of rec.rows) if (r.id) { nameToId.set(normName(r.n), r.id); idName.set(r.id, r.n); }
  for (const q of rosterRows()) { const id = Core.cleanId(q.nid); if (!id) continue; [q.name, q.sys, ...akaOf(q)].forEach(n => { const k = normName(n); if (k && !nameToId.has(k)) nameToId.set(k, id); }); if (!idName.has(id)) idName.set(id, q.name); }
  const cands = [...nameToId.entries()], fuzzyMemo = new Map();
  const fuzzy = n => {
    if (fuzzyMemo.has(n)) return fuzzyMemo.get(n);
    let best = null, bs = 0, second = 0;
    for (const [k, id] of cands) { const sc = Core.nameScore(n, k); if (sc > bs) { if (best !== id) second = bs; bs = sc; best = id; } else if (sc > second && id !== best) second = sc; }
    const out = best && bs >= 0.8 && bs - second >= 0.08 ? best : ''; fuzzyMemo.set(n, out); return out;
  };
  const people = new Map(), noId = [];
  const noIdKey = nk => { for (const k of noId) if (Core.nameScore(nk, k) >= 0.85) return k; noId.push(nk); return nk; };
  months.forEach(({ key, rec }) => rec.rows.forEach(r => {
    const nk = normName(r.n);
    const id = nameToId.get(nk) || r.id || fuzzy(nk) || '', pk = id || 'N:' + noIdKey(nk);
    if (!people.has(pk)) people.set(pk, { pk, id, n: r.n, brand: r.brand, team: r.team, by: {} });
    const p = people.get(pk);
    if (p.by[key]) { const o = p.by[key]; p.by[key] = { ...r, ...o }; } else p.by[key] = r;   // two spellings in one file: one row
    if (r.brand) p.brand = r.brand; if (r.team) p.team = r.team; p.n = (id && idName.get(id)) || r.n || p.n;
  }));
  return [...people.values()];
}
function rosterOfHist(p) {
  const R = rosterRows();
  return (p.id && R.find(q => Core.cleanId(q.nid) === p.id)) || R.find(q => normName(q.name) === normName(p.n) || (q.sys && normName(q.sys) === normName(p.n))) || R.find(q => akaOf(q).some(a => normName(a) === normName(p.n))) || null;
}
function histFor(q) {   // roster person -> [{key, rec, r}] across months
  const { months, P } = histIndex(), id = Core.cleanId(q.nid) || Core.cleanId((effP(q._id) || {}).nid), names = new Set([normName(q.name), normName(q.sys), ...akaOf(q).map(normName)].filter(Boolean));
  const me = (id && P.find(x => x.id === id)) || P.find(x => names.has(normName(x.n))) || null;
  return months.map(({ key, rec }) => ({ key, rec, r: me ? me.by[key] || null : null }));
}
const histCell = (mt, v) => {
  if (v == null) return '<td class="num na">–</td>';
  const g = mt.good ? mt.good(v, state.settings.target) : null;
  return `<td class="num ${g === false ? 'bad' : g === true ? 'ok' : ''}">${esc(mt.fmt(v))}</td>`;
};
function personHistoryHtml(q) {
  const H = histFor(q).filter(x => x.r);
  if (!H.length) return Object.keys(state.history).length ? '<section class="sec"><h3>History</h3><p class="subtle">Not found in the saved months.</p></section>' : '';
  const M = usedMetrics(H.map(x => x.r));
  const noAdh = H.filter(x => !x.rec.rows.some(r => r.adh != null)).map(x => ymLabel(x.key));
  return `<section class="sec"><h3>History</h3><div class="tablewrap histtab"><table><thead><tr><th>Month</th>${M.map(m => `<th class="r">${esc(m.label)}</th>`).join('')}</tr></thead>
    <tbody>${H.map(x => `<tr><td title="${esc(x.rec.src || '')}">${esc(ymLabel(x.key))}${x.rec.page ? ' <span class="pill">page</span>' : ''}</td>${M.map(m => histCell(m, History.valOf(x.r, m))).join('')}</tr>`).join('')}</tbody></table></div>
    ${noAdh.length ? `<p class="hint">No adherence in the ${esc(noAdh.join(', '))} file${noAdh.length > 1 ? 's' : ''}.</p>` : ''}</section>`;
}
function renderHistory() {
  const el = $('historyBody'), months = histAll(), M = usedMetrics(months.flatMap(x => x.rec.rows)), mt = M.find(m => m.k === state.histMetric) || M[0];
  $('bHist').textContent = Object.keys(state.history).length;
  if (!months.length) { el.innerHTML = emptyCard('No history yet', 'Drop the monthly incentive files and past Genesys exports below. Each month is kept with the tool, and the month you send as final is added by itself.') + hdropHtml(false); $('histTools').hidden = true; return; }
  $('histTools').hidden = false;
  const HM = { adhUnder: 'Days under target', worked: 'Worked', ded: 'Deduction' };
  const segHtml = M.map(m => `<button data-f="${m.k}" aria-pressed="${m.k === mt.k}">${esc(HM[m.k] || m.label)}</button>`).join('');
  if ($('hMetric').dataset.keys !== M.map(m => m.k).join()) { $('hMetric').innerHTML = segHtml; $('hMetric').dataset.keys = M.map(m => m.k).join(); }
  setSeg($('hMetric'), mt.k);
  const teams = [...new Set(histPeople(months).map(p => p.team).filter(Boolean))].sort((a, b) => (DEP_ORDER.indexOf(a) + 1 || 99) - (DEP_ORDER.indexOf(b) + 1 || 99));
  const tSel = $('hTeam'); const cur = state.histTeam;
  tSel.innerHTML = `<option value="">All teams</option>${teams.map(t => `<option value="${esc(t)}"${t === cur ? ' selected' : ''}>${esc(t)}${DEP_NAMES[t] ? ' – ' + esc(DEP_NAMES[t]) : ''}</option>`).join('')}`;
  const q = normName(state.histQ || '');
  let P = histPeople(months).filter(p => (!cur || p.team === cur) && (!q || normName(`${p.n} ${p.id}`).includes(q)));
  const tot = p => { const vals = months.map(x => History.valOf(p.by[x.key], mt)).filter(v => v != null); if (!vals.length) return null; const sum = vals.reduce((a, b) => a + b, 0); return mt.total === 'avg' ? sum / vals.length : sum; };
  P.forEach(p => { p.t = tot(p); });
  const dir = state.histSort || 'name';
  P.sort((a, b) => dir === 'name' ? a.n.localeCompare(b.n) : (a.t == null) - (b.t == null) || ((dir === 'asc' ? 1 : -1) * ((a.t ?? 0) - (b.t ?? 0))) || a.n.localeCompare(b.n));
  const srcOf = rec => [rec.src, rec.gsrc && rec.gsrc.length ? 'Genesys: ' + rec.gsrc.join(', ') : ''].filter(Boolean).join(' + ');
  $('histMonths').innerHTML = months.map(({ key, rec }) => `<span class="mchip${rec.page ? ' page' : ''}${rec.gsrc && rec.gsrc.length ? ' gen' : ''}" title="${esc(srcOf(rec))}"><b>${esc(ymLabel(key))}</b><span>${plural(rec.rows.length, 'person', 'people')}${rec.page ? ' · this page' : ''}</span>${rec.page ? `<button class="linkbtn" data-histsave>Save</button>` : `<button class="x" data-histdrop="${esc(key)}" aria-label="Remove ${esc(ymLabel(key))} from the history">×</button>`}</span>`).join('');
  const head = `<tr><th><button class="linkbtn" data-hsort="name">Name</button></th><th>Team</th>${months.map(x => `<th class="r">${esc(MON[+x.key.slice(5) - 1])}${x.rec.page ? '*' : ''}</th>`).join('')}<th class="r"><button class="linkbtn" data-hsort="${dir === 'desc' ? 'asc' : 'desc'}">${mt.total === 'avg' ? 'Average' : 'Total'} ${dir === 'desc' ? '↓' : dir === 'asc' ? '↑' : ''}</button></th></tr>`;
  const body = P.map(p => { const ro = rosterOfHist(p); return `<tr><td>${ro ? `<button class="linkbtn nm" data-open="${esc(ro._id)}" data-agent="${esc(ro._id)}" dir="auto">${esc(p.n)}</button>` : `<span dir="auto">${esc(p.n)}</span> <span class="pill" title="Not on the roster now">left</span>`}</td><td>${esc(p.team || '')}</td>${months.map(x => histCell(mt, History.valOf(p.by[x.key], mt))).join('')}${histCell(mt, p.t)}</tr>`; }).join('');
  $('histCount').textContent = `${plural(P.length, 'person', 'people')} · ${plural(months.length, 'month')}${months.some(x => x.rec.page) ? ' · * this page, not saved yet' : ''}`;
  el.innerHTML = hdropHtml(true) + `<div class="tablewrap histgrid"><table><thead>${head}</thead><tbody>${body || `<tr><td colspan="${months.length + 3}" class="empty">Nobody matches.</td></tr>`}</tbody></table></div>`;
}
async function saveMonthToHistory(src) {
  let rec = null;
  if (state.incWb) { try { rec = History.read(await parse(state.incWb.name, state.incWb.bytes.slice().buffer, true), { name: state.incWb.name, target: state.settings.target, floor: state.settings.floor }); } catch (e) { rec = null; } }
  if (!rec || !rec.rows.length) { const md = state.ctx ? incModel() : null; if (!md) return null; rec = History.fromModel(md, state.attRes ? state.attRes.byPerson : null); }
  if (!rec.y || !rec.m) return null;
  if (rec.y === state.y && rec.m === state.m) for (const K of state.kpi.values()) {
    const id = Core.cleanId(K.m.p.nid), r = rec.rows.find(x => (id && x.id === id) || normName(x.n) === normName(K.m.p.name) || normName(x.n) === normName(K.m.exp));
    if (r) { if (K.res.finalPct != null) r.fin = Math.round(K.res.finalPct * 10000) / 10000; if (K.res.earned != null) r.earned = K.res.earned; }
  }
  putHistory(enrichRec({ ...rec, src, tool: true, by: whoNow(), at: new Date().toISOString() }));
  return ymKey(rec.y, rec.m);
}
async function exportHistory() {
  const months = histAll(); if (!months.length) return;
  const S = new Writer2.Styles(), Sh = Writer2.Sheet, P = histPeople(months), M = usedMetrics(months.flatMap(x => x.rec.rows));
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } });
  const tx = S.get({ font: {}, align: { h: 'left' } }), nm = S.get({ font: {}, align: { h: 'center' } }), pc = S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' });
  const ttl = S.get({ font: { sz: 16, b: true, color: 'FF000000' } }), period = `${ymLabel(months[0].key)} to ${ymLabel(months[months.length - 1].key)}`;
  const L = new Sh('By month'); L.tab = 'FF1F3864'; L.set(1, 1, `MC History - ${period}`, ttl);
  const LH = ['Month', 'ID', 'Name', 'Brand', 'Team', ...M.map(xlLabel), 'Source'];
  LH.forEach((h, j) => { L.set(3, j + 1, h, hd); L.width(j + 1, [10, 13, 32, 11, 8, 11, 10, 10, 10, 9, 10, 9, 36][j] || 10); });
  let r = 4;
  for (const { key, rec } of months) for (const p of P) {
    const x = p.by[key]; if (!x) continue;
    L.set(r, 1, ymLabel(key), tx); L.set(r, 2, p.id || '', tx); L.set(r, 3, p.n, tx); L.set(r, 4, x.brand || p.brand || '', tx); L.set(r, 5, x.team || p.team || '', nm);
    M.forEach((m, j) => { const v = History.valOf(x, m); L.set(r, 6 + j, v == null ? null : v, PCTK.has(m.k) ? pc : nm); });
    L.set(r, 6 + M.length, rec.src || '', tx); r++;
  }
  L.freeze = [4, 4]; L.filter = `A3:${Core.colName(LH.length)}${Math.max(4, r - 1)}`; L.titleLogo();
  const wide = (m, title) => {
    const W = new Sh(title); W.tab = 'FF2F5597'; W.set(1, 1, `${m.label} - ${period}`, ttl);
    const H = ['ID', 'Name', 'Team', ...months.map(x => ymLabel(x.key)), m.total === 'avg' ? 'Average' : 'Total'];
    H.forEach((h, j) => { W.set(3, j + 1, h, hd); W.width(j + 1, j === 1 ? 32 : j === 0 ? 13 : 10); });
    P.forEach((p, i) => {
      const rr = i + 4; W.set(rr, 1, p.id || '', tx); W.set(rr, 2, p.n, tx); W.set(rr, 3, p.team || '', nm);
      months.forEach((x, j) => { const v = History.valOf(p.by[x.key], m); W.set(rr, 4 + j, v == null ? null : v, PCTK.has(m.k) ? pc : nm); });
      const a = Core.ref(rr, 4), b = Core.ref(rr, 3 + months.length), vals = months.map(x => History.valOf(p.by[x.key], m)).filter(v => v != null);
      W.set(rr, 4 + months.length, vals.length ? (m.total === 'avg' ? vals.reduce((s, v) => s + v, 0) / vals.length : vals.reduce((s, v) => s + v, 0)) : '', PCTK.has(m.k) ? pc : nm, m.total === 'avg' ? `IFERROR(AVERAGE(${a}:${b}),"")` : `IF(COUNT(${a}:${b})=0,"",SUM(${a}:${b}))`);
    });
    W.freeze = [4, 3]; W.filter = `A3:${Core.colName(H.length)}${P.length + 3}`; W.titleLogo();
    return W;
  };
  const sheets = [L, ...M.map(m => wide(m, m.label.replace(/[\\/?*[\]:]/g, '')))];
  const bytes = await Writer2.pack(sheets, S, {}, { logo: await xlLogo() });
  const k0 = months[0].key, k1 = months[months.length - 1].key;
  await save(`MC History - ${ymLabel(k0)} to ${ymLabel(k1)}.xlsx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}


// ---------------------------------------------------------------- KPI scorecards: results per agent, the KPI file, exports, editor
const cardFor = (team, k) => ((curCards(k).teams || {})[normSpace(team)] || null);   // the card in force for a month (the month looked at, when none is given)
const kpiFileNow = () => state.kpiFiles[monthKey()] || null;
const pct1 = x => (x == null ? '–' : `${+(x * 100).toFixed(1)}%`);
function kpiFileRowFor(p) {
  const F = kpiFileNow(); if (!F) return null;
  const id = Core.cleanId(p.nid), names = new Set([normName(p.name), normName(p.sys)].filter(Boolean));
  return (id && F.rows.find(r => r.id === id)) || F.rows.find(r => names.has(normName(r.name))) || null;
}
function computeKpi() {
  const out = new Map(); if (!state.model) return out;
  const md = incModel(), attByPid = md ? new Map(md.att.map(r => [r.pid, r])) : new Map(), target = state.settings.target, k0 = monthKey();
  for (const m of state.model) {
    if (!m.shown) continue; const card = cardFor(m.p.team, k0); if (!card) continue;
    const a = attOf(m.p._id), cnt = a ? Att.counts(a.days, a.tardyFile) : null, fr = kpiFileRowFor(m.p), file = fileValues(card, monthKey(), m.p, null);
    const vals = { adh: m.avg, adhUnder: m.adh ? m.adh.filter(v => v != null && v < target).length : null, aht: m.aht, tardy: cnt ? cnt.tardyMin : null, file };
    const ar = attByPid.get(m.p._id);   // the days as the month's rules count them (attended: the penalty for absence is taken in Kpi.score)
    const res = Kpi.score(card, vals, ar && ar.has ? { sched: ar.sched, attended: ar.attended, absent: ar.absent, runs: ar.runs } : null, baseOf(m.p, null, k0), countFor(k0));
    res.elig = eligibility(res, qRow(k0, m.p._id), null, k0);
    if (!res.elig.ok && res.earned != null) { res.earnedCalc = res.earned; res.earned = 0; }
    out.set(m.p._id, { m, card, fileRow: fr, res });
  }
  return out;
}
const kpiSum = r => ({ finalRank: r.finalRank == null ? '–' : r.finalRank.toFixed(2), finalPct: pct1(r.finalPct), sched: r.sched, actual: r.actual, daysPct: pct1(r.daysPct), target: srHidden() ? '–' : r.target, earned: srHidden() ? '–' : r.earned, missing: r.missing.join(', ') });
const kpiRowsOut = res => res.rows.map(x => ({ name: x.k.name, weight: `${+(x.w * 100).toFixed(1)}%`, target: Kpi.target(x.k), result: Kpi.fmtVal(x.k, x.v), rank: x.r }));
function agentOf(p) { return { name: gname(p), id: Core.cleanId(p.nid) || normSpace(p.nid) || '', team: p.team || '', teamName: DEP_NAMES[p.team] || '', brand: p.brand || '' }; }
const rankChip = r => (r == null ? '<span class="rk na" title="No value">–</span>' : `<span class="rk r${r}">${r}</span>`);
function kpiCardHtml(pid) {
  const p = (state.ctx ? state.ctx.roster : rosterRows()).find(x => x._id === pid); if (!p) return '';
  const K = state.kpi.get(pid);
  if (!K) {
    if (!state.ctx) return '';
    return `<section class="sec"><h3>KPI results</h3><p class="subtle">${cardFor(p.team, monthKey()) ? 'Not in the reports this month.' : `No scorecard for ${esc(p.team || 'this team')} yet. Add it in Settings › Scorecards.`}</p></section>`;
  }
  const r = K.res, S = kpiSum(r);
  return `<section class="sec"><h3>KPI results · ${esc(K.card.title)}</h3>
    <div class="kpicard"><table><thead><tr><th>KPI</th><th class="r">Weight</th><th class="r">Target</th><th class="r">Result</th><th class="r">Ranking</th></tr></thead><tbody>
    ${r.rows.map(x => `<tr><td>${esc(x.k.name)}</td><td class="r num">${+(x.w * 100).toFixed(1)}%</td><td class="r num">${esc(Kpi.target(x.k))}</td><td class="r num"><b>${esc(Kpi.fmtVal(x.k, x.v))}</b></td><td class="r">${rankChip(x.r)}</td></tr>`).join('')}
    </tbody></table>
    <div class="kpisum"><div><b>${esc(S.finalRank)}</b><span>Final ranking</span></div><div><b>${esc(S.finalPct)}</b><span>Final %</span></div><div><b>${S.actual ?? '–'} / ${S.sched ?? '–'}</b><span>Actual / scheduled days (${esc(S.daysPct)})</span></div>${srHidden() ? '' : `<div><b>${r.target ?? '–'}</b><span>Incentive target (SR)</span></div><div class="earned"><b>${r.earned ?? '–'}</b><span>Earned (SR)</span></div>`}</div>${r.elig && !r.elig.ok ? `<p class="hint warnline">Not eligible for the incentive: ${esc(r.elig.why.join(', '))}.${srHidden() ? '' : ` Calculated ${r.earnedCalc ?? '–'} SR; the senior manager can override it.`}</p>` : ''}</div>
    ${r.missing.length ? `<p class="hint warnline">Missing: ${esc(r.missing.join(', '))}. The final ranking uses the other KPIs until ${r.missing.length > 1 ? 'they arrive' : 'it arrives'}${kpiFileNow() ? '' : ' (drop the KPI file on Import)'}.</p>` : ''}
    <div class="formbtns" style="margin-top:8px"><button class="btn sm" data-kpipdf="${esc(pid)}">PDF card</button><button class="btn sm" data-kpicopy="${esc(pid)}">Copy for email</button><button class="btn sm" data-kpixl="${esc(pid)}">Excel</button></div></section>`;
}
function kpiNotes(add) {
  const v = Kpi.validate(curCards(monthKey()));
  v.forEach(t => add({ id: 'kpi:v:' + t, sev: 'warn', group: 'Scorecards', title: t, body: 'Fix it in Settings › Scorecards.' }));
  if (!state.model) return;
  const shown = state.model.filter(m => m.shown), noCard = [...new Set(shown.filter(m => !cardFor(m.p.team, monthKey()) && !['MG', 'OP'].includes(m.p.team)).map(m => m.p.team || '–'))];
  if (noCard.length) add({ id: 'kpi:nocard', sev: 'info', group: 'Scorecards', title: `No scorecard yet for ${noCard.join(', ')}`, body: 'Their KPI results are left out until a scorecard is added in Settings › Scorecards.' });
  const miss = new Map();
  for (const K of state.kpi.values()) for (const x of K.res.rows) if (x.r == null) { if (!miss.has(x.k.name)) miss.set(x.k.name, []); miss.get(x.k.name).push(K.m.exp); }
  if (!miss.size) return;
  const F = kpiFileNow();
  add({ id: 'kpi:miss', sev: F ? 'warn' : 'info', group: 'KPI results', title: F ? `KPI values missing for ${plural(new Set([...miss.values()].flat()).size, 'agent')}` : `No KPI file for ${MONTH_LONG[state.m - 1]} yet`,
    body: F ? 'Their final ranking uses the KPIs that have a value. Check the KPI file.' : `Drop the KPI file (${[...new Set([...state.kpi.values()].flatMap(K => K.card.kpis.filter(k => k.src === 'file').map(k => k.name)))].join(', ')}) on Import. A template is in Review › KPI results.`,
    list: [...miss].map(([k, names]) => `${k}: ${names.length} (${names.slice(0, 12).join(', ')}${names.length > 12 ? ', …' : ''})`), go: 'kpi' });
}
async function tryKpiFile(it, notes) {
  try {
    const sheets = await parseRaw(it.name, await it.file.arrayBuffer());
    const f = Kpi.readFile(sheets, curCards(monthKey())); if (!f.rows.length) return false;
    const rec = { name: it.name, at: new Date().toISOString(), rows: f.rows.map(r => ({ id: r.id, name: r.name, cols: r.cols })), cols: [...new Set(f.sheets.flatMap(s => s.cols))] };
    state.kpiFiles[monthKey()] = rec;
    if (state.db) queueWrite('kpi/' + monthKey(), () => state.db.doc('kpi/' + monthKey()).set(rec));
    markFresh('kpi', `${ymLabel(monthKey())}, ${plural(f.rows.length, 'agent')}`);
    notes.push({ kpi: `${it.name}: ${plural(f.rows.length, 'agent')}, ${f.headers.length} KPI column${f.headers.length === 1 ? '' : 's'}` });
    return true;
  } catch (e) { return false; }
}
function renderKpiCard() {
  const el = $('kpiCardImp'), F = kpiFileNow();
  el.hidden = !F; if (!F) return;
  const matched = [...state.kpi.values()].filter(K => K.fileRow).length;
  el.innerHTML = `<div class="top"><div class="ttl"><span class="ico"><svg><use href="#i-check"/></svg></span><h3>KPI file · ${esc(MONTH_LONG[state.m - 1])}</h3></div><span class="pill ${matched ? 'good' : 'warn'}">${matched} matched</span></div>
    <div class="fname" dir="auto">${esc(F.name)}</div><div class="meta">${plural(F.rows.length, 'row')} · columns: ${esc((F.cols || []).join(', '))}</div>
    <div class="acts"><button class="btn sm" data-gokpi>See the KPI results</button><button class="btn sm ghost" id="kpiRemove">Remove</button></div>`;
}
// ---- KPI results tab
function renderKpiTab() {
  const el = $('kpiBody'), all = [...state.kpi.values()];
  $('bKpi').textContent = all.length;
  if (!state.ctx) { el.innerHTML = emptyCard('No data yet', 'Drop the exports and the attendance files on Import, then the KPI file. Every agent with a scorecard gets a KPI result here.'); $('kpiTools').hidden = true; return; }
  $('kpiTools').hidden = false;
  const teams = [...new Set(all.map(K => normSpace(K.m.p.team)))].sort((a, b) => (DEP_ORDER.indexOf(a) + 1 || 99) - (DEP_ORDER.indexOf(b) + 1 || 99));
  if (state.kpiTeam && !teams.includes(state.kpiTeam)) state.kpiTeam = '';
  $('kTeam').innerHTML = `<option value="">All teams</option>${teams.map(t => `<option value="${esc(t)}"${t === state.kpiTeam ? ' selected' : ''}>${esc(t)} – ${esc((cardFor(t, monthKey()) || { title: '' }).title)}</option>`).join('')}`;
  const q = normName(state.kpiQ || '');
  let L = all.filter(K => (!state.kpiTeam || normSpace(K.m.p.team) === state.kpiTeam) && (!q || normName(`${K.m.exp} ${K.m.p.name} ${K.m.p.nid}`).includes(q)));
  const dir = state.kpiSort || 'desc';
  L.sort((a, b) => (dir === 'name' ? a.m.exp.localeCompare(b.m.exp) : (a.res.finalRank == null) - (b.res.finalRank == null) || (dir === 'asc' ? 1 : -1) * ((a.res.finalRank ?? 0) - (b.res.finalRank ?? 0)) || a.m.exp.localeCompare(b.m.exp)));
  const card = state.kpiTeam ? cardFor(state.kpiTeam, monthKey()) : null;
  const tot = L.reduce((t, K) => t + (K.res.earned || 0), 0), full = L.filter(K => K.res.complete).length;
  const sr = !srHidden();   // the WFM analysts do not see the incentive amounts
  $('kpiCount').textContent = `${plural(L.length, 'agent')} · ${full} with every KPI${sr ? ` · earned ${tot.toLocaleString('en-US')} SR in total` : ''}${kpiFileNow() ? '' : ' · no KPI file yet'}`;
  const sortBtn = `<button class="linkbtn" data-ksort="${dir === 'desc' ? 'asc' : 'desc'}">Final % ${dir === 'desc' ? '↓' : dir === 'asc' ? '↑' : ''}</button>`;
  const head = `<tr><th><button class="linkbtn" data-ksort="name">Name</button></th><th>Team</th>${card ? card.kpis.map(k => `<th class="r" title="${esc(Kpi.bandText(k))}">${esc(k.name)}<br><small>${+(k.weight * 100).toFixed(1)}%</small></th>`).join('') : ''}<th class="r">Final ranking</th><th class="r">${sortBtn}</th><th class="r">Actual days %</th>${sr ? '<th class="r">Target SR</th><th class="r">Earned SR</th>' : ''}${card ? '' : '<th>Missing</th>'}</tr>`;
  const body = L.map(K => { const r = K.res;
    return `<tr><td><button class="linkbtn nm" data-open="${esc(K.m.p._id)}" data-agent="${esc(K.m.p._id)}" dir="auto">${esc(K.m.exp)}</button></td><td>${esc(K.m.p.team)}</td>
      ${card ? r.rows.map(x => `<td class="r num">${esc(Kpi.fmtVal(x.k, x.v))} ${rankChip(x.r)}</td>`).join('') : ''}
      <td class="r num">${r.finalRank == null ? '–' : r.finalRank.toFixed(2)}</td><td class="r num"><b>${pct1(r.finalPct)}</b></td><td class="r num">${pct1(r.daysPct)}</td>${sr ? `<td class="r num">${r.target ?? '–'}</td><td class="r num"><b>${r.earned ?? '–'}</b></td>` : ''}${card ? '' : `<td class="subtle">${esc(r.missing.join(', '))}</td>`}</tr>`; }).join('');
  el.innerHTML = `<div class="tablewrap histgrid kpigrid"><table><thead>${head}</thead><tbody>${body || '<tr><td colspan="10" class="empty">Nobody matches.</td></tr>'}</tbody></table></div>
    ${card ? `<p class="hint">${card.kpis.map(k => `<b>${esc(k.name)}</b> (${esc(Kpi.SRC[k.src] || k.src)}): ${esc(Kpi.bandText(k))}`).join('<br>')}</p>` : ''}`;
}
// ---- exports
const kpiPeriod = () => `${MONTH_LONG[state.m - 1]} ${state.y}`;
function kpiList(pids) { return pids.map(id => state.kpi.get(id)).filter(Boolean); }
function visibleKpi() { const q = normName(state.kpiQ || ''); return [...state.kpi.values()].filter(K => (!state.kpiTeam || normSpace(K.m.p.team) === state.kpiTeam) && (!q || normName(`${K.m.exp} ${K.m.p.name} ${K.m.p.nid}`).includes(q))); }
async function kpiPdf(list, name) {
  if (!list.length) { toast('Nobody to export.'); return; }
  try {
    const bytes = await Forms.kpiCards(list.map(K => ({ agent: agentOf(K.m.p), scorecard: K.card.title, rows: kpiRowsOut(K.res), sum: kpiSum(K.res) })), { period: kpiPeriod(), logo: await logoPixels() });
    await save(name, new Blob([bytes], { type: 'application/pdf' }));
  } catch (e) { toast('Could not make the PDF: ' + (e && e.message ? e.message : e)); }
}
async function kpiExcel(list, name, single) {
  if (!list.length) { toast('Nobody to export.'); return; }
  const S = new Writer2.Styles(), Sh = Writer2.Sheet;
  const lab = S.get({ font: { name: 'Arial', b: true, color: 'FFFF0000' }, fill: 'FF000000', border: 'FFFFFFFF', align: { h: 'center' } });
  const labY = S.get({ font: { name: 'Arial', b: true, color: 'FFFFFF00' }, fill: 'FF000000', border: 'FFFFFFFF', align: { h: 'center' } });
  const val = S.get({ font: { name: 'Arial' }, border: 'FF000000', align: { h: 'center' } }), rk = S.get({ font: { name: 'Arial' }, fill: 'FFD9D9D9', border: 'FF000000', align: { h: 'center' } });
  const pc = S.get({ font: { name: 'Arial' }, border: 'FF000000', align: { h: 'center' }, numFmt: '0%' }), pc2 = S.get({ font: { name: 'Arial' }, border: 'FF000000', align: { h: 'center' }, numFmt: '0.00' });
  const hd = S.get({ font: { name: 'Arial', b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } });
  const txt = S.get({ font: { name: 'Arial' }, border: 'FFBFBFBF', align: { h: 'left' } }), num = S.get({ font: { name: 'Arial' }, border: 'FFBFBFBF', align: { h: 'center' } });
  const npc = S.get({ font: { name: 'Arial' }, border: 'FFBFBFBF', align: { h: 'center' }, numFmt: '0.0%' });
  const cellV = (k, v) => (v == null ? null : v);
  const ttl = S.get({ font: { name: 'Arial', sz: 16, b: true, color: 'FF000000' } });
  const sheets = [];
  if (single) {   // one agent: the card layout (labels on the left)
    const K = list[0], r = K.res, W = new Sh('KPI card'); W.width(1, 30); W.width(2, 16);
    let row = 1; const put = (l, v, st, ls = lab) => { W.set(row, 1, l, ls); W.set(row, 2, v, st); row++; };
    put('ID', Core.cleanId(K.m.p.nid) || 'NA', val); put('Name', K.m.exp, val); put('Team', normSpace(K.m.p.brand), val);
    for (const x of r.rows) { put(x.k.name, cellV(x.k, x.v), x.k.unit === 'pct' ? pc : val); put('Ranking', x.r ?? '–', rk); }
    put('Final ranking %', r.finalRank, pc2); put('Final %', r.finalPct, pc); put('Scheduled day', r.sched, val, labY); put('Actual days', r.actual, val, labY); put('Actual Days %', r.daysPct, pc, labY);
    put('Incentive Target', srHidden() ? null : r.target, val, labY); put('Earned SR', srHidden() ? null : r.earned, val); put('Comment', r.missing.length ? 'Missing: ' + r.missing.join(', ') : '', val);
    W.logoAt(4, 1, 52, 8, 4); sheets.push(W);
  } else {
    const byTeam = new Map(); list.forEach(K => { const t = normSpace(K.m.p.team); if (!byTeam.has(t)) byTeam.set(t, []); byTeam.get(t).push(K); });
    for (const [t, L] of [...byTeam].sort((a, b) => (DEP_ORDER.indexOf(a[0]) + 1 || 99) - (DEP_ORDER.indexOf(b[0]) + 1 || 99))) {
      const card = cardFor(t, monthKey()) || L[0].card, W = new Sh(`${t} KPI`.slice(0, 31)); W.tab = 'FF1F3864'; W.set(1, 1, `KPI results - ${kpiPeriod()} - ${t} (${card.title})`, ttl);
      const H = ['ID', 'Name', 'Team', 'Dep', ...card.kpis.flatMap(k => [k.name, 'Ranking']), 'Final ranking', 'Final %', 'Scheduled day', 'Actual days', 'Actual Days %', 'Incentive Target', 'Earned SR', 'Comment'];
      H.forEach((h, j) => { W.set(3, j + 1, h, hd); W.width(j + 1, j === 1 ? 30 : j === 0 ? 13 : 11); }); W.heights[3] = 32;
      L.sort((a, b) => a.m.exp.localeCompare(b.m.exp)).forEach((K, i) => {
        const r = K.res, R = i + 4; let c = 1;
        W.set(R, c++, Core.cleanId(K.m.p.nid) || 'NA', txt); W.set(R, c++, K.m.exp, txt); W.set(R, c++, normSpace(K.m.p.brand), num); W.set(R, c++, t, num);
        for (const x of r.rows) { W.set(R, c++, cellV(x.k, x.v), x.k.unit === 'pct' ? npc : num); W.set(R, c++, x.r, num); }
        W.set(R, c++, r.finalRank, num); W.set(R, c++, r.finalPct, npc); W.set(R, c++, r.sched, num); W.set(R, c++, r.actual, num); W.set(R, c++, r.daysPct, npc); W.set(R, c++, srHidden() ? null : r.target, num); W.set(R, c++, srHidden() ? null : r.earned, num);
        W.set(R, c++, r.missing.length ? 'Missing: ' + r.missing.join(', ') : '', txt);
      });
      W.freeze = [4, 3]; W.filter = `A3:${Core.colName(H.length)}${L.length + 3}`; W.titleLogo(11, 380); sheets.push(W);
    }
  }
  const SC = new Sh('Scorecards'); SC.width(1, 10); SC.width(2, 34); SC.width(3, 10); SC.width(4, 12); SC.width(5, 60); SC.width(6, 34);
  SC.set(1, 1, `KPI scorecards - ${kpiPeriod()}`, ttl);
  ['Team', 'KPI', 'Weight', 'Target', 'Ranking bands', 'Source'].forEach((h, j) => SC.set(3, j + 1, h, hd));
  let sr = 4; const used = new Set(list.map(K => normSpace(K.m.p.team)));
  const CK = curCards(monthKey());
  for (const [t, c] of Object.entries(CK.teams)) { if (!used.has(t)) continue; for (const k of c.kpis) { SC.set(sr, 1, t, num); SC.set(sr, 2, k.name, txt); SC.set(sr, 3, k.weight, npc); SC.set(sr, 4, Kpi.target(k), num); SC.set(sr, 5, Kpi.bandText(k), txt); SC.set(sr, 6, Kpi.SRC[k.src] || k.src, txt); sr++; } }
  SC.set(sr + 1, 2, `Incentive: the base (${Object.entries({ ...BASES0, ...(CK.bases || {}) }).map(([b, v]) => `${b} ${v}`).join(', ')} SR) × actual days % = target; × final % = earned (rounded).`, txt);
  SC.titleLogo(11, 380); sheets.push(SC);
  await save(name, new Blob([await Writer2.pack(sheets, S, {}, { logo: await xlLogo() })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
function kpiEmailHtml(K) {
  const r = K.res, td = (t, o = {}) => `<td style="border:solid #BFBFBF 1.0pt;padding:2pt 6pt;${o.bg ? `background:${o.bg};` : ''}"><p class="MsoNormal" style="margin:0in;${o.c ? '' : 'text-align:center;'}font-family:Calibri,sans-serif;font-size:10.5pt;${o.color ? `color:${o.color};` : ''}">${o.b ? '<b>' : ''}${esc(t)}${o.b ? '</b>' : ''}</p></td>`;
  const lab = t => td(t, { bg: '#1F3864', color: '#FFFFFF', b: true }), rows = [];
  rows.push([lab('Name'), td(K.m.exp, { b: true })], [lab('Team'), td(`${normSpace(K.m.p.brand)} · ${K.m.p.team}`)]);
  for (const x of r.rows) { rows.push([lab(x.k.name), td(Kpi.fmtVal(x.k, x.v), { b: true })]); rows.push([lab('Ranking'), td(x.r == null ? '–' : String(x.r), { bg: '#D9D9D9' })]); }
  rows.push([lab('Final ranking'), td(r.finalRank == null ? '–' : r.finalRank.toFixed(2), { bg: '#D9D9D9' })], [lab('Final %'), td(pct1(r.finalPct), { b: true })], [lab('Scheduled days'), td(r.sched ?? '–')], [lab('Actual days'), td(r.actual ?? '–')], [lab('Actual days %'), td(pct1(r.daysPct))], ...(srHidden() ? [] : [[lab('Incentive target'), td(r.target ?? '–')], [lab('Earned SR'), td(r.earned ?? '–', { b: true })]]));
  const t = `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows.map(x => `<tr>${x.join('')}</tr>`).join('')}</table>`;
  return `<html><head><meta charset="utf-8"></head><body><p class="MsoNormal" style="font-family:Calibri,sans-serif;font-size:11pt;margin:0 0 8pt"><b>KPI results – ${esc(kpiPeriod())}</b></p>${t}${state.logo && state.mailLogo ? '<p class="MsoNormal">&nbsp;</p>' + logoTag(state.logo.dataUrl) : ''}</body></html>`;
}
const kpiEmailText = K => [`KPI results – ${kpiPeriod()}`, `Name\t${K.m.exp}`, ...K.res.rows.flatMap(x => [`${x.k.name}\t${Kpi.fmtVal(x.k, x.v)}`, `Ranking\t${x.r ?? '–'}`]), `Final ranking\t${K.res.finalRank ?? '–'}`, `Final %\t${pct1(K.res.finalPct)}`, `Scheduled days\t${K.res.sched ?? '–'}`, `Actual days\t${K.res.actual ?? '–'}`, `Actual days %\t${pct1(K.res.daysPct)}`, ...(srHidden() ? [] : [`Incentive target\t${K.res.target ?? '–'}`, `Earned SR\t${K.res.earned ?? '–'}`])].join('\r\n');
async function kpiTemplate() {
  const S = new Writer2.Styles(), Sh = Writer2.Sheet, sheets = [];
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } });
  const inp = S.get({ font: { sz: 11, color: 'FF000000' }, fill: 'FFFFF2CC', border: 'FFD9D9D9', align: { h: 'center' } }), tx = S.get({ font: {}, align: { h: 'left' } });
  const ttlT = S.get({ font: { sz: 16, b: true, color: 'FF000000' } });
  const shown = (state.model || []).filter(m => m.shown);
  for (const [t, c] of Object.entries(curCards(monthKey()).teams)) {
    const fk = c.kpis.filter(k => k.src === 'file'); if (!fk.length) continue;
    const L = shown.filter(m => normSpace(m.p.team) === t), W = new Sh(`${t}`); W.tab = 'FF1F3864';
    W.set(1, 1, `KPI input - ${t} - ${MON[state.m - 1]} ${state.y}`, ttlT);
    const H = ['ID', 'Name', 'Brand', 'Team', ...fk.map(k => k.name)];
    H.forEach((h, j) => { W.set(3, j + 1, h, hd); W.width(j + 1, j === 1 ? 32 : j < 4 ? 12 : 18); }); W.heights[3] = 30;
    L.forEach((m, i) => { const R = i + 4; W.set(R, 1, Core.cleanId(m.p.nid) || '', tx); W.set(R, 2, m.exp, tx); W.set(R, 3, normSpace(m.p.brand), tx); W.set(R, 4, t, tx); fk.forEach((k, j) => W.set(R, 5 + j, null, inp)); });
    for (let R = L.length + 4; R <= L.length + 13; R++) fk.forEach((k, j) => W.set(R, 5 + j, null, inp));
    W.freeze = [4, 3]; W.titleLogo(); sheets.push(W);
  }
  const N = new Sh('How to fill'); N.width(1, 110); N.width(2, 30); N.logoAt(2, 1, 40, 8, 4);
  ['Type each KPI as a percentage (89% or 0.89). DRC-CSAT can also be a 1–5 score.', 'Keep the ID and Name columns. Rows are matched by National ID, then by name.', 'Drop the filled file on Import. It is used for the month selected in the tool.', 'Adherence, AHT, days under target and tardiness come from Genesys and the attendance files, so they are not in this file.'].forEach((t, i) => N.set(i + 1, 1, t, tx));
  sheets.push(N);
  await save(`KPI input - ${MON[state.m - 1]} ${state.y}.xlsx`, new Blob([await Writer2.pack(sheets, S, {}, { logo: await xlLogo() })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
// ---- scorecard editor
// saved scorecards from before the WF card fix: Quality of Work 95% ranks 5 on the WF card
function migrateCards(teams) {
  const q = teams && teams.WF && (teams.WF.kpis || []).find(k => k.id === 'qow');
  if (q && JSON.stringify(q.bands) === JSON.stringify([0.98, 0.95, 0.9, null])) q.bands = [0.95, 0.90, 0.85, 0.80];
}
function persistCards() { if (!state.db) return; const body = JSON.parse(JSON.stringify(state.cards)); queueWrite('config/scorecards', () => state.db.doc('config/scorecards').set(body)); }
function renderScore() {
  const can = canRules(), C = ruleCards(), teams = Object.keys(C.teams), t = teams.includes(state.scoreTeam) ? state.scoreTeam : teams[0]; state.scoreTeam = t;
  const card = C.teams[t], issues = Kpi.validate({ teams: { [t]: card } }), wsum = card.kpis.reduce((a, k) => a + (+k.weight || 0), 0);
  const free = DEP_ORDER.filter(x => !teams.includes(x)), B = { ...BASES0, ...(C.bases || {}) };
  const bandIn = (k, i) => { const v = k.bands[i]; const shown = v == null || v === '' ? '' : k.unit === 'pct' ? +(v * 100).toFixed(3) : v; return `<input class="cell bandin" data-sb="${i}" value="${esc(shown)}" placeholder="–" inputmode="decimal" aria-label="Rank ${5 - i} ${k.dir === 'low' ? 'up to' : 'from'}">`; };
  $('scoreBody').innerHTML = `${rulesBarHtml()}
    <div class="field"><span class="lbl">Team</span><div class="seg wrap" id="scTeams">${teams.map(x => `<button data-f="${esc(x)}" aria-pressed="${x === t}">${esc(x)}</button>`).join('')}</div>
      ${free.length && can ? `<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><select class="cell" id="scAddTeam" aria-label="Team to add">${free.map(x => `<option value="${x}">${x} – ${esc(DEP_NAMES[x] || '')}</option>`).join('')}</select><button class="btn sm" id="scAdd">Add a scorecard</button></div>` : ''}</div>
    <fieldset class="formlock rulesfs"${can ? '' : ' disabled'}>
    <div class="field"><span class="lbl">Incentive base (SR)</span><div class="basegrid">${BRANDS.map(b => `<label><span>${esc(b)}</span><input type="number" min="0" step="1" data-base="${esc(b)}" value="${B[b]}" aria-label="Incentive base for ${esc(b)}"></label>`).join('')}</div><small>Incentive target = base × actual days %. Earned = target × final %. A person's own base in the roster (for team leads and specialists) wins.</small></div>
    ${eligEditHtml()}
    ${countEditHtml()}
    <div class="field"><label for="scTitle">Scorecard name</label><input id="scTitle" value="${esc(card.title)}"></div>
    <div class="tablewrap formtab sctab"><table><thead><tr><th>KPI</th><th>From</th><th>Entered by</th><th class="r">Weight %</th><th>Better</th><th class="r">5</th><th class="r">4</th><th class="r">3</th><th class="r">2</th><th></th></tr></thead><tbody>
    ${card.kpis.map((k, i) => `<tr data-ki="${i}"><td><input class="cell" data-sf="name" value="${esc(k.name)}" aria-label="KPI name"></td>
      <td><select class="cell" data-sf="src" aria-label="Source">${Object.entries(Kpi.SRC).map(([v, l]) => `<option value="${v}"${k.src === v ? ' selected' : ''} title="${esc(l)}">${esc({ adh: 'Adherence %', adhUnder: 'Days under target', aht: 'AHT (sec)', tardy: 'Tardy (min)', file: 'KPI file' }[v])}</option>`).join('')}</select></td>
      <td>${k.src === 'file' ? `<select class="cell" data-sf="owner" aria-label="Entered by"><option value="quality"${ownerOf(k) === 'quality' ? ' selected' : ''}>Quality team</option><option value="file"${ownerOf(k) === 'file' ? ' selected' : ''}>KPI file</option></select>` : '<span class="subtle">Genesys</span>'}</td>
      <td><input class="cell r" data-sf="weight" value="${+(k.weight * 100).toFixed(2)}" inputmode="decimal" aria-label="Weight %"></td>
      <td><select class="cell" data-sf="dir" aria-label="Better"><option value="high"${k.dir === 'high' ? ' selected' : ''}>Higher</option><option value="low"${k.dir === 'low' ? ' selected' : ''}>Lower</option></select></td>
      ${[0, 1, 2, 3].map(j => `<td>${bandIn(k, j)}</td>`).join('')}
      <td>${can ? `<button class="rowbtn danger" data-sdel="${i}" aria-label="Remove ${esc(k.name)}">Remove</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="hint">Bands: the lowest value for each ranking when higher is better, or the highest value when lower is better. Percent KPIs are typed as %. Leave a ranking empty when it is not used (for example "NIL"). Below the last band is ranking 1.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${can ? '<button class="btn sm" id="scKpiAdd">Add a KPI</button>' : ''}<span class="pill ${Math.abs(wsum - 1) < 0.001 ? 'good' : 'bad'}">Weights ${+(wsum * 100).toFixed(1)}%</span>${issues.map(x => `<span class="pill bad">${esc(x.replace(/^[A-Z]+: /, ''))}</span>`).join('')}</div>
    ${can ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm ghost" id="scReset">Reset ${esc(t)} to kpi.xlsx</button>${Kpi.DEFAULTS().teams[t] ? '' : `<button class="btn sm ghost" id="scRemove">Remove the ${esc(t)} scorecard</button>`}</div>` : ''}</fieldset>`;
}
/** a change to the rules: saved with a line in their log, and every page scores again */
function scoreChanged(what) { if (!saveRules(what)) { renderScore(); return; } refresh(); renderScore(); if (state.ws !== 'build') renderWs(); }

// ---------------------------------------------------------------- incentive data
function incModel() { if (!state.ctx) return null; if (!state.incModelCache) state.incModelCache = WriterInc.model(state.ctx, { count: countFor(monthKey()) }); return state.incModelCache; }
const ukey = (id, name) => (/^\d{6,}$/.test(String(id || '')) ? String(id) : 'N:' + normName(name));
const stripMark = s => normSpace(String(s ?? '').replace(/^[⛔⚠]️?\s*/, ''));
/** incentive rows from the page (or a dropped workbook) as plain data for the email, the snapshot and the differences */
function incRowsFromModel(md) {
  return {
    y: md.y, m: md.m,
    att: md.att.map(r => ({ k: ukey(r.id, r.name), n: r.name, d: r.days.join('|'), t: r.tardy || 0 })),
    adh: md.adh.map(r => ({ k: ukey(r.id, r.name), n: r.name, v: typeof r.avg === 'number' ? r.avg : null })),
    aht: md.aht.map(r => ({ k: ukey(r.id, r.name), n: r.name, v: r.sec })),
  };
}
function readIncentive(sheets) {
  const by = re => sheets.find(s => re.test(normSpace(s.name)));
  const AR = by(/^attendance report$/i), AD = by(/^adherence$/i), AH = by(/^aht$/i);
  if (!AR && !AD && !AH) return { error: 'This is not an incentive data workbook. It needs the Attendance Report, Adherence and AHT tabs.' };
  const head = S => { const i = S.rows.findIndex(r => r && r.some(v => normName(v) === 'id') && r.some(v => /^(name|member care champions)$/i.test(normSpace(v)))); return i; };
  const col = (H, re) => H.findIndex(v => re.test(normSpace(v)));
  const num = v => (typeof v === 'number' ? v : (v != null && v !== '' && Number.isFinite(+v) ? +v : null));
  const out = { y: null, m: null, att: [], adh: [], aht: [] };
  if (AR) {
    const h = head(AR), H = AR.rows[h] || [];
    const dc = []; H.forEach((v, i) => { if (v instanceof Date) dc.push(i); });
    if (dc.length) { out.y = H[dc[0]].getUTCFullYear(); out.m = H[dc[0]].getUTCMonth() + 1; }
    const ni = col(H, /^name$/i), ti = col(H, /^tardy$/i);
    AR.rows.slice(h + 1).forEach(r => {
      const n = stripMark(r && r[ni]); if (!n) return;
      const days = dc.map(i => { const v = r[i]; if (v == null || v === '') return ''; if (typeof v === 'number') return 'Attend'; const x = Att.normCode(v); return typeof x.v === 'number' ? 'Attend' : x.v == null ? '' : String(x.v); });
      out.att.push({ k: ukey(idText(r[0]), n), n, d: days.join('|'), t: num(r[ti]) || 0 });
    });
  }
  const simple = (S, re, conv) => {
    if (!S) return [];
    const h = head(S), H = S.rows[h] || [], ni = col(H, /^(name|member care champions)$/i), vi = col(H, re);
    return S.rows.slice(h + 1).map(r => { const n = stripMark(r && r[ni]); return n ? { k: ukey(idText(r[0]), n), n, v: conv(r[vi]) } : null; }).filter(Boolean);
  };
  out.adh = simple(AD, /^adherence$/i, v => num(v));
  out.aht = simple(AH, /^aht$/i, v => num(v));
  return out;
}
/** pair two row lists by ID key, then by name (an ID added or fixed is the same person) */
function pairRows(L0, L1) {
  const used = new Set(), byK = new Map(), byN = new Map();
  (L0 || []).forEach((o, i) => { if (!byK.has(o.k)) byK.set(o.k, i); const n = normName(o.n); if (!byN.has(n)) byN.set(n, i); });
  const pairs = [], added = [];
  for (const r of L1 || []) {
    let i = byK.get(r.k); if (i == null || used.has(i)) i = byN.get(normName(r.n));
    if (i != null && !used.has(i)) { used.add(i); pairs.push([L0[i], r]); } else added.push(r);
  }
  return { pairs, added, removed: (L0 || []).filter((_, i) => !used.has(i)) };
}
function incDiff(a, b) {   // a: review, b: now  -> [{n, what}]
  const Ml = MON[(b.m || state.m) - 1], rows = new Map();
  const put = (n, t) => { if (!rows.has(n)) rows.set(n, []); rows.get(n).push(t); };
  const A = pairRows(a.att, b.att), has0 = !!(a.att && a.att.length), has1 = !!(b.att && b.att.length);
  for (const [o, r] of A.pairs) {
    const d0 = o.d.split('|'), d1 = r.d.split('|'), dd = [];
    d1.forEach((v, i) => { if ((d0[i] || '') !== (v || '')) dd.push(`${i + 1} ${Ml} ${d0[i] || 'blank'} → ${v || 'blank'}`); });
    if (dd.length) put(r.n, dd.length > 5 ? `${dd.slice(0, 5).join(', ')} and ${plural(dd.length - 5, 'more day')}` : dd.join(', '));
    if (Math.round((o.t || 0) * 100) !== Math.round((r.t || 0) * 100)) put(r.n, `tardy ${o.t || 0} → ${r.t || 0} min`);
  }
  if (has0) A.added.forEach(r => put(r.n, 'added to the Attendance Report'));
  if (has1) A.removed.forEach(o => put(o.n, 'removed from the Attendance Report'));
  const cmp = (L0, L1, label, f) => {
    const X = pairRows(L0, L1);
    for (const [o, r] of X.pairs) if (!(o.v === r.v || (typeof o.v === 'number' && typeof r.v === 'number' && Math.abs(o.v - r.v) < 1e-6))) put(r.n, `${label} ${f(o.v)} → ${f(r.v)}`);
    if (L0 && L0.length) X.added.forEach(r => put(r.n, `added to the ${label} tab (${f(r.v)})`));
    if (L1 && L1.length) X.removed.forEach(o => put(o.n, `removed from the ${label} tab`));
  };
  cmp(a.adh, b.adh, 'Adherence', v => (v == null ? 'NA' : pct(v)));
  cmp(a.aht, b.aht, 'AHT', v => (v == null ? '–' : `${(+v).toFixed(1)} s`));
  return [...rows].map(([n, w]) => ({ n, what: w.join('; ') })).sort((x, y) => x.n.localeCompare(y.n));
}
function dedDiff(a, b) {   // deduction snapshot vs now -> changed totals and changed absences
  const k = L => (L || []).map(r => ({ ...r, k: ukey(r.id, r.name), n: r.name }));
  const D = pairRows(k(a.ded), k(b.ded)), out = [];
  for (const [o, r] of D.pairs) if (o.total !== r.total) out.push({ id: r.id, name: r.name, before: o.total, after: r.total });
  D.added.forEach(r => { if (r.total) out.push({ id: r.id, name: r.name, before: 0, after: r.total }); });
  D.removed.forEach(o => { if (o.total) out.push({ id: o.id, name: o.name, before: o.total, after: 0 }); });
  const abs = [];
  if (a.abs && b.abs) {
    const B = pairRows(k(a.abs), k(b.abs));
    for (const [o, r] of B.pairs) if (o.days.join(',') !== r.days.join(',')) abs.push({ id: r.id, name: r.name, before: o.days.length, after: r.days.length });
    B.added.forEach(r => abs.push({ id: r.id, name: r.name, before: 0, after: r.days.length }));
    B.removed.forEach(o => abs.push({ id: o.id, name: o.name, before: o.days.length, after: 0 }));
  }
  return { ded: out.sort((x, y) => x.name.localeCompare(y.name)), abs: abs.sort((x, y) => x.name.localeCompare(y.name)) };
}

// ---------------------------------------------------------------- review snapshots (for the final emails)
const snapId = kind => `${kind}-${kind === 'ded' && state.mailSrc === 'shared' ? (wsMonthNow() || monthKey()) : monthKey()}`;
async function loadSnaps() {
  if (!state.db) return;
  try { const s = await state.db.collection('snaps').get(); state.snaps = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (state.step === 'email') renderEmail(); } catch (e) { /* none */ }
}
function saveSnap(kind, data) {
  const id = snapId(kind), u = Auth.user && Auth.user();
  const body = { at: new Date().toISOString(), by: u ? u.name || u.email || '' : '', data: JSON.stringify(data) };
  state.snaps[id] = body;
  if (state.db) queueWrite('snaps/' + id, () => state.db.doc('snaps/' + id).set(body));
}
function snapOf(kind) {
  const r = state.revWb && state.revWb[kind];
  if (r) return { at: null, src: r.name, data: r.data };
  const s = state.snaps[snapId(kind)]; if (!s) return null;
  try { return { at: s.at, by: s.by, data: JSON.parse(s.data) }; } catch (e) { return null; }
}
const fmtWhen = iso => { try { const d = new Date(iso); return d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

// ---------------------------------------------------------------- logo (added by you; used on the forms and in the emails)
async function setLogoFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) { toast('Use a PNG or JPG image for the logo.'); return; }
  try {
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const img = await loadImg(url);
    const sc = Math.min(1, 600 / img.naturalWidth, 240 / img.naturalHeight), w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
    state.logo = { dataUrl: cv.toDataURL('image/png'), w, h }; logoPx = null;
    if (state.db) queueWrite('config/logo', () => state.db.doc('config/logo').set(state.logo));
    renderLogo(); render(); toast('Logo saved. It is used in the app bar, on the forms, in the emails and in the Excel files.');
  } catch (e) { toast('Could not read that image.'); }
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
let logoPx = null;
async function logoPixels() {
  if (!state.logo) return null; if (logoPx) return logoPx;
  try {
    const img = await loadImg(state.logo.dataUrl), w = state.logo.w, h = state.logo.h;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data, rgbA = new Uint8Array(w * h * 3), al = new Uint8Array(w * h); let opaque = true;
    for (let i = 0; i < w * h; i++) { rgbA[i * 3] = px[i * 4]; rgbA[i * 3 + 1] = px[i * 4 + 1]; rgbA[i * 3 + 2] = px[i * 4 + 2]; al[i] = px[i * 4 + 3]; if (al[i] < 255) opaque = false; }
    logoPx = { w, h, rgb: rgbA, alpha: opaque ? null : al }; return logoPx;
  } catch (e) { return null; }
}
function renderLogo() {
  const L = state.logo;
  $('logoState').innerHTML = L ? `<img src="${L.dataUrl}" alt="Logo" class="logoimg"><span class="hint">${L.builtin ? 'Beyond One logo (built in)' : `Your logo, ${L.w}×${L.h}px`}</span>` : '<span class="hint">No logo.</span>';
  $('logoRemove').hidden = !L || !!L.builtin || !BUILTIN_LOGO;
  renderBrand();
}
/** the logo in the app bar: the built-in one has a version for dark and for light backgrounds */
function renderBrand() {
  const L = state.logo, d = $('blDark'), l = $('blLight'); if (!d || !l) return;
  const on = !!(L || BRAND);
  d.src = L && !L.builtin ? L.dataUrl : BRAND ? BRAND.dark : ''; l.src = L && !L.builtin ? L.dataUrl : BRAND ? BRAND.light : '';
  document.querySelector('.sidebar .brand').classList.toggle('has-logo', on);
}
let xlLogoMemo = null;
/** the logo as PNG bytes for the Excel files */
async function xlLogo() {
  const L = state.logo; if (!L) return null;
  if (xlLogoMemo && xlLogoMemo.src === L.dataUrl) return xlLogoMemo.v;
  let png = null;
  try {
    if (/^data:image\/png;base64,/.test(L.dataUrl)) { const bin = atob(L.dataUrl.split(',')[1]); png = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i); }
    else { const img = await loadImg(L.dataUrl), cv = document.createElement('canvas'); cv.width = L.w; cv.height = L.h; cv.getContext('2d').drawImage(img, 0, 0, L.w, L.h); png = new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/png'))).arrayBuffer()); }
  } catch (e) { png = null; }
  const v = png ? { png, w: L.w, h: L.h, alt: L.builtin ? 'Beyond One logo' : 'Logo' } : null;
  xlLogoMemo = { src: L.dataUrl, v }; return v;
}
const logoTag = (src, maxW = 140) => { const L = state.logo; if (!L) return ''; const w = Math.min(maxW, L.w), h = Math.round(w * L.h / L.w); return `<p class="MsoNormal" style="margin:0in"><img width="${w}" height="${h}" style="width:${w}px;height:${h}px" src="${src}" alt="Logo"></p>`; };

// ---------------------------------------------------------------- the incentive email (Mohammed's text) and the final emails
const INC_DEFAULTS = {
  to: 'KSA-Member Care Champion <MemberCareChampion.ksa@beyond.one>; KSA-FRiENDi MC Champions <FriendiMCChampions@virginmobile.sa>; KSA-Member Care Management Team <MemberCareManagementTeam.ksa@beyond.one>',
  cc: '', greeting: 'Dear Champions,', sign: 'Thanks and good luck', attach: true,
};
const incLabel = (y, m) => `${MON[m - 1]} - ${y}`;
function incDeadlineText() { const [y, m, d] = mailDeadlineIso().split('-').map(Number); return d ? `${d} ${MON[m - 1]}-${y}` : ''; }
function subjectFor(kind, stage) {
  const k = `${kind}-${stage}`; if (state.mailSubjects[k] != null) return state.mailSubjects[k];
  const { y, m } = kind === 'inc' ? incMonth() : mailMonth(), M = MON[m - 1];
  if (kind === 'ded') return stage === 'final' ? `MC Monthly Deduction | ${M} ${y} Final.` : `MC Monthly Deduction | ${M} ${y} For Review.`;
  return stage === 'final' ? `${M} ${y} incentive Data – Final` : `${M} ${y} incentive Data for review`;
}
function incMonth() { const w = state.incWb; return w && w.rows.y ? { y: w.rows.y, m: w.rows.m } : { y: state.y, m: state.m }; }
function incData() {
  if (state.incWb) return { ...state.incWb.rows, y: incMonth().y, m: incMonth().m, src: 'file' };
  const md = incModel(); return md ? { ...incRowsFromModel(md), src: 'page' } : null;
}
function incMailModel(stage) {
  const d = incData(), warns = [], { y, m } = incMonth();
  if (!d) warns.push('Nothing to send yet. Drop the exports and the attendance files on Import, or drop the incentive workbook here.');
  else {
    if (!d.att.length) warns.push('The Attendance Report is empty. Drop the supervisors\' attendance files on Import.');
    if (d.src === 'page' && state.attRes && state.attRes.clashes.some(c => c.chosen === undefined)) warns.push(`${plural(state.attRes.clashes.filter(c => c.chosen === undefined).length, 'attendance decision')} still open. Open the notifications to choose.`);
  }
  let changes = null, snap = null;
  if (stage === 'final' && d) { snap = snapOf('inc'); if (snap) changes = incDiff(snap.data, d); else warns.push('No review version saved for this month, so the changes since the review cannot be listed. Copy or download the review email first, or drop the file that was sent for review.'); }
  const att = state.incWb ? { name: state.incWb.name, size: state.incWb.size } : { name: WriterInc.fileName(y, m), size: null };
  return { kind: 'inc', stage, y, m, d, warns, changes, snap, subject: subjectFor('inc', stage), attach: att };
}
function incMailHtml(md, logoSrc, preview) {
  const P = (inner, st = '') => `<p class="MsoNormal" style="margin:0in;font-size:11.0pt;${F};${st}">${inner}</p>`, gap = P('&nbsp;');
  const im = state.incMail, label = incLabel(md.y, md.m), lines = t => String(t || '').split(/\r?\n/).map(l => esc(l) || '&nbsp;');
  let b = lines(im.greeting).map(l => P(`<span lang="EN-GB">${l}</span>`)).join('') + gap;
  if (md.stage === 'final') {
    b += P(`<span lang="EN-GB" style="color:black">Kindly find attached the final data which will be used to calculate your </span><span lang="EN-GB">incentive for<b> ${esc(label)}</b>, after the review.</span>`) + gap;
    if (md.changes && md.changes.length) {
      b += P('<span lang="EN-GB">The following changes were made after the review:</span>') + gap;
      const th = t => `<td style="background:#1F3864;padding:0in 5.4pt 0in 5.4pt;height:.3in"><p class="MsoNormal" style="margin:0in;${F}"><b><span style="font-size:10.0pt;color:white">${t}</span></b></p></td>`;
      const td = t => `<td valign="top" style="border:solid #BFBFBF 1.0pt;padding:2pt 5.4pt 2pt 5.4pt"><p class="MsoNormal" style="margin:0in;${F}"><span style="font-size:10.0pt;color:black">${t}</span></p></td>`;
      b += `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${th('Name')}${th('What changed')}</tr>${md.changes.map(c => `<tr>${td(esc(c.n))}${td(esc(c.what))}</tr>`).join('')}</table>` + gap;
    } else if (md.changes) b += P('<span lang="EN-GB">No changes were made after the review.</span>') + gap;
  } else {
    b += P(`<span lang="EN-GB" style="color:black">Kindly find the attached data which will be used to calculate your </span><span lang="EN-GB">incentive for<b> ${esc(label)}</b></span>`) + gap;
    b += P(`<span lang="EN-GB">Please review it and If you have any concerns, please <b><u>refer to your direct leader, the deadline is ${esc(incDeadlineText())}.</u></b></span>`) + gap;
  }
  b += P('<span lang="EN-GB">The attached include 3 tabs:</span>') + gap;
  b += `<ul style="margin-top:0in;margin-bottom:0in" type="disc">${['Adherence data .', 'AHT.', 'Attendance data.'].map(t => `<li class="MsoListParagraph" style="margin-left:0in;font-size:11.0pt;${F}"><span lang="EN-GB">${t}</span></li>`).join('')}</ul>` + gap;
  if (md.stage !== 'final') b += P('<b><u><span lang="EN-GB" style="background:yellow;mso-highlight:yellow">Make sure to send your objection to your direct leader and CC me</span></u></b>') + gap;
  b += lines(im.sign).map(l => P(`<span lang="EN-GB">${l}</span>`)).join('');
  if (logoSrc && state.mailLogo) b += gap + logoTag(logoSrc);
  return `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">${preview ? '<style>body{margin:18px 20px;}</style>' : ''}</head><body lang="EN-US" style="word-wrap:break-word;background:#ffffff"><div class="WordSection1">${b}</div></body></html>`;
}
function incMailText(md) {
  const im = state.incMail, label = incLabel(md.y, md.m), out = [im.greeting, ''];
  if (md.stage === 'final') {
    out.push(`Kindly find attached the final data which will be used to calculate your incentive for ${label}, after the review.`, '');
    if (md.changes && md.changes.length) { out.push('The following changes were made after the review:', '', 'Name\tWhat changed'); md.changes.forEach(c => out.push(`${c.n}\t${c.what}`)); out.push(''); }
    else if (md.changes) out.push('No changes were made after the review.', '');
  } else out.push(`Kindly find the attached data which will be used to calculate your incentive for ${label}`, '', `Please review it and If you have any concerns, please refer to your direct leader, the deadline is ${incDeadlineText()}.`, '');
  out.push('The attached include 3 tabs:', '', '• Adherence data .', '• AHT.', '• Attendance data.', '');
  if (md.stage !== 'final') out.push('Make sure to send your objection to your direct leader and CC me', '');
  out.push(im.sign);
  return out.join('\r\n');
}
/** .eml with an optional inline logo and an optional attachment; opens as a new draft in Outlook */
function emlFile({ to, cc, subject, text, html, attach, logo }) {
  const rnd = () => Math.random().toString(36).slice(2), mix = 'mc_' + rnd(), rel = 'mcrel_' + rnd(), alt = 'mcalt_' + rnd();
  const H = ['X-Unsent: 1'];
  if (to.length) H.push('To: ' + to.map(hdrAddr).join(',\r\n ')); if (cc.length) H.push('Cc: ' + cc.map(hdrAddr).join(',\r\n '));
  H.push('Subject: ' + hdrWord(subject), 'MIME-Version: 1.0');
  const altPart = [`Content-Type: multipart/alternative; boundary="${alt}"`, '', `--${alt}`, 'Content-Type: text/plain; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', b64(enc8.encode(text)), '',
    `--${alt}`, 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', b64(enc8.encode(html)), '', `--${alt}--`];
  let body = altPart;
  if (logo) {
    const bin = Uint8Array.from(atob(logo.dataUrl.split(',')[1]), c => c.charCodeAt(0));
    body = [`Content-Type: multipart/related; boundary="${rel}"; type="multipart/alternative"`, '', `--${rel}`, ...altPart, '', `--${rel}`, 'Content-Type: image/png; name="logo.png"', 'Content-ID: <logo@mc>', 'Content-Disposition: inline; filename="logo.png"', 'Content-Transfer-Encoding: base64', '', b64(bin), '', `--${rel}--`];
  }
  const files = (Array.isArray(attach) ? attach : attach ? [attach] : []).filter(f => f && f.bytes);
  if (files.length) {
    const parts = files.flatMap(f => { const fn = String(f.name).replace(/"/g, ''); return ['', `--${mix}`, `Content-Type: ${f.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}; name="${fn}"`, `Content-Disposition: attachment; filename="${fn}"`, 'Content-Transfer-Encoding: base64', '', b64(f.bytes)]; });
    return [...H, `Content-Type: multipart/mixed; boundary="${mix}"`, '', `--${mix}`, ...body, ...parts, '', `--${mix}--`, ''].join('\r\n');
  }
  return [...H, ...body, ''].join('\r\n');
}
async function incBytes() {
  if (state.incWb) return state.incWb.bytes;
  if (!state.ctx) return null;
  return xlLogo().then(lg => { state.ctx.logo = lg; return WriterInc.build(state.ctx, { model: incModel() }); });
}
async function buildInc() {
  if (!state.ctx || state.incBuilding) return;
  state.incBuilding = true; renderExport();
  try { const bytes = await incBytes(); const fn = WriterInc.fileName(state.y, state.m); const ok = await save(fn, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); if (ok) state.incBuilt = { ver: state.ver, fn, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }; }
  catch (e) { toast('Could not build the incentive file: ' + (e && e.message ? e.message : e)); }
  finally { state.incBuilding = false; renderExport(); }
}

// ---------------------------------------------------------------- forms (one-to-one and final), saved per agent
const FORM_TITLE = { '1to1': 'One-to-one form', final: 'Final form' };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* none */ } };
const formId = (kind, pid, key) => `${kind}_${key || monthKey()}_${pid}`;
function formDefaults(kind, pid) {
  const p = (state.ctx ? state.ctx.roster : rosterRows()).find(x => x._id === pid) || state.roster.find(x => x._id === pid) || {};
  const m = state.byId.get(pid), set = state.settings, per = `${MONTH_LONG[state.m - 1]} ${state.y}`;
  const results = [], details = [];
  const K = state.kpi.get(pid);
  if (K) {   // only the scorecard KPIs, in the card's order
    for (const x of K.res.rows) results.push({ on: true, metric: x.k.name, target: Kpi.target(x.k), result: Kpi.fmtVal(x.k, x.v), status: x.r == null ? 'No value' : `Ranking ${x.r} of 5` });
    results.push({ on: false, metric: 'Final % (scorecard)', target: '', result: pct1(K.res.finalPct), status: K.res.finalRank == null ? '' : `Ranking ${K.res.finalRank.toFixed(2)}` });
  } else if (m) {   // no scorecard for this team: the Genesys KPIs
    if (m.avg != null) results.push({ on: true, metric: 'Adherence', target: pct(set.target), result: pct(m.avg), status: m.avg < set.target ? 'Below target' : 'On target' });
    if (m.aht != null) results.push({ on: true, metric: 'AHT', target: '', result: mss(m.aht), status: '' });
  }
  if (m && m.adh) {
    const under = m.adh.map((v, i) => [i + 1, v]).filter(([, v]) => v != null && v < set.target);
    if (under.length) details.push(`Days under ${pct(set.target, 0)} adherence: ${under.map(([d, v]) => `${d} ${MON[state.m - 1]} (${pct(v)})`).join(', ')}.`);
  }
  const exp = normSpace(normSpace(p.sys) ? p.sys : p.name);
  const base = {
    kind, pid, y: state.y, m: state.m, period: per, supervisor: lsGet('mc-sup'), date: todayIso(),
    agent: { name: exp, id: Core.cleanId(p.nid) || normSpace(p.nid), team: p.team || '', teamName: DEP_NAMES[p.team] || '', brand: p.brand || '' },
    ref: `${kind === 'final' ? 'FIN' : '1TO1'}-${monthKey()}-${Core.cleanId(p.nid) || String(pid).slice(-6)}`,
    topics: { kpi: true, adh: true }, results, details, discussion: '', rootCause: '', agentComments: '', actions: [{}, {}, {}], reviewDate: '',
    heldOn: '', oneRef: '', findings: '', outcome: '', actionPlan: '', consequence: 'If the expected improvement is not reached by the review date, further action may be taken in line with company policy.',
    manager: set.manager, managerTitle: set.managerTitle,
  };
  if (kind === 'final') {
    const one = state.forms.find(f => f.id === formId('1to1', pid));
    if (one) Object.assign(base, { heldOn: one.date, oneRef: one.ref, supervisor: one.supervisor || base.supervisor, results: one.results, details: one.details, agentComments: one.agentComments || '',
      actionPlan: (one.actions || []).filter(a => a && a.action).map(a => `${a.action}${a.owner ? ` (${a.owner}` : ''}${a.due ? `${a.owner ? ', ' : ' ('}by ${Forms.fmtDate(a.due)}` : ''}${a.owner || a.due ? ')' : ''}`).join('\n'), reviewDate: one.reviewDate || '' });
    base.findings = base.results.filter(r => r.on !== false && r.metric).map(r => `${r.metric}: ${r.result}${r.target ? ` (target ${r.target})` : ''}`).join('. ') + (base.results.length ? '.' : '');
  }
  return base;
}
function openForm(kind, pid, key) {
  key = key || formMonthKey();   // a workspace month, or the month being built
  const id = formId(kind, pid, key), saved = formLookup(id);
  state.form = saved ? withReply(clone(saved)) : key === monthKey() && state.ctx && canBuild() && state.ws === 'build' ? formDefaults(kind, pid) : formDefaultsHist(kind, pid, key);
  state.form.id = id;
  renderForm(); openDrawer('dForm');
}
/** who fills in and changes forms: supervisors, the senior manager and the admin (everyone else reads them) */
const canEditForms = () => ['spv', 'senior', 'admin'].includes(roleNow()) || !Auth.user();
function renderForm() {
  const f = state.form; if (!f) return;
  try { fuAttach(f); } catch (e) { console.error('[MC] fuAttach:', e); }   // last month's one-to-one: its actions and KPIs come back here
  $('h-form').textContent = `${FORM_TITLE[f.kind]} – ${f.agent.name}`;
  $('formSub').textContent = `${f.period} · ${f.agent.team}${f.agent.brand ? ' · ' + f.agent.brand : ''}`;
  const inp = (k, v, attrs = '') => `<input data-ff="${k}" value="${esc(v ?? '')}" ${attrs}>`;
  const ta = (k, v, rows = 3, ph = '') => `<textarea data-ff="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(v ?? '')}</textarea>`;
  const fld = (label, html, hint) => `<div class="field"><span class="lbl">${label}</span>${html}${hint ? `<small>${hint}</small>` : ''}</div>`;
  const resRows = f.results.map((r, i) => `<tr><td class="chk"><input type="checkbox" data-fr="${i}" data-k="on" ${r.on !== false ? 'checked' : ''} aria-label="Include ${esc(r.metric || 'row')}"></td>${['metric', 'target', 'result', 'status'].map(k => `<td><input class="cell" data-fr="${i}" data-k="${k}" value="${esc(r[k] || '')}" aria-label="${k}"></td>`).join('')}</tr>`).join('');
  const odd = [f.agent.name, f.supervisor].some(x => Forms.hasOdd(x));
  const fl = formLocked(f), ro = fl || !canEditForms(), stat = f.status || 'held';
  const sg = sigOf(f.id), ss = sg ? sigState(f) : 'none';
  // an agent with an account fills in their part on their own page; what they sent shows here, marked, and cannot be changed
  const acct = agentHasAccount(f.pid), first = esc(firstName(f.agent.name) || 'The agent'), rp = replyOf(f.id), by = new Set(f.byAgent || []);
  const tag = `<span class="fromag">from ${first}</span>`;
  const agentBox = (label, k, date) => fld(`${label} ${tag}`, `<div class="rbox ro" dir="auto">${f[k] ? (date ? esc(Forms.fmtDate(f[k])) : esc(f[k]).replace(/\n/g, '<br>')) : '<i class="subtle">–</i>'}</div>`);
  const ph = acct ? `Leave it empty: ${firstName(f.agent.name) || 'the agent'} writes it on their own page` : 'Leave empty for the agent to write by hand';
  let h = (sg ? `<div class="banner ${ss === 'signed' ? 'info' : ''}">${ss === 'signed' ? `<b>Signed by ${esc(f.agent.name)}</b> in the tool, ${esc(fmtWhen(sg.at))}.${sg.comment ? ` Their comment: “${esc(sg.comment)}”` : ''} The PDF carries the signature.` : `<b>${esc(f.agent.name)} signed an earlier version</b> on ${esc(fmtWhen(sg.at))}. After a change they are asked to sign again.`}</div>` : '');
  if (acct && ss !== 'signed') h += f.verdict && !replyNew(f) ? `<div class="banner info"><b>Final sent to ${first}</b> ${esc(fmtWhen(f.verdict.at))}: ${f.verdict.d === 'rejected' ? 'rejected' : 'accepted'}. ${first} reads it and signs it on their own page.</div>`
    : rp || f.replyAt ? `<div class="banner info"><b>${first} sent their part</b> ${esc(fmtWhen((rp && rp.at) || f.replyAt))}. Their answers are marked “from ${first}”. Accept or reject them with your final comment at the end of the form, then send the final: ${first} signs after that.</div>`
      : `<div class="banner"><b>${first} fills in their part</b> on their own page (${f.kind === 'final' ? 'their explanation' : 'what was discussed, the root cause, their comments, the actions and the next review date'}) and sends it to you. Leave those places empty for them; you send the final after reading it.</div>`;
  h += (fl ? `<div class="banner lockban"><b>Final.</b> ${esc(fl)} Only the senior manager can change it now; you can still download the PDF.</div>` : !canEditForms() ? '<div class="banner lockban"><b>Read only.</b> The supervisor fills in the one-to-one; you can download the PDF.</div>' : '') + (ro ? '<fieldset class="formlock" disabled>' : '')
    + `<div class="grid2 tight">${fld('Status', `<div class="seg wrap" role="radiogroup" aria-label="Status">${FORM_STATUS.map(([k, l]) => `<button type="button" role="radio" aria-checked="${stat === k}" aria-pressed="${stat === k}" data-fstatus="${k}">${esc(l)}</button>`).join('')}</div>`)}${fld('Arranged for', inp('plannedAt', f.plannedAt, 'type="date"'), 'The day the one-to-one is planned')}</div>`
    + `<div class="grid2 tight">${fld('Supervisor', inp('supervisor', f.supervisor, 'placeholder="Your name" autocomplete="name"'))}${fld(f.kind === 'final' ? 'Date of this form' : 'Date of the one-to-one', inp('date', f.date, 'type="date"'))}</div>`;
  if (odd) h += '<div class="banner">A name has letters the PDF font cannot show (for example Arabic). Type it in English letters here.</div>';
  if (f.kind === 'final') h += `<div class="grid2 tight">${fld('One-to-one held on', inp('heldOn', f.heldOn, 'type="date"'))}${fld('One-to-one reference', inp('oneRef', f.oneRef))}</div>`;
  else h += fld('Topics', `<div class="chips">${Forms.TOPICS.map(([k, l]) => `<label class="chip"><input type="checkbox" data-ftopic="${k}" ${f.topics[k] ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>`);
  h += `<section class="sec"><h3>Results for ${esc(f.period)}</h3><div class="tablewrap formtab"><table><thead><tr><th class="chk"><span class="sr">Include</span></th><th>Metric</th><th>Target</th><th>Result</th><th>Status</th></tr></thead><tbody>${resRows}</tbody></table></div>
    <button class="linkbtn" data-fadd>Add a row</button> · <button class="linkbtn" data-freset title="Replace the rows with this month's scorecard KPIs">Refresh from the KPI results</button>${f.details && f.details.length ? `<p class="hint">${esc(f.details.join(' '))}</p>` : ''}</section>`;
  if (f.kind === 'final') {
    h += fld('Summary of findings', ta('findings', f.findings, 4));
    h += by.has('agentComments') ? agentBox("Agent's explanation", 'agentComments') : fld("Agent's explanation", ta('agentComments', f.agentComments, 3, ph));
    h += fld('Outcome', `<div class="seg wrap" role="radiogroup" aria-label="Outcome">${Forms.OUTCOMES.map(([k, l]) => `<button role="radio" aria-checked="${f.outcome === k}" aria-pressed="${f.outcome === k}" data-fout="${k}">${esc(l)}</button>`).join('')}</div>`, 'Chosen by the supervisor.');
    h += fld('Action plan', ta('actionPlan', f.actionPlan, 3));
    h += `<div class="grid2 tight">${fld('Review date', inp('reviewDate', f.reviewDate, 'type="date"'))}<div></div></div>`;
    h += fld('Note under the outcome', ta('consequence', f.consequence, 2));
    h += `<div class="grid2 tight">${fld('Manager signing', inp('manager', f.manager))}${fld('Manager title', inp('managerTitle', f.managerTitle))}</div>`;
  } else {
    h += safeHtml(fuFormHtml, f);
    h += by.has('discussion') ? agentBox('What was discussed', 'discussion') : fld('What was discussed', ta('discussion', f.discussion, 4, acct ? ph : ''));
    h += by.has('rootCause') ? agentBox('Root cause', 'rootCause') : fld('Root cause', ta('rootCause', f.rootCause, 2, acct ? ph : ''));
    h += by.has('agentComments') ? agentBox("Agent's comments", 'agentComments') : fld("Agent's comments", ta('agentComments', f.agentComments, 2, ph));
    const ag = new Set(f.agentRows || []);
    h += `<section class="sec"><h3>Agreed actions</h3><div class="tablewrap formtab"><table><thead><tr><th>Action</th><th>Owner</th><th>Due date</th></tr></thead><tbody>${f.actions.map((a, i) => ag.has(i)
      ? `<tr class="fromagrow"><td dir="auto">${esc(a.action || '')} ${tag}</td><td>${esc(a.owner || '')}</td><td>${esc(Forms.fmtDate(a.due) || '')}</td></tr>`
      : `<tr><td><input class="cell" data-fa="${i}" data-k="action" value="${esc(a.action || '')}" aria-label="Action ${i + 1}"></td><td><input class="cell" data-fa="${i}" data-k="owner" value="${esc(a.owner || '')}" aria-label="Owner ${i + 1}"></td><td><input class="cell" type="date" data-fa="${i}" data-k="due" value="${esc(a.due || '')}" aria-label="Due date ${i + 1}"></td></tr>`).join('')}</tbody></table></div>${acct && !ag.size ? `<p class="hint">${first} can add their own actions on their page.</p>` : ''}</section>`;
    h += `<div class="grid2 tight">${by.has('reviewDate') ? agentBox('Next review date', 'reviewDate', true) : fld('Next review date', inp('reviewDate', f.reviewDate, 'type="date"'))}<div></div></div>`;
  }
  // the final: accepted or rejected, with a comment, sent back to the agent, who then signs
  if (acct) {
    const vd = f.vd || (f.verdict && f.verdict.d) || '', vc = f.vc != null ? f.vc : f.verdict ? f.verdict.comment || '' : '';
    h += `<section class="sec verdict"><h3>Your final</h3><p class="hint">${rp || f.replyAt ? `Read ${first}'s part, then accept or reject it with your final comment and send it back.` : `When ${first} sends their part, accept or reject it with your final comment and send it back (you can also send it without their part).`} ${first} signs the form after that.</p>
      ${fld('Decision', `<div class="seg wrap" role="radiogroup" aria-label="Decision">${[['accepted', 'Accepted'], ['rejected', 'Rejected']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${vd === k}" aria-pressed="${vd === k}" data-fvd="${k}">${l}</button>`).join('')}</div>`)}
      ${fld('Final comment', `<textarea data-ff="vc" rows="3" placeholder="What you decided, and why">${esc(vc)}</textarea>`)}
      <div class="formbtns"><button type="button" class="btn primary" data-fsendfinal>${f.verdict ? 'Send the final again' : `Send the final to ${first}`}</button>${f.verdict ? `<span class="hint">Sent ${esc(fmtWhen(f.verdict.at))}${f.verdict.byName ? ' by ' + esc(f.verdict.byName) : ''}${replyNew(f) ? `; ${first} sent their part again since` : ''}.</span>` : ''}</div></section>`;
  }
  h += `<p class="hint">${state.logo ? 'Your logo is at the top of the PDF.' : 'Add your logo in Settings to show it at the top of the PDF.'} Saved forms are listed on the person's page${f.savedByName ? ` · last saved by ${esc(f.savedByName)}${f.savedAt ? ', ' + esc(fmtWhen(f.savedAt)) : ''}` : ''}.</p>`;
  if (ro) h += '</fieldset>';
  $('formBody').innerHTML = h;
  $('formSave').hidden = ro;
  $('formSwitch').hidden = !canEditForms();
}
function readFormInputs() {
  const f = state.form; if (!f) return;
  $('formBody').querySelectorAll('[data-ff]').forEach(el => { f[el.dataset.ff] = el.value; });
  $('formBody').querySelectorAll('[data-fr]').forEach(el => { const r = f.results[+el.dataset.fr]; if (r) r[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
  $('formBody').querySelectorAll('[data-fa]').forEach(el => { const a = f.actions[+el.dataset.fa]; if (a) a[el.dataset.k] = el.value; });
  $('formBody').querySelectorAll('[data-ftopic]').forEach(el => { f.topics[el.dataset.ftopic] = el.checked; });
  $('formBody').querySelectorAll('[data-fu]').forEach(el => { const a = f.followup && f.followup.actions[+el.dataset.fu]; if (a) a.status = el.value; });
  if (normSpace(f.supervisor)) lsSet('mc-sup', normSpace(f.supervisor));
}
function saveForm(quiet) {
  if (!state.form) return;
  const fl = formLocked(state.form); if (fl) { if (!quiet) toast(`${fl} Only the senior manager can change it.`); return; }
  if (!canEditForms()) return;
  readFormInputs(); const f = clone(state.form); f.savedAt = new Date().toISOString();
  const u = Auth.user && Auth.user(); f.savedBy = u ? u.id || '' : ''; f.savedByName = whoNow(); if (!f.owner) f.owner = f.savedBy; if (!f.status) f.status = 'held';
  state.forms = state.forms.filter(x => x.id !== f.id).concat(f);
  if (state.db) queueWrite('forms/' + f.id, () => state.db.doc('forms/' + f.id).set(f));
  saveFinalFormCopy(f);
  if (state.db && agentHasAccount(f.pid)) publishAgent(f.pid, fkey(f), { quiet: true });
  if (!quiet) toast(state.db ? (sigOf(f.id) && sigState(f) === 'changed' ? 'Form saved. The agent had signed the earlier version: they are asked to sign again.' : agentHasAccount(f.pid) && !f.verdict ? `Form saved. ${firstName(f.agent.name)} sees it on their page; send the final (end of the form) once you have read their part.` : 'Form saved') : 'Form kept until you close the page');
  if (!$('dPerson').hidden) renderPerson();
  if (state.ws !== 'build') renderWs();
}
/** the supervisor's final: accepted or rejected, with a comment, back to the agent, who can sign it now */
function sendFinal(btn) {
  if (!state.form) return;
  const fl = formLocked(state.form); if (fl) { toast(`${fl} Only the senior manager can change it.`); return; }
  if (!canEditForms()) return;
  readFormInputs();
  const f = state.form, first = firstName(f.agent.name) || 'The agent';
  const d = f.vd || (f.verdict && f.verdict.d) || '', c = normSpace(f.vc != null ? f.vc : f.verdict ? f.verdict.comment : '');
  if (!d) { toast('Choose Accepted or Rejected first.'); const b = $('formBody').querySelector('[data-fvd]'); if (b) b.focus(); return; }
  if (c.length < 3) { toast('Write your final comment.'); const t = $('formBody').querySelector('[data-ff="vc"]'); if (t) t.focus(); return; }
  if (Forms.hasOdd(c)) { toast('Write the comment in English letters: the PDF form cannot show these.'); return; }
  if (!replyOf(f.id) && !f.replyAt && !f.verdict && btn && !btn.dataset.confirm) { btn.dataset.confirm = '1'; btn.textContent = `${first} has not sent their part: click again to send anyway`; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.confirm; btn.textContent = `Send the final to ${first}`; } }, 5000); return; }
  f.verdict = { d, comment: c, at: new Date().toISOString(), by: (Auth.user() || {}).id || '', byName: whoNow() };
  if (f.status === 'planned' || !f.status) { f.status = 'held'; f.date = todayIso(); }
  saveForm(true); delete state.form.vd; delete state.form.vc;
  toast(`Final sent to ${first} (${d}). ${first} reads it and signs it on their own page.`);
  renderForm();
}
async function formPdf(f) {
  const g = sigForPdf(f);
  const data = { ...f, results: (f.results || []).filter(r => r.on !== false), logo: await logoPixels(), agentSig: g ? await sigPixels(g) : null };
  return f.kind === 'final' ? Forms.finalForm(data) : Forms.oneToOne(data);
}
const formFile = f => `${f.kind === 'final' ? 'Final form' : 'One-to-one'} - ${normSpace(f.agent.name).replace(/[\\/:*?"<>|]/g, '')} - ${MON[f.m - 1]} ${f.y}.pdf`;
async function downloadForm(f) {
  try { const bytes = await formPdf(f); await save(formFile(f), new Blob([bytes], { type: 'application/pdf' })); }
  catch (e) { toast('Could not make the PDF: ' + (e && e.message ? e.message : e)); }
}
function formsListHtml(pid) {
  const L = state.forms.filter(f => f.pid === pid).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))), mk = formMonthKey(), lk = monthLocked(mk) && !isSenior();
  return `<section class="sec"><h3>Forms</h3>${lk ? `<p class="hint">${esc(ymLabel(mk))} is final, so its forms are read-only.</p>` : ''}${canEditForms() ? `<div class="formbtns"><button class="btn sm" data-newform="1to1">One-to-one form · ${esc(MON[+mk.slice(5) - 1])}</button><button class="btn sm" data-newform="final">Final form · ${esc(MON[+mk.slice(5) - 1])}</button></div>` : ''}
    ${L.length ? `<ul class="ilist">${L.map(f => `<li><span class="nm">${esc(FORM_TITLE[f.kind])} · ${esc(MON[f.m - 1])} ${f.y}</span><span class="sg">${formStatusChip(f)} ${sigChip(f)} ${f.kind === 'final' && f.outcome ? esc((Forms.OUTCOMES.find(o => o[0] === f.outcome) || [, ''])[1]) + ' · ' : ''}${f.savedAt ? 'saved ' + esc(fmtWhen(f.savedAt)) : f.plannedAt ? 'arranged for ' + esc(Forms.fmtDate(f.plannedAt)) : ''}${f.savedByName ? ' by ' + esc(f.savedByName) : ''}</span><span class="sp"></span><span class="acts"><button class="btn sm ghost" data-openform="${esc(f.id)}">Open</button><button class="btn sm" data-pdfform="${esc(f.id)}">PDF</button></span></li>`).join('')}</ul>` : '<p class="subtle" style="margin:6px 0 0">No forms for this person yet.</p>'}</section>`;
}
const HOLIDAY_RE = /national day|founding day|eid|holiday/i;
/** scheduled days against days attended, as the incentive counts them with the month's rules (Attend and late days, and every day
    whose code the rules count as scheduled); why = the scheduled days not attended */
function attSA(days) {
  const c = Kpi.countDays(days, countFor(monthKey())), why = Object.entries(c.byCode).filter(([, n]) => n).map(([code, n]) => `${n} ${code === 'Absent' ? 'absent' : code}`);
  return { sched: c.sched, actual: c.attended, why: why.join(' · ') };
}
function attStripHtml(pid) {
  const a = attOf(pid); if (!state.attFiles.length) return '';
  if (!a) return '<section class="sec"><h3>Attendance</h3><p class="subtle">Not found in the attendance files.</p></section>';
  const ND = Core.daysIn(state.y, state.m), cnt = Att.counts(a.days, a.tardyFile);
  const cls = v => (v == null ? 'na' : typeof v === 'number' ? 'td' : { Attend: 'at', OFF: 'off', AL: 'al', SL: 'sl', Absent: 'ab' }[v] || 'ot');
  const short = v => (v == null ? '' : typeof v === 'number' ? String(v) : { Attend: '✓', Absent: 'Abs', 'National Day': 'ND', 'Founding Day': 'FD', 'Compassionate Leave': 'CL', Unpaid: 'UPL', Paternity: 'PL', Marriage: 'MRL' }[v] || String(v).slice(0, 4));
  const sa = attSA(a.days);
  return `<section class="sec"><h3>Attendance</h3><div class="minis"><div title="As the incentive counts them: Attend and late days, and the leaves and absences the month's rules count as scheduled."><b>${sa.sched} / ${sa.actual}</b><span>Scheduled / Actual days${sa.sched > sa.actual && sa.why ? ` · ${esc(sa.why)}` : ''}</span></div><div><b>${cnt.tardyMin}</b><span>Tardy (min)${a.tardyFile ? ' – from the Tardy column' : ''}</span></div><div><b>${cnt.absent}</b><span>Absent</span></div><div><b>${cnt.al + cnt.sl}</b><span>AL + SL</span></div></div>
    <div class="astrip">${Array.from({ length: ND }, (_, i) => { const v = a.days[i]; return `<div class="${cls(v)}" title="${Core.weekday(state.y, state.m, i + 1)} ${i + 1} ${MON[state.m - 1]}: ${esc(v == null ? 'blank' : typeof v === 'number' ? v + ' min late' : v)}"><small>${i + 1}</small><b>${esc(short(v))}</b></div>`; }).join('')}</div>
    <p class="hint">From ${esc(a.srcs.join('; '))}</p></section>`;
}

// ---------------------------------------------------------------- emails: deduction and incentive, for review and final
const MAIL_DEFAULTS = {
  to: 'KSA-Member Care Management Team <MemberCareManagementTeam.ksa@beyond.one>; Mohammed Alshubily <Mohammed.Alshubily@beyond.one>; Rasha Mugaddam <rasha.mogaddam@beyond.one>',
  cc: 'Essam AlZahrani <essam.alzhrani@beyond.one>',
  greeting: 'Hello, Team.',
  intro: 'Please review the data below and notify me if there are any changes.',
  introFinal: 'Please find below the final data after the review.',
  sign: 'Best Regards,',
  absScope: 'brands', zeros: false, attach: true,
};
state.mail = clone(MAIL_DEFAULTS);
state.incMail = clone(INC_DEFAULTS);
const ordinal = d => d + (d % 100 >= 11 && d % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th');
const idText = v => { if (v == null || v === '') return 'NA'; if (typeof v === 'number') return String(Math.round(v)); const id = Core.cleanId(v); return id && String(v).replace(/\D/g, '') === id ? id : (normSpace(v) || 'NA'); };
const mailShared = () => state.mailSrc === 'shared';
function mailMonth() { if (mailShared()) { const k = wsMonthNow() || monthKey(); return { y: +k.slice(0, 4), m: +k.slice(5) }; } const r = state.wb && state.wb.report; return r ? { y: r.y, m: r.m } : { y: state.y, m: state.m }; }
function mailDeadlineIso() {
  if (state.mailDeadline) return state.mailDeadline;
  const { y, m } = mailMonth(); const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-10`;
}
const mailCfg = () => (state.mailKind === 'inc' ? state.incMail : state.mail);
const doneKey = () => `${state.mailKind}-${state.mailStage}`;
function absScopeOk(row) {
  const s = state.settings, sc = state.mail.absScope;
  if (sc === 'all') return true;
  if (!s.dedBrands.includes(row.brand)) return false;
  return sc === 'scope' ? s.dedTeams.includes(row.team) : true;
}
/* Read a workbook made by this tool (cached values, so Excel's last save counts). */
function readReport(sheets) {
  const by = n => sheets.find(s => normName(s.name) === normName(n));
  const DE = by('Deduction'), AT = by('Attendance'), CA = by('Calc'), RO = by('Roster');
  if (!DE || !AT || !CA || !RO) return { error: 'This is not a monthly report made by this tool. It needs the Deduction, Attendance and Roster sheets.' };
  const dayCols = []; (AT.rows[4] || []).forEach((v, i) => { if (v instanceof Date) dayCols.push([i, v.getUTCDate()]); });
  const d0 = (AT.rows[4] || []).find(v => v instanceof Date);
  if (!d0) return { error: 'The Attendance sheet has no dates in row 5.' };
  const y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1;
  const keyCol = (AT.rows[3] || []).findIndex(v => normName(v) === 'key');
  const calc = new Map();
  CA.rows.forEach((r, i) => { if (i < 4 || r[0] == null || r[0] === '') return; calc.set(String(r[0]).toLowerCase(), { exp: normSpace(r[1]), status: normSpace(r[7]), shown: r[8], row: i }); });
  const totCol = (DE.rows[3] || []).findIndex(v => /^total \(min\)$/i.test(normSpace(v)));
  if (totCol < 0) return { error: 'The Deduction sheet has no "Total (min)" column.' };
  const ded = [];
  DE.rows.forEach((r, i) => {
    if (i < 5) return; const nm = normSpace(r[1]); if (!nm) return;
    ded.push({ id: idText(r[0]), name: nm.replace(/^[⛔⚠]️?\s*/, ''), brand: normSpace(r[2]), team: normSpace(r[3]), total: typeof r[totCol] === 'number' ? Math.round(r[totCol]) : 0, inactive: nm.startsWith('⛔') });
  });
  const att = [];
  AT.rows.forEach((r, i) => {
    if (i < 5 || (!normSpace(r[0]) && !normSpace(r[1]) && typeof r[0] !== 'number')) return;
    const c = keyCol >= 0 ? calc.get(String(r[keyCol] ?? '').toLowerCase()) : null, ro = c ? (RO.rows[c.row] || []) : null;
    att.push({
      id: idText(r[0]), name: c && c.exp ? c.exp : normSpace(r[1]), brand: ro ? normSpace(ro[2]) : normSpace(r[3]), team: ro ? normSpace(ro[3]) : normSpace(r[2]),
      onRoster: !!c, shown: c ? c.shown !== 0 : true,
      days: dayCols.filter(([ci]) => normName(r[ci]) === 'absent').map(([, d]) => d),
      filled: dayCols.some(([ci]) => r[ci] != null && normSpace(r[ci]) !== ''),
    });
  });
  return { y, m, ded, att, filled: att.filter(a => a.filled).length };
}
async function readDropped(file) {
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) { toast('Drop an .xlsx workbook.'); return null; }
  const buf = await file.arrayBuffer(), sheets = await parse(file.name, buf, true);
  const rep = readReport(sheets);
  if (!rep.error) return { kind: 'ded', name: file.name, size: file.size, bytes: new Uint8Array(buf), report: rep };
  const inc = readIncentive(sheets);
  if (!inc.error) return { kind: 'inc', name: file.name, size: file.size, bytes: new Uint8Array(buf), rows: inc };
  toast('This is neither the monthly report nor the incentive data workbook.'); return null;
}
async function loadWorkbook(file) {
  if (!file) return;
  state.wbBusy = true; renderEmail();
  try {
    const w = await readDropped(file); if (!w) return;
    if (w.kind === 'ded') state.wb = { name: w.name, size: w.size, bytes: w.bytes, report: w.report, at: new Date() };
    else state.incWb = { name: w.name, size: w.size, bytes: w.bytes, rows: w.rows };
    if (w.kind !== state.mailKind) { state.mailKind = w.kind; setSeg($('mKind'), w.kind); }
    state.mailSubjects = {}; state.mailDone = {};
    toast(`Read ${file.name} (${w.kind === 'inc' ? 'incentive data' : 'monthly report'})`);
  } catch (e) { toast(`Could not read ${file.name}. Save it as .xlsx in Excel and try again.`); }
  finally { state.wbBusy = false; render(); }
}
async function loadRevFile(file) {
  if (!file) return;
  try {
    const w = await readDropped(file); if (!w) return;
    const data = w.kind === 'inc' ? w.rows : { ded: w.report.ded.map(x => ({ id: x.id, name: x.name, total: x.total })), abs: w.report.att.filter(a => a.shown && a.days.length).map(a => ({ id: a.id, name: a.name, days: a.days })) };
    state.revWb[w.kind] = { name: w.name, data };
    if (w.kind !== state.mailKind) { state.mailKind = w.kind; setSeg($('mKind'), w.kind); }
    toast(`Comparing with ${file.name}`); renderEmail();
  } catch (e) { toast(`Could not read ${file.name}.`); }
}
/** absences per person from the attendance files (when there is no dropped workbook) */
function pageAbsences() {
  if (!state.attRes || !state.model) return null;
  const rows = [];
  for (const m of state.model) {
    if (!m.shown) continue; const a = attOf(m.p._id); if (!a) continue;
    const days = a.days.map((v, i) => (v === 'Absent' ? i + 1 : 0)).filter(Boolean);
    rows.push({ id: idText(m.p.nid), name: m.exp, brand: normSpace(m.p.brand), team: normSpace(m.p.team), onRoster: true, shown: true, days, filled: true });
  }
  return rows;
}
function mailModel(stage = state.mailStage) {
  const r = state.wb && state.wb.report, { y, m } = mailMonth(), warns = [];
  let ded, abs = null;
  if (mailShared()) {   // the month in the shared history, with the supervisors' attendance corrections
    const k = ymKey(y, m), rows = liveRows(k), set = state.settings;
    const inDed = x => set.dedBrands.includes(normSpace(x.brand)) && set.dedTeams.includes(normSpace(x.team));
    ded = rows.filter(x => inDed(x) && x.ded != null).map(x => ({ id: idText(x.id), name: x.n, total: Math.round(x.ded || 0) }));
    const ar = rows.map(x => ({ id: idText(x.id), name: x.n, brand: normSpace(x.brand), team: normSpace(x.team), onRoster: true, shown: true, filled: !!x.d, days: [...String(x.d || '')].map((c, i) => (c === 'X' ? i + 1 : 0)).filter(Boolean) })).filter(a => a.days.length && absScopeOk(a));
    abs = { rows: ar, dates: [...new Set(ar.flatMap(a => a.days))].sort((a, b) => a - b) };
    if (!rows.length) warns.push(`Nothing is saved for ${MONTH_LONG[m - 1]} ${y} yet.`);
    else { if (!rows.some(x => x.ded != null)) warns.push('No deduction minutes in this month yet: the WFM team adds them when they build the month from the Schedule and the Agent Status Timeline.'); if (!rows.some(x => x.d)) warns.push('No attendance in this month yet.'); }
  } else if (r) {
    ded = r.ded.map(x => ({ id: x.id, name: x.name, total: x.total }));
    const rows = r.att.filter(a => a.shown && a.days.length && absScopeOk(a));
    abs = { rows, dates: [...new Set(rows.flatMap(a => a.days))].sort((a, b) => a - b) };
    if (!r.filled) warns.push('The Attendance sheet in this workbook is empty. Fill it in Excel, save, and drop it again.');
    const off = rows.filter(a => !a.onRoster); if (off.length) warns.push(`Not on the roster but absent: ${off.map(a => a.name).join(', ')}.`);
    if (r.y !== state.y || r.m !== state.m) warns.push(`The workbook is for ${MONTH_LONG[r.m - 1]} ${r.y}; the email uses that month.`);
  } else {
    ded = (state.model || []).filter(x => x.inDed).map(x => ({ id: idText(x.p.nid), name: x.exp, total: x.ded || 0 }));
    const pa = pageAbsences();
    if (pa) { const rows = pa.filter(a => a.days.length && absScopeOk(a)); abs = { rows, dates: [...new Set(rows.flatMap(a => a.days))].sort((a, b) => a - b) }; }
    else warns.push('Absences come from the supervisors\' attendance files. Drop them on Import, or drop the filled workbook here.');
    if (!state.model) warns.push('No exports yet, so there are no deduction totals. Drop them on Import first.');
  }
  const dedRows = ded.filter(x => state.mail.zeros || x.total > 0);
  const noId = [...dedRows, ...(abs ? abs.rows : [])].filter(x => !/^\d{10}$/.test(x.id)).map(x => x.name);
  if (noId.length) warns.push(`No 10-digit National ID for: ${[...new Set(noId)].join(', ')}. Add it in People${r ? ' (or in the workbook) and build again' : ''}.`);
  const dl = mailDeadlineIso().split('-').map(Number);
  let changes = null, snap = null;
  if (stage === 'final') {
    snap = snapOf('ded');
    if (snap) changes = dedDiff(snap.data, { ded, abs: abs ? abs.rows.map(a => ({ id: a.id, name: a.name, days: a.days })) : null });
    else warns.push('No review version saved for this month, so the changes since the review cannot be listed. Copy or download the review email first, or drop the workbook that was sent for review.');
  }
  const attach = mailShared() ? { name: `MC Monthly Deduction - ${MON[m - 1]} ${y}.xlsx`, size: null } : r ? { name: state.wb.name, size: state.wb.size } : state.ctx ? { name: fileNameOut(), size: null } : null;
  return { kind: 'ded', stage, y, m, ded: dedRows, dedFull: ded, dedAll: ded.length, abs, warns, changes, snap, attach, deadline: dl[1] ? `${MON[dl[1] - 1]} ${ordinal(dl[2])}` : '', subject: subjectFor('ded', stage) };
}
const F = 'font-family:Calibri,sans-serif';
function mailHtml(md, logoSrc, preview) {
  const P = (inner, st = '') => `<p class="MsoNormal" style="margin:0in;font-size:11.0pt;${F};${st}">${inner}</p>`;
  const gap = P('&nbsp;');
  const lines = t => String(t || '').split(/\r?\n/).map(l => esc(l) || '&nbsp;');
  const th = t => `<td style="background:#1F3864;padding:0in 5.4pt 0in 5.4pt;height:.5in"><p class="MsoNormal" align="center" style="margin:0in;text-align:center;${F}"><b><span style="font-size:10.0pt;color:white">${t}</span></b></p></td>`;
  const td = (t, o = {}) => `<td nowrap valign="bottom" style="border:solid #BFBFBF 1.0pt;${o.bg ? `background:${o.bg};` : ''}padding:0in 5.4pt 0in 5.4pt;height:.2in"><p class="MsoNormal"${o.left ? '' : ' align="center"'} style="margin:0in;${o.left ? '' : 'text-align:center;'}${F}">${o.b ? '<b>' : ''}<span style="font-size:10.0pt;color:black">${t}</span>${o.b ? '</b>' : ''}</p></td>`;
  const table = (head, rows) => `<table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr style="height:.5in">${head.map(th).join('')}</tr>${rows.map(r => `<tr style="height:.2in">${r}</tr>`).join('')}</table>`;
  const red = t => P(`<span lang="EN-GB" style="color:red">${t}</span>`);
  const M = MON[md.m - 1], fin = md.stage === 'final';
  let b = P(`<b><span lang="EN-GB">${lines(state.mail.greeting).join('<br>')}</span></b>`) + gap;
  b += lines(fin ? state.mail.introFinal : state.mail.intro).map(l => P(`<span lang="EN-GB">${l}</span>`)).join('') + gap;
  if (!fin && md.deadline) b += P(`<span lang="EN-GB">Deadline: ${esc(md.deadline)}.</span>`) + gap;
  if (fin && md.changes && state.mailChanges) {
    b += red('Changes after the review :') + gap;
    const c = md.changes;
    if (!c.ded.length && !c.abs.length) b += P('No changes after the review.') + gap;
    if (c.ded.length) b += table(['ID', 'Name', 'Review (min)', 'Final (min)'], c.ded.map(x => td(esc(x.id)) + td(esc(x.name), { left: true }) + td(String(x.before)) + td(String(x.after), { b: true }))) + gap;
    if (c.abs.length) b += table(['ID', 'Name', 'Absent days (review)', 'Absent days (final)'], c.abs.map(x => td(esc(x.id)) + td(esc(x.name), { left: true }) + td(String(x.before)) + td(String(x.after), { b: true }))) + gap;
  }
  b += red('Conformance Deduction :') + gap;
  b += md.ded.length ? table(['ID', 'Name', 'Total Deduction (min)'], md.ded.map(x => td(esc(x.id)) + td(esc(x.name), { left: true }) + td(String(x.total)))) : P('No deduction minutes this month.');
  if (md.abs) {
    b += gap + red('Absenteeism :') + gap;
    b += md.abs.rows.length ? table(['ID', 'Name', 'Total Absent', ...md.abs.dates.map(d => `${d}-${M}`)], md.abs.rows.map(a =>
      td(esc(a.id)) + td(esc(a.name), { left: true }) + td(String(a.days.length), { b: true }) + md.abs.dates.map(d => (a.days.includes(d) ? td('Absent', { b: true, bg: '#FF8B8B' }) : td('&nbsp;'))).join(''))) : P('No absences this month.');
  }
  b += gap + lines(state.mail.sign).map(l => P(`<span lang="EN-GB" style="font-size:10.0pt;font-family:Arial,sans-serif;color:black">${l}</span>`)).join('');
  if (logoSrc && state.mailLogo) b += gap + logoTag(logoSrc);
  return `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">${preview ? '<style>body{margin:18px 20px;}</style>' : ''}</head><body lang="EN-US" style="word-wrap:break-word;background:#ffffff"><div class="WordSection1">${b}</div></body></html>`;
}
function mailText(md) {
  const M = MON[md.m - 1], fin = md.stage === 'final', out = [state.mail.greeting, '', fin ? state.mail.introFinal : state.mail.intro, ''];
  if (!fin && md.deadline) out.push(`Deadline: ${md.deadline}.`, '');
  if (fin && md.changes && state.mailChanges) {
    out.push('Changes after the review :', '');
    if (!md.changes.ded.length && !md.changes.abs.length) out.push('No changes after the review.', '');
    if (md.changes.ded.length) { out.push(['ID', 'Name', 'Review (min)', 'Final (min)'].join('\t')); md.changes.ded.forEach(x => out.push([x.id, x.name, x.before, x.after].join('\t'))); out.push(''); }
    if (md.changes.abs.length) { out.push(['ID', 'Name', 'Absent days (review)', 'Absent days (final)'].join('\t')); md.changes.abs.forEach(x => out.push([x.id, x.name, x.before, x.after].join('\t'))); out.push(''); }
  }
  out.push('Conformance Deduction :', '');
  if (md.ded.length) { out.push(['ID', 'Name', 'Total Deduction (min)'].join('\t')); md.ded.forEach(x => out.push([x.id, x.name, x.total].join('\t'))); } else out.push('No deduction minutes this month.');
  if (md.abs) {
    out.push('', 'Absenteeism :', '');
    if (md.abs.rows.length) { out.push(['ID', 'Name', 'Total Absent', ...md.abs.dates.map(d => `${d}-${M}`)].join('\t')); md.abs.rows.forEach(a => out.push([a.id, a.name, a.days.length, ...md.abs.dates.map(d => (a.days.includes(d) ? 'Absent' : ''))].join('\t'))); }
    else out.push('No absences this month.');
  }
  out.push('', state.mail.sign);
  return out.join('\r\n');
}
const addrList = s => String(s || '').split(/[;,\n]+/).map(x => normSpace(x)).filter(Boolean);
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/.{76}(?=.)/g, '$&\r\n'); }
const enc8 = new TextEncoder();
const hdrWord = s => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(enc8.encode(s)).replace(/\r\n/g, '')}?=`);
const hdrAddr = a => { const m = a.match(/^(.*?)\s*<([^>]+)>$/); return m && m[1] ? `${/^[\x20-\x7e]*$/.test(m[1]) ? `"${m[1].replace(/"/g, '')}"` : hdrWord(m[1])} <${m[2]}>` : a; };
async function copyRich(html, text) {
  let fired = false;
  const onCopy = e => { e.clipboardData.setData('text/plain', text); if (html) e.clipboardData.setData('text/html', html); e.preventDefault(); fired = true; };
  try { document.addEventListener('copy', onCopy); const r = document.execCommand('copy'); if (r && fired) return true; } catch (e) { /* try the async API */ }
  finally { document.removeEventListener('copy', onCopy); }
  try {
    if (html && navigator.clipboard && window.ClipboardItem) { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]); return true; }
    if (!html && navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* blocked */ }
  return false;
}
let mailTimer = null, lastMailHtml = '';
function persistMail() {
  if (!state.db) return;
  clearTimeout(mailTimer);
  mailTimer = setTimeout(() => {
    const body = clone(state.mail), inc = clone(state.incMail);
    queueWrite('config/email', () => state.db.doc('config/email').set({ ...body, logo: !!state.mailLogo }));
    queueWrite('config/email-inc', () => state.db.doc('config/email-inc').set(inc));
  }, 700);
}
/** the current email as {md, html(logoSrc), text, to, cc, file name, attachment} */
function curMail() {
  const inc = state.mailKind === 'inc', stage = state.mailStage;
  const md = inc ? incMailModel(stage) : mailModel(stage), cfg = mailCfg();
  return {
    md, inc, stage, to: addrList(cfg.to), cc: addrList(cfg.cc),
    html: (src, preview) => (inc ? incMailHtml(md, src, preview) : mailHtml(md, src, preview)), text: inc ? incMailText(md) : mailText(md),
    file: `${md.subject.replace(/\s*\|\s*/g, ' - ').replace(/[\\/:*?"<>|]/g, '').replace(/\.$/, '')}.eml`,
  };
}
async function attachmentBytes(inc) {
  if (inc) return incBytes();
  if (mailShared()) {   // the deduction and the absences as a small workbook
    const md = mailModel(state.mailStage), M = MON[md.m - 1];
    return xlBytes([{ name: 'Deduction', title: `Conformance deduction - ${M} ${md.y}`, sub: stamp(ymKey(md.y, md.m)), cols: [{ h: 'ID', t: 'text', w: 13 }, { h: 'Name', t: 'text', w: 32 }, { h: 'Total deduction (min)', t: 'int' }], rows: md.dedFull.map(x => [x.id, x.name, x.total]) },
      { name: 'Absenteeism', title: `Absenteeism - ${M} ${md.y}`, sub: stamp(ymKey(md.y, md.m)), cols: [{ h: 'ID', t: 'text', w: 13 }, { h: 'Name', t: 'text', w: 32 }, { h: 'Total absent', t: 'int' }, ...(md.abs ? md.abs.dates : []).map(d => ({ h: `${d}-${M}`, t: 'text', w: 9 }))], rows: md.abs ? md.abs.rows.map(a => [a.id, a.name, a.days.length, ...md.abs.dates.map(d => (a.days.includes(d) ? 'Absent' : ''))]) : [] }]);
  }
  if (state.wb) return state.wb.bytes;
  return state.ctx ? xlLogo().then(lg => { state.ctx.logo = lg; return Writer2.build(state.ctx); }) : null;
}
function snapNow(kind) {
  if (kind === 'ded') { const md = mailModel('review'); saveSnap('ded', { ded: md.dedFull, abs: md.abs ? md.abs.rows.map(a => ({ id: a.id, name: a.name, days: a.days })) : null }); }
  else { const d = incData(); if (d) saveSnap('inc', { att: d.att, adh: d.adh, aht: d.aht, y: d.y, m: d.m }); }
}
function markSent(how) {
  state.mailDone[doneKey()] = { how: how || 'Copied', at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }; renderSteps();
  if (state.mailStage === 'review') snapNow(state.mailKind);
  if (state.mailStage === 'final' && state.mailKind === 'inc') saveMonthToHistory('final incentive email').then(k => { if (k) setTimeout(() => toast(`${ymLabel(k)} added to the history`), 3600); });
  if (state.mailStage === 'final' && state.mailKind === 'ded') { const mm = mailMonth(); calAuto(ymKey(mm.y, mm.m), 'deduction'); }   // the month-close step
}
function renderEmail() {
  if (mailShared() && state.mailKind !== 'ded') state.mailKind = 'ded';
  const eSig = `${state.mailKind}|${state.mailStage}|${state.mailSrc || ''}|${state.mailSrc ? wsMonthNow() : monthKey()}`;   // another email: editing the old preview stops
  if (state.mailEditOn && state.mailEditSig !== eSig) { state.mailEditOn = false; state.mailEditDirty = false; $('mEdit').checked = false; $('mEditNote').hidden = true; }
  state.mailEditSig = eSig;
  const cm = curMail(), md = cm.md, inc = cm.inc, fin = cm.stage === 'final', cfg = mailCfg();
  setSeg($('mKind'), state.mailKind); setSeg($('mStage'), state.mailStage);
  $('mKind').hidden = mailShared(); $('wbDrop').hidden = mailShared();
  $('h-email').textContent = `${inc ? 'Incentive' : 'Deduction'} email – ${fin ? 'final' : 'for review'}`;
  $('emailLead').textContent = inc ? (fin ? 'The final incentive data, sent after the review, with the changes since the review.' : 'Mohammed\'s "incentive Data for review" email, with the incentive workbook attached.')
    : (fin ? 'The final deduction and absenteeism, sent after the review, with the changes since the review.' : 'The "MC Monthly Deduction | For Review" email with the conformance deduction and the absences.');
  // data card
  const r = state.wb && state.wb.report, w = state.incWb;
  $('srcState').innerHTML = mailShared() ? `<div class="row"><span class="pill good">Shared month</span><b>${esc(MONTH_LONG[md.m - 1])} ${md.y}</b></div><div class="hint">From the shared history, with the supervisors' attendance corrections. ${plural(md.dedAll, 'person', 'people')} in the deduction scope.</div>` : state.wbBusy ? '<div class="row"><span class="spin" aria-hidden="true"></span>Reading the workbook…</div>'
    : inc ? (w ? `<div class="row"><span class="pill good">Workbook</span><b style="overflow-wrap:anywhere">${esc(w.name)}</b></div><div class="hint">${w.rows.y ? `${MONTH_LONG[w.rows.m - 1]} ${w.rows.y} · ` : ''}${plural(w.rows.att.length, 'person', 'people')} in the Attendance Report · ${w.rows.adh.length} in Adherence · ${w.rows.aht.length} in AHT</div><div><button class="linkbtn" data-wbclear="inc">Use the data from this page instead</button></div>`
      : `<div class="row"><span class="pill info">This page</span>Exports and attendance files</div><div class="hint">The workbook is made from them when you send. Drop an edited incentive workbook to use it instead.</div>`)
    : (r ? `<div class="row"><span class="pill good">Workbook</span><b style="overflow-wrap:anywhere">${esc(state.wb.name)}</b></div><div class="hint">${MONTH_LONG[r.m - 1]} ${r.y} · ${plural(r.ded.length, 'person', 'people')} in Deduction · Attendance filled for ${plural(r.filled, 'person', 'people')}</div><div><button class="linkbtn" data-wbclear="ded">Use the numbers from this page instead</button></div>`
      : `<div class="row"><span class="pill info">This page</span>Deduction from the exports${state.attRes ? ', absences from the attendance files' : ''}</div><div class="hint">Drop the saved monthly report to use your changes in Excel.</div>`);
  $('wbDropT').textContent = inc ? 'Drop an incentive workbook' : 'Drop the monthly report';
  $('wbHelp').textContent = inc ? 'MC_all_team_incentive _data, if you edited it in Excel' : 'The report from this tool, after any changes in Excel';
  // review version (final only)
  const sn = snapOf(state.mailKind);
  $('revState').hidden = !fin;
  if (fin) $('revState').innerHTML = `<h3>Compared with the review</h3>${sn ? `<p class="hint">${sn.src ? `File ${esc(sn.src)}` : `Saved ${esc(fmtWhen(sn.at))}${sn.by ? ' by ' + esc(sn.by) : ''} when the review email was copied or downloaded`}.</p>` : '<p class="hint">No review version yet for this month.</p>'}
    <button class="btn sm" id="revPick">${sn ? 'Compare with a file instead' : 'Drop the file sent for review'}</button>${state.revWb[state.mailKind] ? ' <button class="linkbtn" data-revclear>Use the saved version</button>' : ''}`;
  // form
  const setv = (id, v) => { const el = $(id); if (document.activeElement !== el && el.value !== v) el.value = v; };
  setv('mTo', cfg.to); setv('mCc', cfg.cc); setv('mSubject', md.subject); setv('mDeadline', mailDeadlineIso());
  setv('mGreeting', cfg.greeting); setv('mSign', cfg.sign); setv('mIntro', inc ? '' : fin ? state.mail.introFinal : state.mail.intro);
  $('fIntro').hidden = inc; $('fDeadline').hidden = fin; $('fAbs').hidden = inc; $('fZeros').hidden = inc; $('fChanges').hidden = !fin || inc;
  const s = state.settings;
  if (!inc) {
    $('mAbsScope').innerHTML = [['brands', `${s.dedBrands.join(', ') || 'No brand'}, all teams`], ['scope', `Deduction scope only (${s.dedBrands.join(', ') || '–'} · ${s.dedTeams.join(', ') || '–'})`], ['all', 'Everyone in the reports']]
      .map(([v, l]) => `<option value="${v}"${state.mail.absScope === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
    $('mAbsScope').disabled = !md.abs;
  }
  $('mZeros').checked = !!state.mail.zeros; $('mAttach').checked = !!cfg.attach; $('mChanges').checked = !!state.mailChanges;
  $('mAttachWrap').hidden = !md.attach; $('mAttachLbl').textContent = md.attach ? `Attach ${md.attach.name} to the .eml` : '';
  $('attBtn').hidden = !md.attach; $('attBtn').title = md.attach ? `Save ${md.attach.name}` : '';
  $('mailWarns').innerHTML = md.warns.map(x => `<li>${esc(x)}</li>`).join('');
  const to = cm.to, cc = cm.cc;
  const rowsInfo = inc ? (md.d ? `${plural(md.d.att.length, 'person', 'people')} in the attachment${fin && md.changes ? ` · ${plural(md.changes.length, 'person', 'people')} changed since the review` : ''}` : 'No data yet')
    : `${plural(md.ded.length, 'person', 'people')} in Conformance Deduction${md.abs ? ` · ${plural(md.abs.rows.length, 'person', 'people')} absent` : ''}${fin && md.changes ? ` · ${plural(md.changes.ded.length + md.changes.abs.length, 'change')} since the review` : ''}`;
  $('mailHead').innerHTML = `<div><span>To</span><span>${esc(to.join('; ')) || '<i class="subtle">nobody yet</i>'}</span></div>${cc.length ? `<div><span>Cc</span><span>${esc(cc.join('; '))}</span></div>` : ''}
    <div><span>Subject</span><span><b>${esc(md.subject)}</b></span></div>${md.attach && cfg.attach ? `<div><span>Attached</span><span class="att"><svg width="12" height="12" aria-hidden="true"><use href="#i-file"/></svg>${esc(md.attach.name)}${md.attach.size ? ' · ' + fmtSize(md.attach.size) : ''}</span></div>` : ''}
    <div><span>Rows</span><span>${rowsInfo}</span></div>`;
  const html = cm.html(state.logo ? state.logo.dataUrl : null, true);
  if (html !== lastMailHtml && !state.mailEditOn) { lastMailHtml = html; $('mailFrame').srcdoc = html; }   // while someone edits the preview, it is theirs
}
$('mailFrame').addEventListener('load', () => { try { const f = $('mailFrame'), d = f.contentDocument; f.style.height = '420px'; f.style.height = Math.max(420, d.documentElement.scrollHeight + 4) + 'px'; } catch (e) { /* preview only */ } });
/** the month email, edited by hand in the preview: { html, text } of what is there now, or null when nobody edited it */
function mailEdited() {
  if (!state.mailEditOn || !state.mailEditDirty) return null;
  try { const d = $('mailFrame').contentDocument; return d && d.body ? { html: '<!doctype html>' + d.documentElement.outerHTML.replace(/ contenteditable="true"/g, '').replace(/outline: 2px dashed[^;"]*;?/g, ''), text: d.body.innerText } : null; } catch (e) { return null; }
}
function mailEditMode(on) {
  let d = null; try { d = $('mailFrame').contentDocument; } catch (e) { d = null; }
  if (on && (!d || !d.body)) { $('mEdit').checked = false; toast('Editing in the preview is not available in this view.'); return; }
  state.mailEditOn = !!on; $('mEditNote').hidden = !on;
  if (d && d.body) { d.body.contentEditable = on ? 'true' : 'false'; d.body.style.outline = on ? '2px dashed #9aa' : 'none'; if (on) { d.body.addEventListener('input', () => { state.mailEditDirty = true; }); d.body.focus(); } }
  if (!on) { state.mailEditDirty = false; lastMailHtml = ''; renderEmail(); }
}
$('mEdit').addEventListener('change', e => mailEditMode(e.target.checked));

// ================================================================ UI 4: agent cards, hover profile, agent history chart, employees preview, daily tool, motion
const gname = p => normSpace(p ? (normSpace(p.sys) ? p.sys : p.name) : '');
const AV = ['#0d76bd', '#026c44', '#d3402a', '#087b96', '#0c7b6c', '#643e3a', '#705a3b', '#b8461f', '#5b4a9e'];   // brand pixel colours, all readable with white initials
const avStyle = n => { let h = 0; for (const c of normName(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ` style="--av:${AV[h % AV.length]}"`; };
const initials = n => { const w = normSpace(n).split(' ').filter(Boolean); if (!w.length) return '?'; return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
const effP = pid => (state.ctx && state.ctx.roster.find(x => x._id === pid)) || state.roster.find(x => x._id === pid) || null;
const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const lsGet2 = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet2 = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* per-viewer convenience only */ } };
state.pview = lsGet2('mc-pview') === 'table' ? 'table' : 'cards';
state.rteam = ''; state.eSort = 'name'; state.eTeam = ''; state.pfTeam = ''; state.pfSort = 'ans'; state.pfDir = 'desc'; state.pfOpen = false; state.perf = null; state.wfTeam = ''; state.wfSort = 'score'; state.wfDir = 'desc'; state.wfOpen = false; state.wfDaysOpen = false; state.review = null; state.phMetric = 'adh'; state.autoLinks = []; state.autoTried = new Set();
function agentNums(pid) {
  const m = state.byId.get(pid), K = state.kpi.get(pid), a = attOf(pid), c = a && a.filled ? Att.counts(a.days, a.tardyFile) : null;
  const under = m && m.adh ? m.adh.filter(v => v != null && v < state.settings.target).length : null;
  return { m, K, c, under };
}
const belowB = (v, txt) => `<b class="bad" title="Below the target"><svg class="ico-dn" aria-hidden="true"><use href="#i-dn"/></svg>${txt}<span class="sr"> (below the target)</span></b>`;

// ---- Genesys names: a roster person nobody found in the exports, whose name is clearly one export name, gets that name as the system name
function autoLinkNames() {
  if (!state.ctx || !state.model || !state.issues.length || !state.rosterReady) return 0;
  const skip = new Set(state.settings.noAutoLink || []), cand = [], NO = (state.nameMemo && state.nameMemo.no) || {};
  for (const x of state.issues) {
    if (skip.has(x.key) || state.autoTried.has(x.key)) continue;
    let best = null, bs = 0, second = 0; const no = NO[qKey(x.name)] || [];
    for (const m of state.model) {
      if (m.any || !normSpace(m.p.name) || no.includes(m.p._id)) continue;
      const s = Math.max(Core.nameScore(x.name, m.p.name), normSpace(m.p.sys) ? Core.nameScore(x.name, m.p.sys) : 0);
      if (s > bs) { second = bs; bs = s; best = m.p; } else if (s > second) second = s;
    }
    if (best && bs >= 0.86 && bs - second >= 0.1) cand.push({ x, p: best });
  }
  // the rest: the same matching as the quality EVAL (first name, family name by how it sounds, the names older files used),
  // only for people no export has found yet, and only when one person clearly fits
  const rest = state.issues.filter(x => !skip.has(x.key) && !state.autoTried.has(x.key) && !cand.some(c => c.x === x));
  if (rest.length) {
    const free = new Set(state.model.filter(m => !m.any && normSpace(m.p.name)).map(m => m.p._id));
    try {
      const res = NameLink.link(rest.map(x => ({ name: x.name, kind: 'agent' })), linkPeople().filter(q => free.has(q.id)), {}, NO);
      res.forEach((r, i) => { if (r.id && r.auto) { const p = state.roster.find(q => q._id === r.id); if (p) cand.push({ x: rest[i], p }); } });
    } catch (e) { /* the suggestions on Review stay */ }
  }
  const per = new Map(); cand.forEach(c => per.set(c.p._id, (per.get(c.p._id) || 0) + 1));
  const ok = cand.filter(c => per.get(c.p._id) === 1);
  for (const c of ok) {
    state.autoTried.add(c.x.key);
    state.autoLinks.push({ pid: c.p._id, name: c.x.name, key: c.x.key, prev: c.p.sys || '', roster: c.p.name });
    updatePerson(c.p._id, { sys: c.x.name }, { quiet: true });
  }
  return ok.length;
}
function undoAutoLink(pid) {
  const a = state.autoLinks.find(x => x.pid === pid); if (!a) { undoSysLink(pid); return; }
  state.autoLinks = state.autoLinks.filter(x => x !== a);
  state.settings.noAutoLink = [...new Set([...(state.settings.noAutoLink || []), a.key])]; persistSettings();
  updatePerson(pid, { sys: a.prev });
  toast(`${a.roster} keeps ${a.prev ? `"${a.prev}"` : 'their roster name'} as the system name`);
}

// ---- People: cards (default) or the table for bulk edits
const RF = {
  all: () => true,
  inactive: p => p.status === 'Inactive',
  sys: p => !!normSpace(p.sys),
  noid: p => !Core.cleanId((effP(p._id) || p).nid),
  nomatch: p => { const m = state.byId.get(p._id); return !!state.ctx && !!normSpace(p.name) && (!m || !m.any); },
};
const RF_LABEL = { all: 'All', inactive: 'Inactive', sys: 'Has system name', noid: 'Missing ID', nomatch: 'Not in exports' };
function filtered() {
  const q = normName(state.rq), f = RF[state.rf] || RF.all;
  return state.roster.filter(p => (!state.rteam || (p.team || '') === state.rteam) && (!q || normName(`${p.name} ${p.nid} ${p.sys} ${(effP(p._id) || p).nid} ${akaOf(p).join(' ')}`).includes(q)) && f(p));
}
const teamOrder = list => [...new Set(list)].sort((a, b) => (DEP_ORDER.indexOf(a) + 1 || 99) - (DEP_ORDER.indexOf(b) + 1 || 99) || String(a).localeCompare(String(b)));
function renderPeopleFilters() {
  const base = state.roster.filter(p => !state.rteam || (p.team || '') === state.rteam);
  $('rseg').querySelectorAll('button').forEach(b => { const f = b.dataset.f, n = base.filter(RF[f]).length; b.innerHTML = `${esc(RF_LABEL[f])} <span class="cnt${f === 'dup' && n ? ' warn' : ''}">${n}</span>`; });
  const teams = teamOrder(state.roster.map(p => p.team || ''));
  $('rteams').innerHTML = ['', ...teams].map(t => `<button data-team="${esc(t)}" aria-pressed="${state.rteam === t}" title="${esc(t ? DEP_NAMES[t] || t : 'Every team')}">${esc(t === '' ? 'All teams' : t || 'No team')}</button>`).join('');
  setSeg($('pView'), state.pview);
  const cards = state.pview === 'cards', dup = state.rf === 'dup';
  $('pgrid').hidden = !cards || dup; $('rwrap').hidden = cards || dup; $('dupPanel').hidden = !dup;
}
function tileHtml(p) {
  const pp = effP(p._id) || p, nm = gname(pp) || 'New person', id = Core.cleanId(pp.nid), on = p.status !== 'Inactive';
  const { m, K } = agentNums(p._id), set = state.settings;
  const alt = normSpace(p.sys) && normName(p.sys) !== normName(p.name) ? `Roster: ${p.name}` : (DEP_NAMES[p.team] || '');
  const flags = [];
  if (!id) flags.push('<span class="pill warn">No National ID</span>');
  if (state.ctx && normSpace(p.name) && (!m || !m.any)) flags.push('<span class="pill warn">Not in the exports</span>');
  if (m && !m.shown) flags.push('<span class="pill">Hidden</span>');
  if (state.dupIds && state.dupIds.has(p._id)) flags.push('<span class="pill warn">Duplicate</span>');
  const adh = !m || m.avg == null ? '<b>–</b>' : m.avg < set.target ? belowB(m.avg, pct(m.avg, 1)) : `<b>${pct(m.avg, 1)}</b>`;
  const st = !m ? '' : `<span class="astats"><span>${adh}<i>Adherence</i></span><span><b>${mss(m.aht)}</b><i>AHT</i></span>${K ? `<span><b>${pct1(K.res.finalPct)}</b><i>Final</i></span>` : m.inDed ? `<span><b>${m.ded ?? '–'}</b><i>Ded. min</i></span>` : `<span><b>${m.days || '–'}</b><i>Days</i></span>`}</span>`;
  return `<button class="atile${on ? '' : ' off'}" data-open="${esc(p._id)}" data-agent="${esc(p._id)}" aria-label="${esc(nm)}, open the profile">
    <span class="atop"><span class="av" aria-hidden="true"${avStyle(nm)}>${esc(initials(nm))}</span><span class="who"><b dir="auto">${esc(nm)}</b><small dir="auto">${esc(alt)}</small></span><span class="stt${on ? ' on' : ''}">${on ? 'Active' : 'Inactive'}</span></span>
    <span class="facts"><span class="idv">${id ? esc(id) : 'No National ID'}</span><span class="chip">${esc(p.brand || '–')}</span><span class="chip">${esc(p.team || '–')}</span></span>
    ${st}${flags.length ? `<span class="flags">${flags.join('')}</span>` : ''}</button>`;
}
function renderPeopleCards() {
  const el = $('pgrid');
  if (!state.rosterReady) { el.innerHTML = emptyCard('Loading the roster', state.rosterMsg || ''); return; }
  const rows = filtered(); state.vrows = rows;
  if (!rows.length) { el.innerHTML = state.roster.length ? (state.rf === 'nomatch' && !state.ctx ? emptyCard('No exports yet', 'Drop the exports on Import to see who is not found.') : emptyCard('Nobody matches', 'Try another search, team or filter.')) : emptyCard('The roster is empty', state.rosterMsg || 'Add people one by one, or import a workbook that has a Roster sheet.'); return; }
  const groups = teamOrder(rows.map(p => p.team || '')).map(t => [t, rows.filter(p => (p.team || '') === t)]);
  el.innerHTML = groups.map(([t, L]) => `<section class="tgroup"><h3 class="grp">${esc(t || 'No team')}<small>${esc(DEP_NAMES[t] ? DEP_NAMES[t] + ' · ' : '')}${plural(L.length, 'person', 'people')}</small></h3>
    <div class="tgrid">${L.slice().sort((a, b) => (gname(a) || '~').localeCompare(gname(b) || '~')).map(tileHtml).join('')}</div></section>`).join('');
  reveal(el);
}
function renderPeople() { if (state.rf === 'dup') renderDupPanel(); else if (state.pview === 'cards') renderPeopleCards(); else renderRoster(); renderPeopleFilters(); }

// ---- the person's page: who they are, editable in place
function profileHtml(p) {
  const pp = effP(p._id) || p, nm = gname(pp) || 'New person', id = Core.cleanId(pp.nid), filled = id && !Core.cleanId(p.nid), on = p.status !== 'Inactive';
  const fld = (f, label, val, extra = '') => `<label class="pf"><span>${label}</span><input data-pf="${f}" value="${esc(val)}" ${extra}></label>`;
  const sel = (f, label, list, cur, titles) => `<label class="pf"><span>${label}</span><select data-pf="${f}">${opts(list, cur, titles)}</select></label>`;
  return `<section class="sec profile">
    <div class="phead"><span class="av lg" aria-hidden="true"${avStyle(nm)}>${esc(initials(nm))}</span><div class="pwho"><b dir="auto">${esc(nm)}</b>${spvLine(p._id)}
      <span>${normSpace(p.sys) && normName(p.sys) !== normName(p.name) ? `Roster name: <span dir="auto">${esc(p.name)}</span> · ` : ''}${esc(DEP_NAMES[p.team] || p.team || '')}</span></div>
      <button class="sw" role="switch" aria-checked="${on}" data-psw aria-label="Status"><i></i>${on ? 'Active' : 'Inactive'}</button></div>
    <div class="pfacts"><div><span>National ID</span><b class="num">${id ? esc(id) : '<span class="warnline">Missing</span>'}</b>${filled ? '<small>from the IDs file</small>' : ''}</div><div><span>Brand</span><b>${esc(p.brand || '–')}</b></div><div><span>Team</span><b>${esc(p.team || '–')}</b><small>${esc(DEP_NAMES[p.team] || '')}</small></div><div><span>Genesys name</span><b dir="auto">${esc(gname(p) || '–')}</b><small dir="auto">${normSpace(p.sys) ? 'system name' : 'same as the roster'}${akaOf(p).length ? ` · also written ${esc(akaOf(p).join(', '))}` : ''}</small></div></div>
    <details class="pedit"${state.peditOpen ? ' open' : ''}><summary>Edit name, ID, brand and team</summary><div class="pfields">
      ${fld('name', 'Name', p.name, 'dir="auto" placeholder="Full name"')}${fld('nid', 'National ID', p.nid, 'inputmode="numeric" placeholder="10 digits or NA"')}
      ${sel('brand', 'Brand', BRANDS, p.brand)}${sel('team', 'Team', DEP_ORDER, p.team, DEP_NAMES)}
      ${fld('sys', 'System name (Genesys)', p.sys, 'dir="auto" list="sysNames" autocomplete="off" placeholder="Same as the name"')}
      ${fld('spvName', 'Supervisor', supName(p.spv), 'list="supNames" dir="auto" placeholder="–"')}${fld('email', 'Work email', p.email || '', 'type="email" placeholder="name@company.com" spellcheck="false"')}
      ${fld('base', 'Incentive base (SR)', p.base || '', `inputmode="numeric" placeholder="${basesNow()[normBrand(p.brand)] ?? 1000} (the brand's)"`)}
      <div class="pfoot"><span class="hint">Saved as you leave each field. The Genesys name is what the exports are matched on.</span><button class="btn sm ghost danger" data-premove>Remove from the roster</button></div></div></details></section>`;
}

// ---- history for one agent: chart, table, export
const PH = ['adh', 'fin', 'earned', 'aht', 'ded', 'conf', 'absent', 'tardy', 'adhUnder', 'worked', 'wfExc', 'wfAbs', 'wfLate', 'wfShort', 'occ', 'ans', 'hnd', 'pAht', 'hold', 'acw', 'xferR', 'heldR'];
const PH_SHORT = { adh: 'Adherence', fin: 'Final %', earned: 'Earned', aht: 'AHT', ded: 'Deduction', conf: 'Conformance', absent: 'Absent', tardy: 'Tardy', adhUnder: 'Days under', worked: 'Worked', wfExc: 'Exceptions', wfAbs: 'No sign-on', wfLate: 'Late', wfShort: 'Short of shift', occ: 'Occupancy', ans: 'Answered', hnd: 'Handled', pAht: 'Avg handle', hold: 'Hold', acw: 'ACW', xferR: 'Transfers', heldR: 'Hold rate' };
const PCTK = new Set(['adh', 'fin', 'conf', 'heldR', 'xferR', 'occ']), TIMEK = new Set(['aht', 'pAht', 'talk', 'hold', 'acw']);
/** metrics worth a column: every metric, except performance ones that no month has */
const usedMetrics = rows => History.METRICS.filter(mt => !(mt.k === 'earned' && srHidden()) && (!(mt.perf || mt.wf) || rows.some(r => History.valOf(r, mt) != null)));
const xlLabel = m => (TIMEK.has(m.k) ? `${m.label === 'AHT' ? 'AHT' : m.label} (sec)` : m.label);
let histCache = null;
function histIndex() {
  const key = `${state.histVer}:${state.ver}:${state.roster.length}`;
  if (histCache && histCache.key === key) return histCache;
  const months = histAll(); histCache = { key, months, P: histPeople(months) }; return histCache;
}
const hdropHtml = small => `<div class="hdrop${small ? ' sm' : ''}" data-hdrop tabindex="0" role="button" aria-label="Add past months to the history"><svg aria-hidden="true"><use href="#i-up"/></svg><b>${small ? 'Add months' : 'Drop past months\' files here'}</b><span>${small ? 'Drop incentive files or past Genesys exports (AHT, Agent Performance, Monthly Adherence, Schedule, Agent Status Timeline) here, or click to choose.' : 'The monthly incentive files (MC_all_team_incentive _data) and the Genesys exports of any month: AHT, Agent Performance, Monthly Adherence, Schedule and Agent Status Timeline. Each file goes to its own month and is kept with the tool.'}</span></div>`;
function trendSvg(pts, mt) {
  const have = pts.filter(p => p.v != null); if (!have.length) return '<p class="subtle">No values for this metric.</p>';
  const W = 560, H = 184, L = 46, R = 74, T = 12, B = 26, n = pts.length, iw = W - L - R, ih = H - T - B;
  const isPct = PCTK.has(mt.k), tgt = mt.k === 'adh' ? state.settings.target : null;
  let lo = Math.min(...have.map(p => p.v)), hi = Math.max(...have.map(p => p.v));
  if (tgt != null) { lo = Math.min(lo, tgt); hi = Math.max(hi, tgt); }
  if (isPct || TIMEK.has(mt.k)) { const pad = Math.max((hi - lo) * 0.2, isPct ? 0.01 : 8); lo = Math.max(0, lo - pad); hi = isPct ? Math.min(1, hi + pad) : hi + pad; }
  else { lo = 0; const raw = Math.max(1, hi * 1.1) / 3, p10 = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(x => x * p10).find(x => x >= raw); hi = st * 3; }
  if (hi - lo < 1e-9) hi = lo + 1;
  const X = i => L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)), Y = v => T + ih - ((v - lo) / (hi - lo)) * ih, f1 = v => Math.round(v * 10) / 10;
  const span = hi - lo, fmt = v => (isPct ? `${(v * 100).toFixed(span < 0.06 ? 1 : 0)}%` : TIMEK.has(mt.k) ? tms(v) : Math.round(v).toLocaleString('en-US'));
  const grid = [0, 1, 2, 3].map(i => { const t = lo + (span * i) / 3; return `<line class="g" x1="${L}" x2="${W - R}" y1="${f1(Y(t))}" y2="${f1(Y(t))}"/><text class="yl" x="${L - 8}" y="${f1(Y(t) + 4)}" text-anchor="end">${esc(fmt(t))}</text>`; }).join('');
  let d = '', pen = false;
  pts.forEach((p, i) => { if (p.v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${f1(X(i))} ${f1(Y(p.v))}`; pen = true; });
  const lab = p => `${MON[+p.key.slice(5) - 1]} ${p.key.slice(0, 4)}`;
  const xl = pts.map((p, i) => `<text class="xl" x="${f1(X(i))}" y="${H - 6}" text-anchor="middle">${esc(MON[+p.key.slice(5) - 1])}</text>`).join('');
  const last = have[have.length - 1], li = pts.indexOf(last);
  let tgtY = tgt != null ? Y(tgt) : null, lastY = Y(last.v);
  const tl = tgt != null ? `<line class="tg" x1="${L}" x2="${W - R}" y1="${f1(tgtY)}" y2="${f1(tgtY)}"/><text class="tl" x="${W - R + 8}" y="${f1((Math.abs(tgtY - lastY) < 14 ? (tgtY > lastY ? lastY + 15 : lastY - 15) : tgtY) + 4)}">Target ${esc(pct(tgt, 0))}</text>` : '';
  const dots = pts.map((p, i) => (p.v == null ? '' : `<circle class="dt" cx="${f1(X(i))}" cy="${f1(Y(p.v))}" r="4"/>`)).join('');
  const step = n > 1 ? iw / (n - 1) : iw;
  const hits = pts.map((p, i) => `<g class="hp" data-tt="${esc(lab(p))}: ${esc(p.v == null ? 'no value' : mt.fmt(p.v))}${p.page ? ' (this page)' : ''}"><rect class="hit" x="${f1(X(i) - step / 2)}" y="${T}" width="${f1(step)}" height="${ih}"/><line class="xh" x1="${f1(X(i))}" x2="${f1(X(i))}" y1="${T}" y2="${T + ih}"/>${p.v == null ? '' : `<circle class="hd" cx="${f1(X(i))}" cy="${f1(Y(p.v))}" r="6"/>`}</g>`).join('');
  const vl = `<text class="vl" x="${f1(X(li) + 10)}" y="${f1(lastY + 4)}">${esc(mt.fmt(last.v))}</text>`;
  return `<svg class="trendsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(mt.label)} by month: ${esc(pts.map(p => `${lab(p)} ${p.v == null ? 'no value' : mt.fmt(p.v)}`).join(', '))}">${grid}${tl}<path class="ln" d="${d}"/>${dots}${xl}${vl}${hits}</svg>`;
}
function agentHistoryHtml(q) {
  const { months } = histIndex(), H = histFor(q).filter(x => x.r), saved = Object.keys(state.history).sort();
  if (!H.length) {
    const msg = saved.length ? `${esc(gname(q) || 'This person')} is not in the saved months (${esc(ymLabel(saved[0]))} to ${esc(ymLabel(saved[saved.length - 1]))}). Check the name and National ID, or add the missing months.` : 'No months are saved yet, so there is no history to show.';
    return `<section class="sec" id="phist"><h3>History</h3><p class="subtle">${msg}</p>${hdropHtml(!!saved.length)}</section>`;
  }
  const M = History.METRICS.filter(mt => PH.includes(mt.k) && !(mt.k === 'earned' && srHidden()) && H.some(x => History.valOf(x.r, mt) != null)).sort((a, b) => PH.indexOf(a.k) - PH.indexOf(b.k));
  const mt = M.find(x => x.k === state.phMetric) || M[0];
  const keys = months.map(x => x.key), i0 = keys.indexOf(H[0].key), i1 = keys.indexOf(H[H.length - 1].key);
  const byKey = new Map(H.map(x => [x.key, x])), range = months.slice(Math.max(0, i0), i1 + 1);
  const pts = range.map(x => ({ key: x.key, v: byKey.has(x.key) ? History.valOf(byKey.get(x.key).r, mt) : null, page: !!x.rec.page }));
  const TM = usedMetrics(H.map(x => x.r));
  const noAdh = H.filter(x => !x.rec.rows.some(r => r.adh != null)).map(x => ymLabel(x.key));
  const table = `<details class="htable"><summary>Month by month table</summary><div class="tablewrap histtab"><table><thead><tr><th>Month</th>${TM.map(m => `<th class="r">${esc(m.label)}</th>`).join('')}</tr></thead>
    <tbody>${H.map(x => `<tr><td title="${esc(x.rec.src || '')}">${esc(ymLabel(x.key))}${x.rec.page ? ' <span class="pill">page</span>' : ''}</td>${TM.map(m => histCell(m, History.valOf(x.r, m))).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<section class="sec" id="phist"><div class="sechead"><h3>History <small>${plural(H.length, 'month')}</small></h3><span class="spacer"></span><button class="btn sm" data-phexport><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Export history</button></div>
    <div class="seg sm phm" role="group" aria-label="History metric">${M.map(x => `<button data-phm="${x.k}" aria-pressed="${x.k === mt.k}">${esc(PH_SHORT[x.k] || x.label)}</button>`).join('')}</div>
    <figure class="trend"><figcaption>${esc(mt.label)} by month${mt.k === 'adh' ? ` · target ${esc(pct(state.settings.target, 0))}` : ''}</figcaption>${trendSvg(pts, mt)}</figure>
    ${table}${noAdh.length ? `<p class="hint">No adherence in the ${esc(noAdh.join(', '))} file${noAdh.length > 1 ? 's' : ''} (the tabs are empty).</p>` : ''}</section>`;
}
async function exportAgentHistory(pid) {
  const q = state.roster.find(x => x._id === pid); if (!q) return;
  const H = histFor(q).filter(x => x.r); if (!H.length) { toast('No history for this agent yet. Drop the monthly incentive files first.'); return; }
  const pp = effP(pid) || q, nm = gname(pp), id = Core.cleanId(pp.nid) || '', M = usedMetrics(H.map(x => x.r));
  const S = new Writer2.Styles(), Sh = Writer2.Sheet;
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } });
  const lb = S.get({ font: { b: true }, fill: 'FFD9E1F2', align: { h: 'left' } }), tx = S.get({ font: {}, align: { h: 'left' } }), nmS = S.get({ font: {}, align: { h: 'center' } });
  const pc = S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' }), tot = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' } }), totP = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' }, numFmt: '0.00%' });
  const W = new Sh('History'); W.tab = 'FF1F3864';
  [['Name (Genesys)', nm], ['Roster name', q.name], ['National ID', id], ['Brand', q.brand || ''], ['Team', `${q.team || ''}${DEP_NAMES[q.team] ? ' – ' + DEP_NAMES[q.team] : ''}`]].forEach(([k, v], i) => { W.set(i + 1, 1, k, lb); W.set(i + 1, 2, v, tx); });
  const r0 = 7, HD = ['Month', ...M.map(xlLabel), 'Source'];
  HD.forEach((h, j) => { W.set(r0, j + 1, h, hd); W.width(j + 1, j === 0 ? 16 : j === HD.length - 1 ? 40 : 12); });
  W.width(2, 30);
  H.forEach((x, i) => {
    const r = r0 + 1 + i; W.set(r, 1, ymLabel(x.key), tx);
    M.forEach((m, j) => { const v = History.valOf(x.r, m); W.set(r, 2 + j, v == null ? null : v, PCTK.has(m.k) ? pc : nmS); });
    W.set(r, 2 + M.length, x.rec.src || '', tx);
  });
  const rt = r0 + 1 + H.length, a = r0 + 1, b = rt - 1;
  W.set(rt, 1, 'Average / total', tot);
  M.forEach((m, j) => {
    const c = 2 + j, vals = H.map(x => History.valOf(x.r, m)).filter(v => v != null), ref = `${Core.colName(c)}${a}:${Core.colName(c)}${b}`;
    const v = vals.length ? (m.total === 'avg' ? vals.reduce((s, x) => s + x, 0) / vals.length : vals.reduce((s, x) => s + x, 0)) : '';
    W.set(rt, c, v, PCTK.has(m.k) ? totP : tot, m.total === 'avg' ? `IFERROR(AVERAGE(${ref}),"")` : `IF(COUNT(${ref})=0,"",SUM(${ref}))`);
  });
  W.freeze = [r0 + 1, 2]; W.logoAt(4, 1, 52, 8, 4);
  const bytes = await Writer2.pack([W], S, {}, { logo: await xlLogo() });
  await save(`History - ${nm.replace(/[\\/:*?"<>|]/g, '')} - ${ymLabel(H[0].key)} to ${ymLabel(H[H.length - 1].key)}.xlsx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// ---- hover profile: point at any agent to see who they are and their numbers
function sparkHtml(q) {
  const H = histFor(q).filter(x => x.r); if (H.length < 2) return '';
  let mt = History.METRICS.find(x => x.k === 'adh'), V = H.map(x => ({ key: x.key, v: History.valOf(x.r, mt) })).filter(x => x.v != null);
  if (V.length < 2) { mt = History.METRICS.find(x => x.k === 'worked'); V = H.map(x => ({ key: x.key, v: History.valOf(x.r, mt) })).filter(x => x.v != null); }
  if (V.length < 2) return '';
  const W = 200, Hh = 40, P = 5, lo = Math.min(...V.map(x => x.v)), hi = Math.max(...V.map(x => x.v)), sp = hi - lo || 1;
  const X = i => P + (i * (W - 2 * P)) / (V.length - 1), Y = v => Hh - P - ((v - lo) / sp) * (Hh - 2 * P), f = v => Math.round(v * 10) / 10;
  const last = V[V.length - 1];
  return `<div class="pspark"><svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" aria-hidden="true"><polyline points="${V.map((x, i) => `${f(X(i))},${f(Y(x.v))}`).join(' ')}"/><circle cx="${f(X(V.length - 1))}" cy="${f(Y(last.v))}" r="3.5"/></svg>
    <span><b>${esc(mt.fmt(last.v))}</b><small>${esc(mt.label)}<br>${esc(ymLabel(V[0].key))} – ${esc(ymLabel(last.key))}</small></span></div>`;
}
function popHtml(pid) {
  const p = effP(pid); if (!p) return '';
  const { m, K, c, under } = agentNums(pid), set = state.settings, nm = gname(p) || 'New person', id = Core.cleanId(p.nid), on = p.status !== 'Inactive';
  const cells = [];
  if (m) {
    cells.push(['Adherence', m.avg == null ? '<b>–</b>' : m.avg < set.target ? belowB(m.avg, pct(m.avg)) : `<b>${pct(m.avg)}</b>`]);
    if (under != null) cells.push(['Days under target', `<b>${under}</b>`]);
    cells.push(['AHT', `<b>${mss(m.aht)}</b>`]);
    if (m.inDed) cells.push(['Deduction', `<b>${m.ded ?? 0} min</b>`]);
  }
  if (c) { const at = attOf(pid), sa = at ? attSA(at.days) : null; cells.push([sa ? 'Scheduled / actual' : 'Worked days', `<b>${sa ? `${sa.sched} / ${sa.actual}` : c.worked}</b>`]); cells.push(['Absent', `<b>${c.absent}</b>`]); cells.push(['Tardy', `<b>${Math.round(c.tardyMin)} min</b>`]); }
  if (K) { cells.push(['Final %', `<b>${pct1(K.res.finalPct)}</b>`]); if (!srHidden()) cells.push(['Earned', `<b>${K.res.earned == null ? '–' : K.res.earned + ' SR'}</b>`]); }
  if (m && m.wf) cells.push(['Exceptions', `<b>${m.wf.exc}</b>`]);
  if (m && m.pf) { cells.push([m.pf.ans != null ? 'Answered' : 'Handled', `<b>${n0(m.pf.ans ?? m.pf.hnd)}</b>`]); cells.push(['Avg handle', `<b>${tms(m.pf.pAht)}</b>`]); }
  const q = state.roster.find(x => x._id === pid) || p;
  return `<div class="ph"><span class="av" aria-hidden="true"${avStyle(nm)}>${esc(initials(nm))}</span><div class="pwho"><b dir="auto">${esc(nm)}</b>${spvLine(pid)}<small dir="auto">${normSpace(p.sys) && normName(p.sys) !== normName(p.name) ? 'Roster: ' + esc(p.name) : esc(DEP_NAMES[p.team] || '')}</small></div><span class="stt${on ? ' on' : ''}">${on ? 'Active' : 'Inactive'}</span></div>
    <dl class="pfx"><div><dt>National ID</dt><dd class="num">${id ? esc(id) : '<span class="warnline">Missing</span>'}</dd></div><div><dt>Brand</dt><dd>${esc(p.brand || '–')}</dd></div><div><dt>Team</dt><dd>${esc(p.team || '–')}</dd></div></dl>
    ${cells.length ? `<div class="pmx">${cells.map(([l, v]) => `<div>${v}<span>${esc(l)}</span></div>`).join('')}</div>` : `<p class="subtle" style="margin:0">${state.ctx ? 'Not in this month\'s exports.' : 'No numbers yet for ' + esc(MONTH_LONG[state.m - 1]) + '.'}</p>`}
    ${sparkHtml(q)}<p class="phint">${m && !m.shown ? 'Hidden from the reports · ' : ''}Click for the full profile</p>`;
}
const pop = $('pop'); let popTimer = 0, popAnchor = null, mouseXY = [0, 0];
function showPop(a) {
  const pid = a.dataset.agent; if (!pid || openId || !a.isConnected) return;
  const html = state.ws !== 'build' ? popHtmlWs(pid) : popHtml(pid); if (!html) return;
  pop.innerHTML = html; pop.hidden = false; popAnchor = a; a.setAttribute('aria-describedby', 'pop');
  const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
  let x, y;
  if (r.width > 420) { x = Math.min(vw - w - 10, Math.max(10, mouseXY[0] + 18)); y = r.bottom + 8; if (y + h > vh - 10) y = r.top - h - 8; }
  else { x = r.right + 12; if (x + w > vw - 10) x = r.left - w - 12; if (x < 10) { x = Math.min(vw - w - 10, Math.max(10, r.left)); y = r.bottom + 8; if (y + h > vh - 10) y = r.top - h - 8; } else y = r.top; }
  pop.style.left = Math.round(x) + 'px'; pop.style.top = Math.round(Math.max(10, Math.min(vh - h - 10, y))) + 'px';
  pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
}
function hidePop() { clearTimeout(popTimer); if (popAnchor) popAnchor.removeAttribute('aria-describedby'); popAnchor = null; pop.hidden = true; }

// ---- performance: the Agent Performance Summary with all its columns
const tms = s => (s == null ? '–' : s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((Math.round(s) % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s) % 60).padStart(2, '0')}` : mss(s));
const n0 = v => (v == null ? '–' : Math.round(v).toLocaleString('en-US')), pr1 = v => (v == null ? '–' : (v * 100).toFixed(1) + '%');
// key: label, format, which way is better (1 higher, -1 lower, 0 neither), how a group adds up
const PFM = {
  ans: ['Answered', n0, 1, 'sum'], hnd: ['Handled', n0, 1, 'sum'], pAht: ['Avg handle', tms, -1, 'w'], talk: ['Avg talk', tms, 0, 'w'], hold: ['Avg hold', tms, -1, 'w'],
  acw: ['Avg ACW', tms, -1, 'w'], heldR: ['Hold rate', pr1, -1, 'r'], xferR: ['Transfer rate', pr1, -1, 'r'], out: ['Outbound', n0, 0, 'sum'],
};
const PF_COLS = ['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'heldR', 'xferR', 'out'];
const pfVal = (r, k) => (!r ? null : k === 'heldR' ? (r.hnd ? (r.held || 0) / r.hnd : null) : k === 'xferR' ? (r.hnd ? (r.xfer || 0) / r.hnd : null) : r[k] ?? null);
/** a group's numbers: counts added up, times weighted the way Genesys works them out (handle by handled, talk by answered, hold by held, ACW by ACW count) */
function perfAgg(rows) {
  const S = k => rows.reduce((a, r) => a + (r[k] || 0), 0), has = k => rows.some(r => r[k] != null);
  const w = (k, c) => { let s = 0, n = 0; for (const r of rows) if (r[k] != null && r[c]) { s += r[k] * r[c]; n += r[c]; } return n ? s / n : null; };
  let as = 0, an = 0; for (const r of rows) if (r.tAcw != null && r.acw) { as += r.tAcw; an += r.tAcw / r.acw; }
  const hnd = S('hnd');
  return { n: rows.length, ans: has('ans') ? S('ans') : null, hnd: has('hnd') ? hnd : null, pAht: w('pAht', 'hnd'), talk: w('talk', 'ans'), hold: w('hold', 'held'), acw: an ? as / an : w('acw', 'hnd'),
    heldR: hnd ? S('held') / hnd : null, xferR: hnd ? S('xfer') / hnd : null, out: has('out') ? S('out') : null };
}
/** the team's per-person figure to compare one agent with: counts per person, times and rates for the whole team */
function perfTeam(team) {
  const L = (state.model || []).filter(m => m.shown && m.pf && (m.p.team || '') === (team || '')).map(m => m.pf);
  if (!L.length) return null;
  const a = perfAgg(L); for (const k of ['ans', 'hnd', 'out']) if (a[k] != null) a[k] = a[k] / L.length; return a;
}
/** better or worse than the team: 'good', 'bad' or '' when it is close (within 15%), neither way is better,
    or the person handled too few conversations (under PF_MIN) for a fair comparison */
const PF_MIN = 50;
function perfVs(k, v, t, row) {
  const dir = PFM[k][2]; if (!dir || v == null || t == null || !t || !row || (row.hnd || 0) < PF_MIN) return '';
  const rel = (v - t) / t; if (Math.abs(rel) < 0.15) return '';
  return rel * dir > 0 ? 'good' : 'bad';
}
const pfMedia = s => String(s || '').split(/;\s*|\s*\|\s*/).filter(Boolean).join(', ');
function perfCardHtml(shown) {
  const PF = state.perf, ML = `${MONTH_LONG[state.m - 1]} ${state.y}`;
  if (!PF) return `<div class="card perfcard"><h2>Performance</h2><p class="cap">Drop the Agent Performance Summary export with all its columns on Import to see each employee's performance for ${esc(ML)} here. Exports of past months go to the history.</p><p class="hint">${esc(GX.perf)}</p></div>`;
  const teams = teamOrder(shown.filter(m => m.pf).map(m => m.p.team || ''));
  if (state.pfTeam && !teams.includes(state.pfTeam)) state.pfTeam = '';
  const L = shown.filter(m => m.pf && (!state.pfTeam || (m.p.team || '') === state.pfTeam)), miss = shown.filter(m => !m.pf && (!state.pfTeam || (m.p.team || '') === state.pfTeam));
  const A = perfAgg(L.map(m => m.pf)), TA = new Map(teams.map(t => [t, perfTeam(t)]));
  const sk = PFM[state.pfSort] || state.pfSort === 'name' ? state.pfSort : 'ans', dir = state.pfDir === 'asc' ? 1 : -1;
  const sorted = L.slice().sort((a, b) => {
    if (sk === 'name') return dir * a.exp.localeCompare(b.exp);
    const x = pfVal(a.pf, sk), y = pfVal(b.pf, sk); return (x == null) - (y == null) || dir * ((x ?? 0) - (y ?? 0)) || a.exp.localeCompare(b.exp);
  });
  const stat = (k, sub) => `<div><b>${esc(PFM[k][1](A[k]))}</b><span>${esc(PFM[k][0])}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const teamRowsHtml = [...teams.filter(t => !state.pfTeam || t === state.pfTeam).map(t => [t || 'No team', perfAgg(shown.filter(m => m.pf && (m.p.team || '') === t).map(m => m.pf))]), ...(state.pfTeam ? [] : [['All', perfAgg(shown.filter(m => m.pf).map(m => m.pf))]])]
    .map(([t, a]) => `<tr${t === 'All' ? ' class="tot"' : ''}><td>${esc(t)}</td><td class="r">${a.n}</td>${['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'heldR', 'xferR'].map(k => `<td class="r num">${esc(PFM[k][1](a[k]))}</td>`).join('')}</tr>`).join('');
  const th = (k, l) => `<th class="${k === 'name' ? '' : 'r'}"><button class="linkbtn" data-pfsort="${k}" aria-label="Sort by ${esc(l)}">${esc(l)}${sk === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  const agentRows = sorted.map(m => {
    const t = TA.get(m.p.team || '');
    return `<tr><td><button class="linkbtn nm" data-open="${esc(m.p._id)}" data-agent="${esc(m.p._id)}" dir="auto">${esc(m.exp)}</button></td><td>${esc(m.p.team || '')}</td>${PF_COLS.map(k => {
      const v = pfVal(m.pf, k), c = perfVs(k, v, t && t[k], m.pf);
      return `<td class="r num ${c}"${c ? ` title="${c === 'good' ? 'Better' : 'Worse'} than the ${esc(m.p.team || '')} average (${esc(PFM[k][1](t[k]))})"` : ''}>${esc(PFM[k][1](v))}${c ? `<span class="sr"> (${c === 'good' ? 'better' : 'worse'} than the team)</span>` : ''}</td>`;
    }).join('')}</tr>`;
  }).join('');
  const notOn = PF.rows.length - shown.filter(m => m.pf).length;
  return `<div class="card perfcard"><div class="cardhead"><div><h2>Performance</h2><p class="cap">${esc(ML)} from ${PF.src === 'the history' ? 'the history' : 'the Agent Performance Summary'}${PF.media ? ` (${esc(pfMedia(PF.media))})` : ''}${PF.full ? '' : ', part of the month'}. People in the reports only.</p></div>
      <div class="toolbar"><select class="cell" data-pfteam aria-label="Team"><option value="">All teams</option>${teams.map(t => `<option value="${esc(t)}"${t === state.pfTeam ? ' selected' : ''}>${esc(t || 'No team')}${DEP_NAMES[t] ? ' – ' + esc(DEP_NAMES[t]) : ''}</option>`).join('')}</select></div></div>
    <div class="pfstats">${stat('ans', `${plural(L.length, 'person', 'people')}`)}${stat('hnd')}${stat('pAht', 'weighted by handled')}${stat('hold', 'per held conversation')}${stat('acw')}${stat('xferR', 'transferred ÷ handled')}</div>
    <div style="overflow-x:auto"><table class="teamtab pfteam"><thead><tr><th>Team</th><th class="r">People</th>${['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'heldR', 'xferR'].map(k => `<th class="r">${esc(PFM[k][0])}</th>`).join('')}</tr></thead><tbody>${teamRowsHtml}</tbody></table></div>
    <details class="pfall"${state.pfOpen ? ' open' : ''}><summary>Every employee <span class="pill">${L.length}</span></summary>
      <p class="hint">Green is at least 15% better than the team, red at least 15% worse (only for people with ${PF_MIN} or more handled); select a column to sort.${miss.length ? ` Not in the export: ${esc(miss.slice(0, 6).map(m => m.exp).join(', '))}${miss.length > 6 ? ` and ${miss.length - 6} more` : ''}.` : ''}${notOn > 0 ? ` ${plural(notOn, 'agent')} in the export ${notOn === 1 ? 'is' : 'are'} not in the reports (other teams), so left out.` : ''}</p>
      <div class="tablewrap pftab"><table><thead><tr>${th('name', 'Name')}<th>Team</th>${PF_COLS.map(k => th(k, PFM[k][0])).join('')}</tr></thead><tbody>${agentRows || `<tr><td colspan="${PF_COLS.length + 2}" class="empty">Nobody in this team is in the export.</td></tr>`}</tbody></table></div></details></div>`;
}
function perfSectionHtml(m) {
  const PF = state.perf; if (!PF || !m) return '';
  const ML = `${MON[state.m - 1]} ${state.y}`;
  if (!m.pf) return `<section class="sec" id="pperf"><h3>Performance <small>${esc(ML)}</small></h3><p class="subtle">Not in the performance export for ${esc(ML)}. Check the Genesys name above, and that the export was not filtered to a queue or a division this person is not in.</p></section>`;
  const t = perfTeam(m.p.team || ''), team = m.p.team || 'team';
  const cell = k => {
    const v = pfVal(m.pf, k), tv = t ? t[k] : null, c = perfVs(k, v, tv, m.pf), rel = v != null && tv ? (v - tv) / tv : null;
    const vs = tv == null ? '' : `${team} ${['ans', 'hnd', 'out'].includes(k) ? 'avg' : ''} ${PFM[k][1](tv)}${rel != null && Math.abs(rel) >= 0.005 ? ` · ${rel > 0 ? '▲' : '▼'} ${Math.abs(rel * 100).toFixed(0)}%` : ''}`;
    return `<div class="${c}"><span>${esc(PFM[k][0])}</span><b>${esc(PFM[k][1](v))}</b><small>${esc(vs.replace(/\s+/g, ' '))}${c ? `<span class="sr">, ${c === 'good' ? 'better' : 'worse'} than the team</span>` : ''}</small></div>`;
  };
  return `<section class="sec" id="pperf"><div class="sechead"><h3>Performance <small>${esc(ML)}${PF.media ? ' · ' + esc(pfMedia(PF.media)) : ''}</small></h3></div>
    <div class="pfgrid">${PF_COLS.map(cell).join('')}</div>
    <p class="hint">Compared with the ${esc(team)} average for the month. Green is at least 15% better, red at least 15% worse${(m.pf.hnd || 0) < PF_MIN ? ` (not marked: fewer than ${PF_MIN} handled)` : ''}. Held ${n0(m.pf.held || 0)} · transferred ${n0(m.pf.xfer || 0)}.</p></section>`;
}

// ---- workforce and exceptions: the Daily WFM & Performance Review's measures for each employee, over the month
const hmin = v => { if (v == null) return '–'; const t = Math.round(v); return t >= 60 ? `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m` : `${t}m`; };
const wdName = d => String(Core.weekday(state.y, state.m, d) || '');
const clock = t => { if (t == null) return '–'; const d = new Date(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
/** what to follow up, in the daily review's words, for the month */
function wfReasons(w, m) {
  const T = WF_T(), out = [];
  if (w.absent) out.push(`${plural(w.absent, 'day')} with no sign-on`);
  if (w.late) out.push(`${plural(w.late, 'late sign-on')}, ${hmin(w.lateMin)} in all`);
  if (w.short) out.push(`${plural(w.short, 'day')} short of shift, ${hmin(w.shortMin)}`);
  if (w.lowAdh) out.push(`${plural(w.lowAdh, 'day')} under ${pct(T.adhTarget, 0)} adherence`);
  if (w.off) out.push(`${plural(w.off, 'day')} worked outside the published schedule`);
  if (w.highAht != null) out.push(`${mss(w.highAht)} AHT${m && m.pf && (m.pf.ans ?? m.pf.hnd) != null ? ` over ${n0(m.pf.ans ?? m.pf.hnd)} calls` : ''}`);
  if (w.highHold != null) out.push(`${mss(w.highHold)} hold per call`);
  if (w.rona != null) out.push(`${w.rona} no-answer alerts`);
  return out;
}
const WFC = {   // key: label, value, format, which way is better
  shifts: ['Shifts', w => w.shifts, String, 0], worked: ['Worked', w => w.worked, String, 0], absent: ['No sign-on', w => w.absent, String, -1],
  late: ['Late sign-ons', w => w.late, String, -1], lateMin: ['Late time', w => w.lateMin, hmin, -1], short: ['Short of shift', w => w.short, String, -1],
  shortMin: ['Short time', w => w.shortMin, hmin, -1], brk: ['Break changes', w => w.brk, String, 0], logged: ['Signed on', w => w.logged, hmin, 0],
  occ: ['Occupancy', w => w.occ, pr1, 0], lowAdh: ['Days < target', w => w.lowAdh, String, -1], exc: ['Exceptions', w => w.exc, String, -1], score: ['Follow-up score', w => w.score, v => (v == null ? '–' : v.toFixed(1)), -1],
};
const WF_COLS = ['shifts', 'worked', 'absent', 'late', 'lateMin', 'short', 'shortMin', 'brk', 'logged', 'occ', 'lowAdh', 'exc', 'score'];
function wfAgg(L) {
  const S = k => L.reduce((a, m) => a + (m.wf[k] || 0), 0);
  let h = 0, lg = 0; for (const m of L) if (m.wf.occ != null) { h += m.wf.occ * m.wf.logged; lg += m.wf.logged; }
  return { n: L.length, shifts: S('shifts'), worked: S('worked'), absent: S('absent'), late: S('late'), lateMin: S('lateMin'), short: S('short'), shortMin: S('shortMin'), brk: S('brk'), brkMin: S('brkMin'),
    logged: S('logged'), occ: lg ? h / lg : null, lowAdh: S('lowAdh'), exc: S('exc'), withAbs: L.filter(m => m.wf.absent).length, withExc: L.filter(m => m.wf.exc).length };
}
function wfCardHtml(shown) {
  if (!state.slots.schedule || !state.slots.timeline) return `<div class="card wfcard"><h2>Workforce and exceptions</h2><p class="cap">Add the Schedule and Agent Status Timeline exports to see, for every employee, the Daily WFM &amp; Performance Review's measures added up for the month: no sign-on, late sign-on, short of shift, break changes, time signed on, occupancy and the follow-up ranking.</p><p class="hint">${esc(GX.schedule)} ${esc(GX.timeline)}</p></div>`;
  const all = shown.filter(m => m.wf), teams = teamOrder(all.map(m => m.p.team || ''));
  if (state.wfTeam && !teams.includes(state.wfTeam)) state.wfTeam = '';
  const L = all.filter(m => !state.wfTeam || (m.p.team || '') === state.wfTeam), A = wfAgg(L), TH = WF_T(), ML = `${MONTH_LONG[state.m - 1]} ${state.y}`;
  if (!all.length) return `<div class="card wfcard"><h2>Workforce and exceptions</h2><p class="cap">Nobody in the reports has a schedule in ${esc(ML)}.</p></div>`;
  const tile = (b, l, sub, warn) => `<div class="${warn ? 'warn' : ''}"><b>${esc(b)}</b><span>${esc(l)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const cov = A.shifts ? A.worked / A.shifts : null;
  const tiles = tile(String(A.shifts), 'Shifts scheduled', plural(A.n, 'person', 'people')) + tile(String(A.worked), 'Worked', cov == null ? '' : `${pr1(cov)} covered`, cov != null && cov < 0.95)
    + tile(String(A.absent), 'No sign-on', A.absent ? `${plural(A.withAbs, 'person', 'people')}` : 'none', A.absent > 0) + tile(String(A.late), 'Late sign-ons', `${hmin(A.lateMin)} in all`, A.late > 0)
    + tile(String(A.short), 'Short of shift', `${hmin(A.shortMin)} lost`, A.short > 0) + tile(String(A.brk), 'Break changes', `${hmin(A.brkMin)} moved`)
    + tile(pr1(A.occ), 'Occupancy', 'handle time over time signed on') + tile(String(A.exc), 'Exceptions', `across ${plural(A.withExc, 'person', 'people')}`, A.exc > 0);
  const teamRows = [...teams.filter(t => !state.wfTeam || t === state.wfTeam).map(t => [t || 'No team', wfAgg(all.filter(m => (m.p.team || '') === t))]), ...(state.wfTeam ? [] : [['All', wfAgg(all)]])]
    .map(([t, a]) => `<tr${t === 'All' ? ' class="tot"' : ''}><td>${esc(t)}</td><td class="r">${a.n}</td><td class="r num">${a.shifts}</td><td class="r num">${a.worked}</td><td class="r num">${a.shifts ? pr1(a.worked / a.shifts) : '–'}</td><td class="r num">${a.absent}</td><td class="r num">${a.late}</td><td class="r num">${hmin(a.lateMin)}</td><td class="r num">${a.short}</td><td class="r num">${a.brk}</td><td class="r num">${pr1(a.occ)}</td><td class="r num">${a.exc}</td></tr>`).join('');
  const top = L.filter(m => m.wf.score > 0).sort((a, b) => b.wf.score - a.wf.score).slice(0, 10);
  const follow = top.length ? `<ol class="wffollow">${top.map(m => `<li><button class="linkbtn nm" data-open="${esc(m.p._id)}" data-agent="${esc(m.p._id)}" dir="auto">${esc(m.exp)}</button><span class="chip">${esc(m.p.team || '–')}</span><span class="why">${esc(wfReasons(m.wf, m).join(' · '))}</span></li>`).join('')}</ol>` : '<p class="subtle">Nothing to follow up this month.</p>';
  const sk = WFC[state.wfSort] || state.wfSort === 'name' ? state.wfSort : 'score', dir = state.wfDir === 'asc' ? 1 : -1;
  const sorted = L.slice().sort((a, b) => sk === 'name' ? dir * a.exp.localeCompare(b.exp) : (() => { const x = WFC[sk][1](a.wf), y = WFC[sk][1](b.wf); return (x == null) - (y == null) || dir * ((x ?? 0) - (y ?? 0)) || a.exp.localeCompare(b.exp); })());
  const th = (k, l) => `<th class="${k === 'name' ? '' : 'r'}"><button class="linkbtn" data-wfsort="${k}" aria-label="Sort by ${esc(l)}">${esc(l)}${sk === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  const rows = sorted.map(m => `<tr><td><button class="linkbtn nm" data-open="${esc(m.p._id)}" data-agent="${esc(m.p._id)}" dir="auto">${esc(m.exp)}</button></td><td>${esc(m.p.team || '')}</td>${WF_COLS.map(k => { const v = WFC[k][1](m.wf), bad = WFC[k][3] < 0 && v > 0 && k !== 'score'; return `<td class="r num${bad ? ' bad' : ''}">${esc(WFC[k][2](v))}</td>`; }).join('')}</tr>`).join('');
  return `<div class="card wfcard"><div class="cardhead"><div><h2>Workforce and exceptions</h2><p class="cap">${esc(ML)}, each scheduled day judged with the Daily WFM &amp; Performance Review's rules, then added up per employee: late after ${TH.tardyAfter} min, no sign-on after ${TH.absentAfter} min, short of shift from ${TH.shortfall} min, adherence target ${pct(TH.adhTarget, 0)}, AHT ceiling ${mss(TH.ahtCeil)}, high hold ${TH.holdMax}s, at least ${TH.minCalls} calls. Leave days are left out.</p></div>
      <div class="toolbar"><select class="cell" data-wfteam aria-label="Team"><option value="">All teams</option>${teams.map(t => `<option value="${esc(t)}"${t === state.wfTeam ? ' selected' : ''}>${esc(t || 'No team')}${DEP_NAMES[t] ? ' – ' + esc(DEP_NAMES[t]) : ''}</option>`).join('')}</select></div></div>
    <div class="pfstats wfstats">${tiles}</div>
    <div style="overflow-x:auto"><table class="teamtab pfteam"><thead><tr><th>Team</th><th class="r">People</th><th class="r">Shifts</th><th class="r">Worked</th><th class="r">Covered</th><th class="r">No sign-on</th><th class="r">Late</th><th class="r">Late time</th><th class="r">Short</th><th class="r">Break chg.</th><th class="r">Occupancy</th><th class="r">Exceptions</th></tr></thead><tbody>${teamRows}</tbody></table></div>
    <div class="wfsplit"><div><h3 class="sub">Priority follow-up</h3><p class="hint">Ranked by the daily review's severity weights added up over the month; a no-sign-on day counts ${TH.absentWeight}.</p>${follow}</div></div>
    <details class="pfall wfall"${state.wfOpen ? ' open' : ''}><summary>Every employee <span class="pill">${L.length}</span></summary>
      <div class="tablewrap pftab"><table><thead><tr>${th('name', 'Name')}<th>Team</th>${WF_COLS.map(k => th(k, WFC[k][0])).join('')}</tr></thead><tbody>${rows}</tbody></table></div></details></div>`;
}
function wfSectionHtml(m) {
  if (!m || !state.slots.schedule || !state.slots.timeline) return '';
  const ML = `${MON[state.m - 1]} ${state.y}`;
  if (!m.wf) return `<section class="sec" id="pwf"><h3>Workforce and exceptions <small>${esc(ML)}</small></h3><p class="subtle">No scheduled shift in ${esc(ML)} in the Schedule export. ${esc(schedCover())}</p><p class="hint">${esc(GX.schedule)}</p></section>`;
  const w = m.wf, TH = WF_T(), peers = (state.model || []).filter(x => x.shown && x.wf && (x.p.team || '') === (m.p.team || '')).sort((a, b) => b.wf.score - a.wf.score);
  const rank = w.score > 0 ? peers.findIndex(x => x === m) + 1 : 0;
  const cell = (l, v, sub, c) => `<div class="${c || ''}"><span>${esc(l)}</span><b>${esc(v)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const grid = cell('Shifts', String(w.shifts), w.leave ? `${plural(w.leave, 'leave day')} left out` : '') + cell('Worked', String(w.worked), w.shifts ? `${pr1(w.worked / w.shifts)} covered` : '', w.worked < w.shifts ? 'bad' : '')
    + cell('No sign-on', String(w.absent), '', w.absent ? 'bad' : '') + cell('Late sign-ons', String(w.late), w.late ? `${hmin(w.lateMin)} in all${w.excused ? ` · ${w.excused} excused` : ''}` : w.excused ? `${w.excused} excused` : '', w.late ? 'bad' : '')
    + cell('Short of shift', String(w.short), w.short ? `${hmin(w.shortMin)} lost` : '', w.short ? 'bad' : '') + cell('Break changes', String(w.brk), w.brk ? `${hmin(w.brkMin)} moved` : '')
    + cell('Signed on', hmin(w.logged), w.worked ? `${hmin(w.logged / w.worked)} per day worked` : '') + cell('Occupancy', pr1(w.occ), 'handle time over time signed on') + cell('Conformance', pr1(w.conf), 'scheduled time delivered')
    + cell(`Days under ${pct(TH.adhTarget, 0)}`, String(w.lowAdh), '', w.lowAdh ? 'bad' : '') + cell('Exceptions', String(w.exc), rank ? `#${rank} of ${peers.length} in ${m.p.team || 'the team'} for follow-up` : 'nothing to follow up', w.exc ? 'bad' : 'good');
  const reasons = wfReasons(w, m);
  const days = (m.wfDays || []).filter(r => !r.none);
  const what = r => {
    if (r.leave) return [`Leave · ${r.leave}`, ''];
    if (r.absent) return ['No sign-on', 'bad'];
    const x = [];
    if (r.late) x.push(`${r.late}m late`); if (r.excused) x.push(`${r.excused}m late, excused (${r.code})`);
    if (r.short) x.push(`${hmin(r.short)} short`); if (r.off) x.push('worked outside the schedule');
    if (r.brk) x.push(`${plural(r.brk, 'break change')}`);
    return [x.join(' · ') || (r.lowAdh != null ? 'Adherence under target' : 'On time'), r.late || r.short || r.lowAdh != null || r.off ? 'bad' : ''];
  };
  const dayRows = days.map(r => { const [t, c] = what(r); return `<tr class="${c}"><td>${esc(wdName(r.day).slice(0, 3))} ${r.day}</td><td class="num">${r.leave ? '–' : `${clock(r.start)}`}</td><td class="num">${r.leave || r.absent ? '–' : clock(r.firstOn)}</td><td class="num">${r.leave ? '–' : hmin(r.logged)}</td><td class="num${r.lowAdh != null ? ' low' : ''}">${r.leave || r.adh == null ? '–' : pct(r.adh, 1)}</td><td>${esc(t)}</td></tr>`; }).join('');
  return `<section class="sec" id="pwf"><div class="sechead"><h3>Workforce and exceptions <small>${esc(ML)} · daily review rules</small></h3></div>
    <div class="pfgrid wfgrid">${grid}</div>
    ${reasons.length ? `<p class="wfwhy"><b>To follow up:</b> ${esc(reasons.join(' · '))}</p>` : ''}
    <details class="wfdd"${state.wfDaysOpen ? ' open' : ''} data-wfdays><summary>Day by day <span class="pill">${plural(days.length, 'day')}</span></summary><div class="tablewrap histtab wfdays"><table><thead><tr><th>Day</th><th>Shift start</th><th>First sign-on</th><th>Signed on</th><th>Adherence</th><th>What happened</th></tr></thead><tbody>${dayRows}</tbody></table></div></details></section>`;
}

// ---- where each export comes from in Genesys Cloud (shown where a number is missing)
const GX = {
  schedule: 'In Genesys Cloud: Admin > Workforce Management > Schedules, open every schedule that touches the month, for every business unit, then Export > Activities. Drop all of them together; repeated rows are removed.',
  timeline: 'Analytics Workspace > Agent Status Summary view, set the month, all agents, then Export > Agent Status Timeline Details (one month per export).',
  perf: 'Analytics Workspace > Agents Performance Summary view, set the month, then Export with all columns (Answered, Handle, Avg Handle, Avg Talk, Avg Hold, Avg ACW, Total Talk, Total Hold, Total ACW, Held, Transferred, Outbound, Alert - No Answer).',
};
/** who the loaded schedule files cover, so a missing person is easy to explain */
function schedCover() {
  const S = state.slots.schedule; if (!S) return '';
  const names = new Set(S.dets.flatMap(d => d.data.segs.map(x => normName(x.name))));
  const teams = new Map();
  for (const p of rosterRows()) if (names.has(normName(normSpace(p.sys) ? p.sys : p.name))) { const k = `${p.brand || '–'} ${p.team || ''}`.trim(); teams.set(k, (teams.get(k) || 0) + 1); }
  const I = S.info, yr = I && I.lo != null && dd(I.lo).y !== dd(I.hi).y;
  return `The schedule loaded covers ${plural(names.size, 'agent')}${teams.size ? ` (${[...teams.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}${I && I.lo != null ? ` from ${fmtDay(I.lo, yr)} to ${fmtDay(I.hi, yr)}` : ''}.`;
}

// ---- daily adherence, day by day, as an Excel file: one person, or everyone in the reports
async function exportDailyAdh(pid) {
  const m = state.byId.get(pid), q = state.roster.find(x => x._id === pid); if (!m || !q) return;
  const pp = effP(pid) || q, nm = gname(pp) || m.exp, Y = state.y, Mo = state.m, ND = Core.daysIn(Y, Mo), set = state.settings;
  const raw = m.adh ? (state.ctx.rawAdh.find(x => normName(x.name) === m.ek) || { days: [] }).days : [];
  const at = attOf(pid), wd = new Map((m.wfDays || []).map(r => [r.day, r]));
  const S = new Writer2.Styles(), W = new Writer2.Sheet('Daily adherence'); W.tab = 'FF1F3864';
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } });
  const lb = S.get({ font: { b: true }, fill: 'FFD9E1F2', align: { h: 'left' } }), tx = S.get({ font: {}, align: { h: 'left' } }), num = S.get({ font: {}, align: { h: 'center' } });
  const pc = S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' }), pcBad = S.get({ font: { b: true, color: 'FFC00000' }, fill: 'FFFDE2E5', align: { h: 'center' }, numFmt: '0.00%' });
  const na = S.get({ font: { color: 'FF808080' }, align: { h: 'center' } }), off = S.get({ font: { color: 'FF808080' }, fill: 'FFF2F2F2', align: { h: 'left' } });
  const tot = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' } }), totP = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' }, numFmt: '0.00%' }), totL = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'left' } });
  const sa = at ? attSA(at.days) : null;
  [['Name (Genesys)', nm], ['Roster name', q.name], ['National ID', Core.cleanId(pp.nid) || ''], ['Brand', q.brand || ''], ['Team', `${q.team || ''}${DEP_NAMES[q.team] ? ' – ' + DEP_NAMES[q.team] : ''}`], ['Month', `${MONTH_LONG[Mo - 1]} ${Y}`],
    ['Scheduled / actual days', sa ? `${sa.sched} / ${sa.actual}${sa.why ? ' (' + sa.why + ')' : ''}` : m.wf ? `${m.wf.shifts} / ${m.wf.worked} (from the schedule)` : '']].forEach(([k, v], i) => { W.set(i + 1, 1, k, lb); W.set(i + 1, 2, v, tx); });
  const r0 = 9, HD = ['Date', 'Adherence', 'Counted', 'Status', 'Attendance', 'Sched. (min)', 'Actual (min)', 'Diff (min)', 'Shift start', 'First sign-on', 'Signed on (min)', 'Late (min)', 'Short (min)', 'Break changes', 'Notes'];
  HD.forEach((h, j) => { W.set(r0, j + 1, h, hd); W.width(j + 1, [16, 11, 11, 18, 13, 10, 10, 9, 10, 11, 11, 9, 9, 10, 44][j]); });
  W.width(2, 34);
  for (let d = 1; d <= ND; d++) {
    const r = r0 + d, i = d - 1, rv = raw[i] ?? null, cv = m.adh ? m.adh[i] : null, a = at ? at.days[i] : null, w = wd.get(d);
    const isOff = a === 'OFF' || (typeof a === 'string' && HOLIDAY_RE.test(a));
    W.set(r, 1, `${Core.weekday(Y, Mo, d)} ${d} ${MON[Mo - 1]}`, isOff ? off : tx);
    W.set(r, 2, rv, rv == null ? na : pc);
    if (cv != null) W.set(r, 3, cv, cv < set.target ? pcBad : pc); else W.set(r, 3, 'NA', na);
    W.set(r, 4, cv != null ? (cv < set.target ? 'Under target' : 'On target') : rv != null ? `NA: under ${pct(set.floor, 0)}` : m.adh ? 'NA: blank' : '', tx);
    W.set(r, 5, a == null ? '' : typeof a === 'number' ? `${a} min late` : a, isOff ? off : tx);
    const sv = m.sch ? m.sch[i] : null, av = m.act ? m.act[i] : null, df = m.diff ? m.diff[i] : null;
    W.set(r, 6, sv, num); W.set(r, 7, av, num); W.set(r, 8, df, num);
    if (w && !w.leave && !w.none) {
      W.set(r, 9, w.start != null ? clock(w.start) : '', num); W.set(r, 10, w.firstOn != null ? clock(w.firstOn) : '', num); W.set(r, 11, Math.round(w.logged || 0), num);
      W.set(r, 12, w.late ?? null, num); W.set(r, 13, w.short ?? null, num); W.set(r, 14, w.brk || null, num);
    }
    const notes = !w ? '' : w.leave ? `Leave: ${w.leave}` : w.absent ? 'No sign-on' : [w.excused && `${w.excused} min late, excused (${w.code})`, w.off && 'worked outside the schedule'].filter(Boolean).join(' · ');
    W.set(r, 15, notes, tx);
  }
  const a1 = r0 + 1, b1 = r0 + ND, rt = b1 + 1, col = c => `${Core.colName(c)}${a1}:${Core.colName(c)}${b1}`;
  const vals = m.adh ? m.adh.filter(v => v != null) : [];
  W.set(rt, 1, 'Avr. / totals', totL); W.set(rt, 3, vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : '', totP, `IFERROR(AVERAGE(${col(3)}),"")`);
  W.set(rt + 1, 1, 'Days counted', totL); W.set(rt + 1, 3, vals.length, tot, `COUNT(${col(3)})`);
  W.set(rt + 2, 1, `Days under ${pct(set.target, 0)}`, totL); W.set(rt + 2, 3, vals.filter(v => v < set.target).length, tot, `COUNTIF(${col(3)},"<"&${set.target})`);
  [6, 7, 8, 11, 12, 13, 14].forEach(c => { const v = [...Array(ND).keys()].reduce((s, i) => { const x = c === 6 ? m.sch && m.sch[i] : c === 7 ? m.act && m.act[i] : c === 8 ? m.diff && m.diff[i] : (() => { const w = wd.get(i + 1); return !w || w.leave || w.none ? null : c === 11 ? Math.round(w.logged || 0) : c === 12 ? w.late : c === 13 ? w.short : w.brk || null; })(); return s + (x || 0); }, 0); W.set(rt, c, v, tot, `SUM(${col(c)})`); });
  W.freeze = [r0 + 1, 2]; W.logoAt(4, 1, 52, 8, 4);
  const bytes = await Writer2.pack([W], S, {}, { logo: await xlLogo() });
  await save(`Daily adherence - ${nm.replace(/[\\/:*?"<>|]/g, '')} - ${MON[Mo - 1]} ${Y}.xlsx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
async function exportDailyAdhAll() {
  if (!state.model) return;
  const L = state.model.filter(m => m.shown && m.adh), Y = state.y, Mo = state.m, ND = Core.daysIn(Y, Mo), set = state.settings;
  if (!L.length) { toast('No daily adherence to export yet.'); return; }
  const S = new Writer2.Styles(), W = new Writer2.Sheet('Daily adherence'); W.tab = 'FF1F3864';
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } }), ttl = S.get({ font: { sz: 16, b: true, color: 'FF000000' } });
  const tx = S.get({ font: {}, align: { h: 'left' } }), num = S.get({ font: {}, align: { h: 'center' } }), pc = S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' });
  const pcBad = S.get({ font: { b: true, color: 'FFC00000' }, fill: 'FFFDE2E5', align: { h: 'center' }, numFmt: '0.00%' }), na = S.get({ font: { color: 'FF808080' }, align: { h: 'center' } });
  const totP = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' }, numFmt: '0.00%' }), tot = S.get({ font: { b: true }, fill: 'FFF2F2F2', align: { h: 'center' } });
  W.set(1, 1, `Daily adherence - ${MONTH_LONG[Mo - 1]} ${Y}`, ttl);
  const H = ['Name (Genesys)', 'National ID', 'Brand', 'Team', ...Array.from({ length: ND }, (_, i) => `${i + 1} ${Core.weekday(Y, Mo, i + 1).slice(0, 2)}`), 'Avr.', 'Days counted', `Days under ${pct(set.target, 0)}`, 'Sched. / actual days'];
  H.forEach((h, j) => { W.set(3, j + 1, h, hd); W.width(j + 1, j === 0 ? 30 : j === 1 ? 13 : j < 4 ? 9 : j < 4 + ND ? 7.5 : 11); });
  L.sort((a, b) => (DEP_ORDER.indexOf(a.p.team) + 1 || 99) - (DEP_ORDER.indexOf(b.p.team) + 1 || 99) || a.exp.localeCompare(b.exp));
  L.forEach((m, k) => {
    const r = 4 + k, pp = effP(m.p._id) || m.p, at = attOf(m.p._id), sa = at ? attSA(at.days) : null;
    W.set(r, 1, m.exp, tx); W.set(r, 2, Core.cleanId(pp.nid) || '', tx); W.set(r, 3, m.p.brand || '', num); W.set(r, 4, m.p.team || '', num);
    for (let i = 0; i < ND; i++) { const v = m.adh[i]; if (v == null) W.set(r, 5 + i, 'NA', na); else W.set(r, 5 + i, v, v < set.target ? pcBad : pc); }
    const a = Core.ref(r, 5), b = Core.ref(r, 4 + ND), vals = m.adh.filter(v => v != null);
    W.set(r, 5 + ND, vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : '', totP, `IFERROR(AVERAGE(${a}:${b}),"")`);
    W.set(r, 6 + ND, vals.length, tot, `COUNT(${a}:${b})`);
    W.set(r, 7 + ND, vals.filter(v => v < set.target).length, tot, `COUNTIF(${a}:${b},"<"&${set.target})`);
    W.set(r, 8 + ND, sa ? `${sa.sched} / ${sa.actual}` : m.wf ? `${m.wf.shifts} / ${m.wf.worked}` : '', num);
  });
  W.freeze = [4, 2]; W.filter = `A3:${Core.colName(H.length)}${3 + L.length}`; W.titleLogo();
  const bytes = await Writer2.pack([W], S, {}, { logo: await xlLogo() });
  await save(`Daily adherence - ${MON[Mo - 1]} ${Y}.xlsx`, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// ---- Preview: the employees, with this month's numbers
function ecardHtml(m) {
  const p = m.p, pp = effP(p._id) || p, nm = m.exp, K = state.kpi.get(p._id), id = Core.cleanId(pp.nid), below = m.avg != null && m.avg < state.settings.target;
  const w = m.wf, wfl = !state.review ? '' : !w ? '' : `<span class="wfl${w.exc ? '' : ' ok'}">${w.exc ? esc([w.absent && `${w.absent} no sign-on`, w.late && `${w.late} late`, w.short && `${w.short} short`, w.lowAdh && `${w.lowAdh} under target`, w.highAht != null && 'high AHT', w.highHold != null && 'high hold'].filter(Boolean).join(' · ')) : 'No exceptions this month'}<b>${w.exc ? plural(w.exc, 'exception') : ''}</b></span>`;
  const pfl = !state.perf ? '' : m.pf ? `<span class="astats pfl"><span><b>${n0(m.pf.ans ?? m.pf.hnd)}</b><i>${m.pf.ans != null ? 'Answered' : 'Handled'}</i></span><span><b>${tms(m.pf.pAht)}</b><i>Avg handle</i></span><span><b>${pr1(pfVal(m.pf, 'xferR'))}</b><i>Transfers</i></span></span>` : '<span class="pfl none">Not in the performance export</span>';
  return `<button class="ecard" data-open="${esc(p._id)}" data-agent="${esc(p._id)}" aria-label="${esc(nm)}, open the profile">
    <span class="atop"><span class="av" aria-hidden="true"${avStyle(nm)}>${esc(initials(nm))}</span><span class="who"><b dir="auto">${esc(nm)}</b>${spvLine(p._id)}<small>${esc(id || 'No National ID')} · ${esc(p.brand || '–')} · ${esc(p.team || '–')}</small></span></span>
    <span class="big">${m.avg == null ? '<b>–</b>' : below ? belowB(m.avg, pct(m.avg, 1)) : `<b>${pct(m.avg, 1)}</b>`}<i>Adherence</i></span>
    <span class="astats"><span><b>${K ? pct1(K.res.finalPct) : '–'}</b><i>Final</i></span>${srHidden() ? `<span><b>${K && K.res.elig ? (K.res.elig.ok ? 'Yes' : 'No') : '–'}</b><i>Eligible</i></span>` : `<span><b>${K && K.res.earned != null ? K.res.earned : '–'}</b><i>Earned SR</i></span>`}<span><b>${m.inDed ? (m.ded ?? 0) : mss(m.aht)}</b><i>${m.inDed ? 'Ded. min' : 'AHT'}</i></span></span>${pfl}${wfl}</button>`;
}
function employeesHtml() {
  const L0 = state.model.filter(m => m.shown), teams = teamOrder(L0.map(m => m.p.team || ''));
  if (state.eTeam && !teams.includes(state.eTeam)) state.eTeam = '';
  const fin = m => { const K = state.kpi.get(m.p._id); return K ? K.res.finalPct : null; }, earn = m => { const K = state.kpi.get(m.p._id); return K ? K.res.earned : null; };
  const by = (f, dir) => (a, b) => { const x = f(a), y = f(b); return (x == null) - (y == null) || dir * ((x ?? 0) - (y ?? 0)) || a.exp.localeCompare(b.exp); };
  const SORTS = { name: ['Name', (a, b) => a.exp.localeCompare(b.exp)], adh: ['Lowest adherence first', by(m => m.avg, 1)], adhHi: ['Highest adherence first', by(m => m.avg, -1)], fin: ['Highest final % first', by(fin, -1)], ...(srHidden() ? {} : { earned: ['Most earned first', by(earn, -1)] }), ded: ['Most deduction first', by(m => (m.inDed ? m.ded : null), -1)],
    ...(state.review ? { exc: ['Most exceptions first', by(m => (m.wf ? m.wf.score : null), -1)] } : {}),
    ...(state.perf ? { ans: ['Most answered first', by(m => pfVal(m.pf, 'ans') ?? pfVal(m.pf, 'hnd'), -1)], pAht: ['Longest avg handle first', by(m => pfVal(m.pf, 'pAht'), -1)], xferR: ['Highest transfer rate first', by(m => pfVal(m.pf, 'xferR'), -1)] } : {}) };
  const s = SORTS[state.eSort] ? state.eSort : 'name';
  const L = L0.filter(m => !state.eTeam || (m.p.team || '') === state.eTeam).sort(SORTS[s][1]);
  return `<div class="card emps"><div class="cardhead"><div><h2>Employees</h2><p class="cap">${plural(L.length, 'person', 'people')} in the reports. Point at a card for a quick look; select it for the full profile.</p></div>
    <div class="toolbar"><select class="cell" data-eteam aria-label="Team"><option value="">All teams</option>${teams.map(t => `<option value="${esc(t)}"${t === state.eTeam ? ' selected' : ''}>${esc(t || 'No team')}${DEP_NAMES[t] ? ' – ' + esc(DEP_NAMES[t]) : ''}</option>`).join('')}</select>
    <select class="cell" data-esort aria-label="Sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === s ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
    <div class="egrid">${L.map(ecardHtml).join('') || '<p class="subtle">Nobody in this team.</p>'}</div></div>`;
}

// the report builder's own downloads (the WFM Daily Review's .eml, .html and .csv) go through the page's save, so they work here too
window.__mcSave = async (name, blob) => {
  let c = await saveRaw(name, blob);
  if (c === 'rejected_extension' || c === 'extension_not_enabled') {
    const zn = name.replace(/\.[^.]+$/, '') + '.zip';
    c = await saveRaw(zn, new Blob([await Core.writeZip([{ name, data: new Uint8Array(await blob.arrayBuffer()) }])], { type: 'application/zip' }));
    toast(c === 'ok' ? `Saved ${zn}. This view cannot save .${name.split('.').pop()} files directly, so it is inside the zip.` : saveMsg(c, zn)); return;
  }
  toast(saveMsg(c, name));
};
// ---- motion: views rise in, a thumb slides under the current tab and step, cards reveal as you scroll
function animIn(el) {
  if (!el || RM()) return;
  el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); countUp(el);
  el.addEventListener('animationend', function done(e) { if (e.target === el) { el.classList.remove('enter'); el.removeEventListener('animationend', done); } });
}
function moveThumb(box, sel) {
  if (!box) return;
  let th = box.querySelector(':scope > .thumb');
  if (!th) { th = document.createElement('span'); th.className = 'thumb'; th.setAttribute('aria-hidden', 'true'); box.prepend(th); }
  const on = box.querySelector(sel);
  if (!on || on.hidden || !on.offsetWidth) { th.style.opacity = '0'; return; }
  const first = !th.dataset.on; th.dataset.on = '1';
  if (first) th.style.transition = 'none';
  th.style.opacity = '1'; th.style.width = on.offsetWidth + 'px'; th.style.height = on.offsetHeight + 'px';
  th.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
  if (first) { void th.offsetWidth; th.style.transition = ''; }
}
const thumbs = () => { moveThumb(document.querySelector('.steps'), '.step[aria-current="page"]'); moveThumb(document.querySelector('.tabs'), '.tab[aria-selected="true"]'); segThumbs(); };
/** every segmented control: a block slides from the chosen button to the next one (its last place is remembered, so it slides
    even when the control is drawn again) */
const segMem = new Map();
function segThumb(box) {
  if (!box || !box.isConnected) return;
  const on = box.querySelector(':scope > button[aria-pressed="true"]:not([hidden])'), key = box.id || box.getAttribute('aria-label') || box.className;
  let th = box.querySelector(':scope > .sthumb');
  if (!on || !on.offsetWidth) { if (th) th.style.opacity = '0'; return; }
  const g = { t: `translate(${on.offsetLeft}px, ${on.offsetTop}px)`, w: on.offsetWidth + 'px', h: on.offsetHeight + 'px' };
  if (!th) {
    th = document.createElement('span'); th.className = 'sthumb'; th.setAttribute('aria-hidden', 'true'); box.prepend(th);
    const was = segMem.get(key) || g; th.style.transition = 'none'; th.style.transform = was.t; th.style.width = was.w; th.style.height = was.h; void th.offsetWidth; th.style.transition = '';
  }
  box.classList.add('thumbed');
  th.style.opacity = '1'; th.style.transform = g.t; th.style.width = g.w; th.style.height = g.h; segMem.set(key, g);
}
function segThumbs() { if (RM()) return; document.querySelectorAll('.seg').forEach(b => { if (b.offsetParent !== null) segThumb(b); }); }
/** numbers count up to their value when a page or a card comes into sight (never while working: only on the way in) */
const CU_SEL = '.tile b, .minis b, .pfstats b, .sbprog b, .dmprog b, .rbbrands b, .ecard .big b, .kpicard b';
function countUp(root) {
  return;   // numbers are shown as they are: a dashboard read many times a day does not count up
  if (!root || RM() || !root.querySelectorAll) return;
  const items = [];
  for (const el of [...(root.matches(CU_SEL) ? [root] : []), ...root.querySelectorAll(CU_SEL)]) {
    if (el.dataset.cu || el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) continue;
    const t = el.textContent.trim(), m = t.match(/^(-?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(%?)$/); if (!m) continue;
    const v = parseFloat(m[2].replace(/,/g, '') + (m[3] ? '.' + m[3] : '')) * (m[1] ? -1 : 1); if (!isFinite(v) || v === 0) continue;
    el.dataset.cu = '1'; items.push({ el, v, dec: m[3] ? m[3].length : 0, grp: m[2].includes(','), suf: m[4], end: t });
  }
  if (!items.length) return;
  const t0 = performance.now(), D = 900, ease = x => 1 - Math.pow(1 - x, 3);
  const fmt = (x, it) => (it.grp ? x.toLocaleString('en-US', { minimumFractionDigits: it.dec, maximumFractionDigits: it.dec }) : x.toFixed(it.dec)) + it.suf;
  const step = now => {
    const k = Math.min(1, (now - t0) / D), e = ease(k);
    for (const it of items) if (it.el.isConnected) it.el.textContent = k >= 1 ? it.end : fmt(it.v * e, it);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/** the app bar: a shadow once the page scrolls under it */
let barScrolled = false;
window.addEventListener('scroll', () => { const s = scrollY > 6; if (s !== barScrolled) { barScrolled = s; const a = document.querySelector('header.appbar'); if (a) a.classList.toggle('scrolled', s); } }, { passive: true });
// the bar's real height (one or two tiers, the steps in Build), for what sticks under it and for scrolling to a heading
(() => { const a = document.querySelector('header.appbar'); if (!a || !window.ResizeObserver) return; let last = 0; const set = () => { const h = Math.round(a.getBoundingClientRect().height); if (h && h !== last) { last = h; document.documentElement.style.setProperty('--appbar-h', h + 'px'); } }; new ResizeObserver(set).observe(a); set(); })();
window.addEventListener('resize', () => { clearTimeout(window.__segT); window.__segT = setTimeout(segThumbs, 120); }, { passive: true });
let rvObs = null;
function reveal(root) {
  return;   // the page is there at once; nothing rises as it scrolls
  if (!root || RM() || !('IntersectionObserver' in window)) return;
  rvObs = rvObs || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rv-in'); rvObs.unobserve(e.target); countUp(e.target); } }), { rootMargin: '0px 0px -30px 0px' });
  // every position is read first, then the classes are set: reading after each change made the browser lay out a big page
  // again for every card (seconds on the Team page with every agent)
  const vh = innerHeight, L = [...root.querySelectorAll('.atile, .ecard, .tgroup > .grp, .card, .slot, .tile')].filter(el => !el.dataset.rv && !(el.parentElement && el.parentElement.closest('.cvauto')));   // inside a card the browser skips while off screen: left alone
  const later = L.filter(el => el.offsetParent !== null && el.getBoundingClientRect().top >= vh - 20);   // on screen (or hidden) now: no wait
  L.forEach(el => { el.dataset.rv = '1'; });
  later.forEach(el => { el.classList.add('rv'); rvObs.observe(el); });
}

// ---------------------------------------------------------------- navigation, drawers, toast, tooltip
function setStep(step) {
  if (!isBuilder()) return;
  if (REVIEW_TABS.includes(step)) { state.tab = step; step = 'review'; }
  leaveWs();
  if (step === 'settings') { openDrawer('dSettings'); $('month').focus(); return; }
  commitActive();
  if (step === 'email') mountMail(false);
  const from = state.step, changed = from !== step;
  state.step = step;
  for (const s of STEPS) $('v-' + s).hidden = s !== step;
  hidePop();
  if (step === 'review') setTab(state.tab, false);
  render();
  if (changed && STEPS.includes(from)) stepMoment(from, step); else if (changed) animIn($('v-' + step));
  window.scrollTo({ top: 0 });
  const h = $('h-' + step); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
function setTab(tab, focus) {
  commitActive();
  state.tab = tab;
  document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.tab === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
  const changed = $('p-' + tab).hidden;
  for (const t of REVIEW_TABS) $('p-' + t).hidden = t !== tab;
  hidePop();
  render({ table: true });
  moveThumb(document.querySelector('.tabs'), '.tab[aria-selected="true"]');
  if (changed) animIn($('p-' + tab));
}
let lastFocus = null, openId = null;
let closing = null;
function openDrawer(id) {
  if (closing) { clearTimeout(closing.t); closing.el.hidden = true; closing.el.classList.remove('out'); $('scrim').classList.remove('out'); closing = null; }
  if (openId && openId !== id) $(openId).hidden = true;
  if (!openId) lastFocus = document.activeElement;
  hidePop();
  openId = id; $('scrim').hidden = false; $(id).hidden = false; $('tt').hidden = true;
  if (id === 'dSettings') fillSettings();
  const f = $(id).querySelector('input, select, button:not([data-close]), [data-close]'); if (f) f.focus();
}
function closeDrawer() {
  if (!openId) return;
  const el = $(openId);
  if (RM()) { el.hidden = true; $('scrim').hidden = true; }
  else {   // slide out, then hide; nothing waits for it
    el.classList.add('out'); $('scrim').classList.add('out');
    closing = { el, t: setTimeout(() => { el.hidden = true; el.classList.remove('out'); $('scrim').hidden = true; $('scrim').classList.remove('out'); closing = null; }, 240) };
  }
  openId = null; state.personId = null; state.personK = null;
  if (lastFocus && lastFocus.isConnected) lastFocus.focus();
}
function openPerson(id) { commitActive(); state.personId = id; renderPerson(); openDrawer('dPerson'); }
let tt = null, toastFn = null;
function toast(msg, action) {
  $('toastMsg').textContent = msg; const a = $('toastAct');
  toastFn = action ? action.fn : null; a.hidden = !action; if (action) a.textContent = action.label;
  $('toast').hidden = false; clearTimeout(tt); tt = setTimeout(() => { $('toast').hidden = true; toastFn = null; }, action ? 7000 : 3500);
}
function setSeg(el, f) { [...el.querySelectorAll('button')].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f))); }

// ---- settings drawer
function fillSettings() {
  const s = state.settings;
  $('month').value = `${state.y}-${String(state.m).padStart(2, '0')}`;
  $('monthHelp').textContent = state.monthManual ? 'Set by you. Files dropped later will not change it.' : 'Detected from the exports. Change it if a file covers more than one month.';
  $('target').value = +(s.target * 100).toFixed(2); $('floor').value = +(s.floor * 100).toFixed(2); $('inactiveMin').value = s.inactiveMin;
  chips($('dedBrands'), BRANDS, 'dedBrands'); chips($('dedTeams'), DEP_ORDER, 'dedTeams', DEP_NAMES); chips($('incFull'), DEP_ORDER, 'incFullAdhTeams', DEP_NAMES);
  $('mgrName').value = s.manager; $('mgrTitle').value = s.managerTitle; renderLogo();
  setSeg($('theme'), themeNow());
  const u = Auth.user(); $('setSaved').textContent = state.db ? savedWhere() : 'Not saved in this view';
  $('setWho').textContent = u ? `Signed in as ${u.name} (${u.username ? 'username ' + u.username + ', ' : ''}${u.email}), ${u.role === 'admin' ? 'admin' : 'user'}` : 'Sign-in is off in this view.';
  $('lockMins').value = String(Auth.lockMins()); $('lockMins').disabled = $('chgPw').disabled = $('lockNow2').disabled = $('signOut2').disabled = !u;
}
function chips(el, values, key, titles) {
  el.innerHTML = values.map(v => `<label class="chip"${titles ? ` title="${esc(titles[v])}"` : ''}><input type="checkbox" value="${esc(v)}"${state.settings[key].includes(v) ? ' checked' : ''}>${esc(v)}</label>`).join('');
}
function themeNow() { try { return localStorage.getItem('mc-theme') || 'dark'; } catch (e) { return 'dark'; } }   // dark by default, like the company website
function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }

// ---------------------------------------------------------------- events
const drop = $('drop');
drop.addEventListener('click', () => $('picker').click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('picker').click(); } });
$('picker').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) { if (state.step !== 'import') setStep('import'); addFiles(f); } });
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = [...(e.dataTransfer?.files || [])]; if (f.length) addFiles(f); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  if (drop.contains(e.target) || $('wbDrop').contains(e.target)) return; e.preventDefault(); const f = [...(e.dataTransfer?.files || [])]; if (!f.length) return;
  if (state.ws !== 'build') { wsDrop(f); return; }
  if (state.step === 'email') { loadWorkbook(f[0]); return; }
  if (state.step !== 'import') setStep('import'); addFiles(f);
});
$('slots').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-pick')) $('picker').click();
  const k = b.getAttribute('data-unslot');
  if (k) { const old = state.slots[k]; delete state.slots[k]; impLogAdd('removed', `Removed ${KIND_BY[k].title}: ${old.name}`); refresh(); toast(`Removed ${old.name}`, { label: 'Undo', fn: () => { state.slots[k] = old; impLogAdd('read', `Put back ${KIND_BY[k].title}: ${old.name}`); refresh(); } }); }
});
$('others').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const rm = b.getAttribute('data-unother'), ro = b.getAttribute('data-roster-other');
  if (rm != null) { const o = state.others[+rm]; state.others.splice(+rm, 1); if (o) impLogAdd('removed', `Removed ${o.name}`); renderOthers(); renderImpSide(); }
  if (ro != null) { const o = state.others[+ro]; prepareMerge(o.det.data, o.name); }
});
$('toReview').addEventListener('click', () => setStep('review'));
$('distBtn').addEventListener('click', openDistPaste);
document.querySelectorAll('.step').forEach(b => b.addEventListener('click', () => setStep(b.dataset.step)));
$('monthBtn').addEventListener('click', () => { openDrawer('dSettings'); $('month').focus(); });
$('setBtn').addEventListener('click', () => openDrawer('dSettings'));
$('helpBtn').addEventListener('click', () => openDrawer('dHelp'));
$('siteFoot').addEventListener('click', e => { const b = e.target.closest('[data-foot]'); if (!b) return; const a = b.dataset.foot; if (a === 'find') findOpen(); else if (a === 'help') openDrawer('dHelp'); else window.scrollTo({ top: 0, behavior: RM() ? 'auto' : 'smooth' }); });
$('buildTop').addEventListener('click', e => askBuild(e.currentTarget)); $('build').addEventListener('click', e => askBuild(e.currentTarget));
$('v-export').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) setStep(g.dataset.go); const a = e.target.closest('#buildAgain'); if (a) askBuild(a); });
for (const id of ['v-review', 'v-import']) $(id).addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g && !e.target.closest('#p-checks .note')) setStep(g.dataset.go); });

// tabs
const tabsEl = document.querySelector('.tabs');
tabsEl.addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setTab(t.dataset.tab, true); });
tabsEl.addEventListener('keydown', e => {
  const order = REVIEW_TABS, i = order.indexOf(state.tab);
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setTab(order[(i + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length], true); }
  if (e.key === 'Home') { e.preventDefault(); setTab('checks', true); } if (e.key === 'End') { e.preventDefault(); setTab('history', true); }
});

// people
$('rq').addEventListener('input', e => { state.rq = e.target.value; $('rwrap').scrollTop = 0; renderPeople(); });
$('rseg').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f) return; state.rf = f; setSeg($('rseg'), f); $('rwrap').scrollTop = 0; renderPeople(); });
let scrollRaf = 0;
$('rwrap').addEventListener('scroll', () => {
  if (!state.vrows || state.vrows.length <= VTHRESH || scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    if (tableHasFocus() && state.vrange) {   // keep the focused input alive while the rendered rows still cover the view
      const w = $('rwrap'), top = Math.max(0, w.scrollTop - 34), bottom = top + w.clientHeight;
      if (top >= state.vrange[0] * ROWH && bottom <= state.vrange[1] * ROWH) return;
      commitActive();
    }
    renderWindow(false);
  });
}, { passive: true });
$('addPerson').addEventListener('click', () => {
  state.rq = ''; $('rq').value = ''; state.rf = 'all'; setSeg($('rseg'), 'all');
  state.rteam = '';
  const id = addPerson(); $('rwrap').scrollTop = 0;
  if (state.pview === 'cards') { state.peditOpen = true; openPerson(id); const n = $('personBody').querySelector('[data-pf="name"]'); if (n) n.focus(); return; }
  renderRoster();
  const el = $('roster').querySelector(`tr[data-id="${CSS.escape(id)}"] input[data-f="name"]`); if (el) el.focus();
});
$('importRoster').addEventListener('click', () => $('rosterPicker').click());
$('rosterPicker').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importRosterFile(f); });
$('exportRoster').addEventListener('click', () => {
  if (!rosterRows().length) { toast('The roster is empty.'); return; }
  const d = new Date(); save(`MC Roster - ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`, new Blob([rosterCsv()], { type: 'text/csv' }));
});
const tbody = $('roster');
tbody.addEventListener('change', e => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return; const id = tr.dataset.id;
  if (e.target.hasAttribute('data-sel')) { if (e.target.checked) state.sel.add(id); else state.sel.delete(id); syncSel(); return; }
  const f = e.target.getAttribute('data-f'); if (!f) return;
  const v = f === 'brand' || f === 'team' ? e.target.value : normSpace(e.target.value);
  if (f !== 'brand' && f !== 'team') e.target.value = v;
  if (f === 'spvName') { commitSup(id, v, e.target); refresh({ table: false }); return; }
  const p = state.roster.find(x => x._id === id), prev = p ? p.sys || '' : '';
  updatePerson(id, { [f]: v });
  if (f === 'sys' && p) afterSysEdit(p, prev, v);
});
tbody.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input.cell')) { e.preventDefault(); e.target.blur(); e.target.focus(); } });
tbody.addEventListener('click', e => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return; const id = tr.dataset.id;
  if (e.target.closest('[data-sw]')) { const p = state.roster.find(x => x._id === id); const prev = updatePerson(id, { status: p.status === 'Inactive' ? 'Active' : 'Inactive' }); return prev; }
  if (e.target.closest('[data-open]')) { openPerson(id); return; }
  if (e.target.closest('[data-del]')) {
    const gone = removePeople([id]); const nm = normSpace(gone[0] && gone[0].name) || 'the new row';
    toast(`Removed ${nm}`, { label: 'Undo', fn: () => restorePeople(gone) });
  }
});
tbody.addEventListener('focusout', () => { setTimeout(() => { if (state.pendingRender && !tableHasFocus()) renderRoster(); }, 0); });
$('selAll').addEventListener('change', e => { for (const p of state.vrows || []) { if (e.target.checked) state.sel.add(p._id); else state.sel.delete(p._id); } renderRoster(); });
$('bulk').addEventListener('click', e => {
  const v = e.target.closest('button')?.dataset.bulk; if (!v) return;
  if (v === 'clear') { state.sel.clear(); renderRoster(); return; }
  if (v === 'match') { openMatch([...state.sel], e.target.closest('button')); return; }
  const ids = [...state.sel].filter(id => { const p = state.roster.find(x => x._id === id); return p && (p.status === 'Inactive' ? 'Inactive' : 'Active') !== v; });
  const before = ids.map(id => [id, state.roster.find(x => x._id === id).status || 'Active']);
  ids.forEach(id => updatePerson(id, { status: v }, { quiet: true }));
  state.sel.clear(); refresh({ table: true });
  toast(ids.length ? `Set ${plural(ids.length, 'person', 'people')} to ${v}` : `Already ${v}`, ids.length ? { label: 'Undo', fn: () => { before.forEach(([id, s]) => updatePerson(id, { status: s }, { quiet: true })); refresh({ table: true }); } } : null);
});

// issues
$('issues').addEventListener('click', e => {
  const li = e.target.closest('li[data-key]');
  if (e.target.id === 'unignore') { state.ignored.clear(); refresh(); return; }
  if (e.target.closest('[data-matchall]')) { openMatch(null, e.target.closest('button')); return; }
  if (!li) return; const x = state.issues.find(i => i.key === li.dataset.key); if (!x) return;
  const link = e.target.closest('[data-link]');
  if (link) { const id = link.dataset.link, p = state.roster.find(q => q._id === id), prev = p.sys; updatePerson(id, { sys: x.name }); toast(`${x.name} linked to ${p.name}`, { label: 'Undo', fn: () => updatePerson(id, { sys: prev || '' }) }); return; }
  if (e.target.closest('[data-addnew]')) { const id = addPerson({ name: x.name }); toast(`Added ${x.name}. Set the brand, team and ID in People.`, { label: 'Undo', fn: () => removePeople([id]) }); return; }
  if (e.target.closest('[data-ignore]')) { state.ignored.add(x.key); refresh(); }
});
$('issues').addEventListener('change', e => {
  const s = e.target.closest('[data-linkto]'); if (!s || !s.value) return;
  const x = state.issues.find(i => i.key === s.dataset.linkto), p = state.roster.find(q => q._id === s.value); if (!x || !p) return;
  const prev = p.sys; updatePerson(p._id, { sys: x.name });
  toast(`${x.name} linked to ${p.name}`, { label: 'Undo', fn: () => updatePerson(p._id, { sys: prev || '' }) });
});

// preview + person
$('preview').addEventListener('click', e => { if (e.target.closest('[data-adhall]')) { exportDailyAdhAll(); return; } const b = e.target.closest('[data-open]'); if (b) openPerson(b.dataset.open); });
$('personBody').addEventListener('click', e => { if (e.target.closest('[data-psw]')) { const p = state.roster.find(x => x._id === state.personId); if (p) updatePerson(p._id, { status: p.status === 'Inactive' ? 'Active' : 'Inactive' }); } });
document.addEventListener('mousemove', e => {
  const t = e.target.closest && e.target.closest('[data-tt]'), el = $('tt');
  if (!t) { el.hidden = true; return; }
  el.textContent = t.dataset.tt; el.hidden = false;
  const w = el.offsetWidth, x = Math.min(window.innerWidth - w - 8, e.clientX + 12); el.style.left = Math.max(8, x) + 'px'; el.style.top = (e.clientY - 34) + 'px';
});

// drawers
$('scrim').addEventListener('click', closeDrawer);
document.querySelectorAll('.drawer').forEach(d => d.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); }));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && openId) { e.preventDefault(); closeDrawer(); return; }
  if (e.key === 'Tab' && openId) {
    const f = [...$(openId).querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('confirmOk').addEventListener('click', applyMerge);
$('toastAct').addEventListener('click', () => { const fn = toastFn; toastFn = null; $('toast').hidden = true; if (fn) fn(); });

// settings
$('month').addEventListener('change', e => { const [y, m] = e.target.value.split('-').map(Number); if (y && m) { state.y = y; state.m = m; state.monthManual = true; $('monthHelp').textContent = 'Set by you. Files dropped later will not change it.'; refresh(); } });
for (const [id, key, div, lo, hi] of [['target', 'target', 100, 0, 100], ['floor', 'floor', 100, 0, 100], ['inactiveMin', 'inactiveMin', 1, 0, 31]]) {
  $(id).addEventListener('change', e => { const v = parseFloat(e.target.value); if (!Number.isFinite(v) || v < lo || v > hi) { fillSettings(); toast(`Use a number from ${lo} to ${hi}.`); return; } state.settings[key] = key === 'inactiveMin' ? Math.round(v) : v / div; refresh(); persistSettings(); });
}
for (const [id, key] of [['dedBrands', 'dedBrands'], ['dedTeams', 'dedTeams']]) $(id).addEventListener('change', () => { state.settings[key] = [...$(id).querySelectorAll('input:checked')].map(i => i.value); refresh(); persistSettings(); });
$('resetSet').addEventListener('click', () => { state.settings = clone(DEFAULTS); if (state.monthManual) { state.monthManual = false; const g = Core.guessMonth(allDets()); state.y = g.y; state.m = g.m; } fillSettings(); refresh(); persistSettings(); toast('Settings reset to the defaults'); });
$('theme').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f) return; setTheme(f); });


// email
const wbDrop = $('wbDrop');
wbDrop.addEventListener('click', () => $('wbPicker').click());
wbDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('wbPicker').click(); } });
$('wbPicker').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; loadWorkbook(f); });
['dragenter', 'dragover'].forEach(t => wbDrop.addEventListener(t, e => { e.preventDefault(); wbDrop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => wbDrop.addEventListener(t, e => { e.preventDefault(); wbDrop.classList.remove('over'); }));
wbDrop.addEventListener('drop', e => { const f = [...(e.dataTransfer?.files || [])]; if (f.length) loadWorkbook(f[0]); });
$('v-email').addEventListener('click', e => {
  const c = e.target.closest('[data-wbclear]');
  if (c) { if (c.dataset.wbclear === 'inc') state.incWb = null; else state.wb = null; state.mailSubjects = {}; state.mailDeadline = null; render(); return; }
  if (e.target.closest('#revPick')) { $('revPicker').click(); return; }
  if (e.target.closest('[data-revclear]')) { delete state.revWb[state.mailKind]; renderEmail(); }
});
$('revPicker').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; loadRevFile(f); });
$('mKind').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f) return; state.mailKind = f; lastMailHtml = ''; renderEmail(); renderSteps(); });
$('mStage').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f) return; state.mailStage = f; lastMailHtml = ''; renderEmail(); renderSteps(); });
let mailRaf = 0; const mailRender = () => { cancelAnimationFrame(mailRaf); mailRaf = requestAnimationFrame(renderEmail); };
for (const [id, key] of [['mTo', 'to'], ['mCc', 'cc'], ['mGreeting', 'greeting'], ['mSign', 'sign']]) $(id).addEventListener('input', e => { mailCfg()[key] = e.target.value; mailRender(); persistMail(); });
$('mIntro').addEventListener('input', e => { state.mail[state.mailStage === 'final' ? 'introFinal' : 'intro'] = e.target.value; mailRender(); persistMail(); });
$('mSubject').addEventListener('input', e => { state.mailSubjects[doneKey()] = e.target.value; mailRender(); });
$('mDeadline').addEventListener('change', e => { state.mailDeadline = e.target.value || null; mailRender(); });
$('mAbsScope').addEventListener('change', e => { state.mail.absScope = e.target.value; renderEmail(); persistMail(); });
$('mZeros').addEventListener('change', e => { state.mail.zeros = e.target.checked; renderEmail(); persistMail(); });
$('mAttach').addEventListener('change', e => { mailCfg().attach = e.target.checked; renderEmail(); persistMail(); });
$('mChanges').addEventListener('change', e => { state.mailChanges = e.target.checked; renderEmail(); });
$('mReset').addEventListener('click', () => {
  if (state.mailKind === 'inc') { for (const k of ['greeting', 'sign']) state.incMail[k] = INC_DEFAULTS[k]; }
  else for (const k of ['greeting', 'intro', 'introFinal', 'sign']) state.mail[k] = MAIL_DEFAULTS[k];
  delete state.mailSubjects[doneKey()]; state.mailDeadline = null; ['mGreeting', 'mIntro', 'mSign', 'mSubject', 'mDeadline'].forEach(id => { $(id).value = ''; });
  renderEmail(); persistMail(); toast('Message reset to the default');
});
document.querySelector('.mailform').addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const el = $(b.dataset.copy), txt = b.dataset.copy === 'mSubject' ? curMail().md.subject : addrList(el.value).join('; ');
  toast(await copyRich(null, txt) ? 'Copied' : 'Copy is blocked here. Select the text and press Ctrl+C.');
});
$('copyMail').addEventListener('click', async () => {
  const cm = curMail(), ed = mailEdited();
  if (await copyRich(ed ? ed.html : cm.html(state.logo ? state.logo.dataUrl : null, false), ed ? ed.text : cm.text)) {
    markSent('Copied');
    toast(`Copied, nothing was sent. In Outlook, start a new email and paste into the body.${cm.md.attach && mailCfg().attach ? ' Use Save attachment to get the file to attach.' : ''}`);
  } else toast('Copy is blocked in this view. Use Download .eml instead.');
});
$('attBtn').addEventListener('click', async () => {
  const cm = curMail(); if (!cm.md.attach) return;
  try { const bytes = await attachmentBytes(cm.inc); if (bytes) await save(cm.md.attach.name, new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); }
  catch (e) { toast('Could not make the attachment: ' + (e && e.message ? e.message : e)); }
});
$('emlBtn').addEventListener('click', async () => {
  const cm = curMail(), fn = cm.file;
  let attach = null;
  if (cm.md.attach && mailCfg().attach) { try { const bytes = await attachmentBytes(cm.inc); if (bytes) attach = { name: cm.md.attach.name, bytes }; } catch (e) { toast('Could not make the attachment: ' + (e && e.message ? e.message : e)); return; } }
  const logo = state.logo && state.mailLogo ? state.logo : null;
  const ed = mailEdited(), bytes = enc8.encode(emlFile({ to: cm.to, cc: cm.cc, subject: cm.md.subject, text: ed ? ed.text : cm.text, html: ed ? ed.html : cm.html(logo ? 'cid:logo@mc' : null, false), attach, logo: ed ? null : logo }));
  let c = await saveRaw(fn, new Blob([bytes], { type: 'message/rfc822' }));
  if (c === 'rejected_extension' || c === 'extension_not_enabled') {
    const zn = fn.replace(/\.eml$/, '.zip');
    c = await saveRaw(zn, new Blob([await Core.writeZip([{ name: fn, data: bytes }])], { type: 'application/zip' }));
    if (c === 'ok') { markSent('Downloaded'); toast(`Saved ${zn}. This view cannot save .eml files directly, so it is inside the zip: open the zip, then the .eml. Nothing was sent.`); return; }
  }
  if (c === 'ok') { markSent('Downloaded'); toast(`Saved ${fn}. Open it to get a ready-to-send Outlook draft. Nothing was sent.`); } else toast(saveMsg(c, fn));
});

// notifications: the bell's drawer and Review › Checks show the same checks, with the same actions
const noteOn = (type, fn) => ['notesBody', 'checksBody'].forEach(id => $(id).addEventListener(type, fn));
$('bell').addEventListener('click', openNotes);
noteOn('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pick) { state.attPicks.set(b.dataset.pick, JSON.parse(b.dataset.v)); persistAtt(); refresh(); renderNotes(); return; }
  if (b.dataset.unpick) { state.attPicks.delete(b.dataset.unpick); persistAtt(); refresh(); renderNotes(); return; }
  if (b.dataset.undo) { state.attUndo.add(b.dataset.undo); persistAtt(); refresh(); renderNotes(); toast('Undone. The file\'s own value is used.', { label: 'Redo', fn: () => { state.attUndo.delete(b.dataset.undo); persistAtt(); refresh(); renderNotes(); } }); return; }
  if (b.dataset.redo) { state.attUndo.delete(b.dataset.redo); persistAtt(); refresh(); renderNotes(); return; }
  if (b.dataset.attadd != null && state.attRes) {
    const u = state.attRes.unmatched[+b.dataset.attadd]; if (!u) return;
    const brand = BRANDS.find(x => normName(x) === normName(u.team)) || 'Virgin', team = DEP_ORDER.find(x => normName(x) === normName(u.dep)) || 'CC';
    const id = addPerson({ name: normSpace(u.name), nid: Core.cleanId(u.idRaw) || '', brand, team });
    renderNotes(); toast(`Added ${u.name} (${brand} · ${team}). Check them in People.`, { label: 'Undo', fn: () => { removePeople([id]); renderNotes(); } }); return;
  }
  if (b.dataset.gonote) { closeDrawer(); if (b.dataset.gonote === 'dups') openDups(); else if (b.dataset.gonote === 'history' || b.dataset.gonote === 'kpi') { setStep('review'); setTab(b.dataset.gonote, false); } else setStep(b.dataset.gonote); }
});
noteOn('change', e => {
  const s = e.target.closest('[data-attlink]'); if (!s || !s.value || !state.attRes) return;
  const u = state.attRes.unmatched[+s.dataset.attlink], p = state.roster.find(q => q._id === s.value); if (!u || !p) return;
  state.attLinks.set(normName(u.name), p._id); persistLinks(); refresh(); renderNotes();
  toast(`${u.name} is now read as ${p.name}`, { label: 'Undo', fn: () => { state.attLinks.delete(normName(u.name)); persistLinks(); refresh(); renderNotes(); } });
});

// attendance card on Import
$('attCard').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.unatt) { const f = state.attFiles.find(x => x.name === b.dataset.unatt); state.attFiles = state.attFiles.filter(x => x !== f); if (f) impLogAdd('removed', `Removed attendance sheet: ${f.name}`); refresh(); if (f) toast(`Removed ${f.name}`, { label: 'Undo', fn: () => { state.attFiles.push(f); impLogAdd('read', `Put back attendance sheet: ${f.name}`); refresh(); } }); }
  if (b.id === 'attNotes') openNotes();
  if (b.id === 'attPick') $('picker').click();
});

// IDs file card + note actions
$('idsCard').addEventListener('click', e => {
  if (e.target.closest('#idsNotes')) openNotes();
  if (e.target.closest('#idsRemove')) { const old = state.idsFile; state.idsFile = null; persistIds(); refresh(); toast('IDs file removed. The IDs already added to the roster stay.', { label: 'Undo', fn: () => { state.idsFile = old; persistIds(); refresh(); } }); }
});
noteOn('click', e => {
  const u = e.target.closest('[data-idsundo]');
  if (u) { const pid = u.dataset.idsundo, l = state.idsLog.find(x => x.pid === pid); if (!l) return; state.idsUndo.add(pid); keepIds('nofill:' + pid); state.idsLog = state.idsLog.filter(x => x !== l); updatePerson(pid, { nid: l.prev }, { quiet: true }); refresh(); renderNotes(); toast('ID removed again'); return; }
  const b = e.target.closest('[data-ida]'); if (!b) return;
  const a = b.dataset.ida, x = b.dataset.idx, v = b.dataset.idv, F = state.idsFile;
  if (a === 'keep') keepIds(x);
  if (a === 'useid' || a === 'fuzzyyes') { const p = state.roster.find(q => q._id === x); if (p) { const prev = p.nid; updatePerson(x, { nid: v }, { quiet: true }); toast(`${p.name}: ID ${v}`, { label: 'Undo', fn: () => { updatePerson(x, { nid: prev || '' }); renderNotes(); } }); } }
  if (a === 'usebt') { const [brand, team] = v.split('|'); const p = state.roster.find(q => q._id === x); if (p) { const prev = { brand: p.brand, team: p.team }; updatePerson(x, { brand, team }, { quiet: true }); toast(`${p.name}: ${brand} · ${team}`, { label: 'Undo', fn: () => { updatePerson(x, prev); renderNotes(); } }); } }
  if (a === 'addrow' && state.idSync) { const r = state.idSync.notOn[+x]; if (r) { const id = addPerson({ name: r.name, nid: r.id, brand: BRANDS.includes(r.brand) ? r.brand : 'Virgin', team: DEP_ORDER.includes(r.team) ? r.team : 'CC' }, { quiet: true }); toast(`Added ${r.name}`, { label: 'Undo', fn: () => { removePeople([id]); renderNotes(); } }); } }
  refresh(); renderNotes();
});

// export: incentive
$('buildInc').addEventListener('click', buildInc);
$('histAdd').addEventListener('click', async () => {
  const k0 = ymKey(state.y, state.m), old = state.history[k0];
  const k = await saveMonthToHistory('this page'); if (!k) return; renderExport();
  toast(`${ymLabel(k)} ${old ? 'updated in' : 'added to'} the history`, { label: 'Undo', fn: () => { if (old) putHistory(old); else dropHistory(k); render(); } });
});
// KPI results tab, person card, import card
$('kTeam').addEventListener('change', e => { state.kpiTeam = e.target.value; renderKpiTab(); });
$('kq').addEventListener('input', e => { state.kpiQ = e.target.value; renderKpiTab(); });
$('kXl').addEventListener('click', () => kpiExcel(visibleKpi(), `MC KPI Results - ${state.kpiTeam ? state.kpiTeam + ' - ' : ''}${MON[state.m - 1]} ${state.y}.xlsx`));
$('kPdf').addEventListener('click', () => kpiPdf(visibleKpi().sort((a, b) => a.m.exp.localeCompare(b.m.exp)), `KPI cards - ${state.kpiTeam ? state.kpiTeam + ' - ' : ''}${MON[state.m - 1]} ${state.y}.pdf`));
$('kTpl').addEventListener('click', kpiTemplate);
$('p-kpi').addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { openPerson(o.dataset.open); return; }
  const s = e.target.closest('[data-ksort]'); if (s) { state.kpiSort = s.dataset.ksort; renderKpiTab(); }
});
$('personBody').addEventListener('click', async e => {
  const a = e.target.closest('[data-kpipdf]'), b = e.target.closest('[data-kpicopy]'), c = e.target.closest('[data-kpixl]');
  const K = a || b || c ? state.kpi.get((a || b || c).dataset.kpipdf || (a || b || c).dataset.kpicopy || (a || b || c).dataset.kpixl) : null; if (!K) return;
  const nm = `${K.m.exp.replace(/[\\/:*?"<>|]/g, '')} - ${MON[state.m - 1]} ${state.y}`;
  if (a) kpiPdf([K], `KPI card - ${nm}.pdf`);
  if (c) kpiExcel([K], `KPI card - ${nm}.xlsx`, true);
  if (b) toast(await copyRich(kpiEmailHtml(K), kpiEmailText(K)) ? 'Copied. Paste it into an Outlook email.' : 'Copy is blocked in this view.');
});
$('kpiCardImp').addEventListener('click', e => {
  if (e.target.closest('[data-gokpi]')) { setStep('review'); setTab('kpi', false); }
  if (e.target.closest('#kpiRemove')) { const k = monthKey(), old = state.kpiFiles[k]; delete state.kpiFiles[k]; if (state.db) queueWrite('kpi/' + k, () => state.db.doc('kpi/' + k).delete()); refresh(); toast('KPI file removed', { label: 'Undo', fn: () => { state.kpiFiles[k] = old; if (state.db) queueWrite('kpi/' + k, () => state.db.doc('kpi/' + k).set(old)); refresh(); } }); }
});
// scorecard editor
$('scoreBtn').addEventListener('click', () => { renderScore(); openDrawer('dScore'); });
$('scoreBody').addEventListener('click', e => {
  const tb = e.target.closest('#scTeams button'); if (tb) { state.scoreTeam = tb.dataset.f; renderScore(); return; }
  if (e.target.closest('#ruleNew')) { startRules($('ruleFrom').value); return; }
  const rd = e.target.closest('#ruleDel'); if (rd) { if (!rd.dataset.confirm) { rd.dataset.confirm = '1'; rd.textContent = 'Click again to remove'; return; } dropRules(ruleEditKey()); return; }
  if (countClick(e)) return;   // How it is counted (rules.js)
  if (!canRules()) return;
  const C = ruleCards(), card = C.teams[state.scoreTeam], T = state.scoreTeam;
  if (e.target.closest('#scAdd')) { const t = $('scAddTeam').value; C.teams[t] = { title: `${DEP_NAMES[t] || t} scorecard`, kpis: JSON.parse(JSON.stringify(C.teams.CC ? C.teams.CC.kpis : [])) }; state.scoreTeam = t; scoreChanged(`Added a ${t} scorecard, copied from CC`); toast(`Added a ${t} scorecard, copied from CC. Change the KPIs to match.`); return; }
  if (e.target.closest('#scKpiAdd')) { card.kpis.push({ id: 'k' + Date.now().toString(36), name: 'New KPI', src: 'file', unit: 'pct', dir: 'high', weight: 0, bands: [0.95, 0.9, 0.85, 0.8], aliases: [] }); scoreChanged(`${T}: added a KPI`); return; }
  const d = e.target.closest('[data-sdel]'); if (d) { const i = +d.dataset.sdel, old = card.kpis[i]; card.kpis.splice(i, 1); scoreChanged(`${T}: removed ${old.name}`); toast(`Removed ${old.name}`, { label: 'Undo', fn: () => { card.kpis.splice(i, 0, old); scoreChanged(`${T}: put ${old.name} back`); } }); return; }
  if (e.target.closest('#scReset')) { const def = Kpi.DEFAULTS().teams[T], old = JSON.parse(JSON.stringify(card)); if (!def) return; C.teams[T] = def; scoreChanged(`${T}: back to kpi.xlsx`); toast(`${T} reset to kpi.xlsx`, { label: 'Undo', fn: () => { C.teams[T] = old; scoreChanged(`${T}: the reset undone`); } }); return; }
  if (e.target.closest('#scRemove')) { const old = C.teams[T]; delete C.teams[T]; state.scoreTeam = 'CC'; scoreChanged(`Removed the ${T} scorecard`); toast(`Removed the ${T} scorecard`, { label: 'Undo', fn: () => { C.teams[T] = old; state.scoreTeam = T; scoreChanged(`Put the ${T} scorecard back`); } }); }
});
$('scoreBody').addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'ruleSel') { state.ruleEdit = el.value; renderScore(); return; }
  if (el.id === 'ruleFrom') return;
  if (!canRules()) { renderScore(); return; }
  if (el.dataset.cnt) { countChange(el); return; }   // How it is counted (rules.js)
  const C = ruleCards(), card = C.teams[state.scoreTeam], T = state.scoreTeam;
  if (el.dataset.base) { const v = parseFloat(el.value), b = el.dataset.base, old = { ...BASES0, ...(C.bases || {}) }[b]; if (!(Number.isFinite(v) && v >= 0)) { renderScore(); return; } C.bases = { ...(C.bases || {}), [b]: v }; if (b === 'Virgin') C.base = v; scoreChanged(`Incentive base for ${b}: ${old} → ${v} SR`); return; }
  if (el.dataset.eligf) {
    const f = el.dataset.eligf, raw = parseFloat(el.value); if (!(Number.isFinite(raw) && raw >= 0)) { renderScore(); return; }
    const v = f === 'minFinal' ? Math.min(1, raw / 100) : Math.round(raw), ek = ruleEditKey(), tgt = ek ? state.rules[ek] : state.cards, old = { ...ELIG0, ...(tgt.elig || {}) }[f];
    tgt.elig = { ...ELIG0, ...(tgt.elig || {}), [f]: v };
    scoreChanged(f === 'minFinal' ? `Lowest final % for the incentive: ${pct1(old)} → ${pct1(v)}` : `Fewest days attended for the incentive: ${old} → ${v}`); return;
  }
  if (el.id === 'scTitle') { const old = card.title; card.title = normSpace(el.value) || card.title; scoreChanged(`${T}: scorecard name "${old}" → "${card.title}"`); return; }
  const tr = el.closest('tr[data-ki]'); if (!tr) return; const k = card.kpis[+tr.dataset.ki];
  const f = el.dataset.sf, bt = (kk, v) => (v == null || v === '' ? 'not used' : kk.unit === 'pct' ? `${+(v * 100).toFixed(2)}%` : String(v));
  let what = '';
  if (f === 'name') { const old = k.name; k.name = normSpace(el.value) || k.name; if (k.src === 'file') k.aliases = [...new Set([...(k.aliases || [])])]; what = `renamed ${old} to ${k.name}`; }
  if (f === 'src') { k.src = el.value; k.unit = { adh: 'pct', adhUnder: 'days', aht: 'sec', tardy: 'min' }[k.src] || 'pct'; k.dir = k.src === 'adh' || k.src === 'file' ? 'high' : 'low'; what = `${k.name} now comes from ${Kpi.SRC[k.src] || k.src}`; }
  if (f === 'weight') { const v = parseFloat(el.value); if (!Number.isFinite(v)) { renderScore(); return; } const old = k.weight; k.weight = v / 100; what = `${k.name} weight ${+(old * 100).toFixed(2)}% → ${+v.toFixed(2)}%`; }
  if (f === 'dir') { k.dir = el.value; what = `${k.name}: ${k.dir === 'low' ? 'lower' : 'higher'} is better`; }
  if (f === 'owner') { k.owner = el.value; what = `${k.name} is entered by ${k.owner === 'quality' ? 'the quality team' : 'the KPI file'}`; }
  if (el.dataset.sb != null) { const i = +el.dataset.sb, v = parseFloat(String(el.value).replace('%', '')), old = k.bands[i]; k.bands[i] = el.value.trim() === '' || !Number.isFinite(v) ? null : k.unit === 'pct' ? v / 100 : v; what = `${k.name} ranking ${5 - i}: ${bt(k, old)} → ${bt(k, k.bands[i])}`; }
  scoreChanged(`${T}: ${what}`);
});

// history tab
$('hMetric').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f) return; state.histMetric = f; renderHistory(); });
$('hTeam').addEventListener('change', e => { state.histTeam = e.target.value; renderHistory(); });
$('hq').addEventListener('input', e => { state.histQ = e.target.value; renderHistory(); });
$('hExport').addEventListener('click', exportHistory);
$('p-history').addEventListener('click', async e => {
  if (e.target.closest('[data-hdrop]')) { $('histPicker').click(); return; }
  const o = e.target.closest('[data-open]'); if (o) { openPerson(o.dataset.open); return; }
  const s = e.target.closest('[data-hsort]'); if (s) { state.histSort = s.dataset.hsort; renderHistory(); return; }
  const d = e.target.closest('[data-histdrop]'); if (d) { const k = d.dataset.histdrop, old = dropHistory(k); renderHistory(); toast(`${ymLabel(k)} removed from the history`, { label: 'Undo', fn: () => { putHistory(old); renderHistory(); } }); return; }
  if (e.target.closest('[data-histsave]')) { const k = await saveMonthToHistory('this page'); if (k) { renderHistory(); toast(`${ymLabel(k)} added to the history`); } }
});

// person: forms
$('personBody').addEventListener('click', e => {
  const n = e.target.closest('[data-newform]'); if (n) { openForm(n.dataset.newform, state.personId); return; }
  const o = e.target.closest('[data-openform]'); if (o) { openSavedForm(formLookup(o.dataset.openform)); return; }
  const p = e.target.closest('[data-pdfform]'); if (p) { const f = formLookup(p.dataset.pdfform); if (f) downloadForm(f); }
});
$('formBody').addEventListener('click', e => {
  if (e.target.closest('[data-fadd]')) { readFormInputs(); state.form.results.push({ on: true, metric: '', target: '', result: '', status: '' }); renderForm(); const ins = $('formBody').querySelectorAll('[data-k="metric"]'); if (ins.length) ins[ins.length - 1].focus(); return; }
  if (e.target.closest('[data-freset]')) { readFormInputs(); const d = formDefaults(state.form.kind, state.form.pid), old = clone(state.form.results); state.form.results = d.results; state.form.details = d.details; renderForm(); toast('Results replaced with the KPI metrics', { label: 'Undo', fn: () => { state.form.results = old; renderForm(); } }); return; }
  const o = e.target.closest('[data-fout]'); if (o) { readFormInputs(); state.form.outcome = o.dataset.fout; renderForm(); $('formBody').querySelector(`[data-fout="${o.dataset.fout}"]`).focus(); return; }
  const st = e.target.closest('[data-fstatus]'); if (st) { readFormInputs(); state.form.status = st.dataset.fstatus; renderForm(); $('formBody').querySelector(`[data-fstatus="${st.dataset.fstatus}"]`).focus(); return; }
  const vd = e.target.closest('[data-fvd]'); if (vd) { readFormInputs(); state.form.vd = vd.dataset.fvd; renderForm(); $('formBody').querySelector(`[data-fvd="${vd.dataset.fvd}"]`).focus(); return; }
  const sf = e.target.closest('[data-fsendfinal]'); if (sf) sendFinal(sf);
});
$('formSave').addEventListener('click', () => saveForm());
$('formPdf').addEventListener('click', async () => { if (!formLocked(state.form)) saveForm(true); await downloadForm(state.form); });
$('formSwitch').addEventListener('click', () => { if (!state.form) return; if (!formLocked(state.form)) saveForm(true); const k = state.form.kind === 'final' ? '1to1' : 'final'; openForm(k, state.form.pid, ymKey(state.form.y, state.form.m)); });

// settings: logo, incentive teams, manager
$('logoPick').addEventListener('click', () => $('logoPicker').click());
$('logoPicker').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; setLogoFile(f); });
$('logoRemove').addEventListener('click', () => { const old = state.logo; state.logo = BUILTIN_LOGO; logoPx = null; if (state.db) queueWrite('config/logo', () => state.db.doc('config/logo').delete()); renderLogo(); render(); toast('Back to the Beyond One logo', { label: 'Undo', fn: () => { state.logo = old; logoPx = null; if (state.db) queueWrite('config/logo', () => state.db.doc('config/logo').set(old)); renderLogo(); render(); } }); });
$('incFull').addEventListener('change', () => { state.settings.incFullAdhTeams = [...$('incFull').querySelectorAll('input:checked')].map(i => i.value); refresh(); persistSettings(); });
for (const [id, key] of [['mgrName', 'manager'], ['mgrTitle', 'managerTitle']]) $(id).addEventListener('change', e => { state.settings[key] = normSpace(e.target.value) || DEFAULTS[key]; e.target.value = state.settings[key]; persistSettings(); });

// lock controls
$('lockNow2').addEventListener('click', () => Auth.lock());
$('chgPw').addEventListener('click', () => Auth.change());
$('signOut2').addEventListener('click', () => Auth.signOut());
$('lockMins').addEventListener('change', e => Auth.setLockMins(+e.target.value));

// ---------------------------------------------------------------- UI 4 events
// people: view, team chips, cards
$('pView').addEventListener('click', e => { const f = e.target.closest('button')?.dataset.f; if (!f || f === state.pview) return; commitActive(); state.pview = f; lsSet2('mc-pview', f); renderPeople(); renderPeopleMeta(); });
$('rteams').addEventListener('click', e => { const b = e.target.closest('button[data-team]'); if (!b) return; state.rteam = b.dataset.team; $('rwrap').scrollTop = 0; renderPeople(); });
$('pgrid').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openPerson(b.dataset.open); });

// person page: edit in place, history, remove
$('personBody').addEventListener('change', e => {
  const f = e.target.dataset && e.target.dataset.pf; if (!f || !state.personId) return;
  if (f === 'spvName') { commitSup(state.personId, normSpace(e.target.value), e.target); refresh(); return; }
  if (f === 'base') { const n = normSpace(e.target.value) === '' ? null : Math.round(+e.target.value); if (n != null && !(n > 0)) { toast('Type the base in SR, or leave it empty for the brand\'s.'); return; } updatePerson(state.personId, { base: n }); return; }
  if (f === 'email' && normSpace(e.target.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normSpace(e.target.value))) { toast('That does not look like an email address.'); return; }
  const v = f === 'brand' || f === 'team' ? e.target.value : normSpace(e.target.value);
  const p = state.roster.find(x => x._id === state.personId); if (!p || (p[f] ?? '') === v) return;
  const prev = p[f] ?? '';
  updatePerson(p._id, { [f]: v });
  if (f === 'sys') afterSysEdit(p, prev, v);
  else if (f === 'name') toast(`Saved. Name: ${v || '(empty)'}`, { label: 'Undo', fn: () => updatePerson(p._id, { [f]: prev }) });
});
$('personBody').addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('pedit')) state.peditOpen = e.target.open; }, true);
$('personBody').addEventListener('click', e => {
  const m = e.target.closest('[data-phm]'); if (m) { state.phMetric = m.dataset.phm; renderPerson(); const b = $('personBody').querySelector(`[data-phm="${m.dataset.phm}"]`); if (b) b.focus(); return; }
  if (e.target.closest('[data-phexport]')) { exportAgentHistory(state.personId); return; }
  if (e.target.closest('[data-adhexport]')) { exportDailyAdh(state.personId); return; }
  if (e.target.closest('[data-hdrop]')) { $('histPicker').click(); return; }
  if (e.target.closest('[data-premove]')) {
    const id = state.personId, gone = removePeople([id]); closeDrawer();
    toast(`Removed ${normSpace(gone[0] && gone[0].name) || 'the person'}`, { label: 'Undo', fn: () => restorePeople(gone) });
  }
});
$('personBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-hdrop]')) { e.preventDefault(); $('histPicker').click(); } });
['dragenter', 'dragover'].forEach(t => $('personBody').addEventListener(t, e => { const z = e.target.closest('[data-hdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
$('personBody').addEventListener('dragleave', e => { const z = e.target.closest('[data-hdrop]'); if (z) z.classList.remove('over'); });
$('personBody').addEventListener('drop', e => {
  const z = e.target.closest('[data-hdrop]'); if (!z) return;
  e.preventDefault(); e.stopPropagation(); z.classList.remove('over');
  const f = [...(e.dataTransfer?.files || [])]; if (f.length) addHistoryFiles(f);
});
$('histPicker').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) addHistoryFiles(f); });
// history tab drop zone
const pHist = $('p-history');
pHist.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-hdrop]')) { e.preventDefault(); $('histPicker').click(); } });
['dragenter', 'dragover'].forEach(t => pHist.addEventListener(t, e => { const z = e.target.closest('[data-hdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
pHist.addEventListener('dragleave', e => { const z = e.target.closest('[data-hdrop]'); if (z) z.classList.remove('over'); });
pHist.addEventListener('drop', e => { const z = e.target.closest('[data-hdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); const f = [...(e.dataTransfer?.files || [])]; if (f.length) addHistoryFiles(f); });

// preview: employees
$('preview').addEventListener('change', e => {
  if (e.target.matches('[data-esort]')) { state.eSort = e.target.value; renderPreview(); $('preview').querySelector('[data-esort]').focus(); }
  if (e.target.matches('[data-eteam]')) { state.eTeam = e.target.value; renderPreview(); $('preview').querySelector('[data-eteam]').focus(); }
  if (e.target.matches('[data-pfteam]')) { state.pfTeam = e.target.value; renderPerfCard('[data-pfteam]'); }
  if (e.target.matches('[data-wfteam]')) { state.wfTeam = e.target.value; renderWfCard('[data-wfteam]'); }
});
// preview: performance table (only that card is drawn again, so the page keeps its place)
function renderPerfCard(focusSel) {
  const el = $('preview').querySelector('.perfcard'); if (!el || !state.model) return;
  el.outerHTML = perfCardHtml(state.model.filter(m => m.shown));
  if (focusSel) { const f = $('preview').querySelector(`.perfcard ${focusSel}`); if (f) f.focus({ preventScroll: true }); }
}
function renderWfCard(focusSel) {
  const el = $('preview').querySelector('.wfcard'); if (!el || !state.model) return;
  el.outerHTML = wfCardHtml(state.model.filter(m => m.shown));
  if (focusSel) { const f = $('preview').querySelector(`.wfcard ${focusSel}`); if (f) f.focus({ preventScroll: true }); }
}
$('preview').addEventListener('click', e => {
  const w = e.target.closest('[data-wfsort]');
  if (w) { const k = w.dataset.wfsort; if (state.wfSort === k) state.wfDir = state.wfDir === 'asc' ? 'desc' : 'asc'; else { state.wfSort = k; state.wfDir = k === 'name' ? 'asc' : 'desc'; } renderWfCard(`[data-wfsort="${k}"]`); return; }
  const b = e.target.closest('[data-pfsort]'); if (!b) return;
  const k = b.dataset.pfsort;
  if (state.pfSort === k) state.pfDir = state.pfDir === 'asc' ? 'desc' : 'asc'; else { state.pfSort = k; state.pfDir = k === 'name' ? 'asc' : 'desc'; }
  renderPerfCard(`[data-pfsort="${k}"]`);
});
$('preview').addEventListener('toggle', e => { if (!e.target.matches) return; if (e.target.matches('details.wfall')) state.wfOpen = e.target.open; else if (e.target.matches('details.pfall')) state.pfOpen = e.target.open; }, true);
$('personBody').addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details[data-wfdays]')) state.wfDaysOpen = e.target.open; }, true);

// notifications: undo an automatic Genesys link
noteOn('click', e => { const b = e.target.closest('[data-unlink]'); if (b) { undoAutoLink(b.dataset.unlink); renderNotes(); } });

// hover profile
document.addEventListener('mousemove', e => { mouseXY = [e.clientX, e.clientY]; }, { passive: true });
document.addEventListener('mouseover', e => {
  const t = e.target; if (!t || !t.closest) return;
  if (t.closest('#pop')) { clearTimeout(popTimer); return; }
  const a = t.closest('[data-agent]');
  clearTimeout(popTimer);
  if (a) { if (a === popAnchor && !pop.hidden) return; popTimer = setTimeout(() => showPop(a), pop.hidden ? 280 : 80); return; }
  if (!pop.hidden) popTimer = setTimeout(hidePop, 200);
});
document.addEventListener('focusin', e => {
  const a = e.target.closest && e.target.closest('[data-agent]');
  clearTimeout(popTimer);
  if (a && a.matches(':focus-visible')) popTimer = setTimeout(() => showPop(a), 450); else if (!pop.hidden) hidePop();
});
window.addEventListener('scroll', () => { if (!pop.hidden) hidePop(); }, { passive: true, capture: true });
document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('#pop')) hidePop(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) hidePop(); });
pop.addEventListener('click', e => { if (popAnchor && popAnchor.dataset.agent) { const id = popAnchor.dataset.agent; hidePop(); openPerson(id); } });

// motion
let thumbRaf = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(thumbRaf); thumbRaf = requestAnimationFrame(thumbs); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(thumbs);
document.addEventListener('scroll', () => { document.body.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

/*@@PORTAL@@*/
applyTheme(themeNow());
renderBrand();
render();
initStorage();
if (window.__mcBoot) window.__mcBoot.ran = true;   // the start guard: the page's script ran to its end
window.__mc = { state, renderWs, setWs, setStep, setTab, renderDash, impLog: () => IMP_LOG.slice(), askBuild, openPerson, spvScore, monthFromDays, interAgg, formHash, liveRows, refresh, renderHistory, histAll, renderKpiTab, kpiEmailHtml, usesWorker: () => !!worker, pwCheck: Auth.check, curMail, incMailModel, mailModel, formPdf, openForm, snapNow, emlFile, openNotes, openRules, rulesFor, calSteps, objList, mtdProj, handChanges, todayItems, fuBuild, fuStats, rowsByPid, teamReady, incListNow, incRows, srHidden, formFlow, replyNew, storeDay, rbAgentsDayOf: M => { RB.agentsModel = null; if (window.WFM) window.WFM._state.model = M; rbAgentsDay(); }, dmUnsent, rb: () => RB };   // for testing
Object.assign(window.__mc, { sysPropose, openMatch, applySysMatches, undoSysMatches, dupGroups, combinePlan, combineApply, dupSure, mergePeople, useSysNames, genesysNames, idRegistry, fillSysList, openDups, persistNameMemo, loadNameMemo, linkPeople, autoLinkNames, addPerson, updatePerson, removePeople, restorePeople });   // names: for testing
})();
