const Restaurant = require('../models/Restaurant');
const cacheService = require('../config/redis');
const logger = require('../config/logger');

// See docs/KNOWLEDGE_BASE.md for caching concepts

class RestaurantController {
  /**
   * Create a new restaurant
   * Cache Strategy: Invalidate list caches since new restaurant affects listings
   */
  async createRestaurant(req, res) {
    try {
      const restaurant = new Restaurant(req.body);
      await restaurant.save();

      // Invalidate all list/search caches
      await cacheService.delPattern('restaurants:list:*');
      await cacheService.delPattern('restaurants:search:*');

      logger.info('Restaurant created', {
        restaurantId: restaurant._id,
        name: restaurant.name
      });

      res.status(201).json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      logger.error('Create restaurant failed', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all restaurants with pagination
   * Cache Strategy: Cache-aside with 5-minute TTL
   */
  async getRestaurants(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const cacheKey = `restaurants:list:page:${page}:limit:${limit}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Cache hit', { key: cacheKey });
        return res.json({
          success: true,
          source: 'cache',
          ...cached
        });
      }

      // Cache miss - query database
      logger.info('Cache miss', { key: cacheKey });

      const [restaurants, total] = await Promise.all([
        Restaurant.find({ isActive: true })
          .select('-menuItems') // Exclude menu items for list view
          .skip(skip)
          .limit(limit)
          .lean(),
        Restaurant.countDocuments({ isActive: true })
      ]);

      const result = {
        data: restaurants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Populate cache with 5-minute TTL
      await cacheService.set(cacheKey, result, 300);

      res.json({
        success: true,
        source: 'database',
        ...result
      });
    } catch (error) {
      logger.error('Get restaurants failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants'
      });
    }
  }

  /**
   * Get restaurant by ID with full menu
   * Cache Strategy: Cache-aside with 10-minute TTL
   */
  async getRestaurantById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `restaurant:${id}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Cache hit', { key: cacheKey });
        return res.json({
          success: true,
          source: 'cache',
          data: cached
        });
      }

      // Cache miss - query database
      logger.info('Cache miss', { key: cacheKey });

      const restaurant = await Restaurant.findById(id).lean();

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      // Populate cache with 10-minute TTL (detail pages accessed frequently)
      await cacheService.set(cacheKey, restaurant, 600);

      res.json({
        success: true,
        source: 'database',
        data: restaurant
      });
    } catch (error) {
      logger.error('Get restaurant failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurant'
      });
    }
  }

  /**
   * Update restaurant
   * Cache Strategy: Invalidate specific restaurant and all list caches
   */
  async updateRestaurant(req, res) {
    try {
      const { id } = req.params;

      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      // Invalidate caches
      await cacheService.del(`restaurant:${id}`);
      await cacheService.delPattern('restaurants:list:*');
      await cacheService.delPattern('restaurants:search:*');

      logger.info('Restaurant updated', {
        restaurantId: id,
        name: restaurant.name
      });

      res.json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      logger.error('Update restaurant failed', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete restaurant (soft delete)
   * Cache Strategy: Invalidate all related caches
   */
  async deleteRestaurant(req, res) {
    try {
      const { id } = req.params;

      const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      // Invalidate all caches
      await cacheService.del(`restaurant:${id}`);
      await cacheService.delPattern('restaurants:list:*');
      await cacheService.delPattern('restaurants:search:*');

      logger.info('Restaurant deleted', {
        restaurantId: id,
        name: restaurant.name
      });

      res.json({
        success: true,
        message: 'Restaurant deleted successfully'
      });
    } catch (error) {
      logger.error('Delete restaurant failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete restaurant'
      });
    }
  }

  /**
   * Search restaurants by text (name, description, cuisine)
   * Cache Strategy: Cache search results with 2-minute TTL (searches vary frequently)
   */
  async searchRestaurants(req, res) {
    try {
      const { query, cuisine } = req.query;

      if (!query && !cuisine) {
        return res.status(400).json({
          success: false,
          error: 'Search query or cuisine required'
        });
      }

      // Build cache key from search params
      const cacheKey = `restaurants:search:${query || ''}:${cuisine || ''}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Cache hit', { key: cacheKey });
        return res.json({
          success: true,
          source: 'cache',
          data: cached
        });
      }

      // Cache miss - build query
      logger.info('Cache miss', { key: cacheKey });

      const searchQuery = { isActive: true };

      if (query) {
        searchQuery.$text = { $search: query };
      }

      if (cuisine) {
        searchQuery.cuisineType = cuisine;
      }

      const restaurants = await Restaurant.find(searchQuery)
        .select('-menuItems')
        .limit(50)
        .lean();

      // Cache with shorter TTL (2 min) since search patterns vary
      await cacheService.set(cacheKey, restaurants, 120);

      res.json({
        success: true,
        source: 'database',
        data: restaurants,
        count: restaurants.length
      });
    } catch (error) {
      logger.error('Search restaurants failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }

  /**
   * Get restaurants by cuisine type
   * Cache Strategy: Cache-aside with 5-minute TTL
   */
  async getRestaurantsByCuisine(req, res) {
    try {
      const { cuisine } = req.params;
      const cacheKey = `restaurants:cuisine:${cuisine}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Cache hit', { key: cacheKey });
        return res.json({
          success: true,
          source: 'cache',
          data: cached
        });
      }

      // Cache miss
      logger.info('Cache miss', { key: cacheKey });

      const restaurants = await Restaurant.find({
        cuisineType: cuisine,
        isActive: true
      })
        .select('-menuItems')
        .lean();

      // Cache with 5-minute TTL
      await cacheService.set(cacheKey, restaurants, 300);

      res.json({
        success: true,
        source: 'database',
        data: restaurants,
        count: restaurants.length
      });
    } catch (error) {
      logger.error('Get by cuisine failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants'
      });
    }
  }

  /**
   * Add menu item to restaurant
   * Cache Strategy: Invalidate restaurant cache
   */
  async addMenuItem(req, res) {
    try {
      const { id } = req.params;
      const menuItem = req.body;

      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      restaurant.menuItems.push(menuItem);
      restaurant.updatedAt = new Date();
      await restaurant.save();

      // Invalidate cache
      await cacheService.del(`restaurant:${id}`);

      logger.info('Menu item added', {
        restaurantId: id,
        itemName: menuItem.name
      });

      res.status(201).json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      logger.error('Add menu item failed', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update menu item
   * Cache Strategy: Invalidate restaurant cache
   */
  async updateMenuItem(req, res) {
    try {
      const { id, itemId } = req.params;

      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      const menuItem = restaurant.menuItems.id(itemId);

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
      }

      Object.assign(menuItem, req.body);
      restaurant.updatedAt = new Date();
      await restaurant.save();

      // Invalidate cache
      await cacheService.del(`restaurant:${id}`);

      logger.info('Menu item updated', {
        restaurantId: id,
        itemId,
        itemName: menuItem.name
      });

      res.json({
        success: true,
        data: restaurant
      });
    } catch (error) {
      logger.error('Update menu item failed', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete menu item
   * Cache Strategy: Invalidate restaurant cache
   */
  async deleteMenuItem(req, res) {
    try {
      const { id, itemId } = req.params;

      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }

      restaurant.menuItems.pull(itemId);
      restaurant.updatedAt = new Date();
      await restaurant.save();

      // Invalidate cache
      await cacheService.del(`restaurant:${id}`);

      logger.info('Menu item deleted', {
        restaurantId: id,
        itemId
      });

      res.json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      logger.error('Delete menu item failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu item'
      });
    }
  }
}

module.exports = new RestaurantController();
