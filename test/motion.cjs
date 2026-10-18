// Motion and speed: the dashboard's first-load moment plays once (and not on return), the Build step moment, and the Team table
// sorts, filters and pages within the budget (under 100 ms). Then the KPI cards of a row keep their values level, the Supervisors
// bars grow only when their numbers change (from where they were), and the phone's More sheet closes on a flick or a slow pull
// past half and goes back otherwise. Usage: node test/motion.cjs page.html outDir
const { chromium } = require('playwright'); const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
async function as(b, user, o = {}) {
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, reducedMotion: o.rm || 'no-preference', hasTouch: !!o.touch, isMobile: !!o.touch }), p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.addInitScript(([fx, u]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u; }, [fixture, user]);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; });
  return p;
}
async function later(b) {
  // the KPI cards: in every row the values, the changes, the lines and the months start on the same line (desktop, laptop, phone)
  for (const vp of [{ width: 1440, height: 900 }, { width: 1180, height: 820 }, { width: 390, height: 844 }]) {
    const p = await as(b, { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }, { vp, rm: 'reduce' });
    await p.evaluate(() => { window.__mc.setWs('dash'); window.__mc.renderWs(); }); await p.waitForTimeout(300);
    const rows = await p.evaluate(() => { const by = {}; document.querySelectorAll('#dashBody .kpi').forEach(k => { const t = Math.round(k.getBoundingClientRect().top); (by[t] = by[t] || []).push(['.kval', '.kd', '.ksp', '.kspl'].map(s => Math.round(k.querySelector(s).getBoundingClientRect().top))); }); return Object.values(by); });
    ok(rows.length && rows.every(r => r.every(x => x.every((v, i) => v === r[0][i]))), `${vp.width} px: the KPI values of a row are level (${rows.map(r => r.length).join(' + ')} cards)`);
    await p.context().close();
  }
  // the Supervisors bars, drawn the way senior.js draws them (the synthetic months have no one-to-one done)
  const p = await as(b, { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' });
  await p.evaluate(() => { window.__mc.setWs('cycle'); window.__mc.renderWs(); });
  // each redraw returns the first bar's width share right after it (before the next frame): where its growth starts
  const draw = first => p.evaluate(async f => {
    const B = document.getElementById('cycleBody'), t = document.createElement('div'); t.innerHTML = B.innerHTML;
    t.querySelectorAll('#spvDone .pbar i').forEach((i, j) => { i.style.width = (j % 3 ? 0 : j ? 40 + j : f) + '%'; }); B.innerHTML = t.innerHTML;
    await Promise.resolve(); const m = /^matrix\(([-\d.e]+)/.exec(getComputedStyle(document.querySelector('#spvDone .pbar i')).transform); return m ? +m[1] : 1;
  }, first);
  const first = await draw(40); await p.waitForTimeout(1500);
  const same = await draw(40); const grow = await draw(70); await p.waitForTimeout(1500);
  const end = await p.evaluate(() => getComputedStyle(document.querySelector('#spvDone .pbar i')).transform);
  ok(first < 0.1 && same === 1 && Math.abs(grow - 40 / 70) < 0.05 && end === 'none', `Supervisors bars: fill from empty the first time (starts at ${first.toFixed(2)}), still on a redraw with the same numbers (${same}), 40% → 70% grows from where it was (starts at ${grow.toFixed(2)}), no transform left at the end (${end})`);
  ok(!p.errs.length, `no errors on the Supervisors page ${p.errs.join('; ')}`);
  await p.context().close();
  // the More sheet on a phone: a flick, a slow pull with a stop, a slow pull past half
  const q = await as(b, { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }, { vp: { width: 390, height: 844 }, touch: true });
  const more = async () => { await q.click('.tabbar button:last-child'); await q.waitForTimeout(400); };
  const pull = (dy, ms, stop) => q.evaluate(async ([dy, ms, stop]) => {
    const el = document.getElementById('moreSheet'), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y0 = r.top + 20, wait = t => new Promise(f => setTimeout(f, t));
    const fire = (type, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    fire('pointerdown', y0); const n = Math.max(4, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) { await wait(ms / n); fire('pointermove', y0 + dy * i / n); }
    if (stop) await wait(stop);
    fire('pointerup', y0 + dy); await wait(700); return el.hidden;
  }, [dy, ms, stop]);
  await more(); const h = await q.evaluate(() => document.getElementById('moreSheet').offsetHeight);
  const flick = await pull(60, 80, 0); await more(); const back = !(await pull(90, 700, 160));
  await q.evaluate(() => { document.getElementById('moreSheet').style.touchAction = 'none'; }); const slow = await pull(Math.round(h * 0.62), 1600, 0);
  ok(flick && back && slow, `More sheet: a 60 px flick closes (${flick}), a slow 90 px pull with a stop goes back (${back}), a slow pull past half closes (${slow})`);
  ok(!q.errs.length, `no errors on the phone ${q.errs.join('; ')}`);
  await q.context().close();
}
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(fx => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' }; window.__FIX_HOLD__ = true; }, fixture);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
  // the history arrives, then the dashboard draws for the first time
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.renderWs(); });
  await p.waitForTimeout(90); const mid = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  await p.screenshot({ path: path.join(out, 'dash-intro-mid.png') });
  await p.waitForTimeout(1600); const after = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  await p.evaluate(() => { window.__mc.setWs('team'); window.__mc.setWs('dash'); });
  const replay = await p.evaluate(() => document.querySelector('#dashBody').classList.contains('intro'));
  console.log(`dashboard moment: playing at 90 ms ${mid}, done after 1.7 s ${!after}, replays on return ${replay}`);
  // the Team table: sort, filter and page
  await p.evaluate(() => window.__mc.setWs('team'));
  const t = await p.evaluate(async () => {
    const M = window.__mc, S = window.__mc.state, time = fn => { const t0 = performance.now(); fn(); return Math.round(performance.now() - t0); };
    const r = {};
    r.render = time(() => M.renderWs());
    r.sortFin = time(() => { S.teamSort = 'fin'; S.teamDir = ''; M.renderWs(); });
    r.sortName = time(() => { S.teamSort = 'name'; S.teamDir = 'asc'; M.renderWs(); });
    r.filter = time(() => { S.teamBrand = 'Virgin'; M.renderWs(); });
    r.search = time(() => { S.teamQ = 'na'; M.renderWs(); });
    r.page = time(() => { S.teamQ = ''; S.teamBrand = ''; S.teamPage = 3; M.renderWs(); });
    r.rows = document.querySelectorAll('.tteam tbody tr').length;
    r.range = (document.querySelector('.prange') || {}).textContent;
    return r;
  });
  console.log('team table (ms):', JSON.stringify(t));
  console.log(errs.join('\n') || 'no errors');
  await later(b);
  await b.close();
})();
