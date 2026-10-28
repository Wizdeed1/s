/* MC Monthly Report Builder - engine (no dependencies; runs in browsers and Node 18+) */
'use strict';
const Core = (() => {

// ============================================================ constants
const DEP_ORDER = ['CC', 'SM', 'CT', 'MG', 'OP', 'TS', 'QA', 'WF', 'DE'];   // DE last: the order of the departments before it is as it was
const DEP_NAMES = { CC: 'Customer Care', SM: 'Social Media', CT: 'Complaint Team', MG: 'Management Group',
  OP: 'Operation Supervisors', TS: 'Tele-Sales', QA: 'Quality Assurance', WF: 'Workforce' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================ small helpers
const normSpace = s => String(s ?? '').replace(/[ ​‎‏﻿]/g, ' ').replace(/\s+/g, ' ').trim();
const normName = s => normSpace(s).toLowerCase();
const isBlank = v => v == null || (typeof v === 'string' && normSpace(v) === '');
const cellStr = v => (v instanceof Date ? v.toISOString().slice(0, 10) : normSpace(v));
function cleanId(v) {
  if (v == null || v === '') return '';
  let s = typeof v === 'number' ? String(Math.round(v)) : String(v);
  s = s.replace(/\D/g, '');
  return s.length >= 6 ? s : '';
}
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const EPOCH = Date.UTC(1899, 11, 30);
const serialToDate = n => new Date(EPOCH + Math.round(n * 86400000));
const ymdSerial = (y, m, d) => (Date.UTC(y, m - 1, d) - EPOCH) / 86400000;
/** a date cell -> 'YYYY-MM-DD' ('' when it is not one): a date, an Excel serial, 2026-01-18, 18/01/2026 (day first, unless only
    the second number can be a month's day: 01/18/2026), 18-Jan-2026, 18 January 2026, Jan 18, 2026 */
function cleanDate(v) {
  const ok = (y, m, d) => (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '');
  const ofDate = d => ok(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (v instanceof Date) return isNaN(v) ? '' : ofDate(v);
  if (typeof v === 'number') return v > 20000 && v < 80000 ? ofDate(serialToDate(v)) : '';
  const s = normSpace(v), mon = w => MON.findIndex(x => x.toLowerCase() === String(w).slice(0, 3).toLowerCase()) + 1;
  let m;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(s))) return ok(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?: .*)?$/.exec(s))) return +m[1] <= 12 && +m[2] > 12 ? ok(+m[3], +m[1], +m[2]) : ok(+m[3], +m[2], +m[1]);
  if ((m = /^(\d{1,2})[-\s]+([a-z]{3,})\.?[-\s,]+(\d{4})$/i.exec(s))) return mon(m[2]) ? ok(+m[3], mon(m[2]), +m[1]) : '';
  if ((m = /^([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(s))) return mon(m[1]) ? ok(+m[3], mon(m[1]), +m[2]) : '';
  if (/^\d{5}(\.\d+)?$/.test(s)) return cleanDate(+s);
  return '';
}
const weekday = (y, m, d) => WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
const round6 = x => Math.round(x * 1e6) / 1e6;
function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
const ref = (r, c) => colName(c) + r;
function lev(a, b) {
  if (a === b) return 0; const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

function normDep(v) {
  const s = normSpace(v); if (!s) return '';
  const u = s.toUpperCase();
  if (DEP_ORDER.includes(u)) return u;
  if (/^F\s*PAY$/i.test(s)) return 'CC';
  const l = s.toLowerCase();
  if (/customer\s*care|call\s*cent/.test(l)) return 'CC';
  if (/social/.test(l)) return 'SM';
  if (/complain/.test(l)) return 'CT';
  if (/manage/.test(l)) return 'MG';
  if (/operation|supervis/.test(l)) return 'OP';
  if (/tele\s*-?\s*sales|telesales/.test(l)) return 'TS';
  if (/quality/.test(l)) return 'QA';
  if (/work\s*force|wfm/.test(l)) return 'WF';
  return u.length <= 4 ? u : s;
}
function looksDep(v) { const s = normSpace(v); if (!s) return false; const d = normDep(s); return DEP_ORDER.includes(d); }
function normTeam(v) {
  const s = normSpace(v); if (!s) return '';
  if (/f\s*pay|friendi\s*pay/i.test(s)) return 'Friendi Pay';
  if (/friendi/i.test(s)) return 'Friendi';
  if (/virgin/i.test(s)) return 'Virgin';
  return s;
}
const looksTeam = v => /virgin|friendi|f\s*pay/i.test(normSpace(v));
function normStatus(v) {
  const s = normSpace(v); if (!s) return '';
  if (/in\s*-?\s*active|resign|terminat|\bleft\b|exit|disabled/i.test(s)) return 'Inactive';
  if (/active/i.test(s)) return 'Active';
  return '';
}

// ============================================================ zip (read + write)
async function streamThrough(u8, ts) {
  const stream = new Blob([u8]).stream().pipeThrough(ts);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const inflateRaw = u8 => streamThrough(u8, new DecompressionStream('deflate-raw'));
async function deflateRaw(u8) {
  if (typeof CompressionStream === 'undefined') return null;
  try { return await streamThrough(u8, new CompressionStream('deflate-raw')); } catch (e) { return null; }
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

async function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65558); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const td = new TextDecoder(); const entries = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const fnl = dv.getUint16(p + 28, true), exl = dv.getUint16(p + 30, true), cml = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + fnl));
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    entries[name] = { method, data: u8.subarray(start, start + csize) };
    p += 46 + fnl + exl + cml;
  }
  const find = name => entries[name] || entries[Object.keys(entries).find(k => k.toLowerCase() === name.toLowerCase())];
  return {
    has: name => !!find(name),
    names: () => Object.keys(entries),
    async text(name) {
      const e = find(name); if (!e) return null;
      const raw = e.method === 0 ? e.data : await inflateRaw(e.data);
      return new TextDecoder().decode(raw);
    },
    async bytes(name) {
      const e = find(name); if (!e) return null;
      return e.method === 0 ? e.data : await inflateRaw(e.data);
    }
  };
}

/* ---- .xlsb (BIFF12) reader: same output shape as readXlsx */
function* biffRecords(u8) {
  let i = 0;
  while (i < u8.length) {
    let t = u8[i++]; if (t & 0x80) t = (t & 0x7f) | ((u8[i++] & 0x7f) << 7);
    let size = 0, shift = 0;
    for (let k = 0; k < 4; k++) { const b = u8[i++]; size |= (b & 0x7f) << shift; shift += 7; if (!(b & 0x80)) break; }
    yield { t, d: u8.subarray(i, i + size) }; i += size;
  }
}
function biffWide(d, off) {   // XLWideString: 4-byte count, then UTF-16LE
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength), n = dv.getUint32(off, true);
  if (n === 0xFFFFFFFF) return { s: null, end: off + 4 };
  let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(dv.getUint16(off + 4 + k * 2, true));
  return { s, end: off + 4 + n * 2 };
}
function biffRk(rk) {
  let v;
  if (rk & 2) v = rk >> 2;
  else { const b = new DataView(new ArrayBuffer(8)); b.setUint32(4, rk & 0xFFFFFFFC, true); b.setUint32(0, 0, true); v = b.getFloat64(0, true); }
  return rk & 1 ? v / 100 : v;
}
async function readXlsb(buf) {
  const z = await readZip(buf);
  const wb = await z.bytes('xl/workbook.bin');
  if (!wb) throw new Error('not an xlsb workbook');
  const relXml = await z.text('xl/_rels/workbook.bin.rels') || '';
  const rels = {}; for (const m of relXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) rels[attr(m[1], 'Id')] = attr(m[1], 'Target');
  const sst = [];
  const sb = await z.bytes('xl/sharedStrings.bin');
  if (sb) for (const r of biffRecords(sb)) if (r.t === 19) sst.push(biffWide(r.d, 1).s || '');
  const dateXf = [];
  const stb = await z.bytes('xl/styles.bin');
  if (stb) {
    const custom = {}; let inXfs = false;
    for (const r of biffRecords(stb)) {
      const dv = new DataView(r.d.buffer, r.d.byteOffset, r.d.byteLength);
      if (r.t === 44) custom[dv.getUint16(0, true)] = biffWide(r.d, 2).s || '';
      else if (r.t === 617) inXfs = true;
      else if (r.t === 618) inXfs = false;
      else if (r.t === 47 && inXfs) { const id = dv.getUint16(2, true); dateXf.push(BUILTIN_DATE.has(id) || (custom[id] != null && fmtIsDate(custom[id]))); }
    }
  }
  const sheets = [];
  for (const r of biffRecords(wb)) {
    if (r.t !== 156) continue;   // BrtBundleSh
    const dv = new DataView(r.d.buffer, r.d.byteOffset, r.d.byteLength);
    const st = dv.getUint32(0, true), rid = biffWide(r.d, 8), name = biffWide(r.d, rid.end).s;
    let t = rels[rid.s] || ''; t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    const bin = await z.bytes(t);
    sheets.push({ name, state: st === 0 ? 'visible' : 'hidden', rows: bin ? parseSheetBin(bin, sst, dateXf) : [] });
  }
  return sheets;
}
function parseSheetBin(u8, sst, dateXf) {
  const rows = []; let row = null, rw = -1, lastCol = -1;
  const put = (c, v, sty) => {
    if (!row) return;
    if (typeof v === 'number' && dateXf[sty] && v > 0 && v < 2958466) v = serialToDate(v);
    row[c] = v; lastCol = c;
  };
  for (const r of biffRecords(u8)) {
    const d = r.d, dv = new DataView(d.buffer, d.byteOffset, d.byteLength), t = r.t;
    if (t === 0) { rw = dv.getUint32(0, true); row = rows[rw] = rows[rw] || []; lastCol = -1; continue; }
    if (t >= 1 && t <= 11) {   // full cells: col(4) + style(3) + flags(1) + value
      const c = dv.getUint32(0, true), sty = d[4] | (d[5] << 8) | (d[6] << 16);
      if (t === 2) put(c, biffRk(dv.getInt32(8, true)), sty);
      else if (t === 5 || t === 9) put(c, dv.getFloat64(8, true), sty);
      else if (t === 6 || t === 8) put(c, biffWide(d, 8).s, sty);
      else if (t === 7) put(c, sst[dv.getUint32(8, true)] ?? '', sty);
      else if (t === 4 || t === 10) put(c, d[8] === 1, sty);
      else if (t === 3 || t === 11) put(c, '#ERR', sty);
      else lastCol = c;
      continue;
    }
    if (t >= 12 && t <= 18) {  // short cells: column = previous + 1
      const c = lastCol + 1, sty = d[0] | (d[1] << 8) | (d[2] << 16);
      if (t === 13) put(c, biffRk(dv.getInt32(4, true)), sty);
      else if (t === 16) put(c, dv.getFloat64(4, true), sty);
      else if (t === 17) put(c, biffWide(d, 4).s, sty);
      else if (t === 18) put(c, sst[dv.getUint32(4, true)] ?? '', sty);
      else if (t === 15) put(c, d[4] === 1, sty);
      else if (t === 14) put(c, '#ERR', sty);
      else lastCol = c;
    }
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}

async function writeZip(files) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const nameB = enc.encode(f.name); const crc = crc32(data);
    let comp = await deflateRaw(data); let method = 8;
    if (!comp || comp.length >= data.length) { comp = data; method = 0; }
    const lh = new Uint8Array(30 + nameB.length); const l = new DataView(lh.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(8, method, true);
    l.setUint16(10, dosTime, true); l.setUint16(12, dosDate, true); l.setUint32(14, crc, true);
    l.setUint32(18, comp.length, true); l.setUint32(22, data.length, true); l.setUint16(26, nameB.length, true); lh.set(nameB, 30);
    const ch = new Uint8Array(46 + nameB.length); const c = new DataView(ch.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, method, true); c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, comp.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nameB.length, true);
    c.setUint32(42, offset, true); ch.set(nameB, 46);
    parts.push(lh, comp); central.push(ch); offset += lh.length + comp.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array(22); const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, end]; const total = all.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total); let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ============================================================ xlsx reader
