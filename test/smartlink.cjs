// The Smart-Link attendance on WFM team › Export, in the browser, with the synthetic September 2026 exports (test/exports.cjs) and the
// synthetic roster (made-up people and IDs), as the WFM analyst:
// 1. The card says how many FRiENDi agents go in (FRiENDi and FRiENDi Pay), and from where; Build Smart-Link file downloads
//    "Smart-Link Attendance -Sep 2026.xlsx": Smart-Link's sheet, FRiENDi's agents only (no Virgin), each day's code from the month.
// 2. The shared month wins over the build: a supervisor's correction in it (an AL day) is in the file.
// 3. The file is kept in Saved workbooks, as Smart-Link attendance.
// 4. Late minutes an attendance sheet gave as one Tardy total are in the file (and the deduction email's workbook), corrections or not.
// Usage: node test/smartlink.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js'), Writer2 = require('../js/writer2.js');
require('./fixture.js');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
/** a supervisor's attendance sheet for September 2026 with five FRiENDi and two FRiENDi Pay agents (the exports hold Virgin's only) */
async function frSheet() {
  const R = globalThis.__FIX__.roster.filter(p => p.status !== 'Inactive'), pick = (b, n) => R.filter(p => p.brand === b).slice(0, n), P = [...pick('Friendi', 5), ...pick('Friendi Pay', 2)];
  const S = new Writer2.Styles(), W = new Writer2.Sheet('Sep 2026'), dt = S.get({ numFmt: 'dd-mmm' });
  W.set(1, 1, 'National ID'); W.set(1, 2, 'Name'); for (let d = 1; d <= 30; d++) W.set(1, 2 + d, new Date(Date.UTC(2026, 8, d)), dt);
  P.forEach((p, i) => { W.set(2 + i, 1, Number(p.nid)); W.set(2 + i, 2, p.name); for (let d = 1; d <= 30; d++) W.set(2 + i, 2 + d, [4, 5].includes(new Date(Date.UTC(2026, 8, d)).getUTCDay()) ? 'OFF' : d === 9 + i ? 'SL' : d === 15 && i === 0 ? 20 : 'Attend'); });
  return { bytes: await Writer2.pack([W], S), n: P.length };
}
(async () => {
  const FS = await frSheet(), frPath = path.join(out, 'FRiENDi attendance - Sep 2026.xlsx'); fs.writeFileSync(frPath, FS.bytes);
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' };
    try { const d = new Date(); localStorage.setItem('mc-today-toast:u1', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } catch (e) { /* none */ } }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); M.setStep('import'); });
  await p.setInputFiles('#picker', [...fs.readdirSync(exp).filter(f => !/^Book1/.test(f)).map(f => path.join(exp, f)), frPath]);
  await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4 && window.__mc.state.ctx && window.__mc.state.attRes, null, { timeout: 60000 });
  await p.evaluate(() => window.__mc.setStep('export')); await p.waitForSelector('#slCard #buildSl:not([disabled])', { timeout: 15000 });
  const fr = await p.evaluate(() => { const S = window.__mc.state, A = S.ctx.attendance; return S.model.filter(x => x.shown && /friendi/i.test(x.p.brand) && A && A.get(x.p._id) && A.get(x.p._id).days.some(v => v != null)).length; });
  const card = await p.evaluate(() => ({ name: document.getElementById('slName').textContent, note: document.getElementById('slNote').textContent }));
  ok(card.name === 'Smart-Link Attendance -Sep 2026.xlsx', `the card names the file: ${card.name}`);
  ok(/FRiENDi's agents only: 5 Friendi and 2 Friendi Pay, from this build/.test(card.note) && /National IDs/.test(card.note) && fr === FS.n, `it says who goes in: ${card.note.slice(0, 110)}…`);
  await p.screenshot({ path: path.join(out, 'smartlink-card.png') });

  // ---- 1. the file
  const grab = async () => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#buildSl')]); const f = path.join(out, dl.suggestedFilename()); await dl.saveAs(f); return { name: dl.suggestedFilename(), T: await Core.readXlsx(fs.readFileSync(f)) }; };
  let F = await grab(), R = F.T[0].rows.slice(2).filter(r => r && r.length);
  ok(F.name === 'Smart-Link Attendance -Sep 2026.xlsx' && F.T[0].name === 'SmartLink-Attendance Sep-2026', `downloaded ${F.name}, sheet ${F.T[0].name}`);
  ok(R.length === fr && R.every(r => /^Friendi( Pay)?$/.test(r[2])) && R.some(r => r[2] === 'Friendi Pay'), `FRiENDi's agents only, FRiENDi Pay included, no Virgin (${R.length} rows, ${fr} expected)`);
  ok(R.every(r => typeof r[0] === 'number' && String(r[0]).length === 10), 'each with the National ID, as a number');
  const codes = new Set(R.flatMap(r => r.slice(4, 34)).filter(Boolean));
  ok([...codes].every(c => ['Attend', 'OFF', 'AL', 'SL', 'Absent', 'Unpaid', 'Exam', 'Eid', 'National Day'].includes(c) || typeof c === 'string'), `the day codes: ${[...codes].join(', ')}`);
  ok(R.every(r => r[44] === r[42] && r[43] === r.slice(35, 43).reduce((a, v) => a + v, 0)), 'Scheduled days add up the counts, Actual days are the Attend days');
  const late = R.find(r => r[34] > 0); ok(!!late && late[34] === 20 && late[4 + 14] === 'Attend', `a late day is Attend, its 20 minutes under Tardy (${late ? late[34] : '–'})`);

  // ---- 2. the shared month wins: a supervisor's AL in it is in the file
  const who = await p.evaluate(() => {
    const M = window.__mc, S = M.state, k = '2026-09', A = S.ctx.attendance, x = S.model.find(m => m.shown && /friendi/i.test(m.p.brand) && A.get(m.p._id) && A.get(m.p._id).days[4] === 'Attend');
    const ND = 30, d = A.get(x.p._id).days.map(v => (v == null ? '-' : typeof v === 'number' || v === 'Attend' ? 'A' : v === 'OFF' ? 'O' : v === 'AL' ? 'L' : v === 'SL' ? 'S' : v === 'Absent' ? 'X' : 'V')).join('');
    const rows = S.model.filter(m => m.shown).map(m => { const a = A.get(m.p._id); return { id: m.p.nid, n: m.exp, brand: m.p.brand, team: m.p.team, d: a ? a.days.map(v => (v == null ? '-' : typeof v === 'number' || v === 'Attend' ? 'A' : v === 'OFF' ? 'O' : v === 'AL' ? 'L' : v === 'SL' ? 'S' : v === 'Absent' ? 'X' : 'V')).join('') : '' }; });
    const me = rows.find(r => r.id === x.p.nid); me.d = me.d.slice(0, 4) + 'L' + me.d.slice(5);   // the 5th: AL, as a supervisor corrected it
    S.history[k] = { y: 2026, m: 9, rows, tool: true, at: new Date().toISOString() }; S.histVer++; M.refresh();
    return String(x.p.nid);
  });
  await p.evaluate(() => window.__mc.setStep('export')); await p.waitForTimeout(300);
  const note2 = await p.textContent('#slNote');
  F = await grab(); R = F.T[0].rows.slice(2).filter(r => r && r.length);
  const mine = R.find(r => String(r[0]) === who);
  ok(/from the shared month, with the supervisors' corrections/.test(note2) && mine && mine[4 + 4] === 'AL' && mine[35] >= 1, `the shared month wins: the 5th is AL in the file (${mine ? mine[8] : '–'}), "${note2.slice(0, 80)}…"`);

  // ---- 3. kept in Saved workbooks
  await p.waitForTimeout(500);
  const kept = await p.evaluate(() => [...document.querySelectorAll('#repCard .uplist li')].map(li => li.textContent.replace(/\s+/g, ' ')));
  ok(kept.some(t => /Smart-Link Attendance -Sep 2026\.xlsx/.test(t) && /Smart-Link attendance/.test(t)), `kept in Saved workbooks: ${kept.filter(t => /Smart-Link/.test(t)).map(t => t.slice(0, 80)).join(' | ') || 'none'}`);

  // ---- 4. late minutes an attendance sheet gave as one Tardy total (no minutes on the days): the saved month's total is in the file,
  // also after a supervisor corrects a day, and in the deduction email's workbook too
  const T4 = await p.evaluate(() => {
    const M = window.__mc, S = M.state, k = '2026-09', H = S.history[k], fr = H.rows.filter(r => /friendi/i.test(r.brand)).slice(0, 3);
    fr.forEach((r, i) => { r.d = r.d.replace(/[0-9]/g, 'A'); delete r.dx; r.tardy = [25, 40, 7][i]; });   // days as letters only, the minutes as a total
    const pid = S.roster.find(x => String(x.nid) === String(fr[1].id))._id;
    S.attEditsBy[k] = new Map([[pid, { days: { 6: { v: 'SL' } } }]]); S.attEditsVer++;   // a supervisor's correction on the second one
    S.histVer++; M.refresh(); return fr.map(r => ({ id: String(r.id), name: r.n }));
  });
  await p.evaluate(() => window.__mc.setStep('export')); await p.waitForTimeout(300);
  F = await grab(); R = F.T[0].rows.slice(2).filter(r => r && r.length);
  const tv = T4.map(x => (R.find(r => String(r[0]) === x.id) || [])[34]);
  ok(tv.join(',') === '25,40,7', `a Tardy total kept with the month is in the Smart-Link file, a supervisor's correction or not (${tv.join(', ')})`);
  await p.evaluate(() => { const M = window.__mc, S = M.state; S.mailPick = 'shared'; S.mailSrc = 'shared'; S.mailKind = 'ded'; S.mailStage = 'review'; S.wsMonth = '2026-09'; M.setStep('email'); });
  await p.waitForSelector('#v-email:not([hidden]) #attBtn', { timeout: 15000 });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#attBtn')]);
  const dp = path.join(out, dl.suggestedFilename()); await dl.saveAs(dp);
  const AR = (await Core.readXlsx(fs.readFileSync(dp))).find(t => t.name === 'Attendance Report'), hd = AR.rows[1], ti = hd.indexOf('Tardy');
  const dv = T4.map(x => (AR.rows.find(r => r && r[0] === x.name) || [])[ti]);
  ok(ti > 0 && dv.join(',') === '25,40,7', `the deduction email's workbook has them too (${dv.join(', ')})`);

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
