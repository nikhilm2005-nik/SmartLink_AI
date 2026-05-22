require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to parse JSON bodies in requests

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SmartLink API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});