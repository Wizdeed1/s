// The CT team's incentive workbook in the browser, with the synthetic September 2026 exports (test/exports.cjs) and the synthetic
// CT workbook (test/ctbook.cjs, made-up people and IDs), as the WFM analyst on WFM team › Import:
// 1. Dropped with the exports, it is the CT team's attendance: on the Attendance card ("used CT (6 people) · Utilization for 6
//    people"), each CT agent's days from it (the four AL days, Exam), never the IDs file, nothing added to the roster.
// 2. Its Utilization (the average of each day's %) is kept for September and counts in each CT agent's scorecard, where the KPI
//    file has none; the KPI file's own value wins.
// 3. Remove takes its days and its Utilization away; Undo brings both back.
// Usage: node test/ctflow.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { ctBook } = require('./ctbook.cjs');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
(async () => {
  const B = await ctBook({ y: 2026, m: 9 }), ctPath = path.join(out, 'CT - Incentive - September.xlsx'); fs.writeFileSync(ctPath, B.bytes);
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' };
    try { const d = new Date(); localStorage.setItem('mc-today-toast:u1', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } catch (e) { /* none */ } }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); M.setStep('import'); });
  const roster0 = await p.evaluate(() => window.__mc.state.roster.length);

  // ---- 1. the exports and the CT workbook in one drop
  await p.setInputFiles('#picker', [...fs.readdirSync(exp).filter(f => !/^Book1/.test(f)).map(f => path.join(exp, f)), ctPath]);
  await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4 && window.__mc.state.attRes && !window.__mc.state.attRes.auto && window.__mc.state.attFiles.length === 1, null, { timeout: 60000 });
  await p.waitForTimeout(400);
  const A = await p.evaluate(nids => {
    const M = window.__mc, S = M.state, R = S.attRes, by = nid => S.roster.find(x => String(x.nid) === nid);
    const card = document.getElementById('attCard').textContent.replace(/\s+/g, ' ');
    const days = nids.map(n => { const q = by(n), a = q && R.byPerson.get(q._id); return a ? a.days : null; });
    return { files: S.attFiles.map(f => f.name), card, ids: S.idsFile ? S.idsFile.name : '', roster: S.roster.length, days, unmatched: R.unmatched.length, ksrc: S.ksrc['2026-09'] ? S.ksrc['2026-09'].files.map(f => ({ name: f.name, n: f.rows.length })) : [] };
  }, B.people.map(x => x.nid));
  ok(A.files[0] === 'CT - Incentive - September.xlsx', `an attendance file: ${A.files.join(', ')}`);
  ok(/used CT \(6 people\)/.test(A.card) && /Utilization for 6 people/.test(A.card), `the Attendance card: ${(A.card.match(/CT - Incentive[^R]*/) || [''])[0].trim()}`);
  ok(!A.ids && A.roster === roster0, `not the IDs file (${A.ids || 'none'}), nothing added to the roster (${A.roster})`);
  ok(A.unmatched === 0 && A.days.every(Boolean), 'every CT agent matched, by National ID');
  ok(A.days[0].slice(11, 15).every(v => v === 'AL') && A.days[2][6] === 'Exam' && A.days[3][20] === 'Absent' && A.days[1][19] === 'SL', 'the days are the workbook\'s: four AL days, an exam, an absence, a sick day');
  ok(A.ksrc.length === 1 && A.ksrc[0].n === 6, `its Utilization is kept for September: ${JSON.stringify(A.ksrc)}`);
  await p.screenshot({ path: path.join(out, 'ct-import.png'), fullPage: true });

  // ---- 2. the CT scorecard: Utilization from the workbook; the KPI file's own value wins
  const U = () => p.evaluate(nids => { const S = window.__mc.state; return nids.map(n => { const q = S.roster.find(x => String(x.nid) === n), K = q && S.kpi.get(q._id), x = K && K.res.rows.find(r => r.k.id === 'util'); return x ? x.v : null; }); }, B.people.map(x => x.nid));
  let u = await U();
  ok(u.every((v, i) => v != null && Math.abs(v - B.people[i].util) < 1e-6), `each CT agent's Utilization is the workbook's average: ${u.map(v => v == null ? '–' : (v * 100).toFixed(1) + '%').join(', ')}`);
  await p.evaluate(nid => { const M = window.__mc, S = M.state, q = S.roster.find(x => String(x.nid) === nid); S.kpiFiles['2026-09'] = { name: 'KPI.xlsx', at: new Date().toISOString(), rows: [{ id: nid, name: q.name, cols: { utilization: 0.5 } }], cols: ['Utilization'] }; M.refresh(); }, B.people[1].nid);
  await p.waitForTimeout(300); u = await U();
  ok(Math.abs(u[1] - 0.5) < 1e-9 && Math.abs(u[0] - B.people[0].util) < 1e-6, `the KPI file's value wins where it has one (${(u[1] * 100).toFixed(0)}%), the workbook fills the rest`);
  await p.evaluate(() => { delete window.__mc.state.kpiFiles['2026-09']; window.__mc.refresh(); });

  // ---- 3. Remove, then Undo
  await p.click('#attCard [data-unatt="CT - Incentive - September.xlsx"]'); await p.waitForTimeout(400);
  let G = await p.evaluate(() => ({ files: window.__mc.state.attFiles.length, ksrc: !!window.__mc.state.ksrc['2026-09'] }));
  u = await U();
  ok(G.files === 0 && !G.ksrc && u.every(v => v == null), `Remove: no days, no Utilization (${JSON.stringify(G)})`);
  await p.click('#toastAct'); await p.waitForTimeout(500);
  G = await p.evaluate(() => ({ files: window.__mc.state.attFiles.length, ksrc: window.__mc.state.ksrc['2026-09'] ? window.__mc.state.ksrc['2026-09'].files.length : 0 })); u = await U();
  ok(G.files === 1 && G.ksrc === 1 && u.every(v => v != null), `Undo: both back (${JSON.stringify(G)})`);

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
