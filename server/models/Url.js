const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    ip: String,
    device: String,
    browser: String,
    country: String
});

const urlSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Every link is securely owned by a user
    },
    originalUrl: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    customAlias: { type: String, default: null },
    title: { type: String, default: 'Untitled Link' },
    description: { type: String, default: 'No description available' },
    qrCode: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    clicks: [clickSchema]
});

// Database indexes make searching insanely fast
urlSchema.index({ userId: 1 }); // Fast lookup of all user's links

module.exports = mongoose.model('Url', urlSchema);