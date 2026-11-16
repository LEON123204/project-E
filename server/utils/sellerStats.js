/**
 * Pure helper functions for seller sales stats (Stage 6-1).
 * Pure functions: no DB access, no req/res.
 */

/**
 * Convert rupee amount to integer paise (prevents floating point errors).
 * @param {number|string} val 
 * @returns {number} integer paise
 */
function toPaise(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer paise back to rupees with 2 decimal places.
 * @param {number} paise 
 * @returns {number} float rounded to 2 decimals
 */
function toRupees(paise) {
  const p = Number(paise);
  if (Number.isNaN(p)) return 0;
  return Number((Math.round(p) / 100).toFixed(2));
}

/**
 * Format a Date object or ISO string as 'YYYY-MM-DD' in UTC.
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDateUTC(date) {
  const d = new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns an array of date strings 'YYYY-MM-DD' in UTC for the last N days including referenceDate.
 * Sorted chronologically ascending (oldest first, referenceDate last).
 * @param {number} range 
 * @param {Date} [referenceDate] 
 * @returns {string[]}
 */
function getUTCDatesList(range, referenceDate = new Date()) {
  const list = [];
  const y = referenceDate.getUTCFullYear();
  const m = referenceDate.getUTCMonth();
  const d = referenceDate.getUTCDate();

  for (let i = range - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m, d - i));
    list.push(formatDateUTC(dt));
  }
  return list;
}

/**
 * Returns true if an order is visible to sellers.
 * Sellers only see COD orders or orders that have been paid online.
 * @param {Object} order 
 * @returns {boolean}
 */
function isOrderVisibleToSeller(order) {
  if (!order) return false;
  const pm = (order.paymentMethod || '').toLowerCase();
  const ps = (order.paymentStatus || '').toLowerCase();
  return pm === 'cod' || ps === 'paid';
}

/**
 * Computes totals, dailySeries, and topProducts from unwound seller subOrder items.
 *
 * @param {Object} params
 * @param {Array} params.unwoundItems Array of { createdAt: Date|string, subOrder: Object }
 * @param {number} [params.range=30] 7, 30, or 90
 * @param {Date} [params.referenceDate=new Date()]
 * @returns {Object} { totals, dailySeries, topProducts }
 */
function computeTotalsAndSeries({ unwoundItems = [], range = 30, referenceDate = new Date() }) {
  const datesList = getUTCDatesList(range, referenceDate);
  const dailyMap = {};
  for (const dt of datesList) {
    dailyMap[dt] = { revenuePaise: 0, orders: 0 };
  }

  const ordersByStatus = {
    pending: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  };

  let ordersCounted = 0;
  let earnedRevenuePaise = 0;
  let inProgressRevenuePaise = 0;
  let unitsSold = 0;
  const productMap = {};

  for (const item of unwoundItems) {
    const sub = item.subOrder || {};
    const status = sub.status || 'pending';

    if (ordersByStatus.hasOwnProperty(status)) {
      ordersByStatus[status]++;
    }

    // Cancelled subOrders NEVER count toward revenue, units, topProducts, or dailySeries
    if (status === 'cancelled') {
      continue;
    }

    ordersCounted++;
    const subtotalPaise = toPaise(sub.subtotal);

    if (status === 'delivered') {
      earnedRevenuePaise += subtotalPaise;
    } else if (status === 'pending' || status === 'shipped') {
      inProgressRevenuePaise += subtotalPaise;
    }

    const dateKey = formatDateUTC(item.createdAt);
    if (dailyMap.hasOwnProperty(dateKey)) {
      dailyMap[dateKey].revenuePaise += subtotalPaise;
      dailyMap[dateKey].orders += 1;
    }

    for (const prodItem of (sub.items || [])) {
      const qty = Number(prodItem.quantity) || 1;
      unitsSold += qty;

      const pId = prodItem.product ? prodItem.product.toString() : 'unknown';
      if (!productMap[pId]) {
        productMap[pId] = {
          productId: pId,
          name: prodItem.name || 'Product',
          units: 0,
          revenuePaise: 0
        };
      }
      productMap[pId].units += qty;
      productMap[pId].revenuePaise += toPaise((prodItem.price || 0) * qty);
    }
  }

  const earnedRevenue = toRupees(earnedRevenuePaise);
  const inProgressRevenue = toRupees(inProgressRevenuePaise);
  const totalRevenuePaise = earnedRevenuePaise + inProgressRevenuePaise;
  const averageOrderValue = ordersCounted > 0
    ? toRupees(Math.round(totalRevenuePaise / ordersCounted))
    : 0;

  const totals = {
    earnedRevenue,
    inProgressRevenue,
    ordersCounted,
    ordersByStatus,
    unitsSold,
    averageOrderValue
  };

  const dailySeries = datesList.map(date => ({
    date,
    revenue: toRupees(dailyMap[date].revenuePaise),
    orders: dailyMap[date].orders
  }));

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenuePaise - a.revenuePaise || b.units - a.units)
    .slice(0, 5)
    .map(p => ({
      productId: p.productId,
      name: p.name,
      units: p.units,
      revenue: toRupees(p.revenuePaise)
    }));

  return {
    totals,
    dailySeries,
    topProducts
  };
}