function xmlDecode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const l = e.toLowerCase();
    if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'quot') return '"'; if (l === 'apos') return "'";
    return String.fromCodePoint(l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10));
  }).replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}
function attr(s, name) { const m = s.match(new RegExp('(?:^|\\s)' + name.replace(':', '\\:') + '="([^"]*)"')); return m ? xmlDecode(m[1]) : null; }
function siText(x) {
  x = x.replace(/<rPh\b[\s\S]*?<\/rPh>/g, ''); let s = '';
  for (const m of x.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) s += xmlDecode(m[1]);
  return s;
}
const BUILTIN_DATE = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
function fmtIsDate(code) {
  const s = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[dy]/i.test(s) || /m{3,}/i.test(s);
}
function colIdx(letters) { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }

async function readXlsx(buf) {
  const z = await readZip(buf);
  const wb = await z.text('xl/workbook.xml');
  if (!wb) throw new Error('not an xlsx workbook');
  const relXml = await z.text('xl/_rels/workbook.xml.rels') || '';
  const rels = {}; for (const m of relXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) rels[attr(m[1], 'Id')] = attr(m[1], 'Target');
  const sst = [];
  const sx = await z.text('xl/sharedStrings.xml');
  if (sx) for (const m of sx.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) sst.push(m[1] ? siText(m[1]) : '');
  const dateXf = [];
  const stx = await z.text('xl/styles.xml');
  if (stx) {
    const custom = {};
    for (const m of stx.matchAll(/<numFmt\b([^>]*?)\/?>/g)) custom[+attr(m[1], 'numFmtId')] = attr(m[1], 'formatCode') || '';
    const cx = (stx.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || '';
    for (const m of cx.matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/g)) {
      const id = +(attr(m[1], 'numFmtId') || 0);
      dateXf.push(BUILTIN_DATE.has(id) || (id >= 164 && custom[id] != null && fmtIsDate(custom[id])) || (id < 164 && custom[id] != null && fmtIsDate(custom[id])));
    }
  }
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = attr(m[1], 'name'), rid = attr(m[1], 'r:id'), state = attr(m[1], 'state') || 'visible';
    let t = rels[rid] || ''; t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    const xml = await z.text(t);
    sheets.push({ name, state, rows: xml ? parseSheetXml(xml, sst, dateXf) : [] });
  }
  return sheets;
}
function parseSheetXml(xml, sst, dateXf) {
  const rows = []; let rAuto = 0;
  const sd = xml.match(/<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/); if (!sd) return rows;
  for (const rm of sd[1].matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rAttr = attr(rm[1], 'r'); const r = rAttr ? +rAttr : rAuto + 1; rAuto = r;
    const row = []; let cAuto = 0;
    for (const cm of (rm[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = cm[1]; const rr = attr(a, 'r'); const c = rr ? colIdx(rr.replace(/\d+/g, '')) : cAuto + 1; cAuto = c;
      const t = attr(a, 't'), s = +(attr(a, 's') || 0), body = cm[2] || '';
      const vm = body.match(/<v>([\s\S]*?)<\/v>/); const raw = vm ? xmlDecode(vm[1]) : null;
      let v = null;
      if (t === 's') v = raw != null ? (sst[+raw] ?? '') : null;
      else if (t === 'inlineStr') { const im = body.match(/<is>([\s\S]*?)<\/is>/); v = im ? siText(im[1]) : ''; }
      else if (t === 'str' || t === 'e') v = raw;
      else if (t === 'b') v = raw === '1';
      else if (t === 'd') v = raw ? new Date(raw) : null;
      else if (raw != null && raw !== '') { const n = +raw; v = Number.isFinite(n) ? (dateXf[s] && n > 0 && n < 2958466 ? serialToDate(n) : n) : raw; }
      row[c - 1] = v;
    }
    rows[r - 1] = row;
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}

// ============================================================ csv
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.slice(0, text.indexOf('\n') > 0 ? text.indexOf('\n') : text.length);
  const cnt = ch => first.split(ch).length - 1;
  const delim = [',', ';', '\t'].sort((a, b) => cnt(b) - cnt(a))[0];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// ============================================================ value parsing
function parseHeaderDate(v) {
  if (v instanceof Date) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
  if (typeof v === 'number') { if (v > 20000 && v < 80000) { const d = serialToDate(v); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; } return null; }
  const s = normSpace(v); if (!s) return null; let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { y: +m[1], m: +m[2], d: +m[3] };
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:\s.*)?$/))) { let y = +m[3]; if (y < 100) y += 2000; return { y, m: +m[1], d: +m[2], alt: { y, m: +m[2], d: +m[1] } }; }
  const mi = t => MON.findIndex(x => x.toLowerCase() === t.slice(0, 3).toLowerCase()) + 1;
  if ((m = s.match(/^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})[\s\-]([A-Za-z]{3,9})(?:[\s\-,]+(\d{2,4}))?$/)) && mi(m[2])) { let y = m[3] ? +m[3] : 0; if (y && y < 100) y += 2000; return { y, m: mi(m[2]), d: +m[1] }; }
  if ((m = s.match(/^([A-Za-z]{3,9})[\s\-](\d{1,2})(?:,?\s+(\d{4}))?$/)) && mi(m[1])) return { y: m[3] ? +m[3] : 0, m: mi(m[1]), d: +m[2] };
  return null;
}
function adhVal(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return round6(v > 1.0001 ? v / 100 : v);
  const s = normSpace(v); if (!s) return null;
  let m = s.match(/^(-?\d+(?:\.\d+)?)\s*%$/); if (m) return round6(+m[1] / 100);
  if (/^-?\d+(?:\.\d+)?$/.test(s)) { const n = +s; return round6(n > 1.0001 ? n / 100 : n); }
  return null;
}
function ahtSeconds(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v < 1 ? v * 86400 : v;
  const s = normSpace(v); if (!s) return null;
  const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (m) return (m[1] ? +m[1] : 0) * 3600 + (+m[2]) * 60 + (+m[3]);
  if (/^\d+(\.\d+)?$/.test(s)) return +s;
  return null;
}
const ATT_KNOWN = { Attend: 'worked', Absent: 'absent', OFF: 'off', AL: 'al', SL: 'sl' };
function normAtt(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return null;
  const s = normSpace(v); if (!s) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return +s;
  const l = s.toLowerCase();
  if (['attend', 'attended', 'present', 'p', 'att', 'work', 'working'].includes(l)) return 'Attend';
  if (['absent', 'absence', 'a', 'abs', 'no show', 'noshow', 'ns'].includes(l)) return 'Absent';
  if (['off', 'day off', 'dayoff', 'o', 'rest', 'rest day', 'weekend', 'w/o', 'wo'].includes(l)) return 'OFF';
  if (['al', 'annual', 'annual leave', 'vacation'].includes(l)) return 'AL';
  if (['sl', 'sick', 'sick leave'].includes(l)) return 'SL';
  return s.length <= 5 ? s.toUpperCase() : s;
}
const attCat = v => v == null ? null : typeof v === 'number' ? 'worked' : (ATT_KNOWN[v] || 'other');

