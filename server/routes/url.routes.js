const express = require('express');
const router = express.Router();
const { shortenUrl, getUserUrls } = require('../controllers/url.controller');
const { protect } = require('../middleware/auth.middleware');

// We apply 'protect' here so ONLY users with valid JWTs can shorten URLs
router.post('/shorten', protect, shortenUrl);
router.get('/my-urls', protect, getUserUrls);

module.exports = router;