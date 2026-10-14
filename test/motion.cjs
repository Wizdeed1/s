// Motion and speed: the dashboard's first-load moment plays once (and not on return), the Build step moment, and the Team table
// sorts, filters and pages within the budget (under 100 ms). Usage: node test/motion.cjs page.html outDir
const { chromium } = require('playwright'); const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }; window.__FIX_HOLD__ = true; }, fixture);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  // the history arrives, then the dashboard draws for the first time
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.renderWs(); });
  await p.waitForTimeout(90); const mid = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  await p.screenshot({ path: path.join(out, 'dash-intro-mid.png') });
  await p.waitForTimeout(1600); const after = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  await p.evaluate(() => { window.__mc.setWs('team'); window.__mc.setWs('dash'); });
  const replay = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  console.log(`dashboard moment: playing at 90 ms ${mid}, done after 1.7 s ${!after}, replays on return ${replay}`);
  // the Team table: sort, filter and page
  await p.evaluate(() => window.__mc.setWs('team'));
  const t = await p.evaluate(async () => {
    const M = window.__mc, S = window.__mc.state, time = fn => { const t0 = performance.now(); fn(); return Math.round(performance.now() - t0); };
    const r = {};
    r.render = time(() => M.renderWs());
    r.sortFin = time(() => { S.teamSort = 'fin'; S.teamDir = ''; M.renderWs(); });
    r.sortName = time(() => { S.teamSort = 'name'; S.teamDir = 'asc'; M.renderWs(); });
    r.filter = time(() => { S.teamBrand = 'Virgin'; M.renderWs(); });
    r.search = time(() => { S.teamQ = 'na'; M.renderWs(); });
    r.page = time(() => { S.teamQ = ''; S.teamBrand = ''; S.teamPage = 3; M.renderWs(); });
    r.rows = document.querySelectorAll('.tteam tbody tr').length;
    r.range = (document.querySelector('.prange') || {}).textContent;
    return r;
  });
  console.log('team table (ms):', JSON.stringify(t));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
