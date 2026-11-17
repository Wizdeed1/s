// Opens every MiniPad page in Chromium at iPad mini size, clicks through the main actions,
// and fails on any script error or broken layout. Screenshots go to SHOTS_DIR if set.
// Run: node minipad/test/smoke.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('{"error":"not found"}'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(6000);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource|open-meteo/i.test(m.text())) errors.push('console: ' + m.text()); });
  // No network in tests: answer the weather services with a canned reply.
  await page.route(/open-meteo\.com/, (route) => {
    const u = route.request().url();
    const body = u.includes('geocoding') ? { results: [{ name: 'Leeds', latitude: 53.8, longitude: -1.55, country: 'United Kingdom', admin1: 'England' }] } :
      { current: { temperature_2m: 11.4, apparent_temperature: 9.8, weather_code: 3, wind_speed_10m: 14, is_day: 1 },
        daily: { time: ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'], weather_code: [3, 61, 2, 0, 71],
          temperature_2m_max: [12, 10, 9, 8, 4], temperature_2m_min: [6, 5, 3, 1, -1], precipitation_probability_max: [20, 80, 10, 0, 60] } };
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  async function open(hash) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await wait(350);
  }
  async function shot(name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
  async function modalOk(label) { await page.click(`.modal .sheet-btns .btn:has-text("${label}")`); await wait(250); }
  async function expectNoOverflow(name) {
    const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.querySelector('#view').scrollWidth));
    if (w > 770) errors.push(`${name}: page is ${w}px wide (wider than the iPad)`);
  }
  async function check(name, fn) {
    const before = errors.length;
    try { await fn(); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
    console.log((errors.length > before ? '✗ ' : '✓ ') + name + (errors.length > before ? '  ' + errors.slice(before).join(' | ') : ''));
    const leftover = await page.$('#modal .modal');
    if (leftover) {
      errors.push(`${name}: a dialog was left open`);
      await page.evaluate(() => { document.querySelector('#modal').innerHTML = ''; });
    }
    const broken = await page.$('.empty:has-text("Something went wrong")');
    if (broken) errors.push(`${name}: page crashed on mount`);
    await expectNoOverflow(name);
    await shot(name);
  }

  await page.goto(base);
  await wait(500);
  await check('launcher', async () => {
    const tiles = await page.$$('.tile');
    if (tiles.length !== 23) throw new Error('expected 23 tiles, got ' + tiles.length);
  });

  await check('dashboard', async () => {
    await open('#/dashboard');
    await page.fill('#todo-in', 'Water the plants');
    await page.press('#todo-in', 'Enter');
    await page.waitForSelector('#todos .row:has-text("Water the plants")');
    await page.click('#bar-actions [data-act="city"]');
    await page.fill('.modal [name="q"]', 'Leeds');
    await modalOk('Search');
    await modalOk('Use this');
    await page.waitForSelector('.dw-temp');
  });

  await check('kitchen', async () => {
    await open('#/kitchen');
    await page.click('[data-preset="5"]');
    await page.waitForSelector('.k-timer');
    await page.click('[data-tab="recipes"]');
    await page.click('.k-rrow >> nth=0');
    await page.waitForSelector('.k-recipe');
    await page.click('a:has-text("Start cooking")');
    await page.waitForSelector('.k-ctext');
    await page.click('[data-act="next"]');
    await page.click('[data-act="next"]');
    await page.click('[data-act="next"]');
    await page.waitForSelector('[data-act="ctimer"]');   // "Let the batter rest for 5 minutes"
  });

  await check('family', async () => {
    await open('#/family');
    await page.fill('#f-in', 'Apples');
    await page.click('[data-act="addshop"]');
    await page.click('[data-quick="Milk"]');
    await page.waitForSelector('.row:has-text("Milk")');
    await page.click('[data-tab="note"]');
    await page.click('[data-act="addnote"]');
    await page.fill('.modal [name="text"]', 'Dentist on Friday at 4');
    await modalOk('Save');
    await page.waitForSelector('.f-note');
  });

  await check('facetime', async () => {
    await open('#/facetime');
    await page.click('[data-act="add"]');
    await page.fill('.modal [name="name"]', 'Grandma');
    await page.fill('.modal [name="addr"]', '+44 7700 900123');
    await modalOk('Save');
    await page.waitForSelector('.ft-card:has-text("Grandma")');
  });

  await check('nightclock', async () => {
    await open('#/nightclock');
    await page.click('#nc');
    await page.waitForSelector('#ncui:not([hidden])');
    await page.click('[data-color="#ff9f0a"]');
  });
  await open('#/');

  for (const g of ['count', 'abc', 'memory', 'times', 'spell', 'read']) {
    await check('kids-' + g, async () => {
      await open('#/kids/' + g);
      if (g === 'count') await page.click('.kid-ans >> nth=0');
      if (g === 'abc') await page.click('.kid-letter >> nth=1');
      if (g === 'memory') { await page.click('.mm-card >> nth=0'); await page.click('.mm-card >> nth=1'); }
      if (g === 'times') { await page.click('[data-t="3"]'); await page.click('[data-k="1"]'); await page.click('[data-k="ok"]'); }
      if (g === 'spell') await page.click('.sp-tile >> nth=0');
      if (g === 'read') await page.click('[data-step="1"]');
    });
  }

  await check('flashcards', async () => {
    await open('#/flashcards');
    await page.click('.fc-row >> nth=0');
    await page.click('a:has-text("Study now")');
    await page.click('[data-act="flip"]');
    await page.click('[data-act="good"]');
    await page.waitForSelector('.fc-card');
  });

  await check('draw', async () => {
    await open('#/draw');
    await wait(200);
    const box = await page.$eval('#dr-paint', (c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 260, { steps: 12 });
    await page.mouse.up();
    await page.click('[data-act="pages"]');
    await page.click('.dr-page[data-v="fish"]');
    await modalOk('Start');   // it asks before wiping the drawing
    await wait(200);
    await page.click('[data-act="undo"]');
  });

  await check('sudoku', async () => {
    await open('#/sudoku');
    await modalOk('Easy');
    await page.waitForSelector('.su-cell', { timeout: 15000 });
    const empty = await page.$('.su-cell:not(.given)');
    await empty.click();
    await page.click('[data-n="5"]');
    await page.click('[data-act="hint"]');
  });

  await check('wordsearch', async () => {
    await open('#/wordsearch');
    await modalOk('Start');
    await page.waitForSelector('.ws-cell');
  });

  await check('chess', async () => {
    await open('#/chess');
    await modalOk('Start');
    await page.click('[data-sq="52"]');          // e2
    await page.click('[data-sq="36"]');          // e4
    await page.waitForFunction(() => /White to move/.test(document.querySelector('#ch-status').textContent), null, { timeout: 15000 });
  });

  await check('piano', async () => {
    await open('#/piano');
    await page.click('.pk.white >> nth=0');
    await page.click('[data-act="learn"]');
    await page.click('.modal [data-v="Twinkle, Twinkle"]');
    await page.waitForSelector('.pk.next');
  });

  await check('drums', async () => {
    await open('#/drums');
    await page.click('.dm-pad >> nth=0');
    await page.click('[data-act="play"]');
    await wait(400);
    await page.click('[data-act="play"]');
  });

  await check('sounds', async () => { await open('#/sounds'); await page.click('.sb-btn >> nth=4'); });

  await check('sleep', async () => {
    await open('#/sleep');
    await page.click('[data-kind="rain"]');
    await page.waitForSelector('#now-playing:not([hidden])');
    await page.click('[data-min="30"]');
  });
  await check('sleep-stop', async () => { await page.click('.np-stop', { timeout: 3000 }); });

  await check('prompter', async () => {
    await open('#/prompter');
    await page.click('[data-act="go"]');
    await wait(400);
    await page.click('[data-act="faster"]');
    await page.click('[data-act="exit"]');
  });

  await check('focus', async () => {
    await open('#/focus');
    await page.click('[data-act="start"]');
    await page.waitForSelector('[data-act="pause"]');
    await page.click('[data-act="reset"]');
  });

  await check('habits', async () => { await open('#/habits'); await page.click('[data-act="today"] >> nth=0'); await page.waitForSelector('.hb-today.on'); });

  await check('meds', async () => {
    await open('#/meds');
    await page.click('.wrap [data-act="add"]');
    await page.fill('.modal [name="name"]', 'Vitamin D');
    await page.fill('.modal [name="dose"]', '1 tablet');
    await modalOk('Save');
    await page.waitForSelector('.md-row');
  });

  await check('notebook', async () => {
    await open('#/notebook');
    await page.click('#bar-actions [data-act="new"]');
    await page.fill('#nb-text', 'Shopping ideas\nBuy a birthday card');
    await wait(700);
    await page.click('#bar-back');
    await page.waitForSelector('.nb-row:has-text("Shopping ideas")');
  });

  await check('claude', async () => {
    await open('#/claude');
    await page.fill('#cl-in', 'Hello there');
    await page.click('[data-act="send"]');
    await page.waitForSelector('.cl-error');   // no server in this test: shows a friendly error
  });

  await check('tips', async () => { await open('#/tips'); await page.click('.tip >> nth=2 >> summary'); });

  await check('settings', async () => {
    await open('#/settings');
    await page.click('[data-setting="theme"] [data-value="dark"]');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (theme !== 'dark') throw new Error('dark theme not applied');
    await open('#/');
  });
  await shot('launcher-dark');

  // Timers ring on any page.
  await check('timer-rings', async () => {
    await page.evaluate(() => MP.timers.add('Eggs', 1200, 'kitchen'));
    await open('#/sounds');
    await page.waitForSelector('.ring-modal', { timeout: 5000 });
    await modalOk('Stop');
  });

  await browser.close();
  server.close();
  if (errors.length) { console.error(errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
  console.log('ok: all pages opened and the main actions worked with no script errors');
}

main().catch((e) => { console.error(e); server.close(); process.exit(1); });
