// /api/ask-ai-vision endpoint handler (vision with file upload)
const app = require('./_app');

module.exports = (req, res) => {
  console.log('Ask AI Vision endpoint called, URL:', req.url);
  req.url = '/ask-ai-vision';
  req.path = '/ask-ai-vision';
  app(req, res);
};
