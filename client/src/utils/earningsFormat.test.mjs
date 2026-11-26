import assert from 'node:assert';
import {
  formatRupees,
  formatRate,
  monthLabel,
  formatIstDate,
  formatIstDateTime,
  netLabel,
  isMonthEnded,
  normalizeEarnings,
  normalizeAdminCommissions
} from './earningsFormat.js';

console.log('[MOCK] Starting earningsFormat unit tests...');

// 1. formatRupees
{
  assert.strictEqual(formatRupees(1799.1), '₹1,799.10');
  assert.strictEqual(formatRupees(0), '₹0.00');
  assert.strictEqual(formatRupees(-359.82), '-₹359.82');
  assert.strictEqual(formatRupees('1234.5'), '₹1,234.50');
  assert.strictEqual(formatRupees(null), '₹0.00');
  assert.strictEqual(formatRupees(undefined), '₹0.00');
  assert.strictEqual(formatRupees(NaN), '₹0.00');
  console.log('[MOCK] ✓ formatRupees cases passed');
}

// 2. formatRate
{
  assert.strictEqual(formatRate(10), '10%');
  assert.strictEqual(formatRate(12.5), '12.5%');
  assert.strictEqual(formatRate('10.25'), '10.25%');
  assert.strictEqual(formatRate(0), '0%');
  console.log('[MOCK] ✓ formatRate cases passed');
}

// 3. monthLabel (December to January boundary, standard months)
{
  assert.strictEqual(monthLabel('2026-11'), 'November 2026');
  assert.strictEqual(monthLabel('2026-12'), 'December 2026');
  assert.strictEqual(monthLabel('2027-01'), 'January 2027');
  assert.strictEqual(monthLabel('invalid'), 'invalid');
  assert.strictEqual(monthLabel(null), '');
  console.log('[MOCK] ✓ monthLabel boundary cases passed');
}

// 4. netLabel (seller & admin, positive, negative, zero)
{
  const sPos = netLabel(1799.1, 'seller');
  assert.strictEqual(sPos.text, 'Cartex pays you ₹1,799.10');
  assert.strictEqual(sPos.direction, 'payable');

  const sNeg = netLabel(-359.82, 'seller');
  assert.strictEqual(sNeg.text, 'You owe Cartex ₹359.82');
  assert.strictEqual(sNeg.direction, 'receivable');

  const sZero = netLabel(0, 'seller');
  assert.strictEqual(sZero.text, 'Nothing due');
  assert.strictEqual(sZero.direction, 'neutral');

  const aPos = netLabel(1799.1, 'admin');
  assert.strictEqual(aPos.text, 'Payable to seller (₹1,799.10)');
  assert.strictEqual(aPos.direction, 'payable');

  const aNeg = netLabel(-359.82, 'admin');
  assert.strictEqual(aNeg.text, 'Receivable from seller (₹359.82)');
  assert.strictEqual(aNeg.direction, 'receivable');

  const aZero = netLabel(0, 'admin');
  assert.strictEqual(aZero.text, 'Nothing due');
  console.log('[MOCK] ✓ netLabel directions and values passed');
}

// 5. isMonthEnded (boundary checks)
{
  // 2026-11 ends at 2026-11-30T18:30:00.000Z UTC
  assert.strictEqual(isMonthEnded('2026-11', new Date('2026-11-30T18:29:59.999Z')), false);
  assert.strictEqual(isMonthEnded('2026-11', new Date('2026-11-30T18:30:00.000Z')), true);
  assert.strictEqual(isMonthEnded('2026-11', new Date('2026-12-01T00:00:00.000Z')), true);
  // Future month
  assert.strictEqual(isMonthEnded('2099-05', new Date('2026-11-26T00:00:00.000Z')), false);
  console.log('[MOCK] ✓ isMonthEnded calculations passed');
}

// 6. formatIstDate & formatIstDateTime
{
  // 2026-11-15T06:01:13.209Z + 5:30 = 2026-11-15 11:31:13.209 IST
  const dStr = '2026-11-15T06:01:13.209Z';
  const formattedDate = formatIstDate(dStr);
  assert(formattedDate.includes('15') && formattedDate.includes('Nov') && formattedDate.includes('2026'));
  const formattedDateTime = formatIstDateTime(dStr);
  assert(formattedDateTime.includes('15') && formattedDateTime.includes('Nov') && formattedDateTime.includes('11:31'));
  console.log('[MOCK] ✓ formatIstDate and formatIstDateTime passed');
}

// 7. normalizeEarnings (missing, string numbers, nulls)
{
  const empty = normalizeEarnings(null);
  assert.strictEqual(empty.status, 'open');
  assert.strictEqual(empty.totals.gross, 0);
  assert.deepStrictEqual(empty.lines, []);

  const rawDirty = {
    month: '2026-11',
    isClosed: 1,
    status: 'settled',
    statementId: 12345,
    totals: {
      parts: '5',
      gross: '1000.50',
      commission: '100.05',
      earnings: '900.45',
      codCashHeld: null,
      net: undefined
    },
    lines: [
      {
        orderId: 999,
        gross: '500',
        commissionRate: '10',
        paymentMethod: 'COD'
      }
    ],
    linesTruncated: 1
  };
  const norm = normalizeEarnings(rawDirty);
  assert.strictEqual(norm.isClosed, true);
  assert.strictEqual(norm.status, 'settled');
  assert.strictEqual(norm.statementId, '12345');
  assert.strictEqual(norm.totals.parts, 5);
  assert.strictEqual(norm.totals.gross, 1000.50);
  assert.strictEqual(norm.totals.codCashHeld, 0);
  assert.strictEqual(norm.totals.net, 0);
  assert.strictEqual(norm.lines[0].orderId, '999');
  assert.strictEqual(norm.lines[0].paymentMethod, 'cod');
  assert.strictEqual(norm.lines[0].gross, 500);
  assert.strictEqual(norm.linesTruncated, true);
  console.log('[MOCK] ✓ normalizeEarnings defensive defaults passed');
}

// 8. normalizeAdminCommissions (missing, string numbers, nulls)
{
  const empty = normalizeAdminCommissions(undefined);
  assert.strictEqual(empty.isClosed, false);
  assert.strictEqual(empty.platformTotals.gross, 0);
  assert.deepStrictEqual(empty.sellers, []);

  const dirtyAdmin = {
    month: '2026-11',
    isClosable: 0,
    platformTotals: { gross: '1999', commission: '199.9' },
    cartexDirect: { parts: '8', gross: '10992' },
    sellers: [
      {
        sellerId: 's1',
        sellerName: 'Store 1',
        totals: { gross: '1999', net: '-359.82' }
      }
    ]
  };
  const normAdmin = normalizeAdminCommissions(dirtyAdmin);
  assert.strictEqual(normAdmin.platformTotals.gross, 1999);
  assert.strictEqual(normAdmin.cartexDirect.parts, 8);
  assert.strictEqual(normAdmin.cartexDirect.gross, 10992);
  assert.strictEqual(normAdmin.sellers[0].totals.gross, 1999);
  assert.strictEqual(normAdmin.sellers[0].totals.net, -359.82);
  console.log('[MOCK] ✓ normalizeAdminCommissions defensive defaults passed');
}

console.log('[MOCK] ALL EARNINGS FORMAT UNIT TESTS PASSED!');
