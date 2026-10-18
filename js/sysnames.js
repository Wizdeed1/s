// ================================================================ NAMES: system names from the exports, people entered twice, names as the system names
// Each roster person is found in the Genesys exports by one name: the system name, or the roster name when it is empty. This part
// offers the Genesys names that match nobody yet (Match system names: the clear ones ticked, the rest to choose), lists the names on
// the System name box with the likely ones first, finds people entered twice (one Genesys name, one National ID, or two spellings of
// one name) and combines them into one person, and gives people their Genesys name as their name when asked. The other spellings stay
// on the person (aka), so files that still write them (the Final EVAL, the KPI file, the supervisors' sheets, the IDs file) keep
// matching. Every change has one Undo; "Not this person" and "These are different people" are remembered (config/nameLinks).
Object.assign(state, { nameMemo: { no: {}, distinct: new Set() }, memoVer: 0, sysUndo: null, sysLinks: [], matchRows: null, matchF: '', matchScope: null, matchAsName: true, matchPick: new Map(),
  dups: [], dupIds: new Set(), dupKeep: new Map(), dupReview: false, dupSkip: new Set() });
RF.dup = p => state.dupIds.has(p._id); RF_LABEL.dup = 'Duplicates';
const WH = { adh: 'Adh', aht: 'AHT', sch: 'Sch', tl: 'TL', perf: 'Perf' };
const WH_LONG = { adh: 'Adherence', aht: 'AHT', sch: 'Schedule', tl: 'Status timeline', perf: 'Performance' };
const CONF = { id: ['ID', 'good', 'Same National ID'], sure: ['Sure', 'good', 'Sure'], likely: ['Likely', 'info', 'Likely'], possible: ['Possible', 'warn', 'Possible'], none: ['No match', '', 'No match'] };

// ---------------------------------------------------------------- small helpers
/** the other spellings kept on a person (aka: the names they had before, the spellings of a record combined into theirs) */
const akaOf = p => (p && Array.isArray(p.aka) ? p.aka.filter(x => typeof x === 'string' && normSpace(x)) : []);
/** every way the roster writes a person: the name, the system name, the other spellings */
const pNames = p => [...new Set([p && p.name, p && p.sys, ...akaOf(p)].map(normSpace).filter(Boolean))];
/** a list of other spellings with some added: never the name itself, never twice */
function akaWith(list, add, name) { const out = [], seen = new Set([normName(name)]); for (const n of [...(list || []), ...add]) { const v = normSpace(n), k = normName(v); if (k && !seen.has(k)) { seen.add(k); out.push(v); } } return out; }
/** the real words of a name (two letters or more): "Lina S." has one, "Lina Saleh" two */
const words2 = n => normName(n).replace(/[^a-z؀-ۿ\s]/g, ' ').split(' ').filter(t => t.length > 1);
const vidOf = p => { const id = Core.cleanId(((p && effP(p._id)) || p || {}).nid); return id.length >= 8 ? id : ''; };
const nameOfPid = pid => { const p = state.roster.find(x => x._id === pid); return p ? normSpace(p.name) || gname(p) || 'a new person' : 'someone'; };
const pairKey = (a, b) => [a, b].sort().join('|');
const foundIn = pid => { const m = state.byId.get(pid); return !!(m && m.any); };
function levN(a, b, max) { if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1; let p = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { const c = [i]; let lo = i; for (let j = 1; j <= b.length; j++) { c.push(Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))); lo = Math.min(lo, c[j]); } if (lo > max) return max + 1; p = c; } return p[b.length]; }
/** how alike two written names are, the way NameLink sees them (first name, family name by sound), both ways round */
function nlScore(a, b) {
  const one = (x, y) => { try { const r = NameLink.link([{ name: x, kind: 'agent' }], [{ id: 'y', name: y, names: [y] }], {}, {}); return r[0] && r[0].alts[0] ? r[0].alts[0].score : 0; } catch (e) { return 0; } };
  return Math.max(one(a, b), one(b, a));
}

// ---------------------------------------------------------------- the answers kept: "not this person" per export name, "different people" per pair
function loadNameMemo(d) {
  d = d || {}; const no = {};
  if (d.no && typeof d.no === 'object') for (const [k, v] of Object.entries(d.no)) if (Array.isArray(v)) { const L = v.filter(x => typeof x === 'string'); if (L.length) no[k] = L; }
  state.nameMemo = { no, distinct: new Set(Array.isArray(d.distinct) ? d.distinct.filter(x => typeof x === 'string') : []) }; state.memoVer++;
}
function persistNameMemo() {
  state.memoVer++;
  if (!state.db) return;
  const body = { no: state.nameMemo.no, distinct: [...state.nameMemo.distinct], at: new Date().toISOString(), by: whoNow() };
  queueWrite('config/nameLinks', () => state.db.doc('config/nameLinks').set(body));
}
const notThis = (name, pid) => (state.nameMemo.no[qKey(name)] || []).includes(pid);
function sayNo(name, pid) { const k = qKey(name); state.nameMemo.no[k] = [...new Set([...(state.nameMemo.no[k] || []), pid])]; persistNameMemo(); }
function unsayNo(name, pid) { const k = qKey(name), L = (state.nameMemo.no[k] || []).filter(x => x !== pid); if (L.length) state.nameMemo.no[k] = L; else delete state.nameMemo.no[k]; persistNameMemo(); }

// ---------------------------------------------------------------- the Genesys names of this month, and the ones earlier incentive files wrote next to a National ID
let gnMemo = null;
/** normName -> { name, key, where: Set('adh'|'aht'|'sch'|'tl'|'perf'), pids: the roster people it matches } */
function genesysNames() {
  if (gnMemo && gnMemo.m === state.model && gnMemo.c === state.ctx && gnMemo.pf === state.perf) return gnMemo.map;
  const map = new Map(), c = state.ctx;
  const add = (n, w) => { const nm = normSpace(String(n == null ? '' : n).replace(/\s*\((inactive|deleted)\)\s*$/i, '')), k = normName(nm); if (!k) return; let e = map.get(k); if (!e) map.set(k, e = { name: nm, key: k, where: new Set(), pids: [] }); e.where.add(w); };
  if (c) { c.rawAdh.forEach(x => add(x.name, 'adh')); c.rawAht.forEach(x => { if (x.sec != null) add(x.name, 'aht'); }); c.rawSched.forEach(x => add(x.name, 'sch')); }
  if (c) (state.slots.timeline ? state.slots.timeline.dets : []).forEach(d => (d.data.agents || []).forEach(n => add(n, 'tl')));
  if (c && state.perf && state.perf.src !== 'the history') state.perf.rows.forEach(r => add(r.name, 'perf'));
  for (const m of state.model || []) { const e = map.get(m.ek); if (e) e.pids.push(m.p._id); }
  gnMemo = { m: state.model, c, pf: state.perf, map }; return map;
}
let regMemo = null;
/** National ID -> { gn: the Genesys name an incentive file wrote next to it, k: that month } (the newest month wins; rows carry gn when a file had both spellings) */
function idRegistry() {
  if (regMemo && regMemo.h === state.history && regMemo.v === state.histVer) return regMemo.map;
  const map = new Map();
  for (const k of Object.keys(state.history || {}).sort()) for (const r of (state.history[k] || {}).rows || []) { const id = Core.cleanId(r.id), g = normSpace(r.gn); if (id && g) map.set(id, { gn: g, k }); }
  regMemo = { h: state.history, v: state.histVer, map }; return map;
}
const whereChips = (where, all) => `<span class="mb">${(all ? ['adh', 'aht', 'sch', 'tl', 'perf'] : [...where]).filter(w => all ? (w !== 'perf' || where.has('perf')) : true).map(w => `<span class="${where.has(w) ? 'on' : ''}" title="${where.has(w) ? 'In' : 'Not in'} the ${esc(WH_LONG[w])} export">${WH[w]}</span>`).join('')}</span>`;

