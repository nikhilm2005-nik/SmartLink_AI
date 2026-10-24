
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured.');
    }

    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        // Validate input types
        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                error: 'Name, email, and password must be provided as strings.'
            });
        }

        // Normalize input
        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({
                error: 'All fields are required.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters.'
            });
        }

        // Check whether email is already registered
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'Email already registered.'
            });
        }

        // Password is hashed by the User model's pre-save hook
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password
        });

        const token = generateToken(user._id);

        return res.status(201).json({
            message: 'Account created successfully.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Email already registered.'
            });
        }

        console.error('Registration failed:', err.message);

        return res.status(500).json({
            error: 'Server error.'
        });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        // Validate input types and required fields
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: 'Email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Explicitly select password because User schema uses select: false
        const user = await User.findOne({
            email: normalizedEmail
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        const token = generateToken(user._id);

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login failed:', err.message);

        return res.status(500).json({
            error: 'Server error.'
        });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    return res.status(200).json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
        }
    });
};

module.exports = {
    register,
    login,
    getMe
};
