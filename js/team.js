// ================================================================ TEAM: the supervisor's page (and every team, for the managers)
// The supervisor sees the team's own KPIs (each agent KPI averaged over the team), their supervisor scorecard, the one-to-one
// board with the agents' signatures, the agents waiting for approval, and the month's attendance, which only they can correct.
// Earned SR is not shown to supervisors. "Finish my team" tells the senior manager (in the tool, and with an email draft).

// ---------------------------------------------------------------- KPI values as numbers, and their averages over a team
const KPI_INDEX = () => { const m = new Map(); for (const c of [...Object.values(curCards().teams), ...allTeamCards()]) for (const k of c.kpis) if (!m.has(k.id)) m.set(k.id, k); return m; };
function kpiNum(txt, k) {   // a saved KPI result ("95.2%", "3:12", "150.3") back to a number in the KPI's unit
  if (txt == null) return null; const s = normSpace(txt); if (!s || s === '–') return null;
  if (/%$/.test(s)) { const v = parseFloat(s); return Number.isFinite(v) ? v / 100 : null; }
  if (/^\d+:\d{2}$/.test(s)) { const [mm, ss] = s.split(':').map(Number); return mm * 60 + ss; }
  const v = parseFloat(s); return Number.isFinite(v) ? (k && k.unit === 'pct' && v > 1.5 ? v / 100 : v) : null;
}
const kfmt = (k, v) => (v == null ? '–' : k.unit === 'pct' ? pct1(v) : k.unit === 'sec' ? mss(v) : k.unit === 'min' ? `${Math.round(v)} min` : String(Math.round(v * 10) / 10));
function cardOfRow(r) { return (r && r.kc && allTeamCards().find(c => c.title === r.kc)) || (r ? cardFor(r.team) : null); }
/** each KPI: the team's average, the department's, and how many agents reached the top band */
function teamKpiStats(rows, deptRows) {
  const collect = L => {
    const m = new Map();
    for (const r of L) {
      if (!r || !r.kpi) continue; const c = cardOfRow(r); if (!c) continue;
      r.kpi.forEach(([nm, , , txt, rk], i) => {
        const k = c.kpis[i] && c.kpis[i].name === nm ? c.kpis[i] : c.kpis.find(x => x.name === nm); if (!k) return;
        const v = r.kv && r.kv[k.id] != null ? r.kv[k.id] : kpiNum(txt, k), e = m.get(k.id) || { k, vals: [], ranks: [] };
        if (v != null) e.vals.push(v); if (rk != null) e.ranks.push(rk); m.set(k.id, e);
      });
    }
    return m;
  };
  const T = collect(rows), D = collect(deptRows || []), out = [];
  for (const [id, e] of T) { const d = D.get(id); out.push({ k: e.k, n: e.vals.length, avg: mean(e.vals), dept: d ? mean(d.vals) : null, rank: mean(e.ranks), top: e.ranks.filter(x => x === 5).length, of: e.ranks.length }); }
  return out;
}

// ---------------------------------------------------------------- the supervisors' scorecard (the senior manager sets it)
const SPV_PCT4 = [0.95, 0.90, 0.85, 0.80];
const SPVCARD0 = () => ({ title: 'Supervisor scorecard', base: 0, items: [
  { id: 'fin', name: 'Team final %', src: 'team', key: 'fin', dir: 'high', weight: 0.40, bands: SPV_PCT4.slice() },
  { id: 'adh', name: 'Team adherence', src: 'team', key: 'adh', dir: 'high', weight: 0.10, bands: SPV_PCT4.slice() },
  { id: 'qobs', name: 'Team quality observations', src: 'kpi', key: 'qobs', dir: 'high', weight: 0.10, bands: SPV_PCT4.slice() },
  { id: 'one', name: 'One-to-ones held by the deadline', src: 'one', key: '', dir: 'high', weight: 0.05, bands: [1, 0.95, 0.9, 0.8] },
  ...LEADER_ITEMS.map(([key, name, w]) => ({ id: 'l_' + key, name, src: 'lead', key, dir: 'high', weight: w, max: w })),
] });
const spvCardNow = () => (state.spvCard && Array.isArray(state.spvCard.items) && state.spvCard.items.length ? state.spvCard : SPVCARD0());
const SPV_SRC = [['team', 'Team average of'], ['kpi', 'Team average of the KPI'], ['one', 'One-to-ones held by the deadline'], ['follow', 'Follow-up of last month\'s one-to-ones'], ['lead', 'Quality team: leader item'], ['manual', 'Typed by the senior manager']];
const FOLLOW_ITEMS = [['done', 'Last month\'s actions done'], ['kpi', 'KPIs better after the one-to-one']];
function spvItemUnit(it) { if (it.src === 'lead' || it.src === 'one' || it.src === 'follow') return 'pct'; if (it.src === 'kpi') { const k = KPI_INDEX().get(it.key); return k ? k.unit : 'pct'; } if (it.src === 'team') return ['adh', 'fin', 'conf', 'occ', 'heldR', 'xferR'].includes(it.key) ? 'pct' : TIMEK.has(it.key) ? 'sec' : 'num'; return it.unit || 'pct'; }
function spvItemFmt(it, v) { if (v == null) return '–'; const u = spvItemUnit(it); if (it.src === 'lead') return `${pct(v, 1)} of ${pct(it.max || 0, 0)}`; return u === 'pct' ? pct1(v) : u === 'sec' ? mss(v) : String(Math.round(v * 10) / 10); }
function spvItemTarget(it) { if (it.src === 'lead') return `${pct(it.max || 0, 0)} (full marks)`; const b = it.bands || []; if (b[0] == null || b[0] === '') return ''; const u = spvItemUnit(it); return `${it.dir === 'low' ? '≤' : '≥'} ${u === 'pct' ? pct1(+b[0]) : u === 'sec' ? mss(+b[0]) : b[0]}`; }
/** the supervisor's scorecard for a month: each item's value, its score (0-1) and the final % */
function spvScore(spvPid, k) {
  const card = spvCardNow(), team = teamOf(spvPid).filter(p => p.status !== 'Inactive'), map = k ? rowsByPid(k) : new Map();
  const rows = team.map(p => map.get(p._id)).filter(Boolean), C = state.cycles[k] || {}, dl = C.deadline || '';
  const Q = state.quality[k], lead = Q && Q.leaders ? Q.leaders[spvPid] : null, KS = teamKpiStats(rows);
  const items = card.items.map(it => {
    let v = null, r = null, s = null;
    if (it.src === 'team') { const mt = History.METRICS.find(m => m.k === it.key); v = mean(rows.map(x => (mt ? History.valOf(x, mt) : x[it.key]))); }
    else if (it.src === 'kpi') { const e = KS.find(x => x.k.id === it.key); v = e ? e.avg : null; }
    else if (it.src === 'one') {
      const due = dl ? new Date(dl + 'T23:59:59') : null;
      const held = team.filter(p => { const os = oneStatus(p._id, k); if (!(os.st === 'held' || os.st === 'closed')) return false; if (!due) return true; const w = os.o.date ? new Date(os.o.date + 'T12:00:00') : os.o.savedAt ? new Date(os.o.savedAt) : null; return !w || w <= due; }).length;
      v = team.length ? held / team.length : null;
    } else if (it.src === 'follow') { let F = {}; try { F = fuStats(spvPid, k); } catch (e) { console.error('[MC] fuStats:', e); } v = F[it.key === 'kpi' ? 'kpi' : 'done'] ?? null; }
    else if (it.src === 'lead') v = lead && lead.items && lead.items[it.key] != null ? lead.items[it.key] : null;
    else if (it.src === 'manual') v = C.manual && C.manual[spvPid] && C.manual[spvPid][it.id] != null ? C.manual[spvPid][it.id] : null;
    if (v != null && Number.isFinite(v)) {
      if (it.src === 'lead') s = it.max ? Math.max(0, Math.min(1, v / it.max)) : null;
      else { r = Kpi.rank({ dir: it.dir || 'high', bands: (it.bands || []).map(x => (x === '' || x == null ? null : +x)) }, v); s = r / 5; }
    }
    return { it, v, r, s };
  });
  const have = items.filter(x => x.s != null), wH = have.reduce((a, x) => a + (+x.it.weight || 0), 0);
  const finalPct = wH > 0 ? have.reduce((a, x) => a + x.s * (+x.it.weight || 0), 0) / wH : null;
  const base = +card.base || 0;
  return { items, finalPct, missing: items.filter(x => x.s == null).map(x => x.it.name), team: team.length, rows: rows.length, earned: base > 0 && finalPct != null ? Math.round(base * finalPct) : null };
}
function spvScoreHtml(spvPid, k, opts = {}) {
  const S = spvScore(spvPid, k), card = spvCardNow();
  return `<div class="card spvcard"><div class="cardhead"><div><h2>${esc(opts.title || card.title || 'Supervisor scorecard')}</h2><p class="cap">${esc(opts.cap || 'Set by the senior manager. Team items are your agents\' averages; the leader items come from the quality team\'s EVAL.')}</p></div>
    <div class="bigpct"><b>${pct1(S.finalPct)}</b><span>Final</span></div></div>
    <div class="tablewrap formtab"><table><thead><tr><th>Item</th><th class="r">Weight</th><th>Target</th><th class="r">Result</th><th class="r">Score</th></tr></thead><tbody>
    ${S.items.map(x => `<tr${x.s == null ? ' class="muted"' : ''}><td>${esc(x.it.name)}</td><td class="r">${+(x.it.weight * 100).toFixed(1)}%</td><td>${esc(spvItemTarget(x.it))}</td><td class="r num">${esc(spvItemFmt(x.it, x.v))}</td><td class="r">${x.r != null ? rankChip(x.r) : x.s != null ? `<span class="num">${pct(x.s, 0)}</span>` : '<span class="rk na">–</span>'}</td></tr>`).join('')}
    </tbody></table></div>${S.missing.length ? `<p class="hint">No value yet: ${esc(S.missing.join(', '))}. The final uses the items that have one.</p>` : ''}${opts.showSR && S.earned != null ? `<p class="hint">Earned: ${S.earned.toLocaleString('en-US')} SR.</p>` : ''}</div>`;
}
function teamKpiHtml(rows, deptRows, k) {
  const KS = teamKpiStats(rows, deptRows); if (!KS.length) return '';
  return `<div class="card"><div class="cardhead"><div><h2>Team KPIs · ${esc(ymLabel(k))}</h2><p class="cap">Every KPI of your agents' scorecards, averaged over the team: your own KPIs as a supervisor. The bar is the team; the tick is the department.</p></div></div>
    <div class="tkpis">${KS.map(x => {
      const lo = x.k.unit === 'pct' ? 0.5 : 0, hi = x.k.unit === 'pct' ? 1 : Math.max(x.avg || 0, x.dept || 0, +(x.k.bands || [])[0] || 0) * 1.25 || 1, X = v => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
      const t0 = (x.k.bands || [])[0], good = x.avg != null && t0 != null && (x.k.dir === 'low' ? x.avg <= t0 + 1e-9 : x.avg >= t0 - 1e-9);
      return `<div class="tk${good ? ' good' : x.avg != null && t0 != null ? ' low' : ''}" data-tt="${esc(`${x.k.name}: team ${kfmt(x.k, x.avg)} · department ${kfmt(x.k, x.dept)} · ${x.top} of ${x.of} agents in the top band`)}"><span class="nm">${esc(x.k.name)}</span><b>${esc(kfmt(x.k, x.avg))}</b>
        <span class="track">${x.avg != null ? `<span class="fill" style="width:${X(x.avg).toFixed(1)}%"></span>` : ''}${x.dept != null ? `<span class="ref" style="left:${X(x.dept).toFixed(1)}%"></span>` : ''}</span>
        <small>Target ${esc(Kpi.target(x.k) || '–')} · department ${esc(kfmt(x.k, x.dept))} · ${x.top}/${x.of} top band</small></div>`;
    }).join('')}</div></div>`;
}

