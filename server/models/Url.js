
const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            default: Date.now
        },
        ip: {
            type: String,
            select: false
        },
        device: {
            type: String,
            enum: ['mobile', 'desktop', 'tablet', 'unknown'],
            default: 'unknown'
        },
        browser: {
            type: String,
            default: 'Other'
        },
        country: {
            type: String,
            default: null
        }
    },
    {
        _id: false
    }
);

const urlSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        originalUrl: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: function (value) {
                    try {
                        const parsed = new URL(value);

                        return (
                            ['http:', 'https:'].includes(parsed.protocol) &&
                            Boolean(parsed.hostname) &&
                            !parsed.username &&
                            !parsed.password
                        );
                    } catch {
                        return false;
                    }
                },
                message: 'Destination must be a valid HTTP or HTTPS URL.'
            }
        },

        shortCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            match: /^[a-zA-Z0-9_-]+$/
        },

        customAlias: {
            type: String,
            default: null,
            trim: true,
            validate: {
                validator: function (value) {
                    return (
                        value === null ||
                        /^[a-zA-Z0-9_-]{3,30}$/.test(value)
                    );
                },
                message: 'Custom alias must be 3–30 valid characters.'
            }
        },

        title: {
            type: String,
            default: 'Untitled Link',
            maxlength: 300
        },

        description: {
            type: String,
            default: 'No description available',
            maxlength: 2000
        },

        qrCode: {
            type: String,
            default: ''
        },

        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true
        },

        expiresAt: {
            type: Date,
            default: null
        },

        clicks: {
            type: [clickSchema],
            default: []
        }
    },
    {
        timestamps: false
    }
);

// Efficient dashboard queries, sorted newest first.
urlSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Url', urlSchema);
