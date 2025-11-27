const logger = require('../config/logger');

/**
 * Notification Templates
 * 
 * In production, these would be:
 * - Stored in database or templating service
 * - Support multiple languages
 * - Include HTML/SMS/Push variants
 */

const templates = {
  'order.created': {
    subject: 'Order Confirmed - #{orderNumber}',
    body: 'Hi {customerName}, your order #{orderNumber} has been placed successfully. Total: ${total}. We\'ll notify you when the restaurant confirms.',
    sms: 'Order #{orderNumber} confirmed. Total: ${total}. Track at: {trackingUrl}',
    push: {
      title: 'Order Placed!',
      body: 'Order #{orderNumber} confirmed. Total: ${total}'
    }
  },
  
  'order.confirmed': {
    subject: 'Restaurant Confirmed Your Order - #{orderNumber}',
    body: 'Good news {customerName}! The restaurant has confirmed your order #{orderNumber}. Estimated time: {estimatedTime} minutes.',
    sms: 'Restaurant confirmed order #{orderNumber}. ETA: {estimatedTime} min',
    push: {
      title: 'Order Confirmed!',
      body: 'Restaurant is preparing your order. ETA: {estimatedTime} min'
    }
  },
  
  'order.preparing': {
    subject: 'Your Food is Being Prepared - #{orderNumber}',
    body: 'Your order #{orderNumber} is now being prepared by the restaurant. It will be ready soon!',
    sms: 'Order #{orderNumber} is being prepared',
    push: {
      title: 'Order in Kitchen',
      body: 'Your food is being prepared now!'
    }
  },
  
  'order.ready': {
    subject: 'Order Ready for Pickup - #{orderNumber}',
    body: 'Your order #{orderNumber} is ready! A driver will pick it up shortly.',
    sms: 'Order #{orderNumber} ready. Driver assigned',
    push: {
      title: 'Order Ready!',
      body: 'Driver will pick up your order soon'
    }
  },
  
  'order.out_for_delivery': {
    subject: 'Your Order is On the Way - #{orderNumber}',
    body: 'Great news {customerName}! Your order #{orderNumber} is out for delivery. Driver: {driverName} ({driverPhone}). Track your order in real-time.',
    sms: 'Order #{orderNumber} out for delivery. Driver: {driverName}',
    push: {
      title: 'Order On the Way!',
      body: 'Your driver {driverName} is on the way'
    }
  },
  
  'order.delivered': {
    subject: 'Order Delivered - #{orderNumber}',
    body: 'Your order #{orderNumber} has been delivered. Enjoy your meal {customerName}! Please rate your experience.',
    sms: 'Order #{orderNumber} delivered. Enjoy!',
    push: {
      title: 'Order Delivered!',
      body: 'Enjoy your meal! Rate your experience'
    }
  },
  
  'order.cancelled': {
    subject: 'Order Cancelled - #{orderNumber}',
    body: 'Your order #{orderNumber} has been cancelled. Reason: {reason}. If you were charged, refund will be processed in 3-5 business days.',
    sms: 'Order #{orderNumber} cancelled. Reason: {reason}',
    push: {
      title: 'Order Cancelled',
      body: 'Order #{orderNumber} cancelled. {reason}'
    }
  }
};

/**
 * Replace template variables with actual data
 */
function renderTemplate(template, data) {
  let rendered = template;
  
  // Replace {variable} with actual values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    rendered = rendered.replace(regex, data[key] || '');
  });
  
  return rendered;
}

/**
 * Get notification content for an event
 */
function getNotificationContent(eventType, eventData) {
  const template = templates[eventType];
  
  if (!template) {
    logger.warn('No template found for event type', { eventType });
    return null;
  }
  
  const data = {
    customerName: eventData.customerName || 'Customer',
    orderNumber: eventData.orderNumber,
    total: eventData.total,
    estimatedTime: eventData.estimatedTime || 30,
    driverName: eventData.driverName || '',
    driverPhone: eventData.driverPhone || '',
    reason: eventData.reason || '',
    trackingUrl: `https://quickbite.com/track/${eventData.orderId}`
  };
  
  return {
    subject: renderTemplate(template.subject, data),
    body: renderTemplate(template.body, data),
    sms: renderTemplate(template.sms, data),
    push: {
      title: renderTemplate(template.push.title, data),
      body: renderTemplate(template.push.body, data)
    }
  };
}

module.exports = {
  getNotificationContent
};
