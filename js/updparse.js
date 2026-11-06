/* MC Monthly Report Builder - the corrections the WFM team receives after the deduction email, read into days per person:
   - a table, as it comes in the email or a sheet: Name (Team, Dep, ID) and a column per day ("27-Oct" … with "SL leaves",
     "Absent" …), or a Date (or From and To) column with a Type column; tab-separated as pasted from Outlook or Excel, one cell a
     line as an email's text has it, or the rows of a sheet;
   - lines typed in plain words: "set Nawaf as absent on 10 Oct", "Sara K. SL 27-29 Oct", "Omar late 20 min on 3 Oct",
     "clear Nawaf 10 Oct" (the correction taken away);
   - rows with no header, as the supervisors list their exceptions: a day, a name (with the reason after it) and what it was
     ("22-Oct-2026 · Name · 4:00 PM - 4:30 PM", "Oct-22 · Name Approver-excuse · Excuse", "11-oct · Name Approver-pc loading for
     2 min · Pc loading").
   An exception (an excuse, PC loading, a system or network issue, a meeting, training, a permission, or a time like 4:00 PM - 4:30
   PM) excuses the day: its lateness, and its minutes (the time, "2 min", or the whole day when none is given) off the deduction.
   parse() gives each person's days (matched to the people of the month by ID or name, or the names to choose from when it is not
   clear) and what it could not read, with why. Nothing here changes anything: the page shows it first. */
