const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { callWithCircuitBreaker } = require('../middleware/circuitBreaker');
const logger = require('../config/logger');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://quickbite-order-service:3003';

/**
 * POST /api/orders
 * Create order (authenticated)
 */
router.post('/', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'order-service',
      `${ORDER_SERVICE_URL}/api/orders`,
      {
        method: 'POST',
        data: req.body
      }
    );
    res.status(201).json(data);
  } catch (error) {
    logger.error('Create order failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/orders
 * Get orders (authenticated)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const data = await callWithCircuitBreaker(
      'order-service',
      `${ORDER_SERVICE_URL}/api/orders?${queryString}`,
      { method: 'GET' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Get orders failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID (authenticated)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'order-service',
      `${ORDER_SERVICE_URL}/api/orders/${req.params.id}`,
      { method: 'GET' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Get order failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/orders/:id/confirm
 * Confirm order (authenticated)
 */
router.put('/:id/confirm', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'order-service',
      `${ORDER_SERVICE_URL}/api/orders/${req.params.id}/confirm`,
      { method: 'PUT' }
    );
    res.json(data);
  } catch (error) {
    logger.error('Confirm order failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/orders/:id/cancel
 * Cancel order (authenticated)
 */
router.put('/:id/cancel', authenticateToken, writeLimiter, async (req, res) => {
  try {
    const data = await callWithCircuitBreaker(
      'order-service',
      `${ORDER_SERVICE_URL}/api/orders/${req.params.id}/cancel`,
      {
        method: 'PUT',
        data: req.body
      }
    );
    res.json(data);
  } catch (error) {
    logger.error('Cancel order failed', { error: error.message });
    res.status(error.response?.status || 503).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
