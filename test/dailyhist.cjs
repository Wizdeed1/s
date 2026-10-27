// WFM team › Emails › Daily brand emails, in the shared data folder (a folder the browser keeps for the page), as the admin:
// 1. A report day's four brand emails arriving after the page is open show by themselves (they used to stay grey until a click).
// 2. The Brands' history box: what the shared history holds; a made-up history file read and shown first (per brand: months and
//    days to add, the same, different here; what is left out), imported without touching the days the tool already has, then
//    again with "Use the file's numbers"; a third time there is nothing to import; Export history gives it all back.
// 3. Files that are not history files are refused, and odd keys in a file (__proto__, constructor) change nothing.
// 4. A Report Builder page (the stand-alone .html, made up here) is read for the history built into it, on the Report builder's
//    History card too (its old Import backup replaced the history unread), and dropped on Recognise files; a page with none is refused.
// Every number here is made up. Usage: node test/dailyhist.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0));
const BRANDS = ['postpaid', 'virgin', 'friendi', 'fpay'], NV = { virgin: 1, friendi: 1, fpay: 1 };
let seed = 5; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const voice = date => ({ date, presented: 1500 + Math.round(rnd() * 600), handled: 1400 + Math.round(rnd() * 500), sl: +(0.7 + rnd() * 0.25).toFixed(4), aht: +(140 + rnd() * 40).toFixed(3), asa: +(5 + rnd() * 30).toFixed(3) });
const nonvoice = date => ({ date, facebook: Math.round(rnd() * 80), twitter: Math.round(rnd() * 400), email: Math.round(rnd() * 60), asa: +(10 + rnd() * 200).toFixed(3) });
const day = n => `2026-10-${String(n).padStart(2, '0')}`;
// what the tool already has: 1–21 October, every brand
const have = {}; for (const b of BRANDS) { have[b] = { voice: { monthly: [], daily: [] } }; if (NV[b]) have[b].nonvoice = { monthly: [], daily: [] }; for (let n = 1; n <= 21; n++) { have[b].voice.daily.push(voice(day(n))); if (NV[b]) have[b].nonvoice.daily.push(nonvoice(day(n))); } }
// the file: Jan 2025 – Sep 2026 monthly, 30 September (new), 1–21 October (20 October different for Virgin Mobile), and odd parts
const file = JSON.parse(JSON.stringify(have)), months = []; for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) if (y < 2026 || m <= 9) months.push(`${y}-${String(m).padStart(2, '0')}-01`);
for (const b of BRANDS) { file[b].voice.monthly = months.map(voice); file[b].voice.daily.unshift(voice('2026-09-30')); if (NV[b]) { file[b].nonvoice.monthly = months.map(nonvoice); file[b].nonvoice.daily.unshift(nonvoice('2026-09-30')); } }
file.virgin.voice.daily.find(r => r.date === day(20)).presented += 7;
file.virgin.nonvoice.monthly[14] = { date: months[14], facebook: null, twitter: null, email: null, asa: null };   // a month with no data: kept, shown as –
file.virgin.voice.daily.push({ presented: 5 }, { date: day(22), note: 'text only' });   // no date; no number: left out
file.leaders = { voice: { daily: [voice(day(5))] } }; file.virgin.constructor_ = 1;
let text = JSON.stringify(file, null, 1).replace('"leaders":', '"__proto__": {"polluted": true}, "leaders":').replace('"constructor_": 1', '"constructor": {"monthly": [{"date": "2026-01-01", "presented": 1}]}');
const fileP = path.join(out, 'member-care-history-test.json'); fs.writeFileSync(fileP, text);
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await ctx.addInitScript(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]'); await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Tq7#mVx2!pLr';
  await p.fill('#acName', 'Sara Khalid'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  await p.evaluate(async H => { await window.__mc.state.db.doc('dailytool/history').set({ hist: H, at: new Date().toISOString(), by: 'Yousef T.' }); }, have);
  // the page: WFM team › Emails › Daily brand emails
  await p.evaluate(() => { window.__mc.state.wfmTab = 'emails'; window.__mc.state.mailSub = 'daily'; window.__mc.setWs('wfm'); window.__mc.renderWs(); });
  await p.waitForSelector('#wfmDm [data-dmhist] .dmhtx', { timeout: 20000 });
  // ---- 1. a report day arrives while the page is open: its emails show without a click
  await p.evaluate(async () => {
    const db = window.__mc.state.db, B = window.Build, d = '2026-10-21', P = B.makePeriod(d, d), at = new Date().toISOString();
    const bag = { calls: {}, sm: {}, queue: {}, dated: { calls: {}, sm: {}, queue: {} }, undated: [], datedFiles: [], history: null, tickets: null, historyFiles: {}, ticketFiles: {}, fpayTicketsFile: null, leaderRows: null };
    await db.doc(`dailymail/${d}`).set({ k: d, date: d, start: d, end: d, multi: false, at, by: 'Yousef T.', files: 3, brands: {} });
    await new Promise(r => setTimeout(r, 700));
    for (const key of ['postpaid', 'virgin', 'friendi', 'fpay']) {
      const cfg = B.REPORTS[key], rules = cfg.channels.length ? ['all', 'facebook', 'total', 'weighted'] : [cfg.asaRule], data = {}, hist = {};
      for (const rule of rules) { data[rule] = B.computeData(key, P, bag, { asaRule: rule, hist: {} }); hist[rule] = {}; }
      await db.doc(`dailymail/${d}/brands/${key}`).set({ key, period: P, data, hist, nvDays: {}, pre: [], at, by: 'Yousef T.' });
    }
  });
  const shown = await p.waitForFunction(() => { const pn = document.querySelector('#wfmDm [data-dmpanel]'); return pn && !pn.querySelector('.rbskel') && !!pn.querySelector('iframe.rbprev'); }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok(shown, 'the day\'s brand emails show by themselves when they arrive (no grey placeholder waiting for a click)');
  // ---- 2. the Brands' history box
  const summary = async () => p.evaluate(() => document.querySelector('#wfmDm [data-dmhist] .dmhtx small').textContent.replace(/\s+/g, ' ').trim());
  let s0 = await summary();
  ok(/days 1 Oct – 21 Oct 2026/.test(s0) && /Yousef T\./.test(s0), `the box says what the shared history holds: "${s0.slice(0, 120)}"`);
  await p.screenshot({ path: path.join(out, 'dailyhist-box.png') });
  await p.setInputFiles('#dmHistPicker', fileP);
  await p.waitForSelector('#wfmDm .dmhprev', { timeout: 15000 });
  const prev = await p.evaluate(() => ({ head: document.querySelector('#wfmDm .dmhprev > span').textContent, rows: [...document.querySelectorAll('#wfmDm .dmhprev .ilist li')].map(li => [...li.children].map(x => x.textContent.trim()).join(' ')), tick: !!document.querySelector('#wfmDm [data-dmhall]'), left: (document.querySelector('#wfmDm [data-dmhist] .hint') || {}).textContent || '', go: document.querySelector('#wfmDm [data-dmhgo]').textContent.trim() }));
  ok(prev.head === 'months Jan 2025 – Sep 2026 · days 30 Sep – 21 Oct 2026', `the file is shown first: ${prev.head}`);
  ok(prev.rows.length === 4 && prev.rows.some(r => /^Virgin Mobile 21 months to add · 1 day to add · 1 different here · 20 already the same$/.test(r)) && prev.rows.some(r => /^Virgin Postpaid 21 months to add · 1 day to add · 21 already the same$/.test(r)), `per brand: ${prev.rows.join(' | ')}`);
  const leftTxt = await p.evaluate(() => [...document.querySelectorAll('#wfmDm [data-dmhist] .hint')].map(x => x.textContent).join(' '));
  ok(prev.tick && /2 rows without a date or numbers/.test(leftTxt) && /__proto__/.test(leftTxt) && /leaders/.test(leftTxt) && /Virgin Mobile constructor/.test(leftTxt), `the day that differs can be taken from the file, and what is left out is said: ${leftTxt.replace(/\s+/g, ' ').slice(0, 160)}`);
  await p.screenshot({ path: path.join(out, 'dailyhist-preview.png') });
  // import, keeping the tool's numbers
  await p.click('#wfmDm [data-dmhgo]');
  await p.waitForFunction(() => /^History imported/.test(document.getElementById('toastMsg').textContent), null, { timeout: 20000 });
  const t1 = await p.textContent('#toastMsg');
  const after = async () => p.evaluate(async () => { const x = (await window.__mc.state.db.doc('dailytool/history').get()).data().hist; return { keys: Object.keys(x), vm: x.virgin.voice.monthly.length, nvm: x.virgin.nonvoice.monthly.length, d30: !!x.virgin.voice.daily.find(r => r.date === '2026-09-30'), d20: x.virgin.voice.daily.find(r => r.date === '2026-10-20').presented, empty: JSON.stringify(x.virgin.nonvoice.monthly.find(r => r.date === '2026-03-01') || null), pm: x.postpaid.voice.monthly.length, ctor: Object.keys(x.virgin), polluted: ({}).polluted === true || Object.prototype.hasOwnProperty('monthly') || typeof Object.monthly !== 'undefined' }; });
  const a1 = await after(), want20 = have.virgin.voice.daily.find(r => r.date === day(20)).presented;
  ok(/^History imported for 4 brands: 21 months and 1 day added\./.test(t1), `imported: ${t1}`);
  ok(a1.vm === 21 && a1.nvm === 21 && a1.pm === 21 && a1.d30 && a1.d20 === want20, `the shared history has the months and 30 September; 20 October keeps the tool's number (${a1.d20})`);
  ok(a1.empty === '{"date":"2026-03-01","facebook":null,"twitter":null,"email":null,"asa":null}', `a month with no data comes in as it is, so the table shows it as – (${a1.empty})`);
  ok(JSON.stringify(a1.keys.sort()) === JSON.stringify(BRANDS.slice().sort()) && JSON.stringify(a1.ctor.sort()) === '["nonvoice","voice"]' && !a1.polluted, `nothing but the four brands' voice and non-voice went in (${a1.keys.join(', ')}), and nothing was polluted`);
  const s1 = await summary();
  ok(/months Jan 2025 – Sep 2026 · days 30 Sep – 21 Oct 2026/.test(s1), `the box follows: "${s1.slice(0, 110)}"`);
  // again, with the file's numbers for the day that differs
  await p.setInputFiles('#dmHistPicker', fileP); await p.waitForSelector('#wfmDm [data-dmhall]', { timeout: 15000 });
  const go0 = await p.evaluate(() => document.querySelector('#wfmDm [data-dmhgo]').disabled);
  await p.check('#wfmDm [data-dmhall]'); await p.waitForTimeout(150);
  const go1 = await p.evaluate(() => !document.querySelector('#wfmDm [data-dmhgo]').disabled && document.activeElement && document.activeElement.matches('[data-dmhall]'));
  ok(go0 && go1, 'a second time only the different day is left: nothing to import until "Use the file\'s numbers" is ticked (the tick keeps the focus)');
  await p.evaluate(() => { document.getElementById('toastMsg').textContent = ''; }); await p.click('#wfmDm [data-dmhgo]');
  await p.waitForFunction(() => /^History imported/.test(document.getElementById('toastMsg').textContent), null, { timeout: 20000 });
  const t2 = await p.textContent('#toastMsg'), a2 = await after();
  ok(/1 replaced with the file's numbers/.test(t2) && a2.d20 === want20 + 7, `with the tick, 20 October takes the file's number (${a2.d20}): ${t2}`);
  // a third time: everything is in
  await p.setInputFiles('#dmHistPicker', fileP); await p.waitForSelector('#wfmDm .dmhprev', { timeout: 15000 });
  const none = await p.evaluate(() => ({ dis: document.querySelector('#wfmDm [data-dmhgo]').disabled, txt: document.querySelector('#wfmDm [data-dmhgo]').textContent.trim(), tick: !!document.querySelector('#wfmDm [data-dmhall]') }));
  ok(none.dis && /^nothing to import$/i.test(none.txt) && !none.tick, `a third time there is nothing to import ("${none.txt}", greyed out, no tick box)`);
  await p.click('#wfmDm [data-dmhcancel]');
  ok(await p.evaluate(() => !document.querySelector('#wfmDm .dmhprev') && document.activeElement && document.activeElement.matches('[data-dmhpick]')), 'Cancel closes it, back on Import history');
  // export
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#wfmDm [data-dmhexp]')]);
  const E = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(/^member-care-history-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()) && E.virgin.voice.monthly.length === 21 && E.fpay.nonvoice.daily.length === 22 && E.virgin.voice.daily.find(r => r.date === day(20)).presented === want20 + 7, `Export history: ${dl.suggestedFilename()} with all of it`);
  // ---- 3. files that are not history files
  const refuse = async (name, body) => { const f = path.join(out, name); fs.writeFileSync(f, body); await p.evaluate(() => { document.getElementById('toastMsg').textContent = ''; }); await p.setInputFiles('#dmHistPicker', f); await p.waitForFunction(() => /could not be used/.test(document.getElementById('toastMsg').textContent), null, { timeout: 10000 }).catch(() => {}); return (await p.textContent('#toastMsg')).trim(); };
  const r1 = await refuse('list.json', '[1, 2, 3]'), r2 = await refuse('notes.json', 'not json at all'), r3 = await refuse('other.json', '{"roster": [{"name": "A"}]}');
  ok(/it is not a history file/.test(r1) && /it is not a JSON file/.test(r2) && /no brand history in it/.test(r3) && !(await p.$('#wfmDm .dmhprev')), `not history files are refused: "${r1}" / "${r2}" / "${r3}"`);
  await p.screenshot({ path: path.join(out, 'dailyhist-done.png') });
  // ---- 4. a Report Builder page: the history built into it (made-up numbers, June 2024 and 1–3 August 2026)
  const seedH = {}; for (const b of BRANDS) { seedH[b] = { voice: { monthly: [voice('2024-06-01')], daily: [1, 2, 3].map(n => voice(`2026-08-0${n}`)) } }; if (NV[b]) seedH[b].nonvoice = { monthly: [nonvoice('2024-06-01')], daily: [1, 2, 3].map(n => nonvoice(`2026-08-0${n}`)) }; }
  const page14 = `<!doctype html><html><head><title>Member Care Report Builder</title></head><body><div id="app"></div>
<script>function seedOf() { return JSON.parse(JSON.stringify(window.HISTORY_SEED || {})); }</script>
<script>window.HISTORY_SEED=${JSON.stringify(seedH)};</script>
<script>window.TEMPLATES={}; console.log(seedOf());</script></body></html>`;
  const pageP = path.join(out, 'Member Care Report Builder 14.html'); fs.writeFileSync(pageP, page14);
  await p.setInputFiles('#dmHistPicker', pageP); await p.waitForSelector('#wfmDm .dmhprev', { timeout: 15000 });
  const pv = await p.evaluate(() => ({ head: document.querySelector('#wfmDm .dmhprev > span').textContent, rows: [...document.querySelectorAll('#wfmDm .dmhprev .ilist li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()) }));
  ok(pv.head === 'months Jun 2024 · days 1 Aug – 3 Aug 2026' && pv.rows.length === 4 && pv.rows.every(r => /1 month to add · 3 days to add$/.test(r)), `a Report Builder page is read for its built-in history: ${pv.head} | ${pv.rows[0]}`);
  await p.evaluate(() => { document.getElementById('toastMsg').textContent = ''; }); await p.click('#wfmDm [data-dmhgo]');
  await p.waitForFunction(() => /^History imported/.test(document.getElementById('toastMsg').textContent), null, { timeout: 20000 });
  const a4 = await p.evaluate(async () => { const x = (await window.__mc.state.db.doc('dailytool/history').get()).data().hist; return { jul: !!x.virgin.voice.monthly.find(r => r.date === '2024-06-01'), aug2: !!x.fpay.nonvoice.daily.find(r => r.date === '2026-08-02'), oct: x.virgin.voice.daily.filter(r => r.date.startsWith('2026-10')).length }; });
  ok(a4.jul && a4.aug2 && a4.oct === 21, 'its months and days are added; the days the tool had stay');
  const r4 = await refuse('page.html', '<!doctype html><html><body><p>Hello</p><script>var HISTORY = 1;</script></body></html>');
  ok(/a web page with no brands' history in it/.test(r4), `a web page with no history is refused: "${r4}"`);
  // the Report builder's History card has the same box (its old Import backup replaced the shared history without reading it)
  await p.evaluate(() => { window.__mc.state.wfmTab = 'builder'; window.__mc.setWs('wfm'); window.__mc.renderWs(); });
  await p.waitForSelector('#wfmRb [data-dmhist] [data-dmhpick]', { timeout: 20000 });
  ok(!(await p.$('#wfmRb [data-rbhimp]')), 'the Report builder has no unread Import backup any more: its History card has the Brands\' history box');
  await p.click('#wfmRb [data-dmhist] [data-dmhpick]').catch(() => {});
  await p.setInputFiles('#dmHistPicker', pageP); await p.waitForSelector('#wfmRb .dmhprev', { timeout: 15000 });
  const rbTxt = await p.$eval('#wfmRb [data-dmhist]', el => el.textContent.replace(/\s+/g, ' '));
  ok(/Everything in this file is already in the tool/.test(rbTxt), 'on the Report builder the same page is read and shown first: everything is already in');
  await p.click('#wfmRb [data-dmhcancel]');
  await p.screenshot({ path: path.join(out, 'dailyhist-builder.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
