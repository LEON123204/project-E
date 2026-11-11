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

    // Query for orders that have no subOrders:
    // Either subOrders does not exist, is null, or is an empty array
    const query = {
      $or: [
        { subOrders: { $exists: false } },
        { subOrders: null },
        { subOrders: { $size: 0 } }
      ]
    };

    const ordersToMigrate = await Order.find(query);
    const totalOrders = await Order.countDocuments({});
    const ordersMatched = ordersToMigrate.length;
    let ordersModified = 0;
    const ordersSkipped = totalOrders - ordersMatched;

    console.log(`--- Migration Scan ---`);
    console.log(`Total orders in DB: ${totalOrders}`);
    console.log(`Orders matched: ${ordersMatched}`);
    console.log(`Orders skipped: ${ordersSkipped}`);

    if (ordersMatched > 0) {
      console.log(`\nMigrating ${ordersMatched} order(s)...`);
      for (const order of ordersToMigrate) {
        // Calculate subtotal from items
        const itemsTotal = (order.items || []).reduce(
          (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
          0
        );

        // Copy COD collected fields
        const isCodPaid = order.paymentMethod === 'cod' && order.paymentStatus === 'paid';
        const codCollected = order.codCollected !== undefined ? Boolean(order.codCollected) : isCodPaid;
        const collectedBy = order.collectedBy || null;
        const collectedAt = order.collectedAt || (isCodPaid ? (order.updatedAt || new Date()) : null);

        // Format items with optional sellerId: null
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

