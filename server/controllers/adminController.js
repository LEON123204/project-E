const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get dashboard metrics & chart data (Admin only)
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Core KPIs
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'customer' });
    
    // Revenue sum of paid orders
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Low stock items threshold: stock <= 5
    const lowStockProducts = await Product.find({ stock: { $lte: 5 } })
      .populate('category', 'name')
      .select('name stock price');

    // 2. Daily revenue chart data (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format daily revenue to include days with zero revenue
    const formattedDaily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = dailyRevenue.find(item => item._id === dateStr);
      formattedDaily.push({
        date: dateStr,
        revenue: match ? match.revenue : 0,
        orders: match ? match.count : 0
      });
    }

    // 3. Sales by Category chart data
    const categorySales = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          value: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $project: {
          name: '$_id',
          value: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalCustomers: totalUsers,
        totalRevenue,
        lowStockAlerts: lowStockProducts.length,
        lowStockProducts
      },
      charts: {
        dailyRevenue: formattedDaily,
        categorySales
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer accounts list (Admin only)
// @route   GET /api/v1/admin/customers
// @access  Private/Admin
const getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      customers
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getCustomers
};
