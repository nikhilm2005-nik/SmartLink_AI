
const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const redis = require('../config/redis');
const { generateMetadata } = require('../services/groq.service');
const { generateQRCode } = require('../services/qr.service');
const Click = require('../models/Click');

// Validate HTTP/HTTPS destinations.
const isValidHttpUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        return false;
    }

    try {
        const parsed = new URL(value.trim());

        return (
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            Boolean(parsed.hostname) &&
            !parsed.username &&
            !parsed.password
        );
    } catch {
        return false;
    }
};

// Redis is a cache, so cache failures should not necessarily fail
// operations that have already succeeded in MongoDB.
const cacheUrl = async (shortCode, originalUrl) => {
    try {
        await redis.setex(shortCode, 86400, originalUrl);
    } catch (err) {
        console.error('Redis cache write failed:', err.message);
    }
};

const clearCachedUrl = async (shortCode) => {
    try {
        await redis.del(shortCode);
    } catch (err) {
        console.error('Redis cache deletion failed:', err.message);
    }
};

// POST /api/shorten
const shortenUrl = async (req, res) => {
    try {
        const { originalUrl, customAlias, expiresIn } = req.body || {};

        if (typeof originalUrl !== 'string' || !originalUrl.trim()) {
            return res.status(400).json({ error: 'URL is required.' });
        }

        const destination = originalUrl.trim();

        if (!isValidHttpUrl(destination)) {
            return res.status(400).json({
                error: 'Please provide a valid HTTP or HTTPS URL.'
            });
        }

        const hasCustomAlias =
            customAlias !== undefined &&
            customAlias !== null &&
            customAlias !== '';

        if (
            hasCustomAlias &&
            (
                typeof customAlias !== 'string' ||
                !/^[a-zA-Z0-9_-]{3,30}$/.test(customAlias)
            )
        ) {
            return res.status(400).json({
                error: 'Custom alias must be 3–30 characters and contain only letters, numbers, hyphens, or underscores.'
            });
        }

        let expiryDays = null;

        if (expiresIn !== undefined && expiresIn !== null) {
            if (
                expiresIn === '' ||
                !Number.isInteger(Number(expiresIn)) ||
                Number(expiresIn) < 1 ||
                Number(expiresIn) > 365
            ) {
                return res.status(400).json({
                    error: 'Expiry must be a whole number of days between 1 and 365.'
                });
            }

            expiryDays = Number(expiresIn);
        }

        const shortCode = hasCustomAlias ? customAlias : nanoid(6);

        const existing = await Url.findOne({ shortCode });

        if (existing) {
            return res.status(409).json({ error: 'Alias already taken.' });
        }

        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            console.error('BASE_URL is not configured.');

            return res.status(500).json({
                error: 'URL shortening is temporarily unavailable.'
            });
        }

        const shortUrl = `${baseUrl.replace(/\/+$/, '')}/${shortCode}`;

        // Metadata and QR code generation run concurrently.
        // Failures here are caught by the outer handler.
        const [{ title, description }, qrCode] = await Promise.all([
            generateMetadata(destination),
            generateQRCode(shortUrl)
        ]);

        const expiresAt = expiryDays
            ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
            : null;

        const url = await Url.create({
            userId: req.user._id,
            originalUrl: destination,
            shortCode,
            customAlias: hasCustomAlias ? customAlias : null,
            title,
            description,
            qrCode,
            expiresAt
        });

        await cacheUrl(shortCode, destination);

        return res.status(201).json({
            shortUrl,
            shortCode,
            title,
            description,
            qrCode
        });
    } catch (err) {
        // Handle duplicate aliases if concurrent requests race.
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Alias already taken.' });
        }

        console.error('URL creation failed:', err.message);

        return res.status(500).json({ error: 'Server error.' });
    }
};