'use strict';
const UpdParse = ((C) => {
const MONS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const sp = s => String(s ?? '').replace(/[​-‏‪-‮﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// ---------------------------------------------------------------- what a day becomes
// the month's own codes: Attend, OFF, AL, SL, Absent, the other leaves by name, or the late minutes of a day
const PHRASES = [
  ['sick leaves', 'SL'], ['sick leave', 'SL'], ['sl leaves', 'SL'], ['sl leave', 'SL'], ['annual leaves', 'AL'], ['annual leave', 'AL'], ['al leaves', 'AL'], ['al leave', 'AL'],
  ['unpaid leave', 'Unpaid'], ['exam leave', 'Exam'], ['marriage leave', 'Marriage'], ['maternity leave', 'ML'], ['paternity leave', 'Paternity'],
  ['compassionate leave', 'Compassionate Leave'], ['bereavement leave', 'Compassionate Leave'], ['national day', 'National Day'], ['founding day', 'Founding Day'],
  ['day off', 'OFF'], ['no show', 'Absent'], ['eid holiday', 'Eid'],
  ['sick', 'SL'], ['sl', 'SL'], ['annual', 'AL'], ['al', 'AL'], ['vacation', 'AL'], ['absent', 'Absent'], ['absence', 'Absent'], ['absents', 'Absent'],
  ['off', 'OFF'], ['attend', 'Attend'], ['attended', 'Attend'], ['attendance', 'Attend'], ['present', 'Attend'], ['worked', 'Attend'],
  ['unpaid', 'Unpaid'], ['exam', 'Exam'], ['marriage', 'Marriage'], ['maternity', 'ML'], ['ml', 'ML'], ['paternity', 'Paternity'],
  ['compassionate', 'Compassionate Leave'], ['bereavement', 'Compassionate Leave'],
];
// an exception the supervisor approved: the words that say so, and a time window (4:00 PM - 4:30 PM)
const EXC_RE = /\b(excuse[ds]?|exception|pc[\s-]*(?:loading|issue|problem|restart(?:ed)?|hang(?:ed|ing)?|slow)|system[\s-]*(?:issue|down|problem|error|slow)|technical[\s-]*(?:issue|problem)|network[\s-]*(?:issue|problem|down)|internet[\s-]*(?:issue|problem|down)|login[\s-]*(?:issue|problem)|power[\s-]*(?:cut|outage|issue)|meeting|training|coaching|permission|approved)\b/i;
const WIN_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\b/i;
const EXC_NAME = { pc: 'PC loading', system: 'System issue', technical: 'Technical issue', network: 'Network issue', internet: 'Internet issue', login: 'Login issue', power: 'Power cut' };
/** the minutes of a time window (4:00 PM - 4:30 PM: 30), or null */
function winMin(t) {
  const m = String(t || '').match(WIN_RE); if (!m) return null;
  const hm = (h, mi, ap) => { let x = +h % 12 + (ap && /pm/i.test(ap) ? 12 : 0); if (!ap) x = +h; return x * 60 + (+mi || 0); };
  let a, b;
  if (m[1] != null) { b = hm(m[4], m[5], m[6]); a = hm(m[1], m[2], m[3] || m[6]); } else { a = hm(m[7], m[8]); b = hm(m[9], m[10]); }
  let d = b - a; if (d <= 0) d += 12 * 60; if (d <= 0 || d > 12 * 60) return null;
  return { min: d, text: m[0].replace(/\s+/g, ' ').trim() };
}
/** an exception in some text: { exc: minutes or 'day', why } (the time window's minutes, "for 2 min", "1 hour", else the whole day) */
function excOf(text) {
  const t = sp(text); if (!t) return null;
  const w = winMin(t), e = t.match(EXC_RE); if (!w && !e) return null;
  let why = '';
  if (e) { const k = e[1].toLowerCase().split(/[\s-]/)[0]; why = EXC_NAME[k] || (/^excuse/i.test(e[1]) ? 'Excuse' : e[1].charAt(0).toUpperCase() + e[1].slice(1).toLowerCase()); }
  if (w) return { exc: w.min, why: why ? `${why}, ${w.text}` : w.text };
  const mm = t.match(/\b(\d{1,3})\s*(?:m|mins?|minutes?)\b/i), hh = t.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/i);
  const n = mm ? +mm[1] : hh ? Math.round(+hh[1] * 60) : null;
  return { exc: n != null && n > 0 && n <= 720 ? n : 'day', why };
}
/** what an exception does, in words */
const excLabel = c => `Exception${c.why ? `: ${c.why}` : ''} · ${c.exc === 'day' ? 'the day excused' : `${c.exc} min excused`}`;
// in a table cell only: a single letter, and Eid (a family name too, so a typed line says "Eid holiday")
const CELL = { a: 'Absent', o: 'OFF', p: 'Attend', x: 'Absent', eid: 'Eid' };
const CLEAR = /^(?:clear|reset|undo|original)$/i;
/** a cell's value (in a table a single letter counts too: A, O, P, and a bare number is the late minutes) */
function valueOf(s, inTable) {
  const t = sp(s).replace(/[.:;,]+$/, '').toLowerCase(); if (!t || /^[-–—]+$/.test(t)) return null;
  if (CLEAR.test(t)) return { v: null, clear: true };
  const m = t.match(/^(?:late|tardy)\s*(\d{1,3})\s*(?:m|mins?|minutes?)?$/) || t.match(/^(\d{1,3})\s*(?:m|mins?|minutes?)(?:\s+late)?$/);
  if (m && +m[1] > 0 && +m[1] <= 720) return { v: +m[1] };
  if (inTable) {
    if (/^\d{1,3}$/.test(t) && +t > 0 && +t <= 720) return { v: +t };
    const one = CELL[t]; if (one) return { v: one };
  }
  const p = PHRASES.find(([w]) => w === t); if (p) return { v: p[1] };
  if (inTable && /\bleaves?\b/.test(t)) return { v: sp(s).replace(/\s*\bleaves?\b\s*/i, ' ').trim().replace(/^./, c => c.toUpperCase()) || 'Other leave' };   // another leave, as written
  const x = excOf(s); if (x) return { v: undefined, exc: x.exc, why: x.why };   // an exception: the day excused
  return null;
}
/** the label a value shows with (as the Attendance Report writes it) */
const label = v => (v && typeof v === 'object' && v.exc != null ? excLabel(v) : v === undefined ? '?' : v === null ? 'empty' : typeof v === 'number' ? `Late ${v} min` : { AL: 'AL leave', SL: 'SL leave', ML: 'Maternity leave', Exam: 'Exam leave', Unpaid: 'Unpaid leave', Marriage: 'Marriage leave', Paternity: 'Paternity leave' }[v] || v);

// ---------------------------------------------------------------- days
/** the year of a day given without one: the one nearest the month the corrections are for */
function yearFor(m, ctx) { const d = m - ctx.m; return d > 6 ? ctx.y - 1 : d < -6 ? ctx.y + 1 : ctx.y; }
function dayOk(y, m, d) { return y > 1990 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m) ? ymd(y, m, d) : null; }
const monOf = w => MONS[String(w || '').toLowerCase().replace(/\.$/, '')] || 0;
const span = (a, b) => { const out = []; for (let t = Date.parse(a + 'T00:00:00Z'), e = Date.parse(b + 'T00:00:00Z'); t <= e && out.length < 62; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out; };
const ORD = '(?:st|nd|rd|th)?';
const WDAY = '(?:sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|sday|nesday|rsday|urday)?';
/** a day cell without its weekday ("Thu 22-Oct", "22 Oct 2026 (Thu)", "Thursday, 22 October") */
const noWday = t => t.replace(new RegExp(`^${WDAY}\\.?[,\\s]+`, 'i'), '').replace(new RegExp(`[,\\s]*\\(?${WDAY}\\.?\\)?$`, 'i'), '').trim();
/** one cell that is a day: 27-Oct, 27 Oct 2026, Oct 27, 27/10/2026 (day first), 2026-10-27, or an Excel date number */
function oneDay(s, ctx) {
  const t = noWday(sp(s).toLowerCase()); let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ t].*)?$/))) return dayOk(+m[1], +m[2], +m[3]);
  if ((m = t.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/))) { const mo = +m[2]; return dayOk(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : yearFor(mo, ctx), mo, +m[1]); }
  if ((m = t.match(new RegExp(`^(\\d{1,2})${ORD}[\\s-]*(?:of\\s+)?([a-z]{3,9})\\.?(?:[\\s,-]+(\\d{2,4}))?$`))) && monOf(m[2])) { const mo = monOf(m[2]); return dayOk(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : yearFor(mo, ctx), mo, +m[1]); }
  if ((m = t.match(new RegExp(`^([a-z]{3,9})\\.?[\\s-]+(\\d{1,2})${ORD}(?:,?\\s+(\\d{4}))?$`))) && monOf(m[1])) { const mo = monOf(m[1]); return dayOk(m[3] ? +m[3] : yearFor(mo, ctx), mo, +m[2]); }
  if (/^\d{5}(?:\.\d+)?$/.test(t) && +t > 20000 && +t < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(+t) * 86400000).toISOString().slice(0, 10);
  return null;
}
/** the days named in a typed line, and the line without them. A range covers every day in it (wide: the page leaves its days off
    unticked); a day with no month is in the month the corrections are for */
