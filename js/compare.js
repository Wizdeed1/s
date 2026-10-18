// ================================================================ RECONCILE: the old Excel of a month next to the tool, and why they differ
// While the old way still runs beside the tool, drop the old Excel of a month on Results (up to three files at once: the final
// result, the incentive data workbook, the deduction workbook) or paste the results table from the email. Each file is recognised
// (what it is and the month it holds: its dates and title beat its name), every person is lined up (national ID, then name) and
// each difference is put down to its cause (js/recon.js): an own incentive base, days taken off for absences, days counted
// differently, a Final % the tool cannot reproduce, a month the tool has no result for. The senior manager or an admin fixes the
// cause in the rules (own bases, an absence rule) or takes the old value as a logged adjustment, each with Undo. Only the counts
// are kept with the month (who compared, when, what was found), so the change-over can be shown to have been checked.
Object.assign(state, { cmp: null, cmpSaved: {}, recon: null, reconRule: {}, reconOff: new Set(), reconFold: {} });
const RC_MEAS = ['fin', 'earned', 'adh', 'aht', 'absent', 'tardy', 'ka', 'ks'];
const rcFmt = (m, v) => { const t = Recon.meas(m).t; return v == null ? '–' : t === 'pct' ? `${+(v * 100).toFixed(2)}%` : t === 'sec' ? mss(v) : String(Math.round(v * 100) / 100); };
const rcD = (m, d) => { const t = Recon.meas(m).t; return `${d > 0 ? '+' : '−'}${t === 'pct' ? `${+Math.abs(d * 100).toFixed(2)} pt` : t === 'sec' ? mss(Math.abs(d)) : Math.round(Math.abs(d) * 100) / 100}`; };
const rcSR = v => (v == null ? '–' : Math.round(v).toLocaleString('en-US'));
/** the senior manager or an admin fixes; a final month only the senior manager */
const rcCan = k => canRules() && (!monthLocked(k) || isSenior());

// ---------------------------------------------------------------- reading the old files
/** one old file -> { name, kind, label, month, src, conflict, inner, table | inc | ded } */
function rcEntry(name, sheets) {
  const c = Recon.classify(sheets, name), e = { name, kind: c.kind, label: c.label, month: c.month, src: c.src, conflict: c.conflict, inner: c.inner };
  if (c.kind === 'final' || c.kind === 'res') e.table = Recon.readTable(sheets);
  if (c.kind === 'inc') {
    const R = History.read(sheets, { target: state.settings.target, floor: state.settings.floor, count: countFor(c.month || undefined) });
    e.inc = { rows: R.rows, problems: Recon.entryProblems(R.rows) };
    if (!e.month && R.y && R.m) { e.month = ymKey(R.y, R.m); e.src = 'workbook'; }
  }
  if (c.kind === 'ded') { const S = sheets.find(s => s.name === c.sheet); e.ded = S ? Recon.dedCheck(S) : null; if (!e.month && e.ded && e.ded.month) e.month = e.ded.month; }
  return e;
}
/** 1-3 old files at once (Results, a drop anywhere on the page, the Recognise panel) */
async function cmpFiles(files) {
  const got = [];
  for (const f of [...files].slice(0, 6)) {
    let sheets; try { const buf = await f.arrayBuffer(); sheets = await (typeof parseRaw === 'function' ? parseRaw(f.name, buf) : parse(f.name, buf, true)); } catch (e) { toast(`${f.name}: could not read it.`); continue; }
    const e = rcEntry(f.name, sheets);
    if (!e.kind || e.kind === 'att' || ((e.kind === 'final' || e.kind === 'res') && !e.table)) { toast(e.kind === 'att' ? `${f.name} is an attendance report: drop it on Build › Import to use it for the month.` : `${f.name}: not an old final result, incentive data or deduction workbook (no ID or Name column with Final %, Earned SR, Adherence, AHT, Absent or Tardy next to it).`, { label: 'What is it?', fn: () => (typeof recogFiles === 'function' ? recogFiles([f], 'results') : null) }); continue; }
    got.push(e);
  }
  rcAdd(got);
}
async function cmpFile(file) { return cmpFiles([file]); }
/** the results table pasted from the email (tabs between the cells, as Outlook and Excel copy a table) */
function rcPasted(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter(l => normSpace(l));
  if (!lines.length) return null;
  const rows = lines.map(l => (l.includes('\t') ? l.split('\t') : l.split(/\s{2,}/)).map(c => normSpace(c)));
  const e = rcEntry('Pasted from the email', [{ name: 'Pasted', rows }]), t = Recon.titleMonth(lines.join(' '));
  if (t) { e.month = t; e.src = 'title'; }
  return e.table ? e : null;
}
function rcAdd(got) {
  if (!got.length) return;
  const R = state.recon || { files: [] }, cur = wsMonthNow(), have = new Set(wsMonths());
  for (const e of got) if (!e.month) { e.month = cur; e.src = 'page'; }
  state.recon = { files: [...R.files.filter(x => !got.some(g => g.name === x.name)), ...got], at: new Date().toISOString(), by: whoNow() };   // a file dropped again replaces itself
  let k = cur; const ms = [...new Set(got.map(e => e.month))];
  if (!ms.includes(cur)) { const m = ms.find(x => have.has(x)); if (m) { state.wsMonth = m; k = m; toast(`${got.find(e => e.month === m).name} holds ${ymLabel(m)}: showing ${ymLabel(m)}.`); } }
  rcSave(k);
  if (state.ws !== 'results') setWs('results'); else renderWs();
  setTimeout(() => { const el = $('reconCard'); if (el) el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); }, 80);
}

