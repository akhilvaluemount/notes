/**
 * Audio stream processor for AssemblyAI Realtime API
 * Handles continuous audio streaming and PCM16 format conversion
 */

class AudioStreamProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isRecording = false;
    this.sampleRate = 16000; // AssemblyAI Realtime API expects 16kHz
    this.onAudioData = null; // Callback for processed audio data
    this.onError = null; // Error callback
    
    // Voice Activity Detection settings - optimized for 2-second chunks
    this.vadEnabled = false; // Temporarily disable VAD for testing
    this.silenceThreshold = 0.005; // Lower threshold for better speech detection
    this.minSpeechDuration = 300; // Min ms of speech to start streaming (reduced for faster response)
    this.maxSilenceDuration = 2000; // Max ms of silence before stopping (aligned with chunk duration)
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.isStreamingAudio = false;
    
    // Audio optimization settings
    this.chunkBuffer = [];
    this.maxBufferDuration = 250; // ms - send chunks every 250ms to stay under 1000ms limit
    this.lastChunkSent = 0;
  }

  // Initialize audio processing
  async initialize(constraints = { audio: true }) {
    console.log('🎤 AudioStreamProcessor: Starting initialization...');
    try {
      // Get user media
      console.log('🎤 AudioStreamProcessor: Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...constraints.audio
        }
      });
      console.log('✅ AudioStreamProcessor: Microphone access granted');
      console.log('🎤 AudioStreamProcessor: Audio tracks:', this.mediaStream.getAudioTracks().length);

      // Create audio context
      console.log('🎤 AudioStreamProcessor: Creating audio context...');
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      });
      console.log('✅ AudioStreamProcessor: Audio context created, state:', this.audioContext.state);
      console.log('🎤 AudioStreamProcessor: Sample rate:', this.audioContext.sampleRate);

      console.log('✅ AudioStreamProcessor: Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('❌ AudioStreamProcessor: Failed to initialize audio:', error);
      console.error('❌ AudioStreamProcessor: Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Start continuous audio streaming
  async startStreaming() {
    console.log('🎤 AudioStreamProcessor: Starting audio streaming...');
    if (!this.audioContext || !this.mediaStream) {
      const error = new Error('Audio not initialized. Call initialize() first.');
      console.error('❌ AudioStreamProcessor:', error.message);
      throw error;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        console.log('🎤 AudioStreamProcessor: Resuming suspended audio context...');
        await this.audioContext.resume();
        console.log('✅ AudioStreamProcessor: Audio context resumed, state:', this.audioContext.state);
      }

      // Create media stream source
      console.log('🎤 AudioStreamProcessor: Creating media stream source...');
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      console.log('✅ AudioStreamProcessor: Media stream source created');
      
      // Create script processor for audio data - optimized buffer size
      const bufferSize = 4096; // Balanced buffer size for better real-time performance
      console.log('🎤 AudioStreamProcessor: Creating script processor with buffer size:', bufferSize);
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      let audioProcessCount = 0;
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          audioProcessCount++;
          if (audioProcessCount % 100 === 1) { // Log every 100th process call to avoid spam
            console.log('🎤 AudioStreamProcessor: Processing audio chunk', audioProcessCount);
          }
          
          const inputBuffer = event.inputBuffer;
          const audioData = inputBuffer.getChannelData(0); // Get mono channel
          
          // Perform Voice Activity Detection
          const shouldStream = this.performVAD(audioData);
          
          if (shouldStream && this.onAudioData) {
            // Convert to PCM16 format for AssemblyAI Realtime API
            const pcm16Data = this.convertToPCM16(audioData);
            
            // Add to buffer for optimized chunking
            this.addToChunkBuffer(pcm16Data);
          } else if (audioProcessCount % 100 === 1) {
            console.log('🎤 AudioStreamProcessor: Audio chunk skipped (VAD:', shouldStream, ', hasCallback:', !!this.onAudioData, ')');
          }
        }
      };

      // Connect audio nodes
      console.log('🎤 AudioStreamProcessor: Connecting audio nodes...');
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      console.log('✅ AudioStreamProcessor: Audio nodes connected successfully');

      this.isRecording = true;
      console.log('✅ AudioStreamProcessor: Started streaming successfully');
      console.log('🎤 AudioStreamProcessor: VAD enabled:', this.vadEnabled);
      console.log('🎤 AudioStreamProcessor: Audio callback set:', !!this.onAudioData);
      
      return true;
    } catch (error) {
      console.error('❌ AudioStreamProcessor: Failed to start streaming:', error);
      console.error('❌ AudioStreamProcessor: Error details:', {
        name: error.name,
        message: error.message,
        audioContextState: this.audioContext?.state,
        hasMediaStream: !!this.mediaStream
      });
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Stop audio streaming
  stopStreaming() {
    this.isRecording = false;
    this.isStreamingAudio = false;
    
    // Flush any remaining buffered audio
    this.flushChunkBuffer();
    
    // Reset VAD state
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.chunkBuffer = [];

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

  }

  // Voice Activity Detection - determines if audio contains speech
  performVAD(audioData) {
    if (!this.vadEnabled) return true; // Always stream if VAD disabled
    
    // Calculate RMS (Root Mean Square) for volume detection
    let rms = 0;
    for (let i = 0; i < audioData.length; i++) {
      rms += audioData[i] * audioData[i];
    }
    rms = Math.sqrt(rms / audioData.length);
    
    const currentTime = Date.now();
    const isSpeech = rms > this.silenceThreshold;
    
    if (isSpeech) {
      // Speech detected
      if (!this.speechStartTime) {
        this.speechStartTime = currentTime;
      }
      this.lastSpeechTime = currentTime;
      
      // Only start streaming after minimum speech duration
      if (currentTime - this.speechStartTime >= this.minSpeechDuration) {
        if (!this.isStreamingAudio) {
          this.isStreamingAudio = true;
        }
        return true;
      }
    } else {
      // Silence detected
      if (this.lastSpeechTime && 
          currentTime - this.lastSpeechTime >= this.maxSilenceDuration) {
        // Stop streaming after prolonged silence
        if (this.isStreamingAudio) {
          this.isStreamingAudio = false;
          this.speechStartTime = null;
          this.flushChunkBuffer(); // Send any remaining buffered audio
        }
      }
    }
    
    return this.isStreamingAudio;
  }
  
  // Add audio to chunk buffer for optimized sending
  addToChunkBuffer(pcm16Data) {
    this.chunkBuffer.push(new Uint8Array(pcm16Data));
    
    const currentTime = Date.now();
    if (currentTime - this.lastChunkSent >= this.maxBufferDuration) {
      console.log('🎤 AudioStreamProcessor: Flushing buffer after', currentTime - this.lastChunkSent, 'ms');
      this.flushChunkBuffer();
    }
  }
  
  // Send buffered chunks to reduce API calls
  flushChunkBuffer() {
    if (this.chunkBuffer.length === 0) return;
    
    // Combine all buffered chunks into one larger chunk
    const totalLength = this.chunkBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of this.chunkBuffer) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Send the combined chunk
    if (this.onAudioData) {
      this.onAudioData(combinedBuffer.buffer);
      console.log(`📤 Backend API: Sent ${totalLength} bytes audio to AssemblyAI Realtime (${this.chunkBuffer.length} chunks)`);
    }
    
    // Clear buffer and update timing
    this.chunkBuffer = [];
    this.lastChunkSent = Date.now();
  }

  // Convert Float32Array to PCM16 format (required by AssemblyAI Realtime API)
  convertToPCM16(float32Array) {
    const length = float32Array.length;
    const int16Array = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
      // Clamp to [-1, 1] range and convert to 16-bit integer
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample * 0x7FFF;
    }
    
    return int16Array.buffer; // Return ArrayBuffer for WebSocket
  }

  // Set callback for audio data
  setAudioDataCallback(callback) {
    console.log('🎤 AudioStreamProcessor: Setting audio data callback:', !!callback);
    this.onAudioData = callback;
  }

  // Set error callback
  setErrorCallback(callback) {
    this.onError = callback;
  }

  // Configure Voice Activity Detection settings
  configureVAD(settings = {}) {
    this.vadEnabled = settings.enabled ?? this.vadEnabled;
    this.silenceThreshold = settings.silenceThreshold ?? this.silenceThreshold;
    this.minSpeechDuration = settings.minSpeechDuration ?? this.minSpeechDuration;
    this.maxSilenceDuration = settings.maxSilenceDuration ?? this.maxSilenceDuration;
    this.maxBufferDuration = settings.maxBufferDuration ?? this.maxBufferDuration;
    
  }

  // Get audio stream info
  getStreamInfo() {
    return {
      isRecording: this.isRecording,
      isStreamingAudio: this.isStreamingAudio,
      sampleRate: this.sampleRate,
      audioContextState: this.audioContext?.state,
      hasMediaStream: !!this.mediaStream,
      vadEnabled: this.vadEnabled,
      bufferedChunks: this.chunkBuffer.length,
      speechDetected: !!this.speechStartTime
    };
  }

  // Check if Web Audio API is supported
  static isSupported() {
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    const isSupported = hasAudioContext && hasGetUserMedia;
    
    console.log('🎤 AudioStreamProcessor: Browser support check:', {
      hasAudioContext,
      hasGetUserMedia,
      isSupported
    });
    
    return isSupported;
  }
}

export default AudioStreamProcessor;