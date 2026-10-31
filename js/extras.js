// ================================================================ SHARED PIECES: supervisors, incentive rules, live scores,
// attendance from Genesys, freshness, email drafts, the Outlook .msg reader
Object.assign(state, { quality: {}, qualityVer: 0, attEditsBy: {}, attEditsVer: 0, fresh: {}, contacts: null, spvCard: null, cycles: {}, cycleDone: {}, sigs: new Map(), sigVer: 0 });

// ---------------------------------------------------------------- supervisors: each person's Supervisor is another person in the roster
function supName(pid) { const p = state.roster.find(x => x._id === pid); return p ? gname(effP(p._id) || p) || p.name : ''; }
function supOfP(p) { return p && p.spv ? state.roster.find(x => x._id === p.spv) || null : null; }
function teamOf(spvPid) { return rosterRows().filter(p => p.spv === spvPid); }
function supervisors() {
  const n = new Map(); for (const p of rosterRows()) if (p.spv && p.status !== 'Inactive') n.set(p.spv, (n.get(p.spv) || 0) + 1);
  return [...n].map(([pid, size]) => ({ pid, name: supName(pid), size })).filter(x => x.name).sort((a, b) => a.name.localeCompare(b.name));
}
let supSig = '';
/** the supervisors' names, readable before sign-in (agents pick theirs when they make an account) */
function publishSupervisors() {
  if (!state.db || !state.rosterReady || !Auth.user() || !Auth.STAFF.has(roleNow())) return;
  const list = supervisors().map(({ pid, name }) => ({ pid, name })), sig = JSON.stringify(list);
  if (sig === supSig || !list.length) return; supSig = sig;
  const path = state.db.folder ? 'meta/supervisors' : 'config/supervisors';
  queueWrite(path, () => state.db.doc(path).set({ list, at: new Date().toISOString() })).catch(() => {});
}

// ---------------------------------------------------------------- incentive: base by brand (a person's own base wins), and who is eligible
const BASES0 = { Virgin: 1000, Friendi: 500, 'Friendi Pay': 500 };
/** the bases in force for a month (the month looked at, when none is given) */
function basesNow(k) { const C = curCards(k); return { ...BASES0, ...((C && C.bases) || {}) }; }
/** a person's base for a month: their own base for the months of the rules (cards.people), their own base in the roster, the brand's */
function monthBase(p, k) { const C = curCards(k), x = p && C && C.people ? C.people[p._id] : null, b = x && Number(x.base); return b > 0 ? { base: b, x } : null; }
function baseOf(p, r, k) {
  const mb = monthBase(p, k); if (mb) return mb.base;
  const own = p && Number(p.base); if (own > 0) return own;
  const b = normBrand((p && p.brand) || (r && r.brand)), B = basesNow(k);
  return B[b] != null ? B[b] : (curCards(k) && curCards(k).base) || 1000;
}
/** where the base comes from, in words: { kind: 'month' | 'own' | 'brand' | 'default', text } */
function baseWhy(p, r, k) {
  const mb = monthBase(p, k), R = rulesFor(k === undefined ? rulesK() : k), set = R.from ? `the rules from ${ymLabel(R.from)}` : 'the first rules';
  if (mb) return { kind: 'month', text: `this person's own base in ${set}${mb.x.src ? ` (${mb.x.src})` : ''}` };
  if (p && Number(p.base) > 0) return { kind: 'own', text: 'this person\'s own base in the roster' };
  const b = normBrand((p && p.brand) || (r && r.brand)), B = basesNow(k);
  return B[b] != null ? { kind: 'brand', text: `the ${b} base` } : { kind: 'default', text: 'the default base' };
}
/** the eligibility barriers of the month looked at (each month has its own, with its rules) */
const ELIG = { get minFinal() { return rulesFor(rulesK()).elig.minFinal; }, get minDays() { return rulesFor(rulesK()).elig.minDays; } };
const ATTITUDE = /attitude|abuse|hr action/i;
/** the critical error types that stop the incentive in a month (its rules; none when the list is empty) */
function attitudeRe(k) { const a = countFor(k).attitude; if (!a) return null; if (a === COUNT_DEF.attitude) return ATTITUDE; try { return new RegExp(a, 'i'); } catch (e) { return ATTITUDE; } }
/** who earns the incentive, in words, from the month's rules ('final under 80%, an attitude critical error, under 5 days attended') */
function eligText(k, form) {
  const R = rulesFor(k === undefined ? rulesK() : k), E = R.elig, att = R.count.attitude ? 'an attitude critical error' : '', dw = R.count.eligDays === 'counted' ? 'counted' : 'attended', ten = E.minMonths > 0 ? E.minMonths : 0;
  if (form === 'long') return `a final % under ${pct1(E.minFinal)}, ${att ? att + ', ' : ''}${ten ? `fewer than ${E.minDays} days ${dw} or under ${ten} months in the job` : `or fewer than ${E.minDays} days ${dw}`}`;
  if (form === 'help') return `a final under ${pct1(E.minFinal)}, ${att ? att + ' ' : ''}${ten ? `fewer than ${E.minDays} days ${dw} or under ${ten} months in the job` : `or fewer than ${E.minDays} days ${dw}`}`.replace(', or', ' or');
  if (form === 'short') return `Final under ${pct1(E.minFinal)}, ${att ? 'an attitude error ' : ''}${ten ? `too few days or under ${ten} months in the job` : 'or too few days'}`.replace(', or', ' or');
  return `final under ${pct1(E.minFinal)}, ${att ? att + ', ' : ''}under ${E.minDays} days ${dw}${ten ? `, under ${ten} months in the job` : ''}`;
}
/** the first month someone earns the incentive under the months-in-the-job rule: their n-th full month in the job. The month they
    joined is the first only when they joined on the 1st; otherwise the first is the month after. With 6: joined 1 Jan 2026, from
    Jun 2026; joined 18 Jan 2026 (six months done on 18 Jun), from Jul 2026. '' with no joining date on the roster or no rule */
