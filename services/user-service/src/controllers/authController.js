const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ValidationError, UnauthorizedError, ConflictError, asyncHandler } = require('../../shared/utils/errorHandler');
const BaseEvent = require('../../shared/events/BaseEvent');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Create user
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

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    data: { user },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone, address },
    { new: true, runValidators: true }
  );

  req.logger.info('User profile updated', { userId: user._id });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});
