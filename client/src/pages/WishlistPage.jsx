import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Heart, ShoppingCart, Star, ArrowRight, Trash2 } from 'lucide-react';

const WishlistPage = () => {
  const { wishlist, loading, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res.success) {
      // Remove from wishlist automatically once added to cart (optional, let's keep it in wishlist unless they remove it, or remove it. Let's keep it in wishlist, it's nice)
      alert('Product added to cart!');
    } else {
      alert(res.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-100 mb-8">My Wishlist</h1>

        {wishlist.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 sm:p-12 text-center max-w-lg mx-auto space-y-6">
            <Heart size={48} className="mx-auto text-slate-650" />
            <h2 className="text-xl font-bold text-slate-200">Your wishlist is empty</h2>
            <p className="text-slate-450 text-sm leading-relaxed">
              You haven't saved any items to your wishlist yet. Explore our products and click the heart icon on items you'd like to save for later!
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2.5 px-6 rounded-full transition-smooth shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Discover Products
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div
                key={product._id}
                className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between min-h-[24rem] h-full transition-smooth hover:translate-y-[-4px]"
              >
                {/* Image panel */}
                <div className="relative h-48 bg-slate-950 overflow-hidden">
                  <Link to={`/product/${product._id}`}>
                    <img
                      src={product.images[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-smooth duration-500"
                    />
                  </Link>
                  <button
                    onClick={() => toggleWishlist(product._id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-rose-500 hover:text-rose-400 transition-smooth"
                  >
                    <Trash2 size={16} />
                  </button>
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute bottom-3 left-3 text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 py-0.5 px-2 rounded-full font-semibold">
                      Only {product.stock} left!
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="absolute bottom-3 left-3 text-[10px] bg-red-500/20 border border-red-500/40 text-red-400 py-0.5 px-2 rounded-full font-semibold">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Details & Cart Add */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {product.category?.name || 'Category'}
                    </span>
                    <Link to={`/product/${product._id}`} className="block">
                      <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-smooth text-sm">
                        {product.name}
                      </h3>
                    </Link>
                    {/* Stars */}
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-200">
                        {product.ratingsAvg?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-slate-500">({product.reviewsCount || 0})</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-base font-extrabold text-slate-100">₹{product.price.toFixed(2)}</span>
                    <button
                      disabled={product.stock === 0}
                      onClick={() => handleAddToCart(product)}
                      className="bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2 rounded-full transition-smooth shadow-lg shadow-indigo-600/10 disabled:shadow-none cursor-pointer"
                    >
                      <ShoppingCart size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
