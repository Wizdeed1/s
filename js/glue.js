/* glue: raw detections + roster -> writer context */
const Glue = ((C) => {
function makeContext(dets, roster, settings, Y, M) {
  const ND = C.daysIn(Y, M), of = k => dets.filter(d => d.kind === k);
  const adh = new Map();
  for (const d of of('adhGenesys')) for (const row of d.data.people) {
    const k = C.normName(row.name); if (adh.has(k)) continue;
    const days = new Array(ND).fill(null);
    for (const [day, v] of (d.data.multi ? row.byMonth[Y + '-' + M] || [] : row.days)) if (day <= ND) { const x = C.adhVal(v); if (x != null) days[day - 1] = x; }
    adh.set(k, { name: C.normSpace(row.name), days });
  }
  const aht = new Map();
  for (const d of of('aht')) {
    const rows = [...d.data.people].sort((a, b) => (b.media === 'voice') - (a.media === 'voice'));
    for (const row of rows) {
      const k = C.normName(row.name); let cur = aht.get(k);
      if (!cur || (cur.sec == null && row.sec != null)) { const alt = cur ? cur.alt : []; cur = { name: C.normSpace(row.name), sec: row.sec, media: row.media, alt }; aht.set(k, cur); }
      if (row.sec != null && !cur.alt.some(x => x.media === row.media && x.sec === row.sec)) cur.alt.push({ media: row.media || '', sec: row.sec });
    }
  }
  const daily = C.computeDaily(of('schedule'), of('timeline'), Y, M);
  const rawSched = [...daily.sched.values()].map(x => ({ name: C.normSpace(x.name), days: x.days }));
  const rawActual = [...daily.actual.values()].map(x => ({ name: C.normSpace(x.name), days: x.days }));
  const tlNames = new Set(of('timeline').flatMap(d => d.data.agents.map(C.normName)));
  const exp = new Set(roster.filter(p => C.normSpace(p.name)).map(p => C.normName(C.normSpace(p.sys) ? p.sys : p.name)));
  const notOn = list => list.map(x => x.name).filter(n => !exp.has(C.normName(n)));
  const checks = {
    adh: notOn([...adh.values()]), aht: notOn([...aht.values()].filter(x => x.sec != null)), sched: notOn(rawSched),
    noTimeline: of('timeline').length ? rawSched.map(x => x.name).filter(n => !tlNames.has(C.normName(n))) : [],
  };
  return { year: Y, month: M, settings, roster, rawAdh: [...adh.values()], rawAht: [...aht.values()], rawSched, rawActual, checks };
}
return { makeContext };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Glue;
