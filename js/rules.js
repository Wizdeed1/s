// ================================================================ INCENTIVE RULES: sets of rules in force from a month, changed only by the senior manager or an admin
// The KPI scorecards (KPIs, weights, bands), the incentive bases and the eligibility barriers make one set of rules. A new set
// starts from a month; every month is scored with the set in force for it, so next month's changes never touch a month that
// is closed. Each change is logged with who and when. Everyone else sees the rules read-only. The "Changes by hand" report
// lists, for a month, everything a person changed by hand: eligibility and results, attendance days, quality numbers,
// objections, the rules, one-to-ones changed after the agent signed, and the supervisors' page.
Object.assign(state, { rules: {}, rulesVer: 0, ruleEdit: null, chgArea: '' });
const ELIG0 = { minFinal: 0.8, minDays: 5 };
const canRules = () => ['senior', 'admin'].includes(roleNow());
/** the sets of rules, oldest first: [{ from: 'YYYY-MM', cards: {base, bases, teams, people}, elig, count, at, by, log }]. cards.people = a
    person's own base for the months of the set ({pid: {base, src, at, by}}); count = how days, rankings and the incentive are counted */
function ruleVersions() { return Object.values(state.rules || {}).filter(v => v && /^\d{4}-\d{2}$/.test(v.from || '') && v.cards && v.cards.teams).sort((a, b) => a.from.localeCompare(b.from)); }
/** the rules a month is scored with: the newest set that starts on or before it; before the first set, the first rules */
function rulesFor(k) {
  let v = null; for (const x of ruleVersions()) if (!k || x.from <= k) v = x;
  if (v) return { from: v.from, cards: v.cards, elig: { ...ELIG0, ...(v.elig || {}) }, count: countOf(v.count), v };
  return { from: '', cards: state.cards, elig: { ...ELIG0, ...((state.cards && state.cards.elig) || {}) }, count: countOf(state.cards && state.cards.count), v: null };
}
/** a set's 'count' section, made whole once per saved object (an edit always puts a new object in its place) */
const countMemo = new WeakMap(), COUNT_DEF = Object.freeze(Kpi.normCount(null)), KDR0 = Kpi.dayRulesKey(COUNT_DEF);
function countOf(c) {
  if (!c || typeof c !== 'object') return COUNT_DEF;
  let n = countMemo.get(c); if (!n) { n = Kpi.normCount(c); countMemo.set(c, n); }
  return n;
}
/** how a month is counted (the defaults count as the tool always did) */
function countFor(k) { return rulesFor(k === undefined ? rulesK() : k).count; }
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
/** the set being looked at (its doc, or the first rules) and its 'count' section */
function ruleSet() { const k = ruleEditKey(); return k && state.rules[k] ? state.rules[k] : state.cards; }
function ruleCount() { return countOf(ruleSet().count); }
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
  const v = { from, cards: JSON.parse(JSON.stringify({ base: base.cards.base ?? 1000, bases: base.cards.bases || {}, teams: base.cards.teams, ...(base.cards.people ? { people: base.cards.people } : {}) })), elig: { ...base.elig },
    ...((base.v ? base.v.count : state.cards.count) ? { count: JSON.parse(JSON.stringify(base.v ? base.v.count : state.cards.count)) } : {}), at, by,
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
  const E = ruleElig(), c = ruleCount(), dw = c.eligDays === 'counted' ? 'counted days' : 'days attended';
  return `<div class="field"><span class="lbl">Who earns the incentive</span><div class="basegrid"><label><span>Lowest final %</span><input type="number" min="0" max="100" step="1" data-eligf="minFinal" value="${+(E.minFinal * 100).toFixed(1)}" aria-label="Lowest final %"></label><label><span>Fewest ${dw}</span><input type="number" min="0" max="31" step="1" data-eligf="minDays" value="${E.minDays}" aria-label="Fewest ${dw}"></label></div><small>Nobody earns the incentive with a final under ${+(E.minFinal * 100).toFixed(1)}%, ${c.attitude ? 'an attitude critical error from the quality team, ' : ''}or fewer than ${E.minDays} ${dw}, unless the senior manager decides otherwise on Results.</small></div>`;
}

// ---------------------------------------------------------------- how it is counted: the 'count' section of the set being looked at
// Every setting starts as the tool always counted. Only the senior manager or an admin changes them (canRules); each change is one
// line in the rules' log (who and when, also in Changes by hand), with Undo, and final months keep their frozen numbers.
Object.assign(state, { cntOpen: false });
const CNT_MISSING = { scale: 'left out; the other KPIs count as 100%', rank1: 'counts as ranking 1', none: 'no final % until every KPI has a value' };
const CNT_EDGE = { in: 'gets that ranking', out: 'gets the ranking below' }, CNT_MONEY = { round: 'rounded', floor: 'rounded down', ceil: 'rounded up' };
const CNT_LBL = { sched: 'Scheduled days', lateOver: 'Late days', pen: 'Absence penalty', eligDays: 'Fewest days for the incentive', missing: 'A KPI with no value', edge: 'A value exactly on a band',
  valDp: 'Percent KPIs before ranking', rankDp: 'Final ranking', pct: 'Final %', pctDp: 'Final % rounding', daysPct: 'Days %', money: 'Whole SR', attitude: 'Critical errors that stop the incentive' };
