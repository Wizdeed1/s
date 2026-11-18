// An attendance sheet's legend is never a person (a supervisor's sheet with its codes written under the names, and another table
// beside them, was read as people called "Absent", "AL", "OFF"... and added to the roster as Virgin · CC). In the browser, as a WFM
// analyst, with made-up people only:
// 1. Import: the made-up September exports and a made-up attendance sheet with a legend under the names (Absent, After over another
//    table's heading, AL, compassion leave, OFF, Unpaid): the people are read, the legend is not, so the checks never say "Not on the
//    roster: Absent".
// 2. Two legend words already in the roster: the checks say so, Remove them takes both out, Undo puts them back.
// 3. Add to the roster refuses a legend word.
// Usage: node test/legend.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js');
const [page0, exp, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
require('./fixture.js'); const F = globalThis.__FIX__;
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Test User', username: 'test.u', role: 'user' }; }, fixture);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc; M.setWs('build'); M.setStep('import'); });
  // ---- 1. a made-up September sheet: three CT people, then the legend under the names and another table's heading beside it
  const sep = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`), off = d => [4, 5, 11, 12, 18, 19, 25, 26].includes(d);
  const ppl = F.roster.filter(q => q.team === 'CT').slice(0, 3);
  const rows = [['Name', 'National ID', 'Team', 'Dep', ...sep], ...ppl.map((q, i) => [q.name, String(q.nid), q.brand, 'CT', ...sep.map((_, j) => (off(j + 1) ? 'OFF' : i === 0 && j === 2 ? 'Absent' : 'Attend'))]),
    [], ['Absent', '', '', '', '', '', 'Attend', 'Rami D.', 'Friendi', 'CT'], ['After', '', '', '', '', '', 'ID', 'Name', 'Team', 'Dep'], ['AL', '', '', '', '', '', 'Attend', 'Hadi E.', 'Friendi', 'CT'],
    ['Attend', '', '', '', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'], ['compassion leave'], ['OFF'], ['Unpaid']];
  const attF = path.join(out, 'CT attendance - Sep 2026 (made-up, with its legend).csv'); fs.writeFileSync(attF, csv(rows));
  const files = fs.readdirSync(exp).filter(f => !/^Book1/.test(f)).map(f => path.join(exp, f)).concat(attF);
  await p.setInputFiles('#picker', files);
  await p.waitForFunction(() => !window.__mc.state.pending.length && window.__mc.state.attRes, null, { timeout: 60000 }); await p.waitForTimeout(500);
  const R = await p.evaluate(names => { const S = window.__mc.state, A = S.attRes; return { unm: A.unmatched.map(u => u.name), got: names.map(n => { const q = S.roster.find(x => x.name === n); const a = q && A.byPerson.get(q._id); return a ? a.days.filter(v => v != null).length : 0; }) }; }, ppl.map(q => q.name));
  ok(R.got.every(n => n === 30) && !R.unm.some(n => Core.notAPerson(n)), `the sheet's people are read (${R.got.join(', ')} days); the legend is not (not on the roster: ${R.unm.join(', ') || 'nobody'})`);
  await p.evaluate(() => window.__mc.openNotes()); await p.waitForTimeout(300);
  let notes = await p.evaluate(() => document.getElementById('notesBody').innerText);
  ok(!/Not on the roster: (Absent|After|AL|Attend|compassion leave|OFF|Unpaid)\b/.test(notes), 'the checks never say "Not on the roster: Absent" (nor AL, OFF, compassion leave…)');
  // ---- 2. two legend words already in the roster (as Add to the roster once made them): the checks say so, Remove them, Undo
  await p.evaluate(() => { const M = window.__mc, S = M.state; S.roster.push({ _id: 'lg1', name: 'Absent', brand: 'Virgin', team: 'CC', nid: '' }, { _id: 'lg2', name: 'compassion leave', brand: 'Virgin', team: 'CC', nid: '' }); M.refresh(); M.openNotes(); });
  await p.waitForTimeout(300);
  notes = await p.evaluate(() => document.getElementById('notesBody').innerText);
  ok(/2 entries in the roster are not a person: "Absent", "compassion leave"/.test(notes) && await p.$('#notesBody [data-rmnp]') !== null, 'the checks: 2 entries in the roster are not a person, with Remove them');
  await p.screenshot({ path: path.join(out, 'legend-notes.png') });
  await p.click('#notesBody [data-rmnp]'); await p.waitForTimeout(300);
  const left = await p.evaluate(() => window.__mc.state.roster.filter(x => ['Absent', 'compassion leave'].includes(x.name)).length);
  const msg = await p.evaluate(() => document.getElementById('toastMsg').textContent);
  ok(left === 0 && /Removed 2 entries that were not a person/.test(msg), `Remove them: out of the roster ("${msg}")`);
  await p.click('#toastAct'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__mc.state.roster.filter(x => ['Absent', 'compassion leave'].includes(x.name)).length) === 2, 'Undo: back in the roster');
  // ---- 3. Add to the roster refuses a legend word
  const before = await p.evaluate(() => window.__mc.state.roster.length);
  await p.evaluate(() => { const S = window.__mc.state; S.attRes.unmatched.push({ name: 'AL', idRaw: '', team: 'Virgin', dep: 'CC', src: 'a sheet', filled: 2 }); const bt = document.createElement('button'); bt.dataset.attadd = String(S.attRes.unmatched.length - 1); bt.id = 'addLegend'; bt.textContent = 'Add to the roster'; document.getElementById('notesBody').appendChild(bt); });
  await p.click('#addLegend'); await p.waitForTimeout(300);
  const add = await p.evaluate(() => ({ n: window.__mc.state.roster.length, msg: document.getElementById('toastMsg').textContent }));
  ok(add.n === before && /"AL" is a day code or a heading from the sheet, not a person: it is not added/.test(add.msg), `Add to the roster: "${add.msg}"`);
  ok(!errs.length, `no errors ${errs.join('; ')}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
