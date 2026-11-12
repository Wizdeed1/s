/* Three samples of Cadence's WFM dashboard in the "hero pack" look (see SPEC.md): node make.cjs
   A-graphite.html, B-beyond-one.html, C-daylight.html: each one self-contained (fonts, logo and pictures inline), no request.
   Every name and number is made up (the names come from test/fixture.js). */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const here = __dirname, root = path.resolve(here, '../../..');
const b64 = f => fs.readFileSync(f).toString('base64');
const font = (fam, file, w, extra) => `@font-face{font-family:"${fam}";src:url(data:font/woff2;base64,${b64(file)}) format("woff2");font-weight:${w};font-display:block;${extra || ''}}`;
const FONTS = font('Archivo', path.join(here, 'fonts/archivo-latin-wdth-normal.woff2'), '100 900', 'font-stretch:62% 125%;')
  + ['300', '500', '600'].map(w => font('Poppins', path.join(root, `vendor/fonts/poppins-latin-${w}-normal.woff2`), w)).join('');
const MARK = 'data:image/png;base64,' + b64(path.join(root, 'assets/brand/beyond-one-mark.png'));

// ---------------------------------------------------------------- the made-up month
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// calls offered each day of September 2026 (1 Sep is a Tuesday; Friday and Saturday are the weekend)
const CALLS = Array.from({ length: 30 }, (_, i) => {
  const wd = (2 + i) % 7, base = wd === 5 ? 3550 : wd === 6 ? 4080 : 5150;
  return Math.round(base + 420 * Math.sin(i / 4.1) + (i === 0 || i === 26 ? 900 : 0) + 260 * (rnd() - 0.5));
});
const TEAMS = [['CC', 96, 3], ['SM', 30, 6], ['CT', 22, 1], ['QA', 8, 4], ['BO', 8, 2]];   // team, agents, brand colour index
const AGENTS = []; TEAMS.forEach(([t, n, c]) => { for (let i = 0; i < n; i++) AGENTS.push({ t, c, adh: 0.84 + 0.15 * Math.pow(rnd(), 0.6) }); });
[17, 61, 119].forEach(i => { AGENTS[i].flag = true; AGENTS[i].adh = 0.8; });   // the three who need attention
const ADH = [91.8, 92.1, 91.6, 92.0, 92.3, 92.7];   // Apr–Sep
const KPIS = [
  ['Agents', '164', 'No change', '', 'against Aug', [161, 162, 164, 163, 164, 164]],
  ['Adherence', '92.7%', '↑ 0.4 pts', 'good', 'better than Aug', ADH],
  ['AHT', '2:55', 'No change', '', 'against Aug', [181, 178, 176, 177, 175, 175]],
  ['Absent days', '49', '↓ 9', 'good', 'better than Aug', [61, 55, 66, 52, 58, 49]],
  ['Deduction minutes', '13,890', '↓ 644 min', 'good', 'better than Aug', [15900, 15200, 16100, 14800, 14534, 13890]],
  ['Final %', '76.9%', '↓ 6.2 pts', 'bad', 'worse than Aug', [79.5, 80.2, 81.0, 82.4, 83.1, 76.9]],
];
const ATTN = [['Reem T.', 'CC', 'Adherence', '81.2%'], ['Waleed G.', 'CC', 'Adherence', '83.5%'], ['Omar B.', 'SM', 'Absent days', '4'], ['Ghada S.', 'CT', 'Late minutes', '46']];
const STEPS = [['Incentive file built', 'Mon 9 Nov', 1], ['Results on the agents’ pages', 'Tue 10 Nov', 1], ['Results for review sent to the VP', 'Wed 11 Nov', 1],
  ['Final deduction and absences email', 'Due Sun 15 Nov', 0], ['Final result form sent', 'After the VP’s review', 0]];
const PX = ['#ed1c24', '#ed7d31', '#f6adcc', '#3d9be0', '#9693c8', '#bf9dca', '#14a28f', '#16a3c7'];   // the mosaic colours (blue, teal and cyan lifted for a dark page)

