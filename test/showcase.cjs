// The Showcase, told around the bonus (js/showstory.js), in the tool and in the stand-alone file (tools/showcase/make_showcase.cjs):
// 1. In the tool, as the admin: ten sections; the made-up champion's bonus as the engine counts it (the ticket, the five steps, the
//    receipt); Try it follows every change the way Kpi.score does (a lower adherence, late minutes past the gate, an attitude error,
//    fewer days, months in the job) and Back to her month; the receipt in Arabic; this month's bonus is the shared month's totals;
//    no word on the daily or weekly reports; the proof says how many people can use it at once (100, from tools/loadtest), with no
//    10,000, no time back and no test-suite tile; View as the WFM manager has no Weekly commercial or Performance Review.
// 2. The stand-alone file: opened as a file it asks for nothing on the network and reports no error; nine sections (no live data);
//    the same bonus and the same 100 people at once; every role has its own interface: eight roles, with the complaint and the digital
//    experience managers and the quality manager (not "Quality team"), in two rows of four; Try it; Present with the arrow keys and
//    Esc, the roles fitting a laptop's screen; Light and Dark; a phone keeps to its width.
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
    ok(S.secs.length === 10 && S.secs[0] === 'Cadence' && S.secs[2] === 'How a bonus is counted' && S.secs[3] === 'Try it' && S.secs[7] === 'This month', `the Showcase is told around the bonus: ${S.secs.join(' · ')}`);
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
    const proof = await p.evaluate(() => ({ t: document.querySelector('#showBody .sh-checks .shproof').textContent.replace(/\s+/g, ' ').trim(), n: document.querySelector('#showBody .sh-checks .shnotes').textContent,
      cards: document.querySelector('#showBody .sh-before .shnums > div').textContent.replace(/\s+/g, ' ').trim(), cn: document.querySelector('#showBody .sh-before .shnotes').textContent }));
    ok(/^9\s*scorecards: one for each department and role$/.test(proof.cards) && /by hand: 9 scorecards/.test(proof.cn), `the challenge: "${proof.cards}", as the team counts them (not the tool's 15 built in)`);
    ok(/^100\s*people using Cadence at the same time/.test(proof.t) && /a hundred people working at the same time/.test(proof.n) && !/10,000|ten thousand/i.test(proof.t + proof.n + S.text) && !/test suites|hours back|time back/i.test(S.text),
      `how many people at the same time, from the load test: "${proof.t}" (no 10,000, no time back, no test-suite tile)`);
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
      theme: document.documentElement.getAttribute('data-theme'), over: document.scrollingElement.scrollWidth - innerWidth, figs: document.querySelectorAll('.shfig').length,
      proof: document.querySelector('.sh-checks .shproof').textContent.replace(/\s+/g, ' ').trim(), body: document.getElementById('showBody').textContent,
      tiles: [...document.querySelectorAll('.sh-trust .shtile')].map(t => Math.round(t.getBoundingClientRect().right)),
      cards: document.querySelector('.sh-before .shnums > div').textContent.replace(/\s+/g, ' ').trim(),
      roles: { h: document.querySelector('.sh-roles h2').textContent.replace(/\s+/g, ' ').trim(), lead: document.querySelector('.sh-roles .shlead').textContent, names: [...document.querySelectorAll('.sh-roles .shrole .shrtop b')].map(b => b.textContent),
        rows: [...new Set([...document.querySelectorAll('.sh-roles .shrole')].map(r => Math.round(r.getBoundingClientRect().top)))].length } }));
    await p.screenshot({ path: path.join(out, `showcase-file-${theme}-${vp.width}.png`) });
    const outside = reqs.filter(u => !/^(file|data|blob|about):/.test(u));
    ok(!outside.length && S.secs.length === 9 && !S.secs.includes('This month') && /764 SR/.test(S.hero) && S.theme === theme && S.over <= 1
      && /^100\s*people using Cadence at the same time/.test(S.proof) && !/10,000|ten thousand|test suites|hours back|time back/i.test(S.body)
      && S.tiles.length === 5 && Math.abs(S.tiles[2] - S.tiles[4]) <= 1 && /^9\s*scorecards/.test(S.cards),
      `the stand-alone file (${tag}): "${S.title}", ${S.secs.length} sections, the same 764 SR, 9 scorecards, 100 people at the same time, Trust's five tiles with no empty slot, ${outside.length} requests outside the file, nothing wider than the screen (${S.over} px)`);
    const R8 = ['WFM analyst', 'WFM manager', 'Senior manager', 'Supervisor', 'Complaint manager', 'Digital experience manager', 'Quality manager', 'Agent'];
    ok(S.roles.h === 'Every role has its own interface.' && /each role signs in to its own interface/.test(S.roles.lead) && S.roles.names.join('|') === R8.join('|') && !/Quality team/.test(S.body) && (vp.width < 600 || S.roles.rows === 2),
      `  every role has its own interface (${tag}): ${S.roles.names.length} roles${vp.width < 600 ? '' : ` in ${S.roles.rows} rows`}, the complaint and digital experience managers among them, "Quality manager" for the quality team's card`);
    if (vp.width === 1440 && theme === 'light') {
      const T = await tryIt(p, '#showBody');
      ok(T.rows.every(([, a, e]) => a === e), `  Try it in the file follows the engine too: ${T.rows.map(([w, a]) => `${w} ${a}`).join(' · ')}`);
      await p.click('.shbar [data-showpresent]'); await p.waitForTimeout(200);
      const pres = () => p.evaluate(() => ({ on: document.body.classList.contains('presenting'), cur: [...document.querySelectorAll('#showBody .shsec')].findIndex(s => s.classList.contains('cur')), bar: getComputedStyle(document.querySelector('.shbar')).display, ctl: !document.getElementById('showCtl').hidden }));
      let P = await pres(); const p0 = P.on && P.cur === 0 && P.bar === 'none' && P.ctl;
      await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); P = await pres(); const p1 = P.cur === 2;
      await p.screenshot({ path: path.join(out, 'showcase-file-present.png') });
      await p.keyboard.press('End'); P = await pres(); const p2 = P.cur === 8;
      await p.keyboard.press('Escape'); await p.waitForTimeout(150); P = await pres();
      ok(p0 && p1 && p2 && !P.on && !P.ctl, '  Present: one section at a time, the arrow keys, End, and Esc back to the page');
      await p.click('#shTheme'); const t1 = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('mc-theme')].join());
      await p.click('#shTheme'); const t2 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      ok(t1 === 'dark,dark' && t2 === 'light', `  Light and Dark from the bar, kept as the tool keeps it (${t1} → ${t2})`);
    }
    ok(!errs.length, `  no errors (${tag}) ${errs.join('; ')}`);
    await ctx.close();
  }
  // the roles, presented on a laptop's screen: all eight seen, nothing to scroll
  for (const [w, h] of [[1366, 768], [1280, 720]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
    await p.goto('file://' + path.resolve(show0)); await p.waitForSelector('#showBody .sh-roles'); await p.waitForTimeout(300);
    await p.evaluate(() => { window.__showcase.present(true); window.__showcase.go([...document.querySelectorAll('#showBody .shsec')].findIndex(s => s.classList.contains('sh-roles'))); }); await p.waitForTimeout(400);
    const fit = await p.evaluate(() => { const s = document.querySelector('#showBody .shsec.cur'); return s && s.classList.contains('sh-roles') ? { over: s.scrollHeight - s.clientHeight, n: s.querySelectorAll('.shrole').length } : { over: -1, n: 0 }; });
    ok(fit.over === 0 && fit.n === 8, `  Present at ${w}×${h}: the ${fit.n} roles on the screen, nothing to scroll (${fit.over} px over)`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
