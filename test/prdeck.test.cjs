// The Member Care Performance Review, in Node, with a made-up "MC performance Review" email only:
// 1. The email's tables read from its text as Outlook keeps it (a cell a line) and as copied (tab-separated): titles, header,
//    a row per month (Jan, Jun-25, 1-Jan, Oct-26), the month to date ("Nov to 3", "11/1/2026 to 3": Until 03 Nov), the year of a
//    month with none, numbers with commas and percentages, the signature left out; a table the deck does not know kept as other.
// 2. The charts: the Total left out when there are other columns, a share as a line on its own axis.
// 3. The deck: cover, Virgin, FRiENDi and Postpaid, two Complaints Insights slides (the numbers on them), a slide for the other
//    table, thank you; "Not in the email" where a table is missing; its file name.
// 4. The made-up .msg the browser test drops is read back by the tool's own reader.
// Usage: node test/prdeck.test.cjs [outDir: the made-up deck is written there]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const repo = path.join(__dirname, '..');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const src = fs.readFileSync(path.join(repo, 'js/rb_src.html'), 'utf8'), code = src.split('<script id="rb-code">')[1].split('</' + 'script>')[0];
const W = { console, TextDecoder, TextEncoder, setTimeout, clearTimeout }; W.window = W; vm.createContext(W); vm.runInContext(code, W);
const E = W.Engine, Core = require(path.join(repo, 'js/core.js')), WcDeck = require(path.join(repo, 'js/wcdeck.js')), PrDeck = require(path.join(repo, 'js/prdeck.js'));
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
  ok(c2.bars.length === 2 && c2.line && c2.line.fmt === '0%' && c2.line.max <= 1 && c2.line.max >= 0.5, `Web + App: two columns and the share as a line (its axis to ${c2.line.max * 100}%)`);
  ok(c3.bars.map(b => b.name).join() === 'Total', 'Vnet: its Total, the only column');
  ok(PrDeck.chartOf(by('social')).catRot === -45, 'many months: the labels slanted');
  // ---- 3. the deck
  const H = {}; for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) H[b] = { voice: { monthly: [{ date: '2026-09-01', presented: 1000, handled: 950, sl: 0.9 }], daily: [1, 2, 3].map(d => ({ date: `2026-11-0${d}`, presented: 1000, handled: 980, sl: 0.85 })) } };
  const m = WcDeck.model({ date: '2026-11-04', hist: H }, E);
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  const bytes = await PrDeck.deck(m, T, { presenter: 'Huda S.', title: 'Member Care lead', org: 'Beyond One', logo: { png, w: 300, h: 100 } }).bytes();
  if (process.argv[2]) { fs.mkdirSync(process.argv[2], { recursive: true }); fs.writeFileSync(path.join(process.argv[2], PrDeck.fileName('2026-11-04')), bytes); }
  const z = await Core.readZip(bytes), names = z.names(), X = async n => [...((await z.text(n)) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const slides = names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, charts = names.filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)).length;
  ok(slides === 8 && charts === 5 + 5 + 1 && names.filter(n => /^ppt\/embeddings\/.+\.xlsx$/.test(n)).length === charts, `8 slides (cover, three brands, two Complaints Insights, OTP Calls, thank you), ${charts} charts (five on the brands' slides, five from the email, OTP Calls), each with its workbook`);
  const s1 = await X('ppt/slides/slide1.xml'), s2 = await X('ppt/slides/slide2.xml'), s5 = await X('ppt/slides/slide5.xml'), s6 = await X('ppt/slides/slide6.xml'), s7 = await X('ppt/slides/slide7.xml'), s8 = await X('ppt/slides/slide8.xml');
  ok(s1.includes('Member Care Performance Review') && s1.includes('Virgin Mobile  ·  FRiENDi Mobile  ·  FRiENDi Pay') && s1.includes('4 Nov 2026') && s1.includes('Huda S.'), 'the cover: Member Care Performance Review, the three brands, the day, the presenter');
  ok(s2.includes('Performance Insights') && s2.includes('Member Care Performance Review  ·  4 Nov 2026'), "the brands' slides with the review's name over them");
  ok(['Complaints Insights', 'Web + App TKTs – Until 03 Nov', 'Network Issues TKTs – Until 03 Nov', 'Social Media issue TKTs – Until 03 Nov'].every(x => s5.includes(x)), 'Complaints Insights: Web + App, Network, Social media, until 03 Nov');
  ok(['Rebooking TKTs (booking code reactivations) – Until 03 Nov', 'Vnet Complaints – Until 03 Nov', 'This Month So Far', 'Rebooking · Virgin', '80', '690', 'Vnet complaints', '7', '90'].every(x => s6.includes(x)), 'Complaints Insights: Rebooking, Vnet, the month so far against October');
  ok(s7.includes('More Insights') && s7.includes('OTP Calls – Until 03 Nov') && s8.includes('Thank You') && s8.includes('Member Care Performance Review'), 'the other table on its own slide; thank you');
  const c5 = await z.text('ppt/charts/chart6.xml');   // after the brands' five
  ok(/<c:v>Jan-26<\/c:v>/.test(c5) && /<c:v>Until 03 Nov<\/c:v>/.test(c5) && /Web \+ App share of all complaints/.test(c5), "the Web + App chart: Jan-26 to Until 03 Nov, the share's line");
  const T3 = PrDeck.tablesOf(sampleBody({ network: false, vnet: false }), ref), z3 = await Core.readZip(await PrDeck.deck(m, T3, {}).bytes());
  const t5 = await (async n => [...((await z3.text(n)) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]))('ppt/slides/slide5.xml'), t6 = [...((await z3.text('ppt/slides/slide6.xml')) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]);
  ok(t5.includes('Not in the email') && t6.includes('Not in the email') && z3.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length === 7, 'no Network and no Vnet table: "Not in the email" in their places, 7 slides');
  ok(PrDeck.fileName('2026-11-04') === 'MC_Performance_Review - 4 Nov 2026.pptx', 'the file name');
  // ---- 4. the made-up .msg, read with the tool's own reader
  const ex = fs.readFileSync(path.join(repo, 'js/extras.js'), 'utf8'), fn = ex.slice(ex.indexOf('function msgBodyText'), ex.indexOf('/** "Name / Team" pairs'));
  const msgBodyText = new Function(fn + '; return msgBodyText;')();
  const back = msgBodyText(new Uint8Array(msgFile(sampleBody())));
  ok(PrDeck.tablesOf(back, ref).length === 5, 'the made-up .msg read back by the tool\'s Outlook reader: five tables');
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
