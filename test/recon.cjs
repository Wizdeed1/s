// Results › Reconcile with the old Excel, in the browser: the three synthetic old workbooks of August 2026 (test/oldbooks.cjs) are
// chosen at once on Results as the senior manager, with August a draft month in the tool. Checks the file chips (the deduction
// workbook named 2026-08 holds September), the tiles, the own-base and absence groups with the rules that fit, saving the bases
// into the rules (logged), taking the old earned SR as an adjustment and undoing it, the deduction workbook's typed-over cells, the
// workbook's slips, and the table pasted from the email.
// Usage: node test/recon.cjs [page.html] [outDir]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { oldBooks } = require('./oldbooks.cjs');
const page0 = path.resolve(process.argv[2] || 'final/MC Monthly Report Builder.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
(async () => {
  const B = await oldBooks(), dir = path.join(out, 'oldbooks'); fs.mkdirSync(dir, { recursive: true });
  const files = ['inc', 'final', 'ded'].map(x => { const f = path.join(dir, B.names[x]); fs.writeFileSync(f, B[x]); return f; });
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }; }, [fixture]);
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);
  // August as a draft month of the tool: the old people's days as the tool counts them
  await p.evaluate(people => {
    const M = window.__mc, F = window.__FIX__, H = JSON.parse(JSON.stringify(F.history)), A = H['2026-08'];
    for (const x of people) {
      let r = A.rows.find(z => String(z.id) === String(x.nid));
      if (!r) { const q = F.roster.find(z => String(z.nid) === String(x.nid)); r = { id: x.nid, n: q.name, brand: q.brand, team: q.team, adh: 0.96, aht: 180, tardy: 0, fin: x.F, earned: Math.round(1000 * x.ka / x.ks * x.F) }; A.rows.push(r); }   // team leads in the old result
      Object.assign(r, { ks: x.ks, ka: x.ka, kat: x.ka, absent: x.absent, kr: x.absent ? 1 : 0, worked: x.ka });
    }
    M.state.history = H; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-08';
    M.setWs('results'); M.renderWs();
  }, B.expect.people.map(x => ({ nid: x.nid, ks: x.ks, ka: x.ka, F: x.F, absent: x.cut === 8 ? 2 : x.cut === 12 ? 4 : 0 })));
  await p.waitForSelector('#reconCard');
  await p.setInputFiles('#cmpPicker', files);
  await p.waitForSelector('#reconCard .rchips .rchip:nth-child(3)', { timeout: 20000 });
  await p.waitForTimeout(300);
  const chips = await p.$$eval('#reconCard .rchip', L => L.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  ok(chips.length === 3, `three file chips: ${chips.map(c => c.slice(0, 60)).join(' | ')}`);
  ok(chips.some(c => /Monthly_Deduction_2026-08/.test(c) && /holds Sep 2026/.test(c)), 'the deduction workbook named 2026-08 holds Sep 2026');
  const groups = async () => p.$$eval('#reconCard details.rgroup[data-rcg]', L => Object.fromEntries(L.map(d => [d.dataset.rcg, d.querySelector('table tbody').rows.length])));
  let G = await groups();
  ok(G.base >= 6, `own bases: ${G.base} people`);
  ok(G.absence === 2, `days taken off for absences: ${G.absence} people`);
  const fits = await p.$$eval('#reconCard .rfits label', L => L.map(l => l.textContent.trim()));
  ok(fits.length >= 1, `absence rules that fit: ${fits.join(' / ')}`);
  const tiles = await p.$$eval('#reconCard .cmptiles .tile', L => L.map(t => t.textContent.replace(/\s+/g, ' ').trim()));
  ok(tiles.length >= 4, `tiles: ${tiles.join(' | ')}`);
  const slips = await p.$eval('#reconCard', c => [...c.querySelectorAll('details.rgroup summary')].map(s => s.textContent.trim()).find(t => /Slips/.test(t)) || '');
  ok(/Slips/.test(slips), `the old workbook's slips: ${slips}`);
  await p.screenshot({ path: path.join(out, 'recon-aug.png'), fullPage: true });

  // the own bases into the rules of the month, logged; the base group goes away
  await p.click('#reconCard [data-rcfix="bases|base"]'); await p.waitForTimeout(400);
  const saved = await p.evaluate(() => { const M = window.__mc, R = M.rulesFor ? M.rulesFor('2026-08') : null, C = R ? R.cards : M.state.cards; return { n: Object.keys((C && C.people) || {}).length, log: ((R && R.v ? R.v.log : M.state.cards.log) || []).map(x => x.what).slice(-1)[0] || '' }; });
  ok(saved.n >= 6, `bases saved in the rules: ${saved.n} · "${saved.log.slice(0, 90)}…"`);
  G = await groups();
  ok(!G.base, `no own-base group after the fix (${JSON.stringify(G)})`);

  // the old earned SR for the two absence cases, as adjustments; then Undo
  await p.click('#reconCard [data-rcfix="earned|absence"]'); await p.waitForTimeout(400);
  const adj = await p.evaluate(() => { const F = window.__mc.state.finals['2026-08']; return F && F.adj ? Object.values(F.adj).filter(a => a.src === 'old-excel').map(a => a.earned) : []; });
  ok(adj.length === 2 && adj.includes(475) && adj.includes(40), `old earned SR taken: ${adj.join(', ')}`);
  G = await groups();
  ok(!G.absence, 'the absence group is gone once the old earned SR is taken');
  const sameNow = await p.$eval('#reconCard .cmptiles .tile.good b', x => +x.textContent);
  await p.click('#toast button'); await p.waitForTimeout(400);
  const undone = await p.evaluate(() => { const F = window.__mc.state.finals['2026-08']; return F && F.adj ? Object.values(F.adj).filter(a => a.src === 'old-excel').length : 0; });
  ok(undone === 0, `Undo takes the adjustments back (the same: ${sameNow} before Undo)`);

  // September: the deduction workbook's typed-over Diff cells
  await p.click('#reconCard [data-rcmonth="2026-09"]'); await p.waitForTimeout(400);
  const ded = await p.$eval('#reconCard', c => { const d = [...c.querySelectorAll('details.rgroup')].find(x => /Deduction workbook/.test(x.querySelector('summary').textContent)); return d ? d.querySelectorAll('tbody tr').length : -1; });
  ok(ded === 3, `deduction workbook: ${ded} Diff cells typed over the rule`);

  // the table pasted from the email
  await p.evaluate(() => { window.__mc.state.wsMonth = '2026-08'; window.__mc.renderWs(); });
  const rows = B.expect.people.slice(0, 5).map(x => [x.nid, x.name, Math.round(x.F * 100) + '%', x.E].join('\t'));
  await p.evaluate(() => { const d = document.querySelector('#reconCard .rpaste'); if (d) d.open = true; });
  await p.fill('#rcPaste', ['Kindly find below the incentive results for Aug 2026:', 'ID\tName\tFinal %\tEarned SR', ...rows].join('\n'));
  await p.click('#reconCard [data-rcpaste]'); await p.waitForTimeout(400);
  const pasted = await p.$$eval('#reconCard .rchip', L => L.map(li => li.textContent.replace(/\s+/g, ' ').trim()).find(t => /Pasted from the email/.test(t)) || '');
  ok(/Aug 2026/.test(pasted), `pasted table: ${pasted.slice(0, 80)}`);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no side scroll on a phone');
  await p.screenshot({ path: path.join(out, 'recon-phone.png'), fullPage: false });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
