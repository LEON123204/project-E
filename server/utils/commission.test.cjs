'use strict';
/**
 * commission.test.cjs — unit + property tests for commission.js
 * Run: node server/utils/commission.test.cjs
 * All inputs are MOCK (hand-written / generated).
 */
const assert = require('assert');
const { validateRatePercent, computeCommission, applyCommissionToSubOrders } = require('./commission.js');

let passed = 0;
let failed = 0;

function ok(label, fn) {
  try {
    fn();
    console.log('  PASS [MOCK] ' + label);
    passed++;
  } catch (e) {
    console.error('  FAIL [MOCK] ' + label + ' — ' + e.message);
    failed++;
  }
}

// ── computeCommission: specific cases ─────────────────────────────────────────
console.log('\n=== computeCommission: specific cases ===');

ok('(1999, 10) → commissionAmount=199.9  sellerNet=1799.1', () => {
  const r = computeCommission(1999, 10);
  assert.strictEqual(r.commissionAmount, 199.9);
  assert.strictEqual(r.sellerNet, 1799.1);
});

ok('(333.33, 12.5) → commissionAmount=41.67  sellerNet=291.66', () => {
  const r = computeCommission(333.33, 12.5);
  assert.strictEqual(r.commissionAmount, 41.67);
  assert.strictEqual(r.sellerNet, 291.66);
});

ok('(0.1, 10) → commissionAmount=0.01  sellerNet=0.09', () => {
  const r = computeCommission(0.1, 10);
  assert.strictEqual(r.commissionAmount, 0.01);
  assert.strictEqual(r.sellerNet, 0.09);
});

ok('(1, 0.01) → commissionAmount=0  sellerNet=1', () => {
  const r = computeCommission(1, 0.01);
  assert.strictEqual(r.commissionAmount, 0);
  assert.strictEqual(r.sellerNet, 1);
});

ok('(999.99, 50) → commissionAmount=500  sellerNet=499.99 (half-up rounding)', () => {
  const r = computeCommission(999.99, 50);
  assert.strictEqual(r.commissionAmount, 500);
  assert.strictEqual(r.sellerNet, 499.99);
});

ok('rate=0 → commissionAmount=0  sellerNet=subtotal', () => {
  const r = computeCommission(1234.56, 0);
  assert.strictEqual(r.commissionAmount, 0);
  assert.strictEqual(r.sellerNet, 1234.56);
});

ok('subtotal=0 → commissionAmount=0  sellerNet=0', () => {
  const r = computeCommission(0, 10);
  assert.strictEqual(r.commissionAmount, 0);
  assert.strictEqual(r.sellerNet, 0);
});

ok('large subtotal (9999999.99, 10) — no crash, identity holds', () => {
  const r = computeCommission(9999999.99, 10);
  const subtotalPaise = Math.round(9999999.99 * 100);
  const commissionPaise = Math.round(r.commissionAmount * 100);
  const netPaise = Math.round(r.sellerNet * 100);
  assert.strictEqual(commissionPaise + netPaise, subtotalPaise);
});

// ── computeCommission: throws ─────────────────────────────────────────────────
console.log('\n=== computeCommission: bad subtotals throw ===');

ok('negative subtotal throws', () => {
  assert.throws(() => computeCommission(-1, 10), /subtotal/);
});

ok('NaN subtotal throws', () => {
  assert.throws(() => computeCommission(NaN, 10), /subtotal/);
});

ok('Infinity subtotal throws', () => {
  assert.throws(() => computeCommission(Infinity, 10), /subtotal/);
});

// ── validateRatePercent: accept ───────────────────────────────────────────────
console.log('\n=== validateRatePercent: accepts ===');

for (const v of [0, 10, 12.5, 50, 0.01]) {
  ok('accepts ' + v, () => {
    assert.strictEqual(validateRatePercent(v), true);
  });
}

// ── validateRatePercent: reject ───────────────────────────────────────────────
console.log('\n=== validateRatePercent: rejects ===');

