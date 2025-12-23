const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { validate: joiValidate } = require('../middleware/joiValidator');
const { authLimiter } = require('../middleware/rateLimiter');
const schemas = require('../validators/user.validation');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    validate,
  ],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  authController.login
);

router.get('/profile', protect, userController.getProfile);

router.put(
  '/profile',
  protect,
  joiValidate({ body: schemas.updateUser }),
  userController.updateProfile
);

module.exports = router;
