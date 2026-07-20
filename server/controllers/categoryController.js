const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category
// @route   POST /api/v1/categories
// @access  Private/Admin
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Category name is required');
    }

    // Generate url-friendly slug
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const categoryExists = await Category.findOne({ slug });
    if (categoryExists) {
      res.status(400);
      throw new Error('Category already exists');
    }

    const category = await Category.create({
      name,
      slug
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a category
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }

    // Check if any product belongs to this category
    const productCount = await Product.countDocuments({ category: categoryId });
    if (productCount > 0) {
      res.status(400);
      throw new Error(`Cannot delete category: ${productCount} product(s) belong to this category`);
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory
};
