const amqp = require('amqplib');
const logger = require('./logger');

/**
 * RabbitMQ Event Consumer
 * 
 * Key Concepts:
 * - Consumes events from Order Service
 * - Acknowledges messages after processing (at-least-once delivery)
 * - Dead letter queue for failed messages
 * - Prefetch limit to control concurrent processing
 */

class EventConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Set prefetch - only process 1 message at a time
      // Important for rate limiting and preventing overwhelming the service
      await this.channel.prefetch(1);
      
      logger.info('RabbitMQ consumer connected successfully');
      this.isConnected = true;
      
      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        
        // Reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });
      
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', {
        error: error.message,
        stack: error.stack
      });
      this.isConnected = false;
      
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Subscribe to order events
   * 
   * Pattern: Topic Exchange with routing keys
   * - order.created
   * - order.confirmed
   * - order.preparing
   * - order.ready
   * - order.out_for_delivery
   * - order.delivered
   * - order.cancelled
   */
  async subscribeToOrderEvents(handler) {
    if (!this.isConnected) {
      logger.warn('Cannot subscribe: Not connected to RabbitMQ');
      return;
    }

    try {
      const exchange = 'quickbite.events';
      const queue = 'notification.orders';
      
      // Assert exchange exists
      await this.channel.assertExchange(exchange, 'topic', {
        durable: true
      });
      
      // Create queue for notifications
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          // Dead letter exchange for failed messages
          'x-dead-letter-exchange': 'quickbite.dlx',
          'x-dead-letter-routing-key': 'notification.failed'
        }
      });
      
      // Bind queue to exchange with pattern
      // Listen to all order.* events
      await this.channel.bindQueue(queue, exchange, 'order.*');
      
      logger.info('Subscribed to order events', { queue, pattern: 'order.*' });
      
      // Consume messages
      this.channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        try {
          const event = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          
          logger.info('Received event', {
            routingKey,
            eventType: event.eventType,
            orderId: event.data.orderId
          });
          
          // Process event with handler
          await handler(event, routingKey);
          
          // Acknowledge message (remove from queue)
          this.channel.ack(msg);
          
          logger.debug('Event processed successfully', {
            routingKey,
            orderId: event.data.orderId
          });
          
        } catch (error) {
          logger.error('Failed to process event', {
            error: error.message,
            routingKey: msg.fields.routingKey
          });
          
          // Reject message and send to dead letter queue
          // Don't requeue to avoid infinite loops
          this.channel.nack(msg, false, false);
        }
      });
      
    } catch (error) {
      logger.error('Failed to subscribe to order events', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.info('RabbitMQ consumer connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ consumer', {
        error: error.message
      });
    }
  }
}

module.exports = new EventConsumer();
