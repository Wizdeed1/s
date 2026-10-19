// ================================================================ ROLES, WORKSPACES AND THE SHARED DATA
// Everyone works on one set of data: the shared folder next to the HTML (or the online page's database). The month being built
// is saved as the analyst works; supervisors, the senior manager, the WFM manager, the quality team and the agents read the
// same history, final results and one-to-ones, live. A month the senior manager finalizes is frozen in `final/<month>`.
const WS_VIEWS = ['dash', 'team', 'results', 'cycle', 'wfm', 'quality', 'me', 'wait', 'blocked'];
const WS_OF = { admin: ['dash', 'build', 'team', 'results', 'cycle', 'wfm', 'quality'], user: ['dash', 'build', 'team', 'wfm'], senior: ['dash', 'cycle', 'results', 'team', 'wfm'], wfm: ['dash', 'wfm', 'results', 'team'], spv: ['team'], quality: ['quality'], agent: ['me'], pending: [] };
Object.assign(state, { ws: 'build', finals: {}, finVer: 0, frozen: {}, people: [], wsMonth: '', wsSpv: '', wsUnit: '', wsQ: '', resSort: 'name', resDir: 'asc', resUnit: '', resSpv: '', resQ: '',
  wfmMetric: 'adh', wfmGroup: 'unit', wfmUnit: '', teamMetric: 'adh', autoAt: 0, autoNote: '', boardAll: {}, wfmTab: 'analytics', spvDone: {}, spvDoneVer: 0, cycleLog: {} });
const FORM_STATUS = [['planned', 'Arranged'], ['held', 'Held'], ['closed', 'Closed']];
function roleNow() { const u = Auth.user(); return u ? (u.role || 'user') : 'admin'; }
function isBuilder() { return ['admin', 'user'].includes(roleNow()); }
function isSenior() { return roleNow() === 'senior'; }
/** incentive amounts are not shown to supervisors and WFM analysts */
function srHidden() { return ['spv', 'user'].includes(roleNow()); }
/** the senior manager's cycle: deadline, supervisors' scorecards and the four emails (the admin can stand in) */
function canCycle() { return ['senior', 'admin'].includes(roleNow()); }
function whoNow() { const u = Auth.user(); return u ? (u.name || u.username || u.email || '') : ''; }
const unitOf = p => `${p.brand || '–'} · ${p.team || '–'}`;
const unitRank = u => { const [b, t] = u.split(' · '); return (['Virgin', 'Friendi', 'Friendi Pay'].indexOf(b) + 1 || 9) * 100 + (DEP_ORDER.indexOf(t) + 1 || 99); };
const sortUnits = (a, b) => unitRank(a) - unitRank(b) || a.localeCompare(b);
const byExp = (a, b) => String(a.exp || a.n || '').localeCompare(String(b.exp || b.n || ''));
const rowKey = r => (r.id ? String(r.id) : 'N:' + normName(r.n));
const fkey = f => ymKey(f.y, f.m);
const adOf = r => (r && r.ad ? String(r.ad).split(',').map(x => (x === '' ? null : +x / 10000)) : null);
const mean = L => { const v = L.filter(x => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
/** a measure's value as text, with thousands separators on big counts */
const fmtM = (m, v) => (v == null ? '–' : !(m.pct || PCTK.has(m.k) || TIMEK.has(m.k)) && Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : m.fmt(v));
const sum = L => { const v = L.filter(x => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

// ---------------------------------------------------------------- sharing: who sees what
function scopeCount(sc) { if (!sc) return 0; return rosterRows().filter(p => inScope(p, sc)).length; }
function inScope(p, sc) { return !!sc && ((sc.units || []).includes(unitOf(p)) || (sc.pids || []).includes(p._id)); }
function scopePickerHtml(a) {
  const sc = a.scope || {}, units = new Set(sc.units || []), pids = new Set(sc.pids || []), R = rosterRows(), U = [...new Set(R.map(unitOf))].sort(sortUnits);
  const nm = p => gname(effP(p._id) || p) || p.name;
  return `<div class="scopebox"><div class="scopehead"><b>${esc(a.name)}'s team</b><span class="hint">Tick a whole team, so new joiners follow by themselves, or single agents.</span></div>
    <div class="scopeunits">${U.map(u => `<label class="chip"><input type="checkbox" data-unit="${esc(u)}"${units.has(u) ? ' checked' : ''}>${esc(u)} <span class="cnt">${R.filter(p => unitOf(p) === u).length}</span></label>`).join('')}</div>
    <input class="scopeq" data-scopeq type="search" placeholder="Find an agent" aria-label="Find an agent">
    <div class="scopeag">${U.map(u => `<div class="sgrp"><small>${esc(u)}</small>${R.filter(p => unitOf(p) === u).sort((x, y) => nm(x).localeCompare(nm(y))).map(p => `<label><input type="checkbox" data-pid="${esc(p._id)}" data-u="${esc(u)}"${units.has(u) || pids.has(p._id) ? ' checked' : ''}${units.has(u) ? ' disabled' : ''}><span dir="auto">${esc(nm(p))}</span></label>`).join('')}</div>`).join('')}</div>
    <div class="scopefoot"><span class="scopecount">${plural(scopeCount(sc), 'agent')} chosen</span><span class="spacer"></span><button class="btn sm" data-a="scopeopen">Cancel</button><button class="btn sm primary" data-a="scopesave">Save team</button></div></div>`;
}
function shareInfoHtml(local) {
  if (state.db && state.db.folder) return `<h3>One shared set of data</h3>
    <p class="hint">The data lives in the shared folder <b>${esc(state.db.name)}</b>, in locked files: only the accounts below can read them through the tool, and an agent only their own. Everyone who opens the HTML from the common folder and connects this folder works on the same data, live.</p>
    <ol class="hint steplist"><li>Keep the HTML and the data folder side by side in the common folder.</li><li>Each person opens the HTML in Edge or Chrome, chooses the data folder once, and creates an account.</li>
    <li>Give staff their role here. Supervisors approve their own agents in their Team page (the roster's Supervisor column says who is in each team).</li></ol>
    <p class="hint">Keep the common folder's permissions to the people who need it: anyone who can delete files there can delete the data (but cannot read it). Back the folder up with your usual IT backup.</p>`;
  if (local) return `<h3>One shared set of data</h3><p class="hint">This copy keeps its data in this browser, on this computer only, so nobody else sees it. For the whole team to work on the same data, everyone uses the online page: open it from the Share link, and give each person a role there.</p>`;
  return `<h3>One shared set of data</h3>
    <p class="hint">Everyone opens this same page. The roster, the history, the results and the one-to-ones live with the page, so every person sees the same numbers, live, and the month being built is saved as the analyst works.</p>
    <ol class="hint steplist"><li>Share the page from its <b>Share</b> menu: as <b>Editor</b> for the WFM team (analysts and manager) and the senior manager; as <b>Contributor</b> for supervisors and the quality team.</li>
    <li>Each person opens the link, creates an account here, and waits.</li><li>Give each one a role below; for a supervisor, choose their team.</li></ol>
    <p class="hint">What the page itself protects: only people shared as Editor can change the roster, the history, the daily data, the settings and the final results; Contributors can change one-to-ones, attendance corrections, the quality numbers and their own sign-in. Everyone the page is shared with can read its data; the roles decide what each person sees and does here. For agents, use the HTML in the common folder instead: there each agent can open only their own data.</p>`;
}

// ---------------------------------------------------------------- the shared data, live
function watchShared(db) {
  try {
    db.collection('history').onSnapshot(sn => {
      const h = {}; sn.docs.forEach(d => { const x = d.data(); if (x && Array.isArray(x.rows) && x.y && x.m) h[d.id] = x; });
      state.history = h; state.histVer++; render();
    }, () => {});
  } catch (e) { /* none */ }
  try {
    db.collection('final').onSnapshot(sn => {
      const f = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.y && x.m) f[d.id] = x; });
      state.finals = f; state.finVer++; state.frozen = {}; render();
    }, () => {});
  } catch (e) { /* none */ }
  try {
    db.collection('accounts').onSnapshot(() => { loadPeople(); Auth.refreshMe(); }, () => {});
  } catch (e) { /* none */ }
  const live = (c, fn) => { try { db.collection(c).onSnapshot(sn => { fn(sn); if (state.ws !== 'build') renderWs(); else render(); }, () => {}); } catch (e) { /* none */ } };
  live('quality', sn => { const q = {}; sn.docs.forEach(d => { q[d.id] = d.data(); }); state.quality = q; state.qualityVer++; state.incModelCache = null; if (state.ctx) state.kpi = computeKpi(); });
  live('fresh', sn => { const f = {}; sn.docs.forEach(d => { f[d.id] = d.data(); }); state.fresh = f; renderFresh(); });
  live('cycle', sn => { const c = {}; sn.docs.forEach(d => { c[d.id] = d.data(); }); state.cycles = c; });
  live('kpi', sn => { sn.docs.forEach(d => { const x = d.data(); if (x && Array.isArray(x.rows)) state.kpiFiles[d.id] = x; }); });
  live('spvdone', sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data(); }); const before = state.spvDone; state.spvDone = o; state.spvDoneVer++; notifyDone(before, o); });
  live('cyclelog', sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data(); }); state.cycleLog = o; });
  live('rules', rulesLoaded);
  live('steps', sn => { const o = {}; sn.docs.forEach(d => { o[d.id] = d.data(); }); state.calMarks = o; });
  watchDaily(db); watchInter(db);
  try { db.doc('config/contacts').get().then(s => { if (s.exists) state.contacts = s.data(); }).catch(() => {}); } catch (e) { /* none */ }
  try { db.doc('config/inclist').get().then(s => { if (s.exists) { const d = s.data(); if (d && Array.isArray(d.items)) { state.incList = d; if (state.ws === 'cycle') renderWs(); } } }).catch(() => {}); } catch (e) { /* the usual list */ }
  try { db.doc('config/spvcard').get().then(s => { if (s.exists) state.spvCard = s.data(); }).catch(() => {}); } catch (e) { /* none */ }
  try { db.doc('config/calendar').get().then(s => { if (s.exists) { state.calCfg = s.data(); if (state.ws !== 'build') renderWs(); } }).catch(() => {}); } catch (e) { /* none */ }
  loadPeople();
}
let peopleTimer = 0;
function loadPeople() { clearTimeout(peopleTimer); peopleTimer = setTimeout(async () => { state.people = await Auth.people(); watchSigs(); watchReplies(); watchObjs(); if (state.ws !== 'build') renderWs(); else renderToday(); }, 150); }
/** the supervisors: roster people who are someone's Supervisor (the roster's Supervisor column) */
const spvList = () => supervisors().map(s => ({ pid: s.pid, name: s.name, size: s.size }));
/** the agent's supervisor, shown under their name */
function spvLine(pid) { const s = spvOf(pid).map(a => a.name).join(', '); return `<small class="spvl${s ? '' : ' none'}" dir="auto"><svg width="11" height="11" aria-hidden="true"><use href="#i-user"/></svg>${s ? esc(s) : 'No supervisor yet'}</small>`; }
function spvOf(pid) { const p = state.roster.find(x => x._id === pid), s = p ? supOfP(p) : null; return s ? [{ pid: s._id, name: gname(effP(s._id) || s) || s.name }] : []; }
/** the signed-in supervisor's own team (older accounts kept a list of teams instead) */
function myTeam() { const u = Auth.user() || {}; return u.pid ? teamOf(u.pid) : rosterRows().filter(p => inScope(p, u.scope)); }

