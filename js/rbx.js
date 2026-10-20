// ================================================================ REPORT BUILDER: the Member Care Report Builder, built into the tool
// The WFM analyst drops the day's exports on WFM › Report builder. MC Leaders and the WFM Daily Review are made there, as in
// Member Care Report Builder 14. The four brand emails (Virgin Postpaid, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay) go to the
// WFM manager's WFM › Daily emails: he reads them, writes the SLA insight and sends them. The builder's own modules make every
// email (they are in the page: script#rb-code), so the emails come out exactly as the stand-alone builder made them. Each day's
// numbers still go to the shared history, and building the WFM Daily Review still keeps each agent's day.
Object.assign(state, { rbPrefs: {}, rbIn: {}, dmail: {}, dmBrands: {}, dmSel: '', dmActive: 'postpaid', rbActive: 'leaders', rbVer: 0 });
const RB_BRANDS = ['postpaid', 'virgin', 'friendi', 'fpay'];
const RB_MINE = ['leaders', 'wfm'];
const RB_RULES = [['all', 'Average of all rows incl. total'], ['facebook', 'Facebook queues only'], ['total', 'Total row only'], ['weighted', 'Weighted by volume']];
const RB_DAYF = { insight: 1, subject: 1, intro: 1, asaOverride: 1 };
const RB_TPL = { virgin: 'virgin', postpaid: 'virgin', friendi: 'friendi', fpay: 'fpay' };
const RB_KEEP_DAYS = 40;
const rbE = () => window.Engine, rbR = () => window.Render, rbB = () => window.Build;
const RB = { ready: false, date: '', weekend: false, dateLocked: false, bag: null, files: [], seq: 0, models: {}, data: {}, docs: {}, hist: null, lastSaved: null,
  pubT: 0, pubSig: {}, histT: 0, buildT: 0, shown: false, agentsModel: null, frames: new WeakMap(), renderT: new Map() };
const rbClone = o => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- the builder's data (templates, logos, history seed), opened on first use
let rbDataP = null;
function rbLoad() {
  if (rbDataP) return rbDataP;
  rbDataP = (async () => {
    const el = document.getElementById('rb-data');
    if (!el || !window.Engine || !window.Build || !window.Templater || !window.Render) throw new Error('The report builder is not in this copy of the tool.');
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old for the report builder: open the tool in the newest Microsoft Edge or Google Chrome.');
    const bin = atob(el.textContent.replace(/\s+/g, '')), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const d = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    window.TEMPLATES = d.templates; window.LOGOS = d.logos; window.HISTORY_SEED = d.seed;
    return true;
  })();
  rbDataP.catch(() => { rbDataP = null; });
  return rbDataP;
}

// ---------------------------------------------------------------- shared settings: one record per email (dailytool/p_<key>), the analyst's inputs (dailytool/p_in)
const rbPending = new Map();
function rbPrefsOf(key) { return (state.rbPrefs[key] = state.rbPrefs[key] || {}); }
function rbGet(key, name, dk) { const P = state.rbPrefs[key] || {}; return RB_DAYF[name] ? (((P.days || {})[dk] || {})[name] || '') : (P[name] || ''); }
function rbSet(key, name, value, dk) {
  const P = rbPrefsOf(key);
  if (RB_DAYF[name] || name === 'sent') { P.days = P.days || {}; const D = P.days[dk] = P.days[dk] || {}; if (value === null) delete D[name]; else D[name] = value; }
  else P[name] = value;
  rbPrefsSave(key);
}
function rbPrefsSave(key) {
  const P = rbPrefsOf(key);
  if (P.days) { const dates = Object.keys(P.days).sort(); while (dates.length > 45) delete P.days[dates.shift()]; }   // as the builder kept them: 45 report days
  clearTimeout(rbPending.get(key)); rbPending.set(key, setTimeout(() => {
    rbPending.delete(key);
    if (!state.db) return;
    const body = { v: rbClone(state.rbPrefs[key] || {}), at: new Date().toISOString(), by: whoNow() };
    queueWrite('dailytool/p_' + key, () => state.db.doc('dailytool/p_' + key).set(body)).catch(e => toast(`The ${rbName(key)} settings were not saved (${(e && e.code) || 'error'}).`));
  }, 700));
}
function rbInSave() {
  clearTimeout(rbPending.get('in')); rbPending.set('in', setTimeout(() => {
    rbPending.delete('in');
    if (!state.db) return;
    const body = { v: rbClone(state.rbIn || {}), at: new Date().toISOString(), by: whoNow() };
    queueWrite('dailytool/p_in', () => state.db.doc('dailytool/p_in').set(body)).catch(() => {});
  }, 700));
}
/** the shared settings as they come in (dailytool collection, see watchDaily): a key being typed in here keeps the local copy */
function rbPrefsIn(docs) {
  let changed = false;
  for (const d of docs) {
    const id = d.id; if (!/^p_/.test(id)) continue;
    const key = id.slice(2), x = d.data(); if (!x || !x.v || rbPending.has(key)) continue;
    if (key === 'in') { if (JSON.stringify(state.rbIn) !== JSON.stringify(x.v)) { state.rbIn = x.v; changed = true; } continue; }
    if (JSON.stringify(state.rbPrefs[key] || {}) !== JSON.stringify(x.v)) { state.rbPrefs[key] = x.v; changed = true; }
  }
  if (changed) { state.rbVer++; rbPrefsChanged(); }
  state.rbToolSeen = true; state.rbPrefsDocs = docs.some(d => /^p_/.test(d.id)); rbPrefsCarry();
}
/** once: the greeting, signature and ASA rule set in the stand-alone builder in this browser (Member Care Report Builder 14 kept
    them here) become the shared ones, when nobody has set any yet */
function rbPrefsCarry() {
  if (state.rbCarried || !state.rbToolSeen || !Auth.user() || !state.db) return;   // after the sign-in, once the shared settings are known
  state.rbCarried = true;
  if (!canDailySave() || state.rbPrefsDocs || lsRaw('mc.prefs.carried')) return;
  let old = null; try { old = JSON.parse(lsRaw('mc.prefs.v1') || 'null'); } catch (e) { old = null; }
  if (!old || typeof old !== 'object') return;
  let n = 0;
  for (const key of [...RB_BRANDS, 'leaders']) {
    const o = old[key]; if (!o || typeof o !== 'object') continue;
    const keep = {}; for (const f of ['asaRule', 'greeting', 'signature']) if (typeof o[f] === 'string' && o[f]) keep[f] = o[f];
    if (Object.keys(keep).length) { state.rbPrefs[key] = Object.assign(rbPrefsOf(key), keep); rbPrefsSave(key); n++; }
  }
  if (typeof old.fpayTickets === 'string' && old.fpayTickets.trim()) { state.rbIn.fpayTickets = old.fpayTickets; rbInSave(); n++; }
  lsPut('mc.prefs.carried', '1');
  if (n) toast('Your greeting, signature and ASA settings from the old report builder are kept.');
}
function rbPrefsChanged() {
  if (RB.ready && rbVisible('builder')) { const t = document.activeElement; if (!(t && t.closest && t.closest('#wfmRb'))) { const f = $('wfmRb').querySelector('[data-rbfpay]'); if (f) f.value = state.rbIn.fpayTickets || ''; } rbRebuildSoon(); }
  if (rbVisible('dmail')) dmRender(false);
}
const rbVisible = t => state.ws === 'wfm' && state.wfmTab === t;
const rbName = key => (rbB() && rbB().REPORTS[key] ? rbB().REPORTS[key].name : { postpaid: 'Virgin Postpaid', virgin: 'Virgin Mobile', friendi: 'FRiENDi Mobile', fpay: 'FRiENDi Pay', leaders: 'MC Leaders', wfm: 'WFM Daily Review' }[key] || key);

