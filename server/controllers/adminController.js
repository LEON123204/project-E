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

    // Low stock items threshold: stock <= 5 (only live approved products)
    const lowStockProducts = await Product.find({ stock: { $lte: 5 }, status: { $in: ['approved', null] } })
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

    // Pending seller applications count for dashboard badge
    const pendingSellerApplications = await User.countDocuments({ sellerApplicationStatus: 'pending' });

    res.json({
      success: true,
      pendingSellerApplications,
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

// @desc    Get all pending seller applications (Admin only)
// @route   GET /api/v1/admin/seller-applications
// @access  Private/Admin
const getPendingSellerApplications = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query; // allow ?status=approved|rejected|all|pending
    const validStatuses = ['pending', 'approved', 'rejected'];

    let query;
    if (status === 'all') {
      query = { sellerApplicationStatus: { $in: validStatuses } };
    } else if (validStatuses.includes(status)) {
      query = { sellerApplicationStatus: status };
    } else {
      query = { sellerApplicationStatus: 'pending' };
    }

    const applications = await User.find(query)
      .select('-password -refreshToken -addresses')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a seller application (Admin only)
// @route   PUT /api/v1/admin/seller-applications/:userId/approve
// @access  Private/Admin
const approveSellerApplication = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.sellerApplicationStatus !== 'pending') {
      res.status(400);
      throw new Error(`Cannot approve — application status is "${user.sellerApplicationStatus}", not "pending"`);
    }

    if (user.role !== 'customer') {
      res.status(400);
      throw new Error(`Cannot approve — only customer accounts can be promoted to seller (current role is "${user.role}")`);
    }

    user.sellerApplicationStatus = 'approved';
    user.role = 'seller';
    await user.save();

    res.json({
      success: true,
      message: `${user.name}'s seller application approved. Role updated to seller.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerApplicationStatus: user.sellerApplicationStatus,
        businessName: user.businessName
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a seller application (Admin only)
// @route   PUT /api/v1/admin/seller-applications/:userId/reject
// @access  Private/Admin
const rejectSellerApplication = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.sellerApplicationStatus !== 'pending') {
      res.status(400);
      throw new Error(`Cannot reject — application status is "${user.sellerApplicationStatus}", not "pending"`);
    }

    // Rejection: status → rejected, role stays customer.
    // No cooldown: user may re-apply immediately after rejection.
    user.sellerApplicationStatus = 'rejected';
    // role intentionally left as-is (customer)
    await user.save();

    res.json({
      success: true,
      message: `${user.name}'s seller application rejected. User may re-apply.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerApplicationStatus: user.sellerApplicationStatus,
        businessName: user.businessName
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getCustomers,
  getPendingSellerApplications,
  approveSellerApplication,
  rejectSellerApplication
};
