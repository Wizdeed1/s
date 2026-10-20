// Report builder: resting the pointer on a brand box shows that brand's email, small and whole, beside the box; it goes when the
// pointer leaves, and the keyboard focus shows it too. Usage: node test/peek.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { window.__mc.state.wfmTab = 'builder'; window.__mc.setWs('wfm'); });
  await p.waitForSelector('#wfmRb .rbbrands > li[data-peek]', { timeout: 30000 });
  const box = await p.$('#wfmRb .rbbrands > li[data-peek="postpaid"]'); await box.scrollIntoViewIfNeeded();
  await box.hover(); await p.waitForTimeout(900);
  const pk = await p.evaluate(() => { const el = document.querySelector('.rbpeek'); if (!el || el.hidden) return null; const r = el.getBoundingClientRect(), b = document.querySelector('[data-peek="postpaid"]').getBoundingClientRect(), fr = el.querySelector('iframe'), d = fr.contentDocument;
    return { w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, covers: !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom), text: (d && d.body ? d.body.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 60), scale: fr.style.transform }; });
  ok(pk && pk.text.length > 10, `resting on Virgin Postpaid shows its email (${pk && pk.text}…)`);
  ok(pk && pk.w <= 400 && pk.h <= 560 && pk.inView && !pk.covers, `small and whole, beside the box, on the screen (${pk && pk.w}×${pk && pk.h}, ${pk && pk.scale})`);
  await p.screenshot({ path: path.join(out, 'peek.png') });
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const el = document.querySelector('.rbpeek'); return !el || el.hidden; }), 'it goes when the pointer leaves');
  await p.focus('#wfmRb .rbbrands > li[data-peek="friendi"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => { const el = document.querySelector('.rbpeek'); return el && !el.hidden && /FRiENDi Mobile/.test(el.querySelector('small').textContent); }), 'the keyboard focus shows it too');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('.rbpeek').hidden), 'Escape closes it');
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
