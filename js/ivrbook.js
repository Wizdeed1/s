/* Cadence - the IVR's daily record as a workbook for the stakeholders (no dependencies). One month of one IVR, from its daily record
   (ivr/<brand>/days/<day>): a dashboard (the month's four numbers, the highs and the lows, three charts, the actions that failed
   most), the daily record with its formulas, the data action errors by action and day (a heat map), every action's runs and errors
   day by day, the menus when they were recorded, and how each number is counted. Counts and names of data actions only: no caller,
   no agent. */
'use strict';
const IvrBook = ((C, W) => {
const { colName } = C;
const esc = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const INK = 'FF201E1D', NAVY = 'FF0F172A', SKY = 'FF38BDF8', SLATE = 'FFCBD5E1', RED = 'FFE10A0A', MUTE = 'FF6F6C6A', LINE = 'FFE2E0DE', STRIPE = 'FFF7F6F5', TRACK = 'FFF1EFED', WHITE = 'FFFFFFFF', PINK = 'FFFBE0DD';
const MON = C.MON;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const serial = d => C.ymdSerial(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10));
const short = d => +d.slice(8) + ' ' + MON[+d.slice(5, 7) - 1];
const q = name => `'${name.replace(/'/g, "''")}'`;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ratio = (a, b) => (b > 0 ? a / b : '');

/* ------------------------------------------------------------ charts (DrawingML, as Excel writes them) */
const rich = (text, sz, b, color) => `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}" b="${b ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p></c:rich></c:tx>`;
const txPr = (sz, color) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
const numRef = (f, pts, code) => `<c:numRef><c:f>${esc(f)}</c:f><c:numCache><c:formatCode>${esc(code)}</c:formatCode><c:ptCount val="${pts.length}"/>${pts.map((v, i) => (typeof v === 'number' && Number.isFinite(v) ? `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>` : '')).join('')}</c:numCache></c:numRef>`;
const strRef = (f, v) => `<c:strRef><c:f>${esc(f)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(v)}</c:v></c:pt></c:strCache></c:strRef>`;
/** o: { title, kind: 'bar' | 'line', cat: { f, pts }, series: [{ name, nameF, f, pts, color }], fmt (the values' format), max } */
function chartXml(o) {
  const ser = o.series.map((s, i) => {
    const head = `<c:idx val="${i}"/><c:order val="${i}"/><c:tx>${strRef(s.nameF, s.name)}</c:tx>`;
    const cat = `<c:cat>${numRef(o.cat.f, o.cat.pts, 'd mmm')}</c:cat>`, val = `<c:val>${numRef(s.f, s.pts, o.fmt)}</c:val>`;
    if (o.kind === 'bar') {
      return `<c:ser>${head}<c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>`
        + `<c:dLbls><c:numFmt formatCode="${esc(o.fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(800, '6F6C6A')}<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`
        + `${cat}${val}</c:ser>`;
    }
    return `<c:ser>${head}<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill><a:round/></a:ln></c:spPr>`
      + `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>`
      + `<c:dLbls><c:numFmt formatCode="${esc(o.fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(800, s.color)}<c:dLblPos val="t"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`
      + `${cat}${val}<c:smooth val="0"/></c:ser>`;
  }).join('');
  const kind = o.kind === 'bar'
    ? `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="70"/><c:axId val="10"/><c:axId val="20"/></c:barChart>`
    : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>`;
  const ln = c => `<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></a:ln></c:spPr>`;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<c:date1904 val="0"/><c:roundedCorners val="0"/><c:chart>'
    + `<c:title>${rich(o.title, 1200, true, '201E1D')}<c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    + `<c:plotArea><c:layout/>${kind}`
    + `<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="d mmm" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${ln('BFBFBF')}${txPr(900, '6F6C6A')}<c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="0"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/>${o.max != null ? `<c:max val="${o.max}"/>` : ''}<c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines>${ln('EEEEEE')}</c:majorGridlines><c:numFmt formatCode="${esc(o.fmt)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, '6F6C6A')}<c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`
    + '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>'
    + `${o.series.length > 1 ? `<c:legend><c:legendPos val="t"/><c:overlay val="0"/>${txPr(900, '201E1D')}</c:legend>` : ''}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>`
    + `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E0DE"/></a:solidFill></a:ln></c:spPr>`
    + '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr></c:chartSpace>';
}
/** the drawing on the dashboard: each chart between two cells ({ c1, r1, c2, r2 }, 1-based), and the logo when there is one */
function drawingXml(anchors, logo) {
  const EMU = 9525;
  const charts = anchors.map((a, i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.c1 - 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r1 - 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.c2 - 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r2 - 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
    + `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}" descr="${esc(a.alt)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>`
    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join('');
  let pic = '';
  if (logo) {
    const h = 30, w = Math.round(h * logo.w / logo.h), cx = w * EMU, cy = h * EMU;
    pic = `<xdr:oneCellAnchor><xdr:from><xdr:col>${logo.c - 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${logo.r - 1}</xdr:row><xdr:rowOff>${6 * EMU}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/>`
      + `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${anchors.length + 2}" name="Logo" descr="${esc(logo.alt || 'Logo')}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
      + `<xdr:blipFill><a:blip r:embed="rId${anchors.length + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' + charts + pic + '</xdr:wsDr>';
}
/** the package: the sheets, their styles, the dashboard's drawing (charts, logo) */
function pack(sheets, styles, draw) {
  const R = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const rels = body => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
  const filters = sheets.map((s, i) => (s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(q(s.name))}!${s.filter.split(':').map(x => x.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':')}</definedName>` : '')).join('');
  const ds = sheets.indexOf(draw.sheet);
  if (ds >= 0) draw.sheet._drawing = true;
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + (draw.logo ? '<Default Extension="png" ContentType="image/png"/>' : '')
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + (ds >= 0 ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '')
      + draw.charts.map((c, i) => `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: rels(R('rId1', 'officeDocument', 'xl/workbook.xml')) },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'
      + sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + `</sheets>${filters ? `<definedNames>${filters}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: rels(sheets.map((s, i) => R(`rId${i + 1}`, 'worksheet', `worksheets/sheet${i + 1}.xml`)).join('') + R(`rId${sheets.length + 1}`, 'styles', 'styles.xml')) },
    { name: 'xl/styles.xml', data: styles.xml() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml(i === 0) })),
  ];
  if (ds >= 0) {
    files.push({ name: `xl/worksheets/_rels/sheet${ds + 1}.xml.rels`, data: rels(R('rId1', 'drawing', '../drawings/drawing1.xml')) });
    files.push({ name: 'xl/drawings/drawing1.xml', data: drawingXml(draw.anchors, draw.logo) });
    files.push({ name: 'xl/drawings/_rels/drawing1.xml.rels', data: rels(draw.charts.map((c, i) => R(`rId${i + 1}`, 'chart', `../charts/chart${i + 1}.xml`)).join('') + (draw.logo ? R(`rId${draw.charts.length + 1}`, 'image', '../media/logo.png') : '')) });
    draw.charts.forEach((c, i) => files.push({ name: `xl/charts/chart${i + 1}.xml`, data: c }));
    if (draw.logo) files.push({ name: 'xl/media/logo.png', data: draw.logo.png });
  }
  return C.writeZip(files);
}

