const QRCode = require('qrcode');

// Returns base64 string embedded directly in JSON response
// Frontend displays it as: <img src="data:image/png;base64,..." />
const generateQRCode = async (url) => {
    try {
        const qrBase64 = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H', // high error correction
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#16213e',   // dark navy dots
                light: '#ffffff'   // white background
            }
        });
        return qrBase64;
    } catch (err) {
        console.error('QR generation error', err);
        return '';
    }
};

module.exports = { generateQRCode };