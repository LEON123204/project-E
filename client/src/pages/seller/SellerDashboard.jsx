import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Upload,
  Loader,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react';

// ─── Status badge helper ──────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    approved:       { label: 'Live',           classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    pending_review: { label: 'Pending Review', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    rejected:       { label: 'Rejected',       classes: 'bg-rose-500/15 text-rose-400 border-rose-500/25' }
  };
  const { label, classes } = map[status] || { label: status, classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${classes}`}>
      {status === 'approved'       && <CheckCircle size={10} />}
      {status === 'pending_review' && <Clock size={10} />}
      {status === 'rejected'       && <XCircle size={10} />}
      {label}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-slate-500 text-xs font-medium">{label}</p>
      <p className="text-slate-100 text-xl font-bold mt-0.5">{value}</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const SellerDashboard = () => {
  const { user } = useAuth();

  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  // Pagination & Search
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [statusFilter, setStatusFilter]   = useState('');

  // Modal
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitLoading, setSubmitLoading]   = useState(false);

  // Form fields
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]             = useState('');
  const [category, setCategory]       = useState('');
  const [stock, setStock]             = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [selectedFiles, setSelectedFiles]     = useState([]);
  const [existingImages, setExistingImages]   = useState([]);
  const [imagesToRemove, setImagesToRemove]   = useState([]);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 8,
        ...(search && { search: encodeURIComponent(search) }),
        ...(statusFilter && { status: statusFilter })
      });
      const res = await api.get(`/seller/products?${params}`);
      setProducts(res.data.products);
      setTotalPages(res.data.totalPages);
      setTotalProducts(res.data.totalProducts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, search, statusFilter]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data.categories);
      } catch {}
    };
    fetchCategories();
  }, []);

  // Derived stats from current product list (approximate — based on all seller's products)
  const [allStats, setAllStats] = useState({ live: 0, pending: 0, rejected: 0 });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch a large batch to derive stats (lightweight)
        const [liveRes, pendingRes, rejectedRes] = await Promise.all([
          api.get('/seller/products?status=approved&limit=1'),
          api.get('/seller/products?status=pending_review&limit=1'),
          api.get('/seller/products?status=rejected&limit=1')
        ]);
        setAllStats({
          live:     liveRes.data.totalProducts,
          pending:  pendingRes.data.totalProducts,
          rejected: rejectedRes.data.totalProducts
        });
      } catch {}
    };
    fetchStats();
  }, [products]); // re-run whenever products change

  // ─── Auto-clear notifications ───────────────────────────────────────────────
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error)   { const t = setTimeout(() => setError(''), 8000);   return () => clearTimeout(t); }
  }, [error]);

  // ─── Modal helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setName(''); setDescription(''); setPrice('');
    setCategory(categories[0]?._id || '');
    setStock(''); setDiscountPercent('');
    setSelectedFiles([]); setExistingImages([]); setImagesToRemove([]);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setCategory(product.category?._id || '');
    setStock(product.stock);
    setDiscountPercent(product.discountPercent ?? '');
    setSelectedFiles([]);
    setExistingImages(product.images || []);
    setImagesToRemove([]);
    setModalOpen(true);
  };

  const handleRemoveExistingImage = (imgUrl) => {
    setImagesToRemove(prev => [...prev, imgUrl]);
    setExistingImages(prev => prev.filter(img => img !== imgUrl));
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? All its reviews will also be removed.')) return;
    setError(''); setSuccess('');
    try {
      await api.delete(`/seller/products/${id}`);
      setSuccess('Product deleted successfully.');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed.');
    }
  };

  // ─── Submit (create / update) ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(''); setSuccess('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('stock', stock);
    if (discountPercent !== '') formData.append('discountPercent', discountPercent);
    selectedFiles.forEach(f => formData.append('images', f));
    if (editingProduct) imagesToRemove.forEach(img => formData.append('removeImages', img));

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };

    try {
      if (editingProduct) {
        await api.put(`/seller/products/${editingProduct._id}`, formData, config);
        setSuccess('Product updated and resubmitted for admin review.');
      } else {
        await api.post('/seller/products', formData, config);
        setSuccess('Product submitted for admin review. It will go live once approved.');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-7">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Store size={18} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Seller Dashboard</h1>
            </div>
            <p className="text-slate-500 text-sm">
              Welcome, <span className="text-indigo-400 font-semibold">{user?.businessName || user?.name}</span>. Manage your product listings here.
            </p>
            <p className="text-slate-600 text-xs mt-1 flex items-center gap-1.5">
              <Clock size={11} />
              New products require admin approval before they appear in the public store.
            </p>
          </div>
          <button
            id="seller-add-product-btn"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/25 shrink-0"
          >
            <Plus size={16} />
            Add New Product
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={CheckCircle} label="Live Products"    value={allStats.live}     color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" />
          <StatCard icon={Clock}       label="Pending Review"   value={allStats.pending}  color="bg-amber-500/10 border border-amber-500/20 text-amber-400" />
          <StatCard icon={XCircle}     label="Rejected"         value={allStats.rejected} color="bg-rose-500/10 border border-rose-500/20 text-rose-400" />
        </div>

        {/* ── Notifications ── */}
        {success && (
          <div id="seller-success-msg" className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 items-start">
            <Check size={15} className="shrink-0 mt-0.5" /><span>{success}</span>
          </div>
        )}
        {error && (
          <div id="seller-error-msg" className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2 items-start">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        {/* ── Filters Row ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search your products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 outline-none transition-all duration-200"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-300 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="approved">Live</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* ── Product Table / Empty ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading your products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-16 rounded-2xl text-center space-y-3">
            <Package size={40} className="mx-auto text-slate-700" />
            <p className="text-slate-400 font-medium">
              {search || statusFilter ? 'No products match your filters.' : "You haven't added any products yet."}
            </p>
            {!search && !statusFilter && (
              <p className="text-slate-600 text-xs">Click <span className="text-indigo-400">"Add New Product"</span> to get started.</p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-800">
                <thead>
                  <tr className="text-slate-400 font-semibold bg-slate-950/30">
                    <th className="p-4 w-14">Image</th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Stock</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-10 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shrink-0">
                          {p.images?.[0]
                            ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-slate-700"><Package size={18} /></div>
                          }
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-200 max-w-[200px]">
                        <div className="truncate">{p.name}</div>
                        {p.discountPercent > 0 && (
                          <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block">
                            {p.discountPercent}% off
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500">{p.category?.name}</td>
                      <td className="p-4 text-center">
                        <span className={p.stock <= 5 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-200">₹{Number(p.price).toFixed(2)}</td>
                      <td className="p-4 text-center"><StatusBadge status={p.status} /></td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`seller-edit-${p._id}`}
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-950 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-all duration-200 cursor-pointer"
                            title="Edit product"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            id={`seller-delete-${p._id}`}
                            onClick={() => handleDelete(p._id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all duration-200 cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-slate-800">
              {products.map(p => (
                <div key={p._id} className="p-4 flex gap-3.5 items-start">
                  <div className="w-16 h-16 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shrink-0">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-700"><Package size={22} /></div>
                    }
                  </div>
                  <div className="flex-grow min-w-0 space-y-1">
                    <div className="font-bold text-slate-200 text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.category?.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-100 text-xs">₹{Number(p.price).toFixed(2)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex gap-2 pt-2 justify-end border-t border-slate-800/40 mt-2">
                      <button onClick={() => handleOpenEdit(p)} className="p-2 bg-slate-950 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-all duration-200 cursor-pointer">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="p-2 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-all duration-200 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-slate-400 text-xs">
                <div>Page {page} of {totalPages} &bull; {totalProducts} products</div>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FORM MODAL ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-slate-200 text-sm sm:text-base">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                  <Clock size={10} />
                  {editingProduct ? 'Saving will resubmit for admin review.' : 'Will be live once approved by admin.'}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-grow">

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Product Name *</label>
                <input
                  id="seller-product-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-all duration-200"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Category *</label>
                <select
                  id="seller-product-category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-200 outline-none cursor-pointer"
                >
                  <option value="">Select category…</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price / Stock / Discount */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Price (₹) *</label>
                  <input
                    id="seller-product-price"
                    type="number" step="0.01" min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Stock *</label>
                  <input
                    id="seller-product-stock"
                    type="number" min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Discount %</label>
                  <input
                    id="seller-product-discount"
                    type="number" min="0" max="100"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Description *</label>
                <textarea
                  id="seller-product-description"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none resize-none"
                />
              </div>

              {/* Existing images */}
              {editingProduct && existingImages.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Current Images (click × to remove)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {existingImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(imgUrl)}
                          className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Upload Images</label>
                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 text-center relative cursor-pointer transition-all duration-200 bg-slate-950/20">
                  <input
                    id="seller-product-images"
                    type="file" multiple accept="image/*"
                    onChange={e => setSelectedFiles(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={22} className="text-slate-500" />
                    <span className="text-xs font-semibold text-slate-400">
                      {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Drag and drop or browse'}
                    </span>
                    <span className="text-[9px] text-slate-600">JPEG, PNG, or WEBP · Max 5 images</span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 py-2 px-6 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="seller-form-submit"
                  type="submit"
                  disabled={submitLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-60"
                >
                  {submitLoading ? <><Loader size={14} className="animate-spin" /> Saving…</> : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
