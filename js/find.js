// ================================================================ SEARCH: one box on every page that guesses what you want
// Ctrl+K (or /) opens it, on every page and for every role. Type a line in plain words: a person, a measure, a month or a day,
// a team, a brand, a supervisor or a page ("Tala AHT", "lowest adherence Virgin", "absent yesterday", "below target August",
// "supervisors not finished", "my one-to-one"). It answers straight away, completes the word being typed (Tab), offers the next
// words, and learns: what each person picks comes first next time (kept in this browser only). It reads only what the signed-in
// person may see: a supervisor their own team, the quality team the KPI results, an agent their own page.
const FIND = { q: '', sel: -1, items: [], acts: [], ghost: '', idx: null, idxSig: '', prev: null, t: 0, wait: 0 };

// ---------------------------------------------------------------- words
/** lower case, no accents or Arabic marks, one space between words */
const fnorm = s => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[\u0623\u0625\u0622]/g, '\u0627').replace(/\u0649/g, '\u064a').replace(/\u0629/g, '\u0647').replace(/[’'`´]/g, '').replace(/[^\p{L}\p{N}%<>=.:/\-\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const fwords = s => fnorm(s).replace(/[-/:.,]/g, ' ').split(' ').filter(Boolean);
/** edit distance (a swap of two letters counts as one), giving up past `max` */
function flev(a, b, max) {
  if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = b.length; let p2 = null, p1 = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let lo = i;
    for (let j = 1; j <= m; j++) {
      let c = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) c = Math.min(c, p2[j - 2] + 1);
      cur.push(c); if (c < lo) lo = c;
    }
    if (lo > max) return max + 1; p2 = p1; p1 = cur;
  }
  return p1[m];
}
/** how well a typed word fits a word of a name: exact, the start of it (the word being typed), the same sound, one typo */
function ftok(q, w, partial) {
  if (!q || !w) return 0; if (q === w) return 1;
  if (w.startsWith(q)) return partial ? (q.length >= 2 || w.length <= 3 ? 0.9 : 0.62) : q.length >= 3 ? 0.8 : 0;
  if (q.length >= 4 && w.length >= 4) {
    const a = nameSkel(q), b = nameSkel(w);
    if (a.length >= 3 && a === b) return 0.85;   // Mohamed / Muhammad, Alshubily / Alshubaily
    const d = flev(q, w, 2); if (d === 1) return 0.8; if (d === 2 && q.length >= 7) return 0.66;
    if (partial && a.length >= 3 && b.startsWith(a)) return 0.7;
  }
  return 0;
}
const F_STOP = new Set(('the a an of in on for at to by with and or is are was were be what whats which show me find search list give tell please about from per all every any '
  + 'agents agent people person staff employee employees s do does did has have had their his her its this that these those month day value number numbers result '
  + 'في من على عن ما هو هي هل').split(' '));

// ---------------------------------------------------------------- the vocabulary
/** each measure: what people call it (English and a few Arabic words), and which way is better (1 higher, -1 lower, 0 neither) */
const F_SYN = {
  adh: ['adherence|adh|adhere|adherance|schedule adherence|التزام|الالتزام', 1], adhUnder: ['days under target|days under|under target days|low days', -1],
  aht: ['aht|handle time|handling time|average handle time|handle|handling|مدة المكالمه', -1], worked: ['worked days|worked|days worked|attended|attendance days|present', 1],
  absent: ['absent|absence|absences|absent days|no show|غياب|غائب|الغياب', -1], tardy: ['tardy|tardiness|late|lateness|late minutes|tardy minutes|تاخير|التاخير|تاخر', -1],
  leave2: ['leave|leaves|annual leave|sick leave|vacation|اجازه|الاجازات', 0], ded: ['deduction|deductions|deducted|conformance deduction|minutes deducted|خصم|الخصم', -1],
  conf: ['conformance|conf', 1], fin: ['final|final %|final percent|final percentage|kpi|kpis|score|scorecard|performance score|النتيجه|التقييم', 1],
  earned: ['earned|incentive|incentives|sr|earned sr|bonus|reward|payout|حافز|الحافز|حوافز|الحوافز', 1],
  ans: ['answered|answered calls|answers', 1], hnd: ['handled|handled calls', 1], pAht: ['average handle|avg handle', -1], talk: ['talk|talk time|avg talk', 0],
  hold: ['hold|hold time|avg hold', -1], acw: ['acw|wrap up|after call work|wrap', -1], heldR: ['hold rate|held rate', -1], xferR: ['transfer rate|transfers rate', -1],
  xfer: ['transferred|transfers|transfer', -1], out: ['outbound|outbound calls', 0], wfExc: ['exceptions|exception|issues', -1], wfAbs: ['no sign on|not signed on|no login|no logon', -1],
  wfLate: ['late sign ons|late logins|late sign on|late logons', -1], wfLateMin: ['late sign on minutes', -1], wfShort: ['short of shift|left early|short shift', -1],
  wfBrk: ['break changes|breaks|break', -1], occ: ['occupancy|occ|busy', 1],
};
const F_INTER = { iCalls: 'calls|interactions|call volume|مكالمات|المكالمات', iShort: 'short calls|calls under 10 seconds', iHang: 'hang up|hung up|agent hung up|disconnect|disconnects|hangups',
  iHang30: 'hung up under 30|short hang ups', iDrop: 'drops|dropped|webrtc|webrtc drops|call drops', iRep: 'repeat|repeats|repeat callers|called again|callbacks' };
const F_BRANDM = [['sl', 'Service level', 'service level|sl|service', 1, v => pct(v, 1)], ['asa', 'ASA', 'asa|speed of answer|average speed of answer|wait time', -1, v => (v == null ? '–' : mss(v))],
  ['presented', 'Calls offered', 'offered|presented|calls offered|volume|traffic', 0, v => n0(v)], ['ansPct', 'Answered %', 'answer rate|answered %|answered percent', 1, v => pct(v, 1)],
  ['abPct', 'Abandoned', 'abandoned|abandon|abandon rate|abandonment|lost calls', -1, v => pct(v, 1)]];
const F_KW = [
  ['low', 'lowest|least|bottom|minimum|min|smallest|fewest|اقل|الاقل'], ['high', 'highest|most|top|maximum|max|biggest|largest|اعلى|الاعلى|اكثر|الاكثر'],
  ['best', 'best|strongest|افضل|الافضل'], ['worst', 'worst|weakest|poorest|lowest performers|اسوا|الاسوا'],
  ['count', 'how many|count|number of|total number|كم|عدد'],
  ['tbelow', 'below target|under target|missed target|missed the target|not on target|off target|under the target|below the target|failed target|missing target|تحت الهدف'],
  ['tabove', 'above target|on target|met target|hit target|reached target|over target|above the target|on the target|meeting target'],
  ['trend', 'trend|history|over time|by month|monthly|progress|تاريخ'], ['avg', 'average|avg|mean|overall|department|متوسط'],
  ['myteam', 'my team|my agents|my people|فريقي'], ['my', 'my|me|mine|myself|i|انا'],
  ['spvkw', 'supervisor|supervisors|spv|spvs|team leader|team leaders|leader|leaders|team lead|team leads|مشرف|المشرف|المشرفين'],
  ['who', 'who|which|list|show|عرض'],
];
const F_SPECIAL = [
  ['notdone', 'not finished|unfinished|not done|still working|not yet finished|has not finished|have not finished|did not finish|didnt finish|لم ينته'],
  ['done', 'finished|done|completed|who finished'],
  ['notheld', 'not held|no one to one|without one to one|without a one to one|missing one to one|one to ones not held|one to one not held|no 1to1|no meeting'],
  ['unsigned', 'not signed|unsigned|waiting for signature|no signature|signature missing|not signed yet|to sign'],
  ['noteligible', 'not eligible|ineligible|no incentive|not getting incentive|غير مؤهل'], ['eligible', 'eligible|eligibility|مؤهل'],
  ['critical', 'critical|critical error|critical errors|attitude|attitude error'], ['deadline', 'deadline|due date|due|الموعد النهائي'],
  ['waiting', 'waiting|approvals|approve|waiting agents|sign ups|signups|new accounts|pending'],
  ['onetoone', 'one to one|one to ones|1 to 1|1to1|one on one|121|meeting|meetings|form|forms|1 1'], ['sign', 'sign|signature|e sign|توقيع'],
];
const F_CORE = new Set(['adh', 'aht', 'absent', 'tardy', 'fin', 'earned', 'conf', 'ded', 'occ', 'iCalls', 'b:sl']);
const F_AR_MON = ['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو', 'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر'];
const F_MONW = new Map(); MONTH_LONG.forEach((n, i) => { F_MONW.set(n.toLowerCase(), i + 1); F_MONW.set(MON[i].toLowerCase(), i + 1); F_MONW.set(F_AR_MON[i], i + 1); }); F_MONW.set('sept', 9);
const F_MONRE = [...F_MONW.keys()].sort((a, b) => b.length - a.length).join('|');
const F_BRANDS = [['Virgin', 'virgin'], ['Friendi', 'friendi|frendi|friendy'], ['Friendi Pay', 'friendi pay|fpay|f pay|friendipay|pay']];
const F_DBRAND = { Virgin: 'virgin', Friendi: 'friendi', 'Friendi Pay': 'fpay', Postpaid: 'postpaid' };

