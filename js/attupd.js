// ================================================================ CORRECTIONS AFTER THE REVIEW: what comes back after the deduction email
// WFM team › Emails › Deduction and absences. After the review email, champions and supervisors send corrections ("kindly update
// the leave records below": a table with Name, Team, Dep and the days, or a line). The WFM team pastes the table, drops the email
// (.msg, .eml) or a sheet, or types them in plain words; UpdParse reads them; the box shows each day (now → new) for the person it
// matched, or the names to choose from. Apply makes them the month's attendance corrections (att/<k>/edits, as a supervisor's, marked
// as an update), so the workbook, the final email (its list of what changed) and the agent's page follow. Undo takes them back.
// An exception (PC loading, an excuse, a time like 4:00 PM - 4:30 PM) is kept on the day as { x: 1, exc, why }: the day stays as the
// data has it, its lateness excused, and its minutes (or the whole day) come off the conformance deduction in every sheet.
Object.assign(state, { updText: '', updRes: null, updFrom: '', updPick: {}, updOn: {}, updNote: '', updBusy: false });
const canUpd = () => canWfmMail();
const updShown = () => state.ws === 'wfm' && state.wfmTab === 'emails' && state.mailSub !== 'daily' && canUpd();
/** the month the corrections are for: the deduction email's */
function updMonth() { const { y, m } = mailMonth(); return { y, m, k: ymKey(y, m) }; }
/** everyone in the roster, marked when they are in the email's period (a row in one of its months, days in the month being built,
    or days dropped in the period box) */