/**
 * Computes cash to collect for COD subOrders pending collection (shipped or delivered, not collected).
 * ALL TIME (not range-limited).
 *
 * @param {Array} cashItems Array of { subtotal: number, amountDue?: number }
 * @returns {Object} { amount: number, parts: number }
 */
function computeCashToCollect(cashItems = []) {
  let amountPaise = 0;
  for (const item of cashItems) {
    amountPaise += toPaise(item.subtotal);
  }
  return {
    amount: toRupees(amountPaise),
    parts: cashItems.length
  };
}

/**
 * Top-level pure helper that can process raw order documents directly.
 * Useful for in-memory testing or fallback.
 */
function computeSellerStatsFromOrders({ orders = [], sellerId, range = 30, referenceDate = new Date() }) {
  const sellerIdStr = sellerId ? sellerId.toString() : '';

  // 1. Filter visible orders
  const visibleOrders = orders.filter(isOrderVisibleToSeller);

  // 2. Unwind subOrders matching sellerId
  const unwoundAllTime = [];
  for (const order of visibleOrders) {
    for (const sub of (order.subOrders || [])) {
      if (sub.sellerId && sub.sellerId.toString() === sellerIdStr) {
        unwoundAllTime.push({
          createdAt: order.createdAt,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subOrder: sub
        });
      }
    }
  }

  // 3. Date window in UTC
  const y = referenceDate.getUTCFullYear();
  const m = referenceDate.getUTCMonth();
  const d = referenceDate.getUTCDate();
  const startUTC = new Date(Date.UTC(y, m, d - (range - 1), 0, 0, 0, 0));
  const endUTC = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  // 4. In-range items
  const inRangeItems = unwoundAllTime.filter(item => {
    const dt = new Date(item.createdAt);
    return dt >= startUTC && dt <= endUTC;
  });

  const { totals, dailySeries, topProducts } = computeTotalsAndSeries({
    unwoundItems: inRangeItems,
    range,
    referenceDate
  });

  // 5. Cash to collect: COD parts with status 'shipped' or 'delivered' and codCollected false (ALL TIME)
  const codPendingCash = [];
  for (const item of unwoundAllTime) {
    const isCod = (item.paymentMethod || '').toLowerCase() === 'cod';
    const sub = item.subOrder || {};
    const isEligibleStatus = sub.status === 'shipped' || sub.status === 'delivered';
    const notCollected = !sub.codCollected;
    if (isCod && isEligibleStatus && notCollected) {
      codPendingCash.push(sub);
    }
  }
  const cashToCollect = computeCashToCollect(codPendingCash);

  return {
    range,
    totals,
    cashToCollect,
    dailySeries,
    topProducts
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline self-tests (run via: node server/utils/sellerStats.js)
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const assert = require('node:assert/strict');
  console.log('Running sellerStats.js self-tests...\n');

  const refDate = new Date('2026-11-16T12:00:00.000Z');
  const sellerId = 'seller_123';

  // Test 1: Empty input
  console.log('Test 1: Empty input');
  const emptyRes = computeTotalsAndSeries({ unwoundItems: [], range: 30, referenceDate: refDate });
  assert.equal(emptyRes.totals.earnedRevenue, 0);
  assert.equal(emptyRes.totals.inProgressRevenue, 0);
  assert.equal(emptyRes.totals.ordersCounted, 0);
  assert.deepEqual(emptyRes.totals.ordersByStatus, { pending: 0, shipped: 0, delivered: 0, cancelled: 0 });
  assert.equal(emptyRes.totals.unitsSold, 0);
  assert.equal(emptyRes.totals.averageOrderValue, 0);
  assert.equal(emptyRes.dailySeries.length, 30);
  assert.equal(emptyRes.topProducts.length, 0);
  assert(emptyRes.dailySeries.every(d => d.revenue === 0 && d.orders === 0));
  console.log('  ✓ Empty input produces all zeros and 30 zero-filled series entries');

  // Test 2: One day order
  console.log('Test 2: One day single delivered order');
  const oneDayItems = [{
    createdAt: new Date('2026-11-16T10:00:00.000Z'),
    subOrder: {
      status: 'delivered',
      subtotal: 500,
      items: [{ product: 'prod_1', name: 'Widget A', quantity: 2, price: 250 }]
    }
  }];
  const oneDayRes = computeTotalsAndSeries({ unwoundItems: oneDayItems, range: 7, referenceDate: refDate });
  assert.equal(oneDayRes.totals.earnedRevenue, 500);
  assert.equal(oneDayRes.totals.inProgressRevenue, 0);
  assert.equal(oneDayRes.totals.ordersCounted, 1);
  assert.equal(oneDayRes.totals.ordersByStatus.delivered, 1);
  assert.equal(oneDayRes.totals.unitsSold, 2);
  assert.equal(oneDayRes.totals.averageOrderValue, 500);
  assert.equal(oneDayRes.dailySeries.length, 7);
  const todayEntry = oneDayRes.dailySeries.find(d => d.date === '2026-11-16');
  assert.equal(todayEntry.revenue, 500);
  assert.equal(todayEntry.orders, 1);
  const otherDaysSum = oneDayRes.dailySeries.filter(d => d.date !== '2026-11-16').reduce((sum, d) => sum + d.revenue, 0);
  assert.equal(otherDaysSum, 0);
  console.log('  ✓ Single day order correctly attributed and other days remain 0');

  // Test 3: Multi-day orders
  console.log('Test 3: Multi-day orders');
  const multiDayItems = [
    {
      createdAt: new Date('2026-11-15T08:00:00.000Z'),
      subOrder: {
        status: 'delivered',
        subtotal: 200,
        items: [{ product: 'prod_1', name: 'Widget A', quantity: 1, price: 200 }]
      }
    },
    {
      createdAt: new Date('2026-11-16T11:00:00.000Z'),
      subOrder: {
        status: 'shipped',
        subtotal: 300,
        items: [{ product: 'prod_2', name: 'Widget B', quantity: 3, price: 100 }]
      }
    }
  ];
  const multiDayRes = computeTotalsAndSeries({ unwoundItems: multiDayItems, range: 7, referenceDate: refDate });
  assert.equal(multiDayRes.totals.earnedRevenue, 200);
  assert.equal(multiDayRes.totals.inProgressRevenue, 300);
  assert.equal(multiDayRes.totals.ordersCounted, 2);
  assert.equal(multiDayRes.totals.unitsSold, 4);
  assert.equal(multiDayRes.totals.averageOrderValue, 250); // (200 + 300) / 2
  const seriesTotal = multiDayRes.dailySeries.reduce((acc, d) => acc + d.revenue, 0);
  assert.equal(seriesTotal, 500);
  console.log('  ✓ Multi-day bucketing correct and series total equals earned + inProgress');

  // Test 4: Range lengths (7, 30, 90)
  console.log('Test 4: Zero-filled series lengths (7, 30, 90)');
  assert.equal(getUTCDatesList(7, refDate).length, 7);
  assert.equal(getUTCDatesList(30, refDate).length, 30);
  assert.equal(getUTCDatesList(90, refDate).length, 90);
  console.log('  ✓ Exactly 7, 30, and 90 entries produced');

  // Test 5: Rounding via paise (subtotals 333.33 and 0.1 + 0.2)
  console.log('Test 5: Rounding via paise');
  assert.equal(toRupees(toPaise(0.1) + toPaise(0.2)), 0.30);
  const floatItems = [
    { createdAt: refDate, subOrder: { status: 'delivered', subtotal: 333.33, items: [] } },
    { createdAt: refDate, subOrder: { status: 'delivered', subtotal: 333.33, items: [] } },
    { createdAt: refDate, subOrder: { status: 'delivered', subtotal: 333.34, items: [] } }
  ];
  const floatRes = computeTotalsAndSeries({ unwoundItems: floatItems, range: 7, referenceDate: refDate });
  assert.equal(floatRes.totals.earnedRevenue, 1000.00);
  assert.equal(floatRes.totals.averageOrderValue, 333.33); // Math.round(100000 / 3) / 100 = 333.33
  console.log('  ✓ 333.33 + 333.33 + 333.34 sums cleanly to 1000.00 via paise');

  // Test 6: Cancelled parts excluded
  console.log('Test 6: Cancelled subOrders excluded from revenue, units, dailySeries, topProducts');
  const cancelledItems = [
    {
      createdAt: refDate,
      subOrder: {
        status: 'cancelled',
        subtotal: 999.99,
        items: [{ product: 'prod_canc', name: 'Cancelled Item', quantity: 5, price: 999.99 }]
      }
    }
  ];
  const cancelledRes = computeTotalsAndSeries({ unwoundItems: cancelledItems, range: 7, referenceDate: refDate });
  assert.equal(cancelledRes.totals.ordersByStatus.cancelled, 1);
  assert.equal(cancelledRes.totals.ordersCounted, 0);
  assert.equal(cancelledRes.totals.earnedRevenue, 0);
  assert.equal(cancelledRes.totals.inProgressRevenue, 0);
  assert.equal(cancelledRes.totals.unitsSold, 0);
  assert.equal(cancelledRes.totals.averageOrderValue, 0);
  assert.equal(cancelledRes.dailySeries.find(d => d.date === '2026-11-16').revenue, 0);
  assert.equal(cancelledRes.dailySeries.find(d => d.date === '2026-11-16').orders, 0);
  assert.equal(cancelledRes.topProducts.length, 0);
  console.log('  ✓ Cancelled part recorded only in ordersByStatus, excluded everywhere else');

  // Test 7: Unpaid online order excluded via computeSellerStatsFromOrders
  console.log('Test 7: Unpaid online order excluded');
  const mockOrders = [
    {
      createdAt: refDate,
      paymentMethod: 'online',
      paymentStatus: 'pending', // UNPAID ONLINE -> must NOT count
      subOrders: [{
        sellerId: 'seller_123',
        status: 'pending',
        subtotal: 800,
        items: [{ product: 'prod_unpaid', name: 'Unpaid Item', quantity: 1, price: 800 }]
      }]
    },
    {
      createdAt: refDate,
      paymentMethod: 'cod',
      paymentStatus: 'pending', // COD pending -> VISIBLE
      subOrders: [{
        sellerId: 'seller_123',
        status: 'shipped',
        subtotal: 400,
        codCollected: false,
        items: [{ product: 'prod_cod', name: 'COD Item', quantity: 1, price: 400 }]
      }]
    }
  ];
  const statsFromOrders = computeSellerStatsFromOrders({ orders: mockOrders, sellerId: 'seller_123', range: 7, referenceDate: refDate });
  assert.equal(statsFromOrders.totals.ordersCounted, 1);
  assert.equal(statsFromOrders.totals.inProgressRevenue, 400);
  assert.equal(statsFromOrders.cashToCollect.amount, 400);
  assert.equal(statsFromOrders.cashToCollect.parts, 1);
  assert.equal(statsFromOrders.topProducts.length, 1);
  assert.equal(statsFromOrders.topProducts[0].name, 'COD Item');
  console.log('  ✓ Unpaid online order strictly excluded; only COD order processed');

  // Test 8: cashToCollect calculations
  console.log('Test 8: cashToCollect all-time calculation');
  const cashTestItems = [
    { subtotal: 100.50 },
    { subtotal: 200.25 }
  ];
  const cashRes = computeCashToCollect(cashTestItems);
  assert.equal(cashRes.amount, 300.75);
  assert.equal(cashRes.parts, 2);
  console.log('  ✓ cashToCollect correctly sums subtotals in paise');

  console.log('\nAll sellerStats.js pure helper tests passed successfully! ✓');
}

module.exports = {
  toPaise,
  toRupees,
  formatDateUTC,
  getUTCDatesList,
  isOrderVisibleToSeller,
  computeTotalsAndSeries,
  computeCashToCollect,
  computeSellerStatsFromOrders
};

