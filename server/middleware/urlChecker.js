const axios = require('axios');

const checkMalicious = async (req, res, next) => {
    const { originalUrl } = req.body;
    try {
        const response = await axios.post(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_API_KEY}`,
            {
                client: { clientId: 'smartlink', clientVersion: '1.0' },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url: originalUrl }]
                }
            }
        );
        
        if (response.data.matches) {
            return res.status(400).json({ error: 'Malicious URL detected.' });
        }
        next();
    } catch (err) { 
        // If the Google API fails (e.g., rate limited or down), we allow the request through so the app doesn't break
        next(); 
    }
};

module.exports = checkMalicious;