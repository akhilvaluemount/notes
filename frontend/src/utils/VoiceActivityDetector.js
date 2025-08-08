class VoiceActivityDetector {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
    
    // Configuration options
    this.options = {
      fftSize: options.fftSize || 2048,
      smoothingTimeConstant: options.smoothingTimeConstant || 0.3,
      minDecibels: options.minDecibels || -90,
      maxDecibels: options.maxDecibels || -10,
      
      // Voice activity thresholds
      voiceThreshold: options.voiceThreshold || 0.01, // Minimum energy level for voice
      noiseFloor: options.noiseFloor || 0.005, // Background noise level
      minSpeechDuration: options.minSpeechDuration || 1000, // Min speech duration in ms
      maxSilenceDuration: options.maxSilenceDuration || 3000, // Max silence before stopping in ms
      
      // Callback functions
      onVoiceStart: options.onVoiceStart || (() => {}),
      onVoiceEnd: options.onVoiceEnd || (() => {}),
      onAudioLevel: options.onAudioLevel || (() => {}),
    };
    
    // State tracking
    this.isVoiceActive = false;
    this.voiceStartTime = null;
    this.lastVoiceTime = null;
    this.noiseFloorSamples = [];
    this.maxNoiseFloorSamples = 100;
    
    // Audio level history for analysis
    this.audioLevels = [];
    this.maxAudioHistory = 50; // Keep last 50 samples for analysis
    
    this.isAnalyzing = false;
  }
  
  async initialize(mediaStream) {
    try {
      this.stream = mediaStream;
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
      this.analyser.minDecibels = this.options.minDecibels;
      this.analyser.maxDecibels = this.options.maxDecibels;
      
      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      source.connect(this.analyser);
      
      console.log('VoiceActivityDetector initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize VoiceActivityDetector:', error);
      return false;
    }
  }
  
  startAnalysis() {
    if (!this.audioContext || !this.analyser) {
      console.error('VoiceActivityDetector not initialized');
      return;
    }
    
    this.isAnalyzing = true;
    this.analyzeAudio();
  }
  
  stopAnalysis() {
    this.isAnalyzing = false;
  }
  
  analyzeAudio() {
    if (!this.isAnalyzing || !this.analyser) {
      return;
    }
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate RMS (Root Mean Square) energy level
    const rmsLevel = this.calculateRMS(this.dataArray);
    
    // Update audio level history
    this.audioLevels.push(rmsLevel);
    if (this.audioLevels.length > this.maxAudioHistory) {
      this.audioLevels.shift();
    }
    
    // Update noise floor estimation
    this.updateNoiseFloor(rmsLevel);
    
    // Determine if voice is active
    const currentTime = Date.now();
    const isVoice = this.isVoiceDetected(rmsLevel);
    
    // Call audio level callback
    this.options.onAudioLevel(rmsLevel, isVoice);
    
    // Handle voice activity state changes
    if (isVoice && !this.isVoiceActive) {
      // Voice started
      this.isVoiceActive = true;
      this.voiceStartTime = currentTime;
      this.lastVoiceTime = currentTime;
      this.options.onVoiceStart();
    } else if (isVoice && this.isVoiceActive) {
      // Voice continuing
      this.lastVoiceTime = currentTime;
    } else if (!isVoice && this.isVoiceActive) {
      // Check if silence has been too long
      const silenceDuration = currentTime - this.lastVoiceTime;
      if (silenceDuration > this.options.maxSilenceDuration) {
        // Voice ended
        this.isVoiceActive = false;
        this.voiceStartTime = null;
        this.options.onVoiceEnd();
      }
    }
    
    // Continue analyzing
    requestAnimationFrame(() => this.analyzeAudio());
  }
  
  calculateRMS(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255.0; // Normalize to 0-1
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }
  
  updateNoiseFloor(level) {
    // Add to noise floor samples if it's likely background noise
    if (!this.isVoiceActive && level > 0) {
      this.noiseFloorSamples.push(level);
      if (this.noiseFloorSamples.length > this.maxNoiseFloorSamples) {
        this.noiseFloorSamples.shift();
      }
      
      // Update noise floor as average of recent quiet samples
      if (this.noiseFloorSamples.length > 10) {
        const sortedSamples = [...this.noiseFloorSamples].sort((a, b) => a - b);
        // Use median of lower quartile as noise floor
        const quartileIndex = Math.floor(sortedSamples.length * 0.25);
        this.options.noiseFloor = sortedSamples[quartileIndex];
      }
    }
  }
  
  isVoiceDetected(level) {
    // Voice detected if level is above threshold and significantly above noise floor
    const noiseMargin = this.options.noiseFloor * 2; // Require 2x noise floor
    const threshold = Math.max(this.options.voiceThreshold, noiseMargin);
    return level > threshold;
  }
  
  hasValidSpeech() {
    if (!this.isVoiceActive || !this.voiceStartTime) {
      return false;
    }
    
    const speechDuration = Date.now() - this.voiceStartTime;
    return speechDuration >= this.options.minSpeechDuration;
  }
  
  getAudioLevel() {
    return this.audioLevels.length > 0 ? this.audioLevels[this.audioLevels.length - 1] : 0;
  }
  
  getAverageAudioLevel() {
    if (this.audioLevels.length === 0) return 0;
    const sum = this.audioLevels.reduce((a, b) => a + b, 0);
    return sum / this.audioLevels.length;
  }
  
  getSpeechPercentage() {
    if (this.audioLevels.length < 5) return 0; // Need some samples
    
    const voiceSamples = this.audioLevels.filter(level => 
      this.isVoiceDetected(level)
    ).length;
    
    return voiceSamples / this.audioLevels.length;
  }
  
  shouldProcessChunk() {
    // Decision logic for whether to send chunk to backend
    const speechPercentage = this.getSpeechPercentage();
    const averageLevel = this.getAverageAudioLevel();
    
    // Require at least 20% of chunk to contain speech
    // and average level above noise floor
    return speechPercentage > 0.2 && 
           averageLevel > this.options.noiseFloor * 1.5;
  }
  
  reset() {
    this.isVoiceActive = false;
    this.voiceStartTime = null;
    this.lastVoiceTime = null;
    this.audioLevels = [];
  }
  
  destroy() {
    this.stopAnalysis();
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
  }
}

export default VoiceActivityDetector;