function daysOf(line, ctx) {
  let s = ' ' + line.toLowerCase().replace(/[–—]/g, '-') + ' ';
  const out = []; let wide = false;
  const take = (re, fn) => { s = s.replace(re, (...a) => { const r = fn(a); if (!r) return a[0]; out.push(...r.days); if (r.wide) wide = true; return ' '; }); };
  const Y = (mo, y) => (y ? (+y < 100 ? 2000 + +y : +y) : yearFor(mo, ctx));
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, a => { const d = dayOk(+a[1], +a[2], +a[3]); return d && { days: [d] }; });
  take(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/g, a => { const d = dayOk(Y(+a[2], a[3]), +a[2], +a[1]); return d && { days: [d] }; });
  // 27 Oct - 2 Nov, from 27 Oct to 2 Nov
  take(new RegExp(`\\b(?:from\\s+)?(\\d{1,2})${ORD}\\s*(?:of\\s+)?([a-z]{3,9})\\.?\\s*(?:-|to|till|until|through|thru)\\s*(\\d{1,2})${ORD}\\s*(?:of\\s+)?([a-z]{3,9})\\b`, 'g'), a => {
    const m1 = monOf(a[2]), m2 = monOf(a[4]); if (!m1 || !m2) return null;
    const d1 = dayOk(Y(m1), m1, +a[1]), d2 = dayOk(Y(m2), m2, +a[3]); return d1 && d2 && d1 <= d2 && { days: span(d1, d2), wide: true };
  });
  // 27-29 Oct, from 27 to 29 Oct, Oct 27-29
  take(new RegExp(`\\b(?:from\\s+)?(\\d{1,2})${ORD}\\s*(?:-|to|till|until|through|thru)\\s*(\\d{1,2})${ORD}\\s*(?:of\\s+)?([a-z]{3,9})\\b`, 'g'), a => {
    const mo = monOf(a[3]); if (!mo || +a[1] > +a[2]) return null; const y = Y(mo), d1 = dayOk(y, mo, +a[1]), d2 = dayOk(y, mo, +a[2]); return d1 && d2 && { days: span(d1, d2), wide: true };
  });
  take(/\b([a-z]{3,9})\.?\s+(\d{1,2})\s*(?:-|to|till|until|through|thru)\s*(\d{1,2})\b/g, a => {
    const mo = monOf(a[1]); if (!mo || +a[2] > +a[3]) return null; const y = Y(mo), d1 = dayOk(y, mo, +a[2]), d2 = dayOk(y, mo, +a[3]); return d1 && d2 && { days: span(d1, d2), wide: true };
  });
  // 27, 28 and 31 Oct
  take(new RegExp(`\\b(\\d{1,2})${ORD}((?:\\s*(?:,|&|and)\\s*\\d{1,2}${ORD})+)\\s*(?:of\\s+)?([a-z]{3,9})\\b`, 'g'), a => {
    const mo = monOf(a[3]); if (!mo) return null; const y = Y(mo), L = [a[1], ...a[2].match(/\d{1,2}/g)].map(d => dayOk(y, mo, +d));
    return L.every(Boolean) && { days: L };
  });
  // 27 Oct, 27th of October 2026, Oct 27
  take(new RegExp(`\\b(\\d{1,2})${ORD}[\\s-]*(?:of\\s+)?([a-z]{3,9})\\.?(?:[\\s,-]+(\\d{4}))?\\b`, 'g'), a => { const mo = monOf(a[2]); if (!mo) return null; const d = dayOk(Y(mo, a[3]), mo, +a[1]); return d && { days: [d] }; });
  take(new RegExp(`\\b([a-z]{3,9})\\.?[\\s-]+(\\d{1,2})${ORD}(?:[,\\s-]+(\\d{4}))?\\b`, 'g'), a => { const mo = monOf(a[1]); if (!mo) return null; const d = dayOk(Y(mo, a[3]), mo, +a[2]); return d && { days: [d] }; });   // Oct 27, Oct-27
  // no month: "from 27 to 29", "on 27, 28 and 31", "on the 10th", "10th"
  const here = n => dayOk(ctx.y, ctx.m, +n);
  take(new RegExp(`\\bfrom\\s+(?:the\\s+)?(\\d{1,2})${ORD}\\s*(?:-|to|till|until|through)\\s*(?:the\\s+)?(\\d{1,2})${ORD}\\b`, 'g'), a => { const d1 = here(a[1]), d2 = here(a[2]); return d1 && d2 && d1 <= d2 && { days: span(d1, d2), wide: true }; });
  take(new RegExp(`\\bon\\s+(?:the\\s+)?(\\d{1,2})${ORD}((?:\\s*(?:,|&|and)\\s*(?:the\\s+)?\\d{1,2}${ORD})*)\\b`, 'g'), a => { const L = [a[1], ...((a[2] || '').match(/\d{1,2}/g) || [])].map(here); return L.every(Boolean) && { days: L }; });
  take(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, a => { const d = here(a[1]); return d && { days: [d] }; });
  return { days: [...new Set(out)].sort(), wide, rest: s };
}

