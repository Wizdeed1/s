#!/usr/bin/env node
/* Screenshot + QA a Cadence page or sample, so you can SEE what you built.
   Rewritten in Node from MotionSites Web Builder's scripts/shoot.py (MIT, see ../NOTICE), with Cadence's no-network check.

   Usage: node shoot.cjs <page.html> [outDir] [--full] [--light] [--wait 1.5]
     --full   full-page screenshots (the whole scroll), not just the first screen
     --light  emulate the light colour scheme (default: dark)

   Writes desktop.png (1440x900), laptop.png (1280x800) and phone.png (390x844) once the entrance settles, early.png
   (the first paint, 350 ms) and reduced.png (desktop with reduced motion), then prints a QA report:
   - console errors and page errors;
   - every request that is not file:, data: or blob: (Cadence makes no network request);
   - horizontal overflow and the elements causing it;
   - the fonts that loaded and the H1's font;
   - small text with low contrast (a quick check, not a full audit). */
const { chromium } = require('playwright');
const path = require('node:path'), fs = require('node:fs');

const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--')));
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--wait');
if (!pos[0]) { console.log('Usage: node shoot.cjs <page.html> [outDir] [--full] [--light] [--wait 1.5]'); process.exit(2); }
const url = /^[a-z]+:\/\//.test(pos[0]) ? pos[0] : 'file://' + path.resolve(pos[0]);
const out = path.resolve(pos[1] || 'shots'); fs.mkdirSync(out, { recursive: true });
const wait = args.includes('--wait') ? +args[args.indexOf('--wait') + 1] : 1.5;
const full = flags.has('--full'), scheme = flags.has('--light') ? 'light' : 'dark';
const VIEWS = [['desktop', 1440, 900], ['laptop', 1280, 800], ['phone', 390, 844]];

const QA = () => {
  const vw = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; })
    .slice(0, 6).map(e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''));
  const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(.*,\s*0\)|transparent/.test(c)) return c; } return 'rgb(255,255,255)'; };
  const low = [];
  for (const el of document.querySelectorAll('body *')) {
    if (low.length >= 6) break;
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ');
    if (!t || el.closest('[aria-hidden="true"]')) continue;
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || +st.opacity === 0 || parseFloat(st.fontSize) > 18) continue;
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
    const a = lum(st.color), b = lum(bgOf(el)); if (a == null || b == null) continue;
    const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (cr < 4.5) low.push(`${t.slice(0, 30)} (${cr.toFixed(1)}:1)`);
  }
  const h1 = document.querySelector('h1');
  return {
    title: document.title, viewport: vw, scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1, overflowing: wide,
    fontsLoaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))],
    h1: h1 ? { text: h1.innerText.slice(0, 60), size: getComputedStyle(h1).fontSize, font: getComputedStyle(h1).fontFamily.slice(0, 40) } : null,
    brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src.slice(0, 80)),
    lowContrastSmallText: low,
  };
};

(async () => {
  const b = await chromium.launch(), report = { page: url, scheme };
  const shot = async (name, w, h, opt) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: scheme, isMobile: name === 'phone', hasTouch: name === 'phone', ...opt });
    const p = await ctx.newPage(), errors = [], net = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    p.on('pageerror', e => errors.push(String(e).slice(0, 200)));
    p.on('request', r => { if (!/^(file|data|blob|about):/.test(r.url())) net.push(r.url().slice(0, 120)); });
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (name === 'desktop') { await p.waitForTimeout(350); await p.screenshot({ path: path.join(out, 'early.png') }); }
    await p.waitForTimeout(wait * 1000);
    await p.screenshot({ path: path.join(out, name + '.png'), fullPage: full });
    const qa = await p.evaluate(QA); qa.consoleErrors = errors.slice(0, 10); qa.networkRequests = net.slice(0, 10);
    await ctx.close(); return qa;
  };
  for (const [n, w, h] of VIEWS) report[n] = await shot(n, w, h);
  report.reduced = await shot('reduced', 1440, 900, { reducedMotion: 'reduce' });
  await b.close();
  console.log(JSON.stringify(report, null, 1));
  const bad = Object.values(report).filter(v => v && typeof v === 'object').some(q => q.networkRequests.length || q.consoleErrors.length || q.horizontalOverflow || q.brokenImages.length);
  console.log('\nScreenshots in ' + out + ': ' + fs.readdirSync(out).filter(f => f.endsWith('.png')).join(', '));
  console.log(bad ? 'QA: BLOCKING problems above (network, errors, overflow or images).' : 'QA: no blocking problem found. Now LOOK at the PNGs and score them with references/review.md.');
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
