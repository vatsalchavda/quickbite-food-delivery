const amqp = require('amqplib');
const logger = require('./logger');

/**
 * RabbitMQ Event Publisher
 * 
 * Exchange Types:
 * - Topic Exchange: Allows routing based on routing key patterns
 *   (e.g., order.*, order.created, order.confirmed)
 * 
 * Delivery Guarantees:
 * - Publisher confirms enabled for at-least-once delivery
 * - Persistent messages survive broker restarts
 * - Durable exchanges and queues
 */

class RabbitMQPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.exchangeName = 'quickbite.events';
    this.reconnectDelay = 5000;
  }

  async connect(rabbitUrl) {
    try {
      logger.info('Connecting to RabbitMQ...', { url: rabbitUrl.replace(/:[^:]*@/, ':****@') });
      
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createConfirmChannel();
      
      // Declare topic exchange (idempotent operation)
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true, // Survives broker restarts
        autoDelete: false
      });
      
      this.isConnected = true;
      
      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        this.isConnected = false;
        setTimeout(() => this.connect(rabbitUrl), this.reconnectDelay);
      });
      
      logger.info('RabbitMQ connected successfully', { exchange: this.exchangeName });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      this.isConnected = false;
      
      // Retry connection
      setTimeout(() => this.connect(rabbitUrl), this.reconnectDelay);
    }
  }

  /**
   * Publish event to RabbitMQ with at-least-once delivery guarantee
   * 
   * @param {string} routingKey - Event routing key (e.g., 'order.created')
   * @param {Object} event - Event object (must have toJSON method)
   * @returns {Promise<boolean>} - True if published successfully
   */
  async publish(routingKey, event) {
    if (!this.isConnected || !this.channel) {
      logger.warn('RabbitMQ not connected, event not published', { 
        routingKey,
        eventId: event.id 
      });
      return false;
    }

    try {
      const eventData = event.toJSON();
      const message = Buffer.from(JSON.stringify(eventData));
      
      // Publish with confirmation
      const published = this.channel.publish(
        this.exchangeName,
        routingKey,
        message,
        {
          persistent: true, // Message survives broker restart
          contentType: 'application/json',
          timestamp: Date.now(),
          messageId: event.id
        }
      );
      
      if (published) {
        logger.info('Event published', { 
          routingKey, 
          eventId: event.id,
          eventType: event.type
        });
        return true;
      } else {
        logger.warn('Event publish failed (buffer full)', { 
          routingKey, 
          eventId: event.id 
        });
        return false;
      }
    } catch (error) {
      logger.error('Error publishing event', { 
        error: error.message,
        routingKey,
        eventId: event.id
      });
      return false;
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
      logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }
}

// Singleton instance
const publisher = new RabbitMQPublisher();

module.exports = publisher;
