const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const fs = require('fs');
const path = require('path');

// Helper to remove image files from server disk
const deleteDiskImage = (imagePath) => {
  if (imagePath && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(__dirname, '..', imagePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error(`Failed to delete disk image: ${fullPath}`, err.message);
      }
    }
  }
};

// @desc    Get all products (with pagination, filtering, search, sorting)
// @route   GET /api/v1/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      sort
    } = req.query;

    const query = {};

    // Debounced text search (matches name/description case-insensitively)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by Category slug
    if (category) {
      const foundCategory = await Category.findOne({ slug: category });
      if (foundCategory) {
        query.category = foundCategory._id;
      } else {
        // If category slug is not found, return empty results early
        return res.json({
          success: true,
          products: [],
          page: Number(page),
          totalPages: 0,
          totalProducts: 0
        });
      }
    }

    // Filter by Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by Rating (minimum avg rating)
    if (rating) {
      query.ratingsAvg = { $gte: Number(rating) };
    }

    // Building Sort conditions
    let sortCondition = { createdAt: -1 }; // Default: Newest first
    if (sort) {
      if (sort === 'price-asc') sortCondition = { price: 1 };
      else if (sort === 'price-desc') sortCondition = { price: -1 };
      else if (sort === 'newest') sortCondition = { createdAt: -1 };
      else if (sort === 'popularity') sortCondition = { reviewsCount: -1, ratingsAvg: -1 };
    }

    // Pagination numbers
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortCondition)
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / Number(limit));

    res.json({
      success: true,
      products,
      page: Number(page),
      totalPages,
      totalProducts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product details
// @route   GET /api/v1/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // Find and populate reviews
    const reviews = await Review.find({ product: product._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      product,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/v1/products
// @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock } = req.body;

    // Check category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      res.status(400);
      throw new Error('Category not found');
    }

    // Handle uploaded images from multer
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      images
    });

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    // Cleanup files if DB write failed
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fullPath = path.join(__dirname, '../uploads', file.filename);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    }
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock, removeImages } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        res.status(400);
        throw new Error('Category not found');
      }
      product.category = category;
    }

    // Handle stringified or array list of image paths to remove
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages)
        ? removeImages
        : [removeImages];
      imagesToRemove.forEach(img => {
        deleteDiskImage(img);
        product.images = product.images.filter(existingImg => existingImg !== img);
      });
    }

    // Append new uploaded images if any
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      product.images = [...product.images, ...newImages];
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? Number(price) : product.price;
    product.stock = stock !== undefined ? Number(stock) : product.stock;

    const updatedProduct = await product.save();
    res.json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fullPath = path.join(__dirname, '../uploads', file.filename);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    }
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // Delete review records associated with this product
    await Review.deleteMany({ product: product._id });

    // Delete images from disk storage
    product.images.forEach(img => {
      deleteDiskImage(img);
    });

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product and associated reviews deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
