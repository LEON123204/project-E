'use strict';

/**
 * Validates that x is a JS finite number, 0–50 inclusive,
 * with at most 2 decimal places.
 * Throws a plain string message on failure.
 */
function validateRatePercent(x) {
  const MSG =
    'Commission rate must be a number between 0 and 50 with at most 2 decimals';
  if (typeof x !== 'number' || !isFinite(x)) throw MSG;
  if (x < 0 || x > 50) throw MSG;
  // at most 2 decimal places: check via string round-trip to avoid float imprecision.
  // e.g. 35.05 → parseFloat('35.05') === 35.05 passes, but 10.123 → '10.12' != '10.123' fails.
  // We normalise: round to 2dp, convert back; if it differs from original (with 2dp tolerance) reject.
  if (parseFloat(x.toFixed(2)) !== x) throw MSG;
  return true;
}

/**
 * Computes the platform commission and seller net for a given subtotal.
 *
 * All arithmetic is done in paise (integer) to avoid floating-point drift.
 *   subtotalPaise = Math.round(subtotal * 100)
 *   bps           = Math.round(ratePercent * 100)   (basis points × 100)
 *   commissionPaise = Math.round(subtotalPaise * bps / 10000)
 *   netPaise      = subtotalPaise - commissionPaise
 *
 * Guarantees: commissionPaise + netPaise === subtotalPaise  (by construction).
 *
 * @param {number} subtotal    — order subtotal in rupees (non-negative finite)
 * @param {number} ratePercent — commission rate (must pass validateRatePercent)
 * @returns {{ commissionAmount: number, sellerNet: number }}
 */
function computeCommission(subtotal, ratePercent) {
  if (typeof subtotal !== 'number' || !isFinite(subtotal) || subtotal < 0) {
    throw new Error('subtotal must be a non-negative finite number');
  }
  validateRatePercent(ratePercent);

  const subtotalPaise = Math.round(subtotal * 100);
  const bps = Math.round(ratePercent * 100);
  const commissionPaise = Math.round((subtotalPaise * bps) / 10000);
  const netPaise = subtotalPaise - commissionPaise;

  return {
    commissionAmount: commissionPaise / 100,
    sellerNet: netPaise / 100,
  };
}

/**
 * Applies commission to sub-orders, returning a new array of sub-order objects
 * without mutating the input array or its objects.
 *
 * For sub-orders with a non-null sellerId:
 *   commissionRate = ratePercent
 *   commissionAmount = computeCommission(part.subtotal, ratePercent).commissionAmount
 * For sub-orders with sellerId == null:
 *   commissionRate = 0
 *   commissionAmount = 0
 *
 * @param {Array<Object>} subOrders
 * @param {number} ratePercent
 * @returns {Array<Object>}
 */
function applyCommissionToSubOrders(subOrders, ratePercent) {
  if (!Array.isArray(subOrders)) {
    throw new Error('subOrders must be an array');
  }
  validateRatePercent(ratePercent);

  return subOrders.map(part => {
    const copy = { ...(part && typeof part.toObject === 'function' ? part.toObject() : part) };
    if (copy.sellerId !== null && copy.sellerId !== undefined) {
      copy.commissionRate = ratePercent;
      copy.commissionAmount = computeCommission(copy.subtotal || 0, ratePercent).commissionAmount;
    } else {
      copy.commissionRate = 0;
      copy.commissionAmount = 0;
    }
    return copy;
  });
}

module.exports = { validateRatePercent, computeCommission, applyCommissionToSubOrders };