// ---------------------------------------------------------------- drawing helpers
const f1 = n => Math.round(n * 10) / 10;
function smooth(pts) {   // Catmull-Rom through the points, as cubic Béziers
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d;
}
const avg = (a, k) => a.map((_, i) => { const s = a.slice(Math.max(0, i - k), i + k + 1); return s.reduce((x, y) => x + y, 0) / s.length; });
const norm = a => { const lo = Math.min(...a), hi = Math.max(...a); return a.map(v => (v - lo) / (hi - lo || 1)); };
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// A: the month as a landscape: September's daily calls as misty ridges, the front one the real line
function landscape() {
  const W = 1400, H = 640, n = CALLS.length, x = i => -60 + i * (W + 120) / (n - 1);
  const layers = [
    { k: 3, rot: 9, base: 330, amp: 110, col: '#7a8189', op: .55 },
    { k: 2, rot: 17, base: 395, amp: 125, col: '#555c64', op: .75 },
    { k: 2, rot: 24, base: 465, amp: 130, col: '#363a40', op: .9 },
    { k: 1, rot: 0, base: 575, amp: 120, col: '#141517', op: 1 },
  ];
  let g = '';
  layers.forEach((L, li) => {
    const s = norm(avg(CALLS.map((_, i) => CALLS[(i + L.rot) % n]), L.k));
    const pts = s.map((v, i) => [x(i), L.base - v * L.amp]);
    const d = smooth(pts) + `L${W + 60},${H}L-60,${H}Z`;
    g += `<path d="${d}" fill="${L.col}" fill-opacity="${L.op}"/>`;
    if (li < layers.length - 1) g += `<rect x="0" y="${L.base - 40}" width="${W}" height="${H}" fill="url(#fog)" opacity="${.5 - li * .1}"/>`;
    else g += `<path d="${smooth(pts)}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.4"/>`
      + pts.map(p => `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="1.8" fill="#fff" fill-opacity=".45"/>`).join('');
  });
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stop-color="#26292d"/><stop offset=".55" stop-color="#4a5159"/><stop offset="1" stop-color="#9aa3ab"/></linearGradient>
<radialGradient id="sun" cx=".82" cy=".12" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd5db" stop-opacity="0"/><stop offset=".25" stop-color="#cfd5db" stop-opacity=".22"/><stop offset=".6" stop-color="#cfd5db" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#sun)"/>${g}</svg>`;
}

// B: the team as a mosaic: every agent one tile, coloured by team, lit by adherence; the three who need attention pulse in red
function mosaic() {
  const W = 1400, H = 640, cols = 18, size = 30, gap = 9, step = size + gap, x0 = W - cols * step - 24, y0 = 150;
  let tiles = '', glow = '';
  AGENTS.forEach((a, i) => {
    const c = i % cols, r = Math.floor(i / cols), X = x0 + c * step, Y = y0 + r * step;
    const col = a.flag ? '#ed1c24' : PX[a.c], op = a.flag ? 1 : f1(0.25 + 0.75 * Math.pow((a.adh - 0.84) / 0.15, 1.4));
    const t = `<rect x="${X}" y="${Y}" width="${size}" height="${size}" rx="4" fill="${col}" fill-opacity="${op}"${a.flag ? ' class="pulse"' : ''}/>`;
    tiles += t; if (op > .6 || a.flag) glow += t;
  });
  return `<svg class="art mos" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
<defs><radialGradient id="bgB" cx=".78" cy=".45" r=".75"><stop offset="0" stop-color="#1d2230"/><stop offset="1" stop-color="#0d0e11"/></radialGradient>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
<linearGradient id="fade" x1="${x0}" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".38" stop-color="#fff" stop-opacity="1"/></linearGradient>
<mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask></defs>
<rect width="${W}" height="${H}" fill="url(#bgB)"/><g mask="url(#m)" class="wall"><g filter="url(#glow)" opacity=".55">${glow}</g>${tiles}</g></svg>`;
}

