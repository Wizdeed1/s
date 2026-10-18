// Checks that need only Node (no browser): the pure modules load, the incentive formula and the code tidying behave as the
// user guide says, and the built page (when `npm run build` made it) is one self-contained file. Synthetic values only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = p => path.join(__dirname, '..', 'js', p);

const Core = require(js('core.js'));
const Kpi = require(js('kpi.js'));
const Att = require(js('attendance.js'));
const History = require(js('history.js'));
const Writer2 = require(js('writer2.js'));
const WriterInc = require(js('writer_inc.js'));
const Glue = require(js('glue.js'));
const Forms = require(js('forms.js'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

ok('modules load', () => { for (const m of [Core, Kpi, Att, History, Writer2, WriterInc, Glue, Forms]) assert.equal(typeof m, 'object'); });

ok('built-in scorecards are valid', () => assert.deepEqual(Kpi.validate(Kpi.DEFAULTS()), []));

ok('earned = base x actual/scheduled x final %, rounded (guide: 22 / 18 at 87% -> 712)', () => {
  const card = { kpis: [
    { id: 'a', name: 'A', src: 'file', unit: 'pct', dir: 'high', weight: 0.35, bands: [0.95, 0.9, 0.85, 0.8] },
    { id: 'b', name: 'B', src: 'file', unit: 'pct', dir: 'high', weight: 0.65, bands: [0.95, 0.9, 0.85, 0.8] },
  ] };
  const r = Kpi.score(card, { file: { a: 0.97, b: 0.91 } }, { sched: 22, actual: 18 }, 1000);
  assert.equal(r.finalRank, 4.35);
  assert.ok(Math.abs(r.finalPct - 0.87) < 1e-12);
  assert.equal(r.earned, 712);
  assert.equal(r.target, 818);
});

ok('a KPI with no value is left out and the other weights scale up', () => {
  const card = Kpi.DEFAULTS().teams.CC;
  const r = Kpi.score(card, { adh: 0.97, aht: 140, tardy: 0, file: { csat: 0.9, qobs: 0.96 } }, { sched: 20, actual: 20 }, 1000);
  assert.equal(r.finalRank, 5);
  assert.deepEqual(r.missing.sort(), ['Call Reason & FCR Accuracy', 'Empowerment Utilization']);
});

ok('day codes are tidied whatever the spelling', () => {
  assert.equal(Att.normCode('SL ').v, 'SL');
  assert.equal(Att.normCode('Al').v, 'AL');
  assert.equal(Att.normCode('AL leave').v, 'AL');
  assert.equal(Att.normCode('SL leaves').v, 'SL');
});

ok('names compare without spaces or case', () => {
  assert.equal(Core.normName('  Lina  SALEH '), Core.normName('lina saleh'));
  assert.equal(Core.nameScore('Lina Ahmed Saleh', 'Lina Saleh') >= 0.86, true);
});

const built = path.join(__dirname, '..', 'out', 'mc.html');
if (fs.existsSync(built)) ok('the built page is one self-contained file', () => {
  const html = fs.readFileSync(built, 'utf8');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<i id="mcEnd" hidden></i>'));
  assert.ok(!/<script[^>]+src=/i.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href="https?:/i.test(html), 'no external stylesheets');
  assert.ok(Buffer.byteLength(html) < 16 * 1024 * 1024);
});

console.log(`${n} checks passed`);
