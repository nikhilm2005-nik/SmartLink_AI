const express = require('express');
const router = express.Router();
// Update the import to include getAnalytics
const { shortenUrl, getUserUrls, deleteUrl, getAnalytics } = require('../controllers/url.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/shorten', protect, shortenUrl);
router.get('/my-urls', protect, getUserUrls);
router.delete('/:id', protect, deleteUrl);
// NEW: Analytics route
router.get('/analytics', protect, getAnalytics);

module.exports = router;