function eligFrom(p, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((p && p.joined) || ''); n = Math.round(+n); if (!m || !(n > 0)) return '';
  const t = +m[1] * 12 + +m[2] - 1 + (+m[3] === 1 ? 0 : 1) + n - 1; return ymKey(Math.floor(t / 12), (t % 12) + 1);
}
/** the quality sheet's barriers: final under 80%, an attitude critical error, fewer than 5 days attended, and under 6 months in the
    job (the month's rules can change the numbers, the critical error types and whether the days are those attended or those counted
    after an absence penalty). p = the person (their joining date); adj.elig = the senior manager's decision */
function eligibility(res, q, adj, k, p) {
  const K = k === undefined ? rulesK() : k, why = [], R = rulesFor(K), E = R.elig, AT = attitudeRe(k), from = eligFrom(p, E.minMonths);
  if (res && res.finalPct != null && res.finalPct < E.minFinal - 1e-9) why.push(`final ${pct1(res.finalPct)} is under ${pct1(E.minFinal)}`);
  if (AT && q && (q.crit || []).some(c => AT.test(c.type || ''))) why.push('attitude critical error');
  const cnt = R.count.eligDays === 'counted', days = res ? (cnt || res.attended === undefined ? res.actual : res.attended) : null;
  if (res && days != null && res.sched != null && days < E.minDays) why.push(cnt ? `${days} days counted` : `${days} days attended`);
  if (from && K && K < from) why.push(`joined ${Forms.fmtDate(p.joined)}: earns from ${ymLabel(from)}`);
  if (adj && adj.elig === true) return { ok: true, why, forced: true };
  if (adj && adj.elig === false) return { ok: false, why: why.length ? why : ['not eligible (senior manager)'], forced: true };
  return { ok: !why.length, why };
}

// ---------------------------------------------------------------- KPI values: the quality team's numbers, then the KPI file
const QUALITY_OWNED = ['qobs', 'fcr', 'csat', 'emp', 'qa'];   // the Final EVAL's columns: Call QA, CR, Ticket QA (= Empowerment Utilization), CT's Evaluation score; DRC-CSAT is one number for everyone
function ownerOf(k) { return k.owner || (QUALITY_OWNED.includes(k.id) ? 'quality' : 'file'); }
/** Quality Observations is the EVAL's Call QA, not its Final Score; a row with no Call QA (CT scores an Evaluation score) counts its Final Score */
const qObsOf = e => (e && e.callqa != null ? e.callqa : e && e.final != null ? e.final : null);
/** a row saved when Quality Observations was the Final Score (no qv), read the way it counts now: Call QA. A Final Score typed
    by hand then stays the Final Score. A final month is never read again: it stays as it was finalized. */
