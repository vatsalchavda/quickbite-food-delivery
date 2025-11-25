const amqp = require('amqplib');

class EventSubscriber {
  constructor(serviceName, logger) {
    this.serviceName = serviceName;
    this.logger = logger;
    this.connection = null;
    this.channel = null;
    this.exchange = 'quickbite_events';
    this.handlers = new Map();
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      
      this.logger.info('EventSubscriber connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect EventSubscriber to RabbitMQ', { error: error.message });
      throw error;
    }
  }

  async subscribe(eventType, handler) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const queueName = `${this.serviceName}.${eventType}`;
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, this.exchange, eventType);

      this.handlers.set(eventType, handler);

      this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            this.logger.info('Event received', { 
              eventType: event.type, 
              eventId: event.id 
            });

            await handler(event);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing event', { 
              error: error.message,
              eventType 
            });
            // Reject and requeue on failure
            this.channel.nack(msg, false, true);
          }
        }
      });

      this.logger.info('Subscribed to event', { eventType, queueName });
    } catch (error) {
      this.logger.error('Failed to subscribe to event', { 
        error: error.message, 
        eventType 
      });
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.logger.info('EventSubscriber connection closed');
    } catch (error) {
      this.logger.error('Error closing EventSubscriber connection', { error: error.message });
    }
  }
}

module.exports = EventSubscriber;
