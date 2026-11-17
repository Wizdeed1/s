/* MiniPad core: catalogue, router, storage, UI helpers, sound, speech,
   timers and background checks.
   Written for Safari 12 on an iPad mini 2: ES2017 syntax only, touch events
   (Safari 12 has no pointer events), webkitAudioContext, no flex `gap`. */
(function () {
  'use strict';

  var MP = window.MP = {};
  MP.version = '1.0.0';

  /* ---------- catalogue ---------- */

  MP.groups = [
    { id: 'home', title: 'Around the house' },
    { id: 'learn', title: 'Learning' },
    { id: 'play', title: 'Games & music' },
    { id: 'tools', title: 'Everyday tools' },
    { id: 'help', title: 'Help' }
  ];

  MP.apps = [
    { id: 'dashboard', title: 'Dashboard', icon: '🏠', group: 'home' },
    { id: 'kitchen', title: 'Kitchen', icon: '🍳', group: 'home' },
    { id: 'family', title: 'Family board', icon: '📝', group: 'home' },
    { id: 'facetime', title: 'Call family', icon: '📞', group: 'home' },
    { id: 'nightclock', title: 'Night clock', icon: '🌙', group: 'home' },
    { id: 'kids', title: "Kids' corner", icon: '🧸', group: 'learn' },
    { id: 'flashcards', title: 'Flashcards', icon: '🗂️', group: 'learn' },
    { id: 'draw', title: 'Draw & colour', icon: '🎨', group: 'learn' },
    { id: 'sudoku', title: 'Sudoku', icon: '🔢', group: 'play' },
    { id: 'wordsearch', title: 'Word search', icon: '🔎', group: 'play' },
    { id: 'chess', title: 'Chess', icon: '♟️', group: 'play' },
    { id: 'piano', title: 'Piano', icon: '🎹', group: 'play' },
    { id: 'drums', title: 'Drum pad', icon: '🥁', group: 'play' },
    { id: 'sounds', title: 'Soundboard', icon: '🔊', group: 'play' },
    { id: 'sleep', title: 'Sleep sounds', icon: '🌧️', group: 'play' },
    { id: 'prompter', title: 'Teleprompter', icon: '🎬', group: 'tools' },
    { id: 'focus', title: 'Focus timer', icon: '⏱️', group: 'tools' },
    { id: 'habits', title: 'Habits', icon: '✅', group: 'tools' },
    { id: 'meds', title: 'Medicines', icon: '💊', group: 'tools' },
    { id: 'notebook', title: 'Notebook', icon: '📓', group: 'tools' },
    { id: 'claude', title: 'Ask Claude', icon: '💬', group: 'tools' },
    { id: 'tips', title: 'iPad tips', icon: '💡', group: 'help' },
    { id: 'settings', title: 'Settings', icon: '⚙️', group: 'help' }
  ];

  MP.appMeta = function (id) {
    for (var i = 0; i < MP.apps.length; i++) if (MP.apps[i].id === id) return MP.apps[i];
    return null;
  };

  /* ---------- small helpers ---------- */

  MP.qs = function (sel, root) { return (root || document).querySelector(sel); };
  MP.qsa = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  };
  MP.el = function (html) {
    var d = document.createElement('div');
    d.innerHTML = String(html).trim();
    return d.firstChild;
  };
  MP.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  MP.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  MP.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  MP.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  MP.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  MP.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  MP.dayKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + MP.pad2(d.getMonth() + 1) + '-' + MP.pad2(d.getDate());
  };
  MP.addDays = function (d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };

  // Calls fn(event, matchedElement) for events inside root whose target matches sel.
  MP.delegate = function (root, type, sel, fn) {
    var h = function (e) {
      var t = e.target;
      while (t && t !== root && t.nodeType === 1) {
        if (t.matches(sel)) { fn(e, t); return; }
        t = t.parentNode;
      }
    };
    root.addEventListener(type, h);
    return function () { root.removeEventListener(type, h); };
  };

  /* ---------- events ---------- */

  var bus = {};
  MP.on = function (evt, fn) { (bus[evt] = bus[evt] || []).push(fn); };
  MP.off = function (evt, fn) {
    if (!bus[evt]) return;
    bus[evt] = bus[evt].filter(function (f) { return f !== fn; });
  };
  MP.emit = function (evt, data) {
    (bus[evt] || []).slice().forEach(function (f) {
      try { f(data); } catch (e) { if (window.console) console.error(e); }
    });
  };

  /* ---------- storage (everything stays on this iPad) ---------- */

  var PREFIX = 'mp.';
  MP.store = {
    get: function (key, fallback) {
      try {
        var v = window.localStorage.getItem(PREFIX + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        MP.toast('Could not save. The storage on this iPad may be full.');
        return false;
      }
    },
    remove: function (key) { try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } },
    keys: function () {
      var out = [];
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch (e) { /* ignore */ }
      return out;
    }
  };

  /* ---------- settings ---------- */

  var LANG = (navigator.language || 'en-US');
  var IS_US = /^en-US$/i.test(LANG);
  function guess24() {
    try { return !/[AP]M/i.test(new Date(2020, 0, 1, 13, 0).toLocaleTimeString()); } catch (e) { return !IS_US; }
  }
  var DEFAULTS = {
    theme: 'auto',            // light | dark | auto (dark from 7pm to 7am)
    clock24: guess24(),
    tempUnit: IS_US ? 'F' : 'C',
    speechRate: 1,
    passcode: ''
  };
  MP.settings = function () { return Object.assign({}, DEFAULTS, MP.store.get('settings', {})); };
  MP.setSetting = function (key, value) {
    var s = MP.store.get('settings', {});
    s[key] = value;
    MP.store.set('settings', s);
    applyTheme();
    MP.emit('settings', s);
  };

  function applyTheme() {
    var t = MP.settings().theme;
    var h = new Date().getHours();
    var dark = t === 'dark' || (t === 'auto' && (h >= 19 || h < 7));
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  MP.applyTheme = applyTheme;

  /* ---------- dates and times ---------- */

  MP.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  MP.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

  // {hm: "9:41", sec: "05", ampm: "AM" or ""}
  MP.timeParts = function (d) {
    var h = d.getHours();
    var m = MP.pad2(d.getMinutes());
    if (MP.settings().clock24) return { hm: MP.pad2(h) + ':' + m, sec: MP.pad2(d.getSeconds()), ampm: '' };
    return { hm: (h % 12 || 12) + ':' + m, sec: MP.pad2(d.getSeconds()), ampm: h < 12 ? 'AM' : 'PM' };
  };
  MP.fmtTime = function (d) {
    var p = MP.timeParts(d);
    return p.hm + (p.ampm ? ' ' + p.ampm : '');
  };
  // "08:30" (24h string) -> display in the user's clock style
  MP.fmtHHMM = function (hhmm) {
    var p = String(hhmm || '').split(':');
    var d = new Date(); d.setHours(+p[0] || 0, +p[1] || 0, 0, 0);
    return MP.fmtTime(d);
  };
  MP.fmtDate = function (d, style) {
    var day = MP.DAYS[d.getDay()], mon = MP.MONTHS[d.getMonth()], n = d.getDate();
    if (style === 'short') {
      return IS_US ? day.slice(0, 3) + ', ' + mon.slice(0, 3) + ' ' + n : day.slice(0, 3) + ' ' + n + ' ' + mon.slice(0, 3);
    }
    if (style === 'day') return IS_US ? mon + ' ' + n : n + ' ' + mon;
    return IS_US ? day + ', ' + mon + ' ' + n : day + ' ' + n + ' ' + mon;
  };
  MP.fmtDuration = function (ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + MP.pad2(m) : m) + ':' + MP.pad2(sec);
  };

  /* ---------- toast, modal, forms ---------- */

  var toastTimer = null;
  MP.toast = function (msg, ms) {
    var t = MP.qs('#toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, ms || 2600);
  };

  // opts: {title, html, buttons:[{label, value, kind}], collect(wrap, value), onOpen(wrap, close), cls}
  MP.modal = function (opts) {
    return new Promise(function (resolve) {
      var root = MP.qs('#modal');
      var wrap = document.createElement('div');
      wrap.className = 'modal' + (opts.cls ? ' ' + opts.cls : '');
      var btns = (opts.buttons || [{ label: 'OK', value: 'ok', kind: 'primary' }]).map(function (b) {
        return '<button type="button" class="btn ' + (b.kind || '') + '" data-v="' + MP.esc(b.value) + '">' +
          MP.esc(b.label) + '</button>';
      }).join('');
      wrap.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' +
        (opts.title ? '<h2 class="sheet-title">' + MP.esc(opts.title) + '</h2>' : '') +
        '<div class="sheet-body">' + (opts.html || '') + '</div>' +
        '<div class="sheet-btns">' + btns + '</div></div>';
      root.appendChild(wrap);
      var done = false;
      function close(v) {
        if (done) return;
        done = true;
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        resolve(v);
      }
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-v]') : null;
        if (b && wrap.contains(b)) {
          var v = b.getAttribute('data-v');
          if (opts.collect) {
            var out = opts.collect(wrap, v);
            if (out === false) return;          // validation failed, keep open
            close(out);
          } else close(v);
          return;
        }
        if (e.target === wrap && opts.dismissable !== false) close(null);
      });
      if (opts.onOpen) opts.onOpen(wrap, close);
    });
  };

  MP.alert = function (msg, title) {
    return MP.modal({ title: title || '', html: '<p>' + MP.esc(msg) + '</p>' });
  };
  MP.confirm = function (msg, okLabel, danger) {
    return MP.modal({
      html: '<p>' + MP.esc(msg) + '</p>',
      buttons: [{ label: 'Cancel', value: 'no' }, { label: okLabel || 'OK', value: 'ok', kind: danger ? 'danger' : 'primary' }]
    }).then(function (v) { return v === 'ok'; });
  };

  function fieldHtml(f) {
    var id = 'f_' + f.name;
    var v = f.value == null ? '' : f.value;
    var label = f.label ? '<label for="' + id + '">' + MP.esc(f.label) + '</label>' : '';
    var hint = f.hint ? '<div class="hint">' + MP.esc(f.hint) + '</div>' : '';
    var ph = f.placeholder ? ' placeholder="' + MP.esc(f.placeholder) + '"' : '';
    var input;
    if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 4) + '"' + ph + '>' + MP.esc(v) + '</textarea>';
    } else if (f.type === 'select') {
      input = '<select id="' + id + '" name="' + f.name + '">' + f.options.map(function (o) {
        var ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label : o;
        return '<option value="' + MP.esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + MP.esc(ol) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'checkbox') {
      return '<div class="field check-field"><label><input type="checkbox" id="' + id + '" name="' + f.name + '"' +
        (v ? ' checked' : '') + '> ' + MP.esc(f.label) + '</label>' + hint + '</div>';
    } else if (f.type === 'image') {
      return '<div class="field">' + label + '<div class="img-field" data-name="' + f.name + '">' +
        '<img class="img-preview" alt=""' + (v ? ' src="' + MP.esc(v) + '"' : ' hidden') + '>' +
        '<label class="btn">Choose photo<input type="file" accept="image/*" hidden></label>' +
        '<button type="button" class="btn ghost img-clear"' + (v ? '' : ' hidden') + '>Remove</button>' +
        '<input type="hidden" name="' + f.name + '" value="' + MP.esc(v) + '"></div>' + hint + '</div>';
    } else {
      var extra = '';
      if (f.min != null) extra += ' min="' + f.min + '"';
      if (f.max != null) extra += ' max="' + f.max + '"';
      if (f.step != null) extra += ' step="' + f.step + '"';
      if (f.type === 'number') extra += ' inputmode="decimal" pattern="[0-9]*"';
      if (f.autocap === false) extra += ' autocapitalize="off" autocorrect="off" spellcheck="false"';
      input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + MP.esc(v) + '"' + ph + extra + '>';
    }
    return '<div class="field">' + label + input + hint + '</div>';
  }

  // spec: {title, fields:[{name,label,type,value,options,placeholder,hint,required}], ok, del}
  // Resolves to the values object, 'delete', or null when cancelled.
  MP.form = function (spec) {
    var buttons = [];
    if (spec.del) buttons.push({ label: spec.delLabel || 'Delete', value: 'del', kind: 'danger ghost' });
    buttons.push({ label: 'Cancel', value: 'cancel' });
    buttons.push({ label: spec.ok || 'Save', value: 'ok', kind: 'primary' });
    return MP.modal({
      title: spec.title,
      cls: 'form-modal',
      html: (spec.intro ? '<p class="muted">' + MP.esc(spec.intro) + '</p>' : '') +
        '<form class="form" onsubmit="return false">' + spec.fields.map(fieldHtml).join('') + '</form>',
      buttons: buttons,
      collect: function (wrap, v) {
        if (v === 'del') return 'delete';
        if (v !== 'ok') return null;
        var out = {};
        for (var i = 0; i < spec.fields.length; i++) {
          var f = spec.fields[i];
          var el = wrap.querySelector('[name="' + f.name + '"]');
          if (!el) continue;
          var val = f.type === 'checkbox' ? el.checked : el.value;
          if (f.type === 'number') val = val === '' ? null : Number(val);
          if (typeof val === 'string' && f.type !== 'textarea') val = val.trim();
          if (f.required && (val === '' || val == null)) {
            el.classList.add('invalid');
            MP.toast('Please fill in "' + (f.label || f.name) + '".');
            return false;
          }
          out[f.name] = val;
        }
        return out;
      },
      onOpen: function (wrap) {
        MP.qsa('.img-field', wrap).forEach(function (box) {
          var file = box.querySelector('input[type=file]');
          var hidden = box.querySelector('input[type=hidden]');
          var img = box.querySelector('img');
          var clear = box.querySelector('.img-clear');
          file.addEventListener('change', function () {
            if (!file.files || !file.files[0]) return;
            MP.toast('Preparing photo…');
            MP.resizeImage(file.files[0], 360).then(function (url) {
              hidden.value = url; img.src = url; img.hidden = false; clear.hidden = false;
            }).catch(function () { MP.toast('Could not read that photo.'); });
          });
          clear.addEventListener('click', function () { hidden.value = ''; img.hidden = true; clear.hidden = true; });
        });
      }
    });
  };

  // Copy text (Safari 12 has no navigator.clipboard, so select a textarea and copy).
  MP.copyText = function (text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('style', 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:18px');
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.blur();
    document.body.removeChild(ta);
    return ok;
  };

  // A small, safe Markdown renderer for chat answers and tips (escapes first).
  MP.markdown = function (src) {
    var text = MP.esc(src || '').replace(/\r\n/g, '\n');
    var blocks = [];
    text = text.replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, function (m, code) {
      blocks.push('<pre><code>' + code.replace(/\n$/, '') + '</code></pre>');
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });
    function inline(s) {
      return s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    var out = [];
    text.split(/\n{2,}/).forEach(function (para) {
      var m = /^\u0000(\d+)\u0000$/.exec(para.trim());
      if (m) { out.push(blocks[+m[1]]); return; }
      var lines = para.split('\n');
      if (lines.every(function (l) { return /^\s*([-*•]|\d+[.)])\s+/.test(l); })) {
        var ordered = /^\s*\d/.test(lines[0]);
        out.push((ordered ? '<ol>' : '<ul>') + lines.map(function (l) {
          return '<li>' + inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')) + '</li>';
        }).join('') + (ordered ? '</ol>' : '</ul>'));
        return;
      }
      var h = /^#{1,4}\s+(.*)$/.exec(para);
      if (h && lines.length === 1) { out.push('<h3>' + inline(h[1]) + '</h3>'); return; }
      out.push('<p>' + inline(para).replace(/\n/g, '<br>').replace(/\u0000(\d+)\u0000/g, function (x, i) { return blocks[+i]; }) + '</p>');
    });
    return out.join('');
  };

  /* ---------- photos: resize and fix rotation (Safari 12 ignores EXIF) ---------- */

  var autoOrients = !!(window.CSS && CSS.supports && CSS.supports('image-orientation', 'from-image'));

  function exifOrientation(buf) {
    try {
      var v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return 1;
      var off = 2, len = v.byteLength;
      while (off < len - 4) {
        var marker = v.getUint16(off);
        off += 2;
        if (marker === 0xFFE1) {
          if (v.getUint32(off + 2) !== 0x45786966) return 1;          // "Exif"
          var tiff = off + 8;
          var little = v.getUint16(tiff) === 0x4949;
          var ifd = tiff + v.getUint32(tiff + 4, little);
          var n = v.getUint16(ifd, little);
          for (var i = 0; i < n; i++) {
            var e = ifd + 2 + i * 12;
            if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little);
          }
          return 1;
        } else if ((marker & 0xFF00) !== 0xFF00) {
          return 1;
        } else {
          off += v.getUint16(off);
        }
      }
    } catch (err) { /* not a JPEG we understand */ }
    return 1;
  }

  // Resolves to a JPEG data URL whose longest side is at most `max` pixels.
  MP.resizeImage = function (file, max) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var orient = autoOrients ? 1 : exifOrientation(reader.result);
        var blobUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onerror = function () { URL.revokeObjectURL(blobUrl); reject(new Error('image')); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, max / Math.max(w, h));
          var dw = Math.round(w * scale), dh = Math.round(h * scale);
          var swap = orient >= 5 && orient <= 8;
          var c = document.createElement('canvas');
          c.width = swap ? dh : dw;
          c.height = swap ? dw : dh;
          var g = c.getContext('2d');
          switch (orient) {
            case 2: g.transform(-1, 0, 0, 1, dw, 0); break;
            case 3: g.transform(-1, 0, 0, -1, dw, dh); break;
            case 4: g.transform(1, 0, 0, -1, 0, dh); break;
            case 5: g.transform(0, 1, 1, 0, 0, 0); break;
            case 6: g.transform(0, 1, -1, 0, dh, 0); break;
            case 7: g.transform(0, -1, -1, 0, dh, dw); break;
            case 8: g.transform(0, -1, 1, 0, 0, dw); break;
            default: break;
          }
          g.drawImage(img, 0, 0, dw, dh);
          URL.revokeObjectURL(blobUrl);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = blobUrl;
      };
      reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
    });
  };

  /* ---------- sound (Web Audio) ---------- */

  var actx = null;
  MP.audio = function () {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended' && actx.resume) { try { actx.resume(); } catch (e) { /* ignore */ } }
    return actx;
  };
  // iOS only starts sound after a touch, so play a silent sample on the first one.
  function unlockAudio() {
    var c = MP.audio();
    if (!c) return;
    try {
      var b = c.createBuffer(1, 1, 22050);
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) { /* ignore */ }
    if (c.state === 'running') {
      document.removeEventListener('touchend', unlockAudio, true);
      document.removeEventListener('click', unlockAudio, true);
    }
  }
  document.addEventListener('touchend', unlockAudio, true);
  document.addEventListener('click', unlockAudio, true);

  // One shaped note. opts: {type, vol, attack, decay, at, dest, detune}
  MP.tone = function (freq, dur, opts) {
    var c = MP.audio();
    if (!c) return;
    opts = opts || {};
    var t0 = (opts.at || c.currentTime) + 0.005;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    if (opts.detune) o.detune.setValueAtTime(opts.detune, t0);
    var vol = opts.vol == null ? 0.3 : opts.vol;
    var attack = opts.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(opts.dest || c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  // Short bursts of filtered noise (claps, snares, splashes). opts: {vol, filter, freq, q, at}
  var noiseCache = null;
  MP.noiseBurst = function (dur, opts) {
    var c = MP.audio();
    if (!c) return;
    opts = opts || {};
    if (!noiseCache || noiseCache.sampleRate !== c.sampleRate) {
      noiseCache = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseCache.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t0 = (opts.at || c.currentTime) + 0.005;
    var s = c.createBufferSource();
    s.buffer = noiseCache;
    var f = c.createBiquadFilter();
    f.type = opts.filter || 'highpass';
    f.frequency.setValueAtTime(opts.freq || 1000, t0);
    f.Q.setValueAtTime(opts.q || 1, t0);
    var g = c.createGain();
    g.gain.setValueAtTime(opts.vol == null ? 0.4 : opts.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(opts.dest || c.destination);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  };

  MP.chime = function () {
    var c = MP.audio();
    if (!c) return;
    var t = c.currentTime;
    MP.tone(880, 0.6, { vol: 0.35, at: t });
    MP.tone(1108.7, 0.6, { vol: 0.3, at: t + 0.18 });
    MP.tone(1318.5, 0.9, { vol: 0.3, at: t + 0.36 });
  };
  MP.ding = function (good) {
    if (good === false) { MP.tone(220, 0.35, { type: 'square', vol: 0.12 }); return; }
    var c = MP.audio();
    if (!c) return;
    MP.tone(1046.5, 0.25, { vol: 0.25 });
    MP.tone(1568, 0.4, { vol: 0.2, at: c.currentTime + 0.1 });
  };

  /* ---------- background sounds that keep playing between pages ---------- */

  MP.noise = (function () {
    var KINDS = {
      rain: { label: 'Rain', icon: '🌧️' },
      ocean: { label: 'Ocean waves', icon: '🌊' },
      wind: { label: 'Wind', icon: '🍃' },
      fan: { label: 'Fan', icon: '🌀' },
      white: { label: 'White noise', icon: '⚪' },
      pink: { label: 'Pink noise', icon: '🌸' },
      brown: { label: 'Brown noise', icon: '🌰' }
    };
    var buffers = {};
    var nodes = [];
    var master = null;
    var current = null;
    var volume = 0.6;
    var endsAt = 0;
    var stopTimer = null;

    function makeBuffer(c, kind) {
      // 8 seconds, with the end blended into the start so the loop has no click.
      var len = c.sampleRate * 8, fade = Math.floor(c.sampleRate * 0.5);
      var raw = new Float32Array(len + fade);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (var i = 0; i < raw.length; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === 'white') raw[i] = w * 0.5;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          raw[i] = last * 3.5;
        }
      }
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var j = 0; j < len; j++) d[j] = raw[j];
      for (var k = 0; k < fade; k++) {
        var t = k / fade;
        d[k] = raw[k] * t + raw[len + k] * (1 - t);
      }
      return buf;
    }
    function source(c, base) {
      if (!buffers[base]) buffers[base] = makeBuffer(c, base);
      var s = c.createBufferSource();
      s.buffer = buffers[base];
      s.loop = true;
      nodes.push(s);
      return s;
    }
    function lfo(c, rate, depth, param) {
      var o = c.createOscillator();
      var g = c.createGain();
      o.frequency.value = rate;
      g.gain.value = depth;
      o.connect(g); g.connect(param);
      o.start();
      nodes.push(o);
    }
    function build(c, kind, out) {
      var s, f, g;
      if (kind === 'white' || kind === 'pink' || kind === 'brown') {
        s = source(c, kind); s.connect(out); s.start();
      } else if (kind === 'rain') {
        s = source(c, 'pink');
        f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 500;
        var f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000;
        s.connect(f); f.connect(f2); f2.connect(out); s.start();
        var s2 = source(c, 'brown'); g = c.createGain(); g.gain.value = 0.5;
        s2.connect(g); g.connect(out); s2.start();
      } else if (kind === 'ocean') {
        s = source(c, 'brown');
        f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
        g = c.createGain(); g.gain.value = 0.55;
        s.connect(f); f.connect(g); g.connect(out); s.start();
        lfo(c, 0.09, 0.45, g.gain);
        lfo(c, 0.09, 500, f.frequency);
      } else if (kind === 'wind') {
        s = source(c, 'white');
        f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 1.2;
        g = c.createGain(); g.gain.value = 0.9;
        s.connect(f); f.connect(g); g.connect(out); s.start();
        lfo(c, 0.06, 350, f.frequency);
        lfo(c, 0.11, 0.35, g.gain);
      } else if (kind === 'fan') {
        s = source(c, 'brown');
        f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 450;
        s.connect(f); f.connect(out); s.start();
        var hum = c.createOscillator(); hum.frequency.value = 58;
        var hg = c.createGain(); hg.gain.value = 0.025;
        hum.connect(hg); hg.connect(out); hum.start(); nodes.push(hum);
      }
    }
    function stop() {
      nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* ignore */ } });
      nodes = [];
      if (master) { try { master.disconnect(); } catch (e) { /* ignore */ } master = null; }
      current = null;
      endsAt = 0;
      clearTimeout(stopTimer);
      MP.emit('noise');
    }
    function play(kind, vol) {
      var c = MP.audio();
      if (!c || !KINDS[kind]) return;
      stop();
      if (vol != null) volume = vol;
      master = c.createGain();
      master.gain.setValueAtTime(0.0001, c.currentTime);
      master.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), c.currentTime + 1.5);
      master.connect(c.destination);
      build(c, kind, master);
      current = kind;
      MP.emit('noise');
    }
    function setVolume(v) {
      volume = v;
      if (master && actx) master.gain.setTargetAtTime(Math.max(0.0001, v), actx.currentTime, 0.1);
    }
    function sleepIn(minutes) {
      clearTimeout(stopTimer);
      if (!minutes) { endsAt = 0; MP.emit('noise'); return; }
      endsAt = Date.now() + minutes * 60000;
      stopTimer = setTimeout(function () {
        if (master && actx) master.gain.setTargetAtTime(0.0001, actx.currentTime, 6);
        stopTimer = setTimeout(stop, 25000);
      }, Math.max(0, minutes * 60000 - 30000));
      MP.emit('noise');
    }
    return {
      kinds: KINDS,
      play: play,
      stop: stop,
      setVolume: setVolume,
      sleepIn: sleepIn,
      state: function () { return { kind: current, volume: volume, endsAt: endsAt }; }
    };
  })();

  /* ---------- speech ---------- */

  var voices = [];
  function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) {
    loadVoices();
    if ('onvoiceschanged' in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  MP.canSpeak = function () { return 'speechSynthesis' in window; };
  MP.voiceFor = function (lang) {
    if (!voices.length) loadVoices();
    var l = (lang || 'en-US').toLowerCase();
    var short = l.split('-')[0];
    var exact = null, close = null;
    for (var i = 0; i < voices.length; i++) {
      var vl = (voices[i].lang || '').toLowerCase().replace('_', '-');
      if (vl === l && !exact) exact = voices[i];
      if (vl.split('-')[0] === short && !close) close = voices[i];
    }
    return exact || close;
  };
  // opts: {lang, rate, pitch, onend}
  MP.say = function (text, opts) {
    if (!MP.canSpeak()) { MP.toast('Speech is not available on this device.'); return; }
    opts = opts || {};
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = opts.lang || 'en-US';
      var v = MP.voiceFor(u.lang);
      if (v) u.voice = v;
      u.rate = (opts.rate || 1) * (MP.settings().speechRate || 1);
      u.pitch = opts.pitch || 1;
      if (opts.onend) { u.onend = opts.onend; u.onerror = opts.onend; }
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };
  MP.stopSpeak = function () { try { if (MP.canSpeak()) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } };

  /* ---------- keep the screen awake (best effort on iOS 12) ---------- */

  MP.wake = (function () {
    var ns = null, on = false;
    return {
      on: function () {
        try {
          if (!ns && window.NoSleep) ns = new window.NoSleep();
          if (!ns) return;
          var p = ns.enable();
          on = true;
          if (p && p.catch) p.catch(function () { on = false; MP.emit('wake'); });
        } catch (e) { on = false; }
        MP.emit('wake');
      },
      off: function () {
        try { if (ns) ns.disable(); } catch (e) { /* ignore */ }
        on = false;
        MP.emit('wake');
      },
      isOn: function () { return on; },
      toggle: function () { if (on) this.off(); else this.on(); return on; }
    };
  })();

  /* ---------- timers that ring on any page ---------- */

  MP.timers = {
    list: function () { return MP.store.get('timers', []); },
    save: function (l) { MP.store.set('timers', l); MP.emit('timers'); },
    add: function (label, ms, kind) {
      var t = { id: MP.uid(), label: label, total: ms, endAt: Date.now() + ms, paused: null, kind: kind || 'kitchen', rang: false };
      var l = this.list(); l.push(t); this.save(l);
      return t;
    },
    get: function (id) { return this.list().filter(function (t) { return t.id === id; })[0] || null; },
    update: function (id, fn) {
      var l = this.list();
      for (var i = 0; i < l.length; i++) if (l[i].id === id) fn(l[i]);
      this.save(l);
    },
    remove: function (id) { this.save(this.list().filter(function (t) { return t.id !== id; })); },
    left: function (t) { return t.paused != null ? t.paused : Math.max(0, t.endAt - Date.now()); },
    pause: function (id) { var self = this; this.update(id, function (t) { if (t.paused == null) t.paused = self.left(t); }); },
    resume: function (id) { this.update(id, function (t) { if (t.paused != null) { t.endAt = Date.now() + t.paused; t.paused = null; t.rang = false; } }); },
    addTime: function (id, ms) {
      this.update(id, function (t) {
        if (t.paused != null) t.paused += ms;
        else t.endAt = Math.max(Date.now(), t.endAt) + ms;
        t.total += ms;
        t.rang = false;
      });
    }
  };

  var ringing = [];
  var ringLoop = null;
  function ring(t) {
    ringing.push(t);
    if (ringing.length > 1) return;
    showRing();
  }
  function showRing() {
    var t = ringing[0];
    if (!t) return;
    var started = Date.now();
    MP.chime();
    clearInterval(ringLoop);
    ringLoop = setInterval(function () {
      if (Date.now() - started > 120000) { clearInterval(ringLoop); return; }
      MP.chime();
    }, 2500);
    setTimeout(function () { MP.say((t.label || 'Timer') + ' is done.'); }, 1300);
    MP.modal({
      cls: 'ring-modal',
      dismissable: false,
      html: '<div class="ring-icon">⏰</div><div class="ring-label">' + MP.esc(t.label || 'Timer') + '</div><div class="muted">Time is up</div>',
      buttons: [{ label: 'Stop', value: 'stop', kind: 'primary big' }]
    }).then(function () {
      clearInterval(ringLoop);
      MP.stopSpeak();
      if (t.kind !== 'focus') MP.timers.remove(t.id);
      MP.emit('timer-stopped', t);
      ringing.shift();
      if (ringing.length) setTimeout(showRing, 300);
    });
  }
  function checkTimers() {
    var now = Date.now(), l = MP.timers.list(), changed = false;
    l.forEach(function (t) {
      if (t.paused == null && !t.rang && t.endAt <= now) { t.rang = true; changed = true; ring(t); MP.emit('timer-done', t); }
    });
    if (changed) MP.timers.save(l);
  }

  /* ---------- background checks (medicine reminders) ---------- */

  var bgDefs = {};
  MP.background = function (id, fn) { bgDefs[id] = fn; };
  MP.needsBackground = function (id, yes) {
    var l = MP.store.get('bg', []).filter(function (x) { return x !== id; });
    if (yes) l.push(id);
    MP.store.set('bg', l);
  };
  function runBackground() {
    Object.keys(bgDefs).forEach(function (id) {
      try { bgDefs[id](); } catch (e) { if (window.console) console.error(e); }
    });
  }

  /* ---------- online features (need the Vercel functions + passcode) ---------- */

  MP.api = function (path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var pc = MP.settings().passcode;
    if (pc) headers['X-Passcode'] = pc;
    var req = fetch('api/' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      credentials: 'same-origin'
    }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) { /* not JSON */ }
        if (!r.ok) {
          var err = new Error((j && j.error) || ('The server answered ' + r.status + '.'));
          err.status = r.status;
          err.code = j && j.code;
          throw err;
        }
        return j;
      });
    });
    var ms = opts.timeout || 30000;
    var timeout = new Promise(function (resolve, reject) {
      setTimeout(function () { var e = new Error('No answer from the internet. Check the Wi-Fi.'); e.code = 'timeout'; reject(e); }, ms);
    });
    return Promise.race([req, timeout]);
  };

  /* ---------- router ---------- */

  var defs = {}, waiting = {}, requested = {};
  var view = null;
  var viewEl, barEl, titleEl, actionsEl, backEl, clockEl;

  MP.define = function (id, def) {
    defs[id] = def;
    if (def.background) MP.background(id, def.background);
    (waiting[id] || []).forEach(function (fn) { fn(def); });
    delete waiting[id];
  };

  function loadApp(id) {
    if (defs[id]) return Promise.resolve(defs[id]);
    return new Promise(function (resolve, reject) {
      (waiting[id] = waiting[id] || []).push(resolve);
      if (requested[id]) return;
      requested[id] = true;
      var s = document.createElement('script');
      s.src = 'apps/' + id + '.js';
      s.onerror = function () { requested[id] = false; delete waiting[id]; reject(new Error('load ' + id)); };
      document.head.appendChild(s);
    });
  }
  MP.loadApp = loadApp;

  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var i = h.indexOf('/');
    if (i < 0) return { id: h, arg: '' };
    return { id: h.slice(0, i), arg: decodeURIComponent(h.slice(i + 1)) };
  }
  MP.route = route;
  MP.go = function (id, arg) {
    location.hash = '#/' + (id || '') + (arg ? '/' + encodeURIComponent(arg) : '');
  };

  function makeCtx(id, arg) {
    var cleanups = [];
    return {
      id: id,
      arg: arg,
      root: viewEl,
      bar: actionsEl,
      get: function (k, d) { return MP.store.get(id + '.' + k, d); },
      set: function (k, v) { return MP.store.set(id + '.' + k, v); },
      every: function (ms, fn) { var t = setInterval(fn, ms); cleanups.push(function () { clearInterval(t); }); return t; },
      after: function (ms, fn) { var t = setTimeout(fn, ms); cleanups.push(function () { clearTimeout(t); }); return t; },
      listen: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts || false);
        cleanups.push(function () { target.removeEventListener(type, fn, opts || false); });
      },
      on: function (evt, fn) { MP.on(evt, fn); cleanups.push(function () { MP.off(evt, fn); }); },
      delegate: function (root, type, sel, fn) { cleanups.push(MP.delegate(root, type, sel, fn)); },
      cleanup: function (fn) { cleanups.push(fn); },
      actions: function (html) { actionsEl.innerHTML = html || ''; },
      title: function (t) { titleEl.textContent = t; },
      immersive: function (on) { document.body.classList.toggle('immersive', !!on); },
      destroy: function () {
        cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
        cleanups = [];
      }
    };
  }

  function unmount() {
    if (!view) return;
    try { if (view.def.unmount) view.def.unmount(view.ctx); } catch (e) { if (window.console) console.error(e); }
    view.ctx.destroy();
    view = null;
    actionsEl.innerHTML = '';
    document.body.classList.remove('immersive');
    MP.stopSpeak();
  }

  function setBar(meta, arg) {
    var home = !meta;
    document.body.classList.toggle('at-home', home);
    backEl.hidden = home;
    backEl.textContent = arg ? '‹ Back' : '‹ Home';
    titleEl.textContent = home ? 'MiniPad' : meta.title;
    clockEl.hidden = !home;
    document.title = home ? 'MiniPad' : meta.title + ' · MiniPad';
  }

  function render() {
    var r = route();
    if (view && view.id === r.id && view.def.onArg) {
      view.ctx.arg = r.arg;
      setBar(MP.appMeta(r.id), r.arg);
      try { view.def.onArg(r.arg, view.ctx); } catch (e) { if (window.console) console.error(e); }
      viewEl.scrollTop = 0;
      return;
    }
    unmount();
    if (!r.id) { setBar(null); renderLauncher(); return; }
    var meta = MP.appMeta(r.id);
    if (!meta) { MP.go(''); return; }
    setBar(meta, r.arg);
    viewEl.className = 'view app-' + r.id;
    viewEl.innerHTML = '<div class="loading">Opening…</div>';
    loadApp(r.id).then(function (def) {
      var now = route();
      if (now.id !== r.id || view) return;
      var ctx = makeCtx(r.id, now.arg);
      view = { id: r.id, def: def, ctx: ctx };
      viewEl.innerHTML = '';
      viewEl.scrollTop = 0;
      try { def.mount(viewEl, ctx); } catch (e) {
        if (window.console) console.error(e);
        viewEl.innerHTML = '<div class="empty">Something went wrong here. Go back and try again.</div>';
      }
    }).catch(function () {
      viewEl.innerHTML = '<div class="empty">Could not open this. Check the Wi-Fi and try again.</div>';
    });
  }

  /* ---------- launcher (home screen of tiles) ---------- */

  function renderLauncher() {
    viewEl.className = 'view launcher';
    var html = '<div class="launch-head"><div class="launch-time" id="lt"></div><div class="launch-date" id="ld"></div></div>';
    html += '<div id="launch-now"></div>';
    MP.groups.forEach(function (g) {
      var apps = MP.apps.filter(function (a) { return a.group === g.id; });
      html += '<section class="tile-group g-' + g.id + '"><h2>' + MP.esc(g.title) + '</h2><div class="tiles">';
      apps.forEach(function (a) {
        html += '<a class="tile" href="#/' + a.id + '"><span class="tile-icon">' + a.icon + '</span>' +
          '<span class="tile-label">' + MP.esc(a.title) + '</span></a>';
      });
      html += '</div></section>';
    });
    html += '<p class="launch-foot">MiniPad ' + MP.version + ' · Your data stays on this iPad.</p>';
    viewEl.innerHTML = html;
    viewEl.scrollTop = 0;
    updateLauncher();
  }

  function updateLauncher() {
    if (view || route().id) return;
    var now = new Date();
    var lt = MP.qs('#lt'), ld = MP.qs('#ld'), ln = MP.qs('#launch-now');
    if (lt) {
      var p = MP.timeParts(now);
      lt.innerHTML = MP.esc(p.hm) + (p.ampm ? '<small>' + p.ampm + '</small>' : '');
    }
    if (ld) ld.textContent = MP.fmtDate(now);
    if (ln) {
      var bits = [];
      MP.timers.list().forEach(function (t) {
        bits.push('<a class="now-chip" href="#/' + (t.kind === 'focus' ? 'focus' : 'kitchen') + '">⏲️ ' + MP.esc(t.label) + ' · ' +
          (t.rang ? 'done' : MP.fmtDuration(MP.timers.left(t))) + '</a>');
      });
      ln.innerHTML = bits.join('');
    }
  }

  /* ---------- the little "now playing" chip ---------- */

  function updateNowPlaying() {
    var el = MP.qs('#now-playing');
    if (!el) return;
    var st = MP.noise.state();
    if (!st.kind) { el.hidden = true; return; }
    var k = MP.noise.kinds[st.kind];
    var left = st.endsAt ? ' · ' + Math.max(1, Math.round((st.endsAt - Date.now()) / 60000)) + ' min' : '';
    el.innerHTML = '<span>' + k.icon + ' ' + MP.esc(k.label) + left + '</span><button type="button" class="np-stop" aria-label="Stop sound">■ Stop</button>';
    el.hidden = false;
  }

  /* ---------- boot ---------- */

  function boot() {
    viewEl = MP.qs('#view');
    barEl = MP.qs('#bar');
    titleEl = MP.qs('#bar-title');
    actionsEl = MP.qs('#bar-actions');
    backEl = MP.qs('#bar-back');
    clockEl = MP.qs('#bar-clock');
    if (window.navigator.standalone) document.documentElement.classList.add('standalone');
    applyTheme();

    backEl.addEventListener('click', function () {
      var r = route();
      if (r.arg) MP.go(r.id); else MP.go('');
    });
    MP.qs('#now-playing').addEventListener('click', function (e) {
      if (e.target.closest('.np-stop')) MP.noise.stop();
      else MP.go('sleep');
    });
    MP.on('noise', updateNowPlaying);

    window.addEventListener('hashchange', render);
    render();

    setInterval(function () {
      checkTimers();
      MP.emit('tick');
      updateLauncher();
      var s = clockEl && !clockEl.hidden;
      if (s) clockEl.textContent = MP.fmtTime(new Date());
    }, 1000);
    setInterval(function () { applyTheme(); runBackground(); updateNowPlaying(); }, 30000);

    // Load the pages that need to check things in the background (medicine reminders).
    MP.store.get('bg', []).forEach(function (id) {
      if (MP.appMeta(id)) loadApp(id).then(function () { setTimeout(runBackground, 1500); }).catch(function () { /* offline */ });
    });

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
      var reloading = false;
      var hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        // The first install also fires this; only a real update needs a refresh.
        if (!hadController) { hadController = true; return; }
        if (reloading) return;
        reloading = true;
        if (!route().id) location.reload();
        else MP.toast('MiniPad was updated. It will refresh when you go Home.', 4000);
      });
      window.addEventListener('hashchange', function () {
        if (reloading && !route().id) location.reload();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