// ---------------------------------------------------------------- the dropped files, kept per brand and per day (as the stand-alone builder kept them)
function rbEmptyBag() {
  return { calls: {}, sm: {}, queue: {}, dated: { calls: {}, sm: {}, queue: {} }, undated: [], datedFiles: [],
    history: null, tickets: null, historyFiles: {}, ticketFiles: {}, fpayTicketsFile: null, leaderRows: null };
}
function rbComposeBag() {
  const bag = RB.bag;
  ['calls', 'sm', 'queue'].forEach(t => { bag[t] = {}; Object.keys(bag.dated[t]).forEach(b => { bag[t][b] = Object.assign({}, bag.dated[t][b]); }); });
  bag.undated.forEach(u => { const m = bag[u.type][u.brand] = bag[u.type][u.brand] || {}; m[u.day || '*'] = u.rows; });
}
/** Genesys puts the export time in the file name: "Friendi_Queue_-_2026-09-20T123859.639.csv" */
function rbExportTime(name) { const m = String(name).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null; }
/** the day of an export without a date column: the one day dropped with it, else the day exported closest to it, else asked */
function rbGuessDay(u, batchDays) {
  if (batchDays.length === 1) return { day: batchDays[0], how: 'dropped with that day' };
  const t = rbExportTime(u.name);
  if (t !== null) {
    let best = null;
    RB.bag.datedFiles.forEach(f => { if (f.time === null || f.days.length !== 1) return; const gap = Math.abs(f.time - t); if (gap <= 30 * 60000 && (!best || gap < best.gap)) best = { gap, day: f.days[0] }; });
    if (best) return { day: best.day, how: 'exported with that day' };
  }
  return { day: null, how: '' };
}
function rbCombine(files) {   // several Crystal exports: combined, a row in two overlapping files counted once
  const best = new Map(), rows = [];
  Object.keys(files).forEach(name => { const counts = new Map(); files[name].forEach(r => { const k = JSON.stringify(r), n = (counts.get(k) || 0) + 1; counts.set(k, n); if (n > (best.get(k) || 0)) { best.set(k, n); rows.push(r); } }); });
  return rows;
}
function rbShortDays(dates) {
  const E = rbE(), R = rbR();
  if (!dates.length) return ''; if (dates.length === 1) return R.dayLabel(dates[0]);
  const contiguous = E.dayDiff(dates[0], dates[dates.length - 1]) === dates.length - 1;
  return contiguous ? R.niceRange(dates[0], dates[dates.length - 1]).replace(/ \d{4}$/, '') : dates.map(R.dayLabel).join(', ');
}
function rbLabelFor(c) {
  const b = { virgin: 'Virgin', friendi: 'FRiENDi', fpay: 'FRiENDi Pay', postpaid: 'Virgin Postpaid' }[c.brand] || c.brand;
  return b + ' · ' + ({ calls: 'Calls', sm: 'Social/Email', queue: 'Queue times' }[c.type] || c.type);
}
async function rbAddFiles(list) {
  await rbBoot(); const E = rbE(), R = rbR();
  const notes = [], batchDays = new Set(), batchUndated = [];
  RB.busy = `Reading ${plural(list.length, 'file')}…`; rbFilesRender();
  for (const f of Array.from(list)) {
    try {
      if (/\.xlsx$/i.test(f.name)) {
        // the FRiENDi Pay ticket sheet or the EXECUTIVE TKTs dashboard: either may sit on any sheet of the workbook
        let sheets; try { sheets = await window.parseXlsx(await f.arrayBuffer()); } catch (err) { notes.push({ name: f.name, label: 'not readable (' + err.message + ')', bad: true }); continue; }
        let took = false;
        for (const sh of sheets) {
          const payload = E.sheetPayload(sh.rows || []);
          if (E.isLeaderTickets(payload)) { rbLeaderSheet(f.name, sh.name, E.leaderTickets(payload), notes); took = true; break; }
          if (E.isTicketSheet(payload)) { rbTicketSheet(f.name, E.parseTicketSheet(payload), notes); took = true; break; }
        }
        if (!took) notes.push({ name: f.name, label: 'not recognised', bad: true });
        continue;
      }
      if (/\.xls$/i.test(f.name)) {
        let sheets; try { sheets = window.parseXls(await f.arrayBuffer()); } catch (err) { notes.push({ name: f.name, label: 'not readable (' + err.message + ')', bad: true }); continue; }
        const rows = sheets[0] ? sheets[0].rows : [], c = E.classify(f.name, 'xls', { rows });
        if (c.type === 'history' || c.type === 'tickets') {
          const parsed = c.type === 'history' ? E.historyRows(rows) : E.ticketRows(rows), col = c.type === 'history' ? E.COL.date : E.TCOL.date;
          const ds = Array.from(new Set(parsed.map(r => E.rowDate(r[col])).filter(Boolean))).sort();
          if (c.type === 'history') { RB.bag.historyFiles[f.name] = parsed; RB.bag.history = rbCombine(RB.bag.historyFiles); }
          else { RB.bag.ticketFiles[f.name] = parsed; RB.bag.tickets = rbCombine(RB.bag.ticketFiles); }
          const mcl = c.type === 'tickets' ? parsed.filter(r => /^\s*mc\s*leaders?\s*$/i.test(String(r[E.TCOL.group] || ''))).length : 0;
          notes.push({ name: f.name, label: (c.type === 'history' ? 'Call history' : 'Tickets') + ' · ' + parsed.length + ' rows' + (c.type === 'tickets' ? ' · MC Leaders ' + E.fmtInt(mcl) : '') + (ds.length ? ' · ' + rbShortDays(ds) : '') });
        } else notes.push({ name: f.name, label: 'not recognised', bad: true });
        continue;
      }
      const text = await f.text();
      // the WFM Daily Review's own exports (agent performance, status, interactions, adherence, schedules) first
      const wt = window.WFM ? window.WFM.table(text, f.name) : null, wslot = wt ? window.WFM.detect(wt, f.name) : null;
      if (wslot && window.WFM.isOwn(wslot)) { notes.push({ name: f.name, label: window.WFM.add(wt, wslot) + ' · ' + E.fmtInt(wt.rows) + ' rows', wfm: true }); continue; }
      const payload = E.parseCsv(text), c = E.classify(f.name, 'csv', payload);
      if (wt && c.type === 'calls' && /^(virgin|friendi|fpay)$/.test(c.brand || '')) window.WFM.addCalls(c.brand, wt);
      if (c.type === 'fpayTickets') rbTicketSheet(f.name, E.parseTicketSheet(payload), notes);
      else if (c.type !== 'unknown' && c.brand) {
        const split = E.splitByDay(payload.rows);
        if (split.span && split.dates.length === 1) { notes.push({ name: f.name, label: rbLabelFor(c) + ' · ' + R.niceRange(split.span.start, split.span.end).replace(/ \d{4}$/, '') + ' in one total; export it by day', bad: true }); continue; }
        if (split.dates.length) {
          const byDay = RB.bag.dated[c.type][c.brand] = RB.bag.dated[c.type][c.brand] || {};
          split.dates.forEach(d => { byDay[d] = split.days[d]; batchDays.add(d); });
          RB.bag.datedFiles.push({ name: f.name, time: rbExportTime(f.name), days: split.dates });
          notes.push({ name: f.name, label: rbLabelFor(c) + ' · ' + rbShortDays(split.dates) });
        } else {   // no date column (the Queue exports): matched to a day below
          RB.bag.undated = RB.bag.undated.filter(u => u.name !== f.name);
          const u = { id: 'u' + (++RB.seq), name: f.name, type: c.type, brand: c.brand, rows: split.undated, day: null, how: '' };
          RB.bag.undated.push(u); batchUndated.push(u);
          RB.files = RB.files.filter(x => x.name !== f.name);
          notes.push({ name: f.name, label: rbLabelFor(c), undated: u.id });
        }
      } else if (wt && wslot) notes.push({ name: f.name, label: window.WFM.add(wt, wslot) + ' · ' + E.fmtInt(wt.rows) + ' rows', wfm: true });
      else if (wt && wt.rows && window.WFM) { notes.push({ name: f.name, label: 'not recognised. If it is a WFM export, assign it in the WFM Daily Review tab', bad: true }); window.WFM.add(wt, null); }
      else notes.push({ name: f.name, label: 'not recognised', bad: true });
    } catch (err) { notes.push({ name: f.name, label: (err && err.message) || String(err), bad: true }); }
  }
  const days = Array.from(batchDays);
  batchUndated.forEach(u => { const g = rbGuessDay(u, days); u.day = g.day; u.how = g.how; });
  rbComposeBag();
  RB.files = RB.files.concat(notes); RB.busy = '';
  if (!RB.dateLocked) { const latest = rbLatestDay(); if (latest) rbSetDate(latest, false); }
  rbAutoSave(); rbRebuild();
  const bad = notes.filter(n => n.bad).length;
  toast(`${plural(notes.length - bad, 'file')} read${bad ? `, ${bad} not recognised` : ''}.${RB.data && rbHasBrandData() && canDailyTool() ? ' The four brand emails are on their way to the WFM manager.' : ''}`);
}
function rbTicketSheet(name, rows, notes) {
  const E = rbE(); RB.bag.fpayTicketsFile = { name, rows };
  const ds = Array.from(new Set(rows.map(r => r.date).filter(Boolean))).sort();
  notes.push({ name, label: 'FRiENDi Pay · Tickets · ' + E.fmtInt(rows.reduce((a, r) => a + r.count, 0)) + ' tickets' + (ds.length ? ' · ' + rbShortDays(ds) : '') });
}
function rbLeaderSheet(name, sheet, rows, notes) {
  const E = rbE(); RB.bag.leaderRows = { name, sheet, rows };
  const mine = rows.filter(r => /^\s*mc\s*leaders?\s*$/i.test(r.assigned)), ds = Array.from(new Set(mine.map(r => r.date).filter(Boolean))).sort();
  notes.push({ name, label: 'Executive tickets · ' + E.fmtInt(rows.length) + ' rows · MC Leaders ' + E.fmtInt(mine.length) + (ds.length ? ' · ' + rbShortDays(ds) : '') });
}
function rbLatestDay() { let best = null; ['calls', 'sm', 'queue'].forEach(t => Object.keys(RB.bag.dated[t]).forEach(b => Object.keys(RB.bag.dated[t][b]).forEach(d => { if (!best || d > best) best = d; }))); return best; }
function rbHasBrandData() { const b = RB.bag; return !!b && (RB_BRANDS.some(k => Object.keys(b.calls[k] || {}).length || Object.keys(b.sm[k] || {}).length) || !!b.history || !!b.tickets || !!b.fpayTicketsFile); }

// ---------------------------------------------------------------- the report day: one day, or Thursday → Saturday on a Sunday report
function rbPeriod() { const E = rbE(), B = rbB(); return B.makePeriod(RB.weekend ? E.addDays(RB.date, -2) : RB.date, RB.date); }
const rbDayKeyOf = p => (p.multi ? p.start + '_' + p.end : p.end);
function rbSetDate(d, fromUser) { RB.date = d; RB.weekend = rbE().weekday(d) === 6; if (fromUser) RB.dateLocked = true; }

