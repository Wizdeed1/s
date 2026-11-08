// WFM team › Weekly commercial in the browser, as a WFM analyst, made-up numbers and people only:
// 1. The tab (Every week), its four steps; the brands' history of the month (every brand 21 of 21 days), and what is missing.
// 2. FRiENDi Pay's tickets sheet read from the file picker, a file that is not an export refused, a file dropped on the drop zone
//    read once; the month's Call history and Tickets rows give the call reasons, complaints, resolved on time and still open.
// 3. Outages: one added and typed in (its text shown as text), three pasted from Excel (a heading row left out, 6-Aug in the
//    presentation's year, an older one kept but not shown), the same paste again adds nothing, Remove and Undo.
// 4. Settings: resolved on time within 24 hours changes the numbers; a To that is not an address is refused.
// 5. Download deck: the .pptx with the numbers; Email with the deck: an Outlook draft to the VP from the contacts, the deck attached.
//    The complaints email (a made-up answer to "Weekly commercial meeting", .msg): read, its numbers and top TKTs before the
//    Tickets export's; another email refused.
// 6. Another day: 1 November shows October's missing days. The settings and the outages come from the shared data and go back
//    to it. The senior manager has no Weekly commercial tab; at phone width nothing runs off the page; no errors.
// Usage: node test/weekly.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js');
const [page0, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const pad = n => String(n).padStart(2, '0'), oct = d => `2026-10-${pad(d)}`;
// the brands' history: Jan–Sep monthly, 1–23 October (the presentation is on 22 October: 1–21 go in)
const H = {};
for (const b of ['virgin', 'friendi', 'fpay', 'postpaid']) {
  const monthly = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(m => ({ date: `2026-${pad(m)}-01`, presented: 1000 + m * 10, handled: 900 + m * 10, sl: +(0.6 + m * 0.03).toFixed(2) }));
  const daily = Array.from({ length: 23 }, (_, i) => ({ date: oct(i + 1), presented: 1000 + i, handled: 990 + i, sl: i % 2 ? 0.95 : 0.8 }));
  H[b] = { voice: { monthly, daily } };
}
const quiet = () => { try { localStorage.setItem('mc-today-toast:u2', '2026-10-22'); localStorage.setItem('mc-today-toast:u3', '2026-10-22'); } catch (e) { /* none */ } };
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (user, vw = 1440) => {
    const ctx = await b.newContext({ viewport: { width: vw, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-10-22T10:00:00'));
    await p.addInitScript(([fx, h, u, q]) => { eval(fx); eval(q)(); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; try { localStorage.setItem('mc.history.v1', JSON.stringify(h)); } catch (e) { /* none */ } }, [fixture, H, user, `(${quiet})`]);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    return p;
  };
  const p = await open({ id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' });
  await p.evaluate(() => { const M = window.__mc; M.state.contacts = { vp: 'Huda S. <huda.s@example.com>', form: 'Omar T. <omar.t@example.com>' }; M.state.wfmTab = 'weekly'; M.setWs('wfm'); });
  await p.waitForSelector('#wfmBody .wcflow', { timeout: 30000 });
  // ---- 1. the tab and the history
  const g = await p.evaluate(() => {
    const grp = [...document.querySelectorAll('#wfmTabs .wfmgrp')].find(x => x.querySelector('[data-wt="weekly"]'));
    return { grp: grp && grp.querySelector('small').textContent, cur: !!document.querySelector('#wfmTabs [data-wt="weekly"][aria-current="page"]'), lab: (document.querySelector('#wfmTabs [data-wt="weekly"]') || {}).textContent, lead: document.getElementById('wfmLead').textContent,
      steps: [...document.querySelectorAll('#wfmBody .flowstep')].map(s => s.dataset.short), pills: [...document.querySelectorAll('.wchist .pill')].map(x => x.textContent.trim() + (x.classList.contains('good') ? ' ok' : '')), date: document.querySelector('[data-wcdate]').value };
  });
  ok(g.grp === 'Every week' && g.cur && /Weekly commercial/i.test(g.lab) && /Weekly Commercial Presentation/.test(g.lead), `the tab "${g.lab}" in "${g.grp}", with its lead`);
  ok(g.steps.join(',') === 'History,Exports,Outages,Deck', `four steps: ${g.steps.join(', ')}`);
  ok(g.date === '2026-10-22' && g.pills.length === 4 && g.pills.every(x => /21\/21 days ok$/.test(x)), `the presentation today; the history: ${g.pills.join(' | ')}`);
  const sum = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.wcsum tbody tr')].map(tr => [tr.cells[0].textContent.trim(), [...tr.cells].slice(1).map(c => c.textContent.trim())])));
  let S = await sum();
  ok(S['Virgin Mobile'][0] === '87%' && S['Virgin Mobile'][1] === '–' && S['FRiENDi Pay'][0] === '87%', `before any file: service level ${S['Virgin Mobile'][0]}, complaints ${S['Virgin Mobile'][1]}`);
  ok(await p.evaluate(() => /No call history export/.test(document.querySelector('.wcnotes').textContent)), 'the notes say which file is missing');
  // ---- 2. files
  const fpay = path.join(out, 'FRiENDi Pay tickets.csv'), junk = path.join(out, 'notes.csv');
  fs.writeFileSync(fpay, 'Date,Category,Count\n03/10/2026,Remittance::Technical error while processing the remittance,7\n04/10/2026,Limit Update,2\n28/09/2026,Old::Old,5\n');
  fs.writeFileSync(junk, 'a,b\n1,2\n');
  await p.setInputFiles('#wfmBody [data-wcpick]', [fpay, junk]);
  await p.waitForFunction(() => document.querySelectorAll('#wfmBody .rbfile').length === 2, null, { timeout: 15000 });
  const F = await p.evaluate(() => [...document.querySelectorAll('#wfmBody .rbfile')].map(x => ({ n: x.querySelector('.fname').textContent, t: x.querySelector('.ftag').textContent, bad: x.classList.contains('bad') })));
  ok(F[0].n === 'FRiENDi Pay tickets.csv' && /^FRiENDi Pay tickets · 14 tickets/.test(F[0].t) && !F[0].bad, `read: ${F[0].n} (${F[0].t})`);
  ok(F[1].bad && /not recognised/.test(F[1].t), `refused: ${F[1].n} (${F[1].t})`);
  S = await sum();
  ok(S['FRiENDi Pay'][1] === '9' && S['FRiENDi Pay'][3] === '–', `FRiENDi Pay: ${S['FRiENDi Pay'][1]} complaints this month (September's left out), still open –`);
  // a file dropped on the drop zone: read once
  const dt = await p.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['Date,Category,Count\n05/10/2026,Card::Already used,3\n'], 'FRiENDi Pay tickets 2.csv', { type: 'text/csv' })); return d; });
  await p.dispatchEvent('#wfmBody [data-wcdrop]', 'drop', { dataTransfer: dt });
  await p.waitForFunction(() => document.querySelectorAll('#wfmBody .rbfile').length === 3, null, { timeout: 15000 }); await p.waitForTimeout(400);
  const dropped = await p.evaluate(() => ({ files: window.__mc.wc().WC.files.filter(f => /tickets 2/.test(f.name)).length, fpay: window.__mc.wc().WC.fpay.name, recog: !!document.querySelector('#recogPanel:not([hidden]), .recog:not([hidden])') }));
  ok(dropped.files === 1 && dropped.fpay === 'FRiENDi Pay tickets 2.csv', `dropped on the drop zone: read once, and it takes over FRiENDi Pay's sheet (${JSON.stringify(dropped)})`);
  // the month's Call history and Tickets, as read from the Crystal exports
  await p.evaluate(() => {
    const M = window.__mc, W = M.wc().WC, d = n => `2026-10-${String(n).padStart(2, '0')}`, row = (date, type, service, sub, n) => Array.from({ length: n }, () => [null, null, null, date, type, service, sub, null, 'English', 'Inbound']);
    W.calls['Call history.xls'] = [...row(d(3), 'Virgin Inquiry', 'Prepaid', 'Renew Now', 30), ...row(d(4), 'Virgin Inquiry', 'Prepaid', 'Follow Up', 50), ...row(d(5), 'Virgin Inquiry', 'Postpaid', 'Billing Details', 12), ...row(d(6), 'FRiENDi Inquiry', 'Prepaid', 'Check Data Usage', 9), ...row(d(7), 'FRiENDi Pay', 'Inquiry', 'Follow Up', 25)];
    let id = 1; const tk = (n, type, cat, sub, st, life) => [null, null, null, `${String(n).padStart(2, '0')}/10/2026 09:30`, type, cat, sub, st, null, 'T' + id++, life || '', 'Member Care'];
    W.tickets['Tickets.xls'] = [tk(1, 'Virgin Complaint', 'Network', 'SM is not working', 'Closed', '0 Day(s) 5:00:00 Hours'), tk(2, 'Virgin Complaint', 'Network', 'SM is not working', 'Closed', '1 Day(s) 2:00:00 Hours'),
      tk(3, 'Virgin Complaint', 'Network', 'Weak Coverage', 'Closed', '3 Day(s) 2:00:00 Hours'), tk(4, 'Virgin Complaint', 'Network', 'Weak Coverage', 'Closed', '0 Day(s) 1:00:00 Hours'), tk(5, 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 'Open'),
      tk(6, 'FRiENDi Complaint', 'Network', 'No network', 'Pending')];
    M.renderWs();
  });
  S = await sum();
  ok(S['Virgin Mobile'].join('|') === '87%|5|75%|1|Renew Now|SM is not working' && S['FRiENDi Mobile'].join('|') === '87%|1|–|1|Check Data Usage|No network' && S['FRiENDi Pay'][4] === 'Follow Up' && S.Postpaid[1] === '1' && S.Postpaid[4] === 'Billing Details', `with the exports: Virgin ${S['Virgin Mobile'].join(' · ')}; Postpaid ${S.Postpaid.join(' · ')}`);
  // ---- 3. outages
  await p.click('#wfmBody [data-oadd]');
  const f1 = await p.evaluate(() => { const a = document.activeElement; return a && a.dataset.of === 'title' && a.closest('tr').querySelector('[data-of="date"]').value; });
  ok(f1 === '2026-10-21', `Add an outage: a row on the day before (${f1}), the cursor in its title`);
  await p.keyboard.type('Plan <b>issue</b> & more'); await p.keyboard.press('Tab');
  await p.check('#wfmBody tr[data-oid] [data-ob="friendi"]');
  await p.fill('#wfmBody tr[data-oid] [data-of="desc"]', 'Plans could not start'); await p.keyboard.press('Tab');
  let O = await p.evaluate(() => window.__mc.state.outages.map(x => ({ ...x })));
  ok(O.length === 1 && O[0].title === 'Plan <b>issue</b> & more' && O[0].brands.join() === 'friendi' && O[0].desc === 'Plans could not start', `typed in: ${JSON.stringify(O[0])}`);
  ok(await p.evaluate(() => !document.querySelector('.wcout b') && document.querySelector('.wcout [data-of="title"]').value === 'Plan <b>issue</b> & more'), 'its text shown as text');
  await p.click('#wfmBody .wcpaste summary');
  const tsv = 'Date\tOutage and Issue\tAffected Brand\tDescription\n6-Aug\tGenesys Outage\tVirgin,FRiENDi,Fpay\tGenesys stopped for the whole team\n15/09/2026\tOTP issue\tFpay\tNo OTP\n2026-07-01\tOld one\tVirgin\tOlder than three months\n';
  await p.fill('#wfmBody [data-opaste]', tsv); await p.click('#wfmBody [data-opastego]'); await p.waitForTimeout(200);
  O = await p.evaluate(() => window.__mc.state.outages.map(x => `${x.date} ${x.title} [${x.brands.join(',')}]`).sort());
  const rows = await p.evaluate(() => document.querySelectorAll('.wcout tbody tr[data-oid]').length), older = await p.evaluate(() => document.querySelector('.wcoacts .hint') && document.querySelector('.wcoacts .hint').textContent);
  ok(O.join(' | ') === '2026-07-01 Old one [virgin] | 2026-08-06 Genesys Outage [virgin,friendi,fpay] | 2026-09-15 OTP issue [fpay] | 2026-10-21 Plan <b>issue</b> & more [friendi]', `pasted: ${O.join(' | ')}`);
  ok(rows === 3 && /1 older outage kept/.test(older || ''), `the list shows the 3 in Aug–Oct; ${older}`);
  await p.fill('#wfmBody [data-opaste]', tsv); await p.click('#wfmBody [data-opastego]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__mc.state.outages.length === 4 && /already in the list/.test(document.getElementById('toastMsg').textContent)), 'the same paste again adds nothing');
  S = await sum();
  ok(/3 incidents in Aug–Oct 2026, 3 brands/.test(S.Outages[0]), `the deck: ${S.Outages[0]}`);
  await p.click('#wfmBody tr[data-oid]:has([value="OTP issue"]) [data-odel]'); await p.waitForTimeout(200);
  const afterDel = await p.evaluate(() => window.__mc.state.outages.length);
  await p.click('#toastAct'); await p.waitForTimeout(200);
  ok(afterDel === 3 && await p.evaluate(() => window.__mc.state.outages.length === 4), 'Remove, then Undo brings it back');
  // ---- 4. settings
  await p.click('#wfmBody .wcset summary');
  const pres = await p.inputValue('#wfmBody [data-wcset="presenter"]');
  ok(pres === 'Huda S.', `the presenter: the VP from the contacts (${pres})`);
  await p.fill('#wfmBody [data-wcset="onTimeH"]', '24'); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  S = await sum();
  ok(S['Virgin Mobile'][2] === '50%', `resolved on time within 24 hours: ${S['Virgin Mobile'][2]}`);
  ok(await p.isVisible('#wfmBody [data-wcset="to"]'), 'the settings stay open while they are changed');
  await p.fill('#wfmBody [data-wcset="to"]', 'not an address'); await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Type addresses/.test(document.getElementById('toastMsg').textContent) && !(window.__mc.state.wcCfg || {}).to), 'a To that is not an address is refused');
  await p.evaluate(() => window.__mc.renderWs());
  // ---- 5. the deck and the email
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-wcdeck]')]);
  const deckF = path.join(out, dl.suggestedFilename()); await dl.saveAs(deckF);
  const unx = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const z = await Core.readZip(fs.readFileSync(deckF)), T = async n => [...((await z.text(n)) || '').matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(r => unx(r[1]));
  const sl = z.names().filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, t2 = await T('ppt/slides/slide2.xml'), t6 = await T('ppt/slides/slide6.xml');
  ok(dl.suggestedFilename() === 'Beyond_One_Member_Care_Review - 22 Oct 2026.pptx' && sl === 7, `Download deck: ${dl.suggestedFilename()}, ${sl} slides`);
  ok(['87%', '5', '50%', '1', 'Renew Now', 'SM is not working'].every(x => t2.includes(x)) && t6.includes('Plan <b>issue</b> & more') && t6.includes('Incidents logged, 3 brands'), "the slides carry the page's numbers and the outages");
  const st4 = await p.evaluate(() => [...document.querySelectorAll('#wfmBody .flowstep')].map(s => s.classList.contains('done')));
  ok(st4.every(Boolean), `every step done once the deck is made (${st4})`);
  const [em] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wfmBar [data-wcmail]')]);
  const emlF = path.join(out, em.suggestedFilename()); await em.saveAs(emlF); const eml = fs.readFileSync(emlF, 'utf8');
  const part = eml.split(/\r\n--mc_[a-z0-9]+\r\n/).find(x => /presentationml\.presentation/.test(x)) || '', b64 = part.split('\r\n\r\n')[1] || '';
  const att = await Core.readZip(Buffer.from(b64.replace(/\s+/g, ''), 'base64')).catch(() => null);
  const txt = (eml.match(/Content-Type: text\/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n\r\n/) || [])[1] || '';
  ok(em.suggestedFilename() === 'Weekly Commercial Presentation - 22 Oct 2026.eml' && /\r\nTo: "Huda S\." <huda\.s@example\.com>/.test(eml) && /\r\nCc: "Omar T\." <omar\.t@example\.com>/.test(eml) && /\r\nSubject: Weekly Commercial Presentation\r\n/.test(eml), `Email with the deck: ${em.suggestedFilename()}, to the VP and the contact in copy`);
  ok(/name="Beyond_One_Member_Care_Review - 22 Oct 2026\.pptx"/.test(part) && att && att.has('ppt/presentation.xml'), 'the deck attached as a PowerPoint');
  ok(Buffer.from(txt.replace(/\s+/g, ''), 'base64').toString('utf8') === 'Hi Huda,\r\nKindly find the Weekly Commercial Presentation as attached.\r\nSincerely.', 'the body as sent before: Hi Huda, / Kindly find… / Sincerely.');
  await p.screenshot({ path: path.join(out, 'weekly.png'), fullPage: true });
  // ---- 5b. the complaints email (a made-up answer to "Weekly commercial meeting"): its numbers before the Tickets export's
  const { msgFile, complaintsBody } = require('./msgfile.cjs');
  const cmF = path.join(out, 'RE Weekly commercial meeting.msg'), hiF = path.join(out, 'Hello.msg');
  fs.writeFileSync(cmF, msgFile(complaintsBody())); fs.writeFileSync(hiF, msgFile('Hi all,\r\n\r\nSee you on Sunday.\r\n\r\nRana K.'));
  await p.setInputFiles('#wfmBody [data-wcpick]', [cmF, hiF]);
  await p.waitForFunction(() => [...document.querySelectorAll('#wfmBody .rbfile .fname')].some(x => /Hello\.msg/.test(x.textContent)), null, { timeout: 15000 });
  const cmFiles = await p.evaluate(() => [...document.querySelectorAll('#wfmBody .rbfile')].filter(x => /\.msg$/.test(x.querySelector('.fname').textContent)).map(x => ({ n: x.querySelector('.fname').textContent, t: x.querySelector('.ftag').textContent, bad: x.classList.contains('bad') })));
  ok(cmFiles.length === 2 && cmFiles[0].t === 'Complaints email · Oct 2026 · Virgin, FRiENDi, FRiENDi Pay' && !cmFiles[0].bad && cmFiles[1].bad && /not the complaints email/.test(cmFiles[1].t), `the complaints email read (${cmFiles[0] && cmFiles[0].t}); another email refused`);
  S = await sum();
  ok(S['Virgin Mobile'].join('|') === '87%|1,240|97%|210|Renew Now|Data not working' && S['FRiENDi Mobile'].slice(1).join('|') === '300|100%|40|Check Data Usage|SIM not working'
    && S['FRiENDi Pay'].slice(1).join('|') === '90|–|25|Follow Up|Remittance / Technical error while processing the remittance', `the email's numbers come first, with its top TKT: Virgin ${S['Virgin Mobile'].join(' | ')}`);
  // ---- 6. another day; the shared data; roles; phone width
  await p.fill('#wfmBar [data-wcdate]', '2026-11-01'); await p.dispatchEvent('#wfmBar [data-wcdate]', 'change'); await p.waitForTimeout(200);
  const nov = await p.evaluate(() => ({ pills: [...document.querySelectorAll('.wchist .pill')].map(x => x.textContent.trim() + (x.classList.contains('warn') ? ' warn' : '')), hint: (document.querySelector('#wcs-hist .hint') || {}).textContent || '' }));
  ok(nov.pills.every(x => /23\/31 days warn/.test(x)) && /24–31 Oct/.test(nov.hint), `on 1 November, October's missing days: ${nov.pills[0]}; ${nov.hint.slice(0, 60)}…`);
  const shared = await p.evaluate(async () => {
    const M = window.__mc, store = { 'config/weekly': { presenter: 'Rana K.', title: 'Group lead', onTimeH: 48 }, 'config/outages': { list: [{ id: 'abcd1234', date: '2026-10-10', title: 'Seeded outage', brands: ['virgin', 'nope'], desc: 'from another computer' }, { date: 'not a day', title: 'x' }] } };
    const doc = k => ({ get: async () => ({ exists: k in store, data: () => JSON.parse(JSON.stringify(store[k])) }), set: async v => { store[k] = JSON.parse(JSON.stringify(v)); }, delete: async () => { delete store[k]; } });
    const W = M.wc().WC; M.state.db = { doc, local: true, persistent: true }; W.loaded = null; W.boot = null; W.ready = false; M.state.outages = null; M.state.wcCfg = null; M.state.wcDate = '2026-10-22';
    M.renderWs(); await new Promise(r => setTimeout(r, 1500));
    const got = { titles: [...document.querySelectorAll('.wcout [data-of="title"]')].map(x => x.value), brands: M.state.outages.map(x => x.brands.join()), pres: M.state.wcCfg.presenter, h: M.state.wcCfg.onTimeH };
    document.querySelector('#wfmBody [data-oadd]').click(); await new Promise(r => setTimeout(r, 1200));
    got.saved = store['config/outages'].list.length; got.by = store['config/outages'].by;
    M.state.db = null; return got;
  });
  ok(shared.titles.join() === 'Seeded outage' && shared.brands.join() === 'virgin' && shared.pres === 'Rana K.' && shared.h === 48, `from the shared data: ${shared.titles.join()} (an unknown brand and a row with no day dropped), presenter ${shared.pres}, ${shared.h} hours`);
  ok(shared.saved === 2 && shared.by === 'Noura B.', `back to the shared data: ${shared.saved} outages, by ${shared.by}`);
  const s = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  const sen = await s.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'weekly'; M.setWs('wfm'); return { tab: !!document.querySelector('#wfmTabs [data-wt="weekly"]'), now: M.state.wfmTab, flow: !!document.querySelector('.wcflow') }; });
  ok(!sen.tab && sen.now !== 'weekly' && !sen.flow, `the senior manager: no Weekly commercial tab (opens ${sen.now})`);
  const ph = await open({ id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, 390);
  await ph.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'weekly'; M.setWs('wfm'); });
  await ph.waitForSelector('#wfmBody .wcflow', { timeout: 30000 });
  const wide = await ph.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  await ph.screenshot({ path: path.join(out, 'weekly-phone.png'), fullPage: true });
  ok(wide.sw <= wide.iw + 1, `phone width: nothing runs off the page (${wide.sw} ≤ ${wide.iw})`);
  ok(!errs.length, `no errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
