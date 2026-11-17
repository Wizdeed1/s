/* Settings: look, clock, units, voice, online passcode, backup and restore. */
MP.define('settings', {
  mount: function (root, ctx) {
    function seg(name, value, options) {
      return '<div class="tabs" data-setting="' + name + '">' + options.map(function (o) {
        return '<button type="button" class="tab" data-value="' + MP.esc(String(o[0])) + '" aria-selected="' +
          (String(value) === String(o[0])) + '">' + MP.esc(o[1]) + '</button>';
      }).join('') + '</div>';
    }

    function render() {
      var s = MP.settings();
      root.innerHTML = '<div class="wrap">' +
        '<div class="section-title">Look</div>' +
        seg('theme', s.theme, [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Dark at night']]) +
        '<div class="section-title">Clock</div>' +
        seg('clock24', s.clock24, [[false, '12-hour'], [true, '24-hour']]) +
        '<div class="section-title">Temperature</div>' +
        seg('tempUnit', s.tempUnit, [['C', '°C'], ['F', '°F']]) +
        '<div class="section-title">Speaking voice</div>' +
        seg('speechRate', s.speechRate, [[0.8, 'Slower'], [1, 'Normal'], [1.2, 'Faster']]) +
        '<button type="button" class="btn" data-act="voice">🔈 Test the voice</button>' +

        '<div class="section-title">Online features</div>' +
        '<div class="card"><p>Ask Claude and family-board sync use MiniPad\'s small server. ' +
        'Type the passcode you chose when setting it up (APP_PASSCODE).</p>' +
        '<div class="add-row"><input type="password" id="pc" autocapitalize="off" autocorrect="off" placeholder="Passcode" value="' + MP.esc(s.passcode) + '">' +
        '<button type="button" class="btn primary" data-act="savepc">Save</button></div>' +
        '<button type="button" class="btn" data-act="test">Test connection</button> <span id="testres" class="muted"></span></div>' +

        '<div class="section-title">Back up and restore</div>' +
        '<div class="card"><p>Everything you add lives only on this iPad. Removing the MiniPad icon from the Home Screen also removes its data, so make a backup now and then.</p>' +
        '<div class="hstack"><button type="button" class="btn" data-act="backup">Make a backup</button>' +
        '<button type="button" class="btn" data-act="restore">Restore a backup</button>' +
        '<button type="button" class="btn" data-act="cloudsave">Save backup online</button>' +
        '<button type="button" class="btn" data-act="cloudload">Restore online backup</button></div>' +
        '<p class="muted small">The online backup needs the passcode above and the storage set up on the server.</p></div>' +

        '<div class="section-title">Add MiniPad to the Home Screen</div>' +
        '<div class="card"><ol class="steps"><li>Open MiniPad in Safari.</li><li>Tap the Share button (the square with an arrow).</li>' +
        '<li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open MiniPad from its new icon: it fills the whole screen and works without internet.</li></ol></div>' +

        '<div class="section-title">Start over</div>' +
        '<button type="button" class="btn danger ghost" data-act="wipe">Delete all MiniPad data</button>' +
        '<p class="muted small" style="margin-top:20px">MiniPad ' + MP.version + '. Made for Safari 12 on the iPad mini 2. ' +
        'Weather from Open-Meteo.com.</p></div>';
    }

    function allData() {
      var out = {};
      MP.store.keys().forEach(function (k) { out[k] = MP.store.get(k, null); });
      return { app: 'MiniPad', version: MP.version, savedAt: new Date().toISOString(), data: out };
    }
    function restoreFrom(obj) {
      if (!obj || obj.app !== 'MiniPad' || !obj.data) { MP.alert('That does not look like a MiniPad backup.'); return; }
      MP.confirm('Replace everything in MiniPad with the backup from ' + String(obj.savedAt || '').slice(0, 10) + '?', 'Replace', true).then(function (ok) {
        if (!ok) return;
        MP.store.keys().forEach(function (k) { MP.store.remove(k); });
        Object.keys(obj.data).forEach(function (k) { MP.store.set(k, obj.data[k]); });
        MP.toast('Restored. Restarting…');
        setTimeout(function () { location.hash = ''; location.reload(); }, 900);
      });
    }

    render();

    ctx.delegate(root, 'click', '[data-setting] .tab', function (e, btn) {
      var name = btn.parentNode.getAttribute('data-setting');
      var raw = btn.getAttribute('data-value');
      var val = raw;
      if (name === 'clock24') val = raw === 'true';
      if (name === 'speechRate') val = Number(raw);
      MP.setSetting(name, val);
      render();
    });

    ctx.delegate(root, 'click', '[data-act]', function (e, btn) {
      var act = btn.getAttribute('data-act');
      if (act === 'voice') MP.say('Hello! This is how MiniPad sounds when it reads to you.');
      if (act === 'savepc') {
        MP.setSetting('passcode', MP.qs('#pc', root).value.trim());
        MP.toast('Passcode saved on this iPad.');
      }
      if (act === 'test') {
        var res = MP.qs('#testres', root);
        res.textContent = 'Checking…';
        MP.api('ping').then(function (j) {
          var bits = [];
          bits.push(j.passcodeOk ? 'Passcode OK' : 'Passcode not accepted');
          bits.push(j.claude ? 'Claude ready' : 'Claude not set up');
          bits.push(j.storage ? 'Sync ready' : 'Sync storage not set up');
          res.textContent = bits.join(' · ');
        }).catch(function (err) {
          res.textContent = err.status === 404 ? 'The server part is not set up yet.' : err.message;
        });
      }
      if (act === 'backup') {
        var text = JSON.stringify(allData());
        MP.modal({
          title: 'Your backup',
          html: '<p>Tap <b>Copy</b>, then paste it into a note or an email to yourself. It is ' + Math.round(text.length / 1024) + ' KB.</p>' +
            '<textarea rows="6" readonly id="bk">' + MP.esc(text) + '</textarea>',
          buttons: [{ label: 'Close', value: 'close' }, { label: 'Copy', value: 'copy', kind: 'primary' }],
          collect: function (wrap, v) {
            if (v === 'copy') {
              MP.toast(MP.copyText(text) ? 'Copied. Paste it somewhere safe.' : 'Press and hold the text, then Select All and Copy.');
              return false;
            }
            return v;
          }
        });
      }
      if (act === 'restore') {
        MP.form({
          title: 'Restore a backup',
          intro: 'Paste the backup text you copied earlier.',
          fields: [{ name: 'text', type: 'textarea', rows: 6, label: 'Backup text', required: true }],
          ok: 'Restore'
        }).then(function (v) {
          if (!v || v === 'delete') return;
          var obj = null;
          try { obj = JSON.parse(v.text); } catch (err) { obj = null; }
          restoreFrom(obj);
        });
      }
      if (act === 'cloudsave') {
        MP.toast('Saving…');
        MP.api('store?key=backup', { method: 'PUT', body: allData() }).then(function () {
          MP.toast('Backup saved online.');
        }).catch(function (err) { MP.alert(err.message, 'Could not save'); });
      }
      if (act === 'cloudload') {
        MP.api('store?key=backup').then(function (j) {
          if (!j || !j.value) { MP.alert('There is no online backup yet.'); return; }
          restoreFrom(j.value);
        }).catch(function (err) { MP.alert(err.message, 'Could not load'); });
      }
      if (act === 'wipe') {
        MP.confirm('Delete every list, note, recipe, contact and setting in MiniPad on this iPad?', 'Delete all', true).then(function (ok) {
          if (!ok) return;
          MP.store.keys().forEach(function (k) { MP.store.remove(k); });
          location.hash = '';
          location.reload();
        });
      }
    });
  }
});