// ---------------------------------------------------------------- signatures: what each agent signed (read from the agent's own place)
/** a short fingerprint of what a form says (changes after signing show) */
function formHash(f) {
  if (!f) return '';
  const keep = ['kind', 'period', 'supervisor', 'date', 'heldOn', 'topics', 'results', 'details', 'followup', 'discussion', 'rootCause', 'agentComments', 'actions', 'reviewDate', 'findings', 'outcome', 'actionPlan', 'consequence'];
  const o = {}; for (const k of keep) if (f[k] !== undefined) o[k] = k === 'results' ? (f.results || []).filter(r => r.on !== false) : f[k];
  if (f.verdict) o.verdict = { d: f.verdict.d, comment: f.verdict.comment || '' };   // the supervisor's final (forms without one keep their fingerprint)
  const s = JSON.stringify(o); let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
const sigOf = id => state.sigs.get(id) || null;
/** 'none' | 'signed' | 'changed' (the form changed after the agent signed) */
function sigState(f) { const g = f ? sigOf(f.id) : null; if (!g) return 'none'; return g.hash && g.hash !== formHash(f) ? 'changed' : 'signed'; }
/** a form's status, with a held form the agent signed counted as closed */
function formSt(f) { const st = f.status || (f.savedAt ? 'held' : 'planned'); return st === 'held' && sigState(f) === 'signed' ? 'closed' : st; }
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
/** where a form stands: 'planned' (with the agent, or a day set), 'review' (the agent sent their part), 'final' (the supervisor
 *  sent the final, waiting for the signature), 'held' (filled in, no final yet) or 'closed' (signed and done) */
function formFlow(f) {
  if (!f) return 'none';
  const st = formSt(f);
  if (st === 'closed') return 'closed';
  if (replyNew(f)) return 'review';
  if (f.verdict) return 'final';
  return st;
}
function sigChip(f) {
  if (!f) return '';
  const acct = agentHasAccount(f.pid), fl = formFlow(f), s = sigState(f), g = sigOf(f.id), who = esc(firstName(f.agent && f.agent.name) || 'The agent');
  if (s === 'signed') return `<span class="sgn ok" title="Signed by the agent in the tool, ${esc(fmtWhen(g.at))}">Signed ✓</span>`;
  if (s === 'changed') return `<span class="sgn warn" title="The form changed after the agent signed on ${esc(fmtWhen(g.at))}; they are asked to sign again">Changed after signing</span>`;
  if (!acct) return '';
  if (fl === 'review') { const rp = replyOf(f.id); return `<span class="sgn todo" title="${who} sent their part ${esc(fmtWhen(rp.at))}">Replied: review it</span>`; }
  if (fl === 'final') return `<span class="sgn${f.verdict.d === 'rejected' ? ' warn' : ''}" title="Your final, sent ${esc(fmtWhen(f.verdict.at))}">Final: ${f.verdict.d === 'rejected' ? 'rejected' : 'accepted'}</span><span class="sgn">Not signed yet</span>`;
  if (fl === 'planned') return `<span class="sgn" title="${who} fills in their part on their own page and sends it to you">With ${who}</span>`;
  if (fl === 'closed') return '';
  return '<span class="sgn warn" title="The agent signs after you send the final">Final not sent</span>';
}
const agentHasAccount = pid => (state.people || []).some(a => a.role === 'agent' && a.pid === pid && !a.disabled);

// ---------------------------------------------------------------- the agent's part: written on their own page, sent to the supervisor
// The agent fills the places the supervisor left empty and sends them (agent/<pid>/reply/<form>). The supervisor reads it,
// accepts or rejects it with a final comment and sends the final back; only then does the agent sign.
Object.assign(state, { replies: new Map(), replyVer: 0, teamSort: 'adh', teamQ: '' });
const AGENT_TXT = { '1to1': ['discussion', 'rootCause', 'agentComments', 'reviewDate'], final: ['agentComments'] };
const replyOf = id => (state.replies && state.replies.get(id)) || null;
/** the agent sent their part and the supervisor has not sent the final since */
function replyNew(f) { const rp = f ? replyOf(f.id) : null; return !!rp && !(f.verdict && f.verdict.at >= rp.at); }
const replySubs = new Map();
function watchReplies() {
  if (!state.db || !Auth.user() || !Auth.STAFF.has(roleNow())) return;
  const want = new Set((state.people || []).filter(a => a.role === 'agent' && a.pid && !a.disabled).map(a => a.pid));
  for (const pid of want) {
    if (replySubs.has(pid)) continue;
    try {
      replySubs.set(pid, state.db.collection(`agent/${pid}/reply`).onSnapshot(sn => {
        for (const [id, x] of [...state.replies]) if (x.pid === pid) state.replies.delete(id);
        sn.docs.forEach(d => { const x = d.data(); if (x && x.at) state.replies.set(d.id, { ...x, pid }); });
        state.replyVer++; if (state.ws === 'team' || state.ws === 'results' || state.ws === 'cycle') renderWs(); else renderToday();
        if (state.form && !$('dForm').hidden && state.replies.has(state.form.id) && withReply(state.form) !== state.form) {   // the form is open: their part comes in now
          readFormInputs(); state.form = withReply(state.form); renderForm(); toast(`${firstName(state.form.agent.name)} sent their part: it is in the form now.`);
        }
      }, () => {}));
    } catch (e) { /* none */ }
  }
}
/** the agent's answers in the empty places (and their rows of agreed actions, after the supervisor's own) */
function mergeReply(f, rp) {
  const o = clone(f), by = new Set(o.byAgent || []);
  for (const k of AGENT_TXT[o.kind] || []) {
    const v = normSpace(rp[k] || '') ? String(rp[k]).trim() : '';
    if (by.has(k) || !normSpace(o[k] || '')) { if (v) { o[k] = v; by.add(k); } else if (by.has(k)) { o[k] = ''; by.delete(k); } }
  }
  if (o.kind === '1to1') {
    const ag = new Set(o.agentRows || []), mine = (o.actions || []).filter((a, i) => !ag.has(i) && a && (normSpace(a.action) || normSpace(a.owner) || a.due));
    const theirs = (rp.actions || []).filter(a => a && (normSpace(a.action) || normSpace(a.owner) || a.due)).slice(0, 8).map(a => ({ action: normSpace(a.action), owner: normSpace(a.owner), due: a.due || '' }));
    const out = [...mine, ...theirs]; while (out.length < 3) out.push({});
    o.actions = out; o.agentRows = theirs.map((x, i) => mine.length + i);
  }
  o.byAgent = [...by]; o.replyAt = rp.at; o.replyBy = rp.name || '';
  return o;
}
/** the form with the agent's newest part in it (the same object when there is nothing new) */
function withReply(f) {
  const rp = f ? replyOf(f.id) : null;
  if (!rp || (f.replyAt && f.replyAt >= rp.at) || (f.verdict && f.verdict.at >= rp.at)) return f;
  return mergeReply(f, rp);
}
/** open a saved form: the agent's part comes in; an arranged one-to-one of an agent without an account is held now (they meet) */
function openSavedForm(f) {
  if (!f) return;
  state.form = withReply(clone(f));
  if (state.form.status === 'planned' && !formLocked(f) && !agentHasAccount(f.pid)) { state.form.status = 'held'; state.form.date = state.form.plannedAt || state.form.date; }
  renderForm(); openDrawer('dForm');
}
/** the supervisor's part is done: held for an agent without an account; the final sent (or signed) for one with an account */
function oneDone(pid, k) {
  const os = oneStatus(pid, k); if (!os.o || !(os.st === 'held' || os.st === 'closed')) return false;
  if (!agentHasAccount(pid)) return true;
  return os.st === 'closed' || (!!os.o.verdict && !replyNew(os.o));
}
/** a supervisor's team for a month: who is done, who is not */
function teamReady(spvPid, k) {
  const team = teamOf(spvPid).filter(p => p.status !== 'Inactive'), left = team.filter(p => !oneDone(p._id, k));
  return { n: team.length, done: team.length - left.length, left };
}
const sigSubs = new Map();
/** follow the signatures of every agent who has an account */
function watchSigs() {
  if (!state.db || !Auth.user() || !Auth.STAFF.has(roleNow())) return;
  const want = new Set((state.people || []).filter(a => a.role === 'agent' && a.pid && !a.disabled).map(a => a.pid));
  for (const pid of want) {
    if (sigSubs.has(pid)) continue;
    try {
      sigSubs.set(pid, state.db.collection(`agent/${pid}/sign`).onSnapshot(sn => {
        for (const [id, g] of [...state.sigs]) if (g.pid === pid) state.sigs.delete(id);
        sn.docs.forEach(d => { const g = d.data(); if (g) state.sigs.set(d.id, { ...g, pid }); });
        state.sigVer++; if (state.ws === 'team' || state.ws === 'results' || state.ws === 'cycle') renderWs();
      }, () => {}));
    } catch (e) { /* none */ }
  }
}

// ---------------------------------------------------------------- the team page
function renderTeam() {
  const k = wsMonthNow(), r = roleNow(), set = state.settings, spv = r === 'spv', u = Auth.user() || {}, showSR = !srHidden();
  const cur = spv ? u.pid : state.wsSpv;
  $('teamEyebrow').textContent = spv ? 'Supervisor' : ROLE_NAME[r] || 'Teams';
  $('h-team').textContent = spv ? 'My team' : cur ? `${supName(cur) || 'Team'}'s team` : 'Every team';
  $('teamSub').textContent = spv ? 'Each agent\'s performance and status for the month, and their one-to-ones.' : r === 'senior' ? 'Every team\'s agents for the month, ranked, and where each one-to-one stands. The supervisors arrange and hold the one-to-ones.'
    : r === 'admin' ? 'Every team\'s agents and one-to-ones for the month.' : 'Every team\'s agents for the month, ranked, with their supervisor. View only: the supervisors hold the one-to-ones.';
  const S = spvList();
  const spvSel = spv ? '' : `<label class="wsfield"><span>Supervisor</span><select class="cell" data-wsspv aria-label="Supervisor"><option value="">Every agent</option>${S.map(a => `<option value="${esc(a.pid)}"${a.pid === state.wsSpv ? ' selected' : ''}>${esc(a.name)} (${a.size})</option>`).join('')}</select></label>`;
  const done = k && cur ? state.spvDone[`${k}_${cur}`] : null;
  // "Finish my team" stays grey until every agent's one-to-one is done (the final sent, for agents with an account)
  const ready = spv && k && u.pid && !done ? teamReady(u.pid, k) : null, can = ready && ready.n && !ready.left.length;
  const finBtn = spv && k && !monthLocked(k) ? (done ? '<button class="btn sm" data-spvreopen>Reopen my team</button>'
    : `<button class="btn sm${can ? ' primary' : ''}" data-spvdone${can ? '' : ` disabled aria-disabled="true" title="${esc(ready && ready.n ? `${ready.left.length} of ${ready.n} still to do: ${ready.left.slice(0, 6).map(p => gname(effP(p._id) || p) || p.name).join(', ')}${ready.left.length > 6 ? '…' : ''}` : 'No agents in your team yet')}"`}><svg width="14" height="14" aria-hidden="true"><use href="#i-check"/></svg>Finish my team${can ? '' : ready && ready.n ? ` · ${ready.done}/${ready.n}` : ''}</button>`) : '';
  $('teamBar').innerHTML = `${monthSelHtml(k, 'data-wsmonth')}${spvSel}<div class="wsacts">${finBtn}<button class="btn sm" data-x="team"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Team Excel</button><button class="btn sm" data-x="teamadh"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Daily adherence</button></div>`;
  const body = $('teamBody'), P = wsPeople();
  if (spv && !u.pid && !(u.scope && scopeCount(u.scope))) { body.innerHTML = emptyCard('Not linked yet', 'Your admin links your account to your name in the roster; your team then shows here.'); return; }
  const wait = spv ? waitingHtml(u.pid) : '';
  if (spv && !P.length) { body.innerHTML = wait + emptyCard('No agents yet', 'Nobody in the roster has you as their supervisor yet. The WFM team fills the Supervisor column in the roster, or imports the Teams Distribution.'); return; }
  if (!k) { body.innerHTML = wait + emptyCard('No months yet', isBuilder() ? 'Build a month on Import; it is saved here by itself as you work.' : 'Your WFM team has not saved a month yet. It appears here as soon as they start building it.'); return; }
  if (monthLocked(k)) loadFrozen(k);
  const map = rowsByPid(k), locked = monthLocked(k) && !isSenior(), canForm = !locked && (spv || r === 'admin');   // the supervisors arrange; the senior manager and the WFM analysts look
  const items = P.map(p => { const pp = effP(p._id) || p; return { p, exp: gname(pp) || p.name, r: map.get(p._id) || null, os: oneStatus(p._id, k), spvN: spvOf(p._id).map(a => a.name).join(', ') }; });
  const R = items.filter(x => x.r).map(x => x.r), A = aggRows(R), deptRows = (monthData(k) || { rows: [] }).rows;
  const held = items.filter(x => x.os.st === 'held' || x.os.st === 'closed').length, arranged = items.filter(x => x.os.st === 'planned').length;
  const signed = items.filter(x => x.os.o && sigState(x.os.o) === 'signed').length, toReview = items.filter(x => x.os.o && replyNew(x.os.o)).length;
  const all = aggRows(deptRows);
  const tiles = tileW(String(items.length), 'agents', `${plural(R.length, 'person', 'people')} in ${ymLabel(k)}`)
    + tileW(pct(A.adh, 1), 'adherence', `department ${pct(all.adh, 1)} · target ${pct(set.target, 0)}`, A.adh != null && A.adh < set.target ? 'alert' : '')
    + tileW(String(A.below), 'below target', 'agents under the adherence target', A.below ? 'alert' : '')
    + tileW(pct1(A.fin), 'final % (KPI)', `department ${pct1(all.fin)}`)
    + (showSR ? tileW(A.earned == null ? '–' : `${Math.round(A.earned).toLocaleString('en-US')}`, 'earned SR', 'incentive for the team') : '')
    + tileW(A.exc == null ? '–' : String(A.exc), 'exceptions', 'late, no sign-on, short, low adherence')
    + tileW(`${held} / ${items.length}`, 'one-to-ones held', `${toReview ? `${toReview} replied, to review · ` : ''}${arranged ? `${arranged} arranged · ` : ''}${signed} signed by the agent`, toReview ? 'alert' : held < items.length ? '' : 'good');
  // the board
  const col = (st, title, hint) => {
    const L = items.filter(x => (st === 'none' ? x.os.st === 'none' : x.os.st === st)).sort((a, b) => st === 'none' ? needScore(b.r, set) - needScore(a.r, set) : (replyNew(b.os.o) - replyNew(a.os.o)) || String((a.os.o || {}).plannedAt || '').localeCompare(String((b.os.o || {}).plannedAt || '')) || byExp(a, b));
    const cut = state.boardAll[st] || L.length <= 8 ? L.length : 6;
    return `<div class="bcol ${st}"><div class="bhead"><b>${esc(title)}</b><span class="cnt">${L.length}</span></div><p class="hint">${esc(hint)}</p>${L.slice(0, cut).map(x => {
      const o = x.os.o, need = needScore(x.r, set), fl = o ? formFlow(o) : 'none', acct = agentHasAccount(x.p._id);
      // what the supervisor does next: review the agent's part, fill in (no account: they meet), or open it
      const go = !canForm ? 'View' : fl === 'review' ? 'Review' : st === 'planned' ? (acct ? 'Open' : 'Fill in') : fl === 'held' && acct ? 'Send the final' : 'Open';
      const prim = canForm && (fl === 'review' || (st === 'planned' && !acct) || (fl === 'held' && acct));
      const acts = st === 'none' ? (canForm ? `<span class="arr"><input type="date" class="cell" data-arrdate="${esc(x.p._id)}" value="${esc(todayIso())}" aria-label="Day for ${esc(x.exp)}"><button class="btn sm" data-arrange="${esc(x.p._id)}">Arrange</button></span>` : '')
        : `<span class="arr">${o && o.plannedAt ? `<span class="when">${esc(Forms.fmtDate(o.plannedAt))}</span>` : ''}<button class="btn sm${prim ? ' primary' : ''}" data-openf="${esc(o.id)}">${go}</button>${st !== 'planned' ? `<button class="btn sm ghost" data-pdff="${esc(o.id)}">PDF</button>${canForm ? `<button class="btn sm ghost" data-mailf="${esc(o.id)}" title="An email draft to the agent with this form attached">Email</button>` : ''}` : ''}</span>`;
      const obN = objList({ k, pid: x.p._id, st: ['open', 'escalated', 'accepted'] }).length;
      return `<div class="bcard${(st === 'none' && need > 6) || fl === 'review' ? ' hot' : ''}"><button class="linkbtn nm" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" dir="auto">${esc(x.exp)}</button>${spv ? '' : spvLine(x.p._id)}<small>${esc(whyLine(x.r, set))}</small>${x.os.fin ? `<span class="fst final">Final form${x.os.fin.outcome ? ' · ' + esc((Forms.OUTCOMES.find(z => z[0] === x.os.fin.outcome) || [, ''])[1]) : ''}</span>` : ''}${x.os.fin && replyNew(x.os.fin) ? '<span class="sgn todo">Final form: replied</span>' : ''}${st !== 'none' ? sigChip(o) + safeHtml(fuChip, o) : ''}${obN ? `<span class="fst obj">${plural(obN, 'objection')}</span>` : ''}${acts}</div>`;
    }).join('') || '<p class="subtle">Nobody.</p>'}${L.length > 8 ? `<button class="btn sm ghost bmore" data-more="${st}">${state.boardAll[st] ? 'Show fewer' : `Show all ${L.length}`}</button>` : ''}</div>`;
  };
  const board = isSenior() ? seniorBoardHtml(items, k) : `<div class="card cvauto"><div class="cardhead"><div><h2>One-to-ones · ${esc(ymLabel(k))}</h2><p class="cap">${locked ? 'The month is final: one-to-ones are read-only.' : 'Arrange each agent\'s one-to-one. An agent with an account fills in their part on their own page and sends it to you: review it, write your final comment (accepted or rejected) and send the final back; they then sign it. For an agent without an account, fill in the form when you meet.'}</p></div></div>
    <div class="board">${col('none', 'To arrange', 'No one-to-one yet')}${col('planned', 'Arranged', 'With the agent, or a day set')}${col('held', 'Held', 'Final sent, or filled in')}${col('closed', 'Closed', 'Signed and done')}</div></div>`;
  const so = TEAM_SORTS.find(x => x[0] === state.teamSort) || TEAM_SORTS[0], ranked = items.slice().sort((a, b) => so[2](a, b, set) || byExp(a, b)), q = normName(state.teamQ || '');
  const cards = ranked.map((x, i) => {
    const rr = x.r, on = x.p.status !== 'Inactive', below = rr && rr.adh != null && rr.adh < set.target, nm = normName(`${x.exp} ${x.p.name} ${x.p.sys || ''}`);
    return `<button class="ecard" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" data-nm="${esc(nm)}"${q && !nm.includes(q) ? ' hidden' : ''} aria-label="${esc(x.exp)}, number ${i + 1}, open the profile">
      <span class="rk${i < 3 && below && so[0] !== 'name' && so[0] !== 'need' ? ' top' : ''}" aria-hidden="true">${i + 1}</span>
      <span class="atop"><span class="av" aria-hidden="true"${avStyle(x.exp)}>${esc(initials(x.exp))}</span><span class="who"><b dir="auto">${esc(x.exp)}</b>${!spv ? spvLine(x.p._id) : ''}<small>${esc(Core.cleanId((effP(x.p._id) || x.p).nid) || 'No National ID')} · ${esc(unitOf(x.p))}</small></span><span class="stt${on ? ' on' : ''}">${on ? 'Active' : 'Inactive'}</span></span>
      <span class="big">${!rr || rr.adh == null ? '<b>–</b>' : below ? belowB(rr.adh, pct(rr.adh, 1)) : `<b>${pct(rr.adh, 1)}</b>`}<i>Adherence</i></span>
      <span class="astats"><span><b>${rr ? pct1(rr.fin) : '–'}</b><i>Final</i></span>${showSR ? `<span><b>${rr && rr.earned != null ? rr.earned : '–'}</b><i>Earned SR</i></span>` : `<span><b>${rr && rr.wfExc != null ? rr.wfExc : '–'}</b><i>Exceptions</i></span>`}<span><b>${rr ? mss(rr.aht) : '–'}</b><i>AHT</i></span></span>
      <span class="astats"><span><b>${rr && rr.absent != null ? rr.absent : '–'}</b><i>Absent</i></span><span><b>${rr && rr.tardy != null ? Math.round(rr.tardy) : '–'}</b><i>Tardy min</i></span><span><b>${rr && rr._el ? (rr._el.ok ? 'Yes' : 'No') : '–'}</b><i>Eligible</i></span></span>
      <span class="wfl ${x.os.st === 'none' ? '' : 'ok'}">${x.os.st === 'none' ? 'No one-to-one yet' : `One-to-one: ${esc((FORM_STATUS.find(z => z[0] === x.os.st) || [, ''])[1].toLowerCase())}${x.os.o && x.os.o.plannedAt ? ' · ' + esc(Forms.fmtDate(x.os.o.plannedAt)) : ''}`}</span></button>`;
  }).join('');
  const shown = q ? ranked.filter(x => normName(`${x.exp} ${x.p.name} ${x.p.sys || ''}`).includes(q)).length : ranked.length;
  const tm = [['adh', 'Adherence'], ['fin', 'Final %'], ['wfExc', 'Exceptions'], ['aht', 'AHT'], ['absent', 'Absent']].filter(([mk]) => wsMonths().some(x => (monthData(x) || { rows: [] }).rows.some(rr => rr[mk] != null)));
  const mk = tm.some(x => x[0] === state.teamMetric) ? state.teamMetric : (tm[0] || ['adh'])[0], mt = History.METRICS.find(x => x.k === mk);
  const months = wsMonths(), pids = new Set(P.map(p => p._id));
  const teamSeries = months.map(x => mean([...rowsByPid(x).entries()].filter(([pid]) => pids.has(pid)).map(([, rr]) => History.valOf(rr, mt))));
  const deptSeries = months.map(x => mean(((monthData(x) || { rows: [] }).rows).map(rr => History.valOf(rr, mt))));
  const chart = `<div class="card"><div class="cardhead"><div><h2>${spv ? 'Your team' : 'This team'} against the department</h2><p class="cap">${esc(mt.label)} by month, ${mt.total === 'sum' ? 'per agent' : 'average per agent'}.</p></div>
    <div class="seg sm" role="group" aria-label="Metric">${tm.map(([k2, l]) => `<button data-teamm="${k2}" aria-pressed="${k2 === mk}">${esc(l)}</button>`).join('')}</div></div>
    ${lineChart(months.map(x => MON[+x.slice(5) - 1] + ' ' + x.slice(2, 4)), [{ name: spv ? 'Your team' : 'This team', values: teamSeries, cls: 's1' }, { name: 'Department', values: deptSeries, cls: 's2', dash: true }], mt, mk === 'adh' ? set.target : null, true)}</div>`;
  const scoreCard = cur && (spv || isSenior() || Auth.isAdmin()) ? spvScoreHtml(cur, k, { showSR: !spv && (isSenior() || Auth.isAdmin()), cap: spv ? 'Set by the senior manager. Team items are your agents\' averages; the leader items come from the quality team\'s EVAL.' : `${supName(cur)}'s scorecard, as the senior manager set it.` }) : '';
  const att = attGridHtml(items, k, spv && !monthLocked(k)), calls = teamInterHtml(items, k);
  body.innerHTML = `${statusBanner(k)}${deadlineBanner(k, cur, spv)}${wait}<div class="tiles wstiles">${tiles}</div>${teamKpiHtml(R, deptRows, k)}${scoreCard}${safeHtml(objTeamHtml, k, cur)}${board}${att}${calls}${chart}<div class="card emps cvauto" id="teamAgents"><div class="cardhead"><div><h2>Agents</h2><p class="cap" data-tcount>${teamCountText(shown, items.length, so)}</p></div>
    <div class="toolbar"><input type="search" data-tq value="${esc(state.teamQ || '')}" placeholder="Search by name" aria-label="Search agents by name"><select class="cell" data-tsort aria-label="Rank by">${TEAM_SORTS.map(([v, l]) => `<option value="${v}"${v === so[0] ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
    <div class="egrid${so[0] === 'name' ? ' byname' : ''}"><div class="ehead" aria-hidden="true"><span class="c-rk">#</span><span class="c-who">Agent</span><span class="c-big">Adherence</span><span class="c-s1 r3"><span>Final</span><span>${showSR ? 'Earned SR' : 'Exceptions'}</span><span>AHT</span></span><span class="c-s2 r3"><span>Absent</span><span>Tardy min</span><span>Eligible</span></span><span class="c-st">One-to-one</span></div>${cards}</div><p class="subtle tnone"${shown ? ' hidden' : ''}>Nobody called that in this team.</p></div>`;
  reveal(body);
}
/** how the Agents cards are ranked: the lowest first, as asked; ties by name */
const teamNl = (v, d) => (v == null ? d : v);
const TEAM_SORTS = [
  ['adh', 'Lowest adherence first', (a, b) => teamNl(a.r && a.r.adh, 9) - teamNl(b.r && b.r.adh, 9), 'adherence'],
  ['fin', 'Lowest final % first', (a, b) => teamNl(a.r && a.r.fin, 9) - teamNl(b.r && b.r.fin, 9), 'final %'],
  ['exc', 'Most exceptions first', (a, b) => teamNl(b.r && b.r.wfExc, -1) - teamNl(a.r && a.r.wfExc, -1), 'exceptions'],
  ['absent', 'Most absent first', (a, b) => teamNl(b.r && b.r.absent, -1) - teamNl(a.r && a.r.absent, -1), 'absent days'],
  ['tardy', 'Most tardy first', (a, b) => teamNl(b.r && b.r.tardy, -1) - teamNl(a.r && a.r.tardy, -1), 'tardy minutes'],
  ['need', 'Needs attention first', (a, b, set) => needScore(b.r, set) - needScore(a.r, set), 'what needs attention'],
  ['name', 'Name A–Z', () => 0, 'name'],
];
const teamCountText = (shown, n, so) => `${shown === n ? plural(n, 'agent') : `${shown} of ${plural(n, 'agent')}`}, ranked by ${so[3]}${so[0] === 'name' ? '' : ' (number 1 first)'}. Point at a name for a quick look; select the row for the full profile, history and forms.`;
/** the senior manager's view of the one-to-ones: who has one arranged and who does not yet, by supervisor; the supervisors do the rest */
function seniorBoardHtml(items, k) {
  const none = items.filter(x => x.os.st === 'none'), arr = items.filter(x => x.os.st !== 'none');
  const stTxt = x => { const o = x.os.o, fl = o ? formFlow(o) : 'none'; return x.os.st === 'closed' ? 'Signed' : fl === 'review' ? 'Replied, with the supervisor' : x.os.st === 'held' ? 'Held' : `Arranged${o && o.plannedAt ? ' · ' + Forms.fmtDate(o.plannedAt) : ''}`; };
  const card = (x, on) => `<div class="bcard sb"><button class="linkbtn nm" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" dir="auto">${esc(x.exp)}</button>${on ? `<span class="fst ${x.os.st}">${esc(stTxt(x))}</span>` : ''}</div>`;
  const col = (st, title, hint, L, on) => {
    // by supervisor (the agents without one last), each supervisor's agents under their name
    const S = L.slice().sort((a, b) => (!a.spvN) - (!b.spvN) || String(a.spvN || '').localeCompare(String(b.spvN || '')) || byExp(a, b)), cut = state.boardAll['s' + st] || S.length <= 10 ? S.length : 8;
    const n = new Map(); S.forEach(x => n.set(x.spvN || '', (n.get(x.spvN || '') || 0) + 1));
    let last = null; const rows = S.slice(0, cut).map(x => { const g = x.spvN || ''; const h = g !== last ? `<div class="sbgrp" dir="auto"><span>${esc(g || 'No supervisor yet')}</span><b>${n.get(g)}</b></div>` : ''; last = g; return h + card(x, on); }).join('');
    return `<div class="bcol ${st}"><div class="bhead"><b>${esc(title)}</b><span class="cnt">${L.length}</span></div><p class="hint">${esc(hint)}</p>${rows || '<p class="subtle">Nobody.</p>'}${S.length > 10 ? `<button class="btn sm ghost bmore" data-more="s${st}">${state.boardAll['s' + st] ? 'Show fewer' : `Show all ${S.length}`}</button>` : ''}</div>`;
  };
  const pc = items.length ? Math.round(arr.length / items.length * 100) : 0;
  return `<div class="card cvauto sboard"><div class="cardhead"><div><h2>One-to-ones · ${esc(ymLabel(k))}</h2><p class="cap">Who has a one-to-one arranged and who does not yet. The supervisors arrange and hold them; select a name for the person's page.</p></div>
    <div class="sbprog" aria-label="${arr.length} of ${items.length} arranged"><span class="pbar"><i style="width:${pc}%"></i></span><b>${arr.length} / ${items.length}</b><small>arranged</small></div></div>
    ${mosaicHtml(items, stTxt)}<div class="board two">${col('none', 'Not arranged yet', 'No one-to-one yet', none, false)}${col('planned', 'Arranged', 'Arranged, held or signed', arr, true)}</div></div>`;
}
/** the one-to-one mosaic: a row per supervisor, a square per agent, coloured by where the agent's one-to-one stands */
function mosaicHtml(items, stTxt) {
  if (!items.length) return '';
  const G = new Map(); items.forEach(x => { const g = x.spvN || ''; if (!G.has(g)) G.set(g, []); G.get(g).push(x); });
  const rank = { closed: 0, held: 1, planned: 2, none: 3 }, rows = [...G.entries()].sort((a, b) => (!a[0]) - (!b[0]) || a[0].localeCompare(b[0]));
  return `<div class="mosaic" role="group" aria-label="One-to-ones by supervisor">${rows.map(([g, L]) => {
    const on = L.filter(x => x.os.st !== 'none').length;
    return `<div class="mrow"><span class="mnm" dir="auto" title="${esc(g || 'No supervisor yet')}">${esc(g || 'No supervisor yet')}</span><span class="mcells">${L.slice().sort((a, b) => rank[a.os.st] - rank[b.os.st] || byExp(a, b)).map(x => `<button class="mc ${esc(x.os.st)}" data-open="${esc(x.p._id)}" data-tt="${esc(`${x.exp}: ${x.os.st === 'none' ? 'not arranged yet' : stTxt(x).toLowerCase()}`)}" aria-label="${esc(`${x.exp}, ${x.os.st === 'none' ? 'not arranged yet' : stTxt(x)}`)}"></button>`).join('')}</span><span class="mn">${on}/${L.length}</span></div>`;
  }).join('')}<div class="mkey" aria-hidden="true"><span><i></i>Not arranged yet</span><span><i class="planned"></i>Arranged</span><span><i class="held"></i>Held</span><span><i class="closed"></i>Signed</span></div></div>`;
}
/** the senior manager's deadline for the one-to-ones, and whether this team is finished */
function deadlineBanner(k, spvPid, mine) {
  const C = state.cycles[k] || {}, dl = C.deadline; if (!dl && !spvPid) return '';
  const done = spvPid ? state.spvDone[`${k}_${spvPid}`] : null;
  if (done) return `<div class="wsstatus final"><span class="dot"></span><div><b>${mine ? 'You finished your team' : `${esc(done.name || supName(spvPid))} finished the team`}</b> · ${esc(fmtWhen(done.at))}, ${done.held}/${done.n} one-to-ones held${done.signed != null ? `, ${done.signed} signed by the agent` : ''}.${mine ? ' The senior manager can see it.' : ''}</div></div>`;
  if (!dl) return '';
  const days = Math.ceil((new Date(dl + 'T23:59:59') - Date.now()) / 86400000), over = days < 0;
  return `<div class="wsstatus ${over ? 'late' : days <= 2 ? 'soon' : 'draft'}"><span class="dot"></span><div><b>One-to-ones due ${esc(Forms.fmtDate(dl))}</b> · ${over ? `${plural(-days, 'day')} late` : days === 0 ? 'today' : `${plural(days, 'day')} left`}. ${mine ? 'Finish my team opens when every agent\'s one-to-one is done (for an agent with an account, when you sent them the final); the senior manager is then told.' : 'Set by the senior manager.'}</div></div>`;
}

