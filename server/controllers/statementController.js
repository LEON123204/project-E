'use strict';

const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const CommissionStatement = require('../models/CommissionStatement');
const {
  istMonthKey,
  istMonthBounds,
  isMonthClosable,
  partSettleableAt,
  partLine,
  computeStatement
} = require('../utils/statements');

/**
 * Helper to compute live settled lines and totals for a given seller and month.
 */
async function computeSellerLiveMonth(sellerId, monthKey) {
  const bounds = istMonthBounds(monthKey);
  
  // Find all orders that have subOrders for this seller
  const orders = await Order.find({
    'subOrders.sellerId': sellerId
  }).select('paymentMethod paymentStatus createdAt subOrders').lean();

  const lines = [];

  for (const order of orders) {
    for (const sub of (order.subOrders || [])) {
      if (!sub.sellerId || String(sub.sellerId) !== String(sellerId)) continue;
      const settledAt = partSettleableAt(order, sub);
      if (!settledAt) continue;

      if (settledAt.getTime() >= bounds.start.getTime() && settledAt.getTime() < bounds.end.getTime()) {
        lines.push(partLine(order, sub));
      }
    }
  }

  // Sort lines by settledAt ascending
  lines.sort((a, b) => new Date(a.settledAt).getTime() - new Date(b.settledAt).getTime());

  const totals = computeStatement(lines);

  return { lines, totals };
}

/**
 * GET /api/v1/seller/earnings/months
 * Returns list of months relevant to the seller, plus whether they are closed.
 */
