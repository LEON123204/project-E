const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', getCategories);

// Admin-only routes
router.post('/', protect, admin, createCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router;
