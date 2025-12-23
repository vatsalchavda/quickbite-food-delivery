const Joi = require('joi');

// Define required environment variables schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  API_VERSION: Joi.string().pattern(/^v\d+$/).default('v1'),
  API_BASE_PATH: Joi.string().default('/api'),
  
  // MongoDB
  MONGODB_URI: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // RabbitMQ
  RABBITMQ_URL: Joi.string().required(),
}).unknown(true); // Allow other env vars

function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const missingVars = error.details.map(detail => detail.message).join('\n  - ');
    throw new Error(`Environment validation failed:\n  - ${missingVars}`);
  }

  return value;
}

module.exports = { validateEnv };
