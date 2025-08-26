const WebSocket = require('ws');
const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

class AssemblyAIRealtimeProxy {
  constructor() {
    this.wss = null;
    this.assemblyClients = new Map(); // Track AssemblyAI streaming clients per client
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
    // Close AssemblyAI client
    const assemblyClient = this.assemblyClients.get(clientId);
    if (assemblyClient) {
      assemblyClient.close();
    }
    
    // Clear timeouts
    const timeout = this.connectionTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(clientId);
    }
    
    // Clean up tracking
    this.assemblyClients.delete(clientId);
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
      // Create connection to AssemblyAI Universal-Streaming
      const assemblyClient = await this.createAssemblyAIClient(clientId, clientWs);
      this.assemblyClients.set(clientId, assemblyClient);

      // Set up message forwarding
      this.setupMessageForwarding(clientWs, assemblyClient, clientId);
      
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

  // Create connection to AssemblyAI Universal-Streaming API
  async createAssemblyAIClient(clientId, clientWs) {
    return new Promise(async (resolve, reject) => {
      try {
        const assemblyClient = new AssemblyAI({
          apiKey: process.env.ASSEMBLYAI_API_KEY
        });

        const rt = assemblyClient.streaming.transcriber({
          sampleRate: 16000,
          encoding: 'pcm_s16le'
        });

        let connectionEstablished = false;

        // Set up event handlers
        rt.on('open', () => {
          console.log(`🤖 Connected to AssemblyAI Universal-Streaming for client ${clientId}`);
          connectionEstablished = true;
          
          // Send session created message to client
          clientWs.send(JSON.stringify({
            type: 'session.created',
            session_id: clientId,
            timestamp: new Date().toISOString()
          }));
          
          resolve(rt);
        });

        rt.on('transcript', (transcript) => {
          // Handle both partial and final transcripts
          if (transcript.message_type === 'PartialTranscript') {
            console.log(`📝 Partial transcript: "${transcript.text}"`);
            
            // Send OpenAI-compatible format
            const message = {
              type: 'conversation.item.input_audio_transcription.delta',
              delta: transcript.text || ''
            };
            clientWs.send(JSON.stringify(message));
            
            // Send custom format for compatibility
            const customMessage = {
              type: 'custom_transcription_partial',
              text: transcript.text || '',
              timestamp: new Date().toISOString()
            };
            clientWs.send(JSON.stringify(customMessage));
            
          } else if (transcript.message_type === 'FinalTranscript') {
            console.log(`✅ Final transcript: "${transcript.text}"`);
            
            // Send OpenAI-compatible format
            const message = {
              type: 'conversation.item.input_audio_transcription.completed',
              transcript: transcript.text || ''
            };
            clientWs.send(JSON.stringify(message));
            
            // Send custom format for compatibility
            const customMessage = {
              type: 'custom_transcription_final',
              text: transcript.text || '',
              timestamp: new Date().toISOString()
            };
            clientWs.send(JSON.stringify(customMessage));
          }
        });

        rt.on('error', (error) => {
          console.error(`❌ AssemblyAI streaming error for client ${clientId}:`, error);
          if (!connectionEstablished) {
            reject(error);
          } else if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, 'AssemblyAI streaming error');
          }
        });

        rt.on('close', () => {
          console.log(`🔚 AssemblyAI streaming closed for client ${clientId}`);
        });

        // Connection timeout
        const timeout = setTimeout(() => {
          if (!connectionEstablished) {
            rt.close();
            reject(new Error('AssemblyAI connection timeout'));
          }
        }, 10000);

        rt.on('open', () => {
          clearTimeout(timeout);
        });

        // Connect to streaming service
        rt.connect().then(() => {
          console.log(`🤖 AssemblyAI streaming connected for client ${clientId}`);
        }).catch(error => {
          console.error(`❌ Failed to connect AssemblyAI streaming for client ${clientId}:`, error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Set up message forwarding
  setupMessageForwarding(clientWs, assemblyClient, clientId) {
    // Audio throttling to optimize API usage
    let audioCallCount = 0;
    let audioCallReset = Date.now();
    const MAX_AUDIO_CALLS_PER_MINUTE = 120; // AssemblyAI can handle more frequent calls
    const THROTTLE_RESET_INTERVAL = 60 * 1000; // Reset counter every minute
    
    // Forward messages from client to AssemblyAI
    clientWs.on('message', (data) => {
      // Update client activity
      this.updateClientActivity(clientId);
      
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
        
        // AssemblyAI SDK doesn't need specific JSON configuration messages
        
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
          // Send raw binary PCM16 data to AssemblyAI SDK
          assemblyClient.sendAudio(data);
          audioCallCount++;
        } else {
          console.log(`⚠️ Empty audio data received, skipping`);
        }
      }
    });

    // Handle client errors
    clientWs.on('error', (error) => {
      console.error(`❌ Client ${clientId} error:`, error);
    });
  }

  // Generate unique client ID
  generateClientId() {
    return Math.random().toString(36).substring(2, 9);
  }

  // Stop the server
  stop() {
    if (this.wss) {
      // Close all AssemblyAI clients
      for (const [clientId, assemblyClient] of this.assemblyClients) {
        assemblyClient.close();
      }
      this.assemblyClients.clear();

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