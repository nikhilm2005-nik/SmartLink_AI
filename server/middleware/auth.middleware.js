
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Not authorized. No token provided.'
        });
    }

    const parts = authHeader.split(' ');

    if (
        parts.length !== 2 ||
        parts[0] !== 'Bearer' ||
        !parts[1]
    ) {
        return res.status(401).json({
            error: 'Invalid authorization header format.'
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');

        return res.status(500).json({
            error: 'Authentication service is temporarily unavailable.'
        });
    }

    try {
        const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({
                error: 'Invalid token payload.'
            });
        }

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                error: 'User no longer exists.'
            });
        }

        return next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' ||
            err.name === 'TokenExpiredError' ||
            err.name === 'NotBeforeError') {
            return res.status(401).json({
                error: 'Invalid or expired token.'
            });
        }

        console.error('Authentication middleware failed:', err.message);

        return res.status(500).json({
            error: 'Authentication service is temporarily unavailable.'
        });
    }
};

module.exports = { protect };
