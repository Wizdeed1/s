// Saved uploads: the month's exports and attendance sheets are kept, so a reload (or a sign-out and in) puts the month back
// in Build by itself; WFM team › Import › Saved uploads lists them by month, moves one to another month, deletes one (and
// takes it out of Build), and a file taken out of Build is deleted from the saved ones (Undo brings it back).
// Usage: node test/uploads.cjs page.html exportsDir outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [page0, exp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }; }, [fixture]);
  const boot = async () => { await p.goto('file://' + path.resolve(page0)); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady); };
  const slots = () => p.evaluate(() => Object.entries(window.__mc.state.slots).filter(([, v]) => v).map(([k, v]) => `${k}:${v.upId ? 'saved' : 'not saved'}`).sort().join(','));
  const saved = () => p.evaluate(() => [...document.querySelectorAll('#upCard .uplist li')].map(li => li.querySelector('b').textContent).sort());
  await boot();
  const files = fs.readdirSync(exp).filter(f => /\.(csv|xlsx)$/i.test(f) && !/^Book1/.test(f)).map(f => path.join(exp, f));
  await p.evaluate(() => window.__mc.setStep('import'));
  await p.setInputFiles('#picker', files);
  await p.waitForFunction(() => Object.keys(window.__mc.state.slots).length >= 4 && !window.__mc.state.pending.length, null, { timeout: 30000 });
  await p.waitForFunction(() => document.querySelectorAll('#upCard .uplist li').length >= 4, null, { timeout: 15000 });
  let s = await slots(), L = await saved();
  ok(L.length === 4 && !/not saved/.test(s), `every export is kept as it is dropped (${L.length} saved; ${s})`);
  const month = await p.evaluate(() => window.__mc.state.y + '-' + window.__mc.state.m);
  await p.screenshot({ path: path.join(out, 'uploads-list.png'), fullPage: false });
  // a reload is a sign-out and in: the month comes back by itself
  await boot();
  await p.waitForFunction(() => Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 30000 });
  s = await slots();
  ok(!/not saved/.test(s) && (await p.evaluate(() => window.__mc.state.y + '-' + window.__mc.state.m)) === month, `after a reload the month is back in Build, as it was (${s})`);
  ok(await p.evaluate(() => !!window.__mc.state.ctx), 'and read again: the month is ready to review and build');
  // the list: move a file to another month, then delete another (it leaves Build too)
  await p.evaluate(() => window.__mc.setStep('import')); await p.waitForTimeout(300);
  const sel = await p.$('#upCard [data-upk]'); const id = await sel.getAttribute('data-upk');
  const other = await sel.evaluate(el => [...el.options].map(o => o.value).find(v => v !== el.value));
  await sel.selectOption(other); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelectorAll('#upCard .upmonth').length) === 2, `a file moved to ${other}: two months in the list now`);
  ok(!(await p.evaluate(i => Object.values(window.__mc.state.slots).some(v => v && v.upId === i), id)), 'it left Build, which holds the other month');
  await (await p.$('#upCard')).screenshot({ path: path.join(out, 'uploads-card.png') });
  await p.selectOption('#upCard [data-upmonth]', other); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#upCard .uplist li').length) === 1, 'the month filter shows that month only');
  await p.selectOption('#upCard [data-upmonth]', ''); await p.waitForTimeout(200);
  const del = await p.$(`#upCard [data-updel]:not([data-updel="${id}"])`), did = await del.getAttribute('data-updel');
  await del.click(); await p.waitForTimeout(150);
  ok(await p.evaluate(i => document.querySelector(`#upCard [data-updel="${i}"]`).textContent, did) === 'Delete It?', 'Delete asks once');
  await p.click(`#upCard [data-updel="${did}"]`); await p.waitForTimeout(500);
  ok(!(await p.evaluate(i => Object.values(window.__mc.state.slots).some(v => v && v.upId === i), did)) && (await saved()).length === 3, 'deleted: gone from the list and out of Build');
  // a slot taken out of Build: its saved copy goes; Undo brings both back
  const n0 = (await saved()).length, k0 = await p.evaluate(() => Object.keys(window.__mc.state.slots).find(k => window.__mc.state.slots[k].upId));
  await p.click(`#slots [data-unslot="${k0}"]`); await p.waitForTimeout(500);
  const n1 = (await saved()).length;
  await p.click('.toast button'); await p.waitForTimeout(600);
  const n2 = (await saved()).length;
  ok(n1 === n0 - 1 && n2 === n0, `taking a file out of Build deletes its saved copy (${n0} → ${n1}); Undo puts it back (${n2})`);
  await p.screenshot({ path: path.join(out, 'uploads-after.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
