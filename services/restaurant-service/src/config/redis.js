const { createClient } = require('redis');

/**
 * RedisCache - Wrapper class for Redis operations with cache-aside pattern
 * See docs/KNOWLEDGE_BASE.md for caching concepts and design patterns
 */
class RedisCache {
  constructor(logger) {
    this.client = null;
    this.logger = logger;
    this.isConnected = false;
  }

  async connect(redisUrl) {
    try {
      this.client = createClient({
        url: redisUrl,
      });

      // Event handlers for monitoring cache health
      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error', { error: err?.message || String(err) });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.info('Redis Client Ready');
      });

      this.client.on('end', () => {
        this.logger.warn('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      this.logger.error('Failed to connect to Redis', { error: error?.message || String(error) });
      throw error;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      this.logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      this.logger.error('Redis get error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      this.logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      this.logger.error('Redis set error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache delete');
      return false;
    }

    try {
      await this.client.del(key);
      this.logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      this.logger.error('Redis delete error', { key, error: error.message });
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache pattern delete');
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      }
      return true;
    } catch (error) {
      this.logger.error('Redis delete pattern error', { pattern, error: error.message });
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis Client Disconnected');
    }
  }
}

const logger = require('./logger');
const redisUrl = process.env.REDIS_URL || 'redis://quickbite-redis:6379';

module.exports = new RedisCache(logger);