// ============================================================ detection
function headerRow(rows, pred, max = 25) { for (let i = 0; i < Math.min(rows.length, max); i++) if (pred((rows[i] || []).map(cellStr))) return i; return -1; }
function groupCols(hdr, body, candIdx) {
  const out = { team: -1, dep: -1 };
  const scored = candIdx.map(i => {
    const vals = body.map(r => r[i]).filter(v => !isBlank(v)).slice(0, 200);
    const n = vals.length || 1;
    return { i, team: vals.filter(looksTeam).length / n, dep: vals.filter(looksDep).length / n, h: hdr[i] };
  });
  for (const s of scored) if (out.team < 0 && s.team >= 0.6) out.team = s.i;
  for (const s of scored) if (out.dep < 0 && s.dep >= 0.6 && s.i !== out.team) out.dep = s.i;
  for (const s of scored) {   // fall back on header words when values are empty / unknown
    if (out.team < 0 && /brand/i.test(s.h) && s.i !== out.dep) out.team = s.i;
    if (out.dep < 0 && /^dep|department/i.test(s.h) && s.i !== out.team) out.dep = s.i;
  }
  return out;
}
function infoCols(hdr, upto) {
  const H = hdr.slice(0, upto);
  const find = re => H.findIndex(x => re.test(x));
  return {
    name: find(/^(member care champions|agent name|employee name|full name|name|agent|champion)s?$/i) >= 0 ? find(/^(member care champions|agent name|employee name|full name|name|agent|champion)s?$/i) : find(/name|champion/i),
    id: find(/national\s*id|^id$|iqama|emp(loyee)?\s*id|\bid\b/i),
    sys: find(/system\s*name|genesys/i),
    status: find(/status/i),
    groups: H.map((x, i) => ({ x, i })).filter(o => /team|brand|dep|department/i.test(o.x) && !/auto|system/i.test(o.x)).map(o => o.i),
  };
}
function resolveDates(cells) {
  const parsed = cells.map(parseHeaderDate);
  const swap = parsed.some(p => p && p.alt && p.m > 12);
  return parsed.map(p => (p ? (swap && p.alt ? p.alt : { y: p.y, m: p.m, d: p.d }) : null)).map(p => (p && p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= 31 ? p : null));
}

function parseRoster(rows) {
  const h = headerRow(rows, r => r.some(x => /^(name|member care champions|agent name)$/i.test(x)) && r.some(x => /national\s*id|^id$/i.test(x)));
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr); const ic = infoCols(hdr, hdr.length);
  const body = rows.slice(h + 1).filter(r => r && !isBlank(r[ic.name]) && !/^total/i.test(cellStr(r[ic.name])));
  const g = groupCols(hdr, body, ic.groups);
  const col = re => hdr.findIndex(x => re.test(normSpace(x)));
  const em = col(/^(e-?mail|email address|work email)$/i), sp = col(/^(supervisor|team lead(er)?|leader|spv|direct (manager|leader))$/i), bs = col(/^(incentive base|base|incentive base \(sr\))$/i);
  const jd = col(/^(joining date|join date|date of joining|doj|joined|joined on|hire date|hiring date|date of hire|date joined|start date|joining)$/i);
  const sc = col(/^(scorecard|kpi scorecard|kpi card|incentive scorecard|incentive card)$/i);   // a role's own card (CT-SPV, or its name)
  return body.map(r => ({
    name: normSpace(r[ic.name]), id: cleanId(r[ic.id]), sys: ic.sys >= 0 ? normSpace(r[ic.sys]) : '',
    team: g.team >= 0 ? normTeam(r[g.team]) : '', dep: g.dep >= 0 ? normDep(r[g.dep]) : '',
    status: ic.status >= 0 ? normStatus(r[ic.status]) : '',
    email: em >= 0 ? normSpace(r[em]).toLowerCase() : '', spvName: sp >= 0 ? normSpace(r[sp]) : '', base: bs >= 0 && Number.isFinite(+r[bs]) && +r[bs] > 0 ? +r[bs] : null,
    joined: jd >= 0 ? cleanDate(r[jd]) : '', ...(sc >= 0 ? { card: normSpace(r[sc]) } : {}),
  }));
}

function parseGrid(rows) {
  let h = -1, dates = null;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const ds = resolveDates(rows[i] || []);
    if (ds.filter(Boolean).length >= 7) { h = i; dates = ds; break; }
  }
  if (h < 0) return null;
  const first = dates.findIndex(Boolean);
  const hdr = (rows[h] || []).map(cellStr);
  if ((rows[h + 1] || []).some(v => /sched|actual|conformance|diff\s*\(min/i.test(cellStr(v)))) return { kind: 'deductionSheet' };
  const ic = infoCols(hdr, first);
  if (ic.name < 0 && ic.id < 0) return null;
  const body = rows.slice(h + 1).filter(r => r && (!isBlank(r[ic.name]) || cleanId(r[ic.id])) && !/^(total|grand total|sum)/i.test(cellStr(r[ic.name])));
  const g = groupCols(hdr, body, ic.groups);
  let words = 0, pct = 0;
  for (const r of body.slice(0, 80)) for (let c = first; c < dates.length; c++) {
    if (!dates[c]) continue; const v = r[c];
    if (v == null || v === '') continue;
    if (typeof v === 'number') { if (v > 0 && v <= 1.0001 && !Number.isInteger(v)) pct++; else words += 0.2; continue; }
    const s = normSpace(v);
    if (/%$/.test(s) || /^na$/i.test(s)) pct++;
    else if (/^-?\d+$/.test(s)) words += 0.2;
    else words++;
  }
  const lastDate = dates.reduce((m, d, c) => (d ? c : m), -1);
  const tardyCol = hdr.findIndex((x, c) => c > lastDate && /^tard(y|iness)/i.test(x));
  const people = body.map(r => ({
    name: ic.name >= 0 ? normSpace(r[ic.name]) : '', id: ic.id >= 0 ? cleanId(r[ic.id]) : '',
    idRaw: ic.id >= 0 ? normSpace(r[ic.id]) : '',
    team: g.team >= 0 ? normTeam(r[g.team]) : '', dep: g.dep >= 0 ? normDep(r[g.dep]) : '',
    status: ic.status >= 0 ? normStatus(r[ic.status]) : '',
    tardyTotal: tardyCol >= 0 && r[tardyCol] != null && r[tardyCol] !== '' ? r[tardyCol] : null,
    cells: dates.map((d, c) => (d ? [d, r[c]] : null)).filter(Boolean),
  }));
  return { kind: words >= pct ? 'attendance' : 'adhGrid', dates: dates.filter(Boolean), people };
}

const MON3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/* Monthly Adherence over several months: "Apr | 26 | %PCT - Adherence", "May | 01 | …". There is no year, so the newest
   month is taken as the latest one not after today. people[].days holds the latest complete month; byMonth has every month ("2026-5"). */
