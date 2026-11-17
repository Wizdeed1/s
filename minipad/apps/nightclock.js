/* Night clock: big dim numbers on black. Tap the screen for the controls. */
MP.define('nightclock', {
  mount: function (root, ctx) {
    var COLORS = [['#ff3b30', 'Red'], ['#ff9f0a', 'Amber'], ['#30d158', 'Green'], ['#64d2ff', 'Blue'], ['#f2f2f7', 'White']];
    var o = Object.assign({ color: '#ff3b30', dim: 0.55, sec: false }, ctx.get('opts', {}));
    var hideTimer = null;

    ctx.immersive(true);
    root.innerHTML = '<div class="nc" id="nc">' +
      '<div class="nc-clock" id="ncc"><div class="nc-time big-num" id="nct"></div><div class="nc-date" id="ncd"></div></div>' +
      '<div class="nc-ui" id="ncui" hidden>' +
      '<div class="nc-row"><a class="btn" href="#/">‹ Home</a><span class="spacer"></span>' +
      '<button type="button" class="btn" data-act="wake" id="nc-wake">💡 Keep screen on</button></div>' +
      '<div class="nc-row">' + COLORS.map(function (c) {
        return '<button type="button" class="nc-sw" data-color="' + c[0] + '" style="background:' + c[0] + '" aria-label="' + c[1] + '"></button>';
      }).join('') + '<button type="button" class="btn" data-act="sec">Seconds</button></div>' +
      '<div class="nc-row"><span class="nc-lbl">Brightness</span><input type="range" id="nc-dim" min="0.12" max="1" step="0.02" value="' + o.dim + '"></div>' +
      '<div class="nc-row"><button type="button" class="btn" data-act="rain">🌧️ Rain sound</button>' +
      '<button type="button" class="btn" data-act="sleep30">Stop sound in 30 min</button>' +
      '<button type="button" class="btn" data-act="sleep60">60 min</button></div>' +
      '<p class="nc-tip">For the whole night, set Auto-Lock to Never and keep the iPad plugged in.</p>' +
      '</div></div>';

    var nc = MP.qs('#nc', root), ui = MP.qs('#ncui', root);
    function apply() {
      var clock = MP.qs('#ncc', root);
      clock.style.color = o.color;
      clock.style.opacity = o.dim;
      MP.qsa('.nc-sw', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-color') === o.color); });
      MP.qs('[data-act="sec"]', root).classList.toggle('on', o.sec);
      MP.qs('#nc-wake', root).classList.toggle('on', MP.wake.isOn());
      MP.qs('[data-act="rain"]', root).classList.toggle('on', MP.noise.state().kind === 'rain');
      ctx.set('opts', o);
      draw();
    }
    function draw() {
      var now = new Date(), p = MP.timeParts(now);
      MP.qs('#nct', root).innerHTML = MP.esc(p.hm) + (o.sec ? '<small>:' + p.sec + '</small>' : '') + (p.ampm ? '<small class="nc-ampm">' + p.ampm + '</small>' : '');
      MP.qs('#ncd', root).textContent = MP.fmtDate(now);
    }
    function showUi() {
      ui.hidden = false;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { ui.hidden = true; }, 8000);
    }

    ctx.listen(nc, 'click', function (e) {
      if (ui.contains(e.target)) { showUi(); return; }
      if (ui.hidden) showUi(); else ui.hidden = true;
    });
    ctx.delegate(ui, 'click', '[data-color]', function (e, el) { o.color = el.getAttribute('data-color'); apply(); });
    ctx.delegate(ui, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act');
      if (act === 'sec') o.sec = !o.sec;
      if (act === 'wake') MP.wake.toggle();
      if (act === 'rain') { if (MP.noise.state().kind === 'rain') MP.noise.stop(); else MP.noise.play('rain', 0.5); }
      if (act === 'sleep30' || act === 'sleep60') {
        if (!MP.noise.state().kind) MP.noise.play('rain', 0.5);
        MP.noise.sleepIn(act === 'sleep30' ? 30 : 60);
        MP.toast('The sound will fade out in ' + (act === 'sleep30' ? 30 : 60) + ' minutes.');
      }
      apply();
    });
    ctx.listen(MP.qs('#nc-dim', root), 'input', function (e) { o.dim = +e.target.value; apply(); });
    ctx.on('tick', draw);
    ctx.on('noise', apply);
    ctx.on('wake', apply);
    ctx.cleanup(function () { clearTimeout(hideTimer); });
    apply();
  }
});
