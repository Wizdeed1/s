/* Medicines: today's doses, a "taken" log, and on-screen reminders while MiniPad is open.
   A helper only: it cannot alert you when the iPad is locked or MiniPad is closed. */
(function () {
  function meds() { return MP.store.get('meds.list', []); }
  function log() { return MP.store.get('meds.log', {}); }
  function doses(day) {
    var out = [];
    meds().forEach(function (m) {
      (m.times || []).forEach(function (t) { out.push({ med: m, time: t, key: m.id + '@' + t, day: day || MP.dayKey() }); });
    });
    return out.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
  }
  function minutesOf(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function markTaken(key, day) {
    var l = log();
    day = day || MP.dayKey();
    l[day] = l[day] || {};
    l[day][key] = Date.now();
    // keep 60 days of history
    Object.keys(l).sort().slice(0, -60).forEach(function (d) { delete l[d]; });
    MP.store.set('meds.log', l);
    MP.emit('meds');
  }

  var showing = false;
  function remind() {
    if (showing) return;
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes(), day = MP.dayKey(now);
    var taken = log()[day] || {};
    var snoozed = MP.store.get('meds.snooze', {});
    var due = doses(day).filter(function (d) {
      var m = minutesOf(d.time);
      return !taken[d.key] && mins >= m && mins - m <= 120 && !(snoozed[day + d.key] > Date.now()) && snoozed[day + d.key] !== -1;
    })[0];
    if (!due) return;
    showing = true;
    MP.chime();
    setTimeout(function () { MP.say('Time for your medicine: ' + due.med.name); }, 1300);
    MP.modal({
      cls: 'ring-modal',
      dismissable: false,
      html: '<div class="ring-icon">💊</div><div class="ring-label">' + MP.esc(due.med.name) + '</div><div class="muted">' +
        MP.esc(due.med.dose || '') + ' · ' + MP.fmtHHMM(due.time) + '</div>' + (due.med.notes ? '<p>' + MP.esc(due.med.notes) + '</p>' : ''),
      buttons: [{ label: 'Skip today', value: 'skip' }, { label: 'In 10 minutes', value: 'snooze' }, { label: 'Taken', value: 'taken', kind: 'primary big' }]
    }).then(function (v) {
      showing = false;
      var s = MP.store.get('meds.snooze', {});
      if (v === 'taken') markTaken(due.key, day);
      else if (v === 'snooze') s[day + due.key] = Date.now() + 10 * 60000;
      else if (v === 'skip') s[day + due.key] = -1;
      Object.keys(s).forEach(function (k) { if (k.slice(0, 10) < MP.dayKey(MP.addDays(new Date(), -2))) delete s[k]; });
      MP.store.set('meds.snooze', s);
      MP.emit('meds');
    });
  }

  MP.define('meds', {
    background: remind,
    mount: function (root, ctx) {
      var tab = 'today';
      function render() {
        ctx.actions('<button type="button" class="btn small primary" data-act="add">+ Medicine</button>');
        var list = meds();
        var html = '<div class="wrap"><div class="tabs"><button type="button" class="tab" data-tab="today" aria-selected="' + (tab === 'today') + '">Today</button>' +
          '<button type="button" class="tab" data-tab="list" aria-selected="' + (tab === 'list') + '">My medicines</button>' +
          '<button type="button" class="tab" data-tab="week" aria-selected="' + (tab === 'week') + '">Last 7 days</button></div>';
        if (!list.length) {
          html += '<div class="card center"><p>Add your medicines and the times you take them. MiniPad shows a reminder on screen at those times while it is open.</p>' +
            '<button type="button" class="btn primary big" data-act="add">+ Add a medicine</button></div>';
        } else if (tab === 'today') {
          var day = MP.dayKey(), taken = log()[day] || {}, now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
          var snoozed = MP.store.get('meds.snooze', {});
          html += '<div class="list">' + doses(day).map(function (d) {
            var m = minutesOf(d.time), t = taken[d.key];
            var status = t ? '<span class="pill md-ok">✓ Taken ' + MP.fmtTime(new Date(t)) + '</span>' :
              snoozed[day + d.key] === -1 ? '<span class="pill">Skipped</span>' :
                mins >= m + 120 ? '<span class="pill md-miss">Missed?</span>' :
                  mins >= m ? '<span class="pill md-due">Due now</span>' : '<span class="pill">Later</span>';
            return '<div class="row md-row" data-key="' + d.key + '"><div class="md-time">' + MP.fmtHHMM(d.time) + '</div>' +
              '<div class="grow"><b>' + MP.esc(d.med.name) + '</b><div class="muted small">' + MP.esc(d.med.dose || '') + '</div></div>' + status +
              (t ? '<button type="button" class="btn small ghost" data-act="untake">Undo</button>' : '<button type="button" class="btn small primary" data-act="take">Taken</button>') + '</div>';
          }).join('') + '</div>';
        } else if (tab === 'list') {
          html += '<div class="list">' + list.map(function (m) {
            return '<div class="row" data-id="' + m.id + '"><div class="grow"><b>' + MP.esc(m.name) + '</b><div class="muted small">' + MP.esc(m.dose || '') + ' · ' +
              (m.times || []).map(MP.fmtHHMM).join(', ') + '</div></div><button type="button" class="btn small" data-act="edit">Edit</button></div>';
          }).join('') + '</div>';
        } else {
          var l = log(), dayList = [];
          for (var i = 6; i >= 0; i--) dayList.push(MP.addDays(new Date(), -i));
          html += '<div class="card md-week"><table><tr><th></th>' + dayList.map(function (d) { return '<th>' + MP.DAYS[d.getDay()].slice(0, 3) + '<br>' + d.getDate() + '</th>'; }).join('') + '</tr>' +
            doses().map(function (d) {
              return '<tr><td>' + MP.esc(d.med.name) + ' <span class="muted small">' + MP.fmtHHMM(d.time) + '</span></td>' + dayList.map(function (day) {
                var k = MP.dayKey(day);
                return '<td>' + (l[k] && l[k][d.key] ? '✅' : k === MP.dayKey() ? '·' : '—') + '</td>';
              }).join('') + '</tr>';
            }).join('') + '</table></div>';
        }
        html += '<p class="muted small center" style="margin-top:16px">Reminders only appear while the iPad is on and MiniPad is open. This is a helper, not a medical device: follow your doctor\'s or pharmacist\'s advice.</p></div>';
        root.innerHTML = html;
      }
      function edit(m) {
        var isNew = !m;
        MP.form({
          title: isNew ? 'New medicine' : 'Edit medicine',
          del: !isNew,
          fields: [{ name: 'name', label: 'Name', value: m ? m.name : '', required: true },
            { name: 'dose', label: 'How much', value: m ? m.dose : '', placeholder: 'For example: 1 tablet' },
            { name: 't1', label: 'Time 1', type: 'time', value: m && m.times[0] ? m.times[0] : '08:00' },
            { name: 't2', label: 'Time 2 (optional)', type: 'time', value: m && m.times[1] ? m.times[1] : '' },
            { name: 't3', label: 'Time 3 (optional)', type: 'time', value: m && m.times[2] ? m.times[2] : '' },
            { name: 't4', label: 'Time 4 (optional)', type: 'time', value: m && m.times[3] ? m.times[3] : '' },
            { name: 'notes', label: 'Notes', value: m ? m.notes : '', placeholder: 'For example: with food' }]
        }).then(function (v) {
          if (!v) return;
          var list = meds();
          if (v === 'delete') list = list.filter(function (x) { return x.id !== m.id; });
          else {
            var times = [v.t1, v.t2, v.t3, v.t4].filter(function (t) { return /^\d\d:\d\d/.test(t || ''); }).map(function (t) { return t.slice(0, 5); }).sort();
            if (!times.length) { MP.toast('Add at least one time.'); return; }
            var item = { id: m ? m.id : MP.uid(), name: v.name, dose: v.dose, times: times, notes: v.notes };
            if (isNew) list.push(item); else list = list.map(function (x) { return x.id === m.id ? item : x; });
          }
          MP.store.set('meds.list', list);
          MP.needsBackground('meds', list.length > 0);
          render();
        });
      }
      ctx.delegate(root, 'click', '[data-tab]', function (e, el) { tab = el.getAttribute('data-tab'); render(); });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var row = el.closest('[data-key]'), idRow = el.closest('[data-id]');
        if (act === 'add') edit(null);
        if (act === 'edit' && idRow) edit(meds().filter(function (x) { return x.id === idRow.getAttribute('data-id'); })[0]);
        if (act === 'take' && row) { markTaken(row.getAttribute('data-key')); MP.ding(); }
        if (act === 'untake' && row) {
          var l = log(), day = MP.dayKey();
          if (l[day]) delete l[day][row.getAttribute('data-key')];
          MP.store.set('meds.log', l);
          render();
        }
      });
      ctx.delegate(ctx.bar, 'click', '[data-act="add"]', function () { edit(null); });
      ctx.on('meds', render);
      ctx.every(30000, render);
      render();
    }
  });
})();
