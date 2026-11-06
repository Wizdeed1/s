// WFM team › Emails › Deduction and absences: the corrections that come back after the review, in the browser, as the WFM manager,
// with made-up people and a made-up October 2026 month only:
// 1. The box shows on Deduction and absences (not on the daily brand emails), for the month of the email.
// 2. A champion's table pasted from the email (its HTML: Name, Team, Dep, 27-Oct… "SL leaves", the full name against the shorter
//    one in the roster) is read at once; each day shows now → new; Apply makes them the month's corrections (marked as an update,
//    by whom), the month's row and the deduction email follow; the list of corrections made from here shows them; Undo takes them back.
// 3. Typed lines: two people with the same first name (choose one), late minutes for a name with "Al", a range with a day not
//    ticked, clear, a name nobody has, a line with no day; untick a day; Apply; Remove from the list, and Undo.
// 4. Files: a saved email (.eml) chosen and one dropped on the box (read once), a picture refused with what to do instead.
//    Exceptions, as the supervisors list them (a day, the name with the approver and the reason, what it was): each day shows the
//    exception and its minutes; Apply keeps them on the days (a late day excused); the month's deduction comes down by their minutes,
//    the email's total and its workbook's Monthly Deduction (Actual, Diff, total, Review Notes) follow; Undo takes them back.
// 5. A final month cannot change; text from the email is shown as text; the senior manager has no box; no errors.
// Usage: node test/attupd.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const quiet = () => { try { localStorage.setItem('mc-today-toast:u2', '2026-11-03'); localStorage.setItem('mc-today-toast:u3', '2026-11-03'); } catch (e) { /* none */ } };
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async user => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-03T10:00:00'));
    await p.addInitScript(([fx, u, q]) => { eval(fx); eval(q)(); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user, `(${quiet})`]);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    // October 2026: four people renamed (made-up names), every day attended but the 2nd, 9th, 16th, 23rd and 30th (OFF);
    // Rayan absent on 27, 28, 29 and 31 October
    await p.evaluate(() => {
      const M = window.__mc, S = M.state, R = S.roster.filter(x => x.team === 'CC' && x.brand === 'Virgin').slice(0, 2).concat(S.roster.filter(x => x.team === 'CC' && x.brand === 'Friendi').slice(0, 1), S.roster.filter(x => x.team === 'SM' && x.brand === 'Virgin').slice(0, 1));
      const names = ['Rayan Alexample', 'Omar Al Demo', 'Nawal Testname', 'Nawal Sampleson'];
      R.forEach((p, i) => { p.name = names[i]; p.sys = ''; });
      const d = absent => Array.from({ length: 31 }, (_, i) => ([2, 9, 16, 23, 30].includes(i + 1) ? 'O' : absent.includes(i + 1) ? 'X' : 'A')).join('');
      const rows = R.map((p, i) => ({ id: String(p.nid), n: p.name, brand: p.brand, team: p.team, d: d(i === 0 ? [27, 28, 29, 31] : []), absent: i === 0 ? 4 : 0, worked: i === 0 ? 22 : 26, ded: i === 0 ? 4 : 0 }));
      S.history['2026-10'] = { y: 2026, m: 10, rows, tool: true, at: new Date().toISOString() }; S.histVer++; S.wsMonth = '2026-10';
      window.__T = { pids: R.map(p => p._id) };
    });
    return p;
  };
  const p = await open({ id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' });
  const T = await p.evaluate(() => window.__T.pids);
  const go = sub => p.evaluate(s => { const M = window.__mc; M.state.wfmTab = 'emails'; M.state.mailSub = s; M.setWs('wfm'); M.renderWs(); }, sub);
  await go('month'); await p.waitForSelector('#wfmUpd:not([hidden]) .updcard', { timeout: 20000 });
  // ---- 1. where it shows
  ok(await p.evaluate(() => document.querySelector('#wfmUpd .updhd h2').textContent === 'Corrections after the review' && document.querySelector('#wfmUpd .updhd .pill').textContent === 'Oct 2026'), 'the box on Deduction and absences, for Oct 2026');
  await go('daily'); const dailyHidden = await p.evaluate(() => document.getElementById('wfmUpd').hidden);
  await go('month'); await p.waitForSelector('#wfmUpd:not([hidden]) .updcard');
  ok(dailyHidden, 'not on the daily brand emails');
  // ---- 2. the champion's table, pasted from the email (HTML)
  const row = (pid, k = '2026-10') => p.evaluate(([pid, k]) => { const r = window.__mc.rowsByPid(k).get(pid); return r ? { d: r.d, absent: r.absent, sl: r.sl } : null; }, [pid, k]);
  const edits = pid => p.evaluate(pid => { const E = window.__mc.state.attEditsBy['2026-10']; const e = E && E.get(pid); return e ? e.days : null; }, pid);
  const paste = (html, text) => p.evaluate(([h, t]) => { const ta = document.querySelector('#wfmUpd [data-updtext]'); ta.focus(); const dt = new DataTransfer(); if (h) dt.setData('text/html', h); dt.setData('text/plain', t || ''); ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [html, text]);
  const html = '<p>Hi,</p><table><tr><td><b>Name</b></td><td><b>Team</b></td><td><b>Dep</b></td><td><b>27-Oct</b></td><td><b>28-Oct</b></td><td><b>29-Oct</b></td><td><b>31-Oct</b></td></tr><tr><td>Rayan Fahad Majed Alexample</td><td>Virgin</td><td>CC</td><td>SL leaves</td><td>SL leaves</td><td>SL leaves</td><td>SL leaves</td></tr></table>';
  await paste(html, 'Name Team Dep 27-Oct');
  await p.waitForSelector('#wfmUpd .updgrp', { timeout: 10000 });
  const pv = () => p.evaluate(() => ({ who: [...document.querySelectorAll('#wfmUpd .updwho')].map(x => [...x.children].map(c => c.textContent.trim()).join(' ').replace(/\s+/g, ' ')), rows: [...document.querySelectorAll('#wfmUpd .updtab tbody tr')].map(tr => [...tr.cells].slice(1).map(c => c.textContent.trim()).filter(Boolean).join(' ') + (tr.querySelector('input').checked ? ' ✓' : '')), apply: (document.querySelector('#wfmUpd [data-updapply]') || {}).textContent, text: document.querySelector('#wfmUpd [data-updtext]').value }));
  let V = await pv();
  ok(/^Rayan Alexample Virgin · CC from “Rayan Fahad Majed Alexample”$/.test(V.who[0]) && V.rows.join(' | ') === '27 Oct Absent → SL leave ✓ | 28 Oct Absent → SL leave ✓ | 29 Oct Absent → SL leave ✓ | 31 Oct Absent → SL leave ✓', `read at once: ${V.who[0]}; ${V.rows.join(' | ')}`);
  ok(/^Apply 4 changes$/i.test(V.apply) && /Rayan Fahad Majed Alexample\tVirgin\tCC\tSL leaves/.test(V.text), `"${V.apply}"; the table kept in the box with its cells apart`);
  const before = await row(T[0]);
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(300);
  let E = await edits(T[0]), R0 = await row(T[0]);
  ok(E && ['27', '28', '29', '31'].every(d => E[d] && E[d].v === 'SL' && E[d].src === 'update' && E[d].by === 'Noura B.') && /Rayan Fahad Majed Alexample/.test(E[27].note), 'Apply: the four days are the month\'s corrections, marked as an update, by Noura B.');
  ok(before.absent === 4 && R0.absent === 0 && R0.sl === 4 && R0.d.slice(26, 29) === 'SSS' && R0.d[30] === 'S', `the month follows: absent ${before.absent} → ${R0.absent}, SL ${R0.sl}`);
  const mail = await p.evaluate(() => window.__mc.curMail().text);
  ok(/Absenteeism/.test(mail) ? !/Rayan Alexample/.test(mail.split('Absenteeism')[1] || '') : true, 'the deduction email no longer lists Rayan as absent');
  const done = await p.evaluate(() => [...document.querySelectorAll('#wfmUpd .upddone li')].map(li => [...li.children].map(c => c.textContent.trim()).join(' ').replace(/\s+/g, ' ')));
  ok(done.length === 1 && /^Rayan Alexample 27, 28, 29, 31 Oct: SL leave · Noura B\./.test(done[0]), `the list of corrections made from here: ${done[0]}`);
  ok(await p.evaluate(() => /^Applied: 4 days for 1 person/.test(document.getElementById('toastMsg').textContent) && !document.getElementById('toastAct').hidden), 'the toast says what was applied, with Undo');
  await p.click('#toastAct'); await p.waitForTimeout(300);
  E = await edits(T[0]); R0 = await row(T[0]);
  ok(!E && R0.absent === 4 && R0.d.slice(26, 29) === 'XXX', 'Undo: the days are as they were');
  // ---- 3. typed lines
  const lines = 'nawal absent on 10 Oct\nomar al demo late 20 min on 5 Oct\nRayan SL 27-30 Oct and 31 Oct\nset xyz qwerty as absent on 4 oct\nrayan absent\nThanks';
  await p.fill('#wfmUpd [data-updtext]', lines); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(200);
  V = await pv();
  const sel = await p.evaluate(() => [...document.querySelectorAll('#wfmUpd [data-updwho] option')].map(o => o.textContent));
  ok(sel.length === 3 && /Choose who “nawal” is/.test(sel[0]) && sel.slice(1).every(o => /^Nawal (Testname|Sampleson) · /.test(o)), `two people called Nawal: choose (${sel.slice(1).join(' / ')})`);
  ok(V.rows[0] === '10 Oct not in the month → Absent' || /^10 Oct/.test(V.rows[0]), `before choosing, Nawal's day cannot be ticked (${V.rows[0]})`);
  ok(V.who.some(w => /^Omar Al Demo/.test(w)) && V.rows.some(r => r === '5 Oct Attend → Late 20 min ✓'), '"omar al demo late 20 min": Omar, late 20 minutes (Al is part of the name)');
  ok(V.rows.filter(r => /^(27|28|29|30|31) Oct/.test(r)).join(' | ') === '27 Oct Absent → SL leave ✓ | 28 Oct Absent → SL leave ✓ | 29 Oct Absent → SL leave ✓ | 30 Oct OFF → SL leave OFF that day: tick it to change | 31 Oct Absent → SL leave ✓', 'a range: the OFF day in it is not ticked');
  ok(V.who.some(w => /xyz qwerty.*nobody called "xyz qwerty"/.test(w)), 'a name nobody has is said so');
  ok(await p.evaluate(() => /1 line not read/.test(document.querySelector('#wfmUpd .updbad summary').textContent) && /no day/.test(document.querySelector('#wfmUpd .updbad li').textContent)), 'a line with no day: not read, with why; the greeting and "Thanks" left out');
  await p.selectOption('#wfmUpd [data-updwho]', T[2]); await p.waitForTimeout(150);
  V = await pv();
  ok(V.who[0].startsWith('Nawal Testname') && V.rows[0] === '10 Oct Attend → Absent ✓', `chosen: ${V.who[0].split(' from')[0]}, ${V.rows[0]}`);
  await p.uncheck('#wfmUpd tr:has(td:text-is("31 Oct")) [data-updon]'); await p.waitForTimeout(150);
  V = await pv();
  ok(/^Apply 5 changes for 3 people$/i.test(V.apply), `unticked 31 Oct: "${V.apply}"`);
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(300);
  const e0 = await edits(T[0]), e1 = await edits(T[1]), e2 = await edits(T[2]);
  ok(e0 && Object.keys(e0).join() === '27,28,29' && e1 && e1[5].v === 20 && e2 && e2[10].v === 'Absent' && e2[10].note === 'nawal absent on 10 Oct', 'Apply: Rayan 27–29 SL (31 left), Omar late 20 min on the 5th, Nawal T. absent on the 10th (the line kept as the note)');
  ok((await row(T[2])).absent === 1 && (await row(T[0])).absent === 1, 'the month follows (Nawal 1 absent, Rayan only the 31st left)');
  // Remove from the list, then Undo
  await p.click(`#wfmUpd [data-updrm="${T[0]}"]`); await p.waitForTimeout(250);
  const gone = await edits(T[0]);
  await p.click('#toastAct'); await p.waitForTimeout(250);
  ok(!gone && Object.keys((await edits(T[0])) || {}).join() === '27,28,29', 'Remove takes the corrections made from here away; Undo brings them back');
  // ---- 4. files
  const eml = path.join(out, 'Leave update.eml'), pic = path.join(out, 'update.png');
  fs.writeFileSync(eml, ['From: someone@example.com', 'Subject: Leave update', 'MIME-Version: 1.0', 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', '',
    Buffer.from('<p>Kindly update:</p><table><tr><td>Name</td><td>Team</td><td>Dep</td><td>12-Oct</td></tr><tr><td>Omar Al Demo</td><td>Virgin</td><td>CC</td><td>Exam leave</td></tr></table>').toString('base64'), ''].join('\r\n'));
  fs.writeFileSync(pic, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  await p.setInputFiles('#wfmUpd [data-updpick]', [eml]); await p.waitForSelector('#wfmUpd .updgrp', { timeout: 10000 });
  V = await pv();
  ok(/^Read from Leave update\.eml/.test(await p.textContent('#wfmUpd .updprev .hint')) && V.rows.join() === '12 Oct Attend → Exam leave ✓', `a saved email chosen: ${V.rows.join()}`);
  await p.click('#wfmUpd [data-updclear]');
  const dt = await p.evaluateHandle(b64 => { const d = new DataTransfer(); d.items.add(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'Leave update 2.eml', { type: 'message/rfc822' })); return d; }, fs.readFileSync(eml).toString('base64'));
  await p.dispatchEvent('#wfmUpd [data-upddrop]', 'drop', { dataTransfer: dt }); await p.waitForSelector('#wfmUpd .updgrp', { timeout: 10000 }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /^Read from Leave update 2\.eml/.test(document.querySelector('#wfmUpd .updprev .hint').textContent) && !document.querySelector('#recogPanel:not([hidden])')), 'a saved email dropped on the box: read once');
  await p.setInputFiles('#wfmUpd [data-updpick]', [pic]); await p.waitForTimeout(400);
  ok(await p.evaluate(() => /update\.png is a picture.*copy it \(Ctrl\+C\) and paste it/.test(document.querySelector('#wfmUpd .warnline').textContent)), 'a picture: what to do instead (copy the table and paste it, or drop the email)');
  // exceptions: Omar's deduction by day (Sched. 480; Actual 470 on the 11th, 479 on the 19th, 420 on the 22nd, 450 on the 29th, 300 on the 24th)
  await p.click('#wfmUpd [data-updclear]');
  await p.evaluate(() => {
    const S = window.__mc.state, r = S.history['2026-10'].rows[1], A = { 11: 470, 19: 479, 22: 420, 29: 450, 24: 300 };
    const sch = Array.from({ length: 31 }, (_, i) => ([2, 9, 16, 23, 30].includes(i + 1) ? null : 480)), act = sch.map((v, i) => (v == null ? null : A[i + 1] || 480));
    Object.assign(r, { ds: sch.map(v => (v == null ? '' : v)).join(','), da: act.map(v => (v == null ? '' : v)).join(','), ded: 10 + 1 + 60 + 30 + 180 }); S.histVer++; window.__mc.renderWs();
  });
  const xin = ['Oct-5\tOmar Al Demo Supervisorx-excuse\tExcuse', '11-oct\tOmar Al Demo Supervisorx-pc loading for 2 min\tPc loading', 'Oct-19\tOmar Al Demo Supervisorx-pc loading 1min only\tPc loading', 'Thu 22-Oct Omar Al Demo 4:00 PM - 4:30 PM Supervisorx 30mins', 'Oct-29\tOmar Al Demo Supervisorx-excuse\tExcuse', '24-Oct\tOmar Al Demo\tSL'].join('\n');
  await p.fill('#wfmUpd [data-updtext]', xin); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(250);
  V = await pv();
  ok(V.who.length === 1 && /^Omar Al Demo/.test(V.who[0]) && V.rows.join(' | ') === '5 Oct Late 20 min → Exception: Excuse · the day excused · late excused (Attend) ✓ | 11 Oct Attend → Exception: PC loading · 2 min excused ✓ | 19 Oct Attend → Exception: PC loading · 1 min excused ✓ | 22 Oct Attend → Exception: 4:00 PM - 4:30 PM · 30 min excused ✓ | 24 Oct Attend → SL leave ✓ | 29 Oct Attend → Exception: Excuse · the day excused ✓', `the exceptions and a leave read (Thu 22-Oct written out), each day with its minutes: ${V.rows.join(' | ')}`);
  const dedBefore = await p.evaluate(() => { const r = window.__mc.rowsByPid('2026-10').get(window.__T.pids[1]); return r.ded; });
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(300);
  const xe = await edits(T[1]), xr = await p.evaluate(pid => { const r = window.__mc.rowsByPid('2026-10').get(pid); return { ded: r.ded, da: r.da.split(','), d: r.d, dxn: r.dxn }; }, T[1]);
  ok(xe[5].x === 1 && xe[5].exc === 'day' && xe[5].v === undefined && xe[11].exc === 2 && xe[11].why === 'PC loading' && xe[22].exc === 30 && xe[29].exc === 'day' && xe[11].src === 'update', 'Apply: the exceptions kept on the days (the 5th\'s late 20 min replaced by its excuse)');
  ok(dedBefore === 281 && xr.ded === 38 && xr.da[10] === '472' && xr.da[18] === '480' && xr.da[21] === '450' && xr.da[28] === '480' && xr.da[23] === '480' && xr.d[4] === 'A' && xr.d[23] === 'S', `the month's deduction ${dedBefore} → ${xr.ded} min (11th 8, 19th 0, 22nd 30, 29th 0; the 24th SL, so none); the 5th attended, the 24th SL`);
  ok(/^Exceptions: 5 Oct Excuse \(the day\); 11 Oct PC loading \(2 min\); 19 Oct PC loading \(1 min\); 22 Oct 4:00 PM - 4:30 PM \(30 min\); 29 Oct Excuse \(the day\)$/.test(xr.dxn), `their note: ${xr.dxn}`);
  const mt = await p.evaluate(() => (window.__mc.curMail().md.dedFull.find(x => /Omar/.test(x.name)) || {}).total);
  ok(mt === 38, `the deduction email's total for Omar: ${mt}`);
  const wb = await p.evaluate(async () => { const b = await Writer2.dedMail(window.__mc.dedData()); let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); });
  const Core = require('../js/core.js'), wbs = await Core.readXlsx(Buffer.from(wb, 'base64')), md = wbs.find(x => x.name === 'Monthly Deduction'), om = md.rows.find(r => r && r[0] === 'Omar Al Demo');
  const cell = (d, k) => om[3 + (d - 1) * 3 + k], ar = wbs.find(x => x.name === 'Attendance Report').rows.find(r => r && r[0] === 'Omar Al Demo');
  ok(om && cell(11, 1) === 472 && cell(11, 2) === 8 && cell(22, 2) === 30 && cell(29, 2) === 0 && cell(24, 2) === 0 && om[3 + 31 * 3] === 38 && /^Exceptions: 5 Oct Excuse/.test(om[3 + 31 * 3 + 1]) && !/24 Oct/.test(om[3 + 31 * 3 + 1]), `the email's workbook: Monthly Deduction with the Actual and Diff excused (the SL day none), total ${om && om[3 + 31 * 3]}, the Review Notes`);
  ok(ar && /SL/.test(String(ar[3 + 23])) && /Attend/.test(String(ar[3 + 4])), `its Attendance Report: the 24th SL (${ar && ar[3 + 23]}), the 5th Attend`);
  const xd = await p.evaluate(() => [...document.querySelectorAll('#wfmUpd .upddone li')].map(li => li.textContent.replace(/\s+/g, ' ')).find(t => /Omar/.test(t)) || '');
  ok(/5, 29 Oct: exception \(Excuse\)/.test(xd) && /11, 19 Oct: exception \(PC loading, 2 min\)|11 Oct: exception \(PC loading, 2 min\)/.test(xd), `the list of corrections made from here names them: ${xd.slice(0, 160)}`);
  await p.click('#toastAct'); await p.waitForTimeout(300);
  ok((await p.evaluate(pid => window.__mc.rowsByPid('2026-10').get(pid).ded, T[1])) === 281 && (await edits(T[1]))[5].v === 20, 'Undo: the deduction as it was (281), the 5th late 20 min again');
  // ---- 5. a final month; text shown as text; another role
  await p.fill('#wfmUpd [data-updtext]', 'Name\t27-Oct\n<img src=x onerror="window.__x=1">Rayan Alexample\tAbsent'); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('#wfmUpd img') && !window.__x && /img src=x/.test(document.querySelector('#wfmUpd .updwho').textContent)), 'text from the email is shown as text');
  await p.evaluate(() => { const S = window.__mc.state; S.finals['2026-10'] = { status: 'final', rows: S.history['2026-10'].rows }; S.finVer++; window.__mc.renderWs(); });
  await p.fill('#wfmUpd [data-updtext]', 'rayan absent on 3 Oct'); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /Oct 2026 is final/.test(document.querySelector('#wfmUpd .warnline').textContent) && document.querySelector('#wfmUpd [data-updapply]').disabled && !document.querySelector('#wfmUpd [data-updrm]')), 'a final month: said so, nothing to apply or remove');
  await p.evaluate(() => { const S = window.__mc.state; delete S.finals['2026-10']; S.finVer++; window.__mc.renderWs(); });
  await p.screenshot({ path: path.join(out, 'attupd.png'), fullPage: true });
  const s = await open({ id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  ok(await s.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'emails'; M.state.mailSub = 'month'; M.setWs('wfm'); M.renderWs(); return document.getElementById('wfmUpd').hidden; }), 'the senior manager: no box');
  ok(!errs.length, `no errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
