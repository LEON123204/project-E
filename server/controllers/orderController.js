const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const { splitOrderBySeller } = require('../utils/orderSplit');
const {
  isValidAdminTransition,
  deriveParentStatus,
  deriveParentPaymentStatus,
  stockWasDecremented
} = require('../utils/subOrderState');

// Initialize Stripe conditionally
let stripe;
const isStripeConfigured = () => {
  return process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder');
};

if (isStripeConfigured()) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// @desc    Create new order & initiate payment flow (Stripe or COD)
// @route   POST /api/v1/orders
// @access  Private / Guest
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, guestEmail, guestName, paymentMethod: rawPaymentMethod } = req.body;
    const paymentMethod = ['online', 'cod'].includes(rawPaymentMethod) ? rawPaymentMethod : 'online';

    let orderItemsInput = items || req.body.orderItems;
    if ((!orderItemsInput || orderItemsInput.length === 0) && req.user) {
      const userCart = await Cart.findOne({ user: req.user._id });
      if (userCart && userCart.items && userCart.items.length > 0) {
        orderItemsInput = userCart.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        }));
      }
    }

    if (!orderItemsInput || orderItemsInput.length === 0) {
      res.status(400);
      throw new Error('No order items provided');
    }

    if (!shippingAddress) {
      res.status(400);
      throw new Error('Shipping address is required');
    }

    if (!req.user && (!guestEmail || !guestName)) {
      res.status(400);
      throw new Error('Guest email and name are required for guest checkout');
    }

    // Verify stock and price from database for each item
    const orderItems = [];
    let subtotal = 0;

    for (const item of orderItemsInput) {
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        res.status(400);
        throw new Error(`Product not found: ${item.product}`);
      }

      const product = await Product.findById(item.product);
      if (!product) {
        res.status(400);
        throw new Error(`Product not found: ${item.product}`);
      }

      if (product.status && product.status !== 'approved') {
        res.status(400);
        throw new Error(`Product is not available for purchase: ${product.name}`);
      }

      // Sellers cannot purchase their own product
      if (product.sellerId && req.user && product.sellerId.toString() === req.user._id.toString()) {
        res.status(400);
        if (orderItemsInput.length > 1) {
          throw new Error(`You cannot purchase your own product: ${product.name}`);
        }
        throw new Error('You cannot purchase your own product');
      }

      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}`);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price, // Save purchase-time price
        sellerId: product.sellerId || null
      });

      subtotal += product.price * item.quantity;
    }

    // Calculate prepay discount: 5% off subtotal if online, 0 if COD
    const PREPAY_DISCOUNT_PERCENT = 0.05;
    const prepayDiscount = paymentMethod === 'online'
      ? Math.round(subtotal * PREPAY_DISCOUNT_PERCENT * 100) / 100
      : 0;

    const shippingCost = subtotal > 1000 ? 0 : 99.00;
    const estimatedTax = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.max(0, subtotal - prepayDiscount + shippingCost + estimatedTax);

    // Split order into subOrders grouped by seller
    let subOrders;
    try {
      subOrders = splitOrderBySeller({
        items: orderItems,
        subtotal,
        taxAmount: estimatedTax,
        shippingAmount: shippingCost,
        prepayDiscount,
        totalAmount
      });
    } catch (splitError) {
      res.status(400);
      throw new Error(`Order split failed: ${splitError.message}`);
    }

    let clientSecret = null;
    let paymentIntentId = null;

    if (paymentMethod === 'online') {
      // Initialize Stripe Payment Intent if configured
      if (isStripeConfigured()) {
        try {
          // Stripe expects amount in cents
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'inr',
            metadata: {
              userId: req.user ? req.user._id.toString() : 'guest',
              guestEmail: req.user ? undefined : guestEmail
            }
          });
          clientSecret = paymentIntent.client_secret;
          paymentIntentId = paymentIntent.id;
        } catch (stripeError) {
          console.error('Stripe PaymentIntent creation failed:', stripeError.message);
          res.status(500);
          throw new Error(`Stripe error: ${stripeError.message}`);
        }
      } else {
        // Mock payment intent for fallback testing
        clientSecret = 'mock_client_secret_' + Date.now();
        paymentIntentId = 'mock_pi_' + Date.now();
      }
    } else if (paymentMethod === 'cod') {
      // For COD: Perform atomic stock reservation/decrement immediately at order creation
      const updatedProducts = [];
      try {
        for (const item of orderItems) {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true }
          );

          if (!updatedProduct) {
            throw new Error(`Insufficient stock for product: ${item.name}`);
          }
          updatedProducts.push({ product: item.product, quantity: item.quantity });
        }
      } catch (err) {
        // Rollback any successfully decremented items
        for (const rolledBack of updatedProducts) {
          await Product.findByIdAndUpdate(rolledBack.product, {
            $inc: { stock: rolledBack.quantity }
          });
        }
        res.status(400);
        throw new Error(err.message || 'Order creation failed due to insufficient stock.');
      }
    }

    // Create the order in DB with 'pending' payment and order status
    const orderData = {
      items: orderItems,
      subOrders,
      shippingAddress,
      paymentMethod,
      subtotal,
      prepayDiscount,
      totalAmount,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      paymentIntentId
    };

    if (req.user) {
      orderData.user = req.user._id;
    } else {
      orderData.isGuest = true;
      orderData.guestEmail = guestEmail;
      orderData.guestName = guestName;
    }

    const order = await Order.create(orderData);

    // Clear user's DB cart on order creation if logged in and not a Buy Now order
    if (req.user && !req.body.isBuyNow) {
      await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });
    }

    res.status(201).json({
      success: true,
      order,
      clientSecret
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Stripe payment intent & decrement product stock
// @route   POST /api/v1/orders/confirm-payment
// @access  Private
const confirmPayment = async (req, res, next) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Verify order ownership
    if (order.user) {
      if (!req.user || (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
        res.status(403);
        throw new Error('Not authorized to access this order');
      }
    } else {
      if (req.user && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to access this order');
      }
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Order is already marked as paid', order });
    }

    const allPartsCancelled = order.subOrders && order.subOrders.length > 0 && order.subOrders.every(s => s.status === 'cancelled');
    if (order.orderStatus === 'cancelled' || allPartsCancelled) {
      res.status(400);
      throw new Error('Cannot confirm payment for a cancelled order');
    }

    let isSuccess = false;

    if (isStripeConfigured()) {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'succeeded') {
        isSuccess = true;
      }
    } else {
      // Automatic mock confirmation
      isSuccess = true;
    }

    if (isSuccess) {
      order.paymentStatus = 'paid';
      order.paymentIntentId = paymentIntentId;
      await order.save();

      // Decrement stock for purchased products atomically, verifying stock is sufficient
      const updatedProducts = [];
      try {
        for (const item of order.items) {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true }
          );

          if (!updatedProduct) {
            throw new Error(`Insufficient stock or product not found: ${item.name || 'Unknown Item'}`);
          }
          updatedProducts.push({ product: item.product, quantity: item.quantity });
        }
      } catch (err) {
        // Rollback any successfully decremented items in this transaction block
        for (const rolledBack of updatedProducts) {
          await Product.findByIdAndUpdate(rolledBack.product, {
            $inc: { stock: rolledBack.quantity }
          });
        }

        // Mark the order payment status as failed since the payment verification failed due to stock issues
        order.paymentStatus = 'failed';
        await order.save();

        res.status(400);
        throw new Error(err.message || 'Payment confirmation failed due to insufficient stock.');
      }

      // Mock confirmation email to console
      console.log(`\n========================================`);
      console.log(`MOCK EMAIL SENT TO: ${req.user ? req.user.email : order.guestEmail}`);
      console.log(`SUBJECT: Order Confirmation - Order #${order._id}`);
      console.log(`BODY: Thank you for your purchase of ₹${order.totalAmount.toFixed(2)}.`);
      console.log(`========================================\n`);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        order
      });
    } else {
      order.paymentStatus = 'failed';
      await order.save();
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Authorized check: user owns order, or is admin
    if (order.user) {
      if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to view this order');
      }
    } else {
      if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to view this order');
      }
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders
// @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Invalid order status');
    }

    // Legacy order without subOrders: preserve exact legacy behavior
    if (!order.subOrders || order.subOrders.length === 0) {
      if (order.paymentStatus === 'paid') {
        if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: item.quantity }
            });
          }
        }

        if (order.orderStatus === 'cancelled' && status !== 'cancelled') {
          const updatedProducts = [];
          try {
            for (const item of order.items) {
              const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
              );
              if (!updatedProduct) {
                throw new Error(`Insufficient stock for product: ${item.name || 'item'}`);
              }
              updatedProducts.push({ product: item.product, quantity: item.quantity });
            }
          } catch (err) {
            for (const rolledBack of updatedProducts) {
              await Product.findByIdAndUpdate(rolledBack.product, {
                $inc: { stock: rolledBack.quantity }
              });
            }
            res.status(400);
            throw new Error(err.message || 'Failed to restore order due to insufficient stock.');
          }
        }
      }

      order.orderStatus = status;
      const updatedOrder = await order.save();
      return res.json({
        success: true,
        order: updatedOrder
      });
    }

    // Modern order with subOrders:
    // Apply ONLY to subOrders that can legally make that move.
    // Skip cancelled/delivered ones, never overwrite a seller's delivered part.
    // Cancelling an order restores stock ONLY for subOrders that were not already cancelled (never twice).
    const stockWasDecrementedFlag = stockWasDecremented(order);
    const itemsToRestore = [];

    for (const sub of order.subOrders) {
      if (sub.status === status) {
        continue;
      }
      if (isValidAdminTransition(sub.status, status)) {
        if (status === 'cancelled' && stockWasDecrementedFlag) {
          for (const item of sub.items) {
            itemsToRestore.push({ product: item.product, quantity: item.quantity });
          }
        }
        sub.status = status;
      }
    }

    if (itemsToRestore.length > 0) {
      await Product.bulkWrite(
        itemsToRestore.map(item => ({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { stock: item.quantity } }
          }
        }))
      );
    }

    // Re-derive parent orderStatus and paymentStatus
    order.orderStatus = deriveParentStatus(order.subOrders);
    const newPaymentStatus = deriveParentPaymentStatus(order, order.subOrders);
    if (newPaymentStatus !== null) {
      order.paymentStatus = newPaymentStatus;
    }

    const updatedOrder = await order.save();

    res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details for tracking (Guest, Owner, or Admin)
