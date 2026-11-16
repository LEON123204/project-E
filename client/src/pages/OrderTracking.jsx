import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ShipmentCards from '../components/ShipmentCards';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Clock,
  ArrowRight
} from 'lucide-react';

const OrderTracking = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const urlEmail = searchParams.get('email') || '';

  // Form states
  const [searchId, setSearchId] = useState(id || '');
  const [searchEmail, setSearchEmail] = useState(urlEmail || user?.email || '');

  // Tracking details state
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrder = async (orderId, emailVal) => {
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.get(`/orders/guest/${orderId}`, {
        params: emailVal ? { email: emailVal } : {}
      });
      if (res.data.success) {
        setOrder(res.data.order);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found or email verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Prefill email when user logs in if not provided in URL
  useEffect(() => {
    if (user?.email && !urlEmail && !searchEmail) {
      setSearchEmail(user.email);
    }
  }, [user, urlEmail]);

  // Keep searchId in sync with route params
  useEffect(() => {
    if (id) {
      setSearchId(id);
    }
  }, [id]);

  // Auto-run lookup when order ID is in URL
  useEffect(() => {
    if (id) {
      const emailToUse = urlEmail || user?.email || searchEmail || '';
      fetchOrder(id, emailToUse);
    }
  }, [id, urlEmail, user?.email]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!searchId.trim()) {
      setError('Please provide an Order ID.');
      return;
    }
    if (!user && !searchEmail.trim()) {
      setError('Please provide an Email address.');
      return;
    }
    // Update URL to match search params
    const emailToUse = searchEmail.trim() || user?.email || '';
    const query = emailToUse ? `?email=${encodeURIComponent(emailToUse)}` : '';
    navigate(`/order-tracking/${searchId.trim()}${query}`);
  };

  // Helper to determine status classes for the visual tracker
  const getStepStatus = (stepName) => {
    if (!order) return 'upcoming';
    const statusMap = {
      pending: 0,
      shipped: 1,
      delivered: 2
    };

    if (order.orderStatus === 'cancelled') {
      return stepName === 'pending' ? 'cancelled' : 'upcoming';
    }

    const currentIdx = statusMap[order.orderStatus];
    const stepIdx = statusMap[stepName];

    if (stepIdx < currentIdx) return 'complete';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            Track Your Order
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Input your Order ID and the Email address used during checkout to track delivery status in real-time.
          </p>
        </div>

        {/* Lookup Card */}
        <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl max-w-lg mx-auto">
          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Order ID</label>
              <input
                type="text"
                placeholder="65f123456789abcdef012345"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">
                Email Address {user && <span className="text-slate-500 font-normal lowercase">(optional for order owner)</span>}
              </label>
              <input
                type="email"
                placeholder={user ? "optional for order owner" : "john@example.com"}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                required={!user}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-smooth shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search size={16} />
                  Locate Order
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3 rounded-xl text-xs flex gap-2 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tracking Details Results */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-450 text-xs">Retrieving order details...</p>
          </div>
        )}

        {order && (
          <div className="space-y-6 animate-scaleUp">
            
            {/* Overall Order Summary Card */}
            <div className="bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
              
              {/* Order Meta */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                      {order.isGuest ? 'Guest Purchase' : 'Registered Order'}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-slate-950 border-slate-800 text-slate-300">
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online (Stripe)'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-200 mt-0.5">Order ID: #{order._id}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Calendar size={13} />
                    Placed on: {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Order Status:</span>
                    <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                      order.orderStatus === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      order.orderStatus === 'shipped' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                      order.orderStatus === 'delivered' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      order.orderStatus === 'cancelled' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                      'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {order.orderStatus === 'pending' ? 'Processing' :
                       order.orderStatus === 'shipped' ? 'On the way' :
                       order.orderStatus === 'delivered' ? 'Delivered' :
                       order.orderStatus === 'cancelled' ? 'Cancelled' : order.orderStatus}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                    {order.paymentMethod === 'cod' ? 'Amount Due at Delivery' : 'Total Amount'}
                  </span>
                  <span className="text-xl font-extrabold text-amber-400 mt-0.5">₹{order.totalAmount.toFixed(2)}</span>
                  {order.prepayDiscount > 0 && (
                    <span className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      Prepay Discount (5%): -₹{order.prepayDiscount.toFixed(2)}
                    </span>
                  )}
                  <span className={`text-[9px] font-bold py-0.5 px-2.5 rounded-full mt-1.5 border uppercase tracking-wider ${
                    order.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Pending (Pay on Arrival)'}
                  </span>
                </div>
              </div>

              {/* Delivery Details */}
              {order.shippingAddress && (
                <div className="bg-slate-950/60 border border-slate-850 p-4 sm:p-5 rounded-2xl space-y-3">
                  <h3 className="font-bold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-850/70 pb-2">
                    <MapPin size={15} className="text-amber-400" />
                    Delivery Details
                  </h3>
                  <div className="text-xs space-y-2 text-slate-400 leading-relaxed">
                    {Boolean(order.guestName || order.user?.name) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Receiver Name:</span>
                        <span className="font-semibold text-slate-300">{order.guestName || order.user?.name}</span>
                      </div>
                    )}
                    {Boolean(order.guestEmail || order.user?.email) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tracking Email:</span>
                        <span className="font-semibold text-slate-300">{order.guestEmail || order.user?.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-850/50">
                      <span className="text-slate-500 shrink-0 mr-4">Address:</span>
                      <span className="text-right text-slate-300 font-medium">
                        {order.shippingAddress.street}, {order.shippingAddress.city}, <br />
                        {order.shippingAddress.state} {order.shippingAddress.zipCode}, <br />
                        {order.shippingAddress.country}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Single Stepper: Rendered ONLY when order has no shipments */}
              {(!order.shipments || order.shipments.length === 0) && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Order Tracking Status
                  </h3>
                  {order.orderStatus === 'cancelled' ? (
                    <div className="bg-rose-500/5 border border-rose-500/15 p-4 rounded-2xl flex items-center gap-3 text-rose-455 text-sm">
                      <XCircle size={22} className="shrink-0" />
                      <div>
                        <p className="font-bold">This order has been cancelled</p>
                        <p className="text-xs text-slate-500">If payment was captured, refund transactions will be initiated immediately.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 relative pt-4">
                      {/* Progress Line */}
                      <div className="absolute top-[32px] left-0 right-0 h-1 bg-slate-800 z-0">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                          style={{ 
                            width: order.orderStatus === 'pending' ? '16%' : order.orderStatus === 'shipped' ? '50%' : '100%' 
                          }}
                        ></div>
                      </div>

                      {/* Step 1: Processing */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          getStepStatus('pending') === 'complete' || getStepStatus('pending') === 'active'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          <Clock size={16} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold mt-2.5 text-center">Processing</span>
                      </div>

                      {/* Step 2: Shipped */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          getStepStatus('shipped') === 'complete'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : getStepStatus('shipped') === 'active'
                            ? 'bg-purple-650 border-purple-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          <Truck size={16} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold mt-2.5 text-center">Shipped</span>
                      </div>

                      {/* Step 3: Delivered */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          getStepStatus('delivered') === 'complete' || getStepStatus('delivered') === 'active'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          <CheckCircle size={16} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold mt-2.5 text-center">Delivered</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Per-Seller Shipments (Modern Orders) */}
            {order.shipments && order.shipments.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Package size={18} className="text-amber-400" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
                    Packages in this Order ({order.shipments.length})
                  </h2>
                </div>
                <ShipmentCards shipments={order.shipments} paymentMethod={order.paymentMethod} />
              </div>
            )}

            {/* Legacy Purchased Items (Rendered ONLY when order has no shipments) */}
            {(!order.shipments || order.shipments.length === 0) && order.items && order.items.length > 0 && (
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
                <h3 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-1.5">
                  <Package size={16} className="text-amber-400" />
                  Purchased Items ({order.items.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-850/50">
                  {order.items.map((item, idx) => (
                    <div key={item._id || idx} className={`flex justify-between items-center text-xs pt-2 ${idx === 0 ? 'pt-0' : ''}`}>
                      <div className="space-y-0.5 max-w-xs pr-4">
                        <p className="font-bold text-slate-300 line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Qty: {item.quantity} × ₹{(item.price || 0).toFixed(2)}</p>
                      </div>
                      <span className="font-semibold text-slate-200">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default OrderTracking;

