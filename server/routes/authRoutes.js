const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  addressValidation
} = require('../middleware/validation');

// Public Auth Endpoints
router.post('/register', authLimiter, registerValidation, registerUser);
router.post('/login', authLimiter, loginValidation, loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

// Protected Auth & Profile Endpoints
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/profile/password', protect, changePassword);

// Address Management
router.post('/profile/addresses', protect, addressValidation, addAddress);
router.delete('/profile/addresses/:id', protect, deleteAddress);
router.put('/profile/addresses/:id/default', protect, setDefaultAddress);

module.exports = router;
