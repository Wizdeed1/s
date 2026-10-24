// ================================================================ ATTENDANCE TEMPLATES: for the departments whose supervisors send attendance
// CC and SM come from Genesys (the Schedule and the Agent Status Timeline). The supervisors of the other departments (Settings: TS, MG,
// CT, QA, DE, WF) fill one template a month (AttTpl): a row per late, absent, leave or day off; every other day is a working day. There
// is one template per department; a department whose people have more than one supervisor in the roster gets one per supervisor.
Object.assign(state, { tplMonth: '', tplOff: 'Fri, Sat', tplOwn: '' });
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const tplTeams = () => state.settings.attTplTeams || [];
/** [{ key, dep, pid, spv, split, people }]: each template department in the Settings order, one supervisor's part of it when split */
function tplGroups() {
  const T = tplTeams(), R = rosterRows(), names = new Map(supervisors().map(s => [s.pid, s.name])), by = new Map(T.map(d => [d, []]));
  for (const p of R) if (p.status !== 'Inactive' && by.has(normSpace(p.team))) by.get(normSpace(p.team)).push(p);
  const spvOf = p => (p.spv && names.has(p.spv) ? p.spv : ''), out = [];
  for (const [dep, P] of by) {
    if (!P.length) continue;
    const S = [...new Set(P.map(spvOf))].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || String(names.get(a)).localeCompare(String(names.get(b))));
    if (S.length === 1) out.push({ key: dep, dep, pid: S[0], spv: S[0] ? names.get(S[0]) : '', split: false, people: P });
    else for (const s of S) out.push({ key: `${dep}|${s}`, dep, pid: s, spv: s ? names.get(s) : 'No supervisor in the roster', split: true, people: P.filter(p => spvOf(p) === s) });
  }
  return out;
}
/** a supervisor's templates: their own parts; every department's when their account is not linked to any agent yet; none when their
    team is all in the departments that come from Genesys */