// ---------------------------------------------------------------- tables
const H_NAME = /^(?:name|full name|agent(?: name)?|employee(?: name)?|staff(?: name)?)$/i, H_TEAM = /^(?:team|brand)$/i, H_DEP = /^(?:dep|dept|department)$/i;
const H_ID = /^(?:id|national id|nid|iqama|iqama no\.?|employee id|emp\.? ?id|staff id)$/i, H_DATE = /^(?:date|day)$/i, H_FROM = /^(?:from|start(?: date)?)$/i, H_TO = /^(?:to|end(?: date)?|until)$/i;
const H_TYPE = /^(?:type|leave(?: type)?|status|code|attendance|reason|reasons|update|correction|change(?: to)?|new(?: status)?|exceptions?|exception type|remarks?|comments?|notes?|details?|description|justification|excuse|category|issue)$/i;
const H_MIN = /^(?:minutes?|mins?|duration|excused(?: minutes| mins)?|time \(min\)|minutes excused)$/i;
const headerish = (c, ctx) => H_NAME.test(c) || H_TEAM.test(c) || H_DEP.test(c) || H_ID.test(c) || H_DATE.test(c) || H_FROM.test(c) || H_TO.test(c) || H_TYPE.test(c) || !!oneDay(c, ctx);
/** the rows of pasted text: tab-separated lines, or (an email's text) one cell a line after a header row; null when it is neither */
function rowsOfText(text, ctx) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/[​-‍﻿]/g, ''));
  const tabbed = lines.filter(l => l.includes('\t'));
  if (tabbed.length >= 2) return lines.filter(l => l.trim()).map(l => l.split('\t').map(sp));
  // blank lines are kept: inside the table an empty cell is a blank line, so the next value stays in its own day
  const L = lines.map(sp), i0 = L.findIndex(l => H_NAME.test(l));
  if (i0 < 0) return null;
  let n = 1; while (i0 + n < L.length && L[i0 + n] && headerish(L[i0 + n], ctx) && !H_NAME.test(L[i0 + n])) n++;
  if (n < 2) return null;
  const rows = [L.slice(i0, i0 + n)];
  for (let i = i0 + n; i < L.length;) {
    while (i < L.length && !L[i]) i++;   // the blank lines between rows
    if (i + n > L.length) { const r = L.slice(i); if (r.length > 1 && r.slice(1).some(Boolean) && !/^(?:regards|best|thanks|thank you|kind regards|sincerely|br)\b/i.test(r[0])) rows.push(r.concat(Array(n - r.length).fill(''))); break; }
    const r = L.slice(i, i + n);
    if (/^(?:regards|best|thanks|thank you|kind regards|sincerely|br)\b/i.test(r[0]) || r[0].length > 80) break;
    rows.push(r); i += n;
  }
  return rows.length > 1 ? rows : null;
}
/** the corrections in a table's rows: who, and each day's new value. null when there is no header row with a name and days */
function fromRows(rows, ctx) {
  const R = (rows || []).map(r => (Array.isArray(r) ? r : []).map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : sp(v))));
  const hi = R.findIndex(r => r.some(c => H_NAME.test(c)) && (r.some(c => oneDay(c, ctx)) || r.some(c => H_DATE.test(c) || H_FROM.test(c))));
  if (hi < 0) return null;
  const H = R[hi], col = re => H.findIndex(c => re.test(c)), ni = col(H_NAME), ti = col(H_TEAM), di = col(H_DEP), ii = col(H_ID);
  const dateCols = H.map((c, j) => [j, j === ni ? null : oneDay(c, ctx)]).filter(x => x[1]);
  const dc = col(H_DATE), fc = col(H_FROM), tc = col(H_TO), yc = col(H_TYPE), mc = col(H_MIN);
  const groups = [], bad = [];
  for (const r of R.slice(hi + 1)) {
    const name = r[ni] || '', who = { name, team: ti >= 0 ? r[ti] || '' : '', dep: di >= 0 ? r[di] || '' : '', id: ii >= 0 ? r[ii] || '' : '' };
    if (!name && !who.id) continue;
    if (/^(?:total|grand total)$/i.test(name)) continue;
    const changes = [];
    if (dateCols.length) {
      for (const [j, date] of dateCols) {
        const cell = r[j] || ''; if (!cell) continue;
        const v = valueOf(cell, true);
        if (v) changes.push({ date, v: v.v, exc: v.exc, why: v.why, clear: !!v.clear, raw: cell }); else bad.push({ text: `${name}, ${date.slice(8)} ${MON3[+date.slice(5, 7) - 1]}: "${cell}"`, why: 'not a day value the tool knows (Absent, Attend, OFF, AL, SL, a leave, or late minutes)' });
      }
    } else {
      let v = valueOf(yc >= 0 ? r[yc] : '', true);
      for (let j = 0; !v && j < r.length; j++) if (j !== ni && j !== dc && j !== fc && j !== tc && j !== ii && j !== mc) v = valueOf(r[j], true);   // what it was, in another column
      if (!v) { const x = excOf(r.filter((c, j) => j !== dc && j !== fc && j !== tc).join(' ')); if (x) v = { v: undefined, exc: x.exc, why: x.why }; }
      const d1 = oneDay(dc >= 0 ? r[dc] : fc >= 0 ? r[fc] : '', ctx), d2 = tc >= 0 ? oneDay(r[tc], ctx) : null;
      if (!d1 || !v) { bad.push({ text: r.filter(Boolean).join(' · '), why: !d1 ? 'no day the tool can read' : 'no value the tool knows' }); continue; }
      let vx = v.exc != null ? { ...v, ...(excOf(r.filter(Boolean).join(' ')) || {}) } : v;   // an exception's minutes may be in another cell
      const mn = mc >= 0 ? parseFloat(String(r[mc] || '').replace(/[^\d.]/g, '')) : NaN;
      if (vx.exc != null && mn > 0 && mn <= 720) vx = { ...vx, exc: Math.round(mn) };   // the Minutes column says how many
      for (const date of d2 && d2 >= d1 ? span(d1, d2) : [d1]) changes.push({ date, v: vx.v, exc: vx.exc, why: vx.why, clear: !!v.clear, raw: yc >= 0 ? r[yc] : '', wide: !!(d2 && d2 > d1) });
    }
    if (changes.length) groups.push({ who, changes, src: 'table', text: [name, who.team, who.dep].filter(Boolean).join(' · ') });
  }
  return { groups, bad };
}

