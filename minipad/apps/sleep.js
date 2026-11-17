/* Sleep sounds: rain, waves, wind, fan and noise colours, with a fade-out timer.
   The sound keeps playing while you use other MiniPad pages (stop it from the green chip). */
MP.define('sleep', {
  mount: function (root, ctx) {
    var vol = ctx.get('vol', 0.6);

    function render() {
      var st = MP.noise.state();
      var left = st.endsAt ? Math.max(1, Math.round((st.endsAt - Date.now()) / 60000)) : 0;
      root.innerHTML = '<div class="wrap">' +
        '<div class="sl-grid">' + Object.keys(MP.noise.kinds).map(function (k) {
          var info = MP.noise.kinds[k];
          return '<button type="button" class="sl-btn' + (st.kind === k ? ' on' : '') + '" data-kind="' + k + '"><span>' + info.icon + '</span>' + MP.esc(info.label) + '</button>';
        }).join('') + '</div>' +
        '<div class="card" style="margin-top:16px"><div class="hstack"><span>🔈</span><input type="range" id="sl-vol" min="0.05" max="1" step="0.01" value="' + vol + '" style="flex:1"><span>🔊</span></div>' +
        '<div class="section-title" style="margin-top:8px">Fade out after</div><div class="chips">' +
        [0, 15, 30, 60, 90].map(function (m) {
          var on = m === 0 ? !st.endsAt : (left && Math.abs(left - m) <= 1);
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-min="' + m + '">' + (m ? m + ' min' : 'Never') + '</button>';
        }).join('') + '</div>' +
        (st.kind ? '<div class="hstack"><button type="button" class="btn danger" data-act="stop">■ Stop</button><a class="btn" href="#/nightclock">🌙 Night clock</a>' +
          (left ? '<span class="muted">Fades out in about ' + left + ' min</span>' : '') + '</div>' : '<p class="muted">Tap a sound to start.</p>') +
        '</div><p class="muted small center" style="margin-top:16px">The sound stops if the iPad locks. For a whole night, plug it in and set Auto-Lock to Never.</p></div>';
      ctx.listen(MP.qs('#sl-vol', root), 'input', function (e) {
        vol = +e.target.value;
        ctx.set('vol', vol);
        MP.noise.setVolume(vol);
      });
    }

    ctx.delegate(root, 'click', '[data-kind]', function (e, el) {
      var k = el.getAttribute('data-kind');
      if (MP.noise.state().kind === k) MP.noise.stop(); else MP.noise.play(k, vol);
    });
    ctx.delegate(root, 'click', '[data-min]', function (e, el) {
      var m = +el.getAttribute('data-min');
      if (m && !MP.noise.state().kind) MP.noise.play('rain', vol);
      MP.noise.sleepIn(m);
    });
    ctx.delegate(root, 'click', '[data-act="stop"]', function () { MP.noise.stop(); });
    ctx.on('noise', render);
    render();
  }
});
