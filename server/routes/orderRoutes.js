const express = require('express');
const router = express.Router();
const {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  getGuestOrder
} = require('../controllers/orderController');
const { protect, admin, optionalProtect } = require('../middleware/auth');

// Customer and Shared Protected routes
router.post('/', optionalProtect, createOrder);
router.post('/confirm-payment', optionalProtect, confirmPayment);
router.get('/my-orders', protect, getMyOrders);
router.get('/guest/:id', getGuestOrder);
router.get('/:id', protect, getOrderById);

// Admin-only Order Management routes
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
