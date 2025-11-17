// /api/health endpoint handler
const app = require('./_app');

module.exports = (req, res) => {
  console.log('Health endpoint called, URL:', req.url);
  // Set the URL to match Express route
  req.url = '/health';
  req.path = '/health';
  console.log('Rewritten URL:', req.url);
  // Call Express app
  app(req, res);
};
