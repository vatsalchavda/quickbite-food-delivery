const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurant.controller');
const validateRequest = require('../middleware/validateRequest');
const {
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantIdSchema,
  queryRestaurantsSchema
} = require('../schemas/restaurant.schema');
const {
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemIdSchema
} = require('../schemas/menu.schema');

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
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Restaurant'
 *                 message:
 *                   type: string
 *                   example: Restaurant created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  validateRequest(createRestaurantSchema),
  restaurantController.createRestaurant
);

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
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of restaurants with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 source:
 *                   type: string
 *                   enum: [cache, database]
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
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  validateRequest(queryRestaurantsSchema, 'query'),
  restaurantController.getRestaurants
);

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
 *       - in: query
 *         name: cuisine
 *         schema:
 *           type: string
 *         description: Cuisine type filter
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
 *         $ref: '#/components/responses/ValidationError'
 */
router.get(
  '/search',
  validateRequest(queryRestaurantsSchema, 'query'),
  restaurantController.searchRestaurants
);

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
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id',
  validateRequest(restaurantIdSchema, 'params'),
  restaurantController.getRestaurantById
);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Restaurant'
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.put(
  '/:id',
  validateRequest(restaurantIdSchema, 'params'),
  validateRequest(updateRestaurantSchema),
  restaurantController.updateRestaurant
);

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
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id',
  validateRequest(restaurantIdSchema, 'params'),
  restaurantController.deleteRestaurant
);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItem'
 *     responses:
 *       201:
 *         description: Menu item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Restaurant'
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/:id/menu',
  validateRequest(restaurantIdSchema, 'params'),
  validateRequest(createMenuItemSchema),
  restaurantController.addMenuItem
);

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
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItem'
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Restaurant'
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:id/menu/:itemId',
  validateRequest(restaurantIdSchema, 'params'),
  validateRequest(menuItemIdSchema, 'params'),
  validateRequest(updateMenuItemSchema),
  restaurantController.updateMenuItem
);

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
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete(
  '/:id/menu/:itemId',
  validateRequest(restaurantIdSchema, 'params'),
  validateRequest(menuItemIdSchema, 'params'),
  restaurantController.deleteMenuItem
);

module.exports = router;
