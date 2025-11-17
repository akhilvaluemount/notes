// /api/ask-ai-vision-json endpoint handler (vision with JSON base64)
const app = require('./_app');

module.exports = (req, res) => {
  console.log('Ask AI Vision JSON endpoint called, URL:', req.url);
  req.url = '/ask-ai-vision-json';
  req.path = '/ask-ai-vision-json';
  app(req, res);
};
