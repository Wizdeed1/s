// WFM team › Performance Review in the browser, as the WFM manager, with a made-up "MC performance Review" email and made-up
// history only:
// 1. The tab (Every week, after Weekly commercial); the deck and the email wait for the email.
// 2. The .msg chosen: its tables listed (months, the month to date, the last row), an extra table marked as its own slide.
// 3. Download deck: the .pptx with the brands' slides, the two Complaints Insights slides and the extra one; Email with the deck:
//    an Outlook draft to the VP from the contacts (the final result form's contact in copy), the deck attached.
// 4. The Call history export (made up, as Crystal's; as .xlsx, and as .xls read by the report builder's reader): OTP calls and final
//    termination calls counted by day and kept with the days the shared data had, and with a day another computer added meanwhile
//    (a day dropped again keeps its fuller export),
//    the team's old deck (made up) dropped: its numbers kept as they are and the Call history after them (October completed, the
//    days still missing named), what counts changed without a new drop, the deck's OTP slide from them, Clear and Undo.
//    The month's Call history and Tickets exports dropped on the brands' step: what was dropped, what is missing (another day's
//    Call history said so), the Virgin slide's Top Call Reasons and Top Complaint Drivers from them.
// 5. An email dropped on the drop zone is read once; a pasted text with two tables says which are not in it; a picture is refused
//    with what to do instead.
// 6. The senior manager has no tab; at phone width nothing runs off the page; no errors.
// Usage: node test/perfrev.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js'), { msgFile, sampleBody } = require('./msgfile.cjs');
const [page0, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const H = {}; for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) H[b] = { voice: { monthly: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => ({ date: `2026-${String(m).padStart(2, '0')}-01`, presented: 1000 + m * 10, handled: 900 + m * 10, sl: 0.6 + m * 0.03 })), daily: [1, 2, 3].map(d => ({ date: `2026-11-0${d}`, presented: 1000 + d, handled: 990, sl: 0.88 })) } };
const quiet = () => { try { localStorage.setItem('mc-today-toast:u2', '2026-11-04'); localStorage.setItem('mc-today-toast:u3', '2026-11-04'); } catch (e) { /* none */ } };
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (user, vw = 1440) => {
    const ctx = await b.newContext({ viewport: { width: vw, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-04T10:00:00'));
    await p.addInitScript(([fx, h, u, q]) => { eval(fx); eval(q)(); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; try { localStorage.setItem('mc.history.v1', JSON.stringify(h)); } catch (e) { /* none */ } }, [fixture, H, user, `(${quiet})`]);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.evaluate(() => { const M = window.__mc; M.state.contacts = { vp: 'Huda S. <huda.s@example.com>', form: 'Omar T. <omar.t@example.com>' }; M.state.wfmTab = 'perf'; M.setWs('wfm'); });
    return p;
  };
  const p = await open({ id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' });
  await p.waitForSelector('#wfmBody .prflow', { timeout: 30000 });
  // ---- 1. the tab
  const g = await p.evaluate(() => { const grp = [...document.querySelectorAll('#wfmTabs .wfmgrp')].find(x => x.querySelector('[data-wt="perf"]')); return { grp: grp && grp.querySelector('small').textContent, tabs: grp && [...grp.querySelectorAll('[data-wt]')].map(x => x.dataset.wt).join(), lead: document.getElementById('wfmLead').textContent, off: document.querySelector('#wfmBar [data-prdeck]').disabled && document.querySelector('#wfmBar [data-prmail]').disabled }; });
  ok(g.grp === 'Every week' && g.tabs === 'weekly,perf' && /Member Care Performance Review/.test(g.lead), `the tab in "${g.grp}" after Weekly commercial, with its lead`);
  ok(g.off, 'the deck and the email wait for the email');
  // ---- 2. the .msg
  const msg = path.join(out, 'MC performance Review.msg'); fs.writeFileSync(msg, msgFile(sampleBody({ extra: true })));
  await p.setInputFiles('#wfmBody [data-prpick]', msg); await p.waitForSelector('#wfmBody .prtab', { timeout: 15000 });
  const rows = await p.evaluate(() => [...document.querySelectorAll('#wfmBody .prtab tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.trim())));
  ok(rows.length === 6 && rows[0][0] === 'Rebooking TKTs' && rows[0][1] === 'Jan-26 → Until 03 Nov' && rows[0][4] === '80 · 70 · 150', `six tables read: ${rows.map(r => r[0]).join(', ')}`);
  ok(rows[2][4] === '250 · 700 · 35.7%' && rows[5][0] === 'OTP Calls' && /its own slide/i.test(rows[5][5]), 'the last rows (a share as a %), the extra table on its own slide');
  ok(await p.evaluate(() => !document.querySelector('#wfmBar [data-prdeck]').disabled && /Read from MC performance Review\.msg/.test(document.querySelector('#wfmBody #prs-mail').textContent)), 'read from the .msg; the deck can be made');
  ok(await p.evaluate(() => [...document.querySelectorAll('#wfmBody .prslides li')].map(l => l.textContent).join('|') === 'Cover|Virgin Mobile|FRiENDi Mobile|Postpaid|Complaints Insights: Web + App, Network, Social media|Complaints Insights: Rebooking by month|More Insights: OTP Calls|Thank you'), 'the slides listed');
  // ---- 3. the deck and the email
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prdeck]')]);
  const deckF = path.join(out, dl.suggestedFilename()); await dl.saveAs(deckF);
  // a slide's texts: each run, and each paragraph whole (a title is a regular run and its last word in bold, on the template)
  const paras = x => [...(x || '').matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map(p => [...p[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]).join('').replace(/&amp;/g, '&')).filter(Boolean);
  const z = await Core.readZip(fs.readFileSync(deckF)), X = async n => { const x = (await z.text(n)) || ''; return [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1].replace(/&amp;/g, '&')).concat(paras(x)); };
  const n = z.names().filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length, s5 = await X('ppt/slides/slide5.xml'), s6 = await X('ppt/slides/slide6.xml'), s1 = await X('ppt/slides/slide1.xml');
  ok(dl.suggestedFilename() === 'MC_Performance_Review - 4 Nov 2026.pptx' && n === 8, `Download deck: ${dl.suggestedFilename()}, ${n} slides`);
  ok(s1.includes('Member Care Performance Review') && s1.includes('Huda S.') && s5.includes('Web + App TKTs – Until 03 Nov') && s5.includes('Network TKT – Until 03 Nov') && s6.includes('Rebooking TKTs – Until 03 Nov'), 'the cover with the VP as presenter; Complaints Insights and Rebooking from the email, as the team\'s deck');
  const [em] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prmail]')]);
  const emlF = path.join(out, em.suggestedFilename()); await em.saveAs(emlF); const eml = fs.readFileSync(emlF, 'utf8');
  const part = eml.split(/\r\n--mc_[a-z0-9]+\r\n/).find(x => /presentationml\.presentation/.test(x)) || '', att = await Core.readZip(Buffer.from((part.split('\r\n\r\n')[1] || '').replace(/\s+/g, ''), 'base64')).catch(() => null);
  const txt = (eml.match(/Content-Type: text\/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n\r\n/) || [])[1] || '';
  ok(em.suggestedFilename() === 'MC Performance Review - 4 Nov 2026.eml' && /\r\nTo: "Huda S\." <huda\.s@example\.com>/.test(eml) && /\r\nCc: "Omar T\." <omar\.t@example\.com>/.test(eml) && /\r\nSubject: MC Performance Review\r\n/.test(eml), 'Email with the deck: to the VP, the contact in copy, "MC Performance Review"');
  ok(/name="MC_Performance_Review - 4 Nov 2026\.pptx"/.test(part) && att && att.has('ppt/presentation.xml') && Buffer.from(txt.replace(/\s+/g, ''), 'base64').toString('utf8') === 'Hi Huda,\r\nKindly find the MC Performance Review as attached.\r\nSincerely.', 'the deck attached; "Hi Huda, Kindly find the MC Performance Review as attached. Sincerely."');
  const st3 = await p.evaluate(() => ({ done: [...document.querySelectorAll('#wfmBody .flowstep')].map(s => s.classList.contains('done')).join(), brand: document.querySelector('#prs-brand').textContent }));
  ok(st3.done === 'true,false,false,true' && /No Call history for the month yet: the Top Call Reasons show "–"\./.test(st3.brand) && /No Tickets export for the month yet: Complaints logged/.test(st3.brand), 'every step done but the brands\' slides (no Call history or Tickets export for the month: said so) and the OTP and final termination calls');
  // ---- the MC KPIs workbook and one of the team's decks (both made up): the three charts the email lacks, and the logos
  const W2 = require('../js/writer2.js'), Pptx = require('../js/pptx.js'), S2 = new W2.Styles(), rbS = new W2.Sheet('Reactivate the Booking code '), otS = new W2.Sheet('OTP & Termination');
  const ser = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000), iso = (m, d) => new Date(Date.UTC(2026, m - 1, d)).toISOString().slice(0, 10);
  rbS.set(4, 10, 'Virgin'); rbS.set(4, 11, 'Friendi'); rbS.set(4, 12, 'Avg Time to Close');
  for (let k = 0; k < 21; k++) { rbS.set(5 + k, 9, ser(iso(10, 14 + k))); rbS.set(5 + k, 10, 20 + (k % 9)); rbS.set(5 + k, 11, 15 + (k % 7)); rbS.set(5 + k, 12, 0.04 + (k % 5) * 0.03); }
  otS.set(3, 3, 'OTP Count'); otS.set(3, 18, 'Final termination Count');
  for (let k = 0; k < 60; k++) { otS.set(18 + k, 2, ser(iso(9, 5 + k))); otS.set(18 + k, 3, 30 + (k % 25)); }
  for (let mo = 1; mo <= 11; mo++) { otS.set(3 + mo, 17, ser(iso(mo, 1))); otS.set(3 + mo, 18, 20000 - mo * 1000); }
  const kpiF = path.join(out, 'MC KPIs.xlsx'); fs.writeFileSync(kpiF, Buffer.from(await W2.pack([rbS, otS], S2)));
  const dot = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')), LD = Pptx.create({});
  LD.slide({ bg: '1E2761' }).image(0.55, 0.5, 0.48, 0.48, dot, { descr: 'beyondone_mark_only.png' });
  const v2 = LD.slide({}); v2.image(0.45, 0.36, 0.3, 0.46, dot, { descr: 'beyondone_full.png' }); v2.image(12.45, 0.3, 0.4, 0.4, dot, { descr: 'virgin_logo.png' });
  LD.slide({}).image(12.45, 0.3, 0.4, 0.4, dot, { descr: 'friendi_logo.png' });
  const deckIn = path.join(out, 'An old review.pptx'); fs.writeFileSync(deckIn, Buffer.from(await LD.bytes()));
  await p.setInputFiles('#wfmBody [data-prpick]', [kpiF, deckIn]); await p.waitForFunction(() => document.querySelectorAll('#wfmBody .prlogos img').length > 0, null, { timeout: 15000 });
  const kp = await p.evaluate(() => ({ line: [...document.querySelectorAll('#prs-mail .hint')].map(x => x.textContent).find(t => /MC KPIs workbook/.test(t)) || '', logos: [...document.querySelectorAll('#wfmBody .prlogos img')].map(i => i.alt).join(), slides: [...document.querySelectorAll('#wfmBody .prslides li')].map(l => l.textContent).join('|') }));
  ok(/MC KPIs workbook \(MC KPIs\.xlsx\): Rebooking by day 14 Oct → 3 Nov · OTP calls 60 days to 3 Nov · Final termination calls 11 months/.test(kp.line), `the workbook read: ${kp.line}`);
  ok(kp.logos === 'Beyond One mark,Beyond One,Virgin Mobile,FRiENDi Mobile' && /Rebooking by day and by month\|OTP calls and Final termination calls/.test(kp.slides), `the deck's logos kept (${kp.logos}); the slides now with Rebooking by day and OTP calls`);
  const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prdeck]')]);
  const d2 = path.join(out, 'with-kpi.pptx'); await dl2.saveAs(d2);
  const z2 = await Core.readZip(fs.readFileSync(d2)), n2 = z2.names().filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length, x2 = await z2.text('ppt/slides/slide2.xml'), x7 = await z2.text('ppt/slides/slide7.xml');
  const p7 = paras(x7).join('\n');
  ok(n2 === 9 && (x2.match(/<p:pic>/g) || []).length === 2 && /OTP Calls/.test(p7) && /Final termination calls/.test(p7) && /Booking Code Reactivations by Day/.test(await z2.text('ppt/charts/chart9.xml')), `the deck with the workbook and the logos: ${n2} slides, Rebooking by day, OTP and final termination calls, the logos on the slides`);
  // ---- 4. the Call history export (made up, laid out as Crystal's), with the days the shared data had
  const chS = new W2.Sheet('Sheet1'), CH = [['User :', 'A.TEST', 'Call Center History Report', 'From :', '01-11-2026', 'To :', '03-11-2026'], ['Ser.', 'Caller ID', 'Agent ID', 'Call Date', 'Type', 'Service', 'Sub Service', 'Notes', 'Language', 'Contact Type', 'App User']];
  const crow = (d, h, type, service, subS, contact, k) => { for (let i = 0; i < k; i++) CH.push([CH.length - 1, '0500000000', 'AGENT.A', ser(iso(11, d)) + h / 24, type, service, subS, 'note', 'Arabic', contact, 'NA']); };
  for (const d of [1, 2, 3]) { crow(d, 9, 'FRiENDi Complaint', 'New Complaint', 'OTP is not received', 'CALL', 10 + d); crow(d, 10, 'Virgin Complaints', 'App', "App OTP isn't Received", 'WhatsApp', 2); crow(d, 11, 'FRiENDi Final Deactivation', 'Prepaid/Basic Number', 'Termination Done', 'CALL', 100 + d); crow(d, 12, 'Virgin Final Deactivation', 'Prepaid/Basic Number', 'Backing out from Final Termination', 'CALL', 20); crow(d, 13, 'Virgin Inquiry', 'Bundles/Plans', 'Data Bundles', 'CALL', 50); }
  CH.forEach((r, i) => r.forEach((v, j) => chS.set(i + 1, j + 1, v)));
  const chF = path.join(out, 'Call history.xlsx'); fs.writeFileSync(chF, Buffer.from(await W2.pack([chS], new W2.Styles())));
  await p.evaluate(async () => {
    const M = window.__mc, day = (calls, otp) => ({ calls, otp, otpCall: otp - 1, term: 90, termCall: 88, done: 70, doneCall: 69 });
    window.__store = { 'config/calldays': { days: { '2026-10-30': day(100, 7), '2026-10-31': day(100, 9), nope: day(1, 1), '2026-11-01': day(50, 99) }, rule: { ch: 'all', term: 'nope' } } };
    const doc = k => ({ get: async () => ({ exists: k in window.__store, data: () => JSON.parse(JSON.stringify(window.__store[k])) }), set: async v => { window.__store[k] = JSON.parse(JSON.stringify(v)); }, delete: async () => { delete window.__store[k]; } });
    const W = M.wc().WC; M.state.db = { doc, local: true, persistent: true }; W.loaded = null; W.boot = null; W.ready = false; M.state.callDays = null;
    M.renderWs(); await new Promise(r => setTimeout(r, 1500));
  });
  const seeded = await p.evaluate(() => ({ kept: (document.querySelector('#prs-calls') || {}).textContent || '', days: Object.keys(window.__mc.state.callDays.days).join(), rule: window.__mc.state.callDays.rule.term }));
  ok(seeded.days === '2026-10-30,2026-10-31,2026-11-01' && seeded.rule === 'all' && /the counts of 3 days \(30 Oct – 1 Nov\)/.test(seeded.kept), `the days the shared data had (a key that is not a day and a rule it does not know dropped): ${seeded.days}`);
  await p.evaluate(() => { window.__store['config/calldays'].days['2026-10-29'] = { calls: 100, otp: 5, otpCall: 4, term: 90, termCall: 88, done: 70, doneCall: 69 }; });   // another computer adds 29 Oct
  await p.setInputFiles('#wfmBody [data-prpick="calls"]', chF);
  await p.waitForFunction(() => /Read from Call history\.xlsx/.test(document.querySelector('#prs-calls').textContent) && /the counts of 6 days/.test(document.querySelector('#prs-calls').textContent), null, { timeout: 15000 }); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => ({ t: document.querySelector('#prs-calls').textContent, done: document.querySelector('#prs-calls').classList.contains('done'), saved: window.__store['config/calldays'], slides: [...document.querySelectorAll('#wfmBody .prslides li')].map(l => l.textContent).join('|') }));
  ok(/Read from Call history\.xlsx: 1–3 Nov · 558 contacts · 42 OTP calls · 366 final termination calls\./.test(c1.t) && /OTP is not received 36, App OTP isn't Received 6; FRiENDi Final Deactivation 306, Virgin Final Deactivation 60/.test(c1.t), 'the Call history read: 42 OTP calls and 366 final termination calls over 1–3 Nov, what was counted by name');
  ok(/the counts of 6 days \(29 Oct – 3 Nov\)/.test(c1.t) && /OTP calls day by day, 29 Oct → 3 Nov \(6 of the 61 days of the two months\); final termination calls by month, Oct 2026 → Nov 2026, until 3 Nov\./.test(c1.t) && /No data yet for 4 Sep – 28 Oct: drop those days' Call history/.test(c1.t) && /Drop your old deck \(\.pptx\) or the MC KPIs workbook once/.test(c1.t) && c1.done, 'kept with the days before, and 29 Oct added on another computer meanwhile (1 Nov from the fuller export); the slide: the days kept, the days missing named, the old deck asked for');
  ok(Object.keys(c1.saved.days).join() === '2026-10-29,2026-10-30,2026-10-31,2026-11-01,2026-11-02,2026-11-03' && c1.saved.days['2026-11-01'].otp === 13 && c1.saved.days['2026-11-03'].done === 103 && c1.saved.by === 'Noura B.' && !JSON.stringify(c1.saved).includes('0500000000') && /OTP calls and Final termination calls/.test(c1.slides), 'kept for everyone (config/calldays): the counts by day only, by Noura B.');
  // the team's old deck (made up, its charts as PowerPoint keeps them): its numbers kept as they are, the Call history after them
  const cx = (name, fmt, cats, vals) => `<c:chartSpace><c:chart><c:plotArea><c:barChart><c:ser><c:tx><c:strRef><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${name}</c:v></c:pt></c:strCache></c:strRef></c:tx><c:cat><c:numRef><c:numCache><c:formatCode>${fmt}</c:formatCode><c:ptCount val="${cats.length}"/>${cats.map((c, i) => `<c:pt idx="${i}"><c:v>${c}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:cat><c:val><c:numRef><c:numCache><c:formatCode>#,##0</c:formatCode><c:ptCount val="${vals.length}"/>${vals.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`;
  const od = Array.from({ length: 50 }, (_, k) => ser(iso(8, 20 + k)));
  const oldF = path.join(out, 'Old review.pptx'); fs.writeFileSync(oldF, Buffer.from(await Core.writeZip([{ name: 'docProps/app.xml', data: '<Properties><Application>Microsoft Office PowerPoint</Application></Properties>' },
    { name: 'ppt/charts/chart1.xml', data: cx('OTP Count', 'd\\-mmm\\-yy', od, od.map((_, k) => 40 + (k % 9))) }, { name: 'ppt/charts/chart2.xml', data: cx('Final termination Count', 'mmm\\-yy', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(mo => ser(iso(mo, 1))), [12000, 11500, 11000, 10500, 10000, 9500, 9000, 8500, 8000, 2000]) }])));
  await p.setInputFiles('#wfmBody [data-prpick="calls"]', oldF);
  await p.waitForFunction(() => /Kept as they are/.test(document.querySelector('#prs-calls').textContent), null, { timeout: 15000 }); await p.waitForTimeout(300);
  const c1b = await p.evaluate(() => ({ t: document.querySelector('#prs-calls').textContent, saved: window.__store['config/calldays'] }));
  ok(/Kept as they are, from Old review\.pptx: OTP calls on 50 days \(20 Aug – 8 Oct\) and final termination calls Jan 2026 → Oct 2026, Oct until 8 Oct\./.test(c1b.t) && /OTP calls day by day, 4 Sep → 3 Nov \(41 of the 61 days of the two months\); final termination calls by month, Jan 2026 → Nov 2026, until 3 Nov\./.test(c1b.t) && /No data yet for 9–28 Oct:/.test(c1b.t), 'the old deck dropped: its OTP calls and final termination calls kept as they are; the slide from 4 Sep with them, then the Call history; 9–28 Oct named as missing');
  ok(c1b.saved.base && Object.keys(c1b.saved.base.otp).length === 50 && c1b.saved.base.term['2026-10'].n === 2000 && c1b.saved.base.term['2026-10'].end === '2026-10-08' && c1b.saved.base.from === 'Old review.pptx' && Object.keys(c1b.saved.days).length === 6, 'kept for everyone with the Call history\'s days: the deck\'s 50 days and 10 months (October to the 8th)');
  await p.click('#wfmBody [data-prset] summary'); await p.selectOption('#wfmBody [data-prrule="ch"]', 'call'); await p.waitForTimeout(200); await p.selectOption('#wfmBody [data-prrule="term"]', 'done'); await p.waitForTimeout(300);
  const c2 = await p.evaluate(() => ({ t: document.querySelector('#prs-calls').textContent, rule: window.__store['config/calldays'].rule, open: document.querySelector('#wfmBody [data-prset]').open }));
  ok(/· 36 OTP calls · 306 final termination calls\./.test(c2.t) && c2.rule.ch === 'call' && c2.rule.term === 'done' && c2.open, `calls only and the terminations done, with no new drop: ${(c2.t.match(/· (\d+) OTP calls · (\d+) final/) || []).slice(1).join(', ')}; saved`);
  const [dl3] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prdeck]')]);
  const d3 = path.join(out, 'with-calls.pptx'); await dl3.saveAs(d3);
  const z3 = await Core.readZip(fs.readFileSync(d3)), cx3 = await Promise.all(z3.names().filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)).map(n => z3.text(n))), oc3 = cx3.find(x => /OTP Count/.test(x)) || '', tc3 = cx3.find(x => /Final termination Count/.test(x)) || '';
  ok(/<c:ptCount val="61"\/>/.test(oc3) && /<c:v>4-Sep-26<\/c:v>/.test(oc3) && /<c:v>3-Nov-26<\/c:v>/.test(oc3) && /<c:v>13<\/c:v>/.test(oc3) && /<c:v>Nov-26<\/c:v>/.test(tc3) && /<c:v>8000<\/c:v>/.test(tc3) && /<c:v>2207<\/c:v>/.test(tc3) && /<c:v>306<\/c:v>/.test(tc3), 'the deck: OTP calls 4 Sep – 3 Nov (the old deck\'s, then 13 by phone on 3 Nov); the old deck\'s months, October completed with 29–31 Oct (2,207), 306 terminations done in November');
  await p.click('#wfmBody [data-prcallsrm]'); await p.waitForTimeout(300);
  const c3 = await p.evaluate(() => ({ t: document.querySelector('#prs-calls').textContent, n: Object.keys(window.__store['config/calldays'].days).length, base: window.__store['config/calldays'].base }));
  ok(!/From the Call history: the counts/.test(c3.t) && !/Kept as they are/.test(c3.t) && c3.n === 0 && !c3.base, 'Clear: nothing kept (the old deck\'s numbers and the Call history\'s days)');
  await p.click('#toast button'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.keys(window.__store['config/calldays'].days).length === 6 && !!window.__store['config/calldays'].base && /the counts of 6 days/.test(document.querySelector('#prs-calls').textContent) && /Kept as they are/.test(document.querySelector('#prs-calls').textContent)), 'Undo: the six days and the old deck\'s numbers back');
  const x4 = await p.evaluate(async () => {   // the Crystal .xls, read by the report builder's reader (its rows made up here)
    const old = window.parseXls, ser = d => Date.UTC(2026, 10, d) / 86400000 + 25569;
    window.parseXls = () => [{ name: 'Sheet1', rows: [['User :', 'A.TEST', 'Call Center History Report'], ['Ser.', 'Caller ID', 'Agent ID', 'Call Date', 'Type', 'Service', 'Sub Service', 'Notes', 'Language', 'Contact Type', 'App User'], [1, '0500000000', 'AGENT.A', ser(4) + 0.4, 'FRiENDi Complaint', 'New Complaint', 'OTP is not received', '', 'Arabic', 'CALL', 'NA'], [2, '0500000000', 'AGENT.A', ser(4) + 0.5, 'Virgin Final Deactivation', 'Prepaid/Basic Number', 'Termination Done', '', 'Arabic', 'CALL', 'NA']] }];
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(8)], 'Call history (6).xls')); document.querySelector('#wfmBody [data-prdrop="calls"]').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 800)); window.parseXls = old;
    return { t: document.querySelector('#prs-calls').textContent, days: Object.keys(window.__store['config/calldays'].days).join(), recog: !!document.querySelector('#recogPanel:not([hidden])') };
  });
  ok(/Read from Call history \(6\)\.xls: 4 Nov · 2 contacts · 1 OTP call · 1 final termination call\./.test(x4.t) && /2026-11-04$/.test(x4.days) && !x4.recog, `a Crystal .xls dropped on the box: read, 4 Nov added (${x4.days.split(',').length} days)`);
  ok(await p.evaluate(() => /The Call history dropped has no calls in 1–3 Nov/.test(document.querySelector('#prs-brand').textContent)), 'a Call history of another day than the month to date: the brands\' slides say it has no calls for them');
  // the month's Call history and Tickets exports (made up, as Crystal's .xls, read by the report builder's reader) for the brands' slides
  const mx = await p.evaluate(async () => {
    const old = window.parseXls, ser = d => Date.UTC(2026, 10, d) / 86400000 + 25569, H = ['Ser.', 'Caller ID', 'Agent ID', 'Call Date', 'Type', 'Service', 'Sub Service', 'Notes', 'Language', 'Contact Type', 'App User'];
    const calls = [['User :', 'A.TEST', 'Call Center History Report'], H], tks = [['User :', 'A.TEST', 'Tickets Report'], ['Ser.', '', '', 'Date', 'Type', 'Category', 'Sub Category', 'Status', '', 'Ticket ID', 'Life Cycle', 'Group']];
    for (const d of [1, 2, 3]) { for (let i = 0; i < 5; i++) calls.push([i, '0500000000', 'AGENT.A', ser(d) + 0.4, 'Virgin Inquiry', 'Prepaid', 'Renew Now', '', 'Arabic', 'CALL', 'NA']); calls.push([9, '0500000000', 'AGENT.A', ser(d) + 0.5, 'Virgin Inquiry', 'Bundles/Plans', 'Data Bundles', '', 'Arabic', 'CALL', 'NA']); }
    [['SM is not working', 'Closed', '0 Day(s) 5:00:00 Hours'], ['SM is not working', 'Closed', '1 Day(s) 2:00:00 Hours'], ['Weak Coverage', 'Open', '']].forEach(([sub, st, life], i) => tks.push([null, null, null, `0${i + 1}/11/2026 09:30`, 'Virgin Complaint', 'Network', sub, st, null, 'T' + i, life, 'Member Care']));
    window.parseXls = buf => [{ name: 'Sheet1', rows: new Uint8Array(buf)[0] === 2 ? tks : calls }];
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array([1, 0, 0, 0])], 'Call history Nov.xls')); dt.items.add(new File([new Uint8Array([2, 0, 0, 0])], 'Tickets Nov.xls'));
    document.querySelector('#wfmBody [data-prdrop="month"]').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 900)); window.parseXls = old;
    const b = document.querySelector('#prs-brand');
    return { files: [...b.querySelectorAll('.rbfile')].map(x => x.textContent).join(' | '), warn: [...b.querySelectorAll('.warnline')].map(x => x.textContent).join(' | '), done: b.classList.contains('done'), weekly: window.__mc.wc().WC.files.map(f => f.name).join() };
  });
  ok(/Call history Nov\.xls.*Call history · 18 rows/.test(mx.files) && /Tickets Nov\.xls.*Tickets · 3 rows/.test(mx.files) && !mx.warn && mx.done && /Tickets Nov\.xls/.test(mx.weekly), `the month's Call history and Tickets dropped on the brands' step: listed (they count on Weekly commercial too), nothing missing: ${mx.files}`);
  const [dl4] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prdeck]')]);
  const d4 = path.join(out, 'with-month.pptx'); await dl4.saveAs(d4);
  const z4 = await Core.readZip(fs.readFileSync(d4)), v4 = [...((await z4.text('ppt/slides/slide2.xml')) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1]);
  ok(v4.includes('Renew Now') && v4.includes('SM is not working') && v4.includes('Top Call Reasons') && v4.includes('Top Complaint Drivers'), 'the Virgin slide: its Top Call Reasons (Renew Now) and Top Complaint Drivers (SM is not working) from the month\'s exports');
  await p.evaluate(() => { window.__mc.state.db = null; });
  // ---- 5. a drop, a paste, a picture
  const dt = await p.evaluateHandle(b64 => { const d = new DataTransfer(); d.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'Review 2.msg', { type: 'application/vnd.ms-outlook' })); return d; }, msgFile(sampleBody({ vnet: false })).toString('base64'));
  await p.dispatchEvent('#wfmBody [data-prdrop]', 'drop', { dataTransfer: dt }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => /Read from Review 2\.msg/.test(document.querySelector('#prs-mail').textContent) && document.querySelectorAll('#wfmBody .prtab tbody tr').length === 4 && /Not in the email: Vnet Complaints/.test(document.querySelector('#prs-mail .warnline').textContent) && !document.querySelector('#recogPanel:not([hidden])')), 'an email dropped on the box: read once; Vnet said to be missing');
  await p.click('#wfmBody [data-prpaste] summary');
  await p.fill('#wfmBody [data-prtext]', 'Rebooking TKTs:\nMonths\tVirgin\tFRiENDi\tTotal\nOct\t761\t677\t1438\nNov to 3\t85\t92\t177\nWeb + App TKTs :\nMonth\tWeb + App TKTs Total (S+C)\tAll Just complaints\t%\n1-Oct\t2136\t5974\t35.75%');
  await p.click('#wfmBody [data-prread]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#wfmBody .prtab tbody tr').length === 2 && /Not in the email: Network Issues TKTs, Social Media issue TKTs, Vnet Complaints/.test(document.querySelector('#prs-mail .warnline').textContent)), 'the pasted text: two tables, the three missing named');
  const pic = path.join(out, 'review.png'); fs.writeFileSync(pic, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  await p.setInputFiles('#wfmBody [data-prpick]', pic); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /review\.png is a picture.*save it from Outlook as \.msg/.test(document.querySelector('#prs-mail .warnline').textContent)), 'a picture: what to do instead');
  await p.screenshot({ path: path.join(out, 'perfrev.png'), fullPage: true });
  // ---- 5. another role; phone width
  const s = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  ok(await s.evaluate(() => !document.querySelector('#wfmTabs [data-wt="perf"]') && window.__mc.state.wfmTab !== 'perf'), 'the senior manager: no Performance Review tab');
  const ph = await open({ id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, 390);
  await ph.waitForSelector('#wfmBody .prflow', { timeout: 30000 });
  await ph.setInputFiles('#wfmBody [data-prpick]', msg); await ph.waitForSelector('#wfmBody .prtab', { timeout: 15000 });
  const wide = await ph.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ok(wide.sw <= wide.iw + 1, `phone width: nothing runs off the page (${wide.sw} ≤ ${wide.iw})`);
  ok(!errs.length, `no errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
