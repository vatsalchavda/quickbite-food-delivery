const app = require('./app');
const connectDB = require('./config/database');
const publisher = require('./config/rabbitmq');
const logger = require('./config/logger');

const PORT = process.env.ORDER_SERVICE_PORT || 3003;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  try {
    // Close RabbitMQ connection
    await publisher.close();
    
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Connect to RabbitMQ
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';
    await publisher.connect(rabbitUrl);
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Order Service started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        swagger: `http://localhost:${PORT}/api-docs`
      });
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Global server reference for shutdown
    global.server = server;
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