function parseGenesysAdhMulti(rows, today) {
  const re = /^\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\|\s*(\d{1,2})\s*\|\s*%?\s*pct/i;
  const h = headerRow(rows, r => r.some(x => /agent\s*name/i.test(x)) && r.filter(x => re.test(x)).length >= 5);
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr), nc = hdr.findIndex(x => /agent\s*name/i.test(x));
  const cols = hdr.map((x, i) => { const m = x.match(re); return m ? { i, mon: MON3.indexOf(m[1].toLowerCase()) + 1, day: +m[2] } : null; }).filter(Boolean);
  const order = []; cols.forEach(c => { if (!order.length || order[order.length - 1] !== c.mon) order.push(c.mon); });
  const t = today || new Date(), cy = t.getFullYear(), cm = t.getMonth() + 1, years = new Array(order.length);
  let yy = order[order.length - 1] <= cm ? cy : cy - 1;
  for (let j = order.length - 1; j >= 0; j--) { if (j < order.length - 1 && order[j] > order[j + 1]) yy--; years[j] = yy; }
  let seq = -1, prev = null;
  cols.forEach(c => { if (c.mon !== prev) { seq++; prev = c.mon; } c.y = years[seq]; c.key = c.y + '-' + c.mon; });
  const months = order.map((m, j) => ({ y: years[j], m, days: cols.filter(c => c.key === years[j] + '-' + m).length }));
  const full = months.filter(x => x.days >= daysIn(x.y, x.m) && x.y * 100 + x.m < cy * 100 + cm);
  const def = full.length ? full[full.length - 1] : months[months.length - 1];
  const people = rows.slice(h + 1).filter(r => r && !isBlank(r[nc]) && !/^total$/i.test(normSpace(r[nc]))).map(r => {
    const byMonth = {};
    for (const c of cols) { if (!byMonth[c.key]) byMonth[c.key] = []; byMonth[c.key].push([c.day, r[c.i]]); }
    return { name: normSpace(r[nc]), days: byMonth[def.y + '-' + def.m] || [], byMonth };
  });
  return { kind: 'adhGenesys', people, multi: true, months, month: { y: def.y, m: def.m } };
}
function parseGenesysAdh(rows) {
  const re = /^\s*(\d{1,2})\s*\|\s*%?\s*pct/i;
  const h = headerRow(rows, r => r.some(x => /agent\s*name/i.test(x)) && r.filter(x => re.test(x)).length >= 5);
  if (h < 0) return parseGenesysAdhMulti(rows);
  const hdr = rows[h].map(cellStr); const nc = hdr.findIndex(x => /agent\s*name/i.test(x));
  const dayCols = hdr.map((x, i) => { const m = x.match(re); return m ? [i, +m[1]] : null; }).filter(Boolean);
  const people = rows.slice(h + 1).filter(r => r && !isBlank(r[nc])).map(r => ({ name: normSpace(r[nc]), days: dayCols.map(([i, d]) => [d, r[i]]) }));
  return { kind: 'adhGenesys', people };
}

function parseAHT(rows) {
  const h = headerRow(rows, r => r.some(x => /^agent\s*name$/i.test(x)) && r.some(x => /avg\.?\s*handle|^aht$/i.test(x)));
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr);
  const nc = hdr.findIndex(x => /^agent\s*name$/i.test(x)), ac = hdr.findIndex(x => /avg\.?\s*handle|^aht$/i.test(x));
  const mc = hdr.findIndex(x => /media\s*type/i.test(x)), sc = hdr.findIndex(x => /interval\s*start/i.test(x));
  const people = rows.slice(h + 1).filter(r => r && !isBlank(r[nc])).map(r => ({ name: normSpace(r[nc]), sec: ahtSeconds(r[ac]), media: mc >= 0 ? normSpace(r[mc]).toLowerCase() : '' }));
  let month = null;
  if (sc >= 0) for (const r of rows.slice(h + 1)) { const p = parseHeaderDate(String(r[sc] ?? '').split(' ')[0]); if (p && p.y) { month = { y: p.y, m: p.m }; break; } }
  return { kind: 'aht', people, month };
}

// ============================================================ Agent Performance Summary with all its columns (answered, handle, talk, hold, ACW, transfers)
const PERF_COLS = [   // key, header, type: n count, t duration
  ['ans', /^answered$/i, 'n'], ['hnd', /^handle$/i, 'n'], ['pAht', /^avg\.?\s*handle$/i, 't'], ['talk', /^avg\.?\s*talk$/i, 't'], ['hold', /^avg\.?\s*hold$/i, 't'], ['acw', /^avg\.?\s*acw$/i, 't'],
  ['tTalk', /^total\s*talk$/i, 't'], ['tHold', /^total\s*hold$/i, 't'], ['tAcw', /^total\s*acw$/i, 't'], ['held', /^held$/i, 'n'], ['xfer', /^transferred$/i, 'n'], ['out', /^outbound$/i, 'n'],
  ['rona', /^alert\s*-?\s*no\s*answer$/i, 'n'], ['tRona', /^total\s*alert\s*-?\s*no\s*answer$/i, 't'],
];
const PERF_KEYS = PERF_COLS.map(c => c[0]);
function perfDur(v) {   // a duration in seconds: text like 00:02:22.865 or 51:49:37.969, or an Excel time (a fraction of a day)
  if (v == null || v === '') return null;
  if (v instanceof Date) return Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 10) / 100;
  if (typeof v === 'number') return Math.round(v * 86400 * 1000) / 1000;
  const s = normSpace(v); let m = s.match(/^(?:(\d+)\.)?(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (m) return Math.round(((m[1] ? +m[1] * 86400 : 0) + (+m[2]) * 3600 + (+m[3]) * 60 + (+m[4])) * 1000) / 1000;
  if ((m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/))) return Math.round(((+m[1]) * 60 + (+m[2])) * 1000) / 1000;
  return /^\d+(\.\d+)?$/.test(s) ? +s : null;
}
const perfNum = v => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : +normSpace(v).replace(/,/g, ''); return Number.isFinite(n) ? n : null; };
/** one row per agent and interval. Returns {kind:'perf', rows:[{name, aid, mk, media, ...PERF_KEYS}], months:[{y,m,full}], month, media, skipped} */
function parsePerf(rows) {
  const h = headerRow(rows, r => r.some(x => /^agent\s*name$/i.test(x)) && r.some(x => /^answered$/i.test(x)) && r.some(x => /^handle$/i.test(x)));
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr), col = re => hdr.findIndex(x => re.test(x));
  const c = { name: col(/^agent\s*name$/i), aid: col(/^agent\s*id$/i), media: col(/media\s*type/i), st: col(/interval\s*start/i), en: col(/interval\s*end/i), done: col(/interval\s*complete/i) };
  const pc = PERF_COLS.map(([k, re, t]) => [k, col(re), t]).filter(x => x[1] >= 0);
  const out = [], months = new Map(), medias = new Set(); let skipped = 0;
  for (const r of rows.slice(h + 1)) {
    if (!r || isBlank(r[c.name])) continue;
    const name = normSpace(String(r[c.name]).replace(/\s*\((inactive|deleted)\)\s*$/i, ''));
    let mk = null, full = true;
    if (c.st >= 0) {
      const s = parseLocalDT(r[c.st] instanceof Date ? r[c.st].toISOString().slice(0, 10) : r[c.st]), e = c.en >= 0 ? parseLocalDT(r[c.en] instanceof Date ? r[c.en].toISOString().slice(0, 10) : r[c.en]) : null;
      if (!s) { skipped++; continue; }
      const d = new Date(s.t), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, next = Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);
      if (e && e.t > next + 60000) { skipped++; continue; }   // one row spans several months: it cannot be split
      full = d.getUTCDate() === 1 && d.getUTCHours() === 0 && (!e || Math.abs(e.t - next) < 60000) && (c.done < 0 || !/^false$/i.test(normSpace(r[c.done])));
      mk = y + '-' + m;
      const o = months.get(mk) || { y, m, full: true }; o.full = o.full && full; months.set(mk, o);
    }
    const row = { name, mk, media: c.media >= 0 ? normSpace(r[c.media]).toLowerCase() : '' };
    if (c.aid >= 0 && normSpace(r[c.aid])) row.aid = normSpace(r[c.aid]);
    for (const [k, i, t] of pc) { const v = t === 't' ? perfDur(r[i]) : perfNum(r[i]); if (v != null) row[k] = v; }
    if (row.media) medias.add(row.media);
    out.push(row);
  }
  if (!out.length) return null;
  const ms = [...months.values()].sort((a, b) => a.y * 100 + a.m - (b.y * 100 + b.m));
  const fulls = ms.filter(x => x.full), def = fulls.length ? fulls[fulls.length - 1] : ms[ms.length - 1] || null;
  return { kind: 'perf', rows: out, months: ms, month: def ? { y: def.y, m: def.m } : null, media: [...medias].join(' | '), voiceOnly: medias.size === 1 && medias.has('voice'), skipped };
}
/** one month of a performance export, one row per agent: counts added up, averages weighted the way Genesys works them out */
function perfMonth(data, y, m) {
  const mk = y + '-' + m, by = new Map();
  for (const r of data.rows) {
    if (r.mk && r.mk !== mk) continue;
    const k = normName(r.name); if (!by.has(k)) by.set(k, []); by.get(k).push(r);
  }
  const out = [];
  for (const L of by.values()) {
    if (L.length === 1) { const { mk: _, ...one } = L[0]; out.push(one); continue; }
    const o = { name: L[0].name, media: [...new Set(L.map(x => x.media).filter(Boolean))].join(' | ') }; if (L[0].aid) o.aid = L[0].aid;
    const sum = k => { const v = L.map(x => x[k]).filter(v => v != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
    for (const k of ['ans', 'hnd', 'tTalk', 'tHold', 'tAcw', 'held', 'xfer', 'out', 'rona', 'tRona']) { const v = sum(k); if (v != null) o[k] = Math.round(v * 1000) / 1000; }
    const wavg = (k, w) => { let s = 0, n = 0; for (const x of L) if (x[k] != null && x[w] != null && x[w] > 0) { s += x[k] * x[w]; n += x[w]; } return n ? Math.round(s / n * 1000) / 1000 : null; };
    const by2 = (tot, cnt, avg) => (o[tot] != null && o[cnt] ? Math.round(o[tot] / o[cnt] * 1000) / 1000 : wavg(avg, cnt));
    const v1 = wavg('pAht', 'hnd'), v2 = by2('tTalk', 'ans', 'talk'), v3 = by2('tHold', 'held', 'hold');
    if (v1 != null) o.pAht = v1; if (v2 != null) o.talk = v2; if (v3 != null) o.hold = v3;
    let s = 0, n = 0; for (const x of L) if (x.tAcw != null && x.acw) { s += x.tAcw; n += x.tAcw / x.acw; } if (n) o.acw = Math.round(s / n * 1000) / 1000;
    out.push(o);
  }
  return out;
}

// ============================================================ schedule + status timeline
const WORK_CODES = ['On Queue', 'Break', 'Meal', 'Update Break Time', 'Training'];
const ACTUAL_STATUSES = ['On Queue', 'Break', 'Meal', 'Training', 'Meeting'];
// naive local timestamps in ms (UTC fields used as wall-clock)
function parseLocalDT(s) {
  s = normSpace(s); if (!s) return null; let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*([AP]M)?)?$/i))) {
    let y = +m[3]; if (y < 100) y += 2000; let h = m[4] ? +m[4] : 0; const ap = m[7];
    if (ap) { if (/pm/i.test(ap) && h < 12) h += 12; if (/am/i.test(ap) && h === 12) h = 0; }
    return { t: Date.UTC(y, +m[1] - 1, +m[2], h, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0), dateOnly: !m[4] };
  }
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/))) return { t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + 3 * 3600000, dateOnly: false, utc: true };
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return { t: Date.UTC(+m[1], +m[2] - 1, +m[3]), dateOnly: true };
  return null;
}
function durSec(s) { const m = normSpace(s).match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null; }
const dayKey = t => { const d = new Date(t); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };

