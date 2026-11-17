import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  Package,
  ShoppingBag,
  DollarSign,
  Banknote,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  formatINR,
  formatNumber,
  formatCompactRupees,
  formatDayMonth,
  formatFullDate,
  normalizeStats
} from './statsHelpers';

// ─── Reusable Status Badge Component (matches SellerOrders.jsx theme) ────────
const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Processing', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    shipped: { label: 'On the way', classes: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
    delivered: { label: 'Delivered', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Cancelled', classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  };
  const { label, classes } = map[status] || { label: status, classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {label}
    </span>
  );
};

// ─── Skeleton Loader Component ───────────────────────────────────────────────
const SalesOverviewSkeleton = () => (
  <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading sales overview">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="h-6 w-40 bg-slate-800 rounded-lg" />
      <div className="h-9 w-64 bg-slate-800 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="h-3.5 w-24 bg-slate-800 rounded" />
          <div className="h-7 w-32 bg-slate-800 rounded" />
          <div className="h-2.5 w-20 bg-slate-850 rounded" />
        </div>
      ))}
    </div>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-64 flex items-center justify-center">
      <div className="text-slate-400 text-xs flex items-center gap-2">
        <RefreshCw size={14} className="animate-spin text-indigo-400" />
        Loading sales analytics...
      </div>
    </div>
  </div>
);

// ─── Inline Plain SVG Revenue Bar Chart (No external chart lib) ──────────────
const DailyRevenueChart = ({ series = [], range = 30 }) => {
  const maxRevenue = Math.max(0, ...series.map((d) => Number(d.revenue) || 0));
  const allZero = maxRevenue === 0;

  if (allZero || series.length === 0) {
    return (
      <div className="h-52 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col items-center justify-center text-center p-4">
        <TrendingUp size={28} className="text-slate-600 mb-2" />
        <p className="text-slate-200 font-semibold text-sm">No sales in the last {range} days</p>
        <p className="text-slate-400 text-xs mt-0.5">When orders are placed, your daily revenue trends will appear here.</p>
      </div>
    );
  }

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 15, bottom: 35, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Nice rounded y-axis maximum
  const rawYMax = maxRevenue * 1.1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawYMax || 1)));
  const yMax = Math.ceil(rawYMax / magnitude) * magnitude || 100;

  // 4 Y-axis gridlines: 0, 1/3, 2/3, 1
  const yGridSteps = [0, 0.33, 0.66, 1];

  // Bar math
  const N = series.length;
  const slotWidth = chartWidth / N;
  const barGap = Math.max(1, slotWidth * 0.22);
  const barWidth = Math.max(2, slotWidth - barGap);

  // X-axis label indices (first, middle, last)
  const firstIdx = 0;
  const midIdx = Math.floor(N / 2);
  const lastIdx = N - 1;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
        aria-label="Daily revenue trend chart"
      >
        {/* Y Gridlines and Labels */}
        {yGridSteps.map((step, idx) => {
          const val = yMax * step;
          const yPos = padding.top + chartHeight - (val / yMax) * chartHeight;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={yPos}
                y2={yPos}
                stroke="#242424"
                strokeWidth={step === 0 ? 1 : 0.75}
                strokeDasharray={step === 0 ? undefined : '3 3'}
                opacity={step === 0 ? 0.9 : 0.55}
              />
              <text
                x={padding.left - 8}
                y={yPos + 3.5}
                textAnchor="end"
                fill="#a3a3a3"
                fontSize="10"
                fontFamily="monospace"
              >
                ₹{formatCompactRupees(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {series.map((item, idx) => {
          const rev = Number(item.revenue) || 0;
          const orders = Number(item.orders) || 0;
          const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;

          if (rev > 0) {
            const barHeight = Math.max(3, (rev / yMax) * chartHeight);
            const y = padding.top + chartHeight - barHeight;
            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#e11d48"
                rx={barWidth > 4 ? 2 : 0}
                className="hover:fill-[#e8a3ae] transition-colors cursor-pointer"
              >
                <title>{`${formatFullDate(item.date)}: ₹${rev.toFixed(2)} (${orders} ${orders === 1 ? 'order' : 'orders'})`}</title>
              </rect>
            );
          }

          // Zero-revenue day: thin baseline tick so it is visually present
          const tickHeight = 2;
          const y = padding.top + chartHeight - tickHeight;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barWidth}
              height={tickHeight}
              fill="#404040"
              opacity="0.75"
              className="hover:opacity-100 cursor-pointer"
            >
              <title>{`${formatFullDate(item.date)}: ₹0.00 (0 orders)`}</title>
            </rect>
          );
        })}

        {/* X-axis Labels (First, Middle, Last) */}
        {series[firstIdx] && (
          <text
            x={padding.left}
            y={padding.top + chartHeight + 18}
            textAnchor="start"
            fill="#a3a3a3"
            fontSize="10"
            fontWeight="500"
          >
            {formatDayMonth(series[firstIdx].date)}
          </text>
        )}
        {series[midIdx] && midIdx !== firstIdx && midIdx !== lastIdx && (
          <text
            x={padding.left + chartWidth / 2}
            y={padding.top + chartHeight + 18}
            textAnchor="middle"
            fill="#a3a3a3"
            fontSize="10"
            fontWeight="500"
          >
            {formatDayMonth(series[midIdx].date)}
          </text>
        )}
        {series[lastIdx] && lastIdx !== firstIdx && (
          <text
            x={padding.left + chartWidth}
            y={padding.top + chartHeight + 18}
            textAnchor="end"
            fill="#a3a3a3"
            fontSize="10"
            fontWeight="500"
          >
            {formatDayMonth(series[lastIdx].date)}
          </text>
        )}
      </svg>
    </div>
  );
};

