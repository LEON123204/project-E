const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { createProductReview } = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { reviewValidation } = require('../middleware/validation');

// Public Product routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin-only Product CRUD routes (with image uploads)
router.post('/', protect, admin, upload.array('images', 5), createProduct);
router.put('/:id', protect, admin, upload.array('images', 5), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

// Review route - nested RESTfully under products
router.post('/:productId/reviews', protect, reviewValidation, createProductReview);

module.exports = router;
