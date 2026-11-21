/**
 * Unit tests for compareSelection.js pure helpers.
 * Plain node asserts, runnable via `node client/src/utils/compareSelection.test.mjs`.
 */

import assert from 'node:assert/strict';
import {
  isValidId,
  sanitizeProduct,
  validateSelection,
  loadSelection,
  saveSelection,
  toggleItem,
  removeItem,
  clearItems,
  hasItem,
  parseCompareIds,
  shouldShowTray,
  COMPARE_STORAGE_KEY
} from './compareSelection.js';

console.log('=== COMPARE SELECTION UNIT TESTS [MOCK DATA] ===\n');

// Mock storage factory
function makeMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
    get size() { return store.size; }
  };
}

const ID_A = '6aee9fdee1890856d91dcd01';
const ID_B = '6aee9fdee1890856d91dcd02';
const ID_C = '6aee9fdee1890856d91dcd03';
const ID_D = '6aee9fdee1890856d91dcd04';

const PROD_A = { _id: ID_A, name: 'Headphones', image: 'https://img.com/a.jpg', price: 1999 };
const PROD_B = { _id: ID_B, name: 'Keyboard', images: ['https://img.com/b.jpg'], price: 3499 };
const PROD_C = { _id: ID_C, name: 'Smart Watch', image: 'https://img.com/c.jpg', price: 4999 };
const PROD_D = { _id: ID_D, name: 'Mouse', image: 'https://img.com/d.jpg', price: 999 };

// ── 1. isValidId ──
console.log('--- 1. isValidId [MOCK] ---');
assert.equal(isValidId(ID_A), true, 'Valid 24-hex lowercase ID');
assert.equal(isValidId(ID_A.toUpperCase()), true, 'Valid 24-hex uppercase ID');
assert.equal(isValidId('invalid-short-id'), false, 'Non-hex string rejected');
assert.equal(isValidId('6aee9fdee1890856d91dcd0z'), false, '24 chars but non-hex char rejected');
assert.equal(isValidId(null), false, 'null rejected');
assert.equal(isValidId(12345), false, 'number rejected');
console.log('[MOCK] 1. PASSED: isValidId validates 24-hex ObjectIds');

// ── 2. sanitizeProduct & wrong types ──
console.log('\n--- 2. sanitizeProduct & wrong types [MOCK] ---');
const cleanA = sanitizeProduct(PROD_A);
assert.deepEqual(cleanA, { _id: ID_A, name: 'Headphones', image: 'https://img.com/a.jpg', price: 1999 });

const cleanB = sanitizeProduct(PROD_B); // images array -> first image
assert.equal(cleanB.image, 'https://img.com/b.jpg');

assert.equal(sanitizeProduct(null), null, 'null product rejected');
assert.equal(sanitizeProduct(undefined), null, 'undefined rejected');
assert.equal(sanitizeProduct('string-not-obj'), null, 'string rejected');
assert.equal(sanitizeProduct({ _id: 'bad-id', name: 'Bad' }), null, 'invalid id rejected');
assert.equal(sanitizeProduct({ id: ID_A, name: 'Fallback ID' })._id, ID_A, 'supports .id fallback');
console.log('[MOCK] 2. PASSED: sanitizeProduct handles valid objects and gracefully rejects wrong types');

// ── 3. add/remove/toggle ──
console.log('\n--- 3. add/remove/toggle [MOCK] ---');
let state = [];

// Toggle add 1st
let res = toggleItem(state, PROD_A);
assert.equal(res.added, true);
assert.equal(res.limitReached, false);
assert.equal(res.items.length, 1);
assert.equal(hasItem(res.items, ID_A), true);
state = res.items;

// Toggle add 2nd
res = toggleItem(state, PROD_B);
assert.equal(res.added, true);
assert.equal(res.items.length, 2);
state = res.items;

