/* Draw & colour: finger painting with undo, an eraser and colouring pages.
   Line art sits on its own canvas above the paint, so colouring stays under the lines. */
(function () {
  var COLORS = ['#1c1c1e', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#7cb342', '#2e7d32', '#00acc1',
    '#1e88e5', '#3949ab', '#8e24aa', '#ec407a', '#8d6e63', '#9e9e9e'];
  var SIZES = [4, 10, 22, 40];
  // Colouring pages drawn in a 100 x 100 box: circle, ellipse (with rotation), poly (closed or open), quad (curve) and line.
  var PAGES = {
    house: { name: 'House', icon: '🏠', ops: [
      ['poly', [20, 47, 80, 47, 80, 90, 20, 90], 1], ['poly', [14, 49, 50, 16, 86, 49], 1], ['poly', [44, 66, 56, 66, 56, 90, 44, 90], 1],
      ['poly', [27, 55, 39, 55, 39, 66, 27, 66], 1], ['poly', [61, 55, 73, 55, 73, 66, 61, 66], 1], ['circle', 86, 12, 7],
      ['line', 4, 90, 96, 90], ['circle', 53.5, 79, 1]] },
    flower: { name: 'Flower', icon: '🌼', ops: [
      ['ellipse', 50, 21, 6, 11, 0], ['ellipse', 50, 49, 6, 11, 0], ['ellipse', 36, 35, 11, 6, 0], ['ellipse', 64, 35, 11, 6, 0],
      ['ellipse', 40, 25, 6, 10, -0.8], ['ellipse', 60, 25, 6, 10, 0.8], ['ellipse', 40, 45, 6, 10, 0.8], ['ellipse', 60, 45, 6, 10, -0.8],
      ['circle', 50, 35, 8], ['quad', [50, 60, 46, 76, 50, 94]], ['ellipse', 40, 76, 8, 4, -0.5], ['ellipse', 59, 70, 8, 4, 0.5], ['line', 10, 94, 90, 94]] },
    fish: { name: 'Fish', icon: '🐟', ops: [
      ['ellipse', 45, 52, 28, 17, 0], ['poly', [71, 52, 92, 36, 92, 68], 1], ['circle', 28, 47, 3.5], ['poly', [40, 36, 50, 23, 58, 37], 0],
      ['quad', [20, 58, 26, 62, 32, 58]], ['quad', [52, 40, 58, 52, 52, 64]], ['circle', 14, 28, 3], ['circle', 9, 17, 2.2], ['circle', 15, 8, 1.6],
      ['quad', [5, 88, 25, 82, 45, 88]], ['quad', [55, 90, 75, 84, 95, 90]]] },
    butterfly: { name: 'Butterfly', icon: '🦋', ops: [
      ['ellipse', 33, 37, 17, 13, -0.5], ['ellipse', 67, 37, 17, 13, 0.5], ['ellipse', 37, 64, 12, 9, 0.5], ['ellipse', 63, 64, 12, 9, -0.5],
      ['ellipse', 50, 51, 3.5, 22, 0], ['quad', [49, 30, 43, 18, 38, 14]], ['quad', [51, 30, 57, 18, 62, 14]], ['circle', 37.5, 13.5, 1.8], ['circle', 62.5, 13.5, 1.8],
      ['circle', 31, 36, 5], ['circle', 69, 36, 5], ['circle', 37, 65, 3.5], ['circle', 63, 65, 3.5]] },
    rocket: { name: 'Rocket', icon: '🚀', ops: [
      ['poly', [40, 36, 60, 36, 60, 74, 40, 74], 1], ['poly', [40, 36, 50, 13, 60, 36], 1], ['poly', [40, 58, 29, 79, 40, 74], 0],
      ['poly', [60, 58, 71, 79, 60, 74], 0], ['circle', 50, 48, 6], ['poly', [43, 74, 50, 93, 57, 74], 0], ['poly', [46, 74, 50, 85, 54, 74], 0],
      ['circle', 15, 20, 2], ['circle', 84, 30, 2.5], ['circle', 20, 70, 1.8], ['circle', 82, 82, 2]] },
    cat: { name: 'Cat', icon: '🐱', ops: [
      ['circle', 50, 55, 28], ['poly', [29, 38, 27, 15, 45, 29], 0], ['poly', [71, 38, 73, 15, 55, 29], 0], ['ellipse', 40, 50, 4, 6, 0], ['ellipse', 60, 50, 4, 6, 0],
      ['poly', [46.5, 60, 53.5, 60, 50, 64], 1], ['quad', [50, 64, 46, 70, 41, 68]], ['quad', [50, 64, 54, 70, 59, 68]],
      ['line', 18, 58, 38, 62], ['line', 17, 66, 38, 65], ['line', 82, 58, 62, 62], ['line', 83, 66, 62, 65]] }
  };

  MP.define('draw', {
    mount: function (root, ctx) {
      var art = ctx.get('art', { strokes: [], page: '', w0: 0, h0: 0 });
      var color = ctx.get('color', '#e53935');
      var size = ctx.get('size', 10);
      var eraser = false;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var paint, lines, g, lg, W = 0, H = 0, cur = null, touchId = null, saveTimer = null;

      root.innerHTML = '<div class="dr">' +
        '<div class="dr-tools">' +
        '<div class="dr-colors">' + COLORS.map(function (c) {
          return '<button type="button" class="dr-sw" data-color="' + c + '" style="background:' + c + '" aria-label="Colour"></button>';
        }).join('') + '</div>' +
        '<div class="dr-row">' + SIZES.map(function (s) {
          return '<button type="button" class="dr-size" data-size="' + s + '"><span style="width:' + Math.min(30, s) + 'px;height:' + Math.min(30, s) + 'px"></span></button>';
        }).join('') +
        '<button type="button" class="btn small" data-act="eraser">🧽 Eraser</button>' +
        '<button type="button" class="btn small" data-act="undo">↶ Undo</button>' +
        '<button type="button" class="btn small" data-act="pages">🖍️ Colouring pages</button>' +
        '<button type="button" class="btn small" data-act="clear">🗑️ New</button>' +
        '<button type="button" class="btn small primary" data-act="save">💾 Save</button></div></div>' +
        '<div class="dr-stage" id="dr-stage"><canvas id="dr-paint"></canvas><canvas id="dr-lines"></canvas></div></div>';

      var stage = MP.qs('#dr-stage', root);
      paint = MP.qs('#dr-paint', root);
      lines = MP.qs('#dr-lines', root);

      function setup() {
        var r = stage.getBoundingClientRect();
        W = Math.max(100, Math.floor(r.width));
        H = Math.max(100, Math.floor(r.height));
        [paint, lines].forEach(function (c) {
          c.width = W * dpr; c.height = H * dpr;
          c.style.width = W + 'px'; c.style.height = H + 'px';
        });
        g = paint.getContext('2d');
        lg = lines.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        lg.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!art.w0) { art.w0 = W; art.h0 = H; }
        redraw();
      }
      // Map stored coordinates (made at size w0 x h0) to the current canvas, keeping proportions.
      function view() {
        var s = Math.min(W / art.w0, H / art.h0);
        return { s: s, x: (W - art.w0 * s) / 2, y: (H - art.h0 * s) / 2 };
      }
      function strokePath(c, st, v) {
        var p = st.p;
        c.save();
        c.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
        c.strokeStyle = st.c;
        c.fillStyle = st.c;
        c.lineWidth = st.w * v.s;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (p.length === 2) {
          c.beginPath();
          c.arc(v.x + p[0] * v.s, v.y + p[1] * v.s, st.w * v.s / 2, 0, Math.PI * 2);
          c.fill();
        } else {
          c.beginPath();
          c.moveTo(v.x + p[0] * v.s, v.y + p[1] * v.s);
          for (var i = 2; i < p.length - 2; i += 2) {
            var mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
            c.quadraticCurveTo(v.x + p[i] * v.s, v.y + p[i + 1] * v.s, v.x + mx * v.s, v.y + my * v.s);
          }
          c.lineTo(v.x + p[p.length - 2] * v.s, v.y + p[p.length - 1] * v.s);
          c.stroke();
        }
        c.restore();
      }
      function drawPage() {
        lg.clearRect(0, 0, W, H);
        var page = PAGES[art.page];
        if (!page) return;
        var side = Math.min(W, H) * 0.92;
        var ox = (W - side) / 2, oy = (H - side) / 2, k = side / 100;
        lg.save();
        lg.strokeStyle = '#1c1c1e';
        lg.lineWidth = Math.max(2.5, side / 160);
        lg.lineJoin = 'round';
        lg.lineCap = 'round';
        page.ops.forEach(function (op) {
          lg.beginPath();
          var t = op[0], a = op[1];
          if (t === 'circle') lg.arc(ox + op[1] * k, oy + op[2] * k, op[3] * k, 0, Math.PI * 2);
          else if (t === 'ellipse') lg.ellipse(ox + op[1] * k, oy + op[2] * k, op[3] * k, op[4] * k, op[5] || 0, 0, Math.PI * 2);
          else if (t === 'line') { lg.moveTo(ox + op[1] * k, oy + op[2] * k); lg.lineTo(ox + op[3] * k, oy + op[4] * k); }
          else if (t === 'poly') {
            lg.moveTo(ox + a[0] * k, oy + a[1] * k);
            for (var i = 2; i < a.length; i += 2) lg.lineTo(ox + a[i] * k, oy + a[i + 1] * k);
            if (op[2]) lg.closePath();
          } else if (t === 'quad') {
            lg.moveTo(ox + a[0] * k, oy + a[1] * k);
            for (var j = 2; j + 3 < a.length; j += 4) lg.quadraticCurveTo(ox + a[j] * k, oy + a[j + 1] * k, ox + a[j + 2] * k, oy + a[j + 3] * k);
          }
          lg.stroke();
        });
        lg.restore();
      }
      function redraw() {
        g.clearRect(0, 0, W, H);
        var v = view();
        art.strokes.forEach(function (st) { strokePath(g, st, v); });
        drawPage();
      }
      function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          if (!ctx.set('art', art)) MP.toast('This drawing is too big to keep. Save it to Photos.');
        }, 600);
      }
      function point(x, y) {
        var r = paint.getBoundingClientRect(), v = view();
        return [Math.round(((x - r.left - v.x) / v.s) * 10) / 10, Math.round(((y - r.top - v.y) / v.s) * 10) / 10];
      }
      function start(x, y) {
        var p = point(x, y);
        cur = { c: color, w: size, e: eraser ? 1 : 0, p: p };
        strokePath(g, cur, view());
      }
      function move(x, y) {
        if (!cur) return;
        var p = point(x, y), q = cur.p;
        var dx = p[0] - q[q.length - 2], dy = p[1] - q[q.length - 1];
        if (dx * dx + dy * dy < 2) return;
        q.push(p[0], p[1]);
        // draw just the newest piece
        var v = view(), n = q.length;
        g.save();
        g.globalCompositeOperation = cur.e ? 'destination-out' : 'source-over';
        g.strokeStyle = cur.c;
        g.lineWidth = cur.w * v.s;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(v.x + q[n - 4] * v.s, v.y + q[n - 3] * v.s);
        g.lineTo(v.x + q[n - 2] * v.s, v.y + q[n - 1] * v.s);
        g.stroke();
        g.restore();
      }
      function end() {
        if (!cur) return;
        art.strokes.push(cur);
        cur = null;
        if (art.strokes.length % 25 === 0) redraw();
        save();
      }

      ctx.listen(paint, 'touchstart', function (e) {
        e.preventDefault();
        if (touchId !== null) return;
        var t = e.changedTouches[0];
        touchId = t.identifier;
        start(t.clientX, t.clientY);
      }, { passive: false });
      ctx.listen(paint, 'touchmove', function (e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === touchId) move(t.clientX, t.clientY);
        }
      }, { passive: false });
      function touchEnd(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) { touchId = null; end(); }
        }
      }
      ctx.listen(paint, 'touchend', touchEnd);
      ctx.listen(paint, 'touchcancel', touchEnd);
      var mouseDown = false;
      ctx.listen(paint, 'mousedown', function (e) { mouseDown = true; start(e.clientX, e.clientY); });
      ctx.listen(window, 'mousemove', function (e) { if (mouseDown) move(e.clientX, e.clientY); });
      ctx.listen(window, 'mouseup', function () { if (mouseDown) { mouseDown = false; end(); } });
      ctx.listen(window, 'resize', function () { setTimeout(setup, 250); });

      function drawTools() {
        MP.qsa('.dr-sw', root).forEach(function (b) { b.classList.toggle('on', !eraser && b.getAttribute('data-color') === color); });
        MP.qsa('.dr-size', root).forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-size') === size); });
        MP.qs('[data-act="eraser"]', root).classList.toggle('on', eraser);
      }
      ctx.delegate(root, 'click', '[data-color]', function (e, el) { color = el.getAttribute('data-color'); eraser = false; ctx.set('color', color); drawTools(); });
      ctx.delegate(root, 'click', '[data-size]', function (e, el) { size = +el.getAttribute('data-size'); ctx.set('size', size); drawTools(); });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        if (act === 'eraser') { eraser = !eraser; drawTools(); }
        if (act === 'undo') { art.strokes.pop(); redraw(); save(); }
        if (act === 'clear') {
          MP.confirm('Start a new picture? This one will be wiped.', 'New picture', true).then(function (ok) {
            if (!ok) return;
            art = { strokes: [], page: '', w0: W, h0: H };
            redraw(); save();
          });
        }
        if (act === 'pages') {
          var html = '<div class="dr-pages">' + Object.keys(PAGES).map(function (k) {
            return '<button type="button" class="dr-page" data-v="' + k + '"><span>' + PAGES[k].icon + '</span>' + PAGES[k].name + '</button>';
          }).join('') + '<button type="button" class="dr-page" data-v="none"><span>⬜</span>Blank paper</button></div>';
          MP.modal({ title: 'Pick a picture to colour', html: html, buttons: [{ label: 'Cancel', value: 'cancel' }] }).then(function (v) {
            if (!v || v === 'cancel') return;
            var go = function () {
              art = { strokes: [], page: v === 'none' ? '' : v, w0: W, h0: H };
              redraw(); save();
            };
            if (art.strokes.length) MP.confirm('Start the new page? The current picture will be wiped.', 'Start', true).then(function (ok) { if (ok) go(); });
            else go();
          });
        }
        if (act === 'save') {
          var out = document.createElement('canvas');
          out.width = paint.width; out.height = paint.height;
          var o = out.getContext('2d');
          o.fillStyle = '#ffffff';
          o.fillRect(0, 0, out.width, out.height);
          o.drawImage(paint, 0, 0);
          o.drawImage(lines, 0, 0);
          var url = out.toDataURL('image/jpeg', 0.9);
          MP.modal({
            title: 'Save your picture',
            html: '<p>Press and hold the picture, then tap <b>Save Image</b> (or <b>Add to Photos</b>).</p><img class="dr-out" src="' + url + '" alt="Your picture">',
            buttons: [{ label: 'Done', value: 'ok', kind: 'primary' }]
          });
        }
      });

      drawTools();
      // Wait one frame so the stage has its final size.
      ctx.after(30, setup);
      ctx.cleanup(function () { clearTimeout(saveTimer); ctx.set('art', art); });
    }
  });
})();
