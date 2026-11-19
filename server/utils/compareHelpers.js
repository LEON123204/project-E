'use strict';

/**
 * Pure helpers for AI product comparison (Stage 7-1)
 */

/**
 * Calculates real final price after discount using paise-safe integer math.
 * @param {number} price In rupees
 * @param {number} discountPercent 0-100
 * @returns {number} Final price in rupees (max 2 decimals)
 */
function calculateFinalPrice(price, discountPercent) {
  const p = Math.max(0, Number(price) || 0);
  const d = Math.max(0, Math.min(100, Number(discountPercent) || 0));

  if (d <= 0) return p;
  if (d >= 100) return 0;

  const pricePaise = Math.round(p * 100);
  const discountPaise = Math.round(pricePaise * (d / 100));
  const finalPaise = Math.max(0, pricePaise - discountPaise);

  return Number((finalPaise / 100).toFixed(2));
}

/**
 * Truncates text to maxLength after collapsing all whitespace sequences to a single space.
 * @param {string} text
 * @param {number} maxLength Default 280
 * @returns {string}
 */
function truncateExcerpt(text, maxLength = 280) {
  if (!text || typeof text !== 'string') return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > maxLength ? collapsed.slice(0, maxLength) : collapsed;
}

/**
 * Checks if a string contains http, https, or www (case-insensitive).
 * @param {string} str
 * @returns {boolean}
 */
function containsUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return /https?:\/\/|www\./i.test(str);
}

/**
 * Strips HTML tags, control characters, collapses whitespace, and truncates to maxLength.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
function sanitizeString(str, maxLength) {
  if (!str || typeof str !== 'string') return '';
  const stripped = str
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
}

/**
 * Computes deterministic highlights across 2-3 products.
 * Ties produce null.
 * @param {Array<Object>} products Array of processed product objects
 * @returns {Object} { cheapestId, highestRatedId, mostReviewedId, bestDiscountId, allInStock }
 */
function calculateHighlights(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      cheapestId: null,
      highestRatedId: null,
      mostReviewedId: null,
      bestDiscountId: null,
      allInStock: false
    };
  }

  // 1. cheapestId (by finalPrice, null on a tie)
  let minPrice = Infinity;
  let cheapestCandidates = [];
  for (const p of products) {
    const price = Number(p.finalPrice);
    if (price < minPrice) {
      minPrice = price;
      cheapestCandidates = [p._id];
    } else if (price === minPrice) {
      cheapestCandidates.push(p._id);
    }
  }
  const cheapestId = cheapestCandidates.length === 1 ? String(cheapestCandidates[0]) : null;

  // 2. highestRatedId (only among products with at least 3 reviews, null if none or a tie)
  const eligibleRated = products.filter(p => (Number(p.reviewsCount) || 0) >= 3);
  let highestRatedId = null;
  if (eligibleRated.length > 0) {
    let maxRating = -1;
    let ratingCandidates = [];
    for (const p of eligibleRated) {
      const rating = Number(p.ratingsAvg) || 0;
      if (rating > maxRating) {
        maxRating = rating;
        ratingCandidates = [p._id];
      } else if (rating === maxRating) {
        ratingCandidates.push(p._id);
      }
    }
    highestRatedId = ratingCandidates.length === 1 ? String(ratingCandidates[0]) : null;
  }

  // 3. mostReviewedId (null on a tie, or if max reviews is 0)
  let maxReviews = 0;
  let reviewCandidates = [];
  for (const p of products) {
    const count = Number(p.reviewsCount) || 0;
    if (count > maxReviews) {
      maxReviews = count;
      reviewCandidates = [p._id];
    } else if (count === maxReviews && count > 0) {
      reviewCandidates.push(p._id);
    }
  }
  const mostReviewedId = (reviewCandidates.length === 1 && maxReviews > 0)
    ? String(reviewCandidates[0])
    : null;

  // 4. bestDiscountId (by discountPercent, null if none or on a tie)
  let maxDiscount = 0;
  let discountCandidates = [];
  for (const p of products) {
    const disc = Number(p.discountPercent) || 0;
    if (disc > maxDiscount) {
      maxDiscount = disc;
      discountCandidates = [p._id];
    } else if (disc === maxDiscount && disc > 0) {
      discountCandidates.push(p._id);
    }
  }
  const bestDiscountId = (discountCandidates.length === 1 && maxDiscount > 0)
    ? String(discountCandidates[0])
    : null;

  // 5. allInStock (boolean)
  const allInStock = products.every(p => (Number(p.stock) || 0) > 0);

  return {
    cheapestId,
    highestRatedId,
    mostReviewedId,
    bestDiscountId,
    allInStock
  };
}

