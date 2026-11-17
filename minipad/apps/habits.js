/* Habits: tick off each day and keep a streak going. */
MP.define('habits', {
  mount: function (root, ctx) {
    var ICONS = ['💧', '🚶', '📚', '🧘', '🦷', '🥗', '😴', '💪', '🎹', '🌱', '✍️', '🙏', '🚭', '🧹', '💊', '☀️'];
    var habits = ctx.get('list', null);
    if (!habits) { habits = [{ id: MP.uid(), name: 'Drink water', icon: '💧', days: {} }, { id: MP.uid(), name: 'Go for a walk', icon: '🚶', days: {} }]; ctx.set('list', habits); }

    function save() { ctx.set('list', habits); render(); }
    function streak(h) {
      var n = 0, d = new Date();
      if (!h.days[MP.dayKey(d)]) d = MP.addDays(d, -1);   // today not done yet still counts yesterday's streak
      while (h.days[MP.dayKey(d)]) { n++; d = MP.addDays(d, -1); }
      return n;
    }
    function render() {
      var days = [];
      for (var i = 6; i >= 0; i--) days.push(MP.addDays(new Date(), -i));
      ctx.actions('<button type="button" class="btn small primary" data-act="add">+ Habit</button>');
      root.innerHTML = '<div class="wrap">' + (habits.length ? habits.map(function (h) {
        var s = streak(h), today = !!h.days[MP.dayKey()];
        return '<div class="card hb" data-id="' + h.id + '"><div class="hb-top"><span class="hb-icon">' + h.icon + '</span>' +
          '<div class="grow"><div class="hb-name">' + MP.esc(h.name) + '</div><div class="muted small">' + (s ? '🔥 ' + s + ' day' + (s > 1 ? 's' : '') + ' in a row' : 'No streak yet') + '</div></div>' +
          '<button type="button" class="btn small ghost" data-act="edit">Edit</button>' +
          '<button type="button" class="hb-today' + (today ? ' on' : '') + '" data-act="today">' + (today ? '✓ Done today' : 'Done today?') + '</button></div>' +
          '<div class="hb-week">' + days.map(function (d) {
            var k = MP.dayKey(d);
            return '<button type="button" class="hb-day' + (h.days[k] ? ' on' : '') + '" data-day="' + k + '"><span>' + MP.DAYS[d.getDay()].slice(0, 2) + '</span>' + d.getDate() + '</button>';
          }).join('') + '</div></div>';
      }).join('') : '<div class="empty-note">Add a habit you want to build.</div>') +
        '<p class="muted small center" style="margin-top:14px">Tap a day to fix a mistake.</p></div>';
    }
    function edit(h) {
      var isNew = !h;
      MP.form({
        title: isNew ? 'New habit' : 'Edit habit',
        del: !isNew,
        fields: [{ name: 'name', label: 'Habit', value: h ? h.name : '', required: true, placeholder: 'For example: Read 10 pages' },
          { name: 'icon', label: 'Picture', type: 'select', options: ICONS, value: h ? h.icon : ICONS[0] }]
      }).then(function (v) {
        if (!v) return;
        if (v === 'delete') habits = habits.filter(function (x) { return x.id !== h.id; });
        else if (isNew) habits.push({ id: MP.uid(), name: v.name, icon: v.icon, days: {} });
        else { h.name = v.name; h.icon = v.icon; }
        save();
      });
    }
    ctx.delegate(root, 'click', '[data-act], [data-day]', function (e, el) {
      var card = el.closest('[data-id]');
      var h = card ? habits.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0] : null;
      var act = el.getAttribute('data-act');
      if (act === 'edit') edit(h);
      if (act === 'today' && h) {
        var k = MP.dayKey();
        if (h.days[k]) delete h.days[k]; else { h.days[k] = true; MP.ding(); }
        save();
      }
      var day = el.getAttribute('data-day');
      if (day && h) { if (h.days[day]) delete h.days[day]; else h.days[day] = true; save(); }
    });
    ctx.delegate(ctx.bar, 'click', '[data-act="add"]', function () { edit(null); });
    render();
  }
});
