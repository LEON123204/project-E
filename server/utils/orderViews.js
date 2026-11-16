const User = require('../models/User');

/**
 * Builds a Map of sellerId -> { businessName, name } with a single DB query.
 * @param {Object|Array} ordersOrOrder - Single order or array of orders
 * @returns {Promise<Map<string, Object>>}
 */
async function fetchSellerNameMap(ordersOrOrder) {
  const orders = Array.isArray(ordersOrOrder) ? ordersOrOrder : [ordersOrOrder];
  const sellerIdSet = new Set();

  for (const o of orders) {
    if (o && o.subOrders && Array.isArray(o.subOrders)) {
      for (const s of o.subOrders) {
        if (s.sellerId) {
          const sid = s.sellerId._id ? s.sellerId._id.toString() : s.sellerId.toString();
          sellerIdSet.add(sid);
        }
      }
    }
  }

  const sellerIds = Array.from(sellerIdSet);
  const sellerNameMap = new Map();

  if (sellerIds.length > 0) {
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select('businessName name')
      .lean();
    for (const s of sellers) {
      sellerNameMap.set(s._id.toString(), s);
    }
  }

  return sellerNameMap;
}

/**
 * Formats subOrders into customer-safe shipments array.
 * @param {Object} order - Order object/document
 * @param {Map<string, Object>} sellerNameMap - Map of sellerId -> { businessName, name }
 * @returns {Array<Object>}
 */
