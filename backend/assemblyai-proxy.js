const WebSocket = require('ws');
const https = require('https');
require('dotenv').config();

class AssemblyAIRealtimeProxy {
  constructor() {
    this.wss = null;
    this.assemblyConnections = new Map(); // Track AssemblyAI connections per client
    this.clientActivity = new Map(); // Track client activity for auto-disconnect
    this.connectionTimeouts = new Map(); // Track connection timeout timers
    
    // Connection management settings
    this.maxIdleTime = 5 * 60 * 1000; // 5 minutes of inactivity before disconnect
    this.maxSessionTime = 30 * 60 * 1000; // 30 minutes max session time
    this.cleanupInterval = 60 * 1000; // Check for stale connections every minute
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  // Start the WebSocket server
  startServer(port = 5002) {
    this.wss = new WebSocket.Server({ 
      port: port,
      perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 10,
        memLevel: 7
      } // Enable optimized compression
    });

    console.log(`🔌 AssemblyAI transcription proxy server started on ws://localhost:${port}`);

    this.wss.on('connection', (clientWs, req) => {
      const timestamp = new Date().toISOString();
      console.log(`📱 Client connected to AssemblyAI transcription proxy at ${timestamp}`);
      console.log(`🔗 Client IP: ${req.socket.remoteAddress}, User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);
      this.handleClientConnection(clientWs);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  // Start cleanup timer for connection management
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, this.cleanupInterval);
    console.log(`🧹 Connection cleanup timer started (${this.cleanupInterval}ms interval)`);
  }

  // Clean up stale or idle connections
  cleanupStaleConnections() {
    const now = Date.now();
    const clientsToRemove = [];
    
    for (const [clientId, activity] of this.clientActivity) {
      const idleTime = now - activity.lastActivity;
      const sessionTime = now - activity.sessionStart;
      
      if (idleTime > this.maxIdleTime || sessionTime > this.maxSessionTime) {
        console.log(`🧹 Cleaning up idle client ${clientId} (idle: ${Math.round(idleTime/1000)}s, session: ${Math.round(sessionTime/1000)}s)`);
        clientsToRemove.push(clientId);
      }
    }
    
    // Remove stale connections
    for (const clientId of clientsToRemove) {
      this.disconnectClient(clientId, 'Idle timeout');
    }
    
    if (clientsToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${clientsToRemove.length} stale connections`);
    }
  }

  // Disconnect a specific client
  disconnectClient(clientId, reason = 'Server disconnect') {
    // Close AssemblyAI connection
    const assemblyWs = this.assemblyConnections.get(clientId);
    if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
      assemblyWs.close();
    }
    
    // Clear timeouts
    const timeout = this.connectionTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(clientId);
    }
    
    // Clean up tracking
    this.assemblyConnections.delete(clientId);
    this.clientActivity.delete(clientId);
    
