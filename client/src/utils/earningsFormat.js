/**
 * Utility functions for earnings, commissions, currency, and IST date formatting.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a numeric amount in Indian Rupees (INR / en-IN) with 2 decimals.
 * Safe with null, undefined, strings, NaN.
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,799.10"
 */
export function formatRupees(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  const safeNum = isNaN(num) || !isFinite(num) ? 0 : num;
  const absFormatted = Math.abs(safeNum).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return safeNum < 0 ? `-₹${absFormatted}` : `₹${absFormatted}`;
}

/**
 * Formats a rate percentage with up to 2 decimal places.
 * @param {number|string} rate
 * @returns {string} e.g. "10%" or "12.5%"
 */
export function formatRate(rate) {
  const num = typeof rate === 'number' ? rate : parseFloat(rate);
  const safeNum = isNaN(num) || !isFinite(num) ? 0 : num;
  return `${Number(safeNum.toFixed(2))}%`;
}

/**
 * Parses 'YYYY-MM' manually and returns "Month YYYY".
 * Does NOT construct Date with bare string to prevent timezone offsets.
 * @param {string} monthKey
 * @returns {string} e.g. "November 2026"
 */
export function monthLabel(monthKey) {
  if (typeof monthKey !== 'string') return '';
  const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return monthKey;
  const year = match[1];
  const monthIndex = parseInt(match[2], 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/**
 * Formats an ISO string or timestamp into IST (Asia/Kolkata) date/time.
 * @param {string|number|Date} dateVal
 * @param {object} [options]
 * @returns {string}
 */
export function formatIstDate(dateVal, options = {}) {
  if (!dateVal) return '—';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const defaultOpts = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  };

  return d.toLocaleDateString('en-IN', defaultOpts);
}

/**
 * Formats an ISO string or timestamp into IST date and time.
 * @param {string|number|Date} dateVal
 * @returns {string} e.g. "15 Nov 2026, 11:31 am"
 */
export function formatIstDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Computes plain-language net amount label according to perspective.
 * perspective: 'seller' | 'admin'
 * @param {number|string} net
 * @param {'seller'|'admin'} perspective
 * @returns {{ text: string, direction: 'payable'|'receivable'|'neutral', amountText: string }}
 */
export function netLabel(net, perspective = 'seller') {
  const num = typeof net === 'number' ? net : parseFloat(net);
  const safeNet = isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100;
  const absStr = formatRupees(Math.abs(safeNet));

  if (Math.abs(safeNet) === 0) {
    return {
      text: 'Nothing due',
      direction: 'neutral',
      amountText: '₹0.00'
    };
  }

  if (perspective === 'seller') {
    if (safeNet > 0) {
      return {
        text: `Cartex pays you ${absStr}`,
        direction: 'payable',
        amountText: absStr
      };
    } else {
      return {
        text: `You owe Cartex ${absStr}`,
        direction: 'receivable',
        amountText: absStr
      };
    }
  } else {
    // Admin perspective
    if (safeNet > 0) {
      return {
        text: `Payable to seller (${absStr})`,
        direction: 'payable',
        amountText: absStr
      };
    } else {
      return {
        text: `Receivable from seller (${absStr})`,
        direction: 'receivable',
        amountText: absStr
      };
    }
  }
}

/**
 * Checks whether a given monthKey ('YYYY-MM') has fully finished in IST.
 * IST offset is +05:30 (19,800,000 ms).
 * Month end is 1st of next month 00:00:00 IST.
 * @param {string} monthKey
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isMonthEnded(monthKey, now = new Date()) {
  if (typeof monthKey !== 'string') return false;
  const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const endUtcMs = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0) - IST_OFFSET_MS;

  const nowDate = now instanceof Date ? now : new Date(now);
  return nowDate.getTime() >= endUtcMs;
}

/**
 * Normalizes seller earnings response with defensive defaults.
 * @param {object} raw
 * @returns {object}
 */
export function normalizeEarnings(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      month: '',
      isClosed: false,
      status: 'open',
      statementId: null,
      totals: { parts: 0, gross: 0, commission: 0, earnings: 0, codCashHeld: 0, net: 0 },
      lines: [],
      linesTruncated: false,
      closedAt: null,
      settledAt: null,
      settlementNote: null
    };
  }

  const rawTotals = raw.totals || {};
  const toNum = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  const totals = {
    parts: Math.max(0, Math.round(toNum(rawTotals.parts))),
    gross: toNum(rawTotals.gross),
    commission: toNum(rawTotals.commission),
    earnings: toNum(rawTotals.earnings),
    codCashHeld: toNum(rawTotals.codCashHeld),
    net: toNum(rawTotals.net)
  };

  const rawLines = Array.isArray(raw.lines) ? raw.lines : [];
  const lines = rawLines.map((l) => ({
    orderId: l?.orderId ? String(l.orderId) : '',
    subOrderId: l?.subOrderId ? String(l.subOrderId) : '',
    paymentMethod: l?.paymentMethod ? String(l.paymentMethod).toLowerCase() : 'online',
    gross: toNum(l?.gross),
    commissionRate: toNum(l?.commissionRate),
    commission: toNum(l?.commission),
    earnings: toNum(l?.earnings),
    codCashHeld: toNum(l?.codCashHeld),
    net: toNum(l?.net),
    deliveredAt: l?.deliveredAt || null,
    collectedAt: l?.collectedAt || null,
    settledAt: l?.settledAt || null
  }));

  return {
    month: typeof raw.month === 'string' ? raw.month : '',
    isClosed: Boolean(raw.isClosed),
    status: raw.status === 'settled' ? 'settled' : (raw.status === 'closed' ? 'closed' : 'open'),
    statementId: raw.statementId ? String(raw.statementId) : null,
    totals,
    lines,
    linesTruncated: Boolean(raw.linesTruncated),
    closedAt: raw.closedAt || null,
    settledAt: raw.settledAt || null,
    settlementNote: typeof raw.settlementNote === 'string' ? raw.settlementNote : null
  };
}