function tplFor(pid) {
  const G = tplGroups(), own = G.filter(g => g.pid === pid);
  if (own.length) return { list: own, why: 'own' };
  return teamOf(pid).some(p => p.status !== 'Inactive') ? { list: [], why: 'genesys' } : { list: G, why: 'unlinked' };
}
function tplMonths() {
  const t = new Date(), S = new Set([monthKey(), ...wsMonths()]);
  for (let i = -2; i <= 1; i++) { const d = new Date(t.getFullYear(), t.getMonth() + i, 1); S.add(ymKey(d.getFullYear(), d.getMonth() + 1)); }
  return [...S].sort().reverse();
}
const tplMonthNow = () => (state.tplMonth && tplMonths().includes(state.tplMonth) ? state.tplMonth : isBuilder() ? monthKey() : wsMonthNow() || monthKey());
const tplFile = (g, y, m) => AttTpl.fileName(y, m, g.dep, g.split ? g.spv : '');
async function tplBytes(g, k) {
  const [y, m] = k.split('-').map(Number);
  const people = g.people.map(p => { const e = effP(p._id) || p; return { id: Core.cleanId(e.nid), name: gname(e) || p.name, brand: normSpace(p.brand), team: normSpace(p.team) }; }).sort((a, b) => a.name.localeCompare(b.name));
  let logo = null; try { logo = await xlLogo(); } catch (e) { logo = null; }
  return AttTpl.build({ y, m, dep: g.dep, depName: DEP_NAMES[g.dep] || '', spv: g.spv, spvPid: g.pid, people, offDays: normSpace(state.tplOff), at: new Date().toISOString(), by: whoNow() || '', logo });
}
async function tplDownload(key, k) {
  const g = tplGroups().find(x => x.key === key); if (!g) { toast('Nobody in this department is on the roster any more.'); return; }
  const [y, m] = k.split('-').map(Number);
  try { await save(tplFile(g, y, m), new Blob([await tplBytes(g, k)], { type: XLSX_MIME })); } catch (e) { toast('Could not make the template: ' + errText(e)); }
}
async function tplDownloadAll(k, G) {
  if (!G.length) return;
  const [y, m] = k.split('-').map(Number), files = [], used = new Set();
  try {
    for (const g of G) {
      let fn = tplFile(g, y, m); if (used.has(fn.toLowerCase())) fn = fn.replace(/\.xlsx$/, ` (${g.pid || 'more'}).xlsx`); used.add(fn.toLowerCase());
      files.push({ name: fn, data: await tplBytes(g, k) });
    }
    await save(`Attendance templates - ${MON[m - 1]} ${y}.zip`, new Blob([await Core.writeZip(files)], { type: 'application/zip' }));
  } catch (e) { toast('Could not make the templates: ' + errText(e)); }
}
/** the templates the drawer lists: every one for the WFM team, a supervisor's own (see tplFor) */
function tplShown() {
  if (state.tplOwn) return tplFor(state.tplOwn);
  return { list: tplGroups(), why: 'all' };
}
/** the drawer: the month, the usual days off, and a template for each department */
function renderAttTpl() {
  const k = tplMonthNow(), T = tplTeams(), { list: G, why } = tplShown();
  $('attTplSub').textContent = `${ymLabel(k)} · ${T.length ? T.join(', ') : 'no departments chosen in Settings'}`;
  const depName = d => (DEP_NAMES[d] ? `${d} · ${DEP_NAMES[d]}` : d);
  const note = why === 'unlinked' ? '<p class="hint tplnote">Your account is not linked to your agents in the roster yet, so every department is here: download your department\'s template.</p>' : '';
  $('attTplBody').innerHTML = `<p class="hint">One file a month for each department of ${esc(T.join(', ') || 'the template departments')}: the supervisor writes one row for each day someone was late, absent, on leave or off on a day that is not one of their weekly days off. Every other day counts as a working day. Each file opens on <b>How to fill</b>, with examples. CC and SM need nothing: their days come from Genesys. The filled files go on Import with the other attendance files.</p>
    <div class="grid2 tight top"><label class="field"><span class="lbl">Month</span><select class="cell" id="tplMonth" aria-label="Month">${tplMonths().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Weekly days off</span><input class="cell" id="tplOff" value="${esc(state.tplOff)}" spellcheck="false" aria-describedby="tplOffH"><small id="tplOffH">Filled in for everyone on the Team sheet; the supervisor changes it for anyone whose days off differ, or empties it when they change every week.</small></label></div>
    ${note}${G.length ? `<ul class="ilist tpllist">${G.map(g => `<li><span class="tpldep" aria-hidden="true">${esc(g.dep)}</span><span class="tplwho"><b dir="auto">${esc(depName(g.dep))}${g.split ? ` · ${esc(g.spv)}` : ''}</b><small dir="auto">${plural(g.people.length, 'person', 'people')}${!g.split && g.spv ? ` · ${esc(g.spv)}` : ''}</small></span><button class="btn sm" data-tpldl="${esc(g.key)}" aria-label="Download the ${esc(g.dep)} template${g.split ? ` for ${esc(g.spv)}` : ''}"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Download</button></li>`).join('')}</ul>
      ${G.length > 1 ? `<div class="acts"><button class="btn primary" data-tplall><svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>All ${G.length} as one .zip</button></div>` : ''}`
    : `<p class="subtle">${why === 'genesys' ? 'Your team\'s days come from Genesys (CC and SM), so there is nothing to send.' : 'Nobody on the roster is in these departments yet. Check the Dep column of the roster, or the departments in Settings.'}</p>`}`;
}
function openAttTpl(own) { state.tplOwn = own || ''; renderAttTpl(); openDrawer('dAttTpl'); }
/** on the Team page's Attendance tab: the templates for the team being looked at */
function attTplBar(k) {
  const u = Auth.user() || {}, r = roleNow(), spv = r === 'spv' ? u.pid : state.wsSpv || '';
  if (!(r === 'spv' || isBuilder()) || !tplTeams().length) return '';
  const { list, why } = spv ? tplFor(spv) : { list: tplGroups(), why: 'all' };
  if (!list.length) return '';
  const deps = [...new Set(list.map(g => g.dep))].join(', '), n = list.reduce((a, g) => a + g.people.length, 0);
  const what = why === 'unlinked' ? `Every department's template (${esc(deps)}): download your department's.` : `${plural(n, 'person', 'people')} in ${esc(deps)}: one row per late, absent, leave or day off; every other day counts as a working day.`;
  return `<div class="card tplbar"><div><b>Attendance template</b><small>${what}</small></div><button class="btn sm" data-tplopen="${esc(spv)}" data-tplk="${esc(k || '')}"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>${spv ? 'Get the template' : 'Templates'}</button></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-tpldl], [data-tplall], [data-tplopen], #attTplBtn'); if (!t) return;
  if (t.id === 'attTplBtn') { openAttTpl(''); return; }
  if (t.dataset.tplopen !== undefined) { if (t.dataset.tplk) state.tplMonth = t.dataset.tplk; openAttTpl(roleNow() === 'spv' ? (Auth.user() || {}).pid || '' : t.dataset.tplopen); return; }
  if (t.dataset.tplall !== undefined) { tplDownloadAll(tplMonthNow(), tplShown().list); return; }
  if (!tplShown().list.some(g => g.key === t.dataset.tpldl)) return;
  tplDownload(t.dataset.tpldl, tplMonthNow());
});
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest || !t.closest('#attTplBody')) return;
  if (t.id === 'tplMonth') { state.tplMonth = t.value; renderAttTpl(); }
  if (t.id === 'tplOff') state.tplOff = t.value;
});
