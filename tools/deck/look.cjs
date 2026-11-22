// The decks' shared look, the Showcase's in Present (the overview deck, make_deck.cjs, and the technical deck, make_tech.cjs):
// each slide a white card with 20 px corners on the sky gradient, the black square at its top right and the strip of the logo's
// colours along its foot (one picture, on the layout); a label with a blue square, the title in capitals with the words that
// matter in bold, the lead in grey, light cards with a hairline border; Poppins throughout. Every slide fades in and its parts
// rise in, one after another (an object's name says how and when: 'up|300|…', 'fade|0|…'); CONFIDENTIAL and the number at the foot.
// look(Pptx, { art, title, subject }) -> the deck's pres and pieces; write(outFile) saves it with the theme, the transitions and the
// motion (pptxgenjs writes none of them). art: the folder showcase_shots.cjs made (sc-frame.png, the logo, the figures).
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');
const Core = require(path.join(ROOT, 'js', 'core.js'));
module.exports = function look(Pptx, { art, title, subject }) {
const A = n => path.join(art, n.endsWith('.png') ? n : n + '.png');
const size = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
// the Showcase's colours (js/ui6/00_tokens.css, light): ink, its greys, the accent blue, a hairline, and the logo's pink for "10+"
const C = { ink: '0A1222', ink2: '1B2840', muted: '41506A', faint: '4F5C74', white: 'FFFFFF', line: 'E3E8F0', blue: '1273D4', btext: '0B5CAE', bsoft: 'EAF2FC',
  pink: 'F6ADCC', red: 'B42318', rsoft: 'FDECEA', green: '0C7B6C', black: '080808' };
// the theme keeps the company's (Beyond) colours, so PowerPoint's own palette is the template's
const THEME = { name: 'Beyond', head: 'Poppins', body: 'Poppins',
  colors: { dk1: '080808', lt1: 'FFFFFF', dk2: '0D76BD', lt2: 'F6ADCC', accent1: '9693C8', accent2: 'ED7D31', accent3: '0C7B6C', accent4: '007FA2', accent5: 'ED1C24', accent6: 'BF9DCA', hlink: '00DFED', folHlink: '778DA5' } };
const W = 13.333, X0 = 0.8, X1 = 12.53, CW = X1 - X0, FONT = 'Poppins', LIGHT = 'Poppins Light';
const pres = new Pptx(); pres.layout = 'LAYOUT_WIDE';
pres.title = title; pres.subject = subject; pres.author = 'Member Care WFM team'; pres.company = 'Member Care';
pres.theme = { headFontFace: THEME.head, bodyFontFace: THEME.body };

// ---- the layouts: the Showcase's card (a picture), CONFIDENTIAL and the number inside its foot, and the title where the Showcase has
// it (larger on the first slide)
const foot = [{ text: { text: 'CONFIDENTIAL', options: { x: X0, y: 6.86, w: 3.5, h: 0.2, fontSize: 7, color: C.faint, fontFace: FONT, charSpacing: 1.4, margin: 0, valign: 'middle' } } }];
const num = { x: X1 - 1.0, y: 6.86, w: 1.0, h: 0.2, fontSize: 7, color: C.faint, fontFace: FONT, align: 'right' };
const titlePh = (y, w, h, size) => ({ placeholder: { options: { name: 'title', type: 'title', x: X0, y, w, h, fontSize: size, bold: false, fontFace: LIGHT, color: C.ink, align: 'left', valign: 'top', margin: 0, lineSpacingMultiple: 0.95 }, text: '' } });
pres.defineSlideMaster({ title: 'SHOW', background: { path: A('sc-frame') }, objects: [...foot, titlePh(1.06, 10.8, 1.2, 30)], slideNumber: num });
pres.defineSlideMaster({ title: 'HERO', background: { path: A('sc-frame') }, objects: [...foot, titlePh(2.02, 6.6, 1.6, 40)], slideNumber: num });

// ---- pieces. An object's name says how it comes in and when: 'up|300|…' rises in 300 ms after the slide, 'fade|0|…' fades in
const T = (s, text, o) => s.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, ...o });
/** a title as the Showcase writes it and breaks it: in capitals, the words it makes bold in bold (Poppins), the rest light, a new
    line where the Showcase starts one (lines: [[{ t, b }]]) */
