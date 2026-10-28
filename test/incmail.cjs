// The incentive email is the senior manager's, in the browser with synthetic people (test/fixture.js) and the synthetic exports:
// 1. The WFM analyst builds the month and the incentive file (WFM team › Export › Build incentive file): it is kept with the shared
//    data. WFM team › Emails has the deduction and absences email only (no Deduction/Incentive switch); an incentive file dropped
//    there says the senior manager sends it.
// 2. The senior manager's Supervisors page has two tabs, Month close and Incentive email, and an Incentive data tile with the
//    month's other emails. The Incentive email finds the file the analyst saved by itself, makes the review email (with the
//    review deadline) and the final (compared with the review), and attaches the file; a month with no file says so.
// 3. A newer build of the file replaces the older one on the senior manager's page (Look for a newer file).
// Usage: node test/incmail.cjs page.html outDir exportsDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'out/mc.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const exp = path.resolve(process.argv[4] || '');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true });
  const open = async user => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${user.role}: ${e.message}`)); p.on('console', m => { if (m.type() === 'error') errs.push(`${user.role} console: ${m.text()}`); });
    // the once-a-day "things late" toast is marked as shown, so the toasts this test reads are not replaced by it
    await p.addInitScript(([fx, u, d]) => { eval(fx); try { localStorage.setItem('mc-today-toast:' + u.id, d); } catch (e) { /* none */ } window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user, today()]);
    await p.goto('file://' + page0);
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);
    return p;
  };

  // 1. the WFM analyst builds September and its incentive file
  const a = await open({ id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' });
  await a.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); });
  await a.setInputFiles('#picker', fs.readdirSync(exp).map(f => path.join(exp, f)));
  await a.waitForFunction(() => !window.__mc.state.pending.length && window.__mc.state.ctx && window.__mc.state.kpi && window.__mc.state.kpi.size > 0, null, { timeout: 40000 });
  await a.evaluate(() => window.__mc.setStep('export')); await a.waitForSelector('#buildInc:not([disabled])');
  const [dl] = await Promise.all([a.waitForEvent('download', { timeout: 30000 }), a.click('#buildInc')]);
  const incFile = path.join(out, dl.suggestedFilename()); await dl.saveAs(incFile);
  await a.waitForFunction(() => window.__mc.state.incBuilt && window.__mc.state.incBuilt.locked === 'ok', null, { timeout: 10000 });
  ok(/MC_all_team_incentive _data -2026-09\.xlsx$/.test(incFile), `the analyst built ${path.basename(incFile)}, kept with the shared data`);
  ok(/senior manager has it on Supervisors › Incentive email/.test(await a.textContent('#incNote')), 'Export says the senior manager has it');
  // WFM team › Emails: the deduction and absences email only
  await a.evaluate(() => window.__mc.setStep('email')); await a.waitForTimeout(400);
  const wm = await a.evaluate(() => ({ kind: window.__mc.state.mailKind, sw: !!document.getElementById('mKind'), sub: (document.querySelector('[data-mailsub][aria-pressed="true"]') || {}).textContent, h: document.getElementById('h-email').textContent, inws: !!document.getElementById('v-email').closest('#wfmMail') }));
  ok(wm.kind === 'ded' && !wm.sw && /^deduction and absences$/i.test(wm.sub) && /^Deduction email/.test(wm.h) && wm.inws, `WFM team › Emails: ${wm.sub}, ${wm.h}, no Deduction/Incentive switch`);
  await a.setInputFiles('#wbPicker', incFile); await a.waitForTimeout(900);
  const t1 = await a.textContent('#toastMsg');
  ok(/senior manager sends it to the champions, on Supervisors › Incentive email/.test(t1) && await a.evaluate(() => window.__mc.state.mailKind === 'ded' && !window.__mc.state.incWb), `an incentive file dropped there points to the senior manager ("${t1.slice(0, 70)}…")`);
  await a.screenshot({ path: path.join(out, 'incmail-wfm.png') });

  // 2. the senior manager's Supervisors page: Month close and Incentive email
  const s = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  await s.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09'; M.setWs('cycle'); });
  await s.waitForSelector('#cycleBar [data-cyctab="mail"]');
  const tile = await s.$eval('#cycleBody .mailgrid4', el => el.textContent.replace(/\s+/g, ' '));
  ok(/Incentive data\s*To the champions/.test(tile) && /For review: not prepared yet · Final: not prepared yet/.test(tile), 'the month\'s emails: an Incentive data tile first');
  await s.click('#cycleBody [data-cyctab="mail"]');
  await s.waitForSelector('#cycMail:not([hidden]) #v-email:not([hidden])');
  await s.waitForFunction(() => /Saved by the WFM team/.test(document.getElementById('srcState').textContent), null, { timeout: 15000 });
  const src = await s.$eval('#srcState', el => el.textContent.replace(/\s+/g, ' '));
  ok(/MC_all_team_incentive _data -2026-09\.xlsx/.test(src) && /Built by Yousef T\./.test(src), `the Data card: the file the analyst saved (${src.slice(0, 90)}…)`);
  const head = await s.evaluate(() => ({ h: document.getElementById('h-email').textContent, sub: document.querySelector('#mailHead').textContent.replace(/\s+/g, ' '), body: document.getElementById('cycleBody').hidden, tab: (document.querySelector('#cycleBar [data-cyctab][aria-pressed="true"]') || {}).dataset.cyctab }));
  ok(head.h === 'Incentive email – for review' && head.body && head.tab === 'mail', `the Incentive email tab: ${head.h}`);
  ok(/Sep 2026 incentive Data for review/.test(head.sub) && /MC_all_team_incentive _data -2026-09\.xlsx/.test(head.sub) && /\d+ people in the attachment/.test(head.sub), `subject, attachment and rows (${head.sub.slice(0, 160)}…)`);
  const prev = await s.evaluate(() => document.getElementById('mailFrame').contentDocument.body.textContent.replace(/\s+/g, ' '));
  ok(/Incentive Data · September 2026/.test(prev) && /the deadline is 10 Oct-2026/.test(prev), 'the preview: September 2026, review deadline 10 Oct');
  await s.screenshot({ path: path.join(out, 'incmail-senior-review.png') });
  // the attachment and the review draft
  const [att] = await Promise.all([s.waitForEvent('download', { timeout: 30000 }), s.click('#attBtn')]);
  ok(att.suggestedFilename() === 'MC_all_team_incentive _data -2026-09.xlsx', `Save attachment: ${att.suggestedFilename()}`);
  const [eml] = await Promise.all([s.waitForEvent('download', { timeout: 30000 }), s.click('#emlBtn')]);
  const emlPath = path.join(out, 'incentive-review.eml'); await eml.saveAs(emlPath);
  const emlText = fs.readFileSync(emlPath, 'utf8');
  ok(/^Subject: Sep 2026 incentive Data for review/m.test(emlText) && /filename="MC_all_team_incentive _data -2026-09\.xlsx"/.test(emlText) && /MemberCareChampion\.ksa@beyond\.one/.test(emlText), 'Download .eml: the review draft to the champions, with the file attached');
  // the final: compared with the review saved a moment ago
  await s.click('#mStage [data-f="final"]'); await s.waitForTimeout(300);
  const fin = await s.evaluate(() => ({ h: document.getElementById('h-email').textContent, rev: document.getElementById('revState').textContent.replace(/\s+/g, ' '), rows: document.querySelector('#mailHead').textContent.replace(/\s+/g, ' ') }));
  ok(fin.h === 'Incentive email – final' && /Saved .* by Faisal M\. when the review email was copied or downloaded/.test(fin.rev) && /0 people changed since the review/.test(fin.rows), `the final, compared with the review: ${fin.rev.slice(0, 80)}…`);
  ok(await s.evaluate(() => /No changes were made after the review/.test(document.getElementById('mailFrame').contentDocument.body.textContent)), 'the final email: no changes after the review');
  await s.screenshot({ path: path.join(out, 'incmail-senior-final.png') });

  // 3. a newer build replaces the older file on the senior manager's page
  const id0 = await s.evaluate(() => window.__mc.state.incWb.saved.id);
  await a.evaluate(() => window.__mc.setStep('export')); await a.waitForSelector('#buildInc:not([disabled])');
  await Promise.all([a.waitForEvent('download', { timeout: 30000 }), a.click('#buildInc')]);
  await a.waitForFunction(() => window.__mc.state.incBuilt && window.__mc.state.incBuilt.locked === 'ok', null, { timeout: 10000 });
  await a.waitForTimeout(500);
  await s.click('#cycMail [data-increcheck]');
  await s.waitForFunction(id => window.__mc.state.incWb && window.__mc.state.incWb.saved && window.__mc.state.incWb.saved.id !== id, id0, { timeout: 15000 });
  ok(true, 'Look for a newer file: the newer build is in use');

  // a month the analysts have not built: no file yet, and the tabs come back to the month close
  await s.evaluate(() => { const sel = document.querySelector('#cycleBar [data-wsmonth]'); sel.value = '2026-08'; sel.dispatchEvent(new Event('change', { bubbles: true })); }); await s.waitForTimeout(300);   // the header's month picker drives this hidden one
  await s.waitForFunction(() => /No incentive file yet/.test(document.getElementById('srcState').textContent), null, { timeout: 15000 });
  const none = await s.evaluate(() => ({ src: document.getElementById('srcState').textContent.replace(/\s+/g, ' '), warns: document.getElementById('mailWarns').textContent }));
  ok(/make it for Aug 2026 on WFM team › Export/.test(none.src) && /have not built the incentive file for August 2026/.test(none.warns), 'August: no incentive file yet, and where the analysts make it');
  await s.click('#cycleBar [data-cyctab="close"]'); await s.waitForTimeout(300);
  ok(await s.evaluate(() => !document.getElementById('cycleBody').hidden && document.getElementById('cycMail').hidden && !!document.querySelector('#cycleBody .mailgrid4')), 'Month close: the page as before');

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