const cntGroup = f => (['absentExtra', 'absentPer', 'absentFlat', 'countedMin'].includes(f) ? 'pen' : ['pctOf', 'pctTable'].includes(f) ? 'pct' : f);
const pctDpText = dp => (dp < 0 ? 'not rounded' : dp === 2 ? 'rounded to a whole %' : dp > 2 ? `rounded to ${plural(dp - 2, 'decimal')}` : `rounded to steps of ${Math.pow(10, 2 - dp)}%`);
/** the absence penalty in words ('4 more days off per absent day, never below 1 counted day') */
function penText(c) {
  if (!c.absentExtra && !c.absentFlat) return 'none';
  const bits = [];
  if (c.absentExtra) bits.push(`${plural(c.absentExtra, 'more day')} off per ${c.absentPer === 'run' ? 'run of absent days' : 'absent day'}`);
  if (c.absentFlat) bits.push(`${plural(c.absentFlat, 'day')} off once when there is any absence`);
  if (c.countedMin) bits.push(`never below ${plural(c.countedMin, 'counted day')}`);
  return bits.join(', ');
}
/** one setting of a 'count' section in words */
function cntText(g, c) {
  if (g === 'sched') return ['Attend', 'late days', ...c.sched].join(', ');
  if (g === 'lateOver') return c.lateOver > 0 ? `late by more than ${c.lateOver} min counts as absent` : 'a late day is a worked day';
  if (g === 'pen') return penText(c);
  if (g === 'eligDays') return c.eligDays === 'counted' ? 'counted days' : 'days attended';
  if (g === 'missing') return CNT_MISSING[c.missing];
  if (g === 'edge') return CNT_EDGE[c.edge];
  if (g === 'valDp') return c.valDp < 0 ? 'not rounded' : c.valDp === 0 ? 'rounded to a whole %' : `rounded to ${plural(c.valDp, 'decimal')}`;
  if (g === 'rankDp') return c.rankDp < 0 ? 'not rounded' : `rounded to ${plural(c.rankDp, 'decimal')}`;
  if (g === 'pct') return c.pctOf === 'table' && c.pctTable.length ? `from the table (${c.pctTable.map(x => `${x.min} or more: ${pct1(x.pct)}`).join(', ')})` : 'ranking ÷ 5';
  if (g === 'pctDp') return pctDpText(c.pctDp);
  if (g === 'daysPct') return c.daysPct === 'full' ? '100% whenever there are scheduled days' : 'days counted ÷ days scheduled';
  if (g === 'money') return CNT_MONEY[c.money];
  if (g === 'attitude') return c.attitude ? c.attitude.split('|').map(s => s.trim()).filter(Boolean).join(', ') : 'none';
  return '';
}
/** the example under the settings: the same person counted with these rules (and as the tool always counted) */
function cntExample(c) {
  const k = (id, w) => ({ id, name: id, src: 'file', unit: 'pct', dir: 'high', weight: w, bands: [0.95, 0.9, 0.85, 0.8] }), card = { kpis: [k('a', 0.55), k('b', 0.45)] };
  const base = { ...BASES0, ...(ruleCards().bases || {}) }.Virgin, vals = { file: { a: 0.97, b: 0.91 } }, att = { sched: 23, attended: 20, absent: 2, runs: 2 };
  const r = Kpi.score(card, vals, att, base, c), d = Kpi.score(card, vals, att, base);
  return `Example (base ${base} SR): 23 days scheduled, 20 attended, absent on 2 separate days, final ranking ${d.finalRank.toFixed(2)}. ${r.actual === 20 ? '20 days count' : `${plural(r.actual, 'day')} count after the absence penalty`} (${pct1(r.daysPct)}), final ${pct1(r.finalPct)}, earned ${r.earned} SR${r.earned !== d.earned ? `; ${d.earned} SR as the tool always counted` : ''}.`;
}
const cntSeg = (f, v, L, label) => `<div class="seg sm wrap" role="group" aria-label="${esc(label)}">${L.map(([x, l]) => `<button type="button" data-cntv="${f}|${x}" aria-pressed="${String(v) === String(x)}">${esc(l)}</button>`).join('')}</div>`;
const cntSel = (f, v, L, label) => `<select class="cell" data-cnt="${f}" aria-label="${esc(label)}">${L.map(([x, l]) => `<option value="${x}"${String(v) === String(x) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const cntNum = (f, v, label, max = 31) => `<input type="number" class="cntin" min="0" max="${max}" step="1" data-cnt="${f}" value="${v}" aria-label="${esc(label)}">`;
/** the 'How it is counted' section of the rules drawer (inside its fieldset, so read-only unless canRules) */
function countEditHtml() {
  const c = ruleCount(), diff = Object.keys(Kpi.countDiff(c)), row = (l, ctl, hint) => `<div class="cntrow"><span class="lbl">${esc(l)}</span><div class="cntctl">${ctl}${hint ? `<small>${hint}</small>` : ''}</div></div>`;
  const chips = `<div class="chips" role="group" aria-label="Codes that count as a scheduled day"><label class="chip"><input type="checkbox" checked disabled>Attend and late days</label>${Kpi.CODES.map(x => `<label class="chip"><input type="checkbox" data-cnt="sched" data-code="${esc(x)}"${c.sched.includes(x) ? ' checked' : ''}>${esc(x)}</label>`).join('')}</div>`;
  const table = c.pctOf === 'table' ? `<div class="cnttab">${c.pctTable.map((x, i) => `<div class="rowin"><label>From ranking <input type="number" class="cntin" min="0" max="5" step="0.01" data-cnt="tmin" data-i="${i}" value="${x.min}" aria-label="Row ${i + 1}: from ranking"></label><label>final % <input type="number" class="cntin" min="0" max="200" step="0.1" data-cnt="tpct" data-i="${i}" value="${+(x.pct * 100).toFixed(2)}" aria-label="Row ${i + 1}: final %"></label><button type="button" class="rowbtn danger" data-cntrow="del|${i}" aria-label="Remove row ${i + 1}">Remove</button></div>`).join('')}<button type="button" class="btn sm" data-cntrow="add">Add a row</button><small>A final ranking gets the final % of the first row it reaches; below every row, 0%.</small></div>` : '';
  return `<details class="field cntrules" data-det="cnt"${state.cntOpen ? ' open' : ''}><summary><span class="lbl">How it is counted</span><span class="pill${diff.length ? ' warn' : ''}">${diff.length ? `${plural(diff.length, 'setting')} changed` : 'as the tool always counted'}</span></summary>
    <div class="cntgrid">
    ${row('Scheduled days', chips, 'A scheduled day is a day attended (Attend or a late day) or a day with one of the ticked codes. Days attended ÷ days scheduled is the days %.')}
    ${row('Late days', `<label class="rowin">Late by more than ${cntNum('lateOver', c.lateOver, 'Minutes late that count as absent', 1440)} min counts as absent</label>`, '0 = a late day is a day attended. Its minutes count as tardiness either way.')}
    ${row('Absence penalty', `<div class="rowin">${cntNum('absentExtra', c.absentExtra, 'More days off per absence')} more days off per ${cntSel('absentPer', c.absentPer, [['day', 'absent day'], ['run', 'run of absent days']], 'Per absent day or per run')}</div><div class="rowin">plus ${cntNum('absentFlat', c.absentFlat, 'Days off once when there is any absence')} days off once when there is any absence; counted days never below ${cntNum('countedMin', c.countedMin, 'Fewest counted days')}</div>`, 'Taken off the days attended for the incentive only. A run is absent days in a row; days off between them do not break it.')}
    ${row('Fewest days for the incentive use', cntSeg('eligDays', c.eligDays, [['attended', 'days attended'], ['counted', 'counted days']], 'Fewest days for the incentive use'))}
    ${row('A KPI with no value', cntSeg('missing', c.missing, [['scale', 'is left out'], ['rank1', 'counts as ranking 1'], ['none', 'no final % yet']], 'A KPI with no value'), esc(cntText('missing', c)[0].toUpperCase() + cntText('missing', c).slice(1)) + '.')}
    ${row('A value exactly on a band', cntSeg('edge', c.edge, [['in', 'gets that ranking'], ['out', 'gets the ranking below']], 'A value exactly on a band'))}
    ${row('Percent KPIs before ranking', cntSel('valDp', c.valDp, [[-1, 'not rounded'], [0, 'whole % (94.99% → 95%)'], [1, '1 decimal'], [2, '2 decimals']], 'Percent KPIs before ranking'))}
    ${row('Final ranking', cntSel('rankDp', c.rankDp, [[2, '2 decimals'], [1, '1 decimal'], [0, 'whole number'], [3, '3 decimals'], [-1, 'not rounded']], 'Final ranking decimals'))}
    ${row('Final %', cntSeg('pctOf', c.pctOf, [['rank5', 'ranking ÷ 5'], ['table', 'from a table']], 'Final %') + table)}
    ${row('Final % rounding', cntSel('pctDp', c.pctDp, [[-1, 'not rounded'], [2, 'whole %'], [3, '1 decimal'], [4, '2 decimals']], 'Final % rounding'))}
    ${row('Days %', cntSeg('daysPct', c.daysPct, [['ratio', 'counted ÷ scheduled'], ['full', '100% when scheduled']], 'Days %'))}
    ${row('Whole SR', cntSeg('money', c.money, [['round', 'rounded'], ['floor', 'rounded down'], ['ceil', 'rounded up']], 'Whole SR'), 'For the incentive target and the earned SR.')}
    ${row('Critical errors that stop the incentive', `<input class="cell" data-cnt="attitude" value="${esc(c.attitude)}" placeholder="none" aria-label="Critical error types that stop the incentive" spellcheck="false">`, 'Words in the quality team\'s critical error type, separated by |. Empty = none stops it.')}
    <p class="hint cntex" aria-live="polite">${esc(cntExample(c))}</p>
    ${diff.length ? '<div><button type="button" class="btn sm ghost" data-cntreset>Back to the default</button></div>' : ''}
    </div></details>`;
}
const cntWhat = (g, a, b) => {
  if (g === 'sched') { const add = b.sched.filter(x => !a.sched.includes(x)), del = a.sched.filter(x => !b.sched.includes(x)); return `Scheduled days: ${[add.length ? `${add.join(', ')} now ${add.length > 1 ? 'count' : 'counts'}` : '', del.length ? `${del.join(', ')} no longer ${del.length > 1 ? 'count' : 'counts'}` : ''].filter(Boolean).join('; ')}`; }
  return `${CNT_LBL[g]}: ${cntText(g, a)} → ${cntText(g, b)}`;
};
/** draft months of the set being edited, and each person's earned SR in them (to say how many change) */
function cntEarned() {
  const ek = ruleEditKey(), out = new Map();
  for (const k of wsMonths()) { if (monthLocked(k) || rulesFor(k).from !== ek) continue; for (const r of liveRows(k)) out.set(k + '|' + rowKey(r), r.earned); }
  return out;
}
/** one change to how the set being edited counts: saved and logged in words, with Undo */
function countSet(patch, reset) {
  if (!canRules()) { toast('Only the senior manager or an admin changes the incentive rules.'); renderScore(); return; }
  const ek = ruleEditKey(), tgt = ek ? state.rules[ek] : state.cards; if (!tgt) return;
  const old = tgt.count, a = countOf(old), b = reset ? COUNT_DEF : Kpi.normCount({ ...a, ...patch }), g = reset ? '' : cntGroup(Object.keys(patch)[0]);
  if (JSON.stringify(a) === JSON.stringify(b)) { renderScore(); return; }
  const what = reset ? `How it is counted: back to the default (${Object.keys(Kpi.countDiff(a)).map(f => CNT_LBL[cntGroup(f)]).filter((x, i, L) => L.indexOf(x) === i).join(', ').toLowerCase()})` : `How it is counted: ${cntWhat(g, a, b)}`;
  const before = cntEarned();
  if (Object.keys(Kpi.countDiff(b)).length) tgt.count = JSON.parse(JSON.stringify(b)); else delete tgt.count;
  state.cntOpen = true;
  scoreChanged(what);
  const after = cntEarned(); let n = 0; for (const [x, e] of after) if (before.has(x) && before.get(x) !== e) n++;
  toast(`${what.replace(/^How it is counted: /, '')}.${n ? ` ${plural(n, 'earned SR')} change in the open months.` : ''}`, { label: 'Undo', fn: () => { if (old === undefined) delete tgt.count; else tgt.count = old; scoreChanged(`How it is counted: undone (${what.replace(/^How it is counted: /, '')})`); } });
}
/** a change in the section: a code ticked, a number or a choice */
function countChange(el) {
  const f = el.dataset.cnt, c = ruleCount();
  if (f === 'sched') { const s = new Set(c.sched); if (el.checked) s.add(el.dataset.code); else s.delete(el.dataset.code); countSet({ sched: [...s] }); return; }
  if (['lateOver', 'absentExtra', 'absentFlat', 'countedMin'].includes(f)) { const v = el.value.trim() === '' ? 0 : Number(el.value); if (!(Number.isFinite(v) && v >= 0)) { renderScore(); return; } countSet({ [f]: Math.round(v) }); return; }
  if (f === 'absentPer') { countSet({ absentPer: el.value }); return; }
  if (['valDp', 'rankDp', 'pctDp'].includes(f)) { countSet({ [f]: Number(el.value) }); return; }
  if (f === 'attitude') { const v = normSpace(el.value).replace(/\s*\|\s*/g, '|').replace(/^\||\|$/g, ''); try { new RegExp(v, 'i'); } catch (e) { toast('That is not a list of words separated by |.'); renderScore(); return; } countSet({ attitude: v }); return; }
  if (f === 'tmin' || f === 'tpct') {
    const i = +el.dataset.i, v = Number(el.value), t = c.pctTable.map(x => ({ ...x })); if (!t[i] || !(Number.isFinite(v) && v >= 0)) { renderScore(); return; }
    if (f === 'tmin') t[i].min = Math.min(5, v); else t[i].pct = Math.min(2, v / 100);
    countSet({ pctTable: t });
  }
}
/** a click in the section: a choice, the final % table's rows, back to the default */
function countClick(e) {
  const v = e.target.closest('[data-cntv]'), rw = e.target.closest('[data-cntrow]'), c = ruleCount();
  if (e.target.closest('[data-cntreset]')) { countSet(null, true); return true; }
  if (v) {
    const [f, x] = v.dataset.cntv.split('|');
    if (f === 'pctOf' && x === 'table' && !c.pctTable.length) countSet({ pctOf: 'table', pctTable: [5, 4, 3, 2, 1].map(m => ({ min: m, pct: m / 5 })) });   // start from whole rankings ÷ 5
    else countSet({ [f]: x });
    return true;
  }
  if (rw) {
    const [act, i] = rw.dataset.cntrow.split('|'), t = c.pctTable.map(y => ({ ...y }));
    if (act === 'add') t.push({ min: t.length ? Math.max(0, +(t[t.length - 1].min - 0.5).toFixed(2)) : 4, pct: t.length ? t[t.length - 1].pct : 0.8 }); else t.splice(+i, 1);
    countSet({ pctTable: t });
    return true;
  }
  return false;
}
$('scoreBody').addEventListener('toggle', e => { if (e.target.matches && e.target.matches('[data-det="cnt"]')) state.cntOpen = e.target.open; }, true);

// ---------------------------------------------------------------- a person's own base for the months of a set (cards.people)
/** the first rules' fields as config/scorecards keeps them (the loader keeps every field a set has, so nothing is lost on reload) */
function cardsFromDoc(d) {
  return { base: typeof d.base === 'number' ? d.base : 1000, bases: d.bases && typeof d.bases === 'object' ? d.bases : undefined, teams: d.teams, ...(d.elig && typeof d.elig === 'object' ? { elig: d.elig } : {}),
    ...(d.count && typeof d.count === 'object' ? { count: d.count } : {}), ...(d.people && typeof d.people === 'object' ? { people: d.people } : {}), ...(Array.isArray(d.log) ? { log: d.log } : {}) };
}
/** gives a person their own incentive base for the months of the set in force for month k (base null takes it away); logged */
function setMonthBase(pid, base, src, k) { return setSetBase(rulesFor(k === undefined ? rulesK() : k).from, pid, base, src); }
/** the same for the set that starts in month ek ('' = the first rules) */
function setSetBase(ek, pid, base, src) {
  if (!canRules()) { toast('Only the senior manager or an admin changes the incentive rules.'); return false; }
  const prev = state.ruleEdit; state.ruleEdit = ek;
  const C = ruleCards(), old = C.people && C.people[pid], p = state.roster.find(x => x._id === pid), nm = p ? gname(effP(pid) || p) || p.name : pid;
  const ppl = { ...(C.people || {}) };
  if (base > 0) ppl[pid] = { base: Math.round(base * 100) / 100, ...(src ? { src } : {}), at: new Date().toISOString(), by: whoNow() }; else delete ppl[pid];
  if (Object.keys(ppl).length) C.people = ppl; else delete C.people;
  const ok = saveRules(base > 0 ? `Own base for ${nm}: ${old ? old.base + ' → ' : ''}${ppl[pid].base} SR${src ? ` (${src})` : ''}` : `Own base for ${nm} taken away (was ${old ? old.base : '–'} SR)`);
  state.ruleEdit = prev; refresh(); if (state.ws !== 'build') renderWs(); if (!$('dScore').hidden) renderScore();
  return ok;
}
/** the people with their own base in the set being looked at */
function peopleBasesHtml() {
  const C = ruleCards(), L = Object.entries(C.people || {}).map(([pid, x]) => ({ pid, x, p: state.roster.find(y => y._id === pid) })).sort((a, b) => String(a.p ? a.p.name : a.pid).localeCompare(String(b.p ? b.p.name : b.pid)));
  const can = canRules(), nm = o => (o.p ? gname(effP(o.pid) || o.p) || o.p.name : 'Not in the roster');
  const R = rosterRows().filter(p => p.status !== 'Inactive' && !(C.people || {})[p._id]).sort((a, b) => gname(a).localeCompare(gname(b)));
  return `<div class="field"><span class="lbl">Own bases for these months</span>${L.length ? `<ul class="ilist pbases">${L.map(o => `<li><span class="nm" dir="auto">${esc(nm(o))}</span><span class="sg">${esc(o.x.base)} SR${o.x.src ? ' · ' + esc(o.x.src) : ''}${o.x.by ? ' · ' + esc(o.x.by) : ''}</span>${can ? `<span class="sp"></span><button type="button" class="rowbtn danger" data-pbdel="${esc(o.pid)}" aria-label="Take away the own base of ${esc(nm(o))}">Remove</button>` : ''}</li>`).join('')}</ul>` : ''}
    ${can && R.length ? `<div class="rowin pbadd"><select class="cell" id="pbWho" aria-label="Person"><option value="">Choose a person…</option>${R.map(p => `<option value="${esc(p._id)}">${esc(gname(p) || p.name)}</option>`).join('')}</select><input type="number" class="cntin" id="pbBase" min="1" step="1" placeholder="SR" aria-label="Own base (SR)"><button type="button" class="btn sm" id="pbAdd">Add</button></div>` : ''}
    <small>${L.length ? '' : 'Nobody has an own base in these rules. '}A person's own base here wins over the roster's and the brand's, for the months of these rules only (a raise or a new role from a month).</small></div>`;
}
function peopleBasesClick(e) {
  const d = e.target.closest('[data-pbdel]'), ek = ruleEditKey();
  if (d) { const pid = d.dataset.pbdel, old = (ruleCards().people || {})[pid]; if (old && setSetBase(ek, pid, null, '')) toast('Own base taken away', { label: 'Undo', fn: () => setSetBase(ek, pid, old.base, old.src || '') }); return true; }
  if (e.target.closest('#pbAdd')) { const pid = $('pbWho').value, b = Number($('pbBase').value); if (!pid || !(b > 0)) { toast('Choose a person and type the base in SR.'); return true; } setSetBase(ek, pid, b, 'set by hand'); return true; }
  return false;
}

// ---------------------------------------------------------------- how this was counted: one person's month, step by step
/** a Build-month KPI result (state.kpi) as a month row, for the explanation */
function kpiRowOfK(K) {
  const res = K.res;
  return { n: K.m.exp, kc: K.card.title, kpi: kpiTuples(res), kx: howLite(res), fr: res.finalRank, fin: res.finalPct, ks: res.sched, kat: res.attended, ka: res.actual, kt: res.target,
    earned: res.earned, earnedCalc: res.earnedCalc, base: res.how ? res.how.b : null, absent: res.absent, _el: res.elig };
}
const f2 = v => (v == null || !Number.isFinite(+v) ? '–' : (+v).toFixed(2));
const andList = L => (L.length < 2 ? L.join('') : `${L.slice(0, -1).join(', ')} and ${L[L.length - 1]}`);
/** the days of a month in words: 'Attend 18 · late 2 · SL 1 · Absent 2' (and the days not counted as scheduled) */
function howDaysText(cd, cfg) {
  if (!cd) return '';
  const bits = []; if (cd.attend) bits.push(`Attend ${cd.attend}`); if (cd.late) bits.push(`late ${cd.late}`);
  for (const [code, n] of Object.entries(cd.byCode || {})) if (n) bits.push(`${code} ${n}${code === 'Absent' && cd.lateAbs ? ` (${cd.lateAbs} late by more than ${cfg.lateOver} min)` : ''}`);
  const other = Object.entries(cd.other || {}).map(([v, n]) => `${v} ${n}`);
  return bits.join(' · ') + (other.length ? `; not scheduled: ${other.join(' · ')}` : '');
}
/**
 * "How this was counted" for one person's month: each KPI's value, band, ranking and points, the final ranking and final %, the days
 * (scheduled, attended, the absence penalty, counted), the base, target and earned SR, the eligibility checks, the senior manager's
 * changes and the rules used. r: a row of the month (or kpiRowOfK for the Build month). o: { p, cd (the month's day count), sr }.
 */
function howHtml(r, k, o = {}) {
  if (!r || !(r.kpi && r.kpi.length) && r.fr == null && r.fin == null) return '<p class="subtle">No KPI results for this month, so there is nothing to explain.</p>';
  const sr = o.sr !== undefined ? o.sr : !srHidden(), x = r.kx || null, R = rulesFor(k), cfg = R.count, p = o.p || null, T = r.kpi || [], fin = monthLocked(k), out = [];
  const step = (t, body) => out.push(`<li><b>${esc(t)}</b>${body}</li>`);
  if (!x) out.push(`<li class="hownote">${esc(fin ? 'This month was finalized' : 'This month was saved')} before each step was kept, so the steps below are rebuilt from the saved numbers.</li>`);
  // 1. each KPI: value, band, ranking, weight and points
  const mm = x ? x.mm : 'scale', miss = T.filter(t => t[4] == null).map(t => t[0]);
  if (T.length) {
    const rows = T.map(([name, w, , val, rk, band]) => { const vr = x && x.vr && x.vr[name];
      const pts = rk != null ? f2(rk * w / 100) : mm === 'rank1' ? f2(w / 100) : '–';
      return `<tr><td>${esc(name)}</td><td class="r num">${esc(val)}${vr != null ? ` <small>→ ${esc(pct(vr, 2))}</small>` : ''}</td><td>${rk == null ? '<span class="subtle">no value</span>' : esc(band || '–')}</td><td class="r">${rankChip(rk)}</td><td class="r num">${esc(w)}%</td><td class="r num">${pts}</td></tr>`; }).join('');
    step('Each KPI', `<div class="tablewrap howtab"><table><thead><tr><th>KPI</th><th class="r">Result</th><th>Band reached</th><th class="r">Ranking</th><th class="r">Weight</th><th class="r">Points</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>Points = ranking × weight.${x && x.vd >= 0 ? ` Percent KPIs are rounded to ${x.vd ? plural(x.vd, 'decimal') : 'a whole %'} before they are ranked.` : ''}${x && x.ed === 'out' ? ' A value exactly on a band gets the ranking below.' : ''}</p>
      ${miss.length ? `<p class="hownote">${esc(andList(miss))} had no value: ${mm === 'rank1' ? `${miss.length > 1 ? 'they count' : 'it counts'} as ranking 1.` : mm === 'none' ? 'no final % until every KPI has one.' : `${miss.length > 1 ? 'they are' : 'it is'} left out, and the other weights (${esc(pct1(x ? x.ws : T.filter(t => t[4] != null).reduce((a, t) => a + t[1] / 100, 0)))}) count as 100%.`}</p>` : ''}`);
  }
  // 2. final ranking and final %
  const fr = r.fr != null ? r.fr : x ? x.fr : null;
  if (fr != null) {
    const div = x ? (mm === 'rank1' ? x.wt : x.ws) : null, sum = x && x.rr != null && div ? x.rr * div : null, r3 = x && x.rr != null ? String(Math.round(x.rr * 1000) / 1000) : '';
    const how = sum == null ? 'From the KPIs' : Math.abs(div - 1) < 1e-9 ? `The points add up to ${esc(r3)}` : `${f2(sum)} points ÷ ${esc(pct1(div))} (the weight of the KPIs counted) = ${esc(r3)}`;
    step('Final ranking', `<p>${how} → <b class="num">${esc(f2(fr))}</b>${x ? ` (${esc(x.rd >= 0 ? `rounded to ${plural(x.rd, 'decimal')}` : 'not rounded')})` : ''}.</p>`);
    const pctLine = x && x.po === 'table' ? (x.tr ? `${esc(f2(fr))} reaches the row "${esc(String(x.tr.min))} or more" of the final % table: ${esc(pct1(x.tr.pct))}` : `${esc(f2(fr))} is below every row of the final % table: 0%`) : `${esc(f2(fr))} ÷ 5 = ${esc(pct1(fr / 5))}`;
    step('Final %', `<p>${pctLine}${x && x.pd >= 0 ? `, ${esc(pctDpText(x.pd))}` : ''} → <b class="num">${esc(pct1(x ? x.fp : r.fin))}</b>.${r._adj && r._adj.fin != null ? ` The senior manager set it to <b>${esc(pct1(r._adj.fin))}</b>.` : ''}</p>`);
  } else if (mm === 'none' && miss.length) step('Final %', '<p>None yet: every KPI needs a value first.</p>');
  // 3. days
  const s = x ? x.s : r.ks, a = x ? x.a : (r.kat ?? r.ka), c = x ? x.c : r.ka, dp = x ? x.dp : (s ? c / s : null);
  if (s == null) step('Days', '<p>No attendance for this month, so there is no days % and no incentive to calculate.</p>');
  else {
    let cd = o.cd || null;
    if (!cd && (r.d || r.dx)) { const t = Kpi.countDays(daysOfRow(r, Core.daysIn(+k.slice(0, 4), +k.slice(5))), cfg); if (t.sched === s && t.attended === a) cd = t; }
    const bd = howDaysText(cd, cfg), P = x && x.pen;
    const pen = x && x.ex ? `; absence penalty: ${P.per === 'run' ? `${plural(x.ru, 'run')} of absence` : `${plural(x.ab, 'absent day')}`} × ${P.k}${P.flat ? ` + ${P.flat} once` : ''} = ${plural(x.ex, 'day')} off${P.min ? `, never below ${P.min}` : ''}, so <b>${c}</b> count` : '';
    step('Days', `<p>Scheduled <b class="num">${s}</b>${bd ? ` <span class="subtle">(${esc(bd)})</span>` : ''}; attended <b class="num">${a ?? '–'}</b>${pen}.</p>
      <p>Days % = ${x && x.df === 'full' ? '100%, as there are scheduled days' : `${c ?? '–'} ÷ ${s} = <b class="num">${esc(pct1(dp))}</b>`}.</p>`);
  }
  // 4. base, target and earned (not for the roles that do not see SR)
  if (sr && s != null) {
    const b = x ? x.b : r.base, why = p ? baseWhy(p, r, k).text : '', e = x ? x.e : r.earnedCalc ?? r.earned, t = x ? x.t : r.kt, mo = x ? x.mo : 'round', fpx = x ? x.fp : r.fin;
    step('Incentive', `<p>Base <b class="num">${b ?? '–'} SR</b>${why ? ` <span class="subtle">(${esc(why)})</span>` : ''}.</p>
      <p>Target = ${b ?? '–'} × ${esc(pct1(dp))} = <b class="num">${t ?? '–'} SR</b>; earned = ${b ?? '–'} × ${esc(pct1(dp))} × ${esc(pct1(fpx))}${b != null && dp != null && fpx != null ? ` = ${(b * dp * fpx).toFixed(2)}` : ''} → <b class="num">${e ?? '–'} SR</b> (${esc(CNT_MONEY[mo] || 'rounded')}).</p>`);
  }
  // 5. who earns it
  const el = r._el;
  if (el) {
    const E = R.elig, why = el.why || [], bad = re => why.some(w => re.test(w)), dw = cfg.eligDays === 'counted' ? 'counted days' : 'days attended', dv = cfg.eligDays === 'counted' ? c : a;
    const chk = (okv, t) => `<li class="${okv ? 'good' : 'bad'}"><span aria-hidden="true">${okv ? '✓' : '✗'}</span> ${t}</li>`;
    const L = [chk(!bad(/^final /), `final ${esc(pct1(r.fin))} ${bad(/^final /) ? 'is under' : 'reaches'} ${esc(pct1(E.minFinal))}`)];
    if (cfg.attitude || bad(/^attitude/)) L.push(chk(!bad(/^attitude/), bad(/^attitude/) ? 'an attitude critical error from the quality team' : 'no attitude critical error'));
    if (s != null) L.push(chk(!bad(/days (attended|counted)$/), `${dv ?? '–'} ${dw}, ${bad(/days (attended|counted)$/) ? 'fewer than' : 'at least'} ${E.minDays}`));
    const paid = !el.ok && sr && r.earnedCalc != null ? ` Calculated ${r.earnedCalc} SR, paid 0 SR.` : '';
    step('Who earns it', `<ul class="howchk">${L.join('')}</ul><p>${el.forced ? `The senior manager decided: ${el.ok ? 'eligible' : 'not eligible'}.` : el.ok ? 'Eligible.' : 'Not eligible.'}${esc(paid)}${fin ? ' As decided when the month was finalized.' : ''}</p>`);
  }
  // 6. changes by hand
  const A = r._adj;
  if (A) step('Changed by hand', `<p>${esc([A.elig === true ? 'eligible (decided)' : A.elig === false ? 'not eligible (decided)' : '', A.fin != null ? `final % set to ${pct1(A.fin)}` : '', A.earned != null && sr ? `earned set to ${A.earned} SR` : '', A.note ? `note: ${A.note}` : ''].filter(Boolean).join(' · ') || 'changed')}${A.by ? ` · ${esc(A.by)}` : ''}${A.at ? ` · ${esc(fmtWhen(A.at))}` : ''}.</p>`);
  // 7. the rules
  const diff = [...new Set(Object.keys(Kpi.countDiff(cfg)).map(f => CNT_LBL[cntGroup(f)]))];
  out.push(`<li class="howrules">Counted with ${esc(R.from ? `the rules from ${ymLabel(R.from)}` : 'the first rules')}${diff.length ? `, which count ${esc(andList(diff.map(l => l.toLowerCase())))} differently from the tool's default` : ''}. <button type="button" class="linkbtn" data-rulesopen data-rulesset="${esc(R.from)}">See the rules</button></li>`);
  return `<ol class="howsteps">${out.join('')}</ol>`;
}
/** the 'How' link next to a person's final % (Results, Build › KPI results) */
const howLink = (pid, name, k) => `<button type="button" class="linkbtn howlink" data-how="${esc(pid)}" data-howk="${esc(k || '')}" aria-label="How the final % of ${esc(name)} was counted">How</button>`;
/** the explanation folded under a KPI table (the person page, the Build person panel) */
const howDetailsHtml = (r, k, p, o = {}) => (r && (r.kpi || r.kx) ? `<details class="howdet"><summary>How this was counted</summary>${howHtml(r, k, { p, ...o })}</details>` : '');
/** the drawer: k = a month, or 'build' for the month being built */
function openHow(pid, k) {
  const build = k === 'build' || !k, K = build ? state.kpi.get(pid) : null, kk = build ? monthKey() : k, p = state.roster.find(x => x._id === pid) || (K && K.m.p) || null;
  const r = build ? (K ? kpiRowOfK(K) : null) : rowOf(pid, kk), md = build && state.ctx ? incModel() : null, ar = md ? md.att.find(a => a.pid === pid) : null;
  $('howSub').textContent = [p ? gname(effP(pid) || p) || p.name : r && r.n, ymLabel(kk), r && r.kc].filter(Boolean).join(' · ');
  $('howBody').innerHTML = howHtml(r, kk, { p, cd: ar ? ar.cd : null });
  openDrawer('dHow');
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-how]'); if (b) { e.preventDefault(); openHow(b.dataset.how, b.dataset.howk); } });

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
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rulesopen]'); if (b) openRules(b.dataset.rulesset !== undefined && (b.dataset.rulesset === '' || state.rules[b.dataset.rulesset]) ? b.dataset.rulesset : undefined); });
