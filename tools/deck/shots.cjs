// Screenshots of the tool for the stakeholder deck (tools/deck/make_deck.cjs), from the synthetic test data only: the fixture's
// roster and months, and the synthetic September 2026 Genesys exports (test/exports.cjs). Retina size, no toasts.
// Usage: node tools/deck/shots.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, '..', '..', 'test', 'fixture.js'), 'utf8');
const USERS = {
  senior: { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }, wfm: { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' },
  user: { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }, spv: { id: 'u4', name: 'Ghada S.', username: 'ghada.s', role: 'spv', pid: 'p6' },
  agent: { id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' },
};
const NOW = new Date('2026-10-08T07:30:00Z');   // 10:30 in Riyadh: the month close under way, nothing late yet
const HIDE = '#toast, #busy { display: none !important; } *, *::before, *::after { caret-color: transparent !important; }';
(async () => {
  const b = await chromium.launch(), errs = [];
  async function open(role, o = {}) {
    const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: o.dpr || 2, reducedMotion: 'reduce', colorScheme: o.dark ? 'dark' : 'light', timezoneId: 'Asia/Riyadh', acceptDownloads: true });
    await ctx.clock.setFixedTime(NOW);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${role}: ${e.message}`));
    await p.addInitScript(([fx, u, lang]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; try { if (lang) localStorage.setItem('mc-lang:' + u.id, lang); } catch (e) { /* none */ } }, [fixture, USERS[role], o.lang || '']);
    await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => {
      const M = window.__mc, F = window.__FIX__;
      M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09';
      const done = { at: '2026-10-05T09:00:00Z', by: 'Noura B.' };   // the steps due by the 8th are done
      M.state.calMarks = { '2026-09': { k: '2026-09', marks: Object.fromEntries(['built', 'kpi', 'eval', 'shared', 'ready', 'objections'].map(s => [s, done])) } };
    });
    return { ctx, p };
  }
  const shot = async (p, name, o = {}) => { await p.waitForTimeout(o.wait ?? 500); await p.screenshot({ path: path.join(out, name + '.png'), ...(o.clip ? { clip: o.clip } : {}) }); console.log('✓', name); };
  /** where parts of the page are (CSS px of the window), for the deck's callouts */
  const boxes = (p, sels) => p.evaluate(S => Object.fromEntries(Object.entries(S).map(([k, s]) => { const e = document.querySelector(s), r = e ? e.getBoundingClientRect() : null; return [k, r && r.width ? { x: r.x, y: r.y, w: r.width, h: r.height } : null]; })), sels);
  /** a close-up of some parts of the page (padded, at most maxH tall, inside the window), sharp enough to read on a slide */
  async function zoom(p, name, sels, o = {}) {
    const r = await p.evaluate(([S, closest]) => {
      let a = null;
      for (const s of S) { let e = document.querySelector(s); if (e && closest) e = e.closest(closest) || e; if (!e) continue; const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue; a = a ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), r: Math.max(a.r, b.right), b: Math.max(a.b, b.bottom) } : { x: b.x, y: b.y, r: b.right, b: b.bottom }; }
      return a;
    }, [sels, o.closest || null]);
    if (!r) throw new Error('nothing to show for ' + name);
    const v = p.viewportSize(), pad = o.pad ?? 12, x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
    await shot(p, name, { wait: o.wait ?? 300, clip: { x, y, width: Math.min(v.width - x, r.r - r.x + 2 * pad), height: Math.min(o.maxH || 9999, v.height - y, r.b - r.y + 2 * pad) } });
  }

  // ---- the dashboard, light and dark
  for (const dark of [false, true]) {
    const { ctx, p } = await open('senior', { dark });
    await p.evaluate(() => { window.__mc.setWs('dash'); });
    await shot(p, dark ? 'dash-dark' : 'dash-light', { wait: 900 });
    if (!dark) fs.writeFileSync(path.join(out, 'dash-light.json'), JSON.stringify({ view: p.viewportSize(), ...(await boxes(p, { search: 'nav#sidebar button', bell: '#bell', period: '#periodBtn', acts: '.qacts', kpis: '.kpis', close: '.dclose' })) }, null, 1));
    await ctx.close();
  }
  // ---- the WFM analyst's month: Import with the exports, Review › Checks, Export, the emails, the templates
  {
    const { ctx, p } = await open('user');
    await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.histVer++; M.setWs('build'); M.setStep('import'); });
    await p.setInputFiles('#picker', fs.readdirSync(exp).filter(f => /\.csv$/i.test(f) && !/^Book1/.test(f)).map(f => path.join(exp, f)));
    await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 60000 });
    await p.evaluate(() => scrollTo(0, 0)); await shot(p, 'import', { wait: 900 });
    await p.evaluate(() => { const c = document.querySelector('#slots'); if (c) c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -24); }); await zoom(p, 'z-import', ['#slots'], { maxH: 462, pad: 6 });
    await p.evaluate(() => scrollTo(0, 0));
    await p.evaluate(() => { window.__mc.setStep('review'); window.__mc.setTab && window.__mc.setTab('checks'); scrollTo(0, 0); });
    await shot(p, 'checks', { wait: 900 });
    await zoom(p, 'z-checks', ['#checksSum', '#checksTiles', '#checksBody', '#readyCard'], { maxH: 560 });
    await p.evaluate(() => { window.__mc.setStep('export'); scrollTo(0, 0); });
    await shot(p, 'export', { wait: 700 });
    await p.click('#wfmTabs [data-wt="emails"]'); await p.waitForTimeout(300);
    const ms = await p.$('[data-mailsub="month"]'); if (ms) { await ms.click(); await p.waitForTimeout(400); }
    await p.evaluate(() => {   // made-up addresses in the screenshot
      const M = window.__mc; Object.assign(M.state.mail, { to: 'Member Care Management <mc.management@example.com>; WFM Team <wfm.team@example.com>', cc: 'Senior Manager <senior.manager@example.com>' });
      M.state.mailKind = 'ded'; M.state.mailStage = 'review'; M.renderWs(); scrollTo(0, 0);
    });
    await shot(p, 'emails', { wait: 900 });
    await zoom(p, 'z-email', ['#mailFrame'], { closest: '.card', maxH: 640, wait: 600 });
    // the attendance templates, with a few synthetic people in the other template departments
    await p.evaluate(() => {
      const M = window.__mc, S = M.state, add = [['TS', 'p0', ['Rami K.', 'Dana W.', 'Sami H.', 'Reem F.', 'Talal B.']], ['MG', 'p3', ['Hessa N.', 'Basil O.']], ['QA', 'p9', ['Mona T.', 'Fahd L.', 'Jana Q.']], ['DE', 'p9', ['Ola P.', 'Ziad M.']], ['WF', 'p3', ['Nawal D.', 'Omar Y.']]];
      let n = 900; for (const [team, spv, names] of add) for (const name of names) S.roster.push({ _id: 'x' + n, order: n++, name, nid: String(1990000000 + n), brand: 'Virgin', team, status: 'Active', spv });
      document.getElementById('attTplBtn') ? document.getElementById('attTplBtn').click() : null;
    });
    if (!(await p.$('#dAttTpl:not([hidden])'))) { await p.evaluate(() => { window.__mc.setWs('build'); window.__mc.setStep('import'); }); await p.waitForTimeout(400); await p.click('#attTplBtn'); }
    await p.waitForSelector('#dAttTpl:not([hidden]) [data-tpldl]'); await shot(p, 'templates', { wait: 600 });
    await zoom(p, 'z-templates', ['#dAttTpl'], { pad: 0 });
    await ctx.close();
  }
  // ---- How this was counted (the senior manager, Results)
  {
    const { ctx, p } = await open('senior');
    const who = await p.evaluate(() => {   // an agent with every KPI of the scorecard (as in test/rounding.cjs)
      const M = window.__mc, H = JSON.parse(JSON.stringify(window.__FIX__.history)), r = H['2026-09'].rows.find(x => x.team === 'CC' && x.brand === 'Virgin');
      Object.assign(r, { adh: 0.94962, aht: 140, tardy: 0, ks: 22, ka: 22, kat: 22, absent: 0, worked: 22, kr: 0 });
      M.state.kpiFiles['2026-09'] = { at: '2026-10-01T09:00:00Z', rows: [{ id: String(r.id), name: r.n, cols: { 'drc csat': 0.9, 'quality observations': 0.96, 'empowerment utilization': 0.96, 'call reason fcr accuracy': 0.96 } }] };
      M.state.history = H; M.state.histVer++; M.state.wsMonth = '2026-09'; M.setWs('results');
      return M.state.roster.find(x => String(x.nid) === String(r.id))._id;
    });
    await p.waitForTimeout(500);
    await p.evaluate(pid => { const x = document.createElement('button'); x.dataset.how = pid; x.dataset.howk = '2026-09'; document.body.append(x); x.click(); x.remove(); }, who);
    await p.waitForSelector('#dHow:not([hidden]) #howBody table'); await shot(p, 'how', { wait: 700 });
    await zoom(p, 'z-how', ['#dHow'], { pad: 0, maxH: 700 });
    await p.keyboard.press('Escape'); await p.evaluate(() => { window.__mc.setWs('cycle'); scrollTo(0, 0); }); await shot(p, 'cycle', { wait: 800 });
    await ctx.close();
  }
  // ---- WFM team: Report builder and Data
  {
    const { ctx, p } = await open('user');
    await p.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'builder'; M.setWs('wfm'); M.renderWs(); scrollTo(0, 0); });
    await shot(p, 'builder', { wait: 900 });
    await p.evaluate(() => { const M = window.__mc; M.state.wfmTab = 'data'; M.setWs('wfm'); M.renderWs(); scrollTo(0, 0); });
    await shot(p, 'data', { wait: 700 });
    await ctx.close();
  }
  // ---- phones: a supervisor's team, the dashboard, the agent's page in English and Arabic
  {
    const { ctx, p } = await open('spv', { w: 390, h: 844, dpr: 3 });
    await p.evaluate(() => { window.__mc.setWs('team'); window.__mc.renderWs(); }); await shot(p, 'phone-team', { wait: 900 }); await ctx.close();
  }
  {
    const { ctx, p } = await open('wfm', { w: 390, h: 844, dpr: 3, dark: true });
    await p.evaluate(() => { window.__mc.setWs('dash'); }); await shot(p, 'phone-dash-dark', { wait: 900 }); await ctx.close();
  }
  for (const lang of ['en', 'ar']) {
    const { ctx, p } = await open('agent', { w: 390, h: 844, dpr: 3, lang });
    await p.evaluate(lang => {
      const M = window.__mc, F = window.__FIX__, per = F.roster[20], months = {};
      for (const k of ['2026-06', '2026-07', '2026-08', '2026-09']) { const r = F.history[k].rows.find(x => x.id === per.nid) || F.history[k].rows[0]; months[k] = { status: k <= '2026-08' ? 'final' : 'draft', row: r, at: k + '-28T09:00:00Z', by: 'Noura B.' }; }
      M.state.me = { prof: { name: per.name, brand: per.brand, team: per.team, nid: per.nid, spvName: 'Ghada S.' }, months, forms: {} };
      if (lang === 'ar') M.state.lang = 'ar';
      M.setWs('me'); M.renderWs();
    }, lang);
    await p.waitForSelector('#meBar .monthbox'); await shot(p, 'phone-agent-' + lang, { wait: 900 }); await ctx.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
