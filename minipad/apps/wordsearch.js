/* Word search: drag across the letters (or tap the first and last letter). */
(function () {
  var THEMES = {
    Animals: ['LION', 'TIGER', 'ZEBRA', 'HORSE', 'RABBIT', 'MONKEY', 'GIRAFFE', 'PANDA', 'KOALA', 'OTTER', 'EAGLE', 'SHARK', 'CAMEL', 'MOUSE'],
    Food: ['APPLE', 'BREAD', 'CHEESE', 'PASTA', 'SALAD', 'BANANA', 'CARROT', 'PIZZA', 'HONEY', 'LEMON', 'GRAPE', 'MELON', 'BUTTER', 'RICE'],
    Colours: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'BROWN', 'BLACK', 'WHITE', 'SILVER', 'GOLD', 'GREY', 'VIOLET'],
    Space: ['SUN', 'MOON', 'STAR', 'PLANET', 'COMET', 'ROCKET', 'ORBIT', 'GALAXY', 'MARS', 'VENUS', 'SATURN', 'EARTH', 'METEOR', 'ALIEN'],
    Sports: ['SOCCER', 'TENNIS', 'GOLF', 'RUGBY', 'HOCKEY', 'BOXING', 'SKIING', 'SURFING', 'CRICKET', 'KARATE', 'ROWING', 'CYCLING', 'SWIM', 'JUDO'],
    Home: ['KITCHEN', 'TABLE', 'CHAIR', 'SOFA', 'LAMP', 'WINDOW', 'DOOR', 'CARPET', 'PILLOW', 'MIRROR', 'SHELF', 'CLOCK', 'GARDEN', 'STAIRS'],
    Weather: ['RAIN', 'SNOW', 'WIND', 'CLOUD', 'STORM', 'SUNNY', 'FROST', 'THUNDER', 'RAINBOW', 'FOG', 'HAIL', 'BREEZE', 'MIST', 'ICE']
  };
  var LEVELS = {
    easy: { n: 8, words: 6, dirs: [[0, 1], [1, 0]] },
    medium: { n: 10, words: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
    hard: { n: 12, words: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] }
  };
  var HUES = ['#ffd166', '#8ecae6', '#f4a3c4', '#a7e3a1', '#c9b6f2', '#ffb38a', '#9be7e1', '#f7e08f', '#b8d8ff', '#f6b5b5'];

  function build(theme, level) {
    var L = LEVELS[level], n = L.n, grid = [];
    for (var i = 0; i < n * n; i++) grid.push('');
    var pool = MP.shuffle(THEMES[theme].filter(function (w) { return w.length <= n; })).slice(0, L.words)
      .sort(function (a, b) { return b.length - a.length; });
    var placed = [];
    pool.forEach(function (w) {
      for (var tries = 0; tries < 300; tries++) {
        var d = MP.pick(L.dirs);
        var r = MP.rand(0, n - 1), c = MP.rand(0, n - 1);
        var er = r + d[0] * (w.length - 1), ec = c + d[1] * (w.length - 1);
        if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
        var ok = true, k;
        for (k = 0; k < w.length; k++) {
          var cell = grid[(r + d[0] * k) * n + c + d[1] * k];
          if (cell && cell !== w[k]) { ok = false; break; }
        }
        if (!ok) continue;
        var cells = [];
        for (k = 0; k < w.length; k++) {
          var idx = (r + d[0] * k) * n + c + d[1] * k;
          grid[idx] = w[k];
          cells.push(idx);
        }
        placed.push({ w: w, cells: cells });
        return;
      }
    });
    var abc = 'ABCDEFGHIJKLMNOPRSTUWY';
    for (var j = 0; j < grid.length; j++) if (!grid[j]) grid[j] = abc.charAt(MP.rand(0, abc.length - 1));
    return { theme: theme, level: level, n: n, grid: grid, words: placed.map(function (p) { return p.w; }).sort(), found: [] };
  }

  MP.define('wordsearch', {
    mount: function (root, ctx) {
      var g = ctx.get('game', null);
      var startIdx = -1, line = [], anchor = -1, dragging = false, moved = false;

      function save() { ctx.set('game', g); }
      function newGame() {
        var themes = Object.keys(THEMES);
        MP.form({
          title: 'New word search',
          fields: [
            { name: 'theme', label: 'Theme', type: 'select', options: themes, value: g ? g.theme : 'Animals' },
            { name: 'level', label: 'Level', type: 'select', options: [{ value: 'easy', label: 'Easy (across and down)' }, { value: 'medium', label: 'Medium (also diagonal)' }, { value: 'hard', label: 'Hard (also backwards)' }], value: g ? g.level : 'easy' }
          ],
          ok: 'Start'
        }).then(function (v) {
          if (!v || v === 'delete') return;
          g = build(v.theme, v.level);
          save();
          render();
        });
      }
      function cellsBetween(a, b) {
        var n = g.n, ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
        var dr = br - ar, dc = bc - ac;
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
          // snap to the nearest of the eight directions
          if (Math.abs(dr) > Math.abs(dc) * 2) dc = 0;
          else if (Math.abs(dc) > Math.abs(dr) * 2) dr = 0;
          else { var m = Math.min(Math.abs(dr), Math.abs(dc)); dr = m * Math.sign(dr); dc = m * Math.sign(dc); }
        }
        var steps = Math.max(Math.abs(dr), Math.abs(dc));
        var sr = steps ? dr / steps : 0, sc = steps ? dc / steps : 0, out = [];
        for (var k = 0; k <= steps; k++) out.push((ar + sr * k) * n + ac + sc * k);
        return out;
      }
      function render() {
        if (!g) { root.innerHTML = '<div class="empty">Pick a theme to start.</div>'; newGame(); return; }
        ctx.actions('<button type="button" class="btn small" data-act="new">New puzzle</button>');
        var colorOf = {};
        g.found.forEach(function (f, i) { f.cells.forEach(function (c) { colorOf[c] = HUES[i % HUES.length]; }); });
        root.innerHTML = '<div class="ws">' +
          '<div class="ws-grid" id="ws-grid" style="grid-template-columns:repeat(' + g.n + ',1fr)">' + g.grid.map(function (ch, i) {
            return '<div class="ws-cell" data-c="' + i + '"' + (colorOf[i] ? ' style="background:' + colorOf[i] + '"' : '') + '>' + ch + '</div>';
          }).join('') + '</div>' +
          '<div class="ws-side"><h2>' + MP.esc(g.theme) + '</h2><div class="ws-words">' + g.words.map(function (w) {
            var done = g.found.some(function (f) { return f.w === w; });
            return '<span class="ws-word' + (done ? ' done' : '') + '">' + w + '</span>';
          }).join('') + '</div><p class="muted small">' + g.found.length + ' of ' + g.words.length + ' found. Drag along a word, or tap its first and last letter.</p></div></div>';
        size();
      }
      function size() {
        var el = MP.qs('#ws-grid', root);
        if (!el) return;
        var wide = root.clientWidth > root.clientHeight;
        var avail = wide ? Math.min(root.clientHeight - 24, root.clientWidth - 300) : Math.min(root.clientWidth - 24, root.clientHeight - 260);
        var s = Math.max(260, avail);
        el.style.width = s + 'px';
        el.style.height = s + 'px';
        el.style.fontSize = Math.floor(s / g.n * 0.5) + 'px';
      }
      function paintLine(cells) {
        MP.qsa('.ws-cell.sel', root).forEach(function (c) { c.classList.remove('sel'); });
        cells.forEach(function (i) { var c = root.querySelector('[data-c="' + i + '"]'); if (c) c.classList.add('sel'); });
      }
      function cellAt(x, y) {
        var el = document.elementFromPoint(x, y);
        return el && el.getAttribute && el.getAttribute('data-c') != null ? +el.getAttribute('data-c') : -1;
      }
      function finish(cells) {
        paintLine([]);
        if (cells.length < 2) return false;
        var word = cells.map(function (i) { return g.grid[i]; }).join('');
        var rev = word.split('').reverse().join('');
        var hit = g.words.filter(function (w) {
          return (w === word || w === rev) && !g.found.some(function (f) { return f.w === w; });
        })[0];
        if (!hit) { MP.tone(200, 0.15, { type: 'square', vol: 0.08 }); return false; }
        g.found.push({ w: hit, cells: cells });
        MP.ding();
        save();
        render();
        if (g.found.length === g.words.length) {
          setTimeout(function () {
            MP.chime();
            MP.modal({ html: '<div class="center"><div style="font-size:64px">🎉</div><h2>You found them all!</h2></div>',
              buttons: [{ label: 'Close', value: 'x' }, { label: 'New puzzle', value: 'new', kind: 'primary' }] })
              .then(function (v) { if (v === 'new') newGame(); });
          }, 400);
        }
        return true;
      }
      function down(x, y) {
        var c = cellAt(x, y);
        if (c < 0) return;
        dragging = true; moved = false; startIdx = c; line = [c];
        paintLine(anchor >= 0 ? cellsBetween(anchor, c) : line);
      }
      function over(x, y) {
        if (!dragging) return;
        var c = cellAt(x, y);
        if (c < 0) return;
        if (c !== startIdx) moved = true;
        line = cellsBetween(startIdx, c);
        paintLine(line);
      }
      function up() {
        if (!dragging) return;
        dragging = false;
        if (moved) { anchor = -1; finish(line); return; }
        // a tap: first tap sets the start, second tap ends the word
        if (anchor < 0) { anchor = startIdx; paintLine([anchor]); return; }
        var cells = cellsBetween(anchor, startIdx);
        anchor = -1;
        if (!finish(cells)) paintLine([]);
      }

      ctx.listen(root, 'touchstart', function (e) {
        if (!e.target.closest || !e.target.closest('.ws-grid')) return;
        e.preventDefault();
        var t = e.touches[0];
        down(t.clientX, t.clientY);
      }, { passive: false });
      ctx.listen(root, 'touchmove', function (e) {
        if (!dragging) return;
        e.preventDefault();
        var t = e.touches[0];
        over(t.clientX, t.clientY);
      }, { passive: false });
      ctx.listen(root, 'touchend', function () { up(); });
      ctx.listen(root, 'mousedown', function (e) { if (e.target.closest && e.target.closest('.ws-grid')) down(e.clientX, e.clientY); });
      ctx.listen(root, 'mousemove', function (e) { over(e.clientX, e.clientY); });
      ctx.listen(window, 'mouseup', function () { up(); });
      ctx.listen(window, 'resize', function () { setTimeout(size, 200); });
      ctx.delegate(ctx.bar, 'click', '[data-act="new"]', function () { newGame(); });
      render();
    }
  });
})();
