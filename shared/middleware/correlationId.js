const { v4: uuidv4 } = require('uuid');

const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

module.exports = correlationIdMiddleware;