function qUp(r, k) {
  if (!r || r.qv === 2 || (k && monthLocked(k))) return r;
  const { qobsHand, ...x } = r, e = { ...(r.eval || {}) }, kpi = { ...(r.kpi || {}) };
  if (qobsHand && kpi.qobs != null) e.final = kpi.qobs;
  const qo = qObsOf(e); if (!r.status && qo != null) kpi.qobs = Math.round(qo * 10000) / 10000;
  return { ...x, eval: e, kpi, qv: 2, ...(qobsHand ? { finalHand: true } : {}) };
}
function qRow(k, pid) { const Q = state.quality[k]; return Q && Q.rows ? qUp(Q.rows[pid] || null, k) : null; }
function kpiFileRowK(k, p, r) {
  const F = state.kpiFiles[k]; if (!F) return null;
  const pp = p ? effP(p._id) || p : null, id = Core.cleanId(pp ? pp.nid : r && r.id), names = new Set([pp && normName(pp.name), pp && normName(pp.sys), r && normName(r.n)].filter(Boolean));
  return (id && F.rows.find(x => x.id === id)) || F.rows.find(x => names.has(normName(x.name))) || null;
}
/** DRC-CSAT is the same for every agent: one number per month, typed once (null when nobody typed it) */
function csatAll(k) { const Q = k ? state.quality[k] : null, v = Q ? Q.csat : null; return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function fileValues(card, k, p, r) {
  const fr = kpiFileRowK(k, p, r), q = p ? qRow(k, p._id) : null, out = {}, csat = csatAll(k);
  for (const kk of card.kpis) if (kk.src === 'file') {
    if (kk.id === 'csat' && csat != null) { out.csat = csat; continue; }
    const fromQ = q && q.kpi ? q.kpi[kk.id] : null, fromF = Kpi.fileValue(kk, fr && fr.cols);
    out[kk.id] = ownerOf(kk) === 'quality' ? (fromQ != null ? fromQ : fromF) : (fromF != null ? fromF : fromQ);
  }
  return out;
}
/** a saved month's row scored again with today's inputs (quality numbers, KPI file, the supervisor's attendance corrections, bases)
    and the month's rules. r.kat = days attended (r.ka on rows saved before the absence rules); the days are counted again only when
    the month's rules count other codes than the row was counted with */
function scoreLive(r, p, k) {
  const card = cardFor((p && p.team) || r.team, k); if (!card) return null;
  const cfg = countFor(k), vals = { adh: r.adh ?? null, adhUnder: r.adhUnder ?? null, aht: r.aht ?? null, tardy: r.tardy ?? null, file: fileValues(card, k, p, r) };
  // kat = days attended (ka on rows saved before the counting rules), kab = absences as the rules count them (when a long late
  // day counts as one), kr = runs of absent days. Kpi.score takes the absence penalty off, so it is never taken twice.
  let att = r.ks != null ? { sched: r.ks, attended: r.kat ?? r.ka, absent: r.kab ?? r.absent, runs: r.kr } : null, again = false;
  const hasDays = !!(r.d || r.dx), dk = Kpi.dayRulesKey(cfg);
  again = hasDays && dk !== (r.kdr || KDR0);
  if (again || (att && att.runs == null && hasDays && cfg.absentPer === 'run' && cfg.absentExtra > 0 && att.absent > 0)) {
    const t = Kpi.countDays(daysOfRow(r, Core.daysIn(+k.slice(0, 4), +k.slice(5))), cfg);
    if (again) att = r.ks != null || t.sched > 0 ? { sched: t.sched, attended: t.attended, absent: t.absent, runs: t.runs } : null; else att.runs = t.runs;
  }
  const res = Kpi.score(card, vals, att, baseOf(p, r, k), cfg);
  return { card, res, again, dk };
}

// ---------------------------------------------------------------- attendance: what Genesys says, plus the supervisor's corrections
const LET = { A: 'Attend', O: 'OFF', L: 'AL', S: 'SL', X: 'Absent', V: 'Other leave' };
/** a saved row's days as full values (codes, or tardy minutes) */
function daysOfRow(r, ND) {
  const d = String(r.d || ''), dx = r.dx || {};
  return Array.from({ length: ND }, (_, i) => { const x = dx[i + 1]; if (x != null) return x; const c = d[i]; return !c || c === '-' ? null : LET[c] || null; });
}
/** the totals a row should have once the corrections are in: worked, absent, tardy (as the days show them), and the scheduled and
    attended days for the incentive counted with the month's rules (Kpi.countDays: the same count as the Build month and the
    incentive workbook); kab = absences as the rules count them, runs = runs of absent days */
function attTotals(days, k) {
  const c = Kpi.countDays(days, countFor(k)); let al = 0, sl = 0, other = 0;
  for (const v of days) { if (v == null || typeof v === 'number' || v === 'Attend' || v === 'OFF' || v === 'Absent') continue; if (v === 'AL') al++; else if (v === 'SL') sl++; else other++; }
  return { attend: c.attended, sched: c.sched, absent: c.absent - c.lateAbs, tardy: c.tardy, al, sl, off: c.off, leave: other, worked: c.attended + c.lateAbs,
    runs: c.runs, kab: c.absent, counted: c.counted, extra: c.extra, byCode: c.byCode };
}
/** the fields a recounted row carries for the incentive: attended, runs of absence, and (only when they differ from the plain
    counts and the defaults) the absences as the rules count them and the day rules it was counted with */
const keptCount = (t, k) => ({ kat: t.attend, kr: t.runs, ...(t.kab !== t.absent ? { kab: t.kab } : {}), ...kdrOf(k) });
/** the day rules a row was counted with, kept on the row only when they are not the defaults */
const kdrOf = k => { const x = Kpi.dayRulesKey(countFor(k)); return x === KDR0 ? {} : { kdr: x }; };
const DAYCH = v => (v == null ? '-' : typeof v === 'number' || v === 'Attend' ? 'A' : v === 'OFF' ? 'O' : v === 'AL' ? 'L' : v === 'SL' ? 'S' : v === 'Absent' ? 'X' : 'V');
/** a saved row with the supervisor's corrections applied (draft months only), counted with the month's rules */
function withEdits(r, edits, ND, k) {
  if (!edits || !edits.days || !Object.keys(edits.days).length) return r;
  const days = daysOfRow(r, ND);
  for (const [d, e] of Object.entries(edits.days)) { const i = +d - 1; if (i >= 0 && i < ND) days[i] = e.v === '' ? null : e.v; }
  const t = attTotals(days, k), dx = {};
  days.forEach((v, i) => { if (v != null && (typeof v === 'number' || !['Attend', 'OFF', 'AL', 'SL', 'Absent'].includes(v))) dx[i + 1] = v; });
  const { kdr, kab, ...rest } = r;
  return { ...rest, d: days.map(DAYCH).join(''), dx, worked: t.worked, absent: t.absent, al: t.al, sl: t.sl, off: t.off, leave: t.leave, tardy: t.tardy, ks: t.sched, ka: t.attend, ...keptCount(t, k), _edited: Object.keys(edits.days).length };
}
function leaveCode(c) {
  const s = String(c || '');
  if (/annual/i.test(s)) return 'AL'; if (/sick/i.test(s)) return 'SL'; if (/day\s*off/i.test(s)) return 'OFF';
  if (/marriage/i.test(s)) return 'Marriage'; if (/exam/i.test(s)) return 'Exam'; if (/unpaid/i.test(s)) return 'Unpaid'; if (/maternity/i.test(s)) return 'ML';
  if (/paternity/i.test(s)) return 'Paternity'; if (/compassion|bereave/i.test(s)) return 'Compassionate Leave'; if (/eid/i.test(s)) return 'Eid'; if (/national/i.test(s)) return 'National Day'; if (/founding/i.test(s)) return 'Founding Day';
  return normSpace(s.replace(/\bleave\b/i, '').trim()) ? normSpace(s) : 'Other leave';
}
let autoMemo = null;
/**
 * Attendance without the supervisors' sheets: each scheduled day from the Schedule and the Agent Status Timeline.
 * Signed on = Attend (or the late minutes, as the sheets had them), no sign-on = Absent, a leave activity = that leave,
 * no shift = OFF. Days after the last day in the timeline stay empty. The supervisor's corrections go on top.
 */
function autoAttendance(ctx) {
  const S = state.slots.schedule, TL = state.slots.timeline; if (!S || !TL || !ctx) return null;
  const Y = state.y, M = state.m, ND = Core.daysIn(Y, M);
  const key = S.dets.map(d => d._uid).join(',') + '|' + TL.dets.map(d => d._uid).join(',') + '|' + Y + '-' + M;
  if (!autoMemo || autoMemo.key !== key) {
    let last = 0;
    for (const d of TL.dets) for (const x of d.data.segs) { const t = new Date(x.s); if (t.getUTCFullYear() === Y && t.getUTCMonth() + 1 === M) last = Math.max(last, t.getUTCDate()); }
    autoMemo = { key, R: Core.computeDayReview(S.dets, TL.dets, Y, M), last };
  }
  const { R, last } = autoMemo, TH = WF_T(), raw = new Map(ctx.rawAdh.map(x => [normName(x.name), x.days]));
  const byPerson = new Map(), edits = attEditsOf(ymKey(Y, M)) || new Map();
  let people = 0;
  for (const p of ctx.roster) {
    const exp = normSpace(normSpace(p.sys) ? p.sys : p.name), ek = normName(exp), rv = R.get(ek), ed = edits.get(p._id);
    if (!rv && !ed) continue;
    const days = new Array(ND).fill(null), auto = new Array(ND).fill(null);
    if (rv) {
      const ad = raw.get(ek);
      for (const o of rv.days) {
        if (o.day > last) continue;
        const j = Core.judgeDay(o, ad ? ad[o.day - 1] ?? null : null, TH);
        auto[o.day - 1] = j.leave ? leaveCode(j.leave) : j.none ? 'OFF' : j.absent ? 'Absent' : j.late ? j.late : 'Attend';
      }
      for (let i = 0; i < last; i++) if (auto[i] == null) auto[i] = 'OFF';
    }
    for (let i = 0; i < ND; i++) days[i] = auto[i];
    if (ed && ed.days) for (const [d, e] of Object.entries(ed.days)) { const i = +d - 1; if (i >= 0 && i < ND) days[i] = e.v === '' ? null : e.v; }
    const t = days.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
    byPerson.set(p._id, { days, auto, tardyFile: null, dayTardy: t, srcs: ['Genesys'], filled: days.filter(v => v != null).length, edited: ed ? Object.keys(ed.days || {}).length : 0 });
    people++;
  }
  return { byPerson, files: [], unmatched: [], clashes: [], missing: [], partial: [], cross: [], idFills: [], fixes: [], warns: [], auto: true, last,
    stats: { files: 0, people, tardy: [...byPerson.values()].reduce((s, a) => s + (a.dayTardy || 0), 0) } };
}
/** the supervisors' corrections, kept live for each month that is looked at (once per month) */
const attEditsOf = k => state.attEditsBy[k] || null;
function watchAttEdits(k) {
  if (!state.db || !k || state.attEditsBy[k]) return;
  state.attEditsBy[k] = new Map();
  try {
    state.db.collection(`att/${k}/edits`).onSnapshot(sn => {
      state.attEditsBy[k] = new Map(sn.docs.map(d => [d.id, d.data()])); state.attEditsVer++;
      if (state.ws === 'build' && isBuilder() && ymKey(state.y, state.m) === k) refresh(); else if (state.ws !== 'build') renderWs();
    }, () => {});
  } catch (e) { /* none */ }
}
/** the corrections on top of the supervisors' sheets, when sheets are used */
function overlayAttEdits(byPerson) {
  const k = monthKey(); watchAttEdits(k);
  const E = attEditsOf(k); if (!E) return;
  const ND = Core.daysIn(state.y, state.m);
  for (const [pid, ed] of E) {
    if (!ed || !ed.days) continue;
    const cur = byPerson.get(pid) || { days: new Array(ND).fill(null), tardyFile: null, dayTardy: 0, srcs: [], filled: 0 };
    const days = cur.days.slice(); for (const [d, e] of Object.entries(ed.days)) { const i = +d - 1; if (i >= 0 && i < ND) days[i] = e.v === '' ? null : e.v; }
    byPerson.set(pid, { ...cur, days, dayTardy: days.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0), filled: days.filter(v => v != null).length, edited: Object.keys(ed.days).length, srcs: [...(cur.srcs || []), 'supervisor'] });
  }
}
const attPubT = {};
/** a supervisor (only) changes one day for one agent */
function editAttDay(pid, k, day, v, note) {
  const p = state.roster.find(x => x._id === pid), u = Auth.user();
  if (!p || !state.db) return false;
  const mine = roleNow() === 'spv' && u && u.pid && p.spv === u.pid;
  if (!mine) { toast('Only the agent\'s supervisor can change attendance.'); return false; }
  if (monthLocked(k)) { toast(`${ymLabel(k)} is final.`); return false; }
  watchAttEdits(k); const E = attEditsOf(k), cur = E ? E.get(pid) : null, days = { ...((cur && cur.days) || {}) };
  if (v == null) delete days[day]; else days[day] = { v, note: normSpace(note || ''), by: whoNow(), at: new Date().toISOString() };
  const body = { days, n: supName(pid) || p.name };
  if (E) { E.set(pid, body); state.attEditsVer++; }
  queueWrite(`att/${k}/edits/${pid}`, () => state.db.doc(`att/${k}/edits/${pid}`).set(body));
  markFresh('attendance', `${p.name}, ${day} ${MON[+k.slice(5) - 1]}`);
  clearTimeout(attPubT[pid]); if (agentHasAccount(pid)) attPubT[pid] = setTimeout(() => publishAgent(pid, k, { quiet: true }), 900);   // the agent's own page follows
  return true;
}

