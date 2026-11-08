// The interaction layer (js/ux.js), in the browser, on the synthetic fixture only:
//  - explanations behind an ⓘ: hover shows, a click pins, Esc closes; status stays on the page; Show guidance (Shift H) puts every
//    explanation back and is remembered after a reload;
//  - keys: ? the sheet, g then a letter a page, [ and ] the month;
//  - steps (Supervisors): one line each, the caption behind its ⓘ, the supervisors' step open, a chevron that remembers, the progress
//    bar and Go to step;
//  - tables: Copy (rich table and tab text), the row filter, Team's copy of every page, a click on a National ID;
//  - Results: Show and its counts, ticks and bulk eligibility (one logged decision each, Undo), copy IDs;
//  - Quality: team tabs, Enter goes down and the cursor survives the redraw, a column pasted is one logged change;
//  - Import: a ready export is one slim line with its Ready chip, the drop zone a slim bar; People opens as the table;
//  - the drawers: Settings' field notes and the scorecards' explanation behind ⓘ, back with Show guidance; a person's status stays;
//  - the Showcase: the idea and the benefits, no word on how files go in or out nor on the WFM team's daily reports; the time back as
//    the team set it (188 hours a month), a number changed live, Reset the hours.
// Usage: node test/ux.cjs [page.html] [outDir] [exportsDir]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'final/Cadence.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const exp = process.argv[4] ? path.resolve(process.argv[4]) : null;
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) { fails++; process.exitCode = 1; } };
const USERS = { admin: { id: 'u0', name: 'Amal R.', username: 'amal.r', role: 'admin' }, senior: { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' } };
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (who, ctx0) => {
    const ctx = ctx0 || await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${who}: ${e.message}`));
    await p.addInitScript(([fx, u]) => {
      eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u;
      window.__copied = ''; window.addEventListener('copy', e => { try { window.__copied = e.clipboardData.getData('text/plain'); } catch (x) { /* none */ } });   // what the page put on the clipboard
    }, [fixture, USERS[who]]);
    await p.goto('file://' + page0); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady, null, { timeout: 20000 });
    await p.evaluate(() => {
      const M = window.__mc, F = window.__FIX__, S = M.state;
      for (const r of F.history['2026-09'].rows) { r.ks = 22; r.ka = r.kat = r.worked; r.kab = r.absent; r.kr = r.absent ? 1 : 0; }
      const rows = {}; S.roster.forEach((p, i) => { if (p.team !== 'OP') rows[p._id] = { n: p.name, kpi: i % 3 ? { qobs: 0.94, emp: 0.93, fcr: 0.92 } : {}, eval: { callqa: 0.94 }, crit: [], qv: 2 }; });
      S.quality['2026-09'] = { csat: 0.85, rows, src: 'EVAL.xlsx', by: 'Quality', at: '2026-10-03T10:00:00Z' }; S.qualityVer++;
      S.history = F.history; S.finals = F.finals; S.histVer++; S.finVer++; S.wsMonth = '2026-09';
      const mem = {}; S.db = { doc: id => ({ set: async v => { mem[id] = v; }, update: async v => { mem[id] = { ...(mem[id] || {}), ...v }; }, get: async () => ({ exists: !!mem[id], data: () => mem[id] }) }) };   // a store in memory: this view has none
    });
    return { p, ctx };
  };

  // ---- 1. the admin: explanations behind ⓘ, guidance, keys
  let { p, ctx } = await open('admin');
  await p.evaluate(() => window.__mc.setWs('results')); await p.waitForTimeout(600);
  const lead = await p.evaluate(() => { const s = document.getElementById('resLead'), b = document.querySelector('#h-results > .uxi'); return { hid: getComputedStyle(s).display === 'none', tip: !!b && b.getAttribute('aria-describedby') === s.id, lab: b && b.getAttribute('aria-label'), text: s.textContent }; });
  ok(lead.hid && lead.tip && /^About Results/.test(lead.lab), `the page's lead is behind the ⓘ on its title (${lead.lab})`);
  const banner = await p.evaluate(() => { const s = document.querySelector('#resultsBody .wsstatus, #resultsBody .banner'); return !!s && getComputedStyle(s).display !== 'none'; });
  ok(banner, 'the month\'s status banner stays on the page');
  await p.hover('#h-results > .uxi'); await p.waitForTimeout(500);
  const hov = await p.evaluate(() => { const el = document.getElementById('uxPop'); return { on: !!el && !el.hidden, text: el ? el.textContent : '' }; });
  ok(hov.on && hov.text === lead.text, 'pointing at the ⓘ shows the explanation');
  await p.mouse.move(700, 700); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('uxPop').hidden), 'and it goes when the pointer leaves');
  await p.click('#h-results > .uxi'); await p.waitForTimeout(200); await p.mouse.move(700, 700); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.getElementById('uxPop').hidden && document.querySelector('#h-results > .uxi').getAttribute('aria-expanded') === 'true'), 'a click pins it (it stays when the pointer leaves)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('uxPop').hidden && document.activeElement === document.querySelector('#h-results > .uxi')), 'Esc closes it and the focus goes back to the ⓘ');
  const ids = await p.evaluate(() => { const L = [...document.querySelectorAll('[id]')].map(e => e.id); return L.filter((x, i) => L.indexOf(x) !== i); });
  ok(!ids.length, `no id twice on the page (${ids.slice(0, 3).join(', ')})`);
  await p.keyboard.press('Shift+H'); await p.waitForTimeout(300);
  const g1 = await p.evaluate(() => ({ cls: document.documentElement.classList.contains('uxguide'), shown: getComputedStyle(document.getElementById('resLead')).display !== 'none', ls: localStorage.getItem('mc-guide') }));
  ok(g1.cls && g1.shown && g1.ls === '1', 'Shift H shows the guidance: the lead is back under the title');
  await p.reload(); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady, null, { timeout: 20000 });
  ok(await p.evaluate(() => document.documentElement.classList.contains('uxguide')), 'the guidance is remembered after a reload');
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09'; M.setWs('dash'); });
  await p.click('#acctBtn'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('#acctMenu [data-uxguide]').getAttribute('aria-checked')) === 'true', 'the account menu\'s Show guidance is on');
  await p.click('#acctMenu [data-uxguide]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.documentElement.classList.contains('uxguide') && !localStorage.getItem('mc-guide')), 'and turns it off');
  await p.keyboard.press('Escape'); await p.mouse.click(700, 600); await p.waitForTimeout(200);
  await p.keyboard.press('?'); await p.waitForTimeout(300);
  const keys = await p.evaluate(() => ({ open: !document.getElementById('dKeys').hidden, rows: [...document.querySelectorAll('#keysBody li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()) }));
  ok(keys.open && keys.rows.some(r => /^Team\s*g\s*t$/.test(r)) && keys.rows.some(r => /Search/.test(r)), `? opens the shortcuts (${keys.rows.length} lines)`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('g'); await p.keyboard.press('t'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => window.__mc.state.ws) === 'team', 'g then t opens Team');
  await p.keyboard.press('g'); await p.keyboard.press('r'); await p.waitForTimeout(500);
  const m0 = await p.evaluate(() => window.__mc.state.wsMonth); await p.keyboard.press('['); await p.waitForTimeout(400);
  const m1 = await p.evaluate(() => window.__mc.state.wsMonth); await p.keyboard.press(']'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__mc.state.ws) === 'results' && m1 < m0 && await p.evaluate(() => window.__mc.state.wsMonth) === m0, `g r opens Results; [ and ] change the month (${m0} → ${m1} → back)`);

  // ---- 2. the steps (Supervisors): one line, the caption behind ⓘ, the chevron, the progress bar
  await p.evaluate(() => window.__mc.setWs('cycle')); await p.waitForSelector('#cycleBody .flow');
  const st = await p.evaluate(() => [...document.querySelectorAll('#cycleBody .flow > .flowstep')].map(x => ({ id: x.id, cap: !!x.querySelector('.stcap.uxsrc'), tip: !!x.querySelector('.stephd h2 > .uxi'), det: !!x.querySelector('.stepdet'), open: x.classList.contains('open') })));
  ok(st.length === 8 && st.every(x => !x.cap || x.tip), 'eight one-line steps; each caption is behind the ⓘ on its title');
  const s4 = st.find(x => x.id === 'st-follow');
  ok(s4 && s4.det && s4.open, 'the supervisors\' step shows its cards (who finished)');
  await p.click('#st-follow .stog'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__mc.renderWs()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('st-follow').classList.contains('shut') && localStorage.getItem('mc-ux-open:st-follow') === '0'), 'the chevron closes it, and it stays closed after the page redraws');
  await p.click('#st-follow .stog'); await p.waitForTimeout(200);
  const bar = await p.evaluate(() => { const f = document.querySelector('#cycleBody .flowbar'); return f ? f.textContent.replace(/\s+/g, ' ').trim() : ''; });
  ok(/\d of 8 done/.test(bar), `the progress bar above the steps: ${bar}`);
  await p.evaluate(() => { const M = window.__mc, C = M.state.cycles['2026-09'] = M.state.cycles['2026-09'] || {}; C.sent = { ...(C.sent || {}), incReview: { at: '2026-10-02T09:00:00Z', by: 'Faisal M.' } }; M.renderWs(); }); await p.waitForTimeout(300);
  const go = await p.$('#cycleBody .flowbar [data-flowgo]');
  if (go) { await go.click(); await p.waitForTimeout(400); ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.matches('.flowstep.next h2'); }), 'Go to step takes the focus to the next step\'s title'); }
  else ok(true, 'no step is next in this month (closed before): no Go to step');
  await p.screenshot({ path: path.join(out, 'ux-steps.png'), fullPage: true });

  // ---- 3. the tables: Copy, the row filter, Team's copy, a click on an ID
  await p.evaluate(() => window.__mc.setWs('results')); await p.waitForTimeout(600);
  const tools = await p.evaluate(() => [...document.querySelectorAll('#resultsBody .card')].map(c => ({ t: (c.querySelector('h2') || {}).textContent || '', copy: !!c.querySelector('[data-uxt="copy"]'), filter: !!c.querySelector('[data-uxt="filter"]') })));
  ok(tools.find(x => /^By team/.test(x.t)).copy && tools.find(x => /^By supervisor/.test(x.t)).copy, `By team and By supervisor have Copy (${tools.filter(x => x.copy).length} cards)`);
  ok(!tools.find(x => /^Every agent/.test(x.t)).filter, 'Every agent has its own search, so no second filter');
  const spvCard = p.locator('#resultsBody .card', { hasText: 'By supervisor' });
  await spvCard.locator('[data-uxt="copy"]').click(); await p.waitForTimeout(300);
  const cp = await p.evaluate(() => window.__copied);
  ok(/^Supervisor\tAgents\tAdherence/.test(cp) && cp.split('\r\n').length > 5, `Copy puts the table on the clipboard, with its headings (${cp.split('\r\n').length} lines)`);
  const hasFilter = await spvCard.locator('[data-uxt="filter"]').count();
  if (hasFilter) {
    await spvCard.locator('[data-uxt="filter"]').click(); await p.keyboard.type('Sara');
    await p.waitForTimeout(300);
    const f = await p.evaluate(() => { const c = [...document.querySelectorAll('#resultsBody .card')].find(x => /^By supervisor/.test(x.querySelector('h2').textContent)); return { shown: [...c.querySelectorAll('tbody tr')].filter(r => !r.classList.contains('uxfoff')).length, count: c.querySelector('.uxfcount').textContent }; });
    ok(f.shown === 1 && /^1 of \d+/.test(f.count), `the row filter: ${f.count}`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.querySelectorAll('#resultsBody tr.uxfoff').length), 'Esc clears the filter');
  } else ok(true, 'a short table has no filter');
  await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(600);
  await p.click('#teamBody [data-tcopy]'); await p.waitForTimeout(300);
  const tc = await p.evaluate(() => ({ lines: window.__copied.split('\r\n').length, n: window.__mc.state.roster.length, head: window.__copied.split('\r\n')[0] }));
  ok(/^#\tAgent\tNational ID\tTeam\tSupervisor/.test(tc.head) && tc.lines > 26, `Team's Copy takes every agent shown, every page (${tc.lines - 1} rows; 25 on a page)`);
  const idEl = p.locator('#teamBody .cpy').first(), idTxt = (await idEl.textContent()).trim();
  await idEl.click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__copied) === idTxt && await p.evaluate(() => document.getElementById('dPerson').hidden), `a click on a National ID copies it (${idTxt}) and does not open the panel`);
  await ctx.close();

  // ---- 4. the senior manager on Results: Show, ticks, bulk eligibility with Undo, copy IDs
  ({ p, ctx } = await open('senior'));
  await p.evaluate(() => window.__mc.setWs('results')); await p.waitForTimeout(600);
  const opts = await p.$$eval('select[data-resshow] option', L => L.map(o => o.textContent));
  ok(opts.length === 6 && /Not eligible · \d+/.test(opts[1]), `Show: ${opts.join(' | ')}`);
  await p.selectOption('select[data-resshow]', 'no'); await p.waitForTimeout(300);
  const nNo = await p.$$eval('#resultsBody .restab tbody tr', L => L.length);
  ok(nNo === +/· (\d+)/.exec(opts[1])[1], `Not eligible shows its ${nNo} agents`);
  const boxes = p.locator('#resultsBody input[data-ressel]:not([data-ressel="*"])');
  await boxes.nth(0).check(); await boxes.nth(1).check(); await p.waitForTimeout(200);
  ok(/2 agents selected/.test(await p.$eval('#resultsBody .bulkbar', el => el.textContent)), 'two ticked: the bar says so');
  const rks = await p.$$eval('#resultsBody input[data-ressel]:checked:not([data-ressel="*"])', L => L.map(x => x.dataset.ressel));
  await p.click('#resultsBody [data-resbulk="ids"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__copied.split('\r\n').length) === 2, 'Copy IDs: their two National IDs');
  await p.click('#resultsBody [data-resbulk="yes"]'); await p.waitForTimeout(400);
  const adj = await p.evaluate(rks => rks.map(rk => (window.__mc.state.finals['2026-09'].adj[rk] || {}).elig), rks);
  ok(adj.every(x => x === true) && /2 agents: eligible/.test(await p.$eval('#toastMsg', el => el.textContent)), 'Eligible: both decided, each change logged, with Undo');
  await p.click('#toastAct'); await p.waitForTimeout(300);
  ok(await p.evaluate(rks => rks.every(rk => !(window.__mc.state.finals['2026-09'].adj || {})[rk]), rks), 'Undo: back to the rules');
  await p.screenshot({ path: path.join(out, 'ux-results.png') });
  await ctx.close();

  // ---- 5. Quality: tabs, Enter and the cursor, a column pasted
  ({ p, ctx } = await open('admin'));
  await p.evaluate(() => window.__mc.setWs('quality')); await p.waitForTimeout(700);
  const tabs = await p.$$eval('#qualityBody [data-qunit]', L => L.map(x => x.dataset.qunit));
  ok(tabs.length >= 3 && await p.$$eval('#qualityBody .qteam', L => L.filter(s => !s.hidden).length) === 1, `one team at a time (${tabs.length - 1} teams and All)`);
  await p.click('#qualityBody [data-qunit="*"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('#qualityBody .qteam', L => L.filter(s => !s.hidden).length) === tabs.length - 1, 'All shows every team');
  await p.click(`#qualityBody [data-qunit="${tabs[0]}"]`); await p.waitForTimeout(300);
  const pids = await p.$$eval('#qualityBody .qteam:not([hidden]) input[data-qk="callqa"]', L => L.slice(0, 4).map(x => x.dataset.qp));
  const first = p.locator(`#qualityBody input[data-qk="callqa"][data-qp="${pids[0]}"]`);
  await first.fill('91'); await first.press('Enter'); await p.waitForTimeout(800);
  ok(await p.evaluate(pid => window.__mc.state.quality['2026-09'].rows[pid].eval.callqa, pids[0]) === 0.91, 'the value is saved');
  ok(await p.evaluate(() => { const a = document.activeElement; return a && a.dataset ? `${a.dataset.qk}|${a.dataset.qp}` : ''; }) === `callqa|${pids[1]}`, 'Enter: the cursor is in the next row\'s box after the page redraws');
  await p.evaluate(pid => { const i = document.querySelector(`#qualityBody input[data-qk="callqa"][data-qp="${pid}"]`); const dt = new DataTransfer(); dt.setData('text/plain', '88\r\n87.5%\r\n86\r\n'); i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, pids[1]);
  await p.waitForTimeout(800);
  const pv = await p.evaluate(P => P.slice(1).map(pid => window.__mc.state.quality['2026-09'].rows[pid].eval.callqa), pids);
  const lastLog = await p.evaluate(() => (window.__mc.state.quality['2026-09'].log || []).slice(-1)[0].what);
  ok(pv.join() === '0.88,0.875,0.86' && /pasted for 3 people/.test(lastLog), `a column pasted: ${pv.join(', ')}, logged once (${lastLog})`);
  await p.evaluate(pid => { const i = document.querySelector(`#qualityBody input[data-qk="callqa"][data-qp="${pid}"]`); const dt = new DataTransfer(); dt.setData('text/plain', '88\r\nabc\r\n'); i.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, pids[1]);
  await p.waitForTimeout(400);
  ok(/Not pasted/.test(await p.$eval('#toastMsg', el => el.textContent)), 'a column with a word in it is refused, nothing changed');
  await p.screenshot({ path: path.join(out, 'ux-quality.png') });

  // ---- 6. Import: slim lines once the exports are in; People opens as the table
  if (exp) {
    await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.histVer++; M.setStep('import'); });
    await p.setInputFiles('#picker', ['Monthly Adherence - Sep.csv', 'Agents Performance Summary.csv', 'Schedule activities.csv', 'Agent Status Timeline Details.csv'].map(f => path.join(exp, f)));
    await p.waitForFunction(() => !window.__mc.state.pending.length && document.querySelectorAll('#slots .slot.ready').length >= 4, null, { timeout: 30000 });
    const imp = await p.evaluate(() => ({ slim: document.querySelectorAll('#slots .slot.slim').length, ready: [...document.querySelectorAll('#slots .slot.slim .pill.good')].filter(x => getComputedStyle(x).display !== 'none').length, drop: document.getElementById('drop').classList.contains('slim'), h: Math.round(document.querySelector('#slots .slot.slim').getBoundingClientRect().height) }));
    ok(imp.slim >= 4 && imp.ready >= 4 && imp.drop && imp.h < 90, `Import: ${imp.slim} exports on slim lines (${imp.h} px), each with its Ready chip; the drop zone a slim bar`);
    await p.evaluate(() => window.__mc.setStep('review')); await p.waitForTimeout(300);
    await p.evaluate(() => window.__mc.setTab('preview')); await p.waitForTimeout(600);
    const hid = await p.evaluate(() => { const c = [...document.querySelectorAll('#preview .card')].find(x => /^Hidden from the reports/.test((x.querySelector('h2') || {}).textContent || '')); if (!c) return null; const L = [...c.querySelectorAll('ul.ilist > li')]; return { n: L.length, shown: L.filter(li => getComputedStyle(li).display !== 'none').length, more: (c.querySelector('.uxmore') || {}).textContent || '' }; });
    ok(!hid || hid.n <= 15 || (hid.shown === 10 && hid.more === `Show all ${hid.n}`), `a long list shows its first 10, then Show all (${hid ? `${hid.shown} of ${hid.n}, "${hid.more}"` : 'no list'})`);
    if (hid && hid.n > 15) { await p.click('#preview .uxmore'); await p.waitForTimeout(200); ok(await p.evaluate(() => [...document.querySelectorAll('#preview ul.ilist > li.uxmoreoff')].length === 0 && document.querySelector('#preview .uxmore').textContent === 'Show fewer'), 'Show all shows every line'); }
    await p.evaluate(() => window.__mc.setTab('people')); await p.waitForTimeout(400);
    ok(await p.evaluate(() => window.__mc.state.pview) === 'table' && await p.evaluate(() => !document.getElementById('roster').closest('[hidden]')), 'Review › People opens as the table');
    await p.screenshot({ path: path.join(out, 'ux-import.png') });
  }
  await ctx.close();

  // ---- 7. the drawers: Settings' field notes and the scorecards' explanation behind ⓘ, Show guidance there too; a person's status stays
  ({ p, ctx } = await open('admin'));
  await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(500);
  const notes = () => p.evaluate(() => { const d = document.getElementById('dSettings'), L = [...d.querySelectorAll('.field > small, .cntrow .cntctl > small')].filter(x => !x.classList.contains('keep'));
    return { n: L.length, hid: L.filter(x => getComputedStyle(x).display === 'none').length, tied: L.filter(x => x.id && d.querySelector(`.uxi[aria-describedby~="${x.id}"]`)).length, tips: d.querySelectorAll('.uxi').length }; });
  await p.click('[data-sb="settings"]'); await p.waitForTimeout(500);
  const sn = await notes();
  ok(sn.n >= 5 && sn.hid === sn.n && sn.tied === sn.n, `Settings: ${sn.n} field notes, each hidden behind its ⓘ (${sn.tips} ⓘ)`);
  const tipFor = await p.evaluate(() => { const b = document.querySelectorAll('#dSettings .uxi')[1]; return document.getElementById(b.getAttribute('aria-describedby').split(' ')[0]).textContent.trim(); });
  await p.hover('#dSettings .uxi >> nth=1'); await p.waitForTimeout(450);
  ok(await p.evaluate(t => { const el = document.getElementById('uxPop'); return !el.hidden && el.textContent.includes(t); }, tipFor), 'pointing at an ⓘ in Settings shows its note');
  const calm = await p.evaluate(() => new Promise(res => {   // a note with no words: its ⓘ hides once, and the page stays still (no pass every frame)
    const sm = document.querySelector('#dSettings .field > small.uxsrc'), keep = sm.textContent; sm.textContent = '';
    setTimeout(() => { const raf = window.requestAnimationFrame; let n = 0; window.requestAnimationFrame = f => { n++; return raf.call(window, f); };
      setTimeout(() => { window.requestAnimationFrame = raf; const hid = document.querySelector(`#dSettings .uxi[aria-describedby~="${sm.id}"]`).hidden; sm.textContent = keep; res({ n, hid }); }, 1000); }, 300);
  }));
  ok(calm.hid && calm.n < 10, `a note emptied: its ⓘ hides and the page stays still (${calm.n} frames asked for in a second)`);
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.keyboard.press('Shift+H'); await p.waitForTimeout(200);
  await p.click('[data-sb="settings"]'); await p.waitForTimeout(500);
  const st2 = await notes();
  ok(st2.n === sn.n && st2.hid === 0, 'with Show guidance, the notes are back under their fields');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.keyboard.press('Shift+H'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__mc.openRules()); await p.waitForSelector('#dScore:not([hidden])'); await p.waitForTimeout(400);
  const sc = await p.evaluate(() => { const d = document.getElementById('dScore'), sub = d.querySelector('header .uxhelp'), b = sub && d.querySelector(`header h2 .uxi[aria-describedby~="${sub.id}"]`);
    return { hid: !!sub && getComputedStyle(sub).display === 'none', tied: !!b, tips: d.querySelectorAll('.uxi').length }; });
  ok(sc.hid && sc.tied && sc.tips >= 6, `KPI scorecards: the header's explanation behind the title's ⓘ (${sc.tips} ⓘ in the drawer)`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.locator('#teamBody [data-open]').first().click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const h = [...document.querySelectorAll('#dPerson p.hint')].find(x => /Days \d+ of \d+/.test(x.textContent)); return !!h && getComputedStyle(h).display !== 'none'; }), 'a person\'s panel keeps its status line on view');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  // ---- 8. the Showcase: the idea and what Member Care gets, never how files go in or out nor the WFM team's daily reports; the time
  // back as the team set it (5 h a day, 3 h a day, six people at 2 h a month), a change and the reset
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector('#showBody .shsec');
  const sh = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#showBody .shsec')].map(s => s.getAttribute('aria-label')), text: document.getElementById('showBody').innerText }));
  ok(sh.secs.join(' | ') === 'Cadence | The challenge | The idea | What Member Care gets | Every role | Today\'s data | Trust | What changes | What it gives back | What\'s next', `the Showcase: ${sh.secs.join(' · ')}`);
  const mech = sh.text.match(/\b(import\w*|export\w*|drop|upload\w*|html|common folder|edge|chrome|phones?)\b/gi) || [];
  ok(!mech.length, `the Showcase never explains how files go in or out${mech.length ? ` (${mech.slice(0, 5).join(', ')})` : ''}`);
  const daily = sh.text.match(/\b(daily|report builder|brand emails?|daily review)\b/gi) || [];
  ok(!daily.length, `and never the WFM team's daily reports${daily.length ? ` (${daily.slice(0, 3).join(', ')})` : ''}`);
  const tb = () => p.evaluate(() => ({ give: document.getElementById('showGive').innerText.replace(/\s+/g, ' '), mo: [...document.querySelectorAll('[data-givemo]')].map(x => x.textContent).join(', '),
    roles: [...document.querySelectorAll('#showBody .shctab tbody th')].map(x => x.textContent).join(', ') }));
  const t0 = await tb();
  ok(t0.roles === 'WFM analyst, WFM manager, QA supervisor, QA manager, CT supervisor, CT manager, TS supervisor, TS manager' && t0.mo === '110 h, 66 h, 2 h, 2 h, 2 h, 2 h, 2 h, 2 h'
    && /\b188 hours back a month/.test(t0.give) && /2,256 hours back a year/.test(t0.give) && /282 working days back a year/.test(t0.give) && /1\.1 full-time people/.test(t0.give),
    `Time back as set: 5 h a day, 3 h a day, six people at 2 h a month = 188 h a month, 2,256 a year, 282 working days (${t0.mo})`);
  ok(/188 hours a month/.test(await p.evaluate(() => document.querySelector('#showBody .sh-gets .shcard').innerText)), 'the first benefit says the 188 hours');
  await p.fill('[data-give="0"]', '0'); await p.waitForTimeout(200);
  const t1 = await tb();
  ok(/\b78 hours back a month/.test(t1.give) && /44% of a full-time person/.test(t1.give) && t1.mo.startsWith('0 h, 66 h'), `a number changed live: the totals follow (${(/(\d[\d,]*) hours back a month/.exec(t1.give) || [])[1]} h a month)`);
  await p.click('[data-givereset]'); await p.waitForTimeout(200);
  const t2 = await tb();
  ok(/\b188 hours back a month/.test(t2.give) && await p.$eval('[data-give="0"]', x => x.value) === '5', 'Reset the hours puts the set hours back');
  await ctx.close();
  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(fails ? `${fails} failed` : 'all passed');
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
