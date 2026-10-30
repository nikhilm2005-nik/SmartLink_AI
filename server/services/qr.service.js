
const QRCode = require('qrcode');

const generateQRCode = async (url) => {
    if (typeof url !== 'string' || !url.trim()) {
        console.error('QR generation skipped: invalid URL input.');
        return '';
    }

    try {
        const parsedUrl = new URL(url);

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            console.error('QR generation skipped: unsupported URL protocol.');
            return '';
        }

        return await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#16213e',
                light: '#ffffff'
            }
        });
    } catch (err) {
        console.error('QR generation failed:', err.message);
        return '';
    }
};

module.exports = { generateQRCode };
