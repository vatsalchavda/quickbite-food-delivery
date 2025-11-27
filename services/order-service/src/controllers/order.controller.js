const Order = require('../models/Order');
const publisher = require('../config/rabbitmq');
const logger = require('../config/logger');
const {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderPreparingEvent,
  OrderReadyEvent,
  OrderOutForDeliveryEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent
} = require('../events/OrderEvents');

/**
 * Order Controller
 * 
 * Implements:
 * - State machine transitions
 * - Event publishing for choreography
 * - Idempotency handling
 */

/**
 * Create a new order
 * Publishes: OrderCreatedEvent
 */
exports.createOrder = async (req, res) => {
  try {
    const { customerId, restaurantId, items, deliveryType, deliveryAddress, pricing, specialInstructions, idempotencyKey } = req.body;

    // Idempotency check: prevent duplicate orders
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        logger.info('Duplicate order creation prevented', { 
          idempotencyKey,
          orderId: existingOrder._id 
        });
        return res.status(200).json({
          success: true,
          message: 'Order already exists (idempotency)',
          data: existingOrder
        });
      }
    }

    // Calculate estimated delivery time (30-45 minutes from now)
    const estimatedMinutes = 30 + Math.floor(Math.random() * 16);
    const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60000);

    const order = new Order({
      customerId,
      restaurantId,
      items,
      deliveryType,
      deliveryAddress,
      pricing,
      specialInstructions,
      estimatedDeliveryTime,
      idempotencyKey,
      status: 'PENDING'
    });

    await order.save();

    // Publish OrderCreatedEvent
    const event = new OrderCreatedEvent(order);
    await publisher.publish('order.created', event);

    logger.info('Order created', { 
      orderId: order._id,
      orderNumber: order.orderNumber,
      eventId: event.id
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error creating order', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Get all orders with filtering and pagination
 */
exports.getOrders = async (req, res) => {
  try {
    const { customerId, restaurantId, driverId, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (restaurantId) filter.restaurantId = restaurantId;
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching orders', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error fetching order', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Confirm order (restaurant accepts)
 * Publishes: OrderConfirmedEvent
 * Transition: PENDING -> CONFIRMED
 */
exports.confirmOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.canTransitionTo('CONFIRMED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm order in ${order.status} status`
      });
    }

    order.transitionTo('CONFIRMED', 'Restaurant accepted the order');
    await order.save();

    // Publish OrderConfirmedEvent
    const event = new OrderConfirmedEvent(order);
    await publisher.publish('order.confirmed', event);

    logger.info('Order confirmed', { 
      orderId: order._id,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error confirming order', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Start preparing order
 * Publishes: OrderPreparingEvent
 * Transition: CONFIRMED -> PREPARING
 */
exports.startPreparing = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.canTransitionTo('PREPARING')) {
      return res.status(400).json({
        success: false,
        message: `Cannot start preparing order in ${order.status} status`
      });
    }

    order.transitionTo('PREPARING', 'Restaurant started preparing the order');
    await order.save();

    // Publish OrderPreparingEvent
    const event = new OrderPreparingEvent(order);
    await publisher.publish('order.preparing', event);

    logger.info('Order preparing started', { 
      orderId: order._id,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order preparation started',
      data: order
    });
  } catch (error) {
    logger.error('Error starting order preparation', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Mark order as ready
 * Publishes: OrderReadyEvent
 * Transition: PREPARING -> READY
 */
exports.markReady = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.canTransitionTo('READY')) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark order ready in ${order.status} status`
      });
    }

    order.transitionTo('READY', 'Order is ready for pickup/delivery');
    await order.save();

    // Publish OrderReadyEvent (triggers driver assignment for delivery orders)
    const event = new OrderReadyEvent(order);
    await publisher.publish('order.ready', event);

    logger.info('Order marked as ready', { 
      orderId: order._id,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order marked as ready',
      data: order
    });
  } catch (error) {
    logger.error('Error marking order ready', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Mark order out for delivery
 * Publishes: OrderOutForDeliveryEvent
 * Transition: READY -> OUT_FOR_DELIVERY
 */
exports.markOutForDelivery = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.deliveryType !== 'DELIVERY') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark pickup order as out for delivery'
      });
    }

    if (!order.canTransitionTo('OUT_FOR_DELIVERY')) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark order out for delivery in ${order.status} status`
      });
    }

    order.driverId = driverId;
    order.transitionTo('OUT_FOR_DELIVERY', `Driver ${driverId} picked up the order`);
    await order.save();

    // Publish OrderOutForDeliveryEvent
    const event = new OrderOutForDeliveryEvent(order);
    await publisher.publish('order.out_for_delivery', event);

    logger.info('Order out for delivery', { 
      orderId: order._id,
      driverId,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order marked as out for delivery',
      data: order
    });
  } catch (error) {
    logger.error('Error marking order out for delivery', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Mark order as delivered
 * Publishes: OrderDeliveredEvent
 * Transition: OUT_FOR_DELIVERY|READY -> DELIVERED
 */
exports.markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.canTransitionTo('DELIVERED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark order delivered in ${order.status} status`
      });
    }

    order.transitionTo('DELIVERED', 'Order successfully delivered');
    await order.save();

    // Publish OrderDeliveredEvent
    const event = new OrderDeliveredEvent(order);
    await publisher.publish('order.delivered', event);

    logger.info('Order delivered', { 
      orderId: order._id,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order delivered successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error marking order delivered', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Cancel order
 * Publishes: OrderCancelledEvent
 * Transition: Any non-terminal -> CANCELLED
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { cancelledBy, cancellationReason } = req.body;

    if (!cancelledBy || !cancellationReason) {
      return res.status(400).json({
        success: false,
        message: 'cancelledBy and cancellationReason are required'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.isTerminal()) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in terminal state: ${order.status}`
      });
    }

    if (!order.canTransitionTo('CANCELLED')) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in ${order.status} status`
      });
    }

    order.cancelledBy = cancelledBy;
    order.cancellationReason = cancellationReason;
    order.transitionTo('CANCELLED', cancellationReason);
    await order.save();

    // Publish OrderCancelledEvent
    const event = new OrderCancelledEvent(order);
    await publisher.publish('order.cancelled', event);

    logger.info('Order cancelled', { 
      orderId: order._id,
      cancelledBy,
      eventId: event.id
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error cancelling order', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Get order status history
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('orderNumber status statusHistory').lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        history: order.statusHistory
      }
    });
  } catch (error) {
    logger.error('Error fetching order history', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
      error: error.message
    });
  }
};
