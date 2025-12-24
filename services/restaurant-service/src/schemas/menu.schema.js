const { z } = require('zod');

const createMenuItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(1, 'Description is required').optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url('Valid image URL is required').optional(),
  isAvailable: z.boolean().default(true).optional(),
  dietaryInfo: z.array(z.string()).optional()
});

const updateMenuItemSchema = createMenuItemSchema.partial();

const menuItemIdSchema = z.object({
  itemId: z.string().min(1, 'Menu item ID is required')
});

const queryMenuItemsSchema = z.object({
  restaurantId: z.string().optional(),
  category: z.string().optional(),
  isAvailable: z.enum(['true', 'false']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional()
});

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemIdSchema,
  queryMenuItemsSchema
};
