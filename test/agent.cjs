const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2);
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, lang] of [[1440, 900, 'en'], [390, 844, 'en'], [390, 844, 'ar']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.addInitScript(([fx, lang]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' }; try { localStorage.setItem('mc-theme', 'dark'); if (lang === 'ar') localStorage.setItem('mc-lang:a1', 'ar'); } catch (e) {} }, [fixture, lang]);
    await p.goto('file://' + path.resolve(page0));
    await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.evaluate(lang => {
      const M = window.__mc, F = window.__FIX__, per = F.roster[20], months = {};
      for (const k of ['2026-06', '2026-07', '2026-08', '2026-09']) { const r = F.history[k].rows.find(x => x.id === per.nid) || F.history[k].rows[0]; months[k] = { status: k <= '2026-08' ? 'final' : 'draft', row: r, at: k + '-28T09:00:00Z', by: 'Test' }; }
      M.state.me = { prof: { name: per.name, brand: per.brand, team: per.team, nid: per.nid, spvName: 'Waleed G.' }, months, forms: {} };
      if (lang === 'ar') M.state.lang = 'ar';
      M.setWs('me'); M.renderWs();
    }, lang);
    await p.waitForSelector('#meBar .monthbox');
    const before = await p.$eval('#meBar [data-memonth]', s => s.value);
    await p.click('#meBar [data-mestep="-1"]'); await p.waitForTimeout(200);
    const after = await p.$eval('#meBar [data-memonth]', s => s.value);
    const focus = await p.evaluate(() => document.activeElement && (document.activeElement.dataset.mestep || document.activeElement.tagName));
    const next = await p.$eval('#meBar [data-mestep="1"]', bt => bt.disabled);
    await p.screenshot({ path: path.join(out, `agent-${w}-${lang}.png`) });
    console.log(w, lang, 'month', before, '->', after, 'focus', focus, 'next disabled', next, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await ctx.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
