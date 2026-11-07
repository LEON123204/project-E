import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  PackageCheck,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Store,
  Tag,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

const statusConfig = {
  pending_review: { label: 'Pending Review', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  approved:       { label: 'Approved',       cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  rejected:       { label: 'Rejected',       cls: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-slate-800 text-slate-400' };
  return (
    <span className={`text-[9px] font-extrabold uppercase tracking-wider py-1 px-2.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const AdminSellerProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('pending_review');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actioningId, setActioningId] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);

  const fetchSellerProducts = async (currentFilter = filter, currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/seller-products?status=${currentFilter}&page=${currentPage}&limit=10`);
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch seller products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerProducts(filter, page);
  }, [filter, page]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleApprove = async (id, name) => {
    clearMessages();
    setActioningId(id);
    try {
      const res = await api.put(`/admin/seller-products/${id}/approve`);
      setSuccess(res.data.message || `Product "${name}" approved successfully.`);
      fetchSellerProducts(filter, page);
      if (previewProduct?._id === id) setPreviewProduct(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to approve "${name}"`);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id, name) => {
    clearMessages();
    setActioningId(id);
    try {
      const res = await api.put(`/admin/seller-products/${id}/reject`);
      setSuccess(res.data.message || `Product "${name}" rejected.`);
      fetchSellerProducts(filter, page);
      if (previewProduct?._id === id) setPreviewProduct(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to reject "${name}"`);
    } finally {
      setActioningId(null);
    }
  };

  const filterTabs = [
    { key: 'pending_review', label: 'Pending Review', Icon: Clock },
    { key: 'approved',       label: 'Approved',       Icon: CheckCircle2 },
    { key: 'rejected',       label: 'Rejected',       Icon: XCircle },
    { key: 'all',            label: 'All',            Icon: Filter },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2.5">
              <PackageCheck size={28} className="text-indigo-400" />
              Seller Product Reviews
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review and approve or reject products submitted by marketplace sellers before they go live.
            </p>
          </div>
          <button
            onClick={() => fetchSellerProducts(filter, page)}
            className="text-slate-500 hover:text-slate-300 p-2 cursor-pointer transition-smooth"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Global Notifications */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 animate-fadeIn">
            <Check size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-2">
            <Filter size={14} className="text-indigo-400" /> Filter:
          </span>
          {filterTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); clearMessages(); }}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-smooth ${
                filter === key
                  ? key === 'pending_review' ? 'bg-amber-500 text-white'
                  : key === 'approved'       ? 'bg-emerald-600 text-white'
                  : key === 'rejected'       ? 'bg-rose-600 text-white'
                  : 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Products Table / Cards */}
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading seller products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-14 rounded-2xl text-center space-y-3">
            <PackageCheck size={36} className="mx-auto text-slate-700" />
            <p className="text-slate-500 italic text-sm">
              No seller products found in "{filter.replace('_', ' ')}".
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-850">
                <thead>
                  <tr className="text-slate-400 font-semibold bg-slate-950/20">
                    <th className="p-4 w-16">Image</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Seller</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Stock</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {products.map((p) => {
                    const sellerName = p.sellerId?.businessName || p.sellerId?.name || 'Unknown Seller';
                    return (
                      <tr key={p._id} className="text-slate-350 hover:bg-slate-950/10">
                        <td className="p-4">
                          <div className="w-10 h-10 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700 text-[10px]">No img</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{p.name}</div>
                          {p.discountPercent > 0 && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                              {p.discountPercent}% OFF
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                            <Store size={13} className="text-indigo-400 shrink-0" />
                            {sellerName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.sellerId?.email}</div>
                        </td>
                        <td className="p-4 text-slate-500">{p.category?.name || '—'}</td>
                        <td className="p-4 text-center font-semibold text-slate-400">{p.stock}</td>
                        <td className="p-4 text-right font-semibold text-slate-200">₹{p.price.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewProduct(p)}
                              title="View details"
                              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-smooth cursor-pointer border border-slate-800"
                            >
                              <Eye size={13} />
                            </button>

                            {p.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(p._id, p.name)}
                                disabled={actioningId === p._id}
                                className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-600/40 text-emerald-400 hover:text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-smooth disabled:opacity-50"
                              >
                                {actioningId === p._id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                            )}

                            {p.status !== 'rejected' && (
                              <button
                                onClick={() => handleReject(p._id, p.name)}
                                disabled={actioningId === p._id}
                                className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-400 hover:text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-smooth disabled:opacity-50"
                              >
                                {actioningId === p._id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <X size={12} />}
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-850">
              {products.map((p) => {
                const sellerName = p.sellerId?.businessName || p.sellerId?.name || 'Unknown Seller';
                return (
                  <div key={p._id} className="p-4 space-y-3 bg-slate-900 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 shrink-0">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-grow min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-slate-200">{p.name}</div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Store size={12} className="text-indigo-400 shrink-0" />
                          {sellerName}
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                          <span>Cat: {p.category?.name}</span>
                          <span className="font-bold text-slate-200">₹{p.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => setPreviewProduct(p)}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-950 border border-slate-800 text-slate-300 font-bold py-2 rounded-xl"
                      >
                        <Eye size={13} /> View
                      </button>
                      {p.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(p._id, p.name)}
                          disabled={actioningId === p._id}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 font-bold py-2 rounded-xl"
                        >
                          <Check size={13} /> Approve
                        </button>
                      )}
                      {p.status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(p._id, p.name)}
                          disabled={actioningId === p._id}
                          className="flex-1 flex items-center justify-center gap-1 bg-rose-600/20 border border-rose-600/40 text-rose-400 font-bold py-2 rounded-xl"
                        >
                          <X size={13} /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-850 text-slate-400 text-xs">
                <div>Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                    className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => prev + 1)}
                    className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Detail Preview Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="font-bold text-slate-200 text-sm sm:text-base flex items-center gap-2">
                <PackageCheck size={18} className="text-indigo-400" />
                Product Details Preview
              </h3>
              <button
                onClick={() => setPreviewProduct(null)}
                className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Product Images */}
              {previewProduct.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previewProduct.images.map((img, idx) => (
                    <div key={idx} className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-850">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase text-[9px]">Title</span>
                <p className="text-slate-100 font-bold text-sm">{previewProduct.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[9px]">Seller</span>
                  <p className="text-slate-200 font-semibold mt-0.5">
                    {previewProduct.sellerId?.businessName || previewProduct.sellerId?.name || 'N/A'}
                  </p>
                  <p className="text-slate-500 text-[10px]">{previewProduct.sellerId?.email}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[9px]">Category</span>
                  <p className="text-slate-200 font-semibold mt-0.5">{previewProduct.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[9px]">Price</span>
                  <p className="text-slate-200 font-bold mt-0.5">₹{previewProduct.price?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[9px]">Stock</span>
                  <p className="text-slate-200 font-bold mt-0.5">{previewProduct.stock}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase text-[9px]">Description</span>
                <p className="text-slate-300 leading-relaxed bg-slate-950 border border-slate-850 rounded-xl p-3">
                  {previewProduct.description}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                {previewProduct.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(previewProduct._id, previewProduct.name)}
                    disabled={actioningId === previewProduct._id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                  >
                    <Check size={14} /> Approve Product
                  </button>
                )}
                {previewProduct.status !== 'rejected' && (
                  <button
                    onClick={() => handleReject(previewProduct._id, previewProduct.name)}
                    disabled={actioningId === previewProduct._id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                  >
                    <X size={14} /> Reject Product
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSellerProducts;
