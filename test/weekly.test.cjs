// The Weekly Commercial Presentation, in Node, with made-up numbers only (no real exports, names or IDs):
// 1. The month to date from the brands' history: the days up to the day before the presentation (a day twice counted once),
//    calls a day on average, the service level as the average of the days; the monthly trend from the history's monthly rows,
//    a month with only days worked out from its days, empty months at the start left out; the month before for FRiENDi Pay.
// 2. The month's call reasons per brand (the usual reasons left out, FRiENDi Pay keeps Follow Up), tickets per brand (logged,
//    resolved on time within the hours set, still open, complaint drivers without "Other" for Virgin), Postpaid's tickets as the
//    daily email counts them, FRiENDi Pay's from its tickets sheet when the export has none; rows of other months left out.
// 3. The outages of the month and the two before, up to the presentation's day.
// 4. The deck: 7 slides, a column-and-line chart with its own workbook for each trend, the numbers on the slides, text escaped,
//    the logo as a picture, a second outages slide when there are many, and "–" where a file is missing.
// Usage: node test/weekly.test.cjs [outDir: the made-up deck is written there, to open or render]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const repo = path.join(__dirname, '..');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
// the report builder's modules (Engine, Build…), as the page has them
const src = fs.readFileSync(path.join(repo, 'js/rb_src.html'), 'utf8'), code = src.split('<script id="rb-code">')[1].split('</' + 'script>')[0];
const W = { console, TextDecoder, TextEncoder, setTimeout, clearTimeout }; W.window = W; vm.createContext(W); vm.runInContext(code, W);
const E = W.Engine, Core = require(path.join(repo, 'js/core.js')), WcDeck = require(path.join(repo, 'js/wcdeck.js'));
const pad = n => String(n).padStart(2, '0'), oct = d => `2026-10-${pad(d)}`, dmy = d => `${pad(d)}/10/2026 09:30`;
// ---- the brands' history: Jan–Aug as monthly rows, September as days only, 1–23 October (5 October twice)
const H = {};
for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) {
  const monthly = [1, 2, 3, 4, 5, 6, 7, 8].map(m => ({ date: `2026-${pad(m)}-01`, presented: 1000 + m * 10, handled: 900 + m * 10, sl: +(0.6 + m * 0.03).toFixed(2) }));
  const daily = [];
  for (let d = 1; d <= 30; d++) daily.push({ date: `2026-09-${pad(d)}`, presented: 1000, handled: 950, sl: 0.9 });
  for (let d = 1; d <= 23; d++) daily.push({ date: oct(d), presented: 1000 + d, handled: 990 + d, sl: d % 2 ? 0.8 : 0.95 });
  daily.push({ date: oct(5), presented: 99999, handled: 1, sl: 0.01 });
  H[b] = { voice: { monthly, daily } };
}
// ---- the month's call history (Crystal): [_, _, _, date, type, service, sub reason, _, language, contact]
const call = (date, type, service, sub, n) => Array.from({ length: n }, () => [null, null, null, date, type, service, sub, null, 'English', 'Inbound']);
const calls = [
  ...call(oct(3), 'Virgin Inquiry', 'Prepaid', 'Renew Now', 30), ...call(oct(4), 'Virgin Inquiry', 'Prepaid', 'Internet Settings - اعدادات الإنترنت', 20),
  ...call(oct(6), 'Virgin Inquiry', 'Prepaid', 'Terminated Number', 15), ...call(oct(7), 'Virgin Inquiry', 'Prepaid', 'Follow Up', 50),
  ...call(oct(8), 'Virgin Inquiry', 'Postpaid', 'Billing Details', 12), ...call(oct(9), 'Virgin Inquiry', 'Postpaid', 'Migration from Postpaid to Prepaid', 6),
  ...call(oct(10), 'Virgin Inquiry', 'Prepaid', 'CVM Offers', 10), ...call(oct(11), 'Virgin Inquiry', 'Prepaid', 'SIM Validity', 8),
  ...call(oct(2), 'FRiENDi Complaint', 'Prepaid', 'Terminated Number', 9), ...call(oct(2), 'FRiENDi Inquiry', 'Prepaid', 'Check Data Usage', 7),
  ...call(oct(5), 'FRiENDi Pay', 'Inquiry', 'Follow Up', 25), ...call(oct(5), 'FRiENDi Pay', 'Inquiry', 'Error While Transfer', 6),
  ...call('2026-09-30', 'Virgin Inquiry', 'Prepaid', 'Old Reason', 400), ...call(oct(22), 'Virgin Inquiry', 'Prepaid', 'Too New', 400),
];
// ---- the month's tickets (Crystal): [_, _, _, date, type, category, sub, status, _, ticket id, life cycle, group]
let tid = 1000; const tk = (d, type, cat, sub, status, life) => [null, null, null, typeof d === 'number' ? dmy(d) : d, type, cat, sub, status, null, 'T' + (tid++), life || '', 'Member Care'];
const tickets = [
  tk(1, 'Virgin Complaint', 'Network', 'SM is not working', 'Closed', '0 Day(s) 5:00:00 Hours'), tk(2, 'Virgin Complaint', 'Network', 'SM is not working', 'Closed', '1 Day(s) 2:00:00 Hours'),
  tk(3, 'Virgin Complaint', 'Network', 'SM is not working', 'Closed', '2 Day(s) 23:59:00 Hours'), tk(4, 'Virgin Complaint', 'Network', 'SM is not working', 'Open'),
  tk(5, 'Virgin Complaint', 'Network', 'Weak Coverage', 'Closed', '3 Day(s) 0:00:00 Hours'), tk(6, 'Virgin Complaint', 'Network', 'Weak Coverage', 'Closed', '3 Day(s) 2:00:00 Hours'),
  tk(7, 'Virgin Complaint', 'Other', 'Other', 'Closed', '4 Day(s) 0:00:00 Hours'), tk(8, 'Virgin Complaint', 'Other', 'Other', 'Pending'),
  tk(9, 'Virgin Complaint', 'Network', 'No Network', 'Closed', '0 Day(s) 0:30:00 Hours'), tk(10, 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 'Closed', '0 Day(s) 1:00:00 Hours'),
  tk(11, 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 'Open'), tk(12, 'Virgin Complaint', 'End service', 'Final Postpaid Deactivation', 'Closed', '0 Day(s) 3:00:00 Hours'),
  tk(13, 'Virgin Complaint', 'End service', 'Final Prepaid Deactivation', 'Closed', '0 Day(s) 3:00:00 Hours'),
  tk(14, 'FRiENDi Complaint', 'Network', 'SM is not working', 'Closed', '0 Day(s) 2:00:00 Hours'), tk(15, 'FRiENDi Complaint', 'Network', 'Weak coverage', 'Open'),
  tk('30/09/2026 10:00', 'Virgin Complaint', 'Network', 'From September', 'Open'), tk(22, 'Virgin Complaint', 'Network', 'After the day before', 'Open'),
];
const sheet = [{ date: oct(3), category: 'Remittance', sub: 'Technical error while processing the remittance', count: 7 }, { date: oct(4), category: 'Limit Update', sub: 'Limit Update', count: 2 }, { date: '2026-09-28', category: 'Old', sub: 'Old', count: 5 }];
const outages = [
  { date: '2026-07-31', title: 'Before the three months', brands: ['virgin'], desc: '' }, { date: '2026-08-06', title: 'Genesys outage', brands: ['virgin', 'friendi', 'fpay'], desc: 'The phones stopped' },
  { date: '2026-10-02', title: 'Plan <b>issue</b> & more', brands: ['friendi'], desc: 'Plans "could not" start' }, { date: '2026-09-15', title: 'OTP issue', brands: ['fpay'], desc: 'No OTP' },
  { date: '2026-10-23', title: 'After the presentation', brands: ['virgin'], desc: '' },
];
const near = (a, b) => a != null && Math.abs(a - b) < 1e-9;
(async () => {
  const m = WcDeck.model({ date: '2026-10-22', hist: H, calls, tickets, fpayTickets: sheet, outages, onTimeH: 72, reports: W.Build.REPORTS }, E);
  const [V, F, P] = m.brands, PP = m.postpaid;
  // ---- 1. the history
  ok(m.ref === '2026-10-21' && m.month === 'Oct 2026' && m.prev === "Sep '26", `the month: ${m.month}, up to ${m.ref} (the day before the presentation)`);
  ok(V.v.daily.length === 21 && V.v.daily[4].presented === 1005, `21 days, 5 October counted once (the first row) (${V.v.daily.length})`);
  ok(near(V.v.mtd.sl, (11 * 0.8 + 10 * 0.95) / 21) && near(V.v.mtd.presented, 1011) && near(V.v.mtd.handled, 1001), `month to date: SL the average of the days (${(V.v.mtd.sl * 100).toFixed(2)}%), 1011 presented and 1001 handled a day`);
  const labels = V.v.trend.map(x => x.label);
  ok(labels.join(',') === 'Jan-26,Feb-26,Mar-26,Apr-26,May-26,Jun-26,Jul-26,Aug-26,Sep-26,MTD', `monthly trend: ${labels.join(' ')}`);
  ok(near(V.v.trend[0].v.sl, 0.63) && near(V.v.trend[7].v.presented, 1080) && near(V.v.trend[8].v.sl, 0.9) && near(V.v.trend[8].v.presented, 1000), 'January–August from the monthly rows, September worked out from its days');
  ok(near(P.v.prev.sl, 0.9), "FRiENDi Pay's service level of the month before: 90%");
  const feb = WcDeck.model({ date: '2026-02-10', hist: H }, E).brands[0].v.trend.map(x => x.label).join(' ');
  ok(feb === 'Jan-26 MTD', `in February, months with no data before January are left out (${feb})`);
  const nov = WcDeck.model({ date: '2026-11-01', hist: H }, E);
  ok(nov.ym === '2026-10' && nov.brands[0].v.daily.length === 23 && nov.month === 'Oct 2026', `on 1 November the deck is October's: ${nov.brands[0].v.daily.length} days`);
  // ---- 2. reasons and tickets
  const rs = B => B.reasons.list.map(x => `${x.label} ${x.count}`).join(', ');
  ok(rs(V) === 'Renew Now 30, Internet Settings - اعدادات الإنترنت 20, Terminated Number 15, Billing Details 12, CVM Offers 10' && V.reasons.base === 151, `Virgin's top call reasons, Follow Up left out, other months left out: ${rs(V)}`);
  ok(rs(P) === 'Follow Up 25, Error While Transfer 6', `FRiENDi Pay keeps Follow Up: ${rs(P)}`);
  ok(rs(PP) === 'Billing Details 12, Migration from Postpaid to Prepaid 6', `Postpaid's reasons: ${rs(PP)}`);
  ok(V.tickets.total === 13 && V.tickets.open === 3 && V.tickets.closed === 10 && near(V.tickets.onTime, 0.8), `Virgin: 13 tickets, 3 still open (Open and Pending), 8 of 10 closed within 72 hours (${V.tickets.total}, ${V.tickets.open}, ${V.tickets.onTime})`);
  const dv = V.tickets.drivers.list.map(x => `${x.label} ${Math.round(x.pct * 100)}%`).join(', ');
  ok(dv === 'SM is not working 31%, Weak Coverage 15%, Monthly Billing/Dispute 15%, No Network 8%, Final Postpaid Deactivation 8%', `Virgin's complaint drivers, "Other" left out: ${dv}`);
  ok(F.tickets.total === 2 && F.tickets.open === 1 && near(F.tickets.onTime, 1), "FRiENDi's tickets apart from Virgin's");
  ok(P.from === 'sheet' && P.tickets.total === 9 && P.tickets.open === null && P.tickets.drivers.list[0].label === 'Remittance / Technical error while processing the remittance' && Math.round(P.tickets.drivers.list[0].pct * 100) === 78, `FRiENDi Pay from its tickets sheet: 9 this month, still open unknown; ${P.tickets.drivers.list[0].label}`);
  const pt = PP.tickets.list.map(x => `${x.label} ${x.count}`).join(', ');
  ok(pt === 'Monthly Billing/Dispute 2, Final Switch Postpaid Deactivation 1' && PP.tickets.base === 3, `Postpaid's tickets as the daily email counts them: ${pt}`);
  const m24 = WcDeck.model({ date: '2026-10-22', hist: H, tickets, onTimeH: 24 }, E);
  ok(near(m24.brands[0].tickets.onTime, 0.5), 'within 24 hours: 5 of 10');
  // ---- 3. outages
  ok(m.outages.list.map(x => x.date).join(' ') === '2026-08-06 2026-09-15 2026-10-02' && m.outages.brands === 3 && m.outages.span === 'Aug–Oct 2026', `outages: ${m.outages.list.length} in ${m.outages.span}, ${m.outages.brands} brands`);
  // ---- 4. the deck
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  const bytes = await WcDeck.deck(m, { presenter: 'Huda S.', title: 'Member Care lead', org: 'Beyond One', logo: { png, w: 300, h: 100 } }).bytes();
  if (process.argv[2]) { fs.mkdirSync(process.argv[2], { recursive: true }); fs.writeFileSync(path.join(process.argv[2], WcDeck.fileName(m.date)), bytes); }
  const z = await Core.readZip(bytes), names = z.names(), t = n => z.text(n);
  const slides = names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)), charts = names.filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)), books = names.filter(n => /^ppt\/embeddings\/.+\.xlsx$/.test(n));
  ok(slides.length === 7 && charts.length === 7 && books.length === 7, `7 slides, 7 charts (the daily and monthly trends of each brand, Postpaid's daily trend), each with its workbook (${charts.length})`);
  const ct = await t('[Content_Types].xml');
  ok((ct.match(/presentationml\.slide\+xml/g) || []).length === 7 && (ct.match(/drawingml\.chart\+xml/g) || []).length === 7, 'every slide and chart in [Content_Types].xml');
  const s1 = await t('ppt/slides/slide1.xml'), s2 = await t('ppt/slides/slide2.xml'), s4 = await t('ppt/slides/slide4.xml'), s5 = await t('ppt/slides/slide5.xml'), s6 = await t('ppt/slides/slide6.xml'), s7 = await t('ppt/slides/slide7.xml');
  const T = x => [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]);
  ok(T(s1).includes('Member Care Performance Review') && T(s1).includes('22 Oct 2026') && T(s1).includes('Huda S.') && T(s1).includes('Member Care lead — Beyond One'), 'the cover: title, date, presenter and job title');
  const t2 = T(s2);
  ok(t2.includes('Performance Insights') && t2.includes('Virgin Mobile — Contact Centre Voice Channel') && t2.includes('87%') && t2.includes('Service Level · Oct 2026'), `Virgin's slide: ${t2.find(x => /%$/.test(x))} service level for Oct 2026`);
  ok(['13', '80%', '3', 'Complaints logged', 'Closed tickets resolved on time', 'Tickets still open', 'Renew Now', 'SM is not working', '31%', 'Daily Trend — Oct 2026', 'Monthly Trend — 2026 to Date'].every(x => t2.includes(x)), "Virgin's tiles, call reasons and complaint drivers");
  const t4 = T(s4);
  ok(['FRiENDi Pay — Contact Centre Voice Channel', '9', '–', '90%', "Service level — Sep '26", 'Follow Up', 'Remittance / Technical error while processing the remittance'].every(x => t4.includes(x)), "FRiENDi Pay's slide: complaints, still open –, last month's service level");
  ok(['Postpaid Insights', 'Cross-Brand Postpaid — Contact Centre Voice Channel', 'Monthly Billing/Dispute', '67%', 'Final Switch Postpaid Deactivation', 'Billing Details'].every(x => T(s5).includes(x)), "Postpaid's slide");
  ok(T(s6).includes('Outages Insights') && T(s6).includes('Incidents logged, 3 brands') && T(s6).includes('6-Aug') && s6.includes('Plan &lt;b&gt;issue&lt;/b&gt; &amp; more') && s6.includes('Plans &quot;could not&quot; start') && !/<b>issue/.test(s6), 'the outages slide, its text escaped');
  ok(T(s7).includes('Thank You') && T(s7).includes('Huda S.  ·  Member Care lead  ·  Beyond One'), 'thank you');
  ok(names.filter(n => /^ppt\/media\//.test(n)).join() === 'ppt/media/image1.png' && (await t('ppt/slides/_rels/slide2.xml.rels')).includes('../media/image1.png') && /<p:pic>/.test(s2) && /<p:pic>/.test(s7), 'the logo on every slide as a picture, kept once in the file');
  const c1 = await t('ppt/charts/chart1.xml'), c2 = await t('ppt/charts/chart2.xml');
  ok((c1.match(/<c:v>\d+-Oct<\/c:v>/g) || []).length === 21 * 3 && c1.includes('<c:v>Calls Presented</c:v>') && c1.includes('<c:v>Service Level</c:v>') && c1.includes('<c:max val="1.2"/>') && c1.includes('<c:crosses val="max"/>'), "Virgin's daily trend: 21 days, columns and the service level on its own axis (0–120%)");
  ok(c2.includes('<c:v>Jan-26</c:v>') && c2.includes('<c:v>MTD</c:v>') && c2.includes('<c:v>0.63</c:v>'), 'the monthly trend chart');
  const wb = await Core.readZip(await z.bytes(books[0])), sh = await wb.text('xl/worksheets/sheet1.xml'), ss = (await wb.text('xl/sharedStrings.xml')) || '';
  ok(/Calls Presented|Service Level/.test(sh + ss) && /1-Oct/.test(sh + ss), "the chart's data in its workbook (Edit Data)");
  // ---- many outages: a second slide; nothing dropped: "–"
  const many = Array.from({ length: 20 }, (_, i) => ({ date: oct(1 + (i % 20)), title: 'Outage ' + (i + 1), brands: ['virgin'], desc: i ? '' : 'A very long description '.repeat(20) }));
  const zb = await Core.readZip(await WcDeck.deck(WcDeck.model({ date: '2026-10-22', hist: H, outages: many }, E), {}).bytes());
  const sl8 = zb.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, s7b = await zb.text('ppt/slides/slide7.xml');
  const t6b = T(await zb.text('ppt/slides/slide6.xml')), long = t6b.find(x => /^A very long/.test(x)) || '';
  ok(sl8 === 8 && T(s7b).includes('Outages Insights (continued)') && T(s7b).includes('Outage 18') && t6b.includes('20'), `20 outages: two outages slides (${sl8} slides)`);
  ok(/…$/.test(long) && long.length <= 140, `a long description cut to one line with … (${long.length} characters)`);
  const e = WcDeck.model({ date: '2026-10-22', hist: {} }, E), ze = await Core.readZip(await WcDeck.deck(e, {}).bytes()), te = T(await ze.text('ppt/slides/slide2.xml'));
  ok(te.filter(x => x === '–').length >= 6 && e.notes.length >= 5 && T(await ze.text('ppt/slides/slide1.xml')).includes('BEYOND ONE'), `no history and no files: "–" on the slides, ${e.notes.length} notes, the company's name for a logo`);
  ok(WcDeck.fileName('2026-10-25') === 'Beyond_One_Member_Care_Review - 25 Oct 2026.pptx', 'the file name as sent before');
  ok(WcDeck.ticketBrand('FRiENDi Pay Complaint') === 'fpay' && WcDeck.ticketBrand('FRiENDi Inquiry') === 'friendi' && WcDeck.ticketBrand('Virgin Complaint') === 'virgin' && WcDeck.ticketBrand('') === null, 'tickets: the brand from the type');
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
