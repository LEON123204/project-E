'use strict';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30 in ms = 19,800,000 ms

/**
 * Returns 'YYYY-MM' in IST for a given Date, timestamp, or ISO string.
 * @param {Date|number|string} date
 * @returns {string}
 */
function istMonthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date passed to istMonthKey');
  }
  // Convert UTC time to IST virtual time by shifting by IST_OFFSET_MS
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Validates 'YYYY-MM' format (2024 to 2100) and returns UTC Date objects for start and end bounds.
 * Start: 1st of month 00:00:00 IST (inclusive)
 * End: 1st of next month 00:00:00 IST (exclusive)
 * @param {string} key
 * @returns {{ start: Date, end: Date }}
 */
function istMonthBounds(key) {
  if (typeof key !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new Error('Month key must be in YYYY-MM format with valid month (01-12)');
  }
  const parts = key.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12

  if (year < 2024 || year > 2100) {
    throw new Error('Month year must be between 2024 and 2100');
  }

  // 1st of month at 00:00:00 IST is UTC timestamp: Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS
  const startUtcMs = Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS;
  // 1st of next month at 00:00:00 IST:
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const endUtcMs = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0) - IST_OFFSET_MS;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs)
  };
}

/**
 * Checks whether a given month key is strictly in the past and closable.
 * Month can only be closed once the entire month has elapsed in IST (i.e. now >= bounds.end).
 * @param {string} key
 * @param {Date} [now]
 * @returns {boolean}
 */
function isMonthClosable(key, now = new Date()) {
  const bounds = istMonthBounds(key);
  const nowDate = now instanceof Date ? now : new Date(now);
  return nowDate.getTime() >= bounds.end.getTime();
}

/**
 * Determines whether a sub-order part is settleable and returns its settlement Date in UTC, or null.
 * Rules:
 *  - Must have a sellerId (Cartex direct sub-orders have sellerId == null, return null)
 *  - Must have status === 'delivered'
 *  - Must have valid deliveredAt Date
 *  - Must have commissionRate != null
 *  - If online order: requires order.paymentStatus === 'paid', settles at sub.deliveredAt
 *  - If cod order: requires sub.codCollected === true, settles at max(sub.deliveredAt, sub.collectedAt || sub.deliveredAt)
 * @param {object} order
 * @param {object} sub
 * @returns {Date|null}
 */
function partSettleableAt(order, sub) {
  if (!order || !sub) return null;
  if (!sub.sellerId) return null;
  if (sub.status !== 'delivered') return null;
  if (!sub.deliveredAt) return null;
  const deliveredAt = new Date(sub.deliveredAt);
  if (isNaN(deliveredAt.getTime())) return null;
  if (sub.commissionRate === null || sub.commissionRate === undefined) return null;

  const paymentMethod = (order.paymentMethod || '').toLowerCase();
  if (paymentMethod === 'online') {
    if (order.paymentStatus !== 'paid') return null;
    return deliveredAt;
  } else if (paymentMethod === 'cod') {
    if (!sub.codCollected) return null;
    let collectedAt = sub.collectedAt ? new Date(sub.collectedAt) : deliveredAt;
    if (isNaN(collectedAt.getTime())) collectedAt = deliveredAt;
    return collectedAt.getTime() > deliveredAt.getTime() ? collectedAt : deliveredAt;
  }

  return null;
}

/**
 * Builds the line item for a settleable part. All money arithmetic is performed in paise.
 * @param {object} order
 * @param {object} sub
 * @returns {object}
 */
function partLine(order, sub) {
  const grossPaise = Math.round((sub.subtotal || 0) * 100);
  const commissionPaise = Math.round((sub.commissionAmount || 0) * 100);
  const earningsPaise = grossPaise - commissionPaise;

  const isCodCollected = (order.paymentMethod || '').toLowerCase() === 'cod' && Boolean(sub.codCollected);
  const codCashHeldPaise = isCodCollected ? Math.round((sub.amountDue || 0) * 100) : 0;
  const netPaise = earningsPaise - codCashHeldPaise;

  const settledAt = partSettleableAt(order, sub);

  return {
    orderId: order._id,
    subOrderId: sub._id,
    paymentMethod: (order.paymentMethod || '').toLowerCase(),
    grossPaise,
    commissionRate: sub.commissionRate,
    commissionPaise,
    earningsPaise,
    codCashHeldPaise,
    netPaise,
    gross: grossPaise / 100,
    commission: commissionPaise / 100,
    earnings: earningsPaise / 100,
    codCashHeld: codCashHeldPaise / 100,
    net: netPaise / 100,
    deliveredAt: sub.deliveredAt,
    collectedAt: sub.collectedAt || null,
    settledAt
  };
}

/**
 * Computes statement totals from an array of part lines.
 * Guarantees exact balance identities in paise:
 *   grossPaise - commissionPaise === earningsPaise
 *   earningsPaise - codCashHeldPaise === netPaise
 * @param {Array} lines
 * @returns {{ parts: number, gross: number, commission: number, earnings: number, codCashHeld: number, net: number }}
 */
function computeStatement(lines) {
  let grossPaise = 0;
  let commissionPaise = 0;
  let earningsPaise = 0;
  let codCashHeldPaise = 0;
  let netPaise = 0;

  for (const l of lines) {
    const g = typeof l.grossPaise === 'number' ? l.grossPaise : Math.round(l.gross * 100);
    const c = typeof l.commissionPaise === 'number' ? l.commissionPaise : Math.round(l.commission * 100);
    const e = typeof l.earningsPaise === 'number' ? l.earningsPaise : (g - c);
    const cash = typeof l.codCashHeldPaise === 'number' ? l.codCashHeldPaise : Math.round((l.codCashHeld || 0) * 100);
    const n = typeof l.netPaise === 'number' ? l.netPaise : (e - cash);

    grossPaise += g;
    commissionPaise += c;
    earningsPaise += e;
    codCashHeldPaise += cash;
    netPaise += n;
  }

  // Safety checks
  if (grossPaise - commissionPaise !== earningsPaise) {
    throw new Error('Assertion failed: grossPaise - commissionPaise !== earningsPaise');
  }
  if (earningsPaise - codCashHeldPaise !== netPaise) {
    throw new Error('Assertion failed: earningsPaise - codCashHeldPaise !== netPaise');
  }

  return {
    parts: lines.length,
    gross: grossPaise / 100,
    commission: commissionPaise / 100,
    earnings: earningsPaise / 100,
    codCashHeld: codCashHeldPaise / 100,
    net: netPaise / 100
  };
}

module.exports = {
  IST_OFFSET_MS,
  istMonthKey,
  istMonthBounds,
  isMonthClosable,
  partSettleableAt,
  partLine,
  computeStatement
};
