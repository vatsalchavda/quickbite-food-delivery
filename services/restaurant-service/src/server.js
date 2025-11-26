const app = require('./app');
const connectDB = require('./config/database');
const cacheService = require('./config/redis');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3002;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Close Redis connection
    await cacheService.disconnect();
    logger.info('Redis connection closed');

    // Close MongoDB connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

// Shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Connect to Redis
    const redisUrl = process.env.REDIS_URL || 'redis://quickbite-redis:6379';
    await cacheService.connect(redisUrl);
    logger.info('Redis connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Restaurant Service running on port ${PORT}`);
      logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error?.message || String(error), stack: error?.stack });
    process.exit(1);
  }
};

startServer();
