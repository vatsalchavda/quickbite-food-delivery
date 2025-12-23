const Joi = require('joi');
const { ValidationError } = require('../../shared/utils/errorHandler');

// Validate request using Joi schemas for body/query/params (any combination)
// Usage: validate({ body: schema, query: schema, params: schema })
module.exports.validate = (schemas = {}) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) throw new ValidationError(error.details.map(d => d.message).join(', '));
        req.body = value;
      }

      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, { abortEarly: false, stripUnknown: true });
        if (error) throw new ValidationError(error.details.map(d => d.message).join(', '));
        req.query = value;
      }

      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, { abortEarly: false, stripUnknown: true });
        if (error) throw new ValidationError(error.details.map(d => d.message).join(', '));
        req.params = value;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