    console.log(`🔌 Client ${clientId} disconnected: ${reason}`);
  }

  // Track client activity
  updateClientActivity(clientId) {
    const activity = this.clientActivity.get(clientId) || { sessionStart: Date.now() };
    activity.lastActivity = Date.now();
    this.clientActivity.set(clientId, activity);
  }

  // Handle new client connection
  async handleClientConnection(clientWs) {
    const clientId = this.generateClientId();
    console.log(`🆔 Client ID: ${clientId}`);
    
    // Initialize activity tracking
    this.clientActivity.set(clientId, {
      sessionStart: Date.now(),
      lastActivity: Date.now()
    });

    try {
      // Create connection to AssemblyAI Realtime API
      const assemblyWs = await this.createAssemblyAIConnection(clientId);
      this.assemblyConnections.set(clientId, assemblyWs);

      // Set up message forwarding
      this.setupMessageForwarding(clientWs, assemblyWs, clientId);
      
      // Connection established - ready for transcription

      // Handle client disconnection
      clientWs.on('close', () => {
        this.disconnectClient(clientId, 'Client disconnected');
      });

    } catch (error) {
      console.error(`❌ Failed to create AssemblyAI connection for client ${clientId}:`, error);
      clientWs.close(1011, 'Failed to connect to AssemblyAI API');
    }
  }

  // Create connection to AssemblyAI Realtime API
  async createAssemblyAIConnection(clientId) {
    return new Promise((resolve, reject) => {
      // First, create a temporary token for real-time transcription
      const https = require('https');
      
      const options = {
        hostname: 'api.assemblyai.com',
        path: '/v2/realtime/token',
        method: 'POST',
        headers: {
          'Authorization': process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json'
        }
      };

      const tokenReq = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const tokenData = JSON.parse(data);
            console.log('🔑 Got AssemblyAI token for client', clientId);
            
            // Now connect with the token
            const assemblyWs = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenData.token}`);

            assemblyWs.on('open', () => {
              clearTimeout(timeout);
              console.log(`🤖 Connected to AssemblyAI Realtime API for client ${clientId}`);
              resolve(assemblyWs);
            });

            assemblyWs.on('error', (error) => {
              clearTimeout(timeout);
              console.error(`❌ AssemblyAI connection error for client ${clientId}:`, error);
              reject(error);
            });

            assemblyWs.on('close', (code, reason) => {
              console.log(`🤖 AssemblyAI connection closed for client ${clientId}: ${code} ${reason}`);
            });
          } catch (e) {
            console.error('❌ Failed to parse token response:', e);
            reject(e);
          }
        });
      });

      tokenReq.on('error', (error) => {
        console.error('❌ Failed to get AssemblyAI token:', error);
        reject(error);
      });

      tokenReq.write(JSON.stringify({ expires_in: 3600 }));
      tokenReq.end();

      // Connection timeout
      const timeout = setTimeout(() => {
        reject(new Error('AssemblyAI connection timeout'));
      }, 10000);
    });
  }

  // Set up bidirectional message forwarding
  setupMessageForwarding(clientWs, assemblyWs, clientId) {
    // Audio throttling to optimize API usage
    let audioCallCount = 0;
    let audioCallReset = Date.now();
    const MAX_AUDIO_CALLS_PER_MINUTE = 120; // AssemblyAI can handle more frequent calls
    const THROTTLE_RESET_INTERVAL = 60 * 1000; // Reset counter every minute
    
    // Forward messages from client to AssemblyAI
    clientWs.on('message', (data) => {
      // Update client activity
      this.updateClientActivity(clientId);
      
      if (assemblyWs.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.parse(data);
          console.log(`📤 Client ${clientId} -> AssemblyAI:`, message.type || 'JSON message');
          
          // Handle frontend identification requests
          if (message.type === 'ping' && message.message === 'identify_client') {
            console.log(`🆔 Frontend requesting client ID: ${clientId}`);
            clientWs.send(JSON.stringify({
              type: 'client_identified',
              clientId: clientId,
              timestamp: new Date().toISOString()
            }));
            return; // Don't forward ping to AssemblyAI
          }
          
          // AssemblyAI doesn't need specific JSON messages for configuration
          // It's configured via the initial connection parameters
          
        } catch (error) {
          // Handle binary audio data with throttling
          const currentTime = Date.now();
          
          // Reset audio call counter every minute
          if (currentTime - audioCallReset >= THROTTLE_RESET_INTERVAL) {
            audioCallCount = 0;
            audioCallReset = currentTime;
            console.log(`🔄 Audio throttle counter reset`);
          }
          
          // Check if we're under the throttle limit
          if (audioCallCount >= MAX_AUDIO_CALLS_PER_MINUTE) {
            console.log(`⚠️ Audio throttle limit reached (${MAX_AUDIO_CALLS_PER_MINUTE}/min), dropping audio chunk`);
            return;
          }
          
          console.log(`📤 Client ${clientId} -> AssemblyAI: audio data (${data.length} bytes) [${audioCallCount}/${MAX_AUDIO_CALLS_PER_MINUTE}]`);
          
          // Ensure data is valid and non-empty
          if (data && data.length > 0) {
            // Send raw binary PCM16 data directly to AssemblyAI
            assemblyWs.send(data);
            audioCallCount++;
          } else {
            console.log(`⚠️ Empty audio data received, skipping`);
          }
        }
      }
    });

    // Forward messages from AssemblyAI to client
    assemblyWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.parse(data);
          
          // Log AssemblyAI message types for debugging
          console.log(`📥 AssemblyAI -> Client ${clientId}:`, message.message_type);
          
          // Convert AssemblyAI message format to OpenAI-compatible format
          let convertedMessage = null;
          
          switch (message.message_type) {
            case 'PartialTranscript':
              // Map to OpenAI partial transcript format
              convertedMessage = {
                type: 'conversation.item.input_audio_transcription.delta',
                delta: message.text || '',
                confidence: message.confidence,
                words: message.words
              };
              console.log(`📝 Partial transcript: "${message.text}" (confidence: ${message.confidence})`);
              break;
              
            case 'FinalTranscript':
              // Map to OpenAI final transcript format
              convertedMessage = {
                type: 'conversation.item.input_audio_transcription.completed',
                transcript: message.text || '',
                confidence: message.confidence,
                words: message.words
              };
              console.log(`✅ Final transcript: "${message.text}" (confidence: ${message.confidence})`);
              break;
              
            case 'SessionBegins':
              convertedMessage = {
                type: 'session.created',
                session_id: message.session_id
              };
              console.log(`🚀 AssemblyAI session established: ${message.session_id}`);
              break;
              
            case 'SessionTerminated':
              convertedMessage = {
                type: 'session.ended'
              };
              console.log(`🔚 AssemblyAI session terminated`);
              break;

            // Handle Universal-Streaming API message types
            case 'PartialText':
              convertedMessage = {
                type: 'conversation.item.input_audio_transcription.delta',
                delta: message.text || '',
                confidence: message.confidence || 0.0
              };
              console.log(`📝 Partial text: "${message.text}"`);
              break;

            case 'FinalText': 
              convertedMessage = {
                type: 'conversation.item.input_audio_transcription.completed',
                transcript: message.text || '',
                confidence: message.confidence || 0.0
              };
              console.log(`✅ Final text: "${message.text}"`);
              break;
              
            default:
              // Forward unknown message types as-is
              convertedMessage = message;
              console.log(`🔍 Unknown message type: ${message.message_type}`);
              break;
          }
          
          if (convertedMessage) {
            // Send the converted message
            clientWs.send(JSON.stringify(convertedMessage));
            
            // Also send custom message types for compatibility
            if (message.message_type === 'PartialTranscript' || message.message_type === 'PartialText') {
              const customMessage = {
                type: 'custom_transcription_partial',
                text: message.text || '',
                timestamp: new Date().toISOString(),
                confidence: message.confidence || 0.0
              };
              clientWs.send(JSON.stringify(customMessage));
              console.log(`🔥 SENT CUSTOM PARTIAL MESSAGE: "${message.text}"`);
            } else if (message.message_type === 'FinalTranscript' || message.message_type === 'FinalText') {
              const customMessage = {
                type: 'custom_transcription_final',
                text: message.text || '',
                timestamp: new Date().toISOString(),
                confidence: message.confidence || 0.0
              };
              clientWs.send(JSON.stringify(customMessage));
              console.log(`🔥 SENT CUSTOM FINAL MESSAGE: "${message.text}"`);
            }
          }
          
        } catch (error) {
          // Handle binary data (unlikely from AssemblyAI)
          console.log(`📥 AssemblyAI -> Client ${clientId}: binary data (${data.length} bytes)`);
          clientWs.send(data);
        }
      }
    });

    // Handle errors
    clientWs.on('error', (error) => {
      console.error(`❌ Client ${clientId} error:`, error);
    });

    assemblyWs.on('error', (error) => {
      console.error(`❌ AssemblyAI connection error for client ${clientId}:`, error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'AssemblyAI connection error');
      }
    });
  }

  // Generate unique client ID
  generateClientId() {
    return Math.random().toString(36).substring(2, 9);
  }

  // Stop the server
  stop() {
    if (this.wss) {
      // Close all AssemblyAI connections
      for (const [clientId, assemblyWs] of this.assemblyConnections) {
        if (assemblyWs.readyState === WebSocket.OPEN) {
          assemblyWs.close();
        }
      }
      this.assemblyConnections.clear();

      // Close the server
      this.wss.close();
      console.log('🛑 AssemblyAI proxy server stopped');
    }
  }
}

module.exports = AssemblyAIRealtimeProxy;

// Start the server if this file is run directly
if (require.main === module) {
  const proxy = new AssemblyAIRealtimeProxy();
  proxy.startServer(5002);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down AssemblyAI proxy server...');
    proxy.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down AssemblyAI proxy server...');
    proxy.stop();
    process.exit(0);
  });
}