const runs = L => L.flatMap((line, li) => line.map((r, ri) => ({ text: (ri ? ' ' : '') + r.t.trim().toUpperCase(), options: { bold: r.b, fontFace: r.b ? FONT : LIGHT, ...(ri === line.length - 1 && li < L.length - 1 ? { breakLine: true } : {}) } })));
/** the label above the title: a blue square and the section's name in small capitals */
function eyebrow(s, text, y = 0.82) {
  s.addShape(pres.shapes.RECTANGLE, { x: X0, y: y + 0.055, w: 0.075, h: 0.075, fill: { color: C.blue }, line: { type: 'none' }, objectName: 'fade|0|label-dot' });
  T(s, text.toUpperCase(), { x: X0 + 0.16, y, w: 8, h: 0.19, fontSize: 7.5, color: C.ink2, bold: true, charSpacing: 1.6, valign: 'middle', objectName: 'fade|0|label' });
}
const lead = (s, text, o = {}) => text && T(s, text, { x: o.x ?? X0, y: o.y ?? 2.2, w: o.w ?? 8.4, h: o.h ?? 0.62, fontSize: o.size ?? 13, fontFace: LIGHT, color: C.muted, valign: 'top', lineSpacingMultiple: 1.1, objectName: `up|${o.t ?? 250}|lead` });
/** a light card, as the Showcase's: white with a hairline border and soft corners (or the accent blue) */
const card = (s, x, y, w, h, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.12, fill: { color: o.fill || C.white }, line: o.fill && o.fill !== C.white ? { type: 'none' } : { color: C.line, width: 0.75 }, objectName: `up|${o.t ?? 300}|card` });
/** a part the Showcase draws, as it draws it (a picture), placed by its width (or height) */
function pic(s, n, b, name, alt = '') {
  const z = size(A(n)), k = b.w ? b.w / z.w : b.h / z.h;
  s.addImage({ path: A(n), x: b.x, y: b.y, w: z.w * k, h: z.h * k, objectName: name, altText: alt });
  return { x: b.x, y: b.y, w: z.w * k, h: z.h * k };
}
/** a word in a pill, as the Showcase's chips; returns its width */
function pill(s, text, x, y, o = {}) {
  const w = 0.34 + text.length * 0.068;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.3, rectRadius: 0.15, fill: { color: o.fill || C.white }, line: o.fill ? { type: 'none' } : { color: C.line, width: 0.75 }, objectName: `up|${o.t ?? 500}|pill` });
  T(s, text, { x, y, w, h: 0.3, fontSize: 9, color: o.color || C.ink2, align: 'center', valign: 'middle', objectName: `up|${o.t ?? 500}|pill-t` });
  return w;
}
const slides = [];
const add = (layout, sec) => { pres.addSection({ title: sec.name }); const s = pres.addSlide({ masterName: layout, sectionTitle: sec.name }); s.addNotes(sec.notes); slides.push(s); return s; };
// ---- write, then the theme, the transitions and the motion (pptxgenjs writes neither)
const tn = { n: 0 }, nid = () => ++tn.n;
const set = (spid) => `<p:set><p:cBhvr><p:cTn id="${nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
const fadeB = (spid, dur) => `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
const anim = (spid, dur, attr, from, to) => `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;
/** one effect: fade (Fade, preset 10) or up (Float In, preset 42: a fade while it rises a little) */
function effect({ spid, fx, delay }, first) {
  const id = nid(), up = fx === 'up', dur = up ? 650 : 500;
  const body = set(spid) + fadeB(spid, dur) + (up ? anim(spid, dur, 'ppt_x', '#ppt_x', '#ppt_x') + anim(spid, dur, 'ppt_y', '#ppt_y+.05', '#ppt_y') : '');
  return `<p:par><p:cTn id="${id}" presetID="${up ? 42 : 10}" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="${first ? 'afterEffect' : 'withEffect'}"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${body}</p:childTnLst></p:cTn></p:par>`;
}
function timing(list, sps) {
  tn.n = 0;
  const root = nid(), seq = nid(), click = nid(), grp = nid();
  const effects = list.map((e, i) => effect(e, i === 0)).join('');
  return `<p:timing><p:tnLst><p:par><p:cTn id="${root}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="${seq}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
    `<p:par><p:cTn id="${click}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="${seq}"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="${grp}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>` +
    `<p:bldLst>${sps.map(id => `<p:bldP spid="${id}" grpId="0" animBg="1"/>`).join('')}</p:bldLst></p:timing>`;
}
function motion(xml) {
  const list = [], sps = [];
  xml = xml.replace(/ descr="[^"]*\.png"/g, ' descr=""');   // a decorative picture (an icon) has no description, never its file's path
  // the title placeholder rises in first, then every named part at its time
  xml = xml.replace(/<p:sp>((?:(?!<\/p:sp>)[\s\S])*?)<\/p:sp>/g, (all, inner) => {
    const m = inner.match(/<p:cNvPr id="(\d+)" name="([^"]*)"/); if (!m) return all;
    if (/<p:ph type="title"/.test(inner) && /<a:t>/.test(inner)) { list.push({ spid: m[1], fx: 'up', delay: 100 }); sps.push(m[1]); }
    return all;
  });
  xml = xml.replace(/<p:cNvPr id="(\d+)" name="(fade|up)\|(\d+)\|([^"]*)"/g, (all, id, fx, delay, name, at, src) => {
    list.push({ spid: id, fx, delay: +delay }); if (/<p:nvSpPr>\s*$/.test(src.slice(Math.max(0, at - 40), at))) sps.push(id);   // a shape (not a picture or a table) gets its build entry
    return `<p:cNvPr id="${id}" name="${name}"`;
  });
  list.sort((a, b) => a.delay - b.delay);
  const trans = '<p:transition spd="med"><p:fade/></p:transition>';
  return xml.replace('</p:sld>', `${trans}${list.length ? timing(list, [...new Set(sps)]) : ''}</p:sld>`);
}
/** the logo on the layouts is described as the logo, not by its file's name */
const layout = xml => xml.replace(/ descr="[^"]*beyond-one-[^"]*\.(png|gif)"/g, ' descr="Beyond One"');
function theme(xml) {
  const c = THEME.colors;
  xml = xml.replace(/<a:clrScheme name="[^"]*">[\s\S]*?<\/a:clrScheme>/, `<a:clrScheme name="${THEME.name}"><a:dk1><a:srgbClr val="${c.dk1}"/></a:dk1><a:lt1><a:srgbClr val="${c.lt1}"/></a:lt1>${['dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map(k => `<a:${k}><a:srgbClr val="${c[k]}"/></a:${k}>`).join('')}</a:clrScheme>`);
  xml = xml.replace(/(<a:majorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.head}"`).replace(/(<a:minorFont>\s*<a:latin typeface=")[^"]*"/, `$1${THEME.body}"`);
  return xml.replace(/<a:theme ([^>]*)name="[^"]*"/, `<a:theme $1name="${THEME.name}"`);
}
async function write(outFile) {
  const tmp = outFile + '.tmp.pptx';
  await pres.writeFile({ fileName: tmp });
  const z = await Core.readZip(fs.readFileSync(tmp)), files = [];
  for (const n of z.names()) {
    if (n.endsWith('/')) continue;
    if (/^ppt\/slides\/slide\d+\.xml$/.test(n)) files.push({ name: n, data: motion(await z.text(n)) });
    else if (/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)) files.push({ name: n, data: layout(await z.text(n)) });
    else if (/^ppt\/theme\/theme\d+\.xml$/.test(n)) files.push({ name: n, data: theme(await z.text(n)) });
    else files.push({ name: n, data: await z.bytes(n) });
  }
  fs.writeFileSync(outFile, await Core.writeZip(files)); fs.unlinkSync(tmp);
  console.log(`✓ ${outFile}: ${slides.length} slides`);
}

return { pres, C, THEME, W, X0, X1, CW, FONT, LIGHT, A, size, T, runs, eyebrow, lead, card, pic, pill, add, slides, write };
};
