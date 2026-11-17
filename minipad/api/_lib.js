// Shared helpers for MiniPad's server functions. Files starting with "_" are not functions themselves.
const crypto = require('crypto');

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Every online feature needs the passcode the owner set as APP_PASSCODE in Vercel.
function checkPasscode(req) {
  const want = process.env.APP_PASSCODE || '';
  if (!want) {
    return { status: 503, body: { error: 'The online features are not set up yet: add APP_PASSCODE in the Vercel project settings.', code: 'not_configured' } };
  }
  const got = String(req.headers['x-passcode'] || '');
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return { status: 401, body: { error: 'Wrong passcode. Check it in MiniPad › Settings.', code: 'bad_passcode' } };
  }
  return null;
}

async function readJson(req, limit = 4 * 1024 * 1024) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Too much data.'), { status: 413 });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function query(req) {
  return new URL(req.url, 'http://localhost').searchParams;
}

module.exports = { send, checkPasscode, readJson, query };
