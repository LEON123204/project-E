const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes require user authorization
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart);

router.route('/:productId')
  .put(updateCartItem)
  .delete(removeFromCart);

module.exports = router;
