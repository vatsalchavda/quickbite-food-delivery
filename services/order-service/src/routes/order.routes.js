const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, restaurantId, items, deliveryType, pricing]
 *             properties:
 *               customerId:
 *                 type: string
 *               restaurantId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OrderItem'
 *               deliveryType:
 *                 type: string
 *                 enum: [DELIVERY, PICKUP]
 *               deliveryAddress:
 *                 type: object
 *               pricing:
 *                 type: object
 *               specialInstructions:
 *                 type: string
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       500:
 *         description: Server error
 */
router.post('/', orderController.createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with filtering
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/', orderController.getOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/confirm:
 *   put:
 *     summary: Confirm order (restaurant accepts)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order confirmed
 *       400:
 *         description: Invalid state transition
 *       404:
 *         description: Order not found
 */
router.put('/:id/confirm', orderController.confirmOrder);

/**
 * @swagger
 * /api/orders/{id}/prepare:
 *   put:
 *     summary: Start preparing order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order preparation started
 *       400:
 *         description: Invalid state transition
 */
router.put('/:id/prepare', orderController.startPreparing);

/**
 * @swagger
 * /api/orders/{id}/ready:
 *   put:
 *     summary: Mark order as ready
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order marked as ready
 *       400:
 *         description: Invalid state transition
 */
router.put('/:id/ready', orderController.markReady);

/**
 * @swagger
 * /api/orders/{id}/out-for-delivery:
 *   put:
 *     summary: Mark order out for delivery
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order out for delivery
 *       400:
 *         description: Invalid state transition
 */
router.put('/:id/out-for-delivery', orderController.markOutForDelivery);

/**
 * @swagger
 * /api/orders/{id}/deliver:
 *   put:
 *     summary: Mark order as delivered
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order delivered
 *       400:
 *         description: Invalid state transition
 */
router.put('/:id/deliver', orderController.markDelivered);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cancelledBy, cancellationReason]
 *             properties:
 *               cancelledBy:
 *                 type: string
 *                 enum: [CUSTOMER, RESTAURANT, SYSTEM]
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Cannot cancel terminal order
 */
router.put('/:id/cancel', orderController.cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/history:
 *   get:
 *     summary: Get order status history
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status history
 *       404:
 *         description: Order not found
 */
router.get('/:id/history', orderController.getOrderHistory);

module.exports = router;
