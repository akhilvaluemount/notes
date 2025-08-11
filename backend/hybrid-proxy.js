const WebSocket = require('ws');
const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

class AssemblyAIRealtimeProxy {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // Track connections per client
    this.clientActivity = new Map(); // Track client activity for auto-disconnect
    this.connectionTimeouts = new Map(); // Track connection timeout timers
    
    // Get provider from environment
    this.provider = 'assemblyai'; // Only AssemblyAI supported
    
    // Connection management settings from env
    this.maxIdleTime = parseInt(process.env.STT_MAX_IDLE_TIME) || 300000; // 5 minutes
    this.maxSessionTime = parseInt(process.env.STT_MAX_SESSION_TIME) || 1800000; // 30 minutes
    this.cleanupInterval = 60 * 1000; // Check for stale connections every minute
    
    console.log(`🔧 STT Provider: ${this.provider}`);
    console.log(`💰 Cost per hour: $${process.env.STT_COST_PER_HOUR_ASSEMBLYAI}`);
    
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
      }
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
  }

  // Disconnect a specific client
  disconnectClient(clientId, reason = 'Server disconnect') {
    const connection = this.connections.get(clientId);
    if (connection) {
      if (connection.close) {
        connection.close();
      }
    }
    
    // Clear timeouts
    const timeout = this.connectionTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(clientId);
    }
    
    // Clean up tracking
    this.connections.delete(clientId);
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
      const connection = await this.createAssemblyAIConnection(clientId, clientWs);
      this.connections.set(clientId, connection);
      this.setupMessageForwarding(clientWs, connection, clientId);
      
      // Handle client disconnection
      clientWs.on('close', () => {
        this.disconnectClient(clientId, 'Client disconnected');
      });

    } catch (error) {
      console.error(`❌ Failed to create AssemblyAI connection for client ${clientId}:`, error);
      clientWs.close(1011, 'Failed to connect to transcription service');
    }
  }

  // Create AssemblyAI connection
  async createAssemblyAIConnection(clientId, clientWs) {
    return new Promise(async (resolve, reject) => {
      try {
        const assemblyClient = new AssemblyAI({
          apiKey: process.env.ASSEMBLYAI_API_KEY
        });

        const rt = assemblyClient.streaming.transcriber({
          sampleRate: parseInt(process.env.STT_SAMPLE_RATE) || 16000,
          encoding: process.env.STT_ENCODING || 'pcm_s16le'
        });

        let connectionEstablished = false;

        rt.on('open', () => {
          console.log(`🤖 Connected to AssemblyAI for client ${clientId}`);
          connectionEstablished = true;
          
          clientWs.send(JSON.stringify({
            type: 'session.created',
            session_id: clientId,
            provider: 'assemblyai',
            timestamp: new Date().toISOString()
          }));
          
          resolve(rt);
        });

        rt.on('transcript', (transcript) => {
          this.handleAssemblyAITranscript(clientWs, transcript);
        });

        rt.on('error', (error) => {
          console.error(`❌ AssemblyAI streaming error for client ${clientId}:`, error);
          if (!connectionEstablished) {
            reject(error);
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

        rt.connect().then(() => {
          console.log(`🤖 AssemblyAI streaming connected for client ${clientId}`);
        }).catch(error => {
          console.error(`❌ AssemblyAI connection failed:`, error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }


  // Handle AssemblyAI transcripts
  handleAssemblyAITranscript(clientWs, transcript) {
    if (transcript.message_type === 'PartialTranscript') {
      console.log(`📝 Partial transcript: "${transcript.text}"`);
      
      const message = {
        type: 'conversation.item.input_audio_transcription.delta',
        delta: transcript.text || ''
      };
      clientWs.send(JSON.stringify(message));
      
      const customMessage = {
        type: 'custom_transcription_partial',
        text: transcript.text || '',
        timestamp: new Date().toISOString()
      };
      clientWs.send(JSON.stringify(customMessage));
      
    } else if (transcript.message_type === 'FinalTranscript') {
      console.log(`✅ Final transcript: "${transcript.text}"`);
      
      const message = {
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: transcript.text || ''
      };
      clientWs.send(JSON.stringify(message));
      
      const customMessage = {
        type: 'custom_transcription_final',
        text: transcript.text || '',
        timestamp: new Date().toISOString()
      };
      clientWs.send(JSON.stringify(customMessage));
    }
  }

  // Set up message forwarding
  setupMessageForwarding(clientWs, connection, clientId) {
    const throttleLimit = parseInt(process.env.STT_AUDIO_THROTTLE_LIMIT) || 120;
    
    let audioCallCount = 0;
    let audioCallReset = Date.now();
    const THROTTLE_RESET_INTERVAL = 60 * 1000;
    
    clientWs.on('message', (data) => {
      this.updateClientActivity(clientId);
      
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'ping' && message.message === 'identify_client') {
          clientWs.send(JSON.stringify({
            type: 'client_identified',
            clientId: clientId,
            provider: 'assemblyai',
            timestamp: new Date().toISOString()
          }));
          return;
        }
        
      } catch (error) {
        // Handle binary audio data
        const currentTime = Date.now();
        
        if (currentTime - audioCallReset >= THROTTLE_RESET_INTERVAL) {
          audioCallCount = 0;
          audioCallReset = currentTime;
        }
        
        if (audioCallCount >= throttleLimit) {
          console.log(`⚠️ Audio throttle limit reached (${throttleLimit}/min), dropping audio chunk`);
          return;
        }
        
        if (data && data.length > 0) {
          connection.sendAudio(data);
          audioCallCount++;
        }
      }
    });

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
      for (const [clientId, connection] of this.connections) {
        if (connection.close) {
          connection.close();
        }
      }
      this.connections.clear();
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