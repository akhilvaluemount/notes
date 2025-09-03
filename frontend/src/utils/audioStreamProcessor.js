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
    
    // Enhanced Voice Activity Detection for continuous session
    this.vadEnabled = true; // Enable VAD for intelligent streaming
    this.silenceThreshold = 0.01; // Volume threshold for speech detection
    this.backgroundNoiseThreshold = 0.003; // Background noise level
    this.minSpeechDuration = 200; // Min ms of speech to start streaming
    this.keepAliveInterval = 500; // Send keep-alive chunks every 500ms to maintain session
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.lastKeepAlive = 0;
    this.isStreamingAudio = false;
    this.audioStreamingMode = 'idle'; // 'idle', 'speech', 'keep_alive'
    
    // Audio optimization settings for throttle management
    this.chunkBuffer = [];
    this.maxBufferDuration = 100; // ms - reduced to 100ms for ultra-low latency
    this.lastChunkSent = 0;
  }

  // Initialize audio processing
  async initialize(deviceId = null, constraints = { audio: true }) {
    try {
      // Enhanced audio constraints for clean transcription
      const audioConstraints = {
        sampleRate: this.sampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Advanced noise suppression for better quality
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true
      };

      // Add specific device ID if provided
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
        console.log('🎤 Using specific microphone:', deviceId);
      } else {
        console.log('🎤 Using default microphone');
      }

      // Merge with any additional constraints
      if (typeof constraints.audio === 'object') {
        Object.assign(audioConstraints, constraints.audio);
      }

      // Get user media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      return true;
    } catch (error) {
      console.error('❌ AudioStreamProcessor: Failed to initialize audio:', error.message);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Start continuous audio streaming
  async startStreaming() {
    if (!this.audioContext || !this.mediaStream) {
      const error = new Error('Audio not initialized. Call initialize() first.');
      throw error;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create script processor for audio data - optimized buffer size
      const bufferSize = 4096; // Balanced buffer size for better real-time performance
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording) {
          const inputBuffer = event.inputBuffer;
          const audioData = inputBuffer.getChannelData(0); // Get mono channel
          
          // Perform Enhanced Voice Activity Detection
          const shouldStream = this.performVAD(audioData);
          
          if (shouldStream && this.onAudioData) {
            if (shouldStream === 'keep_alive') {
              // Generate minimal keep-alive chunk instead of real audio
              const keepAliveData = this.generateKeepAliveChunk(audioData.length);
              this.addToChunkBuffer(keepAliveData);
            } else if (shouldStream === true) {
              // Normal speech - send real audio data
              const pcm16Data = this.convertToPCM16(audioData);
              this.addToChunkBuffer(pcm16Data);
            }
            // For 'filtered' background noise, we don't send anything
          }
        }
      };

      // Connect audio nodes
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('❌ AudioStreamProcessor: Failed to start streaming:', error.message);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Stop audio streaming
  stopStreaming() {
    // IMPORTANT: Flush any remaining buffered audio BEFORE setting isRecording to false
    // This ensures the last audio chunk with the final word(s) is sent to AssemblyAI
    if (this.chunkBuffer.length > 0) {
      console.log('📤 Flushing final audio buffer with', this.chunkBuffer.length, 'chunks');
      this.flushChunkBuffer();
    }
    
    // Now we can safely stop recording
    this.isRecording = false;
    this.isStreamingAudio = false;
    
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

  // Enhanced Voice Activity Detection for continuous session
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
    const isBackgroundNoise = rms > this.backgroundNoiseThreshold && rms <= this.silenceThreshold;
    
    if (isSpeech) {
      // Clear speech detected - stream normally
      if (!this.speechStartTime) {
        this.speechStartTime = currentTime;
        console.log('🎤 Speech detected, starting normal audio streaming');
      }
      this.lastSpeechTime = currentTime;
      this.audioStreamingMode = 'speech';
      
      // Stream immediately for speech
      if (currentTime - this.speechStartTime >= this.minSpeechDuration) {
        this.isStreamingAudio = true;
        return true;
      }
    } else if (isBackgroundNoise) {
      // Background noise - filter out to prevent random transcriptions
      this.audioStreamingMode = 'filtered';
      return this.shouldSendKeepAlive(currentTime);
    } else {
      // True silence - send periodic keep-alive chunks
      this.audioStreamingMode = 'keep_alive';
      if (this.lastSpeechTime && 
          currentTime - this.lastSpeechTime > this.minSpeechDuration) {
        // Reset speech detection after silence period
        this.speechStartTime = null;
      }
      
      return this.shouldSendKeepAlive(currentTime);
    }
    
    return this.isStreamingAudio;
  }
  
  // Determine if we should send keep-alive chunk during silence
  shouldSendKeepAlive(currentTime) {
    if (currentTime - this.lastKeepAlive >= this.keepAliveInterval) {
      this.lastKeepAlive = currentTime;
      console.log('📡 Sending keep-alive chunk to maintain session');
      return 'keep_alive'; // Special flag for keep-alive chunks
    }
    return false;
  }
  
  // Add audio to chunk buffer for optimized sending
  addToChunkBuffer(pcm16Data) {
    this.chunkBuffer.push(new Uint8Array(pcm16Data));
    
    const currentTime = Date.now();
    if (currentTime - this.lastChunkSent >= this.maxBufferDuration) {
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
  
  // Generate minimal keep-alive chunk to maintain AssemblyAI session
  generateKeepAliveChunk(length) {
    const int16Array = new Int16Array(length);
    
    // Generate very low-amplitude white noise to keep VAD active
    // without triggering transcription
    const amplitude = 50; // Very low amplitude (vs 32767 max)
    
    for (let i = 0; i < length; i++) {
      // Generate minimal random noise
      int16Array[i] = (Math.random() - 0.5) * amplitude;
    }
    
    return int16Array.buffer; // Return ArrayBuffer for WebSocket
  }

  // Set callback for audio data
  setAudioDataCallback(callback) {
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
      audioStreamingMode: this.audioStreamingMode,
      sampleRate: this.sampleRate,
      audioContextState: this.audioContext?.state,
      hasMediaStream: !!this.mediaStream,
      vadEnabled: this.vadEnabled,
      bufferedChunks: this.chunkBuffer.length,
      speechDetected: !!this.speechStartTime,
      silenceThreshold: this.silenceThreshold,
      backgroundNoiseThreshold: this.backgroundNoiseThreshold,
      keepAliveInterval: this.keepAliveInterval,
      lastKeepAlive: this.lastKeepAlive
    };
  }

  // Check if Web Audio API is supported
  static isSupported() {
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    return hasAudioContext && hasGetUserMedia;
  }
}

export default AudioStreamProcessor;