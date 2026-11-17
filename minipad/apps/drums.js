/* Drum pad: eight synthesized drums you can hit with several fingers, plus a 16-step beat maker. */
(function () {
  function kick(t) {
    var c = MP.audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.5);
  }
  function tom(t, f1, f2) {
    var c = MP.audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + 0.25);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.4);
  }
  var DRUMS = [
    { id: 'kick', label: 'Kick', color: '#ef476f', hit: kick },
    { id: 'snare', label: 'Snare', color: '#ffd166', hit: function (t) {
      MP.noiseBurst(0.2, { filter: 'highpass', freq: 1200, vol: 0.5, at: t });
      MP.tone(185, 0.12, { type: 'triangle', vol: 0.3, at: t, attack: 0.002 });
    } },
    { id: 'hat', label: 'Hi-hat', color: '#06d6a0', hit: function (t) { MP.noiseBurst(0.05, { filter: 'highpass', freq: 7500, vol: 0.35, at: t }); } },
    { id: 'open', label: 'Open hat', color: '#118ab2', hit: function (t) { MP.noiseBurst(0.35, { filter: 'highpass', freq: 7000, vol: 0.3, at: t }); } },
    { id: 'clap', label: 'Clap', color: '#f78c6b', hit: function (t) {
      for (var i = 0; i < 3; i++) MP.noiseBurst(0.03, { filter: 'bandpass', freq: 1500, q: 0.8, vol: 0.5, at: t + i * 0.012 });
      MP.noiseBurst(0.22, { filter: 'bandpass', freq: 1400, q: 0.8, vol: 0.35, at: t + 0.04 });
    } },
    { id: 'tomlo', label: 'Low tom', color: '#9b5de5', hit: function (t) { tom(t, 160, 95); } },
    { id: 'tomhi', label: 'High tom', color: '#f15bb5', hit: function (t) { tom(t, 260, 170); } },
    { id: 'bell', label: 'Cowbell', color: '#00bbf9', hit: function (t) {
      MP.tone(560, 0.3, { type: 'square', vol: 0.08, at: t, attack: 0.002 });
      MP.tone(845, 0.3, { type: 'square', vol: 0.06, at: t, attack: 0.002 });
    } }
  ];
  var ROWS = ['kick', 'snare', 'hat', 'clap'];
  var PATTERNS = {
    Rock: { kick: [0, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [] },
    Disco: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], clap: [4, 12] },
    'Hip hop': { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [12] },
    Empty: { kick: [], snare: [], hat: [], clap: [] }
  };
  function drum(id) { return DRUMS.filter(function (d) { return d.id === id; })[0]; }

  MP.define('drums', {
    mount: function (root, ctx) {
      var grid = ctx.get('grid', null);
      if (!grid) { grid = {}; ROWS.forEach(function (r) { grid[r] = []; for (var i = 0; i < 16; i++) grid[r].push(PATTERNS.Rock[r].indexOf(i) >= 0); }); }
      var bpm = ctx.get('bpm', 100);
      var playing = false, step = 0, nextTime = 0, timer = null;

      function render() {
        root.innerHTML = '<div class="dm">' +
          '<div class="dm-pads">' + DRUMS.map(function (d) {
            return '<div class="dm-pad" data-d="' + d.id + '" style="background:' + d.color + '">' + d.label + '</div>';
          }).join('') + '</div>' +
          '<div class="card dm-seq"><div class="hstack"><button type="button" class="btn primary" data-act="play">' + (playing ? '■ Stop' : '▶ Play beat') + '</button>' +
          '<span class="muted">Speed</span><input type="range" id="dm-bpm" min="60" max="170" step="1" value="' + bpm + '" style="width:180px"><b id="dm-bpmv">' + bpm + '</b>' +
          Object.keys(PATTERNS).map(function (p) { return '<button type="button" class="btn small" data-pat="' + p + '">' + p + '</button>'; }).join('') + '</div>' +
          ROWS.map(function (r) {
            return '<div class="dm-row"><span class="dm-lbl">' + drum(r).label + '</span>' + grid[r].map(function (on, i) {
              return '<button type="button" class="dm-step' + (on ? ' on' : '') + (i % 4 === 0 ? ' beat' : '') + '" data-r="' + r + '" data-i="' + i + '" style="' + (on ? 'background:' + drum(r).color : '') + '"></button>';
            }).join('') + '</div>';
          }).join('') + '</div></div>';
        ctx.listen(MP.qs('#dm-bpm', root), 'input', function (e) {
          bpm = +e.target.value;
          MP.qs('#dm-bpmv', root).textContent = bpm;
          ctx.set('bpm', bpm);
        });
      }
      function flash(id) {
        var p = root.querySelector('.dm-pad[data-d="' + id + '"]');
        if (!p) return;
        p.classList.add('hit');
        setTimeout(function () { p.classList.remove('hit'); }, 110);
      }
      function schedule() {
        var c = MP.audio();
        if (!c || !playing) return;
        while (nextTime < c.currentTime + 0.12) {
          var s = step;
          ROWS.forEach(function (r) { if (grid[r][s]) drum(r).hit(nextTime); });
          (function (s, when) {
            setTimeout(function () {
              MP.qsa('.dm-step.now', root).forEach(function (b) { b.classList.remove('now'); });
              MP.qsa('.dm-step[data-i="' + s + '"]', root).forEach(function (b) { b.classList.add('now'); });
            }, Math.max(0, (when - c.currentTime) * 1000));
          })(s, nextTime);
          nextTime += 60 / bpm / 4;
          step = (step + 1) % 16;
        }
      }
      function start() {
        var c = MP.audio();
        if (!c) return;
        playing = true; step = 0; nextTime = c.currentTime + 0.05;
        timer = setInterval(schedule, 25);
        schedule();
      }
      function stop() {
        playing = false;
        clearInterval(timer);
        MP.qsa('.dm-step.now', root).forEach(function (b) { b.classList.remove('now'); });
      }

      ctx.listen(root, 'touchstart', function (e) {
        var hit = false;
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          var el = document.elementFromPoint(t.clientX, t.clientY);
          var pad = el && el.closest ? el.closest('.dm-pad') : null;
          if (pad) {
            hit = true;
            var id = pad.getAttribute('data-d'), c = MP.audio();
            if (c) drum(id).hit(c.currentTime);
            flash(id);
          }
        }
        if (hit) e.preventDefault();
      }, { passive: false });
      ctx.listen(root, 'mousedown', function (e) {
        var pad = e.target.closest ? e.target.closest('.dm-pad') : null;
        if (pad) { var id = pad.getAttribute('data-d'); var c = MP.audio(); if (c) drum(id).hit(c.currentTime); flash(id); }
      });
      ctx.delegate(root, 'click', '[data-r]', function (e, el) {
        var r = el.getAttribute('data-r'), i = +el.getAttribute('data-i');
        grid[r][i] = !grid[r][i];
        ctx.set('grid', grid);
        el.classList.toggle('on', grid[r][i]);
        el.style.background = grid[r][i] ? drum(r).color : '';
      });
      ctx.delegate(root, 'click', '[data-pat]', function (e, el) {
        var p = PATTERNS[el.getAttribute('data-pat')];
        ROWS.forEach(function (r) { for (var i = 0; i < 16; i++) grid[r][i] = p[r].indexOf(i) >= 0; });
        ctx.set('grid', grid);
        render();
      });
      ctx.delegate(root, 'click', '[data-act="play"]', function (e, el) {
        if (playing) stop(); else start();
        el.textContent = playing ? '■ Stop' : '▶ Play beat';
      });
      ctx.cleanup(stop);
      render();
    }
  });
})();