// ---------------------------------------------------------------- freshness: when each kind of data last came in, for every page
const FRESH_KINDS = [['month', 'Month exports'], ['kpi', 'KPI file'], ['quality', 'Quality EVAL'], ['daily', 'Daily data'], ['dailymail', 'Daily emails'], ['dayagents', 'Agents\' days'], ['inter', 'Interactions'], ['attendance', 'Attendance edits'], ['roster', 'Roster']];
function markFresh(kind, what) {
  if (!state.db) return;
  const body = { at: new Date().toISOString(), by: whoNow() || '', what: String(what || '') };
  state.fresh[kind] = body;
  queueWrite('fresh/' + kind, () => state.db.doc('fresh/' + kind).set(body)).catch(() => {});
  renderFresh();
}
function ago(iso) {
  if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now'; if (s < 3600) return `${Math.round(s / 60)} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400); return d === 1 ? 'yesterday' : `${d} days ago`;
}
function renderFresh() {
  const el = $('freshBar'); if (!el) return;
  const r = roleNow(), show = Auth.user() && r !== 'pending' && r !== 'agent' && Object.keys(state.fresh).length;
  if (!show) { el.hidden = true; return; }
  const chips = FRESH_KINDS.filter(([k]) => state.fresh[k] && (k !== 'roster' || isBuilder()) && (k !== 'dailymail' || canDailyMail() || canDailyTool())).map(([k, l]) => {
    const f = state.fresh[k], age = (Date.now() - new Date(f.at).getTime()) / 86400000, cls = age <= 1.2 ? 'ok' : age <= 7 ? '' : 'old';
    return `<span class="fc ${cls}" data-tt="${esc(`${l}: ${f.what || ''} · ${new Date(f.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${f.by ? ' by ' + f.by : ''}`)}"><i></i><b>${esc(l)}</b> ${esc(f.what ? f.what + ' · ' : '')}${esc(ago(f.at))}</span>`;
  });
  el.hidden = !chips.length;
  el.innerHTML = `<span class="fl">Last data</span>${chips.join('')}`;
}
setInterval(() => { if (!document.hidden) renderFresh(); }, 60000);

// ---------------------------------------------------------------- contacts for the emails (the senior manager keeps them)
const CONTACTS0 = { vp: 'Rasha Mugaddam <rasha.mogaddam@beyond.one>', senior: 'Mohammed Alshubily <mohammed.alshubily@beyond.one>', mgmt: 'KSA-Member Care Management Team <MemberCareManagementTeam.ksa@beyond.one>', wfm: '',
  form: 'Essam AlZahrani <Essam.Alzhrani@beyond.one>' };   // form: who gets the final result form (as in the senior manager's own email)
const contactsNow = () => ({ ...CONTACTS0, ...(state.contacts || {}) });
const splitAddr = s => String(s || '').split(/[;,\n]+/).map(normSpace).filter(Boolean);
/** "Name <email>" for a roster person, or '' when the roster has no email for them */
function addrOf(pid) { const p = state.roster.find(x => x._id === pid); if (!p || !normSpace(p.email)) return ''; return `${gname(effP(p._id) || p) || p.name} <${normSpace(p.email)}>`; }
/** a ready-to-send Outlook draft (.eml, opens as a new message) with any attachments, in the emails' card (cardMail): card is
 *  { eyebrow, title, foot } (markup: names escaped), the subject when there is none; no logo and no name under the text, because
 *  Outlook adds the company signature to every new email */
async function saveEml(name, { to, cc, subject, html, text, files, card }) {
  const logo = null, fn = name.replace(/[\\/:*?"<>|]/g, '') + '.eml', cd = card || {};
  const body = cardMail({ eyebrow: cd.eyebrow || 'MC Workforce', title: cd.title || esc(subject), body: html, foot1: 'Member Care · Workforce Management', foot2: cd.foot || esc(subject), logo: '', preview: false });
  const bytes = enc8.encode(emlFile({ to: to || [], cc: cc || [], subject, text: text || htmlText(html), html: body, attach: files || [], logo }));
  let c = await saveRaw(fn, new Blob([bytes], { type: 'message/rfc822' }));
  if (c === 'rejected_extension' || c === 'extension_not_enabled') { const zn = fn.replace(/\.eml$/, '.zip'); c = await saveRaw(zn, new Blob([await Core.writeZip([{ name: fn, data: bytes }])], { type: 'application/zip' })); if (c === 'ok') { toast(`Saved ${zn}: the .eml is inside the zip.`); return true; } }
  toast(c === 'ok' ? `Saved ${fn}. Open it for a ready-to-send Outlook draft.` : saveMsg(c, fn));
  return c === 'ok';
}
const htmlText = h => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|li|h\d)>/gi, '\n').replace(/<\/t[dh]>/gi, '\t').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
// the parts of an email's body, in the emails' card (ui3.js: cardP, cardH, cardTable, cardBand); each takes markup (names escaped)
const mP = (t, st) => cardP(t, st);
/** the greeting ("Dear Team Leaders,") and the closing ("Best regards,") */
const mHi = t => `<p class="MsoNormal" style="margin:0 0 12pt 0;${CF}"><b><span style="font-size:11.5pt;color:${CARD.ink}">${t}</span></b></p>`;
const mSign = t => `<p class="MsoNormal" style="margin:20pt 0 0 0;${CF}"><span style="font-size:10.5pt;color:${CARD.soft}">${t}</span></p>`;
const mH = (t, note) => cardH(t, note);
/** the status band: tone true (done, final) green, false (a deadline, for review) amber, 'late' red, 'info' blue */
const mBand = (tone, label, value) => cardBand(tone, label, value);
/** a table: rows of cells (markup); widths marks the columns of numbers with 'r' (centred), the others read from the left */
function mTable(head, rows, widths) {
  return cardTable(head, rows.map(r => r.map(t => ({ t }))), head.map((h, i) => i).filter(i => !(widths && widths[i] === 'r')));
}

// ---------------------------------------------------------------- Outlook .msg: the body text (for the Teams Distribution email)
function msgBodyText(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), u32 = o => dv.getUint32(o, true), u16 = o => dv.getUint16(o, true);
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]; if (sig.some((b, i) => u8[i] !== b)) throw new Error('not an Outlook message');
  const ss = 1 << u16(30), mss = 1 << u16(32), nfat = u32(44), dir0 = u32(48), cutoff = u32(56), mf0 = u32(60), nmf = u32(64), dif0 = u32(68), ndif = u32(72);
  const sec = i => u8.subarray((i + 1) * ss, (i + 2) * ss);
  const difat = []; for (let i = 0; i < 109; i++) difat.push(u32(76 + i * 4));
  let s = dif0; for (let k = 0; k < ndif && s < 0xFFFFFFFA; k++) { const b = sec(s), v = new DataView(b.buffer, b.byteOffset, b.byteLength); for (let i = 0; i < ss / 4 - 1; i++) difat.push(v.getUint32(i * 4, true)); s = v.getUint32(ss - 4, true); }
  const fat = []; for (const x of difat.slice(0, nfat)) { if (x >= 0xFFFFFFFA) continue; const b = sec(x), v = new DataView(b.buffer, b.byteOffset, b.byteLength); for (let i = 0; i < ss / 4; i++) fat.push(v.getUint32(i * 4, true)); }
  const chain = (st, F) => { const out = [], seen = new Set(); while (st < 0xFFFFFFFA && !seen.has(st)) { seen.add(st); out.push(st); st = F[st]; } return out; };
  const cat = list => { const out = new Uint8Array(list.reduce((a, b) => a + b.length, 0)); let o = 0; for (const b of list) { out.set(b, o); o += b.length; } return out; };
  const minifat = []; if (nmf) for (const x of chain(mf0, fat)) { const b = sec(x), v = new DataView(b.buffer, b.byteOffset, b.byteLength); for (let i = 0; i < ss / 4; i++) minifat.push(v.getUint32(i * 4, true)); }
  const dir = cat(chain(dir0, fat).map(sec)), dv2 = new DataView(dir.buffer, dir.byteOffset, dir.byteLength), ents = [];
  for (let i = 0; i < dir.length / 128; i++) {
    const o = i * 128, nl = dv2.getUint16(o + 64, true), name = new TextDecoder('utf-16le').decode(dir.subarray(o, o + Math.max(0, nl - 2)));
    ents.push({ name, type: dir[o + 66], left: dv2.getUint32(o + 68, true), right: dv2.getUint32(o + 72, true), child: dv2.getUint32(o + 76, true), start: dv2.getUint32(o + 116, true), size: dv2.getUint32(o + 120, true) });
  }
  const root = ents[0], mini = root.size ? cat(chain(root.start, fat).map(sec)) : new Uint8Array(0);
  const read = e => e.size < cutoff ? cat(chain(e.start, minifat).map(x => mini.subarray(x * mss, (x + 1) * mss))).subarray(0, e.size) : cat(chain(e.start, fat).map(sec)).subarray(0, e.size);
  const top = []; const walk = i => { if (i === 0xFFFFFFFF || i >= ents.length) return; const e = ents[i]; walk(e.left); walk(e.right); top.push(e); };
  walk(root.child);
  const body = top.find(e => e.name === '__substg1.0_1000001F'); if (!body) throw new Error('no text body in this message');
  return new TextDecoder('utf-16le').decode(read(body));
}
/** "Name / Team" pairs from a pasted table, a CSV/Excel sheet (rows) or the email's text (one value per line) */
function distributionPairs(input) {
  const out = [];
  if (Array.isArray(input)) {   // rows of a sheet
    const hi = input.findIndex(r => r && r.some(v => /^(name|agent( name)?|employee)$/i.test(normSpace(v))) && r.some(v => /^(team|team lead(er)?|supervisor|leader|spv|lead)$/i.test(normSpace(v))));
    if (hi < 0) return out;
    const H = input[hi].map(v => normSpace(v).toLowerCase()), ni = H.findIndex(v => /^(name|agent( name)?|employee)$/.test(v)), ti = H.findIndex(v => /^(team|team lead(er)?|supervisor|leader|spv|lead)$/.test(v));
    for (const r of input.slice(hi + 1)) { const n = normSpace(r && r[ni]), t = normSpace(r && r[ti]); if (n && t) out.push([n, t]); }
    return out;
  }
  const lines = String(input).split(/\r?\n/).map(l => normSpace(l.replace(/[​-‍﻿]/g, ''))).filter(Boolean);
  if (lines.some(l => l.includes('\t'))) { for (const l of lines) { const [a, b] = l.split('\t').map(normSpace); if (a && b && !/^name$/i.test(a)) out.push([a, b]); } return out; }
  const i0 = lines.findIndex((l, i) => /^name$/i.test(l) && /^(team|supervisor|team lead)$/i.test(lines[i + 1] || ''));
  if (i0 < 0) return out;
  for (let i = i0 + 2; i + 1 < lines.length; i += 2) {
    const a = lines[i], b = lines[i + 1];
    if (!a || !b || /^(regards|thanks|best|kind regards)/i.test(a) || a.length > 60 || b.length > 24 || b.split(' ').length > 3 || /@|www\.|http|manager|director|specialist|supervisor\b/i.test(a + ' ' + b)) break;
    out.push([a, b]);
  }
  return out;
}
/** Arabic names in Latin letters are spelt many ways (Juhani / Johani, Qabsani / Gabssani, Zein Aldeen / Zeinaldeen, Ghaith / Geath):
    compare their consonants, with Al / Bin joined or dropped */
