'use strict';

const express = require('express');
const router = express.Router();
const { handleChat, handleAddToCart } = require('../controllers/chatController');
const { optionalProtect, protect } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');

// POST /api/v1/chat
// Public route — guests can use Rex too.
// If a valid JWT is present, optionalProtect attaches req.user for order lookups.
router.post('/', chatLimiter, optionalProtect, handleChat);

// POST /api/v1/chat/add-to-cart
// Authenticated only — adds a specific product to the user's cart from Rex's suggestion.
router.post('/add-to-cart', protect, handleAddToCart);

module.exports = router;

