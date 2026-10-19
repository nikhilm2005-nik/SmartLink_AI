
const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const authRateLimiter = require('../middleware/authRateLimiter');

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
