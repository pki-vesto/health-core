// ============================================================
// HEALTH CORE — Personal Health OS (vanilla, wired to /api/v1)
// Ported from the Claude Design handoff. No CDN, no build, local-first.
// ============================================================
const API = '/api/v1';

// ---------- tiny utils ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const median = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const round = (v, dp = 0) => { const f = 10 ** dp; return Math.round(v * f) / f; };
const fmtNum = (v, dp = 0) => v == null ? '—' : Number(v).toLocaleString('nl-NL', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const hm = (h) => { if (h == null) return '—'; const H = Math.floor(h); const M = Math.round((h - H) * 60); return `${H}u ${String(M).padStart(2, '0')}`; };
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTHS_L = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAYS_L = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const fmtShort = (s) => { const d = new Date(s + 'T00:00:00'); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
function amsterdamDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function fmtToday() { const d = state.serverDate ? new Date(state.serverDate + 'T00:00:00') : new Date(); return `${DAYS_L[d.getDay()]} ${d.getDate()} ${MONTHS_L[d.getMonth()]}`; }
const greeting = () => { const h = new Date().getHours(); return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'; };

// ---------- data layer (cached GETs) ----------
const cache = new Map();
async function getJSON(path, { fresh = false } = {}) {
  if (!fresh && cache.has(path)) return cache.get(path);
  const r = await fetch(API + path).catch(() => null);
  if (!r || !r.ok) { const e = new Error(`${r ? r.status : 'net'} ${path}`); e.status = r && r.status; throw e; }
  const body = await r.json().catch(() => ({}));
  cache.set(path, body);
  return body;
}
async function postJSON(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || `${r.status} ${path}`);
  return out;
}
async function patchJSON(path, body) {
  const r = await fetch(API + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || `${r.status} ${path}`);
  return out;
}
const safe = (p) => getJSON(p).catch(() => null); // null on failure, never throws

// ---------- metric model (design's summarize over real /series) ----------
const METRICS = {
  hrv: { metric: 'heart.hrv_sdnn', label: 'HRV', unit: 'ms', higherBetter: true, riskAt: 10, fixedBaseline: null },
  rhr: { metric: 'heart.resting_rate', label: 'Rusthartslag', unit: 'bpm', higherBetter: false, riskAt: 6 },
  readiness: { metric: 'score.recovery', label: 'Readiness', unit: '', higherBetter: true, riskAt: 12 },
  sleep: { metric: 'sleep.duration', label: 'Slaap', unit: 'u', higherBetter: true, dp: 1, riskAt: 8, time: true },
  deep: { metric: 'sleep.deep', label: 'Diepe slaap', unit: 'u', higherBetter: true, dp: 2, riskAt: 12, time: true },
  weight: { metric: 'body.weight', label: 'Gewicht', unit: 'kg', higherBetter: false, dp: 1, flat: 1.2, riskAt: 4 },
  protein: { metric: 'nutrition.protein', label: 'Eiwit', unit: 'g', higherBetter: true, riskAt: 10 },
  kcal: { metric: 'nutrition.calories', label: 'Calorieën', unit: 'kcal', higherBetter: true, flat: 5, riskAt: 12 },
  carbs: { metric: 'nutrition.carbs', label: 'Koolhydraten', unit: 'g', higherBetter: true, flat: 8 },
  fat: { metric: 'nutrition.fat', label: 'Vet', unit: 'g', higherBetter: false, flat: 8 },
  volume: { metric: 'fitness.session_volume', label: 'Volume', unit: 'kg', higherBetter: true, flat: 5, chart: 'bar' },
  steps: { metric: 'activity.steps', label: 'Stappen', unit: '', higherBetter: true, flat: 8, chart: 'bar' },
  vo2max: { metric: 'fitness.vo2max', label: 'VO₂max', unit: 'ml/kg/min', higherBetter: true, dp: 1, flat: 3 },
};

function summarize(key, points) {
  const cfg = METRICS[key];
  const series = (points || []).map((p) => Number(p.value)).filter(Number.isFinite);
  const dates = (points || []).map((p) => p.period);
  const base0 = { key, label: cfg.label, unit: cfg.unit, time: cfg.time, chart: cfg.chart, higherBetter: cfg.higherBetter };
  if (!series.length) return { ...base0, empty: true, series: [], dates: [], current: null, baseline: null, pct: 0, dir: 'flat', status: 'idle' };
  const cur = mean(series.slice(-3));
  let base;
  if (cfg.fixedBaseline != null) base = cfg.fixedBaseline;
  else if (series.length > 18) base = median(series.slice(Math.max(0, series.length - 49), series.length - 18) || series);
  else base = median(series);
  if (!base) base = median(series);
  const delta = cur - base, pct = base ? (delta / base) * 100 : 0;
  let status = 'good'; const adverse = cfg.higherBetter ? pct < 0 : pct > 0; const mag = Math.abs(pct);
  if (mag < (cfg.flat || 3)) status = 'flat'; else if (adverse) status = mag > (cfg.riskAt || 10) ? 'risk' : 'warn'; else status = 'good';
  return { ...base0, dp: cfg.dp || 0, series, dates, current: round(cur, cfg.dp || 0), baseline: round(base, cfg.dp || 0), delta: round(delta, cfg.dp || 0), pct: Math.round(pct), dir: delta > 1e-4 ? 'up' : delta < -1e-4 ? 'down' : 'flat', status };
}
const metricCache = new Map();
async function getMetric(key) {
  if (metricCache.has(key)) return metricCache.get(key);
  const cfg = METRICS[key];
  const data = await safe(`/series/${cfg.metric}?bucket=day`);
  const m = summarize(key, data && data.points);
  metricCache.set(key, m);
  return m;
}
const getMetrics = (keys) => Promise.all(keys.map(getMetric)).then((arr) => Object.fromEntries(arr.map((m) => [m.key, m])));
const mval = (m) => m == null || m.current == null ? '—' : m.time ? hm(m.current) : fmtNum(m.current, m.dp || 0);

// ============================================================ ICONS
const ICONS = {
  today: 'M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M18.4 5.6 17 7M12 8a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4ZM3 16h18M5 20h14',
  insights: 'M12 3l1.6 4.2L18 8.8l-3.4 2.8 1 4.6L12 14.4 8.4 16.2l1-4.6L6 8.8l4.4-1.6L12 3Z',
  trends: 'M4 19V5M4 19h16M7 15l3-4 3 2 4-6',
  recovery: 'M12 20s-7-4.6-9.2-9.2C1.3 7.6 3 4.5 6.2 4.5c1.9 0 3.2 1.1 3.8 2.2.6-1.1 1.9-2.2 3.8-2.2 3.2 0 4.9 3.1 3.4 6.3C19 15.4 12 20 12 20Z',
  training: 'M6.5 9.5v5M17.5 9.5v5M4 11v2M20 11v2M6.5 12h11',
  nutrition: 'M12 7c0-2 1.5-3.5 3.5-3.5M12 21c-3 0-5-3-5-7 0-3 2-5 5-5s5 2 5 5c0 4-2 7-5 7Z',
  health: 'M3 12h3l2-5 3 11 2.5-7 1.5 3h6',
  experiments: 'M9 3h6M10 3v6.5L5.5 17a2.5 2.5 0 0 0 2.2 3.8h8.6A2.5 2.5 0 0 0 18.5 17L14 9.5V3M8 14h8',
  reports: 'M6 3h8l4 4v14H6V3ZM14 3v4h4M9 12h6M9 16h6',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-2-3.4-2 .8a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2.1A7.6 7.6 0 0 0 6.9 5.6l-2-.8-2 3.4 1.7 1.3a7.7 7.7 0 0 0 0 3l-1.7 1.3 2 3.4 2-.8a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.5-2.1a7.6 7.6 0 0 0 2.6-1.5l2 .8 2-3.4-1.7-1.3Z',
  datacore: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  lab: 'M9 3h6M10 3v6.5L5.5 17a2.5 2.5 0 0 0 2.2 3.8h8.6A2.5 2.5 0 0 0 18.5 17L14 9.5V3',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  bell: 'M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10 21a2 2 0 0 0 4 0',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  plus: 'M12 5v14M5 12h14', arrowRight: 'M5 12h14M13 6l6 6-6 6', chevR: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18', check: 'M5 12l5 5L20 6',
  spark: 'M12 3l1.6 4.2L18 8.8l-3.4 2.8 1 4.6L12 14.4 8.4 16.2l1-4.6L6 8.8l4.4-1.6L12 3Z',
  flame: 'M12 3c0 3-3 4-3 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5M9 14a3 3 0 1 0 6 0',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
  bolt: 'M13 3 4 14h7l-1 7 9-11h-7l1-7Z', clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  scale: 'M12 4v16M7 8h10M9 4h6M5 8l-2 6a3 3 0 0 0 6 0L7 8M19 8l-2 6a3 3 0 0 0 6 0l-2-6',
  link: 'M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z', doc: 'M6 3h8l4 4v14H6V3ZM14 3v4h4',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v5M12 8h.01',
  alert: 'M12 9v4M12 17h.01M10.3 4 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z',
  back: 'M19 12H5M11 18l-6-6 6-6', more: 'M5 12h.01M12 12h.01M19 12h.01',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z',
  calendar: 'M7 4v3M17 4v3M4 9h16M5 6h14v15H5V6Z', play: 'M7 4v16l13-8L7 4Z', pause: 'M9 4v16M15 4v16',
  beaker: 'M9 3h6M10 3v6.5L5.5 17a2.5 2.5 0 0 0 2.2 3.8h8.6A2.5 2.5 0 0 0 18.5 17L14 9.5V3',
  pulse: 'M3 12h4l2-6 4 12 2-6h6', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
};
function icon(name, size = 18, cls = '', style = '') {
  const d = ICONS[name] || '';
  const paths = d.split('M').filter(Boolean).map((seg) => `<path d="M${seg}"/>`).join('');
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${style ? ` style="${style}"` : ''}>${paths}</svg>`;
}

// ============================================================ CHARTS (static SVG)
let _gid = 0;
const gid = () => 'g' + (++_gid);
function niceExtent(data, pad = 0.14, forceZero = false) { let mn = Math.min(...data), mx = Math.max(...data); if (forceZero) mn = Math.min(0, mn); const span = (mx - mn) || 1; return [mn - span * pad, mx + span * pad]; }
function smoothPath(data, W, H, lo, hi, padT = 0, innerH = H) {
  const n = data.length;
  const X = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const Y = (v) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const P = data.map((v, i) => [X(i), Y(v)]);
  if (n < 3) return { d: P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), P, X, Y };
  let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i === 0 ? 0 : i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2, t = 0.16;
    d += ' C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1)
      + ' ' + (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1)
      + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  return { d, P, X, Y };
}
function sparkline(data, { width = 96, height = 30, color = 'var(--accent)', fill = true, strokeW = 1.75 } = {}) {
  if (!data || data.length < 2) return `<svg width="${width}" height="${height}"></svg>`;
  const [lo, hi] = niceExtent(data, 0.18); const { d } = smoothPath(data, width, height, lo, hi, 0, height);
  const id = gid(); const area = d + ` L${width} ${height} L0 ${height} Z`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;overflow:visible">
    ${fill ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${id})"/>` : ''}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function lineChart(data, dates, { height = 180, color = 'var(--accent)', baseline = null, time = false, unit = '', dp = 0 } = {}) {
  if (!data || data.length < 2) return `<div class="empty" style="padding:18px">Te weinig data voor een grafiek</div>`;
  const W = 640, padB = 18, padT = 8, innerH = height - padB - padT;
  const vals = baseline != null ? [...data, baseline] : data;
  const [lo, hi] = niceExtent(vals, 0.14);
  const { d, P } = smoothPath(data, W, height, lo, hi, padT, innerH);
  const id = gid(); const area = d + ` L${W} ${padT + innerH} L0 ${padT + innerH} Z`;
  const baseY = baseline != null ? padT + innerH - ((baseline - lo) / (hi - lo)) * innerH : null;
  const last = P[P.length - 1];
  const ti = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const ticks = dates ? ti.map((i) => `<span>${fmtShort(dates[i])}</span>`).join('') : '';
  const baseChip = baseline != null ? `<div style="position:absolute;top:${Math.max(0, baseY - 9)}px;right:0;font-size:10px;color:var(--ink-3);background:var(--surface);padding:1px 6px;border-radius:6px;font-family:var(--font-mono);border:1px solid var(--line)">baseline ${time ? hm(baseline) : fmtNum(baseline, dp)}</div>` : '';
  return `<div style="position:relative;width:100%">
    <svg class="chart-svg" height="${height}" viewBox="0 0 ${W} ${height}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.20"/><stop offset="92%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${[0, 0.5, 1].map((g) => `<line x1="0" x2="${W}" y1="${padT + innerH * g}" y2="${padT + innerH * g}" stroke="var(--chart-grid)" stroke-width="1"/>`).join('')}
      ${baseY != null ? `<line x1="0" x2="${W}" y1="${baseY}" y2="${baseY}" stroke="var(--chart-baseline)" stroke-width="1" stroke-dasharray="3 4"/>` : ''}
      <path d="${area}" fill="url(#${id})"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.4" fill="${color}" stroke="var(--surface)" stroke-width="2"/>
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:10.5px;color:var(--ink-faint);font-family:var(--font-mono)">${ticks}</div>
    ${baseChip}</div>`;
}
function barChart(data, dates, { height = 150, color = 'var(--accent)' } = {}) {
  if (!data || !data.length) return `<div class="empty" style="padding:18px">Geen data</div>`;
  const W = 640, padB = 18, padT = 6, innerH = height - padB - padT;
  const max = Math.max(...data) * 1.12 || 1, n = data.length;
  const gap = n > 40 ? 1 : n > 20 ? 2 : 4, bw = (W - gap * (n - 1)) / n;
  const bars = data.map((v, i) => { const bh = Math.max(1, (v / max) * innerH); const isLast = i === n - 1; return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(padT + innerH - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(3, bw / 2).toFixed(1)}" fill="${isLast ? color : 'var(--line-strong)'}" opacity="${isLast ? 1 : 0.7}"/>`; }).join('');
  const ticks = dates ? `<span>${fmtShort(dates[0])}</span><span>${fmtShort(dates[n - 1])}</span>` : '';
  return `<div style="width:100%"><svg class="chart-svg" height="${height}" viewBox="0 0 ${W} ${height}" preserveAspectRatio="none">${bars}</svg>
    <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:10.5px;color:var(--ink-faint);font-family:var(--font-mono)">${ticks}</div></div>`;
}
function ring(value, max, { size = 120, stroke = 10, color = 'var(--accent)', label, sub } = {}) {
  const rr = (size - stroke) / 2, circ = 2 * Math.PI * rr, pct = Math.max(0, Math.min(1, value / max));
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:0 0 auto">
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${(circ * (1 - pct)).toFixed(1)}" style="transition:stroke-dashoffset .9s var(--ease-out)"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      ${label != null ? `<div class="metric-val" style="font-size:${(size * 0.27).toFixed(0)}px;color:var(--ink)">${label}</div>` : ''}
      ${sub ? `<div style="font-size:10.5px;color:var(--ink-3);margin-top:2px;font-weight:600">${esc(sub)}</div>` : ''}
    </div></div>`;
}
function readinessGauge(score, size = 150) {
  const s = score >= 75 ? 'good' : score >= 60 ? 'warn' : 'risk';
  const c = s === 'good' ? 'var(--good)' : s === 'warn' ? 'var(--warn)' : 'var(--risk)';
  const word = score >= 80 ? 'Uitstekend' : score >= 70 ? 'Goed' : score >= 60 ? 'Matig' : score >= 45 ? 'Laag' : 'Zeer laag';
  return ring(score, 100, { size, stroke: 12, color: c, label: Math.round(score), sub: word });
}
function stackBar(segments, height = 10) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return `<div style="display:flex;height:${height}px;border-radius:99px;overflow:hidden;background:var(--surface-2);gap:2px">${segments.map((s) => `<div title="${esc(s.label)}" style="width:${(s.value / total) * 100}%;background:${s.color};border-radius:99px"></div>`).join('')}</div>`;
}

// ============================================================ COMPONENTS
function deltaPill(m) {
  if (!m || m.empty || m.current == null) return '';
  const adverse = m.status === 'risk' || m.status === 'warn';
  const cls = m.status === 'flat' ? '' : adverse ? 'risk' : 'good';
  const tri = m.dir === 'up' ? '▲' : m.dir === 'down' ? '▼' : '•';
  const val = m.dir === 'flat' ? 'stabiel' : `${m.pct > 0 ? '+' : ''}${m.pct}%`;
  return `<span class="pill ${cls}"><span class="tri">${tri}</span>${val}</span>`;
}
const sdot = (s) => `<span class="sdot ${s}"></span>`;
const sectionTitle = (txt, action = '') => `<div class="section-title"><span>${esc(txt)}</span><span class="line"></span>${action}</div>`;
function confidence(value, compact) {
  if (value == null) return `<span class="muted" style="font-size:12px">n.v.t.</span>`;
  const col = value >= 75 ? 'var(--good)' : value >= 55 ? 'var(--warn)' : 'var(--ink-3)';
  return `<div style="display:flex;align-items:center;gap:8px"><div class="track" style="width:${compact ? 50 : 74}px;height:6px"><i style="width:${value}%;background:${col}"></i></div><span class="mono" style="font-size:12px;color:var(--ink-2);font-weight:600">${value}%</span></div>`;
}
function metricTile(m) {
  if (!m) return '';
  const c = m.status === 'risk' ? 'var(--risk)' : m.status === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const ds = m.status === 'good' || m.status === 'flat' || m.status === 'idle' ? 'good' : m.status;
  return `<button class="card metric-tile" data-nav="trends" data-metric="${m.key}" style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:8px">${sdot(ds)}<span style="font-size:12.5px;font-weight:650;color:var(--ink-2)">${esc(m.label)}</span><span style="margin-left:auto">${deltaPill(m)}</span></div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
      <div><span class="metric-val" style="font-size:27px">${mval(m)}</span>${m.unit && !m.time ? `<span style="font-size:12.5px;color:var(--ink-3);margin-left:4px;font-weight:600">${esc(m.unit)}</span>` : ''}</div>
      ${sparkline(m.series.slice(-30), { color: c, width: 84, height: 32 })}
    </div></button>`;
}
function metricChartCard(m) {
  if (!m) return '';
  const c = m.status === 'risk' ? 'var(--risk)' : m.status === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const ds = m.status === 'good' || m.status === 'flat' || m.status === 'idle' ? 'good' : m.status;
  const data = m.series.slice(-45), dates = m.dates.slice(-45);
  const body = m.empty ? `<div class="empty" style="padding:18px">Nog geen data</div>`
    : m.chart === 'bar' ? barChart(data, dates, { height: 140, color: c }) : lineChart(data, dates, { height: 140, color: c, baseline: m.baseline, time: m.time, unit: m.unit, dp: m.dp });
  return `<div class="card"><div class="card-head" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:9px">${sdot(ds)}<div><div class="ttl">${esc(m.label)}</div></div></div>
    <div class="right" style="text-align:right"><span class="metric-val" style="font-size:22px">${mval(m)}</span>${m.unit && !m.time ? `<span style="font-size:12px;color:var(--ink-3);margin-left:3px">${esc(m.unit)}</span>` : ''}<div style="margin-top:3px">${deltaPill(m)}</div></div>
  </div>${body}</div>`;
}
function kpiCard({ icon: ic, label, value, unit, sub, pill, status }) {
  const ico = status ? `insight-ic ${status}` : 'insight-ic';
  const istyle = status ? '' : 'background:var(--accent-soft);color:var(--accent)';
  return `<div class="card" style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:8px"><span class="${ico}" style="${istyle}">${icon(ic, 14)}</span><span style="font-size:12px;color:var(--ink-3);font-weight:600">${esc(label)}</span>${pill ? `<span class="pill ${status || ''}" style="margin-left:auto">${esc(pill)}</span>` : ''}</div>
    <div style="display:flex;align-items:baseline;gap:6px"><span class="metric-val" style="font-size:26px">${value}</span>${unit ? `<span style="font-size:12.5px;color:var(--ink-3);font-weight:600">${esc(unit)}</span>` : ''}</div>
    ${sub ? `<span class="meta" style="font-size:11.5px;color:var(--ink-3)">${esc(sub)}</span>` : ''}</div>`;
}

// ---- insights mapping (real /api/v1/insights -> design insight) ----
const CAT_STATUS = { risk: 'risk', recovery: 'warn', training: 'warn', stress: 'warn', biomarker: 'warn', wellbeing: 'info', nutrition: 'good', sleep: 'warn' };
const impactWord = (n) => n >= 70 ? 'Hoog' : n >= 50 ? 'Middel' : 'Laag';
function mapInsight(it, i) {
  const status = CAT_STATUS[it.category] || (it.impact >= 70 ? 'risk' : 'info');
  return {
    id: it.id || ('ins-' + i), domain: cap(it.category || 'inzicht'), status,
    impact: impactWord(it.impact || 0), impactN: it.impact, priority: i + 1,
    title: it.title || it.summary || 'Inzicht', brief: it.summary || it.title || '',
    confidence: typeof it.confidence === 'number' ? Math.round(it.confidence) : null,
    evidence: [
      it.impact != null ? { v: String(it.impact), k: 'impact' } : null,
      it.confidence != null ? { v: Math.round(it.confidence) + '%', k: 'betrouwbaarheid' } : null,
      it.uncertainty ? { v: it.uncertainty, k: 'onzekerheid' } : null,
    ].filter(Boolean),
  };
}
function insightCard(ins, { compact = false, clickable = true } = {}) {
  const ic = ins.status === 'risk' ? 'alert' : ins.status === 'good' ? 'check' : ins.status === 'info' ? 'info' : 'pulse';
  return `<article class="card insight-card anim ${clickable ? 'clickable' : ''}" ${clickable ? `data-open-insight="${esc(ins.id)}"` : ''}>
    <div class="insight-rail" style="background:var(--${ins.status})"></div>
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px"><span class="insight-ic ${ins.status}">${icon(ic, 15)}</span><span class="eyebrow" style="color:var(--ink-3)">${esc(ins.domain)}</span><span class="pill ${ins.status}" style="margin-left:auto">${esc(ins.impact)} impact</span></div>
    <h3 style="font-size:${compact ? 16 : 18}px;font-weight:700;letter-spacing:-0.015em;line-height:1.25;margin:0 0 8px">${esc(ins.title)}</h3>
    <p style="font-size:14px;line-height:1.55;color:var(--ink-2);margin:0;text-wrap:pretty">${esc(ins.brief)}</p>
    ${!compact && ins.evidence.length ? `<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">${ins.evidence.slice(0, 3).map((e) => `<span class="evidence-chip"><b class="mono">${esc(e.v)}</b> ${esc(e.k)}</span>`).join('')}</div>` : ''}
    <div style="display:flex;align-items:center;gap:14px;margin-top:15px;padding-top:13px;border-top:1px solid var(--line)">
      <div style="display:flex;align-items:center;gap:7px"><span style="font-size:11px;color:var(--ink-3);font-weight:600">Betrouwbaarheid</span>${confidence(ins.confidence, true)}</div>
      <span style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:12.5px;font-weight:650;color:var(--accent)">Bekijk bewijs ${icon('arrowRight', 14)}</span>
    </div></article>`;
}
function futurePanel(ic, title, body) {
  return `<div class="card future"><span class="insight-ic info" style="width:40px;height:40px">${icon(ic, 20)}</span><div style="font-size:15px;font-weight:700">${esc(title)}</div><p class="muted" style="font-size:13px;max-width:420px;line-height:1.55;margin:0">${esc(body)}</p></div>`;
}
const loading = () => `<div class="page"><div class="empty" style="padding:50px">Health Core laden…</div></div>`;
const errorPage = (msg) => `<div class="page"><div class="card" style="border-color:#fecaca;color:var(--risk)">Fout bij laden: ${esc(msg)}</div></div>`;

// ============================================================ STATE
const state = {
  route: localStorage.getItem('hc-route') || 'today',
  metric: null,
  trendsRange: '90',
  insightsFilter: 'all',
  trackMetric: localStorage.getItem('hc-track-metric') || 'body.weight',
  trackDate: amsterdamDate(),
  trackResult: null,
  expTab: 'running',
  healthTab: 'overzicht',
  theme: localStorage.getItem('hc-theme') || 'light',
  accent: localStorage.getItem('hc-accent') || '#3f6b5e',
  density: localStorage.getItem('hc-density') || 'regular',
  font: localStorage.getItem('hc-font') || 'Hanken Grotesk',
  counts: { insights: 0, experiments: 0 },
  recoveryDot: false,
  insights: [],
  serverDate: null,
};

const NAV = [
  { group: 'Dagelijks', items: [
    { id: 'today', label: 'Vandaag', icon: 'today' },
    { id: 'track', label: 'Loggen', icon: 'plus' },
    { id: 'insights', label: 'Inzichten', icon: 'insights', count: () => state.counts.insights },
    { id: 'trends', label: 'Trends', icon: 'trends' },
  ] },
  { group: 'Domeinen', items: [
    { id: 'recovery', label: 'Herstel', icon: 'recovery', dot: () => state.recoveryDot },
    { id: 'training', label: 'Training', icon: 'training' },
    { id: 'nutrition', label: 'Voeding', icon: 'nutrition' },
    { id: 'health', label: 'Gezondheid', icon: 'health' },
  ] },
  { group: 'Systeem', items: [
    { id: 'experiments', label: 'Experimenten', icon: 'experiments', count: () => state.counts.experiments },
    { id: 'reports', label: 'Rapporten', icon: 'reports' },
    { id: 'datacore', label: 'Data Core', icon: 'datacore' },
    { id: 'settings', label: 'Instellingen', icon: 'settings' },
  ] },
];
const ALL_ITEMS = NAV.flatMap((g) => g.items);
const TITLES = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i.label]));
const BOTTOM = ['today', 'track', 'insights', 'recovery'];
const FONT_STACKS = {
  'Hanken Grotesk': '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  'Figtree': '"Figtree", -apple-system, system-ui, sans-serif',
  'Onest': '"Onest", -apple-system, system-ui, sans-serif',
};

const PRIORITY_RANK = { critical: 0, high: 1, review: 1, urgent: 1, medium: 2, monitor: 2, normal: 3, low: 4 };
const ACTION_LABELS = { acknowledged: 'Erken', snoozed: 'Snooze', dismissed: 'Wijs af', done: 'Gedaan' };
const TODAY_DISCLAIMER = 'Informational context derived from your own data. It does not replace medical advice or provide a diagnosis — consult a qualified clinician for medical decisions.';

// ============================================================ THEME
function applyTheme() {
  const r = document.documentElement;
  r.setAttribute('data-theme', state.theme);
  r.style.setProperty('--accent-base', state.accent);
  r.style.setProperty('--font-sans', FONT_STACKS[state.font] || FONT_STACKS['Hanken Grotesk']);
  const dens = { compact: 0.82, regular: 1, comfy: 1.16 }[state.density] || 1;
  r.style.setProperty('--density', dens);
  r.style.setProperty('--gap', Math.round(16 * (dens > 1 ? 1.1 : dens < 1 ? 0.85 : 1)) + 'px');
}
function setTheme(v) { state.theme = v; localStorage.setItem('hc-theme', v); applyTheme(); renderShell(); renderScreen(); }

// ============================================================ SCREENS
const SCREENS = {};

SCREENS.today = async () => {
  const [osRaw, goalsRaw] = await Promise.all([safe('/operating-system'), safe('/health-goals')]);
  const today = normalizeToday(osRaw || {}, goalsRaw || {});
  const summary = today.summaryLine || 'Nog geen dagelijkse digest beschikbaar. Zodra er genoeg recente data is, verschijnt hier de briefing.';
  const generated = today.generatedAt ? today.generatedAt.slice(0, 16).replace('T', ' ') : fmtToday();

  return `<div class="page wide stagger today-os" data-testid="today-view">
    <div class="card raised today-hero anim today-briefing" style="margin-bottom:22px;padding:26px">
      <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap">
        <span class="brand-mark" style="width:44px;height:44px;border-radius:13px">${icon('today', 22)}</span>
        <div style="flex:1;min-width:240px">
          <div class="eyebrow" style="margin-bottom:7px">Health OS · ${esc(generated)}</div>
          <p class="briefing" style="margin:0">${esc(summary)}</p>
        </div>
        <span class="pill ${today.recommendations.length ? 'warn' : 'good'}">${today.recommendations.length} open actie(s)</span>
      </div>
      ${today.highlights.length ? `<div class="today-highlight-grid">${today.highlights.slice(0, 6).map(todayHighlight).join('')}</div>` : `<div class="empty today-empty">Geen highlights in de digest</div>`}
    </div>

    <div class="today-disclaimer" data-testid="today-disclaimer">${icon('info', 15)}<span>${esc(today.disclaimer || TODAY_DISCLAIMER)}</span></div>

    <div class="split today-layout">
      <div class="grid" style="gap:18px;align-content:start">
        <section>
          ${sectionTitle('Open aanbevelingen', `<span id="today-rec-count" class="pill ${today.recommendations.length ? 'warn' : 'good'}">${today.recommendations.length}</span>`)}
          <div id="today-rec-list" class="grid" style="gap:12px" data-testid="today-recommendations">
            ${today.recommendations.length ? today.recommendations.map(todayRecommendation).join('') : todayEmpty('check', 'Geen open aanbevelingen', 'Alles wat afgehandeld, gesnoozed of dismissed is blijft uit deze actieve lijst.')}
          </div>
        </section>

        <section>
          ${sectionTitle('Doelen due/off-track')}
          <div class="grid" style="gap:12px" data-testid="today-goals-due">
            ${today.goalAlerts.length ? today.goalAlerts.map(todayGoalAlert).join('') : todayEmpty('target', 'Geen doelen off-track', 'Er zijn vandaag geen urgente of achterstallige doel-signalen.')}
          </div>
        </section>
      </div>

      <div class="grid" style="gap:18px;align-content:start">
        <section>
          ${sectionTitle('Goal progress & streaks')}
          <div class="grid" style="gap:12px" data-testid="today-goal-progress">
            ${today.goalProgress.length ? today.goalProgress.map(todayGoalProgress).join('') : todayEmpty('flame', 'Nog geen goal progress', 'Zodra de progress API current/target of streaks levert, zie je hier voortgang per persoonlijk doel.')}
          </div>
        </section>

        <section>
          ${sectionTitle('Streaks')}
          <div class="card">
            ${today.streaks.length ? today.streaks.map(todayStreak).join('') : `<div class="empty" style="padding:18px">Geen actieve streaks</div>`}
          </div>
        </section>
      </div>
    </div>
  </div>`;
};

function normalizeToday(os, goalsRaw) {
  const digest = os.today || os.digest || os.briefing || os;
  const decision = os.decision_support || os.decisionSupport || {};
  const progress = os.progress || digest.progress || {};
  const goals = goalsRaw.goals || os.goals || digest.goals || [];
  const recommendations = firstArray(digest.recommendations, digest.decisions, decision.recommendations, os.recommendations)
    .map(normalizeRecommendation).filter((r) => r.key || r.message).sort(prioritySort);
  const highlights = firstArray(digest.highlights, digest.alerts, os.highlights).map(normalizeHighlight).sort(prioritySort);
  const explicitGoalProgress = firstArray(digest.goal_progress, digest.goalProgress, progress.goal_progress, progress.goals_progress, progress.items, os.goal_progress);
  const goalProgress = explicitGoalProgress.length ? explicitGoalProgress.map(normalizeGoalProgress)
    : fallbackGoalProgress(progress.goals, goals);
  const goalAlerts = firstArray(digest.goals_due, digest.goalsDue, digest.goals_off_track, digest.goalsOffTrack, os.goals_due)
    .map(normalizeGoalAlert);
  const streaks = firstArray(digest.streaks, progress.streaks, os.streaks).map(normalizeStreak);
  return {
    generatedAt: digest.generated_at || digest.generatedAt || os.generated_at,
    summaryLine: todaySummaryLine(digest.summary || digest.briefing || digest),
    highlights,
    recommendations,
    goalAlerts,
    goalProgress,
    streaks,
    disclaimer: digest.disclaimer || decision.note || os.disclaimer
  };
}
function firstArray(...xs) { return xs.find((x) => Array.isArray(x) && x.length) || []; }
function prioritySort(a, b) { return (priorityRank(a.priority) - priorityRank(b.priority)) || ((a.index || 0) - (b.index || 0)); }
function priorityRank(p) { return PRIORITY_RANK[String(p || '').toLowerCase()] ?? 3; }
function todaySummaryLine(summary) {
  if (summary == null) return '';
  if (typeof summary === 'string') return summary;
  if (summary.text || summary.message || summary.title) return summary.text || summary.message || summary.title;
  const parts = [];
  for (const [k, v] of Object.entries(summary)) {
    if (v == null || typeof v === 'object') continue;
    parts.push(`${k.replace(/_/g, ' ')}: ${v}`);
  }
  return parts.join(' · ');
}
function normalizeHighlight(x, i) {
  if (typeof x === 'string') return { title: x, detail: '', priority: 'normal', index: i };
  return { title: x.title || x.label || humanMetric(x.metric) || x.type || 'Highlight', detail: x.detail || x.summary || x.message || '', priority: x.priority || x.severity || 'normal', index: i };
}
function normalizeRecommendation(x, i) {
  if (typeof x === 'string') return { key: `ui:${i}`, title: 'Aanbeveling', message: x, priority: 'normal', type: 'general', index: i };
  const key = x.rec_key || x.key || x.id || x.recommendation_id || '';
  return { key, title: x.title || cap(x.type || x.category || 'Aanbeveling'), message: x.message || x.summary || x.detail || x.text || '', priority: x.priority || x.severity || 'normal', type: x.type || x.category || 'general', index: i };
}
function normalizeGoalAlert(x, i) {
  if (typeof x === 'string') return { title: x, detail: '', status: 'due', index: i };
  return { title: x.title || x.name || `Doel ${i + 1}`, detail: x.detail || x.summary || x.reason || '', status: x.status || x.state || 'due', index: i };
}
function normalizeGoalProgress(x, i) {
  const current = numberOrNull(x.current ?? x.value ?? x.completed ?? x.done);
  const target = numberOrNull(x.target ?? x.goal ?? x.total);
  const pct = numberOrNull(x.percent ?? x.percentage ?? x.progress_pct);
  const percent = pct != null ? pct : (target && current != null ? (current / target) * 100 : null);
  return { title: x.title || x.name || x.goal || `Doel ${i + 1}`, current, target, unit: x.unit || '', percent, streak: x.streak ?? x.current_streak ?? null, streakUnit: x.streak_unit || 'dagen', status: x.status || '' };
}
function normalizeStreak(x, i) {
  if (typeof x === 'string') return { title: x, value: null, unit: '' };
  return { title: x.title || x.name || `Streak ${i + 1}`, value: x.value ?? x.days ?? x.streak ?? x.current_streak ?? null, unit: x.unit || x.streak_unit || 'dagen' };
}
function fallbackGoalProgress(counts, goals) {
  if (!counts && !goals.length) return [];
  const completed = Number(counts?.complete ?? counts?.completed ?? goals.filter((g) => g.status === 'complete').length);
  const total = Number(counts?.total ?? goals.length);
  if (!Number.isFinite(total) || total <= 0) return [];
  return [{ title: 'Health OS registry', current: completed, target: total, unit: 'doelen', percent: (completed / total) * 100, streak: completed === total ? total : null, streakUnit: 'complete' }];
}
function numberOrNull(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function percentLabel(v) { return v == null ? '—' : `${Math.round(Math.max(0, Math.min(100, v)))}%`; }
function todayPriorityClass(p) {
  const r = priorityRank(p);
  return r <= 1 ? 'risk' : r === 2 ? 'warn' : 'info';
}
function todayHighlight(h) {
  const cls = todayPriorityClass(h.priority);
  return `<div class="today-highlight"><span class="insight-ic ${cls}">${icon(cls === 'risk' ? 'alert' : 'spark', 14)}</span><div><div class="ttl">${esc(h.title)}</div>${h.detail ? `<div class="meta">${esc(h.detail)}</div>` : ''}</div></div>`;
}
function todayRecommendation(r) {
  const cls = todayPriorityClass(r.priority);
  const key = encodeURIComponent(r.key || `ui:${r.index}`);
  return `<article class="card today-rec" data-rec-key="${esc(r.key || '')}">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <span class="insight-ic ${cls}">${icon(cls === 'risk' ? 'alert' : 'info', 14)}</span>
      <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h3>${esc(r.title)}</h3><span class="pill ${cls}">${esc(r.priority || 'normal')}</span></div>
        <p>${esc(r.message || 'Geen detailtekst beschikbaar.')}</p>
        <div class="today-rec-actions">
          ${Object.entries(ACTION_LABELS).map(([status, label]) => `<button class="btn sm ${status === 'done' ? 'primary' : ''}" data-rec-action="${status}" data-rec-key="${esc(key)}">${icon(status === 'done' ? 'check' : status === 'dismissed' ? 'close' : status === 'snoozed' ? 'clock' : 'info', 13)}${label}</button>`).join('')}
        </div>
        <div class="meta today-rec-msg" aria-live="polite"></div>
      </div>
    </div>
  </article>`;
}
function todayGoalAlert(g) {
  const cls = /off|risk|blocked|late/i.test(g.status) ? 'warn' : 'info';
  return `<div class="card today-goal-alert"><div style="display:flex;gap:10px;align-items:flex-start"><span class="insight-ic ${cls}">${icon('target', 14)}</span><div><div style="font-size:13.5px;font-weight:700">${esc(g.title)}</div>${g.detail ? `<div class="meta" style="margin-top:4px">${esc(g.detail)}</div>` : ''}<span class="pill ${cls}" style="margin-top:9px">${esc(g.status)}</span></div></div></div>`;
}
function todayGoalProgress(g) {
  const pct = Math.max(0, Math.min(100, g.percent ?? 0));
  const current = g.current == null ? '—' : fmtNum(g.current, Number.isInteger(g.current) ? 0 : 1);
  const target = g.target == null ? '—' : fmtNum(g.target, Number.isInteger(g.target) ? 0 : 1);
  return `<div class="card today-goal-progress-card">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><span class="insight-ic good">${icon('target', 14)}</span><div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:700">${esc(g.title)}</div><div class="meta">${current} / ${target} ${esc(g.unit || '')}</div></div><span class="metric-val" style="font-size:20px">${percentLabel(g.percent)}</span></div>
    <div class="track"><i style="width:${pct}%;background:var(--accent)"></i></div>
    ${g.streak != null ? `<div class="today-streak-line">${icon('flame', 13)}<span>${esc(g.streak)} ${esc(g.streakUnit)}</span></div>` : ''}
  </div>`;
}
function todayStreak(s) {
  return `<div class="row"><span class="lead"><span class="insight-ic good">${icon('flame', 14)}</span><span><span class="nm" style="display:block">${esc(s.title)}</span><span class="meta">${s.value == null ? 'Actief' : `${esc(s.value)} ${esc(s.unit)}`}</span></span></span></div>`;
}
function todayEmpty(ic, title, detail) {
  return `<div class="empty today-empty">${icon(ic, 18)}<div style="font-weight:700;color:var(--ink);margin-top:8px">${esc(title)}</div><div style="font-size:12.5px;line-height:1.45;margin-top:4px">${esc(detail)}</div></div>`;
}

SCREENS.track = async () => {
  const [catalog, latest] = await Promise.all([safe('/metrics'), safe('/observations/latest')]);
  const metrics = ((catalog && catalog.metrics) || []).filter((m) => m.status === 'active');
  if (!metrics.find((m) => m.key === state.trackMetric) && metrics[0]) state.trackMetric = metrics[0].key;
  const selected = metrics.find((m) => m.key === state.trackMetric) || metrics[0] || {};
  const latestRows = ((latest && latest.latest) || []).filter((r) => r.source === 'manual').slice(0, 8);
  const result = state.trackResult;
  return `<div class="page wide stagger">
    <div class="card raised anim" style="margin-bottom:20px;display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
      <span class="insight-ic good" style="width:38px;height:38px">${icon('plus', 18)}</span>
      <div style="flex:1;min-width:240px"><div class="eyebrow" style="margin-bottom:5px">Dagelijkse invoer</div>
        <p class="briefing" style="margin:0;font-size:15px">Log één observatie met de bestaande handmatige ingest. De sleutel is stabiel per metric en dag, dus opnieuw opslaan corrigeert dezelfde rij in plaats van een duplicaat te maken.</p>
      </div>
    </div>
    <div class="split">
      <div class="card">
        <div class="card-head" style="margin-bottom:14px"><div><div class="ttl">Nieuwe observatie</div><div class="sub">Bron: manual · correcties via LWW</div></div></div>
        <div class="cols-2" style="margin-bottom:12px">
          <label class="field">Metric<select id="track-metric">${metrics.map((m) => `<option value="${esc(m.key)}" data-unit="${esc(m.unit || '')}" ${m.key === state.trackMetric ? 'selected' : ''}>${esc(m.display_name || humanMetric(m.key))} · ${esc(m.key)}</option>`).join('')}</select></label>
          <label class="field">Datum<input id="track-date" type="date" value="${esc(state.trackDate)}" /></label>
        </div>
        <div class="cols-2" style="margin-bottom:12px">
          <label class="field">Waarde<input id="track-value" type="number" step="any" inputmode="decimal" placeholder="0" /></label>
          <label class="field">Eenheid<input id="track-unit" value="${esc(selected.unit || '')}" readonly /></label>
        </div>
        <label class="field" style="margin-bottom:12px">Notitie optioneel<input id="track-note" placeholder="context, klacht, training, maaltijd…" /></label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn primary" data-track-submit>${icon('check', 14)}Opslaan</button>
          <span id="track-msg" class="muted" style="font-size:12.5px">${result ? esc(result.message) : ''}</span>
        </div>
        ${result ? `<div class="card" style="margin-top:14px;background:var(--surface-2)"><div style="display:flex;gap:10px;align-items:flex-start"><span class="insight-ic ${result.ok ? 'good' : 'warn'}">${icon(result.ok ? 'check' : 'alert', 14)}</span><div><div style="font-size:13.5px;font-weight:700">${esc(result.title)}</div><div class="meta" style="margin-top:4px">${esc(result.detail)}</div></div></div></div>` : ''}
      </div>
      <div class="grid" style="gap:16px;align-content:start">
        <div class="card">
          <div class="card-head" style="margin-bottom:12px"><div><div class="ttl">Geselecteerd</div><div class="sub mono">${esc(selected.key || '')}</div></div><span class="pill good right">${esc(selected.status || 'active')}</span></div>
          <p class="meta" style="font-size:13px;line-height:1.5;margin:0">${esc(selected.description || 'Geen beschrijving in de registry.')}</p>
          <div class="divider" style="margin:14px 0"></div>
          <div class="cols-2"><div class="kpi"><span class="lab">Eenheid</span><span class="val metric-val">${esc(selected.unit || '—')}</span></div><div class="kpi"><span class="lab">Type</span><span class="val metric-val">${esc(selected.value_kind || 'numeric')}</span></div></div>
        </div>
        <div class="card flush">
          <div style="padding:14px 14px 8px"><div class="ttl">Laatste manual waarden</div></div>
          ${latestRows.length ? `<table class="tbl"><thead><tr><th>Metric</th><th>Datum</th><th>Waarde</th></tr></thead><tbody>${latestRows.map((r) => `<tr><td style="font-weight:600">${esc(humanMetric(r.metric_type))}<div class="meta mono" style="font-size:11px">${esc(r.metric_type)}</div></td><td class="mono">${esc(r.timestamp)}</td><td class="mono">${fmtNum(r.value, 2).replace(/,00$/, '')} ${esc(r.unit || '')}</td></tr>`).join('')}</tbody></table>` : `<div class="empty" style="border:none">Nog geen handmatige observaties</div>`}
        </div>
      </div>
    </div>
  </div>`;
};

function humanMetric(key) {
  if (!key) return '';
  const map = { 'heart.hrv_sdnn': 'HRV', 'heart.resting_rate': 'Rusthartslag', 'sleep.duration': 'Slaap', 'body.weight': 'Gewicht', 'blood.apob': 'ApoB', 'blood.glucose': 'Glucose', 'blood.hba1c': 'HbA1c', 'blood.crp': 'CRP', 'score.stress': 'Stress' };
  return map[key] || cap(key.split('.').pop().replace(/_/g, ' '));
}

SCREENS.insights = async () => {
  const raw = await safe('/insights');
  const insights = (raw && raw.insights || []).map(mapInsight);
  state.insights = insights;
  const filters = [['all', 'Alle'], ['risk', 'Risico'], ['warn', 'Aandacht'], ['good', 'Positief'], ['info', 'Patronen']];
  const list = insights.filter((i) => state.insightsFilter === 'all' || i.status === state.insightsFilter);
  return `<div class="page stagger">
    <div class="card raised anim" style="margin-bottom:22px;display:flex;gap:16px;align-items:flex-start">
      <span class="brand-mark" style="width:38px;height:38px;border-radius:11px">${icon('spark', 19)}</span>
      <div style="flex:1"><div class="eyebrow" style="margin-bottom:6px">Briefing · ${fmtToday()}</div>
        <p class="briefing" style="margin:0">Ik heb je data doorgenomen. ${insights.length ? `Het belangrijkste signaal nu: <span class="hl">${esc(insights[0].title.toLowerCase())}</span>. Hieronder staan ${insights.length} inzichten, op prioriteit.` : 'Er zijn op dit moment geen opvallende inzichten — alles beweegt binnen je normale patronen.'}</p>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <div class="seg">${filters.map(([id, l]) => `<button class="${state.insightsFilter === id ? 'on' : ''}" data-insights-filter="${id}">${l}</button>`).join('')}</div>
      <span class="muted" style="font-size:12.5px;margin-left:auto">${list.length} inzichten · gesorteerd op prioriteit</span>
    </div>
    <div class="grid cols-2" style="align-items:start">${list.length ? list.map((i) => insightCard(i)).join('') : `<div class="empty">Geen inzichten in deze categorie</div>`}</div>
  </div>`;
};

const TREND_KEYS = ['hrv', 'rhr', 'readiness', 'sleep', 'weight', 'volume'];
const RANGES = [['30', 'Maand'], ['90', 'Kwartaal'], ['120', 'Jaar']];
SCREENS.trends = async () => {
  const sel = state.metric && METRICS[state.metric] ? state.metric : 'hrv';
  const [models, corr, longitudinal] = await Promise.all([getMetrics(TREND_KEYS), safe('/correlations?days=90'), safe('/longitudinal')]);
  const m = models[sel] || models.hrv;
  const days = +(RANGES.find((r) => r[0] === state.trendsRange) || RANGES[1])[0];
  const data = m.series.slice(-days), dates = m.dates.slice(-days);
  const c = m.status === 'risk' ? 'var(--risk)' : m.status === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const fmtV = (v) => m.time ? hm(v) : fmtNum(v, m.dp || 0);
  const stats = data.length ? [['Gemiddeld', fmtV(mean(data))], ['Hoogste', fmtV(Math.max(...data))], ['Laagste', fmtV(Math.min(...data))], ['Baseline', m.time ? hm(m.baseline) : fmtNum(m.baseline, m.dp || 0)]] : [];
  const correlations = (corr && corr.correlations || []).slice(0, 3);
  const milestones = (longitudinal && longitudinal.milestones || []).slice(0, 5);
  return `<div class="page wide stagger">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <p class="muted" style="margin:0;font-size:13.5px;max-width:520px;line-height:1.5">Langetermijnpatronen wegen zwaarder dan losse dagen. Vergelijk altijd met je eigen baseline, niet met gemiddelden.</p>
      <div class="seg" style="margin-left:auto">${RANGES.map(([id, l]) => `<button class="${state.trendsRange === id ? 'on' : ''}" data-trends-range="${id}">${l}</button>`).join('')}</div>
    </div>
    <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:16px">
      ${TREND_KEYS.map((k) => { const mm = models[k]; const on = sel === k; return `<button class="card" data-trends-metric="${k}" style="padding:10px 14px;min-width:128px;cursor:pointer;text-align:left;border:${on ? '1.5px solid var(--accent)' : '1px solid var(--line)'};background:${on ? 'var(--accent-soft)' : 'var(--surface)'};flex:0 0 auto">
        <div style="font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:4px">${esc(mm.label)}</div>
        <div style="display:flex;align-items:center;gap:6px"><span class="metric-val" style="font-size:16px">${mval(mm)}</span>${deltaPill(mm)}</div></button>`; }).join('')}
    </div>
    <div class="card raised" style="margin-bottom:18px">
      <div class="card-head"><div><div class="ttl" style="font-size:16px">${esc(m.label)}</div><div class="sub">Laatste ${days} dagen${m.baseline != null ? ` · baseline ${m.time ? hm(m.baseline) : fmtNum(m.baseline, m.dp || 0)}` : ''}</div></div>
        <div class="right" style="text-align:right"><div class="metric-val" style="font-size:30px">${mval(m)}${m.unit && !m.time ? `<span style="font-size:14px;color:var(--ink-3);margin-left:4px">${esc(m.unit)}</span>` : ''}</div><div style="margin-top:4px">${deltaPill(m)}</div></div>
      </div>
      ${m.empty ? `<div class="empty" style="padding:30px">Nog geen data voor ${esc(m.label)}</div>` : (m.chart === 'bar' ? barChart(data, dates, { height: 240, color: c }) : lineChart(data, dates, { height: 240, color: c, baseline: m.baseline, time: m.time, unit: m.unit, dp: m.dp }))}
      ${stats.length ? `<div class="cols-4" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">${stats.map(([l, v]) => `<div class="kpi"><span class="lab">${l}</span><span class="val metric-val">${v}</span></div>`).join('')}</div>` : ''}
    </div>
    ${sectionTitle('Verbanden in deze periode')}
    <div class="cols-3">${correlations.length ? correlations.map(correlationCard).join('') : `<div class="empty">Nog te weinig data voor verbanden</div>`}</div>
    ${sectionTitle('Mijlpalen')}
    <div class="card flush">${milestones.length ? `<table class="tbl"><thead><tr><th>Datum</th><th>Mijlpaal</th><th>Waarde</th></tr></thead><tbody>${milestones.map((x) => `<tr><td class="mono" style="color:var(--ink-3)">${esc(x.timestamp)}</td><td style="font-weight:600">${esc(x.title)}<div class="meta" style="font-size:11.5px">${esc(x.detail || '')}</div></td><td class="mono">${x.value == null ? '—' : fmtNum(x.value, 2).replace(/,00$/, '')}</td></tr>`).join('')}</tbody></table>` : `<div class="empty" style="border:none">Nog geen mijlpalen vastgelegd</div>`}</div>
  </div>`;
};

function correlationCard(co) {
  const strong = Math.abs(co.r);
  const dir = co.r >= 0 ? 'positief' : 'negatief';
  const c = dir === 'positief' ? 'var(--good)' : 'var(--risk)';
  const strength = strong >= 0.6 ? 'sterk' : strong >= 0.35 ? 'matig' : 'zwak';
  let s = 7; const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts = []; for (let i = 0; i < 26; i++) { const x = rng(); const noise = (rng() - 0.5) * (1 - strong); const y = dir === 'positief' ? x * strong + noise + 0.2 : (1 - x) * strong + noise + 0.1; pts.push([x * 10, y * 10]); }
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><span class="pill">${strength}</span><span class="metric-val" style="margin-left:auto;font-size:15px;color:${c}">r = ${co.r.toFixed(2).replace('.', ',')}</span></div>
    <div style="font-size:13.5px;font-weight:650;margin:8px 0 2px;line-height:1.3">${esc(humanMetric(co.a))} <span class="muted" style="font-weight:500">↔</span> ${esc(humanMetric(co.b))}</div>
    ${scatter(pts, 104, c)}
    <p class="meta" style="font-size:12px;margin:8px 0 0;line-height:1.45">${dir === 'positief' ? 'Bewegen samen op' : 'Bewegen tegengesteld'} <span class="muted">· n=${co.n}</span></p></div>`;
}
function scatter(points, height = 120, color = 'var(--accent)') {
  const W = 320; const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const [xlo, xhi] = niceExtent(xs, 0.1), [ylo, yhi] = niceExtent(ys, 0.1);
  const px = (v) => 8 + ((v - xlo) / (xhi - xlo)) * (W - 16), py = (v) => 6 + (1 - (v - ylo) / (yhi - ylo)) * (height - 18);
  const n = points.length, mx = mean(xs), my = mean(ys);
  let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = num / (den || 1), int = my - slope * mx;
  return `<svg class="chart-svg" height="${height}" viewBox="0 0 ${W} ${height}">
    <line x1="${px(xlo).toFixed(1)}" y1="${py(slope * xlo + int).toFixed(1)}" x2="${px(xhi).toFixed(1)}" y2="${py(slope * xhi + int).toFixed(1)}" stroke="${color}" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="4 4"/>
    ${points.map((p) => `<circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="3.2" fill="${color}" fill-opacity="0.55"/>`).join('')}</svg>`;
}

SCREENS.recovery = async () => {
  const [m, rec] = await Promise.all([getMetrics(['hrv', 'rhr', 'readiness', 'sleep', 'deep']), safe('/recovery/intelligence')]);
  let R = rec && typeof rec.capacity === 'number' ? Math.round(rec.capacity) : (m.readiness.current ?? 70);
  const fatigue = rec && typeof rec.fatigue === 'number' ? Math.round(rec.fatigue) : Math.round(100 - R);
  const sleepLast = m.sleep.series.at(-1) || 0, deepLast = m.deep.series.at(-1) || 0;
  const remLast = Math.max(0.5, sleepLast * 0.22);
  const lightLast = Math.max(0.5, sleepLast - deepLast - remLast);
  const stages = [{ label: 'Diep', value: deepLast, color: 'var(--accent)' }, { label: 'REM', value: remLast, color: 'var(--info)' }, { label: 'Licht', value: lightLast, color: 'var(--line-strong)' }];
  return `<div class="page wide stagger">
    <div class="split" style="margin-bottom:18px">
      <div class="card raised" style="display:flex;gap:22px;align-items:center">
        ${readinessGauge(R, 150)}
        <div style="flex:1"><div class="eyebrow" style="margin-bottom:6px">Herstelstatus</div>
          <p class="briefing" style="margin:0;font-size:15px">${rec && rec.insufficient_recovery ? 'Je systeem staat onder lichte druk. <span class="hl">HRV en rusthartslag bewegen samen de verkeerde kant op</span> — het klassieke teken van opbouwende vermoeidheid. Geef het 1–2 rustige dagen.' : 'Je herstel is op peil. De signalen bewegen binnen je normale bandbreedte — houd je ritme vast.'}</p>
          <div style="display:flex;gap:16px;margin-top:16px">
            <div class="kpi"><span class="lab">Vermoeidheid</span><span class="val metric-val" style="color:${fatigue >= 70 ? 'var(--warn)' : 'var(--ink)'}">${fatigue}<span style="font-size:12px">/100</span></span></div>
            <div class="kpi"><span class="lab">Hersteltrend</span><span class="val" style="font-size:15px">${deltaPill(m.readiness) || '—'}</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head" style="margin-bottom:12px"><div><div class="ttl">Slaaparchitectuur</div><div class="sub">Afgelopen nacht · ${hm(sleepLast)}</div></div></div>
        ${stackBar(stages, 12)}
        <div style="display:flex;gap:16px;margin-top:14px">${stages.map((s) => `<div style="display:flex;flex-direction:column;gap:3px"><span style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink-3);font-weight:600"><span class="sdot" style="background:${s.color}"></span>${s.label}</span><span class="metric-val" style="font-size:16px">${hm(s.value)}</span></div>`).join('')}</div>
        <p class="meta" style="font-size:12px;margin-top:14px;margin-bottom:0;line-height:1.45">Diepe slaap is bij de meeste mensen de grootste hefboom op herstel.</p>
      </div>
    </div>
    ${sectionTitle('Herstelsignalen · 45 dagen')}
    <div class="cols-2" style="margin-bottom:18px">${metricChartCard(m.hrv)}${metricChartCard(m.rhr)}</div>
    <div class="cols-2">${metricChartCard(m.readiness)}${metricChartCard(m.deep)}</div>
  </div>`;
};

SCREENS.training = async () => {
  const [m, ti] = await Promise.all([getMetrics(['volume', 'steps', 'vo2max']), safe('/training/intelligence')]);
  const weekVol = m.volume.series.length ? Math.round(mean(m.volume.series.slice(-7).filter((v) => v > 0)) || 0) : 0;
  const trainedDays = m.volume.series.slice(-28).filter((v) => v > 0).length;
  const adaptation = ti ? ti.adaptation : null;
  const warn = ti && (ti.overtraining || (ti.plateaus && ti.plateaus.length) || (ti.regression && ti.regression.length));
  const recs = (ti && ti.recommendations) || [];
  const sessions = m.volume.series.map((v, i) => ({ v, d: m.volume.dates[i] })).filter((s) => s.v > 0).slice(-8).reverse();
  return `<div class="page wide stagger">
    <div class="cols-4" style="margin-bottom:20px">
      ${kpiCard({ icon: 'training', label: 'Volume / week', value: fmtNum(weekVol, 0), unit: 'kg', pill: m.volume.empty ? '' : (m.volume.dir === 'up' ? 'stijgend' : 'stabiel') })}
      ${kpiCard({ icon: 'calendar', label: 'Frequentie', value: trainedDays, unit: '/28 dgn', sub: (trainedDays / 4).toFixed(1) + ' × per week' })}
      ${kpiCard({ icon: 'trends', label: 'VO₂max', value: mval(m.vo2max), unit: m.vo2max.empty ? '' : 'ml/kg/min', sub: 'cardio-fitheid' })}
      ${kpiCard({ icon: 'bolt', label: 'Adaptatie', value: adaptation === 'positive' ? 'Positief' : adaptation === 'limited_by_recovery' ? 'Beperkt' : 'Neutraal', status: adaptation === 'positive' ? 'good' : adaptation === 'limited_by_recovery' ? 'warn' : '' })}
    </div>
    ${warn ? `<div class="card" style="margin-bottom:18px;background:var(--warn-soft);border:1px solid color-mix(in srgb,var(--warn) 30%,transparent)"><div style="display:flex;gap:12px;align-items:flex-start"><span class="insight-ic warn">${icon('alert', 15)}</span><div><div style="font-weight:700;font-size:14px">${ti.overtraining ? 'Belasting hoog t.o.v. herstel' : ti.plateaus && ti.plateaus.length ? 'Progressie vlakt af' : 'Lichte terugval in volume'}</div><p style="margin:4px 0 0;font-size:13.5px;color:var(--ink-2);line-height:1.5">${esc(recs[0] || 'Overweeg een lichtere week en bescherm je herstel.')}</p></div></div></div>` : ''}
    <div class="cols-2" style="margin-bottom:18px">${metricChartCard(m.volume)}${metricChartCard(m.steps)}</div>
    ${sectionTitle('Recente trainingsdagen')}
    <div class="card flush">${sessions.length ? `<table class="tbl"><thead><tr><th>Datum</th><th>Volume</th></tr></thead><tbody>${sessions.map((s) => `<tr><td class="mono" style="color:var(--ink-3)">${fmtShort(s.d)}</td><td class="mono">${fmtNum(s.v, 0)} kg</td></tr>`).join('')}</tbody></table>` : `<div class="empty" style="border:none">Nog geen trainingsdata</div>`}</div>
  </div>`;
};

SCREENS.nutrition = async () => {
  const [m, sum, ni, dash] = await Promise.all([getMetrics(['kcal', 'protein', 'carbs', 'fat', 'weight']), safe('/nutrition/summary'), safe('/nutrition/intelligence'), safe('/dashboard')]);
  const mb = sum && sum.macro_balance || {};
  const kcal = m.kcal.current ?? mb.calories_avg ?? 0;
  const targets = { kcal: 2300, protein: 180, carbs: 230, fat: 70 };
  const macros = [
    { label: 'Eiwit', value: m.protein.current ?? mb.protein_g_avg ?? 0, target: targets.protein, unit: 'g', color: 'var(--accent)' },
    { label: 'Koolhydraten', value: m.carbs.current ?? mb.carbs_g_avg ?? 0, target: targets.carbs, unit: 'g', color: 'var(--info)' },
    { label: 'Vet', value: m.fat.current ?? mb.fat_g_avg ?? 0, target: targets.fat, unit: 'g', color: 'var(--warn)' },
  ];
  const adherence = dash && dash.summary && dash.summary.nutrition_consistency != null ? Math.round(dash.summary.nutrition_consistency) : null;
  const defs = (ni && ni.deficiencies) || [], exc = (ni && ni.excesses) || [];
  return `<div class="page wide stagger">
    <div class="split" style="margin-bottom:18px">
      <div class="card raised">
        <div class="card-head" style="margin-bottom:16px"><div><div class="ttl">Vandaag</div><div class="sub">Energie & macroverdeling</div></div>
          <div class="right" style="text-align:right"><div class="metric-val" style="font-size:28px">${fmtNum(kcal, 0)}<span style="font-size:13px;color:var(--ink-3)"> / ${targets.kcal} kcal</span></div></div></div>
        <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          ${ring(kcal, targets.kcal, { size: 130, stroke: 11, color: 'var(--accent)', label: Math.round(kcal / targets.kcal * 100) + '%', sub: 'van doel' })}
          <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:14px">${macros.map((mm) => `<div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="font-weight:600">${mm.label}</span><span class="mono" style="color:var(--ink-3)">${fmtNum(mm.value, 0)} / ${mm.target} ${mm.unit}</span></div><div class="track"><i style="width:${Math.min(100, mm.value / mm.target * 100)}%;background:${mm.color}"></i></div></div>`).join('')}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head" style="margin-bottom:14px"><div><div class="ttl">Consistentie</div><div class="sub">voedingsregelmaat</div></div></div>
        <div style="display:flex;align-items:center;gap:18px">${adherence != null ? ring(adherence, 100, { size: 104, stroke: 10, color: 'var(--good)', label: adherence + '%' }) : `<div class="empty" style="padding:20px">geen data</div>`}
          <div style="flex:1"><p style="font-size:13.5px;line-height:1.5;margin:0;color:var(--ink-2)">${adherence != null && adherence >= 70 ? 'Je voeding is een sterke, stabiele pijler.' : 'Meer regelmaat in je macro-inname vergroot het effect op herstel en lichaamssamenstelling.'}</p></div></div>
        <div class="divider" style="margin:16px 0"></div>
        <div style="display:flex;gap:8px;align-items:flex-start"><span class="insight-ic ${defs.length || exc.length ? 'warn' : 'good'}">${icon(defs.length || exc.length ? 'info' : 'check', 14)}</span><div><div style="font-size:13px;font-weight:650">${defs.length || exc.length ? `${defs.length + exc.length} aandachtspunt(en)` : 'Geen tekorten gedetecteerd'}</div><div class="meta">${[...defs.map((d) => 'tekort: ' + d), ...exc.map((e) => 'overschot: ' + e)].join(' · ') || 'Macro- en microbalans op orde.'}</div></div></div>
      </div>
    </div>
    ${sectionTitle('Trends · 45 dagen')}
    <div class="cols-2" style="margin-bottom:18px">${metricChartCard(m.protein)}${metricChartCard(m.kcal)}</div>
    <div class="card"><div class="card-head" style="margin-bottom:10px"><div><div class="ttl">Gewicht</div><div class="sub">90 dagen · vergeleken met je baseline</div></div><div class="right">${deltaPill(m.weight)}</div></div>
      ${m.weight.empty ? `<div class="empty" style="padding:24px">Nog geen gewichtsdata</div>` : lineChart(m.weight.series.slice(-90), m.weight.dates.slice(-90), { height: 170, color: 'var(--info)', baseline: m.weight.baseline, dp: 1, unit: 'kg' })}</div>
  </div>`;
};

SCREENS.health = async () => {
  const tabs = [['overzicht', 'Overzicht'], ['lab', 'Lab import']];
  const head = `<div class="seg" style="margin-bottom:18px">${tabs.map(([id, l]) => `<button class="${state.healthTab === id ? 'on' : ''}" data-health-tab="${id}">${l}</button>`).join('')}</div>`;
  if (state.healthTab === 'lab') return `<div class="page wide stagger">${head}${labPanel(await safe('/lab/results'))}</div>`;
  const [bio, blood, stress, mood, dashBody] = await Promise.all([safe('/biomarkers/dashboard'), safe('/bloodwork/overview'), safe('/stress/summary'), safe('/mood/dashboard'), safe('/body-composition/dashboard')]);
  const sc = bio && bio.scorecard || {};
  const abnormal = (bio && bio.abnormal) || [];
  const trends = (bio && bio.trends) || [];
  const lastDate = trends.length && trends[0].latest ? trends[0].latest.timestamp : null;
  return `<div class="page wide stagger">${head}
    <div class="card raised anim" style="margin-bottom:20px;display:flex;gap:14px;align-items:flex-start">
      <span class="insight-ic info" style="width:36px;height:36px">${icon('shield', 18)}</span>
      <div style="flex:1"><div class="eyebrow" style="margin-bottom:5px">Gezondheidscentrum</div>
        <p class="briefing" style="margin:0;font-size:15px">${trends.length ? `Je biomarker-score is <span class="hl">${sc.score != null ? sc.score + '%' : 'n.v.t.'}</span> binnen referentie.${lastDate ? ` Laatste meting: <b>${fmtShort(lastDate)}</b>.` : ''} ${abnormal.length ? `Aandachtspunten: <span class="hl">${abnormal.map((a) => humanMetric(a.metric)).join(', ')}</span>.` : 'Alle gemeten waarden vallen binnen hun referentiebereik.'}` : 'Nog geen biomarker-metingen. Importeer een laboratoriumrapport via het tabblad Lab import.'}</p>
      </div>
      <button class="btn primary" data-health-tab="lab" style="flex:0 0 auto">${icon('plus', 15)}Meting toevoegen</button>
    </div>
    ${abnormal.length ? sectionTitle('Aandachtspunten') + `<div class="cols-3" style="margin-bottom:22px">${abnormal.map((a) => biomarkerCard({ name: humanMetric(a.metric), value: a.value, unit: a.unit, status: a.status === 'high' || a.status === 'low' ? 'risk' : 'good', range: a.reference ? `${a.reference.optimal_low ?? a.reference.low}–${a.reference.optimal_high ?? a.reference.high}` : '', note: `${a.status === 'high' ? 'boven' : 'onder'} referentie` }, true)).join('')}</div>` : ''}
    ${trends.length ? sectionTitle('Biomarkers') + `<div class="cols-4" style="margin-bottom:22px">${trends.map((t) => biomarkerCard({ name: humanMetric(t.metric), value: t.latest ? t.latest.value : t.avg, unit: t.latest ? t.latest.unit : '', status: 'good', range: '', note: '' })).join('')}</div>` : ''}
    ${sectionTitle('Stress & stemming')}
    <div class="cols-2" style="margin-bottom:22px">
      <div class="card"><div class="card-head" style="margin-bottom:10px"><div><div class="ttl">Stress</div></div><div class="right metric-val" style="font-size:22px">${stress && stress.score != null ? Math.round(stress.score) : '—'}</div></div><p class="meta" style="margin:0">${stress && stress.alerts && stress.alerts.length ? 'Verhoogde stresssignalen t.o.v. recent herstel.' : 'Stresssignalen binnen normaal bereik.'}</p></div>
      <div class="card"><div class="card-head" style="margin-bottom:10px"><div><div class="ttl">Stemming</div></div><div class="right metric-val" style="font-size:22px">${mood && mood.score != null ? Math.round(mood.score) : '—'}</div></div><p class="meta" style="margin:0">${mood && mood.score != null ? 'Gemiddelde van stemming, energie en motivatie.' : 'Nog geen stemmingsdata gelogd.'}</p></div>
    </div>
    ${dashBody && dashBody.trends ? sectionTitle('Lichaamssamenstelling') + `<div class="cols-4" style="margin-bottom:24px">${dashBody.trends.slice(0, 4).map((t) => `<div class="card"><div style="font-size:12px;color:var(--ink-3);font-weight:600;margin-bottom:6px">${esc(humanMetric(t.metric))}</div><div class="metric-val" style="font-size:24px">${fmtNum(t.avg, 1)}</div><div class="meta" style="margin-top:4px">${t.direction === 'down' ? '▼' : t.direction === 'up' ? '▲' : '•'} ${t.n} metingen</div></div>`).join('')}</div>` : ''}
    ${sectionTitle('Toekomstige domeinen')}
    <div class="cols-3">${futurePanel('pulse', 'Symptomen', 'Log klachten en ernstscores; Health Core correleert ze met je herstel- en voedingsdata.')}${futurePanel('bolt', 'Continue glucose', 'Koppel een CGM om glucoserespons op voeding en training te volgen.')}${futurePanel('drop', 'Hormonen & micronutriënten', 'Breid je bloedpanelen uit voor een vollediger beeld over de jaren heen.')}</div>
  </div>`;
};
function biomarkerCard(b, highlight) {
  const c = b.status === 'risk' ? 'var(--risk)' : b.status === 'warn' ? 'var(--warn)' : 'var(--good)';
  return `<div class="card" ${highlight ? `style="border-color:color-mix(in srgb,${c} 35%,transparent)"` : ''}>
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">${sdot(b.status)}<span style="font-size:12.5px;font-weight:650">${esc(b.name)}</span></div>
    <div style="display:flex;align-items:baseline;gap:5px"><span class="metric-val" style="font-size:23px;color:${highlight ? c : 'var(--ink)'}">${fmtNum(b.value, 2).replace(/,00$/, '')}</span><span style="font-size:11.5px;color:var(--ink-3);font-weight:600">${esc(b.unit || '')}</span></div>
    ${b.range ? `<div class="meta" style="font-size:11;margin-top:5px">ref ${esc(b.range)}</div>` : ''}
    ${b.note && highlight ? `<div style="font-size:11.5px;color:var(--ink-2);margin-top:7px;line-height:1.4">${esc(b.note)}</div>` : ''}</div>`;
}
function labPanel(prior) {
  const sample = JSON.stringify({ lab_name: 'Mijn Lab', collected_at: (state.serverDate || new Date().toISOString().slice(0, 10)), panel: 'lipiden+metabool', report_id: '', results: [{ analyte: 'LDL-C', value: 3.1, unit: 'mmol/L' }, { analyte: 'ApoB', value: 0.9, unit: 'g/L' }, { analyte: 'Glucose', value: 95, unit: 'mg/dL' }, { analyte: 'HbA1c', value: 5.4, unit: '%' }] }, null, 2);
  const list = (prior && prior.results) || [];
  return `<h2 style="font-size:20px;font-weight:750;letter-spacing:-0.02em;margin:0 0 14px">Lab import & review</h2>
    <div class="card" style="margin-bottom:18px">
      <div class="cols-3" style="margin-bottom:12px">
        <label class="field">CSV-bestand<input id="lab-file" type="file" accept=".csv,text/csv,application/json" /></label>
        <label class="field">Reviewer<input id="lab-reviewer" value="local-reviewer" autocomplete="off" /></label>
        <label class="field">Approve-link<select id="lab-biomarker"><option value="">Kies biomarker</option></select></label>
      </div>
      <textarea id="lab-input" rows="11" spellcheck="false">${esc(sample)}</textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px"><button class="btn primary" data-lab-parse>${icon('beaker', 14)}Parse & review</button><button class="btn" data-lab-commit disabled>${icon('check', 14)}Vastleggen</button><span id="lab-msg" class="muted" style="font-size:12.5px"></span></div>
    </div>
    <div id="lab-review"></div>
    ${sectionTitle('Review queue')}
    <div class="card flush">${list.length ? `<table class="tbl"><thead><tr><th>Lab</th><th>Panel</th><th>Datum</th><th>Status</th><th>Kwaliteit</th><th>Acties</th></tr></thead><tbody>${list.map(labResultRow).join('')}</tbody></table>` : `<div class="empty" style="border:none">Nog geen rapporten vastgelegd</div>`}</div>`;
}
function labResultRow(r) {
  const qs = r.quality_status || 'not_ingested';
  return `<tr><td style="font-weight:600">${esc(r.lab_name || '')}<div class="meta mono" style="font-size:11px">#${esc(r.id)} ${r.report_id ? '· ' + esc(r.report_id) : ''}</div></td><td class="meta">${esc(r.panel || '')}</td><td class="mono">${esc(r.collected_at)}</td><td><span class="pill ${r.review_status === 'approved' ? 'good' : r.review_status === 'rejected' ? 'risk' : 'warn'}">${esc(r.review_status || 'pending')}</span>${r.biomarker_id ? `<div class="meta mono" style="font-size:11px">${esc(r.biomarker_id)}</div>` : ''}</td><td><span class="pill ${qs === 'accepted' ? 'good' : qs === 'partial' || qs === 'quarantined' ? 'warn' : ''}">${esc(qs)}</span>${r.quarantine_reason ? `<div class="meta" style="font-size:11px;max-width:260px">${esc(r.quarantine_reason)}</div>` : ''}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn mini" data-lab-review-id="${esc(r.id)}" data-lab-review-status="approved">${icon('check', 13)}OK</button><button class="btn mini" data-lab-review-id="${esc(r.id)}" data-lab-review-status="rejected">${icon('close', 13)}Afwijs</button></div></td></tr>`;
}
function labReview(p) {
  const rows = p.results.map((r) => `<div class="row labrow${r.committable ? '' : ' bad'}"><span>${esc(r.analyte)} <small class="muted">→ ${esc(r.metric)}</small>${r.converted_from ? ` <small class="muted">(${esc(r.converted_from)})</small>` : ''}${r.issues && r.issues.length ? `<br><small style="color:var(--warn)">${esc(r.issues.join('; '))}</small>` : ''}</span><span class="mono">${esc(String(r.value ?? '—'))} ${esc(r.unit || '')}</span><span class="pill tag-stat ${esc(r.status)}">${esc(r.status)}</span></div>`).join('');
  const unmapped = p.unmapped && p.unmapped.length ? `<div class="card"><div class="ttl" style="margin-bottom:8px">Niet gekoppeld</div>${p.unmapped.map((u) => `<div class="row"><span>${esc(u.analyte)}</span><span class="pill warn" style="margin-left:auto">overgeslagen</span></div>`).join('')}</div>` : '';
  return `<div class="cols-2" style="align-items:start;margin-top:16px"><div class="card"><div class="ttl" style="margin-bottom:8px">Review — ${esc(p.report.lab_name)} (${esc(p.report.collected_at)})</div>${rows}</div>${unmapped}</div>`;
}

SCREENS.experiments = async () => {
  const exp = await safe('/experiments/readiness');
  const experiments = (exp && exp.experiments) || [];
  const ready = (exp && exp.candidate_metrics || []).filter((x) => x.ready);
  const notReady = (exp && exp.candidate_metrics || []).filter((x) => !x.ready && x.n > 0).slice(0, 8);
  return `<div class="page stagger">
    <div class="card raised anim" style="margin-bottom:20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <span class="insight-ic good" style="width:36px;height:36px;background:var(--accent-soft);color:var(--accent)">${icon('beaker', 18)}</span>
      <div style="flex:1;min-width:220px"><div class="eyebrow" style="margin-bottom:5px">Experimenten</div><p class="briefing" style="margin:0;font-size:15px">Test gerichte hypotheses op jezelf. Health Core meet het effect tegen je baseline en schat de betrouwbaarheid in.</p></div>
      <button class="btn primary" disabled title="Binnenkort">${icon('plus', 15)}Nieuw experiment</button>
    </div>
    ${experiments.length ? `${sectionTitle('Experimenten')}<div class="grid cols-2" style="align-items:start">${experiments.map((x) => `<div class="card"><div style="font-size:15.5px;font-weight:700">${esc(x.hypothesis || 'Experiment')}</div><p class="meta" style="margin:6px 0 0">${esc(x.intervention || '')} · ${esc(x.status)}</p></div>`).join('')}</div>`
      : `<div class="card" style="margin-bottom:20px"><div style="display:flex;gap:12px;align-items:flex-start"><span class="insight-ic info">${icon('info', 15)}</span><div><div style="font-weight:650;font-size:13.5px">Nog geen experimenten gestart</div><p class="meta" style="margin:3px 0 0;line-height:1.5">Een experiment vergelijkt een interventie-periode met je baseline. Metrics met genoeg historie zijn klaar om te testen.</p></div></div></div>`}
    ${ready.length ? sectionTitle(`Klaar om te testen · ${ready.length}`) + `<div class="cols-3" style="margin-bottom:20px">${ready.map((x) => `<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="sdot good"></span><span style="font-size:13.5px;font-weight:650">${esc(x.display_name || humanMetric(x.key))}</span></div><div class="metric-val" style="font-size:20px">${x.n}</div><div class="meta" style="margin-top:3px">datapunten · genoeg voor baseline/test</div></div>`).join('')}</div>` : ''}
    ${notReady.length ? sectionTitle('Meer data nodig') + `<div class="card flush"><table class="tbl"><thead><tr><th>Metric</th><th>Datapunten</th><th>Status</th></tr></thead><tbody>${notReady.map((x) => `<tr><td style="font-weight:600">${esc(x.display_name || humanMetric(x.key))}</td><td class="mono">${x.n}</td><td><span class="pill warn">< 14</span></td></tr>`).join('')}</tbody></table></div>` : ''}
  </div>`;
};

const REPORTS = [['daily', 'Dagelijks', 'today'], ['weekly', 'Wekelijks', 'calendar'], ['monthly', 'Maandelijks', 'calendar'], ['quarterly', 'Kwartaal', 'doc'], ['yearly', 'Jaaroverzicht', 'shield']];
SCREENS.reports = async () => {
  const briefs = await Promise.all(REPORTS.map(([p]) => safe('/briefing/' + p)));
  return `<div class="page stagger">
    <div class="card raised anim" style="margin-bottom:20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <span class="insight-ic info" style="width:36px;height:36px">${icon('doc', 18)}</span>
      <div style="flex:1;min-width:220px"><div class="eyebrow" style="margin-bottom:5px">Rapporten</div><p class="briefing" style="margin:0;font-size:15px">Professionele samenvattingen van je gezondheid — voor jezelf, je coach of je arts. Niet een export, maar een verhaal.</p></div>
    </div>
    <div class="grid cols-2" style="align-items:start">
      ${REPORTS.map(([p, label, ic], i) => { const b = briefs[i]; const alerts = b && b.alerts ? b.alerts.length : 0; return `<button class="card" data-open-report="${p}" style="text-align:left;cursor:pointer;font-family:inherit;display:flex;gap:14px;align-items:flex-start">
        <span class="report-thumb">${icon(ic, 20)}</span>
        <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="pill">${label}</span><span class="pill ${alerts ? 'warn' : 'good'}" style="margin-left:auto">${alerts ? alerts + ' signalen' : 'rustig'}</span></div>
        <div style="font-size:15.5px;font-weight:700;letter-spacing:-0.01em">${esc(label)} rapport</div>
        <p style="font-size:13px;color:var(--ink-2);margin:8px 0 0;line-height:1.45">${b ? esc(briefSummaryLine(b)) : 'Niet beschikbaar.'}</p></div></button>`; }).join('')}
    </div>
  </div>`;
};
function briefSummaryLine(b) {
  const s = b.summary || {};
  const parts = [];
  if (s.recovery != null) parts.push('herstel ' + Math.round(s.recovery));
  if (s.training_load != null) parts.push('belasting ' + Math.round(s.training_load));
  if (s.nutrition_consistency != null) parts.push('voeding ' + Math.round(s.nutrition_consistency));
  return parts.length ? 'Samengevat: ' + parts.join(' · ') + '.' : 'Samenvatting van je signalen over deze periode.';
}

SCREENS.datacore = async () => {
  const [metrics, sources, stats, integ] = await Promise.all([safe('/metrics'), safe('/sources'), safe('/stats'), safe('/integrity')]);
  const mlist = (metrics && metrics.metrics) || [];
  const slist = (sources && sources.sources) || [];
  const st = (stats && stats.stats) || [];
  const totalPts = st.reduce((s, x) => s + (x.count || 0), 0);
  const statByMetric = Object.fromEntries(st.map((x) => [x.metric_type, x]));
  const integOk = integ ? integ.ok : null;
  return `<div class="page wide stagger">
    <div class="cols-4" style="margin-bottom:20px">
      ${kpiCard({ icon: 'datacore', label: 'Metrieken', value: mlist.length, sub: 'in registry' })}
      ${kpiCard({ icon: 'link', label: 'Bronnen', value: slist.length, sub: 'geconfigureerd' })}
      ${kpiCard({ icon: 'clock', label: 'Datapunten', value: totalPts >= 1000 ? (totalPts / 1000).toFixed(1) + 'k' : totalPts, sub: 'observaties' })}
      ${kpiCard({ icon: 'shield', label: 'Integriteit', value: integOk == null ? '—' : integOk ? 'OK' : 'Let op', status: integOk ? 'good' : 'warn', sub: integ ? `${integ.passed}/${integ.passed + integ.failed} checks` : '' })}
    </div>
    ${sectionTitle('Bronnen')}
    <div class="cols-3" style="margin-bottom:22px">${slist.map((s) => `<div class="card" style="display:flex;align-items:center;gap:12px"><span style="width:34px;height:34px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:0 0 auto">${icon('link', 16)}</span><div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:650">${esc(s.name)}</div><div class="meta" style="font-size:11.5px">${esc(s.kind)}</div></div></div>`).join('')}</div>
    ${sectionTitle('Metric registry')}
    <div class="card flush" style="margin-bottom:22px"><table class="tbl"><thead><tr><th>Metric</th><th>Eenheid</th><th>Soort</th><th>Status</th><th>Datapunten</th></tr></thead><tbody>
      ${mlist.map((m) => { const s = statByMetric[m.key]; return `<tr><td style="font-weight:600">${esc(m.display_name || m.key)}<div class="meta mono" style="font-size:11">${esc(m.key)}</div></td><td class="mono" style="color:var(--ink-3)">${esc(m.unit)}</td><td><span class="pill ${m.key.startsWith('score.') || m.key.startsWith('baseline.') ? 'accent' : ''}">${m.key.startsWith('score.') || m.key.startsWith('baseline.') ? 'Afgeleid' : 'Observatie'}</span></td><td><span class="pill ${m.status === 'active' ? 'good' : ''}">${esc(m.status)}</span></td><td class="mono" style="color:var(--ink-3)">${s ? s.count : 0}</td></tr>`; }).join('')}
    </tbody></table></div>
    ${integ && integ.checks ? sectionTitle('Integriteitscontroles') + `<div class="card"><div class="grid" style="gap:0">${integ.checks.map((c) => `<div class="row"><span class="lead">${sdot(c.ok ? 'good' : 'risk')}<span><span class="nm" style="display:block">${esc(c.name.replace(/_/g, ' '))}</span><span class="meta">${esc(c.detail)}</span></span></span></div>`).join('')}</div></div>` : ''}
  </div>`;
};

SCREENS.settings = async () => {
  const status = await safe('/product/status');
  const accents = ['#3f6b5e', '#4a6585', '#a8503e', '#6b5e8c', '#9c6a2f'];
  return `<div class="page stagger">
    <div class="card raised" style="margin-bottom:18px;display:flex;gap:16px;align-items:center">
      <span class="avatar" style="width:56px;height:56px;font-size:19px">HC</span>
      <div style="flex:1"><div style="font-size:18px;font-weight:700">Health Core gebruiker</div><div class="meta">Persoonlijk Health OS · ${status ? status.counts.observations : 0} observaties · ${status ? status.goals.completed : 0} doelen</div></div>
    </div>
    ${sectionTitle('Weergave')}
    <div class="card" style="margin-bottom:18px">
      <div class="row"><span class="lead"><span class="insight-ic info" style="background:var(--surface-2);color:var(--ink-2)">${icon('moon', 15)}</span><span><span class="nm" style="display:block">Thema</span><span class="meta">Licht of donker</span></span></span><span style="margin-left:auto"><span class="seg">${[['light', 'Licht'], ['dark', 'Donker']].map(([v, l]) => `<button class="${state.theme === v ? 'on' : ''}" data-set-theme="${v}">${l}</button>`).join('')}</span></span></div>
      <div class="row"><span class="lead"><span class="insight-ic info" style="background:var(--surface-2);color:var(--ink-2)">${icon('spark', 15)}</span><span><span class="nm" style="display:block">Accentkleur</span><span class="meta">Persoonlijke tint</span></span></span><span style="margin-left:auto;display:flex;gap:8px">${accents.map((a) => `<button class="swatch ${state.accent === a ? 'on' : ''}" data-set-accent="${a}" style="background:${a}"></button>`).join('')}</span></div>
      <div class="row"><span class="lead"><span class="insight-ic info" style="background:var(--surface-2);color:var(--ink-2)">${icon('scale', 15)}</span><span><span class="nm" style="display:block">Dichtheid</span><span class="meta">Compact of ruim</span></span></span><span style="margin-left:auto"><span class="seg">${[['compact', 'Compact'], ['regular', 'Normaal'], ['comfy', 'Ruim']].map(([v, l]) => `<button class="${state.density === v ? 'on' : ''}" data-set-density="${v}">${l}</button>`).join('')}</span></span></div>
      <div class="row"><span class="lead"><span class="insight-ic info" style="background:var(--surface-2);color:var(--ink-2)">${icon('today', 15)}</span><span><span class="nm" style="display:block">Lettertype</span><span class="meta">Humanist sans</span></span></span><span style="margin-left:auto"><span class="seg">${['Hanken Grotesk', 'Figtree', 'Onest'].map((f) => `<button class="${state.font === f ? 'on' : ''}" data-set-font="${f}">${f.split(' ')[0]}</button>`).join('')}</span></span></div>
    </div>
    ${sectionTitle('Privacy & data')}
    <div class="card" style="margin-bottom:18px">
      <div style="display:flex;gap:12px;align-items:flex-start;padding:4px 4px 16px;border-bottom:1px solid var(--line);margin-bottom:4px"><span class="insight-ic good">${icon('shield', 15)}</span><div><div style="font-weight:650;font-size:13.5px">Volledig lokaal & self-hosted</div><p class="meta" style="margin:3px 0 0;line-height:1.5;font-size:12.5px">Al je gegevens blijven op je eigen apparaat/tailnet. Geen cloud, geen tracking, geen advertenties. Eén gebruiker.</p></div></div>
      <div class="row"><span class="lead"><span class="insight-ic info" style="background:var(--surface-2);color:var(--ink-2)">${icon('datacore', 15)}</span><span><span class="nm" style="display:block">Data Core</span><span class="meta">observaties, bronnen, integriteit</span></span></span><button class="btn sm" data-nav="datacore" style="margin-left:auto">Bekijk ${icon('chevR', 13)}</button></div>
    </div>
    ${sectionTitle('Over')}
    <div class="card" style="display:flex;align-items:center;gap:14px"><span class="brand-mark" style="width:40px;height:40px">${icon('pulse', 18)}</span><div><div style="font-weight:700">Health Core</div><div class="meta">Persoonlijk Health OS · v1.0</div></div></div>
  </div>`;
};

// ============================================================ SHELL + RENDER
function renderShell() {
  applyTheme();
  const navHtml = NAV.map((g) => `<div><div class="nav-group-label">${g.group}</div>${g.items.map((it) => {
    const active = state.route === it.id;
    const count = it.count ? it.count() : 0;
    return `<button class="nav-item ${active ? 'active' : ''}" data-nav="${it.id}">${icon(it.icon, 17, 'ic')}<span>${it.label}</span>${count > 0 ? `<span class="count">${count}</span>` : (it.dot && it.dot() && !active ? '<span class="dot"></span>' : '')}</button>`;
  }).join('')}</div>`).join('');
  const bottomHtml = BOTTOM.map((id) => { const it = ALL_ITEMS.find((x) => x.id === id); return `<button class="bn-item ${state.route === id ? 'active' : ''}" data-nav="${id}">${icon(it.icon, 22, 'ic')}<span>${it.label}</span>${it.dot && it.dot() && state.route !== id ? '<span class="nd"></span>' : ''}</button>`; }).join('')
    + `<button class="bn-item ${!BOTTOM.includes(state.route) ? 'active' : ''}" data-more>${icon('more', 22, 'ic')}<span>Meer</span></button>`;

  document.getElementById('app').innerHTML = `<div class="app">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">${icon('pulse', 17)}</span><div><div class="brand-name">Health Core</div><div class="brand-sub">Health OS</div></div></div>
      <div class="sidebar-scroll">${navHtml}</div>
      <div class="sidebar-foot">
        <button class="nav-item" data-theme-toggle>${icon(state.theme === 'dark' ? 'sun' : 'moon', 17, 'ic')}<span>${state.theme === 'dark' ? 'Licht thema' : 'Donker thema'}</span></button>
        <button class="user-chip" data-nav="settings"><span class="avatar">HC</span><div><div class="nm">Health Core</div><div class="sb">lokaal · privacy-first</div></div></button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar"><h1>${TITLES[state.route] || ''}</h1><span class="crumb">· ${fmtToday()}</span>
        <div class="topbar-actions"><button class="icon-btn" title="Zoeken">${icon('search', 17)}</button><button class="icon-btn" title="Meldingen">${icon('bell', 17)}<span style="position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:99px;background:var(--risk)"></span></button><button class="btn primary sm" data-nav="insights">${icon('spark', 14)}Briefing</button></div>
      </header>
      <div class="mobile-top"><span class="brand-mark" style="width:30px;height:30px">${icon('pulse', 15)}</span><h1>${TITLES[state.route] || ''}</h1><div class="mt-actions"><button class="icon-btn" data-theme-toggle>${icon(state.theme === 'dark' ? 'sun' : 'moon', 16)}</button></div></div>
      <div class="scroll" id="scroll"><div id="screen">${loading()}</div></div>
    </div>
    <nav class="bottom-nav">${bottomHtml}</nav>
  </div>`;
}

let renderToken = 0;
async function renderScreen() {
  const token = ++renderToken;
  const fn = SCREENS[state.route] || SCREENS.today;
  let html;
  try { html = await fn(); } catch (e) { html = errorPage(e.message); }
  if (token !== renderToken) return; // a newer navigation superseded this
  const el = document.getElementById('screen');
  if (el) { el.innerHTML = html; const sc = document.getElementById('scroll'); if (sc) sc.scrollTop = 0; }
}

function nav(route, opts = {}) {
  if (!SCREENS[route]) route = 'today';
  state.route = route;
  if (opts.metric) state.metric = opts.metric;
  localStorage.setItem('hc-route', route);
  if (location.hash.slice(1) !== route) location.hash = route; // keep URL in sync (fires hashchange; ignored as equal)
  closeSheet();
  renderShell();
  renderScreen();
}
window.addEventListener('hashchange', () => {
  const r = location.hash.slice(1);
  if (r && r !== state.route && SCREENS[r]) nav(r);
});

// ============================================================ SHEETS
function openSheet(html, title) {
  closeSheet();
  const back = document.createElement('div');
  back.className = 'sheet-backdrop'; back.id = 'sheet';
  back.innerHTML = `<div class="sheet"><div class="sheet-grab"></div>${title ? `<div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close-sheet style="margin-left:auto">${icon('close', 16)}</button></div>` : ''}<div class="sheet-body">${html}</div></div>`;
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  document.body.appendChild(back);
}
function closeSheet() { const s = document.getElementById('sheet'); if (s) s.remove(); }

function insightDetail(ins) {
  return `<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px"><span class="eyebrow">${esc(ins.domain)}</span><span class="pill ${ins.status}">${esc(ins.impact)} impact</span>${ins.confidence != null ? `<span class="pill">Betrouwbaarheid ${ins.confidence}%</span>` : ''}</div>
    <h2 style="font-size:22px;font-weight:750;letter-spacing:-0.02em;line-height:1.2;margin:0 0 16px">${esc(ins.title)}</h2>
    <div class="briefing" style="display:flex;flex-direction:column;gap:14px"><p style="margin:0">${esc(ins.brief)}</p></div>
    ${ins.evidence.length ? sectionTitle('Bewijsmateriaal') + `<div class="cols-2" style="margin-bottom:18px">${ins.evidence.map((e) => `<div class="card" style="padding:14px;display:flex;flex-direction:column;gap:3px"><span class="metric-val" style="font-size:22px">${esc(e.v)}</span><span style="font-size:12.5px;font-weight:600">${esc(e.k)}</span></div>`).join('')}</div>` : ''}
    <div class="card" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><div class="kpi" style="flex:1;min-width:120px"><span class="lab">Betrouwbaarheid</span>${confidence(ins.confidence)}</div><div style="display:flex;gap:8px"><button class="btn" data-close-sheet>${icon('check', 15)}Erken</button></div></div>`;
}
async function reportPreview(period) {
  const label = (REPORTS.find((r) => r[0] === period) || [period, period])[1];
  const b = await safe('/briefing/' + period);
  const s = (b && b.summary) || {};
  const kpis = [['Herstel', s.recovery != null ? Math.round(s.recovery) : '—'], ['Belasting', s.training_load != null ? Math.round(s.training_load) : '—'], ['Voeding', s.nutrition_consistency != null ? Math.round(s.nutrition_consistency) : '—'], ['Signalen', b && b.alerts ? b.alerts.length : 0]];
  const decisions = (b && b.decisions) || [];
  return `<div class="report-cover"><div><div class="eyebrow" style="color:rgba(255,255,255,0.7)">${esc(label)}rapport</div><h1 style="font-size:27px;font-weight:750;letter-spacing:-0.02em;margin:10px 0 0;color:#fff;line-height:1.15">Health Core ${esc(label)}</h1><div style="margin-top:16px;font-size:13px;color:rgba(255,255,255,0.8)">${b ? esc(b.generated_at ? b.generated_at.slice(0, 10) : '') : ''}</div></div><span class="brand-mark" style="width:38px;height:38px">${icon('pulse', 18)}</span></div>
    <div style="padding:20px 2px 0"><h3 style="font-size:14px;font-weight:700;margin:0 0 8px">Samenvatting</h3><p class="briefing" style="font-size:14.5px;margin:0 0 18px">${b ? esc(briefSummaryLine(b)) : 'Niet beschikbaar.'} Dit rapport bundelt je belangrijkste signalen over de periode en plaatst ze tegen je persoonlijke baselines.</p>
      <div class="cols-4" style="margin-bottom:20px">${kpis.map(([l, v]) => `<div class="card" style="padding:13px"><span class="lab" style="font-size:11px;color:var(--ink-3);font-weight:600">${l}</span><div class="metric-val" style="font-size:19px;margin-top:4px">${v}</div></div>`).join('')}</div>
      ${decisions.length ? `<h3 style="font-size:14px;font-weight:700;margin:0 0 8px">Kernpunten</h3><ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:9px">${decisions.map((d) => `<li style="font-size:13.5px;line-height:1.5;color:var(--ink-2)">${esc(d.message || '')}</li>`).join('')}</ol>` : '<p class="muted">Geen specifieke aandachtspunten in deze periode.</p>'}
      ${b && b.disclaimer ? `<p class="meta" style="font-size:11.5px;margin-top:18px;line-height:1.5">${esc(b.disclaimer)}</p>` : ''}
    </div>`;
}
function moreSheet() {
  const items = ALL_ITEMS.filter((i) => !BOTTOM.includes(i.id));
  return `<div class="more-sheet-grid">${items.map((it) => `<button class="more-tile" data-nav="${it.id}">${icon(it.icon, 22, 'ic')}<span>${it.label}</span></button>`).join('')}</div>
    <div class="divider" style="margin:18px 0 14px"></div>
    <button class="more-tile" data-theme-toggle style="flex-direction:row;justify-content:center;gap:10px">${icon(state.theme === 'dark' ? 'sun' : 'moon', 18, 'ic')}<span>${state.theme === 'dark' ? 'Licht thema' : 'Donker thema'}</span></button>`;
}

// ============================================================ LAB wiring
async function labPayload() {
  const input = document.getElementById('lab-input');
  const file = document.getElementById('lab-file')?.files?.[0];
  if (!file) return JSON.parse(input.value);
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) return JSON.parse(text);
  const base = JSON.parse(input.value || '{}');
  return { ...base, file_content: text, filename: file.name };
}
async function labLoadBiomarkers() {
  const sel = document.getElementById('lab-biomarker');
  if (!sel || sel.dataset.loaded) return;
  const reg = await safe('/biomarkers/registry');
  const rows = reg && reg.biomarkers || [];
  sel.insertAdjacentHTML('beforeend', rows.map((b) => `<option value="${esc(b.metric_key)}">${esc(humanMetric(b.metric_key))}</option>`).join(''));
  sel.dataset.loaded = '1';
}
async function labParse() {
  const input = document.getElementById('lab-input'); const msg = document.getElementById('lab-msg'); const review = document.getElementById('lab-review'); const commit = document.querySelector('[data-lab-commit]');
  let payload; try { payload = await labPayload(); } catch (e) { msg.textContent = 'Ongeldige invoer: ' + e.message; commit.disabled = true; return; }
  try { const p = await postJSON('/lab/import', payload); review.innerHTML = labReview(p); msg.textContent = `${p.summary.committable}/${p.summary.mapped} vastlegbaar · ${p.summary.abnormal} afwijkend · ${p.summary.unmapped} ongekoppeld`; commit.disabled = p.summary.committable === 0; }
  catch (e) { msg.textContent = 'Parse mislukt: ' + e.message; commit.disabled = true; }
}
async function labCommit() {
  const input = document.getElementById('lab-input'); const msg = document.getElementById('lab-msg');
  let payload; try { payload = await labPayload(); } catch { msg.textContent = 'Ongeldige invoer'; return; }
  try { const c = await postJSON('/lab/commit', payload); msg.textContent = `Vastgelegd: ${c.committed} observatie(s) → rapport #${c.lab_result_id} · kwaliteit ${c.quality.status}`; document.querySelector('[data-lab-commit]').disabled = true; cache.delete('/lab/results'); renderScreen(); }
  catch (e) { msg.textContent = 'Vastleggen mislukt: ' + e.message; }
}
async function labReviewAction(id, status) {
  const msg = document.getElementById('lab-msg');
  const biomarker = document.getElementById('lab-biomarker')?.value || '';
  const reviewer = document.getElementById('lab-reviewer')?.value || 'local-reviewer';
  try {
    await patchJSON(`/lab/results/${id}`, { review_status: status, reviewer_id: reviewer, biomarker_id: status === 'approved' ? biomarker : null });
    cache.delete('/lab/results');
    renderScreen();
  } catch (e) {
    if (msg) msg.textContent = 'Review mislukt: ' + e.message;
  }
}

async function todayRecommendationAction(button) {
  const status = button.dataset.recAction;
  const recKey = button.dataset.recKey;
  const card = button.closest('.today-rec');
  const msg = card?.querySelector('.today-rec-msg');
  if (!status || !recKey) return;
  const payload = { status };
  if (status === 'snoozed') payload.snooze_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  button.disabled = true;
  if (msg) msg.textContent = 'Actie opslaan...';
  try {
    await postJSON(`/recommendations/${recKey}/action`, payload);
    cache.delete('/operating-system');
    cache.delete('/health-goals');
    if (card) card.remove();
    const list = document.getElementById('today-rec-list');
    const count = document.getElementById('today-rec-count');
    const remaining = list ? list.querySelectorAll('.today-rec').length : 0;
    if (count) {
      count.textContent = String(remaining);
      count.className = `pill ${remaining ? 'warn' : 'good'}`;
    }
    if (list && remaining === 0) list.innerHTML = todayEmpty('check', 'Geen open aanbevelingen', 'Alles wat afgehandeld, gesnoozed of dismissed is blijft uit deze actieve lijst.');
  } catch (e) {
    button.disabled = false;
    if (msg) msg.textContent = 'Actie mislukt: ' + e.message;
  }
}

async function trackMetricChanged() {
  const sel = document.getElementById('track-metric');
  const unit = document.getElementById('track-unit');
  if (!sel || !unit) return;
  state.trackMetric = sel.value;
  localStorage.setItem('hc-track-metric', state.trackMetric);
  unit.value = sel.selectedOptions[0]?.dataset.unit || '';
}
async function trackSubmit() {
  const metric = document.getElementById('track-metric')?.value || '';
  const date = document.getElementById('track-date')?.value || amsterdamDate();
  const valueRaw = document.getElementById('track-value')?.value;
  const unit = document.getElementById('track-unit')?.value || '';
  const note = document.getElementById('track-note')?.value || '';
  const msg = document.getElementById('track-msg');
  const value = Number(valueRaw);
  state.trackMetric = metric;
  state.trackDate = date;
  localStorage.setItem('hc-track-metric', metric);

  if (!metric || !date || !Number.isFinite(value)) {
    if (msg) msg.textContent = 'Vul metric, datum en een numerieke waarde in.';
    return;
  }

  try {
    const existing = await getJSON(`/observations?metric=${encodeURIComponent(metric)}&from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}&source=manual&limit=5`, { fresh: true });
    const row = existing && existing.rows && existing.rows[0];
    if (row && !window.confirm(`Er bestaat al een handmatige waarde voor ${humanMetric(metric)} op ${date}: ${fmtNum(row.value, 2).replace(/,00$/, '')} ${row.unit || ''}. Overschrijven?`)) {
      if (msg) msg.textContent = 'Correctie geannuleerd.';
      return;
    }

    const now = new Date().toISOString();
    const externalId = row?.external_id || `ui:${metric}:${date}`;
    const out = await postJSON('/ingest', {
      source: 'manual',
      records: [{
        metric_type: metric,
        value,
        unit,
        timestamp: date,
        external_id: externalId,
        source_updated_at: now,
        metadata: { note, ui: 'track' }
      }]
    });
    invalidateAfterTrack(metric);
    state.trackResult = {
      ok: out.records_written > 0 && out.records_quarantined === 0,
      title: out.records_quarantined ? 'Invoer in quarantaine' : row ? 'Waarde gecorrigeerd' : 'Waarde opgeslagen',
      message: `Ingest #${out.ingest_id}: ${out.records_written} geschreven, ${out.records_quarantined} quarantaine`,
      detail: `${humanMetric(metric)} · ${fmtNum(value, 2).replace(/,00$/, '')} ${unit || ''} · ${date}`
    };
    renderScreen();
  } catch (e) {
    state.trackResult = { ok: false, title: 'Opslaan mislukt', message: 'Opslaan mislukt: ' + e.message, detail: e.message };
    renderScreen();
  }
}
function invalidateAfterTrack(metric) {
  cache.delete('/observations/latest');
  cache.delete('/platform/home');
  cache.delete('/insights');
  cache.delete('/risks');
  cache.delete('/dashboard');
  cache.delete('/product/status');
  cache.delete('/track/schema');
  cache.delete(`/series/${metric}?bucket=day`);
  metricCache.clear();
}

// ============================================================ EVENT DELEGATION
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-nav],[data-theme-toggle],[data-open-insight],[data-insights-filter],[data-trends-range],[data-trends-metric],[data-exp-tab],[data-health-tab],[data-more],[data-close-sheet],[data-open-report],[data-set-theme],[data-set-accent],[data-set-density],[data-set-font],[data-lab-parse],[data-lab-commit],[data-lab-review-id],[data-track-submit],[data-rec-action]');
  if (!t) return;
  if (t.dataset.nav != null) return nav(t.dataset.nav, { metric: t.dataset.metric });
  if (t.dataset.themeToggle != null) return setTheme(state.theme === 'dark' ? 'light' : 'dark');
  if (t.dataset.openInsight != null) { const ins = state.insights.find((i) => i.id === t.dataset.openInsight); if (ins) openSheet(insightDetail(ins)); return; }
  if (t.dataset.insightsFilter != null) { state.insightsFilter = t.dataset.insightsFilter; return renderScreen(); }
  if (t.dataset.trendsRange != null) { state.trendsRange = t.dataset.trendsRange; return renderScreen(); }
  if (t.dataset.trendsMetric != null) { state.metric = t.dataset.trendsMetric; return renderScreen(); }
  if (t.dataset.expTab != null) { state.expTab = t.dataset.expTab; return renderScreen(); }
  if (t.dataset.healthTab != null) { state.healthTab = t.dataset.healthTab; return renderScreen(); }
  if (t.dataset.more != null) return openSheet(moreSheet(), 'Alle secties');
  if (t.dataset.closeSheet != null) return closeSheet();
  if (t.dataset.openReport != null) { openSheet('<div class="empty">Rapport laden…</div>'); reportPreview(t.dataset.openReport).then((h) => { const s = document.querySelector('#sheet .sheet-body'); if (s) s.innerHTML = h; }); return; }
  if (t.dataset.setTheme != null) return setTheme(t.dataset.setTheme);
  if (t.dataset.setAccent != null) { state.accent = t.dataset.setAccent; localStorage.setItem('hc-accent', state.accent); applyTheme(); return renderScreen(); }
  if (t.dataset.setDensity != null) { state.density = t.dataset.setDensity; localStorage.setItem('hc-density', state.density); applyTheme(); return renderScreen(); }
  if (t.dataset.setFont != null) { state.font = t.dataset.setFont; localStorage.setItem('hc-font', state.font); applyTheme(); return renderScreen(); }
  if (t.dataset.labParse != null) return labParse();
  if (t.dataset.labCommit != null) return labCommit();
  if (t.dataset.labReviewId != null) return labReviewAction(t.dataset.labReviewId, t.dataset.labReviewStatus);
  if (t.dataset.trackSubmit != null) return trackSubmit();
  if (t.dataset.recAction != null) return todayRecommendationAction(t);
});
document.addEventListener('focusin', (e) => { if (e.target && e.target.id === 'lab-biomarker') labLoadBiomarkers(); });
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'track-metric') trackMetricChanged(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ============================================================ INIT
async function init() {
  const hashRoute = location.hash.slice(1);
  if (hashRoute && SCREENS[hashRoute]) state.route = hashRoute;
  if (!SCREENS[state.route]) state.route = 'today';
  applyTheme();
  renderShell();
  renderScreen();
  // nav meta (best-effort, refreshes badges)
  try {
    const [ins, exp, rec] = await Promise.all([safe('/insights'), safe('/experiments/readiness'), safe('/recovery/intelligence')]);
    state.counts.insights = (ins && ins.insights || []).length;
    state.counts.experiments = (exp && exp.experiments || []).filter((x) => x.status === 'running').length;
    state.recoveryDot = !!(rec && rec.insufficient_recovery);
    // refresh shell badges without discarding the already-rendered screen
    const cur = document.getElementById('screen');
    const keep = cur ? cur.innerHTML : '';
    renderShell();
    const ne = document.getElementById('screen');
    if (ne && keep) ne.innerHTML = keep;
  } catch {}
}
init();
