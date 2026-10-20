// The WFM team page: the month's build (Import, Review, Export) and the emails are tabs of one page with the WFM pages, for
// each WFM role its own; the vacation cover (the WFM manager has the analysts' work while one is away, an analyst the
// manager's); the dashboard's month close shows the senior manager's steps only; Recent activity and Changes by hand are gone.
// Usage: node test/wfmteam.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
const PEOPLE = [{ id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }, { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }];
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async user => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${user.role}: ${e.message}`));
    await p.addInitScript(([fx, u]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user]);
    await p.goto('file://' + path.resolve(page0));
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
    await p.evaluate(P => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.state.people = P; }, PEOPLE);
    return { p, ctx };
  };
  const nav = p => p.evaluate(() => ({ side: [...document.querySelectorAll('#wsSeg [data-ws]')].filter(x => !x.hidden).map(x => x.dataset.ws).join(','),
    tabs: [...document.querySelectorAll('#wfmTabs [data-wt]')].map(x => x.dataset.wt).join(','), cur: (document.querySelector('#wfmTabs [aria-pressed="true"]') || {}).dataset?.wt || '',
    head: !document.getElementById('wfmHead').hidden, eye: document.getElementById('wfmEyebrow').textContent, ws: window.__mc.state.ws }));

  // the WFM analyst: no Build page of its own; the WFM team page opens on Import, with every tab of the role
  let { p, ctx } = await open(PEOPLE[0]);
  await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(250);
  let n = await nav(p);
  ok(!n.side.includes('build') && n.side.includes('wfm'), `analyst: no Build entry in the sidebar (${n.side})`);
  ok(n.tabs === 'import,review,export,emails,daily,builder,analytics,agents,inter' && n.cur === 'import' && n.ws === 'build' && n.head, `analyst: the WFM team page opens on Import, nine tabs in three groups (${n.tabs})`);
  ok(await p.evaluate(() => document.querySelectorAll('#wfmTabs .wfmgrp').length) === 3, 'the tabs come in three groups: this month, every day, insight');
  ok(await p.evaluate(() => !document.getElementById('buildActs').hidden && !!document.querySelector('#buildActs #buildTop') && document.getElementById('buildBar').hidden), 'Build Excel and the month sit in the header; the old step bar is gone');
  await p.screenshot({ path: path.join(out, 'analyst-import.png') });
  await p.click('#wfmTabs [data-wt="analytics"]'); await p.waitForTimeout(250); n = await nav(p);
  ok(n.ws === 'wfm' && n.cur === 'analytics' && n.head, 'Analytics: the same header, the WFM pages under it');
  await p.click('#wsSeg [data-ws="team"]'); await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(200); n = await nav(p);
  ok(n.cur === 'analytics', `the sidebar brings back the tab last used (${n.cur})`);
  await p.click('#wfmTabs [data-wt="review"]'); await p.waitForTimeout(250); n = await nav(p);
  ok(n.ws === 'build' && n.cur === 'review' && await p.isVisible('#v-review'), 'Review: the build\'s review, as a tab');
  // the old Email step is the Emails tab: the month's emails with Deduction or Incentive, from the shared month or this build
  await p.evaluate(() => window.__mc.setStep('email')); await p.waitForTimeout(300); n = await nav(p);
  const em = await p.evaluate(() => ({ inws: !!document.getElementById('v-email').closest('#v-wfm'), kind: !document.getElementById('mKind').hidden, src: !document.getElementById('mSrc').hidden, sub: (document.querySelector('[data-mailsub][aria-pressed="true"]') || {}).textContent }));
  ok(n.ws === 'wfm' && n.cur === 'emails' && em.inws && em.kind && em.src, `the email step opens WFM team › Emails › ${em.sub}, with Deduction/Incentive and the source choice`);
  await p.click('#mKind [data-f="inc"]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => window.__mc.state.mailSrc === '' && document.getElementById('mSrc').hidden), 'Incentive comes from the build (the source choice steps aside)');
  await p.screenshot({ path: path.join(out, 'analyst-emails.png') });
  // the analyst covers the manager: the manager's pages too
  await p.click('#wfmTabs [data-wt="analytics"]'); await p.waitForTimeout(200);
  ok(await p.isVisible('#coverNote [data-cover="u2"]') && !(await p.isVisible('#coverNote [data-cover="u3"]')), 'the analyst can mark the WFM manager (and nobody else) as on vacation');
  await p.check('#coverNote [data-cover="u2"]'); await p.waitForTimeout(300); n = await nav(p);
  ok(n.side.includes('results') && /covering for the WFM manager/.test(n.eye), `covering the manager: Results in the sidebar (${n.side}), "${n.eye}"`);
  ok(await p.evaluate(() => window.__mc.state.cover.away.u2 && window.__mc.state.cover.away.u2.byName === 'Yousef T.' && window.__mc.state.cover.log.length === 1), 'the tick is shared with who ticked it, and logged');
  await p.uncheck('#coverNote [data-cover="u2"]'); await p.waitForTimeout(300); n = await nav(p);
  ok(!n.side.includes('results') && !/covering/.test(n.eye), 'unticked: the analyst\'s own pages again');
  // the dashboard: the senior manager's steps only, no Recent activity
  await p.click('#wsSeg [data-ws="dash"]'); await p.waitForTimeout(300);
  const dc = await p.evaluate(() => ({ steps: [...document.querySelectorAll('#dashBody .dcsteps li b')].map(x => x.textContent), act: !!document.querySelector('#dashBody .dact, #h-dact') }));
  ok(dc.steps.length === 5 && dc.steps.includes('Month finalized') && !dc.steps.some(s => /Genesys|KPI file|EVAL|objections|deduction/i.test(s)) && !dc.act, `the month close: the senior manager's five steps (${dc.steps.length}), no Recent activity`);
  await p.screenshot({ path: path.join(out, 'analyst-dash.png') });
  await ctx.close();

  // the WFM manager: their own tabs; with an analyst on vacation, the analysts' too
  ({ p, ctx } = await open(PEOPLE[1]));
  await p.click('#wsSeg [data-ws="wfm"]'); await p.waitForTimeout(250); n = await nav(p);
  ok(n.tabs === 'emails,daily,analytics,agents,inter' && n.ws === 'wfm', `manager: Emails, Daily, Analytics, Agents, Interactions (${n.tabs})`);
  ok(await p.evaluate(() => document.getElementById('setBtn').hidden), 'manager: no Settings of the build');
  await p.check('#coverNote [data-cover="u1"]'); await p.waitForTimeout(300); n = await nav(p);
  ok(n.tabs === 'import,review,export,emails,daily,builder,analytics,agents,inter' && /covering for the WFM analyst/.test(n.eye), `an analyst on vacation: the manager has their tabs too (${n.tabs})`);
  ok(await p.evaluate(() => !document.getElementById('setBtn').hidden), 'and the build\'s Settings');
  await p.screenshot({ path: path.join(out, 'manager-cover.png') });
  await p.click('#wfmTabs [data-wt="import"]'); await p.waitForTimeout(250);
  ok(await p.isVisible('#v-import'), 'the manager can import the month while covering');
  await p.uncheck('#coverNote [data-cover="u1"]'); await p.waitForTimeout(300); n = await nav(p);
  ok(n.ws === 'wfm' && n.tabs === 'emails,daily,analytics,agents,inter', `untick on Import: back to the manager's own WFM team page (${n.ws})`);
  // a tick left for an account that is gone gives nobody anything, and can be cleared
  await p.evaluate(() => { const S = window.__mc.state; S.cover = { away: { ux: { role: 'user', name: 'Gone P.', at: '2026-10-01T00:00:00Z' } }, log: [] }; window.__mc.renderWs(); });
  await p.waitForTimeout(300); n = await nav(p);
  ok(n.tabs === 'emails,daily,analytics,agents,inter' && /no longer/.test(await p.textContent('#coverNote')), 'a tick for an account that is gone gives no tabs, and shows to be cleared');
  await p.click('#coverNote [data-cover="ux"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !window.__mc.state.cover.away.ux), 'unticked: cleared');
  await ctx.close();

  // the senior manager: no Changes by hand on the Supervisors page
  ({ p, ctx } = await open(PEOPLE[2]));
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#cycleBody .chgcard') && !/Changes by hand/.test(document.getElementById('cycleBody').textContent)), 'Supervisors page: no Changes by hand box');
  ok(!(await nav(p)).side.includes('build'), 'senior: no Build');
  await ctx.close();

  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
