// The recogniser (js/recog_core.js), Node only, synthetic people only (first name and an initial, made-up IDs from 1000000001):
// every kind of file the tool takes is told apart from its sheet names, columns (English and Arabic, a slip of a letter allowed),
// title rows and dates; the month comes from the content before the file name, and a disagreement is said in words; the people in
// a file are counted, with the IDs that are missing, 'NA', '#N/A' or doubled; a choice the user taught is remembered by the shape of
// the columns only. Real .xlsx bytes come from Writer2, the CSVs from the same text the Genesys exports have.
const assert = require('node:assert/strict');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);
const Core = require(js('core.js')), Recog = require(js('recog_core.js')), Writer2 = require(js('writer2.js')), Kpi = require(js('kpi.js')), History = require(js('history.js'));
require('./fixture.js');
const { evalBook } = require('./evalbook.cjs');
const F = globalThis.__FIX__;
const TODAY = new Date('2026-10-18T09:00:00Z');
const kpiNames = [...new Set(Object.values(Kpi.DEFAULTS().teams).flatMap(c => c.kpis.filter(k => k.src === 'file').flatMap(k => [k.name, ...(k.aliases || [])])))];
const OPTS = { today: TODAY, kpiNames };
let n = 0; const tests = [];
const ok = (name, fn) => tests.push([name, fn]);

// ---------------------------------------------------------------- synthetic files
const agents = F.roster.filter(p => p.team !== 'OP' && p.status !== 'Inactive');
const nid = i => String(1000000001 + i);
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const days = (y, m) => Array.from({ length: Core.daysIn(y, m) }, (_, i) => D(y, m, i + 1));
const CODES = ['Attend', 'Attend', 'Attend', 'OFF', 'Attend', 'AL', 'Attend', 'SL', 'Absent', 'Attend'];
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
const enc = s => new TextEncoder().encode(s);
async function xlsx(sheets) {   // [{name, rows, hidden}] -> bytes
  const S = new Writer2.Styles(), list = sheets.map(o => { const sh = new Writer2.Sheet(o.name); o.rows.forEach((r, i) => r.forEach((v, j) => { if (v != null && v !== '') sh.set(i + 1, j + 1, v, v instanceof Date ? S.get({ numFmt: 'd-mmm' }) : undefined); })); if (o.hidden) sh.hidden = true; return sh; });
  return Writer2.pack(list, S);
}
const run = async (name, bytes, opts = {}) => Recog.run('recog', name, bytes, { ...OPTS, ...opts });
const rec = async (name, bytes, opts) => (await run(name, bytes, opts)).rec;

