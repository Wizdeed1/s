// Every role's pages in the order the month is done (synthetic fixture only):
//  - the sidebar follows the month: the build, the quality EVAL, the month close, the one-to-ones, the results;
//  - the Supervisors page is the month close in eight numbered steps, one marked next, its "On this page" list numbered too;
//    the build's own step bar (.step) never touches them (.flowstep);
//  - the Quality page is its six steps; the dashboard puts what needs attention before the trend;
//  - an agent's one-to-one waiting for them comes straight after the month's status, else after their results.
// usage: node test/steps.cjs out/mc.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out = 'shots/steps'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok ' : '✗ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const today = '2026-10-20';   // the page's clock: September 2026 is the month being closed
  const open = async (user, w = 1440) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage();
    // the test's clock is a script Playwright puts in every frame: the sandboxed email previews refuse it, which is not the page's error
    p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/^Blocked script execution in 'about:blank' because the document's frame is sandboxed/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.clock.setFixedTime(new Date(today + 'T10:00:00'));
    await p.addInitScript(([fx, u, t]) => { eval(fx); try { localStorage.setItem('mc-today-toast:' + u.id, t); } catch (e) {} window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user, today]);
    await p.goto('file://' + path.resolve(page0));
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
    await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09'; });
    return { p, ctx };
  };
  const side = p => p.evaluate(() => [...document.querySelectorAll('#wsSeg [data-ws]')].filter(x => !x.hidden).map(x => x.dataset.ws).join(','));

  // the senior manager: the sidebar, the Supervisors page's steps, the dashboard
  let { p, ctx } = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  ok(await side(p) === 'dash,cycle,team,results,wfm', `senior: the month close, the one-to-ones, the results, then WFM (${await side(p)})`);
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); }); await p.waitForSelector('#cycleBody .flow');
  const S = await p.evaluate(() => [...document.querySelectorAll('#cycleBody .flow > .flowstep')].map(x => ({ n: x.dataset.n, st: x.classList.contains('next') ? 'next' : x.classList.contains('done') ? 'done' : '', t: x.querySelector('h2').textContent, cur: x.hasAttribute('aria-current') })));
  ok(S.length === 8 && S.every((x, i) => x.n === String(i + 1) && x.t.startsWith(`Step ${i + 1}: `)), `eight numbered steps, each named "Step n" for a screen reader (${S.map(x => x.t.replace(/^Step \d+: /, '')).join(' | ')})`);
  ok(S.filter(x => x.st === 'next').length === 1 && S[0].st === 'next', 'one step is next: the first not done');
  ok(!S.some(x => x.cur), 'the build\'s step bar leaves the page steps alone');
  const nav = await p.$$eval('#cycleBody > .secnav [data-sec]', L => L.map(x => x.textContent));
  ok(nav[0] === '1 · Incentive data for review' && nav[7] === '8 · Final incentive data' && nav.includes('Supervisor results'), `On this page: the steps numbered, then the rest (${nav.slice(0, 3).join(' | ')}…)`);
  ok(await p.evaluate(() => [...document.querySelectorAll('#cycleBody .phase h2')].map(h => h.textContent).join('|')) === 'To look things up|Set once', 'after the steps: To look things up, then Set once');
  const lead = await p.evaluate(() => { const a = document.querySelector('#st-review .stephd'), c = document.querySelector('#st-review .stcap'); return { below: c.getBoundingClientRect().top >= a.getBoundingClientRect().bottom - 1, inHead: !!a.querySelector('.stcap') }; });
  ok(lead.below && !lead.inHead, 'a step\'s caption sits under its title line, whatever the title\'s length');
  await p.screenshot({ path: path.join(out, 'senior-cycle.png'), fullPage: true });
  // a step done moves "next" along
  await p.evaluate(() => { const M = window.__mc, C = M.state.cycles['2026-09'] = M.state.cycles['2026-09'] || {}; C.sent = { ...(C.sent || {}), incReview: { at: new Date().toISOString(), by: 'Faisal M.' } }; M.renderWs(); });
  const S2 = await p.evaluate(() => [...document.querySelectorAll('#cycleBody .flow > .flowstep')].map(x => (x.classList.contains('next') ? 'next' : x.classList.contains('done') ? 'done' : '')));
  ok(S2[0] === 'done' && S2[1] === 'next' && await p.evaluate(() => document.querySelector('#st-increv .stepn').textContent === '✓'), `the incentive data sent: step 1 done, step 2 next (${S2.join(',')})`);
  // a month closed before: a step the tool did not see is "Not recorded", never "next"
  await p.evaluate(() => { const M = window.__mc; M.state.wsMonth = '2026-08'; M.renderWs(); });
  const S3 = await p.evaluate(() => [...document.querySelectorAll('#cycleBody .flow > .flowstep')].map(x => ({ st: x.classList.contains('next') ? 'next' : x.classList.contains('done') ? 'done' : '', note: (x.querySelector('.stnote') || {}).textContent || '' })));
  ok(S3.length === 8 && !S3.some(x => x.st === 'next') && S3.some(x => x.note === 'Not recorded'), `August (closed before): no step is next, the ones not seen say Not recorded (${S3.map(x => x.st || x.note).join(', ')})`);
  await p.evaluate(() => { const M = window.__mc; M.state.wsMonth = '2026-09'; M.renderWs(); });
  // the dashboard: the month and its steps, then what needs attention, then the trend
  await p.evaluate(() => { window.__mc.setWs('dash'); window.__mc.renderWs(); }); await p.waitForSelector('#dashBody .dtrend');
  const order = await p.evaluate(() => ['.kpis', '.dclose', '.dattn', '.dlow', '.dtrend', '.ddata'].map(s => document.querySelector('#dashBody ' + s)).filter(Boolean).map(el => [...document.querySelectorAll('#dashBody .kpis, #dashBody .dclose, #dashBody .dattn, #dashBody .dlow, #dashBody .dtrend, #dashBody .ddata')].indexOf(el)));
  ok(order.join(',') === '0,1,2,3,4,5', `dashboard: KPIs and the month close, then Needs attention, then the trend (${order})`);
  const qa = await p.$$eval('#dashBody .qacts .qa b', L => L.map(x => x.textContent));
  ok(qa.join('|').toLowerCase() === 'supervisors and month close|every team|results|analytics', `quick actions in the month's order (${qa.join(' | ')})`);   // title case on screen (caps.js)
  await ctx.close();
  // the phone: the same order, one column
  ({ p, ctx } = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }, 390));
  await p.evaluate(() => { window.__mc.setWs('dash'); window.__mc.renderWs(); }); await p.waitForSelector('#dashBody .dtrend');
  ok(await p.evaluate(() => { const y = s => document.querySelector('#dashBody ' + s).getBoundingClientRect().top; return y('.dclose') < y('.dattn') && y('.dattn') < y('.dtrend'); }), 'phone: Needs attention before the trend too');
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); }); await p.waitForSelector('#cycleBody .flow');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone: the steps fit the screen');
  await p.screenshot({ path: path.join(out, 'senior-cycle-phone.png'), fullPage: true });
  await ctx.close();

  // the admin: the build first, and its step bar still works next to the page steps
  ({ p, ctx } = await open({ id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }));
  ok(await side(p) === 'dash,wfm,quality,cycle,team,results', `admin: the month's order (${await side(p)})`);
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); }); await p.waitForSelector('#cycleBody .flow');
  await p.evaluate(() => { window.__mc.setWs('build'); window.__mc.setStep('review'); });
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); }); await p.waitForSelector('#cycleBody .flow');
  const bar = await p.evaluate(() => ({ steps: document.querySelectorAll('#stepsNav .step').length, cur: (document.querySelector('#stepsNav .step[aria-current="page"]') || {}).dataset?.step, pageCur: document.querySelectorAll('.flowstep[aria-current], .flowstep .n').length }));
  ok(bar.steps === 4 && bar.cur === 'review' && bar.pageCur === 0, `the build's own steps: 4, on Review; the page steps untouched (${JSON.stringify(bar)})`);
  await ctx.close();

  // the WFM analyst: the WFM team page before Team
  ({ p, ctx } = await open({ id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }));
  ok(await side(p) === 'dash,wfm,team', `analyst: the WFM team page first (${await side(p)})`);
  await ctx.close();

  // the quality team: the month's quality work in six steps
  ({ p, ctx } = await open({ id: 'u5', name: 'Huda R.', username: 'huda.r', role: 'quality' }));
  await p.evaluate(() => { window.__mc.state.qMonth = '2026-09'; window.__mc.setWs('quality'); window.__mc.renderWs(); }); await p.waitForSelector('#qualityBody .flow');
  const Q = await p.$$eval('#qualityBody .flow > .flowstep', L => L.map(x => x.id + (x.classList.contains('next') ? '*' : '')));
  ok(Q.join(',') === 'qs-tpl*,qs-drop,qs-names,qs-csat,qs-check,qs-obj', `Quality: the template, the Final EVAL, the names, the DRC-CSAT, the check, the objections (${Q.join(',')})`);
  ok(await p.evaluate(() => !!document.querySelector('#qs-drop [data-qdropzone]') && !!document.querySelector('#qs-tpl [data-qtpl]') && !!document.querySelector('#qs-csat input[data-csat]')), 'each step holds its own tool: the drop zone, the template, the DRC-CSAT box');
  await p.screenshot({ path: path.join(out, 'quality.png'), fullPage: true });
  await ctx.close();

  // an agent: the one-to-one waiting for them first; once sent, after their results
  ({ p, ctx } = await open({ id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' }));
  const meOrder = async reply => p.evaluate(reply => {
    const M = window.__mc, F = window.__FIX__, per = F.roster[20], r = F.history['2026-09'].rows.find(x => x.id === per.nid) || F.history['2026-09'].rows[0];
    M.state.me = { prof: { name: per.name, brand: per.brand, team: per.team, nid: per.nid, spvName: 'Waleed G.' }, months: { '2026-09': { status: 'draft', row: r, at: '2026-09-28T09:00:00Z', by: 'Test' } },
      forms: { f1: { kind: 'oto', y: 2026, m: 9, status: 'held', supervisor: 'Waleed G.', date: '2026-10-05' } }, sigs: {}, replies: reply ? { f1: { at: new Date().toISOString() } } : {}, objs: {} };
    M.state.meMonth = '2026-09'; M.setWs('me'); M.renderWs();
    const body = document.getElementById('meBody'), kids = [...body.children], forms = kids.findIndex(x => /One-to-ones/.test((x.querySelector('h2') || {}).textContent || '')), tiles = kids.findIndex(x => x.matches('.tiles'));
    return { forms, tiles };
  }, reply);
  const w1 = await meOrder(false), w2 = await meOrder(true);
  ok(w1.forms >= 0 && w1.forms < w1.tiles, `a one-to-one to fill in: first, before the results (${JSON.stringify(w1)})`);
  ok(w2.forms > w2.tiles, `sent, waiting for the supervisor: after the results (${JSON.stringify(w2)})`);
  await ctx.close();

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