/** the team's calls from the interactions export, when the month has one */
function teamInterHtml(items, k) {
  if (!state.inter[k]) return '';
  const L = items.map(x => ({ x, I: interOf(k, x.p) })).filter(o => o.I); if (!L.length) return '';
  const pc = (a, b) => (b ? pct(a / b, 1) : '–'), T = f => L.reduce((s, o) => s + (o.I[f] || 0), 0), calls = T('calls');
  const row = (nm, I, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${nm}</td><td class="r num">${I.calls.toLocaleString('en-US')}</td><td class="r num">${I.aht == null ? '–' : mss(I.aht)}</td><td class="r num">${pc(I.short, I.calls)}</td><td class="r num">${pc(I.agentDisc, I.calls)}</td><td class="r num">${I.agShort}</td><td class="r num${I.drops >= 5 ? ' bad' : ''}">${I.drops}</td><td class="r num">${pc(I.xfer, I.calls)}</td><td class="r num">${pc(I.rep72, I.calls)}</td></tr>`;
  const tot = { calls, aht: calls ? L.reduce((s, o) => s + (o.I.aht || 0) * o.I.calls, 0) / calls : null, short: T('short'), agentDisc: T('agentDisc'), agShort: T('agShort'), drops: T('drops'), xfer: T('xfer'), rep72: T('rep72') };
  return `<div class="card cvauto"><div class="cardhead"><div><h2>Calls · ${esc(ymLabel(k))}</h2><p class="cap">From the interactions export: each agent's handled calls, short calls, who hung up, call drops at the agent's endpoint, transfers, and callers who called again within three days.</p></div></div>
    <div class="tablewrap restab"><table><thead><tr><th>Agent</th><th class="r">Calls</th><th class="r">Avg duration</th><th class="r">Under 10s</th><th class="r">Agent hung up</th><th class="r">Hung up &lt; 30s</th><th class="r">WebRTC drops</th><th class="r">Transferred</th><th class="r">Called again 72h</th></tr></thead><tbody>
    ${L.sort((a, b) => b.I.calls - a.I.calls).map(o => row(`<button class="linkbtn nm" data-open="${esc(o.x.p._id)}" data-agent="${esc(o.x.p._id)}" dir="auto">${esc(o.x.exp)}</button>`, o.I)).join('')}${row('<b>Team</b>', tot, 'tot')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- agents waiting for their supervisor's approval
function waitingList(spvPid) { return (state.people || []).filter(a => a.role === 'pending' && !a.disabled && a.kind === 'agent' && (!spvPid || a.wantSpv === spvPid || !a.wantSpv)); }
function waitingHtml(spvPid) {
  const L = waitingList(spvPid); if (!L.length) return '';
  const team = teamOf(spvPid).filter(p => !(state.people || []).some(a => a.role === 'agent' && a.pid === p._id && !a.disabled));
  const nm = p => gname(effP(p._id) || p) || p.name;
  const opts = a => { const best = team.map(p => [p, Math.max(Core.nameScore(a.name, p.name), normSpace(p.sys) ? Core.nameScore(a.name, p.sys) : 0)]).sort((x, y) => y[1] - x[1])[0];
    return `<option value="">Who is this?</option>${team.slice().sort((x, y) => nm(x).localeCompare(nm(y))).map(p => `<option value="${esc(p._id)}"${best && best[1] >= 0.8 && best[0] === p ? ' selected' : ''}>${esc(nm(p))}</option>`).join('')}`; };
  return `<div class="card approvals"><div class="cardhead"><div><h2>Waiting for your approval · ${L.length}</h2><p class="cap">Agents who made an account${L.some(a => !a.wantSpv) ? ' (some did not choose a supervisor)' : ' and chose you'}. Choose who each one is in your team, then approve: they see only their own results and forms.</p></div></div>
    <ul class="ilist">${L.map(a => `<li data-wid="${esc(a.id)}"><span class="nm" dir="auto">${esc(a.name)}</span><span class="sg">${esc(a.username || '')}${a.wantSpv ? '' : ' · no supervisor chosen'}</span><span class="sp"></span><span class="acts"><select class="cell" data-apick aria-label="Who ${esc(a.name)} is">${opts(a)}</select><button class="btn sm primary" data-approve>Approve</button>${a.wantSpv === spvPid ? '<button class="btn sm ghost" data-reject>Not my agent</button>' : ''}</span></li>`).join('')}</ul></div>`;
}

// ---------------------------------------------------------------- attendance: what Genesys counted, corrected by the supervisor only
const ATT_SHORT = v => (v == null ? '' : typeof v === 'number' ? String(v) : { Attend: '✓', Absent: 'Abs', OFF: 'OFF', AL: 'AL', SL: 'SL', 'Other leave': 'LV', Unpaid: 'UPL', 'National Day': 'ND', 'Founding Day': 'FD', 'Compassionate Leave': 'CL', Paternity: 'PL', Marriage: 'MRL', ML: 'ML', Exam: 'EXM', Eid: 'EID' }[v] || String(v).slice(0, 4));
const ATT_CLS = v => (v == null ? 'na' : typeof v === 'number' ? 'td' : { Attend: 'at', OFF: 'off', AL: 'al', SL: 'sl', Absent: 'ab' }[v] || 'ot');
function attGridHtml(items, k, canEdit) {
  const L = items.filter(x => x.r && (x.r.d || x.r.dx)); if (!L.length) return '';
  const y = +k.slice(0, 4), m = +k.slice(5), ND = Core.daysIn(y, m), edits = attEditsOf(k) || new Map();
  const head = Array.from({ length: ND }, (_, i) => `<th class="dh${['Fri', 'Sat'].includes(Core.weekday(y, m, i + 1).slice(0, 3)) ? ' we' : ''}" title="${esc(Core.weekday(y, m, i + 1))}">${i + 1}<small>${esc(Core.weekday(y, m, i + 1).slice(0, 2))}</small></th>`).join('');
  const rows = L.sort(byExp).map(x => {
    const days = daysOfRow(x.r, ND), ed = edits.get(x.p._id), t = attTotals(days);
    const cells = days.map((v, i) => {
      const e = ed && ed.days && ed.days[i + 1], tip = `${i + 1} ${MON[m - 1]}: ${v == null ? 'nothing yet' : typeof v === 'number' ? `late ${v} min` : v}${e ? ` · changed by ${e.by || 'the supervisor'}${e.note ? ': ' + e.note : ''}` : ''}`;
      return `<td>${canEdit ? `<button class="ad ${ATT_CLS(v)}${e ? ' ed' : ''}" data-ad="${esc(x.p._id)}|${i + 1}" title="${esc(tip)}" aria-label="${esc(x.exp)}, ${esc(tip)}">${esc(ATT_SHORT(v))}</button>` : `<span class="ad ${ATT_CLS(v)}${e ? ' ed' : ''}" title="${esc(tip)}">${esc(ATT_SHORT(v))}</span>`}</td>`;
    }).join('');
    return `<tr><th class="an"><button class="linkbtn nm" data-open="${esc(x.p._id)}" data-agent="${esc(x.p._id)}" dir="auto">${esc(x.exp)}</button></th>${cells}<td class="r num">${t.absent}</td><td class="r num">${t.tardy ? Math.round(t.tardy) : 0}</td><td class="r num">${t.al + t.sl + t.leave}</td><td class="r num">${t.sched ? `${t.attend}/${t.sched}` : '–'}</td></tr>`;
  }).join('');
  const nEd = [...edits.values()].reduce((a, e) => a + Object.keys((e && e.days) || {}).length, 0);
  return `<div class="card attcard cvauto"><div class="cardhead"><div><h2>Attendance · ${esc(ymLabel(k))}</h2><p class="cap">Counted by the tool from the Genesys schedule and sign-ons: a missed shift is Absent, a late sign-on shows its minutes, a leave in the schedule shows as that leave. ${canEdit ? 'Select a day to correct it; only you, as the supervisor, can.' : monthLocked(k) ? 'The month is final.' : 'Only the agent\'s supervisor can correct it.'}${nEd ? ` ${plural(nEd, 'day')} corrected (dotted).` : ''}</p></div></div>
    <div class="tablewrap attgrid"><table><thead><tr><th class="an">Agent</th>${head}<th class="r">Abs</th><th class="r">Late</th><th class="r">Leave</th><th class="r">Days</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
let attPopEl = null;
function closeAttPop() { if (attPopEl) { attPopEl.remove(); attPopEl = null; } }
function openAttPop(btn) {
  closeAttPop();
  const [pid, d] = btn.dataset.ad.split('|'), k = wsMonthNow(), p = state.roster.find(x => x._id === pid); if (!p || !k) return;
  const E = attEditsOf(k), ed = E ? E.get(pid) : null, cur = ed && ed.days && ed.days[d];
  const el = document.createElement('div'); el.className = 'attpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Attendance on ${d} ${MON[+k.slice(5) - 1]}`);
  const opt = (v, l) => `<button type="button" data-v="${esc(v)}">${esc(l)}</button>`;
  el.innerHTML = `<b>${esc(gname(effP(pid) || p) || p.name)} · ${esc(d)} ${esc(MON[+k.slice(5) - 1])}</b>
    <div class="ops">${opt('Attend', 'Attend ✓')}${opt('Absent', 'Absent')}${opt('OFF', 'OFF')}${opt('AL', 'Annual leave')}${opt('SL', 'Sick leave')}${opt('Unpaid', 'Unpaid leave')}${opt('Compassionate Leave', 'Compassionate')}${opt('Exam', 'Exam leave')}${opt('Marriage', 'Marriage')}${opt('ML', 'Maternity')}</div>
    <label class="late">Late by <input type="number" min="1" max="600" step="1" inputmode="numeric" data-late placeholder="min"> min <button type="button" class="btn sm" data-latego>Set</button></label>
    <input class="cell" data-note placeholder="Note (optional)" value="${esc(cur ? cur.note || '' : '')}">
    <div class="foot">${cur ? '<button type="button" class="linkbtn" data-v="__clear">Back to what Genesys says</button>' : ''}<span class="spacer"></span><button type="button" class="btn sm ghost" data-x>Cancel</button></div>`;
  document.body.appendChild(el); attPopEl = el;
  const b = btn.getBoundingClientRect(), w = 300; el.style.width = w + 'px';
  el.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.left + b.width / 2 - w / 2)) + 'px'; el.style.top = Math.min(innerHeight - el.offsetHeight - 8, b.bottom + 6) + 'px';
  const go = v => { const note = el.querySelector('[data-note]').value; closeAttPop(); if (editAttDay(pid, k, +d, v, note)) { toast(v == null ? `Day ${d} is back to what Genesys says` : `Day ${d}: ${typeof v === 'number' ? `late ${v} min` : v}`); renderWs(); } };
  el.addEventListener('click', e => {
    const o = e.target.closest('[data-v]'); if (o) { go(o.dataset.v === '__clear' ? null : o.dataset.v); return; }
    if (e.target.closest('[data-latego]')) { const n = Math.round(+el.querySelector('[data-late]').value); if (!(n > 0)) { toast('Type the minutes late.'); return; } go(n); return; }
    if (e.target.closest('[data-x]')) closeAttPop();
  });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAttPop(); btn.focus(); } if (e.key === 'Enter' && e.target.matches('[data-late]')) el.querySelector('[data-latego]').click(); });
  setTimeout(() => { const f = el.querySelector('button'); if (f) f.focus(); }, 0);
}
document.addEventListener('pointerdown', e => { if (attPopEl && !attPopEl.contains(e.target) && !e.target.closest('[data-ad]')) closeAttPop(); }, true);