async function getSellerMonths(req, res, next) {
  try {
    const sellerId = req.user._id;

    // Collect all settleable dates from orders
    const orders = await Order.find({
      'subOrders.sellerId': sellerId
    }).select('paymentMethod paymentStatus createdAt subOrders').lean();

    const monthSet = new Set();
    const nowKey = istMonthKey(new Date());
    monthSet.add(nowKey);

    for (const order of orders) {
      for (const sub of (order.subOrders || [])) {
        if (!sub.sellerId || String(sub.sellerId) !== String(sellerId)) continue;
        const settledAt = partSettleableAt(order, sub);
        if (settledAt) {
          monthSet.add(istMonthKey(settledAt));
        }
      }
    }

    // Also include months where closed statements exist
    const statements = await CommissionStatement.find({ sellerId }).select('month status totals').lean();
    for (const s of statements) {
      monthSet.add(s.month);
    }

    const statementMap = new Map();
    for (const s of statements) {
      statementMap.set(s.month, s);
    }

    const months = Array.from(monthSet).sort().reverse().map(month => {
      const stmt = statementMap.get(month);
      return {
        month,
        isClosed: Boolean(stmt),
        status: stmt ? stmt.status : 'open',
        totals: stmt ? stmt.totals : null
      };
    });

    res.status(200).json({
      success: true,
      months
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/seller/earnings?month=YYYY-MM
 */
async function getSellerEarnings(req, res, next) {
  try {
    const sellerId = req.user._id;
    const monthKey = req.query.month || istMonthKey(new Date());

    try {
      istMonthBounds(monthKey);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    // Check if a closed statement exists
    const stmt = await CommissionStatement.findOne({ sellerId, month: monthKey }).lean();

    if (stmt) {
      return res.status(200).json({
        success: true,
        month: monthKey,
        isClosed: true,
        statementId: stmt._id,
        status: stmt.status,
        totals: stmt.totals,
        lines: stmt.lines,
        linesTruncated: Boolean(stmt.linesTruncated),
        closedAt: stmt.closedAt,
        settledAt: stmt.settledAt,
        settlementNote: stmt.settlementNote
      });
    }

    // Otherwise compute live
    const { lines, totals } = await computeSellerLiveMonth(sellerId, monthKey);

    res.status(200).json({
      success: true,
      month: monthKey,
      isClosed: false,
      statementId: null,
      status: 'open',
      totals,
      lines,
      linesTruncated: false,
      closedAt: null,
      settledAt: null,
      settlementNote: null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/commissions/months
 */
async function getAdminMonths(req, res, next) {
  try {
    // Collect all settleable dates across all orders
    const orders = await Order.find({}).select('paymentMethod paymentStatus createdAt subOrders').lean();

    const monthSet = new Set();
    const nowKey = istMonthKey(new Date());
    monthSet.add(nowKey);

    for (const order of orders) {
      if (order.createdAt) {
        monthSet.add(istMonthKey(order.createdAt));
      }
      for (const sub of (order.subOrders || [])) {
        const settledAt = partSettleableAt(order, sub);
        if (settledAt) {
          monthSet.add(istMonthKey(settledAt));
        }
      }
    }

    const statements = await CommissionStatement.find({}).select('month status').lean();
    for (const s of statements) {
      monthSet.add(s.month);
    }

    // Check closed status per month (all sellers statements closed)
    const closedMonths = new Set(statements.map(s => s.month));

    const months = Array.from(monthSet).sort().reverse().map(month => {
      const isPast = isMonthClosable(month);
      const isClosed = closedMonths.has(month);
      return {
        month,
        isClosable: isPast,
        isClosed
      };
    });

    res.status(200).json({
      success: true,
      months
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/commissions?month=YYYY-MM
 */
async function getAdminCommissions(req, res, next) {
  try {
    const monthKey = req.query.month || istMonthKey(new Date());

    try {
      istMonthBounds(monthKey);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const bounds = istMonthBounds(monthKey);

    // Get all sellers
    const sellers = await User.find({ role: 'seller' }).select('_id name businessName storeName').lean();

    // Check existing closed statements for this month
    const existingStmts = await CommissionStatement.find({ month: monthKey }).lean();
    const stmtMap = new Map();
    for (const s of existingStmts) {
      stmtMap.set(String(s.sellerId), s);
    }

    const sellerSummaries = [];
    let platformGrossPaise = 0;
    let platformCommissionPaise = 0;
    let platformEarningsPaise = 0;
    let platformCodCashHeldPaise = 0;
    let platformNetPaise = 0;
    let totalParts = 0;

    for (const seller of sellers) {
      const sellerIdStr = String(seller._id);
      const existing = stmtMap.get(sellerIdStr);

      let totals;
      let status;
      let statementId;
      let settledAt = null;
      let settlementNote = null;

      if (existing) {
        totals = existing.totals;
        status = existing.status;
        statementId = existing._id;
        settledAt = existing.settledAt;
        settlementNote = existing.settlementNote;
      } else {
        const live = await computeSellerLiveMonth(seller._id, monthKey);
        totals = live.totals;
        status = 'open';
        statementId = null;
      }

      totalParts += totals.parts;
      platformGrossPaise += Math.round(totals.gross * 100);
      platformCommissionPaise += Math.round(totals.commission * 100);
      platformEarningsPaise += Math.round(totals.earnings * 100);
      platformCodCashHeldPaise += Math.round(totals.codCashHeld * 100);
      platformNetPaise += Math.round(totals.net * 100);

      sellerSummaries.push({
        sellerId: seller._id,
        sellerName: seller.businessName || seller.storeName || seller.name || 'Seller',
        statementId,
        status,
        isClosed: Boolean(existing),
        totals,
        settledAt,
        settlementNote
      });
    }

    // Cartex direct (sellerId == null) in this month
    // Uses order.createdAt within the month bounds
    const directOrders = await Order.find({
      createdAt: { $gte: bounds.start, $lt: bounds.end },
      'subOrders.sellerId': null
    }).select('subOrders').lean();

    let cartexDirectPaise = 0;
    let cartexDirectParts = 0;
    for (const o of directOrders) {
      for (const sub of (o.subOrders || [])) {
        if (!sub.sellerId) {
          cartexDirectParts += 1;
          cartexDirectPaise += Math.round((sub.subtotal || 0) * 100);
        }
      }
    }

    const platformTotals = {
      parts: totalParts,
      gross: platformGrossPaise / 100,
      commission: platformCommissionPaise / 100,
      earnings: platformEarningsPaise / 100,
      codCashHeld: platformCodCashHeldPaise / 100,
      net: platformNetPaise / 100
    };

    const cartexDirect = {
      parts: cartexDirectParts,
      gross: cartexDirectPaise / 100
    };

    res.status(200).json({
      success: true,
      month: monthKey,
      isClosable: isMonthClosable(monthKey),
      isClosed: existingStmts.length > 0,
      platformTotals,
      cartexDirect,
      sellers: sellerSummaries
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/commissions/:month/close
 * Closes the given month by taking a snapshot for every seller that has activity.
 */
async function closeAdminMonth(req, res, next) {
  try {
    const monthKey = req.params.month;

    try {
      istMonthBounds(monthKey);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    if (!isMonthClosable(monthKey)) {
      return res.status(400).json({
        success: false,
        message: `Cannot close month ${monthKey}: month is not yet complete in IST`
      });
    }

    // Find all sellers
    const sellers = await User.find({ role: 'seller' }).select('_id').lean();

    let createdCount = 0;
    const statements = [];

    for (const seller of sellers) {
      // Check if already closed
      const existing = await CommissionStatement.findOne({ sellerId: seller._id, month: monthKey });
      if (existing) {
        statements.push(existing);
        continue;
      }

      const { lines, totals } = await computeSellerLiveMonth(seller._id, monthKey);

      // Truncate lines at 500 if larger
      let linesToStore = lines;
      let linesTruncated = false;
      if (lines.length > 500) {
        linesToStore = lines.slice(0, 500);
        linesTruncated = true;
      }

      try {
        const stmt = await CommissionStatement.create({
          sellerId: seller._id,
          month: monthKey,
          status: 'closed',
          totals,
          lines: linesToStore,
          linesTruncated,
          closedAt: new Date(),
          closedBy: req.user._id
        });
        createdCount += 1;
        statements.push(stmt);
      } catch (err) {
        // Handle duplicate key error gracefully if concurrent requests close the month
        if (err.code === 11000) {
          const loaded = await CommissionStatement.findOne({ sellerId: seller._id, month: monthKey });
          statements.push(loaded);
        } else {
          throw err;
        }
      }
    }

    res.status(200).json({
      success: true,
      month: monthKey,
      createdCount,
      totalStatements: statements.length,
      statements
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/commissions/statements/:statementId/settle
 * Settles a closed statement.
 */
async function settleStatement(req, res, next) {
  try {
    const { statementId } = req.params;
    let { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(statementId)) {
      return res.status(404).json({ success: false, message: 'Statement not found' });
    }

    const stmt = await CommissionStatement.findById(statementId);
    if (!stmt) {
      return res.status(404).json({ success: false, message: 'Statement not found' });
    }

    if (stmt.status === 'settled') {
      return res.status(409).json({ success: false, message: 'Statement is already settled' });
    }

    // Sanitize note
    let sanitizedNote = null;
    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        note = String(note);
      }
      // Remove HTML tags / scripts
      let clean = note.replace(/<[^>]*>/g, '');
      // Remove control characters (except common whitespace)
      clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      clean = clean.trim();
      if (clean.length > 200) {
        return res.status(400).json({ success: false, message: 'Settlement note cannot exceed 200 characters' });
      }
      sanitizedNote = clean || null;
    }

    stmt.status = 'settled';
    stmt.settledAt = new Date();
    stmt.settledBy = req.user._id;
    stmt.settlementNote = sanitizedNote;

    await stmt.save();

    res.status(200).json({
      success: true,
      statement: stmt
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSellerMonths,
  getSellerEarnings,
  getAdminMonths,
  getAdminCommissions,
  closeAdminMonth,
  settleStatement
};
