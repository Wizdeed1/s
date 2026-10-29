// Synthetic data for the Weekly Commercial Presentation tests (test/weekly_unit.cjs, test/weekly.cjs): a Brands' history, a Call
// Center History export as the ESKA report makes it, and a KPI workbook laid out like the WFM team's BeyondOne_MC_KPIs (Weekly Data
// and Postpaid Data at the same cells). Made-up numbers and reasons only.
const Core = require('../js/core.js');
const E = require('../dt/engine.js').Engine;
const W = require('../js/weekly_core.js');

const BR = ['virgin', 'friendi', 'fpay', 'postpaid'];
const BASE = { virgin: [1500, 0.9], friendi: [1400, 0.88], fpay: [120, 0.85], postpaid: [140, 0.95] };
/** Oct 2026 up to the 24th (the week of 18–24 Oct is Sunday to Saturday), Jan–Aug 2026 as monthly rows, Sep 2026 as days only */
function history({ upTo = '2026-10-24', skip = {} } = {}) {
  const H = {};
  for (const b of BR) {
    const [p, sl] = BASE[b], daily = [], monthly = [];
    for (let m = 1; m <= 8; m++) monthly.push({ date: `2026-${String(m).padStart(2, '0')}-01`, presented: p + m * 10, handled: p + m * 10 - 50, sl: Math.round((sl - 0.1 + m * 0.01) * 100) / 100 });
    for (let d = W.addDays('2025-12-01', 0); d <= upTo; d = W.addDays(d, 1)) {
      if (d < '2026-09-01' && d >= '2026-01-01') continue;   // Jan–Aug are monthly rows
      if ((skip[b] || []).includes(d)) continue;
      const k = +d.slice(8, 10);
      daily.push({ date: d, presented: p + k * 3, handled: p + k * 3 - (k % 5) * 4, sl: Math.round((sl + (k % 3) * 0.01) * 100) / 100, aht: 200 });
    }
    H[b] = { voice: { daily, monthly } };
  }
  return H;
}
/** the expected month to date of a brand: the average day of 1–24 Oct */
function mtd(b, upTo = 24) {
  const [p, sl] = BASE[b], ks = Array.from({ length: upTo }, (_, i) => i + 1);
  const avg = f => ks.reduce((s, k) => s + f(k), 0) / ks.length;
  return { presented: avg(k => p + k * 3), handled: avg(k => p + k * 3 - (k % 5) * 4), sl: avg(k => Math.round((sl + (k % 3) * 0.01) * 100) / 100) };
}

