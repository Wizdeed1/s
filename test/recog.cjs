// Recognise files, in the browser, with synthetic files only: nine files dropped at once on Build › Import (the four Genesys exports,
// Book1.csv, the quality team's Final EVAL and the three old workbooks of August), as an admin (who builds and reconciles), with August final. Checks
// that each one went to its place (the slots, Quality for September, Results › Reconcile), that the old final result did not become
// the IDs file, the old deduction workbook did not become this month's attendance and the incentive data did not replace the final
// August, the summary line, the Recognise files panel (the incentive data with Reconcile first), What is it? on a file it does not
// know, a drop on the dashboard with the month conflict, what it learns and forgets, and no errors.
// Usage: node test/recog.cjs [page.html] [exportsDir] [outDir]   (exportsDir from test/exports.cjs)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { oldBooks } = require('./oldbooks.cjs');
const { evalBook } = require('./evalbook.cjs');
const page0 = path.resolve(process.argv[2] || 'final/MC Monthly Report Builder.html'), exp = path.resolve(process.argv[3] || '/tmp/exports');
const out = path.resolve(process.argv[4] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
(async () => {
  const B = await oldBooks(), E = await evalBook(), dir = path.join(out, 'recogfiles'); fs.mkdirSync(dir, { recursive: true });
  const old = ['inc', 'final', 'ded'].map(x => { const f = path.join(dir, B.names[x]); fs.writeFileSync(f, B[x]); return f; });
  const evalF = path.join(dir, 'Final EVAL - September 2026.xlsx'); fs.writeFileSync(evalF, E.bytes);
  const exports = fs.readdirSync(exp).map(f => path.join(exp, f));
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }; try { localStorage.setItem('mc-theme', 'light'); const d = new Date(); localStorage.setItem('mc-today-toast:u0', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } catch (e) { /* none */ } }, [fixture]);   // the day's late reminder already seen: the summary toast stays
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);
  const aug0 = await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = JSON.parse(JSON.stringify(F.history)); M.state.finals = JSON.parse(JSON.stringify(F.finals)); M.state.histVer++; M.state.finVer++; M.setWs('build'); M.setStep('import'); return M.state.history['2026-08'].rows.length; });

  // ---- nine files at once on Import
  await p.setInputFiles('#picker', [...exports, evalF, ...old]);
  await p.waitForFunction(() => !!window.__mc.state.quality['2026-09'] && !window.__mc.state.pending.length, null, { timeout: 30000 });
  await p.waitForSelector('#dRecog:not([hidden]) .rcard', { timeout: 20000 });
  await p.waitForTimeout(400);
  const st = await p.evaluate(() => { const S = window.__mc.state; return { slots: Object.keys(S.slots).filter(k => S.slots[k]).length, ids: !!S.idsFile, att: S.attFiles.map(f => f.name), aug: S.history['2026-08'].rows.length, augSrc: S.history['2026-08'].src, q: Object.keys(S.quality), recon: S.recon ? S.recon.files.map(f => f.name + ' ' + f.month) : [], others: S.others.map(o => o.name) }; });
  ok(st.slots === 4, `the four Genesys exports fill their slots (${st.slots})`);
  ok(st.q.includes('2026-09'), 'the Final EVAL went to Quality for Sep 2026');
  ok(!st.ids, 'the old final result did not become the IDs file');
  ok(!st.att.some(n => /Deduction/.test(n)), `the old deduction workbook is not this month's attendance (${st.att.join(', ') || 'none'})`);
  ok(st.aug === aug0 && st.augSrc === 'Synthetic test data', 'the incentive data did not replace the final August');
  ok(st.recon.some(x => /Final_result_for_Aug.xlsx 2026-08/.test(x)) && st.recon.some(x => /Monthly_Deduction_2026-08.xlsx 2026-09/.test(x)), `old files on Results › Reconcile: ${st.recon.join(' | ')}`);
  ok(st.others.includes('Book1.csv'), 'Book1.csv stays in Other files');
  const log = await p.evaluate(() => window.__mc.impLog().map(x => x.text));
  ok(log.some(t => /Final EVAL for Sep 2026 → Quality/.test(t)) && !log.some(t => /KPI file .*Final EVAL/.test(t)), 'the import log says Final EVAL for Sep 2026 → Quality');
  ok(log.some(t => /Final_result_for_Aug\.xlsx: the old final result of a month of Aug 2026 → Results/.test(t)), 'the import log sends the old final result to Results');
  const toastT = await p.waitForFunction(() => { const t = (document.getElementById('toast') || {}).textContent || ''; return /\d+ files:/.test(t) ? t : null; }, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => p.evaluate(() => (document.getElementById('toast') || {}).textContent || ''));
  ok(/9 files: 4 Genesys exports/.test(toastT) && /Final EVAL for Sep 2026 → Quality/.test(toastT) && /old Excel files? → Results/.test(toastT), `summary: ${toastT.replace(/\s+/g, ' ').slice(0, 160)}`);
  const cards = await p.$$eval('#dRecog .rcard', L => L.map(c => ({ name: c.querySelector('.rcn b').textContent, lead: c.querySelector('.rlead').textContent, first: (c.querySelector('[data-ruse]') || {}).textContent || '', lock: (c.querySelector('.rlock') || {}).textContent || '' })));
  const incCard = cards.find(c => /incentive/.test(c.name));
  ok(incCard && /incentive data workbook/.test(incCard.lead) && /Reconcile/.test(incCard.first) && /final/.test(incCard.lock), `the incentive data card: ${incCard ? incCard.first + ' · ' + incCard.lock.slice(0, 60) : 'missing'}`);
  await p.screenshot({ path: path.join(out, 'recog-panel.png') });
  await p.click('#dRecog .rcard [data-ruse$="|compare"]'); await p.waitForTimeout(600);
  const rc = await p.evaluate(() => (window.__mc.state.recon ? window.__mc.state.recon.files.map(f => f.name) : []));
  ok(rc.some(n => /incentive/.test(n)), 'Use it for Reconcile takes the incentive data to Results');

  // ---- What is it? on the file it does not know; teach it, then forget
  await p.evaluate(() => { window.__mc.setWs('build'); window.__mc.setStep('import'); });
  await p.waitForSelector('#others [data-recog-other]');
  await p.click('#others [data-recog-other]');
  await p.waitForSelector('#dRecog:not([hidden]) .rcard');
  const lead = await p.$eval('#dRecog .rcard .rlead', x => x.textContent);
  ok(/does not know/.test(lead), `What is it? on Book1.csv: "${lead}"`);
  await p.selectOption('#dRecog .rcard [data-rkind]', 'distribution'); await p.waitForTimeout(200);
  await p.click('#dRecog .rcard [data-ruse]'); await p.waitForTimeout(400);
  const learned = await p.evaluate(() => Object.keys(window.__mc.state.recogLearned || {}).length);
  ok(learned === 1, `it remembers the choice by the shape of the columns (${learned})`);
  await p.evaluate(() => window.__mc.recogForget()); await p.waitForTimeout(100);
  ok(await p.evaluate(() => Object.keys(window.__mc.state.recogLearned || {}).length === 0), 'Forget what I taught it');
  await p.evaluate(() => { document.querySelectorAll('aside.drawer:not([hidden]) [data-close]').forEach(x => x.click()); });

  // ---- a drop on the dashboard: the deduction workbook alone, with its month conflict
  await p.evaluate(() => { window.__mc.setWs('dash'); window.__mc.renderWs(); });
  await p.waitForTimeout(300);
  const ded = fs.readFileSync(old[2]);
  await p.evaluate(async ([b64, name]) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const f = new File([u8], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const dt = new DataTransfer(); dt.items.add(f); document.querySelector('main').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, [ded.toString('base64'), path.basename(old[2])]);
  await p.waitForSelector('#dRecog:not([hidden]) .rconf', { timeout: 20000 });
  const conf = await p.$eval('#dRecog .rcard', c => ({ lead: c.querySelector('.rlead').textContent, conf: c.querySelector('.rconf p').textContent, seg: [...c.querySelectorAll('[data-rmonth]')].map(x => x.textContent), first: (c.querySelector('[data-ruse]') || {}).textContent || '' }));
  ok(/Monthly Deduction/.test(conf.lead) && /Sep 2026/.test(conf.conf) && conf.seg.length === 2, `the month conflict: ${conf.conf.slice(0, 110)} [${conf.seg.join(' / ')}]`);
  ok(/Reconcile/.test(conf.first), `first choice: ${conf.first}`);
  await p.screenshot({ path: path.join(out, 'recog-conflict.png') });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no side scroll on a phone');
  await p.screenshot({ path: path.join(out, 'recog-phone.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
