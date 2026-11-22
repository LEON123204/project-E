import assert from 'node:assert/strict';
import {
  isValid24HexId,
  sanitizeCartItem,
  sanitizeCartItems,
  parseGuestCart
} from './cartSanitize.js';

console.log('=== CART SANITIZE UNIT TESTS [MOCK DATA] ===\n');

const VALID_ID_1 = '674e30010101010101010101';
const VALID_ID_2 = '674e30010101010101010102';
const INVALID_ID_SHORT = '674e3001';
const INVALID_ID_CHARS = '674e3001010101010101010z';

// ── 1. isValid24HexId ──
console.log('--- 1. isValid24HexId [MOCK] ---');
assert.equal(isValid24HexId(VALID_ID_1), true, 'Valid 24-hex lower');
assert.equal(isValid24HexId(VALID_ID_1.toUpperCase()), true, 'Valid 24-hex upper');
assert.equal(isValid24HexId(INVALID_ID_SHORT), false, 'Short ID rejected');
assert.equal(isValid24HexId(INVALID_ID_CHARS), false, 'Non-hex char rejected');
assert.equal(isValid24HexId(null), false, 'null rejected');
assert.equal(isValid24HexId(undefined), false, 'undefined rejected');
assert.equal(isValid24HexId(12345), false, 'number rejected');
console.log('  ✓ 24-hex validation tests passed');

// ── 2. Valid items ──
console.log('\n--- 2. Valid items [MOCK] ---');
const validItem = {
  product: {
    _id: VALID_ID_1,
    name: 'Wireless Headphones',
    price: 1999,
    images: ['https://images.com/1.jpg'],
    stock: 15
  },
  quantity: 2
};
const resValid = sanitizeCartItem(validItem);
assert.notEqual(resValid, null, 'Valid item should not be null');
assert.equal(resValid.product._id, VALID_ID_1);
assert.equal(resValid.product.name, 'Wireless Headphones');
assert.equal(resValid.product.price, 1999);
assert.equal(resValid.quantity, 2);
assert.equal(resValid.product.stock, 15);
assert.deepEqual(resValid.product.images, ['https://images.com/1.jpg']);
console.log('  ✓ Valid item sanitization passed');

// ── 3. Previously crashing compare-shaped item ──
console.log('\n--- 3. Crashing compare-shaped item [MOCK] ---');
// What CartContext produced when passed product._id as a string:
const crashingCompareItem = {
  product: {
    _id: undefined,
    name: undefined,
    price: undefined,
    images: undefined,
    stock: undefined
  },
  quantity: null
};
const resCrashing = sanitizeCartItem(crashingCompareItem);
assert.equal(resCrashing, null, 'Compare-shaped crashing item must be dropped (null)');

const crashingCartArray = [crashingCompareItem, { product: {}, quantity: null }];
const resCrashingArray = sanitizeCartItems(crashingCartArray);
assert.deepEqual(resCrashingArray, [], 'Array of crashing items sanitized to empty array');
console.log('  ✓ Crashing compare-shaped item dropped cleanly');

// ── 4. Corrupt JSON ──
console.log('\n--- 4. Corrupt JSON [MOCK] ---');
const corruptJson1 = '{ "not valid json: true,';
const resCorrupt1 = parseGuestCart(corruptJson1);
assert.deepEqual(resCorrupt1, [], 'Corrupt JSON returns empty array without throwing');

const corruptJson2 = 'undefined';
assert.deepEqual(parseGuestCart(corruptJson2), [], 'undefined string returns empty array');
assert.deepEqual(parseGuestCart(''), [], 'Empty string returns empty array');
assert.deepEqual(parseGuestCart(null), [], 'null returns empty array');
console.log('  ✓ Corrupt JSON safely healed to empty array');

// ── 5. Non-array JSON ──
console.log('\n--- 5. Non-array JSON [MOCK] ---');
const nonArrayJsonObj = JSON.stringify({ product: { _id: VALID_ID_1 }, quantity: 1 });
assert.deepEqual(parseGuestCart(nonArrayJsonObj), [], 'Object JSON returns empty array');
assert.deepEqual(parseGuestCart('12345'), [], 'Numeric JSON returns empty array');
assert.deepEqual(parseGuestCart('"just a string"'), [], 'String JSON returns empty array');
assert.deepEqual(parseGuestCart('true'), [], 'Boolean JSON returns empty array');
console.log('  ✓ Non-array JSON safely healed to empty array');

