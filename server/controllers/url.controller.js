const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const QRCode = require('qrcode');
const UAParser = require('ua-parser-js');

// POST /api/shorten (protected route)
const shortenUrl = async (req, res) => {
    try {
        // NEW: We now extract the color variables from the request body
        const { originalUrl, customAlias, expiresIn, qrFgColor, qrBgColor } = req.body;

        if (!originalUrl) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const shortCode = customAlias || nanoid(6);

        const existing = await Url.findOne({ shortCode });
        if (existing) {
            return res.status(400).json({ error: 'Alias already taken' });
        }

        const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;

        // NEW: Generate the QR Code with custom colors
        const qrCodeData = await QRCode.toDataURL(shortUrl, {
            color: {
                dark: qrFgColor || '#000000',  // The dots (default black)
                light: qrBgColor || '#ffffff' // The background (default white)
            }
        });

        const url = await Url.create({
            userId: req.user._id,
            originalUrl,
            shortCode,
            customAlias: customAlias || null,
            expiresAt,
            qrCode: qrCodeData 
        });

        res.status(201).json({ 
            shortUrl, 
            shortCode, 
            originalUrl,
            title: url.title,
            qrCode: url.qrCode 
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

        if (url.expiresAt && new Date() > url.expiresAt) {
            return res.status(410).send('This link has expired');
        }

        // NEW: Parse the User-Agent header
        const parser = new UAParser(req.headers['user-agent']);
        const result = parser.getResult();

        // Record the rich click data
        url.clicks.push({
            timestamp: new Date(),
            browser: result.browser.name || 'Unknown Browser',
            device: result.os.name || 'Unknown OS'
        });
        
        await url.save();
        res.redirect(url.originalUrl);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

// DELETE /api/:id (Protected)
const deleteUrl = async (req, res) => {
    try {
        // Find the URL by ID AND ensure the logged-in user actually owns it
        const url = await Url.findOneAndDelete({ 
            _id: req.params.id, 
            userId: req.user._id 
        });

        if (!url) {
            return res.status(404).json({ error: 'URL not found or unauthorized' });
        }

        res.json({ message: 'URL deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/analytics (Protected)
const getAnalytics = async (req, res) => {
    try {
        // We use MongoDB Aggregation to process data incredibly fast directly inside the database
        const stats = await Url.aggregate([
            { $match: { userId: req.user._id } }, // Step 1: Find only this user's links
            { 
                $group: { 
                    _id: null, 
                    totalLinks: { $sum: 1 }, // Step 2: Count the links
                    totalClicks: { $sum: { $size: "$clicks" } } // Step 3: Add up the size of every clicks array
                } 
            }
        ]);

        // If the user has no links yet, the stats array will be empty
        if (stats.length === 0) {
            return res.json({ totalLinks: 0, totalClicks: 0 });
        }

        res.json({ 
            totalLinks: stats[0].totalLinks, 
            totalClicks: stats[0].totalClicks 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while fetching analytics' });
    }
};

// PUT /api/:id (Protected)
const updateUrl = async (req, res) => {
    try {
        const { originalUrl } = req.body;

        if (!originalUrl) {
            return res.status(400).json({ error: 'New destination URL is required' });
        }

        // Find the URL by ID and ensure the user owns it, then update it
        const url = await Url.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { originalUrl: originalUrl },
            { new: true } // This tells Mongoose to return the updated document
        );

        if (!url) {
            return res.status(404).json({ error: 'URL not found or unauthorized' });
        }

        res.json({ message: 'URL updated successfully', url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while updating URL' });
    }
};


module.exports = { shortenUrl, getUserUrls, redirectUrl, deleteUrl, getAnalytics, updateUrl };



