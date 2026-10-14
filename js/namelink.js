// ================================================================ NAMES FROM OTHER FILES: the tool works out who is who
// The quality EVAL, the interactions export, the daily review and the KPI file each name people their own way ("Areej Sebaih" for
// "Areej Yasser Subah", "Basil Mulla" for "Basil Kamel Abdulsatar Mulla", "Tawifg" for "Tawfiq"). Every name is compared with each
// roster person's name, Genesys name and work email: the first name, then the family name by how it sounds, then the names in
// between, with the brand and the team as a check. A name is linked only when one person clearly fits best and nobody else fits
// almost as well, and each person takes one name; a name linked before keeps its link. The rest are offered with the likely
// people first, for one click.
const NameLink = (() => {
  const DROP = new Set(['bin', 'ibn', 'bint', 'binti', 'mr', 'mrs', 'ms']);
  const JOIN = new Set(['al', 'el', 'abdul', 'abdel', 'abd', 'abdal', 'abu', 'abo', 'bu']);   // "al qahtani", "abdul malik": one word
  const strip = s => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  /** the words of a name, the way they are compared */
  function toks(s) {
    const t = strip(s).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/['\u2019`\u00b4]/g, '').replace(/[^a-z\u0600-\u06ff\s]/g, ' ').split(/\s+/).filter(Boolean), out = [];
    for (let i = 0; i < t.length; i++) {
      const w = t[i]; if (DROP.has(w)) continue;
      if (JOIN.has(w) && t[i + 1] && !DROP.has(t[i + 1])) { out.push(w + t[++i]); continue; }
      out.push(w);
    }
    return out;
  }
  const noAl = w => (/^(al|el)./.test(w) && w.length >= 5 ? w.slice(2) : w);
  /** how a word sounds: kh/gh/sh/th/dh/ph folded, q g k alike, no vowels, no doubled letters, no final h */
  function sound(w) {
    let s = strip(w).replace(/[^a-z]/g, '');
    s = s.replace(/(ah|eh|ih|oh|uh)$/, m => m[0]);
    s = s.replace(/kh/g, 'x').replace(/gh/g, 'k').replace(/sh/g, '$').replace(/th/g, 't').replace(/dh/g, 'd').replace(/ph/g, 'f').replace(/[qgc]/g, 'k').replace(/z/g, 'z');
    s = s.replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
    return s;
  }
  function lev(a, b, max) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1;
    const m = b.length; let p2 = null, p1 = Array.from({ length: m + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let lo = i;
      for (let j = 1; j <= m; j++) {
        let c = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) c = Math.min(c, p2[j - 2] + 1);
        cur.push(c); if (c < lo) lo = c;
      }
      if (lo > max) return max + 1; p2 = p1; p1 = cur;
    }
    return p1[m];
  }
  /** two words: 1 the same, then how close (without "al", one typo, the same sound) */
  function word(a, b) {
    if (a === b) return 1;
    const A = noAl(a), B = noAl(b); if (A === B) return 0.97;
    if (A.length >= 5 && B.length >= 5 && lev(A, B, 1) <= 1) return 0.9;
    const sa = sound(A), sb = sound(B);
    if (sa.length >= 3 && sa === sb) return 0.86;
    if (sa.length >= 2 && sa === sb && A.length <= 5) return 0.8;
    if (A.length >= 7 && B.length >= 7 && lev(A, B, 2) <= 2) return 0.78;
    if (sa.length >= 4 && sb.length >= 4 && lev(sa, sb, 1) <= 1) return 0.74;
    return 0;
  }
  /** a name from a file against one way of writing a roster name -> { s, why } */
  function pair(T, C) {
    if (!T.length || !C.length) return { s: 0, why: '' };
    if (T.join(' ') === C.join(' ')) return { s: 1, why: 'same name' };
    const f = word(T[0], C[0]);
    if (T.length === 1) return f >= 0.86 ? { s: 0.65 + 0.25 * f, why: f === 1 ? 'same first name' : 'first name sounds the same', one: true } : { s: 0, why: '' };
    if (f < 0.74) return { s: 0, why: '' };
    // the family name: the last word (or the last two as one) somewhere after the first name
    const lastT = T[T.length - 1], last2 = T.length >= 3 ? T[T.length - 2] + T[T.length - 1] : null;
    let fam = 0, at = -1;
    for (let j = 1; j < C.length; j++) {
      let v = Math.max(word(lastT, C[j]), last2 ? word(last2, C[j]) : 0, j + 1 < C.length ? word(lastT, C[j] + C[j + 1]) : 0);
      if (!v && f >= 0.97) { const a = sound(noAl(lastT)), b = sound(noAl(C[j])); if (a.length >= 2 && a === b) v = 0.8; }   // "Sebaih" and "Subah" sound alike, with the same first name
      const w = v * (j === C.length - 1 ? 1 : 0.97);   // the family name is usually last
      if (w > fam) { fam = w; at = j; }
    }
    if (fam < 0.74) return { s: 0, why: '' };
    // the names in between should be there too
    let miss = 0, mid = 0;
    for (let i = 1; i < T.length - 1; i++) { if (last2 && i === T.length - 2 && fam >= 0.86) continue; mid++; let b = 0; for (let j = 1; j < C.length; j++) if (j !== at) b = Math.max(b, word(T[i], C[j])); if (b < 0.8) miss++; }
    const s = Math.min(0.97, 0.5 * f + 0.5 * fam - 0.12 * miss) - Math.min(0.02, 0.01 * Math.max(0, C.length - T.length));   // the very same name always comes first
    const why = f === 1 && fam >= 0.97 ? 'same first and family name' : `${f === 1 ? 'same first name' : 'first name sounds the same'}; ${fam >= 0.97 ? 'same family name' : 'family name sounds the same'}`;
    return { s, why };
  }
  /**
   * items:  [{ name, id (a national ID, when the file has one), brand, team, kind ('agent' | 'leader') }]
   * people: [{ id, name, names: [the roster's ways of writing it], seen: [names other files used for this person's ID], email, brand, team,
   *            lead (true for a supervisor), off (true if inactive) }]
   * saved:  { lower-case name -> person id } (links made before)
   * no:     { lower-case name -> [person ids] } (links someone said were wrong: never again)
   * -> one result per item: { id (or null), score, sure, auto, why, alts: [{ id, score, why }] }
   */
  function link(items, people, saved, no) {
    const S = saved || {}, N = no || {}, P = people.map(p => {
      const mail = p.email ? String(p.email).split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim() : '';
      const forms = [...new Set((p.names || [p.name]).filter(Boolean))].map(n => ({ n, t: toks(n), how: 'roster' }));
      if (mail) forms.push({ n: mail, t: toks(mail), how: 'mail' });
      for (const n of new Set(p.seen || [])) if (n && !forms.some(f => f.n === n)) forms.push({ n, t: toks(n), how: 'seen' });
      return { ...p, forms };
    });
    const byId = new Map(P.map(p => [p.id, p]));
    const cand = items.map(it => {
      const key = strip(it.name).replace(/\s+/g, ' ').trim(), T = toks(it.name), L = [];
      const notThese = new Set(N[key] || []);
      if (it.id) { const q = P.find(x => x.nid && x.nid === String(it.id)); if (q && !notThese.has(q.id)) return [{ id: q.id, s: 1.02, why: 'same national ID' }]; }   // an ID in the file: no guessing
      const pre = S[key]; if (pre && byId.has(pre) && !notThese.has(pre)) return [{ id: pre, s: 1.01, why: 'linked before' }];
      for (const p of P) {
        if (notThese.has(p.id)) continue;
        let best = { s: 0, why: '' };
        for (const f of p.forms) {
          const r = pair(T, f.t); if (r.s <= 0) continue;
          // a name another file used for this person's ID counts a little less than the roster's own (files have mistakes)
          const v = f.how === 'seen' ? Math.min(r.s, 0.96) : r.s;
          if (v > best.s) best = { ...r, s: v, why: f.how === 'mail' ? (r.why === 'same name' ? 'same as the work email' : r.why + ' (work email)') : f.how === 'seen' ? (r.why === 'same name' ? `the name an earlier file used for this ID` : r.why + ' (an earlier file)') : r.why };
        }
        if (best.s <= 0) continue;
        let s = best.s, why = best.why;
        if (it.brand && p.brand && normB(it.brand) !== normB(p.brand)) { s -= best.s >= 0.97 ? 0.08 : 0.5; why += `, though the roster says ${p.brand}`; }   // another brand: only the very same name can still be this person
        if (it.team && p.team && it.team === p.team) s += 0.02;
        if (it.kind !== 'leader' && p.lead) s -= 0.15;   // a supervisor is not one of the agents
        if (it.kind === 'leader') s += p.lead ? 0.1 : -0.1;   // and a team lead is a supervisor
        if (p.off) s -= 0.03;
        if (best.one && it.kind !== 'leader') s -= 0.1;   // a first name alone is not enough for an agent
        if (best.one) s = Math.min(s, 0.93);   // a first name alone is linked, but shown to check
        if (s > 0.3) L.push({ id: p.id, s: Math.min(1, s), why });
      }
      return L.sort((a, b) => b.s - a.s);
    });
    // one person per name: the clearest pairs first; a name is linked only when nobody else fits almost as well
    const out = items.map((it, i) => ({ id: null, score: 0, sure: false, auto: false, why: '', alts: cand[i].slice(0, 4).map(c => ({ id: c.id, score: Math.min(1, c.s), why: c.why })) }));
    const pairs = []; cand.forEach((L, i) => L.forEach((c, r) => pairs.push({ i, r, ...c })));
    pairs.sort((a, b) => b.s - a.s);
    const used = new Set(), done = new Set();
    for (const x of pairs) {
      if (done.has(x.i) || used.has(x.id)) continue;
      const L = cand[x.i], second = L.find(c => c.id !== x.id && !used.has(c.id));
      const margin = x.s - (second ? second.s : 0);
      // does another name fit this person almost as well, and is this person that name's own best fit too?
      const rival = pairs.find(y => y.id === x.id && y.i !== x.i && !done.has(y.i) && y.s >= x.s - 0.04 && y.s > 0.7 && y.s >= cand[y.i][0].s - 0.02);
      const linkedBefore = x.s > 1, exact = x.s >= 0.95;   // the same name, or the same first and family name
      const ok = linkedBefore || (exact && margin >= 0.03 && !rival) || (x.s >= 0.82 && margin >= 0.08 && !rival);   // a team alone (0.02) never decides between two people
      if (!ok) continue;
      out[x.i] = { ...out[x.i], id: x.id, score: Math.min(1, x.s), sure: linkedBefore || exact, auto: true, why: x.why };
      used.add(x.id); done.add(x.i);
    }
    return out;
  }
  const normB = b => { const x = strip(b).replace(/[^a-z]/g, ''); return /^fr[i]?endi/.test(x) ? 'friendi' : /virgin|postpaid/.test(x) ? 'virgin' : x; };   // FRiENDi Pay sits with FRiENDi
  return { link, toks, sound, word };
})();