// @route   GET /api/v1/orders/guest/:id
// @access  Public (Optional Protect)
const getGuestOrder = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(404);
      throw new Error('Order not found');
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // 1. Authorized if user is admin
    const isAdmin = req.user && req.user.role === 'admin';

    // 2. Authorized if logged-in user owns the order
    const isOwner = req.user && order.user && (
      order.user._id ? order.user._id.toString() : order.user.toString()
    ) === req.user._id.toString();

    if (isAdmin || isOwner) {
      return res.json({
        success: true,
        order
      });
    }

    // 3. Guest or non-owner: must supply matching order email (trimmed, case-insensitive)
    const orderEmail = order.guestEmail || (order.user && order.user.email);
    const providedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!providedEmail || !orderEmail || orderEmail.trim().toLowerCase() !== providedEmail) {
      res.status(404);
      throw new Error('Order not found');
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark COD order payment as collected (Admin only)
// @route   PUT /api/v1/orders/:id/collect-payment
// @access  Private/Admin
const markPaymentCollected = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Payment is already marked as collected/paid',
        order
      });
    }

    if (order.subOrders && order.subOrders.length > 0) {
      const now = new Date();
      for (const sub of order.subOrders) {
        if (sub.status !== 'cancelled') {
          sub.codCollected = true;
          sub.collectedBy = req.user._id;
          sub.collectedAt = now;
        }
      }
      const newPaymentStatus = deriveParentPaymentStatus(order, order.subOrders);
      if (newPaymentStatus !== null) {
        order.paymentStatus = newPaymentStatus;
      } else {
        order.paymentStatus = 'paid';
      }
    } else {
      order.paymentStatus = 'paid';
    }

    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: 'Payment marked as collected successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin update subOrder status
