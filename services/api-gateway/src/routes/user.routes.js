const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { callWithCircuitBreaker } = require('../middleware/circuitBreaker');
const logger = require('../config/logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://quickbite-user-service:3001';

/**
 * POST /api/users/register
 * Register new user
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'user-service',
      `${USER_SERVICE_URL}/api/auth/register`,
      {
        method: 'POST',
        data: req.body
      }
    );
    res.status(201).json(data);
  } catch (error) {
    logger.error('User registration failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/users/login
 * User login
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'user-service',
      `${USER_SERVICE_URL}/api/auth/login`,
      {
        method: 'POST',
        data: req.body
      }
    );
    res.json(data);
  } catch (error) {
    logger.error('User login failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
