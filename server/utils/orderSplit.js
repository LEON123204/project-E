/**
 * Money-splitting helper for multi-seller orders.
 * Splits an order into sub-orders grouped by sellerId.
 * Pure function: no DB access, no req/res.
 *
 * @param {Object} params
 * @param {Array} params.items - Array of order items [{ product, name, price, quantity, sellerId }]
 * @param {number} params.subtotal - Total items subtotal
 * @param {number} [params.taxAmount=0] - Estimated tax amount
 * @param {number} [params.shippingAmount=0] - Shipping cost
 * @param {number} [params.prepayDiscount=0] - Prepay discount (e.g. 5% for online)
 * @param {number} params.totalAmount - Total amount payable
 * @returns {Array} Array of subOrders: { sellerId, items, subtotal, status: 'pending', codCollected: false, amountDue }
 */
function splitOrderBySeller({
  items,
  subtotal,
  taxAmount = 0,
  shippingAmount = 0,
  prepayDiscount = 0,
  totalAmount
}) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Items array cannot be empty');
  }

  if (typeof totalAmount !== 'number' || isNaN(totalAmount)) {
    throw new Error('Valid totalAmount is required');
  }

  // Work in integer paise internally
  const subtotalPaise = Math.round(Number(subtotal) * 100);
  const taxPaise = Math.round(Number(taxAmount) * 100);
  const shippingPaise = Math.round(Number(shippingAmount) * 100);
  const prepayDiscountPaise = Math.round(Number(prepayDiscount) * 100);
  const totalAmountPaise = Math.round(Number(totalAmount) * 100);

  // Consistency check: subtotal + tax + shipping - prepayDiscount differs from totalAmount by > 1 paisa
  const expectedTotalPaise = subtotalPaise + taxPaise + shippingPaise - prepayDiscountPaise;
  if (Math.abs(expectedTotalPaise - totalAmountPaise) > 1) {
    throw new Error(
      `Inconsistent order totals: subtotal (${subtotal}) + tax (${taxAmount}) + shipping (${shippingAmount}) - prepayDiscount (${prepayDiscount}) differs from totalAmount (${totalAmount}) by more than 1 paisa`
    );
  }

  // Overhead to allocate proportionally (tax + shipping - prepayDiscount)
  const overheadPaise = totalAmountPaise - subtotalPaise;

  // Group items by sellerId (null = Cartex), keep first-seen order
  const groupMap = new Map();

  for (const item of items) {
    const rawSellerId = item.sellerId !== undefined && item.sellerId !== null ? item.sellerId : null;
    const groupKey = rawSellerId !== null ? String(rawSellerId) : 'null';

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        sellerId: rawSellerId,
        items: [],
        subtotalPaise: 0
      });
    }

    const group = groupMap.get(groupKey);
    const itemQuantity = Number(item.quantity) || 1;
    const itemPrice = Number(item.price) || 0;
    const itemTotalPaise = Math.round(itemPrice * itemQuantity * 100);

    group.items.push({
      product: item.product,
      name: item.name,
      price: itemPrice,
      quantity: itemQuantity,
      sellerId: rawSellerId
    });

    group.subtotalPaise += itemTotalPaise;
  }

  const groups = Array.from(groupMap.values());

  // Verify items subtotal matches passed subtotal within 1 paisa
  const itemsTotalPaise = groups.reduce((sum, g) => sum + g.subtotalPaise, 0);
  if (Math.abs(itemsTotalPaise - subtotalPaise) > 1) {
    throw new Error(
      `Inconsistent items total: sum of items price*quantity (${itemsTotalPaise / 100}) differs from subtotal (${subtotal}) by more than 1 paisa`
    );
  }

  // Allocate amountDue per group in integer paise
  let allocatedAmountDuePaise = 0;
  let largestGroup = groups[0];

  for (const group of groups) {
    let shareOfOverhead = 0;
    if (itemsTotalPaise > 0) {
      shareOfOverhead = Math.round((overheadPaise * group.subtotalPaise) / itemsTotalPaise);
    }
    group.amountDuePaise = group.subtotalPaise + shareOfOverhead;
    allocatedAmountDuePaise += group.amountDuePaise;

    if (group.subtotalPaise > largestGroup.subtotalPaise) {
      largestGroup = group;
    }
  }

  // Rounding remainder goes to the largest group so that sum(amountDue) equals totalAmount EXACTLY
  const remainderPaise = totalAmountPaise - allocatedAmountDuePaise;
  if (remainderPaise !== 0 && largestGroup) {
    largestGroup.amountDuePaise += remainderPaise;
  }

  // Format return array of subOrders
  return groups.map(group => ({
    sellerId: group.sellerId,
    items: group.items,
    subtotal: group.subtotalPaise / 100,
    status: 'pending',
    codCollected: false,
    collectedBy: null,
    collectedAt: null,
    amountDue: Math.max(0, group.amountDuePaise) / 100
  }));
}

module.exports = { splitOrderBySeller };