function updPeople(k) {
  const P = dedPeriod(+k.slice(0, 4), +k.slice(5)), inM = new Set(), D = dnDoc(P.head.k);
  for (const sg of P.segs) if (monthData(sg.k)) for (const pid of rowsByPid(sg.k).keys()) inM.add(pid);
  if (state.ctx && P.segs.some(sg => sg.k === monthKey()) && state.ctx.attendance) for (const pid of state.ctx.attendance.keys()) inM.add(pid);
  if (D) for (const pid of Object.keys(D.att || {})) inM.add(pid);
  return rosterRows().map(p => { const e = effP(p._id) || p; return { pid: p._id, name: p.name, sys: normSpace(p.sys), team: normSpace(p.team), brand: normSpace(p.brand), nid: Core.cleanId(e.nid) || '', inMonth: inM.has(p._id) }; });
}
const updCtx = () => {
  const M = updMonth(), P = dedPeriod(M.y, M.m);
  // a day with no month ("on the 20th") is the period's: the month's own first days, else the month before's days in it
  const dayMonth = n => (n <= P.head.to || !P.tail || n < P.tail.from ? { y: P.head.y, m: P.head.m } : { y: P.tail.y, m: P.tail.m });
  return { y: M.y, m: M.m, people: updPeople(M.k), dayMonth };
};
/** a day of the deduction email's period (13 Oct – 12 Nov for November's): a final month's days in it take the deduction's own corrections */
function inDedPeriod(k, day) { const { y, m } = mailMonth(), P = dedPeriod(y, m); return P.segs.some(s => s.k === k && day >= s.from && day <= s.to); }
/** a day as the month has it now, with the corrections already made (undefined: the tool has no days for the person that month) */
function updNow(pid, k, day) {
  const dn = dnNow(pid, k, day); if (dn !== undefined) return dn;   // a day of the deduction file's next month, dropped on the email page
  const ND = Core.daysIn(+k.slice(0, 4), +k.slice(5)), r = monthData(k) ? rowOf(pid, k) : null;
  if (r && monthLocked(k)) { const v = daysOfRow(r, ND)[day - 1] ?? null, F = dedFixOf(k), e = F && F.get(pid) && F.get(pid).days ? F.get(pid).days[day] : null; return e ? editedDay(v, e) : v; }   // final: as frozen, with the deduction's own corrections
  if (r) return daysOfRow(r, ND)[day - 1] ?? null;
  if (state.ctx && monthKey() === k && state.ctx.attendance) { const a = state.ctx.attendance.get(pid); if (a) return a.days[day - 1] ?? null; }
  return undefined;
}
/** every change with its state: on (ticked), and why one is not (no person, a final month, already so, an OFF day in a range) */
function updRowsOf(R) {
  return R.groups.map((g, gi) => {
    const pid = state.updPick[gi] || g.pid || '';
    return { g, gi, pid, rows: g.changes.map((c, ci) => {
      const k = c.date.slice(0, 7), day = +c.date.slice(8), fin = monthLocked(k), fix = fin && inDedPeriod(k, day), lock = fin && !fix, now = pid ? updNow(pid, k, day) : undefined;
      const E = pid ? (fix ? dedFixOf(k) : attEditsOf(k)) : null, had = E && E.get(pid) && E.get(pid).days ? E.get(pid).days[day] : null, isX = c.exc != null;
      const same = isX ? !!(had && had.x && had.exc === c.exc) : !c.clear && now !== undefined && now === c.v, offDay = isX ? now === 'OFF' : c.wide && (now === 'OFF' || now === null);
      const key = `${gi}:${ci}`, can = !!pid && !lock, def = can && !same && !offDay;
      return { c, key, k, day, now, lock, fix, same, offDay, can, on: can && (key in state.updOn ? state.updOn[key] : def) };
    }) };
  });
}
function updLabelNow(v) { return v === undefined ? 'not in the month' : UpdParse.label(v); }
function renderUpd() {
  const host = $('wfmUpd'); if (!host) return;
  const show = updShown() && !(mailShared() && !dedMonthNow()); host.hidden = !show; if (!show) return;
  const M = updMonth(), R = state.updRes, lock = monthLocked(M.k), P = dedPeriod(M.y, M.m), finals = P.segs.filter(x => monthLocked(x.k));
  const focus = document.activeElement && host.contains(document.activeElement) ? document.activeElement : null;
  const fsel = focus ? ['data-updon', 'data-updwho', 'data-updtext'].map(a => (focus.hasAttribute(a) ? `[${a}="${focus.getAttribute(a)}"]` : '')).find(Boolean) : '';
  let prev = '';
  if (R) {
    const G = updRowsOf(R), n = G.reduce((a, x) => a + x.rows.filter(r => r.on).length, 0), people = G.filter(x => x.rows.some(r => r.on)).length;
    const grp = G.map(({ g, gi, pid, rows }) => {
      const p = pid ? state.roster.find(x => x._id === pid) : null;
      const who = p ? `<b dir="auto">${esc(supName(pid) || p.name)}</b><span class="sg">${esc([p.brand, p.team].filter(Boolean).join(' · '))}</span>${g.who.name && normName(g.who.name) !== normName(p.name) ? `<span class="sg" dir="auto">from “${esc(g.who.name)}”</span>` : ''}`
        : g.cands && g.cands.length ? `<label class="updpick"><span class="sr">Who is “${esc(g.who.name)}”?</span><select class="cell" data-updwho="${gi}"><option value="">Choose who “${esc(g.who.name)}” is</option>${g.cands.map(c => { const q = state.roster.find(x => x._id === c); return q ? `<option value="${esc(c)}">${esc(supName(c) || q.name)} · ${esc([q.brand, q.team].filter(Boolean).join(' '))}</option>` : ''; }).join('')}</select></label>`
        : `<b dir="auto">${esc(g.who.name || g.who.id || '?')}</b><span class="sg bad">${esc(g.why || 'not found in the roster')}</span>`;
      const tr = rows.map(r => {
        const note = r.lock ? `${ymLabel(r.k)} is final` : !pid ? '' : r.same ? 'already so' : r.fix ? `for the deduction only (${ymLabel(r.k)} is final)` : r.offDay ? 'OFF that day: tick it to change' : r.now === undefined ? (r.c.exc != null ? 'no attendance that day: only the deduction' : 'no days for them that month') : '';
        const nw = r.c.clear ? 'as before the corrections' : r.c.exc != null ? `${UpdParse.excLabel(r.c)}${typeof r.now === 'number' ? ' · late excused (Attend)' : ''}` : UpdParse.label(r.c.v);
        return `<tr class="${r.on ? '' : 'off'}"><td class="chk"><input type="checkbox" data-updon="${r.key}"${r.on ? ' checked' : ''}${r.can ? '' : ' disabled'} aria-label="${esc(`${r.day} ${MON[+r.k.slice(5) - 1]}`)}"></td><td>${r.day} ${MON[+r.k.slice(5) - 1]}</td><td>${esc(updLabelNow(r.now))}</td><td class="updarrow" aria-hidden="true">→</td><td><b>${esc(nw)}</b></td><td class="subtle">${esc(note)}</td></tr>`;
      }).join('');
      return `<div class="updgrp"><div class="updwho">${who}</div><div class="tablewrap updtab"><table><thead><tr><th class="chk"><span class="sr">Change</span></th><th>Day</th><th>Now</th><th aria-hidden="true"></th><th>New</th><th><span class="sr">Note</span></th></tr></thead><tbody>${tr}</tbody></table></div></div>`;
    }).join('');
    const bad = R.bad.length ? `<details class="updbad" open><summary>${plural(R.bad.length, 'line')} not read</summary><ul>${R.bad.slice(0, 30).map(b => `<li><span dir="auto">${esc(b.text)}</span> <span class="subtle">${esc(b.why)}</span></li>`).join('')}</ul></details>` : '';
    const none = !R.groups.length && !R.bad.length ? '<p class="hint">Nothing to change was found. Paste the table (Name and the days, like 27-Oct; or a day, a name and the reason on each line), or type a line like: set Nawaf as absent on 10 Oct.</p>' : '';
    prev = `<div class="updprev" aria-live="polite"><p class="hint">Read from ${esc(state.updFrom || 'the box')}: ${plural(R.groups.length, 'person', 'people')}${R.table ? ' from a table' : ''}. Untick a day to leave it as it is.</p>${grp}${bad}${none}
      <div class="acts updgo"><button class="btn primary" data-updapply${n ? '' : ' disabled'}>${n ? `Apply ${plural(n, 'change')}${people > 1 ? ` for ${people} people` : ''}` : 'Nothing to apply'}</button><button class="btn ghost" data-updclear>Clear</button></div></div>`;
  }
  // what was applied from here over the period: each month's days in it (a final month's: the deduction's own corrections)
  const byP = new Map();
  for (const sg of P.segs) {
    const E = dedEditsOf(sg.k); if (!E) continue;
    for (const [pid, body] of E) {
      const ds = Object.entries((body && body.days) || {}).filter(([d, e]) => e && e.src === 'update' && +d >= sg.from && +d <= sg.to).map(([d, e]) => ({ d: +d, ...e })).sort((a, b) => a.d - b.d);
      if (!ds.length) continue;
      const o = byP.get(pid) || { n: body.n, parts: [], last: null }; byP.set(pid, o);
      const byV = new Map(); ds.forEach(x => { const l = x.x ? `exception${x.why ? ` (${x.why}${typeof x.exc === 'number' ? `, ${x.exc} min` : ''})` : ''}` : UpdParse.label(x.v); byV.set(l, (byV.get(l) || []).concat(x.d)); });
      o.parts.push(...[...byV].map(([l, D]) => `${D.join(', ')} ${MON[sg.m - 1]}: ${l}${monthLocked(sg.k) ? ' (deduction only)' : ''}`));
      for (const x of ds) if (!o.last || x.at > o.last.at) o.last = x;
    }
  }
  const done = [...byP].map(([pid, o]) => `<li><span class="nm" dir="auto">${esc(supName(pid) || o.n || pid)}</span><span class="sg">${esc(o.parts.join(' · '))} · ${esc(o.last.by || '')}${o.last.at ? `, ${esc(fmtWhen(o.last.at))}` : ''}</span><button class="btn sm ghost" data-updrm="${esc(pid)}">Remove</button></li>`);
  const src = !mailShared() && state.wb ? `<p class="hint warnline">The email takes its numbers from ${esc(state.wb.name)}: the corrections go to the month, not into that file. Choose <b>Shared month</b> above the email to see them in it.</p>` : '';
  host.innerHTML = `<section class="card updcard" aria-labelledby="updH">
    <div class="updhd"><h2 id="updH">Corrections after the review</h2><span class="pill info">${esc(P.label)}</span></div>
    <p class="cap">When corrections come back after the deduction email, put them here: paste the table from the email, drop the email (.msg or .eml) or a sheet, or type them, one a line, like <i>set Nawaf as absent on 10 Oct</i> or <i>Sara K. SL 27-29 Oct</i>. Exceptions too (a day, the name and the reason, like <i>Oct-22 · Name · Excuse</i>, <i>PC loading for 2 min</i> or <i>4:00 PM - 4:30 PM</i>): the day's lateness is excused and its minutes, or the whole day, come off the deduction (the Diff); a leave changes the attendance and that day's deduction goes. You see each day first; <b>Apply</b> makes them the month's corrections, so every sheet, the workbooks and the final email have them.</p>
    ${finals.length ? `<p class="hint warnline">${esc(finals.map(x => ymLabel(x.k)).join(' and '))} ${finals.length > 1 ? 'are' : 'is'} final: corrections for ${esc(finals.map(segLabel).join(' and '))} count for the deduction only, and ${finals.length > 1 ? 'their' : 'its'} results stay as they were.</p>` : ''}${src}
    <div class="upddrop" data-upddrop><textarea class="cell" data-updtext rows="4" spellcheck="false" placeholder="Paste the table from the email here, or type: set Nawaf as absent on 10 Oct · Nawaf PC loading 5 min on 11 Oct">${esc(state.updText)}</textarea>
      <div class="acts updacts"><button class="btn" data-updread${state.updBusy ? ' disabled' : ''}>${state.updBusy ? '<span class="spin" aria-hidden="true"></span>Reading…' : 'Read'}</button><button class="btn ghost" data-updfile>Choose a file</button><span class="hint">or drop the email or the sheet here</span>
      <input type="file" hidden multiple data-updpick accept=".msg,.eml,.xlsx,.xlsm,.xls,.csv,.txt,.png,.jpg,.jpeg"></div></div>
    ${state.updNote ? `<p class="hint warnline">${esc(state.updNote)}</p>` : ''}${prev}
    ${done.length ? `<div class="upddone"><h3>Applied from here for ${esc(P.label)}</h3><ul class="ilist">${done.join('')}</ul></div>` : ''}</section>`;
  if (fsel) { const f = host.querySelector(fsel); if (f) f.focus(); }
}
/** read what is in the box */
function updRead() {
  const t = String(state.updText || '');
  state.updPick = {}; state.updOn = {}; state.updNote = '';
  if (!normSpace(t)) { state.updRes = null; state.updNote = 'Paste the table from the email, or type a line like: set Nawaf as absent on 10 Oct.'; renderUpd(); return; }
  state.updRes = UpdParse.parse({ text: t }, updCtx()); state.updFrom = 'the box';
  renderUpd();
}
/** files: the email (.msg, .eml), a sheet, a text file; a picture cannot be read */
async function updFiles(list) {
  if (!canUpd()) return;
  const F = [...list]; if (!F.length) return;
  state.updBusy = true; state.updNote = ''; renderUpd();
  const ctx = updCtx(), res = { groups: [], bad: [], table: false }, names = [], notes = [];
  for (const f of F) {
    try {
      const buf = await f.arrayBuffer(), u8 = new Uint8Array(buf); let r = null;
      if (/\.msg$/i.test(f.name)) r = UpdParse.parse({ text: msgBodyText(u8) }, ctx);
      else if (/\.eml$/i.test(f.name)) { const P = UpdParse.emlParts(u8), rows = UpdParse.htmlRows(P.html); r = rows ? UpdParse.parse({ rows }, ctx) : null; if (!r || !r.groups.length) r = UpdParse.parse({ text: P.text || htmlText(P.html) }, ctx); }
      else if (/\.(xlsx|xlsm|xls|csv)$/i.test(f.name)) {
        const sheets = /\.xls$/i.test(f.name) ? (window.parseXls ? window.parseXls(buf) : []) : /\.csv$/i.test(f.name) ? [{ rows: Core.parseCSV(new TextDecoder().decode(u8)) }] : await Core.readXlsx(buf);
        for (const sh of sheets || []) { const x = UpdParse.parse({ rows: sh.rows || [] }, ctx); if (x.groups.length || x.bad.length) { r = x; break; } }
      } else if (/\.txt$/i.test(f.name)) r = UpdParse.parse({ text: new TextDecoder().decode(u8) }, ctx);
      else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(f.name)) { notes.push(`${f.name} is a picture, and the tool cannot read pictures. In the email, select the table, copy it (Ctrl+C) and paste it in the box, or save the email (.msg) and drop it here.`); continue; }
      else { notes.push(`${f.name}: drop the email (.msg or .eml), a sheet (.xlsx, .csv) or paste the table.`); continue; }
      if (!r || (!r.groups.length && !r.bad.length)) { notes.push(`${f.name}: no table of corrections in it (a Name column and the days, like 27-Oct).`); continue; }
      names.push(f.name); res.groups.push(...r.groups); res.bad.push(...r.bad); res.table = res.table || r.table;
    } catch (e) { notes.push(`${f.name}: ${(e && e.message) || 'could not be read'}.`); }
  }
  // the same person in two files: one group
  const by = new Map(); res.groups = res.groups.filter(g => { if (!g.pid) return true; const h = by.get(g.pid); if (!h) { by.set(g.pid, g); return true; } for (const c of g.changes) { const i = h.changes.findIndex(x => x.date === c.date); if (i >= 0) h.changes[i] = c; else h.changes.push(c); } h.changes.sort((a, b) => (a.date < b.date ? -1 : 1)); return false; });
  state.updBusy = false; state.updPick = {}; state.updOn = {}; state.updNote = notes.join(' ');
  if (names.length) { state.updRes = res; state.updFrom = names.join(', '); }
  renderUpd();
}
/** the ticked changes, ready to write */
function updSelected() {
  const R = state.updRes; if (!R) return [];
  return updRowsOf(R).flatMap(({ g, pid, rows }) => rows.filter(r => r.on).map(r => ({ pid, k: r.k, day: r.day, v: r.c.v, exc: r.c.exc, why: r.c.why, clear: r.c.clear, note: (g.src === 'typed' ? g.text : `${g.text} · from ${state.updFrom || 'an update'}`).slice(0, 200) })));
}
function updApply() {
  if (!canUpd() || !state.updRes) return;
  const sel = updSelected(); if (!sel.length) return;
  const by = new Map(); for (const c of sel) { const key = `${c.pid}|${c.k}`; if (!by.has(key)) by.set(key, []); by.get(key).push(c); }
  const undo = [], at = new Date().toISOString(), who = whoNow(), ks = new Set(), names = new Set(); let n = 0;
  for (const [key, L] of by) {
    const [pid, k] = key.split('|'), fix = monthLocked(k); if (fix && !L.every(c => inDedPeriod(k, c.day))) continue;   // a final month: only its days in the period, for the deduction
    const E = updStore(k, fix), cur = E.get(pid), prev = cur ? JSON.parse(JSON.stringify(cur)) : null, days = { ...((cur && cur.days) || {}) };
    for (const c of L) {
      if (c.clear) delete days[c.day];
      else if (c.exc != null) days[c.day] = { x: 1, exc: c.exc, why: String(c.why || '').slice(0, 80), note: c.note, by: who, at, src: 'update' };   // the day as it is, excused
      else days[c.day] = { v: c.v, note: c.note, by: who, at, src: 'update' };
      n++;
    }
    const p = state.roster.find(x => x._id === pid), body = { days, n: supName(pid) || (p && p.name) || '' };
    E.set(pid, body); undo.push({ pid, k, prev, fix }); ks.add(k); names.add(body.n);
    const at2 = `${fix ? 'dedfix' : 'att'}/${k}/edits/${pid}`;
    if (state.db) queueWrite(at2, () => state.db.doc(at2).set(body)).catch(e => toast(`Not saved (${(e && e.code) || 'error'}).`));
    if (!fix && agentHasAccount(pid)) setTimeout(() => publishAgent(pid, k, { quiet: true }), 900);   // the agent's own page follows (a final month's stays)
  }
  if (!undo.length) return;
  state.attEditsVer++; state.dedFixVer++;
  markFresh('attendance', `${[...names].slice(0, 2).join(', ')}${names.size > 2 ? ` and ${names.size - 2} more` : ''}: ${plural(n, 'day')}`);
  state.updRes = null; state.updText = ''; state.updPick = {}; state.updOn = {}; state.updNote = '';
  updAfter(ks);
  const kept = REP.loaded && [...ks].some(k => REP.list.some(x => x && x.k === k && x.kind === 'incentive'));   // an incentive file the senior manager has already
  toast(`Applied: ${plural(n, 'day')} for ${plural(names.size, 'person', 'people')}. Every sheet, the workbooks and the final email have them${kept ? '; build the incentive file again (Export) so the senior manager has them too' : ''}.`, { label: 'Undo', fn: () => updRestore(undo, 'Undone: the days are as they were.') });
}
/** the corrections as they were before (Undo), or without the ones made from here (Remove) */
function updRestore(L, msg) {
  const ks = new Set();
  for (const { pid, k, prev, fix } of L) {
    if (monthLocked(k) && !fix) continue;
    const E = updStore(k, fix), gone = !prev || !Object.keys(prev.days || {}).length, at2 = `${fix ? 'dedfix' : 'att'}/${k}/edits/${pid}`;
    if (gone) E.delete(pid); else E.set(pid, prev);
    if (state.db) queueWrite(at2, () => (gone ? state.db.doc(at2).delete() : state.db.doc(at2).set(prev))).catch(e => toast(`Not saved (${(e && e.code) || 'error'}).`));
    if (!fix && agentHasAccount(pid)) setTimeout(() => publishAgent(pid, k, { quiet: true }), 900);
    ks.add(k);
  }
  state.attEditsVer++; state.dedFixVer++; updAfter(ks); if (msg) toast(msg);
}
function updRemove(pid) {
  const M = updMonth(), P = dedPeriod(M.y, M.m), L = [], before = []; let n = '';
  for (const sg of P.segs) {   // the period's months: each one's days in it made from here
    const fix = monthLocked(sg.k), E = fix ? dedFixOf(sg.k) : attEditsOf(sg.k), cur = E && E.get(pid); if (!cur) continue;
    const keep = Object.fromEntries(Object.entries(cur.days || {}).filter(([d, e]) => !(e && e.src === 'update' && +d >= sg.from && +d <= sg.to)));
    if (Object.keys(keep).length === Object.keys(cur.days || {}).length) continue;
    L.push({ pid, k: sg.k, prev: { ...cur, days: keep }, fix }); before.push({ pid, k: sg.k, prev: JSON.parse(JSON.stringify(cur)), fix }); n = n || cur.n;
  }
  if (!L.length) return;
  updRestore(L);
  toast(`Removed the corrections made from here for ${supName(pid) || n || 'them'}.`, { label: 'Undo', fn: () => updRestore(before, 'Back.') });
}
/** where a month's corrections are kept here: the month's attendance corrections, or the deduction's own once the month is final */
function updStore(k, fix) {
  if (fix) { watchDedFix(k); if (!state.dedFixBy[k]) state.dedFixBy[k] = new Map(); return state.dedFixBy[k]; }
  watchAttEdits(k); if (!state.attEditsBy[k]) state.attEditsBy[k] = new Map(); return state.attEditsBy[k];
}
/** the month being built is counted again; everything else is drawn again (the email, its workbook and the list follow) */
function updAfter(ks) { if (state.ctx && ks.has(monthKey())) refresh(); renderWs(); }

