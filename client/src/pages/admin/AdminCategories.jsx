import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Field state
  const [name, setName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories);
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/categories', { name });
      setSuccess('Category created successfully');
      setName('');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This action is permanent.')) return;
    
    setError('');
    setSuccess('');

    try {
      await api.delete(`/categories/${id}`);
      setSuccess('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      // Backend blocks deletion if products belong to the category, displaying a nice message
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-slate-900 pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Category Hierarchy</h1>
          <p className="text-slate-550 text-sm mt-1">Manage standard store departments and navigation slugs.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Add Category Form */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl h-fit space-y-4">
            <h3 className="font-bold text-slate-200 text-sm">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Office Hardware"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
                />
              </div>
              <button
                type="submit"
                disabled={submitLoading || !name.trim()}
                className="w-full bg-indigo-655 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-650 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-smooth cursor-pointer"
              >
                <Plus size={16} />
                {submitLoading ? 'Creating...' : 'Create Category'}
              </button>
            </form>
          </div>

          {/* Categories List View */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="font-bold text-slate-200 text-sm">Active Categories</h3>
              <button onClick={fetchCategories} className="text-slate-500 hover:text-slate-350 p-2">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading && categories.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4">Fetching categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-slate-505 text-xs italic py-4">No categories created yet.</p>
            ) : (
              <div className="divide-y divide-slate-850">
                {categories.map((cat) => (
                  <div key={cat._id} className="flex justify-between items-center py-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">{cat.name}</div>
                      <div className="text-slate-500 font-mono">Slug: {cat.slug}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="p-2 bg-slate-950 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-450 hover:text-rose-450 rounded-lg transition-smooth cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminCategories;
