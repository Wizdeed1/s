// No schedule, no attendance: left out of every sheet. The month's model, the monthly workbook (the people with a schedule only;
// the Overview names the others), the setting that puts them back, and the Team › Attendance tab (hidden unless asked, and the
// departments as chips). Usage: node test/nosched.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
// the workbook's text cells, read with Python's zipfile: { strings: [...] }
const strings = file => JSON.parse(execFileSync('python3', ['-I', '-c', `import zipfile,re,json,sys,html
z=zipfile.ZipFile(sys.argv[1]); out=[]
for n in z.namelist():
  if n.startswith('xl/worksheets/') and n.endswith('.xml') or n=='xl/sharedStrings.xml':
    out += [html.unescape(t) for t in re.findall(r'<t[^>]*>(.*?)</t>', z.read(n).decode('utf8'), re.S)]
print(json.dumps(out))`, file]).toString());
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => window.__mc.setStep('import'));
  await p.setInputFiles('#picker', fs.readdirSync(exp).filter(f => /\.csv$/i.test(f) && !/^Book1/.test(f)).map(f => path.join(exp, f)));
  await p.waitForFunction(() => Object.keys(window.__mc.state.slots).length >= 4 && !window.__mc.state.pending.length && window.__mc.state.model, null, { timeout: 30000 });
  const m1 = await p.evaluate(() => { const M = window.__mc.state.model; return { all: M.length, shown: M.filter(x => x.shown).length, ns: M.filter(x => x.noSched).length, nsShown: M.filter(x => x.noSched && x.shown).length }; });
  ok(m1.ns > 100 && m1.nsShown === 0 && m1.shown <= m1.all - m1.ns, `the model: ${m1.ns} of ${m1.all} with no schedule, none of them in the reports (${m1.shown} shown)`);
  // the workbook
  await p.evaluate(() => window.__mc.setStep('export')); await p.click('#build'); await p.waitForSelector('#buildGo');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#buildGo')]);
  const f1 = path.join(out, 'with-filter.xlsx'); await dl.saveAs(f1);
  const S = strings(f1), joined = S.find(x => x.includes('Waleed G.') && x.includes(', ')) || '';
  ok(S.includes('Omar H.') && !S.includes('Waleed G.') && !!joined, 'the workbook lists the people with a schedule; one with none (Waleed G.) is only named in the Overview');
  ok(S.some(x => /^No schedule this month/.test(x)), 'the Overview says why they are left out');
  // the setting off: everyone again
  await p.evaluate(() => { const s = window.__mc.state; s.settings.hideNoSched = false; window.__mc.refresh(); });
  const m2 = await p.evaluate(() => window.__mc.state.model.filter(x => x.shown).length);
  ok(m2 > m1.shown + 100, `Settings off: everyone back in the reports (${m2} shown)`);
  await p.evaluate(() => { const s = window.__mc.state; s.settings.hideNoSched = true; window.__mc.refresh(); });
  // the Attendance tab: a saved row with no scheduled day is hidden until asked; the departments as chips
  await p.evaluate(() => {
    const M = window.__mc, S = M.state, F = window.__FIX__; S.history = JSON.parse(JSON.stringify(F.history)); S.finals = {}; S.histVer++;
    const k = Object.keys(S.history).sort().pop(), H = S.history[k], ND = new Date(H.y, H.m, 0).getDate();
    let n = 0; for (const r of H.rows) { if (!r.d) r.d = 'A'.repeat(ND); if (n < 2 && r.team === 'CC') { r.d = '-'.repeat(ND); delete r.dx; r.adh = null; r._ns = 1; n++; } }
    S.wsMonth = k; M.setWs('team'); S.teamTab = 'att'; M.renderWs();
  });
  await p.waitForTimeout(300);
  const rows = () => p.evaluate(() => document.querySelectorAll('#teamBody .attgrid tbody tr').length);
  const r0 = await rows(), sw = await p.$('#teamBody [data-attns]');
  ok(!!sw && /Show the 2 people with no schedule/.test(await p.evaluate(() => document.querySelector('#teamBody .attfilt .sw').textContent)), 'the Attendance tab hides the 2 people with no schedule and offers to show them');
  await p.click('#teamBody [data-attns]'); await p.waitForTimeout(250); const r1 = await rows();   // the page is drawn again: a click, not a check
  ok(r1 === r0 + 2, `shown when asked (${r0} → ${r1})`);
  await p.click('#teamBody [data-attns]'); await p.waitForTimeout(200);
  await p.click('#teamBody [data-attdep="CT"]'); await p.waitForTimeout(250);
  const ct = await p.evaluate(() => ({ n: document.querySelectorAll('#teamBody .attgrid tbody tr').length, chip: document.querySelector('#teamBody [data-attdep="CT"] .cnt').textContent }));
  ok(ct.n === +ct.chip && ct.n < r0, `the CT chip shows CT only (${ct.n} rows, as its count says)`);
  await p.click('#teamBody [data-attdep="SM"]'); await p.waitForTimeout(250);
  const both = await rows(), sm = +(await p.textContent('#teamBody [data-attdep="SM"] .cnt'));
  ok(both === ct.n + sm, `CT and SM together (${both} = ${ct.n} + ${sm})`);
  await p.screenshot({ path: path.join(out, 'att-chips.png') });
  await p.click('#teamBody [data-attdep=""]'); await p.waitForTimeout(200);
  ok(await rows() === r0, 'All shows every department again');
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
