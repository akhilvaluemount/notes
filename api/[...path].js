// Catch-all API route for Vercel serverless functions
// This handles all /api/* routes and delegates to the main Express app

const app = require('./index');

module.exports = app;
module.exports.default = app;
