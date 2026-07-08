const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
    message: { error: 'Too many requests. Try again in a minute.' }
});

module.exports = limiter;