const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create a new product review
// @route   POST /api/v1/products/:productId/reviews
// @access  Private
const createProductReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const { productId } = req.params;

    if (!rating || !comment) {
      res.status(400);
      throw new Error('Rating and comment are required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // 1. Verify if user already reviewed this product
    const alreadyReviewed = await Review.findOne({
      user: req.user._id,
      product: productId
    });

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('You have already reviewed this product');
    }

    // 2. Verify that the user has purchased this product in a paid order
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      paymentStatus: 'paid',
      'items.product': productId
    });

    if (!hasPurchased) {
      res.status(400);
      throw new Error('You can only review products you have purchased');
    }

    // 3. Create the review
    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating: Number(rating),
      comment
    });

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProductReview
};
