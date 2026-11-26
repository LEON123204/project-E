const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const {
  isValidSellerTransition,
  deriveParentStatus,
  deriveParentPaymentStatus,
  stockWasDecremented
} = require('../utils/subOrderState');
const {
  computeTotalsAndSeries,
  computeCashToCollect
} = require('../utils/sellerStats');

/**
 * Helper to determine if an order is visible to sellers.
 * Sellers can only see COD orders or paid online orders.
 */
const isOrderVisibleToSeller = (order) => {
  if (!order || !order.paymentMethod) return false;
  return order.paymentMethod.toLowerCase() === 'cod' || order.paymentStatus === 'paid';
};

/**
 * Whitelist formatter for seller order responses.
 * Strict projection to ensure zero cross-seller or sensitive field leakage.
 */
const formatSellerOrder = (order, sellerId) => {
  const ownSubOrder = (order.subOrders || []).find(
    s => s.sellerId && s.sellerId.toString() === sellerId.toString()
  );
  if (!ownSubOrder) return null;

  const displayName = order.user && order.user.name ? order.user.name : (order.guestName || 'Guest');

  return {
    orderId: order._id,
    createdAt: order.createdAt,
    customerName: displayName,
    customerDisplayName: displayName,
    shippingAddress: {
      street: order.shippingAddress?.street,
      city: order.shippingAddress?.city,
      state: order.shippingAddress?.state,
      zipCode: order.shippingAddress?.zipCode,
      country: order.shippingAddress?.country
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subOrder: {
      _id: ownSubOrder._id,
      items: (ownSubOrder.items || []).map(item => ({
        product: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: ownSubOrder.subtotal,
      amountDue: ownSubOrder.amountDue,
      status: ownSubOrder.status,
      codCollected: Boolean(ownSubOrder.codCollected),
      collectedAt: ownSubOrder.collectedAt || null
    }
  };
};

// @desc    Get orders containing subOrders for the authenticated seller
// @route   GET /api/v1/seller/orders?status=&page=&limit=&search=
// @access  Private (Seller only)
const sellerGetOrders = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { status, page, limit, search } = req.query;

    // Aggregate counts per status for this seller's subOrders across visible orders only (COD or paid)
    // Uses the index on subOrders.sellerId
    const visibilityMatch = {
      $or: [
        { paymentMethod: 'cod' },
        { paymentStatus: 'paid' }
      ]
    };

    const statusCountsAgg = await Order.aggregate([
      {
        $match: {
          'subOrders.sellerId': sellerId,
          ...visibilityMatch
        }
      },
      { $unwind: '$subOrders' },
      { $match: { 'subOrders.sellerId': sellerId } },
      { $group: { _id: '$subOrders.status', count: { $sum: 1 } } }
    ]);

    const counts = {
      all: 0,
      pending: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    for (const item of statusCountsAgg) {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
      counts.all += item.count;
    }

    // Build query for orders (visible to sellers only: COD or paid)
    const query = {
      subOrders: {
        $elemMatch: {
          sellerId: sellerId
        }
      },
      $and: [
        visibilityMatch
      ]
    };

    // Filter by subOrder status if specified
    if (status && ['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.subOrders.$elemMatch.status = status;
    }

    // Filter by search: order ID or customer display name
    if (search && typeof search === 'string') {
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        const cappedSearch = trimmedSearch.slice(0, 50);
        const cleanSearch = cappedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Find any registered users matching name
        const matchingUsers = await User.find({
          name: { $regex: cleanSearch, $options: 'i' }
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);

        const searchOr = [
          { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: cleanSearch, options: 'i' } } },
          { guestName: { $regex: cleanSearch, $options: 'i' } }
        ];

        if (userIds.length > 0) {
          searchOr.push({ user: { $in: userIds } });
        }

        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push({ $or: searchOr });
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name')
      .lean();

    const formattedOrders = orders
      .map(o => formatSellerOrder(o, sellerId))
      .filter(Boolean);

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limitNum) || 1
      },
      counts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order details for authenticated seller
// @route   GET /api/v1/seller/orders/:orderId
// @access  Private (Seller only)
const sellerGetOrderById = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { orderId } = req.params;

    // 1. Invalid ObjectId -> 404
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 2. Lookup order
    const order = await Order.findById(orderId)
      .populate('user', 'name')
      .lean();

    // Nonexistent order or invisible (unpaid online order) -> 404
    if (!order || !isOrderVisibleToSeller(order)) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 3. Format and verify ownership of a subOrder in this order
    const formatted = formatSellerOrder(order, sellerId);

    // Order with no subOrder for this seller -> identical 404
    if (!formatted) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update seller's own subOrder status
// @route   PUT /api/v1/seller/orders/:orderId/status
// @access  Private (Seller only)
const sellerUpdateSubOrderStatus = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { orderId } = req.params;
    const { status: newStatus } = req.body;

    // 1. Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 2. Validate requested status value
    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // 3. Find order containing this seller's subOrder
    const order = await Order.findOne({
      _id: orderId,
      subOrders: { $elemMatch: { sellerId: sellerId } }
    });

    if (!order || !isOrderVisibleToSeller(order)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Seller cannot cancel a part of a paid online order
    if (newStatus === 'cancelled' && order.paymentMethod.toLowerCase() === 'online' && order.paymentStatus === 'paid') {
      return res.status(403).json({
        success: false,
        message: 'Paid online orders can only be cancelled by an admin'
      });
    }

    // 4. Find the specific subOrder
    const subOrder = order.subOrders.find(
      s => s.sellerId && s.sellerId.toString() === sellerId.toString()
    );

    const currentStatus = subOrder.status;

    // 5. Same status -> 409
    if (currentStatus === newStatus) {
      return res.status(409).json({
        success: false,
        message: `SubOrder is already in status '${currentStatus}'`
      });
    }

    // 6. Validate transition
    if (!isValidSellerTransition(currentStatus, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: '${currentStatus}' -> '${newStatus}'`
      });
    }

    // 7. Atomic update with precondition to prevent race conditions
    const setFields = { 'subOrders.$[elem].status': newStatus };
    if (newStatus === 'delivered') {
      setFields['subOrders.$[elem].deliveredAt'] = new Date();
    }
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        subOrders: {
          $elemMatch: { sellerId: sellerId, status: currentStatus }
        }
      },
      {
        $set: setFields
      },
      {
        arrayFilters: [{ 'elem.sellerId': sellerId, 'elem.status': currentStatus }],
        new: true
      }
    ).populate('user', 'name');

    // If null: someone else already changed status (race)
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict; please retry'
      });
    }

    // 8. If cancelling: restore stock for items in THIS subOrder only (if stock was decremented)
    if (newStatus === 'cancelled' && stockWasDecremented(order)) {
      const cancelledSub = updated.subOrders.find(
        s => s.sellerId && s.sellerId.toString() === sellerId.toString()
      );
      if (cancelledSub && cancelledSub.items.length > 0) {
        await Product.bulkWrite(
          cancelledSub.items.map(item => ({
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { stock: item.quantity } }
            }
          }))
        );
      }
    }

    // 9. Re-derive and save parent status
    const freshDoc = await Order.findById(orderId).populate('user', 'name');
    freshDoc.orderStatus = deriveParentStatus(freshDoc.subOrders);

    const newPaymentStatus = deriveParentPaymentStatus(freshDoc, freshDoc.subOrders);
    if (newPaymentStatus !== null) {
      freshDoc.paymentStatus = newPaymentStatus;
    }

    await freshDoc.save();

    // 10. Return seller-scoped view
    const formatted = formatSellerOrder(freshDoc.toObject({ virtuals: false }), sellerId);
    return res.json({ success: true, order: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Seller marks own subOrder COD as collected
// @route   PUT /api/v1/seller/orders/:orderId/collect-cash
// @access  Private (Seller only)
const sellerCollectCash = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const { orderId } = req.params;

    // 1. Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 2. Find order containing this seller's subOrder
    const order = await Order.findOne({
      _id: orderId,
      subOrders: { $elemMatch: { sellerId: sellerId } }
    });

    if (!order || !isOrderVisibleToSeller(order)) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 3. Must be a COD order
    if (order.paymentMethod.toLowerCase() !== 'cod') {
      return res.status(400).json({
        success: false,
        message: 'Cash collection only applies to COD orders'
      });
    }

    // 4. Find the subOrder
    const subOrder = order.subOrders.find(
      s => s.sellerId && s.sellerId.toString() === sellerId.toString()
    );

    // 5. subOrder status must be shipped or delivered
    if (!['shipped', 'delivered'].includes(subOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot collect cash: subOrder status is '${subOrder.status}' (must be shipped or delivered)`
      });
    }

    // 6. Already collected -> 409
    if (subOrder.codCollected === true) {
      return res.status(409).json({
        success: false,
        message: 'Cash already collected for this subOrder'
      });
    }

    // 7. Atomic update with precondition
    const now = new Date();
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        subOrders: {
          $elemMatch: { sellerId: sellerId, codCollected: false, status: { $in: ['shipped', 'delivered'] } }
        }
      },
      {
        $set: {
          'subOrders.$[elem].codCollected': true,
          'subOrders.$[elem].collectedBy': sellerId,
          'subOrders.$[elem].collectedAt': now
        }
      },
      {
        arrayFilters: [
          { 'elem.sellerId': sellerId, 'elem.codCollected': false, 'elem.status': { $in: ['shipped', 'delivered'] } }
        ],
        new: true
      }
    ).populate('user', 'name');

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict; please retry'
      });
    }

    // 8. Re-derive parent paymentStatus
    const newPaymentStatus = deriveParentPaymentStatus(updated, updated.subOrders);
    if (newPaymentStatus !== null) {
      updated.paymentStatus = newPaymentStatus;
      await updated.save();
    }

    // 9. Fetch fresh for response
    const freshDoc = await Order.findById(orderId).populate('user', 'name');
    const formatted = formatSellerOrder(freshDoc.toObject({ virtuals: false }), sellerId);
    return res.json({ success: true, order: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales stats for seller dashboard (Stage 6-1)
// @route   GET /api/v1/seller/stats?range=7|30|90
// @access  Private (Approved Seller only)
const sellerGetStats = async (req, res, next) => {
  try {
    // 1. Validate seller role and approval
    if (!req.user || req.user.role !== 'seller' || req.user.sellerApplicationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden, approved seller resource only'
      });
    }

    const sellerId = req.user._id;
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    // 2. Validate range parameter (7, 30, 90; default 30)
    let range = 30;
    if (req.query.range !== undefined && req.query.range !== '') {
      const parsed = Number(req.query.range);
      if (![7, 30, 90].includes(parsed)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid range parameter. Must be 7, 30, or 90.'
        });
      }
      range = parsed;
    }

    // 3. UTC date window for range
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const startUTC = new Date(Date.UTC(y, m, d - (range - 1), 0, 0, 0, 0));
    const endUTC = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    // 4. Query range-scoped visible orders for THIS seller using subOrders.sellerId index
    const rangeAgg = await Order.aggregate([
      {
        $match: {
          'subOrders.sellerId': sellerObjectId,
          $or: [
            { paymentMethod: { $regex: /^cod$/i } },
            { paymentStatus: 'paid' }
          ],
          createdAt: { $gte: startUTC, $lte: endUTC }
        }
      },
      { $unwind: '$subOrders' },
      {
        $match: {
          'subOrders.sellerId': sellerObjectId
        }
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          subOrder: '$subOrders'
        }
      }
    ]);

    // 5. Compute totals, dailySeries, and topProducts via pure helper
    const { totals, dailySeries, topProducts } = computeTotalsAndSeries({
      unwoundItems: rangeAgg,
      range,
      referenceDate: now
    });

    // 6. Query cashToCollect (ALL TIME, COD parts shipped or delivered, codCollected false)
    const cashAgg = await Order.aggregate([
      {
        $match: {
          'subOrders.sellerId': sellerObjectId,
          paymentMethod: { $regex: /^cod$/i }
        }
      },
      { $unwind: '$subOrders' },
      {
        $match: {
          'subOrders.sellerId': sellerObjectId,
          'subOrders.status': { $in: ['shipped', 'delivered'] },
          $or: [
            { 'subOrders.codCollected': false },
            { 'subOrders.codCollected': { $exists: false } },
            { 'subOrders.codCollected': null }
          ]
        }
      },
      {
        $project: {
          subtotal: '$subOrders.subtotal',
          amountDue: '$subOrders.amountDue'
        }
      }
    ]);

    const cashToCollect = computeCashToCollect(cashAgg);

    // 7. Query lowStock (approved products with stock <= 5, up to 10, all time)
    const lowStockDocs = await Product.find({
      sellerId: sellerObjectId,
      status: 'approved',
      stock: { $lte: 5 }
    })
      .sort({ stock: 1 })
      .limit(10)
      .select('_id name stock')
      .lean();

    const lowStock = lowStockDocs.map(p => ({
      productId: p._id.toString(),
      name: p.name,
      stock: p.stock
    }));

    // 8. Query productStatusCounts (all time)
    const productStatusAgg = await Product.aggregate([
      { $match: { sellerId: sellerObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const productStatusCounts = {
      approved: 0,
      pending_review: 0,
      rejected: 0
    };
    for (const item of productStatusAgg) {
      if (productStatusCounts.hasOwnProperty(item._id)) {
        productStatusCounts[item._id] = item.count;
      }
    }

    // 9. Return whitelist-only JSON response
    return res.json({
      success: true,
      range,
      totals,
      cashToCollect,
      dailySeries,
      topProducts,
      lowStock,
      productStatusCounts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sellerGetOrders,
  sellerGetOrderById,
  formatSellerOrder,
  sellerUpdateSubOrderStatus,
  sellerCollectCash,
  sellerGetStats
};

