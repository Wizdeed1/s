/* Family board: shopping list, chores and sticky notes. Optional sync with phones
   through MiniPad's server (needs the passcode in Settings). */
(function () {
  var QUICK = ['Milk', 'Bread', 'Eggs', 'Butter', 'Cheese', 'Fruit', 'Vegetables', 'Rice', 'Pasta', 'Coffee', 'Tea', 'Toilet paper', 'Soap', 'Dog food'];
  var COLORS = [['yellow', 'Yellow'], ['pink', 'Pink'], ['blue', 'Blue'], ['green', 'Green'], ['orange', 'Orange']];
  var MONTH = 30 * 24 * 3600 * 1000;

  function merge(a, b) {
    var out = {}, now = Date.now();
    Object.keys(a || {}).forEach(function (k) { out[k] = a[k]; });
    Object.keys(b || {}).forEach(function (k) {
      if (!out[k] || (b[k].u || 0) > (out[k].u || 0)) out[k] = b[k];
    });
    Object.keys(out).forEach(function (k) { if (out[k].del && now - (out[k].u || 0) > MONTH) delete out[k]; });
    return out;
  }

  MP.define('family', {
    mount: function (root, ctx) {
      var board = ctx.get('board', { items: {} });
      var members = ctx.get('members', ['Everyone']);
      var tab = ctx.get('tab', 'shop');
      var syncState = '';
      var syncTimer = null;
      var canSync = !!MP.settings().passcode;

      function items(list) {
        return Object.keys(board.items).map(function (k) { return board.items[k]; })
          .filter(function (x) { return x.list === list && !x.del; })
          .sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.c || 0) - (b.c || 0); });
      }
      function touch(it) { it.u = Date.now(); board.items[it.id] = it; }
      function save() {
        ctx.set('board', board);
        render();
        if (canSync) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 1500); }
      }
      function add(list, fields) {
        var it = Object.assign({ id: MP.uid(), list: list, done: false, c: Date.now() }, fields);
        touch(it);
        save();
      }

      function sync() {
        if (!canSync) return;
        syncState = 'Syncing…'; drawSync();
        MP.api('store?key=board').then(function (j) {
          var remote = (j && j.value && j.value.items) || {};
          board.items = merge(board.items, remote);
          return MP.api('store?key=board', { method: 'PUT', body: { items: board.items } });
        }).then(function () {
          ctx.set('board', board);
          syncState = 'Synced ' + MP.fmtTime(new Date());
          render();
        }).catch(function (err) {
          syncState = err.status === 401 ? 'Wrong passcode' : (err.status === 404 || err.status === 503 ? 'Sync not set up' : 'Offline');
          drawSync();
        });
      }
      function drawSync() {
        ctx.actions(canSync ? '<span class="muted small" style="margin-right:6px">' + MP.esc(syncState) + '</span><button type="button" class="btn small" data-act="sync">↻ Sync</button>' : '');
      }

      function render() {
        drawSync();
        var tabs = [['shop', '🛒 Shopping'], ['chore', '🧹 Chores'], ['note', '🗒️ Notes']];
        var html = '<div class="wrap"><div class="tabs">' + tabs.map(function (t) {
          return '<button type="button" class="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
        }).join('') + '</div>';
        if (tab === 'shop') {
          var shop = items('shop');
          html += '<div class="add-row"><input type="text" id="f-in" placeholder="Add to the shopping list"><button type="button" class="btn primary" data-act="addshop">Add</button></div>' +
            '<div class="chips">' + QUICK.map(function (q) { return '<button type="button" class="chip" data-quick="' + MP.esc(q) + '">+ ' + MP.esc(q) + '</button>'; }).join('') + '</div>' +
            (shop.length ? '<div class="list">' + shop.map(row).join('') + '</div>' : '<div class="empty-note">The list is empty.</div>') +
            '<div class="hstack" style="margin-top:12px"><button type="button" class="btn ghost" data-act="clearshop">Clear bought items</button></div>';
        } else if (tab === 'chore') {
          var chores = items('chore');
          html += '<div class="add-row"><input type="text" id="f-in" placeholder="A job to do"><select id="f-who" style="width:auto;margin-right:8px">' +
            members.map(function (m) { return '<option>' + MP.esc(m) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn primary" data-act="addchore">Add</button></div>' +
            (chores.length ? '<div class="list">' + chores.map(row).join('') + '</div>' : '<div class="empty-note">No chores yet.</div>') +
            '<div class="hstack" style="margin-top:12px"><button type="button" class="btn ghost" data-act="newday">New day: untick all</button>' +
            '<button type="button" class="btn ghost" data-act="people">People…</button></div>';
        } else {
          var notes = items('note');
          html += '<div class="toolbar"><button type="button" class="btn primary" data-act="addnote">+ New note</button></div>' +
            (notes.length ? '<div class="f-notes">' + notes.map(function (n) {
              return '<button type="button" class="f-note n-' + (n.color || 'yellow') + '" data-id="' + n.id + '" data-act="editnote">' +
                MP.esc(n.text) + '<span class="f-ndate">' + MP.fmtDate(new Date(n.u), 'short') + '</span></button>';
            }).join('') + '</div>' : '<div class="empty-note">No notes yet. Leave one for the family.</div>');
        }
        html += canSync ? '' : '<p class="muted small center" style="margin-top:20px">To share this board with phones, set up the online features and enter the passcode in Settings.</p>';
        root.innerHTML = html + '</div>';
      }
      function row(it) {
        return '<div class="row' + (it.done ? ' done' : '') + '" data-id="' + it.id + '">' +
          '<button type="button" class="check' + (it.done ? ' on' : '') + '" data-act="toggle" aria-label="Done">✓</button>' +
          '<div class="grow">' + MP.esc(it.text) + (it.who ? ' <span class="pill">' + MP.esc(it.who) + '</span>' : '') + '</div>' +
          '<button type="button" class="del" data-act="del" aria-label="Delete">×</button></div>';
      }
      function readInput() {
        var el = MP.qs('#f-in', root);
        var v = el ? el.value.trim() : '';
        if (el) el.value = '';
        return v;
      }
      function editNote(n) {
        var isNew = !n;
        MP.form({
          title: isNew ? 'New note' : 'Note',
          del: !isNew,
          fields: [
            { name: 'text', label: 'Note', type: 'textarea', rows: 5, value: n ? n.text : '', required: true },
            { name: 'color', label: 'Colour', type: 'select', options: COLORS.map(function (c) { return { value: c[0], label: c[1] }; }), value: n ? n.color : 'yellow' }
          ]
        }).then(function (v) {
          if (!v) return;
          if (v === 'delete') { n.del = true; touch(n); save(); return; }
          if (isNew) add('note', { text: v.text, color: v.color });
          else { n.text = v.text; n.color = v.color; touch(n); save(); }
        });
      }

      ctx.delegate(root, 'click', '[data-tab]', function (e, el) { tab = el.getAttribute('data-tab'); ctx.set('tab', tab); render(); });
      ctx.delegate(root, 'click', '[data-quick]', function (e, el) { add('shop', { text: el.getAttribute('data-quick') }); });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var r = el.closest('[data-id]');
        var it = r ? board.items[r.getAttribute('data-id')] : null;
        var text;
        switch (act) {
          case 'addshop': text = readInput(); if (text) add('shop', { text: text }); break;
          case 'addchore':
            text = readInput();
            if (text) add('chore', { text: text, who: MP.qs('#f-who', root).value });
            break;
          case 'toggle': if (it) { it.done = !it.done; touch(it); save(); } break;
          case 'del': if (it) { it.del = true; touch(it); save(); } break;
          case 'clearshop': items('shop').forEach(function (x) { if (x.done) { x.del = true; touch(x); } }); save(); break;
          case 'newday': items('chore').forEach(function (x) { if (x.done) { x.done = false; touch(x); } }); save(); break;
          case 'addnote': editNote(null); break;
          case 'editnote': if (it) editNote(it); break;
          case 'people':
            MP.form({ title: 'People', fields: [{ name: 'm', label: 'One name per line', type: 'textarea', rows: 6, value: members.join('\n') }] }).then(function (v) {
              if (!v || v === 'delete') return;
              members = v.m.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
              if (!members.length) members = ['Everyone'];
              ctx.set('members', members);
              render();
            });
            break;
          default: break;
        }
      });
      ctx.listen(root, 'keydown', function (e) {
        if (e.keyCode !== 13 || !e.target || e.target.id !== 'f-in') return;
        e.preventDefault();
        var b = MP.qs('[data-act="addshop"], [data-act="addchore"]', root);
        if (b) b.click();
      });
      ctx.delegate(ctx.bar, 'click', '[data-act="sync"]', function () { sync(); });
      if (canSync) ctx.every(60000, sync);

      render();
      if (canSync) sync();
    }
  });
})();
