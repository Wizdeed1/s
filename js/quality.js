// ================================================================ QUALITY: the Final EVAL and the quality KPIs
// The quality team's monthly workbook: one sheet per brand (sections CC / SM / CT / champions), each agent's Call QA, Ticket QA
// and CR with the final score, and critical errors; a Leaders sheet scores the team leads. The final score fills Quality
// Observations; the quality team can correct any quality KPI by hand until the month is final.
Object.assign(state, { qMonth: '', qQ: '' });
const LEADER_ITEMS = [['obs', 'No of Observation', 0.05], ['acc', 'Observation Accuracy', 0.10], ['work', 'My Work Accuracy', 0.05], ['deadline', 'Deadline', 0.05], ['objection', 'Objection validation', 0.05], ['esc', 'Quality Escalation Reports', 0.05]];
const qPct = v => (v == null || v === '' ? null : typeof v === 'number' && Number.isFinite(v) ? (v > 1.5 ? v / 100 : v) : (() => { const s = normSpace(v).replace(/[%\s]/g, ''); if (!s || !Number.isFinite(+s)) return null; return /%/.test(String(v)) || +s > 1.5 ? +s / 100 : +s; })());
/** sheets: [{name, rows}] -> { rows:[{name, sheet, section, callqa, ticketqa, cr, final, crit:[{type,n}], status}], leaders:[{name, items}], month } or null */
function parseEval(sheets, fileName) {
  const rows = [], leaders = [];
  for (const S of sheets) {
    const R = S.rows || [];
    if (/leader/i.test(S.name) || R.some(r => r && r.some(v => /no of observation/i.test(normSpace(v))))) { leaders.push(...parseLeaders(R)); continue; }
    let hdr = null, section = '';
    for (let i = 0; i < R.length; i++) {
      const r = Array.from(R[i] || [], v => (v === undefined ? null : v)), cells = r.map(v => normSpace(v));   // no holes
      if (cells.some(v => /^agent name$/i.test(v)) && cells.some(v => /call qa|final score|evaluation score|ticket qa/i.test(v))) {
        const at = re => cells.findIndex(v => re.test(v));
        hdr = { name: at(/^agent name$/i), call: at(/call qa/i), ticket: at(/ticket qa/i), cr: at(/^cr$/i), eval: at(/evaluation score/i), final: at(/^final score/i), crit: at(/^critical error/i), critN: at(/number of critical/i), id: at(/^(national id|id|id number|employee id|emp id|staff id|iqama|iqama no|national id \/ iqama)$/i) };
        continue;
      }
      if (!hdr) continue;
      const nm = cells[hdr.name];
      if (!nm) continue;
      const rest = cells.filter((v, j) => j !== hdr.name && v !== '');
      if (!rest.length) { if (nm.length < 40 && !/[-]/.test(nm)) section = nm.replace(/[:\s ]+$/, ''); continue; }   // a section title (SM, CT, "Tele Sales Champions :")
      const raw = j => (j >= 0 ? r[j] : null), word = j => normSpace(raw(j));
      const call = qPct(raw(hdr.call)), ticket = qPct(raw(hdr.ticket)), cr = qPct(raw(hdr.cr)), ev = qPct(raw(hdr.eval));
      let final = qPct(raw(hdr.final));
      const status = [hdr.call, hdr.eval, hdr.final].map(word).find(v => v && !Number.isFinite(+String(v).replace('%', ''))) || '';
      if (final == null && !status) { const parts = [call, ticket, cr].filter(v => v != null); if (parts.length) final = parts.reduce((a, b) => a + b, 0) / parts.length; else if (ev != null) final = ev; }
      const ct = word(hdr.crit), cn = hdr.critN >= 0 ? +raw(hdr.critN) || 0 : 0;
      const crit = ct && !/^0$/.test(ct) ? ct.split(/\s*[,;\n]\s*/).filter(Boolean).map(t => ({ type: t.replace(/^\(\d+\)\s*/, ''), n: +(/^\((\d+)\)/.exec(t) || [, cn || 1])[1] })) : [];
      rows.push({ name: nm, sheet: S.name, section, callqa: call, ticketqa: ticket, cr, eval: ev, final: status ? null : final, crit, status, ...(hdr.id >= 0 && Core.cleanId(raw(hdr.id)) ? { id: Core.cleanId(raw(hdr.id)) } : {}) });
    }
  }
  if (!rows.length && !leaders.length) return null;
  const s = String(fileName || '').toLowerCase(), MO = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let month = null, x = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s_.-]*(20\d\d)/);
  if (x) month = { y: +x[2], m: MO.indexOf(x[1]) + 1 }; else if ((x = s.match(/(20\d\d)[-_ .](0[1-9]|1[0-2])(?!\d)/))) month = { y: +x[1], m: +x[2] };
  return { rows, leaders, month };
}
function parseLeaders(R) {
  const out = []; let titles = null;
  for (let i = 0; i < R.length; i++) {
    const r = Array.from(R[i] || [], v => (typeof v === 'number' ? v : normSpace(v)));
    const txt = r.map(v => String(v));
    if (txt.some(v => /no of observation/i.test(v))) { titles = txt; continue; }
    if (!titles) continue;
    const name = normSpace(txt[1] || txt[0] || '');
    if (name && txt.some(v => /full no|= *\d+ *%/i.test(v)) && !/group|result/i.test(name)) {
      // the block for this leader: take the "Final Result" row (else the first group)
      let vals = null;
      for (let j = i + 1; j < Math.min(R.length, i + 12); j++) {
        const rr = Array.from(R[j] || [], v => (v === undefined ? null : v)), lab = normSpace(rr[1] || rr[0] || '');
        if (/final result/i.test(lab)) { vals = rr; break; }
        if (/first group/i.test(lab) && !vals) vals = rr;
        if (j > i + 1 && rr.some(v => /full no/i.test(normSpace(v)))) break;
      }
      if (!vals) continue;
      const items = {};
      for (const [id, label] of LEADER_ITEMS) { const c = titles.findIndex(t => t.toLowerCase().startsWith(label.toLowerCase())); const v = c >= 0 ? vals[c] : null; if (typeof v === 'number' && Number.isFinite(v)) items[id] = v; }
      out.push({ name, items });
    }
  }
  return out;
}
/** everyone in the roster, with every way the tool has seen their name written: the roster, Genesys, the work email, the
    months' files and the KPI files (matched by national ID) */
