// Security test, the shared folder: the accounts are plain files everyone with the folder can read and write, so nothing in
// them may give access. Two accounts are planted the way such a person could (a key pair of their own, then "builtIn": true,
// or "role": "admin"), and the admin signs in again: neither gets the team's data key or a role, neither shows as built in,
// and the team copy built-in admins are the real admins only (the roles the staff-only directory gives).
// Usage: node test/trust.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0));
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await ctx.addInitScript(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  // the folder and its first account, the admin
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]'); await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Tq7#mVx2!pLr';
  await p.fill('#acName', 'Sara Khalid'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  ok(await p.evaluate(() => !!(window.__mc.state.db && window.__mc.state.db.folder)), 'the data folder is set up and the admin is in');
  // two planted accounts: a key pair of their own, a made-up password record, and the field that used to be believed
  await p.evaluate(async () => {
    const db = window.__mc.state.db, kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['wrapKey', 'unwrapKey']);
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey)); let s = ''; for (const x of spki) s += String.fromCharCode(x);
    const base = { kind: 'other', pub: btoa(s), algo: 'PBKDF2-SHA256', iter: 600000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==', hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', createdAt: new Date().toISOString() };
    await db.doc('accounts/aevil1').set({ ...base, name: 'Planted Built-in', username: 'planted.b', builtIn: true });
    await db.doc('accounts/aevil2').set({ ...base, name: 'Planted Admin', username: 'planted.a', role: 'admin' });
  });
  // the admin opens the tool again: the session that hands out the data key
  await p.goto(URL);
  await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')) || v(document.querySelector('[data-conn="again"]')); }, null, { timeout: 30000 });
  if (await p.isVisible('[data-conn="again"]').catch(() => false)) { await p.click('[data-conn="again"]'); await p.waitForFunction(() => document.getElementById('pwCur').offsetParent !== null, null, { timeout: 30000 }); }
  if (await p.isVisible('#acEmail')) await p.fill('#acEmail', 'sara.k');
  await p.fill('#pwCur', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  await p.waitForTimeout(4000);   // the admin's session opens access for waiting staff 1.5 s after the sign-in
  const got = await p.evaluate(async () => {
    const db = window.__mc.state.db, o = {};
    for (const id of ['aevil1', 'aevil2']) { const a = (await db.doc('accounts/' + id).get()).data() || {}, d = await db.doc('dir/' + id).get(); o[id] = { dk: !!(a.grants && a.grants.dk), dir: d.exists ? (d.data() || {}).role || '?' : '' }; }
    return o;
  });
  ok(!got.aevil1.dk && !got.aevil1.dir, `"builtIn": true in the file gives nothing: no data key (${got.aevil1.dk}), no role in the directory (${got.aevil1.dir || 'none'})`);
  ok(!got.aevil2.dk && !got.aevil2.dir, `"role": "admin" in the file gives nothing: no data key (${got.aevil2.dk}), no role in the directory (${got.aevil2.dir || 'none'})`);
  // the Accounts list: both are waiting for access, neither is built in
  await p.click('#acctBtn'); await p.click('[data-acct="accounts"]'); await p.waitForSelector('#accList .accrow', { timeout: 15000 }); await p.waitForTimeout(400);
  const rows = await p.$$eval('#accList .accrow', L => L.map(r => ({ who: r.querySelector('.who b').textContent, pills: [...r.querySelectorAll('.pill')].map(x => x.textContent) })));
  const pr = n => (rows.find(r => r.who === n) || { pills: [] }).pills;
  ok(!pr('Planted Built-in').includes('Built in') && pr('Planted Built-in').some(x => /Waiting/.test(x)), `the planted built-in is listed as waiting, not built in (${pr('Planted Built-in').join(', ')})`);
  ok(!pr('Planted Admin').includes('Admin') && pr('Planted Admin').some(x => /Waiting/.test(x)), `the planted admin is listed as waiting (${pr('Planted Admin').join(', ')})`);
  await p.screenshot({ path: path.join(out, 'trust-accounts.png') });
  // the team copy: its built-in admins are the real ones
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#teamCopy')]);
  const copy = fs.readFileSync(await dl.path(), 'utf8'), m = copy.match(/<script type="application\/json" id="team-config">([\s\S]*?)<\/script>/);
  const admins = m ? JSON.parse(m[1]).admins.map(a => a.username) : null;
  ok(admins && admins.includes('sara.k') && !admins.includes('planted.b') && !admins.includes('planted.a'), `the team copy's built-in admins: ${JSON.stringify(admins)}`);
  ok(copy.indexOf('id="cspBoot"') > 0 && copy.indexOf('id="cspBoot"') < copy.indexOf('id="themeBoot"'), 'the team copy keeps the no-network rule at the top of its head');
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
