// ---------------------------------------------------------------- accounts and roles
// Accounts live with the data: in the shared folder, with the online page, or in this browser for a file opened on its own.
// Sign-in is by username. Roles: admin, WFM analyst, WFM manager, senior manager, supervisor, quality team, agent; new
// accounts wait for one. In the shared folder the role is backed by keys: a staff account holds the team's data key, an
// agent's account only that agent's key, both locked with the person's password, so a file read outside the tool is noise.
const Auth = (() => {
  const ITER = 600000;
  const WORDS = ['password', 'passwort', 'beyondone', 'beyond', 'qwerty', 'azerty', 'asdf', 'zxcv', 'admin', 'welcome', 'letmein', 'iloveyou', 'monkey', 'dragon', 'football',
    'workforce', 'wfm', 'membercare', 'member', 'virgin', 'friendi', 'genesys', 'riyadh', 'jeddah', 'saudi', 'ksa', 'report', 'builder', 'monthly', 'login', 'secret', 'changeme'];
  const TEAM = (() => { try { const el = document.getElementById('team-config'); const t = el ? JSON.parse(el.textContent) : null; return t && Array.isArray(t.admins) ? t : null; } catch (e) { return null; } })();
  let db = null, user = null, mode = 'loading', lastActive = Date.now(), count = 0, pending = null, userOnly = true;
  let ring = null;            // shared folder: { priv, kek, dk, ak: Map } once signed in
  let connectCb = null;       // shared folder: what the connect screen's buttons do
  const readyFns = [];        // run once the signed-in person's data can be read
  const enc = new TextEncoder();
  const b64e = u8 => btoa(String.fromCharCode(...u8)), b64d = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* memory only */ } } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* none */ } } };
  const normEmail = e => normSpace(e).toLowerCase();
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  // usernames: lower-case, 3-32 of a-z 0-9 . _ - (never an @, so a sign-in name is told apart from an email)
  const normUser = u => normSpace(u).toLowerCase();
  const validUser = u => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u);
  function userProblem(u) {
    if (!u) return 'Pick a username.';
    if (u.includes('@')) return 'A username cannot be an email. Pick a short name, like ahmed.k or team-lead2.';
    if (!validUser(u)) return 'A username is 3 to 32 letters or numbers; dots, dashes and underscores are fine. No spaces.';
    return '';
  }
  const PWF = ['algo', 'iter', 'salt', 'hash', 'pwSetAt'];
  const ROLES = ['admin', 'user', 'wfm', 'senior', 'spv', 'quality', 'agent', 'pending'];
  const STAFF = new Set(['admin', 'user', 'wfm', 'senior', 'spv', 'quality']);
  const KINDS = [['agent', 'An agent'], ['spv', 'A supervisor or team lead'], ['quality', 'In the Quality team'], ['wfm', 'In the WFM team'], ['senior', 'The senior manager'], ['other', 'Someone else']];
  const folder = () => !!(db && db.folder);
  const rid = () => 'a' + [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, '0')).join('');

  // ---- storage: one record per account, plus a directory entry (role, person) that only staff can change
  async function legacyId(email) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(normEmail(email)))); return 'u' + [...h.slice(0, 12)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const builtInOf = a => (TEAM && a ? TEAM.admins.find(b => (a.email && b.email && normEmail(b.email) === normEmail(a.email)) || (a.username && b.username && normUser(b.username) === normUser(a.username))) || null : null);
  function merge(local, bi) {
    if (!bi) return local;
    const usePw = local && local.hash && String(local.pwSetAt || '') >= String(bi.pwSetAt || '') ? local : bi;
    const out = { ...(local || {}), email: bi.email ? normEmail(bi.email) : (local && local.email) || '', name: (local && local.name) || bi.name, role: 'admin', builtIn: true, disabled: false, createdAt: (local && local.createdAt) || bi.createdAt };
    PWF.forEach(k => { out[k] = usePw[k]; }); out.mustChange = usePw === local ? !!local.mustChange : false;
    if (!out.username && bi.username) out.username = bi.username;
    return out;
  }
  let acctCache = null;
  async function listRaw() {
    const snap = await db.collection('accounts').get();
    const out = [];
    for (const d of snap.docs) { const a = d.data(); if (a && (a.username || a.email)) out.push({ ...a, id: d.id }); }
    return out;
  }
  async function listAccts() {
    const local = await listRaw();
    const out = local.map(a => merge(a, builtInOf(a)));
    if (TEAM) for (const b of TEAM.admins) if (!local.some(a => builtInOf(a) === b)) out.push({ ...merge(null, b), id: b.email ? await legacyId(b.email) : 'b' + normUser(b.username) });
    acctCache = out;
    return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }
  async function getAcct(id) { const all = await listAccts(); return all.find(a => a.id === id) || null; }
  async function putAcct(a) {
    const { builtIn, id, role, pid, fp, ...rec } = a;
    const keep = folder() ? {} : { ...(role ? { role } : {}), ...(pid ? { pid } : {}) };   // outside the shared folder the role stays on the account
    await db.doc('accounts/' + id).set({ ...rec, ...keep });
  }
  async function delAcct(id) { await db.doc('accounts/' + id).delete(); try { await db.doc('dir/' + id).delete(); } catch (e) { /* none */ } }
  async function readDir(id) { try { const s = await db.doc('dir/' + id).get(); return s.exists ? s.data() : null; } catch (e) { return null; } }
  async function dirAll() { try { const s = await db.collection('dir').get(); return new Map(s.docs.map(d => [d.id, d.data()])); } catch (e) { return new Map(); } }
  async function writeDir(id, body) { await db.doc('dir/' + id).set({ ...body, by: user ? user.name : '', at: new Date().toISOString() }); }
  /** the role and linked person an account really has */
  function effective(a, D) {
    if (!a) return null;
    if (a.builtIn) return { ...a, role: 'admin', pid: (D && D.pid) || a.pid || '' };
    if (D) return { ...a, role: ROLES.includes(D.role) ? D.role : 'pending', pid: D.pid || '', fp: D.fp || '' };
    if (folder()) return { ...a, role: 'pending', pid: '' };
    return { ...a, role: ROLES.includes(a.role) ? a.role : 'pending', pid: a.pid || '' };
  }
  async function peopleAll() { const [all, D] = await Promise.all([listAccts(), dirAll()]); return all.map(a => effective(a, D.get(a.id))); }
  // what was typed on the sign-in screen -> the account, plus the key its wrong tries are counted under
  async function findAcct(typed) {
    if (db && db.poll) await db.poll().catch(() => {});   // the shared folder: an account made a moment ago in another window
    const all = await listAccts();
    if (typed.includes('@')) { const a = all.find(x => x.email && normEmail(x.email) === typed) || null; return { a, key: typed }; }
    const a = all.find(x => x.username && normUser(x.username) === typed) || null;
    return { a, key: 'user:' + typed };
  }
  async function usernameTaken(u, id) { return (await listAccts()).some(x => x.username && normUser(x.username) === u && x.id !== id); }
  async function loadSignin() {
    try { const s = await db.doc(folder() ? 'meta/signin' : 'config/signin').get(); userOnly = s.exists ? !!(s.data() || {}).usernameOnly : (folder() || !!(TEAM && TEAM.usernameOnly)); }
    catch (e) { userOnly = folder() || !!(TEAM && TEAM.usernameOnly); }
  }
  async function derive(pw, salt, iter, bits) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, bits || 256));
  }
  /** the password check; in the shared folder it also gives the key that unlocks the person's own keys (the second half) */
  async function verify(a, pw) {
    const bits = folder() ? 512 : 256;
    if (!a || !a.hash) { await derive(pw || '-', new Uint8Array(16), ITER, bits); return { ok: false }; }   // same wait as a real check
    const out = await derive(pw, b64d(a.salt), a.iter || ITER, bits), h = b64e(out.slice(0, 32));
    let diff = h.length ^ a.hash.length; for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ (a.hash.charCodeAt(i) || 0);
    return { ok: diff === 0, kek: bits === 512 ? out.slice(32) : null };
  }
  async function withPassword(a, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), out = await derive(pw, salt, ITER, folder() ? 512 : 256);
    return { rec: { ...a, algo: 'PBKDF2-SHA256', iter: ITER, salt: b64e(salt), hash: b64e(out.slice(0, 32)), pwSetAt: new Date().toISOString() }, kek: folder() ? out.slice(32) : null };
  }
  // ---- password rules
  const unleet = x => x.toLowerCase().replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/[^a-z0-9]/g, '');
  function hasRun(pw) {
    const x = pw.toLowerCase(); if (/(.)\1\1/.test(x)) return true;
    for (let i = 0; i + 3 < x.length; i++) {
      const c = [0, 1, 2, 3].map(k => x.charCodeAt(i + k));
      if (/^[a-z0-9]{4}$/.test(x.slice(i, i + 4)) && ((c[1] - c[0] === 1 && c[2] - c[1] === 1 && c[3] - c[2] === 1) || (c[0] - c[1] === 1 && c[1] - c[2] === 1 && c[2] - c[3] === 1))) return true;
    }
    return false;
  }
  function check(pw) {
    const u = unleet(pw), plain = pw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const word = WORDS.find(w => u.includes(w) || plain.includes(w));
    const rules = [
      ['len', 'At least 8 characters', pw.length >= 8],
      ['case', 'Upper-case and lower-case letters', /[A-Z]/.test(pw) && /[a-z]/.test(pw)],
      ['num', 'At least one number', /\d/.test(pw)],
      ['sym', 'At least one symbol, like ! # % or ?', /[^A-Za-z0-9\s]/.test(pw)],
      ['word', word ? `No common or company words (found "${word}")` : 'No common or company words, like password or beyond', !!pw && !word],
      ['run', 'No repeats or runs, like aaa or 1234', !!pw && !hasRun(pw)],
    ];
    let pool = 0; if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/\d/.test(pw)) pool += 10; if (/[^A-Za-z0-9]/.test(pw)) pool += 33; if (/[^\x00-\x7f]/.test(pw)) pool += 60;
    let bits = pool ? Math.min(pw.length, new Set(pw).size * 2) * Math.log2(pool) : 0;
    if (word) bits *= 0.5; if (hasRun(pw)) bits *= 0.7;
    const ok = rules.every(r => r[2]);
    const level = !pw ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 || !ok ? 3 : 4;
    return { rules, ok, level, label: !pw ? 'Strength: none yet' : ['', 'Strength: weak', 'Strength: fair', ok ? 'Strength: good' : 'Strength: not there yet', 'Strength: strong'][level] };
  }
  function tempPassword() {
    const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '#%?!@$&*+='];
    for (;;) {
      const r = crypto.getRandomValues(new Uint32Array(12)), chars = [...r].map((x, i) => { const s = sets[i < 4 ? i : x % 4]; return s[x % s.length]; });
      for (let i = chars.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
      const pw = chars.join(''); if (check(pw).ok) return pw;
    }
  }
  // ---- wrong-try limits (per account, on this device)
  const failsOf = e => { try { return (JSON.parse(ls.get('wf-fails') || '{}'))[e] || { n: 0, until: 0 }; } catch (x) { return { n: 0, until: 0 }; } };
  const setFails = (e, v) => { let all = {}; try { all = JSON.parse(ls.get('wf-fails') || '{}') || {}; } catch (x) { all = {}; } if (v) all[e] = v; else delete all[e]; ls.set('wf-fails', JSON.stringify(all)); };

  // ---- keys (shared folder only)
  const K = () => FolderStore.Keys;
  /** after a good password: open (or make) the person's own key pair, then the data key and agent keys granted to it */
  async function openKeys(a, kek) {
    let priv = null, rec = a, changed = false;
    if (a.pub && a.priv) { try { priv = await K().openPriv(a.priv, kek); } catch (e) { priv = null; } }
    if (!priv) {   // first sign-in in the shared folder, or a password reset: a new pair; earlier grants were for the old one
      const pair = await K().newPair();
      rec = { ...a, pub: await K().pubOut(pair.publicKey), priv: await K().sealPriv(pair.privateKey, kek), keysAt: new Date().toISOString(), grants: {} };
      priv = pair.privateKey; changed = true;
    }
    const r = { priv, kek, dk: null, ak: new Map(), fp: await K().fp(rec.pub) };
    const g = rec.grants || {};
    if (g.dk && g.dk.w) { try { r.dk = await K().unwrapWith(priv, g.dk.w); } catch (e) { r.dk = null; } }
    for (const [p, w] of Object.entries(g.ak || {})) { try { r.ak.set(p, await K().unwrapWith(priv, w)); } catch (e) { /* stale */ } }
    return { ring: r, rec, changed };
  }
  /** the very first admin of a new shared folder makes the team's data key */
  async function bootstrapDataKey(a) {
    const meta = await db.doc('meta/keys').get();
    if (meta.exists) return null;
    const dk = await K().newAes();
    await db.doc('meta/keys').set({ v: 1, made: new Date().toISOString(), by: a.name });
    return dk;
  }
  async function grantStaff(a) {   // a: an account with .pub; needs the data key in this session
    if (!ring || !ring.dk || !a.pub) return a;
    return { ...a, grants: { ...(a.grants || {}), dk: { tag: 'dk1', w: await K().wrapFor(a.pub, ring.dk) } } };
  }
  async function grantAgent(a, pid) {
    if (!a.pub) return a;
    const k = await db.agentKey(pid);
    return { ...a, grants: { ...(a.grants || {}), ak: { [pid]: await K().wrapFor(a.pub, k) } } };
  }
  const noGrants = a => ({ ...a, grants: {} });

  // ---- screens
  const val = id => $(id).value;
  const isAdmin = () => !!user && user.role === 'admin';
  const lockMins = () => (user && [5, 15, 30, 60].includes(user.lockMins) ? user.lockMins : 15);
  const first = n => esc(String(n || '').split(' ')[0]);
  function showForm(on) { document.querySelectorAll('#lockForm .field, #pwCheck').forEach(el => { if (!on) el.hidden = true; }); }
  function setMode(m, msg) {
    mode = m;
    if (m !== 'loading' && window.__mcBoot) window.__mcBoot.ok = true;   // the start guard: the first screen is here
    $('lock').hidden = m === 'open';
    for (const n of ['.appbar', '#main']) { const x = document.querySelector(n); if (m === 'open') { x.removeAttribute('inert'); x.removeAttribute('aria-hidden'); } else { x.setAttribute('inert', ''); x.setAttribute('aria-hidden', 'true'); } }
    renderUser();
    if (m === 'open') return;
    closeDrawer(); $('acctMenu').hidden = true;
    const local = db && db.local, p = pending || user, idOf = a => (a ? a.username || a.email : '');
    const where = folder() ? `Accounts are saved in the shared folder (${esc(db.name)}).` : local ? 'Accounts are saved in this browser on this computer.' : 'Accounts are saved with this page.';
    const T = {
      loading: ['Loading…', '', ''],
      connect: connectText(),
      signin: ['Sign in', userOnly ? 'Use your username and password.' : 'Use your username (or the email of an older account) and your password.', where + ' Someone new here? Create an account.'],
      create: [count ? 'Create your account' : 'Create the admin account',
        count ? 'Pick a username to sign in with. Your admin, or your supervisor if you are an agent, then opens your access.' : 'This is the first account here, so it becomes the admin. Admins manage the other accounts.',
        'Your password is never saved, only a scrambled version of it.' + (folder() ? ' It also locks your own key to the shared data.' : local ? ' The account is saved in this browser on this computer.' : '')],
      unlock: [`Welcome back, ${user ? first(user.name) : ''}`, user ? `Signed in as ${idOf(user)}. Locked after ${lockMins()} minutes without activity.` : '', ''],
      change: ['Change password', user ? `For ${idOf(user)}. Type your current password, then the new one.` : '', 'Your password is never saved, only a scrambled version of it.'],
      mustchange: ['Choose a new password', p ? `Your admin gave ${idOf(p)} a temporary password. Choose your own to continue.` : '', folder() ? 'After a reset, your admin or supervisor opens your access to the data again.' : 'Your password is never saved, only a scrambled version of it.'],
      username: [p && p.username ? 'Change your username' : 'Choose a username',
        p && p.username ? `Your username now is ${p.username}.` : 'Pick a username to sign in with from now on.',
        userOnly ? 'This tool signs in with usernames only.' : 'You can still sign in with your email too, unless your admin turns that off.'],
      forgot: ['Forgot your password?', '', ''],
    }[m];
    // a browser without the shared folder (Firefox, Safari, or Chrome/Edge with it turned off): say so, or people start over here
    const noFolder = local && !window.__NOFOLDER__ && !FolderStore.supported() && (m === 'signin' || m === 'create');
    $('lockTitle').innerHTML = T[0]; $('lockSub').innerHTML = (noFolder ? '<b class="warnt">This browser cannot open the shared data folder.</b> Open this file in Microsoft Edge or Google Chrome to work with your team\'s data; what you do in this browser stays in this browser. ' : '') + T[1]; $('lockFoot').innerHTML = T[2];
    $('fName').hidden = m !== 'create';
    $('fUser').hidden = !(m === 'create' || m === 'username');
    $('fKind').hidden = !(m === 'create' && count);
    $('fSpv').hidden = !(m === 'create' && count && $('acKind').value === 'agent');
    $('fEmail').hidden = !(m === 'signin' || m === 'forgot');
    $('acEmailLbl').textContent = userOnly ? 'Username' : 'Username or email';
    const ae = $('acEmail'); ae.type = 'text'; ae.autocomplete = 'username'; ae.inputMode = 'text';
    $('fCur').hidden = !(m === 'signin' || m === 'unlock' || m === 'change');
    $('pwCurLbl').textContent = m === 'change' ? 'Current password' : 'Password';
    $('fNew').hidden = $('pwCheck').hidden = $('fConf').hidden = !(m === 'create' || m === 'change' || m === 'mustchange');
    $('pwNewLbl').textContent = m === 'create' ? 'Password' : 'New password';
    document.querySelector('label[for="pwConf"]').textContent = m === 'create' ? 'Type the password again' : 'Type the new password again';
    $('lockGo').hidden = m === 'loading' || m === 'connect';
    $('lockGo').className = 'btn lg primary';
    $('lockGo').textContent = { signin: 'Sign in', create: 'Create account', unlock: 'Unlock', change: 'Change password', mustchange: 'Save and continue', username: pending ? 'Save and continue' : 'Save username', forgot: 'Back to sign in' }[m] || '';
    $('lockCancel').hidden = !(m === 'change' || (m === 'username' && !pending));
    $('lockLinks').innerHTML = m === 'connect' ? connectLinks() : ({
      signin: '<button type="button" class="linkbtn" data-go="create">Create an account</button><button type="button" class="linkbtn" data-go="forgot">Forgot password?</button>',
      create: count ? '<button type="button" class="linkbtn" data-go="signin">I already have an account</button>' : '',
      unlock: '<button type="button" class="linkbtn" data-go="out">Sign in as someone else</button>',
      mustchange: '<button type="button" class="linkbtn" data-go="out">Cancel and sign out</button>',
      username: pending && !userOnly ? '<button type="button" class="linkbtn" data-go="skipuser">Not now</button>' : '',
    }[m] || '') + (folder() && (m === 'signin' || m === 'create') ? '<button type="button" class="linkbtn" data-go="folder">Change the data folder</button>' : '');
    $('lockConnect').hidden = m !== 'connect';
    if (m === 'connect') $('lockConnect').innerHTML = connectBody();
    if (m === 'forgot') $('lockSub').textContent = (local
      ? 'There is no server to email a reset link. Ask your admin to sign in on this computer and reset your password from Manage accounts. You then choose a new one when you sign in.'
      : 'Ask your admin to reset your password from Manage accounts. You then choose a new one when you sign in.') + ' Forgot your username? Your admin can see it in Manage accounts.';
    ['pwCur', 'pwNew', 'pwConf'].forEach(id => { $(id).value = ''; $(id).type = 'password'; });
    if (m !== 'forgot' && m !== 'signin') $('acEmail').value = '';
    if (m === 'create') { $('acName').value = ''; $('acKind').value = 'agent'; fillSpvChoices(); }
    if (m === 'create' || m === 'username') $('acUser').value = m === 'username' && p ? p.username || '' : '';
    if (m === 'create') { $('fKind').hidden = !count; $('fSpv').hidden = !count || $('acKind').value !== 'agent'; }
    document.querySelectorAll('[data-show]').forEach(b => { b.textContent = 'Show'; b.setAttribute('aria-label', 'Show password'); });
    $('lockErr').textContent = msg || '';
    renderRules();
    setTimeout(() => {
      const f = m === 'create' ? $('acName') : m === 'username' ? $('acUser') : m === 'signin' ? ($('acEmail').value ? $('pwCur') : $('acEmail')) : (m === 'unlock' || m === 'change') ? $('pwCur') : m === 'mustchange' ? $('pwNew') : m === 'connect' ? $('lockConnect').querySelector('button') : null;
      const now = document.activeElement;   // never pull the cursor out of a box the person already went to
      if (f && !(now && now !== f && now.matches('#lockForm input:not([hidden])'))) f.focus();
    }, 30);
  }
  // the shared folder's first screen: pick it, or allow it again
  function connectText() {
    const c = connectCb || {};
    if (c.state === 'again') return ['Open the shared data', `The tool keeps its data in the folder <b>${esc(c.name || '')}</b>. Your browser asks once per visit before the tool may open it.`, 'Nothing leaves your computer and the shared folder.'];
    if (c.state === 'empty') return ['Set up the shared data here?', `<b>${esc(c.name || '')}</b> is empty. The tool can keep everyone's data in it, locked so it can only be read through the tool.`, 'Put the folder next to the HTML in the common folder, so everyone finds it.'];
    if (c.state === 'other') return ['This is not the data folder', `<b>${esc(c.name || '')}</b> has other files in it (the common folder?). The tool can make its data folder, <b>MC Data</b>, inside it, or you can choose the data folder itself.`, ''];
    return ['Connect the shared data', 'Choose the data folder that sits next to this HTML in the common folder (for example <b>MC Data</b>). Everyone who opens the tool from the common folder then works on the same data.', 'Works in Microsoft Edge and Google Chrome. The data files are locked: only accounts made in the tool can read them.'];
  }
  function connectBody() {
    const c = connectCb || {};
    return c.state === 'again' ? '<button type="button" class="btn lg primary" data-conn="again">Open the shared data</button>'
      : c.state === 'empty' ? '<button type="button" class="btn lg primary" data-conn="create">Set up the shared data here</button><button type="button" class="btn" data-conn="pick">Choose another folder</button>'
      : c.state === 'other' ? '<button type="button" class="btn lg primary" data-conn="makesub">Make an "MC Data" folder in it</button><button type="button" class="btn" data-conn="pick">Choose another folder</button>'
      : '<button type="button" class="btn lg primary" data-conn="pick">Choose the data folder</button>';
  }
  const connectLinks = () => '<button type="button" class="linkbtn" data-conn="local">Use this computer only</button>' + ((connectCb || {}).state === 'again' ? '<button type="button" class="linkbtn" data-conn="pick">Choose a different folder</button>' : '');
  function connect(o) { connectCb = o; setMode('connect', o.msg || ''); }
  async function fillSpvChoices() {
    const sel = $('acSpv'); if (!sel) return;
    let L = [];
    try { const s = await db.doc(folder() ? 'meta/supervisors' : 'config/supervisors').get(); L = s.exists ? (s.data().list || []) : []; } catch (e) { L = []; }
    sel.innerHTML = '<option value="">I am not sure</option>' + L.map(x => `<option value="${esc(x.pid)}">${esc(x.name)}</option>`).join('');
  }
  function renderRules() {
    if ($('pwCheck').hidden) return;
    const c = check(val('pwNew'));
    $('pwMeter').dataset.l = c.level; $('pwLevel').textContent = c.label;
    $('pwRules').innerHTML = c.rules.map(([id, label, ok]) => `<li class="${ok ? 'ok' : ''}"><span class="ck ${ok ? 'ok' : 'no'}" aria-hidden="true">${ok ? '<svg width="11" height="11"><use href="#i-check"/></svg>' : '<svg width="11" height="11"><use href="#i-dash"/></svg>'}</span><span>${esc(label)}<span class="sr">${ok ? ': done' : ': not yet'}</span></span></li>`).join('');
    return c;
  }
  function renderUser() {
    const on = !!user && mode === 'open';
    $('acctBtn').hidden = !on;
    if (!user) { if (mode === 'open') applyRole(); return; }   // no sign-in in this view: every workspace
    const ini = String(user.name || '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || String(user.username || '?')[0].toUpperCase();
    const role = ROLE_NAME[user.role] || 'User';
    $('acctInit').textContent = ini; $('acctBtn').classList.toggle('admin', isAdmin());
    $('acctSr').textContent = `Account: ${user.name}, ${role}`; $('acctName').textContent = user.name; $('acctEmail').textContent = user.username || user.email || '';
    $('acctRole').textContent = role; $('acctRole').className = 'pill ' + (isAdmin() ? 'info' : '');
    $('acctBtn').title = `${user.name} (${user.username || user.email}) - ${role}`;
    $('acctUserBtn').textContent = user.username ? 'Change username' : 'Choose a username';
    $('acctMenu').querySelector('[data-acct="accounts"]').hidden = !isAdmin();
    if (on) applyRole();
  }
  function busy(on, label) { const b = $('lockGo'); b.disabled = on; if (on) { b.dataset.l = b.textContent; b.innerHTML = `<span class="spin" aria-hidden="true"></span>${label}`; } else if (b.dataset.l) b.textContent = b.dataset.l; }
  // in the shared folder a failed read is an error, never "no accounts yet" (that would offer to create a new admin)
  async function countAccounts() { try { count = (await listAccts()).length; } catch (e) { count = 0; if (folder()) throw e; } }
  let readyDone = false;
  async function signedIn(a) {
    user = a; pending = null; ss.set('wf-session', a.id); lastActive = Date.now();
    if (!readyDone) { readyDone = true; for (const f of readyFns) { try { await f(info()); } catch (e) { console.error(e); } } }
    setMode('open');
  }
  const info = () => (user ? { id: user.id, role: user.role, pid: user.pid, staff: STAFF.has(user.role), agentPids: ring ? [...ring.ak.keys()] : [] } : null);
  // after a good password on the sign-in screen: an account without a username is asked for one first
  function proceed(a, hello) { if (!a.username) { pending = a; setMode('username'); return; } signedIn(a); if (hello) toast(hello); }
  /** shared folder: everything that follows a good password (keys, the data key for the first admin, the role) */
  async function afterPassword(a, kek) {
    if (!folder()) { const D = await readDir(a.id); return effective(a, D); }
    const o = await openKeys(a, kek); let rec = o.rec; ring = o.ring;
    if (!ring.dk && (a.builtIn || count <= 1)) {   // the first admin, or an admin built into this HTML: make or claim the data key
      const dk = await bootstrapDataKey(rec);
      if (dk) { ring.dk = dk; rec = { ...rec, grants: { ...(rec.grants || {}), dk: { tag: 'dk1', w: await K().wrapFor(rec.pub, dk) } } }; o.changed = true; }
    }
    await putAcct(rec);   // the sign-in time, and any new key pair or data-key grant (never the old copy over the new keys)
    db.unlock({ dk: ring.dk, ak: ring.ak });
    let D = null;
    if (ring.dk) {
      D = await readDir(rec.id);
      if (!D && (rec.builtIn || count <= 1)) { D = { role: 'admin', pid: '', fp: ring.fp }; await writeDir(rec.id, D); }
      if (D && !D.fp) { D = { ...D, fp: ring.fp }; await writeDir(rec.id, D); }
    }
    let eff = effective(rec, D);
    if (!ring.dk) { const pids = [...ring.ak.keys()]; eff = pids.length ? { ...rec, role: 'agent', pid: pids[0] } : { ...rec, role: 'pending', pid: '' }; }
    return eff;
  }
  async function submit() {
    const err = t => { $('lockErr').textContent = t; };
    if (mode === 'signin' || mode === 'unlock') {
      const typed = mode === 'unlock' ? '' : normUser(val('acEmail')), byMail = typed.includes('@');
      const what = byMail ? 'email' : 'username';
      if (mode === 'signin') {
        if (!typed) { err(userOnly ? 'Type your username.' : 'Type your username or email.'); $('acEmail').focus(); return; }
        if (byMail && userOnly) { err('Sign in with your username. No username yet? Ask your admin.'); $('acEmail').focus(); return; }
        if (byMail ? !validEmail(typed) : !validUser(typed)) { err(byMail ? 'Type your username, or the email of an older account.' : 'Usernames are 3 to 32 letters or numbers, with no spaces. Check what you typed.'); $('acEmail').focus(); return; }
      }
      if (!val('pwCur')) { err('Type your password.'); $('pwCur').focus(); return; }
      busy(true, 'Checking…');
      let a = null, ok = false, kek = null, key = typed;
      try { ({ a, key } = mode === 'unlock' ? { a: await getAcct(user.id), key: 'id:' + user.id } : await findAcct(typed)); } catch (e) { busy(false); err('Could not check the password (' + ((e && e.code) || 'error') + '). Try again.'); return; }
      const f = failsOf(key), left = Math.ceil((f.until - Date.now()) / 1000);
      if (left > 0) { busy(false); err(`Too many wrong tries. Wait ${left} seconds, then try again.`); return; }
      try { ({ ok, kek } = await verify(a, val('pwCur'))); } catch (e) { busy(false); err('Could not check the password (' + ((e && e.code) || 'error') + '). Try again.'); return; }
      if (ok) {
        setFails(key, null);
        if (a.disabled) { busy(false); user = null; ss.set('wf-session', null); setMode('signin', 'This account is turned off. Ask your admin to turn it back on.'); $('acEmail').value = typed; return; }
        if (mode === 'unlock' && ring) { busy(false); signedIn(user); return; }   // the keys are still open in this window
        const upd = { ...a, lastLogin: new Date().toISOString() };
        if (upd.mustChange) { busy(false); pending = upd; pending._kek = kek; setMode('mustchange'); return; }
        let eff;
        try { eff = await afterPassword(upd, kek); if (!folder()) putAcct({ ...eff, ...pickRec(upd) }).catch(() => {}); }
        catch (e) { busy(false); err('Could not open your access (' + ((e && e.code) || (e && e.message) || 'error') + '). Try again.'); return; }
        busy(false);
        if (mode === 'unlock') { signedIn(eff); return; }
        proceed(eff, `Signed in as ${eff.name}${eff.role === 'admin' ? ' (admin)' : ''}`); return;
      }
      busy(false);
      const n = f.n + 1, until = n >= 5 ? Date.now() + Math.min(300, 30 * 2 ** (n - 5)) * 1000 : 0; setFails(key, { n, until });
      $('pwCur').value = ''; $('pwCur').focus();
      err(n >= 5 ? `The ${what} or password is not right. Wait ${Math.ceil((until - Date.now()) / 1000)} seconds before the next try.`
        : `The ${what} or password is not right. ${5 - n} ${5 - n === 1 ? 'try' : 'tries'} left before a short wait.`);
      return;
    }
    if (mode === 'create') {
      const name = normSpace(val('acName')), uname = normUser(val('acUser')), kind = count ? val('acKind') : 'admin', wantSpv = kind === 'agent' ? val('acSpv') : '';
      if (name.length < 2) { err('Type your full name.'); $('acName').focus(); return; }
      const up = userProblem(uname); if (up) { err(up); $('acUser').focus(); return; }
      if (!check(val('pwNew')).ok) { err('The password does not meet every rule below yet.'); $('pwNew').focus(); return; }
      if (val('pwNew') !== val('pwConf')) { err('The two passwords are not the same.'); $('pwConf').focus(); return; }
      busy(true, 'Creating…');
      try {
        if (await usernameTaken(uname)) { busy(false); err('This username is taken. Pick another one.'); $('acUser').focus(); return; }
        if (TEAM && TEAM.admins.some(b => b.username && normUser(b.username) === uname)) { busy(false); err('This username belongs to the admin of this tool. Sign in instead.'); return; }
        const all = await listAccts(), isFirst = !all.some(x => x.role === 'admin' || x.builtIn) && !all.length;
        const base = { v: 4, id: rid(), username: uname, name, kind: isFirst ? 'admin' : kind, ...(wantSpv ? { wantSpv } : {}), lockMins: 15, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() };
        const { rec, kek } = await withPassword(base, val('pwNew'));
        let a = { ...rec, role: isFirst ? 'admin' : 'pending' };
        if (folder()) {
          count = all.length + 1;
          await putAcct(a);
          a = await afterPassword(a, kek);
        } else {
          await putAcct(a);
          if (isFirst) await writeDir(a.id, { role: 'admin', pid: '' }).catch(() => {});
        }
        count = all.length + 1; busy(false); signedIn(a);
        toast(a.role === 'admin' ? `Admin account created. Welcome, ${name.split(' ')[0]}. Sign in next time as ${uname}.` : `Account created. ${kind === 'agent' ? 'Your supervisor' : 'Your admin'} now opens your access. Sign in next time as ${uname}.`);
      } catch (e) { busy(false); err(e && e.code === 'permission_denied' ? 'This view cannot add accounts.' : 'The account could not be saved (' + ((e && e.code) || (e && e.message) || 'error') + '). Try again.'); }
      return;
    }
    if (mode === 'username') {
      const who = pending || user, uname = normUser(val('acUser'));
      if (!who) { setMode('signin'); return; }
      const up = userProblem(uname); if (up) { err(up); $('acUser').focus(); return; }
      if (uname === normUser(who.username || '')) { if (pending) signedIn(who); else setMode('open'); return; }
      busy(true, 'Saving…');
      try {
        if (await usernameTaken(uname, who.id)) { busy(false); err('This username is taken. Pick another one.'); $('acUser').focus(); return; }
        const a = { ...who, username: uname }; await putAcct(a); busy(false);
        if (pending) { signedIn(a); toast(`Username saved. Welcome, ${String(a.name || '').split(' ')[0]}. Next time sign in as ${uname}.`); }
        else { user = a; setMode('open'); toast(`Your username is now ${uname}`); }
      } catch (e) { busy(false); err('The username could not be saved (' + ((e && e.code) || 'error') + '). Try again.'); }
      return;
    }
    if (mode === 'change' || mode === 'mustchange') {
      const who = mode === 'change' ? user : pending;
      if (mode === 'change') {
        busy(true, 'Checking…'); const r = await verify(await getAcct(who.id), val('pwCur')); busy(false);
        if (!r.ok) { err('The current password is not right.'); $('pwCur').focus(); return; }
        if (val('pwNew') === val('pwCur')) { err('Choose a new password, not the current one.'); $('pwNew').focus(); return; }
      } else { busy(true, 'Checking…'); const same = await verify(await getAcct(who.id), val('pwNew')); busy(false); if (same.ok) { err('Choose your own password, not the temporary one.'); $('pwNew').focus(); return; } }
      if (!check(val('pwNew')).ok) { err('The new password does not meet every rule below yet.'); $('pwNew').focus(); return; }
      if (val('pwNew') !== val('pwConf')) { err('The two new passwords are not the same.'); $('pwConf').focus(); return; }
      busy(true, 'Saving…');
      try {
        const stored = await getAcct(who.id), { rec, kek } = await withPassword({ ...stored, mustChange: false }, val('pwNew'));
        let a = rec;
        if (folder()) {
          if (mode === 'change' && ring && ring.priv) a = { ...a, priv: await K().sealPriv(ring.priv, kek) };   // same keys, locked with the new password
          else a = { ...a, pub: '', priv: null, grants: {} };   // after a reset the old keys cannot be opened: new ones, and the access is opened again
          await putAcct(a);
          if (mode === 'mustchange') { const eff = await afterPassword(a, kek); busy(false); proceed(eff, `Password saved. Welcome, ${a.name.split(' ')[0]}.`); return; }
          busy(false); user = { ...user, ...pickRec(a) }; setMode('open'); toast('Password changed'); return;
        }
        await putAcct({ ...a, role: who.role, pid: who.pid }); busy(false);
        if (mode === 'mustchange') proceed(effective(a, await readDir(a.id)), `Password saved. Welcome, ${a.name.split(' ')[0]}.`); else { user = { ...user, ...pickRec(a) }; setMode('open'); toast('Password changed'); }
      } catch (e) { busy(false); err('The password could not be saved (' + ((e && e.code) || 'error') + '). Try again.'); }
      return;
    }
    if (mode === 'forgot') setMode('signin');
  }
  const pickRec = a => { const out = {}; for (const k of [...PWF, 'mustChange', 'pub', 'priv', 'grants', 'keysAt', 'lastLogin', 'username', 'lockMins']) if (k in a) out[k] = a[k]; return out; };
  function lock() { if (!user || mode !== 'open') return; commitActive(); setMode('unlock'); }
  /** the signed-in person's role or team changed elsewhere (the admin edited it): follow it without signing out */
  async function refreshMe() {
    if (!user || !db) return;
    try {
      const a = await getAcct(user.id); if (!a) return;
      if (a.disabled) { signOut(); return; }
      let eff;
      if (folder()) {
        if (ring && !ring.dk && a.grants && a.grants.dk) { try { ring.dk = await K().unwrapWith(ring.priv, a.grants.dk.w); db.unlock({ dk: ring.dk }); toast('Your access is open. Loading the data…'); setTimeout(() => location.reload(), 900); return; } catch (e) { /* not for this key */ } }
        if (ring && a.grants && a.grants.ak) for (const [p, w] of Object.entries(a.grants.ak)) if (!ring.ak.has(p)) { try { ring.ak.set(p, await K().unwrapWith(ring.priv, w)); db.unlock({ ak: ring.ak }); toast('Your access is open. Loading your results…'); setTimeout(() => location.reload(), 900); return; } catch (e) { /* none */ } }
        eff = ring && ring.dk ? effective(a, await readDir(a.id)) : user;
      } else eff = effective(a, await readDir(a.id));
      const changed = eff.role !== user.role || eff.pid !== user.pid || JSON.stringify(eff.scope || {}) !== JSON.stringify(user.scope || {}) || eff.name !== user.name;
      user = { ...user, role: eff.role, pid: eff.pid, scope: eff.scope, name: eff.name, username: eff.username };
      if (changed && mode === 'open') renderUser();
    } catch (e) { /* stays as it is */ }
  }
  async function signOut() {
    commitActive(); ss.set('wf-session', null);
    if (folder() || ring) { location.reload(); return; }   // the data stays only in the signed-in window
    user = null; pending = null; await countAccounts(); setMode(count ? 'signin' : 'create');
  }
  async function start(d) {
    db = d;
    if (!db) { setMode('open'); if (!window.__NOLOCK__) setTimeout(() => toast('Sign-in is not available in this view.'), 300); return; }
    try {   // accounts made before roles existed: the first one becomes the admin if there is none
      if (!folder()) {
        const all = await listAccts();
        if (all.length && !all.some(a => a.role === 'admin' || a.builtIn)) {
          const oldest = all.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
          if (oldest) await putAcct({ ...oldest, role: 'admin' });
        }
      }
    } catch (e) { /* roles stay as they are */ }
    await loadSignin();
    await countAccounts();
    const sess = ss.get('wf-session');
    if (sess) { try { const a = await getAcct(sess); if (a && !a.disabled && !a.mustChange) { user = effective(a, folder() ? null : await readDir(a.id)); setMode('unlock'); return; } } catch (e) { /* sign in again */ } }
    setMode(count ? 'signin' : 'create');
  }
  async function setLockMins(n) {
    if (!user) return;
    try { const a = { ...(await getAcct(user.id)), lockMins: n }; await putAcct({ ...a, role: user.role, pid: user.pid }); user = { ...user, lockMins: n }; toast(`Locks after ${n} minutes without activity`); } catch (e) { toast('Could not save the lock time.'); }
  }

  // ---- approving people: the admin for everyone, a supervisor for the agents of their team
  /** role: one of ROLES; pid: the roster person this account is (required for agents and supervisors) */
  async function setAccess(id, role, pid, opts = {}) {
    const a = await getAcct(id); if (!a || !ROLES.includes(role)) return false;
    const me = user && a.id === user.id; if (me && !opts.self) return false;
    let rec = a;
    if (folder()) {
      if (!ring || !ring.dk) { toast('Your own access to the data is not open yet.'); return false; }
      if (!a.pub && role !== 'pending') { toast(`${a.name} has to sign in once first, so the tool can make their key.`); return false; }
      rec = STAFF.has(role) ? await grantStaff(noGrants(a)) : role === 'agent' ? await grantAgent(noGrants(a), pid) : noGrants(a);
      await putAcct(rec);
      await writeDir(id, { role, pid: pid || '', fp: a.pub ? await K().fp(a.pub) : '' });
    } else {
      await putAcct({ ...a, role, pid: pid || '' });
      await writeDir(id, { role, pid: pid || '' }).catch(() => {});
    }
    return true;
  }
  /** shared folder: an admin session opens the data key for built-in admins, and for accounts whose role came over with the data */
  async function autoGrants() {
    if (!folder() || !ring || !ring.dk || !isAdmin()) return;
    const [all, D] = await Promise.all([listAccts(), dirAll()]);
    for (const a of all) {
      if (!a.pub || (a.grants && a.grants.dk) || (user && a.id === user.id)) continue;
      const e = D.get(a.id), fp = await K().fp(a.pub);
      if (a.builtIn || (e && STAFF.has(e.role) && !e.fp)) {   // trust on first key: the role was given before this person had a key
        await putAcct(await grantStaff(a)); await writeDir(a.id, { role: a.builtIn ? 'admin' : e.role, pid: (e && e.pid) || '', fp });
      }
    }
  }
  /** agents who signed up and named this supervisor (or anyone, for an admin), still waiting */
  async function waitingAgents(spvPid) {
    const all = await peopleAll();
    return all.filter(a => !a.disabled && a.role === 'pending' && a.kind === 'agent' && (!spvPid || a.wantSpv === spvPid || !a.wantSpv));
  }
  /** a supervisor approves an agent of their own team (the roster says who is in it) */
  async function approveAgent(id, pid) {
    if (!user) return false;
    const p = state.roster.find(x => x._id === pid); if (!p) return false;
    const mine = isAdmin() || (user.role === 'spv' && user.pid && p.spv === user.pid) || ['senior'].includes(user.role);
    if (!mine) { toast('Only the agent\'s own supervisor can approve them.'); return false; }
    const all = await peopleAll();
    if (all.some(x => x.role === 'agent' && x.pid === pid && x.id !== id && !x.disabled)) { toast('Another account already belongs to this agent.'); return false; }
    return setAccess(id, 'agent', pid);
  }
  async function rejectAgent(id) {
    const a = await getAcct(id); if (!a || !user) return false;
    await putAcct({ ...noGrants(a), disabled: true, wantSpv: a.wantSpv || '' }); await writeDir(id, { role: 'pending', pid: '' }).catch(() => {});
    return true;
  }

  // ---- admin: manage accounts
  let unEdit = null, linkEdit = null, agentsEdit = null;   // the row whose username / person / agents are being edited
  async function setUsernameFor(id, raw) {
    if (!isAdmin()) return;
    const a = await getAcct(id); if (!a || a.builtIn || id === user.id) return;
    const u = normUser(raw), up = userProblem(u), msg = $('accList').querySelector(`[data-id="${CSS.escape(id)}"] .unerr`);
    const say = t => { if (msg) msg.textContent = t; };
    if (up) { say(up); return; }
    if (u !== normUser(a.username || '') && await usernameTaken(u, id)) { say('This username is taken. Pick another one.'); return; }
    const D = await readDir(id); await putAcct({ ...effective(a, D), username: u }); unEdit = null; toast(`${a.name} signs in as ${u}`); renderAccounts();
  }
  async function setSignin(want) {
    if (!isAdmin() || want === userOnly) return;
    if (want) {
      const miss = (await listAccts()).filter(a => !a.disabled && !a.username);
      if (miss.length) { toast(`First give ${miss.length === 1 ? miss[0].name : plural(miss.length, 'account')} a username.`); renderAccounts(); return; }
    }
    try { await db.doc(folder() ? 'meta/signin' : 'config/signin').set({ usernameOnly: want, at: new Date().toISOString(), by: user.name }); userOnly = want; toast(want ? 'Sign-in now takes usernames only' : 'Sign-in takes a username or an email'); }
    catch (e) { toast(e && e.code === 'permission_denied' ? 'Only the owner of this page can change how people sign in.' : 'Could not save the sign-in setting.'); }
    renderAccounts();
  }
  async function adminAct(act, id, arg) {
    if (!isAdmin()) return;
    const all = await peopleAll(), a = all.find(x => x.id === id); if (!a) return;
    const me = id === user.id, admins = all.filter(x => x.role === 'admin' && !x.disabled);
    const lastAdmin = a.role === 'admin' && admins.length <= 1;
    if (a.builtIn || me) return;
    if (act === 'uname') { unEdit = id; renderAccounts().then(() => { const f = $('accList').querySelector('.unform input'); if (f) { f.focus(); f.select(); } }); return; }
    if (act === 'uncancel') { unEdit = null; renderAccounts(); return; }
    if (act === 'linkopen') { linkEdit = linkEdit === id ? null : id; if (linkEdit) agentsEdit = null; renderAccounts(); return; }
    if (act === 'agentsopen') { agentsEdit = agentsEdit === id ? null : id; if (agentsEdit) linkEdit = null; renderAccounts(); return; }
    if (act === 'reset') {
      const temp = tempPassword(), { rec } = await withPassword({ ...a, mustChange: true }, temp);
      await putAcct(rec);
      setFails('user:' + normUser(a.username || ''), null);
      $('accTemp').innerHTML = `<div class="banner info tempbox"><div>Temporary password for <b>${esc(a.name)}</b>. Give it to them; they choose their own when they sign in.${folder() ? ' Their access to the data then has to be opened again here (or by their supervisor, for an agent).' : ''}</div><div class="tempcode"><code id="tempPw">${esc(temp)}</code><button class="btn sm" id="tempCopy">Copy</button></div></div>`;
      toast(`Password reset for ${a.name}`);
    }
    if (act === 'off') { if (lastAdmin) { toast('Keep at least one admin.'); return; } await putAcct({ ...(folder() ? noGrants(a) : a), disabled: true }); toast(`${a.name} is turned off`); }
    if (act === 'on') { await putAcct({ ...a, disabled: false }); if (folder() && a.role !== 'pending') await setAccess(id, a.role, a.pid); toast(`${a.name} is turned on`); }
    if (act === 'regrant') { if (await setAccess(id, a.role, a.pid)) toast(`${a.name}'s access is open again`); }
    if (act === 'role') {
      if (!ROLES.includes(arg) || arg === a.role) return;
      if (lastAdmin && arg !== 'admin') { toast('Keep at least one admin.'); renderAccounts(); return; }
      if ((arg === 'agent') && !a.pid) { linkEdit = id; toast(`Choose who ${a.name} is in the roster first.`); renderAccounts(); return; }
      if (await setAccess(id, arg, a.pid)) toast(`${a.name}: ${ROLE_NAME[arg]}${arg === 'spv' ? (a.pid ? '. Tick the agents they lead below.' : '. Choose who they are, then their agents.') : ''}`);
      if (arg === 'spv') { if (a.pid) { agentsEdit = id; linkEdit = null; } else linkEdit = id; }
    }
    if (act === 'link') {
      const pid = arg || '';
      if (pid && all.some(x => x.pid === pid && x.id !== id && !x.disabled)) { toast('Another account is already linked to this person.'); return; }
      if (await setAccess(id, a.role === 'pending' && a.kind === 'agent' && pid ? 'agent' : a.role, pid)) { linkEdit = null; if (a.role === 'spv' && pid) agentsEdit = id; toast(pid ? `${a.name} is ${(state.roster.find(p => p._id === pid) || {}).name || 'linked'}${a.role === 'spv' ? '. Tick the agents they lead.' : ''}` : `${a.name} is not linked to a person`); }
    }
    if (act === 'remove') { if (lastAdmin) { toast('Keep at least one admin.'); return; } await delAcct(id); toast(`${a.name}'s account is removed`); }
    renderAccounts();
  }
  const when = iso => { if (!iso) return 'never'; const d = new Date(iso); return isNaN(d) ? 'never' : d.toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const personName = pid => { const p = state.roster.find(x => x._id === pid); return p ? gname(p) || p.name : ''; };
  /** a supervisor is one of the operations team (OP): only they are offered for a supervisor's account */
  const isOp = p => normSpace(p.team).toUpperCase() === 'OP';
  const spvAcct = a => a.role === 'spv' || (a.role === 'pending' && a.kind === 'spv');
  function linkPickerHtml(a) {
    const all = rosterRows().slice().sort((x, y) => String(gname(x) || x.name).localeCompare(String(gname(y) || y.name))), leads = new Set(all.map(p => p.spv).filter(Boolean));
    const op = spvAcct(a) ? all.filter(p => isOp(p) || leads.has(p._id)) : [];   // the operations team, and anyone who already leads agents
    const R = op.length ? op.concat(a.pid && !op.some(p => p._id === a.pid) ? all.filter(p => p._id === a.pid) : []) : all;
    const sugg = a.name ? R.map(p => [p, Math.max(Core.nameScore(a.name, p.name), normSpace(p.sys) ? Core.nameScore(a.name, p.sys) : 0)]).sort((x, y) => y[1] - x[1])[0] : null;
    return `<div class="linkbox"><label class="wsfield"><span>${esc(a.name)} is</span><select class="cell" data-link aria-label="Who ${esc(a.name)} is in the roster"><option value="">Not linked</option>${R.map(p => `<option value="${esc(p._id)}"${p._id === (a.pid || (sugg && sugg[1] >= 0.8 ? sugg[0]._id : '')) ? ' selected' : ''}>${esc(gname(p) || p.name)} · ${esc(p.brand || '')} ${esc(p.team || '')}</option>`).join('')}</select></label>
      <button class="btn sm primary" data-a="linksave">Save</button><button class="btn sm" data-a="linkopen">Cancel</button><span class="hint">${a.kind === 'agent' && !spvAcct(a) ? 'An agent sees only this person\'s results and forms.' : `A supervisor sees the people who have this person as their supervisor in the roster.${op.length ? ' Only the operations team (OP), and people who already lead agents, are listed.' : ''}`}</span></div>`;
  }
  /** the agents a supervisor leads: ticking one sets the roster's Supervisor column for them */
  function agentsPickerHtml(a) {
    const nm = p => gname(effP(p._id) || p) || p.name, R = rosterRows().filter(p => p._id !== a.pid && !isOp(p)), mine = new Set(teamOf(a.pid).map(p => p._id));
    const U = [...new Set(R.map(unitOf))].sort(sortUnits);
    return `<div class="scopebox assignbox"><div class="scopehead"><b>${esc(personName(a.pid) || a.name)}'s agents</b><span class="hint">Tick the agents this supervisor leads: their Supervisor in the roster changes to ${esc(personName(a.pid) || a.name)}. An agent of another supervisor shows who leads them now.</span></div>
      <input class="scopeq" data-assignq type="search" placeholder="Find an agent" aria-label="Find an agent">
      <div class="scopeag">${U.map(u => `<div class="sgrp"><small>${esc(u)}</small>${R.filter(p => unitOf(p) === u).sort((x, y) => nm(x).localeCompare(nm(y))).map(p => `<label><input type="checkbox" data-asg="${esc(p._id)}"${mine.has(p._id) ? ' checked' : ''}><span dir="auto">${esc(nm(p))}${p.spv && p.spv !== a.pid ? ` <small class="hint">· ${esc(supName(p.spv))}</small>` : ''}${p.status === 'Inactive' ? ' <small class="hint">· inactive</small>' : ''}</span></label>`).join('')}</div>`).join('')}</div>
      <div class="scopefoot"><span class="scopecount">${plural(mine.size, 'agent')} ticked</span><span class="spacer"></span><button class="btn sm" data-a="agentsopen">Cancel</button><button class="btn sm primary" data-a="agentssave">Save the team</button></div></div>`;
  }
  async function saveAgents(id, box) {
    if (!isAdmin()) return;
    const a = (await peopleAll()).find(x => x.id === id); if (!a || !a.pid) return;
    const want = new Set([...box.querySelectorAll('[data-asg]:checked')].map(el => el.dataset.asg)), had = new Set(teamOf(a.pid).map(p => p._id)), changed = [];
    for (const pid of want) if (!had.has(pid)) { updatePerson(pid, { spv: a.pid }, { quiet: true }); changed.push(pid); }
    for (const pid of had) if (!want.has(pid)) { updatePerson(pid, { spv: '' }, { quiet: true }); changed.push(pid); }
    agentsEdit = null;
    if (changed.length) {
      refresh(); markFresh('roster', `${personName(a.pid)}'s team: ${plural(want.size, 'agent')}`); publishSupervisors();
      for (const pid of changed) if (agentHasAccount(pid)) publishAgent(pid, wsMonthNow(), { quiet: true });   // their page shows their supervisor
      toast(`${personName(a.pid)} leads ${plural(want.size, 'agent')} now (${plural(changed.length, 'change')}).`);
    } else toast('Nothing changed.');
    renderAccounts();
  }
  async function renderAccounts() {
    if (!isAdmin()) { closeDrawer(); return; }
    const all = await peopleAll(), local = db && db.local;
    const waiting = all.filter(a => a.role === 'pending' && !a.disabled);
    $('accSub').textContent = `${plural(all.length, 'account')} ${folder() ? 'in the shared folder' : local ? 'on this computer' : 'on this page'}${waiting.length ? ` · ${waiting.length} waiting for access` : ''}`;
    $('shareInfo').innerHTML = shareInfoHtml(local);
    $('teamInfo').innerHTML = (TEAM ? `This file is a team copy made ${esc(when(TEAM.madeAt))}${TEAM.madeBy ? ' by ' + esc(TEAM.madeBy) : ''}. Built-in admin${TEAM.admins.length > 1 ? 's' : ''}: ${esc(TEAM.admins.map(x => x.name).join(', '))}. ` : '')
      + (folder() ? 'Put this team copy in the common folder, next to the data folder. Everyone opens it from there and works on the same data. Built-in admins can always sign in.'
        : 'Share the team copy instead of the plain file. Every admin on this list is built in, so they can sign in as admin on any computer. A file keeps its data on one computer; for one shared set of data, connect a shared data folder.');
    $('teamCopy').disabled = !SRC.ok;
    const miss = all.filter(a => !a.disabled && !a.username);
    document.querySelectorAll('#signinSeg [data-signin]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.signin === 'user') === userOnly)));
    $('signinHint').textContent = (userOnly ? 'Only usernames work on the sign-in screen.' : 'A username, or the email of an older account, works on the sign-in screen.')
      + (miss.length ? ` ${miss.length === 1 ? 'This account has' : 'These accounts have'} no username yet: ${miss.map(a => a.name).join(', ')}.` : '');
    const order = a => (a.role === 'pending' && !a.disabled ? 0 : a.role === 'admin' ? 1 : 2);
    $('accList').innerHTML = all.sort((x, y) => order(x) - order(y) || String(x.name).localeCompare(String(y.name))).map(a => {
      const me = a.id === user.id, locked = a.builtIn || me, editing = !locked && unEdit === a.id;
      const needsKey = folder() && a.role !== 'pending' && !a.builtIn && !a.disabled && (!a.pub || (STAFF.has(a.role) && !(a.grants && a.grants.dk)) || (a.role === 'agent' && !(a.grants && a.grants.ak && a.grants.ak[a.pid])));
      const pills = [`<span class="pill ${a.role === 'admin' ? 'info' : a.role === 'pending' ? 'warn' : ''}">${esc(ROLE_NAME[a.role] || 'User')}</span>`,
        a.pid ? `<span class="pill">${esc(personName(a.pid) || 'linked')}</span>` : '', a.role === 'pending' && a.kind ? `<span class="pill">Says: ${esc((KINDS.find(k => k[0] === a.kind) || [, a.kind])[1])}${a.wantSpv ? ' · ' + esc(personName(a.wantSpv)) : ''}</span>` : '',
        a.builtIn ? '<span class="pill">Built in</span>' : '', me ? '<span class="pill good">You</span>' : '', needsKey ? `<span class="pill warn">${a.pub ? 'Access to open again' : 'Signs in once to get a key'}</span>` : '',
        a.disabled ? '<span class="pill bad">Turned off</span>' : '', a.mustChange ? '<span class="pill warn">Must choose a new password</span>' : '', a.username ? '' : '<span class="pill warn">No username</span>'].join('');
      const acts = editing
        ? `<form class="unform" data-unform><label class="sr" for="un-${esc(a.id)}">Username for ${esc(a.name)}</label><input id="un-${esc(a.id)}" value="${esc(a.username || '')}" maxlength="32" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="username"><button class="btn sm primary">Save</button><button type="button" class="btn sm" data-a="uncancel">Cancel</button><span class="unerr" role="alert"></span></form>`
        : locked ? `<span class="hint">${me ? 'Use the account menu to change your own username or password.' : 'Built into this team copy, so it cannot be changed here.'}</span>`
        : `<label class="rolepick"><span class="sr">Role of ${esc(a.name)}</span><select data-role aria-label="Role of ${esc(a.name)}">${ROLES.map(r => `<option value="${r}"${r === a.role ? ' selected' : ''}>${esc(ROLE_NAME[r])}</option>`).join('')}</select></label><button class="btn sm${linkEdit === a.id ? ' primary' : ''}" data-a="linkopen">${a.pid ? 'Person' : 'Link to person'}</button>${a.role === 'spv' && a.pid ? `<button class="btn sm${agentsEdit === a.id ? ' primary' : ''}" data-a="agentsopen" title="The agents this supervisor leads">Agents · ${teamOf(a.pid).length}</button>` : ''}${needsKey && a.pub ? '<button class="btn sm primary" data-a="regrant">Open access again</button>' : ''}<button class="btn sm" data-a="uname">${a.username ? 'Change username' : 'Set username'}</button><button class="btn sm" data-a="reset">Reset password</button><button class="btn sm" data-a="${a.disabled ? 'on' : 'off'}">${a.disabled ? 'Turn on' : 'Turn off'}</button>
           <button class="btn sm ghost danger-text" data-a="remove">Remove</button>`;
      return `<div class="accrow" data-id="${esc(a.id)}"><div class="who"><b dir="auto">${esc(a.name)}</b><span>${a.username ? `Username: <b class="uname">${esc(a.username)}</b>` : ''}${a.email ? ` · ${esc(a.email)}` : ''}</span><span class="hint">Last sign-in: ${esc(when(a.lastLogin))}</span></div><div class="pills">${pills}</div><div class="acts">${acts}</div>${!locked && linkEdit === a.id ? linkPickerHtml(a) : ''}${!locked && agentsEdit === a.id && a.role === 'spv' && a.pid ? agentsPickerHtml(a) : ''}</div>`;
    }).join('');
    $('migrateBox').hidden = !(folder() && hasLocalData());
  }
  function hasLocalData() { try { const d = JSON.parse(localStorage.getItem('wf-db') || '{}'); return Object.keys(d).some(k => k.startsWith('roster/') || k.startsWith('history/')); } catch (e) { return false; } }
  /** shared folder: copy what this browser kept before (roster, history, settings, forms…) into the folder */
  async function migrateLocal() {
    if (!isAdmin() || !folder()) return;
    let data = {}; try { data = JSON.parse(localStorage.getItem('wf-db') || '{}') || {}; } catch (e) { data = {}; }
    const keys = Object.keys(data).filter(k => !k.startsWith('accounts/') && !k.startsWith('config/signin') && !k.startsWith('dir/') && k.split('/').length % 2 === 0);
    const accts = Object.keys(data).filter(k => k.startsWith('accounts/'));
    const have = new Set((await listRaw()).map(a => a.id));
    let n = 0, a = 0;
    $('migrateGo').disabled = true; $('migrateMsg').textContent = `Copying ${plural(keys.length, 'record')}…`;
    for (const k of keys) { try { await db.doc(k).set(data[k]); n++; } catch (e) { /* skip */ } if (n % 25 === 0) $('migrateMsg').textContent = `Copied ${n} of ${keys.length}…`; }
    for (const k of accts) {   // older accounts come over without keys; their role is opened when they first sign in here
      const id = k.slice(9), rec = data[k]; if (!rec || have.has(id) || builtInOf(rec)) continue;
      const { role, pid, ...rest } = rec; await db.doc('accounts/' + id).set({ ...rest, kind: rest.kind || (role === 'spv' ? 'spv' : 'other') }); if (role && role !== 'pending') await writeDir(id, { role, pid: pid || '', fp: '' }); a++;
    }
    $('migrateGo').disabled = false; $('migrateMsg').textContent = `Copied ${plural(n, 'record')} and ${plural(a, 'account')}. Reloading…`;
    toast('This computer\'s data is now in the shared folder'); setTimeout(() => location.reload(), 1200);
  }
  async function openAccounts() { if (!isAdmin()) return; $('accTemp').innerHTML = ''; unEdit = null; linkEdit = null; agentsEdit = null; await renderAccounts(); openDrawer('dAccounts'); autoGrants().then(() => { if (!$('dAccounts').hidden) renderAccounts(); }).catch(() => {}); }
  /** everyone with an account, without the password and key fields: names, roles and linked people for the workspaces */
  async function people() { try { return (await peopleAll()).map(({ hash, salt, algo, iter, pwSetAt, priv, grants, ...a }) => a); } catch (e) { return []; } }
  async function downloadTeamCopy() {
    if (!isAdmin() || !SRC.ok) return;
    const admins = (await listAccts()).filter(a => (a.role === 'admin' || a.builtIn) && !a.disabled && a.hash)
      .map(a => ({ ...(a.email ? { email: normEmail(a.email) } : {}), ...(a.username ? { username: normUser(a.username) } : {}), name: a.name, algo: a.algo, iter: a.iter, salt: a.salt, hash: a.hash, pwSetAt: a.pwSetAt, createdAt: a.createdAt }));
    const team = { v: 2, madeAt: new Date().toISOString(), madeBy: user.name, admins, ...(userOnly ? { usernameOnly: true } : {}), ...(state.logo ? { logo: state.logo } : {}) };
    const html = teamCopyHtml(team);
    await save('MC Monthly Report Builder - team copy.html', new Blob([html], { type: 'text/html' }));
  }
  // activity + timer
  const touch = () => { lastActive = Date.now(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => document.addEventListener(t, touch, { passive: true, capture: true }));
  const due = () => mode === 'open' && user && Date.now() - lastActive > lockMins() * 60000;
  setInterval(() => { if (due()) lock(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && due()) lock(); });
  $('lockForm').addEventListener('submit', e => { e.preventDefault(); if (mode !== 'connect') submit(); });
  $('pwNew').addEventListener('input', renderRules);
  $('acKind').addEventListener('change', () => { $('fSpv').hidden = $('acKind').value !== 'agent'; });
  $('lockCancel').addEventListener('click', () => setMode('open'));
  $('lockForm').addEventListener('click', e => {
    const sh = e.target.closest('[data-show]');
    if (sh) { const f = $(sh.dataset.show), show = f.type === 'password'; f.type = show ? 'text' : 'password'; sh.textContent = show ? 'Hide' : 'Show'; sh.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); f.focus(); return; }
    const cn = e.target.closest('[data-conn]'); if (cn && connectCb && connectCb.on) { connectCb.on(cn.dataset.conn); return; }
    const go = e.target.closest('[data-go]'); if (!go) return;
    const keep = normUser(val('acEmail'));
    if (go.dataset.go === 'out') { signOut(); return; }
    if (go.dataset.go === 'folder') { if (connectCb && connectCb.on) connectCb.on('pick'); return; }
    if (go.dataset.go === 'skipuser') { const a = pending; if (a) { signedIn(a); toast(`Signed in as ${a.name}. You can choose a username later from the account menu.`); } return; }
    setMode(go.dataset.go); if (go.dataset.go === 'forgot' || go.dataset.go === 'signin') $('acEmail').value = keep;
  });
  // account menu
  $('acctBtn').addEventListener('click', e => { e.stopPropagation(); const m = $('acctMenu'); m.hidden = !m.hidden; $('acctBtn').setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) m.querySelector('button:not([hidden])').focus(); });
  document.addEventListener('click', e => { if (!$('acctMenu').hidden && !e.target.closest('.acct')) { $('acctMenu').hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false'); } });
  $('acctMenu').addEventListener('keydown', e => {
    const items = [...$('acctMenu').querySelectorAll('button:not([hidden])')], i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { $('acctMenu').hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false'); $('acctBtn').focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  $('acctMenu').addEventListener('click', e => {
    const a = e.target.closest('[data-acct]'); if (!a) return; $('acctMenu').hidden = true; $('acctBtn').setAttribute('aria-expanded', 'false');
    const k = a.dataset.acct;
    if (k === 'lock') lock(); if (k === 'pw') setMode('change'); if (k === 'user') setMode('username'); if (k === 'out') signOut(); if (k === 'accounts') openAccounts();
  });
  $('signinSeg').addEventListener('click', e => { const b = e.target.closest('[data-signin]'); if (b) setSignin(b.dataset.signin === 'user'); });
  $('accList').addEventListener('submit', e => {
    const f = e.target.closest('[data-unform]'); if (!f) return; e.preventDefault();
    setUsernameFor(f.closest('[data-id]').dataset.id, f.querySelector('input').value);
  });
  $('accList').addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.closest('[data-unform]')) { e.stopPropagation(); unEdit = null; renderAccounts(); } }, true);
  $('accList').addEventListener('change', e => {
    const s = e.target.closest('select[data-role]'); if (s) { adminAct('role', s.closest('[data-id]').dataset.id, s.value); return; }
    if (e.target.matches('[data-asg]')) { const box = e.target.closest('.assignbox'), n = box.querySelectorAll('[data-asg]:checked').length; box.querySelector('.scopecount').textContent = `${plural(n, 'agent')} ticked`; }
  });
  $('accList').addEventListener('input', e => {   // find an agent in the list of agents to tick
    if (!e.target.matches('[data-assignq]')) return;
    const q = normName(e.target.value), box = e.target.closest('.assignbox');
    box.querySelectorAll('.scopeag label').forEach(l => { l.hidden = !!q && !normName(l.textContent).includes(q); });
    box.querySelectorAll('.scopeag .sgrp').forEach(g => { g.hidden = !!q && ![...g.querySelectorAll('label')].some(l => !l.hidden); });
  });
  $('accList').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const id = b.closest('[data-id]').dataset.id, act = b.dataset.a;
    if (act === 'linksave') { const sel = b.closest('.linkbox').querySelector('[data-link]'); adminAct('link', id, sel.value); return; }
    if (act === 'agentssave') { saveAgents(id, b.closest('.assignbox')); return; }
    if (act === 'remove' && !b.dataset.confirm) { b.dataset.confirm = '1'; b.textContent = 'Click again to remove'; setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = 'Remove'; } }, 3000); return; }
    adminAct(act, id);
  });
  $('accTemp').addEventListener('click', async e => { if (e.target.id === 'tempCopy') toast(await copyRich(null, $('tempPw').textContent) ? 'Temporary password copied' : 'Select the password and press Ctrl+C.'); });
  $('teamCopy').addEventListener('click', downloadTeamCopy);
  $('migrateGo').addEventListener('click', migrateLocal);
  return { start, lock, signOut, change: () => { if (user) setMode('change'); }, setLockMins, lockMins, user: () => user, isAdmin, openAccounts, check, team: () => TEAM, people, refreshMe, onDb: () => db,
    connect, setConnect: o => { connectCb = o; }, mode: () => mode, onReady: f => readyFns.push(f), info, setAccess, approveAgent, rejectAgent, waitingAgents, autoGrants, folder, ROLES, STAFF, KINDS };
})();
