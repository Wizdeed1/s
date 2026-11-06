#!/usr/bin/env python3
"""The demo file for the meeting: the tool itself (the normal build), opened as a made-up admin on a made-up month.

  python3 tools/meeting/make_demo.py out/mc.html "final/Meeting kit/05 Cadence - Demo.html"

Made-up people only (test/fixture.js: first names and an initial, made-up IDs), no shared folder, no sign-in, and nothing saved:
not in a folder and not in the browser (its storage is swapped for one that lives only while the page is open, so the demo never
changes the real tool's settings on that computer). The clock reads 8 October 2026 at the time of day it is, so the September
2026 close is under way as in the deck's screenshots. Every page, View as and the Showcase work as in the tool.
"""
import os, sys

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(os.path.dirname(here))
src, out = sys.argv[1], sys.argv[2]
page = open(src, encoding='utf-8').read()
fixture = open(os.path.join(root, 'test', 'fixture.js'), encoding='utf-8').read()
assert '</script' not in fixture.lower()

BOOT = r"""<script id="demoBoot">
/* The demo file: made-up people, no shared folder, no sign-in, nothing saved. Runs before anything else on the page. */
(function () {
  'use strict';
  // the clock: 8 October 2026 at the time of day it is (the September close under way, as in the deck)
  var RealDate = Date, now = new RealDate();
  var OFF = new RealDate(2026, 9, 8, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).getTime() - now.getTime();
  function DemoDate() {
    var a = Array.prototype.slice.call(arguments);
    if (!new.target) return new RealDate(RealDate.now() + OFF).toString();
    return a.length ? Reflect.construct(RealDate, a) : new RealDate(RealDate.now() + OFF);
  }
  DemoDate.prototype = RealDate.prototype; DemoDate.now = function () { return RealDate.now() + OFF; }; DemoDate.parse = RealDate.parse; DemoDate.UTC = RealDate.UTC;
  window.Date = DemoDate;
  // storage that lives only while the page is open: the real tool's settings on this computer are never touched
  function Mem(seed) {
    var m = new Map(Object.keys(seed || {}).map(function (k) { return [k, seed[k]]; }));
    return { get length() { return m.size; }, key: function (i) { var k = Array.from(m.keys())[i]; return k === undefined ? null : k; },
      getItem: function (k) { k = String(k); return m.has(k) ? m.get(k) : null; }, setItem: function (k, v) { m.set(String(k), String(v)); },
      removeItem: function (k) { m.delete(String(k)); }, clear: function () { m.clear(); } };
  }
  var ls = Mem({ 'mc-theme': 'light' }), ss = Mem();   // light by default: projectors show dark pages grey
  Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return ls; } });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: function () { return ss; } });
  Object.defineProperty(window, 'indexedDB', { configurable: true, get: function () { return undefined; } });
  // the made-up people and months, and the made-up admin who opens the page
  window.__NOLOCK__ = true; window.__NOFOLDER__ = true;
  window.__mcUser = { id: 'demo-admin', name: 'Admin', username: 'admin', role: 'admin' };
%FIXTURE%
  window.__ROSTER__ = window.__FIX__.roster;
  window.__DEMO__ = {
    /** an agent's own page (View as an agent): their made-up months; the latest is a draft, the ones before it final */
    me: function (pid) {
      var M = window.__mc, st = (M && M.state) || {}, rows = st.roster || [], hist = st.history || window.__FIX__.history;
      var per = rows.find(function (r) { return r._id === pid; });
      var empty = { pid: pid, prof: null, months: {}, forms: {}, sigs: {}, objs: {}, replies: {} };
      if (!per) return Object.assign(empty, { err: 'This person has no page in the demo.' });
      var spv = rows.find(function (r) { return r._id === per.spv; }), keys = Object.keys(hist).sort(), last = keys[keys.length - 1], months = {};
      keys.forEach(function (k) { var r = (hist[k].rows || []).find(function (x) { return x.id === per.nid; }); if (r) months[k] = { status: k === last ? 'draft' : 'final', row: r, at: k + '-28T09:00:00Z', by: 'WFM team' }; });
      return Object.assign(empty, { prof: { name: per.name, brand: per.brand, team: per.team, nid: per.nid, spvName: spv ? spv.name : '' }, months: months });
    },
  };
})();
</script>
<style id="demoStyle">
.demopill { position: fixed; right: 14px; bottom: 12px; z-index: 2147482000; padding: 4px 12px; border-radius: 999px; background: rgba(8, 8, 8, .8); color: #fff;
  font: 600 11px/1.5 Poppins, system-ui, sans-serif; letter-spacing: .04em; pointer-events: none; }
body.presenting .demopill, html.mczoom .demopill { display: none; }
[data-acct="out"] { display: none !important; }
@media print { .demopill { display: none; } }
</style>"""

