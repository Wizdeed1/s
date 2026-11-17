// Keeps the family board (for syncing with phones) and an online backup in a private Vercel Blob store.
const { put, get } = require('@vercel/blob');
const { send, checkPasscode, readJson, query } = require('./_lib');

const PATHS = { board: 'minipad/board.json', backup: 'minipad/backup.json' };
const ACCESS = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

module.exports = async function handler(req, res) {
  const gate = checkPasscode(req);
  if (gate) return send(res, gate.status, gate.body);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return send(res, 503, { error: 'Sync storage is not set up yet: connect a Blob store to the Vercel project.', code: 'no_storage' });
  }
  const path = PATHS[query(req).get('key')];
  if (!path) return send(res, 400, { error: 'Unknown item.' });

  try {
    if (req.method === 'GET') {
      const found = await get(path, { access: ACCESS, useCache: false });
      if (!found || found.statusCode !== 200 || !found.stream) return send(res, 200, { value: null });
      const text = await new Response(found.stream).text();
      return send(res, 200, { value: JSON.parse(text), updatedAt: found.blob.uploadedAt });
    }
    if (req.method === 'PUT') {
      const body = await readJson(req);
      await put(path, JSON.stringify(body), {
        access: ACCESS,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'Use GET or PUT.' });
  } catch (err) {
    console.error('store error', err && err.message);
    return send(res, err.status || 500, { error: 'The storage did not answer. Try again in a minute.' });
  }
};
