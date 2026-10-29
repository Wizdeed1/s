
/* Member Care daily report engine — parsing, classification and metrics. */
(function (root) {
  'use strict';

  /* ---------- small helpers ---------- */

  function parseCsv(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return { headers: [], rows: [] };
    const headers = rows[0].map(h => h.trim());
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].every(v => v.trim() === '')) continue;
      const o = {};
      headers.forEach((h, j) => { o[h] = (rows[i][j] !== undefined ? rows[i][j] : '').trim(); });
      out.push(o);
    }
    return { headers, rows: out };
  }

  // " 00:02:29.724" -> 149.724 ; "" -> null
  function dur(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim();
    if (!s || s.toUpperCase() === 'NA') return null;
    const m = s.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }

  function num(s) {
    if (s === null || s === undefined || s === '') return null;
    if (typeof s === 'number') return s;
    const v = parseFloat(String(s).replace(/,/g, ''));
    return isNaN(v) ? null : v;
  }

  function fmtDur(sec) {
    if (sec === null || sec === undefined || isNaN(sec)) return 'NA';
    const t = Math.round(sec);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function fmtPct(x) { return (x === null || x === undefined || isNaN(x)) ? 'NA' : Math.round(x * 100) + '%'; }
  function fmtInt(x) { return (x === null || x === undefined || isNaN(x)) ? 'NA' : Math.round(x).toLocaleString('en-US'); }

  function excelDate(serial) {
    // Excel 1900 system, with the 1900 leap-year bug
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    return new Date(ms);
  }
  function ymd(d) {
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  function ymdLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- file classification ---------- */

  const BRAND_ORDER = ['postpaid', 'virgin', 'friendi', 'fpay'];

  function brandFromQueues(names) {
    const j = names.join(' | ').toLowerCase();
    const list = names.map(n => n.toLowerCase()).filter(Boolean);
    if (list.length && list.every(n => n.indexOf('virgin postpaid') === 0)) return 'postpaid';
    if (/fpay/.test(j)) return 'fpay';
    if (/virgin/.test(j) || /member care/.test(j)) return 'virgin';
    if (/friendi/.test(j)) return 'friendi';
    return null;
  }

  function classify(name, kind, payload) {
    // kind: 'csv' | 'xls'
    if (kind === 'xls') {
      const first = (payload.rows[0] || []).map(v => String(v === null ? '' : v)).join(' ');
      if (/Tickets Report/i.test(first)) return { type: 'tickets' };
      if (/Call Center History/i.test(first)) return { type: 'history' };
      return { type: 'unknown' };
    }
    const h = payload.headers;
    const has = n => h.indexOf(n) >= 0;
    if (isTicketSheet(payload)) return { type: 'fpayTickets', brand: 'fpay' };
    if (has('Total Queue')) {
      // The Queue column can list several queues for transferred calls, so read the
      // export's own filter string first and fall back to a majority vote.
      const filters = (payload.rows[0] && payload.rows[0]['Filters']) || '';
      let brand = filters ? brandFromQueues([filters]) : null;
      if (!brand) {
        const votes = {};
        payload.rows.forEach(r => {
          (r['Queue'] || '').split(';').forEach(q => {
            const b = brandFromQueues([q.trim()]);
            if (b) votes[b] = (votes[b] || 0) + 1;
          });
        });
        brand = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || null;
      }
      return { type: 'queue', brand };
    }
    if (has('Service Level %') && has('Avg Handle')) {
      const qs = payload.rows.map(r => r['Queue Name'] || '').filter(Boolean);
      return { type: 'calls', brand: brandFromQueues(qs) };
    }
    if (has('ASA') && has('Offer')) {
      const qs = payload.rows.map(r => r['Queue Name'] || '').filter(Boolean);
      return { type: 'sm', brand: brandFromQueues(qs) };
    }
    return { type: 'unknown' };
  }

  /* ---------- section builders ---------- */

  function totalRow(rows) {
    // Genesys puts the roll-up first, with an empty Queue Name
    const t = rows.find(r => !(r['Queue Name'] || '').trim());
    return t || rows[0] || null;
  }

  function voiceFromCalls(rows) {
    const t = totalRow(rows);
    if (!t) return null;
    const presented = num(t['Offer']) || 0;
    const handled = num(t['Answer']) || 0;
    const abandoned = presented - handled;
    return {
      presented, handled, abandoned,
      ansPct: presented ? handled / presented : null,
      abPct: presented ? abandoned / presented : null,
      sl: num(t['Service Level %']),
      aht: dur(t['Avg Handle']),
      asa: dur(t['ASA'])
    };
  }

  // "take the lowest 85% from the total" — sort ascending, average the fastest 85%
  function q85FromQueue(rows, filterFn) {
    let vals = rows
      .filter(r => (filterFn ? filterFn(r) : true))
      .map(r => dur(r['Total Queue']))
      .filter(v => v !== null);
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    const k = Math.max(1, Math.round(vals.length * 0.85));
    let sum = 0;
    for (let i = 0; i < k; i++) sum += vals[i];
    return sum / k;
  }

  const CHANNEL_PATTERNS = {
    facebook: /facebook/i,
    twitter: /twitter/i,
    whatsapp: /whatsapp/i,
    email: /email/i
  };

  function nonVoiceFromSm(rows, channels, asaRule) {
    const queueRows = rows.filter(r => (r['Queue Name'] || '').trim());
    const out = { channels: {}, asa: null, queues: [] };
    channels.forEach(ch => {
      const re = CHANNEL_PATTERNS[ch];
      let n = 0, seen = false;
      queueRows.forEach(r => {
        if (re.test(r['Queue Name'] || '')) { seen = true; n += (num(r['Answer']) || 0); }
      });
      out.channels[ch] = seen ? n : 0;
    });
    queueRows.forEach(r => out.queues.push({ name: r['Queue Name'], answer: num(r['Answer']), asa: dur(r['ASA']) }));

    // Their sheets average whole-second ASA values (Excel shows h:mm:ss, the decimals are dropped)
    const trunc = v => (v === null ? null : Math.floor(v));
    const tot = totalRow(rows);
    const totAsa = tot ? dur(tot['ASA']) : null;
    const all = [];
    if (totAsa !== null) all.push(trunc(totAsa));
    queueRows.forEach(r => { const v = dur(r['ASA']); if (v !== null) all.push(trunc(v)); });
    const fbOnly = queueRows.filter(r => /facebook/i.test(r['Queue Name'] || ''))
      .map(r => dur(r['ASA'])).filter(v => v !== null).map(trunc);
    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

    if (asaRule === 'facebook') out.asa = mean(fbOnly);
    else if (asaRule === 'total') out.asa = totAsa === null ? null : trunc(totAsa);
    else if (asaRule === 'weighted') {
      let w = 0, n = 0;
      queueRows.forEach(r => { const a = dur(r['ASA']), c = num(r['Answer']); if (a !== null && c) { w += a * c; n += c; } });
      out.asa = n ? w / n : null;
    } else out.asa = mean(all); // 'all' — average of every row incl. the roll-up
    out.asaOptions = {
      all: mean(all), facebook: mean(fbOnly),
      total: totAsa === null ? null : trunc(totAsa),
      weighted: (function () { let w = 0, n = 0; queueRows.forEach(r => { const a = dur(r['ASA']), c = num(r['Answer']); if (a !== null && c) { w += a * c; n += c; } }); return n ? w / n : null; })()
    };
    if (tot) { out.presented = num(tot['Offer']); out.handled = num(tot['Answer']); }
    return out;
  }

  /* ---------- Crystal call-history slices ---------- */

  const COL = { date: 3, type: 4, service: 5, sub: 6, language: 8, contact: 9 };
  const TCOL = { date: 3, type: 4, category: 5, sub: 6, status: 7, ticketId: 9, lifeCycle: 10, group: 11, source: 16, contract: 17 };

  const POSTPAID_SERVICES = ['Postpaid', 'Postpaid - الخطوط المفوترة'];

  // Sub Services that describe process, not a reason — never listed, but still counted in the base
  const DEFAULT_SUPPRESSED = [
    'Termination Done',
    "Waiting Customer's Reply/ No Action Needed",
    "Waiting Customer's Reply/No Action Needed",
    'Virgin queues',
    'Friendi queues',
    'Change Agent Spoken Language',
    'Open Ticket - طلب ما زال مفتوح',
    'Open Ticket',
    'New Complaint',
    'Resolved',
    'Follow Up',
    'Dropped Call',
    'Call Dropped'
  ];

  function historyRows(sheetRows) {
    // drop the title row and the header row
    const out = [];
    for (let i = 2; i < sheetRows.length; i++) {
      const r = sheetRows[i];
      if (!r || r[COL.type] === null || r[COL.type] === undefined || r[COL.type] === '') continue;
      out.push(r);
    }
    return out;
  }

  function rowDate(v) {
    if (typeof v === 'number') return ymd(excelDate(v));
    if (typeof v === 'string') {
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[1] + '-' + m[2] + '-' + m[3];
      const m2 = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      if (m2) return m2[3] + '-' + String(m2[2]).padStart(2, '0') + '-' + String(m2[1]).padStart(2, '0');
    }
    return null;
  }

  // dates: one 'yyyy-mm-dd' string, or an array of them (the Sunday report covers Thu–Sat)
  function inDates(d, dates) {
    if (!dates) return true;
    if (Array.isArray(dates)) return dates.indexOf(d) >= 0;
    return d === dates;
  }

  function sliceHistory(rows, brand, dateStr) {
    return rows.filter(r => {
      if (dateStr && !inDates(rowDate(r[COL.date]), dateStr)) return false;
      const type = String(r[COL.type] || '').trim();
      const service = String(r[COL.service] || '').trim();
      if (brand === 'fpay') return type === 'FRiENDi Pay';
      if (brand === 'friendi') return /^FRiENDi/i.test(type) && type !== 'FRiENDi Pay';
      if (brand === 'postpaid') return /^Virgin/i.test(type) && POSTPAID_SERVICES.some(p => service === p || service.indexOf('Postpaid') === 0);
      if (brand === 'virgin') return /^Virgin/i.test(type);
      return false;
    });
  }

  function contactMix(rows, brand) {
    const buckets = { Inquiry: 0, Complaint: 0, 'Service Request': 0 };
    const seen = {}; // keep the wording the export actually uses (Complaint vs Complaints)
    rows.forEach(r => {
      const field = brand === 'fpay' ? String(r[COL.service] || '') : String(r[COL.type] || '');
      const tail = brand === 'fpay' ? field.trim() : field.replace(/^(FRiENDi|Virgin)\s*/i, '').trim();
      let k = null;
      if (/^Inquir/i.test(tail)) k = 'Inquiry';
      else if (/^Complaint/i.test(tail)) k = 'Complaint';
      else if (/^(Service Request|Request)$/i.test(tail)) k = 'Service Request';
      if (!k) return;
      buckets[k]++;
      if (!seen[k]) seen[k] = tail;
    });
    const total = buckets.Inquiry + buckets.Complaint + buckets['Service Request'];
    // FRiENDi Pay's own wording, for a bucket that had no rows that day
    const fallback = brand === 'fpay' ? { Complaint: 'Complaints', 'Service Request': 'Request' } : {};
    const list = Object.keys(buckets).map(k => ({ label: seen[k] || fallback[k] || k, count: buckets[k], pct: total ? buckets[k] / total : 0 }));
    list.sort((a, b) => b.count - a.count);
    return { total, list };
  }

  // Apostrophes differ between exports (U+2019 vs ') — compare on a flattened key
  function norm(s) { return String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase(); }

  function topReasons(rows, suppressed, limit) {
    const counts = new Map(), firstSeen = new Map();
    rows.forEach((r, i) => {
      const s = String(r[COL.sub] || '').trim();
      if (!s) return;
      counts.set(s, (counts.get(s) || 0) + 1);
      if (!firstSeen.has(s)) firstSeen.set(s, i);
    });
    const base = rows.length;
    const supp = new Set((suppressed || DEFAULT_SUPPRESSED).map(norm));
    const list = [];
    counts.forEach((c, s) => {
      if (supp.has(norm(s))) return;
      list.push({ reason: s, count: c, pct: base ? c / base : 0, seenAt: firstSeen.get(s) });
    });
    list.sort((a, b) => (b.count - a.count) || (a.seenAt - b.seenAt));
    return { base, list: list.slice(0, limit || 10) };
  }

  /* ---------- tickets ---------- */

  function ticketRows(sheetRows) {
    const out = [];
    for (let i = 2; i < sheetRows.length; i++) {
      const r = sheetRows[i];
      if (!r || !r[TCOL.type]) continue;
      out.push(r);
    }
    return out;
  }

  /* Postpaid tickets are the Virgin tickets in the Billing, End service and Migration categories,
     less the two prepaid / CITC sub categories; the sub categories that describe the same thing
     are counted as one. */
  const POSTPAID_TICKETS = {
    categories: ['Billing', 'End service', 'Migration'],
    exclude: ['Final Prepaid Deactivation', 'The number not removed from CITC / SEMATI'],
    merge: {
      'Final Postpaid Deactivation': 'Final Switch Postpaid Deactivation',
      'From Pre to new postpaid plans': 'From Pre to Switch postpaid plans',
      'Post-To-Pre': 'From Switch postpaid plans to Pre'
    }
  };
  function mergedSub(v) {
    const k = norm(v || '');
    for (const from in POSTPAID_TICKETS.merge) if (norm(from) === k) return POSTPAID_TICKETS.merge[from];
    return String(v || '').trim();
  }

  // opts.merge false: each sub category as the export has it (the weekly deck lists them apart)
  function sliceTickets(rows, brand, dateStr, opts) {
    const ppCats = POSTPAID_TICKETS.categories.map(norm), ppOut = POSTPAID_TICKETS.exclude.map(norm);
    return rows.filter(r => {
      if (dateStr && !inDates(rowDate(r[TCOL.date]), dateStr)) return false;
      const type = String(r[TCOL.type] || '');
      const isFriendi = /friendi/i.test(type);
      if (brand === 'friendi') return isFriendi;
      if (brand === 'virgin') return !isFriendi;
      if (brand === 'postpaid') {
        return !isFriendi && ppCats.indexOf(norm(r[TCOL.category] || '')) >= 0 && ppOut.indexOf(norm(r[TCOL.sub] || '')) < 0;
      }
      return false;
    }).map(r => {
      if (brand !== 'postpaid' || (opts && opts.merge === false)) return r;
      const c = r.slice(); c[TCOL.sub] = mergedSub(r[TCOL.sub]); return c;
    });
  }

  function tally(rows, colIndex, limit, fromEnd) {
    const counts = new Map(), firstSeen = new Map();
    if (fromEnd) rows = rows.slice().reverse();
    rows.forEach((r, i) => {
      const v = String(r[colIndex] || '').trim();
      if (!v) return;
      counts.set(v, (counts.get(v) || 0) + 1);
      if (!firstSeen.has(v)) firstSeen.set(v, i);
    });
    const list = [];
    counts.forEach((c, v) => list.push({ label: v, count: c, seenAt: firstSeen.get(v) }));
    list.sort((a, b) => (b.count - a.count) || (a.seenAt - b.seenAt));
    return limit ? list.slice(0, limit) : list;
  }

  // the day a Genesys export covers, read from its Interval Start column
  function intervalDate(rows) {
    for (const r of (rows || [])) {
      const s = r['Interval Start'];
      if (!s) continue;
      let m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (m) {
        let y = +m[3]; if (y < 100) y += 2000;
        return y + '-' + String(+m[1]).padStart(2, '0') + '-' + String(+m[2]).padStart(2, '0');
      }
      m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[0];
    }
    return null;
  }

  /* ---------- dates ---------- */

  function addDays(dateStr, n) {
    const p = dateStr.split('-');
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return ymd(d);
  }
  function dayDiff(a, b) {           // b - a, in days
    const pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  }
  function weekday(dateStr) { const p = dateStr.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function dateRange(start, end) {
    const out = [];
    for (let d = start; d <= end && out.length < 62; d = addDays(d, 1)) out.push(d);
    return out;
  }

  // Genesys stamps: "9/10/26 12:00 AM" (month first), "9/10/2026 00:00", "2026-09-10T00:00"
  function parseStamp(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([AaPp][Mm])?)?/);
    if (m) {
      let y = +m[3]; if (y < 100) y += 2000;
      let hh = m[4] ? +m[4] : 0;
      if (m[6]) { const pm = /p/i.test(m[6]); if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
      return { date: y + '-' + String(+m[1]).padStart(2, '0') + '-' + String(+m[2]).padStart(2, '0'), hh: hh, mm: m[5] ? +m[5] : 0 };
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (m) return { date: m[1] + '-' + m[2] + '-' + m[3], hh: m[4] ? +m[4] : 0, mm: m[5] ? +m[5] : 0 };
    return null;
  }

  const DAY_COLUMNS = ['Interval Start', 'Date', 'Start Date', 'Conversation Start', 'Conversation Date', 'Start Time'];
  function rowStamp(r) {
    for (const c of DAY_COLUMNS) {
      if (r[c] === undefined || r[c] === '') continue;
      const p = parseStamp(r[c]);
      if (p) return p;
    }
    return null;
  }

  /* One Genesys export may hold one day or several (a Sunday export run for Thu–Sat
     with a daily interval). Split it into days. A single interval that spans several
     days can't be split — that's reported back so the file can be re-exported by day. */
  function splitByDay(rows) {
    const days = {}, undated = [];
    let span = null;
    rows.forEach(r => {
      const st = rowStamp(r);
      if (!st) { undated.push(r); return; }
      const en = r['Interval End'] ? parseStamp(r['Interval End']) : null;
      if (en) {
        // an end stamp at midnight belongs to the day before
        const last = (en.hh === 0 && en.mm === 0 && en.date > st.date) ? addDays(en.date, -1) : en.date;
        if (last > st.date && (!span || dayDiff(span.start, span.end) < dayDiff(st.date, last))) span = { start: st.date, end: last };
      }
      (days[st.date] = days[st.date] || []).push(r);
    });
    const keys = Object.keys(days).sort();
    // rows without a stamp (a roll-up line, say) belong to the file's only day
    if (undated.length && keys.length === 1) { days[keys[0]] = days[keys[0]].concat(undated); undated.length = 0; }
    return { days: days, dates: keys, undated: undated, span: span };
  }

  /* FRiENDi Pay tickets arrive as a table pasted from the mail. Handles, in any order:
       Date | Category | SubCategory      (one ticket per line, header optional)
       Category | SubCategory | Total     (already counted)
     Cells may be separated by tabs (a table pasted from Outlook), "|" or 2+ spaces. */
  function parsePastedTickets(text, dates) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
    const split = l => {
      let cells;
      if (l.indexOf('\t') >= 0) cells = l.split('\t');
      else if (l.indexOf('|') >= 0) cells = l.split('|');
      else if (/\S\s{2,}\S/.test(l)) cells = l.split(/\s{2,}/);
      else {
        const m = l.match(/^(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm])?)?|\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?)\s+(.+)$/);
        cells = m ? [m[1], m[2]] : [l];
      }
      return cells.map(c => c.trim());
    };
    const isDate = c => /^(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/.test(c);
    const cellDate = c => {
      const m = String(c).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (m) { let y = +m[3]; if (y < 100) y += 2000; return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0'); }
      return rowDate(c);
    };

    let map = null;
    const rows = [];
    lines.forEach(l => {
      const cells = split(l);
      const low = cells.map(c => c.toLowerCase());
      // header line?
      if (!cells.some(isDate) && low.some(c => /categ/.test(c))) {
        map = {
          date: low.findIndex(c => /date|created/.test(c)),
          sub: low.findIndex(c => /sub\s*-?\s*categ/.test(c)),
          cat: low.findIndex(c => /categ/.test(c) && !/sub/.test(c)),
          count: low.findIndex(c => /^(total|count|tickets?|no\.? of tickets|number of tickets|#)$/.test(c))
        };
        return;
      }
      let date = null, cat = '', sub = '', count = 1;
      if (map && map.cat >= 0) {
        if (map.date >= 0 && cells[map.date]) date = cellDate(cells[map.date]);
        cat = cells[map.cat] || '';
        if (map.sub >= 0) sub = cells[map.sub] || '';
        if (map.count >= 0) { const n = parseInt(String(cells[map.count] || '').replace(/,/g, ''), 10); count = isNaN(n) ? 1 : n; }
      } else {
        const rest = [];
        cells.forEach(c => { if (!date && isDate(c)) date = cellDate(c); else if (c) rest.push(c); });
        // a trailing whole number on an undated line is a count ("Card | Can't add | 18")
        if (!date && rest.length >= 2 && /^\d{1,5}$/.test(rest[rest.length - 1])) count = +rest.pop();
        cat = rest[0] || ''; sub = rest[1] || '';
      }
      cat = cat.trim(); sub = sub.trim();
      // "Category::SubCategory" in one cell
      if (!sub && cat.indexOf('::') >= 0) { sub = cat.slice(cat.indexOf('::') + 2).trim(); cat = cat.slice(0, cat.indexOf('::')).trim(); }
      if (!cat || /^(grand\s+)?total(\s+tickets(\s+created)?)?:?$/i.test(cat)) return;
      rows.push({ date: date, category: cat, sub: sub, count: count });
    });

    const f = ticketsOnDays(rows, dates);
    return Object.assign(summariseTickets(f.kept), { dropped: f.dropped });
  }

  /* FRiENDi Pay ticket sheets — every line is "Category::SubCategory":
       Sunday:        "Tickets by Category-data" (.csv) — Category.keyword | Unique Count (already counted)
       Monday–Thu:    a sheet of single tickets (.xlsx or .csv) — Date | Category
     A label without "::" repeats itself as the subcategory ("AML Sanction | AML Sanction"), as in the sent mails. */
  const TK_CAT = /^category(\.keyword)?$/i, TK_CNT = /count|total|tickets/i, TK_DATE = /date|created/i;
  function isTicketsByCategory(headers) {
    const low = headers.map(h => String(h).toLowerCase());
    return low.indexOf('interval start') < 0 && headers.some(h => TK_CAT.test(h)) && headers.some(h => TK_CNT.test(h));
  }
  function isTicketSheet(payload) {
    const cat = payload.headers.find(h => TK_CAT.test(h));
    if (!cat || payload.headers.indexOf('Interval Start') >= 0) return false;
    return isTicketsByCategory(payload.headers) || payload.rows.some(r => String(r[cat] || '').indexOf('::') >= 0);
  }
  // "20/09/2026" (day first), "2026-09-20", or an Excel date number
  function ticketDate(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v > 20000 && v < 80000 ? ymd(excelDate(v)) : null;
    const m = String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0'); }
    return rowDate(String(v).trim());
  }
  function parseTicketSheet(payload) {
    const catCol = payload.headers.find(h => TK_CAT.test(h));
    const cntCol = payload.headers.find(h => TK_CNT.test(h));
    const dateCol = payload.headers.find(h => TK_DATE.test(h));
    const rows = [];
    payload.rows.forEach(r => {
      const label = String(r[catCol] === null || r[catCol] === undefined ? '' : r[catCol]).trim();
      if (!label || /^(grand\s+)?total$/i.test(label)) return;
      const cut = label.indexOf('::');
      const cat = (cut >= 0 ? label.slice(0, cut) : label).trim();
      const n = cntCol ? num(r[cntCol]) : null;
      rows.push({ date: dateCol ? ticketDate(r[dateCol]) : null, category: cat,
                  sub: (cut >= 0 ? label.slice(cut + 2).trim() : cat) || cat, count: n === null ? 1 : n });
    });
    return rows;
  }
  const parseTicketsByCategory = parseTicketSheet;

  // keep the report's day(s) when lines carry dates — unless that would leave nothing
  function ticketsOnDays(rows, dates) {
    if (!dates) return { kept: rows, dropped: 0 };
    const onDay = rows.filter(r => !r.date || inDates(r.date, dates));
    if (onDay.length) return { kept: onDay, dropped: rows.length - onDay.length };
    return { kept: rows, dropped: rows.length ? -1 : 0 };        // -1: every line is from another day
  }

  /* ---------- MC Leaders tickets ----------
     The EXECUTIVE TKTs Dashboard workbook, sheet "Data Row": one line per ticket. Everything the
     daily MC Leaders mail shows is worked out from it — the closure split, the time buckets and
     the category table — for the tickets assigned to MC Leaders on the report's day(s). */
  function isLeaderTickets(payload) {
    const h = payload.headers.map(x => String(x).toLowerCase().trim());
    return h.indexOf('assigned to') >= 0 && h.indexOf('sub category') >= 0 &&
      (h.indexOf('call date') >= 0 || h.indexOf('ticket id') >= 0);
  }
  // "0 Day(s) 0:23:9 Hours" -> 0.3858 ; the workbook's own Close Hours column wins when present
  function lifeCycleHours(v) {
    const m = String(v || '').match(/(\d+)\s*Day\(?s?\)?\s*(\d+):(\d+):(\d+)/i);
    if (!m) { const t = dur(v); return t === null ? null : t / 3600; }
    return (+m[1]) * 24 + (+m[2]) + (+m[3]) / 60 + (+m[4]) / 3600;
  }
  function leaderTickets(payload) {
    const col = name => payload.headers.find(h => String(h).toLowerCase().trim() === name);
    const cDate = col('call date'), cCat = col('category'), cSub = col('sub category'),
          cStatus = col('status'), cWho = col('assigned to'), cHours = col('close hours'), cLife = col('life cycle');
    return payload.rows.map(r => {
      const hours = cHours !== undefined ? num(r[cHours]) : null;
      return {
        date: cDate !== undefined ? ticketDate(r[cDate]) : null,
        category: String(r[cCat] === null || r[cCat] === undefined ? '' : r[cCat]).trim(),
        sub: String(r[cSub] === null || r[cSub] === undefined ? '' : r[cSub]).trim(),
        status: String(r[cStatus] === null || r[cStatus] === undefined ? '' : r[cStatus]).trim(),
        assigned: String(r[cWho] === null || r[cWho] === undefined ? '' : r[cWho]).trim(),
        hours: hours !== null ? hours : (cLife !== undefined ? lifeCycleHours(r[cLife]) : null)
      };
    }).filter(r => r.category || r.sub || r.assigned);
  }

  // the dashboard's own bands: from the lower bound up to (not including) the upper one
  const LEADER_BUCKETS = [
    { key: 'b2', label: '≤ 2h', test: h => h >= 0 && h < 2 },
    { key: 'b4', label: '2 – 4h', test: h => h >= 2 && h < 4 },
    { key: 'b8', label: '4 – 8h', test: h => h >= 4 && h < 8 },
    { key: 'b9', label: '> 8h', test: h => h >= 8 }
  ];

  /* The same tickets straight from the Crystal tickets export (.xls) — the file the brand
     reports already use. Its columns are the dashboard's Data Row: Life Cycle, Assigned to … */
  function leaderRowsFromTickets(rows) {
    const s = v => String(v === null || v === undefined ? '' : v).trim();
    return (rows || []).map(r => ({
      date: rowDate(r[TCOL.date]),
      category: s(r[TCOL.category]),
      sub: s(r[TCOL.sub]),
      status: s(r[TCOL.status]),
      assigned: s(r[TCOL.group]),
      hours: lifeCycleHours(r[TCOL.lifeCycle])
    })).filter(r => r.category || r.sub || r.assigned);
  }
  function leaderStats(rows) {
    // as the dashboard counts them: COUNTIF Status = Closed / Open / Pending, and the time
    // bands and the average over the closed tickets only
    const blank = () => { const o = { total: 0, closed: 0, open: 0, pending: 0, other: 0, noTime: 0, hours: [] };
      LEADER_BUCKETS.forEach(b => { o[b.key] = 0; }); return o; };
    const add = (o, r) => {
      o.total++;
      const st = String(r.status || '').trim().toLowerCase();
      if (st === 'closed') o.closed++;
      else if (st === 'open') o.open++;
      else if (st === 'pending') o.pending++;
      else o.other++;
      if (st !== 'closed') return;
      if (r.hours !== null && r.hours !== undefined && !isNaN(r.hours)) {
        o.hours.push(r.hours);
        const b = LEADER_BUCKETS.find(x => x.test(r.hours));
        if (b) o[b.key]++;
      } else o.noTime++;
    };
    const all = blank(), by = new Map();
    rows.forEach(r => {
      add(all, r);
      const k = r.category + '\u0000' + r.sub;
      if (!by.has(k)) by.set(k, Object.assign(blank(), { category: r.category, sub: r.sub }));
      add(by.get(k), r);
    });
    const done = o => {
      o.avg = o.hours.length ? o.hours.reduce((a, b) => a + b, 0) / o.hours.length : null;
      o.closurePct = o.total ? o.closed / o.total : null;
      o.within2Pct = o.closed ? o[LEADER_BUCKETS[0].key] / o.closed : null;
      delete o.hours;
      return o;
    };
    const list = Array.from(by.values()).map(done);
    list.sort((a, b) => (b.total - a.total) || a.category.localeCompare(b.category) || a.sub.localeCompare(b.sub));
    list.forEach(o => { o.share = all.total ? o.total / all.total : 0; });
    return { all: done(all), list: list, buckets: LEADER_BUCKETS.map(b => ({ label: b.label, count: all[b.key] })) };
  }

  // a sheet as { headers, rows: [{header: value}] }, the header being its first non-empty row
  function sheetPayload(rows2d) {
    const filled = r => (r || []).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    let h = 0; while (h < rows2d.length && !filled(rows2d[h])) h++;
    const headers = Array.from(rows2d[h] || [], v => (v === null || v === undefined) ? '' : String(v).trim());
    const out = [];
    for (let i = h + 1; i < rows2d.length; i++) {
      if (!filled(rows2d[i])) continue;
      const o = {}; headers.forEach((k, j) => { o[k] = rows2d[i][j] === undefined ? null : rows2d[i][j]; });
      out.push(o);
    }
    return { headers: headers, rows: out };
  }

  function summariseTickets(kept) {
    const pairs = new Map(), cats = new Map();
    kept.forEach(r => {
      const k = r.category + '\u0000' + r.sub;
      pairs.set(k, (pairs.get(k) || 0) + r.count);
      cats.set(r.category, (cats.get(r.category) || 0) + r.count);
    });
    const groups = [];
    pairs.forEach((c, k) => { const p = k.split('\u0000'); groups.push({ category: p[0], sub: p[1], count: c }); });
    groups.sort((a, b) => (b.count - a.count) || a.category.localeCompare(b.category) || a.sub.localeCompare(b.sub));
    const list = [];
    cats.forEach((c, v) => list.push({ label: v, count: c }));
    list.sort((a, b) => b.count - a.count);
    const total = kept.reduce((a, r) => a + r.count, 0);
    return { total: total, list: list, groups: groups, hasSub: kept.some(r => r.sub), dropped: 0 };
  }

  /* ---------- history / averages ---------- */

  function monthKey(dateStr) { return dateStr.slice(0, 7) + '-01'; }

  function mean(arr) {
    const v = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  function averageRow(rows, fields) {
    const out = {};
    fields.forEach(f => { out[f] = mean(rows.map(r => r[f])); });
    return out;
  }

  root.Engine = {
    parseCsv, dur, num, fmtDur, fmtPct, fmtInt, excelDate, ymd, ymdLocal,
    classify, totalRow, voiceFromCalls, q85FromQueue, nonVoiceFromSm,
    historyRows, ticketRows, sliceHistory, sliceTickets, contactMix, topReasons,
    tally, parsePastedTickets, intervalDate, rowDate, monthKey, mean, averageRow,
    addDays, dayDiff, weekday, dateRange, parseStamp, rowStamp, splitByDay, inDates,
    isTicketsByCategory, parseTicketsByCategory, isTicketSheet, parseTicketSheet, ticketsOnDays, sheetPayload, ticketDate, summariseTickets,
    isLeaderTickets, leaderTickets, leaderRowsFromTickets, leaderStats, lifeCycleHours, LEADER_BUCKETS,
    DEFAULT_SUPPRESSED, POSTPAID_SERVICES, COL, TCOL
  };
})(typeof module !== 'undefined' ? module.exports : window);