function parseSchedule(rows) {
  const h = headerRow(rows, r => r.some(x => /^agent\s*name$/i.test(x)) && r.some(x => /activity\s*code/i.test(x)) && r.some(x => /length\s*in\s*min/i.test(x)));
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr); const col = re => hdr.findIndex(x => re.test(x));
  const c = { name: col(/^agent\s*name$/i), code: col(/activity\s*code/i), start: col(/^start$/i), end: col(/^end$/i), len: col(/length\s*in\s*min/i), sl: col(/^start\s*\(/i), el: col(/^end\s*\(/i) };
  const segs = [];
  for (const r of rows.slice(h + 1)) {
    if (!r || isBlank(r[c.name])) continue;
    const local = c.sl >= 0 ? parseLocalDT(r[c.sl]) : null;
    const st = local || parseLocalDT(r[c.start]);
    if (!st) continue;
    let en = c.el >= 0 ? parseLocalDT(r[c.el]) : null; if (!en) en = parseLocalDT(r[c.end]);
    const mins = +normSpace(r[c.len]) || 0;
    segs.push({ name: normSpace(r[c.name]), code: normSpace(r[c.code]), s: st.t, e: st.dateOnly ? null : (en ? en.t : st.t + mins * 60000), full: !!st.dateOnly, mins });
  }
  return { kind: 'schedule', segs, agents: [...new Set(segs.map(x => x.name))] };
}
function parseTimeline(rows) {
  const h = headerRow(rows, r => r.some(x => /^agent\s*name$/i.test(x)) && r.some(x => /primary\s*status/i.test(x)) && r.some(x => /^duration$/i.test(x)));
  if (h < 0) return null;
  const hdr = rows[h].map(cellStr); const col = re => hdr.findIndex(x => re.test(x));
  const c = { name: col(/^agent\s*name$/i), st: col(/^start\s*time$/i), et: col(/^end\s*time$/i), status: col(/primary\s*status/i), dur: col(/^duration$/i), is: col(/interval\s*start/i) };
  const segs = []; let month = null;
  for (const r of rows.slice(h + 1)) {
    if (!r || isBlank(r[c.name])) continue;
    if (!month && c.is >= 0) { const p = parseLocalDT(r[c.is]); if (p) { const d = new Date(p.t); month = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }; } }
    const st = parseLocalDT(r[c.st]); if (!st) continue;
    let e = null; const ds = durSec(r[c.dur]);
    if (ds != null) e = st.t + ds * 1000; else { const en = parseLocalDT(r[c.et]); if (en) e = en.t; }
    if (e == null) continue;
    segs.push({ name: normSpace(r[c.name]), status: normSpace(r[c.status]), s: st.t, e });
  }
  return { kind: 'timeline', segs, month, agents: [...new Set(segs.map(x => x.name))] };
}
/* Per agent per day: scheduled work minutes and actual minutes (Book22 deduction rules). */
function computeDaily(schedDets, tlDets, Y, M) {
  const ND = daysIn(Y, M), first = Y * 10000 + M * 100 + 1, last = Y * 10000 + M * 100 + ND;
  const byAgent = new Map();
  for (const d of schedDets) for (const x of d.data.segs) { const k = normName(x.name); if (!byAgent.has(k)) byAgent.set(k, { name: x.name, segs: [] }); byAgent.get(k).segs.push(x); }
  const tl = new Map();
  for (const d of tlDets) for (const x of d.data.segs) { if (!ACTUAL_STATUSES.includes(x.status)) continue; const k = normName(x.name); if (!tl.has(k)) tl.set(k, []); tl.get(k).push(x); }
  const sched = new Map(), actual = new Map();
  for (const [k, a] of byAgent) {
    const days = new Map();   // dayKey -> {work:[[s,e]], rows}
    const timed = a.segs.filter(x => !x.full).sort((p, q) => p.s - q.s);
    let shiftDay = null, prevEnd = null;
    for (const x of timed) {
      if (prevEnd == null || x.s - prevEnd > 3 * 3600000) shiftDay = dayKey(x.s);
      prevEnd = Math.max(prevEnd ?? 0, x.e);
      if (!days.has(shiftDay)) days.set(shiftDay, { work: [], rows: 0 });
      const D = days.get(shiftDay); D.rows++;
      if (WORK_CODES.includes(x.code)) D.work.push([x.s, x.e]);
    }
    for (const x of a.segs.filter(x => x.full)) { const dk = dayKey(x.s); if (!days.has(dk)) days.set(dk, { work: [], rows: 0 }); days.get(dk).rows++; }
    const sArr = new Array(ND).fill(null), aArr = new Array(ND).fill(null);
    const st = tl.get(k) || [];
    for (const [dk, D] of days) {
      if (dk < first || dk > last) continue;
      const i = dk % 100 - 1;
      sArr[i] = Math.round(D.work.reduce((t, [s, e]) => t + (e - s), 0) / 60000);
      let sec = 0;
      if (D.work.length) { for (const z of st) for (const [s, e] of D.work) { const o = Math.min(z.e, e) - Math.max(z.s, s); if (o > 0) sec += o / 1000; } }
      else { const d0 = Date.UTC(Y, M - 1, i + 1), d1 = d0 + 86400000; for (const z of st) { const o = Math.min(z.e, d1) - Math.max(z.s, d0); if (o > 0) sec += o / 1000; } }
      aArr[i] = Math.floor(sec / 60 + 0.5);
    }
    sched.set(k, { name: a.name, days: sArr }); actual.set(k, { name: a.name, days: aArr });
  }
  return { sched, actual };
}

/* The Daily WFM & Performance Review's rules, applied to every scheduled day of a month.
   Per agent and shift day: scheduled minutes, shift start/end, leave or excuse codes, break changes, time signed on
   (any status but Offline, from 2 hours before the shift to 2 hours after it) and the first sign-on. */
