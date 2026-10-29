// The Weekly Commercial Presentation (js/weekly_core.js), Node only, synthetic data only (test/weekly_fixture.cjs):
// the week (Sunday to Saturday, the deck dated the Sunday after), the calls from the Brands' history, the top call reasons counted
// as the daily emails count them, the complaint figures read from pasted text, the outages' window, the checks, the deck made from
// wk/deck-template.pptx (its numbers, tables, charts and dates, no link to a workbook), and the KPI workbook filled at its cells.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const F = require('./weekly_fixture.cjs'), { W, E, Core } = F;
const tests = []; const ok = (name, fn) => tests.push([name, fn]);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m || ''} ${a} != ${b}`);
const week = W.weekOf('2026-10-21');

ok('the week is Sunday to Saturday and the deck is dated the Sunday after; "last week" is the last whole one', () => {
  assert.deepEqual([week.start, week.end, week.deck, week.days.length], ['2026-10-18', '2026-10-24', '2026-10-25', 7]);
  assert.equal(W.weekLabel(week), '18–24 Oct 2026');
  assert.equal(W.weekLabel(W.weekOf('2026-10-01')), '27 Sep – 3 Oct 2026');
  assert.equal(W.weekLabel(W.weekOf('2026-01-01')), '28 Dec 2025 – 3 Jan 2026');
  assert.equal(W.lastWeek('2026-10-25').start, '2026-10-18');   // on the Sunday: the week that just ended
  assert.equal(W.lastWeek('2026-10-29').start, '2026-10-18');
  assert.equal(W.lastWeek('2026-10-24').start, '2026-10-11');   // a Saturday is not over yet
  assert.equal(W.dayLong(week.deck), '25 Oct 2026');
});

ok('the calls: the daily chart is the month to the Saturday, MTD its average day, the monthly chart this year\'s closed months (days-only months averaged)', () => {
  const H = F.history(), M = W.model({ H, w: week });
  for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) {
    const B = M.brands[b], x = F.mtd(b);
    assert.equal(B.daily.length, 24); assert.equal(B.daily[0].date, '2026-10-01'); assert.equal(B.daily[23].date, '2026-10-24');
    near(B.mtd.presented, x.presented); near(B.mtd.handled, x.handled); near(B.mtd.sl, x.sl);
    assert.deepEqual(B.monthly.map(r => r.date), ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01']);
    const sep = H[b].voice.daily.filter(r => r.date.startsWith('2026-09'));
    near(B.monthly[8].presented, sep.reduce((s, r) => s + r.presented, 0) / sep.length, 'Sep from its days');
    assert.equal(B.lastMonth.date, '2026-09-01');
  }
  const last = W.model({ H: F.history({ upTo: '2026-10-24' }), w: W.weekOf('2026-10-28') });   // the week whose Saturday is the 31st: the whole month, its last week empty
  assert.equal(last.brands.virgin.daily.length, 31); assert.equal(last.brands.virgin.mtd.days, 24);
  // a week across two months: the daily chart starts with the week's first day; MTD counts the Saturday's month only
  const H2 = F.history({ upTo: '2026-10-24' }), across = W.model({ H: H2, w: W.weekOf('2026-10-01') });
  assert.equal(across.brands.virgin.daily[0].date, '2026-09-27'); assert.equal(across.brands.virgin.mtd.days, 3);
});

ok('the top call reasons: as the daily emails count them (rows left out still count in the total), FRiENDi Pay keeps Follow Up, Virgin Mobile without Postpaid, only the week', () => {
  const rows = E.historyRows(F.eskaRows()), C = W.countReasons(E, rows, week), R = W.reasonsFrom(C, E.DEFAULT_SUPPRESSED), pp = new Set(E.sliceHistory(rows, 'postpaid', week.days));
  for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) {
    const slice = E.sliceHistory(rows, b, week.days).filter(r => b !== 'virgin' || !pp.has(r)), ref = E.topReasons(slice, b === 'fpay' ? E.DEFAULT_SUPPRESSED.filter(s => s !== 'Follow Up') : E.DEFAULT_SUPPRESSED, 5);
    assert.equal(R[b].base, ref.base, b); assert.deepEqual(R[b].list.map(x => [x.reason, x.count]), ref.list.map(x => [x.reason, x.count]), b);
  }
  assert.equal(R.virgin.base, 40 + 30 + 90 + 60 + 35 + 20 + 20 + 15 + 10);   // the 17th is not in the week; queues and New Complaint count in the total; Postpaid's 45 calls are its own
  assert.deepEqual(R.virgin.list.map(x => x.reason), ['Plan Renewal', 'Data Bundle Info', 'Number Port', 'Roaming Help', 'Balance Check']);
  assert.equal(R.fpay.list[0].reason, 'Follow Up'); assert.equal(R.fpay.list[0].count, 30);   // the 25th (99 rows) is the next week
  assert.ok(!R.friendi.list.some(x => /queues|Waiting/.test(x.reason)));
  assert.deepEqual(R.postpaid.list.map(x => [x.reason, x.count]), [['Bill Copy', 33], ['Bill Explanation', 12]]);
  // a changed list counts again from the counts kept (no export needed): Plan Renewal left out
  assert.equal(W.reasonsFrom(C, E.DEFAULT_SUPPRESSED.concat(['plan renewal'])).virgin.list[0].reason, 'Data Bundle Info');
  // nothing of a customer is kept: only reasons and counts
  assert.ok(!JSON.stringify(C).includes('05000000'));
});

ok('the complaint figures: the workbook\'s block or the email\'s table, pasted; a driver named after a brand stays a driver', () => {
  const r = W.parseComplaints(F.COMPLAINTS);
  assert.deepEqual(Object.keys(r.brands).sort(), ['fpay', 'friendi', 'virgin']);
  assert.deepEqual([r.brands.virgin.complaints, r.brands.virgin.onTime, r.brands.virgin.open], [812, 0.97, 133]);
  assert.deepEqual(r.brands.virgin.drivers.map(d => d.name), ['Signal drops', 'Virgin app crashes', 'Wrong charge', 'Slow data', 'Activation delay']);
  assert.deepEqual([r.brands.friendi.complaints, r.brands.friendi.onTime, r.brands.friendi.open], [190, 1, 41]);
  assert.deepEqual([r.brands.fpay.complaints, r.brands.fpay.onTime, r.brands.fpay.open], [57, null, 12]);
  near(r.brands.fpay.drivers[0].pct, 0.61);
  // as the email has them: Subcategories | Total | Percentage (the percentage is taken, the count kept), FPAY's resolution days ignored
  const e = W.parseComplaints(F.COMPLAINTS_EMAIL).brands;
  assert.deepEqual(e.virgin.drivers.map(d => [d.name, d.count, W.pct(d.pct)]), [['Signal drops', 114, '14%'], ['Virgin app crashes', 89, '11%'], ['Wrong charge', 73, '9%'], ['Slow data', 49, '6%'], ['Activation delay', 41, '5%']]);
  assert.deepEqual([e.virgin.complaints, e.virgin.onTime, e.virgin.open, e.friendi.onTime, e.friendi.drivers[4].name], [812, 0.97, 133, 1, 'SIM blocked']);
  assert.deepEqual([e.fpay.complaints, e.fpay.onTime, e.fpay.open, e.fpay.drivers.map(d => W.pct(d.pct)).join(' ')], [57, null, 12, '61% 15% 7% 6% 4%']);
  const pipes = W.parseComplaints('VM | %\nNo. of complaints | 1,204\nResolution time of closed TKT | 0.98\nRemaining open tickets | 77\nTop 5 complaint drivers\nNo coverage | 21 %');
  assert.deepEqual([pipes.brands.virgin.complaints, pipes.brands.virgin.onTime, pipes.brands.virgin.open, pipes.brands.virgin.drivers[0].pct], [1204, 0.98, 77, 0.21]);
});

ok('Postpaid\'s tickets from the Tickets Report: as the daily Postpaid email counts them, only the week', () => {
  const T = W.postpaidTickets(E, E.ticketRows(F.ticketsReportRows()), week);
  // Billing, End service and Migration of Virgin; Final Prepaid Deactivation out; Final Postpaid Deactivation and Post-To-Pre merged; the 17th and the 25th not in the week
  assert.equal(T.total, 20 + 14 + 7 + 5 + 6 + 3 + 2);
  assert.deepEqual(T.list.map(x => [x.name, x.count]), [['Monthly Billing/Dispute', 34], ['Final Switch Postpaid Deactivation', 12], ['From Switch postpaid plans to Pre', 6], ['Not receiving the details of billing', 3], ['Activation After Payment', 2]]);
});

ok('a dropped sheet is recognised by its title row (as the Report builder) or by its column names; anything else is not read', () => {
  const t = F.ticketsReportRows(), h = F.eskaRows(), w = week;
  const plain = [['Ticket ID', 'Created', 'Type', 'Category', 'Sub Category', 'Status']].concat(t.slice(2).map(r => [r[9], r[3], r[4], r[5], r[6], r[7]]));
  const hplain = [['note'], ['Date', 'Agent', 'Type', 'Service', 'Sub Service']].concat(h.slice(2).map(r => [r[3], r[1], r[4], r[5], r[6]]));
  assert.equal(W.recognise(E, t).kind, 'tickets'); assert.equal(W.recognise(E, h).kind, 'history');
  const rt = W.recognise(E, plain), rh = W.recognise(E, hplain);
  assert.equal(rt.kind, 'tickets'); assert.deepEqual(W.postpaidTickets(E, rt.rows, w), W.postpaidTickets(E, E.ticketRows(t), w));
  assert.equal(rh.kind, 'history'); assert.deepEqual(W.countReasons(E, rh.rows, w), W.countReasons(E, E.historyRows(h), w));
  assert.equal(W.recognise(E, [['Name', 'Value'], ['a', 1]]).kind, null);
});

ok('an earlier deck\'s outages: read from its Outages table, the year from the deck\'s date; those in the list already are not added twice', async () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'wk', 'deck-template.pptx'));
  const deck = await W.deck(tpl, W.model({ H: F.history(), w: week, outages: F.OUTAGES }));
  const found = await W.outagesFromDeck(deck);
  assert.deepEqual(found.map(o => [o.date, o.issue, o.brands, o.desc]), F.OUTAGES.filter(o => ['b', 'c', 'd'].includes(o.id)).map(o => [o.date, o.issue, o.brands, o.desc]));
  // a deck of January: December's outage is of the year before
  const jan = W.weekOf('2027-01-06'), dec = [{ id: 'z', date: '2026-12-20', issue: 'Year end issue', brands: 'Virgin', desc: '' }, { id: 'y', date: '2027-01-04', issue: 'New year issue', brands: 'Fpay', desc: '' }];
  const back = await W.outagesFromDeck(await W.deck(tpl, W.model({ H: F.history(), w: jan, outages: dec })));
  assert.deepEqual(back.map(o => o.date), ['2026-12-20', '2027-01-04']);
  assert.deepEqual(W.newOutages(F.OUTAGES, found), []);
  assert.deepEqual(W.newOutages([F.OUTAGES[1]], found).map(o => o.issue), ['Coverage drop', 'Login issue']);
});

ok('the outages: the Saturday\'s month and the two before, oldest first; the brands counted once each', () => {
  const O = W.outagesOf(F.OUTAGES, week);
  assert.deepEqual(O.rows.map(o => o.id), ['b', 'c', 'd']); assert.equal(O.brands, 3); assert.equal(O.span, 'Aug–Oct 2026'); assert.equal(O.left, 0);
  const many = Array.from({ length: 25 }, (_, i) => ({ id: 'x' + i, date: W.addDays('2026-09-01', i), issue: 'i' + i, brands: 'Virgin', desc: '' }));
  const O2 = W.outagesOf(many, week); assert.equal(O2.rows.length, 18); assert.equal(O2.left, 7); assert.equal(O2.rows[17].id, 'x24');
});

ok('the checks: missing days, no reasons, missing complaint figures, drivers over 100%, the week not over, Postpaid\'s tickets', () => {
  const H = F.history({ skip: { friendi: ['2026-10-22'] } }), complaints = W.parseComplaints(F.COMPLAINTS).brands;
  let C = W.checks(W.model({ H, w: week, today: '2026-10-24' })).map(c => c.sev + ': ' + c.text).join('\n');
  assert.match(C, /bad: FRiENDi Mobile: the history has no calls for 22-Oct/); assert.match(C, /not over yet: its Saturday is today/);
  assert.match(C, /No call reasons yet/); assert.match(C, /Virgin Mobile: no complaint figures yet/); assert.match(C, /type the top 5 tickets/);
  complaints.virgin.drivers[0].pct = 0.9;
  const reasons = W.reasonsOf(E, E.historyRows(F.eskaRows()), week);
  C = W.checks(W.model({ H: F.history(), w: week, today: '2026-10-29', reasons, complaints, tickets: F.TICKETS, outages: F.OUTAGES })).map(c => c.sev + ': ' + c.text);
  assert.deepEqual(C.filter(c => c.startsWith('bad')), ['bad: Virgin Mobile: the complaint drivers add up to 121%, more than 100%.']);
  assert.ok(C.some(c => /Virgin Postpaid: only 2 call reasons/.test(c)));
});

ok('the deck: the template\'s 7 slides, each brand\'s numbers, tables and charts, the dates; no link to a workbook on anyone\'s computer', async () => {
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'wk', 'deck-template.pptx'));
  const reasons = W.reasonsOf(E, E.historyRows(F.eskaRows()), week), complaints = W.parseComplaints(F.COMPLAINTS).brands;
  const M = W.model({ H: F.history(), w: week, reasons, complaints, tickets: F.TICKETS, outages: F.OUTAGES, today: '2026-10-29' });
  const bytes = await W.deck(tpl, M), z = await Core.readZip(bytes), t0 = await Core.readZip(tpl);
  assert.deepEqual(z.names(), t0.names());
  const text = async n => (await z.text(`ppt/slides/slide${n}.xml`)).match(/<a:t>[^<]*<\/a:t>/g).map(s => s.slice(5, -6));
  const s1 = await text(1), s2 = await text(2), s4 = await text(4), s5 = await text(5), s6 = await text(6);
  assert.ok(s1.includes('25 Oct 2026'));
  assert.ok(s2.includes('Weekly Commercial Presentation  · 25 Oct 2026') && s2.includes('Service Level · Oct 2026') && s2.includes('Daily Trend — Oct 2026'));
  assert.ok(s2.includes(W.pct(F.mtd('virgin').sl)) && s2.includes('812') && s2.includes('97%') && s2.includes('133'));
  const vb = reasons.virgin.base; assert.ok(s2.includes('Plan Renewal') && s2.includes('70') && s2.includes(W.pct(70 / vb)));
  assert.ok(s2.includes('Virgin app crashes') && s2.includes('11%'));
  assert.ok(s4.includes('57') && s4.includes('12') && s4.includes('Service level — Sep\u00a0\'26') && s4.includes('Follow Up'));
  assert.ok(s5.includes('Bill dispute') && s5.includes('40') && s5.includes(W.pct(40 / 90)) && s5.includes('Bill Copy'));
  assert.ok(s6.includes('3') && s6.includes('Incidents logged, 3 brands') && s6.includes('Service Incidents Logged —  Months (Aug–Oct 2026)') && s6.includes('Login issue') && !s6.includes('Old July outage') && !s6.includes('Next week'));
  // each table: the header and a row per item (5 for the top lists); the outages table as many rows as outages
  const rowsOf = (x, name) => { const [a, b] = W._x.shapeAt(x, name); return (x.slice(a, b).match(/<a:tr /g) || []).length; };
  const x2 = await z.text('ppt/slides/slide2.xml'), x6 = await z.text('ppt/slides/slide6.xml');
  assert.equal(rowsOf(x2, 'Table 0'), 6); assert.equal(rowsOf(x2, 'Table 1'), 6); assert.equal(rowsOf(x6, 'Table 7'), 4);
  // the charts: 24 days of points (dates), the monthly 9 months + MTD; no external data anywhere
  const c1 = await z.text('ppt/charts/chart1.xml'), c2 = await z.text('ppt/charts/chart2.xml');
  assert.equal((c1.match(/<c:ptCount val="24"\/>/g) || []).length, 6);   // categories and values of the three series
  assert.ok(c1.includes(`<c:v>${W.serial('2026-10-01')}</c:v>`) && c1.includes(`<c:v>${F.history().virgin.voice.daily.find(r => r.date === '2026-10-24').presented}</c:v>`));
  assert.ok(c2.includes('<c:v>Jan-26</c:v>') && c2.includes('<c:v>MTD</c:v>') && (c2.match(/<c:ptCount val="10"\/>/g) || []).length === 6);
  for (const n of z.names()) if (/\.(xml|rels)$/.test(n)) { const s = await z.text(n); assert.ok(!/externalData|TargetMode="External"|C:\\Users/.test(s), n); }
  // the text runs are well-formed: every slide parses as one XML element tree (no stray tags)
  for (let n = 1; n <= 7; n++) { const s = await z.text(`ppt/slides/slide${n}.xml`); assert.equal((s.match(/<a:tr /g) || []).length, (s.match(/<\/a:tr>/g) || []).length); assert.equal((s.match(/<a:p>/g) || []).length, (s.match(/<\/a:p>/g) || []).length); }
});

ok('the KPI workbook: the week written at its cells, last month\'s days gone, formulas and other sheets kept, Excel told to count again', async () => {
  const reasons = W.reasonsOf(E, E.historyRows(F.eskaRows()), week), complaints = W.parseComplaints(F.COMPLAINTS).brands;
  const M = W.model({ H: F.history(), w: week, reasons, complaints, tickets: F.TICKETS, outages: F.OUTAGES });
  const r = await W.fillWorkbook(await F.kpiBook(), M);
  assert.deepEqual(r.notes, []);
  const z = await Core.readZip(r.bytes), sheets = await Core.readXlsx(r.bytes), S = n => sheets.find(s => s.name === n).rows, WD = S('Weekly Data'), PD = S('Postpaid Data');
  const v = (rows, ref) => { const m = /^([A-Z]+)(\d+)$/.exec(ref); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return (rows[+m[2] - 1] || [])[c - 1]; };
  const day = vv => (vv instanceof Date ? vv.toISOString().slice(0, 10) : typeof vv === 'number' ? W.fromSerial(vv) : vv);
  const Hv = F.history();
  assert.equal(day(v(WD, 'A2')), '2026-10-01'); assert.equal(day(v(WD, 'A32')), '2026-10-31');
  assert.equal(v(WD, 'B2'), Hv.virgin.voice.daily.find(r => r.date === '2026-10-01').presented);
  assert.equal(v(WD, 'B25'), Hv.virgin.voice.daily.find(r => r.date === '2026-10-24').presented);
  assert.equal(v(WD, 'B26') ?? null, null);   // the 25th onwards: empty (last month's 999 gone)
  assert.equal(v(WD, 'L19'), Hv.fpay.voice.daily.find(r => r.date === '2026-10-18').presented);
  near(v(WD, 'Q13'), F.mtd('virgin').presented); near(v(WD, 'S41'), F.mtd('friendi').sl); near(v(WD, 'R68'), F.mtd('fpay').handled);
  near(v(WD, 'Q12'), M.brands.virgin.closed.find(m => m.date === '2026-09-01').presented);   // September, from its days
  assert.equal(v(WD, 'Q4'), Hv.virgin.voice.monthly[0].presented);   // January's monthly row
  assert.equal(v(WD, 'Q3'), 1);   // 2025 (a year, not a month): kept
  assert.deepEqual([v(WD, 'L37'), v(WD, 'M37'), v(WD, 'O36')], ['Plan Renewal', 70, reasons.virgin.base]);
  assert.deepEqual([v(WD, 'L46'), v(WD, 'O46'), v(WD, 'L55'), v(WD, 'O54')], [reasons.friendi.list[0].reason, reasons.friendi.base, 'Follow Up', reasons.fpay.base]);
  assert.deepEqual([v(WD, 'Q84'), v(WD, 'Q85'), v(WD, 'Q86'), v(WD, 'P89'), v(WD, 'Q89')], [812, 0.97, 133, 'Signal drops', 0.14]);
  assert.deepEqual([v(WD, 'Q110'), v(WD, 'Q111'), v(WD, 'P115')], [57, 12, 'Transfer failed']);
  assert.deepEqual([v(PD, 'H23'), v(PD, 'I23'), v(PD, 'L23'), v(PD, 'M22')], ['Bill Copy', 33, 33, reasons.postpaid.base]);
  assert.equal(v(PD, 'H25') ?? null, null);   // only two Postpaid reasons this week: the rest emptied
  assert.deepEqual([v(PD, 'P23'), v(PD, 'Q23'), v(PD, 'T23'), v(PD, 'U22')], ['Bill dispute', 40, 40, 90]);
  const x1 = await z.text('xl/worksheets/sheet1.xml'), x2 = await z.text('xl/worksheets/sheet2.xml');
  assert.ok(x1.includes('<f>M37/O$36</f>') && x1.includes('<f>AVERAGE(B2:B32)</f>') && x2.includes('<f>L23/M$22</f>'));
  assert.match(x1, /<c r="A2" s="1"><v>/);   // the date cells keep their style
  assert.match(await z.text('xl/workbook.xml'), /<calcPr fullCalcOnLoad="1"/);
  assert.equal(sheets.find(s => s.name === 'Monthly Calls').rows[0][0], 'kept as it is');
});

ok('the KPI workbook: a month the workbook does not list is named, not written somewhere else', async () => {
  const H = F.history(); H.virgin.voice.monthly = H.virgin.voice.monthly.filter(m => m.date !== '2026-03-01');
  const book = await F.kpiBook(), z = await Core.readZip(book);
  // drop March from VM's block (P6) by blanking its date cell
  const files = []; for (const n of z.names()) files.push({ name: n, data: n === 'xl/worksheets/sheet1.xml' ? (await z.text(n)).replace(/<c r="P6" s="1"><v>\d+<\/v><\/c>/, '') : await z.bytes(n) });
  const r = await W.fillWorkbook(await Core.writeZip(files), W.model({ H: F.history(), w: week }));
  assert.ok(r.notes.some(n => /Virgin Mobile has no row for Mar-26/.test(n)), r.notes.join(' | '));
});

ok('the email: to Rasha, cc Essam by default (the tab), the subject and the deck\'s name', () => {
  const m = W.email({ w: week }, 'Rasha Mugaddam <rasha.mogaddam@beyond.one>', 'Essam AlZahrani <Essam.Alzhrani@beyond.one>');
  assert.equal(m.subject, 'Weekly Commercial Presentation'); assert.match(m.html, /^<p>Hi Rasha,<\/p>/); assert.equal(m.attach, 'Beyond_One_Member_Care_Review - 25 Oct 2026.pptx');
});

ok('the deck template carries the design only: no week\'s numbers, names of reasons, outages or paths', async () => {
  const z = await Core.readZip(fs.readFileSync(path.join(__dirname, '..', 'wk', 'deck-template.pptx')));
  for (const n of z.names()) if (/\.(xml|rels)$/.test(n)) {
    const s = await z.text(n);
    assert.ok(!/C:\\Users|externalData|TargetMode="External"|Banjar/.test(s), n);
    if (/slides\/slide\d+\.xml$/.test(n)) { const t = (s.match(/<a:t>[^<]*<\/a:t>/g) || []).map(x => x.slice(5, -6)).filter(Boolean); assert.ok(!t.some(v => /\d{2,}|Oct 20|Renew|Genesys|Follow Up/.test(v) && !/^(2023|Monthly Trend — 2023 to Date)$/.test(v)), n + ': ' + t.filter(v => /\d{2,}/.test(v)).join(', ')); }
    if (/charts\/chart\d+\.xml$/.test(n)) assert.ok(!/<c:pt idx="\d+"><c:v>\d/.test(s), n);
  }
});

(async () => {
  let n = 0, failed = 0;
  for (const [name, fn] of tests) { try { await fn(); n++; console.log('ok', name); } catch (e) { failed++; console.log('not ok', name); console.log(e); } }
  console.log(`${n} checks passed${failed ? `, ${failed} failed` : ''}`);
  if (failed) process.exit(1);
})();
