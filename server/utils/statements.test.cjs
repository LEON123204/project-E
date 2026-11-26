'use strict';

const assert = require('assert');
const {
  IST_OFFSET_MS,
  istMonthKey,
  istMonthBounds,
  isMonthClosable,
  partSettleableAt,
  partLine,
  computeStatement
} = require('./statements');

console.log('[MOCK] Starting statements utility unit tests...');

// 1. IST Boundaries tests
{
  // 2026-10-31T18:29:59.999Z + 5:30 = 2026-10-31 23:59:59.999 IST -> '2026-10'
  assert.strictEqual(istMonthKey(new Date('2026-10-31T18:29:59.999Z')), '2026-10');
  
  // 2026-10-31T18:30:00.000Z + 5:30 = 2026-11-01 00:00:00.000 IST -> '2026-11'
  assert.strictEqual(istMonthKey(new Date('2026-10-31T18:30:00.000Z')), '2026-11');
  
  // 2026-12-31T18:30:00.000Z + 5:30 = 2027-01-01 00:00:00.000 IST -> '2027-01'
  assert.strictEqual(istMonthKey(new Date('2026-12-31T18:30:00.000Z')), '2027-01');

  // Leap day 2028-02-29
  assert.strictEqual(istMonthKey(new Date('2028-02-29T12:00:00.000Z')), '2028-02');
  assert.strictEqual(istMonthKey(new Date('2028-02-29T18:29:59.999Z')), '2028-02');
  assert.strictEqual(istMonthKey(new Date('2028-02-29T18:30:00.000Z')), '2028-03');

  console.log('[MOCK] ✓ IST date conversion boundaries passed');
}

// 2. istMonthBounds tests
{
  const b1 = istMonthBounds('2026-11');
  // Start: 2026-11-01 00:00:00 IST -> 2026-10-31 18:30:00 UTC
  assert.strictEqual(b1.start.toISOString(), '2026-10-31T18:30:00.000Z');
  // End: 2026-12-01 00:00:00 IST -> 2026-11-30 18:30:00 UTC
  assert.strictEqual(b1.end.toISOString(), '2026-11-30T18:30:00.000Z');

  const bYearEnd = istMonthBounds('2026-12');
  assert.strictEqual(bYearEnd.start.toISOString(), '2026-11-30T18:30:00.000Z');
  assert.strictEqual(bYearEnd.end.toISOString(), '2026-12-31T18:30:00.000Z');

  // Validation
  assert.throws(() => istMonthBounds('invalid'), /Month key must be in YYYY-MM format/);
  assert.throws(() => istMonthBounds('2026-13'), /Month key must be in YYYY-MM format/);
  assert.throws(() => istMonthBounds('2026-00'), /Month key must be in YYYY-MM format/);
  assert.throws(() => istMonthBounds('2020-05'), /Month year must be between 2024 and 2100/);

  console.log('[MOCK] ✓ istMonthBounds calculations and validations passed');
}

// 3. isMonthClosable tests
{
  // 2026-11 ends at 2026-11-30T18:30:00.000Z
  assert.strictEqual(isMonthClosable('2026-11', new Date('2026-11-30T18:29:59.999Z')), false);
  assert.strictEqual(isMonthClosable('2026-11', new Date('2026-11-30T18:30:00.000Z')), true);
  assert.strictEqual(isMonthClosable('2026-11', new Date('2026-12-05T00:00:00.000Z')), true);

  console.log('[MOCK] ✓ isMonthClosable passed');
}

// 4. partSettleableAt tests
{
  const deliveredAt = new Date('2026-11-10T10:00:00.000Z');
  const collectedAt = new Date('2026-11-12T10:00:00.000Z');
  const sellerId = '6aeea0a6db96712a914b76f0';

  // Online order paid -> settles at deliveredAt
  const onlineOrder = { paymentMethod: 'online', paymentStatus: 'paid' };
  const onlineSub = { sellerId, status: 'delivered', deliveredAt, commissionRate: 10 };
  assert.strictEqual(partSettleableAt(onlineOrder, onlineSub)?.toISOString(), deliveredAt.toISOString());

  // Online order unpaid -> null
  assert.strictEqual(partSettleableAt({ paymentMethod: 'online', paymentStatus: 'unpaid' }, onlineSub), null);

  // COD order collected -> settles at collectedAt (if later)
  const codOrder = { paymentMethod: 'cod', paymentStatus: 'pending' };
  const codSub = { sellerId, status: 'delivered', deliveredAt, collectedAt, codCollected: true, commissionRate: 10 };
  assert.strictEqual(partSettleableAt(codOrder, codSub)?.toISOString(), collectedAt.toISOString());

  // COD order uncollected -> null
  assert.strictEqual(partSettleableAt(codOrder, { ...codSub, codCollected: false }), null);

  // Delivered in one month, collected in next month -> settlement falls in collected month
  const codCrossMonth = {
    ...codSub,
    deliveredAt: new Date('2026-10-31T10:00:00.000Z'),
    collectedAt: new Date('2026-11-01T10:00:00.000Z')
  };
  const settledCross = partSettleableAt(codOrder, codCrossMonth);
  assert.strictEqual(istMonthKey(settledCross), '2026-11');

  // Cartex direct (sellerId == null) -> null
  assert.strictEqual(partSettleableAt(onlineOrder, { ...onlineSub, sellerId: null }), null);

  // Status not delivered (shipped/pending/cancelled) -> null
  assert.strictEqual(partSettleableAt(onlineOrder, { ...onlineSub, status: 'shipped' }), null);
  assert.strictEqual(partSettleableAt(onlineOrder, { ...onlineSub, status: 'pending' }), null);
  assert.strictEqual(partSettleableAt(onlineOrder, { ...onlineSub, status: 'cancelled' }), null);

  // null commissionRate -> null
  assert.strictEqual(partSettleableAt(onlineOrder, { ...onlineSub, commissionRate: null }), null);

  console.log('[MOCK] ✓ partSettleableAt edge cases passed');
}

