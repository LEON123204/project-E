'use strict';

const mongoose = require('mongoose');

const partLineSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    subOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    grossPaise: {
      type: Number,
      required: true
    },
    commissionRate: {
      type: Number,
      required: true
    },
    commissionPaise: {
      type: Number,
      required: true
    },
    earningsPaise: {
      type: Number,
      required: true
    },
    codCashHeldPaise: {
      type: Number,
      required: true,
      default: 0
    },
    netPaise: {
      type: Number,
      required: true
    },
    gross: {
      type: Number,
      required: true
    },
    commission: {
      type: Number,
      required: true
    },
    earnings: {
      type: Number,
      required: true
    },
    codCashHeld: {
      type: Number,
      required: true,
      default: 0
    },
    net: {
      type: Number,
      required: true
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    collectedAt: {
      type: Date,
      default: null
    },
    settledAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    parts: {
      type: Number,
      required: true,
      default: 0
    },
    gross: {
      type: Number,
      required: true,
      default: 0
    },
    commission: {
      type: Number,
      required: true,
      default: 0
    },
    earnings: {
      type: Number,
      required: true,
      default: 0
    },
    codCashHeld: {
      type: Number,
      required: true,
      default: 0
    },
    net: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { _id: false }
);

const commissionStatementSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    month: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['closed', 'settled'],
      default: 'closed'
    },
    totals: {
      type: totalsSchema,
      required: true
    },
    lines: {
      type: [partLineSchema],
      default: []
    },
    linesTruncated: {
      type: Boolean,
      default: false
    },
    closedAt: {
      type: Date,
      default: Date.now
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    settledAt: {
      type: Date,
      default: null
    },
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    settlementNote: {
      type: String,
      maxlength: 200,
      default: null
    }
  },
  { timestamps: true }
);

commissionStatementSchema.index({ sellerId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('CommissionStatement', commissionStatementSchema);
