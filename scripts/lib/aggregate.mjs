// ────────────────────────────────────────────────────────────────────────────
// CANONICAL aggregation logic for the Health Core.
//
// These pure functions mirror the Shred Tracker client formulas exactly so that
// backfill (this dir) and the live dual-write (shred/api/core.js) produce
// byte-identical observations and therefore collide on the same UNIQUE key
// (last-write-wins upsert, never a duplicate).
//
// IF YOU CHANGE A FORMULA HERE, mirror it in shred/api/core.js (it cannot import
// this file — the api image only builds its own ./api dir).
//
// Source of truth for the mirrored formulas:
//   - dayToDate        ↔ js/helpers.js     dateForDay(n)
//   - nutritionTotals  ↔ js/nutrition.js   macrosFor() + dayTotals()
//   - setsVolume       ↔ js/helpers.js     volumeTrend() vol()
// ────────────────────────────────────────────────────────────────────────────

// Meal-slot keys, mirrors emptyDay() in js/nutrition.js. The order is irrelevant
// to the sum but kept identical for clarity.
export const CATEGORY_KEYS = ['ontbijt', 'lunch', 'snack', 'diner'];

// Round aggregate values to 2 decimals. Deterministic and shared by both write
// paths so the same inputs always yield the same stored REAL.
export function round2(x) {
  return Math.round((Number(x) || 0) * 100) / 100;
}

// Epoch-ms (the shred.db updated_at unit) → ISO-8601 UTC string. Stored in
// observations.source_updated_at (TEXT); ISO strings sort lexicographically ==
// chronologically, so the LWW comparison in the conflict clause is correct.
export function epochToIso(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}

// Program day-index → calendar date 'YYYY-MM-DD'.
// Mirrors helpers.js dateForDay(n): startDate + (n-1) days. UTC arithmetic
// avoids DST/timezone drift; the result equals the local calendar day the
// client intends (the client stores whole-day indices, no intra-day time).
export function dayToDate(startDate, dayN) {
  const [y, m, d] = String(startDate).split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return new Date(base + (Number(dayN) - 1) * 86400000).toISOString().slice(0, 10);
}

// Day nutrition totals from a foods.value object.
// Mirrors nutrition.js macrosFor()+dayTotals(): for each meal category, for each
// logged item, add (per100g/100)*grams. Items whose product is unknown are
// skipped (matches client `if (!p) continue`). getProduct(id) returns a parsed
// product ({kcalPer100g,pPer100g,cPer100g,fPer100g}) or null.
// Returns { kcal, p, c, f, itemCount } — itemCount lets callers skip empty days.
export function nutritionTotals(foodsValue, getProduct) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, itemCount: 0 };
  for (const cat of CATEGORY_KEYS) {
    for (const it of (foodsValue?.[cat] || [])) {
      t.itemCount++;
      const prod = getProduct(it.productId);
      if (!prod) continue;
      const factor = (Number(it.grams) || 0) / 100;
      t.kcal += (prod.kcalPer100g || 0) * factor;
      t.p    += (prod.pPer100g    || 0) * factor;
      t.c    += (prod.cPer100g    || 0) * factor;
      t.f    += (prod.fPer100g    || 0) * factor;
    }
  }
  return t;
}

// Total training volume for a day = Σ over the day's exercise rows of
// Σ parseFloat(w)*parseInt(r) per set. Mirrors helpers.js volumeTrend() vol().
// `setsArrays` is an array of per-exercise sets arrays ([{w,r}, ...]).
// Empty/blank sets ("" -> NaN -> 0) contribute nothing.
export function setsVolume(setsArrays) {
  let vol = 0;
  for (const arr of setsArrays) {
    for (const s of (arr || [])) {
      const w = parseFloat(s.w) || 0;
      const r = parseInt(s.r, 10) || 0;
      vol += w * r;
    }
  }
  return vol;
}

// ── Stable identity + tagging conventions (shared by both write paths) ───────

// external_id builders. These determine the UNIQUE(source, external_id,
// metric_type) key, so backfill and live-write MUST build them identically.
export const extId = {
  weight: (day) => `weights:${day}`,            // weights PK is `day`
  foodsDay: (date) => `foods-day:${date}`,      // one nutrition row per calendar day
  session: (date) => `session:${date}`          // one volume row per calendar day
};

// metric_type → unit, mirrors the catalog.
export const UNITS = {
  'body.weight': 'kg',
  'nutrition.calories': 'kcal',
  'nutrition.protein': 'g',
  'nutrition.carbs': 'g',
  'nutrition.fat': 'g',
  'fitness.session_volume': 'kg'
};

// Derived-tag fragments for category-2 (module aggregate) metrics. Merged with
// the source-path tag ({imported_by:'backfill'} or {source_path:'live'}).
export const DERIVED = {
  nutrition: { derived_from: 'shred.foods', aggregation_window: 'day', formula_version: 'nutrition_day_v1' },
  volume:    { derived_from: 'shred.sets',  aggregation_window: 'day', formula_version: 'session_volume_day_v1' }
};
