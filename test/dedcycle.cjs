// WFM team › Emails › Deduction and absences over the period, the 13th of the month before to the 12th of the month, in the browser,
// as the WFM manager, with made-up people: a made-up October 2026 in the shared history, and November's first days dropped in the box.
// November's email, its tables and its workbook (MC Monthly Deduction - Nov 2026.xlsx) run 13 Oct – 12 Nov:
// 1. Before anything is dropped: the workbook's 31 days run 13 Oct – 12 Nov; its Attendance Report has only Virgin (every team, not
//    FRiENDi), its Monthly Deduction only Virgin · CC; October's days from the month, November's empty; a row named "Absent" (a
//    sheet's legend once read as a person) is in neither, nor in the email, and the page says it was left out. The email's own tables
//    run over the same days (Omar's 35 min), the review deadline is the 15th (three days after the period).
// 2. The box "The period": a made-up November sheet (a leave, late minutes, an absence, someone not in the roster, and a legend under
//    the names with another table's heading) and the November Schedule and Agent Status Timeline: 1–12 Nov fill in (15 min late on
//    the 3rd is a Diff of 15), the legend is not read, the warnings go, the email's absences show 4-Nov, kept with the shared data.
//    Tardy in the Attendance Report, as the WFM team counts it: the attendance sheets' Tardy column only, CC too (never Total (min),
//    never the day cells' minutes): Omar 0, then 15 (November's sheet); the SM person: October's 30 less the 12 its own deduction
//    counted of 1–12 Oct (October's box): 18, said in Review Notes; then 58 with November's sheet's Tardy column (40; the 25 minutes on
//    one of her day cells do not count).
// 3. A correction for a November day (Corrections after the review): Now shows the dropped day; the workbook shows it.
// 4. October final: a correction for 20 Oct counts for the deduction only (dedfix/2026-10), October's own rows stay; Undo.
// 5. Clear what was dropped, and Undo; Settings › Deduction period 14 to 13: 14 Oct – 13 Nov; no errors.
// Usage: node test/dedcycle.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require('../js/core.js');
const [page0, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light', acceptDownloads: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-14T10:00:00'));
  await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' };
    try { localStorage.setItem('mc-today-toast:u2', '2026-11-14'); } catch (e) { /* none */ } }, fixture);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  // a shared store in memory (its listeners are called later, as a real store does), and October 2026: two Virgin CC people, one
  // FRiENDi CC, one Virgin SM; every day attended but the 2nd, 9th, 16th, 23rd and 30th (OFF); each worked day 480 minutes scheduled
  const T = await p.evaluate(() => {
    const M = window.__mc, S = M.state, mem = {}, subs = [];
    const snap = path => ({ docs: Object.keys(mem).filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/')).map(k => ({ id: k.slice(path.length + 1), data: () => mem[k] })) });
    const tell = id => subs.forEach(s => { if (id.startsWith(s.path + '/')) setTimeout(() => s.cb(snap(s.path)), 0); });
    S.db = { doc: id => ({ set: async v => { mem[id] = JSON.parse(JSON.stringify(v)); tell(id); }, update: async v => { mem[id] = { ...(mem[id] || {}), ...v }; tell(id); }, delete: async () => { delete mem[id]; tell(id); }, get: async () => ({ exists: !!mem[id], data: () => mem[id] }) }),
      collection: path => ({ onSnapshot: cb => { subs.push({ path, cb }); setTimeout(() => cb(snap(path)), 0); return () => {}; }, get: async () => snap(path) }) };
    window.__mem = mem;
    // October's own deduction counted 12 of the SM person's late minutes (its first days' sheet, in October's box)
    mem['dednext/2026-10'] = { k: '2026-10', dm: '2026-10', att: {}, tard: { [S.roster.filter(x => x.team === 'SM' && x.brand === 'Virgin')[0]._id]: 12 }, sch: {}, act: {}, files: [], unmatched: [] };
    const R = S.roster.filter(x => x.team === 'CC' && x.brand === 'Virgin').slice(0, 2).concat(S.roster.filter(x => x.team === 'CC' && x.brand === 'Friendi').slice(0, 1), S.roster.filter(x => x.team === 'SM' && x.brand === 'Virgin').slice(0, 1));
    const names = ['Omar Al Demo', 'Rayan Alexample', 'Nawal Testname', 'Nawal Sampleson'];
    R.forEach((q, i) => { q.name = names[i]; q.sys = ''; });
    const off = d => [2, 9, 16, 23, 30].includes(d), A = { 20: 470, 27: 455 };
    const d = () => Array.from({ length: 31 }, (_, i) => (off(i + 1) ? 'O' : 'A')).join('');
    const sch = Array.from({ length: 31 }, (_, i) => (off(i + 1) ? '' : 480)), act = i0 => sch.map((v, i) => (v === '' ? '' : i0 === 0 ? A[i + 1] || 480 : 480));
    const rows = R.map((q, i) => ({ id: String(q.nid), n: q.name, brand: q.brand, team: q.team, d: d(), worked: 26, ...(q.team === 'CC' ? { ds: sch.join(','), da: act(i).join(','), ded: i === 0 ? 10 + 25 : 0 } : { tardy: 30 }) }));   // the SM person: October's late minutes as one total (the sheet's Tardy column)
    rows.push({ id: '', n: 'Absent', brand: 'Virgin', team: 'CC', d: d(), worked: 26, ds: sch.join(','), da: act(1).join(','), ded: 0 });   // a sheet's legend line once read as a person
    S.history['2026-10'] = { y: 2026, m: 10, rows, tool: true, at: new Date().toISOString() }; S.histVer++; S.wsMonth = '2026-10';   // the other pages close October; the deduction email opens on November (its period ended on the 13th)
    S.wfmTab = 'emails'; S.mailSub = 'month'; M.setWs('wfm'); M.renderWs();
    return { pids: R.map(q => q._id), nids: R.map(q => String(q.nid)), names };
  });
  await p.waitForSelector('#dnCard:not([hidden]) .dnlist', { timeout: 15000 }); await p.waitForTimeout(300);
  const card = () => p.evaluate(() => { const c = document.getElementById('dnCard'); return { h: c.querySelector('h2').textContent, li: [...c.querySelectorAll('.dnlist li')].map(li => `${li.className}: ${li.textContent.replace(/\s+/g, ' ').trim()}`), drop: !!c.querySelector('[data-ddrop]'), text: c.textContent.replace(/\s+/g, ' ') }; });
  const warns = () => p.evaluate(() => [...document.querySelectorAll('#mailWarns li')].map(li => li.textContent));
  const book = async () => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#attBtn')]);
    const f = path.join(out, 'dedcycle-' + dl.suggestedFilename()); await dl.saveAs(f);
    const X = await Core.readXlsx(fs.readFileSync(f)), A = X.find(t => t.name === 'Attendance Report').rows, D = X.find(t => t.name === 'Monthly Deduction').rows;
    const dates = A[1].filter(v => v instanceof Date).map(v => v.toISOString().slice(0, 10)), col = iso => 3 + dates.indexOf(iso);
    const ar = n => A.find(r => r && r[0] === n), dr = n => D.find(r => r && r[0] === n), dd = (n, iso, k) => { const r = dr(n), i = dates.indexOf(iso); return r && i >= 0 ? r[3 + i * 3 + k] : undefined; };
    const H = A[1], cnt = (n, h) => { const r = ar(n); return r ? r[H.indexOf(h)] : undefined; }, TOT = D[3].indexOf('Total (min)');
    return { name: dl.suggestedFilename(), title: A[0][0], dTitle: D[0][0], dates, people: A.slice(2).filter(r => r && r[0]).map(r => `${r[0]}|${r[1]}|${r[2]}`), dPeople: D.slice(5).filter(r => r && r[0]).map(r => r[0]),
      day: (n, iso) => { const r = ar(n); return r ? r[col(iso)] : undefined; }, cnt, dd, tot: n => (dr(n) || [])[TOT], note: n => (dr(n) || [])[TOT + 1], dDates: D[3].filter(v => v instanceof Date).length };
  };
  const mail = () => p.evaluate(() => { const c = window.__mc.curMail(); return { period: c.md.period, ded: c.md.ded.map(x => `${x.name}:${x.total}`), abs: c.md.abs ? c.md.abs.rows.map(a => `${a.name}:${a.days.join('+')}`) : [], dates: c.md.abs ? c.md.abs.dates : [], deadline: c.md.deadline, text: c.text }; });
  // ---- 1. before anything is dropped
  let C = await card(), W = await warns(), X = await book(), E = await mail();
  ok(X.name === 'MC Monthly Deduction - Nov 2026.xlsx' && X.title === 'MC Monthly Attendance - Nov - 2026 (13 Oct – 12 Nov)' && X.dates.length === 31 && X.dates[0] === '2026-10-13' && X.dates[18] === '2026-10-31' && X.dates[19] === '2026-11-01' && X.dates[30] === '2026-11-12' && X.dDates === 31,
    `November's workbook (${X.name}): "${X.title}", ${X.dates.length} days from ${X.dates[0]} to ${X.dates[30]}, the Monthly Deduction the same ${X.dDates}`);
  ok(X.people.length === 3 && X.people.every(s => s.split('|')[1] === 'Virgin') && !X.people.some(s => s.startsWith('Nawal Testname')) && X.people.some(s => /^Nawal Sampleson\|Virgin\|SM$/.test(s)) && !X.people.some(s => s.startsWith('Absent')),
    `its Attendance Report: only Virgin, every team (${X.people.join(', ')}); the FRiENDi person and the "Absent" line left out`);
  ok(X.dPeople.slice().sort().join() === 'Omar Al Demo,Rayan Alexample', `its Monthly Deduction: Virgin · CC only (${X.dPeople.join(', ')})`);
  ok(X.cnt('Omar Al Demo', 'Tardy') === 0 && X.tot('Omar Al Demo') === 35 && X.cnt('Rayan Alexample', 'Tardy') === 0 && X.cnt('Nawal Sampleson', 'Tardy') === 18 && /Oct's Tardy column 30 min, less 12 min of its first days counted in Oct's deduction: 18 min/.test(X.cnt('Nawal Sampleson', 'Review Notes') || ''),
    `Tardy from the sheets' Tardy column only: Omar ${X.cnt('Omar Al Demo', 'Tardy')} (not his Total (min), ${X.tot('Omar Al Demo')}), Rayan ${X.cnt('Rayan Alexample', 'Tardy')}; the SM person October's column less what October's deduction counted (${X.cnt('Nawal Sampleson', 'Tardy')}: "${X.cnt('Nawal Sampleson', 'Review Notes')}")`);
  ok(X.day('Omar Al Demo', '2026-10-13') === 'Attend' && X.day('Omar Al Demo', '2026-10-16') === 'OFF' && X.day('Omar Al Demo', '2026-11-01') == null && X.dd('Omar Al Demo', '2026-10-20', 2) === 10 && X.dd('Omar Al Demo', '2026-10-27', 2) === 25 && X.tot('Omar Al Demo') === 35 && X.dd('Omar Al Demo', '2026-11-03', 0) == null,
    `October's days from the month (13 Oct Attend, 16 Oct OFF, 20 Oct Diff 10, 27 Oct Diff 25, total ${X.tot('Omar Al Demo')}); November's empty`);
  ok(E.period === '13 Oct – 12 Nov' && E.ded.join() === 'Omar Al Demo:35' && /Period: 13 Oct – 12 Nov 2026\./.test(E.text) && !/\bAbsent\b.*\t/.test(E.text.split('Absenteeism')[0]) && !E.ded.some(x => x.startsWith('Absent')) && E.deadline === 'Nov 15th',
    `the email's own tables over the period: ${E.ded.join(', ')} (zeros left out); "Period: 13 Oct – 12 Nov 2026."; review deadline ${E.deadline}`);
  ok(/^The period: 13 Oct – 12 Nov$/.test(C.h) && C.li.length === 3 && /^ok: 13–31 Oct From October in the tool/.test(C.li[0]) && /^warn: 1–12 Nov · attendance Not in yet/.test(C.li[1]) && /^warn: 1–12 Nov · deduction minutes Not in yet/.test(C.li[2]) && C.drop,
    `the box: ${C.li.join(' | ')}`);
  ok(W.some(w => /^The period runs 13 Oct – 12 Nov: no attendance for 1–12 Nov yet/.test(w)) && W.some(w => /^No deduction minutes for 1–12 Nov yet/.test(w)) && W.some(w => /^Left out, not people: "Absent"/.test(w)),
    `warnings on the page: ${W.filter(w => /Nov|Left out/.test(w)).map(w => w.slice(0, 60)).join(' | ')}`);
  const chip = await p.evaluate(() => ({ lbl: document.getElementById('periodLbl').textContent, ws: window.__mc.state.wsMonth, opts: [...document.querySelectorAll('#wfmBar [data-dedmonth] option')].map(o => o.textContent) }));
  ok(chip.lbl === 'Nov 2026' && chip.ws === '2026-10' && chip.opts.join(' | ') === 'Nov 2026 · 13 Oct – 12 Nov | Oct 2026 · 13 Sep – 12 Oct',
    `the email's own month: the top bar says ${chip.lbl} on this page (the other pages keep ${chip.ws}); its picker: ${chip.opts.join(' | ')}`);
  await p.evaluate(() => document.getElementById('dnCard').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(out, 'dedcycle-before.png') });
  // ---- 2. November's files dropped in the box
  const nov = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`), wk = d => ![6, 7].includes(d);   // 6 and 7 Nov: Friday and Saturday
  const code = (who, d) => (!wk(d) ? 'OFF' : who === 0 && d === 1 ? 'AL' : who === 0 && d === 3 ? '15' : who === 1 && d === 2 ? 'SL' : who === 3 && d === 4 ? 'Absent' : who === 3 && d === 10 ? '25' : 'Attend');   // the SM person's 25 minutes on the 10th: a day cell, not the Tardy column
  const attRows = [['Name', 'National ID', 'Team', 'Dep', ...nov, 'Tardy'], ...[0, 1, 2, 3].map(i => [T.names[i], T.nids[i], i === 2 ? 'Friendi' : 'Virgin', i === 3 ? 'SM' : 'CC', ...nov.map((_, j) => code(i, j + 1)), i === 0 ? 15 : i === 3 ? 40 : 0]), ['Zed Notinroster', '1999999999', 'Virgin', 'CC', ...nov.map((_, j) => code(9, j + 1)), 0],
    [], ['Absent', '', '', '', '', '', 'Attend', 'Rami D.', 'Friendi', 'CT'], ['After', '', '', '', '', '', 'ID', 'Name', 'Team', 'Dep'], ['AL', '', '', '', '', '', 'Attend', 'Hadi E.', 'Friendi', 'CT'], ['compassion leave'], ['OFF'], ['Unpaid']];   // a legend under the names, another table's heading
  const attF = path.join(out, 'Attendance - Nov 2026 (made-up).csv'); fs.writeFileSync(attF, csv(attRows));
  const dt = (d, h, m) => `11/${d}/2026 ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`, hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const sch = [['Agent Name', 'Activity Code Name', 'Start', 'End', 'Length In Minutes']], tl = [['Agent Name', 'Start Time', 'End Time', 'Primary Status', 'Duration', 'Interval Start']];
  for (const n of [T.names[0], T.names[1]]) for (let d = 1; d <= 13; d++) {
    if (!wk(d)) continue;
    for (const [c, h0, m0, len] of [['On Queue', 9, 0, 180], ['Break', 12, 0, 30], ['On Queue', 12, 30, 240], ['Meal', 16, 30, 30]]) {
      const end = h0 * 60 + m0 + len; sch.push([n, c, dt(d, h0, m0), dt(d, Math.floor(end / 60), end % 60), len]);
      const late = n === T.names[0] && d === 3 && h0 === 9 ? 15 : 0;   // Omar starts 15 minutes late on the 3rd
      tl.push([n, dt(d, h0, m0 + late), '', c === 'On Queue' ? 'On Queue' : c, hms((len - late) * 60), dt(1, 0, 0)]);
    }
  }
  const schF = path.join(out, 'Schedule activities - Nov 2026 (made-up).csv'), tlF = path.join(out, 'Agent Status Timeline Details - Nov 2026 (made-up).csv');
  fs.writeFileSync(schF, csv(sch)); fs.writeFileSync(tlF, csv(tl));
  await p.setInputFiles('#dnPicker', [attF, schF, tlF]);
  await p.waitForFunction(() => !window.__mc.state.dnBusy && window.__mc.state.dedNext['2026-11'], null, { timeout: 30000 }); await p.waitForTimeout(400);
  C = await card(); W = await warns(); X = await book(); E = await mail();
  ok(/^ok: 1–12 Nov · attendance 4 people from 1 sheet dropped here/.test(C.li[1]) && /^ok: 1–12 Nov · deduction minutes 2 people from the Schedule and Agent Status Timeline dropped here/.test(C.li[2]) && /Zed Notinroster/.test(C.text) && /Noura B\./.test(C.text) && !/Not found in the roster:[^.]*\b(Absent|After|AL|OFF)\b/.test(C.text),
    `the box says where November's days come from: ${C.li.slice(1).join(' | ')}; not in the roster: Zed Notinroster (not the legend)`);
  ok(!W.some(w => /1–12 Nov/.test(w)), 'the warnings about November are gone');
  ok(X.day('Omar Al Demo', '2026-11-01') === 'AL leave' && X.day('Omar Al Demo', '2026-11-03') === 'Attend' && X.cnt('Omar Al Demo', 'Tardy') === 15 && X.day('Omar Al Demo', '2026-11-06') === 'OFF' && X.day('Rayan Alexample', '2026-11-02') === 'SL leaves' && X.day('Nawal Sampleson', '2026-11-04') === 'Absent' && !X.dates.includes('2026-11-13') && X.people.length === 3 && X.dates.length === 31,
    `1–12 Nov in the Attendance Report: Omar AL on the 1st, 15 min late on the 3rd (Attend; Tardy ${X.cnt('Omar Al Demo', 'Tardy')}, his sheet's Tardy column), Rayan SL on the 2nd, the SM person absent on the 4th, the 13th not in (it is December's); still only Virgin, no legend`);
  ok(X.cnt('Nawal Sampleson', 'Tardy') === 58 && X.cnt('Omar Al Demo', 'Tardy') === 15 && X.tot('Omar Al Demo') === 50, `Tardy after the drop: the SM person's November Tardy column (40; her 25 day-cell minutes not counted) with October's 18: ${X.cnt('Nawal Sampleson', 'Tardy')}; Omar his sheet's column, ${X.cnt('Omar Al Demo', 'Tardy')} (his Total (min) ${X.tot('Omar Al Demo')})`);
  const kt = await p.evaluate(pid => ((window.__mem['dednext/2026-11'] || {}).tard || {})[pid], T.pids[3]);
  ok(kt === 40, `  the box keeps the sheet's Tardy column with the days (dednext/2026-11: ${kt} min)`);
  ok(X.dd('Omar Al Demo', '2026-11-03', 2) === 15 && X.dd('Omar Al Demo', '2026-11-04', 2) === 0 && X.dd('Rayan Alexample', '2026-11-05', 2) === 0 && X.tot('Omar Al Demo') === 50 && X.dd('Omar Al Demo', '2026-11-06', 0) == null,
    `1–12 Nov in the Monthly Deduction: Omar's 3rd a Diff of ${X.dd('Omar Al Demo', '2026-11-03', 2)} (Sched. ${X.dd('Omar Al Demo', '2026-11-03', 0)}, Actual ${X.dd('Omar Al Demo', '2026-11-03', 1)}), his total ${X.tot('Omar Al Demo')} (35 in October + 15)`);
  ok(E.ded.join() === 'Omar Al Demo:50' && E.abs.join() === 'Nawal Sampleson:2026-11-04' && /\t4-Nov/.test(E.text) && !/Nawal Testname/.test(E.abs.join()),
    `the email over the period: deduction ${E.ded.join(', ')}; absences ${E.abs.join(', ')} (its column "4-Nov"; Virgin only)`);
  const kept = await p.evaluate(pid => { const x = window.__mem['dednext/2026-11']; return x ? { att: (x.att[pid] || []).slice(0, 4), n: (x.att[pid] || []).length, sch: (x.sch[pid] || [])[2], files: x.files.map(f => f.kind).join(), by: x.by, dm: x.dm } : null; }, T.pids[0]);
  ok(kept && kept.att.join() === 'AL,Attend,15,Attend' && kept.n === 12 && kept.sch > 0 && kept.files === 'attendance,schedule,timeline' && kept.by === 'Noura B.' && kept.dm === '2026-11', `kept with the shared data (dednext/2026-11): Omar ${kept && kept.att.join(', ')} (12 days), the files ${kept && kept.files}`);
  await p.evaluate(() => document.getElementById('dnCard').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(out, 'dedcycle-after.png') });
  // ---- 3. a correction for a November day
  await p.fill('#wfmUpd [data-updtext]', 'Omar Al Demo SL 5 Nov'); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(300);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#wfmUpd .updprev tbody tr')].map(tr => [...tr.querySelectorAll('td')].slice(1, 5).map(td => td.textContent.trim()).filter(Boolean).join(' ')));
  ok(rows.length === 1 && /^5 Nov Attend → SL leave/.test(rows[0]), `the correction reads the dropped day as Now: ${rows.join(' | ')}`);
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(500);
  const ed = await p.evaluate(pid => { const E = window.__mc.state.attEditsBy['2026-11']; const e = E && E.get(pid); return e && e.days ? e.days[5] : null; }, T.pids[0]);
  X = await book();
  ok(ed && ed.v === 'SL' && X.day('Omar Al Demo', '2026-11-05') === 'SL leaves' && X.dd('Omar Al Demo', '2026-11-05', 2) === 0 && X.tot('Omar Al Demo') === 50,
    `Apply: November's correction (5 Nov ${ed && ed.v}); the workbook shows SL on the 5th, no deduction that day (total ${X.tot('Omar Al Demo')})`);
  // ---- 4. October final: a correction for one of its days in the period counts for the deduction only
  await p.evaluate(() => { const S = window.__mc.state; S.finals['2026-10'] = { status: 'final', rows: S.history['2026-10'].rows, at: new Date().toISOString(), byName: 'Sara K.' }; S.finVer++; window.__mc.renderWs(); });
  await p.waitForTimeout(300);
  await p.fill('#wfmUpd [data-updtext]', 'Omar Al Demo SL 20 Oct'); await p.click('#wfmUpd [data-updread]'); await p.waitForTimeout(300);
  const fr = await p.evaluate(() => [...document.querySelectorAll('#wfmUpd .updprev tbody tr')].map(tr => ({ on: tr.querySelector('input').checked, t: [...tr.querySelectorAll('td')].slice(1).map(td => td.textContent.trim()).filter(Boolean).join(' ') })));
  const warnFin = await p.evaluate(() => (document.querySelector('#wfmUpd .warnline') || {}).textContent || '');
  ok(fr.length === 1 && fr[0].on && /^20 Oct Attend → SL leave.*for the deduction only \(Oct 2026 is final\)/.test(fr[0].t) && /Oct 2026 is final: corrections for 13–31 Oct count for the deduction only/.test(warnFin),
    `October final: 20 Oct can still be corrected, for the deduction only (${fr.map(r => r.t).join(' | ')})`);
  await p.click('#wfmUpd [data-updapply]'); await p.waitForTimeout(500);
  const fx = await p.evaluate(pid => {   // the workbook's data, read without a download (its toast would take the Undo's place)
    const x = window.__mem[`dedfix/2026-10/edits/${pid}`], a = window.__mem[`att/2026-10/edits/${pid}`], M = window.__mc, r = M.liveRows('2026-10').find(q => q.n === 'Omar Al Demo');
    const D = M.dedData(), i = D.days.findIndex(x => x.m === 10 && x.d === 20), at = D.att.find(q => q.name === 'Omar Al Demo'), dd = D.ded.find(q => q.name === 'Omar Al Demo');
    const tot = dd.sched.reduce((t, sv, j) => { const av = dd.act[j]; return sv == null || av == null || av === 0 ? t : t + Math.max(0, sv - av); }, 0);
    return { fix: x && x.days && x.days[20] && x.days[20].v, att: !!a, d20: r && r.d[19], ded: r && r.ded, day: at.days[i], diff: dd.sched[i] - dd.act[i], tot, mail: (M.curMail().md.ded.find(q => /Omar/.test(q.name)) || {}).total };
  }, T.pids[0]);
  ok(fx.fix === 'SL' && !fx.att && fx.day === 'SL' && fx.diff === 0 && fx.tot === 40 && fx.mail === 40 && fx.d20 === 'A' && fx.ded === 35,
    `kept as the deduction's own (dedfix/2026-10, not October's corrections): the workbook has SL on the 20th, no deduction that day (total ${fx.tot}, the email ${fx.mail}); October's own row stays (the 20th ${fx.d20}, ${fx.ded} min)`);
  await p.click('#toastAct'); await p.waitForTimeout(400); X = await book();
  ok(await p.evaluate(pid => !window.__mem[`dedfix/2026-10/edits/${pid}`], T.pids[0]) && X.day('Omar Al Demo', '2026-10-20') === 'Attend' && X.tot('Omar Al Demo') === 50, `Undo: the 20th is as frozen again (total ${X.tot('Omar Al Demo')})`);
  // ---- 5. Clear what was dropped, and Undo
  await p.click('#dnCard [data-dnclear]'); await p.waitForTimeout(400);
  C = await card();
  const gone = await p.evaluate(() => !window.__mem['dednext/2026-11'] && !window.__mc.state.dedNext['2026-11']);
  ok(gone && /^warn: 1–12 Nov · deduction minutes Not in yet/.test(C.li[2]) && /^ok: 1–12 Nov · attendance From the corrections/.test(C.li[1]), `Clear: gone from the shared data; the minutes not in again, the attendance only the correction (${C.li[1]})`);
  await p.click('#toastAct'); await p.waitForTimeout(400);
  C = await card();
  ok(await p.evaluate(() => !!window.__mem['dednext/2026-11']) && /^ok: 1–12 Nov · attendance 4 people/.test(C.li[1]), 'Undo: back');
  // Settings › Deduction period: days saved by an earlier version are not used; days set in Settings are (14 to 13, as the team's
  // November template runs), then back to 13 to 12
  await p.evaluate(() => { const M = window.__mc; M.applySettings({ dedFrom: 14, dedTo: 13 }); M.renderWs(); }); await p.waitForTimeout(300);
  C = await card();
  ok(/^The period: 13 Oct – 12 Nov$/.test(C.h), `days saved without being set in Settings are not used: "${C.h}"`);
  await p.evaluate(() => { const M = window.__mc; M.applySettings({ dedFrom: 14, dedTo: 13, dedSet: true }); M.renderWs(); }); await p.waitForTimeout(300);
  C = await card(); X = await book();
  ok(/^The period: 14 Oct – 13 Nov$/.test(C.h) && X.dates.length === 31 && X.dates[0] === '2026-10-14' && X.dates[30] === '2026-11-13' && /^ok: 14–31 Oct/.test(C.li[0]), `Settings › Deduction period 14 to 13: "${C.h}", ${X.dates.length} days from ${X.dates[0]} to ${X.dates[30]}`);
  await p.evaluate(() => { const S = window.__mc.state; S.settings.dedFrom = 13; S.settings.dedTo = 12; S.settings.dedSet = false; window.__mc.renderWs(); });
  ok(!errs.length, `no errors ${errs.join('; ')}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
