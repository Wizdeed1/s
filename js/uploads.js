// ================================================================ SAVED UPLOADS: the month's files are kept, so signing out loses nothing
// Every Genesys export and supervisors' attendance sheet dropped on Import is kept as it was dropped: in the shared data (the
// data folder's locked files, or the online page's data), else in this browser. The next sign-in puts the latest month back
// in Build by itself. WFM team › Import lists them by month: load a month into Build, move a file to another month, replace
// it with a newer one, or delete it. A file taken out of Build (or replaced by a newer export of its kind) is deleted with it.
// Two records per file: upmeta/<id> (name, month, kind, who, when: small, for the list) and upfile/<id> (the bytes).
const UP = { list: [], loaded: false, restored: false, watching: false, cache: new Map(), month: '', confirm: '', err: '' };
const UP_MAX_ONLINE = 1.5 * 1024 * 1024;   // the online page's data keeps smaller records than a data folder
const upMode = () => (state.db && !state.db.local ? 'db' : 'idb');
const upNewId = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// ---- this browser (no shared data, or "this computer only"): IndexedDB, which takes files of any size
let upIdbP = null;
function upIdb() {
  if (!upIdbP) upIdbP = new Promise((res, rej) => { const r = indexedDB.open('mc-uploads', 1); r.onupgradeneeded = () => { r.result.createObjectStore('meta', { keyPath: 'id' }); r.result.createObjectStore('file'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return upIdbP;
}
async function upIdbDo(store, mode, fn) { const db = await upIdb(); return new Promise((res, rej) => { const t = db.transaction(store, mode), s = t.objectStore(store), q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); }
// ---- the four calls: put, list, bytes, delete
async function upPut(meta, bytes) {
  if (upMode() === 'idb') { await upIdbDo('file', 'readwrite', s => s.put(bytes, meta.id)); await upIdbDo('meta', 'readwrite', s => s.put(meta)); return; }
  if (!state.db.folder && bytes.length > UP_MAX_ONLINE) throw Object.assign(new Error('too big'), { code: 'too-big' });
  await state.db.doc('upfile/' + meta.id).set({ id: meta.id, b64: FolderStore.b64e(bytes) });
  await state.db.doc('upmeta/' + meta.id).set(meta);
}
async function upListNow() {
  if (upMode() === 'idb') return (await upIdbDo('meta', 'readonly', s => s.getAll())) || [];
  const sn = await state.db.collection('upmeta').get(); return sn.docs.map(d => d.data()).filter(m => m && m.id && m.k);
}
async function upBytes(id) {
  const c = UP.cache.get(id); if (c) return c;
  let b = null;
  if (upMode() === 'idb') { const x = await upIdbDo('file', 'readonly', s => s.get(id)); b = x ? new Uint8Array(x) : null; }
  else { const sn = await state.db.doc('upfile/' + id).get(); b = sn.exists && sn.data().b64 ? FolderStore.b64d(sn.data().b64) : null; }
  if (b) UP.cache.set(id, b); return b;
}
async function upDel(id) {
  if (upMode() === 'idb') { await upIdbDo('meta', 'readwrite', s => s.delete(id)); await upIdbDo('file', 'readwrite', s => s.delete(id)); }
  else { await state.db.doc('upmeta/' + id).delete().catch(() => {}); await state.db.doc('upfile/' + id).delete().catch(() => {}); }
}
async function upRefresh() { try { UP.list = await upListNow(); UP.err = ''; } catch (e) { UP.err = errText(e); } UP.loaded = true; renderUploads(); }
/** the list, live: another analyst's upload shows here too (the data folder is read again every few seconds) */
function upWatch() {
  if (UP.watching || !isBuilder()) return; UP.watching = true;
  if (upMode() === 'db') { try { state.db.collection('upmeta').onSnapshot(sn => { UP.list = sn.docs.map(d => d.data()).filter(m => m && m.id && m.k); UP.loaded = true; renderUploads(); }, () => upRefresh()); return; } catch (e) { /* read once */ } }
  upRefresh();
}
// ---- which saved files Build uses now
const upInBuild = () => new Set([...Object.values(state.slots).map(v => v && v.upId), ...state.attFiles.map(f => f.upId)].filter(Boolean));
const upKindsOf = fid => Object.entries(state.slots).filter(([, v]) => v && v.fid === fid).map(([k]) => k);
/** after a drop: each new export or attendance sheet is kept; a saved file nothing in Build uses any more is deleted */
async function upAfterDrop(items, before) {
  if (!isBuilder()) return;
  upWatch();
  const k = monthKey(), who = whoNow();
  for (const it of items) {
    const kinds = upKindsOf(it.fid), att = state.attFiles.find(f => f.fid === it.fid);
    if (!kinds.length && !att) continue;
    const old = it.file && it.file.__up;
    if (old) { kinds.forEach(x => { state.slots[x].upId = old.id; }); if (att) att.upId = old.id; continue; }   // put back from the saved files
    const meta = { id: upNewId(), k, name: it.name, size: it.size, type: (it.file && it.file.type) || '', kinds, att: !!att, at: new Date().toISOString(), by: who };
    kinds.forEach(x => { state.slots[x].upId = meta.id; }); if (att) att.upId = meta.id;
    try { const bytes = new Uint8Array(await it.file.arrayBuffer()); UP.cache.set(meta.id, bytes); await upPut(meta, bytes); UP.list = UP.list.filter(m => m.id !== meta.id).concat(meta); }
    catch (e) { UP.err = e && e.code === 'too-big' ? `${it.name} is too big to keep in the online page's data; it stays in Build until you close the page.` : `${it.name} could not be kept (${errText(e)}).`; kinds.forEach(x => { delete state.slots[x].upId; }); if (att) delete att.upId; }
  }
  await upPrune(before);
  renderUploads();
}
/** saved files that Build stopped using (taken out, or replaced by a newer export of the same kind) are deleted */
async function upPrune(before) {
  const now = upInBuild(), gone = [...before].filter(id => !now.has(id));
  UP.gone = UP.gone || new Map();
  for (const id of gone) { const m = UP.list.find(x => x.id === id); if (m) UP.gone.set(id, m); try { await upDel(id); } catch (e) { /* the list shows it still */ } UP.list = UP.list.filter(x => x.id !== id); }
  if (gone.length) renderUploads();
}
/** an Undo puts a file back in Build: its saved copy comes back too */
async function upPutBack(upId) {
  const m = upId && (UP.list.find(x => x.id === upId) || UP.gone && UP.gone.get(upId)), b = upId && UP.cache.get(upId);
  if (!m || !b || UP.list.some(x => x.id === upId)) return;
  try { await upPut(m, b); UP.list = UP.list.concat(m); renderUploads(); } catch (e) { /* stays in Build */ }
}
/** a month's saved files, read into Build in place of what is there (those files stay saved under their own month) */
async function upLoadMonth(k, how) {
  const M = UP.list.filter(m => m.k === k); if (!M.length) return;
  const files = [];
  for (const m of M) { const b = await upBytes(m.id).catch(() => null); if (!b) continue; const f = new File([b], m.name, { type: m.type || '' }); f.__up = m; files.push(f); }
  if (!files.length) { toast(`The saved files of ${ymLabel(k)} could not be read.`); return; }
  state.slots = {}; state.attFiles = [];
  const [y, m] = k.split('-').map(Number); state.y = y; state.m = m;
  await addFiles(files, { restore: true });
  if (monthKey() !== k) { state.y = y; state.m = m; refresh(); }
  impLogAdd('read', `${how === 'auto' ? 'Put back' : 'Loaded'} ${ymLabel(k)} from the saved uploads: ${plural(files.length, 'file')}`);
  toast(how === 'auto' ? `${ymLabel(k)} is back in Build: ${plural(files.length, 'saved file')}, as you left it.` : `${ymLabel(k)} loaded into Build: ${plural(files.length, 'file')}.`);
}
/** the first visit after a sign-in: the latest month goes back in Build by itself (only when Build is empty) */
async function upRestore() {
  if (UP.restored || !isBuilder() || !state.rosterReady) return;
  UP.restored = true; upWatch();
  if (!UP.loaded) await upRefresh();
  if (Object.keys(state.slots).length || state.attFiles.length || state.pending.length || !UP.list.length) return;
  const last = UP.list.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
  await upLoadMonth(last.k, 'auto');
}
// ---- the list on Import: by month, with load, change month, replace and delete
const upKindLabel = m => [...(m.kinds || []).map(x => (KIND_BY[x] || {}).title || x), ...(m.att ? ['Attendance sheet'] : [])].join(' · ') || 'File';
function renderUploads() {
  const el = $('upCard'); if (!el) return;
  if (!isBuilder() || (!UP.list.length && !UP.err)) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const months = [...new Set(UP.list.map(m => m.k))].sort().reverse(), sel = months.includes(UP.month) ? UP.month : '', inB = upInBuild();
  const shown = sel ? [sel] : months, mopts = k => { const [y, m] = k.split('-').map(Number), L = []; for (let i = -6; i <= 2; i++) { const d = new Date(y, m - 1 + i, 1); L.push(ymKey(d.getFullYear(), d.getMonth() + 1)); } return [...new Set([...L, ...months])].sort(); };
  const row = m => `<li><span class="upn"><b dir="auto">${esc(m.name)}</b><small>${esc(upKindLabel(m))} · ${esc(fmtSize(m.size || 0))} · ${esc(m.by || 'someone')}, ${esc(fmtWhen(m.at))}</small></span>
    <span class="upa"><label class="sr" for="upk-${esc(m.id)}">Month of ${esc(m.name)}</label><select class="cell" id="upk-${esc(m.id)}" data-upk="${esc(m.id)}" aria-label="Month of ${esc(m.name)}">${mopts(m.k).map(k => `<option value="${k}"${k === m.k ? ' selected' : ''}>${esc(ymLabel(k))}</option>`).join('')}</select>
    <button class="btn sm" data-uprep="${esc(m.id)}">Replace</button><button class="btn sm ${UP.confirm === m.id ? 'danger' : 'ghost'}" data-updel="${esc(m.id)}">${UP.confirm === m.id ? 'Delete it?' : 'Delete'}</button></span></li>`;
  el.innerHTML = `<div class="cardhead"><div><h2 id="h-up">Saved uploads</h2><p class="cap">Every export and attendance sheet you drop is kept ${state.db && state.db.folder ? `in the data folder ${esc(state.db.name)}, locked like the rest of the data` : upMode() === 'db' ? 'with the shared data' : 'in this browser'}, so the month is still here after you sign out. Taking a file out of Build deletes it here too.</p></div>
    <label class="wsfield"><span>Month</span><select class="cell" data-upmonth aria-label="Show the uploads of"><option value="">All months · ${UP.list.length}</option>${months.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(ymLabel(k))} · ${UP.list.filter(m => m.k === k).length}</option>`).join('')}</select></label></div>
    ${UP.err ? `<p class="banner warn">${esc(UP.err)}</p>` : ''}
    ${shown.map(k => { const L = UP.list.filter(m => m.k === k).sort((a, b) => String(a.name).localeCompare(String(b.name))), here = L.some(m => inB.has(m.id));
      return `<section class="upmonth" aria-label="${esc(ymLabel(k))}"><div class="uph"><b>${esc(ymLabel(k))}</b><small>${plural(L.length, 'file')}${here ? ' · in Build now' : ''}</small>${here ? '' : `<button class="btn sm" data-upload="${k}">Load into Build</button>`}</div><ul class="uplist">${L.map(row).join('')}</ul></section>`; }).join('')}
    <input type="file" id="upRepPick" accept=".csv,.txt,.xlsx,.xlsm,.xlsb" hidden>`;
}
$('upCard').addEventListener('change', async e => {
  const t = e.target;
  if (t.matches('[data-upmonth]')) { UP.month = t.value; renderUploads(); return; }
  if (t.matches('[data-upk]')) {   // the file belongs to another month
    const m = UP.list.find(x => x.id === t.dataset.upk); if (!m || t.value === m.k) return;
    const was = m.k, nm = { ...m, k: t.value, moved: new Date().toISOString(), movedBy: whoNow() };
    try {
      if (upMode() === 'idb') await upIdbDo('meta', 'readwrite', s => s.put(nm)); else await state.db.doc('upmeta/' + m.id).set(nm);
      UP.list = UP.list.map(x => (x.id === m.id ? nm : x));
      // in Build now, for another month than Build's: it leaves Build (it stays saved under its own month)
      let left = false; if (nm.k !== monthKey()) { for (const [k, v] of Object.entries(state.slots)) if (v && v.upId === m.id) { delete state.slots[k]; left = true; } const n = state.attFiles.length; state.attFiles = state.attFiles.filter(f => f.upId !== m.id); left = left || n !== state.attFiles.length; }
      if (left) { impLogAdd('removed', `${m.name} moved to ${ymLabel(nm.k)}: out of Build, still saved`); refresh(); }
      toast(`${m.name} moved from ${ymLabel(was)} to ${ymLabel(nm.k)}${left ? '; it left Build, which holds ' + ymLabel(monthKey()) : ''}`);
    } catch (er) { toast(`Could not move ${m.name} (${errText(er)})`); }
    renderUploads(); return;
  }
  if (t.id === 'upRepPick' && t.files && t.files[0]) {   // a newer file in place of a saved one
    const m = UP.list.find(x => x.id === UP.replacing), f = t.files[0]; t.value = ''; if (!m) return;
    const bytes = new Uint8Array(await f.arrayBuffer()), nm = { ...m, name: f.name, size: f.size, type: f.type || '', at: new Date().toISOString(), by: whoNow(), replaced: m.name };
    try { await upPut(nm, bytes); UP.cache.set(m.id, bytes); UP.list = UP.list.map(x => (x.id === m.id ? nm : x)); toast(`${m.name} replaced by ${f.name}`); if (upInBuild().has(m.id)) await upLoadMonth(nm.k, 'replace'); }
    catch (er) { toast(`Could not replace ${m.name} (${errText(er)})`); }
    renderUploads();
  }
});
$('upCard').addEventListener('click', async e => {
  const t = e.target;
  const ld = t.closest('[data-upload]'); if (ld) { ld.disabled = true; await upLoadMonth(ld.dataset.upload, 'load'); renderUploads(); return; }
  const rp = t.closest('[data-uprep]'); if (rp) { UP.replacing = rp.dataset.uprep; $('upRepPick').click(); return; }
  const dl = t.closest('[data-updel]'); if (!dl) return;
  const id = dl.dataset.updel, m = UP.list.find(x => x.id === id); if (!m) return;
  if (UP.confirm !== id) { UP.confirm = id; renderUploads(); const b = $('upCard').querySelector(`[data-updel="${CSS.escape(id)}"]`); if (b) b.focus(); return; }
  UP.confirm = '';
  try { await upDel(id); } catch (er) { toast(`Could not delete ${m.name} (${errText(er)})`); return; }
  UP.list = UP.list.filter(x => x.id !== id);
  // in Build now: it leaves Build as well
  let left = false; for (const [k, v] of Object.entries(state.slots)) if (v && v.upId === id) { delete state.slots[k]; left = true; }
  const n = state.attFiles.length; state.attFiles = state.attFiles.filter(f => f.upId !== id); left = left || n !== state.attFiles.length;
  if (left) { impLogAdd('removed', `Deleted ${m.name} from the saved uploads and from Build`); refresh(); }
  toast(`Deleted ${m.name}${left ? ', and took it out of Build' : ''}`); renderUploads();
});