const DR_LEAVE = /leave|holiday|day\s*off/i, DR_EXCUSED = /tardy|excuse/i, DR_WORKING = /on queue|available|break|meal|meeting|training|off queue|update break/i;
function computeDayReview(schedDets, tlDets, Y, M) {
  const ND = daysIn(Y, M), first = Y * 10000 + M * 100 + 1, last = Y * 10000 + M * 100 + ND, H2 = 2 * 3600000;
  const byAgent = new Map();
  for (const d of schedDets) for (const x of d.data.segs) {
    const nm = normSpace(String(x.name).replace(/\s*\((inactive|deleted)\)\s*$/i, '')), k = normName(nm); if (!byAgent.has(k)) byAgent.set(k, { name: nm, segs: [], seen: new Set() });
    const A = byAgent.get(k), key = `${x.code}|${x.s}|${x.e}|${x.full ? 1 : 0}`; if (A.seen.has(key)) continue; A.seen.add(key); A.segs.push(x);
  }
  const tl = new Map();
  for (const d of tlDets) for (const x of d.data.segs) { if (!x.status || /offline/i.test(x.status)) continue; const k = normName(String(x.name).replace(/\s*\((inactive|deleted)\)\s*$/i, '')); if (!tl.has(k)) tl.set(k, []); tl.get(k).push(x); }
  for (const L of tl.values()) L.sort((a, b) => a.s - b.s);
  const out = new Map();
  for (const [k, A] of byAgent) {
    const days = new Map();
    let cur = null, prevEnd = null;
    for (const x of A.segs.filter(x => !x.full).sort((p, q) => p.s - q.s)) {
      if (prevEnd == null || x.s - prevEnd > 3 * 3600000) { const dk = dayKey(x.s); cur = days.get(dk) || { dk, segs: [] }; days.set(dk, cur); }
      prevEnd = Math.max(prevEnd ?? 0, x.e ?? x.s); cur.segs.push(x);
    }
    for (const x of A.segs.filter(x => x.full)) { const dk = dayKey(x.s); if (!days.has(dk)) days.set(dk, { dk, segs: [] }); days.get(dk).segs.push(x); }
    const L = tl.get(k) || [], res = [];
    for (const D of days.values()) {
      if (D.dk < first || D.dk > last) continue;
      const o = { day: D.dk % 100, sched: 0, leave: '', excused: '', start: null, end: null, brk: 0, brkMin: 0, logged: 0, firstOn: null };
      for (const x of D.segs) {
        const c = x.code || '';
        if (DR_LEAVE.test(c)) { o.leave = o.leave || c; continue; }
        if (DR_EXCUSED.test(c)) { o.excused = o.excused || normSpace(c); continue; }
        if (/update break/i.test(c)) { o.brk++; o.brkMin += x.mins || 0; }
        o.sched += x.mins || 0;
        if (!x.full && DR_WORKING.test(c)) { if (o.start == null || x.s < o.start) o.start = x.s; const e = x.e ?? x.s; if (o.end == null || e > o.end) o.end = e; }
      }
      if (!o.leave && o.start != null) {
        const w0 = o.start - H2, w1 = (o.end ?? o.start) + H2; let sec = 0;
        for (const z of L) { if (z.s >= w1) break; if (z.e <= w0) continue; const a = Math.max(z.s, w0), b = Math.min(z.e, w1); if (b > a) { sec += (b - a) / 1000; if (o.firstOn == null || a < o.firstOn) o.firstOn = a; } }
        o.logged = sec / 60;
      }
      res.push(o);
    }
    res.sort((a, b) => a.day - b.day);
    out.set(k, { name: A.name, days: res });
  }
  return out;
}
/** one day judged the way the daily review does it. adh: that day's adherence (0..1) or null. T: thresholds */
function judgeDay(o, adh, T) {
  if (o.leave) return { day: o.day, leave: o.leave };
  if (!(o.sched > 0)) return { day: o.day, none: true };
  const logged = o.logged || 0, r = { day: o.day, sched: o.sched, logged, adh, start: o.start, firstOn: o.firstOn, brk: o.brk, brkMin: o.brkMin };
  const noAct = o.firstOn == null && logged < 10, flat = adh != null && adh <= 0.10 && logged < 10;
  r.off = adh != null && adh < 0.65 && logged >= o.sched * 0.5;
  if ((noAct || flat) && !r.off) { r.absent = true; return r; }
  if (o.start != null && o.firstOn != null) {
    const late = (o.firstOn - o.start) / 60000;
    if (late >= T.absentAfter && !r.off) { r.absent = true; return r; }
    if (Math.round(late) > T.tardyAfter) { if (o.excused) { r.excused = Math.round(late); r.code = o.excused; } else r.late = Math.round(late); }
  }
  if (logged > 0) { const gap = Math.round(o.sched - logged); if (gap >= T.shortfall) r.short = gap; }
  if (adh != null && adh < T.adhTarget) r.lowAdh = adh;
  r.worked = true;
  return r;
}
/** a month of judged days -> the person's totals and the follow-up score (the daily review's weights, added up over the month) */
function reviewMonth(days, T, perf) {
  const s = { shifts: 0, worked: 0, absent: 0, leave: 0, late: 0, lateMin: 0, excused: 0, short: 0, shortMin: 0, brk: 0, brkMin: 0, logged: 0, lowAdh: 0, off: 0, score: 0, reasons: [] };
  for (const r of days) {
    if (r.leave) { s.leave++; continue; } if (r.none) continue;
    s.shifts++; s.brk += r.brk || 0; s.brkMin += r.brkMin || 0;
    if (r.absent) { s.absent++; s.score += T.absentWeight; continue; }
    s.worked++; s.logged += r.logged;
    if (r.late) { s.late++; s.lateMin += r.late; s.score += Math.min(r.late / 10, 6); }
    if (r.excused) s.excused++;
    if (r.short) { s.short++; s.shortMin += r.short; s.score += Math.min(r.short / 20, 5); }
    if (r.lowAdh != null) { s.lowAdh++; s.score += Math.min((T.adhTarget - r.lowAdh) * 100 / 4, 7); }
    if (r.off) { s.off++; s.score += 4; }
  }
  const P = perf || {};
  const calls = P.ans ?? P.hnd ?? (P.aht != null ? T.minCalls : null);   // no performance export: the AHT export alone
  s.highAht = P.aht != null && calls != null && calls >= T.minCalls && P.aht > T.ahtCeil ? P.aht : null;
  s.highHold = P.tHold != null && P.ans >= T.minCalls && P.tHold / P.ans >= T.holdMax ? P.tHold / P.ans : null;
  s.rona = P.rona != null && P.rona >= 3 ? P.rona : null;
  if (s.highAht != null) s.score += Math.min((s.highAht - T.ahtCeil) / 60, 5);
  if (s.highHold != null) s.score += Math.min(s.highHold / 10, 6);
  if (s.rona != null) s.score += Math.min(s.rona * 1.5, 6);
  s.exc = s.late + s.short + s.absent + s.lowAdh + s.off + (s.highAht != null ? 1 : 0) + (s.highHold != null ? 1 : 0) + (s.rona != null ? 1 : 0);
  s.score = Math.round(s.score * 10) / 10;
  return s;
}

// ============================================================ the supervisors' attendance template (AttTpl makes it in the page)
// A month's exceptions only: one row per day someone was late, absent, on leave or off. Every other day of each person's dates is a
// working day, and their weekly days off on the Team sheet are OFF (inside a leave of several days too). The hidden _mc sheet says it
// is the template, for which month, and for which department.
const ATT_TPL_MARK = 'mc-attendance-template';
const ATT_TPL_TYPES = [['late', null], ['tardy', null], ['absent', 'Absent'], ['day off', 'OFF'], ['off', 'OFF'], ['al leave', 'AL'], ['annual leave', 'AL'], ['al', 'AL'],
  ['sl leave', 'SL'], ['sick leave', 'SL'], ['sl', 'SL'], ['unpaid leave', 'Unpaid'], ['unpaid', 'Unpaid'], ['compassionate leave', 'Compassionate Leave'], ['paternity leave', 'Paternity'],
  ['marriage leave', 'Marriage'], ['exam leave', 'Exam'], ['maternity leave', 'ML'], ['ml', 'ML'], ['eid', 'Eid'], ['national day', 'National Day'], ['founding day', 'Founding Day']];
