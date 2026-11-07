// Percent KPIs and the Final % rounded to a whole % before they count, in the browser, as the senior manager. A September draft month
// in which one Virgin CC agent has 94.962% adherence and every other KPI in the top band. By default the adherence counts as 95%
// (ranking 5, final 100%, 1000 SR); "not rounded" in the rules gives ranking 4 (98%, 980 SR) and Undo brings 1000 back. "How this
// was counted" reads 94.96% → 95%, the rules drawer shows the defaults, and the days % stays exact (20 of 22 days: 909 SR, not 910).
// With the synthetic exports (test/exports.cjs), the Build month too: the KPI tab shows each adherence as it was ranked, and its
// "How this was counted" shows what it was. The rarer steps of How (a penalty, no value, the final % table, a decision by hand) read in
// few words, with 'before → after' only where the rounding changed a number. Usage: node test/rounding.cjs [page.html] [outDir] [exportsDir]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'final/Cadence.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const exp = process.argv[4] ? path.resolve(process.argv[4]) : null;
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }; try { const d = new Date(); localStorage.setItem('mc-today-toast:u3', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); } catch (e) { /* none */ } }, [fixture]);   // the day's late reminder already seen: it never takes the place of the Undo toast
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);
  const who = await p.evaluate(() => {
    const M = window.__mc, F = window.__FIX__, H = JSON.parse(JSON.stringify(F.history)), S = H['2026-09'];
    const r = S.rows.find(x => x.team === 'CC' && x.brand === 'Virgin');
    Object.assign(r, { adh: 0.94962, aht: 140, tardy: 0, ks: 22, ka: 22, kat: 22, absent: 0, worked: 22, kr: 0 });
    M.state.kpiFiles['2026-09'] = { at: '2026-10-01T09:00:00Z', rows: [{ id: String(r.id), name: r.n, cols: { 'drc csat': 0.9, 'quality observations': 0.96, 'empowerment utilization': 0.96, 'call reason fcr accuracy': 0.96 } }] };
    M.state.history = H; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09';
    return { pid: M.state.roster.find(x => String(x.nid) === String(r.id))._id, id: String(r.id) };
  });
  const row = () => p.evaluate(w => { const r = window.__mc.liveRows('2026-09').find(x => String(x.id) === w.id); const a = (r.kpi || []).find(t => t[0] === 'Adherence'); return { adh: a ? [a[3], a[4]] : null, fin: r.fin, earned: r.earned, fr: r.fr }; }, who);
  let R = await row();
  ok(R.adh && R.adh[0] === '95%' && R.adh[1] === 5, `by default 94.962% adherence counts as 95%, ranking 5: ${JSON.stringify(R.adh)}`);
  ok(R.fr === 5 && R.fin === 1 && R.earned === 1000, `final ranking 5, final 100%, 1000 SR: ${R.fr} / ${R.fin} / ${R.earned}`);

  // "How this was counted": what the value was and what it counted as
  await p.evaluate(w => { const x = document.createElement('button'); x.dataset.how = w.pid; x.dataset.howk = '2026-09'; document.body.append(x); x.click(); x.remove(); }, who);
  await p.waitForSelector('#dHow:not([hidden]) #howBody table');
  const how = await p.$eval('#howBody', el => ({ adh: [...el.querySelectorAll('tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim())).find(c => c[0] === 'Adherence'), text: el.textContent.replace(/\s+/g, ' ') }));
  ok(how.adh && how.adh[1] === '94.96% → 95%' && how.adh[2] === '≥ 95%' && how.adh[3] === '5', `How this was counted: ${JSON.stringify(how.adh)}`);
  ok(/Percent KPIs are rounded to a whole % before ranking/.test(how.text), 'it says percent KPIs are rounded to a whole % before ranking');
  await p.screenshot({ path: path.join(out, 'rounding-how.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // the rarer steps in few words, from made-up rows: a value reads 'before → after' only when the rounding changed it
  const H = await p.evaluate(() => {
    const how = window.__mc.howHtml, T = [['Adherence', 50, '≥ 95%', '96%', 5, '≥ 95%'], ['AHT', 30, '≤ 150', '–', null, null], ['Tardiness', 20, '≤ 4', 'N/A', null, null]];
    const x = { rr: 4.237, ws: 0.5, wt: 1, mm: 'scale', rd: 2, fr: 4.24, po: 'rank5', tr: null, pd: 2, fp: 0.85, vd: 0, ed: 'out', na: 'scale', s: 22, a: 20, ab: 2, ru: 1, ex: 6,
      pen: { k: 3, per: 'day', flat: 0, min: 1 }, c: 14, df: 'ratio', dp: 14 / 22, b: 1000, mo: 'round', t: 636, e: 541 };
    const row = (kx, more) => ({ kpi: T, kx, fr: kx ? kx.fr : 3.93, fin: kx ? kx.fp : 0.79, ks: 22, ka: 14, kat: 20, kt: 636, earnedCalc: 541, earned: 0, base: 1000, _el: { ok: false, why: ['final 79% is under 80%'] }, ...more });
    const text = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' '); };
    return {
      a: text(how(row(x), '2026-09', { sr: true })),
      b: text(how(row({ ...x, mm: 'rank1', rd: -1, rr: 4.2367, fr: 4.2367, po: 'table', tr: { min: 4, pct: 0.9 }, fp: 0.9, pen: { k: 2, per: 'run', flat: 2, min: 0 }, ex: 4, c: 16, dp: 16 / 22, e: 655 }, { _el: { ok: true, forced: true, why: [] } }), '2026-09', { sr: true })),
      c: text(how(row({ ...x, ws: 1, rr: 4.2, fr: 4.2, fp: 0.84, na: undefined, ed: 'in', a: 22, ab: 0, ex: 0, pen: null, c: 22, dp: 1, t: 1000, e: 840 },
        { kpi: [['Adherence', 60, '≥ 95%', '96%', 5, '≥ 95%'], ['Tardiness', 40, '≤ 4', '6', 3, '≤ 6']], _el: { ok: true, why: [] } }), '2026-09', { sr: true })),
      d: text(how(row(null), '2026-09', { sr: false })),
      f: text(how(row(null, { fin: 0.95, _adj: { fin: 0.95, by: 'Rasha K.' } }), '2026-09', { sr: false })),
      e: text(how({}, '2026-09', {})) };
  });
  ok([/2\.12 points ÷ 50% \(weights counted\) = 4\.237 → 4\.24 \(rounded to 2 decimals\)\./, /4\.24 ÷ 5 = 84\.8% → 85% \(rounded to a whole %\)\./, /No value for AHT and Tardiness: left out; the other weights \(50%\) count as 100%\./,
    /N\/A is left out\. A value on a band edge gets the ranking below\./, /Absence penalty: 2 absent days × 3 = 6 days off → 14 counted \(never below 1\)\./, /Earned = 1000 × 63\.6% × 85% = 540\.91 → 541 SR \(rounded\)\./,
    /Not eligible: 0 SR paid \(541 SR calculated\)\./].every(re => re.test(H.a)), 'How, rounding that changes the numbers, a penalty, no value');
  ok([/Points add up to 4\.237\./, /4\.237 reaches the row "4 or more" of the final % table: 90%\./, /No value for AHT and Tardiness: counted as ranking 1\./, /1 run of absence × 2 \+ 2 once = 4 days off → 16 counted\./,
    /Eligible: decided by the senior manager\./].every(re => re.test(H.b)), 'How, not rounded, the final % table, a run of absence, decided by the senior manager');
  ok([/Points add up to 4\.20\./, /4\.20 ÷ 5 = 84%\./, /Days % = 22 ÷ 22 = 100%\./, /Earned = 1000 × 100% × 84% = 840 SR\./, /Eligible\./].every(re => re.test(H.c)) && !/→/.test(H.c), 'How, nothing moved by rounding: no arrows, one number per step');
  ok(/^ ?Rebuilt from the saved numbers: this month was saved before the steps were kept\./.test(H.d) && /3\.93 ÷ 5 = 78\.6% → 79%\./.test(H.d) && /Not eligible\./.test(H.d) && !/SR/.test(H.d), 'How, rebuilt from the saved numbers, without SR');
  ok(H.e === 'No KPI results this month.', `How with nothing to show: ${H.e}`);
  ok(/3\.93 ÷ 5 = 78\.6%\. The senior manager set it to 95%\./.test(H.f) && !/→ 95%/.test(H.f), 'How, a final % set by hand in a month without its steps: the calculated value, then the hand value, no arrow');

  // the rules drawer: the defaults, whole % first, a hint for each rounding
  await p.evaluate(() => window.__mc.openRules());
  await p.waitForSelector('#dScore:not([hidden]) details.cntrules');
  await p.$eval('#dScore details.cntrules', d => { d.open = true; });
  const D = await p.$eval('#dScore details.cntrules', d => ({ pill: d.querySelector('summary .pill').textContent.trim(), val: d.querySelector('select[data-cnt="valDp"]').value, first: d.querySelector('select[data-cnt="valDp"] option').textContent,
    pct: d.querySelector('select[data-cnt="pctDp"]').value, text: d.textContent.replace(/\s+/g, ' ') }));
  ok(D.pill === 'the defaults', `the pill: ${D.pill}`);
  ok(D.val === '0' && /whole %/.test(D.first) && D.pct === '2', `percent KPIs whole % (${D.val}, "${D.first}"), final % whole % (${D.pct})`);
  ok(/half up/.test(D.text) && /Never rounded: 20 ÷ 23/.test(D.text), 'hints: half up, and the days % never rounded');
  await p.$eval('#dScore details.cntrules', d => d.scrollIntoView());
  await p.screenshot({ path: path.join(out, 'rounding-rules.png') });

  // not rounded: ranking 4, 98%, 980 SR; Undo brings back 1000
  await p.selectOption('#dScore select[data-cnt="valDp"]', '-1');
  await p.waitForTimeout(300);
  R = await row();
  const t1 = await p.$eval('#toastMsg', el => el.textContent);
  ok(R.adh && R.adh[0] === '94.96%' && R.adh[1] === 4 && R.fin === 0.98 && R.earned === 980, `not rounded: ${JSON.stringify(R)}`);
  ok(/Percent KPIs before ranking: rounded to a whole % → not rounded/.test(t1), `the change in words: ${t1}`);
  const rulesLine = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = window.__mc.howHtml({ fr: 4.9, fin: 0.98 }, '2026-09', { sr: false }); return d.querySelector('.howrules').textContent.replace(/\s+/g, ' ').trim(); });
  ok(/^Counted with the (first rules|rules from \w{3} \d{4})\. Changed from the default: percent KPIs before ranking\. See the rules$/.test(rulesLine), `How's last line: ${rulesLine}`);
  const pill2 = await p.$eval('#dScore details.cntrules summary .pill', el => el.textContent.trim());
  ok(pill2 === '1 setting changed', `the pill: ${pill2}`);
  await p.click('#toastAct');
  await p.waitForTimeout(300);
  R = await row();
  ok(R.earned === 1000 && R.adh[0] === '95%', `Undo: ${R.earned} SR, ${R.adh[0]}`);

  // the days % is never rounded: 20 of 22 days at 100% is 909 SR (a rounded 91% would give 910)
  await p.evaluate(w => { const M = window.__mc, r = M.state.history['2026-09'].rows.find(x => String(x.id) === w.id); Object.assign(r, { ka: 20, kat: 20, worked: 20 }); M.state.histVer++; }, who);
  R = await row();
  ok(R.earned === 909, `20 of 22 days: ${R.earned} SR`);

  // the Build month, as the WFM analyst: the KPI tab and its explanation
  if (exp) {
    const c2 = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), q = await c2.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message)); q.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await q.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
    await q.goto('file://' + page0);
    await q.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await q.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.finals = F.finals; M.state.histVer++; M.setWs('build'); });
    await q.setInputFiles('#picker', fs.readdirSync(exp).map(f => path.join(exp, f)));
    await q.waitForFunction(() => !window.__mc.state.pending.length && window.__mc.state.kpi && window.__mc.state.kpi.size > 0, null, { timeout: 30000 });
    const K = await q.evaluate(() => {
      for (const K of window.__mc.state.kpi.values()) { const x = K.res.rows.find(z => z.k.id === 'adh' && z.vr !== undefined); if (x && K.m.p.team === 'CC') return { pid: K.m.p._id, raw: x.v, vr: x.vr, r: x.r }; }
      return null;
    });
    ok(!!K, `a CC agent whose adherence has decimals: ${K && JSON.stringify(K)}`);
    if (K) {
      const fmt = v => { const x = Math.round(v * 10000) / 100; return x.toFixed(Number.isInteger(x) ? 0 : 2) + '%'; };
      ok(Math.abs(K.vr - Math.round(K.raw * 100) / 100) < 1e-12, `${fmt(K.raw)} counts as ${fmt(K.vr)}`);
      await q.evaluate(() => { const M = window.__mc; M.state.kpiTeam = 'CC'; M.renderKpiTab(); });
      const cell = await q.evaluate(pid => {
        const t = document.querySelector('#kpiBody table'), i = [...t.tHead.rows[0].cells].findIndex(c => /^Adherence/.test(c.textContent.trim()));
        const tr = [...t.tBodies[0].rows].find(r => r.querySelector(`[data-open="${pid}"]`));
        return tr && i >= 0 ? tr.cells[i].textContent.replace(/\s+/g, ' ').trim() : null;
      }, K.pid);
      ok(cell === `${fmt(K.vr)} ${K.r}`, `the KPI tab's Adherence cell: ${cell}`);
      await q.evaluate(pid => { const x = document.createElement('button'); x.dataset.how = pid; x.dataset.howk = 'build'; document.body.append(x); x.click(); x.remove(); }, K.pid);
      await q.waitForSelector('#dHow:not([hidden]) #howBody table');
      const a = await q.$eval('#howBody', el => [...el.querySelectorAll('tbody tr')].map(tr => [...tr.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim())).find(c => c[0] === 'Adherence'));
      ok(a && a[1] === `${fmt(K.raw)} → ${fmt(K.vr)}` && a[3] === String(K.r), `the Build month's How this was counted: ${JSON.stringify(a)}`);
      await q.screenshot({ path: path.join(out, 'rounding-build-how.png') });
    }
    await c2.close();
  }

  ok(!errs.length, `no errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