function formatCustomerShipments(order, sellerNameMap) {
  if (!order || !order.subOrders || !Array.isArray(order.subOrders) || order.subOrders.length === 0) {
    return [];
  }

  const isCod = (order.paymentMethod || '').toLowerCase() === 'cod';

  return order.subOrders.map(subOrder => {
    let sellerName = 'Cartex';
    let isMarketplaceSeller = false;

    if (subOrder.sellerId) {
      isMarketplaceSeller = true;
      const sid = subOrder.sellerId._id ? subOrder.sellerId._id.toString() : subOrder.sellerId.toString();
      const seller = sellerNameMap ? sellerNameMap.get(sid) : null;
      if (seller) {
        sellerName = (seller.businessName && seller.businessName.trim())
          || (seller.name && seller.name.trim())
          || 'Seller';
      } else {
        sellerName = 'Seller';
      }
    }

    const shipment = {
      shipmentId: subOrder._id,
      sellerName,
      isMarketplaceSeller,
      status: subOrder.status,
      items: (subOrder.items || []).map(item => ({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: subOrder.subtotal,
      updatedAt: subOrder.updatedAt || subOrder.createdAt || order.updatedAt || null
    };

    if (isCod) {
      shipment.amountDue = subOrder.amountDue !== undefined ? subOrder.amountDue : 0;
      shipment.codCollected = Boolean(subOrder.codCollected);
    }

    return shipment;
  });
}

/**
 * Synchronous builder for a customer-safe order view.
 * Replaces subOrders with shipments and strips sellerId from items.
 * @param {Object} order - Order object or mongoose doc
 * @param {Map<string, Object>} sellerNameMap - Map of sellerId -> { businessName, name }
 * @returns {Object}
 */
function buildCustomerOrderViewSync(order, sellerNameMap) {
  if (!order) return null;

  const orderObj = typeof order.toObject === 'function'
    ? order.toObject()
    : JSON.parse(JSON.stringify(order));

  const shipments = formatCustomerShipments(orderObj, sellerNameMap);

  // Strip sellerId from item-level snapshot
  const cleanItems = (orderObj.items || []).map(item => {
    const clean = { ...item };
    delete clean.sellerId;
    return clean;
  });

  delete orderObj.subOrders;
  orderObj.items = cleanItems;
  orderObj.shipments = shipments;

  return orderObj;
}

/**
 * Asynchronous builder for customer order view (fetches sellerNameMap if not provided).
 * @param {Object} order
 * @param {Map<string, Object>} [sellerNameMap]
 * @returns {Promise<Object>}
 */
async function buildCustomerOrderView(order, sellerNameMap = null) {
  if (!order) return null;
  const map = sellerNameMap || (await fetchSellerNameMap(order));
  return buildCustomerOrderViewSync(order, map);
}

/**
 * Synchronous builder for admin order view.
 * Keeps subOrders intact and adds sellerName to each subOrder.
 * @param {Object} order
 * @param {Map<string, Object>} sellerNameMap
 * @returns {Object}
 */
function buildAdminOrderViewSync(order, sellerNameMap) {
  if (!order) return null;

  const orderObj = typeof order.toObject === 'function'
    ? order.toObject()
    : JSON.parse(JSON.stringify(order));

  if (orderObj.subOrders && Array.isArray(orderObj.subOrders)) {
    orderObj.subOrders = orderObj.subOrders.map(subOrder => {
      let sellerName = 'Cartex';
      if (subOrder.sellerId) {
        const sid = subOrder.sellerId._id ? subOrder.sellerId._id.toString() : subOrder.sellerId.toString();
        const seller = sellerNameMap ? sellerNameMap.get(sid) : null;
        if (seller) {
          sellerName = (seller.businessName && seller.businessName.trim())
            || (seller.name && seller.name.trim())
            || 'Seller';
        } else {
          sellerName = 'Seller';
        }
      }
      return {
        ...subOrder,
        sellerName
      };
    });
  }

  return orderObj;
}

/**
 * Asynchronous builder for admin order view.
 * @param {Object} order
 * @param {Map<string, Object>} [sellerNameMap]
 * @returns {Promise<Object>}
 */
async function buildAdminOrderView(order, sellerNameMap = null) {
  if (!order) return null;
  const map = sellerNameMap || (await fetchSellerNameMap(order));
  return buildAdminOrderViewSync(order, map);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Tests (Run with node orderViews.js)
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const assert = require('node:assert/strict');

  console.log('Running orderViews inline self-tests...\n');

  const mockSellerMap = new Map([
    ['seller123', { _id: 'seller123', businessName: 'Tech Hub', name: 'John Tech' }],
    ['seller456', { _id: 'seller456', businessName: '', name: 'Jane Solo' }]
  ]);

  // Test 1: COD order with Cartex (null seller) + Marketplace seller
  const codOrder = {
    _id: 'ord1',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    items: [
      { product: 'p1', name: 'Headphones', quantity: 1, price: 1000, sellerId: null },
      { product: 'p2', name: 'Cable', quantity: 2, price: 200, sellerId: 'seller123' }
    ],
    subOrders: [
      {
        _id: 'sub1',
        sellerId: null,
        status: 'pending',
        subtotal: 1000,
        amountDue: 1080,
        codCollected: false,
        items: [{ product: 'p1', name: 'Headphones', quantity: 1, price: 1000, sellerId: null }]
      },
      {
        _id: 'sub2',
        sellerId: 'seller123',
        status: 'shipped',
        subtotal: 400,
        amountDue: 432,
        codCollected: true,
        items: [{ product: 'p2', name: 'Cable', quantity: 2, price: 200, sellerId: 'seller123' }]
      }
    ]
  };

  const codShipments = formatCustomerShipments(codOrder, mockSellerMap);
  console.log('=== Test 1: COD formatCustomerShipments ===');
  assert.equal(codShipments.length, 2);
  assert.equal(codShipments[0].sellerName, 'Cartex');
  assert.equal(codShipments[0].isMarketplaceSeller, false);
  assert.equal(codShipments[0].amountDue, 1080);
  assert.equal(codShipments[0].codCollected, false);
  console.log('  ✓ Cartex subOrder -> sellerName="Cartex", isMarketplaceSeller=false, amountDue=1080, codCollected=false');

  assert.equal(codShipments[1].sellerName, 'Tech Hub');
  assert.equal(codShipments[1].isMarketplaceSeller, true);
  assert.equal(codShipments[1].amountDue, 432);
  assert.equal(codShipments[1].codCollected, true);
  console.log('  ✓ Marketplace seller -> sellerName="Tech Hub", isMarketplaceSeller=true, amountDue=432, codCollected=true');

  // Test 2: Online order (amountDue and codCollected MUST be omitted)
  const onlineOrder = {
    _id: 'ord2',
    paymentMethod: 'online',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    items: [{ product: 'p1', name: 'Headphones', quantity: 1, price: 1000, sellerId: 'seller123' }],
    subOrders: [
      {
        _id: 'sub3',
        sellerId: 'seller123',
        status: 'shipped',
        subtotal: 1000,
        amountDue: 1080,
        codCollected: false,
        items: [{ product: 'p1', name: 'Headphones', quantity: 1, price: 1000, sellerId: 'seller123' }]
      }
    ]
  };

  const onlineShipments = formatCustomerShipments(onlineOrder, mockSellerMap);
  console.log('\n=== Test 2: Online order amountDue & codCollected omission ===');
  assert.equal(onlineShipments.length, 1);
  assert.equal(onlineShipments[0].amountDue, undefined);
  assert.equal(onlineShipments[0].codCollected, undefined);
  assert.equal('amountDue' in onlineShipments[0], false);
  assert.equal('codCollected' in onlineShipments[0], false);
  console.log('  ✓ Online order shipment has no amountDue or codCollected fields');

  // Test 3: Missing / Deleted seller -> returns "Seller"
  const missingSellerOrder = {
    _id: 'ord3',
    paymentMethod: 'cod',
    subOrders: [{ _id: 'sub4', sellerId: 'seller999_deleted', status: 'pending', subtotal: 50, amountDue: 50, items: [] }]
  };
  const missingShipments = formatCustomerShipments(missingSellerOrder, mockSellerMap);
  console.log('\n=== Test 3: Missing / Deleted seller ===');
  assert.equal(missingShipments[0].sellerName, 'Seller');
  console.log('  ✓ Deleted/unknown seller gracefully returns "Seller"');

  // Test 4: BusinessName empty fallback to name
  const fallbackOrder = {
    _id: 'ord4',
    paymentMethod: 'cod',
    subOrders: [{ _id: 'sub5', sellerId: 'seller456', status: 'pending', subtotal: 100, amountDue: 100, items: [] }]
  };
  const fallbackShipments = formatCustomerShipments(fallbackOrder, mockSellerMap);
  console.log('\n=== Test 4: Fallback to seller name when businessName is empty ===');
  assert.equal(fallbackShipments[0].sellerName, 'Jane Solo');
  console.log('  ✓ Empty businessName falls back to seller name: "Jane Solo"');

  // Test 5: Legacy order without subOrders
  const legacyOrder = {
    _id: 'ord_legacy',
    paymentMethod: 'cod',
    totalAmount: 500,
    items: [{ product: 'p1', name: 'Item', quantity: 1, price: 500 }]
  };
  const legacyView = buildCustomerOrderViewSync(legacyOrder, mockSellerMap);
  console.log('\n=== Test 5: Legacy order without subOrders ===');
  assert.deepEqual(legacyView.shipments, []);
  assert.equal(legacyView.totalAmount, 500);
  assert.equal(legacyView.subOrders, undefined);
  console.log('  ✓ Legacy order returns shipments: [] and retains all old fields unchanged');

  // Test 6: buildCustomerOrderViewSync leakage check
  console.log('\n=== Test 6: Recursive Key Leakage Check ===');
  const fullCustomerView = buildCustomerOrderViewSync(codOrder, mockSellerMap);
  assert.equal(fullCustomerView.subOrders, undefined);
  assert.equal(Array.isArray(fullCustomerView.shipments), true);

  const forbiddenKeys = ['sellerId', 'collectedBy', 'collectedAt', 'email', 'password', 'token'];

  function checkForbiddenKeys(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      assert(
        !forbiddenKeys.includes(key),
        `Leaked forbidden key "${key}" found at path: ${currentPath}`
      );
      checkForbiddenKeys(obj[key], currentPath);
    }
  }

  checkForbiddenKeys(fullCustomerView);
  console.log('  ✓ No forbidden keys (sellerId, collectedBy, collectedAt, email, password, token) exist anywhere in output.');

  // Test 7: buildAdminOrderViewSync
  console.log('\n=== Test 7: Admin order view retains subOrders and adds sellerName ===');
  const adminView = buildAdminOrderViewSync(codOrder, mockSellerMap);
  assert.equal(Array.isArray(adminView.subOrders), true);
  assert.equal(adminView.subOrders[0].sellerName, 'Cartex');
  assert.equal(adminView.subOrders[1].sellerName, 'Tech Hub');
  console.log('  ✓ Admin view retains subOrders and annotates each with sellerName');

  console.log('\nAll orderViews self-tests passed cleanly! ✓');
}

module.exports = {
  fetchSellerNameMap,
  formatCustomerShipments,
  buildCustomerOrderViewSync,
  buildCustomerOrderView,
  buildAdminOrderViewSync,
  buildAdminOrderView
};

