const express = require('express');
const router = express.Router();
// ADD deleteUrl to the import list:
const { shortenUrl, getUserUrls, deleteUrl } = require('../controllers/url.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/shorten', protect, shortenUrl);
router.get('/my-urls', protect, getUserUrls);
// NEW: Route to handle deletion requests
router.delete('/:id', protect, deleteUrl);

module.exports = router;