// ---------------------------------------------------------------- an .xlsx from rows (inline strings, numbers; dates as text or numbers)
const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colL = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
/** sheets: [{ name, cells: { A1: value | { f: 'formula', v } | { s: 'shared string' } } }] */
async function xlsx(sheets) {
  const sst = [], sid = s => { let i = sst.indexOf(s); if (i < 0) { sst.push(s); i = sst.length - 1; } return i; };
  const sheetXml = cells => {
    const rows = {};
    for (const [ref, v] of Object.entries(cells)) { const m = /^([A-Z]+)(\d+)$/.exec(ref); (rows[+m[2]] = rows[+m[2]] || []).push([m[1], ref, v]); }
    const cn = c => { let n = 0; for (const ch of c) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
    const body = Object.keys(rows).map(Number).sort((a, b) => a - b).map(r => `<row r="${r}">${rows[r].sort((a, b) => cn(a[0]) - cn(b[0])).map(([, ref, v]) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      if (typeof v === 'object' && v.f) return `<c r="${ref}"><f>${x(v.f)}</f>${v.v !== undefined ? `<v>${v.v}</v>` : ''}</c>`;
      if (typeof v === 'object' && v.s !== undefined) return `<c r="${ref}" t="s"><v>${sid(v.s)}</v></c>`;
      if (typeof v === 'object' && v.d) return `<c r="${ref}" s="1"><v>${W.serial(v.d)}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${x(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${body}</sheetData></worksheet>`;
  };
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="d\\-mmm"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>' },
  ];
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.cells) }));
  files.push({ name: 'xl/sharedStrings.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">${sst.map(s => `<si><t>${x(s)}</t></si>`).join('')}</sst>` });
  return Core.writeZip(files);
}

// ---------------------------------------------------------------- a Call Center History export (the ESKA report) of 1–25 Oct 2026
/** [date, type, service, sub, n]: n rows each; before the 18th and the 25th are outside the week of 18–24 Oct, but Postpaid's
    reasons are month to date (1–24 Oct: the 30th of September is not in it) */
const CALLS = [
  ['2026-09-30', 'Virgin Inquiry', 'Postpaid', 'Bill Copy', 5], ['2026-10-02', 'Virgin Inquiry', 'Postpaid - الخطوط المفوترة', 'Bill Explanation', 20],
  ['2026-10-10', 'Virgin Final Deactivation', 'Post-Paid Customer - عميل باقة مفوترة', 'Final Deactivation', 15], ['2026-10-17', 'Virgin Inquiry', 'Postpaid', 'TKT Created', 30],
  ['2026-10-17', 'Virgin Inquiry', 'Prepaid', 'Plan Renewal', 50],
  ['2026-10-18', 'Virgin Inquiry', 'Prepaid', 'Plan Renewal', 40], ['2026-10-19', 'Virgin Inquiry', 'Prepaid', 'Plan Renewal', 30],
  ['2026-10-18', 'Virgin Inquiry', 'Prepaid', 'Virgin queues', 90], ['2026-10-20', 'Virgin Complaint', 'Prepaid', 'New Complaint', 60],
  ['2026-10-21', 'Virgin Inquiry', 'Prepaid', 'Data Bundle Info', 35], ['2026-10-22', 'Virgin Service Request', 'Prepaid', 'Number Port', 20],
  ['2026-10-23', 'Virgin Inquiry', 'Prepaid', 'Roaming Help', 20], ['2026-10-24', 'Virgin Inquiry', 'Prepaid', 'Balance Check', 15],
  ['2026-10-24', 'Virgin Inquiry', 'Prepaid', 'Top Up Help', 10], ['2026-10-19', 'Virgin Inquiry', 'Postpaid', 'Bill Copy', 25],
  ['2026-10-20', 'Virgin Inquiry', 'Postpaid', 'Bill Explanation', 12], ['2026-10-21', 'Virgin Complaint', 'Postpaid', 'Bill Copy', 8],
  ['2026-10-18', 'FRiENDi Inquiry', 'Prepaid', 'Line Status', 70], ['2026-10-19', 'FRiENDi Inquiry', 'Prepaid', 'Friendi queues', 80],
  ['2026-10-20', 'FRiENDi Inquiry', 'Prepaid', 'Usage Check', 55], ['2026-10-21', 'FRiENDi Complaint', 'Prepaid', 'Charge Dispute', 33],
  ['2026-10-22', 'FRiENDi Inquiry', 'Prepaid', 'Package Change', 30], ['2026-10-23', 'FRiENDi Inquiry', 'Prepaid', 'SIM Info', 22],
  ['2026-10-24', 'FRiENDi Inquiry', 'Prepaid', "Waiting Customer's Reply/No Action Needed", 40],
  ['2026-10-18', 'FRiENDi Pay', 'Complaints', 'Follow Up', 30], ['2026-10-19', 'FRiENDi Pay', 'Inquiry', 'Transfer Status', 12],
  ['2026-10-20', 'FRiENDi Pay', 'Complaints', 'Transfer Error', 9], ['2026-10-21', 'FRiENDi Pay', 'Inquiry', 'Card Question', 6],
  ['2026-10-22', 'FRiENDi Pay', 'Request', 'Profile Update', 4], ['2026-10-23', 'FRiENDi Pay', 'Social Media', "Waiting Customer's Reply/No Action Needed", 7],
  ['2026-10-25', 'FRiENDi Pay', 'Complaints', 'Follow Up', 99],
];
function eskaRows() {
  const out = [['Call Center History 30/09/2026 - 25/10/2026'], ['#', 'Agent', 'Language', 'Date', 'Type', 'Service', 'Sub Service', 'Status', 'Lang', 'Contact']];
  let n = 0;
  for (const [d, t, s, sub, k] of CALLS) for (let i = 0; i < k; i++) out.push([++n, 'Agent ' + (n % 7), 'EN', `${d} ${String(8 + (i % 12)).padStart(2, '0')}:00`, t, s, sub, 'Closed', 'English', '05000000' + String(n).padStart(2, '0')]);
  return out;
}
/** as ESKA saves a long export: the rows run on into Sheet2 after `split` rows, with no title and no heading row there */
async function eska({ split = 400 } = {}) {
  const rows = eskaRows(), sheets = [];
  for (let a = 0; a < rows.length; a += split) { const cells = {}; rows.slice(a, a + split).forEach((r, i) => r.forEach((v, j) => { cells[colL(j + 1) + (i + 1)] = v; })); sheets.push({ name: 'Sheet' + (sheets.length + 1), cells }); }
  return xlsx(sheets);
}

// ---------------------------------------------------------------- a Tickets Report export (ESKA) of 17–25 Oct 2026
/** [date, type, category, sub category, n] */
const TICKETS_ROWS = [
  ['2026-10-17', 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 9],
  ['2026-10-18', 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 20], ['2026-10-20', 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 14],
  ['2026-10-19', 'Virgin Service Request', 'End service', 'Final Switch Postpaid Deactivation', 7], ['2026-10-21', 'Virgin Service Request', 'End service', 'Final Postpaid Deactivation', 5],
  ['2026-10-22', 'Virgin Service Request', 'Migration', 'Post-To-Pre', 6], ['2026-10-23', 'Virgin Complaint', 'Billing', 'Not receiving the details of billing', 3],
  ['2026-10-24', 'Virgin Service Request', 'Migration', 'Activation After Payment', 2], ['2026-10-24', 'Virgin Service Request', 'Migration', 'Final Prepaid Deactivation', 8],
  ['2026-10-20', 'Virgin Complaint', 'Network', 'Weak Coverage', 30], ['2026-10-21', 'FRiENDi Complaint', 'Billing', 'Monthly Billing/Dispute', 12],
  ['2026-10-25', 'Virgin Complaint', 'Billing', 'Monthly Billing/Dispute', 40],
];
function ticketsReportRows() {
  const out = [['Tickets Report 17/10/2026 - 25/10/2026'], ['#', 'Agent', 'Lang', 'Created', 'Type', 'Category', 'Sub Category', 'Status', 'Lang', 'Ticket ID', 'Life Cycle', 'Group']];
  let n = 0;
  for (const [d, t, c, s, k] of TICKETS_ROWS) for (let i = 0; i < k; i++) out.push([++n, 'Agent ' + (n % 5), 'EN', `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)} 10:00`, t, c, s, 'Closed', 'English', 'T' + n, '2h', 'Billing team']);
  return out;
}
async function ticketsReport() {
  const rows = ticketsReportRows(), cells = {};
  rows.forEach((r, i) => r.forEach((v, j) => { cells[colL(j + 1) + (i + 1)] = v; }));
  return xlsx([{ name: 'Sheet1', cells }]);
}

// ---------------------------------------------------------------- a KPI workbook at the WFM team's cells
async function kpiBook() {
  const W1 = {}, P1 = {};
  ['A', 'F', 'K'].forEach((c, i) => { W1[c + '1'] = 'Date'; W1[colL(i * 5 + 2) + '1'] = 'Calls Presented'; W1[colL(i * 5 + 3) + '1'] = 'Calls Handled'; W1[colL(i * 5 + 4) + '1'] = 'Service Level'; });
  for (let k = 1; k <= 31; k++) { W1['A' + (k + 1)] = { d: `2026-09-${String(Math.min(k, 30)).padStart(2, '0')}` }; W1['B' + (k + 1)] = 999; }   // last month's days, to be replaced
  ['B', 'C', 'D', 'G', 'H', 'I', 'L', 'M', 'N'].forEach(c => { W1[c + '33'] = { f: `AVERAGE(${c}2:${c}32)` }; });
  // the monthly blocks: VM from row 1, FR from row 29, FPay from row 56, each ending with MTD (Sep 2026 listed, Jan–Aug too)
  [[1, 'VM'], [29, 'FR'], [56, 'FPay']].forEach(([r0, label]) => {
    W1['P' + r0] = { s: label }; W1['P' + (r0 + 1)] = { s: '#' }; W1['Q' + (r0 + 1)] = 'Calls Presented'; W1['R' + (r0 + 1)] = 'Calls Handled'; W1['S' + (r0 + 1)] = 'Service Level';
    W1['P' + (r0 + 2)] = 2025; W1['Q' + (r0 + 2)] = 1;
    for (let m = 1; m <= 9; m++) { W1['P' + (r0 + 2 + m)] = { d: `2026-${String(m).padStart(2, '0')}-01` }; W1['Q' + (r0 + 2 + m)] = 1; W1['R' + (r0 + 2 + m)] = 1; W1['S' + (r0 + 2 + m)] = 0.5; }
    W1['P' + (r0 + 12)] = { s: 'MTD' }; W1['Q' + (r0 + 12)] = 1;
  });
  // the top call reasons: VM's total on the heading row, FR's on the first row (as in the real file)
  [[36, 'VM', 'O$36'], [45, 'FR', 'O$46'], [54, 'Fpay', 'O$54']].forEach(([r, label, base]) => {
    W1['K' + (r - 1)] = { s: label }; W1['K' + r] = '#'; W1['L' + r] = { s: 'Top Call Reasons' }; W1['M' + r] = 'Num of'; W1['N' + r] = '%';
    for (let i = 1; i <= 5; i++) { W1['K' + (r + i)] = i; W1['L' + (r + i)] = 'old reason ' + i; W1['M' + (r + i)] = 1; W1['N' + (r + i)] = { f: `M${r + i}/${base}`, v: 0.1 }; }
    W1[base.replace('$', '')] = 10;
  });
  // the complaint blocks
  [[83, 'Virgin', true, 'VM'], [96, 'Friendi', true, 'FR'], [109, 'FPAY', false, 'Fpay']].forEach(([r, label, ot, tag]) => {
    W1['P' + r] = { s: label }; W1['Q' + r] = '%'; W1['P' + (r + 1)] = { s: 'No. of Complaints' }; W1['Q' + (r + 1)] = 1;
    if (ot) { W1['P' + (r + 2)] = 'Resolution Time of Closed TKT'; W1['Q' + (r + 2)] = 0.5; W1['P' + (r + 3)] = 'The Remaining Open TKT '; W1['Q' + (r + 3)] = 1; }
    else { W1['P' + (r + 2)] = 'The Remaining Open TKT'; W1['Q' + (r + 2)] = 1; }
    W1['P' + (r + 4)] = tag; W1['P' + (r + 5)] = { s: 'Top 5 complaints' }; W1['Q' + (r + 5)] = 'Percentage ';
    for (let i = 1; i <= 5; i++) { W1['P' + (r + 5 + i)] = 'old driver ' + i; W1['Q' + (r + 5 + i)] = 0.01; }
  });
  P1.A1 = 'Date'; P1.B1 = 'Calls Presented'; P1.C1 = 'Calls Handled'; P1.D1 = 'Service Level';
  P1.G22 = '#'; P1.H22 = 'Top 5 Call Reasons'; P1.I22 = 'Num of'; P1.J22 = '%'; P1.M22 = 5; P1.O22 = '#'; P1.P22 = 'Top 5 TKT'; P1.Q22 = 'Num of'; P1.R22 = '%'; P1.U22 = 5;
  for (let i = 1; i <= 5; i++) { P1['G' + (22 + i)] = i; P1['H' + (22 + i)] = 'old'; P1['I' + (22 + i)] = 1; P1['J' + (22 + i)] = { f: `L${22 + i}/M$22` }; P1['L' + (22 + i)] = 1; P1['O' + (22 + i)] = i; P1['P' + (22 + i)] = 'old'; P1['Q' + (22 + i)] = 1; P1['R' + (22 + i)] = { f: `T${22 + i}/U$22` }; P1['T' + (22 + i)] = 1; }
  return xlsx([{ name: 'Weekly Data', cells: W1 }, { name: 'Postpaid Data', cells: P1 }, { name: 'Monthly Calls', cells: { A1: 'kept as it is' } }]);
}

const COMPLAINTS = `Virgin\t%
No. of Complaints\t812
Resolution Time of Closed TKT\t97%
The Remaining Open TKT \t133
VM
Top 5 complaints\tPercentage
Signal drops\t14%
Virgin app crashes\t11%
Wrong charge\t9%
Slow data\t6%
Activation delay\t5%

Friendi\t%
No. of Complaints\t190
Resolution Time of Closed TKT\t100%
The Remaining Open TKT \t41
FR
Top 5 complaints\tPercentage
Signal drops\t18%
Package not added\t12%
Wrong charge\t8%
Slow data\t7%
SIM blocked\t6%

FPAY\tOct-26\tTarget
No. of Complaints\t57
The Remaining Open TKT\t12
Fpay
Top 5 complaints\tPercentage
Transfer failed\t61%
Card not added\t15%
Limit change\t7%
Phone number change\t6%
Refund failed\t4%`;
const TICKETS = { total: 90, list: [{ name: 'Bill dispute', count: 40 }, { name: 'Switch to prepaid', count: 20 }, { name: 'Final deactivation', count: 10 }, { name: 'Bill copy missing', count: 5 }, { name: 'Late activation', count: 3 }] };
const OUTAGES = [
  { id: 'a', date: '2026-07-30', issue: 'Old July outage', brands: 'Virgin', desc: 'before the window' },
  { id: 'b', date: '2026-08-05', issue: 'Portal down', brands: 'Virgin,FRiENDi,Fpay', desc: 'the portal stopped' },
  { id: 'c', date: '2026-09-14', issue: 'Coverage drop', brands: 'Virgin,FRiENDi', desc: 'weak coverage in one region' },
  { id: 'd', date: '2026-10-20', issue: 'Login issue', brands: 'Fpay', desc: 'customers could not log in' },
  { id: 'e', date: '2026-10-27', issue: 'Next week', brands: 'Virgin', desc: 'after the week' },
];
/** the complaint figures as the email has them: a count and a percentage per driver */
const COMPLAINTS_EMAIL = `Virgin\tOct 2026\nNo. of Complaints\t812\nResolution Time of Closed TKT\t97%\nThe Remaining Open TKT \t133\n \n Top Complaints :\n     \nSubcategories \tTotal\tPercentage \nSignal drops\t114\t14%\nVirgin app crashes\t89\t11%\nWrong charge\t73\t9%\nSlow data\t49\t6%\nActivation delay\t41\t5%\n\nFriendi\tOct 2026\nNo. of Complaints\t190\nResolution Time of Closed TKT\t100%\nThe Remaining Open TKT \t41\nTop Complaints :\nSubcategories \tTotal\tPercentage \nSignal drops\t34\t18%\nPackage not added\t23\t12%\nWrong charge\t15\t8%\nSlow data\t13\t7%\nSIM blocked\t11\t6%\nFPAY\t18 Oct – 24 Oct\tTarget\nNo. of Complaints\t57\t\nResolution Time in Days\t\t\nResolution Time\t\t5 Days\nResolution Time One day\t\t1 Day\nThe Remaining Open TKT\t12\t\n \nTop Complaints :\nSubcategories \tTotal\tPercentage \nTransfer failed\t35\t61 %\nCard not added\t9\t15 %\nLimit change\t4\t7 %\nPhone number change\t3\t6 %\nRefund failed\t2\t4 %`;
module.exports = { history, mtd, xlsx, eska, eskaRows, kpiBook, ticketsReport, ticketsReportRows, TICKETS_ROWS, COMPLAINTS_EMAIL, COMPLAINTS, TICKETS, OUTAGES, CALLS, E, W, Core };
