require('dotenv').config();
const { validateEnv } = require('./config/env');
const createLogger = require('../shared/utils/logger');
const EventPublisher = require('../shared/events/EventPublisher');
const connectDB = require('./config/database');
const createApp = require('./app');

// Validate environment variables on startup
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

const logger = createLogger('user-service');
const eventPublisher = new EventPublisher(logger);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB(logger);

    // Connect event publisher
    await eventPublisher.connect();

    // Create Express app
    const app = createApp(logger, eventPublisher);

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`User Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      
      // Set a timeout for graceful shutdown
      const shutdownTimeout = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000); // 30 seconds timeout

      server.close(async () => {
        clearTimeout(shutdownTimeout);
        logger.info('HTTP server closed');
        
        try {
          await eventPublisher.close();
          logger.info('RabbitMQ connection closed');
          
          await require('mongoose').connection.close();
          logger.info('MongoDB connection closed');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', { error: error.message });
          process.exit(1);
        }
      });

      // If server hasn't finished in 20 seconds, force close connections
      setTimeout(() => {
        logger.warn('Forcing server shutdown...');
        server.closeAllConnections();
      }, 20000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
