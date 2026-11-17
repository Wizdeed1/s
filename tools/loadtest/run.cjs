// How many people can have Cadence open at the same time on one shared data folder: N simulated people, each a page with the tool's
// own shared-folder code (js/store.js FolderStore: one encrypted file per record, a change marker in _changes, every open page
// looking for other people's changes every 5 seconds). Every person watches two collections, as the staff pages do, and saves
// their own record now and then. Measured: changes lost (each person's last save, as every other person sees it at the end), the
// time a save takes to reach everyone else (p50, p95, max), and errors. The folder starts with a busy day's markers in _changes.
// All the people run on this one computer (so its processor is shared by all of them: a harder test than N computers), and the
// folder is this computer's own disk, not a network share.
// Usage: node tools/loadtest/run.cjs [people=50] [seconds=120] [save every s: min=15] [max=45] [old markers=3000]
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const store = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'store.js'), 'utf8');
const [N = 50, SECS = 120, MIN = 15, MAX = 45, OLD = 3000] = process.argv.slice(2).map(Number);
const pct = (L, q) => { if (!L.length) return null; const s = [...L].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]; };
(async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await b.newContext(), errs = [];
  await ctx.route('http://localhost:8799/u.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><title>person</title><script>${store}</script>` }));
  const pages = [];
  for (let i = 0; i < N; i++) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${i}: ${e.message}`)); await p.goto('http://localhost:8799/u.html'); pages.push(p); }
  // one data key for everyone (as the team's data key after signing in), and a busy day's markers already in the folder
  const raw = await pages[0].evaluate(async old => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true }), ch = await root.getDirectoryHandle('_changes', { create: true });
    const now = Date.now(); for (let k = 0; k < old; k++) await ch.getFileHandle(`${(now - 60000 - Math.floor(Math.random() * 100 * 60000)).toString(36)}-old${k % 50}-${btoa('forms/x' + k).replace(/=+$/, '')}`, { create: true });
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); const r = new Uint8Array(await crypto.subtle.exportKey('raw', key)); return btoa(String.fromCharCode(...r));
  }, OLD);
  const setupMs = Date.now() - t0;
  // every person: the folder, the key, two watched collections, and their own saves at random times
  await Promise.all(pages.map((p, i) => p.evaluate(async ([i, raw, SECS, MIN, MAX]) => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('MC Data', { create: true });
    const dk = await crypto.subtle.importKey('raw', Uint8Array.from(atob(raw), c => c.charCodeAt(0)), 'AES-GCM', false, ['encrypt', 'decrypt']);
    const db = FolderStore.folderDb(root); db.unlock({ dk });
    const seen = window.seen = {}, saves = window.saves = [];
    const look = sn => { for (const d of sn.docs) { const v = d.data(); if (!v || v.from == null) continue; const k = v.from; if (!seen[k] || v.seq > seen[k].seq) seen[k] = { seq: v.seq, at: Date.now(), hist: { ...(seen[k] ? seen[k].hist : {}), [v.seq]: Date.now() } }; } };
    db.collection('att/2026-11/edits').onSnapshot(look); db.collection('forms').onSnapshot(sn => sn);
    let seq = 0; const end = Date.now() + SECS * 1000;
    const next = () => { const wait = (MIN + Math.random() * (MAX - MIN)) * 1000; setTimeout(async () => { if (Date.now() > end) return; seq++; const at = Date.now(); try { await db.doc(`att/2026-11/edits/p${i}`).set({ from: i, seq, at, days: { [1 + (seq % 28)]: { v: 'SL', by: 'p' + i, at: new Date(at).toISOString() } } }); saves.push({ seq, at }); } catch (e) { saves.push({ seq, at, err: String(e && e.message) }); } next(); }, wait); };
    setTimeout(next, Math.random() * MIN * 1000);
    window.db = db;
  }, [i, raw, SECS, MIN, MAX])));
  console.log(`${N} people ready in ${Math.round((Date.now() - t0) / 1000)} s (the folder made with ${OLD} old markers in ${Math.round(setupMs / 1000)} s); saving for ${SECS} s, each every ${MIN}–${MAX} s`);
  await new Promise(r => setTimeout(r, (SECS + 20) * 1000));   // the saves, then time for the last ones to reach everyone
  const R = await Promise.all(pages.map(p => p.evaluate(() => ({ seen: window.seen, saves: window.saves, problems: window.db.problems() }))));
  const lat = [], lost = []; let saves = 0, failed = 0;
  R.forEach((w, i) => {
    w.saves.forEach(s => { if (s.err) failed++; else saves++; });
    const ok = w.saves.filter(s => !s.err); if (!ok.length) return;
    const last = ok[ok.length - 1].seq;
    R.forEach((o, j) => {
      if (j === i) return;
      const v = o.seen[i];
      if (!v || v.seq < last) { lost.push(`${i}→${j}`); return; }
      for (const s of ok) { const got = Object.entries(v.hist).filter(([q]) => +q >= s.seq).map(([, t]) => t); if (got.length) lat.push(Math.min(...got) - s.at); }
    });
  });
  const probs = R.reduce((a, w) => a + w.problems.length, 0);
  const sec = x => (x == null ? '–' : (x / 1000).toFixed(1) + ' s');
  console.log(`saves: ${saves} (failed ${failed}) · seen by everyone else: ${lat.length} times · lost: ${lost.length}${lost.length ? ' (' + lost.slice(0, 8).join(', ') + ')' : ''} · problems: ${probs} · page errors: ${errs.length}`);
  console.log(`time for a save to reach another person: p50 ${sec(pct(lat, 0.5))}, p95 ${sec(pct(lat, 0.95))}, p99 ${sec(pct(lat, 0.99))}, max ${sec(lat.length ? Math.max(...lat) : null)}`);
  console.log(JSON.stringify({ people: N, seconds: SECS, every: [MIN, MAX], old: OLD, saves, failed, lost: lost.length, problems: probs, errors: errs.length, p50: pct(lat, 0.5), p95: pct(lat, 0.95), p99: pct(lat, 0.99), max: lat.length ? Math.max(...lat) : null }));
  await b.close();
  process.exit(lost.length || failed || errs.length || probs ? 1 : 0);
})();
