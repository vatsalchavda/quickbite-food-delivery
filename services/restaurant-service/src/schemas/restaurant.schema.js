const { z } = require('zod');

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required').default('USA'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});

const openingHoursSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
});

const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  address: addressSchema,
  cuisineType: z.string().min(1, 'Cuisine type is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  ownerId: z.string().min(1, 'Owner ID is required').optional(),
  openingHours: z.object({
    monday: openingHoursSchema.optional(),
    tuesday: openingHoursSchema.optional(),
    wednesday: openingHoursSchema.optional(),
    thursday: openingHoursSchema.optional(),
    friday: openingHoursSchema.optional(),
    saturday: openingHoursSchema.optional(),
    sunday: openingHoursSchema.optional()
  }).optional(),
  isActive: z.boolean().default(true).optional()
});

const updateRestaurantSchema = createRestaurantSchema.partial();

const restaurantIdSchema = z.object({
  id: z.string().min(1, 'Restaurant ID is required')
});

const queryRestaurantsSchema = z.object({
  cuisine: z.string().optional(),
  cuisineType: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
  query: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional()
});

module.exports = {
  createRestaurantSchema,
  updateRestaurantSchema,
  restaurantIdSchema,
  queryRestaurantsSchema
};
