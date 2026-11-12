const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');

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

    // Aggregate counts per status for this seller's subOrders across all orders
    // Uses the index on subOrders.sellerId
    const statusCountsAgg = await Order.aggregate([
      { $match: { 'subOrders.sellerId': sellerId } },
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

    // Build query for orders
    const query = {
      subOrders: {
        $elemMatch: {
          sellerId: sellerId
        }
      }
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

    // Nonexistent order -> 404
    if (!order) {
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

module.exports = {
  sellerGetOrders,
  sellerGetOrderById,
  formatSellerOrder
};

