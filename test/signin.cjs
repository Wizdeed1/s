// The real start, with no test hooks: "Use this computer only", the first account becomes the admin, the tool opens on the
// Dashboard; then Lock now and unlock. Usage: node test/signin.cjs page.html outDir
const { chromium } = require('playwright'); const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(page0)); await p.waitForTimeout(1200);
  const local = await p.$('#lockLinks button, #lockLinks .linkbtn'); if (local) await local.click();
  await p.waitForSelector('#acName:not([hidden]), #fName:not([hidden])', { timeout: 10000 });
  await p.fill('#acName', 'Sara Khalid'); await p.fill('#acUser', 'sara.k');
  const pw = 'Tq7#mVx2!pLr'; await p.fill('#pwNew', pw); await p.fill('#pwConf', pw);
  await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden, null, { timeout: 60000 });
  await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ ws: window.__mc.state.ws, title: document.getElementById('pageTitle').textContent, nav: [...document.querySelectorAll('#wsSeg [data-ws]:not([hidden])')].map(b => b.dataset.ws), sideInert: document.getElementById('sidebar').hasAttribute('inert') }));
  console.log('signed in:', JSON.stringify(st));
  await p.screenshot({ path: path.join(out, 'signed-in.png') });
  await p.click('#acctBtn'); await p.click('[data-acct="lock"]'); await p.waitForTimeout(500);
  console.log('locked:', await p.evaluate(() => !document.getElementById('lock').hidden && document.getElementById('sidebar').hasAttribute('inert')), await p.textContent('#lockTitle'));
  await p.fill('#pwCur', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden, null, { timeout: 60000 });
  console.log('unlocked back on:', await p.evaluate(() => window.__mc.state.ws));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