// ---------------------------------------------------------------- what this person may search, and the words for it
const fRole = () => roleNow();
const fStaffSR = r => !['spv', 'quality', 'agent', 'user'].includes(r);   // no incentive amounts for supervisors, quality, agents (their own only) and WFM analysts
const fWfm = r => (WS_OF[r] || []).includes('wfm');
const fForms = r => ['spv', 'senior', 'admin', 'user'].includes(r);
function findIndex() {
  const role = fRole(), u = Auth.user() || {};
  const sig = [role, u.id || '', state.ver, state.histVer, state.finVer, state.roster.length, state.qualityVer, state.attEditsVer, state.dailyVer, state.interVer,
    state.me ? state.me.loaded + Object.keys(state.me.months || {}).length : 0, (state.people || []).length, Object.keys(state.spvDone || {}).length, (state.forms || []).length].join('|');
  if (FIND.idx && FIND.idxSig === sig) return FIND.idx;
  const X = { role, me: role === 'agent', people: [], spvs: [], units: [], months: [], metrics: [], pages: [], phr: new Map(), vocab: [], byName: new Map() };
  const phrase = (ph, e) => { const k = fwords(ph).join(' '); if (!k) return; const L = X.phr.get(k) || []; L.push(e); X.phr.set(k, L); };
  const voc = (w, wt, key, kind) => { const k = fwords(w).join(' '); if (k.length >= 2) X.vocab.push({ w: k, wt, key, kind }); };
  // people
  const P = X.me || role === 'pending' ? [] : role === 'spv' ? myTeam() : rosterRows();
  const idOk = !['quality'].includes(role);
  for (const p of P) {
    const pp = effP(p._id) || p, nm = gname(pp) || p.name, names = [...new Set([nm, p.name, p.sys].map(normSpace).filter(Boolean))];
    const x = { p, id: p._id, name: nm, names, w: [...new Set(names.flatMap(fwords))], unit: unitOf(p), nid: idOk ? Core.cleanId(pp.nid) || '' : '', off: p.status === 'Inactive' };
    X.people.push(x); names.forEach(n => X.byName.set(normName(n), x));
    voc(nm, x.off ? 0.7 : 1, 'p:' + x.id, 'p'); const W = fwords(nm); if (W.length > 1) { voc(W[0] + ' ' + W[W.length - 1], 0.95, 'p:' + x.id, 'p'); voc(W[W.length - 1], 0.6, 'p:' + x.id, 'p'); }
  }
  // supervisors
  if (!X.me && role !== 'pending') {
    const S = spvList().filter(s => role !== 'spv' || s.pid === u.pid);
    for (const s of S) { X.spvs.push(s); voc(s.name, 1, 's:' + s.pid, 's'); }
  }
  // teams and brands
  const U = new Map(); for (const x of X.people) if (!U.has(x.unit)) U.set(x.unit, { unit: x.unit, brand: x.p.brand || '', team: x.p.team || '' });
  X.units = [...U.values()].sort((a, b) => sortUnits(a.unit, b.unit));
  for (const [b, words] of F_BRANDS) if (X.me || X.people.some(x => x.p.brand === b)) for (const w of words.split('|')) { phrase(w, { t: 'brand', v: b }); voc(w, 0.8, 'b:' + b, 'b'); }
  if (fWfm(role)) { phrase('postpaid', { t: 'brand', v: 'Postpaid' }); phrase('virgin postpaid', { t: 'brand', v: 'Postpaid' }); voc('postpaid', 0.6, 'b:Postpaid', 'b'); }
  const teams = new Set(X.people.map(x => x.p.team).filter(Boolean));
  for (const t of teams) { phrase(t.toLowerCase(), { t: 'team', v: t }); if (DEP_NAMES[t]) { phrase(DEP_NAMES[t], { t: 'team', v: t }); voc(DEP_NAMES[t], 0.75, 't:' + t, 't'); } }
  if (teams.has('CT')) phrase('complaints', { t: 'team', v: 'CT' });
  // months
  const ms = new Set(X.me ? Object.keys((state.me && state.me.months) || {}) : wsMonths());
  if (!X.me && fWfm(role)) {
    for (const k of dailyMonths()) ms.add(k); for (const k of Object.keys(state.inter || {})) ms.add(k);
    for (const secs of Object.values(state.dhist || {})) for (const r of (((secs || {}).voice || {}).daily || [])) if (r && r.date) ms.add(r.date.slice(0, 7));
  }
  X.months = [...ms].filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  for (const k of X.months) { const m = +k.slice(5); voc(MONTH_LONG[m - 1], 0.7, 'k:' + k, 'k'); }
  // measures
  const allowSR = fStaffSR(role), qOnly = role === 'quality';
  for (const m of History.METRICS) {
    const S = F_SYN[m.k]; if (!S) continue;
    if (m.k === 'earned' && !(allowSR || X.me)) continue;
    if (qOnly && m.k !== 'fin') continue;
    const mt = { t: 'm', k: m.k, key: 'm:' + m.k, label: m.label, dir: S[1], total: m.total, get: r => History.valOf(r, m), fmt: v => fmtM(m, v), m };
    X.metrics.push(mt);
  }
  if (!qOnly) for (const [k, words] of Object.entries(F_INTER)) {
    const c = AGC.find(z => z[0] === k); if (!c) continue;
    X.metrics.push({ t: 'm', k, key: 'm:' + k, label: c[1], dir: c[4], total: k === 'iCalls' || k === 'iHang30' || k === 'iDrop' ? 'sum' : 'avg', inter: true, get: (r, I) => c[2](r, I), fmt: v => (v == null ? '–' : c[3](v)), syn: words });
  }
  for (const [id, k] of KPI_INDEX()) {
    if (k.src !== 'file') continue;   // adherence, AHT and tardiness are measures above
    X.metrics.push({ t: 'm', k: 'kpi:' + id, key: 'm:kpi:' + id, label: k.name, dir: k.dir === 'low' ? -1 : 1, total: 'avg', kpi: k,
      get: r => { if (!r) return null; if (r.kv && r.kv[id] != null) return r.kv[id]; const e = (r.kpi || []).find(z => z[0] === k.name); return e ? kpiNum(e[3], k) : null; }, fmt: v => kfmt(k, v), syn: [k.name, ...(k.aliases || [])].join('|') });
  }
  if (!X.me && fWfm(role)) for (const [k, label, words, dir, fmt] of F_BRANDM) X.metrics.push({ t: 'm', k: 'b:' + k, key: 'm:b:' + k, label, dir, brandM: k, fmt, syn: words });
  for (const mt of X.metrics) {
    const words = (mt.syn || (F_SYN[mt.k] || [''])[0]).split('|').concat(mt.label);
    const wt = F_CORE.has(mt.k) || mt.kpi ? 1.15 : 0.82;   // the everyday measures are guessed before the rare ones
    for (const w of words) { phrase(w, { t: 'm', v: mt }); voc(w, wt, mt.key, 'm'); }
  }
  for (const [k, words] of F_KW) for (const w of words.split('|')) { phrase(w, { t: 'kw', v: k }); if (w.length > 3) voc(w, 0.9, 'w:' + k, 'w'); }
  for (const [k, words] of F_SPECIAL) for (const w of words.split('|')) { phrase(w, { t: 'sp', v: k }); if (w.length > 3) voc(w, 1, 'x:' + k, 'x'); }
  // pages and actions
  X.pages = findPages(role);
  X.help = [...document.querySelectorAll('#dHelp li, #dHelp section > p')].map(el => ({ el, text: normSpace(el.textContent), w: [...new Set(fwords(el.textContent))] })).filter(h => h.text.length > 20);
  for (const g of X.pages) for (const w of g.words.split('|')) { phrase(w, { t: 'g', v: g }); voc(w, 0.85, g.key, 'g'); }
  FIND.idx = X; FIND.idxSig = sig; return X;
}

