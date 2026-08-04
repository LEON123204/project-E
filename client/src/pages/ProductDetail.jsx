import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ProductDetailSkeleton } from '../components/SkeletonLoader';
import { Heart, ShoppingCart, Star, Plus, Minus, Check, AlertCircle } from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  // Gallery and cart quantity state
  const [activeImage, setActiveImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const addToRecentlyViewed = (prod) => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter(item => item._id !== prod._id);
      list.unshift({
        _id: prod._id,
        name: prod.name,
        price: prod.price,
        images: prod.images,
        ratingsAvg: prod.ratingsAvg,
        reviewsCount: prod.reviewsCount,
        category: prod.category
      });
      if (list.length > 6) {
        list = list.slice(0, 6);
      }
      localStorage.setItem('recentlyViewed', JSON.stringify(list));
    } catch (err) {
      console.error('Error saving to recently viewed:', err);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const productData = response.data.product;
      setProduct(productData);
      setReviews(response.data.reviews);
      setActiveImage(productData.images[0] || 'https://via.placeholder.com/600?text=No+Image');
      if (productData) {
        addToRecentlyViewed(productData);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(parsed.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error('Error loading recently viewed:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const handleQuantityChange = (type) => {
    if (type === 'inc') {
      if (quantity < product.stock) setQuantity(prev => prev + 1);
    } else {
      if (quantity > 1) setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return;
    setIsAdding(true);
    const res = await addToCart(product, quantity);
    setIsAdding(false);
    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } else {
      alert(res.message);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const response = await api.post(`/products/${product._id}/reviews`, {
        rating,
        comment
      });
      setReviewSuccess(response.data.message);
      setComment('');
      setRating(5);
      // Reload details to show the new review and updated rating average
      await fetchProductDetails();
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h2 className="text-xl font-bold text-slate-100">{error || 'Product not found'}</h2>
        <Link to="/shop" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-full font-medium mt-4">
          Back to Shop
        </Link>
      </div>
    );
  }

  const hasAlreadyReviewed = reviews.some(r => r.user?._id === product.user || (isAuthenticated && reviews.map(rev => rev.user?._id).includes(product.user))); // Simplified check or let backend handle duplicate
  const isOutOfStock = !product || product.stock <= 0;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen pt-8 sm:pt-12 pb-28 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
        
        {/* Core Product Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Left Panel: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-square bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-2xl">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => toggleWishlist(product._id)}
                className="absolute top-4 right-4 p-3 rounded-full bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-red-400 transition-smooth shadow-lg"
              >
                <Heart
                  size={20}
                  className={isInWishlist(product._id) ? 'fill-red-500 text-red-500' : ''}
                />
              </button>
            </div>
            
            {/* Gallery Thumbnails (Only show if multiple images exist) */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-square rounded-xl overflow-hidden border bg-slate-900 transition-smooth cursor-pointer ${
                      activeImage === img ? 'border-indigo-500 scale-95' : 'border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Detail Info & Checkout Controls */}
          <div className="flex flex-col justify-start py-2 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                {product.category?.name || 'Category'}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
                {product.name}
              </h1>
              
              {/* Stars Summary */}
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(product.ratingsAvg) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-200">{product.ratingsAvg.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({product.reviewsCount} customer reviews)</span>
              </div>
            </div>

            <div className="text-3xl font-extrabold text-slate-100">₹{product.price.toFixed(2)}</div>

            <hr className="border-slate-900" />

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-slate-350 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            <hr className="border-slate-900" />

            {/* Stock status indicator */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Availability:</span>
              {product.stock > 0 ? (
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-sm font-bold text-rose-400">Out of Stock</span>
              )}
            </div>

            {/* Cart add section — always row: qty control | add button */}
            <div className="flex flex-row items-stretch gap-3 pt-4">
              {/* Quantity Toggle — min 44px tall for touch */}
              <div className={`flex items-center border border-slate-800 bg-slate-900/60 rounded-xl px-1 min-h-[44px] w-[120px] shrink-0 ${isOutOfStock ? 'opacity-50 select-none' : ''}`}>
                <button
                  type="button"
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={() => handleQuantityChange('dec')}
                  className="flex-1 flex items-center justify-center min-h-[44px] hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-smooth disabled:text-slate-700"
                >
                  <Minus size={16} />
                </button>
                <span className="font-semibold text-slate-100 text-sm select-none px-1 text-center w-6">{isOutOfStock ? 0 : quantity}</span>
                <button
                  type="button"
                  disabled={isOutOfStock || quantity >= product.stock}
                  onClick={() => handleQuantityChange('inc')}
                  className="flex-1 flex items-center justify-center min-h-[44px] hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-smooth disabled:text-slate-700"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Add to Cart button — flex-1 fills remaining width */}
              <button
                type="button"
                disabled={isOutOfStock || isAdding}
                onClick={handleAddToCart}
                className={`flex-1 min-h-[44px] px-4 sm:px-8 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-smooth shadow-lg text-sm sm:text-base ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800/50 shadow-none'
                    : justAdded
                      ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {isOutOfStock ? (
                  <>
                    <AlertCircle size={18} />
                    <span>Out of Stock</span>
                  </>
                ) : justAdded ? (
                  <>
                    <Check size={18} />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 border-t border-slate-900 pt-10 sm:pt-16">
          
          {/* Review form / statistics */}
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-100">Customer Reviews</h2>
            
            {/* Reviews summary cards */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-100">{product.ratingsAvg.toFixed(1)}</span>
                <span className="text-sm text-slate-400">/ 5.0</span>
              </div>
              <div className="flex items-center text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < Math.round(product.ratingsAvg) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">Overall rating based on {reviews.length} reviews.</p>
            </div>

            {/* Create review form */}
            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-slate-200 text-base">Write a Review</h3>

                {reviewError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {reviewSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2">
                    <Check size={16} className="shrink-0" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {/* Stars selector */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-semibold">Rating</label>
                  <div className="flex gap-1 text-slate-750">
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={24}
                          className={starValue <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment area */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-semibold">Comment</label>
                  <textarea
                    rows={4}
                    placeholder="Share your thoughts about this product..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={reviewLoading || !comment.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-2 px-4 rounded-xl text-sm font-semibold transition-smooth cursor-pointer"
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center space-y-3">
                <p className="text-xs text-slate-400">Purchased this item? Log in to leave a star rating and review.</p>
                <Link
                  to="/login"
                  className="inline-block bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 text-xs font-semibold py-2 px-4 rounded-xl transition-smooth"
                >
                  Login to Review
                </Link>
              </div>
            )}
          </div>

          {/* List of reviews */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-200 text-lg border-b border-slate-900 pb-3">Reviews Summary</h3>
            
            {reviews.length === 0 ? (
              <p className="text-slate-500 text-sm italic">There are no reviews for this product yet.</p>
            ) : (
              <div className="space-y-6 max-h-[36rem] overflow-y-auto pr-2">
                {reviews.map((rev) => (
                  <div key={rev._id} className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200 text-sm">{rev.user?.name || 'Verified Buyer'}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-850'}
                        />
                      ))}
                    </div>

                    <p className="text-slate-350 text-xs leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
          <div className="border-t border-slate-900 mt-16 pt-16">
            <h3 className="font-extrabold text-slate-100 text-xl mb-8 tracking-tight">Recently Viewed Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-fadeIn">
              {recentlyViewed.map((item) => (
                <Link
                  key={item._id}
                  to={`/product/${item._id}`}
                  className="group bg-slate-900/30 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-xl overflow-hidden p-3 shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-2.5"
                >
                  <div className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden">
                    <img
                      src={item.images[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 text-xs transition-smooth">
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-100">₹{item.price.toLocaleString('en-IN')}</span>
                      {item.ratingsAvg > 0 && (
                        <div className="flex items-center gap-0.5 text-slate-400 text-[10px]">
                          <Star size={8} className="fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-slate-300">{item.ratingsAvg.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-4 z-50 flex items-center justify-between gap-4 md:hidden shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-slate-350 truncate font-semibold">{product.name}</span>
          <span className="text-sm font-extrabold text-slate-100">₹{product.price.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Quantity Toggle */}
          {!isOutOfStock && (
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/60 rounded-xl p-1 w-24">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => handleQuantityChange('dec')}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 disabled:text-slate-700"
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-semibold text-slate-200">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= product.stock}
                onClick={() => handleQuantityChange('inc')}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 disabled:text-slate-700"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
          
          {/* Add to Cart button */}
          <button
            type="button"
            disabled={isOutOfStock || isAdding}
            onClick={handleAddToCart}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-smooth ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750/50 shadow-none'
                : justAdded 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            {isOutOfStock ? (
              'Out of Stock'
            ) : justAdded ? (
              <>
                <Check size={14} />
                Added
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                {isAdding ? 'Adding...' : 'Add to Cart'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
