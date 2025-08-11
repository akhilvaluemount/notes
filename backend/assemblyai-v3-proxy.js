// AssemblyAI v3 Streaming API Proxy
// Based on the official Python SDK implementation

const WebSocket = require('ws');
require('dotenv').config();

class AssemblyAIV3Proxy {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  startServer(port = 5002) {
    this.wss = new WebSocket.Server({ port });
    console.log(`🎤 AssemblyAI v3 Streaming Proxy started on ws://localhost:${port}`);
    console.log(`📡 Using streaming.assemblyai.com endpoint`);

    this.wss.on('connection', (clientWs) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`📱 Client ${clientId} connected`);
      
      this.handleClient(clientWs, clientId);
    });
  }

  async handleClient(clientWs, clientId) {
    try {
      // Connect to AssemblyAI v3 streaming endpoint
      const assemblyWs = new WebSocket('wss://streaming.assemblyai.com/v3/stream', {
        headers: {
          'Authorization': process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      this.clients.set(clientId, { clientWs, assemblyWs });

      // Handle AssemblyAI connection events
      assemblyWs.on('open', () => {
        console.log(`✅ Connected to AssemblyAI v3 for client ${clientId}`);
        
        // Send initial configuration matching Python SDK
        const config = {
          type: 'configure',
          config: {
            sample_rate: 16000,
            format_turns: true,
            encoding: 'pcm_s16le',
            channels: 1
          }
        };
        
        assemblyWs.send(JSON.stringify(config));
        console.log(`⚙️ Sent configuration for client ${clientId}`);
        
        // Notify client of successful connection
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'connection_established',
            message: 'Connected to AssemblyAI v3'
          }));
        }
      });

      // Handle messages from AssemblyAI
      assemblyWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📥 AssemblyAI v3 event:`, message.type || 'unknown');
          
          // Map AssemblyAI v3 events to our frontend format
          switch (message.type) {
            case 'session_begins':
              console.log(`🎬 Session started: ${message.session_id}`);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'session_started',
                  session_id: message.session_id
                }));
              }
              break;
              
            case 'partial_transcript':
              console.log(`📝 Partial: "${message.text}"`);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'custom_transcription_partial',
                  text: message.text,
                  timestamp: new Date().toISOString()
                }));
              }
              break;
              
            case 'final_transcript':
            case 'turn':
              console.log(`✅ Turn/Final: "${message.text || message.transcript}"`);
              const transcriptText = message.text || message.transcript || '';
              if (transcriptText && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'custom_transcription_final',
                  text: transcriptText,
                  timestamp: new Date().toISOString(),
                  end_of_turn: message.end_of_turn
                }));
              }
              break;
              
            case 'session_terminated':
              console.log(`🔚 Session terminated: ${message.audio_duration_seconds}s processed`);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'session_ended',
                  duration: message.audio_duration_seconds
                }));
              }
              break;
              
            case 'error':
              console.error(`❌ AssemblyAI error:`, message.error);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'error',
                  error: message.error
                }));
              }
              break;
              
            default:
              console.log(`🔍 Unknown message type:`, message.type);
          }
        } catch (e) {
          console.error(`❌ Error parsing AssemblyAI message:`, e);
        }
      });

      assemblyWs.on('error', (error) => {
        console.error(`❌ AssemblyAI connection error for ${clientId}:`, error.message);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: 'AssemblyAI connection error'
          }));
        }
      });

      assemblyWs.on('close', (code, reason) => {
        console.log(`🔌 AssemblyAI connection closed for ${clientId}: ${code} ${reason}`);
        this.clients.delete(clientId);
      });

      // Handle messages from client
      clientWs.on('message', (data) => {
        if (assemblyWs.readyState === WebSocket.OPEN) {
          if (Buffer.isBuffer(data)) {
            // Audio data - send directly to AssemblyAI
            console.log(`📤 Forwarding ${data.length} bytes of audio to AssemblyAI`);
            
            // AssemblyAI v3 expects audio in a specific format
            const audioMessage = {
              type: 'audio',
              audio: data.toString('base64')
            };
            assemblyWs.send(JSON.stringify(audioMessage));
          } else {
            // Control messages
            try {
              const message = JSON.parse(data);
              console.log(`📨 Client message:`, message.type);
              
              if (message.type === 'ping') {
                clientWs.send(JSON.stringify({ type: 'pong' }));
              }
            } catch (e) {
              console.log(`📤 Forwarding raw message to AssemblyAI`);
              assemblyWs.send(data);
            }
          }
        }
      });

      clientWs.on('close', () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        if (assemblyWs.readyState === WebSocket.OPEN) {
          // Send terminate message to AssemblyAI
          assemblyWs.send(JSON.stringify({ type: 'terminate' }));
          assemblyWs.close();
        }
        this.clients.delete(clientId);
      });

      clientWs.on('error', (error) => {
        console.error(`❌ Client ${clientId} error:`, error.message);
      });

    } catch (error) {
      console.error(`❌ Failed to setup client ${clientId}:`, error);
      clientWs.close(1011, 'Failed to connect to AssemblyAI');
    }
  }

  stop() {
    if (this.wss) {
      // Close all connections
      for (const [clientId, { assemblyWs }] of this.clients) {
        if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
          assemblyWs.close();
        }
      }
      this.clients.clear();
      
      this.wss.close();
      console.log('🛑 AssemblyAI v3 proxy stopped');
    }
  }
}

// Start the server
if (require.main === module) {
  const proxy = new AssemblyAIV3Proxy();
  proxy.startServer(5002);

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    proxy.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    proxy.stop();
    process.exit(0);
  });
}

module.exports = AssemblyAIV3Proxy;