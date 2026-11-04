// The Member Care Performance Review, in Node, with a made-up "MC performance Review" email only:
// 1. The email's tables read from its text as Outlook keeps it (a cell a line) and as copied (tab-separated): titles, header,
//    a row per month (Jan, Jun-25, 1-Jan, Oct-26), the month to date ("Nov to 3", "11/1/2026 to 3": Until 03 Nov), the year of a
//    month with none, numbers with commas and percentages, the signature left out; a table the deck does not know kept as other.
// 2. The charts: the Total and the share left out, shaded columns, the year first where the team's deck has it.
// 3. The MC KPIs workbook (made up, laid out as the team's): requests by day with the time to close, by month, OTP calls, final
//    termination calls; the logos of a deck, by their names or where they sit.
// 4. The deck as the team's: the cover, the brands' slides (Cambria, the brands' colours, the callout's shadow, the brand's logo),
//    Complaints Insights in 3-D, Rebooking by day and by month, OTP and final termination calls, thank you; "not in the email".
// 5. The made-up .msg the browser test drops is read back by the tool's own reader.
// 6. The Call history export (made up, laid out as Crystal's): OTP calls and final termination calls by day, every channel and calls
//    only, the terminations done; two exports of a day (the fuller one kept); the slide's two months day by day (a day with no data
//    left blank) and the year by month, the Call history winning over the workbook where it is whole; the deck from the calls alone.
// Usage: node test/prdeck.test.cjs [outDir: the made-up deck is written there]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const repo = path.join(__dirname, '..');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const src = fs.readFileSync(path.join(repo, 'js/rb_src.html'), 'utf8'), code = src.split('<script id="rb-code">')[1].split('</' + 'script>')[0];
const W = { console, TextDecoder, TextEncoder, setTimeout, clearTimeout }; W.window = W; vm.createContext(W); vm.runInContext(code, W);
const E = W.Engine, Core = require(path.join(repo, 'js/core.js')), WcDeck = require(path.join(repo, 'js/wcdeck.js')), PrDeck = require(path.join(repo, 'js/prdeck.js')), Pptx = require(path.join(repo, 'js/pptx.js'));
const { msgFile, sampleBody } = require('./msgfile.cjs');
const ref = { y: 2026, m: 11 };
(async () => {
  // ---- 1. reading
  const T = PrDeck.tablesOf(sampleBody({ extra: true }), ref), by = k => T.find(t => t.key === k);
  ok(T.map(t => t.key).join() === 'rebooking,network,webapp,social,vnet,other', `six tables: ${T.map(t => t.key).join(', ')}`);
  const rb = by('rebooking');
  ok(rb.title === 'Rebooking TKTs' && rb.first === 'Months' && rb.cols.join('|') === 'Virgin|FRiENDi|Total' && rb.rows.length === 11, 'Rebooking: its header and eleven rows');
  ok(rb.rows[0].ym === '2026-01' && rb.rows[0].label === 'Jan-26' && rb.rows[2].label === 'Mar-26' && rb.rows[10].ym === '2026-11' && rb.rows[10].label === 'Until 03 Nov' && rb.rows[10].vals.join() === '80,70,150', `months with no year in the year of the email; "Nov to 3" is ${rb.rows[10].label}`);
  const nt = by('network');
  ok(nt.first === 'Network Type' && nt.cols.join('|') === 'No Network|Weak Coverage|MNP - Port In|Inbound|Outbound|Total' && nt.rows[0].label === 'Jun-25' && nt.rows[17].label === 'Until 03 Nov', `Network: a header over two lines (${nt.first}), Jun-25 to the month to date ("11/1/2026 to 3")`);
  const wa = by('webapp');
  ok(wa.cols.join('|') === 'Web + App TKTs Total (Service Requests + Complaints)|All complaints (App/Web + Agent)|%' && wa.rows[0].label === 'Jan-26' && wa.rows[0].vals[0] === 1800 && Math.abs(wa.rows[0].vals[2] - 0.36) < 1e-9, 'Web + App: 1-Jan is January, "1,800" a number, "36.00%" a share; the header spelt out');
  ok(by('social').rows.length === 23 && by('social').rows[0].label === 'Jan-25' && by('vnet').rows.map(r => r.label).join() === 'Sep-26,Oct-26,Until 03 Nov', 'Social media from Jan-25; Vnet');
  ok(by('other').title === 'OTP Calls' && by('other').rows[0].vals[0] === 1500, 'a table the deck does not know is kept (OTP Calls)');
  ok(!T.some(t => t.rows.some(r => /Sami|Riyadh|example/.test(r.label))), 'the signature is left out');
  const tsv = 'Rebooking TKTs:\nMonths\tVirgin\tFRiENDi\tTotal\nSep\t774\t668\t1442\nOct\t761\t677\t1438\nNov to 3\t85\t92\t177\n\nVnet Complaints:\nMonth\tTotal\nOct-26\t94\n11/1/2026 to 3\t8';
  const T2 = PrDeck.tablesOf(tsv, ref);
  ok(T2.length === 2 && T2[0].rows.map(r => r.label).join() === 'Sep-26,Oct-26,Until 03 Nov' && T2[1].rows[1].vals[0] === 8, 'tables copied from Outlook (tab-separated) read the same way');
  ok(PrDeck.tablesOf('Rebooking TKTs:\nMonths\tVirgin\nDec\t5\nJan to 2\t1', { y: 2027, m: 1 })[0].rows.map(r => r.ym).join() === '2026-12,2027-01', 'December before a January month to date is the year before');
  ok(!PrDeck.tablesOf('Hi,\nnothing here\nThanks', ref).length, 'an email with no tables: none');
  // ---- 2. charts
  const c1 = PrDeck.chartOf(rb), c2 = PrDeck.chartOf(wa), c3 = PrDeck.chartOf(by('vnet'));
  ok(c1.bars.map(b => b.name).join() === 'Virgin,FRiENDi' && !c1.line, 'Rebooking: Virgin and FRiENDi, the Total left out');
  ok(c2.bars.length === 2 && !c2.line && c2.bars.every(b => b.grad && b.labels), 'Web + App: its two columns, shaded and labelled, the share left out (as in the team\'s deck)');
  ok(c3.bars.map(b => b.name).join() === 'Total', 'Vnet: its Total, the only column');
  ok(PrDeck.chartOf(by('social')).catRot === -45 && PrDeck.chartOf(by('social'), { yearFirst: true }).cats[0] === '25-Jan', 'many months: the labels slanted; the year first where the deck has it (25-Jan)');
  // ---- 3. the MC KPIs workbook (made up, laid out as the team's) and the logos of a deck
  const W2 = require(path.join(repo, 'js/writer2.js')), S = new W2.Styles(), rbS = new W2.Sheet('Reactivate the Booking code '), otS = new W2.Sheet('OTP & Termination');
  const ser = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000), day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  rbS.set(4, 9, 'Date'); rbS.set(4, 10, 'Virgin'); rbS.set(4, 11, 'Friendi'); rbS.set(4, 12, 'Avg Time to Close');
  const days = []; for (let d = 14; d <= 30; d++) days.push(day(10, d)); for (let d = 1; d <= 3; d++) days.push(day(11, d));
  days.forEach((d, k) => { rbS.set(5 + k, 9, ser(d)); rbS.set(5 + k, 10, 20 + (k % 9)); rbS.set(5 + k, 11, 15 + (k % 7)); rbS.set(5 + k, 12, 0.05 + (k % 5) * 0.04); });
  rbS.set(31, 10, 'Virgin'); rbS.set(31, 11, 'FRiENDi');
  ['26-Jan', '26-Feb', '26-Mar', 'Until 03 Nov'].forEach((c, k) => { rbS.set(32 + k, 9, c); rbS.set(32 + k, 10, 600 + k); rbS.set(32 + k, 11, 500 + k); });
  otS.set(3, 3, 'OTP Count'); otS.set(3, 18, 'Final termination Count');
  for (let k = 0; k < 60; k++) { const d = new Date(Date.UTC(2026, 8, 5 + k)).toISOString().slice(0, 10); otS.set(18 + k, 2, ser(d)); otS.set(18 + k, 3, 30 + (k % 25)); }
  for (let mo = 1; mo <= 11; mo++) { otS.set(3 + mo, 17, ser(day(mo, 1))); otS.set(3 + mo, 18, 20000 - mo * 1000); }
  const book = await Core.readXlsx(await W2.pack([rbS, otS], S)), K = PrDeck.kpiOf(book);
  ok(K.byDay && K.byDay.length === 20 && K.byDay[0].date === '2026-10-14' && K.byDay[0].virgin === 20 && Math.abs(K.byDay[0].avg - 0.05) < 1e-9, `the workbook: the requests by day (${K.byDay && K.byDay.length} days from ${K.byDay && K.byDay[0].date}) with the time to close`);
  ok(K.byMonth && K.byMonth.map(r => r[0]).join() === '26-Jan,26-Feb,26-Mar,Until 03 Nov' && K.otp.length === 60 && K.term.length === 11 && K.term[0].ym === '2026-01' && K.term[0].n === 19000, 'the requests by month, 60 days of OTP calls, the final termination calls by month');
  const Ld = Pptx.create({}), png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  const png2 = Uint8Array.from([...png]); png2[png2.length - 5] ^= 1;   // two different pictures
  Ld.slide({ bg: '1E2761' }).image(0.55, 0.5, 0.48, 0.48, png, { descr: 'C:\\assets\\beyondone_mark_only.png' });
  const sl = Ld.slide({}); sl.image(0.45, 0.36, 0.3, 0.46, png2, { descr: '' }); sl.image(12.45, 0.3, 0.4, 0.4, png2, { descr: 'virgin_logo.png' }); sl.text(0.45, 1.56, 8, 0.3, 'Virgin Mobile — Contact Centre Voice Channel');
  const Lg = await PrDeck.logosOf(await Core.readZip(await Ld.bytes()));
  ok(Object.keys(Lg).sort().join() === 'full,mark,virgin' && Lg.mark.type === 'image/png', `the logos of a deck: by their names, or by where they sit (${Object.keys(Lg).sort().join(', ')})`);
  // ---- 4. the deck, as the team's
  const H = {}; for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) H[b] = { voice: { monthly: [{ date: '2026-09-01', presented: 1000, handled: 950, sl: 0.9 }], daily: [1, 2, 3].map(d => ({ date: `2026-11-0${d}`, presented: 1000, handled: 980, sl: 0.85 })) } };
  const m = WcDeck.model({ date: '2026-11-04', hist: H }, E), logo = { png, w: 300, h: 100 };
  const bytes = await PrDeck.deck(m, T, { presenter: 'Huda S.', title: 'Member Care lead', org: 'Beyond One', logo, kpi: K, logos: { virgin: { png: png2, w: 10, h: 10 } } }).bytes();
  if (process.argv[2]) { fs.mkdirSync(process.argv[2], { recursive: true }); fs.writeFileSync(path.join(process.argv[2], PrDeck.fileName('2026-11-04')), bytes); }
  const z = await Core.readZip(bytes), names = z.names(), X = async n => [...((await z.text(n)) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const slides = names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, charts = names.filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  ok(slides === 9 && charts.length === 5 + 3 + 2 + 2 + 1 && names.filter(n => /^ppt\/embeddings\/.+\.xlsx$/.test(n)).length === charts.length, `9 slides (cover, three brands, Complaints Insights, Rebooking, OTP and Final termination, OTP Calls from the email, thank you), ${charts.length} charts each with its workbook`);
  const s1 = await X('ppt/slides/slide1.xml'), s2 = await X('ppt/slides/slide2.xml'), s5 = await X('ppt/slides/slide5.xml'), s6 = await X('ppt/slides/slide6.xml'), s7 = await X('ppt/slides/slide7.xml'), s9 = await X('ppt/slides/slide9.xml');
  ok(s1.includes('Member Care Performance Review') && s1.includes('Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay') && s1.includes('04 Nov 2026') && s1.includes('Huda S.') && s1.includes('BEYOND ONE'), 'the cover as the team\'s: the title, the three brands, 04 Nov 2026, the presenter');
  const x2 = await z.text('ppt/slides/slide2.xml');
  ok(s2.includes('Performance Insights') && s2.includes('Weekly Commercial Presentation  ·  04 Nov 2026') && s2.includes('Monthly Trend') && /latin typeface="Cambria"/.test(x2) && /srgbClr val="D0021B"/.test(x2) && /outerShdw/.test(x2) && (x2.match(/<p:pic>/g) || []).length === 2, "Virgin's slide: the deck's heading and Monthly Trend, Cambria, Virgin's red with its shadow, the Virgin logo top right");
  ok(['Complaints Insights', 'MC Service Level Stabilization  ·  04 Nov 2026', 'Web + App TKTs – Until 03 Nov', 'Network TKT – Until 03 Nov', 'Social Media issue TKTs – Until 03 Nov'].every(x => s5.includes(x)), 'Complaints Insights: as the team\'s, until 03 Nov');
  const c5 = await z.text(charts.find(n => /chart6\.xml$/.test(n)) ? 'ppt/charts/chart6.xml' : charts[5]);
  ok(/<c:bar3DChart>/.test(c5) && /<c:view3D>/.test(c5) && /<a:gradFill/.test(c5) && /<c:v>Until 03 Nov<\/c:v>/.test(c5) && !/<c:lineChart>/.test(c5) && /<a:srgbClr val="A6A6A6"\/>/.test(c5), 'its charts: 3-D shaded columns, framed, to Until 03 Nov');
  ok(s6.includes('Complaints Insights') && s6.includes('Rebooking TKTs – From 14-Oct To 03 Nov'), `Rebooking: from the first to the last day of the workbook (${s6[1]})`);
  const cd = await z.text('ppt/charts/chart9.xml'), cm = await z.text('ppt/charts/chart10.xml');
  ok(/Booking Code Reactivations by Day/.test(cd) && /Avg Time to Close \(hh:mm\)/.test(cd) && /\[h\]:mm/.test(cd) && /<c:symbol val="circle"\/>/.test(cd) && /Booking Code Reactivations by Month/.test(cm) && /<c:v>Until 03 Nov<\/c:v>/.test(cm), 'by day (the time to close in hours and minutes, round marks) and by month (the email\'s), their titles in the charts');
  const co = await z.text('ppt/charts/chart11.xml'), ct = await z.text('ppt/charts/chart12.xml');
  ok(s7.includes('OTP Calls') && s7.includes('Final termination calls') && s7.includes('Until 03 Nov') && (co.match(/<c:trendline>/g) || []).length === 2 && /trendlineType val="exp"/.test(ct) && !/<c:legend>/.test(co), 'OTP calls (two months, day by day, two trend lines) and final termination calls (this year, a dotted trend), as the team\'s');
  ok(/<c:ptCount val="60"\/>/.test(co) && /<c:pt idx="59">/.test(co) && !/<c:pt idx="60">/.test(co) && /<c:v>5-Sep-26<\/c:v>/.test(co) && /<c:ptCount val="11"\/>/.test(ct), 'OTP: the two months to 3 Nov (the workbook\'s 60 days from 5 Sep); termination: Jan to Nov');
  ok(s9.includes('Thank You') && s9.includes('Member Care Performance Review  —  Weekly Commercial Presentation') && !s5.concat(s6).some(x => /Vnet|This Month So Far/.test(x)), 'thank you as the team\'s; no Vnet and no month-so-far table, as in the team\'s deck');
  const T3 = PrDeck.tablesOf(sampleBody({ network: false, vnet: false }), ref), z3 = await Core.readZip(await PrDeck.deck(m, T3, {}).bytes());
  const t5 = [...((await z3.text('ppt/slides/slide5.xml')) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]);
  ok(t5.includes('Network TKT: not in the email') && z3.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length === 7, 'no Network table: said so in its place; no workbook: no OTP slide (7 slides)');
  ok(PrDeck.fileName('2026-11-04') === 'MC_Performance_Review - 4 Nov 2026.pptx', 'the file name');
  // ---- 4. the made-up .msg, read with the tool's own reader
  const ex = fs.readFileSync(path.join(repo, 'js/extras.js'), 'utf8'), fn = ex.slice(ex.indexOf('function msgBodyText'), ex.indexOf('/** "Name / Team" pairs'));
  const msgBodyText = new Function(fn + '; return msgBodyText;')();
  const back = msgBodyText(new Uint8Array(msgFile(sampleBody())));
  ok(PrDeck.tablesOf(back, ref).length === 5, 'the made-up .msg read back by the tool\'s Outlook reader: five tables');
  // ---- 6. the Call history export (made up, laid out as Crystal's)
  const sr = (iso, h = 10) => ser(iso) + h / 24, hdr = ['Ser.', 'Caller ID', 'Agent ID', 'Call Date', 'Type', 'Service', 'Sub Service', 'Notes', 'Language', 'Contact Type', 'App User'];
  let k0 = 0; const cr = (date, type, service, subS, contact = 'CALL', n = 1) => Array.from({ length: n }, () => [++k0, '0500000000', 'AGENT.A', date, type, service, subS, 'note', 'Arabic', contact, 'NA']);
  const hist = [['User :', 'A.TEST', 'Call Center History Report', 'From :', '01-11-2026', 'To :', '03-11-2026', null, null, null, null], hdr,
    ...cr(sr('2026-11-01'), 'FRiENDi Complaint', 'New Complaint', 'OTP is not received', 'CALL', 2), ...cr(sr('2026-11-01'), 'FRiENDi Complaint', 'New Complaint', 'OTP is not received', 'WhatsApp'),
    ...cr(sr('2026-11-01'), 'Virgin Complaints', 'App', 'App OTP isn’t Received'), ...cr(sr('2026-11-01'), 'FRiENDi Final Deactivation', 'Prepaid/Basic Number', 'Termination Done', 'CALL', 4),
    ...cr(sr('2026-11-01'), 'Virgin Final Deactivation', 'Social Media', 'Waiting Reply', 'WhatsApp'), ...cr(sr('2026-11-01'), 'Virgin Final Deactivation', 'Prepaid/Basic Number', 'Backing out from Final Termination', 'CALL', 2),
    ...cr(sr('2026-11-01'), 'Virgin Inquiry', 'Bundles/Plans', 'Data Bundles', 'CALL', 5), ...cr(sr('2026-11-01'), 'Virgin Inquiry', 'Internet', 'Hotspot settings'),
    ...cr(ser('2026-11-02') + 0.99999, 'FRiENDi Complaint', 'New Complaint', 'OTP is not received'), ...cr(sr('2026-11-02'), 'FRiENDi Final Deactivation', 'Prepaid/Basic Number', 'Termination Done', 'CALL', 3),
    ...cr('03-11-2026 10:15', 'FRiENDi Final Deactivation', 'Prepaid/Basic Number', 'Call Dropped'), [null, null, null, sr('2026-11-03'), null, null, null, null, null, null, null]];
  const CH = PrDeck.callsOf([{ name: 'Sheet1', rows: hist }]), n1 = CH && CH.days['2026-11-01'];
  ok(CH && Object.keys(CH.days).sort().join() === '2026-11-01,2026-11-02,2026-11-03' && CH.rows === 22, `the Call history: its header found under the title, three days, 22 contacts (an empty row left out): ${CH && Object.keys(CH.days).join(', ')}`);
  ok(n1 && n1.calls === 17 && n1.otp === 4 && n1.otpCall === 3 && n1.term === 7 && n1.termCall === 6 && n1.done === 4 && n1.doneCall === 4, `1 Nov: 4 OTP calls (3 by phone; "Hotspot" is not OTP), 7 final termination calls (6 by phone), 4 terminations done: ${JSON.stringify(n1)}`);
  ok(CH.days['2026-11-02'].otp === 1 && CH.days['2026-11-02'].done === 3 && CH.days['2026-11-03'].term === 1 && CH.days['2026-11-03'].done === 0, 'a call at 23:59 is on its own day; a date written as text (03-11-2026 10:15) is read');
  ok(CH.labels.otp['OTP is not received'] === 4 && CH.labels.otp['App OTP isn’t Received'] === 1 && CH.labels.term['FRiENDi Final Deactivation'] === 8 && CH.labels.term['Virgin Final Deactivation'] === 3, 'what was counted, by name');
  ok(PrDeck.callsOf(book) === null && PrDeck.callsOf([{ name: 'x', rows: [['Tickets Report'], ['Ser.', 'Ticket Date', 'Type']] }]) === null, 'the KPIs workbook and the Tickets export are not a Call history');
  const mg = PrDeck.callsMerge({ '2026-11-01': { calls: 10, otp: 1 }, '2026-11-02': { calls: 50, otp: 5 } }, { '2026-11-01': { calls: 12, otp: 2 }, '2026-11-02': { calls: 20, otp: 9 }, '2026-11-03': { calls: 5, otp: 0 } });
  ok(mg['2026-11-01'].otp === 2 && mg['2026-11-02'].otp === 5 && mg['2026-11-03'].otp === 0, 'a day in two exports keeps the fuller one; a new day is added');
  ok(PrDeck.monthsBack('2026-11-03', 2) === '2026-09-03' && PrDeck.monthsBack('2026-04-30', 2) === '2026-02-28' && PrDeck.monthsBack('2026-01-15', 2) === '2025-11-15', 'two months back (the 30th of April: the last day of February; January: November of the year before)');
  const T1 = PrDeck.otpTerm(K, CH.days, {});
  ok(T1.otp.length === 60 && T1.otp[0].date === '2026-09-05' && T1.otp.find(r => r.date === '2026-11-01').n === 4 && T1.otpEnd === '2026-11-03', 'with the workbook: two months to 3 Nov, the Call history\'s days instead of the workbook\'s');
  ok(T1.term.length === 11 && T1.term[10].ym === '2026-11' && T1.term[10].n === 11 && T1.term[9].n === K.term[9].n && T1.termEnd === '2026-11-03', `the Call history has November whole (1–3 Nov): its 11 final termination calls; October stays the workbook's (${T1.term[9].n})`);
  const T2c = PrDeck.otpTerm({}, { '2026-11-01': CH.days['2026-11-01'], '2026-11-03': CH.days['2026-11-03'] }, { ch: 'call', term: 'done' });
  ok(T2c.otp.map(r => r.n).join() === '3,,0' && T2c.term.length === 1 && T2c.term[0].n === 4, `calls only, terminations done; a day with no data left blank (${T2c.otp.map(r => r.n).join()})`);
  const T3c = PrDeck.otpTerm({ term: [{ ym: '2026-10', n: 9000 }] }, { '2026-10-20': CH.days['2026-11-01'], '2026-12-01': CH.days['2026-11-02'] }, {});
  ok(T3c.term.map(r => `${r.ym}:${r.n}`).join() === '2026-10:9000,2026-12:3' && T3c.otp[0].date === '2026-10-20' && T3c.otp.length === 43, 'a month the Call history has only part of keeps the workbook\'s; a month the workbook lacks comes from the Call history');
  ok(PrDeck.otpTerm({}, {}, {}).otp === null && PrDeck.otpTerm({}, {}, {}).term === null, 'nothing to show: no slide');
  const zc = await Core.readZip(await PrDeck.deck(m, T, { calls: CH.days }).bytes()), zcs = zc.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const cx = await Promise.all(zc.names().filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)).map(n => zc.text(n))), ocx = cx.find(x => /OTP Count/.test(x)) || '', otx = cx.find(x => /Final termination Count/.test(x)) || '';
  const s7c = [...((await zc.text('ppt/slides/slide7.xml')) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]);
  ok(zcs.length === 9 && s7c.includes('OTP Calls') && s7c.filter(x => x === 'Until 03 Nov').length === 2 && /<c:v>1-Nov-26<\/c:v>/.test(ocx) && /<c:v>4<\/c:v>/.test(ocx) && (ocx.match(/<c:trendline>/g) || []).length === 2 && /<c:v>Nov-26<\/c:v>/.test(otx) && /<c:v>11<\/c:v>/.test(otx) && !/<c:trendline>/.test(otx), 'the deck from the Call history alone: OTP calls 1–3 Nov with their trend, final termination calls for November (no trend for one month)');
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