// Toggle remove 1st
res = toggleItem(state, PROD_A);
assert.equal(res.added, false);
assert.equal(res.items.length, 1);
assert.equal(hasItem(res.items, ID_A), false);
assert.equal(hasItem(res.items, ID_B), true);
state = res.items;

// removeItem by ID
state = removeItem(state, ID_B);
assert.equal(state.length, 0);

// clearItems
const cleared = clearItems();
assert.deepEqual(cleared, []);
console.log('[MOCK] 3. PASSED: add/remove/toggle works correctly');

// ── 4. 4th item rejected ──
console.log('\n--- 4. 4th item rejected (cap at 3) [MOCK] ---');
let triple = [PROD_A, PROD_B, PROD_C];
const fourthRes = toggleItem(triple, PROD_D);
assert.equal(fourthRes.added, false, '4th item must not be added');
assert.equal(fourthRes.limitReached, true, 'limitReached flag must be true');
assert.equal(fourthRes.items.length, 3, 'Selection count remains at 3');
assert.equal(hasItem(fourthRes.items, ID_D), false);
console.log('[MOCK] 4. PASSED: 4th item rejected, limitReached=true, selection remains capped at 3');

// ── 5. Dedupe ──
console.log('\n--- 5. Dedupe [MOCK] ---');
const duplicated = [PROD_A, PROD_B, PROD_A, PROD_C, PROD_B];
const deduped = validateSelection(duplicated);
assert.equal(deduped.length, 3);
assert.equal(deduped[0]._id, ID_A);
assert.equal(deduped[1]._id, ID_B);
assert.equal(deduped[2]._id, ID_C);
console.log('[MOCK] 5. PASSED: duplicates removed, order preserved, capped at 3');

// ── 6. Persistence round trip with mocked sessionStorage ──
console.log('\n--- 6. Persistence round trip with mocked sessionStorage [MOCK] ---');
const storage = makeMockStorage();
const saved = saveSelection([PROD_A, PROD_B], storage);
assert.equal(saved.length, 2);
assert.ok(storage.getItem(COMPARE_STORAGE_KEY));

const loaded = loadSelection(storage);
assert.equal(loaded.length, 2);
assert.equal(loaded[0]._id, ID_A);
assert.equal(loaded[1]._id, ID_B);
assert.equal(loaded[0].price, 1999);
console.log('[MOCK] 6. PASSED: save and load round-trip succeeds with mocked storage');

// ── 7. Corrupt JSON in storage ──
console.log('\n--- 7. Corrupt JSON in storage [MOCK] ---');
const corruptStorage = makeMockStorage({ [COMPARE_STORAGE_KEY]: '{"invalid json' });
const loadedCorrupt = loadSelection(corruptStorage);
assert.deepEqual(loadedCorrupt, [], 'Corrupt JSON returns empty array without throwing');

const malformedTypeStorage = makeMockStorage({ [COMPARE_STORAGE_KEY]: '"just-a-string"' });
assert.deepEqual(loadSelection(malformedTypeStorage), [], 'String JSON returns empty array');
console.log('[MOCK] 7. PASSED: corrupt JSON and non-array storage values return safe empty array');

// ── 8. Stale invalid IDs in storage ──
console.log('\n--- 8. Stale invalid IDs in storage [MOCK] ---');
const staleStorage = makeMockStorage({
  [COMPARE_STORAGE_KEY]: JSON.stringify([
    { _id: 'not-a-valid-hex-id', name: 'Stale 1' },
    PROD_A,
    { _id: null },
    PROD_B,
    { id: '12345' }
  ])
});
const loadedStale = loadSelection(staleStorage);
assert.equal(loadedStale.length, 2, 'Only valid 24-hex items retained');
assert.equal(loadedStale[0]._id, ID_A);
assert.equal(loadedStale[1]._id, ID_B);
console.log('[MOCK] 8. PASSED: stale invalid IDs filtered out safely on load');

// ── 9. Query-string parser ──
console.log('\n--- 9. Query-string parser [MOCK] ---');

