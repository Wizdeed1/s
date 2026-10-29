// WFM team › Weekly in the browser, synthetic data only (test/weekly_fixture.cjs): the WFM analyst opens the week of 18–24 Oct 2026,
// the calls come from the Brands' history, the ESKA export is chosen, the complaint figures pasted and read, Postpaid's tickets
// typed, an outage added; the checks; the deck, the filled KPI workbook and the email download, and each is read back. The WFM
// manager has the tab too; the senior manager does not.
// Usage: node test/weekly.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const F = require('./weekly_fixture.cjs'), { W, Core } = F;
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const PEOPLE = [{ id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }, { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }];
(async () => {
  fs.writeFileSync(path.join(out, 'Call Center History.xlsx'), await F.eska());
  fs.writeFileSync(path.join(out, 'BeyondOne_MC_KPIs-2026-10.xlsx'), await F.kpiBook());
  const H = F.history(), b = await chromium.launch(), errs = [];
  const open = async user => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${user.role}: ${e.message}`));
    await p.addInitScript(([fx, u]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user]);
    await p.goto('file://' + path.resolve(page0));
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
    await p.evaluate(([P, Hx]) => { const M = window.__mc, Fx = window.__FIX__; M.state.history = Fx.history; M.state.finals = Fx.finals; M.state.histVer++; M.state.finVer++; M.state.people = P; M.state.dhist = Hx; M.state.wk.key = '2026-10-18'; }, [PEOPLE, H]);
    return { p, ctx };
  };
  const tabs = p => p.evaluate(() => [...document.querySelectorAll('#wfmTabs [data-wt]')].map(x => x.dataset.wt).join(','));
  const download = async (p, act) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), act()]); const f = path.join(out, d.suggestedFilename()); await d.saveAs(f); return f; };

  // ---- the WFM analyst
  let { p, ctx } = await open(PEOPLE[0]);
  await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(200);
  ok((await tabs(p)).includes('weekly'), `analyst: Weekly is a tab (${await tabs(p)})`);
  await p.click('#wfmTabs [data-wt="weekly"]');
  await p.waitForSelector('#wfmBody .wkgrid', { timeout: 20000 });
  const bar = await p.textContent('#wfmBar');
  ok(/18–24 Oct 2026/.test(bar) && /dated 25 Oct 2026/.test(bar), `the week and the deck's date in the bar ("${bar.replace(/\s+/g, ' ').trim().slice(0, 90)}")`);
  const calls = await p.$$eval('#wfmBody .wktab tbody tr', rs => rs.slice(0, 4).map(r => [...r.cells].map(c => c.textContent.trim())));
  ok(calls.length === 4 && calls.every(r => r[1] === '7/7'), `calls: every brand has the week's 7 days from the history (${calls.map(r => r[1]).join(' ')})`);
  ok(calls[0][4] === W.pct(F.mtd('virgin').sl) && calls[0][2] === Math.round(F.mtd('virgin').presented).toLocaleString('en-US'), `calls: Virgin's month to date (${calls[0].slice(2, 5).join(' / ')})`);
  let chk = await p.textContent('#wfmBody .checklist'); ok(/No call reasons yet/.test(chk) && /no complaint figures/.test(chk), 'the checks ask for the export and the complaint figures');
  // the export: chosen like a dropped file
  await p.setInputFiles('#wkFile', path.join(out, 'Call Center History.xlsx'));
  await p.waitForSelector('#wfmBody .wkbrands', { timeout: 20000 });
  const top = await p.$$eval('#wfmBody .wkbrands .wkbr', L => L.map(x => ({ h: x.querySelector('h3').textContent, first: (x.querySelector('.wklist li span') || {}).textContent || '' })));
  ok(top.length === 4 && top[0].first === 'Plan Renewal' && top[2].first === 'Follow Up' && /FRiENDi Mobile/.test(top[1].h), `the top reasons per brand (${top.map(t => t.first).join(', ')})`);
  ok(await p.evaluate(() => !JSON.stringify(window.__mc.state.wk.doc).includes('05000000')), 'only counts are kept from the export (no customer\'s number)');
  // the complaint figures, pasted and read
  await p.fill('#wkPaste', F.COMPLAINTS); await p.click('[data-wkread]'); await p.waitForTimeout(200);
  const vals = await p.evaluate(() => ['virgin.complaints', 'virgin.onTime', 'virgin.open', 'friendi.d1.name', 'fpay.open', 'fpay.d0.pct'].map(k => document.querySelector(`[data-wkc="${k}"]`).value));
  ok(vals.join('|') === '812|97%|133|Package not added|12|61%', `the figures fill the form to check (${vals.join(' | ')})`);
  await p.fill('[data-wkc="virgin.open"]', '134'); await p.press('[data-wkc="virgin.open"]', 'Tab'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => window.__mc.state.wk.doc.complaints.virgin.open === 134), 'a figure corrected in the form is kept');
  // Postpaid's tickets
  for (const [i, t] of F.TICKETS.list.entries()) { await p.fill(`[data-wkt="${i}.name"]`, t.name); await p.press(`[data-wkt="${i}.name"]`, 'Tab'); await p.fill(`[data-wkt="${i}.count"]`, String(t.count)); await p.press(`[data-wkt="${i}.count"]`, 'Tab'); }
  await p.fill('[data-wkt="total"]', '90'); await p.press('[data-wkt="total"]', 'Tab'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const T = window.__mc.state.wk.doc.tickets; return T.total === 90 && T.list.length === 5 && T.list[0].name === 'Bill dispute' && T.list[0].count === 40; }), 'the five tickets and the total are kept');
  // an outage
  await p.fill('#wkODate', '2026-10-20'); await p.fill('#wkOIssue', 'Login issue'); await p.fill('#wkOBrand', 'Fpay'); await p.fill('#wkODesc', 'customers could not log in'); await p.click('[data-wkoadd]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#wfmBody tr.wknew').length === 1 && window.__mc.state.wk.out.length === 1), 'the outage is in the list, marked as this week\'s');
  chk = await p.textContent('#wfmBody .checklist'); const head = await p.textContent('.wkspan:last-child h2');
  ok(!/Fix/.test(chk) && /to look at/.test(head), `the checks: nothing left to fix ("${head.trim()}")`);
  await p.screenshot({ path: path.join(out, 'weekly.png'), fullPage: true });
  // the deck
  const deckF = await download(p, () => p.click('#wfmBody [data-wkdeck]'));
  ok(/Beyond_One_Member_Care_Review - 25 Oct 2026\.pptx$/.test(deckF), `the deck downloads (${path.basename(deckF)})`);
  const z = await Core.readZip(fs.readFileSync(deckF)), s2 = await z.text('ppt/slides/slide2.xml'), s4 = await z.text('ppt/slides/slide4.xml'), s5 = await z.text('ppt/slides/slide5.xml'), s6 = await z.text('ppt/slides/slide6.xml');
  ok(s2.includes('<a:t>812</a:t>') && s2.includes('<a:t>134</a:t>') && s2.includes('<a:t>Plan Renewal</a:t>') && s2.includes(`<a:t>${W.pct(F.mtd('virgin').sl)}</a:t>`), 'the deck: Virgin\'s slide has the figures as checked and its top reasons');
  ok(s4.includes('<a:t>Transfer failed</a:t>') && s4.includes('<a:t>Service level — Sep \'26</a:t>') && s5.includes('<a:t>Bill dispute</a:t>') && s6.includes('<a:t>Login issue</a:t>'), 'the deck: FRiENDi Pay, Postpaid and the outages');
  // the KPI workbook, filled
  const bookF = await download(p, () => p.setInputFiles('#wkBookFile', path.join(out, 'BeyondOne_MC_KPIs-2026-10.xlsx')));
  const rows = (await Core.readXlsx(fs.readFileSync(bookF))).find(s => s.name === 'Weekly Data').rows;
  ok(/BeyondOne_MC_KPIs-2026-10 - 25 Oct 2026\.xlsx$/.test(bookF) && rows[36][11] === 'Plan Renewal' && rows[83][16] === 812 && rows[85][16] === 134, `the workbook downloads filled (${path.basename(bookF)})`);
  await p.waitForSelector('#wfmBody .note.fixed'); ok(/Every value of the week is in it/.test(await p.textContent('#wfmBody .note.fixed')), 'the tab says the workbook is filled');
  // the email: Rasha, cc Essam, the deck attached
  const emlF = await download(p, () => p.click('[data-wkeml]')), eml = fs.readFileSync(emlF, 'utf8');
  ok(/rasha\.mogaddam@beyond\.one/i.test(eml) && /^Cc: .*Essam\.Alzhrani@beyond\.one/im.test(eml) && /Subject: Weekly Commercial Presentation/.test(eml) && /Beyond_One_Member_Care_Review - 25 Oct 2026\.pptx/.test(eml), 'the email: to Rasha, cc Essam, the subject and the deck attached');
  // text that looks like HTML stays text: in the page and in the deck
  const evil = '"><img src=x onerror="top.__x=1">';
  await p.fill('[data-wkc="virgin.d4.name"]', evil); await p.press('[data-wkc="virgin.d4.name"]', 'Tab');
  await p.fill('#wkOIssue', evil); await p.fill('#wkODesc', '<b>bold</b>'); await p.click('[data-wkoadd]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !window.__x && !document.querySelector('#wfmBody img') && !document.querySelector('#wfmBody td b') && [...document.querySelectorAll('#wfmBody td')].some(td => td.textContent.includes('<img src=x'))), 'a name that looks like HTML is shown as text, nothing runs');
  const evilF = await download(p, () => p.click('#wfmBody [data-wkdeck]')), ez = await Core.readZip(fs.readFileSync(evilF));
  const e2 = await ez.text('ppt/slides/slide2.xml'), e6 = await ez.text('ppt/slides/slide6.xml');
  ok(e2.includes('&lt;img src=x onerror="top.__x=1"&gt;') && !e2.includes('<img') && e6.includes('&lt;b&gt;bold&lt;/b&gt;') && !e6.includes('<b>'), 'and the deck has it escaped (the slides stay well-formed)');
  // another week and back: each week keeps its own figures
  await p.click('[data-wkweek="-7"]'); await p.waitForSelector('#wfmBody .wkgrid'); await p.waitForTimeout(150);
  ok(/11–17 Oct 2026/.test(await p.textContent('#wfmBar')) && await p.evaluate(() => document.querySelector('[data-wkc="virgin.complaints"]').value === ''), 'the week before starts empty');
  await ctx.close();

  // ---- the WFM manager has the tab; the senior manager does not
  ({ p, ctx } = await open(PEOPLE[1])); await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(200);
  ok((await tabs(p)).includes('weekly'), 'the WFM manager has Weekly'); await p.click('#wfmTabs [data-wt="weekly"]'); await p.waitForSelector('#wfmBody .wkgrid', { timeout: 20000 }); await ctx.close();
  ({ p, ctx } = await open(PEOPLE[2])); await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(200);
  ok(!(await tabs(p)).includes('weekly'), `the senior manager has no Weekly tab (${await tabs(p)})`); await ctx.close();

  await b.close();
  ok(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
