const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { callWithCircuitBreaker } = require('../middleware/circuitBreaker');
const logger = require('../config/logger');

const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://quickbite-restaurant-service:3002';

/**
 * GET /api/restaurants
 * Get all restaurants (public)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const data = await callWithCircuitBreaker(
      'restaurant-service',
      `${RESTAURANT_SERVICE_URL}/api/restaurants?${queryString}`,
      { method: 'GET' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Get restaurants failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/restaurants/search
 * Search restaurants (public)
 * IMPORTANT: Must be before /:id route to avoid matching "search" as an ID
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const data = await callWithCircuitBreaker(
      'restaurant-service',
      `${RESTAURANT_SERVICE_URL}/api/restaurants/search?${queryString}`,
      { method: 'GET' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Search restaurants failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/restaurants/:id
 * Get restaurant by ID (public)
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'restaurant-service',
      `${RESTAURANT_SERVICE_URL}/api/restaurants/${req.params.id}`,
      { method: 'GET' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Get restaurant failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/restaurants
 * Create restaurant (authenticated)
 */
router.post('/', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'restaurant-service',
      `${RESTAURANT_SERVICE_URL}/api/restaurants`,
      {
        method: 'POST',
        data: req.body
      }
    );
    res.status(201).json(data);
  } catch (error) {
    logger.error('Create restaurant failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/restaurants/:id
 * Update restaurant (authenticated)
 */
router.put('/:id', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'restaurant-service',
      `${RESTAURANT_SERVICE_URL}/api/restaurants/${req.params.id}`,
      {
        method: 'PUT',
        data: req.body
      }
    );
    res.json(data);
  } catch (error) {
    logger.error('Update restaurant failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
