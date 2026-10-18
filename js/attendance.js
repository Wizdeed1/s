/* Attendance: merges supervisors' attendance files into one month, with safe automatic fixes,
   clash detection and cross-checks against the Genesys data. Pure functions, no DOM. */
const Att = ((C) => {
const { normSpace, normName } = C;

// ---------------------------------------------------------------- day codes
const CODES = [
  ['Attend', /^(attend|attended|attendance|present|p|att|work|working|w)$/],
  ['OFF', /^(off|day off|dayoff|off day|o|rest|rest day|weekend|w\/o|wo)$/],
  ['AL', /^(al|a\/l|al leave|al leaves|annual|annual leave|annual leaves|vacation)$/],
  ['SL', /^(sl|s\/l|sl leave|sl leaves|sick|sick leave|sick leaves)$/],
  ['Absent', /^(absent|absence|a|abs|no show|noshow|ns)$/],
  ['National Day', /^(national day|national day off|national day leave|national holiday|nd)$/],
  ['Founding Day', /^(founding day|founding day leave|founding day off)$/],
  ['Eid', /^(eid|eid leave|eid holiday|eid off|eid al fitr|eid al adha|eid holidays)$/],
  ['Unpaid', /^(unpaid|unpaid leave|upl|lwp)$/],
  ['Paternity', /^(paternity|paternity leave)$/],
  ['Compassionate Leave', /^(compassionate|compassionate leave|bereavement)$/],
  ['Marriage', /^(marriage|marriage leave)$/],
  ['Exam', /^(exam|exam leave|exams)$/],
  ['ML', /^(ml|maternity|maternity leave)$/],
];
const KNOWN = new Set(CODES.map(c => c[0]));
const WORKED = v => v === 'Attend' || typeof v === 'number';
const LEAVE = new Set(['AL', 'SL', 'National Day', 'Founding Day', 'Eid', 'Unpaid', 'Paternity', 'Compassionate Leave', 'Marriage', 'Exam', 'ML']);
/** raw cell -> { v, note } ; v: canonical code, tardy minutes (number), null (blank) or the raw text (unknown) */
function normCode(raw) {
  if (raw == null) return { v: null };
  if (raw instanceof Date) return { v: null, bad: 'a date' };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return { v: null, bad: String(raw) };
    if (raw === 0) return { v: 'Attend', fix: '0 → Attend' };
    return { v: Math.round(raw * 100) / 100 };
  }
  const s = normSpace(raw); if (!s) return { v: null };
  if (/^\d+(\.\d+)?$/.test(s)) { const n = +s; return n === 0 ? { v: 'Attend', fix: '"0" → Attend' } : { v: n, fix: 'number stored as text' }; }
  const l = s.toLowerCase();
  for (const [code, re] of CODES) if (re.test(l)) return s === code ? { v: code } : { v: code, fix: `"${s}" → ${code}` };
  return { v: s, unknown: true };
}

// ---------------------------------------------------------------- matching people to the roster
const akaList = p => (Array.isArray(p.aka) ? p.aka.filter(x => typeof x === 'string' && x) : []);   // the other spellings kept on a person (the name they had before)
function rosterIndex(roster) {
  const byNid = new Map(), byName = new Map();
  for (const p of roster) {
    const id = C.cleanId(p.nid); if (id && !byNid.has(id)) byNid.set(id, p);
    for (const n of [p.name, p.sys]) { const k = normName(n); if (k && !byName.has(k)) byName.set(k, p); }
  }
  for (const p of roster) for (const n of akaList(p)) { const k = normName(n); if (k && !byName.has(k)) byName.set(k, p); }   // spellings the person had before: after every current name
  return { byNid, byName, list: roster };
}
function matchPerson(row, ix, opts) {
  const lk = opts.links && opts.links.get(normName(row.name));
  if (lk) { const p = ix.list.find(x => x._id === lk); if (p) return { p, how: 'link' }; }
  const id = C.cleanId(row.idRaw || row.id);
  if (id && id.length >= 8 && ix.byNid.has(id)) return { p: ix.byNid.get(id), how: 'id' };
  if (opts.empId && id && opts.empId.has(id)) { const p = opts.empId.get(id); if (p) return { p, how: 'empid' }; }
  const k = normName(row.name);
  if (k && ix.byName.has(k)) return { p: ix.byName.get(k), how: 'name', idDiff: id && id.length >= 8 && C.cleanId(ix.byName.get(k).nid) && C.cleanId(ix.byName.get(k).nid) !== id ? id : null };
  if (id && id.length >= 8) {   // one wrong, missing or extra digit in the ID, and the first name agrees
    const first = normName(row.name).split(' ')[0];
    const near = ix.list.filter(p => { const n = C.cleanId(p.nid); return n && n.length >= 8 && lev(n, id) === 1 && normName(p.name).split(' ')[0] === first; });
    if (near.length === 1) return { p: near[0], how: 'idtypo', id };
  }
  if (!k) return null;
  let best = null, bs = 0, second = 0;
  for (const p of ix.list) {
    const sc = Math.max(C.nameScore(row.name, p.name), p.sys ? C.nameScore(row.name, p.sys) : 0, looseScore(row.name, p.name), ...akaList(p).map(a => C.nameScore(row.name, a)));
    if (sc > bs) { second = bs; bs = sc; best = p; } else if (sc > second) second = sc;
  }
  if (best && bs >= 0.75 && bs - second >= 0.1) return { p: best, how: 'fuzzy', score: bs };
  return null;
}
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
/** "Abdulla Nasweef VP" vs "Abdulla Nasweef": every roster token found in the file name (or the other way round). */
function looseScore(a, b) {
  const ta = normName(a).replace(/[^a-z\s]/g, '').split(' ').filter(t => t.length > 1), tb = normName(b).replace(/[^a-z\s]/g, '').split(' ').filter(t => t.length > 1);
  if (ta.length < 2 || tb.length < 2) return 0;
  const [s, l] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return s.every(t => l.includes(t)) && s[0] === l[0] ? 0.8 : 0;
}

// ---------------------------------------------------------------- merge
/**
 * dets: attendance detections ({kind:'attendance', sheet, data:{dates, people}, file})
 * roster: [{_id, name, nid, sys, brand, team, status}]
 * opts: { y, m, undo:Set(fixId), picks:Map(key -> value), empId: Map(empId -> roster person), adh, sched }
 */
function merge(dets, roster, opts) {
  const { y: Y, m: M } = opts, ND = C.daysIn(Y, M), undo = opts.undo || new Set(), picks = opts.picks || new Map();
  const ix = rosterIndex(roster.filter(p => normSpace(p.name)));
  const fixes = new Map(), warns = [], files = [], unmatched = [], clashes = [];
  const fix = (id, kind, text, n = 1, extra) => { const f = fixes.get(id) || { id, kind, text, count: 0, ...extra }; f.count += n; fixes.set(id, f); };
  const per = new Map();   // roster _id -> { p, cells: Array(ND) of [{v, src}], totals: [{n, src, dayTardy}], rows: [] }
  const slot = p => { if (!per.has(p._id)) per.set(p._id, { p, cells: Array.from({ length: ND }, () => []), totals: [], srcs: new Set() }); return per.get(p._id); };
  // 1 · choose the sheets for this month
  const used = [];
  for (const d of dets) {
    const ds = d.data.dates || [], inMonth = ds.filter(x => x.y === Y && x.m === M).length;
    const filled = d.data.people.filter(pp => pp.cells.some(([, v]) => v != null && normSpace(v) !== '')).length;
    const info = { file: d.file || '', sheet: d.sheet, people: d.data.people.length, filled, days: ds.length, inMonth };
    if (!inMonth) { info.used = false; info.reason = ds.length ? `dates are ${C.MON[ds[0].m - 1]} ${ds[0].y}` : 'no dates'; files.push(info); continue; }
    if (inMonth < ds.length) fix(`outside:${d.file}:${d.sheet}`, 'dates', `${d.file} · ${d.sheet}: ${ds.length - inMonth} day columns outside ${C.MON[M - 1]} ignored`, 1, { undoable: false });
    info.used = true; files.push(info); used.push(d);
  }
  const usedByFile = {}; for (const f of files) (usedByFile[f.file] = usedByFile[f.file] || []).push(f);
  for (const [fname, list] of Object.entries(usedByFile)) {
    const skipped = list.filter(f => !f.used);
    if (skipped.length && list.some(f => f.used)) fix(`tabs:${fname}`, 'tabs', `${fname}: used ${list.filter(f => f.used).map(f => f.sheet).join(', ')}; skipped ${skipped.length} tab${skipped.length > 1 ? 's' : ''} for other months`, 1, { undoable: false });
  }
  // 2 · rows -> roster people
  for (const d of used) {
    const src = `${d.file}${d.sheet && d.sheet !== d.file ? ' · ' + normSpace(d.sheet) : ''}`;
    for (const row of d.data.people) {
      const cells = row.cells.filter(([dt]) => dt.y === Y && dt.m === M && dt.d >= 1 && dt.d <= ND);
      const anyFilled = cells.some(([, v]) => v != null && normSpace(v) !== '');
      if (!anyFilled) continue;   // empty rows of a shared template
      const mt = matchPerson(row, ix, opts);
      const fuzzyId = mt && (mt.how === 'fuzzy' || mt.how === 'idtypo') ? `match:${normName(row.name)}=>${mt.p._id}` : null;
      if (!mt || (fuzzyId && undo.has(fuzzyId))) {
        unmatched.push({ name: row.name, idRaw: row.idRaw || '', team: row.team, dep: row.dep, src, filled: cells.filter(([, v]) => v != null && normSpace(v) !== '').length });
        continue;
      }
      if (fuzzyId) fix(fuzzyId, 'match', mt.how === 'idtypo'
        ? `"${row.name}" (${src}) matched to roster "${mt.p.name}": ID ${mt.id} looks like a typo of ${C.cleanId(mt.p.nid)}`
        : `"${row.name}" (${src}) matched to roster "${mt.p.name}"`, 1, { undoable: true });
      if (mt.idDiff) warns.push({ kind: 'id', pid: mt.p._id, text: `${mt.p.name}: ID ${mt.idDiff} in ${src} differs from the roster ID ${C.cleanId(mt.p.nid)}` });
      const S = slot(mt.p); S.srcs.add(src);
      { const fid = C.cleanId(row.idRaw || row.id); if (fid && fid.length >= 8 && !C.cleanId(mt.p.nid)) { (S.ids = S.ids || new Map()).set(fid, src); } }
      let dayTardy = 0;
      for (const [dt, raw] of cells) {
        const n = normCode(raw);
        if (n.bad) { warns.push({ kind: 'cell', pid: mt.p._id, text: `${mt.p.name}, ${dt.d} ${C.MON[M - 1]} in ${src}: ${n.bad} in a day cell was ignored` }); continue; }
        let v = n.v; if (v == null) continue;
        if (n.fix) { const fid = `code:${n.fix}`; if (undo.has(fid)) v = normSpace(raw); else fix(fid, 'code', n.fix, 1, { undoable: true }); }
        if (n.unknown) warns.push({ kind: 'code', code: v, pid: mt.p._id, text: `Unknown value "${v}" for ${mt.p.name} on ${dt.d} ${C.MON[M - 1]} (${src}); it counts as Other` });
        if (typeof v === 'number') dayTardy += v;
        S.cells[dt.d - 1].push({ v, src });
      }
      const tt = row.tardyTotal == null ? null : (typeof row.tardyTotal === 'number' ? row.tardyTotal : +normSpace(row.tardyTotal));
      if (tt != null && Number.isFinite(tt)) S.totals.push({ n: tt, src, dayTardy });
    }
  }
  // 3 · per person per day: fill gaps, resolve safe clashes, flag real ones
  const byPerson = new Map();
  const idFills = [];
  for (const [pid, S] of per) {
    const days = new Array(ND).fill(null);
    for (let i = 0; i < ND; i++) {
      const vals = S.cells[i]; if (!vals.length) continue;
      const distinct = [...new Map(vals.map(x => [String(x.v), x])).values()];
      if (distinct.length === 1) { days[i] = distinct[0].v; continue; }
      const key = `${pid}|${i + 1}`;
      const nums = distinct.filter(x => typeof x.v === 'number'), others = distinct.filter(x => typeof x.v !== 'number');
      const safe = nums.length === 1 && others.every(x => x.v === 'Attend');
      const fid = `clash:${key}`;
      if (safe && !undo.has(fid) && !picks.has(key)) { days[i] = nums[0].v; fix(fid, 'clash', `${S.p.name}, ${i + 1} ${C.MON[M - 1]}: "Attend" in one file and ${nums[0].v} tardy minutes in another → kept ${nums[0].v} min`, 1, { undoable: true }); continue; }
      const options = distinct.map(x => ({ v: x.v, src: vals.filter(y => String(y.v) === String(x.v)).map(y => y.src).join(', ') }));
      const chosen = picks.has(key) ? picks.get(key) : undefined;
      // until you choose: the value from the file where this person has the most days
      const home = [...S.srcs].sort((a, b) => S.cells.filter(c => c.some(x => x.src === b)).length - S.cells.filter(c => c.some(x => x.src === a)).length)[0];
      const fallback = (vals.find(x => x.src === home) || vals[0]).v;
      days[i] = chosen !== undefined ? chosen : fallback;
      clashes.push({ key, pid, name: S.p.name, day: i + 1, options, chosen, current: days[i] });
    }
    // tardy: day cells win; otherwise the file's Tardy total
    const dayTardy = days.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
    let tardyFile = null;
    const totals = S.totals.filter(t => t.n > 0 || t.dayTardy > 0);
    if (dayTardy > 0) {
      const odd = totals.filter(t => Math.abs(t.n - t.dayTardy) > 0.01 && t.dayTardy > 0);
      if (odd.length) {   // day cells win unless you pick the file's total
        const key = `${pid}|tardy`, chosen = picks.has(key) ? picks.get(key) : undefined;
        const options = [{ v: dayTardy, src: 'the day cells' }, ...[...new Set(odd.map(t => t.n))].map(n => ({ v: n, src: 'the Tardy column in ' + odd.filter(t => t.n === n).map(t => t.src).join(', ') }))];
        if (chosen !== undefined && chosen !== dayTardy) tardyFile = chosen;
        clashes.push({ key, pid, name: S.p.name, kind: 'tardy', options, chosen, current: chosen !== undefined ? chosen : dayTardy,
          text: `${S.p.name}: the day cells add up to ${dayTardy} tardy minutes but the Tardy column says ${odd.map(t => t.n).join(' / ')}` });
      }
    } else if (totals.length) {
      const vals2 = [...new Set(totals.map(t => t.n))];
      tardyFile = Math.max(...vals2);
      if (vals2.length > 1) warns.push({ kind: 'tardy', pid, text: `${S.p.name}: different Tardy totals in the files (${totals.map(t => `${t.n} in ${t.src}`).join(', ')}); ${tardyFile} is used` });
    }
    byPerson.set(pid, { days, tardyFile, dayTardy, srcs: [...S.srcs], filled: days.filter(v => v != null).length });
    if (S.ids && S.ids.size === 1) {   // the roster has no ID for this person and the supervisor's file has one
      const [[id, src]] = [...S.ids], fid = `id:${pid}`;
      if (!undo.has(fid)) { idFills.push({ pid, name: S.p.name, id, src }); fix(fid, 'id', `${S.p.name}: no ID in the roster; took ${id} from ${src}`, 1, { undoable: true }); }
    } else if (S.ids && S.ids.size > 1) warns.push({ kind: 'id', pid, text: `${S.p.name}: no ID in the roster, and the files give different IDs (${[...S.ids.keys()].join(', ')})` });
  }
  // 4 · coverage + cross-checks with Genesys
  const anyFiles = used.length > 0;
  const missing = anyFiles ? ix.list.filter(p => p.status !== 'Inactive' && !byPerson.has(p._id)) : [];
  const partial = [];
  for (const [pid, a] of byPerson) { const blank = a.days.filter(v => v == null).length; if (blank && blank < ND) partial.push({ pid, name: per.get(pid).p.name, blank }); }
  const cross = [];
  if (opts.adh || opts.sched) {
    for (const [pid, a] of byPerson) {
      const p = per.get(pid).p, exp = normName(normSpace(p.sys) ? p.sys : p.name);
      const adh = opts.adh && opts.adh.get(exp), sch = opts.sched && opts.sched.get(exp);
      a.days.forEach((v, i) => {
        if (v == null) return;
        const ad = adh ? adh[i] : null, worked = typeof ad === 'number' && ad >= (opts.floor ?? 0.5);
        const d = `${i + 1} ${C.MON[M - 1]}`;
        if (v === 'Absent' && worked) cross.push({ pid, day: i + 1, text: `${p.name} is Absent on ${d} but worked in Genesys (adherence ${(ad * 100).toFixed(1)}%)` });
        else if ((v === 'OFF' || LEAVE.has(v)) && worked) cross.push({ pid, day: i + 1, text: `${p.name} is ${v} on ${d} but worked in Genesys (adherence ${(ad * 100).toFixed(1)}%)` });
        else if (WORKED(v) && sch && sch[i] === 0 && !worked) cross.push({ pid, day: i + 1, text: `${p.name} is ${typeof v === 'number' ? v + ' min late' : 'Attend'} on ${d} but has only leave or no work in the Genesys schedule` });
      });
    }
  }
  return {
    byPerson, files, unmatched, clashes, missing, partial, cross, idFills,
    fixes: [...fixes.values()], warns,
    stats: { files: files.filter(f => f.used).length, people: byPerson.size, tardy: [...byPerson.values()].reduce((s, a) => s + (a.dayTardy || a.tardyFile || 0), 0) },
  };
}

/** Totals per person in the same way the workbook formulas count them. */
function counts(days, tardyFile) {
  const c = { worked: 0, tardyDays: 0, tardyMin: 0, absent: 0, al: 0, sl: 0, off: 0, other: 0, filled: 0 };
  for (const v of days) {
    if (v == null) continue; c.filled++;
    if (typeof v === 'number') { c.worked++; if (v > 0) { c.tardyDays++; c.tardyMin += v; } continue; }
    const l = String(v).toLowerCase();
    if (l === 'attend') c.worked++; else if (l === 'absent') c.absent++; else if (l === 'al') c.al++; else if (l === 'sl') c.sl++; else if (l === 'off') c.off++; else c.other++;
  }
  if (!days.some(v => typeof v === 'number') && tardyFile) c.tardyMin = tardyFile;
  return c;
}
return { merge, normCode, counts, KNOWN, LEAVE };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Att;