// Redirect a short link after checking expiry in MongoDB.
const redirectUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const url = await Url.findOne({ shortCode });

        if (!url) {
            return res.status(404).send('Short link not found.');
        }

        if (url.expiresAt && url.expiresAt <= new Date()) {
            await clearCachedUrl(shortCode);
            return res.status(410).send('This short link has expired.');
        }

        // MongoDB is the source of truth. Redis is only a cache.
        // Use the database destination for this redirect to avoid
        // following stale or tampered cached values.
        await cacheUrl(shortCode, url.originalUrl);

        // Do not make the redirect depend on click logging succeeding.
        void logClick(shortCode, req);

        return res.redirect(url.originalUrl);
    } catch (err) {
        console.error('Redirect failed:', err.message);
        return res.status(500).send('Internal server error.');
    }
};

// GET /api/my-links

const getMyLinks = async (req, res) => {
    try {
        const urls = await Url.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const urlIds = urls.map((url) => url._id);

        const clickCounts = await Click.aggregate([
            {
                $match: {
                    urlId: { $in: urlIds }
                }
            },
            {
                $group: {
                    _id: '$urlId',
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = new Map(
            clickCounts.map((item) => [
                item._id.toString(),
                item.count
            ])
        );

        const urlsWithCounts = urls.map((url) => ({
            ...url,
            clickCount: countMap.get(url._id.toString()) || 0
        }));

        return res.status(200).json({
            count: urlsWithCounts.length,
            urls: urlsWithCounts
        });
    } catch (err) {
        console.error('Fetching user links failed:', err.message);
        return res.status(500).json({ error: 'Server error.' });
    }
};


// DELETE /api/url/:shortCode

const deleteUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const url = await Url.findOne({
            shortCode,
            userId: req.user._id
        });

        if (!url) {
            return res.status(404).json({
                error: 'Link not found or unauthorized.'
            });
        }

        // Delete the URL first, using the owner's ID as a safeguard.
        await Url.deleteOne({
            _id: url._id,
            userId: req.user._id
        });

        // Remove all click records associated with this URL.
        await Click.deleteMany({
            urlId: url._id
        });

        // Remove its cached destination.
        await clearCachedUrl(shortCode);

        return res.status(200).json({
            message: 'Link and associated click analytics deleted successfully.'
        });
    } catch (err) {
        console.error('Deleting URL failed:', err.message);

        return res.status(500).json({
            error: 'Server error while deleting URL.'
        });
    }
};


// Internal click logging.

const logClick = async (shortCode, req) => {
    try {
        const url = await Url.findOne({ shortCode }).select('_id');

        if (!url) return;

        const ua = req.headers['user-agent'] || '';

        const device = /mobile/i.test(ua) ? 'mobile' : 'desktop';

        const browser = /Edg\//i.test(ua)
            ? 'Edge'
            : /Chrome\//i.test(ua)
                ? 'Chrome'
                : /Firefox\//i.test(ua)
                    ? 'Firefox'
                    : /Safari\//i.test(ua)
                        ? 'Safari'
                        : 'Other';

        await Click.create({
            urlId: url._id,
            timestamp: new Date(),
            ip: req.ip,
            device,
            browser
        });
    } catch (err) {
        console.error('Click logging failed:', err.message);
    }
};


// PUT /api/url/:shortCode
const updateUrl = async (req, res) => {
    try {
        const { originalUrl } = req.body || {};
        const { shortCode } = req.params;

        if (typeof originalUrl !== 'string' || !originalUrl.trim()) {
            return res.status(400).json({
                error: 'New destination URL is required.'
            });
        }

        const destination = originalUrl.trim();

        if (!isValidHttpUrl(destination)) {
            return res.status(400).json({
                error: 'Please provide a valid HTTP or HTTPS URL.'
            });
        }

        const url = await Url.findOne({
            shortCode,
            userId: req.user._id
        });

        if (!url) {
            return res.status(404).json({
                error: 'URL not found or unauthorized.'
            });
        }

        url.originalUrl = destination;
        await url.save();

        // Refresh the cache after MongoDB has been updated.
        await cacheUrl(shortCode, destination);

        return res.status(200).json({
            message: 'URL updated successfully.',
            url
        });
    } catch (err) {
        console.error('Updating URL failed:', err.message);
        return res.status(500).json({
            error: 'Server error while updating URL.'
        });
    }
};

module.exports = {
    shortenUrl,
    redirectUrl,
    getMyLinks,
    deleteUrl,
    updateUrl
};
