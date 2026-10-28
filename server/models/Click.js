
const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    urlId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Url',
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
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
});

clickSchema.index({ urlId: 1, timestamp: -1 });

module.exports = mongoose.model('Click', clickSchema);
