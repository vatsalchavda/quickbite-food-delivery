const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management with Redis caching
 */

/**
 * @swagger
 * /api/restaurants:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - cuisineType
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Pizza Palace"
 *               description:
 *                 type: string
 *                 example: "Authentic Italian pizza and pasta"
 *               cuisineType:
 *                 type: string
 *                 example: "Italian"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main St"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 40.7128
 *                       lng:
 *                         type: number
 *                         example: -74.0060
 *               phone:
 *                 type: string
 *                 example: "+1-555-123-4567"
 *               email:
 *                 type: string
 *                 example: "contact@pizzapalace.com"
 *               openingHours:
 *                 type: object
 *                 properties:
 *                   monday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                         example: "09:00"
 *                       close:
 *                         type: string
 *                         example: "22:00"
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', restaurantController.createRestaurant);

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Get all restaurants with pagination
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of restaurants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 source:
 *                   type: string
 *                   enum: [cache, database]
 *                   description: Data source (cache hit or database query)
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', restaurantController.getRestaurants);

/**
 * @swagger
 * /api/restaurants/search:
 *   get:
 *     summary: Search restaurants by text or cuisine
 *     tags: [Restaurants]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search text (name, description)
 *         example: "pizza"
 *       - in: query
 *         name: cuisine
 *         schema:
 *           type: string
 *         description: Cuisine type filter
 *         example: "Italian"
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 source:
 *                   type: string
 *                   enum: [cache, database]
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 *                 count:
 *                   type: integer
 *       400:
 *         description: Missing search parameters
 */
router.get('/search', restaurantController.searchRestaurants);

/**
 * @swagger
 * /api/restaurants/cuisine/{cuisine}:
 *   get:
 *     summary: Get restaurants by cuisine type
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: cuisine
 *         required: true
 *         schema:
 *           type: string
 *         description: Cuisine type
 *         example: "Italian"
 *     responses:
 *       200:
 *         description: Restaurants of specified cuisine
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 source:
 *                   type: string
 *                   enum: [cache, database]
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Restaurant'
 *                 count:
 *                   type: integer
 */
router.get('/cuisine/:cuisine', restaurantController.getRestaurantsByCuisine);

/**
 * @swagger
 * /api/restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID with full menu
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 source:
 *                   type: string
 *                   enum: [cache, database]
 *                 data:
 *                   $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id', restaurantController.getRestaurantById);

/**
 * @swagger
 * /api/restaurants/{id}:
 *   put:
 *     summary: Update restaurant
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               cuisineType:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       404:
 *         description: Restaurant not found
 */
router.put('/:id', restaurantController.updateRestaurant);

/**
 * @swagger
 * /api/restaurants/{id}:
 *   delete:
 *     summary: Delete restaurant (soft delete)
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *       404:
 *         description: Restaurant not found
 */
router.delete('/:id', restaurantController.deleteRestaurant);

/**
 * @swagger
 * /api/restaurants/{id}/menu:
 *   post:
 *     summary: Add menu item to restaurant
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Margherita Pizza"
 *               description:
 *                 type: string
 *                 example: "Classic tomato, mozzarella, and basil"
 *               price:
 *                 type: number
 *                 example: 12.99
 *               category:
 *                 type: string
 *                 example: "Pizza"
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/margherita.jpg"
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *               dietaryInfo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["vegetarian"]
 *     responses:
 *       201:
 *         description: Menu item added successfully
 *       404:
 *         description: Restaurant not found
 */
router.post('/:id/menu', restaurantController.addMenuItem);

/**
 * @swagger
 * /api/restaurants/{id}/menu/{itemId}:
 *   put:
 *     summary: Update menu item
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *       404:
 *         description: Restaurant or menu item not found
 */
router.put('/:id/menu/:itemId', restaurantController.updateMenuItem);

/**
 * @swagger
 * /api/restaurants/{id}/menu/{itemId}:
 *   delete:
 *     summary: Delete menu item
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *       404:
 *         description: Restaurant or menu item not found
 */
router.delete('/:id/menu/:itemId', restaurantController.deleteMenuItem);

module.exports = router;
