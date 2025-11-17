// /api/health endpoint handler
const app = require('./_app');

module.exports = async (req, res) => {
  // Set the URL to match Express route
  req.url = '/health';
  return app(req, res);
};
