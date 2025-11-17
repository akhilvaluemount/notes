// /api/ask-ai endpoint handler (non-streaming)
const app = require('./_app');

module.exports = (req, res) => {
  console.log('Ask AI endpoint called, URL:', req.url);
  req.url = '/ask-ai';
  req.path = '/ask-ai';
  app(req, res);
};