$('wfmUpd').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || !canUpd()) return;
  if (t.matches('[data-updread]')) updRead();
  else if (t.matches('[data-updfile]')) $('wfmUpd').querySelector('[data-updpick]').click();
  else if (t.matches('[data-updclear]')) { state.updRes = null; state.updText = ''; state.updNote = ''; state.updPick = {}; state.updOn = {}; renderUpd(); }
  else if (t.matches('[data-updapply]')) updApply();
  else if (t.matches('[data-updrm]')) updRemove(t.dataset.updrm);
});
$('wfmUpd').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-updpick]')) { if (t.files && t.files.length) updFiles(t.files); t.value = ''; return; }
  if (t.matches('[data-updon]')) { state.updOn[t.dataset.updon] = t.checked; renderUpd(); return; }
  if (t.matches('[data-updwho]')) { state.updPick[+t.dataset.updwho] = t.value; Object.keys(state.updOn).filter(k => k.startsWith(t.dataset.updwho + ':')).forEach(k => delete state.updOn[k]); renderUpd(); }
});
$('wfmUpd').addEventListener('input', e => { if (e.target.matches('[data-updtext]')) state.updText = e.target.value; });
$('wfmUpd').addEventListener('keydown', e => { if (e.target.matches('[data-updtext]') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); state.updText = e.target.value; updRead(); } });
// a table copied from Outlook or Excel is read at once (its HTML when there is some: the cells stay apart)
$('wfmUpd').addEventListener('paste', e => {
  const ta = e.target; if (!ta.matches || !ta.matches('[data-updtext]')) return;
  const h = e.clipboardData && e.clipboardData.getData('text/html'), rows = h && /<table/i.test(h) ? UpdParse.htmlRows(h) : null;
  if (rows) { e.preventDefault(); const tsv = rows.map(r => r.join('\t')).join('\n'), a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + tsv + ta.value.slice(b); state.updText = ta.value; updRead(); return; }
  setTimeout(() => { state.updText = ta.value; if (/\t/.test(ta.value)) updRead(); }, 0);
});
['dragenter', 'dragover'].forEach(ev => $('wfmUpd').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-upddrop]'); if (z && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmUpd').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-upddrop]'); if (!z) return; z.classList.remove('over'); if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); updFiles(e.dataTransfer.files); } }));   // read once: the page's own drop handler does not see it
