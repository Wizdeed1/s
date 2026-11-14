// Overlays and states: Settings, the bell, Search, the account and theme menus, the top bar on a narrow laptop, the phone More sheet, a link to a page the role
// cannot use, and the sign-in screen. Usage: node test/overlays.cjs page.html outDir
const { chromium } = require('playwright'); const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const U = { admin: { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }, spv: { id: 'u4', name: 'Waleed G.', username: 'spv.one', role: 'spv', pid: 'p0' } };
async function open(b, role, vp, hash, theme = 'dark') {
  const ctx = await b.newContext({ viewport: vp, reducedMotion: 'reduce', colorScheme: theme === 'dark' ? 'dark' : 'light' }), p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.addInitScript(([fx, u, th]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, U[role], theme]);
  await p.goto('file://' + path.resolve(page0) + (hash || ''));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.renderWs(); });
  await p.waitForTimeout(300); return p;
}
(async () => {
  const b = await chromium.launch(), shot = (p, n) => p.screenshot({ path: path.join(out, n + '.png') });
  let p = await open(b, 'admin', { width: 1440, height: 900 });
  await p.click('#setBtn'); await p.waitForTimeout(300); await shot(p, 'settings'); await p.keyboard.press('Escape');
  await p.click('#bell'); await p.waitForTimeout(300); await shot(p, 'bell'); await p.keyboard.press('Escape');
  await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.keyboard.type('lowest adherence Virgin'); await p.waitForTimeout(500); await shot(p, 'search'); await p.keyboard.press('Escape');
  await p.click('#acctBtn'); await p.waitForTimeout(200); await shot(p, 'account'); await p.keyboard.press('Escape');
  // the top bar on a narrow laptop: the pages go to icons (the page you are on keeps its name); pointing at one shows its name under it
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(500); await p.hover('#wsSeg [data-ws="team"]'); await p.waitForTimeout(300); await shot(p, 'bar-compact');
  console.log('bar on 1024 px:', await p.evaluate(() => document.getElementById('sidebar').className), '· name under the icon:', await p.evaluate(() => { const t = document.getElementById('railTip'); return t && !t.hidden ? t.textContent : 'none'; }));
  await p.mouse.move(700, 500); await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(400);
  console.log('admin errors:', p.errs.join(' | ') || 'none');
  p = await open(b, 'spv', { width: 1440, height: 900 }, '#/results');
  await shot(p, 'blocked'); console.log('spv on #/results ->', await p.evaluate(() => window.__mc.state.ws), await p.textContent('#h-blocked'));
  console.log('spv errors:', p.errs.join(' | ') || 'none');
  p = await open(b, 'admin', { width: 390, height: 844 });
  await p.click('#tabBar [data-tabmore]'); await p.waitForTimeout(400); await shot(p, 'phone-more');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(300); await shot(p, 'phone-team');
  await p.evaluate(() => window.__mc.setWs('build')); await p.waitForTimeout(300); await shot(p, 'phone-build');
  console.log('phone errors:', p.errs.join(' | ') || 'none');
  // the sign-in screen, as a person sees it on first open
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 } }), q = await c2.newPage();
  await q.goto('file://' + path.resolve(page0)); await q.waitForTimeout(1500); await q.screenshot({ path: path.join(out, 'signin.png') });
  await b.close();
})();
