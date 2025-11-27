const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      ip: req.ip
    });
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    logger.debug('Token validated successfully', {
      userId: decoded.userId,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error.message,
      path: req.path,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    logger.debug('Optional auth: Invalid token, continuing without user', {
      error: error.message
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};
