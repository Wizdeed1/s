/* Sudoku: every puzzle is made on the iPad and has exactly one solution. */
(function () {
  var LEVELS = { easy: 40, medium: 32, hard: 27 };

  // ----- solver (bitmasks, fewest-candidates-first) -----
  function boxOf(i) { return Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3); }
  function countSolutions(grid, limit, randomize, out) {
    var g = grid.slice(), rows = [], cols = [], boxes = [], count = 0;
    for (var k = 0; k < 9; k++) { rows[k] = 0; cols[k] = 0; boxes[k] = 0; }
    for (var i = 0; i < 81; i++) {
      if (g[i]) {
        var bit = 1 << g[i];
        if (rows[(i / 9) | 0] & bit || cols[i % 9] & bit || boxes[boxOf(i)] & bit) return 0;
        rows[(i / 9) | 0] |= bit; cols[i % 9] |= bit; boxes[boxOf(i)] |= bit;
      }
    }
    function solve() {
      var best = -1, bestMask = 0, bestCount = 10;
      for (var i = 0; i < 81; i++) {
        if (g[i]) continue;
        var used = rows[(i / 9) | 0] | cols[i % 9] | boxes[boxOf(i)];
        var mask = (~used) & 0x3FE, c = 0;
        for (var m = mask; m; m &= m - 1) c++;
        if (c < bestCount) { best = i; bestMask = mask; bestCount = c; if (c <= 1) break; }
      }
      if (best < 0) { count++; if (out && count === 1) for (var j = 0; j < 81; j++) out[j] = g[j]; return count >= limit; }
      if (!bestCount) return false;
      var digits = [];
      for (var d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
      if (randomize) digits = MP.shuffle(digits);
      var r = (best / 9) | 0, cc = best % 9, b = boxOf(best);
      for (var x = 0; x < digits.length; x++) {
        var bit = 1 << digits[x];
        g[best] = digits[x]; rows[r] |= bit; cols[cc] |= bit; boxes[b] |= bit;
        if (solve()) return true;
        g[best] = 0; rows[r] &= ~bit; cols[cc] &= ~bit; boxes[b] &= ~bit;
      }
      return false;
    }
    solve();
    return count;
  }
  function makePuzzle(level) {
    var solution = [];
    for (var i = 0; i < 81; i++) solution.push(0);
    countSolutions(solution, 1, true, solution);
    var puzzle = solution.slice();
    var target = LEVELS[level] || 32, givens = 81;
    var order = MP.shuffle(Array.apply(null, Array(81)).map(function (x, i) { return i; }));
    for (var k = 0; k < order.length && givens > target; k++) {
      var c = order[k], keep = puzzle[c];
      puzzle[c] = 0;
      if (countSolutions(puzzle, 2, false) !== 1) puzzle[c] = keep; else givens--;
    }
    return { puzzle: puzzle, solution: solution };
  }

  MP.define('sudoku', {
    mount: function (root, ctx) {
      var st = ctx.get('game', null);
      var sel = -1;
      var notesMode = false;

      function newGame(level) {
        root.innerHTML = '<div class="empty">Making a ' + level + ' puzzle…</div>';
        setTimeout(function () {
          var p = makePuzzle(level);
          st = { level: level, puzzle: p.puzzle, solution: p.solution, entries: p.puzzle.slice(), notes: {}, time: 0, done: false, history: [], hints: 0 };
          sel = -1;
          save();
          render();
        }, 30);
      }
      function save() { ctx.set('game', st); }
      function chooseLevel() {
        return MP.modal({
          title: 'New puzzle',
          html: '<p>How hard?</p>',
          buttons: [{ label: 'Cancel', value: 'cancel' }, { label: 'Easy', value: 'easy' }, { label: 'Medium', value: 'medium' }, { label: 'Hard', value: 'hard', kind: 'primary' }]
        }).then(function (v) { if (v && LEVELS[v]) newGame(v); });
      }
      function peers(i) {
        var r = (i / 9) | 0, c = i % 9, b = boxOf(i);
        return function (j) { return ((j / 9) | 0) === r || j % 9 === c || boxOf(j) === b; };
      }
      function render() {
        if (!st) { chooseLevel(); root.innerHTML = '<div class="empty">Choose how hard the puzzle should be.</div>'; return; }
        ctx.actions('<span class="pill big-num" id="su-time"></span><button type="button" class="btn small" data-act="new">New</button>');
        var isPeer = sel >= 0 ? peers(sel) : function () { return false; };
        var selVal = sel >= 0 ? st.entries[sel] : 0;
        var cells = '';
        for (var i = 0; i < 81; i++) {
          var v = st.entries[i], given = st.puzzle[i] !== 0;
          var cls = 'su-cell';
          if (given) cls += ' given';
          if (i === sel) cls += ' sel';
          else if (selVal && v === selVal) cls += ' same';
          else if (isPeer(i)) cls += ' peer';
          if (!given && v && v !== st.solution[i]) cls += ' bad';
          if (i % 9 === 2 || i % 9 === 5) cls += ' br';
          if (((i / 9) | 0) === 2 || ((i / 9) | 0) === 5) cls += ' bb';
          var inner = v ? String(v) : '';
          if (!v && st.notes[i] && st.notes[i].length) {
            inner = '<span class="su-notes">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
              return '<i>' + (st.notes[i].indexOf(n) >= 0 ? n : '') + '</i>';
            }).join('') + '</span>';
          }
          cells += '<button type="button" class="' + cls + '" data-i="' + i + '">' + inner + '</button>';
        }
        var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        st.entries.forEach(function (v, i) { if (v && v === st.solution[i]) counts[v]++; });
        var pad = '';
        for (var n = 1; n <= 9; n++) {
          pad += '<button type="button" class="su-num' + (counts[n] >= 9 ? ' full' : '') + '" data-n="' + n + '">' + n + '<small>' + (9 - counts[n]) + '</small></button>';
        }
        root.innerHTML = '<div class="su">' +
          '<div class="su-board" id="su-board">' + cells + '</div>' +
          '<div class="su-side"><div class="su-pad">' + pad + '</div>' +
          '<div class="su-tools"><button type="button" class="btn' + (notesMode ? ' on' : '') + '" data-act="notes">✏️ Notes ' + (notesMode ? 'on' : 'off') + '</button>' +
          '<button type="button" class="btn" data-act="erase">⌫ Erase</button>' +
          '<button type="button" class="btn" data-act="undo">↶ Undo</button>' +
          '<button type="button" class="btn" data-act="hint">💡 Hint</button></div>' +
          '<p class="muted small">' + st.level.charAt(0).toUpperCase() + st.level.slice(1) + ' · wrong numbers turn red.</p></div></div>';
        sizeBoard();
        tick();
      }
      function sizeBoard() {
        var b = MP.qs('#su-board', root);
        if (!b) return;
        var wide = root.clientWidth > root.clientHeight;
        var avail = wide ? Math.min(root.clientHeight - 24, root.clientWidth - 340) : Math.min(root.clientWidth - 24, root.clientHeight - 330);
        var size = Math.max(270, Math.floor(avail / 9) * 9);
        b.style.width = size + 'px';
        b.style.height = size + 'px';
        b.style.fontSize = Math.floor(size / 9 * 0.55) + 'px';
      }
      function tick() {
        var t = MP.qs('#su-time');
        if (t && st) t.textContent = MP.fmtDuration(st.time * 1000);
      }
      function setValue(i, n) {
        if (i < 0 || st.puzzle[i] || st.done) return;
        st.history.push({ i: i, v: st.entries[i], notes: (st.notes[i] || []).slice() });
        if (st.history.length > 200) st.history.shift();
        if (notesMode && n) {
          var ns = st.notes[i] || [];
          var k = ns.indexOf(n);
          if (k >= 0) ns.splice(k, 1); else ns.push(n);
          st.notes[i] = ns;
          st.entries[i] = 0;
        } else {
          st.entries[i] = st.entries[i] === n ? 0 : n;
          if (n) {
            // clear this number from notes in the same row, column and box
            var isPeer = peers(i);
            Object.keys(st.notes).forEach(function (j) {
              if (isPeer(+j)) st.notes[j] = st.notes[j].filter(function (x) { return x !== n; });
            });
            if (n !== st.solution[i]) MP.ding(false);
          }
        }
        checkWin();
        save();
        render();
      }
      function checkWin() {
        for (var i = 0; i < 81; i++) if (st.entries[i] !== st.solution[i]) return;
        st.done = true;
        save();
        setTimeout(function () {
          MP.chime();
          MP.modal({
            html: '<div class="center"><div style="font-size:64px">🎉</div><h2>Solved!</h2><p class="muted">Time ' + MP.fmtDuration(st.time * 1000) +
              (st.hints ? ' · ' + st.hints + ' hint' + (st.hints > 1 ? 's' : '') : '') + '</p></div>',
            buttons: [{ label: 'Close', value: 'close' }, { label: 'New puzzle', value: 'new', kind: 'primary' }]
          }).then(function (v) { if (v === 'new') chooseLevel(); });
        }, 300);
      }

      ctx.delegate(root, 'click', '[data-i]', function (e, el) { sel = +el.getAttribute('data-i'); render(); });
      ctx.delegate(root, 'click', '[data-n]', function (e, el) {
        if (sel < 0) { MP.toast('First tap a square on the board.'); return; }
        setValue(sel, +el.getAttribute('data-n'));
      });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        if (act === 'notes') { notesMode = !notesMode; render(); }
        if (act === 'erase' && sel >= 0 && !st.puzzle[sel]) { setValue(sel, 0); st.notes[sel] = []; save(); render(); }
        if (act === 'undo') {
          var h = st.history.pop();
          if (h) { st.entries[h.i] = h.v; st.notes[h.i] = h.notes; st.done = false; sel = h.i; save(); render(); }
        }
        if (act === 'hint') {
          var target = sel >= 0 && !st.puzzle[sel] && st.entries[sel] !== st.solution[sel] ? sel : -1;
          if (target < 0) {
            for (var i = 0; i < 81; i++) if (st.entries[i] !== st.solution[i]) { target = i; break; }
          }
          if (target < 0) return;
          var keep = notesMode;
          notesMode = false;
          st.hints++;
          sel = target;
          st.entries[target] = 0;
          setValue(target, st.solution[target]);
          notesMode = keep;
          render();
        }
      });
      ctx.delegate(ctx.bar, 'click', '[data-act="new"]', function () { chooseLevel(); });
      ctx.every(1000, function () {
        if (st && !st.done && !document.hidden) { st.time++; tick(); if (st.time % 10 === 0) save(); }
      });
      ctx.listen(window, 'resize', function () { setTimeout(sizeBoard, 200); });
      ctx.cleanup(function () { if (st) save(); });
      render();
    }
  });
})();