// ---------------------------------------------------------------- (a) Match system names: one row per Genesys name nobody matches
let propMemo = null;
/** -> { rows: [{ key, name, where, pid, conf, score, why, alts, conflict, cmsg, tick }], free: [{ p, best }], stale: [{ p, best }], noCtx } */
function sysPropose(scope) {
  const sc0 = scope ? [...scope].sort().join(',') : '';
  const sig = `${state.memoVer}|${state.histVer}|${state.roster.length}|${sc0}|${(state.settings.noAutoLink || []).length}`;
  if (propMemo && propMemo.m === state.model && propMemo.c === state.ctx && propMemo.sig === sig && propMemo.h === state.history) return propMemo.out;
  const R = rosterRows(), reg = idRegistry(), rows = [], done = new Set(), inScope = pid => !scope || scope.includes(pid);
  const row = (e, o) => { const r = { key: e.key, name: e.name, where: e.where, pid: '', conf: 'none', score: 0, why: '', alts: [], conflict: '', cmsg: '', ...o }; rows.push(r); done.add(e.key); return r; };
  const regOf = p => { const id = Core.cleanId((effP(p._id) || p).nid), g = id && reg.get(id); return g || null; };
  if (!state.ctx) {   // no exports yet: only what earlier incentive files say, by National ID
    for (const p of R) { const g = regOf(p); if (!g || normName(g.gn) === normName(gname(p)) || notThis(g.gn, p._id) || !inScope(p._id)) continue; rows.push({ key: normName(g.gn), name: g.gn, where: new Set(), pid: p._id, conf: 'id', score: 1.02, why: `same National ID in the ${ymLabel(g.k)} incentive file`, alts: [], conflict: '', cmsg: '', tick: true }); }
    const out = { rows, free: [], stale: [], noCtx: true }; propMemo = { m: state.model, c: state.ctx, h: state.history, sig, out }; return out;
  }
  const G = genesysNames(), U = [...G.values()].filter(e => !e.pids.length).sort((a, b) => a.name.localeCompare(b.name));
  const freeM = (state.model || []).filter(m => !m.any && normSpace(m.p.name)), sc = (n, p) => Math.max(0, ...pNames(p).map(x => Core.nameScore(n, x)));
  // 1. an earlier incentive file wrote this Genesys name next to the person's National ID
  const byReg = new Map(); for (const p of R) { const g = regOf(p); if (!g) continue; const k = normName(g.gn); if (!byReg.has(k)) byReg.set(k, []); byReg.get(k).push({ p, k: g.k }); }
  for (const e of U) { const L = (byReg.get(e.key) || []).filter(x => !notThis(e.name, x.p._id)); if (L.length === 1) row(e, { pid: L[0].p._id, conf: 'id', score: 1.02, why: `same National ID in the ${ymLabel(L[0].k)} incentive file` }); }
  // 2. the name is someone's roster name, while their system name says another name: probably theirs
  const own = new Map(); for (const p of R) if (normSpace(p.sys) && normName(p.sys) !== normName(p.name)) own.set(normName(p.name), p);
  for (const e of U) { const q = own.get(e.key); if (!q || done.has(e.key) || notThis(e.name, q._id)) continue; row(e, { pid: q._id, conf: 'likely', score: 1, why: `${q.name}'s roster name`, conflict: 'alias', cmsg: `This is ${q.name}'s roster name, but their system name is "${q.sys}". Probably ${q.name}'s.` }); }
  // 3. a clear spelling, as the automatic link does: one person fits, nobody else almost as well
  for (const e of U) {
    if (done.has(e.key)) continue;
    let best = null, bs = 0, second = 0;
    for (const m of freeM) { if (notThis(e.name, m.p._id)) continue; const s = sc(e.name, m.p); if (s > bs) { second = bs; bs = s; best = m.p; } else if (s > second) second = s; }
    if (best && bs >= 0.86 && bs - second >= 0.1) { const two = words2(e.name).length >= 2 && pNames(best).some(x => words2(x).length >= 2 && Core.nameScore(e.name, x) === 1); row(e, { pid: best._id, conf: bs === 1 && two ? 'sure' : 'likely', score: bs, why: bs === 1 ? 'first and family name match' : 'close spelling' }); }
  }
  // 4. the rest: the EVAL's matching (first name, family name by how it sounds, the names earlier files used for the ID)
  const rest = U.filter(e => !done.has(e.key));
  if (rest.length) {
    const free = new Set(freeM.map(m => m.p._id)); let res = [];
    try { res = NameLink.link(rest.map(e => ({ name: e.name, kind: 'agent' })), linkPeople().filter(q => free.has(q.id)), {}, state.nameMemo.no); } catch (err) { res = []; }
    rest.forEach((e, i) => {
      const r = res[i] || { alts: [] }, alts = (r.alts || []).map(a => ({ pid: a.id, score: a.score, why: a.why }));
      if (r.id && r.auto) row(e, { pid: r.id, conf: r.sure ? 'sure' : 'likely', score: r.score, why: r.why, alts: alts.filter(a => a.pid !== r.id) });
      else if (alts[0] && alts[0].score >= 0.6) row(e, { pid: alts[0].pid, conf: 'possible', score: alts[0].score, why: alts[0].why, alts: alts.slice(1), ...(alts[1] && alts[1].score >= alts[0].score - 0.04 ? { conflict: 'tie', cmsg: `${nameOfPid(alts[1].pid)} fits almost as well. Choose the right person.` } : {}) });
      else row(e, { alts });
    });
  }
  // two names for one person: neither is ticked
  const per = new Map(); rows.forEach(r => { if (r.pid) per.set(r.pid, (per.get(r.pid) || 0) + 1); });
  rows.forEach(r => { if (r.pid && per.get(r.pid) > 1 && !r.conflict) { r.conflict = 'two'; r.cmsg = `Another Genesys name points to ${nameOfPid(r.pid)} too. A person has one system name: choose which.`; } });
  rows.forEach(r => { r.tick = ['id', 'sure', 'likely'].includes(r.conf) && !r.conflict; });
  const L = rows.filter(r => !scope || (r.pid && scope.includes(r.pid)) || r.alts.some(a => scope.includes(a.pid))).sort((a, b) => (b.tick - a.tick) || a.name.localeCompare(b.name));
  const proposed = new Set(rows.map(r => r.pid).filter(Boolean)), bestFor = p => { let b = null, bs = 0; for (const e of U) { const s = sc(e.name, p); if (s > bs) { bs = s; b = e; } } return bs >= 0.6 ? { name: b.name, score: bs } : null; };
  const left = R.filter(p => !foundIn(p._id) && !proposed.has(p._id) && inScope(p._id));
  const out = { rows: L, free: left.filter(p => !normSpace(p.sys)).map(p => ({ p, best: bestFor(p) })), stale: left.filter(p => normSpace(p.sys)).map(p => ({ p, best: bestFor(p) })), noCtx: false };
  propMemo = { m: state.model, c: state.ctx, h: state.history, sig, out };
  return out;
}
const readyRows = () => (isBuilder() && (state.ctx || Object.keys(state.history || {}).length) ? sysPropose(null).rows.filter(r => r.tick) : []);
function renderMatchBadge() {
  const b = $('bMatch'); if (!b) return;
  const n = readyRows().length; b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', `${plural(n, 'name')} ready`);
  const s = $('bSysName'); if (s) { const k = sysNameCands().length; s.hidden = !k; s.textContent = k; $('sysAsName').hidden = !k; }
}
function openMatch(scope, opener) {
  if (!isBuilder()) { toast('Only the WFM team changes the roster.'); return; }
  commitActive();
  state.matchScope = scope && scope.length ? scope : null; state.matchF = ''; state.matchPick = new Map();
  state.matchRows = sysPropose(state.matchScope);
  for (const r of state.matchRows.rows) state.matchPick.set(r.key, { on: r.tick, pid: r.pid });
  renderMatch(); openDrawer('dMatch');
}
function matchRecompute() {
  state.matchRows = sysPropose(state.matchScope);
  for (const r of state.matchRows.rows) { const k = state.matchPick.get(r.key); if (!k || (k.pid && !state.roster.some(p => p._id === k.pid))) state.matchPick.set(r.key, { on: r.tick, pid: r.pid }); }
  renderMatch();
}
let optMemo = null;
/** everyone on the roster as <option>s: the people no export found first, then the ones already matched */
function peopleOptions() {
  if (optMemo && optMemo.v === state.ver && optMemo.n === state.roster.length) return optMemo.html;
  const R = rosterRows().slice().sort((a, b) => a.name.localeCompare(b.name)), o = L => L.map(p => `<option value="${esc(p._id)}">${esc(p.name)}</option>`).join('');
  const free = R.filter(p => !foundIn(p._id)), taken = R.filter(p => foundIn(p._id));
  const html = `${free.length ? `<optgroup label="Not found in any export">${o(free)}</optgroup>` : ''}${taken.length ? `<optgroup label="Already matched (their own Genesys name would stop matching)">${o(taken)}</optgroup>` : ''}`;
  optMemo = { v: state.ver, n: state.roster.length, html }; return html;
}
function takenMsg(pid) {
  const m = state.byId.get(pid); if (!m || !m.any) return '';
  const w = Object.entries(m.found).filter(([, v]) => v).map(([k]) => WH[k]).join(', ');
  return `${nameOfPid(pid)} is already matched as "${m.exp}" (${w}); this would stop matching it.`;
}
function renderMatch() {
  const S = state.matchRows; if (!S) return;
  const rows = S.rows, pick = r => state.matchPick.get(r.key) || { on: false, pid: '' };
  const ready = rows.filter(r => r.tick), conf = rows.filter(r => r.conflict), chk = rows.filter(r => !r.tick && !r.conflict && r.pid), none = rows.filter(r => !r.pid);
  const F = state.matchF, L = F === 'ready' ? ready : F === 'check' ? chk : F === 'conflict' ? conf : F === 'none' ? none : rows;
  const sel = rows.filter(r => pick(r).on && pick(r).pid).length;
  $('matchSub').textContent = S.noCtx ? 'No exports yet: these come from the National IDs in earlier incentive files.' : rows.length ? `${plural(rows.length, 'name')} in this month's exports ${rows.length === 1 ? 'matches' : 'match'} nobody on the roster${state.matchScope ? ` (for the ${plural(state.matchScope.length, 'person', 'people')} you selected)` : ''}.` : 'Every name in the exports matches someone on the roster.';
  const seg = rows.length ? `<div class="seg" id="matchSeg" role="group" aria-label="Show">${[['', 'All', rows.length], ['ready', 'Ready', ready.length], ['check', 'Check', chk.length], ['conflict', 'Conflicts', conf.length], ['none', 'No match', none.length]].map(([f, l, n]) => `<button data-mf="${f}" aria-pressed="${F === f}">${l} <span class="cnt">${n}</span></button>`).join('')}</div>` : '';
  const opt = r => { const p = pick(r), sugg = [r.pid, ...r.alts.map(a => a.pid)].filter((x, i, a) => x && a.indexOf(x) === i); return `<option value="">Nobody: leave it unmatched</option>${sugg.length ? `<optgroup label="Suggested">${sugg.map(id => `<option value="${esc(id)}"${id === p.pid ? ' selected' : ''}>${esc(nameOfPid(id))}</option>`).join('')}</optgroup>` : ''}${peopleOptions().replace(`value="${esc(p.pid)}"`, sugg.includes(p.pid) ? `value="${esc(p.pid)}"` : `value="${esc(p.pid)}" selected`)}`; };
  const item = r => {
    const p = pick(r), [cl, cc] = CONF[r.conf] || CONF.none, tk = p.pid && p.pid !== r.pid ? takenMsg(p.pid) : r.pid && foundIn(r.pid) ? takenMsg(r.pid) : '';
    const why = p.pid && p.pid !== r.pid ? 'chosen by you' : r.why;
    return `<li class="mrow${r.conflict ? ' cf' : ''}${p.on ? ' on' : ''}" data-mk="${esc(r.key)}">
      <input type="checkbox" data-mon${p.on ? ' checked' : ''}${p.pid ? '' : ' disabled'} aria-label="Save ${esc(r.name)} as the system name">
      <span class="mname"><b dir="auto">${esc(r.name)}</b>${whereChips(r.where)}</span>
      <svg class="marr" aria-hidden="true"><use href="#i-chevr"/></svg>
      <select class="cell" data-mpid aria-label="Who ${esc(r.name)} is on the roster">${opt(r)}</select>
      <span class="mconf"><span class="pill ${cc}">${esc(p.pid && p.pid !== r.pid ? 'Your pick' : cl)}</span><span class="mwhy">${esc(why || (r.pid ? '' : 'Nobody on the roster is close'))}</span></span>
      <span class="macts">${p.pid ? `<button class="btn sm ghost" data-mno title="Never offer ${esc(nameOfPid(p.pid))} for this name again">Not this person</button>` : ''}<button class="btn sm ghost" data-madd>Add as new person</button></span>
      ${r.cmsg || tk ? `<p class="mcf">${esc([r.cmsg, tk].filter(Boolean).join(' '))}</p>` : ''}</li>`;
  };
  const freeItem = (x, kind) => `<li class="mfree" data-fid="${esc(x.p._id)}"><span class="mname"><b dir="auto">${esc(x.p.name)}</b><small>${esc(unitOf(x.p))}${kind === 'stale' ? ` · system name "${esc(x.p.sys)}" is not in the exports` : ''}</small></span>
    <input class="cell" data-fsys list="sysNames" autocomplete="off" dir="auto" value="${esc(x.best ? x.best.name : '')}" placeholder="Genesys name" aria-label="Genesys name of ${esc(x.p.name)}"><button class="btn sm" data-fuse>Use</button></li>`;
  const sec = (title, list, kind, hint) => list.length ? `<section class="sec msec"><h3>${esc(title)} <span class="badge">${list.length}</span></h3><p class="hint">${esc(hint)}</p><ul class="mlist">${list.map(x => freeItem(x, kind)).join('')}</ul></section>` : '';
  $('matchBody').innerHTML = `${rows.length ? `<div class="mtop"><label class="check"><input type="checkbox" id="matchAsName"${state.matchAsName ? ' checked' : ''}> Use the Genesys name as the name</label><span class="hint">${state.matchAsName ? 'The roster name is kept as another spelling, so files that still write it keep matching.' : 'Only the system name is saved; the name stays as it is.'}</span></div>${seg}` : ''}
    ${rows.length ? (L.length ? `<ul class="mlist" aria-label="Genesys names">${L.map(item).join('')}</ul>` : '<p class="subtle">Nothing in this group.</p>') : emptyCard(S.noCtx ? 'Nothing to match yet' : 'Every name matches', S.noCtx ? 'Drop this month\'s Genesys exports on Import to match against them.' : 'Nobody in the exports is missing from the roster.')}
    ${sec('Roster people not found in any export', S.free, 'free', 'Type or pick their Genesys name, then Use. The list puts the likely names first.')}
    ${sec('System names not in this month\'s exports', S.stale, 'stale', 'Their system name matches nobody this month: a typo, or they changed their name in Genesys.')}`;
  $('matchReady').textContent = `Apply all ready (${ready.length})`; $('matchReady').disabled = !ready.length;
  $('matchGo').textContent = `Apply selected (${sel})`; $('matchGo').disabled = !sel;
}
/** save the chosen Genesys names as system names (and as the names, when the switch is on); one Undo for all */
function applySysMatches(list, asName = state.matchAsName, o = {}) {
  if (!isBuilder()) return 0;
  const batch = [];
  for (const r of list) {
    const p = state.roster.find(x => x._id === r.pid); if (!p || !normSpace(r.name)) continue;
    const b = { pid: p._id, name: normSpace(r.name), key: normName(r.name), roster: p.name, prev: { sys: p.sys || '', name: p.name, aka: akaOf(p) }, renamed: false };
    const patch = { sys: b.name };
    if (asName && normName(p.name) !== b.key) { patch.name = b.name; patch.aka = akaWith(p.aka, [p.name, p.sys], b.name); b.renamed = true; }
    updatePerson(p._id, patch, { quiet: true }); state.autoTried.add(b.key); batch.push(b);
  }
  if (!batch.length) return 0;
  state.sysUndo = batch; state.sysLinks.push(...batch);
  if (openId === 'dMatch' && !o.keepOpen) closeDrawer();
  refresh({ noAuto: true, table: true });
  if (o.keepOpen && openId === 'dMatch') matchRecompute();
  const rn = batch.filter(b => b.renamed).length;
  toast(`${plural(batch.length, 'system name')} saved${rn ? `; ${plural(rn, 'person', 'people')} now go by the Genesys name` : ''}`, { label: 'Undo', fn: () => undoSysMatches(batch) });
  return batch.length;
}
function undoSysMatches(batch, one) {
  let n = 0;
  for (const b of batch) {
    const p = state.roster.find(x => x._id === b.pid); if (!p || normName(p.sys) !== b.key) continue;   // changed since: left as it is
    const patch = { sys: b.prev.sys };
    if (b.renamed && normName(p.name) === b.key) { patch.name = b.prev.name; patch.aka = b.prev.aka; }
    updatePerson(p._id, patch, { quiet: true }); state.autoTried.add(b.key); n++;
  }
  const keys = batch.map(b => b.key); state.settings.noAutoLink = [...new Set([...(state.settings.noAutoLink || []), ...keys])]; persistSettings();   // and not linked again by the tool
  state.sysLinks = state.sysLinks.filter(x => !batch.includes(x)); if (state.sysUndo === batch) state.sysUndo = null;
  refresh({ noAuto: true, table: true });
  if (one && batch[0]) toast(`${batch[0].roster} keeps ${batch[0].prev.sys ? `"${batch[0].prev.sys}"` : 'their roster name'} as the system name`);
  return n;
}
function undoSysLink(pid) { const b = [...state.sysLinks].reverse().find(x => x.pid === pid); if (b) undoSysMatches([b], true); }
function sysLinkNotes(add) {
  for (const b of state.sysLinks) {
    const p = state.roster.find(x => x._id === b.pid); if (!p || normName(p.sys) !== b.key) continue;
    add({ id: 'slink:' + b.pid, sev: 'done', group: 'Genesys', title: `${b.roster} is "${b.name}" in Genesys`, body: b.renamed ? 'Saved by you from Match system names; the Genesys name is now the name too.' : 'Saved by you from Match system names.', unlink: b.pid });
  }
}
$('matchSys').addEventListener('click', e => openMatch(null, e.currentTarget));
$('matchBody').addEventListener('click', e => {
  const f = e.target.closest('[data-mf]'); if (f) { state.matchF = f.dataset.mf; renderMatch(); const b = $('matchBody').querySelector(`[data-mf="${f.dataset.mf}"]`); if (b) b.focus(); return; }
  const li = e.target.closest('li[data-mk]'), S = state.matchRows;
  if (li && S) {
    const r = S.rows.find(x => x.key === li.dataset.mk); if (!r) return; const pk = state.matchPick.get(r.key) || { on: false, pid: r.pid };
    if (e.target.closest('[data-mno]') && pk.pid) {
      const pid = pk.pid; sayNo(r.name, pid); state.matchPick.delete(r.key); matchRecompute();
      toast(`${nameOfPid(pid)} is never offered for "${r.name}" again`, { label: 'Undo', fn: () => { unsayNo(r.name, pid); state.matchPick.delete(r.key); if (openId === 'dMatch') matchRecompute(); } }); return;
    }
    if (e.target.closest('[data-madd]')) {
      const id = addPerson({ name: r.name }, { quiet: true }); refresh({ noAuto: true }); matchRecompute();
      toast(`Added ${r.name}. Set the brand, team and ID in People.`, { label: 'Undo', fn: () => { removePeople([id]); if (openId === 'dMatch') matchRecompute(); } }); return;
    }
  }
  const fu = e.target.closest('[data-fuse]');
  if (fu) {
    const row = fu.closest('[data-fid]'), p = row && state.roster.find(x => x._id === row.dataset.fid), v = normSpace(row && row.querySelector('[data-fsys]').value);
    if (!p || !v) { toast('Type or pick the Genesys name first.'); return; }
    applySysMatches([{ pid: p._id, name: v }], state.matchAsName, { keepOpen: true }); return;
  }
});
$('matchBody').addEventListener('change', e => {
  if (e.target.id === 'matchAsName') { state.matchAsName = e.target.checked; renderMatch(); const s = $('matchAsName'); if (s) s.focus(); return; }
  const li = e.target.closest('li[data-mk]'); if (!li) return;
  const k = li.dataset.mk, pk = state.matchPick.get(k) || { on: false, pid: '' };
  if (e.target.matches('[data-mon]')) { pk.on = e.target.checked; state.matchPick.set(k, pk); }
  if (e.target.matches('[data-mpid]')) { pk.pid = e.target.value; pk.on = !!pk.pid; state.matchPick.set(k, pk); }
  renderMatch(); const el = $('matchBody').querySelector(`li[data-mk="${CSS.escape(k)}"] ${e.target.matches('[data-mon]') ? '[data-mon]' : '[data-mpid]'}`); if (el) el.focus();
});
$('matchGo').addEventListener('click', () => { const S = state.matchRows; if (!S) return; applySysMatches(S.rows.map(r => ({ r, k: state.matchPick.get(r.key) })).filter(x => x.k && x.k.on && x.k.pid).map(x => ({ pid: x.k.pid, name: x.r.name }))); });
$('matchReady').addEventListener('click', () => { const S = state.matchRows; if (!S) return; applySysMatches(S.rows.filter(r => r.tick).map(r => ({ pid: (state.matchPick.get(r.key) || {}).pid || r.pid, name: r.name }))); });

