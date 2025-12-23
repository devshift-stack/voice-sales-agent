const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Routes
const authRoutes = require('./api/auth');
const campaignRoutes = require('./api/campaigns');
const callRoutes = require('./api/calls');
const promptRoutes = require('./api/prompts');
const uploadRoutes = require('./api/upload');
const statsRoutes = require('./api/stats');
const settingsRoutes = require('./api/settings');
const twilioWebhooks = require('./webhooks/twilio');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Logging
app.use(morgan('dev'));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (für Audio etc.)
app.use('/audio', express.static(path.join(__dirname, '..', 'audio')));

// Auth Middleware
const { authMiddleware } = require('./api/auth');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/calls', authMiddleware, callRoutes);
app.use('/api/prompts', authMiddleware, promptRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// Twilio Webhooks (kein /api prefix für Twilio)
app.use('/webhooks/twilio', twilioWebhooks);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route nicht gefunden' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
