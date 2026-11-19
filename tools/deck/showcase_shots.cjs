// The deck's pieces, taken from the stand-alone Showcase (made-up data only), so the deck tells the same story in the same look:
// every section's words (its label, its title with the words in bold, its lead, its speaker notes, and its cards, tiles and steps),
// what moves Lina A.'s bonus as the tool's own engine counts it, and pictures of the parts the deck shows as the Showcase draws them:
// the logo, the ticket, the five steps, the scorecard of Try it, the receipt in English and in Arabic, the role icons, the line
// figures, and the slide's frame (the white card on the sky). Light, still (reduced motion), at twice the size for a sharp slide.
// Usage: node tools/deck/showcase_shots.cjs showcase.html outDir   ->   outDir/showcase.json and the pictures
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [file, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'light' }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(file)); await p.waitForSelector('#showBody .sh-try [data-tryearned]'); await p.waitForTimeout(800);
  // ---- the words
  const S = await p.evaluate(() => {
    const tx = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const runs = h => [...(h ? h.childNodes : [])].map(n => ({ t: n.textContent.replace(/\s+/g, ' '), b: n.nodeName === 'B' })).filter(r => r.t.trim());
    /** a title's lines as the Showcase breaks them: [[{ t, b }]], each word measured where it falls */
    const lines = h => {
      if (!h) return [];
      const words = []; for (const n of [...h.childNodes]) { const b = n.nodeName === 'B'; for (const w of n.textContent.split(/\s+/).filter(Boolean)) words.push({ w, b }); }
      const keep = h.innerHTML;
      h.innerHTML = words.map((x, i) => `<span data-i="${i}">${x.b ? `<b>${x.w}</b>` : x.w}</span>`).join(' ');
      const tops = [...h.querySelectorAll('span[data-i]')].map(sp => sp.getBoundingClientRect().top);
      h.innerHTML = keep;
      const out = []; let cur = null, top = null;
      words.forEach((x, i) => { if (top === null || Math.abs(tops[i] - top) > 4) { cur = []; out.push(cur); top = tops[i]; } const last = cur[cur.length - 1]; if (last && last.b === x.b) last.t += ' ' + x.w; else cur.push({ t: x.w, b: x.b }); });
      return out;
    };
    const all = q => [...document.querySelectorAll(q)];
    return all('#showBody .shsec').map(sec => {
      const id = [...sec.classList].find(c => c.startsWith('sh-')).slice(3), q = s => sec.querySelector(s), qa = s => [...sec.querySelectorAll(s)];
      const o = { id, name: sec.getAttribute('aria-label'), eyebrow: tx(q('.eyebrow')), title: runs(q('h2')), lines: lines(q('h2')), lead: tx(q('.shlead')), notes: tx(q('.shnotes p')) };
      if (id === 'hero') o.strip = qa('.shstrip li').map(tx);
      if (id === 'before') { o.nums = qa('.shnums > div').map(d => ({ n: tx(d.querySelector('b')), t: tx(d.querySelector('span')), hot: d.classList.contains('hot') })); o.cards = qa('.shcards .shcard').map(c => ({ b: tx(c.querySelector('b')), p: tx(c.querySelector('p')) })); }
      if (id === 'count') o.result = { label: tx(q('.shresult span')), formula: tx(q('.shresult b')), small: tx(q('.shresult small')) };
      if (id === 'checks') { o.cards = qa('.shchecks .shcard').map(c => ({ b: tx(c.querySelector('b')), p: tx(c.querySelector('p')) })); o.proof = { n: tx(q('.shproof > b')), t: tx(q('.shproof > span')) }; }
      if (id === 'roles') o.roles = qa('.shrole').map(r => ({ name: tx(r.querySelector('.shrtop b')), label: tx(r.querySelector('.now span')), part: tx(r.querySelector('.now')).replace(tx(r.querySelector('.now span')), '').trim() }));
      if (id === 'trust') o.tiles = qa('.shtile').map(t => ({ b: tx(t.querySelector('b')), s: tx(t.querySelector('span')), p: tx(t.querySelector('p')) }));
      if (id === 'start') { o.steps = qa('.shgo li').map(li => ({ b: tx(li.querySelector('b')), p: tx(li.querySelector('p')) })); o.thanks = runs(q('.shthanks')); }
      return o;
    });
  });
  // ---- what moves Lina A.'s bonus: the Showcase's own count (Kpi.score with the default rules), as Try it shows it
  const whatIf = await p.evaluate(() => {
    const env = window.__showcase.env, SS = typeof ShowStory !== 'undefined' ? ShowStory : window.ShowStory, X = SS.EX, base = { ...X, v: { ...X.v } }, run = x => SS.count(env, x);   // ShowStory: the page's own story (a global name, not a property of window)
    const c0 = run(base), lowAdh = { ...base, v: { ...base.v, adh: 88 } }, late = { ...lowAdh, v: { ...lowAdh.v, tardy: 25 } };
    const rows = [['Her month, as counted', base], ['Adherence 88% instead of 93%', lowAdh], ['And 25 late minutes: the final falls under 80%', late],
      ['An attitude critical error', { ...base, crit: true }], [`${10} days attended instead of ${X.att}`, { ...base, att: 10 }], ['3 months in the job', { ...base, mon: 3 }]];
    return { name: X.name, final: c0.res.finalPct, rows: rows.map(([t, x]) => { const c = run(x); return { t, earned: c.earned, ok: c.ok, final: c.res.finalPct, why: c.ok ? '' : c.gates.filter(g => !g.ok).map(g => g.t).join('; ') }; }) };
  });
  // ---- the pictures: each part on its own, with a little of the white around it (the page made white: the Showcase's cards are
  // translucent over its sky, and a slide is white)
  await p.addStyleTag({ content: ':root { --surface: #fff; --raised: #fff; --sunk: #fff; } html, body, .shsec, .shhero { background: #fff !important; } body::before, body::after { display: none !important; } .shsec { box-shadow: none !important; } .shfig { background: transparent !important; border: 0 !important; box-shadow: none !important; }' });
  await p.waitForTimeout(300);
  const shot = async (sel, name, pad = 0) => {
    const el = await p.$(sel); if (!el) throw new Error('not found: ' + sel);
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    const r = await el.boundingBox();
    await p.screenshot({ path: path.join(out, name + '.png'), clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + 2 * pad, height: r.height + 2 * pad } });
  };
  await shot('.sh-hero .shlogo', 'sc-logo', 2);
  await shot('.sh-hero .shticket', 'sc-ticket', 22);
  await shot('.sh-count .shflow', 'sc-steps', 4);
  await shot('.sh-try .shtry', 'sc-try', 6);
  await shot('.sh-explain .shrcpt', 'sc-receipt-en', 6);
  await p.click('.sh-explain [data-shlang="ar"]'); await p.waitForTimeout(300);
  await shot('.sh-explain .shrcpt', 'sc-receipt-ar', 6);
  await p.click('.sh-explain [data-shlang="en"]');
  for (const [sec, n] of [['checks', 'sieve'], ['roles', 'hub'], ['trust', 'vault'], ['start', 'laptop']]) await shot(`.sh-${sec} .shfig`, `sc-fig-${n}`, 2);
  const icons = await p.$$('.sh-roles .shrico');
  for (let i = 0; i < icons.length; i++) { await icons[i].scrollIntoViewIfNeeded(); await p.waitForTimeout(120); const r = await icons[i].boundingBox(); await p.screenshot({ path: path.join(out, `sc-role-${i}.png`), clip: { x: r.x, y: r.y, width: r.width, height: r.height } }); }
  await p.setViewportSize({ width: 1600, height: 900 });
  // ---- the slide's frame, as Present draws a section: a white card (20 px corners, a hairline border, a soft shadow) on the sky,
  // the square at its top right, and the strip of the logo's colours along its foot
  await p.setContent(`<body style="margin:0"><div style="position:relative;width:1600px;height:900px;background:linear-gradient(168deg,#f7faff 0%,#ebf2fd 46%,#dfe9f9 100%)">
    <div style="position:absolute;inset:26px;background:#fff;border:1px solid rgba(16,38,78,.1);border-radius:20px;box-shadow:0 18px 40px -22px rgba(16,38,78,.28);overflow:hidden">
      <i style="position:absolute;top:30px;right:30px;width:12px;height:12px;background:#080808"></i>
      <i style="position:absolute;left:0;bottom:0;width:100%;height:5px;background:linear-gradient(90deg,#0d76bd 0 30%,#ed1c24 30% 46%,#f6adcc 46% 58%,#9693c8 58% 76%,#0c7b6c 76% 100%)"></i>
    </div></div></body>`);
  await p.screenshot({ path: path.join(out, 'sc-frame.png') });
  fs.writeFileSync(path.join(out, 'showcase.json'), JSON.stringify({ sections: S, whatIf }, null, 1));
  await b.close();
  if (errs.length) { console.log('✗ page errors: ' + errs.join(' | ')); process.exit(1); }
  console.log(`✓ ${S.length} sections, ${whatIf.rows.length} what-ifs, ${icons.length} role icons → ${out}`);
})();
