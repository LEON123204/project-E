'use strict';

const assert = require('node:assert/strict');
const {
  calculateFinalPrice,
  truncateExcerpt,
  calculateHighlights,
  validateAiSummary,
  buildCacheKey,
  SummaryCache
} = require('./compareHelpers');

console.log('=== ITEM 5: PURE HELPERS UNIT TESTS [MOCK DATA] ===\n');

// 1. finalPrice math
console.log('--- 1. finalPrice Math [MOCK] ---');
const fp1 = calculateFinalPrice(1999, 10);
assert.equal(fp1, 1799.1);
console.log('[MOCK] 1999 with 10% discount ->', fp1, '(expected 1799.1)');

const fp2 = calculateFinalPrice(2499, 0);
assert.equal(fp2, 2499);
console.log('[MOCK] 2499 with 0% discount ->', fp2, '(expected 2499)');

const fp3 = calculateFinalPrice(100, 100);
assert.equal(fp3, 0);
console.log('[MOCK] 100 with 100% discount ->', fp3, '(expected 0)');

const fp4 = calculateFinalPrice(1234.56, 15);
// 123456 paise * 0.15 = 18518.4 -> 18518 paise discount -> 104938 paise -> 1049.38
assert.equal(fp4, 1049.38);
console.log('[MOCK] 1234.56 with 15% discount ->', fp4, '(expected 1049.38)');

// 2. excerpt truncation
console.log('\n--- 2. excerpt Truncation [MOCK] ---');
const longText = '   Hello    world!   ' + 'A'.repeat(300);
const tr1 = truncateExcerpt(longText, 280);
assert.equal(tr1.length, 280);
assert.ok(tr1.startsWith('Hello world! AAA'));
console.log('[MOCK] Long text (320+ chars with extra whitespace) truncated to:', tr1.length, 'chars');

const shortText = '  Just   a   short   description.  ';
const tr2 = truncateExcerpt(shortText, 280);
assert.equal(tr2, 'Just a short description.');
console.log('[MOCK] Short text whitespace collapsed:', JSON.stringify(tr2));

// 3. highlights logic (ties, no reviews, fewer than 3 reviews, zero discount)
console.log('\n--- 3. Highlights Logic [MOCK] ---');

// Case 3a: Distinct winners
const prodsA = [
  { _id: 'p1', finalPrice: 100, ratingsAvg: 4.5, reviewsCount: 5, discountPercent: 20, stock: 10, category: 'cat1' },
  { _id: 'p2', finalPrice: 200, ratingsAvg: 4.8, reviewsCount: 10, discountPercent: 10, stock: 5, category: 'cat1' },
  { _id: 'p3', finalPrice: 150, ratingsAvg: 4.2, reviewsCount: 3, discountPercent: 5, stock: 2, category: 'cat1' }
];
const hA = calculateHighlights(prodsA);
assert.equal(hA.cheapestId, 'p1');
assert.equal(hA.highestRatedId, 'p2');
assert.equal(hA.mostReviewedId, 'p2');
assert.equal(hA.bestDiscountId, 'p1');
assert.equal(hA.allInStock, true);
console.log('[MOCK] Case 3a (Distinct winners):', JSON.stringify(hA));

// Case 3b: Ties on cheapest, most reviewed, and discount
const prodsB = [
  { _id: 'p1', finalPrice: 150, ratingsAvg: 4.0, reviewsCount: 5, discountPercent: 10, stock: 5, category: 'cat1' },
  { _id: 'p2', finalPrice: 150, ratingsAvg: 4.2, reviewsCount: 5, discountPercent: 10, stock: 0, category: 'cat1' }
];
const hB = calculateHighlights(prodsB);
assert.equal(hB.cheapestId, null); // Tie 150 vs 150
assert.equal(hB.highestRatedId, 'p2'); // 4.2 vs 4.0 (both reviewsCount >= 3)
assert.equal(hB.mostReviewedId, null); // Tie 5 vs 5
assert.equal(hB.bestDiscountId, null); // Tie 10% vs 10%
assert.equal(hB.allInStock, false); // p2 stock is 0
console.log('[MOCK] Case 3b (Ties on price, reviews, discount; out of stock):', JSON.stringify(hB));

