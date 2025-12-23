const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/joiValidator');
const userController = require('../controllers/user.controller');
const schemas = require('../validators/user.validation');

const router = express.Router();

// Create user (admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  validate({ body: schemas.createUser }),
  userController.createUser
);

// List users with filters/sort/pagination (admin only)
router.get(
  '/',
  protect,
  authorize('admin'),
  validate({ query: schemas.listUsers }),
  userController.listUsers
);

// Get user by id (admin only)
router.get(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  userController.getUser
);

// Update user by id (admin only)
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: schemas.idParam, body: schemas.updateUser }),
  userController.updateUser
);

// Delete user by id (admin only)
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: schemas.idParam }),
  userController.deleteUser
);

module.exports = router;
