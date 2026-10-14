// ================================================================ PARALLEL RUN: the old Excel next to the tool, person by person
// While the team still works the old way for a month or two, drop the old Excel of a month on Results: the final result (ID,
// Name, Final %, Earned SR, or any of Adherence, AHT, Absent, Tardy) or the incentive data workbook. The tool lines every
// person up (by national ID, then by name) and lists what differs, with the likely reason when it can tell. Only the counts are
// kept with the month (who compared, when, how many the same), so the change-over can be shown to have been checked.
Object.assign(state, { cmp: null, cmpSaved: {} });
const CMP_MEAS = [
  { k: 'fin', l: 'Final %', re: /^(final ?%|final percentage|final score|final result|kpi ?%|final|final % \(kpi\))$/i, t: 'pct' },
  { k: 'earned', l: 'Earned SR', re: /^(earned( sr)?|earned \(sr\)|earned incentive|incentive( sr| amount)?|amount( sr)?|total( sr)?|payout)$/i, t: 'int' },
  { k: 'adh', l: 'Adherence', re: /^(adherence( %| avr\.?| average)?|avg adherence|adherence avg)$/i, t: 'pct' },
  { k: 'aht', l: 'AHT', re: /^(aht( \(sec\))?|average handling time)$/i, t: 'sec' },
  { k: 'absent', l: 'Absent days', re: /^(absent( days)?|absence|absences)$/i, t: 'int' },
  { k: 'tardy', l: 'Tardy (min)', re: /^(tardy( \(min\)| minutes)?|tardiness)$/i, t: 'int' },
  { k: 'ka', l: 'Days attended', re: /^(actual days|days attended)$/i, t: 'int' },
];
const cmpM = k => CMP_MEAS.find(m => m.k === k);
function cmpVal(m, raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return m.t === 'sec' ? Math.round((raw.getTime() - Date.UTC(1899, 11, 30)) / 1000) : null;
  let s = raw, pctSign = false;
  if (typeof s === 'string') {
    s = normSpace(s); pctSign = /%$/.test(s);
    if (m.t === 'sec' && /^\d+:\d{2}(:\d{2})?$/.test(s)) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
    s = s.replace(/[%,\s]|SR/gi, ''); if (!s || !Number.isFinite(+s)) return null; s = +s;
  }
  if (typeof s !== 'number' || !Number.isFinite(s)) return null;
  if (m.t === 'pct') return pctSign || s > 1.5 ? s / 100 : s;
  if (m.t === 'sec') return s < 1 ? Math.round(s * 86400) : s;
  return s;
}
/** the old file -> { kind, rows: [{id, name, v: {measure: value}}], meas, sheet } or null */
function cmpRead(sheets) {
  if (History.isIncentive(sheets.map(s => s.name))) {
    const R = History.read(sheets, { target: state.settings.target, floor: state.settings.floor });
    const rows = R.rows.map(r => ({ id: Core.cleanId(r.id) || '', name: r.n, v: { adh: r.adh ?? null, aht: r.aht ?? null, absent: r.absent ?? null, tardy: r.tardy ?? null } }));
    return rows.length ? { kind: 'inc', rows, meas: ['adh', 'aht', 'absent', 'tardy'].filter(m => rows.some(r => r.v[m] != null)), month: R.y && R.m ? ymKey(R.y, R.m) : '', sheet: 'incentive data' } : null;
  }
  let best = null;
  for (const S of sheets) {
    const R = S.rows || [];
    for (let i = 0; i < Math.min(R.length, 25); i++) {
      const H = Array.from(R[i] || [], v => normSpace(v));
      const ni = H.findIndex(v => /^(name|agent( name)?|employee( name)?|member care champions|full name)$/i.test(v)), ii = H.findIndex(v => /^(id|national id|nid|iqama( no)?|id number|employee id)$/i.test(v));
      if (ni < 0 && ii < 0) continue;
      const cols = CMP_MEAS.map(m => [m, H.findIndex(v => m.re.test(v))]).filter(([, j]) => j >= 0);
      if (!cols.length) continue;
      const rows = [];
      for (const r of R.slice(i + 1)) {
        if (!r) continue; const name = ni >= 0 ? normSpace(r[ni]) : '', id = ii >= 0 ? Core.cleanId(r[ii]) || '' : '';
        if ((!name && !id) || /^(total|grand total|sum|average|all)$/i.test(name)) continue;
        const v = {}; for (const [m, j] of cols) v[m.k] = cmpVal(m, r[j]);
        if (Object.values(v).every(x => x == null)) continue;
        rows.push({ id, name, v });
      }
      if (rows.length && (!best || rows.length > best.rows.length)) best = { kind: 'res', rows, meas: cols.map(([m]) => m.k), sheet: S.name };
      break;
    }
  }
  return best;
}
const cmpTool = (r, m) => (m === 'tardy' ? (r.tardy == null ? null : Math.round(r.tardy)) : r[m] ?? null);
function cmpWhy(r, cells, k, pid) {
  const why = [], has = m => cells.some(c => c.m === m), A = r._adj || {};
  if (A.fin != null && has('fin')) why.push('final % changed by the senior manager on Results');
  if ((A.earned != null || A.elig != null) && has('earned')) why.push(`${A.elig === false ? 'not eligible' : A.elig === true ? 'eligible' : 'earned SR'} by the senior manager's decision`);
  if (r._edited && ['earned', 'absent', 'tardy', 'ka'].some(has)) why.push(`attendance corrected by the supervisor (${plural(r._edited, 'day')})`);
  if ((has('fin') || has('earned')) && qRow(k, pid)) why.push('the quality team\'s EVAL is in the tool');
  if (has('earned') && r._el && !r._el.ok) why.push(`not eligible in the tool: ${(r._el.why || []).join(', ')}`);
  if (has('earned') && !has('fin') && r.base) why.push(`incentive base ${r.base} SR in the tool`);
  if (has('adh') || has('aht')) why.push('a different Genesys export, or a different month range');
  return why;
}
/** line up the old rows with the tool's month */
function cmpRun(old, k, fileName) {
  const map = rowsByPid(k), byNid = new Map(), pairs = new Map(), left = [];
  for (const p of rosterRows()) { const id = Core.cleanId((effP(p._id) || p).nid); if (id) byNid.set(id, p._id); }
  const taken = new Set();
  old.rows.forEach((o, i) => { const pid = o.id && byNid.get(o.id); if (pid && !taken.has(pid)) { pairs.set(i, pid); taken.add(pid); } else left.push(i); });
  if (left.length) {
    const people = linkPeople().filter(x => !taken.has(x.id));
    const res = NameLink.link(left.map(i => ({ name: old.rows[i].name, id: '', kind: 'agent' })), people, {}, {});
    res.forEach((x, j) => { if (x.id && !taken.has(x.id)) { pairs.set(left[j], x.id); taken.add(x.id); } });
  }
  const tol = { pct: 0.0005, int: 0.5, sec: 0.5 }, diffs = [], onlyOld = []; let same = 0, matched = 0;
  old.rows.forEach((o, i) => {
    const pid = pairs.get(i), r = pid ? map.get(pid) : null;
    if (!pid || !r) { onlyOld.push({ name: o.name, id: o.id, why: pid ? 'in the roster, but not in the tool\'s month' : 'not found in the roster' }); return; }
    matched++;
    const cells = old.meas.map(m => { const a = o.v[m], b = cmpTool(r, m); if (a == null || b == null) return null; const d = b - a; return Math.abs(d) >= tol[cmpM(m).t] ? { m, old: a, tool: b, d } : null; }).filter(Boolean);
    const p = state.roster.find(x => x._id === pid), nm = p ? gname(effP(pid) || p) || p.name : o.name;
    if (cells.length) diffs.push({ pid, name: nm, oldName: o.name, id: o.id || Core.cleanId(((p && effP(pid)) || p || {}).nid) || '', cells, why: cmpWhy(r, cells, k, pid) }); else same++;
  });
  const onlyTool = [...map.entries()].filter(([pid, r]) => !taken.has(pid) && old.meas.some(m => cmpTool(r, m) != null)).map(([pid]) => { const p = state.roster.find(x => x._id === pid); return { pid, name: p ? gname(effP(pid) || p) || p.name : pid }; });
  return { k, file: fileName, sheet: old.sheet || '', at: new Date().toISOString(), by: whoNow(), kind: old.kind, meas: old.meas, n: old.rows.length, matched, same, diffs, onlyOld, onlyTool };
}
async function cmpFile(file) {
  const k = wsMonthNow(); if (!k) { toast('No month to compare with yet.'); return; }
  let sheets; try { sheets = await parse(file.name, await file.arrayBuffer(), true); } catch (e) { toast(`${file.name}: could not read it.`); return; }
  const old = cmpRead(sheets);
  if (!old) { toast(`${file.name}: no ID or Name column with Final %, Earned SR, Adherence, AHT, Absent or Tardy next to it.`); return; }
  if (old.month && old.month !== k) toast(`${file.name} is for ${ymLabel(old.month)}; it is compared with ${ymLabel(k)}, the month chosen above.`);
  state.cmp = cmpRun(old, k, file.name);
  const S = state.cmp, sum = { k, file: S.file, at: S.at, by: S.by, kind: S.kind, meas: S.meas, n: S.n, matched: S.matched, same: S.same, diff: S.diffs.length, onlyOld: S.onlyOld.length, onlyTool: S.onlyTool.length };
  state.cmpSaved[k] = sum;
  if (state.db) queueWrite('cmp/' + k, () => state.db.doc('cmp/' + k).set(sum)).catch(() => {});
  logCycle(k, `Compared ${ymLabel(k)} with the old Excel (${file.name}): ${S.same} of ${S.matched} the same, ${S.diffs.length} different`);
  renderWs(); setTimeout(() => { const el = document.querySelector('.cmpcard'); if (el) el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); }, 80);
}
const cmpFmt = (m, v) => { const t = cmpM(m).t; return v == null ? '–' : t === 'pct' ? pct(v, 2) : t === 'sec' ? mss(v) : String(Math.round(v * 100) / 100); };
const cmpD = (m, d) => { const t = cmpM(m).t; return `${d > 0 ? '+' : '−'}${t === 'pct' ? `${Math.abs(d * 100).toFixed(2)} pt` : t === 'sec' ? mss(Math.abs(d)) : Math.round(Math.abs(d) * 100) / 100}`; };
function cmpCardHtml(k) {
  if (!k) return '';
  if (state.db && !(k in state.cmpSaved)) { state.cmpSaved[k] = null; state.db.doc('cmp/' + k).get().then(s => { if (s.exists) { state.cmpSaved[k] = s.data(); if (state.ws === 'results') renderWs(); } }).catch(() => {}); }
  const S = state.cmp && state.cmp.k === k ? state.cmp : null, saved = state.cmpSaved[k];
  let body = '';
  if (S) {
    body = `<div class="tiles wstiles cmptiles"><div class="tile"><span class="tl">people in the old Excel</span><b>${S.n}</b><span class="ts">${esc(S.sheet)}</span></div><div class="tile good"><span class="tl">the same</span><b>${S.same}</b><span class="ts">of ${S.matched} lined up</span></div><div class="tile${S.diffs.length ? ' alert' : ''}"><span class="tl">different</span><b>${S.diffs.length}</b><span class="ts">${esc(S.meas.map(m => cmpM(m).l).join(', '))}</span></div><div class="tile"><span class="tl">only in the old / only in the tool</span><b>${S.onlyOld.length} / ${S.onlyTool.length}</b></div></div>
      ${S.diffs.length ? `<div class="tablewrap restab"><table><thead><tr><th>Agent</th><th>What</th><th class="r">Old Excel</th><th class="r">Tool</th><th class="r">Difference</th><th>Likely why</th></tr></thead><tbody>${S.diffs.map(x => x.cells.map((c, j) => `<tr>${j ? '<td></td>' : `<td><button class="linkbtn nm" data-open="${esc(x.pid)}" data-agent="${esc(x.pid)}" dir="auto">${esc(x.name)}</button>${normName(x.oldName) !== normName(x.name) ? `<br><small class="subtle" dir="auto">${esc(x.oldName)}</small>` : ''}</td>`}<td>${esc(cmpM(c.m).l)}</td><td class="r num">${esc(cmpFmt(c.m, c.old))}</td><td class="r num"><b>${esc(cmpFmt(c.m, c.tool))}</b></td><td class="r num">${esc(cmpD(c.m, c.d))}</td><td class="subtle">${j ? '' : esc(x.why.join('; ') || '–')}</td></tr>`).join('')).join('')}</tbody></table></div>` : '<p class="good">Every person lined up has the same numbers in both.</p>'}
      ${S.onlyOld.length ? `<details class="cmpmore"><summary>Only in the old Excel · ${S.onlyOld.length}</summary><ul class="ilist">${S.onlyOld.map(x => `<li><span class="nm" dir="auto">${esc(x.name)}</span><span class="sg">${esc(x.id || 'no ID')} · ${esc(x.why)}</span></li>`).join('')}</ul></details>` : ''}
      ${S.onlyTool.length ? `<details class="cmpmore"><summary>Only in the tool · ${S.onlyTool.length}</summary><ul class="ilist">${S.onlyTool.map(x => `<li><button class="linkbtn nm" data-open="${esc(x.pid)}" dir="auto">${esc(x.name)}</button></li>`).join('')}</ul></details>` : ''}`;
  } else if (saved) body = `<p class="hint">Last compared ${esc(fmtWhen(saved.at))} by ${esc(saved.by || '')} with ${esc(saved.file)}: ${saved.same} of ${saved.matched} the same, ${saved.diff} different, ${saved.onlyOld} only in the old Excel, ${saved.onlyTool} only in the tool. Drop it again to see the people.</p>`;
  return `<div class="card cmpcard"><div class="cardhead"><div><h2>Parallel run · ${esc(ymLabel(k))} against the old Excel</h2><p class="cap">While the team still works the old way, drop the old Excel of the month: the final result (ID, Name, Final %, Earned SR) or the incentive data workbook. The tool lines every person up, by national ID and then by name, and shows what differs.</p></div>
    <div class="wsacts"><button class="btn sm" data-cmppick><svg width="14" height="14" aria-hidden="true"><use href="#i-up"/></svg>Choose the old Excel</button>${S && (S.diffs.length || S.onlyOld.length || S.onlyTool.length) ? '<button class="btn sm" data-cmpx><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Excel</button>' : ''}</div></div>
    ${S ? '' : '<div class="cmpdrop" data-cmpdrop tabindex="0" role="button" aria-label="Drop the old Excel here">Drop the old Excel here</div>'}${body}</div>`;
}
async function exportCmp() {
  const S = state.cmp; if (!S) return;
  await xlBook(`Parallel run - ${ymLabel(S.k)}.xlsx`, [
    { name: 'Differences', title: `Old Excel against the tool - ${ymLabel(S.k)}`, sub: `${S.file} · ${S.same} of ${S.matched} the same · compared ${fmtWhen(S.at)} by ${S.by}`, cols: [{ h: 'Agent', t: 'text', w: 30 }, { h: 'Name in the old Excel', t: 'text', w: 30 }, { h: 'ID', t: 'text', w: 13 }, { h: 'What', t: 'text', w: 14 }, { h: 'Old Excel', t: 'text', w: 12 }, { h: 'Tool', t: 'text', w: 12 }, { h: 'Difference', t: 'text', w: 12 }, { h: 'Likely why', t: 'text', w: 60 }],
      rows: S.diffs.flatMap(x => x.cells.map(c => [x.name, x.oldName, x.id, cmpM(c.m).l, cmpFmt(c.m, c.old), cmpFmt(c.m, c.tool), cmpD(c.m, c.d), x.why.join('; ')])) },
    { name: 'Only in the old Excel', title: 'Only in the old Excel', sub: S.file, cols: [{ h: 'Name', t: 'text', w: 32 }, { h: 'ID', t: 'text', w: 13 }, { h: 'Why', t: 'text', w: 40 }], rows: S.onlyOld.map(x => [x.name, x.id, x.why]) },
    { name: 'Only in the tool', title: 'Only in the tool', sub: ymLabel(S.k), cols: [{ h: 'Name', t: 'text', w: 32 }], rows: S.onlyTool.map(x => [x.name]) }]);
}
const cmpPicker = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx,.xlsm,.xlsb,.csv', hidden: true, id: 'cmpPicker' }); document.body.appendChild(cmpPicker);
cmpPicker.addEventListener('change', () => { const f = cmpPicker.files[0]; cmpPicker.value = ''; if (f) cmpFile(f); });
$('resultsBody').addEventListener('click', e => { if (e.target.closest('[data-cmppick], [data-cmpdrop]')) cmpPicker.click(); if (e.target.closest('[data-cmpx]')) exportCmp(); });
$('resultsBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-cmpdrop]')) { e.preventDefault(); cmpPicker.click(); } });
['dragenter', 'dragover'].forEach(t => $('resultsBody').addEventListener(t, e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
$('resultsBody').addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (z) z.classList.remove('over'); });
$('resultsBody').addEventListener('drop', e => { const z = e.target.closest && e.target.closest('[data-cmpdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); const f = (e.dataTransfer && e.dataTransfer.files || [])[0]; if (f) cmpFile(f); });
