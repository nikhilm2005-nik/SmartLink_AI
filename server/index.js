require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // NEW

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// Connect to Database
connectDB(); // NEW

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SmartLink API is running' });
});
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/url.routes'));
app.use('/', require('./routes/redirect.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n Server is successfully running on port ${PORT}`);
    console.log(`--------------------------------------------------`);
    console.log(` Dashboard : http://localhost:${PORT}/index.html`);
    console.log(` Login     : http://localhost:${PORT}/login.html`);
    console.log(` Register  : http://localhost:${PORT}/register.html`);
    console.log(`--------------------------------------------------\n`);
});