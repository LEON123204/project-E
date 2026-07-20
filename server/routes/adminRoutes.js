const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCustomers
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Apply protection to all routes in this router
router.use(protect);
router.use(admin);

router.get('/dashboard', getDashboardStats);
router.get('/customers', getCustomers);

module.exports = router;
