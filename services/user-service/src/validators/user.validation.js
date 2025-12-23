const Joi = require('joi');

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const addressSchema = Joi.object({
  street: Joi.string().trim().allow('', null),
  city: Joi.string().trim().allow('', null),
  state: Joi.string().trim().allow('', null),
  zipCode: Joi.string().trim().allow('', null),
});

const createUser = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  role: Joi.string().valid('customer', 'admin').default('customer'),
  address: addressSchema.default({}),
  isActive: Joi.boolean().default(true),
});

const updateUser = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  phone: Joi.string().pattern(/^\d{10}$/),
  role: Joi.string().valid('customer', 'admin'),
  address: addressSchema,
  isActive: Joi.boolean(),
}).min(1);

const listUsers = Joi.object({
  role: Joi.string().valid('customer', 'admin'),
  isActive: Joi.boolean().truthy('true').falsy('false'),
  search: Joi.string().trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim(),
  sort: Joi.string().trim().default('-createdAt'), // e.g., -createdAt,name
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = {
  idParam,
  createUser,
  updateUser,
  listUsers,
};
