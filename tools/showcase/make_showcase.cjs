// The stand-alone Showcase: the bonus story (js/showstory.js) in one HTML file that opens anywhere, offline, with made-up numbers only.
// It carries the tool's own look (js/fonts.css and js/ui6/*.css), the browser's no-network rule (js/csp_boot.html), Light or Dark before
// the first paint (js/theme_boot.html), the icons, the tool's counting engine (js/core.js, js/kpi.js), the motion (vendor/gsap.min.js)
// and the line figures (vendor/hairline.js, wrapped as the tool wraps it). Usage: node tools/showcase/make_showcase.cjs [out.html]
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..', '..'), R = p => fs.readFileSync(path.join(root, p), 'utf8');
const out = path.resolve(process.argv[2] || path.join(root, 'final', 'Cadence - Showcase.html'));
const css = [R('js/fonts.css'), ...fs.readdirSync(path.join(root, 'js', 'ui6')).filter(f => f.endsWith('.css')).sort().map(f => R(`js/ui6/${f}`)), R('tools/showcase/page.css')].join('\n');
if (/<\/style/i.test(css)) throw new Error('a stylesheet closes the style element');
const sprite = (R('js/ui3_body.html').match(/<svg width="0" height="0"[\s\S]*?<\/svg>/) || [])[0];
if (!sprite) throw new Error('no icon sprite in js/ui3_body.html');
const hair = R('vendor/hairline.js').replace(/^export \{$/m, 'return {');
const js = { core: R('js/core.js'), kpi: R('js/kpi.js'), gsap: R('vendor/gsap.min.js'), story: R('js/showstory.js'), page: R('tools/showcase/page.js') };
for (const [k, v] of Object.entries({ ...js, hair })) if (/<\/script/i.test(v)) throw new Error(`${k} closes the script element`);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cadence · Every bonus, counted right</title>
<meta name="description" content="Cadence counts every Member Care bonus: the story, a made-up bonus counted step by step, and a bonus to try. Made-up numbers only; works offline.">
${R('js/csp_boot.html').trim()}
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7faff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1829">
<meta name="color-scheme" content="light dark">
${R('js/theme_boot.html').trim()}
<style>
${css}
</style>
</head>
<body>
${sprite}
<header class="shbar"><span class="shmark" aria-hidden="true"></span><span class="shname">Cadence<i>Member Care · Showcase</i></span><span class="sp"></span>
  <button type="button" class="btn ghost" id="shTheme" aria-pressed="false"><svg aria-hidden="true"><use href="#i-moon"/></svg><span class="t">Dark</span></button>
  <button type="button" class="btn primary" data-showpresent><svg aria-hidden="true"><use href="#i-present"/></svg><span class="t">Present</span></button></header>
<main class="shmain"><section class="view ws" id="v-show" aria-label="Showcase"><h1 class="sr" id="h-show">Cadence: every bonus, counted right</h1><div id="showBody"></div></section></main>
<script id="engine-core">
${js.core}
</script>
<script id="engine-kpi">
${js.kpi}
</script>
<script id="vendor-motion">
${js.gsap}
</script>
<script id="vendor-figures">
/*! @lucasmarkes/hairline 0.5.1 | MIT License | Copyright (c) 2026 Lucas Marques */
const Hairline = (() => { 'use strict';
${hair}
})();
</script>
<script id="show-story">
${js.story}
</script>
<script id="show-page">
${js.page}
</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(process.cwd(), out)}: ${Math.round(html.length / 1024)} KB`);
