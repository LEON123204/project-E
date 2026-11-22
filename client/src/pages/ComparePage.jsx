import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Star,
  ShoppingCart,
  ArrowLeftRight,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Tag
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useCompare } from '../context/CompareContext';
import { parseCompareIds } from '../utils/compareSelection';

/**
 * Currency formatter for Indian Rupees.
 * Returns consistent 2-decimal rupee string matching store conventions (e.g. ₹3499.00).
 * @param {number} num
 * @returns {string}
 */
export function formatRupees(num) {
  const val = Number(num) || 0;
  return `₹${val.toFixed(2)}`;
}

const ComparePage = ({ initialData = null, initialLoading = false, initialError = null }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth() || {};
  const { addToCart } = useCart() || {};
  const { showToast } = useToast() || {};
  const { items: selectedItems = [], remove: removeFromContext, clear: clearSelection } = useCompare() || {};

  const [loading, setLoading] = useState(initialLoading || (!initialData && !initialError));
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const [addingId, setAddingId] = useState(null);
  const [ownProductIds, setOwnProductIds] = useState([]);

  // Fetch logged-in seller's own product IDs once to hide Add-to-Cart
  useEffect(() => {
    if (isAuthenticated && user?.role === 'seller') {
      api.get('/seller/products')
        .then((res) => {
          if (res.data?.products && Array.isArray(res.data.products)) {
            setOwnProductIds(res.data.products.map((p) => p._id.toString()));
          }
        })
        .catch(() => {});
    } else {
      setOwnProductIds([]);
    }
  }, [isAuthenticated, user]);

  const requestCounter = useRef(0);
  const cooldownTimerRef = useRef(null);

  // Parse IDs from query parameter, or fall back to context selection
  const queryIds = parseCompareIds(searchParams.get('ids'));
  const effectiveIds = queryIds && queryIds.length >= 2
    ? queryIds
    : (selectedItems.length >= 2 && selectedItems.length <= 3
        ? selectedItems.map((it) => it._id)
        : null);

  // Sync effectiveIds into URL if URL is missing them but context had them
  useEffect(() => {
    if (!queryIds && effectiveIds && effectiveIds.length >= 2) {
      setSearchParams({ ids: effectiveIds.join(',') }, { replace: true });
    }
  }, [queryIds, effectiveIds, setSearchParams]);

  // Handle retry cooldown timer
  useEffect(() => {
    if (retryCooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setRetryCooldown((c) => c - 1);
      }, 1000);
    }
    return () => clearTimeout(cooldownTimerRef.current);
  }, [retryCooldown]);

  const fetchComparison = useCallback(async (idsToFetch) => {
    if (!idsToFetch || idsToFetch.length < 2 || idsToFetch.length > 3) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const currentRequestId = ++requestCounter.current;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/compare', { productIds: idsToFetch });
      // Guard against race conditions / stale responses
      if (currentRequestId === requestCounter.current) {
        if (response.data && response.data.success) {
          setData(response.data);
          setError(null);
        } else {
          setError({ type: 'generic', message: "These products can't be compared" });
        }
      }
    } catch (err) {
      if (currentRequestId === requestCounter.current) {
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (status === 404) {
          setError({
            type: '404',
            message: 'One or more products are no longer available',
            stale: true
          });
          if (showToast) {
            showToast('One or more products are no longer available', 'error');
          }
        } else if (status === 429) {
          setError({
            type: '429',
            message: 'Too many comparisons. Please wait a minute and try again.'
          });
          if (showToast) {
            showToast('Too many comparisons. Please wait a minute and try again.', 'error');
          }
        } else if (status === 400) {
          setError({
            type: '400',
            message: msg || "These products can't be compared"
          });
          if (showToast) {
            showToast(msg || "These products can't be compared", 'error');
          }
        } else {
          setError({
            type: 'network',
            message: 'Unable to load comparison. Please check your network and try again.'
          });
          if (showToast) {
            showToast('Unable to load comparison', 'error');
          }
        }
      }
    } finally {
      if (currentRequestId === requestCounter.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (effectiveIds && effectiveIds.length >= 2) {
      fetchComparison(effectiveIds);
    } else {
      setLoading(false);
      setData(null);
      setError(null);
    }
  }, [effectiveIds?.join(','), fetchComparison]);

  // Remove a product from the comparison
  const handleRemoveProduct = (productId) => {
    removeFromContext(productId);
    const remaining = (effectiveIds || []).filter((id) => id !== productId);
    if (remaining.length >= 2) {
      setSearchParams({ ids: remaining.join(',') });
    } else {
      setSearchParams({});
      setData(null);
    }
  };

  // Clear stale products and navigate to shop
  const handleClearAndShop = () => {
    clearSelection();
    setSearchParams({});
    navigate('/shop');
  };

  // Trigger retry with 5-second cooldown
  const handleRetryAi = () => {
    if (retryCooldown > 0) return;
    setRetryCooldown(5);
    if (effectiveIds && effectiveIds.length >= 2) {
      fetchComparison(effectiveIds);
    }
  };

  // Add to cart handler
  const handleAddToCart = async (product) => {
    if (!product || product.stock === 0) return;
    const isOwnListing = Boolean(
      product.isOwnListing ||
      (user && product.sellerId && String(product.sellerId._id || product.sellerId) === String(user._id)) ||
      ownProductIds.includes(String(product._id))
    );
    if (isOwnListing) return;

    setAddingId(product._id);
    try {
      // Use the SAME path and argument shape as the Shop page
      const cartProduct = {
        _id: product._id,
        name: product.name,
        price: product.price,
        images: product.images || (product.image ? [product.image] : []),
        stock: product.stock,
        isOwnListing,
        sellerId: product.sellerId
      };
      const res = await addToCart(cartProduct, 1);
      if (res && res.success) {
        if (showToast) {
          showToast(`Added ${product.name} to cart`, 'success');
        }
      } else {
        if (showToast) {
          showToast(res?.message || 'Failed to add to cart', 'error');
        }
      }
    } catch (err) {
      if (showToast) {
        showToast(err.response?.data?.message || err.message || 'Failed to add to cart', 'error');
      }
    } finally {
      setAddingId(null);
    }
  };

  // ── Render Case: Empty State (fewer than 2 IDs) ──
  if (!effectiveIds || effectiveIds.length < 2) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#561C24] via-[#6D2932] to-[#e8a3ae] flex items-center justify-center mx-auto shadow-lg shadow-[#6D2932]/20 text-white">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Compare Products</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Select 2 or 3 products while browsing our catalog to compare their specs, prices, and AI-powered recommendations side by side.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 bg-[#6D2932] hover:bg-[#561C24] text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#6D2932]/20 text-sm active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Products in Shop</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Render Case: Loading Skeleton ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <div className="h-8 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-44 bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-44 bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-44 bg-slate-800/60 rounded-xl animate-pulse" />
          </div>
          <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Render Case: Error State ──
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">Comparison Unavailable</h2>
            <p className="text-slate-400 text-sm">{error.message}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {error.type === '404' ? (
              <button
                type="button"
                onClick={handleClearAndShop}
                className="w-full sm:w-auto bg-[#6D2932] hover:bg-[#561C24] text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm"
              >
                Clear Selection & Browse Shop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fetchComparison(effectiveIds)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#6D2932] hover:bg-[#561C24] text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
                <Link
                  to="/shop"
                  className="w-full sm:w-auto text-slate-400 hover:text-slate-100 font-semibold py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                >
                  Back to Shop
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !Array.isArray(data.products) || data.products.length < 2) {
    return null;
  }

  const { products, highlights, sameCategory, aiSummary, aiStatus } = data;
  const aiProductsMap = new Map((aiSummary?.products || []).map((p) => [String(p.id), p]));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Product Comparison
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Comparing {products.length} products with live store specs and AI analysis.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-indigo-400 font-medium transition-colors self-start sm:self-auto"
        >
          <span>Continue Shopping</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Rex's Take Summary Card (Above Table) ── */}
      <section
        aria-labelledby="rex-take-heading"
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#561C24] via-[#6D2932] to-[#e8a3ae] flex items-center justify-center text-white shadow-md shadow-[#6D2932]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="rex-take-heading" className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Rex&apos;s take</span>
              </h2>
            </div>
          </div>

          {/* Different categories notice */}
          {!sameCategory && (
            <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              These products are in different categories
            </span>
          )}
        </div>

        {/* AI Summary Body or Fallback */}
        {aiStatus === 'ok' && aiSummary && aiSummary.overview ? (
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {aiSummary.overview}
          </p>
        ) : (
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-300">
            <span>
              Rex&apos;s summary isn&apos;t available right now. The comparison below uses live store data.
            </span>
            <button
              type="button"
              disabled={retryCooldown > 0}
              onClick={handleRetryAi}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retryCooldown > 0 ? 'animate-spin' : ''}`} />
              <span>{retryCooldown > 0 ? `Wait ${retryCooldown}s` : 'Try again'}</span>
            </button>
          </div>
        )}

        {/* Mandatory Disclaimer Label */}
        <p className="text-[11px] sm:text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
          AI-generated summary. It can contain mistakes. The table is the reliable store data.
        </p>
      </section>

      {/* ── Side-by-Side Comparison Table ── */}
      <section aria-label="Comparison Table" className="space-y-4">
        <div className="w-full overflow-x-auto rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl">
          <table className="w-full border-collapse text-left min-w-[500px]">
            <tbody>
              {/* Row 1: Header / Remove Button */}
              <tr className="border-b border-slate-800/80 bg-slate-900/90">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 w-32 sm:w-44 min-w-[120px] sm:min-w-[160px] p-3 sm:p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Product
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-center"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(prod._id)}
                        aria-label={`Remove ${prod.name} from comparison`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-400 bg-slate-950/80 hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-800 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Row 2: Image */}
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Preview
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-center"
                  >
                    <Link to={`/product/${prod._id}`} className="inline-block group">
                      <img
                        src={prod.image || 'https://via.placeholder.com/150?text=No+Image'}
                        alt={prod.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl bg-slate-950 border border-slate-800 mx-auto group-hover:scale-105 transition-transform duration-300 shadow-md"
                      />
                    </Link>
                  </td>
                ))}
              </tr>

              {/* Row 3: Name */}
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Name
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0"
                  >
                    <Link
                      to={`/product/${prod._id}`}
                      className="font-bold text-xs sm:text-sm text-slate-100 hover:text-indigo-400 transition-colors line-clamp-2"
                    >
                      {prod.name}
                    </Link>
                  </td>
                ))}
              </tr>

              {/* Row 4: Category */}
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Category
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-xs sm:text-sm text-slate-300"
                  >
                    {prod.category}
                  </td>
                ))}
              </tr>

              {/* Row 5: Sold by */}
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Sold by
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-xs sm:text-sm text-slate-300"
                  >
                    {prod.sellerName}
                  </td>
                ))}
              </tr>

              {/* Row 6: Price (Charged price with optional discount label & highlights) */}
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Price
                </th>
                {products.map((prod) => {
                  const isCheapest = highlights?.cheapestId === prod._id;
                  const isBestDiscount = highlights?.bestDiscountId === prod._id;
                  return (
                    <td
                      key={prod._id}
                      className={`p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 ${
                        isCheapest ? 'bg-indigo-500/5' : ''
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-slate-100">
                            {formatRupees(prod.price)}
                          </span>
                          {prod.discountPercent > 0 && (
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              {prod.discountPercent}% off
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {isCheapest && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Lowest price</span>
                            </span>
                          )}
                          {isBestDiscount && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300">
                              Best discount
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 8: Rating & Reviews (Highlight: Top rated, Most reviewed) */}
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Rating
                </th>
                {products.map((prod) => {
                  const isTopRated = highlights?.highestRatedId === prod._id;
                  const isMostReviewed = highlights?.mostReviewedId === prod._id;
                  return (
                    <td
                      key={prod._id}
                      className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0"
                    >
                      <div className="space-y-1.5">
                        {prod.reviewsCount === 0 ? (
                          <span className="text-xs text-slate-500 italic">No reviews yet</span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-bold text-slate-100">{prod.ratingsAvg.toFixed(1)}</span>
                            <span className="text-slate-500 text-[11px]">({prod.reviewsCount})</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {isTopRated && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300">
                              Top rated
                            </span>
                          )}
                          {isMostReviewed && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/40 text-indigo-300">
                              Most reviewed
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Row 9: Availability */}
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Availability
                </th>
                {products.map((prod) => (
                  <td
                    key={prod._id}
                    className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-xs sm:text-sm font-semibold"
                  >
                    {prod.stock === 0 ? (
                      <span className="text-rose-400">Out of stock</span>
                    ) : prod.stock <= 5 ? (
                      <span className="text-amber-400">Only {prod.stock} left</span>
                    ) : (
                      <span className="text-emerald-400">In stock</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 10: Best for (from AI summary) */}
              <tr className="border-b border-slate-800/80">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Best for
                </th>
                {products.map((prod) => {
                  const aiItem = aiProductsMap.get(prod._id);
                  return (
                    <td
                      key={prod._id}
                      className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-xs sm:text-sm text-slate-300 leading-relaxed"
                    >
                      {aiItem && aiItem.bestFor ? aiItem.bestFor : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* Row 11: Watch out (from AI summary) */}
              <tr className="border-b border-slate-800/80 bg-slate-900/30">
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Watch out
                </th>
                {products.map((prod) => {
                  const aiItem = aiProductsMap.get(prod._id);
                  return (
                    <td
                      key={prod._id}
                      className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-xs sm:text-sm text-slate-400 leading-relaxed"
                    >
                      {aiItem && aiItem.watchOut ? aiItem.watchOut : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* Row 12: Actions */}
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 bg-slate-900 z-20 p-3 sm:p-4 text-xs font-bold text-slate-300 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]"
                >
                  Actions
                </th>
                {products.map((prod) => {
                  const isOwner = Boolean(
                    prod.isOwnListing ||
                    (user && prod.sellerId && String(prod.sellerId._id || prod.sellerId) === String(user._id)) ||
                    ownProductIds.includes(String(prod._id))
                  );
                  return (
                    <td
                      key={prod._id}
                      className="p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] border-r border-slate-800/60 last:border-r-0 text-center"
                    >
                      <div className="flex flex-col gap-2">
                        <Link
                          to={`/product/${prod._id}`}
                          className="w-full text-center py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
                        >
                          View product
                        </Link>
                        {isOwner ? (
                          <span className="w-full py-2 px-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center justify-center">
                            Your listing
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={prod.stock === 0 || addingId === prod._id}
                            onClick={() => handleAddToCart(prod)}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:active:scale-100"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{addingId === prod._id ? 'Adding...' : prod.stock === 0 ? 'Out of Stock' : 'Add to cart'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Verdict Card (Below Table) ── */}
      {aiStatus === 'ok' && aiSummary && aiSummary.verdict && (
        <section
          aria-labelledby="verdict-heading"
          className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-2"
        >
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-4 h-4 text-[#e8a3ae]" />
            <h2 id="verdict-heading" className="text-sm sm:text-base font-bold text-slate-100">
              Verdict
            </h2>
          </div>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
            {aiSummary.verdict}
          </p>
        </section>
      )}
    </div>
  );
};

export default ComparePage;
