// The corrections that come back after the deduction email, read by UpdParse (made-up people only):
// 1. Values: SL leaves, AL, Absent, OFF, Attend, a leave by name, late minutes, clear; single letters only in a table.
// 2. Days: 27-Oct, 27 Oct 2026, Oct 27, 27/10/2026, 2026-10-27, ranges (27-29 Oct, 27 Oct to 2 Nov), lists (27, 28 and 31 Oct),
//    a day with no month (on the 10th), the year nearest the month the corrections are for.
// 3. Tables: tab-separated as pasted, one cell a line as an email's text has it (greeting and signature left out), Date and Type
//    columns, From and To, a sheet's rows, an email's HTML (layout tables skipped), a saved .eml (quoted-printable and base64).
// 4. Typed lines: "set X as absent on 10 Oct", "X SL 27-29 Oct", late minutes, clear; "Al" in a name is not annual leave; a line
//    with no day, no value or two values is not read, with why; a greeting is left out.
// 5. Who: by ID, the full name against a shorter one, a first name alone when only one person has it, the names to choose from
//    when several do, brand and team narrowing; the same person twice is one list of days.
// 6. Exceptions: rows with no header (a day, the name with the reason after it, what it was: "Pc loading", "Excuse", a time like
//    4:00 PM - 4:30 PM), days written Oct-22, 11-oct or 22-Oct-2026, the minutes from the time or the text ("for 2 min", "1min only",
//    "1 hour"), the whole day when none is given; typed lines; a header table's Type column; and the monthly workbook's Deduction
//    sheet with them (each excused day's Diff, the total, the Review Notes).
// Usage: node test/updparse.test.cjs
const path = require('node:path');
const U = require(path.join(__dirname, '../js/updparse.js'));
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const people = [
  { pid: 'p1', name: 'Rayan Alexample', sys: '', team: 'CC', brand: 'Virgin', nid: '1000000011', inMonth: true },
  { pid: 'p2', name: 'Nawal Testname', sys: '', team: 'CC', brand: 'Friendi', nid: '1000000012', inMonth: true },
  { pid: 'p3', name: 'Nawal Sampleson', sys: '', team: 'SM', brand: 'Virgin', nid: '1000000013', inMonth: true },
  { pid: 'p4', name: 'Omar Al Demo', sys: '', team: 'CC', brand: 'Virgin', nid: '1000000014', inMonth: true },
  { pid: 'p5', name: 'Lina Placeholder', sys: 'Lina M. Placeholder', team: 'CT', brand: 'Virgin', nid: '1000000015', inMonth: true },
  { pid: 'p6', name: 'Rayan Oldperson', sys: '', team: 'CC', brand: 'Virgin', nid: '1000000016', inMonth: false },
];
const ctx = { y: 2026, m: 10, people };
const days = g => g.changes.map(c => `${c.date.slice(5)}=${c.clear ? 'clear' : c.v}${c.wide ? '*' : ''}`).join(' ');
// ---- 1. values
const V = (s, t) => { const r = U.valueOf(s, t); return r ? (r.clear ? 'clear' : r.v) : null; };
ok(V('SL leaves', true) === 'SL' && V('Sick leave') === 'SL' && V('AL leave') === 'AL' && V('annual') === 'AL' && V('Absent') === 'Absent' && V('off') === 'OFF' && V('Day off') === 'OFF' && V('present') === 'Attend', 'SL leaves, sick leave, AL leave, annual, absent, off, day off, present');
ok(V('Exam leave', true) === 'Exam' && V('Unpaid leave') === 'Unpaid' && V('Maternity leave') === 'ML' && V('Hajj leave', true) === 'Hajj' && V('National Day') === 'National Day', 'leaves by name, one the tool has no code for kept as written (Hajj)');
ok(V('late 20 min') === 20 && V('20 minutes late') === 20 && V('15', true) === 15 && V('15') === null, 'late minutes; a bare number only in a table');
ok(V('A', true) === 'Absent' && V('a') === null && V('Eid', true) === 'Eid' && V('eid') === null && V('clear') === 'clear' && V('–', true) === null, 'single letters and Eid only in a table; clear; a dash is nothing');
// ---- 2. days
const D = s => U.daysOf(s, ctx).days.map(d => d.slice(5)).join(' ');
ok(D('on 10 Oct') === '10-10' && D('10-Oct') === '10-10' && D('Oct 10') === '10-10' && D('10/10/2026') === '10-10' && D('2026-10-10') === '10-10' && D('10th of October') === '10-10', 'one day, written six ways');
ok(D('27-29 Oct') === '10-27 10-28 10-29' && D('from 27 to 29 Oct') === '10-27 10-28 10-29' && D('Oct 27-29') === '10-27 10-28 10-29' && U.daysOf('27-29 Oct', ctx).wide, 'a range in a month, marked as a range');
ok(D('27 Oct to 2 Nov') === '10-27 10-28 10-29 10-30 10-31 11-01 11-02', 'a range over two months');
ok(D('27, 28 and 31 Oct') === '10-27 10-28 10-31' && D('on the 10th') === '10-10' && D('on 3, 4 and 7') === '10-03 10-04 10-07' && D('31 Feb') === '', 'a list, a day with no month (the month of the corrections), a day that does not exist');
ok(U.daysOf('3 Jan', ctx).days[0] === '2027-01-03' && U.daysOf('28 Sep', ctx).days[0] === '2026-09-28' && U.oneDay('46315', ctx) === '2026-10-20', 'the year nearest October 2026; an Excel date number');
// ---- 3. tables
const one = r => r.groups.map(g => `${g.pid || '?'}: ${days(g)}`).join(' | ');
const tsv = 'Name\tTeam\tDep\t27-Oct\t28-Oct\t29-Oct\t31-Oct\nRayan Fahad Majed Alexample\tVirgin\tCC\tSL leaves\tSL leaves\tSL leaves\tSL leaves';
let r = U.parse({ text: tsv }, ctx);
ok(r.table && one(r) === 'p1: 10-27=SL 10-28=SL 10-29=SL 10-31=SL' && !r.bad.length, `the champion's table, pasted (the full name against a shorter one): ${one(r)}`);
const mail = 'Hi Team,\nKindly support us in updating the leave records below.\n\nName\nTeam\nDep\n27-Oct\n28-Oct\nRayan Fahad Majed Alexample\nVirgin\nCC\nSL leaves\nAL leave\nNawal Testname\nFriendi\nCC\n\nAbsent\nRegards,\nSomeone';
r = U.parse({ text: mail }, ctx);
ok(one(r) === 'p1: 10-27=SL 10-28=AL | p2: 10-28=Absent', `an email's text, one cell a line (greeting and signature left out): ${one(r)}`);
r = U.parse({ rows: [['Employee Name', 'ID', 'Date', 'Leave Type'], ['Someone Else', '1000000013', '05/10/2026', 'Annual leave'], ['Lina M. Placeholder', '', '2026-10-06', 'Sick'], ['Total', '', '', '']] }, ctx);
ok(one(r) === 'p3: 10-05=AL | p5: 10-06=SL', `a sheet with Date and Type columns, matched by ID first and by the system name: ${one(r)}`);
r = U.parse({ text: 'Name\tFrom\tTo\tType\nOmar Al Demo\t12-Oct\t14-Oct\tExam leave\nOmar Al Demo\t20 Oct\t\tsomething odd' }, ctx);
ok(one(r) === 'p4: 10-12=Exam* 10-13=Exam* 10-14=Exam*' && r.bad.length === 1 && /no value/.test(r.bad[0].why), `From and To: every day between; a row with an unknown value is listed with why (${r.bad.length})`);
r = U.parse({ text: 'Name\t27-Oct\nRayan Alexample\tholiday maybe' }, ctx);
ok(!r.groups.length && r.bad.length === 1 && /Rayan Alexample, 27 Oct/.test(r.bad[0].text), 'a day value the tool does not know: not read, with the day and the name');
// ---- 4. typed lines
const T = s => U.parse({ text: s }, ctx);
r = T('set rayan as an absent on 10 Oct');
ok(one(r) === 'p1: 10-10=Absent', `"set rayan as an absent on 10 Oct": ${one(r)} (the one Rayan in the month)`);
r = T('omar al demo late 20 min on 5 Oct\nOmar Al Demo AL 6 Oct');
ok(one(r) === 'p4: 10-05=20 10-06=AL', `"Al" in a name is not annual leave; "AL" is: ${one(r)}`);
r = T('Rayan SL 27-29 Oct and 31 Oct\nclear rayan 3 Oct');
ok(one(r) === 'p1: 10-03=clear 10-27=SL* 10-28=SL* 10-29=SL* 10-31=SL*', `a range and a day; clear; the same person twice is one list: ${one(r)}`);
r = T('nawal absent on 10 Oct');
ok(r.groups.length === 1 && !r.groups[0].pid && r.groups[0].cands.join() === 'p3,p2' && /choose/.test(r.groups[0].why), `two people called Nawal: the names to choose from (${r.groups[0].cands})`);
r = T('nawal friendi absent on 10 Oct');
ok(one(r) === 'p2: 10-10=Absent', 'the brand narrows it to one');
r = T('nawal SM absent on 10 Oct');
ok(one(r) === 'p3: 10-10=Absent', 'the team narrows it to one');
r = T('Hi Diaa,\nrayan absent\nrayan on 10 Oct\nrayan SL and absent on 10 Oct\nset xyz qwerty as absent on 4 oct\nThanks');
ok(r.bad.length === 3 && /no day/.test(r.bad[0].why) && /no value/.test(r.bad[1].why) && /two different values/.test(r.bad[2].why), `lines with no day, no value or two values: not read, with why (${r.bad.map(b => b.why.split(':')[0]).join('; ')})`);
ok(r.groups.length === 1 && !r.groups[0].pid && /nobody called "xyz qwerty"/.test(r.groups[0].why), 'a name nobody has: said so');
r = T('rayan absent on 10 Oct');
ok(one(r) === 'p1: 10-10=Absent', 'someone not in the month (another Rayan) is not taken when one in the month fits');
// ---- 5. an email's HTML and a saved email
const html = '<table><tr><td><table><tr><td>layout</td></tr></table></td></tr></table><table><tr><th>Name</th><th>Team</th><th>Dep</th><th>27-Oct</th><th>28-Oct</th></tr><tr><td>Rayan Fahad Majed Alexample</td><td>Virgin</td><td>CC</td><td colspan="2">SL leaves</td></tr></table>';
const { JSDOM } = (() => { try { return require('jsdom'); } catch (e) { return {}; } })();
if (JSDOM) { const rows = U.htmlRows(html, new JSDOM('').window.DOMParser); ok(rows && rows.length === 2 && rows[1].length === 5 && one(U.parse({ rows }, ctx)) === 'p1: 10-27=SL 10-28=SL', 'the HTML table (a layout table skipped, colspan spread)'); }
const qp = s => s.replace(/=/g, '=3D').replace(/\t/g, '=09');
const eml = ['From: someone@example.com', 'Subject: Leave update', 'MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="b1"', '', '--b1', 'Content-Type: text/plain; charset="utf-8"', 'Content-Transfer-Encoding: quoted-printable', '',
  qp('Hi,\nName\tTeam\t27-Oct\nRayan Alexample\tVirgin\tSL leaves'), '--b1', 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', '', Buffer.from('<table><tr><td>Name</td><td>27-Oct</td></tr><tr><td>Rayan Alexample</td><td>Absent</td></tr></table>').toString('base64'), '--b1--', ''].join('\r\n');
const P = U.emlParts(new TextEncoder().encode(eml));
ok(/Rayan Alexample\tVirgin\tSL leaves/.test(P.text) && /<td>Absent<\/td>/.test(P.html), 'a saved email (.eml): its text (quoted-printable) and its HTML (base64)');
ok(one(U.parse({ text: P.text }, ctx)) === 'p1: 10-27=SL', 'the table in its text read');
ok(U.label('SL') === 'SL leave' && U.label(20) === 'Late 20 min' && U.label(null) === 'empty' && U.label('Absent') === 'Absent', 'labels as the Attendance Report writes them');
// ---- 6. exceptions (made-up names; the approver a made-up word)
const xs = c => `${c.date.slice(5)}=${c.exc != null ? 'x' + c.exc : c.v}`, xo = r => r.groups.map(g => `${g.pid}: ${g.changes.map(xs).join(' ')}`).join(' | ');
const loose = ['22-Oct-2026\tOmar Al Demo\t4:00 PM - 4:30 PM Supervisorx', '11-oct\tNawal Sampleson Supervisorx-pc loading for 2 min\tPc loading', 'Oct-22\tNawal Sampleson Supervisorx-excuse\tExcuse', 'Oct-19\tNawal Sampleson Supervisorx-pc loading 1min only\tPc loading', 'Oct-29\tNawal Sampleson Supervisorx-excuse\tExcuse'].join('\n');
const LX = U.parse({ text: loose }, ctx);
ok(LX.table && !LX.bad.length && xo(LX) === 'p4: 10-22=x30 | p3: 10-11=x2 10-19=x1 10-22=xday 10-29=xday', `rows with no header, as the supervisors list exceptions: ${xo(LX)}`);
ok(LX.groups[1].changes[0].why === 'PC loading' && LX.groups[1].changes[2].why === 'Excuse' && /^4:00 PM - 4:30 PM$/.test(LX.groups[0].changes[0].why) && LX.groups[1].who.alts.includes('Nawal Sampleson'), 'their reasons (PC loading, Excuse, the time), the name found before the approver and the reason');
const TX = U.parse({ text: 'Omar al demo pc loading 5 min on 11 Oct\nexcuse Rayan Oct-22\nLina system down 1 hour 12 Oct\nRayan late 15 min on 3 Oct' }, ctx);
ok(xo(TX) === 'p4: 10-11=x5 | p1: 10-03=15 10-22=xday | p5: 10-12=x60', `typed lines: an exception with its minutes or the whole day, an hour as 60 min, late minutes still late (${xo(TX)})`);
const HX = U.parse({ text: 'Name\tDate\tType\tNotes\nRayan Alexample\t20-Oct\tExcuse\tlate 12 min, approved\nOmar Al Demo\t21-Oct\tSL\t' }, ctx);
ok(xo(HX) === 'p1: 10-20=x12 | p4: 10-21=SL', `a table with a Type column: an exception (its minutes in the Notes) and a leave (${xo(HX)})`);
ok(U.winMin('4:00 PM - 4:30 PM').min === 30 && U.winMin('11:45 am - 12:15 pm').min === 30 && U.winMin('13:00-13:20').min === 20 && U.excOf('Excuse').exc === 'day' && !U.excOf('Rayan Alexample'), 'a time window\'s minutes (across noon, 24-hour); an excuse with no time is the day; a name is not an exception');
ok(U.label({ exc: 2, why: 'PC loading' }) === 'Exception: PC loading · 2 min excused' && U.label({ exc: 'day', why: 'Excuse' }) === 'Exception: Excuse · the day excused', 'an exception in words');
const WX = U.parse({ text: ['Thu 22-Oct Omar Al Demo 4:00 PM - 4:30 PM Supervisorx 30mins', '11-oct\tNawal Sampleson Supervisorx-pc loading for 2 mins\tPc loading', 'Thu 22-Oct\tRayan Alexample\t4:00 PM - 4:30 PM Supervisorx'].join('\n') }, ctx);
ok(xo(WX) === 'p4: 10-22=x30 | p3: 10-11=x2 | p1: 10-22=x30' && !WX.bad.length, `a day with its weekday (Thu 22-Oct), a line written out among the pasted rows: ${xo(WX)}`);
ok(U.oneDay('Thursday, 22 October 2026', ctx) === '2026-10-22' && U.oneDay('22-Oct-2026 (Thu)', ctx) === '2026-10-22' && U.oneDay('Thu, Oct 22', ctx) === '2026-10-22', 'a day cell with its weekday before or after it');
const MX = U.parse({ text: 'Date\tAgent Name\tException\tMinutes\nThu 22-Oct\tOmar Al Demo\tPermission\t30\n11-oct\tNawal Sampleson\tPc loading\t2\nOct-22\tNawal Sampleson\tExcuse\t\n27-Oct\tRayan Alexample\tSL\t' }, ctx);
ok(xo(MX) === 'p4: 10-22=x30 | p3: 10-11=x2 10-22=xday | p1: 10-27=SL' && MX.table, `a table with Exception and Minutes columns, and a leave in it: ${xo(MX)}`);
// the monthly workbook's Deduction sheet: each excused day's Diff, the total and the Review Notes
(async () => {
  const W2 = require(path.join(__dirname, '../js/writer2.js')), Core = require(path.join(__dirname, '../js/core.js'));
  const sched = Array.from({ length: 31 }, (_, i) => ([1, 8, 15, 22, 29].includes(i + 1) ? null : 480)), act = sched.map((v, i) => (v == null ? null : i === 10 ? 470 : i === 20 ? 420 : i === 27 ? 450 : 480));
  const roster = [{ _id: 'p1', name: 'Huda S.', nid: '1000000001', brand: 'Virgin', team: 'CC', status: 'Active' }, { _id: 'p2', name: 'Sami K.', nid: '1000000002', brand: 'Virgin', team: 'CC', status: 'Active' }];
  const note = 'Exceptions: 11 Oct PC loading (2 min); 21 Oct 4:00 PM - 4:30 PM (30 min); 28 Oct Excuse (the day)';
  const wctx = { year: 2026, month: 10, settings: { target: 0.9, floor: 0.5, inactiveMin: 6, dedBrands: ['Virgin'], dedTeams: ['CC'] }, roster, attendance: new Map(), rawAdh: [], rawAht: [], rawSched: roster.map(x => ({ name: x.name, days: sched })), rawActual: roster.map(x => ({ name: x.name, days: act })), logo: null, dedExc: new Map([['p1', { exc: { 10: 2, 20: 30, 27: 'day' }, note }]]) };
  const de = (await Core.readXlsx(await W2.build(wctx))).find(x => x.name === 'Deduction'), rows = de.rows.filter(r => r && /Huda|Sami/.test(String(r[1] || '')));
  const at = (r, d) => r[4 + (d - 1) * 3 + 2], tot = r => r[4 + 31 * 3], nt = r => r[4 + 31 * 3 + 1];
  ok(rows.length === 2 && at(rows[0], 11) === 8 && at(rows[0], 21) === 30 && at(rows[0], 28) === 0 && tot(rows[0]) === 38 && nt(rows[0]) === note, `the monthly workbook: the excused days' Diff (8, 30, 0), the total ${tot(rows[0])} and the Review Notes`);
  ok(at(rows[1], 11) === 10 && at(rows[1], 21) === 60 && tot(rows[1]) === 100 && !nt(rows[1]), 'someone with no exception: as Genesys has it (100)');
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
