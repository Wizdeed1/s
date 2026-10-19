// ================================================================ TITLE CASE: the words on buttons, menus, tabs and column headings
// Apple's title-style capitalization (HIG: buttons, menus, segmented controls, tab views, lists and tables): every word capitalized
// except articles, coordinating conjunctions and prepositions of four letters or fewer, with the first and last word always
// capitalized. The words are written in sentence case in the code and stay that way everywhere else (emails, forms, files, toasts);
// this only changes how a control's label reads on screen. Labels of switches and checkboxes keep sentence case, as the HIG asks.
// Only words in lower case change: one with a capital inside, a digit or a dot (KPI, 2026, .xlsx) is left as it is, and so is any
// text inside a preview, a one-to-one form's table, a chip, a hint or a count.
const TC_SMALL = new Set('a an the and but or nor for so yet as at by from in into of off on onto out over per to up via with vs'.split(' '));
const TC_UNIT = new Set('min mins sec secs h hr hrs s ms px etc'.split(' '));
const TC_VERB = new Set('sign log set back look fill check turn switch hand pick follow roll start shut zoom carry clean wrap sum top cross'.split(' '));
const TC_PART = new Set('in out up off on over down back'.split(' '));
const TC_PREFIX = new Set('re pre non co un sub'.split(' '));
const TC_SEL = '.btn, .menu button, .seg button, .tabs button, .sbnav button > span, .sbitem > span, .tabbar span, .msitem > span, .qa b, .step .t b, thead th, .dlgfoot button';
const TC_NOT = '.previewWrap, .rprev, #dForm thead, #dSign thead, .fread thead, .fusec thead, .linkbtn, .chip, .teamchips, [data-nocase], [contenteditable="true"], small, .sr, kbd, .kbd, .cnt, .badge, .pill, .pst, .wsdot, .bn';
const TC_SKIP = 'small, .sr, kbd, .kbd, .cnt, .badge, .pill, .pst, .wsdot, .bn, input, textarea, select, svg, code';
const TC_WORD = /^([("'“‘[]*)([A-Za-z][a-z'’]*(?:-[A-Za-z][a-z'’]*)*)([)"'”’\],.:;!?…]*)$/;
const TC_SEP = /^[·•–—/|→-]+$/;
const tcCap = w => w.charAt(0).toUpperCase() + w.slice(1);
/** one word of a label (only its lower-case parts change); edge: the first or last word of a phrase, or the word after a colon */
function tcWord(w, edge, prev, first) {
  const lo = x => /^[a-z]/.test(x);
  if (!w.includes('-')) {
    if (!lo(w)) return w;
    if (TC_UNIT.has(w)) return first ? tcCap(w) : w;   // Tardy min: a unit stays a unit
    if (TC_PART.has(w) && TC_VERB.has(prev)) return tcCap(w);   // a verb's own particle: Sign In, Set Up, Follow Up
    return !edge && TC_SMALL.has(w) ? w : tcCap(w);
  }
  const P = w.split('-'), pre = TC_PREFIX.has(P[0].toLowerCase());   // One-to-One, Follow-Up, Re-run
  return P.map((p, i) => (!lo(p) ? p : i === 0 ? tcCap(p) : pre || (TC_SMALL.has(p) && i < P.length - 1) ? p : tcCap(p))).join('-');
}
/** a label in title case, across all of its own words (a hint, a count or a badge inside it is left alone) */
function tcEl(el) {
  if (el.closest(TC_NOT)) return;
  const toks = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walk.nextNode(); t; t = walk.nextNode()) {
    const sk = t.parentElement && t.parentElement.closest(TC_SKIP);
    if (sk && el.contains(sk)) continue;
    for (const m of t.data.matchAll(/\S+/g)) toks.push({ t, at: m.index, s: m[0] });
  }
  const words = toks.filter(x => !TC_SEP.test(x.s) && /[\p{L}\p{N}]/u.test(x.s));
  if (!words.length) return;
  const byNode = new Map();
  words.forEach((x, i) => {
    const m = TC_WORD.exec(x.s); if (!m) return;
    const j = toks.indexOf(x), before = toks[j - 1], after = toks[j + 1], prevW = words[i - 1];
    const edge = i === 0 || i === words.length - 1 || (before && (TC_SEP.test(before.s) || /:$/.test(before.s))) || (after && TC_SEP.test(after.s)) || /:$/.test(m[3]);
    const prev = prevW ? ((TC_WORD.exec(prevW.s) || [])[2] || '').toLowerCase() : '';
    const w = tcWord(m[2], edge, prev, i === 0);
    if (w !== m[2]) { if (!byNode.has(x.t)) byNode.set(x.t, []); byNode.get(x.t).push({ at: x.at + m[1].length, from: m[2], to: w }); }
  });
  byNode.forEach((L, t) => { let s = t.data; for (const c of L.reverse()) s = s.slice(0, c.at) + c.to + s.slice(c.at + c.from.length); if (s !== t.data) t.data = s; });
}
function tcScan(root) {
  if (!root || root.nodeType !== 1) return;
  if (root.matches(TC_SEL)) tcEl(root);
  root.querySelectorAll(TC_SEL).forEach(tcEl);
}
try {
  tcScan(document.body);
  const tcObs = new MutationObserver(L => {
    const seen = new Set();
    for (const m of L) {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const host = el && el.closest(TC_SEL); if (host) seen.add(host);
      if (m.type === 'childList') m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches(TC_SEL)) seen.add(n); n.querySelectorAll(TC_SEL).forEach(x => seen.add(x)); } });
    }
    seen.forEach(tcEl);
    tcObs.takeRecords();   // the changes made here are not new labels
  });
  tcObs.observe(document.body, { childList: true, subtree: true, characterData: true });
} catch (e) { /* none */ }
