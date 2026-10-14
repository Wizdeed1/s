/* Synthetic data for the visual tests: 12 supervisors and 164 agents with made-up first names and an initial, made-up
   10-digit IDs, six months of results (April to September 2026), August finalized. Nothing here is a real person. */
(function (root) {
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const FIRST = ['Lina', 'Omar', 'Sara', 'Yousef', 'Noura', 'Faisal', 'Huda', 'Khalid', 'Reem', 'Tariq', 'Maha', 'Saeed', 'Dana', 'Majed', 'Rana', 'Hassan', 'Layla', 'Bandar', 'Amal', 'Ziad',
    'Nada', 'Fahad', 'Hind', 'Waleed', 'Salma', 'Nasser', 'Ruba', 'Adel', 'Mona', 'Sultan', 'Jana', 'Talal', 'Abeer', 'Rayan', 'Lama', 'Turki', 'Ghada', 'Hamza', 'Afnan', 'Mazen'];
  const INI = 'ABCDEFGHIJKLMNOPRSTWZ';
  const UNITS = [['Virgin', 'CC', 70], ['Friendi', 'CC', 46], ['Virgin', 'SM', 22], ['Friendi Pay', 'CC', 18], ['Virgin', 'CT', 8]];
  const roster = [], used = new Set();
  const name = () => { for (;;) { const n = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${INI[Math.floor(rnd() * INI.length)]}.`; if (!used.has(n)) { used.add(n); return n; } } };
  const nid = () => '1' + String(Math.floor(rnd() * 1e9)).padStart(9, '0');
  for (let i = 0; i < 12; i++) roster.push({ name: name(), nid: nid(), brand: i < 7 ? 'Virgin' : i < 11 ? 'Friendi' : 'Friendi Pay', team: 'OP', status: 'Active', email: `spv${i + 1}@example.com` });
  const spvIdx = u => (u[0] === 'Virgin' ? (u[1] === 'CC' ? [0, 1, 2, 3, 4] : u[1] === 'SM' ? [5] : [6]) : u[0] === 'Friendi' ? [7, 8, 9, 10] : [11]);
  for (const u of UNITS) for (let j = 0; j < u[2]; j++) { const S = spvIdx(u); roster.push({ name: name(), nid: nid(), brand: u[0], team: u[1], status: rnd() < 0.03 ? 'Inactive' : 'Active', spv: 'p' + S[j % S.length] }); }
  const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const skill = roster.map(() => rnd());
  const history = {};
  months.forEach((k, mi) => {
    const rows = [];
    roster.forEach((p, i) => {
      if (p.team === 'OP') return;
      const s = skill[i], drift = (mi - 2.5) * 0.002, adh = Math.min(0.995, 0.86 + s * 0.12 + drift + (rnd() - 0.5) * 0.02);
      const aht = Math.round((p.team === 'SM' ? 190 : 150) + (1 - s) * 40 + (rnd() - 0.5) * 18), absent = rnd() < 0.18 ? Math.ceil(rnd() * 3) : 0, worked = 22 - absent - (rnd() < 0.2 ? 1 : 0);
      const fin = Math.min(1, 0.68 + s * 0.3 + (rnd() - 0.5) * 0.05), base = p.brand === 'Virgin' ? 1000 : 500, el = fin >= 0.8 && worked >= 5;
      rows.push({ id: p.nid, n: p.name, brand: p.brand, team: p.team, adh, adhUnder: Math.round((1 - adh) * 60), aht, worked, absent, tardy: rnd() < 0.3 ? Math.round(rnd() * 40) : 0, al: rnd() < 0.2 ? 1 : 0, sl: rnd() < 0.15 ? 1 : 0,
        ded: Math.round((1 - adh) * 900 + rnd() * 40), conf: Math.min(1, adh + 0.01), fin, earned: el ? Math.round(base * (worked / 22) * fin) : 0, wfExc: Math.round((1 - s) * 9 + rnd() * 3), ans: Math.round(600 + s * 400), hnd: Math.round(620 + s * 400) });
    });
    history[k] = { y: +k.slice(0, 4), m: +k.slice(5), rows, src: 'Synthetic test data', auto: true, tool: true, by: 'Test', at: `${k}-28T09:00:00Z` };
  });
  const finals = { '2026-08': { y: 2026, m: 8, status: 'final', byName: 'Senior manager (test)', at: '2026-09-10T12:00:00Z', rows: history['2026-08'].rows } };
  root.__FIX__ = { roster, history, finals, months };
})(typeof window !== 'undefined' ? window : globalThis);
