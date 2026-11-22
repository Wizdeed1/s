// The WFM Daily Review's agent → brand map (open risk R9): the next run pairs the adherence files by agent with the brands of the
// last build. The map names the agents, so it is kept in the shared data with every other record about people (config/agentTeams,
// encrypted with the team's key in the data folder), never in this browser's storage. With a folder the browser keeps for the page
// standing in for MC Data, made-up exports only:
// 1. A copy an older version left in this browser's storage (wfm.agentTeams.v1) is removed as the page opens. This session still
//    pairs with it (two adherence files dropped under each other's brand names go back by agent); it never goes to the shared data.
// 2. The day's exports built (WFM team › Report builder › WFM Daily Review): the map is kept as config/agentTeams, a locked file in
//    the data folder with no agent's name in it as text; nothing in this browser's storage names an agent.
// 3. The next run (the page opened again, signed in again): the map comes from the shared data, and the two adherence files dropped
//    under each other's brand names are paired by agent with it.
// 4. A file moved by hand: the kept map goes from the shared data; the next build keeps the new one.
// 5. Sign out where the page stays open (the browser-only store): the map is forgotten, and a copy left in this browser's storage
//    is removed.
// Usage: node test/wfmmap.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const URL = 'http://localhost:8765/mc.html', html = fs.readFileSync(path.resolve(page0)), OLD = 'wfm.agentTeams.v1', pw = 'Tq7#mVx2!pLr';
const VIRGIN = ['Amal R.', 'Badr K.', 'Dana S.', 'Eyad M.', 'Fahad N.', 'Ghada T.', 'Hind A.', 'Ibrahim L.', 'Jana W.', 'Khalid O.', 'Lama Y.', 'Majed Z.'];
const FRIENDI = ['Nada B.', 'Omar C.', 'Rana D.', 'Saad E.', 'Tala F.', 'Waleed G.', 'Yara H.', 'Ziad I.', 'Abeer J.', 'Bassam P.', 'Dalia Q.', 'Faris U.'];
const ALL = [...VIRGIN, ...FRIENDI], GONE = 'Hala X.';   // GONE: only in the old copy, not in today's exports
const OLDMAP = Object.fromEntries([...ALL, GONE].map(n => [n.toLowerCase(), FRIENDI.includes(n) ? 'B' : 'A']));
// ---- the day's exports, made up
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
const y = new Date(Date.now() - 86400000), day = `${y.getMonth() + 1}/${y.getDate()}/${String(y.getFullYear()).slice(2)}`;   // the builder's day: yesterday
const adh = names => csv([['Agent', 'Management Unit', 'Adherence %', 'Conformance %', 'Scheduled Minutes', 'Exceptions'], ...names.map((n, i) => [n, 'Member Care', `${90 + (i % 8)}%`, `${95 + (i % 4)}%`, 540, i % 3])]);
const write = (n, t) => { const f = path.join(out, n); fs.writeFileSync(f, t); return f; };
// Virgin's agents in a file named for FRiENDi, and FRiENDi's in one named for Virgin: the file names pair them the wrong way round
const SWAPPED = [write('Historical Adherence - FRiENDi.csv', adh(VIRGIN)), write('Historical Adherence - Virgin.csv', adh(FRIENDI))];
const REST = [
  write('Agent Performance Summary.csv', csv([['Agent Name', 'Answered', 'Avg Handle', 'Avg Talk', 'Avg Hold', 'Avg ACW'], ...ALL.map((n, i) => [n, 20 + i, '00:02:30', '00:02:00', '00:00:10', '00:00:20'])])),
  write('Agent Status Summary.csv', csv([['Agent Name', 'Logged In', 'On Queue', 'Off Queue', 'Not Responding', 'Idle'], ...ALL.map(n => [n, '08:00:00', '07:00:00', '01:00:00', '00:00:00', '00:30:00'])])),
  write('Interactions.csv', csv([['Media Type', 'Users', 'Remote', 'Date', 'Duration', 'Direction', 'Queue', 'ANI'],
    ...ALL.map((n, i) => ['voice', n, 'Caller, Example', `${day} ${String(9 + (i % 8)).padStart(2, '0')}:${String(i).padStart(2, '0')} AM`, 150 + i, 'Inbound', FRIENDI.includes(n) ? 'Friendi_En' : 'Virgin_En', `tel:+1000000${String(i).padStart(4, '0')}`])])),
];
(async () => {
  const b = await chromium.launch(), errs = [];
  const context = async nofolder => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await ctx.route(URL, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
    // the folder picker answers with a folder of the browser's own named MC Data (or, for 5, this browser's own store)
    await ctx.addInitScript(nf => {
      if (nf) window.__NOFOLDER__ = true;
      else window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true });
    }, !!nofolder);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    return { ctx, p };
  };
  let { ctx, p } = await context(false);
  const createAdmin = async () => {
    await p.waitForSelector('#acName:not([hidden])', { timeout: 20000 });
    await p.fill('#acName', 'Sara K.'); await p.fill('#acUser', 'sara.k'); await p.fill('#pwNew', pw); await p.fill('#pwConf', pw); await p.click('#lockGo');
    await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  };
  const signIn = async () => {
    await p.waitForFunction(() => { const v = el => el && el.offsetParent !== null; return v(document.getElementById('pwCur')) || v(document.querySelector('[data-conn="again"]')); }, null, { timeout: 60000 });
    if (await p.isVisible('[data-conn="again"]').catch(() => false)) { await p.click('[data-conn="again"]'); await p.waitForFunction(() => document.getElementById('pwCur').offsetParent !== null, null, { timeout: 60000 }); }
    if (await p.isVisible('#acEmail')) await p.fill('#acEmail', 'sara.k');
    await p.fill('#pwCur', pw); await p.click('#lockGo');
    await p.waitForFunction(() => document.getElementById('lock').hidden && window.__mc.state.rosterReady, null, { timeout: 90000 });
  };
  const openBuilder = async () => {
    await p.evaluate(() => { const S = window.__mc.state; S.rbActive = 'wfm'; S.wfmTab = 'builder'; window.__mc.setWs('wfm'); });
    await p.waitForSelector('#wfmRb [data-rbpick]', { timeout: 30000, state: 'attached' });
    await p.waitForFunction(() => window.__mc.rb().ready, null, { timeout: 30000 });
  };
  const drop = async (files, n) => {
    await p.setInputFiles('#wfmRb [data-rbpick]', files);
    await p.waitForFunction(k => window.__mc.rb().files.length >= k && !window.__mc.rb().busy, n, { timeout: 30000 }); await p.waitForTimeout(400);
  };
  const teams = () => p.evaluate(() => (window.WFM._teams ? window.WFM._teams() : undefined));   // undefined: a build without the map's hooks
  const adhNow = () => p.evaluate(() => { const F = window.WFM._state.files; return ['adhA', 'adhB'].map(k => `${k}: ${F[k] ? F[k].fileName + (F[k]._brandHow ? ' (' + F[k]._brandHow + ')' : '') : 'none'}`).join(' · '); });
  const record = () => p.evaluate(async () => { const s = await window.__mc.state.db.doc('config/agentTeams').get(); return s.exists ? s.data() : null; });
  const until = async (fn, ms = 15000) => { const t0 = Date.now(); let v; while (!(v = await fn()) && Date.now() - t0 < ms) await p.waitForTimeout(200); return v; };
  /** the record's file as it lies in the data folder, or null */
  const onDisk = () => p.evaluate(async () => {
    try {
      const d = await (await (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data')).getDirectoryHandle('config');
      const u8 = new Uint8Array(await (await (await d.getFileHandle('d_agent^teams.mcd')).getFile()).arrayBuffer());
      return { magic: String.fromCharCode(...u8.subarray(0, 4)), n: u8.length, text: Array.from(u8, c => String.fromCharCode(c)).join('') };
    } catch (e) { return null; }
  });
  /** the agents named anywhere in this browser's storage (keys and values) */
  const named = () => p.evaluate(N => { const all = Object.keys(localStorage).map(k => k + '\n' + localStorage.getItem(k)).join('\n').toLowerCase(); return N.filter(n => all.includes(n.toLowerCase())); }, [...ALL, GONE]);
  const brands = rec => Object.fromEntries(((rec && rec.agents) || []).map(x => [x.n, x.t]));

  // ---- 1. a copy an older version left in this browser's storage
  await p.goto(URL); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [OLD, OLDMAP]);
  await p.reload(); await p.waitForSelector('[data-conn="pick"]', { timeout: 20000 });
  const s1 = await p.evaluate(k => ({ left: localStorage.getItem(k), n: window.WFM._teams ? (window.WFM._teams() || []).length : -1 }), OLD);
  ok(s1.left === null && s1.n === 25, `1. the copy an older version left in this browser's storage is removed as the page opens (${s1.left === null ? 'gone' : 'still there'}); this session holds its ${s1.n} agents in memory`);
  await p.click('[data-conn="pick"]'); await p.waitForSelector('[data-conn="create"]', { timeout: 10000 });
  await p.click('[data-conn="create"]'); await createAdmin();
  await openBuilder();
  ok((await teams() || []).length === 25 && !(await record()), '   the builder opens: no map in the shared data yet, so this session keeps the old copy for now');
  await drop(SWAPPED, 2);
  let a = await adhNow();
  ok(a === 'adhA: Historical Adherence - FRiENDi.csv (agents) · adhB: Historical Adherence - Virgin.csv (agents)', `   two adherence files dropped under each other's brand names go back by agent with it (${a})`);

  // ---- 2. built: the map in the shared data, locked
  await drop(REST, 5);
  await p.waitForFunction(() => !!window.WFM._state.html, null, { timeout: 30000 });
  const rec = await until(record), B = brands(rec), disk = await onDisk();
  ok(rec && rec.agents.length === 24 && VIRGIN.every(n => B[n.toLowerCase()] === 'A') && FRIENDI.every(n => B[n.toLowerCase()] === 'B') && rec.by === 'Sara K.',
    `2. the WFM Daily Review built: its map is kept in the shared data as config/agentTeams (${rec ? rec.agents.length : 0} agents: Virgin's A, FRiENDi's B; by ${rec && rec.by})`);
  ok(rec && !(GONE.toLowerCase() in B), `   it is this build's map: ${GONE}, only in the old copy, is not in it (the old copy never goes to the shared data)`);
  ok(disk && disk.magic === 'MCD1' && !ALL.some(n => disk.text.includes(n) || disk.text.includes(n.toLowerCase())),
    `   in the data folder a locked file (config/d_agent^teams.mcd, ${disk ? disk.n : 0} bytes, ${disk ? disk.magic : 'missing'}): no agent's name in it as text`);
  let left = await named();
  ok(!(await p.evaluate(k => k in localStorage, OLD)) && !left.length, `   this browser's storage: no ${OLD}, and no agent named in it${left.length ? ` (found: ${left.join(', ')})` : ''}`);
  await p.screenshot({ path: path.join(out, 'wfmmap-built.png') });

  // ---- 3. the next run: the page opened again, signed in again
  await p.goto(URL); await signIn();
  ok(await teams() === null && !(await named()).length, '3. the page opened again and signed in: no map in memory, none in this browser\'s storage');
  await openBuilder();
  const t3 = (await teams() || []).length;
  await drop(SWAPPED, 2);
  a = await adhNow();
  ok(t3 === 24 && a === 'adhA: Historical Adherence - FRiENDi.csv (agents) · adhB: Historical Adherence - Virgin.csv (agents)',
    `   the builder reads the map from the shared data (${t3} agents), and the two adherence files dropped under each other's brand names are paired by agent (${a})`);

  // ---- 4. a file moved by hand
  await p.waitForSelector('#wfmRb [data-move="adhA"][data-to="adhB"]', { timeout: 15000 });
  await p.click('#wfmRb [data-move="adhA"][data-to="adhB"]');
  const gone = await until(async () => !(await record()) && !(await onDisk()));
  ok(gone && await teams() === null, `4. a file moved by hand: the map that paired them is forgotten here and taken out of the shared data (${gone ? 'record and file gone' : 'still there'})`);
  await drop(REST, 5);
  await p.waitForFunction(() => !!window.WFM._state.html, null, { timeout: 30000 });
  const rec4 = await until(record), B4 = brands(rec4);
  ok(rec4 && VIRGIN.every(n => B4[n.toLowerCase()] === 'B') && FRIENDI.every(n => B4[n.toLowerCase()] === 'A'), '   the next build keeps the map as the files stand now (Virgin\'s agents read as FRiENDi, as moved)');
  left = await named();
  ok(!left.length, `   still no agent named in this browser's storage${left.length ? ` (found: ${left.join(', ')})` : ''}`);
  await ctx.close();

  // ---- 5. sign out where the page stays open (the browser-only store)
  ({ ctx, p } = await context(true));
  await p.goto(URL); await createAdmin();
  await p.evaluate(([k, list, old]) => { if (window.WFM.setTeams) window.WFM.setTeams(list); localStorage.setItem(k, JSON.stringify(old)); window.__stays = 1; }, [OLD, ALL.map(n => ({ n, t: FRIENDI.includes(n) ? 'B' : 'A' })), OLDMAP]);
  const before = (await teams() || []).length;
  await p.click('#acctBtn'); await p.click('#acctMenu [data-acct="out"]');
  await p.waitForFunction(() => !document.getElementById('lock').hidden, null, { timeout: 15000 });
  const s5 = await p.evaluate(k => ({ stays: window.__stays === 1, teams: window.WFM._teams ? window.WFM._teams() : undefined, left: localStorage.getItem(k) }), OLD);
  ok(before === 24 && s5.stays && s5.teams === null && s5.left === null, `5. sign out, the page still open: the map in memory is forgotten (${before} agents before), and a copy left in this browser's storage is removed (${s5.left === null ? 'gone' : 'still there'})`);
  await ctx.close();

  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  console.log(bad ? `${bad} failed` : 'all passed');
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
