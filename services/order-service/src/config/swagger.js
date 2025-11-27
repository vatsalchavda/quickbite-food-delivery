const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuickBite Order Service API',
      version: '1.0.0',
      description: 'Order management with state machine and event publishing',
      contact: {
        name: 'QuickBite Team'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.ORDER_SERVICE_PORT || 3003}`,
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Orders',
        description: 'Order lifecycle management'
      },
      {
        name: 'Health',
        description: 'Service health check'
      }
    ],
    components: {
      schemas: {
        OrderItem: {
          type: 'object',
          required: ['menuItemId', 'name', 'quantity', 'price'],
          properties: {
            menuItemId: {
              type: 'string',
              description: 'Menu item ID from restaurant service'
            },
            name: {
              type: 'string',
              description: 'Item name'
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              description: 'Quantity ordered'
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Price per item'
            },
            specialInstructions: {
              type: 'string',
              description: 'Special preparation instructions'
            }
          }
        },
        Order: {
          type: 'object',
          required: ['customerId', 'restaurantId', 'items', 'deliveryType', 'pricing'],
          properties: {
            orderNumber: {
              type: 'string',
              description: 'Unique order number (auto-generated)'
            },
            customerId: {
              type: 'string',
              description: 'Customer ID'
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              },
              minItems: 1
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
              description: 'Current order status'
            },
            deliveryType: {
              type: 'string',
              enum: ['DELIVERY', 'PICKUP'],
              description: 'Delivery or pickup order'
            },
            deliveryAddress: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                coordinates: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['Point'] },
                    coordinates: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 2,
                      maxItems: 2,
                      description: '[longitude, latitude]'
                    }
                  }
                }
              }
            },
            pricing: {
              type: 'object',
              required: ['subtotal', 'tax', 'total'],
              properties: {
                subtotal: { type: 'number', minimum: 0 },
                deliveryFee: { type: 'number', minimum: 0 },
                tax: { type: 'number', minimum: 0 },
                tip: { type: 'number', minimum: 0 },
                total: { type: 'number', minimum: 0 }
              }
            },
            specialInstructions: {
              type: 'string',
              description: 'Special delivery/order instructions'
            },
            estimatedDeliveryTime: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
