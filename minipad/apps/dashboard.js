/* Dashboard: big clock, date, weather (Open-Meteo, no key needed) and a to-do list. */
(function () {
  var WMO = {
    0: ['Clear', '☀️', '🌙'], 1: ['Mostly clear', '🌤️', '🌙'], 2: ['Partly cloudy', '⛅', '☁️'], 3: ['Cloudy', '☁️', '☁️'],
    45: ['Fog', '🌫️'], 48: ['Fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
    56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'], 71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'], 80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'],
    82: ['Heavy showers', '🌧️'], 85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️']
  };
  function wmo(code, isDay) {
    var w = WMO[code] || ['—', '🌡️'];
    return { text: w[0], icon: (isDay === 0 && w[2]) ? w[2] : w[1] };
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function forecastQuery(place, unit) {
    return 'latitude=' + place.lat + '&longitude=' + place.lon +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=auto&forecast_days=5' +
      (unit === 'F' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&wind_speed_unit=kmh');
  }
  // Ask Open-Meteo directly; if that fails, ask MiniPad's server to fetch it.
  MP.weather = {
    forecast: function (place, unit) {
      var q = forecastQuery(place, unit);
      return getJSON('https://api.open-meteo.com/v1/forecast?' + q).catch(function () {
        return MP.api('weather?kind=forecast&' + q);
      });
    },
    search: function (name) {
      var q = 'name=' + encodeURIComponent(name) + '&count=6&language=en&format=json';
      return getJSON('https://geocoding-api.open-meteo.com/v1/search?' + q).catch(function () {
        return MP.api('weather?kind=geo&' + q);
      }).then(function (j) { return (j && j.results) || []; });
    },
    describe: wmo
  };

  MP.define('dashboard', {
    mount: function (root, ctx) {
      root.innerHTML =
        '<div class="dash">' +
        '<div class="dash-main">' +
        '<div class="dash-clock"><span id="dc-time" class="big-num"></span><span id="dc-ampm" class="dash-ampm"></span></div>' +
        '<div class="dash-date" id="dc-date"></div>' +
        '<div class="card dash-weather" id="dw"></div>' +
        '</div>' +
        '<div class="dash-side">' +
        '<div class="card"><h2>To do</h2>' +
        '<div class="add-row"><input type="text" id="todo-in" placeholder="Add something to do"><button type="button" class="btn primary" data-act="add">Add</button></div>' +
        '<div id="todos"></div>' +
        '<div class="hstack" style="margin-top:12px"><button type="button" class="btn small ghost" data-act="cleardone">Clear finished</button></div>' +
        '</div>' +
        '<div class="card" id="dash-timers" hidden><h2>Timers</h2><div id="dt-list"></div></div>' +
        '</div></div>';

      ctx.actions('<button type="button" class="btn small" data-act="wake" id="wake-btn">💡 Keep on</button>' +
        '<button type="button" class="btn small" data-act="city">📍 Place</button>');

      var todos = ctx.get('todos', []);
      var weather = ctx.get('weather', null);

      function drawClock() {
        var now = new Date();
        var p = MP.timeParts(now);
        MP.qs('#dc-time', root).textContent = p.hm;
        MP.qs('#dc-ampm', root).textContent = p.ampm;
        MP.qs('#dc-date', root).textContent = MP.fmtDate(now);
      }
      function drawTodos() {
        var box = MP.qs('#todos', root);
        if (!todos.length) { box.innerHTML = '<div class="empty-note">Nothing to do. Add something above.</div>'; return; }
        box.innerHTML = '<div class="list">' + todos.map(function (t) {
          return '<div class="row' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
            '<button type="button" class="check' + (t.done ? ' on' : '') + '" data-act="toggle" aria-label="Done">✓</button>' +
            '<div class="grow">' + MP.esc(t.text) + '</div>' +
            '<button type="button" class="del" data-act="del" aria-label="Delete">×</button></div>';
        }).join('') + '</div>';
      }
      function drawTimers() {
        var list = MP.timers.list();
        var card = MP.qs('#dash-timers', root);
        card.hidden = !list.length;
        if (!list.length) return;
        MP.qs('#dt-list', root).innerHTML = list.map(function (t) {
          return '<div class="row"><div class="grow">' + MP.esc(t.label) + '</div><div class="big-num"><b>' +
            (t.rang ? 'Done' : MP.fmtDuration(MP.timers.left(t))) + '</b></div></div>';
        }).join('');
      }
      function drawWeather() {
        var box = MP.qs('#dw', root);
        var place = ctx.get('place', null);
        if (!place) {
          box.innerHTML = '<div class="dash-noplace"><p>Show the weather for your town.</p><button type="button" class="btn primary" data-act="city">Choose a place</button></div>';
          return;
        }
        if (!weather || !weather.data) {
          box.innerHTML = '<div class="empty-note">Getting the weather for ' + MP.esc(place.name) + '…</div>';
          return;
        }
        var d = weather.data, c = d.current || {}, daily = d.daily || {};
        var w = wmo(c.weather_code, c.is_day);
        var unit = weather.unit === 'F' ? '°F' : '°C';
        var days = '';
        for (var i = 1; i < Math.min(5, (daily.time || []).length); i++) {
          var dd = new Date(daily.time[i] + 'T12:00:00');
          var dw = wmo(daily.weather_code[i], 1);
          days += '<div class="dw-day"><div class="dw-dname">' + MP.DAYS[dd.getDay()].slice(0, 3) + '</div><div class="dw-dicon">' + dw.icon +
            '</div><div><b>' + Math.round(daily.temperature_2m_max[i]) + '°</b> <span class="muted">' + Math.round(daily.temperature_2m_min[i]) + '°</span></div></div>';
        }
        var rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;
        box.innerHTML =
          '<div class="dw-now"><div class="dw-icon">' + w.icon + '</div><div class="dw-temp big-num">' + Math.round(c.temperature_2m) + unit + '</div>' +
          '<div class="dw-desc"><div class="dw-text">' + MP.esc(w.text) + '</div><div class="muted">' + MP.esc(place.name) +
          '</div><div class="muted small">Feels like ' + Math.round(c.apparent_temperature) + '° · High ' + Math.round(daily.temperature_2m_max[0]) +
          '° · Low ' + Math.round(daily.temperature_2m_min[0]) + '°' + (rain != null ? ' · Rain ' + rain + '%' : '') + '</div></div></div>' +
          '<div class="dw-days">' + days + '</div>' +
          '<div class="muted small dw-upd">Updated ' + MP.fmtTime(new Date(weather.at)) + (weather.stale ? ' · offline' : '') + '</div>';
      }
      function refreshWeather(force) {
        var place = ctx.get('place', null);
        if (!place) return;
        var unit = MP.settings().tempUnit;
        if (!force && weather && weather.unit === unit && weather.placeName === place.name && Date.now() - weather.at < 20 * 60000) return;
        MP.weather.forecast(place, unit).then(function (data) {
          weather = { at: Date.now(), unit: unit, placeName: place.name, data: data };
          ctx.set('weather', weather);
          drawWeather();
        }).catch(function () {
          if (weather) { weather.stale = true; drawWeather(); }
          else MP.qs('#dw', root).innerHTML = '<div class="empty-note">Could not get the weather. Check the Wi-Fi.</div>';
        });
      }
      function chooseCity() {
        MP.form({ title: 'Your town or city', fields: [{ name: 'q', label: 'Name', placeholder: 'For example: Leeds', required: true }], ok: 'Search' })
          .then(function (v) {
            if (!v || v === 'delete') return;
            MP.toast('Searching…');
            return MP.weather.search(v.q).then(function (res) {
              if (!res.length) { MP.alert('No place called "' + v.q + '" was found. Try another spelling.'); return; }
              var options = res.map(function (r, i) {
                return { value: i, label: r.name + (r.admin1 ? ', ' + r.admin1 : '') + (r.country ? ', ' + r.country : '') };
              });
              return MP.form({ title: 'Which one?', fields: [{ name: 'i', type: 'select', label: 'Place', options: options, value: 0 }], ok: 'Use this' })
                .then(function (c) {
                  if (!c || c === 'delete') return;
                  var r = res[+c.i];
                  ctx.set('place', { name: r.name, lat: r.latitude, lon: r.longitude });
                  weather = null;
                  drawWeather();
                  refreshWeather(true);
                });
            });
          }).catch(function () { MP.alert('Could not search right now. Check the Wi-Fi.'); });
      }
      function saveTodos() { ctx.set('todos', todos); drawTodos(); }
      function addTodo() {
        var input = MP.qs('#todo-in', root);
        var text = input.value.trim();
        if (!text) return;
        todos.push({ id: MP.uid(), text: text, done: false });
        input.value = '';
        saveTodos();
      }
      function drawWake() {
        var b = MP.qs('#wake-btn');
        if (b) b.classList.toggle('on', MP.wake.isOn());
      }

      ctx.delegate(root, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        var row = el.closest('[data-id]');
        var id = row && row.getAttribute('data-id');
        if (act === 'add') addTodo();
        if (act === 'toggle') { todos.forEach(function (t) { if (t.id === id) t.done = !t.done; }); saveTodos(); }
        if (act === 'del') { todos = todos.filter(function (t) { return t.id !== id; }); saveTodos(); }
        if (act === 'cleardone') { todos = todos.filter(function (t) { return !t.done; }); saveTodos(); }
        if (act === 'city') chooseCity();
      });
      ctx.delegate(ctx.bar, 'click', '[data-act]', function (e, el) {
        var act = el.getAttribute('data-act');
        if (act === 'city') chooseCity();
        if (act === 'wake') {
          MP.wake.toggle();
          MP.toast(MP.wake.isOn() ? 'Trying to keep the screen on. For a sure result set Auto-Lock to Never in Settings.' : 'The screen can sleep again.', 4000);
        }
      });
      ctx.listen(MP.qs('#todo-in', root), 'keydown', function (e) { if (e.keyCode === 13) { e.preventDefault(); addTodo(); } });
      ctx.on('wake', drawWake);
      ctx.on('tick', function () { drawClock(); drawTimers(); });
      ctx.on('settings', function () { drawClock(); refreshWeather(true); });
      ctx.every(10 * 60000, function () { refreshWeather(false); });

      drawClock();
      drawTodos();
      drawTimers();
      drawWeather();
      drawWake();
      refreshWeather(false);
    }
  });
})();
