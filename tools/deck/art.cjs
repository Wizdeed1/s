// The deck's pictures: the screenshots (tools/deck/shots.cjs) in device frames, and the tool's own line icons, as transparent PNGs.
// Usage: node tools/deck/art.cjs shotsDir outDir [formPng] [xlsxPng]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const [shots, out, formPng, xlsxPng] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const body = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui3_body.html'), 'utf8');
const sym = id => { const m = body.match(new RegExp(`<symbol id="${id}"([^>]*)>([\\s\\S]*?)</symbol>`)); return m ? { attrs: m[1], inner: m[2] } : null; };
// icons the tool's sprite does not have, in the same line style (24 px grid, 1.8 stroke, round ends)
const EXTRA = {
  shield: '<path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  offline: '<path d="M3 3l18 18"/><path d="M8.6 16.4a5 5 0 0 1 6.8 0"/><path d="M5.2 12.9a10 10 0 0 1 4.6-2.6"/><path d="M18.8 12.9a10 10 0 0 0-2.3-1.6"/><path d="M2 8.9a15 15 0 0 1 4.4-2.8"/><path d="M22 8.9a15 15 0 0 0-11.6-3.7"/><path d="M12 20h.01"/>',
  zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  sync: '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
  layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 16.5 9 4.5 9-4.5"/><path d="m3 12 9 4.5 9-4.5"/>',
  send: '<path d="M21 3 14.5 21l-3.5-7.5L3.5 10z"/><path d="M21 3 11 13.5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  handshake: '<path d="M8 11.5 11 9a2 2 0 0 1 2.6 0l4.4 3.8"/><path d="m3 12 3.5-3.5L10 7"/><path d="M21 12l-3.5-3.5L14 7"/><path d="m7 13.5 3 3a1.5 1.5 0 0 0 2.1 0l.4-.4"/><path d="m10.5 12 3 3a1.5 1.5 0 0 0 2.1-2.1"/>',
  sparkle: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8z"/>',
  sheet: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
};
const svg = (name, color, px) => {
  const s = sym('i-' + name);
  const inner = s ? s.inner : EXTRA[name]; if (!inner) throw new Error('no icon ' + name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:${color}">${inner}</svg>`;
};
const ICONS = ['up', 'check', 'mail', 'team', 'chart', 'lock', 'file', 'clock', 'bell', 'day', 'folder', 'user', 'star', 'pen', 'table', 'monitor', 'down', 'link', 'grid', 'help', ...Object.keys(EXTRA)];
const COLORS = { white: '#FFFFFF', orange: '#F26722', ink: '#1D1D1F' };
const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const shot = n => img(path.join(shots, n + '.png'));
const CSS = `* { box-sizing: border-box; margin: 0; } body { background: transparent; font-family: Inter, Arial, sans-serif; }
  .pad { display: inline-block; padding: 90px; }
  .laptop { width: 1500px; } .lid { background: #1d1d1f; border-radius: 30px 30px 12px 12px; padding: 24px 24px 30px; box-shadow: inset 0 0 0 2px #3a3a3c; position: relative; }
  .lid::before { content: ''; position: absolute; top: 9px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #2c2c2e; box-shadow: inset 0 0 0 1.5px #48484a; }
  .screen { border-radius: 6px; overflow: hidden; aspect-ratio: 16 / 10; background: #000; } .screen img { width: 100%; display: block; }
  .base { height: 30px; margin: 0 -86px; border-radius: 2px 2px 26px 26px; position: relative; background: linear-gradient(#e6e7e9, #c4c6ca 55%, #9d9fa3); }
  .base.dark { background: linear-gradient(#5a5a5e, #3a3a3c 55%, #1f1f21); }
  .base::before { content: ''; position: absolute; top: 0; left: 50%; width: 230px; margin-left: -115px; height: 11px; border-radius: 0 0 12px 12px; background: rgba(0,0,0,.18); }
  .shadow { filter: drop-shadow(0 18px 24px rgba(0,0,0,.22)) drop-shadow(0 4px 8px rgba(0,0,0,.10)); }   /* fades out inside the padding, so no edge shows on the slide */
  .win { width: 1500px; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.09); }
  .win.dark { background: #1c1c1e; box-shadow: 0 0 0 1px rgba(255,255,255,.1); }
  .bar { height: 46px; background: #f2f2f5; border-bottom: 1px solid #e5e5ea; display: flex; align-items: center; padding: 0 18px; gap: 9px; position: relative; }
  .win.dark .bar { background: #2c2c2e; border-color: #38383a; }
  .dot { width: 13px; height: 13px; border-radius: 50%; } .r { background: #ff5f57; } .y { background: #febc2e; } .g { background: #28c840; }
  .url { position: absolute; left: 50%; transform: translateX(-50%); width: 560px; height: 28px; border-radius: 8px; background: #e6e6eb; color: #6e6e73; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .win.dark .url { background: #3a3a3c; color: #a8a8ad; }
  .win img.sc { width: 100%; display: block; }
  .phone { width: 420px; height: 900px; border-radius: 66px; background: #1d1d1f; padding: 13px; box-shadow: inset 0 0 0 2px #48484a, inset 0 0 0 6px #111; position: relative; }
  .phone .scr { width: 100%; height: 100%; border-radius: 54px; overflow: hidden; background: #f2f2f7; display: flex; flex-direction: column; } .phone .scr img { width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: top; display: block; }
  .phone .sb { height: 54px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 6px 34px 0; font: 600 17px/1 Inter, Arial, sans-serif; color: #1d1d1f; }
  .phone.dark .scr { background: #0b0b0c; } .phone.dark .sb { color: #f5f5f7; }
  .sb i { display: inline-block; width: 26px; height: 12px; border: 1.6px solid currentColor; border-radius: 4px; position: relative; margin-left: 6px; } .sb i::after { content: ''; position: absolute; inset: 1.5px 5px 1.5px 1.5px; background: currentColor; border-radius: 1.5px; }
  .glow { width: 1400px; height: 1400px; border-radius: 50%; background: radial-gradient(circle, rgba(242,103,34,.55) 0%, rgba(242,103,34,.18) 38%, rgba(242,103,34,0) 70%); }
  .phone .island { position: absolute; top: 25px; left: 50%; width: 118px; height: 34px; margin-left: -59px; border-radius: 20px; background: #000; }
  .paper { width: 860px; background: #fff; border-radius: 4px; box-shadow: 0 0 0 1px rgba(0,0,0,.06); } .paper img { width: 100%; display: block; border-radius: 4px; }
  .fan { display: flex; align-items: center; } .fan .phone { margin: 0 -40px; }
  .zoom { position: relative; border-radius: 26px; overflow: hidden; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.08); } .zoom img { width: 100%; display: block; }
  .zoom.fade::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 140px; background: linear-gradient(rgba(255,255,255,0), #fff 85%); }`;
const winHtml = (src, title, dark) => `<div class="win${dark ? ' dark' : ''}"><div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="url">${svg('lock', dark ? '#a8a8ad' : '#8e8e93', 14)}${title}</span></div><img class="sc" src="${src}"></div>`;
const phoneHtml = (src, style = '', dark = false) => `<div class="phone${dark ? ' dark' : ''}" style="${style}"><div class="scr"><div class="sb"><span>10:30</span><span>5G<i></i></span></div><img src="${src}"></div><span class="island"></span></div>`;
const laptopHtml = (src, dark) => `<div class="laptop"><div class="lid"><div class="screen"><img src="${src}"></div></div><div class="base${dark ? ' dark' : ''}"></div></div>`;
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ deviceScaleFactor: 1, viewport: { width: 2400, height: 1600 } }), p = await ctx.newPage();
  async function render(name, html, o = {}) {
    await p.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body><div class="pad" id="root" style="${o.pad != null ? `padding:${o.pad}px` : ''}"><div class="shadow" style="${o.style || ''}">${html}</div></div></body></html>`);
    await p.waitForTimeout(150);
    await (await p.$('#root')).screenshot({ path: path.join(out, name + '.png'), omitBackground: true });
    console.log('✓', name);
  }
  // icons: white, orange and ink, 256 px
  for (const n of ICONS) for (const [c, hex] of Object.entries(COLORS)) {
    await p.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div id="i" style="width:256px;height:256px;display:grid;place-items:center">${svg(n, hex, 220)}</div></body></html>`);
    await (await p.$('#i')).screenshot({ path: path.join(out, `icon-${n}-${c}.png`), omitBackground: true });
  }
  console.log('✓ icons', ICONS.length);
  await render('laptop-dark', laptopHtml(shot('dash-dark'), true));
  await render('laptop-dark-tilt', laptopHtml(shot('dash-dark'), true), { style: 'transform: perspective(3000px) rotateY(-18deg) rotateX(7deg) rotateZ(1.5deg); transform-origin: 60% 50%;', pad: 160 });
  await render('laptop-light', laptopHtml(shot('dash-light'), false));
  for (const [n, t] of [['import', 'Import'], ['checks', 'Review › Checks'], ['export', 'Export'], ['emails', 'Emails'], ['templates', 'Attendance templates'], ['how', 'How this was counted'], ['cycle', 'Supervisors'], ['builder', 'Report builder'], ['data', 'Data']])
    await render('win-' + n, winHtml(shot(n), `MC Monthly Report Builder · ${t}`));
  for (const n of ['phone-team', 'phone-agent-en', 'phone-agent-ar', 'phone-dash-dark']) await render('m-' + n, phoneHtml(shot(n), '', /dark/.test(n)));
  // a soft orange light behind the devices on the dark slides
  await p.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body><div id="g" class="glow"></div></body></html>`);
  await (await p.$('#g')).screenshot({ path: path.join(out, 'glow.png'), omitBackground: true }); console.log('✓ glow');
  await render('phones-fan', `<div class="fan">${phoneHtml(shot('phone-team'), 'transform: rotate(-7deg) translateY(30px)')}${phoneHtml(shot('phone-agent-en'), 'z-index:2; transform: translateY(-10px)')}${phoneHtml(shot('phone-agent-ar'), 'transform: rotate(7deg) translateY(30px)')}</div>`, { pad: 120 });
  if (formPng && fs.existsSync(formPng)) await render('paper-form', `<div class="paper"><img src="${img(formPng)}"></div>`, { style: 'transform: rotate(-3deg)', pad: 110 });
  if (xlsxPng && fs.existsSync(xlsxPng)) await render('win-xlsx', winHtml(img(xlsxPng), 'Attendance - Oct 2026 - TS.xlsx'));
  // the dashboard large, for the slide that points at its parts (make_deck.cjs reads hero.json to place the numbers), and close-ups
  await render('hero-dash', winHtml(shot('dash-light'), 'MC Monthly Report Builder · Dashboard'));
  fs.writeFileSync(path.join(out, 'hero.json'), JSON.stringify({ pad: 90, winW: 1500, bar: 46, boxes: JSON.parse(fs.readFileSync(path.join(shots, 'dash-light.json'), 'utf8')) }));
  for (const [n, fade] of [['z-import', 0], ['z-checks', 0], ['z-email', 1], ['z-templates', 1], ['z-how', 1]]) {
    const f = path.join(shots, n + '.png'), w = fs.readFileSync(f).readUInt32BE(16);
    await render(n, `<div class="zoom${fade ? ' fade' : ''}" style="width:${Math.round(w * 0.8)}px"><img src="${img(f)}"></div>`, { pad: 70 });
  }
  await b.close();
})().catch(e => { console.log('✗ ' + (e && e.stack || e)); process.exit(1); });
