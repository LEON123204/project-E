import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Store,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  CreditCard,
  Banknote,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const STATUS_TABS = [
  { id: '', label: 'All Orders', countKey: 'all' },
  { id: 'pending', label: 'Pending', countKey: 'pending', icon: Clock },
  { id: 'shipped', label: 'Shipped', countKey: 'shipped', icon: Truck },
  { id: 'delivered', label: 'Delivered', countKey: 'delivered', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', countKey: 'cancelled', icon: XCircle }
];

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Pending', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    shipped: { label: 'Shipped', classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    delivered: { label: 'Delivered', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Cancelled', classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  };
  const { label, classes } = map[status] || { label: status, classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {label}
    </span>
  );
};

/**
 * Action buttons component based on seller's own subOrder state.
 * Shared between the table row and detail modal.
 */
const SellerOrderActions = ({
  order,
  onUpdateStatus,
  onOpenConfirmModal,
  activeActionId,
  layout = 'table'
}) => {
  if (!order || !order.subOrder) return null;

  const { status, codCollected, collectedAt, amountDue } = order.subOrder;
  const isCod = (order.paymentMethod || '').toLowerCase() === 'cod';
  const isPaidOnline = (order.paymentMethod || '').toLowerCase() === 'online' && order.paymentStatus === 'paid';

  const orderId = order.orderId;
  const isOrderBusy = activeActionId && activeActionId.startsWith(`${orderId}:`);
  const isActionBusy = (action) => activeActionId === `${orderId}:${action}`;

  const formattedCollectedDate = collectedAt
    ? new Date(collectedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      })
    : '';

  const containerClasses =
    layout === 'table'
      ? 'flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5'
      : 'flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full';

  const btnBase =
    layout === 'table'
      ? 'min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap'
      : 'min-h-[40px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto';

  return (
    <div className={containerClasses}>
      {/* ── Status Action: Pending ── */}
      {status === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'shipped')}
            disabled={isOrderBusy}
            className={`${btnBase} bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20`}
            title="Mark as Shipped"
          >
            {isActionBusy('shipped') ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Truck size={14} className="shrink-0" />
            )}
            <span>Mark as Shipped</span>
          </button>

          {isPaidOnline ? (
            <span
              className="min-h-[40px] text-[11px] font-medium text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-center text-center leading-snug"
              title="Paid online orders can only be cancelled by an admin"
            >
              Paid online - cancellation handled by admin
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onOpenConfirmModal(order, 'cancelled')}
              disabled={isOrderBusy}
              className={`${btnBase} bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30`}
              title="Cancel part"
            >
              {isActionBusy('cancelled') ? (
                <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <XCircle size={14} className="shrink-0" />
              )}
              <span>Cancel part</span>
            </button>
          )}
        </>
      )}

      {/* ── Status Action: Shipped ── */}
      {status === 'shipped' && (
        <button
          type="button"
          onClick={() => onUpdateStatus(order, 'delivered')}
          disabled={isOrderBusy}
          className={`${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20`}
          title="Mark as Delivered"
        >
          {isActionBusy('delivered') ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <CheckCircle2 size={14} className="shrink-0" />
          )}
          <span>Mark as Delivered</span>
        </button>
      )}

      {/* ── COD Cash Collection Action / Badge ── */}
      {isCod && (
        <>
          {(status === 'shipped' || status === 'delivered') && !codCollected && (
            <button
              type="button"
              onClick={() => onOpenConfirmModal(order, 'collect-cash')}
              disabled={isOrderBusy}
              className={`${btnBase} bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30`}
              title="Mark cash collected"
            >
              {isActionBusy('collect-cash') ? (
                <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Banknote size={14} className="shrink-0 text-amber-400" />
              )}
              <span>Mark cash collected (₹{Number(amountDue || 0).toFixed(2)})</span>
            </button>
          )}

          {codCollected && (
            <span
              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
              title={collectedAt ? `Collected on ${new Date(collectedAt).toLocaleString('en-IN')}` : 'Cash collected'}
            >
              <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              <span>Cash collected{formattedCollectedDate ? ` (${formattedCollectedDate})` : ''}</span>
            </span>
          )}
        </>
      )}
    </div>
  );
};

