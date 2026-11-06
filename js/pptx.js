/* MC Monthly Report Builder - a small PowerPoint writer (no dependencies): slides of shapes, text, pictures, tables and native
   charts (columns with a line on a second axis), each chart with its data in an embedded workbook so Edit Data works in PowerPoint.
   Positions and sizes are in inches on a 13.333 x 7.5 in (16:9) slide; colours are 'RRGGBB'. */
'use strict';
const Pptx = ((C, W) => {
const EMU = 914400, E = v => Math.round(v * EMU);
const esc = s => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const fill = c => (c ? `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>` : '<a:noFill/>');
const lineOf = (c, w = 0.75) => (c ? `<a:ln w="${Math.round(w * 12700)}">${fill(c)}</a:ln>` : '<a:ln><a:noFill/></a:ln>');
/** one run's properties: size in pt, colour, bold, italic, capitals (shown, the words kept as written), the font (a script font for Arabic and the like too) */
function rPr(o, tag = 'a:rPr') {
  const f = o.font || 'Calibri';
  return `<${tag} lang="en-US" sz="${Math.round((o.size || 12) * 100)}" b="${o.bold ? 1 : 0}" i="${o.italic ? 1 : 0}"${o.caps ? ' cap="all"' : ''}${o.spc ? ` spc="${Math.round(o.spc * 100)}"` : ''} dirty="0">${fill(o.color || '262626')}<a:latin typeface="${esc(f)}"/><a:cs typeface="Arial"/></${tag}>`;
}
/** paragraphs from a string (lines), a list of runs, or a list of paragraphs (each a list of runs) */
function paras(content, o) {
  const P = typeof content === 'string' || typeof content === 'number' ? String(content).split('\n').map(t => [{ t }])
    : Array.isArray(content) && content.length && !Array.isArray(content[0]) ? [content] : content || [[{ t: '' }]];
  const al = { left: 'l', center: 'ctr', right: 'r' }[o.align || 'left'];
  return P.map(runs => `<a:p><a:pPr algn="${al}"${o.lineSpacing ? '' : ''}>${o.lineSpacing ? `<a:lnSpc><a:spcPct val="${Math.round(o.lineSpacing * 100000)}"/></a:lnSpc>` : ''}${o.spaceAfter ? `<a:spcAft><a:spcPts val="${Math.round(o.spaceAfter * 100)}"/></a:spcAft>` : ''}</a:pPr>`
    + runs.map(r => `<a:r>${rPr({ ...o, ...r })}<a:t>${esc(r.t)}</a:t></a:r>`).join('') + `${rPr({ ...o, ...(runs[0] || {}) }, 'a:endParaRPr')}</a:p>`).join('');
}

// ------------------------------------------------------------ the chart: columns (flat or 3-D), and a line on its own axis
/** a column's fill as Office draws its "gradient" style: lighter at the top, darker at the foot */
const grad = c => `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${c}"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:srgbClr></a:gs><a:gs pos="50000"><a:srgbClr val="${c}"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:srgbClr></a:gs><a:gs pos="100000"><a:srgbClr val="${c}"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:srgbClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`;
/**
 * ch: { cats, bars: [{ name, values, color, grad, labels, labelColor, labelSize, labelBold, trend: [{ type: exp|linear, dash }] }],
 *   line: { name, values, color, w (pt), fmt, max, min (null: Office decides), labels (false: none), labelSize, labelColor, labelBold,
 *   smooth (false: straight), marker: { symbol, size, color } }, d3 (3-D clustered columns), gap, overlap, barFmt, catRot, catSize,
 *   axisSize, axisColor, gridColor, labelSize, labelColor, legend (false: none), legendSize, border (the frame's colour), title,
 *   titleSize, titleColor, yTitle, y2Title }
 */
function chartXml(ch, n) {
  const cats = ch.cats.map(String), N = cats.length, col = i => String.fromCharCode(66 + i);   // B, C, D…
  const strCache = L => `<c:strCache><c:ptCount val="${L.length}"/>${L.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache>`;
  const numCache = (L, fmt) => `<c:numCache><c:formatCode>${esc(fmt)}</c:formatCode><c:ptCount val="${L.length}"/>${L.map((v, i) => (v == null || !Number.isFinite(+v) ? '' : `<c:pt idx="${i}"><c:v>${+v}</c:v></c:pt>`)).join('')}</c:numCache>`;
  const tx = (name, i) => `<c:tx><c:strRef><c:f>Sheet1!$${col(i)}$1</c:f>${strCache([name])}</c:strRef></c:tx>`;
  const cat = `<c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${N + 1}</c:f>${strCache(cats)}</c:strRef></c:cat>`;
  const val = (L, i, fmt) => `<c:val><c:numRef><c:f>Sheet1!$${col(i)}$2:$${col(i)}$${N + 1}</c:f>${numCache(L, fmt)}</c:numRef></c:val>`;
  const txt = (sz, color = '595959', b = 0, rot) => `<c:txPr><a:bodyPr${rot != null ? ` rot="${rot}" vert="horz"` : ''}/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b}">${fill(color)}<a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
  const lbl = (fmt, sz, color, bold, pos) => `<c:dLbls><c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txt(sz, color, bold ? 1 : 0)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`;
  const title = (t, sz, color, rot) => `<c:title><c:tx><c:rich><a:bodyPr rot="${rot || 0}" vert="horz"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="1">${fill(color)}<a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}" b="1">${fill(color)}<a:latin typeface="Calibri"/></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
  const trend = t => `<c:trendline><c:spPr><a:ln w="${Math.round((t.w || 1.5) * 12700)}" cap="rnd">${fill(t.color)}<a:prstDash val="${t.dash || 'sysDot'}"/></a:ln></c:spPr><c:trendlineType val="${t.type || 'linear'}"/><c:dispRSqr val="0"/><c:dispEq val="0"/></c:trendline>`;
  const axSz = ch.axisSize || 800, axC = ch.axisColor || '595959', d3 = !!ch.d3, tc = ch.titleColor || '0E2841';
  const bars = ch.bars.map((s, i) => {
    const pos = s.values.some(v => v != null && +v > 0) && !d3 ? 'outEnd' : null, plus = s.values.every(v => v == null || +v > 0);
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx(s.name, i)}<c:spPr>${s.grad ? grad(s.color) : fill(s.color)}<a:ln><a:noFill/></a:ln></c:spPr><c:invertIfNegative val="0"/>`
      + (s.labels ? lbl(ch.barFmt || '#,##0', s.labelSize || ch.labelSize || 700, s.labelColor || ch.labelColor || '404040', s.labelBold, pos) : '')
      + (s.trend || []).map(t => trend({ color: s.color, ...t, type: t.type === 'exp' && !plus ? 'linear' : t.type })).join('')   // an exponential trend needs every value above nothing
      + `${cat}${val(s.values, i, ch.barFmt || '#,##0')}</c:ser>`;
  }).join('');
  const li = ch.bars.length, L = ch.line;
  const mk = L && L.marker ? `<c:marker><c:symbol val="${L.marker.symbol || 'circle'}"/><c:size val="${L.marker.size || 6}"/><c:spPr>${grad(L.marker.color || L.color)}<a:ln w="12700">${fill(L.marker.edge || 'E8E8E8')}</a:ln></c:spPr></c:marker>` : '<c:marker><c:symbol val="none"/></c:marker>';
  const line = L ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/><c:ser><c:idx val="${li}"/><c:order val="${li}"/>${tx(L.name, li)}<c:spPr><a:ln w="${Math.round((L.w || 2.25) * 12700)}" cap="rnd">${fill(L.color)}<a:round/></a:ln></c:spPr>${mk}`
    + (L.labels === false ? '' : lbl(L.fmt || '0%', L.labelSize || 800, L.labelColor || '262626', L.labelBold, 't'))
    + `${cat}${val(L.values, li, L.fmt || '0%')}<c:smooth val="${L.smooth === false ? 0 : 1}"/></c:ser><c:marker val="1"/><c:axId val="${n * 10 + 3}"/><c:axId val="${n * 10 + 4}"/></c:lineChart>` : '';
  const ax = (id, pos, del, extra) => `<c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/>${extra || ''}</c:scaling><c:delete val="${del ? 1 : 0}"/><c:axPos val="${pos}"/>`;
  const catAx = `<c:catAx>${ax(n * 10 + 1, 'b', false)}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="6350">${fill('BFBFBF')}</a:ln></c:spPr>${txt(ch.catSize || axSz, axC, 0, ch.catRot != null ? ch.catRot * 60000 : null)}<c:crossAx val="${n * 10 + 2}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`;
  const valAx = `<c:valAx>${ax(n * 10 + 2, 'l', false, '<c:min val="0"/>')}<c:majorGridlines><c:spPr><a:ln w="6350">${fill(ch.gridColor || 'E7E7E7')}</a:ln></c:spPr></c:majorGridlines>${ch.yTitle ? title(ch.yTitle, 900, tc, -5400000) : ''}<c:numFmt formatCode="${esc(ch.barFmt || '#,##0')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txt(axSz, axC)}<c:crossAx val="${n * 10 + 1}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  const sec = L ? `<c:catAx>${ax(n * 10 + 3, 'b', true)}<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${n * 10 + 4}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx>${ax(n * 10 + 4, 'r', false, `${L.max === null ? '' : `<c:max val="${L.max ?? 1.2}"/>`}${L.min === null ? '' : `<c:min val="${L.min ?? 0}"/>`}`)}${ch.y2Title ? title(ch.y2Title, 900, tc, -5400000) : ''}<c:numFmt formatCode="${esc(L.fmt || '0%')}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txt(axSz, axC)}<c:crossAx val="${n * 10 + 3}"/><c:crosses val="max"/><c:crossBetween val="between"/></c:valAx>` : '';
  const none = '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>', wall = t => `<c:${t}><c:thickness val="0"/>${none}</c:${t}>`;
  const view = d3 ? `<c:view3D><c:rotX val="15"/><c:rotY val="20"/><c:depthPercent val="100"/><c:rAngAx val="1"/></c:view3D>${wall('floor')}${wall('sideWall')}${wall('backWall')}` : '';
  const barChart = d3 ? `<c:bar3DChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${bars}<c:gapWidth val="${ch.gap ?? 150}"/><c:shape val="box"/><c:axId val="${n * 10 + 1}"/><c:axId val="${n * 10 + 2}"/><c:axId val="0"/></c:bar3DChart>`
    : `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${bars}<c:gapWidth val="${ch.gap ?? 60}"/><c:overlap val="${ch.overlap ?? -10}"/><c:axId val="${n * 10 + 1}"/><c:axId val="${n * 10 + 2}"/></c:barChart>`;
  return `${XML}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}"><c:date1904 val="0"/><c:roundedCorners val="0"/>`
    + `<c:chart>${ch.title ? `${title(ch.title, ch.titleSize || 1600, tc)}<c:autoTitleDeleted val="0"/>` : '<c:autoTitleDeleted val="1"/>'}${view}<c:plotArea><c:layout/>${barChart}${line}${catAx}${valAx}${sec}${none}</c:plotArea>`
    + `${ch.legend === false ? '' : `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${txt(ch.legendSize || 800, axC)}</c:legend>`}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>`
    + `<c:spPr>${ch.fill ? fill(ch.fill) : '<a:noFill/>'}${ch.border ? `<a:ln w="9525">${fill(ch.border)}</a:ln>` : '<a:ln><a:noFill/></a:ln>'}</c:spPr>${txt(800)}<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`;
}
/** the chart's data as a workbook (Sheet1: the categories in A, a column per series), for Edit Data */
async function chartBook(ch) {
  const S = new W.Styles(), sh = new W.Sheet('Sheet1'), all = [...ch.bars, ...(ch.line ? [ch.line] : [])];
  all.forEach((s, i) => sh.set(1, i + 2, s.name)); ch.cats.forEach((c, r) => { sh.set(r + 2, 1, String(c)); all.forEach((s, i) => sh.set(r + 2, i + 2, s.values[r] == null || !Number.isFinite(+s.values[r]) ? null : +s.values[r])); });
  return W.pack([sh], S);
}

// ------------------------------------------------------------ a slide
class Slide {
  constructor(deck, o) { Object.assign(this, { deck, bg: o.bg || 'FFFFFF', items: [], rels: [], id: 1 }); }
  nid() { return ++this.id; }
  frame(x, y, w, h) { return `<a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm>`; }
  /** a rectangle (radius: rounded corners, as a part of the shorter side) */
  rect(x, y, w, h, o = {}) {
    const id = this.nid(), geo = o.radius ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${Math.round(o.radius * 100000)}"/></a:avLst></a:prstGeom>` : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
    const f = o.fill && o.alpha != null ? `<a:solidFill><a:srgbClr val="${o.fill}"><a:alpha val="${Math.round(o.alpha * 100000)}"/></a:srgbClr></a:solidFill>` : fill(o.fill);   // alpha: how opaque, 0 to 1
    const fx = o.shadow ? `<a:effectLst><a:outerShdw blurRad="${E(0.08)}" dist="${E(0.03)}" dir="5400000" algn="t" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="28000"/></a:srgbClr></a:outerShdw></a:effectLst>` : '';
    this.items.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.name || 'Shape ' + id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${this.frame(x, y, w, h)}${geo}${f}${lineOf(o.line, o.lineW)}${fx}</p:spPr>`
      + `<p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`);
    return this;
  }
  /** a straight line from (x1, y1) to (x2, y2): colour and width in pt */
  line(x1, y1, x2, y2, o = {}) {
    const id = this.nid(), x = Math.min(x1, x2), y = Math.min(y1, y2);
    this.items.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${esc(o.name || 'Line ' + id)}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${this.frame(x, y, Math.abs(x2 - x1), Math.abs(y2 - y1))}<a:prstGeom prst="line"><a:avLst/></a:prstGeom>${lineOf(o.color || '000000', o.w || 1)}</p:spPr></p:cxnSp>`);
    return this;
  }
  /** text in a box: a string (lines), runs or paragraphs; size, color, bold, italic, font, align, valign (top, middle, bottom) */
  text(x, y, w, h, content, o = {}) {
    const id = this.nid(), an = { top: 't', middle: 'ctr', bottom: 'b' }[o.valign || 'top'], ix = E(o.insetX ?? o.inset ?? 0.02), iy = E(o.insetY ?? o.inset ?? 0.02);
    this.items.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.name || 'Text ' + id)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${this.frame(x, y, w, h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill(o.fill)}${lineOf(o.line)}</p:spPr>`
      + `<p:txBody><a:bodyPr wrap="square" lIns="${ix}" tIns="${iy}" rIns="${ix}" bIns="${iy}" rtlCol="0" anchor="${an}">${o.shrink ? '<a:normAutofit/>' : '<a:noAutofit/>'}</a:bodyPr><a:lstStyle/>${paras(content, o)}</p:txBody></p:sp>`);
    return this;
  }
  /** a picture: PNG bytes */
  image(x, y, w, h, png, o = {}) {
    const id = this.nid(), rid = this.rel('image', this.deck.media(png));
    this.items.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(o.name || 'Picture ' + id)}" descr="${esc(o.descr || '')}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${this.frame(x, y, w, h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
    return this;
  }
  /** a table: rows of cells (text, or { t, bold, color, align }); cols: the column widths in inches; the first row is the heading */
  table(x, y, rows, o = {}) {
    const id = this.nid(), cols = o.cols, w = cols.reduce((a, v) => a + v, 0), rh = o.rowH || 0.26, h = rh * rows.length, fs = o.size || 9;
    const head = o.head || { fill: '1F2A5C', color: 'FFFFFF' }, edge = o.border || 'D9D9D9';
    const ln = (tag, c) => `<a:${tag} w="6350">${fill(c)}</a:${tag}>`;
    const tr = (r, i) => `<a:tr h="${E(rh)}">${r.map((c0, j) => {
      const c = c0 && typeof c0 === 'object' ? c0 : { t: c0 }, hd = i === 0 && o.header !== false, al = c.align || (o.align && o.align[j]) || 'left';
      const bg = hd ? head.fill : c.fill || (o.zebra && i % 2 === 0 ? o.zebra : 'FFFFFF');
      return `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${paras([[{ t: c.t ?? '' }]], { size: c.size || fs, color: hd ? head.color : c.color || o.ink || '262626', bold: hd || c.bold, font: o.font, align: al })}</a:txBody>`
        + `<a:tcPr marL="${E(0.06)}" marR="${E(0.06)}" marT="${E(0.02)}" marB="${E(0.02)}" anchor="ctr">${ln('lnL', edge)}${ln('lnR', edge)}${ln('lnT', edge)}${ln('lnB', edge)}${fill(bg)}</a:tcPr></a:tc>`;
    }).join('')}</a:tr>`;
    this.items.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(o.name || 'Table ' + id)}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></p:xfrm>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="0"/><a:tblGrid>${cols.map(c => `<a:gridCol w="${E(c)}"/>`).join('')}</a:tblGrid>${rows.map(tr).join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
    return this;
  }
  /** a chart: { cats, bars: [{ name, values, color, labels }], line: { name, values, color, fmt, max }, barFmt, catRot (degrees) } */
  chart(x, y, w, h, ch, o = {}) {
    const id = this.nid(), n = this.deck.chartN(ch), rid = this.rel('chart', `../charts/chart${n}.xml`);
    this.items.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(o.name || 'Chart ' + id)}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></p:xfrm>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></p:graphicFrame>`);
    return this;
  }
  rel(kind, target) {
    const rid = `rId${this.rels.length + 2}`;   // rId1 is the layout
    this.rels.push({ rid, type: `${REL}/${kind}`, target }); return rid;
  }
  xml() {
    return `${XML}<p:sld ${NS}><p:cSld><p:bg><p:bgPr>${fill(this.bg)}<a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`
      + `${this.items.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
  relsXml() {
    return `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>${this.rels.map(r => `<Relationship Id="${r.rid}" Type="${r.type}" Target="${r.target}"/>`).join('')}</Relationships>`;
  }
}

// ------------------------------------------------------------ the deck
function theme(fonts) {
  const c = { dk1: '000000', lt1: 'FFFFFF', dk2: '1F2A5C', lt2: 'EEF1F7', accent1: '1F2A5C', accent2: 'C8102E', accent3: '0FA3A3', accent4: 'C9870A', accent5: '3D5A8A', accent6: '7F7F7F', hlink: '0563C1', folHlink: '954F72' };
  const clr = k => (k === 'dk1' || k === 'lt1' ? `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>` : `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`);
  const fs = '<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>';
  const ls = '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>';
  const es = '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>';
  return `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MC"><a:themeElements><a:clrScheme name="MC">${['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(clr).join('')}</a:clrScheme>`
    + `<a:fontScheme name="MC"><a:majorFont><a:latin typeface="${esc(fonts.head)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${esc(fonts.body)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>`
    + `<a:fmtScheme name="MC">${fs}${ls}${es}<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}
const MASTER = `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>`
  + '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
  + '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>';
const LAYOUT = `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

class Deck {
  constructor(o = {}) { Object.assign(this, { w: o.w || 13.333, h: o.h || 7.5, slides: [], charts: [], images: [], fonts: { head: o.headFont || 'Georgia', body: o.bodyFont || 'Calibri' } }); }
  slide(o = {}) { const s = new Slide(this, o); this.slides.push(s); return s; }
  chartN(ch) { this.charts.push(ch); return this.charts.length; }
  media(png) { let i = this.images.indexOf(png); if (i < 0) { this.images.push(png); i = this.images.length - 1; } return `../media/image${i + 1}.png`; }   // the same picture once, however many slides show it
  async bytes() {
    const f = [], add = (name, data) => f.push({ name, data }), S = this.slides, n = S.length;
    add('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>`
      + '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
      + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
      + S.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')
      + this.charts.map((_, i) => `<Override PartName="/ppt/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('') + '</Types>');
    add('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    // no core properties part (title, author, dates): its Dublin Core namespaces are web addresses, and the page names none it does not need
    add('docProps/app.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MC Monthly Report Builder</Application><Slides>${n}</Slides></Properties>`);
    add('ppt/presentation.xml', `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${S.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${E(this.w)}" cy="${E(this.h)}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>`);
    add('ppt/_rels/presentation.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/>${S.map((_, i) => `<Relationship Id="rId${i + 2}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}`
      + `<Relationship Id="rId${n + 2}" Type="${REL}/presProps" Target="presProps.xml"/><Relationship Id="rId${n + 3}" Type="${REL}/viewProps" Target="viewProps.xml"/><Relationship Id="rId${n + 4}" Type="${REL}/theme" Target="theme/theme1.xml"/><Relationship Id="rId${n + 5}" Type="${REL}/tableStyles" Target="tableStyles.xml"/></Relationships>`);
    add('ppt/presProps.xml', `${XML}<p:presentationPr ${NS}/>`);
    add('ppt/viewProps.xml', `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
    add('ppt/tableStyles.xml', `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);
    add('ppt/theme/theme1.xml', theme(this.fonts));
    add('ppt/slideMasters/slideMaster1.xml', MASTER);
    add('ppt/slideMasters/_rels/slideMaster1.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`);
    add('ppt/slideLayouts/slideLayout1.xml', LAYOUT);
    add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
    S.forEach((s, i) => { add(`ppt/slides/slide${i + 1}.xml`, s.xml()); add(`ppt/slides/_rels/slide${i + 1}.xml.rels`, s.relsXml()); });
    for (let i = 0; i < this.charts.length; i++) {
      add(`ppt/charts/chart${i + 1}.xml`, chartXml(this.charts[i], i + 1));
      add(`ppt/charts/_rels/chart${i + 1}.xml.rels`, `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/package" Target="../embeddings/Microsoft_Excel_Worksheet${i + 1}.xlsx"/></Relationships>`);
      add(`ppt/embeddings/Microsoft_Excel_Worksheet${i + 1}.xlsx`, await chartBook(this.charts[i]));
    }
    this.images.forEach((png, i) => add(`ppt/media/image${i + 1}.png`, png));
    return C.writeZip(f);
  }
}
return { create: o => new Deck(o), esc, chartXml };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Writer2 !== 'undefined' ? Writer2 : require('./writer2.js'));
if (typeof module !== 'undefined') module.exports = Pptx;