function linkPeople() {
  const R = rosterRows(), lead = new Set(supervisors().map(x => x.pid));
  for (const a of state.people || []) if (a.role === 'spv' && a.pid) lead.add(a.pid);
  const byId = new Map(); for (const p of R) { const id = Core.cleanId((effP(p._id) || p).nid); if (id) byId.set(id, p._id); }
  const seen = new Map(), add = (pid, n) => { if (!pid || !normSpace(n)) return; const S = seen.get(pid) || new Set(); S.add(normSpace(n)); seen.set(pid, S); };
  for (const H of Object.values(state.history || {})) for (const r of H.rows || []) { const id = Core.cleanId(r.id); if (id && byId.has(id)) add(byId.get(id), r.n); }
  for (const F of Object.values(state.kpiFiles || {})) for (const r of F.rows || []) { const id = Core.cleanId(r.id); if (id && byId.has(id)) add(byId.get(id), r.name); }
  return R.map(p => { const pp = effP(p._id) || p; return { id: p._id, nid: Core.cleanId(pp.nid) || '', name: gname(pp) || p.name, names: [p.name, p.sys, gname(pp), ...(Array.isArray(p.aka) ? p.aka : [])].filter(Boolean), seen: [...(seen.get(p._id) || [])], email: normSpace(p.email || ''), brand: p.brand || '', team: p.team || '', lead: lead.has(p._id) || p.team === 'MG', off: p.status === 'Inactive' }; });
}
/** the links made in every month so far (the newest wins), and the ones someone said were wrong */
function qSaved() {
  const links = {}, no = {};
  for (const k of Object.keys(state.quality || {}).sort()) {
    const Q = state.quality[k] || {};
    Object.assign(links, Q.links || {});
    for (const [n, L] of Object.entries(Q.no || {})) no[n] = [...new Set([...(no[n] || []), ...L])];
  }
  for (const [n, L] of Object.entries(no)) if (L.includes(links[n])) delete links[n];
  return { links, no };
}
const qKey = n => normSpace(String(n || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''));
const qBrand = sheet => (/virgin/i.test(sheet || '') ? 'Virgin' : /fr[i]?endi/i.test(sheet || '') ? 'Friendi' : '');
const qTeam = sec => { const m = /^\s*(CC|SM|CT|QA|WF)\b/i.exec(sec || ''); return m ? m[1].toUpperCase() : ''; };
/** names in the EVAL -> roster people: the tool links every name it is sure of, links the likely ones for a glance,
    and keeps the rest with the likely people first. One person per name; a name linked before keeps its link. */
