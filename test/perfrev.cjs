// WFM team › Performance Review in the browser, as the WFM manager, with a made-up "MC performance Review" email and made-up
// history only:
// 1. The tab (Every week, after Weekly commercial); the deck and the email wait for the email.
// 2. The .msg chosen: its tables listed (months, the month to date, the last row), an extra table marked as its own slide.
// 3. Download deck: the .pptx with the brands' slides, the two Complaints Insights slides and the extra one; Email with the deck:
//    an Outlook draft to the VP from the contacts (the final result form's contact in copy), the deck attached.
// 4. An email dropped on the drop zone is read once; a pasted text with two tables says which are not in it; a picture is refused
//    with what to do instead.
// 5. The senior manager has no tab; at phone width nothing runs off the page; no errors.
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
  ok(await p.evaluate(() => [...document.querySelectorAll('#wfmBody .prslides li')].map(l => l.textContent).join('|') === 'Cover|Virgin Mobile|FRiENDi Mobile|Postpaid|Complaints Insights: Web + App, Network, Social media|Complaints Insights: Rebooking, Vnet, the month so far|More Insights: OTP Calls|Thank you'), 'the slides listed');
  // ---- 3. the deck and the email
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prdeck]')]);
  const deckF = path.join(out, dl.suggestedFilename()); await dl.saveAs(deckF);
  const z = await Core.readZip(fs.readFileSync(deckF)), X = async n => [...((await z.text(n)) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => r[1].replace(/&amp;/g, '&'));
  const n = z.names().filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length, s5 = await X('ppt/slides/slide5.xml'), s6 = await X('ppt/slides/slide6.xml'), s1 = await X('ppt/slides/slide1.xml');
  ok(dl.suggestedFilename() === 'MC_Performance_Review - 4 Nov 2026.pptx' && n === 8, `Download deck: ${dl.suggestedFilename()}, ${n} slides`);
  ok(s1.includes('Member Care Performance Review') && s1.includes('Huda S.') && s5.includes('Web + App TKTs – Until 03 Nov') && s6.includes('This Month So Far') && s6.includes('Rebooking · FRiENDi'), 'the cover with the VP as presenter; Complaints Insights from the email');
  const [em] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-prmail]')]);
  const emlF = path.join(out, em.suggestedFilename()); await em.saveAs(emlF); const eml = fs.readFileSync(emlF, 'utf8');
  const part = eml.split(/\r\n--mc_[a-z0-9]+\r\n/).find(x => /presentationml\.presentation/.test(x)) || '', att = await Core.readZip(Buffer.from((part.split('\r\n\r\n')[1] || '').replace(/\s+/g, ''), 'base64')).catch(() => null);
  const txt = (eml.match(/Content-Type: text\/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n\r\n/) || [])[1] || '';
  ok(em.suggestedFilename() === 'MC Performance Review - 4 Nov 2026.eml' && /\r\nTo: "Huda S\." <huda\.s@example\.com>/.test(eml) && /\r\nCc: "Omar T\." <omar\.t@example\.com>/.test(eml) && /\r\nSubject: MC Performance Review\r\n/.test(eml), 'Email with the deck: to the VP, the contact in copy, "MC Performance Review"');
  ok(/name="MC_Performance_Review - 4 Nov 2026\.pptx"/.test(part) && att && att.has('ppt/presentation.xml') && Buffer.from(txt.replace(/\s+/g, ''), 'base64').toString('utf8') === 'Hi Huda,\r\nKindly find the MC Performance Review as attached.\r\nSincerely.', 'the deck attached; "Hi Huda, Kindly find the MC Performance Review as attached. Sincerely."');
  ok(await p.evaluate(() => [...document.querySelectorAll('#wfmBody .flowstep')].map(s => s.classList.contains('done')).join()) === 'true,true,true', 'every step done');
  // ---- 4. a drop, a paste, a picture
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
