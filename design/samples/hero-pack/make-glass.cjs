/* B · Glass: option B, glassy, floating over a moving background, with the motion of the team's reference reel: node make-glass.cjs
   Writes B-glass.html: one self-contained page (fonts, logo, GSAP inline), three screens you can move between (Dashboard,
   Emails, Team), no request. Every name and number is made up. Motion, as in the reel:
   - glossy spheres in Beyond One's colours float behind frosted glass and glide to new places on every page change;
   - the old page fades out, the new title arrives word by word and its cards and rows come in one after another;
   - the nav's blue pill slides to the page you click, with a ripple where you clicked; tabs slide their underline;
   - the chart draws itself and reshapes when the range changes; numbers count up; the ring and the bars fill;
   - on the Emails board a card lifts and tilts when dragged (scale 1.04, −2°), the lane under it lights up, and a toast
     with Undo rises when it is dropped. Arrow keys move a focused card too.
   With reduced motion nothing moves and every screen still works. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { FONTS, MARK, GRAIN, CALLS, AGENTS, ADH, KPIS, ATTN, STEPS, PX, f1, ic, emailsArt, adhBars, teamArt } = require('./make.cjs');
const root = path.resolve(__dirname, '../../..');
const GSAP = fs.readFileSync(path.join(root, 'vendor/gsap.min.js'), 'utf8').replace(/\/\/# sourceMappingURL=\S*\s*$/, '');
const fmt = n => Math.round(n).toLocaleString('en-US');
const sum = a => a.reduce((x, y) => x + y, 0);

// ---------------------------------------------------------------- the chart's three ranges (made up, from the same month)
const S = sum(CALLS), AUG = CALLS.map((v, i) => Math.round(v * 0.955 + 160 * Math.sin(i / 2.3)));
const pct = (a, b) => (a >= b ? '+' : '−') + Math.abs(100 * (a - b) / b).toFixed(1) + '%';
const RANGES = {
  '7D': { cur: CALLS.slice(-7), prev: AUG.slice(-7), labels: ['24', '25', '26', '27', '28', '29', '30 Sep'], note: `${fmt(sum(CALLS.slice(-7)))} in the last 7 days · ${pct(sum(CALLS.slice(-7)), sum(AUG.slice(-7)))} on the same days of August` },
  '30D': { cur: CALLS, prev: AUG, labels: ['1 Sep', '5', '10', '15', '20', '25', '30 Sep'], note: `${fmt(S)} this month · ${pct(S, sum(AUG))} on August` },
  '6M': { cur: [.91, .93, .99, .97, .985, 1].map(k => Math.round(S * k)), prev: [.86, .88, .9, .9, .92, .93].map(k => Math.round(S * k)), labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], note: `${fmt(S * 5.785)} since April · +6.9% on the same months last year` },
};

// the team as a wall of lit tiles inside the glass headline panel (each tile one agent; red: needs attention)
function wall() {
  const W = 1400, H = 640, cols = 18, size = 30, gap = 9, step = size + gap, x0 = W - cols * step - 24, y0 = 150;
  let tiles = '', glow = '';
  AGENTS.forEach((a, i) => {
    const c = i % cols, r = Math.floor(i / cols), X = x0 + c * step, Y = y0 + r * step;
    const col = a.flag ? '#ff3b3b' : PX[a.c], op = a.flag ? 1 : f1(0.25 + 0.75 * Math.pow((a.adh - 0.84) / 0.15, 1.4));
    const t = `<rect x="${X}" y="${Y}" width="${size}" height="${size}" rx="5" fill="${col}" fill-opacity="${op}" style="--c:${c + r * 0.6}"${a.flag ? ' class="pulse"' : ''}/>`;
    tiles += t; if (op > .6 || a.flag) glow += t;
  });
  return `<svg class="wall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><defs>
<filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
<linearGradient id="fd" x1="${x0}" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".38" stop-color="#fff"/></linearGradient>
<mask id="wm"><rect width="${W}" height="${H}" fill="url(#fd)"/></mask></defs>
<g mask="url(#wm)" class="tilt"><g filter="url(#gl)" class="glowl">${glow}</g>${tiles}</g></svg>`;
}

// the Emails board: the four daily brand emails, in their lanes
const BRANDS = {
  vm: ['Virgin Mobile', '#e0242a', 'SLA 86.5% · 1,000 calls', 'Mazen O.', '08:05', ''],
  vp: ['Virgin Postpaid', '#5b7fc0', 'SLA 91.2% · 640 calls', 'Mazen O.', '08:12', ''],
  fm: ['FRiENDi mobile', '#25b3bd', 'SLA 89.4% · 820 calls', 'Lama W.', '08:01', 'Sent 08:42 by Noura B.'],
  fp: ['FRiENDi PAY', '#16a08f', 'SLA 88.1% · 412 chats', 'Lama W.', '08:20', '2 warnings to check'],
};
const ecard = k => {
  const [name, col, line, by, at, note] = BRANDS[k], ini = by.split(' ').map(w => w[0]).join('');
  return `<li class="ecard" tabindex="0" data-k="${k}" aria-label="${name}. Arrow keys move it to another lane." style="--bc:${col}">
<div class="eh"><span class="bdot"></span><b>${name}</b><span class="when">Thu 12 Nov</span></div><p class="eline">${line}</p>
${note ? `<span class="pill ${/warn/.test(note) ? 'warn' : 'ok'}">${note}</span>` : ''}
<div class="ef"><span class="av sm">${ini}</span><span class="by">Made by ${by} · ${at}</span><button class="arrow rip" type="button" aria-label="Open ${name}">${ic('arrow', 14)}</button></div></li>`;
};
const lane = (id, title, sub, dot, ks) => `<section class="lane glass" data-lane="${id}" aria-label="${title}">
<header><span class="ldot" style="background:${dot}"></span><h3>${title}</h3><span class="n">${ks.length}</span></header><p class="lsub">${sub}</p>
<ul class="cards">${ks.map(ecard).join('')}</ul><div class="dropz">Drop an email here</div></section>`;

// the Team table
const TEAM = [['Reem T.', 'CC', 81.2, 3, 46, 61.5, 'Needs attention'], ['Waleed G.', 'CC', 83.5, 1, 22, 70.2, 'Needs attention'], ['Omar B.', 'SM', 90.4, 4, 12, 74.8, 'Late'],
  ['Lama W.', 'CC', 95.1, 0, 4, 92.6, 'On track'], ['Mazen O.', 'SM', 94.2, 0, 9, 88.1, 'On track'], ['Ghada S.', 'CT', 92.8, 1, 46, 79.4, 'On track'],
  ['Sara M.', 'QA', 96.3, 0, 0, 95.0, 'On track'], ['Abeer D.', 'CC', 93.7, 0, 15, 84.3, 'On track']];
const stCls = s => s === 'On track' ? 'ok' : s === 'Late' ? 'bad' : 'warn';
const trow = ([n, t, a, ab, l, f, s]) => `<tr class="trow"><td><span class="av">${n.split(' ').map(w => w[0]).join('')}</span><span class="who">${n}<small>${t}</small></span></td>
<td class="num">${a.toFixed(1)}%</td><td class="num hide-s">${ab}</td><td class="num hide-s">${l}</td><td class="num">${f.toFixed(1)}%</td><td><span class="pill ${stCls(s)}">${s}</span></td></tr>`;

// ---------------------------------------------------------------- the page
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cadence · B · Glass</title><meta name="color-scheme" content="dark">
<style>
html,body{background:#05070d;color:#f3f5fa}
${FONTS}
:root{--ink:#f3f5fa;--ink-2:rgba(243,245,250,.8);--ink-3:rgba(243,245,250,.3);--muted:rgba(243,245,250,.62);--faint:rgba(243,245,250,.45);--line:rgba(255,255,255,.08);
--glass:rgba(13,18,29,.5);--blue:#2384e8;--good:#6fe0b4;--good-bg:rgba(111,224,180,.13);--bad:#ff8f86;--bad-bg:rgba(255,143,134,.14);--warn:#ffbb6b;--warn-bg:rgba(255,187,107,.14);
--ease:cubic-bezier(.22,1,.36,1);--display:"Archivo","Arial Black",sans-serif;--ui:"Poppins","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:clip}
body{margin:0;font:400 14px/1.5 var(--ui);min-height:100vh}::selection{background:rgba(35,132,232,.35)}
a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
:focus-visible{outline:2px solid #8cc4ff;outline-offset:3px;border-radius:10px}
.ic{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}.num{font-variant-numeric:tabular-nums}
/* the spheres behind everything */
.orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:radial-gradient(120% 90% at 70% 0%,#0d1526 0%,#05070d 60%)}
.orbs::after{content:"";position:absolute;inset:0;background:${GRAIN};opacity:.07;mix-blend-mode:overlay}
.ob{position:absolute;inset:0;transform:translate3d(calc(var(--px,0) * var(--d) * 26px),calc(var(--py,0) * var(--d) * 16px),0);transition:transform 1s var(--ease)}
.orb{position:absolute;left:0;top:0;width:var(--s);height:var(--s);border-radius:50%;transform:translate3d(var(--x),var(--y),0);
transition:transform 1.4s var(--ease),width 1.4s var(--ease),height 1.4s var(--ease);will-change:transform;animation:orbIn 1.8s var(--ease) both,drift var(--dd,15s) ease-in-out 1.8s infinite alternate;
background:radial-gradient(circle at 33% 28%,rgba(255,255,255,.62),rgba(255,255,255,0) 24%),radial-gradient(circle at 42% 40%,var(--c1),var(--c2) 56%,var(--c3) 100%);
box-shadow:inset calc(var(--s) * -.08) calc(var(--s) * -.1) calc(var(--s) * .2) rgba(0,0,0,.42),0 0 calc(var(--s) * .3) var(--glow)}
.o1{--c1:#ffc58a;--c2:#ee8a3a;--c3:#6f2c07;--glow:rgba(237,125,49,.3)}.o2{--c1:#86c8ff;--c2:#1873c9;--c3:#05264a;--glow:rgba(13,118,189,.4);--dd:18s}
.o3{--c1:#86f2d6;--c2:#139b86;--c3:#03342d;--glow:rgba(12,123,108,.4);--dd:13s}.o4{--c1:#a6ecff;--c2:#16aad0;--c3:#033f57;--glow:rgba(0,127,162,.4);--dd:20s}
.o5{--c1:#f7f9fc;--c2:#9ca5b4;--c3:#2f343d;--glow:rgba(190,200,220,.15);--dd:11s}.o6{--c1:#ffe0ee;--c2:#ea8db8;--c3:#5d2240;--glow:rgba(246,173,204,.3);--dd:12s}
@keyframes drift{to{translate:0 -2.2vh}}@keyframes orbIn{from{opacity:0;scale:.7}}
[data-page="dash"] .o1{--x:66vw;--y:-15vh;--s:36vw}[data-page="dash"] .o2{--x:-19vw;--y:28vh;--s:42vw}[data-page="dash"] .o3{--x:36vw;--y:72vh;--s:15vw}
[data-page="dash"] .o4{--x:80vw;--y:50vh;--s:32vw}[data-page="dash"] .o5{--x:3vw;--y:82vh;--s:6vw}[data-page="dash"] .o6{--x:60vw;--y:88vh;--s:3.6vw}
[data-page="emails"] .o1{--x:72vw;--y:-22vh;--s:30vw}[data-page="emails"] .o2{--x:-24vw;--y:42vh;--s:40vw}[data-page="emails"] .o3{--x:30vw;--y:56vh;--s:12vw}
[data-page="emails"] .o4{--x:74vw;--y:60vh;--s:38vw}[data-page="emails"] .o5{--x:46vw;--y:26vh;--s:7vw}[data-page="emails"] .o6{--x:62vw;--y:84vh;--s:4vw}
[data-page="team"] .o1{--x:79vw;--y:-8vh;--s:26vw}[data-page="team"] .o2{--x:-12vw;--y:58vh;--s:32vw}[data-page="team"] .o3{--x:58vw;--y:24vh;--s:11vw}
[data-page="team"] .o4{--x:64vw;--y:70vh;--s:42vw}[data-page="team"] .o5{--x:27vw;--y:64vh;--s:8vw}[data-page="team"] .o6{--x:44vw;--y:92vh;--s:5vw}
/* frosted glass, one material everywhere */
.glass{position:relative;border-radius:22px;background:linear-gradient(155deg,rgba(255,255,255,.08),rgba(255,255,255,.015) 42%),var(--glass);
-webkit-backdrop-filter:blur(28px) saturate(1.5);backdrop-filter:blur(28px) saturate(1.5);box-shadow:0 34px 70px -30px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.07)}
.glass::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.07) 22%,rgba(255,255,255,0) 46%,rgba(255,255,255,0) 62%,rgba(255,255,255,.05) 84%,rgba(255,255,255,.15));
-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
.glass::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(440px circle at var(--mx,50%) var(--my,-30%),rgba(255,255,255,.075),transparent 46%);opacity:0;transition:opacity .35s}
.glass:hover::after{opacity:1}
.lift{transition:transform .4s var(--ease),box-shadow .4s var(--ease)}.lift:hover{transform:translateY(-3px);box-shadow:0 44px 80px -30px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.09)}
.rip{position:relative;overflow:hidden}.ripple{position:absolute;border-radius:50%;width:12px;height:12px;margin:-6px 0 0 -6px;background:rgba(255,255,255,.45);pointer-events:none;animation:ripple .65s var(--ease) forwards}
@keyframes ripple{to{transform:scale(18);opacity:0}}
/* the frame */
.app{position:relative;z-index:1;max-width:1680px;margin:0 auto;padding:14px;display:flex;flex-direction:column;gap:12px}
.nav{position:sticky;top:10px;z-index:20;height:64px;display:flex;align-items:center;gap:16px;padding:0 10px 0 18px;border-radius:20px}
.logo{display:flex;align-items:center;gap:11px;min-width:190px}.logo img{width:30px;height:30px}.word{font:800 15px/1 var(--display);font-stretch:125%;letter-spacing:.08em}
.links{position:relative;flex:1;display:flex;justify-content:center;gap:2px}
.links a{position:relative;z-index:1;font-size:13.5px;color:var(--ink-2);padding:9px 18px;border-radius:999px;transition:color .3s}.links a:hover{color:#fff}
.links a[aria-current]{color:#fff}.ind{position:absolute;top:0;left:0;height:100%;width:0;border-radius:999px;background:var(--blue);box-shadow:0 10px 26px -10px rgba(35,132,232,.9),inset 0 1px 0 rgba(255,255,255,.25);transition:left .55s var(--ease),width .55s var(--ease)}
html:not(.js) .links a[aria-current]{background:var(--blue)}
.tools{display:flex;align-items:center;gap:8px}
.search{display:flex;align-items:center;gap:10px;width:230px;height:42px;padding:0 8px 0 16px;border-radius:999px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px var(--line);color:var(--muted);font-size:13px}
.search kbd{margin-left:auto;font:500 11px var(--ui);color:var(--faint);border:1px solid var(--line);border-radius:7px;padding:2px 7px}
.round{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px var(--line);transition:background .25s}.round:hover{background:rgba(255,255,255,.12)}
.badge{position:absolute;top:6px;right:7px;min-width:16px;height:16px;border-radius:5px;background:#ed1c24;color:#fff;font:600 10px/16px var(--ui);text-align:center}
.me{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:600 13px var(--ui);background:linear-gradient(135deg,#ffd9b8,#f6adcc);color:#111}
.pagerow{display:none}
/* dashboard: the first screen */
.top{display:flex;flex-direction:column;gap:12px;height:calc(100vh - 104px);height:calc(100dvh - 104px);min-height:700px}
.heroWrap{position:relative;flex:1;min-height:420px}
.hero{position:absolute;inset:0;overflow:hidden;--glass:rgba(10,14,24,.42)}.hero::before{display:none}
.heroRim{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.wall{position:absolute;inset:0;width:100%;height:100%;z-index:0}.tilt{transform:perspective(1800px) rotateY(-16deg);transform-origin:100% 50%;transform-box:view-box}
.wall rect{animation:tile .7s var(--ease) both;animation-delay:calc(.5s + var(--c) * 34ms)}@keyframes tile{from{opacity:0}}.glowl{opacity:.55;animation:fade 1.2s 1.1s both}@keyframes fade{from{opacity:0}}
.hero .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(6,9,16,.55) 0%,rgba(6,9,16,.15) 48%,transparent 66%)}
.tabs{position:absolute;top:0;right:0;z-index:4;display:flex;gap:8px}
.tab{height:44px;padding:0 22px;border-radius:999px;font-size:13px;color:var(--ink-2);display:inline-flex;align-items:center;gap:8px;transition:background .3s,color .3s}
.tab[aria-selected="true"]{background:#fff;color:#111;font-weight:500}.tab .dot{width:6px;height:6px;border-radius:50%;background:#ed1c24}
.copy{position:absolute;z-index:2;left:5%;top:16%;max-width:46rem}
.eyebrow{font-size:13px;color:var(--ink-2);margin:0 0 18px}
h1{font:800 clamp(34px,4.2vw,62px)/.98 var(--display);font-stretch:125%;text-transform:uppercase;margin:0;text-shadow:0 16px 38px rgba(0,0,0,.35)}
.w{display:inline-block}
.sub{font-size:14.5px;line-height:1.55;color:var(--ink-2);max-width:31rem;margin:18px 0 26px}
.acts{display:flex;align-items:center;gap:22px}
.cta{display:inline-flex;align-items:center;gap:12px;background:#fff;color:#111;font-weight:500;font-size:13.5px;padding:12px 18px 12px 20px;border-radius:10px;transition:transform .25s var(--ease)}.cta:hover{transform:translateY(-2px)}
.link{font-size:13.5px;color:var(--ink-2);border-bottom:1px solid rgba(255,255,255,.3);padding-bottom:2px}.link:hover{color:#fff}
.micro{position:absolute;z-index:2;left:5%;bottom:22px;margin:0;font:500 10.5px/1 var(--ui);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.imp{position:absolute;z-index:2;right:14px;bottom:14px;display:flex;align-items:center;gap:12px;padding:8px;border-radius:16px;--glass:rgba(20,26,40,.45)}
.thumb{width:64px;height:46px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--ink-2)}
.imp small{display:block;font-size:10.5px;color:var(--faint);line-height:1.3}.imp strong{display:block;font-weight:500;font-size:12.5px;line-height:1.35}.imp span{font-size:11px;color:var(--muted)}
.go{width:48px;height:64px;border-radius:12px;background:#fff;color:#111;display:grid;place-items:center;margin-left:10px}
.cards{height:250px;flex:none;display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}
.card{overflow:hidden}
.c1{display:grid;grid-template-columns:44% 1fr}.c1 .pic{display:grid;place-items:center;overflow:hidden;background:rgba(0,0,0,.18)}.mails{width:112%;height:112%;margin-top:16%;filter:drop-shadow(0 18px 30px rgba(0,0,0,.4))}
.c1 .txt{padding:30px 30px 24px;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(35,132,232,.16),rgba(35,132,232,0) 70%)}
.k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.c1 h2{font:300 23px/1.25 var(--ui);margin:10px 0 0}.c1 h2 b{font-weight:600}
.slide{margin-top:auto;display:inline-flex;align-items:center;gap:10px;width:max-content;padding:5px;border-radius:999px;background:rgba(0,0,0,.3);color:var(--muted)}
.slide i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#111}.slide i:last-child{background:rgba(255,255,255,.12);color:#fff}.slide em{font-style:normal;letter-spacing:.2em;font-size:12px}
.c2{padding:22px 22px 14px;display:flex;flex-direction:column}.big{font:500 30px/1 var(--ui);letter-spacing:-.02em}.c2 p{font-size:11.5px;line-height:1.45;color:var(--muted);margin:8px 0 0;max-width:15rem}
.disc{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);display:grid;place-items:center;transition:transform .35s var(--ease)}.disc:hover{transform:rotate(45deg)}
.stripes{margin-top:auto;height:96px;border-radius:14px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.06) 0 9px,rgba(255,255,255,.015) 9px 18px);display:flex;align-items:flex-end;padding:0 8px}.bars{width:100%;height:84px}
.bars rect{transform-box:fill-box;transform-origin:50% 100%}
.c3 .faces{position:absolute;inset:34px -8px -26px;display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:0 16px;transform:rotate(-6deg)}
.face{position:relative;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font:500 11px var(--ui);color:var(--ink-2);background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 2px var(--dot,transparent)}
.face.hot{background:rgba(255,255,255,.14);color:#fff}.spot{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.35)}
.chip{position:absolute;left:14px;top:14px;z-index:1;font-size:11.5px;font-weight:500;padding:7px 12px;border-radius:999px;background:rgba(10,14,24,.75);box-shadow:0 6px 18px rgba(0,0,0,.3)}
.view{position:absolute;right:14px;bottom:14px;background:#fff;color:#111;font-size:12.5px;font-weight:500;padding:9px 26px;border-radius:9px}
/* dashboard: below the first screen */
.head{display:flex;align-items:baseline;gap:14px;padding:26px 8px 4px}.head h2{font:500 19px var(--ui);margin:0}.head span{font-size:13px;color:var(--faint)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.span2{grid-column:span 2}
.panel{padding:20px 22px}.panel h3{font:500 15px var(--ui);margin:0}.panel .ps{font-size:12px;color:var(--faint);margin:2px 0 0}
.chart .ch{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}.chart .ch>div:first-child{flex:1;min-width:220px}
.seg{position:relative;display:inline-flex;padding:4px;border-radius:999px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px var(--line)}
.seg button{position:relative;z-index:1;font-size:12px;padding:6px 14px;border-radius:999px;color:var(--ink-2);transition:color .3s}.seg button[aria-pressed="true"]{color:#fff}
.seg .sind{position:absolute;top:4px;bottom:4px;left:4px;width:0;border-radius:999px;background:rgba(255,255,255,.14);transition:left .45s var(--ease),width .45s var(--ease)}
.vs{font-size:12px;padding:7px 14px;border-radius:999px;background:var(--blue);color:#fff;display:inline-flex;align-items:center;gap:8px}.vs i{width:14px;border-top:2px dashed rgba(255,255,255,.85)}
.plot{width:100%;height:240px;margin-top:12px;overflow:visible}.plot text{font:11px var(--ui);fill:rgba(243,245,250,.45)}
.ring{display:flex;align-items:center;gap:22px;margin-top:14px}.ring svg{width:124px;height:124px;flex:none}.ring .rv{font:500 22px var(--ui)}
.ring ul{list-style:none;margin:0;padding:0;flex:1;font-size:12.5px}.ring li{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);color:var(--muted)}.ring li b{font-weight:500;color:var(--ink)}
.kpi{padding:20px 22px 18px}.kpi .lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}.kpi .val{display:block;font:500 34px/1.1 var(--ui);letter-spacing:-.02em;margin:10px 0 8px}
.dl{font-size:12px;color:var(--muted)}.dl b{font-weight:500;padding:2px 8px;border-radius:6px;margin-right:6px}.dl b.good{background:var(--good-bg);color:var(--good)}.dl b.bad{background:var(--bad-bg);color:var(--bad)}
.row{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line);font-size:13px}.row:first-of-type{margin-top:12px}.av{width:34px;height:34px;border-radius:50%;flex:none;background:rgba(255,255,255,.1);display:grid;place-items:center;font-size:11px;font-weight:500}
.av.sm{width:26px;height:26px;font-size:10px}.who{flex:1;min-width:0}.who small{display:block;color:var(--faint);font-size:11.5px}.row .v{font-weight:500}
.split{display:flex;height:12px;border-radius:999px;overflow:hidden;margin:18px 0 14px;gap:3px}.split i{display:block;height:100%;border-radius:999px;transform-origin:0 50%}
.leg{list-style:none;margin:0;padding:0;font-size:12.5px}.leg li{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)}.leg li span:nth-child(2){flex:1;color:var(--muted)}.leg .sq{width:9px;height:9px;border-radius:3px}
/* page headers (Emails, Team) */
.phead{display:flex;align-items:flex-end;gap:16px;padding:22px 8px 6px;flex-wrap:wrap}.phead>div{flex:1;min-width:240px}
.phead h2{font:800 clamp(28px,3vw,42px)/1 var(--display);font-stretch:125%;text-transform:uppercase;margin:0}.phead p{margin:10px 0 0;color:var(--muted);font-size:13.5px}
.btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:999px;font-size:13px;font-weight:500;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px var(--line)}
.btn.blue{background:var(--blue);box-shadow:0 12px 28px -12px rgba(35,132,232,.9),inset 0 1px 0 rgba(255,255,255,.25)}
.utabs{position:relative;display:flex;gap:4px;padding:0 8px;border-bottom:1px solid var(--line);margin:12px 0 14px}
.utabs button{font-size:13px;padding:10px 12px;color:var(--muted);transition:color .3s}.utabs button[aria-selected="true"]{color:#fff}.utabs button .n{margin-left:6px;font-size:11px;padding:1px 7px;border-radius:999px;background:rgba(255,255,255,.08)}
.uind{position:absolute;bottom:-1px;height:2px;left:0;width:0;border-radius:2px;background:#fff;transition:left .45s var(--ease),width .45s var(--ease)}
.chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 8px 14px}.chips button{font-size:12.5px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink-2)}
.chips button[aria-pressed="true"]{background:var(--blue);color:#fff;box-shadow:none}.chips b{font-weight:500;margin-left:6px;opacity:.8}
/* the Emails board */
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start}
.lane{padding:16px 14px 14px;border-radius:20px;transition:box-shadow .3s}.lane header{display:flex;align-items:center;gap:9px;padding:0 4px}.lane h3{font:500 14px var(--ui);margin:0}
.lane .n{font-size:11px;padding:1px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--ink-2)}.ldot{width:8px;height:8px;border-radius:50%}.lsub{font-size:12px;color:var(--faint);margin:2px 4px 12px}
.lane.over{box-shadow:0 0 0 1.5px var(--blue),0 34px 70px -30px rgba(0,0,0,.75),0 0 40px -10px rgba(35,132,232,.6)}
.lane .cards{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;min-height:20px}
.dropz{display:none;margin-top:10px;height:88px;border-radius:14px;border:1.5px dashed rgba(255,255,255,.18);color:var(--faint);font-size:12px;place-items:center}
.dragging .dropz{display:grid}.lane.over .dropz{border-color:var(--blue);color:#fff}
.ecard{position:relative;padding:14px 14px 12px;border-radius:16px;background:rgba(255,255,255,.055);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);cursor:grab;touch-action:none;user-select:none;transition:background .25s,opacity .25s}
.ecard:hover{background:rgba(255,255,255,.085)}.ecard::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--bc)}
.eh{display:flex;align-items:center;gap:8px;font-size:13.5px}.eh b{font-weight:500}.bdot{width:8px;height:8px;border-radius:50%;background:var(--bc)}.when{margin-left:auto;font-size:11px;color:var(--faint)}
.eline{margin:6px 0 8px;font-size:12.5px;color:var(--muted)}.ef{display:flex;align-items:center;gap:8px;margin-top:10px}.by{flex:1;font-size:11.5px;color:var(--faint)}
.arrow{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08)}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:3px 10px;border-radius:999px}.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pill.ok{background:var(--good-bg);color:var(--good)}.pill.warn{background:var(--warn-bg);color:var(--warn)}.pill.bad{background:var(--bad-bg);color:var(--bad)}
.ecard.placeholder{opacity:.3;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25)}
.ghost{position:fixed;z-index:60;margin:0;pointer-events:none;cursor:grabbing;list-style:none;background:rgba(30,38,56,.86);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
box-shadow:0 30px 60px -20px rgba(0,0,0,.8),inset 0 0 0 1px rgba(255,255,255,.18)}
/* the Team table */
.tablewrap{padding:6px 10px 8px;border-radius:20px;overflow:auto}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font-weight:500;font-size:11.5px;color:var(--faint);padding:14px 12px;border-bottom:1px solid var(--line)}
td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:middle}tr:last-child td{border-bottom:0}
td:first-child{display:flex;align-items:center;gap:12px}td.num,th.num{text-align:right}tbody tr{transition:background .2s}tbody tr:hover{background:rgba(255,255,255,.04)}
/* the toast */
.toast{position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100% - 32px);bottom:26px;z-index:70;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 16px;border-radius:999px;
background:rgba(240,243,250,.88);color:#111;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 18px 40px -12px rgba(0,0,0,.6);font-size:13px;visibility:hidden}
.toast.on{visibility:visible}.toast .tick{color:#0b8a5e}.toast button{font-weight:500;padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.08)}
.foot{font-size:11.5px;color:var(--faint);text-align:center;padding:18px 0 4px}
.pulse{animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
@media (max-width:1320px){.search{width:190px}.links a{padding:9px 14px}.logo{min-width:0}}
@media (max-width:1100px){.search{width:42px;padding:0;justify-content:center}.search span,.search kbd{display:none}.grid{grid-template-columns:1fr 1fr}.span2{grid-column:1/-1}}
@media (max-width:760px){.app{padding:8px;gap:8px}.nav{height:58px;padding:0 8px 0 14px;gap:8px;top:6px}.links{display:none}.logo{flex:1}.round.rf{display:none}
.pagerow{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.pagerow a{flex:none;font-size:13px;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--ink-2)}.pagerow a[aria-current]{background:var(--blue);color:#fff}
.top{height:auto;min-height:0;gap:8px}.heroWrap{flex:none;height:520px}.tab{height:38px;padding:0 13px;font-size:12px}.tab .long{display:none}.tabs{gap:5px}
.copy{left:20px;right:20px;top:86px}.eyebrow{font-size:12px;margin-bottom:12px}h1{font-size:30px}.sub{font-size:13.5px;margin:14px 0 20px}.micro{display:none}
.hero .shade{background:linear-gradient(180deg,rgba(6,9,16,.8) 0%,rgba(6,9,16,.7) 56%,transparent 84%)}.imp{left:10px;right:10px;bottom:10px}.imp>div:not(.thumb){flex:1}.go{width:44px;height:56px}
.cards{height:auto;grid-template-columns:1fr 1fr;gap:8px}.c1{grid-column:1/-1;grid-template-columns:42% 1fr;height:220px}.c1 .txt{padding:20px 18px 16px}.c1 h2{font-size:18px}.c2,.c3{height:220px}
.big{font-size:26px}.stripes{height:76px}.bars{height:66px}.c3 .faces{grid-template-columns:repeat(4,1fr)}
.grid{grid-template-columns:1fr;gap:8px}.span2{grid-column:auto}.board{grid-template-columns:repeat(3,84vw);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}.lane{scroll-snap-align:start}
.hide-s{display:none}.phead{padding-top:14px}
[data-page] .o5{--x:80vw;--y:88vh;--s:14vw}[data-page] .o6{--x:4vw;--y:93vh;--s:7vw}}
</style></head><body data-page="dash">
<div class="orbs" aria-hidden="true">${['o1', 'o2', 'o3', 'o4', 'o5', 'o6'].map((o, i) => `<b class="ob" style="--d:${[.6, 1, 1.6, .8, 2.2, 2.6][i]}"><i class="orb ${o}"></i></b>`).join('')}</div>
<div class="app">
<header class="nav glass">
  <a class="logo" href="#dash" data-go="dash" aria-label="Cadence, Beyond One"><img src="${MARK}" alt=""><span class="word">CADENCE</span></a>
  <nav class="links" aria-label="Pages"><span class="ind" aria-hidden="true"></span><a href="#dash" data-go="dash" class="rip" aria-current="page">Dashboard</a><a href="#emails" data-go="emails" class="rip">Emails</a><a href="#team" data-go="team" class="rip">Team</a><a href="#results" data-go="results" class="rip">Results</a></nav>
  <div class="tools"><button class="search" type="button">${ic('search', 17)}<span>Search</span><kbd>Ctrl K</kbd></button>
  <button class="round rf rip" type="button" aria-label="Refresh data">${ic('refresh', 18)}</button><button class="round rip" type="button" aria-label="Notifications, 1 new" style="position:relative">${ic('bell', 18)}<span class="badge">1</span></button>
  <button class="me" type="button" aria-label="Noura B., your account">NB</button></div>
</header>
<nav class="pagerow" aria-label="Pages"><a href="#dash" data-go="dash" aria-current="page">Dashboard</a><a href="#emails" data-go="emails">Emails</a><a href="#team" data-go="team">Team</a><a href="#results" data-go="results">Results</a></nav>
<main>
<!-- Dashboard -->
<section class="page" id="p-dash" aria-label="Dashboard">
<div class="top">
  <section class="heroWrap reveal" aria-label="September 2026">
    <div class="hero glass" id="hero">${wall()}<div class="shade"></div>
      <svg class="heroRim" id="heroRim" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient></defs><path fill="none" stroke="url(#rg)" stroke-width="1.5"/></svg>
      <div class="copy"><p class="eyebrow">Good afternoon, Noura · Thursday 12 November</p>
        <h1 class="bt">September,<br>almost closed.</h1>
        <p class="sub">3 of 5 steps done. Next: the final deduction and absences email, due Sunday 15 November.</p>
        <div class="acts"><a class="cta rip" href="#emails" data-go="emails">Continue ${ic('play', 12)}</a><a class="link" href="#steps">See every step</a></div></div>
      <p class="micro">164 agents · by team · brighter is better adherence</p>
      <div class="imp glass"><div class="thumb">${ic('sheet', 22)}</div><div><small>Latest import</small><strong>Genesys exports, 6 files</strong><span>Today, 09:40</span></div><a class="go rip" href="#import" aria-label="Open the latest import">${ic('chev', 18)}</a></div>
    </div>
    <div class="tabs" id="tabs" role="tablist" aria-label="Month"><button class="tab glass rip" role="tab" aria-selected="false">Jul<span class="long">&nbsp;2026</span></button><button class="tab glass rip" role="tab" aria-selected="false">Aug<span class="long">&nbsp;2026</span></button><button class="tab rip" role="tab" aria-selected="true"><span class="dot"></span>Sep<span class="long">&nbsp;2026</span></button></div>
  </section>
  <div class="cards">
    <article class="card c1 glass lift reveal"><div class="pic">${emailsArt({ brand: true })}</div><div class="txt"><span class="k">Daily brand emails</span><h2>4 made today,<br><b>ready to send</b></h2>
      <a class="slide" href="#emails" data-go="emails" aria-label="Open the daily brand emails"><i>${ic('mail', 16)}</i><em>›››</em><i>${ic('check', 16)}</i></a></div></article>
    <article class="card c2 glass lift reveal"><span class="big num" data-n="92.7" data-dec="1" data-suf="%">92.7%</span><p>Adherence, 164 agents. 0.4 pts better than August.</p><a class="disc" href="#adherence" aria-label="Open adherence">${ic('arrow', 16)}</a><div class="stripes">${adhBars({ brand: true })}</div></article>
    <article class="card c3 glass lift reveal">${teamArt({ brand: true })}<span class="chip">3 need attention</span><a class="view rip" href="#team" data-go="team">View</a></article>
  </div>
</div>
<div class="head reveal"><h2>The month in numbers</h2><span>September 2026 · against August</span></div>
<div class="grid">
  <article class="panel chart glass span2 reveal"><div class="ch"><div><h3>Calls offered</h3><p class="ps" id="cnote">${RANGES['30D'].note}</p></div>
    <span class="vs"><i></i>August</span><div class="seg" role="group" aria-label="Range"><span class="sind" aria-hidden="true"></span><button type="button" data-r="6M" aria-pressed="false">6M</button><button type="button" data-r="30D" aria-pressed="true">30D</button><button type="button" data-r="7D" aria-pressed="false">7D</button></div></div>
    <svg class="plot" id="plot" viewBox="0 0 720 240" aria-label="Calls offered each day of September, with August dashed"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d9be0" stop-opacity=".35"/><stop offset="1" stop-color="#3d9be0" stop-opacity="0"/></linearGradient></defs>
    <g id="grid"></g><path id="area" fill="url(#ar)"/><path id="prev" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.6" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/><path id="line" fill="none" stroke="#4aa3ff" stroke-width="2.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/><g id="xl"></g></svg></article>
  <article class="panel glass reveal" id="steps"><h3>Month close</h3><p class="ps">5 steps, 3 done</p>
    <div class="ring"><svg viewBox="0 0 124 124" aria-hidden="true"><circle cx="62" cy="62" r="50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/><circle id="ringv" cx="62" cy="62" r="50" fill="none" stroke="#4aa3ff" stroke-width="10" stroke-linecap="round" stroke-dasharray="314.16" stroke-dashoffset="125.66" transform="rotate(-90 62 62)"/>
      <text x="62" y="60" text-anchor="middle" class="rv" fill="#fff" font-size="24" font-family="Poppins">3/5</text><text x="62" y="80" text-anchor="middle" fill="rgba(243,245,250,.5)" font-size="11" font-family="Poppins">steps done</text></svg>
    <ul>${STEPS.map(([s, w, d]) => `<li><span>${s}</span><b>${d ? 'Done' : w.replace('Due ', '')}</b></li>`).slice(2).join('')}</ul></div></article>
  ${KPIS.filter(k => ['Absent days', 'Deduction minutes', 'Final %'].includes(k[0])).map(([l, v, d, c, t]) => {
    const n = parseFloat(v.replace(/,/g, '')), dec = /\./.test(v) ? 1 : 0, suf = /%/.test(v) ? '%' : '';
    return `<article class="kpi glass lift reveal"><span class="lab">${l}</span><span class="val num" data-n="${n}" data-dec="${dec}" data-suf="${suf}">${v}</span><span class="dl"><b class="${c}">${d}</b>${t}</span></article>`;
  }).join('')}
  <article class="panel glass span2 reveal"><h3>Needs attention</h3><p class="ps">September · lowest first</p>${ATTN.map(([n, t, k, v]) => `<div class="row"><span class="av">${n.split(' ').map(w => w[0]).join('')}</span><span class="who">${n}<small>${t} · ${k}</small></span><span class="v num">${v}</span></div>`).join('')}</article>
  <article class="panel glass reveal"><h3>Where the calls came from</h3><p class="ps">September · ${fmt(S)} calls</p>
    <div class="split" aria-hidden="true"><i style="width:46%;background:#e0242a"></i><i style="width:24%;background:#25b3bd"></i><i style="width:18%;background:#5b7fc0"></i><i style="width:12%;background:#16a08f"></i></div>
    <ul class="leg">${[['#e0242a', 'Virgin Mobile', '46%'], ['#25b3bd', 'FRiENDi mobile', '24%'], ['#5b7fc0', 'Virgin Postpaid', '18%'], ['#16a08f', 'FRiENDi PAY', '12%']].map(([c, n, p]) => `<li><span class="sq" style="background:${c}"></span><span>${n}</span><b class="num">${p}</b></li>`).join('')}</ul></article>
</div>
</section>
<!-- Emails -->
<section class="page" id="p-emails" aria-label="Emails" hidden>
  <div class="phead reveal"><div><h2 class="bt">Daily brand emails</h2><p>The four emails the analysts made for Thursday 12 November. Drag one to Sent once it has gone.</p></div>
    <button class="btn rip" type="button">${ic('refresh', 16)}History</button><button class="btn blue rip" type="button">${ic('mail', 16)}Copy for Outlook</button></div>
  <div class="utabs reveal" role="tablist"><span class="uind" aria-hidden="true"></span><button role="tab" aria-selected="true">Board</button><button role="tab" aria-selected="false">List</button><button role="tab" aria-selected="false">History<span class="n">31</span></button></div>
  <div class="chips reveal" role="group" aria-label="Filter"><button aria-pressed="true">All<b>4</b></button><button aria-pressed="false">To check<b>1</b></button><button aria-pressed="false">Ready<b>2</b></button><button aria-pressed="false">Sent<b>1</b></button></div>
  <div class="board" id="board">
    ${lane('check', 'To check', 'Warnings to look at first', '#ffbb6b', ['fp'])}
    ${lane('ready', 'Ready to send', 'Checked, waiting for Outlook', '#4aa3ff', ['vm', 'vp'])}
    ${lane('sent', 'Sent', 'Marked as sent today', '#6fe0b4', ['fm'])}
  </div>
</section>
<!-- Team -->
<section class="page" id="p-team" aria-label="Team" hidden>
  <div class="phead reveal"><div><h2 class="bt">Team</h2><p>164 agents · September 2026. The three who need attention come first.</p></div>
    <button class="btn rip" type="button">${ic('sheet', 16)}Export</button><button class="btn blue rip" type="button">${ic('plus', 16)}Add agent</button></div>
  <div class="utabs reveal" role="tablist"><span class="uind" aria-hidden="true"></span><button role="tab" aria-selected="true">Agents<span class="n">164</span></button><button role="tab" aria-selected="false">Supervisors<span class="n">12</span></button><button role="tab" aria-selected="false">One-to-ones</button></div>
  <div class="chips reveal" role="group" aria-label="Team"><button aria-pressed="true">All<b>164</b></button><button aria-pressed="false">CC<b>96</b></button><button aria-pressed="false">SM<b>30</b></button><button aria-pressed="false">CT<b>22</b></button><button aria-pressed="false">QA<b>8</b></button><button aria-pressed="false">Needs attention<b>3</b></button></div>
  <div class="tablewrap glass reveal"><table><thead><tr><th>Agent</th><th class="num">Adherence</th><th class="num hide-s">Absent days</th><th class="num hide-s">Late min</th><th class="num">Final %</th><th>Status</th></tr></thead>
  <tbody>${TEAM.map(trow).join('')}</tbody></table></div>
</section>
<p class="foot">Sample with made-up data · B · Glass</p>
</main>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"><span class="tick">${ic('check', 16)}</span><span id="tmsg"></span><button type="button" id="tundo" hidden>Undo</button></div>
<script id="vendor-motion">${GSAP}</script>
<script>
const RANGES = ${JSON.stringify(RANGES)};
${clientJs.toString().replace(/^function clientJs\(\) \{|\}$/g, '')}
</script>
</body></html>`;

// the page's own script (written as a function so it reads as code; its body goes into the page)
function clientJs() {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const G = window.gsap, RM = matchMedia('(prefers-reduced-motion: reduce)').matches, FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const anim = !!G && !RM;
  document.documentElement.classList.add('js');
  let cur = 'dash';

  // -- the sliding nav pill, the sliding tab underlines and range thumb
  const slideTo = (ind, el) => { if (ind && el) { ind.style.left = el.offsetLeft + 'px'; ind.style.width = el.offsetWidth + 'px'; } };
  const navTo = name => {
    $$('[data-go]').forEach(a => { if (a.closest('.links,.pagerow')) a.toggleAttribute('aria-current', a.dataset.go === name); });
    slideTo($('.ind'), $(`.links [data-go="${name}"]`));
  };
  const lines = () => { $$('.utabs').forEach(t => slideTo($('.uind', t), $('[aria-selected="true"]', t))); slideTo($('.sind'), $('.seg [aria-pressed="true"]')); };

  // -- a ripple where you click
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.rip'); if (!el || !anim) return;
    const r = el.getBoundingClientRect(), s = document.createElement('span'); s.className = 'ripple';
    s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px'; el.append(s); setTimeout(() => s.remove(), 700);
  });

  // -- the headline panel's notch (the glass is cut around the month tabs) and its rim
  const hero = $('#hero'), tabs = $('#tabs');
  const notch = () => {
    if (!hero || !tabs || !hero.offsetWidth) return;
    const w = hero.offsetWidth, h = hero.offsetHeight, r = 22, nw = tabs.offsetWidth + 10, nh = tabs.offsetHeight + 10;
    const d = `M${r},0 H${w - nw - r} A${r},${r} 0 0 1 ${w - nw},${r} V${nh - r} A${r},${r} 0 0 0 ${w - nw + r},${nh} H${w - r} A${r},${r} 0 0 1 ${w},${nh + r} V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`;
    hero.style.clipPath = `path('${d}')`; const rim = $('#heroRim'); rim.setAttribute('viewBox', `0 0 ${w} ${h}`); $('path', rim).setAttribute('d', d);
  };
  let redraw = () => {};
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { notch(); lines(); slideTo($('.ind'), $('.links [aria-current]')); redraw(); }); [document.body, hero, tabs].forEach(el => el && ro.observe(el)); }

  // -- numbers count up
  const fmtN = (v, dec, suf) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  const counts = root => $$('[data-n]', root).forEach(el => {
    const to = +el.dataset.n, dec = +(el.dataset.dec || 0), suf = el.dataset.suf || '';
    if (!anim) { el.textContent = fmtN(to, dec, suf); return; }
    const o = { v: 0 }; G.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = fmtN(o.v, dec, suf); } });
  });

  // -- the chart: drawn from the data, draws itself, reshapes when the range changes
  const plot = $('#plot'), H = 240; let W = 720; const PAD = { l: 44, r: 8, t: 14, b: 26 }, N = 48;
  const dims = () => { const w = Math.round(plot.getBoundingClientRect().width); if (w > 100) { W = w; plot.setAttribute('viewBox', `0 0 ${W} ${H}`); } };
  const resample = a => Array.from({ length: N }, (_, i) => { const x = i * (a.length - 1) / (N - 1), k = Math.floor(x), f = x - k; return a[k] + ((a[Math.min(k + 1, a.length - 1)] - a[k]) * f); });
  const smoothD = pts => { let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
  const state = k => { const R = RANGES[k], all = R.cur.concat(R.prev), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * .15; return { cur: resample(R.cur), prev: resample(R.prev), lo: lo - pad, hi: hi + pad, labels: R.labels }; };
  const toPts = (a, lo, hi) => a.map((v, i) => [PAD.l + i * (W - PAD.l - PAD.r) / (N - 1), PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)]);
  const short = v => v >= 1e3 ? (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'k' : Math.round(v);
  const draw = s => {
    dims();
    const c = toPts(s.cur, s.lo, s.hi), p = toPts(s.prev, s.lo, s.hi), dl = smoothD(c);
    $('#line').setAttribute('d', dl); $('#prev').setAttribute('d', smoothD(p)); $('#area').setAttribute('d', `${dl}L${W - PAD.r},${H - PAD.b}L${PAD.l},${H - PAD.b}Z`);
    $('#grid').innerHTML = [0, 1, 2, 3].map(i => { const y = PAD.t + i * (H - PAD.t - PAD.b) / 3, v = s.hi - i * (s.hi - s.lo) / 3;
      return `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.06)"/><text x="0" y="${y + 4}">${short(v)}</text>`; }).join('');
    $('#xl').innerHTML = s.labels.map((l, i) => `<text x="${PAD.l + i * (W - PAD.l - PAD.r) / (s.labels.length - 1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === s.labels.length - 1 ? 'end' : 'middle'}">${l}</text>`).join('');
  };
  let now = state('30D'); if (plot) draw(now);
  redraw = () => { if (plot && plot.getBoundingClientRect().width) draw(now); };
  const drawIn = () => {
    if (!plot || !anim) return; const ln = $('#line'), L = ln.getTotalLength();
    G.fromTo(ln, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', onComplete: () => { ln.style.strokeDasharray = ''; ln.style.strokeDashoffset = ''; } });
    G.fromTo('#area', { opacity: 0 }, { opacity: 1, duration: 1, delay: .7 }); G.fromTo('#prev', { opacity: 0 }, { opacity: 1, duration: .8, delay: 1 });
  };
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    $$('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); slideTo($('.sind'), b);
    const to = state(b.dataset.r); $('#cnote').textContent = RANGES[b.dataset.r].note;
    if (!anim) { draw(now = to); return; }
    const from = now, o = { t: 0 };
    G.to(o, { t: 1, duration: .9, ease: 'power3.inOut', onUpdate: () => { const t = o.t, mix = (a, b2) => a.map((v, i) => v + (b2[i] - v) * t);
      draw({ cur: mix(from.cur, to.cur), prev: mix(from.prev, to.prev), lo: from.lo + (to.lo - from.lo) * t, hi: from.hi + (to.hi - from.hi) * t, labels: t < .5 ? from.labels : to.labels }); }, onComplete: () => { now = to; } });
  }));

  // -- the ring and the bars fill, the brand split grows
  const fills = root => {
    if (!anim) return;
    const ring = $('#ringv', root); if (ring) G.fromTo(ring, { strokeDashoffset: 314.16 }, { strokeDashoffset: 125.66, duration: 1.5, ease: 'power3.out', delay: .3 });
    G.fromTo($$('.bars rect', root), { scaleY: 0 }, { scaleY: 1, duration: .9, ease: 'back.out(1.6)', stagger: .07, delay: .4 });
    G.fromTo($$('.split i', root), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power3.out', stagger: .08, delay: .5 });
  };

  // -- the headline words come in one by one, out of a blur
  const words = root => $$('.bt', root).forEach(h => {
    if (!h.dataset.split) { h.dataset.split = 1; h.innerHTML = h.innerHTML.split(/(<br>)/).map(p => p === '<br>' ? p : p.split(/\s+/).filter(Boolean).map(w => `<span class="w">${w}</span>`).join(' ')).join(''); }
    if (anim) G.fromTo($$('.w', h), { opacity: 0, y: 40, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out', stagger: .09, delay: .15, clearProps: 'filter' });
  });

  // -- a page comes in: its blocks one after another, its rows, its numbers and charts
  const enter = (p, first) => {
    words(p); counts(p); fills(p); lines();
    if (!anim) return;
    G.fromTo($$('.reveal', p), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .07, delay: first ? .35 : 0, clearProps: 'transform' });
    G.fromTo($$('.trow,.ecard', p), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .55, ease: 'power2.out', stagger: .045, delay: .35, clearProps: 'transform,opacity' });
    if (p.id === 'p-dash') drawIn();
  };
  const go = name => {
    if (name === 'results') { toast('Results is not part of this sample.'); return; }
    if (!$('#p-' + name) || name === cur) return;
    const from = $('#p-' + cur), to = $('#p-' + name); cur = name;
    document.body.dataset.page = name; navTo(name); history.replaceState(null, '', '#' + name);
    const swap = () => { from.hidden = true; to.hidden = false; window.scrollTo(0, 0); notch(); enter(to); };
    if (!anim) { swap(); return; }
    G.to($$('.reveal', from), { opacity: 0, y: -14, filter: 'blur(6px)', duration: .3, ease: 'power2.in', stagger: .02, onComplete: () => { G.set($$('.reveal', from), { clearProps: 'opacity,transform,filter' }); swap(); } });
  };
  document.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); go(a.dataset.go); } });

  // -- tabs and chips answer (in the sample they only show the choice)
  document.addEventListener('click', e => {
    const t = e.target.closest('.utabs [role="tab"],#tabs [role="tab"]');
    if (t) { $$('[role="tab"]', t.parentElement).forEach(x => x.setAttribute('aria-selected', String(x === t))); lines(); }
    const c = e.target.closest('.chips button'); if (c) $$('button', c.parentElement).forEach(x => x.setAttribute('aria-pressed', String(x === c)));
  });

  // -- the light follows the pointer on glass, and the spheres drift with it (depth)
  if (FINE && anim) {
    let raf = 0, ev = null; const orbs = $('.orbs');
    addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(() => { raf = 0;
      orbs.style.setProperty('--px', (ev.clientX / innerWidth - .5).toFixed(3)); orbs.style.setProperty('--py', (ev.clientY / innerHeight - .5).toFixed(3));
      const g = ev.target.closest && ev.target.closest('.glass'); if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); g.style.setProperty('--my', (ev.clientY - r.top) + 'px'); } }); }, { passive: true });
  }

  // -- the toast, with Undo
  let tT = 0, undoFn = null;
  function toast(msg, undo) {
    const t = $('#toast'); $('#tmsg').textContent = msg; undoFn = undo || null; $('#tundo').hidden = !undo; t.classList.add('on'); clearTimeout(tT);
    if (anim) G.fromTo(t, { y: 40, opacity: 0, scale: .94 }, { y: 0, opacity: 1, scale: 1, duration: .5, ease: 'back.out(1.8)' });
    tT = setTimeout(() => { if (anim) G.to(t, { y: 30, opacity: 0, duration: .3, onComplete: () => t.classList.remove('on') }); else t.classList.remove('on'); }, 4200);
  }
  $('#tundo').addEventListener('click', () => { if (undoFn) undoFn(); undoFn = null; $('#tundo').hidden = true; $('#tmsg').textContent = 'Put back.'; });

  // -- the Emails board: drag a card to another lane (a ghost lifts and tilts), or move it with the arrow keys
  const board = $('#board'), laneOf = c => c.closest('.lane'), names = { check: 'to check', ready: 'ready to send', sent: 'marked as sent' };
  const recount = () => $$('.lane', board).forEach(l => { $('.n', l).textContent = $$('.ecard', l).length; });
  const moveTo = (card, toLane, fromLane) => {
    $('.cards', toLane).prepend(card); recount();
    const name = $('.eh b', card).textContent;
    toast(`${name} · ${names[toLane.dataset.lane]}`, () => { $('.cards', fromLane).prepend(card); recount(); if (anim) G.fromTo(card, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: .4, clearProps: 'transform' }); card.focus(); });
  };
  let drag = null;
  board.addEventListener('pointerdown', e => {
    const card = e.target.closest('.ecard'); if (!card || e.button !== 0 || e.target.closest('button')) return;
    drag = { card, x0: e.clientX, y0: e.clientY, r: card.getBoundingClientRect(), from: laneOf(card), on: false }; card.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on) {
      if (Math.hypot(dx, dy) < 6) return;
      drag.on = true; const g = drag.card.cloneNode(true); g.classList.add('ghost'); g.removeAttribute('tabindex');
      Object.assign(g.style, { left: drag.r.left + 'px', top: drag.r.top + 'px', width: drag.r.width + 'px', height: drag.r.height + 'px' });
      document.body.append(g); drag.ghost = g; drag.card.classList.add('placeholder'); board.classList.add('dragging');
      if (anim) G.fromTo(g, { scale: 1, rotation: 0 }, { scale: 1.04, rotation: -2, duration: .25, ease: 'back.out(2)' }); else g.style.transform = 'scale(1.04) rotate(-2deg)';
    }
    if (anim) G.set(drag.ghost, { x: dx, y: dy }); else drag.ghost.style.translate = `${dx}px ${dy}px`;
    const el = document.elementFromPoint(e.clientX, e.clientY), over = el && el.closest('.lane');
    $$('.lane', board).forEach(l => l.classList.toggle('over', l === over && l !== drag.from)); drag.over = over;
  });
  const endDrag = () => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.on) return;
    $$('.lane', board).forEach(l => l.classList.remove('over'));
    const done = () => { d.ghost.remove(); d.card.classList.remove('placeholder'); board.classList.remove('dragging'); };
    if (d.over && d.over !== d.from) {
      moveTo(d.card, d.over, d.from); const nr = d.card.getBoundingClientRect();
      if (anim) G.to(d.ghost, { x: nr.left - d.r.left, y: nr.top - d.r.top, scale: 1, rotation: 0, duration: .35, ease: 'power3.out', onComplete: done }); else done();
    } else if (anim) G.to(d.ghost, { x: 0, y: 0, scale: 1, rotation: 0, duration: .3, ease: 'power3.out', onComplete: done }); else done();
  };
  board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
  board.addEventListener('keydown', e => {
    const card = e.target.closest('.ecard'); if (!card || !/^Arrow(Left|Right)$/.test(e.key)) return;
    const lanes = $$('.lane', board), i = lanes.indexOf(laneOf(card)), j = i + (e.key === 'ArrowRight' ? 1 : -1);
    if (j < 0 || j >= lanes.length) return; e.preventDefault(); moveTo(card, lanes[j], lanes[i]); card.focus();
  });

  // -- the first visit: the spheres rise, the nav drops in, the page comes in
  const start = (location.hash || '#dash').slice(1);
  if (start !== 'dash' && $('#p-' + start)) { $('#p-dash').hidden = true; $('#p-' + start).hidden = false; cur = start; document.body.dataset.page = start; }
  navTo(cur); notch();
  if (anim) { G.fromTo('.nav', { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', clearProps: 'transform' }); }
  enter($('#p-' + cur), true);
}

fs.writeFileSync(path.join(__dirname, 'B-glass.html'), html);
console.log('B-glass.html', Math.round(fs.statSync(path.join(__dirname, 'B-glass.html')).size / 1024) + ' KB');
