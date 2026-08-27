const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for safety
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for the AI chat route — protects against LLM API cost abuse.
// 15 requests per minute per IP is generous for real users but blocks bots/abuse.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 15,
  message: {
    success: false,
    message: 'Too many requests to Rex. Please wait a moment before sending another message.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, chatLimiter };
