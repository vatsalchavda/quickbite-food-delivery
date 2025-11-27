const CircuitBreaker = require('opossum');
const axios = require('axios');
const logger = require('../config/logger');

/**
 * Circuit Breaker Configuration
 */

const circuitBreakerOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10,
  volumeThreshold: 5,
  name: 'service-call'
};

const httpCall = async (url, options = {}) => {
  try {
    const response = await axios({
      url,
      ...options,
      timeout: options.timeout || 5000
    });
    return response.data;
  } catch (error) {
    logger.error('HTTP call failed', {
      url,
      error: error.message,
      status: error.response?.status
    });
    throw error;
  }
};

const serviceBreakers = new Map();

const getCircuitBreaker = (serviceName) => {
  if (!serviceBreakers.has(serviceName)) {
    const breaker = new CircuitBreaker(httpCall, {
      ...circuitBreakerOptions,
      name: serviceName
    });

    breaker.on('open', () => {
      logger.error(`Circuit breaker OPENED for ${serviceName}`, {
        service: serviceName,
        state: 'OPEN'
      });
    });

    breaker.on('halfOpen', () => {
      logger.warn(`Circuit breaker HALF-OPEN for ${serviceName}`, {
        service: serviceName,
        state: 'HALF_OPEN'
      });
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${serviceName}`, {
        service: serviceName,
        state: 'CLOSED'
      });
    });

    serviceBreakers.set(serviceName, breaker);
  }

  return serviceBreakers.get(serviceName);
};

const callWithCircuitBreaker = async (serviceName, url, options = {}) => {
  const breaker = getCircuitBreaker(serviceName);
  
  try {
    const data = await breaker.fire(url, options);
    return data;
  } catch (error) {
    if (error.message === 'Breaker is open') {
      logger.error('Circuit breaker is open, failing fast', {
        service: serviceName,
        url
      });
      throw new Error(`${serviceName} is currently unavailable`);
    }
    throw error;
  }
};

const getCircuitBreakerStats = () => {
  const stats = {};
  
  serviceBreakers.forEach((breaker, serviceName) => {
    stats[serviceName] = {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker.stats
    };
  });
  
  return stats;
};

module.exports = {
  callWithCircuitBreaker,
  getCircuitBreakerStats
};
