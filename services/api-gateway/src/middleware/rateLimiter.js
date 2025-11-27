const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse and ensures fair resource allocation
 * Uses sliding window algorithm
 */

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
});

/**
 * Strict Rate Limiter for Authentication Endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.error('Authentication rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes'
    });
  }
});

/**
 * Moderate Rate Limiter for Write Operations
 * 20 requests per minute per IP
 */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  handler: (req, res) => {
    logger.warn('Write operation rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again in a minute'
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  writeLimiter
};
