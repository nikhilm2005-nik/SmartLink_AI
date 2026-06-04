const express = require('express');
const router = express.Router();
const { redirectUrl } = require('../controllers/url.controller');

// This catches any GET request with a parameter and passes it to our redirect controller
router.get('/:shortCode', redirectUrl);

module.exports = router;