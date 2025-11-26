const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger/OpenAPI Configuration for Restaurant Service
 * Auto-generates API documentation from JSDoc comments in routes
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuickBite Restaurant Service API',
      version: '1.0.0',
      description: 'Restaurant and menu management service with Redis caching',
      contact: {
        name: 'QuickBite Team',
        email: 'dev@quickbite.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000',
        description: 'API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Restaurant: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            cuisine: {
              type: 'array',
              items: { type: 'string' },
              example: ['Italian', 'Pizza'],
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  },
                },
              },
            },
            phone: { type: 'string' },
            email: { type: 'string' },
            menu: {
              type: 'array',
              items: { $ref: '#/components/schemas/MenuItem' },
            },
            rating: {
              type: 'object',
              properties: {
                average: { type: 'number', example: 4.5 },
                count: { type: 'number', example: 120 },
              },
            },
            priceRange: {
              type: 'string',
              enum: ['$', '$$', '$$$', '$$$$'],
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MenuItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', example: 12.99 },
            category: {
              type: 'string',
              enum: ['appetizer', 'main', 'dessert', 'beverage', 'side'],
            },
            image: { type: 'string' },
            isAvailable: { type: 'boolean' },
            dietary: {
              type: 'object',
              properties: {
                vegetarian: { type: 'boolean' },
                vegan: { type: 'boolean' },
                glutenFree: { type: 'boolean' },
                spicy: { type: 'boolean' },
              },
            },
            preparationTime: { type: 'number', example: 15 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
