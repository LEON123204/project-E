const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper to get or create cart for user
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Helper to format populated cart safely for API responses without modifying DB
const formatCartResponse = (cart) => {
  const cartObj = cart.toObject ? cart.toObject() : JSON.parse(JSON.stringify(cart));
  const safeItems = [];

  for (const item of (cartObj.items || [])) {
    // If product was completely deleted from DB (null reference), omit to prevent client null crashes
    if (!item.product) {
      continue;
    }

    // Flag availability based on approval status
    const isAvailable = (item.product.status === 'approved' || item.product.status == null);
    item.isAvailable = isAvailable;
    if (typeof item.product === 'object' && item.product !== null) {
      item.product.isAvailable = isAvailable;
    }
    safeItems.push(item);
  }

  cartObj.items = safeItems;
  return cartObj;
};

// @desc    Get current user's cart
// @route   GET /api/v1/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    
    // Populate product details including status
    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name price images stock ratingsAvg status'
    });

    res.json({
      success: true,
      cart: formatCartResponse(populatedCart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart or merge guest cart
// @route   POST /api/v1/cart
// @access  Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, guestItems } = req.body;
    const cart = await getOrCreateCart(req.user._id);

    // If guestItems is supplied, merge them (usually done right after login)
    if (guestItems && Array.isArray(guestItems)) {
      for (const item of guestItems) {
        if (!item.product) continue;
        const prodId = item.product._id || item.product;
        const qty = Number(item.quantity) || 1;

        // Verify product exists
        const productExists = await Product.findById(prodId);
        if (!productExists || (productExists.status && productExists.status !== 'approved')) continue;
        if (productExists.sellerId && req.user && productExists.sellerId.toString() === req.user._id.toString()) continue;

        const existingItemIndex = cart.items.findIndex(
          cartItem => cartItem.product.toString() === prodId.toString()
        );

        if (existingItemIndex > -1) {
          // Add quantities, checking stock limits
          const newQty = cart.items[existingItemIndex].quantity + qty;
          cart.items[existingItemIndex].quantity = Math.min(newQty, productExists.stock);
        } else {
          cart.items.push({
            product: prodId,
            quantity: Math.min(qty, productExists.stock)
          });
        }
      }
    } else {
      // Regular single item addition
      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        res.status(400);
        throw new Error('Valid Product ID is required');
      }

      const product = await Product.findById(productId);
      if (!product) {
        res.status(400);
        throw new Error('Product not found');
      }

      if (product.status && product.status !== 'approved') {
        res.status(400);
        throw new Error('Product is not available for purchase');
      }

      // Sellers cannot purchase their own product
      if (product.sellerId && req.user && product.sellerId.toString() === req.user._id.toString()) {
        res.status(400);
        throw new Error('You cannot purchase your own product');
      }

      if (product.stock === 0) {
        res.status(400);
        throw new Error('Product is out of stock');
      }

      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        const newQty = cart.items[existingItemIndex].quantity + Number(quantity);
        if (newQty > product.stock) {
          res.status(400);
          throw new Error(`Cannot add more items. Only ${product.stock} items in stock.`);
        }
        cart.items[existingItemIndex].quantity = newQty;
      } else {
        cart.items.push({
          product: productId,
          quantity: Math.min(Number(quantity), product.stock)
        });
      }
    }

    await cart.save();
    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name price images stock ratingsAvg status'
    });

    res.json({
      success: true,
      cart: formatCartResponse(populatedCart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:productId
// @access  Private
const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) < 1) {
      res.status(400);
      throw new Error('Valid quantity (minimum 1) is required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (Number(quantity) > product.stock) {
      res.status(400);
      throw new Error(`Only ${product.stock} items are in stock.`);
    }

    const cart = await getOrCreateCart(req.user._id);
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      res.status(404);
      throw new Error('Item not found in cart');
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name price images stock ratingsAvg status'
    });

    res.json({
      success: true,
      cart: formatCartResponse(populatedCart)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await getOrCreateCart(req.user._id);

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();
    const populatedCart = await cart.populate({
      path: 'items.product',
      select: 'name price images stock ratingsAvg status'
    });

    res.json({
      success: true,
      cart: formatCartResponse(populatedCart)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart
};
