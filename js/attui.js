// ================================================================ ATTENDANCE TEMPLATES: for the departments whose supervisors send attendance
// CC and SM come from Genesys (the Schedule and the Agent Status Timeline). The supervisors of the other departments (Settings: TS, MG,
// CT, QA, DE, WF) fill one template a month (AttTpl): a row per late, absent, leave or day off; every other day is a working day.
Object.assign(state, { tplMonth: '', tplOff: 'Fri, Sat', tplOwn: '' });
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const tplTeams = () => state.settings.attTplTeams || [];
/** the people a template lists: active, in the template departments, in this supervisor's team ('' = no supervisor in the roster) */
function tplPeople(spv) {
  const T = new Set(tplTeams()), R = rosterRows(), ids = new Set(R.map(p => p._id));
  return R.filter(p => p.status !== 'Inactive' && T.has(normSpace(p.team)) && (spv ? p.spv === spv : !p.spv || !ids.has(p.spv)));
}
/** each supervisor with someone in the template departments, then the people with no supervisor (when there are any) */
function tplGroups() {
  const out = supervisors().map(s => ({ pid: s.pid, name: s.name, people: tplPeople(s.pid) })).filter(g => g.people.length);
  const none = tplPeople(''); if (none.length) out.push({ pid: '', name: 'No supervisor in the roster', people: none });
  return out;
}
function tplMonths() {
  const t = new Date(), S = new Set([monthKey(), ...wsMonths()]);
  for (let i = -2; i <= 1; i++) { const d = new Date(t.getFullYear(), t.getMonth() + i, 1); S.add(ymKey(d.getFullYear(), d.getMonth() + 1)); }
  return [...S].sort().reverse();
}
const tplMonthNow = () => (state.tplMonth && tplMonths().includes(state.tplMonth) ? state.tplMonth : isBuilder() ? monthKey() : wsMonthNow() || monthKey());
function tplBytes(g, k) {
  const [y, m] = k.split('-').map(Number);
  const people = g.people.map(p => { const e = effP(p._id) || p; return { id: Core.cleanId(e.nid), name: gname(e) || p.name, brand: normSpace(p.brand), team: normSpace(p.team) }; }).sort((a, b) => a.name.localeCompare(b.name));
  return AttTpl.build({ y, m, spv: g.name, spvPid: g.pid, people, offDays: normSpace(state.tplOff), at: new Date().toISOString(), by: whoNow() || '' });
}
async function tplDownload(pid, k) {
  const g = tplGroups().find(x => x.pid === pid); if (!g) { toast('Nobody in this team is in the template departments.'); return; }
  const [y, m] = k.split('-').map(Number);
  try { await save(AttTpl.fileName(y, m, g.name), new Blob([await tplBytes(g, k)], { type: XLSX_MIME })); } catch (e) { toast('Could not make the template: ' + errText(e)); }
}
async function tplDownloadAll(k) {
  const G = tplGroups(); if (!G.length) return;
  const [y, m] = k.split('-').map(Number), files = [], used = new Set();
  try {
    for (const g of G) {
      let fn = AttTpl.fileName(y, m, g.name); if (used.has(fn.toLowerCase())) fn = fn.replace(/\.xlsx$/, ` (${g.pid || 'more'}).xlsx`); used.add(fn.toLowerCase());
      files.push({ name: fn, data: await tplBytes(g, k) });
    }
    await save(`Attendance templates - ${MON[m - 1]} ${y}.zip`, new Blob([await Core.writeZip(files)], { type: 'application/zip' }));
  } catch (e) { toast('Could not make the templates: ' + errText(e)); }
}
/** the drawer: the month, the usual days off, and a template for each supervisor (only their own for a supervisor) */
function renderAttTpl() {
  const k = tplMonthNow(), own = state.tplOwn, all = tplGroups(), G = own ? all.filter(g => g.pid === own) : all, T = tplTeams();
  $('attTplSub').textContent = `${ymLabel(k)} · ${T.length ? T.join(', ') : 'no departments chosen in Settings'}`;
  const deps = g => [...new Set(g.people.map(p => normSpace(p.team)))].join(', ');
  $('attTplBody').innerHTML = `<p class="hint">One file a month for each supervisor of ${esc(T.join(', ') || 'the template departments')}: they write one row for each day someone was late, absent, on leave or off on a day that is not one of their weekly days off. Every other day counts as a working day. CC and SM need nothing: their days come from Genesys (the Schedule and the Agent Status Timeline). The filled files go on Import with the other attendance files.</p>
    <div class="grid2 tight top"><label class="field"><span class="lbl">Month</span><select class="cell" id="tplMonth" aria-label="Month">${tplMonths().map(x => `<option value="${x}"${x === k ? ' selected' : ''}>${esc(ymLabel(x))}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">Weekly days off</span><input class="cell" id="tplOff" value="${esc(state.tplOff)}" spellcheck="false" aria-describedby="tplOffH"><small id="tplOffH">Filled in for everyone on the Team sheet; the supervisor changes it for anyone whose days off differ, or empties it when they change every week.</small></label></div>
    ${G.length ? `<ul class="ilist tpllist">${G.map(g => `<li><span class="nm" dir="auto">${esc(g.name)}</span><span class="sg">${plural(g.people.length, 'person', 'people')} · ${esc(deps(g))}</span><span class="sp"></span><button class="btn sm" data-tpldl="${esc(g.pid)}"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Download</button></li>`).join('')}</ul>
      ${G.length > 1 ? `<div class="acts"><button class="btn primary" data-tplall><svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>All ${G.length} as one .zip</button></div>` : ''}`
    : `<p class="subtle">${own ? 'Nobody in your team is in these departments: their days come from Genesys, so there is nothing to send.' : 'Nobody on the roster is in these departments yet. Check the Dep column of the roster, or the departments in Settings.'}</p>`}`;
}
function openAttTpl(own) { state.tplOwn = own || ''; renderAttTpl(); openDrawer('dAttTpl'); }
/** on the Team page's Attendance tab: the template for the team being looked at */
function attTplBar(k) {
  const u = Auth.user() || {}, r = roleNow(), spv = r === 'spv' ? u.pid : state.wsSpv || '';
  if (!(r === 'spv' || isBuilder())) return '';
  const n = spv ? tplPeople(spv).length : tplGroups().reduce((a, g) => a + g.people.length, 0);
  if (!n) return '';
  return `<div class="card tplbar"><div><b>Attendance template</b><small>${plural(n, 'person', 'people')} in ${esc(tplTeams().join(', '))}${spv ? '' : ' across the teams'}: one row per late, absent, leave or day off; every other day counts as a working day.</small></div><button class="btn sm" data-tplopen="${esc(spv)}" data-tplk="${esc(k || '')}"><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>${spv ? 'Get the template' : 'Templates'}</button></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-tpldl], [data-tplall], [data-tplopen], #attTplBtn'); if (!t) return;
  if (t.id === 'attTplBtn') { openAttTpl(''); return; }
  if (t.dataset.tplopen !== undefined) { if (t.dataset.tplk) state.tplMonth = t.dataset.tplk; openAttTpl(roleNow() === 'spv' ? (Auth.user() || {}).pid || '' : t.dataset.tplopen); return; }
  if (t.dataset.tplall !== undefined) { tplDownloadAll(tplMonthNow()); return; }
  tplDownload(t.dataset.tpldl, tplMonthNow());
});
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest || !t.closest('#attTplBody')) return;
  if (t.id === 'tplMonth') { state.tplMonth = t.value; renderAttTpl(); }
  if (t.id === 'tplOff') state.tplOff = t.value;
});
