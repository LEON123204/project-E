import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Package
} from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#eab308', '#10b981', '#f97316'];

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setData(response.data);
      } catch (err) {
        setError('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-rose-400">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p className="font-bold">{error || 'Data loading failed'}</p>
      </div>
    );
  }

  const { stats, charts } = data;

  const kpis = [
    { name: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5' },
    { name: 'Orders Placed', value: stats.totalOrders, icon: ShoppingBag, color: 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5' },
    { name: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-purple-400 border-purple-500/10 bg-purple-500/5' },
    { name: 'Low Stock Alerts', value: stats.lowStockAlerts, icon: AlertTriangle, color: stats.lowStockAlerts > 0 ? 'text-amber-400 border-amber-500/20 bg-amber-500/10 animate-pulse' : 'text-slate-400 border-slate-800 bg-slate-900/40' }
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldCheck size={28} className="text-indigo-400" />
              Admin Control Center
            </h1>
            <p className="text-slate-500 text-sm mt-1">Real-time inventory and financial performance diagnostics.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/products"
              className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-indigo-400 py-1.5 px-4 rounded-xl text-xs font-semibold transition-smooth"
            >
              Manage Catalog
            </Link>
            <Link
              to="/admin/orders"
              className="bg-indigo-650 hover:bg-indigo-550 text-white py-1.5 px-4 rounded-xl text-xs font-semibold transition-smooth"
            >
              Order Backlog
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.name}
              className={`border p-6 rounded-2xl flex items-center justify-between shadow-xl transition-smooth ${kpi.color}`}
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.name}</span>
                <div className="text-2xl font-extrabold text-slate-100">{kpi.value}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900">
                <kpi.icon size={22} />
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-96">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 mb-4">
              <TrendingUp size={16} className="text-indigo-400" />
              Daily Sales Revenue (Last 7 Days)
            </div>
            
            <div className="flex-1 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.dailyRevenue} margin={{ left: -20, bottom: -10 }}>
                  <XAxis dataKey="date" stroke="#475569" strokeWidth={1} tickLine={false} />
                  <YAxis stroke="#475569" strokeWidth={1} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by Category Pie Chart */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl flex flex-col justify-between h-96">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 mb-4">
              <TrendingUp size={16} className="text-indigo-400" />
              Revenue Share by Category
            </div>

            <div className="flex-1 w-full text-xs">
              {charts.categorySales.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 italic">No sales recorded yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categorySales}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {charts.categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(val) => `₹${val.toFixed(2)}`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* Low Stock Alerts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Low Stock Items Details Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-amber-500" />
              Low Stock Warnings (5 items or less)
            </h3>

            {stats.lowStockProducts.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4">All products are healthy. No restocks required.</p>
            ) : (
              <div className="overflow-x-auto pr-1">
                <table className="w-full text-xs text-left divide-y divide-slate-850">
                  <thead>
                    <tr className="text-slate-400 font-semibold">
                      <th className="pb-3 font-semibold">Product Name</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 text-center font-semibold">Stock Left</th>
                      <th className="pb-3 text-right font-semibold">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {stats.lowStockProducts.map((p) => (
                      <tr key={p._id} className="text-slate-300 hover:bg-slate-950/20">
                        <td className="py-2.5 max-w-xs truncate pr-4">{p.name}</td>
                        <td className="py-2.5 text-slate-500">{p.category?.name}</td>
                        <td className="py-2.5 text-center font-bold text-amber-400">{p.stock}</td>
                        <td className="py-2.5 text-right font-semibold">₹{p.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-200 text-sm border-b border-slate-850 pb-3 flex items-center gap-1.5">
              <Package size={16} className="text-indigo-400" />
              Inventory & Admin Management
            </h3>

            <div className="flex flex-col gap-2.5 text-xs font-semibold">
              <Link
                to="/admin/products"
                className="flex items-center justify-between p-3.5 bg-slate-950/30 hover:bg-slate-950 border border-slate-850 rounded-xl transition-smooth group"
              >
                <span>Manage Products Catalog</span>
                <ArrowRight size={14} className="text-slate-550 group-hover:translate-x-0.5 group-hover:text-indigo-400 transition-smooth" />
              </Link>
              <Link
                to="/admin/categories"
                className="flex items-center justify-between p-3.5 bg-slate-950/30 hover:bg-slate-950 border border-slate-850 rounded-xl transition-smooth group"
              >
                <span>Manage Categories Hierarchy</span>
                <ArrowRight size={14} className="text-slate-550 group-hover:translate-x-0.5 group-hover:text-indigo-400 transition-smooth" />
              </Link>
              <Link
                to="/admin/customers"
                className="flex items-center justify-between p-3.5 bg-slate-950/30 hover:bg-slate-950 border border-slate-850 rounded-xl transition-smooth group"
              >
                <span>Review Customer Database</span>
                <ArrowRight size={14} className="text-slate-550 group-hover:translate-x-0.5 group-hover:text-indigo-400 transition-smooth" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