// C: the month's days as blinds in daylight: one slat a day, the light in it as tall as the day's calls
function blinds() {
  const W = 1400, H = 640, n = CALLS.length, s = norm(CALLS), x0 = 470, step = 30, w = 22;
  let slats = '';
  s.forEach((v, i) => {
    const X = x0 + i * step, lit = 150 + v * 360;
    slats += `<rect x="${X}" y="-10" width="${w}" height="${H + 20}" rx="3" fill="url(#slat)"/><rect x="${X}" y="${H - lit}" width="${w}" height="${lit}" rx="3" fill="url(#lit)"/>`;
  });
  slats += `<rect x="${x0 - 14}" y="0" width="${n * step + 20}" height="16" rx="4" fill="#cdc7bb"/><rect x="${x0 - 14}" y="16" width="${n * step + 20}" height="4" fill="#8a8478" fill-opacity=".18"/>`;
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
<defs><linearGradient id="bgC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f2ed"/><stop offset="1" stop-color="#d9d5cc"/></linearGradient>
<radialGradient id="win" cx=".9" cy=".05" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="slat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bcb6aa"/><stop offset=".5" stop-color="#d6d1c7"/><stop offset="1" stop-color="#b3ada0"/></linearGradient>
<linearGradient id="lit" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fbf9f4" stop-opacity=".55"/></linearGradient>
<linearGradient id="ray" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8478" stop-opacity="0"/><stop offset="1" stop-color="#8a8478" stop-opacity=".28"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="18"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#bgC)"/>${slats}
<g filter="url(#soft)" opacity=".85"><path d="M1400 0L1040 0L640 640L980 640Z" fill="url(#ray)"/><path d="M1400 60L1290 0L960 640L1080 640Z" fill="url(#ray)" opacity=".7"/></g>
<rect width="${W}" height="${H}" fill="url(#win)"/><rect y="${H - 90}" width="${W}" height="90" fill="url(#floor)"/></svg>`;
}

// the small pictures in the cards
const ICON = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.4L20 16"/><path d="M20 20.5V16h-4.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>', play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>', arrow: '<path d="M7 17 17 7M9 7h8v8"/>', mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', plus: '<path d="M12 6v12M6 12h12"/>', sheet: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
};
const ic = (k, s) => `<svg class="ic" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
function emailsArt(o) {   // four daily brand emails, fanned
  const cols = o.brand ? ['#d7141a', '#1e9aa3', '#0b6e78', '#3a5a8c'] : o.light ? ['#2a2a2a', '#5a5a5a', '#8a8a8a', '#b5b5b5'] : ['#e8e8e8', '#b9b9b9', '#8d8d8d', '#666'];
  const paper = o.light ? '#ffffff' : o.brand ? '#e9ecf2' : '#cfcfcb';
  return `<svg class="mails" viewBox="0 0 300 240" aria-hidden="true">${cols.map((c, i) => `<g transform="translate(${46 + i * 30} ${30 + i * 14}) rotate(${-12 + i * 7} 70 90)">
<rect width="140" height="180" rx="12" fill="${paper}" stroke="rgba(0,0,0,.12)"/><rect x="12" y="12" width="116" height="26" rx="6" fill="${c}"/>
<rect x="12" y="50" width="80" height="7" rx="3.5" fill="#cfcfcf"/><rect x="12" y="64" width="104" height="7" rx="3.5" fill="#e1e1e1"/>
<rect x="12" y="86" width="50" height="36" rx="6" fill="#ececec"/><rect x="66" y="86" width="62" height="36" rx="6" fill="#ececec"/><rect x="12" y="130" width="116" height="7" rx="3.5" fill="#e1e1e1"/><rect x="12" y="144" width="90" height="7" rx="3.5" fill="#e1e1e1"/></g>`).join('')}</svg>`;
}
function adhBars(o) {
  const lo = 91, hi = 93;
  return `<svg class="bars" viewBox="0 0 200 92" preserveAspectRatio="none" aria-hidden="true">${ADH.map((v, i) => { const h = 18 + 66 * (v - lo) / (hi - lo); return `<rect x="${10 + i * 32}" y="${88 - h}" width="20" height="${h}" rx="6" fill="${i === 5 ? (o.brand ? '#3d9be0' : 'var(--ink)') : 'var(--ink-3)'}"/>`; }).join('')}</svg>`;
}
const INITIALS = ['WG', 'MO', 'LW', 'ME', 'MB', 'OB', 'RT', 'GS', 'SM', 'AD', 'HK', 'NS', 'FA', 'YQ', 'DM', 'RA', 'KH', 'TN', 'LA', 'JS'], HOT = [6, 12, 13];
function teamArt(o) {
  return `<div class="faces" aria-hidden="true">${INITIALS.map((t, i) => `<span class="face${HOT.includes(i) ? ' hot' : ''}"${o.brand ? ` style="--dot:${PX[[3, 6, 1, 4, 2][i % 5]]}"` : ''}>${t}${HOT.includes(i) ? `<b class="spot">${ic('plus', 12)}</b>` : ''}</span>`).join('')}</div>`;
}
const spark = (vals, o) => {
  const lo = Math.min(...vals), hi = Math.max(...vals), pts = vals.map((v, i) => [i * 40, 46 - (hi === lo ? 23 : 6 + 34 * (v - lo) / (hi - lo))]);
  const d = smooth(pts);
  return `<svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true"><path d="${d}L200,50L0,50Z" fill="${o.brand ? '#3d9be0' : 'var(--ink)'}" fill-opacity=".09"/><path d="${d}" fill="none" stroke="${o.brand ? '#3d9be0' : 'var(--ink-2)'}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
};

// ---------------------------------------------------------------- the page
function page(o) {
  const art = o.art();
  return `<!doctype html><html lang="en" class="${o.cls}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cadence · ${o.title}</title><meta name="color-scheme" content="${o.light ? 'light' : 'dark'}">
<style>
html,body{background:var(--page);color:var(--ink)}
${FONTS}
:root{--page:#1e1e1e;--frame:#111;--panel:#242424;--panel-2:#2b2b2e;--pill:#3a3a3a;--tab:#2a2a2a;--ink:#fff;--ink-2:rgba(255,255,255,.78);--ink-3:rgba(255,255,255,.3);--muted:rgba(255,255,255,.62);--faint:rgba(255,255,255,.44);
--line:rgba(255,255,255,.08);--good:#7fd1ae;--good-bg:rgba(127,209,174,.12);--bad:#ff9a8f;--bad-bg:rgba(255,154,143,.12);--card1:linear-gradient(160deg,#3a3d43,#2a2c31);--cta:#fff;--on-cta:#111;--glass:rgba(28,28,28,.5);--scrim:rgba(17,17,17,.62);
--r-frame:30px;--r-panel:22px;--r-card:18px;--ease:cubic-bezier(.22,1,.36,1);--display:"Archivo","Arial Black",sans-serif;--ui:"Poppins","Segoe UI",system-ui,sans-serif}
.brand{--card1:linear-gradient(160deg,#25324a,#1c2232)}
.light{--page:#e6e4df;--frame:#f3f2ee;--panel:#fff;--panel-2:#faf9f7;--pill:#e9e7e2;--tab:#fff;--ink:#121212;--ink-2:rgba(18,18,18,.78);--ink-3:rgba(18,18,18,.22);--muted:rgba(18,18,18,.6);--faint:rgba(18,18,18,.45);
--line:rgba(18,18,18,.08);--good:#0b6e50;--good-bg:rgba(12,123,108,.1);--bad:#c4141b;--bad-bg:rgba(237,28,36,.08);--card1:linear-gradient(160deg,#efeee9,#e3e1da);--cta:#121212;--on-cta:#fff;--glass:rgba(255,255,255,.55);--scrim:rgba(243,242,238,.82)}
*{box-sizing:border-box}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:clip}
body{margin:0;font:400 14px/1.5 var(--ui);padding:14px}::selection{background:rgba(127,127,127,.35)}
a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px;border-radius:8px}
.ic{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.num{font-variant-numeric:tabular-nums}
.frame{background:var(--frame);border-radius:var(--r-frame);padding:12px;display:flex;flex-direction:column;gap:10px;max-width:1680px;margin:0 auto}
.top{display:flex;flex-direction:column;gap:10px;height:calc(100vh - 52px);height:calc(100dvh - 52px);min-height:740px}
/* nav */
.nav{height:64px;flex:none;background:var(--panel);border-radius:20px;display:flex;align-items:center;gap:16px;padding:0 11px 0 20px;animation:down .6s var(--ease) both}
.logo{display:flex;align-items:center;gap:11px;min-width:200px}.logo img{width:30px;height:30px}
.word{font:800 15px/1 var(--display);font-stretch:125%;letter-spacing:.08em}
.links{flex:1;display:flex;justify-content:center;gap:4px}.links a{font-size:13.5px;color:var(--ink-2);padding:9px 18px;border-radius:999px;transition:background .2s,color .2s}
.links a:hover{color:var(--ink)}.links a[aria-current]{background:var(--pill);color:var(--ink)}
.tools{display:flex;align-items:center;gap:8px}
.search{display:flex;align-items:center;gap:10px;width:240px;height:42px;padding:0 8px 0 16px;border-radius:999px;background:var(--pill);color:var(--muted);font-size:13px}
.search kbd{margin-left:auto;font:500 11px var(--ui);color:var(--faint);border:1px solid var(--line);border-radius:7px;padding:2px 7px}
.round{width:42px;height:42px;border-radius:50%;background:var(--pill);display:grid;place-items:center;position:relative;transition:transform .2s}.round:hover{transform:scale(1.04)}
.badge{position:absolute;top:6px;right:7px;min-width:16px;height:16px;border-radius:5px;background:#ed1c24;color:#fff;font:600 10px/16px var(--ui);text-align:center}
.me{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:600 13px var(--ui);background:linear-gradient(135deg,#f2f2f2,#bdbdbd);color:#111;box-shadow:0 0 0 2px var(--panel),0 0 0 3px var(--line)}
.brand .me{background:linear-gradient(135deg,#ffd9b8,#f6adcc)}
.pagerow{display:none}
/* hero */
.hero{position:relative;flex:1;min-height:420px;border-radius:var(--r-panel);overflow:hidden;isolation:isolate;background:var(--panel)}
.art{position:absolute;inset:0;width:100%;height:100%;z-index:-2;animation:settle 1.6s var(--ease) both}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--scrim) 0%,transparent 58%)}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;background:${GRAIN};opacity:${o.light ? '.05' : '.08'};mix-blend-mode:overlay;pointer-events:none}
.notch{position:absolute;top:0;right:0;z-index:2;display:flex;gap:8px;padding:0 0 10px 10px;background:var(--frame);border-bottom-left-radius:22px}
.notch::before,.notch::after{content:"";position:absolute;width:22px;height:22px;background:radial-gradient(circle at 0 100%,transparent 21.5px,var(--frame) 22px)}
.notch::before{top:0;left:-22px}.notch::after{bottom:-22px;right:0}
.tab{height:44px;padding:0 22px;border-radius:999px;background:var(--tab);font-size:13px;color:var(--ink-2);display:inline-flex;align-items:center;gap:8px;transition:background .2s}
.tab[aria-current]{background:var(--cta);color:var(--on-cta);font-weight:500}.tab .dot{width:6px;height:6px;border-radius:50%;background:${o.brand ? '#ed1c24' : 'currentColor'}}
.copy{position:absolute;left:5%;top:16%;max-width:46rem;z-index:1}
.eyebrow{font-size:13px;color:var(--ink-2);margin:0 0 18px;animation:rise .7s .1s var(--ease) both}
h1{font:800 clamp(34px,4.2vw,62px)/.98 var(--display);font-stretch:125%;letter-spacing:-.005em;text-transform:uppercase;margin:0;${o.light ? '' : 'text-shadow:0 16px 38px rgba(0,0,0,.32);'}}
h1 .ln{display:block;overflow:hidden;padding-bottom:.06em}h1 .ln>span{display:block;animation:up .8s var(--ease) both}h1 .ln:nth-child(2)>span{animation-delay:.25s}h1 .ln:nth-child(1)>span{animation-delay:.15s}
.sub{font-size:14.5px;line-height:1.55;color:var(--ink-2);max-width:31rem;margin:18px 0 26px;animation:rise .7s .45s var(--ease) both}
.acts{display:flex;align-items:center;gap:22px;animation:rise .7s .55s var(--ease) both}
.cta{display:inline-flex;align-items:center;gap:12px;background:var(--cta);color:var(--on-cta);font-weight:500;font-size:13.5px;padding:12px 18px 12px 20px;border-radius:10px;transition:transform .2s}.cta:hover{transform:translateY(-1px)}.cta .ic{width:12px;height:12px}
.link{font-size:13.5px;color:var(--ink-2);border-bottom:1px solid var(--ink-3);padding-bottom:2px}.link:hover{color:var(--ink)}
.micro{position:absolute;left:5%;bottom:22px;font:500 10.5px/1 var(--ui);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.glass{position:absolute;right:14px;bottom:14px;display:flex;align-items:center;gap:12px;padding:8px;border-radius:16px;background:var(--glass);border:1px solid var(--line);
-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);animation:rise .7s .7s var(--ease) both}
.thumb{width:64px;height:46px;border-radius:10px;display:grid;place-items:center;background:var(--pill);color:var(--ink-2)}
.glass small{display:block;font-size:10.5px;color:var(--faint);line-height:1.3}.glass strong{display:block;font-weight:500;font-size:12.5px;line-height:1.35}.glass span{font-size:11px;color:var(--muted)}
.go{width:48px;height:64px;border-radius:12px;background:var(--cta);color:var(--on-cta);display:grid;place-items:center;margin-left:10px}
/* the cards row */
.cards{height:250px;flex:none;display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
.card{position:relative;border-radius:var(--r-card);background:var(--panel);overflow:hidden;animation:rise .7s var(--ease) both}
.card:nth-child(1){animation-delay:.5s}.card:nth-child(2){animation-delay:.58s}.card:nth-child(3){animation-delay:.66s}
.c1{display:grid;grid-template-columns:44% 1fr}.c1 .pic{background:${o.light ? '#e9e7e1' : o.brand ? '#121722' : '#1a1a1b'};display:grid;place-items:center;overflow:hidden}.mails{width:112%;height:112%;margin-top:16%;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}
.c1 .txt{background:var(--card1);padding:30px 30px 24px;display:flex;flex-direction:column}
.c1 .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.c1 h2{font:300 23px/1.25 var(--ui);margin:10px 0 0}.c1 h2 b{font-weight:600}
.slide{margin-top:auto;display:inline-flex;align-items:center;gap:10px;width:max-content;padding:5px;border-radius:999px;background:${o.light ? 'rgba(18,18,18,.07)' : 'rgba(0,0,0,.28)'};color:var(--muted)}
.slide i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--cta);color:var(--on-cta)}.slide i:last-child{background:var(--pill);color:var(--ink)}
.slide em{font-style:normal;letter-spacing:.2em;font-size:12px}
.c2{padding:22px 22px 14px;display:flex;flex-direction:column}.c2 .big{font:500 30px/1 var(--ui);letter-spacing:-.02em}.c2 p{font-size:11.5px;line-height:1.45;color:var(--muted);margin:8px 0 0;max-width:15rem}
.disc{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:50%;border:1px solid var(--ink-3);display:grid;place-items:center;transition:transform .2s}.disc:hover{transform:rotate(45deg)}
.stripes{margin-top:auto;height:96px;border-radius:14px;background:${o.light ? 'repeating-linear-gradient(180deg,#f1efea 0 9px,#e6e3dc 9px 18px)' : 'repeating-linear-gradient(180deg,#2f2f31 0 9px,#1b1b1c 9px 18px)'};display:flex;align-items:flex-end;padding:0 8px}.bars{width:100%;height:84px}
.c3{background:${o.light ? '#e9e7e1' : '#1b1b1c'}}.faces{position:absolute;inset:34px -8px -26px;display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:0 16px;transform:rotate(-6deg)}
.face{position:relative;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font:500 11px var(--ui);color:var(--ink-2);background:${o.light ? '#fff' : '#2c2c2e'};box-shadow:inset 0 0 0 2px var(--dot,transparent)}
.face.hot{background:${o.light ? '#fff' : '#3a3a3c'};color:var(--ink)}
.spot{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.c3 .chip{position:absolute;left:14px;top:14px;z-index:1;font-size:11.5px;font-weight:500;padding:7px 12px;border-radius:999px;background:var(--panel);box-shadow:0 6px 18px rgba(0,0,0,.25)}
.view{position:absolute;right:14px;bottom:14px;background:var(--cta);color:var(--on-cta);font-size:12.5px;font-weight:500;padding:9px 26px;border-radius:9px}
/* below the first screen */
.more{display:flex;flex-direction:column;gap:10px;padding-top:6px}
.head{display:flex;align-items:baseline;gap:14px;padding:22px 10px 6px}.head h2{font:500 19px var(--ui);margin:0}.head span{font-size:13px;color:var(--faint)}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.kpi{background:var(--panel);border-radius:var(--r-card);padding:20px 22px 16px;min-height:178px;display:flex;flex-direction:column}
.kpi .lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}.kpi .val{font:500 34px/1.1 var(--ui);letter-spacing:-.02em;margin:10px 0 6px}
.kpi .dl{font-size:12px;color:var(--muted)}.kpi .dl b{font-weight:500;padding:2px 8px;border-radius:6px;margin-right:6px;background:var(--pill);color:var(--ink)}
.kpi .dl b.good{background:var(--good-bg);color:var(--good)}.kpi .dl b.bad{background:var(--bad-bg);color:var(--bad)}.spark{width:100%;height:46px;margin-top:auto}
.two{display:grid;grid-template-columns:3fr 2fr;gap:10px}
.panel{background:var(--panel);border-radius:var(--r-card);padding:20px 22px}.panel h3{font:500 15px var(--ui);margin:0 0 12px}
.row{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line);font-size:13px}.row .av{width:34px;height:34px;border-radius:50%;background:var(--pill);display:grid;place-items:center;font-size:11px;font-weight:500}
.row .who{flex:1}.row .who small{display:block;color:var(--faint);font-size:11.5px}.row .v{font-weight:500}
.step{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line);font-size:13px}.step i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--ink-3);color:var(--ink)}
.step.done i{background:var(--cta);border-color:var(--cta);color:var(--on-cta)}.step.next i{border-color:var(--ink)}.step span{flex:1}.step small{color:var(--faint);font-size:11.5px}.step.next small{color:var(--ink)}
.foot{font-size:11.5px;color:var(--faint);text-align:center;padding:16px 0 6px}
.pulse{animation:pulse 2.4s ease-in-out infinite}
.mos .wall{transform:perspective(1800px) rotateY(-16deg);transform-origin:100% 50%;transform-box:view-box}
@keyframes down{from{opacity:0;transform:translateY(-10px)}}@keyframes rise{from{opacity:0;transform:translateY(16px)}}@keyframes up{from{transform:translateY(105%)}}
@keyframes settle{from{transform:scale(1.05)}}@keyframes pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
/* laptops */
@media (max-width:1320px){.search{width:190px}.links a{padding:9px 14px}.logo{min-width:0}}
@media (max-width:1100px){.search{width:42px;padding:0;justify-content:center}.search span,.search kbd{display:none}}
/* phones */
@media (max-width:760px){body{padding:8px}.frame{border-radius:22px;padding:8px;gap:8px}.top{height:auto;min-height:0;gap:8px}
.nav{height:58px;padding:0 8px 0 14px;gap:8px}.links{display:none}.logo{flex:1}.round.rf{display:none}
.pagerow{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.pagerow a{flex:none;font-size:13px;padding:10px 16px;border-radius:999px;background:var(--panel);color:var(--ink-2)}.pagerow a[aria-current]{background:var(--pill);color:var(--ink)}
.hero{flex:none;height:500px;min-height:0}.notch{gap:5px;padding:0 0 8px 8px}.tab{height:38px;padding:0 13px;font-size:12px}.tab .long{display:none}
.copy{left:20px;right:20px;top:86px}.eyebrow{font-size:12px;margin-bottom:12px}h1{font-size:30px}.sub{font-size:13.5px;margin:14px 0 20px}
.micro{display:none}.hero::before{background:linear-gradient(180deg,var(--scrim) 0%,var(--scrim) 52%,transparent 80%)}.brand .hero::before{background:linear-gradient(180deg,rgba(13,14,17,.92) 0%,rgba(13,14,17,.86) 58%,transparent 84%)}.glass{left:10px;right:10px;bottom:10px}.glass>div:not(.thumb){flex:1}.go{width:44px;height:56px}
.cards{height:auto;grid-template-columns:1fr 1fr;gap:8px}.c1{grid-column:1/-1;grid-template-columns:42% 1fr;height:220px}.c1 .txt{padding:20px 18px 16px}.c1 h2{font-size:18px}.c2,.c3{height:220px}
.c2 .big{font-size:26px}.stripes{height:76px}.bars{height:66px}.faces{grid-template-columns:repeat(4,1fr)}
.kpis{grid-template-columns:1fr 1fr;gap:8px}.kpi{min-height:150px;padding:16px}.kpi .val{font-size:26px}.kpi .dl b{display:inline-block;margin-bottom:4px}.two{grid-template-columns:1fr;gap:8px}.head{padding:16px 6px 4px}}
</style></head><body>
<div class="frame">
<div class="top">
<header class="nav">
  <a class="logo" href="#dashboard" aria-label="Cadence, Beyond One"><img src="${MARK}" alt=""><span class="word">CADENCE</span></a>
  <nav class="links" aria-label="Pages"><a href="#dashboard" aria-current="page">Dashboard</a><a href="#wfm">WFM Team</a><a href="#results">Results</a><a href="#team">Team</a></nav>
  <div class="tools"><button class="search" type="button">${ic('search', 17)}<span>Search</span><kbd>Ctrl K</kbd></button>
  <button class="round rf" type="button" aria-label="Refresh data">${ic('refresh', 18)}</button><button class="round" type="button" aria-label="Notifications, 1 new">${ic('bell', 18)}<span class="badge">1</span></button>
  <button class="me" type="button" aria-label="Noura B., your account">NB</button></div>
</header>
<nav class="pagerow" aria-label="Pages"><a href="#dashboard" aria-current="page">Dashboard</a><a href="#wfm">WFM Team</a><a href="#results">Results</a><a href="#team">Team</a></nav>
<section class="hero" aria-label="September 2026">
  ${art}
  <div class="notch" role="tablist" aria-label="Month"><button class="tab" role="tab">Jul<span class="long">&nbsp;2026</span></button><button class="tab" role="tab">Aug<span class="long">&nbsp;2026</span></button><button class="tab" role="tab" aria-current="true" aria-selected="true"><span class="dot"></span>Sep<span class="long">&nbsp;2026</span></button></div>
  <div class="copy">
    <p class="eyebrow">Good afternoon, Noura · Thursday 12 November</p>
    <h1><span class="ln"><span>September,</span></span><span class="ln"><span>almost closed.</span></span></h1>
    <p class="sub">3 of 5 steps done. Next: the final deduction and absences email, due Sunday 15 November.</p>
    <div class="acts"><a class="cta" href="#next">Continue ${ic('play', 12)}</a><a class="link" href="#steps">See every step</a></div>
  </div>
  <p class="micro">${o.micro}</p>
  <div class="glass"><div class="thumb">${ic('sheet', 22)}</div><div><small>Latest import</small><strong>Genesys exports, 6 files</strong><span>Today, 09:40</span></div><a class="go" href="#import" aria-label="Open the latest import">${ic('chev', 18)}</a></div>
</section>
<div class="cards">
  <article class="card c1"><div class="pic">${emailsArt(o)}</div><div class="txt"><span class="k">Daily brand emails</span><h2>4 made today,<br><b>ready to send</b></h2>
    <a class="slide" href="#emails" aria-label="Open the daily brand emails"><i>${ic('mail', 16)}</i><em>›››</em><i>${ic('check', 16)}</i></a></div></article>
  <article class="card c2"><span class="big num">92.7%</span><p>Adherence, 164 agents. 0.4 pts better than August.</p><a class="disc" href="#adherence" aria-label="Open adherence">${ic('arrow', 16)}</a><div class="stripes">${adhBars(o)}</div></article>
  <article class="card c3">${teamArt(o)}<span class="chip">3 need attention</span><a class="view" href="#team">View</a></article>
</div>
</div>
<section class="more" aria-label="The month in numbers">
  <div class="head"><h2>The month in numbers</h2><span>September 2026 · against August</span></div>
  <div class="kpis">${KPIS.map(([l, v, d, c, t, s]) => `<article class="kpi"><span class="lab">${l}</span><span class="val num">${v}</span><span class="dl"><b class="${c}">${d}</b>${t}</span>${spark(s, o)}</article>`).join('')}</div>
  <div class="two">
    <article class="panel"><h3>Needs attention</h3>${ATTN.map(([n, t, k, v]) => `<div class="row"><span class="av">${n.split(' ').map(w => w[0]).join('')}</span><span class="who">${n}<small>${t} · ${k}</small></span><span class="v num">${v}</span></div>`).join('')}</article>
    <article class="panel" id="steps"><h3>Month close · 3 of 5</h3>${STEPS.map(([s, w, d], i) => `<div class="step${d ? ' done' : i === 3 ? ' next' : ''}"><i>${d ? ic('check', 13) : ''}</i><span>${s}</span><small>${w}</small></div>`).join('')}</article>
  </div>
  <p class="foot">Sample with made-up data · ${o.title}</p>
</section>
</div>
</body></html>`;
}

const OPTIONS = [
  { file: 'A-graphite.html', title: 'A · Graphite', cls: '', art: landscape, micro: 'Calls offered each day · 1–30 September' },
  { file: 'B-beyond-one.html', title: 'B · Beyond One', cls: 'brand', brand: true, art: mosaic, micro: '164 agents · by team · brighter is better adherence' },
  { file: 'C-daylight.html', title: 'C · Daylight', cls: 'light', light: true, art: blinds, micro: 'Calls offered each day · 1–30 September' },
];
// the pieces B · Glass (make-glass.cjs) builds on
module.exports = { FONTS, MARK, GRAIN, CALLS, AGENTS, ADH, KPIS, ATTN, STEPS, PX, INITIALS, HOT, f1, smooth, avg, norm, ICON, ic, emailsArt, adhBars, teamArt, spark };
if (require.main === module) for (const o of OPTIONS) { fs.writeFileSync(path.join(here, o.file), page(o)); console.log(o.file, Math.round(fs.statSync(path.join(here, o.file)).size / 1024) + ' KB'); }
