// The shared data folder when it is slow or out of reach, and WFM team › Data, with a folder the browser keeps for the page
// standing in for MC Data and the synthetic roster:
// 1. The folder picker cancelled: the screen says no folder was opened (it used to stay as it was, as if stuck).
// 2. The folder set up, the first account (the admin), the roster.
// 3. WFM team › Data: Export all data, locked with a password (opened here in Node: the records, and no accounts or keys);
//    a roster record deleted, then Import with a wrong password (refused) and the right one (the record is back); the file is
//    locked at 600 000 rounds, a file from before (250 000) still opens and imports, and a made-up round count is refused.
// 3b. Signed in again on a slowish folder: "Reading the shared data… N files" at the top of the page until it is all in.
// 4. A slow folder: "Opening the shared data" with the seconds, the OneDrive hint after 10 s, then the sign-in.
// 5. A folder that does not answer at all: after 20 s, what to check and Open the shared data again.
// 6. The data folder chosen while its files cannot be read yet: an error, never "set it up here".
// 7. Open the shared data while the browser's question goes unanswered: what to answer and where; choosing the folder again opens it.
// 8. The browser's question answered no: it says so, and Open the shared data stays.
// Usage: node test/datafolder.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const { webcrypto } = require('node:crypto');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0)), fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
/** a .mcbak file opened the way the tool does: PBKDF2-SHA256, AES-GCM, gzip */
async function openBackup(file, pw) {
  const b = s => Uint8Array.from(Buffer.from(s, 'base64'));
  const base = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b(file.kdf.salt), iterations: file.kdf.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: b(file.iv) }, key, b(file.data)));
  return JSON.parse((file.gz ? zlib.gunzipSync(plain) : plain).toString('utf8'));
}
/** a .mcbak file locked the way a given version of the tool did (to check that older files still open) */
async function lockBackup(D, pw, iter, like) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12)), b = u8 => Buffer.from(u8).toString('base64');
  const base = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, zlib.gzipSync(Buffer.from(JSON.stringify(D)))));
  return { ...like, gz: true, kdf: { name: 'PBKDF2-SHA256', iter, salt: b(salt) }, iv: b(iv), data: b(ct) };
}
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  // the folder picker answers with a folder of the browser's own named MC Data; switches kept in the tab (sessionStorage):
  // t-pick=abort cancels the picker, t-slow=ms makes every folder and file lookup wait, t-unread makes the data folder's mark unreadable,
  // t-ask=hang|deny: the remembered folder needs allowing again, and the browser's question is never answered, or answered no
  await ctx.addInitScript(() => {
    const opt = k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
    window.showDirectoryPicker = async () => {
      if (opt('t-pick') === 'abort') throw new DOMException('The user aborted a request.', 'AbortError');
      return (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true });
    };
    const ms = +opt('t-slow');
    if (ms) { const P = FileSystemDirectoryHandle.prototype; for (const n of ['getDirectoryHandle', 'getFileHandle']) { const f = P[n]; P[n] = async function (...a) { await new Promise(r => setTimeout(r, ms)); return f.apply(this, a); }; } }
    if (opt('t-unread')) { const F = FileSystemFileHandle.prototype, g = F.getFile; F.getFile = async function () { if (this.name === 'd_store.json') throw new DOMException('The file could not be read.', 'NotReadableError'); return g.call(this); }; }
    const ask = opt('t-ask');
    if (ask) { const P = FileSystemDirectoryHandle.prototype; P.queryPermission = async () => 'prompt'; P.requestPermission = ask === 'deny' ? async () => 'denied' : () => new Promise(() => {}); }
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const flags = o => p.evaluate(f => { for (const [k, v] of Object.entries(f)) { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } }, o);
  const lock = () => p.evaluate(() => ({ title: document.getElementById('lockTitle').textContent, err: document.getElementById('lockErr').textContent, btns: [...document.querySelectorAll('#lockConnect [data-conn]')].map(x => x.dataset.conn), wait: (document.getElementById('connWait') || {}).textContent || '', help: (() => { const h = document.getElementById('connHelp'); return h && !h.hidden ? h.textContent : ''; })() }));
  // ---- 1. the picker cancelled
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await flags({ 't-pick': 'abort' });
  await p.click('[data-conn="pick"]'); await p.waitForFunction(() => /No folder was opened/.test(document.getElementById('lockErr').textContent), null, { timeout: 5000 }).catch(() => {});
  let L = await lock();
  ok(/No folder was opened/.test(L.err) && L.btns.includes('pick'), `the picker cancelled: "${L.err.slice(0, 60)}…", and Choose the data folder again`);
  await p.screenshot({ path: path.join(out, 'folder-cancelled.png') });
  // ---- 2. the folder, the admin, the roster
  await flags({ 't-pick': '' });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]'); await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Tq7#mVx2!pLr';
  await p.fill('#acName', 'Sara K.'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  await p.evaluate(async fx => { eval(fx); const db = window.__mc.state.db; let i = 0; for (const r of window.__FIX__.roster) await db.doc('roster/p' + i).set({ order: i++, ...r }); }, fixture);
  await p.waitForFunction(() => window.__mc.state.roster.length > 100, null, { timeout: 30000 });
  const nRoster = await p.evaluate(() => window.__mc.state.roster.length), name0 = await p.evaluate(() => window.__mc.state.roster.find(x => x._id === 'p0').name);
  // ---- 3. WFM team › Data
  await p.evaluate(() => window.__mc.setWs('wfm')); await p.waitForSelector('#wfmTabs [data-wt="data"]', { timeout: 10000 });
  await p.click('#wfmTabs [data-wt="data"]'); await p.waitForSelector('#bkGo', { timeout: 10000 });
  await p.fill('#bkPw', 'short'); await p.fill('#bkPw2', 'short'); await p.click('#bkGo');
  ok(/at least 8 characters/.test(await p.textContent('#toastMsg')), 'a password shorter than 8 characters is refused');
  const bpw = 'Backup-2026-pass';
  await p.fill('#bkPw', bpw); await p.fill('#bkPw2', bpw);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#bkGo')]);
  const bk = path.join(out, dl.suggestedFilename()); await dl.saveAs(bk);
  await p.screenshot({ path: path.join(out, 'data-tab.png') });
  const raw = fs.readFileSync(bk, 'utf8'), file = JSON.parse(raw);
  ok(/^MC Data backup - \d{4}-\d{2}-\d{2}\.mcbak$/.test(dl.suggestedFilename()) && file.kind === 'mc-backup' && !raw.includes(name0), `${dl.suggestedFilename()}: locked (no name from the roster in it as text)`);
  const D = await openBackup(file, bpw), paths = D.records.map(r => r.path), tops = [...new Set(paths.map(x => x.split('/')[0]))];
  ok(paths.filter(x => x.startsWith('roster/')).length === nRoster && D.records.find(r => r.path === 'roster/p0').body.name === name0, `opened with its password: the ${nRoster} roster records are in it`);
  ok(!tops.some(t => ['accounts', 'meta', 'akeys', 'dir'].includes(t)), `no accounts, keys or folder settings in it (${tops.join(', ')})`);
  // a record deleted, then the file imported
  await p.evaluate(() => window.__mc.state.db.doc('roster/p0').delete());
  await p.waitForFunction(n => window.__mc.state.roster.length === n - 1, nRoster, { timeout: 15000 });
  await p.setInputFiles('#bkFile', bk); await p.fill('#bkInPw', 'not-the-password'); await p.click('#bkOpen');
  await p.waitForFunction(() => /password is not the one/.test(document.getElementById('toastMsg').textContent), null, { timeout: 30000 }).catch(() => {});
  ok(/password is not the one/.test(await p.textContent('#toastMsg')) && !(await p.$('#bkImport')), 'a wrong password: the file does not open');
  await p.setInputFiles('#bkFile', bk); await p.fill('#bkInPw', bpw); await p.click('#bkOpen');
  await p.waitForSelector('#bkImport', { timeout: 30000 });
  const info = await p.textContent('.bkinfo');
  ok(/roster/.test(info) && new RegExp(`${nRoster} records`).test(info.replace(/\s+/g, ' ')), `before importing, what is in the file: ${info.replace(/\s+/g, ' ').trim().slice(0, 110)}…`);
  await p.screenshot({ path: path.join(out, 'data-import.png') });
  await p.click('#bkImport');
  await p.waitForFunction(() => /^Imported/.test(document.getElementById('toastMsg').textContent), null, { timeout: 60000 });
  const back = await p.evaluate(async () => { const s = await window.__mc.state.db.doc('roster/p0').get(); return s.exists ? s.data().name : ''; });
  ok(back === name0 && /Imported \d+ records/.test(await p.textContent('#toastMsg')), `Import: the deleted record is back (${await p.textContent('#toastMsg')})`);
  ok(file.kdf.name === 'PBKDF2-SHA256' && file.kdf.iter === 600000, `the file is locked with ${file.kdf.name} at ${file.kdf.iter} rounds`);
  // a file made before (250 000 rounds) still opens and imports; a round count no file of the tool has is refused
  const name1 = await p.evaluate(() => window.__mc.state.roster.find(x => x._id === 'p1').name), old = path.join(out, 'old.mcbak'), odd = path.join(out, 'odd.mcbak');
  fs.writeFileSync(old, JSON.stringify(await lockBackup(D, bpw, 250000, file))); fs.writeFileSync(odd, JSON.stringify({ ...file, kdf: { ...file.kdf, iter: 2e9 } }));
  await p.evaluate(() => window.__mc.state.db.doc('roster/p1').delete());
  await p.waitForFunction(n => window.__mc.state.roster.length === n - 1, nRoster, { timeout: 15000 });
  await p.setInputFiles('#bkFile', old); await p.fill('#bkInPw', bpw); await p.click('#bkOpen');
  await p.waitForSelector('#bkImport', { timeout: 30000 }); await p.evaluate(() => { document.getElementById('toastMsg').textContent = ''; }); await p.click('#bkImport');
  await p.waitForFunction(() => /^Imported/.test(document.getElementById('toastMsg').textContent), null, { timeout: 60000 });
  const back1 = await p.evaluate(async () => { const s = await window.__mc.state.db.doc('roster/p1').get(); return s.exists ? s.data().name : ''; });
  ok(back1 === name1, `a backup from before (250 000 rounds) opens and imports: the record is back (${back1 ? 'yes' : 'no'})`);
  await p.setInputFiles('#bkFile', odd); await p.fill('#bkInPw', bpw); await p.click('#bkOpen');
  await p.waitForFunction(() => /not a backup made by this tool/.test(document.getElementById('toastMsg').textContent), null, { timeout: 30000 }).catch(() => {});
  ok(/not a backup made by this tool/.test(await p.textContent('#toastMsg')) && !(await p.$('#bkImport')), 'a file with a made-up round count is refused at once');
  // ---- 3b. after the sign-in on a slowish folder: the page says it is still reading, then the pill goes
  await flags({ 't-slow': '150' });
  await p.goto(URL);
  await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')) || v(document.querySelector('[data-conn="again"]')); }, null, { timeout: 60000 });
  if (await p.isVisible('[data-conn="again"]').catch(() => false)) { await p.click('[data-conn="again"]'); await p.waitForFunction(() => document.getElementById('pwCur').offsetParent !== null, null, { timeout: 60000 }); }
  if (await p.isVisible('#acEmail')) await p.fill('#acEmail', 'sara.k');
  await p.fill('#pwCur', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden, null, { timeout: 60000 });
  await p.waitForFunction(() => !document.getElementById('busy').hidden, null, { timeout: 15000 }).catch(() => {});
  const pill = await p.evaluate(() => ({ on: !document.getElementById('busy').hidden, t: document.getElementById('busyMsg').textContent }));
  ok(pill.on && /^Reading the shared data…/.test(pill.t), `after the sign-in, while the files open: "${pill.t}"`);
  await p.screenshot({ path: path.join(out, 'reading-pill.png') });
  await p.waitForFunction(() => document.getElementById('busy').hidden && window.__mc.state.roster.length > 100, null, { timeout: 120000 }).catch(() => {});
  ok(await p.evaluate(() => document.getElementById('busy').hidden && window.__mc.state.roster.length > 100), 'then the pill goes, with the roster in');

  // ---- 4. a slow folder: the screen says what it waits for, with the seconds
  await flags({ 't-slow': '2500' });
  const t0 = Date.now(); await p.goto(URL);
  await p.waitForFunction(() => /Opening the shared data/.test(document.getElementById('lockTitle').textContent) && /\d+ s/.test((document.getElementById('connWait') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  L = await lock();
  ok(/Opening the shared data/.test(L.title) && /\d+ s$/.test(L.wait), `a slow folder: "${L.title}", "${L.wait}"`);
  await p.screenshot({ path: path.join(out, 'folder-opening.png') });
  await p.waitForFunction(() => { const h = document.getElementById('connHelp'); return h && !h.hidden; }, null, { timeout: 15000 }).catch(() => {});
  L = await lock();
  ok(/Always keep on this device/.test(L.help), `after 10 s, what may hold it up: "${L.help.slice(0, 70)}…"`);
  await p.screenshot({ path: path.join(out, 'folder-opening-help.png') });
  await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')); }, null, { timeout: 60000 }).catch(() => {});
  ok(await p.isVisible('#pwCur'), `then the sign-in, after ${Math.round((Date.now() - t0) / 1000)} s`);
  // ---- 5. a folder that does not answer
  await flags({ 't-slow': '25000' });
  await p.goto(URL);
  await p.waitForFunction(() => /not answering/.test(document.getElementById('lockErr').textContent), null, { timeout: 35000 }).catch(() => {});
  L = await lock();
  ok(/not answering/.test(L.err) && /Always keep on this device/.test(L.err) && L.btns.includes('again'), `no answer after 20 s: "${L.err.slice(0, 60)}…", and Open the shared data`);
  await p.screenshot({ path: path.join(out, 'folder-away.png') });
  // ---- 6. the data folder chosen while its files cannot be read yet
  await flags({ 't-slow': '', 't-unread': '1' });
  await p.evaluate(() => window.__mcRepick());
  await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]');
  await p.waitForFunction(() => /Could not read/.test(document.getElementById('lockErr').textContent), null, { timeout: 25000 }).catch(() => {});
  L = await lock();
  ok(/Could not read MC Data \(NotReadableError/.test(L.err) && !L.btns.includes('create') && !L.btns.includes('makesub'), `unreadable: "${L.err.slice(0, 70)}…", and nothing offers to set it up again (${L.btns.join(', ')})`);
  await p.screenshot({ path: path.join(out, 'folder-unreadable.png') });
  // ---- 7. the browser's question unanswered
  await flags({ 't-unread': '' });
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForFunction(() => document.getElementById('pwCur').offsetParent !== null || !!document.getElementById('acEmail').offsetParent, null, { timeout: 30000 });
  await flags({ 't-ask': 'hang' });
  await p.goto(URL); await p.waitForSelector('[data-conn="again"]', { timeout: 20000 });
  await p.click('[data-conn="again"]'); await p.waitForTimeout(300);
  L = await lock();
  ok(/Allow the shared data/.test(L.title) && /choose Allow/.test(L.wait) && /address bar/.test(L.help), `the browser's question unanswered: "${L.title}", "${L.wait.slice(0, 50)}…", "${L.help.slice(0, 50)}…"`);
  await p.screenshot({ path: path.join(out, 'folder-ask.png') });
  await p.click('#lockLinks [data-conn="pick"]');
  await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')); }, null, { timeout: 30000 }).catch(() => {});
  ok(await p.isVisible('#pwCur'), 'Choose a different folder, the data folder again: it opens, on to the sign-in');
  // ---- 8. the browser's question answered no
  await flags({ 't-ask': 'deny' });
  await p.goto(URL); await p.waitForSelector('[data-conn="again"]', { timeout: 20000 });
  await p.click('[data-conn="again"]'); await p.waitForFunction(() => /did not allow/.test(document.getElementById('lockErr').textContent), null, { timeout: 10000 }).catch(() => {});
  L = await lock();
  ok(/did not allow the folder/.test(L.err) && L.btns.includes('again'), `answered no: "${L.err.slice(0, 50)}…", and Open the shared data stays`);
  await flags({ 't-ask': '' });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
