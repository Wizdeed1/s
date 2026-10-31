// Every email the tool makes is in the emails' card (the Monthly Deduction email's look): the navy band with the email's name,
// the white card on a light ground, the status band, the tables with a navy heading row and the footer. In the browser, synthetic
// data only (test/fixture.js): the senior manager's four emails (One-to-ones ready, the reminder, Results for review, the final
// result form) are made with their buttons and read back from the .eml; the KPI email that is copied for Outlook is made too.
// Each is saved as .html and as a picture in outDir to look at.
// Usage: node test/mailcard.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
/** the text/html part of an .eml (base64) */
function htmlOf(eml) {
  const m = eml.match(/Content-Type: text\/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n\r\n--/);
  return m ? Buffer.from(m[1].replace(/\r\n/g, ''), 'base64').toString('utf8') : '';
}
/** the card: the navy band with its label and title, the light ground, the footer; none of the old plain Calibri body */
const isCard = (h, eyebrow, title) => h.includes('background:#0F172A') && h.includes('background:#F1F5F9') && h.includes(eyebrow) && h.includes(title) && h.includes('Member Care · Workforce Management') && !/font-family:Calibri,sans-serif;font-size:11pt/.test(h);
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(([fx]) => { eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' }; }, [fixture]);
  await p.goto('file://' + path.resolve(page0));
  await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
  await p.evaluate(() => { const M = window.__mc, F = window.__FIX__; M.state.history = F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer++; M.setWs('cycle'); M.renderWs(); });
  await p.waitForSelector('[data-mail4="ready"]', { timeout: 15000 });
  // no shared folder here: the deadline (passed: the reminder is overdue) and the incentive list (everyone) set as the page keeps them
  // every name in the roster closes an attribute and adds an <img onerror>: it must reach the emails as text only
  await p.evaluate(() => { const M = window.__mc, k = M.state.wsMonth; M.state.cycles[k] = { k, deadline: '2026-10-01' }; M.state.incList = { items: M.state.roster.filter(q => q.status !== 'Inactive').map(q => ({ pid: q._id, n: '' })) }; for (const q of M.state.roster) q.name = q.name + ' "><img src=x onerror=alert(1)>'; M.state.ver++; M.renderWs(); });
  await p.waitForTimeout(300);
  const shot = async (name, html) => {
    fs.writeFileSync(path.join(out, name + '.html'), html);
    const v = await ctx.newPage(); await v.setViewportSize({ width: 900, height: 900 }); await v.setContent(html); await v.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); await v.close();
  };
  const want = {
    ready: ['MC Workforce · One-to-ones', 'One-to-ones Are Ready', 'One-to-ones due'],
    warn: ['MC Workforce · Overdue', 'One-to-ones Overdue', 'Overdue since'],
    review: ['MC Incentive · For review', 'Incentive Results', 'For review'],
    final: ['MC Incentive · Final result', 'Final Result', 'Signatures'],
  };
  for (const [k, [eyebrow, title, band]] of Object.entries(want)) {
    const btn = await p.$(`[data-mail4="${k}"]:not([disabled])`);
    if (!btn) { ok(false, `${k}: the button is there and on`); continue; }
    let d = null;
    try { [d] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), btn.click()]); } catch (e) { ok(false, `${k}: no email was made (${(await p.textContent('#toast').catch(() => '')) || e.message})`); continue; }
    const f = path.join(out, `${k}.eml`); await d.saveAs(f);
    const h = htmlOf(fs.readFileSync(f, 'utf8'));
    ok(isCard(h, eyebrow, title) && h.includes(band), `${k}: in the card ("${eyebrow}", "${title}", the band "${band}")`);
    ok(/<td nowrap style="background:#0F172A;border:none;padding:6pt 10pt">/.test(h), `${k}: its table has the navy heading row`);
    ok(h.includes('&lt;img src=x onerror=alert(1)&gt;') && !/<img src=x/i.test(h), `${k}: the names are in it as text, no markup from them`);
    await shot(`mail-${k}`, h);
  }
  // the KPI email, copied for Outlook
  // (one person's results as the KPI tab has them; a name that looks like markup stays text)
  const kpi = await p.evaluate(() => window.__mc.kpiEmailHtml({ m: { exp: 'Waleed <img src=x onerror=alert(1)> G.', p: { brand: 'Virgin', team: 'CC' } }, res: { rows: [{ k: { name: 'Adherence', unit: 'pct' }, v: 0.931, r: 4 }, { k: { name: 'AHT', unit: 'sec' }, v: 312.44, r: 3 }, { k: { name: 'Quality of Work', unit: 'pct' }, v: 0.97, r: 5 }], finalRank: 3.9, finalPct: 0.84, sched: 22, actual: 21, daysPct: 0.955, target: 1000, earned: 840 } }));
  ok(isCard(kpi, 'MC Workforce · KPI results', 'KPI Results') && /Adherence[\s\S]*93\.10%[\s\S]*Final %[\s\S]*84/.test(kpi), 'the KPI email (copied for Outlook): in the card, each KPI with its ranking, then the result');
  ok(!/<img src=x/.test(kpi), 'the KPI email: a name that looks like markup stays text');
  await shot('mail-kpi', kpi);
  ok(!errs.length, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