// ---------------------------------------------------------------- history: the month-to-date and monthly tables come from here
/** the builder's history: this browser's copy (or the seed the builder came with), with the shared copy merged in */
function rbHist() {
  if (RB.hist) return RB.hist;
  let H = null; try { H = JSON.parse(lsRaw(DH_KEY) || 'null'); } catch (e) { H = null; }
  if (!H || typeof H !== 'object') H = rbClone(window.HISTORY_SEED || {});
  if (state.dhist) H = mergeDailyHist(H, state.dhist).out;
  RB.hist = H; return H;
}
/** the shared copy changed (someone else saved a day, or the WFM manager changed an ASA): it joins the builder's */
function rbHistIn(shared) {
  if (!RB.hist || !shared) return;
  const m = mergeDailyHist(RB.hist, shared); if (!m.changed) return;
  RB.hist = m.out; lsPut(DH_KEY, JSON.stringify(m.out));
  if (rbVisible('builder')) rbRebuildSoon();
}
function rbHistFor(key) {   // a report's stored history; Postpaid's non-voice rows are Virgin's
  const H = rbHist(), h = H[key] || {}, from = rbB().REPORTS[key].nvFrom;
  return from ? Object.assign({}, h, { nonvoice: (H[from] || {}).nonvoice }) : h;
}
const rbGenesysBag = () => Object.assign({}, RB.bag, { history: null, tickets: null, fpayTicketsFile: null, leaderRows: null });
function rbBagDays() { const s = new Set(); ['calls', 'sm'].forEach(t => Object.keys(RB.bag.dated[t]).forEach(b => Object.keys(RB.bag.dated[t][b]).forEach(d => s.add(d)))); return Array.from(s).sort(); }
function rbClean(o) { const out = {}; Object.keys(o || {}).forEach(k => { const v = o[k]; if (v !== null && v !== undefined && !(typeof v === 'number' && isNaN(v))) out[k] = v; }); return out; }
function rbKeep(list, date, fields) {   // upsert, saying whether anything changed
  const i = list.findIndex(r => r.date === date), next = Object.assign({}, i >= 0 ? list[i] : { date }, fields);
  if (i >= 0 && JSON.stringify(list[i]) === JSON.stringify(next)) return false;
  rbB().upsert(list, next); return true;
}
/** every day in the dropped Genesys exports goes to history as soon as the files are read (as the builder did) */
function rbAutoSave() {
  const days = rbBagDays(); if (!days.length) return;
  const E = rbE(), B = rbB(), p = rbPeriod(), dk = rbDayKeyOf(p), H = rbHist(), gb = rbGenesysBag();
  let changed = false; const savedDays = new Set();
  RB_BRANDS.forEach(key => {
    const cfg = B.REPORTS[key], prefs = state.rbPrefs[key] || {}, h = H[key] = H[key] || {};
    days.forEach(d => {
      const onReportDay = !p.multi && d === p.end;
      const data = B.computeData(key, B.makePeriod(d, d), gb, { asaRule: prefs.asaRule, hist: rbHistFor(key), noUndated: !onReportDay && !RB.bag.undated.some(u => u.day === d) });
      const dd = data.days[d] || {};
      if (dd.voice && dd.voice.presented !== null && dd.voice.presented !== undefined) { h.voice = h.voice || { monthly: [], daily: [] }; if (rbKeep(h.voice.daily, d, rbClean(dd.voice))) changed = true; savedDays.add(d); }
      if (dd.nonvoice && !cfg.nvFrom) {
        h.nonvoice = h.nonvoice || { monthly: [], daily: [] };
        const nv = rbClean(dd.nonvoice), ov = d === p.end ? rbGet(key, 'asaOverride', dk) : '';
        if (ov && E.dur(ov) !== null) nv.asa = E.dur(ov);
        if (rbKeep(h.nonvoice.daily, d, nv)) changed = true;
        savedDays.add(d);
      }
    });
  });
  if (changed) { lsPut(DH_KEY, JSON.stringify(H)); rbHistPushSoon(); }
  if (savedDays.size) RB.lastSaved = { days: Array.from(savedDays).sort(), at: new Date() };
}
function rbHistPushSoon() { clearTimeout(RB.histT); RB.histT = setTimeout(() => { rbHistPush(RB.hist); }, 900); }
/** the builder's history to the shared copy (its rows win where a day differs) */
async function rbHistPush(H) {
  if (!state.db || !canDailySave() || !H) return;
  if (!state.dhist) {   // not seen yet: read it, so the days only the shared copy has are kept
    try { const sn = await state.db.doc('dailytool/history').get(); const x = sn.exists ? sn.data() : null; if (x && x.hist) { state.dhist = x.hist; state.dhistAt = x.at || ''; state.dhistBy = x.by || ''; } } catch (e) { return; }
  }
  const m = mergeDailyHist(state.dhist || {}, H); if (!m.changed && state.dhist) return;
  state.dhist = m.out; state.dhistAt = new Date().toISOString(); state.dhistBy = whoNow();
  const shared = state.folder ? m.out : fitHist(m.out, 230000);
  try { await queueWrite('dailytool/history', () => state.db.doc('dailytool/history').set({ hist: shared, at: state.dhistAt, by: state.dhistBy })); }
  catch (e) { toast(`The daily data was not shared (${(e && e.code) || 'error'}).`); return; }
  const last = lastDailyDate(m.out); markFresh('daily', last ? `brands up to ${+last.slice(8)} ${MON[+last.slice(5, 7) - 1]}` : 'brands');
}
/** days of the report month, before the report, that no report has saved yet */
function rbMissingDays(key) {
  const E = rbE(), p = rbPeriod(), h = rbHistFor(key);
  const have = new Set(((h.voice && h.voice.daily) || []).filter(r => r.presented !== null && r.presented !== undefined).map(r => r.date));
  return E.dateRange(p.end.slice(0, 7) + '-01', E.addDays(p.start, -1)).filter(d => d < p.start && !have.has(d));
}
/** Monthly rows as the builder works them out (Build.monthlyRows): the history snapshot sent with a brand email keeps exactly these */
function rbMonthly(section, date, mode, fields) {
  const stored = section && section.monthly ? section.monthly.slice() : [], have = {};
  stored.forEach(r => { have[r.date] = true; });
  const currentMonth = date.slice(0, 7) + '-01', byMonth = {};
  (section && section.daily ? section.daily : []).forEach(r => { const mk = r.date.slice(0, 7) + '-01'; if (mk >= currentMonth) return; (byMonth[mk] = byMonth[mk] || []).push(r); });
  Object.keys(byMonth).forEach(mk => {
    if (have[mk]) return;
    const rows = byMonth[mk], out = { date: mk };
    fields.forEach(f => { const vals = rows.map(r => r[f]).filter(v => v !== null && v !== undefined && !isNaN(v)); if (!vals.length) { out[f] = null; return; } const s = vals.reduce((a, b) => a + b, 0); out[f] = (mode === 'sum' && f !== 'asa') ? s : s / vals.length; });
    stored.push(out);
  });
  stored.sort((a, b) => (a.date < b.date ? -1 : 1));
  const closed = stored.filter(r => r.date < currentMonth), thisYear = closed.filter(r => r.date.slice(0, 4) === date.slice(0, 4));
  return thisYear.length ? thisYear : closed.slice(-8);
}
/** only what the brand email reads from history: the closed months, and the month (and report days) to date */
function rbHistSnap(key, p, hist) {
  const cfg = rbB().REPORTS[key], date = p.end, monthStart = date.slice(0, 7) + '-01', inBlock = d => d <= date && (d >= monthStart || d >= p.start);
  const VOICE = ['presented', 'handled', 'ansPct', 'abandoned', 'abPct', 'sl', 'aht', 'asa', 'q85', 'totalPresented', 'ppPct'], NV = cfg.emailPH ? ['presented', 'handled', 'asa'] : cfg.channels.concat(['asa']);
  const sec = (S, mode, fields) => ({ monthly: rbMonthly(S, date, mode, fields), daily: (S.daily || []).filter(r => inBlock(r.date)) });
  const out = {};
  if (hist.voice) out.voice = sec(hist.voice, 'avg', VOICE);
  if (cfg.channels.length && hist.nonvoice) out.nonvoice = sec(hist.nonvoice, 'sum', NV);
  return out;
}

// ---------------------------------------------------------------- building: MC Leaders and the WFM review here; the brand emails' data for the WFM manager
function rbRebuildSoon() { clearTimeout(RB.buildT); RB.buildT = setTimeout(rbRebuild, 250); }
function rbRebuild() {
  clearTimeout(RB.buildT);
  if (!RB.ready || !RB.date) return;
  const B = rbB(), p = rbPeriod(), dk = rbDayKeyOf(p);
  if (window.WFM) { window.WFM.setReportDate(RB.date, p.days); RB.data.wfm = { warnings: window.WFM.issues() }; RB.models.wfm = { kind: 'wfm' }; }
  RB.data.leaders = B.computeLeaders(p, RB.bag, {}); RB.models.leaders = rbLeadersModel(p, dk);   // MC Leaders
  // the four brands: worked out here for every ASA rule (the WFM manager picks the rule), built on his page. With each rule go the
  // email's numbers, the history it reads, and each dropped day's non-voice row, as the builder kept them when its rule changed.
  RB.docs = {};
  const E = rbE(), bagDays = rbBagDays(), gb = rbGenesysBag();
  for (const key of RB_BRANDS) {
    const cfg = B.REPORTS[key], hist = rbHistFor(key), rules = cfg.channels.length ? RB_RULES.map(r => r[0]) : [cfg.asaRule], data = {}, hists = {}, nvDays = {};
    for (const rule of rules) {
      data[rule] = B.computeData(key, p, RB.bag, { fpayTickets: state.rbIn.fpayTickets || '', asaRule: rule, suppressed: undefined, hist });
      let h = hist;
      if (cfg.channels.length && !cfg.nvFrom) {
        const nv = nvDays[rule] = {};
        bagDays.forEach(d => { const onReportDay = !p.multi && d === p.end; const dd = B.computeData(key, B.makePeriod(d, d), gb, { asaRule: rule, hist, noUndated: !onReportDay && !RB.bag.undated.some(u => u.day === d) }).days[d] || {}; if (dd.nonvoice) nv[d] = rbClean(dd.nonvoice); });
        if (Object.keys(nv).length) {   // the history as the builder would hold it under this rule
          h = rbClone(hist); h.nonvoice = h.nonvoice || { monthly: [], daily: [] };
          Object.keys(nv).sort().forEach(d => { const row = Object.assign({}, nv[d]), ov = d === p.end ? rbGet(key, 'asaOverride', dk) : ''; if (ov && E.dur(ov) !== null) row.asa = E.dur(ov); rbKeep(h.nonvoice.daily, d, row); });
        }
      }
      hists[rule] = rbHistSnap(key, p, h);
    }
    const pre = [];
    if (p.multi) RB.bag.undated.filter(u => !u.day && u.brand === key).forEach(u => pre.push(u.name + ' has no date column — pick the day it covers next to it in the file list.'));
    const gap = rbMissingDays(key);
    if (gap.length) pre.push(rbShortDays(gap) + ' ' + (gap.length > 1 ? 'are' : 'is') + ' missing from the daily table — never saved. Drop ' + (gap.length > 1 ? 'those days\'' : 'that day\'s') + ' Genesys exports with today\'s to add ' + (gap.length > 1 ? 'them' : 'it') + '.');
    RB.docs[key] = rbClone({ key, period: p, data, hist: hists, nvDays, pre });
    const b = rbBrandBuild(key, RB.docs[key], dk); RB.models[key] = b.model; RB.data[key] = b.data;
  }
  rbRender();
  if (canDailyTool() && rbHasBrandData()) rbPublishSoon();
}
function rbLeadersModel(p, dk) {
  const model = rbB().buildLeaders(p, RB.data.leaders, {}), lp = state.rbPrefs.leaders || {};
  const subj = rbGet('leaders', 'subject', dk), intro = rbGet('leaders', 'intro', dk);
  if (subj) model.subject = subj; if (intro) model.intro = intro;
  if (lp.greeting) model.greeting = lp.greeting; if (lp.signature) model.footer.signature = lp.signature;
  return model;
}
/** a brand email from its record: the WFM manager's rule, override, insight, subject, greeting, signature and intro */
function rbBrandBuild(key, doc, dk) {
  const E = rbE(), B = rbB(), cfg = B.REPORTS[key], P = state.rbPrefs[key] || {}, p = doc.period;
  const rules = Object.keys(doc.data), want = P.asaRule || cfg.asaRule, rule = doc.data[want] ? want : doc.data[cfg.asaRule] ? cfg.asaRule : rules[0];
  const data = rbClone(doc.data[rule]), last = data.days && data.days[p.end], hist = (doc.hist && (doc.hist[rule] || doc.hist[rules[0]])) || {};
  if (last) { data.voice = last.voice; data.nonvoice = last.nonvoice; data.asaOptions = last.asaOptions; }   // one object, as the builder had it
  data.warnings = (doc.pre || []).concat(data.warnings || []);
  const ov = rbGet(key, 'asaOverride', dk);
  if (ov && data.nonvoice) { const v = E.dur(ov); if (v !== null) data.nonvoice.asa = v; }
  const model = B.buildReport(key, p, data, hist, { insight: rbGet(key, 'insight', dk), notes: {} });
  const subj = rbGet(key, 'subject', dk), intro = rbGet(key, 'intro', dk);
  if (subj) model.subject = subj;
  if (P.signature) model.footer.signature = P.signature;
  if (P.greeting) model.greeting = P.greeting;
  if (intro) model.intro = intro;
  return { model, data };
}
function rbHtml(model, key) {
  if (rbB().REPORTS[key].kind === 'leaders') return window.Leaders.render(model);   // MC Leaders draws itself in the same theme
  const tpl = (window.TEMPLATES || {})[RB_TPL[key]];
  if (tpl && window.Templater) { try { return window.Templater.render(tpl, model, rbB().REPORTS[key]); } catch (err) { console.error('template fill failed', err); } }
  return rbR().renderEmail(model);
}