/** a Type cell -> the day code, null for Late (the minutes go on the day), undefined when it is empty; other words are kept */
function attTplType(v) {
  const s = normSpace(v).toLowerCase().replace(/\s+leaves$/, ' leave'); if (!s) return undefined;
  const hit = ATT_TPL_TYPES.find(([t]) => t === s); return hit ? hit[1] : /late|tard/.test(s) ? null : normSpace(v);
}
/** the template's detection, or null when the workbook is not the template */
function parseAttTemplate(all) {
  const mc = (all || []).find(t => /^_mc$/i.test(normSpace(t.name)));
  if (!mc || normSpace(((mc.rows || [])[0] || [])[0]) !== ATT_TPL_MARK) return null;
  const kv = new Map((mc.rows || []).map(r => [normSpace((r || [])[0]).toLowerCase(), (r || [])[1]]));
  const mk = normSpace(kv.get('month')).match(/^(\d{4})-(\d{1,2})$/); if (!mk) return null;
  const Y = +mk[1], M = +mk[2], ND = daysIn(Y, M), warns = [];
  const sheetOf = re => all.find(t => re.test(normSpace(t.name)));
  const TE = sheetOf(/^team$/i), AT = sheetOf(/^attendance$/i);
  if (!TE || !AT) return { kind: 'error', sheet: 'Attendance template', msg: 'This attendance template has lost its Team or Attendance sheet' };
  // a date in the template's month -> its day; -1 for a date in another month; null when there is none
  const dayOf = v => {
    const p = parseHeaderDate(v); if (!p) return null;
    const ok = x => x && x.m === M && (!x.y || x.y === Y) && x.d >= 1 && x.d <= ND;
    return ok(p) ? p.d : ok(p.alt) ? p.alt.d : -1;
  };
  const col = (hdr, re) => hdr.findIndex(x => re.test(x));
  // Team: everyone the month counts, their weekly days off and any first or last day
  const th = headerRow(TE.rows, r => r.some(x => /^name$/i.test(x)) && r.some(x => /days off/i.test(x)));
  if (th < 0) return { kind: 'error', sheet: 'Attendance template', msg: 'The Team sheet of this attendance template has no Name and Weekly days off headers' };
  const H1 = TE.rows[th].map(cellStr), tc = { id: col(H1, /^id$|national/i), name: col(H1, /^name$/i), brand: col(H1, /^(brand|team)$/i), dep: col(H1, /^dep/i), off: col(H1, /days off/i), first: col(H1, /^first/i), last: col(H1, /^last/i) };
  const offOf = v => { const s = normSpace(v).toLowerCase(); return new Set(s ? s.split(/[^a-z]+/).map(w => WD.findIndex(x => x.toLowerCase() === w.slice(0, 3))).filter(i => i >= 0) : []); };
  const people = [];
  for (const r of TE.rows.slice(th + 1)) {
    if (!r) continue; const name = tc.name >= 0 ? normSpace(r[tc.name]) : '', id = tc.id >= 0 ? cleanId(r[tc.id]) : '';
    if (!name && !id) continue;
    const p = { name, id, idRaw: tc.id >= 0 ? normSpace(r[tc.id]) : '', brand: tc.brand >= 0 ? normTeam(r[tc.brand]) : '', dep: tc.dep >= 0 ? normDep(r[tc.dep]) : '', off: offOf(tc.off >= 0 ? r[tc.off] : ''),
      first: tc.first >= 0 ? dayOf(r[tc.first]) : null, last: tc.last >= 0 ? dayOf(r[tc.last]) : null };
    if (p.first === -1 || p.last === -1) warns.push(`${name || id}: a first or last day outside ${MON[M - 1]} ${Y} on the Team sheet was not used`);
    people.push(p);
  }
  const offKeys = people.map(p => [...p.off].join(',')), common = offKeys.sort((a, b) => offKeys.filter(x => x === b).length - offKeys.filter(x => x === a).length)[0] || '';
  const offDefault = new Set(common ? common.split(',').map(Number) : []);
  const base = p => Array.from({ length: ND }, (_, i) => {
    const d = i + 1; if ((p.first > 0 && d < p.first) || (p.last > 0 && d > p.last)) return null;
    return p.off.has(new Date(Date.UTC(Y, M - 1, d)).getUTCDay()) ? 'OFF' : 'Attend';
  });
  const days = people.map(base);
  // Attendance: the exceptions, in row order (a later row for the same day wins)
  const ah = headerRow(AT.rows, r => r.some(x => /^date$/i.test(x)) && r.some(x => /^type$/i.test(x)));
  let entries = 0;
  if (ah >= 0) {
    const H2 = AT.rows[ah].map(cellStr), ac = { date: col(H2, /^date$/i), to: col(H2, /^to\b/i), name: col(H2, /^name$/i), id: col(H2, /^id$|national/i), type: col(H2, /^type$/i), min: col(H2, /minute/i) };
    const seen = new Map();
    AT.rows.slice(ah + 1).forEach((r, j) => {
      if (!r) return; const row = ah + j + 2, name = ac.name >= 0 ? normSpace(r[ac.name]) : '', id = ac.id >= 0 ? cleanId(r[ac.id]) : '', t = ac.type >= 0 ? r[ac.type] : null;
      const raw = ac.date >= 0 ? r[ac.date] : null;
      if (!name && !id && isBlank(raw) && isBlank(t)) return;
      const who = name || id || `row ${row}`, code = attTplType(t), from = dayOf(raw), to = ac.to >= 0 ? dayOf(r[ac.to]) : null;
      if (!name && !id) { warns.push(`Row ${row}: no name, so it was not used`); return; }
      if (code === undefined) { warns.push(`Row ${row} (${who}): no type, so it was not used`); return; }
      if (from == null) { warns.push(`Row ${row} (${who}): no date, so it was not used`); return; }
      if (from === -1) { warns.push(`Row ${row} (${who}): the date is not in ${MON[M - 1]} ${Y}, so it was not used`); return; }
      let i = people.findIndex(p => id && p.id === id); if (i < 0) i = people.findIndex(p => name && normName(p.name) === normName(name));
      if (i < 0) { people.push({ name, id, idRaw: id, brand: '', dep: '', off: offDefault, first: null, last: null }); days.push(base(people[people.length - 1])); i = people.length - 1; warns.push(`${who} is not on the Team sheet: added, with the usual days off`); }
      const end = code === null ? from : to > 0 ? Math.max(to, from) : to === -1 ? ND : from, base0 = base(people[i]);
      for (let d = from; d <= end; d++) {
        if (end > from && (base0[d - 1] === 'OFF' || base0[d - 1] == null)) continue;   // several days: the weekly days off (and days outside the person's dates) stay as they are
        const k = i + '|' + d; if (seen.has(k) && seen.get(k) !== row) warns.push(`${who}, ${d} ${MON[M - 1]}: rows ${seen.get(k)} and ${row} are for the same day; row ${row} is used`);
        seen.set(k, row);
        if (code === null) { const mins = Number(ac.min >= 0 ? r[ac.min] : NaN); if (!(mins > 0)) warns.push(`Row ${row} (${who}): Late with no minutes, so the day counts as attended`); days[i][d - 1] = mins > 0 ? Math.round(mins) : 'Attend'; }
        else days[i][d - 1] = code;
      }
      entries++;
    });
  } else warns.push('The Attendance sheet has no Date and Type headers, so only the weekly days off were used');
  const dates = Array.from({ length: ND }, (_, i) => ({ y: Y, m: M, d: i + 1 }));
  return { kind: 'attendance', sheet: `${normSpace(AT.name)} (template)`, data: { dates, template: { month: `${Y}-${String(M).padStart(2, '0')}`, dep: normSpace(kv.get('dep')), spv: normSpace(kv.get('supervisor')), entries, warns },
    people: people.map((p, i) => ({ name: p.name, id: p.id, idRaw: p.idRaw, team: p.brand, dep: p.dep, status: '', tardyTotal: null, cells: days[i].map((v, k) => [dates[k], v]) })).filter(p => p.cells.some(([, v]) => v != null)) } };
}

/* Read one file into tables: every sheet with its state (hidden ones too), a CSV as one visible table. null: not a file the engine reads */
async function readTables(name, buf) {
  const lower = name.toLowerCase();
  if (/\.(csv|txt)$/.test(lower)) return [{ name, rows: parseCSV(new TextDecoder().decode(buf)), state: 'visible' }];
  if (/\.(xlsx|xlsm)$/.test(lower)) return readXlsx(buf);
  if (/\.xlsb$/.test(lower)) return readXlsb(buf);
  return null;
}
/* Analyse one file -> list of detections {kind, sheet, data, rows} */
async function analyzeFile(name, buf) { return analyzeTables(name, await readTables(name, buf)); }
/* The detections from tables readTables gave: a Roster sheet alone when an .xlsx has one, else the visible sheets */
function analyzeTables(name, all) {
  const lower = name.toLowerCase();
  let tables = [];
  if (all == null) return /\.xls$/.test(lower) ? [{ kind: 'error', sheet: name, msg: 'Old .xls format - open it in Excel and save as .xlsx' }] : [{ kind: 'error', sheet: name, msg: 'Not a spreadsheet (use .xlsx or .csv)' }];
  if (/\.(csv|txt)$/.test(lower)) tables = all;
  else if (/\.(xlsx|xlsm)$/.test(lower)) {
    const tpl = parseAttTemplate(all); if (tpl) return [tpl];   // the supervisors' attendance template: its month's every day, from the exceptions
    const roster = all.find(s => /^roster$/i.test(normSpace(s.name)));
    tables = roster ? [roster] : all.filter(s => s.state === 'visible');
  } else tables = all.filter(s => s.state === 'visible');
  const out = [];
  for (const t of tables) {
    const rows = t.rows || [];
    let d = null;
    if (/^roster$/i.test(normSpace(t.name))) { const r = parseRoster(rows); if (r) d = { kind: 'roster', data: r }; }
    if (!d) {   // the full Agent Performance Summary; a voice-only one for one month also gives the AHT
      const x = parsePerf(rows);
      if (x) {
        d = { kind: 'perf', data: x };
        if (x.voiceOnly && x.months.length === 1) out.push({ kind: 'aht', sheet: t.name, data: { kind: 'aht', month: x.month, fromPerf: true, people: x.rows.map(r => ({ name: r.name, sec: r.pAht ?? null, media: 'voice' })) } });
      }
    }
    if (!d) { const x = parseAHT(rows); if (x) d = { kind: 'aht', data: x }; }
    if (!d) { const x = parseGenesysAdh(rows); if (x) d = { kind: 'adhGenesys', data: x }; }
    if (!d) { const x = parseSchedule(rows); if (x) d = { kind: 'schedule', data: x }; }
    if (!d) { const x = parseTimeline(rows); if (x) d = { kind: 'timeline', data: x }; }
    if (!d) { const x = parseGrid(rows); if (x) d = x.kind === 'deductionSheet' ? { kind: 'ignored', msg: 'Deduction sheet - not an input' } : { kind: x.kind, data: x }; }
    if (!d) { const r = parseRoster(rows); if (r && r.length) d = { kind: 'roster', data: r }; }
    if (d) { d.sheet = t.name; out.push(d); }
  }
  if (!out.length) out.push({ kind: 'unknown', sheet: name, msg: 'Layout not recognised' });
  return out;
}

