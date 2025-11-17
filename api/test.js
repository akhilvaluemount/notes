// Simple test endpoint
module.exports = (req, res) => {
  res.json({ message: 'Test endpoint works!', path: req.url });
};
