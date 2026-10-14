/* One-to-one and final (signed) forms as PDF. Dependency-free PDF writer: Helvetica, lines, boxes, one logo image. */
'use strict';
const Forms = (() => {
const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
// ---------------------------------------------------------------- text encoding (WinAnsi) and widths
const WIN = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
  0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
const code = ch => { const c = ch.codePointAt(0); if (c >= 32 && c < 127) return c; if (c >= 160 && c <= 255) return c; if (WIN[c]) return WIN[c]; if (c === 0x2264) return null; return 63; };
const clean = s => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[‎‏‪-‮]/g, '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/ /g, ' ').replace(/[→]/g, '->').replace(/\t/g, ' ');
const bytesOf = s => { const out = []; for (const ch of clean(s)) { if (ch === '\n') continue; const c = code(ch); out.push(c == null ? 63 : c); } return out; };
const hasOdd = s => [...clean(s)].some(ch => ch !== '\n' && code(ch) === 63 && ch !== '?');
function textW(s, size, bold) { const W = bold ? W_BOLD : W_REG; let t = 0; for (const c of bytesOf(s)) t += W[c - 32] || 556; return t * size / 1000; }
const pdfStr = s => '(' + bytesOf(s).map(c => (c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c) : c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0'))).join('') + ')';
function wrap(s, width, size, bold) {
  const out = [];
  for (const para of clean(s).split('\n')) {
    const words = para.split(/ +/); let line = '';
    if (!para.trim()) { out.push(''); continue; }
    for (let w of words) {
      while (textW(w, size, bold) > width) {   // a very long word: break it
        let k = w.length; while (k > 1 && textW(w.slice(0, k), size, bold) > width) k--;
        if (line) { out.push(line); line = ''; }
        out.push(w.slice(0, k)); w = w.slice(k);
      }
      const t = line ? line + ' ' + w : w;
      if (textW(t, size, bold) <= width) line = t; else { if (line) out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}
const rgb = hex => { const h = String(hex || '#000').replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(v => +v.toFixed(3)).join(' '); };
async function zlib(u8) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  } catch (e) { return null; }
}

// ---------------------------------------------------------------- PDF writer (A4, top-left coordinates)
const PW = 595.28, PH = 841.89;
class Pdf {
  constructor() { this.pages = []; this.img = null; this.page = null; this.imgs = []; }
  addPage() { this.page = []; this.pages.push(this.page); }
  op(s) { this.page.push(s); }
  text(x, y, s, o = {}) {
    const size = o.size || 10, f = o.bold ? 'F2' : o.italic ? 'F3' : 'F1';
    let tx = x; if (o.align === 'right') tx = x - textW(s, size, o.bold); else if (o.align === 'center') tx = x - textW(s, size, o.bold) / 2;
    this.op(`BT /${f} ${size} Tf ${rgb(o.color || '#1f1f1f')} rg ${tx.toFixed(2)} ${(PH - y).toFixed(2)} Td ${pdfStr(s)} Tj ET`);
  }
  line(x1, y1, x2, y2, o = {}) { this.op(`${(o.w ?? 0.5)} w ${rgb(o.color || '#bfbfbf')} RG ${o.dash ? '[2 2] 0 d ' : ''}${x1.toFixed(2)} ${(PH - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PH - y2).toFixed(2)} l S${o.dash ? ' [] 0 d' : ''}`); }
  rect(x, y, w, h, o = {}) {
    const r = `${x.toFixed(2)} ${(PH - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`;
    if (o.fill && o.stroke) this.op(`${rgb(o.fill)} rg ${(o.w ?? 0.5)} w ${rgb(o.stroke)} RG ${r} B`);
    else if (o.fill) this.op(`${rgb(o.fill)} rg ${r} f`);
    else this.op(`${(o.w ?? 0.5)} w ${rgb(o.stroke || '#bfbfbf')} RG ${r} S`);
  }
  check(x, y, s, on) {
    this.rect(x, y, s, s, { stroke: '#595959', w: 0.8 });
    if (on) this.op(`1.4 w ${rgb('#1F3864')} RG 1 J 1 j ${(x + s * 0.2).toFixed(2)} ${(PH - y - s * 0.55).toFixed(2)} m ${(x + s * 0.42).toFixed(2)} ${(PH - y - s * 0.8).toFixed(2)} l ${(x + s * 0.82).toFixed(2)} ${(PH - y - s * 0.2).toFixed(2)} l S 0 J 0 j`);
  }
  setImage(im) { this.img = im; }   // { w, h, rgb: Uint8Array(w*h*3), alpha: Uint8Array(w*h) | null }
  /** another picture (a signature): returns the name to draw it with */
  addImage(im) { this.imgs.push(im); return 'Im' + (this.imgs.length + 1); }
  image(x, y, w, h, name) { if (name ? this.imgs[+name.slice(2) - 2] : this.img) this.op(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PH - y - h).toFixed(2)} cm /${name || 'Im1'} Do Q`); }
  async bytes() {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0; const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
    const objs = [];   // [body as array of strings/bytes]
    const add = body => { objs.push(body); return objs.length; };
    const catalog = add(null), pagesId = add(null);
    const f1 = add(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
    const f2 = add(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
    const f3 = add(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>']);
    const stream = async (data, extra) => { const z = await zlib(data); return z ? [`<< ${extra} /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, z, '\nendstream'] : [`<< ${extra} /Length ${data.length} >>\nstream\n`, data, '\nendstream']; };
    const addImg = async im => {
      const { w, h } = im; let smask = null;
      if (im.alpha) smask = add(await stream(im.alpha, `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8`));
      return add(await stream(im.rgb, `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask ? ` /SMask ${smask} 0 R` : ''}`));
    };
    const xo = [];
    if (this.img) xo.push(`/Im1 ${await addImg(this.img)} 0 R`);
    for (let i = 0; i < this.imgs.length; i++) xo.push(`/Im${i + 2} ${await addImg(this.imgs[i])} 0 R`);
    const res = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >>${xo.length ? ` /XObject << ${xo.join(' ')} >>` : ''} >>`;
    const kids = [];
    for (const pg of this.pages) {
      const data = enc.encode(pg.join('\n'));
      const z = await zlib(data);
      const cs = add(z ? [`<< /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, z, '\nendstream'] : [`<< /Length ${data.length} >>\nstream\n`, data, '\nendstream']);
      kids.push(add([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources ${res} /Contents ${cs} 0 R >>`]));
    }
    objs[catalog - 1] = [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`];
    objs[pagesId - 1] = [`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`];
    push('%PDF-1.4\n');
    objs.forEach((body, i) => { offs.push(len); push(`${i + 1} 0 obj\n`); body.forEach(push); push('\nendobj\n'); });
    const xref = len;
    push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
    push(`trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return out;
  }
}

// ---------------------------------------------------------------- the forms
const NAVY = '#1F3864', INK = '#1f1f1f', GREY = '#6b6b6b', LINE = '#bfbfbf', BAND = '#E9EEF6', RED = '#C00000', GREEN = '#2E7D32';
const M = 42, CW = PW - 2 * M;
const OUTCOMES = [['coaching', 'Coaching only (no warning)'], ['verbal', 'Verbal warning'], ['written', 'Written warning'], ['final', 'Final warning']];
const TOPICS = [['kpi', 'KPI results'], ['adh', 'Adherence / conformance']];
const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-').map(Number); if (!y || !m || !d) return String(iso); return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`; };

class Doc {
  constructor(f) { this.f = f; this.pdf = new Pdf(); if (f.logo) this.pdf.setImage(f.logo); this.newPage(); }
  get title() { return this.f.kind === 'kpi' ? 'KPI Results' : this.f.kind === 'final' ? 'One-to-One Outcome' : 'One-to-One Discussion'; }
  newPage() {
    const P = this.pdf; P.addPage(); this.pageNo = P.pages.length;
    let y = M - 6;
    const lg = this.f.logo; let logoW = 0;
    if (lg) { const h = 34, w = Math.min(150, h * lg.w / lg.h); const hh = w * lg.h / lg.w; P.image(M, y + (34 - hh) / 2, w, hh); logoW = w; }
    P.text(PW - M, y + 14, this.title.toUpperCase(), { size: 15, bold: true, color: NAVY, align: 'right' });
    P.text(PW - M, y + 28, this.f.kind === 'kpi' ? (this.f.subtitle || '') : this.f.kind === 'final' ? 'Final form – signed after the one-to-one investigation' : 'Supervisor and agent one-to-one', { size: 8.5, color: GREY, align: 'right' });
    if (!lg) P.text(M, y + 20, 'Member Care', { size: 11, bold: true, color: NAVY });
    P.rect(M, y + 42, CW, 1.6, { fill: NAVY });
    this.y = y + 56;
  }
  need(h) { if (this.y + h > PH - M - 8) { this.newPage(); return true; } return false; }
  heading(t, keep = 40) { this.need(keep); const P = this.pdf; P.rect(M, this.y, CW, 16, { fill: BAND }); P.rect(M, this.y, 3, 16, { fill: NAVY }); P.text(M + 9, this.y + 11.4, t.toUpperCase(), { size: 8.4, bold: true, color: NAVY }); this.y += 21; }
  grid(pairs, cols = 3) {   // [[label, value], ...]
    const P = this.pdf, cw = CW / cols, rows = Math.ceil(pairs.length / cols);
    for (let r = 0; r < rows; r++) {
      const cells = pairs.slice(r * cols, r * cols + cols);
      const lines = cells.map(([, v]) => wrap(v || '', cw - 12, 9.6, false));
      const h = Math.max(27, 16 + Math.max(...lines.map(l => l.length)) * 11.5);
      this.need(h);
      cells.forEach(([l], c) => {
        const x = M + c * cw; P.rect(x, this.y, cw, h, { stroke: LINE });
        P.text(x + 6, this.y + 10, l.toUpperCase(), { size: 6.8, bold: true, color: GREY });
        lines[c].forEach((ln, i) => P.text(x + 6, this.y + 20.5 + i * 11.5, ln, { size: 9.4, color: INK }));
      });
      for (let c = cells.length; c < cols; c++) P.rect(M + c * cw, this.y, cw, h, { stroke: LINE });
      this.y += h;
    }
    this.y += 8;
  }
  checks(items, cols, label) {   // [[label, on]]
    const P = this.pdf, lw = label ? 110 : 0, cw = (CW - lw) / cols;
    for (let i = 0; i < items.length; i += cols) {
      this.need(18);
      if (label && !i) P.text(M, this.y + 8.5, label, { size: 8.2, bold: true, color: NAVY });
      items.slice(i, i + cols).forEach(([l, on], c) => { const x = M + lw + c * cw; P.check(x + 2, this.y, 10, on); P.text(x + 18, this.y + 8.5, l, { size: 9.4, bold: !!on, color: INK }); });
      this.y += 18;
    }
    this.y += 4;
  }
  table(head, widths, rows, o = {}) {   // widths: fractions
    const P = this.pdf, ws = widths.map(w => w * CW), pad = 5;
    const hdr = () => { const h = 18; P.rect(M, this.y, CW, h, { fill: NAVY }); let x = M; head.forEach((t, i) => { P.text(x + pad, this.y + 12, t, { size: 8.2, bold: true, color: '#ffffff' }); x += ws[i]; }); this.y += h; };
    this.need(40); hdr();
    rows.forEach((r, ri) => {
      const cells = r.map((v, i) => wrap(typeof v === 'object' && v ? v.t : v, ws[i] - 2 * pad, 9, typeof v === 'object' && v && v.b));
      const h = Math.max(o.minH || 17, 7 + Math.max(...cells.map(c => c.length)) * 11);
      if (this.need(h)) hdr();
      if (ri % 2) P.rect(M, this.y, CW, h, { fill: '#F7F9FC' });
      let x = M;
      r.forEach((v, i) => {
        const o2 = typeof v === 'object' && v ? v : {};
        cells[i].forEach((ln, k) => P.text(x + pad, this.y + 12 + k * 11, ln, { size: 9, bold: !!o2.b, color: o2.c || INK }));
        P.rect(x, this.y, ws[i], h, { stroke: LINE }); x += ws[i];
      });
      this.y += h;
    });
    this.y += 8;
  }
  box(label, text, minH = 54) {
    const P = this.pdf, lines = wrap(text || '', CW - 14, 9.6, false), lh = 12.2;
    let i = 0, first = true;
    do {
      const room = PH - M - 8 - this.y - 16;
      const fit = Math.max(1, Math.floor((room - 10) / lh));
      if (room < 50) { this.newPage(); continue; }
      const chunk = lines.slice(i, i + fit), h = Math.max(first ? Math.min(minH, room) : 0, 10 + chunk.length * lh + 6);
      P.text(M, this.y + 8, label + (first ? '' : ' (continued)'), { size: 8.2, bold: true, color: NAVY });
      this.y += 13;
      P.rect(M, this.y, CW, h, { stroke: LINE });
      chunk.forEach((ln, k) => P.text(M + 7, this.y + 13 + k * lh, ln, { size: 9.6, color: INK }));
      this.y += h + 9; i += chunk.length; first = false;
    } while (i < lines.length);
  }
  para(t, o = {}) { const lines = wrap(t, CW, o.size || 9.2, o.bold); this.need(lines.length * 12 + 6); lines.forEach(l => { this.pdf.text(M, this.y + 9, l, { size: o.size || 9.2, color: o.color || INK, bold: o.bold, italic: o.italic }); this.y += 12; }); this.y += 4; }
  signatures(list, title, before = 0) {
    const P = this.pdf, cols = list.length, gap = 14, cw = (CW - gap * (cols - 1)) / cols, h = 86;
    this.need(h + 6 + (title ? 21 : 0) + before);
    if (before) before = 0;
    if (title) this.heading(title, 0);
    list.forEach((s, i) => {
      const x = M + i * (cw + gap);
      P.rect(x, this.y, cw, h, { stroke: LINE });
      P.rect(x, this.y, cw, 16, { fill: BAND });
      const role = wrap(s.role, cw - 10, 7.6, true)[0];
      P.text(x + 6, this.y + 11, role.toUpperCase(), { size: 7.6, bold: true, color: NAVY });
      P.text(x + 6, this.y + 30, 'Name', { size: 7, color: GREY });
      wrap(s.name || '', cw - 12, 9.4, true).slice(0, 2).forEach((ln, k) => P.text(x + 6, this.y + 42 + k * 11, ln, { size: 9.4, bold: true, color: INK }));
      P.text(x + 6, this.y + 57, 'Signature', { size: 7, color: GREY }); P.line(x + 6, this.y + 70, x + cw - 6, this.y + 70, { color: '#8c8c8c' });
      P.text(x + 6, this.y + 81, 'Date', { size: 7, color: GREY }); P.line(x + 30, this.y + 82, x + cw - 6, this.y + 82, { color: '#8c8c8c' });
      if (s.sig) {   // signed in the tool: the drawn signature on the line (or the typed name), and the day
        const g = s.sig, bx = x + 44, bw = cw - 50, by = this.y + 47, bh = 22;
        if (g.img && g.img.w && g.img.h) { const nm = P.addImage(g.img), r = Math.min(bw / g.img.w, bh / g.img.h); P.image(bx, by + (bh - g.img.h * r), g.img.w * r, g.img.h * r, nm); }
        else if (g.typed) { const sz = Math.max(7, Math.min(12, 12 * bw / Math.max(1, textW(g.typed, 12, false)))); P.text(bx, by + 19, g.typed, { size: sz, italic: true, color: NAVY }); }
        if (g.date) P.text(x + 32, this.y + 80.5, g.date, { size: 8.4, color: INK });
        if (g.note) P.text(x + cw - 6, this.y + 80.5, g.note, { size: 6.2, color: GREY, align: 'right' });
      }
    });
    this.y += h + 6;
  }
  footer() {
    const P = this.pdf, n = P.pages.length;
    P.pages.forEach((pg, i) => {
      P.page = pg;
      P.line(M, PH - M + 2, PW - M, PH - M + 2, { color: LINE });
      P.text(M, PH - M + 13, this.f.kind === 'kpi' ? `${this.title} · ${this.f.subtitle || ''}` : `${this.title} · ${this.f.agent.name || ''} · Ref ${this.f.ref || ''}`, { size: 7.2, color: GREY });
      P.text(PW / 2 + 60, PH - M + 13, 'Internal – confidential', { size: 7.2, color: GREY, align: 'center' });
      P.text(PW - M, PH - M + 13, `Page ${i + 1} of ${n}`, { size: 7.2, color: GREY, align: 'right' });
    });
  }
}

function agentGrid(d, f, extra) {
  const a = f.agent;
  d.grid([['Agent name', a.name], ['National ID', a.id || '—'], ['Team', a.teamName ? `${a.team} – ${a.teamName}` : a.team],
    ['Brand', a.brand], ['Supervisor', f.supervisor || ''], [f.kind === 'final' ? 'Date of this form' : 'Date of the one-to-one', fmtDate(f.date)],
    ['Period reviewed', f.period || ''], ...(extra || [['Form reference', f.ref || '']])]);
}
function resultsTable(d, f) {
  const rows = (f.results || []).filter(r => r && (r.metric || r.result));
  if (!rows.length) { d.box('Results', '', 40); return; }
  d.table(['Metric', 'Target', 'Result', 'Status'], [0.42, 0.18, 0.18, 0.22],
    rows.map(r => [r.metric, r.target || '', { t: r.result || '', b: true }, { t: r.status || '', b: !!r.status, c: /below|not met|miss/i.test(r.status || '') ? RED : /met|on target|ok/i.test(r.status || '') ? GREEN : INK }]));
  (f.details || []).filter(Boolean).forEach(t => d.para(t, { size: 8.4, color: GREY }));
}
/** last month's one-to-one, followed up: its actions (done?) and its KPIs then and now */
/** the supervisor's final on the agent's part: accepted or rejected, with the comment */
function verdictPart(d, f) {
  const V = f.verdict; if (!V) return;
  d.heading("Supervisor's final");
  d.checks([['Accepted', V.d === 'accepted'], ['Rejected', V.d === 'rejected']], 2, 'Decision');
  d.box('Final comment', V.comment || '', 30);
  d.para(`Sent to the agent by ${V.byName || f.supervisor || 'the supervisor'} on ${fmtDate(String(V.at || '').slice(0, 10)) || ''}.`, { size: 7.6, color: GREY });
}
const byAg = (f, k, l) => ((f.byAgent || []).includes(k) ? `${l} (written by the agent)` : l);
function followUp(d, f) {
  const F = f.followup; if (!F) return;
  const acts = (F.actions || []).filter(a => a && a.action), kp = F.kpis || []; if (!acts.length && !kp.length) return;
  const ST = { done: ['Done', GREEN], part: ['Partly', INK], no: ['Not done', RED] }, [y, m] = String(F.from || '').split('-').map(Number);
  d.heading(`Follow-up from ${F.label || ''}`);
  if (acts.length) d.table(["Last month's action", 'Owner', 'Due', 'Done?'], [0.52, 0.16, 0.14, 0.18], acts.map(a => { const x = ST[a.status] || ['Not checked', GREY]; return [a.action, a.owner || '', fmtDate(a.due) || '', { t: x[0], b: true, c: x[1] }]; }));
  if (kp.length) d.table(['KPI', m ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}` : 'Before', 'Now', 'Change'], [0.42, 0.18, 0.18, 0.22], kp.map(x => [x.metric, x.before || '–', { t: x.after || '–', b: true }, { t: x.better === true ? 'Better' : x.better === false ? 'Worse' : x.same ? 'Same' : '–', b: x.better != null, c: x.better === true ? GREEN : x.better === false ? RED : INK }]));
}
async function oneToOne(f) {
  const d = new Doc({ ...f, kind: '1to1' });
  d.heading('Agent details'); agentGrid(d, f);
  d.checks(TOPICS.map(([k, l]) => [l, !!(f.topics && f.topics[k])]), 2, 'Topics discussed');
  d.heading(`Results – ${f.period || ''}`); resultsTable(d, f);
  followUp(d, f);
  d.heading('Discussion');
  d.box(byAg(f, 'discussion', 'What was discussed'), f.discussion, 56);
  d.box(byAg(f, 'rootCause', 'Root cause'), f.rootCause, 30);
  d.box(byAg(f, 'agentComments', "Agent's comments"), f.agentComments, 40);
  d.heading('Agreed actions');
  const ag = new Set(f.agentRows || []), acts = (f.actions || []).map((a, i) => ({ ...(a || {}), mine: ag.has(i) })).filter(a => a.action || a.owner || a.due);
  d.table(['Action', 'Owner', 'Due date'], [0.6, 0.2, 0.2], (acts.length ? acts : [{}, {}]).map(a => [(a.action || '') + (a.mine ? ' (agent)' : ''), a.owner || '', fmtDate(a.due) || '']), { minH: acts.length ? 17 : 22 });
  d.y -= 4; d.para(`Next review date: ${fmtDate(f.reviewDate) || '____________________'}${(f.byAgent || []).includes('reviewDate') ? ' (written by the agent)' : ''}`, { size: 9, bold: true });
  verdictPart(d, f);
  if (f.agentSig && f.agentSig.comment) d.box("Agent's comment when signing", f.agentSig.comment, 26);
  d.signatures([{ role: 'Agent', name: f.agent.name, sig: f.agentSig || null }, { role: 'Supervisor', name: f.supervisor, sig: f.spvSig || null }], 'Signatures');
  if (f.agentSig) d.para(`Signed electronically by the agent in the MC tool on ${f.agentSig.when || f.agentSig.date || ''}${f.agentSig.ref ? ` · signature ${f.agentSig.ref}` : ''}.`, { size: 7.6, color: GREY });
  d.footer(); return d.pdf.bytes();
}
const STATEMENT = 'I confirm that the one-to-one discussion took place and that the outcome above was explained to me. I have received a copy of this form. My signature confirms receipt, not necessarily agreement.';
async function finalForm(f) {
  const d = new Doc({ ...f, kind: 'final' });
  d.heading('Agent details'); agentGrid(d, f, [['One-to-one held on', fmtDate(f.heldOn)], ['Form reference', f.ref || '']]);
  d.heading(`Results – ${f.period || ''}`); resultsTable(d, f);
  d.heading('Investigation');
  d.box('Summary of findings', f.findings, 50);
  d.box(byAg(f, 'agentComments', "Agent's explanation"), f.agentComments, 34);
  d.heading('Outcome (chosen by the supervisor)');
  d.checks(OUTCOMES.map(([k, l]) => [l, f.outcome === k]), 2);
  d.box('Action plan', f.actionPlan, 38);
  d.y -= 4; d.para(`Review date: ${fmtDate(f.reviewDate) || '____________________'}`, { size: 9, bold: true });
  if (f.consequence) d.para(f.consequence, { size: 8.6, italic: true, color: '#404040' });
  verdictPart(d, f);
  const st = wrap(f.statement || STATEMENT, CW, 9, false);
  d.need(21 + st.length * 12 + 4 + 92);
  d.heading('Agent acknowledgement and signatures', 0);
  d.para(f.statement || STATEMENT, { size: 9 });
  if (f.agentSig && f.agentSig.comment) d.box("Agent's comment when signing", f.agentSig.comment, 26);
  d.signatures([{ role: 'Agent', name: f.agent.name, sig: f.agentSig || null }, { role: 'Supervisor', name: f.supervisor, sig: f.spvSig || null }, { role: f.managerTitle || 'Member Care Senior Manager', name: f.manager || 'Mohammed Alshubily' }]);
  if (f.agentSig) d.para(`Signed electronically by the agent in the MC tool on ${f.agentSig.when || f.agentSig.date || ''}${f.agentSig.ref ? ` · signature ${f.agentSig.ref}` : ''}.`, { size: 7.6, color: GREY });
  d.footer(); return d.pdf.bytes();
}

/** KPI result cards: one page per agent. cards: [{agent:{name,id,team,teamName,brand}, scorecard, rows:[{name,result,target,rank,weight}], sum:{...}}] */
async function kpiCards(cards, opt = {}) {
  const d = new Doc({ kind: 'kpi', subtitle: opt.period || '', logo: opt.logo, agent: {} });
  cards.forEach((c, i) => {
    if (i) d.newPage();
    d.heading(`${c.agent.name || ''}`);
    d.grid([['National ID', c.agent.id || '—'], ['Team', c.agent.teamName ? `${c.agent.team} – ${c.agent.teamName}` : c.agent.team], ['Brand', c.agent.brand || ''], ['Scorecard', c.scorecard || ''], ['Period', opt.period || ''], ['Final %', c.sum.finalPct || '–']]);
    d.heading('KPI results');
    d.table(['KPI', 'Weight', 'Target', 'Result', 'Ranking'], [0.38, 0.12, 0.18, 0.16, 0.16],
      c.rows.map(r => [r.name, r.weight, r.target, { t: r.result, b: true }, { t: r.rank == null ? 'missing' : String(r.rank), b: true, c: r.rank == null ? GREY : r.rank >= 4 ? GREEN : r.rank <= 2 ? RED : INK }]));
    d.heading('Result');
    d.grid([['Final ranking', c.sum.finalRank || '–'], ['Final %', c.sum.finalPct || '–'], ['Scheduled days', c.sum.sched ?? '–'], ['Actual days', c.sum.actual ?? '–'], ['Actual days %', c.sum.daysPct || '–'], ['Incentive target (SR)', c.sum.target ?? '–'], ['Earned (SR)', c.sum.earned ?? '–'], ['Missing KPIs', c.sum.missing || 'None'], ['Comment', c.sum.comment || '']]);
    if (c.note) d.para(c.note, { size: 8.4, color: GREY });
  });
  d.footer(); return d.pdf.bytes();
}

return { oneToOne, finalForm, kpiCards, STATEMENT, wrap, textW, hasOdd, OUTCOMES, TOPICS, fmtDate, Pdf };
})();
if (typeof module !== 'undefined') module.exports = Forms;
