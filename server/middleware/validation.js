const { body, validationResult } = require('express-validator');

// Helper middleware to check for validation errors
const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateFields
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validateFields
];

const addressValidation = [
  body('street').trim().notEmpty().withMessage('Street address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zipCode').trim().notEmpty().withMessage('Zip/Postal code is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  validateFields
];

const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Review comment is required'),
  validateFields
];

module.exports = {
  registerValidation,
  loginValidation,
  addressValidation,
  reviewValidation
};
