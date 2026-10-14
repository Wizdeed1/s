// ================================================================ INCENTIVE RULES: sets of rules in force from a month, changed only by the senior manager or an admin
// The KPI scorecards (KPIs, weights, bands), the incentive bases and the eligibility barriers make one set of rules. A new set
// starts from a month; every month is scored with the set in force for it, so next month's changes never touch a month that
// is closed. Each change is logged with who and when. Everyone else sees the rules read-only. The "Changes by hand" report
// lists, for a month, everything a person changed by hand: eligibility and results, attendance days, quality numbers,
// objections, the rules, one-to-ones changed after the agent signed, and the supervisors' page.
Object.assign(state, { rules: {}, rulesVer: 0, ruleEdit: null, chgArea: '' });
const ELIG0 = { minFinal: 0.8, minDays: 5 };
const canRules = () => ['senior', 'admin'].includes(roleNow());
/** the sets of rules, oldest first: [{ from: 'YYYY-MM', cards: {base, bases, teams}, elig, at, by, log }] */
function ruleVersions() { return Object.values(state.rules || {}).filter(v => v && /^\d{4}-\d{2}$/.test(v.from || '') && v.cards && v.cards.teams).sort((a, b) => a.from.localeCompare(b.from)); }
/** the rules a month is scored with: the newest set that starts on or before it; before the first set, the first rules */
function rulesFor(k) {
  let v = null; for (const x of ruleVersions()) if (!k || x.from <= k) v = x;
  if (v) return { from: v.from, cards: v.cards, elig: { ...ELIG0, ...(v.elig || {}) }, v };
  return { from: '', cards: state.cards, elig: { ...ELIG0, ...((state.cards && state.cards.elig) || {}) }, v: null };
}
/** the month the page is looking at (its rules are the ones shown) */
function rulesK() {
  const w = state.ws;
  if (!w || w === 'build' || w === 'wait') return monthKey();
  if (w === 'quality') return qMonthNow();
  if (w === 'me') return state.meMonth || monthKey();
  return wsMonthNow() || monthKey();
}
const curCards = k => rulesFor(k === undefined ? rulesK() : k).cards;
/** every team card of every set, the newest first (a KPI or a card title from any month) */
function allTeamCards() { const out = []; for (const C of [...ruleVersions().reverse().map(v => v.cards), state.cards]) for (const c of Object.values((C && C.teams) || {})) out.push(c); return out; }
/** the set being looked at in the scorecards drawer: its start month, or '' for the first rules */
function ruleEditKey() {
  const L = ruleVersions();
  if (state.ruleEdit === '' || (state.ruleEdit && L.some(v => v.from === state.ruleEdit))) return state.ruleEdit;
  return rulesFor(rulesK()).from;
}
function ruleCards() { const k = ruleEditKey(); return k && state.rules[k] ? state.rules[k].cards : state.cards; }
function ruleElig() { const k = ruleEditKey(); return { ...ELIG0, ...((k && state.rules[k] ? state.rules[k].elig : state.cards.elig) || {}) }; }
/** the months a set is in force for, as words */
function ruleRange(from) {
  const L = ruleVersions(), next = L.find(v => v.from > (from || ''));
  if (!from) return next ? `before ${ymLabel(next.from)}` : 'every month';
  if (!next) return `from ${ymLabel(from)} on`;
  const [y, m] = next.from.split('-').map(Number), last = m === 1 ? ymKey(y - 1, 12) : ymKey(y, m - 1);
  return last === from ? `${ymLabel(from)} only` : `${ymLabel(from)} to ${ymLabel(last)}`;
}
/** months a new set may start from: open months in the history, this month and the next three */
function ruleStartMonths() {
  const t = new Date(), S = new Set(wsMonths().filter(k => !monthLocked(k)));
  for (let i = -1; i <= 3; i++) { const d = new Date(t.getFullYear(), t.getMonth() + i, 1); S.add(ymKey(d.getFullYear(), d.getMonth() + 1)); }
  return [...S].filter(k => !state.rules[k] && !monthLocked(k)).sort();
}

