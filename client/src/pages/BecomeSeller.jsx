import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoginPrompt } from '../context/LoginPromptContext';
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Phone, 
  FileText, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

const BecomeSeller = () => {
  const { user, applyForSeller, isAuthenticated, sellerApplicationStatus } = useAuth();
  const { showPrompt } = useLoginPrompt();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [businessDescription, setBusinessDescription] = useState(user?.businessDescription || '');
  const [contactPhone, setContactPhone] = useState(user?.contactPhone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state with user data when user changes
  useEffect(() => {
    if (user) {
      if (user.businessName) setBusinessName(user.businessName);
      if (user.businessDescription) setBusinessDescription(user.businessDescription);
      if (user.contactPhone) setContactPhone(user.contactPhone);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!businessName.trim() || !businessDescription.trim() || !contactPhone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    const result = await applyForSeller({
      businessName,
      businessDescription,
      contactPhone
    });
    setLoading(false);

    if (result.success) {
      setSuccessMsg(result.message || 'Application submitted successfully!');
    } else {
      setError(result.message);
    }
  };

  const currentStatus = sellerApplicationStatus || 'none';

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 text-indigo-400 font-semibold text-sm mb-3">
            <Store size={20} />
            <span>Cartex Multi-Vendor Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Become a Seller on Cartex
          </h1>
          <p className="mt-3 text-slate-300 text-base max-w-2xl leading-relaxed">
            Reach thousands of active shoppers daily. Partner with Cartex to showcase your quality product catalog and scale your online retail presence.
          </p>
        </div>

        {/* Admin Account Notice */}
        {user?.role === 'admin' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
            <ShieldCheck size={48} className="mx-auto text-amber-400" />
            <h2 className="text-xl font-bold text-slate-200">Admin Account</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Administrator accounts cannot apply for seller status. Seller applications are reserved for customer accounts only.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link
                to="/admin/dashboard"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-smooth"
              >
                Go to Admin Dashboard
              </Link>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
            <ShieldCheck size={48} className="mx-auto text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-200">Sign in to Apply</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              You need a registered Cartex customer account before submitting a seller application.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => showPrompt({ title: 'Sign in to apply as a seller', redirectUrl: '/become-seller' })}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-smooth"
              >
                Sign In / Register
              </button>
            </div>
          </div>
        ) : (
          /* Logged In Status or Form */
          <div className="space-y-6">

            {/* STATUS CARDS */}

            {/* 1. PENDING STATUS */}
            {currentStatus === 'pending' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                      <Clock size={28} />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                        Application Status
                      </span>
                      <h2 className="text-xl font-bold text-slate-100">Application Pending Review</h2>
                    </div>
                  </div>
                  <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Pending Review
                  </span>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Your seller application has been submitted and is currently being reviewed by the Cartex marketplace team. You will be notified once your application is processed.
                </p>

                {/* Submitted Details Summary */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-3 text-sm">
                  <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider border-b border-slate-850 pb-2">
                    Submitted Application Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-xs text-slate-500 block">Business Name</span>
                      <span className="font-semibold text-slate-200">{user?.businessName || businessName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Contact Phone</span>
                      <span className="font-semibold text-slate-200">{user?.contactPhone || contactPhone}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Business Description</span>
                    <p className="text-slate-300 text-xs mt-1 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      {user?.businessDescription || businessDescription}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                  <span>Current Account Role: <strong className="text-slate-200 uppercase font-mono">Customer</strong> (will be updated to <strong className="text-indigo-400 uppercase font-mono">Seller</strong> upon approval)</span>
                  <Link to="/profile" className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                    View Profile <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* 2. APPROVED STATUS */}
            {(currentStatus === 'approved' || user?.role === 'seller') && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Application Status
                      </span>
                      <h2 className="text-xl font-bold text-slate-100">Approved Seller Account</h2>
                    </div>
                  </div>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Approved
                  </span>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Congratulations! Your seller application is approved. You are an official seller partner on Cartex.
                </p>

                {/* Seller Profile Summary */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 block">Business Name</span>
                      <span className="font-semibold text-slate-200">{user?.businessName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Contact Phone</span>
                      <span className="font-semibold text-slate-200">{user?.contactPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REJECTED STATUS BANNER (with option to re-apply) */}
            {currentStatus === 'rejected' && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle size={24} className="text-rose-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-100">Application Previously Rejected</h3>
                    <p className="text-xs text-slate-400">
                      Your previous application was not approved. You may review your business information below and submit an updated application for review.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* APPLICATION FORM (Rendered when status is 'none', null, or 'rejected') */}
            {(currentStatus === 'none' || currentStatus === 'rejected') && (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Store className="text-indigo-400" size={22} />
                    Seller Application Form
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide your business details to apply for seller status. All fields are required.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Business Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building2 size={15} className="text-indigo-400" />
                      Business Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Tech Solutions"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-smooth"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone size={15} className="text-indigo-400" />
                      Business Contact Phone <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 (555) 234-5678"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-smooth"
                    />
                  </div>

                  {/* Business Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-400" />
                      Business Description <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your business, product categories, and brand background..."
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition-smooth resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-smooth shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          Submit Seller Application
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default BecomeSeller;
