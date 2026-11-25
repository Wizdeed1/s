// HR's joining dates in the browser, with made-up people (test/fixture.js): a workbook laid out as HR's hire date file (Full Name,
// Colleague ID on SF, National ID, New Username, First / Middle / Last Name, Position, Hire Date), formatted down to row 100,000,
// dropped on People › Import roster. Only the joining dates change: found by National ID (a new date, a changed date, one already
// right), by the full name, by the first and last name, by a name spelt another way, by the email; a name with another National ID
// is two people; a person not on the roster is not added; a row twice and a row without a date. Save, then Undo puts every date
// back. Recognise files says what the file is and sends it to the same preview; WFM team › Import does too.
// Usage: node test/joining.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const Core = require(path.join(__dirname, '..', 'js', 'core.js'));
const page0 = path.resolve(process.argv[2] || 'out/mc.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };

/** a workbook as HR writes it: inline strings, the hire date an Excel date, every row down to `last` formatted in C and D */
async function hrBook(rows, last) {
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cell = (r, c, v) => (v == null || v === '' ? '' : typeof v === 'number' ? `<c r="${c}${r}"${c === 'I' ? ' s="1"' : ''}><v>${v}</v></c>` : `<c r="${c}${r}" t="inlineStr"><is><t>${xe(v)}</t></is></c>`);
  const X = rows.map((row, i) => `<row r="${i + 1}">${row.map((v, j) => cell(i + 1, String.fromCharCode(65 + j), v)).join('')}</row>`);
  for (let r = rows.length + 1; r <= last; r++) X.push(`<row r="${r}" spans="3:4"><c r="C${r}" s="2"/><c r="D${r}" s="2"/></row>`);
  return Buffer.from(await Core.writeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="m/d/yyyy"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="0"/></cellXfs></styleSheet>' },
    { name: 'xl/worksheets/sheet1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:I${last}"/><sheetData>${X.join('')}</sheetData></worksheet>` }]));
}
const serial = d => Core.ymdSerial(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10));
const rx = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u2', name: 'Huda W.', username: 'huda.w', role: 'user' }; }, [fixture]);
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);

  // nine people of the made-up roster, as the cases need them
  const W = await p.evaluate(() => {
    const S = window.__mc.state, V = S.roster.filter(x => x.brand === 'Virgin' && x.team === 'CC' && x.status !== 'Inactive').slice(0, 10);
    const [A, B, C, D, E, F, G, H, K] = V;
    B.joined = '2020-01-01'; C.joined = '2024-05-05';
    D.nid = ''; E.nid = ''; F.nid = ''; G.nid = '';
    F.name = 'Yousef Example'; G.email = 'g.test@example.com';
    S.ver++;
    const o = x => ({ id: x._id, name: x.name, nid: String(x.nid || ''), joined: x.joined || '' });
    return { A: o(A), B: o(B), C: o(C), D: o(D), E: o(E), F: o(F), G: o(G), H: o(H), K: o(K), before: S.roster.filter(x => x.joined).length, n: S.roster.length };
  });
  const [eFirst, eLast] = W.E.name.split(' ');
  const rows = [['Full Name', 'Colleague ID on SF', 'National ID', 'New Username', 'First Name', 'Middle Name', 'Last Name', 'Position', 'Hire Date'],
    [W.A.name, 90000001, +W.A.nid, 'a.test@example.com', '', '', '', 'Member Care Champion', serial('2025-02-01')],              // by ID: a new date
    [W.B.name, 90000002, +W.B.nid, 'b.test@example.com', '', '', '', 'Member Care Champion', serial('2025-06-15')],              // by ID: changed
    [W.C.name, 90000003, +W.C.nid, 'c.test@example.com', '', '', '', 'Member Care Champion', serial('2024-05-05')],              // by ID: already right
    [W.D.name, 90000004, 1999999901, 'd.test@example.com', '', '', '', 'Member Care Champion', serial('2023-09-10')],            // by the full name (no ID on the roster)
    [`${eFirst} Zed ${eLast}`, 90000005, 1999999902, 'e.test@example.com', eFirst, 'Zed', eLast, 'Member Care Champion', serial('2026-01-18')],   // first and last name
    ['Yousif Example', 90000006, 1999999903, 'f.test@example.com', 'Yousif', '', 'Example', 'Member Care Champion', serial('2022-11-03')],   // spelt another way
    ['Someone Else Z.', 90000007, 1999999904, 'G.Test@example.com', 'Someone', 'Else', 'Z.', 'Member Care Champion', serial('2021-04-04')],  // by the email
    [W.H.name, 90000008, 1999999905, 'h.test@example.com', '', '', '', 'Member Care Champion', serial('2019-08-08')],            // same name, another ID
    ['Nobody N.', 90000009, 1999999906, 'n.test@example.com', 'Nobody', '', 'N.', 'Group VP Member Care', serial('2014-07-20')],   // not on the roster
    [W.A.name, 90000010, +W.A.nid, 'a.test@example.com', '', '', '', 'Member Care Champion', serial('2018-01-01')],              // A again
    [W.K.name, 90000011, +W.K.nid, 'k.test@example.com', '', '', '', 'Member Care Champion', ''],                                   // no date
    ['X"><img src=x onerror="top.__x=1">', 90000012, 1999999907, 'x@example.com', 'X', '', 'Y', '<b onmouseover="top.__x=2">Lead</b>', serial('2020-02-02')]];   // a name that looks like HTML
  const file = path.join(out, 'MC_hire_date_test.xlsx');
  fs.writeFileSync(file, await hrBook(rows, 100000));

  // People › Import roster: the preview of the joining dates only
  const t0 = Date.now();
  await p.setInputFiles('#rosterPicker', file);
  await p.waitForSelector('#dConfirm:not([hidden]) #confirmOk', { timeout: 30000 });
  const ms = Date.now() - t0;
  const pv = await p.evaluate(() => ({ h: document.getElementById('h-confirm').textContent, body: document.getElementById('confirmBody').textContent.replace(/\s+/g, ' '), btn: document.getElementById('confirmOk').textContent, dis: document.getElementById('confirmOk').disabled, minis: [...document.querySelectorAll('#confirmBody .minis b')].map(x => x.textContent).join(' ') }));
  const inj = await p.evaluate(() => ({ x: window.__x, el: document.querySelectorAll('#confirmBody img, #confirmBody b[onmouseover]').length, txt: document.getElementById('confirmBody').textContent.includes('X"><img src=x onerror="top.__x=1">') }));
  ok(inj.x === undefined && inj.el === 0 && inj.txt, 'a name and a position that look like HTML stay text in the preview (nothing runs, no element from the file)');
  ok(pv.h === 'Joining dates' && pv.minis === '5 1 1 2' && /^Save 6 joining dates$/i.test(pv.btn) && !pv.dis,
    `the file is read as HR's joining dates, formatted down to row 100,000, in ${ms} ms: 5 new dates, 1 changed, 1 already right, 2 not on the roster ("${pv.btn}"; ${pv.minis})`);
  const has = re => re.test(pv.body) || (console.log('    the preview says: ' + pv.body), false);
  ok(has(/From MC_hire_date_test\.xlsx: 12 people with hire dates\. Only the joining date changes\./), '  it says only the joining date changes');
  ok(has(new RegExp(`Joining date added · 5\\s*${rx(W.A.name)}1 Feb 2025`)) && has(/Yousef Example3 Nov 2022 · similar name: “Yousif Example” in the file/)
    && has(new RegExp(`${rx(W.E.name)}18 Jan 2026 · found by name: “${rx(`${eFirst} Zed ${eLast}`)}” in the file`)) && has(new RegExp(`${rx(W.G.name)}4 Apr 2021 · found by email`)) && has(new RegExp(`${rx(W.D.name)}10 Sep 2023 · found by name`)),
    '  added: by National ID, by the full name, by the first and last name, by a name spelt another way, by the email (each says how)');
  ok(has(new RegExp(`Joining date changed · 1\\s*${rx(W.B.name)}1 Jan 2020 → 15 Jun 2025`)), '  changed: the old date and the new one');
  ok(has(/Not on the roster · 2\s*Not added: the roster stays as it is\..*Nobody N\.Group VP Member Care · ID 1999999906/), '  not on the roster: listed with the position, not added');
  ok(has(new RegExp(`Same name, another National ID · 1\\s*Not changed: these look like two different people\\.${rx(W.H.name)}the file says ID 1999999905; ${rx(W.H.name)} on the roster has ${W.H.nid}`)), '  a name that finds someone with another National ID: two people, nothing changes');
  ok(has(new RegExp(`In the file twice · 1\\s*${rx(W.A.name)}${rx(W.A.name)}: the first row is used`)) && has(new RegExp(`No date in the file · 1\\s*${rx(W.K.name)}nothing changes`)) && has(/Still without a joining date · \d+\s*Active people on the roster who are not in this file, Virgin first\. Months in the job is not checked for them\.(\S+ \S+Virgin · [A-Z]{2}){8}and \d+ more/),
    '  a row twice (the first used), a row without a date (nothing changes), and who still has no joining date');
  ok(has(/Names, National IDs, brands and teams stay as they are, and nobody is added or taken off\./), '  names, IDs, brands and teams stay as they are');
  await p.screenshot({ path: path.join(out, 'joining-preview.png') });
  const drawer = await p.$('#dConfirm'); if (drawer) await drawer.screenshot({ path: path.join(out, 'joining-drawer.png') });

  // Save: the dates, nothing else; then Undo
  const snap = () => p.evaluate(ids => { const S = window.__mc.state; return { n: S.roster.length, of: Object.fromEntries(Object.entries(ids).filter(([, w]) => w && w.id).map(([k, w]) => { const x = S.roster.find(y => y._id === w.id); return [k, { joined: x.joined || '', name: x.name, nid: String(x.nid || '') }]; })) }; }, W);
  await p.click('#confirmOk');
  await p.waitForFunction(id => window.__mc.state.roster.find(x => x._id === id).joined === '2025-02-01', W.A.id, { timeout: 5000 });
  const s1 = await snap(), toast1 = await p.evaluate(() => ({ m: document.getElementById('toastMsg').textContent, a: document.getElementById('toastAct').hidden ? '' : document.getElementById('toastAct').textContent }));
  const J = k => s1.of[k].joined;
  ok(J('A') === '2025-02-01' && J('B') === '2025-06-15' && J('C') === '2024-05-05' && J('D') === '2023-09-10' && J('E') === '2026-01-18' && J('F') === '2022-11-03' && J('G') === '2021-04-04' && J('H') === '' && J('K') === '',
    `saved: ${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'].map(k => k + ' ' + (J(k) || '–')).join(', ')}`);
  ok(s1.n === W.n && Object.keys(W).filter(k => W[k] && W[k].id).every(k => s1.of[k].name === W[k].name && s1.of[k].nid === W[k].nid), `  nobody added (${s1.n} on the roster), no name or National ID changed`);
  ok(/^Joining dates saved for 6 people from MC_hire_date_test\.xlsx\.$/.test(toast1.m) && toast1.a === 'Undo', `  the toast: "${toast1.m}" ${toast1.a ? 'with Undo' : 'without Undo'}`);
  await p.click('#toastAct');
  await p.waitForFunction(id => !window.__mc.state.roster.find(x => x._id === id).joined, W.A.id, { timeout: 5000 });
  const s2 = await snap();
  ok(s2.of.A.joined === '' && s2.of.B.joined === '2020-01-01' && s2.of.C.joined === '2024-05-05' && s2.of.F.joined === '' && s2.of.G.joined === '', 'Undo: every date back as it was (B 1 Jan 2020 again)');

  // Recognise files: what it is, and Use it for… the same preview
  await p.setInputFiles('#recogPicker', file);
  await p.waitForSelector('#dRecog:not([hidden]) [data-ruse="0|joining"]', { timeout: 30000 });
  const rc = await p.evaluate(() => ({ card: document.getElementById('recogBody').textContent.replace(/\s+/g, ' '), use: document.querySelector('[data-ruse="0|joining"]').textContent }));
  ok(/HR's joining dates \(a hire date for each person\)/.test(rc.card) && /Name and National ID with the date each joined \(Hire Date\)/.test(rc.card) && /Use it for: the joining dates on the roster/i.test(rc.use),
    `Recognise files: "HR's joining dates", why, and "${rc.use}"`);
  await p.click('[data-ruse="0|joining"]');
  await p.waitForSelector('#dConfirm:not([hidden]) #confirmOk:not([disabled])', { timeout: 30000 });
  ok(await p.$eval('#h-confirm', el => el.textContent) === 'Joining dates' && /^Save 6 joining dates$/i.test(await p.$eval('#confirmOk', el => el.textContent)), '  Use it for… opens the same preview');
  await p.keyboard.press('Escape');

  // WFM team › Import: not a file of the month, so Recognise files offers it to the roster
  await p.evaluate(() => { const M = window.__mc; M.state.ws = 'build'; M.setWs('build'); });
  await p.setInputFiles('#picker', file);
  await p.waitForSelector('#dRecog:not([hidden]) [data-ruse$="|joining"]', { timeout: 30000 });
  ok(true, 'WFM team › Import: the file opens Recognise files with "Use it for: the joining dates on the roster"');

  if (errs.length) { console.log(errs.join('\n')); process.exitCode = 1; } else console.log('no errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
