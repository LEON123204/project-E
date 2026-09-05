import React, { useState, useEffect } from 'react';
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
  Loader
} from 'lucide-react';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & Search States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null means adding
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Edit mode image-tracking fields
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products?page=${page}&limit=6&search=${encodeURIComponent(search)}`);
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

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

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategory(categories[0]?._id || '');
    setStock('');
    setSelectedFiles([]);
    setExistingImages([]);
    setImagesToRemove([]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setCategory(product.category?._id || '');
    setStock(product.stock);
    setSelectedFiles([]);
    setExistingImages(product.images);
    setImagesToRemove([]);
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleRemoveExistingImage = (imgUrl) => {
    setImagesToRemove(prev => [...prev, imgUrl]);
    setExistingImages(prev => prev.filter(img => img !== imgUrl));
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All reviews will also be removed.')) return;
    try {
      await api.delete(`/products/${id}`);
      setSuccess('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setSuccess('');

    // Construct FormData for multipart image upload
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('stock', stock);

    // Attach new images
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    // Attach list of images to remove (only when editing)
    if (editingProduct) {
      imagesToRemove.forEach((img) => {
        formData.append('removeImages', img);
      });
    }

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData, config);
        setSuccess('Product updated successfully');
      } else {
        await api.post('/products', formData, config);
        setSuccess('Product created successfully');
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Products Catalog</h1>
            <p className="text-slate-550 text-sm mt-1">Add, update, or remove items in the store inventory.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto bg-indigo-655 hover:bg-indigo-550 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-smooth cursor-pointer"
          >
            <Plus size={16} />
            Add New Product
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

        {/* Search Field */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search products by title or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 outline-none transition-smooth"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-550" />
        </div>

        {/* Catalog Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading products catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center text-slate-500 italic text-sm">
            No products found matching your search.
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
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Stock Level</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {products.map((p) => (
                    <tr key={p._id} className="text-slate-350 hover:bg-slate-950/10">
                      <td className="p-4">
                        <div className="w-10 h-10 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 shrink-0">
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-200">{p.name}</td>
                      <td className="p-4 text-slate-500">{p.category?.name}</td>
                      <td className="p-4 text-center font-semibold">
                        <span className={p.stock <= 5 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">₹{p.price.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 bg-slate-950 hover:bg-indigo-500/10 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 rounded-lg transition-smooth cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p._id)}
                            className="p-1.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-450 hover:text-rose-450 rounded-lg transition-smooth cursor-pointer"
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-850">
              {products.map((p) => (
                <div key={p._id} className="p-4 flex gap-3.5 bg-slate-900 items-start">
                  <div className="w-16 h-16 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 shrink-0">
                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0 space-y-1">
                    <div className="font-bold text-slate-200 text-xs sm:text-sm truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500">Category: {p.category?.name}</div>
                    
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="font-semibold text-slate-100 text-xs">₹{p.price.toFixed(2)}</span>
                      <span className={`text-[10px] font-semibold ${p.stock <= 5 ? 'text-amber-400 font-bold' : 'text-slate-450'}`}>
                        Stock: {p.stock}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2 justify-end border-t border-slate-850/40 mt-2">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-2.5 bg-slate-950 hover:bg-indigo-500/10 border border-slate-850 hover:border-indigo-500/20 text-slate-450 hover:text-indigo-400 rounded-lg transition-smooth cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p._id)}
                        className="p-2.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-455 hover:text-rose-400 rounded-lg transition-smooth cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination block */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-850 text-slate-400 text-xs">
                <div>Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                    className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-950 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => prev + 1)}
                    className="p-1.5 border border-slate-800 rounded bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-slate-950 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-slate-200 text-sm sm:text-base">
                {editingProduct ? 'Edit Product Catalog Item' : 'Add New Catalog Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-grow">
              
              {/* Product name */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-200 outline-none transition-smooth cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Inventory Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Product Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth resize-none"
                ></textarea>
              </div>

              {/* Display existing images (edit mode only) */}
              {editingProduct && existingImages.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Active Images (Click × to remove)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {existingImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-850">
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(imgUrl)}
                          className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-smooth outline-none cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image upload selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Upload Product Images</label>
                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-smooth bg-slate-950/20 text-center relative cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={22} className="text-slate-550" />
                    <span className="text-xs font-semibold text-slate-350">
                      {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'Drag and drop or browse files'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">JPEG, PNG, or WEBP. Max 5 images limit.</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-350 py-2 px-6 rounded-xl text-xs transition-smooth cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-indigo-650 hover:bg-indigo-550 text-white font-bold py-2 px-8 rounded-xl text-xs flex items-center gap-1.5 transition-smooth cursor-pointer"
                >
                  {submitLoading ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
