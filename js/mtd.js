// ================================================================ THIS MONTH SO FAR: each agent's month-to-date projection
// While the month runs, its numbers come from the stored daily data. Each agent sees on their page where the month is heading if
// it stays like this: the projected final % and incentive, and the weakest KPI to work on first. The KPIs that come only at the
// end of the month (the KPI file, the EVAL) use last month's values until this month's arrive; minutes late and days under the
// adherence target are scaled to the whole month. The agents' pages follow by themselves each time a day is stored.
/** the projection for one agent, from the month's live row (null when the month is not a running daily month) */
function mtdProj(pid, k) {
  const H = state.history[k]; if (!H || !H.daily || monthLocked(k)) return null;
  const p = state.roster.find(x => x._id === pid), r = p ? rowOf(pid, k) : null; if (!r) return null;
  const card = cardFor(p.team, k); if (!card) return null;
  const days = (H.days || []).slice().sort(), asOf = days[days.length - 1] || '', last = asOf ? +asOf.slice(8) : 0, ND = Core.daysIn(+k.slice(0, 4), +k.slice(5));
  const scale = last ? Math.max(1, ND / last) : 1;
  const file = fileValues(card, k, p, r), pr = rowOf(pid, prevKey(k)), borrowed = [];
  for (const kk of card.kpis) {
    if (kk.src !== 'file' || file[kk.id] != null || !pr) continue;
    let v = pr.kv && pr.kv[kk.id] != null ? pr.kv[kk.id] : null;
    if (v == null) { const z = (pr.kpi || []).find(x => normName(x[0]) === normName(kk.name)); v = z ? kpiNum(z[3], kk) : null; }
    if (v != null) { file[kk.id] = v; borrowed.push(kk.name); }
  }
  const vals = { adh: r.adh ?? null, adhUnder: r.adhUnder != null ? Math.round(r.adhUnder * scale) : null, aht: r.aht ?? null, tardy: r.tardy != null ? Math.round(r.tardy * scale) : null, file };
  // the days attended (not those counted after an absence penalty, which Kpi.score takes off again), absences scaled like the rest
  const att = r.ks != null && r.ks > 0 ? { sched: Math.round(r.ks * scale), attended: Math.round((r.kat ?? r.ka ?? 0) * scale), absent: Math.round((r.absent || 0) * scale), runs: Math.round((r.kr || 0) * scale) } : null;
  const res = Kpi.score(card, vals, att, baseOf(p, r, k), countFor(k)), el = eligibility(res, qRow(k, pid), null, k, p);
  const weak = res.rows.filter(x => x.r != null && x.r < 5).sort((a, b) => a.r - b.r || b.w - a.w)[0] || null;
  return { asOf, days: days.length, ND, fin: res.finalPct, earned: res.earned == null ? null : el.ok ? res.earned : 0, calc: res.earned, ok: el.ok, why: el.why, borrowed, minFinal: rulesFor(k).elig.minFinal,
    weak: weak ? { name: weak.k.name, value: Kpi.fmtVal(weak.k, Kpi.rankedVal(weak)), target: Kpi.target(weak.k), rank: weak.r } : null, missing: res.missing };
}
/** the agents' pages follow the stored days (a few seconds after the month is saved from them) */
let mtdT = 0;
function mtdPublishSoon(k) { clearTimeout(mtdT); mtdT = setTimeout(() => { publishMonthToAgents(k).catch(() => 0); }, 3000); }
/** the card on the agent's page */
function mtdCardHtml(rec) {
  const X = rec && rec.mtd; if (!X || rec.status === 'final') return '';
  const why = whyTr(X.why);
  return `<div class="card mtdcard" id="meMtd"><div class="cardhead"><div><h2>${esc(T('This month so far'))}</h2><p class="cap">${esc(T(X.days === 1 ? 'Based on 1 day up to {d}.' : 'Based on {n} days up to {d}.', { n: X.days, d: fmtDueT(X.asOf) }))}${X.borrowed && X.borrowed.length ? ' ' + esc(T("Last month's {list} until this month's arrive.", { list: X.borrowed.join(', ') })) : ''}</p></div></div>
    <div class="tiles wstiles"><div class="tile${X.fin != null && X.fin < (X.minFinal ?? 0.8) ? ' alert' : ''}"><span class="tl">${esc(T('Projected final'))}</span><b>${esc(pct1(X.fin))}</b><span class="ts">${esc(T('if it stays like this'))}</span></div>
      <div class="tile${X.ok ? '' : ' alert'}"><span class="tl">${esc(T('Projected incentive'))}</span><b>${X.earned == null ? '–' : `${Math.round(X.earned).toLocaleString('en-US')} ${esc(T('SR'))}`}</b><span class="ts">${esc(X.ok ? T('if it stays like this') : T('At risk: {why}', { why }))}</span></div>
      <div class="tile"><span class="tl">${esc(T('Weakest KPI'))}</span><b>${esc(X.weak ? X.weak.value : '✓')}</b><span class="ts">${X.weak ? `${esc(X.weak.name)} · ${esc(T('target {t}', { t: '' }))}${ltr(X.weak.target)}` : esc(T('Every KPI is in the top band so far.'))}</span></div></div>
    ${X.weak ? `<p class="hint mtdtip">${esc(T('Work on {kpi} first: ranked {r} of 5 (target {t}).', { kpi: X.weak.name, r: X.weak.rank, t: '\u2066' + X.weak.target + '\u2069' }))}</p>` : ''}</div>`;
}
