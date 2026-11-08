// The backup video for the meeting: a month in the tool in about a minute, with captions and a visible pointer, from the made-up
// test data only (test/fixture.js and the made-up September 2026 exports). It shows the product as each role sees it, signed in as
// that role and tells what each gets from it (the month's files go in off camera); it never shows the admin's meeting tools, so
// it can be sent after the meeting too.
// Usage: node tools/meeting/make_video.cjs page.html exportsDir out.mp4   (Playwright with Chromium, and ffmpeg)
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const [page0, exp, outMp4] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..', '..');
const fixture = fs.readFileSync(path.join(ROOT, 'test', 'fixture.js'), 'utf8');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'beyond-one-white.png')).toString('base64');
const USERS = { user: { id: 'u1', name: 'Yousef T.', username: 'yousef.t', role: 'user' }, senior: { id: 'u3', name: 'Faisal M.', username: 'faisal.m', role: 'senior' },
  spv: { id: 'u4', name: 'Ghada S.', username: 'ghada.s', role: 'spv', pid: 'p6' }, agent: { id: 'a1', name: 'Lina A.', username: 'lina.a', role: 'agent', pid: 'p20' } };
const NOW = new Date('2026-10-08T07:30:00Z');   // 10:30 in Riyadh: the September close under way
const W = 1280, H = 720, tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(outMp4)), '.video-'));
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, timezoneId: 'Asia/Riyadh', colorScheme: 'light', reducedMotion: 'reduce', recordVideo: { dir: tmp, size: { width: W, height: H } } });
  await ctx.clock.setFixedTime(NOW);
  await ctx.addInitScript(([fx, U]) => {
    const who = new URLSearchParams(location.search).get('as') || 'user';
    eval(fx); window.__NOLOCK__ = true; window.__ROSTER__ = window.__FIX__.roster; window.__mcUser = U[who];
    try { localStorage.setItem('mc-theme', 'light'); if (who === 'agent') localStorage.setItem('mc-lang:' + U[who].id, 'ar'); } catch (e) { /* none */ }
    // a black curtain while each page loads, so a change of page never flashes white (the document is still empty here)
    const st = document.createElement('style'); st.id = 'vidCurtain'; st.textContent = 'html { background: #080808; } body { opacity: 0; }';
    const put = () => { if (!document.documentElement) return false; document.documentElement.appendChild(st); return true; };
    if (!put()) new MutationObserver((m, o) => { if (put()) o.disconnect(); }).observe(document, { childList: true });
  }, [fixture, USERS]);
  const p = await ctx.newPage(), errs = [], t0 = Date.now(), now = () => (Date.now() - t0) / 1000, cuts = []; p.on('pageerror', e => errs.push(e.message));

  /** open the tool as a role, with the made-up months (September the close under way, the months before it final) and the quality numbers */
  async function open(role, setup, first) {   // first: the title card, shown at once over the first page
    const tA = now();
    await p.goto('file://' + path.resolve(page0) + '?as=' + role); await p.waitForFunction(() => window.__mc && window.__mc.state.rosterReady);
    await p.evaluate(() => {
      const M = window.__mc, F = window.__FIX__, S = M.state, keys = Object.keys(F.history).sort(), last = keys[keys.length - 1];
      let seed = 29; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }, cap = x => Math.round(Math.max(0.7, Math.min(1, x)) * 10000) / 10000;
      keys.forEach((k, i) => {
        const rows = {};
        for (const r of F.history[k].rows) {
          r.ks = 22; r.ka = r.kat = r.worked; r.kab = r.absent; r.kr = r.absent ? 1 : 0;
          const per = S.roster.find(x => x.nid === r.id); if (!per) continue;
          const base = 0.82 + (r.fin || 0.85) * 0.14, qa = cap(base + (rnd() - 0.5) * 0.04);
          rows[per._id] = { n: per.name, kpi: { qobs: qa, emp: cap(base + (rnd() - 0.4) * 0.06), fcr: cap(base + (rnd() - 0.45) * 0.06) }, eval: { callqa: qa }, crit: [], qv: 2 };
        }
        S.quality[k] = { csat: 0.86 + (i % 5) / 100, rows, src: `Final EVAL - ${k}.xlsx`, by: 'Quality team', at: `${k}-28T10:00:00Z` };
        if (k !== last && !F.finals[k]) F.finals[k] = { y: +k.slice(0, 4), m: +k.slice(5), status: 'final', byName: 'Senior manager', at: `${k}-28T12:00:00Z`, rows: F.history[k].rows };
      });
      const done = { at: '2026-10-05T09:00:00Z', by: 'Noura B.' };
      S.history = F.history; S.finals = F.finals; S.histVer++; S.finVer++; S.qualityVer++; S.wsMonth = last;
      S.calMarks = { [last]: { k: last, marks: Object.fromEntries(['built', 'eval', 'shared', 'ready', 'objections'].map(s => [s, done])) } };
    });
    if (setup) await p.evaluate(setup);
    await p.waitForTimeout(400);
    await p.evaluate(([LOGO, first]) => {
      const s = document.createElement('style');
      s.textContent = `#toast, #busy { display: none !important; } *, *::before, *::after { caret-color: transparent !important; }
        .vcap { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 2147483600; max-width: 80%; padding: 12px 22px; border-radius: 12px; background: rgba(8, 8, 8, .88);
          color: #fff; font: 500 20px/1.35 Poppins, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity .35s ease; }
        .vcap.on { opacity: 1; }
        .vcur { position: fixed; left: -40px; top: -40px; z-index: 2147483601; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; background: rgba(13, 118, 189, .28); border: 2px solid #0d76bd; pointer-events: none; transition: transform .12s ease; }
        .vcur.dn { transform: scale(.7); background: rgba(13, 118, 189, .55); }
        .vcard { position: fixed; inset: 0; z-index: 2147483602; background: #080808; color: #fff; display: flex; flex-direction: column; justify-content: center; padding: 0 110px; font-family: Poppins, system-ui, sans-serif; opacity: 0; transition: opacity .5s ease; pointer-events: none; }
        .vcard.on { opacity: 1; } .vcard img { height: 60px; width: auto; align-self: flex-start; margin-bottom: 34px; }
        .vcard h1 { font: 300 52px/1.08 Poppins, sans-serif; text-transform: uppercase; color: #fff !important; margin: 0; } .vcard h1 b { font-weight: 700; color: #fff !important; } .vcard p { font: 300 23px/1.4 Poppins, sans-serif; color: #d4d4d8 !important; margin-top: 16px; }`;
      document.head.appendChild(s);
      const c = document.createElement('div'); c.className = 'vcap'; document.body.appendChild(c);
      const k = document.createElement('div'); k.className = 'vcur'; document.body.appendChild(k);
      const v = document.createElement('div'); v.className = 'vcard'; v.innerHTML = `<img src="${LOGO}" alt=""><h1></h1><p></p>`; document.body.appendChild(v);
      if (first) { v.style.transition = 'none'; v.querySelector('h1').innerHTML = first[0]; v.querySelector('p').textContent = first[1]; v.classList.add('on'); setTimeout(() => { v.style.transition = ''; }, 60); }
      document.addEventListener('mousemove', e => { k.style.left = e.clientX + 'px'; k.style.top = e.clientY + 'px'; }, true);
      document.addEventListener('mousedown', () => k.classList.add('dn'), true); document.addEventListener('mouseup', () => k.classList.remove('dn'), true);
      const cur = document.getElementById('vidCurtain'); document.body.style.transition = 'opacity .45s ease'; if (cur) cur.remove(); document.body.style.opacity = '1';
    }, [LOGO, first || null]);
    const tB = now(); if (first) cuts.push([0, Math.max(0, tB - 0.05)]); else if (tB - tA > 0.9) cuts.push([tA + 0.35, tB - 0.1]);   // keep a short black between scenes
    await p.waitForTimeout(first ? 100 : 450);
    if (process.env.VDEBUG) { await p.screenshot({ path: path.join(process.env.VDEBUG, role + '.png') }); console.log(role, JSON.stringify(await p.evaluate(() => ({ op: getComputedStyle(document.body).opacity, ws: window.__mc.state.ws, cur: !!document.getElementById('vidCurtain'), html: getComputedStyle(document.documentElement).backgroundColor })))); }
  }
  const cap = t => p.evaluate(t => { const c = document.querySelector('.vcap'); if (!t) { c.classList.remove('on'); return; } c.textContent = t; c.classList.add('on'); }, t || '');
  const card = (h, s, on = true) => p.evaluate(([h, s, on]) => { const v = document.querySelector('.vcard'); v.querySelector('h1').innerHTML = h; v.querySelector('p').textContent = s; v.classList.toggle('on', on); }, [h, s, on]);
  const to = async (sel, o = {}) => { const e = await p.$(sel); if (!e) return; const r = await e.boundingBox(); if (!r) return; await p.mouse.move(r.x + (o.dx ?? r.width / 2), r.y + (o.dy ?? r.height / 2), { steps: o.steps || 22 }); };
  const glide = async (x, y, steps = 22) => p.mouse.move(x, y, { steps });

  // ---- 1. the title, then the month at a glance (the WFM analyst's dashboard)
  await open('user', () => { window.__mc.setWs('dash'); }, ['Introducing <b>Cadence</b>', 'Member Care\'s month, in one place · made-up people, no real data']);
  await wait(3400); await card('', '', false); await wait(600);
  await cap('The month at a glance: every number with its trend, and the steps of the close.');
  await glide(330, 300); await wait(600); await glide(760, 300); await wait(600); await to('.dclose'); await wait(1600);

  // ---- 2. settled before it counts: the month's files go in off camera (that stretch is cut), then the checks
  await cap(''); const tA = now();
  await p.evaluate(() => { document.documentElement.style.background = '#080808'; document.body.style.opacity = '0'; const M = window.__mc, F = window.__FIX__; M.state.history = Object.fromEntries(Object.entries(F.history).filter(([k]) => k !== '2026-09')); M.state.histVer++; M.setWs('build'); M.setStep('import'); scrollTo(0, 0); });
  await p.setInputFiles('#picker', ['Monthly Adherence - Sep.csv', 'Agents Performance Summary.csv', 'Schedule activities.csv', 'Agent Status Timeline Details.csv'].map(f => path.join(exp, f)));
  await p.waitForFunction(() => !window.__mc.state.pending.length && Object.keys(window.__mc.state.slots).length >= 4, null, { timeout: 60000 });
  await p.evaluate(() => { window.__mc.setStep('review'); if (window.__mc.setTab) window.__mc.setTab('checks'); scrollTo(0, 0); });
  await wait(500); await p.evaluate(() => { document.body.style.opacity = ''; document.documentElement.style.background = ''; }); cuts.push([tA + 0.35, now() - 0.1]);
  await wait(300); await cap('Settled before it counts: every question decided, and every decision kept.');
  await to('#checksTiles'); await wait(1200); await to('#checksBody'); await wait(2400);

  // ---- 3. every bonus explains itself (the senior manager, Results)
  await cap(''); await wait(250); await open('senior', () => { window.__mc.setWs('results'); });
  await cap('Every bonus explains itself: each KPI, its band, its ranking and its points.');
  const how = p.locator('[data-how]:visible').first(); await to('[data-how]'); await wait(400); await how.click(); await wait(1200);
  await to('#howBody table'); await wait(1600); await p.evaluate(() => { const b = document.getElementById('howBody'); const sc = b.closest('.drawer, aside') || b; sc.scrollBy({ top: 320, behavior: 'smooth' }); }); await wait(2200);

  // ---- 4. a supervisor's own team
  await cap(''); await wait(250); await open('spv', () => { window.__mc.setWs('team'); window.__mc.renderWs(); });
  await cap('A supervisor sees their own team, and coaches from the month\'s own numbers.');
  await glide(500, 260); await wait(800); await glide(900, 420); await wait(2400);

  // ---- 5. an agent's own page, in Arabic
  await cap(''); await wait(250); await open('agent', () => {
    const M = window.__mc, F = window.__FIX__, per = F.roster[20], months = {}, keys = Object.keys(F.history).sort();
    for (const k of keys) { const r = F.history[k].rows.find(x => x.id === per.nid) || F.history[k].rows[0]; months[k] = { status: k === keys[keys.length - 1] ? 'draft' : 'final', row: r, at: k + '-28T09:00:00Z', by: 'Noura B.' }; }
    M.state.me = { pid: 'p20', prof: { name: per.name, brand: per.brand, team: per.team, nid: per.nid, spvName: 'Ghada S.' }, months, forms: {}, sigs: {}, objs: {}, replies: {} };
    M.state.lang = 'ar'; M.setWs('me'); M.renderWs();
  });
  await cap('Each agent sees their own results, in English or Arabic.');
  await glide(860, 300); await wait(900); await glide(640, 470); await wait(2600);

  // ---- 6. the end
  await cap(''); await card('Ready for <b>the next close</b>', 'Cadence · Member Care · WFM team'); await wait(3400);

  const vid = p.video(); await ctx.close(); const webm = await vid.path(); await b.close();
  const sel = cuts.map(([a, z]) => `between(t,${a.toFixed(2)},${z.toFixed(2)})`).join('+');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', `fps=25,select='not(${sel || 0})',setpts=N/25/TB`, '-r', '25', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.resolve(outMp4)]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const secs = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.resolve(outMp4)]).toString().trim();
  console.log(`✓ ${outMp4}: ${(+secs).toFixed(1)} s, ${Math.round(fs.statSync(outMp4).size / 1024)} KB${errs.length ? ' · page errors: ' + errs.slice(0, 3).join(' | ') : ''}`);
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (x) { /* none */ } process.exit(1); });