/**
 * Validates and sanitizes the LLM JSON summary.
 * Returns null if validation fails.
 * @param {string} rawOutput
 * @param {Array<string>} expectedProductIds
 * @returns {Object|null}
 */
function validateAiSummary(rawOutput, expectedProductIds) {
  if (!rawOutput || typeof rawOutput !== 'string') return null;

  let clean = rawOutput.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  // Drop if URL present in top-level strings
  if (containsUrl(parsed.overview) || containsUrl(parsed.verdict)) {
    return null;
  }

  const overview = sanitizeString(parsed.overview, 320);
  const verdict = sanitizeString(parsed.verdict, 200);

  if (!overview || !verdict) {
    return null;
  }

  if (!Array.isArray(parsed.products)) {
    return null;
  }

  const expectedSet = new Set(expectedProductIds.map(String));
  if (parsed.products.length !== expectedSet.size) {
    return null;
  }

  const seenIds = new Set();
  const validatedProducts = [];

  for (const p of parsed.products) {
    if (!p || typeof p !== 'object') return null;
    const id = String(p.id || '');
    if (!expectedSet.has(id) || seenIds.has(id)) {
      return null;
    }
    seenIds.add(id);

    // If bestFor contains a URL, validation fails
    if (containsUrl(p.bestFor)) {
      return null;
    }

    const bestFor = sanitizeString(p.bestFor, 140);
    if (!bestFor) {
      return null;
    }

    const item = { id, bestFor };

    // watchOut is optional; if present and contains URL, drop watchOut
    if (p.watchOut !== undefined && p.watchOut !== null) {
      if (!containsUrl(p.watchOut)) {
        const watchOut = sanitizeString(p.watchOut, 140);
        if (watchOut) item.watchOut = watchOut;
      }
    }

    validatedProducts.push(item);
  }

  if (seenIds.size !== expectedSet.size) {
    return null;
  }

  return {
    overview,
    products: validatedProducts,
    verdict
  };
}

/**
 * Builds a deterministic cache key from products.
 * Includes sorted IDs, updatedAt, price, stock, ratingsAvg, and reviewsCount.
 * @param {Array<Object>} products
 * @returns {string}
 */
function buildCacheKey(products) {
  if (!Array.isArray(products)) return '';
  const sorted = [...products].sort((a, b) => String(a._id).localeCompare(String(b._id)));
  return sorted.map(p => {
    const id = String(p._id);
    const updated = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    const price = Number(p.price) || 0;
    const stock = Number(p.stock) || 0;
    const ratingsAvg = Number(p.ratingsAvg) || 0;
    const reviewsCount = Number(p.reviewsCount) || 0;
    return `${id}:${updated}:${price}:${stock}:${ratingsAvg}:${reviewsCount}`;
  }).join('|');
}

/**
 * In-memory LRU/FIFO cache for comparison summaries.
 */
