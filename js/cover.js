// ================================================================ VACATION COVER: the WFM manager and the WFM analysts stand in for each other
// While a WFM analyst is on vacation, the WFM manager ticks it on the WFM team page and has the analysts' tabs too (Import,
// Review, Export, Report builder), with their permissions; while the manager is away, an analyst ticks it and has the manager's
// pages (Results, adding the interactions). Untick it and each has their own pages again. The tick is shared, so everyone sees
// who is away, who ticked it and since when, and every change is logged (cover/now: { away: { accountId: {...} }, log: [...] }).
Object.assign(state, { cover: { away: {}, log: [] } });
const COVER_OF = { wfm: 'user', user: 'wfm' };   // whose work each role takes on
const meId = () => (Auth.user() || {}).id || '';
/** a tick still counts only while its account is there, turned on, with the role it was ticked for */
const coverLive = (id, x) => { const a = (state.people || []).find(p => p.id === id); return !!(a && x && !a.disabled && a.role === x.role); };
/** the role a person also works with now: a colleague's, while that colleague is on vacation */
function coverRoleFor(r) {
  const other = COVER_OF[r]; if (!other) return '';
  const A = (state.cover && state.cover.away) || {}, me = meId();
  return Object.entries(A).some(([id, x]) => id !== me && x && x.role === other && coverLive(id, x)) ? other : '';
}
/** the colleagues a person can mark as away: the accounts with the other WFM role (the admin: both) */
function coverPeople() {
  const r = roleNow(), want = r === 'admin' ? ['user', 'wfm'] : COVER_OF[r] ? [COVER_OF[r]] : [], me = meId();
  return (state.people || []).filter(a => a && a.id && a.id !== me && want.includes(a.role) && !a.disabled).sort((a, b) => String(a.name || a.username || '').localeCompare(String(b.name || b.username || '')));
}
const COVER_GETS = { user: 'Import, Review, Export and Report builder, with the analysts\' permissions', wfm: 'Results and adding the interactions, with the manager\'s permissions' };
function renderCoverNote() {
  const el = $('coverNote'); if (!el) return;
  const A = state.cover.away || {}, mine = A[meId()], L = coverPeople(), r = roleNow(), cov = coverRoleFor(r);
  // a tick left by an account that was removed, turned off or given another role: anyone on this page can clear it
  const stale = ['wfm', 'user', 'admin'].includes(r) ? Object.entries(A).filter(([id, x]) => id !== meId() && !coverLive(id, x) && !L.some(a => a.id === id)) : [];
  if (!L.length && !mine && !stale.length) { el.hidden = true; el.innerHTML = ''; return; }
  const nm = a => a.name || a.username || 'Someone', since = x => x ? ` since ${fmtWhen(x.at)}${x.byName && x.by !== meId() ? `, ticked by ${x.byName}` : ''}` : '';
  const away = L.filter(a => A[a.id]);
  const lead = mine ? `You are marked as on vacation${since(mine)}. Your colleague has your tabs until you are back.`
    : cov ? `${away.map(nm).join(' and ')} ${away.length > 1 ? 'are' : 'is'} on vacation${away.length === 1 ? since(A[away[0].id]) : ''}: you have their work too (${COVER_GETS[cov]}) until you untick it.`
    : 'Vacation cover';
  const on = !!(cov || mine); el.hidden = false; el.classList.toggle('on', on);
  el.title = on ? '' : 'Tick a colleague who is on vacation: you then have their work too, with their permissions, until you untick it. Everyone sees the tick.';
  el.innerHTML = `<svg width="15" height="15" aria-hidden="true"><use href="#i-day"/></svg><span class="${on ? '' : 'cvl'}">${esc(lead)}</span>
    <span class="cvlist">${mine ? '<button class="btn sm" data-coverback>I am back</button>' : ''}${L.map(a => `<label><input type="checkbox" data-cover="${esc(a.id)}"${A[a.id] ? ' checked' : ''}> ${esc(nm(a))} is on vacation <small>${esc(ROLE_NAME[a.role] || '')}</small></label>`).join('')}${stale.map(([id, x]) => `<label><input type="checkbox" data-cover="${esc(id)}" checked> ${esc((x && x.name) || 'Someone')} <small>no longer ${esc(ROLE_NAME[x && x.role] || 'in this role')}: untick to clear</small></label>`).join('')}</span>`;
}
/** someone away, or back: shared at once, and logged */
function setCover(id, on) {
  const a = (state.people || []).find(x => x.id === id), u = Auth.user() || {}, now = new Date().toISOString();
  const cur = state.cover || {}, away = { ...(cur.away || {}) }, who = a ? a.name || a.username || 'Someone' : id === meId() ? whoNow() : 'Someone';
  if (on) away[id] = { role: a ? a.role : roleNow(), name: who, by: u.id || '', byName: whoNow(), at: now }; else delete away[id];
  const log = [{ at: now, by: whoNow(), what: `${who} ${on ? 'on vacation' : 'back from vacation'}` }, ...(cur.log || [])].slice(0, 50);
  const was = rolesNow().join(); state.cover = { away, log };
  if (state.db) queueWrite('cover/now', () => state.db.doc('cover/now').set(state.cover));
  toast(on ? `${who} is on vacation: ${id === meId() ? 'your colleague has your tabs now.' : 'you have their work too until you untick it.'}` : `${who} is back.`);
  if (rolesNow().join() !== was) applyRole(); else { renderWfmHead(); syncNav(); }
}
/** the shared tick, live: the pages follow at once */
function coverLoaded(sn) {
  const d = sn.docs.find(x => x.id === 'now'), was = rolesNow().join();
  state.cover = (d && d.data()) || { away: {}, log: [] }; if (!state.cover.away) state.cover.away = {};
  if (rolesNow().join() !== was) applyRole(); else renderWfmHead();
}
$('coverNote').addEventListener('change', e => { const c = e.target.closest('[data-cover]'); if (c) setCover(c.dataset.cover, c.checked); });
$('coverNote').addEventListener('click', e => { if (e.target.closest('[data-coverback]')) setCover(meId(), false); });
