// Manage accounts in the shared data folder (signed in as the first admin): every account record is listed, even one with no
// username; search and the role chips; Edit (name, username, email, your own name); an access record left with no account and
// its removal; removing an account. Usage: node test/accounts.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8766/mc.html', html = fs.readFileSync(path.resolve(page0));
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await ctx.addInitScript(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]'); await p.click('[data-conn="create"]');
  await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Tq7#mVx2!pLr'; await p.fill('#acName', 'Sara Khalid'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  // records the old list never showed: an account with no username or email, and an access record whose account is gone
  await p.evaluate(async () => { const db = window.__mc.state.db; await db.doc('accounts/aold0000000000001').set({ name: 'Old Record', createdAt: '2025-01-01T00:00:00Z' }); await db.doc('accounts/alina000000000001').set({ name: 'Lina A.', username: 'lina.a', kind: 'agent', createdAt: '2026-10-01T00:00:00Z' }); await db.doc('dir/aorphan00000000001').set({ role: 'spv', pid: '', by: 'someone', at: '2026-01-01T00:00:00Z' }); });
  await p.click('#acctBtn'); await p.click('[data-acct="accounts"]'); await p.waitForSelector('#accList .accrow', { timeout: 15000 }); await p.waitForTimeout(400);
  const names = () => p.evaluate(() => [...document.querySelectorAll('#accList .accrow .who > b')].map(x => x.textContent));
  let L = await names();
  ok(L.includes('Old Record') && L.includes('Lina A.') && L.includes('Sara Khalid'), `every account is listed, the one with no username too (${L.join(', ')})`);
  ok(await p.evaluate(() => /No username/.test(document.querySelector('#accList [data-id="aold0000000000001"]').textContent)), 'it says it has no username');
  await p.fill('#accTools [data-accq]', 'lina'); await p.waitForTimeout(400); L = await names();
  ok(L.length === 1 && L[0] === 'Lina A.' && await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-accq]')), `search: ${L.join(', ')}, the box keeps the focus while typing`);
  await p.fill('#accTools [data-accq]', ''); await p.waitForTimeout(300);
  await p.click('#accTools [data-accrole="pending"]'); await p.waitForTimeout(400); L = await names();
  ok(L.length === 2 && !L.includes('Sara Khalid'), `the Waiting chip: ${L.join(', ')}`);
  await p.click('#accTools [data-accrole=""]'); await p.waitForTimeout(300);
  // Edit: name, username and email
  await p.click('#accList [data-id="alina000000000001"] [data-a="uname"]'); await p.waitForSelector('#accList [data-id="alina000000000001"] [data-unform]');
  await p.fill('#accList [data-id="alina000000000001"] [name="name"]', 'Lina Ahmed'); await p.fill('#accList [data-id="alina000000000001"] [name="email"]', 'lina@example.com');
  await p.fill('#accList [data-id="alina000000000001"] [name="username"]', 'lina.ahmed');
  await p.click('#accList [data-id="alina000000000001"] [data-unform] .btn.primary'); await p.waitForTimeout(700);
  const lina = await p.evaluate(() => document.querySelector('#accList [data-id="alina000000000001"]').textContent);
  ok(/Lina Ahmed/.test(lina) && /lina\.ahmed/.test(lina) && /lina@example\.com/.test(lina), 'Edit saves the name, the username and the email');
  await p.click('#accList [data-id="alina000000000001"] [data-a="uname"]'); await p.waitForTimeout(200);
  await p.fill('#accList [data-id="alina000000000001"] [name="username"]', 'sara.k'); await p.click('#accList [data-id="alina000000000001"] [data-unform] .btn.primary'); await p.waitForTimeout(500);
  ok(/taken/.test(await p.textContent('#accList [data-id="alina000000000001"] .unerr')), 'a username someone has is refused');
  await p.click('#accList [data-id="alina000000000001"] [data-a="uncancel"]'); await p.waitForTimeout(200);
  // your own name
  const meId = await p.evaluate(() => document.querySelector('#accList .accrow .pill.good').closest('[data-id]').dataset.id);
  await p.click(`#accList [data-id="${meId}"] [data-a="uname"]`); await p.waitForTimeout(200);
  ok(!(await p.$(`#accList [data-id="${meId}"] [name="username"]`)), 'your own row: name and email only (the username is in the account menu)');
  await p.fill(`#accList [data-id="${meId}"] [name="name"]`, 'Sara K.'); await p.click(`#accList [data-id="${meId}"] [data-unform] .btn.primary`); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById('acctName').textContent) === 'Sara K.', 'your new name shows in the account menu at once');
  // records with no account
  ok(await p.isVisible('#accOther [data-orphdel="dir/aorphan00000000001"]'), 'the access record whose account is gone is listed');
  await p.screenshot({ path: path.join(out, 'accounts.png') });
  await p.click('#accOther [data-orphdel="dir/aorphan00000000001"]'); await p.click('#accOther [data-orphdel="dir/aorphan00000000001"]'); await p.waitForTimeout(600);
  ok(!(await p.$('#accOther [data-orphdel="dir/aorphan00000000001"]')), 'removed after a second click');
  // removing an account
  await p.click('#accList [data-id="aold0000000000001"] [data-a="remove"]'); await p.click('#accList [data-id="aold0000000000001"] [data-a="remove"]'); await p.waitForTimeout(700);
  ok(!(await names()).includes('Old Record'), 'an account is removed after a second click');
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
