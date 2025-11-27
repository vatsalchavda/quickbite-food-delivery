const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');

/**
 * Driver Routes
 */

// Create driver
router.post('/', driverController.createDriver);

// Get all drivers
router.get('/', driverController.getDrivers);

// Find nearby drivers (geospatial query)
router.get('/nearby', driverController.findNearby);

// Get driver by ID
router.get('/:id', driverController.getDriverById);

// Update driver location
router.put('/:id/location', driverController.updateLocation);

// Update driver status
router.put('/:id/status', driverController.updateStatus);

// Assign order to driver
router.put('/:id/assign', driverController.assignOrder);

// Complete delivery
router.put('/:id/complete', driverController.completeDelivery);

// Update driver rating
router.put('/:id/rating', driverController.updateRating);

module.exports = router;
