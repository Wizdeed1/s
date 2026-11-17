/* Notebook: notes and a daily diary that save as you type. */
MP.define('notebook', {
  mount: function (root, ctx) {
    var notes = ctx.get('notes', []);
    var size = ctx.get('size', 20);
    var saveTimer = null, query = '';

    function save() { ctx.set('notes', notes); }
    function note(id) { return notes.filter(function (n) { return n.id === id; })[0]; }
    function title(n) { var t = (n.body || '').split('\n')[0].trim(); return t || 'Empty note'; }

    function show(arg) {
      ctx.title('Notebook');
      if (arg && arg.indexOf('n-') === 0 && note(arg.slice(2))) return editor(note(arg.slice(2)));
      list();
    }
    this.onArg = show;

    function list() {
      ctx.actions('<button type="button" class="btn small" data-act="diary">📅 Today\'s diary</button><button type="button" class="btn small primary" data-act="new">+ Note</button>');
      notes = notes.filter(function (x) { return x.body.trim(); });
      save();
      root.innerHTML = '<div class="wrap"><input type="search" id="nb-q" placeholder="Search notes" value="' + MP.esc(query) + '" style="margin-bottom:12px">' +
        '<div id="nb-list"></div></div>';
      var input = MP.qs('#nb-q', root);
      ctx.listen(input, 'input', function () { query = input.value; results(); });
      results();
    }
    function results() {
      var q = query.toLowerCase();
      var shown = notes.filter(function (n) { return !q || n.body.toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return b.updated - a.updated; });
      MP.qs('#nb-list', root).innerHTML = shown.length ? '<div class="list">' + shown.map(function (n) {
        var lines = n.body.split('\n');
        return '<a class="row nb-row" href="#/notebook/n-' + n.id + '"><div class="grow"><b>' + MP.esc(title(n)) + '</b><div class="muted small nb-snip">' +
          MP.esc(lines.slice(1).join(' ').slice(0, 120)) + '</div></div><span class="muted small">' + MP.fmtDate(new Date(n.updated), 'short') + '</span></a>';
      }).join('') + '</div>' : '<div class="empty-note">' + (q ? 'No notes match.' : 'No notes yet. Tap "+ Note" to write one.') + '</div>';
    }
    function create(body) {
      var n = { id: MP.uid(), body: body || '', created: Date.now(), updated: Date.now() };
      notes.push(n);
      save();
      MP.go('notebook', 'n-' + n.id);
    }
    function editor(n) {
      ctx.title(title(n));
      ctx.actions('<button type="button" class="btn small" data-act="smaller">A−</button><button type="button" class="btn small" data-act="bigger">A+</button>' +
        '<button type="button" class="btn small" data-act="read">🔈</button><button type="button" class="btn small danger ghost" data-act="delete">Delete</button>');
      root.innerHTML = '<div class="nb-ed"><textarea id="nb-text" placeholder="Start writing… The first line is the title." style="font-size:' + size + 'px">' + MP.esc(n.body) + '</textarea>' +
        '<div class="muted small nb-meta" id="nb-meta">Saved · ' + MP.fmtDate(new Date(n.updated), 'short') + ' ' + MP.fmtTime(new Date(n.updated)) + '</div></div>';
      var ta = MP.qs('#nb-text', root);
      ctx.listen(ta, 'input', function () {
        n.body = ta.value;
        n.updated = Date.now();
        MP.qs('#nb-meta', root).textContent = 'Saving…';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          save();
          ctx.title(title(n));
          var meta = MP.qs('#nb-meta', root);
          if (meta) meta.textContent = 'Saved · ' + MP.fmtTime(new Date());
        }, 500);
      });
    }

    ctx.delegate(ctx.bar, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act');
      var n = ctx.arg ? note(ctx.arg.slice(2)) : null;
      if (act === 'new') create('');
      if (act === 'diary') {
        var head = MP.fmtDate(new Date());
        var existing = notes.filter(function (x) { return x.body.split('\n')[0] === head; })[0];
        if (existing) MP.go('notebook', 'n-' + existing.id); else create(head + '\n\n');
      }
      if (act === 'bigger' || act === 'smaller') {
        size = MP.clamp(size + (act === 'bigger' ? 2 : -2), 14, 40);
        ctx.set('size', size);
        var ta = MP.qs('#nb-text', root);
        if (ta) ta.style.fontSize = size + 'px';
      }
      if (act === 'read' && n) MP.say(n.body);
      if (act === 'delete' && n) {
        MP.confirm('Delete "' + title(n) + '"?', 'Delete', true).then(function (ok) {
          if (!ok) return;
          notes = notes.filter(function (x) { return x.id !== n.id; });
          save();
          MP.go('notebook');
        });
      }
    });
    ctx.cleanup(function () {
      clearTimeout(saveTimer);
      // drop notes left empty
      notes = notes.filter(function (x) { return x.body.trim(); });
      save();
    });
    show(ctx.arg);
  }
});
