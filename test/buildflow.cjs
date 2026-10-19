// The Build flow in the browser with synthetic exports: Import (cards, checklist, import log), Review › Checks (tiles, a row
// expanded, the Link panel), Export (the confirmation dialog, the build, what happened). Usage: node test/buildflow.cjs page.html exportsDir outDir [theme]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, exp, out, theme = 'dark'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce', colorScheme: theme === 'dark' ? 'dark' : 'light' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx, th]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture, theme]);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); });
  const files = fs.readdirSync(exp).map(f => path.join(exp, f));
  await p.setInputFiles('#picker', files);
  await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 30000 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, `build-import-${theme}.png`) });
  console.log('log:', JSON.stringify((await p.evaluate(() => window.__mc.impLog().map(x => x.kind + ': ' + x.text))).slice(0, 8), null, 1));
  await p.click('#toReview'); await p.waitForTimeout(500);
  const first = await p.$('#checksBody .chkhead'); if (first) { await first.click(); await p.waitForTimeout(250); }
  await p.screenshot({ path: path.join(out, `build-checks-${theme}.png`) });
  const lp = await p.$('#checksBody [data-linkp]');
  if (lp) { await lp.click(); await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `build-link-${theme}.png`) }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  else console.log('no Link… button found');
  await p.click('#stepsNav [data-step="export"]'); await p.waitForTimeout(400);
  await p.click('#build'); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(out, `build-dialog-${theme}.png`) });
  console.log('dialog focus:', await p.evaluate(() => document.activeElement && document.activeElement.id));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#buildGo')]);
  console.log('downloaded:', dl.suggestedFilename());
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, `build-done-${theme}.png`) });
  await p.click('#stepsNav [data-step="email"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(out, `build-email-${theme}.png`) });
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