// ---------------------------------------------------------------- saving: the first rules stay in config/scorecards, each set in rules/<month>
function saveRules(what) {
  if (!canRules()) { toast('Only the senior manager or an admin changes the incentive rules.'); return false; }
  const k = ruleEditKey(), at = new Date().toISOString(), by = whoNow(), entry = what ? [{ at, by, what }] : [];
  state.incModelCache = null; state.rulesVer++;
  if (!k) { state.cards.log = [...(state.cards.log || []), ...entry].slice(-300); persistCards(); return true; }
  const v = state.rules[k]; if (!v) return false;
  v.log = [...(v.log || []), ...entry].slice(-300); v.at = at; v.by = by;
  const body = JSON.parse(JSON.stringify(v));
  if (state.db) queueWrite('rules/' + k, () => state.db.doc('rules/' + k).set(body)).catch(e => toast(`The rules were not saved (${(e && e.code) || 'error'}).`));
  return true;
}
async function startRules(from) {
  if (!canRules() || !/^\d{4}-\d{2}$/.test(from || '')) return;
  if (state.rules[from]) { state.ruleEdit = from; renderScore(); return; }
  if (monthLocked(from)) { toast(`${ymLabel(from)} is final: start the new rules from a later month.`); return; }
  const base = rulesFor(from), at = new Date().toISOString(), by = whoNow();
  const v = { from, cards: JSON.parse(JSON.stringify({ base: base.cards.base ?? 1000, bases: base.cards.bases || {}, teams: base.cards.teams })), elig: { ...base.elig }, at, by,
    log: [{ at, by, what: `New rules from ${ymLabel(from)}, copied from ${base.from ? `the rules from ${ymLabel(base.from)}` : 'the first rules'}` }] };
  state.rules[from] = v; state.ruleEdit = from; state.rulesVer++; state.incModelCache = null;
  if (state.db) { try { await queueWrite('rules/' + from, () => state.db.doc('rules/' + from).set(JSON.parse(JSON.stringify(v)))); } catch (e) { toast(`Not saved (${(e && e.code) || 'error'}).`); } }
  toast(`New rules from ${ymLabel(from)}. Change them here; earlier months keep theirs.`);
  renderScore(); refresh(); if (state.ws !== 'build') renderWs();
}
async function dropRules(from) {
  if (!canRules() || !state.rules[from]) return;
  const old = state.rules[from]; delete state.rules[from]; state.ruleEdit = null; state.rulesVer++; state.incModelCache = null;
  const prev = rulesFor(from), at = new Date().toISOString(), what = `Removed the rules from ${ymLabel(from)}: those months use ${prev.from ? `the rules from ${ymLabel(prev.from)}` : 'the first rules'} again`;
  if (prev.v) { prev.v.log = [...(prev.v.log || []), { at, by: whoNow(), what }]; const body = JSON.parse(JSON.stringify(prev.v)); if (state.db) queueWrite('rules/' + prev.from, () => state.db.doc('rules/' + prev.from).set(body)).catch(() => {}); }
  else { state.cards.log = [...(state.cards.log || []), { at, by: whoNow(), what }]; persistCards(); }
  if (state.db) queueWrite('rules/' + from, () => state.db.doc('rules/' + from).delete()).catch(() => {});
  toast(what, { label: 'Undo', fn: () => { state.rules[from] = old; state.rulesVer++; if (state.db) queueWrite('rules/' + from, () => state.db.doc('rules/' + from).set(JSON.parse(JSON.stringify(old)))); renderScore(); refresh(); } });
  renderScore(); refresh(); if (state.ws !== 'build') renderWs();
}
/** the rules collection, live */
function rulesLoaded(sn) {
  const o = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.cards && x.cards.teams) { if (x.cards.teams) migrateCards(x.cards.teams); o[d.id] = { ...x, from: x.from || d.id }; } });
  state.rules = o; state.rulesVer++; state.incModelCache = null;
  if (state.ctx) state.kpi = computeKpi();
  if (!$('dScore').hidden) renderScore();
}
/** a line under a scorecard: which rules a month uses */
function rulesLine(k) {
  const R = rulesFor(k), n = ruleVersions().length;
  if (!n) return '';
  return `<span class="hint">Incentive rules ${R.from ? `from ${esc(ymLabel(R.from))}` : 'from before the first change'}${canRules() ? ' · <button class="linkbtn" data-rulesopen>change</button>' : ''}</span>`;
}
function openRules(k) { state.ruleEdit = k === undefined ? null : k; renderScore(); openDrawer('dScore'); }

