const User = require('../models/User');
const { ValidationError, UnauthorizedError, ConflictError, asyncHandler } = require('../../shared/utils/errorHandler');
const BaseEvent = require('../../shared/events/BaseEvent');
const { generateToken } = require('../services/auth.service');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    // Create user (unique email enforced by index)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
    });

    // Publish UserRegistered event
    const event = new BaseEvent('user.registered', {
      userId: user._id,
      email: user.email,
      name: user.name,
    });
    
    await req.eventPublisher.publish(event);

    // Generate token
    const token = generateToken(user._id);

    req.logger.info('User registered successfully', { userId: user._id, email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError('Please provide email and password');
  }

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  // Generate token
  const token = generateToken(user._id);

  req.logger.info('User logged in successfully', { userId: user._id, email });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token,
    },
  });
});
