// The quality Final EVAL in the quality team's template, end to end with synthetic people: the analyst drops it on Import, each
// column lands in its KPI (Ticket QA = Empowerment Utilization, CR = Call Reason & FCR Accuracy, Final Score = Quality
// Observations, CT's Evaluation score = QA Evaluation), "Annual leave" rows stay empty, one DRC-CSAT typed once counts for every
// agent, the Quality page shows one table per team, and the EVAL template downloads in the same layout.
// Usage: node test/quality.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { evalBook } = require('./evalbook.cjs');
const Core = require(path.join(__dirname, '..', 'js', 'core.js'));
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const near = (a, b) => a == null || b == null ? a === b : Math.abs(a - b) < 1e-4;
(async () => {
  const { bytes, expect } = await evalBook(), file = path.join(out, 'Final EVAL - September 2026.xlsx');
  fs.writeFileSync(file, bytes);
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, fixture);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); M.setStep('import'); });
  await p.setInputFiles('#picker', [file]);
  await p.waitForFunction(() => !!window.__mc.state.quality['2026-09'], null, { timeout: 20000 });
  const got = await p.evaluate(names => { const M = window.__mc, Q = M.state.quality['2026-09'], out = {}; for (const n of names) { const per = M.state.roster.find(x => x.name === n); const r = per && Q.rows[per._id]; out[n] = r ? { kpi: r.kpi, status: r.status, crit: r.crit } : null; } return { out, unmatched: (Q.unmatched || []).length }; }, Object.keys(expect));
  let checked = 0;
  for (const [n, e] of Object.entries(expect)) {
    const r = got.out[n]; assert.ok(r, `${n} is linked`);
    if (e.status) { assert.equal(r.status, e.status, `${n} status`); assert.equal(r.kpi.qobs, undefined, `${n} has no Final Score`); checked++; continue; }
    for (const id of ['qobs', 'emp', 'fcr', 'qa']) if (id in e) assert.ok(near(r.kpi[id] ?? null, e[id]), `${n} ${id}: ${r.kpi[id]} vs ${e[id]}`);
    if (e.crit) assert.equal(r.crit.reduce((a, c) => a + c.n, 0), e.crit, `${n} critical errors`);
    if (e.attitude) assert.ok(r.crit.some(c => /attitude/i.test(c.type)), `${n} attitude error`);
    checked++;
  }
  assert.equal(got.unmatched, 0, 'every EVAL name linked');
  console.log(`EVAL columns -> KPIs: ${checked} people right`);

  // one DRC-CSAT for everyone, typed on Import
  await p.waitForSelector('#csatImp input[data-csat]', { state: 'visible' });
  await p.screenshot({ path: path.join(out, 'quality-import-csat.png') });
  await p.fill('#csatImp input[data-csat]', '87'); await p.press('#csatImp input[data-csat]', 'Tab');
  await p.waitForFunction(() => window.__mc.state.quality['2026-09'].csat === 0.87, null, { timeout: 5000 });
  const sc = await p.evaluate(n => { const M = window.__mc, per = M.state.roster.find(x => x.name === n), r = M.liveRows('2026-09').find(x => x.id === per.nid || x.n === per.name); return r && r.kpi ? Object.fromEntries(r.kpi.map(t => [t[0], typeof t[3] === 'string' && /%$/.test(t[3]) ? parseFloat(t[3]) / 100 : t[3]])) : null; }, Object.keys(expect)[0]);
  assert.ok(sc, 'the agent is scored in Sep 2026');
  assert.ok(near(sc['DRC-CSAT'], 0.87), `DRC-CSAT in the scorecard: ${sc['DRC-CSAT']}`);
  assert.ok(near(sc['Empowerment Utilization'], 1), `Empowerment Utilization = Ticket QA: ${sc['Empowerment Utilization']}`);
  assert.ok(near(sc['Call Reason & FCR Accuracy'], 1), 'Call Reason & FCR Accuracy = CR');
  console.log('DRC-CSAT typed once counts in the scorecard; Ticket QA and CR count too');

  // the Quality page, as the quality team
  await p.evaluate(() => { window.__mcUser.role = 'quality'; window.__mc.state.qMonth = '2026-09'; window.__mc.setWs('quality'); window.__mc.renderWs(); });
  await p.waitForSelector('#qualityBody .qteam');
  const teams = await p.$$eval('#qualityBody .qteam h3', L => L.map(h => h.textContent.trim()));
  const heads = await p.$eval('#qualityBody .qteam', S => [...S.querySelectorAll('thead th')].map(h => h.textContent.trim()));
  assert.ok(teams.length >= 4, 'one table per team: ' + teams.join(' | '));
  assert.deepEqual(heads.slice(0, 7), ['Agent Name', 'Call QA', 'Ticket QA / Empowerment Utilization', 'Call Reason & FCR Accuracy', 'Final Score (Average of Call QA, Ticket QA & CR)', 'Critical Error', 'Number of Critical Errors']);
  assert.ok(await p.$('#qualityBar input[data-csat]'), 'the DRC-CSAT box is on the Quality page');
  await p.screenshot({ path: path.join(out, 'quality-page.png'), fullPage: true });
  console.log('Quality page:', teams.join(' | '));

  // the template download is the quality team's layout
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('[data-qtpl]')]);
  const tpl = path.join(out, dl.suggestedFilename()); await dl.saveAs(tpl);
  const sheets = await Core.readXlsx(new Uint8Array(fs.readFileSync(tpl)));
  const hdrOf = S => (S.rows.find(r => r && r.some(v => v === 'Agent Name')) || []).filter(v => v != null && v !== '');
  const virgin = sheets.find(S => S.name === 'Virgin'), ct = sheets.find(S => S.name === 'CT');
  assert.deepEqual(hdrOf(virgin).slice(1, 8), ['Agent Name', 'Call QA', 'Ticket QA / Empowerment Utilization', 'Call Reason & FCR Accuracy', 'Final Score (Average of Call QA, Ticket QA & CR)', 'Critical Error', 'Number of Critical Errors']);
  assert.deepEqual(hdrOf(ct).slice(1, 6), ['Agent Name', 'Evaluation score', 'Final Score', 'Critical Error', 'Number of Critical Errors']);
  console.log('template:', dl.suggestedFilename(), sheets.map(S => S.name).join(', '));

  if (errs.length) { console.log(errs.join('\n')); process.exitCode = 1; } else console.log('no errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
