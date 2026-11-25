// WFM team › Report builder, as Member Care Report Builder 15.8, in the browser, as a WFM analyst, made-up exports only:
// 1. The history the tool carries (15.8's built-in one) lies under this browser's copy: its months are there, and a month this
//    browser has keeps its own numbers.
// 2. The day's Genesys exports with the IVR ones (the Interactions export filtered by the IVR's flow, Flow Outcome Detail, Flow
//    Milestone Detail, Data Actions Performance) and FRiENDi Pay's Ticket Summary Details: each recognised and listed by brand and
//    day; the Interactions export goes to the IVR, not to the WFM Daily Review, and only what the card counts of each call is kept
//    (no caller's number, no agent's name); Recognise files sends the IVR exports there.
// 3. The IVR numbers (for the IVR scorecard), as the WFM team counts them from the Interactions export (23 November 2026): every
//    row a call; deflected = the calls with no queue less those that ended within 40 s (0 s to 40 s), of all the calls;
//    transferred to an agent = the call reached a queue, of all the calls. The top outcomes and milestones (their exports were dropped too), and the data actions with
//    errors, Customer Type included, the most errors first. No brand email has an IVR box (the WFM team took it out), nor a check
//    about it.
// 4. MC Leaders: the tickets to exclude of the report day: read, left out of the email, the ones not found named; Clear the list.
// 5. Emails › Daily brand emails: the Virgin email still has IVR scorecard; it opens the card in a drawer of the tool's own, with
//    Copy for Teams and Download PNG (a PNG of the card is saved), and Open in Outlook (.eml): the IVR Summary Daily Report email
//    with the card written into its body as text and tables (no picture of it), in the shape Word keeps: the calls beside the
//    deflection and the transfers (one cell over their rows), the errors across the card (their share of the data action runs, the
//    count under it), and every action that failed with its errors.
// 6. The IVR's daily record: a week's Interactions export (30 Sep, 5 and 6 Oct) and one day's Data Actions export (5 Oct) dropped
//    after the day's: each day kept on its own (ivr/virgin/days/<day>), the card for 7 Oct shows the closed month (September's
//    total), then October day by day with 7 Oct in red, above the top 5 lists, and so does its email; Download Excel makes October's
//    workbook: a dashboard with the four numbers, the highs and lows and three charts, the daily record with its formulas, the
//    errors by action and day, every action day by day, the menus and the definitions; every part of it well formed.
// Usage: node test/rb158.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
/** the files of a zip (an .xlsx): name -> text */
function unzip(buf) {
  const zlib = require('node:zlib'), out = {}; let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let at = buf.readUInt32LE(e + 16);
  for (let i = 0, n = buf.readUInt16LE(e + 10); i < n; i++) {
    const method = buf.readUInt16LE(at + 10), size = buf.readUInt32LE(at + 20), nl = buf.readUInt16LE(at + 28), xl = buf.readUInt16LE(at + 30), cl = buf.readUInt16LE(at + 32), off = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nl), start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), data = buf.subarray(start, start + size);
    out[name] = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8'); at += 46 + nl + xl + cl;
  }
  return out;
}
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
const D0 = '10/7/2026 12:00 AM', D1 = '10/8/2026 12:00 AM';   // Wednesday 7 October 2026, as Genesys writes it
const files = {
  'Virgin_Queue_Performance_-_2026-10-08T070512.120.csv': csv([['Queue Name', 'Interval Start', 'Interval End', 'Offer', 'Answer', 'Abandon', 'Service Level %', 'Avg Handle', 'ASA'],
    ['', D0, D1, 1000, 950, 50, '86.5%', '00:03:10', '00:00:21'], ['Virgin Mobile CC', D0, D1, 1000, 950, 50, '86.5%', '00:03:10', '00:00:21']]),
  // the IVR exports mark abandoned calls (Abandoned: Yes): those are left out of every number
  'Virgin_Flow_Outcome_Detail_-_2026-10-08T070612.120.csv': csv([['Interval Start', 'Interval End', 'Flow Name', 'Outcome Name', 'Attempts', 'Abandoned'],
    ...[['Main Menu', 1000], ['Balance Inquiry', 300], ['Bill Payment', 120], ['Data Bundle', 80], ['Language', 60], ['Recharge', 40], ['Complaint', 20]].map(([o, n]) => [D0, D1, 'Virgin Main IVR', o, n, 'No']),
    [D0, D1, 'Virgin Main IVR', 'Main Menu', 40, 'Yes'], [D0, D1, 'Virgin Main IVR', 'Balance Inquiry', 15, 'Yes']]),
  'Virgin_Flow_Milestone_Detail_-_2026-10-08T070712.120.csv': csv([['Interval Start', 'Interval End', 'Flow Name', 'Milestone', 'Hits', 'Abandoned'],
    ...[['Customer Type Check', 900], ['Transfer to Agent', 420], ['Self Service Balance', 250], ['Self Service Recharge', 100], ['Promo Played', 80], ['Agent Callback', 30], ['Transfer_Billing', 25], ['Billing_ReachAgent', 15], ['ReachedAgent', 10]].map(([m, n]) => [D0, D1, 'Virgin Main IVR', m, n, 'No']),
    [D0, D1, 'Virgin Main IVR', 'Transfer to Agent', 12, 'Yes']]),
  'Data_Actions_Performance_-_2026-10-08T070812.120.csv': csv([['Interval Start', 'Interval End', 'Action Category', 'Action Name', 'Executions', 'Error %', 'Aggregate or Detailed'],
    [D0, D1, 'Virgin Main IVR', 'Get Balance', 500, 0.02, 'Detailed'], [D0, D1, 'Virgin Main IVR', 'Check Customer', 800, 0, 'Detailed'], [D0, D1, 'Virgin Main IVR', 'Customer_Type', 3000, 0.03, 'Detailed'], [D0, D1, 'Virgin Main IVR', 'Create Callback', 30, 0.1, 'Detailed'],
    [D0, D1, 'Another Flow', 'Lookup', 10, 0.5, 'Detailed'], [D0, D1, '', '', 1340, 0.01, 'Aggregate']]),
  // the IVR's own Interactions export (filtered by its flow), made up: 40 calls; 22 reached a queue (20 an agent took, 2 left in the
  // queue, one of them within 40 s: not deflected), 18 with no queue: 7 ended within 40 s (30 s and 31 s among them), 11 later
  'Interactions_-_2026-10-08T070912.120.csv': csv([['Full Export Completed', 'Partial Result Timestamp', 'Filters', 'Media Type', 'Users', 'Remote', 'Date', 'Duration', 'Direction', 'Queue', 'Wrap-up', 'ANI', 'Disconnect Type', 'Error Code'],
    ...[...Array.from({ length: 20 }, (_, i) => [`Agent ${String.fromCharCode(65 + i)}.`, 'Virgin_Ar', 100 + 7 * i, 'Agent']), ['', 'Virgin_En', 45, 'External'], ['', 'Virgin_En', 80, 'External'],
      ...[0.8, 5, 12.5, 18, 25, 30, 31, 45, 52, 59.9, 60, 61.2, 75, 90, 120, 200, 300, 61].map(d => ['', '', d, d > 250 ? 'System' : 'External'])]
      .map(([u, q, d, x], i) => ['YES', '', 'Flows: Virgin Main IVR', 'voice', u, 'Mobile Number, Example', `10/7/26 ${String(8 + (i % 4)).padStart(2, '0')}:${String(i).padStart(2, '0')} AM`, String(d), 'Inbound', q, '', `tel:+1000000${String(i).padStart(4, '0')}`, x, i === 3 ? 'error.ininedgecontrol.session.inactive' : ''])]),
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
  await p.clock.setFixedTime(new Date('2026-10-08T10:00:00'));   // the day after the made-up report day (report days older than 40 days are taken out)
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
  ok(F.includes('Virgin · IVR calls (Interactions) · 07-Oct') && F.includes('Virgin · IVR outcomes · 07-Oct') && F.includes('Virgin · IVR milestones · 07-Oct') && F.includes('All flows · IVR data actions · 07-Oct') && F.some(x => /^FRiENDi Pay · Tickets · 3 tickets/.test(x)) && !F.some(x => x.startsWith('✗')),
    `the exports recognised: ${F.join(' | ')}`);
  const kept = await p.evaluate(() => { const RB = window.__mc.rb(), r = ((RB.bag.dated.ivrInt || {}).virgin || {})['2026-10-07'] || [], wfm = window.WFM && window.WFM.state ? JSON.stringify(Object.keys(window.WFM.state.files || {})) : '';
    return { n: r.length, keys: [...new Set(r.flatMap(x => Object.keys(x)))].sort().join(), leak: JSON.stringify(r).match(/tel:|Agent [A-Z]\.|Virgin_|Mobile Number|session\.inactive/g) || [], wfm }; });
  ok(kept.n === 40 && kept.keys === 'Date,Duration,Flow Name,Queue' && !kept.leak.length && !/interactions/.test(kept.wfm),
    `  the Interactions export of the IVR's flow: for the IVR, not the WFM Daily Review; of each of its ${kept.n} calls only ${kept.keys} (no number, no name${kept.leak.length ? '; found: ' + kept.leak.join(', ') : ''})`);
  const U = await p.evaluate(() => { const r = (q, d, u) => ({ Queue: q, Duration: d, Users: u }); return window.Engine.ivrInteractions([r('', '0', ''), r('', '40', ''), r('', '40.001', ''), r('', '00:00:39', ''), r('', '60', ''), r('Virgin_Ar', '10', ''), r('Virgin_Ar', '200', 'Agent A.'), r('', '', '')]); });
  // the Data Actions export as Genesys writes it today: an Errors column (the count itself), other categories (Genesys Cloud Data
  // Actions) and the roll-ups left out
  const DA = await p.evaluate(() => { const r = (c, n, x, e, er, a) => ({ 'Aggregate or Detailed': a || 'Detailed', 'Action Category': c, 'Action Name': n, 'Executions': x, 'Error %': e, 'Errors': er });
    const o = window.Engine.dataActionErrors([r('Flow X', 'Customer_Type', '2889', '0.01', '16'), r('Flow X', 'Survey Rating', '1015', '0.00', '4'), r('Flow X', 'Get Offer', '700', '0', '0'),
      r('Genesys Cloud Data Actions', 'Insert Welcome', '435', '1.00', '435'), r('Flow X', '', '4604', '0.00', '20', 'Aggregate'), r('', '', '5039', '0.09', '455', '')], ['Flow X'], 'virgin');
    return { all: o.all.map(e => `${e.name} ${e.errors}/${e.runs}`).join(','), runs: o.runs, errors: o.errors, actions: o.actions }; });
  ok(DA.all === 'Customer_Type 16/2889,Survey Rating 4/1015' && DA.runs === 4604 && DA.errors === 20 && DA.actions === 3, `  the Errors column read as the count (0.00% with 4 errors kept), another category and the roll-ups left out (${DA.all}: ${DA.errors} of ${DA.runs} runs)`);
  ok(U.calls === 8 && U.noQueue === 6 && U.quick === 3 && U.deflected === 3 && U.queued === 2 && U.within === 40,
    `  the rule: the calls with no queue less those within 0 s to 40 s (40 s itself in, 40.001 s out, 00:00:39 read too) are the deflected, of all the calls (one with no duration is not taken off, as a filter on the duration would not take it off); a queued call never deflected and always a transfer, an agent's name or not (${U.noQueue} with no queue less ${U.quick} = ${U.deflected} of ${U.calls}; ${U.queued} queued)`);
  ok(await p.evaluate(() => window.__mc.rb().date) === '2026-10-07', 'the report day follows the exports: 7 Oct 2026');
  await p.setInputFiles('#recogPicker', paths[1]); await p.waitForSelector('#dRecog:not([hidden]) .rcard', { timeout: 20000 }); await p.waitForTimeout(300);
  const rk = await p.evaluate(() => { const c = document.querySelector('#dRecog .rcard'); return { lead: c.querySelector('.rlead').textContent.replace(/\s+/g, ' '), all: c.textContent, use: (c.querySelector('[data-ruse]') || {}).textContent || '' }; });
  ok(/daily IVR export/.test(rk.lead) && /Flow Outcome Detail/.test(rk.all) && /Report builder/i.test(rk.use), `Recognise files: an IVR export is a daily IVR export, for the Report builder ("${rk.lead.slice(0, 90)}" · ${rk.use.trim()})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.setInputFiles('#recogPicker', paths[4]); await p.waitForSelector('#dRecog:not([hidden]) .rcard', { timeout: 20000 }); await p.waitForTimeout(300);
  const rk2 = await p.evaluate(() => { const c = document.querySelector('#dRecog .rcard'); return { lead: c.querySelector('.rlead').textContent.replace(/\s+/g, ' '), all: c.textContent.replace(/\s+/g, ' ') }; });
  ok(/daily IVR export/.test(rk2.lead) && /Interactions export of an IVR flow/.test(rk2.all), `Recognise files: the Interactions export of the IVR's flow is a daily IVR export too, not the WFM Daily Review's ("${rk2.lead.slice(0, 80)}")`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // ---- 3. the IVR box
  const ivr = await p.evaluate(() => { const x = (window.__mc.rb().data.virgin || {}).ivr; return x && { ix: x.ix || {}, lists: x.lists, out: x.topOutcomes.map(o => o.name).join(','), ms: x.topMilestones.map(o => o.name).join(','), skip: x.skippedMilestones.map(o => o.name).join(','),
    errs: (x.errorsAll || []).map(e => `${e.name} ${e.errors}/${e.runs}`).join(','), runs: x.runs, errorsN: x.errorsN, actions: x.actions }; });
  const ix = (ivr && ivr.ix) || {};
  ok(ix.calls === 40 && ix.noQueue === 18 && ix.quick === 7 && ix.deflected === 11 && ix.queued === 22, `Virgin's IVR, from the Interactions export: ${ix.calls} calls; ${ix.noQueue} with no queue less ${ix.quick} within 40 s = ${ix.deflected} deflected; ${ix.queued} reached a queue (two an agent did not take among them; a queued call within 40 s not counted)`);
  ok(ivr && ivr.lists && ivr.out === 'Balance Inquiry,Bill Payment,Data Bundle,Language,Recharge' && ivr.ms === 'Self Service Balance,Self Service Recharge,Promo Played,Agent Callback' && ivr.skip === 'Customer Type Check',
    `  the top five outcomes after the first menu, and the top milestones without the number check (${ivr && ivr.skip}), ReachedAgent, ReachAgent or a Transfer (${ivr && ivr.ms}): their exports were dropped too`);
  ok(ivr && ivr.errs === 'Customer_Type 90/3000,Get Balance 10/500,Create Callback 3/30' && ivr.errorsN === 103 && ivr.runs === 4330 && ivr.actions === 4,
    `  the IVR flow's data actions with errors, Customer Type included, the most errors first; another flow's and the roll-up left out (${ivr && ivr.errs}: ${ivr && ivr.errorsN} errors of ${ivr && ivr.runs} runs)`);
  const box = await p.evaluate(() => { const RB = window.__mc.rb(), M = RB.models, txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' '); }; const o = {}; for (const k of ['virgin', 'postpaid', 'friendi', 'fpay']) o[k] = { t: txt(window.Templater.render(window.TEMPLATES[k === 'postpaid' ? 'virgin' : k], M[k], window.Build.REPORTS[k])), r: txt(window.Render.renderEmail(M[k])), w: (RB.data[k].warnings || []).join(' | ') }; return o; });
  const IVRBOX = /IVR REPORT|Finished in the IVR|Top 5 outcomes|Top 5 milestones|Data action errors|Balance Inquiry|Create Callback/;
  ok(Object.values(box).every(b => !IVRBOX.test(b.t) && !IVRBOX.test(b.r) && !/IVR/.test(b.w)) && /Calls Presented|Inbound Voice/i.test(box.virgin.t), `no IVR box in any brand email (Virgin, Postpaid, FRiENDi, FRiENDi Pay; the template and the plain one), and no check about it (Virgin: "${box.virgin.w.slice(0, 80)}")`);
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
  ok(card.w === 1280 && card.h > 600 && /Balance Inquiry/.test(card.alt) && /Virgin Mobile · /.test(card.sub), `IVR scorecard: the card in a drawer of the tool's own (${card.w}×${card.h}), described for screen readers`);
  const names = ['IVR Summary daily report · Wed, 7 Oct 2026.', 'Virgin Main IVR flow · 24 hours.', 'IVR Calls: 40, calls into Virgin Main IVR.', 'IVR deflection · over 40s: 28%, 11 of 40 calls (18 with no queue, less 7 within 40 s).',
    'Transfer to Agent: 55%, 22 of 40 calls reached a queue.', 'Errors: 2.4%, 103 errors of 4,330 data action runs.', 'Top milestones: Self Service Balance 250, Self Service Recharge 100, Promo Played 80, Agent Callback 30.',
    'Data action errors: Customer_Type 90 errors, 3% of 3,000 runs; Get Balance 10 errors, 2% of 500 runs; Create Callback 3 errors, 10% of 30 runs.'];
  ok(names.every(t => card.alt.includes(t)) && !/visits to|abandoned left out|worst:|ReachedAgent|ReachAgent|Transfer_Billing|under 60s|under 30s|0–40s/.test(card.alt), `  the team's names on the card: the calls, the deflection (the calls with no queue less those within 40 s, of all the calls; no 60 s or 30 s any more), the transfers (queued calls), the errors, every failing action: "${card.alt.slice(0, 220)}…"${names.filter(t => !card.alt.includes(t)).map(t => ' MISSING: ' + t).join('')}`);
  await p.screenshot({ path: path.join(out, 'rb158-scorecard.png') });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#dIvr [data-ivr="save"]')]);
  const png = path.join(out, dl.suggestedFilename()); await dl.saveAs(png); const head = fs.readFileSync(png).subarray(0, 8).toString('hex');
  ok(/^IVR-Scorecard-Virgin-Mobile-2026-10-07\.png$/.test(dl.suggestedFilename()) && head === '89504e470d0a1a0a', `Download PNG: ${dl.suggestedFilename()}, a real PNG`);
  // the IVR Summary Daily Report email (.eml), as the WFM team sends it
  const [de] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#dIvr [data-ivr="eml"]')]);
  const emlP = path.join(out, de.suggestedFilename()); await de.saveAs(emlP); const eml = fs.readFileSync(emlP, 'latin1');
  const parts = eml.split(/\r\n--[^\r\n]+\r\n/).slice(1), part = t => parts.find(x => x.startsWith('Content-Type: ' + t));
  const body = s => Buffer.from(s.split('\r\n\r\n').slice(1).join('').replace(/[\r\n-]|--.*$/g, ''), 'base64');
  const html = part('text/html') ? body(part('text/html')).toString('utf8') : '', gifP = part('image/gif');
  const cids = [...html.matchAll(/src="cid:([^"]+)"/g)].map(m => m[1]), own = x => (x && (x.match(/Content-ID: <([^>]+)>/) || [])[1]) || '';
  const gifB = gifP ? body(gifP) : Buffer.alloc(0), pics = parts.filter(x => /^Content-Type: image\//.test(x)).length;
  ok(/^IVR-Summary-Daily-Report-2026-10-07\.eml$/.test(de.suggestedFilename()) && /^X-Unsent: 1\r\nSubject: IVR Summary Daily Report\r\n/.test(eml)
    && /MC Workforce/.test(html) && /IVR Summary Daily Report/.test(html) && /Beyond One &copy; All Rights Reserved\./.test(html) && /7051 Prince Sultan Rd, As Salamah, Jeddah 23525/.test(html)
    && pics === 1 && cids.length === 1 && cids[0] === own(gifP) && gifB.subarray(0, 6).toString() === 'GIF89a' && !/image\/png/i.test(eml),
    `Open in Outlook (.eml): ${de.suggestedFilename()}, "IVR Summary Daily Report", the team's header and footer; its one picture is the moving Beyond One mark (no PNG of the card)`);
  // the card written into the body: the words and numbers as text, the bars as table cells as long as their numbers
  const mt = await p.evaluate(h => {
    const d = new DOMParser().parseFromString(h.replace(/</g, ' <'), 'text/html'), dark = [...d.querySelectorAll('td[bgcolor="#201e1d"][style*="height:6.0pt"]')].map(td => +td.getAttribute('width'));
    return { txt: d.body.textContent.replace(/\s+/g, ' '), dark, imgs: d.images.length };
  }, html);
  const said = ['IVR SCORECARD IVR Summary daily report · Wed, 7 Oct 2026 Virgin Main IVR flow · 24 hours', 'IVR CALLS 40 calls into Virgin Main IVR', 'IVR DEFLECTION · OVER 40S 28% 11 of 40 calls (18 with no queue, less 7 within 40 s)',
    'TRANSFER TO AGENT 55% 22 of 40 calls reached a queue', 'ERRORS 2.4% 103 errors of 4,330 data action runs', 'TOP 5 OUTCOMES · ATTEMPTS After Main Menu · 1,000 Balance Inquiry 300 Bill Payment 120 Data Bundle 80 Language 60 Recharge 40',
    'TOP 5 MILESTONES · HITS After Customer Type Check · 900 Self Service Balance 250 Self Service Recharge 100 Promo Played 80 Agent Callback 30',
    'DATA ACTION ERRORS · VIRGIN MAIN IVR Customer_Type 90 errors 3% of 3,000 runs Get Balance 10 errors 2% of 500 runs Create Callback 3 errors 10% of 30 runs',
    'IVR deflection = calls with no queue, less those that ended within 40 s, of all IVR calls. Transfer to Agent = calls that reached a queue, of all IVR calls. Errors = data action runs that failed, of all the flow’s runs, Customer Type included.'];
  const missing = said.filter(x => !mt.txt.includes(x));
  const order = ['IVR CALLS', 'IVR DEFLECTION · OVER 40S', 'TRANSFER TO AGENT', 'ERRORS'].map(x => mt.txt.indexOf(x));
  ok(!missing.length && mt.imgs === 1 && !/ReachedAgent|Transfer_Billing|UNDER 60S|UNDER 30S/.test(mt.txt) && order.every((v, i) => v >= 0 && (!i || v > order[i - 1])) && /<td width="339"[^>]*rowspan="3"/.test(html) && /<td width="688"[^>]*colspan="3"/.test(html),
    `  the card in the body as text: the calls beside the deflection and the transfers (one cell over their rows), the errors across the card, both top 5 lists and every failing action, Customer Type included${missing.length ? '; missing: ' + missing.join(' | ') : ''}`);
  ok(mt.dark.join() === '280,112,75,56,37,280,112,90,34', `  the bars as table cells, each as long as its number against the top one (${mt.dark.join(', ')} of 280 px)`);
  // the shape Word keeps (Outlook writes mail with Word): a table never ends a cell, two tables never touch, every paragraph has its text's size
  const from = html.indexOf('padding:.5in 42.0pt .5in 42.0pt">'), mail = html.slice(from, html.indexOf('border-top:solid #F1F5F9', from));
  const sized = [...mail.matchAll(/<p class="MsoNormal"[^>]*style="([^"]*)"/g)].map(m => m[1]);
  ok(from > 0 && /IVR SCORECARD/.test(mail) && !/<\/table>\s*<\/td>/.test(mail) && !/<\/table>\s*<table/.test(mail) && sized.length > 60 && sized.every(st => /font-size:[\d.]+pt/.test(st)),
    `  written as Word keeps it: every cell ends with a paragraph, a paragraph between two tables, all ${sized.length} paragraphs sized`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('dIvr').hidden), 'Esc closes it');

  // ---- 6. the IVR's daily record
  const IH = ['Full Export Completed', 'Partial Result Timestamp', 'Filters', 'Media Type', 'Users', 'Remote', 'Date', 'Duration', 'Direction', 'Queue', 'Wrap-up', 'ANI', 'Disconnect Type', 'Error Code'];
  const ivrRows = (md, plan) => plan.map(([q, d], i) => ['YES', '', 'Flows: Virgin Main IVR', 'voice', q ? 'Agent Z.' : '', 'Mobile Number, Example', `${md}/26 ${String(9 + (i % 3)).padStart(2, '0')}:${String(i).padStart(2, '0')} AM`, String(d), 'Inbound', q, '', `tel:+1000009${String(i).padStart(4, '0')}`, 'External', '']);
  const plan = (queued, quick, long) => [...Array(queued).fill(['Virgin_Ar', 90]), ...Array(quick).fill(['', 20]), ...Array(long).fill(['', 75])];
  const more = {
    // 30 Sep: 10 calls, 4 queued, 6 with no queue (3 within 40 s); 5 Oct: 20, 8, 12 (5); 6 Oct: 16, 10, 6 (2)
    'Interactions_-_2026-10-07T081012.120.csv': csv([IH, ...ivrRows('9/30', plan(4, 3, 3)), ...ivrRows('10/5', plan(8, 5, 7)), ...ivrRows('10/6', plan(10, 2, 4))]),
    // 5 Oct only: 6 Oct has no Data Actions export
    'Data_Actions_Performance_-_2026-10-06T081112.120.csv': csv([['Interval Start', 'Interval End', 'Action Category', 'Action Name', 'Executions', 'Error %', 'Aggregate or Detailed'],
      ['10/5/2026 12:00 AM', '10/6/2026 12:00 AM', 'Virgin Main IVR', 'Customer_Type', 1000, 0.01, 'Detailed'], ['10/5/2026 12:00 AM', '10/6/2026 12:00 AM', 'Virgin Main IVR', 'Get Balance', 200, 0.05, 'Detailed'],
      ['10/5/2026 12:00 AM', '10/6/2026 12:00 AM', 'Virgin Main IVR', 'Check Customer', 300, 0, 'Detailed']]),
  };
  const mp = Object.entries(more).map(([n, t]) => { const f = path.join(out, n); fs.writeFileSync(f, t); return f; });
  await p.evaluate(() => { const S = window.__mc.state; S.wfmTab = 'builder'; window.__mc.setWs('wfm'); });
  await p.waitForSelector('#wfmRb [data-rbpick]', { timeout: 30000, state: 'attached' });
  const nf = await p.evaluate(() => window.__mc.rb().files.length);
  await p.setInputFiles('#wfmRb [data-rbpick]', mp);
  await p.waitForFunction(n => window.__mc.rb().files.length >= n, nf + 2, { timeout: 30000 }); await p.waitForTimeout(1500);
  const recs = await p.evaluate(async () => { const sn = await window.__mc.state.db.collection('ivr/virgin/days').get(); return sn.docs.map(d => { const x = d.data(); return `${x.date} ${x.calls}/${x.noQueue}/${x.quick}/${x.deflected}/${x.queued} ${x.da ? x.errorsN + '/' + x.runs : 'no-da'}${x.by ? '' : ' (no by)'}${/tel:|Agent Z|Mobile Number/.test(JSON.stringify(x)) ? ' LEAK' : ''}`; }).sort(); });
  ok(recs.join(' | ') === '2026-09-30 10/6/3/3/4 no-da | 2026-10-05 20/12/5/7/8 20/1500 | 2026-10-06 16/6/2/4/10 no-da | 2026-10-07 40/18/7/11/22 103/4330',
    `the IVR's daily record: every day dropped kept on its own, the week's Interactions export split by day, the Data Actions where there was one, who and when, no number or name (${recs.join(' | ')})`);
  const recDate = await p.evaluate(() => window.__mc.rb().date);
  ok(recDate === '2026-10-07', `  the report day stays the latest (${recDate})`);
  await p.evaluate(() => { const S = window.__mc.state; S.mailSub = 'daily'; S.dmActive = 'virgin'; S.wfmTab = 'emails'; window.__mc.setWs('wfm'); });
  await p.waitForSelector('#wfmDm [data-rba="ivr"]', { timeout: 20000 });
  await p.click('#wfmDm [data-rba="ivr"]'); await p.waitForSelector('#dIvr:not([hidden]) #ivrImg', { timeout: 10000 }); await p.waitForTimeout(400);
  const card2 = await p.evaluate(() => ({ alt: document.getElementById('ivrImg').alt, h: document.getElementById('ivrImg').naturalHeight, st: document.getElementById('ivrStatus').textContent }));
  const recSaid = 'Daily record, Monthly totals, then October day by day, from 5 Oct · the report day in red: '
    + 'Sep-26, IVR calls 10, Within 40s 3, Deflection 30%, Transfer 40%, Errors –, Error rate –; '
    + '05-Oct, IVR calls 20, Within 40s 5, Deflection 35%, Transfer 40%, Errors 20, Error rate 1.3%; '
    + '06-Oct, IVR calls 16, Within 40s 2, Deflection 25%, Transfer 63%, Errors –, Error rate –; '
    + '07-Oct, IVR calls 40, Within 40s 7, Deflection 28%, Transfer 55%, Errors 103, Error rate 2.4%.';
  const iRec = card2.alt.indexOf('Daily record'), iTop = card2.alt.indexOf('Top outcomes');
  ok(card2.alt.includes(recSaid) && iRec > card2.alt.indexOf('Errors: 2.4%') && iRec < iTop && /Daily record: 3 days of October/.test(card2.st),
    `  the card for 7 Oct: September's total, then October day by day from 5 Oct, 7 Oct in red, under the tiles and above the top 5 lists ("${card2.st}"; ${card2.h} px tall)${card2.alt.includes(recSaid) ? '' : ' GOT: ' + card2.alt.slice(iRec, iRec + 700)}`);
  await p.screenshot({ path: path.join(out, 'rb158-record.png') });
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#dIvr [data-ivr="save"]')]);
  await dl2.saveAs(path.join(out, 'IVR-Scorecard-record-' + dl2.suggestedFilename()));
  // the email: the same record as a table, between the tiles and the top 5 lists
  const [de2] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#dIvr [data-ivr="eml"]')]);
  const eml2 = fs.readFileSync(await de2.path(), 'latin1'), parts2 = eml2.split(/\r\n--[^\r\n]+\r\n/).slice(1), hp = parts2.find(x => x.startsWith('Content-Type: text/html'));
  const html2 = hp ? body(hp).toString('utf8') : '';
  const mt2 = await p.evaluate(h => { const d = new DOMParser().parseFromString(h.replace(/</g, ' <'), 'text/html'); return d.body.textContent.replace(/\s+/g, ' '); }, html2);
  const rowsSaid = ['DAILY RECORD Monthly totals, then October day by day, from 5 Oct · the report day in red Date IVR calls Within 40s Deflection Transfer Errors Error rate Sep-26',
    'Sep-26 10 3 30% 40% – –', 'October — daily', '05-Oct 20 5 35% 40% 20 1.3%', '06-Oct 16 2 25% 63% – –', '07-Oct 40 7 28% 55% 103 2.4% '];
  const miss2 = rowsSaid.filter(x => !mt2.includes(x)), redDay = /color:#e10a0a">07-Oct</.test(html2.replace(/\s+/g, ' '));
  ok(!miss2.length && mt2.indexOf('DAILY RECORD') > mt2.indexOf('ERRORS 2.4%') && mt2.indexOf('DAILY RECORD') < mt2.indexOf('TOP 5 OUTCOMES') && redDay,
    `  the email: the record as a table under the tiles, above the top 5 lists, 7 Oct in red${miss2.length ? '; missing: ' + miss2.join(' | ') : ''}${redDay ? '' : ' (7 Oct not red)'}`);
  // Download Excel: October's workbook for the stakeholders
  const [dx] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#dIvr [data-ivr="xlsx"]')]);
  const xlsxP = path.join(out, dx.suggestedFilename()); await dx.saveAs(xlsxP);
  const Z = unzip(fs.readFileSync(xlsxP)), zparts = Object.keys(Z);
  const wbx = Z['xl/workbook.xml'] || '', sheetNames = [...wbx.matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
  ok(dx.suggestedFilename() === 'IVR Daily Record - Virgin Mobile - Oct 2026.xlsx' && sheetNames.join() === 'Dashboard,Daily record,Errors by action,Error detail,Menus,About',
    `Download Excel: ${dx.suggestedFilename()}, sheets ${sheetNames.join(', ')}`);
  const xmlBad = await p.evaluate(px => Object.entries(px).filter(([n, t]) => new DOMParser().parseFromString(t, 'application/xml').getElementsByTagName('parsererror').length).map(([n]) => n), Object.fromEntries(zparts.filter(n => /\.(xml|rels)$/.test(n)).map(n => [n, Z[n]])));
  ok(!xmlBad.length && ['xl/charts/chart1.xml', 'xl/charts/chart2.xml', 'xl/charts/chart3.xml', 'xl/drawings/drawing1.xml', 'xl/worksheets/_rels/sheet1.xml.rels'].every(n => zparts.includes(n))
    && (Z['xl/drawings/drawing1.xml'].match(/<c:chart /g) || []).length === 3 && /chart\+xml/.test(Z['[Content_Types].xml']),
    `  every part well formed (${zparts.length} parts${xmlBad.length ? '; not: ' + xmlBad.join(', ') : ''}), three charts on the dashboard`);
  const s2 = Z['xl/worksheets/sheet2.xml'] || '', cellOf = (x, r) => { const m = x.match(new RegExp(`<c r="${r}"[^>]*?(?:/>|>(.*?)</c>)`)); return m ? m[1] || '' : null; };
  const vOf = (x, r) => { const c = cellOf(x, r); const m = c && c.match(/<v>([^<]*)<\/v>|<t[^>]*>([^<]*)<\/t>/); return m ? m[1] ?? m[2] : null; }, fOf = (x, r) => { const c = cellOf(x, r); const m = c && c.match(/<f>([^<]*)<\/f>/); return m ? m[1] : null; };
  const dr = ['B5', 'C5', 'D5', 'E5', 'G5', 'I5', 'J5', 'B6', 'I6', 'B7', 'J7', 'B8', 'E8', 'G8', 'I8', 'J8'].map(r => `${r}=${vOf(s2, r)}`).join(' ');
  ok(dr === 'B5=20 C5=12 D5=5 E5=7 G5=8 I5=1500 J5=20 B6=16 I6=null B7=40 J7=103 B8=76 E8=22 G8=40 I8=5830 J8=123'
    && fOf(s2, 'E5') === 'C5-D5' && fOf(s2, 'F5') === 'IF(B5&gt;0,E5/B5,&quot;&quot;)' && fOf(s2, 'H7') === 'IF(B7&gt;0,G7/B7,&quot;&quot;)' && fOf(s2, 'B8') === 'SUM(B5:B7)' && fOf(s2, 'K8') === 'IF(N(I8)&gt;0,J8/I8,&quot;&quot;)'
    && /No Data Actions export that day/.test(cellOf(s2, 'L6') || '') && /type="dataBar"/.test(s2) && (s2.match(/type="colorScale"/g) || []).length === 3,
    `  Daily record: the days, their formulas (deflected, the shares, the month to date), 6 Oct without a Data Actions export, a bar in the calls and three colour scales (${dr})`);
  const s1 = Z['xl/worksheets/sheet1.xml'] || '', s3 = Z['xl/worksheets/sheet3.xml'] || '';
  ok(/IVR daily record · October 2026/.test(s1) && /Sep-26/.test(s1) && fOf(s1, 'B6') === "'Daily record'!B8" && fOf(s1, 'E6') === "'Daily record'!F8" && /MATCH\(MAX\('Daily record'!F5:F7\)/.test(s1),
    '  Dashboard: the month\'s four numbers from the Daily record, the highs and the lows found by formulas, September in the earlier months');
  const acts = [...s3.matchAll(/<c r="A(\d+)"[^>]*t="inlineStr"><is><t[^>]*>([^<]*)<\/t>/g)].filter(m => +m[1] >= 5).map(m => m[2]);
  ok(acts.slice(0, 4).join() === 'Customer_Type,Get Balance,Create Callback,All the flow&apos;s data actions'.replace('&apos;', "'") || acts.slice(0, 4).join() === "Customer_Type,Get Balance,Create Callback,All the flow's data actions",
    `  Errors by action: the actions that failed this month, the most errors first, then the flow's total (${acts.slice(0, 4).join(', ')})`);
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  console.log(bad ? `${bad} failed` : 'all passed');
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
