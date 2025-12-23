const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const correlationIdMiddleware = require('../shared/middleware/correlationId');
const { errorHandler } = require('../shared/utils/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/user.routes');

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

  // Swagger API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'QuickBite User Service API',
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'user-service' });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

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