// Case 3c: Fewer than 3 reviews and zero discount
const prodsC = [
  { _id: 'p1', finalPrice: 300, ratingsAvg: 5.0, reviewsCount: 2, discountPercent: 0, stock: 10, category: 'cat1' },
  { _id: 'p2', finalPrice: 400, ratingsAvg: 4.9, reviewsCount: 1, discountPercent: 0, stock: 5, category: 'cat1' }
];
const hC = calculateHighlights(prodsC);
assert.equal(hC.cheapestId, 'p1');
assert.equal(hC.highestRatedId, null); // Both have < 3 reviews
assert.equal(hC.mostReviewedId, 'p1'); // 2 vs 1
assert.equal(hC.bestDiscountId, null); // Both 0% discount
assert.equal(hC.allInStock, true);
console.log('[MOCK] Case 3c (Fewer than 3 reviews -> highestRatedId null; zero discount -> bestDiscountId null):', JSON.stringify(hC));

// Case 3d: No reviews at all (all 0 reviews)
const prodsD = [
  { _id: 'p1', finalPrice: 100, ratingsAvg: 0, reviewsCount: 0, discountPercent: 5, stock: 2, category: 'cat1' },
  { _id: 'p2', finalPrice: 200, ratingsAvg: 0, reviewsCount: 0, discountPercent: 5, stock: 4, category: 'cat2' }
];
const hD = calculateHighlights(prodsD);
assert.equal(hD.highestRatedId, null);
assert.equal(hD.mostReviewedId, null);
console.log('[MOCK] Case 3d (No reviews -> highestRatedId null, mostReviewedId null):', JSON.stringify(hD));

// 4. validateAiSummary
console.log('\n--- 4. validateAiSummary [MOCK] ---');

// Valid JSON
const validRaw = JSON.stringify({
  overview: 'Two solid wireless audio options with distinct sound profiles.',
  products: [
    { id: 'p1', bestFor: 'Budget listeners wanting ANC.', watchOut: 'Plastic build quality.' },
    { id: 'p2', bestFor: 'Audiophiles wanting fidelity.', watchOut: 'Higher price point.' }
  ],
  verdict: 'Choose p1 for value, p2 for premium audio.'
});
const v1 = validateAiSummary(validRaw, ['p1', 'p2']);
assert.ok(v1);
assert.equal(v1.products.length, 2);
console.log('[MOCK] Valid JSON parsed cleanly:', JSON.stringify(v1));

// Fenced JSON (```json ... ```)
const fencedRaw = '```json\n' + validRaw + '\n```';
const v2 = validateAiSummary(fencedRaw, ['p1', 'p2']);
assert.ok(v2);
assert.equal(v2.overview, 'Two solid wireless audio options with distinct sound profiles.');
console.log('[MOCK] Fenced JSON successfully un-fenced and parsed.');

// Missing ID
const missingIdRaw = JSON.stringify({
  overview: 'Overview here.',
  products: [{ id: 'p1', bestFor: 'Best for p1.' }],
  verdict: 'Verdict here.'
});
assert.equal(validateAiSummary(missingIdRaw, ['p1', 'p2']), null);
console.log('[MOCK] Missing expected ID rejected -> null');

// Extra ID
const extraIdRaw = JSON.stringify({
  overview: 'Overview here.',
  products: [
    { id: 'p1', bestFor: 'Best for p1.' },
    { id: 'p2', bestFor: 'Best for p2.' },
    { id: 'p3', bestFor: 'Extra product.' }
  ],
  verdict: 'Verdict here.'
});
assert.equal(validateAiSummary(extraIdRaw, ['p1', 'p2']), null);
console.log('[MOCK] Extra unexpected ID rejected -> null');

// Overlong strings truncated
const overlongRaw = JSON.stringify({
  overview: 'A'.repeat(400),
  products: [
    { id: 'p1', bestFor: 'B'.repeat(200), watchOut: 'C'.repeat(200) },
    { id: 'p2', bestFor: 'D'.repeat(200) }
  ],
  verdict: 'E'.repeat(300)
});
const vOver = validateAiSummary(overlongRaw, ['p1', 'p2']);
assert.ok(vOver);
assert.equal(vOver.overview.length, 320);
assert.equal(vOver.products[0].bestFor.length, 140);
assert.equal(vOver.products[0].watchOut.length, 140);
assert.equal(vOver.verdict.length, 200);
console.log('[MOCK] Overlong strings truncated to 320, 140, 200 chars accurately.');