// the four Genesys exports and Agent Performance, as the exports have them (September 2026)
const G = agents.slice(0, 12).map(p => p.name), dt = (d, h, m) => `9/${d}/2026 ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
const ADH = csv([['Agent Name', ...Array.from({ length: 30 }, (_, i) => `${String(i + 1).padStart(2, '0')} | %PCT - Adherence`)], ...G.map((g, k) => [g, ...Array.from({ length: 30 }, (_, i) => `${90 + (i + k) % 9}.50%`)])]);
const AHT = csv([['Interval Start', 'Interval End', 'Media Type', 'Agent Name', 'Avg Handle'], ...G.map((g, k) => [dt(1, 0, 0), dt(30, 23, 59), 'voice', g, `00:02:${String(10 + k).padStart(2, '0')}`])]);
const SCH = csv([['Agent Name', 'Activity Code Name', 'Start', 'End', 'Length In Minutes'], ...G.flatMap(g => [1, 2, 3].map(d => [g, 'On Queue', dt(d, 9, 0), dt(d, 13, 0), 240]))]);
const TL = csv([['Agent Name', 'Start Time', 'End Time', 'Primary Status', 'Duration', 'Interval Start'], ...G.flatMap(g => [1, 2].map(d => [g, dt(d, 9, 2), '', 'On Queue', '03:58:00', dt(1, 0, 0)]))]);
const PERF = csv([['Interval Start', 'Interval End', 'Agent Name', 'Media Type', 'Answered', 'Handle', 'Avg Handle', 'Avg Talk'], ...G.map(g => [dt(1, 0, 0), '10/1/2026 12:00 AM', g, 'voice', 300, 310, '00:02:30', '00:02:00'])]);

// a supervisor's sheet with a title row
const ATT = [['Virgin CC - attendance - September 2026'], [], ['ID', 'Name', 'Team', 'Dep', ...days(2026, 9), 'Tardy'], ...agents.slice(0, 8).map((p, i) => [nid(i), p.name, p.brand, p.team, ...days(2026, 9).map((_, d) => CODES[(d + i) % CODES.length]), i])];
// the HR IDs file, in English and with Arabic headers
const IDS = [['ID', 'Name', 'Team', 'Dep'], ...agents.slice(0, 20).map((p, i) => [nid(i), p.name, p.brand, p.team])];
const IDS_AR = [['رقم الهوية', 'الاسم', 'الفريق', 'القسم'], ...agents.slice(0, 20).map((p, i) => [nid(i), p.name, p.brand, p.team])];
// a roster, as the tool exports it
const ROSTER = [['Name', 'National ID', 'Brand', 'Team', 'System name', 'Status', 'Supervisor', 'Email'], ...agents.slice(0, 15).map((p, i) => [p.name, nid(i), p.brand, p.team, '', 'Active', '', ''])];
// the old final result of a month: no month inside, the name says Aug
const FINAL = [['ID', 'Name', 'Final % ', 'Earned SR '], ...agents.slice(0, 33).map((p, i) => [+nid(i), p.name, 0.8 + (i % 20) / 100, 400 + i * 7])];
// the incentive data workbook: four tabs, 'Attendance Report ' with a trailing space, an 'NA' and a '#N/A' ID, the title in C2
const INC_AR = [[], [], [], ['ID', 'Name', 'Team', 'Dep', ...days(2026, 8), 'Tardy'], ...agents.slice(0, 30).map((p, i) => [i === 3 ? 'NA' : i === 5 ? '#N/A' : i === 7 ? `${nid(i)} ` : +nid(i), p.name, p.brand, p.team, ...days(2026, 8).map((_, d) => CODES[(d + i) % CODES.length]), 0])];
const INC_DT = [[], [null, null, 'MC Monthly Adherence - Aug - 2026'], [], ['ID', 'Member Care champions', 'NA', ...days(2026, 8)], [null, null, null, ...days(2026, 8).map(() => 'Adherence (%)')], ...agents.slice(0, 25).map((p, i) => [+nid(i), p.name, '', ...days(2026, 8).map((_, d) => (d % 7 === 5 ? 'NA' : 0.9 + (d % 9) / 100))])];
const INC_AD = [[], [null, null, 'MC Monthly Adherence - Aug - 2026'], [], ['ID', 'Member Care champions', 'Team', 'Adherence'], ...agents.slice(0, 25).map((p, i) => [i === 2 ? '#N/A' : +nid(i), p.name, p.team, 0.93 + (i % 6) / 100])];
const INC_AH = [['ID', 'Name', 'Team', 'AHT'], ...agents.slice(0, 25).map((p, i) => [+nid(i), p.name, p.team, 140 + i])];
// the old Monthly Deduction workbook: its name says 2026-08, its dates and titles say Sep 2026
const sep = days(2026, 9);
const DED_AR = [['MC Monthly Attendance - Sep - 2026'], ['ID', 'Name', 'Team', 'Dep', ...sep, 'Tardy', 'AL', 'SL'], ...agents.slice(0, 18).map((p, i) => [+nid(i), p.name, p.brand, p.team, ...sep.map((_, d) => (d % 7 === 4 ? 'OFF' : d === 10 ? 'AL leave' : d === 22 ? 'National Day' : 'Attend')), 0, 1, 0])];
const DED_MD = [['MC Monthly Deduction - Sep - 2026'], [], [], ['ID', 'Name', 'Team', 'Dep', ...sep.flatMap(d => [d, null, null]), 'Total (min)'], [null, null, null, null, ...sep.flatMap(() => ['Sched.', 'Actual', 'Diff (min)'])], ...agents.slice(0, 12).map((p, i) => [+nid(i), p.name, p.brand, p.team, ...sep.flatMap(() => [480, 470, 10]), 300])];
// the KPI file, kpi.xlsx, the Teams Distribution, the interactions export, a daily calls export, Book1
const KPIF = [['National ID', 'Name', 'DRC-CSAT', 'Quality Observations', 'Empowerment Utilization'], ...agents.slice(0, 10).map((p, i) => [nid(i), p.name, 0.9, 0.95, 1])];
const SCORE = [['Team', 'KPI', 'Weight', 'Target', 'Rank 5', 'Rank 4', 'Rank 3', 'Rank 2'], ['CC', 'DRC-CSAT', 0.25, 0.85, 0.85, 0.8, 0.6, ''], ['CC', 'AHT', 0.05, 150, 150, 159.99, 170, '']];
const DIST = [['Name', 'Team Lead'], ...agents.slice(0, 10).map((p, i) => [p.name, F.roster[i % 4].name.split(' ')[0]])];
const INTER = csv([['Users', 'Date', 'Duration', 'Disconnect Type', 'ANI', 'Queue', 'Media Type'], ['Lina A.', '9/2/2026 10:01 AM', '00:03:10', 'Customer', 'tel:+966500000001', 'Virgin CC', 'voice'], ['Omar B.', '9/2/2026 10:05 AM', '00:01:10', 'Agent', 'tel:+966500000002', 'Virgin CC', 'voice']]);
const CALLS = csv([['Queue Name', 'Interval Start', 'Offer', 'Answered', 'Service Level %', 'Avg Handle', 'Abandon %'], ['Virgin Mobile CC', '9/2/2026 12:00 AM', 1200, 1100, '82.5%', '00:03:01', '3.1%']]);
const BOOK1 = csv([['Something', 'Else'], ['1', '2']]);

// ---------------------------------------------------------------- the kinds
ok('the four Genesys exports and Agent Performance: their kind, sure, the month from the export or the name', async () => {
  for (const [name, text, kind, month] of [['Monthly Adherence - Sep.csv', ADH, 'adhGenesys', [2026, 9]], ['Agents Performance Summary.csv', AHT, 'aht', [2026, 9]], ['Schedule activities.csv', SCH, 'schedule', [2026, 9]], ['Agent Status Timeline Details.csv', TL, 'timeline', [2026, 9]], ['Agent Performance.csv', PERF, 'perf', [2026, 9]]]) {
    const { dets, rec: v } = await run(name, enc(text));
    assert.ok(dets.some(d => d.kind === kind), `${name}: the engine's own reader finds it`);
    assert.equal(v.kind, kind, name); assert.equal(v.level, 'sure', name); assert.equal(v.route, 'import', name);
    assert.deepEqual([v.month.y, v.month.m], month, name + ' month');
    assert.equal(v.people.n, 12, name + ' agents');
  }
  const v = await rec('Monthly Adherence - Sep.csv', enc(ADH), { today: new Date('2026-01-10T00:00:00Z') });
  assert.deepEqual([v.month.y, v.month.m], [2025, 9], 'a month without a year: the latest one not after today');
  assert.deepEqual(v.month.from, ['file name']);
});

