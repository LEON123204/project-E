// Pure helpers and normalizers for Seller Sales Overview (Stage 6-2)

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Safely parse a value as a finite number, falling back to a default.
 * Handles strings, numbers, undefined, null, NaN, Infinity.
 */
export const safeNum = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Parse 'YYYY-MM-DD' manually into { year, month, day } without timezone conversion.
 */
export const parseDateParts = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
};

/**
 * Formats 'YYYY-MM-DD' as '12 Nov' without timezone conversion.
 */
export const formatDayMonth = (dateStr) => {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  const mName = MONTH_NAMES[parts.month - 1] || '';
  return `${parts.day} ${mName}`;
};

/**
 * Formats 'YYYY-MM-DD' as '12 Nov 2026' without timezone conversion.
 */
export const formatFullDate = (dateStr) => {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  const mName = MONTH_NAMES[parts.month - 1] || '';
  return `${parts.day} ${mName} ${parts.year}`;
};

/**
 * Formats a number as Indian Currency (INR) with rupee sign '₹' and 2 decimal places.
 * Safe for undefined, null, NaN, strings, and huge values.
 */
export const formatINR = (val) => {
  const num = safeNum(val, 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formats an integer / number with Indian grouping (e.g. 1,00,000).
 */
export const formatNumber = (val) => {
  const num = safeNum(val, 0);
  return num.toLocaleString('en-IN');
};

/**
 * Compact rupee formatter for SVG axis labels (e.g. 1.2Cr, 5.0L, 10k, 500).
 */
export const formatCompactRupees = (val) => {
  const num = safeNum(val, 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
};

/**
 * Normalizes raw API response to guarantee complete, safe structure:
 * - Missing objects/arrays become safe empty ones
 * - Non-finite numbers become 0
 * - String numbers are coerced to finite numbers
 */
export const normalizeStats = (raw) => {
  if (!raw || typeof raw !== 'object') {
    raw = {};
  }

  // Tolerates both a flat response body ({ range, totals, ... }) and an envelope ({ data: { range, totals, ... } })
  const root = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw;

  const rawTotals = root.totals && typeof root.totals === 'object' ? root.totals : {};
  const rawStatus = rawTotals.ordersByStatus && typeof rawTotals.ordersByStatus === 'object' ? rawTotals.ordersByStatus : {};
  const rawCash = root.cashToCollect && typeof root.cashToCollect === 'object' ? root.cashToCollect : {};

  const totals = {
    earnedRevenue: safeNum(rawTotals.earnedRevenue, 0),
    inProgressRevenue: safeNum(rawTotals.inProgressRevenue, 0),
    ordersCounted: Math.max(0, Math.round(safeNum(rawTotals.ordersCounted, 0))),
    ordersByStatus: {
      pending: Math.max(0, Math.round(safeNum(rawStatus.pending, 0))),
      shipped: Math.max(0, Math.round(safeNum(rawStatus.shipped, 0))),
      delivered: Math.max(0, Math.round(safeNum(rawStatus.delivered, 0))),
      cancelled: Math.max(0, Math.round(safeNum(rawStatus.cancelled, 0)))
    },
    unitsSold: Math.max(0, Math.round(safeNum(rawTotals.unitsSold, 0))),
    averageOrderValue: safeNum(rawTotals.averageOrderValue, 0)
  };

  const cashToCollect = {
    amount: safeNum(rawCash.amount, 0),
    parts: Math.max(0, Math.round(safeNum(rawCash.parts, 0)))
  };

  const dailySeries = Array.isArray(root.dailySeries)
    ? root.dailySeries.map((item) => ({
        date: typeof item?.date === 'string' ? item.date : '',
        revenue: safeNum(item?.revenue, 0),
        orders: Math.max(0, Math.round(safeNum(item?.orders, 0)))
      }))
    : [];

  const topProducts = Array.isArray(root.topProducts)
    ? root.topProducts.map((p) => ({
        productId: String(p?.productId || ''),
        name: String(p?.name || 'Product'),
        units: Math.max(0, Math.round(safeNum(p?.units, 0))),
        revenue: safeNum(p?.revenue, 0)
      }))
    : [];

  const lowStock = Array.isArray(root.lowStock)
    ? root.lowStock.map((p) => ({
        productId: String(p?.productId || ''),
        name: String(p?.name || 'Product'),
        stock: Math.max(0, Math.round(safeNum(p?.stock, 0)))
      }))
    : [];

  // Note: productStatusCounts is not displayed anywhere in SalesOverview UI, so dead normalization was removed.

  return {
    range: [7, 30, 90].includes(Number(root.range)) ? Number(root.range) : 30,
    totals,
    cashToCollect,
    dailySeries,
    topProducts,
    lowStock
  };
};

