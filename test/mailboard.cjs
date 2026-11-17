// WFM team › Emails › Daily brand emails: the day's four emails as a board (To check · Ready to send · Sent). A card opens its
// email below; dragged to Sent it is marked sent (the card lifts and tilts on the way, the lane lights up, a toast offers Undo);
// dragged out of Sent it is back to not sent; between To check and Ready it springs back (the checks decide). The arrows move
// between the cards. With reduced motion the card still follows the pointer, without the tilt. Every number here is made up.
// Usage: node test/mailboard.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const USER = { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, DAY = '2026-10-21';
async function open(b, o = {}) {
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 1000 }, reducedMotion: o.rm || 'no-preference', colorScheme: o.theme || 'light' }), p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-10-22T10:00:00'));   // the day after the made-up report day (report days older than 40 days are taken out)
  await p.addInitScript(([fx, u]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, USER]);
  await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(async d => {   // a shared store in memory (as test/rb158.cjs has it) and a report day with its four emails: two with checks, two ready
    const S = window.__mc.state, mem = {}, subs = [];
    const snap = path => ({ docs: Object.keys(mem).filter(k => k.startsWith(path + '/') && !k.slice(path.length + 1).includes('/')).map(k => ({ id: k.slice(path.length + 1), data: () => mem[k] })) });
    S.db = { doc: id => ({ set: async v => { mem[id] = v; subs.forEach(s => { if (id.startsWith(s.path + '/')) setTimeout(() => s.cb(snap(s.path)), 0); }); }, update: async v => { mem[id] = { ...(mem[id] || {}), ...v }; }, get: async () => ({ exists: !!mem[id], data: () => mem[id] }) }),
      collection: path => ({ onSnapshot: cb => { subs.push({ path, cb }); setTimeout(() => cb(snap(path)), 0); return () => {}; }, get: async () => snap(path) }) };
    window.__mc.watchDaily(S.db);   // what the page does when a store connects
    const at = new Date().toISOString();
    await S.db.doc(`dailymail/${d}`).set({ k: d, date: d, start: d, end: d, multi: false, at, by: 'Yousef T.', files: 3,
      brands: { postpaid: { warn: 2, kpis: [['Calls', '1,234'], ['SL', '78%']] }, virgin: { warn: 0, kpis: [['Calls', '5,210'], ['SL', '84%']] }, friendi: { warn: 0, kpis: [['Calls', '2,044'], ['SL', '91%']] }, fpay: { warn: 1, kpis: [['Tickets', '37']] } } });
    S.wfmTab = 'emails'; S.mailSub = 'daily'; window.__mc.setWs('wfm');
  }, DAY);
  await p.waitForSelector('#wfmDm .mboard .mcard', { timeout: 20000 });
  await p.evaluate(async d => {   // the four emails themselves, built as the analyst's drop builds them (an empty bag; the checks above are the day's summary)
    const S = window.__mc.state, B = window.Build, P = B.makePeriod(d, d), at = new Date().toISOString();
    const bag = { calls: {}, sm: {}, queue: {}, dated: { calls: {}, sm: {}, queue: {} }, undated: [], datedFiles: [], history: null, tickets: null, historyFiles: {}, ticketFiles: {}, fpayTicketsFile: null, leaderRows: null };
    for (const key of ['postpaid', 'virgin', 'friendi', 'fpay']) {
      const cfg = B.REPORTS[key], rules = cfg.channels.length ? ['all', 'facebook', 'total', 'weighted'] : [cfg.asaRule], data = {}, hist = {};
      for (const rule of rules) { data[rule] = B.computeData(key, P, bag, { asaRule: rule, hist: {} }); hist[rule] = {}; }
      await S.db.doc(`dailymail/${d}/brands/${key}`).set({ key, period: P, data, hist, nvDays: {}, pre: [], at, by: 'Yousef T.' });
    }
  }, DAY);
  await p.waitForFunction(() => document.querySelectorAll('#wfmDm .mcard:not(.is-none)').length === 4 && document.querySelector('#wfmDm [data-dmpanel] iframe.rbprev'), null, { timeout: 20000 }); await p.waitForTimeout(400);
  return p;
}
const lanes = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#wfmDm .mlane')].map(l => [l.dataset.lane, [...l.querySelectorAll('.mcard')].map(c => c.dataset.dmtab).join()])));
const sentOf = (p, k) => p.evaluate(([k, d]) => { const P = window.__mc.state.rbPrefs[k]; return !!(P && P.days && P.days[d] && P.days[d].sent); }, [k, DAY]);
/** a mouse drag of a card to the middle of a lane; mid runs while the card is held over the lane */
async function drag(p, key, lane, mid) {
  const c = await p.$(`#wfmDm .mcard[data-dmtab="${key}"]`), l = await p.$(`#wfmDm .mlane[data-lane="${lane}"]`);
  const a = await c.boundingBox(), z = await l.boundingBox(), x0 = a.x + a.width / 2, y0 = a.y + a.height / 2, x1 = z.x + z.width / 2, y1 = z.y + Math.min(z.height - 20, 70);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0 + 12, y0 + 6, { steps: 3 });
  await p.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 8 }); await p.mouse.move(x1, y1, { steps: 10 }); await p.waitForTimeout(80);
  const m = mid ? await mid() : null;
  await p.mouse.up(); await p.waitForTimeout(250); return m;
}
(async () => {
  const b = await chromium.launch();
  const p = await open(b);
  const L0 = await lanes(p);
  ok(L0.check === 'postpaid,fpay' && L0.ready === 'virgin,friendi' && L0.sent === '', `the board: To check ${L0.check} · Ready to send ${L0.ready} · Sent (none)`);
  const hint = await p.evaluate(() => (document.querySelector('#wfmDm .mlane[data-lane="sent"] .mlempty') || {}).textContent || '');
  ok(/Drop an email here/.test(hint), `the empty Sent lane says what to do ("${hint}")`);
  const kp = await p.evaluate(() => document.querySelector('#wfmDm .mcard[data-dmtab="virgin"] .mck').textContent.replace(/\s+/g, ' ').trim());
  ok(/Calls ?5,210/.test(kp) && /SL ?84%/.test(kp), `a card carries the email's first numbers (${kp})`);
  await p.screenshot({ path: path.join(out, 'mailboard.png') });
  // Virgin Mobile, opened, dragged to Sent
  await p.click('#wfmDm .mcard[data-dmtab="virgin"]'); await p.waitForTimeout(400);
  const mid = await drag(p, 'virgin', 'sent', async () => { await p.screenshot({ path: path.join(out, 'mailboard-drag.png') }); return p.evaluate(() => { const c = document.querySelector('#wfmDm .mcard[data-dmtab="virgin"]'); return { lift: c.classList.contains('lifting'), tr: c.style.transform, over: document.querySelector('#wfmDm .mlane[data-lane="sent"]').classList.contains('over'), grab: getComputedStyle(document.body).cursor }; }); });
  ok(mid.lift && /rotate\(-2deg\)/.test(mid.tr) && /scale\(1\.04\)/.test(mid.tr) && mid.over, `on the way: the card lifts and tilts (${mid.tr}), the Sent lane lights up (${mid.over}), the hand closes (${mid.grab})`);
  const after1 = await p.evaluate(() => ({ anim: getComputedStyle(document.querySelector('#wfmDm .mcard[data-dmtab="virgin"]')).animationName, hid: document.getElementById('toast').hidden, msg: document.getElementById('toastMsg').textContent, act: document.getElementById('toastAct').hidden ? '' : document.getElementById('toastAct').textContent, line: (document.querySelector('#wfmDm [data-dmpanel] .rbsent') || {}).textContent || '' }));
  const L1 = await lanes(p), s1 = await sentOf(p, 'virgin');
  ok(L1.sent === 'virgin' && L1.ready === 'friendi' && s1 && after1.anim === 'arrive', `let go over Sent: Virgin Mobile is marked sent and settles in the Sent lane (${L1.sent}, ${after1.anim})`);
  ok(!after1.hid && /Virgin Mobile marked as sent/.test(after1.msg) && after1.act === 'Undo' && /^Sent /.test(after1.line), `a toast says so, with Undo ("${after1.msg}" · ${after1.act}); the opened email shows its sent line ("${after1.line.slice(0, 24)}…")`);
  await p.click('#toastAct'); await p.waitForTimeout(300);
  const L2 = await lanes(p), s2 = await sentOf(p, 'virgin');
  ok(L2.ready === 'virgin,friendi' && L2.sent === '' && !s2, `Undo: back in Ready to send, no sent record (${L2.ready})`);
  // To check → Ready to send is not a drop: the lane stays dark and the card springs back
  const over = await drag(p, 'postpaid', 'ready', () => p.evaluate(() => document.querySelector('#wfmDm .mlane[data-lane="ready"]').classList.contains('over')));
  const L3 = await lanes(p), back = await p.evaluate(() => document.querySelector('#wfmDm .mcard[data-dmtab="postpaid"]').style.transform);
  ok(!over && L3.check === 'postpaid,fpay' && !back, `To check to Ready is not a drop: the lane stays dark (${over}), the card springs back (${L3.check}, transform "${back}")`);
  // FRiENDi Mobile to Sent: the next email still to send opens after a moment; out of Sent again: not sent any more
  await p.evaluate(() => { window.__mc.state.dmActive = 'friendi'; }); await drag(p, 'friendi', 'sent'); await p.waitForTimeout(1100);
  const after2 = await p.evaluate(() => ({ act: window.__mc.state.dmActive, pressed: (document.querySelector('#wfmDm .mcard[aria-pressed="true"]') || { dataset: {} }).dataset.dmtab }));
  ok(await sentOf(p, 'friendi') && after2.act !== 'friendi' && after2.pressed === after2.act, `FRiENDi Mobile sent; the next email still to send opens (${after2.act})`);
  await drag(p, 'friendi', 'ready');
  const L4 = await lanes(p), t4 = await p.evaluate(() => document.getElementById('toastMsg').textContent);
  ok(!(await sentOf(p, 'friendi')) && L4.ready.includes('friendi') && /FRiENDi Mobile is back to not sent/.test(t4), `dragged out of Sent: not sent any more ("${t4}")`);
  // the keyboard: the arrows move between the cards, Enter opens one (and keeps the focus on it)
  await p.focus('#wfmDm .mcard'); await p.keyboard.press('ArrowRight');
  const f1 = await p.evaluate(() => document.activeElement.dataset.dmtab);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const k1 = await p.evaluate(() => ({ act: window.__mc.state.dmActive, pressed: document.querySelector('#wfmDm .mcard[aria-pressed="true"]').dataset.dmtab, focus: document.activeElement.dataset.dmtab }));
  ok(f1 === 'fpay' && k1.act === 'fpay' && k1.pressed === 'fpay' && k1.focus === 'fpay', `the arrows move between the cards (${f1}), Enter opens the email and keeps the focus (${k1.act}, ${k1.focus})`);
  ok(!p.errs.length, `no errors on the way ${p.errs.join('; ')}`);
  await p.context().close();
  // reduced motion: the card still follows the pointer, without the tilt; the drop still counts
  const r = await open(b, { rm: 'reduce', theme: 'dark' });
  const rm = await drag(r, 'virgin', 'sent', () => r.evaluate(() => document.querySelector('#wfmDm .mcard[data-dmtab="virgin"]').style.transform));
  ok(/^translate\(/.test(rm) && !/rotate/.test(rm) && await sentOf(r, 'virgin'), `with reduced motion the card follows the pointer without the tilt (${rm}) and the drop still counts`);
  await r.screenshot({ path: path.join(out, 'mailboard-dark.png') });
  ok(!r.errs.length, `no errors with reduced motion ${r.errs.join('; ')}`);
  await r.context().close();
  // a phone: the lanes stack
  const q = await open(b, { vp: { width: 390, height: 844 } });
  const cols = await q.evaluate(() => getComputedStyle(document.querySelector('#wfmDm .mboard')).gridTemplateColumns.split(' ').length);
  ok(cols === 1, `on a phone the lanes stack (${cols} column)`);
  await q.screenshot({ path: path.join(out, 'mailboard-phone.png') });
  await q.context().close();
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
