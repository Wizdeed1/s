// ================================================================ COACHING THAT FOLLOWS UP: last month's one-to-one comes back in this month's
// A one-to-one starts with what was agreed last month: each action (done, partly, not done?) and each KPI then and now (better
// or worse?). The supervisor ticks the actions; the form, its PDF and the agent's copy carry it. The supervisors' scorecard can
// count it ("Follow-up": the share of last month's actions done, and the share of KPIs that improved after the one-to-one).
const FU_ST = [['', 'Not checked'], ['done', 'Done'], ['part', 'Partly'], ['no', 'Not done']];
const prevKey = k => { const [y, m] = k.split('-').map(Number); return m === 1 ? ymKey(y - 1, 12) : ymKey(y, m - 1); };
/** last month's one-to-one of a person (a saved, held one) */
function fuPrevForm(pid, k) { const f = formLookup(formId('1to1', pid, prevKey(k))); return f && f.status !== 'planned' ? f : null; }
/** which way a metric is better: from the scorecards, else adherence up, times down */
function fuDir(metric) {
  const n = normName(metric || ''), K = [...KPI_INDEX().values()].find(x => normName(x.name) === n);
  if (K) return { dir: K.dir || 'high', k: K };
  if (/aht|handle|hold|acw|tardy|absent|late/.test(n)) return { dir: 'low', k: { unit: /aht|handle|hold|acw/.test(n) ? 'sec' : 'num' } };
  return { dir: 'high', k: { unit: /%|adherence|quality|csat|fcr|rate/.test(n) ? 'pct' : 'num' } };
}
/** the follow-up of a one-to-one: last month's actions (statuses kept from before) and its KPIs against this month's */
function fuBuild(pid, k, old) {
  const pf = fuPrevForm(pid, k); if (!pf) return null;
  const keep = new Map(((old && old.actions) || []).map(a => [normSpace(a.action), a.status || '']));
  const actions = (pf.actions || []).filter(a => a && normSpace(a.action)).map(a => ({ action: normSpace(a.action), owner: a.owner || '', due: a.due || '', status: keep.get(normSpace(a.action)) || '' }));
  const r = rowOf(pid, k), now = new Map(((r && r.kpi) || []).map(z => [normName(z[0]), z[3]]));
  if (r && r.adh != null && !now.has('adherence')) now.set('adherence', pct(r.adh));
  if (r && r.aht != null && !now.has('aht')) now.set('aht', mss(r.aht));
  const kpis = (pf.results || []).filter(x => x && x.on !== false && normSpace(x.metric) && !/^final %/i.test(x.metric) && normSpace(x.result) && x.result !== '–').map(x => {
    const after = now.get(normName(x.metric)) ?? null, D = fuDir(x.metric), a = kpiNum(x.result, D.k), b = kpiNum(after, D.k);
    const same = a != null && b != null && Math.abs(a - b) < (D.k.unit === 'pct' ? 0.0005 : 0.5);
    const better = a == null || b == null || same ? null : D.dir === 'low' ? b < a : b > a;
    return { metric: x.metric, before: x.result, after: after == null || after === '–' ? '' : after, better, same };
  });
  if (!actions.length && !kpis.length) return null;
  return { from: prevKey(k), label: ymLabel(prevKey(k)), ref: pf.ref || '', actions, kpis };
}
/** before a form is shown: the follow-up added (or brought up to date) unless the agent already signed this version */
function fuAttach(f) {
  if (!f || f.kind !== '1to1' || f.status === 'closed') return f;
  const signed = typeof sigOf === 'function' && sigOf(f.id) && sigState(f) === 'signed';
  if (signed && f.followup) return f;
  if (signed) return f;
  const fu = fuBuild(f.pid, fkey(f), f.followup); if (fu) f.followup = fu;
  return f;
}
const fuChange = x => (x.better === true ? 'Better' : x.better === false ? 'Worse' : x.same ? 'Same' : '–');
/** the follow-up in the one-to-one form (the supervisor ticks each action) */
function fuFormHtml(f) {
  const F = f.followup; if (!F) return '';
  const acts = F.actions || [], kp = F.kpis || [];
  return `<section class="sec fusec"><h3>Follow-up from ${esc(F.label || ymLabel(F.from))}</h3><p class="hint">What was agreed in last month's one-to-one${F.ref ? ` (${esc(F.ref)})` : ''}: did the agent do it, and did the KPIs move?</p>
    ${acts.length ? `<div class="tablewrap formtab"><table><thead><tr><th>Last month's action</th><th>Owner</th><th>Due</th><th>Done?</th></tr></thead><tbody>${acts.map((a, i) => `<tr><td dir="auto">${esc(a.action)}</td><td>${esc(a.owner || '')}</td><td>${esc(a.due ? Forms.fmtDate(a.due) : '')}</td><td><select class="cell fusel ${a.status}" data-fu="${i}" aria-label="Done: ${esc(a.action)}">${FU_ST.map(([v, l]) => `<option value="${v}"${(a.status || '') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : '<p class="subtle">No actions were agreed last month.</p>'}
    ${kp.length ? `<div class="tablewrap formtab"><table><thead><tr><th>KPI</th><th class="r">${esc(MON[+F.from.slice(5) - 1])}</th><th class="r">Now</th><th>Change</th></tr></thead><tbody>${kp.map(x => `<tr><td>${esc(x.metric)}</td><td class="r num">${esc(x.before || '–')}</td><td class="r num"><b>${esc(x.after || '–')}</b></td><td><span class="fuch ${x.better === true ? 'up' : x.better === false ? 'down' : ''}">${esc(fuChange(x))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
}
/** the same, read-only, in the agent's language (the agent's copy of the form) */
function fuReadHtml(f) {
  const F = f.followup; if (!F || (!(F.actions || []).length && !(F.kpis || []).length)) return '';
  const st = s => T((FU_ST.find(x => x[0] === (s || '')) || FU_ST[0])[1]);
  return `<h3>${esc(T('Follow-up from {m}', { m: ymLabelT(F.from) }))}</h3>${(F.actions || []).length ? `<div class="tablewrap formtab"><table><thead><tr><th>${esc(T("Last month's actions"))}</th><th>${esc(T('Owner'))}</th><th>${esc(T('Status'))}</th></tr></thead><tbody>${F.actions.map(a => `<tr><td dir="auto">${esc(a.action)}</td><td>${esc(a.owner || '')}</td><td><b>${esc(st(a.status))}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
    ${(F.kpis || []).length ? `<div class="tablewrap formtab"><table><thead><tr><th>${esc(T('KPI'))}</th><th class="r">${esc(T('Before'))}</th><th class="r">${esc(T('Now'))}</th><th></th></tr></thead><tbody>${F.kpis.map(x => `<tr><td>${esc(x.metric)}</td><td class="r num">${ltr(x.before || '–')}</td><td class="r num">${ltr(x.after || '–')}</td><td>${esc(T(fuChange(x)))}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}
/** the chip on the one-to-one board: how many of last month's actions are done */
function fuChip(f) {
  const A = (f && f.followup && f.followup.actions) || []; if (!A.length) return '';
  const done = A.filter(a => a.status === 'done').length, checked = A.filter(a => a.status).length;
  return `<span class="fst fu${checked < A.length ? ' todo' : ''}" title="Last month's actions: ${done} done, ${checked} of ${A.length} checked">Follow-up ${done}/${A.length}</span>`;
}
/** a supervisor's follow-up for a month: the share of last month's actions done (part = half), and of KPIs that improved */
function fuStats(spvPid, k) {
  let aN = 0, aD = 0, kN = 0, kB = 0, todo = 0;
  for (const p of teamOf(spvPid).filter(x => x.status !== 'Inactive')) {
    const f = formLookup(formId('1to1', p._id, k)), F = f && f.followup;
    if (F) for (const a of F.actions || []) { if (!a.status) continue; aN++; aD += a.status === 'done' ? 1 : a.status === 'part' ? 0.5 : 0; }
    const live = fuBuild(p._id, k, F);
    if (live) { for (const x of live.kpis) if (x.better != null || x.same) { kN++; if (x.better === true) kB++; } if (live.actions.length && !(F && F.actions.every(a => a.status))) todo++; }
  }
  return { done: aN ? aD / aN : null, kpi: kN ? kB / kN : null, actions: aN, kpis: kN, todo };
}
