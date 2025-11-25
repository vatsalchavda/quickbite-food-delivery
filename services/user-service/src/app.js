const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const correlationIdMiddleware = require('../shared/middleware/correlationId');
const { errorHandler } = require('../shared/utils/errorHandler');
const authRoutes = require('./routes/authRoutes');

const createApp = (logger, eventPublisher) => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID for distributed tracing
  app.use(correlationIdMiddleware);

  // Attach logger and event publisher to request
  app.use((req, res, next) => {
    req.logger = logger;
    req.eventPublisher = eventPublisher;
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId: req.correlationId,
    });
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'user-service' });
  });

  // Routes
  app.use('/api/auth', authRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // Error handler
  app.use(errorHandler(logger));

  return app;
};

module.exports = createApp;
