/* Focus timer: work in short blocks with breaks in between (the "pomodoro" way). */
MP.define('focus', {
  mount: function (root, ctx) {
    var cfg = Object.assign({ focus: 25, short: 5, long: 15, every: 4 }, ctx.get('cfg', {}));
    var st = Object.assign({ phase: 'focus', round: 0 }, ctx.get('state', {}));
    var LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };
    var R = 120, CIRC = 2 * Math.PI * R;

    function timer() { return MP.timers.list().filter(function (t) { return t.kind === 'focus'; })[0] || null; }
    function minutes(phase) { return cfg[phase]; }
    function todayCount() { var d = ctx.get('days', {}); return d[MP.dayKey()] || 0; }
    function saveState() { ctx.set('state', st); }

    // A finished timer moves us on to the next part.
    function settle() {
      var t = timer();
      if (!t || !t.rang) return;
      MP.timers.remove(t.id);
      if (st.phase === 'focus') {
        var d = ctx.get('days', {});
        d[MP.dayKey()] = (d[MP.dayKey()] || 0) + 1;
        ctx.set('days', d);
        st.round++;
        st.phase = st.round % cfg.every === 0 ? 'long' : 'short';
      } else st.phase = 'focus';
      saveState();
    }
    function render() {
      settle();
      var t = timer();
      var total = minutes(st.phase) * 60000;
      var left = t ? MP.timers.left(t) : total;
      var frac = t ? Math.max(0, Math.min(1, left / t.total)) : 1;
      var dots = '';
      for (var i = 0; i < cfg.every; i++) dots += '<span class="fo-dot' + (i < st.round % cfg.every || (st.round && st.round % cfg.every === 0 && st.phase === 'long') ? ' on' : '') + '"></span>';
      ctx.actions('<button type="button" class="btn small" data-act="cfg">Times</button>');
      root.innerHTML = '<div class="fo fo-' + st.phase + '">' +
        '<div class="fo-phase">' + LABEL[st.phase] + '</div>' +
        '<div class="fo-ring"><svg viewBox="0 0 280 280" width="280" height="280"><circle cx="140" cy="140" r="' + R + '" class="fo-track"/>' +
        '<circle cx="140" cy="140" r="' + R + '" class="fo-prog" id="fo-prog" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + (CIRC * (1 - frac)).toFixed(1) + '"/></svg>' +
        '<div class="fo-time big-num" id="fo-time">' + MP.fmtDuration(left) + '</div></div>' +
        '<div class="fo-dots">' + dots + '</div>' +
        '<div class="hstack fo-btns">' +
        (!t ? '<button type="button" class="btn big primary" data-act="start">▶ Start ' + LABEL[st.phase].toLowerCase() + '</button>' :
          t.paused != null ? '<button type="button" class="btn big primary" data-act="resume">▶ Carry on</button>' :
            '<button type="button" class="btn big" data-act="pause">❚❚ Pause</button>') +
        (t ? '<button type="button" class="btn big ghost" data-act="reset">Reset</button>' : '') +
        '<button type="button" class="btn big ghost" data-act="skip">Skip ›</button></div>' +
        '<div class="hstack fo-btns"><button type="button" class="btn' + (MP.noise.state().kind === 'brown' ? ' on' : '') + '" data-act="noise">🎧 Calm background sound</button></div>' +
        '<p class="muted center">Today: ' + todayCount() + ' focus block' + (todayCount() === 1 ? '' : 's') + ' done.</p></div>';
    }
    function tick() {
      var t = timer();
      if (!t) return;
      if (t.rang) { render(); return; }
      var left = MP.timers.left(t);
      var el = MP.qs('#fo-time', root), prog = MP.qs('#fo-prog', root);
      if (el) el.textContent = MP.fmtDuration(left);
      if (prog) prog.setAttribute('stroke-dashoffset', (CIRC * (1 - Math.max(0, left / t.total))).toFixed(1));
    }

    ctx.delegate(root, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act'), t = timer();
      if (act === 'start') MP.timers.add(LABEL[st.phase] + ' finished', minutes(st.phase) * 60000, 'focus');
      if (act === 'pause' && t) MP.timers.pause(t.id);
      if (act === 'resume' && t) MP.timers.resume(t.id);
      if (act === 'reset' && t) MP.timers.remove(t.id);
      if (act === 'skip') {
        if (t) MP.timers.remove(t.id);
        st.phase = st.phase === 'focus' ? 'short' : 'focus';
        saveState();
      }
      if (act === 'noise') { if (MP.noise.state().kind === 'brown') MP.noise.stop(); else MP.noise.play('brown', 0.35); }
      render();
    });
    ctx.delegate(ctx.bar, 'click', '[data-act="cfg"]', function () {
      MP.form({
        title: 'Times (minutes)',
        fields: [{ name: 'focus', label: 'Focus', type: 'number', value: cfg.focus, min: 1 },
          { name: 'short', label: 'Short break', type: 'number', value: cfg.short, min: 1 },
          { name: 'long', label: 'Long break', type: 'number', value: cfg.long, min: 1 },
          { name: 'every', label: 'Long break after this many focus blocks', type: 'number', value: cfg.every, min: 2 }]
      }).then(function (v) {
        if (!v || v === 'delete') return;
        Object.keys(v).forEach(function (k) { if (v[k] > 0) cfg[k] = Math.round(v[k]); });
        ctx.set('cfg', cfg);
        render();
      });
    });
    ctx.on('tick', tick);
    ctx.on('timer-stopped', function (t) { if (t.kind === 'focus') render(); });
    ctx.on('timers', render);
    ctx.on('noise', render);
    render();
  }
});
