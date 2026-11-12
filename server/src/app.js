const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Authentication routes
app.use('/api/v1/auth', authRoutes);

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    errors: [
      {
        field: 'path',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
    ],
  });
});

// Global centralized error handler
app.use(errorHandler);

module.exports = app;
