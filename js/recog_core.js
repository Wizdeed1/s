/* Recognise a file on this computer: what it is, which month it holds, who is in it and where it goes, worked out from its sheet
   names, its columns (English and Arabic, spelling slips allowed), its title rows, its dates and a look at its first values.
   Pure (no page, no network): it runs in the parse worker and in Node. It reads nothing beyond what the verdict needs. */
'use strict';
const Recog = ((C) => {
const { normSpace, normName, cleanId, MON } = C;
const MON_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------------------------------------------------------------- the kinds: what each is called, and where it can go
// group: how the summaries count it; old: the old Excel of a month (parallel run); monthly: a month is shown for it.
const KINDS = {
  adhGenesys: { label: 'the Genesys Monthly Adherence export', short: 'Genesys export', group: 'genesys', monthly: true, route: 'import', routes: ['import', 'history'] },
  aht: { label: 'the Genesys Agent Performance Summary (AHT)', short: 'Genesys export', group: 'genesys', monthly: true, route: 'import', routes: ['import', 'history'] },
  perf: { label: 'the Genesys Agent Performance export (every column)', short: 'Genesys export', group: 'genesys', monthly: true, route: 'import', routes: ['import', 'history'] },
  schedule: { label: 'the Genesys Schedule export', short: 'Genesys export', group: 'genesys', monthly: true, route: 'import', routes: ['import', 'history'] },
  timeline: { label: 'the Genesys Agent Status Timeline export', short: 'Genesys export', group: 'genesys', monthly: true, route: 'import', routes: ['import', 'history'] },
  attendance: { label: 'a supervisor\'s attendance sheet', short: 'attendance sheet', group: 'attendance', monthly: true, route: 'attendance', routes: ['attendance'] },
  ids: { label: 'the HR IDs file', short: 'IDs file', group: 'ids', route: 'ids', routes: ['ids', 'roster'] },
  roster: { label: 'a roster', short: 'roster', group: 'roster', route: 'roster', routes: ['roster'] },
  kpiFile: { label: 'the KPI file', short: 'KPI file', group: 'kpi', monthly: true, route: 'kpi', routes: ['kpi'] },
  evalBook: { label: 'the quality team\'s Final EVAL', short: 'Final EVAL', group: 'eval', monthly: true, route: 'quality', routes: ['quality'] },
  finalResult: { label: 'the old final result of a month', short: 'old Excel file', group: 'old', old: true, monthly: true, route: 'compare', routes: ['compare'] },
  incentiveData: { label: 'the incentive data workbook (MC_all_team_incentive_data)', short: 'incentive data workbook', group: 'old', old: true, monthly: true, route: 'history', routes: ['history', 'compare', 'email'] },
  oldDeductionBook: { label: 'the old Monthly Deduction workbook', short: 'old Excel file', group: 'old', old: true, monthly: true, route: 'compare', routes: ['compare', 'attendance'] },
  toolReport: { label: 'a monthly report made by this tool', short: 'monthly report', group: 'report', monthly: true, route: 'email', routes: ['email', 'compare'] },
  adhGrid: { label: 'an old adherence sheet (Adherence -In Detail)', short: 'old Excel file', group: 'old', old: true, monthly: true, route: 'compare', routes: ['compare'] },
  oldSummary: { label: 'an old adherence or AHT summary', short: 'old Excel file', group: 'old', old: true, monthly: true, route: 'compare', routes: ['compare'] },
  distribution: { label: 'the Teams Distribution (who leads whom)', short: 'Teams Distribution', group: 'dist', route: 'distribution', routes: ['distribution'] },
  distributionMsg: { label: 'the Teams Distribution email', short: 'Teams Distribution', group: 'dist', route: 'distribution', routes: ['distribution'] },
  inter: { label: 'the Genesys interactions export', short: 'interactions export', group: 'inter', monthly: true, route: 'inter', routes: ['inter'] },
  dailyCalls: { label: 'a daily calls export (Report builder)', short: 'daily export', group: 'rb', route: 'rb', routes: ['rb'] },
  dailySm: { label: 'a daily social media and email export (Report builder)', short: 'daily export', group: 'rb', route: 'rb', routes: ['rb'] },
  dailyQueue: { label: 'a daily queue export (Report builder)', short: 'daily export', group: 'rb', route: 'rb', routes: ['rb'] },
  tickets: { label: 'a tickets export (Report builder)', short: 'daily export', group: 'rb', route: 'rb', routes: ['rb'] },
  wfmDaily: { label: 'a day\'s export for the WFM Daily Review (Report builder)', short: 'daily export', group: 'rb', route: 'rb', routes: ['rb'] },
  scorecard: { label: 'the KPI scorecards (kpi.xlsx)', short: 'scorecards', group: 'other', route: 'scorecards', routes: ['scorecards'] },
  logo: { label: 'an image (a logo?)', short: 'image', group: 'other', route: 'logo', routes: ['logo'] },
  rbHistory: { label: 'a Report builder history backup', short: 'backup', group: 'rb', route: 'rbHistory', routes: ['rbHistory'] },
  unknown: { label: 'something the tool does not read', short: 'not recognised', group: 'unknown', route: 'none', routes: [] },
};
const GENESYS = ['adhGenesys', 'aht', 'perf', 'schedule', 'timeline'];
// the kinds a workbook's own sheets are read as: they never count as a close second to the workbook
const PARTS = {
  incentiveData: ['attendance', 'adhGrid', 'oldSummary', 'ids', 'roster', 'finalResult', 'kpiFile', 'oldDeduction'],
  oldDeductionBook: ['attendance', 'oldDeduction', 'adhGrid', 'ids', 'roster'],
  toolReport: Object.keys(KINDS).concat(['oldDeduction']),
  evalBook: ['kpiFile', 'ids', 'roster'],
  perf: ['aht'],   // a voice-only Agent Performance of one month gives the AHT too
};

// ---------------------------------------------------------------- reading a header: one cell can mean several things
const hnorm = v => normSpace(v).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6F0)).replace(/^[#*•\s]+|[\s:*•]+$/g, '');
/** [token, patterns]: a string is the whole header (a slip of one letter allowed from 6 letters), a RegExp is tested on it */
const VOCAB = [
  ['name', ['name', 'names', 'agent name', 'agent', 'employee name', 'employee', 'full name', 'staff name', 'member care champions', 'member care champion', 'champion', 'champions', 'الاسم', 'اسم الموظف', 'الموظف', 'الاسم الكامل', 'اسم الوكيل']],
  ['agentName', ['agent name']],
  ['id', ['id', 'national id', 'nid', 'iqama', 'iqama no', 'iqama number', 'id number', 'id no', 'employee id', 'emp id', 'staff id', 'national id / iqama', 'national id/iqama', 'رقم الهويه', 'الهويه', 'الهويه الوطنيه', 'رقم الاقامه', 'الاقامه', 'السجل المدني', 'رقم السجل المدني']],
  ['team', ['team', 'teams', 'brand', 'الفريق', 'العلامه التجاريه', 'الماركه']],
  ['dep', ['dep', 'dept', 'department', 'القسم', 'الاداره']],
  ['status', ['status', 'employee status', 'الحاله']],
  ['sys', ['system name', 'genesys name', 'genesys']],
  ['email', ['email', 'e-mail', 'work email', 'email address', 'البريد الالكتروني']],
  ['spv', ['supervisor', 'team lead', 'team leader', 'leader', 'spv', 'direct manager', 'direct leader', 'lead', 'المشرف', 'قائد الفريق']],
  ['tardy', ['tardy', 'tardiness', 'tardy (min)', 'tardy minutes', 'التاخير']],
  ['fin', ['final %', 'final percentage', 'final score', 'final result', 'kpi %', 'final', 'final % (kpi)', 'النتيجه النهائيه']],
  ['earned', ['earned sr', 'earned', 'earned (sr)', 'earned incentive', 'incentive', 'incentive sr', 'incentive amount', 'payout', 'الحافز', 'المستحق', 'المبلغ المستحق']],
  ['adh', ['adherence', 'adherence (%)', 'adherence %', 'avr.', 'avr', 'adherence avr', 'adherence average', 'avg adherence', 'الالتزام', 'نسبه الالتزام']],
  ['aht', ['aht', 'aht (sec)', 'average handling time', 'متوسط مده المكالمه']],
  ['avgHandle', ['avg handle', 'avg. handle', 'average handle time']],
  ['answered', ['answered']], ['handle', ['handle']], ['mediaType', ['media type']], ['intervalStart', ['interval start']], ['intervalEnd', ['interval end']],
  ['activityCode', ['activity code name', 'activity code']], ['lengthInMin', ['length in minutes', 'length in min']], ['start', ['start']], ['end', ['end']],
  ['startTime', ['start time']], ['endTime', ['end time']], ['primaryStatus', ['primary status']], ['duration', ['duration']],
  ['users', ['users', 'user']], ['date', ['date', 'التاريخ']], ['disconnectType', ['disconnect type']], ['ani', ['ani']], ['queue', ['queue', 'queue name']],
  ['callqa', [/call qa/]], ['ticketqa', [/ticket qa|empowerment/]], ['cr', ['cr', /call reason|fcr/]], ['evalScore', [/^evaluation score/]], ['evalFinal', [/^final score/]],
  ['crit', [/^critical error/]], ['obs', [/no of observation/]],
  ['sched', ['sched.', 'sched', 'scheduled']], ['actual', ['actual']], ['diff', ['diff (min)', 'diff', 'difference']], ['conformance', ['conformance']],
  ['serviceLevel', ['service level %', 'service level']], ['abandon', ['abandon %', 'abandon']], ['asa', ['asa']], ['offer', ['offer', 'offered']], ['totalQueue', ['total queue']],
  ['category', ['category', 'category.keyword', 'category::subcategory']], ['subCategory', ['sub category', 'subcategory', 'sub category.keyword', 'sub-category']], ['assignedTo', ['assigned to', 'assigned group']],
  ['mgmtUnit', ['management unit', 'business unit']],
  ['kpi', ['kpi', 'kpis', 'kpi name', 'المؤشر']], ['weight', ['weight', 'weights', 'weight %', 'الوزن']], ['target', ['target', 'المستهدف']], ['rank', [/^rank(ing)? ?[1-5]$/]],
  ['absent', ['absent', 'absent days', 'absence', 'absences']], ['actualDays', ['actual days', 'days attended']],
];
const EXACT = new Map(), FUZZY = [], RES = [];
for (const [tok, pats] of VOCAB) for (const p of pats) {
  if (p instanceof RegExp) { RES.push([tok, p]); continue; }
  const k = hnorm(p); if (!EXACT.has(k)) EXACT.set(k, []); EXACT.get(k).push(tok);
  if (k.length >= 6) FUZZY.push([tok, k]);
}
function lev1(a, b) {   // is the distance at most 1?
  if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
  let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
const tokCache = new Map();
/** the canonical tokens of one header cell */
function tokensOf(cell) {
  if (cell == null || cell instanceof Date || typeof cell === 'number' || typeof cell === 'boolean') return [];
  const h = hnorm(cell); if (!h || h.length > 80) return [];
  if (tokCache.has(h)) return tokCache.get(h);
  const out = new Set(EXACT.get(h) || []);
  for (const [tok, re] of RES) if (re.test(h)) out.add(tok);
  if (!out.size && h.length >= 6) for (const [tok, k] of FUZZY) if (lev1(h, k)) out.add(tok);
  const L = [...out]; if (tokCache.size < 5000) tokCache.set(h, L); return L;
}
/** the KPI file's column names, written the way Kpi.key writes them */
const kkey = s => normName(String(s ?? '').replace(/&/g, ' ').replace(/[^\p{L}\p{N}%]+/gu, ' '));

// ---------------------------------------------------------------- months: in a title, in a file name, in the date headers
const MW = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';
const AR_MON = ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو', 'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر'];
const monIdx = w => { const s = w.toLowerCase().slice(0, 3); return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(s) + 1; };
const RE_MY = new RegExp(`(?:^|[^a-z])${MW}\\.?[\\s\\-–—_,/']*(20\\d\\d)(?!\\d)`), RE_YM = new RegExp(`(?:^|[^\\d])(20\\d\\d)[\\s\\-–—_,/.]*${MW}(?=[^a-z]|$)`);
const RE_M = new RegExp(`(?:^|[^a-z])${MW}(?=[^a-z]|$)`), RE_NUM = /(?:^|[^\d])(20\d\d)[-_ .]?(0[1-9]|1[0-2])(?!\d)/;
const RE_ARM = new RegExp(`(${AR_MON.join('|')})\\s*[-–_,/]?\\s*(20\\d\\d)`);
/** the latest month m that is not after today (a month named without a year) */
function latestMonth(m, today) { const t = today || new Date(), y = t.getFullYear(), cm = t.getMonth() + 1; return { y: m <= cm ? y : y - 1, m }; }
/** a month in a title or a line of text, with its year: {y, m} or null */
function monthInText(s) {
  const t = hnorm(s); if (!t) return null; let x;
  if ((x = t.match(RE_MY))) return { y: +x[2], m: monIdx(x[1]) };
  if ((x = t.match(RE_YM))) return { y: +x[1], m: monIdx(x[2]) };
  if ((x = t.match(RE_ARM))) return { y: +x[2], m: AR_MON.indexOf(x[1]) + 1 };
  return null;
}
/** the month a file name gives: 2026-08, Aug 2026, 2026 Aug, or Aug alone (the latest Aug not after today) -> {y, m, raw, noYear} or null */
function monthOfName(name, today) {
  const s = String(name || '').toLowerCase().replace(/\.[a-z0-9]{2,4}$/, ''); let x;
  if ((x = s.match(RE_NUM))) return { y: +x[1], m: +x[2], raw: `${x[1]}-${x[2]}` };
  if ((x = s.match(RE_MY))) return { y: +x[2], m: monIdx(x[1]), raw: x[0].replace(/^[^a-z]/, '') };
  if ((x = s.match(RE_YM))) return { y: +x[1], m: monIdx(x[2]), raw: x[0].replace(/^[^\d]/, '') };
  const ar = hnorm(name); if ((x = ar.match(RE_ARM))) return { y: +x[2], m: AR_MON.indexOf(x[1]) + 1, raw: x[0] };
  if ((x = s.match(RE_M))) { const L = latestMonth(monIdx(x[1]), today); return { ...L, raw: x[1], noYear: true }; }
  const a = AR_MON.findIndex(w => ar.includes(w)); if (a >= 0) return { ...latestMonth(a + 1, today), raw: AR_MON[a], noYear: true };
  return null;
}
const ymKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const ymText = (y, m) => `${MON[m - 1]} ${y}`;

// ---------------------------------------------------------------- the look at one sheet (bounded: 25 rows for the header, 80 for the values, 20,000 for the names)
const CODE_RE = /^(attend|attended|attendance|present|p|work|working|off|day off|dayoff|off day|rest|rest day|weekend|w\/o|wo|al|a\/l|al leave|al leaves|annual|annual leave|sl|s\/l|sl leave|sl leaves|sick|sick leave|absent|absence|abs|no show|ns|national day|national day off|founding day|eid|eid leave|eid holiday|unpaid|unpaid leave|ml|maternity|paternity|exam|marriage|compassionate|حضور|غياب|غائب|اجازه|اجازه سنويه|اجازه مرضيه|راحه)$/;
const GDAY = /^\s*(?:[a-z]{3}\s*\|\s*)?\d{1,2}\s*\|\s*%?\s*pct/i;
const SUBW = /^(sched\.?|actual|diff \(min\)|diff|conformance)$/;
const isBlankRow = r => !r || !r.some(v => v != null && !(typeof v === 'string' && !normSpace(v)));
function dateOf(v) {
  if (v instanceof Date) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
  if (typeof v === 'number') return v > 20000 && v < 80000 ? C.parseHeaderDate(v) : null;
  if (typeof v !== 'string' || v.length > 30) return null;
  const p = C.parseHeaderDate(v); return p && p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= 31 ? p : null;
}
function headerInfo(row) {
  const cells = Array.from(row || [], v => v), toks = new Set(), tokCols = new Map(); let dates = 0, gday = 0;
  cells.forEach((v, c) => {
    for (const t of tokensOf(v)) { toks.add(t); if (!tokCols.has(t)) tokCols.set(t, c); }
    if (dateOf(v)) dates++; else if (typeof v === 'string' && GDAY.test(v)) gday++;
  });
  return { cells, toks, tokCols, dates, gday, score: toks.size + Math.min(dates, 7) * 0.5 + Math.min(gday, 7) };
}
/** what one sheet shows: its header, the tokens in it, its dates, title months, a census of its first values */
function features(t) {
  const rows = t.rows || [], N = Math.min(rows.length, 25);
  let best = null;
  for (let i = 0; i < N; i++) { if (isBlankRow(rows[i])) continue; const H = headerInfo(rows[i]); if (!best || H.score > best.score) best = { ...H, i }; }
  const F = { sheet: t.name, hidden: !!t.state && t.state !== 'visible', nrows: rows.length, head: best ? best.i : -1, toks: best ? best.toks : new Set(), tokCols: best ? best.tokCols : new Map(), hdr: best ? best.cells : [],
    dates: [], dateN: 0, gday: best ? best.gday : 0, sub: false, titles: [], titleText: '', census: null };
  if (!best) return F;
  // the date headers (dd/mm against mm/dd decided once for the row, as the reader does)
  const parsed = F.hdr.map(v => (v instanceof Date || typeof v === 'number' || typeof v === 'string' ? dateOf(v) : null)), swap = parsed.some(p => p && p.alt && p.m > 12);
  parsed.forEach((p, c) => { if (!p) return; const q = swap && p.alt ? p.alt : p; if (q.m >= 1 && q.m <= 12 && q.d >= 1 && q.d <= 31) F.dates.push({ c, y: q.y || 0, m: q.m, d: q.d }); });
  F.dateN = F.dates.length;
  // a sub-row under the header: Sched. / Actual / Diff (min) (the old Monthly Deduction)
  const nx = rows[F.head + 1] || [], subs = new Set(); Array.from(nx, v => hnorm(v)).forEach(v => { if (SUBW.test(v)) subs.add(v.replace(/\.| \(min\)/g, '')); });
  F.sub = subs.size >= 2;
  // title rows above the header (and long text in the header row itself)
  for (let i = 0; i < F.head; i++) for (const v of rows[i] || []) if (typeof v === 'string' && normSpace(v).length >= 6) { const m = monthInText(v); F.titles.push({ text: normSpace(v), m }); }
  F.titleText = F.titles.map(x => x.text.toLowerCase()).join(' | ');
  // the first values: day codes, percentages, times
  const cen = { codes: 0, pct: 0, time: 0, gdt: 0, int: 0, text: 0, na: 0, err: 0, cells: 0, rows: 0 };
  const cols = F.dateN >= 7 ? F.dates.map(d => d.c) : null, skip = new Set([F.tokCols.get('name'), F.tokCols.get('id')].filter(c => c != null));
  for (let i = F.head + 1 + (F.sub ? 1 : 0), seen = 0; i < rows.length && seen < 80; i++) {
    const r = rows[i]; if (isBlankRow(r)) continue; seen++; cen.rows++;
    const L = cols || Array.from(r, (_, c) => c).filter(c => !skip.has(c));
    for (const c of L) {
      const v = r[c]; if (v == null || v === '') continue; cen.cells++;
      if (typeof v === 'number') { if (v > 0 && v <= 1.0001 && !Number.isInteger(v)) cen.pct++; else cen.int++; continue; }
      if (v instanceof Date) { cen.gdt++; continue; }
      const s = hnorm(v); if (!s) continue;
      if (CODE_RE.test(s)) cen.codes++;
      else if (/^-?\d+(\.\d+)?\s*%$/.test(s)) cen.pct++;
      else if (/^n\/?a$/.test(s)) cen.na++;
      else if (/^#(n\/a|err|value!?|ref!?|div\/0!?)$/i.test(s)) cen.err++;
      else if (/^\d{1,3}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) cen.time++;
      else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2}.*)?$/.test(s) || /^\d{4}-\d{2}-\d{2}t/.test(s)) cen.gdt++;
      else if (/^-?\d+(\.\d+)?$/.test(s)) { const n = +s; if (n > 0 && n <= 1.0001 && !Number.isInteger(n)) cen.pct++; else cen.int++; }
      else cen.text++;
    }
  }
  F.census = cen;
  return F;
}
const has = (F, ...t) => t.every(x => F.toks.has(x));
const any = (F, ...t) => t.some(x => F.toks.has(x));

// ---------------------------------------------------------------- the people in a sheet
const MARK = /^[⛔⚠]️?\s*/;
function peopleOf(t, F, segments) {
  const rows = t.rows || [], ni = F.tokCols.get('agentName') ?? F.tokCols.get('name'), ii = F.tokCols.get('id');
  if (ni == null && ii == null) return null;
  const out = { n: 0, rows: 0, withId: 0, nid10: 0, badIds: { na: 0, naErr: 0, short: 0, nbsp: 0, none: 0 }, dupIds: 0, dupNames: 0, sameIdTwoNames: 0, sheet: t.name, names: [], ids: [] };
  const byId = new Map(), byName = new Map(), names = new Map();
  for (let i = F.head + 1 + (F.sub ? 1 : 0), k = 0; i < rows.length && k < 20000; i++, k++) {
    const r = rows[i]; if (!r) continue;
    const nm = ni != null ? normSpace(String(r[ni] ?? '').replace(MARK, '')) : '', raw = ii != null ? r[ii] : null;
    const rawS = raw == null ? '' : typeof raw === 'number' ? String(Math.round(raw)) : String(raw);
    if (!nm && !normSpace(rawS)) continue;
    if (/^(total|grand total|sum|average|all|totals)$/i.test(nm)) continue;
    if (nm && (nm.length > 80 || dateOf(r[ni]))) continue;
    out.rows++;
    const nk = normName(nm); if (nk) { byName.set(nk, (byName.get(nk) || 0) + 1); if (!names.has(nk) && names.size < 3000) names.set(nk, nm); }
    if (ii != null) {
      const digits = rawS.replace(/\D/g, ''), s = normSpace(rawS);
      if (!s) out.badIds.none++;
      else if (/^#/.test(s)) out.badIds.naErr++;
      else if (/^n\/?a$/i.test(s)) out.badIds.na++;
      else if (digits.length >= 8) {
        out.withId++; if (digits.length === 10) out.nid10++;
        if (typeof raw === 'string' && (/[ ​]/.test(raw) || raw !== raw.trim())) out.badIds.nbsp++;
        const L = byId.get(digits) || new Set(); L.add(nk); byId.set(digits, L);
      } else if (digits.length) out.badIds.short++;
      else out.badIds.na++;
    }
  }
  out.n = segments ? names.size : out.rows;
  let dupI = 0, two = 0; const cnt = new Map();
  for (let i = F.head + 1, k = 0; ii != null && i < rows.length && k < 20000; i++, k++) { const r = rows[i]; if (!r) continue; const v = r[ii], d = (typeof v === 'number' ? String(Math.round(v)) : String(v ?? '')).replace(/\D/g, ''); if (d.length >= 8) cnt.set(d, (cnt.get(d) || 0) + 1); }
  for (const [d, c] of cnt) { if (c > 1) dupI++; if ((byId.get(d) || new Set()).size > 1) two++; }
  out.dupIds = segments ? 0 : dupI; out.sameIdTwoNames = two;
  out.dupNames = segments ? 0 : [...byName.values()].filter(c => c > 1).length;
  out.names = [...names.values()];
  out.ids = [...byId.keys()].slice(0, 3000);
  return out;
}

// ---------------------------------------------------------------- what one sheet looks like: [{kind, score, reasons}]
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);   // the first letter only
function sheetCands(F, opts, dl) {
  const out = [], add = (kind, score, reasons) => out.push({ kind, score: Math.min(0.99, score), reasons, sheet: F.sheet });
  const cen = F.census || { codes: 0, pct: 0, text: 0, cells: 0 };
  const idOrName = any(F, 'id', 'name'), meas = any(F, 'fin', 'earned', 'adh', 'aht', 'avgHandle', 'absent', 'tardy', 'actualDays');
  // the Genesys exports and the attendance grid: what the engine's own readers found (they stay the source of truth)
  const dk = new Set((dl || []).map(d => d.kind));
  if (dl && dl.some(d => GENESYS.includes(d.kind) || (d.kind === 'attendance' && d.data) || d.kind === 'adhGrid')) {
    for (const det of dl) {
      if (det.kind === 'adhGenesys') add('adhGenesys', 0.97, ['Agent Name and one column per day ("01 | %PCT - Adherence")']);
      else if (det.kind === 'aht') add('aht', det.data && det.data.fromPerf ? 0.95 : 0.97, [det.data && det.data.fromPerf ? 'A voice-only Agent Performance for one month: it gives the AHT too' : 'Agent Name with Avg Handle']);
      else if (det.kind === 'perf') add('perf', 0.97, ['Agent Name with Answered, Handle and the other performance columns']);
      else if (det.kind === 'schedule') add('schedule', 0.97, ['Agent Name, Activity Code Name and Length In Minutes: one row per activity']);
      else if (det.kind === 'timeline') add('timeline', 0.97, ['Agent Name, Primary Status and Duration: one row per status change']);
      else if (det.kind === 'attendance' && det.data) add('attendance', 0.94, [`${F.dateN} day columns with dates, filled with day codes (Attend, OFF, AL…)`]);
      else if (det.kind === 'adhGrid') add('adhGrid', 0.84, [`${F.dateN} day columns with dates, filled with percentages`]);
    }
  } else if (!dk.has('ignored')) {
    if (has(F, 'agentName') && F.gday >= 5) add('adhGenesys', 0.93, ['Agent Name and one column per day ("01 | %PCT - Adherence")']);
    if (has(F, 'agentName', 'activityCode', 'lengthInMin')) add('schedule', 0.93, ['Agent Name, Activity Code Name and Length In Minutes']);
    if (has(F, 'agentName', 'primaryStatus', 'duration')) add('timeline', 0.93, ['Agent Name, Primary Status and Duration']);
    if (has(F, 'agentName', 'answered', 'handle')) add('perf', 0.92, ['Agent Name with Answered and Handle']);
    else if (has(F, 'agentName') && any(F, 'avgHandle', 'aht')) add('aht', 0.92, ['Agent Name with Avg Handle']);
    if (F.dateN >= 7 && idOrName && !F.sub && cen.codes + cen.text * 0.5 > cen.pct) add('attendance', 0.9, [`${F.dateN} day columns with dates, filled with day codes (Attend, OFF, AL…)`]);
    else if (F.dateN >= 7 && idOrName && !F.sub && cen.pct >= cen.codes) add('adhGrid', 0.8, [`${F.dateN} day columns with dates, filled with percentages`]);
  }
  if (F.dateN >= 7 && F.sub) add('oldDeduction', 0.9, ['A date every third column with Sched., Actual and Diff (min) under it']);
  // the old final result: ID / Name with Final % or Earned, no dates
  const hdrS = F.hdr.map(v => normSpace(v));
  const evalLike = hdrS.some(v => /^agent name$/i.test(v)) && hdrS.some(v => /call qa|final score|evaluation score|ticket qa/i.test(v));   // the EVAL reader's own test
  if (idOrName && any(F, 'fin', 'earned') && F.dateN < 7 && !evalLike && !has(F, 'kpi', 'weight')) {
    const both = has(F, 'fin', 'earned'), heads = [F.toks.has('fin') && 'Final %', F.toks.has('earned') && 'Earned SR'].filter(Boolean).join(' and ');
    add('finalResult', both ? 0.92 : 0.84, [`${heads} next to ${[F.toks.has('id') && 'ID', F.toks.has('name') && 'Name'].filter(Boolean).join(' and ')}`]);
  }
  // an old adherence or AHT summary (one value per person, no Genesys columns)
  if (idOrName && !has(F, 'agentName') && F.dateN < 7 && (F.toks.has('adh') || F.toks.has('aht')) && !any(F, 'fin', 'earned', 'callqa'))
    add('oldSummary', 0.6, [`${F.toks.has('adh') ? 'An Adherence' : 'An AHT'} column next to ${F.toks.has('id') ? 'ID and ' : ''}Name`]);
  // the quality team's Final EVAL (the same tests as the EVAL reader)
  if (evalLike) add('evalBook', 0.95, ['"Agent Name" with Call QA, Ticket QA, CR or Final Score']);
  else if (/leader/i.test(F.sheet) || F.titleText.includes('no of observation') || F.toks.has('obs')) { if (F.toks.has('obs') || /leader/i.test(F.sheet) && any(F, 'name')) add('evalBook', 0.78, ['A Leaders sheet with the No of Observation scores']); }
  // the KPI file (the same test as the KPI file reader): ID or Name with a KPI column of the scorecards
  const known = new Set((opts.kpiNames || []).map(kkey)), kcols = hdrS.filter(v => known.has(kkey(v)));
  if (kcols.length && F.hdr.some(v => /^(id|national id|name|agent name|employee name)$/i.test(normSpace(v))) && !evalLike)
    add('kpiFile', Math.min(0.95, 0.72 + 0.1 * new Set(kcols).size), [`${F.toks.has('id') ? 'ID' : 'Name'} with KPI columns: ${[...new Set(kcols)].slice(0, 4).join(', ')}`]);
  // a roster or the HR IDs file
  if (F.toks.has('name') && F.toks.has('id')) {
    if (any(F, 'status', 'sys')) add('roster', (/^roster$/i.test(normSpace(F.sheet)) ? 0.96 : 0.88) + (any(F, 'email', 'spv') ? 0.03 : 0), [`Name and National ID with ${[F.toks.has('status') && 'Status', F.toks.has('sys') && 'System name', F.toks.has('email') && 'Email', F.toks.has('spv') && 'Supervisor'].filter(Boolean).join(', ')}`]);
    else if (/^roster$/i.test(normSpace(F.sheet))) add('roster', 0.9, ['A sheet called Roster with Name and National ID']);
    else if (!meas && F.dateN < 7 && !evalLike && !kcols.length && !any(F, 'kpi', 'callqa')) {
      const grp = any(F, 'team', 'dep');
      add('ids', grp ? 0.9 : 0.8, [`${[F.toks.has('id') && 'National ID', 'Name', F.toks.has('team') && 'Team', F.toks.has('dep') && 'Dep'].filter(Boolean).join(', ')}, nothing else`]);
    }
  }
  // the Teams Distribution: names with their team lead
  if (F.toks.has('name') && !F.toks.has('id') && F.toks.has('spv') && !meas && F.dateN < 7) add('distribution', 0.82, ['Name next to a team lead, no IDs']);
  // the interactions export (the same test as the interactions reader)
  if (has(F, 'users', 'duration', 'date') && any(F, 'disconnectType', 'ani', 'mediaType')) add('inter', 0.95, ['Users, Date, Duration and Disconnect Type: one row per interaction']);
  // the daily exports of the Report builder (its own classifier has the last word on the page)
  if (F.toks.has('totalQueue')) add('dailyQueue', 0.88, ['A Total Queue column: the queue times export']);
  if (has(F, 'serviceLevel', 'avgHandle')) add('dailyCalls', 0.88, ['Service Level % with Avg Handle: the calls export']);
  if (has(F, 'asa', 'offer')) add('dailySm', 0.86, ['ASA with Offer: the social media and email export']);
  if (F.toks.has('category') && any(F, 'subCategory', 'assignedTo')) add('tickets', 0.74, ['Category with Sub Category: a tickets export']);
  if (F.toks.has('adh') && F.toks.has('mgmtUnit') && !idOrName) add('wfmDaily', 0.7, ['Adherence by management unit: a WFM Daily Review export']);
  // kpi.xlsx: the scorecards
  if (has(F, 'kpi', 'weight')) add('scorecard', F.toks.has('rank') || F.toks.has('target') ? 0.88 : 0.8, ['KPI and Weight columns' + (F.toks.has('target') ? ' with Target' : '') + (F.toks.has('rank') ? ' and the rank bands' : '')]);
  return out;
}

// ---------------------------------------------------------------- the workbook as a whole
const sname = s => hnorm(s);
function workbookCands(V, feats, all) {
  const out = [], names = V.map(t => sname(t.name)), allNames = (all || V).map(t => sname(t.name)), hasS = re => names.some(n => re.test(n)), feat = re => feats.find(F => re.test(sname(F.sheet)));
  const incTabs = [/^attendance report$/, /^adherence ?-? ?in detail$/, /^adherence$/, /^aht$/].filter(re => hasS(re)).length;
  if (incTabs >= 3 || (hasS(/^attendance report$/) && hasS(/^aht$/))) out.push({ kind: 'incentiveData', score: 0.98, reasons: [`The tabs of the incentive data workbook: ${V.map(t => normSpace(t.name)).filter(n => /^(attendance report|adherence ?-?in detail|adherence|aht)$/i.test(n)).join(', ')}`], sheet: '' });
  const md = feat(/monthly deduction|^deduction$/);
  if (md && md.sub && md.dateN >= 7) out.push({ kind: 'oldDeductionBook', score: hasS(/^attendance report$/) ? 0.97 : 0.93, reasons: [`A ${normSpace(md.sheet)} tab (Sched., Actual and Diff for each day)${hasS(/^attendance report$/) ? ' and an Attendance Report tab' : ''}`], sheet: '' });
  if (['deduction', 'attendance', 'calc', 'roster'].every(n => allNames.includes(n))) out.push({ kind: 'toolReport', score: 0.99, reasons: ['The Deduction, Attendance, Calc and Roster sheets this tool writes'], sheet: '' });
  const evals = feats.filter(F => F.cands.some(c => c.kind === 'evalBook' && c.score >= 0.9));
  if (evals.length >= 2 || (evals.length && hasS(/virgin|friendi|leader|fpay/))) out.push({ kind: 'evalBook', score: 0.97, reasons: [`"Agent Name" with Call QA or Final Score on ${evals.length > 1 ? `the ${evals.map(F => normSpace(F.sheet)).join(', ')} tabs` : `the ${normSpace(evals[0].sheet)} tab`}`], sheet: '' });
  return out;
}

// ---------------------------------------------------------------- the fingerprint: the columns' shape, never a value
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
const SHEET_WORDS = ['attendance report', 'attendance', 'adherence', 'aht', 'roster', 'deduction', 'calc', 'leaders', 'virgin', 'friendi', 'fpay', 'sm', 'ct', 'kpi', 'eval', 'sheet'];
function fingerprint(feats) {
  const toks = [...new Set(feats.flatMap(F => [...F.toks]))].sort();
  const sw = [...new Set(feats.flatMap(F => SHEET_WORDS.filter(w => sname(F.sheet).includes(w))))].sort();
  const raw = feats.map(F => F.hdr.filter(v => typeof v === 'string' && normSpace(v) && !dateOf(v) && !GDAY.test(v)).map(hnorm).join('|') + `#${F.dateN >= 7 ? 'd' : ''}${F.sub ? 's' : ''}`).join('//');
  return { fp: 'r' + fnv(toks.join(',') + '#' + sw.join(',') + '#' + raw), toks };
}

// ---------------------------------------------------------------- the month: from the dates and titles inside, then the file name
function monthOf(name, V, feats, dets, opts) {
  const votes = [], today = opts.today || new Date();
  for (const F of feats) {
    if (F.dateN >= 7) { const by = new Map(); F.dates.forEach(d => { if (d.y) { const k = ymKey(d.y, d.m); by.set(k, (by.get(k) || 0) + 1); } }); const top = [...by].sort((a, b) => b[1] - a[1])[0]; if (top) votes.push({ k: top[0], w: 3, src: 'dates', sheet: F.sheet }); }
    for (const t of F.titles) if (t.m) votes.push({ k: ymKey(t.m.y, t.m.m), w: 2, src: 'title', sheet: F.sheet });
  }
  const months = new Map();
  for (const d of dets || []) {
    const D = d.data || {};
    if ((d.kind === 'aht' || d.kind === 'timeline') && D.month) votes.push({ k: ymKey(D.month.y, D.month.m), w: 3, src: 'export' });
    if (d.kind === 'perf' && D.months) { D.months.forEach(x => months.set(ymKey(x.y, x.m), x)); if (D.month) votes.push({ k: ymKey(D.month.y, D.month.m), w: 3, src: 'export' }); }
    if (d.kind === 'adhGenesys' && D.multi) { (D.months || []).forEach(x => months.set(ymKey(x.y, x.m), x)); if (D.month) votes.push({ k: ymKey(D.month.y, D.month.m), w: 3, src: 'export' }); }
    if (d.kind === 'schedule' && D.segs && D.segs.length) {
      const by = new Map(); for (const x of D.segs.length > 50000 ? D.segs.filter((_, i) => i % 7 === 0) : D.segs) { const t = new Date(x.s), k = ymKey(t.getUTCFullYear(), t.getUTCMonth() + 1); by.set(k, (by.get(k) || 0) + 1); }
      const L = [...by].sort((a, b) => b[1] - a[1]); L.forEach(([k]) => months.set(k, { y: +k.slice(0, 4), m: +k.slice(5) }));
      if (L[0]) votes.push({ k: L[0][0], w: 3, src: 'export' });
    }
  }
  const fn = monthOfName(name, today), fileName = fn ? { y: fn.y, m: fn.m, raw: fn.raw, noYear: !!fn.noYear } : null;
  const tally = new Map(); votes.forEach(v => tally.set(v.k, (tally.get(v.k) || 0) + v.w));
  const top = [...tally].sort((a, b) => b[1] - a[1])[0], conflicts = [];
  /** "the dates and both titles": what agrees, in words, and whether it takes "say" or "says" */
  const said = L => { const d = L.some(v => v.src === 'dates'), t = L.filter(v => v.src === 'title').length, e = L.some(v => v.src === 'export'); const p = [d && 'the dates', t > 2 ? 'the titles' : t === 2 ? 'both titles' : t === 1 && 'the title', e && 'the export'].filter(Boolean); return { subj: p.join(' and '), verb: p.length > 1 || d || t > 1 ? 'say' : 'says' }; };
  let month = null;
  if (top) {
    const [y, m] = top[0].split('-').map(Number), agree = votes.filter(v => v.k === top[0]), other = votes.filter(v => v.k !== top[0]), s = said(agree);
    month = { y, m, from: [...new Set(agree.map(v => v.src))], fileName };
    if (fn && fn.m === m && (fn.y === y || fn.noYear)) month.from.push('file name');
    else if (fn) conflicts.push(`The file name says ${ymText(fn.y, fn.m)}${fn.raw && !fn.noYear ? ` (${fn.raw})` : ''}; ${s.subj} inside ${s.verb} ${ymText(y, m)}.`);
    if (other.length) { const o = other[0]; conflicts.push(`${titleCase(s.subj)} ${s.verb} ${ymText(y, m)}, but ${o.src === 'dates' ? 'the dates' : o.src === 'title' ? 'a title' : 'the export'}${o.sheet ? ` on ${normSpace(o.sheet)}` : ''} ${o.src === 'dates' ? 'say' : 'says'} ${ymText(+o.k.slice(0, 4), +o.k.slice(5))}.`); }
  } else if (fn) month = { y: fn.y, m: fn.m, from: ['file name'], noYear: !!fn.noYear, fileName };
  return { month, months: [...months.values()].map(x => ({ y: x.y, m: x.m })).sort((a, b) => a.y * 100 + a.m - (b.y * 100 + b.m)), conflicts };
}

// ---------------------------------------------------------------- the verdict
/** name: the file name; tables: [{name, rows, state}] (Core.readTables); opts: {dets, today, kpiNames, learned} */
function recognise(name, tables, opts = {}) {
  const all = tables || [], V = all.filter(t => !t.state || t.state === 'visible'), dets = opts.dets || [];
  const detBy = new Map(); for (const d of dets) if (d && d.sheet != null && d.kind !== 'error' && d.kind !== 'unknown') { if (!detBy.has(d.sheet)) detBy.set(d.sheet, []); detBy.get(d.sheet).push(d); }
  const feats = V.map(t => { const F = features(t); F.cands = sheetCands(F, opts, detBy.get(t.name) || (V.length === 1 ? dets.filter(d => d.kind !== 'error' && d.kind !== 'unknown') : null)); return F; });
  let cands = [...workbookCands(V, feats, all), ...feats.flatMap(F => F.cands)].filter(c => KINDS[c.kind] || c.kind === 'oldDeduction');
  cands = cands.map(c => (c.kind === 'oldDeduction' ? { ...c, kind: 'oldDeductionBook', score: c.score - 0.06, part: true } : c));
  // the best of each kind, highest first
  const best = new Map(); for (const c of cands.sort((a, b) => b.score - a.score)) if (!best.has(c.kind)) best.set(c.kind, c);
  let L = [...best.values()];
  const { fp, toks } = fingerprint(feats), taught = opts.learned && opts.learned[fp];
  if (taught && KINDS[taught.kind]) {
    const c = best.get(taught.kind), when = taught.at ? new Date(taught.at) : null;
    const why = `You chose this for a file with the same columns${when && !isNaN(when) ? ` on ${when.getUTCDate()} ${MON[when.getUTCMonth()]}` : ''}`;
    if (c) { c.score = Math.min(0.99, Math.max(c.score + 0.5, 0.93)); c.reasons = [why, ...c.reasons]; c.learned = true; } else L.push({ kind: taught.kind, score: 0.93, reasons: [why], sheet: '', learned: true });
  }
  L.sort((a, b) => b.score - a.score);
  let top = L[0] && L[0].score >= 0.35 ? L[0] : { kind: 'unknown', score: 0, reasons: [V.length ? 'Its columns match none of the files the tool reads' : 'No sheet with data in it'], sheet: '' };
  const parts = PARTS[top.kind] || [];
  const second = L.find(c => c !== top && c.kind !== top.kind && !parts.includes(c.kind) && !(top.kind === 'oldDeductionBook' && c.kind === 'attendance'));
  const margin = top.score - (second ? second.score : 0);
  const level = top.kind === 'unknown' ? 'unsure' : top.score >= 0.9 && margin >= 0.05 ? 'sure' : top.score >= 0.7 ? 'likely' : 'unsure';
  // the month, and the people of the sheet that holds them
  const mo = monthOf(name, V, feats, dets, opts);
  const segs = ['schedule', 'timeline', 'perf', 'inter', 'aht'].includes(top.kind);
  const peopleSheet = (() => {
    if (top.sheet) return feats.find(F => F.sheet === top.sheet);
    if (top.kind === 'incentiveData' || top.kind === 'oldDeductionBook') return feats.find(F => /^attendance report$/.test(sname(F.sheet))) || feats.find(F => F.sub);
    if (top.kind === 'toolReport') return feats.find(F => sname(F.sheet) === 'roster');
    if (top.kind === 'evalBook') return null;
    return feats.find(F => F.cands.some(c => c.kind === top.kind));
  })();
  let people = peopleSheet ? peopleOf(V.find(t => t.name === peopleSheet.sheet), peopleSheet, segs) : null;
  if (top.kind === 'evalBook') {   // every EVAL sheet's agents together
    const L2 = feats.filter(F => F.cands.some(c => c.kind === 'evalBook')).map(F => peopleOf(V.find(t => t.name === F.sheet), F, false)).filter(Boolean);
    if (L2.length) { const nm = new Map(); L2.forEach(p => p.names.forEach(n => nm.set(normName(n), n))); people = { ...L2[0], n: nm.size, rows: L2.reduce((a, p) => a + p.rows, 0), names: [...nm.values()], sheet: L2.map(p => p.sheet).join(', ') }; }
  }
  const reasons = [...top.reasons];
  if (people && people.n && ['finalResult', 'ids', 'roster', 'kpiFile', 'incentiveData', 'oldDeductionBook', 'attendance', 'distribution'].includes(top.kind))
    reasons.push(`${people.n} ${people.n === 1 ? 'person' : 'people'}${people.withId ? (people.nid10 === people.rows ? ', each with a 10-digit National ID' : `, ${people.withId} with a National ID`) : ''}`);
  if (KINDS[top.kind] && KINDS[top.kind].monthly && top.kind !== 'unknown') {
    const fsrc = mo.month && mo.month.from;
    if (!mo.month) reasons.push('No month inside it, and none in its name');
    else if (fsrc && fsrc.length === 1 && fsrc[0] === 'file name' && !feats.some(F => F.dateN >= 7)) reasons.push(`No dates inside; the name says ${mo.month.fileName && mo.month.fileName.noYear ? MON[mo.month.m - 1] : ymText(mo.month.y, mo.month.m)}`);
    else if (feats.some(F => F.titles.some(t => t.m)) && top.kind !== 'evalBook') { const t = feats.flatMap(F => F.titles).find(x => x.m); if (t && reasons.length < 4) reasons.push(`Title: "${t.text.length > 60 ? t.text.slice(0, 60) + '…' : t.text}"`); }
  }
  const K = KINDS[top.kind];
  const alts = L.filter(c => c !== top && c.kind !== top.kind && KINDS[c.kind]).slice(0, 4).map(c => ({ kind: c.kind, label: KINDS[c.kind].label, confidence: Math.round(c.score * 100) / 100, reasons: c.reasons, sheet: c.sheet || '' }));
  return {
    file: name, kind: top.kind, label: K.label, short: K.short, group: K.group, confidence: Math.round(top.score * 100) / 100, level, learned: !!top.learned,
    reasons: reasons.slice(0, 4), alts,
    sheets: all.map(t => { const F = feats.find(x => x.sheet === t.name); const c = F && F.cands.slice().sort((a, b) => b.score - a.score)[0]; return { sheet: t.name, kind: c ? (c.kind === 'oldDeduction' ? 'oldDeductionBook' : c.kind) : '', confidence: c ? Math.round(c.score * 100) / 100 : 0, headRow: F ? F.head : -1, title: F && F.titles[0] ? F.titles[0].text : '', hidden: !!t.state && t.state !== 'visible' }; }),
    fp, toks, month: mo.month, months: mo.months, conflicts: mo.conflicts, people, route: K.route, routes: K.routes.slice(),
  };
}
/** a verdict without reading sheets: an Outlook message, an image, a backup, an old .xls, a file that could not be read */
function verdictOf(name, kind, extra = {}) {
  const K = KINDS[kind] || KINDS.unknown;
  return { file: name, kind: KINDS[kind] ? kind : 'unknown', label: K.label, short: K.short, group: K.group, confidence: extra.confidence ?? 0.9, level: extra.level || 'sure', learned: false, reasons: extra.reasons || [], alts: [], sheets: [], fp: '', toks: [], month: extra.month || null, months: [], conflicts: [], people: null, route: K.route, routes: K.routes.slice(), ...(extra.error ? { error: extra.error } : {}) };
}
/** read and recognise in one go (the worker's op 'recog'), or just the sheets (op 'tables') */
async function run(op, name, u8, opts = {}) {
  if (op === 'tables') return (await C.readTables(name, u8)) || C.readXlsx(u8);
  const T = await C.readTables(name, u8), dets = C.analyzeTables(name, T);
  return { dets, rec: T ? recognise(name, T, { ...opts, dets }) : null };
}

return { KINDS, GENESYS, VOCAB, tokensOf, features, recognise, verdictOf, run, monthOfName, monthInText, latestMonth, fingerprint, hnorm, kkey, ymText };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Recog;
