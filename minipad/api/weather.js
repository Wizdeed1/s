// Fetches Open-Meteo weather or place search for the iPad when it cannot reach Open-Meteo itself.
// Only the listed query parameters are passed on.
const { send, query } = require('./_lib');

const FORECAST = ['latitude', 'longitude', 'current', 'daily', 'timezone', 'forecast_days', 'temperature_unit', 'wind_speed_unit'];
const GEO = ['name', 'count', 'language', 'format'];

module.exports = async function handler(req, res) {
  const q = query(req);
  const geo = q.get('kind') === 'geo';
  const base = geo ? 'https://geocoding-api.open-meteo.com/v1/search' : 'https://api.open-meteo.com/v1/forecast';
  const out = new URLSearchParams();
  for (const key of geo ? GEO : FORECAST) {
    const v = q.get(key);
    if (v != null) out.set(key, v.slice(0, 300));
  }
  try {
    const r = await fetch(base + '?' + out.toString(), { headers: { 'User-Agent': 'MiniPad weather proxy' } });
    const body = await r.text();
    res.statusCode = r.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', r.ok ? 'public, max-age=300, s-maxage=600' : 'no-store');
    res.end(body);
  } catch (err) {
    send(res, 502, { error: 'Could not reach the weather service.' });
  }
};
