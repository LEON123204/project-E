const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Helper to get or create wishlist
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

// @desc    Get user wishlist
// @route   GET /api/v1/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user._id);
    
    const populatedWishlist = await wishlist.populate({
      path: 'products',
      select: 'name price images stock ratingsAvg reviewsCount'
    });

    res.json({
      success: true,
      wishlist: populatedWishlist.products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product in wishlist (Add/Remove)
// @route   POST /api/v1/wishlist/:productId
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const wishlist = await getOrCreateWishlist(req.user._id);

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const index = wishlist.products.indexOf(productId);
    let added = false;

    if (index > -1) {
      // Remove it
      wishlist.products.splice(index, 1);
    } else {
      // Add it
      wishlist.products.push(productId);
      added = true;
    }

    await wishlist.save();
    
    res.json({
      success: true,
      added,
      message: added ? 'Product added to wishlist' : 'Product removed from wishlist'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlist
};