// ---------------------------------------------------------------- the day's brand emails for the WFM manager: dailymail/<day> (a short record) and dailymail/<day>/brands/<key>
function rbPublishSoon() { clearTimeout(RB.pubT); RB.pubT = setTimeout(rbPublish, 1200); }
async function rbPublish() {
  if (!state.db || !canDailyTool() || !RB.date || !rbHasBrandData()) return;
  const p = rbPeriod(), dk = rbDayKeyOf(p), at = new Date().toISOString(), by = whoNow();
  let changed = false;
  for (const key of RB_BRANDS) {
    const doc = RB.docs[key]; if (!doc) continue;
    const sig = JSON.stringify(doc); if (RB.pubSig[dk + '|' + key] === sig) continue;
    try { await queueWrite(`dailymail/${dk}/brands/${key}`, () => state.db.doc(`dailymail/${dk}/brands/${key}`).set({ ...doc, at, by })); }
    catch (e) { toast(`The ${rbName(key)} email did not reach the WFM manager (${(e && e.code) || 'error'}).`); return; }
    RB.pubSig[dk + '|' + key] = sig; changed = true;
  }
  if (!changed && state.dmail[dk]) return;
  const brands = {};
  for (const key of RB_BRANDS) { const m = RB.models[key], d = RB.data[key]; brands[key] = { warn: d ? d.warnings.length : 0, kpis: m ? m.kpis.map(x => [x.label, x.value]) : [] }; }
  const light = { k: dk, date: p.end, start: p.start, end: p.end, multi: p.multi, at, by, files: RB.files.filter(f => !f.bad).length, brands };
  state.dmail[dk] = light;
  try { await queueWrite(`dailymail/${dk}`, () => state.db.doc(`dailymail/${dk}`).set(light)); } catch (e) { return; }
  markFresh('dailymail', `${rbDayLabel(light)} for the WFM manager`);
  rbSendRender();
  rbPrune();
}
/** report days older than 40 days are taken out (their emails were sent long ago) */
function rbPrune() {
  const cut = rbE().addDays(todayIso(), -RB_KEEP_DAYS);
  for (const [dk, x] of Object.entries(state.dmail)) {
    if (!x || !(x.end < cut)) continue;
    delete state.dmail[dk];
    for (const key of RB_BRANDS) queueWrite(`dailymail/${dk}/brands/${key}`, () => state.db.doc(`dailymail/${dk}/brands/${key}`).delete()).catch(() => {});
    queueWrite(`dailymail/${dk}`, () => state.db.doc(`dailymail/${dk}`).delete()).catch(() => {});
  }
}
let dmWatching = false;
const dmSubs = new Map();
function watchDailyMail(db) {
  if (dmWatching || !db || !Auth.user() || !(canDailyMail() || canDailyTool())) return; dmWatching = true;
  try {
    db.collection('dailymail').onSnapshot(sn => {
      const o = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.k && x.end) o[d.id] = x; });
      const fresh = canDailyMail() && Object.keys(o).some(k => !state.dmail[k] && state.dmailSeen);
      state.dmail = o; state.dmailSeen = true; state.rbVer++;
      if (rbVisible('dmail')) dmRender(false); else if (state.ws === 'wfm') renderWs(); else renderToday();
      if (fresh) toast('New daily emails are ready to send: WFM › Daily emails.');
      rbSendRender();
    }, () => { dmWatching = false; });
  } catch (e) { dmWatching = false; }
}
function dmBrandsOf(dk) {
  if (!dk || !state.db) return null;
  if (!dmSubs.has(dk)) {
    state.dmBrands[dk] = null;
    try {
      dmSubs.set(dk, state.db.collection(`dailymail/${dk}/brands`).onSnapshot(sn => {
        const o = {}; sn.docs.forEach(d => { const x = d.data(); if (x && x.key && x.period && x.data) o[x.key] = x; });
        state.dmBrands[dk] = o; state.rbVer++;
        if (rbVisible('dmail') && state.dmSel === dk) dmRender(true);
      }, () => { state.dmBrands[dk] = {}; }) || true);
    } catch (e) { state.dmBrands[dk] = {}; }
  }
  return state.dmBrands[dk];
}
function rbDayLabel(x) { const R = rbR(); if (!R) return x.k; return x.multi ? R.dayShort(x.start, x.end) + ' ' + R.niceRange(x.start, x.end) : R.dayName(x.end).slice(0, 3) + ' ' + R.niceRange(x.end, x.end); }
function rbSentOf(key, dk) { return (((state.rbPrefs[key] || {}).days || {})[dk] || {}).sent || null; }
/** report days with brand emails not marked sent yet, newest first */
function dmUnsent() { return Object.values(state.dmail).sort((a, b) => (a.end < b.end ? 1 : -1)).map(x => ({ x, left: RB_BRANDS.filter(k => !rbSentOf(k, x.k)) })).filter(o => o.left.length); }

