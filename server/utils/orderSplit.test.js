const assert = require('node:assert/strict');
const { splitOrderBySeller } = require('./orderSplit');

console.log('Running orderSplit unit tests...\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Helper validator for all test results
function assertOrderInvariants(subOrders, { subtotal, totalAmount }) {
  assert(Array.isArray(subOrders), 'subOrders must be an array');
  assert(subOrders.length > 0, 'subOrders must not be empty');

  // 1. sum(subOrders.map(s => s.subtotal)) === subtotal
  const itemsSubtotal = subOrders.reduce((sum, s) => sum + s.subtotal, 0);
  assert(
    Math.abs(Math.round(itemsSubtotal * 100) - Math.round(subtotal * 100)) <= 1,
    `Sum of subOrder subtotals (${itemsSubtotal}) must match order subtotal (${subtotal})`
  );

  // 2. Math.round(sum(subOrders.map(s => s.amountDue)) * 100) === Math.round(totalAmount * 100)
  const sumAmountDuePaise = subOrders.reduce((sum, s) => sum + Math.round(s.amountDue * 100), 0);
  const totalAmountPaise = Math.round(totalAmount * 100);
  assert.equal(
    sumAmountDuePaise,
    totalAmountPaise,
    `Sum of subOrder amountDue in paise (${sumAmountDuePaise}) must exactly match totalAmount in paise (${totalAmountPaise})`
  );

  // 3. Verify subOrder properties
  for (const s of subOrders) {
    assert.equal(s.status, 'pending');
    assert.equal(s.codCollected, false);
    assert.equal(s.collectedBy, null);
    assert.equal(s.collectedAt, null);
    assert(typeof s.amountDue === 'number' && s.amountDue >= 0, 'amountDue must be a non-negative number');
    assert(Array.isArray(s.items) && s.items.length > 0, 'subOrder must have items');
    for (const item of s.items) {
      assert.equal(item.sellerId, s.sellerId, 'item sellerId snapshot must match subOrder sellerId');
    }
  }
}

// Case 1: Single seller
runTest('Case 1: Single seller', () => {
  const sellerId = 'seller_111';
  const items = [
    { product: 'prod_1', name: 'Earphones', price: 500, quantity: 1, sellerId }
  ];
  const subtotal = 500;
  const taxAmount = 40; // 8% of 500
  const shippingAmount = 99; // <= 1000
  const totalAmount = 639; // 500 + 40 + 99

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 1);
  assert.equal(result[0].sellerId, sellerId);
  assert.equal(result[0].subtotal, 500);
  assert.equal(result[0].amountDue, 639);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 2: Cartex only (sellerId: null)
runTest('Case 2: Cartex only (sellerId: null)', () => {
  const items = [
    { product: 'prod_2', name: 'Smart Watch', price: 1200, quantity: 1, sellerId: null }
  ];
  const subtotal = 1200;
  const taxAmount = 96; // 8% of 1200
  const shippingAmount = 0; // > 1000
  const totalAmount = 1296;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 1);
  assert.equal(result[0].sellerId, null);
  assert.equal(result[0].subtotal, 1200);
  assert.equal(result[0].amountDue, 1296);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 3: Two sellers
runTest('Case 3: Two sellers', () => {
  const sellerA = 'seller_aaa';
  const sellerB = 'seller_bbb';
  const items = [
    { product: 'prod_a', name: 'Shoes', price: 600, quantity: 1, sellerId: sellerA },
    { product: 'prod_b', name: 'Socks', price: 400, quantity: 1, sellerId: sellerB }
  ];
  const subtotal = 1000;
  const shippingAmount = 99;
  const taxAmount = 80;
  const totalAmount = 1179;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 2);
  assert.equal(result[0].sellerId, sellerA);
  assert.equal(result[1].sellerId, sellerB);
  assert.equal(result[0].subtotal, 600);
  assert.equal(result[1].subtotal, 400);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 4: Three groups including null (ordering preserved)
runTest('Case 4: Three groups including null (ordering preserved)', () => {
  const sellerA = 'seller_aaa';
  const sellerB = 'seller_bbb';
  const items = [
    { product: 'prod_a', name: 'Item A', price: 300, quantity: 1, sellerId: sellerA },
    { product: 'prod_c', name: 'Item Cartex', price: 500, quantity: 1, sellerId: null },
    { product: 'prod_b', name: 'Item B', price: 200, quantity: 1, sellerId: sellerB }
  ];
  const subtotal = 1000;
  const shippingAmount = 99;
  const taxAmount = 80;
  const totalAmount = 1179;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 3);
  assert.equal(result[0].sellerId, sellerA);
  assert.equal(result[1].sellerId, null);
  assert.equal(result[2].sellerId, sellerB);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 5: Quantity > 1
runTest('Case 5: Quantity > 1', () => {
  const sellerA = 'seller_aaa';
  const sellerB = 'seller_bbb';
  const items = [
    { product: 'prod_a', name: 'Item A', price: 150, quantity: 2, sellerId: sellerA }, // 300
    { product: 'prod_b', name: 'Item B', price: 250, quantity: 3, sellerId: sellerB }  // 750
  ];
  const subtotal = 1050;
  const shippingAmount = 0; // > 1000
  const taxAmount = 84; // 8% of 1050
  const totalAmount = 1134;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 2);
  assert.equal(result[0].subtotal, 300);
  assert.equal(result[1].subtotal, 750);
  assert.equal(result[0].items[0].quantity, 2);
  assert.equal(result[1].items[0].quantity, 3);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 6: Prepay discount applied (5% online)
runTest('Case 6: Prepay discount applied (5% online)', () => {
  const sellerA = 'seller_aaa';
  const sellerB = 'seller_bbb';
  const items = [
    { product: 'prod_a', name: 'Item A', price: 300, quantity: 1, sellerId: sellerA },
    { product: 'prod_b', name: 'Item B', price: 200, quantity: 1, sellerId: sellerB }
  ];
  const subtotal = 500;
  const prepayDiscount = 25; // 5% of 500
  const shippingAmount = 99;
  const taxAmount = 40;
  const totalAmount = 500 - 25 + 99 + 40; // 614

  const result = splitOrderBySeller({
    items,
    subtotal,
    taxAmount,
    shippingAmount,
    prepayDiscount,
    totalAmount
  });
  assert.equal(result.length, 2);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 7: Free-shipping (subtotal > 1000) and shipping-charged (subtotal <= 1000, 99)
runTest('Case 7: Free-shipping (subtotal > 1000) and shipping-charged (subtotal <= 1000, 99)', () => {
  // 7a: Free shipping
  const itemsFree = [
    { product: 'p1', name: 'Expensive Item', price: 1500, quantity: 1, sellerId: 's1' }
  ];
  const subtotalFree = 1500;
  const shippingFree = 0;
  const taxFree = 120; // 8%
  const totalFree = 1620;
  const resultFree = splitOrderBySeller({
    items: itemsFree,
    subtotal: subtotalFree,
    taxAmount: taxFree,
    shippingAmount: shippingFree,
    totalAmount: totalFree
  });
  assertOrderInvariants(resultFree, { subtotal: subtotalFree, totalAmount: totalFree });

  // 7b: Shipping charged
  const itemsCharged = [
    { product: 'p2', name: 'Inexpensive Item', price: 800, quantity: 1, sellerId: 's2' }
  ];
  const subtotalCharged = 800;
  const shippingCharged = 99;
  const taxCharged = 64; // 8%
  const totalCharged = 963;
  const resultCharged = splitOrderBySeller({
    items: itemsCharged,
    subtotal: subtotalCharged,
    taxAmount: taxCharged,
    shippingAmount: shippingCharged,
    totalAmount: totalCharged
  });
  assertOrderInvariants(resultCharged, { subtotal: subtotalCharged, totalAmount: totalCharged });
});

// Case 8: Awkward rounding (e.g. 3 groups dividing unevenly; assert sum of amountDue in paise matches totalAmount exactly)
runTest('Case 8: Awkward rounding (3 groups dividing unevenly)', () => {
  const seller1 = 'seller_1';
  const seller2 = 'seller_2';
  const seller3 = 'seller_3';
  const items = [
    { product: 'p1', name: 'Item 1', price: 333, quantity: 1, sellerId: seller1 },
    { product: 'p2', name: 'Item 2', price: 333, quantity: 1, sellerId: seller2 },
    { product: 'p3', name: 'Item 3', price: 334, quantity: 1, sellerId: seller3 }
  ];
  const subtotal = 1000;
  const shippingAmount = 99;
  const taxAmount = 80;
  const totalAmount = 1179;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 3);
  assertOrderInvariants(result, { subtotal, totalAmount });

  // Verify that the sum in paise is strictly identical to totalAmount * 100
  const paiseSum = result.reduce((acc, s) => acc + Math.round(s.amountDue * 100), 0);
  assert.equal(paiseSum, 117900);
});

// Case 9: Non-contiguous items from same seller (grouped in first-seen order)
runTest('Case 9: Non-contiguous items from same seller (grouped in first-seen order)', () => {
  const sellerA = 'seller_aaa';
  const sellerB = 'seller_bbb';
  const items = [
    { product: 'p1', name: 'Item A1', price: 100, quantity: 1, sellerId: sellerA },
    { product: 'p2', name: 'Item B1', price: 200, quantity: 1, sellerId: sellerB },
    { product: 'p3', name: 'Item A2', price: 300, quantity: 1, sellerId: sellerA }
  ];
  const subtotal = 600;
  const shippingAmount = 99;
  const taxAmount = 48;
  const totalAmount = 747;

  const result = splitOrderBySeller({ items, subtotal, taxAmount, shippingAmount, totalAmount });
  assert.equal(result.length, 2, 'Should combine non-contiguous items of sellerA into one subOrder');
  assert.equal(result[0].sellerId, sellerA);
  assert.equal(result[1].sellerId, sellerB);
  assert.equal(result[0].items.length, 2);
  assert.equal(result[0].items[0].product, 'p1');
  assert.equal(result[0].items[1].product, 'p3');
  assert.equal(result[0].subtotal, 400);
  assert.equal(result[1].subtotal, 200);
  assertOrderInvariants(result, { subtotal, totalAmount });
});

// Case 10: Empty items / inconsistent totals (assert throws error)
runTest('Case 10: Empty items / inconsistent totals (assert throws error)', () => {
  // 10a: empty items array
  assert.throws(
    () => splitOrderBySeller({ items: [], subtotal: 0, totalAmount: 0 }),
    /Items array cannot be empty/
  );

  // 10b: null items
  assert.throws(
    () => splitOrderBySeller({ items: null, subtotal: 0, totalAmount: 0 }),
    /Items array cannot be empty/
  );

  // 10c: missing/invalid totalAmount
  assert.throws(
    () => splitOrderBySeller({ items: [{ product: 'p', price: 10, quantity: 1 }], subtotal: 10 }),
    /Valid totalAmount is required/
  );

  // 10d: inconsistent order totals (discrepancy > 1 paisa)
  assert.throws(
    () =>
      splitOrderBySeller({
        items: [{ product: 'p', price: 100, quantity: 1 }],
        subtotal: 100,
        taxAmount: 8,
        shippingAmount: 99,
        prepayDiscount: 0,
        totalAmount: 300 // Should be 207, 300 is wrong
      }),
    /Inconsistent order totals/
  );

  // 10e: sum of items != subtotal (discrepancy > 1 paisa)
  assert.throws(
    () =>
      splitOrderBySeller({
        items: [{ product: 'p', price: 100, quantity: 1 }],
        subtotal: 200, // item is 100
        taxAmount: 16,
        shippingAmount: 99,
        prepayDiscount: 0,
        totalAmount: 315
      }),
    /Inconsistent items total/
  );
});

console.log(`\nAll ${passedTests} test suites passed successfully!`);