// ---------------------------------------------------------------- lining up and explaining
/** old rows [{id, name}] -> Map(index -> pid): national ID first, then the name (the same linking as everywhere) */
function rcMatch(rows) {
  const byNid = new Map(); for (const p of rosterRows()) { const id = Core.cleanId((effP(p._id) || p).nid); if (id) byNid.set(id, p._id); }
  const out = new Map(), taken = new Set(), left = [];
  rows.forEach((o, i) => { const pid = o.id && byNid.get(o.id); if (pid && !taken.has(pid)) { out.set(i, pid); taken.add(pid); } else left.push(i); });
  if (left.length) {
    const res = NameLink.link(left.map(i => ({ name: rows[i].name, id: '', kind: 'agent' })), linkPeople().filter(x => !taken.has(x.id)), {}, {});
    res.forEach((x, j) => { if (x.id && !taken.has(x.id)) { out.set(left[j], x.id); taken.add(x.id); } });
  }
  return out;
}
let rcMemo = null;
/** the old files of month k against the tool's month: people, causes in groups, the absence rules that fit, the totals */
function rcRun(k) {
  const R = state.recon; if (!R || !k) return null;
  const files = R.files.filter(e => e.month === k);
  const sig = [k, R.at, state.histVer, state.finVer, state.ver, state.rulesVer, state.qualityVer, state.attEditsVer, state.roster.length, files.map(e => e.name + '>' + e.month).join(',')].join('|');
  if (rcMemo && rcMemo.sig === sig) return rcMemo.res;
  const tabs = files.filter(e => e.table), incs = files.filter(e => e.inc), dedF = files.find(e => e.ded);
  const old = new Map(), onlyOld = [];
  const put = (rows, file, val) => { const m = rcMatch(rows); rows.forEach((x, i) => { const pid = m.get(i); if (!pid) { onlyOld.push({ name: x.name, id: x.id || x.idRaw || '', file, why: 'not found in the roster' }); return; } const cur = old.get(pid) || { o: {}, name: x.name, id: x.id || '', files: [] }; for (const [f, v] of Object.entries(val(x))) if (v != null && cur.o[f] == null) cur.o[f] = v; if (!cur.files.includes(file)) cur.files.push(file); old.set(pid, cur); }); };
  for (const e of tabs) put(e.table.rows, e.name, x => x.v);
  for (const e of incs) put(e.inc.rows.map(r => ({ id: Core.cleanId(r.id) || '', name: r.n, r })), e.name, ({ r }) => ({ adh: r.adh ?? null, aht: r.aht ?? null, absent: r.absent ?? null, tardy: r.tardy ?? null, ks: r.xl && r.xl.ks != null ? r.xl.ks : null, ka: r.xl && r.xl.ka != null ? r.xl.ka : null, issues: r.codeIssues ? r.codeIssues.length : null }));
  const D = monthData(k), map = rowsByPid(k), rec = D && D.rec;
  const scored = !!D && (D.final ? (D.final.rows || []).some(r => r.fin != null) : !!(rec && (rec.tool || rec.auto || rec.page || rec.daily)));
  const cfg = countFor(k), dp = Recon.finalPrecision([...old.values()].map(x => x.o.fin)), people = [];
  for (const [pid, x] of old) {
    const p = state.roster.find(q => q._id === pid), r = map.get(pid) || null;
    if (!r) { onlyOld.push({ name: x.name, id: x.id, file: x.files[0], why: `in the roster, but not in the tool's ${ymLabel(k)}` }); continue; }
    const team = normSpace((p && p.team) || r.team || ''), nm = p ? gname(effP(pid) || p) || p.name : x.name;
    const t = { fin: r.fin ?? null, earned: r.earned ?? null, ks: r.ks ?? null, ka: r.kat ?? r.ka ?? null, absent: +r.absent || 0, runs: r.kr ?? null, base: r.base ?? baseOf(p, r, k), card: !!cardFor(team, k), team, scored, missing: (r.kpi || []).filter(z => z[4] == null).map(z => z[0]) };
    const toolV = { fin: t.fin, earned: t.earned, adh: r.adh ?? null, aht: r.aht ?? null, absent: r.absent ?? null, tardy: r.tardy == null ? null : Math.round(r.tardy), ka: t.ka, ks: t.ks };
    const cells = Recon.cellsOf(x.o, toolV, RC_MEAS.filter(m => x.o[m] != null), dp), st = Recon.statusOf(cells);
    const ex = st === 'same' || st === 'none' ? { causes: [], ref: null } : Recon.explain(x.o, t, { cfg, dp }), cE = cells.find(c => c.m === 'earned');
    if (st === 'diff' && t.earned === 0 && x.o.earned > 0 && r._el && !r._el.ok) ex.causes.unshift({ kind: 'elig', why: (r._el.why || []).join(', ') });
    if (cE && cE.same) ex.causes = ex.causes.filter(c => !['absence', 'base', 'rounding', 'other', 'elig'].includes(c.kind));   // the tool pays the old amount already (a fix or a taken value)
    const ms = cells.filter(c => c.d != null && ['adh', 'aht', 'absent', 'tardy'].includes(c.m)).map(c => c.m);
    if (ms.length) ex.causes.push({ kind: 'meas', ms });
    people.push({ pid, rk: rowKey(r), name: nm, oldName: x.name, id: x.id || Core.cleanId(((p && effP(pid)) || p || {}).nid) || '', team, o: x.o, t, cells, st, causes: ex.causes, ref: ex.ref, adj: r._adj && r._adj.src === 'old-excel' ? r._adj : null });
  }
  const seenOld = new Set(), oo = onlyOld.filter(x => { const key = normName(x.name) + '|' + (x.id || ''); if (seenOld.has(key)) return false; seenOld.add(key); return true; });
  const inOld = new Set(people.map(x => x.pid));
  const onlyTool = [...map].filter(([pid, r]) => !inOld.has(pid) && (incs.length ? true : (r.earned || 0) > 0)).map(([pid, r]) => { const p = state.roster.find(q => q._id === pid); return { pid, name: p ? gname(effP(pid) || p) || p.name : r.n, earned: r.earned ?? null }; });
  const G = {}; for (const x of people) for (const c of x.causes) (G[c.kind] = G[c.kind] || []).push({ x, c });
  const absCases = (G.absence || []).map(({ x }) => ({ absent: x.t.absent, runs: x.t.runs ?? (x.t.absent > 0 ? 1 : 0), ka: x.t.ka, ks: x.t.ks, F: x.o.fin, base: x.t.base, E: x.o.earned }));
  const fits = absCases.length ? Recon.fitAbsence(absCases, cfg) : null;
  const picks = Recon.pickBases((G.base || []).map(({ x, c }) => ({ key: x.pid, ints: c.ints, lo: c.lo, hi: c.hi })));
  const lined = people.filter(x => x.o.earned != null), sum = L => L.reduce((a, v) => a + (+v || 0), 0);
  const res = { k, files, others: R.files.filter(e => e.month !== k), people, onlyOld: oo, onlyTool, G, fits, picks, cfg, dp, scored, absRows: rcAbsRows(map),
    tot: { n: lined.length, old: sum(lined.map(x => x.o.earned)), tool: sum(lined.map(x => x.t.earned)) },
    n: { lined: people.length, same: people.filter(x => x.st === 'same').length, diff: people.filter(x => x.st === 'diff').length, noTool: people.filter(x => x.st === 'noTool').length, taken: people.filter(x => x.adj).length },
    ded: dedF ? { file: dedF.name, ...dedF.ded } : null, inc: incs[0] ? { file: incs[0].name, ...incs[0].inc.problems } : null };
  rcMemo = { sig, res }; return res;
}
/** everyone absent in the tool's month, with what the absence rule would make of their earned SR */
function rcAbsRows(map) {
  const out = [];
  for (const [pid, r] of map) if ((+r.absent || 0) > 0 && r.fin != null && r.ks > 0) { const p = state.roster.find(q => q._id === pid); out.push({ pid, name: p ? gname(effP(pid) || p) || p.name : r.n, r }); }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
/** the counts kept with the month (cmp/<k>) */
function rcSave(k) {
  const S = rcRun(k); if (!S || !S.files.length) return;
  const causes = Object.fromEntries(Object.entries(S.G).map(([g, L]) => [g, L.length]));
  const sum = { k, file: S.files.map(e => e.name).join(', '), files: S.files.map(e => ({ name: e.name, kind: e.kind, month: e.month })), at: state.recon.at, by: state.recon.by, kind: S.files[0].kind, n: S.n.lined + S.onlyOld.length, matched: S.n.lined, same: S.n.same, diff: S.n.diff, noTool: S.n.noTool, onlyOld: S.onlyOld.length, onlyTool: S.onlyTool.length, causes, totals: { old: S.tot.old, tool: S.tot.tool } };
  state.cmpSaved[k] = sum;
  if (state.db) queueWrite('cmp/' + k, () => state.db.doc('cmp/' + k).set(sum)).catch(() => {});
  logCycle(k, `Reconciled ${ymLabel(k)} with the old Excel (${sum.file}): ${sum.same} of ${sum.matched} the same, ${sum.diff} different${sum.noTool ? `, ${sum.noTool} with no value in the tool` : ''}`);
}

// ---------------------------------------------------------------- the fixes (each logged, each with Undo)
/** the old values as the senior manager's adjustments of the month (src 'old-excel'): fields 'fin', 'earned', 'days' */
function rcAccept(k, list, fields) {
  if (!rcCan(k) || !list.length) return;
  let F = state.finals[k];
  if (!F) { const H = state.history[k]; if (!H) return; F = state.finals[k] = { y: H.y, m: H.m, status: 'open', adj: {}, log: [], by: (Auth.user() || {}).id || '', byName: whoNow(), at: new Date().toISOString() }; }
  const before = { ...(F.adj || {}) }, adj = { ...before }, at = new Date().toISOString(), by = whoNow(), file = (rcRun(k) || { files: [] }).files.map(e => e.name).join(', ');
  for (const { x } of list) {
    const cur = { ...(adj[x.rk] || {}) };
    if (fields.includes('fin') && x.o.fin != null) cur.fin = x.o.fin;
    if (fields.includes('earned') && x.o.earned != null) cur.earned = Math.round(x.o.earned);
    if (fields.includes('days') && x.o.ks != null && x.o.ka != null) { cur.ks = x.o.ks; cur.ka = x.o.ka; }
    adj[x.rk] = { ...cur, src: 'old-excel', old: { file, fin: x.o.fin ?? null, earned: x.o.earned ?? null, ks: x.o.ks ?? null, ka: x.o.ka ?? null }, tool: { fin: x.t.fin, earned: x.t.earned, ks: x.t.ks, ka: x.t.ka }, by, at };
  }
  const lbl = fields.map(f => ({ fin: 'Final %', earned: 'earned SR', days: 'days' }[f])).join(' and ');
  const what = `${lbl[0].toUpperCase() + lbl.slice(1)} taken from the old Excel (${file}) for ${list.length === 1 ? list[0].x.name : plural(list.length, 'person', 'people')}${list.length === 1 && fields.includes('earned') ? `: ${rcSR(list[0].x.o.earned)} SR, the tool had ${rcSR(list[0].x.t.earned)}` : ''}`;
  rcWriteAdj(k, adj, what);
  toast(`${what}.`, { label: 'Undo', fn: () => rcWriteAdj(k, before, `Undone: ${what}`) });
}
function rcWriteAdj(k, adj, what) {
  const F = state.finals[k]; if (!F) return;
  F.adj = adj; state.finVer++;
  if (state.db) { const body = JSON.parse(JSON.stringify(F)); queueWrite('final/' + k, () => state.db.doc('final/' + k).set(body)).then(() => logFinal(k, what), e => toast(`Not saved (${(e && e.code) || 'error'}).`)); }
  refresh(); renderWs();
}
/** own bases for the months of the rules in force for k (cards.people), in one save */
function rcBases(k, list, src) {
  if (!canRules()) { toast('Only the senior manager or an admin changes the incentive rules.'); return; }
  const ek = rulesFor(k).from, keep = state.ruleEdit; state.ruleEdit = ek;
  const C = ruleCards(), old = C.people ? { ...C.people } : null, at = new Date().toISOString(), by = whoNow(), ppl = { ...(C.people || {}) };
  for (const x of list) ppl[x.pid] = { base: x.base, src, at, by };
  C.people = ppl;
  const what = `Own bases from the old Excel (${src}): ${list.map(x => `${x.name} ${x.base} SR`).join(', ')}`, ok = saveRules(what); state.ruleEdit = keep;
  if (!ok) { if (old) C.people = old; else delete C.people; return; }
  refresh(); renderWs(); if (!$('dScore').hidden) renderScore();
  toast(`${plural(list.length, 'own base')} saved in the incentive rules (${ruleRange(ek)}).`, { label: 'Undo', fn: () => { state.ruleEdit = ek; const C2 = ruleCards(); if (old) C2.people = old; else delete C2.people; saveRules(`Undone: ${what}`); state.ruleEdit = keep; refresh(); renderWs(); } });
}
/** the same bases on the roster (the Base column: every month, every set of rules) */
function rcRoster(list) {
  if (!isBuilder()) return;
  const prev = list.map(x => ({ pid: x.pid, base: (state.roster.find(p => p._id === x.pid) || {}).base }));
  for (const x of list) updatePerson(x.pid, { base: x.base }, { quiet: true });
  refresh(); renderWs();
  toast(`${plural(list.length, 'base')} saved on the roster.`, { label: 'Undo', fn: () => { for (const x of prev) updatePerson(x.pid, { base: x.base ?? '' }, { quiet: true }); refresh(); renderWs(); } });
}
/** an absence penalty from the old Excel into the month's rules ('How it is counted') */
function rcRule(k, params) {
  if (!canRules()) { toast('Only the senior manager or an admin changes the incentive rules.'); return; }
  const ek = rulesFor(k).from, tgt = ek ? state.rules[ek] : state.cards; if (!tgt) return;
  const old = tgt.count, a = countOf(old), b = Kpi.normCount({ ...a, ...params });
  if (JSON.stringify(a) === JSON.stringify(b)) { toast('The rules already count absences this way.'); return; }
  const what = `How it is counted: absence penalty ${Recon.ruleText(params)} (from the old Excel)`;
  const save = (c, w) => { if (c && Object.keys(Kpi.countDiff(c)).length) tgt.count = JSON.parse(JSON.stringify(c)); else delete tgt.count; const keep = state.ruleEdit; state.ruleEdit = ek; const ok = saveRules(w); state.ruleEdit = keep; refresh(); renderWs(); if (!$('dScore').hidden) renderScore(); return ok; };
  if (!save(b, what)) return;
  toast(`Absence penalty saved for ${ruleRange(ek)}: ${Recon.ruleText(params)}.`, { label: 'Undo', fn: () => save(old ? countOf(old) : null, `Undone: ${what}`) });
}

// ---------------------------------------------------------------- the card
const rcName = x => `<button class="linkbtn nm" data-open="${esc(x.pid)}" data-agent="${esc(x.pid)}" dir="auto">${esc(x.name)}</button>${normName(x.oldName) !== normName(x.name) ? `<br><small class="subtle" dir="auto">${esc(x.oldName)}</small>` : ''}`;
const rcOn = (g, x) => !state.reconOff.has(g + '|' + x.pid);
function rcFileChip(e, k) {
  const other = e.month !== k, c = e.conflict, inner = e.inner;
  const note = other ? `holds ${ymLabel(e.month)}` : e.src === 'page' ? 'no month in it: compared with the month above' : c ? `named ${ymLabel(c.name)}, but its ${e.src === 'dates' ? 'dates' : 'title'} ${e.src === 'dates' ? 'are' : 'is'} ${ymLabel(c.content)}` : inner ? `its title says ${ymLabel(inner.title)}, its dates ${ymLabel(inner.dates)}` : '';
  const acts = other ? (wsMonths().includes(e.month) ? `<button class="btn sm ghost" data-rcmonth="${esc(e.month)}">Show ${esc(ymLabel(e.month))}</button>` : `<small class="subtle">The tool has no ${esc(ymLabel(e.month))} yet</small>`)
    : c ? `<button class="btn sm ghost" data-rcuse="${esc(e.name)}|${esc(c.name)}">Use ${esc(ymLabel(c.name))} instead</button>` : '';
  return `<li class="rchip${c || other ? ' warn' : ''}"><svg width="15" height="15" aria-hidden="true"><use href="#i-file"/></svg><span class="rcf"><b dir="auto">${esc(e.name)}</b><small>${esc(e.label || 'Old Excel')} · ${esc(ymLabel(e.month))}${note ? ' · ' + esc(note) : ''}</small></span>${acts}<button class="rowbtn" data-rcdrop="${esc(e.name)}" aria-label="Take ${esc(e.name)} away">Remove</button></li>`;
}
/** a group of people with the same cause: why, a table with a tick per person (who the fix is for) and the fixes */
function rcGroup(S, g, title, why, cols, acts, o = {}) {
  const L = S.G[g] || []; if (!L.length) return '';
  const can = rcCan(S.k) && acts, on = L.filter(({ x }) => rcOn(g, x)).length, fold = state.reconFold && g in state.reconFold ? state.reconFold[g] : !!o.closed;
  return `<details class="rgroup" data-rcg="${g}"${fold ? '' : ' open'}><summary><span class="rgt">${esc(title)}</span><span class="cnt">${L.length}</span></summary>
    <p class="hint">${why}</p>
    <div class="tablewrap restab"><table><thead><tr>${can ? `<th class="rck"><input type="checkbox" data-rcall="${g}"${on === L.length ? ' checked' : ''} aria-label="All of them"></th>` : ''}<th>Agent</th>${cols.map(([h, , c]) => `<th${c ? ` class="${c}"` : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${L.map(({ x, c }) => `<tr>${can ? `<td class="rck"><input type="checkbox" data-rcsel="${g}|${esc(x.pid)}"${rcOn(g, x) ? ' checked' : ''} aria-label="${esc(x.name)}"></td>` : ''}<td>${rcName(x)}</td>${cols.map(([, f, cl]) => `<td${cl ? ` class="${cl}"` : ''}>${f(x, c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${o.extra || ''}${can ? `<div class="ractions">${acts}<small class="subtle">For the ${on === L.length ? (L.length === 1 ? 'person' : `${L.length} ticked`) : `${on} of ${L.length} ticked`}.</small></div>` : ''}</details>`;
}
function cmpCardHtml(k) {
  if (!k) return '';
  if (state.db && !(k in state.cmpSaved)) { state.cmpSaved[k] = null; state.db.doc('cmp/' + k).get().then(s => { if (s.exists) { state.cmpSaved[k] = s.data(); if (state.ws === 'results') renderWs(); } }).catch(() => {}); }
  const S = rcRun(k), saved = state.cmpSaved[k], all = state.recon ? state.recon.files : [], can = rcCan(k);
  const head = `<div class="cardhead"><div><h2>Reconcile with the old Excel · ${esc(ymLabel(k))}</h2><p class="cap">Drop the old Excel of the month (the final result, the incentive data workbook, the deduction workbook: up to three at once) or paste the results table from the email. Every person is lined up by national ID, then by name; each difference is explained by its cause, with the fix.</p></div>
    <div class="wsacts"><button class="btn sm" data-cmppick><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Choose files</button>${S && S.files.length ? '<button class="btn sm" data-cmpx><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button>' : ''}${all.length ? '<button class="btn sm ghost" data-rcclear>Clear</button>' : ''}</div></div>`;
  const drop = `<div class="cmpdrop${all.length ? ' slim' : ''}" data-cmpdrop tabindex="0" role="button" aria-label="Drop the old Excel here, or choose the files">Drop the old Excel here · up to three files at once</div>
    <details class="rpaste"${all.length ? '' : ' open'}><summary>Paste the table from the email</summary><p class="hint">Select the table in the email (ID, Name, Final %, Earned SR), copy it with Ctrl+C and paste it here with Ctrl+V.</p><textarea class="cell" id="rcPaste" rows="4" spellcheck="false" placeholder="ID	Name	Final %	Earned SR" aria-label="The results table from the email"></textarea><div class="ractions"><button class="btn sm" data-rcpaste>Compare</button></div></details>`;
  const chips = all.length ? `<ul class="rchips">${all.map(e => rcFileChip(e, k)).join('')}</ul>` : '';
  let body = '';
  if (S && S.files.length) {
    const n = S.n, dSR = S.tot.tool - S.tot.old;
    body = `<div class="tiles wstiles cmptiles"><div class="tile"><span class="tl">lined up</span><b>${n.lined}</b><span class="ts">${S.onlyOld.length} only in the old · ${S.onlyTool.length} only in the tool</span></div><div class="tile good"><span class="tl">the same</span><b>${n.same}</b><span class="ts">${n.taken ? `${n.taken} taken from the old Excel` : `of ${n.lined}`}</span></div><div class="tile${n.diff ? ' alert' : ''}"><span class="tl">different</span><b>${n.diff}</b><span class="ts">each with its cause below</span></div>${n.noTool ? `<div class="tile alert"><span class="tl">no value in the tool</span><b>${n.noTool}</b><span class="ts">${S.scored ? 'a KPI or a scorecard missing' : 'the month came from the incentive data file'}</span></div>` : ''}${S.tot.n ? `<div class="tile"><span class="tl">earned SR, old / tool</span><b>${rcSR(S.tot.old)} / ${rcSR(S.tot.tool)}</b><span class="ts">${dSR ? `the tool pays ${rcSR(Math.abs(dSR))} SR ${dSR > 0 ? 'more' : 'less'}` : 'the same total'} for ${plural(S.tot.n, 'person', 'people')}</span></div>` : ''}</div>
      ${n.diff || n.noTool ? '' : n.lined ? '<p class="good">Every person lined up has the same numbers in both.</p>' : ''}
      ${rcGroupsHtml(S)}${rcPeopleHtml(S)}${rcOnlyHtml(S)}${rcDedHtml(S)}${rcSlipsHtml(S)}`;
  } else if (saved) body = `<p class="hint">Last reconciled ${esc(fmtWhen(saved.at))} by ${esc(saved.by || '')} with ${esc(saved.file)}: ${saved.same} of ${saved.matched} the same, ${saved.diff} different${saved.noTool ? `, ${saved.noTool} with no value in the tool` : ''}. Drop the files again to see the people.</p>`;
  else if (all.length) body = `<p class="hint">None of these files is for ${esc(ymLabel(k))}.</p>`;
  if (S && S.files.length && !can) body += `<p class="hint">${monthLocked(k) ? `${esc(ymLabel(k))} is final: only the senior manager changes it.` : 'The senior manager or an admin makes the fixes; you see what they would change.'}</p>`;
  return `<div class="card cmpcard" id="reconCard">${head}${drop}${chips}${body}</div>`;
}
function rcGroupsHtml(S) {
  const k = S.k, rr = ruleRange(rulesFor(k).from), forR = rr === 'every month' ? 'for every month' : /^(from|before)/.test(rr) ? rr : `for ${rr}`;
  const pctC = v => esc(rcFmt('fin', v)), srC = v => esc(rcSR(v));
  const takeB = (g, f, l) => `<button class="btn sm" data-rcfix="${f}|${g}">${esc(l)}</button>`;
  const out = [];
  out.push(rcGroup(S, 'noTool', 'The tool has no Final % or earned SR', S.scored ? 'The tool cannot work these out yet: a KPI has no value (the KPI file or the quality EVAL is not in), so there is no Final % and no earned SR to compare.' : `${esc(ymLabel(k))} came into the tool from the incentive data file, which has no Final % and no earned SR. Take the old ones in, and Results, the agents' pages and the history show them.`,
    [['Team', x => esc(x.team)], ['Old Final %', x => pctC(x.o.fin), 'r num'], ['Old earned SR', x => srC(x.o.earned), 'r num'], ['Missing', (x, c) => esc(c.why === 'kpi' ? x.t.missing.join(', ') : c.why === 'incentive' ? 'not worked out' : '–'), 'subtle']],
    takeB('noTool', 'both', `Take the old Final % and earned SR into ${ymLabel(k)}`)));
  out.push(rcGroup(S, 'noCard', 'No KPI scorecard for the team', `The incentive rules have no scorecard for ${esc([...new Set((S.G.noCard || []).map(({ x }) => x.team || 'their team'))].join(', '))}, so the tool cannot work their Final % out. Add a scorecard for the team, or take the old numbers.`,
    [['Team', x => esc(x.team)], ['Old Final %', x => pctC(x.o.fin), 'r num'], ['Old earned SR', x => srC(x.o.earned), 'r num'], ['Tool earned SR', x => srC(x.t.earned), 'r num']],
    `<button class="btn sm" data-rulesopen>Add a scorecard</button>${takeB('noCard', 'both', 'Take the old Final % and earned SR')}`));
  const B = S.G.base || [], shared = (() => { const f = new Map(); for (const b of S.picks.values()) f.set(b, (f.get(b) || 0) + 1); const top = [...f].sort((a, b) => b[1] - a[1])[0]; return top && top[1] > 1 ? ` ${top[0]} SR is the base of ${top[1]} of them.` : ''; })();
  out.push(rcGroup(S, 'base', 'An own incentive base', `The old Excel pays ${B.length === 1 ? 'this person' : 'these people'} with a base other than the tool's (the brand's base, or the roster's): the earned SR is base × days counted ÷ days scheduled × Final %, and only the base shown gives the old amount.${shared} Give them their own base and the tool pays the same.`,
    [['Team', x => esc(x.team)], ['Old earned SR', x => srC(x.o.earned), 'r num'], ['Tool earned SR', x => srC(x.t.earned), 'r num'], ['Base in the tool', x => srC(x.t.base), 'r num'], ['Base in the old Excel', x => { const b = S.picks.get(x.pid); return b ? `<b>${srC(b)}</b>` : '–'; }, 'r num']],
    `<button class="btn sm primary" data-rcfix="bases|base">Use these bases ${esc(forR)}</button>${isBuilder() ? '<button class="btn sm" data-rcfix="roster|base">Save on the roster</button>' : ''}${takeB('base', 'earned', 'Take the old earned SR')}`));
  const F = S.fits, Lf = F ? F.fits.filter(f => f.nParams === F.least).concat(F.fits.filter(f => f.nParams === (F.least || 0) + 1)).slice(0, 6) : [], sel = Math.min(state.reconRule[k] || 0, Math.max(0, Lf.length - 1)), fit = Lf[sel];
  const fitHtml = F ? (Lf.length ? `<fieldset class="rfits"><legend>Rules that give ${F.cases === 1 ? 'this person' : `all ${F.cases}`} the old earned SR</legend>${Lf.map((f, i) => `<label class="chip"><input type="radio" name="rcfit-${esc(k)}" data-rcfit="${i}"${i === sel ? ' checked' : ''}${rcCan(k) ? '' : ' disabled'}>${esc(f.text[0].toUpperCase() + f.text.slice(1))}</label>`).join('')}
      <small>${F.decided ? 'Only this simple rule fits.' : `${plural(F.cases, 'case')} cannot decide between ${Lf.length === 1 ? 'rules like this one' : 'these rules'}: choose the one your incentive policy says, or keep the tool's count and take the old earned SR for ${F.cases === 1 ? 'this person' : 'them'}.`}</small></fieldset>${fit ? rcPreviewHtml(S, fit.params) : ''}` : '<p class="hint">No rule the tool can count gives every one of them the old earned SR.</p>') : '';
  out.push(rcGroup(S, 'absence', 'Days taken off for absences', 'The old Excel took whole days off the days attended for these people\'s absences, so they earned less; the tool takes none (Incentive rules › How it is counted › Absence penalty).',
    [['Absent days', x => esc(String(x.t.absent)), 'r num'], ['Days taken off', (x, c) => esc(String(c.P)), 'r num'], ['Days counted', (x, c) => esc(`${x.t.ka - c.P} of ${x.t.ks}`), 'r num'], ['Old earned SR', x => srC(x.o.earned), 'r num'], ['Tool earned SR', x => srC(x.t.earned), 'r num']],
    `${fit ? `<button class="btn sm primary" data-rcfix="rule|absence">Use this rule ${esc(forR)}</button>` : ''}${takeB('absence', 'earned', 'Take the old earned SR')}`, { extra: fitHtml }));
  out.push(rcGroup(S, 'days', 'Days counted differently', `The old Excel has other scheduled or attended days for ${(S.G.days || []).length === 1 ? 'this person' : 'these people'}.${(S.G.days || []).some(({ x }) => x.o.issues) ? ' Day cells typed with a space (\'SL \' for example) are not counted by the old workbook\'s formulas; the tool counts them.' : ''} The tool's count stays unless you take the old one.`,
    [['Old days', x => esc(x.o.ka != null && x.o.ks != null ? `${x.o.ka} of ${x.o.ks}` : '–'), 'r num'], ['Tool days', x => esc(x.t.ka != null && x.t.ks != null ? `${x.t.ka} of ${x.t.ks}` : '–'), 'r num'], ['Cells typed with a space', x => esc(x.o.issues ? String(x.o.issues) : '–'), 'r num']],
    monthLocked(k) ? '' : takeB('days', 'days', 'Take the old days')));
  out.push(rcGroup(S, 'fin', 'A different Final %', 'The tool works the Final % out from the KPI file, the quality EVAL and the scorecard; the old Excel has another one. A KPI with no value, a KPI file or an EVAL that is not the one the old Excel used, or a value rounded before it was ranked usually explain it.',
    [['Team', x => esc(x.team)], ['Old Final %', x => pctC(x.o.fin), 'r num'], ['Tool Final %', x => pctC(x.t.fin), 'r num'], ['KPIs with no value', (x, c) => esc((c.missing || []).join(', ') || '–'), 'subtle']],
    takeB('fin', 'fin', 'Take the old Final %')));
  out.push(rcGroup(S, 'elig', 'Not eligible in the tool', 'The tool pays these people nothing because of the eligibility rules; the old Excel paid them.',
    [['Why', (x, c) => esc(c.why || '–'), 'subtle'], ['Old earned SR', x => srC(x.o.earned), 'r num']],
    takeB('elig', 'earned', 'Take the old earned SR')));
  out.push(rcGroup(S, 'meas', 'Other Genesys or attendance numbers', 'The tool reads the Genesys exports and the supervisors\' attendance corrections; the old workbook has other numbers for these people: another export, another range of days, or a correction made in one and not in the other. The tool\'s numbers stay.',
    [['What', (x, c) => esc(c.ms.map(m => Recon.meas(m).l).join(', ')), ''], ['Old Excel', (x, c) => esc(c.ms.map(m => rcFmt(m, x.o[m])).join(' · ')), 'r num'], ['Tool', (x, c) => esc(c.ms.map(m => rcFmt(m, (x.cells.find(z => z.m === m) || {}).tool)).join(' · ')), 'r num']],
    '', { closed: true }));
  out.push(rcGroup(S, 'rounding', '1 SR apart', 'A rounding difference: the old Excel and the tool round the earned SR at a different step.',
    [['Old earned SR', x => srC(x.o.earned), 'r num'], ['Tool earned SR', x => srC(x.t.earned), 'r num']],
    takeB('rounding', 'earned', 'Take the old earned SR'), { closed: true }));
  out.push(rcGroup(S, 'other', 'Not explained', 'Neither an own base, days taken off nor rounding gives the old earned SR with the old Final %. Check the person in the old Excel.',
    [['Old Final %', x => pctC(x.o.fin), 'r num'], ['Old earned SR', x => srC(x.o.earned), 'r num'], ['Tool earned SR', x => srC(x.t.earned), 'r num'], ['Tool with the old Final %', (x, c) => srC(c.ref), 'r num']],
    takeB('other', 'earned', 'Take the old earned SR')));
  return out.join('');
}
/** what the chosen absence rule makes of every absent person's earned SR in the month (those it changes) */
function rcPreviewHtml(S, params) {
  const L = S.absRows.map(({ pid, name, r }) => { const o = { base: r.base, sched: r.ks, attended: r.kat ?? r.ka, absent: r.absent, runs: r.kr, fin: r.fin }; return { pid, name, absent: r.absent, now: Recon.earnedOf(o, S.cfg), w: Recon.earnedOf(o, { ...S.cfg, ...params }), ok: !r._el || r._el.ok }; }).filter(x => x.now !== x.w);
  if (!L.length) return '';
  return `<details class="rprev"><summary>With this rule, ${plural(L.length, 'absent person', 'absent people')} in ${esc(ymLabel(S.k))} earn${L.length === 1 ? 's' : ''} less</summary><div class="tablewrap restab"><table><thead><tr><th>Agent</th><th class="r">Absent days</th><th class="r">Earned SR now</th><th class="r">With the rule</th></tr></thead><tbody>${L.map(x => `<tr><td><button class="linkbtn nm" data-open="${esc(x.pid)}" dir="auto">${esc(x.name)}</button>${x.ok ? '' : ' <small class="subtle">not eligible</small>'}</td><td class="r num">${x.absent}</td><td class="r num">${rcSR(x.now)}</td><td class="r num"><b>${rcSR(x.w)}</b></td></tr>`).join('')}</tbody></table></div></details>`;
}
const RC_CAUSE = { noTool: 'no value in the tool', noCard: 'no scorecard for the team', base: 'an own base', absence: 'days taken off for absences', days: 'days counted differently', fin: 'a different Final %', elig: 'not eligible in the tool', meas: 'other Genesys or attendance numbers', rounding: '1 SR apart', other: 'not explained' };
function rcPeopleHtml(S) {
  const L = S.people.filter(x => x.st === 'diff' || x.st === 'noTool'); if (!L.length) return '';
  return `<details class="rgroup"><summary><span class="rgt">Every difference, person by person</span><span class="cnt">${L.length}</span></summary><div class="tablewrap restab"><table><thead><tr><th>Agent</th><th>What</th><th class="r">Old Excel</th><th class="r">Tool</th><th class="r">Difference</th><th>Cause</th></tr></thead><tbody>${L.map(x => x.cells.filter(c => !c.same).map((c, j) => `<tr>${j ? '<td></td>' : `<td>${rcName(x)}</td>`}<td>${esc(Recon.meas(c.m).l)}</td><td class="r num">${esc(rcFmt(c.m, c.old))}</td><td class="r num"><b>${esc(rcFmt(c.m, c.tool))}</b></td><td class="r num">${c.missing ? '–' : esc(rcD(c.m, c.d))}</td><td class="subtle">${j ? '' : esc(x.causes.map(z => RC_CAUSE[z.kind]).join('; ') || '–')}</td></tr>`).join('')).join('')}</tbody></table></div></details>`;
}
function rcOnlyHtml(S) {
  return `${S.onlyOld.length ? `<details class="cmpmore"><summary>Only in the old Excel · ${S.onlyOld.length}</summary><ul class="ilist">${S.onlyOld.map(x => `<li><span class="nm" dir="auto">${esc(x.name)}</span><span class="sg">${esc(x.id || 'no ID')} · ${esc(x.why)}</span></li>`).join('')}</ul></details>` : ''}
    ${S.onlyTool.length ? `<details class="cmpmore"><summary>Only in the tool · ${S.onlyTool.length}</summary><p class="hint">${S.files.some(e => e.inc) ? 'In the tool\'s month, not in the old files.' : 'The tool pays them an incentive; the old Excel does not list them.'}</p><ul class="ilist">${S.onlyTool.map(x => `<li><button class="linkbtn nm" data-open="${esc(x.pid)}" dir="auto">${esc(x.name)}</button>${x.earned ? `<span class="sg">${esc(rcSR(x.earned))} SR in the tool</span>` : ''}</li>`).join('')}</ul></details>` : ''}`;
}
function rcDedHtml(S) {
  const d = S.ded; if (!d) return '';
  return `<details class="rgroup"${d.exceptions.length ? ' open' : ''}><summary><span class="rgt">Deduction workbook · ${esc(ymLabel(d.month || S.k))}</span><span class="cnt">${d.exceptions.length}</span></summary>
    <p class="hint">${esc(d.file)}: ${plural(d.people, 'person', 'people')}, ${plural(d.cells, 'day')}. Each Diff should be Sched. − Actual (0 when Actual is 0, never below 0). ${d.exceptions.length ? `${plural(d.exceptions.length, 'cell was', 'cells were')} typed over that rule: the sheet's total is ${rcSR(d.sheetTotal)} minutes, the rule gives ${rcSR(d.ruleTotal)}.${d.notes ? '' : ' Their Review Notes are empty, so check whether they were excused.'}` : 'Every Diff follows the rule.'}</p>
    ${d.exceptions.length ? `<div class="tablewrap restab"><table><thead><tr><th>Agent</th><th class="r">Day</th><th class="r">Sched.</th><th class="r">Actual</th><th class="r">Diff in the sheet</th><th class="r">By the rule</th></tr></thead><tbody>${d.exceptions.map(x => `<tr><td dir="auto">${esc(x.name)}</td><td class="r num">${x.day}</td><td class="r num">${x.S ?? '–'}</td><td class="r num">${x.A ?? '–'}</td><td class="r num"><b>${x.D ?? '–'}</b></td><td class="r num">${x.rule ?? '–'}</td></tr>`).join('')}</tbody></table></div>` : ''}</details>`;
}
function rcSlipsHtml(S) {
  const P = S.inc; if (!P || !(P.spaces.length || P.split.length || P.typed.length || P.badId.length)) return '';
  const li = (t, L, f) => (L.length ? `<li><b>${esc(t)}</b><span class="sg">${L.slice(0, 12).map(f).map(esc).join(', ')}${L.length > 12 ? ` and ${L.length - 12} more` : ''}</span></li>` : '');
  return `<details class="rgroup"><summary><span class="rgt">Slips in the old incentive workbook</span><span class="cnt">${P.spaces.length + P.split.length + P.typed.length + P.badId.length}</span></summary>
    <p class="hint">${esc(P.file)}. The tool reads these as they were meant; the old workbook's formulas did not.</p><ul class="ilist">
    ${li(`${plural(P.cells, 'day cell')} typed with a space (${[...new Set(P.spaces.flatMap(x => x.raws))].map(r => `'${r}'`).join(', ')}): ${plural(P.counted, 'person', 'people')} got fewer scheduled days in the old file`, P.spaces, x => x.n)}
    ${li('Split in two rows (joined by the tool)', P.split, x => `${x.n} / ${x.other}`)}
    ${li('An Adherence value typed over the daily average', P.typed, x => `${x.n} ${rcFmt('adh', x.adh)} (daily ${rcFmt('adh', x.daily)})`)}
    ${li('IDs that are not numbers', P.badId, x => `${x.n} (${x.badId})`)}</ul></details>`;
}

// ---------------------------------------------------------------- Excel
async function exportCmp() {
  const S = rcRun(wsMonthNow()); if (!S || !S.files.length) return;
  const files = S.files.map(e => e.name).join(', '), cause = x => x.causes.map(z => RC_CAUSE[z.kind]).join('; ');
  await xlBook(`Reconcile - ${ymLabel(S.k)}.xlsx`, [
    { name: 'Differences', title: `Old Excel against the tool - ${ymLabel(S.k)}`, sub: `${files} · ${S.n.same} of ${S.n.lined} the same · ${fmtWhen(state.recon.at)} by ${state.recon.by}`, cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'Name in the old Excel', t: 'text', w: 30 }, { h: 'ID', t: 'text', w: 13 }, { h: 'What', t: 'text', w: 14 }, { h: 'Old Excel', t: 'text', w: 12 }, { h: 'Tool', t: 'text', w: 12 }, { h: 'Difference', t: 'text', w: 12 }, { h: 'Cause', t: 'text', w: 40 }],
      rows: S.people.filter(x => x.st === 'diff' || x.st === 'noTool').flatMap(x => x.cells.filter(c => !c.same).map(c => [x.name, x.oldName, x.id, Recon.meas(c.m).l, rcFmt(c.m, c.old), rcFmt(c.m, c.tool), c.missing ? '' : rcD(c.m, c.d), cause(x)])) },
    { name: 'Causes', title: 'Each difference and its cause', sub: files, cols: [{ h: 'Cause', t: 'text', w: 30 }, { h: 'Agent', t: 'text', w: 30 }, { h: 'Team', t: 'text', w: 8 }, { h: 'Old Final %', t: 'text', w: 11 }, { h: 'Old earned SR', t: 'text', w: 12 }, { h: 'Tool earned SR', t: 'text', w: 12 }, { h: 'Detail', t: 'text', w: 44 }],
      rows: Object.entries(S.G).flatMap(([g, L]) => L.map(({ x, c }) => [RC_CAUSE[g], x.name, x.team, rcFmt('fin', x.o.fin), rcSR(x.o.earned), rcSR(x.t.earned), g === 'base' ? `base ${S.picks.get(x.pid) || '–'} SR (the tool: ${x.t.base})` : g === 'absence' ? `${c.P} days taken off for ${x.t.absent} absent days` : g === 'days' ? `old ${x.o.ka}/${x.o.ks}, tool ${x.t.ka}/${x.t.ks}` : g === 'fin' ? `tool ${rcFmt('fin', x.t.fin)}` : g === 'elig' ? c.why : g === 'other' ? `the tool with the old Final %: ${rcSR(c.ref)}` : ''])) },
    { name: 'Only in the old Excel', title: 'Only in the old Excel', sub: files, cols: [{ h: 'Name', t: 'text', w: 32 }, { h: 'ID', t: 'text', w: 13 }, { h: 'Why', t: 'text', w: 40 }], rows: S.onlyOld.map(x => [x.name, x.id, x.why]) },
    { name: 'Only in the tool', title: 'Only in the tool', sub: ymLabel(S.k), cols: [{ h: 'Name', t: 'text', w: 32 }, { h: 'Earned SR', t: 'text', w: 12 }], rows: S.onlyTool.map(x => [x.name, rcSR(x.earned)]) },
    ...(S.ded ? [{ name: 'Deduction workbook', title: `Diff cells typed over the rule - ${S.ded.file}`, sub: `sheet ${S.ded.sheetTotal} min · rule ${S.ded.ruleTotal} min`, cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'Day', t: 'text', w: 6 }, { h: 'Sched.', t: 'text', w: 8 }, { h: 'Actual', t: 'text', w: 8 }, { h: 'Diff in the sheet', t: 'text', w: 14 }, { h: 'By the rule', t: 'text', w: 12 }], rows: S.ded.exceptions.map(x => [x.name, String(x.day), String(x.S ?? ''), String(x.A ?? ''), String(x.D ?? ''), String(x.rule ?? '')]) }] : [])]);
}

// ---------------------------------------------------------------- events
const cmpPicker = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,.xlsm,.xlsb,.xls,.csv', multiple: true, hidden: true, id: 'cmpPicker' }); document.body.appendChild(cmpPicker);
cmpPicker.addEventListener('change', () => { const L = [...cmpPicker.files]; cmpPicker.value = ''; if (L.length) cmpFiles(L); });
/** the people of a group the fix is for (the ticked ones) */
function rcPick(k, g) { const S = rcRun(k); return S ? (S.G[g] || []).filter(({ x }) => rcOn(g, x)) : []; }
$('resultsBody').addEventListener('click', e => {
  const t = e.target, k = wsMonthNow();
  if (t.closest('[data-cmppick], [data-cmpdrop]')) { cmpPicker.click(); return; }
  if (t.closest('[data-cmpx]')) { exportCmp(); return; }
  if (t.closest('[data-rcclear]')) { const keep = state.recon; state.recon = null; renderWs(); toast('The old files are cleared from this page.', { label: 'Undo', fn: () => { state.recon = keep; renderWs(); } }); return; }
  const dr = t.closest('[data-rcdrop]'); if (dr && state.recon) { state.recon = { ...state.recon, files: state.recon.files.filter(x => x.name !== dr.dataset.rcdrop), at: new Date().toISOString() }; if (!state.recon.files.length) state.recon = null; renderWs(); return; }
  const mo = t.closest('[data-rcmonth]'); if (mo) { state.wsMonth = mo.dataset.rcmonth; renderWs(); return; }
  const us = t.closest('[data-rcuse]'); if (us && state.recon) { const [name, m] = us.dataset.rcuse.split('|'); const f = state.recon.files.find(x => x.name === name); if (f) { f.month = m; f.conflict = null; f.src = 'chosen'; state.recon.at = new Date().toISOString(); if (wsMonths().includes(m)) state.wsMonth = m; rcSave(wsMonthNow()); renderWs(); } return; }
  if (t.closest('[data-rcpaste]')) { const e2 = rcPasted($('rcPaste') ? $('rcPaste').value : ''); if (!e2) { toast('No table with an ID or Name column and Final % or Earned SR next to it. Copy the whole table, with its header row.'); return; } rcAdd([e2]); return; }
  const fx = t.closest('[data-rcfix]'); if (!fx) return;
  const [act, g] = fx.dataset.rcfix.split('|'), L = rcPick(k, g); if (!L.length) { toast('Tick at least one person.'); return; }
  const S = rcRun(k), src = `old Excel ${S.files.map(f => f.name).join(', ')}`;
  if (act === 'bases') { const list = L.map(({ x }) => ({ pid: x.pid, name: x.name, base: S.picks.get(x.pid) })).filter(x => x.base > 0); rcBases(k, list, src); return; }
  if (act === 'roster') { rcRoster(L.map(({ x }) => ({ pid: x.pid, base: S.picks.get(x.pid) })).filter(x => x.base > 0)); return; }
  if (act === 'rule') { const F = S.fits, Lf = F ? F.fits.filter(f => f.nParams === F.least).concat(F.fits.filter(f => f.nParams === (F.least || 0) + 1)).slice(0, 6) : [], f = Lf[Math.min(state.reconRule[k] || 0, Lf.length - 1)]; if (f) rcRule(k, f.params); return; }
  rcAccept(k, L, act === 'both' ? ['fin', 'earned'] : [act]);
});
$('resultsBody').addEventListener('change', e => {
  const t = e.target, k = wsMonthNow();
  const s = t.closest('[data-rcsel]'); if (s) { const key = s.dataset.rcsel; if (s.checked) state.reconOff.delete(key); else state.reconOff.add(key); renderWs(); const n = $('resultsBody').querySelector(`[data-rcsel="${CSS.escape(key)}"]`); if (n) n.focus(); return; }
  const a = t.closest('[data-rcall]'); if (a) { const g = a.dataset.rcall, S = rcRun(k); for (const { x } of (S && S.G[g]) || []) { if (a.checked) state.reconOff.delete(g + '|' + x.pid); else state.reconOff.add(g + '|' + x.pid); } renderWs(); const n = $('resultsBody').querySelector(`[data-rcall="${g}"]`); if (n) n.focus(); return; }
  const f = t.closest('[data-rcfit]'); if (f) { state.reconRule[k] = +f.dataset.rcfit; renderWs(); const n = $('resultsBody').querySelector(`[data-rcfit="${f.dataset.rcfit}"]`); if (n) n.focus(); }
});
$('resultsBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-cmpdrop]')) { e.preventDefault(); cmpPicker.click(); } });
['dragenter', 'dragover'].forEach(t => $('resultsBody').addEventListener(t, e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
$('resultsBody').addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (z) z.classList.remove('over'); });
$('resultsBody').addEventListener('drop', e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); const L = [...((e.dataTransfer && e.dataTransfer.files) || [])]; if (L.length) cmpFiles(L); });
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('#reconCard details.rgroup[data-rcg]')) state.reconFold[d.dataset.rcg] = !d.open; }, true);
