const Redis = require('ioredis');
// Connect to the REDIS_URL defined in your .env file, or fallback to local
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('Redis connected successfully'));
redis.on('error', (err) => console.error('Redis connection error:', err));

module.exports = redis;