// HR's file of joining dates, Node only, made-up people: Core.parseJoining (the National ID column, never the employee number; the
// email kept when it is one; first, middle and last name; a date, an Excel serial or 18/01/2026), Core.analyzeTables (the HR layout
// is the joining dates, a roster with its own columns stays a roster), the recogniser's verdict, and the sheet reader on a sheet
// formatted down to row 300,000 with values in only a few rows (as HR's file is formatted down to row 1,048,576).
// Usage: node test/joining.test.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const Core = require(path.join(__dirname, '..', 'js', 'core.js'));
const Recog = require(path.join(__dirname, '..', 'js', 'recog_core.js'));
const tests = []; const ok = (name, fn) => tests.push([name, fn]);

const HR = ['Full Name', 'Colleague ID on SF', 'National ID', 'New Username', 'First Name', 'Middle Name', 'Last Name', 'Position', 'Hire Date'];
const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const hrRows = () => [HR,
  ['Lina Q. A.', 90000001, 1000000001, 'Lina.A@example.com', 'Lina', 'Q.', 'A.', 'Member Care Champion', day(2025, 3, 2)],
  ['Omar B.', 90000002, 1000000002, 'omar.b@example.com', 'Omar', null, 'B.', 'Member care supervisor', 45000],
  ['Sara C.', 90000003, '1000000003', 'not an address', 'Sara', '', 'C.', 'Workforce Manager', '18/01/2026'],
  [null, null, null, null, null, null, null, null, null],
  ['Total', null, null, null, null, null, null, null, null]];

ok('parseJoining: the National ID (not the Colleague ID), the email when it is one, the names, the position and every kind of date', () => {
  const J = Core.parseJoining(hrRows());
  assert.equal(J.length, 3, 'the blank row and the total row are not people');
  assert.deepEqual(J.map(r => r.id), ['1000000001', '1000000002', '1000000003']);
  assert.deepEqual(J.map(r => r.email), ['lina.a@example.com', 'omar.b@example.com', '']);
  assert.deepEqual([J[0].first, J[0].middle, J[0].last, J[0].position], ['Lina', 'Q.', 'A.', 'Member Care Champion']);
  assert.deepEqual(J.map(r => r.joined), ['2025-03-02', '2023-03-15', '2026-01-18']);
});
ok('parseJoining: no hire date column, no joining dates', () => {
  assert.equal(Core.parseJoining([['Full Name', 'National ID'], ['Lina A.', 1000000001]]), null);
});
ok('analyzeTables: HR\'s layout is the joining dates; a roster with its own columns stays a roster', () => {
  const kinds = rows => Core.analyzeTables('x.xlsx', [{ name: 'Sheet1', state: 'visible', rows }]).map(d => d.kind).join();
  assert.equal(kinds(hrRows()), 'joining');
  assert.equal(kinds([['Name', 'National ID', 'Joining date'], ['Lina A.', 1000000001, '02/03/2025']]), 'joining', 'a name, an ID and a date: only the dates');
  assert.equal(kinds([['Name', 'National ID', 'Brand', 'Team', 'Joining date'], ['Lina A.', 1000000001, 'Virgin', 'CC', '02/03/2025']]), 'roster');
  assert.equal(kinds([['Name', 'National ID', 'Brand', 'Team', 'System name', 'Status', 'Supervisor', 'Email', 'Incentive base', 'Joining date', 'Scorecard'], ['Lina A.', 1000000001, 'Virgin', 'CC', 'Lina A', 'Active', '', '', '', '2025-03-02', '']]), 'roster');
  assert.equal(kinds([['Name', 'National ID', 'Team', 'Dep'], ['Lina A.', 1000000001, 'Virgin', 'CC']]), 'roster', 'the HR IDs file');
  assert.equal(Core.analyzeTables('x.xlsx', [{ name: 'Roster', state: 'visible', rows: [['Name', 'National ID', 'Joining date'], ['Lina A.', 1000000001, '02/03/2025']] }])[0].kind, 'roster', 'a sheet called Roster');
});
ok('the recogniser: HR\'s file is the joining dates, sure, for the roster; a roster file is not', () => {
  const v = Recog.recognise('MC_hire_date.xlsx', [{ name: 'Sheet1', state: 'visible', rows: hrRows() }], {});
  assert.equal(v.kind, 'joining'); assert.equal(v.level, 'sure'); assert.equal(v.route, 'joining');
  assert.match(v.reasons.join(' | '), /Name and National ID with the date each joined \(Hire Date\)/);
  assert.match(v.reasons.join(' | '), /3 people, each with a 10-digit National ID/);
  const r = Recog.recognise('roster.csv', [{ name: 'roster', state: 'visible', rows: [['Name', 'National ID', 'Brand', 'Team', 'System name', 'Status', 'Joining date'], ['Lina A.', 1000000001, 'Virgin', 'CC', 'Lina A', 'Active', '2025-03-02']] }], {});
  assert.equal(r.kind, 'roster');
  const i = Recog.recognise('ids.xlsx', [{ name: 'Sheet1', state: 'visible', rows: [['Name', 'National ID', 'Team', 'Dep', 'Joining date'], ['Lina A.', 1000000001, 'Virgin', 'CC', '2025-03-02']] }], {});
  assert.equal(i.kind, 'ids'); assert.equal(i.level, 'sure', 'the HR IDs file with a joining date column stays the IDs file');
});

