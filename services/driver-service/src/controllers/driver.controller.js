const Driver = require('../models/Driver');
const logger = require('../config/logger');

/**
 * Driver Controller
 * Handles driver CRUD, location updates, and geospatial queries
 */

/**
 * Create new driver
 */
exports.createDriver = async (req, res) => {
  try {
    const { name, email, phone, vehicle, currentLocation } = req.body;
    
    const driver = new Driver({
      name,
      email,
      phone,
      vehicle,
      currentLocation: {
        type: 'Point',
        coordinates: currentLocation.coordinates // [longitude, latitude]
      }
    });
    
    await driver.save();
    
    logger.info('Driver created', { driverId: driver._id, email });
    
    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: { driver }
    });
  } catch (error) {
    logger.error('Create driver failed', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all drivers with filtering
 */
exports.getDrivers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { isActive: true };
    if (status) query.status = status;
    
    const drivers = await Driver.find(query)
      .select('-locationHistory')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Driver.countDocuments(query);
    
    res.json({
      success: true,
      data: drivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get drivers failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get driver by ID
 */
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    res.json({
      success: true,
      data: { driver }
    });
  } catch (error) {
    logger.error('Get driver failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update driver location
 * This would typically be called frequently (every 10-30 seconds) by driver app
 */
exports.updateLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    await driver.updateLocation(longitude, latitude);
    
    logger.debug('Driver location updated', {
      driverId: driver._id,
      location: [longitude, latitude]
    });
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: driver.currentLocation,
        lastUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    logger.error('Update location failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Find nearby drivers
 * Critical for order assignment - finds closest available drivers
 */
exports.findNearby = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5, limit = 10 } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }
    
    const drivers = await Driver.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      parseInt(limit)
    );
    
    logger.info('Nearby drivers query', {
      location: [longitude, latitude],
      found: drivers.length
    });
    
    res.json({
      success: true,
      data: drivers,
      count: drivers.length
    });
  } catch (error) {
    logger.error('Find nearby drivers failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Set driver status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: available, busy, or offline'
      });
    }
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    driver.status = status;
    await driver.save();
    
    logger.info('Driver status updated', {
      driverId: driver._id,
      status
    });
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: { status: driver.status }
    });
  } catch (error) {
    logger.error('Update status failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Assign order to driver
 */
exports.assignOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    if (driver.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Driver is not available'
      });
    }
    
    await driver.assignOrder(orderId);
    
    logger.info('Order assigned to driver', {
      driverId: driver._id,
      orderId
    });
    
    res.json({
      success: true,
      message: 'Order assigned successfully',
      data: {
        driverId: driver._id,
        orderId: driver.currentOrderId,
        status: driver.status
      }
    });
  } catch (error) {
    logger.error('Assign order failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Complete delivery
 */
exports.completeDelivery = async (req, res) => {
  try {
    const { onTime = true } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    if (!driver.currentOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Driver has no active delivery'
      });
    }
    
    const orderId = driver.currentOrderId;
    await driver.completeDelivery(onTime);
    
    logger.info('Delivery completed', {
      driverId: driver._id,
      orderId,
      onTime
    });
    
    res.json({
      success: true,
      message: 'Delivery completed successfully',
      data: {
        totalDeliveries: driver.metrics.totalDeliveries,
        onTimeRate: driver.metrics.onTimeDeliveryRate,
        status: driver.status
      }
    });
  } catch (error) {
    logger.error('Complete delivery failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update driver rating
 */
exports.updateRating = async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    await driver.updateRating(rating);
    
    logger.info('Driver rating updated', {
      driverId: driver._id,
      newRating: rating,
      averageRating: driver.metrics.rating.average
    });
    
    res.json({
      success: true,
      message: 'Rating updated successfully',
      data: {
        rating: driver.metrics.rating
      }
    });
  } catch (error) {
    logger.error('Update rating failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
