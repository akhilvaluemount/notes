// /api/sessions endpoint handler
// This handles /api/sessions and /api/sessions/* routes
const app = require('./_app');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // When Vercel rewrites /api/sessions/123 to /api/sessions,
  // the original path is preserved in req.url
  // We need to rewrite it to match Express routes (without /api prefix)

  // Handle both /api/sessions and just /sessions
  if (req.url.startsWith('/api/sessions')) {
    req.url = req.url.replace('/api/sessions', '/sessions');
  } else if (!req.url.startsWith('/sessions')) {
    // If URL doesn't have /sessions, add it (base path)
    req.url = '/sessions' + (req.url === '/' ? '' : req.url);
  }

  // Let Express handle the request
  return app(req, res);
};