ok('a supervisor\'s attendance sheet with a title row: attendance, its month from the dates and the title', async () => {
  const v = await rec('Virgin CC attendance.xlsx', await xlsx([{ name: 'September', rows: ATT }]));
  assert.equal(v.kind, 'attendance'); assert.equal(v.level, 'sure'); assert.equal(v.route, 'attendance');
  assert.deepEqual([v.month.y, v.month.m], [2026, 9]); assert.deepEqual(v.month.from.sort(), ['dates', 'title']);
  assert.equal(v.conflicts.length, 0); assert.equal(v.people.n, 8); assert.equal(v.people.nid10, 8);
});

ok('the HR IDs file, with English and with Arabic headers', async () => {
  for (const rows of [IDS, IDS_AR]) {
    const v = await rec('IDs.xlsx', await xlsx([{ name: 'Sheet1', rows }]));
    assert.equal(v.kind, 'ids'); assert.equal(v.level, 'sure'); assert.equal(v.people.n, 20); assert.equal(v.people.withId, 20); assert.equal(v.month, null);
  }
  const csvAr = await rec('ids.csv', enc(csv(IDS_AR)));
  assert.equal(csvAr.kind, 'ids', 'Arabic headers in a CSV too');
});

ok('a roster, and a roster sheet in a workbook', async () => {
  assert.equal((await rec('MC Roster - 2026-10-01.csv', enc(csv(ROSTER)))).kind, 'roster');
  const v = await rec('team.xlsx', await xlsx([{ name: 'Roster', rows: ROSTER.map(r => r.slice(0, 4)) }]));
  assert.equal(v.kind, 'roster'); assert.equal(v.people.n, 15);
});

