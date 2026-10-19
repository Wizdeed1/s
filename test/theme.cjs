// The appearance: System (the first choice, as the computer is set), Light or Dark, from the account menu (everyone), Settings
// (the people who build the month) and Search; kept in this browser and applied before the first paint; System follows the
// computer live. Usage: node test/theme.cjs page.html outDir
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.js'), 'utf8'), [page0, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const admin = { id: 'u0', name: 'Sara K.', username: 'sara.k', role: 'admin' }, agent = { id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' };
let bad = 0; const ok = (c, m) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + m); };
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (user, w = 1440, h = 900, ctx0) => {
    const ctx = ctx0 || await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: 'dark' }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(([fx, u]) => {
      eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = u;
      // what the page carries when the body starts, before any of the tool's own scripts ran (the first paint)
      new MutationObserver((L, o) => { if (document.body) { window.__themeAtBody = document.documentElement.getAttribute('data-theme'); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
    }, [fixture, user]);
    await p.goto('file://' + path.resolve(page0));
    await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
    return { p, ctx };
  };
  const look = p => p.evaluate(() => ({ theme: document.documentElement.dataset.theme, atBody: window.__themeAtBody, bg: getComputedStyle(document.body).backgroundColor, stored: localStorage.getItem('mc-theme'),
    checked: [...document.querySelectorAll('#acctMenu [data-theme-set]')].filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.dataset.themeSet).join(),
    meta: [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content).join() }));
  const DARK = 'rgb(11, 11, 12)', LIGHT = 'rgb(242, 242, 247)';

  // a computer set to dark, nothing chosen yet: System, so dark
  let { p, ctx } = await open(admin);
  let s = await look(p);
  ok(s.theme === 'dark' && s.atBody === 'dark' && s.bg === DARK && s.checked === 'system', `System on a dark computer: dark from the first paint (${s.atBody}, ${s.bg}, checked ${s.checked})`);
  // Light from the account menu: at once, the menu stays open, kept in this browser
  await p.click('#acctBtn'); await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(out, 'appearance-menu-dark.png') });
  await p.click('#acctMenu [data-theme-set="light"]'); await p.waitForTimeout(150);
  s = await look(p);
  ok(s.theme === 'light' && s.bg === LIGHT && s.stored === 'light' && s.checked === 'light' && s.meta === '#f2f2f7,#f2f2f7', `Light from the account menu: ${s.bg}, kept as ${s.stored}, toolbar colour ${s.meta}`);
  ok(await p.evaluate(() => !document.getElementById('acctMenu').hidden), 'the menu stays open after the choice');
  await p.screenshot({ path: path.join(out, 'appearance-menu-light.png') });
  // the keyboard: right arrow moves to Dark
  await p.focus('#acctMenu [data-theme-set="light"]'); await p.keyboard.press('ArrowRight');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.themeSet === 'dark'), 'right arrow moves to the next choice');
  await p.keyboard.press('Escape');
  // a new visit keeps it from the first paint, though the computer is dark
  await p.reload(); await p.waitForFunction(() => window.__mc && window.__mc.state && window.__mc.state.rosterReady, null, { timeout: 15000 });
  s = await look(p);
  ok(s.atBody === 'light' && s.theme === 'light' && s.bg === LIGHT, `reload: light before the tool's scripts ran (${s.atBody})`);
  // Settings has the same choice
  await p.click('#setBtn'); await p.waitForTimeout(300);
  ok(await p.getAttribute('#theme [data-f="light"]', 'aria-pressed') === 'true', 'Settings shows Light');
  await p.click('#theme [data-f="dark"]'); await p.waitForTimeout(150);
  s = await look(p);
  ok(s.theme === 'dark' && s.stored === 'dark' && s.checked === 'dark', `Dark from Settings, and the account menu follows (${s.checked})`);
  await p.screenshot({ path: path.join(out, 'appearance-settings.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // System follows the computer, live
  await p.click('#acctBtn'); await p.click('#acctMenu [data-theme-set="system"]'); await p.keyboard.press('Escape');
  await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(150);
  s = await look(p);
  ok(s.theme === 'light' && s.bg === LIGHT && s.stored === 'system', `System: the computer turns light, so does the page (${s.bg})`);
  await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(150);
  ok((await look(p)).theme === 'dark', 'and dark again with it');
  // Dark and Light stay put when the computer changes
  await p.click('#acctBtn'); await p.click('#acctMenu [data-theme-set="light"]'); await p.keyboard.press('Escape');
  await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(100);
  ok((await look(p)).theme === 'light', 'a chosen Light stays light on a dark computer');
  // Search: "dark mode"
  await p.keyboard.press('Control+k'); await p.waitForSelector('#findQ'); await p.fill('#findQ', 'dark appearance'); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok((await look(p)).theme === 'dark', 'Search › Dark appearance');
  await ctx.close();

  // a phone: the account menu is a sheet with the same choice
  ({ p, ctx } = await open(admin, 390, 844));
  await p.click('#acctBtn'); await p.waitForTimeout(200);
  const r = await p.evaluate(() => { const q = document.querySelector('#acctMenu .appear').getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), vh: innerHeight }; });
  ok(r.top >= 0 && r.bottom <= r.vh, `phone: the choice is on the screen in the account sheet (${r.top}–${r.bottom} of ${r.vh})`);
  await p.click('#acctMenu [data-theme-set="light"]'); await p.waitForTimeout(150);
  ok((await look(p)).theme === 'light', 'phone: Light');
  await p.screenshot({ path: path.join(out, 'appearance-phone.png') });
  await ctx.close();

  // a role with one page (the agent) has it too, in the account menu
  ({ p, ctx } = await open(agent));
  await p.click('#acctBtn'); await p.waitForTimeout(150);
  ok(await p.isVisible('#acctMenu [data-theme-set="dark"]'), 'the agent can choose it in the account menu');
  await ctx.close();

  console.log(errs.length ? errs.join('\n') : 'no errors'); if (bad || errs.length) process.exitCode = 1;
  await b.close();
})();
