'use strict';
const PlatformSettings = require('../models/PlatformSettings');
const { validateRatePercent } = require('../utils/commission');

/**
 * GET /api/v1/admin/settings/commission
 * Admin only. Returns current rate and last 20 history entries (name only, no email/id).
 */
async function getCommissionSettings(req, res, next) {
  try {
    const doc = await PlatformSettings.getSettings();
    await doc.populate('history.changedBy', 'name');
    const history = doc.history
      .slice(-20)
      .reverse()
      .map((h) => ({
        from: h.from,
        to: h.to,
        changedBy: h.changedBy ? h.changedBy.name : 'Unknown',
        changedAt: h.changedAt,
      }));
    return res.json({
      success: true,
      ratePercent: doc.commissionRatePercent,
      updatedAt: doc.updatedAt,
      history,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/settings/commission
 * Admin only. Body: { ratePercent: number }
 * Validates, updates, appends history (capped at 50).
 */
async function updateCommissionSettings(req, res, next) {
  try {
    const { ratePercent } = req.body || {};
    if (ratePercent === undefined || ratePercent === null) {
      return res.status(400).json({
        success: false,
        message: 'ratePercent is required',
      });
    }

    try {
      validateRatePercent(ratePercent);
    } catch (msg) {
      return res.status(400).json({ success: false, message: msg });
    }

    // Fetch current doc (lazy-create if first time)
    const current = await PlatformSettings.getSettings();
    const currentRate = current.commissionRatePercent;

    let doc;
    if (ratePercent === currentRate) {
      // No change — return current state without touching history
      await current.populate('history.changedBy', 'name');
      doc = current;
    } else {
      // Atomic update with capped history push
      doc = await PlatformSettings.findOneAndUpdate(
        { key: 'platform' },
        {
          $set: { commissionRatePercent: ratePercent },
          $push: {
            history: {
              $each: [
                {
                  from: currentRate,
                  to: ratePercent,
                  changedBy: req.user._id,
                  changedAt: new Date(),
                },
              ],
              $slice: -50,
            },
          },
        },
        { new: true }
      ).populate('history.changedBy', 'name');
    }

    const history = doc.history
      .slice(-20)
      .reverse()
      .map((h) => ({
        from: h.from,
        to: h.to,
        changedBy: h.changedBy ? h.changedBy.name : 'Unknown',
        changedAt: h.changedAt,
      }));

    return res.json({
      success: true,
      ratePercent: doc.commissionRatePercent,
      updatedAt: doc.updatedAt,
      history,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/seller/commission-rate
 * Seller only. Returns only { success, ratePercent }.
 */
async function getSellerCommissionRate(req, res, next) {
  try {
    const doc = await PlatformSettings.getSettings();
    return res.json({ success: true, ratePercent: doc.commissionRatePercent });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCommissionSettings, updateCommissionSettings, getSellerCommissionRate };