// ---------------------------------------------------------------- the month being built is saved by itself
let autoTimer = 0, autoSig = '';
function scheduleAutoSave() {
  if (!state.db || !isBuilder() || !state.ctx || !state.model) return;
  clearTimeout(autoTimer); autoTimer = setTimeout(autoSaveMonth, 2500);
}
function autoSaveMonth(force) {
  if (!state.db || !isBuilder() || !state.ctx) return;
  const key = ymKey(state.y, state.m), old = state.history[key];
  state.autoKeep = false;
  if (monthLocked(key)) { state.autoNote = `${ymLabel(key)} is final (${finalBy(key)}), so changes here are not saved to the history.`; renderAutoNote(); return; }
  if (old && !old.auto && !old.tool && !old.daily && !force) { state.autoKeep = true; state.autoNote = `${ymLabel(key)} in the history comes from ${old.src || 'a file'}, so it is kept as it is.`; renderAutoNote(); return; }
  const md = incModel(); if (!md || !md.att.length) return;
  const rec = enrichRec({ ...History.fromModel(md, state.attRes ? state.attRes.byPerson : null), src: 'Saved by the tool as the month was built', auto: true, tool: true, by: whoNow(), at: new Date().toISOString() });
  const sig = JSON.stringify(rec.rows); if (sig === autoSig && old) return;
  autoSig = sig; putHistory(rec); state.autoAt = Date.now(); state.autoNote = ''; renderAutoNote();
  const got = [['adhGenesys', 'adherence'], ['aht', 'AHT'], ['schedule', 'schedule'], ['timeline', 'status timeline'], ['perf', 'performance']].filter(([k2]) => state.slots[k2]).map(([, l]) => l);
  const fk = `${ymLabel(key)}: ${got.join(', ')}`; if (!state.fresh.month || state.fresh.month.what !== fk || Date.now() - new Date(state.fresh.month.at).getTime() > 3600000) markFresh('month', fk);
}
function renderAutoNote() {
  const el = $('autoNote'); if (!el) return;
  el.hidden = state.ws !== 'build' || !(state.autoNote || state.autoAt);
  el.className = 'autonote' + (state.autoNote ? ' warn' : '');
  el.innerHTML = esc(state.autoNote || `${ymLabel(ymKey(state.y, state.m))} is saved to the shared history as you work · last saved ${new Date(state.autoAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    + (state.autoKeep ? ' <button class="linkbtn" data-autoreplace>Replace it with this page\'s numbers</button>' : '');
}
/** everything a month record carries for the workspaces: deduction, performance, the daily review, daily adherence and the KPI scorecard */
function enrichRec(rec) { return addModelKpi(addModelDaily(addModelWf(addModelPerf(addModelDed(rec))))); }
function rowFinder(rec) {
  const byId = new Map(), byName = new Map(); rec.rows.forEach(r => { if (r.id) byId.set(r.id, r); byName.set(normName(r.n), r); });
  return m => { const id = Core.cleanId((effP(m.p._id) || m.p).nid); return (id && byId.get(id)) || byName.get(normName(m.p.name)) || byName.get(m.ek) || null; };
}
function addModelDaily(rec) {
  if (!state.model || rec.y !== state.y || rec.m !== state.m) return rec;
  const find = rowFinder(rec);
  for (const m of state.model) { if (!m.adh) continue; const r = find(m); if (r) r.ad = m.adh.map(v => (v == null ? '' : Math.round(v * 10000))).join(','); }
  return rec;
}
function addModelKpi(rec) {
  if (!state.model || rec.y !== state.y || rec.m !== state.m) return rec;
  const find = rowFinder(rec);
  for (const K of state.kpi.values()) {
    const r = find(K.m); if (!r) continue; const res = K.res;
    if (res.finalPct != null) r.fin = Math.round(res.finalPct * 10000) / 10000; if (res.earned != null) r.earned = res.earned;
    r.kc = K.card.title; r.kpi = kpiTuples(res);
    if (res.finalRank != null) r.fr = res.finalRank; if (res.sched != null) r.ks = res.sched; if (res.actual != null) r.ka = res.actual; if (res.target != null) r.kt = res.target;
    if (res.earnedCalc != null) r.earnedCalc = res.earnedCalc; if (res.elig && !res.elig.ok) r.inelig = res.elig.why;
    Object.assign(r, countKept(res, r, monthKey())); r.kx = howLite(res);
  }
  return rec;
}
/** a person's KPIs as the month's rows keep them: [name, weight %, target, result, ranking, the band it reached] */
const kpiTuples = res => res.rows.map((x, i) => [x.k.name, Math.round(x.w * 1000) / 10, Kpi.target(x.k), Kpi.fmtVal(x.k, x.v), x.r, res.how && res.how.kpis[i] ? res.how.kpis[i].band : '']);
/** every step of a score but the KPIs (the rows carry those), kept on the rows as kx for "How this was counted" */
function howLite(res) {
  if (!res || !res.how) return null;
  const { kpis, ...h } = res.how, vr = {}; kpis.forEach(x => { if (x.vr !== undefined) vr[x.id] = x.vr; });
  return Object.keys(vr).length ? { ...h, vr } : h;
}
/** the days a scored row keeps for the incentive: attended (kat), runs of absence (kr), absences as the rules count them (kab, only
    when they differ from the plain count) and the day rules (kdr, only when they are not the defaults) */
function countKept(res, x, k) {
  if (res.sched == null) return {};
  const o = { kat: res.attended, kr: res.runs || 0 }; if ((res.absent || 0) !== (x.absent || 0)) o.kab = res.absent;
  return { ...o, ...kdrOf(k) };
}

// ---------------------------------------------------------------- months, final results and who matches whom
function wsMonths() { return [...new Set([...Object.keys(state.history), ...Object.keys(state.finals).filter(monthLocked)])].sort(); }
function wsMonthNow() { const L = wsMonths(); if (!L.length) return ''; if (!L.includes(state.wsMonth)) state.wsMonth = wsDefaultMonth(L); return state.wsMonth; }
/** the month the pages open on: the month being closed while it is not final (the daily data adds the running month to the
 *  history from its first day; it stays one click away), else the newest */
function wsDefaultMonth(L) { const c = closeMonthNow(), last = L[L.length - 1]; return last > c && L.includes(c) && !monthLocked(c) ? c : last; }
function monthLocked(k) { const F = state.finals[k]; return !!(F && F.status === 'final'); }
function finalBy(k) { const F = state.finals[k]; return F ? `finalized by ${F.byName || 'the senior manager'}${F.at ? ' on ' + fmtWhen(F.at) : ''}` : ''; }
function monthData(k) {
  const F = state.finals[k], H = state.history[k];
  if (F && F.status === 'final') return { rows: (F.rows || []).map(r => {
    const a = (F.adj || {})[rowKey(r)]; if (!a) return r;
    const out = { ...r, fin: a.fin ?? r.fin, earned: a.earned ?? r.earned, _adj: a };
    if (a.elig === true) { out._el = { ...(r._el || { why: [] }), ok: true, forced: true }; if (a.earned == null) out.earned = r.earnedCalc ?? r.earned; }
    if (a.elig === false) { out._el = { ok: false, why: (r._el && r._el.why && r._el.why.length) ? r._el.why : ['not eligible (senior manager)'], forced: true }; if (a.earned == null) out.earned = 0; }
    return out;
  }), final: F, rec: H || null };
  return H ? { rows: H.rows, final: null, rec: H } : null;
}
/** a draft month built by the tool is scored again with today's inputs: the quality team's numbers, the supervisors' attendance
    corrections, the incentive bases and the eligibility rules. Months from older incentive files keep their own numbers. */
function liveRow(r, p, k, rec) {
  const ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
  const E = attEditsOf(k), ed = E && p ? E.get(p._id) : null;
  const F = state.finals[k], adj = F && F.adj ? F.adj[rowKey(r)] : null;
  let x = withEdits(r, ed, ND, k);
  if (adj && adj.ks != null && adj.ka != null) {   // the old Excel's day count, accepted on Results › Reconcile: scored as it is, not counted again
    const dk = Kpi.dayRulesKey(countFor(k)), { kdr, ...z } = x;
    x = { ...z, ks: adj.ks, ka: adj.ka, kat: adj.ka, ...(dk === KDR0 ? {} : { kdr: dk }) };
  }
  if (!(rec && (rec.tool || rec.auto || rec.page || rec.daily))) return withAdj(x, adj);
  const s = scoreLive(x, p, k); if (!s) return withAdj(x, adj);
  const res = s.res, el = eligibility(res, p ? qRow(k, p._id) : null, adj, k);
  // ka = the days counted (after any absence penalty), kat = the days attended: kept apart so a penalty is never taken twice
  const { kat, kr, kab, kdr, ...y } = x, kept = s.again || res.sched != null ? countKept(res, x, k) : Object.fromEntries(Object.entries({ kat, kr, kab, kdr }).filter(([, v]) => v !== undefined));
  return withAdj({ ...y, fin: res.finalPct ?? x.fin, fr: res.finalRank ?? x.fr, kc: s.card.title, kpi: kpiTuples(res), kv: Object.fromEntries(res.rows.filter(z => z.v != null).map(z => [z.k.id, z.v])),
    ks: res.sched ?? x.ks, ka: res.actual ?? x.ka, kt: res.target ?? x.kt, earnedCalc: res.earned ?? null, earned: res.earned == null ? x.earned : el.ok ? res.earned : 0, base: baseOf(p, x, k), _el: el,
    ...kept, kx: howLite(res) }, adj);
}
/** a draft month's row with the senior manager's changes: a final % or an earned SR set by hand or accepted from the old Excel wins, as
    it does on a final month (monthData) */
function withAdj(x, adj) {
  if (!adj) return x;
  return { ...x, ...(adj.fin != null ? { fin: adj.fin } : {}), ...(adj.earned != null ? { earned: adj.earned } : {}), _adj: adj };
}
const matchMemo = new Map();   // month -> { sig, map }: who in the roster is which row of the month
function rowsByPid(k) {
  const D = monthData(k); if (!D) return new Map();
  if (!D.final) watchAttEdits(k);
  const sig = `${state.histVer}|${state.finVer}|${state.ver}|${state.roster.length}|${state.qualityVer}|${state.attEditsVer}|${state.rulesVer}|${Object.keys(state.kpiFiles).length}|${(state.kpiFiles[k] || {}).at || ''}`, hit = matchMemo.get(k);
  if (hit && hit.sig === sig) return hit.map;
  const rows = D.rows, byId = new Map(), byName = new Map(), used = new Set(), out = new Map(), rest = [];
  rows.forEach(r => { if (r.id) byId.set(String(r.id), r); if (!byName.has(normName(r.n))) byName.set(normName(r.n), r); });
  for (const p of rosterRows()) {
    const id = Core.cleanId((effP(p._id) || p).nid);
    const r = (id && byId.get(id)) || byName.get(normName(p.name)) || (normSpace(p.sys) ? byName.get(normName(p.sys)) : null);
    if (r && !used.has(r)) { out.set(p._id, r); used.add(r); } else rest.push(p);
  }
  for (const p of rest) {
    let best = null, bs = 0, second = 0;
    for (const r of rows) { if (used.has(r)) continue; const s = Math.max(Core.nameScore(p.name, r.n), normSpace(p.sys) ? Core.nameScore(p.sys, r.n) : 0); if (s > bs) { second = bs; bs = s; best = r; } else if (s > second) second = s; }
    if (best && bs >= 0.86 && bs - second >= 0.08) { out.set(p._id, best); used.add(best); }
  }
  if (!D.final) for (const [pid, r] of out) out.set(pid, liveRow(r, state.roster.find(x => x._id === pid), k, D.rec));
  matchMemo.set(k, { sig, map: out }); return out;
}
/** every row of a draft month as it would be frozen today (rows nobody in the roster matches stay as saved) */
function liveRows(k) {
  const D = monthData(k); if (!D) return [];
  const map = rowsByPid(k), byRow = new Map(); for (const [pid, r] of map) byRow.set(rowKey(r), r);
  return D.rows.map(r => byRow.get(rowKey(r)) || r);
}
function wsPeople() {
  const r = roleNow(), all = rosterRows();
  if (r === 'spv') return myTeam();
  if (state.ws === 'team' && state.wsSpv) return teamOf(state.wsSpv);
  return all;
}
const rowOf = (pid, k) => rowsByPid(k).get(pid) || null;
const formsOf = (pid, k) => state.forms.filter(f => f.pid === pid && fkey(f) === k);
function oneStatus(pid, k) {
  const L = formsOf(pid, k), o = L.find(f => f.kind === '1to1'), fin = L.find(f => f.kind === 'final');
  const st = o ? formSt(o) : 'none';
  return { st, o, fin };
}
function formStatusChip(f) { const st = formSt(f); return `<span class="fst ${st}">${esc((FORM_STATUS.find(x => x[0] === st) || [, 'Held'])[1])}</span>`; }
function formMonthKey() { return state.ws !== 'build' ? wsMonthNow() || monthKey() : monthKey(); }
function formLookup(id) {
  const f = state.forms.find(x => x.id === id), k = f ? fkey(f) : (id.split('_')[1] || '');
  const fz = state.frozen[k] && state.frozen[k].get(id);
  return monthLocked(k) && fz ? fz : f || fz || null;
}
function formLocked(f) { if (!f) return ''; const k = fkey(f); return monthLocked(k) && !isSenior() ? `${ymLabel(k)} was ${finalBy(k)}.` : ''; }
/** a one-to-one from the saved month, for people who do not build the month (or another month than the one being built) */
function formDefaultsHist(kind, pid, k) {
  const [y, m] = [+k.slice(0, 4), +k.slice(5)], p = state.roster.find(x => x._id === pid) || {}, pp = effP(pid) || p, r = rowOf(pid, k), set = state.settings;
  const results = [], details = [];
  if (r && r.kpi && r.kpi.length) {
    for (const [name, , target, result, rank] of r.kpi) results.push({ on: true, metric: name, target, result, status: rank == null ? 'No value' : `Ranking ${rank} of 5` });
    results.push({ on: false, metric: 'Final % (scorecard)', target: '', result: pct1(r.fin), status: r.fr == null ? '' : `Ranking ${(+r.fr).toFixed(2)}` });
  } else if (r) {
    if (r.adh != null) results.push({ on: true, metric: 'Adherence', target: pct(set.target), result: pct(r.adh), status: r.adh < set.target ? 'Below target' : 'On target' });
    if (r.aht != null) results.push({ on: true, metric: 'AHT', target: '', result: mss(r.aht), status: '' });
    if (r.fin != null) results.push({ on: true, metric: 'Final %', target: '', result: pct1(r.fin), status: '' });
  }
  const ad = adOf(r);
  if (ad) { const under = ad.map((v, i) => [i + 1, v]).filter(([, v]) => v != null && v < set.target); if (under.length) details.push(`Days under ${pct(set.target, 0)} adherence: ${under.map(([d, v]) => `${d} ${MON[m - 1]} (${pct(v)})`).join(', ')}.`); }
  const exp = normSpace(normSpace(pp.sys) ? pp.sys : pp.name || '');
  const base = { kind, pid, y, m, period: `${MONTH_LONG[m - 1]} ${y}`, supervisor: roleNow() === 'spv' ? whoNow() : lsGet('mc-sup'), date: todayIso(), status: 'held',
    agent: { name: exp, id: Core.cleanId(pp.nid) || normSpace(pp.nid), team: p.team || '', teamName: DEP_NAMES[p.team] || '', brand: p.brand || '' },
    ref: `${kind === 'final' ? 'FIN' : '1TO1'}-${k}-${Core.cleanId(pp.nid) || String(pid).slice(-6)}`,
    topics: { kpi: true, adh: true }, results, details, discussion: '', rootCause: '', agentComments: '', actions: [{}, {}, {}], reviewDate: '',
    heldOn: '', oneRef: '', findings: '', outcome: '', actionPlan: '', consequence: 'If the expected improvement is not reached by the review date, further action may be taken in line with company policy.', manager: set.manager, managerTitle: set.managerTitle };
  if (kind === 'final') {
    const one = state.forms.find(f => f.id === formId('1to1', pid, k));
    if (one) Object.assign(base, { heldOn: one.date, oneRef: one.ref, supervisor: one.supervisor || base.supervisor, results: one.results, details: one.details, agentComments: one.agentComments || '', reviewDate: one.reviewDate || '' });
    base.findings = base.results.filter(x => x.on !== false && x.metric).map(x => `${x.metric}: ${x.result}${x.target ? ` (target ${x.target})` : ''}`).join('. ') + (base.results.length ? '.' : '');
  }
  return base;
}
/** after the month is final, the senior manager's changes also go to the frozen copy, with a line in the log */
function saveFinalFormCopy(f) {
  const k = fkey(f); if (!monthLocked(k) || !isSenior() || !state.db) return;
  queueWrite(`final/${k}/forms/${f.id}`, () => state.db.doc(`final/${k}/forms/${f.id}`).set(f));
  logFinal(k, `Changed the ${FORM_TITLE[f.kind].toLowerCase()} of ${f.agent.name}`);
  if (state.frozen[k]) state.frozen[k].set(f.id, f);
}
function logFinal(k, what) {
  const F = state.finals[k]; if (!F || !state.db) return;
  const log = [...(F.log || []), { at: new Date().toISOString(), by: whoNow(), what }].slice(-200);
  F.log = log; queueWrite('final/' + k, () => state.db.doc('final/' + k).update({ log }));
}
async function loadFrozen(k) {
  if (!state.db || !monthLocked(k) || state.frozen[k]) return;
  state.frozen[k] = new Map();
  try { const sn = await state.db.collection(`final/${k}/forms`).get(); sn.docs.forEach(d => state.frozen[k].set(d.id, { ...d.data(), id: d.id })); } catch (e) { /* the live forms are shown */ }
  renderWs();
}
async function finalizeMonth(k) {
  if (!isSenior() || !state.db) return;
  const H = state.history[k], prev = state.finals[k];
  if (!H) { toast('There is nothing saved for this month yet.'); return; }
  const forms = state.forms.filter(f => fkey(f) === k), at = new Date().toISOString();
  const rows = liveRows(k).map(r => { const o = {}; for (const [kk, v] of Object.entries(r)) if (!kk.startsWith('_') || kk === '_el') o[kk] = v; return o; });
  const body = { y: H.y, m: H.m, status: 'final', at, by: (Auth.user() || {}).id || '', byName: whoNow(), src: H.src || '', rows, adj: (prev && prev.adj) || {},
    forms: forms.length, log: [...((prev && prev.log) || []), { at, by: whoNow(), what: `Finalized with ${plural(H.rows.length, 'row')} and ${plural(forms.length, 'form')}` }].slice(-200) };
  try {
    await queueWrite('final/' + k, () => state.db.doc('final/' + k).set(body));
    for (const f of forms) queueWrite(`final/${k}/forms/${f.id}`, () => state.db.doc(`final/${k}/forms/${f.id}`).set(f));
    state.finals[k] = body; state.finVer++; state.frozen[k] = new Map(forms.map(f => [f.id, f]));
    toast(`${ymLabel(k)} is final. Supervisors can no longer change its results or one-to-ones.`); renderWs();
    publishMonthToAgents(k).then(n => { if (n) toast(`${ymLabel(k)} is final. Shared with ${plural(n, 'agent')} on their own page.`); }).catch(() => {});
  } catch (e) { toast(e && e.code === 'invalid_argument' ? 'Only people the page is shared with as Editor can finalize a month.' : `Could not finalize (${(e && e.code) || 'error'}).`); }
}
async function reopenMonth(k) {
  if (!isSenior() || !state.db || !state.finals[k]) return;
  const F = state.finals[k], log = [...(F.log || []), { at: new Date().toISOString(), by: whoNow(), what: 'Reopened' }].slice(-200);
  try { await queueWrite('final/' + k, () => state.db.doc('final/' + k).update({ status: 'open', log })); F.status = 'open'; F.log = log; state.finVer++; toast(`${ymLabel(k)} is open again.`); renderWs(); }
  catch (e) { toast(`Could not reopen (${(e && e.code) || 'error'}).`); }
}
let adjTimer = 0;
function adjustResult(k, rk, field, raw, note) {
  const locked = monthLocked(k);
  if (field === 'elig' ? !canCycle() : !(isSenior() && locked)) return;
  let F = state.finals[k], made = false;
  if (!F) { const H = state.history[k]; if (!H) return; F = state.finals[k] = { y: H.y, m: H.m, status: 'open', adj: {}, log: [], by: (Auth.user() || {}).id || '', byName: whoNow(), at: new Date().toISOString() }; made = true; }
  const adj = { ...(F.adj || {}) }, cur = { ...(adj[rk] || {}) };
  if (field === 'note') cur.note = normSpace(raw);
  else if (field === 'elig') { if (raw === '') delete cur.elig; else cur.elig = raw === 'yes'; }
  else { const v = normSpace(raw) === '' ? null : field === 'fin' ? parseFloat(String(raw).replace('%', '')) / 100 : Math.round(parseFloat(raw)); if (v != null && !Number.isFinite(v)) { toast('Type a number.'); return; } if (v == null) delete cur[field]; else cur[field] = v; }
  cur.by = whoNow(); cur.at = new Date().toISOString();
  if (cur.fin == null && cur.earned == null && !cur.note && cur.elig == null) delete adj[rk]; else adj[rk] = cur;
  F.adj = adj; state.finVer++;
  const row = (F.rows || (state.history[k] || { rows: [] }).rows || []).find(r => rowKey(r) === rk), what = `${field === 'note' ? 'Note' : field === 'fin' ? 'Final %' : field === 'elig' ? 'Eligibility' : 'Earned SR'} for ${row ? row.n : rk}: ${field === 'note' ? cur.note || '(removed)' : field === 'elig' ? (raw === '' ? 'back to the rules' : raw === 'yes' ? 'eligible' : 'not eligible') : raw === '' ? 'back to the calculated value' : raw}`;
  clearTimeout(adjTimer);
  const body = made ? JSON.parse(JSON.stringify(F)) : null;
  queueWrite('final/' + k, () => (made ? state.db.doc('final/' + k).set(body) : state.db.doc('final/' + k).update({ adj }))).then(() => logFinal(k, what), e => toast(`Not saved (${(e && e.code) || 'error'}).`));
  if (!locked) renderWs();
}

// ---------------------------------------------------------------- workspaces
/** each page's head says whose page it is and what this person does there */
function roleHeads(r) {
  const who = ROLE_NAME[r] || 'Workforce';
  $('resEyebrow').textContent = who; $('cycEyebrow').textContent = who; $('qEyebrow').textContent = r === 'quality' ? 'Quality team' : who;
  $('resLead').textContent = r === 'senior' ? 'Every department, supervisor and agent for the month. Finalize the month when the results are agreed; after that only you can change them.'
    : 'Every department, supervisor and agent for the month, to read. The senior manager finalizes the month when the results are agreed.';
  $('cycLead').textContent = r === 'senior' ? 'Set the one-to-one deadline, see which supervisors have finished their team, score the supervisors, and make the month\'s four emails.'
    : 'The senior manager\'s page, which you can stand in for: the one-to-one deadline, which supervisors have finished their team, their scorecards, and the month\'s four emails.';
}
let hashTaken = false;
function applyRole() {
  const r = roleNow(), L = WS_OF[r] || [];
  document.body.dataset.wsrole = r; document.body.classList.toggle('ro', !isBuilder());
  renderWelcome(); roleHeads(r);
  if (state.db) { watchDailyMail(state.db); rbPrefsCarry(); }
  for (const id of ['bell', 'setBtn', 'acctSet']) { const el = $(id); if (el) el.hidden = !isBuilder(); }
  syncFindBtn();
  if (!L.length) { state.ws = 'wait'; hidePop(); showWsView('wait'); syncWsSeg(); waitText(); return; }
  const fresh = state.wsRole !== r; state.wsRole = r;   // someone else signed in, or the role changed: their own first workspace
  const want = fresh && !hashTaken ? hashWs() : ''; if (fresh) hashTaken = true;   // a link to a page (#/team), on the first sign-in of the visit only: opened when the role has it, else "Not one of your pages" (the next person to sign in starts on their own first page)
  if (want && want !== L[0] && !L.includes(want) && WS_LABEL[want]) { showBlocked(want); return; }
  if (want && L.includes(want)) { setWs(want); return; }
  if (fresh || !L.includes(state.ws)) setWs(L[0]); else setWs(state.ws, true);
}
/** the waiting page says who opens the access */
function waitText() {
  const u = Auth.user() || {};
  if (u.kind === 'agent') {
    $('h-wait').textContent = 'Waiting for your supervisor';
    $('waitSub').textContent = 'Your account is ready. Your supervisor now confirms who you are in the team; your own page opens here as soon as they do.';
    if (u.wantSpv && state.db) state.db.doc(state.db.folder ? 'meta/supervisors' : 'config/supervisors').get().then(sn => { const L = sn.exists ? (sn.data().list || []) : [], x = L.find(y => y.pid === u.wantSpv); if (x) $('waitSub').textContent = `Your account is ready. ${x.name} now confirms who you are in the team; your own page opens here as soon as they do.`; }).catch(() => {});
  } else { $('h-wait').textContent = 'Waiting for access'; $('waitSub').textContent = 'Your account is ready. An admin now gives you a role (supervisor, senior manager, WFM manager, WFM analyst or quality team); this page opens your workspace as soon as they do.'; }
}
function syncWsSeg() {
  syncNav();
  renderAutoNote(); renderToday();
}
function showWsView(v) {
  for (const s of STEPS) $('v-' + s).hidden = true;
  for (const w of WS_VIEWS) $('v-' + w).hidden = w !== v;
  $('buildBar').hidden = true;
}
function setWs(ws, quiet) {
  const L = WS_OF[roleNow()] || []; if (!L.includes(ws)) return;
  const changed = state.ws !== ws; state.ws = ws; syncWsSeg(); hidePop(); putHash(ws);
  if (ws !== 'wfm') mountMail(false);
  if (ws === 'build') { for (const w of WS_VIEWS) $('v-' + w).hidden = true; const s = STEPS.includes(state.step) ? state.step : 'import'; state.step = '__'; setStep(s); return; }
  showWsView(ws); renderWs();
  if (changed && !quiet) { animIn($('v-' + ws)); window.scrollTo({ top: 0 }); }
  requestAnimationFrame(thumbs);
}
function leaveWs() { if (state.ws === 'build') return; state.ws = 'build'; for (const w of WS_VIEWS) $('v-' + w).hidden = true; syncWsSeg(); }
function renderWs() {
  const w = state.ws;
  if (w === 'dash') renderDash(); else if (w === 'team') renderTeam(); else if (w === 'results') renderResults(); else if (w === 'wfm') renderWfmWs(); else if (w === 'quality') renderQuality(); else if (w === 'cycle') renderCycle(); else if (w === 'me') renderMe();
  if (w === 'cycle') sectionNav('cycleBody');
  renderAutoNote(); renderFresh(); cycleBadge(); renderToday(); syncNav();
  requestAnimationFrame(segThumbs);
}
const monthSelHtml = (k, attr) => { const L = wsMonths(); return L.length ? `<label class="wsfield"><span>Month</span><select class="cell" ${attr} aria-label="Month">${L.slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}${monthLocked(x) ? ' · final' : ''}</option>`).join('')}</select></label>` : ''; };
function statusBanner(k) {
  const D = monthData(k); if (!D) return '';
  if (D.final) return `<div class="wsstatus final"><span class="dot"></span><div><b>Final</b> · ${esc(ymLabel(k))} was ${esc(finalBy(k))}.${roleNow() === 'spv' ? ' Results and one-to-ones are read-only now.' : isSenior() ? ' You can still change results and one-to-ones; each change is logged.' : ''}</div></div>`;
  const H = D.rec;
  return `<div class="wsstatus draft"><span class="dot"></span><div><b>Draft</b> · ${H.auto ? `saved by the tool as the month was built${H.by ? ' by ' + esc(H.by) : ''}` : esc(H.src || 'saved')}${H.at ? `, ${esc(fmtWhen(H.at))}` : ''}. Numbers can still change until the senior manager finalizes the month.</div></div>`;
}
const tileW = (b, l, s, cls) => `<div class="tile ${cls || ''}"><span class="tl">${esc(l)}</span><b>${esc(b)}</b>${s ? `<span class="ts">${esc(s)}</span>` : ''}</div>`;
function aggRows(L) {   // L: history rows
  const set = state.settings, adh = L.map(r => r.adh).filter(v => v != null);
  return { n: L.length, adh: mean(adh), below: adh.filter(v => v < set.target).length, aht: mean(L.map(r => r.aht)), ded: sum(L.map(r => r.ded)), conf: mean(L.map(r => r.conf)),
    absent: sum(L.map(r => r.absent)), tardy: sum(L.map(r => r.tardy)), fin: mean(L.map(r => r.fin)), earned: sum(L.map(r => r.earned)), exc: sum(L.map(r => r.wfExc)), occ: mean(L.map(r => History.valOf(r, History.METRICS.find(m => m.k === 'occ')))) };
}
const needScore = (r, set) => !r ? 0 : (r.adh != null && r.adh < set.target ? (set.target - r.adh) * 400 : 0) + (r.wfExc || 0) * 1.5 + (r.absent || 0) * 4 + (r.fin != null && r.fin < ELIG.minFinal ? (ELIG.minFinal - r.fin) * 60 : 0) + (r.tardy || 0) / 30;
function whyLine(r, set) {
  if (!r) return 'Not in this month\'s results';
  const x = [];
  if (r.adh != null) x.push(`${pct(r.adh, 1)} adherence${r.adh < set.target ? ' ↓' : ''}`);
  if (r.fin != null) x.push(`final ${pct1(r.fin)}`);
  if (r.wfExc) x.push(plural(r.wfExc, 'exception'));
  if (r.absent) x.push(`${r.absent} absent`);
  if (r.tardy) x.push(`${Math.round(r.tardy)} min tardy`);
  return x.join(' · ');
}

// ---------------------------------------------------------------- TEAM: see team.js
async function arrangeOneToOne(pid, k, date) {
  if (monthLocked(k) && !isSenior()) return;
  const id = formId('1to1', pid, k), cur = state.forms.find(f => f.id === id);
  const f = cur ? { ...clone(cur), plannedAt: date, status: cur.status === 'held' || cur.status === 'closed' ? cur.status : 'planned' } : { ...formDefaultsHist('1to1', pid, k), id, plannedAt: date, status: 'planned' };
  f.savedByName = whoNow(); const u = Auth.user(); if (!f.owner) f.owner = u ? u.id || '' : '';
  state.forms = state.forms.filter(x => x.id !== id).concat(f);
  if (state.db) queueWrite('forms/' + id, () => state.db.doc('forms/' + id).set(f));
  saveFinalFormCopy(f); toast(`One-to-one with ${f.agent.name} arranged for ${Forms.fmtDate(date)}`); renderWs();
  if (agentHasAccount(pid)) publishAgent(pid, k, { quiet: true });
}

// ---------------------------------------------------------------- RESULTS: the senior manager's workspace
function renderResults() {
  const k = wsMonthNow(), set = state.settings, senior = isSenior();
  const D = k ? monthData(k) : null, locked = k && monthLocked(k);
  const fin = !k ? '' : senior ? (locked ? `<button class="btn sm" data-reopen>Reopen ${esc(ymLabel(k))}</button>` : `<button class="btn sm primary" data-finalize>Finalize ${esc(ymLabel(k))}</button>`) : '';
  $('resultsBar').innerHTML = `${monthSelHtml(k, 'data-wsmonth')}<div class="wsacts">${fin}<button class="btn sm" data-x="results"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Results Excel</button></div>`;
  const body = $('resultsBody');
  if (!k || !D) { body.innerHTML = emptyCard('No months yet', 'The month appears here as soon as the WFM team starts building it.'); return; }
  if (locked) loadFrozen(k);
  const map = rowsByPid(k), P = rosterRows(), items = P.map(p => { const pp = effP(p._id) || p; return { p, exp: gname(pp) || p.name, unit: unitOf(p), r: map.get(p._id) || null, os: oneStatus(p._id, k), spv: spvOf(p._id).map(a => a.name).join(', ') }; }).filter(x => x.r);
  const A = aggRows(items.map(x => x.r)), held = items.filter(x => x.os.st === 'held' || x.os.st === 'closed').length;
  const tiles = tileW(String(items.length), 'agents in the results', ymLabel(k)) + tileW(pct(A.adh, 1), 'adherence', `${A.below} under ${pct(set.target, 0)}`, A.adh != null && A.adh < set.target ? 'alert' : '')
    + tileW(pct1(A.fin), 'final % (KPI)', 'average of the scorecards') + tileW(A.earned == null ? '–' : Math.round(A.earned).toLocaleString('en-US'), 'earned SR', 'incentives in total')
    + tileW(A.ded == null ? '–' : Math.round(A.ded).toLocaleString('en-US'), 'deduction minutes', 'Virgin · CC scope') + tileW(A.exc == null ? '–' : String(A.exc), 'exceptions', 'from the daily review rules')
    + tileW(`${held} / ${items.length}`, 'one-to-ones held', items.length ? pr1(held / items.length) : '');
  // by team
  const units = [...new Set(items.map(x => x.unit))].sort(sortUnits);
  const uRow = (label, L) => { const a = aggRows(L.map(x => x.r)), h = L.filter(x => x.os.st === 'held' || x.os.st === 'closed').length; return `<tr><td>${esc(label)}</td><td class="r">${L.length}</td><td class="r num">${pct(a.adh, 1)}</td><td class="r num">${a.below}</td><td class="r num">${mss(a.aht)}</td><td class="r num">${pct1(a.fin)}</td><td class="r num">${a.earned == null ? '–' : Math.round(a.earned).toLocaleString('en-US')}</td><td class="r num">${a.ded == null ? '–' : Math.round(a.ded).toLocaleString('en-US')}</td><td class="r num">${a.exc == null ? '–' : a.exc.toLocaleString('en-US')}</td><td class="r">${progress(h, L.length)}</td></tr>`; };
  const teamTab = `<div class="card"><h2>By team</h2><div style="overflow-x:auto"><table class="teamtab"><thead><tr><th>Team</th><th class="r">Agents</th><th class="r">Adherence</th><th class="r">Below</th><th class="r">AHT</th><th class="r">Final %</th><th class="r">Earned SR</th><th class="r">Deduction</th><th class="r">Exceptions</th><th class="r">One-to-ones</th></tr></thead><tbody>${units.map(u => uRow(u, items.filter(x => x.unit === u))).join('')}${uRow('All', items)}</tbody></table></div></div>`;
  // by supervisor
  const S = spvList(), sRows = S.map(a => [a.name, items.filter(x => x.p.spv === a.pid)]).concat([['No supervisor', items.filter(x => !x.p.spv || !S.some(a => a.pid === x.p.spv))]]).filter(([, L]) => L.length);
  const spvTab = `<div class="card"><h2>By supervisor</h2><p class="cap">${S.length ? 'Each supervisor\'s agents, from the roster\'s Supervisor column.' : 'No supervisors yet: the WFM team fills the Supervisor column in the roster, or imports the Teams Distribution.'}</p><div style="overflow-x:auto"><table class="teamtab"><thead><tr><th>Supervisor</th><th class="r">Agents</th><th class="r">Adherence</th><th class="r">Below</th><th class="r">AHT</th><th class="r">Final %</th><th class="r">Earned SR</th><th class="r">Deduction</th><th class="r">Exceptions</th><th class="r">One-to-ones</th></tr></thead><tbody>${sRows.map(([n, L]) => uRow(n, L)).join('')}</tbody></table></div></div>`;
  // every agent
  const q = normName(state.resQ), U = state.resUnit, SP = state.resSpv;
  let L = items.filter(x => (!U || x.unit === U) && (!SP || (SP === '-' ? !x.spv : x.p.spv === SP)) && (!q || normName(`${x.exp} ${x.p.name} ${(effP(x.p._id) || x.p).nid}`).includes(q)));
  const COLS = [['name', 'Agent'], ['unit', 'Team'], ['spv', 'Supervisor'], ['adh', 'Adherence'], ['adhUnder', 'Days under'], ['aht', 'AHT'], ['ded', 'Deduction'], ['absent', 'Absent'], ['tardy', 'Tardy'], ['wfExc', 'Exceptions'], ['fin', 'Final %'], ['earned', 'Earned SR'], ['elig', 'Eligible'], ['one', 'One-to-one']];
  const val = (x, c) => c === 'name' ? x.exp : c === 'unit' ? x.unit : c === 'spv' ? x.spv : c === 'one' ? ['none', 'planned', 'held', 'closed'].indexOf(x.os.st) : c === 'elig' ? (x.r._el ? (x.r._el.ok ? 1 : 0) : null) : x.r[c];
  const dir = state.resDir === 'desc' ? -1 : 1, sc = state.resSort;
  L = L.sort((a, b) => { const x = val(a, sc), y = val(b, sc); if (typeof x === 'string' || typeof y === 'string') return dir * String(x ?? '').localeCompare(String(y ?? '')); return (x == null) - (y == null) || dir * ((x ?? 0) - (y ?? 0)) || byExp(a, b); });
  const edit = senior && locked;
  const cell = (x, c) => {
    const r = x.r, rk = rowKey(r);
    if (edit && (c === 'fin' || c === 'earned')) return `<td class="r"><input class="cell adj${r._adj && r._adj[c] != null ? ' changed' : ''}" data-adj="${esc(rk)}" data-f="${c}" value="${esc(c === 'fin' ? (r.fin == null ? '' : (r.fin * 100).toFixed(1)) : (r.earned ?? ''))}" inputmode="decimal" aria-label="${c === 'fin' ? 'Final %' : 'Earned SR'} of ${esc(x.exp)}" title="${r._adj && r._adj[c] != null ? `Changed by ${esc(r._adj.by || '')}${r._adj.note ? ': ' + esc(r._adj.note) : ''}` : 'Calculated'}"></td>`;
    if (c === 'name') return `<td><button class="linkbtn nm" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" dir="auto">${esc(x.exp)}</button>${r._adj ? ' <span class="pill warn" title="' + esc(r._adj.note || 'Changed by the senior manager') + '">changed</span>' : ''}</td>`;
    if (c === 'unit') return `<td>${esc(x.unit)}</td>`; if (c === 'spv') return `<td>${esc(x.spv || '–')}</td>`;
    if (c === 'one') return `<td>${x.os.st === 'none' ? '<span class="fst none">None</span>' : formStatusChip(x.os.o)}${x.os.o ? ' ' + sigChip(x.os.o) : ''}</td>`;
    if (c === 'elig') {
      const el = r._el, why = el && el.why && el.why.length ? el.why.join(', ') : '', forced = r._adj && r._adj.elig != null;
      const txt = !el ? '–' : el.ok ? (forced ? 'Yes (decided)' : 'Yes') : `No${why ? ' · ' + why : ''}`;
      if (canCycle()) return `<td><select class="cell elig${forced ? ' changed' : ''}" data-elig="${esc(rk)}" aria-label="Eligible: ${esc(x.exp)}" title="${esc(why ? 'The rules say: ' + why : 'The rules say eligible')}"><option value=""${forced ? '' : ' selected'}>${esc(!el ? 'By the rules' : `By the rules: ${why ? 'no' : 'yes'}`)}</option><option value="yes"${forced && r._adj.elig === true ? ' selected' : ''}>Eligible</option><option value="no"${forced && r._adj.elig === false ? ' selected' : ''}>Not eligible</option></select></td>`;
      return `<td><span class="${el && !el.ok ? 'bad' : ''}">${esc(txt)}</span></td>`;
    }
    const v = r[c], mt = History.METRICS.find(m => m.k === c), td = histCell(mt, v == null ? null : v).replace('<td class="num', '<td class="r num');
    return c === 'fin' && (r.kpi || r.kx) ? td.replace(/<\/td>$/, ` ${howLink(x.p._id, x.exp)}</td>`) : td;
  };
  const th = ([c, l]) => `<th class="${['name', 'unit', 'spv', 'one'].includes(c) ? '' : 'r'}"><button class="linkbtn" data-ressort="${c}">${esc(l)}${sc === c ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
  const agentTab = `<div class="card"><div class="cardhead"><div><h2>Every agent</h2><p class="cap">${edit ? 'The month is final. You can change Final %, Earned SR and who is eligible; each change is logged with your name.' : locked ? 'The month is final.' : `Draft numbers from the shared history.${canCycle() ? ` Eligibility follows the rules (${esc(eligText(k))}) unless you decide otherwise here; each decision is logged.` : ''}`}</p></div>
    <div class="toolbar"><input type="search" data-resq value="${esc(state.resQ)}" placeholder="Search name or ID" aria-label="Search"><select class="cell" data-resunit aria-label="Team"><option value="">All teams</option>${units.map(u => `<option${u === U ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select><select class="cell" data-resspv aria-label="Supervisor"><option value="">All supervisors</option>${spvList().map(a => `<option value="${esc(a.pid)}"${a.pid === SP ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}<option value="-"${SP === '-' ? ' selected' : ''}>No supervisor</option></select></div></div>
    <div class="tablewrap restab"><table><thead><tr>${COLS.map(th).join('')}</tr></thead><tbody>${L.map(x => `<tr>${COLS.map(([c]) => cell(x, c)).join('')}</tr>`).join('') || `<tr><td colspan="${COLS.length}" class="empty">Nobody matches.</td></tr>`}</tbody></table></div></div>`;
  const log = D.final && (D.final.log || []).length ? `<details class="card wslog"><summary>Change log · ${plural(D.final.log.length, 'entry', 'entries')}</summary><ul class="ilist">${D.final.log.slice().reverse().map(e => `<li><span class="nm">${esc(e.what)}</span><span class="sg">${esc(e.by || '')} · ${esc(fmtWhen(e.at))}</span></li>`).join('')}</ul></details>` : '';
  const keepFocus = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-resq]') ? document.activeElement.selectionStart : null;
  body.innerHTML = `${statusBanner(k)}<div class="tiles wstiles">${tiles}</div>${teamTab}${spvTab}${agentTab}${log}${safeHtml(cmpCardHtml, k)}`;
  if (keepFocus != null) { const i = body.querySelector('[data-resq]'); i.focus(); i.setSelectionRange(keepFocus, keepFocus); }
}
const progress = (n, d) => `<span class="prog" title="${n} of ${d}"><span class="bar"><i style="width:${d ? Math.round(n / d * 100) : 0}%"></i></span><span class="pv">${n}/${d}</span></span>`;

// ---------------------------------------------------------------- WFM: the WFM manager's analytics
const normBrand = b => { const s = String(b || '').toLowerCase().replace(/[^a-z]/g, ''); if (!s) return '–'; if (s.includes('pay')) return 'Friendi Pay'; if (s.startsWith('vir') || s.startsWith('vm')) return 'Virgin'; if (/^f[a-z]{0,2}[ie]n[a-z]*d|^fr/.test(s)) return 'Friendi'; return normSpace(b); };
const normTeam = t => normSpace(t).toUpperCase() || '–';
const GROUPS = { unit: ['Team', r => `${normBrand(r.brand)} · ${normTeam(r.team)}`], brand: ['Brand', r => normBrand(r.brand)], team: ['Department', r => normTeam(r.team)] };
function wfmMetrics() { const months = wsMonths(), noSR = srHidden(); return History.METRICS.filter(mt => !(noSR && mt.k === 'earned') && months.some(k => (monthData(k) || { rows: [] }).rows.some(r => History.valOf(r, mt) != null))); }
function groupVal(rows, mt) { const v = rows.map(r => History.valOf(r, mt)).filter(x => x != null); if (!v.length) return null; return mt.total === 'avg' ? v.reduce((a, b) => a + b, 0) / v.length : v.reduce((a, b) => a + b, 0); }
function renderWfm() {
  const k = wsMonthNow(), months = wsMonths(), M = wfmMetrics();
  const mt = M.find(m => m.k === state.wfmMetric) || M.find(m => m.k === 'adh') || M[0], G = GROUPS[state.wfmGroup] || GROUPS.unit;
  $('wfmBar').innerHTML = `${monthSelHtml(k, 'data-wsmonth')}<label class="wsfield"><span>Measure</span><select class="cell" data-wfmm aria-label="Measure">${M.map(m => `<option value="${m.k}"${mt && m.k === mt.k ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
    <label class="wsfield"><span>Group by</span><select class="cell" data-wfmg aria-label="Group by">${Object.entries(GROUPS).map(([g, [l]]) => `<option value="${g}"${g === state.wfmGroup ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="wsacts"><button class="btn sm" data-x="wfm"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Export analytics</button></div>`;
  const body = $('wfmBody');
  if (!k || !mt) { body.innerHTML = emptyCard('No months yet', 'The analytics fill in as months are saved to the shared history.'); return; }
  const set = state.settings, rowsK = (monthData(k) || { rows: [] }).rows, i = months.indexOf(k), prevK = i > 0 ? months[i - 1] : null, rowsP = prevK ? (monthData(prevK) || { rows: [] }).rows : [];
  const KM = ['adh', 'conf', 'aht', 'ded', 'absent', 'tardy', 'wfExc', 'occ', 'fin', 'earned', 'ans'].filter(x => !(x === 'earned' && srHidden())).map(x => History.METRICS.find(m => m.k === x)).filter(m => m && rowsK.some(r => History.valOf(r, m) != null));
  const better = m => (m.good ? (m.good(0, set.target) ? -1 : 1) : ['ded', 'absent', 'tardy', 'wfExc', 'aht', 'pAht', 'hold', 'acw', 'xferR', 'heldR'].includes(m.k) ? -1 : 1);
  const kpis = KM.map(m => {
    const v = groupVal(rowsK, m), pv = prevK ? groupVal(rowsP, m) : null, d0 = v != null && pv != null ? v - pv : null, isP = m.pct || PCTK.has(m.k);
    const d = d0 == null ? null : Math.abs(d0) < (isP ? 0.0005 : TIMEK.has(m.k) ? 0.5 : 0.5) ? 0 : d0, good = !d ? '' : (d > 0) === (better(m) > 0) ? 'up' : 'down';
    const dTxt = d == null ? (prevK ? 'no value last month' : 'first month') : d === 0 ? `no change vs ${MON[+prevK.slice(5) - 1]}` : `${d > 0 ? '▲' : '▼'} ${m.pct || PCTK.has(m.k) ? `${Math.abs(d * 100).toFixed(1)} pt` : TIMEK.has(m.k) ? mss(Math.abs(d)) : Math.round(Math.abs(d)).toLocaleString('en-US')} vs ${MON[+prevK.slice(5) - 1]}`;
    return `<button class="kpi ${good}" data-wfmm="${m.k}" aria-pressed="${m.k === mt.k}"><span>${esc(m.label)}</span><b>${esc(fmtM(m, v))}</b><small>${esc(dTxt)}</small></button>`;
  }).join('');
  // groups across months
  const gv = (x, g) => groupVal((monthData(x) || { rows: [] }).rows.filter(r => G[1](r) === g), mt);   // a group's value in a month
  const groupsAll = [...new Set(months.flatMap(x => (monthData(x) || { rows: [] }).rows.map(G[1])))].filter(g => g && g !== '– · –' && g !== '–' && months.some(x => gv(x, g) != null));
  const sizeK = new Map(groupsAll.map(g => [g, rowsK.filter(r => G[1](r) === g).length]));
  const topG = groupsAll.slice().sort((a, b) => (sizeK.get(b) || 0) - (sizeK.get(a) || 0)).slice(0, 6).sort(state.wfmGroup === 'unit' ? sortUnits : (a, b) => a.localeCompare(b));
  const series = topG.map((g, j) => ({ name: g, values: months.map(x => gv(x, g)), cls: state.wfmGroup === 'brand' ? seriesCls(g, j) : `s${(j % 6) + 1}` }));
  const trend = `<div class="card"><h2>${esc(mt.label)} by month</h2><p class="cap">${topG.length < groupsAll.length ? `The ${topG.length} largest of ${groupsAll.length} groups; the rest are in the table and the export.` : `Every ${G[0].toLowerCase()}.`} ${mt.total === 'sum' ? 'Totals.' : 'Average per person.'}</p>${lineChart(months.map(x => MON[+x.slice(5) - 1] + ' ' + x.slice(2, 4)), series, mt, mt.k === 'adh' ? set.target : null)}</div>`;
  // comparison for the month
  const comp = groupsAll.map(g => ({ g, v: groupVal(rowsK.filter(r => G[1](r) === g), mt), n: rowsK.filter(r => G[1](r) === g).length })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
  const all = groupVal(rowsK, mt), dots = mt.total === 'avg';
  let cmp;
  if (dots) {   // close values (95.9% against 99.4%) read better as dots on a scale that starts near them, with the all-agents line
    const vs = comp.map(x => x.v).concat(all != null ? [all] : []), lo0 = Math.min(...vs), hi0 = Math.max(...vs), pad = Math.max((hi0 - lo0) * 0.12, PCTK.has(mt.k) || mt.pct ? 0.004 : Math.abs(hi0) * 0.02 || 1);
    const lo = lo0 - pad, hi = hi0 + pad, X = v => ((v - lo) / (hi - lo)) * 100;
    cmp = `<div class="cbars dots">${comp.map(x => `<div class="cb" data-tt="${esc(x.g)}: ${esc(mt.fmt(x.v))} · ${plural(x.n, 'person', 'people')}"><span class="nm">${esc(x.g)}</span><span class="track">${all != null ? `<span class="ref" style="left:${X(all).toFixed(1)}%"></span>` : ''}<span class="dot" style="left:${X(x.v).toFixed(1)}%"></span></span><span class="v">${esc(mt.fmt(x.v))}</span></div>`).join('')}
      <div class="cb axis" aria-hidden="true"><span></span><span class="ax"><span>${esc(mt.fmt(lo))}</span>${all != null ? `<span class="allx" style="left:${X(all).toFixed(1)}%">all</span>` : ''}<span>${esc(mt.fmt(hi))}</span></span><span></span></div></div>`;
  } else {
    const mx = Math.max(...comp.map(x => Math.abs(x.v)), 1e-9);
    cmp = `<div class="cbars">${comp.map(x => `<div class="cb" data-tt="${esc(x.g)}: ${esc(mt.fmt(x.v))} · ${plural(x.n, 'person', 'people')}"><span class="nm">${esc(x.g)}</span><span class="track"><span class="fill" style="width:${Math.max(1, Math.abs(x.v) / mx * 100)}%"></span></span><span class="v">${esc(mt.fmt(x.v))}</span></div>`).join('')}</div>`;
  }
  const bars = `<div class="card"><h2>${esc(G[0])}s · ${esc(ymLabel(k))}</h2><p class="cap">${esc(mt.label)}${dots ? ', average per person' : ', total'}${all != null ? `; all agents: ${esc(mt.fmt(all))}${dots ? ' (the line)' : ''}` : ''}.</p>${comp.length ? cmp : '<p class="subtle">No values this month.</p>'}</div>`;
  // heatmap: groups x months
  const vals = groupsAll.flatMap(g => months.map(x => gv(x, g))).filter(v => v != null);
  const lo = Math.min(...vals), hi = Math.max(...vals), sh = v => (v == null || hi - lo < 1e-12 ? 0 : (v - lo) / (hi - lo));
  const heat = `<div class="card"><h2>${esc(mt.label)}: ${esc(G[0].toLowerCase())}s by month</h2><p class="cap">Darker is higher. Select a month to open it.</p><div class="tablewrap heat"><table><thead><tr><th>${esc(G[0])}</th>${months.map(x => `<th class="r"><button class="linkbtn" data-hm="${x}">${esc(MON[+x.slice(5) - 1])}</button></th>`).join('')}</tr></thead><tbody>${groupsAll.sort(state.wfmGroup === 'unit' ? sortUnits : (a, b) => a.localeCompare(b)).map(g => `<tr><td>${esc(g)}</td>${months.map(x => { const v = gv(x, g); return `<td class="r num hc${x === k ? ' cur' : ''}${v != null && sh(v) > 0.55 ? ' hi' : ''}" style="--h:${v == null ? 0 : (6 + sh(v) * 66).toFixed(0)}%" ${v == null ? '' : `data-tt="${esc(g)} · ${esc(ymLabel(x))}: ${esc(mt.fmt(v))}"`}>${v == null ? '–' : esc(mt.fmt(v))}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  // distribution and the agents at both ends
  const pv = rowsK.map(r => ({ r, v: History.valOf(r, mt) })).filter(x => x.v != null);
  const dist = distHtml(pv.map(x => x.v), mt, set);
  const asc = (mt.good && mt.good(0, set.target)) || better(mt) < 0;   // lower is better: the best are the lowest
  const sorted = pv.slice().sort((a, b) => (asc ? a.v - b.v : b.v - a.v));
  const pidOf = r => { for (const [pid, rr] of rowsByPid(k)) if (rr === r) return pid; return null; };
  const list = (L, t) => `<div><h3 class="sub">${esc(t)}</h3><ol class="toplist">${L.map(x => { const pid = pidOf(x.r); return `<li>${pid ? `<button class="linkbtn nm" data-open="${esc(pid)}" data-agent="${esc(pid)}" dir="auto">${esc(x.r.n)}</button>` : `<span dir="auto">${esc(x.r.n)}</span>`}<span class="chip">${esc(G[1](x.r))}</span><b>${esc(mt.fmt(x.v))}</b></li>`; }).join('')}</ol></div>`;
  const ends = `<div class="card"><h2>Agents at both ends · ${esc(mt.label)}</h2><div class="grid2">${list(sorted.slice(0, 10), 'Best 10')}${list(sorted.slice(-10).reverse(), 'Needs most attention')}</div></div>`;
  // where the data comes from
  const cov = `<div class="card"><h2>Where each month's data comes from</h2><p class="cap">What the shared history holds for each month, and whether it is final.</p><div class="tablewrap heat"><table><thead><tr><th>Month</th><th>Source</th><th class="r">People</th><th class="r">Adherence</th><th class="r">KPI</th><th class="r">Deduction</th><th class="r">Daily review</th><th class="r">Performance</th><th>Status</th></tr></thead><tbody>${months.slice().reverse().map(x => {
    const D = monthData(x), R = D ? D.rows : [], has = f => R.filter(f).length, H = state.history[x];
    const c = n => `<td class="r num">${n ? n : '<span class="subtle">–</span>'}</td>`;
    return `<tr><td>${esc(ymLabel(x))}</td><td>${esc(H ? (H.auto ? 'Built in the tool' : H.src || '') : 'Final only')}${H && H.gsrc && H.gsrc.length ? ` <span class="subtle">+ Genesys: ${esc(H.gsrc.join(', '))}</span>` : ''}</td><td class="r num">${R.length}</td>${c(has(r => r.adh != null))}${c(has(r => r.fin != null))}${c(has(r => r.ded != null))}${c(has(r => r.wfShift != null))}${c(has(r => r.hnd != null))}<td>${monthLocked(x) ? `<span class="pill good">Final</span> <span class="subtle">${esc(state.finals[x].byName || '')}</span>` : '<span class="pill">Draft</span>'}</td></tr>`;
  }).join('')}</tbody></table></div></div>`;
  body.innerHTML = `${statusBanner(k)}${safeHtml(objFixHtml, 'wfm')}<div class="kpistrip">${kpis}</div><div class="grid2 top">${trend}${bars}</div>${heat}<div class="grid2 top"><div class="card"><h2>Distribution · ${esc(ymLabel(k))}</h2><p class="cap">${esc(mt.label)} per person.</p>${dist}</div>${ends}</div>${cov}`;
  reveal(body);
}
function seriesCls(name, j) { const b = String(name).split(' · ')[0]; return b === 'Virgin' ? 'b-virgin' : b === 'Friendi Pay' ? 'b-fpay' : b === 'Friendi' ? 'b-friendi' : `s${(j % 6) + 1}`; }
function distHtml(vals, mt, set) {
  if (!vals.length) return '<p class="subtle">No values.</p>';
  let bins;
  if (mt.k === 'adh') bins = [[0, 0.9, 'Under 90%'], [0.9, set.target, `90–${Math.round(set.target * 100)}%`], [set.target, 0.97, `${Math.round(set.target * 100)}–97%`], [0.97, 0.99, '97–99%'], [0.99, 2, '99% +']];
  else { const lo = Math.min(...vals), hi = Math.max(...vals), w = (hi - lo) / 5 || 1; bins = [0, 1, 2, 3, 4].map(j => [lo + j * w, j === 4 ? hi + 1e-9 : lo + (j + 1) * w, `${mt.fmt(lo + j * w)}–${mt.fmt(lo + (j + 1) * w)}`]); }
  const counts = bins.map(([a, b]) => vals.filter(v => v >= a && v < b).length), mx = Math.max(1, ...counts);
  return `<div class="hist" role="img" aria-label="${esc(bins.map(([, , l], j) => `${l}: ${counts[j]}`).join(', '))}">${bins.map(([, , l], j) => `<div class="hcol" data-tt="${esc(l)}: ${plural(counts[j], 'person', 'people')}"><div class="hbar" style="height:${counts[j] ? Math.max(2, counts[j] / mx * 100) : 0}%"><em>${counts[j]}</em></div></div>`).join('')}</div><div class="hlab">${bins.map(([, b, l]) => `<span class="${mt.k === 'adh' && b <= set.target + 1e-9 ? 'under' : ''}">${esc(l)}</span>`).join('')}</div>`;
}
/** a line chart with up to 6 series: shared y axis, a target line, direct end labels, a legend and a hover readout per month */
function lineChart(labels, series, mt, target, wide) {
  const S = series.filter(s => s.values.some(v => v != null)); if (!S.length) return '<p class="subtle">No values yet.</p>';
  const narrow = innerWidth < 640, W = narrow ? 400 : wide ? 980 : 640, H = narrow ? 250 : wide ? 260 : 230, L = narrow ? 46 : 52, R = narrow ? 14 : 120, T = 14, B = 28, iw = W - L - R, ih = H - T - B, n = labels.length;
  const all = S.flatMap(s => s.values).filter(v => v != null).concat(target != null ? [target] : []);
  let lo = Math.min(...all), hi = Math.max(...all);
  const isPct = PCTK.has(mt.k) || mt.pct, isTime = TIMEK.has(mt.k);
  if (isPct) { const pad = Math.max((hi - lo) * 0.15, 0.01); lo = Math.max(0, lo - pad); hi = Math.min(1, hi + pad); } else { lo = Math.min(0, lo); hi = hi * 1.1 || 1; }
  if (hi - lo < 1e-9) hi = lo + 1;
  const X = i => L + (n === 1 ? iw / 2 : (i * iw) / (n - 1)), Y = v => T + ih - ((v - lo) / (hi - lo)) * ih, f1 = v => Math.round(v * 10) / 10;
  const fmt = v => (isPct ? `${(v * 100).toFixed(hi - lo < 0.06 ? 1 : 0)}%` : isTime ? mss(v) : Math.round(v).toLocaleString('en-US'));
  const grid = [0, 1, 2, 3].map(i => { const v = lo + ((hi - lo) * i) / 3; return `<line class="g" x1="${L}" x2="${W - R}" y1="${f1(Y(v))}" y2="${f1(Y(v))}"/><text class="yl" x="${L - 8}" y="${f1(Y(v) + 4)}" text-anchor="end">${esc(fmt(v))}</text>`; }).join('');
  const xl = labels.map((l, i) => ((n > 12 || (narrow && n > 6)) && (n - 1 - i) % 2 ? '' : `<text class="xl" x="${f1(X(i))}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`)).join('');
  const tl = target != null ? `<line class="tg" x1="${L}" x2="${W - R}" y1="${f1(Y(target))}" y2="${f1(Y(target))}"/><text class="tl" x="${L + 4}" y="${f1(Y(target) - 5)}">Target ${esc(fmt(target))}</text>` : '';
  const ends = [];
  const lines = S.map(s => {
    let d = '', pen = false; s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${f1(X(i))} ${f1(Y(v))}`; pen = true; });
    const li = s.values.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0).pop();
    if (li != null && li >= 0) ends.push({ s, y: Y(s.values[li]), x: X(li), v: s.values[li] });
    return `<g class="ser ${s.cls}"><path class="ln${s.dash ? ' dash' : ''}" d="${d}"/>${s.values.map((v, i) => (v == null ? '' : `<circle class="dt" cx="${f1(X(i))}" cy="${f1(Y(v))}" r="3.5"/>`)).join('')}</g>`;
  }).join('');
  ends.sort((a, b) => a.y - b.y); for (let j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 13) ends[j].y = ends[j - 1].y + 13;
  const endLabels = S.length <= 4 && !narrow ? ends.map(e => `<text class="el ${e.s.cls}" x="${f1(W - R + 8)}" y="${f1(e.y + 4)}">${esc(e.s.name.length > 16 ? e.s.name.slice(0, 15) + '…' : e.s.name)} ${esc(mt.fmt(e.v))}</text>`).join('') : '';
  const step = n > 1 ? iw / (n - 1) : iw;
  const hits = labels.map((l, i) => `<g class="hp" data-tt="${esc(l)} · ${esc(S.map(s => `${s.name}: ${s.values[i] == null ? '–' : mt.fmt(s.values[i])}`).join(' · '))}"><rect class="hit" x="${f1(X(i) - step / 2)}" y="${T}" width="${f1(step)}" height="${ih}"/><line class="xh" x1="${f1(X(i))}" x2="${f1(X(i))}" y1="${T}" y2="${T + ih}"/></g>`).join('');
  const legend = `<div class="legend">${S.map(s => `<span class="lg ${s.cls}"><i class="${s.dash ? 'dash' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  return `<figure class="trend wschart">${legend}<svg class="trendsvg multi" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(mt.label)} by month: ${esc(S.map(s => `${s.name} ${s.values.map((v, i) => `${labels[i]} ${v == null ? 'no value' : mt.fmt(v)}`).join(', ')}`).join('; '))}">${grid}${tl}${lines}${endLabels}${xl}${hits}</svg></figure>`;
}

// ---------------------------------------------------------------- the person's page and hover card, from the saved month
function renderPersonWs(p) {
  const k = state.personK && monthData(state.personK) ? state.personK : formMonthKey(), pp = effP(p._id) || p, exp = gname(pp) || p.name, set = state.settings;
  $('h-person').textContent = exp;
  $('personSub').textContent = [`National ID ${Core.cleanId(pp.nid) || 'missing'}`, p.brand, p.team ? `${p.team} (${DEP_NAMES[p.team] || p.team})` : '', spvOf(p._id).map(a => 'Supervisor ' + a.name).join(', ')].filter(Boolean).join(' · ');
  const me = Auth.user() || {}, spvView = roleNow() === 'spv';
  if (spvView && !(me.pid && p.spv === me.pid) && !inScope(p, me.scope)) { $('personBody').innerHTML = '<p class="subtle">Not in your team.</p>'; return; }
  const r = k ? rowOf(p._id, k) : null, on = p.status !== 'Inactive';
  let h = `<section class="sec profile"><div class="phead"><span class="av lg" aria-hidden="true"${avStyle(exp)}>${esc(initials(exp))}</span><div class="pwho"><b dir="auto">${esc(exp)}</b>${spvLine(p._id)}<span>${normSpace(p.sys) && normName(p.sys) !== normName(p.name) ? `Roster name: <span dir="auto">${esc(p.name)}</span> · ` : ''}${esc(DEP_NAMES[p.team] || p.team || '')}</span></div><span class="stt${on ? ' on' : ''}">${on ? 'Active' : 'Inactive'}</span></div>
    <div class="pfacts"><div><span>National ID</span><b class="num">${esc(Core.cleanId(pp.nid) || '–')}</b></div><div><span>Brand</span><b>${esc(p.brand || '–')}</b></div><div><span>Team</span><b>${esc(p.team || '–')}</b></div><div><span>Supervisor</span><b>${esc(spvOf(p._id).map(a => a.name).join(', ') || '–')}</b></div></div></section>`;
  h += k ? statusBanner(k) : '';
  if (!r) h += `<div class="banner info">${k ? `Not in the ${esc(ymLabel(k))} results.` : 'No month is saved yet.'}</div>`;
  else {
    const sa = r.ks != null ? { s: r.ks, a: r.kat ?? r.ka } : (r.d || r.dx) ? (t => (t.sched || t.attended ? { s: t.sched, a: t.attended } : null))(Kpi.countDays(daysOfRow(r, Core.daysIn(+k.slice(0, 4), +k.slice(5))), countFor(k))) : null;   // as the incentive counts them
    const mini = (b, l, cls) => `<div class="${cls || ''}"><b>${esc(b)}</b><span>${esc(l)}</span></div>`;
    h += `<section class="sec"><h3>${esc(ymLabel(k))}</h3><div class="minis wsminis">${mini(pct(r.adh), 'Adherence Avr.', r.adh != null && r.adh < set.target ? 'bad' : '')}${mini(r.adhUnder ?? '–', 'Days under target')}${mini(mss(r.aht), 'AHT')}${mini(r.ded ?? '–', 'Deduction (min)')}${mini(pct(r.conf), 'Conformance')}
      ${mini(sa ? `${sa.s} / ${sa.a}` : '–', 'Scheduled / Actual days')}${mini(r.absent ?? '–', 'Absent')}${mini(r.tardy == null ? '–' : Math.round(r.tardy), 'Tardy (min)')}${mini(pct1(r.fin), 'Final %')}${srHidden() ? mini(r._el ? (r._el.ok ? 'Yes' : 'No') : '–', 'Eligible') : mini(r.earned ?? '–', 'Earned SR')}${mini(r.wfExc ?? '–', 'Exceptions')}</div>${r._adj ? `<p class="hint">Changed by ${esc(r._adj.by || 'the senior manager')}${r._adj.note ? ': ' + esc(r._adj.note) : ''}.</p>` : ''}</section>`;
    if (r.kpi && r.kpi.length) h += `<section class="sec"><h3>KPI results${r.kc ? ' · ' + esc(r.kc) : ''}</h3><div class="tablewrap formtab"><table><thead><tr><th>KPI</th><th class="r">Weight</th><th>Target</th><th class="r">Result</th><th class="r">Ranking</th></tr></thead><tbody>${r.kpi.map(([n, w, t, v, rk]) => `<tr><td>${esc(n)}</td><td class="r">${w}%</td><td>${esc(t)}</td><td class="r num">${esc(v)}</td><td class="r">${rankChip(rk)}</td></tr>`).join('')}<tr class="tot"><td>Final</td><td></td><td></td><td class="r num">${pct1(r.fin)}</td><td class="r">${r.fr != null ? (+r.fr).toFixed(2) : '–'}</td></tr></tbody></table></div>${r.ks != null ? `<p class="hint">Days ${r.ka ?? '–'} of ${r.ks}${r.kat != null && r.kat !== r.ka ? ` (${r.kat} attended)` : ''}${srHidden() ? '' : ` · incentive target ${r.kt ?? '–'} SR · earned ${r.earned ?? '–'} SR`}.${r._el && !r._el.ok ? ` Not eligible: ${esc((r._el.why || []).join(', '))}.` : ''}</p>` : ''}${howDetailsHtml(r, k, p)}</section>`;
    if (r.hnd != null) h += `<section class="sec"><h3>Performance</h3><div class="pfgrid">${['ans', 'hnd', 'pAht', 'talk', 'hold', 'acw', 'heldR', 'xferR', 'out'].map(c => `<div><span>${esc(PFM[c][0])}</span><b>${esc(PFM[c][1](pfVal(r, c)))}</b></div>`).join('')}</div></section>`;
    if (r.wfShift != null) h += `<section class="sec"><h3>Workforce and exceptions</h3><div class="pfgrid wfgrid"><div><span>Shifts</span><b>${r.wfShift}</b></div><div class="${r.wfWorked < r.wfShift ? 'bad' : ''}"><span>Worked</span><b>${r.wfWorked}</b></div><div class="${r.wfAbs ? 'bad' : ''}"><span>No sign-on</span><b>${r.wfAbs}</b></div><div class="${r.wfLate ? 'bad' : ''}"><span>Late sign-ons</span><b>${r.wfLate}</b><small>${hmin(r.wfLateMin)}</small></div><div class="${r.wfShort ? 'bad' : ''}"><span>Short of shift</span><b>${r.wfShort}</b><small>${hmin(r.wfShortMin)}</small></div><div><span>Break changes</span><b>${r.wfBrk}</b></div><div><span>Signed on</span><b>${hmin(r.wfLogged)}</b></div><div class="${r.wfExc ? 'bad' : 'good'}"><span>Exceptions</span><b>${r.wfExc}</b></div></div></section>`;
    const ad = adOf(r), ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
    if (ad) h += `<section class="sec"><div class="sechead"><h3>Daily adherence</h3><span class="spacer"></span><button class="btn sm" data-adhexporth><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Export day by day</button></div><div class="strip">${Array.from({ length: ND }, (_, i) => { const v = ad[i] ?? null; return `<div class="${v == null ? 'na' : v < set.target ? 'low' : 'ok'}" title="${esc(Core.weekday(+k.slice(0, 4), +k.slice(5), i + 1))} ${i + 1} ${MON[+k.slice(5) - 1]}: ${v == null ? 'NA' : pct(v)}"><small>${i + 1}</small><b>${v == null ? 'NA' : v >= 0.99995 ? '100' : (v * 100).toFixed(2)}</b></div>`; }).join('')}</div></section>`;
    if (r.d) { const CODE = { A: ['at', '✓', 'Attend'], O: ['off', 'OFF', 'OFF'], L: ['al', 'AL', 'Annual leave'], S: ['sl', 'SL', 'Sick leave'], X: ['ab', 'Abs', 'Absent'], V: ['ot', 'LV', 'Other leave'], '-': ['na', '', 'blank'] };
      h += `<section class="sec"><h3>Attendance</h3><div class="astrip">${[...String(r.d)].map((c, i) => { const x = CODE[c] || CODE['-']; return `<div class="${x[0]}" title="${i + 1} ${MON[+k.slice(5) - 1]}: ${esc(x[2])}"><small>${i + 1}</small><b>${esc(x[1])}</b></div>`; }).join('')}</div></section>`; }
  }
  if (r && roleNow() !== 'agent') h += qualityHtml(p._id, k);
  h += agentHistoryHtml(p) + formsListHtml(p._id);
  $('personBody').innerHTML = h;
}
function popHtmlWs(pid) {
  const p = effP(pid) || state.roster.find(x => x._id === pid); if (!p) return '';
  const k = wsMonthNow(), r = k ? rowOf(pid, k) : null, nm = gname(p) || p.name, set = state.settings, on = p.status !== 'Inactive', os = k ? oneStatus(pid, k) : { st: 'none' };
  const cells = r ? [['Adherence', r.adh == null ? '<b>–</b>' : r.adh < set.target ? belowB(r.adh, pct(r.adh)) : `<b>${pct(r.adh)}</b>`], ['Final %', `<b>${pct1(r.fin)}</b>`], srHidden() ? ['Tardy', `<b>${r.tardy == null ? '–' : Math.round(r.tardy) + ' min'}</b>`] : ['Earned', `<b>${r.earned == null ? '–' : r.earned + ' SR'}</b>`], ['AHT', `<b>${mss(r.aht)}</b>`], ['Exceptions', `<b>${r.wfExc ?? '–'}</b>`], ['Absent', `<b>${r.absent ?? '–'}</b>`]] : [];
  return `<div class="ph"><span class="av" aria-hidden="true"${avStyle(nm)}>${esc(initials(nm))}</span><div class="pwho"><b dir="auto">${esc(nm)}</b>${spvLine(pid)}<small>${esc(unitOf(p))}</small></div><span class="stt${on ? ' on' : ''}">${on ? 'Active' : 'Inactive'}</span></div>
    ${cells.length ? `<div class="pmx">${cells.map(([l, v]) => `<div>${v}<span>${esc(l)}</span></div>`).join('')}</div>` : `<p class="subtle" style="margin:0">Not in the ${esc(k ? ymLabel(k) : '')} results.</p>`}
    <p class="phint">One-to-one: ${esc(os.st === 'none' ? 'none yet' : (FORM_STATUS.find(z => z[0] === os.st) || [, ''])[1].toLowerCase())} · Click for the full profile</p>`;
}

// ---------------------------------------------------------------- exports
async function xlBook(fileName, sheets) { await save(fileName, new Blob([await xlBytes(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); }
/** the same styled workbook as bytes (for an email attachment) */
async function xlBytes(sheets) {
  const S = new Writer2.Styles();
  const hd = S.get({ font: { b: true, color: 'FFFFFFFF' }, fill: 'FF1F3864', border: 'FFFFFFFF', align: { h: 'center', wrap: true } }), ttl = S.get({ font: { sz: 16, b: true, color: 'FF000000' } }), sub = S.get({ font: { i: true, color: 'FF595959' } });
  const st = { text: S.get({ font: {}, align: { h: 'left' } }), int: S.get({ font: {}, align: { h: 'center' }, numFmt: '#,##0' }), num: S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00' }),
    pct: S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' }), pctBad: S.get({ font: { b: true, color: 'FFC00000' }, fill: 'FFFDE2E5', align: { h: 'center' }, numFmt: '0.00%' }), time: S.get({ font: {}, align: { h: 'center' }, numFmt: '[m]:ss' }) };
  const out = sheets.map(sh => {
    const W = new Writer2.Sheet(sh.name.slice(0, 31)); W.tab = 'FF1F3864';
    W.set(1, 1, sh.title, ttl); if (sh.sub) W.set(2, 1, sh.sub, sub);
    sh.cols.forEach((c, j) => { W.set(3, j + 1, c.h, hd); W.width(j + 1, c.w || (c.t === 'text' ? 18 : 11)); });
    sh.rows.forEach((row, i) => sh.cols.forEach((c, j) => {
      let v = row[j]; if (v === undefined) v = null;
      if (c.t === 'time' && typeof v === 'number') v = v / 86400;
      const s = c.t === 'pct' && typeof v === 'number' && c.bad && c.bad(v) ? st.pctBad : st[c.t] || st.text;
      W.set(4 + i, j + 1, v, typeof v === 'number' ? s : st.text);
    }));
    W.freeze = [4, sh.freezeCol || 2]; if (sh.rows.length) W.filter = `A3:${Core.colName(sh.cols.length)}${3 + sh.rows.length}`; W.titleLogo();
    return W;
  });
  return Writer2.pack(out, S, {}, { logo: await xlLogo() });
}
const stamp = k => `${monthLocked(k) ? 'Final, ' + finalBy(k) : 'Draft from the shared history'} · exported ${new Date().toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by ${whoNow() || 'the tool'}`;
const fileSafe = s => String(s).replace(/[\\/:*?"<>|]/g, '');
function agentCols(set, o = {}) {
  const C = [{ h: 'Agent (Genesys)', t: 'text', w: 30 }, { h: 'National ID', t: 'text', w: 13 }, { h: 'Brand', t: 'text', w: 11 }, { h: 'Team', t: 'text', w: 8 }, { h: 'Supervisor', t: 'text', w: 20 }, { h: 'Status', t: 'text', w: 9 },
    { h: 'Adherence', t: 'pct', bad: v => v < set.target }, { h: 'Days under target', t: 'int' }, { h: 'AHT', t: 'time' }, { h: 'Deduction (min)', t: 'int' }, { h: 'Conformance', t: 'pct' }, { h: 'Worked days', t: 'int' }, { h: 'Absent', t: 'int' }, { h: 'Tardy (min)', t: 'int' },
    { h: 'Final %', t: 'pct' }, { h: 'Earned SR', t: 'int' }, { h: 'Exceptions', t: 'int' }, { h: 'No sign-on', t: 'int' }, { h: 'Late sign-ons', t: 'int' }, { h: 'Short of shift', t: 'int' },
    { h: 'Answered', t: 'int' }, { h: 'Avg handle', t: 'time' }, { h: 'Transfer rate', t: 'pct' }, { h: 'One-to-one', t: 'text', w: 12 }, { h: 'Arranged for', t: 'text', w: 12 }, { h: 'Final form', t: 'text', w: 16 }, { h: 'Changed by the senior manager', t: 'text', w: 30 }, { h: 'Eligible', t: 'text', w: 26 }, { h: 'Signed by the agent', t: 'text', w: 14 }];
  return o.noSR ? C.filter(c => c.h !== 'Earned SR') : C;
}
function agentRow(p, r, k, o = {}) {
  const pp = effP(p._id) || p, os = oneStatus(p._id, k), x = r || {};
  const el = x._el ? (x._el.ok ? 'Yes' : `No: ${(x._el.why || []).join(', ')}`) + (x._adj && x._adj.elig != null ? ' (decided)' : '') : '';
  const row = [gname(pp) || p.name, Core.cleanId(pp.nid) || '', p.brand || '', p.team || '', spvOf(p._id).map(a => a.name).join(', '), p.status || 'Active',
    x.adh, x.adhUnder, x.aht, x.ded, x.conf, x.worked, x.absent, x.tardy == null ? null : Math.round(x.tardy), x.fin, x.earned, x.wfExc, x.wfAbs, x.wfLate, x.wfShort,
    x.ans ?? null, x.pAht ?? null, pfVal(x, 'xferR'), os.st === 'none' ? '' : (FORM_STATUS.find(z => z[0] === os.st) || [, ''])[1], os.o && os.o.plannedAt ? os.o.plannedAt : '',
    os.fin ? (Forms.OUTCOMES.find(z => z[0] === os.fin.outcome) || [, 'Saved'])[1] : '', x._adj ? `${x._adj.by || ''}${x._adj.note ? ': ' + x._adj.note : ''}` : '', el, os.o ? { signed: 'Yes', changed: 'Changed after signing', none: '' }[sigState(os.o)] : ''];
  if (o.noSR) row.splice(15, 1);   // Earned SR
  return row;
}
function adhSheet(people, k) {
  const ND = Core.daysIn(+k.slice(0, 4), +k.slice(5)), map = rowsByPid(k), set = state.settings;
  const cols = [{ h: 'Agent (Genesys)', t: 'text', w: 30 }, { h: 'Team', t: 'text', w: 12 }, ...Array.from({ length: ND }, (_, i) => ({ h: `${i + 1} ${Core.weekday(+k.slice(0, 4), +k.slice(5), i + 1).slice(0, 2)}`, t: 'pct', w: 7.5, bad: v => v < set.target })), { h: 'Avr.', t: 'pct', bad: v => v < set.target }];
  const rows = people.map(p => { const r = map.get(p._id), ad = adOf(r) || []; return [gname(effP(p._id) || p) || p.name, unitOf(p), ...Array.from({ length: ND }, (_, i) => ad[i] ?? 'NA'), r ? r.adh : null]; });
  return { name: 'Daily adherence', title: `Daily adherence - ${ymLabel(k)}`, sub: stamp(k), cols, rows };
}
async function exportWs(kind) {
  if (kind === 'agents') return exportAgents(); if (kind === 'inter') return exportInter(); if (kind === 'cycle') return exportCycle(); if (kind === 'quality') return exportQuality();
  const k = wsMonthNow(), set = state.settings; if (!k) return;
  if (kind === 'team' || kind === 'teamadh') {
    const P = wsPeople(), map = rowsByPid(k), spv = roleNow() === 'spv', who = spv ? whoNow() : state.wsSpv ? supName(state.wsSpv) || 'Team' : 'All teams';
    const sheets = kind === 'teamadh' ? [adhSheet(P, k)] : [{ name: 'Team', title: `${who} - ${ymLabel(k)}`, sub: stamp(k), cols: agentCols(set, { noSR: srHidden() }), rows: P.map(p => agentRow(p, map.get(p._id), k, { noSR: srHidden() })) }, adhSheet(P, k)];
    await xlBook(`${kind === 'teamadh' ? 'Daily adherence' : 'Team'} - ${fileSafe(who)} - ${ymLabel(k)}.xlsx`, sheets); return;
  }
  if (kind === 'results') {
    const map = rowsByPid(k), P = rosterRows().filter(p => map.get(p._id));
    const units = [...new Set(P.map(unitOf))].sort(sortUnits), S = spvList();
    const sumCols = [{ h: 'Group', t: 'text', w: 26 }, { h: 'Agents', t: 'int' }, { h: 'Adherence', t: 'pct', bad: v => v < set.target }, { h: 'Below target', t: 'int' }, { h: 'AHT', t: 'time' }, { h: 'Final %', t: 'pct' }, { h: 'Earned SR', t: 'int' }, { h: 'Deduction (min)', t: 'int' }, { h: 'Exceptions', t: 'int' }, { h: 'One-to-ones held', t: 'int' }];
    const sumRow = (g, L) => { const a = aggRows(L.map(p => map.get(p._id))); return [g, L.length, a.adh, a.below, a.aht, a.fin, a.earned, a.ded, a.exc, L.filter(p => ['held', 'closed'].includes(oneStatus(p._id, k).st)).length]; };
    const forms = state.forms.filter(f => fkey(f) === k).map(f => [f.agent.name, FORM_TITLE[f.kind], (FORM_STATUS.find(z => z[0] === (f.status || 'held')) || [, ''])[1], f.plannedAt || '', f.date || '', f.supervisor || '', f.kind === 'final' ? (Forms.OUTCOMES.find(z => z[0] === f.outcome) || [, ''])[1] : '', f.savedByName || '', f.savedAt ? fmtWhen(f.savedAt) : '']);
    await xlBook(`Results - ${ymLabel(k)}.xlsx`, [
      { name: 'Results', title: `Results - ${ymLabel(k)}`, sub: stamp(k), cols: agentCols(set), rows: P.map(p => agentRow(p, map.get(p._id), k)) },
      { name: 'By team', title: `By team - ${ymLabel(k)}`, sub: stamp(k), cols: sumCols, rows: [...units.map(u => sumRow(u, P.filter(p => unitOf(p) === u))), sumRow('All', P)], freezeCol: 1 },
      { name: 'By supervisor', title: `By supervisor - ${ymLabel(k)}`, sub: stamp(k), cols: sumCols, rows: [...S.map(a => sumRow(a.name, P.filter(p => p.spv === a.pid))), sumRow('No supervisor', P.filter(p => !p.spv || !S.some(a => a.pid === p.spv)))].filter(r => r[1]), freezeCol: 1 },
      { name: 'One-to-ones', title: `One-to-ones - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'Form', t: 'text', w: 16 }, { h: 'Status', t: 'text' }, { h: 'Arranged for', t: 'text', w: 12 }, { h: 'Date', t: 'text', w: 12 }, { h: 'Supervisor', t: 'text', w: 20 }, { h: 'Outcome', t: 'text', w: 22 }, { h: 'Saved by', t: 'text', w: 20 }, { h: 'Saved', t: 'text', w: 16 }], rows: forms },
      adhSheet(P, k)]);
    return;
  }
  if (kind === 'wfm') {
    const months = wsMonths(), M = wfmMetrics(), G = GROUPS[state.wfmGroup] || GROUPS.unit, mt = M.find(m => m.k === state.wfmMetric) || M[0];
    const groups = [...new Set(months.flatMap(x => (monthData(x) || { rows: [] }).rows.map(G[1])))].sort(state.wfmGroup === 'unit' ? sortUnits : (a, b) => a.localeCompare(b));
    const t = m => (PCTK.has(m.k) || m.pct ? 'pct' : TIMEK.has(m.k) ? 'time' : 'num');
    const rowsK = (monthData(k) || { rows: [] }).rows;
    await xlBook(`WFM analytics - ${ymLabel(k)}.xlsx`, [
      { name: 'Month by group', title: `${G[0]}s - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: G[0], t: 'text', w: 26 }, { h: 'People', t: 'int' }, ...M.map(m => ({ h: m.label, t: t(m) }))], rows: [...groups.map(g => { const L = rowsK.filter(r => G[1](r) === g); return [g, L.length, ...M.map(m => groupVal(L, m))]; }).filter(r => r[1]), ['All', rowsK.length, ...M.map(m => groupVal(rowsK, m))]], freezeCol: 1 },
      { name: 'Trend', title: `${mt.label} by month`, sub: `${G[0]}s · ${mt.total === 'sum' ? 'totals' : 'average per person'}`, cols: [{ h: G[0], t: 'text', w: 26 }, ...months.map(x => ({ h: ymLabel(x), t: t(mt) }))], rows: [...groups.map(g => [g, ...months.map(x => groupVal((monthData(x) || { rows: [] }).rows.filter(r => G[1](r) === g), mt))]), ['All', ...months.map(x => groupVal((monthData(x) || { rows: [] }).rows, mt))]], freezeCol: 1 },
      { name: 'Agents', title: `Agents - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'ID', t: 'text', w: 13 }, { h: G[0], t: 'text', w: 20 }, ...M.map(m => ({ h: m.label, t: t(m) }))], rows: rowsK.map(r => [r.n, r.id || '', G[1](r), ...M.map(m => History.valOf(r, m))]) },
      { name: 'Coverage', title: 'Where each month comes from', sub: `Exported ${new Date().toLocaleString()}`, cols: [{ h: 'Month', t: 'text', w: 12 }, { h: 'Source', t: 'text', w: 40 }, { h: 'People', t: 'int' }, { h: 'Status', t: 'text', w: 30 }], rows: months.map(x => { const H = state.history[x]; return [ymLabel(x), H ? (H.auto ? 'Built in the tool' : H.src || '') + (H.gsrc && H.gsrc.length ? ' + Genesys: ' + H.gsrc.join(', ') : '') : 'Final only', ((monthData(x) || { rows: [] }).rows).length, monthLocked(x) ? 'Final, ' + finalBy(x) : 'Draft']; }), freezeCol: 1 }]);
  }
}
async function exportDailyAdhHist(pid) {
  const k = wsMonthNow(), p = state.roster.find(x => x._id === pid); if (!k || !p) return;
  const sh = adhSheet([p], k); sh.title = `Daily adherence - ${gname(effP(pid) || p) || p.name} - ${ymLabel(k)}`;
  await xlBook(`Daily adherence - ${fileSafe(gname(effP(pid) || p) || p.name)} - ${ymLabel(k)}.xlsx`, [sh]);
}

// ---------------------------------------------------------------- events
$('autoNote').addEventListener('click', e => { if (e.target.closest('[data-autoreplace]')) { autoSig = ''; autoSaveMonth(true); if (!state.autoNote) toast(`${ymLabel(ymKey(state.y, state.m))} in the history now comes from this page, and is saved as you work`); } });
$('wsSeg').addEventListener('click', e => { const b = e.target.closest('button[data-ws]'); if (b) setWs(b.dataset.ws); });
let wsNarrow = innerWidth < 640;   // the charts are drawn for the width: redraw when a phone turns or a window crosses the line
window.addEventListener('resize', () => { const n = innerWidth < 640; if (n !== wsNarrow) { wsNarrow = n; if (state.ws !== 'build' && state.ws !== 'wait') renderWs(); } });
for (const id of ['teamBar', 'resultsBar', 'wfmBar', 'cycleBar']) $(id).addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-wsmonth]')) { state.wsMonth = t.value; renderWs(); }
  if (t.matches('[data-wsspv]')) { state.wsSpv = t.value; renderWs(); }
  if (t.matches('[data-wfmm]')) { state.wfmMetric = t.value; renderWs(); }
  if (t.matches('[data-wfmg]')) { state.wfmGroup = t.value; renderWs(); }
});
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest || state.ws === 'build') return;
  if (!t.closest('#v-team, #v-results, #v-wfm, #v-cycle')) return;
  const x = t.closest('[data-x]'); if (x) { exportWs(x.dataset.x); return; }
  const ar = t.closest('[data-arrange]'); if (ar) { const d = document.querySelector(`[data-arrdate="${CSS.escape(ar.dataset.arrange)}"]`); arrangeOneToOne(ar.dataset.arrange, wsMonthNow(), d && d.value ? d.value : todayIso()); return; }
  const of = t.closest('[data-openf]'); if (of) { openSavedForm(formLookup(of.dataset.openf)); return; }
  const pf = t.closest('[data-pdff]'); if (pf) { const f = formLookup(pf.dataset.pdff); if (f) downloadForm(f); return; }
  const mo = t.closest('[data-more]'); if (mo) { state.boardAll[mo.dataset.more] = !state.boardAll[mo.dataset.more]; renderWs(); const b = document.querySelector(`[data-more="${mo.dataset.more}"]`); if (b) b.focus(); return; }
  const tm = t.closest('[data-teamm]'); if (tm) { state.teamMetric = tm.dataset.teamm; renderWs(); return; }
  const wm = t.closest('[data-wfmm]'); if (wm && wm.tagName === 'BUTTON') { state.wfmMetric = wm.dataset.wfmm; renderWs(); return; }
  const hm = t.closest('[data-hm]'); if (hm) { state.wsMonth = hm.dataset.hm; renderWs(); return; }
  const rs = t.closest('[data-ressort]'); if (rs) { const c = rs.dataset.ressort; if (state.resSort === c) state.resDir = state.resDir === 'asc' ? 'desc' : 'asc'; else { state.resSort = c; state.resDir = ['name', 'unit', 'spv'].includes(c) ? 'asc' : 'desc'; } renderWs(); const b = $('resultsBody').querySelector(`[data-ressort="${c}"]`); if (b) b.focus(); return; }
  const fz = t.closest('[data-finalize]'); if (fz) { askFinalize(wsMonthNow(), fz); return; }
  const ro = t.closest('[data-reopen]'); if (ro) { if (!ro.dataset.confirm) { ro.dataset.confirm = '1'; ro.textContent = 'Click again to reopen'; setTimeout(() => { if (ro.isConnected) { delete ro.dataset.confirm; ro.textContent = `Reopen ${ymLabel(wsMonthNow())}`; } }, 4000); return; } reopenMonth(wsMonthNow()); return; }
  const op = t.closest('[data-open]'); if (op) { openPerson(op.dataset.open); }
});
$('resultsBody').addEventListener('input', e => { if (e.target.matches('[data-resq]')) { state.resQ = e.target.value; renderWs(); } });
$('resultsBody').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-resunit]')) { state.resUnit = t.value; renderWs(); }
  if (t.matches('[data-resspv]')) { state.resSpv = t.value; renderWs(); }
  if (t.matches('[data-adj]')) adjustResult(wsMonthNow(), t.dataset.adj, t.dataset.f, t.value);
  if (t.matches('[data-elig]')) adjustResult(wsMonthNow(), t.dataset.elig, 'elig', t.value);
});
$('personBody').addEventListener('click', e => { if (e.target.closest('[data-adhexporth]')) exportDailyAdhHist(state.personId); });
