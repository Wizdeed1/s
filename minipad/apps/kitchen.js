/* Kitchen: several timers at once, recipes, and a step-by-step cook mode that reads aloud. */
(function () {
  var SAMPLES = [
    {
      id: 'sample-pancakes', title: 'Easy pancakes', serves: '4 (about 12 pancakes)',
      ingredients: ['200 g plain flour', '2 teaspoons baking powder', '1 tablespoon sugar', 'A pinch of salt', '2 eggs', '300 ml milk', '2 tablespoons melted butter, plus a little for the pan'],
      steps: ['Mix the flour, baking powder, sugar and salt in a big bowl.', 'In a jug, whisk the eggs, milk and melted butter.',
        'Pour the wet mix into the dry mix and stir until just smooth. A few lumps are fine.', 'Let the batter rest for 5 minutes.',
        'Heat a frying pan on medium and rub it with a little butter.', 'Pour in about 3 tablespoons of batter per pancake.',
        'Cook for 2 minutes, until bubbles appear on top, then flip and cook 1 minute more.', 'Keep them warm on a plate under a clean towel while you cook the rest.'],
      notes: 'Nice with fruit, yoghurt, honey or maple syrup.'
    },
    {
      id: 'sample-pasta', title: 'Quick tomato pasta', serves: '2',
      ingredients: ['200 g dried pasta', '1 tablespoon olive oil', '1 clove of garlic, chopped', '1 tin (400 g) chopped tomatoes', 'Salt and pepper', 'A handful of grated cheese', 'Fresh basil, if you have it'],
      steps: ['Boil a big pan of salted water.', 'Add the pasta and cook for 10 minutes, or as the packet says.',
        'Meanwhile, warm the oil in a small pan and cook the garlic for 1 minute.', 'Add the tomatoes, salt and pepper and simmer for 8 minutes.',
        'Drain the pasta, keeping a splash of the water.', 'Stir the pasta into the sauce with the splash of water.', 'Serve with cheese and basil on top.'],
      notes: 'Add a pinch of chilli flakes for a little heat.'
    }
  ];
  var PRESETS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

  // "Cook for 10 minutes" -> [{label: '10 min', ms: 600000}]
  function findTimes(text) {
    var out = [], seen = {};
    var re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
    var m;
    while ((m = re.exec(text))) {
      var n = parseFloat(m[1].replace(',', '.'));
      var u = m[2].toLowerCase();
      var ms = u.charAt(0) === 'h' ? n * 3600000 : u.charAt(0) === 'm' ? n * 60000 : n * 1000;
      var label = u.charAt(0) === 'h' ? n + ' h' : u.charAt(0) === 'm' ? n + ' min' : n + ' sec';
      if (ms > 0 && !seen[label]) { seen[label] = 1; out.push({ label: label, ms: ms }); }
    }
    return out;
  }

  MP.define('kitchen', {
    mount: function (root, ctx) {
      var recipes = ctx.get('recipes', null);
      if (!recipes) { recipes = SAMPLES.slice(); ctx.set('recipes', recipes); }
      var tab = ctx.get('tab', 'timers');
      var size = ctx.get('size', 22);
      var cook = { id: null, step: 0, auto: ctx.get('autoread', true) };

      function recipe(id) { return recipes.filter(function (r) { return r.id === id; })[0]; }
      function saveRecipes() { ctx.set('recipes', recipes); }

      /* ----- main page with tabs ----- */
      function renderMain() {
        ctx.actions('');
        root.innerHTML = '<div class="wrap">' +
          '<div class="tabs"><button type="button" class="tab" data-tab="timers" aria-selected="' + (tab === 'timers') + '">⏲️ Timers</button>' +
          '<button type="button" class="tab" data-tab="recipes" aria-selected="' + (tab === 'recipes') + '">📖 Recipes</button></div>' +
          '<div id="k-body"></div></div>';
        if (tab === 'timers') renderTimers(); else renderRecipes();
      }
      function renderTimers() {
        var body = MP.qs('#k-body', root);
        body.innerHTML = '<div class="k-presets">' + PRESETS.map(function (m) {
          return '<button type="button" class="btn big" data-preset="' + m + '">' + (m < 60 ? m + ' min' : '1 hour') + '</button>';
        }).join('') + '<button type="button" class="btn big primary" data-act="custom">+ Other</button></div>' +
          '<div id="k-timers"></div>' +
          '<p class="muted small center">Timers keep going while you use the rest of MiniPad, and ring on any page. Keep MiniPad open and the screen on.</p>';
        drawTimers();
      }
      function drawTimers() {
        var box = MP.qs('#k-timers', root);
        if (!box) return;
        var list = MP.timers.list().filter(function (t) { return t.kind === 'kitchen'; });
        if (!list.length) { box.innerHTML = '<div class="empty-note">No timers running. Tap a time above to start one.</div>'; return; }
        box.innerHTML = list.map(function (t) {
          var left = MP.timers.left(t);
          var pct = t.total ? Math.max(0, Math.min(100, 100 - (left / t.total) * 100)) : 0;
          return '<div class="card k-timer' + (t.rang ? ' rang' : '') + '" data-id="' + t.id + '">' +
            '<div class="k-tlabel" data-act="rename">' + MP.esc(t.label) + ' ✎</div>' +
            '<div class="k-tleft big-num">' + (t.rang ? 'Done!' : MP.fmtDuration(left)) + '</div>' +
            '<div class="k-bar"><div style="width:' + pct.toFixed(1) + '%"></div></div>' +
            '<div class="hstack" style="margin-top:12px">' +
            (t.paused != null ? '<button type="button" class="btn primary" data-act="resume">▶ Resume</button>' : '<button type="button" class="btn" data-act="pause">❚❚ Pause</button>') +
            '<button type="button" class="btn" data-act="plus">+1 min</button>' +
            '<button type="button" class="btn danger ghost" data-act="cancel">Stop</button></div></div>';
        }).join('');
      }
      function startTimer(label, ms) {
        MP.timers.add(label, ms, 'kitchen');
        MP.toast(label + ' started.');
        if (tab !== 'timers' || ctx.arg) { tab = 'timers'; ctx.set('tab', tab); }
        if (!ctx.arg) renderMain();
      }
      function customTimer() {
        MP.form({
          title: 'New timer',
          fields: [
            { name: 'label', label: 'Name', placeholder: 'For example: Rice' },
            { name: 'min', label: 'Minutes', type: 'number', value: 10, min: 0 },
            { name: 'sec', label: 'Seconds', type: 'number', value: 0, min: 0, max: 59 }
          ],
          ok: 'Start'
        }).then(function (v) {
          if (!v || v === 'delete') return;
          var ms = ((v.min || 0) * 60 + (v.sec || 0)) * 1000;
          if (ms <= 0) { MP.toast('Choose a time first.'); return; }
          startTimer(v.label || 'Timer', ms);
        });
      }

      function renderRecipes() {
        var body = MP.qs('#k-body', root);
        body.innerHTML = '<div class="toolbar"><button type="button" class="btn primary" data-act="newrecipe">+ Add a recipe</button></div>' +
          (recipes.length ? '<div class="list">' + recipes.map(function (r) {
            return '<a class="row k-rrow" href="#/kitchen/r-' + r.id + '"><div class="grow"><b>' + MP.esc(r.title) + '</b>' +
              (r.serves ? '<div class="muted small">Serves ' + MP.esc(r.serves) + '</div>' : '') + '</div><span class="muted">›</span></a>';
          }).join('') + '</div>' : '<div class="empty-note">No recipes yet.</div>');
      }

      function editRecipe(r) {
        var isNew = !r;
        r = r || { id: MP.uid(), title: '', serves: '', ingredients: [], steps: [], notes: '' };
        return MP.form({
          title: isNew ? 'New recipe' : 'Edit recipe',
          del: !isNew,
          fields: [
            { name: 'title', label: 'Name', value: r.title, required: true },
            { name: 'serves', label: 'Serves', value: r.serves, placeholder: 'For example: 4' },
            { name: 'ingredients', label: 'Ingredients (one per line)', type: 'textarea', rows: 6, value: r.ingredients.join('\n') },
            { name: 'steps', label: 'Steps (one per line)', type: 'textarea', rows: 8, value: r.steps.join('\n'), hint: 'Write times like "10 minutes" and MiniPad offers a timer button for that step.' },
            { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, value: r.notes }
          ]
        }).then(function (v) {
          if (!v) return;
          if (v === 'delete') {
            return MP.confirm('Delete "' + r.title + '"?', 'Delete', true).then(function (ok) {
              if (!ok) return;
              recipes = recipes.filter(function (x) { return x.id !== r.id; });
              saveRecipes();
              MP.go('kitchen');
            });
          }
          function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
          r.title = v.title; r.serves = v.serves; r.notes = v.notes;
          r.ingredients = lines(v.ingredients); r.steps = lines(v.steps);
          if (isNew) recipes.push(r);
          saveRecipes();
          if (isNew) MP.go('kitchen', 'r-' + r.id); else renderRecipe(r.id);
        });
      }

      /* ----- one recipe ----- */
      function renderRecipe(id) {
        var r = recipe(id);
        if (!r) { MP.go('kitchen'); return; }
        ctx.title(r.title);
        ctx.actions('<button type="button" class="btn small" data-act="smaller">A−</button><button type="button" class="btn small" data-act="bigger">A+</button>' +
          '<button type="button" class="btn small" data-act="edit">Edit</button>');
        root.innerHTML = '<div class="wrap k-recipe" style="font-size:' + size + 'px">' +
          '<h2 class="k-rtitle">' + MP.esc(r.title) + '</h2>' + (r.serves ? '<p class="muted">Serves ' + MP.esc(r.serves) + '</p>' : '') +
          '<div class="hstack"><a class="btn primary big" href="#/kitchen/cook-' + r.id + '">👩‍🍳 Start cooking</a>' +
          '<button type="button" class="btn big" data-act="readingr">🔈 Read ingredients</button></div>' +
          '<div class="section-title">Ingredients</div><div class="list">' + r.ingredients.map(function (x, i) {
            return '<div class="row k-ing" data-i="' + i + '"><button type="button" class="check" data-act="ing" aria-label="Got it">✓</button><div class="grow">' + MP.esc(x) + '</div></div>';
          }).join('') + '</div>' +
          '<div class="section-title">Steps</div><ol class="k-steps">' + r.steps.map(function (s) { return '<li>' + MP.esc(s) + '</li>'; }).join('') + '</ol>' +
          (r.notes ? '<div class="section-title">Notes</div><p>' + MP.esc(r.notes) + '</p>' : '') + '</div>';
      }

      /* ----- cook mode: one big step at a time ----- */
      function renderCook(id) {
        var r = recipe(id);
        if (!r || !r.steps.length) { MP.go('kitchen'); return; }
        if (cook.id !== id) { cook.id = id; cook.step = 0; }
        ctx.title(r.title);
        ctx.actions('<button type="button" class="btn small' + (cook.auto ? ' on' : '') + '" data-act="auto">🔈 Read each step</button>');
        drawCook(r, false);
      }
      function drawCook(r, speak) {
        var s = r.steps[cook.step];
        var times = findTimes(s);
        root.innerHTML = '<div class="k-cook">' +
          '<div class="k-cstep">Step ' + (cook.step + 1) + ' of ' + r.steps.length + '</div>' +
          '<div class="k-ctext">' + MP.esc(s) + '</div>' +
          '<div class="hstack k-ctimes">' + times.map(function (t) {
            return '<button type="button" class="btn primary" data-act="ctimer" data-ms="' + t.ms + '" data-label="' + MP.esc(t.label) + '">⏲️ Start ' + MP.esc(t.label) + ' timer</button>';
          }).join('') + '<button type="button" class="btn" data-act="cread">🔈 Read this</button></div>' +
          '<div class="k-cnav"><button type="button" class="btn big" data-act="prev"' + (cook.step === 0 ? ' disabled' : '') + '>‹ Back</button>' +
          (cook.step < r.steps.length - 1 ? '<button type="button" class="btn big primary" data-act="next">Next ›</button>' :
            '<a class="btn big primary" href="#/kitchen/r-' + r.id + '">Finished ✓</a>') + '</div>' +
          '<div id="k-ctimers" class="k-ctimers"></div></div>';
        drawCookTimers();
        if (speak && cook.auto) MP.say('Step ' + (cook.step + 1) + '. ' + s);
      }
      function drawCookTimers() {
        var box = MP.qs('#k-ctimers', root);
        if (!box) return;
        box.innerHTML = MP.timers.list().filter(function (t) { return t.kind === 'kitchen'; }).map(function (t) {
          return '<span class="pill">' + MP.esc(t.label) + ': ' + (t.rang ? 'done' : MP.fmtDuration(MP.timers.left(t))) + '</span>';
        }).join(' ');
      }

      function show(arg) {
        MP.stopSpeak();
        ctx.title('Kitchen');
        if (arg && arg.indexOf('r-') === 0) renderRecipe(arg.slice(2));
        else if (arg && arg.indexOf('cook-') === 0) renderCook(arg.slice(5));
        else renderMain();
      }
      this.onArg = show;

      ctx.delegate(root, 'click', '[data-tab]', function (e, el) {
        tab = el.getAttribute('data-tab');
        ctx.set('tab', tab);
        renderMain();
      });
      ctx.delegate(root, 'click', '[data-preset]', function (e, el) {
        var m = +el.getAttribute('data-preset');
        startTimer((m < 60 ? m + ' minute' + (m > 1 ? 's' : '') : '1 hour') + ' timer', m * 60000);
      });
      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var card = el.closest('[data-id]');
        var id = card && card.getAttribute('data-id');
        var r = cook.id ? recipe(cook.id) : null;
        switch (act) {
          case 'custom': customTimer(); break;
          case 'pause': MP.timers.pause(id); break;
          case 'resume': MP.timers.resume(id); break;
          case 'plus': MP.timers.addTime(id, 60000); break;
          case 'cancel': MP.timers.remove(id); break;
          case 'rename':
            var t = MP.timers.get(id);
            if (!t) break;
            MP.form({ title: 'Timer name', fields: [{ name: 'label', label: 'Name', value: t.label }] }).then(function (v) {
              if (v && v !== 'delete' && v.label) MP.timers.update(id, function (x) { x.label = v.label; });
            });
            break;
          case 'newrecipe': editRecipe(null); break;
          case 'ing': el.classList.toggle('on'); el.parentNode.classList.toggle('done'); break;
          case 'readingr':
            var rr = recipe(ctx.arg.slice(2));
            if (rr) MP.say('Ingredients for ' + rr.title + '. ' + rr.ingredients.join('. '));
            break;
          case 'ctimer': startTimer(el.getAttribute('data-label') + ' (' + (r ? r.title : 'recipe') + ')', +el.getAttribute('data-ms')); drawCookTimers(); break;
          case 'cread': if (r) MP.say(r.steps[cook.step]); break;
          case 'prev': if (r && cook.step > 0) { cook.step--; drawCook(r, true); } break;
          case 'next': if (r && cook.step < r.steps.length - 1) { cook.step++; drawCook(r, true); } break;
          default: break;
        }
      });
      ctx.delegate(ctx.bar, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var arg = ctx.arg || '';
        if (act === 'edit') editRecipe(recipe(arg.slice(2)));
        if (act === 'bigger' || act === 'smaller') {
          size = MP.clamp(size + (act === 'bigger' ? 3 : -3), 16, 40);
          ctx.set('size', size);
          var box = MP.qs('.k-recipe', root);
          if (box) box.style.fontSize = size + 'px';
        }
        if (act === 'auto') {
          cook.auto = !cook.auto;
          ctx.set('autoread', cook.auto);
          el.classList.toggle('on', cook.auto);
        }
      });
      // Update only the numbers each second, so buttons are not replaced under a finger.
      function tickTimers() {
        MP.timers.list().forEach(function (t) {
          var card = root.querySelector('.k-timer[data-id="' + t.id + '"]');
          if (!card) return;
          var left = MP.timers.left(t);
          card.querySelector('.k-tleft').textContent = t.rang ? 'Done!' : MP.fmtDuration(left);
          var pct = t.total ? Math.max(0, Math.min(100, 100 - (left / t.total) * 100)) : 0;
          card.querySelector('.k-bar div').style.width = pct.toFixed(1) + '%';
          if (t.rang) card.classList.add('rang');
        });
      }
      ctx.on('timers', function () { drawTimers(); drawCookTimers(); });
      ctx.on('tick', function () { tickTimers(); drawCookTimers(); });

      show(ctx.arg);
    }
  });
})();