function matchEval(ev, saved, no) {
  const items = [...ev.rows.map(r => ({ name: r.name, id: r.id || '', brand: qBrand(r.sheet), team: qTeam(r.section), kind: 'agent', r })), ...ev.leaders.map(l => ({ name: l.name, kind: 'leader', r: l }))];
  const res = NameLink.link(items, linkPeople(), saved || {}, no || {});
  const rows = [], leaders = [], check = [], unmatched = [];
  res.forEach((x, i) => {
    const it = items[i];
    if (x.id) {
      const how = { why: x.why, score: Math.round(x.score * 100) / 100, sure: !!x.sure };
      (it.kind === 'leader' ? leaders : rows).push({ ...it.r, pid: x.id, how });
      if (!x.sure) check.push({ name: it.name, kind: it.kind, pid: x.id, why: x.why, score: how.score });
    } else unmatched.push({ ...it.r, kind: it.kind, alts: x.alts.slice(0, 3).map(a => ({ pid: a.id, score: Math.round(a.score * 100) / 100, why: a.why })) });
  });
  return { rows, leaders, check, unmatched };
}
/** an EVAL row as kept for an agent */
const qRowOf = (r, old) => { const kpi = { ...((old && old.kpi) || {}) }; if (r.final != null) kpi.qobs = Math.round(r.final * 10000) / 10000; else if (r.status) delete kpi.qobs; return { ...(old || {}), n: r.name, sheet: r.sheet, section: r.section, eval: { callqa: r.callqa, ticketqa: r.ticketqa, cr: r.cr, ev: r.eval, final: r.final }, status: r.status || '', crit: r.crit || [], kpi, ...(r.how ? { how: r.how } : {}) }; };
/** an EVAL row kept until somebody says who it is (everything in it, so nothing is lost when it is linked by hand) */
const qLeft = u => ({ name: u.name, kind: u.kind, sheet: u.sheet || '', section: u.section || '', callqa: u.callqa ?? null, ticketqa: u.ticketqa ?? null, cr: u.cr ?? null, eval: u.eval ?? null, final: u.final ?? null, items: u.items || null, crit: u.crit || [], status: u.status || '', alts: u.alts || [] });
const rosterSig = () => `${state.roster.length}|${rosterRows().map(p => p._id + (p.sys || '') + (p.email || '')).join('').length}|${Object.keys(state.history || {}).length}`;
/** the names still waiting, tried again (new joiners added to the roster, a name linked in another month) */
const qTried = {};
async function relinkLeft(k, quiet) {
  const Q = state.quality[k]; if (!Q || !(Q.unmatched || []).length || !canQuality() || monthLocked(k)) return 0;
  qTried[k] = rosterSig();
  const { links, no } = qSaved(), used = new Set([...Object.keys(Q.rows || {}), ...Object.keys(Q.leaders || {})]);
  const ev = { rows: Q.unmatched.filter(u => u.kind !== 'leader'), leaders: Q.unmatched.filter(u => u.kind === 'leader') };
  const M = matchEval(ev, links, no), got = [...M.rows.map(x => ({ ...x, kind: 'agent' })), ...M.leaders.map(x => ({ ...x, kind: 'leader' }))].filter(x => !used.has(x.pid));
  const alts = new Map(M.unmatched.map(u => [qKey(u.name), u.alts]));
  if (!got.length) {   // nobody new: only the suggestions may have changed
    Q.unmatched = Q.unmatched.map(u => ({ ...u, alts: alts.get(qKey(u.name)) || u.alts || [] })); state.qualityVer++;
    if (!quiet) toast('Nobody in the roster fits these names yet. Add them to the roster, or link them by hand.');
    return 0;
  }
  await qEdit(k, Q2 => {
    const keep = new Set();
    for (const x of got) {
      if ((Q2.rows || {})[x.pid] || (Q2.leaders || {})[x.pid]) continue;
      keep.add(qKey(x.name)); Q2.links = { ...(Q2.links || {}), [qKey(x.name)]: x.pid };
      if (x.kind === 'leader') { Q2.leaders = Q2.leaders || {}; Q2.leaders[x.pid] = { n: x.name, items: x.items || {}, how: x.how }; }
      else { Q2.rows = Q2.rows || {}; Q2.rows[x.pid] = qRowOf(x, Q2.rows[x.pid]); }
      if (!x.how.sure) Q2.check = [...(Q2.check || []), { name: x.name, kind: x.kind, pid: x.pid, why: x.how.why, score: x.how.score }];
    }
    Q2.unmatched = (Q2.unmatched || []).filter(u => !keep.has(qKey(u.name))).map(u => ({ ...u, alts: alts.get(qKey(u.name)) || u.alts || [] }));
    Q2.rsig = rosterSig();
  }, `The tool linked ${plural(got.length, 'more name')}`);
  if (!quiet) toast(`${plural(got.length, 'more name')} linked.`);
  return got.length;
}
/** a month whose results came from an incentive file: its final % is fixed (the quality numbers show, but do not re-score it) */
const qFixed = k => { const H = state.history[k]; return !!(H && !(H.tool || H.auto || H.page || H.daily)); };
/** the quality team's numbers for one person and month: a section of the person's page */
function qualityHtml(pid, k) {
  const x = k ? qRow(k, pid) : null; if (!x) return '';
  const e = x.eval || {}, crit = x.crit || [], kp = x.kpi || {}, KP = qualityKpis().filter(z => z.id !== 'qobs' && kp[z.id] != null);
  const cell = (l, v, d = 1, cls = '') => `<div class="${cls}"><span>${esc(l)}</span><b>${v == null ? '–' : pct(v, d)}</b></div>`;
  const qobs = kp.qobs != null ? kp.qobs : e.final;
  return `<section class="sec qsec"><h3>Quality · ${esc(ymLabel(k))}</h3><div class="pfgrid">${cell('Quality Observations', qobs, 1, qobs != null && qobs < 0.95 ? 'bad' : '')}${cell('Call QA', e.callqa)}${cell('Ticket QA', e.ticketqa)}${cell('CR', e.cr, 0)}${KP.map(z => cell(z.name, kp[z.id])).join('')}</div>
    ${crit.length ? `<p class="hint qcrit${crit.some(c => ATTITUDE.test(c.type || '')) ? ' bad' : ''}">Critical errors: ${esc(crit.map(c => c.type + (c.n > 1 ? ' ×' + c.n : '')).join(', '))}</p>` : ''}${x.status ? `<p class="hint">${esc(x.status)}</p>` : ''}
    <p class="hint">From the quality team's Final EVAL${x.n ? `, where the name is “${esc(x.n)}”` : ''}.${qFixed(k) ? ` ${esc(ymLabel(k))}'s results came from the incentive file, so its final % stays as it was.` : ' It counts in the KPI scorecard above.'}</p></section>`;
}
/** the quality numbers of a month moved to another month (the EVAL counts for that month's incentive instead) */
let qMoveTo = '';
async function qMove(from, to, sure) {
  if (!to || from === to || !canQuality()) return;
  if (monthLocked(from) || monthLocked(to)) { toast('A final month cannot change.'); return; }
  const Q = await qFresh(from); if (!Q) return;
  const T = await qFresh(to);
  if (T && !sure) { qMoveTo = to; toast(`${ymLabel(to)} already has quality numbers.`, { label: 'Replace them', fn: () => qMove(from, to, true) }); renderWs(); return; }
  const at = new Date().toISOString();
  await qWrite(to, { ...Q, k: to, moved: { from, at, by: whoNow() }, log: [...(Q.log || []), { at, by: whoNow(), what: `Moved from ${ymLabel(from)} to count for ${ymLabel(to)}` }].slice(-300) });
  try { await queueWrite('quality/' + from, () => state.db.doc('quality/' + from).delete()); } catch (e) { /* the copy is there; the old one stays */ }
  delete state.quality[from]; state.qualityVer++; state.qMonth = to; qMoveTo = '';
  markFresh('quality', `${ymLabel(to)} (moved from ${ymLabel(from)})`);
  toast(`The Final EVAL now counts for ${ymLabel(to)}.`); renderWs();
}
const canQuality = () => ['quality', 'admin', 'user'].includes(roleNow());
/** read a dropped workbook as the Final EVAL; true when it was one */
async function tryEvalFile(it, notes, kForce) {
  let sheets; try { sheets = await parse(it.name, await it.file.arrayBuffer(), true); } catch (e) { return false; }
  const ev = parseEval(sheets, it.name); if (!ev) return false;
  if (!canQuality()) { notes && notes.push({ bad: true }); toast('This is the quality team\'s Final EVAL. The quality team (or an analyst) drops it.'); return true; }
  const k = (ev.month ? ymKey(ev.month.y, ev.month.m) : '') || kForce || (state.ws === 'quality' ? qMonthNow() : monthKey());   // the month in the file's name wins
  await importEval(ev, k, it.name);
  state.qMonth = k;
  if (notes) notes.push({ kpi: `${it.name}: Final EVAL for ${ymLabel(k)}` });
  return true;
}
async function importEval(ev, k, fileName) {
  if (monthLocked(k)) { toast(`${ymLabel(k)} is final; the quality numbers cannot change any more.`); return; }
  const cur = await qFresh(k), { links: saved, no } = qSaved(), M = matchEval(ev, saved, no);
  const rows = { ...((cur && cur.rows) || {}) }, links = { ...((cur && cur.links) || {}) };
  for (const r of M.rows) { rows[r.pid] = qRowOf(r, rows[r.pid]); links[qKey(r.name)] = r.pid; }
  const leaders = { ...((cur && cur.leaders) || {}) };
  for (const l of M.leaders) { leaders[l.pid] = { n: l.name, items: l.items, how: l.how }; links[qKey(l.name)] = l.pid; }
  const body = { k, src: fileName, at: new Date().toISOString(), by: whoNow(), rows, leaders, links, no: (cur && cur.no) || {}, check: M.check, unmatched: M.unmatched.map(qLeft), rsig: rosterSig(), log: (cur && cur.log) || [] };
  await qWrite(k, body);
  const n = M.rows.length + M.leaders.length;
  markFresh('quality', `${ymLabel(k)}, ${plural(M.rows.length, 'agent')}${M.leaders.length ? `, ${plural(M.leaders.length, 'team lead')}` : ''}`);
  toast(`Final EVAL for ${ymLabel(k)}: the tool linked ${n} of ${n + M.unmatched.length} names${M.check.length ? `, ${M.check.length} to glance at` : ''}${M.unmatched.length ? `, ${M.unmatched.length} need you` : ''}.`);
}
/** the quality record as it is in the shared data right now (another quality member may have changed it) */
async function qFresh(k) { try { const s = await state.db.doc('quality/' + k).get(); return s.exists ? s.data() : state.quality[k] || null; } catch (e) { return state.quality[k] || null; } }
async function qWrite(k, body) {
  state.quality[k] = body; state.qualityVer++; state.incModelCache = null;
  if (state.db) await queueWrite('quality/' + k, () => state.db.doc('quality/' + k).set(body));
  if (state.ctx) state.kpi = computeKpi();
  if (state.ws !== 'build') renderWs(); else render();
}
/** one change by hand: re-read, change, write (so two people editing different agents do not undo each other) */
async function qEdit(k, fn, what) {
  if (!canQuality()) return;
  if (monthLocked(k)) { toast(`${ymLabel(k)} is final.`); return; }
  const cur = (await qFresh(k)) || { k, rows: {}, leaders: {}, links: {}, unmatched: [] };
  const next = JSON.parse(JSON.stringify(cur)); fn(next);
  next.log = [...(next.log || []), { at: new Date().toISOString(), by: whoNow(), what }].slice(-300);
  next.at = new Date().toISOString(); next.by = whoNow();
  await qWrite(k, next);
}
function qMonths() { const s = new Set([...wsMonths(), ...Object.keys(state.quality), monthKey()]); return [...s].filter(Boolean).sort(); }
function qMonthNow() { const L = qMonths(); if (!L.includes(state.qMonth)) { const w = wsMonthNow(); state.qMonth = w && L.includes(w) ? w : L[L.length - 1] || monthKey(); } return state.qMonth; }
/** the KPIs the quality team owns somewhere in the scorecards: [{id, name}] */
function qualityKpis() { const m = new Map(); for (const c of [...Object.values(curCards().teams), ...allTeamCards()]) for (const k of c.kpis) if (k.src === 'file' && ownerOf(k) === 'quality' && !m.has(k.id)) m.set(k.id, k.name); return [...m].map(([id, name]) => ({ id, name })); }
function renderQuality() {
  const k = qMonthNow(), Q = state.quality[k] || null, locked = monthLocked(k), can = canQuality() && !locked, KP = qualityKpis();
  $('qualityBar').innerHTML = `<label class="wsfield"><span>Month</span><select class="cell" data-qmonth aria-label="Month">${qMonths().slice().reverse().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}${monthLocked(x) ? ' · final' : ''}</option>`).join('')}</select></label>
    <div class="wsacts">${can ? '<button class="btn sm primary" data-qdrop><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Drop the Final EVAL</button>' : ''}${canQuality() ? '<button class="btn sm" data-qtpl title="An EVAL workbook with every agent\'s national ID: filled in and dropped back, every row links by its ID"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>EVAL template with IDs</button>' : ''}<button class="btn sm" data-x="quality"${Q ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button></div>`;
  const body = $('qualityBody');
  const head = Q ? `<div class="wsstatus ${locked ? 'final' : 'draft'}"><span class="dot"></span><div><b>${locked ? 'Final' : 'Open'}</b> · Final EVAL <b>${esc(Q.src || 'typed by hand')}</b>, ${esc(Q.by || '')} ${esc(Q.at ? fmtWhen(Q.at) : '')}.${locked ? ` ${esc(ymLabel(k))} was ${esc(finalBy(k))}; nothing here can change.` : ' Changes count straight away in every scorecard.'}</div></div>`
    + (qFixed(k) ? `<div class="banner info">${esc(ymLabel(k))}'s results came from the incentive file, so its scorecards are fixed: these numbers show on each agent's page but do not change the final %.${can ? ` If this EVAL is for another month, choose it: <select class="cell" data-qmove aria-label="Count it for">${qMonths().filter(x => x !== k && !monthLocked(x)).reverse().map(x => `<option value="${x}"${x === qMoveTo ? ' selected' : ''}>${esc(ymLabel(x))}${qFixed(x) ? '' : ' · built by the tool'}</option>`).join('')}</select> <button class="btn sm" data-qmovego>Count it for that month</button>` : ''}</div>` : '')
    : `<div class="card empty"><b>No quality results for ${esc(ymLabel(k))} yet</b>${can ? 'Drop the month\'s Final EVAL workbook (Virgin, FRiENDi and Leaders sheets). Names are matched to the roster; anything left over can be linked here.' : 'The quality team has not added them yet.'}</div>`;
  if (!Q) { body.innerHTML = head + safeHtml(objFixHtml, 'quality') + `<div class="card qdrop" data-qdropzone><svg width="22" height="22" aria-hidden="true"><use href="#i-up"/></svg><b>Drop the Final EVAL here</b><span>or use the button above</span></div>`; return; }
  const R = rosterRows(), U = Q.unmatched || [], linked = new Set([...Object.keys(Q.rows || {}), ...Object.keys(Q.leaders || {})]);
  const C = (Q.check || []).map((c, i) => ({ ...c, i })).filter(c => linked.has(c.pid));
  const nmOf = pid => { const p = R.find(x => x._id === pid); return p ? gname(effP(pid) || p) || p.name : ''; };
  const whereOf = pid => { const p = R.find(x => x._id === pid); return p ? unitOf(p) : ''; };
  if (can && U.length && qTried[k] !== rosterSig() && Q.rsig !== rosterSig()) setTimeout(() => relinkLeft(k, true), 0);   // the roster changed: look again
  const total = linked.size + U.length;
  const others = R.filter(p => !linked.has(p._id)).sort((a, b) => String(gname(a) || a.name).localeCompare(String(gname(b) || b.name)));
  const pickList = (u, i) => {
    const alts = (u.alts || []).filter(a => !linked.has(a.pid) && R.some(p => p._id === a.pid));
    return `${alts.length ? `<span class="qalts">${alts.map(a => `<button class="btn sm${a === alts[0] ? ' primary' : ''}" data-qpick="${i}|${esc(a.pid)}" title="${esc(a.why)}">${esc(nmOf(a.pid))} <small>${esc(whereOf(a.pid))}</small></button>`).join('')}</span>` : '<span class="sg">Nobody in the roster fits</span>'}
      <select class="cell" data-qlink="${i}" aria-label="Who ${esc(u.name)} is"><option value="">Someone else…</option>${others.map(p => `<option value="${esc(p._id)}">${esc(gname(effP(p._id) || p) || p.name)} · ${esc(p.brand || '')} ${esc(p.team || '')}</option>`).join('')}</select>
      <button class="btn sm ghost" data-qskip="${i}" title="This person is not in our roster (left, or not ours)">Not ours</button>`;
  };
  const unm = `<div class="card qnames"><div class="cardhead"><div><h2>Names in the EVAL · ${total}</h2>
    <p class="cap">Linked by the tool from the roster, Genesys and email names and the names in past months' files, even when spelt differently (Sebaih / Subah, Al-Qahtani / alQhatani). Only when one person clearly fits; one person per name; remembered next month.</p></div>
    ${can && U.length ? '<button class="btn sm" data-qrelink>Look again</button>' : ''}</div>
    <div class="qcount"><span class="ok"><b>${linked.size}</b> linked</span>${C.length ? `<span class="warn"><b>${C.length}</b> to glance at</span>` : ''}${U.length ? `<span class="bad"><b>${U.length}</b> need you</span>` : ''}${!C.length && !U.length ? '<span class="ok">Every name is linked and checked.</span>' : ''}</div>
    ${C.length ? `<div class="sechead"><h3 class="sub">Linked by the tool · glance at these</h3><span class="spacer"></span>${can ? '<button class="btn sm" data-qokall>All right</button>' : ''}</div><ul class="ilist qcheck">${C.map(c => `<li><span class="nm" dir="auto">${esc(c.name)}</span><span class="arrow" aria-hidden="true">→</span><button class="linkbtn nm" data-open="${esc(c.pid)}" dir="auto">${esc(nmOf(c.pid))}</button><span class="sg">${esc(whereOf(c.pid))} · ${esc(c.why || '')}</span><span class="sp"></span>${can ? `<span class="acts"><button class="btn sm" data-qok="${c.i}">Right</button><button class="btn sm ghost" data-qnot="${c.i}">Not this person</button></span>` : ''}</li>`).join('')}</ul>` : ''}
    ${U.length ? `<h3 class="sub">Need you · choose who each one is</h3><ul class="ilist qlink">${U.map((u, i) => `<li><span class="nm" dir="auto">${esc(u.name)}</span><span class="sg">${esc(u.kind === 'leader' ? 'team lead' : [u.sheet, u.section].filter(Boolean).join(' · '))}${u.status ? ' · ' + esc(u.status) : u.final != null ? ' · ' + pct(u.final, 1) : ''}</span><span class="sp"></span>${can ? `<span class="acts">${pickList(u, i)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div>`;
  const q = normName(state.qQ || '');
  const people = Object.entries(Q.rows || {}).map(([pid, x]) => ({ pid, x, p: R.find(p => p._id === pid) })).filter(o => o.p && (!q || normName(`${o.x.n} ${o.p.name}`).includes(q)))
    .sort((a, b) => unitRank(unitOf(a.p)) - unitRank(unitOf(b.p)) || String(a.x.n).localeCompare(String(b.x.n)));
  const cell = (pid, id, v) => can ? `<input class="cell qv" data-qk="${esc(id)}" data-qp="${esc(pid)}" value="${v == null ? '' : +(v * 100).toFixed(2)}" inputmode="decimal" aria-label="${esc(id)}" placeholder="–">` : `<span class="num">${v == null ? '–' : pct(v, 1)}</span>`;
  const crit = (pid, c) => can ? `<input class="cell qc" data-qcrit="${esc(pid)}" value="${esc((c || []).map(x => `${x.type}${x.n > 1 ? ' ×' + x.n : ''}`).join('; '))}" placeholder="None" aria-label="Critical errors">` : esc((c || []).map(x => x.type).join('; ') || '–');
  const fixed = qFixed(k), map = rowsByPid(k);
  const scoreCell = pid => { const r = map.get(pid); if (!r) return '<span class="subtle">not in the month</span>'; if (fixed || !r.kpi) return `${pct1(r.fin)} <small class="subtle">fixed</small>`; const e = r.kpi.find(z => /quality observ/i.test(z[0])); return `<b>${pct1(r.fin)}</b>${e ? ` <small class="subtle">QO rank ${e[4] ?? '–'}</small>` : ''}`; };
  const tab = `<div class="card"><div class="cardhead"><div><h2>Agents · ${people.length}</h2><p class="cap">Call QA, Ticket QA and CR come from the EVAL; their average is Quality Observations. Type a corrected value (as %) in any quality KPI; an "Attitude" critical error stops the incentive.</p></div>
    <div class="toolbar"><input type="search" data-qq value="${esc(state.qQ)}" placeholder="Search a name" aria-label="Search"></div></div>
    <div class="tablewrap restab qtab"><table><thead><tr><th>Agent</th><th>Team</th><th class="r">Call QA</th><th class="r">Ticket QA</th><th class="r">CR</th>${KP.map(x => `<th class="r">${esc(x.name)}</th>`).join('')}<th>Critical errors</th><th class="r" title="The agent's KPI scorecard for the month, with these numbers in it">In the scorecard</th></tr></thead><tbody>
    ${people.map(({ pid, x, p }) => `<tr${(x.crit || []).some(c => ATTITUDE.test(c.type || '')) ? ' class="bad"' : ''}><td><button class="linkbtn nm" data-open="${esc(pid)}" data-agent="${esc(pid)}" dir="auto">${esc(gname(effP(pid) || p) || x.n)}</button>${x.status ? ` <span class="pill">${esc(x.status)}</span>` : ''}</td><td>${esc(unitOf(p))}</td>
      <td class="r num">${x.eval && x.eval.callqa != null ? pct(x.eval.callqa, 1) : '–'}</td><td class="r num">${x.eval && x.eval.ticketqa != null ? pct(x.eval.ticketqa, 1) : '–'}</td><td class="r num">${x.eval && x.eval.cr != null ? pct(x.eval.cr, 0) : '–'}</td>
      ${KP.map(kk => `<td class="r">${cell(pid, kk.id, x.kpi ? x.kpi[kk.id] : null)}</td>`).join('')}<td>${crit(pid, x.crit)}</td><td class="r num">${scoreCell(pid)}</td></tr>`).join('') || `<tr><td colspan="${7 + KP.length}" class="empty">Nobody matches.</td></tr>`}
    </tbody></table></div>${can ? `<div class="formbtns"><button class="btn sm" data-qadd>Add an agent by hand</button></div>` : ''}</div>`;
  const L = Object.entries(Q.leaders || {}).map(([pid, x]) => ({ pid, x, p: R.find(p => p._id === pid) })).filter(o => o.p);
  const lead = L.length || can ? `<div class="card"><h2>Team leads · quality items</h2><p class="cap">From the Leaders sheet: each item is the part of its weight the lead earned (5% of 5% is full marks). They count in the supervisors' scorecards.</p>
    <div class="tablewrap restab"><table><thead><tr><th>Team lead</th>${LEADER_ITEMS.map(([, l, w]) => `<th class="r">${esc(l)} <small>${pct(w, 0)}</small></th>`).join('')}<th class="r">Total</th></tr></thead><tbody>
    ${L.map(({ pid, x, p }) => `<tr><td>${esc(gname(effP(pid) || p) || x.n)}</td>${LEADER_ITEMS.map(([id]) => `<td class="r">${can ? `<input class="cell qv" data-qlead="${esc(pid)}" data-qi="${id}" value="${x.items[id] == null ? '' : +(x.items[id] * 100).toFixed(2)}" inputmode="decimal" placeholder="–" aria-label="${esc(id)}">` : pct(x.items[id], 2)}</td>`).join('')}<td class="r num"><b>${pct(sum(Object.values(x.items || {})), 1)}</b></td></tr>`).join('') || `<tr><td colspan="${LEADER_ITEMS.length + 2}" class="empty">No team leads in this EVAL.</td></tr>`}
    </tbody></table></div></div>` : '';
  const log = (Q.log || []).length ? `<details class="card wslog"><summary>Changes by hand · ${Q.log.length}</summary><ul class="ilist">${Q.log.slice().reverse().map(e => `<li><span class="nm">${esc(e.what)}</span><span class="sg">${esc(e.by || '')} · ${esc(fmtWhen(e.at))}</span></li>`).join('')}</ul></details>` : '';
  const keep = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-qq]') ? document.activeElement.selectionStart : null;
  body.innerHTML = head + safeHtml(objFixHtml, 'quality') + unm + tab + lead + log;
  if (keep != null) { const i = body.querySelector('[data-qq]'); if (i) { i.focus(); i.setSelectionRange(keep, keep); } }
  reveal(body);
}
/** the Final EVAL as a workbook to fill in, with every agent's national ID (Virgin and FRiENDi sheets, a section per team, the
    columns the tool reads). Filled in and dropped back, each row links by its ID: no names to guess. */
async function evalTemplate(k) {
  const leads = new Set(supervisors().map(x => x.pid)), order = t => DEP_ORDER.indexOf(t) + 1 || 99;
  const R = rosterRows().filter(p => p.status !== 'Inactive' && !leads.has(p._id) && !['MG', 'OP'].includes(normSpace(p.team)));
  const nm = p => gname(effP(p._id) || p) || p.name, sheets = [];
  for (const sh of ['Virgin', 'FRiENDi']) {
    const L = R.filter(p => (normBrand(p.brand) === 'Virgin' ? 'Virgin' : 'FRiENDi') === sh); if (!L.length) continue;
    const rows = [];
    for (const t of [...new Set(L.map(p => normSpace(p.team) || '–'))].sort((a, b) => order(a) - order(b))) {
      rows.push(['', `${t}${DEP_NAMES[t] ? ' · ' + DEP_NAMES[t] : ''}`, null, null, null, null, '', null]);   // a section title (no dash: the reader skips titles with one)
      for (const p of L.filter(x => (normSpace(x.team) || '–') === t).sort((a, b) => nm(a).localeCompare(nm(b)))) rows.push([Core.cleanId((effP(p._id) || p).nid) || '', nm(p), null, null, null, null, '', null]);
    }
    sheets.push({ name: sh, title: `Final EVAL - ${sh} - ${ymLabel(k)}`, sub: 'Type the scores (95 or 95%). Keep the National ID column: the tool links each row by it. A blank Final Score is the average of Call QA, Ticket QA and CR.',
      cols: [{ h: 'National ID', t: 'text', w: 14 }, { h: 'Agent Name', t: 'text', w: 34 }, { h: 'Call QA Score', t: 'pct', w: 13 }, { h: 'Ticket QA Score', t: 'pct', w: 13 }, { h: 'CR', t: 'pct', w: 9 }, { h: 'Final Score', t: 'pct', w: 12 }, { h: 'Critical Error', t: 'text', w: 28 }, { h: 'Number of Critical Errors', t: 'int', w: 14 }], rows, freezeCol: 2 });
  }
  if (!sheets.length) { toast('Nobody in the roster yet.'); return; }
  const [y, m] = k.split('-').map(Number);
  await xlBook(`Final EVAL - ${MONTH_LONG[m - 1]} ${y} - with IDs.xlsx`, sheets);
}
async function exportQuality() {
  const k = qMonthNow(), Q = state.quality[k]; if (!Q) return; const KP = qualityKpis(), R = rosterRows();
  const rows = Object.entries(Q.rows || {}).map(([pid, x]) => { const p = R.find(y => y._id === pid) || {}; return [gname(effP(pid) || p) || x.n, Core.cleanId((effP(pid) || p).nid) || '', p.brand || '', p.team || '', x.eval ? x.eval.callqa : null, x.eval ? x.eval.ticketqa : null, x.eval ? x.eval.cr : null, ...KP.map(kk => (x.kpi ? x.kpi[kk.id] ?? null : null)), (x.crit || []).map(c => c.type).join('; '), x.status || '']; });
  await xlBook(`Quality results - ${ymLabel(k)}.xlsx`, [
    { name: 'Agents', title: `Quality results - ${ymLabel(k)}`, sub: `${Q.src || ''} · ${stamp(k)}`, cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'National ID', t: 'text', w: 13 }, { h: 'Brand', t: 'text', w: 11 }, { h: 'Team', t: 'text', w: 8 }, { h: 'Call QA', t: 'pct' }, { h: 'Ticket QA', t: 'pct' }, { h: 'CR', t: 'pct' }, ...KP.map(x => ({ h: x.name, t: 'pct' })), { h: 'Critical errors', t: 'text', w: 30 }, { h: 'Note', t: 'text', w: 12 }], rows },
    { name: 'Team leads', title: `Team leads - ${ymLabel(k)}`, sub: stamp(k), cols: [{ h: 'Team lead', t: 'text', w: 30 }, ...LEADER_ITEMS.map(([, l]) => ({ h: l, t: 'pct' })), { h: 'Total', t: 'pct' }],
      rows: Object.entries(Q.leaders || {}).map(([pid, x]) => [supName(pid) || x.n, ...LEADER_ITEMS.map(([id]) => x.items[id] ?? null), sum(Object.values(x.items || {}))]) }]);
}
// events
$('qualityBar').addEventListener('change', e => { if (e.target.matches('[data-qmonth]')) { state.qMonth = e.target.value; renderWs(); } });
$('qualityBody').addEventListener('change', e => { if (e.target.matches('[data-qmove]')) qMoveTo = e.target.value; });
$('qualityBody').addEventListener('click', e => { if (e.target.closest('[data-qmovego]')) { const s = $('qualityBody').querySelector('[data-qmove]'); qMove(qMonthNow(), (s && s.value) || qMoveTo); } });
const qPicker = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,.xlsm', hidden: true, id: 'qPicker' }); document.body.appendChild(qPicker);
qPicker.addEventListener('change', async () => { const f = qPicker.files[0]; qPicker.value = ''; if (!f) return; const ok = await tryEvalFile({ name: f.name, file: f }, null, qMonthNow()); if (!ok) toast(`${f.name} does not look like the Final EVAL (no "Agent Name" with Call QA or Final Score).`); });
$('v-quality').addEventListener('click', e => {
  if (e.target.closest('[data-qdrop], [data-qdropzone]')) { qPicker.click(); return; }
  if (e.target.closest('[data-x="quality"]')) { exportQuality(); return; }
  if (e.target.closest('[data-qtpl]')) { evalTemplate(qMonthNow()); return; }
  if (e.target.closest('[data-qadd]')) {
    const k = qMonthNow(), Q = state.quality[k] || { rows: {} }, R = rosterRows().filter(p => !(Q.rows || {})[p._id]);
    const nm = prompt('Who? Type the name as it is in the roster.'); if (!nm) return;
    const p = R.find(x => normName(gname(x) || x.name) === normName(nm) || normName(x.name) === normName(nm)); if (!p) { toast('Nobody with that name who is not already in the list.'); return; }
    qEdit(k, Q2 => { Q2.rows = Q2.rows || {}; Q2.rows[p._id] = { n: gname(p) || p.name, kpi: {}, crit: [] }; }, `Added ${p.name}`); return;
  }
  if (e.target.closest('[data-qrelink]')) { relinkLeft(qMonthNow()); return; }
  if (e.target.closest('[data-qokall]')) { const k = qMonthNow(), n = (state.quality[k].check || []).length; qEdit(k, Q => { for (const c of Q.check || []) { const r = (Q.rows || {})[c.pid] || (Q.leaders || {})[c.pid]; if (r && r.how) r.how.sure = true; } Q.check = []; }, `Checked all ${plural(n, 'link')} the tool made`); return; }
  const ok = e.target.closest('[data-qok]');
  if (ok) { const k = qMonthNow(), c = (state.quality[k].check || [])[+ok.dataset.qok]; if (!c) return; qEdit(k, Q => { Q.check = (Q.check || []).filter(x => !(x.pid === c.pid && x.name === c.name)); const r = (Q.rows || {})[c.pid] || (Q.leaders || {})[c.pid]; if (r && r.how) r.how.sure = true; }, `Checked: "${c.name}" is ${supName(c.pid)}`); return; }
  const not = e.target.closest('[data-qnot]');
  if (not) { qUnlink(qMonthNow(), +not.dataset.qnot); return; }
  const pick = e.target.closest('[data-qpick]');
  if (pick) { const [i, pid] = pick.dataset.qpick.split('|'); qLinkLeft(qMonthNow(), +i, pid); return; }
  const skip = e.target.closest('[data-qskip]');
  if (skip) { qLinkLeft(qMonthNow(), +skip.dataset.qskip, '-'); return; }
  const op = e.target.closest('[data-open]'); if (op) { state.personK = qMonthNow(); openPerson(op.dataset.open); }
});
/** a name left in the EVAL, linked by hand (or set aside: "-") */
function qLinkLeft(k, i, pid) {
  const Q0 = state.quality[k], u0 = Q0 && (Q0.unmatched || [])[i]; if (!u0) return;
  if (pid !== '-' && ((Q0.rows || {})[pid] || (Q0.leaders || {})[pid])) { toast(`${supName(pid)} is already linked to another name. Use "Not this person" on that one first.`); return; }
  qEdit(k, Q => {
    const at = (Q.unmatched || []).findIndex(u => qKey(u.name) === qKey(u0.name)); if (at < 0) return;
    const u = Q.unmatched[at]; Q.unmatched.splice(at, 1);
    if (pid === '-') { Q.skipped = [...(Q.skipped || []), u.name]; return; }
    Q.links = { ...(Q.links || {}), [qKey(u.name)]: pid };
    if (Q.no && Q.no[qKey(u.name)]) Q.no[qKey(u.name)] = Q.no[qKey(u.name)].filter(x => x !== pid);
    if (u.kind === 'leader') { Q.leaders = Q.leaders || {}; Q.leaders[pid] = { n: u.name, items: u.items || {}, how: { why: 'linked by hand', score: 1, sure: true } }; }
    else { Q.rows = Q.rows || {}; Q.rows[pid] = qRowOf({ ...u, how: { why: 'linked by hand', score: 1, sure: true } }, Q.rows[pid]); }
  }, pid === '-' ? `"${u0.name}" is not in our roster` : `Linked "${u0.name}" to ${supName(pid)}`);
}
/** a link the tool made that is wrong: the name goes back to the list, and the tool never links that pair again */
async function qUnlink(k, ci) {
  const Q0 = state.quality[k], c = Q0 && (Q0.check || [])[ci]; if (!c) return;
  const { links, no } = qSaved(), key = qKey(c.name);
  no[key] = [...new Set([...(no[key] || []), c.pid])]; delete links[key];
  await qEdit(k, Q => {
    const isLead = c.kind === 'leader', src = isLead ? (Q.leaders || {})[c.pid] : (Q.rows || {})[c.pid];
    if (!src) return;
    if (isLead) delete Q.leaders[c.pid]; else delete Q.rows[c.pid];
    if (Q.links) delete Q.links[key];
    Q.no = { ...(Q.no || {}), [key]: [...new Set([...((Q.no || {})[key] || []), c.pid])] };
    Q.check = (Q.check || []).filter(x => !(x.pid === c.pid && x.name === c.name));
    const left = isLead ? { name: c.name, kind: 'leader', items: src.items || {} } : { name: c.name, kind: 'agent', sheet: src.sheet || '', section: src.section || '', callqa: src.eval ? src.eval.callqa : null, ticketqa: src.eval ? src.eval.ticketqa : null, cr: src.eval ? src.eval.cr : null, eval: src.eval ? src.eval.ev : null, final: src.eval ? src.eval.final : null, crit: src.crit || [], status: src.status || '' };
    const M = matchEval(isLead ? { rows: [], leaders: [left] } : { rows: [left], leaders: [] }, links, Q.no);
    const alts = ((M.unmatched[0] || {}).alts || []).filter(a => a.pid !== c.pid);
    Q.unmatched = [...(Q.unmatched || []), qLeft({ ...left, alts })];
  }, `"${c.name}" is not ${supName(c.pid)}: unlinked`);
}
$('v-quality').addEventListener('input', e => { if (e.target.matches('[data-qq]')) { state.qQ = e.target.value; renderWs(); } });
$('v-quality').addEventListener('change', e => {
  const t = e.target, k = qMonthNow();
  if (t.matches('[data-qk]')) {
    const pid = t.dataset.qp, id = t.dataset.qk, v = normSpace(t.value) === '' ? null : qPct(t.value);
    if (normSpace(t.value) !== '' && (v == null || v < 0 || v > 1.0001)) { toast('Type a percentage, like 94 or 94%.'); return; }
    qEdit(k, Q => { const r = Q.rows[pid] = Q.rows[pid] || { n: supName(pid), kpi: {} }; r.kpi = r.kpi || {}; if (v == null) delete r.kpi[id]; else r.kpi[id] = v; }, `${(qualityKpis().find(x => x.id === id) || { name: id }).name} for ${supName(pid)}: ${v == null ? 'empty' : pct(v, 1)}`);
  }
  if (t.matches('[data-qcrit]')) {
    const pid = t.dataset.qcrit, list = normSpace(t.value) ? t.value.split(';').map(normSpace).filter(Boolean).map(s => { const m = /^(.*?)\s*×\s*(\d+)$/.exec(s); return m ? { type: m[1], n: +m[2] } : { type: s, n: 1 }; }) : [];
    qEdit(k, Q => { const r = Q.rows[pid] = Q.rows[pid] || { n: supName(pid), kpi: {} }; r.crit = list; }, `Critical errors for ${supName(pid)}: ${list.map(c => c.type).join('; ') || 'none'}`);
  }
  if (t.matches('[data-qlead]')) {
    const pid = t.dataset.qlead, id = t.dataset.qi, v = normSpace(t.value) === '' ? null : qPct(t.value);
    qEdit(k, Q => { const r = Q.leaders[pid] = Q.leaders[pid] || { n: supName(pid), items: {} }; if (v == null) delete r.items[id]; else r.items[id] = v; }, `${(LEADER_ITEMS.find(x => x[0] === id) || [, id])[1]} for ${supName(pid)}: ${v == null ? 'empty' : pct(v, 2)}`);
  }
  if (t.matches('[data-qlink]')) { const pid = t.value; if (pid) qLinkLeft(k, +t.dataset.qlink, pid); }
});
