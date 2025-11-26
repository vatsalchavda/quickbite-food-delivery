const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://admin:password@quickbite-mongodb:27017/restaurant_service?authSource=admin';
    
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', { error: error?.message || String(error) });
    throw error;
  }
};

module.exports = connectDB;
