/* MC Monthly Report Builder - formula workbook writer (no dependencies) */
'use strict';
const Writer2 = ((C) => {
const esc = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const { colName, ref } = C;
// ------------------------------------------------------------ styles
class Styles {
  constructor() {
    this.fonts = []; this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']; this.numFmts = []; this.xfs = []; this.dxfs = [];
    this.cache = new Map();
    this._font({ sz: 11, color: 'FF000000' });
    this.xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  }
  _idx(list, x) { let i = list.indexOf(x); if (i < 0) { list.push(x); i = list.length - 1; } return i; }
  _font({ name = 'Calibri', sz = 10, b = false, i = false, color = 'FF262626' } = {}) {
    return this._idx(this.fonts, `<font>${b ? '<b/>' : ''}${i ? '<i/>' : ''}<sz val="${sz}"/><color rgb="${color}"/><name val="${name}"/><family val="2"/></font>`);
  }
  _fill(rgb) { return rgb ? this._idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`) : 0; }
  _border(b, style) {
    if (!b) return 0;
    const side = (n, col) => (col ? `<${n} style="${style || 'thin'}"><color rgb="${col}"/></${n}>` : `<${n}/>`);
    const o = typeof b === 'string' ? { l: b, r: b, t: b, b: b } : b;
    return this._idx(this.borders, `<border>${side('left', o.l)}${side('right', o.r)}${side('top', o.t)}${side('bottom', o.b)}<diagonal/></border>`);
  }
  _numFmt(code) {
    const builtin = { General: 0, '0': 1, '0.00': 2, '0%': 9, '0.00%': 10, '@': 49 };
    if (code == null) return 0; if (builtin[code] != null) return builtin[code];
    let i = this.numFmts.indexOf(code); if (i < 0) { this.numFmts.push(code); i = this.numFmts.length - 1; } return 164 + i;
  }
  get(st = {}) {
    const key = JSON.stringify(st); if (this.cache.has(key)) return this.cache.get(key);
    const f = this._font(st.font), fi = this._fill(st.fill), b = this._border(st.border, st.bstyle), n = this._numFmt(st.numFmt);
    const a = st.align || {};
    const al = `<alignment${a.h ? ` horizontal="${a.h}"` : ''} vertical="${a.v || 'center'}"${a.wrap ? ' wrapText="1"' : ''}/>`;
    this.xfs.push(`<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`);
    const id = this.xfs.length - 1; this.cache.set(key, id); return id;
  }
  dxf({ color, b, fill } = {}) {
    const font = color || b ? `<font>${b ? '<b/>' : ''}${color ? `<color rgb="${color}"/>` : ''}</font>` : '';
    const fl = fill ? `<fill><patternFill patternType="solid"><fgColor rgb="${fill}"/><bgColor rgb="${fill}"/></patternFill></fill>` : '';
    return this._idx(this.dxfs, `<dxf>${font}${fl}</dxf>`);
  }
  xml() {
    const nf = this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(c)}"/>`).join('')}</numFmts>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${nf}` +
      `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
      `<dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs></styleSheet>`;
  }
}

// ------------------------------------------------------------ sheet
class Sheet {
  constructor(name) { Object.assign(this, { name, rows: new Map(), widths: {}, heights: {}, merges: [], cf: [], dv: [], freeze: null, filter: null, tab: null, grid: false, maxR: 1, maxC: 1, defH: 15 }); }
  set(r, c, v, s, f) {
    if (!this.rows.has(r)) this.rows.set(r, new Map());
    this.rows.get(r).set(c, { v, s, f }); this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c);
  }
  width(c, w) { this.widths[c] = w; }
  merge(r1, c1, r2, c2) { this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`); }
  addCF(sqref, formula, dxfId, stop, type) { this.cf.push({ sqref, formula, dxfId, stop, type }); }
  cellXml(r, c, cell) {
    const a = `r="${ref(r, c)}"${cell.s ? ` s="${cell.s}"` : ''}`;
    let v = cell.v;
    if (v instanceof Date) v = (v.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
    if (cell.f != null) {
      const f = `<f>${esc(cell.f)}</f>`;
      if (typeof v === 'number' && Number.isFinite(v)) return `<c ${a}>${f}<v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c ${a} t="b">${f}<v>${v ? 1 : 0}</v></c>`;
      return `<c ${a} t="str">${f}<v>${esc(v ?? '')}</v></c>`;
    }
    if (v == null || v === '') return `<c ${a}/>`;
    if (typeof v === 'number') return Number.isFinite(v) ? `<c ${a}><v>${v}</v></c>` : `<c ${a}/>`;
    if (typeof v === 'boolean') return `<c ${a} t="b"><v>${v ? 1 : 0}</v></c>`;
    return `<c ${a} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  }
  xml(selected) {
    const out = [];
    out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
    out.push(`<sheetPr>${this.tab ? `<tabColor rgb="${this.tab}"/>` : ''}</sheetPr>`);
    out.push(`<dimension ref="A1:${ref(this.maxR, this.maxC)}"/>`);
    let pane = '';
    if (this.freeze) {
      const [fr, fc] = this.freeze; const xs = fc - 1, ys = fr - 1;
      const ap = xs && ys ? 'bottomRight' : ys ? 'bottomLeft' : 'topRight';
      pane = `<pane${xs ? ` xSplit="${xs}"` : ''}${ys ? ` ySplit="${ys}"` : ''} topLeftCell="${ref(fr, fc)}" activePane="${ap}" state="frozen"/><selection pane="${ap}" activeCell="${ref(fr, fc)}" sqref="${ref(fr, fc)}"/>`;
    }
    out.push(`<sheetViews><sheetView workbookViewId="0"${this.grid ? '' : ' showGridLines="0"'}${selected ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews>`);
    out.push(`<sheetFormatPr defaultRowHeight="${this.defH}"/>`);
    const hid = new Set(this.hideCols || []);
    for (const c of hid) if (this.widths[c] == null) this.widths[c] = 3;
    const cols = Object.keys(this.widths).map(Number).sort((a, b) => a - b);
    if (cols.length) out.push(`<cols>${cols.map(c => `<col min="${c}" max="${c}" width="${this.widths[c]}"${hid.has(c) ? ' hidden="1"' : ''} customWidth="1"/>`).join('')}</cols>`);
    out.push('<sheetData>');
    const rs = new Set([...this.rows.keys(), ...Object.keys(this.heights).map(Number)]);
    for (const r of [...rs].sort((a, b) => a - b)) {
      const h = this.heights[r]; const cells = this.rows.get(r);
      const cx = cells ? [...cells.keys()].sort((a, b) => a - b).map(c => this.cellXml(r, c, cells.get(c))).join('') : '';
      out.push(`<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cx}</row>`);
    }
    out.push('</sheetData>');
    if (this.filter) out.push(`<autoFilter ref="${this.filter}"/>`);
    if (this.merges.length) out.push(`<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`);
    let pr = 1;
    for (const r of this.cf) out.push(r.type === 'dup' ? `<conditionalFormatting sqref="${r.sqref}"><cfRule type="duplicateValues" dxfId="${r.dxfId}" priority="${pr++}"/></conditionalFormatting>`
      : `<conditionalFormatting sqref="${r.sqref}"><cfRule type="expression" dxfId="${r.dxfId}" priority="${pr++}"${r.stop ? ' stopIfTrue="1"' : ''}><formula>${esc(r.formula)}</formula></cfRule></conditionalFormatting>`);
    if (this.dv.length) out.push(`<dataValidations count="${this.dv.length}">${this.dv.map(d => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${d.sqref}"><formula1>${esc(d.list)}</formula1></dataValidation>`).join('')}</dataValidations>`);
    out.push('<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' + (this._drawing ? '<drawing r:id="rId1"/>' : '') + '</worksheet>');
    return out.join('');
  }
  /** the company logo, floating at row r of column c (it never covers a formula; cells stay as they are) */
  logoAt(c, r = 1, h = 34, dx = 0, dy = 4) { this.logo = { c, r, h, dx, dy }; }
  /** the first column whose left edge is at least px pixels from the left */
  /** logo in the title row, just right of the title text */
  titleLogo(perChar = 10.5, minPx = 380) {
    const t = this.rows.get(1) && this.rows.get(1).get(1), len = t && typeof t.v === 'string' ? t.v.length : 0;
    if (!this.heights[1] || this.heights[1] < 30) this.heights[1] = 30;
    this.logoAt(this.colAtPx(Math.max(minPx, Math.round(len * perChar) + 50)), 1, 32, 0, 3);
  }
  colAtPx(px) { let x = 0, c = 1; while (x < px && c < 200) { const w = this.widths[c] ?? 8.43; x += Math.round(w * 7 + 5); c++; } return c; }
}
const EMU = 9525;
function drawingXml(L, logo) {
  const w = Math.round(L.h * logo.w / logo.h), cx = w * EMU, cy = L.h * EMU;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<xdr:oneCellAnchor><xdr:from><xdr:col>${L.c - 1}</xdr:col><xdr:colOff>${(L.dx || 0) * EMU}</xdr:colOff><xdr:row>${L.r - 1}</xdr:row><xdr:rowOff>${(L.dy || 0) * EMU}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/>` +
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="${esc(logo.alt || 'Logo')}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
    `<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>` +
    '<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>';
}