// @route   PUT /api/v1/orders/:orderId/suborders/:subOrderId/status
// @access  Private/Admin
const adminUpdateSubOrderStatus = async (req, res, next) => {
  try {
    const { orderId, subOrderId } = req.params;
    const { status: newStatus } = req.body;

    // 1. Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(subOrderId)) {
      return res.status(404).json({ success: false, message: 'Order or sub-order not found' });
    }

    // 2. Validate status value
    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // 3. Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 4. Find subOrder
    const subOrder = (order.subOrders || []).find(
      s => s._id.toString() === subOrderId.toString()
    );
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'SubOrder not found' });
    }

    // Do not allow part-level cancellation of an unpaid online order
    if (newStatus === 'cancelled' && order.paymentMethod.toLowerCase() === 'online' && order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is awaiting payment; cancel the whole order from the admin order list'
      });
    }

    const currentStatus = subOrder.status;

    // 5. Same status -> 409
    if (currentStatus === newStatus) {
      return res.status(409).json({
        success: false,
        message: `SubOrder is already in status '${currentStatus}'`
      });
    }

    // 6. Validate transition for admin
    if (!isValidAdminTransition(currentStatus, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: '${currentStatus}' -> '${newStatus}'`
      });
    }

    // 7. Atomic update with precondition to prevent race conditions
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        subOrders: {
          $elemMatch: { _id: subOrderId, status: currentStatus }
        }
      },
      {
        $set: { 'subOrders.$[elem].status': newStatus }
      },
      {
        arrayFilters: [{ 'elem._id': subOrderId, 'elem.status': currentStatus }],
        new: true
      }
    ).populate('user', 'name email');

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent update conflict; please retry'
      });
    }

    // 8. If cancelling: restore stock for items in THIS subOrder only (if stock was decremented)
    if (newStatus === 'cancelled' && stockWasDecremented(order)) {
      const cancelledSub = updated.subOrders.find(
        s => s._id.toString() === subOrderId.toString()
      );
      if (cancelledSub && cancelledSub.items && cancelledSub.items.length > 0) {
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
    const freshDoc = await Order.findById(orderId).populate('user', 'name email');
    freshDoc.orderStatus = deriveParentStatus(freshDoc.subOrders);

    const newPaymentStatus = deriveParentPaymentStatus(freshDoc, freshDoc.subOrders);
    if (newPaymentStatus !== null) {
      freshDoc.paymentStatus = newPaymentStatus;
    }

    await freshDoc.save();

    return res.json({ success: true, order: freshDoc });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin marks subOrder COD cash as collected
// @route   PUT /api/v1/orders/:orderId/suborders/:subOrderId/collect-cash
// @access  Private/Admin
const adminCollectCash = async (req, res, next) => {
  try {
    const { orderId, subOrderId } = req.params;

    // 1. Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(subOrderId)) {
      return res.status(404).json({ success: false, message: 'Order or sub-order not found' });
    }

    // 2. Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 3. Check COD
    if (order.paymentMethod.toLowerCase() !== 'cod') {
      return res.status(400).json({
        success: false,
        message: 'Cash collection only applies to COD orders'
      });
    }

    // 4. Find subOrder
    const subOrder = (order.subOrders || []).find(
      s => s._id.toString() === subOrderId.toString()
    );
    if (!subOrder) {
      return res.status(404).json({ success: false, message: 'SubOrder not found' });
    }

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
          $elemMatch: { _id: subOrderId, codCollected: false, status: { $in: ['shipped', 'delivered'] } }
        }
      },
      {
        $set: {
          'subOrders.$[elem].codCollected': true,
          'subOrders.$[elem].collectedBy': req.user._id,
          'subOrders.$[elem].collectedAt': now
        }
      },
      {
        arrayFilters: [
          { 'elem._id': subOrderId, 'elem.codCollected': false, 'elem.status': { $in: ['shipped', 'delivered'] } }
        ],
        new: true
      }
    ).populate('user', 'name email');

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

    const freshDoc = await Order.findById(orderId).populate('user', 'name email');
    return res.json({ success: true, order: freshDoc });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getGuestOrder,
  markPaymentCollected,
  adminUpdateSubOrderStatus,
  adminCollectCash
};
