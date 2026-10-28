// ================================================================ THE WFM DASHBOARD (D2, D6): the first page of the admin, the WFM roles and the senior manager
// Built only from what the tool already has: the shared history (the six measures and their trend), Today, the senior
// manager's month close steps and when each source last came in. Nothing new is stored. The first load of a visit plays
// once (the ambient light, the KPI cards, the chart lines, a sweep over the greeting); returning or changing a filter does not.
Object.assign(state, { dashMetric: 'adh', dashGroup: 'unit', dashHide: new Set(), dashTable: false, dashPt: -1 });
let dashPlayed = false, dashIntroT = 0;
const DASH_KPIS = [
  { k: 'n', label: 'Agents', dir: 0, info: 'People in this month\'s results, one row per agent. Source: the month in the shared history.', fmt: v => Math.round(v).toLocaleString('en-US') },
  { k: 'adh', label: 'Adherence', dir: 1, info: 'Average of each agent\'s monthly adherence; days blank or under the NA cut-off are left out. Source: Genesys Monthly Adherence.', fmt: v => pct(v, 1), why: 'No adherence in this month\'s data' },
  { k: 'aht', label: 'AHT', dir: -1, info: 'Average handle time (talk + hold + after-call work) per agent, as m:ss. Source: Genesys Agent Performance Summary, voice.', fmt: v => mss(v), why: 'No AHT in this month\'s data' },
  { k: 'absent', label: 'Absent days', dir: -1, info: 'Days marked Absent, added up over the agents, with the supervisors\' corrections. Source: the attendance sheets, or the Genesys schedule and sign-ons.', fmt: v => Math.round(v).toLocaleString('en-US'), why: 'No attendance in this month\'s data' },
  { k: 'ded', label: 'Deduction minutes', dir: -1, info: 'Scheduled minus actual minutes in the deduction scope, never below 0, added up. Source: Genesys Schedule and Agent Status Timeline.', fmt: v => Math.round(v).toLocaleString('en-US'), why: 'Needs the Schedule and the Agent Status Timeline' },
  { k: 'fin', label: 'Final %', dir: 1, info: 'Average final %: each agent\'s weighted KPI rank divided by 5. Source: the KPI scorecards with the KPI file, Genesys and the attendance.', fmt: v => pct1(v), why: 'No KPI results in this month\'s data' },
];
const DASH_METRICS = ['adh', 'aht', 'absent', 'ded', 'fin', 'wfExc', 'tardy', 'adhUnder'];
/** a month's six numbers: the same rows the other pages show (a draft is scored with today's inputs) */
const dashMemo = new Map();
function dashAgg(k) {
  const sig = `${state.histVer}|${state.finVer}|${state.ver}|${state.qualityVer}|${state.attEditsVer}|${state.rulesVer}`, hit = dashMemo.get(k);
  if (hit && hit.sig === sig) return hit.v;
  const rows = monthData(k) ? liveRows(k) : [], A = rows.length ? aggRows(rows) : null;
  const v = A ? { rows, n: A.n, adh: A.adh, aht: A.aht, absent: A.absent, ded: A.ded, fin: A.fin } : null;
  dashMemo.set(k, { sig, v }); return v;
}
/** the change against the month before, in words, coloured by better or worse (never by colour alone: the word says it) */
function dashChange(K, cur, prev, prevK) {
  if (cur == null || prev == null) return `<span class="kd none">${prevK ? `No ${esc(ymLabel(prevK))} value to compare` : 'No earlier month to compare'}</span>`;
  const d = cur - prev, eps = K.k === 'adh' || K.k === 'fin' ? 0.0005 : K.k === 'aht' ? 0.5 : 0.5;
  if (Math.abs(d) < eps) return `<span class="kd same"><span class="kdc">No change</span> against ${esc(MON[+prevK.slice(5) - 1])}</span>`;
  const up = d > 0, better = K.dir === 0 ? null : (K.dir > 0) === up;
  const mag = K.k === 'adh' || K.k === 'fin' ? `${Math.abs(d * 100).toFixed(1)} pts` : K.k === 'aht' ? mss(Math.abs(d)) : K.k === 'ded' ? `${Math.round(Math.abs(d)).toLocaleString('en-US')} min` : Math.round(Math.abs(d)).toLocaleString('en-US');
  const word = better == null ? (up ? 'more' : 'fewer') : better ? 'better' : 'worse';
  return `<span class="kd ${better == null ? 'same' : better ? 'good' : 'bad'} ${up ? 'up' : 'down'}"><span class="kdc"><svg aria-hidden="true"><use href="#i-dn"/></svg><span class="sr">${up ? 'Up' : 'Down'} </span>${esc(mag)}</span> ${word} <span class="vs">than ${esc(MON[+prevK.slice(5) - 1])}</span></span>`;
}
function sparkSvg(vals, cls) {
  const P = vals.map((v, i) => [i, v]).filter(x => x[1] != null); if (P.length < 2) return '<span class="ksp none" aria-hidden="true"></span>';
  const lo = Math.min(...P.map(x => x[1])), hi = Math.max(...P.map(x => x[1])), W = 96, H = 28, n = vals.length - 1 || 1;
  const X = i => 2 + (i / n) * (W - 4), Y = v => (hi === lo ? H / 2 : H - 3 - ((v - lo) / (hi - lo)) * (H - 6));
  const pts = P.map(([i, v]) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${pts} ${X(P[P.length - 1][0]).toFixed(1)},${H} ${X(P[0][0]).toFixed(1)},${H}`;
  return `<svg class="ksp ${cls || ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polygon class="ksa" points="${area}"/><polyline points="${pts}"/></svg>`;
}
function dashKpisHtml(k, months) {
  const i = months.indexOf(k), prevK = i > 0 ? months[i - 1] : '', cur = dashAgg(k), prev = prevK ? dashAgg(prevK) : null, last6 = months.slice(Math.max(0, i - 5), i + 1);
  return DASH_KPIS.map((K, j) => {
    const v = cur ? cur[K.k] : null, pv = prev ? prev[K.k] : null, un = v == null;
    const tip = `dk-${K.k}`;
    return `<div class="kpi${un ? ' un' : ''}" style="--i:${j}"><div class="khead"><span class="kl">${esc(K.label)}</span><span class="kinfo"><button class="btn ghost icon xs" aria-label="About ${esc(K.label)}" aria-describedby="${tip}"><svg aria-hidden="true"><use href="#i-info"/></svg></button><span class="ktip" role="tooltip" id="${tip}">${esc(K.info)}</span></span></div>
      <b class="kval">${un ? '–' : esc(K.fmt(v))}</b>${un ? `<span class="kd none">${esc(K.why || 'Not in this month\'s data')}</span>` : dashChange(K, v, pv, prevK)}
      ${sparkSvg(last6.map(x => { const a = dashAgg(x); return a ? a[K.k] : null; }), K.dir < 0 ? 'inv' : '')}<span class="kspl">${last6.length > 1 ? `${esc(MON[+last6[0].slice(5) - 1])} – ${esc(MON[+last6[last6.length - 1].slice(5) - 1])}` : ''}</span></div>`;
  }).join('');
}
// ---- the trend chart: a measure by month for the largest groups; legend items hide and show; a table view; the keyboard moves a month
const UNIT_C = { 'Virgin · CC': 1, 'Friendi · CC': 2, 'Virgin · SM': 3, 'Friendi Pay · CC': 4 }, BRAND_C = { Virgin: 1, Friendi: 2, 'Friendi Pay': 4 };
function dashSeries(months, mt) {
  const g = state.dashGroup === 'brand' ? 'brand' : 'unit', fn = GROUPS[g][1], k = months[months.length - 1], size = new Map();
  for (const r of (dashAgg(k) || { rows: [] }).rows) { const x = fn(r); size.set(x, (size.get(x) || 0) + 1); }
  const C = g === 'brand' ? BRAND_C : UNIT_C, names = [...size.keys()].filter(x => x !== '–' && !/–/.test(x)).sort((a, b) => size.get(b) - size.get(a)).slice(0, 4);
  let spare = 5; const used = new Set(names.map(n => C[n]).filter(Boolean));
  return names.map(name => {
    let c = C[name]; if (!c) { while (used.has(spare)) spare++; c = spare; used.add(spare); }
    const values = months.map(x => { const a = dashAgg(x); return a ? groupVal(a.rows.filter(r => fn(r) === name), mt) : null; });
    return { name, c, values, n: size.get(name) };
  }).sort((a, b) => a.c - b.c);
}
function dashChartHtml(months, mt, narrow) {
  const S = dashSeries(months, mt), on = S.filter(s => !state.dashHide.has(s.name)), set = state.settings;
  const W = 760, H = narrow ? 230 : 260, L = 48, R = narrow ? 14 : 112, T = 16, B = 30;
  const vals = on.flatMap(s => s.values).filter(v => v != null).concat(mt.k === 'adh' ? [set.target] : []);
  if (!vals.length) return `<div class="empty"><b>Nothing to draw</b>No ${esc(mt.label.toLowerCase())} in these months for the groups shown.</div>`;
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1; lo -= pad; hi += pad;
  if (mt.k === 'adh' || mt.k === 'fin') { lo = Math.max(0, lo); hi = Math.min(1.02, hi); }
  // even steps on the axis (0.5 pts, 5 s, 10 days …), never odd values
  const isP = mt.k === 'adh' || mt.k === 'fin' || mt.pct, raw = (hi - lo) / 3, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(x => x >= raw) || 10 * mag;
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const n = months.length, X = i => L + (n === 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R)), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = []; for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
  const fmt = v => fmtM(mt, v), fmtAx = v => (isP ? `${(v * 100).toFixed(step * 100 < 1 ? 1 : 0)}%` : mt.k === 'aht' ? mss(v) : fmtM(mt, v));
  const grid = ticks.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text x="${L - 8}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(fmtAx(t))}</text>`).join('');
  // the end labels never sit on top of each other: sorted by height, pushed 14 px apart
  const ends = narrow ? [] : on.map(s => { const i = s.values.map((v, j) => (v == null ? -1 : j)).filter(j => j >= 0).pop(); return i == null || i < 0 ? null : { s, i, y: Y(s.values[i]) }; }).filter(Boolean).sort((a, b) => a.y - b.y);
  for (let j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 14) ends[j].y = ends[j - 1].y + 14;
  const endAt = new Map(ends.map(e => [e.s.name, e]));
  const xl = months.map((x, i) => (narrow && n > 6 && i % 2 && i !== n - 1) ? '' : `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(MON[+x.slice(5) - 1])}</text>`).join('');
  const tgt = mt.k === 'adh' ? `<line class="tg" x1="${L}" x2="${W - R}" y1="${Y(set.target).toFixed(1)}" y2="${Y(set.target).toFixed(1)}"/><text class="tl" x="${W - R + 4}" y="${(Y(set.target) + 4).toFixed(1)}">Target ${pct(set.target, 0)}</text>` : '';
  const lines = on.map(s => {
    const pts = s.values.map((v, i) => (v == null ? null : [X(i), Y(v)])), segs = []; let cur = [];
    pts.forEach(p => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
    return `<g class="ser s${s.c}">${segs.map(sg => `<polyline class="dline" pathLength="1" points="${sg.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"/>`).join('')}${pts.map((p, i) => (p ? `<circle class="dpt${i === state.dashPt ? ' on' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === state.dashPt ? 4.5 : 3}"/>` : '')).join('')}${endAt.has(s.name) ? `<text class="el" x="${(X(endAt.get(s.name).i) + 8).toFixed(1)}" y="${(endAt.get(s.name).y + 4).toFixed(1)}">${esc(s.name)}</text>` : ''}</g>`;
  }).join('');
  const pi = state.dashPt >= 0 && state.dashPt < n ? state.dashPt : -1;
  const cross = pi >= 0 ? `<line class="xh on" x1="${X(pi).toFixed(1)}" x2="${X(pi).toFixed(1)}" y1="${T}" y2="${H - B}"/>` : '';
  const hits = months.map((x, i) => `<rect class="hit" data-dpt="${i}" x="${(X(i) - (W - L - R) / (2 * Math.max(1, n - 1))).toFixed(1)}" y="${T}" width="${((W - L - R) / Math.max(1, n - 1)).toFixed(1)}" height="${H - T - B}"/>`).join('');
  const read = pi >= 0 ? `<b>${esc(ymLabel(months[pi]))}</b> ${on.map(s => `<span class="rd s${s.c}"><i></i>${esc(s.name)} ${esc(s.values[pi] == null ? '–' : fmt(s.values[pi]))}</span>`).join('')}` : `<span class="hint">Point at a month, or focus the chart and use the arrow keys.</span>`;
  const sum = on.map(s => { const v = s.values.filter(x => x != null); return v.length ? `${s.name} ${fmt(v[0])} to ${fmt(v[v.length - 1])}` : ''; }).filter(Boolean).join('; ');
  return `<div class="dchart"><svg class="trendsvg dsvg" viewBox="0 0 ${W} ${H}" tabindex="0" role="img" aria-label="${esc(`${mt.label} by month, ${ymLabel(months[0])} to ${ymLabel(months[n - 1])}: ${sum}`)}" data-dchart>${grid}${tgt}${cross}${lines}${hits}</svg></div><p class="dread" aria-live="polite">${read}</p>`;
}
function dashTableHtml(months, mt) {
  const S = dashSeries(months, mt);
  return `<div class="tablewrap dtab"><table><caption class="sr">${esc(mt.label)} by month and group</caption><thead><tr><th scope="col">Month</th>${S.map(s => `<th scope="col" class="r">${esc(s.name)}</th>`).join('')}</tr></thead><tbody>${months.slice().reverse().map(x => { const i = months.indexOf(x); return `<tr><th scope="row">${esc(ymLabel(x))}</th>${S.map(s => `<td class="r num">${esc(s.values[i] == null ? '–' : fmtM(mt, s.values[i]))}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`;
}
function dashTrendCard(months) {
  const avail = DASH_METRICS.map(k => History.METRICS.find(m => m.k === k)).filter(m => m && months.some(x => { const a = dashAgg(x); return a && a.rows.some(r => History.valOf(r, m) != null); }));
  const mt = avail.find(m => m.k === state.dashMetric) || avail[0]; if (!mt) return '';
  const M = months.slice(-12), S = dashSeries(M, mt), narrow = innerWidth < 640;
  return `<section class="card dtrend" aria-labelledby="h-dtrend"><div class="cardhead"><div><h2 id="h-dtrend">Trend</h2><p class="cap">${esc(mt.label)} by month, ${mt.total === 'sum' ? 'total per group' : 'average per agent'}; the ${S.length > 1 ? `${S.length} largest ${state.dashGroup === 'brand' ? 'brands' : 'teams'}` : 'group'}.</p></div>
    <div class="dctl"><label class="wsfield"><span>Measure</span><select class="cell" data-dmetric aria-label="Measure">${avail.map(m => `<option value="${m.k}"${m.k === mt.k ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
    <div class="seg sm" role="group" aria-label="Group by"><button data-dgroup="unit" aria-pressed="${state.dashGroup !== 'brand'}">Team</button><button data-dgroup="brand" aria-pressed="${state.dashGroup === 'brand'}">Brand</button></div>
    <button class="btn sm ghost" data-dtable aria-pressed="${state.dashTable}"><svg width="14" height="14" aria-hidden="true"><use href="#i-table"/></svg>${state.dashTable ? 'Chart view' : 'Table view'}</button></div></div>
    <div class="dlegend" role="group" aria-label="Show or hide a line">${S.map(s => `<button class="lgi s${s.c}" data-dser="${esc(s.name)}" aria-pressed="${!state.dashHide.has(s.name)}"><i></i>${esc(s.name)} <small>${s.n}</small></button>`).join('')}</div>
    ${state.dashTable ? dashTableHtml(M, mt) : dashChartHtml(M, mt, narrow)}</section>`;
}
// ---- needs attention: four groups with a way to each, and the lowest adherence this month so far
function dashAttention(k) {
  const a = dashAgg(k), set = state.settings, R = a ? a.rows : [], W = wsOfNow();
  const toRes = W.includes('results') ? 'ws:results' : 'ws:team';
  const G = [
    { t: 'Below the adherence target', s: `Monthly adherence under ${pct(set.target, 0)}`, n: R.filter(r => r.adh != null && r.adh < set.target).length, go: 'dash:agents-adh', btn: 'Lowest first' },
    { t: 'Not eligible by the rules', s: 'Final under 80%, an attitude error or too few days', n: R.filter(r => r._el && !r._el.ok).length, go: toRes + '@' + k, btn: W.includes('results') ? 'Results' : 'Team' },
    { t: 'Five or more exceptions', s: 'Late, no sign-on, short of shift, low adherence', n: R.filter(r => (r.wfExc || 0) >= 5).length, go: 'dash:agents-exc', btn: 'Most first' },
    { t: 'Absent two days or more', s: 'Days marked Absent this month', n: R.filter(r => (r.absent || 0) >= 2).length, go: 'dash:team-absent', btn: 'Team' },
  ];
  // the running month from the stored days, when there is one; else the month shown
  const t = new Date(), run = ymKey(t.getFullYear(), t.getMonth() + 1), H = state.history[run];
  let rec = H && H.daily ? H : null; try { if (!rec && state.daily[run]) rec = monthFromDays(run); } catch (e) { rec = null; }
  const src = rec ? rec.rows : R, low = src.filter(r => r.adh != null).sort((x, y) => x.adh - y.adh).slice(0, 5);
  const pidOf = r => { const id = Core.cleanId(r.id); const p = rosterRows().find(q => (id && Core.cleanId(q.nid) === id) || normName(q.name) === normName(r.n)); return p ? p._id : ''; };
  const lowT = rec ? `${ymLabel(run)} so far` : ymLabel(k);
  const ini = n => String(n || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const attn = `<section class="card dattn" aria-labelledby="h-dattn"><div class="cardhead"><div><h2 id="h-dattn">Needs attention</h2><p class="cap">${esc(ymLabel(k))} · ${plural(R.length, 'agent')}</p></div></div>
    <ul class="alist">${G.map(g => `<li class="${g.n ? 'on' : ''}"><span class="an">${g.n}</span><span class="at"><b>${esc(g.t)}</b><small>${esc(g.s)}</small></span>${g.n ? `<button class="btn sm" data-tgo="${esc(g.go)}">${esc(g.btn)}</button>` : '<span class="pill good"><svg width="12" height="12" aria-hidden="true"><use href="#i-check"/></svg>None</span>'}</li>`).join('')}</ul></section>`;
  const lowCard = low.length ? `<section class="card dlow" aria-labelledby="h-dlow"><div class="cardhead"><div><h2 id="h-dlow">Lowest adherence</h2><p class="cap">${esc(lowT)}</p></div></div>
    <ol class="lowl">${low.map(r => { const pid = pidOf(r); return `<li><span class="lav" aria-hidden="true">${esc(ini(r.n))}</span><span class="lnm">${pid ? `<button class="linkbtn nm" data-open="${esc(pid)}" data-agent="${esc(pid)}" dir="auto">${esc(r.n)}</button>` : `<span dir="auto">${esc(r.n)}</span>`}<small>${esc(unitOf(r))}</small></span><b class="${r.adh < set.target ? 'bad' : ''}">${r.adh < set.target ? belowB(r.adh, pct(r.adh, 1)) : esc(pct(r.adh, 1))}</b></li>`; }).join('')}</ol>${rec ? `<p class="hint">${esc(rec.src || '')}</p>` : ''}</section>` : '';
  return attn + lowCard;
}
// ---- the month close: the senior manager's steps only (the results on the agents' pages, the one-to-ones email, the review, the
// final, the final form): a ring for how many are done, each step's state and due day, and the next one to open for the senior
// manager. The other teams' steps are on the Supervisors page; the deadlines themselves are notifications (the bell)
function dashClose(k) {
  let S = []; try { S = calSteps(k).filter(s => s.who === 'Senior manager'); } catch (e) { S = []; }
  if (!S.length) return '';
  const open = S.filter(s => s.st !== 'done'), doneN = S.length - open.length, late = open.filter(s => s.st === 'late').length, soon = open.filter(s => s.st === 'soon').length;
  const mine = open.filter(calMine), next = mine.find(s => s.st === 'late') || mine.find(s => s.st === 'soon') || mine[0];
  const R = [{ c: 'r1', l: 'Steps done', d: doneN, n: S.length }];
  const ring = (x, i) => { const rad = 66 - i * 19, len = 2 * Math.PI * rad, p = x.n ? x.d / x.n : 0; return `<circle class="rt ${x.c}" cx="80" cy="80" r="${rad}"/><circle class="rf ${x.c}" cx="80" cy="80" r="${rad}" style="--c:${len.toFixed(1)};--o:${(len * (1 - p)).toFixed(1)}"/>`; };
  const when = s => s.st === 'done' ? `Done${s.done && s.done.at ? ' ' + ago(s.done.at) : ''}` : s.st === 'late' ? `${plural(-s.days, 'day')} late` : s.st === 'soon' ? (s.days === 0 ? 'Due today' : s.days === 1 ? 'Due tomorrow' : `Due in ${s.days} days`) : s.st === 'past' ? 'Not recorded' : `Due ${fmtDue(s.due)}`;
  return `<section class="card dclose" aria-labelledby="h-dclose"><div class="dch"><h2 id="h-dclose">Month close</h2><span>${esc(ymLabel(k))}</span></div>
    <div class="dcr"><svg class="rings" viewBox="0 0 160 160" role="img" aria-label="${esc(R.map(x => `${x.l}: ${x.d} of ${x.n}`).join('; '))}">${R.map(ring).join('')}</svg>
      <ul class="rleg">${R.map(x => `<li class="${x.c}"><span><i aria-hidden="true"></i>Senior manager's steps</span><b>${x.d}<small> of ${x.n} done</small></b></li>`).join('')}<li class="dcsum">${late ? `<span class="bad">${late} late</span>` : ''}${late && soon ? ' · ' : ''}${soon ? `${soon} due soon` : ''}${!late && !soon ? (open.length ? 'Nothing late' : 'All done') : ''}</li></ul></div>
    <ol class="dcsteps">${S.map(s => `<li class="${s.st}"><span class="dcd" aria-hidden="true"></span><span class="dl"><b>${esc(s.label)}</b><small>${esc(when(s))}${s.note ? ' · ' + esc(s.note) : ''}</small></span></li>`).join('')}</ol>
    ${next ? `<div class="dcn ${next.st}"><span><small>Yours next · ${esc(when(next).toLowerCase())}</small><b>${esc(next.label)}</b></span>${calCanGo(next.go, true) ? `<button class="btn sm" data-tgo="${esc(next.go + '@' + k)}">Open</button>` : '<button class="btn sm" data-dopenbell>Deadlines</button>'}</div>` : ''}</section>`;
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-dopenbell]')) openBell(); });
// ---- data status: how old each source is; no green without a source date
function dashData() {
  const K = FRESH_KINDS.filter(([k]) => (k !== 'roster' || isBuilder()) && (k !== 'dailymail' || canDailyMail() || canDailyTool()));
  const row = ([k, l]) => {
    const f = state.fresh[k]; if (!f || !f.at) return `<li class="ds none"><span class="dsd" aria-hidden="true"></span><span class="dl"><b>${esc(l)}</b><small>No date recorded yet</small></span><span class="dw">Not recorded</span></li>`;
    const age = (Date.now() - new Date(f.at).getTime()) / 86400000, cls = age <= 1.2 ? 'ok' : age <= 7 ? 'mid' : 'old', w = cls === 'ok' ? 'Fresh' : cls === 'mid' ? `${Math.round(age)} days old` : 'Old';
    return `<li class="ds ${cls}"><span class="dsd" aria-hidden="true"></span><span class="dl"><b>${esc(l)}</b><small dir="auto">${esc(f.what || '')}${f.by ? ' · ' + esc(f.by) : ''}</small></span><span class="dw">${esc(w)}<small>${esc(ago(f.at))}</small></span></li>`;
  };
  return `<section class="card ddata" aria-labelledby="h-ddata"><div class="cardhead"><div><h2 id="h-ddata">Data status</h2><p class="cap">When each source last came in.</p></div></div><ul class="dsl">${K.map(row).join('')}</ul></section>`;
}
// ---- the greeting and the role's quick actions
const DASH_ACTS = {
  wfm: [['Emails', 'Daily brand emails, deduction and absences: edit and send', 'wfm:emails', 'i-mail'], ['Interactions', 'Add this week\'s export', 'wfm:inter', 'i-chart'], ['Every team', 'Agents ranked, one-to-ones', 'ws:team', 'i-team']],
  user: [['Import this month\'s files', 'Exports, attendance, IDs, KPI file', 'step:import', 'i-up'], ['Review the checks', 'Names, attendance, decisions', 'step:checks', 'i-check'], ['Report builder', 'MC Leaders and the WFM Daily Review', 'wfm:builder', 'i-file'], ['Emails', 'Daily brand emails, deduction and absences: edit and send', 'wfm:emails', 'i-mail'], ['Daily data', 'Every stored day', 'wfm:daily', 'i-day']],
  senior: [['Supervisors and month close', 'The month close, step by step', 'ws:cycle', 'i-clock'], ['Every team', 'Where each one-to-one stands', 'ws:team', 'i-team'], ['Results', 'Eligibility, finalize the month', 'ws:results', 'i-check'], ['Analytics', 'Every department and month', 'wfm:analytics', 'i-chart']],
  admin: [['Build the month', 'Import, review, export, email', 'step:import', 'i-up'], ['Supervisors', 'The senior manager\'s page', 'ws:cycle', 'i-clock'], ['Results', 'Every agent for the month', 'ws:results', 'i-check'], ['Manage accounts', 'Roles, access, resets', 'accounts', 'i-user']],
};
function greetWord() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function renderDash() {
  const el = $('dashBody'); if (!el) return;
  const u = Auth.user() || {}, r = roleNow(), months = wsMonths(), k = wsMonthNow(), first = firstName(u.name || u.username || '');
  const d = new Date(), date = `${{ Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }[Core.weekday(d.getFullYear(), d.getMonth() + 1, d.getDate())]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
  const st = k ? (monthLocked(k) ? `<span class="pill"><svg width="11" height="11" aria-hidden="true"><use href="#i-lock"/></svg>Final</span>` : '<span class="pill info">Draft</span>') : '';
  const acts = [...new Map(rolesNow().flatMap(x => DASH_ACTS[x] || []).map(x => [x[2], x])).values()].slice(0, 5).filter(([, , go]) => { const kind = go.split(':')[0], x = go.split(':')[1]; const W = wsOfNow(); return kind === 'accounts' ? Auth.isAdmin() || r === 'admin' : kind === 'step' ? W.includes('build') : kind === 'wfm' ? W.includes('wfm') && (x !== 'dmail' || canDailyMail()) && (x !== 'builder' || canDailyTool()) && (x !== 'mail' || canDailyMail()) : W.includes(x); });
  const head = `<div class="dhead"><div class="greet"><h2 class="gt">${esc(greetWord())}${first ? ', ' + esc(first) : ''}</h2><p class="gs"><span>${esc(date)}</span>${k ? `<span>Showing ${esc(ymLabel(k))} ${st}</span>` : ''}</p></div>
    ${acts.length ? `<nav class="qacts" aria-label="Quick actions">${acts.map(([t, s, go, ico]) => `<button class="qa" data-tgo="${esc(go)}"><svg aria-hidden="true"><use href="#${ico}"/></svg><span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`).join('')}</nav>` : ''}</div>`;
  if ($('today').closest('#dashBody')) $('main').prepend($('today'));   // Today lives in the dashboard's side column; kept safe while it is drawn again
  if (!state.rosterReady) { el.innerHTML = `${head}<div class="kpis">${DASH_KPIS.map(K => `<div class="kpi sk-card"><span class="kl">${esc(K.label)}</span><span class="sk w40"></span><span class="sk w70"></span></div>`).join('')}</div><div class="card"><span class="sk tall"></span></div>`; return; }
  if (!months.length || !k) {
    if (stillReading()) { el.innerHTML = `${head}<div class="dgrid"><div class="dmain"><div class="card empty"><b>Reading the shared data…</b>The months, the roster and the results appear here in a moment.</div></div><aside class="dside">${dashData()}</aside></div>`; return; }
    el.innerHTML = `${head}<div class="dgrid"><div class="dmain"><div class="card empty"><b>No months yet</b>${isBuilder() ? 'Build the month on WFM team › Import: it is saved to the shared history as you work, and every number here comes from it.' : 'The WFM analysts build the month from the Genesys exports; it appears here as soon as they start.'}${isBuilder() ? '<div class="acts" style="justify-content:center;margin-top:14px"><button class="btn primary" data-tgo="step:import">Go to Import</button></div>' : ''}</div></div><aside class="dside">${dashData()}</aside></div>`;
    return;
  }
  const intro = !dashPlayed && !RM(); dashPlayed = true;
  el.innerHTML = `${head}
    <div class="drow r1"><div class="kpis" role="list" aria-label="${esc(ymLabel(k))} at a glance">${dashKpisHtml(k, months)}</div>${safeHtml(dashClose, k)}</div>
    <div class="drow r3">${safeHtml(dashAttention, k)}</div>
    <div class="drow r2">${safeHtml(dashTrendCard, months)}${safeHtml(dashData)}</div>`;   // by priority: the month and its steps, what needs someone, then the trend
  el.querySelectorAll('.kpi').forEach(x => x.setAttribute('role', 'listitem'));
  if (intro) { el.classList.add('intro'); clearTimeout(dashIntroT); dashIntroT = setTimeout(() => el.classList.remove('intro'), 1500); }
}
// ---- events
$('dashBody').addEventListener('change', e => { if (e.target.matches('[data-dmetric]')) { state.dashMetric = e.target.value; state.dashPt = -1; renderDash(); const s = $('dashBody').querySelector('[data-dmetric]'); if (s) s.focus(); } });
$('dashBody').addEventListener('click', e => {
  const t = e.target;
  const g = t.closest('[data-dgroup]'); if (g) { state.dashGroup = g.dataset.dgroup; state.dashHide.clear(); renderDash(); const b = $('dashBody').querySelector(`[data-dgroup="${g.dataset.dgroup}"]`); if (b) b.focus(); return; }
  const s = t.closest('[data-dser]'); if (s) { const n = s.dataset.dser; if (state.dashHide.has(n)) state.dashHide.delete(n); else state.dashHide.add(n); renderDash(); const b = $('dashBody').querySelector(`[data-dser="${CSS.escape(n)}"]`); if (b) b.focus(); return; }
  if (t.closest('[data-dtable]')) { state.dashTable = !state.dashTable; renderDash(); const b = $('dashBody').querySelector('[data-dtable]'); if (b) b.focus(); return; }
  const o = t.closest('[data-open]'); if (o) { openPerson(o.dataset.open); }
});
$('dashBody').addEventListener('mouseover', e => { const h = e.target.closest('[data-dpt]'); if (h && +h.dataset.dpt !== state.dashPt) { state.dashPt = +h.dataset.dpt; dashChartOnly(); } });
$('dashBody').addEventListener('mouseleave', e => { if (!e.target.classList || !e.target.classList.contains('dchart')) return; if (state.dashPt >= 0 && !$('dashBody').querySelector('[data-dchart]:focus')) { state.dashPt = -1; dashChartOnly(); } }, true);   // leaving the chart itself, not one of its parts
$('dashBody').addEventListener('keydown', e => {
  const c = e.target.closest('[data-dchart]'); if (!c) return;
  const n = Math.min(12, wsMonths().length); if (!n) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
    e.preventDefault(); const i = state.dashPt < 0 ? n - 1 : state.dashPt;
    state.dashPt = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.max(0, Math.min(n - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    dashChartOnly(true);
  }
});
$('dashBody').addEventListener('focusout', e => {
  if (dashRedraw || !(e.target.closest && e.target.closest('[data-dchart]')) || state.dashPt < 0) return;   // a redraw moves the focus itself
  const card = e.target.closest('.dtrend'); if (card && e.relatedTarget && card.contains(e.relatedTarget)) return;
  state.dashPt = -1; dashChartOnly();
});
/** the measure the trend shows: the one chosen if any month has it, else the first that has data (as the card draws it) */
function dashMetricNow(months) {
  const avail = DASH_METRICS.map(k => History.METRICS.find(m => m.k === k)).filter(m => m && months.some(x => { const a = dashAgg(x); return a && a.rows.some(r => History.valOf(r, m) != null); }));
  return avail.find(m => m.k === state.dashMetric) || avail[0] || null;
}
let dashRedraw = false;
/** only the chart is drawn again (the readout and the crosshair), so nothing else on the page moves */
function dashChartOnly(focus) {
  if (dashRedraw) return;
  const card = $('dashBody').querySelector('.dtrend'); if (!card || state.dashTable) return;
  const months = wsMonths().slice(-12), mt = dashMetricNow(months); if (!mt) return;
  const box = card.querySelector('.dchart'), rd = card.querySelector('.dread'); if (!box) return;
  const tmp = document.createElement('div'); tmp.innerHTML = dashChartHtml(months, mt, innerWidth < 640);
  dashRedraw = true;
  try { box.replaceWith(tmp.querySelector('.dchart')); if (rd) rd.replaceWith(tmp.querySelector('.dread')); } finally { dashRedraw = false; }
  if (focus) { const s = card.querySelector('[data-dchart]'); if (s) s.focus({ preventScroll: true }); }
}
// quick actions and needs-attention links that open a list already sorted
const todayGo0 = todayGo;
todayGo = function (go) {
  const g = String(go || '');
  if (g === 'dash:agents-adh') { state.wfmTab = 'agents'; state.agSort = 'adh'; state.agDir = 'asc'; setWs('wfm'); renderWs(); return; }
  if (g === 'dash:agents-exc') { state.wfmTab = 'agents'; state.agSort = 'wfExc'; state.agDir = 'desc'; setWs('wfm'); renderWs(); return; }
  if (g === 'dash:team-absent') { state.teamTab = 'agents'; state.teamSort = 'absent'; state.teamDir = 'desc'; state.teamPage = 0; setWs('team'); renderWs(); return; }   // most absent first
  if (g === 'step:checks') { setWs('build'); setStep('checks'); return; }
  return todayGo0(go);
};
