const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load base OpenAPI configuration
const baseSpec = {
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
};

// Load schemas
const schemasPath = path.join(__dirname, '../swagger/schemas/schemas.yaml');
const schemas = yaml.load(fs.readFileSync(schemasPath, 'utf8'));

// Load path definitions
const authPathsFile = path.join(__dirname, '../swagger/paths/auth.yaml');
const usersPathsFile = path.join(__dirname, '../swagger/paths/users.yaml');

const authPaths = yaml.load(fs.readFileSync(authPathsFile, 'utf8'));
const usersPaths = yaml.load(fs.readFileSync(usersPathsFile, 'utf8'));

// Merge all paths
const allPaths = {
  ...authPaths.paths,
  ...usersPaths.paths,
};

// Combine everything into final spec
const swaggerSpec = {
  ...baseSpec,
  paths: allPaths,
  components: schemas.components,
};

module.exports = swaggerSpec;