function guessMonth(detections) {
  const counts = {};
  for (const d of detections) {
    if (d.kind === 'attendance' || d.kind === 'adhGrid') for (const x of d.data.dates) if (x.y) { const k = x.y + '-' + x.m; counts[k] = (counts[k] || 0) + 1; }
    if ((d.kind === 'aht' || d.kind === 'timeline') && d.data.month) { const k = d.data.month.y + '-' + d.data.month.m; counts[k] = (counts[k] || 0) + 100; }
    if (d.kind === 'adhGenesys' && d.data.multi && d.data.month) { const k = d.data.month.y + '-' + d.data.month.m; counts[k] = (counts[k] || 0) + 50; }
    if (d.kind === 'perf' && d.data.month) { const k = d.data.month.y + '-' + d.data.month.m; counts[k] = (counts[k] || 0) + (d.data.months.length > 1 ? 50 : 100); }
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (best) { const [y, m] = best[0].split('-').map(Number); return { y, m }; }
  const t = new Date(); const pm = t.getMonth() === 0 ? { y: t.getFullYear() - 1, m: 12 } : { y: t.getFullYear(), m: t.getMonth() };
  return pm;
}

// ============================================================ model
const personKey = p => (p.id ? 'id:' + p.id : 'n:' + normName(p.name));
function tokens(s) { return normName(s).replace(/[^a-z\s]/g, '').split(' ').filter(t => t.length > 1); }
function tokEq(a, b) { if (a === b) return true; if (a.length >= 4 && b.length >= 4) return lev(a, b) <= 1 || (a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6)); return false; }
function nameScore(a, b) {
  const ta = tokens(a), tb = tokens(b); if (!ta.length || !tb.length) return 0;
  if (!(tokEq(ta[0], tb[0]) || lev(ta[0], tb[0]) <= 2)) return 0;
  let hit = 0; const used = new Set();
  for (const x of ta) { const j = tb.findIndex((y, k) => !used.has(k) && tokEq(x, y)); if (j >= 0) { used.add(j); hit++; } }
  const tokScore = hit >= 2 ? hit / Math.min(ta.length, tb.length) : 0;
  const ja = ta.join(''), jb = tb.join('');
  const cat = 1 - lev(ja, jb) / Math.max(ja.length, jb.length);
  return Math.max(tokScore, cat >= 0.8 ? cat : 0);
}

function buildModel(dets, settings, overrides = {}) {
  const Y = settings.year, M = settings.month, ND = daysIn(Y, M);
  const people = []; const byId = new Map(); const byName = new Map();
  const index = p => { if (p.id) byId.set(p.id, p); for (const n of [p.name, p.sys]) if (n && !byName.has(normName(n))) byName.set(normName(n), p); };
  const add = src => { const p = { name: src.name, id: src.id || '', sys: src.sys || '', team: src.team || '', dep: src.dep || '', rosterStatus: src.status || '', attStatus: '', onRoster: !!src.onRoster, att: null, adh: null, aht: null, notes: [] }; people.push(p); index(p); return p; };
  const of = k => dets.filter(d => d.kind === k);
  // roster (later files win on conflicts)
  for (const d of of('roster')) for (const r of d.data) {
    const p = (r.id && byId.get(r.id)) || byName.get(normName(r.name)) || (r.sys && byName.get(normName(r.sys)));
    if (p) { Object.assign(p, { name: r.name || p.name, sys: r.sys || p.sys, team: r.team || p.team, dep: r.dep || p.dep, rosterStatus: r.status || p.rosterStatus }); if (r.id) p.id = r.id; index(p); }
    else add({ ...r, onRoster: true });
  }
  // attendance grid(s)
  const unknownCodes = new Map(); let attLoaded = false;
  for (const d of of('attendance')) {
    attLoaded = true;
    for (const row of d.data.people) {
      let p = (row.id && byId.get(row.id)) || byName.get(normName(row.name));
      if (!p) { p = add({ name: row.name || row.id, id: row.id, team: row.team, dep: row.dep }); p.addedFromAtt = true; }
      else { if (!p.id && row.id) { p.id = row.id; index(p); } if (!p.team && row.team) p.team = row.team; if (!p.dep && row.dep) p.dep = row.dep; }
      if (row.status) p.attStatus = row.status;
      if (!p.att) p.att = new Array(ND).fill(null);
      for (const [dt, val] of row.cells) {
        if ((dt.y && dt.y !== Y) || dt.m !== M || dt.d > ND) continue;
        const v = normAtt(val); if (v == null) continue;
        p.att[dt.d - 1] = v;
        if (attCat(v) === 'other') unknownCodes.set(v, (unknownCodes.get(v) || 0) + 1);
      }
    }
  }
  // in-page edits
  for (const p of people) {
    const ov = overrides[personKey(p)];
    if (ov) { if (ov.sys != null) p.sys = normSpace(ov.sys); if (ov.status) p.statusOverride = ov.status; }
  }
  byName.clear(); people.forEach(index);
  // adherence
  const unmatched = { adh: [], aht: [] };
  const matchName = n => byName.get(normName(n));
  for (const d of [...of('adhGenesys'), ...of('adhGrid')]) {
    for (const row of d.data.people) {
      const p = (row.id && byId.get(row.id)) || matchName(row.name);
      if (!p) { unmatched.adh.push(row.name); continue; }
      if (!p.adh) p.adh = new Array(ND).fill(null);
      const pairs = d.kind === 'adhGenesys' ? (d.data.multi ? (row.byMonth[Y + '-' + M] || []) : row.days).map(([day, v]) => [day, v]) : row.cells.filter(([dt]) => (!dt.y || dt.y === Y) && dt.m === M).map(([dt, v]) => [dt.d, v]);
      for (const [day, v] of pairs) { if (day > ND) continue; const x = adhVal(v); if (x != null) p.adh[day - 1] = x; }
    }
  }
  // AHT
  for (const d of of('aht')) {
    const rows = [...d.data.people].sort((a, b) => (b.media === 'voice') - (a.media === 'voice'));
    for (const row of rows) {
      const p = matchName(row.name);
      if (!p) { if (row.sec != null) unmatched.aht.push(row.name); continue; }
      if (p.aht == null && row.sec != null) p.aht = row.sec;
    }
  }
  // derived numbers
  const floor = settings.floor, target = settings.target;
  for (const p of people) {
    p.display = p.sys || p.name;
    p.status = p.statusOverride || (p.rosterStatus === 'Inactive' || p.attStatus === 'Inactive' ? 'Inactive' : 'Active');
    if (p.att) {
      const c = { worked: 0, tardyDays: 0, tardyMin: 0, absent: 0, al: 0, sl: 0, off: 0, other: 0 };
      for (const v of p.att) {
        const k = attCat(v); if (!k) continue;
        if (k === 'worked') { c.worked++; if (typeof v === 'number' && v > 0) { c.tardyDays++; c.tardyMin += v; } }
        else c[k]++;
      }
      p.attC = c;
    }
    if (p.adh) {
      p.adhDays = p.adh.map(v => (v == null || v < floor ? 'NA' : v));
      const nums = p.adhDays.filter(v => typeof v === 'number');
      p.adhCount = nums.length; p.adhAvg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 'NA';
    }
    p.attended = p.attC ? p.attC.worked : (p.adh ? p.adhCount : 0);
    p.attendedSource = p.attC ? 'attendance' : (p.adh ? 'adherence' : 'none');
    p.shown = p.status !== 'Inactive' || p.attended >= settings.inactiveMin;
    p.key = personKey(p);
  }
  const depRank = d => { const i = DEP_ORDER.indexOf(d); return i < 0 ? 99 : i; };
  people.sort((a, b) => depRank(a.dep) - depRank(b.dep) || a.display.localeCompare(b.display, 'en', { sensitivity: 'base' }));
  // name suggestions for unmatched export names
  const takenAdh = new Set(people.filter(p => p.adh).map(p => p));
  const takenAht = new Set(people.filter(p => p.aht != null).map(p => p));
  const suggest = (names, taken) => [...new Set(names)].map(n => {
    let best = null, bs = 0;
    for (const p of people) { if (taken.has(p)) continue; const s = Math.max(nameScore(n, p.name), p.sys ? nameScore(n, p.sys) : 0); if (s > bs) { bs = s; best = p; } }
    return { name: n, suggest: bs >= 0.6 ? best.key : null, suggestName: bs >= 0.6 ? best.name : null, score: bs };
  });
  return {
    year: Y, month: M, nd: ND, settings, people, attLoaded,
    adhLoaded: of('adhGenesys').length + of('adhGrid').length > 0, ahtLoaded: of('aht').length > 0,
    rosterLoaded: of('roster').length > 0,
    unknownCodes: [...unknownCodes.entries()],
    unmatchedAdh: suggest(unmatched.adh, takenAdh), unmatchedAht: suggest(unmatched.aht, takenAht),
    label: MON[M - 1] + ' - ' + Y,
  };
}

return { DEP_ORDER, DEP_NAMES, MON, WD, normSpace, normName, cleanId, cleanDate, daysIn, ymdSerial, weekday, colName, ref, round6,
  readZip, writeZip, crc32, readXlsx, readXlsb, parseCSV, parseHeaderDate, adhVal, ahtSeconds, normAtt, attCat, normDep, normTeam, normStatus, parseAttTemplate, ATT_TPL_MARK,
  analyzeFile, readTables, analyzeTables, guessMonth, parseGenesysAdhMulti, parsePerf, perfMonth, PERF_KEYS, computeDayReview, judgeDay, reviewMonth, buildModel, personKey, nameScore, computeDaily, parseLocalDT, WORK_CODES, ACTUAL_STATUSES };
})();
if (typeof module !== 'undefined') module.exports = Core;