// ---------------------------------------------------------------- (b) the System name box: the likely Genesys names first
function fillSysList(p) {
  const dl = $('sysNames'); if (!dl || !p) return;
  const sig = `${p._id}|${state.ver}|${state.histVer}|${p.name}|${p.sys || ''}`; if (dl.dataset.for === sig) return;
  const G = genesysNames(), reg = idRegistry(), id = Core.cleanId((effP(p._id) || p).nid), rg = id && reg.get(id), forms = pNames(p);
  const wh = e => [...e.where].map(w => WH[w]).join(' '), opts = [], seen = new Set();
  const add = (v, label) => { const k = normName(v); if (!k || seen.has(k)) return; seen.add(k); opts.push(`<option value="${esc(v)}" label="${esc(label)}"></option>`); };
  if (rg) add(rg.gn, `Same National ID · ${ymLabel(rg.k)}`);
  const un = [...G.values()].filter(e => !e.pids.length), sc = un.map(e => ({ e, s: Math.max(0, ...forms.map(f => Core.nameScore(e.name, f))) }));
  sc.filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name)).forEach(x => add(x.e.name, `${x.s >= 0.86 ? 'Likely' : 'Possible'} · ${wh(x.e)}`));
  sc.filter(x => x.s < 0.6).sort((a, b) => a.e.name.localeCompare(b.e.name)).forEach(x => add(x.e.name, `Not on the roster · ${wh(x.e)}`));
  [...G.values()].filter(e => e.pids.length).sort((a, b) => a.name.localeCompare(b.name)).forEach(e => add(e.name, e.pids.includes(p._id) ? 'Matched to this person now' : `Matched to ${e.pids.map(nameOfPid).join(', ')}`));
  dl.innerHTML = opts.join(''); dl.dataset.for = sig;
}
/** after the System name box changes: what it does now, with Undo */
function afterSysEdit(p, prev, v) {
  if (normSpace(prev)) state.autoTried.add(normName(prev));
  const e = v ? genesysNames().get(normName(v)) : null, others = e ? e.pids.filter(id => id !== p._id) : [];
  const msg = !normSpace(v) ? 'Saved. No system name: the roster name is matched.' : !state.ctx ? `Saved. Genesys name: ${v}` : !e ? `Saved. "${v}" is not in this month's exports, so nothing matches it yet.`
    : others.length ? `Saved. "${v}" is also ${nameOfPid(others[0])}'s Genesys name: both now get the same numbers. See People › Duplicates.` : `Saved. Genesys name: ${v}`;
  toast(msg, { label: 'Undo', fn: () => updatePerson(p._id, { sys: prev || '' }) });
}
const sysFor = el => { const d = el.closest('#personBody') ? null : el.closest('[data-id]') || el.closest('[data-fid]'), id = d ? d.dataset.id || d.dataset.fid : el.closest('#personBody') ? state.personId : ''; return state.roster.find(x => x._id === id) || null; };
['roster', 'personBody', 'dupPanel', 'matchBody'].forEach(id => $(id).addEventListener('focusin', e => { if (e.target.matches && e.target.matches('input[list="sysNames"]')) fillSysList(sysFor(e.target)); }));

