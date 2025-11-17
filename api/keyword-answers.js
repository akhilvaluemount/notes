// /api/keyword-answers endpoint handler
const app = require('./_app');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Rewrite the URL to match Express routes
  const originalUrl = req.url;
  req.url = originalUrl.replace(/^\/api\/keyword-answers/, '/keyword-answers');

  // Let Express handle the request
  return app(req, res);
};