// HTML stripped
const htmlRaw = JSON.stringify({
  overview: 'Overview with <b>HTML</b> & <script>alert(1)</script> tags.',
  products: [
    { id: 'p1', bestFor: 'Great <em>bass</em> performance.' },
    { id: 'p2', bestFor: 'Clean highs.' }
  ],
  verdict: 'Best <a href="#">choice</a>.'
});
const vHtml = validateAiSummary(htmlRaw, ['p1', 'p2']);
assert.ok(vHtml);
assert.ok(!vHtml.overview.includes('<b>'));
assert.ok(!vHtml.overview.includes('<script>'));
assert.ok(!vHtml.products[0].bestFor.includes('<em>'));
assert.ok(!vHtml.verdict.includes('<a'));
console.log('[MOCK] HTML tags stripped cleanly:', vHtml.overview);

// URL dropped
const urlInWatchOutRaw = JSON.stringify({
  overview: 'Solid products.',
  products: [
    { id: 'p1', bestFor: 'Great option.', watchOut: 'See https://example.com for issues.' },
    { id: 'p2', bestFor: 'Another option.' }
  ],
  verdict: 'Both good.'
});
const vUrlWatch = validateAiSummary(urlInWatchOutRaw, ['p1', 'p2']);
assert.ok(vUrlWatch);
assert.equal(vUrlWatch.products[0].watchOut, undefined); // watchOut dropped
console.log('[MOCK] watchOut containing URL dropped, product retained:', JSON.stringify(vUrlWatch.products[0]));

const urlInOverviewRaw = JSON.stringify({
  overview: 'Visit www.mysite.com for deals.',
  products: [
    { id: 'p1', bestFor: 'Great option.' },
    { id: 'p2', bestFor: 'Another option.' }
  ],
  verdict: 'Both good.'
});
assert.equal(validateAiSummary(urlInOverviewRaw, ['p1', 'p2']), null);
console.log('[MOCK] URL in overview rejected -> null');

// Invalid JSON / Non-object
assert.equal(validateAiSummary('This is not json at all', ['p1', 'p2']), null);
assert.equal(validateAiSummary('["array", "instead", "of", "object"]', ['p1', 'p2']), null);
console.log('[MOCK] Non-JSON and non-object rejected -> null');

// 5. Cache key and eviction
console.log('\n--- 5. Cache Key & Eviction [MOCK] ---');
const cacheProds = [
  { _id: 'p2', updatedAt: '2026-11-01T00:00:00.000Z', price: 200, stock: 5, ratingsAvg: 4.5, reviewsCount: 3 },
  { _id: 'p1', updatedAt: '2026-11-01T00:00:00.000Z', price: 100, stock: 10, ratingsAvg: 4.0, reviewsCount: 2 }
];
const key1 = buildCacheKey(cacheProds);
// Should sort p1 before p2 regardless of input array order
const key2 = buildCacheKey([cacheProds[1], cacheProds[0]]);
assert.equal(key1, key2);
console.log('[MOCK] Cache key deterministic regardless of order:', key1);

// Eviction test (max 3 items for test)
const testCache = new SummaryCache(3, 60000);
const genTime1 = '2026-11-19T04:00:00.000Z';
testCache.set('k1', { val: 1 }, genTime1);
testCache.set('k2', { val: 2 });
testCache.set('k3', { val: 3 });
assert.equal(testCache.size, 3);
const entry1 = testCache.get('k1');
assert.ok(entry1);
assert.deepEqual(entry1.summary, { val: 1 });
assert.equal(entry1.generatedAt, genTime1);

// Adding 4th item evicts oldest ('k1')
testCache.set('k4', { val: 4 });
assert.equal(testCache.size, 3);
assert.equal(testCache.get('k1'), null);
assert.deepEqual(testCache.get('k4').summary, { val: 4 });
console.log('[MOCK] Cache eviction verified: oldest entry k1 evicted when adding 4th item to maxEntries=3.');
console.log('[MOCK] Cache metadata verified: original generatedAt preserved upon retrieval.');

console.log('\nAll pure helper unit tests passed successfully! ✓');