const SellerOrders = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ all: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 });

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // In-flight Action State
  const [activeActionId, setActiveActionId] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    order: null,
    actionType: null,
    title: '',
    message: '',
    confirmText: '',
    confirmButtonClass: ''
  });
  const [modalLoading, setModalLoading] = useState(false);

  const fetchOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await api.get('/seller/orders', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          limit: 10
        }
      });
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setCounts(response.data.counts || { all: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 });
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalOrders(response.data.pagination?.total || 0);
      }
    } catch (err) {
      if (!isBackground) {
        const msg = err.response?.data?.message || 'Failed to load seller orders';
        showToast(msg, 'error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [statusFilter, search, page, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const openOrderDetail = async (orderId) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/seller/orders/${orderId}`);
      if (res.data.success) {
        setSelectedOrder(res.data.order);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load order details';
      showToast(msg, 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Direct status update (shipped or delivered)
  const handleUpdateStatus = async (order, newStatus) => {
    const actionKey = `${order.orderId}:${newStatus}`;
    setActiveActionId(actionKey);
    try {
      const res = await api.put(`/seller/orders/${order.orderId}/status`, { status: newStatus });
      if (res.data.success && res.data.order) {
        const updated = res.data.order;
        showToast(`Order marked as ${newStatus}`, 'success');
        setOrders(prev => prev.map(o => (o.orderId === updated.orderId ? updated : o)));
        setSelectedOrder(prev => (prev && prev.orderId === updated.orderId ? updated : prev));
        fetchOrders(true);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('This order was just updated - refreshed', 'error');
        fetchOrders(true);
      } else if ([400, 403, 404].includes(err.response?.status)) {
        showToast(err.response?.data?.message || 'Action failed', 'error');
        fetchOrders(true);
      } else {
        showToast(err.response?.data?.message || 'Network error occurred. Please try again.', 'error');
      }
    } finally {
      setActiveActionId(null);
    }
  };

  // Open confirmation modal for cancel or collect-cash
  const handleOpenConfirmModal = (order, actionType) => {
    if (actionType === 'cancelled') {
      setConfirmModal({
        isOpen: true,
        order,
        actionType: 'cancelled',
        title: 'Cancel Sub-Order',
        message: 'Stock will be returned and this cannot be undone',
        confirmText: 'Cancel Part',
        confirmButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white'
      });
    } else if (actionType === 'collect-cash') {
      const amountDue = Number(order.subOrder?.amountDue || 0).toFixed(2);
      setConfirmModal({
        isOpen: true,
        order,
        actionType: 'collect-cash',
        title: 'Confirm Cash Collection',
        message: `Confirm you received INR ${amountDue} in cash`,
        confirmText: 'Confirm Cash Received',
        confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white'
      });
    }
  };

  // Handle confirmation modal submit
  const handleConfirmAction = async () => {
    if (!confirmModal.order) return;
    const { order, actionType } = confirmModal;
    const actionKey = `${order.orderId}:${actionType}`;
    setActiveActionId(actionKey);
    setModalLoading(true);

    try {
      let res;
      if (actionType === 'cancelled') {
        res = await api.put(`/seller/orders/${order.orderId}/status`, { status: 'cancelled' });
      } else if (actionType === 'collect-cash') {
        res = await api.put(`/seller/orders/${order.orderId}/collect-cash`);
      }

      if (res?.data?.success && res.data.order) {
        const updated = res.data.order;
        const successMsg =
          actionType === 'cancelled'
            ? 'Sub-order cancelled successfully'
            : 'Cash marked as collected successfully';
        showToast(successMsg, 'success');
        setOrders(prev => prev.map(o => (o.orderId === updated.orderId ? updated : o)));
        setSelectedOrder(prev => (prev && prev.orderId === updated.orderId ? updated : prev));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchOrders(true);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('This order was just updated - refreshed', 'error');
        fetchOrders(true);
      } else if ([400, 403, 404].includes(err.response?.status)) {
        showToast(err.response?.data?.message || 'Action failed', 'error');
        fetchOrders(true);
      } else {
        showToast(err.response?.data?.message || 'Network error occurred. Please try again.', 'error');
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setModalLoading(false);
      setActiveActionId(null);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-6 sm:py-8 px-2.5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Package size={20} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">Seller Orders</h1>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">
              View and manage fulfillment and cash collection for your orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              to="/seller/dashboard"
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 border border-slate-800 font-medium py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 min-h-[40px]"
            >
              <Store size={15} />
              <span>Dashboard</span>
            </Link>
            <button
              onClick={() => fetchOrders(false)}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-indigo-400 border border-slate-800 p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Refresh orders"
              aria-label="Refresh orders"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Status Tabs with Counts ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2.5 px-2.5 sm:mx-0 sm:px-0 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count = counts[tab.countKey] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 min-h-[40px] ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by order ID or customer name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-9 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 min-h-[40px]"
            />
            <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-1 cursor-pointer min-h-[30px] flex items-center justify-center"
              >
                <X size={14} />
              </button>
            )}
          </form>
          {search && (
            <div className="flex items-center gap-2 text-xs text-slate-400 self-center">
              <span>Filtering by "{search}"</span>
              <button
                onClick={handleClearSearch}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ── Orders Table Container ── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-xs font-medium">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Package size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-200">No orders found</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                {search || statusFilter
                  ? 'No orders matched your current filters. Try adjusting search or status.'
                  : 'Customer purchases for your items will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Amount Due</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {orders.map((order) => {
                    const totalItemsCount = (order.subOrder?.items || []).reduce(
                      (acc, item) => acc + (Number(item.quantity) || 1),
                      0
                    );
                    const formattedDate = order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    return (
                      <tr
                        key={order.orderId}
                        className="hover:bg-slate-850/50 transition-colors duration-150 group"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-indigo-400 whitespace-nowrap">
                          #{String(order.orderId).slice(-6).toUpperCase()}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                          {order.customerName || 'Customer'}
                        </td>

                        {/* Items Count */}
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-slate-200">{totalItemsCount}</span>
                            <span className="text-[11px]">{totalItemsCount === 1 ? 'item' : 'items'}</span>
                          </span>
                        </td>

                        {/* Amount Due */}
                        <td className="py-3.5 px-4 font-bold text-slate-100 whitespace-nowrap">
                          ₹{Number(order.subOrder?.amountDue || 0).toFixed(2)}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                            {order.paymentMethod === 'cod' ? (
                              <>
                                <Banknote size={13} className="text-amber-400" />
                                <span>COD</span>
                              </>
                            ) : (
                              <>
                                <CreditCard size={13} className="text-emerald-400" />
                                <span>Online</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* SubOrder Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={order.subOrder?.status} />
                        </td>

                        {/* Action Buttons: Status, Cash, and Details */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-col sm:flex-row items-end justify-end gap-1.5">
                            <SellerOrderActions
                              order={order}
                              onUpdateStatus={handleUpdateStatus}
                              onOpenConfirmModal={handleOpenConfirmModal}
                              activeActionId={activeActionId}
                              layout="table"
                            />
                            <button
                              type="button"
                              onClick={() => openOrderDetail(order.orderId)}
                              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-150 text-xs font-medium cursor-pointer shrink-0"
                              title="View order details"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Footer ── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-900/40 text-xs text-slate-400">
              <div>
                Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
                <span className="font-semibold text-slate-200">{totalPages}</span> ({totalOrders} total)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-mono text-slate-300">{page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100 font-mono">
                    #{String(selectedOrder.orderId).slice(-6).toUpperCase()}
                  </h3>
                  <StatusBadge status={selectedOrder.subOrder?.status} />
                </div>
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <Calendar size={12} />
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '—'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-500 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer & Shipping Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <p className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <User size={12} className="text-indigo-400" />
                  Customer
                </p>
                <p className="font-bold text-slate-100 text-sm">
                  {selectedOrder.customerName || 'Guest'}
                </p>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <p className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <MapPin size={12} className="text-indigo-400" />
                  Shipping Address
                </p>
                <p className="text-slate-300 leading-snug">
                  {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city}
                </p>
                <p className="text-slate-400 text-[11px]">
                  {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.zipCode}, {selectedOrder.shippingAddress?.country}
                </p>
              </div>
            </div>

            {/* Items Purchased for this Seller */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Your Items in this Order
                </h4>
                <span className="text-[11px] text-slate-500">
                  {selectedOrder.subOrder?.items?.length || 0} listing{(selectedOrder.subOrder?.items?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>

              <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 divide-y divide-slate-800/60 max-h-52 overflow-y-auto">
                {(selectedOrder.subOrder?.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-slate-500 text-[11px]">
                        Qty: {item.quantity} × ₹{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="font-bold text-slate-100 text-right whitespace-nowrap">
                      ₹{(Number(item.quantity) * Number(item.price)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Settlement Summary */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-200">
                  ₹{Number(selectedOrder.subOrder?.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 font-bold text-sm">
                <span className="text-slate-200">Amount Due to You:</span>
                <span className="text-emerald-400 font-mono text-base">
                  ₹{Number(selectedOrder.subOrder?.amountDue || 0).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  Payment Method: <strong className="text-slate-200 uppercase">{selectedOrder.paymentMethod}</strong>
                </span>
                {selectedOrder.paymentMethod === 'cod' && (
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    selectedOrder.subOrder?.codCollected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedOrder.subOrder?.codCollected ? 'COD Collected' : 'COD Pending Collection'}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Sub-Order Actions */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Order Actions
              </h4>
              <SellerOrderActions
                order={selectedOrder}
                onUpdateStatus={handleUpdateStatus}
                onOpenConfirmModal={handleOpenConfirmModal}
                activeActionId={activeActionId}
                layout="modal"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck size={13} className="text-slate-400" />
                Seller order management
              </span>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer min-h-[40px]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Confirmation Modal (Cancel / Cash Collection) ── */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn"
          onClick={() => !modalLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {confirmModal.actionType === 'cancelled' ? (
                  <XCircle className="text-rose-400 shrink-0" size={18} />
                ) : (
                  <Banknote className="text-emerald-400 shrink-0" size={18} />
                )}
                <span>{confirmModal.title}</span>
              </h3>
              <button
                onClick={() => !modalLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                disabled={modalLoading}
                className="text-slate-500 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <p className="font-semibold text-slate-100 text-sm">{confirmModal.message}</p>
              <p className="text-slate-500 text-[11px]">
                Order #{String(confirmModal.order?.orderId).slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => !modalLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                disabled={modalLoading}
                className="min-h-[40px] px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={modalLoading}
                className={`min-h-[40px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${confirmModal.confirmButtonClass}`}
              >
                {modalLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{confirmModal.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerOrders;
