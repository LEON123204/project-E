import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Store,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Building2,
  Filter,
  User
} from 'lucide-react';

const statusConfig = {
  pending:  { label: 'Pending',  cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  approved: { label: 'Approved', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  rejected: { label: 'Rejected', cls: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-slate-800 text-slate-400' };
  return (
    <span className={`text-[9px] font-extrabold uppercase tracking-wider py-1 px-2.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const AdminSellerApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Tab filter: 'pending' | 'approved' | 'rejected' | 'all'
  const [filter, setFilter] = useState('pending');

  // Per-row action loading state
  const [actioningId, setActioningId] = useState(null);

  // Expanded detail panel
  const [expandedId, setExpandedId] = useState(null);

  const fetchApplications = async (status = filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/seller-applications?status=${status}`);
      setApplications(res.data.applications);
    } catch (err) {
      setError('Failed to fetch seller applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(filter);
  }, [filter]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleApprove = async (userId, userName) => {
    clearMessages();
    setActioningId(userId);
    try {
      const res = await api.put(`/admin/seller-applications/${userId}/approve`);
      setSuccess(res.data.message);
      // Remove from current list (only matters when viewing 'pending' or 'all')
      setApplications(prev =>
        filter === 'approved'
          ? prev.map(a => a._id === userId ? { ...a, sellerApplicationStatus: 'approved', role: 'seller' } : a)
          : prev.filter(a => a._id !== userId)
      );
      setExpandedId(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to approve ${userName}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (userId, userName) => {
    clearMessages();
    setActioningId(userId);
    try {
      const res = await api.put(`/admin/seller-applications/${userId}/reject`);
      setSuccess(res.data.message);
      setApplications(prev =>
        filter === 'rejected'
          ? prev.map(a => a._id === userId ? { ...a, sellerApplicationStatus: 'rejected' } : a)
          : prev.filter(a => a._id !== userId)
      );
      setExpandedId(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to reject ${userName}`);
    } finally {
      setActioningId(null);
    }
  };

  const filterTabs = [
    { key: 'pending',  label: 'Pending',  Icon: Clock },
    { key: 'approved', label: 'Approved', Icon: CheckCircle2 },
    { key: 'rejected', label: 'Rejected', Icon: XCircle },
    { key: 'all',      label: 'All',      Icon: Filter },
  ];

  const pendingCount = filter === 'all'
    ? applications.filter(a => a.sellerApplicationStatus === 'pending').length
    : filter === 'pending' ? applications.length : 0;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2.5">
              <Store size={28} className="text-indigo-400" />
              Seller Applications
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review, approve, or reject seller partnership applications.
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchApplications(filter)}
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
            <Filter size={14} className="text-indigo-400" /> View:
          </span>
          {filterTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setExpandedId(null); clearMessages(); }}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-smooth ${
                filter === key
                  ? key === 'pending'  ? 'bg-amber-500 text-white'
                  : key === 'approved' ? 'bg-emerald-600 text-white'
                  : key === 'rejected' ? 'bg-rose-600 text-white'
                  : 'bg-indigo-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Applications Table */}
        {loading && applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-850 rounded-2xl">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 p-14 rounded-2xl text-center space-y-3">
            <Store size={36} className="mx-auto text-slate-700" />
            <p className="text-slate-500 italic text-sm">
              No {filter !== 'all' ? filter : ''} seller applications found.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left divide-y divide-slate-850">
                <thead>
                  <tr className="text-slate-400 font-semibold bg-slate-950/20">
                    <th className="p-4">Applicant</th>
                    <th className="p-4">Business Name</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4 text-center">Submitted</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {applications.map((app) => (
                    <React.Fragment key={app._id}>
                      <tr
                        className="text-slate-350 hover:bg-slate-950/10 cursor-pointer"
                        onClick={() => setExpandedId(prev => prev === app._id ? null : app._id)}
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{app.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{app.email}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-200">{app.businessName || '—'}</td>
                        <td className="p-4 text-slate-400 font-mono">{app.contactPhone || '—'}</td>
                        <td className="p-4 text-center text-slate-500">
                          {new Date(app.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <StatusBadge status={app.sellerApplicationStatus} />
                        </td>
                        <td className="p-4 text-center">
                          {app.sellerApplicationStatus === 'pending' ? (
                            <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleApprove(app._id, app.name)}
                                disabled={actioningId === app._id}
                                className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-600/40 hover:border-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-smooth disabled:opacity-50"
                              >
                                {actioningId === app._id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(app._id, app.name)}
                                disabled={actioningId === app._id}
                                className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 hover:border-rose-600 text-rose-400 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-smooth disabled:opacity-50"
                              >
                                {actioningId === app._id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <X size={12} />}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {expandedId === app._id && (
                        <tr className="bg-slate-950/30">
                          <td colSpan={6} className="px-6 py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                  <Building2 size={11} className="text-indigo-400" /> Business Name
                                </div>
                                <p className="text-slate-200 font-semibold">{app.businessName || '—'}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                  <Phone size={11} className="text-indigo-400" /> Contact Phone
                                </div>
                                <p className="text-slate-200 font-mono">{app.contactPhone || '—'}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                  <User size={11} className="text-indigo-400" /> Account Role
                                </div>
                                <p className="text-slate-200 capitalize font-semibold">{app.role}</p>
                              </div>
                              <div className="sm:col-span-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                  <FileText size={11} className="text-indigo-400" /> Business Description
                                </div>
                                <p className="text-slate-300 leading-relaxed bg-slate-900 border border-slate-850 rounded-xl p-3">
                                  {app.businessDescription || '—'}
                                </p>
                              </div>
                            </div>
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
              {applications.map((app) => (
                <div key={app._id} className="p-4 space-y-4 bg-slate-900 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200 text-sm">{app.name}</div>
                      <div className="text-slate-500 font-mono text-[10px] mt-0.5 break-all">{app.email}</div>
                    </div>
                    <StatusBadge status={app.sellerApplicationStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-slate-500 mb-0.5">Business Name</div>
                      <div className="font-semibold text-slate-200">{app.businessName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">Contact Phone</div>
                      <div className="font-mono text-slate-300">{app.contactPhone || '—'}</div>
                    </div>
                  </div>

                  {app.businessDescription && (
                    <div className="text-[11px]">
                      <div className="text-slate-500 mb-1">Business Description</div>
                      <p className="text-slate-300 bg-slate-950/40 border border-slate-850 rounded-lg p-3 leading-relaxed">
                        {app.businessDescription}
                      </p>
                    </div>
                  )}

                  <div className="text-slate-600 text-[10px]">
                    Submitted: {new Date(app.updatedAt).toLocaleDateString()}
                  </div>

                  {app.sellerApplicationStatus === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(app._id, app.name)}
                        disabled={actioningId === app._id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-600/40 text-emerald-400 hover:text-white font-bold py-2.5 rounded-xl cursor-pointer transition-smooth disabled:opacity-50"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(app._id, app.name)}
                        disabled={actioningId === app._id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-600/40 text-rose-400 hover:text-white font-bold py-2.5 rounded-xl cursor-pointer transition-smooth disabled:opacity-50"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default AdminSellerApplications;