/** the pages and actions this role can open */
function findPages(role) {
  const W = WS_OF[role] || [], L = [], go = ws => () => { if (state.ws !== ws || ws === 'build') setWs(ws); };
  const add = (key, title, words, sub, run, ok = true) => { if (ok) L.push({ t: 'g', key: 'g:' + key, title, words, sub, run }); };
  const wfm = tab => () => { state.wfmTab = tab; setWs('wfm'); renderWs(); };
  if (W.includes('build')) {
    add('import', 'Import the month\'s files', 'import|upload|drop files|exports|build the month', 'Build', () => setStep('import'));
    add('people', 'Review: people and names', 'review|roster|names|people list', 'Build', () => setStep('people'));
    add('matchsys', 'Match system names: the Genesys names nobody matches yet', 'match system names|system names|genesys names|match names|link names|unmatched names|names not on the roster', 'Build', () => { setStep('people'); openMatch(null); });
    add('dups', 'Duplicates: people entered twice, combined into one', 'duplicates|duplicate|entered twice|same person twice|combine|merge people|double names|same national id', 'Build', () => openDups());
    add('sysasname', 'Use the Genesys names as the names', 'use system names as names|genesys names as names|rename to the genesys name|system name as name', 'Build', () => { setStep('people'); askSysNames(); });
    add('issues', 'Review: things to check', 'issues|checks|problems|to check', 'Build', () => setStep('issues'));
    add('kpitab', 'KPI results of the month', 'kpi results|kpi tab', 'Build', () => setStep('kpi'));
    add('histtab', 'History of past months', 'history|past months|previous months', 'Build', () => setStep('history'));
    add('export', 'Build the Excel workbook', 'export|excel|workbook|build excel|download', 'Build', () => setStep('export'));
    add('email', 'Deduction and incentive emails', 'email|emails|incentive email|mail', 'Build', () => setStep('email'));
    add('settings', 'Settings', 'settings|month|target|options', 'Build', () => setStep('settings'));
    add('scorecards', 'KPI scorecards', 'scorecards|scorecard|weights|bands|incentive base|kpi settings', 'Settings', () => { renderScore(); openDrawer('dScore'); });
  }
  if (W.includes('team')) add('team', role === 'spv' ? 'My team' : 'Team page', 'team page|team|board|one to one board|attendance grid', 'Team', go('team'));
  if (W.includes('results')) add('results', 'Results', 'results|final results|finalize|finalise|eligibility page', 'Results', go('results'));
  if (W.includes('cycle')) {
    add('cycle', 'Supervisors', 'supervisors page|cycle|progress|supervisors progress|spv scorecards|supervisor scorecards', 'Supervisors', go('cycle'));
    add('mail4', 'The four emails (one-to-ones ready, review, deadline warning, final result form)', 'four emails|one to ones ready|ready email|review email|results for review|deadline warning|final email|final form|final result form|signature|signatures|rasha|vp|ceo', 'Supervisors', go('cycle'));
    add('calendar', 'Month close: who does what by which day', 'month close|calendar|close calendar|closing|deadlines|due days|timeline|late steps', 'Supervisors', () => todayGo('cal'));
    add('objsenior', 'Objections and the dispute rate per team', 'objections|objection|disputes|dispute rate|complaints|escalated', 'Supervisors', () => { setWs('cycle'); scrollTo_('#cycleBody .objcard'); });
    add('rules', 'Incentive rules (scorecards, bases, who earns it), in force from a month', 'incentive rules|rules|governance|bases|eligibility rules|minimum final|rule history|new rules', 'Supervisors', () => openRules());
    add('changes', 'Changes by hand this month', 'changes by hand|overrides|audit|changes report|who changed|hand changes|manual changes', 'Supervisors', () => { state.chgOpen = true; setWs('cycle'); renderWs(); scrollTo_('#cycleBody .chgcard'); });
  }
  if (W.includes('team') && !W.includes('cycle')) add('objteam', 'Objections from the agents', 'objections|objection|disputes|complaints', 'Team', () => { state.teamTab = 'obj'; setWs('team'); renderWs(); scrollTo_('#objCard'); });
  if (W.includes('results')) add('compare', 'Parallel run: compare with the old Excel', 'compare|old excel|parallel run|reconcile|reconciliation|differences|check against excel', 'Results', () => { setWs('results'); scrollTo_('.cmpcard'); });
  if (W.includes('wfm')) {
    for (const [t, l] of wfmTabsFor(role)) add('wfm-' + t, `WFM › ${l}`, t === 'emails' ? 'emails tab|emails|daily emails|deduction email|absences email|send email' : t === 'inter' ? 'interactions|interactions export|calls page' : t === 'agents' ? 'agents table|all agents|agent analytics' : t === 'daily' ? 'daily|daily dashboard|daily data' : t === 'builder' ? 'report builder|member care report builder|daily files|drop daily|daily exports' : t === 'dmail' ? 'daily emails|brand emails|send daily' : 'analytics|charts|dashboard', 'WFM', wfm(t));
    if (['admin', 'user'].includes(role)) add('rbuild', 'Report builder: drop the day\'s exports (MC Leaders, WFM Daily Review; the brand emails go to the WFM manager)', 'report builder|daily report|daily files|leaders email|mc leaders|wfm daily review|daily review|upload daily|drop daily', 'WFM › Report builder', wfm('builder'));
    if (['admin', 'wfm', 'user'].includes(role)) add('dailymail', 'Daily emails to send (Virgin Postpaid, Virgin Mobile, FRiENDi Mobile, FRiENDi Pay)', 'daily emails|daily email|daily report|postpaid email|virgin email|friendi email|friendi pay email|brand emails|send daily', 'WFM › Daily emails', wfm('dmail'));
    if (['admin', 'wfm', 'user'].includes(role)) add('dedmail', 'Deduction email (conformance deduction and absences)', 'deduction email|absences email|conformance email|for review email|deduction for review', 'WFM › Emails', wfm('mail'));
  }
  if (W.includes('quality')) {
    add('quality', 'Quality', 'quality page|quality|eval page|qa page', 'Quality', go('quality'));
    add('eval', 'Drop the Final EVAL', 'final eval|eval|upload eval|import eval|evaluation file', 'Quality', () => { setWs('quality'); const pk = $('qPicker'); if (pk) pk.click(); });
    add('evaltpl', 'EVAL template with national IDs', 'eval template|template|national id eval|ids template|eval with ids', 'Quality', () => evalTemplate(qMonthNow()), canQuality());
  }
  if (W.includes('me')) {
    add('me', 'My page', 'my page|my results|home', 'My page', go('me'));
    for (const [k, l, w] of [['mekpi', 'My KPI results', 'kpi results|my kpi|my scorecard'], ['meatt', 'My attendance', 'attendance|my attendance|days'], ['meforms', 'My one-to-ones', 'my one to one|my forms|my one to ones'], ['mecalls', 'My calls', 'my calls|calls'], ['meadh', 'My daily adherence', 'daily adherence|my daily adherence']])
      add(k, l, w, 'My page', () => { setWs('me'); fScrollCard(l.replace(/^My /, '')); });
    add('meobj', 'My objections', 'objection|objections|complaint|dispute|wrong number|not right|اعتراض', 'My page', () => { setWs('me'); scrollTo_('#meObj'); });
    add('memtd', 'This month so far', 'this month|month to date|so far|projection|projected|forecast|mtd', 'My page', () => { setWs('me'); scrollTo_('#meMtd'); });
  }
  add('today', 'Notifications: what is mine to do, and the deadlines', 'today|to do|todo|my tasks|what to do|tasks|deadlines|due|late|notifications|bell', 'Today', () => openBell());
  add('help', 'How to use', 'help|how to|guide|manual|instructions', 'Help', () => openDrawer('dHelp'));
  if (Auth.isAdmin && Auth.isAdmin()) add('accounts', 'Manage accounts', 'accounts|users|roles|passwords|reset password|approve accounts', 'Admin', () => Auth.openAccounts());
  if (Auth.user()) add('password', 'Change my password', 'change password|password|new password', 'Account', () => Auth.change());
  add('dark', 'Dark look', 'dark|dark mode|night', 'Look', () => { lsSet('mc-theme', 'dark'); applyTheme('dark'); });
  add('light', 'Light look', 'light|light mode|day mode|white', 'Look', () => { lsSet('mc-theme', 'light'); applyTheme('light'); });
  return L;
}
function fScrollCard(label) {
  requestAnimationFrame(() => { const want = fnorm(label); const h = [...document.querySelectorAll('#meBody .card h2')].find(x => fnorm(x.textContent).startsWith(want.split(' ')[0])); if (h) h.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}

// ---------------------------------------------------------------- reading a line
function findParse(q, X) {
  let s = ' ' + fnorm(q) + ' ';
  const P = { raw: fnorm(q), partial: !!q && !/\s$/.test(q), metric: null, metrics: [], kw: new Set(), sp: null, sps: [], pages: [], brand: null, team: null, month: null, day: null, cmp: null, n: null, sup: null, tgt: null, names: [], people: [], one: null, spv: null, nid: '' };
  const cut = re => { const m = s.match(re); if (m) s = s.replace(m[0], ' '); return m; };
  const now = new Date(), Y = now.getFullYear(), latestY = X.months.length ? +X.months[X.months.length - 1].slice(0, 4) : Y;
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const valid = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= Core.daysIn(y, m);
  let m;
  // days
  if ((m = cut(/\s(20\d\d)-(\d{1,2})-(\d{1,2})\s/)) && valid(+m[1], +m[2], +m[3])) P.day = iso(+m[1], +m[2], +m[3]);
  else if ((m = cut(/\s(\d{1,2})\/(\d{1,2})(?:\/(20\d\d|\d\d))?\s/)) && valid(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : latestY, +m[2], +m[1])) P.day = iso(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : latestY, +m[2], +m[1]);
  else if ((m = cut(new RegExp(`\\s(\\d{1,2})(?:st|nd|rd|th)?\\s(?:of\\s)?(${F_MONRE})(?:\\s(20\\d\\d))?\\s`)))) { const mm = F_MONW.get(m[2]), y = m[3] ? +m[3] : latestY; if (valid(y, mm, +m[1])) P.day = iso(y, mm, +m[1]); }
  else if ((m = cut(new RegExp(`\\s(${F_MONRE})\\s(\\d{1,2})(?:st|nd|rd|th)?(?:\\s(20\\d\\d))?\\s`)))) { const mm = F_MONW.get(m[1]), y = m[3] ? +m[3] : latestY; if (valid(y, mm, +m[2])) P.day = iso(y, mm, +m[2]); }
  if (!P.day) {
    if (cut(/\s(today|اليوم)\s/)) P.day = todayIso();
    else if (cut(/\s(yesterday|امس)\s/)) { const d = new Date(now.getTime() - 864e5); P.day = iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  }
  // months
  if ((m = cut(/\s(20\d\d)-(\d{1,2})\s/)) && +m[2] >= 1 && +m[2] <= 12) P.month = `${m[1]}-${String(+m[2]).padStart(2, '0')}`;
  else if ((m = cut(/\s(\d{1,2})\/(20\d\d)\s/)) && +m[1] >= 1 && +m[1] <= 12) P.month = `${m[2]}-${String(+m[1]).padStart(2, '0')}`;
  else if ((m = cut(new RegExp(`\\s(${F_MONRE})(?:\\s(20\\d\\d))?\\s`)))) { const mm = F_MONW.get(m[1]); const y = m[2] ? +m[2] : (X.months.filter(k => +k.slice(5) === mm).pop() || `${latestY}`).slice(0, 4); P.month = `${y}-${String(mm).padStart(2, '0')}`; }
  else if (cut(/\s(this month|current month|هذا الشهر)\s/)) P.month = X.months.includes(todayIso().slice(0, 7)) ? todayIso().slice(0, 7) : X.months[X.months.length - 1] || null;
  else if (cut(/\s(last month|previous month|prior month|الشهر الماضي)\s/)) { const c = todayIso().slice(0, 7), L = X.months.filter(k => k < c); P.month = L[L.length - 1] || null; }
  if (P.day && !P.month) P.month = P.day.slice(0, 7);
  // "top 10", "lowest 3"
  if ((m = cut(/\s(top|bottom|best|worst|lowest|highest|first)\s(\d{1,3})\s/))) { P.n = Math.min(200, +m[2]); s = ` ${m[1]} ${s}`; }
  // comparisons: "below 90%", "< 95", "more than 2"
  if ((m = cut(/\s(<=|>=|<|>|=|at least|at most|less than|lower than|fewer than|more than|greater than|higher than|below|under|above|over|اقل من|اكثر من)\s?(\d+(?:\.\d+)?)\s?(%|min|mins|minutes|sec|secs|seconds|days?)?\s/))) {
    const w = m[1], op = { '<=': '<=', '>=': '>=', '<': '<', '>': '>', '=': '=', 'at least': '>=', 'at most': '<=' }[w] || (/less|lower|fewer|below|under|اقل/.test(w) ? '<' : '>');
    P.cmp = { op, v: +m[2], unit: m[3] || '', word: w };
  }
  // ID numbers
  if ((m = cut(/\s(\d{6,12})\s/))) P.nid = m[1];
  // words and phrases
  const W = fwords(s), left = [];
  for (let i = 0; i < W.length;) {
    let hit = null;
    for (let n = Math.min(5, W.length - i); n >= 1; n--) { const E = X.phr.get(W.slice(i, i + n).join(' ')); if (E) { hit = { n, E, i }; break; } }
    if (!hit) { left.push({ w: W[i], i, last: i === W.length - 1 }); i++; continue; }
    // a word that is also somebody's name stays a name when the next word continues that name ("Abdullah Bin Hold")
    for (const e of hit.E) fApply(P, e);
    i += hit.n;
  }
  // the word being typed may be the start of a known word ("lowest adhe")
  const lastW = left.length && left[left.length - 1].last && P.partial ? left[left.length - 1] : null;
  // names
  const toks = left.filter(x => !F_STOP.has(x.w)).map(x => x);
  P.unknown = toks.length;
  if (toks.length) {
    const scored = fMatchPeople(toks.map(x => x.w), X, P.partial && toks[toks.length - 1].last);
    P.people = scored;
    const top = scored[0];
    if (top && top.s >= 0.78 && (!scored[1] || top.s - scored[1].s >= 0.08 || top.full)) P.one = top.x;
    const sv = fMatchSpv(toks.map(x => x.w), X, P.partial && toks[toks.length - 1].last);
    if (sv && sv.s >= 0.8 && (!P.one || sv.s >= (top ? top.s : 0))) { P.spv = sv.x; if (P.one && P.one.id === sv.x.pid) P.one = null; }
    if (!scored.length && !sv && lastW && lastW.w.length >= 3) {   // the start of a measure, a page or a keyword
      const pre = [...X.phr.keys()].filter(k => !k.includes(' ') && k.startsWith(lastW.w)).sort((a, b) => a.length - b.length)[0];
      if (pre) { for (const e of X.phr.get(pre)) fApply(P, e); P.guessed = pre; }
    }
  }
  if (!P.people.length && !P.spv && !P.guessed) {   // a typo in a measure or a word ("lowset adherance"): the closest known word
    const single = [...X.phr.keys()].filter(k => !k.includes(' ') && k.length >= 4);
    for (const t of toks) {
      if (t.w.length < 4 || (t.last && P.partial && t.w.length < 5)) continue;
      let best = null, bd = 9; for (const k of single) { const d = flev(t.w, k, t.w.length >= 7 ? 2 : 1); if (d < bd || (d === bd && best && Math.abs(k.length - t.w.length) < Math.abs(best.length - t.w.length))) { bd = d; best = k; } }
      if (best && bd <= (t.w.length >= 7 ? 2 : 1)) { for (const e of X.phr.get(best)) fApply(P, e); (P.fixed = P.fixed || []).push([t.w, best]); }
    }
  }
  if (P.nid) { const x = X.people.find(z => z.nid && z.nid.startsWith(P.nid)); if (x) P.one = x; }
  if (P.kw.has('myteam') && fRole() === 'spv') P.mine = true;
  if (!P.metric && P.metrics.length) P.metric = P.metrics[0];
  return P;
}
function fApply(P, e) {
  if (e.t === 'm') { if (!P.metrics.includes(e.v)) P.metrics.push(e.v); if (!P.metric || (e.v.kpi && !P.metric.kpi)) P.metric = e.v; }
  else if (e.t === 'kw') { P.kw.add(e.v); if (['low', 'high', 'best', 'worst'].includes(e.v)) P.sup = e.v; if (e.v === 'tbelow') P.tgt = 'below'; if (e.v === 'tabove') P.tgt = 'above'; if (e.v === 'count') P.count = true; }
  else if (e.t === 'sp') { if (!P.sps.includes(e.v)) P.sps.push(e.v); if (!P.sp) P.sp = e.v; }
  else if (e.t === 'g') { if (!P.pages.includes(e.v)) P.pages.push(e.v); }
  else if (e.t === 'brand') P.brand = e.v;
  else if (e.t === 'team') P.team = e.v;
}
/** people whose names fit the typed words, best first */
function fMatchPeople(T, X, lastPartial) {
  const out = [];
  for (const x of X.people) {
    let sc = 0, ok = true;
    for (let i = 0; i < T.length; i++) {
      let b = 0; for (const w of x.w) { const v = ftok(T[i], w, lastPartial && i === T.length - 1); if (v > b) b = v; if (b === 1) break; }
      if (b < 0.6) { ok = false; break; } sc += b;
    }
    if (!ok) continue;
    let s = sc / T.length; const W = fwords(x.name);
    if (W[0] && ftok(T[0], W[0], T.length === 1 && lastPartial) >= 0.8) s += 0.04;   // the first name first
    if (x.off) s -= 0.05;
    s += fBoost('p:' + x.id) * 0.5;
    out.push({ x, s, full: T.length >= 2 && T.every(t => x.w.includes(t)) });
  }
  return out.sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name)).slice(0, 12);
}
function fMatchSpv(T, X, lastPartial) {
  let best = null;
  for (const s of X.spvs) {
    const W = fwords(s.name); let sc = 0, ok = true;
    for (let i = 0; i < T.length; i++) { let b = 0; for (const w of W) b = Math.max(b, ftok(T[i], w, lastPartial && i === T.length - 1)); if (b < 0.6) { ok = false; break; } sc += b; }
    if (!ok) continue; const v = sc / T.length + fBoost('s:' + s.pid) * 0.5;
    if (!best || v > best.s) best = { x: s, s: v };
  }
  return best;
}

// ---------------------------------------------------------------- learning (this browser only)
const fMemKey = () => `mc-find:${(Auth.user() || {}).id || 'local'}`;
let fMemCache = null;
function fMem() { if (fMemCache) return fMemCache; try { fMemCache = JSON.parse(lsGet(fMemKey()) || '{}') || {}; } catch (e) { fMemCache = {}; } fMemCache.q = fMemCache.q || {}; fMemCache.e = fMemCache.e || {}; return fMemCache; }
function fBoost(key) { const x = fMem().e[key]; if (!x) return 0; const days = (Date.now() - x.at) / 864e5; return Math.min(0.3, Math.log2(1 + x.n) * 0.08 * Math.exp(-days / 45)); }
function fLearn(q, key) {
  const M = fMem(), now = Date.now(), bump = (o, k) => { const x = o[k] || { n: 0, at: 0 }; x.n++; x.at = now; o[k] = x; };
  const qq = normSpace(q); if (qq && qq.length >= 2) bump(M.q, qq.slice(0, 80)); if (key) bump(M.e, key);
  const trim = (o, n) => { const L = Object.entries(o).sort((a, b) => b[1].at - a[1].at); for (const [k] of L.slice(n)) delete o[k]; };
  trim(M.q, 30); trim(M.e, 150); lsSet(fMemKey(), JSON.stringify(M));
}
function fForget() { fMemCache = { q: {}, e: {} }; try { localStorage.removeItem(fMemKey()); } catch (e) { /* none */ } }

// ---------------------------------------------------------------- numbers behind the answers
const fMonthNow = X => (X.me ? (state.meMonth && X.months.includes(state.meMonth) ? state.meMonth : X.months[X.months.length - 1]) : wsMonthNow() || X.months[X.months.length - 1]) || '';
function fInScope(x, P) {
  if (P.brand && P.brand !== 'Postpaid' && (x.p.brand || '') !== P.brand) return false;
  if (P.team && (x.p.team || '') !== P.team) return false;
  if (P.spv && x.p.spv !== P.spv.pid) return false;
  return true;
}
function fRowsK(k, X, P) { const map = rowsByPid(k); return X.people.filter(x => fInScope(x, P) && (!P.only || P.only.has(x.id))).map(x => ({ x, r: map.get(x.id) || null, I: null })).filter(o => o.r); }
function fVal(mt, o, k) {
  if (mt.inter) { if (o.I === null) o.I = interOf(k, o.x.p) || undefined; return mt.get(o.r, o.I || null); }
  const v = mt.get(o.r); if (v != null || !mt.kpi || !o.x) return v;
  const q = qRow(k, o.x.id); return q && q.kpi && q.kpi[mt.kpi.id] != null ? q.kpi[mt.kpi.id] : null;   // the quality team's number, for a month built before it came
}
function fTarget(mt) {
  if (mt.k === 'adh') return state.settings.target;
  if (mt.k === 'fin') return ELIG.minFinal;
  if (mt.kpi) { const b = (mt.kpi.bands || [])[0]; return b == null || b === '' ? null : +b; }
  if (mt.k === 'b:sl') return 0.8;
  return null;
}
const fMiss = (mt, v, t) => (mt.dir >= 0 ? v < t - 1e-9 : v > t + 1e-9);
function fCmpVal(mt, c) {
  let v = c.v; const pctM = mt.k === 'adh' || mt.k === 'conf' || mt.k === 'fin' || mt.k === 'occ' || (mt.kpi && mt.kpi.unit === 'pct') || /R$/.test(mt.k) || ['iShort', 'iHang', 'iRep', 'b:sl', 'b:ansPct', 'b:abPct'].includes(mt.k) || (mt.m && (mt.m.pct));
  if (pctM && (c.unit === '%' || v > 1.5)) v /= 100;
  if ((mt.k === 'aht' || mt.k === 'pAht' || (mt.kpi && mt.kpi.unit === 'sec')) && /^min/.test(c.unit)) v *= 60;
  return v;
}
const fScopeLabel = (P, X, n) => [P.spv ? `${P.spv.name}'s team` : fRole() === 'spv' ? 'your team' : '', P.brand || '', P.team ? DEP_NAMES[P.team] || P.team : '', n != null ? plural(n, 'agent') : ''].filter(Boolean).join(' · ');
const fOrd = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
function fSpark(vals, labels) {
  const V = vals.filter(v => v != null); if (V.length < 2) return '';
  const lo = Math.min(...V), hi = Math.max(...V), w = 150, h = 34, n = vals.length;
  const pts = vals.map((v, i) => (v == null ? null : [3 + (i / Math.max(1, n - 1)) * (w - 6), h - 5 - ((v - lo) / ((hi - lo) || 1)) * (h - 10)]));
  const P2 = pts.filter(Boolean), d = P2.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '), last = P2[P2.length - 1];
  return `<span class="fsp"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}"/>${P2.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p === last ? 3 : 1.6}"/>`).join('')}</svg><small>${esc(labels[0] || '')} – ${esc(labels[labels.length - 1] || '')}</small></span>`;
}
const fAct = (l, run, primary) => ({ l, run, primary: !!primary });
const fOpenP = x => fAct('Open the profile', () => { findClose(); openPerson(x.id); }, true);
function fOpenForm(id) {
  openSavedForm(formLookup(id));
}
const fRowP = (x, v, cls, s) => ({ t: x.name, s: s != null ? s : x.unit, v, cls, run: () => { findClose(); openPerson(x.id); } });

// ---------------------------------------------------------------- answers
function findAnswer(P, X) {
  if (X.me) return fAnsMe(P, X);
  if (!X.people.length && !X.spvs.length) return null;
  const k0 = fMonthNow(X), k = P.month || k0, role = X.role;
  if (P.month && !X.months.includes(P.month) && !P.day) return { title: ymLabel(P.month), sub: 'Not in the data', note: `There is nothing saved for ${ymLabel(P.month)} yet.${X.months.length ? ` The data has ${ymLabel(X.months[0])} to ${ymLabel(X.months[X.months.length - 1])}.` : ''}` };
  const sp = P.sp;
  if (sp === 'onetoone' && P.one) return fAnsForm(P.one, k, X);
  if (sp && sp !== 'onetoone' && sp !== 'sign') { const A = fAnsSpecial(sp, P, X, k); if (A) return A; }
  if ((sp === 'onetoone' || sp === 'sign') && !P.one) { const A = fAnsSpecial(sp === 'sign' ? 'unsigned' : 'onetoone', P, X, k); if (A) return A; }
  if (P.metric && P.metric.brandM) return fAnsBrand(P, X);
  if (P.day && fWfm(role)) return fAnsDay(P, X);
  if (P.one) return P.metric ? fAnsPersonMetric(P.one, P.metric, k, X, P) : fAnsPerson(P.one, k, X);
  const near = P.people.filter(o => o.s >= 0.78);
  if (P.metric && near.length > 1 && !P.spv) return fAnsRank(P.metric, k, X, { ...P, only: new Set(near.map(o => o.x.id)) });
  if (P.spv && !P.metric && !P.sup && !P.tgt && !P.cmp && !P.count) return fAnsSpv(P.spv, k, X);
  if (P.metric && P.kw.has('trend') && !P.sup) return fAnsTrend(P.metric, X, P);
  if (P.metric || P.tgt || P.cmp || ((P.sup || P.count) && (P.brand || P.team || P.spv))) return fAnsRank(P.metric || X.metrics.find(m => m.k === (role === 'quality' ? 'fin' : 'adh')) || X.metrics[0], k, X, P);
  if (P.brand || P.team || (P.spv && P.count)) return fAnsScope(k, X, P);
  if (P.month && !P.people.length && !P.pages.length) return fAnsScope(k, X, P, true);
  return null;
}
function fAnsPerson(x, k, X) {
  const r = k ? rowsByPid(k).get(x.id) : null, role = X.role, set = state.settings, acts = [fOpenP(x)];
  const spv = supName(x.p.spv);
  if (fForms(role) && k) {
    const os = oneStatus(x.id, k);
    if (os.o && os.st !== 'planned') acts.push(fAct('Open the one-to-one', () => { findClose(); fOpenForm(os.o.id); }));
    else if ((WS_OF[role] || []).includes('team')) acts.push(fAct(os.o ? 'One-to-one arranged · Team page' : 'Arrange a one-to-one · Team page', () => { findClose(); if (role !== 'spv') state.wsSpv = x.p.spv || ''; state.wsMonth = k; setWs('team'); renderWs(); }));
  }
  if (fWfm(role)) acts.push(fAct('In the agents table', () => { findClose(); state.agQ = x.name; state.agUnit = ''; state.agSpv = ''; state.wfmTab = 'agents'; setWs('wfm'); renderWs(); }));
  if (!r) return { icon: 'user', title: x.name, sub: [x.unit, spv ? `supervisor ${spv}` : ''].filter(Boolean).join(' · '), note: k ? `Not in the results of ${ymLabel(k)}.` : 'No month saved yet.', acts };
  const tiles = [];
  if (role === 'quality') { for (const mt of X.metrics) { const v = fVal(mt, { x, r, I: null }, k); if (v != null) tiles.push([mt.label, mt.fmt(v)]); } }
  else {
    tiles.push(['Adherence', pct(r.adh, 2), r.adh != null && r.adh < set.target ? 'bad' : ''], ['AHT', mss(r.aht)], ['Final % (KPI)', pct1(r.fin), r.fin != null && r.fin < ELIG.minFinal ? 'bad' : ''], ['Absent days', r.absent == null ? '–' : String(r.absent), r.absent ? 'bad' : ''], ['Tardy minutes', r.tardy == null ? '–' : String(Math.round(r.tardy)), r.tardy ? 'bad' : '']);
    const el = r._el; if (el) tiles.push(['Incentive', el.ok ? (fStaffSR(role) && r.earned != null ? `${Math.round(r.earned).toLocaleString('en-US')} SR` : 'Eligible') : 'Not eligible', el.ok ? '' : 'bad', el.ok ? '' : (el.why || []).join(', ')]);
    if (fForms(role)) { const os = oneStatus(x.id, k), sg = os.o ? sigState(os.o) : 'none'; tiles.push(['One-to-one', os.st === 'none' ? 'Not yet' : os.st === 'planned' ? 'Arranged' : sg === 'signed' ? 'Held · signed' : 'Held · not signed', os.st === 'none' ? 'bad' : '']); }
  }
  return { icon: 'user', title: x.name, sub: [x.unit, spv ? `supervisor ${spv}` : '', ymLabel(k)].filter(Boolean).join(' · '), tiles, acts, status: monthLocked(k) ? 'Final' : 'Draft' };
}
function fAnsPersonMetric(x, mt, k, X, P) {
  if (mt.inter && !interTotals(k)) { const kk = Object.keys(state.inter || {}).filter(z => interTotals(z)).sort().pop(); if (kk) k = kk; }
  const o = { x, r: k ? rowsByPid(k).get(x.id) : null, I: null }, acts = [fOpenP(x)];
  if (!o.r) return { icon: 'user', title: `${x.name} · ${mt.label}`, sub: x.unit, note: `Not in the results of ${ymLabel(k)}.`, acts };
  const v = fVal(mt, o, k), t = fTarget(mt);
  const L = fRowsK(k, X, {}).map(z => ({ ...z, v: fVal(mt, z, k) })).filter(z => z.v != null);
  const rank = v == null || !mt.dir ? null : 1 + L.filter(z => (mt.dir > 0 ? z.v > v + 1e-12 : z.v < v - 1e-12)).length;
  const avg = mt.total === 'sum' ? null : mean(L.map(z => z.v));
  const ms = X.months.filter(z => z <= k && (z === k || rowsByPid(z).has(x.id))).slice(-6), vals = ms.map(z => { const rr = rowsByPid(z).get(x.id); return rr ? fVal(mt, { x, r: rr, I: null }, z) : null; });
  const sub = [t != null ? `target ${mt.dir >= 0 ? '≥' : '≤'} ${mt.fmt(t)}` : '', rank ? `${fOrd(rank)} of ${L.length}${fRole() === 'spv' ? ' in your team' : ''}` : '', avg != null ? `average ${mt.fmt(avg)}` : ''].filter(Boolean).join(' · ');
  return { icon: 'chart', title: `${x.name} · ${mt.label}`, sub: `${ymLabel(k)} · ${x.unit}`, big: v == null ? '–' : mt.fmt(v), bigCls: v != null && t != null ? (fMiss(mt, v, t) ? 'bad' : 'good') : '', bigSub: sub, spark: fSpark(vals, ms.map(z => ymLabel(z))), acts };
}
function fAnsRank(mt, k, X, P) {
  if (mt.inter && !interTotals(k)) { const kk = Object.keys(state.inter || {}).filter(z => interTotals(z)).sort().pop(); if (kk) k = kk; }
  const L = fRowsK(k, X, P).map(o => ({ ...o, v: fVal(mt, o, k) })).filter(o => o.v != null), t = fTarget(mt);
  const head = `${mt.label} · ${ymLabel(k)}`;
  if (!L.length) return { icon: 'chart', title: head, sub: fScopeLabel(P, X), note: mt.inter ? 'Add the interactions export on the WFM page (Interactions) to see this.' : 'No numbers for this yet.' };
  let F = L, what = '';
  if (P.cmp) { const c = P.cmp, v = fCmpVal(mt, c); F = F.filter(o => (c.op === '<' ? o.v < v - 1e-12 : c.op === '<=' ? o.v <= v + 1e-12 : c.op === '>' ? o.v > v + 1e-12 : c.op === '>=' ? o.v >= v - 1e-12 : Math.abs(o.v - v) < 1e-9)); what = `${c.word} ${mt.fmt(v)}`; }
  if (P.tgt) { if (t == null) what = 'no target set for this measure'; else { F = F.filter(o => (P.tgt === 'below' ? fMiss(mt, o.v, t) : !fMiss(mt, o.v, t))); what = P.tgt === 'below' ? `missing the target (${mt.dir >= 0 ? '≥' : '≤'} ${mt.fmt(t)})` : `on target (${mt.dir >= 0 ? '≥' : '≤'} ${mt.fmt(t)})`; } }
  const dir = mt.dir || 0; let asc;
  if (P.sup === 'low') asc = true; else if (P.sup === 'high') asc = false; else if (P.sup === 'best') asc = dir < 0; else if (P.sup === 'worst') asc = dir > 0; else asc = dir > 0;
  F = F.slice().sort((a, b) => (asc ? a.v - b.v : b.v - a.v) || a.x.name.localeCompare(b.x.name));
  const filt = !!(P.cmp || P.tgt), n = P.n || (filt || P.count ? 15 : 7), avg = mt.total === 'sum' ? sum(L.map(o => o.v)) : mean(L.map(o => o.v));
  const lbl = mt.label.toLowerCase(), word = asc ? (dir < 0 ? 'Lowest' : 'Lowest') : (mt.k === 'absent' || mt.k === 'tardy' || mt.k === 'ded' || mt.total === 'sum' ? 'Most' : 'Highest');
  const title = P.only ? `${mt.label} · ${plural(F.length, 'match', 'matches')}` : filt || P.count ? `${F.length} of ${L.length} ${what ? '· ' + what : ''}` : `${word} ${lbl}`;
  const rows = F.slice(0, n).map(o => fRowP(o.x, mt.fmt(o.v), t != null && fMiss(mt, o.v, t) ? 'bad' : ''));
  const acts = [];
  const agc = AGC.find(c => c[0] === mt.k);
  if (fWfm(X.role) && agc) acts.push(fAct('Open the agents table', () => { findClose(); state.wfmTab = 'agents'; state.agQ = ''; state.agSort = mt.k; state.agDir = asc ? 'asc' : 'desc'; state.agSpv = P.spv ? P.spv.pid : ''; state.agUnit = P.brand && P.team ? `${P.brand} · ${P.team}` : ''; state.agCols = agc[5] === 'inter' ? 'inter' : agc[5] === 'perf' ? 'perf' : agc[5] === 'wf' ? 'wf' : 'core'; state.wsMonth = k; setWs('wfm'); renderWs(); }, true));
  if (X.role === 'spv') acts.push(fAct('Open my team', () => { findClose(); state.wsMonth = k; setWs('team'); renderWs(); }));
  const sumLine = [`${mt.total === 'sum' ? 'total' : 'average'} ${mt.fmt(avg)}`, t != null ? `target ${dir >= 0 ? '≥' : '≤'} ${mt.fmt(t)}` : '', t != null ? `${L.filter(o => fMiss(mt, o.v, t)).length} missing it` : ''].filter(Boolean).join(' · ');
  let extra = '';
  if (mt.inter) { const T = interTotals(k); if (T) extra = `${T.n.toLocaleString('en-US')} interactions in ${ymLabel(k)} · ${pct(T.n ? T.hand / T.n : null, 1)} handled by an agent`; }
  return { icon: 'chart', title, sub: [ymLabel(k), fScopeLabel(P, X, L.length)].filter(Boolean).join(' · '), bigSub: sumLine, note: extra, rows, more: F.length > n ? `and ${F.length - n} more` : '', acts, empty: F.length ? '' : 'Nobody.' };
}
function fAnsTrend(mt, X, P) {
  const ms = X.months.filter(k => monthData(k)).slice(-8);
  const vals = ms.map(k => { const L = fRowsK(k, X, P).map(o => fVal(mt, o, k)).filter(v => v != null); return L.length ? (mt.total === 'sum' ? sum(L) : mean(L)) : null; });
  return { icon: 'chart', title: `${mt.label} by month`, sub: fScopeLabel(P, X) || 'everyone', spark: fSpark(vals, ms.map(ymLabel)), rows: ms.map((k, i) => ({ t: ymLabel(k), s: mt.total === 'sum' ? 'total' : 'average', v: vals[i] == null ? '–' : mt.fmt(vals[i]), run: () => { findSet(`${mt.label} ${ymLabel(k)}`); } })).reverse() };
}
function fAnsScope(k, X, P, month) {
  const L = fRowsK(k, X, P).map(o => o.r), A = aggRows(L), set = state.settings, role = X.role;
  const tiles = [['Agents', String(A.n)], ['Adherence', pct(A.adh, 1), A.adh != null && A.adh < set.target ? 'bad' : '', `${A.below} under ${pct(set.target, 0)}`], ['AHT', mss(A.aht)], ['Final % (KPI)', pct1(A.fin)], ['Absent days', A.absent == null ? '–' : String(A.absent)], ['Tardy minutes', A.tardy == null ? '–' : String(Math.round(A.tardy))]];
  if (fStaffSR(role) && A.earned != null) tiles.push(['Earned SR', Math.round(A.earned).toLocaleString('en-US')]);
  if (role === 'quality') tiles.splice(1, tiles.length, ['Final % (KPI)', pct1(A.fin)]);
  const acts = [];
  if (month && !X.me) acts.push(fAct(`Show ${ymLabel(k)} on the pages`, () => { findClose(); state.wsMonth = k; renderWs(); toast(`${ymLabel(k)} is shown now`); }, true));
  return { icon: 'team', title: month ? ymLabel(k) : fScopeLabel(P, X) || 'Everyone', sub: [month ? fScopeLabel(P, X) || 'everyone' : ymLabel(k), monthLocked(k) ? 'final' : 'draft'].filter(Boolean).join(' · '), tiles, acts };
}
function fAnsSpv(s, k, X) {
  const team = teamOf(s.pid).filter(p => p.status !== 'Inactive'), map = k ? rowsByPid(k) : new Map(), rows = team.map(p => map.get(p._id)).filter(Boolean), A = aggRows(rows), role = X.role;
  const st = team.map(p => oneStatus(p._id, k)), held = st.filter(z => z.st === 'held' || z.st === 'closed').length, signed = st.filter(z => z.o && sigState(z.o) === 'signed').length;
  const done = (state.spvDone || {})[`${k}_${s.pid}`], sc = k ? spvScore(s.pid, k) : null;
  const tiles = [['Agents', String(team.length)], ['Adherence', pct(A.adh, 1), A.adh != null && A.adh < state.settings.target ? 'bad' : ''], ['Final % (KPI)', pct1(A.fin)], ['One-to-ones held', `${held} of ${team.length}`, held < team.length ? 'bad' : ''], ['Signed by the agent', `${signed} of ${held}`], ['Finished', done ? `Yes · ${fmtWhen(done.at)}` : 'Not yet', done ? '' : 'bad']];
  if (sc && sc.finalPct != null) tiles.push(['Supervisor scorecard', pct1(sc.finalPct)]);
  const acts = [];
  if ((WS_OF[role] || []).includes('team')) acts.push(fAct(role === 'spv' ? 'Open my team' : `Open ${s.name.split(' ')[0]}'s team`, () => { findClose(); if (role !== 'spv') state.wsSpv = s.pid; state.wsMonth = k; setWs('team'); renderWs(); }, true));
  if (canCycle()) acts.push(fAct('Supervisors page', () => { findClose(); state.wsMonth = k; setWs('cycle'); }));
  return { icon: 'team', title: `${s.name}'s team`, sub: `${ymLabel(k)} · supervisor`, tiles, acts };
}
function fAnsForm(x, k, X) {
  const os = oneStatus(x.id, k), acts = [];
  if (os.o && os.st !== 'planned') acts.push(fAct('Open the one-to-one', () => { findClose(); fOpenForm(os.o.id); }, true));
  if ((WS_OF[X.role] || []).includes('team')) acts.push(fAct('Team page', () => { findClose(); if (X.role !== 'spv') state.wsSpv = x.p.spv || ''; state.wsMonth = k; setWs('team'); renderWs(); }, !os.o || os.st === 'planned'));
  const sg = os.o ? sigState(os.o) : 'none';
  return { icon: 'pen', title: `${x.name} · one-to-one`, sub: ymLabel(k), big: os.st === 'none' ? 'Not yet' : os.st === 'planned' ? 'Arranged' : 'Held', bigCls: os.st === 'none' ? 'bad' : os.st === 'planned' ? '' : 'good',
    bigSub: [os.o && os.o.plannedAt && os.st === 'planned' ? `for ${Forms.fmtDate(os.o.plannedAt)}` : '', os.o && os.st !== 'planned' ? (sg === 'signed' ? 'signed by the agent' : sg === 'changed' ? 'changed since the agent signed' : 'waiting for the agent\'s signature') : '', os.fin ? 'final form saved' : ''].filter(Boolean).join(' · '), acts };
}
function fAnsSpecial(sp, P, X, k) {
  const role = X.role;
  if (sp === 'notdone' || sp === 'done') {
    if (!['senior', 'admin', 'user', 'wfm'].includes(role) || !X.spvs.length) return null;
    const R = cycleRows(k).filter(r => !P.spv || r.pid === P.spv.pid), F = R.filter(r => (sp === 'done' ? !!r.done : !r.done));
    const acts = canCycle() ? [fAct('Supervisors page', () => { findClose(); state.wsMonth = k; setWs('cycle'); }, true)] : [];
    return { icon: 'team', title: sp === 'done' ? `${F.length} of ${R.length} supervisors finished` : `${F.length} of ${R.length} supervisors not finished yet`, sub: ymLabel(k) + (cycleOf(k).deadline ? ` · deadline ${Forms.fmtDate(cycleOf(k).deadline)}` : ''),
      rows: F.map(r => ({ t: r.name, s: `${r.held} of ${r.team.length} one-to-ones held`, v: r.done ? `Finished ${fmtWhen(r.done.at)}` : 'Not yet', cls: r.done ? '' : 'bad', run: () => { findClose(); if ((WS_OF[role] || []).includes('team')) { state.wsSpv = r.pid; state.wsMonth = k; setWs('team'); renderWs(); } } })), acts, empty: F.length ? '' : 'Nobody.' };
  }
  if (sp === 'notheld' || sp === 'onetoone' || sp === 'unsigned') {
    if (!fForms(role)) return null;
    const L = X.people.filter(x => !x.off && fInScope(x, P)).map(x => ({ x, os: oneStatus(x.id, k) }));
    let F = L, title;
    if (sp === 'notheld') { F = L.filter(o => !(o.os.st === 'held' || o.os.st === 'closed')); title = `${F.length} of ${L.length} without a one-to-one held`; }
    else if (sp === 'unsigned') { F = L.filter(o => (o.os.st === 'held' || o.os.st === 'closed') && o.os.o && sigState(o.os.o) !== 'signed'); title = `${F.length} one-to-ones waiting for the agent's signature`; }
    else { const held = L.filter(o => o.os.st === 'held' || o.os.st === 'closed').length; title = `${held} of ${L.length} one-to-ones held`; F = L.slice().sort((a, b) => ['none', 'planned', 'held', 'closed'].indexOf(a.os.st) - ['none', 'planned', 'held', 'closed'].indexOf(b.os.st)); }
    const lab = o => (o.os.st === 'none' ? 'Not yet' : o.os.o && replyNew(o.os.o) ? 'Replied: to review' : o.os.st === 'planned' ? `Arranged${o.os.o && o.os.o.plannedAt ? ' · ' + Forms.fmtDate(o.os.o.plannedAt) : ''}` : sigState(o.os.o) === 'signed' ? 'Held · signed' : sigState(o.os.o) === 'changed' ? 'Held · changed after signing' : agentHasAccount(o.x.id) ? 'Held · not signed' : 'Held · no account yet');
    const acts = (WS_OF[role] || []).includes('team') ? [fAct(role === 'spv' ? 'Open my team' : 'Team page', () => { findClose(); if (role !== 'spv' && P.spv) state.wsSpv = P.spv.pid; state.wsMonth = k; setWs('team'); renderWs(); }, true)] : [];
    return { icon: 'pen', title, sub: [ymLabel(k), fScopeLabel(P, X)].filter(Boolean).join(' · '), rows: F.slice(0, 40).map(o => ({ t: o.x.name, s: o.x.unit, v: lab(o), cls: o.os.st === 'none' ? 'bad' : '', run: () => { findClose(); if (o.os.o && o.os.st !== 'planned') fOpenForm(o.os.o.id); else openPerson(o.x.id); } })), more: F.length > 40 ? `and ${F.length - 40} more` : '', acts, empty: F.length ? '' : 'Nobody.' };
  }
  if (sp === 'noteligible' || sp === 'eligible') {
    if (role === 'quality') return null;
    const L = fRowsK(k, X, P).filter(o => o.r._el), F = L.filter(o => (sp === 'eligible' ? o.r._el.ok : !o.r._el.ok));
    const acts = (WS_OF[role] || []).includes('results') ? [fAct('Results page', () => { findClose(); state.wsMonth = k; setWs('results'); }, true)] : [];
    return { icon: 'check', title: sp === 'eligible' ? `${F.length} of ${L.length} eligible for the incentive` : `${F.length} of ${L.length} not eligible for the incentive`, sub: [ymLabel(k), fScopeLabel(P, X)].filter(Boolean).join(' · '),
      note: 'Not eligible: a final % under 80%, an attitude critical error, or fewer than 5 days attended (the senior manager can change it).',
      rows: F.slice(0, 40).map(o => fRowP(o.x, sp === 'eligible' ? (fStaffSR(role) && o.r.earned != null ? `${Math.round(o.r.earned).toLocaleString('en-US')} SR` : 'Eligible') : 'Not eligible', sp === 'eligible' ? '' : 'bad', sp === 'eligible' ? o.x.unit : (o.r._el.why || []).join(', ') || o.x.unit)), more: F.length > 40 ? `and ${F.length - 40} more` : '', acts, empty: F.length ? '' : 'Nobody.' };
  }
  if (sp === 'critical') {
    if (!['quality', 'admin', 'user', 'senior'].includes(role)) return null;
    const Q = state.quality[k], L = X.people.filter(x => fInScope(x, P)).map(x => ({ x, q: Q && Q.rows ? Q.rows[x.id] : null })).filter(o => o.q && (o.q.crit || []).length);
    const acts = (WS_OF[role] || []).includes('quality') ? [fAct('Quality page', () => { findClose(); state.qMonth = k; setWs('quality'); }, true)] : [];
    return { icon: 'star', title: `${L.length} with critical errors`, sub: ymLabel(k) + (Q ? '' : ' · no Final EVAL yet'), rows: L.map(o => fRowP(o.x, plural(o.q.crit.length, 'error'), (o.q.crit || []).some(c => ATTITUDE.test(c.type || '')) ? 'bad' : '', o.q.crit.map(c => c.type || 'critical').join(', '))), acts, empty: L.length ? '' : 'Nobody.' };
  }
  if (sp === 'deadline') {
    if (!['senior', 'admin', 'spv', 'wfm', 'user'].includes(role)) return null;
    const dl = cycleOf(k).deadline || '', days = dl ? Math.ceil((new Date(dl + 'T23:59:59') - Date.now()) / 864e5) : null;
    const acts = canCycle() ? [fAct(dl ? 'Change it · Supervisors page' : 'Set it · Supervisors page', () => { findClose(); state.wsMonth = k; setWs('cycle'); }, true)] : [];
    return { icon: 'clock', title: `One-to-one deadline · ${ymLabel(k)}`, big: dl ? Forms.fmtDate(dl) : 'Not set', bigCls: days != null && days < 0 ? 'bad' : '', bigSub: days == null ? (canCycle() ? 'Set it on the Supervisors page.' : 'The senior manager has not set it yet.') : days < 0 ? `${plural(-days, 'day')} ago` : days === 0 ? 'today' : `in ${plural(days, 'day')}`, acts };
  }
  if (sp === 'waiting') {
    const spvPid = role === 'spv' ? (Auth.user() || {}).pid : P.spv ? P.spv.pid : '';
    if (role !== 'spv' && !(Auth.isAdmin && Auth.isAdmin())) return null;
    const L = waitingList(spvPid);
    return { icon: 'user', title: `${plural(L.length, 'agent')} waiting for approval`, sub: role === 'spv' ? 'your team' : 'everyone', rows: L.map(a => ({ t: a.name, s: a.username || '', v: 'Waiting', run: () => { findClose(); setWs('team'); renderWs(); } })), acts: [fAct('Team page', () => { findClose(); setWs('team'); renderWs(); }, true)], empty: L.length ? '' : 'Nobody is waiting.' };
  }
  return null;
}
/** a day from the daily data: the brands, and the agents' day (absent, late, adherence) */
function fAnsDay(P, X) {
  const d = P.day, k = d.slice(0, 7), AM = dailyMonth(k), D = AM && AM.days ? AM.days[d] : null, H = state.dhist || {};
  const brands = DH_BRANDS.map(([b, l]) => { const r = ((((H[b] || {}).voice || {}).daily) || []).find(z => z.date === d); return r ? { b, l, r } : null; }).filter(Boolean).filter(o => !P.brand || F_DBRAND[P.brand] === o.b);
  const title = Forms.fmtDate(d), tiles = [];
  for (const o of brands) tiles.push([`${o.l}`, `${pct(o.r.sl, 1)} SL`, o.r.sl != null && o.r.sl < 0.8 ? 'bad' : '', `${n0(o.r.presented)} offered · AHT ${o.r.aht == null ? '–' : mss(o.r.aht)}`]);
  if (!D) return { icon: 'day', title, sub: 'Daily data', tiles, note: AM && !AM.loaded ? 'Loading the agents\' days…' : 'No agents\' day stored for this date (the WFM daily review saves it).', loading: !!(AM && !AM.loaded) };
  const ag = D.agents.map(a => ({ a, x: X.byName.get(normName(a.n)) || null })).filter(o => !o.x ? !(P.brand || P.team || P.spv) && fRole() !== 'spv' : fInScope(o.x, P));
  const sch = ag.filter(o => o.a.sch > 0 && !o.a.lv), abs = sch.filter(o => o.a.abs), late = ag.filter(o => o.a.late > 0), lv = ag.filter(o => o.a.lv), adh = mean(sch.map(o => o.a.adh));
  tiles.unshift(['Scheduled', String(sch.length)], ['Absent', String(abs.length), abs.length ? 'bad' : ''], ['Late', String(late.length), late.length ? 'bad' : ''], ['On leave', String(lv.length)], ['Adherence', pct(adh, 1), adh != null && adh < state.settings.target ? 'bad' : '']);
  const mk = P.metric ? P.metric.k : '';
  let rows = [], head = '';
  const rowA = (o, v, cls) => ({ t: o.x ? o.x.name : o.a.n, s: o.x ? o.x.unit : '', v, cls, run: o.x ? () => { findClose(); openPerson(o.x.id); } : null });
  if (mk === 'tardy' || mk === 'wfLate') { head = 'Late'; rows = late.sort((a, b) => b.a.late - a.a.late).map(o => rowA(o, `${Math.round(o.a.late)} min`, 'bad')); }
  else if (mk === 'adh') { head = 'Lowest adherence'; rows = sch.filter(o => o.a.adh != null).sort((a, b) => a.a.adh - b.a.adh).slice(0, 15).map(o => rowA(o, pct(o.a.adh, 1), o.a.adh < state.settings.target ? 'bad' : '')); }
  else if (mk === 'leave2') { head = 'On leave'; rows = lv.map(o => rowA(o, o.a.lv)); }
  else { head = 'Absent'; rows = abs.map(o => rowA(o, 'Absent', 'bad')); }
  const acts = [fAct('Daily dashboard', () => { findClose(); state.wfmTab = 'daily'; state.dailyK = k; state.dailyKPicked = true; setWs('wfm'); renderWs(); }, true)];
  return { icon: 'day', title: `${title}${head ? ' · ' + head : ''}`, sub: [fScopeLabel(P, X), D.by ? `saved by ${D.by}` : ''].filter(Boolean).join(' · '), tiles, rows, acts, empty: rows.length ? '' : 'Nobody.' };
}
/** a brand measure (service level, ASA, offered, answered, abandoned), month to date or one day */
function fAnsBrand(P, X) {
  const mt = P.metric, H = state.dhist || {}, ks = new Set(); for (const [b] of DH_BRANDS) for (const r of (((H[b] || {}).voice || {}).daily || [])) ks.add(r.date.slice(0, 7));
  const K = [...ks].sort(), k = P.month && K.includes(P.month) ? P.month : K[K.length - 1];
  if (!k) return { icon: 'day', title: mt.label, note: 'No daily data yet: the WFM analysts save it when they drop the day\'s exports in Report builder.' };
  const B = DH_BRANDS.filter(([b]) => !P.brand || F_DBRAND[P.brand] === b);
  const rowsB = B.map(([b, l]) => {
    const L = ((((H[b] || {}).voice || {}).daily) || []).filter(r => (P.day ? r.date === P.day : r.date.startsWith(k)));
    if (!L.length) return null;
    const s = f => L.reduce((a, r) => a + (r[f] || 0), 0), w = (f, by) => { const t = s(by); return t ? L.reduce((a, r) => a + (r[f] || 0) * (r[by] || 0), 0) / t : null; };
    const v = mt.brandM === 'sl' ? w('sl', 'presented') : mt.brandM === 'asa' ? w('asa', 'handled') : mt.brandM === 'presented' ? s('presented') : mt.brandM === 'ansPct' ? (s('presented') ? s('handled') / s('presented') : null) : (s('presented') ? s('abandoned') / s('presented') : null);
    const days = L.map(r => r.date).sort(), series = days.map(dd => { const r = L.find(z => z.date === dd); return mt.brandM === 'sl' ? r.sl : mt.brandM === 'asa' ? r.asa : mt.brandM === 'presented' ? r.presented : mt.brandM === 'ansPct' ? (r.presented ? r.handled / r.presented : null) : (r.presented ? r.abandoned / r.presented : null); });
    return { l, v, days, series };
  }).filter(Boolean);
  const t = fTarget(mt), one = rowsB.length === 1 ? rowsB[0] : null;
  return { icon: 'day', title: `${mt.label} · ${P.day ? Forms.fmtDate(P.day) : ymLabel(k) + ' to date'}`, sub: P.brand || 'all brands', big: one ? mt.fmt(one.v) : '', bigCls: one && t != null && one.v != null ? (fMiss(mt, one.v, t) ? 'bad' : 'good') : '', spark: one && !P.day ? fSpark(one.series, one.days.map(dd => Forms.fmtDate(dd))) : '',
    rows: one ? [] : rowsB.map(o => ({ t: o.l, s: P.day ? '' : plural(o.days.length, 'day'), v: mt.fmt(o.v), cls: t != null && o.v != null && fMiss(mt, o.v, t) ? 'bad' : '' })),
    acts: [fAct('Daily dashboard', () => { findClose(); state.wfmTab = 'daily'; state.dailyK = k; state.dailyKPicked = true; setWs('wfm'); renderWs(); }, true)] };
}
/** an agent's own page */
function fAnsMe(P, X) {
  const M = state.me; if (!M || !M.months) return null;
  const k = P.month && M.months[P.month] ? P.month : fMonthNow(X), rec = k ? M.months[k] : null, r = rec ? rec.row || {} : null, fin = rec && rec.status === 'final';
  const go = (kk, card) => () => { findClose(); state.meMonth = kk; setWs('me'); renderWs(); if (card) fScrollCard(card); };
  if (P.month && !M.months[P.month]) return { icon: 'user', title: ymLabel(P.month), note: `Your ${ymLabel(P.month)} is not shared with you yet.` };
  if (P.sp === 'onetoone' || P.sp === 'sign' || P.sp === 'unsigned') {
    const F = Object.entries(M.forms || {}).map(([id, f]) => ({ ...f, id })).filter(f => !P.month || fkey(f) === k).sort((a, b) => fkey(b).localeCompare(fkey(a)) || String(a.kind).localeCompare(String(b.kind)));
    return { icon: 'pen', title: 'Your one-to-ones', sub: P.month ? ymLabel(k) : 'every month', rows: F.map(f => { const st = meSigState(f), w = meFormWhere(f); return { t: `${FORM_TITLE[f.kind] || 'Form'} · ${ymLabel(fkey(f))}`, s: f.supervisor ? `with ${f.supervisor}` : '', v: st === 'signed' ? 'Signed' : st === 'changed' ? 'Sign again' : w === 'sign' ? 'To sign' : w === 'sent' ? 'Sent, waiting for the final' : 'To fill in', cls: st !== 'signed' && w !== 'sent' ? 'bad' : '', run: () => { findClose(); state.meMonth = fkey(f); setWs('me'); openSign(f.id); } }; }), empty: F.length ? '' : 'No one-to-one shared with you yet.' };
  }
  if (P.kw.has('spvkw')) { const p = M.prof || {}; return { icon: 'team', title: 'Your supervisor', big: p.spvName || '–', bigSub: [p.brand, p.teamName || p.team].filter(Boolean).join(' · ') }; }
  if (!rec) return null;
  const mt = P.metric;
  if (mt) {
    if (mt.k === 'earned' && !fin) return { icon: 'chart', title: `Incentive · ${ymLabel(k)}`, big: r._el || r.el ? ((r._el || r.el).ok ? 'Eligible so far' : 'Not eligible yet') : '–', bigSub: 'The amount shows when the month is final.', acts: [fAct('Open my page', go(k), true)] };
    const v = mt.inter ? (r.inter ? mt.get(r, { calls: r.inter.calls, aht: r.inter.aht, short: r.inter.short, agentDisc: r.inter.agentDisc, drops: r.inter.drops, rep72: r.inter.rep72, agShort: r.inter.agShort }) : null) : mt.get(r), t = fTarget(mt);
    const ms = X.months.filter(z => z <= k).slice(-6), vals = ms.map(z => { const rr = (M.months[z] || {}).row; return rr && !mt.inter ? mt.get(rr) : null; });
    return { icon: 'chart', title: `Your ${mt.label.toLowerCase()}`, sub: `${ymLabel(k)} · ${fin ? 'final' : 'draft'}`, big: v == null ? '–' : mt.fmt(v), bigCls: v != null && t != null ? (fMiss(mt, v, t) ? 'bad' : 'good') : '', bigSub: t != null ? `target ${mt.dir >= 0 ? '≥' : '≤'} ${mt.fmt(t)}` : '', spark: fSpark(vals, ms.map(ymLabel)), acts: [fAct('Open my page', go(k), true)] };
  }
  if (P.month || P.kw.has('my') || !P.raw) {
    const el = r._el || r.el;
    const tiles = [['Adherence', pct(r.adh, 1), r.adh != null && r.adh < state.settings.target ? 'bad' : ''], ['Final % (KPI)', pct1(r.fin)], ['AHT', mss(r.aht)], ['Absent days', r.absent == null ? '–' : String(r.absent)], ['Tardy minutes', r.tardy == null ? '–' : String(Math.round(r.tardy))], ['Incentive', fin ? (r.earned == null ? '–' : `${Math.round(r.earned).toLocaleString('en-US')} SR`) : el ? (el.ok ? 'Eligible so far' : 'Not yet') : '–']];
    return { icon: 'user', title: ymLabel(k), sub: fin ? 'final' : 'draft', tiles, acts: [fAct('Open my page', go(k), true)] };
  }
  return null;
}