ok('the old final result: sure, no month inside so the name\'s Aug, never the IDs file', async () => {
  const { dets, rec: v } = await run('Final_result_for_Aug.xlsx', await xlsx([{ name: 'Sheet1', rows: FINAL }]));
  assert.ok(dets.some(d => d.kind === 'roster'), 'the engine alone takes it for a Name + ID sheet');
  assert.equal(v.kind, 'finalResult'); assert.equal(v.level, 'sure'); assert.equal(v.route, 'compare');
  assert.deepEqual([v.month.y, v.month.m], [2026, 8]); assert.deepEqual(v.month.from, ['file name']);
  assert.equal(v.people.n, 33); assert.equal(v.people.nid10, 33);
  assert.ok(v.reasons.some(r => /Final % and Earned SR/.test(r)), v.reasons.join(' | '));
  assert.ok(!v.alts.some(a => a.kind === 'ids'), 'not the IDs file at all');
});

ok('the incentive data workbook: four tabs, a trailing space, NA and #N/A IDs, the month from the dates and the title', async () => {
  const bytes = await xlsx([{ name: 'Attendance Report ', rows: INC_AR }, { name: 'Adherence -In Detail', rows: INC_DT }, { name: 'Adherence', rows: INC_AD }, { name: 'AHT', rows: INC_AH }]);
  const { rec: v } = await run('MC_all_team_incentive _data -2026-08.xlsx', bytes);
  assert.equal(v.kind, 'incentiveData'); assert.equal(v.level, 'sure');
  assert.deepEqual(v.routes, ['history', 'compare', 'incmail']);   // the incentive email is the senior manager's (Supervisors › Incentive email)
  assert.deepEqual([v.month.y, v.month.m], [2026, 8]); assert.ok(v.month.from.includes('dates') && v.month.from.includes('title') && v.month.from.includes('file name'));
  assert.equal(v.conflicts.length, 0);
  assert.equal(v.people.sheet, 'Attendance Report '); assert.equal(v.people.n, 30); assert.equal(v.people.withId, 28);
  assert.equal(v.people.badIds.na, 1); assert.equal(v.people.badIds.naErr, 1); assert.equal(v.people.badIds.nbsp, 1);
  assert.ok(History.isIncentive((await Core.readXlsx(bytes)).map(s => s.name)), 'the history reader agrees');
});

ok('the old Monthly Deduction workbook: Sep 2026 inside, 2026-08 in its name: one conflict, in words', async () => {
  const { dets, rec: v } = await run('Monthly_Deduction_2026-08.xlsx', await xlsx([{ name: 'Attendance Report', rows: DED_AR }, { name: 'Monthly Deduction', rows: DED_MD }]));
  assert.ok(dets.some(d => d.kind === 'attendance'), 'the engine alone takes its Attendance Report for this month\'s attendance');
  assert.equal(v.kind, 'oldDeductionBook'); assert.equal(v.level, 'sure'); assert.deepEqual(v.routes, ['compare', 'attendance']);
  assert.deepEqual([v.month.y, v.month.m], [2026, 9]);
  assert.equal(v.conflicts.length, 1);
  assert.equal(v.conflicts[0], 'The file name says Aug 2026 (2026-08); the dates and both titles inside say Sep 2026.');
  assert.deepEqual([v.month.fileName.y, v.month.fileName.m], [2026, 8]);
  assert.equal(v.people.n, 18);
});

ok('the quality team\'s Final EVAL: sure, Sep 2026 from its name', async () => {
  const { bytes } = await evalBook();
  const v = await rec('Final EVAL - September 2026.xlsx', bytes);
  assert.equal(v.kind, 'evalBook'); assert.equal(v.level, 'sure'); assert.equal(v.route, 'quality');
  assert.deepEqual([v.month.y, v.month.m], [2026, 9]);
  assert.ok(v.people.n >= 15, 'every EVAL sheet\'s agents: ' + v.people.n);
});

