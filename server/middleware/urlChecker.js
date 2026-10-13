
const axios = require('axios');
const protobuf = require('protobufjs');

const Duration = new protobuf.Type('Duration')
    .add(new protobuf.Field('seconds', 1, 'int64'))
    .add(new protobuf.Field('nanos', 2, 'int32'));

const ThreatUrl = new protobuf.Type('ThreatUrl')
    .add(new protobuf.Field('url', 1, 'string'))
    .add(new protobuf.Field('threatTypes', 2, 'int32', 'repeated'));

const UrlsSearchResponse = new protobuf.Type('UrlsSearchResponse')
    .add(new protobuf.Field('threats', 1, 'ThreatUrl', 'repeated'))
    .add(new protobuf.Field('cacheDuration', 2, 'Duration'));

UrlsSearchResponse.add(ThreatUrl);
UrlsSearchResponse.add(Duration);

const checkMalicious = async (req, res, next) => {
    const { originalUrl } = req.body || {};
    let parsedUrl;

    try {
        parsedUrl = new URL(originalUrl);
    } catch {
        return res.status(400).json({
            error: 'Please provide a valid URL.'
        });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
            error: 'Only HTTP and HTTPS URLs are allowed.'
        });
    }

    const apiKey = process.env.SAFE_BROWSING_API_KEY;

    if (!apiKey || apiKey === 'your_google_key_here') {
        console.error('Safe Browsing API key is not configured.');

        return res.status(503).json({
            error: 'URL safety checking is temporarily unavailable.'
        });
    }

    try {
        const response = await axios.get(
            'https://safebrowsing.googleapis.com/v5/urls:search',
            {
                params: {
                    key: apiKey,
                    urls: parsedUrl.href
                },
                responseType: 'arraybuffer',
                timeout: 5000
            }
        );

        const decoded = UrlsSearchResponse.decode(
            Buffer.from(response.data)
        );

        const result = UrlsSearchResponse.toObject(decoded, {
            longs: String,
            defaults: false
        });

        if ((result.threats || []).length > 0) {
            return res.status(400).json({
                error: 'Malicious URL detected.'
            });
        }

        return next();
    } catch (error) {
        console.error(
            'Safe Browsing v5 check failed:',
            error.response?.status,
            error.message
        );

        return res.status(503).json({
            error: 'URL safety checking is temporarily unavailable. Please try again later.'
        });
    }
};

module.exports = checkMalicious;