async function pack(sheets, styles, defNames = {}, opts = {}) {
  const logo = opts.logo && opts.logo.png ? opts.logo : null;
  sheets.forEach(s => { s._drawing = !!(logo && s.logo); });
  const drawn = sheets.map((s, i) => [s, i]).filter(([s]) => s._drawing);
  const wbRels = sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  const names = Object.entries(defNames).map(([n, r]) => `<definedName name="${n}">${esc(r)}</definedName>`).join('') + sheets.map((s, i) => (s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${s.name.replace(/'/g, "''")}'!${s.filter.split(':').map(x => x.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':')}</definedName>` : '')).join('');
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      (drawn.length ? '<Default Extension="png" ContentType="image/png"/>' + drawn.map(([, i]) => `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('') : '') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('') + `</sheets>${names ? `<definedNames>${names}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>` },
    { name: 'xl/styles.xml', data: styles.xml() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml(i === 0) })),
  ];
  if (drawn.length) {
    const R = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
    const rels = body => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
    files.push({ name: 'xl/media/logo.png', data: logo.png });
    for (const [s, i] of drawn) {
      files.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, data: rels(R('rId1', 'drawing', `../drawings/drawing${i + 1}.xml`)) });
      files.push({ name: `xl/drawings/drawing${i + 1}.xml`, data: drawingXml(s.logo, logo) });
      files.push({ name: `xl/drawings/_rels/drawing${i + 1}.xml.rels`, data: rels(R('rId1', 'image', '../media/logo.png')) });
    }
  }
  return C.writeZip(files);
}

// ------------------------------------------------------------ formula workbook (v2)
const KEYF = (idRef, nameRef) => {
  const c = `TRIM(SUBSTITUTE(${idRef}&"",CHAR(160)," "))`;
  const n = `IFERROR(--${c},IFERROR(--LEFT(${c},LEN(${c})-1),"x"))`;
  return `IF(ISNUMBER(${n}),${n}&"",IF(TRIM(${nameRef}&"")="","","N:"&TRIM(${nameRef})))`;
};
const keyOf = (nid, name) => { const id = C.cleanId(nid); return id ? id : (C.normSpace(name) ? 'N:' + C.normSpace(name) : ''); };
const idCell = nid => { const id = C.cleanId(nid); return id && id.length <= 15 && String(nid).replace(/\D/g, '') === id ? Number(id) : (C.normSpace(nid) || ''); };

/* One entry per roster person, with everything the formulas compute (shared by the incentive workbook). */
function attCounts(q) {   // the same counts the Attendance formulas make
  const c = { filled: 0, attend: 0, nums: 0, tardyDays: 0, tardySum: 0, absent: 0, al: 0, sl: 0, off: 0, other: 0 };
  for (const v of q.attDays || []) {
    if (v == null || v === '') continue; c.filled++;
    if (typeof v === 'number') { c.nums++; if (v > 0) { c.tardyDays++; c.tardySum += v; } continue; }
    const l = String(v).toLowerCase();
    if (l === 'attend') c.attend++; else if (l === 'absent') c.absent++; else if (l === 'al') c.al++; else if (l === 'sl') c.sl++; else if (l === 'off') c.off++; else c.other++;
  }
  c.worked = c.attend + c.nums; c.tardyMin = q.tardyFile > 0 ? q.tardyFile : c.tardySum;
  return c;
}
function peopleModel(ctx, R0 = 5) {
  const set = ctx.settings, ND = C.daysIn(ctx.year, ctx.month);
  const rawAdh = ctx.rawAdh, rawAht = ctx.rawAht, rawSched = ctx.rawSched, rawAct = ctx.rawActual;
  const rowIndex = list => { const m = new Map(); list.forEach((x, i) => { const k = C.normName(x.name); if (!m.has(k)) m.set(k, i + 2); }); return m; };
  const iAdh = rowIndex(rawAdh), iAht = rowIndex(rawAht), iSch = rowIndex(rawSched), iAct = rowIndex(rawAct);
  const attOf = p => (ctx.attendance && p._id != null && ctx.attendance.get(p._id)) || null;
  // no schedule this month: the Schedule export has no day for them and no attendance was filled. Left out of every sheet
  // (the Roster sheet too) unless the setting is off; the Overview names them.
  const schKnown = (rawSched || []).length > 0;
  const noSchedOf = p => {
    if (!schKnown) return false;
    const sr = iSch.get(C.normName(C.normSpace(C.normSpace(p.sys) ? p.sys : p.name))), row = sr ? rawSched[sr - 2] : null, a = attOf(p);
    return (!row || (Array.isArray(row.days) && row.days.every(v => v == null))) && !(a && a.days && a.days.some(v => v != null && v !== ''));
  };
  const all = ctx.roster.filter(p => C.normSpace(p.name)), noSched = all.filter(noSchedOf);
  const roster = set.hideNoSched !== false && noSched.length ? all.filter(p => !noSched.includes(p)) : all;
  const people = roster.map((p, i) => {
    const exp = C.normSpace(C.normSpace(p.sys) ? p.sys : p.name), key = keyOf(p.nid, p.name), ek = C.normName(exp);
    const adhRow = iAdh.get(ek) || '', ahtRow = iAht.get(ek) || '', schRow = iSch.get(ek) || '', actRow = iAct.get(ek) || '';
    const adhVals = adhRow ? rawAdh[adhRow - 2].days : null;
    const adhDays = adhVals ? adhVals.filter(v => typeof v === 'number' && v >= set.floor).length : 0;
    const status = p.status === 'Inactive' ? 'Inactive' : 'Active';
    const aht = ahtRow ? rawAht[ahtRow - 2].sec : null;
    const a = attOf(p), days = a ? a.days.slice(0, ND) : null;
    return { ...p, r: R0 + i, exp, key, adhRow, ahtRow, schRow, actRow, adhVals, adhDays, status, aht, attDays: days, tardyFile: a && a.tardyFile ? a.tardyFile : null };
  });
  const seen = new Set(); people.forEach((p, i) => { p.attRow = seen.has(p.key) ? (people.findIndex(q => q.key === p.key) + 1) : i + 1; seen.add(p.key); });
  people.forEach(p => { p.att = attCounts(people[p.attRow - 1]); });
  people.forEach(p => {
    p.attended = p.att.filled > 0 ? p.att.worked : p.adhDays;
    p.shown = p.status !== 'Inactive' || p.attended >= set.inactiveMin ? 1 : 0;
    p.hasAdh = p.shown && p.adhRow ? 1 : 0; p.hasAht = p.shown && p.ahtRow && p.aht != null ? 1 : 0;
    p.inDed = p.shown && set.dedBrands.includes(C.normSpace(p.brand)) && set.dedTeams.includes(C.normSpace(p.team)) ? 1 : 0;
  });
  people.noSched = set.hideNoSched !== false ? noSched : [];
  return people;
}

async function build(ctx) {
  const S = new Styles();
  const NAVY = 'FF1F3864', WHITE = 'FFFFFFFF', GRID = 'FFD9D9D9', INK = 'FF262626';
  const st = {
    title: S.get({ font: { sz: 16, b: true, color: NAVY } }), sub: S.get({ font: { sz: 9, i: true, color: 'FF7F7F7F' } }),
    hdr: S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true } }),
    hdrDate: fmt => S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true }, numFmt: fmt }),
    hdrWd: S.get({ font: { sz: 9, b: true, color: NAVY }, fill: 'FFD9E1F2', border: WHITE, align: { h: 'center' } }),
    hdrGrey: S.get({ font: { b: true, color: WHITE }, fill: 'FF595959', border: WHITE, align: { h: 'center', wrap: true } }),
    c: S.get({ font: {}, align: { h: 'center' } }), cL: S.get({ font: {}, align: { h: 'left' } }),
    id: S.get({ font: {}, align: { h: 'center' }, numFmt: '0' }),
    pct: S.get({ font: {}, align: { h: 'center' }, numFmt: '0.00%' }), pctB: S.get({ font: { b: true }, align: { h: 'center' }, numFmt: '0.00%' }),
    mss: S.get({ font: {}, align: { h: 'center' }, numFmt: '[m]:ss' }), num: S.get({ font: { b: true }, align: { h: 'center' }, numFmt: '0' }),
    inp: S.get({ font: { name: 'Calibri', sz: 11, color: 'FF000000' }, fill: 'FFFFF2CC', border: GRID, align: { h: 'left' } }),
    inpC: S.get({ font: { name: 'Calibri', sz: 11, color: 'FF000000' }, fill: 'FFFFF2CC', border: GRID, align: { h: 'center' } }),
    inpId: S.get({ font: { name: 'Calibri', sz: 11, color: 'FF000000' }, fill: 'FFFFF2CC', border: GRID, align: { h: 'center' }, numFmt: '0' }),
    auto: S.get({ font: { sz: 10, i: true, color: 'FF808080' }, border: GRID, align: { h: 'left' } }),
    aCell: S.get({ font: {}, border: GRID, align: { h: 'center' } }), aName: S.get({ font: {}, border: GRID, align: { h: 'left' } }),
    aId: S.get({ font: {}, border: GRID, align: { h: 'center' }, numFmt: '0' }), aNum: S.get({ font: { b: true }, border: GRID, align: { h: 'center' }, numFmt: '0' }),
  };
  const dx = {
    red: S.dxf({ color: 'FF9C0006', fill: 'FFFFC7CE' }), green: S.dxf({ color: 'FF006100', fill: 'FFC6EFCE' }),
    yellow: S.dxf({ color: 'FF9C5700', fill: 'FFFFEB9C' }), off: S.dxf({ color: 'FF262626', fill: 'FFA6A6A6' }),
    other: S.dxf({ color: 'FF5B2C6F', fill: 'FFE4DFEC' }), tardy: S.dxf({ color: 'FFC65911', b: true }),
    redFont: S.dxf({ color: 'FFC00000' }), redBold: S.dxf({ color: 'FFC00000', b: true }),
    grey: S.dxf({ color: 'FF7F7F7F', fill: 'FFEDEDED' }), greyTxt: S.dxf({ color: 'FFA6A6A6', fill: 'FFEDEDED' }),
    manual: S.dxf({ fill: 'FFFFFF00' }), amber: S.dxf({ color: 'FF9C5700', fill: 'FFFFEB9C' }),
    nameFill: S.dxf({ fill: 'FFDDEBF7' }), border: S._idx(S.dxfs, `<dxf><border><left style="thin"><color rgb="${GRID}"/></left><right style="thin"><color rgb="${GRID}"/></right><top style="thin"><color rgb="${GRID}"/></top><bottom style="thin"><color rgb="${GRID}"/></bottom></border></dxf>`),
  };
  const { year: Y, month: M, settings: set } = ctx; const ND = C.daysIn(Y, M); const L = `${C.MON[M - 1]} - ${Y}`;
  const roster = ctx.roster.filter(p => C.normSpace(p.name));
  const CAP = Math.max(300, roster.length + 100), R0 = 5, RL = R0 + CAP - 1;          // roster rows
  const RROWS = Math.max(60, roster.length + 50), D0 = 6, DLr = D0 + RROWS - 1;      // report rows
  const AROWS = roster.length + 60, ALr = 5 + AROWS;                                    // attendance rows 6..ALr
  const dayCol = d => C.colName(1 + d);                                                 // raw sheets: B = day 1
  const sheets = {};
  const frame = (sh, t, sub) => { sh.set(1, 1, t, st.title); sh.set(2, 1, sub, st.sub); Object.assign(sh.heights, { 1: 30, 2: 18, 3: 6, 4: 22, 5: 30 }); };
  const head2 = (sh, c, h, w, style = st.hdr) => { sh.set(4, c, h, style); sh.set(5, c, null, style); sh.merge(4, c, 5, c); if (w) sh.width(c, w); };
  const rowsCF = (sh, lastCol, keyCol, nameCol, last) => {
    sh.addCF(`${nameCol}${D0}:${nameCol}${last}`, `$${keyCol}${D0}<>""`, dx.nameFill);
    sh.addCF(`A${D0}:${lastCol}${last}`, `$${keyCol}${D0}<>""`, dx.border);
  };

  // ---------------- model (mirrors the formulas, for cached values)
  const rawAdh = ctx.rawAdh, rawAht = ctx.rawAht, rawSched = ctx.rawSched, rawAct = ctx.rawActual;
  const people = peopleModel(ctx, R0), countsOf = attCounts;
  const idx = (flag) => { let n = 0; return people.map(p => (p[flag] ? ++n : '')); };
  const sumIdx = idx('shown'), adhIdx = idx('hasAdh'), ahtIdx = idx('hasAht'), dedIdx = idx('inDed');
  people.forEach((p, i) => { p.hidden = p.shown ? 0 : 1; });
  const hidIdx = idx('hidden');
  const listOf = arr => people.filter((p, i) => arr[i] !== '');

  // ---------------- Settings
  const SE = new Sheet('Settings'); SE.tab = 'FFFFC000';
  SE.set(1, 1, 'Settings', st.title); SE.set(2, 1, 'Yellow cells can be changed. The report sheets update from them.', st.sub);
  const sv = [['Month', ymd(Y, M, 1), 'dd-mmm-yyyy', true], ['Month start (auto)', null, 'dd-mmm-yyyy', false, 'DATE(YEAR(B3),MONTH(B3),1)'],
    ['Days in month (auto)', ND, '0', false, 'DAY(EOMONTH(B4,0))'], ['Adherence target', set.target, '0%', true], ['Treat adherence days under this as NA', set.floor, '0%', true],
    ['Hide inactive people with attended days under', set.inactiveMin, '0', true], ['Month label (auto)', L, '@', false, 'TEXT(B4,"mmm")&" - "&YEAR(B4)']];
  sv.forEach(([lab, v, fmt, inp, f], i) => {
    SE.set(3 + i, 1, lab, S.get({ font: { b: true } }));
    SE.set(3 + i, 2, f ? (i === 1 ? ymd(Y, M, 1) : v) : v, S.get({ font: {}, fill: inp ? 'FFFFF2CC' : null, border: GRID, align: { h: 'center' }, numFmt: fmt }), f);
  });
  SE.set(11, 1, 'Attendance values', S.get({ font: { sz: 11, b: true } }));
  [['Value', 'Counted as'], ['Attend', 'Worked day'], ['a number, e.g. 15', 'Worked day + 15 tardy minutes'], ['Absent', 'Absent'], ['OFF', 'Day off'], ['AL', 'Annual leave'], ['SL', 'Sick leave'], ['anything else', 'Other (purple)']]
    .forEach(([a, b], i) => { const s1 = i ? st.aName : st.hdr; SE.set(12 + i, 1, a, s1); SE.set(12 + i, 2, b, s1); });
  SE.set(11, 5, 'Teams', S.get({ font: { sz: 11, b: true } })); SE.set(12, 5, 'Code', st.hdr); SE.set(12, 6, 'Department', st.hdr);
  C.DEP_ORDER.forEach((d, i) => { SE.set(13 + i, 5, d, st.aCell); SE.set(13 + i, 6, C.DEP_NAMES[d], st.aName); });
  for (let i = C.DEP_ORDER.length; i < 11; i++) { SE.set(13 + i, 5, null, st.inpC); SE.set(13 + i, 6, null, st.inp); }
  SE.set(11, 8, 'Deduction includes', S.get({ font: { sz: 11, b: true } })); SE.set(12, 8, 'Brand', st.hdr); SE.set(12, 9, 'Team', st.hdr);
  for (let i = 0; i < 8; i++) { SE.set(13 + i, 8, set.dedBrands[i] || null, st.inpC); SE.set(13 + i, 9, set.dedTeams[i] || null, st.inpC); }
  [34, 22, 3, 3, 8, 24, 3, 12, 10].forEach((w, i) => SE.width(i + 1, w));
  sheets.SE = SE;

  // ---------------- Roster (same layout as the tool's Roster)
  const RO = new Sheet('Roster'); RO.tab = 'FFFFC000'; RO.grid = true;
  RO.set(1, 1, 'Roster - one row per person (all departments)', S.get({ font: { sz: 14, b: true, color: 'FF1F1F1F' } }));
  RO.set(2, 1, "Edit the yellow columns. Add new joiners in the next empty row. You may sort this list (sort columns A:F together). 'System name' only when Genesys spells the name differently - it is used to match the adherence, AHT, schedule and timeline exports.", S.get({ font: { sz: 9, i: true, color: 'FF808080' } }));
  [['Name', 32], ['National ID', 14], ['Brand', 12], ['Team', 8], ['System name (Genesys, if different)', 32], ['Status', 10], ['Department (auto)', 22], ['Match key (auto)', 16], ['Export name (auto)', 30]]
    .forEach(([h, w], j) => { RO.set(4, j + 1, h, S.get({ font: { name: 'Arial', b: true, color: WHITE }, fill: 'FF2F3E46', border: GRID, align: { h: 'center', wrap: true } })); RO.width(j + 1, w); });
  RO.heights[4] = 30;
  for (let r = R0; r <= RL; r++) {
    const p = people[r - R0];
    RO.set(r, 1, p ? p.name : null, st.inp); RO.set(r, 2, p ? (idCell(p.nid) || 'NA') : null, st.inpId); RO.set(r, 3, p ? p.brand || null : null, st.inpC);
    RO.set(r, 4, p ? p.team || null : null, st.inpC); RO.set(r, 5, p ? p.sys || null : null, st.inp); RO.set(r, 6, p ? p.status : null, st.inpC);
    RO.set(r, 7, p ? (C.DEP_NAMES[C.normSpace(p.team)] || '') : '', st.auto, `IF(D${r}="","",IFERROR(INDEX(Settings!$F$13:$F$23,MATCH(D${r},Settings!$E$13:$E$23,0)),""))`);
    RO.set(r, 8, p ? p.key : '', st.auto, `IFERROR(IF(A${r}="","",${KEYF(`B${r}`, `A${r}`)}),"")`);
    RO.set(r, 9, p ? p.exp : '', st.auto, `IF(A${r}="","",TRIM(IF(TRIM(E${r}&"")<>"",E${r},A${r})))`);
  }
  RO.freeze = [5, 2]; RO.filter = `A4:I${RL}`;
  RO.dv.push({ sqref: `C${R0}:C${RL}`, list: '"Virgin,Friendi,Friendi Pay"' }, { sqref: `D${R0}:D${RL}`, list: 'Settings!$E$13:$E$23' }, { sqref: `F${R0}:F${RL}`, list: '"Active,Inactive"' });
  RO.addCF(`B${R0}:B${RL}`, `AND($A${R0}<>"",LEFT($H${R0},2)="N:")`, dx.amber);
  sheets.RO = RO;

  // ---------------- Attendance (input grid)
  const AT = new Sheet('Attendance'); AT.tab = NAVY;
  frame(AT, `MC Monthly Attendance - ${L}`, 'Type or paste from row 6: Attend, OFF, AL, SL, Absent, or a number = tardy minutes. You can paste your whole sheet over A:E too - rows are matched by ID (or name), so the order does not matter.');
  [['ID', 13], ['Name', 32], ['Team', 7], ['Brand', 11], ['Status', 9]].forEach(([h, w], j) => head2(AT, j + 1, h, w));
  const AF = 6, AD = AF + ND - 1;
  for (let d = 1; d <= ND; d++) { const c = AF + d - 1; AT.set(4, c, C.weekday(Y, M, d), st.hdrWd); AT.set(5, c, ymd(Y, M, d), st.hdrDate('m/d/yyyy')); AT.width(c, 9.6); }
  const AS = ['Worked days', 'Tardy days', 'Tardy (min)', 'Absent', 'AL', 'SL', 'OFF', 'Other', 'Tardy total (file)'];
  AS.forEach((h, j) => head2(AT, AD + 1 + j, h, j === 8 ? 10 : 8.5, j === 8 ? S.get({ font: { b: true, color: 'FF262626' }, fill: 'FFFFF2CC', border: WHITE, align: { h: 'center', wrap: true } }) : st.hdrGrey));
  const AK = AD + AS.length + 1; head2(AT, AK, 'key', 4, st.hdrGrey);
  const attCol = j => AD + 1 + j;
  for (let r = 6; r <= ALr; r++) {
    const p = people[r - 6];
    AT.set(r, 1, p ? (idCell(p.nid) || 'NA') : null, st.aId); AT.set(r, 2, p ? p.name : null, st.aName); AT.set(r, 3, p ? p.team || null : null, st.aCell);
    AT.set(r, 4, p ? p.brand || null : null, st.aCell); AT.set(r, 5, p ? p.status : null, st.aCell);
    for (let c = AF; c <= AD; c++) { const v = p && p.attDays ? p.attDays[c - AF] : null; AT.set(r, c, v == null || v === '' ? null : v, st.aCell); }
    const rg = `$${C.colName(AF)}${r}:$${C.colName(AD)}${r}`, blank = `AND($A${r}="",$B${r}="")`, tot = C.ref(r, attCol(8));
    const fx = [`COUNTIF(${rg},"Attend")+COUNT(${rg})`, `COUNTIF(${rg},">0")`, `IF(N(${tot})>0,N(${tot}),SUMIF(${rg},">0"))`, `COUNTIF(${rg},"Absent")`, `COUNTIF(${rg},"AL")`, `COUNTIF(${rg},"SL")`, `COUNTIF(${rg},"OFF")`,
      `COUNTA(${rg})-COUNT(${rg})-COUNTIF(${rg},"Attend")-${C.ref(r, attCol(3))}-${C.ref(r, attCol(4))}-${C.ref(r, attCol(5))}-${C.ref(r, attCol(6))}`];
    const own = p ? countsOf(p) : null;
    const cv = own ? [own.worked, own.tardyDays, own.tardyMin, own.absent, own.al, own.sl, own.off, own.other] : [];
    fx.forEach((f, j) => AT.set(r, attCol(j), p ? cv[j] : '', st.aNum, `IF(${blank},"",${f})`));
    AT.set(r, attCol(8), p && p.tardyFile ? p.tardyFile : null, st.inpC);
    AT.set(r, AK, p ? p.key : '', st.auto, `IFERROR(IF(${blank},"",${KEYF(`A${r}`, `B${r}`)}),"")`);
  }
  AT.width(AK, 4);
  const ag = `${C.ref(6, AF)}:${C.ref(ALr, AD)}`, tl = C.ref(6, AF);
  AT.addCF(ag, `${tl}="OFF"`, dx.off); AT.addCF(ag, `${tl}="AL"`, dx.green); AT.addCF(ag, `${tl}="SL"`, dx.yellow);
  AT.addCF(ag, `${tl}="Absent"`, dx.red); AT.addCF(ag, `ISNUMBER(${tl})`, dx.tardy);
  AT.addCF(ag, `AND(ISTEXT(${tl}),${tl}<>"",${tl}<>"Attend")`, dx.other);
  AT.addCF(`E6:E${ALr}`, 'E6="Inactive"', dx.grey);
  const KL = C.colName(AK);
  AT.addCF(`B6:B${ALr}`, `IFERROR(INDEX(Calc!$I$${R0}:$I$${RL},MATCH($${KL}6,Calc!$A$${R0}:$A$${RL},0))=0,FALSE)`, dx.greyTxt);
  AT.addCF(`${C.ref(6, attCol(2))}:${C.ref(ALr, attCol(2))}`, `${C.ref(6, attCol(2))}>0`, dx.amber);
  AT.addCF(`${C.ref(6, attCol(3))}:${C.ref(ALr, attCol(3))}`, `${C.ref(6, attCol(3))}>0`, dx.redBold);
  AT.addCF(`${C.ref(6, attCol(7))}:${C.ref(ALr, attCol(7))}`, `${C.ref(6, attCol(7))}>0`, dx.other);
  AT.freeze = [6, AF]; AT.filter = `A5:${C.ref(ALr, AD + AS.length)}`;
  sheets.AT = AT;
  const ATT = { grid: `Attendance!$${C.colName(AF)}$6:$${C.colName(AD)}$${ALr}`, key: `Attendance!$${KL}$6:$${KL}$${ALr}`, col: j => C.colName(attCol(j)) };

  // ---------------- Calc (hidden helpers, one row per Roster row)
  const CA = new Sheet('Calc'); CA.hidden = true;
  CA.set(1, 1, 'Helper sheet - do not edit. One row per Roster row.');
  ['key', 'export name', 'att row', 'att filled', 'adh row', 'adh days', 'attended', 'status', 'shown', 'sum #', 'has adh', 'adh #', 'aht row', 'has aht', 'aht #', 'in ded', 'ded #', 'sched row', 'actual row', 'hidden', 'hidden #']
    .forEach((h, j) => CA.set(4, j + 1, h));
  for (let r = R0; r <= RL; r++) {
    const i = r - R0, p = people[i]; const A = `Roster!$A${r}`;
    const f = {
      A: [`IF(${A}="","",Roster!$H${r})`, p ? p.key : ''], B: [`IF(${A}="","",Roster!$I${r})`, p ? p.exp : ''],
      C: [`IF(A${r}="","",IFERROR(MATCH(A${r},${ATT.key},0),""))`, p ? p.attRow : ''],
      D: [`IF(C${r}="",0,COUNTA(INDEX(${ATT.grid},C${r},0)))`, p ? p.att.filled : 0],
      E: [`IF(B${r}="","",IFERROR(MATCH(B${r},'Raw Adherence'!$A:$A,0),""))`, p ? p.adhRow : ''],
      F: [`IF(E${r}="",0,COUNTIF(INDEX('Raw Adherence'!$B:$AF,E${r},0),">="&AdhFloor))`, p ? p.adhDays : 0],
      G: [`IF(${A}="","",IF(D${r}>0,COUNTIF(INDEX(${ATT.grid},C${r},0),"Attend")+COUNT(INDEX(${ATT.grid},C${r},0)),F${r}))`, p ? p.attended : ''],
      H: [`IF(${A}="","",IF(Roster!$F${r}="Inactive","Inactive","Active"))`, p ? p.status : ''],
      I: [`IF(${A}="","",IF(OR(H${r}<>"Inactive",G${r}>=InactiveMin),1,0))`, p ? p.shown : ''],
      J: [`IF(I${r}=1,COUNTIF(I$${R0}:I${r},1),"")`, p ? sumIdx[i] : ''],
      K: [`IF(AND(I${r}=1,E${r}<>""),1,0)`, p ? p.hasAdh : 0],
      L: [`IF(K${r}=1,COUNTIF(K$${R0}:K${r},1),"")`, p ? adhIdx[i] : ''],
      M: [`IF(B${r}="","",IFERROR(MATCH(B${r},'Raw AHT'!$A:$A,0),""))`, p ? p.ahtRow : ''],
      N: [`IF(AND(I${r}=1,M${r}<>""),IF(ISNUMBER(INDEX('Raw AHT'!$B:$B,M${r})),1,0),0)`, p ? p.hasAht : 0],
      O: [`IF(N${r}=1,COUNTIF(N$${R0}:N${r},1),"")`, p ? ahtIdx[i] : ''],
      P: [`IF(AND(I${r}=1,ISNUMBER(MATCH(Roster!$C${r},DedBrands,0)),ISNUMBER(MATCH(Roster!$D${r},DedTeams,0))),1,0)`, p ? p.inDed : 0],
      Q: [`IF(P${r}=1,COUNTIF(P$${R0}:P${r},1),"")`, p ? dedIdx[i] : ''],
      R: [`IF(B${r}="","",IFERROR(MATCH(B${r},'Raw Schedule'!$A:$A,0),""))`, p ? p.schRow : ''],
      S: [`IF(B${r}="","",IFERROR(MATCH(B${r},'Raw Actual'!$A:$A,0),""))`, p ? p.actRow : ''],
      T: [`IF(${A}="","",IF(I${r}=0,1,0))`, p ? p.hidden : ''],
      U: [`IF(T${r}=1,COUNTIF(T$${R0}:T${r},1),"")`, p ? hidIdx[i] : ''],
    };
    Object.entries(f).forEach(([col, [fx, v]], j) => CA.set(r, j + 1, v, 0, fx));
  }
  sheets.CA = CA;
  const rrF = (k, col) => `IFERROR(MATCH(${k},Calc!$${col}$${R0}:$${col}$${RL},0)+${R0 - 1},"")`;
  const CALC = c => `Calc!$${c}:$${c}`;

  // ---------------- report helpers
  const INFO = [['ID', 13], ['Member Care champions', 32], ['Brand', 11], ['Dep', 7], ['Status', 9]];
  const info = (sh, r, RR, p) => {
    sh.set(r, 1, p ? (idCell(p.nid) || 'NA') : '', st.id, `IF($${RR}${r}="","",IF(INDEX(Roster!$B:$B,$${RR}${r})="","",INDEX(Roster!$B:$B,$${RR}${r})))`);
    sh.set(r, 2, p ? p.exp : '', st.cL, `IF($${RR}${r}="","",INDEX(${CALC('B')},$${RR}${r}))`);
    sh.set(r, 3, p ? (C.normSpace(p.brand)) : '', st.c, `IF($${RR}${r}="","",INDEX(Roster!$C:$C,$${RR}${r})&"")`);
    sh.set(r, 4, p ? (C.normSpace(p.team)) : '', st.c, `IF($${RR}${r}="","",INDEX(Roster!$D:$D,$${RR}${r})&"")`);
    sh.set(r, 5, p ? p.status : '', st.c, `IF($${RR}${r}="","",INDEX(${CALC('H')},$${RR}${r}))`);
    sh.heights[r] = 18;
  };

  // ---------------- Adherence Detail
  const AD_ = new Sheet('Adherence Detail'); AD_.tab = 'FF2F5597';
  frame(AD_, `MC Monthly Adherence - ${L}`, `NA = not scheduled, or under the 'treat as NA' % in Settings (absence / leave). Avr. = average of the remaining days.`);
  INFO.forEach(([h, w], j) => head2(AD_, j + 1, h, w));
  const XF = 6, XL = XF + ND - 1, AVR = XL + 1, ADC = XL + 2, ARR = XL + 3, ARW = XL + 4;
  for (let d = 1; d <= ND; d++) { const c = XF + d - 1; AD_.set(4, c, ymd(Y, M, d), st.hdrDate('dd-mmm')); AD_.set(5, c, C.weekday(Y, M, d), st.hdrWd); AD_.width(c, 8.6); }
  head2(AD_, AVR, 'Avr.', 9); head2(AD_, ADC, 'Days counted', 8.5, st.hdrGrey); head2(AD_, ARR, 'rr', 3, st.hdrGrey); head2(AD_, ARW, 'raw', 3, st.hdrGrey);
  const adhList = listOf(adhIdx); const RRa = C.colName(ARR), RWa = C.colName(ARW);
  for (let k = 1; k <= RROWS; k++) {
    const r = 5 + k, p = adhList[k - 1];
    AD_.set(r, ARR, p ? p.r : '', st.c, rrF(k, 'L')); AD_.set(r, ARW, p ? p.adhRow : '', st.c, `IF($${RRa}${r}="","",INDEX(${CALC('E')},$${RRa}${r}))`);
    info(AD_, r, RRa, p);
    let sum = 0, n = 0;
    for (let d = 1; d <= ND; d++) {
      const rc = dayCol(d), I = `INDEX('Raw Adherence'!$${rc}:$${rc},$${RWa}${r})`;
      const raw = p ? p.adhVals[d - 1] : null; const v = !p ? '' : (raw == null ? 'NA' : raw < set.floor ? 'NA' : raw);
      if (typeof v === 'number') { sum += v; n++; }
      AD_.set(r, XF + d - 1, v, typeof v === 'number' ? st.pct : st.c, `IF($${RWa}${r}="","",IF(${I}="","NA",IF(${I}<AdhFloor,"NA",${I})))`);
    }
    const rg = `${C.ref(r, XF)}:${C.ref(r, XL)}`;
    AD_.set(r, AVR, !p ? '' : (n ? sum / n : 'NA'), st.pctB, `IF($${RRa}${r}="","",IFERROR(AVERAGE(${rg}),"NA"))`);
    AD_.set(r, ADC, p ? n : '', st.num, `IF($${RRa}${r}="","",COUNT(${rg}))`);
  }
  const A1 = C.ref(D0, AVR);
  AD_.addCF(`${C.ref(D0, XF)}:${C.ref(DLr, XL)}`, `AND(ISNUMBER(${C.ref(D0, XF)}),${C.ref(D0, XF)}<AdhTarget)`, dx.redFont);
  AD_.addCF(`${A1}:${C.ref(DLr, AVR)}`, `AND(ISNUMBER(${A1}),${A1}<AdhTarget)`, dx.red);
  AD_.addCF(`${A1}:${C.ref(DLr, AVR)}`, `AND(ISNUMBER(${A1}),${A1}>=1)`, dx.green);
  AD_.addCF(`E${D0}:E${DLr}`, `E${D0}="Inactive"`, dx.grey);
  rowsCF(AD_, C.colName(ADC), RRa, 'B', DLr);
  AD_.freeze = [6, XF]; AD_.filter = `A5:${C.ref(DLr, ADC)}`; AD_.hideCols = [ARR, ARW];
  sheets.AD = AD_;
  const AVRL = C.colName(AVR);

  // ---------------- Average Adherence (screenshot layout)
  const AV = new Sheet('Average Adherence'); AV.tab = 'FFC0504D';
  frame(AV, `MC Average Adherence - ${L}`, "Monthly average per person, from 'Adherence Detail'. Red = under the target in Settings.");
  [['Member Care champions', 34, 'FFF4B084', INK], ['Dep', 8, 'FFF4B084', INK], ['Adherence', 13, 'FFC0504D', WHITE], ['Brand', 11, NAVY, WHITE], ['Status', 9, NAVY, WHITE], ['Days counted', 9, NAVY, WHITE]]
    .forEach(([h, w, fl, fc], j) => head2(AV, j + 1, h, w, S.get({ font: { b: true, color: fc }, fill: fl, border: WHITE, align: { h: 'center', wrap: true } })));
  const pct11 = S.get({ font: { sz: 11 }, align: { h: 'center' }, numFmt: '0.00%' });
  for (let k = 1; k <= RROWS; k++) {
    const r = 5 + k, p = adhList[k - 1], adr = AD_.rows.get(r);
    const ref_ = c => `'Adherence Detail'!${C.ref(r, c)}`;
    AV.set(r, 1, p ? p.exp : '', st.c, ref_(2)); AV.set(r, 2, p ? C.normSpace(p.team) : '', st.c, ref_(4));
    AV.set(r, 3, adr.get(AVR).v, pct11, ref_(AVR)); AV.set(r, 4, p ? C.normSpace(p.brand) : '', st.c, ref_(3));
    AV.set(r, 5, p ? p.status : '', st.c, ref_(5)); AV.set(r, 6, adr.get(ADC).v, st.c, ref_(ADC)); AV.heights[r] = 18;
  }
  AV.addCF(`C${D0}:C${DLr}`, `AND(ISNUMBER(C${D0}),C${D0}<AdhTarget)`, dx.red); AV.addCF(`E${D0}:E${DLr}`, `E${D0}="Inactive"`, dx.grey);
  rowsCF(AV, 'F', 'A', 'A', DLr);
  AV.freeze = [6, 2]; AV.filter = `A5:F${DLr}`;
  sheets.AV = AV;

  // ---------------- AHT
  const AH = new Sheet('AHT'); AH.tab = 'FF7F6000';
  frame(AH, `MC Monthly AHT - ${L}`, 'Average handle time per agent from the Agent Performance Summary export (m:ss).');
  INFO.forEach(([h, w], j) => head2(AH, j + 1, h, w)); head2(AH, 6, 'AHT (m:ss)', 11); head2(AH, 7, 'rr', 3, st.hdrGrey);
  const ahtList = listOf(ahtIdx);
  for (let k = 1; k <= RROWS; k++) {
    const r = 5 + k, p = ahtList[k - 1];
    AH.set(r, 7, p ? p.r : '', st.c, rrF(k, 'O')); info(AH, r, 'G', p);
    AH.set(r, 6, p ? p.aht / 86400 : '', st.mss, `IF($G${r}="","",INDEX('Raw AHT'!$B:$B,INDEX(${CALC('M')},$G${r})))`);
  }
  AH.addCF(`E${D0}:E${DLr}`, `E${D0}="Inactive"`, dx.grey); rowsCF(AH, 'F', 'G', 'B', DLr);
  AH.freeze = [6, 3]; AH.filter = `A5:F${DLr}`; AH.hideCols = [7];
  sheets.AH = AH;

  // ---------------- Deduction (Book22 layout)
  const DE = new Sheet('Deduction'); DE.tab = 'FF375623';
  DE.set(1, 1, `MC Monthly Deduction - ${L}`, st.title);
  DE.set(2, 1, 'Sched. = scheduled work minutes (On Queue, Break, Meal, Update Break Time, Training). Actual = minutes in On Queue, Break, Meal, Training or Meeting inside them. Diff = Sched. - Actual (0 if Actual is 0). Yellow Diff = typed over the formula.', st.sub);
  Object.assign(DE.heights, { 1: 30, 2: 18, 3: 6, 4: 22.15, 5: 30 });
  const hB = S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true } });
  [['ID', 15.71], ['Name', 36.14], ['Team', 13.29], ['Dep', 9.71]].forEach(([h, w], j) => head2(DE, j + 1, h, w, hB));
  const hDate = S.get({ font: { b: true, color: WHITE }, fill: NAVY, border: WHITE, align: { h: 'center', wrap: true }, numFmt: 'ddd dd-mmm' });
  const hSA = S.get({ font: { b: true, color: WHITE }, fill: 'FF2F5597', border: { l: WHITE, r: WHITE, t: WHITE }, align: { h: 'left', wrap: true } });
  const hDf = S.get({ font: { b: true, color: WHITE }, fill: 'FFC65911', border: { l: WHITE, r: WHITE, t: WHITE }, align: { h: 'left', wrap: true } });
  const E0 = 5;
  for (let d = 1; d <= ND; d++) {
    const c = E0 + (d - 1) * 3;
    DE.set(4, c, ymd(Y, M, d), hDate); DE.set(4, c + 1, null, hDate); DE.set(4, c + 2, null, hDate); DE.merge(4, c, 4, c + 2);
    DE.set(5, c, 'Sched.', hSA); DE.set(5, c + 1, 'Actual', hSA); DE.set(5, c + 2, 'Diff (min)', hDf);
    DE.width(c, 10.86); DE.width(c + 1, 10.86); DE.width(c + 2, 13.29);
  }
  const TOT = E0 + ND * 3, NOTE = TOT + 1, DRR = NOTE + 1, DSR = NOTE + 2, DAR = NOTE + 3;
  const hT = S.get({ font: { b: true, color: WHITE }, fill: 'FF375623', border: { b: GRID }, align: { h: 'center', wrap: true } });
  head2(DE, TOT, 'Total (min)', 14.43, hT); head2(DE, NOTE, 'Review Notes', 40.86, S.get({ font: { b: true, color: WHITE }, fill: 'FF595959', border: WHITE, align: { h: 'center', wrap: true } }));
  head2(DE, DRR, 'rr', 3, st.hdrGrey); head2(DE, DSR, 'sched', 3, st.hdrGrey); head2(DE, DAR, 'actual', 3, st.hdrGrey);
  const cS = S.get({ font: {}, border: { l: 'FF8EA9DB', r: GRID, t: GRID, b: GRID }, align: { h: 'center' } });
  const cD = S.get({ font: { b: true }, fill: 'FFFCEEE4', border: GRID, align: { h: 'center' } });
  const cT = S.get({ font: { sz: 11, b: true }, fill: 'FFF2F7EE', border: { b: GRID }, align: { h: 'center' } });
  const dedList = listOf(dedIdx); const RRd = C.colName(DRR), SRd = C.colName(DSR), ARd = C.colName(DAR);
  for (let k = 1; k <= RROWS; k++) {
    const r = 5 + k, p = dedList[k - 1];
    DE.set(r, DRR, p ? p.r : '', st.c, rrF(k, 'Q'));
    DE.set(r, DSR, p ? p.schRow : '', st.c, `IF($${RRd}${r}="","",INDEX(${CALC('R')},$${RRd}${r}))`);
    DE.set(r, DAR, p ? p.actRow : '', st.c, `IF($${RRd}${r}="","",INDEX(${CALC('S')},$${RRd}${r}))`);
    const mark = !p ? '' : p.status === 'Inactive' ? '⛔ ' : (!p.schRow || !p.actRow ? '⚠ ' : '');
    DE.set(r, 1, p ? (idCell(p.nid) || 'NA') : '', st.aId, `IF($${RRd}${r}="","",IF(INDEX(Roster!$B:$B,$${RRd}${r})="","",INDEX(Roster!$B:$B,$${RRd}${r})))`);
    DE.set(r, 2, p ? mark + p.exp : '', st.aName, `IF($${RRd}${r}="","",IF(INDEX(${CALC('H')},$${RRd}${r})="Inactive","⛔ ",IF(OR($${SRd}${r}="",$${ARd}${r}=""),"⚠ ",""))&INDEX(${CALC('B')},$${RRd}${r}))`);
    DE.set(r, 3, p ? C.normSpace(p.brand) : '', st.aCell, `IF($${RRd}${r}="","",INDEX(Roster!$C:$C,$${RRd}${r})&"")`);
    DE.set(r, 4, p ? C.normSpace(p.team) : '', st.aCell, `IF($${RRd}${r}="","",INDEX(Roster!$D:$D,$${RRd}${r})&"")`);
    const diffs = []; let tot = 0;
    for (let d = 1; d <= ND; d++) {
      const c = E0 + (d - 1) * 3, rc = dayCol(d);
      const sv_ = p && p.schRow ? rawSched[p.schRow - 2].days[d - 1] : null, av = p && p.actRow ? rawAct[p.actRow - 2].days[d - 1] : null;
      const Is = `INDEX('Raw Schedule'!$${rc}:$${rc},$${SRd}${r})`, Ia = `INDEX('Raw Actual'!$${rc}:$${rc},$${ARd}${r})`;
      DE.set(r, c, sv_ == null ? '' : sv_, cS, `IF($${SRd}${r}="","",IF(${Is}="","",${Is}))`);
      DE.set(r, c + 1, av == null ? '' : av, st.aCell, `IF($${ARd}${r}="","",IF(${Ia}="","",${Ia}))`);
      const sR = C.ref(r, c), aR = C.ref(r, c + 1);
      const dv = sv_ == null || av == null ? '' : av === 0 ? 0 : Math.max(0, sv_ - av); if (typeof dv === 'number') tot += dv;
      DE.set(r, c + 2, dv, cD, `IF(OR(${sR}="",${aR}=""),"",IF(${aR}=0,0,MAX(0,${sR}-${aR})))`); diffs.push(C.ref(r, c + 2));
    }
    DE.set(r, TOT, p ? tot : '', cT, `IF($${RRd}${r}="","",SUM(${diffs.join(',')}))`);
    DE.set(r, NOTE, null, st.aName); DE.heights[r] = 18;
  }
  DE.addCF(`B${D0}:B${DLr}`, `LEFT(B${D0},1)="⚠"`, dx.red); DE.addCF(`B${D0}:B${DLr}`, `LEFT(B${D0},1)="⛔"`, dx.greyTxt);
  for (let d = 1; d <= ND; d++) {
    const c = E0 + (d - 1) * 3 + 2, a = C.ref(D0, c), rg = `${a}:${C.ref(DLr, c)}`;
    DE.addCF(rg, `NOT(_xlfn.ISFORMULA(${a}))`, dx.manual, true); DE.addCF(rg, `AND(ISNUMBER(${a}),${a}>0)`, dx.redFont);
  }
  DE.freeze = [6, 5]; DE.filter = `A5:${C.ref(DLr, NOTE)}`; DE.hideCols = [DRR, DSR, DAR];
  sheets.DE = DE;
  const TOTL = C.colName(TOT);

  // ---------------- Monthly Summary
  const SU = new Sheet('Monthly Summary'); SU.tab = 'FFC0504D';
  frame(SU, `MC Monthly Summary - ${L}`, 'One row per person in the reports. Inactive people with fewer attended days than the limit in Settings are left out (they stay in the Roster).');
  INFO.forEach(([h, w], j) => head2(SU, j + 1, h, w));
  const SH = [['Adherence', 11, 'FFC0504D'], ['AHT (m:ss)', 9], ['Worked days', 8.5], ['Tardy days', 8.5], ['Tardy (min)', 8.5], ['Absent', 8], ['AL', 7], ['SL', 7], ['Other', 7], ['Deduction (min)', 10, 'FF375623']];
  SH.forEach(([h, w, fl], j) => head2(SU, 6 + j, h, w, fl ? S.get({ font: { b: true, color: WHITE }, fill: fl, border: WHITE, align: { h: 'center', wrap: true } }) : st.hdr));
  head2(SU, 16, 'rr', 3, st.hdrGrey);
  const sumList = listOf(sumIdx);
  const adhRowOf = new Map(adhList.map((p, i) => [p, 6 + i])), dedRowOf = new Map(dedList.map((p, i) => [p, 6 + i]));
  for (let k = 1; k <= RROWS; k++) {
    const r = 5 + k, p = sumList[k - 1];
    SU.set(r, 16, p ? p.r : '', st.c, rrF(k, 'J')); info(SU, r, 'P', p);
    const ar = p && adhRowOf.get(p);
    SU.set(r, 6, ar ? AD_.rows.get(ar).get(AVR).v : '', st.pctB, `IF($P${r}="","",IF(INDEX(${CALC('K')},$P${r})=1,INDEX('Adherence Detail'!$${AVRL}:$${AVRL},INDEX(${CALC('L')},$P${r})+5),""))`);
    SU.set(r, 7, p && p.hasAht ? p.aht / 86400 : '', st.mss, `IF($P${r}="","",IF(INDEX(${CALC('N')},$P${r})=1,INDEX('Raw AHT'!$B:$B,INDEX(${CALC('M')},$P${r})),""))`);
    [0, 1, 2, 3, 4, 5, 7].forEach((j, q) => {
      const col = ATT.col(j);
      const a = p ? p.att : null, cv = a ? [a.worked, a.tardyDays, a.tardyMin, a.absent, a.al, a.sl, 0, a.other][j] : '';
      SU.set(r, 8 + q, p ? cv : '', st.num, `IF($P${r}="","",IF(INDEX(${CALC('C')},$P${r})="","",INDEX(Attendance!$${col}:$${col},INDEX(${CALC('C')},$P${r})+5)))`);
    });
    const dr = p && dedRowOf.get(p);
    SU.set(r, 15, dr ? DE.rows.get(dr).get(TOT).v : '', st.num, `IF($P${r}="","",IF(INDEX(${CALC('P')},$P${r})=1,INDEX(Deduction!$${TOTL}:$${TOTL},INDEX(${CALC('Q')},$P${r})+5),""))`);
  }
  SU.addCF(`F${D0}:F${DLr}`, `AND(ISNUMBER(F${D0}),F${D0}<AdhTarget)`, dx.red); SU.addCF(`F${D0}:F${DLr}`, `AND(ISNUMBER(F${D0}),F${D0}>=1)`, dx.green);
  SU.addCF(`J${D0}:J${DLr}`, `AND(ISNUMBER(J${D0}),J${D0}>0)`, dx.amber); SU.addCF(`K${D0}:K${DLr}`, `AND(ISNUMBER(K${D0}),K${D0}>0)`, dx.redBold);
  SU.addCF(`O${D0}:O${DLr}`, `AND(ISNUMBER(O${D0}),O${D0}>0)`, dx.redBold); SU.addCF(`E${D0}:E${DLr}`, `E${D0}="Inactive"`, dx.grey);
  rowsCF(SU, 'O', 'P', 'B', DLr);
  SU.freeze = [6, 3]; SU.filter = `A5:O${DLr}`; SU.hideCols = [16];
  sheets.SU = SU;

  // ---------------- Overview
  const OV = new Sheet('Overview'); OV.tab = 'FFC0504D';
  frame(OV, `Member Care Overview - ${L}`, 'Totals per team for the people in the reports. Updates with the Attendance and Roster sheets.');
  delete OV.heights[4];
  const OH = [['Team', 7], ['Department', 22], ['People', 8], ['Inactive shown', 9], ['Avg adherence', 10], ['Below target', 9], ['Avg AHT', 9], ['Worked days', 9], ['Tardy days', 9], ['Tardy (min)', 9], ['Absent', 8], ['AL', 7], ['SL', 7], ['Deduction (min)', 10]];
  OH.forEach(([h, w], j) => { OV.set(5, j + 1, h, st.hdr); OV.width(j + 1, w); });
  const SR = c => `'Monthly Summary'!$${c}$${D0}:$${c}$${DLr}`;
  const shownVals = (pred, col) => sumList.map((p, i) => [p, SU.rows.get(6 + i).get(col).v]).filter(([p]) => pred(p)).map(x => x[1]).filter(v => typeof v === 'number');
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : '-');
  const B = (b, fill) => S.get({ font: { b }, fill, border: GRID, align: { h: 'center' } });
  const rowOV = (r, label, name, pred, isAll) => {
    const fl = isAll ? 'FFD9D9D9' : null; const crit = isAll ? null : `$A${r}`;
    const cnt = (col, cond) => isAll ? `SUMPRODUCT(--(${SR('B')}<>"")${cond ? `*(${SR(col)}=${cond})` : ''})` : `COUNTIFS(${SR('D')},${crit}${cond ? `,${SR(col)},${cond}` : ''})`;
    OV.set(r, 1, label, B(true, fl)); OV.set(r, 2, name, S.get({ font: { b: isAll }, fill: fl, border: GRID, align: { h: 'left' } }));
    const ppl = sumList.filter(pred);
    const vals = [
      [ppl.length, cnt()], [ppl.filter(p => p.status === 'Inactive').length, cnt('E', '"Inactive"')],
      [avg(shownVals(pred, 6)), isAll ? `IFERROR(AVERAGE(${SR('F')}),"-")` : `IFERROR(AVERAGEIFS(${SR('F')},${SR('D')},${crit}),"-")`],
      [shownVals(pred, 6).filter(v => v < set.target).length, isAll ? `COUNTIF(${SR('F')},"<"&AdhTarget)` : `COUNTIFS(${SR('D')},${crit},${SR('F')},"<"&AdhTarget)`],
      [avg(shownVals(pred, 7)), isAll ? `IFERROR(AVERAGE(${SR('G')}),"-")` : `IFERROR(AVERAGEIFS(${SR('G')},${SR('D')},${crit}),"-")`],
      ...['H', 'I', 'J', 'K', 'L', 'M', 'O'].map(c => { const colN = { H: 8, I: 9, J: 10, K: 11, L: 12, M: 13, O: 15 }[c];
        return [shownVals(pred, colN).reduce((a, b) => a + b, 0), isAll ? `SUM(${SR(c)})` : `SUMIFS(${SR(c)},${SR('D')},${crit})`]; }),
    ];
    vals.forEach(([v, f], j) => OV.set(r, 3 + j, v, S.get({ font: { b: isAll }, fill: fl, border: GRID, align: { h: 'center' }, numFmt: j === 2 ? '0.00%' : j === 4 ? '[m]:ss' : '0' }), f));
    OV.heights[r] = 18;
  };
  let r = 6;
  for (const d of C.DEP_ORDER) { rowOV(r, d, C.DEP_NAMES[d], p => C.normSpace(p.team) === d); r++; }
  rowOV(r, 'All', '', () => true, true); const totRow = r; r += 2;
  OV.addCF(`E6:E${totRow}`, `AND(ISNUMBER(E6),E6<AdhTarget)`, dx.red); OV.addCF(`F6:F${totRow}`, 'AND(ISNUMBER(F6),F6>0)', dx.redBold);
  const sec = S.get({ font: { sz: 12, b: true, color: NAVY } });
  OV.set(r, 1, "Hidden from the reports - inactive with fewer attended days than the limit in Settings", sec); OV.heights[r] = 22; r++;
  ['#', 'Name', 'ID', 'Team', 'Attended days'].forEach((h, j) => OV.set(r, j + 1, h, st.hdrGrey)); r++;
  const hidList = listOf(hidIdx);
  for (let k = 1; k <= 30; k++, r++) {
    const p = hidList[k - 1], m = `MATCH(${k},Calc!$U$${R0}:$U$${RL},0)+${R0 - 1}`;
    OV.set(r, 1, k, st.aCell);
    OV.set(r, 2, p ? p.exp : '', st.aName, `IFERROR(INDEX(${CALC('B')},${m}),"")`);
    OV.set(r, 3, p ? String(idCell(p.nid) || 'NA') : '', st.aCell, `IFERROR(INDEX(Roster!$B:$B,${m})&"","")`);
    OV.set(r, 4, p ? C.normSpace(p.team) : '', st.aCell, `IFERROR(INDEX(Roster!$D:$D,${m})&"","")`);
    OV.set(r, 5, p ? p.attended : '', st.aCell, `IFERROR(INDEX(${CALC('G')},${m}),"")`);
  }
  r++;
  OV.set(r, 1, 'Data checks', sec); OV.heights[r] = 22; r++;
  ['Check', '', 'Count', 'Names when the file was built'].forEach((h, j) => OV.set(r, j + 1, h, st.hdrGrey)); OV.merge(r, 1, r, 2); r++;
  const wrapL = S.get({ font: {}, border: GRID, align: { h: 'left', wrap: true, v: 'top' } });
  const ck = ctx.checks || {};
  const checks = [
    ['Adherence names not on the Roster', `COUNTIF('Raw Adherence'!$AH:$AH,"NOT ON ROSTER")`, ck.adh || []],
    ['AHT names (with AHT) not on the Roster', `COUNTIFS('Raw AHT'!$D:$D,"NOT ON ROSTER",'Raw AHT'!$B:$B,">0")`, ck.aht || []],
    ['Schedule names not on the Roster', `COUNTIF('Raw Schedule'!$AH:$AH,"NOT ON ROSTER")`, ck.sched || []],
    ['Scheduled agents missing from the status timeline (Actual = 0)', null, ck.noTimeline || []],
    ['Attendance cells with a value other than Attend, OFF, AL, SL, Absent or minutes (purple)', `SUM(Attendance!$${ATT.col(7)}$6:$${ATT.col(7)}$${ALr})`,
      people.filter(p => p.attRow === people.indexOf(p) + 1 && countsOf(p).other > 0).map(p => `${p.exp} (${countsOf(p).other})`),
      people.reduce((t, p) => t + (p.attDays ? countsOf(p).other : 0), 0)],
  ];
  for (const [lab, f, names, cnt] of checks) {
    OV.set(r, 1, lab, wrapL); OV.set(r, 2, null, wrapL); OV.merge(r, 1, r, 2);
    OV.set(r, 3, cnt != null ? cnt : names.length, S.get({ font: { b: true }, border: GRID, align: { h: 'center', v: 'top' } }), f);
    OV.set(r, 4, names.join(', '), wrapL); for (let c = 5; c <= 14; c++) OV.set(r, c, null, wrapL); OV.merge(r, 4, r, 14);
    OV.heights[r] = Math.min(120, 18 + 13 * Math.floor(names.join(', ').length / 150)); r++;
  }
  OV.addCF(`C${r - checks.length}:C${r - 1}`, `C${r - checks.length}>0`, dx.redBold);
  const ns = (people.noSched || []).map(p => C.normSpace(p.name)).sort((x, y) => x.localeCompare(y));   // left out of every sheet: named here only
  if (ns.length) {
    OV.set(r, 1, 'No schedule this month: no day in the Schedule export and no attendance, so left out of every sheet (Settings: Leave out people with no schedule)', wrapL); OV.set(r, 2, null, wrapL); OV.merge(r, 1, r, 2);
    OV.set(r, 3, ns.length, S.get({ font: { b: true }, border: GRID, align: { h: 'center', v: 'top' } }));
    OV.set(r, 4, ns.join(', '), wrapL); for (let c = 5; c <= 14; c++) OV.set(r, c, null, wrapL); OV.merge(r, 4, r, 14);
    OV.heights[r] = Math.min(120, 30 + 13 * Math.floor(ns.join(', ').length / 150)); r++;
  }
  sheets.OV = OV;

  // ---------------- Raw data sheets
  const rawSheet = (name, list, fmt, flagCol = 34) => {
    const sh = new Sheet(name); sh.tab = 'FF808080'; sh.grid = true;
    sh.set(1, 1, 'Agent Name', st.hdrGrey); sh.width(1, 32);
    for (let d = 1; d <= ND; d++) { sh.set(1, 1 + d, ymd(Y, M, d), st.hdrDate('d-mmm')); sh.width(1 + d, 8); }
    sh.set(1, flagCol, 'On roster?', st.hdrGrey); sh.width(flagCol, 15);
    list.forEach((x, i) => {
      const r = i + 2; sh.set(r, 1, x.name);
      x.days.forEach((v, j) => { if (v != null) sh.set(r, 2 + j, v, fmt); });
      sh.set(r, flagCol, x.onRoster ? 'OK' : 'NOT ON ROSTER', 0, `IF(A${r}="","",IF(ISNA(MATCH(A${r},Roster!$I$${R0}:$I$${RL},0)),"NOT ON ROSTER","OK"))`);
    });
    sh.addCF(`A2:A${list.length + 1}`, `$${C.colName(flagCol)}2="NOT ON ROSTER"`, dx.red);
    sh.freeze = [2, 2];
    return sh;
  };
  const expSet = new Set(people.map(p => C.normName(p.exp)));
  const mark = list => list.map(x => ({ ...x, onRoster: expSet.has(C.normName(x.name)) }));
  sheets.RA = rawSheet('Raw Adherence', mark(rawAdh), st.pct);
  sheets.RS = rawSheet('Raw Schedule', mark(rawSched), 0);
  sheets.RX = rawSheet('Raw Actual', mark(rawAct), 0);
  const RH = new Sheet('Raw AHT'); RH.tab = 'FF808080'; RH.grid = true;
  ['Agent Name', 'AHT (m:ss)', 'Media Type', 'On roster?'].forEach((h, j) => RH.set(1, j + 1, h, st.hdrGrey)); [32, 11, 11, 15].forEach((w, j) => RH.width(j + 1, w));
  mark(rawAht).forEach((x, i) => {
    const r = i + 2; RH.set(r, 1, x.name); if (x.sec != null) RH.set(r, 2, x.sec / 86400, st.mss); RH.set(r, 3, x.media || '');
    RH.set(r, 4, x.onRoster ? 'OK' : 'NOT ON ROSTER', 0, `IF(A${r}="","",IF(ISNA(MATCH(A${r},Roster!$I$${R0}:$I$${RL},0)),"NOT ON ROSTER","OK"))`);
  });
  RH.addCF(`A2:A${rawAht.length + 1}`, `AND($D2="NOT ON ROSTER",ISNUMBER($B2))`, dx.red); RH.freeze = [2, 2];
  sheets.RH = RH;

  const order = [SU, OV, AT, AD_, AV, AH, DE, RO, SE, sheets.RA, sheets.RH, sheets.RS, sheets.RX, CA];
  const names = { MonthStart: 'Settings!$B$4', DaysInMonth: 'Settings!$B$5', AdhTarget: 'Settings!$B$6', AdhFloor: 'Settings!$B$7', InactiveMin: 'Settings!$B$8', MonthLabel: 'Settings!$B$9', DedBrands: 'Settings!$H$13:$H$20', DedTeams: 'Settings!$I$13:$I$20' };
  if (ctx.logo) for (const sh of [SU, OV, AT, AD_, AV, AH, DE, RO, SE]) sh.titleLogo();
  return pack(order, S, names, { logo: ctx.logo });
}
function ymd(y, m, d) { return C.ymdSerial(y, m, d); }

return { build, peopleModel, attCounts, Styles, Sheet, pack, keyOf, idCell };
})(typeof Core !== 'undefined' ? Core : require('./core.js'));
if (typeof module !== 'undefined') module.exports = Writer2;
