const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

// A user can only review a product once
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to calculate avg ratings
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        ratingsAvg: { $avg: '$rating' },
        reviewsCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      ratingsAvg: Math.round(stats[0].ratingsAvg * 10) / 10,
      reviewsCount: stats[0].reviewsCount
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      ratingsAvg: 0,
      reviewsCount: 0
    });
  }
};

// Call calculateAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

// Call calculateAverageRating after deletion (using findOneAndDelete or deleteOne hooks if needed)
reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.calculateAverageRating(this.product);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