class SummaryCache {
  constructor(maxEntries = 200, ttlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key) {
    if (!key) return null;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  set(key, summary, generatedAt = new Date().toISOString()) {
    if (!key || !summary) return;
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      summary,
      generatedAt,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// LLM Spend Guard (process-wide, IP-agnostic)
// ---------------------------------------------------------------------------

/**
 * Default limits – overridable via env vars for tests ONLY.
 * COMPARE_LLM_PER_MIN  : max uncached LLM calls per rolling 60-second window (default 20)
 * COMPARE_LLM_PER_HOUR : max uncached LLM calls per rolling 60-minute window (default 300)
 * COMPARE_LLM_MAX_INFLIGHT : max simultaneous in-flight LLM calls (default 3)
 */
const DEFAULT_PER_MIN = 20;
const DEFAULT_PER_HOUR = 300;
const DEFAULT_MAX_INFLIGHT = 3;

/**
 * Process-wide guard for comparison LLM calls.
 * Accepts an injectable clock object { now() } for deterministic tests.
 *
 * Rules:
 *  - Cache hits NEVER consume budget (enforced in compareController).
 *  - acquire() returns true if a call is permitted (and reserves a slot).
 *  - release(success?) must be called after every acquire() – on success, error, or timeout.
 *  - When budget is exhausted: does not call LLM, returns unavailable, logs at most once per minute.
 *  - Concurrency cap: at most maxInflight simultaneous in-flight calls.
 */
class LlmSpendGuard {
  /**
   * @param {{ now: () => number }} [clock] – injectable clock, defaults to Date
   * @param {object} [opts]
   * @param {number} [opts.perMinute]
   * @param {number} [opts.perHour]
   * @param {number} [opts.maxInflight]
   */
  constructor(clock, opts = {}) {
    this._clock = clock || { now: () => Date.now() };
    this._perMinute = opts.perMinute !== undefined ? opts.perMinute : DEFAULT_PER_MIN;
    this._perHour = opts.perHour !== undefined ? opts.perHour : DEFAULT_PER_HOUR;
    this._maxInflight = opts.maxInflight !== undefined ? opts.maxInflight : DEFAULT_MAX_INFLIGHT;

    // Rolling-window timestamps of completed (started) calls
    this._minuteTs = []; // timestamps within the last 60 s
    this._hourTs = [];   // timestamps within the last 3600 s

    // Current in-flight count
    this._inflight = 0;

    // Throttle for the "budget exhausted" log line: at most once per 60 s wall-clock
    this._lastExhaustedLog = -Infinity;
  }

  /** @returns {{ allowed: boolean, reason: string }} */
  acquire() {
    const now = this._clock.now();
    const minAgo = now - 60_000;
    const hourAgo = now - 3_600_000;

    // Evict expired timestamps
    this._minuteTs = this._minuteTs.filter(t => t > minAgo);
    this._hourTs = this._hourTs.filter(t => t > hourAgo);

    if (this._inflight >= this._maxInflight) {
      return { allowed: false, reason: 'concurrency' };
    }

    if (this._minuteTs.length >= this._perMinute) {
      this._logExhausted(now);
      return { allowed: false, reason: 'per-minute' };
    }

    if (this._hourTs.length >= this._perHour) {
      this._logExhausted(now);
      return { allowed: false, reason: 'per-hour' };
    }

    // Reserve slot
    this._minuteTs.push(now);
    this._hourTs.push(now);
    this._inflight++;
    return { allowed: true, reason: 'ok' };
  }

  /** Must be called after every acquire() that returned allowed:true */
  release() {
    if (this._inflight > 0) this._inflight--;
  }

  _logExhausted(now) {
    if (now - this._lastExhaustedLog >= 60_000) {
      this._lastExhaustedLog = now;
      // Single-line log, no keys / addresses / product data
      process.stderr.write('compare: LLM budget exhausted\n');
    }
  }

  // ---- inspection helpers (for tests) ----
  get inflight() { return this._inflight; }
  get minuteCount() {
    const now = this._clock.now();
    return this._minuteTs.filter(t => t > now - 60_000).length;
  }
  get hourCount() {
    const now = this._clock.now();
    return this._hourTs.filter(t => t > now - 3_600_000).length;
  }
}

// Singleton guard used by compareController – limits read from env at construction time.
// Tests create their own instances with injected clocks and overridden limits.
function createDefaultGuard() {
  const perMinute = process.env.COMPARE_LLM_PER_MIN
    ? parseInt(process.env.COMPARE_LLM_PER_MIN, 10)
    : DEFAULT_PER_MIN;
  const perHour = process.env.COMPARE_LLM_PER_HOUR
    ? parseInt(process.env.COMPARE_LLM_PER_HOUR, 10)
    : DEFAULT_PER_HOUR;
  const maxInflight = process.env.COMPARE_LLM_MAX_INFLIGHT
    ? parseInt(process.env.COMPARE_LLM_MAX_INFLIGHT, 10)
    : DEFAULT_MAX_INFLIGHT;
  return new LlmSpendGuard(null, { perMinute, perHour, maxInflight });
}

const defaultSpendGuard = createDefaultGuard();

module.exports = {
  calculateFinalPrice,
  truncateExcerpt,
  containsUrl,
  sanitizeString,
  calculateHighlights,
  validateAiSummary,
  buildCacheKey,
  SummaryCache,
  LlmSpendGuard,
  defaultSpendGuard
};

