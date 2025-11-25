const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UnauthorizedError, asyncHandler } = require('../../shared/utils/errorHandler');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError(`Role ${req.user.role} is not authorized to access this route`);
    }
    next();
  };
};
