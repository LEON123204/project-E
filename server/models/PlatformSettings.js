'use strict';
const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema(
  {
    from: { type: Number, required: true },
    to:   { type: Number, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: 'platform',
    },
    commissionRatePercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 50,
    },
    history: {
      type: [historyEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

/**
 * Returns (and lazily creates) the singleton settings document.
 * Uses an atomic upsert so concurrent calls are safe.
 */
platformSettingsSchema.statics.getSettings = async function () {
  const doc = await this.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { key: 'platform', commissionRatePercent: 10 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
module.exports = PlatformSettings;