// ── 6. Quantity huge, negative, zero, string ──
console.log('\n--- 6. Quantity clamps (huge, negative, zero, string) [MOCK] ---');
// Huge quantity clamped to stock (stock = 10)
const hugeQtyItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: 100, stock: 10 },
  quantity: 9999
};
const resHuge = sanitizeCartItem(hugeQtyItem);
assert.equal(resHuge.quantity, 10, 'Huge quantity clamped to stock limit (10)');

// Negative quantity clamped to 1
const negQtyItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: 100, stock: 10 },
  quantity: -5
};
const resNeg = sanitizeCartItem(negQtyItem);
assert.equal(resNeg.quantity, 1, 'Negative quantity clamped to minimum 1');

// Zero quantity clamped to 1
const zeroQtyItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: 100, stock: 10 },
  quantity: 0
};
const resZero = sanitizeCartItem(zeroQtyItem);
assert.equal(resZero.quantity, 1, 'Zero quantity clamped to minimum 1');

// Quantity as string converted to number
const strQtyItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: 100, stock: 10 },
  quantity: '4'
};
const resStrQty = sanitizeCartItem(strQtyItem);
assert.equal(resStrQty.quantity, 4, 'Numeric string quantity converted to integer 4');
console.log('  ✓ Quantity boundary clamps (huge->stock, neg->1, zero->1, string->int) passed');

// ── 7. Price as string ──
console.log('\n--- 7. Price as string [MOCK] ---');
const strPriceItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: '299.50', stock: 10 },
  quantity: 2
};
const resStrPrice = sanitizeCartItem(strPriceItem);
assert.equal(typeof resStrPrice.product.price, 'number');
assert.equal(resStrPrice.product.price, 299.50, 'Price string parsed to finite number');

// Invalid non-numeric price dropped
const badPriceItem = {
  product: { _id: VALID_ID_1, name: 'Item', price: 'free_gift', stock: 10 },
  quantity: 2
};
assert.equal(sanitizeCartItem(badPriceItem), null, 'Non-numeric price item dropped');
console.log('  ✓ Price string parsing and non-numeric rejection passed');

// ── 8. Duplicates merge ──
console.log('\n--- 8. Duplicates merge [MOCK] ---');
const duplicateList = [
  { product: { _id: VALID_ID_1, name: 'Item 1', price: 100, stock: 15 }, quantity: 3 },
  { product: { _id: VALID_ID_2, name: 'Item 2', price: 200, stock: 5 }, quantity: 1 },
  { product: { _id: VALID_ID_1, name: 'Item 1', price: 100, stock: 15 }, quantity: 4 }
];
const resMerged = sanitizeCartItems(duplicateList);
assert.equal(resMerged.length, 2, 'Duplicates consolidated into single entry');
assert.equal(resMerged[0].product._id, VALID_ID_1);
assert.equal(resMerged[0].quantity, 7, 'Quantities summed (3 + 4 = 7)');
assert.equal(resMerged[1].product._id, VALID_ID_2);
assert.equal(resMerged[1].quantity, 1);

// Duplicate summing exceeding stock
const duplicateExceedStock = [
  { product: { _id: VALID_ID_1, name: 'Item 1', price: 100, stock: 10 }, quantity: 8 },
  { product: { _id: VALID_ID_1, name: 'Item 1', price: 100, stock: 10 }, quantity: 8 }
];
const resExceed = sanitizeCartItems(duplicateExceedStock);
assert.equal(resExceed[0].quantity, 10, 'Merged quantity capped to stock limit');
console.log('  ✓ Duplicates merged with stock clamping passed');

// ── 9. Stale / invalid 24-hex check ──
console.log('\n--- 9. Stale 24-hex check [MOCK] ---');
const staleList = [
  { product: { _id: 'old-style-id-123', name: 'Legacy', price: 100, stock: 5 }, quantity: 1 },
  { product: { _id: VALID_ID_1, name: 'Valid', price: 100, stock: 5 }, quantity: 1 },
  { product: { _id: '674e3001010101010101010z', name: 'Bad Hex', price: 100, stock: 5 }, quantity: 1 }
];
const resStale = sanitizeCartItems(staleList);
assert.equal(resStale.length, 1, 'Only valid 24-hex ID preserved');
assert.equal(resStale[0].product._id, VALID_ID_1);
console.log('  ✓ Stale and non-24-hex IDs dropped passed');

console.log('\n=== ALL CART SANITIZE UNIT TESTS PASSED ===');
