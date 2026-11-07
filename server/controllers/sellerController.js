const User = require('../models/User');

// @desc    Submit application to become a seller
// @route   POST /api/v1/seller/apply
// @access  Private (Logged-in customers)
const applyForSeller = async (req, res, next) => {
  try {
    const { businessName, businessDescription, contactPhone } = req.body;

    // Validate required application fields
    if (!businessName || !businessName.trim()) {
      res.status(400);
      throw new Error('Business name is required');
    }
    if (!businessDescription || !businessDescription.trim()) {
      res.status(400);
      throw new Error('Business description is required');
    }
    if (!contactPhone || !contactPhone.trim()) {
      res.status(400);
      throw new Error('Contact phone is required');
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Only customers are eligible to apply for seller status (admins and existing sellers blocked)
    if (user.role !== 'customer') {
      res.status(403);
      throw new Error(`Only customer accounts can apply to become a seller (current role is "${user.role}")`);
    }

    if (user.sellerApplicationStatus === 'pending') {
      res.status(400);
      throw new Error('You already have a seller application pending review');
    }

    if (user.sellerApplicationStatus === 'approved') {
      res.status(400);
      throw new Error('You are already an approved seller');
    }

    // Update seller application details
    user.businessName = businessName.trim();
    user.businessDescription = businessDescription.trim();
    user.contactPhone = contactPhone.trim();
    user.sellerApplicationStatus = 'pending';

    // Note: user.role stays "customer" until approved (Stage 2)
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Seller application submitted successfully and is now pending review',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        sellerApplicationStatus: updatedUser.sellerApplicationStatus,
        businessName: updatedUser.businessName,
        businessDescription: updatedUser.businessDescription,
        contactPhone: updatedUser.contactPhone,
        addresses: updatedUser.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's seller application status
// @route   GET /api/v1/seller/status
// @access  Private
const getSellerStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'role sellerApplicationStatus businessName businessDescription contactPhone'
    );

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json({
      success: true,
      role: user.role,
      sellerApplicationStatus: user.sellerApplicationStatus || 'none',
      businessName: user.businessName || '',
      businessDescription: user.businessDescription || '',
      contactPhone: user.contactPhone || ''
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyForSeller,
  getSellerStatus
};
