require('dotenv').config();
const createLogger = require('../shared/utils/logger');
const EventPublisher = require('../shared/events/EventPublisher');
const connectDB = require('./config/database');
const createApp = require('./app');

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
      server.close(async () => {
        await eventPublisher.close();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
