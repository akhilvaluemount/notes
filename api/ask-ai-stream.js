// /api/ask-ai-stream endpoint handler (streaming with SSE)
const app = require('./_app');

module.exports = (req, res) => {
  console.log('Ask AI Stream endpoint called, URL:', req.url);
  req.url = '/ask-ai-stream';
  req.path = '/ask-ai-stream';
  app(req, res);
};
