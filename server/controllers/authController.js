const User = require('../models/User');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const jwt = require('jsonwebtoken');

// Set refresh token cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      password
    });

    if (user) {
      // Initialize Cart and Wishlist for user
      await Cart.create({ user: user._id, items: [] });
      await Wishlist.create({ user: user._id, products: [] });

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie('refreshToken', refreshToken, cookieOptions);

      res.status(201).json({
        success: true,
        accessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          addresses: user.addresses
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie('refreshToken', refreshToken, cookieOptions);

      res.json({
        success: true,
        accessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          addresses: user.addresses
        }
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error('No refresh token provided');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    // Return a clean 401 — client (AuthContext) silently handles this for guest users.
    // Using res.json instead of next(Error) avoids a noisy stack trace on every guest load.
    return res.status(401).json({ success: false, message: 'Authentication expired or invalid refresh token' });
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/v1/auth/logout
// @access  Private
const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({
        success: true,
        user
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;

      const updatedUser = await user.save();

      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          addresses: updatedUser.addresses
        }
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/v1/auth/profile/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await user.comparePassword(currentPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ success: true, message: 'Password updated successfully' });
    } else {
      res.status(400);
      throw new Error('Incorrect current password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add address
// @route   POST /api/v1/auth/profile/addresses
// @access  Private
const addAddress = async (req, res, next) => {
  try {
    const { street, city, state, zipCode, country, isDefault } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push({
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || user.addresses.length === 0 // If first address, make default
    });

    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/v1/auth/profile/addresses/:id
// @access  Private
const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === req.params.id);
    if (addressIndex === -1) {
      res.status(404);
      throw new Error('Address not found');
    }

    const deletedWasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If we deleted the default address and there are others left, make the first one default
    if (deletedWasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Set address as default
// @route   PUT /api/v1/auth/profile/addresses/:id/default
// @access  Private
const setDefaultAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const address = user.addresses.find(addr => addr._id.toString() === req.params.id);
    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }

    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === req.params.id;
    });

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  addAddress,
  deleteAddress,
  setDefaultAddress
};
