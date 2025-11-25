const mongoose = require('mongoose');

const connectDB = async (logger) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', { error: error.message });
    process.exit(1);
  }
};

module.exports = connectDB;
