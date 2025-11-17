// Ultra-simple test - no dependencies
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Simple test works!',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