const nameSkel = w => String(w || '').replace(/gh/g, 'g').replace(/q/g, 'g').replace(/ph/g, 'f').replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
function nameToks(s) {
  const t = normName(s).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < t.length; i++) { const w = t[i]; if (['bin', 'ibn', 'bint'].includes(w)) continue; if (['al', 'el'].includes(w) && t[i + 1]) { out.push(w + t[++i]); continue; } out.push(w); }
  return out;
}
/** 0.9 when the first name and the family name (the last one or two words) sound the same */
function distScore(a, b) {
  const A = nameToks(a), B = nameToks(b); if (A.length < 2 || B.length < 2) return 0;
  const sk = x => nameSkel(x), f = sk(A[0]), g = sk(B[0]);
  if (f !== g) return 0;
  const lasts = [A[A.length - 1], A.length >= 3 ? A[A.length - 2] + A[A.length - 1] : null].filter(Boolean).map(sk), rest = new Set();
  for (let i = 1; i < B.length; i++) { rest.add(sk(B[i])); if (i + 1 < B.length) rest.add(sk(B[i] + B[i + 1])); }
  return lasts.some(x => x.length >= 2 && rest.has(x)) ? 0.9 : 0;
}
/** match the pairs to the roster: the agents by name, each team lead (often a first name) to a roster person who is not one of the agents */
function planDistribution(pairs) {
  const R = rosterRows(), agentKeys = new Set(), plan = [], unmatched = [], leads = new Map();
  const sc = (n, p) => Math.max(Core.nameScore(n, p.name), normSpace(p.sys) ? Core.nameScore(n, p.sys) : 0, distScore(n, p.name), normSpace(p.sys) ? distScore(n, p.sys) : 0);
  const findP = n => { let best = null, bs = 0, sec = 0; for (const p of R) { const s = sc(n, p); if (s > bs) { sec = bs; bs = s; best = p; } else if (s > sec) sec = s; } return best && bs >= 0.78 && bs - sec >= 0.06 ? best : null; };
  for (const [n] of pairs) { const p = findP(n); if (p) agentKeys.add(p._id); }
  const leadOf = t => {
    if (leads.has(t)) return leads.get(t);
    const k = normName(t), ks = nameSkel(k), cands = R.filter(p => !agentKeys.has(p._id) && [p.name, p.sys].some(x => normName(x || '').split(' ').some(w => w === k || (k.length >= 4 && w.startsWith(k)) || (ks.length >= 3 && nameSkel(w) === ks))));
    const pref = cands.filter(p => ['MG', 'OP', 'QA', 'TS', 'WF'].includes(normSpace(p.team)));
    const pick = (pref.length === 1 ? pref[0] : cands.length === 1 ? cands[0] : null) || findP(t);
    leads.set(t, pick || null); return pick || null;
  };
  for (const [n, t] of pairs) {
    const p = findP(n), lead = leadOf(t);
    if (!p || !lead) { unmatched.push({ n, t, why: !p ? 'not in the roster' : `team lead "${t}" not found` }); continue; }
    if (p._id === lead._id) { unmatched.push({ n, t, why: 'is their own team lead' }); continue; }
    plan.push({ pid: p._id, name: gname(p) || p.name, spv: lead._id, spvName: gname(lead) || lead.name, was: p.spv || '' });
  }
  return { plan, unmatched, leads: [...leads].map(([t, p]) => ({ t, pid: p ? p._id : '', name: p ? gname(p) || p.name : '' })) };
}
function applyDistribution(plan) {
  let n = 0; for (const x of plan) { if (x.was === x.spv) continue; updatePerson(x.pid, { spv: x.spv }, { quiet: true }); n++; }
  refresh(); markFresh('roster', `supervisors for ${plural(plan.length, 'person', 'people')}`); return n;
}

