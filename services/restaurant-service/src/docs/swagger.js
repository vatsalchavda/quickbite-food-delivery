const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Service API',
      version: '1.0.0',
      description: 'Restaurant management API with Redis caching and validation',
      contact: {
        name: 'API Support',
        email: 'support@quickbite.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3002}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Restaurant: {
          type: 'object',
          required: ['name', 'address', 'cuisineType', 'phone', 'email'],
          properties: {
            _id: {
              type: 'string',
              description: 'Restaurant ID',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Restaurant name',
              example: 'Pizza Palace'
            },
            description: {
              type: 'string',
              description: 'Restaurant description',
              example: 'Authentic Italian pizza and pasta'
            },
            cuisineType: {
              type: 'string',
              description: 'Type of cuisine',
              example: 'Italian'
            },
            address: {
              type: 'object',
              required: ['street', 'city', 'state', 'zipCode'],
              properties: {
                street: {
                  type: 'string',
                  example: '123 Main St'
                },
                city: {
                  type: 'string',
                  example: 'New York'
                },
                state: {
                  type: 'string',
                  example: 'NY'
                },
                zipCode: {
                  type: 'string',
                  example: '10001'
                },
                country: {
                  type: 'string',
                  example: 'USA'
                },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: {
                      type: 'number',
                      example: 40.7128
                    },
                    lng: {
                      type: 'number',
                      example: -74.0060
                    }
                  }
                }
              }
            },
            phone: {
              type: 'string',
              example: '+1-555-123-4567'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'contact@pizzapalace.com'
            },
            ownerId: {
              type: 'string',
              description: 'Owner user ID',
              example: '507f1f77bcf86cd799439012'
            },
            openingHours: {
              type: 'object',
              properties: {
                monday: { $ref: '#/components/schemas/DayHours' },
                tuesday: { $ref: '#/components/schemas/DayHours' },
                wednesday: { $ref: '#/components/schemas/DayHours' },
                thursday: { $ref: '#/components/schemas/DayHours' },
                friday: { $ref: '#/components/schemas/DayHours' },
                saturday: { $ref: '#/components/schemas/DayHours' },
                sunday: { $ref: '#/components/schemas/DayHours' }
              }
            },
            menu: {
              type: 'array',
              items: { $ref: '#/components/schemas/MenuItem' }
            },
            isActive: {
              type: 'boolean',
              default: true
            },
            rating: {
              type: 'object',
              properties: {
                average: {
                  type: 'number',
                  example: 4.5
                },
                count: {
                  type: 'number',
                  example: 123
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        MenuItem: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439013'
            },
            name: {
              type: 'string',
              example: 'Margherita Pizza'
            },
            description: {
              type: 'string',
              example: 'Classic tomato, mozzarella, and basil'
            },
            price: {
              type: 'number',
              minimum: 0,
              example: 12.99
            },
            category: {
              type: 'string',
              example: 'Pizza'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/margherita.jpg'
            },
            isAvailable: {
              type: 'boolean',
              default: true
            },
            dietaryInfo: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['vegetarian', 'gluten-free']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        DayHours: {
          type: 'object',
          properties: {
            open: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              example: '09:00'
            },
            close: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              example: '22:00'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        }
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
