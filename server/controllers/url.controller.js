const { nanoid } = require('nanoid');
const Url = require('../models/Url');

// POST /api/shorten (protected route)
const shortenUrl = async (req, res) => {
    try {
        const { originalUrl, customAlias, expiresIn } = req.body;

        if (!originalUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // If user provides an alias, use it. Otherwise, generate 6 random characters.
        const shortCode = customAlias || nanoid(6);

        // Check if the shortcode/alias is already taken
        const existing = await Url.findOne({ shortCode });
        if (existing) {
            return res.status(400).json({ error: 'Alias already taken' });
        }

        const shortUrl = `${process.env.BASE_URL}/${shortCode}`;

        // Calculate expiration date if provided
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;

        // Save to database
        const url = await Url.create({
            userId: req.user._id, // Tied directly to the logged-in user!
            originalUrl,
            shortCode,
            customAlias: customAlias || null,
            expiresAt
        });

        // TODO: Later we will add Redis caching, AI titles, and QR generation here.

        res.status(201).json({ 
            shortUrl, 
            shortCode, 
            originalUrl,
            title: url.title
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/my-urls (Protected)
const getUserUrls = async (req, res) => {
    try {
        // Find all URLs belonging to the logged-in user, sorted by newest first
        const urls = await Url.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(urls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while fetching URLs' });
    }
};

// GET /:shortCode (Public)
const redirectUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const url = await Url.findOne({ shortCode });

        if (!url) {
            return res.status(404).send('URL not found');
        }

        // Check if the link has expired
        if (url.expiresAt && new Date() > url.expiresAt) {
            return res.status(410).send('This link has expired');
        }

        // Record the click (we will add richer data like IP and Country later)
        url.clicks.push({
            timestamp: new Date(),
        });
        await url.save();

        // Perform the actual redirect!
        res.redirect(url.originalUrl);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

module.exports = { shortenUrl, getUserUrls, redirectUrl };