// ---------------------------------------------------------------- what an agent may see: copies in the agent's own (locked) place
/** write one agent's profile, month row and forms for a month: the agent's page reads only these */
async function publishAgent(pid, k, opts = {}) {
  if (!state.db || !Auth.user() || !Auth.STAFF.has(roleNow())) return false;
  const p = state.roster.find(x => x._id === pid); if (!p) return false;
  const pp = effP(pid) || p, sp = supOfP(p);
  const prof = { name: gname(pp) || p.name, nid: Core.cleanId(pp.nid) || '', brand: p.brand || '', team: p.team || '', teamName: DEP_NAMES[p.team] || '', email: normSpace(p.email || ''),
    spv: sp ? sp._id : '', spvName: sp ? gname(sp) || sp.name : '', spvEmail: sp ? normSpace(sp.email || '') : '', at: new Date().toISOString() };
  try {
    await state.db.doc(`agent/${pid}`).set(prof);
    if (k) {
      const r = rowOf(pid, k);
      const I = interOf(k, p);
      const q = qRow(k, pid), Q = q ? { callqa: q.eval ? q.eval.callqa ?? null : null, ticketqa: q.eval ? q.eval.ticketqa ?? null : null, cr: q.eval ? q.eval.cr ?? null : null, qobs: q.kpi && q.kpi.qobs != null ? q.kpi.qobs : q.eval ? q.eval.final ?? null : null, crit: (q.crit || []).map(c => ({ type: c.type, n: c.n || 1 })), status: q.status || '' } : null;
      const mtd = mtdProj(pid, k);   // a month still running: where it is heading
      if (r) await state.db.doc(`agent/${pid}/months/${k}`).set({ k, status: monthLocked(k) ? 'final' : 'draft', row: { ...agentRowCopy(r), ...(I ? { inter: I } : {}), ...(Q ? { q: Q } : {}) }, ...(mtd ? { mtd } : {}), objUntil: calDue(k, 'objections'), at: new Date().toISOString(), by: whoNow() });
      for (const f of formsOf(pid, k)) await state.db.doc(`agent/${pid}/forms/${f.id}`).set(formLookup(f.id) || f);
    }
    return true;
  } catch (e) { if (!opts.quiet) toast(`Could not share with the agent (${(e && e.code) || 'error'}).`); return false; }
}
/** the month row an agent sees: their own numbers, without anything about other people */
function agentRowCopy(r) { const o = {}; for (const [k, v] of Object.entries(r)) if (!k.startsWith('_') || k === '_adj') o[k] = v; if (r._el) o.el = r._el; return o; }
async function publishMonthToAgents(k, pids) {
  const all = Auth.folder() ? (await Auth.people()).filter(a => a.role === 'agent' && a.pid) : (await Auth.people()).filter(a => a.role === 'agent' && a.pid);
  const want = new Set(pids || all.map(a => a.pid)); let n = 0;
  for (const a of all) if (want.has(a.pid) && await publishAgent(a.pid, k, { quiet: true })) n++;
  if (!pids && n && state.history[k] && !state.history[k].daily) calAuto(k, 'shared');   // the month-close step "results on the agents' pages"
  return n;
}

