require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { redirectUrl } = require('./controllers/url.controller');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static('client'));

connectDB();

// Public redirect route MUST be before other routes
app.get('/:shortCode', redirectUrl);

// API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/url.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));