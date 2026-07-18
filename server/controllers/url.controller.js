const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const redis = require('../config/redis');
const { generateMetadata } = require('../services/groq.service');
const { generateQRCode } = require('../services/qr.service');

// POST /api/shorten (protected route requires login)
const shortenUrl = async (req, res) => {
    try {
        const { originalUrl, customAlias, expiresIn } = req.body;
        if (!originalUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }
        const shortCode = customAlias || nanoid(6);
        
        // Check alias availability
        const existing = await Url.findOne({ shortCode });
        if (existing) {
            return res.status(400).json({ error: 'Alias already taken' });
        }
        
        const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
        
        // Run Groq metadata & QR code generation in parallel (faster)
        const [{ title, description }, qrCode] = await Promise.all([
            generateMetadata(originalUrl),
            generateQRCode(shortUrl)
        ]);
        
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;
        
        const url = await Url.create({
            userId: req.user._id, // link owned by logged in user
            originalUrl,
            shortCode,
            customAlias: customAlias || null,
            title,
            description,
            qrCode,
            expiresAt
        });
        
        // Cache in Redis - 24 hours TTL
        await redis.setex(shortCode, 86400, originalUrl);
        res.status(201).json({ shortUrl, shortCode, title, description, qrCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /:shortCode - public redirect (no auth needed)
const redirectUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        // Redis cache first
        const cached = await redis.get(shortCode);
        if (cached) {
            logClick(shortCode, req);
            return res.redirect(cached);
        }
        
        // MongoDB fallback
        const url = await Url.findOne({ shortCode });
        if (!url) return res.status(404).json({ error: 'Link not found' });
        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({ error: 'This link has expired' });
        }
        
        await redis.setex(shortCode, 86400, url.originalUrl);
        logClick(shortCode, req);
        res.redirect(url.originalUrl);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/my-links - get all links for logged in user
const getMyLinks = async (req, res) => {
    try {
        const urls = await Url.find({ userId: req.user._id })
            .select('-clicks') // exclude click array for performance
            .sort({ createdAt: -1 });
        res.json({ count: urls.length, urls });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// DELETE /api/url/:shortCode - delete own link
const deleteUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;
        const url = await Url.findOne({ shortCode });
        if (!url) return res.status(404).json({ error: 'Link not found' });
        
        // Only owner can delete
        if (url.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this link' });
        }
        
        await Url.deleteOne({ shortCode });
        await redis.del(shortCode);
        res.json({ message: 'Link deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Internal - log click async
const logClick = async (shortCode, req) => {
    try {
        const ua = req.headers['user-agent'] || '';
        const device = ua.includes('Mobile') ? 'mobile' : 'desktop';
        const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
        
        await Url.updateOne(
            { shortCode }, 
            { $push: { clicks: { timestamp: new Date(), ip: req.ip, device, browser } } }
        );
    } catch (err) {
        console.error('Click log error:', err);
    }
};

// PUT /api/url/:shortCode - dynamically update destination
const updateUrl = async (req, res) => {
    try {
        const { originalUrl } = req.body;
        const { shortCode } = req.params;

        if (!originalUrl) {
            return res.status(400).json({ error: 'New destination URL is required' });
        }

        const url = await Url.findOneAndUpdate(
            { shortCode, userId: req.user._id },
            { originalUrl },
            { new: true }
        );

        if (!url) return res.status(404).json({ error: 'URL not found or unauthorized' });

        // Update the Redis cache immediately so traffic routes correctly
        await redis.setex(shortCode, 86400, originalUrl);

        res.json({ message: 'URL updated successfully', url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while updating URL' });
    }
};

module.exports = { shortenUrl, redirectUrl, getMyLinks, deleteUrl, updateUrl };