const REJECTS = [
  [-1,        '-1'],
  [50.01,     '50.01'],
  [10.123,    '10.123'],
  ['10',      '"10" (string)'],
  [null,      'null'],
  [undefined, 'undefined'],
  [NaN,       'NaN'],
  [Infinity,  'Infinity'],
  [[],        '[]'],
  [{},        '{}'],
  [true,      'true'],
];

for (const [val, label] of REJECTS) {
  ok('rejects ' + label, () => {
    assert.throws(() => validateRatePercent(val));
  });
}

// ── applyCommissionToSubOrders tests ───────────────────────────────────────────
console.log('\n=== applyCommissionToSubOrders: test cases ===');

ok('mixed sellers: seller parts get rate/commission, Cartex parts get 0/0', () => {
  const input = [
    { sellerId: 'seller_1', subtotal: 1999, items: [] },
    { sellerId: null, subtotal: 500, items: [] },
    { sellerId: 'seller_2', subtotal: 333.33, items: [] },
  ];
  const out = applyCommissionToSubOrders(input, 10);
  assert.strictEqual(out.length, 3);
  // seller_1
  assert.strictEqual(out[0].sellerId, 'seller_1');
  assert.strictEqual(out[0].commissionRate, 10);
  assert.strictEqual(out[0].commissionAmount, 199.9);
  // Cartex (null sellerId)
  assert.strictEqual(out[1].sellerId, null);
  assert.strictEqual(out[1].commissionRate, 0);
  assert.strictEqual(out[1].commissionAmount, 0);
  // seller_2
  assert.strictEqual(out[2].sellerId, 'seller_2');
  assert.strictEqual(out[2].commissionRate, 10);
  assert.strictEqual(out[2].commissionAmount, 33.33);
});

ok('all Cartex: every part has sellerId null -> rate 0, amount 0', () => {
  const input = [
    { sellerId: null, subtotal: 1000, items: [] },
    { sellerId: null, subtotal: 2500, items: [] },
  ];
  const out = applyCommissionToSubOrders(input, 12.5);
  assert.strictEqual(out[0].commissionRate, 0);
  assert.strictEqual(out[0].commissionAmount, 0);
  assert.strictEqual(out[1].commissionRate, 0);
  assert.strictEqual(out[1].commissionAmount, 0);
});

ok('rate 0%: seller parts get rate 0 and amount 0', () => {
  const input = [
    { sellerId: 'seller_1', subtotal: 2000, items: [] },
    { sellerId: null, subtotal: 500, items: [] },
  ];
  const out = applyCommissionToSubOrders(input, 0);
  assert.strictEqual(out[0].commissionRate, 0);
  assert.strictEqual(out[0].commissionAmount, 0);
  assert.strictEqual(out[1].commissionRate, 0);
  assert.strictEqual(out[1].commissionAmount, 0);
});

ok('rate 50%: max rate applied accurately', () => {
  const input = [
    { sellerId: 'seller_1', subtotal: 1000, items: [] },
    { sellerId: null, subtotal: 500, items: [] },
  ];
  const out = applyCommissionToSubOrders(input, 50);
  assert.strictEqual(out[0].commissionRate, 50);
  assert.strictEqual(out[0].commissionAmount, 500);
  assert.strictEqual(out[1].commissionRate, 0);
  assert.strictEqual(out[1].commissionAmount, 0);
});

ok('rounding case: (333.33, 12.5%) -> 41.67 commissionAmount', () => {
  const input = [
    { sellerId: 'seller_1', subtotal: 333.33, items: [] },
    { sellerId: 'seller_2', subtotal: 999.99, items: [] },
  ];
  const out = applyCommissionToSubOrders(input, 12.5);
  assert.strictEqual(out[0].commissionRate, 12.5);
  assert.strictEqual(out[0].commissionAmount, 41.67);
  // 999.99 * 12.5% = 124.99875 -> 125.00
  assert.strictEqual(out[1].commissionRate, 12.5);
  assert.strictEqual(out[1].commissionAmount, 125);
});

