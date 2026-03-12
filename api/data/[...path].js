/**
 * Vercel Serverless Function: /api/data/* → https://www.gravaity.ai/datalake/api/*
 *
 * Vercel routing order: serverless functions > rewrites
 * So this function is ALWAYS called for /api/data/*, never intercepted by SPA rewrite.
 *
 * Request trace:
 *   Browser GET /api/data/people/search?data_source=seed_data&page=1&page_size=20
 *   → this function
 *   → GET https://www.gravaity.ai/datalake/api/people/search?data_source=seed_data&page=1&page_size=20
 *      with X-API-Key: xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK
 */
module.exports = async function handler(req, res) {
  const base = (process.env.QUANTUM_API_BASE_URL || 'https://www.gravaity.ai/datalake/api').replace(/\/$/, '');
  const key  = process.env.QUANTUM_API_KEY  || 'xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK';

  // req.url = "/api/data/people/search?..."
  // strip /api/data/ → "people/search?..."
  const subpath = req.url.replace(/^\/api\/data\/?/, '');
  const target = `${base}/${subpath}`;

  const init = {
    method: req.method,
    headers: { 'X-API-Key': key, 'Accept': 'application/json' },
  };
  if (req.method === 'POST') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(req.body);
  }

  const upstream = await fetch(target, init);
  const body = await upstream.text();

  res
    .status(upstream.status)
    .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    .send(body);
};

