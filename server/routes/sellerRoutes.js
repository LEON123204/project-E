const express = require('express');
const router = express.Router();
const { applyForSeller, getSellerStatus } = require('../controllers/sellerController');
const {
  sellerCreateProduct,
  sellerGetProducts,
  sellerUpdateProduct,
  sellerDeleteProduct
} = require('../controllers/sellerProductController');
const { protect, seller } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Private Seller Application Endpoints (any authenticated user can apply)
router.post('/apply', protect, applyForSeller);
router.get('/status', protect, getSellerStatus);

// Seller-only Product Management Endpoints
// All routes below require: authenticated + role === 'seller'
router.get('/products', protect, seller, sellerGetProducts);
router.post('/products', protect, seller, upload.array('images', 5), sellerCreateProduct);
router.put('/products/:id', protect, seller, upload.array('images', 5), sellerUpdateProduct);
router.delete('/products/:id', protect, seller, sellerDeleteProduct);

module.exports = router;
