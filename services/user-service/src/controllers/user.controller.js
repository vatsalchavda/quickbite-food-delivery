const { asyncHandler } = require('../../shared/utils/errorHandler');
const userService = require('../services/user.service');

exports.createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, message: 'User created', data: { user } });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, data: { user } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserById(req.params.id, req.body);
  res.json({ success: true, message: 'User updated', data: { user } });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUserById(req.params.id);
  res.status(204).send();
});

exports.listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.query);
  res.json({ success: true, data: result });
});

// Profile endpoints (accessible to authenticated users)
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.json({ success: true, data: { user } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserById(req.user.id, req.body);
  req.logger.info('User profile updated', { userId: user._id });
  res.json({ success: true, message: 'Profile updated successfully', data: { user } });
});
