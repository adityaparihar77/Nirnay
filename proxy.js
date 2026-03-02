/**
 * proxy.js — Local CORS proxy for Nirnay web development.
 *
 * AWS API Gateway (REST API) does not forward OPTIONS preflight requests to
 * Lambda for every resource, so PUT /patients/{id} is blocked by CORS before
 * it ever reaches the Lambda function.
 *
 * This proxy runs on port 8083 and:
 *   1. Replies to OPTIONS preflight immediately with correct CORS headers.
 *   2. Forwards every other request verbatim to the real API Gateway.
 *   3. Injects Access-Control-Allow-Origin: * into every upstream response.
 *
 * Usage:
 *   node proxy.js          (in a separate terminal alongside `npm run web`)
 */

'use strict';

const http  = require('http');
const https = require('https');

const PORT   = 8083;
const TARGET = 'https://41grxvatmc.execute-api.ap-south-1.amazonaws.com';
const TARGET_HOST = '41grxvatmc.execute-api.ap-south-1.amazonaws.com';

// Headers that must not be forwarded between hops (RFC 7230)
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
  'accept-encoding', // avoid gzip/br we can't splice CORS headers into
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,X-Requested-With',
  'Access-Control-Max-Age':       '86400',
};

const server = http.createServer((req, res) => {
  /* ── Preflight — answer immediately, no upstream needed ── */
  if (req.method === 'OPTIONS') {
    console.log(`[proxy] OPTIONS ${req.url} → 204 preflight`);
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  /* ── Forward request to API Gateway ── */
  const targetUrl = new URL(req.url, TARGET);

  // Build clean headers — strip hop-by-hop and rewrite host/origin
  const forwardHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) forwardHeaders[k] = v;
  }
  forwardHeaders['host']   = TARGET_HOST;
  forwardHeaders['origin'] = TARGET;

  const proxyOpts = {
    hostname: TARGET_HOST,
    port:     443,
    path:     targetUrl.pathname + targetUrl.search,
    method:   req.method,
    headers:  forwardHeaders,
  };

  console.log(`[proxy] ${req.method} ${proxyOpts.path}`);

  const proxyReq = https.request(proxyOpts, (proxyRes) => {
    console.log(`[proxy] ← ${proxyRes.statusCode} ${proxyOpts.path}`);

    // Build clean response headers — strip hop-by-hop AND any upstream CORS
    // headers (Lambda already sends them; merging causes duplicates that the
    // browser rejects as "multiple values").
    const UPSTREAM_CORS_STRIP = new Set([
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age',
      'access-control-expose-headers',
    ]);
    const outHeaders = { ...CORS_HEADERS };
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      const lk = k.toLowerCase();
      if (!HOP_BY_HOP.has(lk) && !UPSTREAM_CORS_STRIP.has(lk)) outHeaders[k] = v;
    }

    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] Upstream error:', err.message);
    res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy upstream error', detail: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠  Port ${PORT} is already in use — proxy is already running.`);
    console.log(`   Nothing to do. Requests will route through http://localhost:${PORT}\n`);
    process.exit(0);
  }
  console.error('[proxy] Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n✓ CORS proxy running   →  http://localhost:${PORT}`);
  console.log(`  Forwarding to         →  ${TARGET}\n`);
});
