/* Chess: full rules (castling, en passant, promotion, check, mate, draws),
   a small alpha-beta computer player, or two players on one iPad. */
(function () {
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  var KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  function isWhite(p) { return p && p === p.toUpperCase(); }
  function colorOf(p) { return p ? (isWhite(p) ? 'w' : 'b') : null; }
  function sq(r, c) { return r * 8 + c; }
  function name(i) { return 'abcdefgh'.charAt(i % 8) + (8 - ((i / 8) | 0)); }

  var E = {};
  E.start = function () { return E.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); };
  E.fromFEN = function (fen) {
    var parts = fen.split(' '), board = [];
    parts[0].split('/').forEach(function (row) {
      row.split('').forEach(function (ch) {
        if (/\d/.test(ch)) for (var k = 0; k < +ch; k++) board.push('');
        else board.push(ch);
      });
    });
    var cs = parts[2] || '-';
    var ep = parts[3] && parts[3] !== '-' ? sq(8 - +parts[3].charAt(1), 'abcdefgh'.indexOf(parts[3].charAt(0))) : -1;
    return { b: board, turn: parts[1] || 'w', cs: { K: cs.indexOf('K') >= 0, Q: cs.indexOf('Q') >= 0, k: cs.indexOf('k') >= 0, q: cs.indexOf('q') >= 0 },
      ep: ep, half: +(parts[4] || 0), full: +(parts[5] || 1) };
  };
  E.attacked = function (b, i, by) {
    var r = (i / 8) | 0, c = i % 8, k, rr, cc, p;
    // pawns
    var pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[sq(pr, c - 1)] === pawn) return true;
      if (c < 7 && b[sq(pr, c + 1)] === pawn) return true;
    }
    var kn = by === 'w' ? 'N' : 'n', kg = by === 'w' ? 'K' : 'k';
    for (k = 0; k < 8; k++) {
      rr = r + KNIGHT[k][0]; cc = c + KNIGHT[k][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[sq(rr, cc)] === kn) return true;
      rr = r + KING[k][0]; cc = c + KING[k][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[sq(rr, cc)] === kg) return true;
    }
    var rook = by === 'w' ? 'R' : 'r', bish = by === 'w' ? 'B' : 'b', queen = by === 'w' ? 'Q' : 'q';
    for (k = 0; k < 4; k++) {
      rr = r + ORTHO[k][0]; cc = c + ORTHO[k][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[sq(rr, cc)];
        if (p) { if (p === rook || p === queen) return true; break; }
        rr += ORTHO[k][0]; cc += ORTHO[k][1];
      }
      rr = r + DIAG[k][0]; cc = c + DIAG[k][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[sq(rr, cc)];
        if (p) { if (p === bish || p === queen) return true; break; }
        rr += DIAG[k][0]; cc += DIAG[k][1];
      }
    }
    return false;
  };
  E.kingSq = function (b, color) { return b.indexOf(color === 'w' ? 'K' : 'k'); };
  E.inCheck = function (s) { return E.attacked(s.b, E.kingSq(s.b, s.turn), s.turn === 'w' ? 'b' : 'w'); };
  E.pseudo = function (s) {
    var b = s.b, me = s.turn, them = me === 'w' ? 'b' : 'w', out = [];
    function add(f, t, extra) {
      var m = { f: f, t: t, p: b[f], x: b[t] };
      if (extra) for (var k in extra) m[k] = extra[k];
      out.push(m);
    }
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p || colorOf(p) !== me) continue;
      var r = (i / 8) | 0, c = i % 8, t = p.toLowerCase(), k, rr, cc, j;
      if (t === 'p') {
        var dir = me === 'w' ? -1 : 1, startRow = me === 'w' ? 6 : 1, lastRow = me === 'w' ? 0 : 7;
        rr = r + dir;
        if (rr >= 0 && rr < 8) {
          j = sq(rr, c);
          if (!b[j]) {
            if (rr === lastRow) ['q', 'r', 'b', 'n'].forEach(function (pp) { add(i, j, { promo: pp }); });
            else {
              add(i, j);
              var j2 = sq(r + 2 * dir, c);
              if (r === startRow && !b[j2]) add(i, j2, { dbl: true });
            }
          }
          [-1, 1].forEach(function (dc) {
            cc = c + dc;
            if (cc < 0 || cc > 7) return;
            var jj = sq(rr, cc);
            if (b[jj] && colorOf(b[jj]) === them) {
              if (rr === lastRow) ['q', 'r', 'b', 'n'].forEach(function (pp) { add(i, jj, { promo: pp }); });
              else add(i, jj);
            } else if (jj === s.ep) add(i, jj, { ep: true, x: me === 'w' ? 'p' : 'P' });
          });
        }
      } else if (t === 'n' || t === 'k') {
        var steps = t === 'n' ? KNIGHT : KING;
        for (k = 0; k < 8; k++) {
          rr = r + steps[k][0]; cc = c + steps[k][1];
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          j = sq(rr, cc);
          if (!b[j] || colorOf(b[j]) === them) add(i, j);
        }
        if (t === 'k') {
          var home = me === 'w' ? 60 : 4;
          if (i === home && !E.attacked(b, i, them)) {
            var K = me === 'w' ? 'K' : 'k', Q = me === 'w' ? 'Q' : 'q';
            if (s.cs[K] && !b[i + 1] && !b[i + 2] && b[i + 3] === (me === 'w' ? 'R' : 'r') &&
              !E.attacked(b, i + 1, them) && !E.attacked(b, i + 2, them)) add(i, i + 2, { castle: 'k' });
            if (s.cs[Q] && !b[i - 1] && !b[i - 2] && !b[i - 3] && b[i - 4] === (me === 'w' ? 'R' : 'r') &&
              !E.attacked(b, i - 1, them) && !E.attacked(b, i - 2, them)) add(i, i - 2, { castle: 'q' });
          }
        }
      } else {
        var dirs = t === 'r' ? ORTHO : t === 'b' ? DIAG : ORTHO.concat(DIAG);
        for (k = 0; k < dirs.length; k++) {
          rr = r + dirs[k][0]; cc = c + dirs[k][1];
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            j = sq(rr, cc);
            if (b[j]) { if (colorOf(b[j]) === them) add(i, j); break; }
            add(i, j);
            rr += dirs[k][0]; cc += dirs[k][1];
          }
        }
      }
    }
    return out;
  };
  E.make = function (s, m) {
    var b = s.b.slice(), me = s.turn;
    var cs = { K: s.cs.K, Q: s.cs.Q, k: s.cs.k, q: s.cs.q };
    b[m.t] = m.promo ? (me === 'w' ? m.promo.toUpperCase() : m.promo) : b[m.f];
    b[m.f] = '';
    if (m.ep) b[m.t + (me === 'w' ? 8 : -8)] = '';
    if (m.castle === 'k') { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = ''; }
    if (m.castle === 'q') { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = ''; }
    var lp = m.p.toLowerCase();
    if (lp === 'k') { if (me === 'w') { cs.K = false; cs.Q = false; } else { cs.k = false; cs.q = false; } }
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(function (x) { if (m.f === x[0] || m.t === x[0]) cs[x[1]] = false; });
    return {
      b: b, turn: me === 'w' ? 'b' : 'w', cs: cs,
      ep: m.dbl ? (m.f + m.t) / 2 : -1,
      half: lp === 'p' || m.x ? 0 : s.half + 1,
      full: s.full + (me === 'b' ? 1 : 0)
    };
  };
  E.legal = function (s) {
    return E.pseudo(s).filter(function (m) {
      var n = E.make(s, m);
      return !E.attacked(n.b, E.kingSq(n.b, s.turn), n.turn);
    });
  };
  E.perft = function (s, d) {
    if (!d) return 1;
    var ms = E.legal(s), n = 0;
    if (d === 1) return ms.length;
    for (var i = 0; i < ms.length; i++) n += E.perft(E.make(s, ms[i]), d - 1);
    return n;
  };
  E.key = function (s) {
    return s.b.join(',') + s.turn + (s.cs.K ? 'K' : '') + (s.cs.Q ? 'Q' : '') + (s.cs.k ? 'k' : '') + (s.cs.q ? 'q' : '') + s.ep;
  };
  E.evaluate = function (s) {
    var score = 0;
    for (var i = 0; i < 64; i++) {
      var p = s.b[i];
      if (!p) continue;
      var t = p.toLowerCase();
      if (isWhite(p)) score += VAL[t] + PST[t][i];
      else score -= VAL[t] + PST[t][(7 - ((i / 8) | 0)) * 8 + (i % 8)];
    }
    return s.turn === 'w' ? score : -score;
  };
  function order(ms) {
    return ms.sort(function (a, b) {
      var va = (a.x ? VAL[a.x.toLowerCase()] * 10 - VAL[a.p.toLowerCase()] : 0) + (a.promo ? 800 : 0);
      var vb = (b.x ? VAL[b.x.toLowerCase()] * 10 - VAL[b.p.toLowerCase()] : 0) + (b.promo ? 800 : 0);
      return vb - va;
    });
  }
  E.search = function (s, depth, noise) {
    var nodes = 0, LIMIT = 60000;
    function quiesce(st, alpha, beta, qd) {
      nodes++;
      var stand = E.evaluate(st);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      if (qd <= 0 || nodes > LIMIT) return alpha;
      // captures only; check that each one leaves our king safe
      var caps = order(E.pseudo(st).filter(function (m) { return m.x || m.promo; }));
      for (var i = 0; i < caps.length; i++) {
        var n = E.make(st, caps[i]);
        if (E.attacked(n.b, E.kingSq(n.b, st.turn), n.turn)) continue;
        var v = -quiesce(n, -beta, -alpha, qd - 1);
        if (v >= beta) return beta;
        if (v > alpha) alpha = v;
      }
      return alpha;
    }
    function nega(st, d, alpha, beta, ply) {
      nodes++;
      if (d <= 0) return quiesce(st, alpha, beta, 3);
      var ms = E.legal(st);
      if (!ms.length) return E.inCheck(st) ? -100000 + ply : 0;
      order(ms);
      for (var i = 0; i < ms.length; i++) {
        var v = -nega(E.make(st, ms[i]), d - 1, -beta, -alpha, ply + 1);
        if (v >= beta) return beta;
        if (v > alpha) alpha = v;
        if (nodes > LIMIT) break;
      }
      return alpha;
    }
    var moves = order(E.legal(s)), best = null, bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var v = -nega(E.make(s, moves[i]), depth - 1, -Infinity, -bestScore, 1) + (noise ? Math.random() * noise : 0);
      if (v > bestScore || !best) { bestScore = v; best = moves[i]; }
    }
    return best;
  };
  MP.chessEngine = E;

  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var LEVEL = { easy: [1, 120], medium: [2, 20], hard: [3, 0] };

  MP.define('chess', {
    mount: function (root, ctx) {
      var g = ctx.get('game', null);
      var sel = -1, targets = [], thinking = false;

      function save() { ctx.set('game', g); }
      function state() { return g.states[g.states.length - 1]; }
      function newGame() {
        MP.form({
          title: 'New game',
          fields: [
            { name: 'mode', label: 'Play against', type: 'select', options: [{ value: 'cpu', label: 'The iPad' }, { value: 'two', label: 'Another person (pass the iPad)' }], value: g ? g.mode : 'cpu' },
            { name: 'side', label: 'You play', type: 'select', options: [{ value: 'w', label: 'White (you start)' }, { value: 'b', label: 'Black' }], value: g ? g.side : 'w' },
            { name: 'level', label: 'How strong is the iPad?', type: 'select', options: [{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }], value: g ? g.level : 'easy' }
          ],
          ok: 'Start'
        }).then(function (v) {
          if (!v || v === 'delete') return;
          g = { mode: v.mode, side: v.side, level: v.level, states: [E.start()], moves: [], over: '' };
          sel = -1; targets = [];
          save(); render(); maybeCpu();
        });
      }
      function status() {
        var s = state(), who = s.turn === 'w' ? 'White' : 'Black';
        if (g.over) return g.over;
        var ms = E.legal(s);
        if (!ms.length) {
          g.over = E.inCheck(s) ? 'Checkmate! ' + (s.turn === 'w' ? 'Black' : 'White') + ' wins.' : 'Stalemate. It\'s a draw.';
          save();
          setTimeout(function () { MP.chime(); MP.alert(g.over); }, 200);
          return g.over;
        }
        if (s.half >= 100) { g.over = 'Draw (50 moves without a capture).'; save(); return g.over; }
        var pieces = s.b.filter(Boolean).map(function (p) { return p.toLowerCase(); }).sort().join('');
        if (pieces === 'kk' || pieces === 'bkk' || pieces === 'kkn') { g.over = 'Draw (not enough pieces to win).'; save(); return g.over; }
        var key = E.key(s), reps = g.states.filter(function (x) { return E.key(x) === key; }).length;
        if (reps >= 3) { g.over = 'Draw (the same position three times).'; save(); return g.over; }
        if (thinking) return 'The iPad is thinking…';
        return who + ' to move' + (E.inCheck(s) ? ' · Check!' : '');
      }
      function render() {
        if (!g) { root.innerHTML = '<div class="empty">Set up a game to start.</div>'; newGame(); return; }
        ctx.actions('<button type="button" class="btn small" data-act="undo">↶ Undo</button><button type="button" class="btn small" data-act="new">New game</button>');
        var s = state(), flip = g.mode === 'cpu' ? g.side === 'b' : !!g.flip;
        var last = g.moves[g.moves.length - 1];
        var checkSq = E.inCheck(s) ? E.kingSq(s.b, s.turn) : -1;
        var html = '';
        for (var vi = 0; vi < 64; vi++) {
          var i = flip ? 63 - vi : vi;
          var r = (i / 8) | 0, c = i % 8, p = s.b[i];
          var cls = 'ch-sq ' + ((r + c) % 2 ? 'dark' : 'light');
          if (i === sel) cls += ' sel';
          if (last && (i === last.f || i === last.t)) cls += ' last';
          if (i === checkSq) cls += ' check';
          var isT = targets.some(function (m) { return m.t === i; });
          html += '<button type="button" class="' + cls + '" data-sq="' + i + '">' +
            (p ? '<span class="ch-p ' + (isWhite(p) ? 'w' : 'b') + '">' + GLYPH[p.toLowerCase()] + '︎</span>' : '') +
            (isT ? '<span class="ch-dot' + (p ? ' cap' : '') + '"></span>' : '') +
            ((flip ? r === 0 : r === 7) ? '<span class="ch-file">' + 'abcdefgh'.charAt(c) + '</span>' : '') +
            ((flip ? c === 7 : c === 0) ? '<span class="ch-rank">' + (8 - r) + '</span>' : '') + '</button>';
        }
        var lost = { w: [], b: [] };
        g.moves.forEach(function (m) { if (m.x) lost[colorOf(m.x)].push(m.x); });
        function caps(list) { return list.map(function (p) { return '<span class="ch-cap ' + (isWhite(p) ? 'w' : 'b') + '">' + GLYPH[p.toLowerCase()] + '︎</span>'; }).join(''); }
        root.innerHTML = '<div class="ch">' +
          '<div class="ch-status" id="ch-status">' + MP.esc(status()) + '</div>' +
          '<div class="ch-caps">' + caps(flip ? lost.w : lost.b) + '</div>' +
          '<div class="ch-board" id="ch-board">' + html + '</div>' +
          '<div class="ch-caps">' + caps(flip ? lost.b : lost.w) + '</div>' +
          '<div class="ch-info muted small">' + (g.mode === 'cpu' ? 'You play ' + (g.side === 'w' ? 'White' : 'Black') + ' · ' + g.level :
            'Two players · <button type="button" class="btn small" data-act="flip">Turn the board</button>') +
          (last ? ' · last move ' + name(last.f) + '–' + name(last.t) : '') + '</div></div>';
        size();
      }
      function size() {
        var b = MP.qs('#ch-board', root);
        if (!b) return;
        var s = Math.max(280, Math.floor(Math.min(root.clientWidth - 24, root.clientHeight - 170) / 8) * 8);
        b.style.width = s + 'px';
        b.style.height = s + 'px';
        b.style.fontSize = Math.floor(s / 8 * 0.72) + 'px';
      }
      function play(m) {
        var s = state();
        g.states.push(E.make(s, m));
        g.moves.push(m);
        sel = -1; targets = [];
        if (m.x) MP.tone(300, 0.12, { type: 'triangle', vol: 0.25 });
        else MP.tone(520, 0.06, { type: 'triangle', vol: 0.2 });
        save();
        render();
        maybeCpu();
      }
      function maybeCpu() {
        if (!g || g.over || g.mode !== 'cpu' || state().turn === g.side) return;
        if (!E.legal(state()).length) { render(); return; }
        thinking = true;
        var st = MP.qs('#ch-status', root);
        if (st) st.textContent = 'The iPad is thinking…';
        ctx.after(120, function () {
          var lv = LEVEL[g.level] || LEVEL.easy;
          var m = E.search(state(), lv[0], lv[1]);
          thinking = false;
          if (m) play(m); else render();
        });
      }
      function choosePromo(moves) {
        var w = state().turn === 'w';
        return MP.modal({
          title: 'Change the pawn into…',
          html: '<div class="ch-promo">' + ['q', 'r', 'b', 'n'].map(function (p) {
            return '<button type="button" class="ch-sq light" data-v="' + p + '"><span class="ch-p ' + (w ? 'w' : 'b') + '">' + GLYPH[p] + '︎</span></button>';
          }).join('') + '</div>',
          buttons: [{ label: 'Cancel', value: '' }]
        }).then(function (v) { return moves.filter(function (m) { return m.promo === v; })[0] || null; });
      }

      ctx.delegate(root, 'click', '[data-sq]', function (e, el) {
        if (!g || g.over || thinking) return;
        var s = state();
        if (g.mode === 'cpu' && s.turn !== g.side) return;
        var i = +el.getAttribute('data-sq');
        var chosen = targets.filter(function (m) { return m.t === i; });
        if (chosen.length) {
          if (chosen.length > 1) choosePromo(chosen).then(function (m) { if (m) play(m); });
          else play(chosen[0]);
          return;
        }
        if (s.b[i] && colorOf(s.b[i]) === s.turn) {
          sel = i;
          targets = E.legal(s).filter(function (m) { return m.f === i; });
        } else { sel = -1; targets = []; }
        render();
      });
      ctx.delegate(root, 'click', '[data-act="flip"]', function () { g.flip = !g.flip; save(); render(); });
      ctx.delegate(ctx.bar, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        if (act === 'new') newGame();
        if (act === 'undo' && g && g.moves.length && !thinking) {
          var n = g.mode === 'cpu' ? (state().turn === g.side ? 2 : 1) : 1;
          n = Math.min(n, g.moves.length);
          for (var k = 0; k < n; k++) { g.states.pop(); g.moves.pop(); }
          g.over = '';
          sel = -1; targets = [];
          save(); render(); maybeCpu();
        }
      });
      ctx.listen(window, 'resize', function () { setTimeout(size, 200); });
      render();
      maybeCpu();
    }
  });
})();
