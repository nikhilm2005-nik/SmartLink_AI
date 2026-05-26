const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller'); 
const { protect } = require('../middleware/auth.middleware'); // NEW

router.post('/register', register);
router.post('/login', login); // NEW
router.get('/me', protect, getMe); // NEW

module.exports = router;