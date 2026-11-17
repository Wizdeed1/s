/* Piano: two octaves, several instruments, "learn a song" lights, and a recorder. */
(function () {
  var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midi(n) { var m = /^([A-G]#?)(\d)$/.exec(n); return NAMES.indexOf(m[1]) + 12 * (+m[2] + 1); }
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // Old public-domain tunes, as [note, beats].
  var SONGS = {
    'Twinkle, Twinkle': 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2',
    'Mary Had a Little Lamb': 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:2',
    'Ode to Joy': 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2',
    'Happy Birthday': 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 F5:0.75 F5:0.25 E5 C5 D5 C5:2',
    'Jingle Bells': 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2'
  };
  function parseSong(s) {
    return s.split(' ').map(function (t) { var p = t.split(':'); return { m: midi(p[0]), b: p[1] ? +p[1] : 1 }; });
  }
  var INSTR = {
    piano: { label: 'Piano', play: function (f, c, t) {
      MP.tone(f, 1.6, { type: 'triangle', vol: 0.32, at: t, attack: 0.005 });
      MP.tone(f * 2, 0.6, { type: 'sine', vol: 0.08, at: t, attack: 0.005 });
    } },
    organ: { label: 'Organ', play: function (f, c, t) {
      MP.tone(f, 0.9, { type: 'sine', vol: 0.22, at: t, attack: 0.03 });
      MP.tone(f * 2, 0.9, { type: 'sine', vol: 0.12, at: t, attack: 0.03 });
      MP.tone(f * 3, 0.9, { type: 'sine', vol: 0.06, at: t, attack: 0.03 });
    } },
    box: { label: 'Music box', play: function (f, c, t) {
      MP.tone(f * 2, 1.2, { type: 'sine', vol: 0.25, at: t, attack: 0.002 });
      MP.tone(f * 6, 0.3, { type: 'sine', vol: 0.05, at: t, attack: 0.002 });
    } },
    synth: { label: 'Synth', play: function (f, c, t) {
      MP.tone(f, 0.7, { type: 'sawtooth', vol: 0.12, at: t, attack: 0.01 });
      MP.tone(f * 1.005, 0.7, { type: 'square', vol: 0.06, at: t, attack: 0.01 });
    } }
  };

  MP.define('piano', {
    mount: function (root, ctx) {
      var instr = ctx.get('instr', 'piano');
      var base = ctx.get('base', 60);  // C4
      var labels = ctx.get('labels', true);
      var learn = null;   // {notes, i}
      var rec = null, recording = false, playTimers = [];
      var touches = {};

      function keysHtml() {
        var whites = [], blacks = [];
        for (var m = base; m <= base + 24; m++) {
          var n = NAMES[m % 12];
          if (n.length === 1) whites.push(m); else blacks.push(m);
        }
        var w = 100 / whites.length, html = '';
        whites.forEach(function (m, i) {
          html += '<div class="pk white" data-m="' + m + '" style="left:' + (i * w) + '%;width:' + w + '%">' +
            (labels ? '<span>' + NAMES[m % 12] + (NAMES[m % 12] === 'C' ? (Math.floor(m / 12) - 1) : '') + '</span>' : '') + '</div>';
        });
        blacks.forEach(function (m) {
          var idx = whites.indexOf(m - 1);
          html += '<div class="pk black" data-m="' + m + '" style="left:' + ((idx + 1) * w - w * 0.3) + '%;width:' + (w * 0.6) + '%"></div>';
        });
        return html;
      }
      function render() {
        ctx.actions('');
        root.innerHTML = '<div class="pn">' +
          '<div class="pn-bar">' +
          '<div class="tabs pn-instr">' + Object.keys(INSTR).map(function (k) {
            return '<button type="button" class="tab" data-instr="' + k + '" aria-selected="' + (k === instr) + '">' + INSTR[k].label + '</button>';
          }).join('') + '</div>' +
          '<div class="hstack"><button type="button" class="btn" data-act="down">◀ Lower</button><button type="button" class="btn" data-act="up">Higher ▶</button>' +
          '<button type="button" class="btn' + (labels ? ' on' : '') + '" data-act="labels">Letters</button>' +
          '<button type="button" class="btn" data-act="learn">🎵 Learn a song</button>' +
          '<button type="button" class="btn' + (recording ? ' on' : '') + '" data-act="rec">' + (recording ? '■ Stop recording' : '⏺ Record') + '</button>' +
          (rec && rec.length && !recording ? '<button type="button" class="btn" data-act="playrec">▶ Play my tune</button>' : '') + '</div>' +
          '<div class="pn-learn" id="pn-learn">' + (learn ? learnText() : '') + '</div></div>' +
          '<div class="pn-keys" id="pn-keys">' + keysHtml() + '</div></div>';
        markNext();
      }
      function learnText() {
        return '<b>' + MP.esc(learn.title) + '</b> · note ' + Math.min(learn.i + 1, learn.notes.length) + ' of ' + learn.notes.length +
          ' · press the glowing key <button type="button" class="btn small" data-act="demo">▶ Hear it</button> <button type="button" class="btn small ghost" data-act="stoplearn">Stop</button>';
      }
      function markNext() {
        MP.qsa('.pk.next', root).forEach(function (k) { k.classList.remove('next'); });
        if (!learn || learn.i >= learn.notes.length) return;
        var m = learn.notes[learn.i].m;
        while (m < base) m += 12;
        while (m > base + 24) m -= 12;
        var key = root.querySelector('.pk[data-m="' + m + '"]');
        if (key) key.classList.add('next');
      }
      function play(m, at) {
        var c = MP.audio();
        if (!c) return;
        INSTR[instr].play(freq(m), c, at || c.currentTime);
        if (recording) rec.push({ m: m, t: Date.now() });
        if (learn && !at) {
          var want = learn.notes[learn.i];
          if (want && (want.m - m) % 12 === 0) {
            learn.i++;
            if (learn.i >= learn.notes.length) {
              setTimeout(function () { MP.chime(); MP.toast('You played the whole song! 🎉'); }, 400);
              learn = null;
            }
            var box = MP.qs('#pn-learn', root);
            if (box) box.innerHTML = learn ? learnText() : '';
            markNext();
          }
        }
      }
      function flash(m, on) {
        var k = root.querySelector('.pk[data-m="' + m + '"]');
        if (k) k.classList.toggle('down', on);
      }
      function keyAt(x, y) {
        var el = document.elementFromPoint(x, y);
        var k = el && el.closest ? el.closest('.pk') : null;
        return k ? +k.getAttribute('data-m') : null;
      }
      function stopPlayback() { playTimers.forEach(clearTimeout); playTimers = []; }
      function demo(notes, bpm) {
        stopPlayback();
        var c = MP.audio();
        if (!c) return;
        var t = 0, beat = 60 / (bpm || 100);
        notes.forEach(function (n) {
          (function (n, delay) {
            playTimers.push(setTimeout(function () { play(n.m, c.currentTime); flash(n.m, true); setTimeout(function () { flash(n.m, false); }, 200); }, delay * 1000));
          })(n, t);
          t += n.b * beat;
        });
      }

      ctx.listen(root, 'touchstart', function (e) {
        if (!e.target.closest || !e.target.closest('.pn-keys')) return;
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i], m = keyAt(t.clientX, t.clientY);
          if (m == null) continue;
          touches[t.identifier] = m;
          play(m); flash(m, true);
        }
      }, { passive: false });
      ctx.listen(root, 'touchmove', function (e) {
        if (!e.target.closest || !e.target.closest('.pn-keys')) return;
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i], m = keyAt(t.clientX, t.clientY);
          if (m == null || touches[t.identifier] === m) continue;
          if (touches[t.identifier] != null) flash(touches[t.identifier], false);
          touches[t.identifier] = m;
          play(m); flash(m, true);
        }
      }, { passive: false });
      function release(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var id = e.changedTouches[i].identifier;
          if (touches[id] != null) flash(touches[id], false);
          delete touches[id];
        }
      }
      ctx.listen(root, 'touchend', release);
      ctx.listen(root, 'touchcancel', release);
      ctx.listen(root, 'mousedown', function (e) {
        var k = e.target.closest ? e.target.closest('.pk') : null;
        if (!k) return;
        var m = +k.getAttribute('data-m');
        play(m); flash(m, true);
        setTimeout(function () { flash(m, false); }, 180);
      });

      ctx.delegate(root, 'click', '[data-instr]', function (e, el) { instr = el.getAttribute('data-instr'); ctx.set('instr', instr); render(); });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        if (act === 'down' && base > 36) { base -= 12; ctx.set('base', base); render(); }
        if (act === 'up' && base < 72) { base += 12; ctx.set('base', base); render(); }
        if (act === 'labels') { labels = !labels; ctx.set('labels', labels); render(); }
        if (act === 'rec') {
          if (!recording) { rec = []; recording = true; MP.toast('Recording. Play your tune!'); }
          else { recording = false; MP.toast(rec.length ? 'Saved ' + rec.length + ' notes.' : 'Nothing was recorded.'); }
          render();
        }
        if (act === 'playrec' && rec && rec.length) {
          stopPlayback();
          var c = MP.audio(), t0 = rec[0].t;
          rec.forEach(function (n) {
            playTimers.push(setTimeout(function () {
              INSTR[instr].play(freq(n.m), c, c.currentTime);
              flash(n.m, true); setTimeout(function () { flash(n.m, false); }, 180);
            }, n.t - t0));
          });
        }
        if (act === 'learn') {
          var titles = Object.keys(SONGS);
          MP.modal({
            title: 'Learn a song',
            html: '<div class="vstack">' + titles.map(function (t) { return '<button type="button" class="btn wide" data-v="' + MP.esc(t) + '">🎵 ' + MP.esc(t) + '</button>'; }).join('') + '</div>',
            buttons: [{ label: 'Cancel', value: '' }]
          }).then(function (v) {
            if (!v || !SONGS[v]) return;
            learn = { title: v, notes: parseSong(SONGS[v]), i: 0 };
            if (base !== 60) { base = 60; ctx.set('base', base); }
            render();
          });
        }
        if (act === 'demo' && learn) demo(learn.notes.slice(learn.i), 110);
        if (act === 'stoplearn') { learn = null; stopPlayback(); render(); }
      });
      ctx.cleanup(stopPlayback);
      render();
    }
  });
})();
