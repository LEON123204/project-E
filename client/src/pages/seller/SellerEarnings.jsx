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
  normalizeEarnings
} from '../../utils/earningsFormat';
import {
  DollarSign,
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
  Info
} from 'lucide-react';

const SellerEarnings = () => {
  const { showToast } = useToast();

  const [commissionRate, setCommissionRate] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [earningsData, setEarningsData] = useState(null);
  const [awaitingData, setAwaitingData] = useState({
    deliveredAwaitingCash: { parts: 0, amount: 0 },
    inProgress: { parts: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Request counter to ignore stale responses
  const requestCounterRef = useRef(0);

  // Initial load: commission rate, months list, awaiting orders
  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rateRes, monthsRes, ordersRes] = await Promise.allSettled([
          api.get('/seller/commission-rate'),
          api.get('/seller/earnings/months'),
          api.get('/seller/orders')
        ]);

        if (!isMounted) return;

        // Rate
        if (rateRes.status === 'fulfilled' && rateRes.value?.data?.success) {
          setCommissionRate(rateRes.value.data.ratePercent);
        }

        // Months
        let fetchedMonths = [];
        if (monthsRes.status === 'fulfilled' && monthsRes.value?.data?.success) {
          fetchedMonths = monthsRes.value.data.months || [];
        }

        // Ensure current IST month is always present
        const now = new Date();
        const istOffset = (5 * 60 + 30) * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        const currentMonthKey = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth() + 1).padStart(2, '0')}`;

        const monthKeys = new Set(fetchedMonths.map(m => m.month));
        if (!monthKeys.has(currentMonthKey)) {
          fetchedMonths.unshift({ month: currentMonthKey, isClosed: false, status: 'open' });
        }

        setMonths(fetchedMonths);
        const initialMonth = fetchedMonths[0]?.month || currentMonthKey;
        setSelectedMonth(initialMonth);

        // Awaiting orders calculation
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data?.success) {
          const allOrders = ordersRes.value.data.orders || [];
          let awaitingCashParts = 0;
          let awaitingCashAmount = 0;
          let inProgressParts = 0;

          for (const ord of allOrders) {
            const sub = ord.subOrder || ord;
            const isCod = (ord.paymentMethod || '').toLowerCase() === 'cod';
            if (sub.status === 'delivered') {
              if (isCod && !sub.codCollected) {
                awaitingCashParts += 1;
                awaitingCashAmount += (sub.amountDue || 0);
              }
            } else if (sub.status === 'pending' || sub.status === 'shipped') {
              inProgressParts += 1;
            }
          }

          setAwaitingData({
            deliveredAwaitingCash: { parts: awaitingCashParts, amount: awaitingCashAmount },
            inProgress: { parts: inProgressParts }
          });
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load earnings overview.');
          showToast('Failed to load earnings overview', 'error');
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

  // Fetch earnings when selectedMonth changes
  useEffect(() => {
    if (!selectedMonth) return;

    const currentReqId = ++requestCounterRef.current;
    setDataLoading(true);
    setError(null);

    api.get(`/seller/earnings?month=${selectedMonth}`)
      .then(res => {
        if (requestCounterRef.current === currentReqId) {
          setEarningsData(normalizeEarnings(res.data));
        }
      })
      .catch(err => {
        if (requestCounterRef.current === currentReqId) {
          const msg = err.response?.data?.message || 'Failed to fetch earnings for selected month';
          setError(msg);
          showToast(msg, 'error');
        }
      })
      .finally(() => {
        if (requestCounterRef.current === currentReqId) {
          setDataLoading(false);
        }
      });
  }, [selectedMonth, showToast]);

  const handleRetry = () => {
    if (!selectedMonth) return;
    const currentReqId = ++requestCounterRef.current;
    setDataLoading(true);
    setError(null);

    api.get(`/seller/earnings?month=${selectedMonth}`)
      .then(res => {
        if (requestCounterRef.current === currentReqId) {
          setEarningsData(normalizeEarnings(res.data));
        }
      })
      .catch(err => {
        if (requestCounterRef.current === currentReqId) {
          const msg = err.response?.data?.message || 'Failed to fetch earnings for selected month';
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

  // Status badge config
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'settled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={13} />
            Settled
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Lock size={13} />
            Closed
          </span>
        );
      case 'open':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={13} />
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
          <div className="h-20 bg-slate-900 rounded-2xl border border-slate-800"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-900 rounded-2xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  const { totals, lines, status, linesTruncated, settledAt, settlementNote } = earningsData || normalizeEarnings(null);
  const netInfo = netLabel(totals.net, 'seller');

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <DollarSign size={20} className="text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Seller Earnings</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Review your monthly statement, commission breakdowns, and net payouts.
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                aria-label="Select earnings month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-200 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 outline-none cursor-pointer min-h-[40px] transition-colors"
              >
                {months.map(m => (
                  <option key={m.month} value={m.month}>
                    {monthLabel(m.month)} {m.status === 'closed' ? '(Closed)' : (m.status === 'settled' ? '(Settled)' : '')}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Rate Note ── */}
        {commissionRate !== null && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <Info size={16} className="text-indigo-400 shrink-0" />
              <span>
                Commission: <strong className="text-slate-100">{formatRate(commissionRate)}</strong> of item price. The rate is recorded when an order is placed.
              </span>
            </div>
            <Link
              to="/seller/orders"
              className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 shrink-0 text-xs transition-colors"
            >
              View Orders <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* ── Status & Settlement Details Banner ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Statement Status:</span>
            {renderStatusBadge(status)}
          </div>

          <div className="text-xs text-slate-400">
            {status === 'open' && (
              <span>Figures can change until the admin closes the month.</span>
            )}
            {status === 'closed' && (
              <span className="text-indigo-300">Final statement. Awaiting admin settlement payout.</span>
            )}
            {status === 'settled' && (
              <div className="space-y-1">
                <div>
                  <span className="text-slate-400">Settled on: </span>
                  <strong className="text-slate-200">{formatIstDateTime(settledAt)}</strong>
                </div>
                {settlementNote && (
                  <div>
                    <span className="text-slate-400">Reference / Note: </span>
                    <span className="text-slate-200">{settlementNote}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Error State (with retry) ── */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-sm text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition-colors"
            >
              <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Gross */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Gross Sales</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-100">{formatRupees(totals.gross)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">{totals.parts} delivered {totals.parts === 1 ? 'item' : 'items'}</span>
          </div>

          {/* Commission */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Platform Commission</span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400">-{formatRupees(totals.commission)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Deducted per item rate</span>
          </div>

          {/* Earnings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Your Earnings</span>
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-400">{formatRupees(totals.earnings)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Gross minus commission</span>
          </div>

          {/* COD Cash Held */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <span className="text-xs font-semibold text-slate-400 block mb-1">COD Cash You Hold</span>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400">{formatRupees(totals.codCashHeld)}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Cash collected by you</span>
          </div>

          {/* Net */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Net Settlement</span>
              <div className={`text-xl sm:text-2xl font-extrabold ${netInfo.direction === 'payable' ? 'text-emerald-400' : (netInfo.direction === 'receivable' ? 'text-amber-400' : 'text-slate-100')}`}>
                {netInfo.amountText}
              </div>
            </div>
            <div className="text-xs font-semibold mt-2 pt-2 border-t border-slate-800 text-slate-300">
              {netInfo.text}
            </div>
          </div>
        </div>

        {/* Net Formula Info text */}
        <p className="text-xs text-slate-400 italic">
          * Net = your earnings minus the cash you already collected on COD orders.
        </p>

        {/* ── Lines Table (Cards on Mobile) ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Settled Order Items ({lines.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">List of delivered parts counted towards this month's statement.</p>
            </div>
            {linesTruncated && (
              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-semibold">
                Showing first 500 lines
              </span>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-slate-300 text-sm">No delivered items counted for {monthLabel(selectedMonth)} yet.</p>
              <p className="text-xs text-slate-400 mt-1">Orders appear here once delivered and payment is confirmed.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Counted on</th>
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Gross</th>
                      <th className="py-3 px-4 text-right">Commission</th>
                      <th className="py-3 px-4 text-right">Earnings</th>
                      <th className="py-3 px-4 text-right">COD Cash Held</th>
                      <th className="py-3 px-4 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lines.map((line, idx) => {
                      const lineNet = netLabel(line.net, 'seller');
                      return (
                        <tr key={line.subOrderId || idx} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {formatIstDate(line.settledAt)}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            #{line.orderId.slice(-6)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${line.paymentMethod === 'cod' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              {line.paymentMethod.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-200">
                            {formatRupees(line.gross)}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-400 font-medium">
                            -{formatRupees(line.commission)}{' '}
                            <span className="text-slate-400 text-[10px]">({formatRate(line.commissionRate)})</span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-400">
                            {formatRupees(line.earnings)}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-400 font-medium">
                            {line.codCashHeld > 0 ? formatRupees(line.codCashHeld) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-100">
                            <span className={lineNet.direction === 'payable' ? 'text-emerald-400' : (lineNet.direction === 'receivable' ? 'text-amber-400' : 'text-slate-300')}>
                              {lineNet.amountText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {lines.map((line, idx) => {
                  const lineNet = netLabel(line.net, 'seller');
                  return (
                    <div key={line.subOrderId || idx} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400">#{line.orderId.slice(-6)}</span>
                        <span className="text-slate-400">{formatIstDate(line.settledAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Payment:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${line.paymentMethod === 'cod' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                          {line.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Gross:</span>
                        <span className="text-slate-200 font-medium">{formatRupees(line.gross)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Commission ({formatRate(line.commissionRate)}):</span>
                        <span className="text-rose-400 font-medium">-{formatRupees(line.commission)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Earnings:</span>
                        <span className="text-indigo-400 font-semibold">{formatRupees(line.earnings)}</span>
                      </div>
                      {line.codCashHeld > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">COD Cash Held:</span>
                          <span className="text-amber-400 font-medium">{formatRupees(line.codCashHeld)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold">
                        <span className="text-slate-300">Net:</span>
                        <span className={lineNet.direction === 'payable' ? 'text-emerald-400' : (lineNet.direction === 'receivable' ? 'text-amber-400' : 'text-slate-100')}>
                          {lineNet.amountText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Awaiting Panel (All-Time) ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Awaiting Settlement Pipeline</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Delivered awaiting cash */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Delivered (Awaiting COD Cash Collection)</span>
                <p className="text-slate-400">
                  {awaitingData.deliveredAwaitingCash.parts} {awaitingData.deliveredAwaitingCash.parts === 1 ? 'order' : 'orders'} totaling{' '}
                  <strong className="text-slate-200">{formatRupees(awaitingData.deliveredAwaitingCash.amount)}</strong>
                </p>
              </div>
              <Link
                to="/seller/orders"
                className="mt-3 text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 min-h-[40px] items-center"
              >
                Go to Orders to collect cash <ArrowRight size={13} />
              </Link>
            </div>

            {/* In progress */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">In-Progress Shipments</span>
                <p className="text-slate-400">
                  {awaitingData.inProgress.parts} {awaitingData.inProgress.parts === 1 ? 'part' : 'parts'} currently pending or shipped.
                </p>
              </div>
              <Link
                to="/seller/orders"
                className="mt-3 text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 min-h-[40px] items-center"
              >
                Manage fulfillment <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerEarnings;
