'use strict';

const express = require('express');
const router = express.Router();
const { handleChat, handleAddToCart, debugSaleProducts } = require('../controllers/chatController');
const { optionalProtect, protect } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');

// POST /api/v1/chat
// Public route — guests can use Rex too.
// If a valid JWT is present, optionalProtect attaches req.user for order lookups.
router.post('/', chatLimiter, optionalProtect, handleChat);

// POST /api/v1/chat/add-to-cart
// Authenticated only — adds a specific product to the user's cart from Rex's suggestion.
router.post('/add-to-cart', protect, handleAddToCart);

// GET /api/v1/chat/debug-sale  — TEMPORARY: verify live server sale DB query
router.get('/debug-sale', async (req, res) => {
  const Product = require('../models/Product');
  const products = await Product.find({ discountPercent: { $gt: 0 } })
    .select('name price discountPercent stock')
    .sort({ discountPercent: -1 })
    .lean();
  const isSaleMsg = /(?:on\s+sale|deals?|what[''\u2019]s\s+on\s+sale)/i.test("What's on sale?");
  res.json({ count: products.length, isSaleMsgTest: isSaleMsg, products });
});

module.exports = router;