// ---------------------------------------------------------------- suggestions
const F_START = {
  admin: ['lowest adherence', 'below target', 'most absent', 'supervisors not finished', 'not eligible', 'import'],
  user: ['lowest adherence', 'below target', 'most absent', 'highest aht', 'not eligible', 'import'],
  senior: ['supervisors not finished', 'not eligible', 'lowest final %', 'one to ones not held', 'deadline', 'four emails'],
  wfm: ['absent yesterday', 'lowest adherence', 'service level', 'highest aht', 'repeat callers', 'daily emails'],
  spv: ['my team adherence', 'one to ones not held', 'not signed', 'below target', 'most absent', 'deadline'],
  quality: ['lowest quality observations', 'critical errors', 'drc csat below target', 'final eval'],
  agent: ['my adherence', 'my one to one', 'my final %', 'absent days', 'my supervisor'],
};
function findItems(q, P, X, A) {
  const L = [], role = X.role, add = it => { if (!L.some(z => z.key === it.key)) L.push(it); };
  const setQ = text => () => findSet(text);
  if (!P.raw) {
    const M = fMem(), rec = Object.entries(M.q).sort((a, b) => b[1].at - a[1].at).slice(0, 4);
    for (const [qq] of rec) add({ key: 'r:' + qq, kind: 'recent', icon: 'clock', title: qq, sub: 'Recent', run: setQ(qq), keep: true });
    const fav = Object.entries(M.e).filter(([k]) => k.startsWith('p:')).sort((a, b) => b[1].n - a[1].n).slice(0, 3);
    for (const [k] of fav) { const x = X.people.find(z => 'p:' + z.id === k); if (x) add({ key: k, kind: 'p', icon: 'user', title: x.name, sub: x.unit, run: () => { findClose(); openPerson(x.id); } }); }
    for (const s of F_START[role] || []) add({ key: 'try:' + s, kind: 'try', icon: 'search', title: s, sub: 'Try', run: setQ(s), keep: true });
    for (const g of X.pages.slice().sort((a, b) => fBoost(b.key) - fBoost(a.key)).slice(0, 3)) add({ key: g.key, kind: 'g', icon: 'grid', title: g.title, sub: g.sub, run: g.run });
    return L;
  }
  // people and supervisors
  const T = fwords(q);
  for (const o of P.people.slice(0, 6)) {
    if (o.s < 0.7) continue; const x = o.x, k = fMonthNow(X), r = k ? rowsByPid(k).get(x.id) : null;
    add({ key: 'p:' + x.id, kind: 'p', icon: 'user', title: x.name, sub: [x.unit, supName(x.p.spv)].filter(Boolean).join(' · '), val: r && role !== 'quality' ? pct(r.adh, 2) : '', s: o.s + 0.2, run: () => { findClose(); openPerson(x.id); } });
  }
  if (P.spv) add({ key: 's:' + P.spv.pid, kind: 's', icon: 'team', title: `${P.spv.name}'s team`, sub: plural(P.spv.size || teamOf(P.spv.pid).length, 'agent'), s: 1.1, run: () => findSet(`${P.spv.name} `) });
  // measures: refine the line with them
  const lastT = P.partial ? T[T.length - 1] || '' : '';
  const mts = X.metrics.map(mt => { const words = [mt.label, ...((mt.syn || (F_SYN[mt.k] || [''])[0]).split('|'))].map(w => fwords(w).join(' ')); let b = 0; for (const w of words) { if (!w) continue; if (lastT && w.startsWith(lastT)) b = Math.max(b, 0.75 + lastT.length / Math.max(w.length, 1) * 0.2); if (T.join(' ').includes(w)) b = Math.max(b, 0.9); } return { mt, b: b + fBoost(mt.key) }; }).filter(o => o.b > 0.7).sort((a, b) => b.b - a.b).slice(0, 4);
  const personCtx = P.one && (!lastT || (T.length >= 2 && fMatchPeople(T.slice(0, -1), X, false).some(o => o.x === P.one && o.s >= 0.78)));
  for (const { mt, b } of mts) {
    if (P.metric === mt && A) continue;
    const base = lastT && fwords(mt.label).join(' ').startsWith(lastT) ? q.slice(0, q.length - lastT.length) : q + ' ';
    const text = (P.metric === mt ? q : base + mt.label.toLowerCase()).replace(/\s+/g, ' ').trimStart();
    add({ key: mt.key, kind: 'm', icon: 'chart', title: personCtx ? `${P.one.name} · ${mt.label}` : mt.label, sub: personCtx ? 'Measure' : mt.brandM ? 'Brands, from the daily data' : mt.kpi ? 'KPI' : 'Measure', s: b, run: setQ(text + ' '), keep: true });
  }
  // pages and actions
  for (const g of X.pages) {
    const W = [g.title, ...g.words.split('|')].map(w => fwords(w)); let b = 0;
    for (const ws of W) { let sc = 0, ok = true; for (let i = 0; i < T.length; i++) { let bb = 0; for (const w of ws) bb = Math.max(bb, ftok(T[i], w, P.partial && i === T.length - 1)); if (bb < 0.6) { ok = false; break; } sc += bb; } if (ok) b = Math.max(b, sc / T.length); }
    if (P.pages.includes(g)) b = Math.max(b, 1);
    if (b >= 0.7) add({ key: g.key, kind: 'g', icon: 'grid', title: g.title, sub: g.sub, s: b + fBoost(g.key) - 0.05, run: g.run });
  }
  // the guide: how-to questions
  const HT = T.filter(t => t.length >= 3 && !F_STOP.has(t) && !['how', 'where', 'can', 'kif', 'كيف', 'وين'].includes(t));
  if (HT.length) {
    const how = /^(how|where|can i|what is|why|كيف|وين|اين)\b/.test(P.raw);
    const H = X.help.map(hp => { let m = 0; for (const t of HT) if (hp.w.some(w => w === t || (t.length >= 4 && w.startsWith(t)) || (t.length >= 5 && flev(t, w, 1) <= 1))) m++; return { hp, sc: m / HT.length, m }; })
      .filter(o => o.m >= Math.min(2, HT.length) && o.sc >= (how ? 0.5 : 0.75)).sort((a, b) => b.sc - a.sc || a.hp.text.length - b.hp.text.length).slice(0, how ? 3 : 2);
    for (const { hp, sc } of H) add({ key: 'h:' + hp.text.slice(0, 40), kind: 'help', icon: 'help', title: hp.text.length > 96 ? hp.text.slice(0, 94) + '…' : hp.text, sub: 'How to use', s: (how ? 0.95 : 0.7) + sc * 0.1, run: () => { openDrawer('dHelp'); requestAnimationFrame(() => { hp.el.scrollIntoView({ block: 'center' }); hp.el.classList.add('fhit'); setTimeout(() => hp.el.classList.remove('fhit'), 2200); }); } });
  }
  // months
  for (const k of X.months) { const lab = ymLabel(k), W = fwords(lab + ' ' + MONTH_LONG[+k.slice(5) - 1]); if (T.some((t, i) => W.some(w => ftok(t, w, P.partial && i === T.length - 1) >= 0.8)) && !P.month) add({ key: 'k:' + k, kind: 'k', icon: 'clock', title: lab, sub: 'Month', s: 0.72, run: setQ(`${q.replace(/\S+$/, '')}${lab} `), keep: true }); }
  // recent searches that start the same way
  for (const [qq, v] of Object.entries(fMem().q)) if (fnorm(qq).startsWith(P.raw) && fnorm(qq) !== P.raw) add({ key: 'r:' + qq, kind: 'recent', icon: 'clock', title: qq, sub: 'Recent', s: 0.74 + Math.min(0.2, v.n * 0.03), run: setQ(qq), keep: true });
  return L.sort((a, b) => (b.s || 0) - (a.s || 0)).slice(0, 10);
}
/** the next words: what usually comes after what is typed */
function findChips(P, X) {
  if (!P.raw) return [];
  const C = [], role = X.role, has = w => P.raw.includes(fnorm(w));
  const mets = X.me ? ['adherence', 'final %', 'aht', 'absent', 'one to one'] : role === 'quality' ? X.metrics.filter(m => m.kpi).slice(0, 4).map(m => m.label.toLowerCase()).concat('final %') : ['adherence', 'aht', 'final %', 'absent', 'tardy'];
  if (X.me) { if (!P.metric && !P.sp && !P.unknown) C.push(...mets); }
  else if (P.one && !P.metric && !P.sp) { C.push(...mets); if (fForms(role)) C.push('one to one'); }
  else if (P.spv && !P.metric) C.push('adherence', 'final %', 'not held', 'not signed');
  else if (P.day && !P.metric) C.push('absent', 'late', 'adherence');
  else if (P.metric && !P.one && !P.metric.brandM) {
    if (!P.sup && !P.tgt && !P.cmp) C.push('lowest', 'highest', ...(fTarget(P.metric) != null ? ['below target'] : []));
    if (!P.brand && !P.team && role !== 'spv') C.push(...[...new Set(X.people.map(x => x.p.brand).filter(Boolean))].slice(0, 3).map(b => b.toLowerCase()));
    if (!P.month && X.months.length > 1) C.push(MONTH_LONG[+X.months[X.months.length - 2].slice(5) - 1].toLowerCase());
    if (!P.kw.has('trend')) C.push('trend');
  } else if (P.metric && P.metric.brandM && !P.brand) C.push('virgin', 'friendi', 'friendi pay', 'postpaid');
  else if (!P.metric && !P.one && !P.sp && !P.pages.length && P.people.length > 1) C.push(...P.people.slice(0, 4).map(o => fwords(o.x.name).slice(0, 2).join(' ')));
  return [...new Set(C)].filter(w => !has(w)).slice(0, 6);
}
/** the rest of the word or phrase being typed, the likeliest first */
function findGhost(q, X) {
  if (!q || /\s$/.test(q) || q.length > 80 || /[\u0590-\u08ff]/.test(q)) return '';   // right-to-left text: no guess drawn over it
  const T = fwords(q); if (!T.length) return '';
  const rawTail = q.toLowerCase().split(/\s+/);
  for (let n = Math.min(3, T.length); n >= 1; n--) {
    const s = T.slice(-n).join(' '); if (s.length < 2) continue;
    if (rawTail.slice(-n).join(' ') !== s) continue;   // the box shows what was typed; the guess must continue it letter for letter
    let best = null, bs = -1;
    for (const v of X.vocab) { if (v.w.length <= s.length || !v.w.startsWith(s)) continue; const sc = v.wt + fBoost(v.key) * 2 - v.w.length * 0.004; if (sc > bs) { bs = sc; best = v; } }
    if (best) { const rest = best.w.slice(s.length), m = rest.match(/^(\S*)((?:\s\S+){0,1})/); return m ? m[1] + m[2] : rest; }   // the word, and at most one more
  }
  return '';
}

