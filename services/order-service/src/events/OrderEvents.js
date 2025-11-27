const BaseEvent = require('../shared/events/BaseEvent');

/**
 * Event Types for Order Service
 * These events follow the past-tense naming convention (what happened)
 * and enable choreography-based saga pattern
 */

class OrderCreatedEvent extends BaseEvent {
  constructor(order) {
    super('order.created', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      restaurantId: order.restaurantId.toString(),
      items: order.items,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      pricing: order.pricing,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      createdAt: order.createdAt
    });
  }
}

class OrderConfirmedEvent extends BaseEvent {
  constructor(order) {
    super('order.confirmed', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      restaurantId: order.restaurantId.toString(),
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      confirmedAt: new Date().toISOString()
    });
  }
}

class OrderPreparingEvent extends BaseEvent {
  constructor(order) {
    super('order.preparing', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      restaurantId: order.restaurantId.toString(),
      preparingAt: new Date().toISOString()
    });
  }
}

class OrderReadyEvent extends BaseEvent {
  constructor(order) {
    super('order.ready', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      restaurantId: order.restaurantId.toString(),
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      readyAt: new Date().toISOString()
    });
  }
}

class OrderOutForDeliveryEvent extends BaseEvent {
  constructor(order) {
    super('order.out_for_delivery', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      driverId: order.driverId?.toString(),
      deliveryAddress: order.deliveryAddress,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      outForDeliveryAt: new Date().toISOString()
    });
  }
}

class OrderDeliveredEvent extends BaseEvent {
  constructor(order) {
    super('order.delivered', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      restaurantId: order.restaurantId.toString(),
      driverId: order.driverId?.toString(),
      deliveredAt: order.actualDeliveryTime || new Date().toISOString()
    });
  }
}

class OrderCancelledEvent extends BaseEvent {
  constructor(order) {
    super('order.cancelled', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerId: order.customerId.toString(),
      restaurantId: order.restaurantId.toString(),
      cancelledBy: order.cancelledBy,
      cancellationReason: order.cancellationReason,
      cancelledAt: new Date().toISOString()
    });
  }
}

module.exports = {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderPreparingEvent,
  OrderReadyEvent,
  OrderOutForDeliveryEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent
};