START = r"""<script id="demoStart">
/* the demo's month: the made-up months (April to September 2026, August final), the September close under way */
(function () {
  'use strict';
  var n = 0;
  (function go() {
    var M = window.__mc;
    if (!M || !M.state || !M.state.rosterReady) { if (++n < 800) setTimeout(go, 25); return; }
    var F = window.__FIX__, S = M.state, done = { at: '2026-10-05T09:00:00Z', by: 'Noura B.' }, marks = {};
    // the days each row was counted with (22 scheduled, the days worked, the absences in one run), so a bonus can be explained;
    // every month before September is final, as it would be by now
    var keys = Object.keys(F.history).sort(), last = keys[keys.length - 1];
    keys.forEach(function (k) {
      (F.history[k].rows || []).forEach(function (r) { r.ks = 22; r.ka = r.kat = r.worked; r.kab = r.absent; r.kr = r.absent ? 1 : 0; });
      if (k !== last && !F.finals[k]) F.finals[k] = { y: +k.slice(0, 4), m: +k.slice(5), status: 'final', byName: 'Senior manager', at: k + '-28T12:00:00Z', rows: F.history[k].rows };
    });
    S.history = F.history; S.finals = F.finals; S.histVer++; S.finVer++; S.wsMonth = last;
    ['built', 'eval', 'shared', 'ready', 'objections'].forEach(function (s) { marks[s] = done; });
    S.calMarks = { '2026-09': { k: '2026-09', marks: marks } };
    // the quality team's numbers for each month, as the Final EVAL gives them (made up, steady for each person), and DRC-CSAT one for all
    var seed = 29, rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    var cap = function (x) { return Math.round(Math.max(0.7, Math.min(1, x)) * 10000) / 10000; };
    Object.keys(F.history).forEach(function (k, i) {
      var rows = {};
      (F.history[k].rows || []).forEach(function (r) {
        var p = S.roster.find(function (x) { return x.nid === r.id; }); if (!p) return;
        var base = 0.82 + (r.fin || 0.85) * 0.14, qa = cap(base + (rnd() - 0.5) * 0.04);
        rows[p._id] = { n: p.name, kpi: { qobs: qa, emp: cap(base + (rnd() - 0.4) * 0.06), fcr: cap(base + (rnd() - 0.45) * 0.06) }, eval: { callqa: qa }, crit: [], qv: 2 };
      });
      var y = +k.slice(0, 4), m = +k.slice(5), nk = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
      S.quality[k] = { csat: [0.86, 0.87, 0.85, 0.88, 0.89, 0.9][i % 6], rows: rows, src: 'Final EVAL - ' + k + '.xlsx', by: 'Quality team', at: nk + '-03T10:00:00Z' };
    });
    S.qualityVer++;
    M.setWs('dash');
    var pill = document.createElement('div'); pill.className = 'demopill'; pill.setAttribute('role', 'note');
    pill.textContent = 'Demo · made-up people · nothing is saved'; document.body.appendChild(pill);
  })();
})();
</script>
"""

boot = BOOT.replace('%FIXTURE%', fixture.strip())
csp_end = page.index('</script>', page.index('<script id="cspBoot">')) + len('</script>')
page = page[:csp_end] + '\n' + boot + page[csp_end:]
page = page.replace('<title>Cadence</title>', '<title>Cadence · Demo</title>', 1)
end = page.rindex('<i id="mcEnd" hidden></i>')
page = page[:end] + START + page[end:]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(page)
print(f'{out}: {len(page.encode("utf-8")) // 1024} KB')
