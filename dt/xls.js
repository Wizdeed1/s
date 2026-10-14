
/* Minimal CFB + BIFF8 (.xls) reader — enough for Crystal Reports exports. */
(function (root) {
  'use strict';

  function CFB(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    const sig = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
    for (let i=0;i<8;i++) if (u8[i]!==sig[i]) throw new Error('Not an OLE/.xls file');
    const ssz = 1 << dv.getUint16(30, true);
    const mssz = 1 << dv.getUint16(32, true);
    const dirStart = dv.getUint32(48, true);
    const miniCutoff = dv.getUint32(56, true);
    const miniFatStart = dv.getUint32(60, true);
    const difatStart = dv.getUint32(68, true);
    const difatCount = dv.getUint32(72, true);

    const difat = [];
    for (let i=0;i<109;i++) difat.push(dv.getUint32(76 + i*4, true));
    let s = difatStart;
    for (let n=0; n<difatCount && s < 0xFFFFFFFA; n++) {
      const off = (s+1)*ssz, per = ssz/4 - 1;
      for (let i=0;i<per;i++) difat.push(dv.getUint32(off + i*4, true));
      s = dv.getUint32(off + per*4, true);
    }
    const fat = [];
    for (const sec of difat) {
      if (sec >= 0xFFFFFFFA) continue;
      const off = (sec+1)*ssz;
      if (off + ssz > buf.byteLength) continue;
      for (let i=0;i<ssz/4;i++) fat.push(dv.getUint32(off + i*4, true));
    }
    function chain(start, mini, miniStream) {
      const parts = []; let cur = start; const seen = new Set();
      const table = mini ? miniFat : fat, size = mini ? mssz : ssz;
      while (cur < 0xFFFFFFFA && !seen.has(cur)) {
        seen.add(cur);
        if (mini) parts.push(miniStream.subarray(cur*size, (cur+1)*size));
        else { const o=(cur+1)*size; parts.push(u8.subarray(o, o+size)); }
        cur = cur < table.length ? table[cur] : 0xFFFFFFFE;
      }
      let len = 0; for (const p of parts) len += p.length;
      const out = new Uint8Array(len); let k=0;
      for (const p of parts) { out.set(p, k); k += p.length; }
      return out;
    }
    let miniFat = [];
    if (miniFatStart < 0xFFFFFFFA) {
      const mf = chain(miniFatStart, false, null);
      const mdv = new DataView(mf.buffer, mf.byteOffset, mf.byteLength);
      for (let i=0;i+4<=mf.length;i+=4) miniFat.push(mdv.getUint32(i, true));
    }
    const dirBytes = chain(dirStart, false, null);
    const ddv = new DataView(dirBytes.buffer, dirBytes.byteOffset, dirBytes.byteLength);
    const entries = [];
    for (let off=0; off+128<=dirBytes.length; off+=128) {
      const nlen = ddv.getUint16(off+64, true);
      let name = '';
      for (let i=0;i+1<Math.max(0,nlen-1);i+=2) name += String.fromCharCode(ddv.getUint16(off+i, true));
      entries.push({ name, type: dirBytes[off+66], start: ddv.getUint32(off+116, true), size: Number(ddv.getBigUint64(off+120, true)) });
    }
    const root = entries.find(e => e.type === 5);
    const miniStream = root ? chain(root.start, false, null) : new Uint8Array(0);
    return {
      stream(name) {
        const e = entries.find(x => x.name === name && x.type === 2);
        if (!e) return null;
        const data = e.size < miniCutoff ? chain(e.start, true, miniStream) : chain(e.start, false, null);
        return data.subarray(0, e.size);
      },
      names: entries.map(e => e.name)
    };
  }

  function rkToNumber(rk) {
    const fx100 = rk & 1, fInt = rk & 2;
    let val;
    if (fInt) { val = rk >> 2; }
    else {
      const b = new ArrayBuffer(8), d = new DataView(b);
      d.setUint32(4, rk & 0xFFFFFFFC, true); d.setUint32(0, 0, true);
      val = d.getFloat64(0, true);
    }
    return fx100 ? val / 100 : val;
  }

  // Parse SST across CONTINUE boundaries.
  function parseSST(chunks) {
    let bi = 0, off = 8; // skip cstTotal/cstUnique in first chunk
    const buf = chunks[0];
    const dv0 = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const nUnique = dv0.getUint32(4, true);
    const strings = [];
    let cur = chunks[bi], dv = new DataView(cur.buffer, cur.byteOffset, cur.byteLength);
    function need(n) {
      while (off >= cur.length) { // move to next chunk
        bi++; if (bi >= chunks.length) return false;
        cur = chunks[bi]; dv = new DataView(cur.buffer, cur.byteOffset, cur.byteLength); off = 0;
      }
      return off + n <= cur.length || true;
    }
    for (let i=0;i<nUnique;i++) {
      if (!need(3)) break;
      if (off + 3 > cur.length) { bi++; if (bi>=chunks.length) break; cur=chunks[bi]; dv=new DataView(cur.buffer,cur.byteOffset,cur.byteLength); off=0; }
      const cch = dv.getUint16(off, true); off += 2;
      let grbit = cur[off]; off += 1;
      let high = grbit & 1, ext = grbit & 4, rich = grbit & 8;
      let cRun = 0, cbExt = 0;
      if (rich) { cRun = dv.getUint16(off, true); off += 2; }
      if (ext)  { cbExt = dv.getUint32(off, true); off += 4; }
      let str = '', read = 0;
      while (read < cch) {
        if (off >= cur.length) {
          bi++; if (bi >= chunks.length) break;
          cur = chunks[bi]; dv = new DataView(cur.buffer, cur.byteOffset, cur.byteLength); off = 0;
          high = cur[off] & 1; off += 1;               // continuation re-declares the flag
        }
        if (high) {
          if (off + 2 > cur.length) { off = cur.length; continue; }
          str += String.fromCharCode(dv.getUint16(off, true)); off += 2;
        } else {
          str += String.fromCharCode(cur[off]); off += 1;
        }
        read++;
      }
      // skip rich-run and ext data, which may also span chunks
      let skip = cRun*4 + cbExt;
      while (skip > 0) {
        if (off >= cur.length) { bi++; if (bi>=chunks.length) break; cur=chunks[bi]; dv=new DataView(cur.buffer,cur.byteOffset,cur.byteLength); off=0; }
        const take = Math.min(skip, cur.length - off); off += take; skip -= take;
      }
      strings.push(str);
    }
    return strings;
  }

  function unicodeString(dv, u8, off, lenBytes) {
    const cch = lenBytes === 2 ? dv.getUint16(off, true) : u8[off];
    off += lenBytes;
    const grbit = u8[off]; off += 1;
    let s = '';
    if (grbit & 1) { for (let i=0;i<cch;i++) s += String.fromCharCode(dv.getUint16(off + i*2, true)); off += cch*2; }
    else { for (let i=0;i<cch;i++) s += String.fromCharCode(u8[off + i]); off += cch; }
    return { s, off };
  }

  function parseXls(buf) {
    const cfb = CFB(buf);
    const wbBytes = cfb.stream('Workbook') || cfb.stream('Book');
    if (!wbBytes) throw new Error('No Workbook stream');
    const dv = new DataView(wbBytes.buffer, wbBytes.byteOffset, wbBytes.byteLength);

    // pass 1: records
    const recs = [];
    for (let p = 0; p + 4 <= wbBytes.length;) {
      const id = dv.getUint16(p, true), len = dv.getUint16(p+2, true);
      recs.push({ id, off: p+4, len });
      p += 4 + len;
      if (len === 0 && id === 0) break;
    }
    // SST (+ CONTINUE)
    let sst = [];
    for (let i=0;i<recs.length;i++) {
      if (recs[i].id === 0x00FC) {
        const chunks = [wbBytes.subarray(recs[i].off, recs[i].off + recs[i].len)];
        let j = i+1;
        while (j < recs.length && recs[j].id === 0x003C) { chunks.push(wbBytes.subarray(recs[j].off, recs[j].off + recs[j].len)); j++; }
        sst = parseSST(chunks);
        break;
      }
    }
    // sheets
    const sheets = [];
    for (const r of recs) {
      if (r.id === 0x0085) {
        const pos = dv.getUint32(r.off, true);
        const cch = wbBytes[r.off+6], grbit = wbBytes[r.off+7];
        let name = '';
        if (grbit & 1) for (let i=0;i<cch;i++) name += String.fromCharCode(dv.getUint16(r.off+8+i*2, true));
        else for (let i=0;i<cch;i++) name += String.fromCharCode(wbBytes[r.off+8+i]);
        sheets.push({ name, pos, cells: new Map(), maxRow: -1, maxCol: -1 });
      }
    }
    if (!sheets.length) sheets.push({ name: 'Sheet1', pos: 0, cells: new Map(), maxRow: -1, maxCol: -1 });

    // map record offset -> sheet by BOF positions
    const bofPos = sheets.map(s => s.pos).sort((a,b)=>a-b);
    function sheetFor(recStart) {
      let best = null;
      for (const s of sheets) if (s.pos <= recStart && (best === null || s.pos > best.pos)) best = s;
      return best || sheets[0];
    }
    let pendingFormula = null;
    for (const r of recs) {
      const recStart = r.off - 4;
      const put = (row, col, v, t) => {
        const sh = sheetFor(recStart);
        if (!sh) return;
        sh.cells.set(row + ':' + col, { v, t });
        if (row > sh.maxRow) sh.maxRow = row;
        if (col > sh.maxCol) sh.maxCol = col;
      };
      switch (r.id) {
        case 0x00FD: { // LABELSST
          const row = dv.getUint16(r.off, true), col = dv.getUint16(r.off+2, true), isst = dv.getUint32(r.off+6, true);
          put(row, col, sst[isst] !== undefined ? sst[isst] : '', 's'); break;
        }
        case 0x0204: { // LABEL
          const row = dv.getUint16(r.off, true), col = dv.getUint16(r.off+2, true);
          const { s } = unicodeString(dv, wbBytes, r.off+6, 2);
          put(row, col, s, 's'); break;
        }
        case 0x0203: { // NUMBER
          const row = dv.getUint16(r.off, true), col = dv.getUint16(r.off+2, true);
          put(row, col, dv.getFloat64(r.off+6, true), 'n'); break;
        }
        case 0x027E: { // RK
          const row = dv.getUint16(r.off, true), col = dv.getUint16(r.off+2, true);
          put(row, col, rkToNumber(dv.getInt32(r.off+6, true)), 'n'); break;
        }
        case 0x00BD: { // MULRK
          const row = dv.getUint16(r.off, true), colF = dv.getUint16(r.off+2, true);
          const n = (r.len - 6) / 6;
          for (let i=0;i<n;i++) put(row, colF+i, rkToNumber(dv.getInt32(r.off+4+i*6+2, true)), 'n');
          break;
        }
        case 0x0006: { // FORMULA
          const row = dv.getUint16(r.off, true), col = dv.getUint16(r.off+2, true);
          const b6 = wbBytes[r.off+6], b12 = wbBytes[r.off+12], b13 = wbBytes[r.off+13];
          if (b12 === 0xFF && b13 === 0xFF) {
            if (b6 === 0) { pendingFormula = { row, col, sheetStart: recStart }; }
            else pendingFormula = null;
          } else { put(row, col, dv.getFloat64(r.off+6, true), 'n'); pendingFormula = null; }
          break;
        }
        case 0x0207: { // STRING (result of formula)
          if (pendingFormula) {
            const { s } = unicodeString(dv, wbBytes, r.off, 2);
            const sh = sheetFor(pendingFormula.sheetStart);
            if (sh) {
              sh.cells.set(pendingFormula.row + ':' + pendingFormula.col, { v: s, t: 's' });
              if (pendingFormula.row > sh.maxRow) sh.maxRow = pendingFormula.row;
              if (pendingFormula.col > sh.maxCol) sh.maxCol = pendingFormula.col;
            }
            pendingFormula = null;
          }
          break;
        }
        default: break;
      }
    }
    return sheets.map(s => {
      const rows = [];
      for (let r=0;r<=s.maxRow;r++) {
        const row = [];
        for (let c=0;c<=s.maxCol;c++) { const cell = s.cells.get(r+':'+c); row.push(cell ? cell.v : null); }
        rows.push(row);
      }
      return { name: s.name, rows };
    });
  }

  root.parseXls = parseXls;

  /* Minimal .xlsx reader (FRiENDi Pay ticket sheets). An .xlsx is a zip of XML files: read the
     zip directory, inflate with the browser's own DecompressionStream, parse the first sheet.
     Returns the same shape as parseXls: [{ name, rows: [[cell, ...], ...] }]. */
  async function parseXlsx(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not an .xlsx file');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
      files[name] = { method, csize, lho };
      p += 46 + nlen + elen + clen;
    }
    async function read(name) {
      const f = files[name];
      if (!f) return null;
      const start = f.lho + 30 + dv.getUint16(f.lho + 26, true) + dv.getUint16(f.lho + 28, true);
      const data = u8.subarray(start, start + f.csize);
      if (f.method === 0) return new TextDecoder().decode(data);
      if (typeof DecompressionStream === 'undefined') throw new Error('this browser cannot open .xlsx — save it as .csv');
      const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      return new TextDecoder().decode(out);
    }
    const xml = s => new DOMParser().parseFromString(s, 'application/xml');
    const byTag = (el, tag) => Array.from(el.getElementsByTagName(tag));
    const text = el => byTag(el, 't').map(t => t.textContent).join('');

    const shared = [];
    const sst = await read('xl/sharedStrings.xml');
    if (sst) byTag(xml(sst), 'si').forEach(si => shared.push(text(si)));

    // every sheet, in workbook order, through workbook.xml and its relationships
    const sheets = [];
    const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      const relMap = {};
      byTag(xml(rels), 'Relationship').forEach(r => { relMap[r.getAttribute('Id')] = r.getAttribute('Target'); });
      byTag(xml(wb), 'sheet').forEach(sh => {
        const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const t = relMap[rid];
        if (!t) return;
        const path = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
        if (files[path]) sheets.push({ name: sh.getAttribute('name') || 'Sheet', path: path });
      });
    }
    if (!sheets.length) {
      Object.keys(files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()
        .forEach((p, i) => sheets.push({ name: 'Sheet' + (i + 1), path: p }));
    }
    if (!sheets.length) throw new Error('No sheet in the .xlsx file');

    const colIndex = ref => { let n = 0; for (const ch of String(ref).replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
    const out = [];
    for (const sheet of sheets) {
      const rows = [];
      byTag(xml(await read(sheet.path)), 'row').forEach((rowEl, ri) => {
        const r = rowEl.getAttribute('r') ? +rowEl.getAttribute('r') - 1 : ri;
        const row = rows[r] = rows[r] || [];
        byTag(rowEl, 'c').forEach((c, ci) => {
          const col = c.getAttribute('r') ? colIndex(c.getAttribute('r')) : ci;
          const t = c.getAttribute('t'), v = byTag(c, 'v')[0];
          let val = null;
          if (t === 's') val = v ? (shared[+v.textContent] !== undefined ? shared[+v.textContent] : '') : '';
          else if (t === 'inlineStr') val = text(c);
          else if (t === 'str' || t === 'e') val = v ? v.textContent : '';
          else if (t === 'b') val = v ? v.textContent === '1' : null;
          else if (v) { const f = parseFloat(v.textContent); val = isNaN(f) ? v.textContent : f; }
          row[col] = val;
        });
      });
      for (let i = 0; i < rows.length; i++) rows[i] = rows[i] || [];
      out.push({ name: sheet.name, rows: rows });
    }
    return out;
  }
  root.parseXlsx = parseXlsx;
})(typeof module !== 'undefined' ? module.exports : window);

