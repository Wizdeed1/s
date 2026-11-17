// Tests the Vercel functions with fake requests. Ask Claude talks to a local stand-in for the
// Claude API (via ANTHROPIC_BASE_URL), so no key or network is needed.
// Run from minipad/: npm install && node test/api.test.cjs
const assert = require('assert');
const http = require('http');

function res() {
  return {
    statusCode: 0, headers: {}, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = b || ''; },
    json() { return JSON.parse(this.body); }
  };
}
function req(method, url, headers, body) { return { method, url, headers: headers || {}, body }; }
function fresh(mod) { delete require.cache[require.resolve(mod)]; return require(mod); }

async function main() {
  // ----- ping -----
  delete process.env.APP_PASSCODE; delete process.env.ANTHROPIC_API_KEY; delete process.env.BLOB_READ_WRITE_TOKEN;
  let r = res();
  fresh('../api/ping.js')(req('GET', '/api/ping'), r);
  assert.deepStrictEqual(r.json(), { ok: true, passcodeSet: false, passcodeOk: false, claude: false, storage: false });

  // ----- chat: gates -----
  const chat = fresh('../api/chat.js');
  r = res(); await chat(req('POST', '/api/chat', {}, { messages: [] }), r);
  assert.strictEqual(r.statusCode, 503, 'no passcode set on the server');
  process.env.APP_PASSCODE = 'open sesame';
  r = res(); await chat(req('POST', '/api/chat', { 'x-passcode': 'wrong' }, { messages: [] }), r);
  assert.strictEqual(r.statusCode, 401, 'wrong passcode');
  r = res(); await chat(req('POST', '/api/chat', { 'x-passcode': 'open sesame' }, { messages: [{ role: 'user', content: 'hi' }] }), r);
  assert.strictEqual(r.statusCode, 503, 'no API key');
  assert.strictEqual(r.json().code, 'not_configured');
  r = res(); await chat(req('GET', '/api/chat'), r);
  assert.strictEqual(r.statusCode, 405);
  console.log('ok chat gates');

  // ----- chat: a full round trip against a local stand-in for the Claude API -----
  let seen = null;
  const server = http.createServer((q, s) => {
    let body = '';
    q.on('data', (c) => { body += c; });
    q.on('end', () => {
      seen = { path: q.url, headers: q.headers, body: JSON.parse(body) };
      s.writeHead(200, { 'content-type': 'text/event-stream' });
      const ev = (type, data) => s.write(`event: ${type}\ndata: ${JSON.stringify(Object.assign({ type }, data))}\n\n`);
      ev('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } });
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'The sky looks blue because ' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'air scatters blue light.' } });
      ev('content_block_stop', { index: 0 });
      ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } });
      ev('message_stop', {});
      s.end();
    });
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:' + server.address().port;
  r = res();
  await fresh('../api/chat.js')(req('POST', '/api/chat', { 'x-passcode': 'open sesame' }, {
    messages: [{ role: 'assistant', content: 'stray first turn' }, { role: 'user', content: 'Why is the sky blue?' }, { role: 'bogus', content: 'x' }]
  }), r);
  server.close();
  assert.strictEqual(r.statusCode, 200, r.body);
  assert.strictEqual(r.json().text, 'The sky looks blue because air scatters blue light.');
  assert.strictEqual(seen.path.split('?')[0], '/v1/messages');
  assert.strictEqual(seen.body.model, 'claude-opus-5-5');
  assert.strictEqual(seen.body.stream, true);
  assert.strictEqual(seen.body.fallbacks, 'default');
  assert.deepStrictEqual(seen.body.output_config, { effort: 'low' });
  assert.ok(String(seen.headers['anthropic-beta']).includes('server-side-fallback-2026-07-01'), 'beta header sent');
  assert.deepStrictEqual(seen.body.messages, [{ role: 'user', content: 'Why is the sky blue?' }], 'leading assistant and bad roles dropped');
  // SDK 1.x sends the API key as a bearer token.
  assert.strictEqual(seen.headers.authorization, 'Bearer test-key', 'API key sent');
  console.log('ok chat round trip (model, fallbacks, effort, beta header, message cleaning)');

  // ----- store -----
  r = res(); await fresh('../api/store.js')(req('GET', '/api/store?key=board', { 'x-passcode': 'open sesame' }), r);
  assert.strictEqual(r.statusCode, 503, 'no blob token');
  r = res(); await fresh('../api/store.js')(req('GET', '/api/store?key=board', { 'x-passcode': 'nope' }), r);
  assert.strictEqual(r.statusCode, 401, 'store needs the passcode');
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_123';
  r = res(); await fresh('../api/store.js')(req('GET', '/api/store?key=secrets', { 'x-passcode': 'open sesame' }), r);
  assert.strictEqual(r.statusCode, 400, 'unknown key refused');
  console.log('ok store gates');

  // ----- weather: only listed parameters are forwarded -----
  const realFetch = global.fetch;
  let asked = '';
  global.fetch = async (url) => { asked = url; return { ok: true, status: 200, text: async () => '{"current":{}}' }; };
  r = res();
  await fresh('../api/weather.js')(req('GET', '/api/weather?kind=forecast&latitude=51.5&longitude=-0.12&current=temperature_2m&apikey=evil&timezone=auto'), r);
  global.fetch = realFetch;
  assert.strictEqual(r.statusCode, 200);
  assert.ok(asked.startsWith('https://api.open-meteo.com/v1/forecast?'));
  assert.ok(!asked.includes('apikey'), 'unknown parameters dropped');
  assert.ok(asked.includes('latitude=51.5') && asked.includes('timezone=auto'));
  console.log('ok weather proxy');
}

main().catch((e) => { console.error(e); process.exit(1); });