// ---------------------------------------------------------------- finishing the team, and the emails a supervisor sends
async function finishTeam(k) {
  const u = Auth.user(); if (roleNow() !== 'spv' || !u || !u.pid || !state.db) return;
  if (monthLocked(k)) { toast(`${ymLabel(k)} is final.`); return; }
  const rd = teamReady(u.pid, k);
  if (!rd.n || rd.left.length) { toast(rd.n ? `${plural(rd.left.length, 'agent')} still to do: ${rd.left.slice(0, 5).map(p => gname(effP(p._id) || p) || p.name).join(', ')}${rd.left.length > 5 ? '…' : ''}.` : 'Nobody is in your team yet.'); return; }
  const team = teamOf(u.pid).filter(p => p.status !== 'Inactive'), st = team.map(p => ({ p, os: oneStatus(p._id, k) }));
  const held = st.filter(x => x.os.st === 'held' || x.os.st === 'closed').length, signed = st.filter(x => x.os.o && sigState(x.os.o) === 'signed').length;
  const id = `${k}_${u.pid}`, body = { k, spv: u.pid, name: supName(u.pid) || whoNow(), at: new Date().toISOString(), by: whoNow(), n: team.length, held, signed };
  state.spvDone[id] = body; state.spvDoneVer++;
  try { await queueWrite('spvdone/' + id, () => state.db.doc('spvdone/' + id).set(body)); }
  catch (e) { delete state.spvDone[id]; toast(`Not saved (${(e && e.code) || 'error'}).`); renderWs(); return; }
  logCycle(k, `${body.name} finished the team: ${held}/${team.length} one-to-ones held, ${signed} signed`);
  renderWs();
  const pids = team.map(p => p._id).filter(agentHasAccount); if (pids.length) publishMonthToAgents(k, pids).catch(() => {});
  const C = contactsNow(), to = splitAddr(C.senior), cc = [addrOf(u.pid)].filter(Boolean);
  const rows = st.sort((a, b) => byExp({ exp: gname(a.p) }, { exp: gname(b.p) })).map(x => [esc(gname(effP(x.p._id) || x.p) || x.p.name), esc((FORM_STATUS.find(z => z[0] === x.os.st) || [, 'None'])[1]), esc(x.os.o && x.os.o.date ? Forms.fmtDate(x.os.o.date) : ''), x.os.o && sigState(x.os.o) === 'signed' ? 'Yes' : 'No']);
  const html = mP(`Dear ${esc(firstName(splitAddr(C.senior)[0] || '') || 'Mohammed')},`) + mP(`I have finished the one-to-ones for my team for <b>${esc(ymLabel(k))}</b>: ${held} of ${team.length} held${signed ? `, ${signed} already signed by the agent in the tool` : ''}.`) + mTable(['Agent', 'One-to-one', 'Date', 'Signed by the agent'], rows) + mP('Everything is in the MC tool.') + mP('Best regards,');
  await saveEml(`${body.name} - one-to-ones done - ${ymLabel(k)}`, { to, cc, subject: `${body.name} | ${ymLabel(k)} one-to-ones done (${held}/${team.length})`, html });
  return 'ok';
}
async function reopenTeam(k) {
  const u = Auth.user(); if (roleNow() !== 'spv' || !u || !u.pid || !state.db) return;
  const id = `${k}_${u.pid}`, old = state.spvDone[id]; if (!old) return;
  delete state.spvDone[id]; state.spvDoneVer++;
  try { await queueWrite('spvdone/' + id, () => state.db.doc('spvdone/' + id).delete()); } catch (e) { state.spvDone[id] = old; }
  logCycle(k, `${old.name} reopened the team`); renderWs(); toast('Your team is open again.');
}
/** the one-to-one, as a PDF in an email draft to the agent (the supervisor in copy) */
async function mailFormToAgent(f) {
  if (!f) return; const p = state.roster.find(x => x._id === f.pid); if (!p) return;
  const to = addrOf(f.pid), u = Auth.user() || {}, cc = u.pid ? [addrOf(u.pid)].filter(Boolean) : [];
  if (!to) toast(`${f.agent.name} has no email in the roster yet: the draft has no recipient.`);
  try {
    const bytes = await formPdf(f), first = String(f.agent.name || '').split(' ')[0];
    const html = mP(`Dear ${esc(first)},`) + mP(`Please find attached your ${f.kind === 'final' ? 'final form' : 'one-to-one form'} for <b>${esc(f.period || '')}</b>.`) + mP(agentHasAccount(f.pid) ? (f.verdict ? 'My final comment is on it: please read it and sign it on your own page in the MC tool.' : 'Please fill in your part on your own page in the MC tool and send it to me.') : 'Please read it and let me know if anything is not right.') + mP('Best regards,');
    await saveEml(`${f.kind === 'final' ? 'Final form' : 'One-to-one'} - ${f.agent.name} - ${f.period}`, { to: to ? [to] : [], cc, subject: `Your ${f.kind === 'final' ? 'final form' : 'one-to-one'} | ${f.period}`, html, files: [{ name: formFile(f), bytes, type: 'application/pdf' }] });
  } catch (e) { toast('Could not make the email: ' + (e && e.message ? e.message : e)); }
}
/** a line in the month's cycle log (the senior manager sees it) */
function logCycle(k, what) {
  if (!state.db || !k) return;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, body = { k, at: new Date().toISOString(), by: whoNow(), role: roleNow(), what };
  state.cycleLog = state.cycleLog || {}; state.cycleLog[id] = body;
  queueWrite('cyclelog/' + id, () => state.db.doc('cyclelog/' + id).set(body)).catch(() => {});
}