// ---------------------------------------------------------------- names as the system names
/** people whose system name is not their name */
const sysNameCands = () => rosterRows().filter(p => normSpace(p.sys) && normName(p.sys) !== normName(p.name));
function useSysNames(list) {
  if (!isBuilder() || !list.length) return 0;
  const batch = list.map(p => ({ pid: p._id, name: normSpace(p.sys), prev: { name: p.name, aka: akaOf(p) } }));
  for (const b of batch) { const p = state.roster.find(x => x._id === b.pid); updatePerson(b.pid, { name: b.name, aka: akaWith(p.aka, [p.name], b.name) }, { quiet: true }); }
  refresh({ noAuto: true, table: true });
  toast(`${plural(batch.length, 'person', 'people')} now go by their Genesys name; the roster names are kept as other spellings`, { label: 'Undo', fn: () => {
    for (const b of batch) { const p = state.roster.find(x => x._id === b.pid); if (p && normName(p.name) === normName(b.name)) updatePerson(b.pid, { name: b.prev.name, aka: b.prev.aka }, { quiet: true }); }
    refresh({ noAuto: true, table: true });
  } });
  return batch.length;
}
function askSysNames(btn) {
  const L = sysNameCands(); if (!L.length) { toast('Everyone\'s name is already their Genesys name.'); return; }
  $('h-names').textContent = `Use ${plural(L.length, 'Genesys name')} as the name${L.length > 1 ? 's' : ''}?`;
  $('namesDlgBody').innerHTML = `<p>${plural(L.length, 'person', 'people')} get the name Genesys has for them. The emails, the workbook and the history show the new names from now on.</p>
    <ul class="dlglist">${L.slice(0, 8).map(p => `<li><span dir="auto">${esc(p.name)}</span> → <b dir="auto">${esc(normSpace(p.sys))}</b></li>`).join('')}${L.length > 8 ? `<li class="subtle">and ${L.length - 8} more</li>` : ''}</ul>
    <p class="hint">The old names are kept as other spellings, so the Final EVAL, the KPI file, the supervisors' sheets and the IDs file still match these people. Undo is offered afterwards.</p>`;
  $('namesGo').textContent = `Use ${plural(L.length, 'Genesys name')}`;
  openDlg('dNames', btn);
}
$('sysAsName').addEventListener('click', e => askSysNames(e.currentTarget));
$('namesCancel').addEventListener('click', () => closeDlg());
$('namesGo').addEventListener('click', () => { closeDlg(); useSysNames(sysNameCands()); });

