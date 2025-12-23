const mongoose = require('mongoose');

const connectDB = async (logger, maxRetries = 5, retryDelay = 5000) => {
  let retries = 0;

  const connect = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', { error: err.message });
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return conn;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${maxRetries} failed:`, { 
        error: error.message 
      });

      if (retries < maxRetries) {
        const delay = retryDelay * Math.pow(2, retries - 1); // Exponential backoff
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return connect();
      } else {
        logger.error('Max MongoDB connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  };

  return connect();
};

module.exports = connectDB;
