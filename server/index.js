require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // NEW

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB(); // NEW

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SmartLink API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});