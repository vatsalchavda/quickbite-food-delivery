const amqp = require('amqplib');

class EventPublisher {
  constructor(logger) {
    this.logger = logger;
    this.connection = null;
    this.channel = null;
    this.exchange = 'quickbite_events';
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      
      this.logger.info('EventPublisher connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect EventPublisher to RabbitMQ', { error: error.message });
      throw error;
    }
  }

  async publish(event) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const routingKey = event.type;
      const message = JSON.stringify(event.toJSON());

      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(message),
        { persistent: true }
      );

      this.logger.info('Event published', { 
        eventType: event.type, 
        eventId: event.id 
      });
    } catch (error) {
      this.logger.error('Failed to publish event', { 
        error: error.message, 
        eventType: event.type 
      });
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.logger.info('EventPublisher connection closed');
    } catch (error) {
      this.logger.error('Error closing EventPublisher connection', { error: error.message });
    }
  }
}

module.exports = EventPublisher;
