const app = require('./app');
const eventConsumer = require('./config/rabbitmq');
const notificationService = require('./services/notification.service');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3005;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Close RabbitMQ consumer
  await eventConsumer.close();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

const startServer = async () => {
  try {
    // Connect to RabbitMQ and start consuming events
    await eventConsumer.connect();
    
    // Subscribe to order events
    await eventConsumer.subscribeToOrderEvents((event, routingKey) => {
      return notificationService.handleOrderEvent(event, routingKey);
    });
    
    // Start HTTP server for health checks
    const server = app.listen(PORT, () => {
      logger.info('Notification Service started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    global.server = server;
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();
