// ================================================================ DATA: everything the tool keeps, out to one locked file and back (WFM team only)
// Export: every record of the shared data (or of this browser), opened with the team's key, then locked again with a password chosen
// here (PBKDF2 + AES-GCM), in one .mcbak file. Accounts, passwords and keys never go in it: everyone keeps their own sign-in.
// Import: the file and its password, a look at what is in it, then every record written back (the same records are replaced).
Object.assign(state, { bkFiles: false, bkIn: null, bkBusy: '' });
const canBackup = () => hasRole('admin', 'wfm', 'user');
const BK_SKIP = new Set(['accounts', 'meta', 'akeys', 'dir']), BK_FILES = new Set(['upmeta', 'upfile', 'repmeta', 'repfile']);
const BK_ITER = 250000;
const bkB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const bkUnB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function bkPipe(u8, ts) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(ts)).arrayBuffer()); }
async function bkKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: BK_ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
/** the records to export: everything but the sign-in and the keys, and the kept files only when asked */
async function bkRecords() {
  if (!state.db || typeof state.db.dump !== 'function') throw new Error('this view keeps no data the tool can export');
  return state.db.dump(c => BK_SKIP.has(c) || (!state.bkFiles && BK_FILES.has(c)));
}
async function bkExport() {
  const pw = $('bkPw').value, pw2 = $('bkPw2').value;
  if (pw.length < 8) { toast('Choose a password of at least 8 characters for the file.'); $('bkPw').focus(); return; }
  if (pw !== pw2) { toast('The two passwords are not the same.'); $('bkPw2').focus(); return; }
  state.bkBusy = 'export'; renderBackupWs();
  try {
    const { records, bad } = await bkRecords();
    const made = new Date().toISOString(), plain = new TextEncoder().encode(JSON.stringify({ app: 'mc-report-builder', v: 1, made, by: whoNow(), from: state.folder ? state.folder.name : 'this browser', records }));
    const gz = typeof CompressionStream === 'function', body = gz ? await bkPipe(plain, new CompressionStream('gzip')) : plain;
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await bkKey(pw, salt);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, body));
    const file = { kind: 'mc-backup', v: 1, made, by: whoNow(), n: records.length, gz, kdf: { name: 'PBKDF2-SHA256', iter: BK_ITER, salt: bkB64(salt) }, iv: bkB64(iv), data: bkB64(ct) };
    const ok = await save(`MC Data backup - ${made.slice(0, 10)}.mcbak`, new Blob([JSON.stringify(file)], { type: 'application/octet-stream' }));
    if (ok) { $('bkPw').value = ''; $('bkPw2').value = ''; }
    if (bad.length) toast(`${plural(bad.length, 'record')} could not be read and ${bad.length === 1 ? 'is' : 'are'} not in the file (${bad.slice(0, 2).map(b => b.path).join(', ')}).`);
  } catch (e) { toast('Could not export the data: ' + errText(e)); }
  finally { state.bkBusy = ''; renderBackupWs(); }
}
/** a chosen backup file, opened with its password: what is in it, before anything is written */
async function bkOpen() {
  const f = $('bkFile').files && $('bkFile').files[0], pw = $('bkInPw').value;
  if (!f) { toast('Choose the .mcbak file first.'); return; }
  if (!pw) { toast('Type the password the file was locked with.'); $('bkInPw').focus(); return; }
  state.bkBusy = 'open'; renderBackupWs();
  try {
    let file; try { file = JSON.parse(await f.text()); } catch (e) { file = null; }
    if (!file || file.kind !== 'mc-backup' || !file.data || !file.kdf) throw new Error(`${f.name} is not a backup made by this tool`);
    let plain;
    try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bkUnB64(file.iv) }, await bkKey(pw, bkUnB64(file.kdf.salt)), bkUnB64(file.data))); }
    catch (e) { throw new Error('the password is not the one this file was locked with'); }
    if (file.gz) plain = await bkPipe(plain, new DecompressionStream('gzip'));
    const d = JSON.parse(new TextDecoder().decode(plain)), recs = (d.records || []).filter(r => r && typeof r.path === 'string' && r.path.split('/').length % 2 === 0 && !BK_SKIP.has(r.path.split('/')[0]));
    const by = {}; for (const r of recs) { const c = r.path.split('/')[0]; by[c] = (by[c] || 0) + 1; }
    state.bkIn = { name: f.name, made: d.made || file.made, by: d.by || file.by || '', from: d.from || '', recs, cols: Object.entries(by).sort((a, b) => b[1] - a[1]) };
    $('bkInPw').value = '';
  } catch (e) { state.bkIn = null; toast('Could not open the file: ' + errText(e)); }
  finally { state.bkBusy = ''; renderBackupWs(); }
}
async function bkImport() {
  const B = state.bkIn; if (!B) return;
  if (!state.db) { toast('There is no data store open to import into.'); return; }
  state.bkBusy = 'import'; renderBackupWs();
  let done = 0, failed = 0, i = 0;
  const run = async () => { while (i < B.recs.length) { const r = B.recs[i++]; try { await state.db.doc(r.path).set(r.body); done++; } catch (e) { failed++; } if ((done + failed) % 25 === 0) { const el = $('bkProg'); if (el) el.textContent = `${done + failed} of ${B.recs.length}…`; } } };
  try { await Promise.all([run(), run(), run(), run()]); }
  finally {
    state.bkBusy = ''; state.bkIn = null; renderBackupWs();
    toast(`Imported ${plural(done, 'record')}${failed ? `; ${failed} could not be written (only an admin can write some of them)` : ''}. Reload to see everything.`, { label: 'Reload', fn: () => location.reload() });
  }
}
/** WFM team › Data */
function renderBackupWs() {
  const body = $('wfmBody'); if (!body || state.ws !== 'wfm' || state.wfmTab !== 'data') return;
  $('wfmBar').innerHTML = '<div class="wsacts"></div>';
  if (!canBackup()) { body.innerHTML = emptyCard('Only the WFM team', 'The WFM manager and the WFM analysts export and import the data.'); return; }
  const B = state.bkIn, busy = state.bkBusy, where = state.folder ? `the shared data folder (${esc(state.folder.name)})` : 'this browser';
  const dumpOk = state.db && typeof state.db.dump === 'function';
  body.innerHTML = `<div class="bkgrid">
    <section class="card bkcard"><h2>Export all data</h2><p class="cap">Everything the tool keeps in ${where}: the roster, the months and their results, the forms, the rules, the settings, the emails and the rest, in one file locked with a password you choose here. Accounts, passwords and keys are not in it: everyone keeps their own sign-in.</p>
      ${dumpOk ? `<div class="grid2 tight"><label class="field"><span class="lbl">Password for the file</span><input class="cell" type="password" id="bkPw" autocomplete="new-password" placeholder="At least 8 characters"></label><label class="field"><span class="lbl">The password again</span><input class="cell" type="password" id="bkPw2" autocomplete="new-password"></label></div>
      <label class="check"><input type="checkbox" id="bkFiles"${state.bkFiles ? ' checked' : ''}> Also the files kept with the tool (Uploads and Saved workbooks): a much bigger file</label>
      <p class="hint">Keep the password safe: without it nobody can open the file, you included.</p>
      <div class="acts"><button class="btn primary" id="bkGo"${busy ? ' disabled' : ''}>${busy === 'export' ? '<span class="spin" aria-hidden="true"></span>Exporting…' : '<svg width="16" height="16" aria-hidden="true"><use href="#i-down"/></svg>Export all data'}</button></div>` : '<p class="subtle">This view keeps no data the tool can export.</p>'}</section>
    <section class="card bkcard"><h2>Import data</h2><p class="cap">A file from Export all data, into ${where}. The records in the file replace the same records here; nothing else is removed.</p>
      ${B ? `<div class="bkinfo"><b dir="auto">${esc(B.name)}</b><span>Made ${esc(fmtWhen(B.made))}${B.by ? ` by ${esc(B.by)}` : ''}${B.from ? ` from ${esc(B.from)}` : ''} · ${plural(B.recs.length, 'record')}</span>
          <ul class="ilist">${B.cols.slice(0, 12).map(([c, n]) => `<li><span class="nm">${esc(c)}</span><span class="sg">${plural(n, 'record')}</span></li>`).join('')}${B.cols.length > 12 ? `<li class="subtle">and ${B.cols.length - 12} more kinds</li>` : ''}</ul></div>
        <div class="acts"><button class="btn" id="bkCancel"${busy ? ' disabled' : ''}>Cancel</button><button class="btn primary" id="bkImport"${busy ? ' disabled' : ''}>${busy === 'import' ? '<span class="spin" aria-hidden="true"></span>Importing <span id="bkProg"></span>' : `Import ${plural(B.recs.length, 'record')}`}</button></div>`
      : `<div class="grid2 tight"><label class="field"><span class="lbl">The .mcbak file</span><input class="cell" type="file" id="bkFile" accept=".mcbak,application/octet-stream"></label><label class="field"><span class="lbl">Its password</span><input class="cell" type="password" id="bkInPw" autocomplete="off"></label></div>
        <div class="acts"><button class="btn" id="bkOpen"${busy ? ' disabled' : ''}>${busy === 'open' ? '<span class="spin" aria-hidden="true"></span>Opening…' : 'Open the file'}</button></div>`}</section></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#bkGo, #bkOpen, #bkImport, #bkCancel'); if (!t || !canBackup()) return;
  if (t.id === 'bkGo') bkExport(); else if (t.id === 'bkOpen') bkOpen(); else if (t.id === 'bkImport') bkImport(); else { state.bkIn = null; renderBackupWs(); }
});
document.addEventListener('change', e => { if (e.target && e.target.id === 'bkFiles') state.bkFiles = e.target.checked; });
