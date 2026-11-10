// WFM team › Report builder, as Member Care Report Builder 15.8, in the browser, as a WFM analyst, made-up exports only:
// 1. The history the tool carries (15.8's built-in one) lies under this browser's copy: its months are there, and a month this
//    browser has keeps its own numbers.
// 2. The day's Genesys exports with the three IVR ones (Flow Outcome Detail, Flow Milestone Detail, Data Actions Performance) and
//    FRiENDi Pay's Ticket Summary Details: each recognised and listed by brand and day; Recognise files sends an IVR export there.
// 3. The IVR box: the share that finished in the IVR, the top outcomes and milestones, and the data actions with errors, in the
//    Virgin email (and Postpaid's, which shares the Virgin IVR).
// 4. MC Leaders: the tickets to exclude of the report day: read, left out of the email, the ones not found named; Clear the list.
// 5. Emails › Daily brand emails: the brand email has IVR scorecard; it opens the card in a drawer of the tool's own, with Copy for
//    Teams and Download PNG (a PNG of the card is saved).
// Usage: node test/rb158.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
const D0 = '10/7/2026 12:00 AM', D1 = '10/8/2026 12:00 AM';   // Wednesday 7 October 2026, as Genesys writes it
const files = {
  'Virgin_Queue_Performance_-_2026-10-08T070512.120.csv': csv([['Queue Name', 'Interval Start', 'Interval End', 'Offer', 'Answer', 'Abandon', 'Service Level %', 'Avg Handle', 'ASA'],
    ['', D0, D1, 1000, 950, 50, '86.5%', '00:03:10', '00:00:21'], ['Virgin Mobile CC', D0, D1, 1000, 950, 50, '86.5%', '00:03:10', '00:00:21']]),
  'Virgin_Flow_Outcome_Detail_-_2026-10-08T070612.120.csv': csv([['Interval Start', 'Interval End', 'Flow Name', 'Outcome Name', 'Attempts'],
    ...[['Main Menu', 1000], ['Balance Inquiry', 300], ['Bill Payment', 120], ['Data Bundle', 80], ['Language', 60], ['Recharge', 40], ['Complaint', 20]].map(([o, n]) => [D0, D1, 'Virgin Main IVR', o, n])]),
  'Virgin_Flow_Milestone_Detail_-_2026-10-08T070712.120.csv': csv([['Interval Start', 'Interval End', 'Flow Name', 'Milestone', 'Hits'],
    ...[['Customer Type Check', 900], ['Transfer to Agent', 420], ['Self Service Balance', 250], ['Self Service Recharge', 100], ['Promo Played', 80], ['Agent Callback', 30]].map(([m, n]) => [D0, D1, 'Virgin Main IVR', m, n])]),
  'Data_Actions_Performance_-_2026-10-08T070812.120.csv': csv([['Interval Start', 'Interval End', 'Action Category', 'Action Name', 'Executions', 'Error %', 'Aggregate or Detailed'],
    [D0, D1, 'Virgin Main IVR', 'Get Balance', 500, 0.02, 'Detailed'], [D0, D1, 'Virgin Main IVR', 'Check Customer', 800, 0, 'Detailed'], [D0, D1, 'Virgin Main IVR', 'Create Callback', 30, 0.1, 'Detailed'],
    [D0, D1, 'Another Flow', 'Lookup', 10, 0.5, 'Detailed'], [D0, D1, '', '', 1340, 0.01, 'Aggregate']]),
  'Ticket Summary Details.csv': csv([['TicketNumber', 'StartedAt', 'Category', 'SubCategory'], ['900001', '2026-10-07 09:10', 'Remittance', 'Technical error'], ['900002', '2026-10-07 11:40', 'Card', 'Already used'], ['900003', '2026-10-07 13:05', 'Remittance', 'Technical error']]),
};
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => {
    eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' };
    // this browser's own copy of the history: one month the built-in history has too, with this browser's numbers
    try { localStorage.setItem('mc.history.v1', JSON.stringify({ virgin: { voice: { monthly: [{ date: '2024-01-01', presented: 1234, handled: 1200, sl: 0.5 }], daily: [] } } })); } catch (e) { /* none */ }
  }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => {   // a shared store in memory, with its collections, so the brand emails reach Emails › Daily brand emails (its listeners
    // are called later, never inside the call that adds them, as a real store does)
    const S = window.__mc.state, mem = {}, subs = [];
    const snap = path => ({ docs: Object.keys(mem).filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/')).map(k => ({ id: k.slice(path.length + 1), data: () => mem[k] })) });
    S.db = { doc: id => ({ set: async v => { mem[id] = v; subs.forEach(s => { if (id.startsWith(s.path + '/')) setTimeout(() => s.cb(snap(s.path)), 0); }); }, update: async v => { mem[id] = { ...(mem[id] || {}), ...v }; }, get: async () => ({ exists: !!mem[id], data: () => mem[id] }) }),
      collection: path => ({ onSnapshot: cb => { subs.push({ path, cb }); setTimeout(() => cb(snap(path)), 0); return () => {}; }, get: async () => snap(path) }) };
    S.wfmTab = 'builder'; window.__mc.setWs('wfm');
  });
  await p.waitForSelector('#wfmRb [data-rbpick]', { timeout: 30000, state: 'attached' });
  // ---- 1. the history the tool carries
  const H = await p.evaluate(() => { const h = window.__mc.rb().hist || {}; const m = ((h.virgin || {}).voice || {}).monthly || []; return { n: m.length, jan24: m.find(r => r.date === '2024-01-01'), aug26: !!m.find(r => r.date === '2026-08-01'), brands: Object.keys(h).sort().join() }; });
  ok(H.brands === 'fpay,friendi,postpaid,virgin' && H.aug26 && H.n >= 32, `the built-in history is there under this browser's: ${H.n} Virgin months, Jan 2024 to Aug 2026, every brand (${H.brands})`);
  ok(H.jan24 && H.jan24.presented === 1234, `a month this browser has keeps its own numbers (Jan 2024: ${H.jan24 && H.jan24.presented} presented)`);
  // ---- 2. the files
  const paths = Object.entries(files).map(([n, t]) => { const f = path.join(out, n); fs.writeFileSync(f, t); return f; });
  await p.setInputFiles('#wfmRb [data-rbpick]', paths);
  await p.waitForFunction(n => window.__mc.rb().files.length >= n, Object.keys(files).length, { timeout: 30000 }); await p.waitForTimeout(800);
  const F = await p.evaluate(() => window.__mc.rb().files.map(f => `${f.bad ? '✗' : ''}${f.label}`));
  ok(F.includes('Virgin · IVR outcomes · 07-Oct') && F.includes('Virgin · IVR milestones · 07-Oct') && F.includes('All flows · IVR data actions · 07-Oct') && F.some(x => /^FRiENDi Pay · Tickets · 3 tickets/.test(x)) && !F.some(x => x.startsWith('✗')),
    `the exports recognised: ${F.join(' | ')}`);
  ok(await p.evaluate(() => window.__mc.rb().date) === '2026-10-07', 'the report day follows the exports: 7 Oct 2026');
  await p.setInputFiles('#recogPicker', paths[1]); await p.waitForSelector('#dRecog:not([hidden]) .rcard', { timeout: 20000 }); await p.waitForTimeout(300);
  const rk = await p.evaluate(() => { const c = document.querySelector('#dRecog .rcard'); return { lead: c.querySelector('.rlead').textContent.replace(/\s+/g, ' '), all: c.textContent, use: (c.querySelector('[data-ruse]') || {}).textContent || '' }; });
  ok(/daily IVR export/.test(rk.lead) && /Flow Outcome Detail/.test(rk.all) && /Report builder/i.test(rk.use), `Recognise files: an IVR export is a daily IVR export, for the Report builder ("${rk.lead.slice(0, 90)}" · ${rk.use.trim()})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // ---- 3. the IVR box
  const ivr = await p.evaluate(() => { const x = (window.__mc.rb().data.virgin || {}).ivr; return x && { calls: x.calls, agent: x.agent, ended: x.ended, out: x.topOutcomes.map(o => o.name).join(','), ms: x.topMilestones.map(o => o.name).join(','), skip: x.skippedMilestones.map(o => o.name).join(','), errs: (x.errors || []).map(e => `${e.name} ${Math.round(e.rate * 100)}%`).join(',') }; });
  ok(ivr && ivr.calls === 1000 && ivr.agent === 450 && ivr.ended === 550, `Virgin's IVR: ${ivr && ivr.calls} calls in, ${ivr && ivr.agent} left for an agent, ${ivr && ivr.ended} finished in the IVR`);
  ok(ivr && ivr.out === 'Balance Inquiry,Bill Payment,Data Bundle,Language,Recharge' && ivr.ms === 'Transfer to Agent,Self Service Balance,Self Service Recharge,Promo Played,Agent Callback' && ivr.skip === 'Customer Type Check',
    `  the top five outcomes after the first menu, and the top milestones without the number check (${ivr && ivr.skip})`);
  ok(ivr && ivr.errs === 'Create Callback 10%,Get Balance 2%', `  the IVR flow's data actions with errors, worst first; another flow's left out (${ivr && ivr.errs})`);
  const box = await p.evaluate(() => { const M = window.__mc.rb().models; const t = k => { const d = document.createElement('div'); d.innerHTML = window.Templater.render(window.TEMPLATES[k === 'postpaid' ? 'virgin' : k], M[k], window.Build.REPORTS[k]); return d.textContent.replace(/\s+/g, ' '); }; return { v: t('virgin'), pp: t('postpaid'), fr: t('friendi') }; });
  ok(/IVR REPORT/.test(box.v) && /Finished in the IVR/.test(box.v) && /55%/.test(box.v) && /Balance Inquiry/.test(box.v) && /Data action errors/.test(box.v) && /Create Callback/.test(box.v), 'the Virgin email has the IVR box: 55% finished in the IVR, its outcomes, milestones and data action errors');
  ok(/IVR REPORT/.test(box.pp) && !/IVR REPORT/.test(box.fr), 'Virgin Postpaid shares the Virgin IVR; FRiENDi (no IVR exports) has no box');
  // ---- 4. MC Leaders: the tickets to exclude
  await p.evaluate(() => {
    const E = window.Engine, RB = window.__mc.rb();
    RB.bag.leaderRows = { name: 'EXECUTIVE TKTs.xlsx', sheet: 'Sheet1', rows: E.leaderTickets(E.sheetPayload([['Call Date', 'Ticket ID', 'Category', 'Sub Category', 'Status', 'Assigned To', 'Life Cycle'],
      ['07/10/2026 09:00', '776220', 'Network', 'No network', 'Closed', 'MC Leaders', '0 Day(s) 2:00:00 Hours'], ['07/10/2026 10:00', '0776221', 'Billing', 'Dispute', 'Open', 'MC Leaders', ''],
      ['07/10/2026 11:00', '776222', 'Network', 'Weak coverage', 'Closed', 'MC Leaders', '0 Day(s) 5:00:00 Hours']])) };
    window.__mc.state.rbActive = 'leaders'; const d = document.querySelector('#wfmRb [data-rbdate]'); d.value = '2026-10-07'; d.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForSelector('#wfmRb [data-rbp="leaders"] textarea[data-rbf="exclude"]', { timeout: 15000 });
  const n0 = await p.evaluate(() => window.__mc.rb().data.leaders.stats.all.total);
  await p.fill('#wfmRb [data-rbf="exclude"]', 'Ticket\tStatus\n776221\tOpen\n776299\tClosed'); await p.waitForTimeout(900);
  const ex = await p.evaluate(() => ({ x: window.__mc.rb().data.leaders.excluded, n: window.__mc.rb().data.leaders.stats.all.total, st: (document.querySelector('#wfmRb .rbexclst [role="status"]') || {}).textContent || '', kept: (window.__mc.state.rbPrefs.leaders.days || {})['2026-10-07'], focus: document.activeElement && document.activeElement.dataset.rbf }));
  ok(ex.x && ex.x.removed.join() === '776221' && ex.x.missing.join() === '776299' && ex.n === n0 - 1, `tickets to exclude: 776221 left out (0776221 in the sheet), 776299 not found (${n0} → ${ex.n} tickets)`);
  await p.evaluate(() => document.querySelector('#wfmRb .rbexcl').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(out, 'rb158-exclude.png') });
  ok(/2 ticket numbers read · 1 left out of the report · not among the MC Leaders tickets dropped: 776299/.test(ex.st) && ex.kept && /776221/.test(ex.kept.exclude) && ex.focus === 'exclude', `  said under the box ("${ex.st}"), kept for the report day, the cursor still in the box`);
  await p.click('#wfmRb [data-rba="exclclear"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !window.__mc.rb().data.leaders.excluded && document.querySelector('#wfmRb [data-rbf="exclude"]').value === ''), '  Clear the list: every MC Leaders ticket back in the email');
  // ---- 5. Emails › Daily brand emails: IVR scorecard
  await p.waitForFunction(() => Object.keys(window.__mc.state.dmail).length > 0, null, { timeout: 15000 });
  await p.evaluate(() => { const S = window.__mc.state; S.mailSub = 'daily'; S.dmActive = 'virgin'; S.wfmTab = 'emails'; window.__mc.setWs('wfm'); });
  await p.waitForSelector('#wfmDm [data-rba="ivr"]', { timeout: 20000 });
  await p.click('#wfmDm [data-rba="ivr"]'); await p.waitForSelector('#dIvr:not([hidden]) #ivrImg', { timeout: 10000 }); await p.waitForTimeout(400);
  const card = await p.evaluate(() => { const i = document.getElementById('ivrImg'); return { w: i.naturalWidth, h: i.naturalHeight, alt: i.alt, sub: document.getElementById('ivrSub').textContent, title: document.getElementById('h-ivr').textContent }; });
  ok(card.w === 1280 && card.h > 600 && /Virgin Mobile/.test(card.alt) && /Balance Inquiry/.test(card.alt) && /Virgin Mobile · /.test(card.sub), `IVR scorecard: the card in a drawer of the tool's own (${card.w}×${card.h}), described for screen readers`);
  await p.screenshot({ path: path.join(out, 'rb158-scorecard.png') });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#dIvr [data-ivr="save"]')]);
  const png = path.join(out, dl.suggestedFilename()); await dl.saveAs(png); const head = fs.readFileSync(png).subarray(0, 8).toString('hex');
  ok(/^IVR-Scorecard-Virgin-Mobile-2026-10-07\.png$/.test(dl.suggestedFilename()) && head === '89504e470d0a1a0a', `Download PNG: ${dl.suggestedFilename()}, a real PNG`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('dIvr').hidden), 'Esc closes it');
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  console.log(bad ? `${bad} failed` : 'all passed');
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
