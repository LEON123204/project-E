import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShoppingBag, 
  X, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  MapPin, 
  CreditCard,
  Truck,
  Eye,
  RefreshCw
} from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Order Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data.orders);
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatusId(orderId);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      if (response.data.success) {
        setSuccess(`Order status updated to ${newStatus}`);
        
        // Update local state to avoid full reload
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
        
        // If selected order modal is open, sync details
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, orderStatus: newStatus }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
      case 'shipped': return 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400';
      case 'delivered': return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
      case 'cancelled': return 'bg-rose-500/10 border border-rose-500/30 text-rose-400';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const steps = ['pending', 'shipped', 'delivered'];
  const getStepIndex = (status) => steps.indexOf(status);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Orders Management</h1>
            <p className="text-slate-500 text-sm mt-1">Review orders backlog, confirm shipments, and track billing.</p>
          </div>
          <button onClick={fetchOrders} className="text-slate-505 hover:text-slate-350 p-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2">
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Orders Table */}
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading orders backlog...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center text-slate-500 italic text-sm">
            No customer orders recorded yet.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-850">
                <thead>
                  <tr className="text-slate-400 font-semibold bg-slate-950/20">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4 text-right">Total Price</th>
                    <th className="p-4 text-center">Payment</th>
                    <th className="p-4">Delivery Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {orders.map((o) => (
                    <tr key={o._id} className="text-slate-350 hover:bg-slate-950/10">
                      <td className="p-4 font-mono font-bold text-slate-200">
                        #{o._id.substring(12).toUpperCase()}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{o.user?.name || o.guestName || 'Guest User'}</div>
                        <div className="text-[10px] text-slate-505 flex items-center gap-1 mt-0.5">
                          {o.isGuest && <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-450 text-[8px] px-1 py-0.25 rounded font-bold uppercase shrink-0">Guest</span>}
                          <span>{o.user?.email || o.guestEmail || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold">₹{o.totalAmount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full ${
                          o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-455'
                        }`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {updatingStatusId === o._id ? (
                          <span className="text-[10px] text-slate-500">Updating...</span>
                        ) : (
                          <select
                            value={o.orderStatus}
                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                            className={`bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg py-1 px-2.5 text-[10px] font-semibold uppercase outline-none cursor-pointer transition-smooth ${getStatusBadgeClass(o.orderStatus)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 bg-slate-950 hover:bg-indigo-500/10 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 rounded-lg transition-smooth cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-850">
              {orders.map((o) => (
                <div key={o._id} className="p-4 space-y-3 bg-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-200 text-[11px]">
                      #{o._id.substring(12).toUpperCase()}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-200 text-xs">{o.user?.name || o.guestName || 'Guest User'}</div>
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                      {o.isGuest && <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-455 text-[8px] px-1 py-0.25 rounded font-bold uppercase shrink-0">Guest</span>}
                      <span className="break-all">{o.user?.email || o.guestEmail || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-850/40">
                    <span className="font-semibold text-slate-300 text-xs">Total: ₹{o.totalAmount.toFixed(2)}</span>
                    <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full ${
                      o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-455'
                    }`}>
                      {o.paymentStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-850/40">
                    <div className="flex-grow">
                      {updatingStatusId === o._id ? (
                        <span className="text-[10px] text-slate-500">Updating...</span>
                      ) : (
                        <select
                          value={o.orderStatus}
                          onChange={(e) => handleStatusChange(o._id, e.target.value)}
                          className={`w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg py-1.5 px-2.5 text-[10px] font-semibold uppercase outline-none cursor-pointer transition-smooth ${getStatusBadgeClass(o.orderStatus)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="p-2.5 bg-slate-950 hover:bg-indigo-500/10 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 rounded-lg transition-smooth cursor-pointer shrink-0"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-slate-200 text-sm sm:text-base">Review Customer Order</h3>
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-500">ID: #{selectedOrder._id}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-slate-450 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-grow">
              
              {/* Order Status Select in Modal */}
              <div className="flex items-center gap-4 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
                <span className="text-xs font-semibold text-slate-400">Order Delivery Phase:</span>
                <select
                  value={selectedOrder.orderStatus}
                  onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                  className={`bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-xs font-semibold uppercase outline-none cursor-pointer ${getStatusBadgeClass(selectedOrder.orderStatus)}`}
                >
                  <option value="pending">Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchased Items</h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850">
                  {selectedOrder.items.map((item) => (
                    <div key={item._id} className="flex justify-between items-center p-3 sm:p-3.5 text-xs bg-slate-950/20">
                      <div className="max-w-[70%]">
                        <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                        <div className="text-slate-550 text-[11px]">
                          Price: ₹{item.price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                      <div className="font-bold text-slate-100 text-right shrink-0">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address and client details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed bg-slate-950/10 border border-slate-850/50 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-350 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck size={14} className="text-indigo-400" />
                    Delivery Destination
                  </h4>
                  <p className="font-medium text-slate-300 mb-1">{selectedOrder.user?.name || selectedOrder.guestName || 'Guest User'}</p>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-355 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-indigo-400" />
                    Payment Details
                  </h4>
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <span>Email:</span>
                    <span className="break-all">{selectedOrder.user?.email || selectedOrder.guestEmail}</span>
                    {selectedOrder.isGuest && (
                      <span className="bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 text-[8px] px-1 rounded font-bold uppercase shrink-0">
                        Guest
                      </span>
                    )}
                  </p>
                  <p>
                    Billing Status:{' '}
                    <span className={`font-bold capitalize ${selectedOrder.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </p>
                  {selectedOrder.paymentIntentId && (
                    <p className="font-mono text-[9px] text-slate-550 mt-2 select-all break-all">Ref: {selectedOrder.paymentIntentId}</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-800 bg-slate-950/20 text-xs shrink-0">
              <span className="text-slate-400 font-medium">Grand Total</span>
              <span className="text-base font-extrabold text-slate-100">₹{selectedOrder.totalAmount.toFixed(2)}</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
