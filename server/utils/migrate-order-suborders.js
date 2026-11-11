const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const Order = require('../models/Order');

const maskMongoUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

const runMigration = async () => {
  try {
    const rawUri = process.env.MONGODB_URI;
    console.log(`Target Database: ${maskMongoUri(rawUri)}`);

    await mongoose.connect(rawUri);
    console.log('MongoDB connected for sub-orders migration.\n');

    const totalOrders = await Order.countDocuments({});

    // 1. Orders missing subOrders entirely (or empty array)
    const ordersWithoutSubOrders = await Order.find({
      $or: [
        { subOrders: { $exists: false } },
        { subOrders: null },
        { subOrders: { $size: 0 } }
      ]
    });

    // 2. Orders with exactly 1 subOrder whose amountDue is missing, null, or <= 0 (when totalAmount > 0)
    const ordersNeedingAmountDue = await Order.find({
      subOrders: { $size: 1 },
      totalAmount: { $gt: 0 },
      $or: [
        { 'subOrders.0.amountDue': { $exists: false } },
        { 'subOrders.0.amountDue': { $lte: 0 } }
      ]
    });

    const ordersMatched = ordersWithoutSubOrders.length + ordersNeedingAmountDue.length;
    let ordersModified = 0;
    const ordersSkipped = totalOrders - ordersMatched;

    console.log(`--- Migration Scan ---`);
    console.log(`Total orders in DB: ${totalOrders}`);
    console.log(`Orders missing subOrders: ${ordersWithoutSubOrders.length}`);
    console.log(`Orders needing amountDue backfill: ${ordersNeedingAmountDue.length}`);
    console.log(`Orders matched: ${ordersMatched}`);
    console.log(`Orders skipped: ${ordersSkipped}`);

    // Backfill missing subOrders
    if (ordersWithoutSubOrders.length > 0) {
      console.log(`\nCreating subOrders for ${ordersWithoutSubOrders.length} order(s)...`);
      for (const order of ordersWithoutSubOrders) {
        const itemsTotal = (order.items || []).reduce(
          (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
          0
        );

        const isCodPaid = order.paymentMethod === 'cod' && order.paymentStatus === 'paid';
        const codCollected = order.codCollected !== undefined ? Boolean(order.codCollected) : isCodPaid;
        const collectedBy = order.collectedBy || null;
        const collectedAt = order.collectedAt || (isCodPaid ? (order.updatedAt || new Date()) : null);

        const subOrderItems = (order.items || []).map(item => ({
          product: item.product,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sellerId: item.sellerId || null
        }));

        const singleSubOrder = {
          sellerId: null, // sold by Cartex
          items: subOrderItems,
          subtotal: itemsTotal,
          amountDue: order.totalAmount !== undefined ? order.totalAmount : itemsTotal,
          status: order.orderStatus || 'pending',
          codCollected,
          collectedBy,
          collectedAt
        };

        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              subOrders: [singleSubOrder],
              items: subOrderItems
            }
          }
        );

        ordersModified++;
      }
    }

    // Backfill amountDue for existing single subOrders
    if (ordersNeedingAmountDue.length > 0) {
      console.log(`\nBackfilling amountDue for ${ordersNeedingAmountDue.length} order(s)...`);
      for (const order of ordersNeedingAmountDue) {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              'subOrders.0.amountDue': order.totalAmount
            }
          }
        );

        ordersModified++;
      }
    }

    console.log(`\n--- Migration Summary ---`);
    console.log(`Orders matched: ${ordersMatched}`);
    console.log(`Orders modified: ${ordersModified}`);
    console.log(`Orders skipped: ${ordersSkipped}`);

    await mongoose.disconnect();
    console.log('\nMigration finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

runMigration();
