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
    try {
      // Get user media
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
          
          // Perform Voice Activity Detection
          const shouldStream = this.performVAD(audioData);
          
          if (shouldStream && this.onAudioData) {
            // Convert to PCM16 format for AssemblyAI Realtime API
            const pcm16Data = this.convertToPCM16(audioData);
            
            // Add to buffer for optimized chunking
            this.addToChunkBuffer(pcm16Data);
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
    return hasAudioContext && hasGetUserMedia;
  }
}

export default AudioStreamProcessor;