/* Teleprompter: big scrolling text with speed, size, mirror and a countdown. */
MP.define('prompter', {
  mount: function (root, ctx) {
    var scripts = ctx.get('scripts', [{ id: 'hello', title: 'Practice script', text: 'Hello, and welcome!\n\nThis is the teleprompter. Your words scroll up slowly while you read them out loud.\n\nTap the screen to pause. Tap again to carry on.\n\nUse the buttons at the bottom to change the speed and the size of the text.\n\nThank you for watching!' }]);
    var o = Object.assign({ speed: 40, size: 56, mirror: false }, ctx.get('opts', {}));
    var run = null;

    function save() { ctx.set('scripts', scripts); ctx.set('opts', o); }
    function list() {
      ctx.immersive(false);
      ctx.actions('');
      root.innerHTML = '<div class="wrap"><div class="toolbar"><button type="button" class="btn primary" data-act="new">+ New script</button></div>' +
        '<div class="list">' + scripts.map(function (s) {
          return '<div class="row" data-id="' + s.id + '"><div class="grow"><b>' + MP.esc(s.title) + '</b><div class="muted small">' +
            s.text.split(/\s+/).filter(Boolean).length + ' words</div></div><button type="button" class="btn small" data-act="edit">Edit</button>' +
            '<button type="button" class="btn small primary" data-act="go">▶ Start</button></div>';
        }).join('') + '</div>' +
        '<p class="muted small center" style="margin-top:16px">Stand the iPad just under your camera so your eyes look close to the lens.</p></div>';
    }
    function edit(s) {
      var isNew = !s;
      MP.form({
        title: isNew ? 'New script' : 'Edit script',
        del: !isNew,
        fields: [{ name: 'title', label: 'Name', value: s ? s.title : '', required: true },
          { name: 'text', label: 'Text', type: 'textarea', rows: 12, value: s ? s.text : '', required: true }]
      }).then(function (v) {
        if (!v) return;
        if (v === 'delete') scripts = scripts.filter(function (x) { return x.id !== s.id; });
        else if (isNew) scripts.push({ id: MP.uid(), title: v.title, text: v.text });
        else { s.title = v.title; s.text = v.text; }
        save(); list();
      });
    }
    function start(s) {
      ctx.immersive(true);
      root.innerHTML = '<div class="tp' + (o.mirror ? ' mirror' : '') + '" id="tp">' +
        '<div class="tp-guide"></div><div class="tp-scroll" id="tp-scroll"><div class="tp-text" id="tp-text" style="font-size:' + o.size + 'px">' +
        s.text.split(/\n{2,}/).map(function (p) { return '<p>' + MP.esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '<p class="tp-end">— End —</p></div></div>' +
        '<div class="tp-count" id="tp-count"></div>' +
        '<div class="tp-ui" id="tp-ui"><button type="button" class="btn" data-act="exit">‹ Scripts</button>' +
        '<button type="button" class="btn" data-act="slower">Slower</button><span class="tp-val" id="tp-speed">' + o.speed + '</span><button type="button" class="btn" data-act="faster">Faster</button>' +
        '<button type="button" class="btn" data-act="smaller">A−</button><button type="button" class="btn" data-act="bigger">A+</button>' +
        '<button type="button" class="btn' + (o.mirror ? ' on' : '') + '" data-act="mirror">Mirror</button>' +
        '<button type="button" class="btn" data-act="restart">⟲ Restart</button></div></div>';
      run = { y: 0, paused: true, last: 0, raf: 0 };
      countdown(3);
    }
    function countdown(n) {
      var el = MP.qs('#tp-count', root);
      if (!el) return;
      if (n <= 0) { el.textContent = ''; run.paused = false; run.last = 0; loop(); return; }
      el.textContent = n;
      MP.tone(660, 0.12, { vol: 0.15 });
      ctx.after(800, function () { countdown(n - 1); });
    }
    function loop() {
      if (!run) return;
      run.raf = window.requestAnimationFrame(function (ts) {
        if (!run) return;
        if (!run.paused) {
          if (run.last) run.y += o.speed * (ts - run.last) / 1000;
          run.last = ts;
          var text = MP.qs('#tp-text', root), sc = MP.qs('#tp-scroll', root);
          if (text && sc) {
            var max = text.offsetHeight - sc.clientHeight * 0.35;
            if (run.y > max) { run.y = max; run.paused = true; }
            text.style.webkitTransform = 'translateY(' + (-run.y) + 'px)';
            text.style.transform = 'translateY(' + (-run.y) + 'px)';
          }
        } else run.last = 0;
        loop();
      });
    }
    function stop() { if (run) { window.cancelAnimationFrame(run.raf); run = null; } }

    var currentScript = null;
    ctx.delegate(root, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act');
      var row = el.closest('[data-id]');
      var s = row ? scripts.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0] : null;
      if (act === 'new') edit(null);
      if (act === 'edit') edit(s);
      if (act === 'go') { currentScript = s; start(s); }
      if (act === 'exit') { stop(); list(); }
      if (act === 'restart' && currentScript) { stop(); start(currentScript); }
      if (act === 'slower' || act === 'faster') {
        o.speed = MP.clamp(o.speed + (act === 'faster' ? 8 : -8), 8, 200);
        MP.qs('#tp-speed', root).textContent = o.speed;
        save();
      }
      if (act === 'smaller' || act === 'bigger') {
        o.size = MP.clamp(o.size + (act === 'bigger' ? 6 : -6), 28, 120);
        MP.qs('#tp-text', root).style.fontSize = o.size + 'px';
        save();
      }
      if (act === 'mirror') { o.mirror = !o.mirror; MP.qs('#tp', root).classList.toggle('mirror', o.mirror); el.classList.toggle('on', o.mirror); save(); }
    });
    // Tap the text to pause or carry on.
    ctx.listen(root, 'click', function (e) {
      if (!run || (e.target.closest && e.target.closest('.tp-ui'))) return;
      if (e.target.closest && e.target.closest('.tp-scroll')) run.paused = !run.paused;
    });
    ctx.cleanup(stop);
    list();
  }
});
