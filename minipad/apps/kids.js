/* Kids' corner: counting, ABC, memory match, times tables, spelling and reading.
   Emoji are limited to Emoji 11 and older, which iOS 12 can show. */
(function () {
  var GAMES = [
    { id: 'count', title: 'Counting', icon: '🔢', color: '#ffd166' },
    { id: 'abc', title: 'ABC', icon: '🔤', color: '#8ecae6' },
    { id: 'memory', title: 'Memory', icon: '🧠', color: '#f4a3c4' },
    { id: 'times', title: 'Times tables', icon: '✖️', color: '#a7e3a1' },
    { id: 'spell', title: 'Spelling', icon: '✏️', color: '#c9b6f2' },
    { id: 'read', title: 'Reading', icon: '📖', color: '#ffb38a' }
  ];
  var THINGS = [['🍎', 'apples'], ['🐶', 'dogs'], ['⭐', 'stars'], ['🚗', 'cars'], ['🐟', 'fish'], ['🌸', 'flowers'],
    ['🎈', 'balloons'], ['🐥', 'chicks'], ['🍓', 'strawberries'], ['⚽', 'balls'], ['🦋', 'butterflies'], ['🐢', 'turtles']];
  var ABC = [['A', 'Apple', '🍎'], ['B', 'Bear', '🐻'], ['C', 'Cat', '🐱'], ['D', 'Dog', '🐶'], ['E', 'Elephant', '🐘'],
    ['F', 'Fish', '🐟'], ['G', 'Grapes', '🍇'], ['H', 'House', '🏠'], ['I', 'Ice cream', '🍦'], ['J', 'Jeans', '👖'],
    ['K', 'Key', '🔑'], ['L', 'Lion', '🦁'], ['M', 'Moon', '🌙'], ['N', 'Nose', '👃'], ['O', 'Orange', '🍊'], ['P', 'Pig', '🐷'],
    ['Q', 'Queen', '👸'], ['R', 'Rabbit', '🐰'], ['S', 'Sun', '☀️'], ['T', 'Tree', '🌳'], ['U', 'Umbrella', '☂️'],
    ['V', 'Violin', '🎻'], ['W', 'Whale', '🐳'], ['X', 'Fox', '🦊'], ['Y', 'Yarn', '🧶'], ['Z', 'Zebra', '🦓']];
  var FACES = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'];
  var WORDS = {
    1: [['cat', '🐱'], ['dog', '🐶'], ['sun', '☀️'], ['hat', '🎩'], ['pig', '🐷'], ['bus', '🚌'], ['cup', '☕'], ['bed', '🛏️'],
      ['fox', '🦊'], ['hen', '🐔'], ['box', '📦'], ['map', '🗺️'], ['red', '🔴'], ['ten', '🔟'], ['egg', '🥚'], ['car', '🚗']],
    2: [['fish', '🐟'], ['frog', '🐸'], ['duck', '🦆'], ['tree', '🌳'], ['star', '⭐'], ['cake', '🎂'], ['milk', '🥛'],
      ['ship', '🚢'], ['bird', '🐦'], ['book', '📖'], ['rain', '🌧️'], ['moon', '🌙'], ['boat', '⛵'], ['hand', '✋'], ['lamp', '💡'], ['shoe', '👟']],
    3: [['apple', '🍎'], ['house', '🏠'], ['horse', '🐴'], ['train', '🚆'], ['water', '💧'], ['flower', '🌸'], ['school', '🏫'],
      ['friend', '🤝'], ['garden', '🌻'], ['rabbit', '🐰'], ['yellow', '💛'], ['orange', '🍊'], ['pencil', '✏️'], ['rocket', '🚀'], ['monkey', '🐵'], ['banana', '🍌']]
  };
  var SIGHT = ['the', 'and', 'said', 'you', 'was', 'they', 'have', 'come', 'some', 'little', 'look', 'play', 'like', 'went',
    'what', 'when', 'where', 'there', 'here', 'one', 'two', 'three', 'my', 'we', 'are', 'all', 'be', 'see', 'go', 'no'];
  var SENTENCES = ['The cat sat on the mat.', 'I can see a red bus.', 'We like to play in the sun.', 'The dog is big and brown.',
    'Look at the moon and the stars.', 'A fish can swim in the sea.', 'Mum has a cup of tea.', 'The duck went into the pond.',
    'I have a new blue hat.', 'Can you hop like a frog?', 'The bird sang in the tree.', 'We had cake at the party.'];
  var PRAISE = ['Well done!', 'Great job!', 'Brilliant!', 'You got it!', 'Super!', 'Fantastic!', 'Amazing!'];

  MP.define('kids', {
    mount: function (root, ctx) {
      var stars = ctx.get('stars', 0);
      var game = null;   // cleanup for the current game

      function addStar(n) {
        stars += n || 1;
        ctx.set('stars', stars);
        var s = MP.qs('#k-stars');
        if (s) s.textContent = '⭐ ' + stars;
      }
      function cheer() {
        MP.ding();
        var p = MP.pick(PRAISE);
        setTimeout(function () { MP.say(p, { rate: 0.95 }); }, 250);
        var b = document.createElement('div');
        b.className = 'kid-burst';
        b.textContent = '⭐';
        root.appendChild(b);
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 900);
        addStar(1);
        return p;
      }
      function oops() { MP.ding(false); }
      function level(name, max) {
        var l = ctx.get('level.' + name, 1);
        return MP.clamp(l, 1, max || 3);
      }
      function levelBar(name, labels) {
        var l = level(name, labels.length);
        return '<div class="tabs kid-levels" data-levels="' + name + '">' + labels.map(function (lab, i) {
          return '<button type="button" class="tab" data-level="' + (i + 1) + '" aria-selected="' + (l === i + 1) + '">' + lab + '</button>';
        }).join('') + '</div>';
      }

      function show(arg) {
        if (game) { game(); game = null; }
        MP.stopSpeak();
        ctx.actions('<span class="pill kid-stars" id="k-stars">⭐ ' + stars + '</span>');
        var g = GAMES.filter(function (x) { return x.id === arg; })[0];
        ctx.title(g ? g.title : "Kids' corner");
        if (!g) return menu();
        root.innerHTML = '<div class="kid kid-' + g.id + '" id="kid"></div>';
        var box = MP.qs('#kid', root);
        ({ count: counting, abc: abc, memory: memory, times: times, spell: spelling, read: reading })[g.id](box);
      }
      this.onArg = show;

      function menu() {
        root.innerHTML = '<div class="wrap"><div class="kid-menu">' + GAMES.map(function (g) {
          return '<a class="kid-tile" href="#/kids/' + g.id + '" style="background:' + g.color + '"><span>' + g.icon + '</span>' + MP.esc(g.title) + '</a>';
        }).join('') + '</div><p class="muted center small" style="margin-top:18px">Turn the sound up: MiniPad reads the questions out loud.</p></div>';
      }

      /* ----- counting ----- */
      function counting(box) {
        function round() {
          var l = level('count');
          var max = [5, 10, 20][l - 1];
          var n = MP.rand(1, max);
          var t = MP.pick(THINGS);
          var opts = [n];
          while (opts.length < 3) {
            var o = MP.clamp(n + MP.rand(-3, 3), 1, max + 2);
            if (opts.indexOf(o) < 0) opts.push(o);
          }
          opts = MP.shuffle(opts);
          var things = '';
          for (var i = 0; i < n; i++) things += '<span>' + t[0] + '</span>';
          box.innerHTML = levelBar('count', ['Up to 5', 'Up to 10', 'Up to 20']) +
            '<div class="kid-q">How many ' + t[1] + '?</div><div class="kid-things' + (n > 10 ? ' many' : '') + '">' + things + '</div>' +
            '<div class="kid-answers">' + opts.map(function (o) { return '<button type="button" class="kid-ans" data-n="' + o + '">' + o + '</button>'; }).join('') + '</div>';
          box.onclick = function (e) {
            var b = e.target.closest('[data-n]');
            if (b) {
              if (+b.getAttribute('data-n') === n) {
                b.classList.add('right');
                cheer();
                setTimeout(function () { MP.say(n + ' ' + t[1] + '!'); }, 1200);
                setTimeout(round, 2600);
              } else { b.classList.add('wrong'); oops(); }
              return;
            }
            var lv = e.target.closest('[data-level]');
            if (lv) { ctx.set('level.count', +lv.getAttribute('data-level')); round(); }
          };
          setTimeout(function () { MP.say('How many ' + t[1] + '?', { rate: 0.95 }); }, 300);
        }
        round();
      }

      /* ----- ABC ----- */
      function abc(box) {
        var mode = 'learn', lower = ctx.get('lower', false);
        function letter(L) { return lower ? L.toLowerCase() : L; }
        function draw() {
          var head = '<div class="tabs"><button type="button" class="tab" data-mode="learn" aria-selected="' + (mode === 'learn') + '">Learn</button>' +
            '<button type="button" class="tab" data-mode="find" aria-selected="' + (mode === 'find') + '">Find the letter</button></div>' +
            '<div class="center" style="margin-bottom:12px"><button type="button" class="btn small" data-case="1">' + (lower ? 'Show ABC' : 'Show abc') + '</button></div>';
          if (mode === 'learn') {
            box.innerHTML = head + '<div class="kid-abc">' + ABC.map(function (a, i) {
              return '<button type="button" class="kid-letter" data-i="' + i + '">' + letter(a[0]) + '</button>';
            }).join('') + '</div><div id="abc-show" class="kid-abc-show"></div>';
          } else findRound(head);
        }
        var target = null;
        function findRound(head) {
          target = MP.pick(ABC);
          var opts = [target];
          while (opts.length < 4) { var o = MP.pick(ABC); if (opts.indexOf(o) < 0) opts.push(o); }
          box.innerHTML = head + '<div class="kid-q">Find the letter <button type="button" class="btn small" data-hear="1">🔈 Hear it</button></div>' +
            '<div class="kid-answers four">' + MP.shuffle(opts).map(function (o) {
              return '<button type="button" class="kid-ans" data-l="' + o[0] + '">' + letter(o[0]) + '</button>';
            }).join('') + '</div>';
          setTimeout(function () { MP.say('Find the letter ' + target[0], { rate: 0.9 }); }, 300);
        }
        box.onclick = function (e) {
          var t = e.target;
          var m = t.closest('[data-mode]');
          if (m) { mode = m.getAttribute('data-mode'); draw(); return; }
          if (t.closest('[data-case]')) { lower = !lower; ctx.set('lower', lower); draw(); return; }
          if (t.closest('[data-hear]')) { MP.say('Find the letter ' + target[0], { rate: 0.9 }); return; }
          var li = t.closest('[data-i]');
          if (li) {
            var a = ABC[+li.getAttribute('data-i')];
            var word = a[0] === 'X' ? 'Fox has an X at the end' : a[0] + ' is for ' + a[1];
            MP.qs('#abc-show', box).innerHTML = '<div class="kid-pop"><span class="kid-pop-e">' + a[2] + '</span><b>' + letter(a[0]) + '</b> ' +
              MP.esc(a[0] === 'X' ? 'fo' + letter('X') : a[1]) + '</div>';
            MP.say(word, { rate: 0.85 });
            return;
          }
          var ans = t.closest('[data-l]');
          if (ans) {
            if (ans.getAttribute('data-l') === target[0]) { ans.classList.add('right'); cheer(); setTimeout(function () { draw(); }, 1700); }
            else { ans.classList.add('wrong'); oops(); }
          }
        };
        draw();
      }

      /* ----- memory match ----- */
      function memory(box) {
        var first = null, lock = false, moves = 0, found = 0, pairs = 0, timer = null;
        function deal() {
          var l = level('memory');
          pairs = [6, 8, 10][l - 1];
          var faces = MP.shuffle(FACES).slice(0, pairs);
          var cards = MP.shuffle(faces.concat(faces));
          moves = 0; found = 0; first = null; lock = false;
          box.innerHTML = levelBar('memory', ['Easy', 'Medium', 'Hard']) +
            '<div class="kid-q" id="mm-status">Find the pairs</div><div class="mm-grid mm-' + pairs + '">' + cards.map(function (f, i) {
              return '<button type="button" class="mm-card" data-i="' + i + '" data-f="' + f + '"><span class="mm-back">?</span><span class="mm-front">' + f + '</span></button>';
            }).join('') + '</div>';
        }
        box.onclick = function (e) {
          var lv = e.target.closest('[data-level]');
          if (lv) { ctx.set('level.memory', +lv.getAttribute('data-level')); deal(); return; }
          var c = e.target.closest('.mm-card');
          if (!c || lock || c.classList.contains('open') || c.classList.contains('done')) return;
          c.classList.add('open');
          MP.tone(660, 0.12, { vol: 0.15 });
          if (!first) { first = c; return; }
          moves++;
          if (first.getAttribute('data-f') === c.getAttribute('data-f')) {
            first.classList.add('done'); c.classList.add('done');
            first = null;
            found++;
            MP.ding();
            if (found === pairs) {
              MP.qs('#mm-status', box).textContent = 'You did it in ' + moves + ' turns!';
              cheer(); addStar(2);
              timer = setTimeout(deal, 3500);
            }
          } else {
            lock = true;
            var a = first;
            first = null;
            timer = setTimeout(function () { a.classList.remove('open'); c.classList.remove('open'); lock = false; }, 900);
          }
        };
        game = function () { clearTimeout(timer); };
        deal();
      }

      /* ----- times tables ----- */
      function times(box) {
        var table = ctx.get('table', 2), q = 0, score = 0, a = 0, b = 0, typed = '', total = 10;
        function pickTable() {
          var nums = [];
          for (var i = 1; i <= 12; i++) nums.push(i);
          box.innerHTML = '<div class="kid-q">Which times table?</div><div class="tt-pick">' + nums.map(function (n) {
            return '<button type="button" class="kid-ans small" data-t="' + n + '">' + n + '×</button>';
          }).join('') + '<button type="button" class="kid-ans small" data-t="0">Mix</button></div>';
        }
        function next() {
          if (q >= total) {
            box.innerHTML = '<div class="kid-q">You got ' + score + ' out of ' + total + '!</div><div class="kid-big">' + (score >= 8 ? '🏆' : score >= 5 ? '👍' : '💪') + '</div>' +
              '<div class="center"><button type="button" class="btn big primary" data-again="1">Play again</button> <button type="button" class="btn big" data-pick="1">Other table</button></div>';
            MP.say('You got ' + score + ' out of ' + total);
            if (score >= 8) addStar(3);
            return;
          }
          q++;
          a = table || MP.rand(2, 12);
          b = MP.rand(1, 12);
          if (Math.random() < 0.5) { var t = a; a = b; b = t; }
          typed = '';
          draw();
          MP.say(a + ' times ' + b, { rate: 0.9 });
        }
        function draw(state) {
          var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'];
          box.innerHTML = '<div class="tt-top"><span class="pill">Question ' + q + ' of ' + total + '</span> <span class="pill">✓ ' + score + '</span></div>' +
            '<div class="tt-q' + (state ? ' ' + state : '') + '">' + a + ' × ' + b + ' = <span class="tt-a">' + (typed || '?') + '</span></div>' +
            '<div class="tt-keys">' + keys.map(function (k) {
              return '<button type="button" class="tt-key' + (k === 'ok' ? ' ok' : '') + '" data-k="' + k + '">' + (k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k) + '</button>';
            }).join('') + '</div>';
        }
        box.onclick = function (e) {
          var t = e.target;
          var tp = t.closest('[data-t]');
          if (tp) { table = +tp.getAttribute('data-t'); ctx.set('table', table); q = 0; score = 0; next(); return; }
          if (t.closest('[data-again]')) { q = 0; score = 0; next(); return; }
          if (t.closest('[data-pick]')) { pickTable(); return; }
          var k = t.closest('[data-k]');
          if (!k) return;
          var v = k.getAttribute('data-k');
          if (v === 'del') { typed = typed.slice(0, -1); draw(); return; }
          if (v === 'ok') {
            if (!typed) return;
            if (+typed === a * b) { score++; cheer(); draw('right'); setTimeout(next, 1400); }
            else { oops(); typed = String(a * b); draw('wrong'); MP.say(a + ' times ' + b + ' is ' + a * b); setTimeout(next, 2600); }
            return;
          }
          if (typed.length < 3) { typed += v; draw(); }
        };
        pickTable();
      }

      /* ----- spelling ----- */
      function spelling(box) {
        var word = null, slots = [], tiles = [];
        function round() {
          var l = level('spell');
          word = MP.pick(WORDS[l]);
          var letters = word[0].split('');
          var extra = 'aeioubdgmnprst'.split('');
          tiles = MP.shuffle(letters.concat(MP.shuffle(extra).slice(0, l + 1))).map(function (ch, i) { return { ch: ch, i: i, used: false }; });
          slots = letters.map(function () { return null; });
          draw();
          setTimeout(say, 300);
        }
        function say() { MP.say(word[0], { rate: 0.8 }); }
        function draw(state) {
          box.innerHTML = levelBar('spell', ['3 letters', '4 letters', 'Longer']) +
            '<div class="sp-hint">' + word[1] + '</div>' +
            '<div class="center"><button type="button" class="btn" data-say="1">🔈 Hear the word</button> <button type="button" class="btn" data-spell="1">🔡 Hear the letters</button></div>' +
            '<div class="sp-slots' + (state ? ' ' + state : '') + '">' + slots.map(function (s, i) {
              return '<button type="button" class="sp-slot" data-slot="' + i + '">' + (s != null ? tiles[s].ch : '') + '</button>';
            }).join('') + '</div>' +
            '<div class="sp-tiles">' + tiles.map(function (t, i) {
              return '<button type="button" class="sp-tile" data-tile="' + i + '"' + (t.used ? ' disabled' : '') + '>' + t.ch + '</button>';
            }).join('') + '</div>';
        }
        function check() {
          if (slots.indexOf(null) >= 0) return;
          var guess = slots.map(function (s) { return tiles[s].ch; }).join('');
          if (guess === word[0]) { draw('right'); cheer(); setTimeout(round, 2000); }
          else {
            draw('wrong'); oops();
            setTimeout(function () {
              slots = slots.map(function (s, i) {
                if (tiles[s].ch === word[0][i]) return s;
                tiles[s].used = false;
                return null;
              });
              draw();
            }, 900);
          }
        }
        box.onclick = function (e) {
          var t = e.target;
          var lv = t.closest('[data-level]');
          if (lv) { ctx.set('level.spell', +lv.getAttribute('data-level')); round(); return; }
          if (t.closest('[data-say]')) { say(); return; }
          if (t.closest('[data-spell]')) { MP.say(word[0].split('').join(', '), { rate: 0.7 }); return; }
          var tile = t.closest('[data-tile]');
          if (tile) {
            var ti = +tile.getAttribute('data-tile');
            var free = slots.indexOf(null);
            if (free < 0 || tiles[ti].used) return;
            tiles[ti].used = true;
            slots[free] = ti;
            MP.tone(520 + free * 60, 0.1, { vol: 0.12 });
            draw();
            check();
            return;
          }
          var sl = t.closest('[data-slot]');
          if (sl) {
            var si = +sl.getAttribute('data-slot');
            if (slots[si] != null) { tiles[slots[si]].used = false; slots[si] = null; draw(); }
          }
        };
        round();
      }

      /* ----- reading ----- */
      function reading(box) {
        var idx = 0;
        function items() {
          var l = level('read');
          if (l === 1) return WORDS[1].concat(WORDS[2]);
          if (l === 2) return SIGHT.map(function (w) { return [w, '']; });
          return SENTENCES.map(function (s) { return [s, '']; });
        }
        function draw() {
          var list = items();
          idx = (idx + list.length) % list.length;
          var it = list[idx];
          var l = level('read');
          var text = l === 3 ? it[0].split(' ').map(function (w) {
            return '<button type="button" class="rd-word" data-w="' + MP.esc(w.replace(/[^a-zA-Z']/g, '')) + '">' + MP.esc(w) + '</button>';
          }).join(' ') : MP.esc(it[0]);
          box.innerHTML = levelBar('read', ['Picture words', 'Tricky words', 'Sentences']) +
            (it[1] ? '<div class="rd-pic">' + it[1] + '</div>' : '') +
            '<div class="rd-text' + (l === 3 ? ' sentence' : '') + '">' + text + '</div>' +
            '<div class="center"><button type="button" class="btn big primary" data-read="1">🔈 Read it to me</button></div>' +
            '<div class="rd-nav"><button type="button" class="btn big" data-step="-1">‹ Back</button><span class="muted">' + (idx + 1) + ' / ' + list.length + '</span>' +
            '<button type="button" class="btn big" data-step="1">Next ›</button></div>' +
            (l === 3 ? '<p class="muted center small">Tap any word to hear it on its own.</p>' : '');
        }
        box.onclick = function (e) {
          var t = e.target;
          var lv = t.closest('[data-level]');
          if (lv) { ctx.set('level.read', +lv.getAttribute('data-level')); idx = 0; draw(); return; }
          if (t.closest('[data-read]')) { MP.say(items()[idx][0], { rate: 0.8 }); return; }
          var w = t.closest('[data-w]');
          if (w) { MP.say(w.getAttribute('data-w'), { rate: 0.8 }); return; }
          var st = t.closest('[data-step]');
          if (st) { idx += +st.getAttribute('data-step'); draw(); }
        };
        draw();
      }

      ctx.cleanup(function () { if (game) game(); });
      show(ctx.arg);
    }
  });
})();