// ---------------------------------------------------------------- the box
const FICON = { help: 'i-help', user: 'i-user', team: 'i-team', chart: 'i-chart', grid: 'i-grid', clock: 'i-clock', pen: 'i-pen', day: 'i-day', check: 'i-check', star: 'i-star', search: 'i-search' };
const ficon = n => `<svg aria-hidden="true"><use href="#${FICON[n] || 'i-search'}"/></svg>`;
function findAllowed() { const L = WS_OF[fRole()] || []; return L.length > 0 && $('lock').hidden; }
function findOpen(q) {
  if (!findAllowed()) return;
  hidePop();
  if ($('find').hidden) FIND.prev = document.activeElement;
  $('find').hidden = false; document.body.classList.add('findon');
  const i = $('findQ'); i.value = q != null ? q : ''; FIND.sel = -1;
  findUpdate(); i.focus(); i.select();
}
function findClose() {
  if ($('find').hidden) return;
  $('find').hidden = true; document.body.classList.remove('findon'); clearTimeout(FIND.wait);
  if (FIND.prev && FIND.prev.isConnected && FIND.prev !== document.body) { try { FIND.prev.focus({ preventScroll: true }); } catch (e) { /* none */ } }
}
function findSet(text) { const i = $('findQ'); i.value = text; FIND.sel = -1; findUpdate(); i.focus(); const n = i.value.length; i.setSelectionRange(n, n); }
function findUpdate() {
  const q = $('findQ').value; FIND.q = q;
  let X, P, A = null, items = [], chips = [], ghost = '';
  try {
    X = findIndex(); P = findParse(q, X);
    try { A = findAnswer(P, X); } catch (e) { A = null; console.warn('search answer', e); }
    items = findItems(q, P, X, A); chips = findChips(P, X); ghost = findGhost(q, X);
  } catch (e) { console.warn('search', e); }
  FIND.items = items; FIND.acts = []; FIND.ghost = ghost;
  if (FIND.sel >= items.length) FIND.sel = items.length ? 0 : -1;
  const reg = fn => { FIND.acts.push(fn); return FIND.acts.length - 1; };
  // the answer
  let h = '';
  if (A && P && P.fixed && P.fixed.length) A.note = [`Read as: ${P.fixed.map(f => f[1]).join(', ')}.`, A.note || ''].filter(Boolean).join(' ');
  if (A) {
    h += `<section class="fans" aria-live="polite"><div class="fahead"><span class="fic">${ficon(A.icon)}</span><div><b>${esc(A.title)}</b>${A.sub ? `<span>${esc(A.sub)}</span>` : ''}</div>${A.status ? `<span class="pill">${esc(A.status)}</span>` : ''}</div>`;
    if (A.big) h += `<div class="fabig"><b class="${A.bigCls || ''}">${esc(A.big)}</b>${A.bigSub ? `<span>${esc(A.bigSub)}</span>` : ''}${A.spark || ''}</div>`;
    else if (A.bigSub || A.spark) h += `<div class="fabig sm">${A.bigSub ? `<span>${esc(A.bigSub)}</span>` : ''}${A.spark || ''}</div>`;
    if (A.tiles && A.tiles.length) h += `<div class="fatiles">${A.tiles.map(([l, v, cls, s]) => `<div class="${cls || ''}"${s ? ` title="${esc(s)}"` : ''}><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
    if (A.note) h += `<p class="fanote">${esc(A.note)}</p>`;
    if (A.rows && A.rows.length) h += `<ol class="farows">${A.rows.map(r => `<li>${r.run ? `<button class="linkbtn" data-fa="${reg(r.run)}" dir="auto">${esc(r.t)}</button>` : `<span dir="auto">${esc(r.t)}</span>`}${r.s ? `<small>${esc(r.s)}</small>` : '<small></small>'}<b class="${r.cls || ''}">${esc(r.v)}</b></li>`).join('')}</ol>`;
    else if (A.empty) h += `<p class="fanote">${esc(A.empty)}</p>`;
    if (A.more) h += `<p class="fanote">${esc(A.more)}</p>`;
    if (A.acts && A.acts.length) { FIND.primary = A.acts.find(a => a.primary) || null; h += `<div class="faacts">${A.acts.map(a => `<button class="btn sm${a.primary ? ' primary' : ''}" data-fa="${reg(a.run)}">${esc(a.l)}</button>`).join('')}</div>`; } else FIND.primary = null;
    h += '</section>';
    if (A.loading) { clearTimeout(FIND.wait); FIND.wait = setTimeout(() => { if (!$('find').hidden) findUpdate(); }, 900); }
  } else FIND.primary = null;
  $('findAns').innerHTML = h;
  // the list
  const hl = t => { const W = fwords(q); return esc(t).replace(/[\p{L}\p{N}]+/gu, w => { const n = fnorm(w); const m = W.find(z => z.length >= 1 && n.startsWith(z)); return m && n.length === w.length ? `<mark>${w.slice(0, m.length)}</mark>${w.slice(m.length)}` : w; }); };
  $('findList').innerHTML = items.map((it, i) => `<li role="option" id="fo${i}" data-fi="${i}" aria-selected="${i === FIND.sel}"><span class="fic">${ficon(it.icon)}</span><span class="ftx"><b dir="auto">${hl(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.val ? `<span class="fval">${esc(it.val)}</span>` : ''}</li>`).join('')
    || (q && !A ? `<li class="fnone">Nothing found for “${esc(q)}”. Try a name, a measure like adherence or AHT, a month, or a page.</li>` : '');
  $('findQ').setAttribute('aria-activedescendant', FIND.sel >= 0 ? 'fo' + FIND.sel : '');
  $('findChips').innerHTML = chips.map(c => `<button class="fchip" data-fc="${esc(c)}">${esc(c)}</button>`).join('');
  $('findChips').hidden = !chips.length;
  // the guess, shown after what was typed
  $('findGhost').innerHTML = ghost ? `<span class="gt">${esc(q)}</span>${esc(ghost)}` : '';
  const sc = X && X.people ? (X.me ? 'Your own page' : fRole() === 'spv' ? `Your team · ${plural(X.people.length, 'agent')}` : fRole() === 'quality' ? `KPI results · ${plural(X.people.length, 'agent')}` : plural(X.people.length, 'agent')) : '';
  $('findScope').textContent = sc;
}
function findRun(i) {
  const it = FIND.items[i]; if (!it) return;
  fLearn(it.keep ? '' : FIND.q, it.key);
  if (!it.keep) findClose();   // going somewhere: the box closes first
  it.run();
}
function findMove(d) {
  const n = FIND.items.length; if (!n) return;
  FIND.sel = FIND.sel < 0 ? (d > 0 ? 0 : n - 1) : (FIND.sel + d + n) % n;
  $('findList').querySelectorAll('[data-fi]').forEach(li => li.setAttribute('aria-selected', String(+li.dataset.fi === FIND.sel)));
  const el = $('fo' + FIND.sel); if (el) el.scrollIntoView({ block: 'nearest' });
  $('findQ').setAttribute('aria-activedescendant', 'fo' + FIND.sel);
}
function findAccept() { if (!FIND.ghost) return false; const i = $('findQ'); findSet(i.value + FIND.ghost + (/\s/.test(FIND.ghost.slice(-1)) ? '' : ' ')); return true; }

