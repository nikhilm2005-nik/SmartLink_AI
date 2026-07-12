const Url = require('../models/Url');
const { generateAnalyticsSummary } = require('../services/groq.service');

const getAnalytics = async (req, res) => {
    try {
        const { shortCode } = req.params;
        const url = await Url.findOne({ shortCode });
        if (!url) return res.status(404).json({ error: 'Link not found' });
        
        // Only owner can view analytics
        if (url.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const totalClicks = url.clicks.length;
        const devices = url.clicks.reduce((acc, c) => {
            acc[c.device] = (acc[c.device] || 0) + 1; return acc; 
        }, {});
        
        const browsers = url.clicks.reduce((acc, c) => {
            acc[c.browser] = (acc[c.browser] || 0) + 1; return acc; 
        }, {});
        
        const byDate = url.clicks.reduce((acc, c) => {
            const date = new Date(c.timestamp).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1; return acc; 
        }, {});
        
        const analyticsData = { title: url.title, totalClicks, devices, browsers, byDate };
        const aiSummary = await generateAnalyticsSummary(analyticsData);
        
        res.json({ ...analyticsData, aiSummary });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getAnalytics };