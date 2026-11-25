// The IVR daily record's workbook (js/ivrbook.js), Node only, made-up days: a week of a made-up IVR (one day without a Data Actions
// export, one with its menus), and an earlier month. Its sheets, the Daily record's numbers and formulas, the dashboard's four
// numbers and its three charts (as Excel reads them: a drawing, its charts, their cell ranges), the heat map of the errors, every
// action day by day, and every part of the package well formed.
// Usage: node test/ivrbook.test.cjs [out.xlsx]   (writes the workbook there too, to look at it)
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const IvrBook = require(path.join(__dirname, '..', 'js', 'ivrbook.js'));
const tests = []; const ok = (name, fn) => tests.push([name, fn]);

/** the files of a zip: name -> text */
function unzip(buf) {
  const out = {}; let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let at = buf.readUInt32LE(e + 16);
  for (let i = 0, n = buf.readUInt16LE(e + 10); i < n; i++) {
    const method = buf.readUInt16LE(at + 10), size = buf.readUInt32LE(at + 20), nl = buf.readUInt16LE(at + 28), xl = buf.readUInt16LE(at + 30), cl = buf.readUInt16LE(at + 32), off = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nl), start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), data = buf.subarray(start, start + size);
    out[name] = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8'); at += 46 + nl + xl + cl;
  }
  return out;
}
/** a cell's value and formula in a sheet's XML */
const cellOf = (x, r) => { const m = x.match(new RegExp(`<c r="${r}"[^>]*?(?:/>|>(.*?)</c>)`)); return m ? m[1] || '' : null; };
const vOf = (x, r) => { const c = cellOf(x, r); const m = c && c.match(/<v>([^<]*)<\/v>|<t[^>]*>([^<]*)<\/t>/); return m ? m[1] ?? m[2] : null; };
const fOf = (x, r) => { const c = cellOf(x, r); const m = c && c.match(/<f>([^<]*)<\/f>/); return m ? m[1] : null; };
/** well formed enough for Excel: every tag closed in order, every attribute quoted */
function wellFormed(xml) {
  const stack = [], re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|<\?[^?]*\?>|<!\[CDATA\[[\s\S]*?\]\]>/g;
  let m, last = 0;
  while ((m = re.exec(xml))) {
    if (/[<>]/.test(xml.slice(last, m.index))) return false;
    last = re.lastIndex;
    if (!m[2]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else if (!m[4]) stack.push(m[2]);
  }
  return !stack.length && !/[<>]/.test(xml.slice(last));
}

// a made-up IVR, 18 to 24 Nov: calls, no queue, within 40 s, queued; Data Actions on every day but 21 Nov; menus on 24 Nov
const plan = [['2026-11-18', 2000, 900, 400, 1100], ['2026-11-19', 2200, 950, 450, 1250], ['2026-11-20', 1800, 760, 330, 1040], ['2026-11-21', 1500, 640, 300, 860],
  ['2026-11-22', 2400, 1000, 520, 1400], ['2026-11-23', 2300, 980, 470, 1320], ['2026-11-24', 2100, 900, 430, 1200]];
const days = plan.map(([date, calls, noQueue, quick, queued], i) => {
  const da = date !== '2026-11-21', acts = da ? [['Customer_Type', 2900 - 10 * i, 16 - i], ['Survey Rating', 1000 + i, i % 3], ['Check Number', 6, i === 5 ? 1 : 0], ['Get Offer', 700, 0]] : [];
  const runs = acts.reduce((t, a) => t + a[1], 0), errorsN = acts.reduce((t, a) => t + a[2], 0);
  return Object.assign({ date, brand: 'virgin', flow: 'Example Main IVR', calls, noQueue, quick, deflected: noQueue - quick, queued, within: 40, da, at: `${date}T07:30:00.000Z`, by: 'Sara K.' },
    da ? { runs, errorsN, actions: acts.length, acts } : {},
    date === '2026-11-24' ? { lists: true, first: { name: 'Main Menu', attempts: 2400 }, outcomes: [{ name: 'Balance Menu', attempts: 860 }, { name: 'Recharge Menu', attempts: 780 }], milestones: [{ name: 'Promo Played', hits: 53 }] } : {});
});
const months = [{ label: 'Oct-26', key: '2026-10', days: 31, calls: 70000, noQueue: 30000, quick: 15500, deflected: 14500, queued: 40000, da: true, runs: 150000, errorsN: 300 }];
let Z, out;
const ready = (async () => {
  const bytes = await IvrBook.build({ brand: 'Virgin Mobile', flow: 'Example Main IVR', month: '2026-11', days, months, made: new Date(2026, 10, 25, 9, 0), by: 'Sara K.', logo: null });
  out = Buffer.from(bytes); Z = unzip(out);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], out);
})();

