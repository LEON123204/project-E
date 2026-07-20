const express = require('express');
const router = express.Router();
const {
  getWishlist,
  toggleWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getWishlist);
router.post('/:productId', toggleWishlist);

module.exports = router;
