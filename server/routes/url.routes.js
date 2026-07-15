const express = require('express');
const router = express.Router();
const { shortenUrl, getMyLinks, deleteUrl } = require('../controllers/url.controller');
const checkMalicious = require('../middleware/urlChecker');
const limiter = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth.middleware');

// All URL routes require login
router.post('/shorten', protect, limiter, checkMalicious, shortenUrl);
router.get('/my-links', protect, getMyLinks);
router.delete('/url/:shortCode', protect, deleteUrl);

module.exports = router;