
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per IP per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args)
    }),
    message: {
        error: 'Too many authentication attempts. Please try again in 15 minutes.'
    }
});

module.exports = authRateLimiter;
