const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const cloudinary = require('../config/cloudinary');

// Helper: extract Cloudinary public_id from a secure URL and delete it
const deleteCloudinaryImage = async (imageUrl) => {
  try {
    if (!imageUrl.includes('res.cloudinary.com')) return;
    const parts = imageUrl.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary image:', err.message);
  }
};

// @desc    Create a new product as a seller
// @route   POST /api/v1/seller/products
// @access  Private/Seller
const sellerCreateProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock, discountPercent } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || stock === undefined) {
      res.status(400);
      throw new Error('name, description, price, category, and stock are all required');
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      res.status(400);
      throw new Error('Category not found');
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path); // Cloudinary secure URL
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      images,
      discountPercent: discountPercent ? Number(discountPercent) : 0,
      sellerId: req.user._id,   // ALWAYS server-side — never trust body
      status: 'pending_review'  // Must be approved by admin before going live
    });

    res.status(201).json({
      success: true,
      product,
      message: 'Product submitted for admin review. It will appear in the store once approved.'
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await cloudinary.uploader.destroy(file.filename).catch(() => {});
      }
    }
    next(error);
  }
};

// @desc    Get the logged-in seller's own products (all statuses)
// @route   GET /api/v1/seller/products
// @access  Private/Seller
const sellerGetProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    // Strictly filter by this seller's own ID — never leaks another seller's products
    const query = { sellerId: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Optionally filter by status (pending_review / approved / rejected)
    const allowedStatuses = ['pending_review', 'approved', 'rejected'];
    if (status && allowedStatuses.includes(status)) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
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

// @desc    Update a seller's own product
// @route   PUT /api/v1/seller/products/:id
// @access  Private/Seller
const sellerUpdateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // CRITICAL: Verify the product belongs to this seller
    // This prevents a seller from editing another seller's or an admin's product via a crafted request
    if (!product.sellerId || product.sellerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Forbidden: you do not own this product');
    }

    const { name, description, price, category, stock, discountPercent, removeImages } = req.body;

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        res.status(400);
        throw new Error('Category not found');
      }
      product.category = category;
    }

    // Handle image removal
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      for (const img of imagesToRemove) {
        await deleteCloudinaryImage(img);
        product.images = product.images.filter(existingImg => existingImg !== img);
      }
    }

    // Append new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      product.images = [...product.images, ...newImages];
    }

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? Number(price) : product.price;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    if (discountPercent !== undefined) {
      product.discountPercent = Number(discountPercent);
    }

    // When seller edits a product, reset to pending_review for re-approval
    // (prevents a seller from publishing rejected content by editing it slightly)
    product.status = 'pending_review';

    const updatedProduct = await product.save();
    res.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated and resubmitted for admin review.'
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await cloudinary.uploader.destroy(file.filename).catch(() => {});
      }
    }
    next(error);
  }
};

// @desc    Delete a seller's own product
// @route   DELETE /api/v1/seller/products/:id
// @access  Private/Seller
const sellerDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // CRITICAL: Verify the product belongs to this seller
    if (!product.sellerId || product.sellerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Forbidden: you do not own this product');
    }

    await Review.deleteMany({ product: product._id });

    for (const img of product.images) {
      await deleteCloudinaryImage(img);
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product and associated reviews deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Approve / Reject seller-submitted products
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all products pending admin review
// @route   GET /api/v1/admin/seller-products?status=pending_review|approved|rejected|all
// @access  Private/Admin
const adminGetSellerProducts = async (req, res, next) => {
  try {
    const { status = 'pending_review', page = 1, limit = 20 } = req.query;
    const allowedStatuses = ['pending_review', 'approved', 'rejected'];

    const query = { sellerId: { $ne: null } }; // Only seller-submitted products
    if (status !== 'all' && allowedStatuses.includes(status)) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('sellerId', 'name email businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      page: Number(page),
      totalPages: Math.ceil(totalProducts / Number(limit)),
      totalProducts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a seller-submitted product
// @route   PUT /api/v1/admin/seller-products/:id/approve
// @access  Private/Admin
const adminApproveSellerProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: { $ne: null } });

    if (!product) {
      res.status(404);
      throw new Error('Seller product not found');
    }

    product.status = 'approved';
    await product.save();

    res.json({
      success: true,
      message: `Product "${product.name}" approved and is now live in the store.`,
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a seller-submitted product
// @route   PUT /api/v1/admin/seller-products/:id/reject
// @access  Private/Admin
const adminRejectSellerProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: { $ne: null } });

    if (!product) {
      res.status(404);
      throw new Error('Seller product not found');
    }

    product.status = 'rejected';
    await product.save();

    res.json({
      success: true,
      message: `Product "${product.name}" rejected.`,
      product
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sellerCreateProduct,
  sellerGetProducts,
  sellerUpdateProduct,
  sellerDeleteProduct,
  adminGetSellerProducts,
  adminApproveSellerProduct,
  adminRejectSellerProduct
};
