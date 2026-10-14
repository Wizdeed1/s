// Boots the built page in headless Chromium and reports what the first screen says.
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
const file = process.argv[2] || path.resolve('final/MC Monthly Report Builder.html');
const shot = process.argv[3] || '/tmp/smoke.png';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('file://' + file);
await p.waitForTimeout(2500);
console.log('title:', await p.textContent('#lockTitle'));
console.log('sub:', (await p.textContent('#lockSub')).slice(0, 300));
console.log('links:', (await p.innerText('#lockLinks')).slice(0, 300));
await p.screenshot({ path: shot });
console.log(errs.join('\n') || 'no errors');
await b.close();

})();