// ---------------------------------------------------------------- events
$('findBtn').addEventListener('click', () => findOpen());
$('findQ').addEventListener('input', () => { FIND.sel = -1; clearTimeout(FIND.t); FIND.t = setTimeout(findUpdate, 40); });
$('findQ').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); findMove(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); findMove(-1); }
  else if (e.key === 'Tab' && !e.shiftKey && FIND.ghost) { e.preventDefault(); findAccept(); }
  else if (e.key === 'ArrowRight' && FIND.ghost && e.target.selectionStart === e.target.value.length) { e.preventDefault(); findAccept(); }
  else if (e.key === 'Enter') {
    e.preventDefault(); clearTimeout(FIND.t); findUpdate();
    if (FIND.sel >= 0) findRun(FIND.sel);
    else if (FIND.primary) { fLearn(FIND.q, ''); FIND.primary.run(); }
    else if (FIND.items.length) findRun(0);
  }
});
$('find').addEventListener('click', e => {
  if (e.target.closest('[data-findclose]')) { findClose(); return; }
  const a = e.target.closest('[data-fa]'); if (a) { const fn = FIND.acts[+a.dataset.fa]; if (fn) { fLearn(FIND.q, ''); fn(); } return; }
  const li = e.target.closest('[data-fi]'); if (li) { findRun(+li.dataset.fi); return; }
  const c = e.target.closest('[data-fc]'); if (c) { const i = $('findQ'), v = i.value, w = c.dataset.fc, T = v.split(/\s+/), last = /\s$/.test(v) ? '' : T[T.length - 1] || ''; findSet((last && fnorm(w).startsWith(fnorm(last)) ? v.slice(0, v.length - last.length) : v.replace(/\s*$/, ' ')) + w + ' '); return; }
  if (e.target.closest('[data-fforget]')) { fForget(); findUpdate(); toast('Your recent searches are cleared in this browser.'); }
});
$('findList').addEventListener('mousemove', e => { const li = e.target.closest('[data-fi]'); if (li && +li.dataset.fi !== FIND.sel) { FIND.sel = +li.dataset.fi; $('findList').querySelectorAll('[data-fi]').forEach(x => x.setAttribute('aria-selected', String(x === li))); } });
document.addEventListener('keydown', e => {
  const open = !$('find').hidden;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); e.stopPropagation(); if (open) findClose(); else findOpen(); return; }
  if (!open && e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) { const t = e.target; if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return; if (!$('find').hidden || !findAllowed()) return; e.preventDefault(); findOpen(); return; }
  if (open && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); findClose(); return; }
  if (open && e.key === 'Tab') {   // keep the focus in the box
    const f = [...$('find').querySelectorAll('input, button, [href]')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.target === $('findQ') && !e.shiftKey && FIND.ghost) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    e.stopPropagation();
  }
}, true);
/** the search button shows for everyone who has a page (not on the lock screen or while waiting for a role) */
function syncFindBtn() { const b = $('findBtn'); if (b) b.hidden = !(WS_OF[fRole()] || []).length; }
