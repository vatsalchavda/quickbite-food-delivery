const { validationResult } = require('express-validator');
const { ValidationError } = require('../../shared/utils/errorHandler');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new ValidationError(errorMessages);
  }
  next();
};