ok('the KPI file, kpi.xlsx, the Teams Distribution, the interactions export, a daily calls export', async () => {
  const k = await rec('KPI Sep 2026.xlsx', await xlsx([{ name: 'KPI', rows: KPIF }]));
  assert.equal(k.kind, 'kpiFile'); assert.equal(k.level, 'sure'); assert.deepEqual([k.month.y, k.month.m], [2026, 9]);
  const kr = Kpi.readFile(await Core.readXlsx(await xlsx([{ name: 'KPI', rows: KPIF }])), Kpi.DEFAULTS());
  assert.equal(kr.rows.length, 10, 'the KPI file reader agrees');
  assert.equal((await rec('kpi.xlsx', await xlsx([{ name: 'Scorecards', rows: SCORE }]))).kind, 'scorecard');
  const d = await rec('Distribution.xlsx', await xlsx([{ name: 'Sheet1', rows: DIST }]));
  assert.equal(d.kind, 'distribution'); assert.equal(d.route, 'distribution');
  const i = await rec('interactions.csv', enc(INTER));
  assert.equal(i.kind, 'inter'); assert.equal(i.level, 'sure');
  const c = await rec('Queue Performance.csv', enc(CALLS));
  assert.equal(c.kind, 'dailyCalls'); assert.equal(c.route, 'rb');
});

ok('Book1: not recognised, not sure, nowhere to go', async () => {
  const v = await rec('Book1.csv', enc(BOOK1));
  assert.equal(v.kind, 'unknown'); assert.equal(v.level, 'unsure'); assert.equal(v.route, 'none'); assert.deepEqual(v.routes, []);
});

ok('a monthly report made by this tool: Deduction, Attendance, Calc and Roster', async () => {
  const v = await rec('MC Monthly Report - Sep 2026.xlsx', await xlsx(['Deduction', 'Attendance', 'Calc', 'Roster', 'Adherence'].map(name => ({ name, rows: name === 'Roster' ? ROSTER : [['x']], hidden: name === 'Calc' }))));
  assert.equal(v.kind, 'toolReport'); assert.equal(v.level, 'sure'); assert.equal(v.route, 'email');
});

// ---------------------------------------------------------------- months, people, hidden sheets, learning
ok('months: content before the file name; dates against a title; names with and without a year', async () => {
  const m = (s, t = TODAY) => { const x = Recog.monthOfName(s, t); return x && [x.y, x.m, !!x.noYear]; };
  assert.deepEqual(m('Monthly_Deduction_2026-08.xlsx'), [2026, 8, false]);
  assert.deepEqual(m('MC_all_team_incentive _data -2026-08.xlsx'), [2026, 8, false]);
  assert.deepEqual(m('Final EVAL - September 2026.xlsx'), [2026, 9, false]);
  assert.deepEqual(m('Adherence 2026 Jul.csv'), [2026, 7, false]);
  assert.deepEqual(m('Final_result_for_Aug.xlsx'), [2026, 8, true]);
  assert.deepEqual(m('Monthly Adherence - Dec.csv'), [2025, 12, true]);
  assert.deepEqual(m('حضور سبتمبر 2026.xlsx'), [2026, 9, false]);
  assert.equal(m('Schedule activities.csv'), null); assert.equal(m('Marwa team.xlsx'), null); assert.equal(m('Book1.csv'), null);
  assert.deepEqual(Recog.monthInText('MC Monthly Deduction - Sep - 2026'), { y: 2026, m: 9 });
  // a title that disagrees with the dates
  const rows = ATT.map((r, i) => (i === 0 ? ['Virgin CC - attendance - August 2026'] : r));
  const v = await rec('Virgin CC.xlsx', await xlsx([{ name: 'Sheet1', rows }]));
  assert.deepEqual([v.month.y, v.month.m], [2026, 9]); assert.equal(v.conflicts.length, 1); assert.match(v.conflicts[0], /^The dates say Sep 2026, but a title on Sheet1 says Aug 2026\.$/);
});

ok('people: doubled IDs, doubled names, one ID with two names, short IDs', async () => {
  const rows = [['ID', 'Name', 'Team', 'Dep'], [nid(0), 'Lina A.', 'Virgin', 'CC'], [nid(0), 'Lina A.', 'Virgin', 'CC'], [nid(1), 'Omar B.', 'Virgin', 'CC'], [nid(1), 'Sara C.', 'Virgin', 'CC'], ['12345', 'Dana D.', 'Virgin', 'CC'], ['', 'Reem E.', 'Virgin', 'CC'], [nid(2), 'Huda F.', 'Friendi', 'CC']];
  const v = await rec('ids.csv', enc(csv(rows)));
  const P = v.people;
  assert.equal(P.n, 7); assert.equal(P.withId, 5); assert.equal(P.dupIds, 2); assert.equal(P.dupNames, 1); assert.equal(P.sameIdTwoNames, 1); assert.equal(P.badIds.short, 1); assert.equal(P.badIds.none, 1);
  assert.deepEqual(P.names.sort(), ['Dana D.', 'Huda F.', 'Lina A.', 'Omar B.', 'Reem E.', 'Sara C.']);
});

