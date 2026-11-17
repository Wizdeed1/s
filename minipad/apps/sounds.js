/* Soundboard: sixteen funny sounds, all made on the iPad (no recordings). */
(function () {
  function osc(type, f1, f2, dur, vol, at) {
    var c = MP.audio(); if (!c) return;
    var t = (at || c.currentTime) + 0.005;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function now() { var c = MP.audio(); return c ? c.currentTime : 0; }
  var SOUNDS = [
    { label: 'Boing', icon: '🦘', play: function () { var t = now(); osc('sine', 180, 620, 0.12, 0.4, t); osc('sine', 620, 140, 0.35, 0.35, t + 0.12); } },
    { label: 'Laser', icon: '🔫', play: function () { osc('square', 1800, 110, 0.35, 0.12); } },
    { label: 'Siren', icon: '🚨', play: function () { var t = now(); for (var i = 0; i < 4; i++) { MP.tone(i % 2 ? 620 : 820, 0.42, { type: 'sawtooth', vol: 0.08, at: t + i * 0.42, attack: 0.02 }); } } },
    { label: 'Pop', icon: '🎈', play: function () { osc('sine', 380, 1100, 0.07, 0.5); MP.noiseBurst(0.05, { freq: 2000, vol: 0.3 }); } },
    { label: 'Ta-da!', icon: '🎉', play: function () { var t = now(); [523, 659, 784].forEach(function (f, i) { MP.tone(f, 0.25, { type: 'sawtooth', vol: 0.08, at: t + i * 0.09 }); }); MP.tone(1046.5, 1.2, { type: 'sawtooth', vol: 0.1, at: t + 0.3 }); MP.tone(784, 1.2, { type: 'sawtooth', vol: 0.06, at: t + 0.3 }); } },
    { label: 'Applause', icon: '👏', play: function () { var t = now(); for (var i = 0; i < 70; i++) MP.noiseBurst(0.04, { filter: 'bandpass', freq: 1200 + Math.random() * 1800, q: 1.2, vol: 0.18 + Math.random() * 0.2, at: t + Math.random() * 2.2 }); } },
    { label: 'Drum roll', icon: '🥁', play: function () { var t = now(), x = 0; for (var i = 0; i < 26; i++) { MP.noiseBurst(0.06, { freq: 1500, vol: 0.12 + i * 0.008, at: t + x }); x += 0.075 - i * 0.0012; } MP.noiseBurst(1.4, { freq: 5000, vol: 0.4, at: t + x + 0.05 }); } },
    { label: 'Doorbell', icon: '🔔', play: function () { var t = now(); MP.tone(659, 1.0, { vol: 0.35, at: t, attack: 0.005 }); MP.tone(1318, 0.5, { vol: 0.06, at: t, attack: 0.005 }); MP.tone(523, 1.4, { vol: 0.35, at: t + 0.55, attack: 0.005 }); MP.tone(1046, 0.6, { vol: 0.06, at: t + 0.55, attack: 0.005 }); } },
    { label: 'Oops', icon: '🙈', play: function () { var t = now(); osc('triangle', 400, 300, 0.25, 0.3, t); osc('triangle', 300, 180, 0.45, 0.3, t + 0.25); } },
    { label: 'Correct', icon: '✅', play: function () { MP.ding(); } },
    { label: 'Magic', icon: '✨', play: function () { var t = now(); [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637].forEach(function (f, i) { MP.tone(f, 0.35, { vol: 0.12, at: t + i * 0.06, attack: 0.003 }); }); } },
    { label: 'Coin', icon: '💰', play: function () { var t = now(); MP.tone(988, 0.08, { type: 'square', vol: 0.12, at: t, attack: 0.002 }); MP.tone(1319, 0.4, { type: 'square', vol: 0.12, at: t + 0.08, attack: 0.002 }); } },
    { label: 'Rocket', icon: '🚀', play: function () {
      var c = MP.audio(); if (!c) return;
      var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      var b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      s.buffer = b; f.type = 'lowpass';
      f.frequency.setValueAtTime(150, t); f.frequency.exponentialRampToValueAtTime(4000, t + 1.8);
      g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 2);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 2);
    } },
    { label: 'Cuckoo', icon: '🐦', play: function () { var t = now(); [0, 0.7].forEach(function (x) { MP.tone(659, 0.3, { vol: 0.3, at: t + x, attack: 0.03 }); MP.tone(523, 0.45, { vol: 0.3, at: t + x + 0.3, attack: 0.03 }); }); } },
    { label: 'Thunder', icon: '⛈️', play: function () { var t = now(); MP.noiseBurst(2.8, { filter: 'lowpass', freq: 280, vol: 1.0, at: t }); MP.noiseBurst(1.5, { filter: 'lowpass', freq: 500, vol: 0.6, at: t + 0.3 }); } },
    { label: 'Heartbeat', icon: '❤️', play: function () { var t = now(); for (var i = 0; i < 3; i++) { MP.tone(58, 0.18, { vol: 0.9, at: t + i * 0.8, attack: 0.01 }); MP.tone(52, 0.2, { vol: 0.7, at: t + i * 0.8 + 0.22, attack: 0.01 }); } } }
  ];

  MP.define('sounds', {
    mount: function (root, ctx) {
      root.innerHTML = '<div class="wrap"><div class="sb-grid">' + SOUNDS.map(function (s, i) {
        return '<button type="button" class="sb-btn" data-i="' + i + '"><span>' + s.icon + '</span>' + MP.esc(s.label) + '</button>';
      }).join('') + '</div><p class="muted small center" style="margin-top:16px">No sound? Check the switch on the side of the iPad and the volume buttons.</p></div>';
      ctx.delegate(root, 'click', '[data-i]', function (e, el) {
        SOUNDS[+el.getAttribute('data-i')].play();
        el.classList.add('hit');
        setTimeout(function () { el.classList.remove('hit'); }, 200);
      });
    }
  });
})();
