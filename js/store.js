// ================================================================ SHARED FOLDER: everyone's data as locked files in one folder
// The HTML sits in a common folder; a data folder next to it holds one file per record. Records are encrypted with AES-GCM:
// staff records with the team's data key, each agent's own records with that agent's key. Accounts stay readable (they hold
// only scrambled passwords and locked keys) so people can sign in. Every write also drops a small marker in _changes, so the
// other people who have the tool open pick the change up within seconds.
const FolderStore = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const b64d = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
  const b64url = s => b64e(enc.encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = s => dec.decode(b64d(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)));
  const MAGIC = [77, 67, 68, 49];   // "MCD1"
  const PLAIN = new Set(['accounts', 'meta']);
  const APP = 'mc-report-builder';
  const supported = () => typeof window.showDirectoryPicker === 'function' && !!(window.crypto && crypto.subtle) && typeof CompressionStream === 'function';
  const copy = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, n * 2);

  // ---------------------------------------------------------------- the remembered folder (IndexedDB keeps the handle between visits)
  function idb() { return new Promise((res, rej) => { const q = indexedDB.open(APP, 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function kvGet(k) { try { const d = await idb(); return await new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return undefined; } }
  async function kvSet(k, v) { try { const d = await idb(); await new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); return true; } catch (e) { return false; } }
  async function kvDel(k) { try { const d = await idb(); await new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); } catch (e) { /* none */ } }

  // ---------------------------------------------------------------- crypto
  async function through(u8, ts) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(ts)).arrayBuffer()); }
  const gz = u8 => through(u8, new CompressionStream('gzip')), gunz = u8 => through(u8, new DecompressionStream('gzip'));
  async function seal(key, tag, aad, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), t = enc.encode(tag);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, await gz(enc.encode(JSON.stringify(obj)))));
    const out = new Uint8Array(5 + t.length + 12 + ct.length); out.set(MAGIC, 0); out[4] = t.length; out.set(t, 5); out.set(iv, 5 + t.length); out.set(ct, 17 + t.length);
    return out;
  }
  function tagOf(u8) { if (u8.length < 18 || MAGIC.some((m, i) => u8[i] !== m)) return null; return dec.decode(u8.subarray(5, 5 + u8[4])); }
  async function unseal(key, u8, aad) {
    const n = u8[4], iv = u8.subarray(5 + n, 17 + n), ct = u8.subarray(17 + n);
    return JSON.parse(dec.decode(await gunz(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, ct)))));
  }
  const RSA = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
  const Keys = {
    newPair: () => crypto.subtle.generateKey(RSA, true, ['wrapKey', 'unwrapKey']),
    pubOut: async k => b64e(new Uint8Array(await crypto.subtle.exportKey('spki', k))),
    pubIn: b => crypto.subtle.importKey('spki', b64d(b), RSA, true, ['wrapKey']),
    async sealPriv(priv, kekBits) {
      const iv = crypto.getRandomValues(new Uint8Array(12)), k = await crypto.subtle.importKey('raw', kekBits, 'AES-GCM', false, ['encrypt']);
      return { iv: b64e(iv), ct: b64e(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new Uint8Array(await crypto.subtle.exportKey('pkcs8', priv))))) };
    },
    async openPriv(s, kekBits) {
      const k = await crypto.subtle.importKey('raw', kekBits, 'AES-GCM', false, ['decrypt']);
      return crypto.subtle.importKey('pkcs8', await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(s.iv) }, k, b64d(s.ct)), RSA, true, ['unwrapKey']);
    },
    newAes: () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']),
    wrapFor: async (pubB64, aes) => b64e(new Uint8Array(await crypto.subtle.wrapKey('raw', aes, await Keys.pubIn(pubB64), { name: 'RSA-OAEP' }))),
    unwrapWith: (priv, w) => crypto.subtle.unwrapKey('raw', b64d(w), priv, { name: 'RSA-OAEP' }, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']),
    rawOut: async aes => b64e(new Uint8Array(await crypto.subtle.exportKey('raw', aes))),
    rawIn: b => crypto.subtle.importKey('raw', b64d(b), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']),
    fp: async pubB64 => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b64d(pubB64)))].slice(0, 10).map(x => x.toString(16).padStart(2, '0')).join(''),
  };

  // ---------------------------------------------------------------- names on disk: one folder per collection, one file per record
  // ids keep a-z 0-9 . _ - @ as they are; capitals become ^x (Windows ignores case), anything else ~hh
  const encSeg = s => String(s).replace(/[^a-z0-9._@-]/g, c => (c >= 'A' && c <= 'Z' ? '^' + c.toLowerCase() : '~' + c.charCodeAt(0).toString(16).padStart(2, '0')));
  const decSeg = s => s.replace(/\^([a-z])|~([0-9a-f]{2})/g, (m, u, h) => (u ? u.toUpperCase() : String.fromCharCode(parseInt(h, 16))));
  const segsOf = p => String(p).split('/').filter(Boolean);
  const isPlainPath = p => PLAIN.has(segsOf(p)[0]);

  /**
   * root: a FileSystemDirectoryHandle (the data folder). The returned object has the same calls the page uses on its
   * database (doc().get/set/update/delete, collection().get/onSnapshot), plus unlock() once the person has signed in.
   */
  function folderDb(root) {
    const me = rid(4);
    const K = { dk: null, dkTag: 'dk1', ak: new Map(), staff: false };
    const cache = new Map(), loaded = new Set(), loading = new Map(), subs = new Map(), dirs = new Map(), bad = new Map();
    let pollTimer = 0, lastPoll = 0, polling = false, stopped = false;
    const bornAt = Date.now();   // when this window opened the folder
    const ext = p => (isPlainPath(p) ? '.json' : '.mcd');
    const fname = (id, p) => 'd_' + encSeg(id) + ext(p);
    const snapDoc = (id, body) => ({ id, exists: body !== undefined, data: () => copy(body) });
    async function dirFor(cs, create) {   // cs: collection path segments (an odd number)
      let h = root, key = '';
      for (let i = 0; i < cs.length; i++) {
        const name = i % 2 === 0 ? encSeg(cs[i]) : 'd_' + encSeg(cs[i]) + '.sub';
        key += '/' + name;
        const got = dirs.get(key); if (got) { h = got; continue; }
        try { h = await h.getDirectoryHandle(name, { create }); }
        catch (e) { if (e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null; throw e; }
        dirs.set(key, h);
      }
      return h;
    }
    async function akey(pid, forWrite) {
      if (K.ak.has(pid)) return K.ak.get(pid);
      if (!K.dk) return null;
      const r = await readFile('akeys/' + pid).catch(() => null);
      if (r && r.body && r.body.k) { const k = await Keys.rawIn(r.body.k); K.ak.set(pid, k); return k; }
      if (!forWrite) return null;
      const k = await Keys.newAes(); await writeFile('akeys/' + pid, { k: await Keys.rawOut(k), at: new Date().toISOString() }); K.ak.set(pid, k); return k;
    }
    const tagFor = p => { const s = segsOf(p); return s[0] === 'agent' ? 'ak:' + s[1] : K.dkTag; };
    async function keyOf(tag, forWrite) { if (tag.startsWith('ak:')) return akey(tag.slice(3), forWrite); return tag === K.dkTag ? K.dk : null; }
    async function decode(p, u8) {
      if (isPlainPath(p)) return JSON.parse(dec.decode(u8));
      const tag = tagOf(u8); if (!tag) throw Object.assign(new Error('not a data file'), { code: 'bad' });
      const key = await keyOf(tag, false); if (!key) throw Object.assign(new Error('locked'), { code: 'locked' });
      return unseal(key, u8, p + '|' + tag);
    }
    /** -> {body, sig} or null when there is no such record */
    async function readFile(p) {
      const s = segsOf(p), d = await dirFor(s.slice(0, -1), false); if (!d) return null;
      let fh; try { fh = await d.getFileHandle(fname(s[s.length - 1], p)); } catch (e) { if (e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null; throw e; }
      const f = await fh.getFile(), sig = f.lastModified + ':' + f.size, c = cache.get(p);
      if (c && c.sig === sig) return c;
      return { body: await decode(p, new Uint8Array(await f.arrayBuffer())), sig };
    }
    async function writeFile(p, body) {
      const s = segsOf(p);
      if (s.length % 2) throw Object.assign(new Error('not a record path: ' + p), { code: 'invalid_argument' });
      let bytes;
      if (isPlainPath(p)) bytes = enc.encode(JSON.stringify(body));
      else { const tag = tagFor(p), key = await keyOf(tag, true); if (!key) throw Object.assign(new Error('locked'), { code: 'permission_denied' }); bytes = await seal(key, tag, p + '|' + tag, body); }
      const d = await dirFor(s.slice(0, -1), true), fh = await d.getFileHandle(fname(s[s.length - 1], p), { create: true });
      const w = await fh.createWritable(); await w.write(bytes); await w.close();
      let sig = ''; try { const f = await fh.getFile(); sig = f.lastModified + ':' + f.size; } catch (e) { /* none */ }
      cache.set(p, { body: copy(body), sig }); bad.delete(p);
      mark(p); emit(p);
    }
    async function removeFile(p) {
      const s = segsOf(p), d = await dirFor(s.slice(0, -1), false);
      if (d) { try { await d.removeEntry(fname(s[s.length - 1], p)); } catch (e) { if (!(e && e.name === 'NotFoundError')) throw e; } }
      cache.delete(p); mark(p); emit(p);
    }
    async function pool(list, n, fn) { let i = 0; const run = async () => { while (i < list.length) { const x = list[i++]; await fn(x); } }; await Promise.all(Array.from({ length: Math.min(n, list.length) }, run)); }
    async function listNames(cs) {
      const d = await dirFor(cs, false); if (!d) return [];
      const out = []; for await (const [n, h] of d.entries()) if (h.kind === 'file' && n.startsWith('d_') && /\.(mcd|json)$/.test(n)) out.push(decSeg(n.slice(2).replace(/\.(mcd|json)$/, '')));
      return out;
    }
    async function loadCollection(c) {
      if (loaded.has(c)) return; if (loading.has(c)) return loading.get(c);
      const p = (async () => {
        const ids = await listNames(segsOf(c));
        await pool(ids, 8, async id => {
          const path = c + '/' + id;
          try { const r = await readFile(path); if (r) { cache.set(path, r); bad.delete(path); } }
          catch (e) { bad.set(path, (e && e.code) || 'error'); }
        });
        loaded.add(c); loading.delete(c);
      })();
      loading.set(c, p); return p;
    }
    function snap(c) {
      const pre = c + '/', docs = [];
      for (const [p, v] of cache) if (p.startsWith(pre) && !p.slice(pre.length).includes('/')) docs.push(snapDoc(p.slice(pre.length), v.body));
      return { docs, size: docs.length, empty: !docs.length };
    }
    function emit(p) { const c = segsOf(p).slice(0, -1).join('/'); const L = subs.get(c); if (L) L.forEach(f => setTimeout(() => { try { f(snap(c)); } catch (e) { /* the listener's own problem */ } }, 0)); }
    // ---- other people's changes
    let jdir = null; const seen = new Set(); let jReady = false;
    async function jd() { if (!jdir) jdir = await root.getDirectoryHandle('_changes', { create: true }); return jdir; }
    function mark(p) {
      const n = Date.now().toString(36) + '-' + me + '-' + b64url(p); seen.add(n);
      jd().then(d => d.getFileHandle(n, { create: true })).catch(() => {});
    }
    async function refreshPath(p) {
      const c = segsOf(p).slice(0, -1).join('/');
      if (!loaded.has(c) && !cache.has(p)) return;
      try { const r = await readFile(p); if (r) cache.set(p, r); else cache.delete(p); bad.delete(p); }
      catch (e) { bad.set(p, (e && e.code) || 'error'); return; }
      emit(p);
    }
    async function poll() {
      if (polling || stopped) return; polling = true;
      try {
        const gap = lastPoll ? Date.now() - lastPoll : 0; lastPoll = Date.now();
        const d = await jd(), names = []; for await (const [n, h] of d.entries()) if (h.kind === 'file') names.push(n);
        const now = new Set(names), fresh = names.filter(n => !seen.has(n));
        for (const n of [...seen]) if (!now.has(n) && !n.includes('-' + me + '-')) seen.delete(n);
        fresh.forEach(n => seen.add(n));
        /** the files other windows changed (markers left since `since`, when given) */
        const pathsOf = (list, since) => {
          const paths = new Set();
          for (const n of list) {
            const i = n.indexOf('-'), j = n.indexOf('-', i + 1); if (i < 0 || j < 0 || n.slice(i + 1, j) === me) continue;
            if (since && !(parseInt(n.slice(0, i), 36) >= since)) continue;
            try { paths.add(unb64url(n.slice(j + 1))); } catch (e) { /* not ours */ }
          }
          return paths;
        };
        // the first look: what changed after this window opened the folder (and a few minutes before, for computer clocks
        // that differ) is read again, so a change made while this window was still loading is not missed
        if (!jReady) { jReady = true; for (const p of pathsOf(fresh, bornAt - 5 * 60000)) await refreshPath(p); }
        else if (gap > 90 * 60000) await rescan();   // the computer slept: markers this old may be gone, so look at everything again
        else for (const p of pathsOf(fresh)) await refreshPath(p);
        // tidy up: markers older than two hours go, whoever left them (a few per round)
        const old = Date.now() - 2 * 3600000; let k = 0;
        for (const n of names) { const t = parseInt(n.split('-')[0], 36); if (t && t < old && k < 40) { k++; d.removeEntry(n).catch(() => {}); } }
      } catch (e) { /* the folder is busy or out of reach: try again on the next round */ }
      finally { polling = false; }
    }
    async function rescan() {
      for (const c of [...loaded]) {
        const ids = new Set(await listNames(segsOf(c)).catch(() => []));
        const pre = c + '/';
        for (const p of [...cache.keys()]) if (p.startsWith(pre) && !p.slice(pre.length).includes('/') && !ids.has(p.slice(pre.length))) { cache.delete(p); emit(p); }
        await pool([...ids], 8, async id => { const p = pre + id, before = cache.get(p); try { const r = await readFile(p); if (r && (!before || before.sig !== r.sig)) { cache.set(p, r); emit(p); } } catch (e) { bad.set(p, (e && e.code) || 'error'); } });
      }
    }
    function schedule() { clearTimeout(pollTimer); if (stopped) return; pollTimer = setTimeout(() => { poll().finally(schedule); }, document.hidden ? 30000 : 5000); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); schedule(); } });
    schedule();
    return {
      folder: true, local: false, persistent: true, name: root.name, me,
      doc: path => ({
        id: segsOf(path).pop(), path,
        get: async () => {
          const s = segsOf(path), c = s.slice(0, -1).join('/');
          if (loaded.has(c) || loading.has(c)) await loadCollection(c);
          // always the file as it is now (someone may have changed it since the last look); unchanged files come from memory
          const before = cache.get(path), r = await readFile(path);
          if (r) { cache.set(path, r); bad.delete(path); if (before && before.sig !== r.sig && loaded.has(c)) emit(path); } else if (before) { cache.delete(path); if (loaded.has(c)) emit(path); }
          return snapDoc(s[s.length - 1], r ? r.body : undefined);
        },
        set: async body => writeFile(path, body),
        update: async patch => {
          const cur = cache.get(path) || await readFile(path);
          if (!cur) throw Object.assign(new Error('no such record'), { code: 'invalid_argument' });
          return writeFile(path, { ...copy(cur.body), ...copy(patch) });
        },
        delete: async () => removeFile(path),
      }),
      collection: c => ({
        get: async () => { await loadCollection(c); return snap(c); },
        onSnapshot: (cb, onErr) => {
          if (!subs.has(c)) subs.set(c, new Set()); subs.get(c).add(cb);
          loadCollection(c).then(() => cb(snap(c)), e => { if (onErr) onErr(e); });
          return () => { const L = subs.get(c); if (L) L.delete(cb); };
        },
      }),
      /** keys from the sign-in: { dk, staff, ak: Map(pid -> key) } */
      unlock(k) { if (k.dk) { K.dk = k.dk; K.staff = true; } if (k.ak) for (const [p, v] of k.ak) K.ak.set(p, v); },
      hasDataKey: () => !!K.dk,
      agentKey: pid => akey(pid, true),
      poll, rescan,
      problems: () => [...bad.entries()].map(([p, code]) => ({ path: p, code })),
      stop() { stopped = true; clearTimeout(pollTimer); },
    };
  }

  // ---------------------------------------------------------------- connecting a folder
  /** what is in a chosen folder: 'store' (ours), 'empty', or 'other' */
  async function inspect(dir) {
    try { const m = await dir.getDirectoryHandle('meta'); const f = await m.getFileHandle('d_store.json'); const j = JSON.parse(dec.decode(new Uint8Array(await (await f.getFile()).arrayBuffer()))); if (j && j.app === APP) return { kind: 'store', info: j }; } catch (e) { /* not ours yet */ }
    let n = 0; for await (const [name] of dir.entries()) { if (!name.startsWith('.')) n++; if (n > 0) break; }
    return { kind: n ? 'other' : 'empty' };
  }
  /** can the tool read its data in this folder right now? 'ok', 'notstore' (not its data folder), or 'error: …' */
  async function check(dir) {
    try {
      const m = await dir.getDirectoryHandle('meta'), f = await m.getFileHandle('d_store.json');
      const j = JSON.parse(dec.decode(new Uint8Array(await (await f.getFile()).arrayBuffer())));
      return j && j.app === APP ? 'ok' : 'notstore';
    } catch (e) {
      if (e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError' || e instanceof SyntaxError)) return 'notstore';
      return 'error: ' + ((e && ((e.name ? e.name + ': ' : '') + (e.message || ''))) || String(e));
    }
  }
  async function createStore(dir, by) {
    const m = await dir.getDirectoryHandle('meta', { create: true }), f = await m.getFileHandle('d_store.json', { create: true });
    const w = await f.createWritable(); await w.write(enc.encode(JSON.stringify({ app: APP, v: 1, created: new Date().toISOString(), by: by || '' }))); await w.close();
  }
  async function permission(dir, ask) {
    try {
      const o = { mode: 'readwrite' };
      if ((await dir.queryPermission(o)) === 'granted') return true;
      if (!ask) return false;
      return (await dir.requestPermission(o)) === 'granted';
    } catch (e) { return false; }
  }
  async function pick() { return window.showDirectoryPicker({ id: 'mc-data', mode: 'readwrite' }); }
  return { supported, folderDb, inspect, check, createStore, permission, pick, remembered: () => kvGet('folder'), remember: h => kvSet('folder', h), forget: () => kvDel('folder'), Keys, b64e, b64d };
})();
