/* Flashcards with spaced repetition (Leitner boxes) and spoken words. */
(function () {
  var LANGS = [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Spanish'], ['fr-FR', 'French'], ['de-DE', 'German'],
    ['it-IT', 'Italian'], ['pt-BR', 'Portuguese'], ['nl-NL', 'Dutch'], ['ar-SA', 'Arabic'], ['tr-TR', 'Turkish'], ['ru-RU', 'Russian'],
    ['hi-IN', 'Hindi'], ['zh-CN', 'Chinese'], ['ja-JP', 'Japanese'], ['ko-KR', 'Korean']];
  var DAYS_FOR_BOX = [0, 0, 1, 3, 7, 14];

  function card(f, b) { return { id: MP.uid() + Math.random().toString(36).slice(2, 5), f: f, b: b, box: 1, due: '' }; }
  function samples() {
    return [
      { id: 'sample-es', name: 'Spanish basics', fl: 'es-ES', bl: 'en-US', cards: [
        ['hola', 'hello'], ['gracias', 'thank you'], ['por favor', 'please'], ['adiós', 'goodbye'], ['sí', 'yes'], ['agua', 'water'],
        ['casa', 'house'], ['perro', 'dog'], ['gato', 'cat'], ['libro', 'book'], ['amigo', 'friend'], ['buenos días', 'good morning']
      ].map(function (p) { return card(p[0], p[1]); }) },
      { id: 'sample-cap', name: 'World capitals', fl: 'en-US', bl: 'en-US', cards: [
        ['France', 'Paris'], ['Japan', 'Tokyo'], ['Italy', 'Rome'], ['Kenya', 'Nairobi'], ['Canada', 'Ottawa'], ['Brazil', 'Brasília'],
        ['Australia', 'Canberra'], ['Egypt', 'Cairo'], ['India', 'New Delhi'], ['Mexico', 'Mexico City'], ['Germany', 'Berlin'], ['Spain', 'Madrid']
      ].map(function (p) { return card(p[0], p[1]); }) }
    ];
  }
  function today() { return MP.dayKey(); }
  function isDue(c) { return !c.due || c.due <= today(); }

  MP.define('flashcards', {
    mount: function (root, ctx) {
      var decks = ctx.get('decks', null);
      if (!decks) { decks = samples(); ctx.set('decks', decks); }
      var study = null;

      function save() { ctx.set('decks', decks); }
      function deck(id) { return decks.filter(function (d) { return d.id === id; })[0]; }

      function show(arg) {
        MP.stopSpeak();
        ctx.actions('');
        ctx.title('Flashcards');
        if (arg && arg.indexOf('d-') === 0) return deckPage(arg.slice(2));
        if (arg && arg.indexOf('s-') === 0) return studyPage(arg.slice(2));
        list();
      }
      this.onArg = show;

      function list() {
        root.innerHTML = '<div class="wrap"><div class="toolbar"><button type="button" class="btn primary" data-act="newdeck">+ New deck</button></div>' +
          (decks.length ? '<div class="list">' + decks.map(function (d) {
            var due = d.cards.filter(isDue).length;
            return '<a class="row fc-row" href="#/flashcards/d-' + d.id + '"><div class="grow"><b>' + MP.esc(d.name) + '</b><div class="muted small">' +
              d.cards.length + ' cards</div></div>' + (due ? '<span class="pill fc-due">' + due + ' to study</span>' : '<span class="pill">Done ✓</span>') + '<span class="muted">›</span></a>';
          }).join('') + '</div>' : '<div class="empty-note">No decks yet.</div>') +
          '<p class="muted small center" style="margin-top:18px">Cards you know come back less often. Cards you miss come back soon.</p></div>';
      }

      function editDeck(d) {
        var isNew = !d;
        var opts = LANGS.map(function (l) { return { value: l[0], label: l[1] }; });
        return MP.form({
          title: isNew ? 'New deck' : 'Deck settings',
          del: !isNew,
          fields: [
            { name: 'name', label: 'Name', value: d ? d.name : '', required: true },
            { name: 'fl', label: 'Language of the front (for speaking)', type: 'select', options: opts, value: d ? d.fl : 'en-US' },
            { name: 'bl', label: 'Language of the back', type: 'select', options: opts, value: d ? d.bl : 'en-US' }
          ]
        }).then(function (v) {
          if (!v) return;
          if (v === 'delete') {
            return MP.confirm('Delete the deck "' + d.name + '" and all its cards?', 'Delete', true).then(function (ok) {
              if (!ok) return;
              decks = decks.filter(function (x) { return x.id !== d.id; });
              save(); MP.go('flashcards');
            });
          }
          if (isNew) { d = { id: MP.uid(), cards: [] }; decks.push(d); }
          d.name = v.name; d.fl = v.fl; d.bl = v.bl;
          save();
          if (isNew) MP.go('flashcards', 'd-' + d.id); else deckPage(d.id);
        });
      }

      function deckPage(id) {
        var d = deck(id);
        if (!d) { MP.go('flashcards'); return; }
        ctx.title(d.name);
        ctx.actions('<button type="button" class="btn small" data-act="deckset">Settings</button>');
        var due = d.cards.filter(isDue).length;
        root.innerHTML = '<div class="wrap">' +
          '<div class="card center"><div class="fc-big">' + due + '</div><div class="muted">cards to study today</div>' +
          '<div class="hstack" style="justify-content:center;margin-top:14px"><a class="btn big primary" href="#/flashcards/s-' + d.id + '">' + (due ? 'Study now' : 'Practise anyway') + '</a></div></div>' +
          '<div class="toolbar" style="margin-top:16px"><button type="button" class="btn" data-act="addcard">+ Add a card</button>' +
          '<button type="button" class="btn" data-act="bulk">Add many</button></div>' +
          (d.cards.length ? '<div class="list">' + d.cards.map(function (c) {
            return '<div class="row" data-c="' + c.id + '"><div class="grow"><b>' + MP.esc(c.f) + '</b> <span class="muted">→ ' + MP.esc(c.b) + '</span></div>' +
              '<span class="pill">Box ' + c.box + '</span><button type="button" class="btn small ghost" data-act="editcard">Edit</button></div>';
          }).join('') + '</div>' : '<div class="empty-note">This deck has no cards yet.</div>') + '</div>';
      }
      function editCard(d, c) {
        var isNew = !c;
        MP.form({
          title: isNew ? 'New card' : 'Edit card',
          del: !isNew,
          fields: [
            { name: 'f', label: 'Front (the question)', value: c ? c.f : '', required: true },
            { name: 'b', label: 'Back (the answer)', value: c ? c.b : '', required: true }
          ],
          ok: isNew ? 'Add' : 'Save'
        }).then(function (v) {
          if (!v) return;
          if (v === 'delete') d.cards = d.cards.filter(function (x) { return x.id !== c.id; });
          else if (isNew) d.cards.push(card(v.f, v.b));
          else { c.f = v.f; c.b = v.b; }
          save(); deckPage(d.id);
          if (isNew && v !== 'delete') MP.toast('Card added.');
        });
      }
      function bulkAdd(d) {
        MP.form({
          title: 'Add many cards',
          intro: 'One card per line: the front, then a dash (or a semicolon), then the back. Example: "chien - dog".',
          fields: [{ name: 't', label: 'Cards', type: 'textarea', rows: 8, required: true }],
          ok: 'Add cards'
        }).then(function (v) {
          if (!v || v === 'delete') return;
          var n = 0;
          v.t.split('\n').forEach(function (line) {
            var m = /^(.+?)\s*(?:\t|;| - | – |=)\s*(.+)$/.exec(line.trim());
            if (m) { d.cards.push(card(m[1].trim(), m[2].trim())); n++; }
          });
          save(); deckPage(d.id);
          MP.toast(n + ' cards added.');
        });
      }

      function studyPage(id) {
        var d = deck(id);
        if (!d || !d.cards.length) { MP.go('flashcards', id ? 'd-' + id : ''); return; }
        ctx.title(d.name);
        var due = d.cards.filter(isDue);
        var queue = due.length ? due : MP.shuffle(d.cards);
        study = { d: d, queue: MP.shuffle(queue).sort(function (a, b) { return a.box - b.box; }), flipped: false, right: 0, seen: 0, practice: !due.length };
        drawStudy();
      }
      function drawStudy() {
        var s = study, c = s.queue[0];
        if (!c) {
          root.innerHTML = '<div class="wrap center"><div class="fc-big">🎉</div><h2>All done!</h2><p class="muted">' + s.right + ' right out of ' + s.seen + '.</p>' +
            '<a class="btn big primary" href="#/flashcards/d-' + s.d.id + '">Back to the deck</a></div>';
          MP.ding();
          return;
        }
        root.innerHTML = '<div class="fc-study">' +
          '<div class="muted center">' + s.queue.length + ' left' + (s.practice ? ' · practice' : '') + '</div>' +
          '<button type="button" class="fc-card' + (s.flipped ? ' flipped' : '') + '" data-act="flip">' +
          '<span class="fc-side">' + (s.flipped ? 'Answer' : 'Question') + '</span>' +
          '<span class="fc-text">' + MP.esc(s.flipped ? c.b : c.f) + '</span>' +
          (s.flipped ? '<span class="fc-small">' + MP.esc(c.f) + '</span>' : '<span class="fc-small">Tap to turn over</span>') + '</button>' +
          '<div class="hstack fc-btns"><button type="button" class="btn" data-act="say">🔈 Say it</button></div>' +
          (s.flipped ? '<div class="fc-grade"><button type="button" class="btn big danger" data-act="again">✗ Again</button>' +
            '<button type="button" class="btn big primary" data-act="good">✓ I knew it</button></div>' : '') + '</div>';
      }
      function grade(good) {
        var s = study, c = s.queue.shift();
        s.flipped = false;
        s.seen++;
        if (!s.practice) {
          if (good) {
            c.box = Math.min(5, c.box + 1);
            c.due = MP.dayKey(MP.addDays(new Date(), DAYS_FOR_BOX[c.box]));
          } else {
            c.box = 1;
            c.due = today();
          }
          save();
        }
        if (good) s.right++;
        else s.queue.splice(Math.min(s.queue.length, 3), 0, c);
        drawStudy();
      }

      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var d = deck((ctx.arg || '').slice(2));
        if (act === 'newdeck') editDeck(null);
        if (act === 'addcard' && d) editCard(d, null);
        if (act === 'bulk' && d) bulkAdd(d);
        if (act === 'editcard' && d) {
          var cid = el.closest('[data-c]').getAttribute('data-c');
          editCard(d, d.cards.filter(function (x) { return x.id === cid; })[0]);
        }
        if (study && act === 'flip') { study.flipped = !study.flipped; drawStudy(); }
        if (study && act === 'say') {
          var c = study.queue[0];
          if (c) MP.say(study.flipped ? c.b : c.f, { lang: study.flipped ? study.d.bl : study.d.fl, rate: 0.9 });
        }
        if (study && act === 'again') grade(false);
        if (study && act === 'good') grade(true);
      });
      ctx.delegate(ctx.bar, 'click', '[data-act="deckset"]', function () { editDeck(deck((ctx.arg || '').slice(2))); });

      show(ctx.arg);
    }
  });
})();
