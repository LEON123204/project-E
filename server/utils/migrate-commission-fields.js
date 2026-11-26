'use strict';
/**
 * server/utils/migrate-commission-fields.js
 *
 * Backfill commissionRate, commissionAmount, and deliveredAt on historical sub-orders.
 * - Idempotent, additive only.
 * - Uses { timestamps: false } to guarantee parent and sub-order updatedAt are preserved.
 * - Pre-checks Atlas cluster; prints host and db name only.
 */
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  require('../node_modules/dotenv').config({ path: path.join(__dirname, '../../.env') });
}

const uri = process.env.MONGODB_URI || '';
if (!uri || /localhost|127\.0\.0\.1/.test(uri)) {
  console.error('[STOP] Local fallback detected or missing URI');
  process.exit(1);
}

const mongoose = require('../node_modules/mongoose');
const Order = require('../models/Order');
const PlatformSettings = require('../models/PlatformSettings');
const { computeCommission } = require('./commission');

async function runBackfill(isDryRun = false) {
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;

  if (!host || /localhost|127/.test(host)) {
    console.error('[STOP] Local host detected');
    process.exit(1);
  }

  // Get current platform commission rate
  const settings = await PlatformSettings.getSettings();
  const currentRate = settings.commissionRatePercent;

  // Find all orders
  const orders = await Order.find({}).lean();

  let subOrdersNeedingCommission = 0;
  let subOrdersNeedingDeliveredAt = 0;
  let ordersToUpdateCount = 0;

  const ordersToUpdate = [];

  for (const order of orders) {
    if (!order.subOrders || order.subOrders.length === 0) continue;

    let orderModified = false;
    const updatedSubOrders = order.subOrders.map(sub => {
      const copy = { ...sub };

      // 1. Commission check: missing or null
      if (copy.commissionRate === null || copy.commissionRate === undefined) {
        subOrdersNeedingCommission++;
        orderModified = true;
        if (copy.sellerId !== null && copy.sellerId !== undefined) {
          copy.commissionRate = currentRate;
          copy.commissionAmount = computeCommission(copy.subtotal || 0, currentRate).commissionAmount;
        } else {
          copy.commissionRate = 0;
          copy.commissionAmount = 0;
        }
      }

      // 2. deliveredAt check: status delivered and missing/null deliveredAt
      if (copy.status === 'delivered' && (copy.deliveredAt === null || copy.deliveredAt === undefined)) {
        subOrdersNeedingDeliveredAt++;
        orderModified = true;
        copy.deliveredAt = copy.updatedAt || order.updatedAt || new Date();
      }

      return copy;
    });

    if (orderModified) {
      ordersToUpdateCount++;
      ordersToUpdate.push({
        orderId: order._id,
        originalUpdatedAt: order.updatedAt,
        originalSubOrders: order.subOrders,
        updatedSubOrders
      });
    }
  }

  return {
    currentRate,
    ordersCount: orders.length,
    subOrdersNeedingCommission,
    subOrdersNeedingDeliveredAt,
    ordersToUpdateCount,
    ordersToUpdate
  };
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;
  console.log('[REAL] CLUSTER_HOST: ' + host);
  console.log('[REAL] DB_NAME: ' + dbName);

  // 1. Scan before migration
  const scan1 = await runBackfill(true);
  console.log('\n--- Pre-migration Scan ---');
  console.log(`[REAL] Current platform commission rate: ${scan1.currentRate}%`);
  console.log(`[REAL] Total orders scanned: ${scan1.ordersCount}`);
  console.log(`[REAL] Sub-orders needing commission backfill: ${scan1.subOrdersNeedingCommission}`);
  console.log(`[REAL] Delivered sub-orders needing deliveredAt backfill: ${scan1.subOrdersNeedingDeliveredAt}`);
  console.log(`[REAL] Orders needing updates: ${scan1.ordersToUpdateCount}`);

  // Sample 3 sub-orders before writing
  const samples = [];
  for (const item of scan1.ordersToUpdate) {
    for (let i = 0; i < item.originalSubOrders.length; i++) {
      const orig = item.originalSubOrders[i];
      const updated = item.updatedSubOrders[i];
      if (
        (orig.commissionRate === null || orig.commissionRate === undefined) ||
        (orig.status === 'delivered' && (orig.deliveredAt === null || orig.deliveredAt === undefined))
      ) {
        samples.push({
          orderId: item.orderId,
          subOrderId: orig._id,
          orderUpdatedAtBefore: item.originalUpdatedAt,
          subOrderBefore: {
            sellerId: orig.sellerId,
            subtotal: orig.subtotal,
            status: orig.status,
            commissionRate: orig.commissionRate,
            commissionAmount: orig.commissionAmount,
            deliveredAt: orig.deliveredAt
          },
          subOrderAfterTarget: {
            sellerId: updated.sellerId,
            subtotal: updated.subtotal,
            status: updated.status,
            commissionRate: updated.commissionRate,
            commissionAmount: updated.commissionAmount,
            deliveredAt: updated.deliveredAt
          }
        });
        if (samples.length >= 3) break;
      }
    }
    if (samples.length >= 3) break;
  }

  console.log('\n--- 3 Sample Sub-Orders (BEFORE WRITE) ---');
  samples.forEach((s, idx) => {
    console.log(`[REAL] Sample ${idx + 1}: OrderID=${s.orderId} SubOrderID=${s.subOrderId}`);
    console.log(`       Parent order.updatedAt BEFORE: ${s.orderUpdatedAtBefore.toISOString()}`);
    console.log(`       SubOrder fields BEFORE:`, JSON.stringify(s.subOrderBefore));
  });

  // 2. Perform Migration Writes using updateOne with { timestamps: false }
  let writtenCount = 0;
  for (const item of scan1.ordersToUpdate) {
    await Order.updateOne(
      { _id: item.orderId },
      { $set: { subOrders: item.updatedSubOrders } },
      { timestamps: false }
    );
    writtenCount++;
  }
  console.log(`\n[REAL] Successfully updated ${writtenCount} orders.`);

  // 3. Verify sample sub-orders after write & verify parent updatedAt was NOT changed
  console.log('\n--- 3 Sample Sub-Orders (AFTER WRITE) & Parent updatedAt Check ---');
  for (let idx = 0; idx < samples.length; idx++) {
    const s = samples[idx];
    const freshOrder = await Order.findById(s.orderId).lean();
    const freshSub = (freshOrder.subOrders || []).find(sub => sub._id.toString() === s.subOrderId.toString());
    const orderUpdatedAtAfter = freshOrder.updatedAt;

    console.log(`[REAL] Sample ${idx + 1}: OrderID=${s.orderId} SubOrderID=${s.subOrderId}`);
    console.log(`       Parent order.updatedAt AFTER: ${orderUpdatedAtAfter.toISOString()}`);
    const timeMatch = s.orderUpdatedAtBefore.getTime() === orderUpdatedAtAfter.getTime();
    console.log(`       Parent order.updatedAt UNCHANGED: ${timeMatch} (Before: ${s.orderUpdatedAtBefore.getTime()} === After: ${orderUpdatedAtAfter.getTime()})`);
    console.log(`       SubOrder fields AFTER:`, JSON.stringify({
      sellerId: freshSub.sellerId,
      subtotal: freshSub.subtotal,
      status: freshSub.status,
      commissionRate: freshSub.commissionRate,
      commissionAmount: freshSub.commissionAmount,
      deliveredAt: freshSub.deliveredAt
    }));
  }

  // 4. Second run: Idempotence Verification (must modify 0)
  console.log('\n--- Second Run (Idempotency Check) ---');
  const scan2 = await runBackfill(true);
  console.log(`[REAL] Sub-orders needing commission backfill on second run: ${scan2.subOrdersNeedingCommission}`);
  console.log(`[REAL] Delivered sub-orders needing deliveredAt on second run: ${scan2.subOrdersNeedingDeliveredAt}`);
  console.log(`[REAL] Orders needing updates on second run: ${scan2.ordersToUpdateCount}`);
  if (scan2.ordersToUpdateCount === 0) {
    console.log('[REAL] IDEMPOTENCY CONFIRMED: Second run modifies 0 orders.');
  } else {
    console.error('[FAIL] Second run found orders needing update!');
  }

  // 5. Final counts
  const totalOrders = await Order.countDocuments();
  console.log(`\n--- Final Counts ---`);
  console.log(`[REAL] Total Orders: ${totalOrders}`);
  console.log(`[REAL] Remaining sub-orders missing commissionRate: ${scan2.subOrdersNeedingCommission}`);
  console.log(`[REAL] Remaining delivered sub-orders missing deliveredAt: ${scan2.subOrdersNeedingDeliveredAt}`);

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => {
    console.error('[STOP] Migration error:', err.message);
    process.exit(1);
  });
}

module.exports = { runBackfill };
