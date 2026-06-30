const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateMetadata = async (url) => {
    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{
                role: 'user',
                content: `Given this URL: ${url}, generate a short title (max 8 words) and one sentence description. Respond in pure JSON only: {"title":"...", "description": "..."}`
            }]
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        return { title: 'Untitled Link', description: 'No description available' };
    }
};

const generateAnalyticsSummary = async (data) => {
    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{
                role: 'user',
                content: `Given this analytics: ${JSON.stringify(data)}, write a 3 sentence plain English summary covering total clicks, top device type, and peak activity day.`
            }]
        });
        return response.choices[0].message.content;
    } catch (err) {
        return 'Analytics summary unavailable';
    }
};

module.exports = { generateMetadata, generateAnalyticsSummary };