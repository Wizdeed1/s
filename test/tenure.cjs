// Two incentive rules, in the browser, with synthetic people (test/fixture.js):
// 1. Months in the job (default 6): the incentive starts with the sixth full month in the job; the month someone joined counts only
//    when they joined on the 1st: joined 1 Jan 2026 -> from Jun 2026, joined 18 Jan 2026 -> from Jul 2026. A September draft agent who
//    joined 18 Apr 2026 earns 0 SR in September ("joined 18 Apr 2026: earns from Oct 2026"), one who joined on 1 Apr or in March earns
//    it; 0 months in the rules turns the rule off; no joining date, no check. The joining date comes from the roster file ("Joining
//    date") or the person's page.
// 2. The absence penalty: 3 days taken off the actual days for each Absent day (never for SL or another leave), so one absent day
//    costs 4 days in all: 22 scheduled, 1 absent, 21 attended -> 18 counted, 818 SR instead of 955.
// Usage: node test/tenure.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const page0 = path.resolve(process.argv[2] || 'out/mc.html');
const out = path.resolve(process.argv[3] || 'test/shots'); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
const ok = (c, m) => { if (!c) { console.log('✗ ' + m); process.exitCode = 1; } else console.log('✓ ' + m); };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }; }, [fixture]);
  await p.goto('file://' + page0);
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady);

  // the month a joining date gives
  const from = await p.evaluate(() => { const f = window.__mc.eligFrom; return { jan18: f({ joined: '2026-01-18' }, 6), jan1: f({ joined: '2026-01-01' }, 6), jul31: f({ joined: '2026-07-31' }, 6), none: f({}, 6), off: f({ joined: '2026-01-18' }, 0), year: f({ joined: '2025-11-03' }, 6), dec1: f({ joined: '2025-12-01' }, 6) }; });
  ok(from.jan18 === '2026-07', `joined 18 Jan 2026: from Jul 2026 (${from.jan18})`);
  ok(from.jan1 === '2026-06', `joined 1 Jan 2026: from Jun 2026 (${from.jan1})`);
  ok(from.jul31 === '2027-01' && from.year === '2026-05' && from.dec1 === '2026-05', `31 Jul 2026: Jan 2027; 3 Nov 2025: May 2026; 1 Dec 2025: May 2026 (${from.jul31}, ${from.year}, ${from.dec1})`);
  ok(from.none === '' && from.off === '', 'no joining date or 0 months: no rule');

  // a September draft agent in the top band of every KPI
  const who = await p.evaluate(() => {
    const M = window.__mc, F = window.__FIX__, H = JSON.parse(JSON.stringify(F.history)), S = H['2026-09'];
    const r = S.rows.find(x => x.team === 'CC' && x.brand === 'Virgin');
    Object.assign(r, { adh: 0.97, aht: 140, tardy: 0, ks: 22, ka: 22, kat: 22, absent: 0, worked: 22, kr: 0 });
    M.state.kpiFiles['2026-09'] = { at: '2026-10-01T09:00:00Z', rows: [{ id: String(r.id), name: r.n, cols: { 'drc csat': 0.9, 'quality observations': 0.96, 'empowerment utilization': 0.96, 'call reason fcr accuracy': 0.96 } }] };
    M.state.history = H; M.state.finals = {}; M.state.histVer++; M.state.finVer++; M.state.wsMonth = '2026-09';
    return { pid: M.state.roster.find(x => String(x.nid) === String(r.id))._id, id: String(r.id) };
  });
  const join = d => p.evaluate(([w, d]) => { const M = window.__mc; M.state.roster.find(x => x._id === w.pid).joined = d; M.state.ver++; }, [who, d]);
  const row = () => p.evaluate(w => { const r = window.__mc.liveRows('2026-09').find(x => String(x.id) === w.id); return { fin: r.fin, earned: r.earned, calc: r.earnedCalc, ok: r._el && r._el.ok, why: (r._el && r._el.why) || [], ka: r.ka, ks: r.ks }; }, who);
  let R = await row();
  ok(R.ok && R.earned === 1000 && R.fin === 1, `no joining date: eligible, 1000 SR (${R.earned})`);
  await join('2026-04-18'); R = await row();
  ok(!R.ok && R.earned === 0 && R.calc === 1000, `joined 18 Apr 2026: not eligible in September, 0 SR (calculated ${R.calc})`);
  ok(R.why.includes('joined 18 Apr 2026: earns from Oct 2026'), 'the reason: ' + JSON.stringify(R.why));
  await join('2026-03-18'); R = await row();
  ok(R.ok && R.earned === 1000, `joined 18 Mar 2026: six months done in August, eligible from September: ${R.earned} SR`);
  await join('2026-04-01'); R = await row();
  ok(R.ok && R.earned === 1000, `joined 1 Apr 2026: April is the first full month, September the sixth: ${R.earned} SR`);
  await join('2026-04-02'); R = await row();
  ok(!R.ok, 'joined 2 Apr 2026: from October, so not in September');

  // "How this was counted" says it
  await p.evaluate(w => { const x = document.createElement('button'); x.dataset.how = w.pid; x.dataset.howk = '2026-09'; document.body.append(x); x.click(); x.remove(); }, who);
  await p.waitForSelector('#dHow:not([hidden]) #howBody');
  const how = await p.$eval('#howBody', el => el.textContent.replace(/\s+/g, ' '));
  ok(/✗ joined 2 Apr 2026: 6 months in the job, earns from Oct 2026/.test(how) && /Not eligible\. Calculated 1000 SR, paid 0 SR\./.test(how), 'How this was counted: the joining date, the month it earns from, paid 0 SR');
  await p.screenshot({ path: path.join(out, 'tenure-how.png') });
  await p.keyboard.press('Escape');

  // the person's page shows the joining date and the month the incentive starts
  await p.evaluate(w => { const M = window.__mc; M.state.ws = 'team'; M.state.personK = '2026-09'; M.openPerson(w.pid); }, who);
  await p.waitForSelector('#personBody .pfacts');
  const facts = await p.$eval('#personBody .pfacts', el => el.textContent.replace(/\s+/g, ' '));
  ok(/Joined\s*2 Apr 2026\s*incentive from Oct 2026/.test(facts), 'person page: ' + facts.slice(-60));
  await p.keyboard.press('Escape');

  // the rules: 0 months turns it off, 6 brings it back
  await p.evaluate(() => window.__mc.openRules());
  await p.waitForSelector('#dScore:not([hidden]) input[data-eligf="minMonths"]');
  const val0 = await p.$eval('input[data-eligf="minMonths"]', i => i.value);
  ok(val0 === '6', 'the rules show 6 months in the job by default');
  const help = await p.$eval('input[data-eligf="minMonths"]', i => i.closest('.field').textContent.replace(/\s+/g, ' '));
  ok(/joined 1 January 2026: from June 2026; joined 18 January 2026: from July 2026/.test(help), 'the rules explain it with the examples: ' + (help.match(/Months in the job:[^)]*\)/) || [''])[0]);
  await p.screenshot({ path: path.join(out, 'tenure-rules.png') });
  await p.fill('input[data-eligf="minMonths"]', '0'); await p.press('input[data-eligf="minMonths"]', 'Tab');
  await p.waitForTimeout(300); R = await row();
  ok(R.ok && R.earned === 1000, `0 months in the rules: eligible again (${R.earned} SR)`);
  await p.fill('input[data-eligf="minMonths"]', '6'); await p.press('input[data-eligf="minMonths"]', 'Tab');
  await p.waitForTimeout(300); R = await row();
  ok(!R.ok && R.earned === 0, 'back to 6: not eligible in September');
  await join(''); R = await row();
  ok(R.ok, 'joining date cleared: not checked');

  // rule 2: 4 days off the actual days for each Absent day
  await p.evaluate(w => { const M = window.__mc, r = M.state.history['2026-09'].rows.find(x => String(x.id) === w.id); Object.assign(r, { ks: 22, ka: 21, kat: 21, absent: 1, kr: 1, worked: 21 }); M.state.histVer++; }, who);
  R = await row();
  ok(R.ka === 21 && R.earned === 955, `22 scheduled, 1 absent, no penalty: 21 days, ${R.earned} SR`);
  await p.evaluate(() => { const d = document.querySelector('details[data-det="cnt"]'); if (d && !d.open) d.querySelector('summary').click(); });
  const penHelp = await p.$eval('[data-cnt="absentExtra"]', i => i.closest('.cntrow').textContent.replace(/\s+/g, ' '));
  ok(/Only Absent days count, never SL, AL or another leave/.test(penHelp), 'the absence penalty says only Absent days count');
  await p.fill('[data-cnt="absentExtra"]', '3'); await p.press('[data-cnt="absentExtra"]', 'Tab');
  await p.waitForTimeout(300); R = await row();
  ok(R.ka === 18 && R.earned === 818, `3 more days off per absent day (4 in all): 21 - 3 = ${R.ka} days counted of 22, ${R.earned} SR`);
  await p.screenshot({ path: path.join(out, 'tenure-penalty.png') });
  await p.keyboard.press('Escape');

  // the joining date from a roster file and from the person's page (as an analyst)
  await p.evaluate(() => { window.__mcUser.role = 'user'; });
  const csv = path.join(out, 'roster-joining.csv'), nm = await p.evaluate(w => window.__mc.state.roster.find(x => x._id === w.pid).name, who), nid = who.id;
  fs.writeFileSync(csv, `Name,National ID,Brand,Team,Joining date\n${nm},${nid},Virgin,CC,18/01/2026\n`);
  await p.setInputFiles('#rosterPicker', csv);
  await p.waitForSelector('#dConfirm:not([hidden]) #confirmOk:not([disabled])');
  const plan = await p.$eval('#confirmBody', el => el.textContent.replace(/\s+/g, ' '));
  ok(/joined: 18 Jan 2026/.test(plan), 'roster import shows the joining date it adds');
  await p.click('#confirmOk');
  await p.waitForFunction(w => window.__mc.state.roster.find(x => x._id === w.pid).joined === '2026-01-18', who, { timeout: 5000 });
  ok(true, 'roster import: Joining date 18/01/2026 saved as 2026-01-18');
  await p.evaluate(w => { const M = window.__mc; M.state.ws = 'build'; M.state.peditOpen = true; M.openPerson(w.pid); }, who);
  await p.waitForSelector('#personBody input[data-pf="joined"]');
  ok(await p.$eval('#personBody input[data-pf="joined"]', i => i.value) === '2026-01-18', "the person's page shows it in Edit");
  await p.fill('#personBody input[data-pf="joined"]', '2026-02-10'); await p.press('#personBody input[data-pf="joined"]', 'Tab');
  await p.waitForFunction(w => window.__mc.state.roster.find(x => x._id === w.pid).joined === '2026-02-10', who, { timeout: 5000 });
  ok(true, "the person's page: joining date changed to 10 Feb 2026");

  if (errs.length) { console.log(errs.join('\n')); process.exitCode = 1; } else console.log('no errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
