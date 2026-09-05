import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
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
  const urlEmail = searchParams.get('email') || '';

  // Form states
  const [searchId, setSearchId] = useState(id || '');
  const [searchEmail, setSearchEmail] = useState(urlEmail);

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
        params: { email: emailVal }
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

  useEffect(() => {
    if (id && urlEmail) {
      fetchOrder(id, urlEmail);
    }
  }, [id, urlEmail]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!searchId || !searchEmail) {
      setError('Please provide both Order ID and Email address.');
      return;
    }
    // Update URL to match search params
    navigate(`/order-tracking/${searchId.trim()}?email=${encodeURIComponent(searchEmail.trim())}`);
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
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
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-450 text-xs">Retrieving order details...</p>
          </div>
        )}

        {order && (
          <div className="space-y-6 animate-scaleUp">
            
            {/* Tracking Status Card */}
            <div className="bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-3xl shadow-xl space-y-8">
              
              {/* Order Meta */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-5">
                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Guest Purchase</span>
                  <h2 className="text-lg font-bold text-slate-200 mt-0.5">Order ID: #{order._id}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Calendar size={13} />
                    Placed on: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Total Amount</span>
                  <span className="text-xl font-extrabold text-indigo-400 mt-0.5">₹{order.totalAmount.toFixed(2)}</span>
                  <span className={`text-[9px] font-bold py-0.5 px-2.5 rounded-full mt-1.5 border uppercase tracking-wider ${
                    order.paymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
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
                        ? 'bg-indigo-600 border-indigo-500 text-white'
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
                        ? 'bg-indigo-600 border-indigo-500 text-white'
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

            {/* Info Grid (Address & Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Shipping & Delivery Details */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
                <h3 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-1.5">
                  <MapPin size={16} className="text-indigo-400" />
                  Delivery Details
                </h3>
                <div className="text-xs space-y-2 text-slate-400 leading-relaxed">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receiver Name:</span>
                    <span className="font-semibold text-slate-300">{order.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tracking Email:</span>
                    <span className="font-semibold text-slate-300">{order.guestEmail}</span>
                  </div>
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

              {/* Items List Summary */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl shadow-xl space-y-4">
                <h3 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-1.5">
                  <Package size={16} className="text-indigo-400" />
                  Purchased Items
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-850/50">
                  {order.items.map((item, idx) => (
                    <div key={item._id} className={`flex justify-between items-center text-xs pt-2 ${idx === 0 ? 'pt-0' : ''}`}>
                      <div className="space-y-0.5 max-w-xs pr-4">
                        <p className="font-bold text-slate-300 line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                      </div>
                      <span className="font-semibold text-slate-200">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default OrderTracking;
