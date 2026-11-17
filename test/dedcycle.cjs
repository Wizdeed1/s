// WFM team › Emails › Deduction and absences: the email's workbook from the 13th of the month to the 12th of the next, in the browser,
// as the WFM manager, with made-up people and a made-up October 2026 only (its file runs 13 Oct – 12 Nov):
// 1. Before anything is dropped: the workbook's days run 13 Oct – 12 Nov; its Attendance Report has only Virgin (every team, not
//    FRiENDi), its Monthly Deduction only Virgin · CC; November's days are empty, and the page says so (the box and two warnings).
// 2. The box "The days after October": a made-up attendance sheet for November (a CSV with a date for each day: a leave, late minutes,
//    an absence, someone not in the roster) and the November Schedule and Agent Status Timeline: 1–12 Nov fill in (the minutes too:
//    15 min late on the 3rd is a Diff of 15), the box says what came from where, the warnings go, it is kept with the shared data.
// 3. A correction for a November day (Corrections after the review): Now shows the dropped day, Apply puts it in November's
//    corrections, and the workbook shows it (an SL day: no deduction).
// 4. Clear what was dropped, and Undo; no errors.
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
    const R = S.roster.filter(x => x.team === 'CC' && x.brand === 'Virgin').slice(0, 2).concat(S.roster.filter(x => x.team === 'CC' && x.brand === 'Friendi').slice(0, 1), S.roster.filter(x => x.team === 'SM' && x.brand === 'Virgin').slice(0, 1));
    const names = ['Omar Al Demo', 'Rayan Alexample', 'Nawal Testname', 'Nawal Sampleson'];
    R.forEach((q, i) => { q.name = names[i]; q.sys = ''; });
    const off = d => [2, 9, 16, 23, 30].includes(d), A = { 20: 470, 27: 455 };
    const d = () => Array.from({ length: 31 }, (_, i) => (off(i + 1) ? 'O' : 'A')).join('');
    const sch = Array.from({ length: 31 }, (_, i) => (off(i + 1) ? '' : 480)), act = i0 => sch.map((v, i) => (v === '' ? '' : i0 === 0 ? A[i + 1] || 480 : 480));
    const rows = R.map((q, i) => ({ id: String(q.nid), n: q.name, brand: q.brand, team: q.team, d: d(), worked: 26, ...(q.team === 'CC' ? { ds: sch.join(','), da: act(i).join(','), ded: i === 0 ? 10 + 25 : 0 } : {}) }));
    S.history['2026-10'] = { y: 2026, m: 10, rows, tool: true, at: new Date().toISOString() }; S.histVer++; S.wsMonth = '2026-10';
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
  // ---- 1. before anything is dropped
  let C = await card(), W = await warns(), X = await book();
  ok(X.name === 'MC Monthly Deduction - Oct 2026.xlsx' && X.title === 'MC Monthly Attendance - Oct - 2026 (13 Oct – 12 Nov)' && X.dates.length === 31 && X.dates[0] === '2026-10-13' && X.dates[18] === '2026-10-31' && X.dates[19] === '2026-11-01' && X.dates[30] === '2026-11-12' && X.dDates === 31,
    `the workbook (${X.name}): "${X.title}", ${X.dates.length} days from ${X.dates[0]} to ${X.dates[30]}, the Monthly Deduction the same ${X.dDates}`);
  ok(X.people.length === 3 && X.people.every(s => s.split('|')[1] === 'Virgin') && !X.people.some(s => s.startsWith('Nawal Testname')) && X.people.some(s => /^Nawal Sampleson\|Virgin\|SM$/.test(s)),
    `its Attendance Report: only Virgin, every team (${X.people.join(', ')}); the FRiENDi person left out`);
  ok(X.dPeople.join() === 'Omar Al Demo,Rayan Alexample' || X.dPeople.slice().sort().join() === 'Omar Al Demo,Rayan Alexample', `its Monthly Deduction: Virgin · CC only (${X.dPeople.join(', ')})`);
  ok(X.day('Omar Al Demo', '2026-10-13') === 'Attend' && X.day('Omar Al Demo', '2026-10-16') === 'OFF' && X.day('Omar Al Demo', '2026-11-01') == null && X.dd('Omar Al Demo', '2026-10-20', 2) === 10 && X.dd('Omar Al Demo', '2026-10-27', 2) === 25 && X.tot('Omar Al Demo') === 35 && X.dd('Omar Al Demo', '2026-11-03', 0) == null,
    `October's days from the month (13 Oct Attend, 16 Oct OFF, 20 Oct Diff 10, 27 Oct Diff 25, total ${X.tot('Omar Al Demo')}); November's empty`);
  ok(/^The days after October$/.test(C.h) && C.li.length === 3 && /^ok: 13–31 Oct/.test(C.li[0]) && /^warn: 1–12 Nov · attendance Not in yet/.test(C.li[1]) && /^warn: 1–12 Nov · deduction minutes Not in yet/.test(C.li[2]) && C.drop && /13 Oct – 12 Nov/.test(C.text),
    `the box: ${C.li.join(' | ')}`);
  ok(W.some(w => /^The workbook runs 13 Oct – 12 Nov: no attendance for 1–12 Nov yet/.test(w)) && W.some(w => /^No deduction minutes for 1–12 Nov yet/.test(w)), `two warnings on the page: ${W.filter(w => /Nov/.test(w)).map(w => w.slice(0, 60)).join(' | ')}`);
  await p.evaluate(() => document.getElementById('dnCard').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(out, 'dedcycle-before.png') });
  // ---- 2. November's files dropped in the box
  const nov = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`), wk = d => ![6, 7].includes(d);   // 6 and 7 Nov: Friday and Saturday
  const code = (who, d) => (!wk(d) ? 'OFF' : who === 0 && d === 1 ? 'AL' : who === 0 && d === 3 ? '15' : who === 1 && d === 2 ? 'SL' : who === 3 && d === 4 ? 'Absent' : 'Attend');
  const attRows = [['Name', 'National ID', 'Team', 'Dep', ...nov], ...[0, 1, 2, 3].map(i => [T.names[i], T.nids[i], i === 2 ? 'Friendi' : 'Virgin', i === 3 ? 'SM' : 'CC', ...nov.map((_, j) => code(i, j + 1))]), ['Zed Notinroster', '1999999999', 'Virgin', 'CC', ...nov.map((_, j) => code(9, j + 1))]];
  const attF = path.join(out, 'Attendance - Nov 2026 (made-up).csv'); fs.writeFileSync(attF, csv(attRows));
  const dt = (d, h, m) => `11/${d}/2026 ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`, hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const sch = [['Agent Name', 'Activity Code Name', 'Start', 'End', 'Length In Minutes']], tl = [['Agent Name', 'Start Time', 'End Time', 'Primary Status', 'Duration', 'Interval Start']];
  for (const n of [T.names[0], T.names[1]]) for (let d = 1; d <= 12; d++) {
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
  await p.waitForFunction(() => !window.__mc.state.dnBusy && window.__mc.state.dedNext['2026-10'], null, { timeout: 30000 }); await p.waitForTimeout(400);
  C = await card(); W = await warns(); X = await book();
  ok(/^ok: 1–12 Nov · attendance 4 people from 1 sheet dropped here/.test(C.li[1]) && /^ok: 1–12 Nov · deduction minutes 2 people from the Schedule and Agent Status Timeline dropped here/.test(C.li[2]) && /Zed Notinroster/.test(C.text) && /Noura B\./.test(C.text),
    `the box says where November's days come from: ${C.li.slice(1).join(' | ')}; not in the roster: Zed Notinroster`);
  ok(!W.some(w => /Nov/.test(w)), 'the warnings about November are gone');
  ok(X.day('Omar Al Demo', '2026-11-01') === 'AL leave' && X.day('Omar Al Demo', '2026-11-03') === 'Attend' && X.cnt('Omar Al Demo', 'Tardy') === 15 && X.day('Omar Al Demo', '2026-11-06') === 'OFF' && X.day('Rayan Alexample', '2026-11-02') === 'SL leaves' && X.day('Nawal Sampleson', '2026-11-04') === 'Absent' && X.people.length === 3,
    `1–12 Nov in the Attendance Report: Omar AL on the 1st, 15 min late on the 3rd (Attend, Tardy ${X.cnt('Omar Al Demo', 'Tardy')}), Rayan SL on the 2nd, the SM person absent on the 4th; still only Virgin`);
  ok(X.dd('Omar Al Demo', '2026-11-03', 2) === 15 && X.dd('Omar Al Demo', '2026-11-04', 2) === 0 && X.dd('Rayan Alexample', '2026-11-05', 2) === 0 && X.tot('Omar Al Demo') === 50 && X.dd('Omar Al Demo', '2026-11-06', 0) == null,
    `1–12 Nov in the Monthly Deduction: Omar's 3rd a Diff of ${X.dd('Omar Al Demo', '2026-11-03', 2)} (Sched. ${X.dd('Omar Al Demo', '2026-11-03', 0)}, Actual ${X.dd('Omar Al Demo', '2026-11-03', 1)}), his total ${X.tot('Omar Al Demo')} (35 in October + 15)`);
  const kept = await p.evaluate(pid => { const x = window.__mem['dednext/2026-10']; return x ? { att: (x.att[pid] || []).slice(0, 4), sch: (x.sch[pid] || [])[2], files: x.files.map(f => f.kind).join(), by: x.by } : null; }, T.pids[0]);
  ok(kept && kept.att.join() === 'AL,,15,Attend'.replace(',,', ',Attend,') && kept.sch > 0 && kept.files === 'attendance,schedule,timeline' && kept.by === 'Noura B.', `kept with the shared data (dednext/2026-10): Omar ${kept && kept.att.join(', ')}, the files ${kept && kept.files}`);
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
  // ---- 4. Clear what was dropped, and Undo
  await p.click('#dnCard [data-dnclear]'); await p.waitForTimeout(400);
  C = await card();
  const gone = await p.evaluate(() => !window.__mem['dednext/2026-10'] && !window.__mc.state.dedNext['2026-10']);
  ok(gone && /^warn: 1–12 Nov · deduction minutes Not in yet/.test(C.li[2]) && /^ok: 1–12 Nov · attendance From the corrections/.test(C.li[1]), `Clear: gone from the shared data; the minutes not in again, the attendance only the correction (${C.li[1]})`);
  await p.click('#toastAct'); await p.waitForTimeout(400);
  C = await card();
  ok(await p.evaluate(() => !!window.__mem['dednext/2026-10']) && /^ok: 1–12 Nov · attendance 4 people/.test(C.li[1]), 'Undo: back');
  ok(!errs.length, `no errors ${errs.join('; ')}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