/** the names someone may be in a cell that goes on with a reason ("Name Approver-pc loading for 2 min"): the cell, the words before
    the first hyphenated word, the words before an exception */
function nameAlts(cell) {
  const out = new Set(), a = cell.split(/\s+(?=\S*[A-Za-z]-[A-Za-z])/)[0], i = cell.search(EXC_RE);
  if (a && a !== cell) out.add(a.trim());
  if (i > 0) out.add(cell.slice(0, i).replace(/[\s\-:,]+$/, '').trim());
  return [...out].filter(x => x && x !== cell);
}
/** rows with no header row: in each, a day, a name and what the day becomes (a code, late minutes, or an exception anywhere in it) */
function fromLooseRows(rows, ctx) {
  const groups = [], bad = [];
  for (const r0 of rows || []) {
    const r = (Array.isArray(r0) ? r0 : []).map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : sp(v))).filter(Boolean); if (!r.length) continue;
    if (r.length === 1) { const c = command(r[0], ctx); if (c && c.group) groups.push(c.group); else if (c && c.bad) bad.push(c.bad); continue; }   // a line written out, among the pasted rows
    let di = r.findIndex(c => oneDay(c, ctx)), dates = di >= 0 ? [oneDay(r[di], ctx)] : null, wide = false;
    if (!dates) { const j = r.findIndex(c => daysOf(c, ctx).days.length && !/[a-z]{3,}\s+[a-z]{3,}/i.test(daysOf(c, ctx).rest.trim())); if (j >= 0) { const D = daysOf(r[j], ctx); dates = D.days; wide = D.wide; di = j; } }
    const rest = r.filter((_, j) => j !== di), text = r.join(' · ');
    let vi = -1, val = null;
    for (let j = rest.length - 1; j >= 1 && !val; j--) { const v = valueOf(rest[j], true); if (v) { val = v; vi = j; } }
    if (val && val.exc != null) val = { ...val, ...(excOf(rest.join(' ')) || {}) };   // the minutes may be with the name ("pc loading for 2 min")
    if (!val) { const x = excOf(rest.slice(1).join(' ')) || excOf(rest.join(' ')); if (x) val = { v: undefined, exc: x.exc, why: x.why }; }
    const name = rest.filter((_, j) => j !== vi)[0] || '';
    if (!dates || !val || !name) { bad.push({ text, why: !dates ? 'no day the tool can read' : !val ? 'no value the tool knows (Absent, Attend, OFF, AL, SL, a leave, late minutes, or an exception)' : 'no name' }); continue; }
    groups.push({ who: { name, alts: nameAlts(name), team: '', dep: '', id: '' }, changes: dates.map(date => ({ date, v: val.v, exc: val.exc, why: val.why, clear: !!val.clear, raw: text, wide })), src: 'table', text });
  }
  return { groups, bad };
}

