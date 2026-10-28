// Every department's incentive, as the September 2026 incentive file counts it, in the browser with synthetic people (test/fixture.js):
// 1. The SPVs' card (OP): Team Performance is the average final % of the people they supervise; Service Level and AHT are the month's
//    figures (all brands: the all-brands figure, or the brands' average); Quality of Work and Staff Satisfaction are typed by hand; the
//    card pays 1600 SR for Virgin and 1000 SR for FRiENDi. With 87% / 88% / 152.5 s / 99% / 82% that is 98% and 1568 SR (22/22).
// 2. A role's card from the person's page (CT-SPV), its own base; NA typed by hand ranks 5; the QA specialists take their brand's figure.
// 3. The Build month as the WFM analyst: Review › KPI results has the Month figures and Typed by hand boxes, saved and scored at once.
// 4. The Scorecards drawer: every card, the card's base per brand, which figure it takes, "Month figure" as a KPI's source.
// Usage: node test/depts.cjs page.html outDir [exportsDir]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'out/mc.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const exp = process.argv[4] ? path.resolve(process.argv[4]) : null;
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // the once-a-day "things late" toast is marked as shown, so the Undo toasts this test clicks are not replaced by it
  const quiet = id => { const d = new Date(); try { localStorage.setItem('mc-today-toast:' + id, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } catch (e) { /* none */ } };
  await p.addInitScript(([fx, q]) => { eval(fx); eval(q)('u3'); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }; }, [fixture, quiet.toString()]);
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);

  // a September draft with a row for a Virgin SPV (team OP) and one for a FRiENDi SPV
  const who = await p.evaluate(() => {
    const M = window.__mc, F = window.__FIX__, H = JSON.parse(JSON.stringify(F.history)), S = H['2026-09'], R = M.state.roster;
    const lead = brand => R.find(x => x.team === 'OP' && x.brand === brand && R.some(y => y.spv === x._id && S.rows.some(r => String(r.id) === String(y.nid))));
    const v = lead('Virgin'), f = lead('Friendi'), row = x => ({ id: String(x.nid), n: x.name, brand: x.brand, team: 'OP', adh: null, aht: null, tardy: 0, worked: 22, absent: 0, ks: 22, ka: 22, kat: 22, kr: 0 });
    S.rows.push(row(v), row(f));
    M.state.history = H; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09';
    return { v: v._id, vid: String(v.nid), f: f._id, fid: String(f.nid) };
  });
  const rowOf = id => p.evaluate(id => { const r = window.__mc.liveRows('2026-09').find(x => String(x.id) === id); return r ? { kc: r.kc, fin: r.fin, earned: r.earned, base: r.base, kv: r.kv, kpi: r.kpi, ok: r._el && r._el.ok, vs: r.kx && r.kx.vs } : null; }, id);
  const set = (f, v) => p.evaluate(([f, v]) => { const M = window.__mc; M.state[f] = v; M.state.kxVer++; }, [f, v]);

  // 1. Team Performance from the team, before any figure is typed
  let R = await rowOf(who.vid);
  ok(R && R.kc === 'Member Care SPV / Leaders', `the Virgin SPV is scored with the SPVs' card (${R && R.kc})`);
  const avg = await p.evaluate(w => { const M = window.__mc, L = M.liveRows('2026-09'), ids = new Set(M.state.roster.filter(x => x.spv === w.v).map(x => String(x.nid))), F = L.filter(r => ids.has(String(r.id)) && r.kc && r.fin != null).map(r => r.fin); return { n: F.length, v: F.reduce((a, x) => a + x, 0) / F.length }; }, who);
  ok(avg.n > 0 && R.kv && Math.abs(R.kv.tperf - avg.v) < 1e-9, `Team Performance = the average final % of their ${avg.n} agents (${R.kv && R.kv.tperf} = ${avg.v})`);
  ok(R.base === 1600, `the SPVs' card pays 1600 SR for Virgin (${R.base})`);
  ok(R.kpi.find(z => z[0] === 'Service Level')[4] == null, 'no Service Level until the month figure is typed');

  // the month's figures and the values typed by hand: 98%, 1568 SR
  await set('kfig', { '2026-09': { sl: { all: 0.88 }, aht: { Virgin: 160, Friendi: 145 } } });
  await set('khand', { '2026-09': { [who.v]: { tperf: 0.87, qow: 0.99, ssmc: 0.82 }, [who.f]: { tperf: 0.9, qow: 1, ssmc: 0.9 } } });
  R = await rowOf(who.vid);
  const rk = n => (R.kpi.find(z => z[0] === n) || [])[4];
  ok(rk('Team Performance') === 5 && rk('Service Level') === 5 && rk('AHT') === 4 && rk('Quality of Work') === 5 && rk('Staff Satisfaction (MC)') === 5, `rankings 5, 5, 4, 5, 5: ${R.kpi.map(z => z[4]).join(', ')}`);
  ok(Math.abs(R.kv.aht - 152.5) < 1e-9, `AHT is the brands' average figure, 152.5 s, ranked as 153 (${R.kv.aht})`);
  ok(R.fin === 0.98 && R.earned === 1568, `final ${R.fin}, earned ${R.earned} SR (1600 × 98%)`);
  ok(R.vs && R.vs.sl === 'fig' && R.vs.qow === 'hand' && R.vs.tperf === 'hand', `where the values came from: ${JSON.stringify(R.vs)}`);
  const RF = await rowOf(who.fid);
  ok(RF.base === 1000 && RF.fin === 0.98 && RF.earned === 980, `the FRiENDi SPV: base ${RF.base}, final ${RF.fin}, ${RF.earned} SR`);

  // How this was counted names the sources
  await p.evaluate(w => { const x = document.createElement('button'); x.dataset.how = w.v; x.dataset.howk = '2026-09'; document.body.append(x); x.click(); x.remove(); }, who);
  await p.waitForSelector('#dHow:not([hidden]) #howBody');
  const how = await p.$eval('#howBody', el => el.textContent.replace(/\s+/g, ' '));
  ok(/Service Level \(the month's figure\)/.test(how) && /Quality of Work \(typed by hand\)/.test(how), 'How this was counted: the month\'s figure and typed by hand');
  ok(/AHT \(the month's figure\)\s*152\.5\s*→\s*153/.test(how) && /Seconds are rounded to whole seconds/.test(how), 'How: AHT 152.5 → 153, seconds rounded');
  ok(/Base 1600 SR \(the base of the Member Care SPV \/ Leaders scorecard\)/.test(how), 'How: the base of the SPVs\' card');
  await p.screenshot({ path: path.join(out, 'depts-how.png') });
  await p.keyboard.press('Escape');

  // 2. a role's card from the person's page; NA ranks 5; the QA specialists' brand figure
  const ct = await p.evaluate(() => { const M = window.__mc, S = M.state.history['2026-09'], c = M.state.roster.find(x => x.team === 'CT' && S.rows.some(r => String(r.id) === String(x.nid))); return { pid: c._id, id: String(c.nid) }; });
  await p.evaluate(c => { const M = window.__mc; window.__mcUser.role = 'user'; M.state.ws = 'build'; M.state.peditOpen = true; M.openPerson(c.pid); }, ct);
  await p.waitForSelector('#personBody select[data-pf="card"]');
  const opts = await p.$$eval('#personBody select[data-pf="card"] option', L => L.map(o => o.value));
  ok(opts[0] === '' && opts.includes('CT-SPV') && opts.includes('QA-MGR') && !opts.includes('CT'), `the person's Scorecard: the team's, then every other card (${opts.length} choices)`);
  await p.selectOption('#personBody select[data-pf="card"]', 'CT-SPV');
  await p.waitForFunction(c => window.__mc.state.roster.find(x => x._id === c.pid).card === 'CT-SPV', ct, { timeout: 5000 });
  R = await rowOf(ct.id);
  ok(R.kc === 'Complaint SPV' && R.base === 1600, `given CT-SPV on their page: ${R.kc}, base ${R.base}`);
  await p.keyboard.press('Escape');
  await p.evaluate(c => { const M = window.__mc; window.__mcUser.role = 'senior'; M.state.roster.find(x => x._id === c.pid).card = ''; M.state.ver++; }, ct);
  await set('khand', { '2026-09': { [ct.pid]: { qa: 'NA' } } });
  R = await rowOf(ct.id);
  const qa = R.kpi.find(z => z[0] === 'QA Evaluation');
  ok(R.kc === 'Member Care Complaint Team Champion' && qa[3] === 'N/A' && qa[4] === 5 && qa[5] === 'N/A counts as 5', `NA typed by hand ranks 5: ${JSON.stringify(qa)}`);
  const qaSp = await p.evaluate(() => window.__mc.rulesFor('2026-09').cards.teams.QA.scope);
  ok(qaSp === 'brand', 'the QA specialists\' card takes their own brand\'s figures');

  // 4. the Scorecards drawer
  await p.evaluate(() => window.__mc.openRules());
  await p.waitForSelector('#dScore:not([hidden]) #scTeams');
  const tabs = await p.$$eval('#scTeams button', L => L.map(x => x.dataset.f));
  ok(['CC', 'SM', 'CT', 'CT-SPV', 'CT-CCM', 'CT-SGM', 'OP', 'OP-DIG', 'TS', 'QA', 'QA-MGR', 'WF', 'WF-MGR', 'DE', 'DE-MGR'].every(t => tabs.includes(t)), `every department's card: ${tabs.join(' ')}`);
  await p.click('#scTeams button[data-f="OP"]');
  const pay = await p.$$eval('#scoreBody input[data-cpay]', L => L.map(i => i.value));
  ok(pay.join() === '1600,1000,1000', `the SPVs' card base: Virgin, FRiENDi, FRiENDi Pay ${pay.join(', ')}`);
  const src = await p.$$eval('#scoreBody tr[data-ki]', L => L.map(tr => { const s = tr.querySelector('[data-sf="owner"]'); return s ? s.value : tr.cells[2].textContent.trim(); }));
  ok(src.join() === 'Their team,fig,fig,file,file', `entered by: ${src.join(', ')}`);
  await p.fill('#scoreBody input[data-cpay="Friendi"]', '1100'); await p.press('#scoreBody input[data-cpay="Friendi"]', 'Tab');
  await p.waitForTimeout(300);
  ok((await rowOf(who.fid)).base === 1100, 'a new base for FRiENDi on the SPVs\' card: 1100 SR');
  await p.click('#toastAct'); await p.waitForTimeout(300);
  ok((await rowOf(who.fid)).base === 1000, 'Undo: 1000 SR again');
  await p.screenshot({ path: path.join(out, 'depts-rules.png') });
  await p.keyboard.press('Escape');

  // 3. the Build month as the WFM analyst
  if (exp) {
    const c2 = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), q = await c2.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message)); q.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await q.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
    await q.goto('file://' + page0);
    await q.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await q.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); });
    await q.setInputFiles('#picker', fs.readdirSync(exp).map(f => path.join(exp, f)));
    await q.waitForFunction(() => !window.__mc.state.pending.length && window.__mc.state.kpi && window.__mc.state.kpi.size > 0, null, { timeout: 30000 });
    await q.evaluate(() => { const M = window.__mc; M.setStep('review'); M.setTab('kpi'); M.renderKpiTab(); });
    await q.waitForSelector('#kpiExtra input[data-kfig]');
    const figs = await q.$$eval('#kpiExtra input[data-kfig]', L => [...new Set(L.map(i => i.dataset.kfig.split('|')[0]))]);
    ok(['sl', 'radh', 'aht', 'fqos', 'util', 'dres', 'cresp'].every(x => figs.includes(x)), `Month figures: ${figs.join(', ')}`);
    await q.fill('#kpiExtra input[data-kfig="sl|all"]', '88.5%'); await q.press('#kpiExtra input[data-kfig="sl|all"]', 'Tab');
    await q.waitForFunction(() => { const M = window.__mc, F = M.state.kfig[Object.keys(M.state.kfig).pop()]; return F && F.sl && Math.abs(F.sl.all - 0.885) < 1e-9; }, null, { timeout: 5000 });
    ok(true, 'a month figure typed as 88.5% is kept as 0.885');
    ok(await q.$eval('#kpiExtra input[data-kfig="sl|all"]', i => i.value) === '88.5%', 'and reads 88.5% again');
    const K = await q.evaluate(() => { const K = [...window.__mc.state.kpi.values()].find(x => x.ck === 'CC'); return { pid: K.m.p._id, name: K.m.exp }; });
    await q.selectOption('#kpiExtra [data-khp]', K.pid);
    await q.selectOption('#kpiExtra [data-khk]', 'qobs');
    await q.fill('#kpiExtra [data-khv]', 'NA'); await q.click('#kpiExtra [data-khadd]');
    await q.waitForFunction(pid => { const K = window.__mc.state.kpi.get(pid), x = K && K.res.rows.find(z => z.k.id === 'qobs'); return x && x.na && x.r === 5; }, K.pid, { timeout: 5000 });
    ok(true, `typed by hand: ${K.name}'s Quality Observations NA ranks 5 at once`);
    const listed = await q.$eval('#kpiExtra', el => el.textContent.replace(/\s+/g, ' '));
    ok(listed.includes('Quality Observations') && listed.includes('N/A'), 'the value is listed with Remove');
    await q.screenshot({ path: path.join(out, 'depts-kpiextra.png'), fullPage: false });
    await q.click('#kpiExtra [data-khdel]');
    await q.waitForFunction(pid => { const K = window.__mc.state.kpi.get(pid), x = K && K.res.rows.find(z => z.k.id === 'qobs'); return x && !x.na; }, K.pid, { timeout: 5000 });
    ok(true, 'Remove: back to its own source');
    await c2.close();
  }

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
