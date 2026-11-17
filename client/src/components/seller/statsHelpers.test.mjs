import assert from 'node:assert/strict';
import {
  safeNum,
  parseDateParts,
  formatDayMonth,
  formatFullDate,
  formatINR,
  formatNumber,
  formatCompactRupees,
  normalizeStats
} from './statsHelpers.js';

console.log('Running statsHelpers.test.mjs unit tests...\n');

// ── Test 1: Real seller1 JSON ──
console.log('Case 1: Real seller1 JSON');
const realSeller1JSON = {
  success: true,
  range: 30,
  totals: {
    earnedRevenue: 1999,
    inProgressRevenue: 3998,
    ordersCounted: 3,
    ordersByStatus: { pending: 1, shipped: 1, delivered: 1, cancelled: 0 },
    unitsSold: 3,
    averageOrderValue: 1999
  },
  cashToCollect: { amount: 1999, parts: 1 },
  dailySeries: [
    { date: '2026-11-11', revenue: 1999, orders: 1 },
    { date: '2026-11-15', revenue: 1999, orders: 1 },
    { date: '2026-11-16', revenue: 1999, orders: 1 }
  ],
  topProducts: [
    { productId: '6aeea1f3db96712a914b7788', name: 'wireless boat earpodes', units: 3, revenue: 5997 }
  ],
  lowStock: [],
  productStatusCounts: { approved: 1, pending_review: 0, rejected: 0 }
};

const norm1 = normalizeStats(realSeller1JSON);
assert.equal(norm1.range, 30);
assert.equal(norm1.totals.earnedRevenue, 1999);
assert.equal(norm1.totals.inProgressRevenue, 3998);
assert.equal(norm1.totals.ordersCounted, 3);
assert.equal(norm1.totals.unitsSold, 3);
assert.equal(norm1.cashToCollect.amount, 1999);
assert.equal(norm1.cashToCollect.parts, 1);
assert.equal(norm1.topProducts[0].name, 'wireless boat earpodes');
assert.equal(norm1.dailySeries.length, 3);
console.log('  ✓ Real seller1 JSON normalized cleanly');

// ── Test 2: Real seller2 JSON ──
console.log('Case 2: Real seller2 JSON');
const realSeller2JSON = {
  success: true,
  range: 30,
  totals: {
    earnedRevenue: 0,
    inProgressRevenue: 1999,
    ordersCounted: 1,
    ordersByStatus: { pending: 1, shipped: 0, delivered: 0, cancelled: 2 },
    unitsSold: 1,
    averageOrderValue: 1999
  },
  cashToCollect: { amount: 0, parts: 0 },
  dailySeries: [
    { date: '2026-11-11', revenue: 1999, orders: 1 }
  ],
  topProducts: [
    { productId: '6af40e4048e6ee2f94703718', name: 'nike sheos', units: 1, revenue: 1999 }
  ],
  lowStock: [],
  productStatusCounts: { approved: 1, pending_review: 0, rejected: 0 }
};

const norm2 = normalizeStats(realSeller2JSON);
assert.equal(norm2.totals.earnedRevenue, 0);
assert.equal(norm2.totals.inProgressRevenue, 1999);
assert.equal(norm2.totals.ordersCounted, 1);
assert.equal(norm2.totals.ordersByStatus.cancelled, 2);
assert.equal(norm2.cashToCollect.amount, 0);
assert.equal(norm2.cashToCollect.parts, 0);
assert.equal(norm2.topProducts[0].name, 'nike sheos');
console.log('  ✓ Real seller2 JSON normalized cleanly');

// ── Test 3: All-zero response ──
console.log('Case 3: All-zero response');
const allZeroJSON = {
  success: true,
  range: 7,
  totals: {
    earnedRevenue: 0,
    inProgressRevenue: 0,
    ordersCounted: 0,
    ordersByStatus: { pending: 0, shipped: 0, delivered: 0, cancelled: 0 },
    unitsSold: 0,
    averageOrderValue: 0
  },
  cashToCollect: { amount: 0, parts: 0 },
  dailySeries: [
    { date: '2026-11-10', revenue: 0, orders: 0 },
    { date: '2026-11-16', revenue: 0, orders: 0 }
  ],
  topProducts: [],
  lowStock: [],
  productStatusCounts: { approved: 0, pending_review: 0, rejected: 0 }
};
const normZero = normalizeStats(allZeroJSON);
assert.equal(normZero.range, 7);
assert.equal(normZero.totals.earnedRevenue, 0);
assert.equal(normZero.totals.ordersCounted, 0);
assert.equal(normZero.dailySeries[0].revenue, 0);
assert.equal(normZero.topProducts.length, 0);
console.log('  ✓ All-zero response preserved with all zero numbers');

