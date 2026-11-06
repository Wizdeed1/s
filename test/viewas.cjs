// The admin's View as and the Showcase, on a data folder the browser keeps for the page (the synthetic roster):
// 1. The admin's pages end with the Showcase: its ten sections, the line figures drawn as they come into view, Present (one
//    section at a time, the arrow keys, the speaker notes on N, Esc to end).
// 2. View as each role from the Showcase: that role's own pages (no Showcase among them), the banner, Back to Admin on the Showcase.
// 3. A supervisor sees their own team only; an agent's page loads for the agent chosen. National IDs are hidden while viewing
//    (on the page, in a preview, in an ID field) and show again after Back to Admin.
// 4. Nothing is saved while viewing: a write to the folder is refused (code "preview"), queueWrite keeps nothing to try again and
//    the save line shows no error; the record is not in the folder. After Back to Admin writes go through again, and the refused
//    change is said, with Reload.
// 5. The account menu: View as another role for the admin; while viewing, Back to Admin, and no Manage accounts.
// 6. Only the admin: a supervisor cannot start a preview or open the Showcase.
// Usage: node test/viewas.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0)), fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), errs = [];
  await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await ctx.addInitScript(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]'); await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
  const pw = 'Vw4#kPz9!mQs';
  await p.fill('#acName', 'Amal R.'); await p.fill('#acUser', 'amal.r'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
  await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  await p.evaluate(async fx => { eval(fx); const db = window.__mc.state.db; let i = 0; for (const r of window.__FIX__.roster) await db.doc('roster/p' + i).set({ order: i++, ...r }); }, fixture);
  await p.waitForFunction(() => window.__mc.state.roster.length > 100, null, { timeout: 30000 });
  // the synthetic months in the folder's history, so the pages (and a supervisor's team) have a month to show
  const nMonths = await p.evaluate(async fx => { eval(fx); const db = window.__mc.state.db, H = window.__FIX__.history; for (const [k, v] of Object.entries(H)) await db.doc('history/' + k).set(v); return Object.keys(H).length; }, fixture);
  await p.waitForFunction(n => Object.keys(window.__mc.state.history).length >= n, nMonths, { timeout: 30000 });
  await p.evaluate(() => { window.__mc.state.wsMonth = '2026-09'; });
  const nav = () => p.evaluate(() => [...document.querySelectorAll('#wsSeg [data-ws]:not([hidden])')].map(x => x.dataset.ws).join(','));
  const bar = () => p.evaluate(() => { const v = document.getElementById('viewBar'); return v.hidden ? '' : v.textContent.replace(/\s+/g, ' ').trim(); });

  // ---- 1. the Showcase
  let N = await nav();
  ok(/^dash,.*,show$/.test(N), `the admin's pages end with the Showcase: ${N}`);
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector('#showBody .shsec', { timeout: 10000 });
  const sh = await p.evaluate(() => ({ n: document.querySelectorAll('#showBody .shsec').length, h: (document.getElementById('h-show') || {}).textContent, roles: document.querySelectorAll('#showBody .shroles [data-vago]').length, notes: document.querySelectorAll('#showBody .shnotes').length, hash: location.hash }));
  ok(sh.n === 10 && sh.h === 'Showcase' && sh.roles === 6 && sh.notes === 10 && sh.hash === '#/show', `the Showcase: ${sh.n} sections with speaker notes, ${sh.roles} roles to view, at ${sh.hash}`);
  for (let i = 0; i < 8; i++) { await p.evaluate(i => { const f = document.querySelectorAll('#showBody .shfig')[i]; if (f) f.scrollIntoView({ block: 'center' }); }, i); await p.waitForTimeout(200); }
  await p.waitForTimeout(400);
  const figs = await p.evaluate(() => ({ all: document.querySelectorAll('#showBody .shfig').length, drawn: [...document.querySelectorAll('#showBody .shfig')].filter(f => f.querySelector('svg')).length, lib: typeof Hairline !== 'undefined' && Object.keys(Hairline).length }));
  ok(figs.lib === 33 && figs.drawn === figs.all && figs.all === 8, `the line figures (hairline, ${figs.lib} built in): ${figs.drawn} of ${figs.all} drawn as they came into view`);
  await p.evaluate(() => scrollTo(0, 0)); await p.click('.shtop [data-showpresent]'); await p.waitForTimeout(250);
  const pres = () => p.evaluate(() => ({ on: document.body.classList.contains('presenting'), cur: [...document.querySelectorAll('#showBody .shsec')].findIndex(s => s.classList.contains('cur')), shown: [...document.querySelectorAll('#showBody .shsec')].filter(s => getComputedStyle(s).display !== 'none').length, ctl: !document.getElementById('showCtl').hidden, notes: document.body.classList.contains('shownotes'), side: getComputedStyle(document.getElementById('sidebar')).display }));
  let P = await pres();
  ok(P.on && P.cur === 0 && P.shown === 1 && P.ctl && P.side === 'none', 'Present: the first section alone on the screen, the controls at the foot, no sidebar');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('n'); await p.waitForTimeout(150);
  P = await pres(); ok(P.cur === 2 && P.notes, 'the arrow keys go from section to section; N shows the speaker notes');
  await p.screenshot({ path: path.join(out, 'viewas-present.png') });
  await p.keyboard.press('End'); P = await pres(); ok(P.cur === 9, 'End: the last section (how we start)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); P = await pres();
  ok(!P.on && !P.ctl && P.side !== 'none', 'Esc ends the presentation; the page is as it was');
  // the admin's keys, on any page: S a spotlight that follows the pointer, Z a zoom where it points, Esc takes them off
  await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); }); await p.mouse.move(640, 360);
  await p.keyboard.press('s'); const sp1 = await p.evaluate(() => !!document.querySelector('.mcspot'));
  await p.keyboard.press('Escape'); const sp2 = await p.evaluate(() => !document.querySelector('.mcspot') && window.__mc.state.ws === 'show');
  await p.keyboard.press('z'); const z1 = await p.evaluate(() => document.documentElement.classList.contains('mczoom') && /scale/.test(document.body.style.transform));
  await p.keyboard.press('Escape'); const z2 = await p.evaluate(() => !document.documentElement.classList.contains('mczoom') && !document.body.style.transform);
  ok(sp1 && sp2 && z1 && z2, 'the admin\'s keys: S a spotlight, Z a zoom, Esc takes them off');

  // ---- 2. view as each role from the Showcase, and back
  for (const [r, first, label] of [['user', 'dash', 'WFM analyst'], ['wfm', 'dash', 'WFM manager'], ['senior', 'dash', 'Senior manager'], ['quality', 'quality', 'Quality team']]) {
    await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector(`#showBody [data-vago="${r}"]`);
    await p.click(`#showBody .shroles [data-vago="${r}"]`); await p.waitForFunction(() => window.__mc.viewing(), null, { timeout: 10000 });
    await p.waitForTimeout(250);
    const s = await p.evaluate(() => ({ ws: window.__mc.state.ws, body: document.body.classList.contains('viewing') })), n = await nav(), t = await bar();
    await p.evaluate(() => window.__mc.setWs('show')); const still = await p.evaluate(() => window.__mc.state.ws);
    ok(s.ws === first && s.body && !n.split(',').includes('show') && still !== 'show' && t.includes(`Viewing as ${label}`) && /nothing you change here is saved/.test(t), `View as ${label}: ${first} first, pages ${n} (no Showcase), the banner says so`);
    await p.click('#viewBar [data-vbback]'); await p.waitForTimeout(200);
    const back = await p.evaluate(() => ({ ws: window.__mc.state.ws, viewing: window.__mc.viewing(), body: document.body.classList.contains('viewing') }));
    ok(back.ws === 'show' && !back.viewing && !back.body && !(await bar()), `  Back to Admin: on the Showcase again`);
  }

  // ---- 3. one supervisor's team; one agent's page
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForSelector('#showBody [data-vapick="spv"]');
  const pick0 = await p.evaluate(() => { const s = document.querySelector('#showBody [data-vapick="spv"]'); return { v: s.value, t: s.options[s.selectedIndex].textContent }; });
  await p.click('#showBody .shroles .shrole:nth-child(4) [data-vago="spv"]'); await p.waitForTimeout(150);
  const none = await p.evaluate(() => ({ viewing: window.__mc.viewing(), toast: document.getElementById('toastMsg').textContent }));
  ok(pick0.v === '' && /Choose a supervisor/.test(pick0.t) && !none.viewing && /Choose the supervisor/.test(none.toast), `no name on the screen until the admin chooses ("${pick0.t}"); View without a choice asks for one`);
  await p.selectOption('#showBody [data-vapick="spv"]', 'p2');
  await p.click('#showBody .shroles .shrole:nth-child(4) [data-vago="spv"]'); await p.waitForFunction(() => window.__mc.viewing() && window.__mc.state.ws === 'team', null, { timeout: 10000 });
  await p.waitForSelector('#teamBody', { timeout: 10000 }); await p.waitForTimeout(400);
  const team = await p.evaluate(() => { const R = window.__mc.state.roster, rows = [...document.querySelectorAll('#teamBody tr[data-row]')].map(t => t.dataset.row); return { rows, theirs: rows.filter(id => (R.find(x => x._id === id) || {}).spv === 'p2').length, name: (R.find(x => x._id === 'p2') || {}).name, size: R.filter(x => x.spv === 'p2').length }; });
  const tb = await bar();
  ok(team.size > 0 && team.rows.length > 0 && team.theirs === team.rows.length && tb.includes(`Supervisor · ${team.name}`), `View as a supervisor (${team.name}): their team only, ${team.rows.length} of their ${team.size} people listed, nobody else's`);
  await p.screenshot({ path: path.join(out, 'viewas-spv.png') });
  const ids = await p.evaluate(async () => {
    const fr = document.createElement('iframe'); fr.setAttribute('sandbox', 'allow-same-origin'); fr.srcdoc = '<p>ID 1542291999 and 2034567890</p>'; document.getElementById('teamBody').append(fr);
    await new Promise(r => setTimeout(r, 500));
    const txt = document.body.innerText, inFrame = fr.contentDocument.body.textContent; fr.remove();
    const field = document.createElement('input'); field.dataset.f = 'nid'; field.value = '1542291999'; document.body.append(field); const sec = getComputedStyle(field).webkitTextSecurity; field.remove();
    return { leaked: (txt.match(/(^|\D)[12]\d{9}(?!\d)/g) || []).length, dots: (document.getElementById('teamBody').textContent.match(/\u2022{10}/g) || []).length, inFrame, sec };
  });
  ok(ids.leaked === 0 && ids.dots > 0 && !/\d{10}/.test(ids.inFrame) && ids.sec === 'disc', `National IDs hidden while viewing: none readable on the page (${ids.dots} shown as dots), none in a preview ("${ids.inFrame}"), an ID field shows dots`);

  // ---- 4. nothing saved while viewing
  const tried = await p.evaluate(async () => {
    const M = window.__mc, db = M.state.db, out = {};
    try { await db.doc('config/viewas-test').set({ at: 1 }); out.direct = 'saved'; } catch (e) { out.direct = e && e.code; }
    try { await M.queueWrite('config/viewas-q', () => db.doc('config/viewas-q').set({ at: 2 })); out.queued = 'saved'; } catch (e) { out.queued = e && e.code; }
    out.save = document.getElementById('saveState').textContent; out.refused = M.state.viewRefused; out.toast = document.getElementById('toastMsg').textContent;
    return out;
  });
  ok(tried.direct === 'preview' && tried.queued === 'preview' && !/Not saved \(/.test(tried.save) && tried.refused >= 2, `while viewing, a write is refused (${tried.direct}, ${tried.queued}), counted (${tried.refused}), and the save line shows no error`);
  ok(/^Not saved: you are viewing as Supervisor/.test(tried.toast), `  and the admin is told: "${tried.toast.slice(0, 70)}…"`);
  await p.click('#acctBtn'); await p.waitForTimeout(100);
  const menu = await p.evaluate(() => { const v = s => { const b = document.querySelector(`#acctMenu [data-acct="${s}"]`); return b && !b.hidden; }; return { back: v('viewback'), viewas: v('viewas'), accounts: v('accounts'), name: document.getElementById('acctName').textContent }; });
  ok(menu.back && !menu.viewas && !menu.accounts && menu.name === 'Amal R.', 'the account menu while viewing: still the admin\'s, with Back to Admin and no Manage accounts');
  await p.click('#acctMenu [data-acct="viewback"]'); await p.waitForTimeout(250);
  const after = await p.evaluate(async () => {
    const M = window.__mc, db = M.state.db, x = await db.doc('config/viewas-test').get(), y = await db.doc('config/viewas-q').get(), out = { kept: x.exists || y.exists, ws: M.state.ws, toast: document.getElementById('toastMsg').textContent, act: document.getElementById('toastAct').hidden ? '' : document.getElementById('toastAct').textContent };
    try { await db.doc('config/viewas-test').set({ at: 3 }); out.now = (await db.doc('config/viewas-test').get()).data().at; } catch (e) { out.now = e && e.code; }
    out.retry = !!document.querySelector('#saveState [data-retry]');
    return out;
  });
  ok(!after.kept, 'nothing the preview tried is in the folder');
  ok(after.ws === 'show' && after.now === 3 && !after.retry, 'Back to Admin (account menu): on the Showcase, writes go through again, nothing waits to be tried again');
  ok(/2 changes made while viewing were not saved/.test(after.toast) && after.act === 'Reload', `  "${after.toast.slice(0, 60)}…" with ${after.act}`);
  await p.evaluate(() => window.__mc.setWs('team')); await p.waitForTimeout(600);
  const shown = await p.evaluate(() => (document.getElementById('teamBody').innerText.match(/(^|\D)[12]\d{9}(?!\d)/g) || []).length);
  ok(shown > 0, `after Back to Admin the IDs show again (the admin's Team page: ${shown})`);
  await p.evaluate(() => window.__mc.setWs('show')); await p.waitForTimeout(300);

  // an agent's page loads for the agent chosen
  const agent = await p.evaluate(() => window.__mc.state.roster.find(x => x.team === 'CC' && x.status === 'Active')._id);
  await p.evaluate(a => window.__mc.startViewAs('agent', a), agent);
  await p.waitForFunction(a => window.__mc.state.ws === 'me' && window.__mc.state.me && window.__mc.state.me.pid === a && window.__mc.state.me.loaded > 0, agent, { timeout: 15000 });
  const me = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#wsSeg [data-ws]:not([hidden])')].map(x => x.dataset.ws).join(','), h: document.getElementById('h-me').textContent }));
  ok(me.nav === 'me' && (await bar()).includes('Viewing as Agent ·'), `View as an agent: only their page (${me.nav}), "${me.h}", loaded for them`);
  await p.evaluate(() => window.__mc.endViewAs()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__mc.state.me === null && !window.__mc.viewing()), 'Back to Admin: the agent\'s page is put away');

  // ---- 5. the account menu for the admin
  await p.click('#acctBtn'); await p.waitForTimeout(100);
  const m2 = await p.evaluate(() => { const v = s => { const b = document.querySelector(`#acctMenu [data-acct="${s}"]`); return b && !b.hidden; }; return { viewas: v('viewas'), back: v('viewback'), accounts: v('accounts') }; });
  ok(m2.viewas && !m2.back && m2.accounts, 'the account menu: View as another role, and Manage accounts, for the admin');
  await p.click('#acctMenu [data-acct="viewas"]'); await p.waitForSelector('#dViewAs:not([hidden]) [data-vago]');
  const dv = await p.evaluate(() => ({ n: document.querySelectorAll('#dViewAs [data-vago]').length, picks: document.querySelectorAll('#dViewAs [data-vapick]').length }));
  ok(dv.n === 6 && dv.picks === 2, `View as another role: ${dv.n} roles, a supervisor and an agent to choose`);
  await p.screenshot({ path: path.join(out, 'viewas-choose.png') });
  await p.click('#dViewAs [data-vago="wfm"]'); await p.waitForFunction(() => window.__mc.viewing() && window.__mc.state.ws === 'dash', null, { timeout: 10000 });
  ok((await bar()).includes('Viewing as WFM manager'), 'from the menu: the WFM manager\'s dashboard, with the banner');
  await p.click('#viewBar [data-vbback]');

  // ---- 6. only the admin: a supervisor (here in the page's test mode) asking for another role's interface gets nothing
  {
    const c2 = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }), q = await c2.newPage(); q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u4', name: 'Ghada S.', username: 'ghada.s', role: 'spv', pid: 'p6' }; }, [fixture]);
    await q.goto('file://' + path.resolve(page0)); await q.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    const r = await q.evaluate(async () => { const M = window.__mc; await M.startViewAs('senior'); await M.startViewAs('agent', 'p20'); M.setWs('show');
      return { viewing: M.viewing(), ws: M.state.ws, nav: [...document.querySelectorAll('#wsSeg [data-ws]:not([hidden])')].map(x => x.dataset.ws).join(','), bar: !document.getElementById('viewBar').hidden, item: !!document.querySelector('#acctMenu [data-acct="viewas"]:not([hidden])') }; });
    ok(!r.viewing && r.ws === 'team' && r.nav === 'team' && !r.bar && !r.item, `a supervisor cannot view as anyone, nor open the Showcase (${r.nav}, on ${r.ws})`);
    await q.mouse.move(400, 300); await q.keyboard.press('s'); await q.keyboard.press('z');
    ok(await q.evaluate(() => !document.querySelector('.mcspot') && !document.documentElement.classList.contains('mczoom')), '  nor has the presenter\'s keys (S, Z)');
    await c2.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (errs.length) bad++;
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
