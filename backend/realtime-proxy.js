const WebSocket = require('ws');
const https = require('https');
require('dotenv').config();

class OpenAIRealtimeProxy {
  constructor() {
    this.wss = null;
    this.openaiConnections = new Map(); // Track OpenAI connections per client
  }

  // Start the WebSocket server
  startServer(port = 5002) {
    this.wss = new WebSocket.Server({ 
      port: port,
      perMessageDeflate: false // Disable compression for lower latency
    });

    console.log(`🔌 Realtime transcription proxy server started on ws://localhost:${port}`);

    this.wss.on('connection', (clientWs, req) => {
      const timestamp = new Date().toISOString();
      console.log(`📱 Client connected to realtime transcription proxy at ${timestamp}`);
      console.log(`🔗 Client IP: ${req.socket.remoteAddress}, User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);
      this.handleClientConnection(clientWs);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  // Handle new client connection
  async handleClientConnection(clientWs) {
    const clientId = this.generateClientId();
    console.log(`🆔 Client ID: ${clientId}`);

    try {
      // Create connection to OpenAI Realtime API
      const openaiWs = await this.createOpenAIConnection(clientId);
      this.openaiConnections.set(clientId, openaiWs);

      // Set up message forwarding
      this.setupMessageForwarding(clientWs, openaiWs, clientId);
      
      // Connection established - ready for transcription

      // Handle client disconnection
      clientWs.on('close', () => {
        console.log(`📱 Client ${clientId} disconnected`);
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }
        this.openaiConnections.delete(clientId);
      });

    } catch (error) {
      console.error(`❌ Failed to create OpenAI connection for client ${clientId}:`, error);
      clientWs.close(1011, 'Failed to connect to OpenAI API');
    }
  }

  // Create connection to OpenAI Realtime API
  async createOpenAIConnection(clientId) {
    return new Promise((resolve, reject) => {
      const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Connection timeout
      const timeout = setTimeout(() => {
        openaiWs.close();
        reject(new Error('OpenAI connection timeout'));
      }, 10000);

      openaiWs.on('open', () => {
        clearTimeout(timeout);
        console.log(`🤖 Connected to OpenAI Realtime API for client ${clientId}`);
        
        // Configure the realtime session for transcription
        this.configureSession(openaiWs);
        resolve(openaiWs);
      });

      openaiWs.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ OpenAI connection error for client ${clientId}:`, error);
        reject(error);
      });

      openaiWs.on('close', (code, reason) => {
        console.log(`🤖 OpenAI connection closed for client ${clientId}: ${code} ${reason}`);
      });
    });
  }

  // Configure OpenAI session for realtime transcription
  configureSession(openaiWs) {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'Please transcribe everything the user says exactly as spoken. Respond with just the transcribed text.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        }
      }
    };

    console.log('⚙️ Configuring OpenAI realtime session for transcription');
    openaiWs.send(JSON.stringify(sessionConfig));
  }

  // Set up bidirectional message forwarding
  setupMessageForwarding(clientWs, openaiWs, clientId) {
    let audioBufferCount = 0;
    let lastCommitTime = Date.now();
    const COMMIT_INTERVAL_MS = 2000; // Commit every 2 seconds instead of by chunk count
    
    // Forward messages from client to OpenAI
    clientWs.on('message', (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.parse(data);
          console.log(`📤 Client ${clientId} -> OpenAI:`, message.type || 'JSON message');
          
          // Handle frontend identification requests
          if (message.type === 'ping' && message.message === 'identify_client') {
            console.log(`🆔 Frontend requesting client ID: ${clientId}`);
            clientWs.send(JSON.stringify({
              type: 'client_identified',
              clientId: clientId,
              timestamp: new Date().toISOString()
            }));
            return; // Don't forward ping to OpenAI
          }
          
          // Forward JSON messages to OpenAI
          openaiWs.send(data);
        } catch (error) {
          // Handle binary audio data - convert to input_audio_buffer.append format
          console.log(`📤 Client ${clientId} -> OpenAI: binary audio data (${data.length} bytes)`);
          
          // Ensure data is valid and non-empty
          if (data && data.length > 0) {
            // Convert binary PCM16 data to base64 and send as input_audio_buffer.append
            const audioBase64 = Buffer.from(data).toString('base64');
            
            const audioMessage = {
              type: 'input_audio_buffer.append',
              audio: audioBase64
            };
            
            openaiWs.send(JSON.stringify(audioMessage));
            // Let OpenAI's server-side VAD handle transcription automatically
          } else {
            console.log(`⚠️ Empty audio data received, skipping`);
          }
        }
      }
    });

    // Forward messages from OpenAI to client
    openaiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.parse(data);
          
          // Log ALL message types for debugging
          console.log(`📥 OpenAI -> Client ${clientId}:`, message.type);
          
          // Log transcription events specifically with full data
          if (message.type === 'conversation.item.input_audio_transcription.delta') {
            console.log(`📝 Partial transcript: "${message.delta}"`);
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            console.log(`✅ Final transcript: "${message.transcript}"`);
          } else if (message.type.includes('transcript') || message.type.includes('input_audio')) {
            console.log(`🔍 Audio/Transcript Event:`, JSON.stringify(message, null, 2));
          }
          
          // Log error details for debugging
          if (message.type === 'error') {
            console.error(`❌ OpenAI Error Details:`, JSON.stringify(message.error, null, 2));
          }
          
          // Forward to client with connection verification
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
            
            // BRUTE FORCE FIX: Send transcription as custom message type
            if (message.type === 'conversation.item.input_audio_transcription.delta') {
              console.log(`🚀 FORWARDED to frontend CLIENT ${clientId} - Partial: "${message.delta}"`);
              console.log(`🔗 Client WebSocket state: ${clientWs.readyState} (1=OPEN, 2=CLOSING, 3=CLOSED)`);
              // Send duplicate with custom type
              const customMessage = {
                type: 'custom_transcription_partial',
                text: message.delta,
                timestamp: new Date().toISOString()
              };
              clientWs.send(JSON.stringify(customMessage));
              console.log(`🔥 SENT CUSTOM PARTIAL MESSAGE: "${message.delta}"`);
            } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
              console.log(`🚀 FORWARDED to frontend CLIENT ${clientId} - Final: "${message.transcript}"`);
              console.log(`🔗 Client WebSocket state: ${clientWs.readyState} (1=OPEN, 2=CLOSING, 3=CLOSED)`);
              // Send duplicate with custom type
              const customMessage = {
                type: 'custom_transcription_final',
                text: message.transcript,
                timestamp: new Date().toISOString()
              };
              clientWs.send(JSON.stringify(customMessage));
              console.log(`🔥 SENT CUSTOM FINAL MESSAGE: "${message.transcript}"`);
            }
          } else {
            console.log(`⚠️ CANNOT FORWARD TO CLIENT ${clientId} - WebSocket not open (state: ${clientWs.readyState})`);
          }
        } catch (error) {
          // Handle binary data
          console.log(`📥 OpenAI -> Client ${clientId}: binary data (${data.length} bytes)`);
          clientWs.send(data);
        }
      }
    });

    // Handle errors
    clientWs.on('error', (error) => {
      console.error(`❌ Client ${clientId} error:`, error);
    });

    openaiWs.on('error', (error) => {
      console.error(`❌ OpenAI connection error for client ${clientId}:`, error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'OpenAI connection error');
      }
    });
  }

  // Generate unique client ID
  generateClientId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Stop the server
  stop() {
    if (this.wss) {
      // Close all OpenAI connections
      for (const [clientId, openaiWs] of this.openaiConnections) {
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }
      }
      this.openaiConnections.clear();

      // Close the server
      this.wss.close();
      console.log('🛑 Realtime proxy server stopped');
    }
  }
}

module.exports = OpenAIRealtimeProxy;

// Start the server if this file is run directly
if (require.main === module) {
  const proxy = new OpenAIRealtimeProxy();
  proxy.startServer(5002);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down realtime proxy server...');
    proxy.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down realtime proxy server...');
    proxy.stop();
    process.exit(0);
  });
}