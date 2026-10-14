// Synthetic Genesys exports for September 2026 (made-up people from test/fixture.js plus two names not on the roster),
// so the Build flow can be exercised end to end in the visual test. Usage: node test/exports.cjs <outDir>
const fs = require('node:fs'), path = require('node:path');
require('./fixture.js');
const F = globalThis.__FIX__, out = process.argv[2] || 'test/exports'; fs.mkdirSync(out, { recursive: true });
let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const agents = F.roster.filter(p => p.team !== 'OP').slice(0, 40).map(p => p.name).concat(['Zaid Q.', 'Nour X.']);
const Y = 2026, M = 9, ND = 30, wd = d => new Date(Date.UTC(Y, M - 1, d)).getUTCDay();   // Fri, Sat off
const work = d => ![5, 6].includes(wd(d));
const dt = (d, h, m) => `${M}/${d}/${Y} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
const hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const csv = rows => rows.map(r => r.map(v => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n';
// Monthly Adherence: one column per day
fs.writeFileSync(path.join(out, 'Monthly Adherence - Sep.csv'), csv([['Agent Name', ...Array.from({ length: ND }, (_, i) => `${String(i + 1).padStart(2, '0')} | %PCT - Adherence`)],
  ...agents.map(n => [n, ...Array.from({ length: ND }, (_, i) => (work(i + 1) ? `${(86 + rnd() * 13).toFixed(2)}%` : ''))])]));
// Agent Performance Summary (AHT)
fs.writeFileSync(path.join(out, 'Agents Performance Summary.csv'), csv([['Interval Start', 'Interval End', 'Media Type', 'Agent Name', 'Avg Handle'],
  ...agents.map(n => [dt(1, 0, 0), dt(30, 23, 59), 'voice', n, hms(Math.round(140 + rnd() * 50))])]));
// Schedule and Agent Status Timeline
const sch = [['Agent Name', 'Activity Code Name', 'Start', 'End', 'Length In Minutes']], tl = [['Agent Name', 'Start Time', 'End Time', 'Primary Status', 'Duration', 'Interval Start']];
for (const n of agents) for (let d = 1; d <= ND; d++) {
  if (!work(d)) continue;
  for (const [code, h0, m0, len] of [['On Queue', 9, 0, 180], ['Break', 12, 0, 30], ['On Queue', 12, 30, 240], ['Meal', 16, 30, 30]]) {
    const end = h0 * 60 + m0 + len; sch.push([n, code, dt(d, h0, m0), dt(d, Math.floor(end / 60), end % 60), len]);
    if (rnd() < 0.04) continue;   // a missed segment now and then
    const late = Math.round(rnd() * 6), dur = (len - late) * 60;
    tl.push([n, dt(d, h0, m0 + late), '', code === 'On Queue' ? 'On Queue' : code, hms(dur), dt(1, 0, 0)]);
  }
}
fs.writeFileSync(path.join(out, 'Schedule activities.csv'), csv(sch));
fs.writeFileSync(path.join(out, 'Agent Status Timeline Details.csv'), csv(tl));
fs.writeFileSync(path.join(out, 'Book1.csv'), csv([['Something', 'Else'], ['1', '2']]));
console.log('wrote', fs.readdirSync(out).join(', '));
