import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, RefreshCw } from 'lucide-react';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/customers');
      setCustomers(response.data.customers);
    } catch (err) {
      setError('Failed to fetch customers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
              <Users size={28} className="text-indigo-400" />
              Customer Accounts
            </h1>
            <p className="text-slate-555 text-sm mt-1">Review accounts registered in the e-commerce database.</p>
          </div>
          <button onClick={fetchCustomers} className="text-slate-500 hover:text-slate-350 p-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3.5 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Database List */}
        {loading && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center text-slate-550 italic text-sm">
            No customer accounts registered.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-850">
                <thead>
                  <tr className="text-slate-400 font-semibold bg-slate-950/20">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4 text-center">Addresses Saved</th>
                    <th className="p-4 text-right">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {customers.map((c) => (
                    <tr key={c._id} className="text-slate-350 hover:bg-slate-950/10">
                      <td className="p-4 font-bold text-slate-200">{c.name}</td>
                      <td className="p-4 font-mono text-slate-400">{c.email}</td>
                      <td className="p-4 text-center text-slate-400">{c.addresses?.length || 0}</td>
                      <td className="p-4 text-right text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-850">
              {customers.map((c) => (
                <div key={c._id} className="p-4 space-y-2 bg-slate-900 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-sm">{c.name}</span>
                    <span className="text-[10px] text-slate-500">
                      Joined: {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono break-all">{c.email}</div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-850/40 text-[11px] text-slate-500">
                    <span>Addresses Saved: {c.addresses?.length || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminCustomers;
