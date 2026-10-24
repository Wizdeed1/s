// Attendance in the browser, with the synthetic September 2026 exports (test/exports.cjs) and the synthetic roster:
// 1. WFM analyst: Import › Attendance templates lists the CT supervisor (the template departments), the template downloads, is filled
//    in (an absence, a leave over three days, 20 minutes late) and dropped back on Import; the CT people take it, and everyone else
//    (CC and SM) comes from the Schedule and the Agent Status Timeline, with nobody of theirs called missing.
// 2. The deduction email's Save attachment: an .xlsx with only Attendance Report and Monthly Deduction.
// 3. The senior manager's Supervisors page: no Month close card, no Activity; the due days stay as a settings card.
// 4. A CT supervisor's Team › Attendance: Get the template.
// Usage: node test/attflow.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const init = role => ([fx, r]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Test User', username: 'test.u', role: r.role, pid: r.pid || '' }; };
/** fill cells of a sheet the tool wrote (empty styled cells): {ref: number | string} */
function fill(xml, cells) {
  for (const [ref, v] of Object.entries(cells)) {
    const re = new RegExp(`<c r="${ref}" s="(\\d+)"/>`);
    if (!re.test(xml)) throw new Error('no empty cell ' + ref);
    xml = xml.replace(re, typeof v === 'number' ? `<c r="${ref}" s="$1"><v>${v}</v></c>` : `<c r="${ref}" s="$1" t="inlineStr"><is><t>${v}</t></is></c>`);
  }
  return xml;
}
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (role, pid) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${role}: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errs.push(`${role} console: ${m.text()}`); });
    await p.addInitScript(init(role), [fixture, { role, pid }]);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    return p;
  };
  // ---- 1. the WFM analyst: the exports, the template out and back
  const p = await open('user');
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); M.setStep('import'); });
  await p.setInputFiles('#picker', fs.readdirSync(exp).filter(f => !/^Book1/.test(f)).map(f => path.join(exp, f)));
  await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4 && window.__mc.state.attRes, null, { timeout: 60000 });
  const g0 = await p.evaluate(() => { const R = window.__mc.state.attRes; return { auto: !!R.auto, people: R.stats.people }; });
  ok(g0.auto && g0.people >= 40, `before any template: everyone with a schedule counted from Genesys (${g0.people} people)`);
  await p.click('#attTplBtn'); await p.waitForSelector('#dAttTpl:not([hidden]) [data-tpldl]');
  const rows = await p.$$eval('#attTplBody .tpllist li', L => L.map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  ok(rows.length >= 1 && rows.every(t => /CT/.test(t)), `Attendance templates: ${rows.join(' | ')}`);
  await p.screenshot({ path: path.join(out, 'att-templates.png') });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#attTplBody [data-tpldl]')]);
  const tplPath = path.join(out, dl.suggestedFilename()); await dl.saveAs(tplPath);
  ok(/^Attendance - Sep 2026 - .+\.xlsx$/.test(dl.suggestedFilename()), `the template downloads: ${dl.suggestedFilename()}`);
  const T = await Core.readXlsx(fs.readFileSync(tplPath)), team = T.find(t => t.name === 'Team').rows.slice(4).filter(r => r && r[1]).map(r => r[1]);
  ok(team.length >= 3, `its Team sheet lists the CT people (${team.length})`);
  // filled in like a supervisor would: an absence on the 3rd, AL from the 7th to the 9th, 20 minutes late on the 8th
  const z = await Core.readZip(fs.readFileSync(tplPath));
  const entries = await Promise.all(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml'].map(async n => ({ name: n, data: await z.text(n) })));
  const s1 = entries.find(e => e.name === 'xl/worksheets/sheet1.xml');
  s1.data = fill(s1.data, { A5: Core.ymdSerial(2026, 9, 3), C5: team[0], E5: 'Absent', A6: Core.ymdSerial(2026, 9, 7), B6: Core.ymdSerial(2026, 9, 9), C6: team[1], E6: 'AL leave', A7: Core.ymdSerial(2026, 9, 8), C7: team[2], E7: 'Late', F7: 20 });
  const filledPath = path.join(out, 'filled-' + dl.suggestedFilename()); fs.writeFileSync(filledPath, await Core.writeZip(entries));
  await p.keyboard.press('Escape');
  await p.setInputFiles('#picker', [filledPath]);
  await p.waitForFunction(() => window.__mc.state.attFiles.length === 1 && !window.__mc.state.pending.length && window.__mc.state.attRes && !window.__mc.state.attRes.auto, null, { timeout: 30000 });
  const R = await p.evaluate(nm => {
    const M = window.__mc, S = M.state, R = S.attRes, pid = n => (S.roster.find(x => x.name === n) || {})._id, d = n => (R.byPerson.get(pid(n)) || { days: [] }).days;
    return { a: d(nm[0])[2], al: d(nm[1]).slice(6, 9), late: d(nm[2])[7], gen: R.genesys || 0, missingCC: R.missing.filter(x => ['CC', 'SM'].includes(x.team)).length, card: document.getElementById('attCard').textContent.replace(/\s+/g, ' ') };
  }, team);
  ok(R.a === 'Absent' && R.al.join() === 'AL,AL,AL' && R.late === 20, `the template's days: absent ${R.a}, AL ${R.al.join(', ')}, late ${R.late} min`);
  ok(R.gen >= 40 && R.missingCC === 0, `everyone else from Genesys (${R.gen} people), no CC or SM person called missing (${R.missingCC})`);
  ok(/from Genesys/i.test(R.card) && /Attendance templates/i.test(R.card), 'the Import card shows the file and the people from Genesys');
  await p.screenshot({ path: path.join(out, 'att-import.png') });
  // ---- 2. the deduction email's attachment: two sheets
  await p.click('#wfmTabs [data-wt="emails"]'); await p.waitForTimeout(300);
  const ms = await p.$('[data-mailsub="month"]'); if (ms) { await ms.click(); await p.waitForTimeout(400); }
  await p.evaluate(() => { const M = window.__mc; M.state.mailKind = 'ded'; M.state.mailStage = 'review'; M.renderWs(); });
  await p.waitForTimeout(400);
  const att = await p.evaluate(() => /MC Monthly Deduction - \w+ \d{4}\.xlsx/.test(document.body.innerText));
  const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#attBtn')]);
  const xp = path.join(out, d2.suggestedFilename()); await d2.saveAs(xp);
  const X = await Core.readXlsx(fs.readFileSync(xp));
  ok(d2.suggestedFilename() === 'MC Monthly Deduction - Sep 2026.xlsx' && X.map(t => t.name).join('|') === 'Attendance Report|Monthly Deduction', `Save attachment: ${d2.suggestedFilename()} with ${X.map(t => t.name).join(' and ')}`);
  const ar = X[0].rows.filter((r, i) => i >= 2 && r && r[1]).length, mr = X[1].rows.filter((r, i) => i >= 5 && r && r[1]).length;
  ok(ar >= 40 && mr >= 20, `${ar} people in the Attendance Report, ${mr} in the Monthly Deduction`);
  ok(!!att, 'the email says what is attached');
  // ---- 3. the senior manager's Supervisors page
  const s = await open('senior');
  await s.evaluate(() => { const M = window.__mc; M.state.history = window.__FIX__.history; M.state.finals = window.__FIX__.finals; M.state.histVer++; M.state.wsMonth = '2026-09'; M.setWs('cycle'); });
  await s.waitForSelector('#cycleBody .card'); await s.waitForTimeout(300);
  const sv = await s.evaluate(() => ({ cal: !!document.getElementById('calCard'), act: [...document.querySelectorAll('#cycleBody summary')].some(x => /^Activity/.test(x.textContent.trim())), days: !!document.querySelector('#cycleBody details.caldays') }));
  ok(!sv.cal && !sv.act && sv.days, `Supervisors page: no Month close card (${sv.cal}), no Activity (${sv.act}); Due days kept (${sv.days})`);
  const dash = await s.evaluate(() => { window.__mc.setWs('dash'); return !document.querySelector('[data-tgo="cal"]'); });
  ok(dash, 'the dashboard has no button to the old Month close card');
  // a month-close step done outside the tool: Mark done on its line in the bell (a store in memory: this view has none)
  await s.evaluate(() => { const kept = {}; window.__mc.state.db = { doc: p => ({ get: async () => ({ exists: p in kept, data: () => kept[p] }), set: async v => { kept[p] = v; } }) }; });
  await s.click('#bell'); await s.waitForSelector('#notesTodo [data-calmark]', { timeout: 5000 }).catch(() => {});
  const mk = await s.evaluate(() => { const b = document.querySelector('#notesTodo [data-calmark]'); return b ? { id: b.dataset.calmark, line: b.closest('li').textContent.replace(/\s+/g, ' ').trim() } : null; });
  if (mk) { await s.click(`#notesTodo [data-calmark="${mk.id}"]`); await s.waitForTimeout(500); }
  const marked = mk && await s.evaluate(id => Object.values(window.__mc.state.calMarks || {}).some(v => v && v.marks && v.marks[id]) && !document.querySelector(`#notesTodo [data-calmark="${id}"]`), mk.id);
  ok(!!marked, `the bell: Mark done ticks the step and takes its line away (${mk ? mk.line.slice(0, 60) : 'no step to mark'})`);
  const undo = mk && /^Marked done/.test(await s.textContent('#toastMsg')) && await s.isVisible('#toastAct');
  if (undo) { await s.click('#toastAct'); await s.waitForTimeout(500); }
  const back = undo && await s.evaluate(id => !Object.values(window.__mc.state.calMarks || {}).some(v => v && v.marks && v.marks[id]), mk.id);
  ok(!!back, 'a tick by mistake: Undo in the toast takes it back');
  await s.keyboard.press('Escape');
  // ---- 4. a CT supervisor's Team › Attendance
  const sp = await open('spv', 'p6');
  await sp.evaluate(() => { const M = window.__mc; M.state.history = window.__FIX__.history; M.state.histVer++; M.state.wsMonth = '2026-09'; M.state.teamTab = 'att'; M.setWs('team'); });
  await sp.waitForTimeout(500);
  const bar = await sp.evaluate(() => { const b = document.querySelector('.tplbar [data-tplopen]'); return b ? b.textContent.trim() : ''; });
  ok(/get the template/i.test(bar), `Team › Attendance for a CT supervisor: "${bar}"`);
  await sp.click('.tplbar [data-tplopen]'); await sp.waitForSelector('#dAttTpl:not([hidden])');
  const own = await sp.$$eval('#attTplBody [data-tpldl]', L => L.map(x => x.dataset.tpldl));
  ok(own.length === 1 && own[0] === 'p6', `the supervisor sees only their own template (${own.join(', ')})`);
  await sp.screenshot({ path: path.join(out, 'att-spv.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
