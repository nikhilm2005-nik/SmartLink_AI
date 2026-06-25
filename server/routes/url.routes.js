const express = require('express');
const router = express.Router();
const { shortenUrl, getUserUrls, deleteUrl, getAnalytics, updateUrl } = require('../controllers/url.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/shorten', protect, shortenUrl);
router.get('/my-urls', protect, getUserUrls);
router.delete('/:id', protect, deleteUrl);
router.get('/analytics', protect, getAnalytics);
router.put('/:id', protect, updateUrl);

module.exports = router;