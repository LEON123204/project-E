import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  formatRupees,
  formatRate,
  monthLabel,
  formatIstDate,
  formatIstDateTime,
  netLabel,
  isMonthEnded,
  normalizeAdminCommissions
} from '../../utils/earningsFormat';
import {
  Percent,
  Calendar,
  AlertCircle,
  RefreshCw,
  Package,
  ArrowRight,
  TrendingUp,
  Banknote,
  Clock,
  CheckCircle2,
  Lock,
  ChevronDown,
  Info,
  DollarSign,
  AlertTriangle,
  History,
  X,
  Store,
  Check
} from 'lucide-react';

const AdminCommissions = () => {
  const { showToast } = useToast();

  // Settings State
  const [ratePercent, setRatePercent] = useState(10);
  const [rateInput, setRateInput] = useState('10');
  const [rateHistory, setRateHistory] = useState([]);
  const [savingRate, setSavingRate] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);

  // Month & Commissions State
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [commissionsData, setCommissionsData] = useState(null);
  const [unrecordedParts, setUnrecordedParts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Close Month Modal State
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);

  // Settle Modal State
  const [settleModalData, setSettleModalData] = useState(null); // { statementId, sellerName, net }
  const [settleNote, setSettleNote] = useState('');
  const [settlingStatement, setSettlingStatement] = useState(false);

  // Request counter to avoid race conditions
  const requestCounterRef = useRef(0);

  // Initial load: settings, months, unrecorded parts check
  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const [settingsRes, monthsRes, ordersRes] = await Promise.allSettled([
          api.get('/admin/settings/commission'),
          api.get('/admin/commissions/months'),
          api.get('/orders')
        ]);

        if (!isMounted) return;

        // Settings
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.success) {
          const r = settingsRes.value.data.ratePercent ?? 10;
          setRatePercent(r);
          setRateInput(String(r));
          setRateHistory(settingsRes.value.data.history || []);
        }

        // Months
        let fetchedMonths = [];
        if (monthsRes.status === 'fulfilled' && monthsRes.value?.data?.success) {
          fetchedMonths = monthsRes.value.data.months || [];
        }

        const now = new Date();
        const istOffset = (5 * 60 + 30) * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const currentMonthKey = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}`;

        const monthKeys = new Set(fetchedMonths.map(m => m.month));
        if (!monthKeys.has(currentMonthKey)) {
          fetchedMonths.unshift({ month: currentMonthKey, isClosable: false, isClosed: false });
        }

        setMonths(fetchedMonths);
        const initialMonth = fetchedMonths[0]?.month || currentMonthKey;
        setSelectedMonth(initialMonth);

        // Check unrecorded parts across delivered orders
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data?.orders) {
          const allOrders = ordersRes.value.data.orders;
          let unrecorded = 0;
          for (const ord of allOrders) {
            for (const sub of (ord.subOrders || [])) {
              if (sub.sellerId && sub.status === 'delivered') {
                if (sub.commissionRate === null || sub.commissionRate === undefined) {
                  unrecorded += 1;
                }
              }
            }
          }
          setUnrecordedParts(unrecorded);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load admin commissions');
          showToast('Failed to load admin commissions', 'error');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Fetch month data
  const fetchMonthData = (monthKey) => {
    if (!monthKey) return;
    const currentReqId = ++requestCounterRef.current;
    setDataLoading(true);
    setError(null);

    api.get(`/admin/commissions?month=${monthKey}`)
      .then(res => {
        if (requestCounterRef.current === currentReqId) {
          setCommissionsData(normalizeAdminCommissions(res.data));
        }
      })
      .catch(err => {
        if (requestCounterRef.current === currentReqId) {
          const msg = err.response?.data?.message || 'Failed to fetch commissions for selected month';
          setError(msg);
          showToast(msg, 'error');
        }
      })
      .finally(() => {
        if (requestCounterRef.current === currentReqId) {
          setDataLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchMonthData(selectedMonth);
  }, [selectedMonth]);

  // Handle Rate Update
  const handleOpenRateModal = (e) => {
    e.preventDefault();
    const val = parseFloat(rateInput);
    if (isNaN(val) || val < 0 || val > 50) {
      showToast('Rate must be between 0 and 50', 'error');
      return;
    }
    if (parseFloat(val.toFixed(2)) !== val) {
      showToast('Rate can have at most 2 decimal places', 'error');
      return;
    }
    setRateModalOpen(true);
  };

  const handleConfirmSaveRate = async () => {
    setSavingRate(true);
    try {
      const val = parseFloat(rateInput);
      const res = await api.put('/admin/settings/commission', { ratePercent: val });
      if (res.data.success) {
        setRatePercent(res.data.ratePercent);
        setRateInput(String(res.data.ratePercent));
        setRateHistory(res.data.history || []);
        showToast('Commission rate updated successfully', 'success');
        setRateModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update commission rate';
      showToast(msg, 'error');
    } finally {
      setSavingRate(false);
    }
  };

  // Handle Close Month
  const handleConfirmCloseMonth = async () => {
    if (!selectedMonth) return;
    setClosingMonth(true);
    try {
      const res = await api.post(`/admin/commissions/${selectedMonth}/close`);
      if (res.data.success) {
        showToast(`Month ${selectedMonth} closed successfully (${res.data.createdCount} statements created)`, 'success');
        setCloseModalOpen(false);
        // Refresh month data
        fetchMonthData(selectedMonth);
        // Refresh months list
        const mRes = await api.get('/admin/commissions/months');
        if (mRes.data?.months) setMonths(mRes.data.months);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to close month';
      showToast(msg, 'error');
    } finally {
      setClosingMonth(false);
    }
  };

  // Handle Settle Statement
  const handleOpenSettleModal = (seller) => {
    setSettleModalData({
      statementId: seller.statementId,
      sellerName: seller.sellerName,
      net: seller.totals.net
    });
    setSettleNote('');
  };

  const handleConfirmSettle = async () => {
    if (!settleModalData?.statementId) return;
    setSettlingStatement(true);
    try {
      const res = await api.put(`/admin/commissions/statements/${settleModalData.statementId}/settle`, {
        note: settleNote.trim() || undefined
      });
      if (res.data.success) {
        showToast('Statement marked as settled', 'success');
        setSettleModalData(null);
        fetchMonthData(selectedMonth);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('This statement was just updated - refreshed', 'info');
        setSettleModalData(null);
        fetchMonthData(selectedMonth);
      } else {
        const msg = err.response?.data?.message || 'Failed to settle statement';
        showToast(msg, 'error');
      }
    } finally {
      setSettlingStatement(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'settled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} />
            Settled
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Lock size={12} />
            Closed
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={12} />
            Open
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 bg-slate-900 rounded-xl w-64 border border-slate-800"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800"></div>
            <div className="lg:col-span-2 h-64 bg-slate-900 rounded-2xl border border-slate-800"></div>
          </div>
          <div className="h-72 bg-slate-900 rounded-2xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  const { platformTotals, cartexDirect, sellers, isClosed } = commissionsData || normalizeAdminCommissions(null);

  // Compute payable and receivable sums across sellers
  let payableSum = 0;
  let receivableSum = 0;
  sellers.forEach(s => {
    if (s.totals.net > 0) payableSum += s.totals.net;
    else if (s.totals.net < 0) receivableSum += Math.abs(s.totals.net);
  });

  const monthEnded = isMonthEnded(selectedMonth);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Percent size={20} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Platform Commissions</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Manage platform commission rates, review monthly statements, and record settlements.
            </p>
          </div>

          {/* Month Selector & Close Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                aria-label="Select commission month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-200 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 outline-none cursor-pointer min-h-[40px] transition-colors"
              >
                {months.map(m => (
                  <option key={m.month} value={m.month}>
                    {monthLabel(m.month)} {m.isClosed ? '(Closed)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
            </div>

            {monthEnded && !isClosed && (
              <button
                onClick={() => setCloseModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px] shadow-lg shadow-indigo-600/20"
              >
                <Lock size={14} />
                Close Month
              </button>
            )}
          </div>
        </div>

        {/* ── Unrecorded Warning Banner ── */}
        {unrecordedParts > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-300">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>
              Some delivered parts ({unrecordedParts}) have no recorded commission; run the backfill.
            </span>
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-sm text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchMonthData(selectedMonth)}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition-colors"
            >
              <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        )}

        {/* ── Commission Rate Card & History ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rate Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Current Commission Rate</span>
                <span className="text-2xl font-black text-indigo-400">{formatRate(ratePercent)}</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Applied to new sub-orders at checkout. Existing orders retain their historical rate.
              </p>

              <form onSubmit={handleOpenRateModal} className="space-y-3">
                <div>
                  <label htmlFor="rate-input" className="block text-xs font-semibold text-slate-300 mb-1">
                    New Rate (%)
                  </label>
                  <input
                    id="rate-input"
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingRate || parseFloat(rateInput) === ratePercent}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
                >
                  Save New Rate
                </button>
              </form>
            </div>
          </div>

          {/* Rate History */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
              <History size={16} className="text-indigo-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Rate Change History (Last 20)</h2>
            </div>

            {rateHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No historical changes recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {rateHistory.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="font-semibold text-slate-300">{formatRate(h.from)} → {formatRate(h.to)}</span>
                      <span className="text-slate-400 text-[11px] ml-2">by {h.changedBy}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{formatIstDateTime(h.changedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Commission */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Total Commission</span>
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-400">{formatRupees(platformTotals.commission)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">From {platformTotals.parts} seller parts</span>
          </div>

          {/* Payable to Sellers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Payable to Sellers</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">{formatRupees(payableSum)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Cartex owes sellers</span>
          </div>

          {/* Receivable from Sellers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Receivable from Sellers</span>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400">{formatRupees(receivableSum)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Sellers owe Cartex (COD)</span>
          </div>

          {/* Cartex Direct Sales */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Cartex Direct Sales</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-100">{formatRupees(cartexDirect.gross)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">{cartexDirect.parts} parts (by order date)</span>
          </div>
        </div>

        {/* ── Sellers Table ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Seller Statements — {monthLabel(selectedMonth)}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Overview of gross sales, commissions, cash held, and net balances by seller.</p>
            </div>
            {isClosed ? (
              <span className="inline-flex items-center gap-1 text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-full font-bold">
                <Lock size={12} /> Month Closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                <Clock size={12} /> Month Open
              </span>
            )}
          </div>

          {sellers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Store size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-slate-300 text-sm">No registered sellers found.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4 text-center">Parts</th>
                      <th className="py-3 px-4 text-right">Gross</th>
                      <th className="py-3 px-4 text-right">Commission</th>
                      <th className="py-3 px-4 text-right">Earnings</th>
                      <th className="py-3 px-4 text-right">COD Cash Held</th>
                      <th className="py-3 px-4 text-right">Net Direction</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sellers.map((s, idx) => {
                      const netInfo = netLabel(s.totals.net, 'admin');
                      return (
                        <tr key={s.sellerId || idx} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {s.sellerName}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400">
                            {s.totals.parts}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                            {formatRupees(s.totals.gross)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-indigo-400 font-medium">
                            {formatRupees(s.totals.commission)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-200 font-medium">
                            {formatRupees(s.totals.earnings)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-400 font-medium">
                            {s.totals.codCashHeld > 0 ? formatRupees(s.totals.codCashHeld) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            <span className={netInfo.direction === 'payable' ? 'text-emerald-400' : (netInfo.direction === 'receivable' ? 'text-amber-400' : 'text-slate-400')}>
                              {netInfo.text}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {renderStatusBadge(s.status)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {s.status === 'closed' ? (
                              <button
                                onClick={() => handleOpenSettleModal(s)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
                              >
                                Mark settled
                              </button>
                            ) : s.status === 'settled' ? (
                              <span className="text-[11px] text-slate-400">Settled</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {sellers.map((s, idx) => {
                  const netInfo = netLabel(s.totals.net, 'admin');
                  return (
                    <div key={s.sellerId || idx} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm">{s.sellerName}</span>
                        {renderStatusBadge(s.status)}
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Delivered Parts:</span>
                        <span className="text-slate-200">{s.totals.parts}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Gross Sales:</span>
                        <span className="text-slate-200 font-medium">{formatRupees(s.totals.gross)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Platform Commission:</span>
                        <span className="text-indigo-400 font-medium">{formatRupees(s.totals.commission)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Earnings:</span>
                        <span className="text-slate-200 font-medium">{formatRupees(s.totals.earnings)}</span>
                      </div>
                      {s.totals.codCashHeld > 0 && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>COD Cash Held:</span>
                          <span className="text-amber-400 font-medium">{formatRupees(s.totals.codCashHeld)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold">
                        <span className="text-slate-300">Net:</span>
                        <span className={netInfo.direction === 'payable' ? 'text-emerald-400' : (netInfo.direction === 'receivable' ? 'text-amber-400' : 'text-slate-400')}>
                          {netInfo.text}
                        </span>
                      </div>
                      {s.status === 'closed' && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleOpenSettleModal(s)}
                            className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
                          >
                            Mark settled
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Table Caption */}
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Settlement here is bookkeeping only; Cartex does not transfer money through this page.
          </div>
        </div>

        {/* ── Rate Confirmation Modal ── */}
        {rateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <Percent size={18} className="text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Confirm Commission Rate</h3>
                </div>
                <button
                  onClick={() => setRateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-300">
                You are setting the commission rate to <strong className="text-indigo-400">{formatRate(rateInput)}</strong>.
              </p>
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                Applies to NEW orders only; existing orders keep their rate.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRateModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingRate}
                  onClick={handleConfirmSaveRate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                >
                  {savingRate ? <RefreshCw size={14} className="animate-spin" /> : 'Confirm & Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Close Month Confirmation Modal ── */}
        {closeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                    <Lock size={18} className="text-rose-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Close Month {selectedMonth}</h3>
                </div>
                <button
                  onClick={() => setCloseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-300">
                This freezes every seller's statement for <strong className="text-slate-100">{monthLabel(selectedMonth)}</strong>. It cannot be undone.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={closingMonth}
                  onClick={handleConfirmCloseMonth}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                >
                  {closingMonth ? <RefreshCw size={14} className="animate-spin" /> : 'Close Statement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Settle Statement Modal ── */}
        {settleModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Mark Statement Settled</h3>
                </div>
                <button
                  onClick={() => setSettleModalData(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 text-sm text-slate-300">
                <div>Seller: <strong className="text-slate-100">{settleModalData.sellerName}</strong></div>
                <div>Net Balance: <strong className="text-emerald-400">{formatRupees(settleModalData.net)}</strong></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="settle-note" className="block text-xs font-semibold text-slate-300">
                    Payment reference / note (optional)
                  </label>
                  <span className="text-[11px] text-slate-400">{settleNote.length} / 200</span>
                </div>
                <textarea
                  id="settle-note"
                  rows={3}
                  maxLength={200}
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Settled via NEFT / UPI ref #..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-100 outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalData(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settlingStatement}
                  onClick={handleConfirmSettle}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                >
                  {settlingStatement ? <RefreshCw size={14} className="animate-spin" /> : 'Confirm Settlement'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminCommissions;