// 5. Worked examples & math identities
{
  // Example 1: Online order subtotal 1999 @ 10%, amountDue 2058.97
  // gross: 1999, commission: 199.90, earnings: 1799.10, codCashHeld: 0, net: +1799.10
  const order1 = { _id: 'o1', paymentMethod: 'online', paymentStatus: 'paid' };
  const sub1 = {
    _id: 's1',
    sellerId: 'sel1',
    subtotal: 1999,
    commissionAmount: 199.90,
    commissionRate: 10,
    amountDue: 2058.97,
    status: 'delivered',
    deliveredAt: new Date('2026-11-05T10:00:00Z')
  };
  const line1 = partLine(order1, sub1);
  assert.strictEqual(line1.gross, 1999);
  assert.strictEqual(line1.commission, 199.90);
  assert.strictEqual(line1.earnings, 1799.10);
  assert.strictEqual(line1.codCashHeld, 0);
  assert.strictEqual(line1.net, 1799.10);

  // Example 2: COD order subtotal 1999 @ 10%, amountDue 2158.92 (collected)
  // gross: 1999, commission: 199.90, earnings: 1799.10, codCashHeld: 2158.92, net: -359.82
  const order2 = { _id: 'o2', paymentMethod: 'cod', paymentStatus: 'pending' };
  const sub2 = {
    _id: 's2',
    sellerId: 'sel1',
    subtotal: 1999,
    commissionAmount: 199.90,
    commissionRate: 10,
    amountDue: 2158.92,
    codCollected: true,
    collectedAt: new Date('2026-11-06T10:00:00Z'),
    status: 'delivered',
    deliveredAt: new Date('2026-11-05T10:00:00Z')
  };
  const line2 = partLine(order2, sub2);
  assert.strictEqual(line2.gross, 1999);
  assert.strictEqual(line2.commission, 199.90);
  assert.strictEqual(line2.earnings, 1799.10);
  assert.strictEqual(line2.codCashHeld, 2158.92);
  assert.strictEqual(line2.net, -359.82);

  // Compute statement with line1 + line2
  const stmt = computeStatement([line1, line2]);
  assert.strictEqual(stmt.parts, 2);
  assert.strictEqual(stmt.gross, 3998);
  assert.strictEqual(stmt.commission, 399.80);
  assert.strictEqual(stmt.earnings, 3598.20);
  assert.strictEqual(stmt.codCashHeld, 2158.92);
  assert.strictEqual(stmt.net, 1439.28);

  // Empty statement
  const emptyStmt = computeStatement([]);
  assert.deepStrictEqual(emptyStmt, {
    parts: 0,
    gross: 0,
    commission: 0,
    earnings: 0,
    codCashHeld: 0,
    net: 0
  });

  console.log('[MOCK] ✓ Worked examples passed');
}

// 6. Property test: 2000 randomized cases with fixed seed LCG
{
  let seed = 42;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  const generatedLines = [];
  for (let i = 0; i < 2000; i++) {
    const subtotal = Math.round((rnd() * 10000 + 1) * 100) / 100;
    const rate = Math.round((rnd() * 40 + 5) * 100) / 100;
    const isCod = rnd() > 0.5;
    const amountDue = Math.round((subtotal * 1.05 + 50) * 100) / 100;
    
    const subtotalPaise = Math.round(subtotal * 100);
    const bps = Math.round(rate * 100);
    const commissionPaise = Math.round((subtotalPaise * bps) / 10000);
    const commissionAmount = commissionPaise / 100;

    const dummyOrder = { _id: 'o' + i, paymentMethod: isCod ? 'cod' : 'online', paymentStatus: 'paid' };
    const dummySub = {
      _id: 's' + i,
      sellerId: 'sel' + (i % 3),
      subtotal,
      commissionAmount,
      commissionRate: rate,
      amountDue,
      codCollected: isCod,
      collectedAt: new Date(),
      status: 'delivered',
      deliveredAt: new Date()
    };

    const l = partLine(dummyOrder, dummySub);
    // Line assertions
    assert.strictEqual(l.grossPaise - l.commissionPaise, l.earningsPaise);
    assert.strictEqual(l.earningsPaise - l.codCashHeldPaise, l.netPaise);
    generatedLines.push(l);
  }

  const bigStmt = computeStatement(generatedLines);
  assert.strictEqual(bigStmt.parts, 2000);
  assert.strictEqual(
    Math.round((bigStmt.gross - bigStmt.commission) * 100),
    Math.round(bigStmt.earnings * 100)
  );
  assert.strictEqual(
    Math.round((bigStmt.earnings - bigStmt.codCashHeld) * 100),
    Math.round(bigStmt.net * 100)
  );

  console.log('[MOCK] ✓ 2000 randomized property tests passed');
}

console.log('[MOCK] ALL STATEMENTS UNIT TESTS PASSED!');
