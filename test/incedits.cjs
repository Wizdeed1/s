// The month being built follows its corrections, wherever they are made, and so does the incentive file. In the browser, as a WFM
// analyst, with the synthetic September 2026 exports (test/exports.cjs) and made-up people only:
// 1. Corrections already in the shared data when the page opens come in after the month is counted, while the page is on
//    WFM team › Emails: they are counted when they come in (the incentive workbook's Attendance Report has them).
// 2. Corrections made on another computer while the page is open on Emails: a CC agent's day changes, and a CT person with no
//    Genesys day gets their days (no ⚠ any more).
// 3. Build incentive file: the file itself (its Attendance Report) has them, and it is kept for the senior manager.
// 4. A correction after that, from another computer: Export says the kept file is older than the month's corrections; built again,
//    the note says it is saved. A correction typed in the Corrections box here (Apply) is in the incentive workbook too, and the
//    kept file is older again until it is built again.
// 5. The senior manager's incentive email: no warning while the kept file has every correction; one made after it is said, with
//    whom to ask; a file an earlier Cadence kept (it never noted its corrections) is asked for again when its month has some.
// Usage: node test/incedits.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js');
const [page0, exp, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const K = '2026-09';
// a shared store in memory, as the shared data folder behaves: listeners are called later, never inside the call that adds them;
// window.__slow holds back the first answer for the attendance corrections (a slow shared folder), window.__other is another
// computer writing, window.__mem is everything in it (for the senior manager's page)
const store = (mem0, slow) => {
  const S = window.__mc.state, mem = mem0 || {}, subs = [];
  const snap = p => ({ docs: Object.keys(mem).filter(k => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(k => ({ id: k.slice(p.length + 1), data: () => mem[k] })) });
  const fire = id => subs.forEach(s => { if (id.startsWith(s.path + '/')) setTimeout(() => s.cb(snap(s.path)), 0); });
  S.db = { doc: id => ({ set: async v => { mem[id] = JSON.parse(JSON.stringify(v)); fire(id); }, update: async v => { mem[id] = { ...(mem[id] || {}), ...JSON.parse(JSON.stringify(v)) }; fire(id); },
      delete: async () => { delete mem[id]; fire(id); }, get: async () => ({ exists: !!mem[id], data: () => mem[id] }) }),
    collection: p => ({ onSnapshot: cb => { subs.push({ path: p, cb }); setTimeout(() => cb(snap(p)), slow && /^att\//.test(p) ? slow : 0); return () => {}; }, get: async () => snap(p) }) };
  window.__other = (id, v) => { mem[id] = v; fire(id); };
  window.__mem = mem;
};
const day = (v, by = 'Noura B.') => ({ v, note: 'kindly update', by, at: new Date().toISOString(), src: 'update' });
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  // who: a CC agent with Genesys days (Omar), another one for later (Khalid) and a CT person with none (the WFM and managers' case)
  const W = await p.evaluate(K => {
    const R = window.__mc.state.roster, cc = R.filter(x => x.team === 'CC' && x.brand === 'Virgin'), ct = R.find(x => x.team === 'CT');
    return { a: { pid: cc[0]._id, name: cc[0].name }, b: { pid: cc[5]._id, name: cc[5].name }, c: { pid: ct._id, name: ct.name }, k: K };
  }, K);
  // 1. a correction already in the shared data (made yesterday): the page's first answer for it is slow
  const mem0 = { [`att/${K}/edits/${W.b.pid}`]: { days: { 3: day('AL', 'Sara K.') }, n: W.b.name } };
  await p.evaluate(([src, mem0]) => {
    eval(src)(mem0, 2500);
    const M = window.__mc, S = M.state, F = window.__FIX__;
    S.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); S.finals = Object.fromEntries(Object.entries(F.finals).filter(([k]) => k !== '2026-09'));
    S.histVer++; S.finVer++; M.setWs('build');
  }, [`(${store})`, mem0]);
  await p.setInputFiles('#picker', fs.readdirSync(exp).map(f => path.join(exp, f)));
  await p.waitForFunction(() => window.__mc.state.ctx && !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 30000 });
  const toEmails = () => p.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'emails'; M.state.mailSub = 'month'; M.setWs('wfm'); M.renderWs(); });
  const toExport = async () => { await p.evaluate(() => { const M = window.__mc; M.setWs('build'); M.setStep('export'); }); await p.waitForTimeout(300); };
  await toEmails();
  const early = await p.evaluate(pid => { const a = window.__mc.state.ctx.attendance.get(pid); return a ? a.days[2] : null; }, W.b.pid);
  const inc = pids => p.evaluate(pids => { const md = WriterInc.model(window.__mc.state.ctx, {}); return pids.map(pid => { const r = md.att.find(x => x.pid === pid); return r ? { mark: r.mark, days: r.days.slice(0, 7) } : null; }); }, pids);
  await p.waitForTimeout(3200);   // the slow answer comes in while the page is on Emails
  await toExport();
  const [b1] = await inc([W.b.pid]);
  ok(early !== 'AL' && b1 && b1.days[2] === 'AL', `1. a correction already in the shared data, come in after the month was counted: ${W.b.name} 3 Sep ${early} → ${b1 && b1.days[2]}`);
  // 2. two corrections from another computer while the page is on Emails
  const [a0, c0] = await inc([W.a.pid, W.c.pid]);
  await toEmails(); await p.waitForTimeout(200);
  await p.evaluate(W => {
    window.__other(`att/${W.k}/edits/${W.a.pid}`, { days: { 1: { v: 'SL', note: 'sick note', by: 'Noura B.', at: new Date().toISOString(), src: 'update' } }, n: W.a.name });
    const d = v => ({ v, note: 'no Genesys data', by: 'Noura B.', at: new Date().toISOString(), src: 'update' });
    window.__other(`att/${W.k}/edits/${W.c.pid}`, { days: { 1: d('Attend'), 2: d('Attend'), 3: d('Attend'), 4: d('OFF'), 5: d('OFF'), 6: d('Attend'), 7: d('Attend') }, n: W.c.name });
  }, W);
  await p.waitForTimeout(700); await toExport();
  const [a1, c1] = await inc([W.a.pid, W.c.pid]);
  ok(a0.days[0] !== 'SL' && a1.days[0] === 'SL', `2. a correction from another computer, the page on Emails: ${W.a.name} 1 Sep ${a0.days[0]} → ${a1.days[0]}`);
  ok(c0.mark === '⚠ ' && c1.mark === '' && c1.days.join() === 'Attend,Attend,Attend,OFF,OFF,Attend,Attend', `   ${W.c.name} (CT, no Genesys day): ${c0.mark.trim() || '-'} ${c0.days.join(',') || '(empty)'} → ${c1.days.join(',')}`);
  // 3. Build incentive file: the file itself
  const build = async () => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#buildInc')]); const f = path.join(out, 'incedits-' + dl.suggestedFilename()); await dl.saveAs(f); await p.waitForFunction(() => !window.__mc.state.incBuilding, null, { timeout: 30000 }); await p.waitForTimeout(400); return f; };
  const f1 = await build();
  const AR = (await Core.readXlsx(fs.readFileSync(f1))).find(s => s.name === 'Attendance Report').rows;
  const rowOf = name => AR.find(r => r && typeof r[1] === 'string' && r[1].replace(/^⚠ /, '') === name);
  const ra = rowOf(W.a.name), rb = rowOf(W.b.name), rc = rowOf(W.c.name);
  ok(ra && ra[4] === 'SL' && rb && rb[6] === 'AL' && rc && rc[1] === W.c.name && [4, 5, 6, 7, 8, 9, 10].map(i => rc[i]).join() === 'Attend,Attend,Attend,OFF,OFF,Attend,Attend',
    `3. Build incentive file: its Attendance Report has them (${W.a.name} 1 Sep ${ra && ra[4]}, ${W.b.name} 3 Sep ${rb && rb[6]}, ${W.c.name} ${rc && [4, 5, 6, 7, 8, 9, 10].map(i => rc[i]).join(',')})`);
  const note = () => p.evaluate(() => { const n = document.getElementById('incNote'); return { t: n.textContent, warn: n.classList.contains('warnline') }; });
  const n1 = await note();
  ok(/^Saved MC_all_team_incentive _data -2026-09\.xlsx/.test(n1.t) && !n1.warn && await p.evaluate(() => window.__mc.state.attEditsBy['2026-09'].size === 3), `   kept for the senior manager: "${n1.t.slice(0, 70)}…"`);
  // 4. a correction after it, from another computer: the kept file is older; built again, it is not
  await p.evaluate(W => window.__other(`att/${W.k}/edits/${W.c.pid}`, { days: { ...window.__mem[`att/${W.k}/edits/${W.c.pid}`].days, 8: { v: 'SL', note: 'late note', by: 'Noura B.', at: new Date().toISOString(), src: 'update' } }, n: W.c.name }), W);
  await p.waitForTimeout(700);
  const n2 = await note();
  ok(n2.warn && /^The month's corrections changed after the senior manager's incentive file was built \(.+ by Yousef T\.\)\. Build it again so it has them\.$/.test(n2.t), `4. a correction after the file was built: "${n2.t}"`);
  await p.screenshot({ path: path.join(out, 'incedits-export.png') });
  const f2 = await build(), AR2 = (await Core.readXlsx(fs.readFileSync(f2))).find(s => s.name === 'Attendance Report').rows, rc2 = AR2.find(r => r && r[1] === W.c.name);
  const n3 = await note();
  ok(rc2 && rc2[11] === 'SL' && !n3.warn && /^Saved /.test(n3.t), `   built again: ${W.c.name} 8 Sep ${rc2 && rc2[11]}, "${n3.t.slice(0, 40)}…"`);
  // typed here, in the Corrections box
  const t0 = await p.evaluate(() => { const S = window.__mc.state, A = S.ctx.attendance; const q = S.ctx.roster.filter(x => x.team === 'CC' && A.get(x._id) && A.get(x._id).days[9] != null)[7]; return { pid: q._id, name: q.name, d: A.get(q._id).days[9] }; });
  await toEmails(); await p.waitForSelector('#wfmUpd:not([hidden]) [data-updtext]', { timeout: 15000 });
  await p.fill('#wfmUpd [data-updtext]', `${t0.name} AL 10 Sep`); await p.click('#wfmUpd [data-updread]'); await p.waitForSelector('#wfmUpd [data-updapply]', { timeout: 10000 });
  if (await p.$('#wfmUpd [data-updwho="0"]')) { await p.selectOption('#wfmUpd [data-updwho="0"]', t0.pid); await p.waitForTimeout(250); }
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(300);
  const applied = await p.textContent('#toastMsg'); await p.waitForTimeout(600); await toExport();
  const [t1] = await inc([t0.pid]); const n4 = await note();
  ok(t1 && t1.days.length && (await p.evaluate(pid => WriterInc.model(window.__mc.state.ctx, {}).att.find(x => x.pid === pid).days[9], t0.pid)) === 'AL' && n4.warn, `   typed in the Corrections box here: ${t0.name} 10 Sep ${t0.d} → AL in the incentive workbook; the kept file is older again`);
  ok(/^Applied: 1 day for 1 person\. Every sheet, the workbooks and the final email have them; build the incentive file again \(Export\) so the senior manager has them too\.$/.test(applied), `   and Apply said so: "${applied}"`);
  await build(); const n5 = await note();
  ok(!n5.warn, '   built again: saved');
  // 5. the senior manager's incentive email
  const mem = await p.evaluate(() => JSON.stringify(window.__mem)), months = await p.evaluate(() => JSON.stringify({ h: window.__mc.state.history, f: window.__mc.state.finals }));   // the shared months, as the analyst's page has them
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), q = await ctx2.newPage();
  q.on('pageerror', e => errs.push('senior: ' + e.message));
  await q.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u5', name: 'Hana S.', username: 'hana.s', role: 'senior' }; }, [fixture]);
  await q.goto('file://' + path.resolve(page0)); await q.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await q.evaluate(([src, mem, months]) => { eval(src)(JSON.parse(mem), 0); const M = window.__mc, S = M.state, X = JSON.parse(months); S.history = X.h; S.finals = X.f; S.histVer++; S.finVer++; S.wsMonth = '2026-09'; S.cycTab = 'mail'; M.setWs('cycle'); M.renderWs(); }, [`(${store})`, mem, months]);
  await q.waitForFunction(() => window.__mc.state.incWb && window.__mc.state.incWb.saved, null, { timeout: 20000 }); await q.waitForTimeout(600);
  const warns = () => q.evaluate(() => { window.__mc.renderWs(); return [...document.querySelectorAll('#mailWarns li')].map(li => li.textContent); });
  const w0 = await warns();
  ok(!w0.some(x => /corrections changed/.test(x)), `5. the senior manager's incentive email: the kept file has every correction, nothing to say (${w0.length} notes)`);
  await q.evaluate(W => window.__other(`att/${W.k}/edits/${W.a.pid}`, { days: { 1: { v: 'SL', note: 'sick note', by: 'Noura B.', at: new Date().toISOString(), src: 'update' }, 2: { v: 'SL', note: 'one more day', by: 'Noura B.', at: new Date().toISOString(), src: 'update' } }, n: W.a.name }), W);
  await q.waitForTimeout(600);
  const w1 = await warns();
  ok(w1.some(x => /^The month's corrections changed after this incentive file was built \(.+ by Yousef T\.\)\. Ask the WFM analysts to build it again \(WFM team › Export › Build incentive file\); the newer file shows here by itself\.$/.test(x)), `   a correction after it: "${(w1.find(x => /corrections changed/.test(x)) || w1.join(' | ')).slice(0, 140)}…"`);
  await q.screenshot({ path: path.join(out, 'incedits-senior.png') });
  // a file an earlier Cadence kept: it never said which corrections it had, so a month with corrections asks for it once more
  const memOld = JSON.parse(mem); for (const [id, m] of Object.entries(memOld)) if (/^repmeta\//.test(id)) delete m.edits;
  const ctx3 = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), r = await ctx3.newPage();
  r.on('pageerror', e => errs.push('senior, an older file: ' + e.message));
  await r.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u5', name: 'Hana S.', username: 'hana.s', role: 'senior' }; }, [fixture]);
  await r.goto('file://' + path.resolve(page0)); await r.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await r.evaluate(([src, mem, months]) => { eval(src)(JSON.parse(mem), 0); const M = window.__mc, S = M.state, X = JSON.parse(months); S.history = X.h; S.finals = X.f; S.histVer++; S.finVer++; S.wsMonth = '2026-09'; S.cycTab = 'mail'; M.setWs('cycle'); M.renderWs(); }, [`(${store})`, JSON.stringify(memOld), months]);
  await r.waitForFunction(() => window.__mc.state.incWb && window.__mc.state.incWb.saved, null, { timeout: 20000 }); await r.waitForTimeout(600);
  const w2 = await r.evaluate(() => { window.__mc.renderWs(); return [...document.querySelectorAll('#mailWarns li')].map(li => li.textContent); });
  ok(w2.some(x => /^This incentive file \(built .+ by Yousef T\.\) was made by an earlier Cadence and may not have every correction of the month\. Ask the WFM analysts to build it again \(WFM team › Export › Build incentive file\); the newer file shows here by itself\.$/.test(x)) && !w2.some(x => /corrections changed/.test(x)),
    `   a file an earlier Cadence kept, in a month with corrections: "${(w2.find(x => /earlier Cadence/.test(x)) || w2.join(' | ')).slice(0, 120)}…"`);
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  console.log(bad ? `${bad} failed` : 'all passed');
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