// a workbook formatted down to row 300,000: two people, a formatted empty row between them, then formatting only
async function formattedBook(last) {
  const cell = (r, c, v) => (typeof v === 'number' ? `<c r="${c}${r}"${c === 'C' ? ' s="1"' : ''}><v>${v}</v></c>` : `<c r="${c}${r}" t="inlineStr"><is><t>${v}</t></is></c>`);
  const rows = [`<row r="1">${cell(1, 'A', 'Full Name')}${cell(1, 'B', 'National ID')}${cell(1, 'C', 'Hire Date')}</row>`,
    `<row r="2">${cell(2, 'A', 'Lina A.')}${cell(2, 'B', 1000000001)}${cell(2, 'C', 45717)}</row>`,
    '<row r="3"><c r="C3" s="1"/><c r="D3" s="2"/></row>',
    `<row r="4">${cell(4, 'A', 'Omar B.')}${cell(4, 'B', 1000000002)}${cell(4, 'C', 45000)}</row>`];
  for (let r = 5; r <= last; r++) rows.push(`<row r="${r}" spans="3:4"><c r="C${r}" s="1"/><c r="D${r}" s="2"/></row>`);
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D${last}"/><sheetData>${rows.join('')}</sheetData></worksheet>`;
  return Core.writeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="0"/></cellXfs></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', data: sheet }]);
}
let big = null;
const ready = (async () => {
  const bytes = await formattedBook(300000), t0 = Date.now(), sheets = await Core.readXlsx(new Uint8Array(bytes));
  big = { ms: Date.now() - t0, rows: sheets[0].rows };
})();
ok('the reader: a sheet formatted down to row 300,000 reads only up to its last value, quickly, the rows between kept', () => {
  assert.equal(big.rows.length, 4, 'the formatted rows after the last value are not read');
  assert.deepEqual(big.rows[2], [], 'a formatted empty row between two people is an empty row');
  assert.equal(big.rows[3][0], 'Omar B.');
  assert.ok(big.ms < 4000, `read in ${big.ms} ms`);
  const J = Core.parseJoining(big.rows);
  assert.deepEqual(J.map(r => [r.name, r.id, r.joined]), [['Lina A.', '1000000001', '2025-03-01'], ['Omar B.', '1000000002', '2023-03-15']]);
});

(async () => {
  await ready;
  let failed = 0;
  for (const [name, fn] of tests) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.log('NOT OK', name, '\n ', e.message); } }
  console.log(failed ? `${failed} of ${tests.length} checks failed` : `${tests.length} checks passed`);
  if (failed) process.exitCode = 1;
})();