// ── Test 4: Missing fields (empty object) ──
console.log('Case 4: Response with missing fields');
const missingJSON = {
  success: true
};
const normMissing = normalizeStats(missingJSON);
assert.equal(normMissing.range, 30);
assert.equal(normMissing.totals.earnedRevenue, 0);
assert.equal(normMissing.totals.ordersCounted, 0);
assert.deepEqual(normMissing.totals.ordersByStatus, { pending: 0, shipped: 0, delivered: 0, cancelled: 0 });
assert.deepEqual(normMissing.cashToCollect, { amount: 0, parts: 0 });
assert.deepEqual(normMissing.dailySeries, []);
assert.deepEqual(normMissing.topProducts, []);
assert.deepEqual(normMissing.lowStock, []);
console.log('  ✓ Missing fields populated with safe defaults');

// ── Test 5: null and undefined inputs ──
console.log('Case 5: null and undefined inputs');
const normNull = normalizeStats(null);
assert.equal(normNull.range, 30);
assert.equal(normNull.totals.earnedRevenue, 0);
assert.deepEqual(normNull.dailySeries, []);

const normUndef = normalizeStats(undefined);
assert.equal(normUndef.range, 30);
assert.equal(normUndef.totals.earnedRevenue, 0);
console.log('  ✓ null and undefined handled gracefully');

// ── Test 6: String numbers and dirty inputs ──
console.log('Case 6: String numbers, NaNs, and Infinities');
const stringNumJSON = {
  range: '90',
  totals: {
    earnedRevenue: '1499.50',
    inProgressRevenue: '2999.00',
    ordersCounted: '4',
    ordersByStatus: { pending: '2', shipped: '1', delivered: '1', cancelled: '0' },
    unitsSold: '5',
    averageOrderValue: '899.70'
  },
  cashToCollect: { amount: '1499.50', parts: '1' },
  dailySeries: [
    { date: '2026-11-16', revenue: '1499.50', orders: '1' },
    { date: '2026-11-15', revenue: NaN, orders: undefined },
    { date: '2026-11-14', revenue: Infinity, orders: 'bad' }
  ],
  topProducts: [
    { productId: 12345, name: null, units: '3', revenue: '4498.50' }
  ],
  lowStock: [
    { productId: 67890, name: undefined, stock: '2' }
  ]
};
const normString = normalizeStats(stringNumJSON);
assert.equal(normString.range, 90);
assert.equal(normString.totals.earnedRevenue, 1499.5);
assert.equal(normString.totals.ordersCounted, 4);
assert.equal(normString.dailySeries[0].revenue, 1499.5);
assert.equal(normString.dailySeries[1].revenue, 0); // NaN -> 0
assert.equal(normString.dailySeries[1].orders, 0);  // undefined -> 0
assert.equal(normString.dailySeries[2].revenue, 0); // Infinity -> 0
assert.equal(normString.dailySeries[2].orders, 0);  // 'bad' -> 0
assert.equal(normString.topProducts[0].productId, '12345');
assert.equal(normString.topProducts[0].name, 'Product');
assert.equal(normString.topProducts[0].units, 3);
assert.equal(normString.topProducts[0].revenue, 4498.5);
assert.equal(normString.lowStock[0].stock, 2);
console.log('  ✓ String numbers coerced, dirty NaNs/Infinities sanitized to 0');

// ── Test 7: Formatter edge cases ──
console.log('Case 7: Formatters edge cases (undefined, null, NaN, strings, huge numbers)');
assert.equal(formatINR(undefined), '₹0.00');
assert.equal(formatINR(null), '₹0.00');
assert.equal(formatINR(NaN), '₹0.00');
assert.equal(formatINR('abc'), '₹0.00');
assert.equal(formatINR('1999.5'), '₹1,999.50');
assert.equal(formatINR(12345678.9), '₹1,23,45,678.90'); // Indian grouping lakhs/crores
assert.equal(formatNumber(1234567), '12,34,567');
assert.equal(formatCompactRupees(12345678.9), '1.2Cr');
assert.equal(formatCompactRupees(550000), '5.5L');
assert.equal(formatCompactRupees(25000), '25.0k');
assert.equal(formatCompactRupees(500), '500');
assert.equal(formatDayMonth('2026-11-16'), '16 Nov');
assert.equal(formatDayMonth('bad-date'), '');
assert.equal(formatDayMonth(null), '');
assert.equal(formatFullDate('2026-11-16'), '16 Nov 2026');
assert.equal(formatFullDate(undefined), '');
console.log('  ✓ Formatters safe against all edge cases and format Indian grouping accurately');

console.log('\nAll statsHelpers.test.mjs tests passed! ✓');

