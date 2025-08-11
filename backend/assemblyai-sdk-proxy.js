// AssemblyAI SDK-based WebSocket Proxy
// Uses the official AssemblyAI Node.js SDK for streaming transcription

const WebSocket = require('ws');
const { AssemblyAI } = require('assemblyai');
const { PassThrough } = require('stream');
require('dotenv').config();

class AssemblyAISDKProxy {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.assemblyClient = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });
  }

  startServer(port = 5002) {
    this.wss = new WebSocket.Server({ port });
    console.log(`🎤 AssemblyAI SDK Proxy started on ws://localhost:${port}`);
    console.log(`📡 Using official AssemblyAI SDK`);

    this.wss.on('connection', (clientWs) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`📱 Client ${clientId} connected`);
      
      this.handleClient(clientWs, clientId);
    });
  }

  async handleClient(clientWs, clientId) {
    try {
      // Create a streaming transcriber using the SDK
      const transcriber = this.assemblyClient.streaming.transcriber({
        sampleRate: 16000,
        formatTurns: true
      });

      // Create a PassThrough stream for audio data
      const audioStream = new PassThrough();
      
      // Store client info
      this.clients.set(clientId, { 
        clientWs, 
        transcriber, 
        audioStream,
        isConnected: false 
      });

      // Set up transcriber event handlers
      transcriber.on('open', ({ id }) => {
        console.log(`✅ AssemblyAI session opened: ${id}`);
        const client = this.clients.get(clientId);
        if (client) {
          client.isConnected = true;
          client.sessionId = id;
        }
        
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'connection_established',
            session_id: id,
            message: 'Connected to AssemblyAI streaming service'
          }));
        }
      });

      transcriber.on('transcript', (transcript) => {
        console.log(`📝 Transcript event received:`, JSON.stringify(transcript, null, 2));
        
        if (clientWs.readyState === WebSocket.OPEN) {
          // Handle different transcript types
          if (transcript.message_type === 'PartialTranscript' && transcript.text) {
            console.log(`📝 Sending partial: "${transcript.text}"`);
            clientWs.send(JSON.stringify({
              type: 'custom_transcription_partial',
              text: transcript.text,
              timestamp: new Date().toISOString()
            }));
          }
          else if (transcript.message_type === 'FinalTranscript' && transcript.text) {
            console.log(`✅ Sending final: "${transcript.text}"`);
            clientWs.send(JSON.stringify({
              type: 'custom_transcription_final',
              text: transcript.text,
              timestamp: new Date().toISOString()
            }));
          }
          else {
            console.log(`🔍 Unknown transcript type or empty text:`, transcript.message_type, transcript.text);
          }
        }
      });

      transcriber.on('turn', (turn) => {
        console.log(`🔄 Turn event:`, JSON.stringify(turn, null, 2));
        
        // Only send final formatted turns to avoid repetitive partial results
        if (turn.transcript && turn.turn_is_formatted && clientWs.readyState === WebSocket.OPEN) {
          console.log(`✅ Sending formatted final turn: "${turn.transcript}"`);
          clientWs.send(JSON.stringify({
            type: 'custom_transcription_final',
            text: turn.transcript,
            timestamp: new Date().toISOString(),
            end_of_turn: true
          }));
        } else if (turn.transcript && !turn.turn_is_formatted) {
          console.log(`📝 Partial turn (not formatted): "${turn.transcript}"`);
          // Send as partial to show live updates
          clientWs.send(JSON.stringify({
            type: 'custom_transcription_partial',
            text: turn.transcript,
            timestamp: new Date().toISOString()
          }));
        }
      });

      transcriber.on('error', (error) => {
        console.error(`❌ AssemblyAI error:`, error);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: error.message || 'Transcription error'
          }));
        }
      });

      transcriber.on('close', (code, reason) => {
        console.log(`🔌 AssemblyAI session closed: ${code} ${reason}`);
        this.clients.delete(clientId);
      });

      // Connect to AssemblyAI
      console.log(`🌐 Connecting to AssemblyAI for client ${clientId}...`);
      await transcriber.connect();
      console.log(`✅ Connected to AssemblyAI for client ${clientId}`);

      // Handle messages from client
      clientWs.on('message', async (data) => {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (Buffer.isBuffer(data)) {
          // Audio data - send directly to transcriber
          if (client.isConnected && client.transcriber) {
            console.log(`📤 Received ${data.length} bytes of audio from client ${clientId}`);
            try {
              client.transcriber.sendAudio(data);
              console.log(`🎵 Audio sent to AssemblyAI for client ${clientId}`);
            } catch (e) {
              console.error(`❌ Error sending audio for client ${clientId}:`, e.message);
            }
          } else {
            console.log(`⚠️ Client ${clientId} not ready for audio yet`);
          }
        } else {
          // Control messages
          try {
            const message = JSON.parse(data);
            console.log(`📨 Client message:`, message.type);
            
            if (message.type === 'ping') {
              clientWs.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {
            console.log(`📝 Non-JSON message from client`);
          }
        }
      });

      clientWs.on('close', async () => {
        console.log(`🔌 Client ${clientId} disconnected`);
        const client = this.clients.get(clientId);
        
        if (client) {
          // Close the audio stream
          if (client.audioStream) {
            client.audioStream.end();
          }
          
          // Close the transcriber
          if (client.transcriber) {
            try {
              await client.transcriber.close();
            } catch (e) {
              console.error('Error closing transcriber:', e);
            }
          }
          
          this.clients.delete(clientId);
        }
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
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        if (client.audioStream) {
          client.audioStream.end();
        }
        if (client.transcriber) {
          client.transcriber.close().catch(e => console.error(e));
        }
      }
      this.clients.clear();
      
      this.wss.close();
      console.log('🛑 AssemblyAI SDK proxy stopped');
    }
  }
}

// Start the server
if (require.main === module) {
  const proxy = new AssemblyAISDKProxy();
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

module.exports = AssemblyAISDKProxy;