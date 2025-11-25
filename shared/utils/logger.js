const winston = require('winston');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const createLogger = (serviceName) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            let msg = `${timestamp} [${service}] ${level}: ${message}`;
            if (Object.keys(meta).length > 0) {
              msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
          })
        ),
      }),
      new winston.transports.File({ 
        filename: `logs/${serviceName}-error.log`, 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: `logs/${serviceName}-combined.log` 
      }),
    ],
  });
};

module.exports = createLogger;
