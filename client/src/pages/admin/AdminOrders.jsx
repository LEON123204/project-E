import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  ShoppingBag, 
  X, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  MapPin, 
  CreditCard,
  Truck,
  Eye,
  RefreshCw,
  Banknote,
  Filter,
  CheckCircle2,
  Sparkles,
  Package
} from 'lucide-react';

const AdminOrders = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering states
  const [methodFilter, setMethodFilter] = useState('all'); // 'all' | 'online' | 'cod'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid' | 'failed' | 'awaiting_payment'

  // Selected Order Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [collectingPaymentId, setCollectingPaymentId] = useState(null);

  // Expandable shipments in rows
  const [expandedOrders, setExpandedOrders] = useState({});
  const toggleExpandOrder = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Sub-order action loading & modal states
  const [subOrderActionLoading, setSubOrderActionLoading] = useState(null); // `${orderId}_${subOrderId}_${action}`
  const [cancelModal, setCancelModal] = useState(null); // { orderId, subOrderId, sellerName, isPaidOnline }
  const [collectCashModal, setCollectCashModal] = useState(null); // { orderId, subOrderId, sellerName, amountDue }

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data.orders);
    } catch (err) {
      showToast('Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatusId(orderId);
    try {
      const response = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      if (response.data.success) {
        showToast(`Order status updated to ${newStatus}`, 'success');
        const updatedOrder = response.data.order;
        setOrders(prev => prev.map(o => o._id === orderId ? (updatedOrder || { ...o, orderStatus: newStatus }) : o));
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => (updatedOrder || { ...prev, orderStatus: newStatus }));
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleMarkPaymentCollected = async (orderId) => {
    setCollectingPaymentId(orderId);
    try {
      const response = await api.put(`/orders/${orderId}/collect-payment`);
      if (response.data.success) {
        showToast(`Payment for order #${orderId.substring(12).toUpperCase()} marked as Collected/Paid!`, 'success');
        const updatedOrder = response.data.order;
        setOrders(prev => prev.map(o => o._id === orderId ? (updatedOrder || { ...o, paymentStatus: 'paid' }) : o));
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(prev => (updatedOrder || { ...prev, paymentStatus: 'paid' }));
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark payment collected', 'error');
    } finally {
      setCollectingPaymentId(null);
    }
  };

  const handleSubOrderStatus = async (orderId, subOrderId, newStatus) => {
    const actionKey = `${orderId}_${subOrderId}_${newStatus}`;
    setSubOrderActionLoading(actionKey);
    try {
      const response = await api.put(`/orders/${orderId}/suborders/${subOrderId}/status`, { status: newStatus });
      if (response.data.success) {
        showToast(`Sub-order status updated to ${newStatus}`, 'success');
        const updatedOrder = response.data.order;
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('This order was just updated - refreshed', 'error');
        fetchOrders();
      } else {
        const msg = err.response?.data?.message || 'Failed to update sub-order status';
        showToast(msg, 'error');
        fetchOrders();
      }
    } finally {
      setSubOrderActionLoading(null);
      setCancelModal(null);
    }
  };

  const handleSubOrderCollectCash = async (orderId, subOrderId) => {
    const actionKey = `${orderId}_${subOrderId}_collect`;
    setSubOrderActionLoading(actionKey);
    try {
      const response = await api.put(`/orders/${orderId}/suborders/${subOrderId}/collect-cash`);
      if (response.data.success) {
        showToast('Cash marked as collected for shipment!', 'success');
        const updatedOrder = response.data.order;
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('This order was just updated - refreshed', 'error');
        fetchOrders();
      } else {
        const msg = err.response?.data?.message || 'Failed to collect cash';
        showToast(msg, 'error');
        fetchOrders();
      }
    } finally {
      setSubOrderActionLoading(null);
      setCollectCashModal(null);
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

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const matchesMethod = methodFilter === 'all' || (o.paymentMethod || 'online').toLowerCase() === methodFilter;
    let matchesStatus = true;
    if (statusFilter === 'awaiting_payment') {
      matchesStatus = (o.paymentMethod || 'online').toLowerCase() === 'online' && o.paymentStatus === 'pending';
    } else if (statusFilter !== 'all') {
      matchesStatus = o.paymentStatus === statusFilter;
    }
    return matchesMethod && matchesStatus;
  });

  const codPendingCount = orders.filter(o => (o.paymentMethod || 'online').toLowerCase() === 'cod' && o.paymentStatus === 'pending').length;

  const renderSubOrderCards = (order) => {
    if (!order.subOrders || order.subOrders.length === 0) return null;
    const isCod = (order.paymentMethod || 'online').toLowerCase() === 'cod';
    const isPaidOnline = !isCod && order.paymentStatus === 'paid';
    const isUnpaidOnline = !isCod && order.paymentStatus !== 'paid';

    return (
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Package size={14} />
            Shipment Packages ({order.subOrders.length})
          </span>
          {order.subOrders.length > 1 && (
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Individual packages can be managed below
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {order.subOrders.map((sub, sIdx) => {
            const sellerName = sub.sellerName || (!sub.sellerId ? 'Cartex' : 'Seller');
            const isCartex = !sub.sellerId || sellerName === 'Cartex';
            const subItems = Array.isArray(sub.items) ? sub.items : [];
            const status = sub.status || 'pending';
            const canMarkShipped = status === 'pending';
            const canMarkDelivered = status === 'shipped';
            const canCancel = (status === 'pending' || status === 'shipped') && !isUnpaidOnline;
            const canCollectCash = isCod && (status === 'shipped' || status === 'delivered') && !sub.codCollected;

            const actionPrefix = `${order._id}_${sub._id}_`;
            const isShipping = subOrderActionLoading === `${actionPrefix}shipped`;
            const isDelivering = subOrderActionLoading === `${actionPrefix}delivered`;
            const isCancelling = subOrderActionLoading === `${actionPrefix}cancelled`;
            const isCollecting = subOrderActionLoading === `${actionPrefix}collect`;
            const isAnyActionLoading = Boolean(subOrderActionLoading && subOrderActionLoading.startsWith(actionPrefix));

            return (
              <div
                key={sub._id || sIdx}
                className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3 overflow-hidden text-xs"
              >
                {/* Header: Seller name + status badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package size={14} className="text-amber-400 shrink-0" />
                    <span className="font-bold text-slate-100 text-sm">
                      {sellerName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isCartex
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
                    }`}>
                      {isCartex ? 'Cartex Direct' : 'Marketplace Seller'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(status)}`}>
                      {status === 'pending' ? 'Processing' :
                       status === 'shipped' ? 'On the way' :
                       status === 'delivered' ? 'Delivered' :
                       status === 'cancelled' ? 'Cancelled' : status}
                    </span>
                    {isCod && (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        sub.codCollected
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {sub.codCollected
                          ? `Cash collected${sub.collectedAt ? ` (${new Date(sub.collectedAt).toLocaleDateString()})` : ''}`
                          : 'Cash pending'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items in this sub-order */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    Items ({subItems.length})
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 space-y-1 divide-y divide-slate-850/60">
                    {subItems.map((itm, itmIdx) => (
                      <div key={itmIdx} className="flex justify-between items-center text-xs pt-1 first:pt-0 gap-2">
                        <span className="text-slate-300 truncate font-medium">
                          {itm.name} <span className="text-slate-500 text-[11px]">× {itm.quantity}</span>
                        </span>
                        <span className="text-slate-300 font-semibold shrink-0">
                          ₹{((itm.price || 0) * (itm.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                    <span>Subtotal: <strong className="text-slate-200">₹{(sub.subtotal || 0).toFixed(2)}</strong></span>
                    {isCod && sub.amountDue != null && (
                      <span>Amount Due: <strong className="text-amber-400">₹{sub.amountDue.toFixed(2)}</strong></span>
                    )}
                  </div>
                </div>

                {/* Action Buttons & Unpaid Online Notice */}
                <div className="pt-2 border-t border-slate-850/80">
                  {isUnpaidOnline ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-amber-400" />
                      <span>Awaiting payment - cancel the whole order if abandoned</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Mark Shipped button */}
                      {canMarkShipped && (
                        <button
                          onClick={() => handleSubOrderStatus(order._id, sub._id, 'shipped')}
                          disabled={isAnyActionLoading}
                          className="min-h-[40px] px-3.5 py-2 bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {isShipping ? <RefreshCw size={13} className="animate-spin" /> : <Truck size={13} />}
                          <span>Mark shipped</span>
                        </button>
                      )}

                      {/* Mark Delivered button */}
                      {canMarkDelivered && (
                        <button
                          onClick={() => handleSubOrderStatus(order._id, sub._id, 'delivered')}
                          disabled={isAnyActionLoading}
                          className="min-h-[40px] px-3.5 py-2 bg-emerald-650 hover:bg-emerald-550 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {isDelivering ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          <span>Mark delivered</span>
                        </button>
                      )}

                      {/* Cancel Part button */}
                      {canCancel && (
                        <button
                          onClick={() => setCancelModal({
                            orderId: order._id,
                            subOrderId: sub._id,
                            sellerName,
                            isPaidOnline,
                            currentStatus: status
                          })}
                          disabled={isAnyActionLoading}
                          className="min-h-[40px] px-3.5 py-2 bg-rose-600/15 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5"
                        >
                          {isCancelling ? <RefreshCw size={13} className="animate-spin" /> : <X size={13} />}
                          <span>Cancel part</span>
                        </button>
                      )}

                      {/* Mark Cash Collected button */}
                      {canCollectCash && (
                        <button
                          onClick={() => setCollectCashModal({
                            orderId: order._id,
                            subOrderId: sub._id,
                            sellerName,
                            amountDue: sub.amountDue != null ? sub.amountDue : 0
                          })}
                          disabled={isAnyActionLoading}
                          className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {isCollecting ? <RefreshCw size={13} className="animate-spin" /> : <Banknote size={13} />}
                          <span>Mark cash collected (INR {(sub.amountDue != null ? sub.amountDue : 0).toFixed(2)})</span>
                        </button>
                      )}

                      {!canMarkShipped && !canMarkDelivered && !canCancel && !canCollectCash && (
                        <span className="text-[11px] text-slate-500 italic py-1">
                          No further actions available for this shipment.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Orders Management</h1>
            <p className="text-slate-500 text-sm mt-1">Review orders backlog, confirm shipments, and track COD cash collections.</p>
          </div>
          <button onClick={fetchOrders} className="text-slate-505 hover:text-slate-350 p-2 cursor-pointer">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>



        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-2">
              <Filter size={14} className="text-amber-400" /> Payment Method:
            </span>
            <button
              onClick={() => setMethodFilter('all')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-smooth cursor-pointer ${
                methodFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMethodFilter('online')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-smooth cursor-pointer ${
                methodFilter === 'online' ? 'bg-amber-500 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Pay Online
            </button>
            <button
              onClick={() => setMethodFilter('cod')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-smooth cursor-pointer flex items-center gap-1.5 ${
                methodFilter === 'cod' ? 'bg-emerald-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>COD</span>
              {codPendingCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.25 rounded-full">
                  {codPendingCount} cash due
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Payment Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs font-semibold text-slate-200 rounded-xl py-1.5 px-3 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading orders backlog...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center text-slate-500 italic text-sm">
            No matching orders found for selected filters.
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
                    <th className="p-4 text-center">Method</th>
                    <th className="p-4 text-right">Total Price</th>
                    <th className="p-4 text-center">Payment Status</th>
                    <th className="p-4">Delivery Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredOrders.map((o) => (
                    <React.Fragment key={o._id}>
                      <tr className="text-slate-350 hover:bg-slate-950/10">
                        <td className="p-4 font-mono font-bold text-slate-200">
                          <div>#{o._id.substring(12).toUpperCase()}</div>
                          {o.subOrders && o.subOrders.length > 0 && (
                            <button
                              onClick={() => toggleExpandOrder(o._id)}
                              className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-smooth py-1 px-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                            >
                              <Package size={11} />
                              <span>Shipments ({o.subOrders.length})</span>
                              <ChevronDown size={11} className={`transition-transform duration-200 ${expandedOrders[o._id] ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{o.user?.name || o.guestName || 'Guest User'}</div>
                          <div className="text-[10px] text-slate-505 flex items-center gap-1 mt-0.5">
                            {o.isGuest && <span className="bg-amber-500/20 border border-amber-500/30 text-indigo-450 text-[8px] px-1 py-0.25 rounded font-bold uppercase shrink-0">Guest</span>}
                            <span>{o.user?.email || o.guestEmail || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full border uppercase tracking-wider ${
                            (o.paymentMethod || 'online') === 'cod' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {(o.paymentMethod || 'online') === 'cod' ? 'COD' : 'Online'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">₹{o.totalAmount.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {(o.paymentMethod || 'online').toLowerCase() === 'online' && o.paymentStatus === 'pending' ? (
                              <span className="text-[9px] font-bold py-0.5 px-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                                Awaiting payment
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                                o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {o.paymentStatus}
                              </span>
                            )}
                            {(o.paymentMethod || 'online') === 'cod' && o.paymentStatus === 'pending' && (
                              <button
                                onClick={() => handleMarkPaymentCollected(o._id)}
                                disabled={collectingPaymentId === o._id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2 py-0.5 rounded transition-smooth cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                {collectingPaymentId === o._id ? 'Updating...' : 'Collect Cash'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {updatingStatusId === o._id ? (
                            <span className="text-[10px] text-slate-500">Updating...</span>
                          ) : (
                            <div>
                              <select
                                value={o.orderStatus}
                                onChange={(e) => handleStatusChange(o._id, e.target.value)}
                                className={`bg-slate-950 border border-slate-850 focus:border-amber-500 rounded-lg py-1 px-2.5 text-[10px] font-semibold uppercase outline-none cursor-pointer transition-smooth ${getStatusBadgeClass(o.orderStatus)}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              {o.subOrders && o.subOrders.length > 1 && (
                                <p className="text-[9px] text-slate-500 mt-1 leading-tight max-w-[140px]">
                                  Order-level actions apply to every part that can still move; use the shipment buttons for one seller's part.
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 bg-slate-950 hover:bg-amber-500/10 border border-slate-850 hover:border-amber-500/20 text-slate-450 hover:text-amber-400 rounded-lg transition-smooth cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                      {o.subOrders && o.subOrders.length > 0 && expandedOrders[o._id] && (
                        <tr className="bg-slate-950/60 border-b border-slate-800">
                          <td colSpan="8" className="p-4 sm:p-5">
                            {renderSubOrderCards(o)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-850">
              {filteredOrders.map((o) => (
                <div key={o._id} className="p-4 space-y-3 bg-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-200 text-[11px]">
                      #{o._id.substring(12).toUpperCase()}
                    </span>
                    <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full border uppercase tracking-wider ${
                      (o.paymentMethod || 'online') === 'cod' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {(o.paymentMethod || 'online') === 'cod' ? 'COD' : 'Online'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-200 text-xs">{o.user?.name || o.guestName || 'Guest User'}</div>
                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                      {o.isGuest && <span className="bg-amber-500/20 border border-amber-500/30 text-indigo-455 text-[8px] px-1 py-0.25 rounded font-bold uppercase shrink-0">Guest</span>}
                      <span className="break-all">{o.user?.email || o.guestEmail || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-850/40">
                    <span className="font-semibold text-slate-300 text-xs">Total: ₹{o.totalAmount.toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      {(o.paymentMethod || 'online').toLowerCase() === 'online' && o.paymentStatus === 'pending' ? (
                        <span className="text-[9px] font-bold py-0.5 px-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                          Awaiting payment
                        </span>
                      ) : (
                        <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${
                          o.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {o.paymentStatus}
                        </span>
                      )}
                      {(o.paymentMethod || 'online') === 'cod' && o.paymentStatus === 'pending' && (
                        <button
                          onClick={() => handleMarkPaymentCollected(o._id)}
                          disabled={collectingPaymentId === o._id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2 py-0.5 rounded transition-smooth cursor-pointer"
                        >
                          Collect Cash
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-850/40">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-grow">
                        {updatingStatusId === o._id ? (
                          <span className="text-[10px] text-slate-500">Updating...</span>
                        ) : (
                          <select
                            value={o.orderStatus}
                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                            className={`w-full bg-slate-950 border border-slate-850 focus:border-amber-500 rounded-lg py-1.5 px-2.5 text-[10px] font-semibold uppercase outline-none cursor-pointer transition-smooth ${getStatusBadgeClass(o.orderStatus)}`}
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
                        className="p-2.5 bg-slate-950 hover:bg-amber-500/10 border border-slate-850 hover:border-amber-500/20 text-slate-450 hover:text-amber-400 rounded-lg transition-smooth cursor-pointer shrink-0"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                    {o.subOrders && o.subOrders.length > 1 && (
                      <p className="text-[9px] text-slate-500 leading-tight">
                        Order-level actions apply to every part that can still move; use the shipment buttons for one seller's part.
                      </p>
                    )}
                  </div>

                  {o.subOrders && o.subOrders.length > 0 && (
                    <div className="pt-2 border-t border-slate-850/40">
                      <button
                        onClick={() => toggleExpandOrder(o._id)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-amber-400 hover:text-amber-300 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-850 transition-smooth cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Package size={13} />
                          <span>Shipments ({o.subOrders.length})</span>
                        </span>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${expandedOrders[o._id] ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedOrders[o._id] && (
                        <div className="pt-3">
                          {renderSubOrderCards(o)}
                        </div>
                      )}
                    </div>
                  )}
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
              <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">Delivery Phase:</span>
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

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Payment Option:</span>
                    <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border uppercase ${
                      (selectedOrder.paymentMethod || 'online') === 'cod' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {(selectedOrder.paymentMethod || 'online') === 'cod' ? 'Cash on Delivery' : 'Paid Online (Stripe)'}
                    </span>
                  </div>
                </div>
                {selectedOrder.subOrders && selectedOrder.subOrders.length > 1 && (
                  <p className="text-[10px] text-slate-400">
                    Order-level actions apply to every part that can still move; use the shipment buttons for one seller's part.
                  </p>
                )}
              </div>

              {/* COD Action Banner in Modal */}
              {(selectedOrder.paymentMethod || 'online') === 'cod' && selectedOrder.paymentStatus === 'pending' && (
                <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Banknote size={16} /> Cash Collection Pending (₹{selectedOrder.totalAmount.toFixed(2)})
                    </p>
                    <p className="text-[11px] text-slate-400">Mark as paid once cash is received from the courier.</p>
                  </div>
                  <button
                    onClick={() => handleMarkPaymentCollected(selectedOrder._id)}
                    disabled={collectingPaymentId === selectedOrder._id}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-smooth shadow-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    <span>{collectingPaymentId === selectedOrder._id ? 'Updating...' : 'Mark Payment Collected'}</span>
                  </button>
                </div>
              )}

              {/* Shipments or Purchased Items (Fallback) */}
              {selectedOrder.subOrders && selectedOrder.subOrders.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Truck size={14} className="text-amber-400" />
                    Shipments ({selectedOrder.subOrders.length})
                  </h4>
                  {renderSubOrderCards(selectedOrder)}
                </div>
              ) : (
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
              )}

              {/* Shipping Address and client details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed bg-slate-950/10 border border-slate-850/50 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-350 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck size={14} className="text-amber-400" />
                    Delivery Destination
                  </h4>
                  <p className="font-medium text-slate-300 mb-1">{selectedOrder.user?.name || selectedOrder.guestName || 'Guest User'}</p>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-355 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-400" />
                    Payment Details
                  </h4>
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <span>Email:</span>
                    <span className="break-all">{selectedOrder.user?.email || selectedOrder.guestEmail}</span>
                    {selectedOrder.isGuest && (
                      <span className="bg-amber-500/20 border border-amber-500/35 text-amber-400 text-[8px] px-1 rounded font-bold uppercase shrink-0">
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
                  {selectedOrder.prepayDiscount > 0 && (
                    <p className="text-emerald-400 font-medium text-[11px]">
                      Prepay Discount Applied: -₹{selectedOrder.prepayDiscount.toFixed(2)}
                    </p>
                  )}
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

      {/* CANCEL SUB-ORDER CONFIRMATION MODAL */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <AlertCircle className="text-rose-400" size={18} />
                Confirm Cancellation
              </h3>
              <button
                onClick={() => setCancelModal(null)}
                disabled={Boolean(subOrderActionLoading)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Are you sure you want to cancel the shipment from <span className="font-bold text-slate-100">{cancelModal.sellerName}</span>?
              </p>
              <p className="text-slate-400">
                Stock will be returned and this cannot be undone.
              </p>
              {cancelModal.isPaidOnline && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-xs">
                  <strong className="block text-rose-200 mb-1">Important:</strong>
                  <strong>This does not refund the customer. Refund the payment manually in the Stripe dashboard.</strong>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModal(null)}
                disabled={Boolean(subOrderActionLoading)}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-smooth cursor-pointer disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleSubOrderStatus(cancelModal.orderId, cancelModal.subOrderId, 'cancelled')}
                disabled={Boolean(subOrderActionLoading)}
                className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5 shadow-lg disabled:bg-slate-800 disabled:text-slate-500"
              >
                {subOrderActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />}
                <span>Cancel shipment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT CASH CONFIRMATION MODAL */}
      {collectCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Banknote className="text-emerald-400" size={18} />
                Confirm Cash Collection
              </h3>
              <button
                onClick={() => setCollectCashModal(null)}
                disabled={Boolean(subOrderActionLoading)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Confirm INR <span className="font-bold text-emerald-400 text-sm">{(collectCashModal.amountDue || 0).toFixed(2)}</span> was collected in cash for shipment from <span className="font-bold text-slate-100">{collectCashModal.sellerName}</span>.
              </p>
              <p className="text-slate-400">
                This action records the cash collection and marks this portion of the order as settled.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCollectCashModal(null)}
                disabled={Boolean(subOrderActionLoading)}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-smooth cursor-pointer disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleSubOrderCollectCash(collectCashModal.orderId, collectCashModal.subOrderId)}
                disabled={Boolean(subOrderActionLoading)}
                className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-smooth cursor-pointer flex items-center gap-1.5 shadow-lg disabled:bg-slate-800 disabled:text-slate-500"
              >
                {subOrderActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Confirm Collection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

