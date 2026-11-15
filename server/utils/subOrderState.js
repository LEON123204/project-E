/**
 * Sub-order state machine helpers for Stage 5d-1.
 * Pure functions; no DB access, no req/res.
 */

const TERMINAL = new Set(['cancelled', 'delivered']);

// Valid seller transitions
const SELLER_TRANSITIONS = new Map([
  ['pending',   new Set(['shipped', 'cancelled'])],
  ['shipped',   new Set(['delivered'])],
  ['delivered', new Set()],
  ['cancelled', new Set()]
]);

// Admin gets all seller transitions plus shipped->cancelled
const ADMIN_TRANSITIONS = new Map([
  ['pending',   new Set(['shipped', 'cancelled'])],
  ['shipped',   new Set(['delivered', 'cancelled'])],
  ['delivered', new Set()],
  ['cancelled', new Set()]
]);

/**
 * Returns true if `from -> to` is a valid seller-initiated transition.
 * Same-status returns false (endpoint should 409).
 */
function isValidSellerTransition(from, to) {
  if (from === to) return false;
  const allowed = SELLER_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

/**
 * Returns true if `from -> to` is a valid admin-initiated transition.
 * Same-status returns false (endpoint should 409).
 */
function isValidAdminTransition(from, to) {
  if (from === to) return false;
  const allowed = ADMIN_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

/**
 * Derives the parent order status from the current set of subOrders.
 *
 * Rules:
 *  - Filter out cancelled -> non-cancelled parts
 *  - If none -> 'cancelled'
 *  - All non-cancelled are 'delivered' -> 'delivered'
 *  - Any non-cancelled is 'shipped' or 'delivered' -> 'shipped'
 *  - Otherwise -> 'pending'
 *
 * @param {Array} subOrders - Array of subOrder objects with a `status` field
 * @returns {string}
 */
function deriveParentStatus(subOrders) {
  if (!subOrders || subOrders.length === 0) return 'pending';

  const active = subOrders.filter(s => s.status !== 'cancelled');

  if (active.length === 0) return 'cancelled';

  const allDelivered = active.every(s => s.status === 'delivered');
  if (allDelivered) return 'delivered';

  const anyShippedOrDelivered = active.some(
    s => s.status === 'shipped' || s.status === 'delivered'
  );
  if (anyShippedOrDelivered) return 'shipped';

  return 'pending';
}

/**
 * Derives the parent payment status for a COD order.
 * For online orders: returns null (no change).
 *
 * COD rules:
 *  - Non-cancelled parts: if at least 1 and all have codCollected=true -> 'paid'
 *  - Otherwise -> null (no change)
 *
 * @param {Object} order - Parent order (must have .paymentMethod)
 * @param {Array}  subOrders - Array of current subOrder objects
 * @returns {string|null} new paymentStatus or null if no change needed
 */
function deriveParentPaymentStatus(order, subOrders) {
  if (!order || !order.paymentMethod) return null;

  // Only applies to COD orders
  if (order.paymentMethod.toLowerCase() !== 'cod') return null;

  const active = (subOrders || []).filter(s => s.status !== 'cancelled');

  if (active.length === 0) return null;

  const allCollected = active.every(s => s.codCollected === true);
  return allCollected ? 'paid' : null;
}

/**
 * Returns true if stock was ever decremented for this order.
 * Stock is decremented at creation for COD orders, and at payment confirmation for paid online orders.
 *
 * @param {Object} order - Order document/object with .paymentMethod and .paymentStatus
 * @returns {boolean}
 */
function stockWasDecremented(order) {
  if (!order || !order.paymentMethod) return false;
  const isCod = order.paymentMethod.toLowerCase() === 'cod';
  const isPaid = order.paymentStatus === 'paid';
  return isCod || isPaid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline self-tests (run at module load only when NODE_ENV=test or via node)
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const assert = require('node:assert/strict');

  console.log('Running subOrderState inline tests...\n');

  // ── isValidSellerTransition ──────────────────────────────────────────────
  console.log('=== isValidSellerTransition ===');
  const sellerCases = [
    // [from, to, expected, label]
    ['pending',   'shipped',   true,  'pending->shipped OK'],
    ['pending',   'cancelled', true,  'pending->cancelled OK'],
    ['shipped',   'delivered', true,  'shipped->delivered OK'],
    ['pending',   'pending',   false, 'same status -> false'],
    ['shipped',   'pending',   false, 'shipped->pending invalid'],
    ['shipped',   'cancelled', false, 'shipped->cancelled invalid for seller'],
    ['delivered', 'cancelled', false, 'terminal delivered -> false'],
    ['cancelled', 'pending',   false, 'terminal cancelled -> false'],
    ['cancelled', 'shipped',   false, 'terminal cancelled -> false'],
  ];
  for (const [from, to, expected, label] of sellerCases) {
    const result = isValidSellerTransition(from, to);
    assert.equal(result, expected, label);
    console.log(`  ✓ ${label}: ${from}->${to} = ${result}`);
  }

  // ── isValidAdminTransition ───────────────────────────────────────────────
  console.log('\n=== isValidAdminTransition ===');
  const adminCases = [
    ['pending',   'shipped',   true,  'pending->shipped OK'],
    ['pending',   'cancelled', true,  'pending->cancelled OK'],
    ['shipped',   'delivered', true,  'shipped->delivered OK'],
    ['shipped',   'cancelled', true,  'shipped->cancelled OK (admin extra)'],
    ['pending',   'pending',   false, 'same status -> false'],
    ['delivered', 'cancelled', false, 'terminal delivered -> false'],
    ['cancelled', 'shipped',   false, 'terminal cancelled -> false'],
  ];
  for (const [from, to, expected, label] of adminCases) {
    const result = isValidAdminTransition(from, to);
    assert.equal(result, expected, label);
    console.log(`  ✓ ${label}: ${from}->${to} = ${result}`);
  }

  // ── deriveParentStatus ───────────────────────────────────────────────────
  console.log('\n=== deriveParentStatus ===');
  const statusCases = [
    [[], 'pending', 'empty subOrders -> pending'],
    [[{ status: 'cancelled' }], 'cancelled', 'all cancelled -> cancelled'],
    [[{ status: 'cancelled' }, { status: 'cancelled' }], 'cancelled', 'all cancelled multi -> cancelled'],
    [[{ status: 'delivered' }, { status: 'cancelled' }], 'delivered', 'one delivered one cancelled -> delivered'],
    [[{ status: 'delivered' }, { status: 'delivered' }], 'delivered', 'all delivered -> delivered'],
    [[{ status: 'shipped' },   { status: 'cancelled' }], 'shipped',   'one shipped one cancelled -> shipped'],
    [[{ status: 'shipped' },   { status: 'delivered' }], 'shipped',   'shipped+delivered -> shipped'],
    [[{ status: 'pending' },   { status: 'shipped' }],   'shipped',   'pending+shipped -> shipped'],
    [[{ status: 'pending' },   { status: 'pending' }],   'pending',   'all pending -> pending'],
    [[{ status: 'pending' },   { status: 'cancelled' }], 'pending',   'pending+cancelled -> pending'],
  ];
  for (const [subs, expected, label] of statusCases) {
    const result = deriveParentStatus(subs);
    assert.equal(result, expected, label);
    console.log(`  ✓ ${label}: -> ${result}`);
  }

  // ── deriveParentPaymentStatus ────────────────────────────────────────────
  console.log('\n=== deriveParentPaymentStatus ===');
  const paymentCases = [
    [
      { paymentMethod: 'online' },
      [{ status: 'delivered', codCollected: true }],
      null,
      'online order -> null (no change)'
    ],
    [
      { paymentMethod: 'cod' },
      [{ status: 'delivered', codCollected: true }],
      'paid',
      'COD all collected -> paid'
    ],
    [
      { paymentMethod: 'cod' },
      [{ status: 'delivered', codCollected: true }, { status: 'shipped', codCollected: false }],
      null,
      'COD one not collected -> null'
    ],
    [
      { paymentMethod: 'cod' },
      [{ status: 'cancelled', codCollected: false }, { status: 'delivered', codCollected: true }],
      'paid',
      'COD cancelled+collected -> paid (cancelled filtered out)'
    ],
    [
      { paymentMethod: 'cod' },
      [{ status: 'cancelled', codCollected: false }],
      null,
      'COD all cancelled active=0 -> null'
    ],
    [
      { paymentMethod: 'COD' },
      [{ status: 'delivered', codCollected: true }],
      'paid',
      'COD uppercase -> paid'
    ],
  ];
  for (const [order, subs, expected, label] of paymentCases) {
    const result = deriveParentPaymentStatus(order, subs);
    assert.equal(result, expected, label);
    console.log(`  ✓ ${label}: -> ${result}`);
  }

  // ── stockWasDecremented ──────────────────────────────────────────────────
  console.log('\n=== stockWasDecremented ===');
  const stockCases = [
    [{ paymentMethod: 'cod', paymentStatus: 'pending' }, true, 'COD pending -> true'],
    [{ paymentMethod: 'COD', paymentStatus: 'pending' }, true, 'COD uppercase pending -> true'],
    [{ paymentMethod: 'cod', paymentStatus: 'paid' }, true, 'COD paid -> true'],
    [{ paymentMethod: 'online', paymentStatus: 'paid' }, true, 'online paid -> true'],
    [{ paymentMethod: 'online', paymentStatus: 'pending' }, false, 'online pending -> false'],
    [{ paymentMethod: 'online', paymentStatus: 'failed' }, false, 'online failed -> false'],
    [null, false, 'null order -> false'],
    [{}, false, 'empty order -> false']
  ];
  for (const [order, expected, label] of stockCases) {
    const result = stockWasDecremented(order);
    assert.equal(result, expected, label);
    console.log(`  ✓ ${label}: -> ${result}`);
  }

  console.log('\nAll subOrderState tests passed. ✓');
}

module.exports = {
  isValidSellerTransition,
  isValidAdminTransition,
  deriveParentStatus,
  deriveParentPaymentStatus,
  stockWasDecremented
};

