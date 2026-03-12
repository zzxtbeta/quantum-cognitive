/**
 * Vercel Serverless Function: /api/data/* → QUANTUM_API_BASE_URL/*
 *
 * 在 Vercel Dashboard 配置以下环境变量：
 *   QUANTUM_API_BASE_URL = https://www.gravaity.ai/datalake/api
 *   QUANTUM_API_KEY      = xK7mP9nQ2wR5tY8uI1oL4aS6dF3gH0jK
 */
module.exports = async function handler(req, res) {
  const base = (process.env.QUANTUM_API_BASE_URL || 'https://www.gravaity.ai/datalake/api').replace(/\/$/, '');
  const key  = process.env.QUANTUM_API_KEY || '';

  // strip /api/data prefix, keep subpath + query string
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