ok('the sheets, in order, the dashboard first and chosen', () => {
  const names = [...Z['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(names, ['Dashboard', 'Daily record', 'Errors by action', 'Error detail', 'Menus', 'About']);
  assert.match(Z['xl/worksheets/sheet1.xml'], /tabSelected="1"/);
});
ok('every part well formed, every part declared', () => {
  for (const [n, x] of Object.entries(Z)) if (/\.(xml|rels)$/.test(n)) assert.ok(wellFormed(x), n + ' is not well formed');
  const ct = Z['[Content_Types].xml'];
  for (const n of Object.keys(Z).filter(n => /^xl\/(worksheets|charts|drawings)\/[^/]+\.xml$/.test(n))) assert.ok(ct.includes(`PartName="/${n}"`), n + ' not declared');
});
ok('Daily record: a row a day, the formulas, the month to date and the average', () => {
  const s = Z['xl/worksheets/sheet2.xml'];
  assert.equal(vOf(s, 'B5'), '2000'); assert.equal(fOf(s, 'E5'), 'C5-D5'); assert.equal(vOf(s, 'E5'), '500');
  assert.equal(fOf(s, 'F5'), 'IF(B5&gt;0,E5/B5,&quot;&quot;)'); assert.equal(+vOf(s, 'F5'), 500 / 2000);
  assert.equal(fOf(s, 'H5'), 'IF(B5&gt;0,G5/B5,&quot;&quot;)');
  assert.equal(vOf(s, 'I8'), null, '21 Nov has no Data Actions export'); assert.match(cellOf(s, 'L8'), /No Data Actions export that day/);
  assert.equal(fOf(s, 'B12'), 'SUM(B5:B11)'); assert.equal(vOf(s, 'B12'), String(plan.reduce((t, p) => t + p[1], 0)));
  assert.equal(fOf(s, 'K12'), 'IF(N(I12)&gt;0,J12/I12,&quot;&quot;)'); assert.equal(fOf(s, 'B13'), 'AVERAGE(B5:B11)');
  assert.match(s, /<autoFilter ref="A4:L11"\/>/); assert.match(s, /<pane xSplit="1" ySplit="4" topLeftCell="B5"/);
  assert.equal((s.match(/type="dataBar"/g) || []).length, 1); assert.equal((s.match(/type="colorScale"/g) || []).length, 3);
});
ok('Dashboard: the four numbers from the Daily record, the highs and lows by formula, the earlier month, one page', () => {
  const s = Z['xl/worksheets/sheet1.xml'];
  assert.equal(fOf(s, 'B6'), "'Daily record'!B12"); assert.equal(fOf(s, 'E6'), "'Daily record'!F12"); assert.equal(fOf(s, 'H6'), "'Daily record'!H12"); assert.equal(fOf(s, 'K6'), "'Daily record'!K12");
  assert.match(s, /MATCH\(MAX\('Daily record'!F5:F11\),'Daily record'!F5:F11,0\)/);
  assert.match(s, /Oct-26/); assert.match(s, /IVR daily record · November 2026/);
  assert.match(s, /fitToHeight="1"/); assert.match(s, /<drawing r:id="rId1"\/>/);
});
ok('three charts, each reading its cells in the Daily record', () => {
  const d = Z['xl/drawings/drawing1.xml'];
  assert.equal((d.match(/<c:chart /g) || []).length, 3);
  const c1 = Z['xl/charts/chart1.xml'], c2 = Z['xl/charts/chart2.xml'], c3 = Z['xl/charts/chart3.xml'];
  assert.match(c1, /<c:barChart>/); assert.match(c1, /<c:f>'Daily record'!\$B\$5:\$B\$11<\/c:f>/); assert.match(c1, /<c:f>'Daily record'!\$A\$5:\$A\$11<\/c:f>/);
  assert.match(c2, /<c:lineChart>/); assert.match(c2, /'Daily record'!\$F\$5:\$F\$11/); assert.match(c2, /'Daily record'!\$H\$5:\$H\$11/); assert.match(c2, /<c:max val="1"\/>/);
  assert.match(c3, /'Daily record'!\$J\$5:\$J\$11/);
  assert.equal((c1.match(/<c:pt idx=/g) || []).length, 7 + 7 + 1, 'categories, values and the series name cached');
});
ok('Errors by action: the actions that failed, the most errors first, a heat map, the month\'s share', () => {
  const s = Z['xl/worksheets/sheet3.xml'];
  const names = [...s.matchAll(/<c r="A(\d+)"[^>]*t="inlineStr"><is><t[^>]*>([^<]*)<\/t>/g)].filter(m => +m[1] >= 5).map(m => m[2]);
  assert.deepEqual(names.slice(0, 3), ['Customer_Type', 'Survey Rating', 'Check Number']);
  assert.ok(!names.includes('Get Offer'), 'an action that never failed is not listed');
  assert.match(s, /type="colorScale"/); assert.match(s, /SUM\(B5:H5\)/);
});
ok('Error detail: every action every day with the export, red from 5%', () => {
  const s = Z['xl/worksheets/sheet4.xml'];
  assert.equal((s.match(/<row r="(\d+)"/g) || []).length - 3, 6 * 4, 'six days with the export, four actions each');
  assert.match(s, /AND\(ISNUMBER\(\$E5\),\$E5&gt;=0.05\)/);
});
ok('Menus and About', () => {
  assert.match(Z['xl/worksheets/sheet5.xml'], /Outcome, after Main Menu/);
  assert.match(Z['xl/worksheets/sheet6.xml'], /No caller&apos;s number|No caller's number/);
});

(async () => {
  await ready;
  let failed = 0;
  for (const [name, fn] of tests) { try { fn(); console.log('ok', name); } catch (e) { failed++; console.log('NOT OK', name, '\n ', e.message); } }
  console.log(failed ? `${failed} of ${tests.length} checks failed` : `${tests.length} checks passed`);
  if (failed) process.exitCode = 1;
})();
