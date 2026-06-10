// Health Core API — the single official read interface to the Core (goal 1).
// Versioned (goal 3), request-logged (goal 6), optionally bearer-gated (goals
// 4/5), with liveness (goal 15) and integrity (goal 14) endpoints.
//
// SECURITY MODEL (matches shred-api): the host is reachable only over the
// tailnet (WireGuard + ACLs). App-level bearer auth is OFF by default and turns
// on the moment CORE_BEARER_TOKEN is set — do NOT expose this host publicly or
// widen the tailnet ACL to untrusted devices.
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';
import { health } from './routes/health.js';
import { v1 } from './routes/v1.js';
import { ingest } from './routes/ingest.js';
import { manage } from './routes/manage.js';
import { lab } from './routes/lab.js';

const PORT = parseInt(process.env.PORT || '8090', 10);
const TOKEN = process.env.CORE_BEARER_TOKEN || '';
const HERE = dirname(fileURLToPath(import.meta.url));

const ORIGIN_ALLOW_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.tail9d0c71\.ts\.net$/, // tailnet (Tailscale Serve)
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/100\.\d+\.\d+\.\d+(:\d+)?$/      // tailnet CGNAT range (raw IP)
];

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50mb' })); // headroom for historical Apple Health imports (goal 17/18)

// CORS — tailnet/LAN origins only.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && ORIGIN_ALLOW_PATTERNS.some(p => p.test(origin))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Structured request logging (goal 6) — one JSON line per request to stdout
// (captured by `docker logs`). Persistent ingest logging arrives with the
// write/ingest milestone.
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    process.stdout.write(JSON.stringify({
      t: new Date().toISOString(), lvl: 'req', method: req.method,
      path: req.originalUrl, status: res.statusCode, ms: Math.round(ms * 10) / 10,
      ip: req.ip
    }) + '\n');
  });
  next();
});

// Health is always open (uptime probes need no token).
app.use('/api/health', health);

// Integrated Health OS web application.
app.use(express.static(join(HERE, 'public'), { extensions: ['html'] }));

// Optional bearer auth (goals 4/5) — guards the data API only, when configured.
app.use('/api/v1', (req, res, next) => {
  if (!TOKEN) return next(); // tailnet-gated mode
  const hdr = req.get('Authorization') || '';
  const presented = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (presented && timingSafeEqual(presented, TOKEN)) return next();
  res.set('WWW-Authenticate', 'Bearer');
  res.status(401).json({ error: 'unauthorized' });
});
app.use('/api/v1', v1);
app.use('/api/v1', ingest);   // POST /ingest, /ingest/apple-health, /ingest/:id/replay; GET log/quarantine
app.use('/api/v1', manage);   // POST /sources, /metrics; PATCH /metrics/:key
app.use('/api/v1', lab);      // POST /lab/parse, /lab/commit; GET /lab/results

// 404 + error handler.
app.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));
app.use((err, _req, res, _next) => {
  process.stderr.write(JSON.stringify({ t: new Date().toISOString(), lvl: 'err', msg: err.message }) + '\n');
  res.status(err.status || 500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[health-core-api] listening on :${PORT} — auth: ${TOKEN ? 'bearer' : 'tailnet-only'}`);
});

// Constant-time string compare. Hashing both sides to a fixed-width digest first
// means the timingSafeEqual call always sees equal-length buffers, so neither the
// token length nor its byte positions leak via timing (a raw length check would).
function timingSafeEqual(a, b) {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return cryptoTimingSafeEqual(da, db);
}
