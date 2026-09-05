import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { 
  CheckCircle, 
  Truck, 
  Package, 
  MapPin, 
  ShoppingBag, 
  ArrowRight, 
  ShoppingCart, 
  Check, 
  Star, 
  Sparkles,
  Calendar,
  CreditCard
} from 'lucide-react';

const OrderConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');

  // Recommendation states
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [addedItems, setAddedItems] = useState({});

  // Fetch Order if not passed in state
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (order) return;
      setLoading(true);
      try {
        const guestEmail = location.state?.guestEmail || new URLSearchParams(location.search).get('email');
        let res;
        if (guestEmail) {
          res = await api.get(`/orders/guest/${id}?email=${encodeURIComponent(guestEmail)}`);
        } else {
          res = await api.get(`/orders/${id}`);
        }
        if (res.data.success) {
          setOrder(res.data.order);
        }
      } catch (err) {
        setError('Unable to load order details. You can track your order using your Order ID.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id, order, location]);

  // Fetch Category-Based Product Recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!order || !order.items || order.items.length === 0) return;
      setRecLoading(true);

      try {
        // Collect IDs of purchased products to exclude
        const purchasedIds = new Set(order.items.map(item => item.product?._id || item.product));

        // Get category of the first purchased item
        const firstProductId = order.items[0]?.product?._id || order.items[0]?.product;
        let categorySlug = null;

        if (firstProductId) {
          try {
            const prodRes = await api.get(`/products/${firstProductId}`);
            if (prodRes.data.product?.category?.slug) {
              categorySlug = prodRes.data.product.category.slug;
            }
          } catch (e) {
            console.error('Failed to fetch primary product category', e);
          }
        }

        let catProducts = [];
        if (categorySlug) {
          const catRes = await api.get('/products', { params: { category: categorySlug, limit: 12 } });
          catProducts = catRes.data.products || [];
        }

        // Filter: exclude purchased items & out-of-stock products
        let filteredRecs = catProducts.filter(
          p => !purchasedIds.has(p._id) && p.stock > 0
        );

        // Fallback: If category recommendations yield fewer than 4 products, fetch top popular products
        if (filteredRecs.length < 4) {
          const fallbackRes = await api.get('/products', { params: { sort: 'popularity', limit: 12 } });
          const fallbackProducts = fallbackRes.data.products || [];
          
          for (const prod of fallbackProducts) {
            if (
              !purchasedIds.has(prod._id) &&
              prod.stock > 0 &&
              !filteredRecs.some(r => r._id === prod._id)
            ) {
              filteredRecs.push(prod);
              if (filteredRecs.length >= 4) break;
            }
          }
        }

        setRecommendations(filteredRecs.slice(0, 4));
      } catch (err) {
        console.error('Failed to load product recommendations', err);
      } finally {
        setRecLoading(false);
      }
    };

    fetchRecommendations();
  }, [order]);

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res.success) {
      setAddedItems(prev => ({ ...prev, [product._id]: true }));
      setTimeout(() => {
        setAddedItems(prev => ({ ...prev, [product._id]: false }));
      }, 2000);
    } else {
      alert(res.message);
    }
  };

  const getTrackingEmail = () => {
    if (!order) return '';
    if (order.isGuest) return order.guestEmail || '';
    return order.user?.email || location.state?.guestEmail || '';
  };

  const handleTrackOrder = () => {
    const emailParam = getTrackingEmail();
    const trackingUrl = emailParam
      ? `/order-tracking/${order._id}?email=${encodeURIComponent(emailParam)}`
      : `/order-tracking/${order._id}`;
    navigate(trackingUrl);
  };

  if (loading) {
    return (
      <div className="bg-slate-950 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs mt-3 font-medium">Loading your confirmation details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-4 bg-slate-900 border border-slate-850 p-8 rounded-3xl">
          <CheckCircle size={48} className="mx-auto text-emerald-400" />
          <h1 className="text-xl font-bold text-slate-100">Thank You for Your Order!</h1>
          <p className="text-xs text-slate-400 leading-relaxed">{error || 'Your order has been placed successfully.'}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/shop"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-smooth"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
        
        {/* Celebration & Confirmation Card */}
        <div className="bg-slate-900 border border-slate-850 p-6 sm:p-10 rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Animated Success Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full animate-bounce shadow-lg shadow-emerald-500/10">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Payment Successful
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-100 pt-2">
              Order Confirmed! 🎉
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Thank you for shopping with Cartex! We've received your order and are getting it ready for shipment.
            </p>
          </div>

          {/* Order ID & Primary Track Order CTA */}
          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left space-y-1 w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Order Reference</span>
              <p className="text-sm font-mono font-bold text-indigo-400">#{order._id}</p>
            </div>

            {/* Prominent Track Your Order Button */}
            <button
              onClick={handleTrackOrder}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-smooth shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 text-xs sm:text-sm cursor-pointer group"
            >
              <Truck size={18} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Track Your Order</span>
            </button>
          </div>
        </div>

        {/* Order Details & Purchased Items Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Order Meta Info */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4 text-xs">
            <h2 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              Order Info
            </h2>
            <div className="space-y-3 text-slate-400">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Date Placed</span>
                <span className="text-slate-200 font-medium">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status</span>
                <span className="inline-block mt-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                  {order.orderStatus || 'Processing'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Delivery Address</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed font-medium">
                  {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}, {order.shippingAddress?.country}
                </p>
              </div>
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-4">
            <h2 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-2">
              <Package size={16} className="text-indigo-400" />
              Items Ordered ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-850 max-h-56 overflow-y-auto pr-1 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-slate-200 truncate">{item.name}</p>
                    <p className="text-slate-500 text-[11px]">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-slate-100 shrink-0">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-850 pt-4 flex justify-between items-center text-sm font-extrabold text-slate-100">
              <span>Total Paid</span>
              <span className="text-indigo-400 text-base">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Secondary Section: You Might Also Like (Category-Based Recommendations) */}
        <div className="border-t border-slate-900 pt-8 sm:pt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
                  You Might Also Like
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Recommended products matching your purchase interest
              </p>
            </div>
            <Link
              to="/shop"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-smooth"
            >
              Explore Shop <ArrowRight size={14} />
            </Link>
          </div>

          {recLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-850 rounded-2xl p-4 h-64 animate-pulse"></div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {recommendations.map(product => {
                const isAdded = addedItems[product._id];
                return (
                  <div
                    key={product._id}
                    className="bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl overflow-hidden transition-smooth flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Product Image */}
                      <Link to={`/product/${product._id}`} className="block aspect-square bg-slate-950 overflow-hidden relative">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.category?.name && (
                          <span className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur border border-slate-800 text-indigo-400 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {product.category.name}
                          </span>
                        )}
                      </Link>

                      {/* Product Details */}
                      <div className="p-4 space-y-2">
                        <Link to={`/product/${product._id}`} className="block">
                          <h3 className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-smooth">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Stars */}
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < Math.round(product.ratingsAvg || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({product.reviewsCount || 0})
                          </span>
                        </div>

                        <div className="text-sm font-extrabold text-slate-100 pt-1">
                          ₹{product.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-smooth cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600 text-indigo-300 hover:text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={14} />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={14} />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No additional recommendations available right now.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderConfirmation;
