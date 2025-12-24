const Restaurant = require('../models/Restaurant');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const redisClient = require('../config/redis');

// Cache TTL (Time To Live) - 5 minutes
const CACHE_TTL = 300;

// Helper function to get from cache or database
const getFromCacheOrDB = async (key, dbQuery) => {
  try {
    // Try to get from cache
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return { data: JSON.parse(cachedData), source: 'cache' };
    }

    // If not in cache, get from database
    const data = await dbQuery();
    
    // Store in cache
    await redisClient.setex(key, CACHE_TTL, JSON.stringify(data));
    
    return { data, source: 'database' };
  } catch (error) {
    // If Redis fails, just use database
    const data = await dbQuery();
    return { data, source: 'database' };
  }
};

// Helper function to invalidate cache
const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Create restaurant
const createRestaurant = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if restaurant with email already exists
  const existingRestaurant = await Restaurant.findOne({ email });
  if (existingRestaurant) {
    throw new AppError('Restaurant with this email already exists', 400);
  }

  const restaurant = await Restaurant.create(req.body);

  // Invalidate restaurants list cache
  await invalidateCache('restaurants:*');

  res.status(201).json({
    success: true,
    data: restaurant,
    message: 'Restaurant created successfully'
  });
});

// Get all restaurants with pagination
const getRestaurants = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const cacheKey = `restaurants:all:page:${page}:limit:${limit}`;

  const { data, source } = await getFromCacheOrDB(cacheKey, async () => {
    const restaurants = await Restaurant.find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .select('-menu');
    
    const total = await Restaurant.countDocuments({ isActive: true });

    return {
      restaurants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  });

  res.status(200).json({
    success: true,
    source,
    data: data.restaurants,
    pagination: data.pagination
  });
});

// Search restaurants
const searchRestaurants = asyncHandler(async (req, res) => {
  const { query, cuisine } = req.query;

  if (!query && !cuisine) {
    throw new AppError('Please provide search query or cuisine type', 400);
  }

  const cacheKey = `restaurants:search:${query || ''}:${cuisine || ''}`;

  const { data: restaurants, source } = await getFromCacheOrDB(cacheKey, async () => {
    const filter = { isActive: true };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (cuisine) {
      filter.cuisineType = { $regex: cuisine, $options: 'i' };
    }

    return await Restaurant.find(filter).select('-menu');
  });

  res.status(200).json({
    success: true,
    source,
    data: restaurants,
    count: restaurants.length
  });
});

// Get restaurants by cuisine
const getRestaurantsByCuisine = asyncHandler(async (req, res) => {
  const { cuisine } = req.params;

  const cacheKey = `restaurants:cuisine:${cuisine}`;

  const { data: restaurants, source } = await getFromCacheOrDB(cacheKey, async () => {
    return await Restaurant.find({
      cuisineType: { $regex: cuisine, $options: 'i' },
      isActive: true
    }).select('-menu');
  });

  res.status(200).json({
    success: true,
    source,
    data: restaurants,
    count: restaurants.length
  });
});

// Get restaurant by ID
const getRestaurantById = asyncHandler(async (req, res) => {
  const cacheKey = `restaurant:${req.params.id}`;

  const { data: restaurant, source } = await getFromCacheOrDB(cacheKey, async () => {
    const found = await Restaurant.findById(req.params.id);
    if (!found) {
      throw new AppError('Restaurant not found', 404);
    }
    return found;
  });

  res.status(200).json({
    success: true,
    source,
    data: restaurant
  });
});

// Update restaurant
const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  // Invalidate cache
  await invalidateCache(`restaurant:${req.params.id}`);
  await invalidateCache('restaurants:*');

  res.status(200).json({
    success: true,
    data: restaurant,
    message: 'Restaurant updated successfully'
  });
});

// Delete restaurant (soft delete)
const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  // Invalidate cache
  await invalidateCache(`restaurant:${req.params.id}`);
  await invalidateCache('restaurants:*');

  res.status(200).json({
    success: true,
    message: 'Restaurant deleted successfully'
  });
});

// Add menu item
const addMenuItem = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  restaurant.menu.push(req.body);
  await restaurant.save();

  // Invalidate cache
  await invalidateCache(`restaurant:${req.params.id}`);

  res.status(201).json({
    success: true,
    data: restaurant,
    message: 'Menu item added successfully'
  });
});

// Update menu item
const updateMenuItem = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const menuItem = restaurant.menu.id(req.params.itemId);

  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }

  Object.assign(menuItem, req.body);
  await restaurant.save();

  // Invalidate cache
  await invalidateCache(`restaurant:${req.params.id}`);

  res.status(200).json({
    success: true,
    data: restaurant,
    message: 'Menu item updated successfully'
  });
});

// Delete menu item
const deleteMenuItem = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const menuItem = restaurant.menu.id(req.params.itemId);

  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }

  menuItem.remove();
  await restaurant.save();

  // Invalidate cache
  await invalidateCache(`restaurant:${req.params.id}`);

  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully'
  });
});

module.exports = {
  createRestaurant,
  getRestaurants,
  searchRestaurants,
  getRestaurantsByCuisine,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem
};
