const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCustomers,
  getPendingSellerApplications,
  approveSellerApplication,
  rejectSellerApplication
} = require('../controllers/adminController');
const {
  adminGetSellerProducts,
  adminApproveSellerProduct,
  adminRejectSellerProduct
} = require('../controllers/sellerProductController');
const { protect, admin } = require('../middleware/auth');

// Apply protection to all routes in this router
router.use(protect);
router.use(admin);

router.get('/dashboard', getDashboardStats);
router.get('/customers', getCustomers);

// Seller Application Management
router.get('/seller-applications', getPendingSellerApplications);
router.put('/seller-applications/:userId/approve', approveSellerApplication);
router.put('/seller-applications/:userId/reject', rejectSellerApplication);

// Seller Product Review (approve/reject seller-submitted products)
router.get('/seller-products', adminGetSellerProducts);
router.put('/seller-products/:id/approve', adminApproveSellerProduct);
router.put('/seller-products/:id/reject', adminRejectSellerProduct);

module.exports = router;
