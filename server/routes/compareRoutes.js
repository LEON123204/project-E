'use strict';

const express = require('express');
const router = express.Router();
const { compareProducts } = require('../controllers/compareController');
const { compareLimiter } = require('../middleware/rateLimiter');

// POST /api/v1/compare - Public product comparison endpoint (10 req/min per IP)
router.post('/', compareLimiter, compareProducts);

module.exports = router;