/* ------------------------------------------------------------ the workbook */
/** m: { brand, flow, month: 'YYYY-MM', days: [the month's records, a day each], months: [earlier months of the year: { label,
    days, calls, noQueue, quick, deflected, queued, da, runs, errorsN }], made: Date, by, logo: { png, w, h, alt } | null } */
function build(m) {
  const S = new W.Styles(), st = o => S.get(o);
  const font = (sz, o) => Object.assign({ name: 'Calibri', sz, color: INK }, o || {});
  const days = (m.days || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!days.length) throw new Error('nothing is recorded for that month');
  const within = days.reduce((w, d) => d.within || w, 40), y = +m.month.slice(0, 4), mo = +m.month.slice(5, 7);
  const monthName = `${MONTHS[mo - 1]} ${y}`, span = days.length === 1 ? short(days[0].date) : `${short(days[0].date)} to ${short(days[days.length - 1].date)}`;
  const made = m.made instanceof Date ? m.made : new Date(), madeTxt = `${DAYS[made.getDay()]} ${made.getDate()} ${MON[made.getMonth()]} ${made.getFullYear()}`;
  const anyDa = days.some(d => d.da), flow = m.flow || days.map(d => d.flow).find(Boolean) || 'the IVR';
  const fmtN = n => Math.round(num(n)).toLocaleString('en-US'), pct = (a, b, dp) => (b > 0 ? (100 * a / b).toFixed(dp || 0) + '%' : '–');

  // the styles: a title, a heading row, the rows (striped), the totals, the notes
  const sTitle = st({ font: font(16, { b: true }) }), sSub = st({ font: font(10, { color: MUTE }) }), sH2 = st({ font: font(10, { b: true, color: MUTE }) });
  const head = (h) => st({ font: font(10, { b: true, color: WHITE }), fill: INK, align: { h: h || 'right', v: 'center', wrap: true } });
  const cell = (fmt, o) => st({ font: font(10, o && o.font), fill: o && o.fill, numFmt: fmt, align: { h: (o && o.h) || 'right' }, border: { b: LINE } });
  const NF = { n: '#,##0', p: '0%', p1: '0.0%', d: 'ddd d mmm', z: '#,##0;-#,##0;""' };

  /* ---- Daily record: a row a day, the deflection, the transfers and the error rate as formulas; the month to date under them */
  const D = new W.Sheet('Daily record'); D.tab = INK; D.print = { landscape: true };
  const DC = [['Date', 14, 'left'], ['IVR calls', 11], ['No queue', 11], [`Within ${within}s`, 11], ['Deflected', 11], ['IVR deflection', 12], ['Queued', 11], ['Transfer to Agent', 12], ['Data action runs', 12], ['Errors', 9], ['Error rate', 10], ['Note', 34, 'left']];
  D.set(1, 1, `IVR daily record · ${m.brand} · ${monthName}`, sTitle); D.heights[1] = 26;
  D.set(2, 1, `${flow} flow · ${days.length} ${days.length === 1 ? 'day' : 'days'} recorded (${span}) · made by Cadence on ${madeTxt}${m.by ? ' by ' + m.by : ''}`, sSub);
  DC.forEach(([h, w, al], i) => { D.width(i + 1, w); D.set(4, i + 1, h, head(al)); }); D.heights[4] = 32;
  const R0 = 5, R1 = R0 + days.length - 1, RT = R1 + 1, RA = R1 + 2;
  days.forEach((d, i) => {
    const r = R0 + i, f = i % 2 ? STRIPE : null, o = (h, x) => ({ fill: f, h, font: x });
    D.set(r, 1, serial(d.date), cell(NF.d, o('left', { b: true })));
    D.set(r, 2, num(d.calls), cell(NF.n, o())); D.set(r, 3, num(d.noQueue), cell(NF.n, o())); D.set(r, 4, num(d.quick), cell(NF.n, o()));
    D.set(r, 5, num(d.noQueue) - num(d.quick), cell(NF.n, o()), `C${r}-D${r}`);
    D.set(r, 6, ratio(num(d.noQueue) - num(d.quick), num(d.calls)), cell(NF.p, o()), `IF(B${r}>0,E${r}/B${r},"")`);
    D.set(r, 7, num(d.queued), cell(NF.n, o()));
    D.set(r, 8, ratio(num(d.queued), num(d.calls)), cell(NF.p, o()), `IF(B${r}>0,G${r}/B${r},"")`);
    D.set(r, 9, d.da ? num(d.runs) : '', cell(NF.n, o())); D.set(r, 10, d.da ? num(d.errorsN) : '', cell(NF.n, o()));
    D.set(r, 11, d.da ? ratio(num(d.errorsN), num(d.runs)) : '', cell(NF.p1, o()), `IF(N(I${r})>0,J${r}/I${r},"")`);
    D.set(r, 12, d.da ? '' : 'No Data Actions export that day', cell(null, o('left', { color: MUTE, i: true })));
  });
  const sum = c => days.reduce((t, d) => t + num(typeof c === 'function' ? c(d) : d[c]), 0);
  const T = { calls: sum('calls'), noQueue: sum('noQueue'), quick: sum('quick'), queued: sum('queued'), runs: sum(d => (d.da ? d.runs : 0)), errors: sum(d => (d.da ? d.errorsN : 0)) };
  T.deflected = T.noQueue - T.quick;
  const tot = (fmt, h) => st({ font: font(10, { b: true }), fill: TRACK, numFmt: fmt, align: { h: h || 'right' }, border: { t: INK, b: INK }, bstyle: 'medium' });
  const rng = c => `${c}${R0}:${c}${R1}`;
  D.set(RT, 1, 'Month to date', tot(null, 'left'));
  [['B', T.calls], ['C', T.noQueue], ['D', T.quick], ['E', T.deflected], ['G', T.queued], ['I', anyDa ? T.runs : ''], ['J', anyDa ? T.errors : '']].forEach(([c, v]) => D.set(RT, c.charCodeAt(0) - 64, v, tot(NF.n), `SUM(${rng(c)})`));
  D.set(RT, 6, ratio(T.deflected, T.calls), tot(NF.p), `IF(B${RT}>0,E${RT}/B${RT},"")`);
  D.set(RT, 8, ratio(T.queued, T.calls), tot(NF.p), `IF(B${RT}>0,G${RT}/B${RT},"")`);
  D.set(RT, 11, anyDa ? ratio(T.errors, T.runs) : '', tot(NF.p1), `IF(N(I${RT})>0,J${RT}/I${RT},"")`);
  D.set(RT, 12, '', tot(null, 'left'));
  const avg = st({ font: font(10, { color: MUTE, i: true }), numFmt: NF.n, align: { h: 'right' } });
  D.set(RA, 1, 'Daily average', st({ font: font(10, { color: MUTE, i: true }) }));
  ['B', 'C', 'D', 'E', 'G'].forEach(c => D.set(RA, c.charCodeAt(0) - 64, days.reduce((t, d) => t + num(c === 'E' ? num(d.noQueue) - num(d.quick) : d[{ B: 'calls', C: 'noQueue', D: 'quick', G: 'queued' }[c]]), 0) / days.length, avg, `AVERAGE(${rng(c)})`));
  D.freeze = [R0, 2]; D.filter = `A4:L${R1}`;
  // a bar in each day's calls; the deflection greener the higher; the transfers and the error rate redder the higher
  D.cf.push({ type: 'raw', sqref: rng('B'), xml: '<cfRule type="dataBar" priority="@P"><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="FF8EA9C8"/></dataBar></cfRule>' });
  D.cf.push({ type: 'raw', sqref: rng('F'), xml: '<cfRule type="colorScale" priority="@P"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="FFFFFFFF"/><color rgb="FF7CC79A"/></colorScale></cfRule>' });
  D.cf.push({ type: 'raw', sqref: rng('H'), xml: '<cfRule type="colorScale" priority="@P"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="FFFFFFFF"/><color rgb="FFF4B183"/></colorScale></cfRule>' });
  D.cf.push({ type: 'raw', sqref: rng('K'), xml: '<cfRule type="colorScale" priority="@P"><colorScale><cfvo type="min"/><cfvo type="max"/><color rgb="FFFFFFFF"/><color rgb="FFF08080"/></colorScale></cfRule>' });

  /* ---- Errors by action: a row an action that failed this month, a column a day, a cell its errors that day (a heat map) */
  const E = new W.Sheet('Errors by action'); E.tab = RED; E.print = { landscape: true };
  const daDays = days.filter(d => d.da), acts = {};
  daDays.forEach(d => (d.acts || []).forEach(([name, runs, errs]) => { const a = acts[name] = acts[name] || { name, runs: 0, errors: 0, by: {} }; a.runs += num(runs); a.errors += num(errs); a.by[d.date] = num(errs); }));
  const failed = Object.values(acts).filter(a => a.errors > 0).sort((a, b) => b.errors - a.errors || b.runs - a.runs);
  E.set(1, 1, `Data action errors by day · ${flow} · ${monthName}`, sTitle); E.heights[1] = 26;
  E.set(2, 1, 'Every data action of the flow that failed at least once this month, the most errors first. A cell is the action\'s errors that day: the darker the red, the more errors. A grey day had no Data Actions export.', sSub);
  const dc = 2, ec = dc + days.length, EH = 4, E0 = 5, E1 = E0 + Math.max(failed.length, 1) - 1, ET = E1 + 1;
  E.width(1, 36); E.set(EH, 1, 'Data action', head('left'));
  days.forEach((d, i) => { E.width(dc + i, 8); E.set(EH, dc + i, serial(d.date), st({ font: font(9, { b: true, color: d.da ? WHITE : SLATE }), fill: INK, numFmt: 'd mmm', align: { h: 'center' } })); });
  [['Errors', 10], ['Runs', 11], ['Error rate', 10], ['Share of errors', 11]].forEach(([h, w], i) => { E.width(ec + i, w); E.set(EH, ec + i, h, head()); });
  E.heights[EH] = 30;
  const dayCols = `${colName(dc)}${E0}:${colName(ec - 1)}${E1}`, eCol = colName(ec), rCol = colName(ec + 1);
  if (!failed.length) E.set(E0, 1, anyDa ? 'No data action of the flow failed this month.' : 'No Data Actions export was dropped this month.', st({ font: font(10, { i: true, color: MUTE }) }));
  failed.forEach((a, i) => {
    const r = E0 + i, f = i % 2 ? STRIPE : null;
    E.set(r, 1, a.name, cell(null, { fill: f, h: 'left' }));
    days.forEach((d, j) => E.set(r, dc + j, d.da ? (a.by[d.date] || 0) : '', st({ font: font(10), fill: d.da ? f : TRACK, numFmt: NF.z, align: { h: 'center' }, border: { b: LINE } })));
    E.set(r, ec, a.errors, cell(NF.n, { fill: f, font: { b: true } }), `SUM(${colName(dc)}${r}:${colName(ec - 1)}${r})`);
    E.set(r, ec + 1, a.runs, cell(NF.n, { fill: f }));
    E.set(r, ec + 2, ratio(a.errors, a.runs), cell(NF.p1, { fill: f }), `IF(${rCol}${r}>0,${eCol}${r}/${rCol}${r},"")`);
    const all = failed.reduce((t, x) => t + x.errors, 0);
    E.set(r, ec + 3, ratio(a.errors, all), cell(NF.p, { fill: f }), `IF(SUM($${eCol}$${E0}:$${eCol}$${E1})>0,${eCol}${r}/SUM($${eCol}$${E0}:$${eCol}$${E1}),"")`);
  });
  E.set(ET, 1, 'All the flow\'s data actions', tot(null, 'left'));
  days.forEach((d, j) => E.set(ET, dc + j, d.da ? num(d.errorsN) : '', st({ font: font(10, { b: true }), fill: TRACK, numFmt: NF.z, align: { h: 'center' }, border: { t: INK, b: INK }, bstyle: 'medium' }), failed.length && d.da ? `SUM(${colName(dc + j)}${E0}:${colName(dc + j)}${E1})` : null));
  E.set(ET, ec, T.errors, tot(NF.n), failed.length ? `SUM(${eCol}${E0}:${eCol}${E1})` : null);
  E.set(ET, ec + 1, T.runs, tot(NF.n));
  E.set(ET, ec + 2, ratio(T.errors, T.runs), tot(NF.p1), `IF(${rCol}${ET}>0,${eCol}${ET}/${rCol}${ET},"")`);
  E.set(ET, ec + 3, '', tot(null));
  E.set(ET + 2, 1, 'Runs: every run of the action this month (the days with a Data Actions export). Error rate: its errors of its runs. Share of errors: its part of the month\'s errors.', st({ font: font(9, { i: true, color: MUTE }) }));
  if (failed.length) E.cf.push({ type: 'raw', sqref: dayCols, xml: '<cfRule type="colorScale" priority="@P"><colorScale><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="FFFFFFFF"/><color rgb="FFE10A0A"/></colorScale></cfRule>' });
  if (failed.length) E.cf.push({ type: 'raw', sqref: `${colName(ec + 3)}${E0}:${colName(ec + 3)}${E1}`, xml: '<cfRule type="dataBar" priority="@P"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="FFF08080"/></dataBar></cfRule>' });
  E.freeze = [E0, 2];

  /* ---- Error detail: every action of the flow, every day with the export: its runs, its errors, its rate (red from 5%) */
  const X = new W.Sheet('Error detail'); X.tab = 'FFB30808'; X.print = { landscape: false };
  X.set(1, 1, `Data actions day by day · ${flow} · ${monthName}`, sTitle); X.heights[1] = 26;
  X.set(2, 1, 'Every data action of the flow on every day with a Data Actions export: how many times it ran and how many runs failed. A rate of 5% or more is red.', sSub);
  [['Date', 14, 'left'], ['Data action', 38, 'left'], ['Runs', 11], ['Errors', 10], ['Error rate', 11]].forEach(([h, w, al], i) => { X.width(i + 1, w); X.set(4, i + 1, h, head(al)); });
  X.heights[4] = 24;
  let xr = 5;
  daDays.forEach(d => (d.acts || []).forEach(([name, runs, errs]) => {
    const f = (xr - 5) % 2 ? STRIPE : null;
    X.set(xr, 1, serial(d.date), cell(NF.d, { fill: f, h: 'left' })); X.set(xr, 2, name, cell(null, { fill: f, h: 'left' }));
    X.set(xr, 3, num(runs), cell(NF.n, { fill: f })); X.set(xr, 4, num(errs), cell(NF.n, { fill: f }));
    X.set(xr, 5, ratio(num(errs), num(runs)), cell(NF.p1, { fill: f }), `IF(C${xr}>0,D${xr}/C${xr},"")`);
    xr++;
  }));
  if (xr === 5) X.set(5, 1, 'No Data Actions export was dropped this month.', st({ font: font(10, { i: true, color: MUTE }) }));
  else {
    X.filter = `A4:E${xr - 1}`; X.freeze = [5, 1];
    X.addCF(`A5:E${xr - 1}`, 'AND(ISNUMBER($E5),$E5>=0.05)', S.dxf({ color: RED, b: true, fill: PINK }));
  }

  /* ---- Menus: the top outcomes and milestones of each day, when their exports were dropped */
  const withLists = days.filter(d => d.lists);
  let Mn = null;
  if (withLists.length) {
    Mn = new W.Sheet('Menus'); Mn.tab = 'FF6F6C6A'; Mn.print = { landscape: false };
    Mn.set(1, 1, `Top menus and milestones · ${flow} · ${monthName}`, sTitle); Mn.heights[1] = 26;
    Mn.set(2, 1, 'The five outcomes with the most attempts after the first menu (every caller\'s), and the five milestones with the most hits, on each day their exports were dropped.', sSub);
    [['Date', 14, 'left'], ['Kind', 24, 'left'], ['Rank', 7], ['Name', 40, 'left'], ['Attempts or hits', 14]].forEach(([h, w, al], i) => { Mn.width(i + 1, w); Mn.set(4, i + 1, h, head(al)); });
    let r = 5;
    withLists.forEach(d => {
      const put = (kind, list, key) => (list || []).forEach((x, i) => {
        const f = (r - 5) % 2 ? STRIPE : null;
        Mn.set(r, 1, serial(d.date), cell(NF.d, { fill: f, h: 'left' })); Mn.set(r, 2, kind, cell(null, { fill: f, h: 'left' }));
        Mn.set(r, 3, i + 1, cell('0', { fill: f })); Mn.set(r, 4, x.name, cell(null, { fill: f, h: 'left' })); Mn.set(r, 5, num(x[key]), cell(NF.n, { fill: f })); r++;
      });
      put(d.first ? `Outcome, after ${d.first.name}` : 'Outcome', d.outcomes, 'attempts');
      put('Milestone', d.milestones, 'hits');
    });
    Mn.filter = `A4:E${Math.max(5, r - 1)}`; Mn.freeze = [5, 1];
  }

  /* ---- About: how each number is counted, where it comes from, the days recorded */
  const A = new W.Sheet('About'); A.tab = 'FF94A3B8'; A.print = { landscape: true };
  A.set(1, 1, 'How the numbers are counted', sTitle); A.heights[1] = 26;
  A.width(1, 26); A.width(2, 96);
  A.set(3, 1, 'Number', head('left')); A.set(3, 2, 'How Cadence counts it', head('left'));
  const defs = [
    ['IVR calls', `The rows of the day's Interactions export of the IVR's flow (${flow}): one row is one call into the IVR.`],
    ['No queue', 'The calls whose Queue column is blank: they never reached a queue.'],
    [`Within ${within}s`, `The calls with no queue that ended within ${within} seconds (0 s to ${within} s, ${within} s itself included).`],
    ['Deflected', `No queue less Within ${within}s: the calls that stayed in the IVR longer than ${within} seconds and never reached a queue.`],
    ['IVR deflection', 'Deflected divided by IVR calls.'],
    ['Queued', 'The calls whose Queue column is not blank: they reached a queue for an agent.'],
    ['Transfer to Agent', 'Queued divided by IVR calls.'],
    ['Data action runs', 'From the day\'s Data Actions Performance export: every run of the flow\'s own data actions (its Action Category is the flow), Customer Type included.'],
    ['Errors', 'The runs that failed: the export\'s Errors column, or its runs times its Error % when it has no Errors column. An action that failed at all counts at least one error.'],
    ['Error rate', 'Errors divided by data action runs. A day without the Data Actions export has no errors and no rate.'],
    ['Month to date', 'The days recorded this month added up; each rate is worked out from the totals, not as an average of the days.'],
  ];
  defs.forEach(([k, v], i) => { const f = i % 2 ? STRIPE : null; A.set(4 + i, 1, k, cell(null, { fill: f, h: 'left', font: { b: true } })); A.set(4 + i, 2, v, st({ font: font(10), fill: f, align: { h: 'left', wrap: true }, border: { b: LINE } })); A.heights[4 + i] = 30; });
  let ar = 4 + defs.length + 1;
  A.set(ar++, 1, 'Where it comes from', sH2);
  [`Genesys Cloud exports dropped each day in Cadence's Report builder (WFM team), kept as the IVR's daily record: a day each, counts and the names of data actions only. No caller's number and no agent's name is kept.`,
    `Made by Cadence on ${madeTxt}${m.by ? ' by ' + m.by : ''}. The formulas work out the shares again in Excel, so a number changed by hand updates the rest.`].forEach(t => { A.set(ar, 1, t, st({ font: font(10), align: { h: 'left', wrap: true } })); A.merge(ar, 1, ar, 2); A.heights[ar] = 30; ar++; });
  ar++;
  A.set(ar++, 1, 'Days recorded', sH2);
  A.set(ar, 1, 'Date', head('left')); A.set(ar, 2, 'Recorded', head('left')); ar++;
  days.forEach((d, i) => {
    const f = i % 2 ? STRIPE : null, at = d.at ? new Date(d.at) : null;
    A.set(ar, 1, serial(d.date), cell(NF.d, { fill: f, h: 'left' }));
    A.set(ar, 2, (at && !isNaN(at) ? `${at.getDate()} ${MON[at.getMonth()]} ${at.getFullYear()} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '') + (d.by ? ' by ' + d.by : '') + (d.da ? '' : ' · no Data Actions export'), cell(null, { fill: f, h: 'left' }));
    ar++;
  });

  /* ---- Dashboard: the band, the month's four numbers, the highs and the lows, three charts, the actions that failed most */
  const B = new W.Sheet('Dashboard'); B.tab = NAVY; B.print = { landscape: true, onePage: true };
  B.width(1, 2); for (let c = 2; c <= 13; c++) B.width(c, 11.5); B.width(14, 2);
  const band = (r, v, f) => { for (let c = 2; c <= 13; c++) B.set(r, c, c === 2 ? v : '', f); };
  band(1, 'MC WORKFORCE', st({ font: font(9, { b: true, color: SKY }), fill: NAVY, align: { h: 'left', v: 'bottom', indent: 1 } })); B.heights[1] = 24;
  band(2, `IVR daily record · ${monthName}`, st({ font: font(20, { b: true, color: WHITE }), fill: NAVY, align: { h: 'left', indent: 1 } })); B.heights[2] = 34;
  band(3, `${m.brand} · ${flow} flow · ${days.length} ${days.length === 1 ? 'day' : 'days'} recorded (${span}) · made ${madeTxt}`, st({ font: font(10, { color: SLATE }), fill: NAVY, align: { h: 'left', v: 'top', indent: 1 } })); B.heights[3] = 24;
  const DR = q('Daily record');
  const cardDefs = [
    ['IVR CALLS', `${DR}!B${RT}`, T.calls, NF.n, `"over "&COUNT(${DR}!A${R0}:A${R1})&" ${days.length === 1 ? 'day' : 'days'} · "&TEXT(${DR}!B${RA},"#,##0")&" a day"`, `over ${days.length} ${days.length === 1 ? 'day' : 'days'} · ${fmtN(T.calls / days.length)} a day`],
    ['IVR DEFLECTION', `${DR}!F${RT}`, ratio(T.deflected, T.calls), NF.p, `TEXT(${DR}!E${RT},"#,##0")&" of "&TEXT(${DR}!B${RT},"#,##0")&" calls: no queue, over ${within} s"`, `${fmtN(T.deflected)} of ${fmtN(T.calls)} calls: no queue, over ${within} s`],
    ['TRANSFER TO AGENT', `${DR}!H${RT}`, ratio(T.queued, T.calls), NF.p, `TEXT(${DR}!G${RT},"#,##0")&" of "&TEXT(${DR}!B${RT},"#,##0")&" calls reached a queue"`, `${fmtN(T.queued)} of ${fmtN(T.calls)} calls reached a queue`],
    ['ERRORS', anyDa ? `${DR}!K${RT}` : null, anyDa ? ratio(T.errors, T.runs) : '–', NF.p1, anyDa ? `TEXT(${DR}!J${RT},"#,##0")&" errors of "&TEXT(${DR}!I${RT},"#,##0")&" data action runs"` : null, anyDa ? `${fmtN(T.errors)} errors of ${fmtN(T.runs)} data action runs` : 'no Data Actions export this month'],
  ];
  cardDefs.forEach(([lab, f, v, nf, nfm, nv], i) => {
    const c1 = 2 + i * 3, c2 = c1 + 2, alert = lab === 'ERRORS' && typeof v === 'number' && v >= 0.05, bg = alert ? PINK : STRIPE, bc = alert ? RED : INK;
    const edge = (r, c) => ({ t: r === 5 ? bc : null, b: r === 7 ? bc : null, l: c === c1 ? bc : null, r: c === c2 ? bc : null });
    for (let r = 5; r <= 7; r++) for (let c = c1; c <= c2; c++) if (!(c === c1)) B.set(r, c, '', st({ fill: bg, border: edge(r, c), bstyle: 'medium' }));
    B.set(5, c1, lab, st({ font: font(9, { b: true, color: alert ? 'FFB30808' : MUTE }), fill: bg, border: edge(5, c1), bstyle: 'medium', align: { h: 'left', v: 'bottom', indent: 1 } }));
    B.set(6, c1, v, st({ font: font(26, { b: true }), fill: bg, numFmt: nf, border: edge(6, c1), bstyle: 'medium', align: { h: 'left', indent: 1 } }), f);
    B.set(7, c1, nv, st({ font: font(9, { color: MUTE }), fill: bg, border: edge(7, c1), bstyle: 'medium', align: { h: 'left', v: 'top', wrap: true, indent: 1 } }), nfm);
    for (let r = 5; r <= 7; r++) B.merge(r, c1, r, c2);
  });
  B.heights[5] = 22; B.heights[6] = 40; B.heights[7] = 30;
  // highs and lows: the day of each, found by the formulas
  B.set(9, 2, 'HIGHS AND LOWS', sH2);
  const hl = [
    ['Highest deflection', 'F', 'MAX', NF.p], ['Lowest deflection', 'F', 'MIN', NF.p], ['Busiest day', 'B', 'MAX', NF.n], ['Quietest day', 'B', 'MIN', NF.n], ['Highest transfer', 'H', 'MAX', NF.p],
  ].concat(anyDa ? [['Most data action errors', 'J', 'MAX', NF.n]] : []);
  const val = (c, d) => ({ B: num(d.calls), F: ratio(num(d.noQueue) - num(d.quick), num(d.calls)), H: ratio(num(d.queued), num(d.calls)), J: d.da ? num(d.errorsN) : '' })[c];
  hl.forEach(([lab, c, fn, nf], i) => {
    const r = 10 + i, f = i % 2 ? STRIPE : null, vals = days.map(d => val(c, d)).filter(v => typeof v === 'number');
    const best = vals.length ? Math[fn === 'MAX' ? 'max' : 'min'](...vals) : '', at = days.find(d => val(c, d) === best);
    B.set(r, 2, lab, st({ font: font(10), fill: f, align: { h: 'left' }, border: { b: LINE } })); B.merge(r, 2, r, 4);
    B.set(r, 3, '', st({ fill: f, border: { b: LINE } })); B.set(r, 4, '', st({ fill: f, border: { b: LINE } }));
    B.set(r, 5, at ? serial(at.date) : '', st({ font: font(10, { b: true }), fill: f, numFmt: NF.d, align: { h: 'left' }, border: { b: LINE } }), `IFERROR(INDEX(${DR}!$A$${R0}:$A$${R1},MATCH(${fn}(${DR}!${c}${R0}:${c}${R1}),${DR}!${c}${R0}:${c}${R1},0)),"")`);
    B.set(r, 6, best, st({ font: font(10, { b: true }), fill: f, numFmt: nf, align: { h: 'right' }, border: { b: LINE } }), `${fn}(${DR}!${c}${R0}:${c}${R1})`);
  });
  // the actions that failed most this month (the top of Errors by action)
  const EA = q('Errors by action');
  B.set(9, 8, 'DATA ACTIONS THAT FAILED MOST', sH2);
  [['Data action', 8, 10], ['Errors', 11], ['Error rate', 12], ['Share', 13]].forEach(([h, c1, c2]) => { B.set(10, c1, h, head(c1 === 8 ? 'left' : 'right')); if (c2) { for (let c = c1 + 1; c <= c2; c++) B.set(10, c, '', head()); B.merge(10, c1, 10, c2); } });
  const topN = failed.slice(0, 5);
  if (!topN.length) { B.set(11, 8, anyDa ? 'No data action failed this month.' : 'No Data Actions export this month.', st({ font: font(10, { i: true, color: MUTE }) })); B.merge(11, 8, 11, 13); }
  topN.forEach((a, i) => {
    const r = 11 + i, er = E0 + i, f = i % 2 ? STRIPE : null, all = failed.reduce((t, x) => t + x.errors, 0);
    B.set(r, 8, a.name, st({ font: font(10), fill: f, align: { h: 'left' }, border: { b: LINE } }), `${EA}!A${er}`);
    for (let c = 9; c <= 10; c++) B.set(r, c, '', st({ fill: f, border: { b: LINE } }));
    B.merge(r, 8, r, 10);
    B.set(r, 11, a.errors, st({ font: font(10, { b: true }), fill: f, numFmt: NF.n, align: { h: 'right' }, border: { b: LINE } }), `${EA}!${eCol}${er}`);
    B.set(r, 12, ratio(a.errors, a.runs), st({ font: font(10), fill: f, numFmt: NF.p1, align: { h: 'right' }, border: { b: LINE } }), `${EA}!${colName(ec + 2)}${er}`);
    B.set(r, 13, ratio(a.errors, all), st({ font: font(10), fill: f, numFmt: NF.p, align: { h: 'right' }, border: { b: LINE } }), `${EA}!${colName(ec + 3)}${er}`);
  });
  // earlier months of the year, when the record has them
  const months = m.months || [];
  let mr = 17;
  if (months.length) {
    B.set(mr++, 2, 'EARLIER MONTHS', sH2);
    ['Month', 'Days', 'IVR calls', 'IVR deflection', 'Transfer to Agent', 'Errors', 'Error rate'].forEach((h, i) => B.set(mr, 2 + i, h, head(i ? 'right' : 'left')));
    mr++;
    months.forEach((x, i) => {
      const f = i % 2 ? STRIPE : null, o = { fill: f };
      B.set(mr, 2, x.label, cell(null, { fill: f, h: 'left', font: { b: true } })); B.set(mr, 3, num(x.days), cell('0', o)); B.set(mr, 4, num(x.calls), cell(NF.n, o));
      B.set(mr, 5, ratio(num(x.deflected), num(x.calls)), cell(NF.p, o)); B.set(mr, 6, ratio(num(x.queued), num(x.calls)), cell(NF.p, o));
      B.set(mr, 7, x.da ? num(x.errorsN) : '', cell(NF.n, o)); B.set(mr, 8, x.da ? ratio(num(x.errorsN), num(x.runs)) : '', cell(NF.p1, o));
      mr++;
    });
    mr++;
  }
  // three charts under them, from the Daily record (they follow its numbers when they change)
  const top = Math.max(17, mr), cat = { f: `${DR}!$A$${R0}:$A$${R1}`, pts: days.map(d => serial(d.date)) };
  const charts = [
    chartXml({ title: 'IVR calls by day', kind: 'bar', cat, fmt: '#,##0', series: [{ name: 'IVR calls', nameF: `${DR}!$B$4`, f: `${DR}!$B$${R0}:$B$${R1}`, pts: days.map(d => num(d.calls)), color: '201E1D' }] }),
    chartXml({ title: 'IVR deflection and Transfer to Agent by day', kind: 'line', cat, fmt: '0%', max: 1, series: [
      { name: 'IVR deflection', nameF: `${DR}!$F$4`, f: `${DR}!$F$${R0}:$F$${R1}`, pts: days.map(d => ratio(num(d.noQueue) - num(d.quick), num(d.calls))), color: '1E8E5A' },
      { name: 'Transfer to Agent', nameF: `${DR}!$H$4`, f: `${DR}!$H$${R0}:$H$${R1}`, pts: days.map(d => ratio(num(d.queued), num(d.calls))), color: 'E10A0A' }] }),
  ];
  const anchors = [{ c1: 2, r1: top, c2: 8, r2: top + 18, alt: 'IVR calls by day' }, { c1: 8, r1: top, c2: 14, r2: top + 18, alt: 'IVR deflection and Transfer to Agent by day' }];
  if (anyDa) {
    charts.push(chartXml({ title: 'Data action errors by day', kind: 'bar', cat, fmt: '#,##0', series: [{ name: 'Errors', nameF: `${DR}!$J$4`, f: `${DR}!$J$${R0}:$J$${R1}`, pts: days.map(d => (d.da ? num(d.errorsN) : null)), color: 'E10A0A' }] }));
    anchors.push({ c1: 2, r1: top + 19, c2: 8, r2: top + 37, alt: 'Data action errors by day' });
  }
  B.set(top + (anyDa ? 38 : 19), 2, 'The charts and the four numbers follow the Daily record sheet: change a number there and they change with it. How each number is counted: see About.', st({ font: font(9, { i: true, color: MUTE }) }));
  const logo = m.logo && m.logo.png ? Object.assign({}, m.logo, { c: 12, r: 1 }) : null;

  const sheets = [B, D, E, X].concat(Mn ? [Mn] : [], [A]);
  return pack(sheets, S, { sheet: B, charts, anchors, logo });
}

return { build, chartXml };
})(typeof Core !== 'undefined' ? Core : require('./core.js'), typeof Writer2 !== 'undefined' ? Writer2 : require('./writer2.js'));
if (typeof module !== 'undefined') module.exports = IvrBook;
