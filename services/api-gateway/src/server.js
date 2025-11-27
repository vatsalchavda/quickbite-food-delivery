const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.API_GATEWAY_PORT || 3000;

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

const startServer = () => {
  const server = app.listen(PORT, () => {
    logger.info(`API Gateway started successfully`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  global.server = server;
};

startServer();