// ─── Main SalesOverview Component ───────────────────────────────────────────
const SalesOverview = ({ initialStats = null, initialLoading: propLoading, initialError = null } = {}) => {
  let showToast = null;
  try {
    const toast = useToast();
    showToast = toast?.showToast;
  } catch {
    showToast = null;
  }

  const [range, setRange] = useState(() => (initialStats?.range ? Number(initialStats.range) : 30));
  const [stats, setStats] = useState(() => (initialStats ? normalizeStats(initialStats) : null));
  const [initialLoading, setInitialLoading] = useState(() => {
    if (propLoading !== undefined) return propLoading;
    return initialStats || initialError ? false : true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError || null);

  // Counter to discard out-of-order stale network responses
  const activeRequestId = useRef(0);

  const fetchStats = useCallback(
    async (selectedRange) => {
      const requestId = ++activeRequestId.current;
      setErrorMsg(null);

      if (!stats) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await api.get(`/seller/stats?range=${selectedRange}`);
        // If a newer request was dispatched in the meantime, discard this stale response
        if (requestId !== activeRequestId.current) return;

        if (res.data) {
          setStats(normalizeStats(res.data));
        }
      } catch (err) {
        if (requestId !== activeRequestId.current) return;
        const msg =
          err.response?.status === 403
            ? err.response?.data?.message || 'Forbidden, approved seller resource only'
            : err.response?.data?.message || 'Could not load sales data';
        setErrorMsg(msg);
        if (typeof showToast === 'function') {
          showToast(msg, 'error');
        }
      } finally {
        if (requestId === activeRequestId.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [stats, showToast]
  );

  useEffect(() => {
    if (initialStats && range === (initialStats.range || 30)) return;
    fetchStats(range);
  }, [range, fetchStats, initialStats]);

  const handleRangeChange = (newRange) => {
    if (newRange === range) return;
    setRange(newRange);
  };

  // First load skeleton
  if (initialLoading && !stats && !errorMsg) {
    return <SalesOverviewSkeleton />;
  }

  // Inline error state with Retry button
  if (errorMsg && !stats) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-200">Could not load sales data</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => fetchStats(range)}
            className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30 shrink-0"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const totals = stats?.totals || {
    earnedRevenue: 0,
    inProgressRevenue: 0,
    ordersCounted: 0,
    ordersByStatus: { pending: 0, shipped: 0, delivered: 0, cancelled: 0 },
    unitsSold: 0,
    averageOrderValue: 0
  };
  const cashToCollect = stats?.cashToCollect || { amount: 0, parts: 0 };
  const dailySeries = stats?.dailySeries || [];
  const topProducts = stats?.topProducts || [];
  const lowStock = stats?.lowStock || [];
  const maxTopRev = Math.max(0, ...topProducts.map((p) => Number(p.revenue) || 0), 1);

  return (
    <section
      aria-label="Sales overview"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 overflow-hidden transition-all"
    >
      {/* ── Section Header & Range Switch ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-400" />
              <span>Sales Overview</span>
            </h2>
            <span
              className="text-slate-400 hover:text-slate-200 cursor-help"
              title="Revenue counts item prices only; tax and shipping are not included. Cancelled and unpaid orders are excluded."
            >
              <Info size={14} />
            </span>
            {refreshing && (
              <RefreshCw size={13} className="animate-spin text-indigo-400 ml-1" title="Updating..." />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Performance metrics and cash collection over the selected period
          </p>
        </div>

        {/* Range Switch (7 / 30 / 90 days) - Reusing pill pattern from SellerOrders.jsx */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {[7, 30, 90].map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                range === r
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25 border border-indigo-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards (6 Cards) ── */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 ${refreshing ? 'opacity-70' : ''}`}>
        {/* Card 1: Earned Revenue */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-slate-300 text-xs font-medium truncate">Earned</p>
              <span className="text-[10px] text-slate-400 font-mono">(Delivered)</span>
            </div>
            <p className="text-slate-100 text-lg sm:text-xl font-bold truncate mt-0.5" title={formatINR(totals.earnedRevenue)}>
              {formatINR(totals.earnedRevenue)}
            </p>
          </div>
        </div>

        {/* Card 2: In Progress Revenue */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-slate-300 text-xs font-medium truncate">In Progress</p>
              <span className="text-[10px] text-slate-400 font-mono">(Active)</span>
            </div>
            <p className="text-slate-100 text-lg sm:text-xl font-bold truncate mt-0.5" title={formatINR(totals.inProgressRevenue)}>
              {formatINR(totals.inProgressRevenue)}
            </p>
          </div>
        </div>

        {/* Card 3: Orders Counted */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 text-xs font-medium truncate">Orders</p>
            <p className="text-slate-100 text-lg sm:text-xl font-bold truncate mt-0.5">
              {formatNumber(totals.ordersCounted)}
            </p>
          </div>
        </div>

        {/* Card 4: Units Sold */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 text-xs font-medium truncate">Units Sold</p>
            <p className="text-slate-100 text-lg sm:text-xl font-bold truncate mt-0.5">
              {formatNumber(totals.unitsSold)}
            </p>
          </div>
        </div>

        {/* Card 5: Average Order Value */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 text-xs font-medium truncate">Avg. Order Value</p>
            <p className="text-slate-100 text-lg sm:text-xl font-bold truncate mt-0.5" title={formatINR(totals.averageOrderValue)}>
              {formatINR(totals.averageOrderValue)}
            </p>
          </div>
        </div>

        {/* Card 6: Cash to Collect */}
        <div className="bg-slate-950/70 border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
            <Banknote size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 text-xs font-medium truncate">Cash to Collect</p>
            <p className="text-amber-400 text-lg sm:text-xl font-bold truncate mt-0.5" title={formatINR(cashToCollect.amount)}>
              {formatINR(cashToCollect.amount)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400 truncate">
                {cashToCollect.parts} {cashToCollect.parts === 1 ? 'part' : 'parts'} awaiting cash
              </span>
              <Link
                to="/seller/orders"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5 shrink-0"
              >
                <span>Orders</span>
                <ArrowUpRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Revenue Chart ── */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-400" />
            Daily Revenue ({range} days)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Values in ₹ INR (excl. tax & shipping)
          </span>
        </div>
        <DailyRevenueChart series={dailySeries} range={range} />
      </div>

      {/* ── Orders By Status Badges (Reusing SellerOrders.jsx badge theme) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Orders by Status</h3>
          <Link to="/seller/orders" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-0.5">
            <span>View all in Orders</span>
            <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            to="/seller/orders"
            className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 flex items-center justify-between transition-colors"
          >
            <StatusBadge status="pending" />
            <span className="text-xs font-extrabold text-amber-400 font-mono ml-2">
              {formatNumber(totals.ordersByStatus.pending)}
            </span>
          </Link>

          <Link
            to="/seller/orders"
            className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 hover:border-indigo-500/50 flex items-center justify-between transition-colors"
          >
            <StatusBadge status="shipped" />
            <span className="text-xs font-extrabold text-indigo-400 font-mono ml-2">
              {formatNumber(totals.ordersByStatus.shipped)}
            </span>
          </Link>

          <Link
            to="/seller/orders"
            className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 flex items-center justify-between transition-colors"
          >
            <StatusBadge status="delivered" />
            <span className="text-xs font-extrabold text-emerald-400 font-mono ml-2">
              {formatNumber(totals.ordersByStatus.delivered)}
            </span>
          </Link>

          <Link
            to="/seller/orders"
            className="min-h-[40px] px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/50 flex items-center justify-between transition-colors"
          >
            <StatusBadge status="cancelled" />
            <span className="text-xs font-extrabold text-rose-400 font-mono ml-2">
              {formatNumber(totals.ordersByStatus.cancelled)}
            </span>
          </Link>
        </div>
      </div>

      {/* ── Two Columns: Top Products & Needs Restock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-indigo-400" />
              Top Products
            </h3>
            <span className="text-[11px] text-slate-400">By revenue ({range}d)</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              No product sales in this period
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-850/60">
              {topProducts.map((prod, idx) => {
                const rev = Number(prod.revenue) || 0;
                const barPercent = Math.min(100, Math.round((rev / maxTopRev) * 100));
                return (
                  <div key={prod.productId || idx} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-200 truncate" title={prod.name}>
                          {prod.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-100">{formatINR(rev)}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                          ({prod.units} {prod.units === 1 ? 'unit' : 'units'})
                        </span>
                      </div>
                    </div>
                    {/* Proportional horizontal bar */}
                    <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Restock (Low Stock <= 5) */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" />
              Needs Restock
            </h3>
            <span className="text-[11px] text-slate-400">Stock ≤ 5</span>
          </div>

          {lowStock.length === 0 ? (
            <div className="text-center py-8 text-emerald-400/95 text-xs flex items-center justify-center gap-1.5">
              <CheckCircle size={15} />
              <span>All products are well stocked</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lowStock.map((prod, idx) => {
                const isOut = prod.stock === 0;
                return (
                  <div
                    key={prod.productId || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-850 text-xs gap-3"
                  >
                    <span className="text-slate-200 font-medium truncate flex-1" title={prod.name}>
                      {prod.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        isOut
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-extrabold'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {isOut ? 'Out of stock' : `${prod.stock} left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SalesOverview;
