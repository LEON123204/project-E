const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Initialize Stripe conditionally
let stripe;
const isStripeConfigured = () => {
  return process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_placeholder');
};

if (isStripeConfigured()) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// @desc    Create new order & initiate Stripe payment
// @route   POST /api/v1/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, guestEmail, guestName } = req.body;

    if (!items || items.length === 0) {
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
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.product}`);
      }

      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}`);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price // Save purchase-time price
      });

      totalAmount += product.price * item.quantity;
    }

    // Initialize Stripe Payment Intent if configured
    let clientSecret = null;
    let paymentIntentId = null;

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

    // Create the order in DB with 'pending' status
    const orderData = {
      items: orderItems,
      shippingAddress,
      totalAmount,
      paymentStatus: 'pending',
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

    // Clear user's DB cart on order creation if logged in
    if (req.user) {
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

    // Special logic: If order is paid, handle stock on cancellation/restoration
    if (order.paymentStatus === 'paid') {
      // If order is cancelled, return items back to stock
      if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity }
          });
        }
      }

      // If status is restored from cancelled to pending/shipped, subtract stock again
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
          // Rollback
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

    res.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get guest order by ID and Email (Public lookup)
// @route   GET /api/v1/orders/guest/:id
// @access  Public
const getGuestOrder = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      res.status(400);
      throw new Error('Email is required to track a guest order');
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Verify it's a guest order and the email matches
    if (!order.isGuest || !order.guestEmail || order.guestEmail.toLowerCase() !== email.toLowerCase()) {
      res.status(403);
      throw new Error('Not authorized to access this order or email mismatch');
    }

    res.json({
      success: true,
      order
    });
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
  getGuestOrder
};