/**
 * Normalizes admin commissions response with defensive defaults.
 * @param {object} raw
 * @returns {object}
 */
export function normalizeAdminCommissions(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      month: '',
      isClosable: false,
      isClosed: false,
      platformTotals: { parts: 0, gross: 0, commission: 0, earnings: 0, codCashHeld: 0, net: 0 },
      cartexDirect: { parts: 0, gross: 0 },
      sellers: []
    };
  }

  const toNum = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  const rawPt = raw.platformTotals || {};
  const platformTotals = {
    parts: Math.max(0, Math.round(toNum(rawPt.parts))),
    gross: toNum(rawPt.gross),
    commission: toNum(rawPt.commission),
    earnings: toNum(rawPt.earnings),
    codCashHeld: toNum(rawPt.codCashHeld),
    net: toNum(rawPt.net)
  };

  const rawCd = raw.cartexDirect || {};
  const cartexDirect = {
    parts: Math.max(0, Math.round(toNum(rawCd.parts))),
    gross: toNum(rawCd.gross)
  };

  const rawSellers = Array.isArray(raw.sellers) ? raw.sellers : [];
  const sellers = rawSellers.map((s) => {
    const st = s?.totals || {};
    return {
      sellerId: s?.sellerId ? String(s.sellerId) : '',
      sellerName: s?.sellerName ? String(s.sellerName) : 'Seller',
      statementId: s?.statementId ? String(s.statementId) : null,
      status: s?.status === 'settled' ? 'settled' : (s?.status === 'closed' ? 'closed' : 'open'),
      isClosed: Boolean(s?.isClosed),
      totals: {
        parts: Math.max(0, Math.round(toNum(st.parts))),
        gross: toNum(st.gross),
        commission: toNum(st.commission),
        earnings: toNum(st.earnings),
        codCashHeld: toNum(st.codCashHeld),
        net: toNum(st.net)
      },
      settledAt: s?.settledAt || null,
      settlementNote: typeof s?.settlementNote === 'string' ? s.settlementNote : null
    };
  });

  return {
    month: typeof raw.month === 'string' ? raw.month : '',
    isClosable: Boolean(raw.isClosable),
    isClosed: Boolean(raw.isClosed),
    platformTotals,
    cartexDirect,
    sellers
  };
}
