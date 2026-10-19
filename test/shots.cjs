// Visual test: opens the built page with the synthetic fixture, as each role, in both themes and at desktop and phone width,
// and saves a screenshot of each page plus any error the page reported.
// Usage: node test/shots.cjs [page.html] [outDir] [filter]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'final/MC Monthly Report Builder.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const USERS = {
  admin: { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' },
  user: { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' },
  wfm: { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' },
  senior: { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' },
  spv: { id: 'u4', name: '', username: 'spv.one', role: 'spv', pid: 'p0' },
  quality: { id: 'u5', name: 'Huda R.', username: 'huda.r', role: 'quality' },
};
const S = [];
for (const theme of ['dark', 'light']) for (const [role, wss] of Object.entries({ wfm: ['dash', 'team', 'wfm', 'results'], user: ['dash', 'build'], senior: ['dash', 'cycle', 'results'], admin: ['dash', 'build', 'team'], spv: ['team'], quality: ['quality'] }))
  for (const ws of wss) S.push({ name: `${role}-${ws}-${theme}`, role, ws, theme, w: 1440, h: 900 });
for (const [role, ws] of [['wfm', 'dash'], ['wfm', 'team'], ['user', 'build'], ['spv', 'team']]) S.push({ name: `${role}-${ws}-phone`, role, ws, theme: 'dark', w: 390, h: 844 });
S.push({ name: 'wfm-dash-laptop', role: 'wfm', ws: 'dash', theme: 'dark', w: 1180, h: 820 });
for (const [role, ws] of [['wfm', 'dash'], ['wfm', 'team'], ['user', 'build'], ['senior', 'cycle']]) S.push({ name: `${role}-${ws}-tablet`, role, ws, theme: 'light', w: 900, h: 1100 });
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const s of S) {
    if (only && !only.test(s.name)) continue;
    const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: s.theme === 'dark' ? 'dark' : 'light' });   // light and dark follow the computer
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    const u = USERS[s.role];
    await p.addInitScript(([fx, theme, user]) => {
      eval(fx);   // the fixture defines window.__FIX__
      window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = user;
    }, [fixture, s.theme, u.role === 'spv' ? { ...u, name: window_name(u) } : u]);
    await p.goto('file://' + page0);
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
    await p.evaluate(ws => {
      const M = window.__mc, F = window.__FIX__;
      M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++;
      if (M.setWs) M.setWs(ws); if (M.renderWs && ws !== 'build') M.renderWs();
    }, s.ws);
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, s.name + '.png'), fullPage: false });
    // the layout: the page never wider than the screen, and no table heading over its first row (a sticky heading in a box that scrolls)
    errs.push(...await p.evaluate(() => {
      const o = [], over = document.documentElement.scrollWidth - innerWidth;
      if (over > 1) o.push(`layout: the page is ${over}px wider than the screen`);
      for (const t of document.querySelectorAll('main table')) {
        const th = t.tHead && t.tHead.querySelector('th'), r = t.tBodies[0] && t.tBodies[0].rows[0];   // the cell: a sticky heading moves its cells, not the thead
        if (!th || !r || !th.offsetParent || getComputedStyle(t.tHead).display === 'none') continue;
        const a = th.getBoundingClientRect(), z = r.getBoundingClientRect();
        if (a.height && z.height && a.bottom > z.top + 1) o.push(`layout: a table heading covers its first row (${t.className || 'table'})`);
      }
      return o;
    }));
    if (errs.length) { bad++; console.log(`✗ ${s.name}\n  ${errs.slice(0, 5).join('\n  ')}`); } else console.log(`✓ ${s.name}`);
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
function window_name(u) { return 'Waleed G.'; }
