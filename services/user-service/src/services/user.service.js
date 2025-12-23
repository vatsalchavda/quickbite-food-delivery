const User = require('../models/User');
const { ConflictError, NotFoundError } = require('../../shared/utils/errorHandler');

const buildFilters = ({ role, isActive, search, city, state }) => {
  const filter = {};
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (city) filter['address.city'] = city;
  if (state) filter['address.state'] = state;
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }
  return filter;
};

const buildSort = (sortStr = '-createdAt') => {
  const allowList = new Set(['createdAt', 'name', 'email']);
  return sortStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((field) => {
      const direction = field.startsWith('-') ? -1 : 1;
      const name = field.replace(/^[-+]/, '');
      if (!allowList.has(name)) return null;
      return [name, direction];
    })
    .filter(Boolean)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
};

async function createUser(payload) {
  try {
    // Unique email enforced by index; catch conflict
    const user = await User.create(payload);
    return user;
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
}

async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function updateUserById(id, updates) {
  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
}

async function deleteUserById(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function listUsers({ role, isActive, search, city, state, sort, page = 1, limit = 10 }) {
  const filter = buildFilters({ role, isActive, search, city, state });
  const sortObj = buildSort(sort);

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort(sortObj).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  };
}

module.exports = {
  createUser,
  getUserById,
  updateUserById,
  deleteUserById,
  listUsers,
};
