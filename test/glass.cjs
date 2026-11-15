// The glass look (November 2026): a clean ground with nothing drawn on it, glass panels, the floating top bar with its sliding pill
// (icons when the role's pages do not fit), Less transparency (solid panels, kept in this browser and applied before the first
// paint), the Dashboard's headline panel with its month tabs in the notch, the phone's glass tab bar at the bottom, and no network
// request anywhere on the way. Both appearances. Usage: node test/glass.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const U = { wfm: { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, admin: { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' } };
async function open(b, user, o = {}) {
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, colorScheme: o.theme || 'light', reducedMotion: o.rm || 'no-preference' }), p = await ctx.newPage(); p.errs = []; p.reqs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('request', r => p.reqs.push(r.url()));
  await p.addInitScript(([fx, u]) => {
    eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u;
    new MutationObserver((L, ob) => { if (document.body) { window.__glassAtBody = document.documentElement.getAttribute('data-glass'); ob.disconnect(); } }).observe(document, { childList: true, subtree: true });
  }, [fixture, user]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.renderWs(); });
  await p.waitForTimeout(500); return p;
}
const ground = p => p.evaluate(() => { const cs = getComputedStyle(document.body, '::before'); return { img: cs.backgroundImage, pos: cs.position, html: getComputedStyle(document.documentElement).backgroundColor, orbs: document.querySelectorAll('.orbs, .orb, #orbs').length, cards: document.querySelectorAll('.card').length }; });
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const p = await open(b, U.wfm, { theme });
    const g = await ground(p);
    ok(/^linear-gradient/.test(g.img) && !/radial|url\(/.test(g.img) && g.pos === 'fixed' && g.orbs === 0, `${theme}: the ground is one fixed wash of colour with nothing drawn on it (${g.img.slice(0, 40)}…), no spheres (${g.orbs})`);
    const bright = await p.evaluate(() => { const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(getComputedStyle(document.documentElement).backgroundColor); return m ? (+m[1] * 299 + +m[2] * 587 + +m[3] * 114) / 1000 : -1; });
    ok(theme === 'light' ? bright > 225 : bright < 30, `${theme}: the ground is ${theme === 'light' ? 'bright' : 'a deep navy'} (${Math.round(bright)} of 255)`);
    const glass = await p.evaluate(() => { const c = document.querySelector('#dashBody .kpi'), cs = getComputedStyle(c), a = /rgba\(\d+, \d+, \d+, ([\d.]+)\)/.exec(cs.backgroundColor); return { alpha: a ? +a[1] : 1, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow !== 'none' }; });
    ok(glass.alpha > 0.5 && glass.alpha < 0.9 && parseInt(glass.radius, 10) >= 16 && glass.shadow, `${theme}: a panel is translucent glass with round corners and a soft shadow (alpha ${glass.alpha}, ${glass.radius})`);
    // the bar: across the top, the pill under the page you are on, sliding to the next
    const bar = await p.evaluate(() => { const s = document.getElementById('sidebar').getBoundingClientRect(), t = document.querySelector('.appbar .tools').getBoundingClientRect(), cur = document.querySelector('#wsSeg button[aria-current="page"]'), ind = document.querySelector('#wsSeg .navind');
      return { top: s.top, w: s.width, toolsIn: t.right <= s.right + 1 && t.top >= s.top - 1, cur: cur && cur.dataset.ws, ind: !!ind, indW: ind && ind.offsetWidth, curW: cur && cur.offsetWidth, x: ind && ind.style.transform }; });
    ok(bar.top < 20 && bar.w > 1200 && bar.toolsIn && bar.ind && Math.abs(bar.indW - bar.curW) <= 1, `${theme}: the bar floats across the top with the toolbar's buttons at its right end; the pill is under ${bar.cur} (${bar.indW} px wide, ${bar.x})`);
    await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(800);
    const slid = await p.evaluate(() => { const cur = document.querySelector('#wsSeg button[aria-current="page"]'), ind = document.querySelector('#wsSeg .navind'); return { cur: cur.dataset.ws, dx: Math.abs(ind.getBoundingClientRect().left - cur.getBoundingClientRect().left), w: Math.abs(ind.offsetWidth - cur.offsetWidth) }; });
    ok(slid.cur === 'team' && slid.dx <= 1.5 && slid.w <= 1, `${theme}: the pill slid to Team (off by ${slid.dx.toFixed(1)} px)`);
    await p.screenshot({ path: path.join(out, `glass-team-${theme}.png`) });
    // the Dashboard's headline panel: the month in capitals, its tabs in the notch, the team wall
    await p.evaluate(() => window.__mc.setWs('dash')); await p.waitForTimeout(900);
    const hero = await p.evaluate(() => { const h = document.querySelector('#dashBody .dhero'), t = [...document.querySelectorAll('#dashBody .dhtab')]; return { has: !!h, line: (document.querySelector('.dhh') || {}).textContent || '', tabs: t.length, pressed: t.filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.period).join(), clip: h ? h.style.clipPath.slice(0, 5) : '', tiles: document.querySelectorAll('.dhwall g > rect').length, cta: !!document.querySelector('.dhlink') }; });
    ok(hero.has && /^[A-Z][a-z]+,/.test(hero.line) && hero.tabs >= 2 && hero.pressed && hero.clip === 'path(' && hero.tiles > 50 && hero.cta, `${theme}: the headline panel ("${hero.line.trim().slice(0, 40)}"), ${hero.tabs} month tabs in the notch (${hero.pressed} pressed), ${hero.tiles} tiles on the team wall`);
    const other = await p.evaluate(() => { const t = document.querySelector('#dashBody .dhtab[aria-pressed="false"]'); return t && t.dataset.period; });
    await p.click('#dashBody .dhtab[aria-pressed="false"]'); await p.waitForTimeout(700);
    const moved = await p.evaluate(() => ({ pressed: (document.querySelector('#dashBody .dhtab[aria-pressed="true"]') || {}).dataset?.period, line: (document.querySelector('.dhh') || {}).textContent || '' }));
    ok(moved.pressed === other && moved.line !== hero.line, `${theme}: another month tab: the panel follows (${moved.pressed}: "${moved.line.trim().slice(0, 30)}")`);
    await p.screenshot({ path: path.join(out, `glass-dash-${theme}.png`) });
    ok(!p.errs.length, `${theme}: no errors on the way ${p.errs.join('; ')}`);
    const net = p.reqs.filter(u => !/^(file|data|blob|about):/.test(u));
    ok(!net.length, `${theme}: no network request on the way (${p.reqs.length} requests, all the file itself or data in it)`);
    await p.context().close();
  }
  // more pages than fit: the admin's bar on a narrow laptop goes to icons (the name of the page you are on stays), not on a wide screen
  {
    const p = await open(b, U.admin, { vp: { width: 1024, height: 768 } });
    const narrow = await p.evaluate(() => { const s = document.getElementById('sidebar'), cur = document.querySelector('#wsSeg button[aria-current="page"]'), oth = document.querySelector('#wsSeg button:not([aria-current="page"]):not([hidden])'); const vis = el => el && [...el.querySelectorAll('span:not(.wsdot)')].some(x => x.getClientRects().length); return { cls: s.className, curName: vis(cur), othName: vis(oth), overflow: document.getElementById('wsSeg').scrollWidth - document.getElementById('wsSeg').clientWidth }; });
    ok(/compact/.test(narrow.cls) && narrow.curName && !narrow.othName && narrow.overflow <= 1, `admin at 1024 px: the pages are icons with the current one's name (${narrow.cls}; nothing cut off: ${narrow.overflow} px over)`);
    await p.hover('#wsSeg button:not([aria-current="page"]):not([hidden])'); await p.waitForTimeout(300);
    const tip = await p.evaluate(() => { const t = document.getElementById('railTip'), b = document.querySelector('#wsSeg button:not([aria-current="page"]):not([hidden])'); return t && !t.hidden ? { txt: t.textContent, below: t.getBoundingClientRect().top >= b.getBoundingClientRect().bottom } : null; });
    ok(tip && tip.txt && tip.below, `pointing at an icon shows the page's name under it (${tip && tip.txt})`);
    await p.screenshot({ path: path.join(out, 'glass-admin-1024.png') });
    await p.setViewportSize({ width: 1600, height: 900 }); await p.waitForTimeout(500);
    const wide = await p.evaluate(() => ({ cls: document.getElementById('sidebar').className, names: [...document.querySelectorAll('#wsSeg button:not([hidden])')].every(b => [...b.querySelectorAll('span:not(.wsdot)')].some(x => x.getClientRects().length)) }));
    ok(!/compact|tight/.test(wide.cls) && wide.names, `admin at 1600 px: every page with its name (${wide.cls || 'plain bar'})`);
    ok(!p.errs.length, `no errors on the admin's bar ${p.errs.join('; ')}`);
    await p.context().close();
  }
  // Less transparency: solid panels, kept in this browser and there before the first paint of the next visit; off again from the same place
  {
    const p = await open(b, U.wfm);
    const panel = () => p.evaluate(() => { const c = document.querySelector('#dashBody .kpi'), cs = getComputedStyle(c); return { bg: cs.backgroundColor, blur: cs.backdropFilter, solid: document.documentElement.getAttribute('data-glass'), kept: localStorage.getItem('mc-glass'), checked: (document.querySelector('#acctMenu [data-glassless]') || {}).getAttribute('aria-checked') }; });
    const g0 = await panel();
    ok(g0.solid === null && g0.checked === 'false', `glass to begin with (data-glass ${g0.solid}, the menu's switch ${g0.checked})`);
    await p.click('#acctBtn'); await p.waitForTimeout(200); await p.click('#acctMenu [data-glassless]'); await p.waitForTimeout(300);
    const g1 = await panel();
    ok(g1.solid === 'solid' && g1.kept === 'solid' && g1.checked === 'true' && /^rgb\(/.test(g1.bg) && (g1.blur === 'none' || !g1.blur), `Less transparency from the account menu: solid panels (${g1.bg}, blur ${g1.blur || 'none'}), kept as ${g1.kept}, the switch on`);
    await p.screenshot({ path: path.join(out, 'glass-solid.png') });
    await p.reload(); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.renderWs(); }); await p.waitForTimeout(400);
    const g2 = await p.evaluate(() => ({ at: window.__glassAtBody, now: document.documentElement.getAttribute('data-glass') }));
    ok(g2.at === 'solid' && g2.now === 'solid', `the next visit is solid before the tool's scripts ran (${g2.at})`);
    await p.click('#acctBtn'); await p.waitForTimeout(200); await p.click('#acctMenu [data-glassless]'); await p.waitForTimeout(300);
    const g3 = await panel();
    ok(g3.solid === null && g3.kept === 'glass' && g3.checked === 'false' && /^rgba\(/.test(g3.bg), `off again: glass (${g3.bg}), kept as ${g3.kept}`);
    ok(!p.errs.length, `no errors around Less transparency ${p.errs.join('; ')}`);
    await p.context().close();
  }
  // a phone: a glass bar on top with the mark (no title), the pages in a glass tab bar at the bottom
  {
    const p = await open(b, U.wfm, { vp: { width: 390, height: 844 } });
    const ph = await p.evaluate(() => { const tb = document.getElementById('tabBar'), r = tb.getBoundingClientRect(), side = document.querySelector('.appbar').getBoundingClientRect(), title = document.querySelector('.appbar .ptext'); return { tabBottom: innerHeight - r.bottom, tabTop: r.top, tabs: tb.querySelectorAll('button').length, sideTop: side.top, sideH: side.height, title: title ? getComputedStyle(title).display : 'none', mark: !!document.querySelector('.appbar .brand, .appbar .bomark, .appbar .brandmark') || getComputedStyle(document.querySelector('.appbar'), '::before').content !== 'none' }; });
    ok(ph.tabBottom >= 0 && ph.tabBottom < 40 && ph.tabTop > 700 && ph.tabs >= 3 && ph.sideTop < 20 && ph.sideH > 40 && ph.title === 'none', `a phone: the tab bar floats at the bottom (${ph.tabs} buttons, ${ph.tabBottom} px up, top ${Math.round(ph.tabTop)}), the glass bar on top (top ${Math.round(ph.sideTop)}, ${Math.round(ph.sideH)} px tall) shows the mark, not the title (${ph.title})`);
    await p.screenshot({ path: path.join(out, 'glass-phone.png') });
    ok(!p.errs.length, `no errors on the phone ${p.errs.join('; ')}`);
    await p.context().close();
  }
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