// Case 9a: Valid 2 IDs (comma-separated or with ?ids=)
const q2 = parseCompareIds(`${ID_A},${ID_B}`);
assert.deepEqual(q2, [ID_A, ID_B], 'Valid 2 IDs');

const q2Url = parseCompareIds(`?ids=${ID_A},${ID_B}`);
assert.deepEqual(q2Url, [ID_A, ID_B], 'Valid 2 IDs with query string ?ids=');

// Case 9b: Valid 3 IDs
const q3 = parseCompareIds(`${ID_A},${ID_B},${ID_C}`);
assert.deepEqual(q3, [ID_A, ID_B, ID_C], 'Valid 3 IDs');

// Case 9c: Duplicates (e.g. A,B,A -> dedupes to A,B)
const qDup = parseCompareIds(`${ID_A},${ID_B},${ID_A}`);
assert.deepEqual(qDup, [ID_A, ID_B], 'Duplicates dedupe to valid 2 IDs');

// Case 9d: Duplicates resulting in 1 ID -> rejected (must be 2 to 3)
const qDup1 = parseCompareIds(`${ID_A},${ID_A}`);
assert.equal(qDup1, null, '2 identical IDs dedupe to 1 -> rejected');

// Case 9e: 1 ID -> rejected
const q1 = parseCompareIds(ID_A);
assert.equal(q1, null, 'Single ID rejected');

// Case 9f: 4 IDs -> rejected
const q4 = parseCompareIds(`${ID_A},${ID_B},${ID_C},${ID_D}`);
assert.equal(q4, null, '4 IDs rejected (cap at 3)');

// Case 9g: Junk string / invalid hex
const qJunk = parseCompareIds('not,valid,ids');
assert.equal(qJunk, null, 'Junk non-hex rejected');

const qPartialJunk = parseCompareIds(`${ID_A},junk_id`);
assert.equal(qPartialJunk, null, 'Partial junk rejected');

// Case 9h: Uppercase hex -> normalized to lowercase
const qUpper = parseCompareIds(`${ID_A.toUpperCase()},${ID_B.toUpperCase()}`);
assert.deepEqual(qUpper, [ID_A, ID_B], 'Uppercase hex accepted and normalized to lowercase');

// Case 9i: Empty/null/undefined
assert.equal(parseCompareIds(''), null, 'Empty string returns null');
assert.equal(parseCompareIds(null), null, 'null returns null');
assert.equal(parseCompareIds(undefined), null, 'undefined returns null');

console.log('[MOCK] 9. PASSED: parseCompareIds handles valid, duplicates, 1 id, 4 ids, junk, uppercase hex cleanly');

// ── 10. shouldShowTray route checks ──
console.log('\n--- 10. shouldShowTray route checks [MOCK] ---');
// Shown on customer browsing pages
assert.equal(shouldShowTray('/shop', 1), true, '/shop shows tray with count=1');
assert.equal(shouldShowTray('/shop', 3), true, '/shop shows tray with count=3');
assert.equal(shouldShowTray('/product/123', 2), true, '/product/:id shows tray');
assert.equal(shouldShowTray('/', 1), true, '/ (home) shows tray');

// Hidden when count is 0
assert.equal(shouldShowTray('/shop', 0), false, '/shop hides tray with count=0');

// Hidden routes
const hiddenRoutes = [
  '/admin/dashboard',
  '/admin/products',
  '/seller/dashboard',
  '/seller/orders',
  '/checkout',
  '/cart',
  '/login',
  '/register',
  '/order-tracking',
  '/order-confirmation/123',
  '/compare',
  '/compare?ids=1,2'
];
for (const route of hiddenRoutes) {
  assert.equal(shouldShowTray(route, 2), false, `${route} must hide tray`);
}
console.log('[MOCK] 10. PASSED: shouldShowTray route filtering verified across all required routes');

console.log('\n=== ALL COMPARE SELECTION UNIT TESTS PASSED ✓ ===');