// ---------------------------------------------------------------- the scorecards drawer: the rules being looked at, read-only unless allowed
function rulesBarHtml() {
  const can = canRules(), V = ruleVersions(), ek = ruleEditKey(), starts = ruleStartMonths();
  const opts = [['', V.length ? `First rules (${ruleRange('')})` : 'The rules (every month)'], ...V.map(v => [v.from, ruleRange(v.from).replace(/^from/, 'From')])];
  const R = ek ? state.rules[ek] : null, log = ((R ? R.log : state.cards.log) || []).slice().reverse();
  const finals = wsMonths().filter(x => monthLocked(x) && rulesFor(x).from === ek);
  return `<div class="rulesbar">
    <label class="wsfield"><span>Rules</span><select class="cell" id="ruleSel" aria-label="Which rules">${opts.map(([v, l]) => `<option value="${v}"${v === ek ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    ${can && starts.length ? `<label class="wsfield"><span>Start new rules from</span><span class="rowin"><select class="cell" id="ruleFrom" aria-label="Start new rules from">${starts.map(x => `<option value="${x}"${x === monthKey() ? ' selected' : ''}>${esc(ymLabel(x))}</option>`).join('')}</select><button class="btn sm" id="ruleNew">Start</button></span></label>` : ''}
    ${can && ek ? '<button class="btn sm ghost" id="ruleDel" title="Remove this set: its months use the set before it again">Remove this set</button>' : ''}</div>
    <p class="hint">${esc(ek ? `In force ${ruleRange(ek)}.` : V.length ? `In force ${ruleRange('')}.` : 'In force for every month until the senior manager starts new rules from a month.')} Each month is scored with the rules of its own period${finals.length ? `; ${plural(finals.length, 'final month')} (${esc(finals.map(ymLabel).join(', '))}) keep their numbers whatever changes here` : ''}.</p>
    ${can ? '' : '<div class="banner info">Only the senior manager or an admin changes the incentive rules. You see them as they are.</div>'}
    ${log.length ? `<details class="rulelog"><summary>Changes to these rules · ${log.length}</summary><ul class="ilist">${log.slice(0, 120).map(e => `<li><span class="nm">${esc(e.what)}</span><span class="sg">${esc(e.by || '')} · ${esc(fmtWhen(e.at))}</span></li>`).join('')}</ul></details>` : ''}`;
}
function eligEditHtml() {
  const E = ruleElig();
  return `<div class="field"><span class="lbl">Who earns the incentive</span><div class="basegrid"><label><span>Lowest final %</span><input type="number" min="0" max="100" step="1" data-eligf="minFinal" value="${+(E.minFinal * 100).toFixed(1)}" aria-label="Lowest final %"></label><label><span>Fewest days attended</span><input type="number" min="0" max="31" step="1" data-eligf="minDays" value="${E.minDays}" aria-label="Fewest days attended"></label></div><small>Nobody earns the incentive with a final under ${+(E.minFinal * 100).toFixed(1)}%, an attitude critical error from the quality team, or fewer than ${E.minDays} days attended, unless the senior manager decides otherwise on Results.</small></div>`;
}

// ---------------------------------------------------------------- changes by hand: one month, every area
const CHG_AREAS = [['results', 'Results and eligibility'], ['att', 'Attendance'], ['quality', 'Quality'], ['obj', 'Objections'], ['rules', 'Incentive rules'], ['forms', 'One-to-ones'], ['cycle', 'Supervisors page']];
function handChanges(k) {
  const out = [], add = (area, at, by, who, what) => out.push({ area, at: at || '', by: by || '', who: who || '', what: String(what || '') });
  const F = state.finals[k], H = state.history[k], rowName = rk => { const r = ((F && F.rows) || (H && H.rows) || []).find(x => rowKey(x) === rk); return r ? r.n : rk; };
  if (F) {
    for (const [rk, a] of Object.entries(F.adj || {})) {
      const bits = [a.elig === true ? 'eligible (decided)' : a.elig === false ? 'not eligible (decided)' : '', a.fin != null ? `final % set to ${pct1(a.fin)}` : '', a.earned != null ? `earned set to ${a.earned} SR` : '', a.note ? `note: ${a.note}` : ''].filter(Boolean);
      add('results', a.at, a.by, rowName(rk), bits.join(' · ') || 'changed');
    }
    for (const e of F.log || []) add('results', e.at, e.by, '', e.what);
  }
  watchAttEdits(k);
  const E = attEditsOf(k), mo = MON[+k.slice(5) - 1];
  if (E) for (const [pid, ed] of E) for (const [d, e] of Object.entries((ed && ed.days) || {})) add('att', e.at, e.by, ed.n || supName(pid), `${d} ${mo}: ${typeof e.v === 'number' ? `late ${e.v} min` : e.v}${e.note ? ` · ${e.note}` : ''}`);
  const Q = state.quality[k];
  if (Q) for (const e of Q.log || []) add('quality', e.at, e.by, '', e.what);
  if (typeof objList === 'function') for (const o of objList({ k })) for (const e of (o.log || []).filter(x => x.role !== 'agent')) add('obj', e.at, e.by, o.name, `${objLabel(o)}: ${e.what}`);
  const R = rulesFor(k);
  for (const e of ((R.v ? R.v.log : state.cards.log) || [])) add('rules', e.at, e.by, '', `${R.from ? `Rules from ${ymLabel(R.from)}` : 'First rules'}: ${e.what}`);
  for (const f of state.forms.filter(x => fkey(x) === k)) if (sigOf(f.id) && sigState(f) === 'changed') add('forms', f.savedAt, f.savedByName, f.agent && f.agent.name, `${FORM_TITLE[f.kind] || 'Form'} changed after the agent signed it`);
  for (const e of Object.values(state.cycleLog || {})) if (e && e.k === k) add('cycle', e.at, e.by, '', e.what);
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function handChangesHtml(k) {
  if (!k) return '';
  const L = handChanges(k), A = state.chgArea, shown = A ? L.filter(x => x.area === A) : L, n = a => L.filter(x => x.area === a).length;
  return `<details class="card chgcard" data-det="chg"${state.chgOpen ? ' open' : ''}><summary>Changes by hand · ${esc(ymLabel(k))} · ${L.length}</summary>
    <p class="cap">Everything a person changed by hand for ${esc(ymLabel(k))}, newest first: eligibility and results, attendance days, quality numbers, objections, the incentive rules, one-to-ones changed after the agent signed, and this page.</p>
    <div class="chgbar"><div class="seg sm wrap" role="group" aria-label="Area"><button data-chg="" aria-pressed="${!A}">All ${L.length}</button>${CHG_AREAS.filter(([a]) => n(a)).map(([a, l]) => `<button data-chg="${a}" aria-pressed="${A === a}">${esc(l)} ${n(a)}</button>`).join('')}</div><button class="btn sm" data-chgx${L.length ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button></div>
    ${shown.length ? `<ul class="ilist chglist">${shown.slice(0, 300).map(x => `<li><span class="chip">${esc((CHG_AREAS.find(a => a[0] === x.area) || [, x.area])[1])}</span><span class="nm">${x.who ? `<b dir="auto">${esc(x.who)}</b> · ` : ''}${esc(x.what)}</span><span class="sp"></span><span class="sg">${esc(x.by || '')}${x.at ? ' · ' + esc(fmtWhen(x.at)) : ''}</span></li>`).join('')}</ul>${shown.length > 300 ? `<p class="hint">The newest 300 are shown; the Excel file has all ${shown.length}.</p>` : ''}` : '<p class="subtle">Nothing was changed by hand.</p>'}</details>`;
}
async function exportChanges(k) {
  const L = handChanges(k); if (!L.length) return;
  await xlBook(`Changes by hand - ${ymLabel(k)}.xlsx`, [{ name: 'Changes by hand', title: `Changes by hand - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: 'When', t: 'text', w: 18 }, { h: 'Area', t: 'text', w: 20 }, { h: 'Changed by', t: 'text', w: 22 }, { h: 'Person', t: 'text', w: 28 }, { h: 'What', t: 'text', w: 80 }],
    rows: L.map(x => [x.at ? new Date(x.at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '', (CHG_AREAS.find(a => a[0] === x.area) || [, x.area])[1], x.by, x.who, x.what]), freezeCol: 1 }]);
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rulesopen]'); if (b) openRules(); });
