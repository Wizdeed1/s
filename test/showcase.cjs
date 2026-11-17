// The Showcase, told around the bonus (js/showstory.js), in the tool and in the stand-alone file (tools/showcase/make_showcase.cjs):
// 1. In the tool, as the admin: eleven sections; the made-up champion's bonus as the engine counts it (the ticket, the five steps, the
//    receipt); Try it follows every change the way Kpi.score does (a lower adherence, late minutes past the gate, an attitude error,
//    fewer days, months in the job) and Back to her month; the receipt in Arabic; this month's bonus is the shared month's totals;
//    no word on the daily or weekly reports; View as the WFM manager has no Weekly commercial or Performance Review.
// 2. The stand-alone file: opened as a file it asks for nothing on the network and reports no error; ten sections (no live data);
//    the same bonus; Try it; Present with the arrow keys and Esc; Light and Dark; a phone keeps to its width.
// Usage: node test/showcase.cjs page.html showcase.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Kpi = require('../js/kpi.js');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, show0 = 'final/Cadence - Showcase.html', out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
// the engine, as the default rules count: the champion's scorecard and her month (what the stand-alone file counts with)
const D = Kpi.DEFAULTS(), CC = D.teams.CC, CFG = Kpi.normCount(null);
const LINA = { csat: 88, qobs: 92, aht: 158, emp: 87, fcr: 96, adh: 93, tardy: 8 };
function engine(v, att = 20, abs = 1, mon = 14, crit = false) {
  const vals = { file: {} }; for (const k of CC.kpis) { const x = k.unit === 'pct' ? v[k.id] / 100 : v[k.id]; if (k.src === 'file') vals.file[k.id] = x; else vals[k.src] = x; }
  const r = Kpi.score(CC, vals, { sched: 22, attended: att, absent: abs, runs: abs ? 1 : 0 }, 1000, CFG);
  const okAll = r.finalPct >= 0.8 - 1e-9 && !crit && r.attended >= 5 && mon >= 6;
  return okAll ? r.earned : 0;
}
const num = t => +String(t || '').replace(/[^\d.]/g, '');
async function tryIt(p, scope) {
  const earned = () => p.evaluate(s => num0(document.querySelector(`${s} [data-tryearned]`).textContent), scope);
  const set = (sel, v) => p.evaluate(([s, sel, v]) => { const el = document.querySelector(`${s} ${sel}`); if (el.type === 'checkbox') el.checked = v; else el.value = String(v); el.dispatchEvent(new Event(el.type === 'checkbox' ? 'change' : 'input', { bubbles: true })); }, [scope, sel, v]);
  await p.evaluate(() => { window.num0 = t => +String(t || '').replace(/[^\d.]/g, ''); });
  const rows = [];
  rows.push(['her month', await earned(), engine(LINA)]);
  await set('[data-tk="adh"]', 88); rows.push(['adherence 88%', await earned(), engine({ ...LINA, adh: 88 })]);
  const rk = await p.evaluate(s => document.querySelector(`${s} [data-tr="adh"]`).textContent, scope);
  await set('[data-tk="tardy"]', 25); rows.push(['and 25 late minutes (final under 80%)', await earned(), engine({ ...LINA, adh: 88, tardy: 25 })]);
  const stop = await p.evaluate(s => document.querySelector(`${s} .shtry-earned`).textContent.replace(/\s+/g, ' '), scope);
  await p.click(`${scope} [data-tryreset]`); await p.waitForTimeout(100); rows.push(['back to her month', await earned(), engine(LINA)]);
  await set('[data-td="crit"]', true); rows.push(['an attitude critical error', await earned(), engine(LINA, 20, 1, 14, true)]);
  await set('[data-td="crit"]', false); await set('[data-td="att"]', 10); rows.push(['10 days attended', await earned(), engine(LINA, 10, 1)]);
  await set('[data-td="att"]', 20); await set('[data-td="mon"]', 3); rows.push(['3 months in the job', await earned(), engine(LINA, 20, 1, 3)]);
  await p.click(`${scope} [data-tryreset]`); await p.waitForTimeout(100);
  return { rows, rk, stop };
}
(async () => {
  const b = await chromium.launch();
  // ---- 1. in the tool
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }; }, fixture);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.setWs('show'); });
    await p.waitForSelector('#showBody .sh-try [data-tryearned]'); await p.waitForTimeout(300);
    const S = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#showBody .shsec')].map(s => s.getAttribute('aria-label')), hero: document.querySelector('#showBody .shticket').textContent.replace(/\s+/g, ' '),
      result: document.querySelector('#showBody .shresult').textContent.replace(/\s+/g, ' '), text: document.getElementById('showBody').innerText }));
    ok(S.secs.length === 11 && S.secs[0] === 'Cadence' && S.secs[2] === 'How a bonus is counted' && S.secs[3] === 'Try it' && S.secs[7] === 'This month', `the Showcase is told around the bonus: ${S.secs.join(' · ')}`);
    const e0 = engine(LINA);
    ok(e0 === 764 && /764 SR/.test(S.hero) && /84%/.test(S.hero) && /20 of 22/.test(S.hero) && /1,000 SR × 91% × 84% = 764 SR/.test(S.result), `the made-up champion's bonus is the engine's: ${S.result.trim()} (the engine: ${e0} SR)`);
    const T = await tryIt(p, '#showBody');
    ok(T.rows.every(([, a, e]) => a === e) && T.rk === '3', `Try it follows the engine: ${T.rows.map(([w, a]) => `${w} ${a}`).join(' · ')} (adherence 88% ranks ${T.rk})`);
    ok(/No bonus this month/.test(T.stop) && /final of 80% or more/i.test(T.stop), `a final under 80% stops the bonus, and says why ("${T.stop.trim().slice(0, 90)}")`);
    await p.click('#showBody [data-shlang="ar"]'); await p.waitForTimeout(100);
    const ar = await p.evaluate(() => { const r = document.querySelector('#showBody [data-rcpt]'); return { dir: r.dir, lang: r.lang, t: r.textContent }; });
    await p.evaluate(() => document.querySelector('#showBody .sh-explain').scrollIntoView({ block: 'start' })); await p.screenshot({ path: path.join(out, 'showcase-receipt-ar.png') });
    await p.click('#showBody [data-shlang="en"]'); await p.waitForTimeout(100);
    const en = await p.evaluate(() => { const r = document.querySelector('#showBody [data-rcpt]'); return { dir: r.dir, t: r.textContent }; });
    ok(ar.dir === 'rtl' && ar.lang === 'ar' && /كيف احتُسب الحافز/.test(ar.t) && /764/.test(ar.t) && /ريال/.test(ar.t) && en.dir === 'ltr' && /How the bonus was counted/.test(en.t), 'the receipt in Arabic (right to left, the same 764) and back in English');
    const live = await p.evaluate(() => { const M = window.__mc, k = M.state.wsMonth || Object.keys(M.state.history).sort().pop(), rows = M.liveRows(k).filter(r => r.kc), earn = rows.filter(r => +r.earned > 0);
      return { page: [...document.querySelectorAll('#showLive .shbonus b')].map(x => x.textContent), want: [rows.length, earn.length, earn.reduce((a, r) => a + (+r.earned || 0), 0)].map(n => n.toLocaleString('en-US')) }; });
    ok(live.page.length === 4 && live.page[0] === live.want[0] && live.page[1] === live.want[1] && live.page[3] === live.want[2], `this month's bonus is the shared month's: ${live.page.join(' · ')}`);
    ok(!/\b(daily|weekly|commercial|performance review|report builder|import\w*|export\w*|upload\w*)\b/i.test(S.text), 'no word on the daily or weekly reports, nor on how files go in or out');
    await p.click('#showBody .shroles [data-vago="wfm"]'); await p.waitForFunction(() => window.__mc.viewing(), null, { timeout: 10000 });
    await p.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'emails'; M.setWs('wfm'); }); await p.waitForTimeout(300);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('#wfmTabs [data-wt]')].map(x => x.dataset.wt).join(','));
    ok(tabs && !/weekly|perf/.test(tabs), `View as the WFM manager: no Weekly commercial or Performance Review tab (${tabs})`);
    ok(!errs.length, `no errors in the tool ${errs.join('; ')}`);
    await ctx.close();
  }
  // ---- 2. the stand-alone file
  for (const [theme, vp] of [['light', { width: 1440, height: 900 }], ['dark', { width: 1440, height: 900 }], ['light', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, reducedMotion: 'reduce', colorScheme: theme }), p = await ctx.newPage(), errs = [], reqs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); p.on('request', r => reqs.push(r.url()));
    await p.goto('file://' + path.resolve(show0)); await p.waitForSelector('#showBody .sh-try [data-tryearned]'); await p.waitForTimeout(300);
    const tag = `${theme} ${vp.width}`;
    const S = await p.evaluate(() => ({ title: document.title, secs: [...document.querySelectorAll('#showBody .shsec')].map(s => s.getAttribute('aria-label')), hero: document.querySelector('.shticket').textContent.replace(/\s+/g, ' '),
      theme: document.documentElement.getAttribute('data-theme'), over: document.scrollingElement.scrollWidth - innerWidth, figs: document.querySelectorAll('.shfig').length }));
    await p.screenshot({ path: path.join(out, `showcase-file-${theme}-${vp.width}.png`) });
    const outside = reqs.filter(u => !/^(file|data|blob|about):/.test(u));
    ok(!outside.length && S.secs.length === 10 && !S.secs.includes('This month') && /764 SR/.test(S.hero) && S.theme === theme && S.over <= 1,
      `the stand-alone file (${tag}): "${S.title}", ${S.secs.length} sections, the same 764 SR, ${outside.length} requests outside the file, nothing wider than the screen (${S.over} px)`);
    if (vp.width === 1440 && theme === 'light') {
      const T = await tryIt(p, '#showBody');
      ok(T.rows.every(([, a, e]) => a === e), `  Try it in the file follows the engine too: ${T.rows.map(([w, a]) => `${w} ${a}`).join(' · ')}`);
      await p.click('.shbar [data-showpresent]'); await p.waitForTimeout(200);
      const pres = () => p.evaluate(() => ({ on: document.body.classList.contains('presenting'), cur: [...document.querySelectorAll('#showBody .shsec')].findIndex(s => s.classList.contains('cur')), bar: getComputedStyle(document.querySelector('.shbar')).display, ctl: !document.getElementById('showCtl').hidden }));
      let P = await pres(); const p0 = P.on && P.cur === 0 && P.bar === 'none' && P.ctl;
      await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); P = await pres(); const p1 = P.cur === 2;
      await p.screenshot({ path: path.join(out, 'showcase-file-present.png') });
      await p.keyboard.press('End'); P = await pres(); const p2 = P.cur === 9;
      await p.keyboard.press('Escape'); await p.waitForTimeout(150); P = await pres();
      ok(p0 && p1 && p2 && !P.on && !P.ctl, '  Present: one section at a time, the arrow keys, End, and Esc back to the page');
      await p.click('#shTheme'); const t1 = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('mc-theme')].join());
      await p.click('#shTheme'); const t2 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      ok(t1 === 'dark,dark' && t2 === 'light', `  Light and Dark from the bar, kept as the tool keeps it (${t1} → ${t2})`);
    }
    ok(!errs.length, `  no errors (${tag}) ${errs.join('; ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