// ---------------------------------------------------------------- what is on screen: the panel of one email (the editor, the checks, the actions and the preview)
function rbField(label, name, value, opts = {}) {
  return `<label class="fld${opts.wide ? ' wide' : ''}"><span>${esc(label)}</span>${opts.area ? `<textarea data-rbf="${name}" rows="2" placeholder="${esc(opts.ph || '')}">${esc(value || '')}</textarea>` : `<input type="text" data-rbf="${name}" value="${esc(value || '')}" placeholder="${esc(opts.ph || '')}" spellcheck="${opts.spell === false ? 'false' : 'true'}">`}</label>`;
}
function rbWarnHtml(list) {
  return list && list.length ? `<div class="rbwarn" role="status"><b><svg width="15" height="15" aria-hidden="true"><use href="#i-alert"/></svg>Check before sending</b><ul>${list.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : `<div class="rbok"><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg>Nothing to check: every export for this email is in.</div>`;
}
/** o: { key, dk, period, model, data, mine (the analyst's own email), sent, who } */
function rbPanelHtml(o) {
  const E = rbE(), R = rbR(), B = rbB(), key = o.key, cfg = B.REPORTS[key], p = o.period, P = state.rbPrefs[key] || {};
  const when = p.multi ? R.dayShort(p.start, p.end) + ' ' + R.niceRange(p.start, p.end) : p.end;
  let asa = '';
  if (cfg.channels && cfg.channels.length && o.data.asaOptions) {
    const ao = o.data.asaOptions;
    asa = `<div class="row2"><label class="fld"><span>Non-voice ASA rule${p.multi ? ' (all three days)' : ''}</span><select data-rbf="asaRule">${RB_RULES.map(([v, t]) => `<option value="${v}"${(P.asaRule || cfg.asaRule) === v ? ' selected' : ''}>${esc(t)} · ${esc(E.fmtDur(ao[v]))}</option>`).join('')}</select></label>${rbField('Override ASA' + (p.multi ? ' for ' + R.dayLabel(p.end) : '') + ' (h:mm:ss)', 'asaOverride', rbGet(key, 'asaOverride', o.dk), { ph: 'leave blank to use the rule', spell: false })}</div>`;
  }
  const sent = o.sent ? `<span class="rbsent"><svg width="14" height="14" aria-hidden="true"><use href="#i-check"/></svg>Sent ${esc(fmtWhen(o.sent.at))}${o.sent.by ? ' by ' + esc(o.sent.by) : ''}</span><button class="btn sm ghost" data-rba="unsent">Not sent yet</button>` : (o.mine ? '' : '<button class="btn" data-rba="sent"><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg>Mark as sent</button>');
  return `${rbWarnHtml(o.data.warnings)}
    <div class="editor">
      <div class="row">${rbField('Subject line', 'subject', o.model.subject)}</div>
      ${cfg.kind === 'leaders' ? '' : `<div class="row">${rbField('SLA insight for ' + when + ' (you write this)', 'insight', rbGet(key, 'insight', o.dk), { ph: 'e.g. BCRM termination issue + 1 absent agent.' })}</div>`}
      <div class="row2">${rbField('Greeting', 'greeting', o.model.greeting)}${rbField('Signature', 'signature', o.model.footer.signature)}</div>
      <div class="row">${rbField('Intro line', 'intro', o.model.intro)}</div>
      ${asa}
    </div>
    <div class="actions">
      <button class="btn primary" data-rba="copy"><svg width="15" height="15" aria-hidden="true"><use href="#i-copy"/></svg>Copy for Outlook</button>
      <button class="btn" data-rba="eml" title="Opens in Outlook as a new mail with the exact formatting"><svg width="15" height="15" aria-hidden="true"><use href="#i-mail"/></svg>Open in Outlook (.eml)</button>
      <button class="btn" data-rba="subject">Copy subject</button>
      <button class="btn" data-rba="html"><svg width="15" height="15" aria-hidden="true"><use href="#i-down"/></svg>Download .html</button>
      ${sent}
      <span class="sp"></span>
      <label class="chk"><input type="checkbox" data-rba="edit"> Edit text directly in the preview</label>
    </div>
    ${o.who ? `<p class="hint rbwho">${o.who}</p>` : ''}
    <div class="previewWrap"><div class="rbload" aria-hidden="true"><span class="spin"></span></div><iframe class="rbprev" title="Preview of the ${esc(rbName(key))} email" sandbox="allow-same-origin"></iframe></div>`;
}
/** every preview shows the email as it looks on a computer (900 px wide): a narrower panel shows it scaled down, never in its phone layout */
const RB_PREVIEW_W = 960;
let rbFitObs = null; const rbFitSeen = new WeakSet();
function rbFitOne(wrap) {
  const fr = wrap.querySelector('iframe'); if (!fr) return;
  const W = wrap.clientWidth; if (!W) return;
  const s = W < RB_PREVIEW_W && W >= 600 ? W / RB_PREVIEW_W : 1, H = Math.max(560, Math.round(innerHeight * 0.78));   // a phone keeps the email's phone layout
  fr.style.width = s < 1 ? RB_PREVIEW_W + 'px' : '100%'; fr.style.height = Math.round(H / s) + 'px';
  fr.style.transform = s < 1 ? `scale(${s.toFixed(4)})` : ''; fr.style.transformOrigin = '0 0';
  wrap.style.height = H + 'px';
}
function rbFitAll(root) {
  if (!root) return;
  if (!rbFitObs && 'ResizeObserver' in window) rbFitObs = new ResizeObserver(es => es.forEach(e => rbFitOne(e.target)));
  root.querySelectorAll('.previewWrap').forEach(w => { rbFitOne(w); if (rbFitObs && !rbFitSeen.has(w)) { rbFitSeen.add(w); rbFitObs.observe(w); } });
}
/** the preview frame shows `html` (resolves when it is in) */
function rbFrame(fr, html) {
  return new Promise(res => {
    if (!fr) return res();
    if (RB.frames.get(fr) === html) return res();
    RB.frames.set(fr, html);
    const wrap = fr.closest('.previewWrap'); if (wrap) wrap.classList.add('loading');
    fr.addEventListener('load', () => { if (wrap) wrap.classList.remove('loading'); fr.classList.add('in'); res(); }, { once: true });
    fr.srcdoc = html;
  });
}
/** the mail as it stands in the preview (with any direct edits), as the builder copied it */
function rbCurrentHtml(fr) {
  let doc = null; try { doc = fr && fr.contentDocument; } catch (e) { doc = null; }
  if (!doc || !doc.documentElement) doc = new DOMParser().parseFromString(RB.frames.get(fr) || '', 'text/html');
  // the browser adds <tbody> when it reads the page; the mail goes out with exactly the markup the template has
  return { html: '<!DOCTYPE html>' + doc.documentElement.outerHTML.replace(/<\/?tbody>/g, ''), text: doc.body ? doc.body.innerText : '' };
}
async function rbCopy(fr) {
  const { html, text } = rbCurrentHtml(fr);
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      toast('Copied. In Outlook press Ctrl+V, then choose Keep Source Formatting. For an exact copy use Open in Outlook (.eml).');
      return true;
    }
  } catch (err) { /* the older way below */ }
  const listener = ev => { ev.preventDefault(); ev.clipboardData.setData('text/html', html); ev.clipboardData.setData('text/plain', text); };
  document.addEventListener('copy', listener);
  const ok = document.execCommand('copy');
  document.removeEventListener('copy', listener);
  toast(ok ? 'Copied. Paste into Outlook with Ctrl+V.' : 'Copy blocked by the browser. Use Open in Outlook (.eml) instead.');
  return ok;
}
/* Outlook draft (.eml), as the builder made it: X-Unsent opens it as a new mail ready to send; every embedded image travels as an inline (cid) attachment */
function rbB64(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin).replace(/.{76}/g, '$&\r\n'); }
function rbMimeWord(s) { return /^[\x20-\x7E]*$/.test(s) ? s : '=?utf-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?='; }
function rbEml(html, subject) {
  const Bd = '----=_MemberCare_' + Date.now(), parts = [], seen = {};
  let n = 0;
  html = html.replace(/src="data:image\/(png|jpe?g|gif);base64,([^"]+)"/gi, (whole, type, data) => {
    const clean = data.replace(/\s+/g, '');
    if (!seen[clean]) {
      n++;
      const ext = /^jpe?g$/i.test(type) ? 'jpg' : type.toLowerCase(), mime = 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
      seen[clean] = 'mcimg' + n;
      parts.push('--' + Bd + '\r\nContent-Type: ' + mime + '; name="' + seen[clean] + '.' + ext + '"\r\n' + 'Content-Transfer-Encoding: base64\r\nContent-ID: <' + seen[clean] + '>\r\n' +
        'Content-Disposition: inline; filename="' + seen[clean] + '.' + ext + '"\r\n\r\n' + clean.replace(/.{76}/g, '$&\r\n') + '\r\n');
    }
    return 'src="cid:' + seen[clean] + '"';
  });
  const head = 'X-Unsent: 1\r\nSubject: ' + rbMimeWord(subject) + '\r\nTo: \r\nCc: \r\nMIME-Version: 1.0\r\n' + 'Content-Type: multipart/related; type="text/html"; boundary="' + Bd + '"\r\n\r\n' + 'This is a multi-part message in MIME format.\r\n\r\n';
  const body = '--' + Bd + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + rbB64(new TextEncoder().encode(html)) + '\r\n';
  return head + body + parts.join('') + '--' + Bd + '--\r\n';
}
const rbFileStem = (key, p) => key + '-' + (p.multi ? p.start + '_to_' + p.end : p.end);
/** the actions of a panel: host = the panel, ctx() = { key, dk, period, model } of what it shows */
async function rbAction(host, act, ctx) {
  const c = ctx(); if (!c || !c.model) return;
  const fr = host.querySelector('iframe.rbprev');
  if (act === 'subject') { const v = (host.querySelector('[data-rbf="subject"]') || {}).value || c.model.subject; try { await navigator.clipboard.writeText(v); toast('Subject copied.'); } catch (e) { toast('Copy blocked by the browser.'); } return; }
  await rbFlush(host);
  if (act === 'copy') { await rbCopy(fr); return; }
  if (act === 'eml') {
    const subject = (host.querySelector('[data-rbf="subject"]') || {}).value || c.model.subject || 'Member Care Summary Report', name = rbFileStem(c.key, c.period) + '.eml';
    try { await rbSave(name, new Blob([rbEml(rbCurrentHtml(fr).html, subject)], { type: 'message/rfc822' }), `Saved ${name}. Double-click it and Outlook opens the report as a new mail, ready to send.`); }
    catch (err) { toast('Could not build the Outlook file: ' + ((err && err.message) || err)); }
    return;
  }
  if (act === 'html') { const name = rbFileStem(c.key, c.period) + '.html'; await rbSave(name, new Blob([rbCurrentHtml(fr).html], { type: 'text/html' })); }
}
/** a file to the person's computer (inside claude.ai a type the page may not save goes inside a zip) */
async function rbSave(name, blob, okMsg) {
  let c = await saveRaw(name, blob);
  if (c === 'rejected_extension' || c === 'extension_not_enabled') {
    const zn = name.replace(/\.[^.]+$/, '') + '.zip';
    c = await saveRaw(zn, new Blob([await Core.writeZip([{ name, data: new Uint8Array(await blob.arrayBuffer()) }])], { type: 'application/zip' }));
    toast(c === 'ok' ? `Saved ${zn}. This view cannot save .${name.split('.').pop()} files directly, so it is inside the zip.` : saveMsg(c, zn)); return c === 'ok';
  }
  toast(c === 'ok' ? okMsg || saveMsg(c, name) : saveMsg(c, name)); return c === 'ok';
}
/** a preview waiting for its turn is drawn now */
async function rbFlush(host) { const t = RB.renderT.get(host); if (t) { clearTimeout(t.id); RB.renderT.delete(host); await t.fn(); } }
function rbLater(host, fn, ms) { const t = RB.renderT.get(host); if (t) clearTimeout(t.id); const o = { fn, id: setTimeout(() => { RB.renderT.delete(host); fn(); }, ms) }; RB.renderT.set(host, o); }
function rbEditMode(host, on) {
  const fr = host.querySelector('iframe.rbprev'); let doc = null; try { doc = fr && fr.contentDocument; } catch (e) { doc = null; }
  if (!doc || !doc.body) { toast('Editing in the preview is not available in this view.'); return; }
  doc.body.contentEditable = on ? 'true' : 'false';
  doc.body.style.outline = on ? '2px dashed #9aa' : 'none';
}

// ---------------------------------------------------------------- WFM › Report builder (the WFM analyst)
async function rbBoot() {
  if (RB.ready) return true;
  await rbLoad();
  if (state.db) await Promise.race([dhReady, new Promise(r => setTimeout(r, 4000))]);   // the shared history first
  if (RB.ready) return true;
  RB.bag = rbEmptyBag(); rbSetDate(rbE().ymdLocal(new Date(Date.now() - 86400000)), false);   // yesterday: on a Sunday that is Saturday, so the Thu–Sat report switches on by itself
  rbHist(); RB.ready = true;
  return true;
}
function rbShow() {
  const host = $('wfmRb');
  if (!host.dataset.built) {
    host.dataset.built = '1';
    host.innerHTML = `<div class="rbload big" role="status"><span class="spin"></span><span>Opening the report builder…</span></div>`;
    rbBoot().then(() => { rbSkeleton(); rbRebuild(); }).catch(e => { host.dataset.built = ''; host.innerHTML = emptyCard('The report builder could not open', (e && e.message) || String(e)); });
    return;
  }
  if (RB.ready && host.querySelector('.rbgrid')) { rbFilesRender(); rbSendRender(); rbHistRender(); }
}
function rbSkeleton() {
  const host = $('wfmRb');
  host.innerHTML = `<div class="rbgrid">
    <aside class="rbside">
      <div class="card rbcard"><div class="rbstep"><span class="n">1</span><div><h2>Report day</h2><p class="cap">Follows the newest day in the exports unless you pick one.</p></div></div>
        <div class="rbdate"><label class="wsfield"><span>Report date</span><input type="date" class="cell" data-rbdate></label>
        <label class="rbsun" title="On Sundays the report covers Thursday, Friday and Saturday"><input type="checkbox" data-rbsun><span>Sunday report<b data-rbper>off</b></span></label></div></div>
      <div class="card rbcard"><div class="rbstep"><span class="n">2</span><div><h2>Drop the exports</h2><p class="cap">Read here, in this browser. Only the numbers are kept.</p></div></div>
        <div class="drop rbdrop" data-rbdrop role="button" tabindex="0" aria-label="Drop the day's exports, or choose them"><svg aria-hidden="true"><use href="#i-up"/></svg><strong>Drop files here</strong><span>Genesys CSVs (calls, social, queue, and the WFM agent exports), the two Crystal .xls files and the FRiENDi Pay tickets sheet, or click to browse</span></div>
        <input type="file" multiple accept=".csv,.xls,.xlsx" hidden data-rbpick>
        <div class="rbfiles" data-rbfiles></div>
        <div class="rbmini"><button class="btn sm ghost" data-rbclear>Clear files</button></div>
        <details class="rbhelp"><summary>What to drop</summary><p>On Sunday, drop Thursday's, Friday's and Saturday's Genesys exports (one set per day, ideally one drop per day), the two Crystal files for Thu–Sat, and the FRiENDi Pay "Tickets by Category" sheet. Queue exports carry no date, so each one takes the day of the files dropped or exported with it; change it in the list if needed. The MC Leaders email is filled from the same Crystal tickets export, so there is nothing extra to drop. For the WFM Daily Review, also drop that day's agent performance, agent status, interactions, adherence (one per brand) and schedule exports.</p></details></div>
      <div class="card rbcard"><div class="rbstep"><span class="n">3</span><div><h2>FRiENDi Pay tickets</h2><p class="cap">Only when there is no tickets sheet to drop.</p></div></div>
        <textarea class="rbta" data-rbfpay placeholder="Paste the ticket table from your email here (Date · Category · SubCategory), header row included."></textarea>
        <p class="hint">Easiest: drop the tickets sheet in step 2. Monday to Thursday that is the Date · Category .xlsx, Sunday the "Tickets by Category" sheet. "Category::SubCategory" is split for you, and a dropped sheet takes over from anything pasted here.</p></div>
      <div class="card rbcard"><div class="rbstep"><span class="n">4</span><div><h2>History</h2><p class="cap">Month to date and the monthly averages come from here.</p></div></div>
        <p class="hint">Every day in the exports you drop is saved by itself, for everyone and not only in this browser, including earlier days you drop to fill a gap.</p>
        <p class="hint rbhist" data-rbhist></p>
        <div class="rbmini"><button class="btn sm" data-rbhexp><svg width="14" height="14" aria-hidden="true"><use href="#i-down"/></svg>Export backup</button><label class="btn sm">Import backup<input type="file" accept=".json" hidden data-rbhimp></label></div></div>
    </aside>
    <section class="rbmain">
      <div class="card rbsend" data-rbsend></div>
      <div class="seg rbtabs" role="group" aria-label="Emails made here" data-rbtabs></div>
      <div class="rbpanel" data-rbp="leaders"></div>
      <div class="rbpanel rbwfm" data-rbp="wfm" hidden></div>
    </section>
  </div>`;
  host.querySelector('[data-rbfpay]').value = state.rbIn.fpayTickets || '';
  reveal(host);
}
function rbRender() {
  const host = $('wfmRb'); if (!host.querySelector('.rbgrid')) return;
  rbDateRender(); rbFilesRender(); rbHistRender(); rbSendRender(); rbTabsRender(); rbPanelRender();
}
function rbDateRender() {
  const host = $('wfmRb'), R = rbR(), p = rbPeriod(), d = host.querySelector('[data-rbdate]'), s = host.querySelector('[data-rbsun]');
  if (d && d.value !== RB.date) d.value = RB.date;
  if (s) { s.checked = RB.weekend; s.closest('.rbsun').classList.toggle('on', RB.weekend); }
  const t = host.querySelector('[data-rbper]'); if (t) t.textContent = RB.weekend ? R.dayShort(p.start, p.end) + ' · ' + R.niceRange(p.start, p.end) : 'off';
}
function rbFilesRender() {
  const box = $('wfmRb').querySelector('[data-rbfiles]'); if (!box) return;
  const R = rbR(), E = rbE();
  if (RB.busy) { box.innerHTML = `<p class="hint"><span class="spin" aria-hidden="true"></span> ${esc(RB.busy)}</p>`; return; }
  if (!RB.files.length) { box.innerHTML = '<p class="hint">No files yet.</p>'; return; }
  const p = RB.date ? rbPeriod() : null, choices = new Set(p ? p.days : []);
  ['calls', 'sm', 'queue'].forEach(t => Object.keys(RB.bag.dated[t]).forEach(b => Object.keys(RB.bag.dated[t][b]).forEach(d => choices.add(d))));
  const dayList = Array.from(choices).sort();
  box.innerHTML = RB.files.map(f => {
    let tag = esc(f.label), bad = f.bad;
    const u = f.undated ? RB.bag.undated.find(x => x.id === f.undated) : null;
    if (u) {
      bad = p && p.multi && !u.day;
      tag += ` · <select class="uday" data-rbuday="${esc(u.id)}" title="${esc(u.how ? 'Matched: ' + u.how : 'This export has no date column. Pick the day it covers')}"><option value="">${p && p.multi ? 'which day?' : 'report day'}</option>${dayList.map(d => `<option value="${d}"${u.day === d ? ' selected' : ''}>${R.dayName(d).slice(0, 3)} ${R.dayLabel(d)}</option>`).join('')}</select>`;
    }
    return `<div class="rbfile${bad ? ' bad' : ''}${f.wfm ? ' wfm' : ''}"><span class="fname" title="${esc(f.name)}">${esc(f.name)}</span><span class="ftag">${tag}</span></div>`;
  }).join('') + `<p class="hint rbcount">${plural(RB.files.filter(f => !f.bad).length, 'file')} read${E ? '' : ''}${RB.files.some(f => f.bad) ? ` · ${RB.files.filter(f => f.bad).length} to look at` : ''}</p>`;
}
function rbHistRender() {
  const el = $('wfmRb').querySelector('[data-rbhist]'); if (!el || !RB.date) return;
  const R = rbR(), miss = new Set(); RB_BRANDS.forEach(k => rbMissingDays(k).forEach(d => miss.add(d)));
  const month = R.FULL[+RB.date.slice(5, 7) - 1];
  el.innerHTML = miss.size ? `<b class="warnline">Missing in ${esc(month)}: ${esc(rbShortDays(Array.from(miss).sort()))}</b>. Drop those days' Genesys exports to add them.` : `History is complete for ${esc(month)} up to the report.`;
  if (RB.lastSaved) { const t = RB.lastSaved.at; el.innerHTML += `<br>✓ Saved to history: ${esc(rbShortDays(RB.lastSaved.days))} (${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')})`; }
}
/** the four brand emails this day: on their way to the WFM manager, their checks, sent or not */
function rbSendRender() {
  const el = $('wfmRb') && $('wfmRb').querySelector('[data-rbsend]'); if (!el || !RB.ready || !RB.date) return;
  const p = rbPeriod(), dk = rbDayKeyOf(p), pub = state.dmail[dk], has = rbHasBrandData();
  const chip = key => {
    const d = RB.data[key], sent = rbSentOf(key, dk), w = d ? d.warnings.length : 0;
    const st = sent ? `<b class="ok">Sent</b><small>${esc(fmtWhen(sent.at))}${sent.by ? ' · ' + esc(sent.by) : ''}</small>` : !has ? '<b>Waiting</b><small>for the exports</small>' : w ? `<b class="warn">${plural(w, 'check')}</b><small>${pub ? 'with the WFM manager' : 'on its way'}</small>` : `<b class="ok">Ready</b><small>${pub ? 'with the WFM manager' : 'on its way'}</small>`;
    return `<li class="${sent ? 'sent' : !has ? 'idle' : w ? 'warn' : 'ok'}" data-peek="${key}" tabindex="0" aria-label="${esc(rbName(key))}: ${sent ? 'sent' : !has ? 'waiting for the exports' : w ? plural(w, 'check') : 'ready'}. Hover or focus to see the email"><span class="bn">${esc(rbName(key))}</span>${st}${has && d && w && !sent ? `<details><summary>What to check</summary><ul>${d.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}</li>`;
  };
  el.innerHTML = `<div class="cardhead"><div><h2>Brand emails · sent to the WFM manager</h2><p class="cap">${has ? (pub ? `With the WFM manager since ${esc(fmtWhen(pub.at))}${pub.by ? ' (' + esc(pub.by) + ')' : ''}: he writes the SLA insight and sends them. Anything you drop now updates them.` : 'Going to the WFM manager now…') : 'Drop the Genesys and Crystal exports: Virgin Postpaid, Virgin Mobile, FRiENDi Mobile and FRiENDi Pay are made from them and go straight to the WFM manager.'}</p></div></div><ul class="rbbrands">${RB_BRANDS.map(chip).join('')}</ul>`;
}
function rbTabsRender() {
  const el = $('wfmRb').querySelector('[data-rbtabs]'); if (!el) return;
  if (!RB_MINE.includes(state.rbActive)) state.rbActive = 'leaders';
  el.innerHTML = RB_MINE.map(k => { const w = RB.data[k] && RB.data[k].warnings && RB.data[k].warnings.length; return `<button data-rbtab="${k}" aria-pressed="${state.rbActive === k}">${esc(rbName(k))}${w ? `<span class="cnt warn" aria-label="${plural(w, 'check')}">${w}</span>` : ''}</button>`; }).join('');
  requestAnimationFrame(() => segThumb(el));
}
function rbPanelRender() {
  const host = $('wfmRb'), act = state.rbActive;
  host.querySelectorAll('[data-rbp]').forEach(el => { el.hidden = el.dataset.rbp !== act; });
  if (act === 'wfm') {
    const el = host.querySelector('[data-rbp="wfm"]');
    if (window.WFM) window.WFM.panel(el, { toast, onChange: () => { RB.data.wfm = { warnings: window.WFM.issues() }; rbTabsRender(); rbAgentsDay(); rbFitAll(el); } });
    rbFitAll(el);
    return;
  }
  const el = host.querySelector('[data-rbp="leaders"]'), model = RB.models.leaders, data = RB.data.leaders; if (!model) return;
  const p = rbPeriod(), dk = rbDayKeyOf(p), keep = rbFocus(el);
  el.innerHTML = rbPanelHtml({ key: 'leaders', dk, period: p, model, data, mine: true, who: '' });
  rbRefocus(el, keep); rbFitAll(el);
  rbFrame(el.querySelector('iframe.rbprev'), rbHtml(model, 'leaders'));
}
/** the field being typed in survives a redraw */
function rbFocus(el) { const a = document.activeElement; return a && el.contains(a) && a.dataset && a.dataset.rbf ? { f: a.dataset.rbf, s: a.selectionStart, e: a.selectionEnd } : null; }
function rbRefocus(el, k) { if (!k) return; const a = el.querySelector(`[data-rbf="${k.f}"]`); if (a) { a.focus({ preventScroll: true }); try { a.setSelectionRange(k.s, k.e); } catch (e) { /* a select */ } } }
/** the WFM Daily Review was built: each agent's day is kept for everyone */
function rbAgentsDay() {
  const S = window.WFM && window.WFM._state, M = S && S.model;
  if (!M || M === RB.agentsModel) return; RB.agentsModel = M;
  if (!canDailySave()) return;
  try { storeDay(rbDayOf(M)); } catch (e) { console.error('[MC] agents\' day:', e); }
}
function rbDayOf(M) {
  const T = { A: M.cfg.teamA, B: M.cfg.teamB, C: M.cfg.teamC }, o = [];
  M.agents.forEach(a => { o.push({ n: a.agent, t: T[a.team] || '', adh: a.adh, conf: a.conf, sch: Math.round(a.schedMins || a.sched || 0), log: Math.round(a.loggedMins || 0), ans: a.answered || 0, hnd: a.handled || 0, th: Math.round(a.totalHandle || 0), tt: Math.round(a.totalTalk || 0), tho: Math.round(a.totalHold || 0), ta: Math.round(a.totalAcw || 0), held: a.held || 0, xfer: a.transferred || 0, out: a.outbound || 0, rona: a.ronaCount || 0, short: a.short || 0, lv: a.leave ? (a.leaveType || 'Leave') : '', abs: !!a.absent, late: a.tardy || 0, xc: !!a.excused, sm: a.shortMins || 0, brk: a.breakUpdates || 0, exc: a.excCount || 0, trn: !!a.training, off: !!a.offSchedule }); });
  const d = M.dept || {};
  return { date: M.cfg.date, agents: o, dept: { adh: d.adherence, conf: d.conformance, occ: d.occupancy, cov: d.coverage, sched: d.scheduled, worked: d.worked, ans: d.answered } };
}
function rbExportHistory() { rbSave('member-care-history-' + todayIso() + '.json', new Blob([JSON.stringify(rbHist(), null, 1)], { type: 'application/json' })); }
async function rbImportHistory(file) {
  try {
    const H = JSON.parse(await file.text()); if (!H || typeof H !== 'object') throw new Error('bad');
    RB.hist = H; lsPut(DH_KEY, JSON.stringify(H)); rbHistPush(H);
    toast('History replaced.'); rbRebuild();
  } catch (e) { toast('That file is not valid history JSON.'); }
}

// events: the analyst's builder
$('wfmRb').addEventListener('click', e => {
  const t = e.target;
  const tb = t.closest('[data-rbtab]'); if (tb) { state.rbActive = tb.dataset.rbtab; rbTabsRender(); rbPanelRender(); return; }
  if (t.closest('[data-rbdrop]')) { $('wfmRb').querySelector('[data-rbpick]').click(); return; }
  if (t.closest('[data-rbclear]')) { if (window.WFM) window.WFM.clear(); RB.bag = rbEmptyBag(); RB.files = []; RB.lastSaved = null; rbRebuild(); toast('Files cleared. What was already sent to the WFM manager stays with him.'); return; }
  if (t.closest('[data-rbhexp]')) { rbExportHistory(); return; }
  const a = t.closest('[data-rba]'); if (a && a.tagName === 'BUTTON') { const host = a.closest('.rbpanel'); rbAction(host, a.dataset.rba, () => ({ key: 'leaders', dk: rbDayKeyOf(rbPeriod()), period: rbPeriod(), model: RB.models.leaders })); }
});
// ---- a brand box shows its email, small and whole, while the pointer rests on it (or it has the keyboard focus): how the email
// the tool made looks now, without opening it. Read only; it follows the pointer's box and never covers it.
let rbPeekEl = null, rbPeekT = 0, rbPeekOn = null;
const RB_PEEK = { w: 380, h: 500 };   // the largest the small view gets; the whole email is scaled into it
function rbPeekModel(box) {
  const key = box.dataset.peek || box.dataset.dmtab; if (!RB_BRANDS.includes(key)) return null;
  if (box.dataset.dmtab) { const dk = state.dmSel, docs = state.dmBrands[dk], doc = docs && docs[key]; return doc ? { key, model: rbBrandBuild(key, doc, dk).model } : null; }
  return RB.models && RB.models[key] ? { key, model: RB.models[key] } : null;
}
function rbPeekPlace(box) {
  const el = rbPeekEl; if (!el || !box.isConnected) return;
  const r = box.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight, gap = 10;
  let x = r.right + gap, y = r.top;   // beside the box when there is room, else under (or over) it
  if (x + w > vw - 8) x = r.left - gap - w;
  if (x < 8) { x = Math.min(Math.max(8, r.left), vw - w - 8); y = r.bottom + gap; if (y + h > vh - 8) y = r.top - gap - h; }
  y = Math.min(Math.max(8, y), Math.max(8, vh - h - 8));
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
}
function rbPeekShow(box) {
  const m = rbPeekModel(box); if (!m) return;
  let html = ''; try { html = rbHtml(m.model, m.key); } catch (e) { return; }
  if (!rbPeekEl) {
    rbPeekEl = document.createElement('div'); rbPeekEl.className = 'rbpeek'; rbPeekEl.setAttribute('aria-hidden', 'true');
    rbPeekEl.innerHTML = '<div class="rbpeekin"><iframe tabindex="-1" title="Email preview" sandbox="allow-same-origin"></iframe></div><small></small>';
    document.body.appendChild(rbPeekEl);
  }
  rbPeekOn = box;
  const el = rbPeekEl, fr = el.querySelector('iframe'), inner = el.querySelector('.rbpeekin');
  el.querySelector('small').textContent = `${rbName(m.key)} · the email as it is now`;
  fr.onload = () => {
    if (rbPeekOn !== box) return;
    try {
      const d = fr.contentDocument, W = Math.max(480, d.documentElement.scrollWidth, d.body.scrollWidth); fr.style.width = W + 'px';
      const H = Math.max(200, d.documentElement.scrollHeight, d.body.scrollHeight), s = Math.min(RB_PEEK.w / W, RB_PEEK.h / H, 1);
      fr.style.height = H + 'px'; fr.style.transform = `scale(${s.toFixed(4)})`;
      inner.style.width = Math.ceil(W * s) + 'px'; inner.style.height = Math.ceil(H * s) + 'px';
      el.hidden = false; rbPeekPlace(box); el.classList.add('in');
    } catch (e) { /* a preview only */ }
  };
  fr.style.width = '760px'; fr.style.height = '600px'; fr.srcdoc = html;
}
function rbPeekHide() { clearTimeout(rbPeekT); rbPeekOn = null; if (rbPeekEl) { rbPeekEl.classList.remove('in'); rbPeekEl.hidden = true; } }
const rbPeekHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
for (const host of [$('wfmRb'), $('wfmDm')]) {
  host.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('[data-peek], [data-dmtab]'); if (!b || b === rbPeekOn || !rbPeekHover()) return; clearTimeout(rbPeekT); rbPeekT = setTimeout(() => rbPeekShow(b), 250); });
  host.addEventListener('mouseout', e => { const b = e.target.closest && e.target.closest('[data-peek], [data-dmtab]'); if (!b || (e.relatedTarget && b.contains(e.relatedTarget))) return; rbPeekHide(); });
  host.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('[data-peek]'); if (b && e.target === b) rbPeekShow(b); });
  host.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-peek]')) rbPeekHide(); });
  host.addEventListener('click', () => rbPeekHide());
}
window.addEventListener('scroll', () => { if (rbPeekOn) rbPeekHide(); }, { passive: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && rbPeekOn) rbPeekHide(); });
$('wfmRb').addEventListener('keydown', e => { const z = e.target.closest && e.target.closest('[data-rbdrop]'); if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('wfmRb').querySelector('[data-rbpick]').click(); } });
$('wfmRb').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-rbpick]')) { if (t.files && t.files.length) rbAddFiles([...t.files]); t.value = ''; return; }
  if (t.matches('[data-rbhimp]')) { if (t.files && t.files[0]) rbImportHistory(t.files[0]); t.value = ''; return; }
  if (t.matches('[data-rbdate]')) { if (t.value) { rbSetDate(t.value, true); rbRebuild(); } return; }
  if (t.matches('[data-rbsun]')) { RB.weekend = t.checked; rbRebuild(); return; }
  if (t.matches('[data-rbuday]')) { const u = RB.bag.undated.find(x => x.id === t.dataset.rbuday); if (!u) return; u.day = t.value || null; u.how = 'set by hand'; rbComposeBag(); rbAutoSave(); rbRebuild(); return; }
  if (t.matches('[data-rba="edit"]')) { rbEditMode(t.closest('.rbpanel'), t.checked); return; }
  if (t.matches('select[data-rbf]')) rbFieldIn(t);
});
$('wfmRb').addEventListener('input', e => {
  const t = e.target;
  if (t.matches('[data-rbfpay]')) { state.rbIn.fpayTickets = t.value; rbInSave(); rbRebuildSoon(); return; }
  if (t.matches('input[data-rbf], textarea[data-rbf]')) rbFieldIn(t);
});
function rbFieldIn(t) {   // MC Leaders' fields (the analyst's own email): the preview follows, the fields stay as typed
  const p = rbPeriod(), dk = rbDayKeyOf(p), f = t.dataset.rbf, host = t.closest('.rbpanel');
  rbSet('leaders', f, t.value, dk);
  RB.models.leaders = rbLeadersModel(p, dk);
  if (f === 'subject') return;   // the subject is not in the mail itself
  rbLater(host, () => rbFrame(host.querySelector('iframe.rbprev'), rbHtml(RB.models.leaders, 'leaders')), 300);
}
['dragenter', 'dragover'].forEach(ev => $('wfmRb').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-rbdrop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
['dragleave', 'drop'].forEach(ev => $('wfmRb').addEventListener(ev, e => { const z = e.target.closest && e.target.closest('[data-rbdrop]'); if (z) { e.preventDefault(); if (ev === 'drop') e.stopPropagation(); z.classList.remove('over'); if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files.length) rbAddFiles([...e.dataTransfer.files]); } }));   // read once: the page's own drop handler does not see it

// ---------------------------------------------------------------- WFM › Daily emails (the WFM manager): the four brand emails, to read, finish and send
function dmShow() {
  const host = $('wfmDm');
  if (!host.dataset.built) {
    host.dataset.built = '1';
    host.innerHTML = `<div class="rbload big" role="status"><span class="spin"></span><span>Opening the daily emails…</span></div>`;
    rbLoad().then(() => { host.innerHTML = `<div class="card dmhead" data-dmhead></div><div class="seg rbtabs" role="group" aria-label="Brand emails" data-dmtabs></div><div class="rbpanel" data-dmpanel></div>`; dmRender(true); }).catch(e => { host.dataset.built = ''; host.innerHTML = emptyCard('The daily emails could not open', (e && e.message) || String(e)); });
    return;
  }
  if (host.querySelector('[data-dmhead]')) dmRender(false);
}
function dmDays() { return Object.values(state.dmail).sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : 0)); }
/** full: redraw the email panel too (a new day or new data); otherwise only the head, tabs and checks */
function dmRender(full) {
  const host = $('wfmDm'), head = host.querySelector('[data-dmhead]'); if (!head || !rbB()) return;
  const L = dmDays();
  if (!L.length) { head.innerHTML = ''; head.hidden = true; host.querySelector('[data-dmtabs]').innerHTML = ''; host.querySelector('[data-dmpanel]').innerHTML = emptyCard('No daily emails yet', 'The WFM analyst drops the day\'s exports in Report builder; Virgin Postpaid, Virgin Mobile, FRiENDi Mobile and FRiENDi Pay then appear here, ready to read and send.'); return; }
  head.hidden = false;
  if (!L.some(x => x.k === state.dmSel)) { state.dmSel = L[0].k; full = true; }
  const x = state.dmail[state.dmSel], dk = x.k, docs = dmBrandsOf(dk);
  if (!RB_BRANDS.includes(state.dmActive)) state.dmActive = 'postpaid';
  const sentN = RB_BRANDS.filter(k => rbSentOf(k, dk)).length;
  head.innerHTML = `<div class="dmday"><label class="wsfield"><span>Report day</span><select class="cell" data-dmday aria-label="Report day">${L.map(y => { const left = RB_BRANDS.filter(k => !rbSentOf(k, y.k)).length; return `<option value="${esc(y.k)}"${y.k === dk ? ' selected' : ''}>${esc(rbDayLabel(y))}${left ? ` · ${left} to send` : ' · all sent'}</option>`; }).join('')}</select></label>
    <p class="cap">Made by ${esc(x.by || 'the WFM analyst')} from ${plural(x.files || 0, 'file')} · ${esc(fmtWhen(x.at))}</p></div>
    <div class="dmprog" aria-label="${sentN} of 4 sent"><span class="pbar"><i style="width:${Math.round(sentN / 4 * 100)}%"></i></span><b>${sentN} / 4</b><small>sent</small></div>`;
  const tabs = host.querySelector('[data-dmtabs]');
  tabs.innerHTML = RB_BRANDS.map(k => { const b = (x.brands || {})[k] || {}, s = rbSentOf(k, dk); return `<button data-dmtab="${k}" aria-pressed="${state.dmActive === k}">${s ? '<svg width="13" height="13" aria-hidden="true"><use href="#i-check"/></svg>' : ''}${esc(rbName(k))}${!s && b.warn ? `<span class="cnt warn" aria-label="${plural(b.warn, 'check')}">${b.warn}</span>` : ''}</button>`; }).join('');
  requestAnimationFrame(() => segThumb(tabs));
  const panel = host.querySelector('[data-dmpanel]');
  if (!docs) { panel.innerHTML = `<div class="card rbskel" aria-busy="true"><span class="sk w40"></span><span class="sk w90"></span><span class="sk w70"></span><span class="sk tall"></span></div>`; panel.dataset.dk = ''; return; }
  const doc = docs[state.dmActive];
  if (!doc) { panel.innerHTML = emptyCard(`No ${rbName(state.dmActive)} email for this day`, 'The WFM analyst has not dropped its exports yet.'); panel.dataset.dk = ''; return; }
  const sig = dk + '|' + state.dmActive + '|' + doc.at;
  if (!full && panel.dataset.dk === sig) { dmRefresh(panel, doc, dk); return; }
  panel.dataset.dk = sig;
  const keep = rbFocus(panel), b = rbBrandBuild(state.dmActive, doc, dk);
  panel.innerHTML = rbPanelHtml({ key: state.dmActive, dk, period: doc.period, model: b.model, data: b.data, mine: false, sent: rbSentOf(state.dmActive, dk), who: `Built from the exports ${esc(doc.by || 'the WFM analyst')} dropped, ${esc(fmtWhen(doc.at))}.` });
  rbRefocus(panel, keep); rbFitAll(panel); panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
  rbFrame(panel.querySelector('iframe.rbprev'), rbHtml(b.model, state.dmActive));
}
/** the same email with the WFM manager's changes: the checks, the sent line and the preview follow; the fields stay as typed */
function dmRefresh(panel, doc, dk) {
  const key = state.dmActive, b = rbBrandBuild(key, doc, dk);
  const w = panel.querySelector('.rbwarn, .rbok'); if (w) w.outerHTML = rbWarnHtml(b.data.warnings);
  const acts = panel.querySelector('.actions'), s = rbSentOf(key, dk);
  if (acts) { acts.querySelectorAll('.rbsent, [data-rba="sent"], [data-rba="unsent"]').forEach(n => n.remove()); acts.querySelector('.sp').insertAdjacentHTML('beforebegin', s ? `<span class="rbsent"><svg width="14" height="14" aria-hidden="true"><use href="#i-check"/></svg>Sent ${esc(fmtWhen(s.at))}${s.by ? ' by ' + esc(s.by) : ''}</span><button class="btn sm ghost" data-rba="unsent">Not sent yet</button>` : '<button class="btn" data-rba="sent"><svg width="15" height="15" aria-hidden="true"><use href="#i-check"/></svg>Mark as sent</button>'); }
  rbFrame(panel.querySelector('iframe.rbprev'), rbHtml(b.model, key));
}
const dmCtx = () => { const dk = state.dmSel, docs = state.dmBrands[dk], doc = docs && docs[state.dmActive]; if (!doc) return null; return { key: state.dmActive, dk, period: doc.period, model: rbBrandBuild(state.dmActive, doc, dk).model, doc }; };
/** the ASA the WFM manager chose goes to the history too, so tomorrow's month to date shows what was sent */
function dmHistAsa(key, doc, dk) {
  const B = rbB(), E = rbE(), cfg = B.REPORTS[key]; if (!cfg.channels.length || cfg.nvFrom || !canDailySave()) return;
  const P = state.rbPrefs[key] || {}, src = (doc.nvDays || {})[P.asaRule || cfg.asaRule]; if (!src || !Object.keys(src).length) return;
  const H = rbClone(state.dhist || {}), h = H[key] = H[key] || {}; h.nonvoice = h.nonvoice || { monthly: [], daily: [] };
  let changed = false;
  for (const d of Object.keys(src).sort()) {   // every day the analyst dropped, as the builder saved them again under the new rule
    const nv = Object.assign({}, src[d]), ov = d === doc.period.end ? rbGet(key, 'asaOverride', dk) : '';
    if (ov && E.dur(ov) !== null) nv.asa = E.dur(ov);
    if (rbKeep(h.nonvoice.daily, d, nv)) changed = true;
  }
  if (changed) rbHistPush(H);
}
$('wfmDm').addEventListener('click', e => {
  const t = e.target;
  const tb = t.closest('[data-dmtab]'); if (tb) { state.dmActive = tb.dataset.dmtab; dmRender(true); return; }
  const a = t.closest('[data-rba]'); if (!a || a.tagName !== 'BUTTON') return;
  const act = a.dataset.rba, dk = state.dmSel, key = state.dmActive;
  if (act === 'sent' || act === 'unsent') {
    rbSet(key, 'sent', act === 'sent' ? { at: new Date().toISOString(), by: whoNow() } : null, dk);
    dmRender(false); renderToday(); toast(act === 'sent' ? `${rbName(key)} marked as sent.` : `${rbName(key)} is back to not sent.`);
    if (act === 'sent') { const next = RB_BRANDS.find(k => !rbSentOf(k, dk)); if (next) setTimeout(() => { if (state.dmSel === dk && state.dmActive === key) { state.dmActive = next; dmRender(true); } }, 900); }
    return;
  }
  rbAction(a.closest('.rbpanel'), act, dmCtx);
});
$('wfmDm').addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-dmday]')) { state.dmSel = t.value; dmRender(true); return; }
  if (t.matches('[data-rba="edit"]')) { rbEditMode(t.closest('.rbpanel'), t.checked); return; }
  if (t.matches('select[data-rbf]')) dmFieldIn(t);
});
$('wfmDm').addEventListener('input', e => { const t = e.target; if (t.matches('input[data-rbf], textarea[data-rbf]')) dmFieldIn(t); });
function dmFieldIn(t) {
  const c = dmCtx(); if (!c) return;
  const f = t.dataset.rbf, key = c.key, dk = c.dk, panel = t.closest('.rbpanel');
  if (f === 'asaRule') { rbSet(key, 'asaRule', t.value, dk); dmHistAsa(key, c.doc, dk); dmRender(true); return; }
  rbSet(key, f, t.value, dk);
  if (f === 'subject') return;   // the subject is not in the mail itself
  rbLater(panel, async () => { const doc = (state.dmBrands[dk] || {})[key]; if (!doc || state.dmSel !== dk || state.dmActive !== key) return; dmRefresh(panel, doc, dk); if (f === 'asaOverride') dmHistAsa(key, doc, dk); await rbFrame(panel.querySelector('iframe.rbprev'), rbHtml(rbBrandBuild(key, doc, dk).model, key)); }, 300);
}
