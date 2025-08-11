/**
 * Audio stream processor for OpenAI Realtime API
 * Handles continuous audio streaming and PCM16 format conversion
 */

class AudioStreamProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isRecording = false;
    this.sampleRate = 16000; // OpenAI Realtime API expects 16kHz
    this.onAudioData = null; // Callback for processed audio data
    this.onError = null; // Error callback
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

      console.log('🎤 Audio context initialized:', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Start continuous audio streaming
  async startStreaming() {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('Audio not initialized. Call initialize() first.');
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create script processor for audio data
      const bufferSize = 4096; // Small buffer for low latency
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (this.isRecording && this.onAudioData) {
          const inputBuffer = event.inputBuffer;
          const audioData = inputBuffer.getChannelData(0); // Get mono channel
          
          // Convert to PCM16 format for OpenAI Realtime API
          const pcm16Data = this.convertToPCM16(audioData);
          
          // Send to callback
          this.onAudioData(pcm16Data);
        }
      };

      // Connect audio nodes
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('🔴 Started continuous audio streaming');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start streaming:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  // Stop audio streaming
  stopStreaming() {
    this.isRecording = false;

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

    console.log('⏹️ Stopped audio streaming');
  }

  // Convert Float32Array to PCM16 format (required by OpenAI Realtime API)
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

  // Get audio stream info
  getStreamInfo() {
    return {
      isRecording: this.isRecording,
      sampleRate: this.sampleRate,
      audioContextState: this.audioContext?.state,
      hasMediaStream: !!this.mediaStream
    };
  }

  // Check if Web Audio API is supported
  static isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext) && 
           !!navigator.mediaDevices?.getUserMedia;
  }
}

export default AudioStreamProcessor;