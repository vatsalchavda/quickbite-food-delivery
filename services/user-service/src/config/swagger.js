const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuickBite User Service API',
      version: '1.0.0',
      description: 'User authentication and management service for QuickBite Food Delivery platform',
      contact: {
        name: 'QuickBite Team',
        email: 'dev@quickbite.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
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
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            phone: {
              type: 'string',
              description: 'User phone number',
            },
            role: {
              type: 'string',
              enum: ['customer', 'admin'],
              description: 'User role',
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
            isActive: {
              type: 'boolean',
              description: 'User account status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
