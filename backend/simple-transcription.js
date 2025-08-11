// Simple transcription using Web Speech API fallback
// Since AssemblyAI real-time is deprecated, we'll use browser's built-in speech recognition

const WebSocket = require('ws');
const https = require('https');
require('dotenv').config();

class SimpleTranscriptionProxy {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  startServer(port = 5002) {
    this.wss = new WebSocket.Server({ port });
    console.log(`🎤 Simple transcription proxy started on ws://localhost:${port}`);
    console.log(`📝 Using browser-based speech recognition as fallback`);

    this.wss.on('connection', (ws) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`📱 Client ${clientId} connected`);
      
      this.clients.set(clientId, ws);

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connection_established',
        message: 'Connected to transcription service'
      }));

      ws.on('message', async (data) => {
        // For audio data, we'll just echo back a confirmation
        // Real transcription will happen in the browser
        if (Buffer.isBuffer(data)) {
          console.log(`📤 Received ${data.length} bytes of audio from client ${clientId}`);
          
          // Simulate transcription for testing
          // In production, you would send this to a real STT service
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'custom_transcription_partial',
                text: 'Testing voice transcription...',
                timestamp: new Date().toISOString()
              }));
              
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'custom_transcription_final',
                    text: 'Hello, this is a test of the voice transcription system.',
                    timestamp: new Date().toISOString()
                  }));
                }
              }, 1000);
            }
          }, 500);
        } else {
          try {
            const message = JSON.parse(data);
            console.log(`📥 Received message from client ${clientId}:`, message.type);
          } catch (e) {
            console.log(`📥 Received non-JSON data from client ${clientId}`);
          }
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`❌ Client ${clientId} error:`, error.message);
      });
    });
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('🛑 Simple transcription proxy stopped');
    }
  }
}

// Start the server
if (require.main === module) {
  const proxy = new SimpleTranscriptionProxy();
  proxy.startServer(5002);

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    proxy.stop();
    process.exit(0);
  });
}

module.exports = SimpleTranscriptionProxy;