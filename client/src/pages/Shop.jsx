import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import useDebounce from '../hooks/useDebounce';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import { Heart, ShoppingCart, Star, Filter, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

const Shop = () => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mobile Filters drawer state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter States initialized from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [rating, setRating] = useState(searchParams.get('rating') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Debounced search term
  const debouncedSearch = useDebounce(search, 300);

  // Data States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState(null);

  // Sync Search state if URL parameter changes (e.g. searching from navbar)
  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch !== null && querySearch !== search) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data.categories);
      } catch (err) {
        console.error('Failed to load categories', err.message);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Build query string
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (category) params.append('category', category);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (rating) params.append('rating', rating);
        if (sort) params.append('sort', sort);
        params.append('page', page);
        params.append('limit', 8);

        // Update URL query parameters for bookmarkability/refresh persistence
        setSearchParams(params);

        const response = await api.get(`/products?${params.toString()}`);
        setProducts(response.data.products);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.totalProducts);
      } catch (err) {
        console.error('Failed to load products', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [debouncedSearch, category, minPrice, maxPrice, rating, sort, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, minPrice, maxPrice, rating, sort]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setSort('newest');
    setPage(1);
  };

  const handleAddToCart = async (product) => {
    setAddingToCartId(product._id);
    const res = await addToCart(product, 1);
    setAddingToCartId(null);
    if (!res.success) {
      alert(res.message);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-100 mb-6">Browse Products</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters Sidebar */}
          <div className={`lg:block bg-slate-900 border border-slate-850 p-6 rounded-2xl h-fit space-y-6 ${showMobileFilters ? 'block' : 'hidden'}`}>
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Filter size={18} className="text-indigo-400" />
                Filters
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-smooth cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search</label>
              <input
                type="text"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-4 text-sm text-slate-100 outline-none transition-smooth"
              />
            </div>

            {/* Categories Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-2">
                <button
                  onClick={() => setCategory('')}
                  className={`text-left text-sm py-1 px-2.5 rounded-lg transition-smooth cursor-pointer ${
                    category === ''
                      ? 'bg-indigo-650 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setCategory(cat.slug)}
                    className={`text-left text-sm py-1 px-2.5 rounded-lg transition-smooth cursor-pointer ${
                      category === cat.slug
                        ? 'bg-indigo-650 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Range (₹)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Minimum Rating</label>
              <div className="flex flex-col gap-1.5">
                {['', '4', '3', '2'].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-left text-sm py-1 px-2.5 rounded-lg flex items-center gap-1.5 transition-smooth cursor-pointer ${
                      rating === star
                        ? 'bg-indigo-650 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    {star === '' ? (
                      <span>All Ratings</span>
                    ) : (
                      <>
                        <div className="flex text-amber-400">
                          {Array.from({ length: Number(star) }).map((_, i) => (
                            <Star key={i} size={12} className="fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs font-medium">& Up</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid and Sorting/Pagination */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-850 p-4 rounded-2xl text-sm">
              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                <div className="text-slate-400 font-medium">
                  {loading ? 'Searching products...' : `Showing ${products.length} of ${totalProducts} products`}
                </div>
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-1.5 bg-indigo-650/15 border border-indigo-500/20 text-indigo-400 py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Filter size={14} />
                  {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Sort By:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-1.5 px-3 text-sm text-slate-200 outline-none transition-smooth cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(idx => <ProductCardSkeleton key={idx} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center space-y-4">
                <p className="text-slate-400 text-lg">No products found matching your search filters.</p>
                <button
                  onClick={handleResetFilters}
                  className="bg-indigo-650 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-full transition-smooth"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between h-[25rem] transition-smooth hover:translate-y-[-4px]"
                  >
                    {/* Thumbnail & Wishlist */}
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
                        className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-300 hover:text-red-400 transition-smooth"
                      >
                        <Heart
                          size={16}
                          className={isInWishlist(product._id) ? 'fill-red-500 text-red-500' : ''}
                        />
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

                    {/* Metadata & Actions */}
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
                        {/* Rating */}
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-slate-200">{product.ratingsAvg.toFixed(1)}</span>
                          <span className="text-slate-500">({product.reviewsCount})</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-base font-extrabold text-slate-100">₹{product.price.toFixed(2)}</span>
                        <button
                          disabled={product.stock === 0 || addingToCartId === product._id}
                          onClick={() => handleAddToCart(product)}
                          className="bg-indigo-650 hover:bg-indigo-505 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2 rounded-full transition-smooth shadow-lg shadow-indigo-600/10 disabled:shadow-none cursor-pointer"
                        >
                          <ShoppingCart size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 rounded-xl disabled:bg-slate-950 disabled:border-slate-950 disabled:text-slate-700 text-slate-300 transition-smooth cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-400">
                  Page <span className="text-slate-200 font-bold">{page}</span> of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 rounded-xl disabled:bg-slate-950 disabled:border-slate-950 disabled:text-slate-700 text-slate-300 transition-smooth cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
