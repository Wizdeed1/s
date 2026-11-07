// The meeting kit's demo file (tools/meeting/make_demo.py) and the admin's meeting tools, in a real browser:
// 1. the demo opens on any computer as a made-up admin on the made-up September 2026 close (Thursday 8 October), light, with the
//    demo note; nothing is written to the browser: another page of the same browser finds no stored key and no database
// 2. no KPI file anywhere: the KPIs are worked out in the tool, so neither the bell nor Import asks for one
// 3. the bell: a line with Mark done and Open keeps both buttons whole, side by side
// 4. Results › How explains the month on screen (each KPI from the quality numbers), not the month in Build
// 5. View as an agent: their own page from the made-up months, the National ID hidden
// 6. the Showcase: ten sections and "6 months of history"; What it gives back adds up the room's numbers; Clear empties them
// 7. the presenter's keys: S (with + and -), Z, Esc; Esc with the spotlight on does not end the presentation
// 8. Import: the four made-up Genesys exports, read and checked
// Usage: node test/meeting.cjs demo.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [demo, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(demo)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady && Object.keys(window.__mc.state.history || {}).length > 0, null, { timeout: 15000 });
  await p.waitForTimeout(600);

  // ---- 1. the demo
  const d = await p.evaluate(() => ({ ws: window.__mc.state.ws, theme: document.documentElement.dataset.theme, dash: document.getElementById('dashBody').innerText,
    pill: (document.querySelector('.demopill') || {}).textContent || '', role: window.__mc.state && document.querySelector('#acctMenu') ? 1 : 0, months: Object.keys(window.__mc.state.history).length }));
  ok(d.ws === 'dash' && /Thursday 8 October 2026/.test(d.dash) && /Showing Sep 2026/.test(d.dash) && d.months === 6, `the demo opens on the dashboard: the September 2026 close on Thursday 8 October, ${d.months} made-up months`);
  ok(d.theme === 'light' && /made-up people/.test(d.pill) && /nothing is saved/.test(d.pill), `light for the projector, with the note "${d.pill}"`);
  await p.screenshot({ path: path.join(out, 'meeting-demo.png') });

  // ---- 2 and 3. the bell: no KPI file, whole buttons
  await p.click('#bell'); await p.waitForTimeout(500);
  const bell = await p.evaluate(() => {
    const L = [...document.querySelectorAll('.tlist li')], two = L.filter(li => li.querySelectorAll('.tacts .btn').length === 2);
    const whole = two.every(li => { const [a, c] = [...li.querySelectorAll('.tacts .btn')].map(x => x.getBoundingClientRect()); return a.width > 40 && c.width > 40 && Math.abs(a.top - c.top) < 2 && c.left > a.right; });
    return { n: L.length, two: two.length, whole, kpi: /KPI file/i.test(document.getElementById('dNotes').innerText) };
  });
  ok(bell.n > 0 && !bell.kpi, `the bell: ${bell.n} lines, none asks for a KPI file`);
  ok(bell.two > 0 && bell.whole, `  ${bell.two} lines with Mark done and Open: both whole, side by side`);
  await p.screenshot({ path: path.join(out, 'meeting-bell.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);

  // ---- 4. Results › How: the month on screen
  await p.evaluate(() => window.__mc.setWs('results')); await p.waitForTimeout(700);
  const howBtn = p.locator('[data-how]:visible').first(), howK = await howBtn.getAttribute('data-howk');
  await howBtn.click(); await p.waitForTimeout(500);
  const how = await p.evaluate(() => document.getElementById('howBody').innerText);
  ok(howK === '2026-09' && /DRC-CSAT/.test(how) && /Quality Observations/.test(how) && /Final %/.test(how) && !/No KPI results/.test(how), `Results › How explains ${howK}: each KPI from the quality numbers, then the final %`);
  const fitHow = await p.evaluate(() => { const b = document.querySelector('#dHow .body'); return { ok: b.scrollWidth <= b.clientWidth + 1, marks: [...document.querySelectorAll('#dHow .howchk li')].every(li => getComputedStyle(li, '::before').content === 'none' && (li.textContent.match(/[✓✗]/g) || []).length <= 1) }; });
  ok(fitHow.ok && fitHow.marks, '  the How drawer fits its width (nothing scrolls sideways), and each line of Who earns it has one mark');
  await p.screenshot({ path: path.join(out, 'meeting-how.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // the agent's panel (Team › a row) with How this was counted open: the KPI table fits the 600 px panel, the text wraps inside it
  await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(500);
  await p.locator('#teamBody [data-open]').first().click(); await p.waitForTimeout(600);
  const fitP = await p.evaluate(() => { const dr = document.getElementById('dPerson'), d = dr.querySelector('details.howdet'); if (!d) return null; d.open = true;
    const b = dr.querySelector('.body'), t = d.querySelector('.howtab table'), right = dr.getBoundingClientRect().right;
    return { panel: b.scrollWidth <= b.clientWidth + 1, table: t.getBoundingClientRect().right <= right, text: [...d.querySelectorAll('p')].every(x => x.getBoundingClientRect().right <= right) }; });
  ok(fitP && fitP.panel && fitP.table && fitP.text, `  the agent's panel with How this was counted open: ${fitP ? 'no sideways scroll, the table and the text inside it' : 'no How'}`);
  await p.screenshot({ path: path.join(out, 'meeting-person-how.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);

  // ---- 6. the Showcase and What it gives back
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector('#showBody .sh-gives');
  const sh = await p.evaluate(() => ({ n: document.querySelectorAll('#showBody .shsec').length, strip: document.getElementById('showStrip').innerText, give: document.getElementById('showGive').innerText }));
  ok(sh.n === 10 && /6 months of history/.test(sh.strip) && (sh.give.match(/–/g) || []).length >= 3, `the Showcase: ${sh.n} sections, "6 months of history", What it gives back empty until the room's numbers are typed`);
  await p.evaluate(() => document.querySelector('#showBody .sh-gives').scrollIntoView({ block: 'start' }));
  for (const [f, v] of [['0:n', '3'], ['0:a', '40'], ['0:b', '12'], ['3:n', '12'], ['3:a', '10'], ['3:b', '3']]) await p.fill(`[data-give="${f}"]`, v);
  const give = await p.evaluate(() => document.getElementById('showGive').innerText);
  ok(/168\s*hours back a month/.test(give) && /2,016\s*hours back a year/.test(give) && /252\s*working days back a year/.test(give), 'What it gives back: 3 analysts (40 → 12 h) and 12 supervisors (10 → 3 h) give 168 hours a month, 2,016 a year, 252 working days');
  await p.screenshot({ path: path.join(out, 'meeting-gives.png') });
  await p.click('[data-giveclear]'); await p.waitForTimeout(100);
  const cleared = await p.evaluate(() => ({ t: document.getElementById('showGive').innerText, v: [...document.querySelectorAll('[data-give]')].every(x => x.value === '') }));
  ok(cleared.v && (cleared.t.match(/–/g) || []).length >= 3, '  Clear the numbers empties every box and the totals');

  // ---- 7. the presenter's keys
  await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); }); await p.mouse.move(700, 420);
  await p.keyboard.press('s'); await p.waitForTimeout(60);
  const s1 = await p.evaluate(() => { const e = document.querySelector('.mcspot'); return e ? { r: e.style.getPropertyValue('--sr'), x: e.style.getPropertyValue('--sx') } : null; });
  await p.keyboard.press('+'); const s2 = await p.evaluate(() => document.querySelector('.mcspot').style.getPropertyValue('--sr'));
  await p.keyboard.press('-'); await p.keyboard.press('-'); const s3 = await p.evaluate(() => document.querySelector('.mcspot').style.getPropertyValue('--sr'));
  await p.screenshot({ path: path.join(out, 'meeting-spot.png') });
  await p.keyboard.press('Escape'); const s4 = await p.evaluate(() => !document.querySelector('.mcspot'));
  ok(s1 && s1.r === '170px' && s1.x === '700px' && s2 === '200px' && s3 === '140px' && s4, `S: a spotlight at the pointer (${s1 && s1.r}), + and - change its size (${s2}, ${s3}), Esc takes it off`);
  await p.click('.shtop [data-showpresent]'); await p.waitForTimeout(250); await p.mouse.move(600, 400);
  await p.keyboard.press('s'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  const pr = await p.evaluate(() => ({ on: document.body.classList.contains('presenting'), spot: !!document.querySelector('.mcspot') }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(pr.on && !pr.spot && await p.evaluate(() => !document.body.classList.contains('presenting')), '  while presenting, Esc first takes the spotlight off; the next Esc ends the presentation');
  await p.evaluate(() => window.__mc.setWs('dash')); await p.waitForTimeout(300); await p.mouse.move(420, 300);
  await p.keyboard.press('z'); await p.waitForTimeout(80);
  const z1 = await p.evaluate(() => ({ on: document.documentElement.classList.contains('mczoom'), t: document.body.style.transform, o: document.body.style.transformOrigin }));
  await p.mouse.move(900, 500); await p.waitForTimeout(80); const z2 = await p.evaluate(() => document.body.style.transformOrigin);
  await p.screenshot({ path: path.join(out, 'meeting-zoom.png') });
  await p.keyboard.press('Escape'); const z3 = await p.evaluate(() => !document.documentElement.classList.contains('mczoom') && !document.body.style.transform);
  ok(z1.on && z1.t === 'scale(1.8)' && z1.o === '420px 300px' && z2 === '900px 500px' && z3, `Z: a zoom where the pointer is (${z1.o}, then ${z2} as it moves); Esc takes it off`);

  // ---- 5. View as an agent
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector('#showBody [data-vapick="agent"]');
  await p.evaluate(() => { const c = document.querySelector('#showBody [data-vago="agent"]').closest('.shrole'), s = c.querySelector('[data-vapick]'); s.selectedIndex = 3; s.dispatchEvent(new Event('change', { bubbles: true })); c.querySelector('[data-vago]').click(); });
  await p.waitForFunction(() => window.__mc.state.ws === 'me' && window.__mc.state.me && window.__mc.state.me.prof, null, { timeout: 10000 });
  await p.waitForTimeout(400);
  const me = await p.evaluate(() => ({ months: Object.keys(window.__mc.state.me.months).length, body: document.getElementById('meBody').innerText, viewing: window.__mc.viewing() }));
  ok(me.viewing && me.months === 6 && /Draft · Sep 2026/.test(me.body) && /•{10}/.test(me.body) && !/\b1\d{9}\b/.test(me.body), `View as an agent: their own page, ${me.months} months (September a draft), the National ID hidden`);
  await p.screenshot({ path: path.join(out, 'meeting-agent.png') });
  await p.click('#viewBar [data-vbback]'); await p.waitForTimeout(300);

  // ---- 8. Import: the made-up exports
  await p.evaluate(() => { window.__mc.setWs('build'); window.__mc.setStep('import'); }); await p.waitForTimeout(400);
  const imp0 = await p.evaluate(() => document.getElementById('v-import').innerText);
  ok(!/KPI file/i.test(imp0), 'Import does not ask for a KPI file');
  const files = ['Monthly Adherence - Sep.csv', 'Agents Performance Summary.csv', 'Schedule activities.csv', 'Agent Status Timeline Details.csv'].map(f => path.join(exp, f));
  await p.setInputFiles('#picker', files);
  await p.waitForFunction(() => /Read Agent Status Timeline/.test(document.getElementById('v-import').innerText) && document.querySelectorAll('#v-build .slot .pill.ok, #v-build .slot [class*="ready"]').length >= 0, null, { timeout: 20000 });
  await p.waitForTimeout(800);
  const imp = await p.evaluate(() => ({ t: document.getElementById('v-import').innerText, ready: (document.getElementById('v-import').innerText.match(/\bReady\b/g) || []).length }));
  ok(imp.ready >= 4 && /Read Schedule/.test(imp.t) && /Read Agent Performance Summary/.test(imp.t), `Import: the four made-up Genesys exports read (${imp.ready} ready)`);
  await p.screenshot({ path: path.join(out, 'meeting-import.png') });

  // ---- 1 (end). nothing written to the browser
  const blank = path.join(out, 'blank.html'); fs.writeFileSync(blank, '<!doctype html><title>blank</title>');
  const q = await ctx.newPage(); await q.goto('file://' + blank);
  const st = await q.evaluate(async () => ({ keys: Object.keys(localStorage), dbs: indexedDB.databases ? (await indexedDB.databases()).map(x => x.name) : [] }));
  ok(!st.keys.length && !st.dbs.length, `nothing written to the browser: ${st.keys.length} stored keys, ${st.dbs.length} databases on another page`);

  ok(!errs.length, errs.length ? 'page errors: ' + errs.slice(0, 4).join(' | ') : 'no page errors');
  await b.close();
  console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