ok('hidden sheets are listed but do not decide', async () => {
  const v = await rec('Final_result_for_Aug.xlsx', await xlsx([{ name: 'Sheet1', rows: FINAL }, { name: 'Roster', rows: ROSTER, hidden: true }]));
  assert.equal(v.kind, 'finalResult');
  assert.deepEqual(v.sheets.map(s => [s.sheet, s.hidden]), [['Sheet1', false], ['Roster', true]]);
});

ok('a choice the user taught wins for a file with the same columns, and only the shape of the columns is kept', async () => {
  const bytes = enc(BOOK1), v0 = await rec('Book1.csv', bytes);
  assert.equal(v0.kind, 'unknown'); assert.match(v0.fp, /^r[0-9a-z]+$/);
  const learned = { [v0.fp]: { kind: 'distribution', at: '2026-10-14T08:00:00Z', n: 1 } };
  const v1 = await rec('Book1 (2).csv', bytes, { learned });
  assert.equal(v1.kind, 'distribution'); assert.equal(v1.learned, true); assert.equal(v1.reasons[0], 'You chose this for a file with the same columns on 14 Oct');
  const other = await rec('ids.csv', enc(csv(IDS)), { learned });
  assert.equal(other.kind, 'ids', 'another layout is not touched');
  const t = await rec('IDs (copy).xlsx', await xlsx([{ name: 'Sheet1', rows: IDS.slice(0, 5) }]));
  assert.equal(t.fp, (await rec('IDs.xlsx', await xlsx([{ name: 'Sheet1', rows: IDS }]))).fp, 'the same columns, other people: the same fingerprint');
  assert.deepEqual(t.toks.filter(x => !/^[a-z]+$/i.test(x)), [], 'tokens are words of the vocabulary, never values');
});

ok('files without sheets: an Outlook message, an image, a backup', () => {
  const m = Recog.verdictOf('Teams Distribution.msg', 'distributionMsg');
  assert.equal(m.kind, 'distributionMsg'); assert.equal(m.route, 'distribution');
  assert.equal(Recog.verdictOf('logo.png', 'logo').route, 'logo');
  assert.equal(Recog.verdictOf('x', 'nothing-like-it').kind, 'unknown');
});

ok('headers: one cell can mean several things, a slip of one letter is allowed, Arabic is read', () => {
  assert.deepEqual(Recog.tokensOf('Agent Name').sort(), ['agentName', 'name']);
  assert.ok(Recog.tokensOf('Natinal ID').includes('id'), 'one letter missing');
  assert.ok(Recog.tokensOf('Earned SR ').includes('earned'));
  assert.ok(Recog.tokensOf('رقم الهوية').includes('id')); assert.ok(Recog.tokensOf('الاسم').includes('name')); assert.ok(Recog.tokensOf('النتيجة النهائية').includes('fin'));
  assert.deepEqual(Recog.tokensOf(new Date()), []); assert.deepEqual(Recog.tokensOf(42), []);
});

ok('a big export stays quick: 60,000 status rows in under 3 seconds', async () => {
  const rows = [['Agent Name', 'Start Time', 'End Time', 'Primary Status', 'Duration', 'Interval Start']];
  for (let i = 0; i < 60000; i++) rows.push([G[i % 12], dt(1 + (i % 28), 9, i % 60), '', 'On Queue', '00:10:00', dt(1, 0, 0)]);
  const t0 = Date.now(), v = await rec('timeline big.csv', enc(csv(rows)));
  assert.equal(v.kind, 'timeline'); assert.equal(v.people.n, 12);
  assert.ok(Date.now() - t0 < 3000, `${Date.now() - t0} ms`);
});

(async () => {
  for (const [name, fn] of tests) { await fn(); n++; console.log('ok', name); }
  console.log(`${n} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
