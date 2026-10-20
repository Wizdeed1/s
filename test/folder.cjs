// The shared data folder, end to end, with a folder the browser keeps for the page standing in for MC Data: set it up, the first
// account (the admin), drop the month's exports (each kept as a locked file), build the workbook (a plain copy in MC Data ›
// MC Reports), then a reload and sign-in again: the month is back in Build by itself.
// Usage: node test/folder.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0)), fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  // the folder picker answers with a folder of the browser's own (the origin private file system), named MC Data
  await ctx.addInitScript(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  // what is in the folder, read from the page: { 'upmeta': [names], ... } and the first bytes of a file
  const tree = () => p.evaluate(async () => { const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data'), o = {}; for await (const [n, h] of root.entries()) if (h.kind === 'directory') { o[n] = []; for await (const [m] of h.entries()) o[n].push(m); } return o; });
  const head = (dir, name) => p.evaluate(async ([d, n]) => { const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data'), f = await (await (await root.getDirectoryHandle(d)).getFileHandle(n)).getFile(); return { size: f.size, head: new TextDecoder().decode(new Uint8Array(await f.slice(0, 4).arrayBuffer())) }; }, [dir, name]);
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]');
  await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Tq7#mVx2!pLr';
  await p.fill('#acName', 'Sara Khalid'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  ok(await p.evaluate(() => !!(window.__mc.state.db && window.__mc.state.db.folder)), 'the data folder is set up and the first account is in');
  // a roster (the synthetic one), written the way the tool keeps it
  await p.evaluate(async fx => { eval(fx); const db = window.__mc.state.db; let i = 0; for (const r of window.__FIX__.roster) await db.doc('roster/p' + i).set({ order: i++, ...r }); }, fixture);
  await p.waitForFunction(() => window.__mc.state.roster.length > 100, null, { timeout: 30000 });
  // the month's exports: each one kept, locked
  await p.evaluate(() => window.__mc.setStep('import'));
  const files = fs.readdirSync(exp).filter(f => /\.csv$/i.test(f) && !/^Book1/.test(f)).map(f => path.join(exp, f));
  await p.setInputFiles('#picker', files);
  await p.waitForFunction(() => Object.keys(window.__mc.state.slots).length >= 4 && !window.__mc.state.pending.length, null, { timeout: 60000 });
  await p.waitForFunction(() => document.querySelectorAll('#upCard .uplist li').length >= 4, null, { timeout: 30000 });
  let t = await tree();
  const um = (t.upmeta || []).filter(n => n.endsWith('.mcd')), uf = (t.upfile || []).filter(n => n.endsWith('.mcd'));
  ok(um.length === 4 && uf.length === 4, `four exports kept in the folder: upmeta ${um.length}, upfile ${uf.length} locked files`);
  const h1 = uf.length ? await head('upfile', uf[0]) : {};
  ok(h1.head === 'MCD1', `the kept files are locked (they start with ${JSON.stringify(h1.head)}, not the export's text)`);
  // build: the dialog offers the copy in MC Reports; the copy is a plain Excel file
  await p.evaluate(() => window.__mc.setStep('export')); await p.waitForTimeout(300);
  await p.click('#build'); await p.waitForSelector('#buildKeep', { timeout: 5000 });
  ok(await p.isChecked('#buildKeep'), 'the build dialog keeps a copy in MC Data › MC Reports (on by default)');
  await p.screenshot({ path: path.join(out, 'folder-build-dialog.png') });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#buildGo')]);
  await p.waitForTimeout(1500);
  t = await tree();
  const rep = (t['MC Reports'] || []).find(n => /^MC Monthly Report - .*\.xlsx$/.test(n));
  const h2 = rep ? await head('MC Reports', rep) : {};
  ok(rep && h2.head.startsWith('PK') && h2.size > 5000, `${dl.suggestedFilename()} downloaded, and a copy in MC Reports: ${rep} (${h2.size} bytes, a plain Excel file)`);
  ok(await p.evaluate(() => /MC Reports/.test(document.getElementById('success').textContent)), 'the result says where the copy is');
  await p.screenshot({ path: path.join(out, 'folder-built.png') });
  // a reload: the remembered folder, sign in again, the month back in Build
  await p.goto(URL);
  // the same browser tab: "Welcome back" asks the password only (a new tab would ask the username too)
  await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')) || v(document.querySelector('[data-conn="again"]')); }, null, { timeout: 30000 });
  if (await p.isVisible('[data-conn="again"]').catch(() => false)) { await p.click('[data-conn="again"]'); await p.waitForFunction(() => document.getElementById('pwCur').offsetParent !== null, null, { timeout: 30000 }); }
  if (await p.isVisible('#acEmail')) await p.fill('#acEmail', 'sara.k');
  await p.fill('#pwCur', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  await p.waitForFunction(() => Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 60000 }).catch(() => {});
  const back = await p.evaluate(() => Object.values(window.__mc.state.slots).filter(v => v && v.upId).length);
  ok(back === 4, `signed in again: the four exports are back in Build by themselves (${back})`);
  await p.screenshot({ path: path.join(out, 'folder-restored.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