ok('input not mutated: original subOrders array and objects unchanged', () => {
  const originalItem1 = { sellerId: 'seller_1', subtotal: 1500, items: [] };
  const originalItem2 = { sellerId: null, subtotal: 800, items: [] };
  const input = [originalItem1, originalItem2];
  const inputSnapshot = JSON.stringify(input);

  const out = applyCommissionToSubOrders(input, 15);

  assert.notStrictEqual(out, input, 'returned array must be a new array');
  assert.notStrictEqual(out[0], originalItem1, 'returned item 0 must be a new object');
  assert.notStrictEqual(out[1], originalItem2, 'returned item 1 must be a new object');
  assert.strictEqual(originalItem1.commissionRate, undefined, 'originalItem1 must not have commissionRate');
  assert.strictEqual(originalItem1.commissionAmount, undefined, 'originalItem1 must not have commissionAmount');
  assert.strictEqual(originalItem2.commissionRate, undefined, 'originalItem2 must not have commissionRate');
  assert.strictEqual(originalItem2.commissionAmount, undefined, 'originalItem2 must not have commissionAmount');
  assert.strictEqual(JSON.stringify(input), inputSnapshot, 'input array serialization must be identical');
});

// ── 2000-case property test ───────────────────────────────────────────────────
console.log('\n=== 2000-case property test (fixed LCG seed) ===');

// Simple LCG: seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
let seed = 42;
function lcgNext() {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
  // treat as unsigned
  return (seed >>> 0);
}

let propPassed = 0;
let propFailed = 0;

for (let i = 0; i < 2000; i++) {
  // subtotal: 0.01 to 100000.00 in paise steps → 1 to 10000000 paise
  const subtotalPaise = (lcgNext() % 10000000) + 1;      // 1..10000000
  const subtotal = subtotalPaise / 100;
  // rate: 0 to 50 in 0.01 steps → 0 to 5000 bps
  const rateBps = lcgNext() % 5001;                       // 0..5000
  // Use parseFloat(toFixed(2)) to produce the exact same float validateRatePercent accepts.
  const rate = parseFloat((rateBps / 100).toFixed(2));

  try {
    const r = computeCommission(subtotal, rate);
    // Recompute expected paise using the same formula as commission.js to avoid FP drift.
    const expectedCommissionPaise = Math.round(subtotalPaise * Math.round(rate * 100) / 10000);
    const expectedNetPaise = subtotalPaise - expectedCommissionPaise;
    // Convert results back to paise for comparison (may drift by at most 1 paise due to /100).
    const cPaise = Math.round(r.commissionAmount * 100);
    const nPaise = Math.round(r.sellerNet * 100);
    assert.strictEqual(cPaise, expectedCommissionPaise,
      `commissionAmount paise mismatch: got ${cPaise} expected ${expectedCommissionPaise}`);
    assert.strictEqual(nPaise, expectedNetPaise,
      `sellerNet paise mismatch: got ${nPaise} expected ${expectedNetPaise}`);
    assert.strictEqual(cPaise + nPaise, subtotalPaise,
      `identity failed: sum ${cPaise + nPaise} !== ${subtotalPaise}`);
    // non-negative
    assert.ok(r.commissionAmount >= 0, 'commissionAmount negative');
    assert.ok(r.sellerNet >= 0, 'sellerNet negative');
    propPassed++;
  } catch (e) {
    console.error('  PROP FAIL case ' + i + ': subtotal=' + subtotal +
      ' rate=' + rate + ' — ' + (e.message || e));
    propFailed++;
  }
}

console.log('  [MOCK] property test: ' + propPassed + ' passed, ' + propFailed + ' failed');
if (propFailed > 0) failed += propFailed;
else passed += propPassed;

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n=== Summary ===');
console.log('[MOCK] Total unit cases : ' + (passed + failed - propPassed));
console.log('[MOCK] Total property cases : ' + (propPassed + propFailed));
console.log('[MOCK] PASSED : ' + passed);
console.log('[MOCK] FAILED : ' + failed);
if (failed > 0) {
  console.error('[MOCK] *** SOME TESTS FAILED ***');
  process.exit(1);
} else {
  console.log('[MOCK] All tests passed.');
  process.exit(0);
}
