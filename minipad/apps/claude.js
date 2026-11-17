/* Ask Claude: a simple chat that goes through MiniPad's own server, so the API key never sits on the iPad. */
MP.define('claude', {
  mount: function (root, ctx) {
    var chats = ctx.get('chats', []);
    var current = ctx.get('current', null);
    var speakAnswers = ctx.get('speak', false);
    var busy = false;

    function chat() {
      var c = chats.filter(function (x) { return x.id === current; })[0];
      if (!c) { c = { id: MP.uid(), title: 'New chat', messages: [], updated: Date.now() }; chats.unshift(c); current = c.id; }
      return c;
    }
    function save() {
      chats = chats.filter(function (c) { return c.messages.length || c.id === current; }).slice(0, 20);
      ctx.set('chats', chats);
      ctx.set('current', current);
    }
    function setupCard(extra) {
      return '<div class="card cl-setup"><h2>Set up Ask Claude</h2>' + (extra ? '<p class="cl-err">' + MP.esc(extra) + '</p>' : '') +
        '<ol class="steps"><li>On a computer, make an API key at <b>console.anthropic.com</b> (it is paid per use, separate from a Claude subscription).</li>' +
        '<li>In your MiniPad project on <b>vercel.com</b>, open <b>Settings › Environment Variables</b> and add <b>ANTHROPIC_API_KEY</b> (the key) and <b>APP_PASSCODE</b> (a passcode you make up).</li>' +
        '<li>Redeploy the project so it picks up the new settings.</li>' +
        '<li>On this iPad, open MiniPad <b>Settings</b> and type the same passcode.</li></ol></div>';
    }
    function render() {
      var c = chat();
      ctx.actions('<button type="button" class="btn small' + (speakAnswers ? ' on' : '') + '" data-act="speak">🔈 Read answers</button>' +
        '<button type="button" class="btn small" data-act="history">Chats</button><button type="button" class="btn small primary" data-act="new">New chat</button>');
      var noPass = !MP.settings().passcode;
      root.innerHTML = '<div class="cl">' +
        '<div class="cl-msgs" id="cl-msgs">' + (noPass ? setupCard() : '') +
        (c.messages.length ? c.messages.map(msgHtml).join('') :
          '<div class="cl-empty"><div class="cl-logo">💬</div><p>Ask anything: homework help, a recipe idea, a bedtime story, how to fix something…</p>' +
          '<div class="chips cl-ideas">' + ['Tell me a short bedtime story about a brave snail', 'Explain why the sky is blue to a 7 year old',
            'What can I cook with eggs, spinach and cheese?', 'Help me write a birthday message for my grandma'].map(function (q) {
            return '<button type="button" class="chip" data-idea="' + MP.esc(q) + '">' + MP.esc(q) + '</button>';
          }).join('') + '</div></div>') +
        (busy ? '<div class="cl-msg a"><div class="cl-bubble cl-typing">Claude is thinking<span>.</span><span>.</span><span>.</span></div></div>' : '') +
        '</div>' +
        '<div class="cl-compose"><textarea id="cl-in" rows="2" placeholder="Type a question… (or tap the microphone key to talk)"' + (busy ? ' disabled' : '') + '></textarea>' +
        '<button type="button" class="btn primary" data-act="send"' + (busy ? ' disabled' : '') + '>Send</button></div></div>';
      var box = MP.qs('#cl-msgs', root);
      box.scrollTop = box.scrollHeight;
    }
    function msgHtml(m, i) {
      if (m.role === 'user') return '<div class="cl-msg u"><div class="cl-bubble">' + MP.esc(m.content).replace(/\n/g, '<br>') + '</div></div>';
      if (m.role === 'error') return '<div class="cl-msg a"><div class="cl-bubble cl-error">⚠️ ' + MP.esc(m.content) + ' <button type="button" class="btn small" data-act="retry">Try again</button></div></div>';
      return '<div class="cl-msg a"><div class="cl-bubble md">' + MP.markdown(m.content) +
        '<div class="cl-tools"><button type="button" class="btn small ghost" data-act="say" data-i="' + i + '">🔈 Read</button>' +
        '<button type="button" class="btn small ghost" data-act="copy" data-i="' + i + '">Copy</button></div></div></div>';
    }
    function send(text) {
      var c = chat();
      c.messages = c.messages.filter(function (m) { return m.role !== 'error'; });
      if (text) c.messages.push({ role: 'user', content: text, at: Date.now() });
      if (c.title === 'New chat' && text) c.title = text.slice(0, 48);
      c.updated = Date.now();
      busy = true;
      save();
      render();
      var history = c.messages.map(function (m) { return { role: m.role, content: m.content }; });
      MP.api('chat', { method: 'POST', body: { messages: history }, timeout: 75000 }).then(function (j) {
        c.messages.push({ role: 'assistant', content: j.text + (j.truncated ? '\n\n*(The answer was cut short. Ask me to continue.)*' : ''), at: Date.now() });
        if (speakAnswers) MP.say(j.text.replace(/[*#`_]/g, ''));
      }).catch(function (err) {
        var msg = err.message;
        if (err.status === 404) msg = 'The server part of MiniPad is not set up yet.';
        c.messages.push({ role: 'error', content: msg, at: Date.now() });
      }).then(function () {
        busy = false;
        save();
        render();
      });
    }

    ctx.delegate(root, 'click', '[data-act], [data-idea]', function (e, el) {
      var act = el.getAttribute('data-act');
      var c = chat();
      if (el.getAttribute('data-idea')) { send(el.getAttribute('data-idea')); return; }
      if (act === 'send' && !busy) {
        var input = MP.qs('#cl-in', root);
        var text = input.value.trim();
        if (!text) return;
        input.value = '';
        send(text);
      }
      if (act === 'retry' && !busy) send('');
      if (act === 'say') MP.say(c.messages[+el.getAttribute('data-i')].content.replace(/[*#`_]/g, ''));
      if (act === 'copy') MP.toast(MP.copyText(c.messages[+el.getAttribute('data-i')].content) ? 'Copied.' : 'Could not copy.');
    });
    ctx.delegate(ctx.bar, 'click', '[data-act]', function (e, el) {
      var act = el.getAttribute('data-act');
      if (act === 'speak') { speakAnswers = !speakAnswers; ctx.set('speak', speakAnswers); if (!speakAnswers) MP.stopSpeak(); render(); }
      if (act === 'new' && !busy) { current = null; chat(); save(); render(); }
      if (act === 'history') {
        var older = chats.filter(function (c) { return c.messages.length; });
        if (!older.length) { MP.toast('No earlier chats yet.'); return; }
        MP.modal({
          title: 'Your chats',
          html: '<div class="vstack">' + older.map(function (c) {
            return '<button type="button" class="btn wide cl-hist" data-v="' + c.id + '">' + MP.esc(c.title) + ' <span class="muted small">' + MP.fmtDate(new Date(c.updated), 'short') + '</span></button>';
          }).join('') + '</div>',
          buttons: [{ label: 'Delete all chats', value: '__clear', kind: 'danger ghost' }, { label: 'Close', value: '' }]
        }).then(function (v) {
          if (v === '__clear') {
            MP.confirm('Delete all chats on this iPad?', 'Delete', true).then(function (ok) {
              if (ok) { chats = []; current = null; chat(); save(); render(); }
            });
          } else if (v) { current = v; save(); render(); }
        });
      }
    });
    render();
  }
});