// ---------------------------------------------------------------- (c) people entered twice
const DUP_KIND = { exp: 'Same Genesys name', nid: 'Same National ID', alias: 'Another person\'s name', name: 'Same name', same: 'Same person twice?' };
const DUP_WHY = {
  exp: ['Both get the same adherence, AHT, schedule and deduction: the Genesys row for that name.', 'Both show the same numbers in every report.'],
  nid: ['The workbook keeps one attendance row per National ID, and the history merges the two.', 'The second person shows the first person\'s attendance.'],
  alias: ['Attendance sheets, the IDs file, roster import and interactions give this name to whoever comes first.', 'Files that use the name are matched to one of the two.'],
  name: ['Files that write only the name cannot tell the two apart.', 'Files that use the name are matched to the first of the two.'],
  same: ['One person in two rows: one row gets the Genesys numbers, the other the National ID and the attendance.', 'Both rows stay, so this person may show twice, or without numbers.'],
};
let dupMemo = null;
/** -> [{ kind, key, pids, sev, title, body, score }] */
function dupGroups() {
  const R = rosterRows();
  const sig = R.map(p => `${p._id}|${p.name}|${p.sys || ''}|${p.nid || ''}|${(effP(p._id) || p).nid || ''}|${akaOf(p).join(';')}`).join('\n') + '#' + [...state.nameMemo.distinct].sort().join(',');
  if (dupMemo && dupMemo.sig === sig) return dupMemo.groups;
  const groups = [], ek = p => normName(gname(effP(p._id) || p)), same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const push = g => { const o = groups.find(x => same(x.pids, g.pids)); if (o) { o.also = [...(o.also || []), g.kind]; return; } groups.push(g); };
  const by = f => { const m = new Map(); for (const p of R) { const k = f(p); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(p); } return [...m].filter(([, L]) => L.length > 1); };
  const dist = L => L.every((a, i) => L.every((b, j) => j <= i || state.nameMemo.distinct.has(pairKey(a._id, b._id))));
  for (const [k, L] of by(ek)) { const ids = new Set(L.map(vidOf).filter(Boolean)); push({ kind: 'exp', key: k, pids: L.map(p => p._id), sev: 'warn', ids: ids.size, title: `"${gname(effP(L[0]._id) || L[0])}" is the Genesys name of ${L.length} people`, body: ids.size > 1 ? `They have different National IDs, so they are different people who share one Genesys name. Give each their own system name; until then both get the Genesys row for "${gname(L[0])}".` : `Both get the same adherence, AHT, schedule and deduction (the Genesys row for "${gname(L[0])}"). Combine them if they are one person; if one has the wrong system name, correct it.` }); }
  for (const [k, L] of by(vidOf)) push({ kind: 'nid', key: k, pids: L.map(p => p._id), sev: 'warn', title: `${plural(L.length, 'person', 'people')} share one National ID (ending ${k.slice(-4)})`, body: 'The workbook keeps one attendance row per National ID, so the second person shows the first person\'s attendance, and the history merges them.' });
  for (const p of R) {
    if (!normSpace(p.sys)) continue;
    const q = R.find(x => x !== p && normName(x.name) === normName(p.sys)); if (!q || ek(p) === ek(q) || state.nameMemo.distinct.has(pairKey(p._id, q._id))) continue;
    push({ kind: 'alias', key: pairKey(p._id, q._id), pids: [p._id, q._id], sev: 'warn', title: `${p.name}'s system name is ${q.name}'s name`, body: `Attendance sheets, the IDs file, roster import and interactions give "${q.name}" to whoever comes first. Give ${p.name} the right system name, or combine them if they are one person.` });
  }
  for (const [k, L] of by(p => normName(p.name))) { if (new Set(L.map(ek)).size === 1 || dist(L)) continue; push({ kind: 'name', key: k, pids: L.map(p => p._id), sev: 'info', title: `${plural(L.length, 'person', 'people')} called ${L[0].name}`, body: 'Their system names differ, so the exports tell them apart; files that write only the name cannot.' }); }
  // the same person entered twice under two spellings: two real words in each name, clearly alike, never two different National IDs
  const together = (a, b) => groups.some(g => g.pids.includes(a) && g.pids.includes(b));
  const W = R.map(p => ({ p, forms: [p.name, p.sys, ...akaOf(p)].map(normSpace).filter(n => words2(n).length >= 2) })).filter(x => x.forms.length);
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) {
    const a = W[i], b = W[j];
    if (together(a.p._id, b.p._id) || state.nameMemo.distinct.has(pairKey(a.p._id, b.p._id))) continue;
    const ia = vidOf(a.p), ib = vidOf(b.p); if (ia && ib && ia !== ib) continue;
    let s = 0;
    for (const x of a.forms) for (const y of b.forms) { const fx = words2(x)[0], fy = words2(y)[0]; if (levN(fx, fy, 2) > 2 && NameLink.word(fx, fy) < 0.74) continue; s = Math.max(s, Core.nameScore(x, y)); }
    if (s < 0.86) { let t = 0; for (const x of a.forms) for (const y of b.forms) { const fx = words2(x)[0], fy = words2(y)[0]; if (levN(fx, fy, 2) > 2 && NameLink.word(fx, fy) < 0.74) continue; t = Math.max(t, nlScore(x, y)); } if (t < 0.85) continue; s = Math.max(s, t); }
    push({ kind: 'same', key: pairKey(a.p._id, b.p._id), pids: [a.p._id, b.p._id], sev: 'decide', score: s, title: `Same person twice? ${a.p.name} and ${b.p.name}`, body: `"${a.p.name}" and "${b.p.name}" look like one person written two ways${s >= 0.97 ? ' (the same first and family name)' : ''}.` });
  }
  const order = { exp: 0, nid: 1, same: 2, alias: 3, name: 4 };
  groups.sort((x, y) => order[x.kind] - order[y.kind]);
  dupMemo = { sig, groups }; return groups;
}
const hasAcct = pid => (state.people || []).some(a => a.pid === pid && !a.disabled);
/** how two records become one: who stays, what the name becomes, what moves, and what stops it */
function combinePlan(pids, keepPref) {
  const P = pids.map(id => state.roster.find(p => p._id === id)).filter(Boolean); if (P.length < 2) return null;
  const block = [], ids = new Set(P.map(vidOf).filter(Boolean)), acc = P.filter(p => hasAcct(p._id));
  if (ids.size > 1) block.push('They have different National IDs, so they are different people. Give each their own system name instead.');
  if (acc.length > 1) block.push('Both have a sign-in account. Turn one off in Manage accounts first.');
  const m = id => state.byId.get(id), dataN = id => state.forms.filter(f => f.pid === id).length + Object.values(state.quality || {}).filter(Q => (Q.rows || {})[id] || (Q.leaders || {})[id]).length;
  const rank = p => [hasAcct(p._id) ? 1 : 0, vidOf(p) ? 1 : 0, foundIn(p._id) ? 1 : 0, dataN(p._id), -state.roster.indexOf(p)];
  const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };
  let keep = keepPref && P.find(p => p._id === keepPref && (!acc.length || hasAcct(p._id)));   // the record with the sign-in account always stays
  if (!keep) keep = P.slice().sort(cmp)[0];
  const from = P.filter(p => p !== keep), why = hasAcct(keep._id) ? 'has the sign-in account' : vidOf(keep) ? 'has the National ID' : foundIn(keep._id) ? 'is found in the exports' : 'was added first';
  // the name: the Genesys spelling (what an export found), else a system name, else the kept name
  const fm = P.find(p => foundIn(p._id)), sysd = P.find(p => normSpace(p.sys)), G = normSpace(fm ? m(fm._id).exp : sysd ? sysd.sys : keep.name) || keep.name;
  const patch = {};
  if (normName(G) !== normName(keep.name)) patch.name = G;
  if ((fm || sysd) && normName(keep.sys || '') !== normName(G)) patch.sys = G;
  const aka = akaWith(keep.aka, [keep.name, keep.sys, ...from.flatMap(p => [p.name, p.sys, ...akaOf(p)])], G);
  if (aka.join('|') !== akaOf(keep).join('|')) patch.aka = aka;
  for (const f of ['nid', 'email', 'spv', 'base']) if (!normSpace(keep[f])) { const src = from.find(p => normSpace(p[f]) && !(f === 'spv' && (p[f] === keep._id || from.some(q => q._id === p[f])))); if (src) patch[f] = src[f]; }
  // the data kept under the removed record's id moves to the kept one; when both have it for the same month, nothing is guessed
  const moves = { q: [], forms: [], att: [], inc: false }, fids = new Set(from.map(p => p._id));
  for (const k of Object.keys(state.quality || {})) { const Q = state.quality[k] || {}; for (const f of from) { const r = (Q.rows || {})[f._id], l = (Q.leaders || {})[f._id]; if (!r && !l) continue; if (monthLocked(k)) block.push(`${f.name} has quality results in ${ymLabel(k)}, which is final.`); else if ((r && (Q.rows || {})[keep._id]) || (l && (Q.leaders || {})[keep._id])) block.push(`Both have quality results for ${ymLabel(k)}.`); else if (!moves.q.includes(k)) moves.q.push(k); } }
  for (const x of state.forms.filter(f => fids.has(f.pid))) { const k = fkey(x); if (monthLocked(k)) block.push(`${nameOfPid(x.pid)} has a ${x.kind === 'final' ? 'final result form' : 'one-to-one'} in ${ymLabel(k)}, which is final.`); else if (state.forms.some(y => y.pid === keep._id && y.kind === x.kind && fkey(y) === k)) block.push(`Both have a ${x.kind === 'final' ? 'final result form' : 'one-to-one'} for ${ymLabel(k)}.`); else moves.forms.push(x.id); }
  for (const [k, E] of Object.entries(state.attEditsBy || {})) { if (!E) continue; for (const f of from) { if (!E.get(f._id)) continue; if (monthLocked(k)) continue; if (E.get(keep._id)) block.push(`Both have attendance corrections for ${ymLabel(k)}.`); else moves.att.push([k, f._id]); } }
  if (state.incList && Array.isArray(state.incList.items) && state.incList.items.some(it => it && fids.has(it.pid))) moves.inc = true;
  return { keep, from, G, why, patch, block: [...new Set(block)], moves };
}
/** names alike enough to call two records one person without asking (the roster names, not the system names: a wrong system name looks alike too) */
function namesAlike(a, b) {
  const fa = [a.name, ...akaOf(a)].filter(n => words2(n).length >= 2), fb = [b.name, ...akaOf(b)].filter(n => words2(n).length >= 2);
  for (const x of fa) for (const y of fb) if (Core.nameScore(x, y) >= 0.86 || nlScore(x, y) >= 0.85) return true;
  return false;
}
/** a group the tool may combine in the bulk action: it can be combined, and the records clearly are one person */
function dupSure(g, pl) {
  if (!pl || pl.block.length || !isBuilder()) return false;
  if (g.kind === 'exp' || g.kind === 'nid') return pl.from.every(f => namesAlike(pl.keep, f));
  if (g.kind === 'same') return g.score >= 0.97 && g.pids.filter(foundIn).length === 1;
  return false;
}
/** combine: one person stays (the Genesys name as the name, every other spelling kept), the others go; one Undo puts everything back */
function combineApply(plans) {
  const done = [], gone = new Set(), rec = { patches: [], spv: [], links: [], memo: null, forms: [], q: [], att: [], inc: null, removed: [] };
  const memo0 = { no: JSON.parse(JSON.stringify(state.nameMemo.no)), distinct: [...state.nameMemo.distinct] };
  const inc0 = state.incList ? JSON.parse(JSON.stringify(state.incList)) : null;
  for (const pl of plans) {
    if (!pl || pl.block.length || gone.has(pl.keep._id) || pl.from.some(f => gone.has(f._id))) continue;
    const K = pl.keep._id, fids = new Set(pl.from.map(f => f._id));
    for (const p of state.roster) if (fids.has(p.spv) && p._id !== K && !fids.has(p._id)) { rec.spv.push([p._id, p.spv]); updatePerson(p._id, { spv: K }, { quiet: true }); }
    let lk = false; for (const [n, pid] of state.attLinks) if (fids.has(pid)) { rec.links.push([n, pid]); state.attLinks.set(n, K); lk = true; } if (lk) persistLinks();
    for (const [n, L] of Object.entries(state.nameMemo.no)) if (L.some(x => fids.has(x))) state.nameMemo.no[n] = [...new Set(L.map(x => (fids.has(x) ? K : x)))];
    state.nameMemo.distinct = new Set([...state.nameMemo.distinct].map(s => s.split('|').map(x => (fids.has(x) ? K : x))).filter(([a, b]) => a !== b).map(([a, b]) => pairKey(a, b)));
    for (const id of pl.moves.forms) { const f = state.forms.find(x => x.id === id); if (!f) continue; rec.forms.push([id, f.pid]); f.pid = K; if (state.db) { const body = { ...f }; queueWrite('forms/' + id, () => state.db.doc('forms/' + id).set(body)); } }
    for (const k of pl.moves.q) {
      const Q = state.quality[k]; if (!Q) continue; rec.q.push([k, Q]);
      const N = JSON.parse(JSON.stringify(Q)), sw = x => (fids.has(x) ? K : x);
      for (const f of fids) { if (N.rows && N.rows[f]) { N.rows[K] = N.rows[f]; delete N.rows[f]; } if (N.leaders && N.leaders[f]) { N.leaders[K] = N.leaders[f]; delete N.leaders[f]; } }
      if (N.links) for (const n of Object.keys(N.links)) N.links[n] = sw(N.links[n]);
      if (N.no) for (const n of Object.keys(N.no)) N.no[n] = [...new Set((N.no[n] || []).map(sw))];
      if (Array.isArray(N.check)) N.check = N.check.map(c => ({ ...c, pid: sw(c.pid) }));
      N.log = [...(N.log || []), { at: new Date().toISOString(), by: whoNow(), what: `${pl.from.map(f => f.name).join(', ')} combined into ${pl.keep.name}` }].slice(-300);
      state.quality[k] = N; if (state.db) queueWrite('quality/' + k, () => state.db.doc('quality/' + k).set(N));
    }
    for (const [k, f] of pl.moves.att) { const E = state.attEditsBy[k], body = E && E.get(f); if (!body) continue; rec.att.push([k, f, K]); E.set(K, body); E.delete(f); if (state.db) { queueWrite(`att/${k}/edits/${K}`, () => state.db.doc(`att/${k}/edits/${K}`).set(body)); queueWrite(`att/${k}/edits/${f}`, () => state.db.doc(`att/${k}/edits/${f}`).delete()); } }
    if (pl.moves.inc && state.incList) { state.incList = { ...state.incList, items: state.incList.items.map(it => (it && fids.has(it.pid) ? { ...it, pid: K } : it)) }; rec.inc = true; }
    rec.patches.push([K, updatePerson(K, pl.patch, { quiet: true }) || {}]);
    pl.from.forEach(f => gone.add(f._id)); done.push(pl);
  }
  if (!done.length) return 0;
  persistNameMemo(); state.qualityVer = (state.qualityVer || 0) + (rec.q.length ? 1 : 0); state.attEditsVer = (state.attEditsVer || 0) + (rec.att.length ? 1 : 0);
  if (rec.inc && state.db) { const body = state.incList; queueWrite('config/inclist', () => state.db.doc('config/inclist').set(body)).catch(() => {}); }
  rec.removed = removePeople([...gone]);   // refreshes the page
  const what = done.length === 1 ? `${done[0].from.map(f => f.name).join(', ')} combined into ${done[0].G}` : `${plural(done.length, 'duplicate')} combined`;
  toast(what, { label: 'Undo', fn: () => combineUndo(rec, memo0, inc0) });
  return done.length;
}
function combineUndo(rec, memo0, inc0) {
  restorePeople(rec.removed);
  for (const [id, prev] of rec.patches) { const p = state.roster.find(x => x._id === id); if (p) updatePerson(id, Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v === undefined ? (k === 'aka' ? [] : k === 'base' ? null : '') : v])), { quiet: true }); }
  for (const [id, spv] of rec.spv) updatePerson(id, { spv }, { quiet: true });
  if (rec.links.length) { for (const [n, pid] of rec.links) state.attLinks.set(n, pid); persistLinks(); }
  state.nameMemo = { no: memo0.no, distinct: new Set(memo0.distinct) }; persistNameMemo();
  for (const [id, pid] of rec.forms) { const f = state.forms.find(x => x.id === id); if (!f) continue; f.pid = pid; if (state.db) { const body = { ...f }; queueWrite('forms/' + id, () => state.db.doc('forms/' + id).set(body)); } }
  for (const [k, Q] of rec.q) { state.quality[k] = Q; if (state.db) queueWrite('quality/' + k, () => state.db.doc('quality/' + k).set(Q)); }
  if (rec.q.length) state.qualityVer = (state.qualityVer || 0) + 1;
  for (const [k, f, K] of rec.att) { const E = state.attEditsBy[k], body = E && E.get(K); if (!body) continue; E.set(f, body); E.delete(K); if (state.db) { queueWrite(`att/${k}/edits/${f}`, () => state.db.doc(`att/${k}/edits/${f}`).set(body)); queueWrite(`att/${k}/edits/${K}`, () => state.db.doc(`att/${k}/edits/${K}`).delete()); } }
  if (rec.inc) { state.incList = inc0; if (state.db) queueWrite('config/inclist', () => (inc0 ? state.db.doc('config/inclist').set(inc0) : state.db.doc('config/inclist').delete())).catch(() => {}); }
  refresh({ table: true });
}
/** a combine from code (tests, other parts): the group's people, the record to keep (optional) */
function mergePeople(keepId, fromIds) { const pl = combinePlan([keepId, ...fromIds], keepId); if (!pl) return { ok: 0, block: ['Nobody to combine.'] }; return pl.block.length ? { ok: 0, block: pl.block } : { ok: combineApply([pl]), block: [] }; }
function dupNotes(add) {
  for (const g of state.dups || []) add({ id: `dup:${g.kind}:${g.key}`, sev: g.sev, group: 'Roster', title: g.title, body: g.body, go: 'dups',
    list: g.pids.map(id => { const p = state.roster.find(x => x._id === id); if (!p) return ''; const n = Core.cleanId((effP(id) || p).nid); return `${p.name} · ${unitOf(p)}${n ? ` · ID ending ${n.slice(-4)}` : ' · no National ID'}`; }).filter(Boolean) });
}
/** one display name twice inside the Monthly Adherence export: only the first row is used */
function expDupNotes(c, add) {
  const S = state.slots.adhGenesys; if (!S) return;
  const two = new Map();
  for (const d of S.dets) { const n = new Map(); for (const row of (d.data && d.data.people) || []) { const k = normName(row.name); if (!k) continue; n.set(k, (n.get(k) || 0) + 1); if (n.get(k) === 2) two.set(k, normSpace(row.name)); } }
  if (two.size) add({ id: 'expdup:adh', sev: 'warn', group: 'Genesys', title: `${plural(two.size, 'name')} twice in the Monthly Adherence export`, body: 'Two Genesys users have the same display name. Only the first row is used; give them different names in Genesys.', list: [...two.values()] });
}
const dupMark = p => (state.dupIds && state.dupIds.has(p._id) ? '<span class="pill warn ico dupmk" role="img" title="Possible duplicate: see the Duplicates filter" aria-label="Possible duplicate"><svg aria-hidden="true"><use href="#i-bang"/></svg></span>' : '');
function openDups() { if (openId) closeDrawer(); state.rf = 'dup'; setSeg($('rseg'), 'dup'); setStep('review'); setTab('people', false); }
function dupCard(p, g, pl) {
  const pp = effP(p._id) || p, n = histFor(p).filter(x => x.r).length, kept = pl && pl.keep._id === p._id, on = p.status !== 'Inactive';
  return `<article class="dupp${kept ? ' kept' : ''}" data-id="${esc(p._id)}">
    <div class="dpt"><span class="av" aria-hidden="true"${avStyle(gname(pp) || p.name)}>${esc(initials(gname(pp) || p.name))}</span><b dir="auto">${esc(p.name || 'New person')}</b>${kept ? '<span class="pill good">Stays</span>' : pl && !pl.block.length ? '<span class="pill">Goes</span>' : ''}</div>
    <div class="dpf"><label class="pf"><span>Name</span><input data-df="name" value="${esc(p.name)}" dir="auto" aria-label="Name"></label>
    <label class="pf"><span>National ID</span><input data-df="nid" value="${esc(p.nid || '')}" inputmode="numeric" placeholder="10 digits or NA" aria-label="National ID of ${esc(p.name)}"></label>
    <label class="pf"><span>System name (Genesys)</span><input data-df="sys" value="${esc(p.sys || '')}" dir="auto" list="sysNames" autocomplete="off" placeholder="Same as the name" aria-label="System name of ${esc(p.name)}"></label></div>
    <dl class="dpx"><div><dt>Brand · Team</dt><dd>${esc(unitOf(p))}</dd></div><div><dt>Supervisor</dt><dd dir="auto">${esc(supName(p.spv) || '–')}</dd></div><div><dt>Status</dt><dd>${on ? 'Active' : 'Inactive'}${hasAcct(p._id) ? ' · has an account' : ''}</dd></div><div><dt>In exports</dt><dd>${badgesCell(p)}</dd></div><div><dt>History</dt><dd>${plural(n, 'month')}</dd></div>${akaOf(p).length ? `<div><dt>Also written</dt><dd dir="auto">${esc(akaOf(p).join(', '))}</dd></div>` : ''}</dl>
    <div class="dpa"><button class="btn sm" data-dopen="${esc(p._id)}" data-agent="${esc(p._id)}">Open</button>${pl && !pl.block.length && !kept ? `<button class="btn sm" data-dkeep="${esc(p._id)}">Keep this one</button>` : ''}<button class="btn sm ghost danger" data-ddel="${esc(p._id)}" aria-label="Remove ${esc(p.name)} from the roster">Remove</button></div></article>`;
}
function dupGroupHtml(g, pl, i) {
  const P = g.pids.map(id => state.roster.find(p => p._id === id)).filter(Boolean);
  const canC = pl && !pl.block.length && isBuilder(), twoIds = g.kind === 'exp' && g.ids > 1;
  const plan = pl ? `Keeps ${pl.keep.name}'s record (it ${pl.why}), named "${pl.G}"; ${pl.from.map(f => f.name).join(', ')} ${pl.from.length > 1 ? 'are' : 'is'} removed. Their spellings are kept, so files that use them still match.` : '';
  return `<section class="card dupgrp ${g.kind}" data-dg="${esc(g.kind + ':' + g.key)}" aria-labelledby="dg-${i}">
    <div class="dgh"><span class="pill ${g.sev === 'info' ? 'info' : 'warn'}">${esc(DUP_KIND[g.kind])}${g.also ? ` · ${esc(g.also.map(k => DUP_KIND[k]).join(' · '))}` : ''}</span><h3 id="dg-${i}" dir="auto">${esc(g.title)}</h3></div>
    <p class="cap">${esc(g.body)}</p>
    <div class="dupcards">${P.map(p => dupCard(p, g, twoIds ? null : pl)).join('')}</div>
    <div class="dgf">${twoIds ? '<p class="hint">Different National IDs: these cannot be combined. Give each their own system name above.</p>' : canC ? `<button class="btn primary" data-dcomb="${esc(g.kind + ':' + g.key)}">Combine into one</button><span class="hint">${esc(plan)}</span>` : pl ? `<button class="btn" disabled>Combine into one</button><span class="hint warnline">${esc(pl.block[0] || '')}</span>` : ''}
      ${['same', 'name', 'alias'].includes(g.kind) ? `<span class="spacer"></span><button class="btn ghost" data-ddistinct="${esc(g.kind + ':' + g.key)}">These are different people</button>` : ''}</div></section>`;
}
function renderDupPanel() {
  const el = $('dupPanel'); if (!el) return;
  const a = document.activeElement, fk = a && el.contains(a) ? { id: (a.closest('[data-id]') || {}).dataset?.id, f: a.dataset.df, b: [...a.attributes].map(x => x.name).find(n => /^data-d/.test(n)) } : null;
  const G = state.dups || [];
  if (!G.length) { el.innerHTML = emptyCard('No duplicates', 'Everyone has their own name, system name and National ID.'); return; }
  const P = G.map(g => ({ g, pl: combinePlan(g.pids, state.dupKeep.get(g.kind + ':' + g.key)) })), sure = P.filter(x => dupSure(x.g, x.pl));
  const gk = g => g.kind + ':' + g.key, pick = sure.filter(x => !state.dupSkip.has(gk(x.g)));
  const top = sure.length ? `<section class="card dupall"><div class="dah"><div><h3>${plural(sure.length, 'sure duplicate')}</h3><p class="cap">The same National ID or the same Genesys name with alike names, or the same first and family name where only one of the two is in the exports.</p></div>${state.dupReview ? '' : `<button class="btn primary" data-dall>Combine all sure duplicates (${sure.length})</button>`}</div>
    ${state.dupReview ? `<ul class="dalist">${sure.map(x => `<li><label class="check"><input type="checkbox" data-dsel="${esc(gk(x.g))}"${state.dupSkip.has(gk(x.g)) ? '' : ' checked'}><span><b dir="auto">${esc(x.pl.G)}</b> <span class="subtle">keeps ${esc(x.pl.keep.name)}${vidOf(x.pl.keep) ? ` (ID ending ${esc(vidOf(x.pl.keep).slice(-4))})` : ''}; removes ${esc(x.pl.from.map(f => f.name).join(', '))}</span></span></label></li>`).join('')}</ul>
      <div class="daf"><button class="btn" data-dcancel>Cancel</button><button class="btn primary" data-dgo${pick.length ? '' : ' disabled'}>Combine ${plural(pick.length, 'duplicate')}</button></div>` : ''}</section>` : '';
  el.innerHTML = top + P.map((x, i) => dupGroupHtml(x.g, x.pl, i)).join('');
  if (fk && fk.id) { const t = el.querySelector(`[data-id="${CSS.escape(fk.id)}"] ${fk.f ? `[data-df="${fk.f}"]` : fk.b ? `[${fk.b}]` : 'button'}`); if (t) t.focus(); }
}
$('dupPanel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const grp = k => (state.dups || []).find(g => g.kind + ':' + g.key === k);
  if (b.dataset.dopen) { openPerson(b.dataset.dopen); return; }
  if (b.dataset.ddel) { const gone = removePeople([b.dataset.ddel]); toast(`Removed ${normSpace(gone[0] && gone[0].name) || 'the person'}`, { label: 'Undo', fn: () => restorePeople(gone) }); return; }
  if (b.dataset.dkeep) { const g = (state.dups || []).find(x => x.pids.includes(b.dataset.dkeep) && b.closest('[data-dg]') && b.closest('[data-dg]').dataset.dg === x.kind + ':' + x.key); if (g) { state.dupKeep.set(g.kind + ':' + g.key, b.dataset.dkeep); renderDupPanel(); } return; }
  if (b.dataset.dcomb) { const g = grp(b.dataset.dcomb); if (!g) return; const pl = combinePlan(g.pids, state.dupKeep.get(b.dataset.dcomb)); if (pl && pl.block.length) { toast(pl.block[0]); return; } combineApply([pl]); return; }
  if (b.dataset.ddistinct) { const g = grp(b.dataset.ddistinct); if (!g) return; const add = []; g.pids.forEach((x, i) => g.pids.forEach((y, j) => { if (j > i) add.push(pairKey(x, y)); })); add.forEach(k => state.nameMemo.distinct.add(k)); persistNameMemo(); refresh({ table: true }); toast('Kept as different people. They are not offered as duplicates again.', { label: 'Undo', fn: () => { add.forEach(k => state.nameMemo.distinct.delete(k)); persistNameMemo(); refresh({ table: true }); } }); return; }
  if (b.hasAttribute('data-dall')) { state.dupReview = true; state.dupSkip = new Set(); renderDupPanel(); const f = $('dupPanel').querySelector('[data-dsel]'); if (f) f.focus(); return; }
  if (b.hasAttribute('data-dcancel')) { state.dupReview = false; renderDupPanel(); return; }
  if (b.hasAttribute('data-dgo')) {
    const plans = (state.dups || []).map(g => ({ g, pl: combinePlan(g.pids, state.dupKeep.get(g.kind + ':' + g.key)) })).filter(x => dupSure(x.g, x.pl) && !state.dupSkip.has(x.g.kind + ':' + x.g.key)).map(x => x.pl);
    state.dupReview = false; combineApply(plans); return;
  }
});
$('dupPanel').addEventListener('change', e => {
  const s = e.target.closest('[data-dsel]'); if (s) { if (s.checked) state.dupSkip.delete(s.dataset.dsel); else state.dupSkip.add(s.dataset.dsel); renderDupPanel(); return; }
  const f = e.target.dataset.df, card = e.target.closest('[data-id]'); if (!f || !card) return;
  const p = state.roster.find(x => x._id === card.dataset.id); if (!p) return;
  const v = normSpace(e.target.value), prev = p[f] ?? ''; e.target.value = v; if ((p[f] ?? '') === v) return;
  updatePerson(p._id, { [f]: v });
  if (f === 'sys') afterSysEdit(p, prev, v); else toast(`Saved. ${f === 'nid' ? 'National ID' : 'Name'}: ${v || '(empty)'}`, { label: 'Undo', fn: () => updatePerson(p._id, { [f]: prev }) });
});
