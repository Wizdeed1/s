/* MC incentive data workbook: "MC_all_team_incentive _data -YYYY-MM.xlsx" (same 4 tabs as the file sent to the champions) */
'use strict';
const WriterInc = ((C, W, K) => {
const { normSpace, normName } = C;
const MON = C.MON;
const fileName = (y, m) => `MC_all_team_incentive _data -${y}-${String(m).padStart(2, '0')}.xlsx`;
const idText = nid => { const id = C.cleanId(nid); return id || normSpace(nid) || ''; };
const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
// Counted columns of the Attendance Report by default, in order (header, COUNTIF criterion, model test). The month's rules
// (Kpi 'count': which codes make a scheduled day, the absence penalty) choose the columns; the defaults give exactly these.
const COUNTS = K.DAY_CODES.map(d => [d.head, d.crit, d.test]);
// column widths by header (other leave columns get 12)
const TWD = { Tardy: 10.44, 'AL leave': 13.22, 'SL leaves': 14, 'National Day': 18.89, 'Compassionate Leave': 25.22, EID: 8.44, ML: 8, Unpaid: 11.66, Absent: 11.55, Attend: 11.22, 'Scheduled days': 19.55, 'Actual days': 15.55, 'Review Notes': 17.44 };

/** Everything in the incentive file, as plain data (also used for the email, the checks and the review snapshot). */
function model(ctx, opt = {}) {
  const set = ctx.settings, ND = C.daysIn(ctx.year, ctx.month);
  const people = W.peopleModel(ctx);
  const shown = people.filter(p => p.shown);
  const mark = p => (p.status === 'Inactive' ? '⛔ ' : '');
  const fullTeams = (set.incFullAdhTeams || []).map(normSpace);
  const CNT = K.normCount(opt.count);
  // Attendance Report: everyone in the reports, roster order. A day late by more than the rules' limit shows as Absent.
  const att = shown.map(p => {
    const src = people[p.attRow - 1] || p, raw = Array.from({ length: ND }, (_, i) => (src.attDays ? src.attDays[i] : null)), days = raw.map(v => (
      v == null || v === '' ? '' : typeof v === 'number' ? (CNT.lateOver > 0 && v > CNT.lateOver ? 'Absent' : 'Attend') : String(v)));
    const has = days.some(v => v !== '');
    const cd = K.countDays(raw, CNT), counts = CNT.sched.map(c => cd.byCode[c]), attend = cd.attended;
    return { pid: p._id, key: p.key, id: idText(p.nid), name: normSpace(p.name), mark: mark(p) || (has ? '' : '⚠ '), brand: normSpace(p.brand), team: normSpace(p.team),
      days, tardy: src.att ? src.att.tardyMin : 0, counts, attend, sched: cd.sched, has, attended: cd.attended, absent: cd.absent, runs: cd.runs, extra: cd.extra, counted: cd.counted, byCode: cd.byCode };
  });
  // Adherence -In Detail: people with Genesys adherence, by name
  const det = shown.filter(p => p.hasAdh).map(p => {
    const vals = Array.from({ length: ND }, (_, i) => { const v = p.adhVals ? p.adhVals[i] : null; return v == null || v < set.floor ? 'NA' : v; });
    const nums = vals.filter(v => typeof v === 'number');
    return { pid: p._id, key: p.key, id: idText(p.nid), name: p.exp, mark: mark(p), brand: normSpace(p.brand), team: normSpace(p.team), vals,
      avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 'NA', under: nums.filter(v => v < set.target).length, counted: nums.length };
  }).sort((a, b) => byName(a.name, b.name));
  const adh = det.map(d => ({ pid: d.pid, key: d.key, id: d.id, name: d.name, mark: d.mark, brand: d.brand, team: d.team, avg: d.avg, full: false }));
  const full = shown.filter(p => !p.hasAdh && fullTeams.includes(normSpace(p.team)))
    .map(p => ({ pid: p._id, key: p.key, id: idText(p.nid), name: normSpace(p.name), mark: mark(p), brand: normSpace(p.brand), team: normSpace(p.team), avg: 1, full: true }));
  adh.push(...full);
  // AHT: people with an AHT value, by name
  const aht = shown.filter(p => p.hasAht).map(p => {
    const raw = ctx.rawAht[p.ahtRow - 2] || {}, alt = (raw.alt || []).filter(x => x.sec != null);
    return { pid: p._id, key: p.key, id: idText(p.nid), name: p.exp, mark: mark(p), brand: normSpace(p.brand), team: normSpace(p.team), sec: p.aht, alt, dup: '' };
  }).sort((a, b) => byName(a.name, b.name));
  const cnt = (f) => { const m = new Map(); aht.forEach(r => { const k = f(r); if (k) m.set(k, (m.get(k) || 0) + 1); }); return m; };
  const ids = cnt(r => (/^\d{6,}$/.test(r.id) ? r.id : '')), nms = cnt(r => normName(r.name));
  aht.forEach(r => {
    if ((ids.get(r.id) > 1) || nms.get(normName(r.name)) > 1) r.dup = '⚠ Duplicate – keep one';
    else if (r.alt.length > 1) r.dup = `⚠ ${r.alt.length} rows in the export (${r.alt.map(x => x.media || '?').join(', ')}) – kept ${(r.alt.find(x => x.sec === r.sec) || {}).media || 'the first'}`;
  });
  return { y: ctx.year, m: ctx.month, nd: ND, att, det, adh, aht, full, set, count: CNT };
}

async function build(ctx, opt = {}) {
  const md = opt.model || model(ctx, opt);
  const S = new W.Styles(), { Sheet } = W;
  const Y = md.y, M = md.m, ND = md.nd, L = `${MON[M - 1]} - ${Y}`;
  const GREY = 'FF7F7F7F', BLUE = 'FF2F5597', WHITE = 'FFFFFFFF', NAVY = 'FF1F3864', LINE = 'FFBFBFBF';
  const A = (o = {}) => ({ name: 'Arial', sz: 10, color: 'FF000000', ...o });
  const thin = 'FF000000';
  const st = {
    title: S.get({ font: A({ sz: 14, b: true, color: NAVY }), align: { v: 'bottom' } }),
    hd: (fill = GREY, o = {}) => S.get({ font: A({ b: true, color: WHITE, ...(o.font || {}) }), fill, border: o.border || thin, align: { h: 'center', v: 'center', wrap: o.wrap }, numFmt: o.numFmt }),
    cell: S.get({ font: A(), border: thin, align: { v: 'bottom' } }),
    day: S.get({ font: A({ sz: 9 }), border: thin, align: { h: 'center', v: 'center' } }),
    tot: S.get({ font: A({ sz: 9 }), border: thin, align: { h: 'center', v: 'bottom' } }),
    pctDay: S.get({ font: A({ sz: 9 }), border: thin, align: { h: 'center', v: 'bottom' }, numFmt: '0.00%' }),
    plain: S.get({ font: A(), align: { v: 'bottom' } }),
    pct10: S.get({ font: A(), align: { h: 'center', v: 'bottom' }, numFmt: '0.00%' }),
    num: S.get({ font: A(), align: { v: 'bottom' } }),
    dupC: S.get({ font: A(), align: { h: 'center', v: 'bottom' } }),
  };
  const dx = {
    border: S._idx(S.dxfs, `<dxf><border><left style="thin"><color rgb="${LINE}"/></left><right style="thin"><color rgb="${LINE}"/></right><top style="thin"><color rgb="${LINE}"/></top><bottom style="thin"><color rgb="${LINE}"/></bottom></border></dxf>`),
    warn: S._idx(S.dxfs, '<dxf><font><b/><sz val="10"/><color rgb="FF9C0006"/><name val="Arial"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>'),
    off: S._idx(S.dxfs, '<dxf><font><strike/><sz val="10"/><color rgb="FFA6A6A6"/><name val="Arial"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor rgb="FFEDEDED"/></patternFill></fill></dxf>'),
    dup: S.dxf({ color: 'FF9C0006', fill: 'FFFFC7CE' }),
    exam: S.dxf({ color: WHITE, fill: 'FF002060' }), nd: S.dxf({ fill: 'FF00B050' }), al: S.dxf({ color: 'FF006100', fill: 'FFC6EFCE' }),
    absent: S.dxf({ color: 'FF9C0006', fill: 'FFFFC7CE' }), sl: S.dxf({ fill: 'FFFFE699' }), offDay: S.dxf({ fill: 'FFD9D9D9' }),
    dupNote: S.dxf({ color: 'FFC00000', fill: 'FFFCE4D6' }),
  };
  const ymd = d => C.ymdSerial(Y, M, d);
  const sheets = [];

  // ---------------- Attendance Report
  const AR = new Sheet('Attendance Report'); AR.tab = NAVY; AR.defH = 14.4; AR.heights[1] = 17.4;
  AR.set(1, 1, `MC Monthly Attendance - ${L}`, st.title);
  ['ID', 'Name', 'Team', 'Dep'].forEach((h, j) => AR.set(2, j + 1, h, st.hd()));
  const dHead = S.get({ font: A({ sz: 9, b: true, color: WHITE }), fill: GREY, border: thin, align: { h: 'center', v: 'center' }, numFmt: 'dd\\-mmm' });
  for (let d = 1; d <= ND; d++) { AR.set(2, 4 + d, ymd(d), dHead); AR.width(4 + d, 11); }
  const T0 = 5 + ND;   // Tardy column
  const CNT = md.count || K.COUNT0(), CODES = CNT.sched.map(K.dayCode), iAbs = CNT.sched.indexOf('Absent');
  const PEN = CNT.absentExtra > 0 || CNT.absentFlat > 0;   // an absence penalty: Actual days = Attend less the days taken off
  const TH = ['Tardy', ...CODES.map(c => c.head), 'Attend', 'Scheduled days', 'Actual days', 'Review Notes'];
  TH.forEach((h, j) => { AR.set(2, T0 + j, h, st.hd(h === 'Review Notes' ? BLUE : GREY)); AR.width(T0 + j, TWD[h] ?? 12); });
  [[1, 11.55], [2, 35.11], [3, 10.44], [4, 8.89]].forEach(([c, w]) => AR.width(c, w));
  const fd = C.colName(5), ld = C.colName(4 + ND);
  md.att.forEach((r, i) => {
    const R = 3 + i, rg = `${fd}${R}:${ld}${R}`;
    AR.set(R, 1, r.id, st.cell); AR.set(R, 2, r.mark + r.name, st.cell); AR.set(R, 3, r.brand, st.cell); AR.set(R, 4, r.team, st.cell);
    r.days.forEach((v, j) => AR.set(R, 5 + j, v === '' ? null : v, st.day));
    AR.set(R, T0, r.tardy || 0, st.tot);
    CODES.forEach((c, j) => AR.set(R, T0 + 1 + j, r.counts[j], st.tot, `COUNTIF(${rg},"${c.crit}")`));
    const cA = T0 + 1 + CODES.length;
    AR.set(R, cA, r.attend, st.tot, `COUNTIF(${rg},"Attend")+COUNT(${rg})`);
    AR.set(R, cA + 1, r.sched, st.tot, `SUM(${C.ref(R, T0 + 1)}:${C.ref(R, cA)})`);
    if (!PEN) AR.set(R, cA + 2, r.attend, st.tot, C.ref(R, cA));
    else {   // Actual days = MIN(Attend, MAX(fewest, Attend - days off)); per run of absent days the days off are written as a number
      const a = C.ref(R, cA), x = iAbs >= 0 && CNT.absentPer === 'day' ? C.ref(R, T0 + 1 + iAbs) : null;
      const off = x ? [CNT.absentExtra ? `${CNT.absentExtra}*${x}` : '', CNT.absentFlat ? `IF(${x}>0,${CNT.absentFlat},0)` : ''].filter(Boolean).join('+') : String(r.extra || 0);
      AR.set(R, cA + 2, r.counted ?? r.attend, st.tot, `MIN(${a},MAX(${CNT.countedMin},${a}-(${off})))`);
    }
    AR.set(R, cA + 3, null, st.tot);
  });
  const lastA = Math.max(502, md.att.length + 2), lastCol = T0 + TH.length - 1;
  AR.addCF(`A3:D${lastA} ${C.ref(3, T0)}:${C.ref(lastA, lastCol)}`, '$A3<>""', dx.border);
  AR.addCF(`B3:B${lastA}`, 'LEFT(B3,1)="⚠"', dx.warn); AR.addCF(`B3:B${lastA}`, 'LEFT(B3,1)="⛔"', dx.off);
  const grid = `${fd}3:${ld}${Math.max(112, md.att.length + 2)}`, tl = `${fd}3`;
  [['Exam', dx.exam], ['National Day', dx.nd], ['AL', dx.al], ['Absent', dx.absent], ['SL', dx.sl], ['OFF', dx.offDay]].forEach(([v, x]) => AR.addCF(grid, `${tl}="${v}"`, x));
  AR.freeze = [3, 5]; AR.filter = `A2:${C.ref(lastA, lastCol)}`;
  sheets.push(AR);

  // ---------------- Adherence -In Detail
  const AD = new Sheet('Adherence -In Detail'); AD.tab = NAVY; AD.defH = 14.4; AD.heights[1] = 17.4; AD.heights[5] = 28.05;
  AD.set(1, 1, `MC Monthly Adherence - ${L}`, st.title);
  const hdW = st.hd(GREY, { wrap: true });
  [['ID', 13], ['Member Care champions', 35.22], ['Team', 9]].forEach(([h, w], j) => { AD.set(4, j + 1, h, hdW); AD.set(5, j + 1, null, hdW); AD.merge(4, j + 1, 5, j + 1); AD.width(j + 1, w); });
  const dHeadW = S.get({ font: A({ sz: 9, b: true, color: WHITE }), fill: GREY, border: thin, align: { h: 'center', v: 'center', wrap: true }, numFmt: 'dd\\-mmm' });
  const sub = S.get({ font: A({ sz: 8, b: true, color: WHITE }), fill: GREY, border: thin, align: { h: 'center', v: 'center', wrap: true } });
  for (let d = 1; d <= ND; d++) { AD.set(4, 3 + d, ymd(d), dHeadW); AD.set(5, 3 + d, 'Adherence (%)', sub); AD.width(3 + d, 7.44); }
  const AV = 4 + ND; AD.set(4, AV, 'Avr.', hdW); AD.set(5, AV, null, hdW); AD.merge(4, AV, 5, AV); AD.width(AV, 10.22);
  const dfirst = C.colName(4), dlast = C.colName(3 + ND);
  md.det.forEach((r, i) => {
    const R = 6 + i;
    AD.set(R, 1, r.id, st.cell); AD.set(R, 2, r.mark + r.name, st.cell); AD.set(R, 3, r.brand, st.cell);
    r.vals.forEach((v, j) => AD.set(R, 4 + j, v, st.pctDay));
    AD.set(R, AV, r.avg, st.pctDay, `IFERROR(AVERAGE(${dfirst}${R}:${dlast}${R}),"NA")`);
  });
  const lastD = Math.max(305, md.det.length + 5);
  AD.addCF(`A6:C${lastD} ${C.ref(6, AV)}:${C.ref(lastD, AV)}`, '$A6<>""', dx.border);
  AD.addCF(`B6:B${lastD}`, 'LEFT(B6,1)="⚠"', dx.warn); AD.addCF(`B6:B${lastD}`, 'LEFT(B6,1)="⛔"', dx.off);
  AD.freeze = [6, 4]; AD.filter = `A5:${C.ref(lastD, AV)}`;
  sheets.push(AD);
  const AVL = C.colName(AV);

  // ---------------- Adherence
  const AH = new Sheet('Adherence'); AH.tab = NAVY; AH.defH = 14.4; AH.heights[1] = 17.4;
  AH.set(1, 1, `MC Monthly Adherence - ${L}`, st.title);
  const hdL = (fill = GREY) => st.hd(fill, { border: { l: LINE, r: LINE, t: LINE }, wrap: true });
  [['ID', 13], ['Name', 37], ['Team', 10], ['Adherence', 12]].forEach(([h, w], j) => { AH.set(4, j + 1, h, hdL()); AH.width(j + 1, w); });
  md.adh.forEach((r, i) => {
    const R = 5 + i; AH.heights[R] = 18;
    AH.set(R, 1, r.id, st.plain); AH.set(R, 2, r.mark + r.name, st.plain); AH.set(R, 3, r.brand, st.plain);
    if (r.full) AH.set(R, 4, 1, st.pct10);
    else AH.set(R, 4, r.avg, st.pct10, `IFERROR(INDEX('Adherence -In Detail'!$${AVL}:$${AVL},MATCH(B${R},'Adherence -In Detail'!$B:$B,0)),"NA")`);
  });
  const lastH = Math.max(302, md.adh.length + 4);
  AH.addCF(`A5:D${lastH}`, '$A5<>""', dx.border);
  AH.addCF(`B5:B${lastH}`, 'LEFT(B5,1)="⚠"', dx.warn); AH.addCF(`B5:B${lastH}`, 'LEFT(B5,1)="⛔"', dx.off);
  AH.cf.push({ sqref: `B5:B${lastH}`, dxfId: dx.dup, type: 'dup' }, { sqref: `A5:A${lastH}`, dxfId: dx.dup, type: 'dup' });
  AH.freeze = [5, 1];
  sheets.push(AH);

  // ---------------- AHT
  const HT = new Sheet('AHT'); HT.tab = NAVY; HT.defH = 14.4; HT.heights[1] = 17.4;
  HT.set(1, 1, `MC Monthly AHT - ${L}`, st.title);
  [['ID', 15, GREY], ['Name', 30, BLUE], ['AHT', 10, BLUE], ['Team', 9, GREY], ['Duplicate Check', 25.89, GREY]].forEach(([h, w, f], j) => { HT.set(4, j + 1, h, hdL(f)); HT.width(j + 1, w); });
  md.aht.forEach((r, i) => {
    const R = 5 + i; HT.heights[R] = 18;
    HT.set(R, 1, r.id, st.plain); HT.set(R, 2, r.mark + r.name, st.plain); HT.set(R, 3, Math.round(r.sec * 1000) / 1000, st.num);
    HT.set(R, 4, r.brand, st.plain); HT.set(R, 5, r.dup, st.dupC);
  });
  const lastT = Math.max(276, md.aht.length + 4);
  HT.addCF(`A5:E${lastT}`, 'LEFT($B5,1)="⛔"', dx.off, true); HT.addCF(`A5:E${lastT}`, '$B5<>""', dx.border);
  HT.addCF(`B5:B${lastT}`, 'LEFT(B5,1)="⚠"', dx.warn); HT.addCF(`A5:E${lastT}`, '$E5<>""', dx.dupNote);
  HT.freeze = [5, 1];
  sheets.push(HT);

  if (ctx.logo) for (const sh of sheets) sh.titleLogo(10, 360);
  return W.pack(sheets, S, {}, { logo: ctx.logo });
}

return { build, model, fileName, COUNTS };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Writer2 !== 'undefined' ? Writer2 : require('./writer2.js'), typeof Kpi !== 'undefined' ? Kpi : require('./kpi.js'));
if (typeof module !== 'undefined') module.exports = WriterInc;
