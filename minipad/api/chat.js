// Ask Claude: passes the conversation to the Claude API with the owner's key, which stays on the server.
const Anthropic = require('@anthropic-ai/sdk');
const { send, checkPasscode, readJson } = require('./_lib');

const SYSTEM = [
  'You are Claude, talking with someone through MiniPad, a home app on an old iPad mini.',
  'Different people in the family use it, sometimes children or older adults.',
  'Answer clearly and briefly: a few short paragraphs or a short list, unless they ask for more detail.',
  'Use plain, friendly words. If the person seems to be a child, keep it simple, kind and suitable for their age.',
  'Format with simple Markdown only: short paragraphs, bullet or numbered lists and **bold**. No tables, images or HTML.',
  'You cannot browse the web or see the iPad. If asked about live information such as news or weather, say so.'
].join('\n');

// Keep only well-formed turns, newest last, within a sensible size.
function cleanMessages(list) {
  const out = [];
  let total = 0;
  for (const m of (Array.isArray(list) ? list : []).slice(-40).reverse()) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const text = m.content.slice(0, 20000);
    if (!text.trim()) continue;
    total += text.length;
    if (total > 120000) break;
    out.unshift({ role: m.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const gate = checkPasscode(req);
  if (gate) return send(res, gate.status, gate.body);
  if (!process.env.ANTHROPIC_API_KEY) {
    return send(res, 503, { error: 'Ask Claude is not set up yet: add ANTHROPIC_API_KEY in the Vercel project settings.', code: 'not_configured' });
  }

  let messages;
  try {
    messages = cleanMessages((await readJson(req)).messages);
  } catch (err) {
    return send(res, 400, { error: 'The message could not be read.' });
  }
  if (!messages.length) return send(res, 400, { error: 'Type a question first.' });

  const client = new Anthropic();
  try {
    // Streaming avoids HTTP timeouts on long answers; finalMessage() collects the whole reply.
    // Server-side fallbacks let another model answer if this one declines on policy grounds.
    const stream = client.beta.messages.stream({
      model: process.env.MINIPAD_CLAUDE_MODEL || 'claude-opus-5-5',
      max_tokens: 8000,
      system: SYSTEM,
      messages,
      output_config: { effort: process.env.MINIPAD_CLAUDE_EFFORT || 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') {
      return send(res, 200, { text: 'Sorry, I can\'t help with that one. You could try asking in a different way.', refused: true });
    }
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();
    return send(res, 200, { text: text || '(No answer this time. Please try again.)', truncated: msg.stop_reason === 'max_tokens' });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return send(res, 502, { error: 'The Claude API key on the server was not accepted. Check ANTHROPIC_API_KEY in Vercel.', code: 'bad_key' });
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return send(res, 502, { error: 'The Claude API key is not allowed to use this model.', code: 'denied' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return send(res, 429, { error: 'Claude is busy right now. Wait a minute and try again.', code: 'rate_limited' });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error('chat bad request', err.message);
      return send(res, 400, { error: 'Claude could not read that conversation. Start a new chat and try again.', code: 'bad_request' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('chat api error', err.status, err.message);
      return send(res, 502, { error: 'Claude did not answer (error ' + (err.status || '?') + '). Try again soon.', code: 'api_error' });
    }
    console.error('chat failed', err && err.message);
    return send(res, 502, { error: 'Could not reach Claude. Try again soon.', code: 'network' });
  }
};
