// The deduction email's Absenteeism table (card look) in the browser, made-up people only: with 26 people absent over the whole
// month and long names, every cell stays on one line (no "Abse/nt", no name over three lines): fixed column widths, each row the
// height of one line, nothing overflowing its cell, each cell's colour as bgcolor too (Outlook paints the whole cell), and the card
// as wide as the table needs; with a few absences it stays 600pt.
// Usage: node test/absgrid.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out = 'test/shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  /** the email's HTML with n made-up people, absent on the days the pattern gives */
  const mail = (n, every) => p.evaluate(([n, every]) => {
    const M = window.__mc, S = M.state, first = ['Abdulrahman', 'Mohammed', 'Khaled', 'Nawaf', 'Saleh', 'Fahad', 'Ayman', 'Thamer'], last = ['Testname', 'Samplename', 'Exampleson'];
    const rows = Array.from({ length: n }, (_, i) => { let d = ''; for (let k = 1; k <= 30; k++) d += every ? ((k * 7 + i * 3) % 11 === 0 ? 'X' : k % 7 === 4 ? 'O' : 'A') : (k === 3 + i ? 'X' : 'A'); return { id: String(1100000001 + i * 97), n: `${first[i % 8]} ${['Abdulaziz', 'Ali', 'Waleed'][i % 3]} ${last[i % 3]}${i % 5 === 0 ? ' Alqahtani' : ''}`, brand: 'Virgin', team: 'CC', d, ded: 10 + i }; });
    S.history['2026-09'] = { y: 2026, m: 9, rows, tool: true, at: new Date().toISOString() }; S.histVer++; S.wsMonth = '2026-09'; S.mailSrc = 'shared'; S.mailKind = 'ded'; S.mailStage = 'review'; S.mail.classic = false;
    return M.curMail().html('', true);
  }, [n, every]);
  const look = async (html, file, vw) => {
    fs.writeFileSync(path.join(out, file), html);
    const q = await (await b.newContext({ viewport: { width: vw, height: 900 } })).newPage(); await q.goto('file://' + path.resolve(out, file));
    const r = await q.evaluate(() => {
      const T = [...document.querySelectorAll('table')].filter(t => t.rows[0] && t.rows[0].cells.length > 3 && /Total/.test(t.rows[0].textContent) && /Sep/.test(t.rows[0].textContent)).pop();
      const card = [...document.querySelectorAll('table')].find(t => /pt/.test(t.style.width) && t.querySelector('td') && /Monthly Deduction/.test(t.textContent) && t.style.background);
      if (!T) return null;
      const cells = [...T.querySelectorAll('td')], hs = [...T.rows].slice(1).map(tr => tr.getBoundingClientRect().height);
      return { cols: T.rows[0].cells.length, rows: T.rows.length - 1, minH: Math.min(...hs), maxH: Math.max(...hs), over: cells.filter(td => td.scrollWidth > td.clientWidth + 1).length,
        multi: cells.filter(td => { const sp = td.querySelector('span'); return sp && sp.getClientRects().length > 1; }).length, fixed: T.style.tableLayout, widthAttr: +T.getAttribute('width'),
        bg: cells.every(td => td.getAttribute('bgcolor')), nowrap: cells.every(td => td.hasAttribute('nowrap')), absent: cells.filter(td => /Absent/.test(td.textContent) && td.getAttribute('bgcolor') === '#FEE2E2').length,
        cardW: card ? parseFloat(card.style.width) : null };
    });
    if (vw === 1440) await q.screenshot({ path: path.join(out, file.replace('.html', '.png')), fullPage: true });
    await q.close(); return r;
  };
  // the whole month: 26 people, long names, absences on every one of the 30 days
  const H = await mail(26, true);
  for (const vw of [1440, 1024]) {
    const r = await look(H, 'absgrid-month.html', vw);
    ok(r && r.cols === 33 && r.rows === 26, `${vw}px: ID, Name, Total Absent and 30 days, 26 people (${r && r.cols} columns)`);
    ok(r && r.multi === 0 && r.over === 0 && r.maxH - r.minH < 2, `${vw}px: every cell on one line, nothing overflowing, every row one line high (${r && r.minH.toFixed(0)}–${r && r.maxH.toFixed(0)}px)`);
  }
  const r = await look(H, 'absgrid-month.html', 1440);
  ok(r.fixed === 'fixed' && r.widthAttr > 1500 && r.nowrap, `fixed column widths (${r.widthAttr}px), nowrap on every cell`);
  ok(r.bg && r.absent > 26, `each cell's colour as bgcolor too; the absent days red (${r.absent})`);
  ok(r.cardW > 1000, `the card as wide as the table needs (${r.cardW}pt)`);
  // a few absences: two dates, and the card stays 600pt
  const r2 = await look(await mail(2, false), 'absgrid-few.html', 1440);
  ok(r2 && r2.cols === 5 && r2.multi === 0 && r2.cardW === 600, `a few absences: ${r2 && r2.cols} columns, one line each, the card 600pt (${r2 && r2.cardW})`);
  // the plain text is as it was
  const txt = await p.evaluate(() => window.__mc.curMail().text);
  ok(/Absenteeism :/.test(txt) && /ID\tName\tTotal Absent\t3-Sep\t4-Sep/.test(txt), 'the plain text keeps its tab-separated table');
  ok(!errs.length, `no errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