// ---------------------------------------------------------------- the Teams Distribution: who is in which supervisor's team
/** show what the distribution changes in the roster's Supervisor column, before it is applied */
function showDistribution(pairs, src) {
  if (!isBuilder()) { toast('The WFM team updates the roster.'); return; }
  const d = planDistribution(pairs), changes = d.plan.filter(x => x.was !== x.spv), same = d.plan.length - changes.length;
  mergePlan = { dist: d, src };
  $('h-confirm').textContent = 'Teams Distribution';
  const lim = (list, f, n = 10) => list.slice(0, n).map(f).join('') + (list.length > n ? `<li class="subtle">and ${list.length - n} more</li>` : '');
  $('confirmBody').innerHTML = `<p style="margin:0">From <b>${esc(src)}</b>: ${plural(pairs.length, 'agent')} in ${plural(new Set(pairs.map(p => p[1])).size, 'team')}.</p>
    <div class="minis"><div><b>${changes.length}</b><span>supervisor changes</span></div><div><b>${same}</b><span>already right</span></div><div><b>${d.unmatched.length}</b><span>not matched</span></div></div>
    <section class="sec"><h3>Team leads</h3><ul class="ilist">${d.leads.map(l => `<li><span class="nm">"${esc(l.t)}"</span><span class="sg">${l.pid ? esc(l.name) : '<span class="bad">not found in the roster</span>'}</span></li>`).join('')}</ul></section>
    ${changes.length ? `<section class="sec"><h3>Changes</h3><ul class="ilist">${lim(changes, x => `<li><span class="nm" dir="auto">${esc(x.name)}</span><span class="sg">${x.was ? `${esc(supName(x.was))} → ` : ''}<b>${esc(x.spvName)}</b></span></li>`)}</ul></section>` : ''}
    ${d.unmatched.length ? `<section class="sec"><h3>Not matched</h3><ul class="ilist">${lim(d.unmatched, u => `<li><span class="nm" dir="auto">${esc(u.n)}</span><span class="sg">${esc(u.t)} · ${esc(u.why)}</span></li>`, 20)}</ul><p class="hint">Fix these in the roster's Supervisor column by hand (start typing the supervisor's name).</p></section>` : ''}
    <p class="hint">Only the Supervisor column changes. People who are not in the distribution keep their supervisor.</p>`;
  $('confirmOk').disabled = !changes.length; $('confirmOk').textContent = changes.length ? `Apply ${plural(changes.length, 'change')}` : 'Nothing to change';
  openDrawer('dConfirm');
}
async function importDistributionMsg(file) {
  let text; try { text = msgBodyText(new Uint8Array(await file.arrayBuffer())); } catch (e) { toast(`${file.name}: ${(e && e.message) || 'could not read the email'}.`); return; }
  const pairs = distributionPairs(text);
  if (!pairs.length) { toast(`${file.name}: no "Name / Team" table in this email.`); return; }
  showDistribution(pairs, file.name);
}
function openDistPaste() {
  if (!isBuilder()) return;
  mergePlan = null; $('h-confirm').textContent = 'Teams Distribution';
  $('confirmBody').innerHTML = `<p style="margin:0">Paste the Name / Team table from the Teams Distribution email (or from Excel), or drop the email (.msg) on Import.</p>
    <textarea id="distText" rows="12" class="cell" placeholder="Name&#9;Team&#10;Ahmed Ali&#9;Mohammed&#10;…" spellcheck="false"></textarea>
    <p class="hint">Each row: the agent's name, then the team lead (a first name is enough when it is clear who it is). The tool matches both to the roster and shows the changes first.</p>
    <button class="btn primary" id="distRead">Read the table</button>`;
  $('confirmOk').disabled = true; $('confirmOk').textContent = 'Apply';
  openDrawer('dConfirm'); setTimeout(() => $('distText').focus(), 50);
}
$('confirmBody').addEventListener('click', e => {
  if (!e.target.closest('#distRead')) return;
  const pairs = distributionPairs($('distText').value);
  if (!pairs.length) { toast('No Name / Team rows found. Paste the table with its header row (Name, Team).'); return; }
  showDistribution(pairs, 'the pasted table');
});