// ---------------------------------------------------------------- events on the team page
$('teamBody').addEventListener('click', async e => {
  const ad = e.target.closest('[data-ad]'); if (ad && ad.tagName === 'BUTTON') { openAttPop(ad); return; }
  const mf = e.target.closest('[data-mailf]'); if (mf) { mailFormToAgent(formLookup(mf.dataset.mailf)); return; }
  const ap = e.target.closest('[data-approve]');
  if (ap) {
    const li = ap.closest('[data-wid]'), pid = li.querySelector('[data-apick]').value; if (!pid) { toast('Choose who this agent is first.'); return; }
    ap.disabled = true;
    if (await Auth.approveAgent(li.dataset.wid, pid)) { toast(`${supName(pid)} can now sign in and see their own page.`); publishAgent(pid, wsMonthNow(), { quiet: true }); logCycle(wsMonthNow(), `${whoNow()} approved ${supName(pid)}'s account`); loadPeople(); }
    else ap.disabled = false;
    return;
  }
  const rj = e.target.closest('[data-reject]');
  if (rj) { const li = rj.closest('[data-wid]'); if (!rj.dataset.confirm) { rj.dataset.confirm = '1'; rj.textContent = 'Click again: turn it off'; return; } if (await Auth.rejectAgent(li.dataset.wid)) { toast('The account is turned off. The admin can turn it back on.'); loadPeople(); } }
});
$('teamBody').addEventListener('input', e => {
  const t = e.target; if (!t.matches('[data-tq]')) return;
  state.teamQ = t.value; const q = normName(t.value), box = t.closest('.emps'); if (!box) return;
  let shown = 0; const L = box.querySelectorAll('.egrid .ecard');
  L.forEach(c => { const on = !q || (c.dataset.nm || '').includes(q); c.hidden = !on; if (on) shown++; });
  const so = TEAM_SORTS.find(x => x[0] === state.teamSort) || TEAM_SORTS[0], cap = box.querySelector('[data-tcount]'); if (cap) cap.textContent = teamCountText(shown, L.length, so);
  const none = box.querySelector('.tnone'); if (none) none.hidden = !!shown;
});
$('teamBody').addEventListener('change', e => {
  const t = e.target; if (!t.matches('[data-tsort]')) return;
  state.teamSort = t.value; renderWs(); const s = $('teamBody').querySelector('[data-tsort]'); if (s) s.focus();
});
$('teamBar').addEventListener('click', async e => {
  const d = e.target.closest('[data-spvdone]');
  if (d) { if (!d.disabled) finishTeam(wsMonthNow()); return; }
  if (e.target.closest('[data-spvreopen]')) reopenTeam(wsMonthNow());
});
