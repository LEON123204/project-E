const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const connectDB = require('../config/db');
const Product = require('../models/Product');

const runMigration = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected for migration.');

    // Count products before migration
    const totalProducts = await Product.countDocuments({});
    const missingStatusCount = await Product.countDocuments({
      $or: [
        { status: { $exists: false } },
        { status: null }
      ]
    });

    console.log(`Total products: ${totalProducts}`);
    console.log(`Products missing status (or null): ${missingStatusCount}`);

    // Update all products where status is missing or null
    const result = await Product.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { status: null }
        ]
      },
      {
        $set: { status: 'approved' }
      }
    );

    console.log(`Migration result: matched ${result.matchedCount}, modified ${result.modifiedCount}`);

    const approvedCount = await Product.countDocuments({ status: 'approved' });
    const pendingCount = await Product.countDocuments({ status: 'pending_review' });
    const rejectedCount = await Product.countDocuments({ status: 'rejected' });
    const stillMissing = await Product.countDocuments({
      $or: [
        { status: { $exists: false } },
        { status: null }
      ]
    });

    console.log(`After migration:`);
    console.log(`  - Approved: ${approvedCount}`);
    console.log(`  - Pending Review: ${pendingCount}`);
    console.log(`  - Rejected: ${rejectedCount}`);
    console.log(`  - Missing/Null: ${stillMissing}`);

    await mongoose.disconnect();
    console.log('Migration finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
