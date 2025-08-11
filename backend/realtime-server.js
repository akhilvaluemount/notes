const OpenAIRealtimeProxy = require('./realtime-proxy');
require('dotenv').config();

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  console.log('Please add OPENAI_API_KEY to your .env file');
  process.exit(1);
}

// Create and start the proxy server
const proxy = new OpenAIRealtimeProxy();
proxy.startServer(5002);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Realtime API proxy...');
  proxy.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Realtime API proxy...');
  proxy.stop();
  process.exit(0);
});

console.log('🚀 OpenAI Realtime API transcription proxy is running!');
console.log('📡 WebSocket endpoint: ws://localhost:5002');
console.log('🔑 Using OpenAI API key:', process.env.OPENAI_API_KEY ? 
  `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'Not configured');