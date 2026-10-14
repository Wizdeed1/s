
(function (root) {
"use strict";
/* ══════════════════════════════════════════════════════════════════════
   WFM DAILY REVIEW
   Designed, specified and built by Dia'a Banjar
   Workforce Management · Beyond One
   © 2026 Dia'a Banjar. All rights reserved.
   Carried into the Member Care Report Builder as its own tab: three brands
   (Virgin, FRiENDi, FRiENDi Pay) and the Member Care email theme. The Genesys
   calls exports dropped for the brand reports double as the queue exports.
   ══════════════════════════════════════════════════════════════════════ */

/* ══ 0 · SMALL UTILITIES ══ */
const clamp = (n,a,b) => Math.min(b, Math.max(a,n));

/** Escape anything that comes out of a CSV before it touches HTML. */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** "1,234" · " 87.5 % " · "" → number. Never returns NaN. */
function toNum(v){
  if(v == null) return 0;
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).replace(/[\s,%]/g,'').replace(/[^\d.\-]/g,'');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const toInt = v => Math.round(toNum(v));

/**
 * Percentages arrive either as a fraction (0.854) or already scaled (85.4).
 * Anything at or below 1.5 is treated as a fraction — the one ambiguous
 * band (a genuine 0–1.5% result) is surfaced as a check, not silently guessed.
 */
function toPct(v){
  const raw = String(v == null ? '' : v);
  let n = toNum(raw);
  if(!raw.includes('%') && n > 0 && n <= 1.5) n *= 100;
  return clamp(Math.round(n * 1e4) / 1e4, 0, 100);
}
/** Returns null for blanks and the literal "NaN%" the adherence export emits
 *  for agents who were not rostered, so they are excluded rather than scored 0. */
function pctOrNull(v){
  const raw = String(v == null ? '' : v);
  if(!/\d/.test(raw) || /nan/i.test(raw)) return null;
  return toPct(raw);
}
const wasAmbiguousPct = v => {
  const n = toNum(v);
  return !String(v||'').includes('%') && n > 0 && n <= 1.5;
};

/** "01:23:45" · "23:45" · "83.5" · "1:02:03.450" → seconds. */
function toSecs(v){
  if(v == null || v === '') return 0;
  const s = String(v).trim();
  if(!s.includes(':')) return Math.round(toNum(s));
  const p = s.split(':').map(x => toNum(x));
  if(p.length === 3) return Math.round(p[0]*3600 + p[1]*60 + p[2]);
  if(p.length === 2) return Math.round(p[0]*60 + p[1]);
  return Math.round(p[0] || 0);
}
function clockFmt(secs){
  secs = Math.max(0, Math.round(secs));
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
  return [h,m,s].map(x => String(x).padStart(2,'0')).join(':');
}
function humanDur(secs){
  secs = Math.max(0, Math.round(secs));
  if(secs < 60) return secs + 's';
  if(secs < 3600) return Math.floor(secs/60) + 'm ' + (secs%60) + 's';
  return Math.floor(secs/3600) + 'h ' + Math.floor((secs%3600)/60) + 'm';
}
function humanMins(mins){
  mins = Math.max(0, Math.round(mins));
  return mins < 60 ? mins + 'm' : Math.floor(mins/60) + 'h ' + (mins%60) + 'm';
}

/** Normalise a header so "Agent Name", "agent_name" and "AgentName" all match. */
const agentKey = n => String(n||'').replace(/\s+/g,' ').trim();
const normKey = s => String(s||'').toLowerCase().replace(/%/g,'pct').replace(/[^a-z0-9]/g,'');

/** Keep the last four digits and the country prefix; blank the middle. */
function maskNumber(num, on){
  const t = String(num || '');
  if(!on || t.length < 8 || !/^[0-9]+$/.test(t)) return t;
  return t.slice(0,4) + '•'.repeat(Math.max(2, t.length - 8)) + t.slice(-4);
}

function shortName(name, on){
  if(!name) return '—';
  if(!on) return name;
  const p = String(name).trim().split(/\s+/);
  return p.length > 1 ? p[0] + ' ' + p[p.length-1] : p[0];
}

/* ══ 1 · SETTINGS — every knob persists, so tomorrow is one click ══
   Same browser key as the stand-alone builder, so settings saved there carry over. */
const STORE = 'wfm.console.v2';
const FIELDS = [
  'dayStart','dayEnd','dateOrder','teamAName','teamAShifts','teamBName','teamBShifts','teamCName','teamCShifts',
  'tgtSL','tgtAbn','tgtAdh','tgtAht','sigName','sigEmail','sendTo','greeting',
  'thTardy','thAbsent','thGap','thHold','thRona','thShort','thEarly','thMinCalls','thRepeat'
];
const TOGGLES = ['optShortNames','optHideEmpty','optMethod','optMask','optPoster'];
const DEFAULTS = {
  dayStart:'8', dayEnd:'0', dateOrder:'auto',
  teamAName:'Virgin', teamAShifts:'8, 14, 16',
  teamBName:'FRiENDi', teamBShifts:'8, 14, 16',
  teamCName:'FRiENDi Pay', teamCShifts:'8, 14, 16',
  tgtSL:'85', tgtAbn:'3', tgtAdh:'95', tgtAht:'150',
  sigName:"Dia'a Banjar", sigEmail:'Diaa.Banjar@Beyond.One',
  sendTo:'MemberCareManagementTeam.ksa@beyond.one; mc.operations@virginmobile.sa; voiceofcustomer@virginmobile.sa; friendiquality@virginmobile.sa',
  greeting:'Hi Management Team,',
  thTardy:'0', thAbsent:'180', thGap:'20', thHold:'30', thRona:'60', thShort:'10', thEarly:'15', thMinCalls:'5', thRepeat:'3',
  optShortNames:true, optHideEmpty:true, optMethod:true, optMask:false, optPoster:true
};
/* Settings saved on an earlier version win over a changed default, so a
   default that moves has to be migrated explicitly. Each entry replaces a
   stored value only when it still equals the superseded default. */
const MIGRATIONS = [
  { v:2, field:'tgtAht', was:'360', now:'150' }   // AHT ceiling 00:06:00 → 00:02:30
];
let SET = Object.assign({}, DEFAULTS), SET_RAW = {};

function loadSettings(){
  let o = {};
  try{ o = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; }catch(e){ o = {}; }
  const seen = Number(o._v || 1);
  MIGRATIONS.forEach(m => { if(seen < m.v && String(o[m.field]) === m.was) o[m.field] = m.now; });
  SET_RAW = o;
  SET = Object.assign({}, DEFAULTS);
  FIELDS.forEach(f => { if(o[f] !== undefined && o[f] !== '') SET[f] = String(o[f]); });
  TOGGLES.forEach(f => { if(o[f] !== undefined) SET[f] = !!o[f]; });
  if(SET.sendTo === 'friendiquality@virginmobile.sa; MemberCareManagementTeam.ksa@beyond.one; voiceofcustomer@virginmobile.sa; mc.operations@virginmobile.sa')
    SET.sendTo = DEFAULTS.sendTo;
}
function saveSettings(){
  // anything the stand-alone builder stored (its masthead logo, say) is kept as it was
  const o = Object.assign({}, SET_RAW, { _v: MIGRATIONS[MIGRATIONS.length-1].v });
  FIELDS.forEach(f => o[f] = SET[f]);
  TOGGLES.forEach(f => o[f] = !!SET[f]);
  SET_RAW = o;
  try{ localStorage.setItem(STORE, JSON.stringify(o)); }catch(e){}
}

const TEAM_KEYS = ['A','B','C'];

function readConfig(){
  const hours = s => String(s||'').split(/[,;\s]+/).filter(x => x !== '').map(x => toNum(x))
                       .filter(x => x >= 0 && x <= 23);
  const shifts = k => hours(SET[k]).length ? hours(SET[k]) : [8,14,16];
  return {
    date:      state.date || '',
    dayStart:  clamp(toNum(SET.dayStart), 0, 12),
    dayEnd:    clamp(toNum(SET.dayEnd), 0, 12),
    dateOrder: SET.dateOrder || 'auto',
    teamA:     String(SET.teamAName || '').trim() || 'Team A',
    teamB:     String(SET.teamBName || '').trim() || 'Team B',
    teamC:     String(SET.teamCName || '').trim() || 'Team C',
    shiftsA:   shifts('teamAShifts'),
    shiftsB:   shifts('teamBShifts'),
    shiftsC:   shifts('teamCShifts'),
    tgtSL:     toNum(SET.tgtSL),
    tgtAbn:    toNum(SET.tgtAbn),
    tgtAdh:    toNum(SET.tgtAdh),
    tgtAht:    toNum(SET.tgtAht),
    thTardy:   toNum(SET.thTardy),
    thAbsent:  toNum(SET.thAbsent),
    thGap:     toNum(SET.thGap),
    thHold:    toNum(SET.thHold),
    thRona:    toNum(SET.thRona),
    thShort:   toNum(SET.thShort),
    thEarly:   toNum(SET.thEarly),
    thRepeat:  Math.max(2, toNum(SET.thRepeat)),
    mask:      !!SET.optMask,
    thMinCalls:Math.max(1, toNum(SET.thMinCalls)),
    shortNames:!!SET.optShortNames,
    hideEmpty: !!SET.optHideEmpty,
    poster:    !!SET.optPoster,
    method:    !!SET.optMethod,
    greeting:  String(SET.greeting || '').trim() || 'Hi Management Team,',
    sigName:   String(SET.sigName || '').trim() || 'WFM',
    sigEmail:  String(SET.sigEmail || '').trim(),
    sendTo:    String(SET.sendTo || '').split(/[;,\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))
  };
}
const teamName = (c, k) => c['team' + k];

/** Which brand a queue name, a management unit or a file name belongs to. The
 *  longest name is tried first, so "FRiENDi Pay" is never read as "FRiENDi";
 *  FPay is always FRiENDi Pay. */
function teamOfText(s, c){
  const norm = x => String(x || '').toLowerCase().replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim();
  const t = norm(s);
  if(!t) return null;
  c = c || readConfig();
  const cands = [{ k:'A', n:norm(c.teamA) }, { k:'B', n:norm(c.teamB) }, { k:'C', n:norm(c.teamC) }, { k:'C', n:'fpay' }]
    .filter(x => x.n).sort((a,b) => b.n.length - a.n.length);
  const hit = cands.find(x => t.includes(x.n));
  return hit ? hit.k : null;
}

/* ══ 2 · CSV — a real RFC-4180 reader ══
   Handles quoted fields, escaped quotes, embedded newlines, CRLF, BOM
   and semicolon/tab delimited exports. */
function sniffDelimiter(text){
  const line = text.slice(0, 4000).split(/\r?\n/)[0] || '';
  let best = ',', bestN = 0;
  for(const d of [',',';','\t','|']){
    const n = line.split(d).length - 1;
    if(n > bestN){ bestN = n; best = d; }
  }
  return best;
}

function parseCSV(text){
  if(text.charCodeAt(0) === 0xFEFF) text = text.slice(1);   // strip BOM
  const D = sniffDelimiter(text);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while(i < n){
    const c = text[i];
    if(inQ){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if(c === '"'){ inQ = true; i++; continue; }
    if(c === D){ row.push(field); field = ''; i++; continue; }
    if(c === '\r'){ if(text[i+1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if(field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows;
}

/**
 * Column-indexed table. Rows stay as arrays — an interactions export can be
 * six figures of rows, and one object per row is what makes a build crawl on big days.
 */
function makeTable(text, fileName){
  const raw = parseCSV(text);
  let h = 0;
  while(h < raw.length && raw[h].filter(c => c.trim() !== '').length < 2) h++;
  if(h >= raw.length) return null;

  const headers = raw[h].map(c => c.trim());
  const idx = {};
  headers.forEach((c,i) => { const k = normKey(c); if(k && idx[k] === undefined) idx[k] = i; });
  const data = raw.slice(h+1).filter(r => r.some(c => c && c.trim() !== ''));
  return { fileName, headers, idx, data, rows: data.length };
}

function col(t, ...aliases){
  for(const a of aliases){
    const i = t.idx[normKey(a)];
    if(i !== undefined) return i;
  }
  return -1;
}
const cell = (t, row, i) => (i < 0 || row[i] == null) ? '' : String(row[i]).trim();
const has  = (t, ...aliases) => col(t, ...aliases) >= 0;

/* ══ 3 · DATE PARSING ══
   Ambiguous d/m vs m/d is resolved once per dataset instead of guessed
   row by row — a per-row heuristic could split one file two ways. */
const DT_RE = /(\d{1,4})[-.\/](\d{1,2})[-.\/](\d{1,4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(AM|PM)?/i;
const T_RE  = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;

/** Scan a column and decide whether it is day-first or month-first. */
function detectOrder(table, colIndex, sample){
  if(colIndex < 0) return 'mdy';
  let dFirst = 0, mFirst = 0;
  const lim = Math.min(table.data.length, sample || 400);
  for(let i = 0; i < lim; i++){
    const m = DT_RE.exec(cell(table, table.data[i], colIndex));
    if(!m) continue;
    if(String(m[1]).length === 4) return 'ymd';
    const a = +m[1], b = +m[2];
    if(a > 12 && b <= 12) dFirst++;
    else if(b > 12 && a <= 12) mFirst++;
  }
  if(dFirst > mFirst) return 'dmy';
  if(mFirst > dFirst) return 'mdy';
  return 'mdy';
}

function parseDT(str, order, base){
  if(!str) return null;
  const s = String(str).trim();

  const tOnly = T_RE.exec(s);
  if(tOnly){
    let hr = +tOnly[1];
    const ap = (tOnly[4]||'').toUpperCase();
    if(ap === 'AM' && hr === 12) hr = 0;
    if(ap === 'PM' && hr < 12) hr += 12;
    return new Date(base.y, base.m, base.d, hr, +tOnly[2], +(tOnly[3]||0));
  }

  const m = DT_RE.exec(s);
  if(!m) return null;
  let y, mo, da;
  if(String(m[1]).length === 4){ y = +m[1]; mo = +m[2]-1; da = +m[3]; }
  else{
    y = +m[3]; if(y < 100) y += 2000;
    const a = +m[1], b = +m[2];
    if(a > 12){ da = a; mo = b-1; }
    else if(b > 12){ da = b; mo = a-1; }
    else if(order === 'dmy'){ da = a; mo = b-1; }
    else { mo = a-1; da = b; }
  }
  let hr = m[4] !== undefined ? +m[4] : 0;
  const ap = (m[7]||'').toUpperCase();
  if(ap === 'AM' && hr === 12) hr = 0;
  if(ap === 'PM' && hr < 12) hr += 12;
  const d = new Date(y, mo, da, hr, +(m[5]||0), +(m[6]||0));
  return isNaN(d) ? null : d;
}

/* ══ 4 · FILE SLOTS AND DETECTION ══ */
const state = { files:{}, unmatched:[], model:null, html:'', date:'', userDate:false, periodDays:[],
                dirty:true, checks:[], checkSummary:null, buildNote:'' };

const SLOTS = [
  { key:'perf',         label:()=>'Agent performance',        req:true  },
  { key:'status',       label:()=>'Agent status',             req:true  },
  { key:'interactions', label:()=>'Interactions',             req:true  },
  { key:'adhA',         label:c=>c.teamA + ' adherence',      req:true  },
  { key:'adhB',         label:c=>c.teamB + ' adherence',      req:true  },
  { key:'adhC',         label:c=>c.teamC + ' adherence',      req:false },
  { key:'schedule',     label:()=>'Schedules',                req:false },
  { key:'queueA',       label:c=>c.teamA + ' queue',          req:false },
  { key:'queueB',       label:c=>c.teamB + ' queue',          req:false },
  { key:'queueC',       label:c=>c.teamC + ' queue',          req:false }
];
const slotLabel = key => { const s = SLOTS.find(x => x.key === key); return s ? s.label(readConfig()) : key; };

/** Brand of an adherence or queue export: its file name, then a vote over the
 *  management-unit or queue column, then the first brand still without a file. */
function brandOfTable(t, fileName, cols, prefix){
  const c = readConfig();
  const byName = teamOfText(String(fileName || '').replace(/\.[a-z0-9]+$/i,''), c);
  if(byName){ t._brandHow = 'file name'; return byName; }
  const ci = col(t, ...cols);
  if(ci >= 0){
    const votes = {};
    t.data.slice(0, 400).forEach(r => { const k = teamOfText(cell(t,r,ci), c); if(k) votes[k] = (votes[k]||0) + 1; });
    const best = Object.keys(votes).sort((a,b) => votes[b] - votes[a])[0];
    if(best){ t._brandHow = t.headers[ci] + ' column'; return best; }
  }
  t._brandHow = 'order';
  return TEAM_KEYS.find(k => !state.files[prefix + k]) || 'A';
}

/** Header-signature matching, with filename and cell contents as tie-breakers. */
function detectSlot(t, fileName){
  if(has(t,'mediatype') && (has(t,'ani') || has(t,'remote'))) return 'interactions';
  if(has(t,'activitycodename') && has(t,'lengthinminutes'))   return 'schedule';
  if(has(t,'notresponding') && has(t,'loggedin'))             return 'status';
  // Agent Status TIMELINE Summary: one row per status segment rather than
  // one row per agent. Read as 'status' and aggregated when the report is built.
  if(has(t,'primarystatus') && has(t,'duration') && (has(t,'starttime') || has(t,'start')))
    return 'status';
  if(has(t,'adherence','adherencepercent','adherence%'))
    return 'adh' + brandOfTable(t, fileName, ['managementunit','businessunit','team'], 'adh');
  if(has(t,'servicelevel','servicelevel%') && has(t,'abandon','abandon%'))
    return 'queue' + brandOfTable(t, fileName, ['queuename','queue'], 'queue');
  if(has(t,'answered') && (has(t,'avghandle','averagehandletime','aht'))) return 'perf';
  if(has(t,'answered') && has(t,'agentname')) return 'perf';
  return null;
}
/** The shapes only this report reads — anything else is left to the brand reports. */
const WFM_ONLY = /^(perf|status|interactions|schedule|adh[ABC])$/;

function markDirty(){ state.dirty = true; state.html = ''; state.model = null; }

/** Calls exports are dated, so several days of one brand stack into one table;
 *  the review day is picked out by its interval when the report is built. */
function addQueue(k, t){
  const key = 'queue' + k, held = state.files[key];
  if(!held){
    state.files[key] = Object.assign({}, t, { data: t.data.slice(), parts:[t.fileName] });
  }else{
    const map = held.headers.map(h => t.idx[normKey(h)]);
    const seen = new Set(held.data.map(r => JSON.stringify(r)));
    t.data.forEach(r => {
      const row = map.map(i => i === undefined ? '' : r[i]);
      const s = JSON.stringify(row);
      if(!seen.has(s)){ seen.add(s); held.data.push(row); }
    });
    held.rows = held.data.length;
    if(held.parts.indexOf(t.fileName) < 0) held.parts.push(t.fileName);
    held.fileName = held.parts.length > 1 ? held.parts.length + ' calls exports' : held.parts[0];
  }
  markDirty();
  return { slot:key, label:slotLabel(key) };
}

/** A table the report should read. `forced` is a slot picked by the caller or by hand. */
function addTable(t, forced){
  const slot = forced || detectSlot(t, t.fileName);
  if(!slot){ state.unmatched.push(t); markDirty(); return { slot:null }; }
  if(/^queue[ABC]$/.test(slot)) return addQueue(slot.slice(-1), t);
  const held = state.files[slot];
  // Never let a second file of the same shape silently erase the first.
  // Re-dropping the SAME filename is a deliberate refresh and replaces it;
  // a different file goes to the manual pile so the clash is visible.
  if(held && held.fileName !== t.fileName && !forced){
    t.clashedWith = held.fileName; t.clashedSlot = slot;
    state.unmatched.push(t); markDirty();
    return { slot, clash:true };
  }
  if(forced && /^adh/.test(slot)) t._brandHow = 'hand';
  state.files[slot] = t;
  markDirty();
  if(/^adh/.test(slot)) reconcileAdhTeams();
  return { slot, label:slotLabel(slot) };
}

function clearFiles(){
  state.files = {}; state.unmatched = []; markDirty();
}

/** After the files are in, check which adherence file belongs to which brand.
 *  1. the agent → brand map saved from a previous build, else
 *  2. the brand of the queue each agent answered on in the interactions export.
 *  Files are re-paired only when every one clearly holds another brand's agents. */
function reconcileAdhTeams(){
  const F = state.files;
  const present = TEAM_KEYS.filter(k => F['adh' + k]);
  if(present.length < 2) return;
  const cfg = readConfig();
  let agentTeam = new Map();

  try{
    const stored = JSON.parse(localStorage.getItem('wfm.agentTeams.v1') || 'null');
    if(stored && Object.keys(stored).length >= 10){
      for(const [k,v] of Object.entries(stored)) agentTeam.set(k, v);
    }
  }catch(e){}

  if(!agentTeam.size && F.interactions){
    const T = F.interactions;
    const cQ = col(T,'queue'), cU = col(T,'users');
    if(cQ >= 0 && cU >= 0){
      for(const r of T.data){
        const tk = teamOfText(cell(T,r,cQ).split(';')[0] || '', cfg);
        if(!tk) continue;
        cell(T,r,cU).split(';').forEach(p => {
          const u = p.replace(/\s*\(.*?\)/g,'').trim();
          if(u) agentTeam.set(u.toLowerCase(), tk);
        });
      }
    }
  }
  if(!agentTeam.size) return;

  const majority = t => {
    const ci = col(t,'agent','agentname','user'); const n = { A:0, B:0, C:0 };
    for(const r of t.data){ const k = agentTeam.get(cell(t,r,ci).toLowerCase()); if(n[k] !== undefined) n[k]++; }
    const tot = n.A + n.B + n.C;
    const best = TEAM_KEYS.slice().sort((a,b) => n[b] - n[a])[0];
    return tot >= 3 && n[best] * 2 > tot ? best : null;
  };
  const want = {};
  for(const k of present){ const m = majority(F['adh' + k]); if(!m) return; want[k] = m; }
  const targets = present.map(k => want[k]);
  if(new Set(targets).size !== targets.length) return;          // not a clean re-pairing
  if(present.every(k => want[k] === k)) return;                 // already right
  const moved = {};
  present.forEach(k => { moved['adh' + want[k]] = F['adh' + k]; F['adh' + k]._brandHow = 'agents'; });
  present.forEach(k => { delete F['adh' + k]; });
  Object.assign(F, moved);
  markDirty();
  if(H.toast) H.toast('Adherence files re-paired by agent: ' + TEAM_KEYS.filter(k => F['adh' + k])
    .map(k => teamName(cfg, k) + ' → ' + F['adh' + k].fileName).join(' · ') + '.');
}

/* ══ 5 · ANALYTICS ENGINE ══
   Built against the real Genesys exports: the daily Agent Performance
   Summary, Agent Status Summary, Interactions detail, Historical Adherence
   per management unit, the Activities schedule and the queue (calls) reports. */

function readQueue(t, win){
  if(!t) return null;
  const cQ   = col(t,'queuename','queue');
  const cMed = col(t,'mediatype');
  const cSL  = col(t,'servicelevelpct','servicelevel');
  const cTgt = col(t,'serviceleveltargetpct','serviceleveltarget');
  const cAbnP= col(t,'abandonpct');
  const cOff = col(t,'offer','offered');
  const cAns = col(t,'answer','answered');
  const cAbn = col(t,'abandon','abandoned');
  const cAsa = col(t,'asa');
  const cAht = col(t,'avghandle','aht');

  const queues = [], all = [];
  let fileTarget = null, droppedRows = 0, fracSL = 0, scaledSL = 0;
  // Interval-scoped exports (several days, a month) must not be summed wholesale.
  // Keep only rows whose interval touches the review day.
  const cIvS = col(t,'intervalstart','interval','date');
  const cIvE = col(t,'intervalend');
  const ivOrder = win ? (win.order || detectOrder(t, cIvS)) : 'mdy';
  const dayFrom = win ? new Date(win.y, win.m, win.d, 0, 0, 0).getTime() : null;
  const dayTo   = win ? dayFrom + 86400000 : null;
  const keepRow = r => {
    if(!win || cIvS < 0) return true;
    const s = parseDT(cell(t,r,cIvS), ivOrder, win);
    if(!s) return true;                               // unreadable: keep, don't hide data
    const e = cIvE >= 0 ? parseDT(cell(t,r,cIvE), ivOrder, win) : null;
    const s0 = s.getTime(), e0 = e ? e.getTime() : s0 + 1;
    return s0 < dayTo && e0 > dayFrom;                // any overlap with the day
  };
  for(const r of t.data){
    if(!keepRow(r)){ droppedRows++; continue; }
    const name = cell(t,r,cQ);
    const media = cell(t,r,cMed);
    // the calls exports carry a voice roll-up first, then one row per queue; a
    // non-voice queue row (should one appear) is not part of a voice review
    if(name && media && !/voice|callback/i.test(media)) continue;
    const rec = {
      name: name || 'Total',
      media,
      offered: toInt(cell(t,r,cOff)),
      answered: toInt(cell(t,r,cAns)),
      abandoned: toInt(cell(t,r,cAbn)),
      sl: toPct(cell(t,r,cSL)),
      abn: toPct(cell(t,r,cAbnP)),
      asa: toSecs(cell(t,r,cAsa).split('.')[0]),
      aht: toSecs(cell(t,r,cAht).split('.')[0]),
      total: !name || /^(total|totals|all|grand total)$/i.test(name)
    };
    const tg = toPct(cell(t,r,cTgt));
    if(tg > 0 && fileTarget == null) fileTarget = tg;
    // A value at or below 1.5 is read as a fraction. That is only in doubt when the
    // same export also prints service level already scaled (85.4): the Genesys calls
    // exports print every row as a fraction, so they never raise the check.
    const slRaw = cell(t,r,cSL);
    if(wasAmbiguousPct(slRaw)) fracSL++;
    else if(!slRaw.includes('%') && toNum(slRaw) > 1.5) scaledSL++;
    all.push(rec);
    if(!rec.total) queues.push(rec);
  }
  // the export holds other days only: say so rather than report a zero day
  if(!all.length) return { empty:true, droppedRows, rows:t.rows };

  const totalRow = all.find(r => r.total);
  let head;
  if(totalRow && totalRow.offered > 0){
    head = totalRow;
  }else{
    const offered  = queues.reduce((s,q) => s + q.offered, 0);
    const answered = queues.reduce((s,q) => s + q.answered, 0);
    const abandoned= queues.reduce((s,q) => s + q.abandoned, 0);
    const mean = get => queues.length ? queues.reduce((s,q) => s + get(q), 0)/queues.length : 0;
    const wsum = get => offered  ? queues.reduce((s,q) => s + get(q)*q.offered,  0)/offered  : mean(get);
    const asum = get => answered ? queues.reduce((s,q) => s + get(q)*q.answered, 0)/answered : mean(get);
    head = {
      offered, answered, abandoned,
      sl: wsum(q => q.sl),
      abn: offered ? (abandoned/offered)*100 : mean(q => q.abn),
      asa: Math.round(asum(q => q.asa)),
      aht: Math.round(asum(q => q.aht)),
      derived: true, noVolume: !offered
    };
  }
  // the roll-up's abandon % can be blank on a quiet day; work it out instead
  if(!head.abn && head.offered) head = Object.assign({}, head, { abn: head.abandoned/head.offered*100 });
  queues.forEach(q => { if(!q.abn && q.offered) q.abn = q.abandoned/q.offered*100; });
  queues.sort((a,b) => b.offered - a.offered);
  const ambiguous = fracSL > 0 && scaledSL > 0;
  return Object.assign({}, head, { queues, ambiguous, fileTarget, rows: t.rows, droppedRows });
}

function buildModel(cfg){
  const F = state.files;
  const [Y,Mo,Dd] = cfg.date.split('-').map(Number);
  const base = { y:Y, m:Mo-1, d:Dd };
  const winStart = new Date(Y, Mo-1, Dd, cfg.dayStart, 0, 0);
  const winEnd   = new Date(Y, Mo-1, Dd+1, cfg.dayEnd, 0, 0);
  // Logins and schedules get two hours of grace before the window, so an
  // agent who signs on a few minutes early is not read as a no-show.
  const refStart = new Date(winStart.getTime() - 2*3600*1000);
  const inWin  = d => d && !isNaN(d) && d >= winStart && d <= winEnd;
  const inRef  = d => d && !isNaN(d) && d >= refStart && d <= winEnd;
  const displayDate = new Date(Y, Mo-1, Dd)
    .toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const A = new Map();
  const rec = name => {
    if(!A.has(name)) A.set(name, {
      agent:name, team:null,
      adh:null, conf:null, sched:0, schedOnQueue:0, workOnQueue:0, excCount:0, excMins:0,
      loggedMins:0, firstLogin:null, ronaSecs:0, ronaCount:0,
      shiftStart:null, shiftEnd:null, shiftSource:null, schedMins:0,
      leave:false, leaveType:'', training:false, excused:false, excusedCode:'',
      breakUpdates:0, breakUpdateMins:0,
      answered:0, aht:0, holdAvg:0, talkAvg:0, acwAvg:0,
      totalHandle:0, totalTalk:0, totalHold:0, totalAcw:0,
      held:0, transferred:0, outbound:0, supervisor:'', location:'',
      firstCall:null, handled:0, short:0
    });
    return A.get(name);
  };

  /* ── 1 · roster and adherence ─────────────────────────────────── */
  const readAdh = (t, teamKey) => {
    if(!t) return;
    const cA = col(t,'agent','agentname','user');
    const cP = col(t,'adherencepct','adherence');
    const cC = col(t,'conformancepct','conformance');
    const cS = col(t,'scheduledminutes','scheduled');
    const cE = col(t,'exceptions');
    const cED= col(t,'exceptionsdurationminutes');
    const cSQ= col(t,'scheduledonqueue');
    const cWQ= col(t,'worktimeonqueue');
    for(const r of t.data){
      const name = agentKey(cell(t,r,cA));
      if(!name) continue;
      const a = rec(name);
      a.team = teamKey;
      a.adh  = pctOrNull(cell(t,r,cP));
      a.conf = pctOrNull(cell(t,r,cC));
      a.sched = toNum(cell(t,r,cS));
      a.excCount = toInt(cell(t,r,cE));
      a.excMins  = toNum(cell(t,r,cED));
      a.schedOnQueue = toNum(cell(t,r,cSQ));
      a.workOnQueue  = toNum(cell(t,r,cWQ));
    }
  };
  TEAM_KEYS.forEach(k => readAdh(F['adh' + k], k));

  /* ── 1b · the published schedule decides who appears at all ──────
     Anyone without a schedule row inside the window is off the report
     entirely: not in a list, not in a total, not named anywhere. Without
     a schedule export we fall back to the adherence roster and say so. */
  const scheduleSet = new Set();
  if(F.schedule){
    const T = F.schedule;
    const cA  = col(T,'agentname','agent','user');
    const cS1 = col(T,'startriyadh','startlocal'), cS2 = col(T,'start','starttime');
    const cE1 = col(T,'endriyadh','endlocal'),     cE2 = col(T,'end','endtime');
    const cS  = cS1 >= 0 ? cS1 : cS2, cE = cE1 >= 0 ? cE1 : cE2;
    let ord = cfg.dateOrder;
    if(ord === 'auto') ord = detectOrder(T, cS);
    for(const r of T.data){
      const n = agentKey(cell(T,r,cA));
      if(!n) continue;
      // a night shift can start before the window and end inside it
      if(inWin(parseDT(cell(T,r,cS), ord, base)) || inWin(parseDT(cell(T,r,cE), ord, base)))
        scheduleSet.add(n);
    }
  }
  const restrictToSchedule = scheduleSet.size > 0;
  let notScheduled = 0;
  if(restrictToSchedule){
    for(const n of [...A.keys()]) if(!scheduleSet.has(n)){ A.delete(n); notScheduled++; }
  }

  const roster = [...A.keys()];
  const onRoster = new Set(roster);

  /* ── 2 · status: login, logout, time logged in ────────────────── */
  let statusOrder = cfg.dateOrder;
  let statusShape = null, statusRowsUsed = 0;
  if(F.status && col(F.status,'loggedin') >= 0){
    statusShape = 'summary';
    const T = F.status;
    const cLogin = col(T,'login','logintime');
    if(cfg.dateOrder === 'auto') statusOrder = detectOrder(T, cLogin);
    const cA = col(T,'agentname','agent','user');
    const cLg = col(T,'loggedin');
    const cNR = col(T,'notresponding');
    for(const r of T.data){
      const name = agentKey(cell(T,r,cA));
      if(!name || !onRoster.has(name)) continue;
      const a = rec(name);
      a.loggedMins += toSecs(cell(T,r,cLg))/60;
      a.ronaSecs   += toSecs(cell(T,r,cNR));
      const d = parseDT(cell(T,r,cLogin), statusOrder, base);
      if(inRef(d) && (!a.firstLogin || d < a.firstLogin)) a.firstLogin = d;
      statusRowsUsed++;
    }
  }else if(F.status){
    /* Agent Status TIMELINE Summary: one row per status segment. Segments are
       clipped to the review window, so a month-long export still reports the
       one day asked for, and an overnight Offline block cannot leak in. */
    statusShape = 'timeline';
    const T = F.status;
    const cA  = col(T,'agentname','agent','user');
    const cS  = col(T,'starttime','start');
    const cE  = col(T,'endtime','end');
    const cSt = col(T,'primarystatus','status');
    const cSec= col(T,'secondarystatus');
    if(cfg.dateOrder === 'auto') statusOrder = detectOrder(T, cS);
    const wS = refStart.getTime(), wE = winEnd.getTime();
    for(const r of T.data){
      const name = agentKey(cell(T,r,cA));
      if(!name || !onRoster.has(name)) continue;
      const s = parseDT(cell(T,r,cS), statusOrder, base);
      if(!s) continue;
      const e = parseDT(cell(T,r,cE), statusOrder, base);
      const s0 = s.getTime(), e0 = e ? e.getTime() : s0;
      const from = Math.max(s0, wS), to = Math.min(e0, wE);
      if(to <= from) continue;                       // segment sits outside the day
      const secs = (to - from)/1000;
      const st = (cell(T,r,cSt) || '').toLowerCase();
      const st2 = (cell(T,r,cSec) || '').toLowerCase();
      if(st.includes('offline') || st === '') continue;
      const a = rec(name);
      a.loggedMins += secs/60;
      if(st.includes('not responding') || st2.includes('not responding')) a.ronaSecs += secs;
      const seg = new Date(from);
      if(inRef(seg) && (!a.firstLogin || seg < a.firstLogin)) a.firstLogin = seg;
      statusRowsUsed++;
    }
  }

  /* ── 3 · schedule ─────────────────────────────────────────────── */
  const LEAVE   = ['annual leave','sick leave','unpaid leave','holiday','day off','examination leave'];
  const EXCUSED = ['tardy','excuse'];
  const WORKING = ['on queue','available','break','meal','meeting','training','off queue','update break'];
  let schedOrder = cfg.dateOrder;
  if(F.schedule){
    const T = F.schedule;
    const cS1 = col(T,'startriyadh','startlocal'), cS2 = col(T,'start','starttime');
    const cE1 = col(T,'endriyadh','endlocal'),     cE2 = col(T,'end','endtime');
    const cUseS = cS1 >= 0 ? cS1 : cS2, cUseE = cE1 >= 0 ? cE1 : cE2;
    if(cfg.dateOrder === 'auto') schedOrder = detectOrder(T, cUseS);
    const cA = col(T,'agentname','agent','user');
    const cAct = col(T,'activitycodename','activity');
    const cLen = col(T,'lengthinminutes','length');
    for(const r of T.data){
      const name = agentKey(cell(T,r,cA));
      if(!name || !onRoster.has(name)) continue;
      const act = cell(T,r,cAct).toLowerCase().trim();
      const d = parseDT(cell(T,r,cUseS), schedOrder, base);
      if(!inRef(d)) continue;
      const a = rec(name);
      if(LEAVE.some(l => act.includes(l))){ a.leave = true; a.leaveType = cell(T,r,cAct).trim(); continue; }
      if(EXCUSED.some(l => act.includes(l))){ a.excused = true; a.excusedCode = cell(T,r,cAct).trim(); continue; }
      // A scheduled break moved at the agent's request — operations owns the
      // approval, so it is reported rather than treated as an adherence fault.
      if(act.includes('update break')){ a.breakUpdates++; a.breakUpdateMins += toNum(cell(T,r,cLen)); }
      if(act.includes('training')) a.training = true;
      a.schedMins += toNum(cell(T,r,cLen));
      if(WORKING.some(w => act.includes(w))){
        if(!a.shiftStart || d < a.shiftStart){ a.shiftStart = d; a.shiftSource = 'schedule'; }
        const e = parseDT(cell(T,r,cUseE), schedOrder, base);
        if(e && (!a.shiftEnd || e > a.shiftEnd)) a.shiftEnd = e;
      }
    }
  }

  /* ── 4 · agent performance ────────────────────────────────────── */
  if(F.perf){
    const T = F.perf;
    const cA = col(T,'agentname','agent','user');
    const g = (...n) => col(T, ...n);
    const cAns=g('answered','handle'), cAht=g('avghandle'), cTalk=g('avgtalk'),
          cHold=g('avghold'), cAcw=g('avgacw'), cTH=g('totalhandle'), cTT=g('totaltalk'),
          cTHo=g('totalhold'), cTA=g('totalacw'), cHeld=g('held'), cTr=g('transferred'),
          cOut=g('outbound'), cRona=g('alertnoanswer'), cRonaT=g('totalalertnoanswer'),
          cSup=g('reportsto','supervisor'), cLoc=g('location'), cMed=g('mediatype');
    for(const r of T.data){
      const name = agentKey(cell(T,r,cA));
      if(!name || !onRoster.has(name)) continue;
      const media = cell(T,r,cMed).toLowerCase();
      if(media && media !== 'voice' && media !== 'callback') continue;
      const a = rec(name);
      a.answered   += toInt(cell(T,r,cAns));
      a.aht         = toSecs(cell(T,r,cAht).split('.')[0]) || a.aht;
      a.talkAvg     = toSecs(cell(T,r,cTalk).split('.')[0]) || a.talkAvg;
      a.holdAvg     = toSecs(cell(T,r,cHold).split('.')[0]) || a.holdAvg;
      a.acwAvg      = toSecs(cell(T,r,cAcw).split('.')[0])  || a.acwAvg;
      a.totalHandle+= toSecs(cell(T,r,cTH).split('.')[0]);
      a.totalTalk  += toSecs(cell(T,r,cTT).split('.')[0]);
      a.totalHold  += toSecs(cell(T,r,cTHo).split('.')[0]);
      a.totalAcw   += toSecs(cell(T,r,cTA).split('.')[0]);
      a.held       += toInt(cell(T,r,cHeld));
      a.transferred+= toInt(cell(T,r,cTr));
      a.outbound   += toInt(cell(T,r,cOut));
      a.ronaCount  += toInt(cell(T,r,cRona));
      a.ronaSecs    = Math.max(a.ronaSecs, toSecs(cell(T,r,cRonaT).split('.')[0]));
      a.supervisor  = cell(T,r,cSup) || a.supervisor;
      a.location    = cell(T,r,cLoc) || a.location;
    }
  }

  /* ── 5 · interactions: demand profile ─────────────────────────── */
  const hourly = new Array(24).fill(0);
  const hourlyBy = { A:new Array(24).fill(0), B:new Array(24).fill(0), C:new Array(24).fill(0) };
  const channel = new Map(), direction = new Map(), repeatMap = new Map(), outMap = new Map();
  let longest = [];
  let handledTotal = 0, voiceTotal = 0, outsideWindow = 0, unparsedDates = 0;
  let outboundSkipped = 0, nonVoiceSkipped = 0, unattributed = 0, outboundOffRoster = 0;
  let ixOrder = cfg.dateOrder;

  // WebRTC faults raised when the call ends at the agent's own endpoint rather
  // than anywhere on the network path: the browser stops answering the media
  // channel. A genuine wifi drop looks the same as a deliberate one, so these
  // are reported with the number that was on the call and left for review.
  const DROP_CODES = [
    { needle:'dtlspeerdisconnect', label:'Endpoint disconnected · DTLS' },
    { needle:'iceidledetection',   label:'Media went idle · ICE' }
  ];
  const connDropCalls = [];
  let haveErrCol = false;
  const cleanAni = v => {
    let s = String(v || '').replace(/^(?:tel:|sip:)?\+?/i,'').trim();
    if(s.includes('@')) s = s.split('@')[0];
    return s.replace(/[^\d]/g,'');
  };

  if(F.interactions){
    const T = F.interactions;
    const cD = col(T,'date','starttime','conversationstart');
    if(cfg.dateOrder === 'auto') ixOrder = detectOrder(T, cD);
    const cMedia = col(T,'mediatype');
    const cUsers = col(T,'users','agent','agentname');
    const cDur   = col(T,'duration');
    const cDir   = col(T,'direction');
    const cAni   = col(T,'ani'), cRem = col(T,'remote');
    const cQueue = col(T,'queue','queuename');
    const cErr = col(T,'errorcode','errorcodes','error','disconnecterror','disconnectreason');
    haveErrCol = cErr >= 0;
    for(const r of T.data){
      const d = parseDT(cell(T,r,cD), ixOrder, base);
      if(!d){ unparsedDates++; continue; }
      if(!inWin(d)){ outsideWindow++; continue; }
      // Checked ahead of the inbound-only and voice-only filters below, so a
      // drop is never lost because the row was outbound or a call-back.
      if(haveErrCol){
        const ec = cell(T,r,cErr).toLowerCase();
        const hit = ec ? DROP_CODES.find(x => ec.includes(x.needle)) : null;
        if(hit) connDropCalls.push({
          agent: agentKey(cell(T,r,cUsers).split(';')[0] || ''),
          ani:   cleanAni(cell(T,r,cAni) || cell(T,r,cRem)),
          at:    d,
          label: hit.label,
          queue: (cell(T,r,cQueue).split(';')[0] || '').trim(),
          outbound: /^out/i.test(cell(T,r,cDir) || '')
        });
      }
      const media = (cell(T,r,cMedia) || 'voice').toLowerCase();
      const dir = cell(T,r,cDir) || 'Unknown';
      direction.set(dir, (direction.get(dir)||0) + 1);
      // This review reports inbound service only. Outbound and telesales dialling
      // are a separate workload and would distort volume, AHT and repeat contact.
      if(/^out/i.test(dir)){
        outboundSkipped++;
        // Outbound stays out of every service metric, but the dialling itself is
        // worth reporting, so attribute it to whoever placed the call.
        if(media === 'voice' || media === 'callback'){
          const ow = agentKey(cell(T,r,cUsers).split(';')[0] || '');
          if(ow && onRoster.has(ow)) outMap.set(ow, (outMap.get(ow)||0) + 1);
          else if(ow) outboundOffRoster++;
        }
        continue;
      }
      channel.set(media, (channel.get(media)||0) + 1);
      // Calls only. Email and message are a different workload with different
      // handling economics and do not belong in a voice service review.
      if(media !== 'voice'){ nonVoiceSkipped++; continue; }
      handledTotal++; voiceTotal++;
      const hr = d.getHours();
      hourly[hr]++;
      const users = cell(T,r,cUsers).split(';').map(u => agentKey(u)).filter(Boolean);
      const owner = users[0] || '';

      // Attribute the call to a brand by its entry queue — the first queue in
      // the list, since later entries are onward transfers. Fall back to the
      // handling agent when the call never touched a queue.
      const q0 = (cell(T,r,cQueue).split(';')[0] || '').trim();
      let tk = teamOfText(q0, cfg);
      if(!tk && owner && A.has(owner)) tk = A.get(owner).team;
      if(tk && hourlyBy[tk]) hourlyBy[tk][hr]++;
      else unattributed++;

      const dur = toSecs(cell(T,r,cDur));
      if(owner && onRoster.has(owner)){
        const a = rec(owner);
        a.handled++;
        if(!a.firstCall || d < a.firstCall) a.firstCall = d;
        if(dur > 0 && dur < cfg.thShort) a.short++;
        // bounded top-N rather than holding every call in memory
        if(dur > 0 && (longest.length < 12 || dur > longest[longest.length-1].dur)){
          longest.push({ agent:owner, dur });
          longest.sort((x,y) => y.dur - x.dur);
          if(longest.length > 12) longest.pop();
        }
      }
      const ani = cleanAni(cell(T,r,cAni) || cell(T,r,cRem));
      if(ani.length >= 9 && ani.length <= 13) repeatMap.set(ani, (repeatMap.get(ani)||0) + 1);
    }
  }

  /* ── 6 · shift reference ──────────────────────────────────────── */
  const shiftsFor = a => cfg['shifts' + a.team] || cfg.shiftsA;
  for(const a of A.values()){
    if(a.shiftStart) continue;
    const ref = a.firstLogin || a.firstCall;
    if(!ref) continue;
    let h = ref.getHours() + ref.getMinutes()/60;
    if(h < cfg.dayStart - 2) h += 24;
    const list = shiftsFor(a);
    if(!list.length) continue;
    const nearest = list.reduce((p,cv) => Math.abs(cv-h) < Math.abs(p-h) ? cv : p);
    a.shiftStart = new Date(Y, Mo-1, Dd + (nearest >= 24 ? 1 : 0), nearest % 24, 0, 0);
    a.shiftSource = 'inferred';
  }

  /* ── 7 · attendance and capacity ──────────────────────────────── */
  const mkTeam = (key,name) => ({ key, name, scheduled:0, worked:0, absent:[], leave:[], training:[],
    tardy:[], excused:[], shortShift:[], adhSum:0, adhWt:0, confSum:0, confWt:0,
    schedOnQ:0, workOnQ:0, handleSecs:0, loggedSecs:0, occHandle:0, answered:0,
    talkSecs:0, holdSecs:0, acwSecs:0, roster:0 });
  const teams = {};
  TEAM_KEYS.forEach(k => { teams[k] = mkTeam(k, teamName(cfg, k)); });
  const noShiftRef = [];

  for(const a of A.values()){
    const T = teams[a.team];
    if(!T) continue;
    T.roster++;
    T.answered   += a.answered;
    T.handleSecs += a.totalHandle;
    T.talkSecs   += a.totalTalk;
    T.holdSecs   += a.totalHold;
    T.acwSecs    += a.totalAcw;
    T.schedOnQ   += a.schedOnQueue;
    T.workOnQ    += a.workOnQueue;

    if(a.leave){ T.leave.push({ agent:a.agent, type:a.leaveType }); continue; }
    if(a.training) T.training.push(a.agent);

    const scheduledMins = a.schedMins || a.sched;
    if(scheduledMins <= 0) continue;
    T.scheduled++;

    const noActivity = !a.firstLogin && a.loggedMins < 10 && a.handled === 0 && a.answered === 0;
    const flatAdh = a.adh != null && a.adh <= 10 && a.loggedMins < 10;
    a.offSchedule = a.adh != null && a.adh < 65 && a.loggedMins >= scheduledMins*0.5;

    if((noActivity || flatAdh) && !a.offSchedule){ a.absent = true; T.absent.push(a.agent); continue; }

    if(a.shiftStart && a.firstLogin){
      let late = (a.firstLogin - a.shiftStart)/60000;
      if(late < -720) late += 1440;
      a.lateMins = Math.round(late);
      if(late >= cfg.thAbsent && !a.offSchedule){ a.absent = true; T.absent.push(a.agent); continue; }
      if(late > cfg.thTardy){
        if(a.excused) T.excused.push({ agent:a.agent, mins:Math.round(late), code:a.excusedCode });
        else { T.tardy.push({ agent:a.agent, mins:Math.round(late) }); a.tardy = Math.round(late); }
      }
    }else if(!a.shiftStart){
      noShiftRef.push(a.agent);
    }

    // Shift shortfall: scheduled minutes the agent was never signed on for.
    if(a.loggedMins > 0){
      const gap = Math.round(scheduledMins - a.loggedMins);
      if(gap >= cfg.thEarly){ a.shortMins = gap; T.shortShift.push({ agent:a.agent, mins:gap, logged:Math.round(a.loggedMins), sched:Math.round(scheduledMins) }); }
    }
    if(a.shiftStart && a.firstCall){
      const gap = Math.round((a.firstCall - a.shiftStart)/60000);
      if(gap >= cfg.thGap && gap < 720) a.callGap = gap;
    }
    if(a.adh  != null){ T.adhSum  += a.adh  * scheduledMins; T.adhWt  += scheduledMins; }
    if(a.conf != null){ T.confSum += a.conf * scheduledMins; T.confWt += scheduledMins; }
    a.occupancy = a.loggedMins > 0 ? (a.totalHandle/60)/a.loggedMins*100 : null;
    T.loggedSecs += a.loggedMins*60;   // occupancy is measured over agents who worked
    T.occHandle  += a.totalHandle;
    T.worked++;
  }
  TEAM_KEYS.forEach(k => {
    const T = teams[k];
    T.tardy.sort((x,y) => y.mins - x.mins);
    T.shortShift.sort((x,y) => y.mins - x.mins);
    T.avgAdh  = T.adhWt  ? T.adhSum/T.adhWt   : null;
    T.avgConf = T.confWt ? T.confSum/T.confWt : null;
    T.onQueueDelivery = T.schedOnQ ? (T.workOnQ/T.schedOnQ)*100 : null;
    T.occupancy = T.loggedSecs ? (T.occHandle/T.loggedSecs)*100 : null;
    T.aht = T.answered ? Math.round(T.handleSecs/T.answered) : 0;
    T.talk = T.answered ? Math.round(T.talkSecs/T.answered) : 0;
    T.hold = T.answered ? Math.round(T.holdSecs/T.answered) : 0;
    T.acw  = T.answered ? Math.round(T.acwSecs/T.answered)  : 0;
    T.coverage = T.scheduled ? (T.worked/T.scheduled)*100 : null;
  });
  const allTeams = key => [].concat(...TEAM_KEYS.map(k => teams[k][key]));

  /* ── 8 · exception lists ──────────────────────────────────────── */
  const pick = (f, m, s) => [...A.values()].filter(f).map(m).sort(s);
  const desc = k => (x,y) => y[k] - x[k];
  const active = a => teams[a.team] && !a.leave && !a.absent;

  const ex = {
    tardy:    allTeams('tardy').sort(desc('mins')),
    excused:  allTeams('excused').sort(desc('mins')),
    shortShift: allTeams('shortShift').sort(desc('mins')),
    absent:   allTeams('absent'),
    leave:    allTeams('leave'),
    lowAdh:   pick(a => active(a) && a.adh != null && a.adh < cfg.tgtAdh && (a.schedMins||a.sched) > 0,
                a => ({ agent:a.agent, adh:a.adh, conf:a.conf, exc:a.excCount, mins:Math.round(a.excMins) }),
                (x,y) => x.adh - y.adh),
    onQShort: pick(a => active(a) && a.schedOnQueue > 0 && a.workOnQueue < a.schedOnQueue*0.95,
                a => ({ agent:a.agent, sched:Math.round(a.schedOnQueue), actual:Math.round(a.workOnQueue),
                        gap:Math.round(a.schedOnQueue - a.workOnQueue) }), desc('gap')),
    hold:     pick(a => active(a) && a.answered >= cfg.thMinCalls && (a.totalHold/a.answered) >= cfg.thHold,
                a => ({ agent:a.agent, secs:Math.round(a.totalHold/a.answered), perHeld:a.holdAvg,
                        held:a.held, calls:a.answered }), desc('secs')),
    rona:     pick(a => active(a) && (a.ronaSecs >= cfg.thRona || a.ronaCount >= 3),
                a => ({ agent:a.agent, secs:a.ronaSecs, count:a.ronaCount }), desc('count')),
    callGap:  pick(a => a.callGap, a => ({ agent:a.agent, mins:a.callGap }), desc('mins')),
    offSched: pick(a => a.offSchedule, a => ({ agent:a.agent, mins:Math.round(a.loggedMins) }), desc('mins')),
    highAht:  pick(a => active(a) && a.answered >= cfg.thMinCalls && a.aht > cfg.tgtAht,
                a => ({ agent:a.agent, aht:a.aht, talk:a.talkAvg, hold:a.holdAvg, acw:a.acwAvg, calls:a.answered }), desc('aht')),
    short:    pick(a => active(a) && a.short > 0, a => ({ agent:a.agent, count:a.short }), desc('count')),
    transfers:pick(a => a.transferred > 0, a => ({ agent:a.agent, count:a.transferred }), desc('count')),
    longest,
    breakReq: pick(a => a.breakUpdates > 0,
                a => ({ agent:a.agent, count:a.breakUpdates, mins:Math.round(a.breakUpdateMins) }),
                (x,y) => y.count - x.count || y.mins - x.mins),
    outbound: [...outMap.entries()].map(([agent,count]) => ({ agent, count, onRoster:onRoster.has(agent) }))
                .sort((x,y) => y.count - x.count),
    repeat:   [...repeatMap.entries()].filter(([,n]) => n >= cfg.thRepeat)
                .map(([ani,count]) => ({ ani, count })).sort((x,y) => y.count - x.count).slice(0,10),
    connDropCalls: connDropCalls.slice().sort((x,y) => x.at - y.at),
    connDrop: (() => {
      const g = new Map();
      for(const x of connDropCalls){
        const k = x.agent || '';
        if(!g.has(k)) g.set(k, { agent:k, count:0, nums:new Set() });
        const e = g.get(k); e.count++; if(x.ani) e.nums.add(x.ani);
      }
      return [...g.values()].map(e => ({ agent:e.agent, count:e.count, numbers:e.nums.size }))
        .sort((x,y) => y.count - x.count);
    })()
  };
  const exCount = ex.tardy.length + ex.shortShift.length + ex.absent.length + ex.lowAdh.length
                + ex.hold.length + ex.rona.length + ex.callGap.length + ex.offSched.length + ex.highAht.length
                + ex.connDrop.length;

  /* ── 9 · follow-up ranking ────────────────────────────────────── */
  const W = new Map();
  const add = (agent, w, reason) => {
    if(!W.has(agent)) W.set(agent, { agent, score:0, reasons:[] });
    const e = W.get(agent); e.score += w; e.reasons.push(reason);
  };
  ex.tardy.forEach(r => add(r.agent, Math.min(r.mins/10, 6), r.mins + ' min late signing on'));
  ex.shortShift.forEach(r => add(r.agent, Math.min(r.mins/20, 5), humanMins(r.mins) + ' less time signed on than scheduled'));
  ex.lowAdh.forEach(r => add(r.agent, Math.min((cfg.tgtAdh - r.adh)/4, 7),
      r.adh.toFixed(1) + '% adherence' + (r.exc ? ' across ' + r.exc + ' exceptions' : '')));
  ex.onQShort.forEach(r => add(r.agent, Math.min(r.gap/15, 5), humanMins(r.gap) + ' short of scheduled on-queue time'));
  ex.rona.forEach(r => add(r.agent, Math.min((r.count||1)*1.5, 6),
      (r.count ? r.count + ' no-answer alerts' : humanDur(r.secs) + ' not responding')));
  ex.hold.forEach(r => add(r.agent, Math.min(r.secs/10, 6), humanDur(r.secs) + ' hold per call'));
  ex.callGap.forEach(r => add(r.agent, Math.min(r.mins/15, 5), 'first call ' + r.mins + ' min into shift'));
  ex.highAht.forEach(r => add(r.agent, Math.min((r.aht - cfg.tgtAht)/60, 5), mmss(r.aht) + ' AHT over ' + r.calls + ' calls'));
  ex.short.forEach(r => add(r.agent, Math.min(r.count*0.6, 4), r.count + ' calls under ' + cfg.thShort + 's'));
  ex.offSched.forEach(r => add(r.agent, 4, 'worked outside the published schedule'));
  ex.connDrop.filter(r => r.agent && onRoster.has(r.agent)).forEach(r =>
    add(r.agent, Math.min(r.count * 2, 7), r.count + ' call' + (r.count === 1 ? '' : 's') + ' dropped at the agent endpoint'));
  const followUp = [...W.values()].sort((a,b) => b.score - a.score).slice(0,10);

  /* ── 10 · supervisor rollup ───────────────────────────────────── */
  const anyFlag = new Set([...W.values()].filter(v => v.score >= 3).map(v => v.agent));
  const sup = new Map();
  for(const a of A.values()){
    if(!teams[a.team] || !a.supervisor) continue;
    if(!sup.has(a.supervisor)) sup.set(a.supervisor, { name:a.supervisor, agents:0, adhSum:0, adhWt:0, flagged:0, absent:0, tardy:0 });
    const s = sup.get(a.supervisor);
    s.agents++;
    if(a.adh != null && !a.leave && !a.absent){ s.adhSum += a.adh; s.adhWt++; }
    if(anyFlag.has(a.agent)) s.flagged++;
    if(a.absent) s.absent++;
    if(a.tardy) s.tardy++;
  }
  const supervisors = [...sup.values()].map(s => ({ ...s, avgAdh: s.adhWt ? s.adhSum/s.adhWt : null }))
    .filter(s => s.agents >= 2).sort((a,b) => b.flagged - a.flagged || a.agents - b.agents);

  /* ── 11 · queues ──────────────────────────────────────────────── */
  const qWin = { y:Y, m:Mo-1, d:Dd, order: cfg.dateOrder === 'auto' ? null : cfg.dateOrder };
  const q = {}, queueNoDay = [];
  let queueDropped = 0;
  TEAM_KEYS.forEach(k => {
    const r = readQueue(F['queue' + k], qWin);
    if(r && r.empty){ queueNoDay.push(k); queueDropped += r.droppedRows; q[k] = null; }
    else { q[k] = r; if(r) queueDropped += r.droppedRows || 0; }
  });
  const haveQueue = TEAM_KEYS.some(k => q[k]);
  const qsum = key => TEAM_KEYS.reduce((s,k) => s + (q[k] ? q[k][key] : 0), 0);
  const qwt  = (key, by) => TEAM_KEYS.reduce((s,k) => s + (q[k] ? q[k][key]*q[k][by] : 0), 0);
  const offered = qsum('offered'), answered = qsum('answered'), abandoned = qsum('abandoned');
  const overall = {
    have: haveQueue, haveVol: offered > 0,
    offered, answered, abandoned,
    sl:  offered ? qwt('sl','offered')/offered : 0,
    ansRate: offered ? (answered/offered)*100 : 0,
    abnRate: offered ? (abandoned/offered)*100 : 0,
    asa: answered ? Math.round(qwt('asa','answered')/answered) : 0,
    aht: answered ? Math.round(qwt('aht','answered')/answered) : 0
  };
  const allQueues = [].concat(...TEAM_KEYS.map(k => (q[k] ? q[k].queues : []).map(x => ({ ...x, team:k }))))
    .sort((a,b) => b.offered - a.offered);
  const fileTarget = (TEAM_KEYS.map(k => q[k] && q[k].fileTarget).find(Boolean)) || null;
  const worstQueue = allQueues.filter(x => x.offered >= 50)
    .sort((a,b) => (a.sl - b.sl) || (b.abandoned - a.abandoned))[0] || null;

  /* ── 12 · departmental aggregates ─────────────────────────────── */
  const tsum = key => TEAM_KEYS.reduce((s,k) => s + teams[k][key], 0);
  const dept = {
    scheduled: tsum('scheduled'), worked: tsum('worked'), handleSecs: tsum('handleSecs'),
    occHandle: tsum('occHandle'), loggedSecs: tsum('loggedSecs'), answered: tsum('answered'),
    schedOnQ: tsum('schedOnQ'), workOnQ: tsum('workOnQ')
  };
  dept.coverage = dept.scheduled ? (dept.worked/dept.scheduled)*100 : null;
  dept.occupancy = dept.loggedSecs ? (dept.occHandle/dept.loggedSecs)*100 : null;
  dept.onQueueDelivery = dept.schedOnQ ? (dept.workOnQ/dept.schedOnQ)*100 : null;
  const adhWt = tsum('adhWt');
  dept.adherence = adhWt ? tsum('adhSum')/adhWt : null;
  const confWt = tsum('confWt');
  dept.conformance = confWt ? tsum('confSum')/confWt : null;

  const leaderboard = [...A.values()].filter(a => a.answered > 0)
    .sort((x,y) => y.answered - x.answered).slice(0,10);

  let peakHour = -1, peakVal = 0;
  hourly.forEach((v,h) => { if(v > peakVal){ peakVal = v; peakHour = h; } });

  const totalRows = Object.values(F).reduce((s,t) => s + (t ? t.rows : 0), 0);

  return {
    cfg, displayDate, winStart, winEnd, teams, dept, agents:A, roster,
    ex, exCount, followUp, supervisors, overall, q, allQueues, worstQueue, fileTarget,
    leaderboard, hourly, peakHour, peakVal,
    channel: [...channel.entries()].sort((a,b) => b[1]-a[1]),
    direction: [...direction.entries()].sort((a,b) => b[1]-a[1]),
    handledTotal, voiceTotal, outsideWindow, unparsedDates, outboundSkipped,
    statusShape, statusRowsUsed, queueDropped, queueNoDay,
    nonVoiceSkipped, unattributed, outboundOffRoster, hourlyBy,
    restrictToSchedule, notScheduled, noShiftRef, totalRows, haveErrCol,
    orders: { status:statusOrder, schedule:schedOrder, interactions:ixOrder }
  };
}

/* ══ 6 · REPORT RENDERER — the Member Care email theme ══
   White page, one 2px charcoal frame 900px wide, a 6px bar in the three brand
   colours, the eyebrow / title / stamp header, the greeting, an ink insight
   band, a KPI strip, numbered sections under 2px rules, charcoal-headed
   tables with #f7f7f7 zebra rows, and the shared footer with the Beyond One
   logo. Arial throughout. Colour beyond the three brands is kept for
   variance against target. */
const E = {
  ink:'#201e1d', ink2:'#201e1d', mute:'#6f6c6a', faint:'#8f8b88',
  hair:'#e3e3e3', rule:'#e3e3e3', rule2:'#e3e3e3',
  paper:'#f7f7f7', card:'#ffffff', frame:'#201e1d', shell:'#ffffff',
  good:'#146c43', warn:'#a4600b', bad:'#c0281f',
  // Brand marks. vX is the brand value for fills and rules; vXtx the text-safe
  // shade (#48C2C9 reaches only 2.1:1 on white, so small type uses a darker tint).
  vA:'#e10a0a', vAtx:'#e10a0a', vB:'#48c2c9', vBtx:'#0e6b70', vC:'#013a37', vCtx:'#013a37', fpay:'#0f6d73',
  ui:'Arial,Helvetica,sans-serif', dis:'Arial,Helvetica,sans-serif', mono:'Arial,Helvetica,sans-serif'
};
const BRAND = {
  A:{ c:E.vA, tx:E.vAtx, on:'#ffffff' },
  B:{ c:E.vB, tx:E.vBtx, on:'#013a37' },
  C:{ c:E.vC, tx:E.vCtx, on:'#ffffff' }
};
const W_OUT = 900, PAD = 32, W_IN = W_OUT - 2 * PAD;   // 836

/* ── Author watermark ─────────────────────────────────────────────────
 *  Every built email carries the author's mark, and none of it is visible:
 *    1. an invisible signature (zero-width characters) woven into the
 *       report title, every section head and the sign-off, which
 *       survives copy and paste;
 *    2. a hidden credit block at the end of the email.
 *  The name is assembled from character codes so a find-and-replace does
 *  not strip it, and build() refuses to finish when the stamp is missing. */
const WM = (() => {
  const name = String.fromCharCode(68,105,97,39,97,32,66,97,110,106,97,114);
  const html = name.replace(/'/g, '&#39;');
  const stamp = '&copy; ' + html;
  const Z0 = '​', Z1 = '‌', ZE = '‍';
  /** Encode an ASCII payload as zero-width characters, framed by ZWJ. */
  const sig = payload => ZE + Array.from(String(payload)).map(ch =>
      (ch.charCodeAt(0) & 255).toString(2).padStart(8,'0').replace(/0/g, Z0).replace(/1/g, Z1)).join('') + ZE;
  /** Every signature found in a piece of text, decoded. */
  const read = text => {
    const found = [], re = /‍([​‌]{8,})‍/g;
    let m;
    while((m = re.exec(String(text || '')))){
      const bits = m[1].replace(/​/g,'0').replace(/‌/g,'1');
      let out = '';
      for(let i = 0; i + 8 <= bits.length; i += 8) out += String.fromCharCode(parseInt(bits.slice(i, i+8), 2));
      found.push(out);
    }
    return found;
  };
  const W = { name, html, stamp, sig, read, cur:'' };
  /** Arm the signature for one report date. Wrapped in a zero-spacing span
   *  so letter-spaced headings do not widen around the invisible run. */
  W.arm = date => { W.cur = `<span style="letter-spacing:0;">${sig(name + '|' + (date || ''))}</span>`; return W.cur; };
  /** Hidden credit block, invisible in every client. */
  W.hidden = () => `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">`
    + `Daily WFM &amp; Performance Review. Data extraction, design and build by ${html}, Workforce Management, Beyond One. &copy; 2026 ${html}. All rights reserved.${W.cur}</div>`;
  /** True only when the output carries the signature in the title and at
   *  least one section head, and the hidden credit block. */
  W.check = h => read(h).filter(x => x.indexOf(name) === 0).length >= 3 && String(h).indexOf('design and build by ' + html) > -1;
  return W;
})();

const GUT = w => `<td width="${w}" style="width:${w}px;font-size:1px;line-height:1px;">&nbsp;</td>`;
const eyebrow = (t,c,s) => `<div style="font-family:${E.ui};font-size:${s||10}px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${c||E.mute};">${t}</div>`;
const mono    = (v,size,c) => `<span style="font-family:${E.mono};font-size:${size||12}px;color:${c||E.ink};">${v}</span>`;
const note    = t => `<div style="font-family:${E.ui};font-size:12px;color:${E.mute};line-height:1.65;">${t}</div>`;
const swatch  = c => `<span style="color:${c};font-size:9px;">&#9632;</span> `;
/** Email figures read better as 2:33 than 00:02:33, and a sub-minute answer
 *  time reads as 8s rather than a clock. */
const mmss = s => { const m = /^(\d+):(\d+):(\d+)$/.exec(clockFmt(s||0)); if(!m) return clockFmt(s||0);
  return (+m[1]) ? (+m[1])+':'+m[2]+':'+m[3] : (+m[2])+':'+m[3]; };
const secsShort = s => s == null ? '' : (s < 60 ? Math.round(s)+'s' : mmss(s));
const tbl = (inner, extra) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;${extra||''}">${inner}</table>`;

/** One full-width row of the frame. */
function band(inner, bg, top, bot){
  return `<tr><td class="pad" ${bg ? `bgcolor="${bg}"` : ''} style="padding:${top == null ? 22 : top}px ${PAD}px ${bot == null ? 0 : bot}px ${PAD}px;${bg ? `background:${bg};` : ''}">${inner}</td></tr>`;
}
/** Title case for section heads, Member Care style: "Workforce on the Day". */
const titleCase = t => String(t).split(' ').map((w,i) =>
  i && /^(a|an|and|at|by|for|in|of|on|or|the|to|vs)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
/** Numbered section head, as in the Member Care reports: a 2px rule, the
 *  index, a 22px title and an optional line of explanation. */
function sec(n, title, sub){
  return band(tbl(
      `<tr><td style="border-top:2px solid ${E.frame};font-size:0;line-height:0;">&nbsp;</td></tr>`
    + `<tr><td style="font-family:${E.ui};font-size:11px;line-height:15px;color:${E.ink};font-weight:700;letter-spacing:2px;padding:9px 0 0 0;">${n}</td></tr>`
    + `<tr><td style="font-family:${E.dis};font-size:22px;line-height:28px;mso-line-height-rule:exactly;color:${E.ink};font-weight:700;letter-spacing:-.3px;padding:2px 0 0 0;">${titleCase(title)}${WM.cur}</td></tr>`
    + (sub ? `<tr><td style="font-family:${E.ui};font-size:13px;line-height:19px;color:${E.mute};padding:5px 0 0 0;">${sub}</td></tr>` : '')), null, 32, 0);
}
/** Member Care KPI strip: one white box, 2px charcoal border, cells split
 *  by hairlines. Each cell is {label, value, sub, delta, colour, deltaColour}. */
function kpiStrip(cells){
  const w = Math.floor(100 / cells.length);
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${E.card}" style="width:100%;background-color:${E.card};border:2px solid ${E.frame};border-collapse:collapse;"><tr>`
    + cells.map((k,i) => `<td class="kpi" width="${w}%" valign="top" style="width:${w}%;padding:12px;${i ? `border-left:1px solid ${E.hair};` : ''}">`
      + `<div style="font-family:${E.ui};font-size:10px;line-height:14px;color:${E.mute};font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${k.label}</div>`
      + `<div style="font-family:${E.ui};font-size:23px;line-height:29px;mso-line-height-rule:exactly;color:${k.colour || E.ink};font-weight:700;letter-spacing:-.5px;padding-top:3px;">${k.value}</div>`
      + (k.sub ? `<div style="font-family:${E.ui};font-size:10px;line-height:14px;color:${E.mute};padding-top:2px;">${k.sub}</div>` : '')
      + (k.delta ? `<div style="font-family:${E.ui};font-size:10px;line-height:14px;font-weight:700;color:${k.deltaColour || E.mute};padding-top:1px;">${k.delta}</div>` : '')
      + `</td>`).join('')
    + `</tr></table>`;
}
/** Data table in the Member Care style: charcoal header row with white
 *  capitals, then rows alternating white and #f7f7f7. Column widths total 836. */
function grid(cols, rows, empty){
  if(!rows.length) return `<div style="font-family:${E.ui};font-size:12.5px;color:${E.faint};padding:10px 0;">${empty}</div>`;
  const N = cols.length;
  const head = cols.map((c,j) => `<td width="${c.w}" ${c.right?'align="right"':''} bgcolor="${E.frame}" style="width:${c.w}px;background-color:${E.frame};font-family:${E.ui};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#ffffff;white-space:nowrap;padding:9px ${j===N-1?10:7}px 9px ${j?7:10}px;">${c.t}</td>`).join('');
  const body = rows.map((r,i) => {
    const bg = i%2 ? E.paper : E.card;
    return `<tr bgcolor="${bg}">` + r.map((v,j) =>
      `<td ${cols[j].right?'align="right"':''} style="background-color:${bg};font-family:${E.ui};font-size:12px;line-height:16px;color:${E.ink};padding:8px ${j===N-1?10:7}px 8px ${j?7:10}px;${cols[j].right?'white-space:nowrap;':''}">${v}</td>`).join('')
      + `</tr>`;
  }).join('');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;border-collapse:collapse;">`
    + `<tr>${head}</tr>` + body + `</table>`;
}

/** Horizontal stacked bar built from table cells so Outlook renders it. */
function stack(parts, height){
  const tot = parts.reduce((s,p) => s + p.v, 0) || 1;
  const cells = parts.filter(p => p.v > 0).map(p =>
    `<td width="${Math.max(1, Math.round(p.v/tot*100))}%" bgcolor="${p.c}" style="height:${height||16}px;font-size:1px;line-height:${height||16}px;mso-line-height-rule:exactly;">&nbsp;</td>`).join('');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${cells || '<td>&nbsp;</td>'}</tr></table>`;
}
function legend(parts, tot){
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:9px;"><tr>`
    + parts.filter(p => p.v > 0).map(p =>
      `<td valign="top" style="padding-right:16px;font-family:${E.ui};font-size:11px;color:${E.mute};white-space:nowrap;">`
      + swatch(p.c) + `${p.n} ${mono(p.v.toLocaleString(), 11)}`
      + (tot ? ` <span style="color:${E.faint};">${(p.v/tot*100).toFixed(0)}%</span>` : '') + `</td>`).join('')
    + `</tr></table>`;
}

/** Bulleted name list used by the attendance buckets. The bullet carries the
 *  brand, so a name lifted out of its column still says which brand it is. */
function people(items, colour, fmt, cap){
  if(!items.length) return `<div style="font-family:${E.ui};font-size:12px;color:${E.faint};padding:4px 0;">None recorded.</div>`;
  const n = cap || 14;
  const rule = `<tr><td colspan="2" bgcolor="${E.rule2}" height="1" style="height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr>`;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">`
    + items.slice(0,n).map(x =>
      `<tr><td width="14" valign="top" style="width:14px;font-family:${E.ui};font-size:10px;line-height:20px;color:${colour};">&#9632;</td>`
      + `<td valign="top" style="font-family:${E.ui};font-size:12.5px;line-height:20px;color:${E.ink2};padding:2px 0 3px 0;">${fmt(x)}</td></tr>` + rule).join('')
    + `</table>`
    + (items.length > n ? `<div style="font-family:${E.ui};font-size:11px;color:${E.faint};padding:6px 0;">and ${items.length-n} more</div>` : '');
}

/** Two-column list used by the exception matrices, styled like the Member
 *  Care ticket tables: charcoal title bar, then zebra rows. */
function mini(title, rows, empty, w){
  const body = rows.length
    ? rows.map((r,i) => { const bg = i%2 ? E.paper : E.card;
        return `<tr bgcolor="${bg}"><td style="background-color:${bg};font-family:${E.ui};font-size:12px;line-height:16px;color:${E.ink};padding:8px 8px;">${r[0]}</td>`
        + `<td align="right" style="background-color:${bg};font-family:${E.ui};font-size:12px;line-height:16px;padding:8px 8px;white-space:nowrap;">${r[1]}</td></tr>`; }).join('')
    : `<tr bgcolor="${E.card}"><td colspan="2" style="background-color:${E.card};font-family:${E.ui};font-size:12px;line-height:16px;color:${E.faint};padding:8px 8px;">${empty}</td></tr>`;
  const W = w || Math.floor((W_IN - 32) / 2);
  return `<td width="${W}" valign="top" class="stack" style="width:${W}px;">`
    + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">`
    + `<tr><td colspan="2" bgcolor="${E.frame}" style="background-color:${E.frame};font-family:${E.ui};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#ffffff;padding:9px 8px;">${title}</td></tr>`
    + body + `</table></td>`;
}

const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ');

function renderReport(M){
  const c = M.cfg, S = [], D = M.dept, q = M.overall;
  WM.arm(c.date);
  const EX = Object.assign({ absent:[], tardy:[], earlyOut:[], lowAdh:[], leave:[], excused:[],
    callGap:[], offSched:[], hold:[], rona:[], highAht:[], short:[], onQShort:[], shortShift:[],
    transfers:[], longest:[], repeat:[], breakReq:[], outbound:[] }, M.ex || {});
  const K = TEAM_KEYS;
  const tn = k => esc(teamName(c, k));
  const nm = a => esc(shortName(a, c.shortNames));
  const na = `<span style="color:${E.faint};">&mdash;</span>`;
  const teamKeyOf = a => { const r = M.agents.get(a); return r && BRAND[r.team] ? r.team : null; };
  const teamOf  = a => { const k = teamKeyOf(a); return k ? teamName(c, k) : ''; };
  const teamCol = a => { const k = teamKeyOf(a); return k ? BRAND[k].tx : E.faint; };
  const mark    = a => { const k = teamKeyOf(a); return swatch(k ? BRAND[k].c : E.faint); };
  const row = cells => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;"><tr>${cells}</tr></table>`;
  const pts = (v,t) => (v >= t ? '+' : '−') + Math.abs(v-t).toFixed(1) + ' pt';
  const tone = (v,t,lower,bandw) => v == null ? null : (lower ? v <= t : v >= t) ? 'good' : Math.abs(v-t) <= (bandw||3) ? 'warn' : 'bad';
  const toneCol = t => t === 'good' ? E.good : t === 'warn' ? E.warn : t === 'bad' ? E.bad : E.ink;
  const brandList = K.map(tn);
  const brandWords = brandList.slice(0, -1).join(', ') + ' and ' + brandList[brandList.length - 1];
  let n = 0;
  const nextNo = () => String(++n).padStart(2,'0');

  const [yy, mm, dd] = String(c.date || '').split('-').map(Number);
  const dObj = new Date(yy, (mm || 1) - 1, dd || 1);
  const dOk = !!yy && !isNaN(dObj);
  const dShort = dOk ? String(dd).padStart(2,'0') + ' ' + MONTHS_S[mm - 1] + ' ' + yy : esc(c.date || '');

  /* ═══ MASTHEAD — brand bar, white head, charcoal rule ═══ */
  S.push(`<tr><td style="padding:0;font-size:0;line-height:0;">`
    + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;"><tr>`
    + K.map((k,i) => `<td width="${i === 1 ? 34 : 33}%" height="6" bgcolor="${BRAND[k].c}" style="height:6px;font-size:0;line-height:0;background-color:${BRAND[k].c};">&nbsp;</td>`).join('')
    + `</tr></table></td></tr>`);
  S.push(`<tr><td bgcolor="#ffffff" class="pad" style="background-color:#ffffff;padding:18px ${PAD}px;border-bottom:2px solid ${E.frame};">`
    + tbl(`<tr><td valign="middle" style="font-family:${E.ui};">`
      + `<div style="font-size:11px;line-height:15px;color:${E.ink};font-weight:700;letter-spacing:2px;">WORKFORCE MANAGEMENT &middot; ALL BRANDS</div>`
      + `<div style="font-size:26px;line-height:32px;mso-line-height-rule:exactly;color:${E.ink};font-weight:700;letter-spacing:-.6px;padding-top:3px;">Daily WFM &amp; Performance Review${WM.cur}</div>`
    + `</td>`
    + `<td valign="middle" align="right" style="font-family:${E.ui};font-size:11px;line-height:16px;color:${E.mute};font-weight:700;letter-spacing:1px;white-space:nowrap;">DAILY &middot; ${dShort}</td></tr>`)
    + `</td></tr>`);

  /* ═══ GREETING ═══ */
  const intro = `Kindly find below the daily WFM &amp; performance review for ${esc(M.displayDate)}, covering inbound voice for ${brandWords} from ${String(c.dayStart).padStart(2,'0')}:00.`;
  S.push(`<tr><td class="pad" style="padding:22px ${PAD}px 16px ${PAD}px;">` + tbl(
      `<tr><td style="font-family:${E.ui};font-size:14px;line-height:20px;color:${E.ink};padding:0 0 6px 0;">${esc(c.greeting)}</td></tr>`
    + `<tr><td style="font-family:${E.ui};font-size:14px;line-height:20px;color:${E.ink};padding:0 0 10px 0;">${intro}</td></tr>`) + `</td></tr>`);

  /* ═══ THE DAY IN ONE LINE — insight band ═══ */
  const sum = [];
  if(!q.have) sum.push(`<b>Queue reporting is unavailable</b> for this date, so service level, presented volume and abandon rate are not stated. Everything below is drawn from agent-level data.`);
  if(q.have) sum.push(`The department answered <b>${q.answered.toLocaleString()}</b> of <b>${q.offered.toLocaleString()}</b> calls offered (${q.ansRate.toFixed(1)}%), closing at <b>${q.sl.toFixed(1)}%</b> service level against the ${c.tgtSL}% target and ${q.abnRate.toFixed(1)}% abandon against the ${c.tgtAbn}% ceiling.`);
  if(D.scheduled) sum.push(`<b>${D.worked}</b> of <b>${D.scheduled}</b> scheduled agents worked`
    + (EX.absent.length ? `, with ${EX.absent.length} recorded absent` : '')
    + (EX.tardy.length ? ` and ${EX.tardy.length} signing on late` : '') + '.');
  if(D.adherence != null) sum.push(`Adherence closed at <b>${D.adherence.toFixed(1)}%</b> against the ${c.tgtAdh}% target.`);
  if(M.exCount) sum.push(`<b>${M.exCount}</b> schedule and quality exceptions were raised across ${M.followUp.length} agents.`);
  S.push(`<tr><td class="pad" style="padding:0 ${PAD}px;">`
    + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${E.frame}" style="width:100%;background-color:${E.frame};border-collapse:collapse;">`
    + `<tr><td style="font-family:${E.ui};padding:16px 18px;">`
    + `<div style="font-size:11px;line-height:15px;color:#ffffff;font-weight:700;letter-spacing:2px;">THE DAY IN ONE LINE</div>`
    + `<div style="font-size:15px;line-height:23px;mso-line-height-rule:exactly;color:#ffffff;padding-top:6px;">${sum.join(' ')}</div>`
    + `</td></tr></table></td></tr>`);

  /* ═══ ALL BRANDS — KPI strip ═══ */
  const slTone = q.have ? tone(q.sl, c.tgtSL, false) : null;
  const abnTone = q.have ? tone(q.abnRate, c.tgtAbn, true, 1) : null;
  S.push(`<tr><td class="pad" style="padding:16px ${PAD}px 0 ${PAD}px;">`
    + kpiStrip([
        { label:'Service level', value: q.have ? q.sl.toFixed(1)+'%' : na, colour: q.have ? toneCol(slTone) : E.ink,
          sub: 'target ' + c.tgtSL + '%', delta: q.have ? pts(q.sl, c.tgtSL) : '', deltaColour: toneCol(slTone) },
        { label:'Calls offered', value: q.have ? q.offered.toLocaleString() : M.handledTotal.toLocaleString(),
          sub: q.have ? 'all brands' : 'handled, no queue export' },
        { label:'Answered', value: q.have ? q.answered.toLocaleString() : na, sub: q.have ? q.ansRate.toFixed(1)+'% of offered' : '' },
        { label:'Abandon', value: q.have ? q.abnRate.toFixed(1)+'%' : na, colour: q.have && abnTone !== 'good' ? toneCol(abnTone) : E.ink,
          sub: q.have ? q.abandoned.toLocaleString()+' calls &middot; ceiling '+c.tgtAbn+'%' : '' },
        { label:'Avg handling', value: q.have ? mmss(q.aht) : na, sub: q.have ? 'ASA ' + secsShort(q.asa) : '' }
      ])
    + `<div style="font-family:${E.ui};font-size:11px;line-height:16px;color:${E.mute};padding-top:8px;">`
    + `${M.allQueues.length || 0} voice queues &middot; ${M.handledTotal.toLocaleString()} inbound calls in window &nbsp;&nbsp;`
    + K.map(k => `<span style="color:${BRAND[k].c};font-size:10px;">&#9632;</span> <b style="color:${E.ink};">${tn(k)}</b>`).join(' &nbsp;')
    + ` &mdash; the square beside every name marks the brand</div>`
    + `</td></tr>`);

  /* ═══ BRANDS SIDE BY SIDE ═══ */
  {
    const mW = 212, bW = Math.floor((W_IN - mW) / K.length);
    const head = `<td width="${mW}" bgcolor="${E.frame}" style="width:${mW}px;background-color:${E.frame};font-family:${E.ui};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#ffffff;padding:10px 10px;">Measure</td>`
      + K.map(k => `<td width="${bW}" align="right" bgcolor="${BRAND[k].c}" style="width:${bW}px;background-color:${BRAND[k].c};font-family:${E.ui};font-size:12px;line-height:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:${BRAND[k].on};padding:10px 10px;white-space:nowrap;">${tn(k)}</td>`).join('');
    const T = k => M.teams[k], Q = k => M.q[k];
    const share = k => q.have && q.offered && Q(k) ? Math.round(Q(k).offered/q.offered*100) + '%' : na;
    const lines = [
      ['Service level <span style="color:' + E.faint + ';">&middot; target ' + c.tgtSL + '%</span>', k => { const qd = Q(k); if(!qd) return na;
        const st = tone(qd.sl, c.tgtSL, false);
        return `<span style="font-size:16px;color:${toneCol(st)};">${qd.sl.toFixed(1)}%</span><br><span style="font-size:11px;color:${toneCol(st)};">${pts(qd.sl, c.tgtSL)}</span>`; }],
      ['Share of volume', k => share(k)],
      ['Queues', k => Q(k) ? String(Q(k).queues.length) : `<span style="color:${E.faint};">no queue export</span>`],
      ['Offered', k => Q(k) ? Q(k).offered.toLocaleString() : na],
      ['Answered', k => Q(k) ? Q(k).answered.toLocaleString() : na],
      ['Abandon', k => Q(k) ? `<span style="color:${toneCol(tone(Q(k).abn, c.tgtAbn, true, 1))};">${Q(k).abn.toFixed(2)}%</span>` : na],
      ['ASA', k => Q(k) ? secsShort(Q(k).asa) : na],
      [`AHT <span style="color:${E.faint};">&middot; ceiling ${mmss(c.tgtAht)}</span>`, k => T(k).answered
        ? `<span style="color:${T(k).aht <= c.tgtAht ? E.good : E.warn};">${mmss(T(k).aht)}</span>` : na],
      ['Talk / hold / ACW', k => T(k).answered ? `${mmss(T(k).talk)} <span style="color:${E.faint}">/</span> ${mmss(T(k).hold)} <span style="color:${E.faint}">/</span> ${mmss(T(k).acw)}` : na],
      [`Adherence <span style="color:${E.faint};">&middot; target ${c.tgtAdh}%</span>`, k => T(k).avgAdh == null ? na
        : `<span style="color:${toneCol(tone(T(k).avgAdh, c.tgtAdh, false, 2))};">${T(k).avgAdh.toFixed(1)}%</span>`],
      ['Conformance', k => T(k).avgConf == null ? na : T(k).avgConf.toFixed(1)+'%'],
      ['Occupancy', k => T(k).occupancy == null ? na : T(k).occupancy.toFixed(1)+'%'],
      ['Coverage', k => T(k).scheduled ? `<span style="color:${T(k).worked < T(k).scheduled ? E.warn : E.ink};">${T(k).worked} / ${T(k).scheduled}</span>` : na]
    ];
    const body = lines.map(([label, f], i) => { const bg = i%2 ? E.paper : E.card;
      return `<tr bgcolor="${bg}"><td style="background-color:${bg};font-family:${E.ui};font-size:12px;line-height:16px;color:${E.mute};padding:8px 10px;">${label}</td>`
        + K.map(k => `<td align="right" valign="top" style="background-color:${bg};font-family:${E.mono};font-size:12.5px;line-height:17px;font-weight:700;color:${E.ink};padding:8px 10px;white-space:nowrap;">${f(k)}</td>`).join('')
        + `</tr>`; }).join('');
    S.push(sec(nextNo(), 'Brands side by side', `Service from the queue exports, handle time and attendance from the agent exports. Target ${c.tgtSL}% service level.`));
    S.push(band(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;border-collapse:collapse;"><tr>${head}</tr>${body}</table>`, null, 14, 0));
  }

  /* ═══ SERVICE LEVEL BY QUEUE ═══ */
  if(M.allQueues.length){
    S.push(sec(nextNo(), 'Service level by queue', `Every voice queue, ranked by volume. Target ${c.tgtSL}% answered inside the queue's target wait.`));
    S.push(band(grid(
      [{t:'Queue',w:246},{t:'Brand',w:120},{t:'Offered',w:90,right:true},{t:'Answered',w:96,right:true},{t:'Abandon',w:94,right:true},{t:'ASA',w:86,right:true},{t:'SL',w:104,right:true}],
      M.allQueues.map(qq => [
          swatch(BRAND[qq.team] ? BRAND[qq.team].c : E.faint) + esc(qq.name),
          `<span style="color:${BRAND[qq.team] ? BRAND[qq.team].tx : E.faint};font-weight:700;">${tn(qq.team)}</span>`,
          qq.offered.toLocaleString(), qq.answered.toLocaleString(),
          `<span style="color:${toneCol(tone(qq.abn, c.tgtAbn, true, 1))};">${qq.abn.toFixed(1)}%</span>`,
          `<span style="color:${qq.asa > 20 ? E.bad : qq.asa > 15 ? E.warn : E.ink2};">${secsShort(qq.asa)}</span>`,
          `<b style="color:${toneCol(tone(qq.sl, c.tgtSL, false, 2))};">${qq.sl.toFixed(1)}%</b>`
        ]), 'No queue detail available.'), null, 14, 0));
    if(M.worstQueue)
      S.push(band(note(`Weakest queue of the day: <b style="color:${E.ink};">${esc(M.worstQueue.name)}</b> at ${M.worstQueue.sl.toFixed(1)}% on ${M.worstQueue.offered.toLocaleString()} calls offered, answering in ${secsShort(M.worstQueue.asa)} on average.`), null, 12, 0));
  }

  /* ═══ CALL VOLUME FUNNEL, SPLIT BY BRAND ═══ */
  if(q.have && q.offered){
    const TOT = q.offered;
    const seg = v => Math.max(v > 0 ? 2 : 0, Math.round(v / TOT * 100));
    const g = k => M.q[k] || { offered:0, answered:0, abandoned:0 };
    const fbar = (name, total, key, last) => {
      const ws = K.map(k => seg(g(k)[key]));
      const rest = Math.max(0, 100 - ws.reduce((s,w) => s + w, 0));
      return tbl(`<tr><td style="font-family:${E.ui};font-size:12px;color:${E.mute};">${name} &nbsp;${mono(total.toLocaleString(), 13)}</td>`
        + `<td align="right" style="font-family:${E.ui};font-size:11.5px;color:${E.mute};">`
        + K.map(k => `<b style="color:${BRAND[k].tx};">${tn(k)}</b> ${g(k)[key].toLocaleString()}`).join(` &nbsp;<span style="color:${E.hair};">|</span>&nbsp; `)
        + `</td></tr>`, 'margin-bottom:7px;')
        + tbl(`<tr>` + K.map((k,i) => ws[i] ? `<td width="${ws[i]}%" bgcolor="${BRAND[k].c}" style="height:22px;font-size:1px;line-height:22px;mso-line-height-rule:exactly;">&nbsp;</td>` : '').join('')
        + (rest > 1
            ? `<td width="${rest}%" style="font-family:${E.mono};font-size:11.5px;color:${E.mute};padding-left:10px;">${(total/TOT*100).toFixed(1)}%</td>`
            : `<td width="1">&nbsp;</td>`)
        + `</tr>`, `margin-bottom:${last?0:18}px;`);
    };
    S.push(sec(nextNo(), 'Call volume funnel', 'Each stage split by brand, attributed on entry queue.'));
    S.push(band(fbar('Offered', q.offered, 'offered') + fbar('Answered', q.answered, 'answered')
      + fbar('Abandoned', q.abandoned, 'abandoned', true), null, 20, 0));
  }

  /* ═══ DEMAND AND CHANNEL MIX ═══ */
  if(M.channel.length || M.peakHour >= 0){
    const cols = [E.fpay, E.vB, '#9ad9dd', '#c3cddb', E.faint];
    const parts = M.channel.map(([k,v],i) => ({ n:esc(k), v, c:cols[i % cols.length] }));
    const tot = parts.reduce((s,p) => s + p.v, 0);
    const half = Math.floor((W_IN - 24) / 2);
    const peakBy = K.map(k => {
      const h = M.hourlyBy[k]; let ph = -1, pv = 0;
      h.forEach((v,i) => { if(v > pv){ pv = v; ph = i; } });
      return [k, ph, pv];
    }).filter(x => x[2] > 0);
    S.push(band(row(
        `<td width="${half}" valign="top" class="stack" style="width:${half}px;">`
        + eyebrow('Inbound channel mix', E.ink)
        + `<div style="height:12px;font-size:1px;">&nbsp;</div>${stack(parts, 20)}${legend(parts, tot)}</td>`
      + GUT(24)
      + `<td width="${half}" valign="top" class="stack" style="width:${half}px;">`
        + eyebrow('Demand profile', E.ink)
        + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;">`
        + [['Busiest hour', M.peakHour >= 0 ? String(M.peakHour).padStart(2,'0')+':00 &ndash; '+String((M.peakHour+1)%24).padStart(2,'0')+':00' : na],
           ['Calls in that hour', M.peakVal ? M.peakVal.toLocaleString() : na],
           ['Inbound calls in window', M.voiceTotal.toLocaleString()]]
          .concat(peakBy.map(([k, ph, pv]) => [swatch(BRAND[k].c) + 'Busiest for ' + tn(k), String(ph).padStart(2,'0') + ':00 &middot; ' + pv.toLocaleString()]))
          .map(([k,v],i) =>
            `<tr><td style="font-family:${E.ui};font-size:12px;color:${E.mute};padding:7px 10px;background-color:${i%2?E.paper:E.card};">${k}</td>`
            + `<td align="right" style="font-family:${E.mono};font-size:12px;font-weight:700;color:${E.ink};padding:7px 10px 7px 0;background-color:${i%2?E.paper:E.card};white-space:nowrap;">${v}</td></tr>`).join('')
        + `</table></td>`), null, 28, 0));
  }

  /* ═══ WORKFORCE ON THE DAY ═══ */
  S.push(sec(nextNo(), 'Workforce on the day', M.restrictToSchedule
    ? `Scheduled against worked, for the ${M.roster.length} agents with a published schedule row.`
    : `Scheduled against worked, taken from the adherence roster — no schedule export was loaded.`));
  const shortMins = EX.shortShift.reduce((s,r) => s + r.mins, 0);
  const cov = D.coverage == null ? null : D.coverage >= 98 ? 'good' : D.coverage >= 92 ? 'warn' : 'bad';
  S.push(band(kpiStrip([
      { label:'Scheduled', value:D.scheduled || 0, sub:D.schedOnQ ? Math.round(D.schedOnQ/60)+' on-queue hours' : 'agents on the roster' },
      { label:'Worked', value:D.worked || 0, sub:D.loggedSecs ? Math.round(D.loggedSecs/3600)+' hours signed on' : '',
        delta: D.coverage == null ? '' : D.coverage.toFixed(0)+'% covered', deltaColour: toneCol(cov) },
      { label:'Short of shift', value:EX.shortShift.length, colour: EX.shortShift.length ? E.warn : E.ink,
        sub:shortMins ? humanMins(shortMins)+' lost' : 'none recorded' },
      { label:'No sign-on', value:EX.absent.length, colour: EX.absent.length ? E.bad : E.ink,
        sub:EX.leave.length ? EX.leave.length+' on approved leave' : 'no absence recorded' }
    ]), null, 14, 0));

  /* ═══ ATTENDANCE BY BRAND ═══ */
  const bucket = (title, cnt, body) => cnt || !c.hideEmpty
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:14px;"><tr>`
      + `<td bgcolor="${E.rule}" height="1" style="height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`
      + `<div style="padding-top:10px;">`
      + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>`
      + `<td>${eyebrow(title, E.mute)}</td><td align="right" style="font-family:${E.mono};font-size:13px;color:${E.ink};">${cnt}</td></tr></table>`
      + `<div style="height:5px;font-size:1px;">&nbsp;</div>${body}</div>` : '';
  const cW = Math.floor((W_IN - 2 * 24) / 3);
  const acard = k => { const T = M.teams[k], brand = BRAND[k].c;
    return `<td width="${cW}" valign="top" class="stack" style="width:${cW}px;">`
    + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="4" bgcolor="${brand}" style="height:4px;font-size:0;line-height:0;background-color:${brand};">&nbsp;</td></tr></table>`
    + `<div style="font-family:${E.dis};font-size:17px;font-weight:700;letter-spacing:-.3px;color:${E.ink};padding-top:9px;">${esc(T.name)}</div>`
    + `<div style="height:10px;font-size:0;line-height:0;">&nbsp;</div>`
    + kpiStrip([{ label:'Scheduled', value:T.scheduled }, { label:'Worked', value:T.worked, colour: T.worked < T.scheduled ? E.warn : E.ink }])
    + bucket('No sign-on', T.absent.length, people(T.absent, brand, x => nm(x), 12))
    + bucket('Approved leave', T.leave.length, people(T.leave, brand, x => nm(x.agent || x) + (x.type ? ` <span style="color:${E.mute};">${esc(x.type)}</span>` : ''), 12))
    + bucket('Late sign-on', T.tardy.length, people(T.tardy, brand, x => nm(x.agent) + ` <span style="color:${E.warn};">${x.mins}m late</span>`, 14))
    + bucket('Excused late', T.excused.length, people(T.excused, brand, x => nm(x.agent) + ` <span style="color:${E.mute};">${x.mins}m &middot; ${esc(x.code||'')}</span>`, 10))
    + bucket('Short of shift', T.shortShift.length, people(T.shortShift, brand, x => nm(x.agent) + ` <span style="color:${E.warn};">${x.mins}m short of ${x.sched}m</span>`, 12))
    + bucket('In training', T.training.length, people(T.training, brand, x => nm(x), 10))
    + `</td>`; };
  S.push(band(row(K.map(acard).join(GUT(24))), null, 24, 0));

  /* ═══ ADHERENCE ═══ */
  S.push(sec(nextNo(), 'Adherence', `Target ${c.tgtAdh}%. Weighted by scheduled minutes across agents who worked.`));
  const adhTone = D.adherence == null ? null : tone(D.adherence, c.tgtAdh, false, 2);
  S.push(band(kpiStrip([
      { label:'Adherence', value:D.adherence == null ? na : D.adherence.toFixed(1)+'%', colour: adhTone && adhTone !== 'good' ? toneCol(adhTone) : E.ink,
        sub:'target '+c.tgtAdh+'%', delta:D.adherence == null ? '' : pts(D.adherence, c.tgtAdh), deltaColour: toneCol(adhTone) },
      { label:'Conformance', value:D.conformance == null ? na : D.conformance.toFixed(1)+'%', sub:'scheduled hours delivered' },
      { label:'Occupancy', value:D.occupancy == null ? na : D.occupancy.toFixed(1)+'%', sub:'handle time over time signed on' },
      { label:'Below target', value:EX.lowAdh.length, colour: EX.lowAdh.length ? E.warn : E.ink, sub:'of '+(D.worked||0)+' who worked' }
    ]), null, 14, 0));

  if(EX.lowAdh.length){
    S.push(band(row(mini(`Adherence below ${c.tgtAdh}%`, EX.lowAdh.slice(0,8).map(r => [
            mark(r.agent)+nm(r.agent),
            `<span style="color:${r.adh < c.tgtAdh-10 ? E.bad : E.warn};">${r.adh.toFixed(1)}%</span>`
            + (r.exc ? ` <span style="color:${E.faint};">${r.exc} exc &middot; ${Math.round(r.mins)}m</span>` : '')
          ]), 'All met target.')
      + GUT(32)
      + mini('Highest adherence', [...M.agents.values()]
            .filter(a => a.adh != null && a.team && !a.absent && !a.leave)
            .sort((x,y) => y.adh - x.adh).slice(0,8)
            .map(p => [mark(p.agent)+nm(p.agent), `<span style="color:${E.good};">${p.adh.toFixed(1)}%</span>`]),
          'No adherence figures available.')), null, 20, 0));
  }

  /* ═══ WHAT NEEDS ATTENTION ═══ */
  const acts = [];
  if(q.have && M.worstQueue && M.worstQueue.sl < c.tgtSL)
    acts.push([`${esc(M.worstQueue.name)} finished at ${M.worstQueue.sl.toFixed(1)}%`,
      `${M.worstQueue.offered.toLocaleString()} calls offered`
      + (q.abandoned && M.worstQueue.abandoned ? `, carrying ${Math.round(M.worstQueue.abandoned/q.abandoned*100)}% of the day's abandons` : '') + '.']);
  if(q.have && q.sl >= c.tgtSL && M.allQueues.length){
    const thin = M.allQueues.filter(qq => qq.sl >= c.tgtSL && qq.sl < c.tgtSL + 2 && qq.offered >= 50);
    if(thin.length) acts.push([`${thin.length} queue${thin.length>1?'s':''} sitting within 2 points of target`,
      `${thin.map(qq => esc(qq.name)+' '+qq.sl.toFixed(1)+'%').join(', ')}. One unstaffed interval would push ${thin.length>1?'them':'it'} under.`]);
  }
  K.forEach(k => { const qd = M.q[k];
    if(qd && qd.offered && qd.sl < c.tgtSL)
      acts.push([`${tn(k)} closed ${Math.abs(qd.sl - c.tgtSL).toFixed(1)} points under the service level target`,
        `${qd.sl.toFixed(1)}% on ${qd.offered.toLocaleString()} calls offered, ${qd.abandoned.toLocaleString()} abandoned.`]); });
  if(D.adherence != null && D.adherence < c.tgtAdh)
    acts.push([`Adherence closed ${Math.abs(D.adherence-c.tgtAdh).toFixed(1)} points under target`,
      `${D.adherence.toFixed(1)}% against ${c.tgtAdh}%${EX.lowAdh.length ? `, with ${EX.lowAdh.length} agents below it` : ''}. Named below.`]);
  if(EX.absent.length)
    acts.push([`${EX.absent.length} agent${EX.absent.length>1?'s':''} with no sign-on recorded`,
      'Team leaders to confirm the reason so the day can be closed off.']);
  if(EX.shortShift.length)
    acts.push([`${EX.shortShift.length} agent${EX.shortShift.length>1?'s':''} signed on for less than the published shift`,
      `${humanMins(shortMins)} of scheduled time not worked, led by ${nm(EX.shortShift[0].agent)} at ${humanMins(EX.shortShift[0].mins)}.`]);
  if(EX.tardy.length >= 5)
    acts.push([`${EX.tardy.length} late sign-ons`, 'Cover was short at shift start on those seats.']);
  if(q.have && q.aht > c.tgtAht)
    acts.push([`Handle time ran ${humanDur(q.aht - c.tgtAht)} over the ${mmss(c.tgtAht)} ceiling`,
      `${mmss(q.aht)} across ${q.answered.toLocaleString()} answered calls.`]);
  if(EX.highAht.length >= 5)
    acts.push([`${EX.highAht.length} agents above the ${mmss(c.tgtAht)} handle-time ceiling`, 'Listed individually with their call volumes below.']);
  if(EX.hold.length >= 3)
    acts.push([`${EX.hold.length} agents averaging over ${c.thHold}s on hold`, 'Worth a listen-in on hold procedure.']);
  if(EX.rona.length >= 3)
    acts.push([`${EX.rona.length} agents with calls left unanswered at their seat`, 'Time in not-responding is listed below.']);
  if(EX.breakReq.length >= 3){
    const bn = EX.breakReq.reduce((t,r) => t + r.count, 0);
    const bm = EX.breakReq.reduce((t,r) => t + r.mins, 0);
    acts.push([`${bn} break change${bn===1?'':'s'} across ${EX.breakReq.length} agents`,
      `${humanMins(bm)} of scheduled break moved during the shift.`]);
  }
  if(EX.offSched.length)
    acts.push([`${EX.offSched.length} agent${EX.offSched.length>1?'s':''} worked outside the published schedule`,
      'Adherence for them reads low because the schedule does not match what they worked.']);
  if(!acts.length) acts.push(['No target missed and no threshold crossed', 'Nothing outstanding for the operation today.']);
  const shown = acts.slice(0,6);
  S.push(sec(nextNo(), 'What needs attention', `${shown.length} item${shown.length===1?'':'s'}, ordered by how much they moved the day.`));
  S.push(band(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;border-collapse:collapse;">`
      + shown.map(([t,d],i) => { const bg = i%2 ? E.paper : E.card;
        return `<tr bgcolor="${bg}">`
        + `<td width="36" valign="top" style="width:36px;background-color:${bg};font-family:${E.ui};font-size:12px;line-height:18px;font-weight:700;color:${E.mute};padding:10px 0 10px 10px;">${i+1}</td>`
        + `<td valign="top" style="background-color:${bg};font-family:${E.ui};padding:10px 10px 10px 0;">`
        + `<div style="font-size:13px;line-height:18px;font-weight:700;color:${E.ink};">${t}</div>`
        + `<div style="font-size:12px;line-height:18px;color:${E.mute};padding-top:2px;">${d}</div></td></tr>`; }).join('')
      + `</table>`, null, 14, 0));

  /* ═══ LEADERBOARD ═══ */
  if(M.leaderboard && M.leaderboard.length){
    S.push(sec(nextNo(), 'Agent performance', 'Ranked by answered volume, with handle time and adherence alongside.'));
    S.push(band(grid([{t:'',w:36},{t:'Agent',w:296},{t:'Brand',w:136},{t:'Calls',w:110,right:true},{t:'AHT',w:128,right:true},{t:'Adherence',w:130,right:true}],
      M.leaderboard.slice(0,10).map((p,i) => [
        `<span style="font-family:${E.mono};color:${E.faint};font-size:11px;">${String(i+1).padStart(2,'0')}</span>`,
        mark(p.agent) + `<b style="color:${E.ink};">${nm(p.agent)}</b>`,
        `<span style="color:${teamCol(p.agent)};font-weight:700;">${esc(teamOf(p.agent))}</span>`,
        p.answered.toLocaleString(), mmss(p.aht),
        p.adh == null ? na : `<span style="color:${p.adh >= c.tgtAdh ? E.good : E.warn};">${p.adh.toFixed(1)}%</span>`
      ]), ''), null, 14, 0));
  }

  /* ═══ PRIORITY FOLLOW-UP ═══ */
  if(M.followUp.length){
    S.push(sec(nextNo(), 'Priority follow-up', 'Ranked by combined severity across every exception type raised today.'));
    S.push(band(grid([{t:'',w:32},{t:'Agent',w:196},{t:'Brand',w:118},{t:'Every exception raised today',w:490}],
      M.followUp.slice(0,10).map((x,i) => [
        `<span style="font-family:${E.mono};color:${E.faint};font-size:11px;">${String(i+1).padStart(2,'0')}</span>`,
        mark(x.agent) + `<b style="color:${E.ink};">${nm(x.agent)}</b>`,
        `<span style="color:${teamCol(x.agent)};font-weight:700;">${esc(teamOf(x.agent))}</span>`,
        `<span style="color:${E.ink2};">${x.reasons.map(esc).join(' &middot; ')}</span>`
      ]), ''), null, 14, 0));
  }

  /* ═══ EXCEPTION DISTRIBUTION ═══ */
  const splitTeam = listOf => {
    const o = { A:0, B:0, C:0, o:0 };
    (listOf || []).forEach(x => { const k = teamKeyOf(typeof x === 'string' ? x : (x.agent || '')); if(k) o[k]++; else o.o++; });
    o.t = o.A + o.B + o.C + o.o;
    return o;
  };
  const dist = [['Late sign-on', EX.tardy], ['No sign-on', EX.absent], ['Low adherence', EX.lowAdh],
    ['High hold', EX.hold], ['RONA', EX.rona], ['Late first call', EX.callGap],
    ['High AHT', EX.highAht], ['Short on shift', EX.shortShift], ['Break change', EX.breakReq]]
    .map(([nn,l]) => [nn, splitTeam(l)]).filter(([,v]) => v.t > 0 || !c.hideEmpty);

  if(dist.length){
    const dMax = Math.max(...dist.map(([,v]) => v.t), 1);
    const H = 78;
    const tot = key => dist.reduce((s2,[,v]) => s2 + v[key], 0);
    const bar = v => {
      const px = k => k ? Math.max(3, Math.round(k / dMax * H)) : 0;
      const seg = (k, colour) => k
        ? `<tr><td bgcolor="${colour}" height="${px(k)}" style="height:${px(k)}px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr>` : '';
      return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="40" align="center" style="width:40px;">`
        + seg(v.C, E.vC) + seg(v.B, E.vB) + seg(v.A, E.vA) + seg(v.o, E.faint) + `</table>`;
    };
    S.push(sec(nextNo(), 'Exception distribution', `${M.exCount} raised in total; bars scaled against the largest category.`));
    S.push(band(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;"><tr>`
      + dist.map(([nn,v]) => `<td valign="bottom" align="center" style="padding:0 5px;">`
        + `<div style="font-family:${E.dis};font-size:15px;font-weight:700;color:${E.ink};margin-bottom:3px;">${v.t}</div>`
        + `<div style="font-family:${E.mono};font-size:9.5px;margin-bottom:6px;white-space:nowrap;">`
        + K.map(k => `<span style="color:${BRAND[k].tx};">${v[k]}</span>`).join(`<span style="color:${E.hair};">/</span>`) + `</div>`
        + bar(v)
        + `<div style="font-family:${E.ui};font-size:10px;color:${E.mute};margin-top:7px;line-height:1.35;">${nn}</div></td>`).join('')
      + `</tr></table>`
      + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;"><tr>`
      + `<td bgcolor="${E.rule}" height="1" style="height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`
      + `<div style="padding-top:10px;font-family:${E.ui};font-size:11px;color:${E.mute};">`
      + K.map(k => swatch(BRAND[k].c) + `<b style="color:${BRAND[k].tx};">${tn(k)}</b> ${tot(k)}`).join(' &nbsp;&nbsp; ')
      + (tot('o') ? ` &nbsp;&nbsp; ` + swatch(E.faint) + `unassigned ${tot('o')}` : '')
      + `</div>`, null, 20, 0));
  }

  /* ═══ EXCEPTION DETAIL ═══ */
  const outTotal = EX.outbound.reduce((t,r) => t + r.count, 0);
  const breakTotal = EX.breakReq.reduce((t,r) => t + r.count, 0);
  /* Each category is [title, rows, empty-state text]. With "Hide sections that
   *  have nothing to report" on, a category with no rows is dropped, and the
   *  whole section only appears when something was recorded. */
  const mats = [
    [`Highest average hold &middot; over ${c.thHold}s`, EX.hold.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.bad};">${humanDur(r.secs)}</span> <span style="color:${E.faint};">${r.held}/${r.calls}</span>`]), 'None above threshold.'],
    [`Longest not responding &middot; over ${humanDur(c.thRona)}`, EX.rona.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.bad};">${humanDur(r.secs)}</span>` + (r.count ? ` <span style="color:${E.faint};">${r.count}&times;</span>` : '')]), 'None above threshold.'],
    [`Latest sign-ons &middot; over ${c.thTardy} min`, EX.tardy.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.warn};">${r.mins}m late</span>`]), 'Everyone on time.'],
    [`Late first call &middot; over ${c.thGap} min`, EX.callGap.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.warn};">${r.mins}m gap</span>`]), 'No unexplained gap.'],
    [`Adherence below ${c.tgtAdh}%`, EX.lowAdh.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.warn};">${r.adh.toFixed(1)}%</span>`]), 'All met target.'],
    [`Handle time over ${mmss(c.tgtAht)}`, EX.highAht.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.warn};">${mmss(r.aht)}</span> <span style="color:${E.faint};">${r.calls}</span>`]), 'None over ceiling.'],
    ['Most transfers out', EX.transfers.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.mute};">${r.count}</span>`]), 'None recorded.'],
    [`Outbound calls placed${outTotal ? ' &middot; ' + outTotal.toLocaleString() : ''}`, EX.outbound.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.ink2};">${r.count}</span>`]), 'No outbound calls placed.'],
    [`Calls under ${c.thShort}s`, EX.short.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.bad};">${r.count}</span>`]), 'None recorded.'],
    [`Break changes &middot; ${breakTotal} request${breakTotal===1?'':'s'}`, EX.breakReq.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.ink};">${r.count}&times;</span> <span style="color:${E.faint};">${r.mins}m</span>`]), 'No break changes requested.'],
    ['Longest single calls', EX.longest.slice(0,8).map(r => [mark(r.agent)+nm(r.agent), `<span style="color:${E.warn};">${humanDur(r.dur)}</span>`]), 'No interactions.'],
    [`Repeat callers &middot; ${c.thRepeat}+ calls`, EX.repeat.slice(0,8).map(r => [`<span style="color:${E.ink2};font-family:${E.mono};font-size:11.5px;">${esc(maskNumber(r.ani, c.mask))}</span>`, `<span style="color:${E.warn};">${r.count}&times;</span>`]), 'None above threshold.']
  ].filter(([,rows]) => rows.length || !c.hideEmpty)
   .map(([title, rows, empty]) => mini(title, rows, empty));
  const dropCount = (EX.connDropCalls || []).length;
  const noErrNote = !dropCount && M.haveErrCol === false && M.handledTotal;
  if(mats.length || dropCount || noErrNote || M.outboundOffRoster || !c.hideEmpty)
    S.push(sec(nextNo(), 'Exception detail',
      mats.length ? 'Every list capped at eight names; thresholds are set in the builder.' : null));
  if(mats.length){
    const halfW = Math.floor((W_IN - 32) / 2);
    const blank = `<td width="${halfW}" style="width:${halfW}px;">&nbsp;</td>`;
    const gap = h => `<tr><td colspan="3" style="font-size:1px;line-height:${h}px;height:${h}px;">&nbsp;</td></tr>`;
    const out = [];
    for(let i = 0; i < mats.length; i += 2){
      out.push(`<tr>${mats[i]}${GUT(32)}${mats[i+1] || blank}</tr>`);
      if(i + 2 < mats.length) out.push(gap(20));
    }
    S.push(band(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;border-collapse:collapse;">` + out.join('') + `</table>`, null, 14, 0));
  }
  {
    const drops = EX.connDropCalls || [];
    const byAgent = EX.connDrop || [];
    const hhmm = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    if(drops.length){
      const cap = 25;
      const cellS = (i, extra) => `padding:8px 10px;font-size:11.5px;background-color:${i%2 ? E.paper : E.card};${extra||''}`;
      const body = drops.slice(0, cap).map((x,i) => `<tr>`
        + `<td valign="top" style="font-family:${E.ui};color:${E.ink2};${cellS(i)}">`
          + (x.agent ? mark(x.agent) + nm(x.agent) : `<span style="color:${E.faint};">not attributed</span>`)
          + `</td>`
        + `<td valign="top" style="font-family:${E.mono};color:${E.ink};white-space:nowrap;${cellS(i)}">`
          + (x.ani ? esc(maskNumber(x.ani, c.mask)) : `<span style="color:${E.faint};">no number</span>`)
          + `</td>`
        + `<td valign="top" align="right" style="font-family:${E.mono};color:${E.mute};white-space:nowrap;${cellS(i)}">${hhmm(x.at)}</td>`
        + `<td valign="top" style="font-family:${E.ui};color:${E.bad};${cellS(i)}">${esc(x.label)}</td>`
        + `</tr>`).join('');
      const hd = (label, align) => `<td ${align ? `align="${align}"` : ''} bgcolor="${E.frame}" style="background-color:${E.frame};font-family:${E.ui};font-size:11px;line-height:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#ffffff;padding:9px 10px;white-space:nowrap;">${label}</td>`;
      S.push(band(eyebrow('Calls dropped at the agent endpoint', E.ink, 11)
        + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;margin-top:10px;border-collapse:collapse;">`
        + `<tr>${hd('Agent')}${hd('Number on the call')}${hd('Time','right')}${hd('Fault')}</tr>`
        + body + `</table>`
        + (drops.length > cap ? `<div style="font-family:${E.ui};font-size:11px;color:${E.faint};margin-top:10px;">Showing the first ${cap} by time. The full list of ${drops.length} is in the exceptions CSV.</div>` : '')
        + (byAgent.length > 1 ? `<div style="font-family:${E.ui};font-size:11.5px;color:${E.mute};margin-top:12px;line-height:1.7;">By agent: `
            + byAgent.slice(0,10).map(r => `${r.agent ? nm(r.agent) : 'not attributed'} <span style="color:${E.bad};">${r.count}&times;</span>`).join(' &nbsp;&middot;&nbsp; ')
            + `</div>` : ''),
        null, 24, 0));
    } else if(M.haveErrCol === false && M.handledTotal){
      S.push(band(note(`The interactions export has no Error Code column, so endpoint connection drops could not be checked for this date.`), null, 18, 0));
    }
  }
  if(M.outboundOffRoster)
    S.push(band(note(`A further ${M.outboundOffRoster.toLocaleString()} outbound calls were placed by agents with no published schedule for this date. They are not counted here or anywhere else in this report.`), null, 18, 0));

  /* ═══ BASIS OF MEASUREMENT ═══ */
  if(c.method){
    S.push(sec(nextNo(), 'Basis of measurement', null));
    S.push(band(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_IN}" style="width:${W_IN}px;border-collapse:collapse;">`
      + [['Scope','inbound calls only. Outbound and telesales dialling are excluded, and so are email and message contacts'],
         ['Brand split','calls attributed to ' + brandWords + ' by entry queue, falling back to the handling agent where a call never touched a queue'],
         ['Outbound','listed by agent for visibility only, and excluded from service level, volume, handle time and every other measure above'],
         ['Service level','answered inside the target wait, per the queue export. Combined figures are weighted by volume, not averaged across queues'],
         ['Adherence','time in the scheduled state, weighted by scheduled minutes across agents who worked'],
         ['Occupancy','handle time against time signed on, across agents who worked'],
         ['No sign-on','no login, no handling time and no queue activity for a scheduled agent'],
         ['Late sign-on','first login more than '+c.thTardy+' minutes after the scheduled shift start; recorded tardy codes are shown separately'],
         ['Short of shift','time signed on at least '+c.thEarly+' minutes under scheduled paid time'],
         ['Break change','a scheduled break moved during the shift, taken from the Update Break Time activity'],
         ['Connection drops','calls the interactions export marks with a DTLS peer disconnect or ICE idle fault. Both mean the call ended at the agent workstation rather than on the network, and both can be caused by a poor connection, so the number on the call is listed for review'],
         ['Who appears','only agents with a published schedule row for this date. Anyone not scheduled is excluded from every figure and every list'],
         ['Shift reference','the published schedule where available, otherwise the nearest configured shift to first login']
        ].map(([t,d],i) => { const bg = i%2 ? E.paper : E.card;
          return `<tr><td width="170" valign="top" style="width:170px;background-color:${bg};font-family:${E.ui};font-size:11.5px;font-weight:700;color:${E.ink};padding:9px 12px 9px 10px;">${t}</td>`
          + `<td valign="top" style="background-color:${bg};font-family:${E.ui};font-size:11.5px;color:${E.mute};padding:9px 10px 9px 0;line-height:1.7;">${d}</td></tr>`; }).join('')
      + `</table>`
      + `<div style="font-family:${E.ui};font-size:11px;color:${E.faint};line-height:1.75;margin-top:14px;">`
      + `Targets applied: service level ${c.tgtSL}%, abandon ceiling ${c.tgtAbn}%, adherence ${c.tgtAdh}%, handle time ceiling ${mmss(c.tgtAht)}. `
      + `Thresholds applied: tardy after ${c.thTardy}m, absent after ${c.thAbsent}m, first-call gap ${c.thGap}m, high hold ${c.thHold}s, RONA ${c.thRona}s, short call ${c.thShort}s, shift shortfall ${c.thEarly}m, repeat caller ${c.thRepeat}+, minimum ${c.thMinCalls} calls for AHT ranking. `
      + `Sources: ${M.totalRows.toLocaleString()} rows across the Genesys queue, agent performance, agent status, adherence and schedule exports.`
      + `</div>`, null, 14, 0));
  }

  /* ═══ FOOTER — the Member Care sign-off, Beyond One logo on the right ═══ */
  const issued = new Date();
  const issuedTxt = issued.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
    + ' at ' + issued.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const bo = (typeof window !== 'undefined' && window.LOGOS && window.LOGOS.beyondone) || '';
  S.push(`<tr><td class="pad" style="padding:28px ${PAD}px 0 ${PAD}px;">` + tbl(
      `<tr><td style="border-top:2px solid ${E.frame};font-size:0;line-height:0;">&nbsp;</td></tr>`
    + `<tr><td style="font-family:${E.ui};font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:${E.ink};padding:12px 0 0 0;">Thanks.</td></tr>`) + `</td></tr>`);
  S.push(`<tr><td class="pad" style="padding:20px ${PAD}px 26px ${PAD}px;">` + tbl(
      `<tr><td style="padding:0;">` + tbl(`<tr><td valign="bottom" style="padding:0;">` + tbl(
          `<tr><td style="font-family:${E.ui};font-size:14px;line-height:20px;color:${E.ink};font-weight:700;padding-bottom:4px;">${esc(c.sigName)}${WM.cur}</td></tr>`
        + `<tr><td style="font-family:${E.ui};font-size:11px;line-height:15px;color:${E.mute};font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding-bottom:5px;">Workforce Management Department</td></tr>`
        + `<tr><td style="font-family:${E.ui};font-size:11px;line-height:17px;color:${E.mute};">`
        + (c.sigEmail ? `${esc(c.sigEmail)} &nbsp;&middot;&nbsp; ` : '') + `Report generated on ${esc(issuedTxt)}.</td></tr>`)
      + `</td>`
      + (bo ? `<td width="226" align="right" valign="bottom" style="width:226px;padding:0 0 1px 20px;white-space:nowrap;"><img src="${bo}" width="206" height="58" alt="Beyond One" style="display:block;width:206px;height:58px;border:0;outline:none;text-decoration:none;"></td>` : '')
      + `</tr>`) + `</td></tr>`
    + `<tr><td style="padding-top:10px;">` + tbl(
        `<tr><td style="border-top:2px solid ${E.frame};font-size:0;line-height:0;">&nbsp;</td></tr>`
      + `<tr><td style="font-family:${E.ui};font-size:10px;line-height:15px;color:${E.ink};font-weight:700;letter-spacing:1.2px;text-transform:uppercase;padding:9px 0 3px 0;">Confidential</td></tr>`
      + `<tr><td style="font-family:${E.ui};font-size:10px;line-height:15px;color:${E.mute};">This report is confidential and intended solely for the named recipients. Do not forward, copy or distribute outside Beyond One. If you received it in error, please delete it and notify the sender.</td></tr>`)
    + `</td></tr>`) + `</td></tr>`);

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${E.shell}" style="width:100%;background-color:${E.shell};">`
    + `<tr><td align="center" style="padding:20px 10px;">`
    + `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${W_OUT}" class="wrap" style="width:${W_OUT}px;max-width:${W_OUT}px;background-color:#ffffff;border:2px solid ${E.frame};border-collapse:collapse;">`
    + S.join('') + `</table></td></tr></table>` + WM.hidden();
}

function plainSummary(M){
  const c = M.cfg, q = M.overall, D = M.dept, o = [];
  const EX = Object.assign({ absent:[], tardy:[], shortShift:[], lowAdh:[], connDropCalls:[] }, M.ex || {});
  const FU = M.followUp || [];
  const pad = (l,v) => o.push(l.padEnd(24) + v);
  o.push('DAILY WORKFORCE PERFORMANCE REVIEW');
  o.push(M.displayDate);
  o.push('');
  o.push('SERVICE');
  if(q.have){
    pad('  Service level', q.sl.toFixed(1) + '%  (target ' + c.tgtSL + '%)');
    pad('  Offered / answered', q.offered.toLocaleString() + ' / ' + q.answered.toLocaleString());
    pad('  Abandoned', q.abandoned.toLocaleString() + '  (' + q.abnRate.toFixed(1) + '%)');
    pad('  ASA / AHT', clockFmt(q.asa) + ' / ' + clockFmt(q.aht));
    TEAM_KEYS.forEach(k => { const qd = M.q[k]; if(qd) pad('  ' + teamName(c, k), qd.sl.toFixed(1) + '% SL on ' + qd.offered.toLocaleString() + ' offered'); });
    if(M.worstQueue) pad('  Weakest queue', M.worstQueue.name + '  ' + M.worstQueue.sl.toFixed(1) + '%');
  }else o.push('  Queue export not loaded.');
  o.push('');
  o.push('CAPACITY');
  pad('  On shift', (D.worked||0) + ' of ' + (D.scheduled||0));
  if(D.adherence != null) pad('  Adherence', D.adherence.toFixed(1) + '%  (target ' + c.tgtAdh + '%)');
  if(D.onQueueDelivery != null) pad('  On-queue delivery', D.onQueueDelivery.toFixed(1) + '%');
  if(D.occupancy != null) pad('  Occupancy', D.occupancy.toFixed(1) + '%');
  o.push('');
  o.push('EXCEPTIONS');
  pad('  No sign-on', String(EX.absent.length));
  pad('  Late sign-on', String(EX.tardy.length));
  pad('  Short of shift', String(EX.shortShift.length));
  pad('  Below adherence', String(EX.lowAdh.length));
  if((EX.connDropCalls || []).length){
    o.push('');
    o.push('CALLS DROPPED AT THE AGENT ENDPOINT');
    EX.connDropCalls.slice(0,15).forEach(x => o.push('  ' + (x.agent ? shortName(x.agent, c.shortNames) : 'not attributed')
      + ' — ' + (x.ani ? maskNumber(x.ani, c.mask) : 'no number')
      + ' at ' + String(x.at.getHours()).padStart(2,'0') + ':' + String(x.at.getMinutes()).padStart(2,'0')
      + ' — ' + x.label));
    if(EX.connDropCalls.length > 15) o.push('  ... and ' + (EX.connDropCalls.length - 15) + ' more, see the CSV.');
  }
  if(FU.length){
    o.push('');
    o.push('FOR TEAM-LEADER FOLLOW-UP');
    FU.slice(0,5).forEach((x,i) => o.push('  ' + (i+1) + '. ' + shortName(x.agent, c.shortNames) + ' — ' + x.reasons.join('; ')));
  }
  o.push('');
  o.push(c.sigName + (c.sigEmail ? ' · ' + c.sigEmail : '') + ' · Workforce Management' + WM.sig(WM.name + '|' + (c.date || '')));
  return o.join('\n');
}

/* ══ 7 · CHECKS ══ */
function runChecks(M){
  const cfg = readConfig();
  const out = [];
  const add = (tone, title, detail) => out.push({ tone, title, detail });

  const missing = SLOTS.filter(s => s.req && !state.files[s.key]);
  if(missing.length) add('bad', 'Required exports missing', missing.map(s => s.label(cfg)).join(', ') + '. The report cannot be built without these.');
  else add('ok', 'All required exports loaded', 'Performance, status, interactions and the adherence files are in place.');

  if(!state.files.adhC)
    add('warn', 'No ' + cfg.teamC + ' adherence export', cfg.teamC + ' agents are not on the roster, so its attendance and adherence stay blank. Its queue figures still show if the calls export is loaded.');
  const noQ = TEAM_KEYS.filter(k => !state.files['queue' + k]);
  if(noQ.length === 3)
    add('warn', 'No queue export', 'Drop the day\'s Genesys calls exports (the same ones the brand reports use). Until then service level, abandon rate and presented volume show as "n/a" rather than as zero.');
  else if(noQ.length)
    add('warn', 'No calls export for ' + noQ.map(k => teamName(cfg, k)).join(' and '), 'That brand shows "n/a" for service level and volume.');
  if(!state.files.schedule)
    add('bad', 'No schedule export — the report cannot be filtered',
      'Only agents with a schedule row are meant to appear. Without it the report falls back to everyone in the adherence exports, and shift starts are inferred from first login.');
  if(state.unmatched.length){
    const n = state.unmatched.length;
    const clashed = state.unmatched.filter(t => t.clashedWith);
    add('warn', n + (n === 1 ? ' file' : ' files') + ' not assigned',
      clashed.length
        ? clashed.length + (clashed.length === 1 ? ' of them wanted a slot that was already filled — nothing was overwritten, but pick a slot or discard it below.' : ' of them wanted slots that were already filled — nothing was overwritten, but pick slots or discard them below.')
        : 'Pick a slot below, or discard it.');
  }
  // An adherence export names its brand in the file name or the management-unit
  // column; when neither does, the pairing is load order. Say so out loud.
  const adh = TEAM_KEYS.filter(k => state.files['adh' + k]);
  if(adh.length){
    const how = k => state.files['adh' + k]._brandHow || 'file name';
    const byOrder = adh.filter(k => how(k) === 'order');
    const said = adh.map(k => teamName(cfg, k) + ' ← ' + state.files['adh' + k].fileName + ' (' + ({ agents:'matched by its agents', hand:'set by hand' }[how(k)] || 'by its ' + how(k)) + ')').join('; ');
    if(byOrder.length)
      add('warn', 'Adherence brand' + (byOrder.length > 1 ? 's' : '') + ' assigned by load order',
        said + '. Neither the file name nor a management-unit column says the brand — use the Move buttons below if a file sits under the wrong brand.');
    else add('ok', 'Adherence files matched to their brands', said + '.');
  }
  if(!cfg.date) add('bad', 'No review date selected', 'Pick the date the data covers.');

  if(M){
    if(!M.roster.length) add('bad', 'Roster is empty', 'No agent names were read from the adherence exports, so nothing can be attributed.');
    else add('ok', M.roster.length + ' agents on the roster', TEAM_KEYS.map(k => M.teams[k].name + ' ' + M.teams[k].roster).join(' · ') + ', taken from the adherence exports.');

    if(state.files.interactions && M.handledTotal === 0)
      add('bad', 'No interactions inside the window', `The interactions file has rows but none fall between ${M.winStart.toLocaleString('en-GB')} and ${M.winEnd.toLocaleString('en-GB')}. Check the review date and the day-start setting.`);
    else if(M.handledTotal)
      add('ok', M.handledTotal.toLocaleString() + ' interactions in the window', M.outsideWindow ? M.outsideWindow.toLocaleString() + ' rows fell outside it and were ignored.' : 'Every voice row fell inside the window.');

    if(M.outboundSkipped || M.nonVoiceSkipped){
      const bits = [];
      if(M.outboundSkipped) bits.push(M.outboundSkipped.toLocaleString() + ' outbound');
      if(M.nonVoiceSkipped) bits.push(M.nonVoiceSkipped.toLocaleString() + ' email and message');
      add('ok', 'Report scoped to inbound calls',
        bits.join(' and ') + ' interactions were excluded. Queued call-backs are recorded as outbound in Genesys, so they are left out as well.');
    }
    if(M.unattributed)
      add('warn', M.unattributed.toLocaleString() + ' calls not attributable to a brand',
        'They arrived on a queue matching none of the brand names (' + TEAM_KEYS.map(k => teamName(cfg, k)).join(', ') + ') or were handled by someone outside the roster. They are in the totals but in no brand\'s busiest hour.');
    if(M.queueNoDay.length)
      add('warn', 'No calls export for ' + M.queueNoDay.map(k => teamName(cfg, k)).join(' and ') + ' on ' + cfg.date,
        'The calls export loaded for ' + (M.queueNoDay.length > 1 ? 'those brands covers' : 'that brand covers') + ' other days only. Drop that day\'s export to fill service level and volume.');
    if(M.restrictToSchedule)
      add('ok', 'Roster taken from the published schedule',
        M.roster.length + ' agents have a schedule row inside the window and appear in the report.'
        + (M.notScheduled ? ' ' + M.notScheduled + ' agents in the adherence exports are not scheduled for this date and are excluded entirely.' : ''));
    else if(state.files.schedule)
      add('bad', 'Schedule export has no rows for this date',
        'Nobody matched the window, so the report fell back to the adherence roster. Check the review date and the day-start setting.');
    if(M.outboundOffRoster)
      add('ok', M.outboundOffRoster.toLocaleString() + ' outbound calls placed by unscheduled agents',
        'Those agents are not on the published schedule, so neither they nor their calls appear anywhere in the report.');
    if(state.files.interactions && M.haveErrCol === false)
      add('warn', 'No Error Code column in the interactions export',
        'Endpoint connection drops cannot be checked. Add the Error Code column to the interactions view in Genesys if you want that list.');
    else if(M.ex && M.ex.connDrop && M.ex.connDrop.length)
      add('warn', M.ex.connDropCalls.length + ' call' + (M.ex.connDropCalls.length === 1 ? '' : 's') + ' dropped at the agent endpoint',
        'Across ' + M.ex.connDrop.length + ' agent' + (M.ex.connDrop.length === 1 ? '' : 's') + '. A weak connection raises the same fault code, so check the pattern before drawing a conclusion.');
    if(M.unparsedDates > 0)
      add('warn', M.unparsedDates.toLocaleString() + ' timestamps could not be read', 'Those rows were skipped. If the count is large, set the date order by hand under Brands, shifts and targets.');
    if(M.queueDropped > 0)
      add('ok', M.queueDropped.toLocaleString() + ' queue rows outside the review day were excluded',
        'The calls exports cover more than one day. Only intervals touching ' + (cfg.date||'the review date') + ' were counted towards service level and volume.');
    if(M.statusShape === 'timeline')
      add('ok', 'Agent status read from the timeline export',
        M.statusRowsUsed.toLocaleString() + ' status segments were clipped to the review window and totalled. Time signed on excludes Offline; RONA is taken from Not Responding segments.');

    if(cfg.dateOrder === 'auto'){
      const o = M.orders.interactions;
      add('ok', 'Date order detected as ' + (o === 'dmy' ? 'day/month' : o === 'ymd' ? 'year/month/day' : 'month/day'),
        'Change it under Brands, shifts and targets if the shift times look shifted by a day.');
    }

    if(M.ex.shortShift.length)
      add('warn', M.ex.shortShift.length + ' agents signed on for less than their scheduled hours',
        'Measured on total time signed on. The status export reports only the first sign-off of the day, so sign-off time itself is not used.');
    if(M.noShiftRef.length)
      add('warn', M.noShiftRef.length + ' agents have no shift reference', 'They were not judged for lateness. Loading the schedule export fixes this.');

    if(TEAM_KEYS.some(k => M.q[k] && M.q[k].ambiguous))
      add('warn', 'Service level printed two ways in one queue export', 'Some rows are fractions (0.85) and some already scaled (85.4). Values at or below 1.5 were read as fractions, so a genuine 0–1.5% queue would show as 0–150%. Check the queue export if a figure looks wrong.');
    if(M.fileTarget && Math.abs(M.fileTarget - cfg.tgtSL) > 0.5)
      add('warn', 'Queue export declares a ' + M.fileTarget.toFixed(0) + '% service level target',
        'Your setting says ' + cfg.tgtSL + '%. The report uses your setting — change it under Brands, shifts and targets if the export is right.');
    if(TEAM_KEYS.some(k => M.q[k] && M.q[k].noVolume))
      add('warn', 'Queue export has no volume column', 'Service level is shown as a plain average across queues, and presented, answered and abandoned counts are not reported.');
    if(TEAM_KEYS.some(k => M.q[k] && M.q[k].derived))
      add('warn', 'No total row in a queue export', 'Totals were summed across the individual queues instead, with service level weighted by offered volume.');

    if(!TEAM_KEYS.some(k => M.teams[k].scheduled)) add('warn', 'No scheduled minutes found', 'Attendance and coverage will be blank. Check that the adherence export includes scheduled minutes.');

    if(M.exCount === 0 && M.roster.length)
      add('ok', 'No exceptions raised', 'Every agent stayed inside every threshold today.');
  }else if(isReady()){
    add('warn', 'Report not built yet', 'Build it and the row-level checks appear here.');
  }

  state.checks = out;
  state.checkSummary = { bad: out.filter(c => c.tone === 'bad').length, warn: out.filter(c => c.tone === 'warn').length };
  return out;
}

const isReady = () => SLOTS.filter(s => s.req).every(s => state.files[s.key]) && !!state.date;

/* ══ 8 · BUILD ══ */
function build(){
  const cfg = readConfig();
  if(!cfg.date) throw new Error('pick a review date first');
  const t0 = performance.now();
  const M = buildModel(cfg);
  const html = renderReport(M);
  if(!WM.check(html)) throw new Error('the author watermark is missing from the output, so the report was not built.');
  state.model = M; state.html = html; state.dirty = false;
  // Keep the agent → brand map so the adherence files can be paired by agent next time.
  try{
    const tm = {};
    M.agents.forEach((a, name) => { if(a.team) tm[name.toLowerCase()] = a.team; });
    if(Object.keys(tm).length >= 10) localStorage.setItem('wfm.agentTeams.v1', JSON.stringify(tm));
  }catch(e){}
  state.buildNote = `Built in ${Math.round(performance.now() - t0)} ms from ${M.totalRows.toLocaleString()} rows.`;
  runChecks(M);
  return M;
}

/* ══ 9 · OUTPUT: HTML, CLIPBOARD, OUTLOOK DRAFT, POSTER ══ */
const MEDIA_CSS = `
<style type="text/css">
  body{margin:0;padding:0;background:#ffffff;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  table{border-collapse:collapse;}
  @media only screen and (max-width:920px){
    .wrap{width:100% !important;}
    .stack{display:block !important;width:100% !important;margin-bottom:12px !important;}
    .pad{padding-left:14px !important;padding-right:14px !important;}
    .kpi{display:block !important;width:100% !important;border-left:0 !important;border-top:1px solid #e3e3e3 !important;}
  }
</style>
<!--[if mso]><style type="text/css">td,div,span{mso-line-height-rule:exactly;}</style><![endif]-->`;

function fullDocument(){
  return `<!DOCTYPE html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Daily WFM &amp; Performance Review</title>
<meta name="author" content="Dia'a Banjar">
<meta name="copyright" content="© 2026 Dia'a Banjar. All rights reserved.">
<!-- Data extraction, design and build by Dia'a Banjar, Workforce Management, Beyond One. (c) 2026 Dia'a Banjar. All rights reserved. -->${MEDIA_CSS}</head>
<body style="margin:0;padding:0;background-color:#ffffff;">${state.html}</body></html>`;
}
function subject(){
  const d = (state.date || '').split('-').reverse().join('/');
  return 'Daily WFM & Performance Review for ' + d;
}

async function copyForOutlook(){
  if(!state.html) return;
  const html = MEDIA_CSS + state.html;
  const tmp = document.createElement('div'); tmp.innerHTML = state.html;
  const text = tmp.innerText || tmp.textContent || '';
  try{
    if(navigator.clipboard && window.ClipboardItem){
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type:'text/html' }),
        'text/plain': new Blob([text], { type:'text/plain' })
      })]);
      toast('Copied. In Outlook press Ctrl+V, then choose Keep Source Formatting. For an exact copy use Open in Outlook (.eml).');
      return;
    }
  }catch(e){ /* fall through to the legacy path */ }
  const listener = ev => {
    ev.preventDefault();
    ev.clipboardData.setData('text/html', html);
    ev.clipboardData.setData('text/plain', text);
  };
  document.addEventListener('copy', listener);
  const ok = document.execCommand('copy');
  document.removeEventListener('copy', listener);
  toast(ok ? 'Copied. Paste into Outlook with Ctrl+V.' : 'Copy blocked by the browser — use Open in Outlook (.eml) instead.');
}

function b64(bytes){
  let bin = '';
  for(let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{76}/g, '$&\r\n');
}
/* ══ POSTER ═══════════════════════════════════════════════════════════
   Outlook's Word engine rewrites fonts, sizes and colours, so the poster
   sidesteps it: the built email is drawn to PNG exactly as the preview
   shows it, at twice the pixel density so text stays sharp, then cut into
   strips well under Outlook's 1,728px image-height limit. Each cut is
   nudged to the calmest row nearby so no seam runs through text, and the
   strips are stacked with no gaps. Every strip carries the author's name
   inside the PNG file itself. */
const POSTER_W = W_OUT + 40, POSTER_SCALE = 2, POSTER_SLICE = 780;

async function posterCanvas(){
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = `position:fixed;left:-30000px;top:0;width:${POSTER_W}px;height:200px;border:0;visibility:hidden;`;
  document.body.appendChild(fr);
  try{
    const d = fr.contentDocument;
    d.open();
    d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:${E.shell};">`
      + `<div id="p" style="width:${POSTER_W}px;margin:0;padding:0;background:${E.shell};"><style>table{border-collapse:collapse;}img{border:0;}</style>${state.html}</div></body></html>`);
    d.close();
    await Promise.all([...d.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    const el = d.getElementById('p');
    const H = Math.ceil(el.getBoundingClientRect().height);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_W}" height="${H}"><foreignObject x="0" y="0" width="${POSTER_W}" height="${H}">`
      + new XMLSerializer().serializeToString(el) + `</foreignObject></svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = POSTER_W * POSTER_SCALE; cv.height = H * POSTER_SCALE;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = E.shell; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { cv, H };
  }finally{ fr.remove(); }
}

/** Cut points in CSS pixels. Each strip is at most POSTER_SLICE tall; the
 *  cut moves up to the row with the fewest colour changes across it. */
function posterCuts(cv, H){
  const Sc = POSTER_SCALE, ctx = cv.getContext('2d'), cuts = [0];
  while(H - cuts[cuts.length - 1] > POSTER_SLICE){
    const last = cuts[cuts.length - 1], target = last + POSTER_SLICE;
    const from = Math.max(last + 300, target - 180);
    const rows = ctx.getImageData(0, from * Sc, cv.width, (target - from) * Sc).data;
    let best = target, bestScore = Infinity;
    for(let y = (target - from - 1) * Sc; y >= 0; y -= Sc){
      let changes = 0; const o = y * cv.width * 4;
      for(let x = 2; x < cv.width; x += 2){
        const a = o + x * 4, b = a - 8;
        if(Math.abs(rows[a] - rows[b]) + Math.abs(rows[a+1] - rows[b+1]) + Math.abs(rows[a+2] - rows[b+2]) > 24) changes++;
      }
      if(changes < bestScore){ bestScore = changes; best = from + y / Sc; }
    }
    cuts.push(best);
  }
  cuts.push(H);
  return cuts;
}

const CRC_T = (() => { const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
/** Write the author's name into the PNG itself as text chunks after IHDR. */
function pngTag(png, date){
  const pairs = [['Author', WM.name], ['Copyright', '© 2026 ' + WM.name + '. All rights reserved.'],
    ['Software', 'WFM Daily Email Builder by ' + WM.name], ['Comment', WM.name + '|' + (date || '')]];
  const chunks = pairs.map(([k, v]) => {
    const body = Uint8Array.from(Array.from('tEXt' + k + '\0' + v, ch => ch.charCodeAt(0) & 255));
    const chunk = new Uint8Array(body.length + 8), dv = new DataView(chunk.buffer);
    dv.setUint32(0, body.length - 4); chunk.set(body, 4); dv.setUint32(4 + body.length, crc32(body));
    return chunk;
  });
  const out = new Uint8Array(png.length + chunks.reduce((t, c) => t + c.length, 0));
  out.set(png.subarray(0, 33), 0);
  let o = 33; chunks.forEach(c => { out.set(c, o); o += c.length; });
  out.set(png.subarray(33), o);
  return out;
}
/** Read the text chunks back out of a PNG. */
function pngText(bytes){
  const out = {}, dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for(let o = 8; o + 8 <= bytes.length;){
    const len = dv.getUint32(o), type = String.fromCharCode(...bytes.subarray(o + 4, o + 8));
    if(type === 'tEXt'){ let str = ''; bytes.subarray(o + 8, o + 8 + len).forEach(b => str += String.fromCharCode(b));
      const z = str.indexOf('\0'); out[str.slice(0, z)] = str.slice(z + 1); }
    if(type === 'IEND') break;
    o += 12 + len;
  }
  return out;
}

async function posterSlices(){
  const date = state.date;
  const { cv, H } = await posterCanvas();
  const cuts = posterCuts(cv, H), Sc = POSTER_SCALE, out = [];
  for(let k = 0; k < cuts.length - 1; k++){
    const h = cuts[k + 1] - cuts[k];
    const sc = document.createElement('canvas');
    sc.width = cv.width; sc.height = Math.round(h * Sc);
    sc.getContext('2d').drawImage(cv, 0, cuts[k] * Sc, cv.width, h * Sc, 0, 0, cv.width, h * Sc);
    const blob = await new Promise(r => sc.toBlob(r, 'image/png'));
    out.push({ bytes: pngTag(new Uint8Array(await blob.arrayBuffer()), date), w: POSTER_W, h: Math.round(h) });
  }
  return out;
}

/** One-line summary used as the first poster image's alt text. */
function posterPreheader(){
  const M = state.model; if(!M) return '';
  const c = M.cfg, q = M.overall || {}, D = M.dept || {};
  const d = (() => { const [y, m, dd] = String(c.date || '').split('-').map(Number);
    return y ? dd + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[m - 1] : ''; })();
  const bits = [];
  if(q.have) bits.push(q.offered.toLocaleString() + ' calls offered', q.ansRate.toFixed(0) + '% answered', q.sl.toFixed(1) + '% service level');
  if(D.adherence != null) bits.push(D.adherence.toFixed(1) + '% adherence');
  if(D.scheduled) bits.push(D.worked + ' of ' + D.scheduled + ' agents worked');
  return (d ? d + ': ' : '') + bits.join(', ') + '.';
}

function posterDocument(slices, srcOf){
  const pre = posterPreheader();
  const n = slices.length;
  const rows = slices.map((sl, i) => `<tr><td style="padding:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">`
    + `<img src="${srcOf(i)}" width="${sl.w}" height="${sl.h}" alt="${i ? `Daily WFM &amp; Performance Review, part ${i + 1} of ${n}` : `Daily WFM &amp; Performance Review. ${esc(pre)}${WM.sig(WM.name + '|' + (state.date || ''))}`}" `
    + `style="display:block;width:${sl.w}px;height:${sl.h}px;border:0;outline:none;text-decoration:none;"></td></tr>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily WFM &amp; Performance Review</title>
<meta name="author" content="${WM.html}">
<meta name="copyright" content="© 2026 ${WM.html}. All rights reserved.">
<!--[if mso]><style>table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${E.shell};">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${E.shell}" style="width:100%;background-color:${E.shell};border-collapse:collapse;"><tr><td align="center" style="padding:0;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${POSTER_W}" style="width:${POSTER_W}px;border-collapse:collapse;">${rows}</table>
</td></tr></table>
</body></html>`;
}

/** Outlook draft (.eml): X-Unsent so Outlook opens it as a new message ready
 *  to send, the HTML body base64-encoded, and every image carried as an inline
 *  CID part — the poster strips, or the Beyond One logo in the HTML email. */
async function buildEml(){
  const c = readConfig();
  const Bd = '----=_WFM_Related_0001';
  const parts = [];
  let html;
  if(c.poster){
    const slices = await posterSlices();
    html = posterDocument(slices, i => `cid:wfmposter${i + 1}`);
    slices.forEach((sl, i) => parts.push(`--${Bd}\r\nContent-Type: image/png; name="wfm-review-${i + 1}.png"\r\nContent-Transfer-Encoding: base64\r\n`
      + `Content-ID: <wfmposter${i + 1}>\r\nContent-Disposition: inline; filename="wfm-review-${i + 1}.png"\r\n\r\n` + b64(sl.bytes) + '\r\n'));
  }else{
    html = fullDocument();
    const seen = {}; let n = 0;
    html = html.replace(/src="data:(image\/(png|jpe?g|gif));base64,([^"]+)"/gi, (whole, mime, ext, data) => {
      const clean = data.replace(/\s+/g, '');
      if(!seen[clean]){
        n++; const id = 'wfmimg' + n, e2 = /^jpe?g$/i.test(ext) ? 'jpg' : ext.toLowerCase();
        seen[clean] = id;
        parts.push(`--${Bd}\r\nContent-Type: ${mime.toLowerCase()}; name="${id}.${e2}"\r\nContent-Transfer-Encoding: base64\r\n`
          + `Content-ID: <${id}>\r\nContent-Disposition: inline; filename="${id}.${e2}"\r\n\r\n`
          + clean.replace(/.{76}/g, '$&\r\n') + '\r\n');
      }
      return `src="cid:${seen[clean]}"`;
    });
  }
  const to = (c.sendTo || []).join(',\r\n ');
  const head = `X-Unsent: 1\r\nSubject: ${subject()}\r\nTo: ${to}\r\nCc: \r\nMIME-Version: 1.0\r\n`
    + `Content-Type: multipart/related; type="text/html"; boundary="${Bd}"\r\n\r\nThis is a multi-part message in MIME format.\r\n\r\n`;
  const body = `--${Bd}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n`
    + b64(new TextEncoder().encode(html)) + '\r\n';
  return head + body + parts.join('') + `--${Bd}--\r\n`;
}

function download(name, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exceptionsCsv(){
  const M = state.model;
  if(!M) return '';
  const c = M.cfg;
  const EX = Object.assign({ tardy:[], excused:[], shortShift:[], absent:[], leave:[], lowAdh:[],
    onQShort:[], callGap:[], rona:[], hold:[], highAht:[], short:[], offSched:[], connDropCalls:[] }, M.ex || {});
  const team = a => { const r = M.agents.get(a); return r && r.team ? teamName(c, r.team) : ''; };
  const rows = [["WFM Daily Review Builder — built by Dia'a Banjar, Workforce Management, Beyond One. © 2026 Dia'a Banjar. All rights reserved.",'','','','',''],
                ['Date','Agent','Brand','Exception','Value','Detail']];
  const push = (agent, type, value, detail) => rows.push([c.date, agent, team(agent), type, value, detail||'']);

  EX.tardy.forEach(r => push(r.agent, 'Late sign-on', r.mins, 'minutes after scheduled start'));
  EX.excused.forEach(r => push(r.agent, 'Excused late', r.mins, r.code));
  EX.shortShift.forEach(r => push(r.agent, 'Short on shift', r.mins, r.logged + ' of ' + r.sched + ' scheduled minutes signed on'));
  EX.absent.forEach(a => push(a, 'No sign-on recorded', '', 'confirm with team leader'));
  EX.leave.forEach(r => push(r.agent, 'Approved leave', '', r.type));
  EX.lowAdh.forEach(r => push(r.agent, 'Below adherence target', r.adh.toFixed(1), r.exc + ' exceptions, ' + Math.round(r.mins) + ' min out of state'));
  EX.onQShort.forEach(r => push(r.agent, 'On-queue shortfall', r.gap, r.actual + ' of ' + r.sched + ' scheduled minutes'));
  EX.callGap.forEach(r => push(r.agent, 'Slow start to first call', r.mins, 'minutes into shift'));
  EX.rona.forEach(r => push(r.agent, 'No-answer alerts', r.count || '', r.secs ? r.secs + ' seconds not responding' : ''));
  EX.hold.forEach(r => push(r.agent, 'High hold per call', r.secs, r.held + ' of ' + r.calls + ' calls held, ' + clockFmt(r.perHeld) + ' per held call'));
  EX.highAht.forEach(r => push(r.agent, 'Above AHT ceiling', clockFmt(r.aht), r.calls + ' calls'));
  EX.short.forEach(r => push(r.agent, 'Short calls', r.count, 'under ' + c.thShort + 's'));
  EX.offSched.forEach(r => push(r.agent, 'Worked outside schedule', r.mins, 'minutes signed on'));
  EX.connDropCalls.forEach(x => push(x.agent || '(not attributed)', 'Call dropped at agent endpoint',
    x.ani ? maskNumber(x.ani, c.mask) : '',
    x.label + ' at ' + String(x.at.getHours()).padStart(2,'0') + ':' + String(x.at.getMinutes()).padStart(2,'0')
      + (x.queue ? ' on ' + x.queue : '') + (x.outbound ? ' (outbound)' : '')));

  const qq = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  return { csv: '﻿' + rows.map(r => r.map(qq).join(',')).join('\r\n'), count: rows.length - 2 };
}

/* ══ 10 · THE TAB ══
   The builder hands the panel element and a few hooks; everything else lives here. */
let H = {};
const toast = (m) => { if(H.toast) H.toast(m); };
let host = null, previewTimer = null;

function fieldHtml(label, key, opts){
  opts = opts || {};
  const v = SET[key] == null ? '' : SET[key];
  const inp = opts.select
    ? `<select data-set="${key}">${opts.select.map(([val, t]) => `<option value="${val}"${String(v) === val ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`
    : `<input type="${opts.type || 'text'}" data-set="${key}" value="${esc(v)}"${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ''}${opts.attrs || ''}>`;
  return `<label class="fld"><span>${label}</span>${inp}</label>`;
}
function toggleHtml(label, key){
  return `<label class="chk wfm-tg"><input type="checkbox" data-set="${key}"${SET[key] ? ' checked' : ''}> ${label}</label>`;
}

function panelHtml(){
  const days = state.periodDays || [];
  const dayChips = days.length > 1
    ? `<div class="wfm-days">` + days.map(d => {
        const dt = new Date(d + 'T12:00:00');
        const lab = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()] + ' ' + dt.getDate();
        return `<button type="button" class="wfm-day${d === state.date ? ' on' : ''}" data-day="${d}">${lab}</button>`;
      }).join('') + `</div>`
    : '';
  const num = { type:'number' };
  return `<div id="wfmChecks"></div>`
    + `<div class="editor">`
      + `<div class="row2">`
        + `<label class="fld"><span>Review date</span><input type="date" id="wfmDate" value="${esc(state.date)}"></label>`
        + `<div class="fld"><span>${days.length > 1 ? 'One review per day — pick the day' : 'Covers'}</span>${dayChips || `<div class="hint" style="margin:6px 0 0">Inbound voice for every brand, from the day-start hour to the day-end hour.</div>`}</div>`
      + `</div>`
      + `<div class="row2">${fieldHtml('Greeting', 'greeting')}${fieldHtml('Your name (signature)', 'sigName')}</div>`
      + `<div class="row2">${fieldHtml('Your email', 'sigEmail', { type:'email' })}${fieldHtml('Send to · filled into To in the .eml, separate with ;', 'sendTo')}</div>`
      + `<details class="acc"><summary>Brands, shifts and targets</summary><div class="wfm-g4">`
        + fieldHtml('Brand A name', 'teamAName') + fieldHtml('Brand A shift starts · hours', 'teamAShifts')
        + fieldHtml('Brand B name', 'teamBName') + fieldHtml('Brand B shift starts · hours', 'teamBShifts')
        + fieldHtml('Brand C name', 'teamCName') + fieldHtml('Brand C shift starts · hours', 'teamCShifts')
        + fieldHtml('Day starts · earliest shift', 'dayStart', { type:'number', attrs:' min="0" max="12" step="1"' })
        + fieldHtml('Day ends · hours past midnight', 'dayEnd', { type:'number', attrs:' min="0" max="12" step="1"' })
        + fieldHtml('Service level target · %', 'tgtSL', num) + fieldHtml('Abandon ceiling · %', 'tgtAbn', { type:'number', attrs:' step="0.5"' })
        + fieldHtml('Adherence target · %', 'tgtAdh', num) + fieldHtml('AHT ceiling · seconds', 'tgtAht', { type:'number', attrs:' step="10"' })
        + fieldHtml('Date order in exports', 'dateOrder', { select:[['auto','Detect automatically'],['dmy','Day / Month / Year'],['mdy','Month / Day / Year']] })
      + `</div><p class="hint">A queue, a management unit or a file is matched to a brand by its name; FPay always counts as ${esc(SET.teamCName)}.</p></details>`
      + `<details class="acc"><summary>Exception thresholds and options</summary><div class="wfm-g4">`
        + fieldHtml('Tardy after · minutes late', 'thTardy', num) + fieldHtml('Absent after · minutes late', 'thAbsent', num)
        + fieldHtml('Late first call after · minutes', 'thGap', num) + fieldHtml('Hold per call above · seconds', 'thHold', num)
        + fieldHtml('RONA above · total seconds', 'thRona', num) + fieldHtml('Short call under · seconds', 'thShort', num)
        + fieldHtml('Shift shortfall from · minutes', 'thEarly', num) + fieldHtml('Min calls for AHT ranking', 'thMinCalls', num)
        + fieldHtml('Repeat caller from · calls', 'thRepeat', num)
      + `</div><div class="wfm-toggles">`
        + toggleHtml('Shorten agent names to first + last', 'optShortNames')
        + toggleHtml('Hide sections that have nothing to report', 'optHideEmpty')
        + toggleHtml('Send as a poster, so Outlook shows it exactly like the preview', 'optPoster')
        + toggleHtml('Append the threshold definitions to the email', 'optMethod')
        + toggleHtml('Mask customer numbers in the report', 'optMask')
      + `</div></details>`
      + `<details class="acc"><summary>Watermark check</summary>`
        + `<p class="hint">Every email built here carries an invisible signature inside the report title, every section heading and the sign-off, plus a hidden credit block, and every poster image carries your name inside the image file. None of it shows to the reader. Paste text from a copy of the report, or choose a poster image, to check where it came from.</p>`
        + `<textarea id="wfmWmText" placeholder="Paste text copied from the email"></textarea>`
        + `<label class="fld" style="margin-top:8px"><span>Or choose a poster image saved from the email</span><input type="file" id="wfmWmImage" accept="image/png"></label>`
        + `<div class="wfm-wm" id="wfmWmResult"></div>`
      + `</details>`
    + `</div>`
    + `<div class="editor"><div class="wfm-h">Files for this review <span>· drop them with the others on the left</span></div><div id="wfmSlots" class="wfm-slots"></div></div>`
    + `<div class="actions">`
      + `<button id="wfmBuild" class="primary">Build report</button>`
      + `<button id="wfmEml" title="Opens in Outlook as a new email with the exact formatting">Open in Outlook (.eml)</button>`
      + `<button id="wfmCopy">Copy for Outlook</button>`
      + `<button id="wfmSubject">Copy subject</button>`
      + `<button id="wfmSave">Download .html</button>`
      + `<button id="wfmCsv">Exceptions CSV</button>`
      + `<button id="wfmText">Copy plain summary</button>`
      + `<span class="chk" id="wfmNote"></span>`
    + `</div>`
    + `<div class="previewWrap"><iframe id="preview" title="Preview"></iframe></div>`;
}

function renderChecks(){
  const el = host && host.querySelector('#wfmChecks'); if(!el) return;
  const list = state.checks || [];
  const item = c => `<div class="wfm-check ${c.tone}"><span class="badge">${c.tone === 'ok' ? 'Pass' : c.tone === 'warn' ? 'Check' : 'Blocked'}</span>`
    + `<div><b>${esc(c.title)}</b><div class="detail">${esc(c.detail)}</div></div></div>`;
  const issues = list.filter(c => c.tone !== 'ok'), passes = list.filter(c => c.tone === 'ok');
  el.innerHTML = `<div class="wfm-checks">${issues.map(item).join('')}`
    + (passes.length ? `<details class="wfm-pass"><summary>${passes.length} check${passes.length === 1 ? '' : 's'} passed</summary>${passes.map(item).join('')}</details>` : '')
    + `</div>`;
}

function renderSlots(){
  const el = host && host.querySelector('#wfmSlots'); if(!el) return;
  const cfg = readConfig();
  const moveTargets = key => {
    const m = /^(adh|queue)([ABC])$/.exec(key); if(!m) return '';
    return TEAM_KEYS.filter(k => k !== m[2]).map(k =>
      `<button type="button" class="wfm-mv" data-move="${key}" data-to="${m[1]}${k}" title="Read this file as ${esc(teamName(cfg, k))}">&rarr; ${esc(teamName(cfg, k))}</button>`).join('');
  };
  let h = SLOTS.map(s => {
    const t = state.files[s.key];
    return `<div class="wslot${t ? ' loaded' : ''}${s.req ? '' : ' optional'}">`
      + `<div class="nm"><span>${esc(s.label(cfg))}</span><span class="tag">${t ? '' : s.req ? 'Required' : 'Optional'}`
      + (t ? `<button type="button" class="x" data-drop="${s.key}" title="Remove this file">&times;</button>` : '') + `</span></div>`
      + `<div class="fn" title="${t ? esc((t.parts || [t.fileName]).join('\n')) : ''}">${t ? esc(t.fileName) + ' · ' + t.rows.toLocaleString() + ' rows' : (/^queue/.test(s.key) ? 'Taken from the calls export' : 'Waiting for a file')}</div>`
      + (t ? `<div class="mv">${moveTargets(s.key)}</div>` : '')
      + `</div>`;
  }).join('');
  h += state.unmatched.map((t, i) => `<div class="wslot pending">`
      + `<div class="nm"><span>${t.clashedWith ? 'Slot already filled' : 'Needs a slot'}</span><span class="tag"><button type="button" class="x" data-discard="${i}" title="Discard">&times;</button></span></div>`
      + `<div class="fn" title="${esc(t.fileName)}">${esc(t.fileName)} · ${t.rows.toLocaleString()} rows</div>`
      + (t.clashedWith ? `<div class="fn" style="color:#b45309">Wanted the same slot as ${esc(t.clashedWith)}</div>` : '')
      + `<select data-assign="${i}"><option value="">Assign to…</option>${SLOTS.map(s => `<option value="${s.key}">${esc(s.label(cfg))}</option>`).join('')}</select>`
      + `</div>`).join('');
  el.innerHTML = h;
  el.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { delete state.files[b.dataset.drop]; markDirty(); changed(true); toast('Removed.'); });
  el.querySelectorAll('[data-discard]').forEach(b => b.onclick = () => { state.unmatched.splice(+b.dataset.discard, 1); changed(true); });
  el.querySelectorAll('[data-assign]').forEach(s => s.onchange = () => {
    if(!s.value) return;
    const t = state.unmatched.splice(+s.dataset.assign, 1)[0];
    delete t.clashedWith; delete t.clashedSlot;
    addTable(t, s.value); changed(true); toast('Assigned.');
  });
  el.querySelectorAll('[data-move]').forEach(b => b.onclick = () => {
    const from = b.dataset.move, to = b.dataset.to;
    const a = state.files[from], other = state.files[to];
    if(other){ state.files[from] = other; other._brandHow = 'hand'; } else delete state.files[from];
    state.files[to] = a; a._brandHow = 'hand';
    try{ localStorage.removeItem('wfm.agentTeams.v1'); }catch(e){}
    markDirty(); changed(true);
    toast(teamName(cfg, to.slice(-1)) + ' now reads ' + a.fileName + '.');
  });
}

function renderOutput(){
  if(!host) return;
  const f = host.querySelector('#preview');
  const ready = !!state.html;
  ['wfmEml','wfmCopy','wfmSubject','wfmSave','wfmCsv','wfmText'].forEach(id => { const b = host.querySelector('#' + id); if(b) b.disabled = !ready; });
  const bb = host.querySelector('#wfmBuild'); if(bb) bb.disabled = !isReady();
  const cp = host.querySelector('#wfmCopy'); if(cp) cp.style.display = SET.optPoster ? 'none' : '';
  const note = host.querySelector('#wfmNote');
  if(note) note.textContent = ready ? state.buildNote + (SET.optPoster ? ' The .eml goes out as a poster.' : '')
    : (isReady() ? 'Ready to build.' : 'Waiting for the required exports.');
  if(f) f.srcdoc = ready ? fullDocument() : placeholderDoc();
}

function placeholderDoc(){
  const cfg = readConfig();
  const need = SLOTS.filter(s => !state.files[s.key]).map(s => `<li>${esc(s.label(cfg))}${s.req ? '' : ' <span style="color:#8f8b88">(optional)</span>'}</li>`).join('');
  return `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,sans-serif;background:#fff;color:#201e1d;">`
    + `<div style="max-width:620px;margin:48px auto;padding:0 24px;">`
    + `<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#6f6c6a;">WORKFORCE MANAGEMENT · ALL BRANDS</div>`
    + `<div style="font-size:24px;font-weight:700;margin:4px 0 14px;">Daily WFM &amp; Performance Review</div>`
    + `<p style="font-size:14px;line-height:22px;color:#6f6c6a;">Drop the Genesys exports for ${esc(cfg.date || 'the review day')} on the left, with the brand reports' files. `
    + `The calls exports you already drop give each brand's queue figures.</p>`
    + (need ? `<p style="font-size:13px;margin:18px 0 6px;font-weight:700;">Still to come</p><ul style="font-size:13px;line-height:22px;margin:0;padding-left:18px;">${need}</ul>` : '')
    + `</div></body></html>`;
}

/** Something changed: rebuild when possible, refresh what the tab shows, and tell the builder. */
function changed(rebuildNow){
  if(rebuildNow && isReady()){
    try{ build(); }
    catch(err){ console.error(err); state.buildNote = 'Build failed: ' + err.message; toast('Build failed: ' + err.message); runChecks(); }
  }else if(!state.html) runChecks();
  renderChecks(); renderSlots(); renderOutput();
  if(H.onChange) H.onChange();
}

function wire(){
  host.querySelectorAll('[data-set]').forEach(el => {
    const key = el.dataset.set;
    const apply = () => {
      SET[key] = el.type === 'checkbox' ? el.checked : el.value;
      saveSettings(); markDirty();
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => changed(true), el.type === 'checkbox' || el.tagName === 'SELECT' ? 0 : 450);
    };
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', apply);
  });
  const d = host.querySelector('#wfmDate');
  d.onchange = () => { if(d.value){ state.date = d.value; state.userDate = true; markDirty(); panel(host, H); } };
  host.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { state.date = b.dataset.day; state.userDate = true; markDirty(); panel(host, H); });
  host.querySelector('#wfmBuild').onclick = () => { markDirty(); changed(true); if(state.html) toast('Report built. Read the checks before you send it.'); };
  host.querySelector('#wfmCopy').onclick = copyForOutlook;
  host.querySelector('#wfmSubject').onclick = () => { navigator.clipboard.writeText(subject()).then(() => toast('Subject copied.'), () => toast('Copy blocked by the browser.')); };
  host.querySelector('#wfmSave').onclick = () => { download(`WFM_Daily_Review_${state.date}.html`, fullDocument(), 'text/html;charset=utf-8'); toast('Saved to your downloads.'); };
  host.querySelector('#wfmCsv').onclick = () => { const r = exceptionsCsv(); if(!r) return; download(`WFM_Exceptions_${state.date}.csv`, r.csv, 'text/csv;charset=utf-8'); toast(r.count + ' exception rows exported.'); };
  host.querySelector('#wfmText').onclick = async () => {
    if(!state.model) return;
    try{ await navigator.clipboard.writeText(plainSummary(state.model)); toast('Plain summary copied.'); }
    catch(e){ toast('Copy blocked by the browser.'); }
  };
  host.querySelector('#wfmEml').onclick = async () => {
    const btn = host.querySelector('#wfmEml'), label = btn.textContent;
    btn.disabled = true; btn.textContent = SET.optPoster ? 'Drawing poster…' : 'Saving…';
    try{
      download(`WFM_Daily_Review_${state.date}.eml`, await buildEml(), 'message/rfc822');
      toast('Saved. Double-click the .eml file and Outlook opens it as a new email, ready to send.');
    }catch(err){ console.error(err); toast('Could not build the Outlook file: ' + err.message); }
    finally{ btn.disabled = false; btn.textContent = label; }
  };
  const wmT = host.querySelector('#wfmWmText'), wmR = host.querySelector('#wfmWmResult');
  wmT.addEventListener('input', () => {
    const txt = wmT.value;
    if(!txt.trim()){ wmR.className = 'wfm-wm'; wmR.textContent = ''; return; }
    const hits = WM.read(txt).filter(x => x.indexOf(WM.name + '|') === 0);
    const dates = [...new Set(hits.map(x => x.split('|')[1]).filter(Boolean))];
    if(hits.length){
      wmR.className = 'wfm-wm ok';
      wmR.textContent = `Signed by ${WM.name}. Found ${hits.length} hidden signature${hits.length === 1 ? '' : 's'}`
        + (dates.length ? ` for the report dated ${dates.join(', ')}` : '') + '. This text came from your builder.';
    }else{
      wmR.className = 'wfm-wm bad';
      wmR.textContent = 'No hidden signature found. Either this text did not come from your builder, or it was retyped rather than copied.';
    }
  });
  host.querySelector('#wfmWmImage').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    try{
      const t = pngText(new Uint8Array(await f.arrayBuffer()));
      const sig = String(t.Comment || '');
      if(sig.indexOf(WM.name + '|') === 0 || t.Author === WM.name){
        wmR.className = 'wfm-wm ok';
        wmR.textContent = `Signed by ${WM.name}` + (sig.split('|')[1] ? `, poster for the report dated ${sig.split('|')[1]}` : '') + '. This image came from your builder.';
      }else{
        wmR.className = 'wfm-wm bad';
        wmR.textContent = 'No signature inside this image. It did not come from your builder, or it was re-saved as a screenshot.';
      }
    }catch(err){ wmR.className = 'wfm-wm bad'; wmR.textContent = 'That file could not be read as a PNG image.'; }
  });
}

/** Draw the whole tab into `el`. Builds on the way in when the files allow it. */
function panel(el, hooks){
  host = el; H = hooks || H;
  el.innerHTML = panelHtml();
  wire();
  changed(state.dirty && isReady());
}

/* ══ 11 · WHAT THE BUILDER CALLS ══ */
loadSettings();
root.WFM = {
  /** Read a CSV the way this report does; null when it has no header row. */
  table: (text, name) => { try{ return makeTable(text, name); }catch(e){ return null; } },
  detect: (t, name) => detectSlot(t, name),
  isOwn: slot => !!slot && WFM_ONLY.test(slot),
  /** File a table: `slot` optional (detected when missing). Returns a short label for the file list. */
  add: (t, slot) => {
    const r = addTable(t, slot);
    if(r.clash) return 'WFM · ' + slotLabel(r.slot) + ' already loaded — pick a slot in the WFM tab';
    if(!r.slot) return 'WFM · needs a slot — assign it in the WFM tab';
    return 'WFM · ' + r.label;
  },
  /** Queue figures from a brand report's calls export: 'virgin' | 'friendi' | 'fpay'. */
  addCalls: (brand, t) => { const k = { virgin:'A', friendi:'B', fpay:'C' }[brand]; if(k && t) addQueue(k, t); },
  clear: () => { clearFiles(); },
  /** The builder's report date and the days it covers; the review follows it unless picked by hand. */
  setReportDate: (d, days) => {
    state.periodDays = days || [d];
    if(state.userDate && state.periodDays.indexOf(state.date) >= 0) return;
    if(state.date !== d){ state.date = d; state.userDate = false; markDirty(); }
  },
  /** Titles of whatever still needs attention, for the dot on the tab. */
  issues: () => { if(!state.html) runChecks(); return (state.checks || []).filter(c => c.tone !== 'ok').map(c => c.title); },
  hasFiles: () => Object.keys(state.files).length > 0 || state.unmatched.length > 0,
  panel,
  // for tests
  _state: state, _build: build, _eml: buildEml, _settings: () => SET
};

})(window);