// ---------------------------------------------------------------- typed lines
const FILL = new Set(['set', 'mark', 'make', 'change', 'changed', 'update', 'put', 'record', 'register', 'as', 'an', 'a', 'on', 'the', 'to', 'for', 'is', 'was', 'be', 'been', 'should', 'marked',
  'day', 'days', 'from', 'and', 'of', 'in', 'at', 'please', 'kindly', 'pls', 'plz', 'with', 'he', 'she', 'his', 'her', 'him', 'agent', 'employee', 'it', 'by', 'not', 'but', 'leave', 'leaves', 'until', 'till', 'through', 'min', 'mins', 'minutes', 'late', 'tardy', 'also', 'both', 'all', 'whole',
  'sun', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'only', 'pm', 'am']);
const BRAND = [[/\bfriendi\s*pay\b|\bfpay\b/i, 'Friendi Pay'], [/\bfriendi\b/i, 'Friendi'], [/\bvirgin\b/i, 'Virgin']];
const TEAMS = new Set(['cc', 'sm', 'ct', 'qa', 'ts', 'mg', 'de', 'wf', 'op']);
/** one typed line: who, the value and the days. A line with neither a day nor a value (a greeting, a signature) is left out */
function command(line, ctx) {
  const raw = sp(line); if (!raw) return null;
  const D = daysOf(raw, ctx);
  let s = ' ' + D.rest.replace(/[.,;:!?()"']/g, ' ').replace(/\s+/g, ' ') + ' ';
  let val = null, two = false;
  const late = s.match(/\b(?:late|tardy)\s+(?:by\s+|for\s+)?(\d{1,3})\s*(?:m|mins?|minutes?)?\b/) || s.match(/\b(\d{1,3})\s*(?:m|mins?|minutes?)\s+late\b/);
  const ex = excOf(raw);
  if (ex) {   // an exception: the day excused (its words, its time and its minutes out of the name)
    val = { v: undefined, exc: ex.exc, why: ex.why };
    s = s.replace(new RegExp(WIN_RE.source, 'gi'), ' ').replace(new RegExp(EXC_RE.source, 'gi'), ' ').replace(/\b(?:late|tardy|by|for|only|of)\b/g, ' ').replace(/\b\d{1,3}\s*(?:m|mins?|minutes?|h|hrs?|hours?)\b/g, ' ').replace(/(\S)-(?=\s)/g, '$1 ').replace(/\s-(\S)/g, ' $1');
  } else if (late && +late[1] > 0 && +late[1] <= 720) { val = { v: +late[1] }; s = s.replace(late[0], ' '); }
  for (const [w, v] of ex ? [] : PHRASES) {
    if (w === 'al' && !/(?:^|[^A-Za-z])AL(?:[^A-Za-z]|$)/.test(raw)) continue;   // "Al" in a name (Al Qahtani); annual leave typed as AL
    const re = new RegExp(`\\s${w.replace(/ /g, '\\s+')}\\s`);
    if (!re.test(s)) continue;
    if (val && val.v !== v) two = true; else val = { v };
    s = s.replace(re, ' ');
  }
  const clear = /\s(?:clear|reset|undo|original|remove the correction|take back)\s/.test(s);
  if (clear) { if (val) two = true; else val = { v: null, clear: true }; s = s.replace(/\s(?:clear|reset|undo|original|remove the correction|take back)\s/g, ' '); }
  if (!D.days.length && !val) return null;
  let brand = '', team = '';
  for (const [re, b] of BRAND) if (re.test(s)) { brand = b; s = s.replace(re, ' '); break; }
  const words = s.split(/\s+/).filter(Boolean).filter(w => !FILL.has(w) && !/^\d+$/.test(w));
  const tw = words.filter(w => TEAMS.has(w)); if (tw.length === 1 && words.length > 1) team = tw[0].toUpperCase();
  const name = words.filter(w => !(team && w === team.toLowerCase())).join(' ');
  const why = two ? 'two different values: say one (absent, attend, SL, AL, off, a leave, late minutes, or clear)'
    : !val ? 'no value: say what the day becomes (absent, attend, SL, AL, off, a leave, late minutes, or clear)'
    : !D.days.length ? 'no day: name the day, like 10 Oct, 27-29 Oct or 27, 28 and 31 Oct' : !name ? 'no name: who is it for?' : '';
  if (why) return { bad: { text: raw, why } };
  return { group: { who: { name, team, brand, dep: team, id: '' }, changes: D.days.map(date => ({ date, v: val.v, exc: val.exc, why: val.why, clear: !!val.clear, raw, wide: D.wide })), src: 'typed', text: raw } };
}

// ---------------------------------------------------------------- who
const toks = s => sp(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z؀-ۿ\s]/g, ' ').split(/\s+/).filter(Boolean)
  .reduce((o, w, i, L) => { if (['bin', 'ibn', 'bint'].includes(w)) return o; if (['al', 'el'].includes(w) && L[i + 1]) { L[i + 1] = w + L[i + 1]; return o; } o.push(w); return o; }, []);
const skel = w => w.replace(/gh/g, 'g').replace(/q/g, 'g').replace(/ph/g, 'f').replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
const same = (x, y) => x === y || (x.length >= 3 && y.startsWith(x)) || (skel(x).length >= 2 && skel(x) === skel(y));
/** how well a name someone wrote fits a person's name: 1 the same, 0.95 every word found, 0.9 first and family name (a short name
    against a long one), 0.86+ the engine's own score, 0.6 one word found (a first name: only taken when nobody else fits) */
function fit(a, b) {
  const A = toks(a), B = toks(b); if (!A.length || !B.length) return 0;
  if (A.join(' ') === B.join(' ')) return 1;
  const all = (P, Q) => P.every(x => Q.some(y => same(x, y)));
  if (A.length >= 2 && all(A, B)) return 0.95;
  if (A.length >= 2 && B.length >= 2 && same(A[0], B[0]) && (same(A[A.length - 1], B[B.length - 1]) || all(B, A))) return 0.9;
  const ns = C && C.nameScore ? C.nameScore(a, b) : 0; if (ns >= 0.86) return ns;
  if (A.length === 1 && B.some(y => same(A[0], y))) return 0.6;
  return 0;
}
const cid = s => (C && C.cleanId ? C.cleanId(s) : String(s || '').replace(/\D/g, ''));
const brandKey = s => String(s || '').toLowerCase().replace(/\s+/g, '');
/** the person a group is for: by ID, else the best name among the month's people (filtered by brand and team when given) */
function match(who, people) {
  const id = cid(who.id); if (id) { const p = people.find(x => x.nid && cid(x.nid) === id); if (p) return { pid: p.pid, cands: [p.pid], score: 1 }; }
  if (!who.name) return { pid: null, cands: [], why: 'no name' };
  const names = [who.name, ...(who.alts || [])];
  let L = people.map(p => ({ p, s: Math.max(...names.map(n => Math.max(fit(n, p.name), p.sys ? fit(n, p.sys) : 0))) })).filter(x => x.s >= 0.6);
  const b = brandKey(who.team && /virgin|friendi|pay/i.test(who.team) ? who.team : who.brand), t = String(who.dep || '').toUpperCase();
  const narrow = f => { const N = L.filter(f); if (N.length) L = N; };
  if (b) narrow(x => brandKey(x.p.brand) === b);
  if (t && /^[A-Z]{2}$/.test(t)) narrow(x => String(x.p.team || '').toUpperCase() === t);
  narrow(x => x.p.inMonth);
  L.sort((x, y) => y.s - x.s || x.p.name.localeCompare(y.p.name));
  if (!L.length) return { pid: null, cands: [], why: `nobody called "${who.name}" in the month` };
  const top = L[0].s, best = L.filter(x => x.s === top);
  if (best.length === 1 && (top >= 0.86 || L.length === 1)) return { pid: best[0].p.pid, cands: L.slice(0, 8).map(x => x.p.pid), score: top };
  return { pid: null, cands: L.slice(0, 8).map(x => x.p.pid), why: `more than one person fits "${who.name}": choose` };
}

// ---------------------------------------------------------------- all of it
/**
 * input: { text } (pasted or typed; an email's text) or { rows } (a sheet). ctx: { y, m } the month the corrections are for (days
 * without a month or a year take it), people: [{ pid, name, sys, team, brand, nid, inMonth }].
 * Returns { groups: [{ who, pid, cands, why, changes: [{ date, v, clear, raw, wide }], src, text }], bad: [{ text, why }], table }.
 */
function parse(input, ctx) {
  const people = ctx.people || [], out = { groups: [], bad: [], table: false };
  const rows = input.rows || rowsOfText(input.text, ctx), T = rows ? fromRows(rows, ctx) : null;
  const LR = !T && rows ? fromLooseRows(rows, ctx) : null;
  if (T && (T.groups.length || T.bad.length)) { out.table = true; out.groups = T.groups; out.bad = T.bad; }
  else if (LR && LR.groups.length) { out.table = true; out.groups = LR.groups; out.bad = LR.bad; }
  else if (input.text != null) {
    for (const line of String(input.text).split(/\r?\n|;/)) { const r = command(line, ctx); if (!r) continue; if (r.bad) out.bad.push(r.bad); else out.groups.push(r.group); }
  }
  for (const g of out.groups) Object.assign(g, match(g.who, people));
  // the same person twice (two lines, or a row and a line): one group, the later value of a day wins
  const by = new Map(), merged = [];
  for (const g of out.groups) {
    const key = g.pid ? 'p:' + g.pid : null;
    if (key && by.has(key)) { const h = by.get(key); for (const c of g.changes) { const i = h.changes.findIndex(x => x.date === c.date); if (i >= 0) h.changes[i] = c; else h.changes.push(c); } h.text += ' · ' + g.text; continue; }
    if (key) by.set(key, g); merged.push(g);
  }
  merged.forEach(g => g.changes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)));
  out.groups = merged;
  return out;
}
/** the cells of the tables in an email's HTML (DOMParser: nothing in it runs or loads) */
function htmlRows(html, DP) {
  const P = DP || (typeof DOMParser !== 'undefined' ? DOMParser : null); if (!P) return null;
  const doc = new P().parseFromString(String(html || ''), 'text/html'), all = [];
  for (const t of doc.querySelectorAll('table')) {
    if (t.querySelector('table')) continue;   // a layout table around the real one
    for (const tr of t.querySelectorAll('tr')) { const r = []; for (const td of tr.children) { if (!/^t[dh]$/i.test(td.tagName)) continue; const n = Math.min(+td.getAttribute('colspan') || 1, 40); for (let i = 0; i < n; i++) r.push(sp(td.textContent)); } if (r.some(Boolean)) all.push(r); }
  }
  return all.length ? all : null;
}
/** the text and the HTML of a saved email (.eml): its parts decoded (base64, quoted-printable), the charset kept */
function emlParts(bytes) {
  const latin = new TextDecoder('latin1').decode(bytes), out = { text: '', html: '' };
  const walk = (raw, depth) => {
    if (depth > 6) return;
    const cut = raw.search(/\r?\n\r?\n/); if (cut < 0) return;
    const head = raw.slice(0, cut).replace(/\r?\n[ \t]+/g, ' '), body = raw.slice(cut).replace(/^\r?\n\r?\n/, '');
    const h = n => { const m = head.match(new RegExp(`^${n}:\\s*(.*)$`, 'im')); return m ? m[1] : ''; };
    const type = h('Content-Type').toLowerCase(), enc = h('Content-Transfer-Encoding').toLowerCase().trim(), cs = (type.match(/charset="?([^";\s]+)/) || [])[1] || 'utf-8';
    const bnd = (h('Content-Type').match(/boundary="?([^";]+)"?/i) || [])[1];
    if (/^multipart\//.test(type) && bnd) { for (const part of body.split('--' + bnd).slice(1)) { if (/^--/.test(part)) break; walk(part.replace(/^\r?\n/, ''), depth + 1); } return; }
    if (!/^text\/(plain|html)/.test(type || 'text/plain') || /attachment/i.test(h('Content-Disposition'))) return;
    let b;
    if (enc === 'base64') { const s = atob(body.replace(/[^A-Za-z0-9+/=]/g, '')); b = Uint8Array.from(s, c => c.charCodeAt(0)); }
    else if (enc === 'quoted-printable') { const s = body.replace(/=\r?\n/g, ''), a = []; for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) { a.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else a.push(s.charCodeAt(i) & 255); } b = Uint8Array.from(a); }
    else b = Uint8Array.from(body, c => c.charCodeAt(0) & 255);
    let t; try { t = new TextDecoder(cs).decode(b); } catch (e) { t = new TextDecoder('utf-8').decode(b); }
    if (/html/.test(type)) out.html = out.html || t; else out.text = out.text || t;
  };
  walk(latin, 0);
  return out;
}
return { parse, valueOf, oneDay, daysOf, rowsOfText, fromRows, fromLooseRows, command, match, fit, htmlRows, emlParts, label, excOf, excLabel, winMin, MON3 };
})(typeof Core !== 'undefined' ? Core : (typeof require !== 'undefined' ? require('./core.js') : null));
if (typeof module !== 'undefined') module.exports = UpdParse;
